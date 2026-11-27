---
titulo: "Las aplicaciones dentro del proyecto"
resumen: "Por qué un proyecto de Django se parte en trozos, dónde va por fin tu código, y el olvido que no da ningún error."
minutos: 14
orden: 7
---

En la lección 6 escribiste una vista en el paquete de configuración, y quedó dicho que ese no era su sitio. Ahora se muda.

Las **aplicaciones** son la unidad en la que Django parte un proyecto, y el nombre confunde: no son programas, son carpetas con una estructura pactada. Un proyecto es un conjunto de aplicaciones, y las cuatro que vienen puestas de fábrica —la autenticación, el panel de administración, las sesiones— son aplicaciones exactamente iguales que las que vas a escribir tú.

> [!objetivo] Qué vas a aprender
>
> Entender qué es una aplicación y con qué criterio se parte un proyecto, crear una con `startapp` y saber qué hace cada fichero que genera, registrarla en `INSTALLED_APPS` y conocer el fallo silencioso de no hacerlo, darle su propio fichero de rutas y conectarlo con `include`, y mover allí la vista de la lección anterior.

## Por qué partir el proyecto

La razón de fondo es que Django se diseñó en un periódico, para una redacción que tenía una web de noticias, otra de clasificados y otra de eventos, y todas necesitaban lo mismo: usuarios, comentarios, etiquetas, un buscador. La idea fue que esas piezas comunes se pudieran escribir una vez y enchufar en los tres sitios.

De ahí sale la definición práctica: **una aplicación es un trozo del proyecto que hace una cosa y que podrías llevarte a otro proyecto**. La agenda de contactos es una. El blog de la empresa sería otra. El sistema de usuarios es otra, y esa ni la escribes tú porque viene con Django.

En un proyecto pequeño, esa capacidad de llevártela no la vas a usar nunca, y sin embargo la división sigue mereciendo la pena por lo que impone: cada aplicación tiene sus modelos, sus vistas, sus plantillas y sus pruebas en su carpeta, y cuando abras el proyecto dentro de seis meses sabrás dónde mirar.

> [!nota] Dos palabras que se confunden todo el rato
>
> **Proyecto** es el conjunto: la carpeta con `manage.py`, la configuración y todas las aplicaciones. Hay uno.
>
> **Aplicación** es cada trozo. Hay varios, y los de `django.contrib` también cuentan. Mira `INSTALLED_APPS`: esas seis líneas son seis aplicaciones que ya están funcionando en tu proyecto sin que hayas escrito nada.

## Crearla

```bash
python manage.py startapp contactos
```

No imprime nada. Ha creado esto:

```text
contactos/
  __init__.py       Vacío: declara que es un paquete
  apps.py           La configuración de la aplicación
  models.py         Los modelos. Bloque B
  views.py          Las vistas. Bloque C
  admin.py          Qué se registra en el panel de administración. Bloque E
  tests.py          Las pruebas. Lección 39
  migrations/       Las migraciones, de momento vacía
```

Casi todos nacen con un comentario dentro y nada más:

```python title="contactos/views.py"
from django.shortcuts import render

# Create your views here.
```

La carpeta está al lado de `manage.py`, no dentro del paquete de configuración. Y faltan dos cosas que vas a crear a mano en cuanto hagan falta, porque `startapp` no las pone: **`urls.py`**, que se hace en esta misma lección, y la carpeta **`templates/`**, que llega en el bloque C.

> [!error] `conflicts with the name of an existing Python module`
>
> Los nombres de las aplicaciones tienen dos reglas y las dos se descubren chocando con ellas:
>
> ```salida
> CommandError: 'agenda' conflicts with the name of an existing Python module and
> cannot be used as an app name. Please try another name.
>
> CommandError: 'mis-contactos' is not a valid app name. Please make sure the name
> is a valid identifier.
> ```
>
> El primero sale al intentar llamar a la aplicación como el proyecto, y también al usar el nombre de cualquier módulo importable: `json`, `test`, `email`. Una aplicación es un paquete de Python y dos paquetes no pueden llamarse igual; si lo permitiera, `import json` dejaría de traer lo que esperas.
>
> El segundo es por el guion. El nombre tiene que ser un identificador válido de Python, así que guiones bajos sí y guiones normales no.
>
> La costumbre es nombrarlas en plural y en minúsculas: `contactos`, `pedidos`, `articulos`.

## Registrarla

Una aplicación creada no está puesta. Hay que añadirla a `INSTALLED_APPS`, al final de la lista:

```python title="agenda/settings.py"
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'contactos',
]
```

Con esa línea, Django ya sabe que la aplicación existe y empieza a mirar dentro: busca sus modelos para crear las tablas, sus plantillas al renderizar, sus pruebas al ejecutar `test` y su `admin.py` al montar el panel.

