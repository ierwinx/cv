---
titulo: "La función range"
resumen: "Generar secuencias de números para recorrerlas con un for, con inicio, fin y paso, incluido el paso negativo."
minutos: 10
orden: 18
---

El `for` recorre secuencias, y eso está muy bien cuando tienes una cadena o una lista delante. Pero la mitad de las veces lo que quieres es repetir algo diez veces, o recorrer los números del 1 al 100. Ahí no hay ninguna secuencia que recorrer: hay que fabricarla.

`range` es la función que la fabrica, y está hecha exactamente para combinarse con `for`.

## range con un solo argumento

```python
for numero in range(5):
        print(numero)
```

```salida
0
1
2
3
4
```

Cinco vueltas, pero los números van **del 0 al 4**. Esto es lo primero que hay que interiorizar: `range(5)` produce cinco números empezando en cero, y **el 5 no sale**.

> [!nota] Es la misma regla del rebanado
>
> Ya te has encontrado con esto: en `texto[2:5]` el carácter de la posición 5 tampoco se incluye. Python usa en todas partes el criterio de "desde el primero hasta antes del último", y la ventaja es que el número que escribes coincide con la cantidad de elementos: `range(5)` da cinco números, y `texto[0:5]` da cinco caracteres.

## range con inicio y fin

Si el cero no te sirve, di desde dónde empezar:

```python
for numero in range(1, 6):
        print(numero)
```

```salida
1
2
3
4
5
```

El primer argumento es el inicio, **incluido**; el segundo es el fin, **excluido**. De ahí el `6` para llegar hasta el 5.

Esta es la forma que usarás para cualquier cosa que se cuente como cuentan las personas, empezando por el uno:

```python
for multiplicador in range(1, 11):
        print(f"7 x {multiplicador:>2} = {7 * multiplicador:>3}")
```

```salida
7 x  1 =   7
7 x  2 =  14
7 x  3 =  21
7 x  4 =  28
7 x  5 =  35
7 x  6 =  42
7 x  7 =  49
7 x  8 =  56
7 x  9 =  63
7 x 10 =  70
```

## range con paso

El tercer argumento es cuánto avanzar en cada salto:

```python
for numero in range(0, 21, 5):
        print(numero)
```

```salida
0
5
10
15
20
```

El paso por defecto es 1, que es lo que se aplicaba en los ejemplos anteriores. Con paso, el final sigue estando excluido: el rango va dando saltos y se detiene en el último número que no alcance el fin. Por eso `range(0, 21, 5)` llega hasta el 20, mientras que `range(0, 20, 5)` se queda en el 15.

### Paso negativo

Un paso negativo cuenta hacia atrás. Entonces el inicio tiene que ser mayor que el fin:

```python
for numero in range(10, 0, -1):
        print(numero)
```

```salida
10
9
8
7
6
5
4
3
2
1
```

Ahí está otra vez el fin excluido, y es la trampa habitual: para llegar hasta el 1 hay que poner un 0 como fin. Si de verdad quieres que salga el cero, `range(10, -1, -1)`.

```python title="cuenta_atras.py"
MINUTOS = 3

for restantes in range(MINUTOS * 60, -1, -30):
        minutos = restantes // 60
    segundos = restantes % 60
    print(f"Quedan {minutos}:{segundos:02d}")

print("Tiempo agotado.")
```

```salida
Quedan 3:00
Quedan 2:30
Quedan 2:00
Quedan 1:30
Quedan 1:00
Quedan 0:30
Quedan 0:00
Tiempo agotado.
```

> [!aviso] Un paso negativo con el orden normal no da nada
>
> `range(0, 10, -1)` no da error: produce cero números, así que el bucle no se ejecuta ni una vez y no ves nada en pantalla. Lo mismo pasa con `range(5, 1)` sin paso. Si un bucle "no hace nada" y no entiendes por qué, comprueba que el inicio, el fin y el signo del paso son coherentes entre sí.

## range no es una lista

Imprime un `range` a secas y verás algo inesperado:

```python
print(range(5))
print(type(range(5)))
```

```salida
range(0, 5)
<class 'range'>
```

No sale `[0, 1, 2, 3, 4]` porque `range` **no contiene** los números: contiene la receta para generarlos. Guarda solo tres datos, el inicio, el fin y el paso, y va calculando cada número en el momento en que el `for` se lo pide.

Eso es una decisión de diseño deliberada y muy útil: `range(1000000)` ocupa lo mismo que `range(5)`, unas pocas decenas de bytes, mientras que una lista con un millón de números ocuparía megabytes. Puedes recorrer rangos enormes sin gastar memoria.

Cuando quieras ver el contenido, pide que se construya la lista con `list()`:

```python
print(list(range(5)))
print(list(range(1, 6)))
print(list(range(0, 21, 5)))
print(list(range(10, 0, -1)))
print(list(range(5, 1)))
```

```salida
[0, 1, 2, 3, 4]
[1, 2, 3, 4, 5]
[0, 5, 10, 15, 20]
[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
[]
```

> [!consejo] list(range(...)) es tu herramienta de depuración
>
> Cuando dudes de si un rango incluye o no un extremo, no lo razones: imprímelo. Una línea en la consola interactiva te da la respuesta en un segundo y te ahorra el clásico error de un elemento.
>
> ```consola
> >>> list(range(1, 10, 3))
> [1, 4, 7]
> >>> len(range(1, 10, 3))
> 3
> ```

`len()` también funciona sobre un `range` y te dice cuántas vueltas dará el bucle sin necesidad de generarlo:

```python
print(len(range(5)))
print(len(range(0, 21, 5)))
```

```salida
5
5
```

## Tabla de referencia

| Expresión | Números que produce | Cuántos |
| --- | --- | --- |
| `range(5)` | 0, 1, 2, 3, 4 | 5 |
| `range(1, 5)` | 1, 2, 3, 4 | 4 |
| `range(1, 6)` | 1, 2, 3, 4, 5 | 5 |
| `range(0, 10, 2)` | 0, 2, 4, 6, 8 | 5 |
| `range(0, 10, 3)` | 0, 3, 6, 9 | 4 |
| `range(10, 0, -1)` | 10, 9, 8, ... 2, 1 | 10 |
| `range(10, -1, -2)` | 10, 8, 6, 4, 2, 0 | 6 |
| `range(5, 1)` | ninguno | 0 |
| `range(0, 10, -1)` | ninguno | 0 |

## Recorrer un texto por posiciones

Con `range(len(texto))` puedes recorrer las posiciones en lugar de los caracteres, que es lo que necesitas cuando además del carácter te interesa dónde está:

```python
palabra = "Python"

for posicion in range(len(palabra)):
        print(f"{posicion}: {palabra[posicion]}")
```

```salida
0: P
1: y
2: t
3: h
4: o
5: n
```

`len(palabra)` es 6, así que `range(6)` da del 0 al 5, que son exactamente las posiciones válidas. El fin excluido encaja aquí de forma perfecta, y no es casualidad: es el motivo por el que se diseñó así.

> [!aviso] No uses range(len(...)) si solo quieres los elementos
>
> `for posicion in range(len(palabra)):` con un `palabra[posicion]` dentro es mucho más ruidoso que `for letra in palabra:`, y admite más errores. Úsalo solo cuando de verdad necesites el número de la posición. Cuando lleguemos a las listas verás `enumerate()`, que da las dos cosas a la vez y es la forma correcta de resolverlo.

## Los errores de uno de más y uno de menos

Son tan frecuentes que tienen nombre propio en inglés, *off-by-one*, y casi siempre salen de olvidar que el final está excluido.

| Lo que quieres | Mal | Bien |
| --- | --- | --- |
| Del 1 al 10 | `range(1, 10)` se queda en 9 | `range(1, 11)` |
| Diez vueltas | `range(1, 10)` da nueve | `range(10)` o `range(1, 11)` |
| Las posiciones de un texto | `range(len(texto) + 1)` se sale | `range(len(texto))` |
| Del 10 al 1 hacia atrás | `range(10, 1, -1)` se queda en 2 | `range(10, 0, -1)` |

> [!error] IndexError: string index out of range
>
> Te has pasado del final al recorrer por posiciones, normalmente por haber escrito `range(len(texto) + 1)` pensando que hacía falta el `+ 1` para llegar al último carácter. No hace falta: `len()` ya cuenta desde 1 y las posiciones empiezan en 0, así que `range(len(texto))` cubre exactamente todas.
>
> ```python
> palabra = "abc"
> for posicion in range(len(palabra) + 1):
>         print(palabra[posicion])      # IndexError en la cuarta vuelta
> ```

> [!error] ValueError: range() arg 3 must not be zero
>
> El paso no puede ser 0, porque un bucle que avanza de cero en cero no avanzaría nunca. Suele salir de una variable de paso calculada que ha dado cero sin que te dieras cuenta.

> [!error] TypeError: 'float' object cannot be interpreted as an integer
>
> `range` solo trabaja con enteros. Le has pasado un decimal, a menudo el resultado de una división con `/`, que siempre produce un `float` aunque el resultado sea exacto. Usa la división entera `//` o envuélvelo en `int()`:
>
> ```python
> for numero in range(10 / 2):      # TypeError
> for numero in range(10 // 2):     # correcto
> ```

> [!resumen] En resumen
>
> `range(fin)` produce los números desde 0 hasta uno antes del fin; `range(inicio, fin)` empieza donde tú digas, y `range(inicio, fin, paso)` avanza a saltos, que pueden ser negativos si el inicio es mayor que el fin. **El final nunca se incluye**, igual que en el rebanado, de modo que para llegar al 10 hay que escribir 11. `range` no es una lista: guarda solo el inicio, el fin y el paso, y por eso al imprimirlo sale `range(0, 5)` en vez de los números; para verlos, `list(range(5))`. Los errores de uno de más o de menos se resuelven imprimiendo el rango en vez de razonarlo.

> [!ejercicio] Practica
>
> Crea `18-range.py` y resuelve:
>
> 1. Imprime los números del 1 al 20, después los pares del 2 al 20 y después los múltiplos de 5 del 5 al 50.
> 2. Imprime una cuenta atrás del 10 al 0, ambos incluidos, y termina con la palabra `Despegue`.
> 3. Calcula la suma de los números del 1 al 1000 con un `for` y un acumulador. Comprueba que da 500500.
> 4. Pide un número y muestra su tabla de multiplicar del 1 al 10, con el multiplicando, el multiplicador y el resultado alineados en columnas.
> 5. En la consola interactiva, imprime con `list()` los siguientes rangos y anota cuántos elementos tiene cada uno: `range(3)`, `range(3, 3)`, `range(1, 10, 4)`, `range(9, 0, -3)` y `range(0, 5, -1)`.
> 6. Pide una palabra y muestra cada letra con su posición, primero con `range(len(palabra))` y después recorriendo la palabra directamente con un contador propio. Quédate con la versión que te parezca más clara.
