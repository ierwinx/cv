---
titulo: "Documentar con OpenAPI"
resumen: "Setenta operaciones documentadas solas, ninguna con un error, y un campo que la documentación dice que es texto y devuelve una lista."
minutos: 15
orden: 21
---

La lección 1 dijo que sin documentación una API no se puede usar, y las diez primeras lecciones lo confirmaron: la mitad del trabajo de consumir una API es averiguar qué devuelve.

OpenAPI es el formato estándar para describir una API, y se puede generar solo desde el código. Lo que hay que entender es **qué parte se genera bien y qué parte no**, porque una documentación generada tiene un problema que la escrita a mano no tiene: nadie la revisa.

> [!objetivo] Qué vas a aprender
>
> Generar un esquema OpenAPI y servir la documentación, saber qué deduce solo y qué hay que decirle, y arreglar los dos fallos que trae de serie: que solo documenta el camino feliz y que a veces miente sobre los tipos.

## Qué es OpenAPI

Un fichero, YAML o JSON, que describe la API entera: rutas, métodos, parámetros, cuerpos, respuestas y tipos. Como es un formato estándar, sirve para muchas cosas:

**Documentación navegable** con formularios para probar, que es lo más visible.

**Generar clientes** en cualquier lenguaje, sin escribirlos.

**Validar**, comprobando en las pruebas que la API cumple lo que dice.

**Importarlo en herramientas** como Postman o Insomnia.

Esa última es la que suele cerrar la discusión: quien vaya a consumir tu API va a pedir el fichero, y dárselo ahorra semanas de correos.

## Generarlo

DRF trae un generador y **no es el que conviene usar**: cubre poco y está poco mantenido. El estándar de hecho es `drf-spectacular`.

```bash
pip install drf-spectacular
```

```python
INSTALLED_APPS = [..., 'drf_spectacular']

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'API del catálogo',
    'DESCRIPTION': 'Libros, autores y editoriales.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

```python
from drf_spectacular.views import (
    SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView)

