---
titulo: "Subida de ficheros"
resumen: "Dos atributos que hay que poner o no llega nada, los ficheros huérfanos que nadie borra, y por qué un fichero subido es siempre sospechoso."
minutos: 16
orden: 29
---

La lección 20 separó dos cosas que se confunden: los estáticos, que escribes tú y viajan con el código, y los ficheros subidos, que aparecen mientras el sitio funciona. Aquellos ya están; estos son los de ahora.

Subir un fichero se parece a cualquier otro campo y tiene cuatro diferencias que muerden. Los datos no llegan por donde tú crees, hay dos atributos sin los cuales no pasa nada y no salta ningún error, los ficheros no se borran cuando se borra la fila, y **un fichero es lo más peligroso que se puede aceptar de alguien desconocido**.

> [!objetivo] Qué vas a aprender
>
> Configurar dónde se guardan los ficheros y cómo se sirven en desarrollo, declarar los campos de fichero y de imagen, poner los dos atributos que hacen falta para que llegue algo, validar tamaño y tipo, entender qué pasa con los nombres repetidos y con los ficheros huérfanos, y conocer los riesgos y sus defensas.

## Los ajustes

No vienen en `settings.py`, como se midió en la lección 20:

```python title="agenda/settings.py"
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'subidos'
```

Los mismos dos conceptos que en los estáticos: `MEDIA_URL` es el prefijo de las direcciones y `MEDIA_ROOT` la carpeta del disco. La diferencia es que aquí **los dos hacen falta desde el primer día**, porque sin `MEDIA_ROOT` no hay dónde guardar.

Y como con los estáticos, `runserver` no los sirve por su cuenta. Hay que decírselo, solo en desarrollo:

```python title="agenda/urls.py"
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ...
]

if settings.DEBUG:
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

```salida
/media/fotos/2026/09/mi_foto.png   ->  200
/media/no-existe.png               ->  404
```

Ese `if settings.DEBUG` no es una precaución de estilo: **esa forma de servir ficheros es insegura y lenta**, y por eso Django la desactiva sola en producción. Allí lo hace el servidor de delante, igual que con los estáticos.

## Los campos

```python title="contactos/models.py"
foto = models.ImageField('foto', upload_to='fotos/%Y/%m/', blank=True)
adjunto = models.FileField('adjunto', upload_to='adjuntos/', blank=True)
```

`upload_to` es la subcarpeta dentro de `MEDIA_ROOT`, y admite trozos de fecha que se sustituyen al guardar. Repartir por año y mes no es cosmético: una carpeta con cincuenta mil ficheros es lenta de listar en casi cualquier sistema.

Cuando la ruta depende del objeto, se pone una función:

```python
def ruta_foto(instancia, nombre_original):
        return f'fotos/{instancia.pk}/{nombre_original}'
