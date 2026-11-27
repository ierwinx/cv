---
titulo: "Filtros, búsqueda y ordenación"
resumen: "El filtro con una errata que devuelve las doscientas filas creyendo que filtró, y la búsqueda que no encuentra a Óscar si lo escribes en minúscula."
minutos: 16
orden: 19
---

Un listado sin filtros obliga a quien consume la API a traerse todo y filtrar en su lado, que es lo peor para los dos. DRF trae tres piezas que lo resuelven, y una de ellas necesita un paquete.

Lo interesante es dónde avisan y dónde no: un valor mal escrito da `400` y **un nombre de parámetro mal escrito no da nada**.

> [!objetivo] Qué vas a aprender
>
> Montar filtros, búsqueda y ordenación, saber qué se valida y qué se ignora en silencio, conocer los dos problemas de la búsqueda con acentos, y no abrir la puerta a que quien consume la API consulte lo que no debe.

## Las tres piezas

```python
from django_filters import rest_framework as filtros
from rest_framework import filters


class LibroViewSet(viewsets.ReadOnlyModelViewSet):
        queryset = Libro.objects.select_related('editorial').prefetch_related('autores')
    serializer_class = LibroSerializer

    filter_backends = [filtros.DjangoFilterBackend,
                       filters.SearchFilter,
                       filters.OrderingFilter]
    filterset_fields = ['estado', 'editorial']
    search_fields = ['titulo', 'isbn', 'autores__nombre']
    ordering_fields = ['titulo', 'precio', 'publicado_en']
    ordering = ['titulo']
```

| Pieza | Parámetro | De dónde sale |
| --- | --- | --- |
| Filtros | `?estado=publicado` | `django-filter`, un paquete |
| Búsqueda | `?search=algo` | DRF |
| Ordenación | `?ordering=-precio` | DRF |

Solo la primera necesita instalar algo:

```bash
pip install django-filter
```

Y añadir `'django_filters'` a las aplicaciones. Es de los paquetes que casi todo proyecto con DRF acaba teniendo.

El `ordering = ['titulo']` de abajo es el orden por defecto, y **no es opcional**: sin un orden estable, la paginación de la lección siguiente devuelve filas repetidas y saltadas, que es exactamente el problema que la lección 9 vio desde el lado del cliente.

## Filtros a medida

Los campos sueltos cubren la igualdad. Para lo demás, una clase:

```python
class LibroFiltro(filtros.FilterSet):
        precio_min = filtros.NumberFilter(field_name='precio', lookup_expr='gte')
    precio_max = filtros.NumberFilter(field_name='precio', lookup_expr='lte')
    editorial = filtros.CharFilter(field_name='editorial__nombre',
                                   lookup_expr='iexact')
    publicado_desde = filtros.DateFilter(field_name='publicado_en',
                                         lookup_expr='gte')

    class Meta:
                model = Libro
        fields = ['estado', 'editorial', 'precio_min', 'precio_max',
                  'publicado_desde']
```

```python
filterset_class = LibroFiltro
```

Funcionando sobre doscientos libros:

```salida
(sin filtro)                  -> 200 filas
?estado=publicado             -> 120
?precio_min=40                ->  24
?precio_min=40&precio_max=42  ->   9
?editorial=Anagrama           ->  41
?publicado_desde=2024-01-01   ->  67
```

Lo bueno de la clase es que **los nombres de la API no son los del modelo**: quien la usa escribe `precio_min` y `editorial=Anagrama`, sin saber que por dentro hay un `gte` y una relación. Es lo de la lección 11 aplicado a los parámetros.

## Lo que se valida y lo que no

Aquí está el contraste de la lección. Un valor mal puesto da error:

```salida
?estado=inventado        -> 400  {"estado": ["Escoja una opción válida.
                                   inventado no es una de las opciones disponibles."]}
?precio_min=hola         -> 400  {"precio_min": ["Introduzca un número."]}
?publicado_desde=nofecha -> 400  {"publicado_desde": ["Introduzca una fecha válida."]}
```

