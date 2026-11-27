---
titulo: "ManyToMany y OneToOne"
resumen: "Una tabla que no has escrito, una relación que se maneja con métodos en vez de con asignaciones, y el caso en que partir un modelo en dos es lo correcto."
minutos: 16
orden: 14
---

`ForeignKey` cubre "muchos a uno": muchos contactos, un grupo. Quedan las otras dos formas de relacionar dos tablas, y cada una resuelve un problema que la clave ajena no puede.

**Muchos a muchos** es cuando la relación va en los dos sentidos a la vez. Un contacto puede tener varias etiquetas y una etiqueta puede estar en varios contactos. No hay forma de guardar eso en una columna de ninguna de las dos tablas, y por eso hace falta una tercera.

**Uno a uno** es una clave ajena con una restricción de unicidad encima, y sirve para partir un modelo que ha crecido demasiado o para añadirle datos a un modelo que no puedes tocar, como el de usuario de Django.

> [!objetivo] Qué vas a aprender
>
> Declarar una relación de muchos a muchos y entender la tabla intermedia que Django crea, manejarla con `add`, `remove`, `set` y `clear` sabiendo por qué no se asigna con un igual, conocer las dos limitaciones que tiene, saber cuándo hace falta un modelo intermedio propio con `through`, y declarar una relación uno a uno reconociendo cuándo merece la pena.

## Muchos a muchos

Las etiquetas de un contacto: `VIP`, `Cliente`, `Proveedor`, y cada contacto puede llevar las que sean.

```python title="contactos/models.py"
class Etiqueta(models.Model):
        nombre = models.CharField('nombre', max_length=30, unique=True)

    def __str__(self):
                return self.nombre


class Contacto(models.Model):
        ...
    etiquetas = models.ManyToManyField(Etiqueta, related_name='contactos', blank=True)
```

Tres diferencias con `ForeignKey` que se ven en esa línea:

- **No hay `on_delete`.** No hace falta preguntarse qué pasa al borrar: se borran las filas de la tabla intermedia y ya está. Ni el contacto ni la etiqueta dependen el uno del otro.
- **No hay `null=True`.** No tendría sentido: la ausencia de relación se representa con cero filas en la tabla intermedia, no con un `NULL`.
- **`blank=True` sí**, y significa lo de siempre: que el formulario no lo exija.

## La tabla que no has escrito

```salida
CREATE TABLE "contactos_contacto_etiquetas" (
    "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contacto_id" bigint NOT NULL REFERENCES "contactos_contacto" ("id"),
    "etiqueta_id" bigint NOT NULL REFERENCES "contactos_etiqueta" ("id")
);
CREATE UNIQUE INDEX "..._contacto_id_etiqueta_id_..._uniq"
    ON "contactos_contacto_etiquetas" ("contacto_id", "etiqueta_id");
```

Django ha creado una tercera tabla con dos claves ajenas. Cada fila es un emparejamiento. Un contacto con tres etiquetas son tres filas ahí.

El índice único sobre las dos columnas es lo que impide que el mismo par se guarde dos veces, y se nota al usarlo:

```consola
>>> c.etiquetas.add(vip, cliente)
>>> c.etiquetas.count()
2
>>> c.etiquetas.add(vip)
>>> c.etiquetas.count()
2
```

Añadir algo que ya está no falla y no duplica. Es una diferencia importante con una lista de Python, y hace que el código no tenga que comprobar antes.

## Manejarla

Un campo de muchos a muchos **no se asigna**. No hay `contacto.etiquetas = [...]`; hay métodos:

```consola
>>> c.etiquetas.add(vip, cliente)
['VIP', 'Cliente']
>>> c.etiquetas.remove(cliente)
['VIP']
>>> c.etiquetas.set([cliente])
['Cliente']
>>> c.etiquetas.clear()
[]
```

| Método | Qué hace |
| --- | --- |
| `add(*objetos)` | Añade, sin duplicar |
| `remove(*objetos)` | Quita los que se digan |
| `set(lista)` | Deja exactamente esa lista |
| `clear()` | Los quita todos |

El motivo de que sean métodos y no una asignación es que **cada operación es un `INSERT` o un `DELETE` en la tabla intermedia**, y hay que saber cuál. Un igual daría a entender que se está reemplazando un valor, y lo que ocurre es que se están creando y borrando filas.

Y funciona igual desde el otro lado, que es lo que da `related_name`:

```consola
>>> vip.contactos.all()
<QuerySet [<Contacto: Ana Ruiz>]>
>>> vip.contactos.add(otro_contacto)
```

Filtrar cruza la tabla intermedia sin que se note:

```consola
>>> Contacto.objects.filter(etiquetas__nombre='Cliente')
<QuerySet [<Contacto: Ana Ruiz>]>
```

