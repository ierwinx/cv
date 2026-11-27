---
titulo: "Búsqueda y filtros"
resumen: "El buscador que no encuentra a Óscar, el desplegable vacío que tira la página, y cómo se combinan filtros sin escribir un `if` por cada uno."
minutos: 16
orden: 37
---

Un buscador es de lo primero que se pide en cualquier listado y de lo que más fácil es hacer mal. La versión ingenua son tres líneas y funciona en las pruebas del desarrollo, porque quien prueba escribe `ana` y busca a Ana.

En español se rompe con el primer nombre con tilde, y eso es la mitad de los nombres. Esta lección lo mide, lo arregla, y después monta el formulario de filtros combinados, que es el otro problema del mismo listado.

> [!objetivo] Qué vas a aprender
>
> Ver por qué la búsqueda ingenua falla en español y arreglarla con un campo normalizado, buscar varias palabras y en varios campos, combinar filtros construyendo el `QuerySet` por partes, evitar los dos fallos de los formularios de filtro, y saber cuándo hace falta una búsqueda de verdad.

## La versión ingenua y su problema

```python
Contacto.objects.filter(nombre__icontains=peticion.GET.get('q', ''))
```

```salida
icontains('ana')    -> ['Ana Cambiada', 'ana lopez']
icontains('Ana')    -> ['Ana Cambiada', 'ana lopez']
icontains('ANA')    -> ['Ana Cambiada', 'ana lopez']
icontains('íñigo')  -> []
icontains('Íñigo')  -> ['Íñigo Ñuño']
icontains('inigo')  -> []
icontains('oscar')  -> []
icontains('Óscar')  -> ['Óscar Paz']
```

Las tres primeras líneas son la razón de que esto parezca funcionar. Las cinco siguientes son el problema.

**Buscar `oscar` no encuentra a Óscar.** Ni `inigo` a Íñigo, ni siquiera `íñigo` en minúsculas, que es lo que cualquiera escribiría.

El motivo se midió en la lección 12: en SQLite, `icontains` solo entiende de mayúsculas y minúsculas en el alfabeto inglés. Para la base de datos, `Ó` y `ó` son dos caracteres sin ninguna relación, y `o` es un tercero.

Y esto no es un problema exótico ni de un caso raro: **en un listado de nombres en español, la mayoría de las búsquedas fallan**.

## El campo normalizado

La solución es la misma que resolvió la ordenación en la lección 12, y la misma que el módulo 3 usó para ordenar nombres: guardar una copia comparable.

```python title="contactos/models.py"
import unicodedata


def normalizar(texto):
        """Minúsculas sin tildes, para poder comparar."""
    descompuesto = unicodedata.normalize('NFKD', texto.casefold())
    return ''.join(c for c in descompuesto if not unicodedata.combining(c))


class Contacto(models.Model):
    # ...
        busqueda = models.CharField(max_length=200, blank=True, editable=False, db_index=True)

    def save(self, *args, **kwargs):
                self.busqueda = normalizar(f'{self.nombre} {self.correo}')
        super().save(*args, **kwargs)
```

```salida
buscar('ana')    -> ['Ana Cambiada', 'ana lopez']
buscar('íñigo')  -> ['Íñigo Ñuño']
buscar('inigo')  -> ['Íñigo Ñuño']
buscar('oscar')  -> ['Óscar Paz']
buscar('Óscar')  -> ['Óscar Paz']
buscar('NUNO')   -> ['Íñigo Ñuño']
buscar('ñuño')   -> ['Íñigo Ñuño']
```

Los siete casos. Y la consulta es esta, con `contains` y no con `icontains`, porque ya está todo en minúsculas:

```python
Contacto.objects.filter(busqueda__contains=normalizar(termino))
```

Tres decisiones del modelo que merecen explicación. `editable=False` lo saca de los formularios y del panel, porque nadie debe escribirlo. `db_index=True` porque es el campo por el que se busca. Y el `save()` lo rellena, que es la manera de que no se pueda olvidar.

> [!aviso] Un campo derivado hay que rellenar el que ya existe
>
> Al añadir ese campo con una migración, **las filas que ya estaban lo tienen vacío** y dejan de encontrarse. El campo se rellena en `save()`, y a esas filas nadie las ha vuelto a guardar.
>
> La forma correcta es una migración de datos con `RunPython`, como la de la lección 10:
>
> ```python
> def rellenar(apps, schema_editor):
>         Contacto = apps.get_model('contactos', 'Contacto')
>     for c in Contacto.objects.all():
>                 c.busqueda = normalizar(f'{c.nombre} {c.correo}')
>         c.save(update_fields=['busqueda'])
> ```
>
> Y ojo con el otro camino por el que se cuela una fila sin normalizar: **`update()` y `bulk_create` no llaman a `save()`**, como se midió en la lección 11. Una importación masiva deja todo el lote sin campo de búsqueda.
>
> La defensa buena contra eso es la de la lección 15: no depender de que alguien se acuerde. Si el proyecto va a usar PostgreSQL, un campo generado por la base de datos (`GeneratedField`) lo resuelve de raíz. Con SQLite, lo que queda es ser disciplinado y probarlo.

