---
titulo: "Vistas basadas en clases"
resumen: "La otra forma de escribir vistas: un método por método HTTP, herencia en vez de copiar, y el precio de no ver el código que se ejecuta."
minutos: 15
orden: 22
---

Todas las vistas que llevas son funciones, y funcionan. Pero en la lección 16 apareció una estructura que se va a repetir en cada vista que modifique datos:

```python
def nuevo(peticion):
        if peticion.method == 'POST':
                ...
    return render(...)
```

Ese `if` es siempre el mismo, y lo que hay a cada lado es casi siempre lo mismo también. Cuando una estructura se repite idéntica en veinte sitios, la respuesta del módulo 1 fue sacarla a una clase base y heredar. Eso es exactamente lo que hace la otra mitad de Django.

> [!objetivo] Qué vas a aprender
>
> Escribir una vista como clase y entender qué hace `as_view`, saber cómo se reparten los métodos HTTP y qué se obtiene gratis, usar `TemplateView`, saber leer la jerarquía de una vista genérica, y tener un criterio para elegir entre función y clase.

## Una vista que es una clase

```python title="contactos/views_clase.py"
from django.http import HttpResponse
from django.views import View


class Saluda(View):
        def get(self, peticion):
                return HttpResponse('GET desde una clase')

    def post(self, peticion):
                return HttpResponse('POST desde una clase')
```

```python title="contactos/urls.py"
path('saluda/', views_clase.Saluda.as_view(), name='saluda'),
```

El `if peticion.method` ha desaparecido. **Cada método HTTP es un método de la clase**, con su nombre en minúsculas, y Django llama al que toca.

Lo que hay en el fichero de rutas no es la clase, es `Saluda.as_view()`. Ese método devuelve una función, porque Django solo sabe llamar funciones. Esa función, cuando llega una petición, **crea una instancia nueva de la clase** y le pasa el control.

Eso último tiene una consecuencia práctica que evita un error desagradable: la instancia dura lo que dura la petición y no se comparte con nadie. Guardar algo en `self` es seguro. Guardarlo en un atributo de clase, no, porque eso sí se comparte entre peticiones.

## Lo que sale gratis

```salida
GET      -> 200
POST     -> 200
PUT      -> 405  Allow: GET, POST, HEAD, OPTIONS
DELETE   -> 405  Allow: GET, POST, HEAD, OPTIONS
HEAD     -> 200
OPTIONS  -> 200  Allow: GET, POST, HEAD, OPTIONS
```

Esa tabla es buena parte del argumento a favor de las clases, y sale sin escribir nada.

`PUT` y `DELETE` dan **`405` con su cabecera `Allow`**, que es exactamente lo que pedía la lección 2, y la clase sabe qué poner ahí porque sabe qué métodos tiene definidos. Con una función, el `405` hay que ponerlo a mano y la cabecera casi nadie la pone.

`OPTIONS` se contesta solo, que es lo que preguntan los navegadores antes de una petición desde otro dominio.

Y `HEAD` funciona porque lo atiende el `get`: mismas cabeceras, sin cuerpo, tal como manda la especificación.

## `TemplateView`

Lo más habitual es una página que solo pinta una plantilla. Para eso hay una clase hecha:

```python title="contactos/views_clase.py"
from django.views.generic import TemplateView


class Portada(TemplateView):
        template_name = 'contactos/portada.html'

    def get_context_data(self, **kwargs):
                contexto = super().get_context_data(**kwargs)
        contexto['total'] = Contacto.objects.count()
        return contexto
```

```salida
total=5
```

No hay `get`, no hay `render`, no hay `return`. Solo dos cosas: **qué plantilla** y **qué va en el contexto**.

El `super().get_context_data(**kwargs)` de la primera línea no es opcional. Lo que devuelve trae cosas que otras piezas esperan encontrar, entre ellas `view`, que es la propia vista:

```salida
view=<contactos.views_clase.Portada object at 0x10bb16510>
```

Saltarse esa llamada y devolver un diccionario propio funciona hasta que algo de más arriba deja de encontrar lo suyo, y entonces el fallo es raro y lejano. **Se llama al padre, se añade lo tuyo, se devuelve.** Ese patrón de tres líneas se repite en todo el bloque.

Que `view` esté en el contexto tiene un efecto secundario cómodo: desde la plantilla se puede llamar a cualquier método de la vista con `{{ view.lo_que_sea }}`.

> [!nota] Cuando no hay contexto que añadir
>
> Si la página es fija del todo, la clase no hace falta ni escribirla:
>
> ```python
> path('acerca/', TemplateView.as_view(template_name='acerca.html'), name='acerca'),
> ```
>
> Los atributos de clase se pueden pasar a `as_view()` como argumentos. Vale para las páginas estáticas del sitio y también para probar rápido, y es la razón de que muchos proyectos tengan una línea así en el fichero de rutas y ninguna vista.

## La jerarquía

Aquí está lo que hay que entender de verdad, porque es donde las vistas de clase se vuelven opacas. Esto es lo que hay detrás de `ListView`:

```salida
ListView
    MultipleObjectTemplateResponseMixin
    TemplateResponseMixin
    BaseListView
    MultipleObjectMixin
    ContextMixin
    View
    object
```

Siete clases. Ese es el precio: **el código que se ejecuta no está donde escribes**, está repartido en una cadena de clases que no has abierto nunca.

El reparto, que una vez visto se reconoce en todas:

| Trozo del nombre | De qué se ocupa |
| --- | --- |
| `View` | Recibir la petición y llamar al método del verbo |
| `...Mixin` | Una pieza suelta: obtener los objetos, el contexto, el formulario |
| `Base...` | La lógica sin decidir cómo se responde |
| `TemplateResponseMixin` | Responder con una plantilla |
| El nombre completo | Juntarlo todo |

