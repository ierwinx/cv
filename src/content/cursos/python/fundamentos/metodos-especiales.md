---
titulo: "Métodos especiales"
resumen: "Los métodos con doble guion bajo que hacen que tus objetos funcionen con print, len, ==, in, sorted y el operador más."
minutos: 14
orden: 57
---

Tus clases funcionan, pero se notan de segunda categoría al lado de las de Python. Una lista se imprime y se entiende, se le puede pedir `len()`, se compara con `==`, se ordena con `sorted()` y se pregunta por sus elementos con `in`. Un objeto tuyo no hace nada de eso.

La diferencia no es que las listas sean mágicas: es que definen unos métodos concretos que Python busca cuando le pides esas operaciones. Se llaman **métodos especiales**, y tú puedes definirlos igual.

## Qué son y cómo funcionan

Ya conoces uno, `__init__`. El mecanismo es siempre el mismo: **tú los defines y Python los llama por ti** cuando aparece la operación correspondiente.

- Escribes `len(pedido)` y Python ejecuta `pedido.__len__()`.
- Escribes `pedido_a + pedido_b` y Python ejecuta `pedido_a.__add__(pedido_b)`.
- Escribes `print(producto)` y Python ejecuta `producto.__str__()`.

No se llaman nunca a mano. Escribir `pedido.__len__()` funciona, pero es como llamar al timbre metiendo la mano por la ventana.

## `__str__` y `__repr__`

Sin ninguno de los dos, un objeto tuyo se imprime así:

```python
class Producto:
        def __init__(self, nombre, precio):
                self.nombre = nombre
        self.precio = precio


teclado = Producto("Teclado mecánico", 79.90)

print(teclado)
print([teclado])
print(f"He comprado un {teclado}")
```

```salida
<__main__.Producto object at 0x100d11fd0>
[<__main__.Producto object at 0x100d11fd0>]
He comprado un <__main__.Producto object at 0x100d11fd0>
```

Inútil en los tres casos. Con los dos métodos definidos:

```python
class Producto:
        def __init__(self, nombre, precio):
                self.nombre = nombre
        self.precio = precio

    def __str__(self):
                return f"{self.nombre} ({self.precio:.2f} €)"

    def __repr__(self):
                return f"Producto({self.nombre!r}, {self.precio!r})"


teclado = Producto("Teclado mecánico", 79.90)
raton = Producto("Ratón inalámbrico", 24.50)

print(teclado)
print(str(teclado))
print(repr(teclado))
print([teclado, raton])
```

```salida
Teclado mecánico (79.90 €)
Teclado mecánico (79.90 €)
Producto('Teclado mecánico', 79.9)
[Producto('Teclado mecánico', 79.9), Producto('Ratón inalámbrico', 24.5)]
```

### La diferencia entre los dos

Son dos públicos distintos:

|  | `__str__` | `__repr__` |
| --- | --- | --- |
| Para quién | Para quien usa el programa | Para quien lo programa |
| Qué busca | Que se lea bien | Que sea exacto y sin ambigüedad |
| Quién lo llama | `print()`, `str()`, las f-strings | `repr()`, la consola interactiva, las colecciones |
| Objetivo ideal | Una frase legible | Un texto que, copiado y pegado, recree el objeto |

Fíjate en la cuarta línea de la salida: al imprimir una **lista** de productos, Python no usa `__str__` de cada uno, sino `__repr__`. Lo hace a propósito, porque dentro de una colección interesa distinguir los elementos sin ambigüedad, no que quede bonito.

El `!r` dentro de la f-string de `__repr__` aplica `repr()` al valor, que en una cadena significa ponerla entre comillas. Por eso sale `Producto('Teclado mecánico', 79.9)` y no `Producto(Teclado mecánico, 79.9)`: el primero se puede copiar y pegar en el código y funciona.

