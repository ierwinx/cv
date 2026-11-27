---
titulo: "Clases y objetos"
resumen: "Qué es una clase, qué es un objeto y por qué juntar datos y funciones en un mismo sitio ordena el programa."
minutos: 12
orden: 52
---

Cuando un puñado de datos siempre viaja junto y siempre hay las mismas funciones operando sobre él, el diccionario suelto se queda corto. Nada garantiza que las claves existan, nada impide escribir `"precios"` en vez de `"precio"`, y las funciones que trabajan con ese diccionario acaban repartidas por el fichero sin nada que las relacione con él.

Una clase resuelve justamente eso: **empaquetar los datos y las funciones que los manejan en una sola cosa**.

## El problema, con diccionarios

Así es como lo harías con lo que sabes hasta ahora:

```python
producto = {"nombre": "Teclado mecánico", "precio": 79.90, "unidades": 4}


def valor_en_almacen(producto):
        return producto["precio"] * producto["unidades"]


def describir(producto):
        return f"{producto['nombre']}: {producto['precio']:.2f} € ({producto['unidades']} uds.)"


print(describir(producto))
print(f"{valor_en_almacen(producto):.2f} €")
```

```salida
Teclado mecánico: 79.90 € (4 uds.)
319.60 €
```

Funciona, pero tiene tres grietas:

- Nada obliga a que un diccionario "producto" tenga esas tres claves. Si a uno le falta `unidades`, `valor_en_almacen` revienta con `KeyError`.
- `describir` es un nombre demasiado genérico. El día que tengas clientes y pedidos necesitarás `describir_producto`, `describir_cliente`, `describir_pedido`.
- Quien lea el código tiene que deducir, leyendo las funciones, qué forma tiene ese diccionario. No está escrito en ningún sitio.

## Lo mismo, con una clase

```python
class Producto:
        def __init__(self, nombre, precio, unidades):
                self.nombre = nombre
        self.precio = precio
        self.unidades = unidades

    def valor_en_almacen(self):
                return self.precio * self.unidades

    def describir(self):
                return f"{self.nombre}: {self.precio:.2f} € ({self.unidades} uds.)"


teclado = Producto("Teclado mecánico", 79.90, 4)
print(teclado.describir())
print(f"{teclado.valor_en_almacen():.2f} €")
```

```salida
Teclado mecánico: 79.90 € (4 uds.)
319.60 €
```

La salida es idéntica, pero el código dice cosas que antes no decía. La primera línea de `__init__` declara, negro sobre blanco, que un producto tiene nombre, precio y unidades. Y `describir` ya no necesita apellido: es *la* forma de describir de un producto, y solo se puede llamar sobre uno.

## El vocabulario, con precisión

Estas cuatro palabras se usan todo el rato y conviene no confundirlas:

| Palabra | Qué es | En el ejemplo |
| --- | --- | --- |
| Clase | El molde. Describe qué datos y qué operaciones tendrá algo | `Producto` |
| Objeto o instancia | Lo fabricado con el molde. Un ejemplar concreto | `teclado` |
| Atributo | Un dato que guarda un objeto | `teclado.precio` |
| Método | Una función que pertenece al objeto | `teclado.describir()` |

"Objeto" e "instancia" significan lo mismo. Se dice que `teclado` **es una instancia de** `Producto`, o que `Producto` **se instancia** para obtener `teclado`.

La distinción importante es la de clase y objeto. La clase se escribe una vez; los objetos se fabrican todos los que quieras, y cada uno con sus propios datos:

```python
teclado = Producto("Teclado mecánico", 79.90, 4)
raton = Producto("Ratón inalámbrico", 24.50, 12)

print(teclado.describir())
print(raton.describir())
```

```salida
Teclado mecánico: 79.90 € (4 uds.)
Ratón inalámbrico: 24.50 € (12 uds.)
```

Dos objetos, el mismo molde, datos independientes. Cambiar `teclado.precio` no toca a `raton`.

## Llevas todo el curso usando objetos

Esto no es un tema nuevo que aparece del aire. En Python **todo es un objeto**, y por eso `type()` responde siempre con la palabra `class`:

```python
texto = "hola"
numeros = [3, 1, 2]

print(type(texto))
print(type(numeros))
print(type(3.5))
```

```salida
<class 'str'>
<class 'list'>
<class 'float'>
```

`"hola"` es una instancia de la clase `str`. `[3, 1, 2]` es una instancia de la clase `list`. Y ahora tiene sentido algo que llevas usando desde el principio sin preguntarte por qué: `texto.upper()` y `numeros.append(5)` se escriben con punto porque **son métodos**, funciones que pertenecen a ese objeto. Es exactamente la misma sintaxis que `teclado.describir()`.

> [!nota] Por qué len() no se escribe con punto
>
> Si todo son métodos, ¿por qué `len(numeros)` y no `numeros.len()`? Porque `len()` es una función global que por dentro llama a un método especial del objeto. Python reserva funciones globales para las operaciones muy universales y deja los métodos para lo específico de cada tipo. En la lección de métodos especiales verás cómo hacer que `len()` funcione con tus propias clases.

## Una clase mínima

Una clase no necesita nada para existir. Esta es válida:

```python
class Vehiculo:
        """Un vehículo de la flota de reparto."""


furgoneta = Vehiculo()
print(type(furgoneta))
print(isinstance(furgoneta, Vehiculo))
```

