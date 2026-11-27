---
titulo: "Tuplas: listas que no cambian"
resumen: "La colección ordenada que no se puede modificar, el desempaquetado de sus valores y por qué existe habiendo listas."
minutos: 11
orden: 26
---

Una lista es cómoda precisamente porque se puede cambiar. Pero hay datos que no deberían cambiar nunca: las coordenadas de un punto, los valores de un color RGB, la fecha de un registro. Si están en una lista, cualquier línea de código puede añadirles un cuarto elemento o borrar el primero, y nada lo impedirá.

Una **tupla** es una colección ordenada, como una lista, pero **inmutable**: una vez creada, ni se añade, ni se quita, ni se sustituye. Es la misma garantía que te dan las cadenas, aplicada a un grupo de valores.

## Crear una tupla

Se escribe con paréntesis en vez de corchetes:

```python
punto = (3, 7)
color_rojo = (255, 0, 0)
fecha = (19, 9, 2026)

print(punto)
print(color_rojo)
print(type(punto))
```

```salida
(3, 7)
(255, 0, 0)
<class 'tuple'>
```

Lo que de verdad crea la tupla son **las comas**, no los paréntesis. Estas dos líneas hacen lo mismo:

```python
con_parentesis = (3, 7)
sin_parentesis = 3, 7

print(con_parentesis)
print(sin_parentesis)
print(con_parentesis == sin_parentesis)
```

```salida
(3, 7)
(3, 7)
True
```

Aun así, **escribe los paréntesis**. Cuestan dos caracteres y dejan clarísimo que ahí hay una tupla, sobre todo dentro de una lista o al pasar argumentos.

> [!aviso] La tupla de un solo elemento necesita una coma
>
> Esta es la trampa clásica. `(5)` no es una tupla: son unos paréntesis de agrupación alrededor de un número, como en `(2 + 3) * 4`.
>
> ```python
> no_es_tupla = (5)
> si_es_tupla = (5,)
>
> print(type(no_es_tupla))
> print(type(si_es_tupla))
> print(len(si_es_tupla))
> ```
>
> ```salida
> <class 'int'>
> <class 'tuple'>
> 1
> ```
>
> La coma final es la que manda. Se lee mal, pero no hay alternativa, y verás esa coma solitaria en bastante código real.

La tupla vacía sí se escribe con los paréntesis a secas, porque no hay nada que separar:

```python
vacia = ()

print(vacia, len(vacia), bool(vacia))
```

```salida
() 0 False
```

## Todo lo que sabes de listas vale, menos modificar

Una tupla es una secuencia, así que los índices, el rebanado, `len`, `in` y el `for` funcionan exactamente igual:

```python
dias = ("lunes", "martes", "miércoles", "jueves", "viernes")

print(dias[0])
print(dias[-1])
print(dias[1:3])
print(len(dias))
print("sábado" in dias)

for dia in dias:
        print(f"- {dia}")
```

```salida
lunes
viernes
('martes', 'miércoles')
5
False
- lunes
- martes
- miércoles
- jueves
- viernes
```

Fíjate en que el rebanado de una tupla devuelve **otra tupla**, no una lista.

Lo que no funciona es cualquier cosa que intente cambiarla:

```python
punto = (3, 7)
punto[0] = 9
```

```salida
TypeError: 'tuple' object does not support item assignment
```

Es el mismo mensaje que daban las cadenas, cambiando `str` por `tuple`. Y tampoco hay métodos para modificar:

```python
punto = (3, 7)
punto.append(9)
```

```salida
AttributeError: 'tuple' object has no attribute 'append'
```

> [!error] AttributeError: 'tuple' object has no attribute 'append'
>
> Estás tratando una tupla como si fuera una lista. Las tuplas solo tienen dos métodos, `count` e `index`, porque son los únicos que no modifican nada. Si necesitas añadir elementos, el dato no debería ser una tupla: usa una lista, o convierte la tupla en lista con `list()`.

```python
dias = ("lunes", "martes", "lunes")

print(dias.count("lunes"))
print(dias.index("martes"))
```

```salida
2
1
```

Lo que sí puedes hacer, igual que con las cadenas, es construir una tupla nueva a partir de la vieja:

```python
punto = (3, 7)

nuevo_punto = (9,) + punto[1:]

print(nuevo_punto)
print(punto)
```

```salida
(9, 7)
(3, 7)
```

## Desempaquetado: repartir una tupla en variables

Esta es la característica que hace que las tuplas aparezcan por todas partes. Si a la izquierda del `=` pones tantos nombres como elementos tenga la tupla, Python los reparte:

```python
punto = (3, 7)

x, y = punto

print(f"x vale {x}, y vale {y}")
```

```salida
x vale 3, y vale 7
```

Mucho más legible que `x = punto[0]` y `y = punto[1]`. Y funciona con cualquier número de valores:

```python
fecha = (19, 9, 2026)

dia, mes, anio = fecha

print(f"{dia:02d}/{mes:02d}/{anio}")
```

```salida
19/09/2026
```

El número de nombres tiene que coincidir exactamente:

```python
punto = (3, 7, 5)
x, y = punto
```

```salida
ValueError: too many values to unpack (expected 2, got 3)
```

```python
punto = (3, 7)
x, y, z = punto
```

```salida
ValueError: not enough values to unpack (expected 3, got 2)
```

> [!error] ValueError: too many values to unpack
>
> Estás repartiendo una tupla en menos variables de las que tiene, o en más. El mensaje te dice cuántas esperaba y cuántas había: `(expected 2, got 3)`. Cuenta los elementos con `len()` si no lo tienes claro, y si solo te interesan algunos, la convención es usar el guion bajo para los que descartas: `dia, _, anio = fecha`.

### El intercambio de variables, por fin explicado

En la lección de variables aprendiste este truco sin justificarlo:

```python
a = 10
b = 20

a, b = b, a

print(a, b)
```

```salida
20 10
```

Ahora sabes qué pasa exactamente. La parte derecha, `b, a`, crea una tupla `(20, 10)`; después esa tupla se desempaqueta en `a` y `b`. Y como la tupla se construye **antes** de asignar nada, `a` todavía vale 10 cuando se lee, y no hace falta ninguna variable auxiliar.

### Por qué `enumerate` y `zip` funcionan así

También explica el `for` de dos variables de la lección de recorridos. `enumerate` y `zip` no entregan dos cosas: entregan **una tupla** por vuelta, y el `for` la desempaqueta:

```python
alumnos = ["Ana", "Luis"]
notas = [8.5, 6.0]

for pareja in zip(alumnos, notas):
        print(pareja, type(pareja))

for alumno, nota in zip(alumnos, notas):
        print(f"{alumno}: {nota}")
```

```salida
('Ana', 8.5) <class 'tuple'>
('Luis', 6.0) <class 'tuple'>
Ana: 8.5
Luis: 6.0
```

El primer bucle ve la tupla entera y el segundo la reparte. Son la misma cosa escrita de dos maneras.

## Por qué existen las tuplas si ya hay listas

Es la pregunta razonable. Hay tres motivos, y ninguno es el capricho.

**Seguridad.** Una tupla comunica una intención: "esto son tres valores que van juntos y no se tocan". El tipo lo garantiza, no la buena voluntad de quien escriba el código después. Si un dato no debe cambiar, que el lenguaje lo impida es mejor que confiar en un comentario.

**Rendimiento.** Crear una tupla es más rápido y ocupa menos memoria que una lista, porque Python sabe que su tamaño no va a cambiar y no reserva espacio extra para crecer.

```python
import sys

print(sys.getsizeof([1, 2, 3, 4, 5]))
print(sys.getsizeof((1, 2, 3, 4, 5)))
```

```salida
104
88
```

El módulo `sys` de la biblioteca estándar te deja curiosear cosas del intérprete, y `getsizeof` devuelve los bytes que ocupa un objeto. Los números exactos cambian de una versión de Python a otra, pero la tupla siempre ocupa menos. La diferencia es pequeña y en un programa normal da igual; con millones de elementos, no.

**Pueden ser claves de un diccionario.** Este es el motivo técnico de verdad. Para que un valor sirva como clave de un diccionario o como elemento de un conjunto tiene que ser inmutable, así que una lista no puede, y una tupla sí:

```python
distancias = {
    ("Madrid", "Sevilla"): 530,
    ("Madrid", "Bilbao"): 395,
}

print(distancias[("Madrid", "Sevilla")])
```

```salida
530
```

Ahí la clave es la pareja de ciudades, y con una lista sería imposible. Los diccionarios llegan en dos lecciones, pero quédate con la idea: **las tuplas pueden ir donde las listas no**.

|  | Lista | Tupla |
| --- | --- | --- |
| Se escribe | `[1, 2, 3]` | `(1, 2, 3)` |
| Se puede modificar | Sí | No |
| Métodos | Muchos | Solo `count` e `index` |
| Clave de diccionario | No | Sí |
| Memoria y velocidad | Algo más | Algo menos |
| Para qué | Muchos datos del mismo tipo que van a cambiar | Unos pocos datos fijos que van juntos |

## Convertir entre lista y tupla