## Varias palabras

Buscar `ana lopez` con un solo `contains` no encuentra nada, porque no hay ninguna cadena que sea exactamente eso en ese orden. Lo que se espera es que todas las palabras aparezcan, en cualquier orden:

```python
def buscar(consulta, texto):
        for palabra in normalizar(texto).split():
                consulta = consulta.filter(busqueda__contains=palabra)
    return consulta
```

```salida
'ana'          -> ['Ana Cambiada', 'ana lopez']
'ana lopez'    -> ['ana lopez']
'lopez ana'    -> ['ana lopez']
'ana ruiz'     -> []
'nuno inigo'   -> ['Íñigo Ñuño']
```

Los dos órdenes dan lo mismo, y una palabra que no está descarta el resultado. Eso funciona porque **encadenar `filter` es un Y lógico**, que es lo que se vio en la lección 12.

Para buscar en campos que no están en el texto normalizado, `Q` con `|`:

```python
from django.db.models import Q

consulta.filter(Q(busqueda__contains=palabra) | Q(notas__icontains=palabra))
```

Y recuerda la regla de la lección 12: **los `Q` van antes que los argumentos con nombre**, o Python se queja.

## Filtros combinados

El error de partida es escribir un `if` por cada combinación. Lo que se hace es construir el `QuerySet` por partes, aprovechando que es perezoso:

```python title="contactos/views.py"
def lista(peticion):
        consulta = Contacto.objects.select_related('grupo')

    termino = peticion.GET.get('q', '').strip()
    if termino:
                for palabra in normalizar(termino).split():
                        consulta = consulta.filter(busqueda__contains=palabra)

    grupo = peticion.GET.get('grupo')
    if grupo:
                consulta = consulta.filter(grupo_id=grupo)

    if peticion.GET.get('con_telefono'):
                consulta = consulta.exclude(telefono='')

    orden = peticion.GET.get('orden', 'nombre')
    if orden in {'nombre', '-nombre', 'creado', '-creado'}:
                consulta = consulta.order_by(orden)

    paginador = Paginator(consulta, 20)
    return render(peticion, 'contactos/lista.html', {
        'pagina': paginador.get_page(peticion.GET.get('page')),
        'valores': peticion.GET,
    })
```

```salida
sin filtros:      16
+ grupo:           2
+ con teléfono:    0
```

Cada `if` estrecha lo anterior y **no se ejecuta ninguna consulta hasta el final**, por la pereza de la lección 11. Da igual que haya tres filtros o diez: siempre es una consulta.

Fíjate en ese `if orden in {...}`. Es una lista blanca, y no es una precaución exagerada: `order_by` con lo que llegue de la dirección permite ordenar por campos que no deberían verse y, con las relaciones, recorrer tablas ajenas. **Lo que llega de fuera nunca se pasa tal cual a `order_by`, a `values` ni a `only`.**

> [!aviso] Los dos fallos de un formulario de filtros
>
> Los dos salen del mismo sitio: los campos vacíos también se envían.
>
> ```salida
> GET: {'q': [''], 'grupo': [''], 'page': ['2']}
> ```
>
> **El primero es inocente.** Filtrar con la cadena vacía devuelve todo:
>
> ```salida
> filter(nombre__icontains='')  ->  16 de 16
> ```
>
> No rompe nada y hace una consulta inútil con un `LIKE '%%'` que no puede usar el índice. Por eso los `if` de arriba comprueban antes.
>
> **El segundo tira la página.** Un desplegable sin elegir manda la cadena vacía, y eso contra un campo numérico es:
>
> ```salida
> filter(grupo='')  ->  ValueError: Field 'id' expected a number but got ''.
> ```
>
> Una página de error quinientos **por haber pulsado "filtrar" sin elegir nada**, que es exactamente lo que hace todo el mundo la primera vez.
>
> La defensa es el `if` de antes de cada filtro, y la buena es no escribir esos `if` a mano, que es lo siguiente.

