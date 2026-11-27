---
titulo: "Rutas y parámetros"
resumen: "Cómo decide FastAPI de dónde sale cada dato, la ruta que deja de funcionar por declararla en el orden equivocado, y la anotación que impide publicar una contraseña."
minutos: 15
orden: 24
---

En DRF hay que decir de dónde sale cada cosa: `self.kwargs['pk']` para la ruta, `request.query_params` para la consulta, `request.data` para el cuerpo. En FastAPI se declaran como argumentos de una función y el armazón decide.

Esa decisión sigue tres reglas, y merece la pena saberlas de memoria porque el resto de la lección depende de ellas.

> [!objetivo] Qué vas a aprender
>
> Declarar parámetros de ruta, consulta, cuerpo y cabecera sabiendo cómo los distingue FastAPI, organizar una API en varios ficheros, evitar la trampa del orden de las rutas, y usar la anotación de retorno como filtro de seguridad.

## De dónde sale cada parámetro

```python
@app.get('/r/{en_ruta}')
def todo(en_ruta: int,
         simple: str = 'por-defecto',
         lista: list[int] = Query(default=[]),
         cab: str | None = Header(default=None),
         galleta: str | None = Cookie(default=None)):
        ...
```

```salida
GET /r/42?simple=hola&lista=1&lista=2
con la cabecera cab: valor y la galleta galleta=g

{"en_ruta": 42, "simple": "hola", "lista": [1, 2],
 "cab": "valor", "galleta": "g"}
```

Las tres reglas, por orden:

**Si el nombre aparece entre llaves en la ruta, sale de la ruta.**

**Si el tipo es un modelo de pydantic, sale del cuerpo.**

**Si no es ninguna de las dos, sale de la cadena de consulta.**

Y para lo demás —cabeceras, galletas, formularios, ficheros— hay funciones que lo dicen explícitamente.

Combinando las tres en una sola función:

```salida
POST /c/7?q=zzz  con cuerpo {"nombre": "Ana"}

{"id": 7, "cuerpo": {"nombre": "Ana"}, "q": "zzz"}
```

El `id` vino de la ruta, `cuerpo` del cuerpo porque es un modelo, y `q` de la consulta porque es un texto suelto. Sin configurar nada.

Fíjate en el detalle de la lista: `lista: list[int]` recoge `?lista=1&lista=2` y devuelve `[1, 2]` **ya convertidos a enteros**. Es lo que la lección 6 vio desde el lado del cliente, resuelto aquí sin código.

> [!nota] La forma moderna: `Annotated`
>
> Hay dos maneras de escribir esto y conviene usar la segunda:
>
> ```python
> def listar(q: str = Query(default=None, max_length=50)):
>         ...
>
> def listar(q: Annotated[str | None, Query(max_length=50)] = None):
>         ...
> ```
>
> La segunda separa **el tipo** de **los metadatos**, y con eso el valor por defecto vuelve a su sitio de siempre. Ventajas concretas: la función se puede llamar desde Python normal y desde las pruebas sin que el valor por defecto sea un objeto raro, y los analizadores de tipos entienden la firma.
>
> La documentación oficial usa `Annotated` en todas partes desde hace tiempo, y el estilo antiguo sigue funcionando. En un proyecto nuevo, el moderno.

## Validar los parámetros

Las restricciones van con el tipo:

```python
from typing import Annotated

from fastapi import Path, Query


@app.get('/api/libros/{libro_id}')
def obtener(
    libro_id: Annotated[int, Path(ge=1)],
    q: Annotated[str | None, Query(min_length=3, max_length=50)] = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    orden: Annotated[str, Query(pattern='^-?(titulo|precio)$')] = 'titulo',
):
        ...
```

Cuatro cosas que esa firma consigue de golpe, y que en DRF son la lección 19 entera:

**El límite tiene tope**, que es el aviso de la lección 20 sobre pedir un millón de elementos.

**El orden solo acepta lo que has puesto**, que es el aviso de la lección 19 sobre no permitir ordenar por cualquier columna. Aquí la lista blanca es la expresión regular.

**Todo aparece en la documentación** con sus restricciones.

**Y un valor inválido da error antes de entrar en tu función.**

La diferencia con la lección 19 es importante: allí, un parámetro con una errata se ignoraba en silencio. Aquí, un **valor** inválido da error igual que en DRF; un **nombre** desconocido también se ignora, porque una cadena de consulta puede llevar cualquier cosa. La defensa vuelve a ser documentarlo, y aquí sale gratis.

## Organizar la API

Un fichero no aguanta. La pieza es el enrutador:

```python
# app/routers/libros.py
from fastapi import APIRouter

router = APIRouter(prefix='/api/libros', tags=['Libros'])


@router.get('/')
def listar() -> list[Libro]:
        ...


@router.get('/{libro_id}')
def obtener(libro_id: int) -> Libro:
        ...
```

```python
# app/main.py
from fastapi import FastAPI

from .routers import autores, libros

app = FastAPI(title='API del catálogo')
app.include_router(libros.router)
app.include_router(autores.router)
```

Es el equivalente de las aplicaciones y el `include` de Django, con dos diferencias: el prefijo y las etiquetas van en el enrutador y no en quien lo incluye, y **las dependencias comunes también**:

```python
router = APIRouter(
    prefix='/api/libros',
    tags=['Libros'],
    dependencies=[Depends(exigir_token)],
    responses={404: {'description': 'No encontrado'}},
)
```

Esa línea de dependencias aplica la autenticación a todo el enrutador de una vez, que es lo que en DRF hacía `permission_classes` en la clase. Es la lección 27.

> [!aviso] El orden de las rutas importa, y el error no lo dice
>
> Esta es la trampa de FastAPI que más tiempo hace perder, y es exactamente lo contrario de lo que hace el enrutador de DRF.
>
> ```python
> @app.get('/libros/{libro_id}')
> def uno(libro_id: int): ...
>
> @app.get('/libros/nuevos')          # declarada después
> def nuevos(): ...
> ```
>
> ```salida
> declarada antes:    GET /libros/nuevos -> 200  {"ruta": "nuevos"}
> declarada después:  GET /libros/nuevos -> 422  {"type": "int_parsing",
>                                                 "loc": ["path", "libro_id"],
>                                                 "msg": "Input should be a valid integer"}
> ```
>
> **FastAPI prueba las rutas en el orden en que las declaraste** y se queda con la primera que encaje. Si la ruta con parámetro va primero, `nuevos` se interpreta como identificador y la función correcta no se ejecuta nunca.
>
> Lo que hace daño no es la regla, que es simple, sino el mensaje: el `422` habla de convertir un entero y no dice nada de rutas. Alguien que vea eso buscará el fallo en el cliente durante un buen rato.
>
> Y no hay aviso al arrancar. La aplicación levanta perfectamente con una ruta inalcanzable.
>
> La regla es: **las rutas fijas antes que las que tienen parámetros.** La lección 16 contó que el enrutador de DRF hace esto solo, colocando las acciones de colección antes que el detalle. Aquí es tuyo.
>
> La defensa práctica es una prueba por cada ruta fija que comparta prefijo con una de parámetro, que son dos líneas y detectan el problema el día que alguien reordene el fichero:
>
> ```python
> def test_las_rutas_fijas_no_las_come_el_parametro():
>         assert cliente.get('/libros/nuevos').json()['ruta'] == 'nuevos'
> ```

## La anotación de retorno es un filtro

Aquí está la mejor característica de esta lección, y es de seguridad.

```python
class UsuarioBD(BaseModel):
        id: int
    correo: str
    contrasena_cifrada: str
    es_admin: bool
    notas_internas: str


class UsuarioPublico(BaseModel):
        id: int
    correo: str
```

```python
@app.get('/sin-anotar')
def sin_anotar():
        return usuario


@app.get('/anotado')
def anotado() -> UsuarioPublico:
        return usuario
```

```salida
/sin-anotar -> {"id": 1, "correo": "ana@t.es",
                "contrasena_cifrada": "pbkdf2$xxxx",
                "es_admin": true,
                "notas_internas": "cliente difícil"}

/anotado    -> {"id": 1, "correo": "ana@t.es"}
```

**La anotación recorta.** Y no es que avise ni que dé error: los campos que no están declarados en el modelo de salida **no salen**, aunque el objeto que devuelves los tenga.

Funciona incluso devolviendo un diccionario con campos de más:

```salida
return {'id': 1, 'correo': 'a@t.es', 'contrasena_cifrada': 'xxx', 'es_admin': True}
-> {"id": 1, "correo": "a@t.es"}
```

Esto es lo que en DRF era la lista explícita de campos de la lección 14, con dos diferencias a favor:

**Se aplica al valor devuelto, no al objeto de entrada.** Da igual de dónde venga el dato o si te equivocas al construirlo: si no está en el modelo de salida, no se publica.

**Y es la misma declaración que documenta.** No puede desalinearse, que es lo que la lección anterior señalaba como su mejor propiedad.

