---
titulo: "URLs con parámetros y con nombre"
resumen: "Los conversores que validan antes de llegar a la vista, y dejar de escribir direcciones a mano en todo el proyecto."
minutos: 15
orden: 21
---

La lección 6 dejó las URLs a medias: rutas fijas y un `path` por vista. La 16 usó un `<int:pk>` sin explicarlo. Esta lección cierra el tema, y de paso paga la deuda que dejó la 15, cuando `get_absolute_url` no se pudo escribir porque faltaban las rutas con nombre.

Son dos ideas, y la segunda es más importante de lo que parece: **capturar trozos de la dirección** y **no volver a escribir una dirección a mano**.

> [!objetivo] Qué vas a aprender
>
> Capturar partes de la URL con los cinco conversores y saber cuál valida qué, usar expresiones regulares cuando los conversores no llegan, dar nombre a las rutas y agruparlas en espacios de nombres, generar direcciones con `reverse` y `{% url %}`, escribir `get_absolute_url`, y leer el error de esta lección.

## Conversores

```python title="contactos/urls.py"
urlpatterns = [
    path('', views.lista, name='lista'),
    path('<int:pk>/', views.detalle, name='detalle'),
    path('grupo/<slug:slug>/', views.por_grupo, name='por-grupo'),
    path('anio/<int:anio>/<int:mes>/', views.por_fecha, name='por-fecha'),
]
```

Lo de dentro de los ángulos son dos cosas separadas por dos puntos: **el conversor y el nombre**. El nombre es el del parámetro de la vista, así que `<int:pk>` obliga a que la función tenga un parámetro `pk`.

Los cinco que trae Django:

| Conversor | Acepta | Llega a la vista como |
| --- | --- | --- |
| `str` | Cualquier cosa menos `/` | `str` |
| `int` | Cero y enteros positivos | `int` |
| `slug` | Letras, números, guiones y guiones bajos | `str` |
| `uuid` | Un identificador con su formato exacto | `UUID` |
| `path` | Cualquier cosa, **incluida la `/`** | `str` |

Medidos, para que se vea que no solo recortan sino que convierten:

```salida
grupo/mi-grupo-2/                          -> grupo='mi-grupo-2'  tipo=str
anio/2026/09/                              -> anio=2026 mes=9     tipo=int
buscar/a/b/c/                              -> resto='a/b/c'
id/12345678-1234-5678-1234-567812345678/   -> tipo=UUID
```

Dos cosas que merecen atención. El `09` llega como el entero `9`, no como la cadena `'09'`: **el conversor convierte, no solo comprueba**. Y `path` se traga las barras, lo que lo hace útil para el último trozo de una ruta y peligroso en medio, porque se come todo lo que venga detrás.

Si no pones conversor, `<pk>` es lo mismo que `<str:pk>`.

> [!consejo] Esto es validación, y es la más barata que hay
>
> Lo que se vio de pasada en la lección 16 merece decirse entero: un conversor filtra **antes** de que la vista exista.
>
> ```salida
> /contactos/abc/      -> 404
> /contactos/999/      -> 404
> ```
>
> El primero no encaja con el patrón y la vista ni se ejecuta. El segundo encaja, llega, y es `get_object_or_404` quien decide.
>
> La consecuencia práctica es que **dentro de la vista los datos ya tienen el tipo correcto**, y no hay que escribir un `try: int(pk)`. Todo lo que puedas expresar en el patrón es código que no escribes ni pruebas.

### Cuando los cinco no llegan

Para un formato propio está `re_path`, con una expresión regular del módulo 1:

```python
from django.urls import re_path

re_path(r'^dni/(?P<dni>\d{8}[A-Z])/$', views.eco_dni, name='eco-dni'),
```

```salida
dni/12345678Z/   -> 200 dni='12345678Z'
dni/1234Z/       -> 404
```

Los grupos tienen que llevar nombre, con esa sintaxis `(?P<nombre>...)`, y el nombre es el del parámetro de la vista.

`re_path` es más potente y bastante menos legible, así que la costumbre sana es usarlo solo cuando hace falta. La alternativa elegante, cuando el mismo formato se repite en varias rutas, es **escribir un conversor propio**: una clase con un `regex`, un `to_python` y un `to_url`, que se registra con `register_converter`. Con eso el patrón vuelve a leerse como los demás.

## Rutas con nombre

Esto es la mitad importante de la lección.

```python
path('<int:pk>/', views.detalle, name='detalle'),
```

```python title="contactos/urls.py"
app_name = 'contactos'
```