> [!aviso] El objeto tiene que estar guardado antes
>
> Aquí está el error propio de esta relación:
>
> ```consola
> >>> nuevo = Contacto(nombre='Sin guardar', correo='sg@e.es')
> >>> nuevo.etiquetas.add(vip)
> ValueError: "<Contacto: Sin guardar>" needs to have a value for field "id" before
> this many-to-many relationship can be used.
> ```
>
> La tabla intermedia guarda **dos claves**, y el contacto todavía no tiene la suya. Con `ForeignKey` se podía asignar el objeto antes de guardar porque la columna vive en la propia fila; aquí no, porque la fila donde iría no existe.
>
> La consecuencia práctica aparece en los formularios: guardar un objeto con sus relaciones de muchos a muchos son siempre **dos pasos**, primero el `save()` y después el `add`. Un `ModelForm` lo hace por ti y por eso tiene un método `save_m2m()`, que se explica en la lección 26.

## El N+1, otra vez, y con otra solución

Recorrer las etiquetas de cada contacto tiene el mismo problema de la lección anterior:

```salida
sin prefetch: 6 consultas
con prefetch: 2 consultas
```

Pero la solución de la lección anterior no sirve:

```consola
>>> Contacto.objects.select_related('etiquetas')
FieldError: Invalid field name(s) given in select_related: 'etiquetas'.
Choices are: grupo, ficha
```

Y el mensaje es más útil de lo que parece: `select_related` solo ofrece `grupo` y `ficha`, que son las dos relaciones que terminan en **un** objeto. Con etiquetas hay que usar la otra:

```python
Contacto.objects.prefetch_related('etiquetas')
```

El motivo de que sean dos herramientas distintas está en lo que hace cada una. `select_related` mete un `JOIN` en la misma consulta, y eso con muchos a muchos **multiplicaría las filas**: un contacto con tres etiquetas saldría tres veces y habría que deshacer el estropicio en Python. `prefetch_related` hace dos consultas —una para los contactos y otra para todas sus etiquetas de golpe— y las empareja en memoria. De ahí el `2` de la medida: siempre dos, haya cuatro contactos o cuatrocientos.

La regla corta: **`select_related` para ir hacia "uno", `prefetch_related` para ir hacia "muchos"**. Y se pueden combinar en la misma consulta:

```python
Contacto.objects.select_related('grupo').prefetch_related('etiquetas')
```

## Cuando la relación tiene datos propios

`ManyToManyField` sirve mientras lo único que importe sea que dos cosas están relacionadas. En cuanto la relación misma tenga información, hace falta un modelo intermedio.

El caso típico: además de saber que un contacto tiene una etiqueta, quieres saber **cuándo** se la pusieron y **quién**. Eso no cabe en la tabla que genera Django, porque solo tiene las dos claves.

```python
class Contacto(models.Model):
        ...
    etiquetas = models.ManyToManyField(
        Etiqueta,
        through='Etiquetado',
        related_name='contactos',
        blank=True,
    )


class Etiquetado(models.Model):
        contacto = models.ForeignKey(Contacto, on_delete=models.CASCADE)
    etiqueta = models.ForeignKey(Etiqueta, on_delete=models.CASCADE)
    puesta = models.DateTimeField(auto_now_add=True)
    puesta_por = models.CharField(max_length=100, blank=True)

    class Meta:
                unique_together = [('contacto', 'etiqueta')]
```

La tabla intermedia pasa a ser tuya, con sus campos y su `unique_together` para que el par siga sin poder repetirse, que es lo que Django hacía solo.

El precio de `through` es que **`add` y `remove` dejan de funcionar** en las versiones más antiguas, y en las actuales solo funcionan si todos los campos extra tienen valor por defecto. Lo normal es crear las filas intermedias a mano:

```python
Etiquetado.objects.create(contacto=c, etiqueta=vip, puesta_por='ana')
```

> [!consejo] No empieces con `through` por si acaso
>
> Es tentador poner un modelo intermedio desde el principio "por si luego hace falta". No lo hagas: complica todas las operaciones a cambio de nada mientras la relación no tenga datos.
>
> Pasar de un `ManyToManyField` normal a uno con `through` más adelante es perfectamente posible; se hace con una migración que cree la tabla nueva, copie los pares y borre la vieja. Es trabajo de una tarde, y solo cuando de verdad sabes qué campos necesitaba la relación.

## Uno a uno

Es una `ForeignKey` con `unique=True`, y Django le da un campo propio porque el acceso cambia:

```python title="contactos/models.py"
class Ficha(models.Model):
        contacto = models.OneToOneField(Contacto, on_delete=models.CASCADE, related_name='ficha')
    cumpleanos = models.DateField(null=True, blank=True)
    direccion = models.CharField(max_length=200, blank=True)

    def __str__(self):
                return f'Ficha de {self.contacto}'
```

En la base de datos, exactamente lo que se ha dicho:

```salida
"contacto_id" bigint NOT NULL UNIQUE REFERENCES "contactos_contacto" ("id")
```

La diferencia con `ForeignKey` está en la vuelta. Con una clave ajena, `grupo.contactos` es un gestor con muchos. Aquí, `contacto.ficha` **es el objeto directamente**:

```consola
>>> c.ficha
<Ficha: Ficha de Ana Ruiz>
>>> f.contacto
<Contacto: Ana Ruiz>
```

