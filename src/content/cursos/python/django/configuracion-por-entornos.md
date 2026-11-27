---
titulo: "Configuración por entornos"
resumen: "La clave secreta que está en el repositorio de medio internet, partir los ajustes en tres ficheros, y el `check --deploy` que dice ocho cosas."
minutos: 15
orden: 40
---

Hay un fichero de este proyecto que lleva desde la lección 4 con un problema a la vista, y con un comentario de Django avisando:

```python title="cfg/settings.py"
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-#y$m&pphoplwy&m+6x)i$wkiq-v&73))1658kb)j==c69666@5'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []
```

Tres ajustes, y los tres tienen que valer una cosa en tu portátil y otra en el servidor. Mientras hay un solo `settings.py`, eso solo se puede resolver cambiándolo a mano antes de desplegar, que es exactamente como se despliega con `DEBUG = True` puesto.

> [!objetivo] Qué vas a aprender
>
> Sacar los secretos del código con variables de entorno, partir los ajustes en base, desarrollo y producción, elegir el módulo de ajustes al arrancar, usar un fichero `.env` en local, y leer lo que dice `check --deploy`.

## `check --deploy`

Antes de arreglar nada, conviene ver el diagnóstico. Django lo trae hecho:

```bash
python manage.py check --deploy
```

```salida
ERRORS:
?: (mail.E001) Your MAILERS setting uses a development-only email backend
   in the 'default' entry (django.core.mail.backends.console.EmailBackend).

WARNINGS:
?: (security.W004) You have not set a value for the SECURE_HSTS_SECONDS setting...
?: (security.W008) Your SECURE_SSL_REDIRECT setting is not set to True...
?: (security.W009) Your SECRET_KEY has less than 50 characters, less than 5
   unique characters, or it's prefixed with 'django-insecure-'...
?: (security.W012) SESSION_COOKIE_SECURE is not set to True...
?: (security.W016) ... you have not set CSRF_COOKIE_SECURE to True...
?: (security.W018) You should not have DEBUG set to True in deployment.
?: (security.W020) ALLOWED_HOSTS must not be empty in deployment.

System check identified 8 issues (0 silenced).
```

Ocho avisos sobre un proyecto recién creado, y cada uno señala algo real. Es la lista de tareas de esta lección y de la 42, y la orden es sencilla: **antes de desplegar, esto tiene que salir limpio.**

Fíjate en que el primero es un **error**, no un aviso, y es nuevo de Django 6.1: como ahora `startproject` deja el correo de consola configurado, la comprobación se asegura de que nadie lo deje así en producción, donde significaría que los correos no salen. Antes eso no se podía detectar.

Lo que hace `--deploy` es activar comprobaciones que están apagadas en desarrollo, porque quejarse de `DEBUG = True` mientras desarrollas no tendría sentido.

## Las variables de entorno

La regla es la de siempre: **lo que cambia según la máquina, y lo que es secreto, no va en el código.** Va en el entorno, y el código lo lee.

```python
import os

SECRET_KEY = os.environ.get('CLAVE_SECRETA', 'insegura-solo-para-desarrollo')
```

Esto resuelve el problema de raíz. La clave de producción **nunca existe en el repositorio**: vive en las variables de entorno del servidor, y el código solo sabe cómo se llama.

Para generar una, Django trae la misma función que usa `startproject`:

```python
from django.core.management.utils import get_random_secret_key
```

```salida
8*q+e97=)^3xlb%z$^q%yd%lktm*(abdy%^=-v9)_54!9&89@a
longitud: 50
```

Y una advertencia sobre esa clave, porque no es solo "un secreto más": de ella salen las firmas de las sesiones, los testigos de recuperación de contraseña de la lección 38 y los testigos CSRF. **Quien la tenga puede entrar como cualquier usuario.** Por eso `--deploy` se queja hasta de que sea corta.

