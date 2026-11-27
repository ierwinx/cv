---
titulo: "Filtros y etiquetas propias"
resumen: "Cuando el lenguaje de plantillas se queda corto, se amplía: un módulo, un decorador y una función normal de Python."
minutos: 14
orden: 19
---

La lección 17 dejó una lista de cosas que las plantillas no saben hacer, y la respuesta general era calcularlas en la vista o en el modelo. Esa respuesta vale casi siempre y falla en dos casos concretos.

El primero es cuando lo que hace falta es **de presentación y de todas las páginas**: quitar las tildes para comparar, dar formato a un teléfono, pintar una insignia de color. Eso no es del modelo, porque no es verdad sobre el objeto, y ponerlo en cada vista es repetirlo.

El segundo es cuando el trozo **necesita datos propios**: una barra lateral con los últimos contactos, que sale en todas las páginas. Con `include` habría que pasar esa lista desde todas las vistas.

Para los dos, Django deja ampliar el lenguaje con funciones de Python normales.

> [!objetivo] Qué vas a aprender
>
> Crear el módulo donde viven las etiquetas propias y saber por qué su sitio es ese, escribir filtros con y sin argumento, escribir etiquetas con `simple_tag` e `inclusion_tag`, generar HTML sin abrir un agujero, y reconocer los dos errores que da una etiqueta mal registrada.

## Dónde van

La estructura es obligatoria y no admite variaciones:

```text
contactos/
  templatetags/
    __init__.py            Vacío, y tiene que existir
    agenda_extras.py       El nombre lo eliges tú
```

Tres cosas que no se pueden cambiar. La carpeta se llama `templatetags`, en inglés y sin guion bajo. Necesita el `__init__.py` para ser un paquete, como se vio en la lección 4. Y la aplicación tiene que estar en `INSTALLED_APPS`, que es la lección 7 otra vez: sin registrar, Django no mira ahí.

El nombre del fichero sí lo eliges, y es el que se escribe en el `{% load %}`, así que conviene que sea único en el proyecto entero.

```python title="contactos/templatetags/agenda_extras.py"
from django import template

register = template.Library()
```

Esas dos líneas van en todos. `register` tiene que llamarse así: es el nombre que Django busca en el módulo.

## Filtros

Un filtro es una función que recibe el valor y devuelve otro:

```python title="contactos/templatetags/agenda_extras.py"
import unicodedata

from django import template

register = template.Library()


@register.filter
def sin_tildes(texto):
        """Quita las tildes: útil para comparar y para ordenar."""
    descompuesto = unicodedata.normalize('NFKD', str(texto))
    return ''.join(c for c in descompuesto if not unicodedata.combining(c))


@register.filter
def clave(diccionario, nombre):
        """Busca una clave que el punto no puede escribir, como 'mi-clave'."""
    return diccionario.get(nombre, '')
```

En la plantilla, con el `{% load %}` delante:

```html
{% load agenda_extras %}

{{ contacto.nombre|sin_tildes }}
{{ datos|clave:"mi-clave" }}
```

```salida
Zoe Alvarez
encontrada
```

El primer parámetro es lo que va delante del `|`; el segundo, si lo hay, es el argumento de detrás de los dos puntos. **Un filtro admite como mucho un argumento**, y eso no se puede ampliar; cuando hacen falta dos, es una etiqueta.

Fíjate en el segundo: resuelve el problema de la lección 17 con las claves que llevan guion. Es el ejemplo típico de filtro que merece la pena.

El `str()` del primero tampoco es casual. **Un filtro puede recibir cualquier cosa**, incluida la cadena vacía que Django pone cuando una variable no existe, y no puede reventar: si lo hace, se lleva la página por delante.

> [!error] `Invalid filter: 'sin_tildes'`
>
> El error de esta lección, y se comete una vez por proyecto:
>
> ```salida
> TemplateSyntaxError: Invalid filter: 'sin_tildes'
> ```
>
> Falta el `{% load agenda_extras %}` en esa plantilla. Y hay que ponerlo en **cada plantilla que lo use**: el `load` no se hereda de la plantilla padre, porque cada fichero se compila por su cuenta.
>
> Si el `load` está y el error persiste, la lista de sospechosos es corta: falta el `__init__.py`, la aplicación no está en `INSTALLED_APPS`, o el nombre del filtro está mal escrito en uno de los dos sitios.
>
> Y un detalle de la herencia que se cruza con la lección anterior: el `{% load %}` va **debajo** del `{% extends %}`, nunca encima.

