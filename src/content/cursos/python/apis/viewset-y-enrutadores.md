---
titulo: "ViewSet y enrutadores"
resumen: "Una clase por recurso, las acciones que no caben en los cinco verbos, y el dinero que vuelve a ser un número en cuanto te saltas el serializador."
minutos: 16
orden: 16
---

Un conjunto de vistas agrupa las cinco operaciones de un recurso en una clase, y un enrutador genera las rutas a partir de ella. Es lo normal en DRF y es lo que conviene usar.

Lo interesante no es eso, que son dos líneas. Es lo que pasa cuando el recurso tiene **acciones que no son ninguna de las cinco**, que es la pregunta que la lección 11 dejó abierta.

> [!objetivo] Qué vas a aprender
>
> Escribir conjuntos de vistas y entender cómo se convierten en rutas, añadir acciones propias sobre la colección y sobre un objeto, elegir el serializador y los permisos según la acción, y conocer lo que se pierde al saltarse el serializador.

## Lo básico

```python
class LibroViewSet(viewsets.ModelViewSet):
        queryset = Libro.objects.select_related('editorial').prefetch_related('autores')
    serializer_class = LibroSerializer
```

```python
router = DefaultRouter()
router.register('libros', LibroViewSet)
urlpatterns = [path('api/', include(router.urls))]
```

La diferencia con las genéricas de la lección anterior no es de potencia, es de organización: en vez de dos clases y dos rutas escritas a mano, hay una clase y el enrutador deduce el resto. Con doce recursos, eso son doce líneas en lugar de cuarenta y ocho.

Y hay tres tipos que conviene distinguir:

| Clase | Qué trae |
| --- | --- |
| `ViewSet` | Nada. Escribes `list`, `retrieve`, etc. a mano |
| `GenericViewSet` | El conjunto de datos y el serializador, sin acciones |
| `ModelViewSet` | Las cinco acciones |
| `ReadOnlyModelViewSet` | Listar y consultar. Nada más |

**`ReadOnlyModelViewSet` es la más infravalorada.** Para un catálogo público o un listado de países, es una palabra en lugar de configurar permisos que impidan escribir. Y lo que no existe no se puede romper.

Con `GenericViewSet` y las piezas de la lección anterior se compone lo que quieras:

```python
class LibroViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   mixins.CreateModelMixin,
                   viewsets.GenericViewSet):
        """Se puede crear y consultar, pero no modificar ni borrar."""
```

Eso da un recurso donde no existe el borrado, y por tanto **no hay permiso que se pueda configurar mal**. Es mejor defensa que un permiso bien puesto.

## Las acciones propias

Aquí está la respuesta a la pregunta de la lección 11. Un decorador:

```python
from rest_framework.decorators import action


class LibroViewSet(viewsets.ModelViewSet):
        queryset = Libro.objects.select_related('editorial')
    serializer_class = LibroSerializer

    @action(detail=True, methods=['post'])
    def publicar(self, peticion, pk=None):
                libro = self.get_object()
        if libro.estado == Libro.Estado.PUBLICADO:
                        return Response({'detail': 'Ya estaba publicado.'},
                            status=status.HTTP_409_CONFLICT)
        libro.estado = Libro.Estado.PUBLICADO
        libro.publicado_en = timezone.now().date()
        libro.save(update_fields=['estado', 'publicado_en'])
        return Response(self.get_serializer(libro).data)

    @action(detail=False, url_path='mas-caros')
    def mas_caros(self, peticion):
                consulta = self.filter_queryset(self.get_queryset()).order_by('-precio')[:5]
        return Response(self.get_serializer(consulta, many=True).data)
```

Funcionando:

```salida
estado antes: borrador
POST /api/libros/2/publicar/   -> 200, estado: publicado
POST /api/libros/2/publicar/   -> 409  {"detail": "Ya estaba publicado."}
GET  /api/libros/mas-caros/    -> 200  ['44.79', '44.63', '44.33', '44.12', '44.10']
GET  /api/libros/2/publicar/   -> 405  {"detail": "Método \"GET\" no permitido."}
```

El `409` es la decisión de diseño que merece la pena: publicar dos veces **no es un error del cliente ni un éxito**, es un conflicto con el estado actual, y es el código que la lección 2 reservaba para eso.

`detail=True` o `detail=False` es lo único que hay que decidir:

|  | Ruta | Qué recibe |
| --- | --- | --- |
| `detail=True` | `/libros/42/publicar/` | Un objeto, con `self.get_object()` |
| `detail=False` | `/libros/mas-caros/` | La colección, con `self.get_queryset()` |

Y `self.get_object()` no es `Libro.objects.get(pk=pk)`: pasa por `get_queryset` y por los permisos de objeto de la lección 18. Usar el atajo se salta las dos cosas, que es un agujero de seguridad con forma de comodidad.

## Lo que genera el enrutador

