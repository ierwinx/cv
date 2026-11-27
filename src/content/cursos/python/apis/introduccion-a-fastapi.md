---
titulo: "Introducción a FastAPI"
resumen: "La misma API en cincuenta líneas, diez veces más rápida serializando, y el error de validación que te devuelve la contraseña que acabas de rechazar."
minutos: 16
orden: 23
---

Empieza el último bloque del curso. FastAPI es la otra forma de escribir una API en Python, y lleva unos años siendo la que todo el mundo recomienda.

Las comparaciones que se leen por ahí son de dos tipos: las que dicen que es diez veces más rápido y las que dicen que eso no importa. Vamos a medirlo, y vamos a ver que las dos tienen parte de razón y ninguna dice lo que de verdad decide la elección.

> [!objetivo] Qué vas a aprender
>
> Escribir una API con FastAPI y compararla con la misma en DRF, midiendo lo que cuesta cada una en dependencias y en velocidad, y conocer las tres diferencias de comportamiento que hay que decidir antes de elegir.

## La misma API

Esta es entera, con tres puntos de acceso, validación y documentación:

```python
from datetime import date
from decimal import Decimal
from enum import Enum

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

app = FastAPI(title='API del catálogo', version='1.0.0')


class Estado(str, Enum):
        borrador = 'borrador'
    publicado = 'publicado'
    descatalogado = 'descatalogado'


class LibroEntrada(BaseModel):
        titulo: str = Field(max_length=200)
    isbn: str = Field(max_length=17)
    precio: Decimal = Field(max_digits=7, decimal_places=2)
    paginas: int = Field(default=0, ge=0)
    estado: Estado = Estado.borrador
    publicado_en: date | None = None


class Libro(LibroEntrada):
        id: int


@app.get('/api/libros/')
def listar(estado: Estado | None = None,
           limite: int = Query(default=20, le=100)) -> list[Libro]:
        libros = [l for l in LIBROS.values() if estado is None or l.estado == estado]
    return libros[:limite]


@app.get('/api/libros/{libro_id}')
def obtener(libro_id: int) -> Libro:
        if libro_id not in LIBROS:
                raise HTTPException(404, 'No existe ese libro.')
    return LIBROS[libro_id]


@app.post('/api/libros/', status_code=201)
def crear(datos: LibroEntrada) -> Libro:
        nuevo = Libro(id=len(LIBROS) + 1, **datos.model_dump())
    LIBROS[nuevo.id] = nuevo
    return nuevo
```

Cincuenta líneas, sin ficheros de ajustes ni de rutas. Se arranca con:

```bash
fastapi dev app/main.py
```

Y la idea central es esta: **las anotaciones de tipo de Python son la especificación.** Ese `libro_id: int` de la ruta hace cuatro cosas a la vez:

**Convierte** el texto de la dirección a entero.

**Valida**, devolviendo un error si no es un número.

**Documenta**, apareciendo en el esquema OpenAPI como entero.

**Y ayuda al editor**, porque es una anotación normal.

Es la misma idea que la lección 21 pedía a mano con un decorador para arreglar la documentación, aquí llevada al centro del diseño. Nada de esto es un invento de FastAPI: es Python estándar, y por eso no hay que aprender un lenguaje de declaración aparte.

## Lo que cuesta instalarlo

```salida
fastapi + uvicorn   14 paquetes,  29 MB
fastapi[standard]   45 paquetes,  74 MB
django + DRF        22 paquetes,  68 MB
```

Aquí hay una sorpresa. FastAPI tiene fama de ligero, y lo es **si lo instalas a secas**: catorce paquetes y la mitad de espacio que Django.

Lo que casi todos los tutoriales instalan es `fastapi[standard]`, y eso son cuarenta y cinco paquetes, más que Django con DRF. Y entre ellos:

```salida
sentry-sdk 2.70.0
fastapi-cloud-cli 0.26.0
agent-detector 2.0.0
detect-installer 0.2.1
```