Perfecto: mensajes claros, en español, con el nombre del parámetro.

> [!aviso] Y un nombre mal escrito no da nada
>
> ```salida
> sin filtro                   -> 200, 200 filas
> ?estadoo=publicado (errata)  -> 200, 200 filas
> ?ordering=paginas            -> 200, 200 filas, sin ordenar por páginas
> ?ordering=inventado          -> 200, 200 filas
> ?cualquier_cosa=1            -> 200, 200 filas
> ```
>
> **Los cuatro se ignoran en silencio.** Y el segundo es el que hace daño: un cliente que pide `?estadoo=publicado` recibe `200` con las doscientas filas, **cree que ha filtrado** y procesa datos que no debía.
>
> Fíjate en que es el mismo fallo que el `PATCH` con errata de la lección 13, con la misma causa —lo que no se reconoce se descarta— y las mismas consecuencias: éxito aparente, resultado incorrecto.
>
> El tercero tiene su propio matiz: `paginas` **existe en el modelo** pero no está en `ordering_fields`, así que se ignora. Es el comportamiento correcto desde el punto de vista de la seguridad y es indistinguible de una errata desde el del cliente.
>
> Lo mínimo es documentar los parámetros, que es la lección 21 y lo hace sola con `django-filter`. Y si quieres avisar:
>
> ```python
> class FiltroEstricto(filtros.DjangoFilterBackend):
>         def filter_queryset(self, peticion, consulta, vista):
>                 conjunto = self.get_filterset(peticion, consulta, vista)
>         if conjunto is not None:
>                         conocidos = set(conjunto.filters) | {'search', 'ordering', 'page', 'page_size', 'format'}
>             sobran = set(peticion.query_params) - conocidos
>             if sobran:
>                                 raise ValidationError(
>                     {'detail': f'Parámetros desconocidos: {", ".join(sorted(sobran))}'})
>         return super().filter_queryset(peticion, consulta, vista)
> ```
>
> Es la misma discusión que en la lección 13: estupendo mientras se desarrolla, discutible en producción porque rompe a los clientes antiguos. El término medio vuelve a ser registrarlo y mirarlo.

## La búsqueda

```python
search_fields = ['titulo', 'isbn', 'autores__nombre']
```

Busca el texto en todos esos campos y devuelve lo que encaje en cualquiera. Y tiene dos comportamientos que conviene conocer.

**Varias palabras se exigen todas**, aunque puedan estar en campos distintos:

```salida
?search=número      -> 200
?search=7           -> 201
?search=número 7    -> 200      (los que tienen las dos cosas)
```

**Y las comillas buscan la frase entera**, cosa que casi nadie sabe:

```salida
?search="número 7"  ->  11
```

Once, que son los títulos donde esas dos palabras van juntas y en ese orden. Es un buscador más capaz de lo que aparenta.

Los prefijos cambian el tipo de búsqueda:

| Prefijo | Qué hace |
| --- | --- |
| ninguno | Contiene, sin distinguir mayúsculas |
| `^titulo` | Empieza por |
| `=titulo` | Exacto |
| `@titulo` | Búsqueda de texto completo (solo PostgreSQL) |
| `$titulo` | Expresión regular |