El `name` bautiza la ruta. El `app_name` mete todos los nombres de ese fichero en un **espacio de nombres**, y a partir de ahí la ruta se llama `contactos:detalle`. Es lo mismo que la carpeta repetida de las plantillas: evita que dos aplicaciones con una ruta llamada `lista` se estorben.

El trato es este: **escribes la dirección una vez, en el fichero de rutas, y en el resto del proyecto la pides por su nombre.** El día que `/contactos/3/` pase a ser `/agenda/personas/3/`, cambia una línea.

### Desde Python

```python
from django.urls import reverse
```

```salida
reverse('contactos:lista')                                 ->  /contactos/
reverse('contactos:detalle', args=[3])                     ->  /contactos/3/
reverse('contactos:detalle', kwargs={'pk': 3})             ->  /contactos/3/
reverse('contactos:por-fecha', kwargs={'anio': 2026, 'mes': 9})  ->  /contactos/anio/2026/9/
```

Con `args` va por posición y con `kwargs` por nombre. Con más de un parámetro, `kwargs` se lee mejor y no se equivoca de orden.

### Desde la plantilla

```html
{% url 'contactos:lista' %}
{% url 'contactos:detalle' contacto.pk %}
{% url 'contactos:detalle' pk=contacto.pk as u %}
```

```salida
A url simple  : /contactos/
B url con arg : /contactos/3/
C url con as  : [/contactos/3/]
```

Mismo mecanismo. El nombre de la ruta va **entre comillas**; sin ellas, Django lo toma por una variable, que no existe, y con el silencio de la lección 17 acaba buscando una ruta llamada cadena vacía. La forma con `as` guarda la dirección en una variable, útil cuando se usa dos veces o cuando hace falta comprobar antes si existe.

> [!error] `NoReverseMatch`, el error que sí grita
>
> Una excepción agradable en un lenguaje que se calla casi todo: **un `{% url %}` mal escrito no falla en silencio, revienta la página**. Y el mensaje dice bastante:
>
> ```salida
> Reverse for 'detalle' with no arguments not found. 1 pattern(s) tried:
> ['contactos/(?P<pk>[0-9]+)/\\Z']
>
> Reverse for 'detalle' not found. 'detalle' is not a valid view function
> or pattern name.
>
> Reverse for 'detalle' with arguments '('abc',)' not found. 1 pattern(s) tried:
> ['contactos/(?P<pk>[0-9]+)/\\Z']
> ```
>
> Los tres casos, en orden: **faltan argumentos**, **el nombre no existe** y **los argumentos no encajan con el patrón**.
>
> La forma de leerlo es fijarse en si aparece la lista de patrones probados. Si aparece, el nombre está bien y el problema son los argumentos. Si dice "is not a valid view function or pattern name", el nombre está mal, y casi siempre es que falta el espacio de nombres: `'detalle'` en vez de `'contactos:detalle'`.
>
> El tercero es interesante: `args=['abc']` falla porque `abc` no encaja con el `int`. O sea que **`reverse` también valida**, y una dirección generada siempre es una dirección que existe.

## `get_absolute_url`

Ahora ya se puede escribir lo que la lección 15 dejó pendiente:

```python title="contactos/models.py"
from django.urls import reverse


class Contacto(models.Model):
    # ...

        def get_absolute_url(self):
                return reverse('contactos:detalle', kwargs={'pk': self.pk})
```

```salida
D absolute    : /contactos/3/
E enlace      : <a href="/contactos/3/">Zoe Alvarez</a>
```

Es un método con un nombre especial, y ese nombre importa porque hay código que lo busca:

```salida
redirect(objeto)          ->  302 /contactos/3/
redirect('contactos:detalle', pk=3)  ->  302 /contactos/3/
redirect('contactos:lista', permanent=True)  ->  301 /contactos/
```

`redirect` acepta un objeto y sabe dónde mandar. Las vistas genéricas de la lección 24 lo usan después de guardar. El panel de administración pone un botón de "ver en el sitio" si existe. Y en las plantillas, `{{ contacto.get_absolute_url }}` es más corto que el `{% url %}` equivalente.

La regla: **si un objeto tiene una página propia, escribe `get_absolute_url`**. Son tres líneas y las aprovecha medio Django.

Fíjate de paso en el `permanent=True`: ahí está la diferencia entre `301` y `302` de la lección 2, y la advertencia de entonces sigue en pie, porque un `301` se queda cacheado en los navegadores durante mucho tiempo.

## Incluir y ordenar

```python title="agenda/urls.py"
urlpatterns = [
    path('', vistas.portada, name='portada'),
    path('contactos/', include('contactos.urls')),
    path('admin/', admin.site.urls),
]
```

