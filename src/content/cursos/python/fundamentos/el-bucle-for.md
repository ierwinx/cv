---
titulo: "El bucle for"
resumen: "Recorrer una secuencia elemento a elemento, la idea de para cada, y en qué se diferencia de un while."
minutos: 11
orden: 17
---

Para recorrer un texto carácter a carácter con un `while` hacen falta cuatro cosas: una variable de posición, una condición con `len()`, un acceso por índice y un incremento. Cuatro cosas que puedes equivocar de cuatro maneras distintas, y todas para expresar una idea muy simple: "haz esto con cada letra".

```python
palabra = "Python"
posicion = 0

while posicion < len(palabra):
        print(palabra[posicion])
    posicion += 1
```

El segundo bucle de Python dice eso mismo en dos líneas.

## La forma básica

```python
for letra in "Python":
        print(letra)
```

```salida
P
y
t
h
o
n
```

Sin contador, sin `len()`, sin corchetes y sin posibilidad de pasarte del final. La sintaxis es:

- La palabra `for`.
- Un **nombre de variable** que tú eliges.
- La palabra `in`.
- La **secuencia** que quieres recorrer.
- Dos puntos y el bloque sangrado, como siempre.

Y se lee literalmente como una frase en inglés que no hace falta traducir: *for letra in "Python"*, para cada letra en "Python".

## Cómo funciona por dentro

En cada vuelta, Python coge el siguiente elemento de la secuencia y lo guarda en la variable del bucle. Después ejecuta el bloque. Cuando no quedan elementos, el bucle termina.

Eso significa que la variable del bucle **cambia sola**: no la inicializas tú ni la incrementas tú. En la primera vuelta `letra` vale `"P"`, en la segunda `"y"`, y así hasta la última. Esa es la mitad de las líneas que desaparecen respecto al `while`.

```python
frase = "programar en Python es divertido"
vocales = 0

for caracter in frase:
        if caracter in "aeiouáéíóú":
                vocales += 1

print(f"La frase tiene {vocales} vocales")
```

```salida
La frase tiene 10 vocales
```

Fíjate en que los patrones de la lección del `while` siguen funcionando igual. Ahí dentro hay un acumulador, `vocales`, inicializado antes del bucle. Lo único que cambia es quién controla las vueltas.

Y el acumulador de texto también:

```python
palabra = "murcielago"
invertida = ""

for letra in palabra:
        invertida = letra + invertida

print(invertida)
```

```salida
ogaleicrum
```

Cada letra se pone **delante** de lo que ya había, así que el texto sale al revés. Nada de esto sería más fácil con un `while`.

## El nombre de la variable

Lo eliges tú, y como cualquier nombre, debe decir qué contiene. Si recorres un texto, `letra` o `caracter`; si recorres precios, `precio`; si recorres ciudades, `ciudad`. En singular, porque en cada vuelta hay uno solo.

```python
for ciudad in ["Madrid", "Sevilla", "Bilbao"]:
        print(f"{ciudad:<10}{len(ciudad)} letras")
```

```salida
Madrid    6 letras
Sevilla   7 letras
Bilbao    6 letras
```

Verás mucho código con `i`, `x` o `c`. Es una costumbre heredada de otros lenguajes y solo se justifica cuando la variable es de verdad un número sin significado. `for precio in precios:` se entiende sin pensar; `for x in p:` no.

> [!nota] La variable sobrevive al bucle
>
> Al terminar, la variable sigue existiendo y conserva el último valor que tuvo:
>
> ```python
> for letra in "abc":
>         print(letra)
>
> print(f"Al salir, letra vale {letra}")
> ```
>
> ```salida
> a
> b
> c
> Al salir, letra vale c
> ```
>
> No lo aproveches a propósito, porque hace el código difícil de seguir y falla si la secuencia estaba vacía, en cuyo caso la variable nunca llega a crearse y tendrás un `NameError`.

## for y while: cuál usar

Los dos repiten, pero responden a preguntas distintas:

| Aspecto | `for` | `while` |
| --- | --- | --- |
| Se usa cuando | Sabes **sobre qué** iteras | Dependes de una **condición** |
| Número de vueltas | Determinado por la secuencia | Desconocido de antemano |
| Quién avanza | Python, solo | Tú, con un contador |
| Riesgo de bucle infinito | Ninguno | Alto |
| Ejemplo típico | Recorrer un texto o una lista | Un menú, validar una entrada |

La regla para decidir es corta: **si puedes usar `for`, usa `for`**. Es más corto, se entiende mejor y no puede quedarse colgado, porque la secuencia que recorre es finita y se acaba sola.

El `while` se queda para lo que no tiene una secuencia detrás: repetir hasta que el usuario escriba algo válido, mantener un menú abierto, o seguir calculando hasta alcanzar una precisión. En todos esos casos no hay nada que recorrer, solo una condición que vigilar.

> [!consejo] Los dos bucles admiten break, continue y else
>
> Todo lo de la lección anterior vale igual aquí. `break` sale del `for`, `continue` pasa al elemento siguiente y el `else` se ejecuta si no hubo `break`. La única diferencia práctica es que en un `for` no hay contador que se pueda saltar, así que `continue` es más seguro.