> [!aviso] La búsqueda no encuentra a Óscar en minúscula
>
> Con un autor que se llama `Óscar Núñez`:
>
> ```salida
> ?search=Óscar  ->  6
> ?search=óscar  ->  0
> ?search=Oscar  ->  0
> ?search=Núñez  ->  6
> ?search=Nunez  ->  0
> ```
>
> **Dos problemas distintos en esas cinco líneas.**
>
> El primero es el de la lección 37 del módulo 4: **sin tilde no encuentra nada**. Alguien que escriba `Nunez` en un buscador, que es lo normal, no encuentra a Núñez.
>
> El segundo es peor y es el que sorprende: **`óscar` en minúscula tampoco encuentra nada**, aunque la búsqueda sea insensible a mayúsculas. La causa es que en SQLite la función que pasa a minúsculas **solo funciona con caracteres ASCII**, así que la `Ó` nunca se convierte y la comparación falla.
>
> Es decir: en SQLite, la búsqueda solo funciona si escribes las tildes **y** las mayúsculas exactamente como están guardadas. Para un idioma con tildes, eso es no funcionar.
>
> En PostgreSQL —la lección 41 del módulo 4— la mitad se arregla sola: la conversión a minúsculas entiende Unicode, así que `óscar` sí encuentra a `Óscar`. Lo de la tilde sigue:
>
> ```salida
> PostgreSQL:  ?search=óscar -> encuentra     ?search=oscar -> no encuentra
> ```
>
> Y se arregla con la extensión `unaccent`, que es lo que la lección 37 del módulo 4 dejó preparado:
>
> ```sql
> CREATE EXTENSION IF NOT EXISTS unaccent;
> ```
>
> ```python
> class BuscadorSinTildes(filters.SearchFilter):
>         def filter_queryset(self, peticion, consulta, vista):
>                 terminos = self.get_search_terms(peticion)
>         if not terminos:
>                         return consulta
>         condicion = Q()
>         for termino in terminos:
>                         for campo in self.get_search_fields(vista, peticion):
>                                 condicion |= Q(**{f'{campo}__unaccent__icontains': termino})
>         return consulta.filter(condicion).distinct()
> ```
>
> **Y la comprobación es una prueba que busque una palabra con tilde escrita sin ella.** Es una línea y es la que nadie escribe, porque en las pruebas siempre se busca `test` o `foo`, que no tienen acentos.

## La ordenación

```python
ordering_fields = ['titulo', 'precio', 'publicado_en']
ordering = ['titulo']
```

```salida
?ordering=precio   -> ['8.10', '8.11', '8.14']
?ordering=-precio  -> ['44.79', '44.63', '44.33']
```

El guion delante invierte, y se pueden encadenar con comas: `?ordering=-precio,titulo`.

> [!aviso] Nunca `ordering_fields = '__all__'`
>
> Es la opción que existe y que no debe usarse, por dos motivos.
>
> **Deja ordenar por campos que no publicas.** Ordenar por `coste_interno` sin poder verlo permite **deducirlo**: pides la lista ordenada por coste y ya sabes el orden relativo de todos tus productos. Con unas cuantas peticiones combinando filtros, se reconstruye bastante.
>
> **Y deja ordenar por campos sin índice**, que es una consulta que recorre la tabla entera. Con un millón de filas, quien consuma la API puede tumbar tu base de datos con un parámetro.
>
> La lista explícita es la defensa, y la regla es la misma que para los campos del serializador: **enumera lo que sí, nunca lo que no.** Y conviene que lo que enumeres tenga índice, que es la lección 14 del módulo 4.

> [!nota] El filtro que protege, y el que no
>
> Hay que distinguir dos cosas que se parecen y hacen trabajos opuestos.
>
> **`get_queryset` decide qué puede ver ese usuario.** Es seguridad, es la lección 18, y no la controla quien consume la API.
>
> **Los filtros deciden qué quiere ver de lo que puede.** Es comodidad, y la controla el cliente entero.
>
> El orden es importante y DRF lo hace bien: primero el conjunto de datos, después los filtros. Así ningún filtro puede ampliar lo que se ve.
>
> Lo que sí puede pasar es lo contrario, y es sutil: **un filtro sobre una relación puede revelar datos de objetos que no ves.** Si permites `?editorial__usuario__email=algo`, quien lo use está preguntando por correos que no publicas, y la respuesta —que haya o no resultados— se los va confirmando de uno en uno.
>
> Por eso los filtros sobre relaciones se declaran uno a uno, con `field_name` explícito, y no con la forma automática:
>
> ```python
> # MAL: abre todas las relaciones del modelo
> filterset_fields = {'editorial': ['exact'], 'editorial__usuario__email': ['exact']}
>
> # BIEN: solo lo que decides
> class LibroFiltro(filtros.FilterSet):
>         editorial = filtros.CharFilter(field_name='editorial__nombre', lookup_expr='iexact')
> ```

