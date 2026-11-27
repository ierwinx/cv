---
titulo: "Base de datos y asincronía"
resumen: "Montar el ORM que FastAPI no trae, y la medida que enseña que escribir `async` mal es siete veces peor que no escribirlo."
minutos: 18
orden: 26
---

Aquí está la diferencia real con Django. FastAPI no trae base de datos: hay que elegir ORM, montar la sesión, configurar las migraciones y decidir si todo eso es asíncrono.

Y la asincronía es el argumento técnico por el que se elige FastAPI, así que conviene medir si cumple. Cumple, y **solo si se usa bien**: hacerlo mal es peor que no hacerlo.

> [!objetivo] Qué vas a aprender
>
> Montar SQLAlchemy asíncrono con FastAPI, entender el sistema de dependencias, medir qué gana y qué pierde la asincronía, y reconocer el error que la anula por completo.

## Lo que hay que montar

```bash
pip install "sqlalchemy[asyncio]" aiosqlite alembic
```

```salida
SQLAlchemy 2.0.54 | Alembic 1.20.0
```

Los modelos, con la sintaxis moderna de SQLAlchemy 2, que usa anotaciones de tipo igual que el resto del bloque:

```python
from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
        pass


class Editorial(Base):
        __tablename__ = 'editoriales'

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    pais: Mapped[str] = mapped_column(String(60), default='')

    libros: Mapped[list['Libro']] = relationship(back_populates='editorial')


class Libro(Base):
        __tablename__ = 'libros'

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), index=True)
    isbn: Mapped[str] = mapped_column(String(17), unique=True)
    precio: Mapped[Decimal]
    editorial_id: Mapped[int] = mapped_column(ForeignKey('editoriales.id'))
    creado: Mapped[datetime] = mapped_column(server_default=func.now())

    editorial: Mapped[Editorial] = relationship(back_populates='libros')
```

Tres diferencias con Django que se ven en ese código:

**El nombre de la tabla es explícito.** Django lo deduce; aquí se escribe.

**La relación se declara en los dos lados**, con el `back_populates` uniéndolos. Django genera el inverso solo.

**Y no hay nombres verbales**, así que la ventaja de la lección 14 —etiquetas en español gratis— no existe. Lo que documenta aquí son los modelos de pydantic.

El motor y la fábrica de sesiones:

```python
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

motor = create_async_engine('sqlite+aiosqlite:///./catalogo.db')
Sesion = async_sessionmaker(motor, expire_on_commit=False)
```

Ese `expire_on_commit=False` no es un detalle: sin él, después de guardar, leer cualquier atributo del objeto dispara otra consulta, y en asíncrono eso **lanza una excepción** en lugar de funcionar despacio. Es de las primeras cosas con las que choca todo el mundo.

## Las dependencias

Aquí aparece la pieza central de FastAPI, que hasta ahora no había hecho falta:

```python
async def obtener_sesion() -> AsyncGenerator[AsyncSession]:
        async with Sesion() as sesion:
                yield sesion
```

```python
@app.get('/api/libros/')
async def listar(sesion: AsyncSession = Depends(obtener_sesion)) -> list[LibroSalida]:
        libros = await sesion.scalars(select(Libro).limit(20))
    return list(libros)
```

Una dependencia es **una función que produce lo que la ruta necesita**, y FastAPI la llama antes y limpia después. El `yield` es la clave: lo de antes se ejecuta al empezar, lo de después al terminar, pase lo que pase.

Lo interesante es que sirve para todo: la sesión de base de datos, el usuario autenticado —que es la lección siguiente—, la paginación, un cliente HTTP compartido. Y se anidan, de modo que la dependencia del usuario puede pedir la de la sesión sin que la ruta se entere.

Para no repetir el tipo largo en cada función:

```python
SesionBD = Annotated[AsyncSession, Depends(obtener_sesion)]


@app.get('/api/libros/')
async def listar(sesion: SesionBD) -> list[LibroSalida]:
        ...
```