> [!aviso] Olvidarse de registrarla no da ningún error
>
> Este es el fallo con peor relación entre lo tonto que es y el tiempo que cuesta, y lo que lo hace desagradable es que **media aplicación funciona igual sin registrar**.
>
> Las vistas y las rutas no necesitan el registro para nada: son módulos de Python que se importan desde `urls.py`, y a Python le da igual `INSTALLED_APPS`. La página responde `200` como si tal cosa. Y `python manage.py check` dice que todo está bien.
>
> Lo que sí depende del registro son los modelos, las plantillas, el panel de administración y las pruebas. Con un modelo escrito y la aplicación sin registrar:
>
> ```salida
> No changes detected
> ```
>
> Eso es todo lo que dice `makemigrations`. No hay error, no hay aviso, y el mensaje es literalmente cierto: Django no ha detectado cambios porque ni siquiera ha mirado en esa carpeta. Con la aplicación registrada, la misma orden:
>
> ```salida
> Migrations for 'contactos':
>   contactos/migrations/0001_initial.py
>     + Create model Contacto
> ```
>
> **Cada vez que veas `No changes detected` teniendo un modelo nuevo, la primera sospecha es `INSTALLED_APPS`.**

## Mudar la vista

Ahora se mueve lo de la lección 6. La vista pasa a `contactos/views.py`, con el nombre de fichero que usa Django:

```python title="contactos/views.py"
from django.http import HttpResponse


def lista(peticion):
        nombres = ["Ana Ruiz", "Luis Pardo"]
    filas = "".join(f"<li>{n}</li>" for n in nombres)
    return HttpResponse(f"<h1>Contactos</h1><ul>{filas}</ul>")
```

Dos cambios respecto a como estaba. El fichero se llama `views.py` en inglés, porque **ese nombre lo impone Django** en unos cuantos sitios y no es negociable como sí lo era el de `vistas.py`. Y la función se llama `lista` y no `contactos`, porque ya está dentro de la aplicación de contactos y repetir la palabra sobra: la dirección acabará siendo `contactos.lista`.

## Su propio fichero de rutas

Aquí está el reparto que hace escalable un proyecto. En vez de que el `urls.py` del proyecto conozca todas las direcciones, cada aplicación declara las suyas y el proyecto solo dice por dónde cuelgan.

Crea `contactos/urls.py`:

```python title="contactos/urls.py"
from django.urls import path

from . import views

app_name = 'contactos'

urlpatterns = [
    path('', views.lista, name='lista'),
]
```

Y en el del proyecto, `include`:

```python title="agenda/urls.py"
from django.contrib import admin
from django.urls import include, path

from . import vistas

urlpatterns = [
    path('', vistas.portada),
    path('contactos/', include('contactos.urls')),
    path('admin/', admin.site.urls),
]
```

`include` hace algo muy concreto: **le corta a la ruta el trozo que ya ha encajado y le pasa el resto al otro fichero**. Una petición a `/contactos/` encaja con `'contactos/'`, y lo que queda es la cadena vacía, que es lo que `contactos/urls.py` compara con sus patrones. Por eso el patrón de dentro es `''` y no `'contactos/'`: la aplicación no sabe ni tiene que saber bajo qué dirección la han colgado.

Esa ignorancia es justo lo que la hace reutilizable. Si mañana la agenda tiene que vivir en `/agenda/personas/`, se cambia una línea del proyecto y dentro de la aplicación no se toca nada.

> [!nota] `name` y `app_name`, que se usan en el bloque C
>
> Dos cosas de ese fichero no hacen nada visible todavía.
>
> `name='lista'` le pone nombre a la ruta, y `app_name = 'contactos'` mete todos los nombres del fichero en un espacio propio. Juntos permiten referirse a esa dirección como `'contactos:lista'` en vez de escribir `/contactos/` a mano, y que Django construya la dirección por ti.
>
> Esto importa más de lo que parece ahora: las direcciones escritas a mano en veinte plantillas son lo que hace que reorganizar las URL de un proyecto sea imposible. Con nombres, se cambia el patrón y todo lo demás sigue funcionando. Se usa a fondo en la lección 21, pero conviene escribir el `name` desde el primer día, porque añadirlos después es una tarde perdida.

Comprueba que sigue funcionando:

```bash
curl -s http://127.0.0.1:8000/contactos/
```

```salida
<h1>Contactos</h1><ul><li>Ana Ruiz</li><li>Luis Pardo</li></ul>
```

Lo mismo que antes, y ahora el código está donde tiene que estar. Ya puedes borrar `agenda/vistas.py`, dejando en el paquete de configuración solo la vista de la portada o moviéndola también a una aplicación propia.

## `apps.py` y una sorpresa de la versión