urlpatterns = [
    path('api/esquema/', SpectacularAPIView.as_view(), name='esquema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='esquema')),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='esquema')),
]
```

Con eso hay dos documentaciones navegables: la primera con formularios para probar, la segunda más limpia para leer. Y el fichero se puede sacar por la línea de órdenes:

```bash
python manage.py spectacular --file esquema.yaml
```

```salida
Schema generation summary:
Warnings: 2 (1 unique)
Errors:   0

2237 líneas
versión OpenAPI: 3.0.3
rutas: 34
esquemas de datos: 16
```

Dos mil doscientas líneas de documentación de un proyecto donde nadie ha escrito documentación. Eso es lo que hace que merezca la pena.

## Lo que deduce solo

Mucho, y de calidad. Los parámetros de un recurso con los filtros de la lección 19:

```salida
editorial         in=query  string
estado            in=query  string  * `borrador` - Borrador
                                    * `publicado` - Publicado
ordering          in=query  string  Qué campo usar para ordenar los resultados
precio_max        in=query  number
precio_min        in=query  number
publicado_desde   in=query  string
search            in=query  string  Un término de búsqueda
```

**Los filtros, la búsqueda y la ordenación aparecen solos**, con las opciones válidas de los campos con estados y con las descripciones en español. Eso es exactamente lo que la lección 19 echaba en falta: quien consuma la API ve qué parámetros existen, y una errata deja de ser un misterio.

También deduce los campos de cada serializador con sus tipos y restricciones, cuáles son de solo lectura, cuáles obligatorios, y los esquemas de autenticación.

> [!aviso] Solo documenta el camino feliz
>
> Contando las respuestas documentadas de las setenta operaciones del proyecto:
>
> ```salida
> ['200'] -> 52 operaciones
> ['201'] ->  9 operaciones
> ['204'] ->  9 operaciones
> ```
>
> **Ni un `400`, ni un `401`, ni un `403`, ni un `404`.** Setenta operaciones y cero errores documentados.
>
> Y eso es justo la mitad de lo que hace falta. Todo el bloque A de este módulo trataba de qué hacer cuando la respuesta no es `200`: la lección 2 sobre los códigos, la 8 sobre cuáles reintentar, la 9 sobre el `429`. Una documentación que solo cuenta el caso bueno deja a quien la consume adivinando exactamente lo que más importa.
>
> La razón es que el generador no puede saberlo: los errores dependen de los permisos, de los validadores y de tu lógica. Hay que decírselo:
>
> ```python
> from drf_spectacular.utils import extend_schema, OpenApiResponse
>
>
> class LibroViewSet(viewsets.ModelViewSet):
>
>         @extend_schema(
>         summary='Publicar un libro',
>         description='Cambia el estado a publicado y fija la fecha.',
>         request=None,
>         responses={
>             200: LibroSerializer,
>             403: OpenApiResponse(description='No eres editor de esta editorial.'),
>             404: OpenApiResponse(description='No existe ese libro.'),
>             409: OpenApiResponse(description='El libro ya estaba publicado.'),
>         },
>     )
>     @action(detail=True, methods=['post'])
>     def publicar(self, peticion, pk=None):
>                 ...
> ```
>
> Y para no repetirlo en cada operación, se declaran los comunes una vez:
>
> ```python
> SPECTACULAR_SETTINGS = {
>     # ...
>     'ENUM_NAME_OVERRIDES': {},
>     'COMPONENT_SPLIT_REQUEST': True,
> }
> ```
>
> ```python
> @extend_schema(responses={
>     401: OpenApiResponse(description='Falta el token o no es válido.'),
>     429: OpenApiResponse(description='Has superado el límite de peticiones.'),
> })
> class BaseViewSet(viewsets.ModelViewSet):
>         """Todas las vistas heredan de esta."""
> ```
>
> Documentar los errores es el trabajo de una tarde y es la mitad del valor de la documentación.

> [!aviso] Y a veces miente
>
> Esto es peor que no documentar, porque una documentación equivocada se cree. Al generar el esquema salió este aviso:
>
> ```salida
> Warning: unable to resolve type hint for function "get_autores_nombres".
> Consider using a type hint or @extend_schema_field. Defaulting to string.
> ```
>
> Y el resultado:
>
> ```salida
> el esquema dice:  autores_nombres -> {"type": "string"}
> y la API devuelve: ["Óscar Núñez", "Ana Ñito"]   (una lista)
> ```
>
> **La documentación dice texto y el campo es una lista.** Quien genere un cliente a partir del esquema tendrá un tipo equivocado, y el error aparecerá en tiempo de ejecución en el lado del cliente, que es donde menos se puede arreglar.
>
> La causa es que un `SerializerMethodField` es un método de Python y el generador no puede adivinar qué devuelve. Ante la duda, pone texto, que casi nunca es lo correcto.
>
> Dos arreglos, y el segundo es mejor:
>
> ```python
> @extend_schema_field(serializers.ListField(child=serializers.CharField()))
> def get_autores_nombres(self, obj):
>         return [a.nombre for a in obj.autores.all()]
> ```
>
> ```python
> def get_autores_nombres(self, obj) -> list[str]:
>         return [a.nombre for a in obj.autores.all()]
> ```
>
> **La anotación de tipo normal de Python basta**, y es lo mejor de las dos: sirve para el esquema, para el editor y para quien lea el código. Es de los pocos sitios donde poner anotaciones da un beneficio inmediato y medible.
>
> Y lo importante de todo esto: **los avisos de la generación no son ruido.** Cada uno es un punto donde la documentación va a ser falsa. En un proyecto que se toma esto en serio, la generación va en la integración continua con los avisos tratados como errores:
>
> ```bash
> python manage.py spectacular --fail-on-warn --file /dev/null
> ```
>
> Esa línea en el proceso automático es lo que impide que la documentación mienta.

## Lo que hay que escribir a mano

El generador no sabe **por qué** existe un punto de acceso ni cómo se usa. Eso se escribe:

```python
@extend_schema(
    summary='Buscar libros por texto',
    description=(
        'Busca en el título, el ISBN y los nombres de los autores.\n\n'
        'Las palabras se exigen todas. Usa comillas para una frase exacta:\n'
        '`?search="cien años"`.\n\n'
        'La búsqueda no distingue mayúsculas pero **sí distingue tildes**.'
    ),
    examples=[
        OpenApiExample('Por autor', value={'search': 'Marías'}),
        OpenApiExample('Frase exacta', value={'search': '"cien años"'}),
    ],
)
@action(detail=False)
def buscar(self, peticion):
        ...
```

Y hay tres cosas que conviene documentar siempre porque el generador no las deduce y son las que más se preguntan:

**Cómo autenticarse**, con un ejemplo completo de la cabecera. La lección 17 vio que DRF usa `Token` y no `Bearer`, y eso hay que decirlo en letras grandes.

**Los límites de uso**, que son la lección 9 desde el otro lado: cuántas peticiones, en qué ventana, qué cabeceras informan y qué pasa al pasarse.

**Cómo paginar**, y en particular cuál de los tres estilos de la lección 20 usa cada recurso.

> [!nota] La prueba que comprueba que la documentación no miente
>
> Como el esquema es un fichero, se puede comparar. Y de ahí sale una prueba que casi nadie escribe y que vale mucho:
>
> ```python
> class EsquemaTest(APITestCase):
>         def test_el_esquema_se_genera_sin_avisos(self):
>                 from drf_spectacular.generators import SchemaGenerator
>         with self.assertLogs('drf_spectacular', level='WARNING') as registro:
>                         SchemaGenerator().get_schema(request=None, public=True)
>         self.assertEqual(registro.records, [])
>
>     def test_el_esquema_no_ha_cambiado(self):
>                 """Si esto falla, es que la API cambió. Revisa si rompe a alguien."""
>         generado = yaml.dump(SchemaGenerator().get_schema(request=None, public=True))
>         guardado = (Path(__file__).parent / 'esquema.yaml').read_text()
>         self.assertEqual(generado, guardado)
> ```
>
> La segunda es la interesante y merece explicación. Guarda el esquema en el repositorio y falla cuando cambia. **No es que cambiar esté mal**: es que un cambio en la API tiene que ser una decisión, no un efecto secundario.
>
> Con esa prueba, quien añada un campo al modelo con `fields = '__all__'` verá fallar la prueba y se enterará de que acaba de publicar algo. Quien renombre un campo verá fallar la prueba y se enterará de que acaba de romper a todos los clientes. Y en la revisión de código, el cambio del fichero se ve en el diff.
>
> Es la mejor defensa que existe contra el problema que abría la lección 11: **una API publicada no se puede cambiar.** Esta prueba convierte los cambios accidentales en cambios deliberados, y es la antesala del versionado de la lección siguiente.

> [!consejo] Cuatro ajustes que mejoran el resultado
>
> **Agrupar por recurso.** Sin esto, las operaciones se agrupan por el primer trozo de la ruta, así que todo acaba bajo `api`:
>
> ```python
> @extend_schema(tags=['Libros'])
> class LibroViewSet(viewsets.ModelViewSet):
>         ...
> ```
>
> **Separar los esquemas de entrada y de salida.** Un serializador tiene campos de solo lectura y de solo escritura, y meterlos en un solo esquema produce un tipo que no existe:
>
> ```python
> SPECTACULAR_SETTINGS = {'COMPONENT_SPLIT_REQUEST': True}
> ```
>
> **Quitar la documentación de producción, o protegerla.** Es un mapa completo de tu API, incluidos los puntos de acceso administrativos. Con una API pública, estupendo; con una interna, es lo primero que mira quien busque agujeros:
>
> ```python
> urlpatterns = [path('api/docs/', SpectacularSwaggerView.as_view(url_name='esquema'))]
> if not DEBUG:
>         urlpatterns = []
> ```
>
> **Poner los servidores**, para que los botones de probar apunten a algún sitio real:
>
> ```python
> SPECTACULAR_SETTINGS = {
>     'SERVERS': [
>         {'url': 'https://api.ejemplo.es', 'description': 'Producción'},
>         {'url': 'https://pruebas.ejemplo.es', 'description': 'Pruebas'},
>     ],
> }
> ```

> [!resumen] En resumen
>
> OpenAPI describe la API en un fichero estándar que sirve para documentar, generar clientes, validar e importar en herramientas, y eso último suele ser lo que cierra la discusión, porque quien vaya a consumir la API va a pedirlo. El generador de DRF cubre poco y el estándar de hecho es otro paquete, que con cinco líneas de configuración produjo aquí dos mil doscientas líneas de documentación en un proyecto donde nadie había escrito ninguna. Deduce bien los campos, los tipos y —lo más útil— **los filtros, la búsqueda y la ordenación con sus opciones válidas**, que es justo lo que faltaba para que una errata en un parámetro dejara de ser un misterio. Tiene dos carencias que hay que arreglar a mano. La primera es que **solo documenta el camino feliz**: setenta operaciones y ni un solo error documentado, cuando todo el bloque A de este módulo trataba de qué hacer cuando la respuesta no es `200`. La segunda es peor: **a veces miente**, porque un campo calculado que no lleva anotación de tipo se documenta como texto aunque devuelva una lista, y una documentación equivocada se cree; se arregla con una anotación de tipo normal de Python, que además sirve para el editor, y los avisos de la generación no son ruido sino la lista de sitios donde la documentación va a ser falsa, así que van en la integración continua tratados como errores. Y guardar el esquema en el repositorio con una prueba que falle cuando cambia convierte los cambios accidentales de la API en cambios deliberados, que es la mejor defensa contra lo que abría la lección 11.

> [!ejercicio] Practica
>
> 1. Instala el generador y sirve las dos documentaciones navegables.
> 2. Saca el esquema a un fichero y cuenta sus rutas y esquemas de datos.
> 3. Busca en él los parámetros de filtro de un recurso.
> 4. Cuenta cuántas operaciones documentan algún error.
> 5. Documenta los errores de una acción propia con sus cuatro códigos.
> 6. Escribe un campo calculado sin anotación y mira qué tipo le pone el esquema.
> 7. Compáralo con lo que devuelve de verdad la API.
> 8. Añade la anotación de tipo y vuelve a generar.
> 9. Genera el esquema tratando los avisos como errores y arregla lo que salga.
> 10. Agrupa las operaciones por recurso y compara la documentación.
> 11. Separa los esquemas de entrada y salida y mira la diferencia.
> 12. Guarda el esquema en el repositorio y escribe la prueba que detecta los cambios.
> 13. Cambia el nombre de un campo y comprueba que la prueba falla.
