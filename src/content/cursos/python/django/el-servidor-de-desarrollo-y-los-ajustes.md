---
titulo: "El servidor de desarrollo y los ajustes"
resumen: "Qué te está diciendo runserver cada vez que arranca, y los cinco ajustes que se cambian el primer día."
minutos: 14
orden: 5
---

`runserver` es la orden que más veces vas a escribir en este módulo, y al arrancar imprime diez líneas que casi nadie lee. Merece la pena leerlas una vez despacio, porque cuatro de ellas son avisos y una de ellas es un aviso serio.

Después, los ajustes. `settings.py` trae unas veinte variables y la mayoría están bien como están. Hay cinco que se tocan el primer día de cualquier proyecto y dos que tienen efectos que sorprenden.

> [!objetivo] Qué vas a aprender
>
> Entender línea a línea lo que dice `runserver` al arrancar, saber cambiarle el puerto y cuándo hay que desactivar la recarga automática, conocer los ajustes que se cambian al empezar un proyecto, entender qué hace `DEBUG` de verdad y por qué no vale para producción, y saber consultar los ajustes efectivos sin abrir el fichero.

## Lo que dice al arrancar

```bash
python manage.py runserver
```

```salida
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).

You have 18 unapplied migration(s). Your project may not work properly until you apply
the migrations for app(s): admin, auth, contenttypes, sessions.
Run 'python manage.py migrate' to apply them.
September 22, 2026 - 18:08:35
Django version 6.1.1, using settings 'agenda.settings'
Starting WSGI development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.

WARNING: This is a development server. Do not use it in a production setting.
```

Por orden:

**`Watching for file changes with StatReloader`.** El servidor vigila tus ficheros y se reinicia solo cuando guardas. Eso significa que no hay que pararlo y arrancarlo a cada cambio, y es de las cosas que más se agradecen. Cuando ocurre, lo dice:

```salida
/tmp/agenda/agenda/urls.py changed, reloading.
Watching for file changes with StatReloader
```

`StatReloader` es cómo lo hace: mirando la fecha de modificación de cada fichero, una y otra vez. Hay otra manera más eficiente que le pide los avisos al sistema operativo, y se activa sola si instalas el paquete `watchdog`. Con un proyecto de este tamaño no se nota.

**`Performing system checks`** y el resultado. Django repasa el proyecto antes de arrancar buscando incoherencias: un modelo mal definido, un ajuste que se contradice con otro, una aplicación que falta. Es la misma comprobación que hace `python manage.py check` por su cuenta. Que diga `no issues` es lo que quieres ver.

**El aviso de las migraciones.** Django trae cuatro aplicaciones puestas de fábrica y esas aplicaciones tienen tablas. Aún no existen. Se arregla con `python manage.py migrate` y el aviso desaparece; la lección 10 explica qué son esas dieciocho migraciones.

**La fecha, la versión y el fichero de ajustes.** Esa tercera parte es más útil de lo que parece: `using settings 'agenda.settings'` te dice **qué ajustes se han cargado de verdad**, y cuando tengas varios ficheros de configuración será lo primero que mires al ver comportamientos raros.

**`Starting WSGI development server`.** Como se vio en la lección anterior, `runserver` usa `wsgi.py`.

**El aviso de producción.** Este es el serio, y no es una fórmula legal. El servidor de desarrollo atiende las peticiones de una en una, no cifra nada, sirve ficheros sin ninguna caché y nadie ha auditado su seguridad porque no está pensado para eso. Es para ti y para tus cuatro peticiones de prueba. Quien lo ha dejado en un servidor público se ha arrepentido.

## Cambiarle el puerto y la dirección

Por defecto escucha en `127.0.0.1:8000`. Para cambiar el puerto, se le pasa y ya está:

```bash
python manage.py runserver 8001
```

Esa dirección `127.0.0.1` significa "solo esta máquina": desde tu móvil, aunque esté en la misma red, no se ve. Para probar en el móvil o en otro ordenador:

```bash
python manage.py runserver 0.0.0.0:8000
```

`0.0.0.0` es "escucha en todas las direcciones de red que tenga esta máquina". Después hay que buscar la IP local del ordenador y visitar `http://192.168.1.x:8000` desde el otro aparato. Con `DEBUG = True` hay que añadir además esa IP a `ALLOWED_HOSTS`, que es el ajuste del que se habla más abajo.

Y una opción que se usa poco pero desatasca:

```bash
python manage.py runserver --noreload
```

Desactiva la recarga automática. Sirve para dos cosas: cuando el reinicio constante estorba, y sobre todo **cuando estás depurando**. La recarga funciona lanzando un segundo proceso, y eso confunde a algunos depuradores y hace que cualquier `print` o punto de interrupción se comporte de forma rara. Si algo no cuadra al depurar, quita la recarga antes de volverte loco.

