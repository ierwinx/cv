---
titulo: "La estructura de ficheros de un proyecto"
resumen: "Siete ficheros, uno vacío, dos que no vas a tocar nunca y dos que vas a abrir todos los días."
minutos: 12
orden: 4
---

`startproject` ha dejado siete ficheros y no ha explicado ninguno. Son pocos, pero la primera vez desconciertan: hay dos carpetas con el mismo nombre, hay un fichero vacío, y hay dos que parecen lo mismo con distinto nombre.

Esta lección los recorre uno a uno. No es material de referencia para consultar luego: entender ahora para qué sirve cada sitio es lo que evita la pregunta que se repite durante todo el módulo, que es dónde va lo que estoy escribiendo.

> [!objetivo] Qué vas a aprender
>
> Saber qué hace cada fichero de un proyecto recién creado, distinguir las dos carpetas que se llaman igual y por qué se llaman igual, entender qué es `manage.py` y por qué todo pasa por él, saber qué son WSGI y ASGI lo justo para no tenerles miedo, y tener claro qué ficheros se tocan a diario y cuáles no se tocan nunca.

## El árbol

```text
agenda/                 La carpeta del proyecto: aquí trabajas
  .venv/                  El entorno virtual
  .gitignore
  manage.py               El mando a distancia
  db.sqlite3              La base de datos. Aparece al ejecutar migrate
  agenda/                 El paquete de configuración
    __init__.py             Vacío, y tiene que estarlo
    settings.py             Todos los ajustes
    urls.py                 Las direcciones del proyecto
    wsgi.py                 Punto de entrada para servidores clásicos
    asgi.py                 Punto de entrada para servidores asíncronos
```

Lo primero, el desconcierto de las dos `agenda`. **La de fuera no es de Django**, es tu carpeta de trabajo; podría llamarse `web-de-contactos` y a Django le daría igual. La de dentro sí es de Django: es un paquete de Python, con su `__init__.py`, y su nombre es el que aparece en `agenda.settings` y en `agenda.urls`. Ese sí importa.

Para no liarse al hablar de ellas, en el resto del módulo la de fuera es **la carpeta del proyecto** y la de dentro **el paquete de configuración**.

## `manage.py`

Es el fichero por el que pasa todo lo que hagas de aquí en adelante: arrancar el servidor, crear migraciones, aplicarlas, abrir el intérprete, lanzar las pruebas, crear un usuario. Toda la lección de migraciones, toda la de pruebas y media del bloque de usuarios son órdenes de `manage.py`.

Por dentro es más corto de lo que parece:

```python title="manage.py"
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
        """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agenda.settings')
    try:
                from django.core.management import execute_from_command_line
    except ImportError as exc:
                raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
        main()
```

Hace tres cosas, y las tres las entiendes con lo que ya sabes:

1. **Pone una variable de entorno**, `DJANGO_SETTINGS_MODULE`, con la ruta de importación de tus ajustes. Las variables de entorno las viste en la lección 15 del módulo 2. Así es como Django sabe qué proyecto es este: no lo adivina, se lo dice esa variable.
2. **Importa Django y, si no puede, cambia el error por uno entendible.** Es el `ImportError` de la lección anterior. El `raise ... from exc` es el encadenado de excepciones del módulo 1: conserva el error original debajo y añade encima uno que dice qué hacer.
3. **Le pasa los argumentos a Django**, `sys.argv` tal cual, que es lo que viste en la lección 9 del módulo 2.

El `setdefault` de la primera línea no es casual. Pone el valor **solo si la variable no existe ya**, lo que deja una puerta abierta: si defines `DJANGO_SETTINGS_MODULE` en la terminal antes de ejecutar, `manage.py` respeta la tuya. Es lo que permite tener varios ficheros de ajustes y elegir uno sin tocar código, y es la base de la lección de configuración por entornos.

> [!consejo] No hace falta memorizar las órdenes
>
> `python manage.py` sin argumentos lista todo lo que sabe hacer, y `python manage.py help migrate` explica una en concreto con sus opciones. Son unas treinta y no hay que aprendérselas; hay que saber que esa lista existe y mirarla.

## `settings.py`

Un fichero de Python con variables en mayúsculas. Eso es todo lo que es: Django lo importa y lee sus nombres en mayúscula.