El fichero que menos se toca:

```python title="contactos/apps.py"
from django.apps import AppConfig


class ContactosConfig(AppConfig):
        name = 'contactos'
```

Sirve para dos cosas. Una es ponerle un nombre legible a la aplicación, que es el que sale en el panel de administración:

```python
class ContactosConfig(AppConfig):
        name = 'contactos'
    verbose_name = 'Agenda de contactos'
```

La otra es el método `ready()`, que Django llama cuando la aplicación está cargada del todo. Es el sitio correcto para las señales, y aparece en el bloque E.

> [!nota] Si has visto `default_auto_field` por ahí
>
> Casi todo el material escrito sobre Django enseña un `apps.py` con una línea más:
>
> ```python
> class ContactosConfig(AppConfig):
>         default_auto_field = 'django.db.models.BigAutoField'
>     name = 'contactos'
> ```
>
> En Django 6.1 esa línea **ya no se genera**, y `settings.py` tampoco trae `DEFAULT_AUTO_FIELD`. No es que te falte nada ni que tengas que añadirla: es que el valor que antes había que declarar ahora ya es el de por defecto, y declararlo sobraba.
>
> Es un buen ejemplo de por qué conviene mirar la versión de lo que lees. Un tutorial de Django 4.2 te hará añadir una línea que no hace falta, y lo peor es que funcionará, así que no te enterarás.

## Con qué criterio se parte

La pregunta que sigue es cuántas aplicaciones hacen falta. No hay una respuesta buena, pero sí dos malas muy frecuentes.

Una es **una sola aplicación para todo**, normalmente llamada `core` o `principal`, con cuarenta modelos dentro. Funciona y renuncia a lo único que aportaba la división, que es saber dónde está cada cosa.

La otra es **una aplicación por modelo**. Se acaba con quince carpetas de tres líneas cada una, importándose entre ellas en todas las direcciones, que es peor que no haber partido nada.

El criterio que funciona es preguntarse si el trozo tiene sentido por sí solo. La agenda de contactos lo tiene: se entiende sin saber nada del resto del proyecto. Un modelo de "grupo de contacto" no lo tiene, porque solo existe para los contactos; va dentro de la misma aplicación.

Para este módulo, la agenda es una aplicación y punto. Los dos proyectos del final tendrán dos o tres, y ahí se verá el reparto con más de una pieza sobre la mesa.

> [!resumen] En resumen
>
> Una aplicación es la unidad en la que Django parte un proyecto: una carpeta con estructura pactada que hace una cosa y que en teoría podrías llevarte a otro proyecto. Las que vienen de fábrica en `INSTALLED_APPS` son aplicaciones exactamente iguales que las tuyas. Se crean con `startapp`, que deja `models.py`, `views.py`, `admin.py`, `tests.py`, un `apps.py` y una carpeta de migraciones, y que no crea ni `urls.py` ni la carpeta de plantillas, que se añaden a mano. El nombre tiene que ser un identificador de Python válido y no puede coincidir con el de ningún módulo importable, ni siquiera con el del propio proyecto. Después hay que registrarla en `INSTALLED_APPS`, y olvidarlo no da ningún error: las vistas y las rutas funcionan igual, `check` no se queja, y lo único que pasa es que `makemigrations` dice `No changes detected` ante un modelo nuevo, así que ese mensaje debe hacerte sospechar del registro antes que de nada. Cada aplicación declara sus rutas en su propio `urls.py` y el proyecto las engancha con `include`, que corta de la ruta el trozo ya consumido y pasa el resto, de modo que la aplicación no sabe bajo qué dirección la han colgado y se puede mover cambiando una línea. Conviene ponerle `name` a cada ruta y `app_name` al fichero desde el principio, aunque su utilidad no se vea hasta el bloque de plantillas.

> [!ejercicio] Practica
>
> 1. Crea la aplicación, regístrala y mueve allí la vista de la lección anterior con su propio `urls.py` y su `include`. Comprueba que la dirección sigue respondiendo lo mismo.
> 2. Intenta crear una aplicación llamada como tu proyecto, otra llamada `json` y otra con un guion en el nombre. Lee los tres errores.
> 3. Quita la aplicación de `INSTALLED_APPS` y comprueba que la página sigue funcionando y que `check` no se queja. Vuelve a ponerla.
> 4. Escribe un modelo mínimo en `contactos/models.py`, ejecuta `makemigrations` con la aplicación registrada y sin registrar, y compara las dos salidas.
> 5. Cambia el `include` para que la agenda cuelgue de `/agenda/personas/` y comprueba que no hay que tocar nada dentro de la aplicación.
> 6. Añade `verbose_name` en `apps.py`. Todavía no puedes verlo en ningún sitio; apunta la lección en la que aparecerá.
