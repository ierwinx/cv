---
titulo: "ListView y DetailView"
resumen: "Dos clases que sustituyen las dos vistas que ya tienes, la paginación que sale sola, y los nombres que hay que adivinar."
minutos: 15
orden: 23
---

Las dos vistas que escribiste en la lección 16 hacen lo que hacen el noventa por ciento de las páginas de cualquier sitio: enseñar una lista y enseñar un elemento. Django trae las dos hechas.

Lo interesante no es que ahorren líneas, que también. Es que traen resuelto lo que se te olvida: la paginación, el `404` cuando no existe, el filtrado por parámetros de la dirección. Y a cambio piden aprenderse unos cuantos nombres que no están escritos en ninguna parte de tu código, que es la pega de la lección anterior en su forma más concreta.

> [!objetivo] Qué vas a aprender
>
> Sustituir las dos vistas por `ListView` y `DetailView`, conocer los nombres de plantilla y de contexto que se inventan solas, sobrescribir `get_queryset` y `get_context_data` para filtrar y añadir datos, montar la paginación con `page_obj`, y localizar el sitio correcto donde va el `select_related`.

## `ListView`

La versión más corta que existe:

```python title="contactos/views_clase.py"
from django.views.generic import ListView

from .models import Contacto


class ListaMinima(ListView):
        model = Contacto
```

Una línea de cuerpo. Con eso hace la consulta, pagina si se lo pides, prepara el contexto y elige la plantilla. Pero:

```salida
HTTP 500
TemplateDoesNotExist: contactos/contacto_list.html
```

Falta la plantilla, y ahí está el primer nombre inventado. **`ListView` busca `aplicacion/modelo_list.html`**, todo en minúsculas, con el nombre del modelo pegado al `_list`. No lo has escrito en ningún sitio: sale de `model`.

Con la plantilla puesta:

```salida
Claves: object_list=5 contacto_list=5
```

Y ahí está el segundo: los objetos llegan al contexto con **dos nombres**, `object_list` y `contacto_list`, el segundo formado igual que la plantilla. El genérico sirve para escribir plantillas reutilizables y el específico se lee mejor.

> [!consejo] Los nombres que se inventan, en una tabla
>
> Esta es la chuleta de la lección. Merece la pena tenerla a mano las dos primeras semanas.
>
> |  | Plantilla | Contexto |
> | --- | --- | --- |
> | `ListView` | `app/modelo_list.html` | `object_list`, `modelo_list` |
> | `DetailView` | `app/modelo_detail.html` | `object`, `modelo` |
> | `CreateView`, `UpdateView` | `app/modelo_form.html` | `form`, `object` |
> | `DeleteView` | `app/modelo_confirm_delete.html` | `object`, `modelo` |
>
> Fíjate en que `CreateView` y `UpdateView` **comparten plantilla**, que es cómodo y sorprende la primera vez.
>
> Y los dos atributos para no depender de esto: `template_name` fija la plantilla y `context_object_name` fija el nombre. En un proyecto de verdad conviene poner al menos el segundo, porque una plantilla que usa `object_list` no dice qué contiene.

## Una versión completa

```python title="contactos/views_clase.py"
class ListaCompleta(ListView):
        model = Contacto
    template_name = 'contactos/lista_cbv.html'
    context_object_name = 'contactos'
    paginate_by = 2

    def get_queryset(self):
                consulta = super().get_queryset().select_related('grupo')
        buscado = self.request.GET.get('q')
        if buscado:
                        consulta = consulta.filter(nombre__icontains=buscado)
        return consulta

    def get_context_data(self, **kwargs):
                contexto = super().get_context_data(**kwargs)
        contexto['buscado'] = self.request.GET.get('q', '')
        return contexto
```

Cuatro atributos y dos métodos, y ya es una lista paginada con buscador. Los dos métodos son los que se sobrescriben siempre:

**`get_queryset` decide qué objetos.** Empieza llamando al padre, que devuelve `model.objects.all()`, y encadena lo tuyo. Es el sitio del `select_related`, del `filter` y del `order_by`.