Que sea código y no un `.ini` o un `.toml` tiene una consecuencia que se aprovecha mucho: dentro puedes usar Python. De hecho la primera línea útil del fichero ya lo hace:

```python
BASE_DIR = Path(__file__).resolve().parent.parent
```

`pathlib` de la lección 45 del módulo 1. `__file__` es este fichero, `resolve()` lo convierte en ruta absoluta, y los dos `.parent` suben dos niveles: del fichero al paquete de configuración, y de ahí a la carpeta del proyecto. `BASE_DIR` acaba siendo la carpeta de fuera, y se usa para construir rutas sin escribir nada absoluto:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

Los ajustes que trae y cuáles hay que cambiar son la lección siguiente, entera.

> [!aviso] La clave secreta que ya viene escrita
>
> En `settings.py` hay una línea así:
>
> ```python
> SECRET_KEY = 'django-insecure-!7#yqe=x#d3xjv2_kg0cah%j(aj@vb+ochmm601uyh9wvbp7u&'
> ```
>
> Django la usa para firmar cosas: las cookies de sesión, los enlaces de recuperar contraseña, la protección contra formularios falsificados. Quien la conozca puede falsificar todo eso.
>
> Ese prefijo `django-insecure-` lo pone `startproject` a propósito, como recordatorio de que la clave está escrita en un fichero que probablemente acabe en un repositorio. Mientras estés en tu máquina no pasa nada. Antes de poner el proyecto en cualquier sitio público hay que sacarla del código, y de eso se ocupa la lección 40.

## `urls.py`

La lista de direcciones del proyecto. Recién creado tiene una:

```python title="agenda/urls.py"
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
]
```

`urlpatterns` es una lista normal, y Django la recorre **en orden** comparando cada patrón con la ruta que ha pedido el navegador, hasta que uno encaja. El primero que encaja gana y los de abajo no se miran, que es un detalle del que te acordarás cuando dos patrones se solapen.

La única entrada que hay ya funciona: con el servidor en marcha, `http://127.0.0.1:8000/admin/` enseña una pantalla de acceso. Ese es el panel de administración, que Django trae puesto de fábrica y que tiene su bloque entero más adelante.

Este fichero es el de las direcciones **del proyecto**. Cuando haya aplicaciones, cada una tendrá su propio `urls.py` y este se limitará a delegar en ellos. Es la lección 7.

## `wsgi.py` y `asgi.py`

Los dos ficheros que parecen lo mismo. Casi lo son:

```python title="agenda/wsgi.py"
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agenda.settings')

application = get_wsgi_application()
```

`asgi.py` es idéntico cambiando `wsgi` por `asgi`. Ninguno de los dos se toca en todo el módulo, pero conviene saber qué son porque aparecen en cuanto se habla de poner el proyecto en producción.

El problema que resuelven es este. El servidor de `runserver` no vale para producción: atiende de uno en uno, no cifra nada y está pensado para que le pegues cuatro peticiones tú mismo. En un servidor de verdad hay otro programa delante —Gunicorn, uWSGI, Uvicorn— cuyo trabajo es aguantar el tráfico. Ese programa y Django tienen que entenderse, y **WSGI es el acuerdo de cómo se hablan**: una función que recibe la petición y devuelve la respuesta, con una forma pactada. Como es un estándar y no un invento de Django, cualquier servidor que hable WSGI sirve para cualquier framework que hable WSGI.

`application` es esa función, y eso es exactamente lo que le dirás al servidor de producción que use:

```bash
gunicorn agenda.wsgi:application
```

ASGI es el mismo acuerdo hecho veinte años después, con dos cosas que WSGI no admite: código asíncrono y conexiones que se quedan abiertas, como los *websockets*. Si tu proyecto no usa ninguna de las dos, WSGI le sobra.

> [!nota] Cuál usa el servidor de desarrollo
>
> Lo dice al arrancar, aunque casi nadie lo lee:
>
> ```salida
> Starting WSGI development server at http://127.0.0.1:8932/
> ```
>
> WSGI. `runserver` usa el fichero `wsgi.py`, y `asgi.py` se queda ahí sin que nadie lo abra hasta que despliegues con un servidor asíncrono. Hay una excepción: si pones `django.contrib.staticfiles` con ciertos ajustes o usas Django Channels, la cosa cambia. No es asunto de este módulo.

## `__init__.py` y `db.sqlite3`