> [!consejo] Si solo vas a definir uno, define `__repr__`
>
> Cuando falta `__str__`, Python usa `__repr__` en su lugar, así que con uno solo cubres los dos casos. Al revés no: definir solo `__str__` deja las listas y la consola mostrando la dirección de memoria.
>
> ```python
> class Producto:
>         def __init__(self, nombre, precio):
>                 self.nombre = nombre
>         self.precio = precio
>
>     def __repr__(self):
>                 return f"Producto({self.nombre!r}, {self.precio!r})"
>
>
> teclado = Producto("Teclado mecánico", 79.90)
> print(teclado)
> print([teclado])
> ```
>
> ```salida
> Producto('Teclado mecánico', 79.9)
> [Producto('Teclado mecánico', 79.9)]
> ```

## `__eq__`: que funcione `==`

Por defecto, dos objetos solo son iguales si son **el mismo objeto**. Dos productos con los mismos datos se consideran distintos:

```python
uno = Producto("TEC-001", "Teclado mecánico", 79.90)
otro = Producto("TEC-001", "Teclado mecánico", 79.90)

print(uno == otro)
print(uno == uno)
```

```salida
False
True
```

Eso casi nunca es lo que quieres. Definiendo `__eq__` decides tú qué significa que dos productos sean el mismo, que aquí será tener la misma referencia de catálogo aunque el precio haya cambiado:

```python
class Producto:
        def __init__(self, referencia, nombre, precio):
                self.referencia = referencia
        self.nombre = nombre
        self.precio = precio

    def __repr__(self):
                return f"Producto({self.referencia!r}, {self.nombre!r}, {self.precio!r})"

    def __eq__(self, otro):
                if not isinstance(otro, Producto):
                        return NotImplemented
        return self.referencia == otro.referencia


uno = Producto("TEC-001", "Teclado mecánico", 79.90)
otro = Producto("TEC-001", "Teclado mecánico", 74.90)
distinto = Producto("RAT-007", "Ratón inalámbrico", 24.50)

print(uno == otro)
print(uno == distinto)
print(uno != distinto)
print(uno == "TEC-001")
print(uno in [distinto, otro])
```

```salida
True
False
True
False
True
```

Tres cosas que salen gratis al definir `__eq__`:

- `!=` funciona solo, como el contrario de `==`. No hay que definir `__ne__`.
- El `in` sobre una lista empieza a funcionar como esperas, porque por dentro compara con `==`.
- Métodos de lista como `.index()` y `.count()` también.

El `return NotImplemented` cuando el otro objeto no es un `Producto` merece explicación: no es un error ni un `False`. Es la forma de decirle a Python "yo no sé comparar con esto, prueba al revés por si el otro sabe". Si ninguno sabe, Python decide que no son iguales, que es lo que se ve en `uno == "TEC-001"`.

> [!aviso] Definir `__eq__` rompe los conjuntos y los diccionarios
>
> En cuanto defines `__eq__`, tus objetos dejan de poder meterse en un `set` ni usarse como clave de un diccionario: el error dice `unhashable type: 'Producto'`.
>
> La razón es coherente: dos objetos iguales tienen que tener el mismo `hash`, y Python no puede adivinar cómo calcularlo a partir de tu `__eq__`, así que lo desactiva para no dar resultados incorrectos en silencio. Si necesitas conjuntos, define también `__hash__` devolviendo el `hash` de lo mismo que comparas:
>
> ```python
> def __hash__(self):
>         return hash(self.referencia)
> ```
>
> Las `dataclasses` de la lección siguiente resuelven esto por ti.

## `__lt__`: poder ordenar

`sorted()`, `min()` y `max()` necesitan saber cuándo un objeto va antes que otro. Sin `__lt__` (de *less than*) no pueden:

```python
catalogo = [Producto("Teclado", 79.9), Producto("Ratón", 24.5)]
print(sorted(catalogo))
```

```salida
TypeError: '<' not supported between instances of 'Producto' and 'Producto'
```