**Un cliente de un servicio comercial de nube, un sistema de informes de errores y dos detectores** que miran cómo instalaste el paquete. Nada de eso hace falta para servir una API, y en un contenedor de producción son megabytes y superficie de ataque que nadie pidió.

La recomendación práctica: instala lo que necesites y no el ramo entero.

```bash
pip install fastapi uvicorn[standard]
```

Es la misma disciplina que la lección 22 del módulo 2 pedía con las dependencias, y aquí se nota más porque el corchete parece inofensivo.

## Lo que cuesta ejecutarlo

La cifra que se repite es que FastAPI es mucho más rápido. Medido aquí, sirviendo una lista de cien objetos:

```salida
FastAPI listado de 100: mediana 0,88 ms
DRF     listado de 100: mediana 7,81 ms
```

Nueve veces. Y esa comparación es **tramposa**, porque la de FastAPI no toca la base de datos. La prueba está en el otro caso:

```salida
FastAPI un objeto: mediana 0,77 ms
DRF     un objeto: mediana 0,73 ms
```

**DRF va igual o mejor**, porque cuando solo hay un objeto la base de datos apenas cuesta y lo que queda es el armazón, que es comparable.

Así que aislemos lo único que de verdad se puede comparar, que es serializar, sin HTTP y sin base de datos, cien objetos con siete campos:

```salida
DRF, serializador plano:  0,969 ms
pydantic, validar:        0,098 ms
pydantic, volcar a dict:  0,097 ms
pydantic, volcar a JSON:  0,125 ms
```

**Diez veces**, y ese sí es un número honrado. Pydantic tiene el núcleo escrito en Rust y se nota.

> [!aviso] Los números que circulan están medidos mal, en los dos sentidos
>
> El primer intento de medición de esta lección dio **ciento noventa y cinco veces** a favor de pydantic. Ese número era falso, y la causa merece contarse porque es la misma de casi todas las comparaciones que se publican:
>
> ```salida
> DRF con fields='__all__' : 18,98 ms  y 100 consultas
> DRF con serializador plano: 0,969 ms y 0 consultas
> ```
>
> El serializador de `__all__` incluye una relación de muchos a muchos, así que **el 95 % de esos 18,98 ms era el N+1 de la lección 14**, no serialización. Comparar eso con pydantic —que no tenía base de datos— es comparar una consulta mal escrita con ninguna consulta.
>
> Y el error simétrico también es común: concluir que da igual porque sirviendo un objeto suelto van iguales.
>
> Lo que hay que llevarse es lo que significan diez veces en 0,9 milisegundos. Una petición real tiene una consulta de base de datos de entre 1 y 50 milisegundos, una llamada a otro servicio quizá, y la red por delante. **Ahorrar 0,8 ms de serialización sobre una petición de 40 ms es un 2 %.**
>
> Por eso el rendimiento es la peor razón para elegir FastAPI, salvo en dos casos concretos donde sí decide: cuando devuelves respuestas enormes —miles de objetos, y ahí las diez veces se multiplican— y cuando tu aplicación pasa el tiempo esperando a otros servicios, que es lo que resuelve la asincronía y es la lección 26.

## Las tres diferencias que sí deciden

Más importantes que los milisegundos.

**Primera: FastAPI no trae base de datos.** Ni ORM, ni migraciones, ni panel de administración, ni sistema de usuarios, ni correo. Eso se elige y se monta, normalmente con SQLAlchemy y Alembic, y es la lección 26.

Para un proyecto que necesita todo eso, Django ya lo tiene resuelto y probado, y montarlo pieza a pieza son semanas. Para un servicio que habla con otra cosa y no tiene modelos propios, el armazón de Django es peso muerto.

**Segunda: la asincronía es de primera clase.** FastAPI la soporta de verdad porque nació así; Django la ha ido añadiendo y el ORM asíncrono aún tiene esquinas. Es la lección 26 y es el argumento técnico real.

**Tercera: los errores son distintos**, y hay que verlo.

## Los errores

Las dos partes de esto sorprenden. Enviando un cuerpo vacío:

```salida
POST /api/libros/  {}
422 Unprocessable Content

{"detail": [
  {"type": "missing", "loc": ["body", "titulo"], "msg": "Field required", "input": {}},
  {"type": "missing", "loc": ["body", "isbn"],   "msg": "Field required", "input": {}},
  {"type": "missing", "loc": ["body", "precio"], "msg": "Field required", "input": {}}
]}
```

Comparado con DRF:

```salida
400 Bad Request
{"titulo": ["Este campo es requerido."],
 "isbn": ["Este campo es requerido."]}
```

**Tres diferencias.** El código es `422` y no `400`, que es correcto según el estándar y lo usa casi nadie, así que quien consuma tu API tendrá que tratarlo aparte. La forma es una lista de objetos en vez de un diccionario por campo, más informativa y más incómoda de pintar en un formulario. Y **están en inglés**, sin traducción incluida, al revés que DRF.

Las tres se pueden cambiar con un manejador propio, y conviene hacerlo el primer día, porque cambiar el formato de los errores después es de los cambios que rompen, según la tabla de la lección 22.

> [!aviso] El error de validación te devuelve lo que enviaste
>
> Esta es la parte seria. Con un modelo que tiene una contraseña:
>
> ```salida
> POST /registro  {"correo": "ana@t.es", "contrasena": "corta", "edad": "no-es-numero"}
>
> 422
> {"detail": [
>   {"type": "string_too_short",
>    "loc": ["body", "contrasena"],
>    "msg": "String should have at least 12 characters",
>    "input": "corta",                              <-- aquí
>    "ctx": {"min_length": 12}},
>   {"type": "int_parsing",
>    "loc": ["body", "edad"],
>    "msg": "Input should be a valid integer...",
>    "input": "no-es-numero"}
> ]}
> ```
>
> **`"input": "corta"` es la contraseña que el usuario acaba de intentar poner**, devuelta tal cual en el cuerpo de la respuesta.
>
> Y de ahí se va a tres sitios donde no debería estar: los registros del servidor si se anotan las respuestas de error, el servicio de seguimiento de errores si tienes uno, y la consola del navegador de quien lo esté usando. Con una tarjeta de crédito, un número de la seguridad social o una contraseña que la persona reutiliza en otros sitios, eso es una fuga.
>
> Es un valor por defecto pensado para depurar, y en producción hay que quitarlo:
>
> ```python
> from fastapi import Request, status
> from fastapi.exceptions import RequestValidationError
> from fastapi.responses import JSONResponse
>
>
> @app.exception_handler(RequestValidationError)
> async def errores_de_validacion(peticion: Request, exc: RequestValidationError):
>         errores = {}
>     for error in exc.errors():
>                 campo = '.'.join(str(x) for x in error['loc'][1:]) or 'general'
>         errores.setdefault(campo, []).append(error['msg'])
>     return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
>                         content={'errores': errores})
> ```
>
> Veinte líneas que arreglan las cuatro cosas a la vez: quitan el valor enviado, agrupan por campo, devuelven `400` en lugar de `422` y dejan un sitio donde traducir los mensajes. **Va en la primera versión**, no en la segunda.

> [!nota] Lo que FastAPI hace bien de fábrica y DRF no
>
> Tres aciertos que conviene reconocer, porque son los reversos de los avisos de las lecciones 12 y 21.
>
> **El dinero sale como texto**, igual que DRF:
>
> ```salida
> {"titulo":"El número ñ","precio":"19.98","paginas":234}
> ```
>
> Un `Decimal` se serializa entre comillas. Es la regla de la lección 3 y los dos armazones la respetan.
>
> **Y los acentos salen sin escapar**, también igual.
>
> **La documentación es correcta desde el principio.** Aquí sí hay diferencia: como el esquema sale de las anotaciones de tipo, no puede desalinearse del código. El problema de la lección 21 —un campo documentado como texto que devuelve una lista— **no puede ocurrir**, porque la anotación es a la vez la documentación y lo que valida la respuesta.
>
> Esa es, en la práctica, la mejor característica de FastAPI y la que menos se menciona: no que la documentación se genere sola, que eso también lo hace DRF, sino que **no puede mentir**.