Es el mismo patrón de tipo anotado reutilizable de la lección anterior, y es como se escribe hoy.

## De la base de datos al modelo de salida

El puente son dos líneas:

```python
class LibroSalida(BaseModel):
        model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    precio: Decimal
    editorial: EditorialSalida
```

Con eso, devolver un objeto de SQLAlchemy desde una ruta anotada funciona: pydantic lee atributos en vez de claves. Y sigue haciendo el recorte de la lección 24, que aquí importa todavía más, porque un modelo de base de datos tiene columnas que no se publican.

## Lo que cuesta no cargar las relaciones

El N+1 otra vez, ahora en SQLAlchemy. Serializando cincuenta libros con su editorial:

```salida
sin optimizar (una consulta por libro) : 51 consultas
con selectinload                       :  2 consultas
con joinedload                         :  1 consulta
```

Las dos formas de arreglarlo:

```python
from sqlalchemy.orm import joinedload, selectinload

select(Libro).options(selectinload(Libro.editorial))   # dos consultas
select(Libro).options(joinedload(Libro.editorial))     # una, con JOIN
```

Y no son intercambiables: **el de unión vale para las relaciones de uno a uno y de muchos a uno; el otro es el que hay que usar con las de uno a muchos**, porque una unión multiplica las filas y con un límite devuelve datos incompletos.

La regla práctica: la unión para ir «hacia el padre», el otro para ir «hacia los hijos». Son `select_related` y `prefetch_related` de la lección 15 del módulo 4 con otros nombres y la misma distinción.

> [!aviso] Aquí el N+1 no es silencioso, y eso es una ventaja
>
> Lo interesante de verdad. Si olvidas cargar la relación y la usas:
>
> ```salida
> libro.editorial.nombre
>
> MissingGreenlet: greenlet_spawn has not been called; can't call await_only()
> here. Was IO attempted in an unexpected place?
> ```
>
> **Revienta.** No hace cincuenta consultas en silencio: falla en la primera.
>
> Compáralo con la lección 14, donde el mismo descuido daba 399 consultas, una respuesta correcta, ningún aviso, y un problema que aparecía meses después en producción.
>
> Este mensaje es feo y habla de cosas que no vienen a cuento, y en cuanto lo reconoces significa una cosa concreta: **falta un `selectinload`**. Y es la única forma de N+1 que se detecta el primer día, porque no hay manera de escribir el código mal y que funcione.
>
> Es un buen ejemplo de que un error temprano y feo vale más que un comportamiento correcto y lento. En el modo síncrono de SQLAlchemy esto no pasa: la carga perezosa funciona y vuelves a tener el problema silencioso.

## La asincronía, medida

Y ahora la razón por la que se elige FastAPI. Diez peticiones simultáneas, cada una esperando una décima de segundo:

```salida
async + await asyncio.sleep       0,10 s
async + time.sleep                1,05 s
def normal + time.sleep           0,15 s

ideal concurrente: ~0,10 s   |   secuencial: ~1,00 s
```

La primera línea es lo que promete la asincronía: **diez esperas de 0,1 segundos en 0,1 segundos**, porque mientras una espera, las otras avanzan. Eso es lo que no hace un servidor síncrono con un solo proceso.

La tercera es la interesante: una función **sin** `async` también sale bien, 0,15 segundos, porque FastAPI detecta que no es asíncrona y **la ejecuta en un hilo aparte**. Es una decisión de diseño excelente y poco conocida: no te obliga a nada.

