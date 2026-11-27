---
titulo: "Ficheros estáticos"
resumen: "El CSS, las imágenes y el JavaScript, por qué no se ponen con una ruta a mano, y el día que el sitio se queda sin estilos."
minutos: 14
orden: 20
---

Las páginas que llevas son HTML pelado. Ponerles estilos parece lo más tonto del mundo: un `<link rel="stylesheet" href="/css/estilo.css">` y listo. Y sin embargo Django tiene una aplicación entera, un ajuste, una etiqueta y una orden solo para esto.

El motivo es que en desarrollo y en producción esos ficheros **no se sirven igual, ni desde el mismo sitio, ni con la misma dirección**. Django resuelve el desarrollo automáticamente y prepara el terreno para lo otro, y si escribes las rutas a mano la mudanza duele. Esta lección explica ese reparto ahora, para que el bloque F sea aburrido.

> [!objetivo] Qué vas a aprender
>
> Colocar los ficheros estáticos donde Django los encuentra, usar `{% static %}` y entender qué hace y qué no comprueba, distinguir los tres ajustes que se parecen, saber qué es `collectstatic` y por qué existe, y reconocer el momento en que la página se queda sin estilos.

## Dónde van

Igual que las plantillas, y por el mismo motivo:

```text
contactos/
  static/
    contactos/
      estilo.css
      logotipo.png
```

La carpeta se repite otra vez a propósito. Todos los ficheros estáticos del proyecto acaban mezclados en una sola carpeta, así que sin ese espacio de nombres el `estilo.css` de una aplicación pisa el de otra. Lo mismo que la lección 16, con la misma consecuencia: **gana el primero en `INSTALLED_APPS` y el otro desaparece sin avisar**.

Y funciona sin configurar nada por lo mismo: `django.contrib.staticfiles` viene en `INSTALLED_APPS` y busca una carpeta `static/` dentro de cada aplicación.

## `{% static %}`

```html title="plantillas/base.html"
{% load static %}
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>{% block titulo %}Agenda{% endblock %}</title>
  <link rel="stylesheet" href="{% static 'contactos/estilo.css' %}">
</head>
```

```salida
<link rel="stylesheet" href="/static/contactos/estilo.css">
```

Lo que devuelve es lo mismo que habrías escrito a mano, y esa es justo la pregunta: para qué.

Porque **esa dirección cambia**. El día que el sitio sirva los estáticos desde `/assets/`, desde un subdominio o desde una red de distribución, cambia el ajuste y las cien plantillas siguen valiendo. Y porque en producción los nombres de los ficheros llevan un trozo añadido, como se ve más abajo, y esa etiqueta es la que sabe cuál toca.

El `{% load static %}` va en cada plantilla que lo use. En la base también, aunque la hereden todas: el `load` no se hereda, como se vio en la lección 19.

> [!aviso] `{% static %}` no comprueba que el fichero exista
>
> ```salida
> A ruta      : /static/contactos/estilo.css
> B no existe : /static/contactos/no-existe.css
> ```
>
> La etiqueta **construye una dirección, no busca nada**. Un nombre mal escrito sale igual de contento y el fallo aparece más tarde, como un `404` en la pestaña de red del navegador y una página sin estilos.
>
> Es el mismo silencio de las plantillas de la lección 17, así que la forma de diagnosticarlo es la misma: cuando los estilos no salgan, abre las herramientas del navegador y mira si el fichero da `404`. Si lo da, el problema es el nombre o la carpeta, no el CSS.

## Los tres ajustes que se parecen

Aquí es donde se lía casi todo el mundo, porque los tres nombres se parecen y hacen cosas distintas.

| Ajuste | Qué es |
| --- | --- |
| `STATIC_URL` | El prefijo de las direcciones. Lo único que viene puesto |
| `STATICFILES_DIRS` | Carpetas de estáticos **que no son de ninguna aplicación** |
| `STATIC_ROOT` | Dónde se **copian todos juntos** para producción. Vacío en desarrollo |

