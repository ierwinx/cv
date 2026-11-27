---
titulo: "Modelos: la primera tabla"
resumen: "Una clase de Python que resulta ser una tabla, el SQL que Django escribe por ti, y la columna que aparece sin que la pidas."
minutos: 15
orden: 8
---

En la lección 47 del módulo 3 escribiste esto a mano:

```sql
CREATE TABLE IF NOT EXISTS contactos (
    id       INTEGER PRIMARY KEY,
    nombre   TEXT NOT NULL,
    correo   TEXT NOT NULL UNIQUE,
    telefono TEXT NOT NULL DEFAULT '',
    grupo    TEXT NOT NULL DEFAULT 'Sin grupo',
    notas    TEXT NOT NULL DEFAULT ''
);
```

Y después, cada consulta con su cadena de SQL, sus interrogantes para los parámetros y su conversión de filas a diccionarios. Funcionaba bien. Lo que no aguanta es el cambio: añadir una columna obligaba a tocar el `CREATE TABLE`, todos los `INSERT`, todos los `SELECT` y el código que leía las filas, y no había nada que avisara si se te olvidaba uno.

Un **modelo** es esa misma tabla escrita como una clase de Python. De esa clase salen el SQL que la crea, las consultas, la conversión a objetos y los formularios. Esta lección escribe el primero.

> [!objetivo] Qué vas a aprender
>
> Escribir un modelo y entender la correspondencia entre clase y tabla, atributo y columna, instancia y fila. Ver el SQL que Django genera y compararlo con el que escribiste a mano. Saber de dónde sale la columna `id` que no has declarado y cómo se llama la tabla. Y conocer la trampa más importante del ORM: que guardar no valida.

## La correspondencia

Es de tres líneas y conviene tenerla clara desde el principio, porque todo el bloque cuelga de ella:

| En Python | En la base de datos |
| --- | --- |
| Una clase que hereda de `models.Model` | Una tabla |
| Un atributo de clase que es un campo | Una columna |
| Una instancia de esa clase | Una fila |

Eso es un **ORM**, de *object-relational mapper*: la pieza que traduce entre objetos y tablas en los dos sentidos. Lo que ganas no es escribir menos SQL, que también: lo que ganas es que **hay un solo sitio donde está definido lo que es un contacto**. El día que añadas un campo, lo añades ahí y el resto se entera.

## El modelo

En `contactos/models.py`, que `startapp` dejó casi vacío:

```python title="contactos/models.py"
from django.db import models


class Contacto(models.Model):
        nombre = models.CharField(max_length=100)
    correo = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True)
    grupo = models.CharField(max_length=30, default='Sin grupo')
    notas = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
                return self.nombre
```

Compáralo con el `CREATE TABLE` de arriba: son las mismas cinco columnas, con la misma información, y una nueva. Punto por punto:

**El nombre de la clase va en singular.** `Contacto`, no `Contactos`. La clase representa *un* contacto, y la tabla la nombra Django. Es la convención universal en Django y conviene seguirla porque el panel de administración y los mensajes de error la dan por hecha al construir plurales.

**Hereda de `models.Model`.** De ahí le vienen el `save()`, el `delete()`, el `objects` con el que se consulta y la maquinaria que detecta los campos.

**Cada campo es una clase distinta**, no un tipo con opciones. `CharField` para texto corto, `TextField` para texto largo, `EmailField` para un correo, `DateTimeField` para una fecha con hora. Hay unos veinticinco y son la lección siguiente; aquí basta con cinco.

**`max_length` es obligatorio en `CharField`** y no lo es en `TextField`. No es un capricho: `CharField` se traduce a un `VARCHAR(n)` y ese `n` hay que decirlo. Si lo olvidas, `makemigrations` falla antes de tocar nada.

**`creado` no estaba en la versión de Tkinter.** `auto_now_add=True` hace que Django ponga la fecha actual al crear la fila y no la toque nunca más. Es de esas cosas que en SQL a mano se olvidan y luego se echan de menos.

**`__str__` no es decorativo.** Es el método del módulo 1 de toda la vida, y aquí es lo que se ve en el panel de administración, en los desplegables de los formularios y al imprimir un objeto. Sin él, Django enseña `Contacto object (1)`, que no dice nada. Se pone siempre, en todos los modelos, desde el primer día.

## Convertirlo en una tabla

El modelo por sí solo no crea nada. Son dos órdenes, y tienen su lección entera más adelante:

```bash
python manage.py makemigrations
```

```salida
Migrations for 'contactos':
  contactos/migrations/0001_initial.py
    + Create model Contacto
```

```bash
python manage.py migrate
```

```salida
Applying contactos.0001_initial... OK
```

La primera **escribe un fichero** que describe el cambio; no toca la base de datos. La segunda **lo aplica**. Están separadas a propósito, porque ese fichero se guarda en el repositorio y es lo que permite que la base de datos de otra persona, o la del servidor, acabe exactamente igual que la tuya.

