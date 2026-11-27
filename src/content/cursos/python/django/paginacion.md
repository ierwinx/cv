---
titulo: "Paginación"
resumen: "La clase que hay debajo de `paginate_by`, el aviso que casi nadie ve, y por qué la página mil tarda más que la primera."
minutos: 14
orden: 36
---

La lección 23 puso `paginate_by = 2` en un `ListView` y salió una lista paginada. Esta lección abre esa caja, porque hay tres cosas que conviene saber y que allí quedaron apuntadas de pasada: cómo se pagina una vista de función, qué aviso salta cuando la consulta no está ordenada, y por qué este mecanismo se vuelve lento con muchas filas.

> [!objetivo] Qué vas a aprender
>
> Usar `Paginator` directamente en una vista de función, elegir entre `page` y `get_page`, entender el aviso de la consulta sin ordenar y por qué importa, conocer el coste real de paginar, y saber cuándo hace falta paginar por cursor.

## `Paginator`

```python
from django.core.paginator import Paginator

paginador = Paginator(Contacto.objects.order_by('nombre'), 3)
```

```salida
count: 13 | num_pages: 5 | per_page: 3
page_range: [1, 2, 3, 4, 5]
```

Recibe cualquier cosa contable y troceable —un `QuerySet`, una lista, una tupla— y el tamaño de página. Y una página es esto:

```salida
number: 2 | objetos: ['Con foto', 'Luis Pardo', 'Nuevo MF']
has_next: True | has_previous: True
start_index: 4 | end_index: 6
len(page): 3
```

`start_index` y `end_index` son los que permiten escribir "mostrando del 4 al 6 de 13", que se agradece más de lo que parece. Y la página **se recorre directamente** con un `{% for %}`, sin tener que entrar a `object_list`.

## En una vista de función

```python title="contactos/views.py"
from django.core.paginator import Paginator


def lista(peticion):
        contactos = Contacto.objects.select_related('grupo').order_by('nombre')
    paginador = Paginator(contactos, 20)
    pagina = paginador.get_page(peticion.GET.get('page'))
    return render(peticion, 'contactos/lista.html', {'pagina': pagina})
```

Cuatro líneas. En la plantilla, el mismo trozo de la lección 23, con el nombre que hayas elegido en lugar de `page_obj`:

```html
{% for contacto in pagina %}
  <li>{{ contacto.nombre }}</li>
{% endfor %}
```

Y ahí está la conexión con la lección 23: eso es literalmente lo que hace `ListView` por dentro, y `page_obj` es el nombre con el que lo deja en el contexto.

## `page` o `get_page`

Los dos sacan una página y se comportan de forma muy distinta con lo que llega de la dirección:

```salida
page(99)     -> EmptyPage: Esa página no contiene resultados
page(0)      -> EmptyPage: Este número de página es menor que 1
page('abc')  -> PageNotAnInteger: Este número de página no es un entero
page(None)   -> PageNotAnInteger: Este número de página no es un entero
```

```salida
get_page(99)     -> página 5
get_page(0)      -> página 5
get_page('abc')  -> página 1
get_page(None)   -> página 1
```

`page` lanza y `get_page` **nunca falla**. Como lo que llega en `?page=` es texto que escribe cualquiera, `get_page` es lo que se usa en las vistas, y por eso la vista de arriba no tiene ni un `try`.

Hay una rareza ahí que conviene mirar dos veces: **`get_page(0)` devuelve la última página**, no la primera. El motivo es que `0` produce un `EmptyPage`, y ante un `EmptyPage` la función devuelve la última; los valores que no son números producen `PageNotAnInteger` y devuelven la primera. Es coherente por dentro y sorprende por fuera.

Cuando quieras el comportamiento de `ListView`, que es devolver `404`, hay que usar `page` y capturar:

```python
from django.core.paginator import EmptyPage, PageNotAnInteger
from django.http import Http404

try:
        pagina = paginador.page(peticion.GET.get('page'))
except PageNotAnInteger:
        pagina = paginador.page(1)
except EmptyPage:
        raise Http404('Esa página no existe')
```

Las dos posturas son defendibles. Devolver la primera página es más amable; devolver `404` evita que los buscadores indexen mil direcciones con el mismo contenido.

> [!aviso] `UnorderedObjectListWarning`, el aviso que nadie lee
>
> ```salida
> UnorderedObjectListWarning: Pagination may yield inconsistent results
> with an unordered object_list: <class 'contactos.models.Grupo'> QuerySet.
> ```
>
> Sale en la consola del servidor, entre el ruido de las peticiones, y se pasa por alto siempre. Y avisa de un fallo real.
>
> Sin `ORDER BY`, la base de datos **no garantiza ningún orden** y puede devolver las filas de forma distinta en cada consulta. Como cada página es una consulta aparte, pasar de la uno a la dos puede enseñar dos veces la misma fila y saltarse otra. Nadie se queja porque parece cosa de la suerte, y es exactamente eso.
>
> El arreglo es ordenar, y lo mejor es hacerlo en el `Meta` del modelo con el `ordering` de la lección 15, porque así no hay que acordarse en cada vista. Por eso el aviso salió con `Grupo`, que no lo tiene, y no con `Contacto`, que sí.
>
> Y un detalle: **el orden tiene que ser único**. Ordenar por un campo con valores repetidos deja el desempate en manos de la base de datos y vuelve el mismo problema, más raro. Lo habitual es añadir la clave primaria al final:
>
> ```python
> ordering = ['nombre', 'pk']
> ```

## Lo que cuesta

```salida
solo count:  1 consulta  ->  SELECT COUNT(*) FROM "contactos_contacto"
la página:   1 consulta  ->  SELECT ... ORDER BY "nombre" ASC LIMIT 3 OFFSET 3
```

