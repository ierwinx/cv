---
titulo: "Vistas de API y genéricas"
resumen: "Cuatro capas de abstracción, los diez renglones que hay detrás de cada una, y el `201` al que le falta una cabecera."
minutos: 16
orden: 15
---

DRF ofrece cuatro formas de escribir una vista, y van de "escríbelo todo tú" a "una línea". La tentación es empezar por la última, y el problema es que entonces no sabes qué hacer cuando algo no encaja.

Esta lección recorre las cuatro de abajo arriba, enseñando **qué código te ahorra cada capa**, para que la magia deje de serlo.

> [!objetivo] Qué vas a aprender
>
> Escribir vistas en los cuatro niveles de abstracción, saber qué genera cada uno y dónde están los puntos de extensión, y conocer los códigos y cabeceras que devuelve DRF, incluida la que falta.

## Nivel 1: una función

Lo más básico, y sigue siendo útil:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET', 'POST'])
def libros(peticion):
        if peticion.method == 'GET':
                serializador = LibroSerializer(Libro.objects.all(), many=True)
        return Response(serializador.data)

    serializador = LibroSerializer(data=peticion.data)
    serializador.is_valid(raise_exception=True)
    serializador.save()
    return Response(serializador.data, status=status.HTTP_201_CREATED)
```

El decorador es lo que convierte una vista de Django en una de DRF, y hace cuatro cosas:

**Convierte la petición** en una de DRF, con `peticion.data` que entiende JSON, formularios y varias partes por igual. Es la diferencia con `request.POST`, que solo entiende formularios.

**Convierte `Response`** al formato que pida el cliente, que es la negociación de contenido de la lección 12.

**Rechaza los métodos que no están** en la lista, con un `405`.

**Traduce las excepciones.** Ese `raise_exception=True` es la pieza clave: convierte los errores de validación en un `400` con el JSON de la lección 13, sin escribir nada.

El `@api_view` es la respuesta correcta para un punto de acceso suelto que no es un recurso: una comprobación de salud, un informe, algo que recibe un fichero.

## Nivel 2: `APIView`

Lo mismo con un método por verbo, que se lee mejor:

```python
from rest_framework.views import APIView


class LibroLista(APIView):
        def get(self, peticion):
                serializador = LibroSerializer(Libro.objects.all(), many=True)
        return Response(serializador.data)

    def post(self, peticion):
                serializador = LibroSerializer(data=peticion.data)
        serializador.is_valid(raise_exception=True)
        serializador.save()
        return Response(serializador.data, status=status.HTTP_201_CREATED)
```

La ventaja sobre la función es que los permisos, la autenticación y el límite de uso se declaran como atributos:

```python
class LibroLista(APIView):
        permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]
```

Sigue sin haber nada automático: si quieres paginación o filtros, los escribes.

## Nivel 3: las genéricas

Aquí aparece la magia, y es poca:

```python
from rest_framework import generics


class LibroLista(generics.ListCreateAPIView):
        queryset = Libro.objects.select_related('editorial')
    serializer_class = LibroSerializer


class LibroDetalle(generics.RetrieveUpdateDestroyAPIView):
        queryset = Libro.objects.select_related('editorial')
    serializer_class = LibroSerializer
```

Cuatro líneas dan el recurso completo, con paginación y filtros incluidos. Y están hechas de piezas:

```salida
ListAPIView                   [ListModelMixin, GenericAPIView]
CreateAPIView                 [CreateModelMixin, GenericAPIView]
ListCreateAPIView             [ListModelMixin, CreateModelMixin, GenericAPIView]
RetrieveUpdateDestroyAPIView  [RetrieveModelMixin, UpdateModelMixin,
                               DestroyModelMixin, GenericAPIView]
```

Cinco piezas que se combinan. Y cada pieza son diez renglones:

```python
class ListModelMixin:
        def list(self, request, *args, **kwargs):
                queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
                        serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

**Ahí está toda la magia de un listado**, y merece leerse despacio porque enseña los puntos de extensión:

| Método | Para qué se sobrescribe |
| --- | --- |
| `get_queryset()` | Filtrar por el usuario, por permisos, por lo que sea |
| `filter_queryset()` | Los filtros de la petición (lección 19) |
| `paginate_queryset()` | La paginación (lección 20) |
| `get_serializer()` | Elegir el serializador según la acción (lección 14) |

Y el de crear enseña el suyo:

