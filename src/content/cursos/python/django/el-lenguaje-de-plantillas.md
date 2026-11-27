---
titulo: "El lenguaje de plantillas"
resumen: "Un lenguaje a propósito pequeño, el punto que sirve para cuatro cosas, y el silencio con el que se traga tus erratas."
minutos: 16
orden: 17
---

Una plantilla de Django es un fichero de texto con huecos. No tiene por qué ser HTML: sirve igual para un correo, un CSV o un fichero de configuración. Lo que la distingue de una f-string es que **está pensada para que la escriba alguien que no es quien programa**, y de esa decisión salen todas sus rarezas.

Porque el lenguaje es pequeño a propósito. No se puede sumar, no se pueden llamar funciones con argumentos, no se puede importar nada y no hay variables sueltas. Eso frustra al principio y tiene un motivo que conviene aceptar antes de pelearse con él: **si en la plantilla se puede hacer poco, la lógica no acaba en la plantilla**.

> [!objetivo] Qué vas a aprender
>
> Escribir plantillas con las tres sintaxis del lenguaje, entender qué hace el punto y en qué orden lo prueba, conocer lo que no se puede hacer y por qué, reconocer el fallo silencioso de las variables mal escritas, usar los filtros y las etiquetas más frecuentes, y saber cómo funciona el escapado y cuándo se desactiva.

## Tres sintaxis y nada más

```html
{{ variable }}              Escribe algo
{% etiqueta %}              Hace algo
{# comentario #}            No sale en la salida
```

`{{ }}` evalúa y escribe. `{% %}` ejecuta lógica: bucles, condicionales, herencia. Y `{# #}` es un comentario que **desaparece de la salida**, al contrario que `<!-- -->`, que llega al navegador y cualquiera puede leerlo con "ver código fuente".

## El punto hace cuatro cosas

```html
{{ contacto.nombre }}       un atributo
{{ datos.clave }}           una clave de diccionario
{{ lista.0 }}               un índice
{{ contacto.iniciales }}    un método o propiedad, sin paréntesis
```

Los cuatro con el mismo punto. Django los prueba **en este orden**: primero clave de diccionario, después atributo o método, y por último índice numérico. El primero que funciona gana.

```salida
{{ c.iniciales }} / {{ c.nombre|upper }}   ->  AR / ANA RUIZ
{{ d.clave }}                              ->  valor
{{ l.0 }}{{ l.1 }}                         ->  ab
```

Fíjate en que `iniciales` y `nombre` se escriben igual aunque uno sea una propiedad y el otro un campo. Y en que **un método se llama sin paréntesis**: `{{ contacto.get_grupo_display }}` ejecuta el método. Si pusieras los paréntesis, sería un error de sintaxis.

Ese orden de búsqueda tiene una consecuencia práctica: un diccionario con una clave llamada `items`, `values` o `keys` da problemas, porque Django encontrará antes el método del diccionario que tu clave. Es raro y cuando pasa cuesta verlo.

> [!aviso] Las claves con guion no se pueden usar
>
> El punto obliga a que los nombres sean identificadores:
>
> ```salida
> TemplateSyntaxError: Invalid character ('-') in variable name: 'd.mi-clave'
> ```
>
> Un diccionario con claves como `mi-clave` o `content-type` no se puede recorrer con el punto. Las salidas son cambiar las claves antes de pasarlas al contexto, que es lo limpio, o escribir un filtro propio que haga la búsqueda, que es la lección 19.

## Lo que no se puede hacer

Esta es la lista, y conviene leerla entera una vez para no perder el tiempo intentándolo:

```html
{{ 2 + 2 }}                       TemplateSyntaxError
{{ contacto.busca("ana") }}       No se pueden pasar argumentos
{% x = 5 %}                       No hay asignación
{% import datetime %}             No se importa nada
{{ contactos[0] }}                No hay corchetes; es contactos.0
```