> [!consejo] Un formulario para los filtros
>
> Los `if` de la vista se multiplican y cada uno es una ocasión de olvidar una comprobación. La alternativa es un formulario de los del bloque D, que ya sabe distinguir vacío de inválido:
>
> ```python title="contactos/forms.py"
> class FiltroForm(forms.Form):
>         q = forms.CharField(required=False, label='Buscar')
>     grupo = forms.ModelChoiceField(queryset=Grupo.objects.all(), required=False,
>                                    empty_label='Todos los grupos')
>     con_telefono = forms.BooleanField(required=False, label='Solo con teléfono')
> ```
>
> ```python
> formulario = FiltroForm(peticion.GET)
> if formulario.is_valid():
>         datos = formulario.cleaned_data
>     if datos['grupo']:
>                 consulta = consulta.filter(grupo=datos['grupo'])
> ```
>
> Con eso se ganan cuatro cosas de golpe. El desplegable vacío llega como `None` y no como `''`, así que el `ValueError` desaparece. El grupo llega como **objeto**, ya comprobado que existe. Los campos se pintan solos y conservan lo elegido al cambiar de página. Y el `empty_label` arregla de paso el "- Select an option -" en inglés de la lección 28.
>
> Fíjate en `FiltroForm(peticion.GET)` en lugar de `peticion.POST`: **un formulario de filtros es un `GET`**, porque no cambia nada y porque así la dirección se puede compartir y guardar en favoritos. Es la lección 2 otra vez.
>
> Y con eso, la deuda de la lección 23 se cierra sola: los valores están en el formulario, así que la paginación puede arrastrarlos.

## Cuándo esto se queda corto

El campo normalizado con `contains` cubre bastante y tiene un techo claro:

**No tolera erratas.** Buscar `Alvares` no encuentra a Álvarez.

**No entiende variantes de la misma palabra.** `contactos` no encuentra `contacto`.

**No ordena por relevancia.** Todos los resultados valen igual, y en una lista larga eso importa más que encontrarlos.

**El `contains` no usa el índice por la izquierda.** Un `LIKE '%ana%'` recorre la tabla entera; el índice solo ayuda si la búsqueda empieza por el principio del campo.

Cuando eso pese, hay tres caminos:

| Opción | Cuándo |
| --- | --- |
| Búsqueda de texto completo de PostgreSQL | Ya usas PostgreSQL, que es la lección 41 |
| FTS5 de SQLite | Sigues en SQLite y quieres relevancia |
| Un motor aparte | Millones de documentos, sinónimos, facetas |

La de PostgreSQL es la que más se usa, y es una de las razones de peso para cambiar de base de datos:

```python
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
```

```salida
ModuleNotFoundError: No module named 'psycopg2'
```

Ese error es la prueba de que **ese módulo entero no funciona sin PostgreSQL**: da búsqueda con relevancia, raíces de palabras y tolerancia a erratas por similitud, todo dentro de la base de datos.

Y la advertencia para el español: su configuración por defecto es en inglés. Hay que indicar `config='spanish'` para que las raíces y las palabras vacías sean las correctas. Es el mismo descuido de siempre con otra cara.

> [!resumen] En resumen
>
> Un buscador escrito con `icontains` parece funcionar y falla con el primer nombre con tilde: buscar `oscar` no encuentra a Óscar, porque en SQLite solo se entienden las mayúsculas del alfabeto inglés. La solución es guardar un campo con el texto normalizado a minúsculas y sin tildes, no editable e indexado, rellenado en el `save()`, y buscar contra él con `contains`; al añadirlo hay que rellenar las filas existentes con una migración de datos y tener presente que `update()` y `bulk_create` se saltan el `save()`. Para varias palabras se encadena un `filter` por palabra, lo que da un Y lógico independiente del orden, y para varios campos se usan objetos `Q` con la barra vertical. Los filtros combinados se montan estrechando el `QuerySet` paso a paso, aprovechando su pereza para que sigan siendo una sola consulta, y lo que llegue de la dirección nunca se pasa tal cual a `order_by`. Los dos fallos de un formulario de filtros vienen de los campos vacíos: filtrar con la cadena vacía devuelve todo y hace una consulta inútil, y un desplegable sin elegir contra un campo numérico lanza un `ValueError` que tira la página. Lo razonable es usar un formulario, que convierte lo vacío en `None`, devuelve objetos ya comprobados, se pinta solo conservando lo elegido y se envía por `GET` para que la dirección se pueda compartir. Y el techo de esta técnica es que no tolera erratas, no entiende variantes ni ordena por relevancia, para lo cual hace falta la búsqueda de texto completo de PostgreSQL, el FTS5 de SQLite o un motor aparte.

> [!ejercicio] Practica
>
> 1. Monta un buscador con `icontains` y pruébalo con cinco nombres, dos de ellos con tilde. Anota cuáles no encuentra.
> 2. Añade el campo normalizado, rellénalo en el `save()` y repite las cinco búsquedas.
> 3. Escribe la migración de datos que rellena las filas que ya estaban. Comprueba antes y después que una fila antigua no se encontraba.
> 4. Crea una fila con `bulk_create` y comprueba que no tiene campo de búsqueda.
> 5. Haz que la búsqueda acepte varias palabras en cualquier orden.
> 6. Monta tres filtros combinados y comprueba con `connection.queries` que siguen siendo una sola consulta.
> 7. Envía el formulario de filtros con todos los campos vacíos y provoca el `ValueError` del desplegable. Arréglalo con un formulario.
> 8. Permite ordenar por un parámetro de la dirección y protégelo con una lista blanca. Prueba a pedir un campo que no esté.
> 9. Comprueba que los filtros y la página se conservan al navegar entre páginas.
