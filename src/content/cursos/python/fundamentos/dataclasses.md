---
titulo: "Dataclasses"
resumen: "El decorador dataclass escribe por ti el init, el repr y la comparación de las clases que solo guardan datos."
minutos: 12
orden: 58
---

Muchas clases no tienen comportamiento interesante: solo agrupan datos. Un producto de catálogo, una fila de un CSV, una coordenada. Y para que se comporten decentemente hay que escribir siempre lo mismo.

Mira la cantidad de código repetitivo que hace falta para una clase con cuatro campos:

```python
class Producto:
        def __init__(self, referencia, nombre, precio, unidades=0):
                self.referencia = referencia
        self.nombre = nombre
        self.precio = precio
        self.unidades = unidades

    def __repr__(self):
                return (f"Producto(referencia={self.referencia!r}, nombre={self.nombre!r}, "
                f"precio={self.precio!r}, unidades={self.unidades!r})")

    def __eq__(self, otro):
                if not isinstance(otro, Producto):
                        return NotImplemented
        return (self.referencia, self.nombre, self.precio, self.unidades) == \
               (otro.referencia, otro.nombre, otro.precio, otro.unidades)
```

Veinte líneas y ni una sola decisión propia: los nombres de los campos aparecen **cuatro veces cada uno**. Añadir un campo quinto obliga a tocar tres sitios, y olvidarse de uno da fallos silenciosos.

## El decorador `@dataclass`

`dataclasses` es un módulo de la biblioteca estándar. Con su decorador, la clase de arriba se queda así:

```python
from dataclasses import dataclass


@dataclass
class Producto:
        referencia: str
    nombre: str
    precio: float
    unidades: int = 0

    def valor_en_almacen(self) -> float:
                return self.precio * self.unidades


teclado = Producto("TEC-001", "Teclado mecánico", 79.90, 4)
otro = Producto("TEC-001", "Teclado mecánico", 79.90, 4)
raton = Producto("RAT-007", "Ratón inalámbrico", 24.50)

print(teclado)
print(teclado == otro)
print(teclado == raton)
print(raton.unidades)
print(f"{teclado.valor_en_almacen():.2f} €")
```

```salida
Producto(referencia='TEC-001', nombre='Teclado mecánico', precio=79.9, unidades=4)
True
False
0
319.60 €
```

Los campos se declaran **con anotaciones de tipo**, una por línea, y no es opcional: sin los dos puntos y el tipo, el decorador no reconoce el campo y no lo mete en el `__init__`. La anotación es también la documentación de la clase, que se lee de un vistazo.

Que sea una dataclass no le quita nada: sigue siendo una clase normal y puede tener métodos, propiedades y todo lo demás, como ese `valor_en_almacen`.

### Qué genera automáticamente

| Método | Qué hace |
| --- | --- |
| `__init__` | Un parámetro por campo, en el orden declarado, con sus valores por defecto |
| `__repr__` | El texto `Clase(campo=valor, ...)` con todos los campos |
| `__eq__` | Compara campo a campo, y exige que sean de la misma clase |

Lo que **no** genera salvo que se lo pidas: `__lt__` y compañía para ordenar, y `__hash__`.

> [!aviso] Las anotaciones no validan nada
>
> `precio: float` es una nota para quien lee y para las herramientas de análisis. Python no comprueba nada en tiempo de ejecución:
>
> ```python
> raro = Producto(42, "carísimo")
> print(raro)
> ```
>
> ```salida
> Producto(nombre=42, precio='carísimo')
> ```
>
> Si necesitas validar de verdad, tienes que hacerlo tú, y lo verás unos apartados más abajo.

## Valores por defecto y la trampa de los mutables

Los valores por defecto se ponen como en cualquier función, con un igual, y los campos que los tienen van después de los que no. Pero con una lista aparece esto:

```python
@dataclass
class Pedido:
        cliente: str
    lineas: list = []
```

```salida
ValueError: mutable default <class 'list'> for field lineas is not allowed: use default_factory
```

Ese error es una buena noticia. Es exactamente **la trampa del argumento por defecto mutable** que viste en la lección de funciones: el valor por defecto se evalúa una sola vez, así que todos los pedidos compartirían la misma lista y las líneas de uno aparecerían en los demás. En una función normal Python te deja hacerlo y el fallo se descubre tarde; en una dataclass te lo impide de entrada.

La solución es `field(default_factory=...)`, que recibe una función y **la llama de nuevo en cada objeto**:

```python
from dataclasses import dataclass, field


@dataclass
class Pedido:
        cliente: str
    lineas: list[str] = field(default_factory=list)
    etiquetas: set[str] = field(default_factory=set)


primero = Pedido("Lucía Ferrer")
segundo = Pedido("Iván Soto")

primero.lineas.append("Teclado mecánico")

print(primero)
print(segundo)
```