> [!consejo] Filtrar cuesta consultas, y a veces cuesta índices
>
> Dos cosas que se notan cuando la tabla crece.
>
> **Un filtro sobre una relación múltiple duplica filas.** Buscar por `autores__nombre` devuelve un libro tantas veces como autores coincidan, y por eso la búsqueda de DRF pone `.distinct()`. Si escribes filtros a mano sobre relaciones múltiples, tienes que ponerlo tú, y su ausencia se nota como resultados repetidos que parecen un error de datos.
>
> **Y un filtro sin índice recorre la tabla.** La comprobación es la de la lección 14 del módulo 4:
>
> ```python
> print(Libro.objects.filter(estado='publicado').explain())
> ```
>
> Con `SCAN` en la salida, falta un índice. Y como los filtros de la API los elige quien la consume, **hay que indexar todo lo que dejes filtrar**, no solo lo que uses tú.
>
> Es otra razón para que `filterset_fields` sea una lista corta y pensada: cada campo que añades es un índice que tienes que mantener.

> [!resumen] En resumen
>
> Tres piezas resuelven los listados: filtros con un paquete, búsqueda y ordenación con lo que trae DRF. Una clase de filtros permite que los nombres de la API no sean los del modelo. El contraste importante es qué se valida: un **valor** mal puesto da `400` con un mensaje claro en español, y un **nombre de parámetro** mal escrito se ignora en silencio, de modo que un cliente con una errata recibe `200` con la tabla entera creyendo que filtró; es el mismo fallo que el `PATCH` con errata y con las mismas consecuencias. La búsqueda es más capaz de lo que parece —exige todas las palabras y admite frases entre comillas— y tiene un problema serio con el español: en SQLite no encuentra `óscar` en minúscula ni `Nunez` sin tilde, porque la conversión a minúsculas solo entiende ASCII; PostgreSQL arregla las mayúsculas y para las tildes hace falta la extensión correspondiente, y la prueba que lo detecta es buscar una palabra acentuada escrita sin acento, que es la que nadie escribe. En la ordenación, el comodín no debe usarse: deja ordenar por campos que no publicas, lo que permite deducirlos, y por campos sin índice, lo que permite tumbar la base de datos con un parámetro. El orden por defecto no es opcional, porque sin él la paginación repite y salta filas. Y hay que distinguir el conjunto de datos, que es seguridad y decide qué se ve, de los filtros, que son comodidad; los filtros sobre relaciones se declaran uno a uno, porque los automáticos convierten la API en un oráculo sobre datos que no publicas.

> [!ejercicio] Practica
>
> 1. Monta las tres piezas y comprueba que los tres parámetros funcionan.
> 2. Escribe una clase de filtros con un rango y un filtro sobre una relación.
> 3. Manda un valor inválido a cada filtro y mira los tres errores.
> 4. Manda un nombre de parámetro con una errata y cuenta las filas que devuelve.
> 5. Escribe el filtro estricto que rechaza los parámetros desconocidos.
> 6. Busca dos palabras y después la misma frase entre comillas, y compara.
> 7. Busca un nombre con tilde escribiéndolo con y sin ella, y en minúscula.
> 8. Repite la búsqueda sobre PostgreSQL y anota qué cambia.
> 9. Escribe la prueba que busca una palabra acentuada sin el acento.
> 10. Pon el comodín en la ordenación y ordena por un campo que no publicas.
> 11. Quítalo y comprueba que ese campo se ignora.
> 12. Quita el orden por defecto y mira qué pasa al paginar.
> 13. Explica el plan de una consulta filtrada y busca si falta un índice.
