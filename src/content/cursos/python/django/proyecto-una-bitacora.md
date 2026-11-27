---
titulo: "Proyecto: una bitácora con comentarios"
resumen: "Un blog completo con borradores, etiquetas, búsqueda y comentarios. Con las tres decisiones que lo sostienen y las diecisiete pruebas que lo demuestran."
minutos: 22
orden: 44
---

Toca juntarlo todo. Una bitácora es el proyecto clásico para esto porque no necesita nada nuevo y a la vez obliga a resolver bien tres cosas que en los ejemplos sueltos se podían esquivar: **quién puede ver un borrador, dónde vive la lógica de las consultas, y cómo se mantiene constante el número de consultas cuando la página crece.**

No hay nada inventado aquí: todo lo que se usa está explicado antes en el módulo. Lo que hay es un programa que funciona, con las decisiones tomadas y explicadas, y con las trampas que solo aparecen cuando las piezas se juntan.

> [!objetivo] Qué vas a aprender
>
> Escribir una bitácora completa: entradas con borrador y publicación, etiquetas, búsqueda sin tildes, comentarios de usuarios identificados, permisos por autor, paginación que arrastra los filtros, panel de administración y una suite de pruebas. Y entender por qué la lógica de consultas va en un `QuerySet` propio.

## Lo que se usa, y de dónde sale

| Pieza | Lección |
| --- | --- |
| Modelos, `ForeignKey`, `ManyToMany` | 8, 13, 14 |
| `Meta`, `__str__`, `get_absolute_url`, restricciones | 15, 21 |
| `select_related` y `prefetch_related` | 13, 14 |
| Herencia de plantillas | 18 |
| `ListView`, `DetailView` y las de edición | 23, 24 |
| `ModelForm`, validación, widgets | 26, 27, 28 |
| Panel con anidados y acciones | 30, 31 |
| Autenticación, mixins, permisos por fila | 32, 33 |
| Mensajes | 35 |
| Paginación con filtros | 36 |
| Búsqueda normalizada | 37 |
| Pruebas | 39 |

## Los tres modelos

```python title="entradas/models.py"
class Entrada(models.Model):
        class Estado(models.TextChoices):
                BORRADOR = 'BO', 'Borrador'
        PUBLICADA = 'PU', 'Publicada'

    titulo = models.CharField('título', max_length=200)
    slug = models.SlugField('slug', max_length=220, unique=True, blank=True)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name='autor',
                              on_delete=models.PROTECT, related_name='entradas')
    entradilla = models.TextField('entradilla', max_length=300, blank=True)
    cuerpo = models.TextField('cuerpo')
    etiquetas = models.ManyToManyField(Etiqueta, related_name='entradas', blank=True)
    estado = models.CharField('estado', max_length=2, choices=Estado, default=Estado.BORRADOR)
    publicada_en = models.DateTimeField('publicada en', null=True, blank=True)
    busqueda = models.CharField(max_length=500, blank=True, editable=False, db_index=True)

    objetos = EntradaQuerySet.as_manager()
```

Cuatro decisiones que merecen explicación.

**`settings.AUTH_USER_MODEL` y no `User`.** Es lo de la lección 34: aunque este proyecto use el usuario de Django, apuntar al ajuste permite cambiarlo mañana.

**`on_delete=models.PROTECT` en el autor.** Borrar un usuario **no** debe borrar sus entradas en silencio. Con `PROTECT`, el borrado falla y hay que decidir qué hacer, que es lo correcto.

**El estado y la fecha, separados.** Un solo booleano `publicado` no permite programar una entrada para el futuro. Con dos campos sí, y la consulta lo aprovecha.

**El campo de búsqueda** de la lección 37, porque esto va sobre SQLite. Con PostgreSQL sobraría, que es la lección 41.

Y la restricción, que es la que impide un estado imposible:

```python
constraints = [
    models.CheckConstraint(
        condition=models.Q(estado='BO') | models.Q(publicada_en__isnull=False),
        name='publicada_necesita_fecha',
    ),
]
```

```salida
update que deja PU sin fecha -> IntegrityError: CHECK constraint failed: publicada_necesita_fecha
```

Eso es lo que hace que la restricción de la lección 15 valga la pena: **se ha saltado con un `update()`, que no pasa por `save()` ni por ninguna validación de Python**, y la base de datos lo ha parado igual.

## El `QuerySet` propio

Esta es la decisión que más se nota a medida que el proyecto crece:

```python
class EntradaQuerySet(models.QuerySet):
        def publicadas(self):
                return self.filter(estado=Entrada.Estado.PUBLICADA, publicada_en__lte=timezone.now())

    def con_todo(self):
                return self.select_related('autor').prefetch_related('etiquetas')

    def buscar(self, termino):
                consulta = self
        for palabra in normalizar(termino).split():
                        consulta = consulta.filter(busqueda__contains=palabra)
        return consulta
```

```python
Entrada.objetos.publicadas().con_todo().buscar('django')
```

Se encadenan porque cada uno devuelve un `QuerySet`, y la pereza de la lección 11 hace que las tres juntas sigan siendo una consulta.