```salida
^libros/$                              name=libro-list
^libros/mas-caros/$                    name=libro-top
^libros/novedades/$                    name=libro-novedades
^libros/(?P<pk>[^/.]+)/$               name=libro-detail
^libros/(?P<pk>[^/.]+)/publicacion/$   name=libro-publicacion
^libros/(?P<pk>[^/.]+)/publicar/$      name=libro-publicar
```

Fíjate en el orden: **las acciones de colección van antes que la ruta de detalle.** Es deliberado y necesario, porque `/libros/mas-caros/` encajaría con `/libros/<pk>/` y `mas-caros` acabaría interpretado como identificador. El enrutador lo resuelve, y es la clase de detalle que se agradece cuando se entiende por qué está.

Los nombres se personalizan:

```python
@action(detail=False, url_path='mas-caros', url_name='top')
def mas_caros(self, peticion):
        ...
```

**`url_path` es lo que se ve en la dirección** y **`url_name` lo que usas con `reverse`**. Por defecto los dos salen del nombre del método con los guiones bajos convertidos, que produce `/libros/mas_caros/` con guion bajo: feo en una dirección, y por eso conviene poner `url_path` a mano en cuanto el nombre lleva más de una palabra.

> [!aviso] El dinero deja de ser texto en cuanto te saltas el serializador
>
> La lección 11 estableció que el dinero viaja como texto, y DRF lo hace de fábrica. Y entonces escribes una acción así:
>
> ```python
> @action(detail=False)
> def estadisticas(self, peticion):
>         datos = self.get_queryset().aggregate(total=Count('id'), precio_medio=Avg('precio'))
>     return Response(datos)
> ```
>
> ```salida
> {"total": 200, "precio_medio": 25.38365}
> ```
>
> **Un número, no una cadena.** Comparado con lo que devuelve el mismo campo por el camino normal:
>
> ```salida
> por el serializador : "11.48"      (texto)
> por la acción propia: 25.38365     (coma flotante)
> lo que da la consulta: Decimal('25.3836500000000')
> ```
>
> El agregado devuelve un `Decimal` correcto, y al renderizar un diccionario crudo **DRF lo convierte a coma flotante**, porque la regla de convertir decimales a texto vive en el campo del serializador, no en el renderizador.
>
> Resultado: tu API devuelve dinero en dos formatos según el punto de acceso. Y el que vuelve como número es el que arrastra el problema de la lección 3.
>
> La solución es no devolver diccionarios crudos:
>
> ```python
> class EstadisticasSerializer(serializers.Serializer):
>         total = serializers.IntegerField()
>     precio_medio = serializers.DecimalField(max_digits=10, decimal_places=2)
>
>
> @action(detail=False)
> def estadisticas(self, peticion):
>         datos = self.get_queryset().aggregate(total=Count('id'), precio_medio=Avg('precio'))
>     return Response(EstadisticasSerializer(datos).data)
> ```
>
> ```salida
> {"total": 200, "precio_medio": "25.38"}
> ```
>
> Es uno de los casos de la lección 13 donde el serializador a mano es la respuesta correcta: no hay modelo detrás y sigue haciendo falta. Y de paso el punto de acceso aparece documentado en el esquema de la lección 21, cosa que con el diccionario crudo no pasa.

## Serializador y permisos por acción

Es lo que hace que un conjunto de vistas aguante un recurso real:

```python
class LibroViewSet(viewsets.ModelViewSet):
        queryset = Libro.objects.select_related('editorial').prefetch_related('autores')

    def get_serializer_class(self):
                if self.action == 'list':
                        return LibroListaSerializer
        if self.action in ('create', 'update', 'partial_update'):
                        return LibroEscrituraSerializer
        if self.action == 'estadisticas':
                        return EstadisticasSerializer
        return LibroDetalleSerializer

    def get_permissions(self):
                if self.action in ('list', 'retrieve'):
                        return [permissions.AllowAny()]
        if self.action == 'publicar':
                        return [EsEditor()]
        return [permissions.IsAdminUser()]
```

`self.action` vale `'list'`, `'retrieve'`, `'create'`, `'update'`, `'partial_update'`, `'destroy'` o **el nombre de tu acción propia**. Eso último es lo que permite que `publicar` tenga sus propios permisos sin tocar nada más.

Dos cuidados:

**`get_permissions` devuelve instancias, no clases.** Con los paréntesis. Olvidarlos da un error confuso a la hora de comprobar, no al arrancar.

**El `return` final es el que protege.** Si la cadena de condicionales acaba en algo permisivo, cualquier acción nueva que añadas quedará abierta. Que acabe en lo restrictivo es la misma idea de "cerrado por defecto" de la lección 12, dentro de la clase.

