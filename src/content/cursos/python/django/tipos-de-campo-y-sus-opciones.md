---
titulo: "Tipos de campo y sus opciones"
resumen: "Los quince campos que se usan de verdad, las ocho opciones que aceptan casi todos, y las tres decisiones que luego cuesta cambiar."
minutos: 18
orden: 9
---

Django trae treinta y nueve clases de campo. Se comprueba en dos líneas:

```consola
>>> from django.db import models
>>> [n for n in dir(models) if n.endswith('Field')]
```

De esas treinta y nueve, la mitad son variantes de tamaño de otras y tres son relaciones, que tienen sus propias lecciones. Las que vas a escribir de verdad son unas quince, y lo que de verdad hay que aprender no son los tipos, que se adivinan por el nombre, sino **las opciones**, que son casi las mismas para todos y son las que deciden cómo se comporta el campo en la base de datos, en los formularios y en el panel de administración.

Esta lección es de referencia, pero no es una lista: está montada alrededor de las tres decisiones que cuestan trabajo deshacer si se toman mal, que son `blank` frente a `null`, `Decimal` frente a `float`, y cómo se declaran las opciones cerradas.

> [!objetivo] Qué vas a aprender
>
> Conocer los campos que se usan a diario y en qué se convierte cada uno en la base de datos, manejar las ocho opciones comunes, tener una regla clara para `blank` y `null`, saber por qué el dinero no se guarda en un `FloatField`, declarar opciones cerradas con `TextChoices` y conocer su límite, y entender por qué un valor por defecto mutable es un error que Django detecta.

## Los campos y en qué se convierten

Esta tabla está sacada del SQL que genera `sqlmigrate` para un modelo con todos ellos, en SQLite. Otros gestores cambian el tipo concreto, no el sentido:

| Campo | Para qué | SQL que genera |
| --- | --- | --- |
| `CharField(max_length=n)` | Texto corto | `varchar(n)` |
| `TextField()` | Texto largo, sin límite | `text` |
| `EmailField()` | Un correo | `varchar(254)` |
| `URLField()` | Una dirección web | `varchar(200)` |
| `SlugField()` | Un identificador para las URL | `varchar(50)` **con índice** |
| `IntegerField()` | Un entero | `integer` |
| `PositiveIntegerField()` | Un entero que no baja de cero | `integer unsigned CHECK (>= 0)` |
| `BooleanField()` | Sí o no | `bool` |
| `DecimalField(max_digits, decimal_places)` | Números exactos: dinero | `decimal` |
| `FloatField()` | Números aproximados: medidas | `real` |
| `DateField()` | Una fecha | `date` |
| `DateTimeField()` | Fecha y hora | `datetime` |
| `DurationField()` | Un intervalo de tiempo | `bigint` |
| `UUIDField()` | Un identificador único | `char(32)` |
| `JSONField()` | Datos sin estructura fija | `text CHECK (JSON_VALID(...))` |
| `FileField()` / `ImageField()` | Un fichero subido | `varchar(100)` con la ruta |

Tres detalles que se ven mejor en esa columna de la derecha que en cualquier explicación:

- **Los campos especializados son un `CharField` con extras.** `EmailField` es un `varchar` con un validador y un formulario distinto; en la base de datos no hay ningún tipo "correo". Lo mismo `URLField` y `SlugField`.
- **`SlugField` crea un índice él solo.** Es el único de la lista que lo hace, porque su razón de ser es aparecer en las URL y por tanto buscarse constantemente.
- **`PositiveIntegerField` pone una restricción de verdad**, no solo un validador de formulario. Un negativo no entra ni forzándolo desde el código.

> [!nota] Los ficheros no se guardan en la base de datos
>
> `FileField` e `ImageField` generan un `varchar(100)`, no una columna binaria. **Lo que se guarda es la ruta**; el fichero vive en el disco. Es lo correcto: una base de datos con imágenes dentro se vuelve lenta y sus copias de seguridad, enormes.
>
> La consecuencia es que hay dos sitios que mantener sincronizados, y que borrar una fila no borra su fichero. Eso, y `ImageField` necesita Pillow, que ya usaste en la lección 44 del módulo 3. Tiene su lección entera, la 29.

## Las opciones comunes

Casi todos los campos aceptan estas ocho:

| Opción | Qué hace | Dónde se nota |
| --- | --- | --- |
| `null` | La columna admite `NULL` | Base de datos |
| `blank` | El campo se puede dejar vacío | Formularios |
| `default` | Valor si no se da ninguno | Al crear el objeto |
| `unique` | No puede repetirse | Base de datos |
| `choices` | Solo estos valores | Formularios y panel |
| `verbose_name` | El nombre legible | Formularios y panel |
| `help_text` | Una explicación debajo del campo | Formularios y panel |
| `db_index` | Crea un índice | Base de datos |