Lo que se gana es que **la definición de "publicada" está en un sitio**. La lista, el detalle, el canal de noticias y el mapa del sitio la usan, y el día que se añada un tercer estado se cambia una línea.

Y es la respuesta a un error habitual: poner ese filtro en la vista y repetirlo en las seis vistas que lo necesitan, hasta que una se queda sin él y enseña los borradores de todo el mundo.

> [!aviso] Un gestor propio se lleva por delante `objects`
>
> ```salida
> Entrada.objects existe?   False
> Etiqueta.objects existe?  True
> ```
>
> Al declarar `objetos = EntradaQuerySet.as_manager()`, Django **deja de crear el `objects` por defecto**, porque solo lo añade a los modelos que no tienen ninguno declarado.
>
> Y el error que da no es sutil, pero aparece en sitios inesperados:
>
> ```salida
> AttributeError: type object 'Entrada' has no attribute 'objects'. Did you mean: 'objetos'?
> ```
>
> Salió escribiendo las pruebas de este proyecto, y también dentro del propio modelo, en el método que busca un slug libre. Hay dos posturas: llamar `objects` al gestor propio y no tener que pensarlo, o llamarlo de otra forma y aceptar el cambio. Aquí se ha elegido lo segundo por coherencia con el resto del curso, que nombra en español, y porque el error es inmediato y lo dice todo.
>
> Si quieres los dos, se declaran los dos, y entonces importa cuál va primero: **el primero declarado es el que usan las relaciones inversas y el panel.**

## Quién ve qué

Este es el punto donde un blog se equivoca. Hay tres visibilidades distintas y cada una es una consulta:

```python
class ListaEntradas(ListView):
        def get_queryset(self):
                consulta = Entrada.objetos.publicadas().con_todo()
        # ... filtros
```

La lista, solo publicadas y para todo el mundo.

```python
class DetalleEntrada(DetailView):
        def get_queryset(self):
                consulta = Entrada.objetos.con_todo().prefetch_related('comentarios__autor')
        if self.request.user.is_authenticated:
                        return consulta.filter(Q(estado=Entrada.Estado.PUBLICADA) | Q(autor=self.request.user))
        return consulta.publicadas()
```

El detalle, publicadas **o tuyas**, que es lo que permite ver un borrador antes de publicarlo. Y fíjate en la consecuencia, que es la de la lección 33:

```salida
borrador ajeno   -> 404
borrador propio  -> 200
```

**`404`, no `403`.** Filtrar el `queryset` hace que la entrada simplemente no exista para quien no debe verla, y eso no revela que existe.

Para editar y borrar, un mixin de tres líneas:

```python
class SoloAutorMixin(LoginRequiredMixin, UserPassesTestMixin):
        def test_func(self):
                return self.get_object().autor == self.request.user
```

```salida
editar lo ajeno -> 403
```

Aquí sí `403`, y es correcto: la entrada es pública, así que no hay nada que ocultar; lo que falta es el permiso.

Y el orden de los dos mixins importa, que es lo que avisaba la lección 33: `LoginRequiredMixin` primero, para que un anónimo vaya al inicio de sesión en lugar de a un `403`.

## El autor no está en el formulario

```python
class EntradaForm(forms.ModelForm):
        class Meta:
                model = Entrada
        fields = ['titulo', 'entradilla', 'cuerpo', 'etiquetas', 'estado']
```

```python
def form_valid(self, formulario):
        formulario.instance.autor = self.request.user
    return super().form_valid(formulario)
```

Las dos mitades del patrón de la lección 33, y **hacen falta las dos**. Si `autor` estuviera en `fields`, cualquiera podría mandar el identificador de otro usuario. Si no se rellena en `form_valid`, no se guarda.

```salida
test_crear_asigna_el_autor ... ok
```

Y la validación cruzada, de la lección 27:

```python
def clean(self):
        datos = super().clean()
    if datos.get('estado') == Entrada.Estado.PUBLICADA and len(datos.get('cuerpo', '')) < 100:
                self.add_error('cuerpo', 'Para publicar hacen falta al menos cien caracteres.')
    return datos
```

Un borrador puede estar a medias; una entrada publicada, no. Eso solo se puede comprobar mirando dos campos a la vez, que es para lo que existe `clean`.

## Las consultas no crecen

```salida
lista (5 entradas)   200   4 consultas
lista página 2       200   4 consultas
con búsqueda         200   4 consultas
por etiqueta         200   5 consultas
detalle              200   4 consultas
```

**Constante**, con veinte entradas en la base. Las cuatro son: el recuento de la paginación, las entradas, las etiquetas de todas ellas de una vez, y la sesión. La de etiqueta suma una porque busca la etiqueta primero.

Y esto es lo que hay debajo:

```salida
sin con_todo():  11 consultas
con con_todo():   2 consultas
```

Cinco entradas con autor y etiquetas. Once contra dos, y el once **crece con cada entrada que se añada**. Es el problema N+1 del bloque B en su forma más común: una lista con el nombre del autor debajo de cada título.

Por eso está la prueba:

```python
def test_la_lista_no_crece_con_las_filas(self):
        with self.assertNumQueries(4):
                self.client.get(reverse('entradas:lista'))
```