Y de ahí la regla que sí es importante: **anota siempre el retorno.** Una función sin anotación devuelve el objeto entero, que es el `fields = '__all__'` de la lección 14 con la misma consecuencia: publicas el campo que alguien añada mañana.

> [!consejo] Cuatro cosas más de una ruta bien declarada
>
> **El código de estado**, porque el 200 por defecto no siempre es el correcto:
>
> ```python
> @app.post('/api/libros/', status_code=201)
> def crear(datos: LibroEntrada) -> Libro:
>         ...
>
>
> @app.delete('/api/libros/{libro_id}', status_code=204)
> def borrar(libro_id: int) -> None:
>         ...
> ```
>
> **Los errores, con la excepción del armazón:**
>
> ```python
> from fastapi import HTTPException
>
> raise HTTPException(status_code=404, detail='No existe ese libro.')
> raise HTTPException(status_code=409, detail='El libro ya estaba publicado.')
> ```
>
> Se lanza desde cualquier profundidad del código y FastAPI la convierte en respuesta. Es lo mismo que hacía `raise_exception=True` en la lección 15: un solo camino para todos los errores.
>
> **Las respuestas de error en la documentación**, que es la carencia que la lección 21 midió:
>
> ```python
> @app.get('/api/libros/{libro_id}',
>          responses={404: {'description': 'No existe ese libro.'}})
> def obtener(libro_id: int) -> Libro:
>         ...
> ```
>
> Aquí también hay que escribirlas a mano. El armazón conoce los errores de validación y no los tuyos.
>
> **Y un resumen y una descripción**, que salen del texto de la función:
>
> ```python
> @app.post('/api/libros/', status_code=201, summary='Crear un libro')
> def crear(datos: LibroEntrada) -> Libro:
>         """
>     Crea un libro en estado de borrador.
>
>     El **ISBN** debe ser único. Para publicarlo, usa `/publicar`.
>     """
> ```
>
> El texto de documentación de la función aparece en la documentación navegable, con formato. Es de los sitios donde escribirlo rinde inmediatamente.

> [!resumen] En resumen
>
> FastAPI decide de dónde sale cada parámetro con tres reglas: si el nombre está entre llaves en la ruta, viene de la ruta; si el tipo es un modelo, del cuerpo; y si no, de la cadena de consulta, con funciones explícitas para cabeceras, galletas y ficheros. Una lista anotada recoge el parámetro repetido y lo convierte, que es lo que la lección 6 vio desde el lado del cliente. La forma moderna de declarar restricciones separa el tipo de los metadatos y devuelve el valor por defecto a su sitio. Con eso, una sola firma consigue lo que en DRF era la lección 19 entera: tope al tamaño de página, lista blanca de ordenaciones, documentación y validación antes de entrar en la función. Las rutas se organizan en enrutadores, que llevan el prefijo, las etiquetas y también las dependencias comunes. La trampa que más tiempo hace perder es que **FastAPI prueba las rutas en el orden en que las declaraste**: una ruta fija declarada después de una con parámetro no se alcanza nunca, y el error es un `422` que habla de convertir un entero y no menciona las rutas; el enrutador de DRF resolvía esto solo, aquí es tuyo y no hay aviso al arrancar. Y lo mejor de la lección es que **la anotación de retorno recorta la respuesta**: los campos que no estén en el modelo de salida no se publican, vengan de donde vengan, lo que convierte la lista explícita de campos de la lección 14 en algo que además no puede desalinearse de la documentación. Por eso el retorno se anota siempre: sin anotación, sale el objeto entero.

> [!ejercicio] Practica
>
> 1. Declara una función con parámetros de los cuatro sitios y compruébalos en una petición.
> 2. Recibe una lista repetida en la consulta y comprueba que llega convertida.
> 3. Reescribe una firma del estilo antiguo al moderno y compara.
> 4. Pon tope al tamaño de página y pide un número enorme.
> 5. Restringe la ordenación con una expresión regular e intenta saltártela.
> 6. Divide la API en dos enrutadores con prefijo y etiquetas.
> 7. Declara una ruta fija después de una con parámetro y mira el error.
> 8. Cámbialas de orden y comprueba que funciona.
> 9. Escribe la prueba que detecta ese problema.
> 10. Devuelve un objeto con campos sensibles sin anotar el retorno.
> 11. Anota el retorno con un modelo reducido y compara la respuesta.
> 12. Haz lo mismo devolviendo un diccionario con campos de más.
> 13. Lanza un error con la excepción del armazón desde una función auxiliar.
> 14. Documenta un código de error y compruébalo en la documentación navegable.