```

`ImageField` hace dos cosas de más y **necesita Pillow instalado**, que es la segunda dependencia del curso:

```consola
pip install Pillow
```

```salida
foto      <input type="file" name="foto" accept="image/*" id="id_foto">
adjunto   <input type="file" name="adjunto" id="id_adjunto">
```

La primera es ese `accept`, que hace que el navegador filtre. La segunda es que **comprueba que el fichero es de verdad una imagen**:

```salida
un fichero llamado truco.png con el texto "no soy una imagen" dentro:
válido: False
{'foto': ['Envíe una imagen válida. El fichero que ha enviado no era una imagen
          o se trataba de una imagen corrupta.']}
```

Fíjate en que lo ha pillado pese al nombre y al tipo declarado. Eso es porque abre el fichero y lo mira, en lugar de fiarse de lo que dice. Es la única validación de contenido que Django trae de serie.

## Los dos atributos que hay que poner

Aquí está el fallo que se comete una vez y cuesta media tarde.

```html
<form method="post" enctype="multipart/form-data">
```

```python
formulario = ContactoForm(peticion.POST, peticion.FILES)
```

Sin el `enctype`, el navegador manda solo los nombres de los ficheros. Sin `peticion.FILES`, el formulario no mira dónde están.

Y lo peor es cómo falla:

```salida
válido sin FILES: True | foto en cleaned_data: None
```

**No hay ningún error.** El formulario se valida, se guarda, redirige, y el fichero no está. Con un campo `blank=True`, que es lo normal en una foto, no se queja nadie.

La regla, y conviene escribirla junto al `{% csrf_token %}` en la cabeza: **si el formulario tiene un fichero, lleva `enctype` en la plantilla y `peticion.FILES` en la vista.** Las dos cosas, siempre juntas.

En las vistas genéricas de la lección 24 esto ya está hecho: `CreateView` y `UpdateView` pasan `request.FILES` solas. El `enctype` de la plantilla sigue siendo cosa tuya.

## Qué tienes después de guardar

```salida
name  : fotos/2026/09/mi_foto.png
url   : /media/fotos/2026/09/mi_foto.png
path  : /tmp/m2/subidos/fotos/2026/09/mi_foto.png
size  : 122
dims  : 40 x 30
```

`name` es la ruta relativa, que es **lo único que se guarda en la base de datos**: la columna es un texto, no el fichero. `url` es lo que va en la plantilla, `path` la ruta del disco, y `width` y `height` solo existen en `ImageField`.

En la plantilla, con la comprobación delante, porque el campo puede estar vacío:

```html
{% if contacto.foto %}
  <img src="{{ contacto.foto.url }}" alt="{{ contacto.nombre }}" width="200">
{% endif %}
```

Sin ese `{% if %}`, un contacto sin foto genera un `<img src="">`, que el navegador intenta cargar como la propia página.

## Los nombres

Django no deja los nombres tal cual, y lo que hace conviene conocerlo:

```salida
'mi foto.png'  ->  fotos/2026/09/mi_foto.png
el mismo otra vez  ->  fotos/2026/09/mi_foto_fxRQR34.png
y otra vez         ->  fotos/2026/09/mi_foto_OIng1bW.png
```

Los espacios pasan a guiones bajos, y **los nombres repetidos no se pisan**: se les añade un sufijo aleatorio. Es una decisión sensata, porque lo contrario sería que la foto de alguien sustituyera la de otro por llamarse `foto.png`.

Y lo importante:

```salida
'../../../etc/passwd.png'  ->  fotos/2026/09/passwd.png
```

La travesía de rutas **está neutralizada**: Django se queda solo con la última parte del nombre. No hay que hacer nada, y hay que saberlo para no fiarse en otros sitios: si tú construyes una ruta con algo que venga de fuera, esa protección no está.

> [!aviso] Borrar la fila no borra el fichero
>
> ```salida
> existe antes:   True
> existe después: True
> ```
>
> El `delete()` se lleva la fila y **deja el fichero en el disco para siempre**. Lo mismo al editar: si alguien cambia su foto, la anterior se queda ahí.
>
> Es intencionado. Django lo hacía antes y lo quitaron, porque borrar en cascada ficheros dentro de una transacción que puede deshacerse es una forma excelente de perder datos que no se pueden recuperar.
>
> La consecuencia es que **un proyecto con subidas acumula ficheros huérfanos**, y en un par de años eso es una carpeta con gigabytes que nadie sabe de dónde salen. Las tres formas de llevarlo:
>
> **Asumirlo y limpiar de vez en cuando**, con una orden de gestión que compare la carpeta con la base de datos. Es lo más seguro y lo que hacen muchos proyectos.
>
> **Una biblioteca** como `django-cleanup`, que se engancha a las señales y borra al borrar y al sustituir. Es cómodo y hay que entender lo que hace antes de ponerlo.
>
> **Borrar a mano** en la vista o en una señal, con cuidado de no hacerlo antes de que la transacción termine.
>
> Lo que no se puede es no decidir, porque la opción por defecto es acumular.

## Validar

`ImageField` comprueba que es una imagen y nada más. El tamaño y la extensión son cosa tuya:

```python
from django.core.validators import FileExtensionValidator


class SubirForm(forms.Form):
        documento = forms.FileField(validators=[FileExtensionValidator(['pdf', 'txt'])])

    def clean_documento(self):
                fichero = self.cleaned_data['documento']
        if fichero.size > 5 * 1024 * 1024:
                        raise forms.ValidationError('El fichero no puede pasar de 5 MB.')
        return fichero
```

```salida
extensión mala   -> False  La extensión de archivo "exe" no esta permitida. Las permitidas son: pdf, txt.
demasiado grande -> False  El fichero no puede pasar de 5 MB.
correcto         -> True
```

Y fíjate en el `return fichero` del final: es la trampa de la lección 27, y aquí destruiría el fichero entero.

Los límites que ya vienen puestos, medidos:

```salida
FILE_UPLOAD_MAX_MEMORY_SIZE:   2 MB
DATA_UPLOAD_MAX_MEMORY_SIZE:   2 MB
DATA_UPLOAD_MAX_NUMBER_FILES:  100
FILE_UPLOAD_PERMISSIONS:       0o644
```

Los dos primeros no son lo mismo, y confundirlos hace perder tiempo. `FILE_UPLOAD_MAX_MEMORY_SIZE` **no es un límite**: es el punto a partir del cual Django deja de tener el fichero en memoria y lo escribe en un temporal. Se puede subir un vídeo de un giga con ese valor. `DATA_UPLOAD_MAX_MEMORY_SIZE` sí es un límite, pero solo del resto del formulario, sin contar los ficheros.

O sea: **de serie no hay ningún límite al tamaño de un fichero subido.** Si no lo pones tú, alguien puede llenarte el disco. Y conviene ponerlo también en el servidor de delante, porque validar en Django significa que el fichero ya ha viajado entero.

> [!aviso] Un fichero subido es lo más peligroso que se acepta
>
> Merece un apartado propio porque es la parte de esta lección que de verdad importa.
>
> **El nombre miente.** `.png` no significa nada; es texto que eligió quien subió el fichero.
>
> **El `Content-Type` miente.** Lo manda el navegador y se falsifica con una línea de `curl`.
>
> **La extensión no basta.** `FileExtensionValidator` mira el nombre, no el contenido. Un ejecutable renombrado pasa.
>
> Las defensas, por orden de importancia:
>
> **No servir nunca los ficheros subidos desde el mismo dominio que la aplicación.** Un HTML subido por alguien y servido desde tu dominio ejecuta JavaScript con acceso a las cookies de sesión de quien lo abra. Con un subdominio aparte, o mejor un servicio de almacenamiento, ese ataque no funciona.
>
> **Que el servidor no los ejecute nunca.** Un `.php` o un `.py` en una carpeta que el servidor interprete es la partida entera perdida. Esa carpeta se sirve como ficheros estáticos y punto.
>
> **Comprobar el contenido, no el nombre.** Para imágenes lo hace `ImageField`. Para lo demás, hay que mirar los primeros bytes o pasar un antivirus.
>
> **Renombrar al guardar.** Un identificador aleatorio en vez del nombre original quita de golpe media docena de problemas, incluido que nadie adivine las direcciones de los ficheros ajenos.
>
> **Poner un límite de tamaño**, en Django y en el servidor de delante.
>
> Y la que se olvida: **los ficheros privados no se sirven con `MEDIA_URL`**. Todo lo que hay bajo esa dirección es público para quien sepa la ruta. Para lo que requiera permiso, hace falta una vista que compruebe y devuelva el fichero, o direcciones firmadas que caduquen.

> [!nota] Dónde acaban los ficheros en producción
>
> Guardarlos en el disco del servidor funciona hasta que hay más de un servidor, y entonces deja de funcionar de la peor manera: quien sube a uno no ve su fichero cuando le toca el otro.
>
> La solución estándar es un almacenamiento de objetos —S3 y equivalentes—, y Django lo tiene previsto en el `STORAGES` que apareció en la lección 20:
>
> ```python title="agenda/settings.py"
> STORAGES = {
>     'default': {'BACKEND': 'storages.backends.s3.S3Storage'},
>     'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
> }
> ```
>
> La clave `default` es la de los ficheros subidos y `staticfiles` la de los estáticos, que es la razón de que ese ajuste tenga dos entradas.
>
> Lo bueno es que **el código no cambia**: `foto.url` sigue funcionando y devuelve la dirección que toque. Es lo que se gana por no haber escrito nunca las rutas a mano, igual que con `{% static %}`.

> [!resumen] En resumen
>
> Los ficheros subidos necesitan `MEDIA_URL` y `MEDIA_ROOT`, que no vienen en los ajustes, y en desarrollo hay que añadir una línea al fichero de rutas para que `runserver` los sirva, siempre dentro de un `if settings.DEBUG` porque esa forma de servirlos es insegura. Los campos son `FileField` e `ImageField`, y el segundo necesita Pillow, añade un `accept` al HTML y comprueba de verdad que el contenido es una imagen. El fallo que cuesta media tarde es olvidar el `enctype` de la plantilla o el `peticion.FILES` de la vista, porque entonces el formulario se valida, se guarda y el fichero simplemente no está, sin ningún error. En la base de datos solo se guarda la ruta, y el objeto ofrece `name`, `url`, `path`, `size` y, en las imágenes, las dimensiones. Django limpia los nombres, añade un sufijo aleatorio cuando se repiten y neutraliza la travesía de rutas. Borrar la fila no borra el fichero, ni sustituirlo borra el anterior, así que un proyecto con subidas acumula huérfanos y hay que elegir entre limpiar periódicamente, usar una biblioteca o borrar a mano. De serie no hay ningún límite de tamaño, porque el ajuste que lo parece solo decide cuándo se pasa de la memoria al disco. Y lo más importante es que un fichero subido es lo más peligroso que se acepta: el nombre, el tipo declarado y la extensión mienten los tres, así que las defensas son servirlos desde otro dominio, impedir que el servidor los ejecute, comprobar el contenido, renombrar al guardar, limitar el tamaño y no usar `MEDIA_URL` para nada privado.

> [!ejercicio] Practica
>
> 1. Configura `MEDIA_URL` y `MEDIA_ROOT`, añade la línea del fichero de rutas y comprueba que un fichero subido se ve en el navegador.
> 2. Añade un `ImageField` con `upload_to` por año y mes, y mira dónde acaba el fichero en el disco.
> 3. Sube un formulario con fichero sin el `enctype`. Después ponlo y quita el `peticion.FILES`. Comprueba que en los dos casos no hay ningún error.
> 4. Sube tres veces un fichero con el mismo nombre y mira cómo quedan los tres en el disco.
> 5. Intenta subir un fichero llamado `../../../etc/passwd.png` y comprueba dónde acaba.
> 6. Crea un fichero de texto, llámalo `truco.png` y súbelo a un `ImageField`. Lee el error.
> 7. Escribe un validador de tamaño máximo y otro de extensión, y pruébalos con tres ficheros distintos.
> 8. Sube una foto, borra el contacto y comprueba si el fichero sigue en el disco. Escribe una orden de gestión que encuentre los huérfanos.
> 9. Enseña la foto en la plantilla con su `{% if %}` delante y comprueba qué pasa cuando lo quitas y el contacto no tiene foto.