```salida
Pedido(cliente='Lucía Ferrer', lineas=['Teclado mecánico'], etiquetas=set())
Pedido(cliente='Iván Soto', lineas=[], etiquetas=set())
```

Se le pasa `list`, no `list()`: la función, no su resultado. Vale cualquier función sin argumentos, así que `field(default_factory=dict)`, `field(default_factory=set)` o incluso una tuya como `field(default_factory=generar_referencia)`.

## `order=True`: poder ordenar

Con esta opción, la dataclass genera también `__lt__`, `__gt__`, `__le__` y `__ge__`, que comparan **los campos en el orden en que están declarados**, igual que si fueran tuplas:

```python
@dataclass(order=True)
class Producto:
        precio: float
    nombre: str


catalogo = [
    Producto(79.90, "Teclado mecánico"),
    Producto(24.50, "Ratón inalámbrico"),
    Producto(219.00, "Monitor 27 pulgadas"),
]

for producto in sorted(catalogo):
        print(producto)

print(min(catalogo))
print(catalogo[0] > catalogo[1])
```

```salida
Producto(precio=24.5, nombre='Ratón inalámbrico')
Producto(precio=79.9, nombre='Teclado mecánico')
Producto(precio=219.0, nombre='Monitor 27 pulgadas')
Producto(precio=24.5, nombre='Ratón inalámbrico')
True
```

El orden de declaración importa mucho aquí: poniendo `precio` primero se ordena por precio y, a igualdad de precio, por nombre. Si el criterio que quieres no coincide con el orden natural de los campos, no uses `order=True` y define tú el `__lt__`, o sigue usando `sorted(..., key=...)`.

## `frozen=True`: objetos inmutables

Una dataclass congelada no deja cambiar sus campos después de crearla:

```python
@dataclass(frozen=True)
class Coordenada:
        latitud: float
    longitud: float


zaragoza = Coordenada(41.6488, -0.8891)
print(zaragoza)
print({zaragoza, Coordenada(41.6488, -0.8891)})

zaragoza.latitud = 0.0
```

```salida
Coordenada(latitud=41.6488, longitud=-0.8891)
{Coordenada(latitud=41.6488, longitud=-0.8891)}
Traceback (most recent call last):
  File "/Users/erwin/curso-python/coordenada.py", line 13, in <module>
    zaragoza.latitud = 0.0
    ^^^^^^^^^^^^^^^^
  File "<string>", line 16, in __setattr__
dataclasses.FrozenInstanceError: cannot assign to field 'latitud'
```

Fíjate en la segunda línea de salida: el conjunto tiene **un solo elemento** aunque se metieran dos coordenadas. Congelar una dataclass le genera además un `__hash__`, así que se puede usar en conjuntos y como clave de diccionario, cosa que las normales no pueden por tener `__eq__`.

Congelar tiene sentido cuando el objeto representa **un valor y no una cosa que evoluciona**: una coordenada, un importe con su divisa, una fecha de un rango. Un carrito de la compra, en cambio, está hecho para cambiar.

> [!nota] Congelado no significa blindado
>
> `frozen=True` impide asignar a los campos, pero si un campo contiene una lista, esa lista se puede seguir modificando con `.append()`. Lo congelado es la asignación, no el contenido. Es la misma diferencia que hay entre una tupla, que no se puede reasignar, y la lista que puede llevar dentro.

## Validar con `__post_init__`

Si necesitas comprobar o ajustar datos al crear el objeto, la dataclass llama a `__post_init__` justo después del `__init__` que ha generado:

```python
@dataclass
class Producto:
        nombre: str
    precio: float

    def __post_init__(self):
                if self.precio < 0:
                        raise ValueError(f"El precio no puede ser negativo: {self.precio}")
        self.nombre = self.nombre.strip().title()


print(Producto("  teclado mecánico ", 79.90))

try:
        Producto("Ratón", -5)
except ValueError as error:
        print(f"Rechazado: {error}")
```

```salida
Producto(nombre='Teclado Mecánico', precio=79.9)
Rechazado: El precio no puede ser negativo: -5
```

Así conservas la brevedad de la dataclass sin renunciar a las validaciones.

## `asdict`: el puente con JSON

`asdict()` convierte el objeto en un diccionario, recorriendo también las dataclasses anidadas, las listas y los diccionarios que lleve dentro. Y un diccionario es justo lo que `json.dumps` sabe guardar:

```python title="tareas.py"
import json
from dataclasses import dataclass, field, asdict


@dataclass
class Tarea:
        titulo: str
    hecha: bool = False
    etiquetas: list[str] = field(default_factory=list)


tareas = [
    Tarea("Revisar la factura de octubre", etiquetas=["administración"]),
    Tarea("Preparar la charla", hecha=True),
]

print(asdict(tareas[0]))

texto = json.dumps([asdict(t) for t in tareas], indent=2, ensure_ascii=False)
print(texto)

datos = json.loads(texto)
recuperadas = [Tarea(**datos_tarea) for datos_tarea in datos]
print(recuperadas)
print(recuperadas == tareas)
```