> [!aviso] Las tres trampas de leer variables de entorno
>
> **Todo es texto, y todo el texto es verdadero.**
>
> ```salida
> os.environ['DEBUG'] -> 'False'
> bool('False')       -> True
> ```
>
> `DEBUG = bool(os.environ.get('DEBUG'))` deja `DEBUG` activado con la variable puesta a `False`, que es la peor manera posible de equivocarse. Lo que hay que escribir es una comparación:
>
> ```python
> DEBUG = os.environ.get('DEBUG', '') == '1'
> ```
>
> **`get` con valor por defecto oculta lo que falta.** Para un secreto de producción, eso es justo lo que no quieres:
>
> ```salida
> os.environ.get('NO_EXISTE')  ->  None
> os.environ['NO_EXISTE']      ->  KeyError: 'NO_EXISTE'
> ```
>
> En producción se usan los corchetes, para que **el proyecto no arranque** si falta el secreto. Arrancar con un valor por defecto es lo que produce un sitio en producción firmando con la clave de ejemplo.
>
> **Una lista vacía partida no es una lista vacía.** Este es el que menos se ve:
>
> ```python
> ALLOWED_HOSTS = os.environ.get('HOSTS_PERMITIDOS', '').split(',')
> ```
>
> Sin la variable puesta, eso no da `[]`, da `['']`. Y como no está vacía, la comprobación `W020` no se queja, pero no coincide con ningún dominio: el sitio devuelve `400` a todo. Se arregla filtrando lo vacío.

## Partir los ajustes

Un fichero con tres `if` dentro se vuelve ilegible enseguida. Lo que se hace es un paquete:

```salida
cfg/
  ajustes/
    __init__.py
    base.py         lo común
    desarrollo.py   lo de tu portátil
    produccion.py   lo del servidor
```

`base.py` es el `settings.py` de siempre, con una corrección importante: como ha bajado un nivel, `BASE_DIR` tiene que subir uno más.

```python title="cfg/ajustes/base.py"
BASE_DIR = Path(__file__).resolve().parent.parent.parent
```

Olvidarse de eso es el fallo número uno de esta reorganización, y no da error: deja la base de datos, los estáticos y los ficheros subidos **una carpeta más adentro de donde deberían**, y te enteras cuando algo no aparece.

```python title="cfg/ajustes/desarrollo.py"
from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
INSTALLED_APPS += ['django.contrib.humanize']
```

```python title="cfg/ajustes/produccion.py"
import os

from .base import *  # noqa: F403

DEBUG = False
SECRET_KEY = os.environ['CLAVE_SECRETA']
ALLOWED_HOSTS = [h for h in os.environ.get('HOSTS_PERMITIDOS', '').split(',') if h]

MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'OPTIONS': {'host': os.environ['SMTP_HOST'], 'timeout': 10},
    },
}

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
STATIC_ROOT = BASE_DIR / 'estaticos_recogidos'
```

```salida
desarrollo:                      System check identified no issues.
producción, sin CLAVE_SECRETA:   KeyError: 'CLAVE_SECRETA'
producción, con todo puesto:     System check identified no issues (0 silenced).
```

Los ocho avisos de `--deploy`, a cero. Y el `KeyError` del medio es un acierto, no un fallo: **el proyecto se niega a arrancar sin el secreto**, en lugar de arrancar mal.

Ese `import *`, que en cualquier otro sitio sería mala idea, aquí es la convención y tiene sentido, porque un módulo de ajustes no es código normal: es una lista de nombres en mayúsculas que Django va a leer. El único detalle a recordar es que `import *` **no trae los nombres que empiezan por guion bajo**, así que los auxiliares que no quieras propagar se nombran así.

## Elegir el módulo

Hay dos sitios donde se decide, y conviene entender la diferencia.

En `manage.py`, que es lo que usas a diario:

```python title="manage.py"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfg.ajustes.desarrollo')
```

Ese `setdefault` es la clave: **solo pone el valor si no estaba**. Así, en el servidor basta con exportar la variable y `manage.py` la respeta.

```bash
DJANGO_SETTINGS_MODULE=cfg.ajustes.produccion python manage.py migrate
python manage.py check --settings=cfg.ajustes.produccion
```

Y en `wsgi.py` y `asgi.py`, que son los que usa el servidor de verdad. Es la parte que se olvida: se cambia `manage.py`, se prueba, y en producción el servidor sigue cargando los ajustes de desarrollo **porque nadie tocó `wsgi.py`**. Es la lección 43.

