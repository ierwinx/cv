---
titulo: "Versionado y pruebas"
resumen: "Cómo cambiar una API sin romper a quien la usa, y las once pruebas de las cuales dos fallan a propósito."
minutos: 17
orden: 22
---

Última lección del bloque, y cierra lo que abrió la lección 11: **una API publicada no se puede cambiar.**

Salvo que puedas, y para eso hay dos herramientas. El versionado, que permite cambiar sin romper. Y las pruebas, que te dicen si has roto algo.

> [!objetivo] Qué vas a aprender
>
> Elegir un esquema de versionado y saber qué cambios lo necesitan, y escribir pruebas de una API que cubran lo que las pruebas normales no miran.

## Qué rompe y qué no

Antes del cómo, el cuándo. No todos los cambios necesitan versión:

| Cambio | ¿Rompe? |
| --- | --- |
| Añadir un campo a una respuesta | No |
| Añadir un punto de acceso | No |
| Añadir un parámetro opcional | No |
| Hacer opcional un campo obligatorio | No |
| **Quitar un campo** | Sí |
| **Renombrar un campo** | Sí |
| **Cambiar el tipo de un campo** | Sí |
| **Hacer obligatorio un campo opcional** | Sí |
| **Cambiar un código de respuesta** | Sí |
| **Cambiar el formato de los errores** | Sí |

La regla detrás de la tabla: **añadir no rompe, quitar y cambiar sí.** Un cliente que ignora los campos que no conoce sobrevive a lo primero.

Y hay dos casos que no parecen romper y rompen:

**Cambiar el orden por defecto** de un listado. Alguien que muestra los cinco primeros verá otros cinco.

**Ajustar una validación para que sea más estricta.** Datos que antes se aceptaban dejan de aceptarse, y del lado del cliente eso son errores nuevos en código que no ha cambiado.

Fíjate también en que hay un cambio de la tabla que se hace sin querer constantemente: **añadir un campo** no rompe, y con `fields = '__all__'` ocurre cada vez que alguien toca el modelo. Ahí el riesgo no es romper sino publicar de más, que es la lección 14.

## Los cinco esquemas de DRF

```python
REST_FRAMEWORK = {
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
}
```

| Esquema | Cómo pide el cliente la versión |
| --- | --- |
| `URLPathVersioning` | `/api/v1/libros/` |
| `NamespaceVersioning` | Igual, con espacios de nombres de Django |
| `AcceptHeaderVersioning` | `Accept: application/json; version=1.0` |
| `QueryParameterVersioning` | `/api/libros/?version=1.0` |
| `HostNameVersioning` | `v1.api.ejemplo.es` |

**En la ruta** es lo más común y lo que conviene por defecto. Se ve, se copia, se prueba con el navegador y sale en los registros. Su pega teórica es que el mismo recurso tiene dos direcciones, lo que a los puristas de REST les molesta; su ventaja práctica es que todo el mundo lo entiende.

**En la cabecera** es lo más correcto —la dirección identifica el recurso y la versión es una preferencia— y es lo que usa GitHub. Y es invisible: no se puede probar pegando una dirección en el navegador, no sale en los registros sin configurarlo, y quien consuma la API se olvidará de mandarla y acabará en la versión por defecto sin saberlo.

**En un parámetro** es lo más fácil de probar y lo que peor envejece, porque se mezcla con los filtros.

**En el nombre del servidor** solo tiene sentido si además vas a desplegarlas por separado.

La recomendación práctica: **en la ruta**, salvo que ya tengas una razón para lo contrario.

Dentro de la vista, la versión está disponible:

```python
def get_serializer_class(self):
        if self.request.version == 'v2':
                return LibroSerializerV2
    return LibroSerializerV1
```

> [!aviso] Versionar es fácil; mantener dos versiones, no
>
> Poner `/v1/` cuesta una línea, y esa línea no es el trabajo. El trabajo es que a partir de entonces **cada cambio hay que hacerlo dos veces**, cada error hay que arreglarlo dos veces y cada prueba hay que escribirla dos veces.
>
> Y el error clásico es versionar la API entera cuando lo que cambia es un recurso. Si `v2` solo cambia cómo se devuelven los libros, tener `/api/v2/editoriales/` idéntico a `/api/v1/editoriales/` es duplicar por nada.
>
> Tres cosas que ayudan de verdad:
>
> **Ten un plan de retirada desde el principio.** Una versión sin fecha de fin es una versión para siempre. Anúnciala al publicar la siguiente, con fecha, y avisa en las respuestas:
>
> ```salida
> Deprecation: Sun, 01 Nov 2026 00:00:00 GMT
> Sunset: Sun, 01 Feb 2027 00:00:00 GMT
> Link: <https://docs.ejemplo.es/v2>; rel="successor-version"
> ```
>
> Esas tres cabeceras son estándar. Casi nadie las usa y quien las use se ahorra la mitad de los correos.
>
> **Mide quién usa cada versión.** Sin eso, retirar la vieja es un acto de fe:
>
> ```python
> class RegistrarVersion:
>         def __call__(self, peticion):
>                 respuesta = self.get_response(peticion)
>         if peticion.path.startswith('/api/'):
>                         logger.info('api', extra={'version': getattr(peticion, 'version', None),
>                                       'cliente': peticion.user.id})
>         return respuesta
> ```
>
> Casi siempre la respuesta es que el 98 % ya está en la nueva y quedan dos clientes, a los que se les puede escribir un correo.
>
> **Y evita la versión mientras puedas.** Añadir un campo nuevo junto al viejo, mantener los dos un tiempo y quitar el viejo cuando nadie lo use resuelve la mayoría de los casos sin duplicar nada:
>
> ```python
> class LibroSerializer(serializers.ModelSerializer):
>         precio = serializers.DecimalField(...)          # el nuevo
>     coste = serializers.DecimalField(source='precio', read_only=True)  # el viejo
> ```
>
> Feo durante seis meses, y más barato que dos versiones para siempre.