> [!error] `That port is already in use`
>
> Pasa constantemente: cerraste la terminal sin parar el servidor, o dejaste otro arrancado en otra pestaña. El proceso sigue vivo y con el puerto cogido.
>
> Lo rápido es usar otro puerto. Lo correcto es cerrar el que sobra:
>
> ```bash
> lsof -ti :8000 | xargs kill      # macOS y Linux
> netstat -ano | findstr :8000     # Windows: da el PID, y luego taskkill /PID xxxx /F
> ```

## Los ajustes que se cambian el primer día

### `LANGUAGE_CODE` y `TIME_ZONE`

Vienen en inglés y en UTC:

```python
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
```

Para el curso:

```python
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'Europe/Madrid'
```

`LANGUAGE_CODE` hace más de lo que parece. Traduce el panel de administración entero, los mensajes de error de todos los formularios, los nombres de los meses y los días, y el formato de las fechas. Se nota de inmediato: con `es-es`, la página del cohete pasa a decir `¡La instalación funcionó con éxito! ¡Felicitaciones!`. Esas traducciones vienen dentro de Django, no hay que instalar nada.

`TIME_ZONE` tiene un efecto que despista la primera vez. Mira el registro del servidor de una máquina cuya hora local son las 10:08:

```salida
[22/Sep/2026 18:08:41] "GET / HTTP/1.1" 200 12201
```

Las 18:08. No es un error: **las horas que imprime Django siguen `TIME_ZONE`, no la hora de tu ordenador**. Con `Europe/Madrid` puesto en una máquina que está en otro huso, el registro va en hora de Madrid. Es lo correcto —así todos los registros de un proyecto son comparables aunque el equipo esté repartido—, pero conviene saberlo antes de pasar media hora buscando por qué las horas no cuadran.

> [!nota] `USE_TZ = True` y lo que significa de verdad
>
> Debajo hay otro ajuste que viene activado:
>
> ```python
> USE_TZ = True
> ```
>
> Con esto, Django **guarda todas las fechas en la base de datos en UTC**, siempre, pase lo que pase con `TIME_ZONE`, y las convierte al huso configurado solo al enseñarlas. Es lo que hay que hacer y por eso viene puesto: los husos cambian con los cambios de hora, y una fecha guardada en hora local es una fecha que puede ser ambigua dos veces al año.
>
> La consecuencia práctica aparece en la lección de tipos de campo, y es que no se mezclan fechas con huso y fechas sin huso. En tu código se usa `django.utils.timezone.now()` y no `datetime.now()`. La segunda devuelve una fecha sin huso, y al guardarla salta un aviso o un error según el caso.

### `ALLOWED_HOSTS`

Viene vacío:

```python
ALLOWED_HOSTS = []
```

Es la lista de dominios por los que tu proyecto acepta que le llamen. Django mira la cabecera `Host` de cada petición —la de la lección 2— y si no está en la lista, rechaza. Sirve contra un ataque en el que alguien manda un `Host` falso para que los enlaces que tu web genera, como el de recuperar la contraseña, apunten a su servidor.

Con `DEBUG = True` la lista vacía se comporta como si tuviera `localhost` y `127.0.0.1`, y por eso no molesta mientras desarrollas.

> [!aviso] Con `DEBUG = False`, el servidor ni arranca
>
> Es lo primero que se rompe al preparar el proyecto para producción, y en Django 6.1 falla de forma tajante:
>
> ```salida
> CommandError: You must set settings.ALLOWED_HOSTS if DEBUG is False.
> ```
>
> No arranca. No es que conteste mal a las peticiones: se niega a empezar. La solución es poner los dominios de verdad:
>
> ```python
> ALLOWED_HOSTS = ['agenda.ejemplo.es', 'www.agenda.ejemplo.es']
> ```
>
> Y no, `ALLOWED_HOSTS = ['*']` no es la solución, aunque sea lo primero que aparece al buscar el error. Eso acepta cualquier `Host` y desactiva exactamente la protección que se está configurando.

### `DEBUG`

El ajuste con más consecuencias del fichero:

```python
DEBUG = True
```

Con `True`, Django cambia de comportamiento en cuatro sitios:

- Al saltar una excepción, en vez de una página neutra sale **la página amarilla** con la traza completa, el código alrededor de la línea que ha fallado, las variables locales de cada marco, la petición entera y todos los ajustes.
- Un `404` enseña la lista de patrones de URL que ha probado y ninguno ha encajado.
- **Django guarda en memoria todas las consultas SQL que hace**, para que puedas mirarlas.
- El servidor sirve los ficheros estáticos por su cuenta, cosa que en producción hace otro programa.

Los cuatro son magníficos para desarrollar y los cuatro son motivos para no dejarlo puesto. La página de error revela rutas de tu máquina, versiones, la estructura de la base de datos y, muy a menudo, el valor de variables que traen datos de alguien. Y esa lista de consultas que se guarda en memoria **no se vacía**, así que un proceso que lleva días atendiendo peticiones acaba comiéndose la memoria de la máquina.

