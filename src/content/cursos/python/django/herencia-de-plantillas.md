---
titulo: "Herencia de plantillas"
resumen: "Escribir la cabecera del sitio una vez, los tres niveles que aguantan un proyecto entero, y la diferencia entre heredar e incluir."
minutos: 14
orden: 18
---

Las dos plantillas que llevas escritas repiten el `<!doctype html>`, la etiqueta `<head>`, el juego de caracteres y el `<body>`. Con veinte páginas eso son veinte copias de lo mismo, y el día que haya que añadir una hoja de estilos o un menú hay que tocarlas todas.

La solución de Django no es incluir trozos: es **heredar**. Se escribe una plantilla base con la estructura del sitio y unos huecos con nombre, y cada página dice de cuál hereda y rellena los huecos que le interesan. Es la misma idea que la herencia de clases del módulo 1, aplicada a documentos.

> [!objetivo] Qué vas a aprender
>
> Escribir una plantilla base con bloques y heredar de ella, usar `block.super` para ampliar en vez de sustituir, organizar un proyecto en tres niveles de plantillas, distinguir cuándo toca heredar y cuándo incluir, y conocer los dos errores propios de la herencia, uno ruidoso y otro silencioso.

## La plantilla base

Va en una carpeta del proyecto y no de ninguna aplicación, porque es de todas. Hay que decirle a Django dónde está, que es para lo que servía `DIRS`:

```python title="agenda/settings.py"
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'plantillas'],
        'APP_DIRS': True,
        # ...
    },
]
```

```html title="plantillas/base.html"
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>{% block titulo %}Agenda{% endblock %}</title>
</head>
<body>
  <nav>[navegación común]</nav>
  <main>
  {% block contenido %}
    <p>Sin contenido.</p>
  {% endblock %}
  </main>
  <footer>{% block pie %}Agenda de contactos{% endblock %}</footer>
</body>
</html>
```

Un `{% block %}` es un hueco con nombre, y **lo que hay dentro es el valor por defecto**: lo que sale si nadie lo sustituye. Eso importa: un bloque vacío y un bloque con contenido no son lo mismo, y aprovecharlo evita repetir en las páginas lo que casi siempre es igual.

## Heredar

```html title="contactos/templates/contactos/lista.html"
{% extends "base.html" %}

{% block titulo %}Contactos — {{ block.super }}{% endblock %}

{% block contenido %}
  <h1>Contactos ({{ contactos|length }})</h1>
  <ul>
  {% for contacto in contactos %}
    <li>{{ contacto.nombre }} — {{ contacto.grupo|default:"sin grupo" }}</li>
  {% empty %}
    <li>No hay contactos.</li>
  {% endfor %}
  </ul>
{% endblock %}
```

```salida
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Contactos — Agenda</title>
</head>
<body>
  <nav>[navegación común]</nav>
  <main>
  <h1>Contactos (5)</h1>
  <ul>
    <li>Ana Ruiz — Trabajo</li>
    ...
  </ul>
  </main>
  <footer>Agenda de contactos</footer>
</body>
</html>
```

La plantilla hija no tiene ni una etiqueta de estructura. Solo dice de quién hereda y rellena dos bloques; el tercero, `pie`, se ha quedado con su valor por defecto.

`{{ block.super }}` es lo que hace que el título sea `Contactos — Agenda` y no solo `Contactos`: **inserta el contenido que tenía el bloque en la plantilla padre**. Es el equivalente del `super()` de las clases, y sirve para ampliar en vez de sustituir. Se usa mucho en el título y en los bloques de estilos y guiones, donde la página quiere añadir lo suyo sin cargarse lo común.