Los nombres se leen: `MultipleObjectMixin` sabe conseguir una lista de objetos; `TemplateResponseMixin` sabe pintar una plantilla; `ListView` es las dos cosas a la vez. Por eso existen las parejas `BaseListView` y `ListView`: la primera sirve para responder con JSON, por ejemplo.

Y una que importa por lo que permite:

```salida
http_method_names: ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']
```

Recortar esa lista en una clase limita los métodos que acepta, que es la versión de clase del `require_POST` de la lección 16.

> [!consejo] Cómo se averigua qué hace una vista genérica
>
> Es la habilidad que separa usarlas de sufrirlas, y son dos recursos.
>
> **El código fuente.** Está en `django/views/generic/` y es corto y legible. Merece la pena abrir `list.py` una vez en la vida: son unas cien líneas y explican `ListView` entera.
>
> **Classy Class-Based Views**, en `ccbv.co.uk`. Enseña cada vista con **todos** sus métodos y atributos heredados en una sola página, ya aplanados. Es lo que se consulta cuando no sabes qué método sobrescribir.
>
> Y la pregunta práctica al enfrentarte a una vista genérica es siempre la misma: *¿qué método tengo que sobrescribir para cambiar esto?* Casi siempre es uno de estos cuatro: `get_queryset`, `get_context_data`, `form_valid` o `get_success_url`.

## Función o clase

Las dos formas conviven en el mismo proyecto sin problema, así que no hay que elegir de una vez.

**Una función se lee entera.** Todo lo que pasa está delante. Para algo que no se parece a nada, para una vista con lógica rara, para un endpoint suelto, la función gana y no hay discusión.

**Una clase se configura.** Cuando la vista es una de las cuatro o cinco cosas de siempre —listar, ver, crear, editar, borrar—, la clase son tres líneas y la función son veinte, y esas veinte están copiadas de otra vista.

El criterio que funciona:

| Situación | Qué elegir |
| --- | --- |
| Listar, ver, crear, editar o borrar, sin nada raro | Clase genérica |
| Lo mismo con un par de retoques | Clase, sobrescribiendo un método |
| Lógica que no se parece a un CRUD | Función |
| Estás aprendiendo qué hace Django | Función |
| Sobrescribes cuatro métodos y ya no sabes qué corre | Función, otra vez |

Esa última fila es importante y a mucha gente le cuesta llegar a ella. **Una vista genérica con seis métodos sobrescritos es peor que la función equivalente**, porque tiene la longitud de la función y encima hay que saberse la jerarquía para leerla. Cuando llegues ahí, reescribirla como función no es retroceder.

> [!nota] Por qué las vistas de clase tienen mala fama
>
> La crítica habitual es que son magia: no se ve qué se ejecuta, hay que aprenderse una jerarquía y el salto de "esto es cómodo" a "esto no sé cómo tocarlo" es muy corto.
>
> La crítica es justa. Lo que la equilibra es que **el bloque de formularios y el de usuarios están construidos sobre ellas**: `FormView`, `LoginRequiredMixin`, `PermissionRequiredMixin` y `UserPassesTestMixin` son clases, y hacen con una línea lo que a mano son diez. Se pueden usar con funciones a base de decoradores, pero se nota.
>
> La postura práctica de este curso, y la que tiene mucha gente que lleva años: **usar las genéricas cuando encajan sin pelear, y una función en cuanto haya que pelear.**

> [!resumen] En resumen
>
> Una vista puede ser una clase que hereda de `View`, con un método por cada verbo HTTP, y en el fichero de rutas se pone `as_view()`, que devuelve una función y crea una instancia nueva por petición, así que guardar cosas en `self` es seguro y en atributos de clase no. A cambio del cambio de forma salen gratis el `405` con su cabecera `Allow` correcta, la respuesta a `OPTIONS` y el soporte de `HEAD`, que con funciones hay que escribir a mano. `TemplateView` reduce una página a dos decisiones, qué plantilla y qué contexto, y el método que añade contexto tiene que llamar al padre antes de añadir lo suyo, porque lo que devuelve trae cosas que otras piezas esperan. El precio de todo esto es la jerarquía: detrás de una vista genérica hay siete clases y el código que se ejecuta no está donde escribes, así que hay que saber leer los nombres —los `Mixin` son piezas sueltas, los `Base` son la lógica sin la respuesta— y tener a mano el código fuente o una referencia aplanada como Classy Class-Based Views. El criterio para elegir es que las clases ganan cuando la vista es una de las cinco cosas de siempre y las funciones ganan cuando la lógica es propia o cuando estás aprendiendo; y si acabas sobrescribiendo media docena de métodos, la función equivalente es mejor código.

> [!ejercicio] Practica
>
> 1. Convierte la vista de lista a una clase que herede de `View` con un método `get`. Comprueba que sigue funcionando igual.
> 2. Prueba esa dirección con `PUT`, `DELETE` y `OPTIONS` usando `curl -i` y mira los códigos y la cabecera `Allow`.
> 3. Reescríbela como `TemplateView` con `template_name` y `get_context_data`.
> 4. Quita la llamada a `super()` en `get_context_data` y devuelve solo tu diccionario. Comprueba qué deja de estar en el contexto.
> 5. Añade una página fija resolviéndola con un `TemplateView.as_view(template_name=...)` en el fichero de rutas, sin escribir ninguna vista.
> 6. Imprime el `__mro__` de `DetailView` y busca en el código fuente de Django en qué clase está el método `get_object`.
> 7. Recorta `http_method_names` en una de tus clases para que solo acepte `get` y comprueba qué devuelve un `POST`.