La conversión es directa en los dos sentidos, y crea siempre un objeto nuevo:

```python
coordenadas = (10, 20, 30)

como_lista = list(coordenadas)
como_lista.append(40)

de_vuelta = tuple(como_lista)

print(como_lista)
print(de_vuelta)
print(coordenadas)
```

```salida
[10, 20, 30, 40]
(10, 20, 30, 40)
(10, 20, 30)
```

Ese es el recorrido habitual cuando recibes una tupla y necesitas modificarla: la pasas a lista, la cambias y la vuelves a congelar. La tupla original no se ha enterado.

También funciona sobre cadenas y sobre cualquier cosa recorrible:

```python
print(tuple("abc"))
print(tuple(range(5)))
print(list((1, 2, 3)))
```

```salida
('a', 'b', 'c')
(0, 1, 2, 3, 4)
[1, 2, 3]
```

> [!nota] Una tupla puede contener una lista
>
> `(1, 2, [3, 4])` es legal, y la tupla sigue siendo inmutable en el sentido de que no puedes cambiar sus tres elementos. Pero la lista de dentro sí se puede modificar: `t[2].append(5)` funciona. Es la misma idea de la copia superficial, vista desde otro ángulo: la inmutabilidad de la tupla protege sus posiciones, no lo que haya dentro de ellas. Una tupla así, además, ya no sirve como clave de diccionario.

## Un ejemplo completo

```python title="ciudades.py"
# Cada tupla es (ciudad, habitantes, altitud). Datos que no cambian.
ciudades = [
    ("Madrid", 3280000, 667),
    ("Barcelona", 1620000, 12),
    ("Sevilla", 685000, 7),
    ("Bilbao", 346000, 19),
]

print(f"{'Ciudad':<12}{'Habitantes':>12}{'Altitud':>12}")
print("-" * 36)

for ciudad, habitantes, altitud in ciudades:
        print(f"{ciudad:<12}{habitantes:>12,}{altitud:>10} m")

print("-" * 36)
total = sum([habitantes for ciudad, habitantes, altitud in ciudades])
print(f"{'Total':<12}{total:>12,}")

altas = [ciudad for ciudad, habitantes, altitud in ciudades if altitud > 100]
print(f"Por encima de 100 m: {altas}")
```

```salida
Ciudad        Habitantes     Altitud
------------------------------------
Madrid         3,280,000       667 m
Barcelona      1,620,000        12 m
Sevilla          685,000         7 m
Bilbao           346,000        19 m
------------------------------------
Total          5,931,000
Por encima de 100 m: ['Madrid']
```

Una lista de tuplas es una de las estructuras más útiles que hay: la lista crece y se ordena, y cada tupla de dentro es un registro fijo. Desempaquetar en el `for` con tres nombres hace el resto legible sin un solo índice.

> [!resumen] En resumen
>
> Una tupla es una colección ordenada e inmutable que se escribe con paréntesis, aunque lo que la crea de verdad son las comas; la de un solo elemento necesita una coma final, `(5,)`. Comparte con las listas los índices, el rebanado, `len`, `in` y el `for`, pero no admite cambios: intentar asignar una posición da `TypeError` e intentar un `append` da `AttributeError`, porque solo tiene los métodos `count` e `index`. El desempaquetado `x, y = punto` reparte sus valores en variables y exige que el número coincida; es lo que explica el intercambio `a, b = b, a` y el `for` de dos variables de `enumerate` y `zip`. Existen porque garantizan que un dato no cambie, ocupan algo menos y, sobre todo, porque pueden ser claves de un diccionario. `list()` y `tuple()` convierten en los dos sentidos.

> [!ejercicio] Practica
>
> Crea `26-tuplas.py` y resuelve:
>
> 1. Crea una tupla con las coordenadas `(40.4, -3.7)` y desempaquétala en dos variables `latitud` y `longitud` para imprimirlas con un mensaje.
> 2. Comprueba con `type()` la diferencia entre `(7)`, `(7,)` y `7`.
> 3. Intenta modificar un elemento de una tupla y después intenta hacerle `append`. Anota los dos errores distintos que salen.
> 4. Parte de la tupla `("rojo", "verde", "azul")`, conviértela en lista, añade `"amarillo"`, vuelve a convertirla en tupla e imprime las dos versiones.
> 5. Crea una lista de tuplas con cuatro productos en la forma `(nombre, precio)` y recórrela con desempaquetado para imprimir una tabla alineada con el total al final.
> 6. Intercambia el valor de dos variables en una sola línea y explica con tus palabras, en un comentario, por qué funciona sin variable auxiliar.
