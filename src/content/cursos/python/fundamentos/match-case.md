---
titulo: "La instrucción match"
resumen: "Comparar un valor contra varias alternativas concretas con match y case, y cuándo esto se lee mejor que una cadena de elif."
minutos: 9
orden: 14
---

Hay un tipo de condición que aparece todo el tiempo: comparar **una misma variable** contra una lista de valores concretos. El número de una opción de menú, un código de error, el nombre de un comando. Con `elif` se puede, pero acabas repitiendo la variable en cada línea:

```python
if opcion == "1":
        ...
elif opcion == "2":
        ...
elif opcion == "3":
        ...
```

Desde la versión 3.10, Python tiene una instrucción específica para eso.

## La forma básica

```python
opcion = "2"

match opcion:
        case "1":
                print("Has elegido: ver el saldo")
    case "2":
                print("Has elegido: hacer un ingreso")
    case "3":
                print("Has elegido: salir")
    case _:
                print("Opción no válida")
```

```salida
Has elegido: hacer un ingreso
```

La estructura es esta:

- `match` seguido del valor que quieres examinar y dos puntos.
- Uno o más `case`, sangrados cuatro espacios, cada uno con el valor con el que comparar y sus propios dos puntos.
- Dentro de cada `case`, su bloque, a ocho espacios.

Igual que con `elif`, se evalúan en orden y **solo se ejecuta el primero que encaja**. No hace falta escribir nada para salir del `match`: cuando termina el bloque de un `case`, la instrucción entera acaba.

> [!nota] Nada de "fall-through"
>
> Si vienes de C, Java o JavaScript, olvida el `break` que hacía falta en cada `case` del `switch`. En Python no se cae de un caso al siguiente. Y `match` no es solo un `switch`: es una herramienta de *coincidencia de patrones*, mucho más potente de lo que vamos a ver aquí, porque su verdadero uso llega con listas y diccionarios.

## El comodín

El caso `case _:` encaja con cualquier cosa, así que hace el papel del `else`. El guion bajo no es una variable: es un símbolo especial que significa "lo que sea, y no me interesa guardarlo".

Y como los `case` se evalúan en orden, **el comodín tiene que ir el último**. Python es tajante con esto:

> [!error] SyntaxError: wildcard makes remaining patterns unreachable
>
> Has puesto `case _:` antes de otros casos, así que esos casos nunca podrían ejecutarse. A diferencia de lo que pasaba con los `elif` mal ordenados, aquí Python sí lo detecta y se niega a ejecutar el programa. Mueve el comodín al final.

El comodín es opcional. Si no lo pones y ningún caso encaja, no pasa nada: el `match` se salta entero, sin error.

```python
opcion = "9"

match opcion:
        case "1":
                print("uno")
    case "2":
                print("dos")

print("Sigo aquí.")
```

```salida
Sigo aquí.
```

Igual que con los `elif` sin `else`, casi siempre querrás un `case _:` que al menos avise de que el valor no estaba previsto.

## Varios valores en un mismo caso

La barra vertical `|` agrupa alternativas en un solo `case`. Se lee como un "o":

```python
dia = "sábado"

match dia:
        case "sábado" | "domingo":
                print("Fin de semana")
    case "lunes" | "martes" | "miércoles" | "jueves" | "viernes":
                print("Día laborable")
    case _:
                print("Eso no es un día de la semana")
```

```salida
Fin de semana
```

Compara esa primera línea con su equivalente en `elif`, donde había que repetir `dia ==` dos veces. Aquí es donde `match` gana de largo.

Funciona igual con números:

```python
codigo = 404

match codigo:
        case 200:
                print("Correcto")
    case 301 | 302:
                print("Redirección")
    case 404:
                print("No encontrado")
    case 500:
                print("Error del servidor")
    case _:
                print(f"Código no contemplado: {codigo}")
```

```salida
No encontrado
```

> [!aviso] La barra \| dentro de un case no es el operador or
>
> Aunque se parezca, ese `|` es parte de la sintaxis de los patrones y solo se puede usar ahí. Fuera de un `case` no sirve para combinar condiciones; para eso están `and`, `or` y `not` de la lección anterior.

## Guardas con if

Un `case` puede llevar una condición extra detrás, y entonces solo encaja si además se cumple:

```python
nota = 9.5

match nota:
        case _ if nota < 0 or nota > 10:
                print("Nota fuera de rango")
    case _ if nota >= 9:
                print("Sobresaliente")
    case _ if nota >= 7:
                print("Notable")
    case _:
                print("Menos de un notable")
```

```salida
Sobresaliente
```

Esa parte `if ...` se llama **guarda**. Fíjate en el detalle importante: para comparar por intervalos hay que poner el comodín en todos los casos, porque un rango no es un valor concreto con el que un patrón pueda coincidir.

Que funcione no significa que sea buena idea. Un `match` en el que todos los casos son `case _ if`, como este, es un `if`/`elif` disfrazado y más largo. Donde las guardas tienen sentido es cuando combinas valor concreto y condición:

```python
codigo = 404

match codigo:
        case 200:
                print("Correcto")
    case _ if 400 <= codigo < 500:
                print("Error del cliente")
    case _ if 500 <= codigo < 600:
                print("Error del servidor")
    case _:
                print("Código desconocido")
```