```python title="agenda/settings.py"
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'estaticos']
STATIC_ROOT = BASE_DIR / 'estaticos_recogidos'
```

El reparto, en una frase cada uno. `STATICFILES_DIRS` es a los estáticos lo que `DIRS` a las plantillas: la carpeta del proyecto para lo común, el CSS del sitio entero. `STATIC_ROOT` es un destino, no un origen: **nadie pone ficheros ahí**, los pone `collectstatic`, y la carpeta va al `.gitignore`.

Confundir `STATIC_ROOT` con `STATICFILES_DIRS` y poner los ficheros dentro del primero es el error clásico, y el síntoma es que `collectstatic` se queja de que el origen y el destino son el mismo sitio.

> [!nota] Django 6.1 solo trae `STATIC_URL`
>
> Medido en el `settings.py` recién generado: de los tres, solo aparece `STATIC_URL = 'static/'`. No hay `STATICFILES_DIRS`, no hay `STATIC_ROOT`, y tampoco hay bloque `STORAGES` ni ajustes de `MEDIA`.
>
> O sea que **ninguno de los tres se puede dar por supuesto**: los añades tú cuando los necesitas, y `STATIC_ROOT` no hace falta hasta que se despliega. Por eso `collectstatic` en un proyecto recién creado dice esto:
>
> ```salida
> ImproperlyConfigured: You're using the staticfiles app without having set
> the STATIC_ROOT setting to a filesystem path.
> ```
>
> No es que algo esté roto: es que aún no le has dicho dónde quieres que copie.

## `collectstatic`

En desarrollo, Django busca los estáticos en la carpeta de cada aplicación, una por una, cuando se los piden. Eso es cómodo y lento, y un servidor de verdad no quiere hacerlo: quiere una carpeta con todo dentro y servirla sin preguntar.

```consola
python manage.py collectstatic
```

```salida
132 static files copied to '/tmp/m2/estaticos_recogidos'.
```

Ciento treinta y dos, y solo has escrito uno. Los demás son del panel de administración, que también tiene los suyos. Y ahí está la razón de ser de la orden: **recoge los estáticos de todas las aplicaciones instaladas**, las tuyas y las ajenas, en un único sitio.

Se ejecuta al desplegar, nunca en desarrollo, y el resultado no se guarda en el control de versiones porque se puede regenerar.

## El día que el sitio se queda sin estilos

Este momento le llega a todo el mundo y conviene reconocerlo de lejos. Con `DEBUG = False`:

```salida
css con DEBUG=False: 404
pagina:              200
```

La página carga, funciona, y está en blanco y negro. **`runserver` deja de servir los estáticos cuando `DEBUG` es `False`**, y lo hace a propósito: ese servidor no es para producción, como recuerda el aviso de la lección 5, y servir ficheros con él sería ineficiente e inseguro.

Lo que sirve los estáticos en producción es otra cosa: el servidor web de delante, un `WhiteNoise` dentro de la aplicación, o un servicio aparte. Es la lección 43.

Mientras tanto, la conclusión práctica es que **`DEBUG = False` en el portátil no sirve para probar el sitio**, solo para probar cosas concretas como las páginas de error. Y si pruebas eso, no te alarmes por los estilos.

> [!consejo] Los estáticos no son los ficheros subidos
>
> Dos conceptos que se confunden y que Django separa a conciencia:
>
> **Estáticos**: el CSS, el JavaScript y las imágenes del diseño. Los escribes tú, están en el repositorio, viajan con el código. Van en `static/`, con `STATIC_URL` y `STATIC_ROOT`.
>
> **Ficheros subidos (media)**: la foto que sube alguien desde un formulario. No están en el repositorio, aparecen mientras el sitio funciona, y hay que copiarlos de servidor a servidor. Van con `MEDIA_URL` y `MEDIA_ROOT`, que ni siquiera vienen en `settings.py`.
>
> La confusión es peligrosa en los dos sentidos: si sirves los subidos como estáticos, `collectstatic` puede pisarlos; y si los guardas en la carpeta de estáticos, el siguiente despliegue se los lleva por delante. Los ficheros subidos son la lección 29.