> [!aviso] Lo que escribas fuera de un bloque no sale donde crees
>
> Este es el error silencioso de la herencia, y es fácil cometerlo al reorganizar una plantilla.
>
> Todo lo que hay en una plantilla hija **fuera de un `{% block %}` se ignora**, porque la estructura la pone el padre y en el padre no hay sitio para eso. Se escribe, se guarda, y no aparece en ninguna parte.
>
> Con una excepción rara y peor: el texto que va **antes** del `{% extends %}` sí se emite, y se emite delante de todo:
>
> ```html
> Esto de aquí está fuera de cualquier bloque.
> {% extends "base.html" %}
> {% block contenido %}<h1>{{ contacto.nombre }}</h1>{% endblock %}
> ```
>
> ```salida
> Esto de aquí está fuera de cualquier bloque.
> <!doctype html>
> <html lang="es">
> ...
> ```
>
> Texto antes del `<!doctype html>`. La página responde `200`, el navegador hace lo que puede y el HTML es inválido. Ningún aviso.
>
> La regla es simple: **en una plantilla que hereda, el `{% extends %}` va en la primera línea y todo lo demás va dentro de bloques.**

> [!error] `must be the first tag in ...`
>
> El error ruidoso, el hermano del anterior. Con una **etiqueta** delante del `{% extends %}`, en lugar de texto:
>
> ```salida
> TemplateSyntaxError: {% extends %} must be the first tag in 'contactos/detalle.html'.
> ```
>
> La diferencia es la de arriba: el texto pasa y una etiqueta no. El motivo es que Django necesita saber que esta plantilla hereda antes de procesar nada, y si ya ha ejecutado una etiqueta, es tarde.
>
> Ojo con un caso concreto que rompe esto sin querer: poner `{% load %}` arriba del todo. `{% load %}` va **después** del `{% extends %}`.

## Tres niveles

Con veinte páginas, dos niveles se quedan cortos. La estructura que aguanta un proyecto entero es esta:

```text
plantillas/
  base.html                      Nivel 1: el sitio entero
contactos/templates/contactos/
  base_contactos.html            Nivel 2: la sección
  lista.html                     Nivel 3: la página
  detalle.html
  formulario.html
```

```html title="contactos/templates/contactos/base_contactos.html"
{% extends "base.html" %}

{% block contenido %}
  <div class="seccion-contactos">
    <aside>
      <a href="/contactos/">Todos</a>
      <a href="/contactos/nuevo/">Añadir</a>
    </aside>
    <section>
      {% block contenido_contactos %}{% endblock %}
    </section>
  </div>
{% endblock %}
```

Y las páginas heredan del nivel dos:

```html title="contactos/templates/contactos/lista.html"
{% extends "contactos/base_contactos.html" %}

{% block contenido_contactos %}
  <h1>Contactos</h1>
  ...
{% endblock %}
```

El reparto es: **el nivel uno es lo que comparten todas las páginas del sitio**, el dos es lo que comparten las de una sección, y el tres es cada página. Más de tres niveles se vuelve difícil de seguir, porque para saber dónde acaba saliendo algo hay que abrir cuatro ficheros.

> [!consejo] Los bloques que conviene tener en la base desde el principio
>
> Cuesta nada ponerlos y evita rehacer la base a los dos días:
>
> ```html
> <title>{% block titulo %}Agenda{% endblock %}</title>
> {% block estilos %}{% endblock %}
> </head>
> <body>
>   {% block navegacion %}...{% endblock %}
>   {% block mensajes %}{% endblock %}
>   {% block contenido %}{% endblock %}
>   {% block guiones %}{% endblock %}
> </body>
> ```
>
> `estilos` y `guiones` son los que más se agradecen: permiten que una página concreta añada su hoja de estilos o su JavaScript en el sitio correcto del documento, que es lo que no se puede hacer si no hay hueco. Y `mensajes` es donde irán los avisos de "guardado correctamente" de la lección 35.

## Incluir

`{% include %}` mete otra plantilla en el punto donde está. Es lo contrario de heredar y sirve para otra cosa:

```html
{% include "contactos/_fila.html" %}
```

```html title="contactos/templates/contactos/_fila.html"
<li>{{ contacto.nombre }} — {{ contacto.grupo|default:"sin grupo" }}</li>
```

La convención de empezar el nombre por un guion bajo marca que es un trozo y no una página. No es obligatorio y se agradece al mirar la carpeta.

|  | `extends` | `include` |
| --- | --- | --- |
| Quién manda | El padre pone la estructura | La plantilla de fuera |
| Cuántos por plantilla | Uno, y en la primera línea | Los que hagan falta, en cualquier sitio |
| Para qué | El esqueleto del sitio | Un trozo que se repite |