```salida
Error del cliente
```

## Capturar el valor

Si en lugar de `_` pones un nombre de variable, el `case` también encaja con todo, pero además **guarda el valor** en ese nombre:

```python
comando = "borrar"

match comando:
        case "listar":
                print("Listando")
    case otro:
                print(f"No conozco el comando {otro}")
```

```salida
No conozco el comando borrar
```

En este ejemplo no aporta nada, porque `comando` ya estaba en una variable. Pero esa regla explica un error que desconcierta mucho al empezar:

> [!error] SyntaxError: name capture 'SALIR' makes remaining patterns unreachable
>
> Has intentado usar una constante como patrón:
>
> ```python
> SALIR = "3"
>
> match opcion:
>         case SALIR:        # SyntaxError
>                 print("Saliendo")
>     case _:
>                 print("Otra cosa")
> ```
>
> Python **no** interpreta eso como "si `opcion` es igual a `SALIR`", sino como "coincide con cualquier cosa y guárdala en la variable `SALIR`". Por eso avisa de que los casos siguientes son inalcanzables. Para comparar con una constante hay que escribir el valor literal en el `case`, o usar un `if` normal.

> [!error] IndentationError: expected an indented block after 'match' statement on line 2
>
> Los `case` van sangrados cuatro espacios respecto al `match`, y sus bloques, otros cuatro más. Son dos niveles, no uno.

## Cuándo usar match y cuándo no

| Situación | Qué se lee mejor |
| --- | --- |
| Una variable contra varios valores fijos | `match` |
| Varios valores en el mismo caso | `match`, con la barra vertical |
| Comparaciones por intervalos (`>=`, `<`) | `if`/`elif` |
| Condiciones sobre variables distintas en cada rama | `if`/`elif` |
| Solo dos casos | `if`/`else` |

En resumen: `match` para valores concretos, `elif` para condiciones. Y no te sientas obligado a usarlo. Una cadena de `elif` bien ordenada no es peor código; simplemente, cuando comparas la misma variable contra seis literales, `match` dice lo mismo con menos ruido.

## Ejemplo completo

```python title="conversor.py"
print("CONVERSOR DE UNIDADES")
print("Unidades: km, m, cm")

valor = float(input("Valor: "))
unidad = input("Unidad de origen: ").strip().lower()

match unidad:
        case "km":
                metros = valor * 1000
    case "m":
                metros = valor
    case "cm":
                metros = valor / 100
    case _:
                metros = None

if metros is None:
        print(f"No conozco la unidad '{unidad}'.")
else:
        print(f"{'Metros:':<12}{metros:>12,.3f}")
    print(f"{'Kilómetros:':<12}{metros / 1000:>12,.3f}")
```

```salida
CONVERSOR DE UNIDADES
Unidades: km, m, cm
Valor: 1500
Unidad de origen: m
Metros:        1,500.000
Kilómetros:        1.500
```

Fíjate en el uso de `None` como "no hay resultado" y en la comprobación posterior con `is None`, que es justo el caso en que se usa `is` en lugar de `==`.

> [!aviso] match no existe antes de Python 3.10
>
> Si ejecutas un `match` con Python 3.9 o anterior, el programa no arranca: el intérprete ni siquiera reconoce la palabra y da un `SyntaxError` en la línea del `match`. Comprueba tu versión antes de usarlo:
>
> ```bash
> python3 --version
> ```
>
> Si vas a compartir código que deba funcionar en máquinas viejas, o estás siguiendo un tutorial escrito para 3.8, quédate con `if`/`elif`. Es una de las poquísimas cosas de este módulo que no funcionan en cualquier Python.

> [!resumen] En resumen
>
> `match valor:` compara una variable contra varios `case` con valores concretos, en orden, y ejecuta solo el primero que encaja, sin necesidad de ningún `break`. `case _:` es el comodín y va obligatoriamente al final. La barra `|` agrupa varios valores en un mismo caso, y una guarda `case _ if condicion:` añade una comprobación extra. Un nombre de variable en el patrón no compara: captura, así que las constantes no sirven como patrón. Usa `match` para valores literales y `if`/`elif` para intervalos y condiciones, y recuerda que no existe antes de la versión 3.10.

> [!ejercicio] Practica
>
> Crea `14-match.py` y resuelve:
>
> 1. Pide una letra de nota americana (`A`, `B`, `C`, `D`, `F`) y muestra con `match` su equivalencia en palabras. Acepta también minúsculas normalizando la entrada.
> 2. Pide el número de un mes del 1 al 12 y muestra su nombre. Agrupa con `|` los meses que tienen 30 días y muestra también cuántos días tiene.
> 3. Escribe un menú de una sola pasada con cuatro opciones: sumar, restar, multiplicar y salir. Pide la opción, pide los dos números si hace falta y muestra el resultado.
> 4. Pide un código de estado HTTP y clasifícalo en informativo, correcto, redirección, error del cliente o error del servidor, usando guardas con intervalos.
> 5. Coge la clasificación de notas del ejercicio de `elif` y reescríbela con `match` y guardas. Decide después cuál de las dos versiones dejarías en un proyecto de verdad, y escribe el motivo en un comentario.
> 6. Escribe un `match` con `case _:` en primer lugar, ejecútalo y comprueba que Python se niega a arrancar.
