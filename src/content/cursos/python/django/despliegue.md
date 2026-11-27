---
titulo: "Despliegue"
resumen: "Quién sirve los estáticos, cuántos procesos hacen falta y cuánta memoria comen, y las cuatro cosas que hay que hacer en cada actualización."
minutos: 17
orden: 43
---

Desplegar es la parte del desarrollo web que más veces se explica mal, porque casi siempre se explica como una receta para un alojamiento concreto. Esta lección va por el otro lado: qué piezas hacen falta y qué hace cada una, que es lo que te permite entender la receta de cualquier sitio.

Y cierra la deuda de la lección 20, que dejó anunciado que quien sirve los ficheros estáticos en producción es otra cosa.

> [!objetivo] Qué vas a aprender
>
> Entender por qué `runserver` no vale, montar la cadena de servidor web y servidor de aplicación, servir los estáticos con WhiteNoise y medir lo que hace, elegir el número de procesos, y saber qué pasos lleva cada actualización.

## Por qué `runserver` no vale

Django lo dice en cada arranque, y tiene razones concretas:

```salida
WARNING: This is a development server. Do not use it in a production setting.
```

**No está probado contra ataques.** Está escrito para ser cómodo, no para estar expuesto.

**Es de un solo proceso.** Una petición lenta bloquea a las demás.

**Recarga al cambiar ficheros**, que en producción es un desperdicio y un riesgo.

**Sirve los estáticos a mano**, y solo con `DEBUG=True`, que es lo que se midió en la lección 20.

Lo que sustituye a `runserver` no es una cosa, son dos.

## Las dos piezas

```salida
Internet  →  servidor web  →  servidor de aplicación  →  Django
             (nginx)          (Gunicorn)
```

**El servidor de aplicación** ejecuta tu código Python. Habla WSGI, que es la interfaz que define `wsgi.py` desde la lección 4. Los habituales son Gunicorn y uWSGI; para ASGI, Uvicorn.

**El servidor web** está delante y se ocupa de lo que no es tu código: el certificado de HTTPS, los ficheros estáticos, la compresión, los límites de tamaño, aguantar conexiones lentas. El habitual es nginx.

La pregunta razonable es por qué dos. Porque son buenos en cosas distintas: un proceso de Python ocupado mandando una imagen es un proceso que no atiende peticiones, y nginx hace eso con una fracción de los recursos.

La respuesta moderna, en cambio, es que **para muchos proyectos con uno basta**, porque los estáticos se pueden servir desde dentro y el HTTPS lo pone el alojamiento. Eso es WhiteNoise, y es lo que viene ahora.

## Gunicorn

```bash
pip install gunicorn
DJANGO_SETTINGS_MODULE=cfg.ajustes.produccion gunicorn cfg.wsgi:application -b 127.0.0.1:8000 -w 3
```

```salida
[INFO] Starting gunicorn 26.2.0
[INFO] Listening at: http://127.0.0.1:8099 (10846)
[INFO] Using worker: sync
[INFO] Booting worker with pid: 10848
[INFO] Booting worker with pid: 10850
[INFO] Booting worker with pid: 10851
```

Un proceso maestro y tres trabajadores. El maestro no atiende peticiones: reparte, y **si un trabajador muere, levanta otro**. Esa es la diferencia principal con `runserver`.

Ese `cfg.wsgi:application` es el módulo y el objeto: el mismo `application` que `startproject` dejó escrito y que no habíamos usado para nada.

> [!aviso] El fichero que se olvida al partir los ajustes
>
> ```python title="cfg/wsgi.py"
> os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfg.settings')
> ```
>
> Después de la reorganización de la lección 40, ese nombre **ya no existe**. Y `wsgi.py` es el que usa el servidor de verdad, no `manage.py`.
>
> Lo que pasa: cambias `manage.py`, pruebas en local, todo bien, despliegas, y el servidor arranca con los ajustes de desarrollo o directamente no arranca. Hay que cambiar los dos, y `asgi.py` también.
>
> Como el `setdefault` respeta lo que ya esté puesto, exportar la variable en el servicio también sirve, y es más explícito.

## Los estáticos, por fin

La lección 20 dejó `collectstatic` explicado y la pregunta abierta. La respuesta más práctica hoy es WhiteNoise, que sirve los estáticos **desde dentro de la aplicación**, con las cabeceras correctas:

```python title="cfg/ajustes/produccion.py"
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # justo después
    # ...
]

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
```

El orden importa: va **inmediatamente después** del middleware de seguridad y antes de todo lo demás, para que una petición de un fichero no atraviese sesiones, autenticación y mensajes para nada.

```bash
python manage.py collectstatic --noinput --settings=cfg.ajustes.produccion
```

```salida
132 static files copied to '/private/tmp/m2/estaticos_prod', 392 post-processed.
```

Los ciento treinta y dos son casi todos del panel de administración. Los trescientos noventa y dos procesados son porque de cada uno deja varias versiones:

```salida
estilo.css
estilo.9dcfc804e470.css
estilo.9dcfc804e470.css.gz
```

Y ahora lo que importa, que son las cabeceras con las que se sirven:

```salida
con huella:   Cache-Control: max-age=315360000, public, immutable
sin huella:   Cache-Control: max-age=60, public
```

**Diez años contra un minuto.** Esa es toda la idea del `ManifestStaticFilesStorage` de la lección 20: como la huella cambia cuando cambia el contenido, el fichero se puede guardar para siempre, y al cambiarlo el `{% static %}` genera otro nombre. El navegador no vuelve a pedirlo nunca.

Y la compresión:

```salida
pidiendo gzip:      Content-Length: 5504   Content-Encoding: gzip
sin comprimir:      Content-Length: 24733
```

Cuatro veces y media menos, y **sin comprimir en cada petición**, porque el `.gz` ya estaba hecho desde `collectstatic`. Eso es lo que hace que esto sea razonable dentro de Python.

> [!aviso] WhiteNoise no sirve los ficheros subidos
>
> ```salida
> /media/foto.jpg -> 404
> ```
>
> Es la confusión de la lección 29 con consecuencias. WhiteNoise sirve **estáticos**: lo que está en `STATIC_ROOT` después de `collectstatic`, o sea, tu CSS, tu JavaScript, tus imágenes de diseño. Cosas que vienen del repositorio y que no cambian entre despliegues.
>
> Lo que suben los usuarios va en `MEDIA_ROOT`, no pasa por `collectstatic` y **no lo sirve nadie** hasta que lo montes.
>
> Las tres salidas: un almacenamiento externo, que es lo que recomendaba la lección 29 y lo que hay que hacer cuando hay más de un servidor; nginx sirviendo esa carpeta; o una vista propia, que es lo único que sirve cuando los ficheros no deben ser públicos.
>
> Y el argumento de seguridad de la lección 42 sigue en pie: los ficheros subidos, desde otro dominio.

## Cuántos procesos

La regla que se repite es `2 × núcleos + 1`:

```salida
cpu_count: 8  ->  2n+1 = 17
```

Y la regla sola es mala consejera, porque cada proceso es una copia entera de tu aplicación:

```salida
PID     RSS(KB)
11043   30704    (maestro)
11045   50336
11046   48848
```

**Unos 48 MB por trabajador**, y eso con un proyecto pequeño. Diecisiete trabajadores serían más de 800 MB, que es más de lo que tienen muchos servidores pequeños.

Lo sensato es empezar por dos o tres, mirar la memoria y el tiempo de respuesta, y subir. Y tener presente de qué depende: si tus vistas se pasan el tiempo esperando a la base de datos —que es lo normal—, más procesos ayudan aunque haya pocos núcleos; si calculan, no.

Dos opciones de Gunicorn que conviene poner desde el principio:

```bash
gunicorn cfg.wsgi:application --timeout 30 --max-requests 1000 --max-requests-jitter 50
```

`--timeout` mata al trabajador que lleve treinta segundos con una petición, que es la defensa contra que una consulta atascada se lleve por delante un proceso para siempre. `--max-requests` lo recicla cada mil peticiones, que es la manera poco elegante y muy eficaz de que una fuga de memoria no tumbe el servidor; el `jitter` evita que se reciclen todos a la vez.

## Que siga levantado

Un `gunicorn` lanzado a mano se muere al cerrar la sesión y no vuelve al reiniciar. Eso lo resuelve el sistema de servicios, que en Linux es systemd:

```ini title="/etc/systemd/system/agenda.service"
[Unit]
Description=Agenda
After=network.target

[Service]
User=agenda
WorkingDirectory=/srv/agenda
EnvironmentFile=/srv/agenda/.env
ExecStart=/srv/agenda/.venv/bin/gunicorn cfg.wsgi:application --bind unix:/run/agenda.sock --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```

Tres líneas que merecen atención. `User=agenda` es un usuario sin privilegios: **la aplicación no corre como root**, y así un fallo no compromete la máquina. `EnvironmentFile` es donde entran los secretos de la lección 40, en un fichero que solo ese usuario puede leer. Y `Restart=always` es lo que hace que un fallo no deje el sitio caído.

En los alojamientos modernos nada de esto se escribe: se declara el comando y ellos ponen el resto. El concepto es el mismo.

## Cada actualización

Cuatro pasos, en este orden:

```bash
export DJANGO_SETTINGS_MODULE=cfg.ajustes.produccion

pip install -r requirements.txt      # 1. dependencias
python manage.py migrate             # 2. base de datos
python manage.py collectstatic       # 3. estáticos
systemctl restart agenda             # 4. reiniciar
```

Es un guion de cuatro líneas y hay que escribirlo, porque lo que se hace a mano se olvida. Y los dos olvidos típicos: sin el tercero, la página sale sin estilos con el `ManifestStaticFilesStorage` quejándose de un fichero que no está en el manifiesto; sin el cuarto, **el código sigue siendo el viejo**, porque los procesos ya tenían todo cargado en memoria.

La primera línea no es decorativa. La lección 40 dejó `manage.py` apuntando a los ajustes de desarrollo con un `setdefault`, precisamente para que en el servidor baste con exportar la variable. Sin ella, **estos comandos migran la base de datos de desarrollo**: el servicio de `systemd` tiene su propio entorno y no comparte nada con la sesión desde la que escribes.