```salida
TemplateSyntaxError: Could not parse the remainder: ' + 2' from '2 + 2'
```

Para lo poco que hace falta hay filtros:

```html
{{ 2|add:2 }}         ->  4
```

Y para todo lo demás, la respuesta correcta no es buscar el truco, es **calcularlo en la vista o en el modelo y pasarlo hecho**. Cuando te veas peleando con la plantilla para conseguir un número, casi siempre es la señal de que ese número es una propiedad del modelo.

> [!aviso] El fallo silencioso: una errata no da error
>
> Este es el comportamiento del lenguaje que más tiempo hace perder, y hay que conocerlo desde hoy. Una plantilla con tres errores:
>
> ```html
> Variable que no existe: [{{ no_existe }}]
> Atributo que no existe: [{{ contacto.inventado }}]
> Nombre mal escrito:     [{{ contacto.nombrre }}]
> Nombre bien:            [{{ contacto.nombre }}]
> ```
>
> ```salida
> Variable que no existe: []
> Atributo que no existe: []
> Nombre mal escrito:     []
> Nombre bien:            [Ana Ruiz]
> [HTTP 200]
> ```
>
> Tres huecos vacíos, ningún error, respuesta `200`. La plantilla se traga las variables que no existen y escribe la cadena vacía.
>
> Es deliberado: una plantilla se escribe con datos que a veces están y a veces no, y reventar la página entera por un campo vacío sería peor. El precio es que **un dato que no sale en la página puede ser una errata y no un dato que falta**, y no hay forma de distinguirlo mirando.
>
> Lo que sí revienta es una excepción dentro de un método llamado desde la plantilla. Un `{{ contacto.metodo }}` cuyo método lance `ZeroDivisionError` da un `500` normal. O sea: **las búsquedas fallan en silencio, las excepciones no**.
>
> Las dos formas de defenderse: cuando algo no aparezca, lo primero es comprobar cómo está escrito, no por qué la vista no lo manda. Y en desarrollo se puede hacer que los fallos griten, poniendo en `TEMPLATES`, dentro de `OPTIONS`:
>
> ```python title="agenda/settings.py"
> TEMPLATES = [
>     {
>         # ...
>         'OPTIONS': {
>             'string_if_invalid': '### VARIABLE DESCONOCIDA: %s ###',
>         },
>     },
> ]
> ```
>
> Con eso, los tres huecos de arriba salen marcados en la página. Se pone solo en desarrollo, porque en producción ensuciaría las páginas.

## Filtros

Un filtro transforma un valor, se aplica con `|` y se puede encadenar:

```html
{{ s|lower|title|truncatewords:2 }}   ->  Hola Que …
```

Los argumentos van detrás de dos puntos, sin espacios. Los que se usan de verdad:

| Filtro | Qué hace |
| --- | --- |
| `default:"x"` | Usa `x` si el valor es falso: vacío, cero, `None` |
| `default_if_none:"x"` | Usa `x` solo si es `None` |
| `length` | Cuántos elementos tiene |
| `upper`, `lower`, `title`, `capfirst` | Mayúsculas y minúsculas |
| `truncatewords:n`, `truncatechars:n` | Cortar |
| `date:"formato"` | Dar formato a una fecha |
| `join:", "` | Unir una lista |
| `pluralize` | La `s` del plural |
| `yesno:"sí,no"` | Convertir un booleano en texto |
| `linebreaks`, `linebreaksbr` | Saltos de línea en `<p>` o en `<br>` |
| `safe` | No escapar este valor |
| `floatformat:2` | Decimales |

La diferencia entre `default` y `default_if_none` se ve mejor con las dos juntas:

```salida
[{{ n|default_if_none:"nada" }}][{{ v|default:"vacio" }}]   ->  [nada][vacio]
```

