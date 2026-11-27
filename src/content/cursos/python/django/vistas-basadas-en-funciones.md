---
titulo: "Vistas basadas en funciones"
resumen: "Juntar por fin los modelos con las páginas, dejar de construir HTML con f-strings, y la carpeta que se repite dos veces con motivo."
minutos: 15
orden: 16
---

En la lección 6 escribiste una vista que devolvía HTML con una f-string, y quedó dicho dos veces que eso era provisional: una porque los datos estaban a mano, y otra porque montar HTML concatenando cadenas es el agujero de seguridad de la lección 1. El bloque B resolvió lo primero. Esta lección resuelve lo segundo y cierra el circuito: petición, vista, modelo, plantilla, respuesta.

> [!objetivo] Qué vas a aprender
>
> Escribir vistas que consulten el modelo y devuelvan una plantilla con `render`, saber dónde van los ficheros de plantilla y por qué la carpeta se repite, usar `get_object_or_404`, atender `GET` y `POST` en la misma vista, conocer los tipos de respuesta que hay además de `HttpResponse`, y tener un criterio de qué puede y qué no puede hacer una vista.

## `render`, que hace tres cosas

```python title="contactos/views.py"
from django.shortcuts import get_object_or_404, render

from .models import Contacto


def lista(peticion):
        contactos = Contacto.objects.select_related('grupo')
    return render(peticion, 'contactos/lista.html', {'contactos': contactos})
```

`render` recibe tres cosas y hace tres cosas:

1. **La petición**, que le hace falta para que la plantilla sepa quién está mirando y para la protección de los formularios.
2. **El nombre de la plantilla**, que se busca en las carpetas de todas las aplicaciones instaladas.
3. **El contexto**, un diccionario con lo que la plantilla puede usar. Las claves son los nombres que aparecerán dentro.

Con eso rellena la plantilla y devuelve un `HttpResponse` ya construido. Es una comodidad sobre tres pasos que se pueden hacer a mano y que casi nadie hace.

Fíjate en el `select_related('grupo')`. Es la deuda que dejó la lección 13: la plantilla va a recorrer los contactos y a pedir el grupo de cada uno, así que sin eso habría una consulta por contacto. **Esa es la regla práctica del N+1: si la plantilla recorre una lista y toca una relación, la vista que la alimenta lleva `select_related`.**

## Dónde van las plantillas

```text
contactos/
  templates/
    contactos/
      lista.html
      detalle.html
```

La carpeta `contactos` aparece dos veces y es intencionado. La primera, `templates/`, es donde Django busca; la segunda es un **espacio de nombres** para que las plantillas de una aplicación no choquen con las de otra.

El motivo se ve provocándolo. Con dos aplicaciones que tengan cada una un `templates/lista.html` sin la carpeta de en medio:

```salida
SOY LA DE CONTACTOS
```

Gana la que aparezca antes en `INSTALLED_APPS`, y la otra plantilla **deja de existir sin que nadie avise**. No hay error, no hay aviso: simplemente sale la página equivocada. Con la carpeta intermedia, una es `contactos/lista.html` y la otra `pedidos/lista.html`, y no hay forma de confundirlas.

Es una convención fea que se agradece en cuanto un proyecto tiene tres aplicaciones. Conviene adoptarla desde la primera.

> [!nota] Por qué funciona sin tocar `settings.py`
>
> En `TEMPLATES`, que viste en la lección 4, hay dos claves que explican esto:
>
> ```python title="agenda/settings.py"
> TEMPLATES = [
>     {
>         'BACKEND': 'django.template.backends.django.DjangoTemplates',
>         'DIRS': [],
>         'APP_DIRS': True,
>         # ...
>     },
> ]
> ```
>
> `APP_DIRS: True` hace que Django busque una carpeta `templates/` dentro de **cada aplicación instalada**, en el orden de `INSTALLED_APPS`. Por eso no hay que registrar nada.
>
> `DIRS` es para las plantillas que no son de ninguna aplicación, como la base común del sitio. Se usa en la lección 18, la de herencia, poniendo ahí `[BASE_DIR / 'plantillas']`.
>
> Y una consecuencia del orden: las carpetas de `DIRS` se miran **antes** que las de las aplicaciones, lo que permite sustituir una plantilla de una aplicación ajena sin tocar su código. Es cómo se personaliza el panel de administración o las páginas de inicio de sesión.

## La plantilla