> [!consejo] Mira el SQL antes de creértelo
>
> Hay una orden para ver qué va a ejecutar una migración, sin ejecutarla:
>
> ```bash
> python manage.py sqlmigrate contactos 0001
> ```
>
> ```salida
> BEGIN;
> CREATE TABLE "contactos_contacto" (
>     "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
>     "nombre" varchar(100) NOT NULL,
>     "correo" varchar(254) NOT NULL UNIQUE,
>     "telefono" varchar(20) NOT NULL,
>     "grupo" varchar(30) NOT NULL,
>     "notas" text NOT NULL,
>     "creado" datetime NOT NULL
> );
> COMMIT;
> ```
>
> Es prácticamente el `CREATE TABLE` que escribiste a mano. Usa esta orden siempre que una migración te dé respeto, y sobre todo cuando cambies algo en una tabla que ya tiene datos: es la diferencia entre confiar y saber.

Ese SQL tiene tres cosas que no has escrito tú y merecen explicación.

## La columna `id`

No la has declarado y está ahí, como clave primaria y autoincremental. Django añade una a todo modelo que no declare la suya, porque toda fila necesita algo que la identifique. Se puede usar de dos formas:

```python
contacto.id
contacto.pk
```

`pk` es un alias de "clave primaria" que apunta a la que haya. Conviene usar `pk` en el código general, porque si algún día el modelo declara su propia clave primaria con otro nombre, el código que dice `pk` sigue funcionando.

> [!nota] De dónde sale el tipo de esa columna, y por qué esto ha cambiado
>
> El tipo es `BigAutoField`, un entero de 64 bits. Si buscas cómo se configura eso, casi todo lo que encontrarás te dirá que hay que declararlo en `apps.py` o en `settings.py`:
>
> ```python
> DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
> ```
>
> En Django 6.1 **eso ya no hace falta** y `startproject` no lo genera: ese es el valor por defecto. Se comprueba en dos líneas:
>
> ```consola
> >>> from django.conf import settings
> >>> settings.DEFAULT_AUTO_FIELD
> 'django.db.models.BigAutoField'
> ```
>
> Durante años el valor por defecto fue `AutoField`, de 32 bits, que se queda corto a los dos mil millones de filas, y Django obligaba a declarar el que quisieras para que el cambio no rompiera los proyectos viejos. Ya no. Si ves esa línea en un tutorial, no es un error, es material de la versión 4 o 5.

## El nombre de la tabla

`contactos_contacto`. Django lo construye juntando el nombre de la aplicación y el de la clase en minúsculas, y así dos aplicaciones pueden tener cada una su `Contacto` sin chocar.

Se puede cambiar, y es lo que hay que hacer cuando el modelo se apoya en una tabla que ya existe:

```python
class Contacto(models.Model):
        ...

    class Meta:
                db_table = 'contactos'
```

Esa clase `Meta` de dentro guarda los ajustes que son de la tabla entera y no de un campo. Tiene su lección, la 15, con el orden por defecto, el nombre en plural y las restricciones.

## El `NOT NULL` de `notas`

Aquí está el detalle que más despista del modelo. `notas` tiene `blank=True` y su columna ha salido `NOT NULL`. Parece una contradicción y no lo es, porque **`blank` y `null` son dos cosas distintas y solo una es de la base de datos**:

| Opción | De quién es | Qué significa |
| --- | --- | --- |
| `null=True` | De la base de datos | La columna admite `NULL` |
| `blank=True` | De los formularios | El campo se puede dejar vacío al rellenarlo |

`notas` con `blank=True` y sin `null=True` significa: en el formulario no es obligatorio, y cuando no se rellena se guarda la cadena vacía. No un `NULL`, una cadena vacía.

Y eso es lo que se quiere. La regla que evita disgustos:

> En los campos de texto, `blank=True` sí y `null=True` no.

El motivo es que con los dos puestos habría **dos maneras de decir "no hay teléfono"**: la cadena vacía y el `NULL`. Entonces `telefono = ''` y `telefono = None` son cosas distintas para la base de datos, las consultas tienen que preguntar por las dos, y tarde o temprano una se olvida. En campos que no son de texto —un número, una fecha— no hay cadena vacía que valga, y ahí `null=True` sí es la forma correcta de decir que no hay valor. La lección siguiente entra en esto campo por campo.

## Probarlo

El intérprete de Django tiene su lección, la 11. Un adelanto para ver que la tabla existe y funciona:

```bash
python manage.py shell
```

```consola
>>> Contacto.objects.create(nombre='Ana Ruiz', correo='ana@ejemplo.es', grupo='Trabajo')
<Contacto: Ana Ruiz>
>>> c = Contacto.objects.get(correo='ana@ejemplo.es')
>>> c.pk
1
>>> c.notas
''
>>> c.creado
datetime.datetime(2026, 9, 22, 16, 16, 47, 992908, tzinfo=datetime.timezone.utc)
```