La forma de elegir: **si es "esta página es como las demás, pero con esto dentro", es herencia. Si es "este cacho aparece en varios sitios", es inclusión.**

### Qué ve la plantilla incluida

Por defecto, **todo el contexto de la que la incluye**, que es cómodo y crea dependencias invisibles. Medido con una plantilla que escribe tres variables:

```salida
1. include normal:     [titulo=Ficha] [contacto=Ana Ruiz] [extra=]
2. include con with:   [titulo=Ficha] [contacto=Ana Ruiz] [extra=puesto]
3. include con only:   [titulo=] [contacto=] [extra=puesto]
```

`with` añade variables. `only` **corta el contexto heredado** y deja solo lo que le pases.

Merece la pena usar `only` en los trozos reutilizables, aunque obligue a escribir más:

```html
{% include "contactos/_fila.html" with contacto=c only %}
```

Sin `only`, el trozo funciona porque la plantilla de fuera tenía una variable con el nombre adecuado, y se rompe el día que se incluye desde otro sitio donde esa variable se llama distinto. Con `only`, lo que necesita está escrito en la propia línea del `include`, y eso es exactamente la diferencia entre una función con parámetros y una función que lee variables globales.

> [!nota] Cuando el trozo necesita lógica: `inclusion_tag`
>
> `include` no ejecuta nada: recibe lo que le des. Si el trozo necesita calcular algo —una lista de los cinco últimos contactos para una barra lateral que sale en todas las páginas—, con `include` habría que pasarle esa lista desde **todas** las vistas.
>
> Para eso existe `inclusion_tag`, una etiqueta propia que ejecuta una función y renderiza una plantilla con lo que devuelva:
>
> ```html
> {% ultimos_contactos 5 %}
> ```
>
> Se escribe en la lección siguiente, que es la de filtros y etiquetas propias. La señal de que la necesitas es tener que pasar el mismo dato desde todas las vistas para un trozo que sale en todas las páginas.

> [!resumen] En resumen
>
> La herencia de plantillas evita repetir la estructura del sitio: se escribe una base con bloques, que son huecos con nombre cuyo contenido es el valor por defecto, y cada página declara `{% extends %}` y rellena los que le interesan. `{{ block.super }}` inserta lo que el bloque tenía en el padre y permite ampliar en vez de sustituir, que es lo que se quiere en el título y en los bloques de estilos y guiones. La base común va en una carpeta del proyecto declarada en `DIRS`, porque no es de ninguna aplicación. Hay dos errores propios: uno ruidoso, que es poner cualquier etiqueta antes del `{% extends %}`, incluido un `{% load %}`, y otro silencioso y peor, que es escribir contenido fuera de los bloques, que se ignora, salvo el texto anterior al `{% extends %}`, que sale delante del `<!doctype html>` sin ningún aviso. La estructura que aguanta un proyecto son tres niveles: el sitio, la sección y la página. Y heredar no es lo mismo que incluir: se hereda cuando la página es como las demás con algo dentro, y se incluye cuando un trozo aparece en varios sitios. Una plantilla incluida ve por defecto todo el contexto de la que la incluye, lo que crea dependencias invisibles, así que en los trozos reutilizables conviene `with ... only`, que deja escrito en la propia línea lo que el trozo necesita.

> [!ejercicio] Practica
>
> 1. Crea la carpeta de plantillas del proyecto, declárala en el `DIRS` de `TEMPLATES` y escribe una base con los bloques de título, contenido y pie. Haz que las dos páginas que tienes hereden de ella.
> 2. Usa `{{ block.super }}` en el título para que cada página añada su nombre delante del nombre del sitio.
> 3. Escribe algo fuera de cualquier bloque en una plantilla hija y comprueba que no aparece. Después muévelo delante del `{% extends %}` y mira dónde sale.
> 4. Pon un `{% load %}` encima del `{% extends %}` y lee el error. Colócalo debajo y comprueba que ya funciona.
> 5. Monta el tercer nivel: una base de sección con una barra lateral, de la que hereden la lista y el detalle.
> 6. Saca la fila de la lista a un trozo incluido. Inclúyelo primero sin nada, después con `with` y por último con `only`, y comprueba qué deja de verse en cada caso.
