---
titulo: "Instalación y primer punto de acceso"
resumen: "Una API funcionando en veinte líneas, y las tres cosas que trae apagadas de fábrica: una de ellas deja que cualquiera borre tus datos."
minutos: 16
orden: 12
---

Django REST Framework se instala y funciona rápido. Tan rápido que se puede tener una API completa antes de haber entendido nada de lo que hace, y eso es exactamente el problema de esta lección.

Vamos a montarla, y después vamos a mirar los ajustes por defecto, que son la parte que no sale en los tutoriales y la que decide si la API es publicable.

> [!objetivo] Qué vas a aprender
>
> Instalar DRF y montar un punto de acceso completo, entender el navegador de la API y su coste, y conocer los ajustes de fábrica, en particular los tres que hay que cambiar antes de publicar nada.

## La instalación

```bash
pip install djangorestframework
```

```salida
Name: djangorestframework
Version: 3.18.1
Requires: django
```

**Una sola dependencia, y es Django.** Es de las bibliotecas grandes más limpias que hay, y conviene saberlo porque casi todos los tutoriales instalan a la vez cuatro paquetes de terceros que no hacen falta para empezar.

Se registra como una aplicación:

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'catalogo',
]
```

## El punto de acceso

Tres piezas. Primero el serializador, que convierte entre modelos y JSON y es la lección siguiente:

```python
from rest_framework import serializers

from .models import Libro


class LibroSerializer(serializers.ModelSerializer):
        class Meta:
                model = Libro
        fields = '__all__'
```

Después la vista:

```python
from rest_framework import viewsets


class LibroViewSet(viewsets.ModelViewSet):
        queryset = Libro.objects.all()
    serializer_class = LibroSerializer
```

Y las rutas:

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('libros', LibroViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

Con eso hay una API con lista, creación, consulta, modificación y borrado. Y la raíz del enrutador la enseña:

```salida
GET /api/

{
  "editoriales": "http://127.0.0.1:8077/api/editoriales/",
  "autores": "http://127.0.0.1:8077/api/autores/",
  "libros": "http://127.0.0.1:8077/api/libros/"
}
```

Un libro concreto:

```salida
GET /api/libros/1/

{
  "id": 1,
  "titulo": "El libro número 0",
  "isbn": "978-84-0000-00-0",
  "precio": "19.98",
  "paginas": 234,
  "estado": "publicado",
  "publicado_en": "2020-01-01",
  "creado": "2026-09-22T21:15:20.844072+02:00",
  "editorial": 1,
  "autores": [5]
}
```

Tres cosas que mirar antes de seguir:

**El precio va entre comillas.** Es la decisión de la lección anterior, y DRF la toma por ti con el ajuste `COERCE_DECIMAL_TO_STRING`, que vale `True` de fábrica. Acertado: si fuera número, el cliente lo leería como coma flotante.

**Las fechas son ISO 8601 con zona horaria**, que es lo que la lección 3 pedía.

**Las relaciones son identificadores.** `editorial: 1` y `autores: [5]`. Es lo que hay que cambiar en la lección 14.

## Los errores, en español

Esto es una alegría para un proyecto en español y casi nadie lo menciona. Con `LANGUAGE_CODE = 'es'`:

```salida
DELETE /api/libros/     -> 405  {"detail": "Método \"DELETE\" no permitido."}
POST /api/libros/ {}    -> 400  {"titulo": ["Este campo es requerido."],
                                 "isbn": ["Este campo es requerido."], ...}