## El hash de los nombres

Falta una pieza, y es la que explica del todo por qué no se escriben las rutas a mano. Los navegadores guardan el CSS en memoria durante días, así que un cambio en los estilos no le llega a quien ya visitó el sitio.

La solución es que el nombre del fichero cambie cuando cambie su contenido:

```python title="agenda/settings.py"
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'},
}
```

```salida
132 static files copied to '...', 132 post-processed.

estilo.css
estilo.9dcfc804e470.css
staticfiles.json
```

Cada fichero aparece dos veces: con su nombre y con un resumen de su contenido dentro. El `staticfiles.json` es el índice que relaciona uno con otro, y **`{% static %}` lo consulta** para escribir el nombre con hash en la página.

Con eso se puede decirle al navegador que guarde esos ficheros un año entero, porque si el contenido cambia, cambia el nombre, y el navegador pide uno que no tiene. Es la única forma de tener a la vez caché agresiva y despliegues que se ven al momento.

Y es la respuesta definitiva a la pregunta del principio: con la ruta escrita a mano, esto no funciona.

> [!resumen] En resumen
>
> Los ficheros estáticos van en `aplicacion/static/aplicacion/`, con la carpeta repetida por la misma razón que las plantillas, porque todos acaban mezclados en un sitio y sin espacio de nombres se pisan. En las plantillas se escriben con `{% static %}`, que construye la dirección a partir de `STATIC_URL` pero no comprueba que el fichero exista, así que una errata se manifiesta como un `404` en el navegador y una página sin estilos. Los tres ajustes que se parecen hacen cosas distintas: `STATIC_URL` es el prefijo de las direcciones, `STATICFILES_DIRS` son las carpetas del proyecto que no pertenecen a ninguna aplicación, y `STATIC_ROOT` es el destino donde `collectstatic` copia todo junto para producción, incluido lo del panel de administración. De los tres, Django 6.1 solo trae puesto `STATIC_URL`. En desarrollo no hay que hacer nada, pero `runserver` deja de servir estáticos con `DEBUG = False`, que es el momento en que el sitio aparece sin estilos y no está roto: en producción los sirve otra cosa. Conviene no confundir los estáticos, que escribes tú y viajan con el código, con los ficheros subidos, que aparecen mientras el sitio funciona y se configuran aparte. Y la razón de fondo para no escribir las rutas a mano es el hash: con `ManifestStaticFilesStorage`, el nombre de cada fichero incluye un resumen de su contenido, lo que permite cachear durante un año y que los cambios se vean igualmente.

> [!ejercicio] Practica
>
> 1. Crea la hoja de estilos de la aplicación en su carpeta con espacio de nombres y enlázala desde la plantilla base con `{% static %}`. Mira el HTML generado.
> 2. Escribe mal el nombre del fichero a propósito y comprueba que la plantilla no protesta. Encuentra el `404` en las herramientas del navegador.
> 3. Añade `STATICFILES_DIRS` con una carpeta del proyecto y pon ahí un CSS común. Comprueba que también se encuentra.
> 4. Ejecuta `collectstatic` sin `STATIC_ROOT` y lee el error. Ponlo y vuelve a ejecutarlo. Cuenta cuántos ficheros se han copiado y mira de dónde salen los que no son tuyos.
> 5. Pon `DEBUG = False` y `ALLOWED_HOSTS` con `127.0.0.1`, arranca el servidor y comprueba que la página carga sin estilos. Explica por qué.
> 6. Activa `ManifestStaticFilesStorage`, vuelve a recoger y mira los nombres de los ficheros y el `staticfiles.json`. Cambia una línea del CSS, recoge otra vez y comprueba que el nombre ha cambiado.