```python
class CreateModelMixin:
        def create(self, request, *args, **kwargs):
                serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def perform_create(self, serializer):
                serializer.save()
```

Fíjate en que `perform_create` existe **solo para que lo sobrescribas**. Es el sitio donde poner lo que hay que hacer al guardar:

```python
def perform_create(self, serializador):
        serializador.save(autor=self.request.user)
```

Esa línea es la que asigna el usuario actual, y es la equivalente al `form_valid` de la lección 25 del módulo 4. Ponerlo ahí y no en el serializador tiene un motivo: **el serializador no debería saber de peticiones HTTP.**

> [!aviso] Los tres sitios donde se filtra, y el único seguro
>
> `get_queryset` es la defensa principal de una API, y hay que ponerla en el sitio correcto:
>
> ```python
> def get_queryset(self):
>         return Libro.objetos.filter(editorial=self.request.user.editorial)
> ```
>
> Así, quien pida `/api/libros/42/` de otra editorial recibe `404`, no `403`. Y eso es deliberado y correcto: un `403` confirma que el libro 42 existe, un `404` no confirma nada.
>
> Lo que **no** vale es filtrar en el serializador ni en la plantilla, porque el objeto ya se ha buscado y se puede llegar a él por otras rutas. Y lo que menos vale es filtrar solo en la lista:
>
> ```python
> # MAL: la lista filtra, el detalle no
> class LibroLista(generics.ListAPIView):
>         def get_queryset(self):
>                 return Libro.objetos.filter(editorial=self.request.user.editorial)
>
> class LibroDetalle(generics.RetrieveAPIView):
>         queryset = Libro.objects.all()          # aquí entra cualquiera
> ```
>
> Es un fallo muy común porque la lista es lo que se prueba a mano y el detalle no. Con un conjunto de vistas, que es la lección siguiente, el problema desaparece: hay un solo `get_queryset` para todas las acciones.

## Nivel 4: los conjuntos de vistas

Una clase por recurso, y el enrutador genera las rutas:

```python
class LibroViewSet(viewsets.ModelViewSet):
        queryset = Libro.objects.select_related('editorial').prefetch_related('autores')
    serializer_class = LibroSerializer
```

```salida
ModelViewSet: [CreateModelMixin, RetrieveModelMixin, UpdateModelMixin,
               DestroyModelMixin, ListModelMixin, GenericViewSet]

ReadOnlyModelViewSet: [RetrieveModelMixin, ListModelMixin, GenericViewSet]
```

Las mismas cinco piezas de antes, todas juntas. Y `ReadOnlyModelViewSet`, que son dos, merece recordarse: **para un recurso de consulta, es una palabra en vez de tres permisos.** Un catálogo público, un listado de países, cualquier cosa que nadie deba modificar.

Es la lección 16 entera, así que aquí solo la mención.

## Cuál usar

| Capa | Cuándo |
| --- | --- |
| `@api_view` | Un punto suelto que no es un recurso |
| `APIView` | Lo mismo, con permisos declarados o mucha lógica |
| Genéricas | Rutas a medida, o recursos que no son un CRUD entero |
| `ViewSet` | Un recurso con las cinco operaciones. **Lo normal.** |

La recomendación práctica es empezar por el conjunto de vistas para los recursos y usar `@api_view` para lo suelto, sin pasar por las capas intermedias. Y bajar de nivel cuando de verdad estorbe.

La señal de que has bajado demasiado tarde: un conjunto de vistas con `get_queryset`, `get_serializer_class`, `get_permissions`, tres acciones propias y dos condicionales por método. Eso ya no ahorra nada; ahí una `APIView` explícita se lee mejor.