Cambiar `DEBUG` a `False` rompe cosas a propósito, y por eso no se hace a mano el día del despliegue, sino que se prepara con antelación. Ese es el contenido de la lección 40.

### `SECRET_KEY`

Ya salió en la lección anterior: viene escrita en el fichero con un prefijo que avisa de que es insegura. Hasta la lección 40 se deja como está.

## Ver los ajustes efectivos

Los veinte del fichero no son todos los que hay. Django tiene más de un centenar con valores por defecto que no aparecen en `settings.py`, y eso plantea una pregunta práctica: qué valor tiene de verdad un ajuste ahora mismo. Hay una orden para eso:

```bash
python manage.py diffsettings
```

```salida
DEBUG = True
INSTALLED_APPS = ['django.contrib.admin', 'django.contrib.auth', ...]
MAILERS = {'default': {'BACKEND': 'django.core.mail.backends.console.EmailBackend'}}  ###
ROOT_URLCONF = 'agenda.urls'  ###
TIME_ZONE = 'Europe/Madrid'
```

Enseña solo lo que se aparta de los valores por defecto de Django, que es justo lo que interesa, y marca con `###` los que no existen en los valores por defecto. Es la forma rápida de contestar a "¿se ha cargado el fichero de ajustes que yo creo?" sin ponerse a poner `print`.

Fíjate en `DATABASES` si lo ejecutas entero: en el fichero tiene dos claves y aquí salen quince. Las otras trece las ha rellenado Django, y verlas ayuda a entender que un ajuste que tú escribes corto se completa por debajo.

> [!consejo] Los ajustes también se ven desde el intérprete
>
> La otra forma, que sirve para uno concreto:
>
> ```bash
> python manage.py shell
> ```
>
> ```consola
> >>> from django.conf import settings
> >>> settings.TIME_ZONE
> 'Europe/Madrid'
> >>> settings.DEBUG
> True
> ```
>
> `django.conf.settings` no es tu fichero: es el objeto que junta tus ajustes con los valores por defecto. Se importa siempre así, y **nunca se importa `agenda.settings` directamente**, porque eso se salta los valores por defecto y todo lo que Django calcula al arrancar. Esa regla vale también para tu propio código.

> [!resumen] En resumen
>
> `runserver` imprime diez líneas al arrancar y todas dicen algo: que vigila los ficheros y se reinicia solo al guardar, que ha repasado el proyecto en busca de incoherencias, que hay migraciones sin aplicar, qué fichero de ajustes ha cargado de verdad, y que no se use en producción, que es el único aviso serio. El puerto se cambia pasándolo como argumento, `0.0.0.0` hace que el servidor se vea desde otros aparatos de la red, y `--noreload` es lo que hay que poner cuando la recarga automática estorba al depurar. De los ajustes, los que se cambian el primer día son el idioma y la zona horaria, que traducen el panel de administración y los errores de los formularios y hacen que las horas del registro sigan a `TIME_ZONE` en vez de a la hora del ordenador; `USE_TZ`, que ya viene activado y guarda todas las fechas en UTC; y `ALLOWED_HOSTS`, que con `DEBUG = False` deja de ser opcional hasta el punto de que el servidor se niega a arrancar sin él. `DEBUG` es el ajuste con más consecuencias: enseña la página amarilla con la traza, revela los patrones de URL, guarda en memoria todas las consultas SQL y sirve los ficheros estáticos, y los cuatro comportamientos son razones para no dejarlo activado fuera de tu máquina. Para saber qué ajustes están puestos de verdad están `diffsettings` y `django.conf.settings`, que es siempre la forma correcta de leerlos desde el código.

> [!ejercicio] Practica
>
> 1. Arranca el servidor y lee las diez líneas. Después ejecuta `migrate` y arranca otra vez: comprueba qué aviso ha desaparecido.
> 2. Cambia `LANGUAGE_CODE` a `es-es` y recarga la página del cohete. Después pon `fr-fr` y vuelve a mirarla. No hay que instalar nada para que eso funcione.
> 3. Pon `TIME_ZONE = 'Europe/Madrid'`, haz un par de peticiones y compara la hora del registro con la de tu reloj. Si vives en España, prueba con `Pacific/Auckland` para que la diferencia se vea.
> 4. Arranca con `0.0.0.0:8000`, averigua la IP local de tu máquina y abre la web desde el móvil. Si te da un error de `Host`, arréglalo con `ALLOWED_HOSTS`.
> 5. Pon `DEBUG = False` y arranca. Lee el error, arréglalo con `ALLOWED_HOSTS` y visita una dirección que no exista para ver el `404` sin detalles. Deja `DEBUG` en `True` al terminar.
> 6. Ejecuta `diffsettings` entero y busca `DATABASES`. Cuenta cuántas claves tiene ahí frente a las que hay escritas en `settings.py`.