`default` salta con cualquier cosa falsa, y eso incluye el cero. Para un contador, `{{ total|default:"ninguno" }}` enseña `ninguno` cuando el total es cero, que casi nunca es lo que se quería. Con números, `default_if_none`.

`pluralize` es más útil de lo que parece en español:

```html
{{ n }} contacto{{ n|pluralize }}              ->  2 contactos
{{ n }} direcci{{ n|pluralize:"ón,ones" }}     ->  2 direcciones
```

Sin argumento añade una `s`; con dos valores separados por coma, elige entre singular y plural. La segunda forma es la que resuelve el español.

### Fechas

`date` usa un formato propio que no es el de `strftime`:

```html
{{ c.creado|date:"d/m/Y H:i" }}                ->  22/09/2026 18:29
{{ c.creado|date:"j \d\e F \d\e Y" }}          ->  22 de septiembre de 2026
```

El segundo sale en español por el `LANGUAGE_CODE` de la lección 5, sin instalar nada. Las letras sueltas hay que escaparlas con barras, porque casi todas significan algo.

Hay tres formatos con nombre que respetan el idioma sin tener que escribir nada: `{{ fecha|date:"SHORT_DATE_FORMAT" }}`, `"DATE_FORMAT"` y `"DATETIME_FORMAT"`. Son los que conviene usar cuando el formato exacto da igual.

## Etiquetas

### `for`

```html
{% for contacto in contactos %}
  <li>{{ contacto.nombre }}</li>
{% empty %}
  <li>No hay contactos.</li>
{% endfor %}
```

`{% empty %}` es el bloque que sale cuando la lista está vacía, y ahorra el `{% if %}` de alrededor.

Dentro del bucle hay una variable `forloop`:

| `forloop.*` | Qué es |
| --- | --- |
| `counter` | El número, empezando en 1 |
| `counter0` | El número, empezando en 0 |
| `first`, `last` | Si es el primero o el último |
| `revcounter` | Los que quedan |
| `parentloop` | El `forloop` del bucle de fuera |

```salida
{% for x in l %}{{ forloop.counter }}:{{ x }}{% if not forloop.last %}, {% endif %}{% endfor %}
1:a, 2:b, 3:c
```

Para recorrer un diccionario se usa `items`, como en Python pero sin paréntesis:

```html
{% for clave, valor in datos.items %}{{ clave }}={{ valor }}{% endfor %}
```

### `if`

```html
{% if contacto.telefono %}
  <a href="tel:{{ contacto.telefono }}">Llamar</a>
{% elif contacto.correo %}
  <a href="mailto:{{ contacto.correo }}">Escribir</a>
{% else %}
  Sin forma de contacto
{% endif %}
```

Admite `==`, `!=`, `<`, `>`, `<=`, `>=`, `in`, `not in`, `is`, `and`, `or` y `not`. Es casi Python, con la diferencia de que no hay paréntesis para agrupar: cuando la condición necesita paréntesis, es que le toca a la vista.

### `with`

Guarda un valor calculado para no repetirlo:

```html
{% with total=contactos.count %}
  Hay {{ total }} contacto{{ total|pluralize }}.
{% endwith %}
```

Esto no es solo comodidad. `contactos.count` **es una consulta a la base de datos**, y escribirlo tres veces en la plantilla son tres consultas. `with` la hace una vez.

## El escapado

Ya se vio en la lección anterior: todo lo que se inserta se escapa.

```salida
{{ h }} || {{ h|safe }}     ->  &lt;b&gt;x&lt;/b&gt; || <b>x</b>
```

`safe` desactiva el escapado de ese valor, y `{% autoescape off %}` lo desactiva para un bloque entero.