> [!nota] Los códigos y cabeceras que devuelve
>
> Medido contra la API:
>
> ```salida
> GET    /api/autores/     -> 200   357 bytes
> GET    /api/autores/1/   -> 200    52 bytes
> POST   /api/autores/     -> 201    49 bytes
> PUT    /api/autores/1/   -> 200    39 bytes
> PATCH  /api/autores/1/   -> 200    39 bytes
> DELETE /api/autores/1/   -> 204     0 bytes
> ```
>
> Los correctos, y con dos detalles:
>
> **Las modificaciones devuelven el objeto**, no un cuerpo vacío. Es lo que permite al cliente detectar el `PATCH` con errata de la lección 13, comparando lo que pidió con lo que volvió.
>
> **El borrado devuelve `204` sin cuerpo**, que es el código que la lección 2 avisaba de no intentar leer como JSON.
>
> Y las cabeceras del `201`:
>
> ```salida
> Allow: GET, POST, HEAD, OPTIONS
> Content-Type: application/json
> Vary: Accept, Cookie
> X-Content-Type-Options: nosniff
>
> Location?  False
> ```
>
> **Falta `Location`.** Un `201` debería decir dónde quedó lo que acabas de crear, y DRF solo la pone si el serializador tiene un campo `url`, cosa que solo ocurre con los serializadores de enlaces. Con uno normal, no hay cabecera.
>
> No es grave, porque el cuerpo trae el objeto con su identificador. Es una desviación del estándar que conviene conocer, y si la quieres:
>
> ```python
> def get_success_headers(self, data):
>         if 'id' in data:
>                 return {'Location': self.request.build_absolute_uri(f'{data["id"]}/')}
>     return {}
> ```
>
> Fíjate también en el `Vary: Accept, Cookie`, que está bien puesto: dice a las cachés que la respuesta depende del formato pedido y de quién la pide. Sin eso, una caché intermedia podría servirle a un usuario la respuesta de otro.

> [!consejo] Dos cosas que hacen las vistas y no son evidentes
>
> **`raise_exception=True` no es opcional.** Sin él, `is_valid()` devuelve `False` y sigues tú:
>
> ```python
> if not serializador.is_valid():
>         return Response(serializador.errors, status=400)      # a mano
> serializador.is_valid(raise_exception=True)               # lo mismo, y consistente
> ```
>
> La segunda forma pasa por el manejador de excepciones de DRF, así que si mañana personalizas el formato de los errores —la lección 18—, **todos** cambian a la vez. La primera se queda fuera y produce una API con dos formatos de error distintos, que es peor que tener uno malo.
>
> **`OPTIONS` funciona gratis.** Una petición con ese método a cualquier vista de DRF devuelve qué acepta, qué campos tiene y qué tipos:
>
> ```bash
> curl -X OPTIONS -H "Accept: application/json" http://localhost:8000/api/libros/
> ```
>
> Es útil para explorar, y es información sobre tu esquema que estás dando a cualquiera. Con una API interna conviene mirarla y decidir.

> [!resumen] En resumen
>
> DRF tiene cuatro capas de vistas. El decorador de función hace cuatro cosas concretas: convierte la petición en una que entiende JSON y formularios por igual, convierte la respuesta al formato pedido, rechaza los métodos fuera de la lista, y traduce las excepciones de validación en un `400` con formato coherente. La clase base añade un método por verbo y los permisos como atributos. Las genéricas están hechas de cinco piezas combinables, y cada pieza son diez renglones que conviene leer, porque enseñan los cuatro puntos de extensión: el conjunto de datos, los filtros, la paginación y la elección de serializador, más el método que existe solo para sobrescribirlo al guardar, que es donde va la asignación del usuario actual y no en el serializador, porque este no debería saber de peticiones. Filtrar por usuario va en el conjunto de datos y no en otro sitio, y el fallo habitual es filtrar en la lista y olvidar el detalle, que un conjunto de vistas evita por construcción. Los conjuntos de vistas son las mismas cinco piezas juntas, y el de solo lectura merece recordarse. Los códigos que devuelve son los correctos, con las modificaciones devolviendo el objeto —lo que permite detectar el `PATCH` con errata— y el borrado sin cuerpo. Y al `201` **le falta la cabecera que dice dónde quedó lo creado**, porque DRF solo la pone con serializadores de enlaces.

> [!ejercicio] Practica
>
> 1. Escribe el mismo recurso en las cuatro capas y compara las líneas de cada una.
> 2. Comprueba qué pasa al pedir un método que no está en la lista del decorador.
> 3. Quita la conversión de excepciones y compara el error resultante con el de antes.
> 4. Lee el código fuente de dos piezas y localiza sus puntos de extensión.
> 5. Sobrescribe el método que se ejecuta al guardar para asignar el usuario actual.
> 6. Filtra el conjunto de datos por usuario y comprueba que el detalle devuelve `404` y no `403`.
> 7. Monta el fallo de filtrar solo en la lista y compruébalo con una petición al detalle.
> 8. Cambia un recurso a la versión de solo lectura y comprueba qué métodos deja de aceptar.
> 9. Mira las cabeceras de una respuesta de creación y busca la que falta.
> 10. Añádela sobrescribiendo el método correspondiente.
> 11. Haz una petición con el método que describe el recurso y mira cuánto cuenta de tu esquema.
