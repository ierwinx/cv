---
titulo: "Pruebas y documentación"
resumen: "Sustituir una dependencia en una línea, la base de datos nueva para cada prueba, y el esquema que no puede mentir."
minutos: 15
orden: 28
---

Dos temas que en FastAPI están más relacionados de lo que parece, porque los dos salen de lo mismo: las dependencias de la lección 26 y las anotaciones de la 24.

Probar una API con FastAPI es notablemente más cómodo que con DRF, y la razón cabe en una frase: **se puede cambiar cualquier dependencia por otra cosa, desde fuera, sin tocar el código.**

> [!objetivo] Qué vas a aprender
>
> Escribir pruebas con el cliente de FastAPI, sustituir dependencias para aislar lo que estorbe, montar una base de datos nueva por prueba, y completar la documentación que el armazón no puede deducir.

## Las pruebas básicas

```python
from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_publico_no_pide_token():
        assert cliente.get('/publico').status_code == 200


def test_yo_sin_token_da_401():
        respuesta = cliente.get('/yo')
    assert respuesta.status_code == 401
    assert respuesta.headers['www-authenticate'] == 'Bearer'


def test_flujo_completo():
        respuesta = cliente.post('/token',
                             data={'username': 'ana', 'password': 'clave-larga-123'})
    token = respuesta.json()['access_token']
    respuesta = cliente.get('/yo', headers={'Authorization': f'Bearer {token}'})
    assert respuesta.json()['usuario'] == 'ana'
```

El cliente **no levanta un servidor ni abre un puerto**: llama a la aplicación directamente. Es lo mismo que hacía el cliente de Django, y es lo que hace que tres pruebas tarden medio segundo.

Y las pruebas son funciones con `assert`, sin clase base y sin métodos de comprobación. Es `pytest`, que es lo que se usa en este ecosistema, y la lección 23 del módulo 2 ya explicó las diferencias con `unittest`.

## Sustituir dependencias

Aquí está lo bueno. Todo lo que llegue por `Depends` se puede cambiar desde la prueba:

```python
@pytest.fixture
def como_editora():
        app.dependency_overrides[usuario_activo] = lambda: Usuario(
        usuario='prueba', activo=True, rol='editor')
    yield
    app.dependency_overrides.clear()


def test_borrar_con_dependencia_sustituida(como_editora):
        respuesta = cliente.delete('/libros/7')
    assert respuesta.status_code == 200
    assert respuesta.json() == {'borrado': 7, 'por': 'prueba'}


def test_sin_sustituir_sigue_pidiendo_token():
        assert cliente.delete('/libros/7').status_code == 401
```

```salida
7 passed in 0.51s
```

**Una línea sustituye la autenticación entera**, sin generar tokens ni cifrar contraseñas. Es el equivalente de `force_authenticate` de la lección 22, con dos diferencias importantes:

**Sirve para cualquier dependencia, no solo para el usuario.** La sesión de base de datos, el cliente HTTP que habla con otro servicio, el reloj, el generador de identificadores: cualquier cosa que hayas declarado como dependencia se puede cambiar.

**Y no hace falta que la biblioteca lo haya previsto.** `force_authenticate` existe porque los de DRF lo escribieron; esto funciona con lo que tú declares.

Eso cambia cómo se diseña el código: **lo que quieras poder sustituir en las pruebas, decláralo como dependencia.** Es inyección de dependencias, que suena a patrón de otros lenguajes y aquí son diez caracteres.

Y fíjate en la última prueba, que es la que impide el accidente clásico: si una sustitución se queda puesta, las demás pruebas corren autenticadas sin que nadie lo note, y una prueba que debería fallar pasa. Por eso la limpieza va en el `yield` del accesorio y no al final de la prueba, donde se olvida.

> [!aviso] Lo que no se debe sustituir
>
> La facilidad invita a pasarse, y hay una línea:
>
> **Sustituir la autenticación está bien** en las pruebas que no van de autenticación, y **exige que existan pruebas que sí vayan de ella**. Si todas las pruebas la saltan, el día que rompas el flujo de entrada no se entera nadie.
>
> **Sustituir la base de datos por un diccionario está mal.** Es la tentación obvia y hace que las pruebas no comprueben lo que importa: las restricciones únicas, las claves ajenas, los tipos, las transacciones. Un diccionario acepta dos libros con el mismo ISBN; la base de datos no. La sección siguiente monta la alternativa, que cuesta quince líneas.
>
> **Sustituir lo que sale del propio sistema está bien y es obligatorio**, y es la regla de la lección 22: una prueba que llama a otra API por la red no es una prueba.

## Una base de datos por prueba

Es el caso difícil y merece verse entero, porque el asíncrono complica lo que en Django era automático:

```python
@pytest_asyncio.fixture
async def sesion():
        """Base de datos en memoria, nueva para cada prueba."""
    motor = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with motor.begin() as conexion:
                await conexion.run_sync(Base.metadata.create_all)
    Fabrica = async_sessionmaker(motor, expire_on_commit=False)
    async with Fabrica() as s:
                yield s
    await motor.dispose()


@pytest_asyncio.fixture
async def cliente(sesion):
        app.dependency_overrides[obtener_sesion] = lambda: sesion
    transporte = ASGITransport(app=app)
    async with AsyncClient(transport=transporte, base_url='http://t') as c:
                yield c
    app.dependency_overrides.clear()
```