```salida
{'titulo': 'Revisar la factura de octubre', 'hecha': False, 'etiquetas': ['administración']}
[
  {
    "titulo": "Revisar la factura de octubre",
    "hecha": false,
    "etiquetas": [
      "administración"
    ]
  },
  {
    "titulo": "Preparar la charla",
    "hecha": true,
    "etiquetas": []
  }
]
[Tarea(titulo='Revisar la factura de octubre', hecha=False, etiquetas=['administración']), Tarea(titulo='Preparar la charla', hecha=True, etiquetas=[])]
True
```

Ese ciclo completo es el que usarás una y otra vez:

- Para guardar: `asdict()` sobre cada objeto y `json.dumps` de la lista resultante.
- Para cargar: `json.loads` y después `Tarea(**diccionario)`, que desempaqueta las claves como argumentos con nombre.
- La última línea, `recuperadas == tareas`, da `True` gracias al `__eq__` generado. Es la comprobación más barata de que el guardado y la carga no han perdido nada por el camino.

> [!aviso] Tarea(\*\*diccionario) exige que las claves cuadren
>
> Si el JSON trae una clave que no es un campo de la dataclass, salta un `TypeError` diciendo que hay un argumento inesperado. Y si falta una clave obligatoria, otro diciendo que falta. Es incómodo cuando el fichero lo ha escrito otra versión del programa, así que en un proyecto real conviene envolver esa línea en un `try`/`except TypeError` y decidir qué hacer con los datos que no encajan.

## Cuándo usar una dataclass

| Usa una dataclass cuando | Usa una clase normal cuando |
| --- | --- |
| El objeto es sobre todo un conjunto de campos | El objeto tiene comportamiento y el estado es secundario |
| Quieres `repr` y `==` sin escribirlos | Lo que importa es la identidad, no los valores |
| Los datos vienen o van a JSON, CSV o una base de datos | Todos los atributos son internos y nadie los ve |
| Hay muchos campos y el `__init__` sería puro copiar | El `__init__` hace trabajo de verdad, no solo asignar |

En la duda, empieza con una dataclass. Pasar de dataclass a clase normal es quitar un decorador y escribir el `__init__`, y el código que la usa no se entera.

> [!consejo] Existe una alternativa sin decorador
>
> Para datos de solo lectura y muy simples, `NamedTuple` del módulo `typing` ofrece algo parecido y además desempaquetable como una tupla. Y fuera de la biblioteca estándar, `pydantic` hace lo mismo que las dataclasses pero validando los tipos de verdad, que es lo que echarás de menos en cuanto los datos vengan de fuera. Lo verás en el módulo de APIs.

> [!resumen] En resumen
>
> `@dataclass` genera el `__init__`, el `__repr__` y el `__eq__` a partir de los campos declarados con anotaciones de tipo, que hay que poner porque sin ellas el campo no cuenta. Los valores por defecto mutables están prohibidos y se sustituyen por `field(default_factory=list)`, la misma trampa del argumento por defecto mutable pero detectada a tiempo. Con `order=True` se generan las comparaciones y se puede ordenar, comparando los campos en el orden declarado; con `frozen=True` el objeto pasa a ser inmutable y además se puede meter en conjuntos. `__post_init__` es el hueco para validar, y `asdict()` convierte el objeto en un diccionario listo para `json.dumps`. Para clases que son sobre todo datos, una dataclass; si el objeto tiene comportamiento de verdad, una clase normal.

> [!ejercicio] Practica
>
> Crea un fichero `58-dataclasses.py` y resuelve:
>
> 1. Convierte en dataclass esta clase y comprueba que el `repr` y el `==` funcionan sin escribirlos:
>
> ```python
> class Libro:
>         def __init__(self, isbn, titulo, autor, paginas=0):
>                 self.isbn = isbn
>         self.titulo = titulo
>         self.autor = autor
>         self.paginas = paginas
> ```
>
> 2. Añádele un campo `etiquetas` que sea una lista vacía por defecto. Prueba primero con `= []`, lee el `ValueError` y arréglalo con `field(default_factory=list)`.
> 3. Añade un método `es_largo()` que devuelva `True` si tiene más de 400 páginas, y comprueba que una dataclass admite métodos normales.
> 4. Crea una lista de cinco libros y ordénala por páginas de dos formas: con `order=True` y con `sorted(..., key=...)`. Explica en un comentario qué limitación tiene la primera.
> 5. Escribe una dataclass `Coordenada` con `frozen=True`, mete tres coordenadas en un `set` con una repetida y comprueba que quedan dos. Después intenta modificar una y lee el error.
> 6. Guarda la lista de libros en `libros.json` con `asdict` y `json.dumps`, vuelve a cargarla y comprueba con `==` que los objetos recuperados son iguales a los originales.