## Etiquetas

### `simple_tag`

Cuando hace falta más de un argumento, o cuando lo que se devuelve es un trozo de HTML:

```python
from django.utils.html import format_html


@register.simple_tag
def etiqueta_grupo(contacto):
        color = 'verde' if contacto.grupo else 'gris'
    nombre = contacto.grupo.nombre if contacto.grupo else 'Sin grupo'
    return format_html('<span class="chip {}">{}</span>', color, nombre)
```

```html
{% etiqueta_grupo contacto %}
```

```salida
<span class="chip verde">Trabajo</span>
```

Sin `|`, sin límite de argumentos, y admite argumentos con nombre. Además se puede guardar el resultado en lugar de escribirlo:

```html
{% etiqueta_grupo contacto as chip %}
```

Eso mete `chip` en el contexto y no imprime nada, que es cómodo cuando el valor se usa dos veces.

### `inclusion_tag`

Para el trozo que necesita sus propios datos. La función devuelve un contexto y Django renderiza con él la plantilla que se indica:

```python
@register.inclusion_tag('contactos/_ultimos.html')
def ultimos_contactos(cuantos=3):
        return {'contactos': Contacto.objects.order_by('-creado')[:cuantos]}
```

```html title="contactos/templates/contactos/_ultimos.html"
<ul class="ultimos">{% for c in contactos %}<li>{{ c.nombre }}</li>{% endfor %}</ul>
```

```html
{% ultimos_contactos 2 %}
```

```salida
<ul class="ultimos"><li>Por id</li><li>Sin grupo</li></ul>
```

Eso es lo que la lección anterior dejó pendiente: la barra lateral se pinta sola, **sin que ninguna vista tenga que pasarle nada**.

> [!aviso] Una `inclusion_tag` hace consultas, y las hace en cada página
>
> La comodidad tiene un precio que conviene tener presente: esa etiqueta consulta la base de datos, y si la pones en la plantilla base, consulta **en todas las páginas del sitio**.
>
> Con una consulta ligera da igual. Con tres etiquetas de estas en la base, el sitio entero paga tres consultas por página, incluidas las que no tienen nada que ver.
>
> Dos formas de que no duela: que la consulta sea pequeña y esté indexada, o cachear el resultado, que es lo habitual para menús y listas de "lo último". Y una señal de alarma: si una `inclusion_tag` recorre una relación, tiene el N+1 de la lección 13 dentro y nadie lo va a ver, porque no está en ninguna vista.

## Generar HTML sin abrir un agujero

Esto es lo más importante de la lección, porque una etiqueta propia es el sitio donde es fácil saltarse el escapado sin querer.

Compara las dos formas, medidas:

```python
@register.simple_tag
def etiqueta_grupo(contacto):
        return format_html('<span class="chip {}">{}</span>', color, nombre)   # bien


@register.filter
def chip_inseguro(contacto):
        return f'<span>{contacto.nombre}</span>'                               # mal
```

```salida
B seguro  : <span class="chip verde">Trabajo</span>
C inseguro: &lt;span&gt;Zoe Alvarez&lt;/span&gt;
D marcado : <span>Zoe Alvarez</span>
```

El segundo devuelve una cadena normal, así que Django la escapa y sale el HTML literal en la página. Lo que casi todo el mundo hace entonces es añadirle `|safe`, o marcar la función con `is_safe=True`, y eso es el caso D: **funciona, y a la vez acaba de abrir el agujero**, porque si el nombre del contacto tuviera un `<script>` dentro saldría ejecutándose.

La forma correcta es `format_html`, que ya se mencionó en la lección 17:

```python
format_html('<span class="chip {}">{}</span>', color, nombre)
```

Escapa **los argumentos** y deja pasar el HTML de la plantilla, que lo has escrito tú. Es exactamente el reparto que se quiere, y hace lo mismo que las plantillas por defecto.

Sus dos compañeras, para cuando hay listas:

```python
from django.utils.html import format_html, format_html_join
```