## Iterar sobre varios valores sueltos

Además de cadenas, un `for` puede recorrer una lista de valores escritos entre corchetes:

```python
for precio in [3, 7, 11]:
        print(f"Precio: {precio} €")
```

```salida
Precio: 3 €
Precio: 7 €
Precio: 11 €
```

Esos corchetes con valores separados por comas son una **lista**, y es cómodo usarlas así para probar un bucle con tres o cuatro datos concretos.

> [!nota] Las listas tienen su propio bloque de lecciones
>
> Aquí solo estamos aprovechando que un `for` puede recorrerlas. Una lista es mucho más que eso: se le pueden añadir y quitar elementos, ordenarla, buscar dentro, partirla en trozos. Todo eso llega en el bloque de lecciones dedicado a las listas, y hasta entonces las usaremos únicamente como en este ejemplo, escritas a mano y solo para recorrerlas.

También puedes recorrer el resultado de `split()`, que ya conoces y que produce precisamente una lista:

```python
frase = "uno dos tres cuatro"

for palabra in frase.split():
        print(f"{palabra:<8}{len(palabra)}")
```

```salida
uno     3
dos     3
tres    4
cuatro  6
```

Eso resuelve del todo el ejemplo de "varios datos en una línea" que dejamos a medias en la lección de `input()`, donde había que escribir `partes[0]`, `partes[1]` y `partes[2]` a mano.

## Ejemplo completo

```python title="analizador.py"
VOCALES = "aeiouáéíóúü"
CONSONANTES = "bcdfghjklmnñpqrstvwxyz"

frase = input("Escribe una frase: ")

vocales = 0
consonantes = 0
espacios = 0
otros = 0

for caracter in frase.lower():
        if caracter in VOCALES:
                vocales += 1
    elif caracter in CONSONANTES:
                consonantes += 1
    elif caracter == " ":
                espacios += 1
    else:
                otros += 1

print()
print(f"{'Caracteres:':<14}{len(frase):>4}")
print(f"{'Vocales:':<14}{vocales:>4}")
print(f"{'Consonantes:':<14}{consonantes:>4}")
print(f"{'Espacios:':<14}{espacios:>4}")
print(f"{'Otros:':<14}{otros:>4}")
```

```salida
Escribe una frase: El año 2024 fue raro.
Caracteres:     21
Vocales:         7
Consonantes:     5
Espacios:        4
Otros:           5
```

El `lower()` va en la línea del `for`, no dentro del bucle: se aplica una sola vez a la frase completa y así las constantes solo necesitan las minúsculas. Los dígitos y el punto caen en `otros`, que es el `else` que recoge todo lo que no ha encajado antes.

> [!error] TypeError: 'int' object is not iterable
>
> Le has pasado al `for` algo que no se puede recorrer, casi siempre un número:
>
> ```python
> for numero in 10:      # TypeError
>         print(numero)
> ```
>
> Un `10` no es una secuencia de diez cosas, es un solo valor. Lo que quieres es `range(10)`, que es justo el tema de la lección siguiente.

> [!error] SyntaxError: invalid syntax, señalando la secuencia
>
> Te has olvidado de la palabra `in`. Las dos palabras, `for` y `in`, son obligatorias:
>
> ```python
> for letra "Python":     # falta el in
> ```

> [!error] SyntaxError: invalid syntax, señalando la variable
>
> Estás escribiendo el `for` como en C, Java o JavaScript. En Python no hay inicialización, condición y incremento entre paréntesis:
>
> ```python
> for i = 0; i < 5; i += 1:      # SyntaxError
> ```
>
> El `for` de Python solo recorre secuencias. Para contar números, la herramienta es `range`.

> [!resumen] En resumen
>
> `for variable in secuencia:` ejecuta el bloque una vez por cada elemento, guardándolo en la variable, que se actualiza sola sin contador ni condición. Sobre una cadena recorre sus caracteres, y también puede recorrer una lista escrita entre corchetes o el resultado de `split()`. Elige `for` cuando sepas sobre qué iteras y `while` cuando dependas de una condición: el `for` es más corto, más claro y no puede quedarse en un bucle infinito. Los patrones del acumulador y del contador funcionan igual, y `break`, `continue` y el `else` del bucle también.

> [!ejercicio] Practica
>
> Crea `17-for.py` y resuelve:
>
> 1. Pide una palabra e imprime sus letras, una por línea, numeradas con un contador que lleves tú.
> 2. Cuenta cuántas veces aparece la letra `"a"` en una frase que pidas por teclado, sin distinguir mayúsculas.
> 3. Escribe un programa que reciba una frase y la imprima al revés, acumulando en una variable de texto.
> 4. Recorre la lista `[12.50, 8.90, 21.00, 4.75]` y muestra cada precio alineado a la derecha, el total y la media.
> 5. Pide una frase, pártela con `split()` y muestra cada palabra con su número de letras en dos columnas. Indica al final cuál es la más larga.
> 6. Escribe `for numero in 10:`, ejecútalo, lee el `TypeError` y deja el arreglo apuntado en un comentario para la lección siguiente.