> [!aviso] `safe` sobre datos de una persona es el agujero
>
> La regla es corta y no tiene excepciones prácticas:
>
> **`safe` solo sobre HTML que has escrito tú o que ha generado tu código.** Nunca sobre algo que viene de un formulario, de una base de datos alimentada por gente o de una API ajena.
>
> El caso legítimo típico es un texto que tú mismo has convertido de Markdown a HTML en la vista, o un fragmento que construyes con `format_html`, que escapa los argumentos y deja el HTML fijo:
>
> ```python
> from django.utils.html import format_html
>
> format_html('<strong>{}</strong>', contacto.nombre)
> ```
>
> Esa función es la forma correcta de construir HTML desde Python, porque escapa lo variable y no lo fijo. `mark_safe` sobre una f-string es exactamente lo que no hay que hacer, y es el mismo agujero de la lección 1 con otro nombre.

> [!nota] Por qué el lenguaje es así de limitado
>
> Django tiene una postura sobre esto y conviene conocerla, aunque no se comparta. La idea es que la plantilla es la capa de presentación y que quien la toca puede no ser quien programa, así que el lenguaje limita a propósito lo que se puede hacer ahí.
>
> La alternativa existe y también viene soportada: **Jinja2**, que es el motor de Flask, permite llamadas con argumentos, expresiones y mucho más, y se configura como un motor adicional en `TEMPLATES`. Es más rápido y más flexible.
>
> El precio de cambiar es que el panel de administración, los formularios y casi todas las aplicaciones de terceros traen plantillas del motor de Django, así que acabas con los dos. Para este módulo, y para la mayoría de los proyectos, el de Django sobra.

> [!resumen] En resumen
>
> Una plantilla es un fichero de texto con huecos, con tres sintaxis: `{{ }}` escribe, `{% %}` hace algo y `{# #}` es un comentario que no llega al navegador. El punto sirve para cuatro cosas —clave de diccionario, atributo, método sin paréntesis e índice— y se prueban en ese orden, lo que impide usar claves que no sean identificadores. El lenguaje es pequeño a propósito: no hay aritmética, ni llamadas con argumentos, ni asignaciones, ni importaciones, y cuando algo no se puede hacer la respuesta correcta es calcularlo en la vista o en el modelo y pasarlo hecho. El comportamiento que más tiempo hace perder es que las búsquedas fallidas son silenciosas: una variable mal escrita deja un hueco vacío con respuesta `200`, aunque una excepción lanzada dentro de un método sí propaga; en desarrollo se puede marcar con `string_if_invalid`. Los filtros transforman valores, se encadenan con `|` y llevan argumentos detrás de dos puntos, y conviene distinguir `default`, que salta con cualquier valor falso incluido el cero, de `default_if_none`. Las fechas usan un formato propio que ya sale en español por el `LANGUAGE_CODE`. Las etiquetas principales son `for`, con su `{% empty %}` y su variable `forloop`, `if` con casi todos los operadores de Python salvo los paréntesis, y `with`, que además de ahorrar repetición ahorra consultas. Y todo lo que se inserta se escapa, de modo que `safe` solo se usa sobre HTML propio, nunca sobre lo que escribe una persona.

> [!ejercicio] Practica
>
> 1. Escribe una plantilla que recorra los contactos numerándolos con `forloop.counter` y que ponga una coma entre todos menos detrás del último.
> 2. Provoca los tres fallos silenciosos: una variable que no existe, un atributo inventado y un nombre mal escrito. Después activa `string_if_invalid` y compruébalos otra vez.
> 3. Intenta sumar dos números con `{{ 2 + 2 }}` y lee el error. Consíguelo con `add`.
> 4. Usa `default` sobre un contador que vale cero y comprueba que sale el valor por defecto. Arréglalo con `default_if_none`.
> 5. Da formato a la fecha de creación de tres maneras: con `d/m/Y`, con el día y el mes en letra, y con `SHORT_DATE_FORMAT`. Cambia `LANGUAGE_CODE` a inglés y mira qué pasa con las tres.
> 6. Guarda en las notas de un contacto un texto con `<b>` y enséñalo con y sin `safe`. Explica en una frase por qué la segunda forma es peligrosa aquí.