```html title="contactos/templates/contactos/lista.html"
<!doctype html>
<html lang="es">
<body>
  <h1>Contactos ({{ contactos|length }})</h1>
  <ul>
  {% for contacto in contactos %}
    <li>{{ contacto.nombre }} — {{ contacto.grupo|default:"sin grupo" }}</li>
  {% empty %}
    <li>No hay contactos.</li>
  {% endfor %}
  </ul>
</body>
</html>
```

```salida
<h1>Contactos (5)</h1>
<ul>
  <li>Ana Ruiz — Trabajo</li>
  <li>Luis Pardo — Familia</li>
  <li>Sin grupo — sin grupo</li>
  <li>Zoe Alvarez — Trabajo</li>
</ul>
```

El lenguaje de plantillas es la lección siguiente entera. Lo que hace falta ver ahora es lo que se ha arreglado sin pedirlo:

```consola
>>> c.notas = '<script>alert(1)</script> y <b>negrita</b>'
>>> c.save()
```

```salida
<p>&lt;script&gt;alert(1)&lt;/script&gt; y &lt;b&gt;negrita&lt;/b&gt;</p>
```

El `<script>` ha salido como texto, no como código. **Las plantillas escapan todo lo que insertan, por defecto y sin hacer nada.** Eso es lo que la f-string de la lección 6 no hacía, y es la razón de peso para usar plantillas incluso cuando el HTML es de tres líneas.

## Una vista de detalle

```python title="contactos/views.py"
def detalle(peticion, pk):
        contacto = get_object_or_404(Contacto, pk=pk)
    return render(peticion, 'contactos/detalle.html', {'contacto': contacto})
```

```python title="contactos/urls.py"
urlpatterns = [
    path('', views.lista, name='lista'),
    path('<int:pk>/', views.detalle, name='detalle'),
]
```

Ese `<int:pk>` captura un trozo de la dirección y se lo pasa a la vista **como argumento con ese nombre**. Por eso la función tiene un parámetro `pk`: `/contactos/1/` llama a `detalle(peticion, pk=1)`. Los conversores y las rutas con nombre son la lección 21; aquí basta con el más común.

El `int` no es decorativo:

```salida
/contactos/1/     -> 200
/contactos/999/   -> 404
/contactos/abc/   -> 404
```

Los dos últimos dan `404` por motivos distintos. El `999` encaja con el patrón, llega a la vista y `get_object_or_404` no encuentra la fila. El `abc` **ni siquiera encaja con el patrón**, porque `int` solo acepta dígitos, así que la vista no llega a ejecutarse. Eso es una ventaja: los datos que llegan a la vista ya tienen el tipo correcto y no hay que comprobarlo.

`get_object_or_404` es el atajo que se anunció en la lección 11. Hace un `get` y convierte el `DoesNotExist` en la respuesta correcta:

```python
contacto = get_object_or_404(Contacto, pk=pk)                     # por clave
contacto = get_object_or_404(Contacto, correo='ana@ejemplo.es')   # por otro campo único
```

Hay una pareja, `get_list_or_404`, que hace lo mismo con un `filter` y da `404` si la lista sale vacía. Se usa mucho menos, porque una lista vacía casi siempre es una página válida que dice "no hay nada".

## Atender `GET` y `POST`

Una vista recibe los dos métodos y tiene que decidir. La estructura es siempre esta:

```python title="contactos/views.py"
from django.shortcuts import redirect


def nuevo(peticion):
        if peticion.method == 'POST':
                Contacto.objects.create(
            nombre=peticion.POST['nombre'],
            correo=peticion.POST['correo'],
        )
        return redirect('contactos:lista')
    return render(peticion, 'contactos/nuevo.html', {})
```

Ahí está el patrón de la lección 2: se guarda y **se redirige**, no se contesta con la página. `redirect` construye el `302` con su cabecera `Location`, y admite el nombre de una ruta, una dirección o un objeto con `get_absolute_url`.

> [!aviso] Este ejemplo está mal a propósito
>
> Leer `peticion.POST['nombre']` y metérselo al modelo tiene tres problemas, y los tres se han ido anunciando:
>
> - **Si el campo no viene, es un `MultiValueDictKeyError`**, o sea una página 500. Un formulario al que le falta un campo no es un error del servidor.
> - **No hay validación.** La lección 8 lo dejó claro: `save()` no valida, así que un correo inventado entra tal cual.
> - **No hay protección contra formularios falsificados**, que es de lo que se ocupa el `CsrfViewMiddleware` que viene puesto en `settings.py`.
>
> Se escribe así aquí para que se vea el esqueleto sin nada de por medio. La forma correcta es un formulario, que resuelve los tres de golpe, y es el bloque D entero. Hasta entonces, no copies este trozo a ningún sitio.