Y las dos restricciones se hacen cumplir:

```consola
>>> Ficha.objects.create(contacto=c)
IntegrityError: UNIQUE constraint failed: contactos_ficha.contacto_id
```

> [!aviso] La vuelta lanza excepción cuando no hay nada
>
> El atributo de vuelta de un uno a uno no devuelve `None` si no existe el otro lado:
>
> ```consola
> >>> otro.ficha
> Contacto.ficha.RelatedObjectDoesNotExist: Contacto has no ficha.
> ```
>
> Esa excepción hereda a la vez de `Ficha.DoesNotExist` y de `AttributeError`, lo que tiene una consecuencia cómoda y una trampa. La cómoda es que `getattr(contacto, 'ficha', None)` devuelve `None`, y que en una plantilla `{{ contacto.ficha }}` no revienta, sale vacío.
>
> La trampa es que en el código sí revienta, y con un mensaje que parece un fallo de programación y no una fila que falta. Las dos formas limpias de preguntarlo:
>
> ```python
> if hasattr(contacto, 'ficha'):
>         ...
>
> ficha = Ficha.objects.filter(contacto=contacto).first()
> ```

### Cuándo usarlo

Tiene dos usos legítimos y uno que no lo es.

**Partir un modelo que ha crecido.** Si `Contacto` tuviera treinta campos y veinte se consultan una vez al año, sacarlos a una `Ficha` hace que la consulta habitual traiga filas más pequeñas. Es una optimización y no se hace por adelantado.

**Ampliar un modelo que no es tuyo.** Este es el bueno, y lo vas a usar: añadirle datos al modelo `User` de Django sin sustituirlo. Un `Perfil` con un uno a uno al usuario, con el avatar, el teléfono y las preferencias. Tiene su lección en el bloque E, junto a la alternativa de escribir un modelo de usuario propio.

**Y el que no:** partir un modelo porque "queda más ordenado". Si los datos se consultan siempre juntos, tenerlos en dos tablas obliga a un `JOIN` en cada consulta a cambio de nada.

> [!nota] Las tres relaciones, resumidas
>
> | Relación | Dónde vive el dato | Acceso de ida | Acceso de vuelta |
> | --- | --- | --- | --- |
> | `ForeignKey` | Columna `_id` en la propia tabla | El objeto | Un gestor con muchos |
> | `ManyToManyField` | Una tabla intermedia | Un gestor con muchos | Un gestor con muchos |
> | `OneToOneField` | Columna `_id` con `UNIQUE` | El objeto | El objeto, o excepción |
>
> Y la optimización que le toca a cada una: `select_related` cuando el acceso devuelve un objeto, `prefetch_related` cuando devuelve un gestor.

> [!resumen] En resumen
>
> `ManyToManyField` declara una relación que va en los dos sentidos a la vez, y Django crea para ella una tercera tabla con las dos claves y un índice único que impide repetir el par. No lleva `on_delete` ni `null`, y no se asigna con un igual: se maneja con `add`, `remove`, `set` y `clear`, porque cada operación es un alta o una baja en esa tabla intermedia. El objeto tiene que estar guardado antes de tocar la relación, porque la tabla intermedia necesita su clave, y de ahí que guardar un formulario con relaciones de muchos a muchos sean siempre dos pasos. El problema N+1 reaparece aquí, y `select_related` no sirve porque un `JOIN` multiplicaría las filas; la herramienta es `prefetch_related`, que hace dos consultas y las empareja en memoria. Cuando la relación misma tiene datos, como la fecha en que se puso una etiqueta, hace falta un modelo intermedio declarado con `through`, que conviene no adelantar porque complica todas las operaciones. `OneToOneField` es una clave ajena con unicidad, y su particularidad es que la vuelta devuelve el objeto directamente y lanza una excepción cuando no existe, en vez de devolver `None`; sirve para partir un modelo grande y, sobre todo, para ampliar uno que no es tuyo, que es como se le añaden datos al usuario de Django.

> [!ejercicio] Practica
>
> 1. Añade el modelo `Etiqueta` y la relación de muchos a muchos. Mira el SQL de la migración y localiza la tabla intermedia y su índice único.
> 2. Pon tres etiquetas a un contacto, añade dos veces la misma y comprueba que no se duplica. Prueba `remove`, `set` y `clear`.
> 3. Intenta añadir una etiqueta a un contacto sin guardar y lee el `ValueError`. Después guárdalo y repite.
> 4. Mide el N+1 recorriendo las etiquetas de todos los contactos, primero sin nada y después con `prefetch_related`. Intenta usar `select_related` y lee el error, fijándote en qué relaciones te ofrece.
> 5. Crea el modelo `Ficha` con un uno a uno. Accede a `contacto.ficha` en un contacto que no la tenga y captura la excepción. Después hazlo con `hasattr` y con `getattr`.
> 6. Convierte la relación de etiquetas en una con `through` que guarde la fecha en que se puso. Comprueba qué deja de funcionar y cómo se crean ahora los emparejamientos.