## Probar una API

DRF trae su propio cliente, que es el de Django sabiendo de JSON:

```python
from rest_framework.test import APITestCase


class CatalogoTest(APITestCase):
        @classmethod
    def setUpTestData(cls):
                cls.ana = User.objects.create_user('ana', 'a@t.es', 'clave-larga-123')
        cls.ed = Editorial.objects.create(nombre='Anagrama', pais='España')
        cls.autor = Autor.objects.create(nombre='Óscar Núñez')
        for i in range(30):
                        libro = Libro.objects.create(titulo=f'Libro {i}', isbn=f'978-{i:05d}',
                                         precio='10.00', editorial=cls.ed)
            libro.autores.add(cls.autor)

    def setUp(self):
                self.client.force_authenticate(self.ana)
```

Cuatro cosas de esas líneas:

**`force_authenticate`** salta la autenticación entera. No comprueba tokens ni contraseñas: pone el usuario. Es lo que quieres en las pruebas que no van de autenticación, y significa que **hay que probar la autenticación aparte**.

**`setUpTestData`** crea los datos una vez para toda la clase, no una por prueba, que es la lección 39 del módulo 4.

**`format='json'`** en cada petición con cuerpo. Sin él, el cliente manda un formulario, y eso cambia cómo se interpretan las listas y los valores nulos, de modo que la prueba pasa por un camino distinto al del cliente real.

**El autor tiene tildes a propósito.** Es la diferencia entre unas pruebas que detectan el problema de la lección 19 y unas que no.

## Lo que hay que probar

El resultado de las once pruebas del proyecto:

```salida
test_anonimo_no_entra ................................ ok
test_buscar_con_tilde ................................ ok
test_buscar_en_minuscula ............................. ok
test_buscar_sin_tilde ................................ FAIL
test_crear ........................................... ok
test_crear_sin_datos_da_400_por_campo ................ ok
test_el_listado_no_crece_con_las_filas ............... ok
test_el_precio_viaja_como_texto ...................... ok
test_isbn_repetido ................................... ok
test_listar .......................................... ok
test_patch_con_errata_no_cambia_nada ................. FAIL
```

**Las dos que fallan son las importantes**, y fallan a propósito:

```salida
FAIL: test_buscar_sin_tilde
AssertionError: 0 != 30 : la búsqueda no encuentra sin tilde

FAIL: test_patch_con_errata_no_cambia_nada
AssertionError: 'Libro 0' != 'NUEVO' : el PATCH con errata contesta 200 sin guardar
```

Son los dos fallos silenciosos de las lecciones 19 y 13, y **ninguno de los dos lo detecta una prueba normal**, porque los dos devuelven `200`.

Y hay un matiz que se ve comparando las tres pruebas de búsqueda: `Núñez` funciona, `núñez` en minúscula **también**, y `Nunez` sin tildes no. La segunda pasa porque la única letra que hay que convertir a minúscula es la `N`, que es ASCII. Con `Óscar` no pasaría, porque habría que convertir la `Ó`. Es el mismo problema asomando de dos maneras según la palabra, que es lo que lo hace difícil de diagnosticar.

> [!consejo] Las seis pruebas que casi nadie escribe
>
> Las de "devuelve 200" las escribe todo el mundo. Estas son las que rinden:
>
> **El anónimo.** Para cada recurso, una línea:
>
> ```python
> def test_anonimo_no_entra(self):
>         self.client.force_authenticate(None)
>     self.assertEqual(self.client.get(reverse('libro-list')).status_code, 401)
> ```
>
> Es el único caso que puede probar cualquiera desde fuera, y el que más se olvida porque el resto de las pruebas van identificadas.
>
> **El número de consultas**, que es la lección 14:
>
> ```python
> def test_el_listado_no_crece_con_las_filas(self):
>         with self.assertNumQueries(2):
>                 self.client.get(reverse('libro-list'))
> ```
>
> **La forma de los datos, no solo el código.** Que el precio sea texto es una decisión de la lección 11, y sin prueba se pierde el día que alguien cambie un serializador:
>
> ```python
> def test_el_precio_viaja_como_texto(self):
>         respuesta = self.client.get(reverse('libro-list'))
>     self.assertIsInstance(respuesta.data[0]['precio'], str)
> ```
>
> **Los errores, uno por uno.** Que el `400` traiga el campo dentro es lo que permite a una interfaz enseñar el mensaje en su sitio:
>
> ```python
> def test_crear_sin_datos_da_400_por_campo(self):
>         respuesta = self.client.post(reverse('libro-list'), {}, format='json')
>     self.assertEqual(respuesta.status_code, 400)
>     self.assertIn('titulo', respuesta.data)
> ```
>
> **El listado ajeno**, que es el primer agujero de la lección 18 y que una prueba de permisos normal no descubre.
>
> **Y las acciones propias con un usuario ajeno**, que es el segundo.
>
> Todas usan `reverse` con los nombres que genera el enrutador, que es la lección 11: así, cambiar un prefijo de ruta no obliga a tocar cincuenta pruebas.