Para las vistas que solo admiten un método hay un decorador que ahorra el `if`:

```python
from django.views.decorators.http import require_POST


@require_POST
def borrar(peticion, pk):
        get_object_or_404(Contacto, pk=pk).delete()
    return redirect('contactos:lista')
```

Con eso, un `GET` a esa dirección devuelve un `405`, que es el código correcto según la lección 2. Y es justo la protección que hacía falta en la historia del buscador que vació la base de datos.

## Los tipos de respuesta

| Devolver | Para qué |
| --- | --- |
| `render(...)` | Una página HTML. Lo normal |
| `redirect('contactos:lista')` | Mandar a otra dirección |
| `HttpResponse('texto')` | Texto suelto, o contenido que no es HTML |
| `JsonResponse({'clave': 'valor'})` | Datos en JSON, para JavaScript |
| `HttpResponse(status=204)` | Ha ido bien y no hay nada que enseñar |
| `raise Http404('...')` | Como `get_object_or_404`, pero decidiéndolo tú |
| `FileResponse(open(...), as_attachment=True)` | Una descarga |

`JsonResponse` merece una mención: convierte el diccionario y pone el `Content-Type: application/json`. Con eso ya se puede hacer una API pequeña, y de hecho así se empieza el módulo 5 antes de llegar a Django REST Framework.

> [!consejo] Qué puede hacer una vista y qué no
>
> La vista es la única capa que sabe de HTTP, y eso corta por los dos lados.
>
> **Sí le toca** leer la petición, decidir qué datos hacen falta, elegir la plantilla y devolver el código de respuesta correcto.
>
> **No le toca** la lógica del dominio. Si en una vista aparece un cálculo sobre contactos, ese cálculo es del modelo, tal como se argumentó en la lección 15. Y si el mismo `filter` se repite en tres vistas, es un método del gestor del modelo.
>
> La prueba es la misma: **lo que hace la vista no se puede probar sin montar una petición**. Todo lo que quepa fuera de ella, sácalo, porque eso sí se prueba desde el intérprete.

> [!resumen] En resumen
>
> Una vista consulta el modelo y devuelve una plantilla con `render`, que recibe la petición, el nombre de la plantilla y un diccionario de contexto, y devuelve la respuesta ya montada. Las plantillas van en `aplicacion/templates/aplicacion/`, con la carpeta repetida a propósito, porque sin ese espacio de nombres dos aplicaciones con una plantilla del mismo nombre se pisan y gana la que esté antes en `INSTALLED_APPS`, sin ningún aviso. Funciona sin configurar nada porque `APP_DIRS` viene activado; `DIRS` es para las plantillas comunes del proyecto y se mira antes que las de las aplicaciones. Lo que resuelve una plantilla frente a una f-string es que escapa todo lo que inserta, así que un `<script>` guardado en la base de datos sale como texto. Las vistas de detalle reciben los trozos capturados de la URL como argumentos, y un conversor como `int` filtra antes de que la vista se ejecute, de modo que los datos llegan ya con su tipo; lo que no existe se convierte en un `404` con `get_object_or_404`. Una vista atiende `GET` y `POST` mirando `peticion.method`, redirigiendo siempre después de guardar, y `require_POST` evita que una dirección que modifica datos responda a un `GET`. Además de `render` hay respuestas para redirigir, para JSON, para descargas y para no devolver contenido. Y el criterio de qué va en una vista es que solo le toca lo que tiene que ver con HTTP: la lógica del dominio es del modelo.

> [!ejercicio] Practica
>
> 1. Convierte la vista de lista de la lección 7 para que use el modelo y una plantilla. Comprueba que el HTML ya no se construye con f-strings.
> 2. Guarda en las notas de un contacto un texto con `<b>negrita</b>` dentro y mira cómo sale en la página. Después compáralo con lo que hacía la vista antigua.
> 3. Escribe la vista de detalle con `<int:pk>` y prueba las tres direcciones: una que existe, un número que no existe y algo que no es un número. Explica por qué las dos últimas dan `404` por motivos distintos.
> 4. Quita el `select_related` de la vista de lista y cuenta las consultas de la página con `connection.queries`. Vuelve a ponerlo y compara.
> 5. Crea dos plantillas con el mismo nombre en dos aplicaciones, sin la carpeta intermedia, y comprueba cuál gana. Después arréglalo con el espacio de nombres.
> 6. Añade una vista de borrado con `@require_POST` y comprueba que un `GET` devuelve `405` con `curl -i`.