Definiendo un único método, `__lt__`, se arregla todo:

```python
class Producto:
        def __init__(self, nombre, precio):
                self.nombre = nombre
        self.precio = precio

    def __repr__(self):
                return f"{self.nombre} ({self.precio:.2f} €)"

    def __lt__(self, otro):
                return self.precio < otro.precio


catalogo = [
    Producto("Teclado mecánico", 79.90),
    Producto("Ratón inalámbrico", 24.50),
    Producto("Monitor 27 pulgadas", 219.00),
]

print(sorted(catalogo))
print(min(catalogo))
print(max(catalogo))
print(catalogo[0] < catalogo[1])
```

```salida
[Ratón inalámbrico (24.50 €), Teclado mecánico (79.90 €), Monitor 27 pulgadas (219.00 €)]
Ratón inalámbrico (24.50 €)
Monitor 27 pulgadas (219.00 €)
False
```

Con `__lt__` basta porque `sorted`, `min` y `max` solo preguntan "¿este va antes que este otro?". Los operadores `>`, `<=` y `>=` no vienen incluidos; si los necesitas, están `__gt__`, `__le__` y `__ge__`.

> [!nota] Esto no sustituye a `key`
>
> Definir `__lt__` fija **un** criterio de orden, el natural de esa clase. Para ordenar por otra cosa un día concreto sigues usando `sorted(catalogo, key=lambda p: p.nombre)`, que ya conoces y que no toca la clase. Si los productos se ordenan por precio el 90% de las veces, define `__lt__`; si cada vez es por un criterio distinto, no lo definas.

## `__len__`, `__contains__` y `__add__`

Los tres van bien juntos en una clase que contiene cosas. Un pedido, por ejemplo:

```python
class Pedido:
        def __init__(self, cliente, productos=None):
                self.cliente = cliente
        self.productos = productos if productos is not None else []

    def __str__(self):
                return f"Pedido de {self.cliente} con {len(self)} artículos"

    def __len__(self):
                return len(self.productos)

    def __contains__(self, producto):
                return producto in self.productos

    def __add__(self, otro):
                if not isinstance(otro, Pedido):
                        return NotImplemented
        return Pedido(self.cliente, self.productos + otro.productos)


teclado = Producto("Teclado mecánico", 79.90)
raton = Producto("Ratón inalámbrico", 24.50)
monitor = Producto("Monitor 27 pulgadas", 219.00)

primero = Pedido("Lucía Ferrer", [teclado, raton])
segundo = Pedido("Lucía Ferrer", [monitor])

print(len(primero))
print(teclado in primero)
print(monitor in primero)

completo = primero + segundo
print(completo)
print(len(completo))

vacio = Pedido("Iván Soto")
if not vacio:
        print("El pedido está vacío")
```

```salida
2
True
False
Pedido de Lucía Ferrer con 3 artículos
3
El pedido está vacío
```

Tres detalles:

- Dentro de `__str__` se escribe `len(self)`, no `len(self.productos)`. Funciona porque la propia clase ya tiene `__len__`, y así el día que cambie la forma de contar solo hay un sitio que tocar.
- `__add__` **devuelve un pedido nuevo** en vez de modificar el de la izquierda. Es lo que hace `+` con las listas y las cadenas, y romper esa expectativa confunde muchísimo. Para modificar en el sitio existe `+=`, con su propio método `__iadd__`.
- La última comprobación, `if not vacio`, funciona sin definir nada más: cuando no hay `__bool__`, Python usa `__len__` y considera falso todo objeto de longitud cero. Es la misma regla que hace falsa una lista vacía.

## Tabla de referencia