```

**Traducidos solos**, sin configurar nada más. DRF viene con las traducciones dentro.

Y la forma de los errores es la de la lección 2, ahora desde el lado que los escribe: un objeto con `detail` cuando el problema es general, y un objeto con **una lista de mensajes por campo** cuando son de validación. Esa forma es razonable y merece la pena conocerla, porque es lo que van a recibir tus clientes.

> [!aviso] Un mensaje de error que sí se escapa
>
> No todo está traducido:
>
> ```salida
> GET /api/libros/9999/  ->  404  {"detail": "No Libro matches the given query."}
> ```
>
> En inglés, y además **con el nombre de tu clase de modelo dentro**. Ese mensaje viene de Django, no de DRF, así que se salta las traducciones de DRF.
>
> Son dos problemas en una línea. El de idioma se arregla; el otro es que estás contando a cualquiera cómo se llaman tus modelos, que es información gratis para quien busque agujeros.
>
> La forma de arreglarlo es un manejador de excepciones propio, y es la lección 18. Lo que importa ahora es saber que **el mensaje por defecto no es el que quieres publicar**, y que la comprobación es pedir una dirección que no existe y mirar qué contesta, cosa que casi nadie hace.

## El navegador de la API

Si abres `/api/libros/` en un navegador no sale JSON: sale una página con formularios para probar la API. Es la característica más llamativa de DRF.

Y funciona por negociación de contenido, que es la lección 2 desde el otro lado:

```salida
Accept: */*        -> application/json         54 044 bytes
Accept: text/html  -> text/html; charset=utf-8  132 253 bytes
```

Un navegador manda `text/html`, así que ve la página; `curl` manda `*/*` y recibe JSON. Por eso funciona sin que hayas configurado nada.

Es genuinamente útil para explorar y para enseñársela a alguien. Y tiene un coste que hay que conocer:

```salida
json  0,042 s  54 044 bytes
html  0,050 s  132 253 bytes
```

**Dos veces y media más grande**, porque construye formularios HTML con todas las opciones de todos los campos de todos los objetos. Con relaciones grandes, eso son desplegables de miles de elementos y la página tarda segundos.

En producción se apaga, dejando solo el renderizador de JSON:

```python
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
```

Y si quieres conservarlo en desarrollo, es la configuración por entornos de la lección 40 del módulo 4:

```python
# ajustes/desarrollo.py
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] += [
    'rest_framework.renderers.BrowsableAPIRenderer',
]
```

## Los ajustes de fábrica

Aquí está lo importante de la lección. Estos son los valores por defecto de DRF, medidos:

```salida
DEFAULT_RENDERER_CLASSES        [JSONRenderer, BrowsableAPIRenderer]
DEFAULT_PARSER_CLASSES          [JSONParser, FormParser, MultiPartParser]
DEFAULT_AUTHENTICATION_CLASSES  [SessionAuthentication, BasicAuthentication]
DEFAULT_PERMISSION_CLASSES      [AllowAny]
DEFAULT_THROTTLE_CLASSES        []
DEFAULT_PAGINATION_CLASS        None
PAGE_SIZE                       None
DEFAULT_FILTER_BACKENDS         []
COERCE_DECIMAL_TO_STRING        True
DATETIME_FORMAT                 iso-8601
```

Cuatro de esas líneas son las que hay que cambiar.

> [!aviso] Todo es público de fábrica
>
> `DEFAULT_PERMISSION_CLASSES` vale `[AllowAny]`, y eso significa exactamente lo que parece. Contra la API que acabamos de montar, sin identificarse de ninguna forma:
>
> ```salida
> libros antes:  200
> DELETE /api/libros/1/   sin identificarse  ->  204
> libros después: 199
>
> POST /api/autores/      sin identificarse  ->  201
> {"id": 6, "nombre": "Intruso", "nacimiento": null}
> ```
>
> **Un desconocido acaba de borrar un libro y crear un autor.** Sin usuario, sin token, sin nada.
>
> La decisión de DRF es defendible —no puede saber qué quieres— y el resultado es que **la configuración por defecto es publicable solo si tu API es de solo lectura y pública**. Que casi nunca es el caso.
>
> Lo mínimo, hoy mismo, antes de seguir:
>
> ```python
> REST_FRAMEWORK = {
>     'DEFAULT_PERMISSION_CLASSES': [
>         'rest_framework.permissions.IsAuthenticated',
>     ],
> }
> ```
>
> Así, cerrado por defecto, y se abre recurso por recurso lo que deba ser público. Es lo contrario de lo que hace DRF y es la única forma de que un descuido no publique nada: el día que añadas un recurso y olvides los permisos, quedará cerrado en lugar de abierto.
>
> Los permisos son la lección 18. Esta línea va antes, porque no es configuración avanzada: es lo que evita que la API que tienes ahora mismo funcionando sea un formulario de borrado abierto.

**No hay paginación.** `DEFAULT_PAGINATION_CLASS` es `None`, así que un listado devuelve **todo**:

```salida
GET /api/libros/  ->  200 elementos, 54 044 bytes, lista pelada
```

Con doscientos libros son cincuenta kilobytes. Con doscientos mil, la petición tumba el servidor. Y el problema añadido, que es el de la lección anterior: **activar la paginación cambia la forma de la respuesta** de una lista pelada a un objeto con envoltorio, así que hacerlo más tarde rompe a todos los clientes.

Se activa el primer día:

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}
```

Es la lección 20, y esas dos líneas van desde el principio.

