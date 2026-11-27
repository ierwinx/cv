---
titulo: "Operadores lógicos"
resumen: "Combinar varias condiciones con and, or y not, la prioridad entre ellos y por qué la evaluación de cortocircuito te salva de errores."
minutos: 12
orden: 12
---

Una condición sola rara vez basta. Para entrar en el descuento hay que ser socio **y** haber gastado más de 50 euros. El formulario es inválido si falta el nombre **o** falta el correo. Y a veces lo que quieres es justo lo contrario de lo que sabes comprobar.

Python tiene tres operadores para eso, y en lugar de los símbolos raros de otros lenguajes usa tres palabras en inglés que se leen casi como una frase.

## and: las dos cosas

`and` da `True` solo cuando **ambos** lados son verdaderos:

| Izquierda | Derecha | `and` |
| --- | --- | --- |
| `True` | `True` | `True` |
| `True` | `False` | `False` |
| `False` | `True` | `False` |
| `False` | `False` | `False` |

```python
edad = 25
tiene_carnet = True

print(edad >= 18 and tiene_carnet)
```

```salida
True
```

## or: al menos una

`or` da `True` cuando **alguno** de los dos lados es verdadero:

| Izquierda | Derecha | `or` |
| --- | --- | --- |
| `True` | `True` | `True` |
| `True` | `False` | `True` |
| `False` | `True` | `True` |
| `False` | `False` | `False` |

```python
dia = "sábado"
festivo = False

print(dia == "sábado" or dia == "domingo" or festivo)
```

```salida
True
```

Se pueden encadenar tantos `or` como quieras, como en ese ejemplo con tres. Lo mismo vale para `and`.

> [!aviso] El or de la lengua no es el or de Python
>
> En español, "o" muchas veces significa una cosa o la otra, pero no las dos. El `or` de Python no funciona así: si las dos son verdaderas, el resultado sigue siendo `True`. No hay un "o exclusivo" con palabra propia.

## not: lo contrario

`not` es el único que trabaja con un solo valor: le da la vuelta.

| Valor | `not` |
| --- | --- |
| `True` | `False` |
| `False` | `True` |

```python
nota = 4.5

print(not nota >= 5)
```

```salida
True
```

Ese ejemplo, sin embargo, es justo el mal uso de `not`. `not nota >= 5` es una forma retorcida de escribir `nota < 5`. Reserva `not` para cuando no exista un operador directo:

```python
respuesta = "  "

print(not respuesta.strip())
```

```salida
True
```

Ahí sí se lee bien: "si no hay respuesta".

> [!consejo] Evita las dobles negaciones
>
> `if not (edad < 18):` obliga a quien lo lee a hacer la operación mental de darle la vuelta. `if edad >= 18:` dice lo mismo y se entiende a la primera. Siempre que puedas, expresa la condición en positivo.

## Prioridad

Cuando mezclas operadores en la misma expresión, Python aplica este orden:

| Prioridad | Operadores |
| --- | --- |
| 1 (primero) | Los aritméticos: `**`, `*`, `/`, `//`, `%`, `+`, `-` |
| 2 | Las comparaciones: `==`, `!=`, `<`, `>`, `<=`, `>=` |
| 3 | `not` |
| 4 | `and` |
| 5 (último) | `or` |

De ahí salen dos consecuencias prácticas. La primera es que **las comparaciones se calculan antes que los operadores lógicos**, así que no necesitas paréntesis alrededor de cada una:

```python
if edad >= 18 and nota >= 5:       # correcto y legible
if (edad >= 18) and (nota >= 5):   # significa lo mismo, con ruido de más
```

La segunda es que **`and` se calcula antes que `or`**, lo cual sí puede cambiar el resultado:

```python
print(True or False and False)
print((True or False) and False)
```

```salida
True
False
```

En la primera línea Python calcula primero `False and False`, que es `False`, y luego `True or False`, que es `True`. En la segunda los paréntesis fuerzan el orden contrario. Es exactamente el mismo fenómeno que `2 + 3 * 4`: `and` es la multiplicación y `or` es la suma de la lógica.