El día que alguien quite el `con_todo()`, la suite lo dice. Sin esa prueba, la página seguiría funcionando.

## Las diecisiete pruebas

```salida
Ran 17 tests in 0.756s
OK
```

No están puestas para tener pruebas: cada una sujeta una decisión de las de arriba.

**Del modelo**, cinco. El slug que sale del título con tildes (`Árboles y Ñandúes` → `arboles-y-nandues`), el slug repetido que se numera, la fecha que se rellena sola al publicar, la búsqueda que encuentra `Óscar` escribiendo `oscar`, y la entrada programada para mañana que no aparece.

**De las vistas**, once. Las de visibilidad, las de permisos, las de los formularios, y dos que son puro sentido común y se olvidan siempre: que buscar desde la web funciona igual que desde el intérprete, y que **mandar el formulario de filtros vacío no rompe nada**, que es el `ValueError` de la lección 37.

**De rendimiento**, una, la de arriba.

> [!consejo] Las cuatro cosas que faltan, y por dónde seguir
>
> Este proyecto está completo pero no acabado. Lo que le falta, por orden de utilidad:
>
> **Comentarios anidados**, con un `ForeignKey` a sí mismo (`padre`, con `null=True`). El modelo es fácil; pintar el árbol en la plantilla sin recursión es lo que cuesta, y ahí es donde se usa una etiqueta de inclusión de la lección 19.
>
> **Un canal de noticias** con el módulo de sindicación, que son quince líneas y reutiliza `publicadas()` tal cual. Y un mapa del sitio, igual.
>
> **Texto con formato** en el cuerpo. Es el momento de releer el aviso sobre `|safe` de la lección 42: hace falta sanear el HTML resultante con una lista blanca.
>
> **Correo al autor** cuando le comentan, que es la lección 38, y con la advertencia de no enviarlo dentro de la petición.
>
> Y un ejercicio que enseña mucho: **pasarlo a PostgreSQL** siguiendo la lección 41, borrar el campo de búsqueda y el `normalizar`, y cambiarlo por `unaccent` o por búsqueda de texto completo con relevancia. Se van treinta líneas y funciona mejor.

> [!nota] Lo que este proyecto enseña de estructura
>
> Tres ideas que valen más que el código concreto.
>
> **La lógica de consultas va en el `QuerySet`, no en las vistas.** Es el mismo principio que la lección 15 aplicó a los métodos del modelo y que el módulo 3 aplicó separando la lógica de la interfaz: la vista decide **qué** enseñar, no **cómo** se busca.
>
> **Las reglas importantes se escriben dos veces.** Que una entrada publicada tenga fecha está en el `save()`, en el formulario y en una restricción de la base de datos. No es redundancia inútil: cada capa protege de un camino distinto, y la de la base de datos es la única que aguanta un `update()`.
>
> **Las plantillas se parten por reutilización.** El trozo de paginación está en un fichero aparte porque lo usan dos listas, y así arreglar el arrastre de filtros se hace una vez.

> [!resumen] En resumen
>
> Una bitácora completa se monta con lo que ya trae el módulo y obliga a decidir bien tres cosas. La primera es dónde vive la lógica de consultas: en un `QuerySet` propio con métodos encadenables, para que la definición de qué está publicado esté en un solo sitio y no repartida por seis vistas; el precio es que declarar un gestor propio quita el que Django pone por defecto. La segunda es la visibilidad, que son tres consultas distintas: la lista solo enseña lo publicado, el detalle enseña lo publicado o lo tuyo, y editar exige ser el autor; filtrar el conjunto devuelve un `404` que no revela que la entrada existe, mientras que el mixin de permisos devuelve un `403`, y las dos respuestas son correctas en su sitio. La tercera es que el número de consultas no crezca con las filas, que se consigue con un método que añade las relaciones y se demuestra con una prueba que cuenta consultas, porque ese fallo no rompe nada. Encima, las reglas importantes se escriben en el modelo, en el formulario y en una restricción de la base de datos, que es la única capa que aguanta un `update()`. Las diecisiete pruebas no están para tener pruebas: cada una sujeta una de esas decisiones.

> [!ejercicio] Practica
>
> 1. Monta el proyecto entero y comprueba que las diecisiete pruebas pasan.
> 2. Quita el `con_todo()` de la lista y mira qué prueba falla y con qué número.
> 3. Intenta dejar una entrada publicada sin fecha con un `update()` y lee el error.
> 4. Añade `autor` a los campos del formulario y escribe la prueba que demuestra que eso es un agujero.
> 5. Cambia el orden de los dos mixins del autor y comprueba qué le pasa a un anónimo.
> 6. Programa una entrada para mañana y comprueba que no sale en la lista.
> 7. Añade un tercer estado, "retirada", y comprueba cuántos sitios hay que tocar.
> 8. Escribe el canal de noticias reutilizando `publicadas()`.
> 9. Añade comentarios anidados de un nivel y píntalos con una etiqueta de inclusión.
> 10. Pásalo a PostgreSQL y sustituye el campo de búsqueda por `unaccent`.