> [!consejo] El fichero `.env`
>
> Exportar seis variables a mano en cada terminal es insufrible, así que en local se usa un fichero:
>
> ```bash title=".env"
> CLAVE_SECRETA=de-fichero-env
> HOSTS_PERMITIDOS=ejemplo.es,www.ejemplo.es
> ```
>
> ```python
> from dotenv import load_dotenv
>
> load_dotenv(BASE_DIR / '.env')
> ```
>
> Dos comportamientos medidos que conviene saber:
>
> ```salida
> sin variable en la shell:  'de-fichero-env'
> con variable en la shell:  'de-la-shell'
> ```
>
> **Lo que ya está en el entorno gana.** Eso está bien pensado: el fichero es una comodidad para desarrollo, y en el servidor mandan las variables de verdad.
>
> Y lo único que no se puede olvidar:
>
> ```bash title=".gitignore"
> .env
> ```
>
> **Un `.env` subido al repositorio es peor que la clave en `settings.py`**, porque además da sensación de estar haciéndolo bien. Lo que sí se sube es un `.env.ejemplo` con los nombres y sin los valores, que sirve de documentación de qué hace falta para arrancar.
>
> Y una alternativa que se ve mucho: `django-environ`, que hace lo mismo y además convierte tipos (`env.bool`, `env.int`, `env.db`) y sabe leer una dirección de base de datos entera de una variable, que es el formato que usan casi todos los alojamientos.

> [!nota] Los tres ajustes que cambian entre entornos, y los que no
>
> Lo que va en `produccion.py`:
>
> - Lo **secreto**: la clave, las credenciales de correo y de base de datos.
> - Lo que **depende de la máquina**: los dominios permitidos, las rutas.
> - Lo que **cambia de comportamiento**: `DEBUG`, el backend de correo, la base de datos, las cookies seguras.
>
> Lo que se queda en `base.py` aunque parezca de entorno: `INSTALLED_APPS`, `MIDDLEWARE`, las plantillas, el idioma. Cuanto más se parezcan los entornos, menos sorpresas al desplegar, y cada línea que se mueve a `produccion.py` es una línea que en desarrollo nadie ejecuta nunca.
>
> Ese es el argumento de fondo: **la diferencia entre entornos es la que produce el "en mi máquina funciona"**, así que la lista de arriba debe ser lo más corta posible. Un cuarto módulo `pruebas.py` con la base de datos en memoria es lo habitual y merece la pena; media docena de módulos por variantes, no.

> [!resumen] En resumen
>
> Un proyecto recién creado tiene tres ajustes que deben valer cosas distintas en el portátil y en el servidor, y `check --deploy` los señala junto a otros cinco, incluido un error nuevo de Django 6.1 que detecta el correo de consola dejado en producción. La regla es que lo secreto y lo que depende de la máquina se lee del entorno, empezando por la clave secreta, de la que salen las firmas de sesiones, los testigos de recuperación y los CSRF. Leer variables de entorno tiene tres trampas: todo es texto y la cadena `'False'` es verdadera, el valor por defecto oculta que falta un secreto cuando lo que se quiere es que el proyecto no arranque, y partir una cadena vacía por comas da una lista con una cadena vacía dentro, que pasa las comprobaciones y no coincide con ningún dominio. Los ajustes se parten en un paquete con base, desarrollo y producción, recordando subir un nivel más el directorio base, que es el fallo silencioso de esta reorganización. El módulo se elige con una variable de entorno que `manage.py` respeta si ya está puesta, y hay que acordarse de que el servidor de verdad la lee de `wsgi.py`. En local se usa un fichero `.env`, que nunca se sube al repositorio y al que ganan las variables reales del entorno. Y conviene que la lista de diferencias entre entornos sea lo más corta posible, porque cada línea que solo se ejecuta en producción es una línea que nadie ha probado.

> [!ejercicio] Practica
>
> 1. Lanza `check --deploy` sobre tu proyecto y anota cuántos avisos salen.
> 2. Saca la clave secreta a una variable de entorno y genera una nueva con la función de Django.
> 3. Escribe `DEBUG = bool(os.environ.get('DEBUG'))`, ponla a `False` y comprueba que sigue activado. Arréglalo.
> 4. Parte los ajustes en base, desarrollo y producción. Comprueba dónde apunta `BASE_DIR` después.
> 5. Arranca con los ajustes de producción sin la variable del secreto y lee el error.
> 6. Deja los ocho avisos de `--deploy` en cero con los ajustes de producción.
> 7. Usa un `.env`, añádelo al `.gitignore` y crea el `.env.ejemplo` correspondiente.
> 8. Comprueba que una variable exportada en la terminal gana al valor del `.env`.
> 9. Añade un módulo de ajustes para las pruebas con la base de datos en memoria y lánzalas con él.