> [!aviso] Escribir `async` mal es siete veces peor que no escribirlo
>
> La segunda línea es el desastre:
>
> ```salida
> async + time.sleep     1,05 s
> def normal + time.sleep 0,15 s
> ```
>
> **Siete veces más lento por haber escrito `async`.**
>
> La causa es que una función asíncrona se ejecuta **en el bucle de eventos**, que es uno solo. Si dentro llamas a algo que bloquea, el bucle entero se para: ninguna otra petición avanza, ni siquiera las que no tienen nada que ver. Las diez peticiones se ponen en fila y tardan un segundo.
>
> Sin `async`, FastAPI la manda a un hilo y las diez avanzan a la vez.
>
> Lo que hace esto peligroso es que **no da ningún error** y en desarrollo no se nota, porque con una petición cada vez el bucle nunca tiene que atender a nadie más. Aparece en producción, con carga, como lentitud generalizada sin causa aparente: se ralentiza **todo**, no solo la ruta culpable, que es lo que más despista al diagnosticarlo.
>
> Y las cosas que bloquean son más de las que parece:
>
> ```salida
> time.sleep()                    -> asyncio.sleep()
> requests.get()                  -> httpx.AsyncClient
> open() y leer un fichero grande -> aiofiles, o un hilo
> un ORM síncrono                 -> la versión asíncrona
> subprocess.run()                -> asyncio.create_subprocess_exec
> hashear una contraseña          -> un hilo (es CPU, no espera)
> ```
>
> La tercera línea de esa tabla merece atención: **`requests` bloquea**, y es lo que todo el mundo tiene en los dedos después del bloque A. Una ruta `async` que llama a `requests.get` para hablar con otro servicio es exactamente este fallo, en el sitio donde más duele.
>
> Y el último caso es distinto y también cuenta: hashear una contraseña no espera a nadie, gasta procesador durante décimas de segundo. Eso también para el bucle.
>
> La regla, que es sencilla:
>
> **Si todo lo que hace la función es `await`, ponle `async`.**
>
> **Si algo dentro bloquea y no tiene versión asíncrona, no le pongas `async`** y deja que FastAPI la mande a un hilo.
>
> **Y si es una función asíncrona con un trozo bloqueante inevitable**, ese trozo va a un hilo explícitamente:
>
> ```python
> from anyio import to_thread
>
>
> @app.post('/registro')
> async def registro(datos: Registro, sesion: SesionBD):
>         cifrada = await to_thread.run_sync(hashear, datos.contrasena)
>     ...
> ```

> [!nota] Las migraciones
>
> Alembic es el equivalente de las migraciones de Django y hace falta configurarlo:
>
> ```bash
> alembic init -t async migraciones
> alembic revision --autogenerate -m "libros y editoriales"
> alembic upgrade head
> ```
>
> Dos diferencias con Django que conviene saber antes de elegir:
>
> **La detección automática es menos fiable.** Detecta tablas y columnas nuevas; los cambios de tipo, los renombrados y las restricciones se le escapan a menudo. La migración generada **hay que leerla siempre**, cosa que con Django se puede no hacer casi nunca.
>
> **Y no hay `makemigrations` por aplicación.** Un solo hilo de migraciones para todo el proyecto, lo que simplifica y complica el trabajo en paralelo: dos ramas que generen una migración cada una chocan, y hay que rehacer una a mano.
>
> No es peor herramienta; es menos automática. Y es una parte del coste de elegir FastAPI que no aparece en las comparaciones.