Dos consultas siempre, como se midió en la lección 23. La primera es el recuento, que hace falta para saber cuántas páginas hay, y la segunda son los datos.

Lo interesante es el `OFFSET`, porque explica un comportamiento que desconcierta cuando la tabla crece: **una base de datos no sabe saltarse filas sin leerlas**. Para `OFFSET 20000` lee veinte mil filas, las descarta y devuelve las veinte siguientes.

O sea que **la página mil tarda mil veces más que la primera**. Con tablas pequeñas da igual; con un millón de filas, las últimas páginas son inutilizables.

Y el `COUNT(*)` tiene el mismo problema por su cuenta: contar un millón de filas no es gratis, y se hace **en cada carga de cada página**.

> [!consejo] Las tres formas de paginar y cuándo usar cada una
>
> **Con números de página**, que es lo de esta lección. Se ven todas las páginas, se puede saltar a una concreta y se sabe cuántas hay. Es lo correcto hasta unas decenas de miles de filas, que es la mayoría de los proyectos.
>
> **Solo con "siguiente"**, quitando el recuento. Se sigue usando `OFFSET`, así que el problema de las páginas lejanas sigue ahí, pero desaparece el `COUNT`. Es el paso intermedio y se consigue con el atributo:
>
> ```python
> class Lista(ListView):
>         paginate_by = 20
>     paginator_class = Paginator   # con una subclase cuyo count devuelva un valor fijo
> ```
>
> **Por cursor**, que es lo que hacen las redes sociales y por lo que no te dicen cuántas publicaciones hay. En vez de saltar filas, se pide lo que viene después del último elemento visto:
>
> ```python
> siguientes = Contacto.objects.filter(nombre__gt=ultimo).order_by('nombre')[:20]
> ```
>
> ```salida
> SQL: ... WHERE "nombre" > 'Luis Pardo' ORDER BY "nombre" ASC LIMIT 3
> ```
>
> Una sola consulta, sin recuento y **sin `OFFSET`**. Con un índice sobre ese campo, la página un millón cuesta lo mismo que la primera.
>
> El precio es real: no se puede ir a una página concreta, no se sabe cuántas hay, y hacia atrás hay que invertir el orden. Además el campo del cursor tiene que ser único y estable, o se pierden filas en los empates; en la práctica se usa la clave primaria, o una pareja como fecha y clave.
>
> El criterio: **números de página hasta que se note, y cursor cuando se note.** Empezar por cursor sin necesitarlo es complicarse.

> [!nota] La paginación que se ve, no la que funciona
>
> Con cien páginas, el trozo de la lección 23 pinta cien enlaces. Lo que se espera es algo como `1 … 7 8 [9] 10 11 … 100`, y eso hay que calcularlo.
>
> `page_range` da la lista entera, así que se recorta alrededor de la página actual. Conviene hacerlo en un filtro o una etiqueta de los de la lección 19, no en la vista, porque es presentación pura y se reutiliza en todas las listas.
>
> Y tres detalles de ese trozo que se olvidan y son los que distinguen una paginación acabada:
>
> **Arrastrar los filtros**, que es el fallo que ya se señaló en la lección 23 y que tiene medio internet: el enlace de siguiente pierde el `?q=`.
>
> **Las etiquetas `rel="prev"` y `rel="next"`**, que los navegadores y los buscadores entienden.
>
> **Que los enlaces sean enlaces de verdad**, con su dirección, y no botones de JavaScript. Es lo que permite abrir en otra pestaña, compartir y volver atrás.

> [!resumen] En resumen
>
> Debajo de `paginate_by` hay una clase `Paginator` que recibe cualquier cosa contable y troceable y el tamaño de página, y devuelve objetos de página que se recorren directamente y que saben en qué posición empiezan y acaban. En una vista de función son cuatro líneas, y lo que se elige es `get_page`, que nunca falla porque el número llega de la dirección y lo escribe cualquiera; conviene saber que ante un cero devuelve la última página y ante algo que no es un número, la primera. Si se prefiere el `404` de `ListView`, hay que usar `page` y capturar sus dos excepciones. El aviso de consulta sin ordenar avisa de un fallo real: sin `ORDER BY` la base de datos no garantiza el orden y pasar de página puede repetir filas y saltarse otras, así que conviene poner el orden en el `Meta` del modelo y que sea único, normalmente añadiendo la clave primaria. Paginar cuesta dos consultas, y el `OFFSET` de la segunda explica que la página mil tarde mil veces más que la primera, porque la base de datos no puede saltarse filas sin leerlas; el recuento tiene el mismo problema y se repite en cada carga. Hay tres formas de paginar: con números, que vale hasta decenas de miles de filas; sin recuento, que quita una consulta; y por cursor, que pide lo que viene después del último elemento visto y cuesta lo mismo en la página un millón que en la primera, a cambio de no poder saltar a una página concreta.

> [!ejercicio] Practica
>
> 1. Pagina una vista de función con `Paginator` y comprueba que la plantilla de la lección 23 sirve igual.
> 2. Prueba `page` y `get_page` con un número que no existe, con un cero y con texto. Anota qué hace cada uno.
> 3. Enseña "mostrando del X al Y de Z" usando `start_index`, `end_index` y `count`.
> 4. Pagina un modelo sin `ordering` y busca el aviso en la consola del servidor. Arréglalo en el `Meta`.
> 5. Mira el SQL de la página tres y localiza el `LIMIT` y el `OFFSET`.
> 6. Escribe una etiqueta de plantilla que recorte `page_range` alrededor de la página actual.
> 7. Arregla la paginación para que arrastre el término buscado, y compruébalo con un filtro puesto.
> 8. Escribe una versión por cursor que use `pk__gt` y compara su SQL con la de `OFFSET`.
