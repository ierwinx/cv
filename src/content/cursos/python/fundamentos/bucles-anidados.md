---
titulo: "Bucles anidados"
resumen: "Un bucle dentro de otro para recorrer filas y columnas, cuántas iteraciones salen en total y qué hace break aquí."
minutos: 12
orden: 19
---

Un bucle recorre una dimensión: los caracteres de un texto, los números de un rango. Para recorrer dos, como las filas y las columnas de una tabla, hace falta un bucle dentro de otro. Cualquier cosa que se organice en cuadrícula, desde una tabla de multiplicar hasta el tablero de un juego, se construye así.

## Un bucle dentro de otro

Dentro del bloque de un `for` puede ir cualquier instrucción, y un `for` es una instrucción. El interior se sangra otros cuatro espacios:

```python
for fila in range(1, 4):
        for columna in range(1, 4):
                print(f"fila {fila}, columna {columna}")
```

```salida
fila 1, columna 1
fila 1, columna 2
fila 1, columna 3
fila 2, columna 1
fila 2, columna 2
fila 2, columna 3
fila 3, columna 1
fila 3, columna 2
fila 3, columna 3
```

Lee la salida con atención, porque ahí está toda la lección: **el bucle interior se ejecuta entero en cada vuelta del exterior**. Mientras `fila` vale 1, `columna` recorre 1, 2 y 3 completos. Solo entonces `fila` pasa a 2, y el interior vuelve a empezar desde 1.

El de fuera avanza despacio; el de dentro, deprisa. Como las agujas de un reloj: la de las horas da una vuelta mientras la de los minutos da doce.

## Cuántas iteraciones salen

Se multiplican. Si el exterior da 3 vueltas y el interior 4, el bloque interior se ejecuta 3 × 4 = 12 veces:

```python
vueltas = 0

for fila in range(3):
        for columna in range(4):
                vueltas += 1

print(f"El bloque interior se ha ejecutado {vueltas} veces")
```

```salida
El bloque interior se ha ejecutado 12 veces
```

> [!aviso] Las iteraciones se multiplican, y crecen rápido
>
> Dos bucles de 1000 vueltas cada uno son un millón de iteraciones. Tres bucles anidados de 1000 son mil millones, y eso tu ordenador ya no lo hace en un rato razonable. No es un problema con las cuadrículas pequeñas de esta lección, pero tenlo presente: cada nivel de anidamiento multiplica el trabajo, no lo suma.

## La tabla de multiplicar

Es el ejemplo canónico, y aquí sirve además para practicar el formato de columnas de la lección de f-strings. El truco está en que cada fila se va montando en una variable de texto y se imprime de una vez al terminar el bucle interior:

```python title="tabla.py"
encabezado = f"{'':>4}"
for columna in range(1, 11):
        encabezado += f"{columna:>4}"

print(encabezado)
print("-" * 44)

for fila in range(1, 11):
        linea = f"{fila:>4}"
    for columna in range(1, 11):
                linea += f"{fila * columna:>4}"
    print(linea)
```

```salida
       1   2   3   4   5   6   7   8   9  10
--------------------------------------------
   1   1   2   3   4   5   6   7   8   9  10
   2   2   4   6   8  10  12  14  16  18  20
   3   3   6   9  12  15  18  21  24  27  30
   4   4   8  12  16  20  24  28  32  36  40
   5   5  10  15  20  25  30  35  40  45  50
   6   6  12  18  24  30  36  42  48  54  60
   7   7  14  21  28  35  42  49  56  63  70
   8   8  16  24  32  40  48  56  64  72  80
   9   9  18  27  36  45  54  63  72  81  90
  10  10  20  30  40  50  60  70  80  90 100
```

Tres detalles que hacen que la salida quede cuadrada:

- `{...:>4}` reserva cuatro caracteres para cada número y lo alinea a la derecha. Cuatro bastan porque el mayor valor, 100, tiene tres cifras, y el cuarto hueco es el espacio de separación.
- `f"{'':>4}"` es un hueco vacío de cuatro caracteres, para que el encabezado empiece desplazado y sus números caigan encima de la columna que les toca.
- El separador mide 44 caracteres: 4 de la columna de la izquierda más 4 por cada una de las diez columnas.

> [!consejo] Monta la línea y después imprímela
>
> `print` salta de línea al terminar, así que si lo pones dentro del bucle interior obtienes cien líneas de un número cada una. El patrón es siempre el mismo: inicializa la variable de texto al principio de cada vuelta del bucle exterior, acumula dentro del interior, e imprime al salir de él. Esa variable es un acumulador como los de la lección del `while`, solo que de texto en vez de de número.

## Dibujar figuras

Los bucles anidados son la forma clásica de practicar esto, porque obligan a razonar sobre la relación entre la fila y el número de columnas.

```python
for fila in range(1, 6):
        linea = ""
    for columna in range(fila):
                linea += "*"
    print(linea)
```

```salida
*
**
***
****
*****
```

La clave está en el `range(fila)` del bucle interior: el número de vueltas del interior **depende de la variable del exterior**. En la primera fila da una vuelta, en la segunda dos, y así. Cuando los dos bucles son independientes sale un rectángulo; cuando el interior depende del exterior, salen triángulos y escaleras.

Este ejemplo, de hecho, se puede escribir en dos líneas aprovechando que multiplicar una cadena la repite:

```python
for fila in range(1, 6):
        print("*" * fila)
```

Y eso es lo honesto: si hay una forma sin anidar, úsala. Los bucles anidados son necesarios cuando cada celda es distinta, no cuando la fila entera es el mismo carácter repetido.