> [!consejo] Cuatro cosas de la sesión que hay que decidir
>
> **Una sesión por petición**, que es lo que da la dependencia de arriba. Compartir una entre peticiones es un error que en asíncrono produce fallos imposibles de reproducir, porque dos peticiones pisan la misma transacción.
>
> **El tamaño del depósito de conexiones.** Por defecto son cinco más diez de desbordamiento, y en una aplicación asíncrona que atiende cientos de peticiones a la vez eso se agota enseguida, con peticiones esperando una conexión:
>
> ```python
> motor = create_async_engine(URL, pool_size=20, max_overflow=10,
>                             pool_pre_ping=True)
> ```
>
> Ese `pool_pre_ping` comprueba que la conexión sigue viva antes de usarla, y es lo que evita el error de conexión cerrada por el servidor después de un rato de inactividad. Con PostgreSQL detrás de un cortafuegos, es obligatorio.
>
> **Dónde va el `commit`.** Lo más limpio es en la ruta, no en la dependencia, para que quede visible qué operaciones escriben:
>
> ```python
> @app.post('/api/libros/', status_code=201)
> async def crear(datos: LibroCrear, sesion: SesionBD) -> LibroSalida:
>         libro = Libro(**datos.model_dump())
>     sesion.add(libro)
>     await sesion.commit()
>     await sesion.refresh(libro)
>     return libro
> ```
>
> **Y qué hacer con las restricciones únicas.** SQLAlchemy lanza `IntegrityError`, que sin tratar es un `500`. Es la lección 2: un ISBN repetido es culpa del cliente y merece un `409` o un `400`, no un error del servidor:
>
> ```python
> from sqlalchemy.exc import IntegrityError
>
> try:
>         await sesion.commit()
> except IntegrityError:
>         await sesion.rollback()
>     raise HTTPException(409, 'Ya existe un libro con ese ISBN.')
> ```
>
> Ese `rollback` no es opcional: sin él, la sesión queda inservible y la siguiente operación falla con un mensaje que no tiene nada que ver.

> [!resumen] En resumen
>
> FastAPI no trae base de datos, y montarla son cuatro piezas: los modelos de SQLAlchemy con su sintaxis de anotaciones, el motor, la fábrica de sesiones —con la opción que evita que leer un atributo después de guardar dispare otra consulta— y Alembic para las migraciones, que es menos automático que Django y cuyas migraciones generadas hay que leer siempre. La sesión llega a las rutas por el sistema de dependencias, que es la pieza central de FastAPI: una función que produce lo que la ruta necesita y limpia después, reutilizable para la sesión, el usuario y cualquier recurso compartido. Un modelo de pydantic con la opción de leer atributos hace de puente, con el recorte de la lección 24. El N+1 se arregla con dos funciones que no son intercambiables: la de unión para ir hacia el padre y la otra para ir hacia los hijos, porque una unión con límite devuelve datos incompletos. Y hay una ventaja inesperada: **en asíncrono, olvidar cargar una relación revienta con un error** en lugar de hacer cincuenta consultas en silencio, que es lo que pasaba en la lección 14. Sobre la asincronía, lo medido: diez peticiones que esperan una décima tardan una décima si está bien escrita, y **un segundo si dentro hay algo bloqueante**, es decir siete veces peor que no haber escrito `async`, porque el bucle de eventos es uno solo y se para entero, ralentizando todas las rutas y no solo la culpable. Sin `async`, FastAPI manda la función a un hilo y sale bien. Las cosas que bloquean son más de las que parece, y la que más duele es `requests`, que es lo que todo el mundo tiene en los dedos después del bloque A. La regla es poner `async` solo si todo dentro es espera asíncrona, y mandar a un hilo lo que no lo sea.

> [!ejercicio] Practica
>
> 1. Monta los modelos de SQLAlchemy con la sintaxis de anotaciones.
> 2. Crea la dependencia de sesión y úsala en una ruta.
> 3. Conviértela en un tipo anotado reutilizable.
> 4. Devuelve un objeto del ORM desde una ruta anotada y comprueba que funciona.
> 5. Comprueba que los campos que no declaras no salen.
> 6. Cuenta las consultas de un listado con relación sin optimizar.
> 7. Optimízalo de las dos formas y compara.
> 8. Olvida cargar la relación y mira el error que da.
> 9. Repite lo mismo con la versión síncrona de SQLAlchemy y compara los dos comportamientos.
> 10. Mide diez peticiones simultáneas a una ruta asíncrona bien escrita.
> 11. Cambia la espera por una bloqueante y vuelve a medir.
> 12. Quita el `async` de esa misma función y mide otra vez.
> 13. Busca en tu código las llamadas bloqueantes dentro de funciones asíncronas.
> 14. Manda una operación de procesador a un hilo y comprueba la diferencia.
> 15. Provoca un error de clave repetida y conviértelo en el código correcto.