Cuatro cosas en esas líneas. El `<Contacto: Ana Ruiz>` sale de tu `__str__`. El `pk` lo ha puesto la base de datos al insertar. `notas`, que no se ha dado, es la cadena vacía y no `None`, como acaba de explicarse. Y `creado` viene **en UTC**, con su `tzinfo`, porque `USE_TZ` está activado: Django guarda siempre en UTC y convierte a `TIME_ZONE` solo al mostrar.

> [!aviso] `save()` no valida nada
>
> Esta es la trampa importante de la lección, y se ve mejor haciéndola:
>
> ```consola
> >>> v = Contacto(correo='vacio@ejemplo.es')
> >>> v.save()
> >>> v.pk
> 3
> >>> Contacto.objects.create(nombre='X', correo='esto-no-es-un-correo')
> <Contacto: X>
> ```
>
> Un contacto sin nombre, guardado. Un `EmailField` con algo que no es un correo, guardado. Ni un aviso.
>
> No es un fallo: es el reparto de responsabilidades de Django, y hay que conocerlo. **Los campos definen cómo se guarda y cómo se valida, pero `save()` solo hace lo primero.** La validación la ejecuta `full_clean()`, y `save()` no lo llama.
>
> ```consola
> >>> c = Contacto(nombre='', correo='no-es-un-correo')
> >>> c.full_clean()
> ValidationError: {'nombre': ['Este campo no puede estar vacío.'],
>                   'correo': ['Introduzca una dirección de correo electrónico válida.']}
> ```
>
> Ahí sí. Y fíjate en que los mensajes salen en español, por el `LANGUAGE_CODE` de la lección 5.
>
> ¿Por qué está separado? Porque validar cuesta, y hay sitios donde no hace falta: cargar diez mil filas de un fichero, o una migración que ya sabe lo que escribe. Lo que importa es la consecuencia práctica: **si los datos vienen de una persona, tienen que pasar por un formulario**, que es quien llama a `full_clean()` por ti. Guardar a pelo lo que llega de fuera es cómo se acaba con una base de datos llena de basura. El bloque D es entero sobre eso.
>
> Lo que sí se respeta siempre es lo que vive en la base de datos, porque ahí no manda Django:
>
> ```consola
> >>> Contacto.objects.create(nombre='Otra Ana', correo='ana@ejemplo.es')
> IntegrityError: UNIQUE constraint failed: contactos_contacto.correo
> ```
>
> El `unique=True` es una restricción de verdad en la tabla, y esa no se salta ni con `save()` ni con nada.

> [!resumen] En resumen
>
> Un modelo es una clase que hereda de `models.Model`, y la correspondencia con la base de datos es directa: la clase es la tabla, cada campo es una columna y cada instancia es una fila. El nombre de la clase va en singular y cada campo es una clase distinta, no un tipo con opciones, con `max_length` obligatorio en `CharField` porque se traduce a un `VARCHAR(n)`. `__str__` se escribe siempre, porque es lo que se ve en el panel de administración y en los formularios. De ahí salen dos órdenes separadas a propósito: `makemigrations` escribe un fichero que describe el cambio y `migrate` lo aplica, y entre las dos conviene mirar el SQL con `sqlmigrate`. En ese SQL aparecen tres cosas que no has escrito: una columna `id` que Django añade a todo modelo sin clave primaria propia, de tipo `BigAutoField`, que en 6.1 ya es el valor por defecto y no hay que declarar en ninguna parte; el nombre de la tabla, formado con el de la aplicación y el de la clase; y un `NOT NULL` en un campo con `blank=True`, porque `blank` es de los formularios y `null` es de la base de datos, y en los campos de texto se pone el primero y no el segundo para no tener dos maneras distintas de decir que no hay valor. Y la trampa que hay que conocer desde el primer día: `save()` no valida, así que se puede guardar un campo obligatorio vacío o un correo que no lo es; validar es cosa de `full_clean()`, y quien lo llama por ti es el formulario.

> [!ejercicio] Practica
>
> 1. Escribe el modelo, ejecuta `makemigrations` y **antes** de aplicarlo mira el SQL con `sqlmigrate`. Después aplícalo.
> 2. Quita el `max_length` del `nombre` y ejecuta `makemigrations`. Lee el error y vuelve a ponerlo.
> 3. Abre `db.sqlite3` con el módulo `sqlite3` de la biblioteca estándar, como hacías en el módulo 3, y ejecuta un `SELECT * FROM contactos_contacto`. Es una tabla normal.
> 4. Crea un contacto sin nombre y otro con un correo inventado, y comprueba que los dos se guardan. Después pásales `full_clean()` y lee los errores.
> 5. Intenta crear dos contactos con el mismo correo y lee el `IntegrityError`. Explica por qué este sí falla y los del ejercicio anterior no.
> 6. Quita el `__str__`, entra en el intérprete y mira cómo se ve un contacto. Vuelve a ponerlo y prueba a devolver `f"{self.nombre} <{self.correo}>"`.
