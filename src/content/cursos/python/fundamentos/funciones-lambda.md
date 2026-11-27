---
titulo: "Funciones lambda"
resumen: "Funciones anónimas de una sola expresión: qué son, dónde compensan de verdad y dónde es mejor escribir un def."
minutos: 10
orden: 39
---

Cuando ordenaste una lista de diccionarios por una de sus claves, escribiste algo como `key=lambda empleado: empleado["salario"]` y quizá lo copiaste sin entender del todo qué era esa palabra. Toca aclararlo.

Una **lambda** es una función sin nombre y de una sola expresión, que se escribe en el mismo sitio donde se usa. Sirve para esos casos en los que necesitas una función mínima, una única vez, y darle nombre y tres líneas propias sería más ruido que ayuda.

## La sintaxis

```python
lambda parametros: expresion
```

La palabra `lambda`, los parámetros separados por comas, dos puntos y **una expresión**, cuyo valor se devuelve automáticamente. No se escribe `return`: está implícito.

Estas dos funciones son equivalentes:

```python
def doblar(numero):
        return numero * 2


doblar_lambda = lambda numero: numero * 2

print(doblar(7), doblar_lambda(7))
```

```salida
14 14
```

Lo que hace el segundo caso raro es precisamente que le hemos puesto nombre, algo que enseguida veremos que no se debe hacer. Una lambda está pensada para vivir dentro de la llamada a otra función, sin pasar nunca por una variable.

## La limitación

Una lambda solo admite **una expresión**. Una expresión es algo que produce un valor: una cuenta, una comparación, una llamada, un acceso a un diccionario, incluso un condicional en una línea. Lo que no cabe es una instrucción: no puedes poner un `if` de bloque, ni un `for`, ni varias líneas, ni asignar a una variable.

```python
lambda nota: "Aprobado" if nota >= 5 else "Suspenso"    # válido: es una expresión
lambda nota: print(nota)                                 # válido, pero de mal gusto
```

Esta limitación no es un descuido, es el diseño: **en cuanto tu función necesite más de una expresión, Python quiere que uses `def`**. Y tiene razón, porque una lambda larga es ilegible.

## Dónde tienen sentido de verdad

En los parámetros `key` de `sorted`, `min` y `max`. Ahí la función es pura logística, solo dice de dónde sacar el valor con el que comparar, y es un caso perfecto para una lambda.

```python
empleados = [
    {"nombre": "Ana", "salario": 32000, "antiguedad": 6},
    {"nombre": "Luis", "salario": 41000, "antiguedad": 2},
    {"nombre": "Marta", "salario": 28000, "antiguedad": 9},
]

por_salario = sorted(empleados, key=lambda empleado: empleado["salario"])
for empleado in por_salario:
        print(empleado["nombre"], empleado["salario"])

mejor_pagado = max(empleados, key=lambda empleado: empleado["salario"])
mas_veterano = max(empleados, key=lambda empleado: empleado["antiguedad"])
print(mejor_pagado["nombre"])
print(mas_veterano["nombre"])
```

```salida
Marta 28000
Ana 32000
Luis 41000
Luis
Marta
```

`sorted` no ordena los diccionarios, que no se pueden comparar entre sí: llama a tu lambda con cada elemento y ordena por lo que esta devuelva. La lambda es la respuesta a "¿por cuál de sus datos los comparo?".

La expresión puede ser un cálculo, no solo un acceso:

```python
pedidos = [
    ("Ana", 3, 19.99),
    ("Luis", 1, 49.50),
    ("Marta", 5, 7.25),
]

por_importe = sorted(pedidos, key=lambda pedido: pedido[1] * pedido[2], reverse=True)
for cliente, unidades, precio in por_importe:
        print(f"{cliente:<6} {unidades * precio:>7.2f}")
```

```salida
Ana      59.97
Luis     49.50
Marta    36.25
```

> [!consejo] A veces ni siquiera hace falta la lambda
>
> Si lo único que haces es llamar a un método sin argumentos, puedes pasar el método directamente:
>
> ```python
> ciudades = ["Madrid", "a coruña", "SEVILLA", "bilbao"]
> print(sorted(ciudades, key=lambda ciudad: ciudad.lower()))
> print(sorted(ciudades, key=str.lower))
> ```
>
> ```salida
> ['a coruña', 'bilbao', 'Madrid', 'SEVILLA']
> ['a coruña', 'bilbao', 'Madrid', 'SEVILLA']
> ```
>
> Lo mismo con `key=len` para ordenar por longitud o `key=abs` para ordenar por valor absoluto. Una función ya existente siempre es mejor que una lambda que se limita a envolverla.

## `map` y `filter`

Son dos funciones incorporadas que aplican otra función a todos los elementos de una colección. `map` transforma cada elemento; `filter` se queda con los que cumplen una condición. Se combinan a menudo con lambdas:

```python
precios = [15.0, 30.0, 4.99, 80.0]

con_iva = list(map(lambda precio: round(precio * 1.21, 2), precios))
caros = list(filter(lambda precio: precio > 20, precios))
print(con_iva)
print(caros)
```

```salida
[18.15, 36.3, 6.04, 96.8]
[30.0, 80.0]
```

Hace falta envolverlas en `list()` porque ambas devuelven un objeto perezoso que va produciendo los valores según se piden, no una lista.

Y ahora lo importante: **en Python moderno esto casi siempre se escribe con una comprensión de lista**.

```python
con_iva = [round(precio * 1.21, 2) for precio in precios]
caros = [precio for precio in precios if precio > 20]
print(con_iva)
print(caros)
```

```salida
[18.15, 36.3, 6.04, 96.8]
[30.0, 80.0]
```

Mismo resultado, sin `lambda`, sin `list()` alrededor y con una lectura de izquierda a derecha en lugar de de dentro hacia fuera. La comprensión es la forma idiomática, y es la que debes usar por defecto.

> [!nota] ¿Entonces para qué están `map` y `filter`?
>
> Siguen existiendo porque vienen de una tradición anterior a las comprensiones y porque hay casos concretos donde encajan, sobre todo cuando la función que aplicas ya existe y tiene nombre: `map(str.strip, lineas)` es limpio y no necesita lambda. Los verás en código ajeno, así que conviene reconocerlos, pero escribir `map(lambda x: ..., lista)` pudiendo escribir una comprensión no aporta nada.

## No le pongas nombre a una lambda

> [!aviso] Si vas a asignarla a una variable, usa `def`
>
> Esto es lo primero que marca cualquier revisor de código, y PEP 8 lo dice explícitamente:
>
> ```python
> calcular_iva = lambda precio: precio * 0.21
> ```
>
> Escríbelo así:
>
> ```python
> def calcular_iva(precio):
>         return precio * 0.21
> ```
>
> No es una cuestión de gustos. Con `def` obtienes una función que puede llevar docstring, admite anotaciones de tipo, permite varias líneas el día que crezca y, sobre todo, **conoce su propio nombre**. Una lambda con nombre se sigue llamando a sí misma `<lambda>`, y cuando falle, el traceback te dirá que el error está en `<lambda>` en vez de decirte en cuál de las quince que tienes.

```python
calcular_iva = lambda precio: precio * 0.21
print(calcular_iva.__name__)


def calcular_iva_bien(precio):
        return precio * 0.21


print(calcular_iva_bien.__name__)
```

```salida
<lambda>
calcular_iva_bien
```

## Cuándo usar cada cosa

| Situación | Qué usar |
| --- | --- |
| Sacar un valor para `key` en `sorted`, `min` o `max` | `lambda` |
| Un método o función que ya existe y vale tal cual | Pásalo directamente: `key=str.lower`, `key=len` |
| Transformar o filtrar una lista entera | Comprensión de lista |
| Una función que vas a reutilizar o que tiene nombre propio | `def` |
| Cualquier cosa que no quepa cómoda en una expresión | `def`, sin dudarlo |

> [!resumen] En resumen
>
> Una lambda es una función anónima de una sola expresión, escrita como `lambda parametros: expresion`, que devuelve el valor de esa expresión sin necesidad de `return`. No admite instrucciones ni varias líneas, y esa limitación es deliberada. Su uso natural es el parámetro `key` de `sorted`, `min` y `max`, donde solo hace falta indicar por qué dato comparar; si una función ya existente sirve, como `str.lower` o `len`, se pasa esa directamente. Con `map` y `filter` funcionan, pero en Python moderno se prefiere casi siempre una comprensión de lista. Y nunca se asigna una lambda a una variable: para eso está `def`.

> [!ejercicio] Practica
>
> Crea un fichero `39-lambdas.py` y resuelve:
>
> 1. Crea una lista de tuplas `(nombre, edad)` y ordénala por edad con `sorted` y una lambda. Después ordénala por nombre.
> 2. Con una lista de diccionarios de libros que tengan `titulo`, `paginas` y `año`, encuentra el más largo con `max` y el más antiguo con `min`.
> 3. Ordena una lista de palabras por su longitud sin usar lambda, pasando `len` como `key`.
> 4. Escribe una expresión con `filter` y una lambda que se quede con los números pares de una lista. Reescríbela después como comprensión de lista y quédate con la segunda.
> 5. Ordena una lista de nombres ignorando mayúsculas y minúsculas, primero con una lambda y después con `key=str.lower`.
> 6. Escribe `calcular_descuento = lambda precio: precio * 0.9`, imprime su `__name__` y reescríbela con `def` para ver la diferencia.