> [!nota] Recursos anidados
>
> La lección 11 admitía un nivel de anidamiento:
>
> ```salida
> /api/libros/42/resenas/
> ```
>
> DRF **no lo hace de serie**, y hay dos formas.
>
> **Con una acción**, que no necesita nada más:
>
> ```python
> @action(detail=True, methods=['get'])
> def resenas(self, peticion, pk=None):
>         libro = self.get_object()
>     consulta = libro.resenas.select_related('autor')
>     pagina = self.paginate_queryset(consulta)
>     return self.get_paginated_response(ResenaSerializer(pagina, many=True).data)
> ```
>
> Sencillo, y solo da lectura cómodamente. Fíjate en las dos líneas de paginación: sin ellas, la acción devuelve **todas** las reseñas, saltándose la configuración global. Es el mismo descuido que el de los decimales, con otra cara.
>
> **Con `drf-nested-routers`**, un paquete de terceros que da rutas anidadas completas con escritura.
>
> La recomendación práctica es la acción para leer y una ruta plana para escribir:
>
> ```salida
> GET  /api/libros/42/resenas/     las reseñas de ese libro
> POST /api/resenas/               crear una, con el libro en el cuerpo
> ```
>
> Menos elegante y evita la dependencia y las rutas de tres niveles.

> [!consejo] Lo que hay que mirar de un enrutador
>
> **`basename` es obligatorio si no hay `queryset`.** Si defines `get_queryset` en vez del atributo, el enrutador no puede deducir el nombre:
>
> ```salida
> ImproperlyConfigured: Could not resolve URL for hyperlinked relationship...
> ```
>
> ```python
> router.register('libros', LibroViewSet, basename='libro')
> ```
>
> Ponlo siempre, aunque no haga falta: hace explícitos los nombres que usarás con `reverse` en las pruebas.
>
> **El enrutador completo expone la raíz**, que lista todos tus recursos. Cómodo en desarrollo, y con una API interna es un mapa gratis para quien la explore. `SimpleRouter` no la pone.
>
> **Y duplica todas las rutas** con sufijos de formato, de modo que `/api/libros.json` funciona. Si no lo quieres:
>
> ```python
> router = DefaultRouter(trailing_slash=True)
> router.include_format_suffixes = False
> ```
>
> **Los enrutadores se pueden combinar.** Nada obliga a usar solo uno:
>
> ```python
> urlpatterns = [
>     path('api/', include(router.urls)),
>     path('api/salud/', comprobar_salud),          # un @api_view suelto
>     path('api/informe/', InformeAPIView.as_view()),
> ]
> ```
>
> Es lo normal en un proyecto real: el enrutador para los recursos y rutas explícitas para lo que no lo es.

> [!resumen] En resumen
>
> Un conjunto de vistas agrupa las cinco operaciones de un recurso y el enrutador deduce las rutas, lo que con doce recursos son doce líneas en lugar de cuarenta y ocho. El de solo lectura está infravalorado, y componer con piezas sueltas permite que una operación peligrosa **no exista**, que es mejor defensa que un permiso bien puesto. Las acciones propias resuelven lo que no cabe en los cinco verbos, con un decorador que solo pide decidir si operan sobre un objeto o sobre la colección; publicar dos veces algo ya publicado es un conflicto y no un error del cliente. El enrutador coloca las acciones de colección **antes** que la ruta de detalle, porque si no el nombre de la acción se interpretaría como identificador, y conviene darles una ruta a mano en cuanto tienen más de una palabra, porque el guion bajo queda feo en una dirección. Dentro de una acción hay que usar el método que busca el objeto pasando por permisos, y no el atajo de la consulta directa. El aviso importante es que **saltarse el serializador pierde las reglas de la API**: un diccionario crudo con un decimal se renderiza como coma flotante, así que el dinero deja de ser texto, y una acción sin las dos líneas de paginación devuelve todo; la solución es un serializador a mano, que además hace que el punto de acceso aparezca documentado. El serializador y los permisos se eligen por acción, y la cadena de condicionales debe acabar en lo restrictivo para que una acción nueva no quede abierta.

> [!ejercicio] Practica
>
> 1. Convierte dos vistas genéricas en un conjunto de vistas y cuenta las líneas que quitas.
> 2. Cambia un recurso a la versión de solo lectura y comprueba qué métodos desaparecen.
> 3. Compón un conjunto de vistas con piezas sueltas para que no exista el borrado.
> 4. Añade una acción sobre un objeto y comprueba que devuelve conflicto la segunda vez.
> 5. Añade una acción sobre la colección y mira el orden de las rutas generadas.
> 6. Ponle una ruta con guiones y comprueba la diferencia con el nombre por defecto.
> 7. Devuelve un diccionario crudo con un decimal y observa que sale como número.
> 8. Arréglalo con un serializador a mano y compara.
> 9. Escribe una acción que devuelva una lista sin paginar y comprueba cuántos elementos trae.
> 10. Añade las dos líneas de paginación y vuelve a comprobarlo.
> 11. Elige el serializador según la acción, incluida la propia.
> 12. Elige los permisos según la acción y comprueba que el caso final es el restrictivo.
> 13. Monta un recurso anidado con una acción y pagínalo.