El `__init__.py` está **vacío, y tiene que estarlo**. Su única función es declarar que la carpeta es un paquete de Python, para que `import agenda.settings` funcione, tal como se explicó en la lección 40 del módulo 1. Es tentador meterle cosas porque se importa antes que nada; no lo hagas, porque se ejecuta en un momento en el que Django todavía no está preparado y los errores que salen no se parecen a la causa.

`db.sqlite3` no existe al crear el proyecto. Aparece la primera vez que ejecutas `migrate`, y es un fichero SQLite normal, el mismo formato que usaste en la lección 47 del módulo 3. Puedes abrirlo con las mismas herramientas.

Que la base de datos sea un fichero dentro de la carpeta del proyecto es una comodidad enorme para aprender: no hay servidor que instalar ni contraseñas que configurar, y para empezar de cero se borra el fichero. También es la razón de que esté en el `.gitignore`: es tuya, con tus pruebas dentro.

## Qué se toca y qué no

Resumido, para orientarte durante el resto del módulo:

| Fichero | Con qué frecuencia lo abrirás |
| --- | --- |
| `settings.py` | A menudo al principio, casi nunca después |
| `urls.py` | Cada vez que haya una dirección nueva |
| `manage.py` | Se ejecuta a diario, se edita nunca |
| `wsgi.py` y `asgi.py` | Nunca, salvo el día del despliegue |
| `__init__.py` | Nunca |

Y algo que a estas alturas se nota: **no hay ningún sitio donde escribir tu código**. Un proyecto recién creado no tiene modelos, ni vistas, ni plantillas. Eso no va en el paquete de configuración: va en aplicaciones, que son carpetas aparte y tienen su lección en este mismo bloque. Antes, dos cosas: los ajustes que hay que cambiar y la primera vista.

> [!resumen] En resumen
>
> Un proyecto recién creado tiene siete ficheros repartidos en dos carpetas que se llaman igual, y conviene distinguirlas desde el principio: la de fuera es tu carpeta de trabajo y su nombre da lo mismo, la de dentro es un paquete de Python y su nombre es el que aparece en `agenda.settings`. `manage.py` es por donde pasa todo, y lo único que hace es definir la variable de entorno que señala a tus ajustes, importar Django cambiando el error por uno entendible, y pasarle los argumentos; el `setdefault` de la primera línea es lo que permitirá tener varios ficheros de ajustes. `settings.py` es código Python con variables en mayúsculas, no un fichero de configuración, y trae ya una clave secreta marcada como insegura que hay que sacar del código antes de publicar nada. `urls.py` es una lista que Django recorre en orden hasta que un patrón encaja. `wsgi.py` y `asgi.py` son el punto de entrada para los servidores de producción y no se tocan en todo el módulo: WSGI es el acuerdo estándar de cómo se hablan un servidor y un framework, y ASGI es el mismo acuerdo con soporte para código asíncrono y conexiones abiertas. El `__init__.py` está vacío y tiene que seguir estándolo, y `db.sqlite3` no aparece hasta el primer `migrate`. Y en todo eso no hay ningún sitio para tu código: eso va en aplicaciones.

> [!ejercicio] Practica
>
> 1. Dibuja de memoria el árbol del proyecto y luego compáralo con el de verdad. Señala cuál de las dos carpetas `agenda` podrías renombrar sin romper nada.
> 2. Abre `settings.py` y busca los sitios donde se usa `BASE_DIR`. Añade un `print(BASE_DIR)` al final del fichero, ejecuta cualquier orden de `manage.py` y comprueba a qué carpeta apunta. Quítalo después.
> 3. Con el servidor en marcha, visita `http://127.0.0.1:8000/admin/`. Todavía no puedes entrar, pero fíjate en que esa dirección funciona y sale de la única línea que hay en `urlpatterns`.
> 4. Comenta esa línea de `urlpatterns`, recarga `/admin/` y mira qué página sale ahora. Descoméntala.
> 5. Ejecuta `python manage.py migrate`, comprueba que ha aparecido `db.sqlite3` y ábrelo con el módulo `sqlite3` para listar sus tablas. Reconocerás los nombres de las aplicaciones que vienen puestas.
> 6. Renombra la carpeta de fuera y comprueba que todo sigue funcionando. Después intenta renombrar la de dentro y observa qué se rompe y qué ficheros habría que tocar para arreglarlo.