```python
edad = 30
socio = False

print(edad < 18 or edad > 65 and socio)
print((edad < 18 or edad > 65) and socio)
```

```salida
False
False
```

Aquí las dos dan lo mismo por casualidad, con estos datos concretos. Cambia `socio` a `True` y `edad` a 70 y verás que la primera da `True` y la segunda también; prueba con `edad = 10` y `socio = False` y se separan. Ese "depende de los datos" es precisamente el problema:

> [!consejo] Pon paréntesis aunque no los necesites
>
> Cuando mezclas `and` y `or` en la misma línea, escribe los paréntesis. No es que Python los necesite: los necesita quien lea el código, incluido tú dentro de dos meses. `(a or b) and c` no deja lugar a dudas; `a or b and c` obliga a recordar una tabla de prioridades.

## Evaluación de cortocircuito

Python es perezoso con `and` y `or`: **deja de evaluar en cuanto sabe el resultado**.

- En `a and b`, si `a` es falso el resultado ya es falso, así que `b` **no se ejecuta nunca**.
- En `a or b`, si `a` es verdadero el resultado ya es verdadero, así que `b` no se ejecuta.

Esto no es un detalle de eficiencia, es una herramienta. Te permite comprobar primero que algo es seguro y solo después usarlo:

```python
entrada = "hola"

print(entrada.isdigit() and int(entrada) > 100)
```

```salida
False
```

`entrada.isdigit()` es `False`, así que Python se detiene ahí y nunca ejecuta `int("hola")`, que habría dado un `ValueError`. Compruébalo quitando la protección:

```python
entrada = "hola"

print(int(entrada) > 100)
```

```salida
ValueError: invalid literal for int() with base 10: 'hola'
```

El mismo patrón sirve para no pasarse del final de una cadena:

```python
linea = ""
resultado = linea and linea[0] == "#"
print(f"{resultado=}")

linea = "# comentario"
resultado = linea and linea[0] == "#"
print(f"{resultado=}")
```

```salida
resultado=''
resultado=True
```

Con la cadena vacía, que es falsa, Python se detiene en el primer operando y `linea[0]` no llega a ejecutarse; el resultado es la propia cadena vacía, que en un `if` cuenta como falso. Sin la protección delante, el mismo código se cae:

```python
linea = ""

print(linea[0] == "#")
```

```salida
IndexError: string index out of range
```

Y para no dividir entre cero:

```python
divisor = 0

print(divisor != 0 and 100 / divisor > 10)
```

```salida
False
```

> [!nota] El orden de los operandos importa
>
> En una condición con `and`, la comprobación protectora va **siempre a la izquierda**. `int(entrada) > 100 and entrada.isdigit()` revienta igual que si no hubieras puesto nada, porque Python evalúa de izquierda a derecha. Primero se asegura, después se usa.

Con esto ya puedes escribir un validador de una sola línea:

```python title="validador.py"
edad_texto = input("Edad: ").strip()

if edad_texto.isdigit() and 18 <= int(edad_texto) <= 120:
        print(f"Edad registrada: {int(edad_texto)}")
else:
        print("Edad no válida: escribe un número entero entre 18 y 120.")
```

```salida
Edad: treinta
Edad no válida: escribe un número entero entre 18 y 120.
```

## and y or no devuelven True o False

Mira con atención la salida de esto:

```python
print("hola" and "mundo")
print("" or "sin nombre")
print(0 or 10)
print("Erwin" or "anónimo")
print(None and "nunca")
```

```salida
mundo
sin nombre
10
Erwin
None
```

No ha salido ni un `True` ni un `False`. Lo que devuelven `and` y `or` es **uno de los dos operandos**, el que ha decidido el resultado:

- `or` devuelve el primero que sea verdadero, y si ninguno lo es, el último.
- `and` devuelve el primero que sea falso, y si ninguno lo es, el último.