**`get_context_data` añade lo que no son los objetos**: el término buscado, los grupos para un desplegable, lo que haga falta. Con el `super()` de la lección anterior, que no es opcional.

Y fíjate en `self.request`. Dentro de una vista de clase, la petición está en `self`, no en un parámetro. Con ella se llega a `self.request.GET`, `self.request.user` y `self.kwargs`, que es donde están los trozos capturados de la dirección.

> [!aviso] El `select_related` va en `get_queryset`, no en el `model`
>
> Es el error de rendimiento propio de esta lección. Un `ListView` con `model = Contacto` y una plantilla que recorre los contactos tocando el grupo tiene el N+1 de la lección 13, y **no se ve por ninguna parte**, porque no hay ninguna consulta escrita en la vista.
>
> Puesto donde toca, la página entera son dos consultas:
>
> ```salida
> con select_related: 2 consultas
>     SELECT COUNT(*) AS "__count" FROM "contactos_contacto"
>     SELECT "contactos_contacto"."id", "contactos_contacto"."nombre", ...
> ```
>
> La segunda es la de los datos. **La primera es de la paginación**, que necesita saber cuántos hay en total para calcular el número de páginas. Es decir: paginar cuesta una consulta extra, siempre.
>
> Con tablas normales da igual. Con millones de filas, ese `COUNT(*)` es el cuello de botella, y la salida es no paginar con números sino con un botón de "siguiente", que es lo que hacen las redes sociales y por lo que no te dicen cuántas publicaciones hay.

## Paginación

`paginate_by` mete tres cosas en el contexto: `paginator`, `page_obj` y `is_paginated`. Medidas:

```salida
PAGINA: 1 de 3  total=5  hay_paginas=True
ANT: no  SIG: 2
NOMBRES: Ana Ruiz; Luis Pardo;

PAGINA: 2 de 3  total=5  hay_paginas=True
ANT: 1  SIG: 3
NOMBRES: Por id; Sin grupo;
```

La página se elige con un parámetro en la dirección, `?page=2`, y una que no existe da `404`:

```salida
?page=99  ->  404
```

Lo que casi siempre se escribe igual, y conviene tenerlo en un trozo incluido de los de la lección 18:

```html title="contactos/templates/contactos/_paginacion.html"
{% if is_paginated %}
<nav class="paginacion">
  {% if page_obj.has_previous %}
    <a href="?page={{ page_obj.previous_page_number }}">Anterior</a>
  {% endif %}

  <span>Página {{ page_obj.number }} de {{ paginator.num_pages }}</span>

  {% if page_obj.has_next %}
    <a href="?page={{ page_obj.next_page_number }}">Siguiente</a>
  {% endif %}
</nav>
{% endif %}
```

> [!aviso] La paginación se come el buscador
>
> Ese trozo tiene un fallo que se ve en cuanto hay un filtro, y lo tiene medio internet.
>
> Con `?q=ana&page=2`, el enlace de arriba genera `?page=3` **y pierde el `q`**. Vas a la página tres de la lista sin filtrar, que no es lo que pedías.
>
> Lo mínimo es arrastrar el parámetro:
>
> ```html
> <a href="?q={{ buscado|urlencode }}&page={{ page_obj.next_page_number }}">Siguiente</a>
> ```
>
> Y con dos o tres filtros eso ya no se sostiene, así que lo que se hace es un filtro propio que reconstruya la cadena de consulta cambiando solo `page`. Es un buen ejercicio de la lección 19, y es de esas cosas que se escriben una vez y se copian de proyecto en proyecto.
>
> El `urlencode` tampoco es decorativo: sin él, un término buscado con un espacio o una tilde rompe el enlace.

## `DetailView`

```python
class DetalleCbv(DetailView):
        model = Contacto
```

```python
path('cbv/<int:pk>/', views_clase.DetalleCbv.as_view(), name='cbv-detalle'),
```

```salida
Claves: object=Ana Ruiz  contacto=Ana Ruiz
```

Busca `contactos/contacto_detail.html` y deja el objeto con los dos nombres, igual que antes. El `get_object_or_404` está dentro: si no existe, `404`.

Lo único que hay que saber es **de dónde saca el objeto**, porque depende de lo que capture la ruta:

| En la ruta | Qué hace |
| --- | --- |
| `<int:pk>` | Busca por clave primaria |
| `<slug:slug>` | Busca por el campo `slug` del modelo |
| `<slug:slug>` con `slug_field = 'url'` | Busca por el campo `url` |

Si la ruta no captura ni `pk` ni `slug`, la vista lanza una excepción explicando que no sabe qué buscar. Y si hace falta otra cosa —el objeto de la persona que ha entrado, por ejemplo—, se sobrescribe `get_object`.

`DetailView` también tiene `get_queryset`, y ahí es donde va el `select_related` y, sobre todo, el filtro de seguridad:

```python
def get_queryset(self):
        return super().get_queryset().filter(propietario=self.request.user)
```

Con eso, pedir la ficha de otra persona da `404` en lugar de enseñarla. Es el patrón correcto y vuelve en el bloque de usuarios.

> [!nota] Qué hacer cuando la página tiene una lista *y* un formulario
>
> El límite de estas dos clases se nota enseguida: una página con la ficha de un grupo **y** la lista paginada de sus contactos no es ni `DetailView` ni `ListView`.
>
> Las tres salidas, de mejor a peor:
>
> **Un `ListView` con el grupo añadido en `get_context_data`.** Si lo que se pagina es la lista, la lista manda. Es casi siempre la respuesta.
>
> **Un `DetailView` con la lista en el contexto.** Vale si la lista no se pagina.
>
> **Una función.** Si además hay un formulario, es la lección 22 otra vez: cuando hay que sobrescribir medio objeto, la función se lee mejor.
>
> Lo que no conviene es heredar de las dos a la vez. Se puede, se ve por ahí, y el resultado no lo entiende nadie a los seis meses.

> [!resumen] En resumen
>
> `ListView` y `DetailView` resuelven las dos páginas más comunes con un atributo `model`, y a cambio se inventan nombres que no aparecen en tu código: la plantilla es `app/modelo_list.html` o `app/modelo_detail.html` y los objetos llegan al contexto con un nombre genérico y otro derivado del modelo; `template_name` y `context_object_name` sirven para no depender de eso. Los dos métodos que se sobrescriben siempre son `get_queryset`, que decide qué objetos y es donde van el `select_related`, el `filter` y el `order_by`, y `get_context_data`, que añade lo demás; los dos empiezan llamando al padre. Dentro de la clase la petición está en `self.request` y los trozos capturados de la dirección en `self.kwargs`. El N+1 aquí es especialmente fácil de pasar por alto porque no hay ninguna consulta escrita a la vista. `paginate_by` da la paginación con `paginator`, `page_obj` e `is_paginated`, elige página con `?page=`, devuelve `404` si no existe y cuesta una consulta extra de recuento; y el trozo de paginación que se copia por ahí pierde los filtros al cambiar de página, que es un fallo real y frecuente. `DetailView` saca el objeto de lo que capture la ruta, `pk` o `slug`, y su `get_queryset` es el sitio donde se filtra por permisos para que lo ajeno dé `404`. Cuando la página no es ni una lista ni una ficha, lo razonable es elegir la que mande y añadir lo demás al contexto, o volver a una función.

> [!ejercicio] Practica
>
> 1. Sustituye tu vista de lista por un `ListView` con solo `model` y deja que falle. Lee el nombre de plantilla que pide y créala con ese nombre exacto.
> 2. Comprueba en la plantilla que los objetos están con los dos nombres. Después pon `context_object_name` y mira cuál sigue funcionando.
> 3. Añade `paginate_by = 2` y cuenta las consultas de la página con `connection.queries`. Explica de dónde sale la de más.
> 4. Monta la paginación en un trozo incluido. Añade un buscador con `?q=` y comprueba que al pasar de página se pierde. Arréglalo.
> 5. Pon `select_related` en `get_queryset` y compara las consultas con y sin él.
> 6. Sustituye la vista de detalle por un `DetailView`. Prueba un identificador que no existe.
> 7. Haz una página con la ficha de un grupo y la lista paginada de sus contactos. Decide cuál de las dos clases usar y justifica la elección en una frase.