```python
async def test_la_base_empieza_vacia(cliente):
        assert (await cliente.get('/libros')).json() == []


async def test_listar_con_datos(cliente, sesion):
        editorial = Editorial(nombre='Anagrama')
    sesion.add(editorial)
    await sesion.flush()
    sesion.add(Libro(titulo='Uno', isbn='978-1', precio=Decimal('10.00'),
                     editorial_id=editorial.id))
    await sesion.commit()
    datos = (await cliente.get('/libros')).json()
    assert len(datos) == 1 and datos[0]['editorial'] == 'Anagrama'


async def test_cada_prueba_tiene_su_base(cliente):
        """Si esta pasa, la anterior no dejó rastro."""
    assert (await cliente.get('/libros')).json() == []
```

```salida
3 passed in 0.60s
```

Cuatro decisiones de ese montaje:

**Base de datos en memoria y nueva por prueba.** Rápido y sin rastro. El precio es que SQLite no es PostgreSQL, así que hay cosas —los tipos propios, las consultas de texto completo, las transacciones anidadas— que solo se comprueban de verdad contra la de producción. La lección 41 del módulo 4 lo avisó, y aquí vuelve a valer: si el proyecto usa PostgreSQL, las pruebas deberían usarlo también, en un contenedor.

**El accesorio del cliente depende del de la sesión**, y por eso los dos ven la misma. Sin eso, la prueba escribe en una base y la API lee de otra, y el resultado es una lista vacía que no se entiende.

**El cliente es asíncrono**, porque la aplicación lo es. El síncrono también funciona y es más simple; el asíncrono hace falta si en la prueba quieres lanzar varias peticiones a la vez, que es como se comprueba lo de la lección 26.

**Y la tercera prueba es la que vale.** Comprueba el aislamiento, que es la propiedad de la que dependen todas las demás y la que nadie verifica. Sin ella, dos pruebas que pasan juntas pueden fallar por separado o al revés, y depurar eso cuesta una tarde.

Hace falta configurar `pytest`:

```ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
```

La primera línea evita tener que marcar cada prueba asíncrona. La segunda no es opcional: sin ella, `pytest-asyncio` avisa y el comportamiento entre versiones cambia.

Y en cuanto haya más de un fichero de pruebas, esos dos accesorios se mudan a `conftest.py`, en la raíz del proyecto. `pytest` lo carga solo y los pone a disposición de todas las pruebas sin importar nada, que es lo que hace el proyecto de la lección 30.

> [!consejo] Las pruebas que conviene tener, en orden de rentabilidad
>
> Es la lista de la lección 22 adaptada, y las tres últimas son propias de FastAPI.
>
> **El anónimo en cada ruta protegida**, que sigue siendo la más olvidada.
>
> **La forma de los datos, no solo el código.** Aquí hay una ayuda que DRF no tenía: como la respuesta pasa por el modelo de salida, se puede validar con él:
>
> ```python
> def test_la_respuesta_cumple_su_modelo():
>         datos = cliente.get('/api/libros/1').json()
>     LibroPublico.model_validate(datos)      # falla si no encaja
> ```
>
> **Que los campos sensibles no salen**, que es la lección 24:
>
> ```python
> def test_no_se_publica_la_contrasena():
>         datos = cliente.get('/api/usuarios/1').json()
>     assert 'contrasena_cifrada' not in datos
> ```
>
> Esa prueba es la que se queda vigilando el día que alguien cambie el modelo de salida por el de base de datos «solo un momento para depurar».
>
> **Que las rutas fijas no las come una con parámetro**, que es la trampa de la lección 24 y son dos líneas.
>
> **Y que las rutas asíncronas no bloquean**, que es lo de la lección 26. Se puede comprobar:
>
> ```python
> async def test_la_ruta_no_bloquea_el_bucle():
>         inicio = time.perf_counter()
>     await asyncio.gather(*[cliente.get('/api/informe') for _ in range(10)])
>     assert time.perf_counter() - inicio < 3 * UNA_PETICION
> ```
>
> No es una prueba bonita y es la única que detecta el fallo que multiplicaba por siete el tiempo de todo el servidor.

## La documentación

Sale sola, y esta es la diferencia con la lección 21:

```salida
versión OpenAPI: 3.1.0
```

Frente al 3.0.3 que generaba la herramienta de DRF. La versión 3.1 es compatible con JSON Schema completo, lo que importa al generar clientes y al validar.

Y lo que documenta de los errores:

```salida
['200', '422'] -> 2 operaciones
['200']        -> 2 operaciones
```

**El `422` aparece solo**, porque el armazón sabe que ha puesto validación. Es más de lo que hacía DRF, que no documentaba ningún error.