Lo de las migraciones tiene un matiz que se descubre tarde. Entre el paso 2 y el 4 hay unos segundos en que la base de datos ya está cambiada y el código todavía no. Si la migración borra una columna que el código viejo lee, esos segundos son errores. Por eso los cambios que quitan cosas se hacen **en dos despliegues**: primero se deja de usar la columna, y en el siguiente se borra.

> [!consejo] Dónde desplegar
>
> | Opción | Qué pones tú |
> | --- | --- |
> | Plataforma gestionada | Nada de servidor; declaras el comando y las variables |
> | Contenedor | El `Dockerfile`; la plataforma pone lo demás |
> | Servidor propio | Todo: sistema, nginx, certificado, systemd, copias |
>
> El orden de la tabla es también el orden de dificultad y el inverso del coste. Para un proyecto que empieza, **la primera opción es casi siempre la correcta**, y cambiar después no es difícil.
>
> Lo que no cambia sea cual sea la opción: que los ajustes se leen del entorno, que hay que lanzar las migraciones y los estáticos, y que `DEBUG` va en `False`. Por eso las lecciones 40 y 42 son las importantes y esta es la fácil.
>
> Si el camino es el contenedor, tres cosas que se hacen mal a menudo: usar una imagen `slim`, no copiar el `.env` dentro de la imagen, y no ejecutar como root.

> [!nota] Cuando está desplegado, empieza lo otro
>
> ```salida
> Host: malo.es -> 400
> 404 sin DEBUG  -> 179 bytes
> ```
>
> Las dos cosas funcionando: los dominios permitidos de la lección 40 rechazan lo que no reconocen, y la página de error no cuenta nada, que es la lección 42.
>
> Y a partir de ahí hay tres cosas que hay que montar y que no son opcionales:
>
> **Saber cuándo falla algo.** Sin eso, te enteras porque alguien te lo dice. Lo mínimo es que los errores lleguen a un correo, con `ADMINS` y el `SERVER_EMAIL` de la lección 38; lo cómodo es un servicio de seguimiento de errores, que agrupa los repetidos y da la traza entera.
>
> **Copias de seguridad probadas.** Automáticas, fuera de esa máquina, y restauradas alguna vez. Y acuérdate de que los ficheros subidos no están en la base de datos.
>
> **Registros que se puedan leer.** Configurar `LOGGING` para que los errores de Django vayan a un sitio y no a la nada, que es donde van por defecto en producción.
>
> Y lo aburrido que más importa: **actualizar**. Django, las dependencias y el sistema. Es lo que la lección 42 ponía al final de la lista, y es la causa más común de un sitio comprometido.

> [!resumen] En resumen
>
> El servidor de desarrollo no sirve porque no está probado contra ataques, es de un solo proceso, recarga al cambiar ficheros y solo sirve los estáticos con la depuración activada. Lo sustituyen dos piezas: un servidor de aplicación que ejecuta tu código a través de la interfaz que define `wsgi.py`, con un proceso maestro que reparte y levanta a los trabajadores que mueren, y un servidor web delante que se ocupa del certificado, los ficheros y las conexiones lentas; para muchos proyectos basta con el primero. Al partir los ajustes hay que acordarse de `wsgi.py`, que es el que lee el servidor de verdad y no `manage.py`. Los estáticos se sirven con WhiteNoise, que los entrega comprimidos de antemano, cuatro veces y media más pequeños, y con diez años de caché si llevan huella frente a un minuto si no, pero no sirve los ficheros subidos, que necesitan su propia solución. El número de procesos no sale de la regla habitual sin mirar la memoria, porque cada uno ocupa unos cuarenta y ocho megas, y conviene poner un tope de tiempo por petición y reciclarlos cada cierto número. El servicio del sistema se encarga de que siga levantado, con un usuario sin privilegios y los secretos en un fichero aparte. Y cada actualización son cuatro pasos en orden, de los que se olvidan el de los estáticos, que deja la página sin estilos, y el reinicio, sin el cual el código sigue siendo el viejo.

> [!ejercicio] Practica
>
> 1. Arranca tu proyecto con Gunicorn y tres trabajadores, y mira los procesos que aparecen.
> 2. Cambia los ajustes a los de producción sin tocar `wsgi.py` y comprueba qué pasa.
> 3. Instala WhiteNoise, lanza `collectstatic` y mira cuántos ficheros deja y con qué nombres.
> 4. Compara las cabeceras de caché de un fichero con huella y de uno sin ella.
> 5. Pide un fichero con y sin `Accept-Encoding: gzip` y compara los tamaños.
> 6. Sube un fichero por el formulario y comprueba que en producción devuelve `404`. Arréglalo.
> 7. Mide la memoria de cada trabajador y calcula cuántos caben en un servidor de un giga.
> 8. Pon el tope de tiempo en dos segundos y haz una vista que duerma cinco. Mira el registro.
> 9. Escribe el guion de despliegue con los cuatro pasos y pruébalo entero.
> 10. Haz una petición con un dominio que no esté permitido y comprueba el `400`.