| Método | Lo dispara | Ejemplo de uso |
| --- | --- | --- |
| `__init__` | Crear el objeto | `Producto("Teclado", 79.9)` |
| `__str__` | `print()`, `str()`, f-strings | `print(producto)` |
| `__repr__` | `repr()`, la consola, las colecciones | `[producto]` |
| `__len__` | `len()` | `len(pedido)` |
| `__bool__` | `if`, `not`, `bool()` | `if pedido:` |
| `__eq__` | `==` y `!=` | `uno == otro` |
| `__lt__` | `<`, `sorted()`, `min()`, `max()` | `sorted(catalogo)` |
| `__gt__` | `>` | `uno > otro` |
| `__contains__` | `in` | `producto in pedido` |
| `__add__` | `+` | `primero + segundo` |
| `__sub__` | `-` | `saldo - gasto` |
| `__mul__` | `*` | `producto * 3` |
| `__getitem__` | Los corchetes | `pedido[0]` |
| `__iter__` | `for`, desempaquetado | `for p in pedido:` |
| `__call__` | Llamar al objeto con paréntesis | `objeto()` |

Hay bastantes más, pero con estos se cubre casi todo lo que escribirás.

> [!error] TypeError: object of type 'Pedido' has no len()
>
> Le estás pidiendo `len()` a una clase que no define `__len__`. Defínelo devolviendo la longitud de la colección que lleva dentro, o pídesela directamente a esa colección con `len(pedido.productos)`.

> [!error] TypeError: unsupported operand type(s) for +: 'Pedido' and 'Pedido'
>
> Falta `__add__`, o lo tienes definido pero devuelve `NotImplemented` porque el `isinstance` del principio no se cumple. Comprueba que el tipo que compruebas es el que de verdad llega.

> [!aviso] No te pases definiendo métodos especiales
>
> Que se pueda sobrecargar `+` no significa que convenga. `pedido_a + pedido_b` se entiende porque juntar dos pedidos es una suma razonable; `cliente * 3` no significa nada y solo desconcierta a quien lo lea. La regla: define un operador únicamente si su significado es evidente sin mirar el código.

> [!resumen] En resumen
>
> Los métodos con doble guion bajo son el pacto que permite que tus clases se comporten como las de Python: tú los defines y el lenguaje los llama cuando aparece la operación. `__str__` da la versión legible y `__repr__` la exacta para depurar, y si solo defines uno que sea `__repr__`, porque hace de suplente del otro. `__eq__` da sentido a `==`, a `!=` y al `in` de las listas, pero desactiva el uso en conjuntos hasta que definas `__hash__`. Con `__lt__` ya se puede usar `sorted`, `min` y `max`. `__len__` hace funcionar `len()` y, de paso, la verdad o falsedad del objeto; `__contains__` hace funcionar `in`, y `__add__` el operador `+`, que por costumbre debe devolver un objeto nuevo en vez de modificar el original.

> [!ejercicio] Practica
>
> Crea un fichero `57-especiales.py` y resuelve:
>
> 1. Escribe una clase `Cancion` con `titulo`, `artista` y `duracion_segundos`. Define `__str__` para que muestre `"Título — Artista (3:45)"` y `__repr__` en el formato `Cancion('...', '...', 225)`. Imprime una canción suelta y una lista de tres.
> 2. Añade `__eq__` para que dos canciones sean iguales si coinciden título y artista, y comprueba que `in` funciona sobre una lista de canciones.
> 3. Añade `__hash__` y mete cuatro canciones, con una repetida, en un `set`. Comprueba que el conjunto tiene tres.
> 4. Añade `__lt__` comparando por duración y ordena la lista con `sorted()`. Después ordénala por título usando `key`, sin tocar la clase.
> 5. Escribe una clase `ListaDeReproduccion` que guarde canciones y defina `__len__`, `__contains__` y `__add__` para juntar dos listas en una nueva. Comprueba que una lista vacía es falsa en un `if`.
> 6. Quita el `__len__` y ejecuta `len()` sobre la lista de reproducción. Copia el mensaje de error exacto en un comentario y vuelve a ponerlo.