> [!nota] Dos cosas más que probar, y una que no
>
> **El esquema**, que es la lección 21: guardarlo en el repositorio y comprobar que no cambia. Es la prueba que convierte los cambios accidentales de la API en cambios deliberados, y con versionado es imprescindible, porque avisa exactamente cuándo un cambio necesita versión nueva.
>
> **La compatibilidad de la versión vieja.** Cuando publiques la `v2`, las pruebas de la `v1` no se tocan:
>
> ```python
> class V1SigueFuncionandoTest(APITestCase):
>         """Estas pruebas no se modifican. Si fallan, has roto a alguien."""
>
>     def test_v1_devuelve_el_campo_viejo(self):
>                 respuesta = self.client.get('/api/v1/libros/1/')
>         self.assertIn('coste', respuesta.data)
> ```
>
> El comentario es la parte importante: es lo que impide que alguien "arregle" la prueba en vez de arreglar el código.
>
> **Y lo que no hay que probar: la API de verdad.** Una prueba que llama a un servicio externo no es una prueba, porque falla cuando falla la red y pasa cuando el servicio está caído devolviendo basura. Es lo que resolvió el proyecto de la lección 10, con un servidor falso, y aquí la herramienta es más simple:
>
> ```python
> from unittest.mock import patch
>
>
> @patch('catalogo.servicios.requests.get')
> def test_no_toca_la_red(self, falso_get):
>         falso_get.return_value.json.return_value = {'precio': '10.00'}
>     ...
> ```

> [!resumen] En resumen
>
> El versionado y las pruebas son las dos herramientas que permiten cambiar una API publicada. La regla de qué rompe es que añadir no rompe y quitar o cambiar sí, con dos casos que no lo parecen: cambiar el orden por defecto de un listado y endurecer una validación. DRF trae cinco esquemas de versionado; el de la ruta es el que conviene por defecto porque se ve, se copia y sale en los registros, y el de la cabecera es más correcto y es invisible, con lo que quien consuma la API acabará en la versión por defecto sin saberlo. Poner la versión cuesta una línea y el trabajo empieza después, porque cada cambio, cada arreglo y cada prueba se duplican; ayudan tres cosas: anunciar la retirada con las cabeceras estándar y una fecha, medir quién usa cada versión para no retirarla a ciegas, y evitar la versión mientras se pueda manteniendo el campo viejo junto al nuevo, que es feo seis meses y más barato que dos versiones para siempre. Para probar, DRF trae su cliente; conviene saltarse la autenticación en las pruebas que no van de eso —y probarla aparte—, usar el formato JSON explícito porque si no se manda un formulario y la prueba recorre otro camino, y poner tildes en los datos de prueba. De las once pruebas del proyecto, **las dos que fallan son las que valen**: la búsqueda sin tilde y el `PATCH` con errata, que son los fallos silenciosos de las lecciones 19 y 13 y que ninguna prueba normal detecta porque los dos devuelven `200`. Las seis que casi nadie escribe son el usuario anónimo, el número de consultas, la forma de los datos además del código, los errores uno por uno, el listado ajeno y las acciones propias con un usuario ajeno.

> [!ejercicio] Practica
>
> 1. Recorre la tabla de cambios y clasifica los tres últimos que hiciste en tu API.
> 2. Activa el versionado en la ruta y comprueba que la versión llega a la vista.
> 3. Prueba también el de cabecera y anota qué te resulta más incómodo.
> 4. Devuelve un serializador distinto según la versión.
> 5. Añade las tres cabeceras de retirada a la versión vieja.
> 6. Escribe el registro que anota qué versión usa cada cliente.
> 7. Monta las pruebas básicas con el cliente de DRF y nombres de ruta.
> 8. Escribe la prueba del usuario anónimo para cada recurso.
> 9. Escribe la que cuenta consultas y compruébala añadiendo un campo con relación.
> 10. Escribe la que comprueba que el precio viaja como texto.
> 11. Escribe la que busca una palabra acentuada sin acento, y arregla lo que falle.
> 12. Escribe la del `PATCH` con errata y decide qué hacer con el resultado.
> 13. Quita el formato JSON explícito de una prueba con cuerpo y mira si cambia algo.
> 14. Guarda el esquema y escribe la prueba que detecta los cambios.