> [!consejo] Cuándo elegir cada uno
>
> Sin la parte de moda:
>
> | Elige Django y DRF si… | Elige FastAPI si… |
> | --- | --- |
> | Hay modelos, y bastantes | El servicio no tiene base de datos propia, o es sencilla |
> | Quieres panel de administración | No lo necesitas |
> | Necesitas usuarios, permisos, correo | Te basta con validar un token |
> | Habrá también páginas web | Es solo API |
> | El equipo ya sabe Django | El equipo ya sabe anotaciones de tipo |
> |  | Hay mucha espera a otros servicios |
> |  | Las respuestas son enormes |
>
> Y dos consideraciones que pesan más que la tabla:
>
> **Lo que ya sabe tu equipo** vale más que cualquier diferencia técnica de esta lección. Un equipo que sabe Django escribe una API en DRF en un día, y en FastAPI tarda una semana en decidir el ORM.
>
> **Un proyecto puede tener los dos.** No es raro: Django para la aplicación con sus modelos y su panel, y un servicio pequeño en FastAPI para lo que necesita velocidad o asincronía. Se comunican por HTTP, que es de lo que iba el bloque A.
>
> Lo que no tiene sentido es reescribir una API de DRF que funciona para ganar 0,8 milisegundos.

> [!resumen] En resumen
>
> FastAPI escribe la misma API en cincuenta líneas, y su idea central es que **las anotaciones de tipo de Python son la especificación**: una anotación convierte, valida, documenta y ayuda al editor a la vez. Instalarlo a secas son catorce paquetes y la mitad de espacio que Django, pero el `[standard]` que instalan los tutoriales son cuarenta y cinco, más que Django con DRF, e incluye un cliente de un servicio comercial de nube y un sistema de informes de errores que nadie pidió. En rendimiento, las comparaciones que circulan están mal hechas en los dos sentidos: el primer intento de esta lección dio 195 veces, y el 95 % de esa diferencia era el N+1 de la lección 14 y no serialización; aislando solo el serializado de cien objetos, la cifra honrada es **diez veces**, que son 0,8 milisegundos sobre una petición real de cuarenta, es decir un 2 %, y por eso el rendimiento es la peor razón para elegirlo salvo con respuestas enormes o mucha espera a otros servicios. Lo que sí decide es que FastAPI no trae base de datos, ORM, panel, usuarios ni correo, y que su asincronía es de primera clase. Sus errores de validación son `422` en lugar de `400`, con una forma distinta y en inglés, y hay que cambiarlos el primer día porque después rompen a los clientes; sobre todo porque **devuelven el valor rechazado dentro de la respuesta**, de modo que una contraseña demasiado corta acaba en los registros, en el seguimiento de errores y en la consola del navegador. A cambio, el dinero y los acentos salen igual de bien que en DRF, y su documentación **no puede mentir**, porque la anotación es a la vez lo que documenta y lo que valida.

> [!ejercicio] Practica
>
> 1. Escribe la API de tres puntos de acceso y arráncala.
> 2. Instala FastAPI a secas y con el extra, y compara los paquetes de cada uno.
> 3. Busca en la lista del extra los paquetes que no sirven para servir una API.
> 4. Mide el tiempo de un listado y de un objeto suelto, y compáralo con DRF.
> 5. Aísla la serialización sin HTTP ni base de datos y vuelve a medir.
> 6. Repite la medida de DRF con un serializador que tenga una relación múltiple, y cuenta las consultas.
> 7. Manda un cuerpo vacío y estudia el código y la forma del error.
> 8. Crea un modelo con un campo de contraseña y provoca un error de validación.
> 9. Busca el valor rechazado dentro de la respuesta.
> 10. Escribe el manejador que arregla las cuatro cosas a la vez.
> 11. Comprueba cómo sale un decimal y un texto con tildes.
> 12. Abre la documentación automática y compárala con la de DRF.