Pero el `401` de la lección anterior y el `403` del papel **no están**, porque los lanzas tú desde dentro de una función y nadie puede adivinarlo. Hay que escribirlos:

```python
@app.delete('/api/libros/{libro_id}',
            status_code=204,
            summary='Borrar un libro',
            responses={
                401: {'description': 'Falta el token o no es válido.'},
                403: {'description': 'Hace falta el papel de editor.'},
                404: {'description': 'No existe ese libro.'},
            })
async def borrar(libro_id: int, u: Annotated[Usuario, Depends(exigir_rol('editor'))]):
        """
    Borra un libro **definitivamente**.

    Solo puede hacerlo quien tenga el papel de editor en esa editorial.
    """
```

Es el mismo trabajo de la lección 21 y con una ventaja: la parte que sí se genera **no puede desalinearse del código**, porque las anotaciones son a la vez lo que valida y lo que documenta. El fallo de aquella lección —un campo documentado como texto que devolvía una lista— aquí no es posible.

> [!nota] Tres ajustes de la documentación
>
> **Quitarla o protegerla en producción**, que es el mismo aviso de la lección 21:
>
> ```python
> app = FastAPI(
>     docs_url='/docs' if ajustes.depurar else None,
>     redoc_url=None,
>     openapi_url='/openapi.json' if ajustes.depurar else None,
> )
> ```
>
> Fíjate en la tercera línea: quitar la página y **dejar el fichero del esquema** no sirve de nada, porque el mapa de la API está ahí.
>
> **Guardar el esquema en el repositorio**, que es la prueba más valiosa de la lección 21 y aquí es trivial:
>
> ```python
> def test_el_esquema_no_ha_cambiado():
>         """Si esto falla, la API cambió. Mira si rompe a alguien."""
>     actual = json.dumps(app.openapi(), indent=2, sort_keys=True, ensure_ascii=False)
>     guardado = Path('openapi.json').read_text()
>     assert actual == guardado
> ```
>
> **Y agrupar por etiquetas con descripción**, que es lo que convierte una lista de rutas en documentación legible:
>
> ```python
> app = FastAPI(openapi_tags=[
>     {'name': 'Libros', 'description': 'Catálogo. Lectura pública, escritura para editores.'},
>     {'name': 'Cuentas', 'description': 'Entrada y gestión del token.'},
> ])
> ```

> [!resumen] En resumen
>
> El cliente de pruebas de FastAPI llama a la aplicación sin abrir un puerto, y las pruebas son funciones con `assert`. Lo que hace cómodo probar aquí es que **cualquier dependencia se puede sustituir desde fuera en una línea**, lo que equivale a la autenticación forzada de DRF pero sirve para todo —la sesión, un cliente HTTP, el reloj— y no depende de que la biblioteca lo haya previsto; de ahí la regla de diseño de declarar como dependencia lo que quieras poder cambiar en las pruebas. La limpieza va en el accesorio, porque una sustitución que se queda puesta hace pasar pruebas que deberían fallar. Hay una línea que no conviene cruzar: sustituir la base de datos por un diccionario quita justo lo que las pruebas deben comprobar, que son las restricciones y los tipos; la alternativa son quince líneas con una base en memoria nueva por prueba, donde el accesorio del cliente depende del de la sesión para que los dos vean la misma, y donde la prueba que de verdad vale es la que comprueba que la anterior no dejó rastro. Conviene tener pruebas del anónimo, de la forma de los datos —que aquí se puede validar con el propio modelo de salida—, de que los campos sensibles no se publican, de que una ruta fija no la come una con parámetro, y de que una ruta asíncrona no bloquea el bucle, que es fea y es la única que detecta ese fallo. La documentación sale sola en OpenAPI 3.1, e incluye el error de validación, que es más de lo que hacía DRF; los errores que lanzas tú hay que escribirlos igual, con la diferencia de que la parte generada **no puede desalinearse del código**.

> [!ejercicio] Practica
>
> 1. Escribe cinco pruebas del flujo de autenticación con el cliente de FastAPI.
> 2. Sustituye la dependencia del usuario y comprueba que la ruta protegida funciona.
> 3. Escribe la prueba que verifica que sin sustituir sigue pidiendo token.
> 4. Quita la limpieza del accesorio y observa qué prueba empieza a pasar sin deber.
> 5. Monta la base de datos en memoria nueva por prueba.
> 6. Haz que el accesorio del cliente dependa del de la sesión.
> 7. Escribe la prueba que comprueba el aislamiento entre pruebas.
> 8. Quita la configuración del ámbito del bucle y mira el aviso.
> 9. Valida una respuesta con su propio modelo de salida.
> 10. Escribe la prueba que comprueba que un campo sensible no se publica, y rómpela a propósito.
> 11. Escribe la que mide que una ruta asíncrona no bloquea.
> 12. Mira qué errores documenta el esquema solo y cuáles faltan.
> 13. Documenta los tuyos y compruébalo en la documentación navegable.
> 14. Guarda el esquema y escribe la prueba que detecta los cambios.
> 15. Apaga la documentación en producción, incluido el fichero del esquema.