Para una pirámide sí hay que calcular dos cosas por fila, los espacios de la izquierda y los asteriscos:

```python
ALTURA = 5

for fila in range(1, ALTURA + 1):
        espacios = " " * (ALTURA - fila)
    asteriscos = "*" * (2 * fila - 1)
    print(espacios + asteriscos)
```

```salida
    *
   ***
  *****
 *******
*********
```

Y cuando cada celda depende de su posición, el anidamiento es imprescindible:

```python
for fila in range(3):
        linea = ""
    for columna in range(6):
                if (fila + columna) % 2 == 0:
                        linea += "#"
        else:
                        linea += "."
    print(linea)
```

```salida
#.#.#.
.#.#.#
#.#.#.
```

## break solo sale del bucle en el que está

Esto es lo que más confunde. Un `break` dentro del bucle interior termina **el interior**, y el exterior sigue dando vueltas como si nada:

```python
for fila in range(1, 4):
        for columna in range(1, 6):
                if columna == 3:
                        break
        print(f"fila {fila}, columna {columna}")

print("Terminado.")
```

```salida
fila 1, columna 1
fila 1, columna 2
fila 2, columna 1
fila 2, columna 2
fila 3, columna 1
fila 3, columna 2
Terminado.
```

Tres filas, y en cada una el `break` ha cortado el recorrido de las columnas en la tercera. El bucle exterior no se ha enterado.

Lo mismo vale para `continue`: afecta solo al bucle que lo contiene directamente.

> [!nota] Cómo salir de los dos bucles a la vez
>
> Python no tiene ningún `break doble`. Las dos formas habituales son:
>
> - Una variable bandera: el `break` interior pone `encontrado = True`, y justo después del bucle interior un `if encontrado: break` sale también del exterior. Funciona, pero hay que escribir dos `break`.
> - Meter los bucles en una función y salir con `return`, que abandona todo de golpe. Es la forma limpia, y la verás en el bloque de lecciones de funciones.
>
> Si te encuentras peleando con esto, suele ser señal de que el código pide una función.

## Ejemplo completo

Una tabla de precios con descuentos por volumen, que junta el anidamiento, el formato de columnas y los porcentajes:

```python title="tarifas.py"
PRECIO_BASE = 24.90

encabezado = f"{'Unidades':<10}"
for descuento in range(0, 25, 5):
        encabezado += f"{descuento:>8}%"

print(encabezado)
print("-" * 55)

for unidades in range(1, 6):
        linea = f"{unidades:<10}"
    for descuento in range(0, 25, 5):
                total = PRECIO_BASE * unidades * (1 - descuento / 100)
        linea += f"{total:>9.2f}"
    print(linea)
```

```salida
Unidades         0%       5%      10%      15%      20%
-------------------------------------------------------
1             24.90    23.65    22.41    21.16    19.92
2             49.80    47.31    44.82    42.33    39.84
3             74.70    70.96    67.23    63.49    59.76
4             99.60    94.62    89.64    84.66    79.68
5            124.50   118.27   112.05   105.83    99.60
```

> [!error] IndentationError: expected an indented block after 'for' statement
>
> Has escrito el `for` interior pero su bloque no está sangrado respecto a él. Recuerda que hay tres niveles: el `for` exterior al margen, el `for` interior a cuatro espacios y el cuerpo del interior a ocho.

> [!error] La salida sale en una sola columna, un número por línea
>
> El `print` está dentro del bucle interior en vez de después. Sácalo un nivel hacia la izquierda, para que se ejecute una vez por fila y no una vez por celda.

> [!error] Todas las filas salen iguales, o la última se repite
>
> Has inicializado la variable de texto **antes** del bucle exterior en lugar de dentro, así que las filas se van acumulando una detrás de otra en la misma línea. El `linea = ""` tiene que ser la primera instrucción del cuerpo del bucle exterior, para que se vacíe en cada fila.

> [!resumen] En resumen
>
> Un bucle dentro de otro recorre dos dimensiones, y el interior se ejecuta **completo en cada vuelta del exterior**, así que el total de iteraciones es el producto de las dos, no la suma. El patrón para sacar una cuadrícula alineada es montar cada fila en una variable de texto, que se vacía al empezar cada vuelta del bucle exterior, acumular dentro del interior con `{valor:>4}` y llamar a `print` al salir de él. Cuando el número de vueltas del interior depende de la variable del exterior salen triángulos y escaleras en vez de rectángulos. Y `break` y `continue` afectan solo al bucle que los contiene directamente: para salir de los dos hace falta una bandera o, mejor, una función.

> [!ejercicio] Practica
>
> Crea `19-anidados.py` y resuelve:
>
> 1. Imprime la tabla de multiplicar del 1 al 10 en formato cuadrícula, con los números alineados y una fila de encabezado.
> 2. Dibuja un cuadrado de 5 por 5 asteriscos, después un triángulo creciente y después uno decreciente.
> 3. Dibuja una pirámide centrada de la altura que se pida por teclado.
> 4. Pide dos números y muestra una cuadrícula con todas las sumas posibles de sus tablas, con encabezados de fila y columna.
> 5. Escribe un bucle anidado que cuente y muestre cuántas iteraciones hace en total con 4 filas y 7 columnas. Comprueba que el número coincide con la multiplicación.
> 6. Pon un `break` en el bucle interior cuando la columna valga 2 y otro en el exterior cuando la fila valga 2. Imprime en cada vuelta los valores de las dos variables y explica en un comentario en qué orden ha salido de cada bucle.