`format_html_join` aplica `format_html` a cada elemento de una lista y los une, y es lo que se usa para construir una serie de etiquetas sin concatenar a mano.

> [!nota] `mark_safe` existe y casi nunca es la respuesta
>
> Verás `mark_safe` en mucho código. Lo que hace es decirle a Django "esto ya está bien, no lo escapes", y es correcto sobre una cadena **constante**, escrita en el código.
>
> Sobre algo que lleve una variable dentro, no. `mark_safe(f'<b>{nombre}</b>')` es el agujero de la lección 1 escrito de la forma más compacta posible. La regla: donde estés tentado de poner `mark_safe` con una f-string, lo que toca es `format_html`.

## Cuándo merece la pena

Ampliar el lenguaje es fácil y por eso conviene un criterio, o se acaba con un módulo de cuarenta etiquetas que nadie recuerda:

| Lo que necesitas | Dónde va |
| --- | --- |
| Un dato del objeto | Propiedad del modelo |
| Un dato de esta página | La vista, en el contexto |
| Una transformación de presentación, en muchas páginas | Un filtro |
| Un trozo de HTML con lógica, en muchas páginas | `simple_tag` |
| Un trozo con sus propios datos, en muchas páginas | `inclusion_tag` |
| Algo que sale en todas las páginas y ya existe en el contexto | Un procesador de contexto |

Esa última fila es la alternativa que no se ha mencionado. Un **procesador de contexto** es una función que añade variables al contexto de todas las plantillas, y se registra en `TEMPLATES`. Los tres que ya tienes puestos son los que hacen que `{{ user }}` y `{{ messages }}` funcionen en cualquier sitio sin que ninguna vista los pase, y se ven en el bloque de usuarios.

La diferencia con una `inclusion_tag` es cuándo se ejecuta: **un procesador de contexto corre en todas las páginas, la use la plantilla o no**; una etiqueta solo corre donde se escribe. Para algo caro, la etiqueta es más prudente.

> [!resumen] En resumen
>
> El lenguaje de plantillas se amplía con funciones de Python, y su sitio es obligatorio: una carpeta `templatetags` dentro de la aplicación, con su `__init__.py`, y la aplicación registrada en `INSTALLED_APPS`. En el módulo hace falta una variable `register` con ese nombre. Un filtro recibe el valor y como mucho un argumento, tiene que aguantar cualquier cosa que le llegue sin reventar, y es lo que resuelve casos como las claves de diccionario con guion que el punto no puede escribir. Cuando hacen falta más argumentos está `simple_tag`, que además permite guardar el resultado con `as` en vez de imprimirlo, y cuando el trozo necesita sus propios datos está `inclusion_tag`, que ejecuta una función y renderiza una plantilla con lo que devuelva, de modo que una barra lateral se pinta sin que ninguna vista le pase nada; el precio es que consulta la base de datos en todas las páginas donde se ponga. El error habitual es olvidar el `{% load %}`, que hay que repetir en cada plantilla porque no se hereda, y que va debajo del `{% extends %}`. Y lo más delicado es generar HTML: una cadena normal se escapa y sale literal, y la tentación de arreglarlo con `safe` o `mark_safe` es justo lo que abre el agujero; la forma correcta es `format_html`, que escapa los argumentos y deja pasar el HTML fijo.

> [!ejercicio] Practica
>
> 1. Crea el módulo de etiquetas con su `__init__.py` y escribe el filtro `sin_tildes`. Úsalo en una plantilla y comprueba que hace falta el `{% load %}`.
> 2. Quita el `{% load %}` y lee el error. Ponlo encima del `{% extends %}` y lee el otro.
> 3. Escribe un filtro `telefono` que dé formato a un número de nueve cifras como `600 11 22 33`, y que aguante recibir la cadena vacía sin fallar.
> 4. Escribe una `simple_tag` que devuelva una insignia con el grupo, primero con una f-string y después con `format_html`. Compara las dos salidas en la página.
> 5. Guarda en el nombre de un contacto un `<b>` y vuelve a mirar las dos versiones de la etiqueta. Explica cuál es el problema de la primera.
> 6. Escribe una `inclusion_tag` con los últimos contactos y ponla en la plantilla base. Cuenta las consultas de una página cualquiera antes y después.