En un `if` no lo notas, porque el `if` convierte a booleano de todas formas. Pero fuera de un `if` da un atajo muy usado en Python, el valor por defecto:

```python
nombre = ""
nombre_mostrado = nombre or "Invitado"

print(f"Hola, {nombre_mostrado}")
```

```salida
Hola, Invitado
```

Si `nombre` tiene contenido se queda con él; si está vacío, coge `"Invitado"`. Una línea en lugar de cuatro de `if`/`else`.

> [!aviso] Si necesitas un booleano de verdad, envuélvelo en bool()
>
> `"hola" and "mundo"` es la cadena `"mundo"`, no `True`. Si vas a guardar el resultado en una variable de la que esperas un `bool`, o vas a imprimirlo, pon `bool(...)` alrededor. Dentro de un `if` no hace falta.

> [!error] El or con varios valores que siempre da True
>
> Este es el error de lógica más frecuente al empezar con `or`:
>
> ```python
> dia = "lunes"
>
> if dia == "sábado" or "domingo":
>         print("Fin de semana")
> ```
>
> ```salida
> Fin de semana
> ```
>
> Un lunes. Lo que Python lee no es "si el día es sábado o domingo", sino "si `dia == "sábado"` **o** si la cadena `"domingo"`", y una cadena no vacía siempre es verdadera. Hay que repetir la comparación completa en cada lado:
>
> ```python
> if dia == "sábado" or dia == "domingo":
> ```

> [!error] SyntaxError: invalid syntax, señalando un símbolo
>
> Estás escribiendo `&&`, `||` o `!` porque los has visto en otro lenguaje. En Python los operadores lógicos son tres palabras: `and`, `or` y `not`. El acento circunflejo te señala el símbolo que sobra.

> [!aviso] & y \| no dan error, y eso es peor
>
> Los símbolos `&` y `|` existen en Python y funcionan sobre booleanos, así que `True & False` da `False` y parece que hace lo mismo que `and`. No es así: son operadores de bits, tienen más prioridad que las comparaciones y no hacen cortocircuito. `edad > 1 & edad < 3` da `True` con `edad = 5`, porque Python calcula antes `1 & edad`. Usa siempre las palabras.

> [!resumen] En resumen
>
> `and` es verdadero solo si lo son los dos lados, `or` si lo es al menos uno, y `not` invierte un valor. Las comparaciones se evalúan antes que los operadores lógicos, y `and` antes que `or`, así que cuando mezcles los dos usa paréntesis por legibilidad. La evaluación es de cortocircuito: en `a and b`, si `a` es falso, `b` no se ejecuta, y eso te permite poner la comprobación protectora a la izquierda, como en `entrada.isdigit() and int(entrada) > 100`. `and` y `or` devuelven uno de los operandos y no necesariamente un booleano, de donde sale el atajo `nombre or "Invitado"`.

> [!ejercicio] Practica
>
> Crea `12-logicos.py` y resuelve:
>
> 1. Pide edad y años de antigüedad, y muestra si se cumple la condición de ser mayor de 30 **y** llevar más de 5 años.
> 2. Pide un día de la semana en texto y muestra si es fin de semana, comparando correctamente contra `"sábado"` y `"domingo"`.
> 3. Escribe la condición de un descuento: se aplica si el importe pasa de 100 euros, o si el cliente es socio y el importe pasa de 50. Pon los paréntesis y comprueba los cuatro casos posibles.
> 4. Pide un número por teclado y valida con una sola condición, aprovechando el cortocircuito, que sea un entero entre 1 y 12. Si no lo es, muestra un mensaje de error.
> 5. Imprime qué devuelven `0 or "cero"`, `"a" and ""`, `None or 0` y `5 and 3`. Explica cada resultado en un comentario.
> 6. Escribe `if dia == "sábado" or "domingo":` con `dia = "lunes"`, ejecútalo, comprueba que entra en el bloque y arréglalo.