```salida
<class '__main__.Vehiculo'>
True
```

Las piezas de esa sintaxis:

- `class` es la palabra reservada, seguida del nombre y de dos puntos.
- El nombre va en **`CamelCase`**: primera letra de cada palabra en mayúscula y sin guiones bajos. `Producto`, `Vehiculo`, `CuentaBancaria`. Esto lo distingue a simple vista de las variables y funciones, que van en minúsculas.
- El cuerpo va sangrado. Si no tienes nada que poner, un docstring sirve; si tampoco quieres docstring, se pone `pass`.
- Para crear un objeto se escribe el nombre de la clase **con paréntesis**, como si fuera una función: `Vehiculo()`. Eso es lo que se llama *instanciar*.

El `__main__` que aparece en `<class '__main__.Vehiculo'>` es el nombre del módulo donde está definida la clase, y ya lo conoces de `if __name__ == "__main__"`.

> [!aviso] La clase no es el objeto
>
> `Vehiculo` sin paréntesis es el molde. `Vehiculo()` con paréntesis es un vehículo recién fabricado. Son cosas distintas y confundirlas da errores desconcertantes: si escribes `furgoneta = Vehiculo` y luego intentas usarlo, estarás manejando la clase entera, no un ejemplar.

## Cada objeto tiene sus propios atributos

Los atributos se leen y se escriben con el punto, igual que se llaman los métodos:

```python
furgoneta = Vehiculo()
motocicleta = Vehiculo()

furgoneta.matricula = "1234 ABC"
motocicleta.matricula = "5678 XYZ"

print(furgoneta.matricula)
print(motocicleta.matricula)
print(furgoneta is motocicleta)
```

```salida
1234 ABC
5678 XYZ
False
```

`furgoneta is motocicleta` da `False` porque son dos objetos distintos, aunque salgan del mismo molde. Dos coches recién salidos de la misma cadena de montaje tampoco son el mismo coche.

Añadir atributos desde fuera así, uno a uno, se puede hacer pero **no se hace**: es fácil olvidarse de alguno y no queda escrito en ningún sitio qué atributos tiene un vehículo. Para eso está `__init__`, que es el tema de la lección siguiente.

## Qué ves al imprimir un objeto

Si imprimes un objeto tuyo sin más, Python no sabe cómo mostrarlo y se limita a decirte de qué clase es y en qué posición de memoria está:

```python
furgoneta = Vehiculo()
print(furgoneta)
```

```salida
<__main__.Vehiculo object at 0x100d45fd0>
```

Ese número hexadecimal cambia en cada ejecución, así que el tuyo será distinto. No es un fallo: es la representación por defecto, y se arregla definiendo `__str__`, que también verás en la lección de métodos especiales.

> [!error] AttributeError: 'Vehiculo' object has no attribute 'matricula'
>
> Estás leyendo un atributo que ese objeto no tiene. O te has equivocado al escribir el nombre, o nunca llegaste a asignarlo, o lo asignaste sobre **otro** objeto. Recuerda que los atributos son de cada instancia: ponerle matrícula a `furgoneta` no se la pone a `motocicleta`.

## Cuándo merece la pena una clase

No todo pide una clase. La señal clara es esta combinación: **varios datos que siempre van juntos y un conjunto de funciones que siempre reciben esos mismos datos como argumento**. Si tus funciones empiezan todas por `def algo(producto, ...)`, ese `producto` está pidiendo ser una clase.

Si solo tienes un dato suelto, o una función que hace una cuenta y ya está, una clase solo añade ruido. Una función es una función.

> [!resumen] En resumen
>
> Una clase es un molde que agrupa datos y las funciones que operan sobre ellos; un objeto o instancia es un ejemplar fabricado con ese molde. Los datos del objeto se llaman atributos y sus funciones, métodos, y ambos se usan con el punto. Se define con `class NombreEnCamelCase:` y se instancia escribiendo el nombre con paréntesis. En Python todo es un objeto, y por eso las cadenas y las listas tienen métodos desde la primera lección. Las clases compensan cuando varios datos van siempre juntos y varias funciones giran siempre alrededor de ellos.

> [!ejercicio] Practica
>
> Crea un fichero `52-clases.py` y resuelve:
>
> 1. Define una clase `Libro` vacía, con solo un docstring. Crea dos instancias y comprueba con `type()` e `isinstance()` que son libros.
> 2. A cada libro del ejercicio anterior asígnale desde fuera los atributos `titulo` y `paginas`. Imprímelos y comprueba que cambiar uno no afecta al otro.
> 3. Escribe una clase `Producto` con `__init__(self, nombre, precio, unidades)` y un método `valor_en_almacen()`. Crea tres productos y muestra el valor total del almacén sumando los tres.
> 4. Coge este código con diccionarios y conviértelo en una clase `Cliente` con un método `es_mayor_de_edad()`:
>
> ```python
> cliente = {"nombre": "Lucía", "edad": 17}
>
> def es_mayor_de_edad(cliente):
>         return cliente["edad"] >= 18
> ```
>
> 5. Imprime `type()` de: una cadena, una lista, un diccionario, un conjunto, una función que hayas definido tú y una instancia de `Producto`. Fíjate en que todos dicen `class`.
> 6. Provoca a propósito un `AttributeError` leyendo un atributo que no exista y lee el mensaje entero.