**No hay límite de uso.** `DEFAULT_THROTTLE_CLASSES` está vacío: cualquiera puede pedir mil veces por segundo. Es todo el bloque A visto desde el otro lado, y se configura con `AnonRateThrottle` y `UserRateThrottle`.

> [!nota] Dos detalles del renderizador que se agradecen
>
> **DRF no escapa los acentos.** Comparado con el módulo estándar:
>
> ```salida
> DRF JSONRenderer :  b'{"titulo":"El n\xc3\xbamero \xc3\xb1"}'
> json.dumps       :  b'{"titulo": "El n\\u00famero \\u00f1"}'
> ```
>
> DRF usa `ensure_ascii=False`, que es lo que la lección 3 recomendaba: válido igual, legible, y un tercio menos de bytes en texto español. Aquí el valor por defecto es el bueno.
>
> **Y comprime los separadores**, quitando el espacio después de los dos puntos. Sobre respuestas grandes se nota.
>
> Si necesitas el JSON con sangrado para depurar, `?format=json&indent=2` funciona sin tocar nada.

> [!consejo] Los ajustes con los que empezar
>
> Esto es lo que va en `settings.py` el primer día, antes de escribir el segundo recurso:
>
> ```python
> REST_FRAMEWORK = {
>     # Cerrado por defecto: se abre recurso por recurso.
>     'DEFAULT_PERMISSION_CLASSES': [
>         'rest_framework.permissions.IsAuthenticated',
>     ],
>     # Desde el principio: activarla luego cambia la forma de las respuestas.
>     'DEFAULT_PAGINATION_CLASS':
>         'rest_framework.pagination.PageNumberPagination',
>     'PAGE_SIZE': 50,
>     # El navegable solo en desarrollo.
>     'DEFAULT_RENDERER_CLASSES': [
>         'rest_framework.renderers.JSONRenderer',
>     ],
>     'DEFAULT_THROTTLE_CLASSES': [
>         'rest_framework.throttling.AnonRateThrottle',
>         'rest_framework.throttling.UserRateThrottle',
>     ],
>     'DEFAULT_THROTTLE_RATES': {
>         'anon': '100/hour',
>         'user': '1000/hour',
>     },
> }
> ```
>
> Diecisiete líneas, y las cuatro decisiones que cuestan caro si se retrasan. Las tres primeras porque cambiarlas después rompe algo, y la cuarta porque hasta que esté puesta, tu API es gratis para quien quiera usarla de la forma que quiera.

> [!resumen] En resumen
>
> DRF se instala con una sola dependencia, que es Django, y una API completa son tres piezas: un serializador, un conjunto de vistas y un enrutador registrado. Lo que devuelve de fábrica ya trae dos aciertos de la lección 3, el dinero como texto entre comillas y las fechas en ISO 8601 con zona, y una carencia: las relaciones salen como identificadores pelados. Los errores están traducidos al español solos, con una forma razonable —un detalle general o una lista de mensajes por campo—, salvo el de recurso inexistente, que llega en inglés y con el nombre de tu clase de modelo dentro. El navegador de la API aparece por negociación de contenido cuando el cliente pide HTML, es muy útil para explorar y cuesta dos veces y media más bytes, así que se apaga en producción. Y lo importante son los ajustes de fábrica: **todo es público**, hasta el punto de que un desconocido puede borrar un libro y crear un autor contra la API recién montada; **no hay paginación**, así que un listado devuelve las doscientas filas de golpe y activarla después cambia la forma de la respuesta y rompe a los clientes; y **no hay límite de uso**, que es todo el bloque A visto desde el otro lado. Esas tres cosas, más apagar el navegable, son diecisiete líneas que van el primer día y no cuando la API ya está publicada.

> [!ejercicio] Practica
>
> 1. Instala DRF y comprueba cuántas dependencias arrastra.
> 2. Monta el primer punto de acceso con las tres piezas y pídelo con `curl`.
> 3. Abre la misma dirección en el navegador y compara lo que sale.
> 4. Mide los bytes de la respuesta HTML y de la JSON.
> 5. Pide un identificador que no exista y mira el mensaje de error.
> 6. Manda un `POST` vacío y observa la forma del error de validación.
> 7. Borra un objeto sin identificarte y comprueba que funciona.
> 8. Cuenta cuántos elementos devuelve tu listado sin paginación configurada.
> 9. Activa la paginación y compara la forma de la respuesta antes y después.
> 10. Escribe el bloque de ajustes inicial y comprueba que el borrado anónimo ya no funciona.
> 11. Deja el navegable solo en el módulo de ajustes de desarrollo.