`include` engancha el fichero de rutas de la aplicación bajo un prefijo, como se vio en la lección 7. El prefijo está **solo aquí**, así que dentro de la aplicación las rutas se escriben sin él, y mover la sección entera a otra dirección es cambiar esta línea.

Y una cosa que hay que tener presente: **Django prueba los patrones en orden y se queda con el primero que encaje**. No busca el que mejor encaja, el primero.

```python
path('<int:pk>/', views.detalle, name='detalle'),
path('nuevo/', views.nuevo, name='nuevo'),        # bien: 'nuevo' no es un int
path('<str:nombre>/', views.buscar),
path('nuevo/', views.nuevo),                      # mal: nunca se llega
```

Con conversores de tipo esto casi nunca muerde, porque `nuevo` no encaja con `<int:pk>`. Con `<str:...>` sí muerde, y el síntoma es una vista que no se ejecuta nunca sin que nada avise. **Las rutas fijas van antes que las que capturan cadenas.**

> [!consejo] Cómo diseñar las direcciones
>
> Cuatro criterios que se agradecen a los seis meses:
>
> **Sustantivos en plural para las colecciones**: `/contactos/`, no `/listaContactos/`. La dirección nombra la cosa; lo que se hace con ella lo dice el método HTTP de la lección 2.
>
> **Guiones, no guiones bajos**, y todo en minúsculas. Es la convención de la web y lo que esperan los buscadores.
>
> **Jerarquía de más general a más concreto**: `/contactos/3/notas/`, no `/notas/contacto/3/`.
>
> **Con barra al final**, como se decidió en la lección 6, y sin excepciones dentro del proyecto.
>
> Y una que se olvida: cuando el identificador sale en la dirección, `/contactos/3/` funciona pero no dice nada. Un `SlugField` en el modelo permite `/contactos/ana-ruiz/`, que se lee, se comparte y se recuerda. El precio es tener que garantizar que sea único y decidir qué pasa cuando alguien cambia de nombre.

> [!resumen] En resumen
>
> Los conversores capturan trozos de la dirección y los pasan a la vista como argumentos con el nombre que se les dé; los cinco de serie son `str`, `int`, `slug`, `uuid` y `path`, y no solo comprueban sino que convierten, de modo que dentro de la vista los datos ya tienen su tipo. Eso es validación, y la más barata posible, porque lo que no encaja con el patrón ni llega a ejecutar la vista. Cuando los cinco no llegan está `re_path` con una expresión regular de grupos con nombre, y si el formato se repite conviene un conversor propio. La otra mitad es dar nombre a las rutas y agruparlas con `app_name`: a partir de ahí la dirección se escribe una sola vez y en el resto del proyecto se pide por su nombre con `reverse` desde Python y con `{% url %}` desde las plantillas. Un nombre mal escrito no falla en silencio, lanza `NoReverseMatch`, y el mensaje distingue entre que falte el nombre, que falten argumentos o que los argumentos no encajen, lo que significa que `reverse` también valida. Con esto ya se puede escribir `get_absolute_url`, que aprovechan `redirect`, las vistas genéricas y el panel de administración, así que todo objeto con página propia debería tenerlo. Y al montar el fichero de rutas hay que recordar que Django se queda con el primer patrón que encaja, no con el que mejor encaja, así que las rutas fijas van antes que las que capturan cadenas.

> [!ejercicio] Practica
>
> 1. Añade una ruta con `<slug:slug>` para filtrar por grupo y otra con dos `<int:...>` para filtrar por año y mes. Comprueba con `type()` en la vista qué tipo llega en cada caso.
> 2. Pide `/contactos/09/` y mira si la vista recibe `'09'` o `9`.
> 3. Escribe una ruta con `re_path` que acepte un código de dos letras y cuatro cifras. Prueba uno válido y uno que no lo sea.
> 4. Pon nombre y espacio de nombres a todas tus rutas y sustituye todas las direcciones escritas a mano de tus plantillas por `{% url %}`.
> 5. Provoca los tres `NoReverseMatch`: sin el espacio de nombres, sin argumentos y con un argumento del tipo que no es. Compara los tres mensajes.
> 6. Escribe `get_absolute_url` en el modelo, úsalo en la lista para enlazar cada contacto con su ficha, y comprueba desde el intérprete que `redirect(contacto)` lleva a la dirección correcta.
> 7. Coloca una ruta `<str:nombre>` antes de una ruta fija y comprueba que la segunda deja de responder. Arréglalo cambiando el orden.