La columna de la derecha es la que ordena el asunto: **hay opciones que cambian la tabla y opciones que solo cambian lo que ve una persona**. Las primeras obligan a una migración; las segundas también generan migración, pero no tocan el SQL.

`verbose_name` es el primer argumento posicional, así que estas dos líneas son lo mismo:

```python
telefono = models.CharField('teléfono', max_length=20, blank=True)
telefono = models.CharField(max_length=20, blank=True, verbose_name='teléfono')
```

Si no lo pones, Django usa el nombre del atributo cambiando los guiones bajos por espacios. Con nombres en español sin tildes, como `telefono`, eso significa que el formulario dirá "telefono". Merece la pena ponerlo cuando la tilde importa.

## Decisión 1: `blank` o `null`

La lección anterior dejó la regla enunciada; aquí está completa, porque es la que más se equivoca.

**`null` es de la base de datos. `blank` es de los formularios.** Son independientes y se pueden combinar de las cuatro maneras:

| Combinación | Significa |
| --- | --- |
| Ninguna | Obligatorio en todas partes |
| `blank=True` | Opcional en el formulario; se guarda el valor vacío del tipo |
| `null=True` | La columna admite `NULL`, pero el formulario lo exige igual |
| Las dos | Opcional, y cuando no se da se guarda `NULL` |

La tercera fila casi nunca es lo que quieres, y es el resultado típico de poner `null=True` creyendo que era lo que hacía el campo opcional.

La regla práctica, según el tipo:

> **Texto** (`CharField`, `TextField`, `EmailField`...): `blank=True` sí, `null=True` no. **Todo lo demás** (números, fechas, booleanos, relaciones): las dos juntas.

El motivo es el de la lección anterior: en un campo de texto hay ya un valor que significa "vacío", que es la cadena vacía, y añadir `NULL` deja **dos formas distintas de decir lo mismo**. A partir de ahí, `filter(telefono='')` y `filter(telefono=None)` devuelven cosas distintas, cada consulta tiene que acordarse de las dos, y alguna se olvida. En un `DateField` no hay "fecha vacía", así que `NULL` es la única manera de decir que no la hay.

> [!aviso] Poner `null=True` en un texto que ya tiene datos
>
> El día que añadas `null=True` a un campo de texto con filas dentro, no pasa nada visible. Lo que pasa es que a partir de ese momento hay filas con `''` —las de antes— y filas con `NULL` —las nuevas—, y el código que las trata no distingue. Una plantilla enseñará `None` donde antes no enseñaba nada, y una consulta que buscaba los teléfonos vacíos dejará de encontrar la mitad.
>
> Arreglarlo después obliga a una migración de datos que normalice lo que hay, que es la parte más incómoda de la lección 10. Por eso conviene decidirlo bien de entrada.

## Decisión 2: `Decimal` o `float`

Para el dinero, `DecimalField`. Siempre. La razón la conoces de la lección 6 del módulo 1:

```consola
>>> 0.1 + 0.2
0.30000000000000004
>>> Decimal('0.1') + Decimal('0.2')
Decimal('0.3')
```

Un `float` es binario y no puede representar exactamente la mayoría de los decimales. En una medida da igual, porque el error es más pequeño que el instrumento. En una factura con diez mil líneas, esos errores se suman y el total no cuadra con la suma de sus partes, que es la clase de fallo que aparece en una auditoría y no en las pruebas.

```python
precio = models.DecimalField(max_digits=8, decimal_places=2)
```

Los dos argumentos son obligatorios. `max_digits` son las cifras **en total**, contando las decimales; `decimal_places`, cuántas van detrás de la coma. Con `8` y `2` caben hasta `999999.99`.

Y un detalle que sorprende al leer de la base de datos:

```consola
>>> Demo.objects.create(decimal=Decimal('0.1')).decimal
Decimal('0.1')
>>> Demo.objects.get(pk=1).decimal
Decimal('0.10')
```

Al volver de la base de datos tiene los dos decimales, porque la columna los tiene. Son el mismo número y `==` los considera iguales, pero si comparas cadenas o textos representados, no coinciden.

## Decisión 3: las opciones cerradas

El campo `grupo` de la agenda solo admite unos cuantos valores. En el módulo 3 eso era una tupla suelta:

```python
GRUPOS = ("Sin grupo", "Familia", "Amigos", "Trabajo", "Proveedores")
```

En Django se declara con `choices`, y la forma moderna es una clase:

```python title="contactos/models.py"
from django.db import models


class Grupo(models.TextChoices):
        SIN = 'sin', 'Sin grupo'
    FAMILIA = 'familia', 'Familia'
    AMIGOS = 'amigos', 'Amigos'
    TRABAJO = 'trabajo', 'Trabajo'
    PROVEEDORES = 'proveedores', 'Proveedores'


class Contacto(models.Model):
        nombre = models.CharField('nombre', max_length=100)
    correo = models.EmailField('correo', unique=True)
    telefono = models.CharField('teléfono', max_length=20, blank=True)
    grupo = models.CharField('grupo', max_length=15, choices=Grupo, default=Grupo.SIN)
    notas = models.TextField('notas', blank=True)
    creado = models.DateTimeField('creado', auto_now_add=True)

    def __str__(self):
                return self.nombre
```

Cada línea de `Grupo` tiene dos partes: **lo que se guarda** y **lo que se enseña**. Esa separación es lo importante. En la base de datos va `'trabajo'`, corto y estable; en pantalla sale `Trabajo`, que se puede traducir o cambiar sin migrar nada.

`TextChoices` hereda de `Enum`, así que en el código escribes `Grupo.TRABAJO` en vez de la cadena `'trabajo'`, y una errata deja de ser un dato mal guardado para ser un `AttributeError` inmediato.

Django añade además un método por cada campo con `choices`:

```consola
>>> c = Contacto.objects.create(nombre='Ana', correo='ana@ejemplo.es', grupo=Grupo.TRABAJO)
>>> c.grupo
'trabajo'
>>> c.get_grupo_display()
'Trabajo'
```

`get_grupo_display()` se construye solo, con el nombre del campo en medio. Es lo que se usa en las plantillas, porque el valor crudo no es para enseñarlo.

> [!aviso] `choices` tampoco se valida al guardar
>
> Es el mismo asunto de la lección anterior, y conviene verlo porque a `choices` se le supone más autoridad de la que tiene:
>
> ```consola
> >>> x = Contacto.objects.create(nombre='X', correo='x@ejemplo.es', grupo='marciano')
> >>> x.grupo
> 'marciano'
> >>> x.get_grupo_display()
> 'marciano'
> ```
>
> Guardado tan tranquilo. Y `get_grupo_display()` no falla: cuando el valor no está en la lista, devuelve el valor crudo.
>
> `choices` es una restricción de formulario, no de base de datos. El SQL que genera es un `varchar(15)` normal, sin ningún `CHECK`. Quien te protege es el formulario, y en el bloque D se verá que un `ModelForm` convierte ese campo en un desplegable que solo admite lo que hay.
>
> Si quieres que la base de datos lo haga cumplir de verdad, hay que añadir una restricción en `Meta`, y eso es la lección 15.

> [!nota] Las otras dos clases de opciones
>
> `IntegerChoices` es igual con valores enteros, útil cuando el orden importa:
>
> ```python
> class Prioridad(models.IntegerChoices):
>         BAJA = 1, 'Baja'
>     MEDIA = 2, 'Media'
>     ALTA = 3, 'Alta'
> ```
>
> Y la forma antigua, una lista de tuplas, que sigue funcionando y que verás en todo el código anterior a Django 3.0:
>
> ```python
> GRUPOS = [('sin', 'Sin grupo'), ('trabajo', 'Trabajo')]
> grupo = models.CharField(max_length=15, choices=GRUPOS)
> ```
>
> Hace lo mismo y no tiene las constantes. En código nuevo, `TextChoices`.

## Las fechas automáticas

Tres formas de poner una fecha, y se confunden:

| Opción | Cuándo se pone | ¿Se puede cambiar? |
| --- | --- | --- |
| `auto_now_add=True` | Solo al crear la fila | No, el campo se vuelve de solo lectura |
| `auto_now=True` | En **cada** `save()` | No |
| `default=timezone.now` | Al crear, si no se da otra | Sí |

Las dos primeras son cómodas y tienen un precio: **el campo deja de ser editable**, no sale en los formularios y no se puede corregir a mano. Para "creado el" y "modificado el" es exactamente lo que se quiere. Para una "fecha de la cita", que alguien tiene que poder elegir y cambiar, hay que usar la tercera.

```python
from django.utils import timezone

creado = models.DateTimeField(auto_now_add=True)
modificado = models.DateTimeField(auto_now=True)
fecha_cita = models.DateField(default=timezone.now, null=True, blank=True)
```

Fíjate en `timezone.now` **sin paréntesis**. Se pasa la función, para que Django la llame en el momento de crear cada fila; con paréntesis se pasaría la hora del arranque del servidor, la misma para siempre. Y es `django.utils.timezone.now`, no `datetime.now`, por lo de `USE_TZ` que se explicó en la lección 5: la primera devuelve una fecha con huso y la segunda no.

> [!aviso] Un valor por defecto mutable, y el aviso que lo caza
>
> El error de los argumentos por defecto mutables de la lección 35 del módulo 1 reaparece aquí, y con más consecuencias, porque el valor se compartiría entre todas las filas:
>
> ```python
> datos = models.JSONField(default={})        # mal
> etiquetas = models.JSONField(default=list)  # bien
> ```
>
> Django lo detecta. Basta con `python manage.py check`:
>
> ```salida
> contactos.Malo.datos: (fields.E010) JSONField default should be a callable
> instead of an instance so that it's not shared between all field instances.
>     HINT: Use a callable instead, e.g., use `dict` instead of `{}`.
> ```
>
> La solución es la misma que en el módulo 1: se pasa la función que fabrica el valor, no el valor. `dict` en vez de `{}`, `list` en vez de `[]`. Es un buen recordatorio de que las comprobaciones de `check` no son burocracia.

## Lo que no se cambia luego sin dolor

Para cerrar, lo que conviene pensar dos veces, porque cambiarlo con datos dentro es trabajo:

- **Meter un `unique=True` en un campo que ya tiene duplicados.** La migración falla al aplicarse, no al crearse. Hay que limpiar los datos antes.
- **Bajar el `max_length`.** En SQLite no pasa nada porque no lo comprueba, y en PostgreSQL la migración falla si hay filas más largas. La diferencia entre gestores es de las que se descubren el día del despliegue.
- **Cambiar los valores de `choices`.** Cambiar la etiqueta es gratis; cambiar lo que se guarda obliga a una migración que actualice las filas existentes.
- **Pasar un campo de `null=True` a obligatorio.** `makemigrations` te preguntará qué poner en las filas que ya tienen `NULL`, y hay que tener la respuesta.

Ninguna es un callejón sin salida. Todas se resuelven con lo de la lección siguiente, que son precisamente las migraciones.

> [!resumen] En resumen
>
> Django trae treinta y nueve clases de campo, y las que se usan son quince; lo que hay que aprender no son los tipos, que se adivinan por el nombre, sino las ocho opciones comunes, que se dividen entre las que cambian la tabla —`null`, `unique`, `db_index`— y las que solo cambian lo que ve una persona —`blank`, `choices`, `verbose_name`, `help_text`—. Los campos especializados como `EmailField` o `SlugField` son un `varchar` con validadores, salvo que `SlugField` además crea un índice, y `FileField` guarda la ruta del fichero y no el fichero. De ahí salen tres decisiones que luego cuesta deshacer. La primera es `blank` frente a `null`: `blank` es de los formularios y `null` de la base de datos, y en los campos de texto se pone el primero y no el segundo para no tener dos maneras de decir que no hay valor, mientras que en números, fechas y relaciones se ponen los dos. La segunda es que el dinero va en `DecimalField` y nunca en `FloatField`, porque los errores del binario se acumulan. Y la tercera son las opciones cerradas, que se declaran con `TextChoices`, separando lo que se guarda de lo que se enseña y dando un `get_campo_display()` automático, con la advertencia de que `choices` no genera ninguna restricción en la base de datos y no impide guardar un valor inventado. Las fechas automáticas con `auto_now_add` y `auto_now` vuelven el campo no editable, así que solo valen para "creado" y "modificado". Y un valor por defecto mutable es un error que `check` detecta y que se arregla pasando la función en vez del valor.

> [!ejercicio] Practica
>
> 1. Amplía el modelo `Contacto` con `choices` para el grupo usando `TextChoices`, y añade `verbose_name` con tildes a todos los campos. Genera la migración y mira el SQL.
> 2. Crea un modelo de prueba con un campo de cada tipo de la tabla y ejecuta `sqlmigrate`. Localiza en la salida el `CHECK` del campo positivo y el índice del `SlugField`.
> 3. Guarda un contacto con un grupo que no esté en `choices` y comprueba que se guarda y que `get_grupo_display()` devuelve el valor crudo.
> 4. Añade un `JSONField` con `default={}`, ejecuta `check` y lee el aviso. Arréglalo.
> 5. Crea dos campos de fecha, uno con `auto_now_add` y otro con `default=timezone.now`. Guarda un objeto, cámbialos los dos a mano y vuelve a guardar. Comprueba cuál ha conservado tu cambio.
> 6. Añade un campo `saldo` con `DecimalField(max_digits=8, decimal_places=2)`, guarda `Decimal('0.1')`, vuelve a leerlo de la base de datos y compara la representación con la que guardaste.
