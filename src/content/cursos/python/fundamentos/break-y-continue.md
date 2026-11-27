---
titulo: "break y continue"
resumen: "Salir de un bucle antes de tiempo, saltarse una vuelta, y la cláusula else de los bucles que casi nadie conoce."
minutos: 10
orden: 16
---

La condición de un `while` se comprueba solo en un sitio: arriba, antes de cada vuelta. Eso a veces no encaja con lo que necesitas. Quieres parar en cuanto encuentres lo que buscabas, en medio del bloque, sin esperar a que termine la iteración. O quieres descartar una vuelta concreta y seguir con las demás.

Python tiene dos instrucciones de una sola palabra para esos dos casos.

## break: salir del bucle

`break` termina el bucle inmediatamente. El programa continúa por la primera línea que haya después del bloque:

```python
contador = 1

while contador <= 10:
        if contador == 4:
                print("Corto aquí.")
        break
    print(f"Vuelta {contador}")
    contador += 1

print("Fin.")
```

```salida
Vuelta 1
Vuelta 2
Vuelta 3
Corto aquí.
Fin.
```

La condición del `while` decía hasta 10, pero el bucle se ha detenido en la cuarta vuelta. Y fíjate en que no se ha ejecutado el resto del bloque: `break` no espera al final de la iteración, corta ahí mismo.

## continue: saltar a la vuelta siguiente

`continue` abandona lo que quede del bloque y vuelve arriba, a comprobar la condición otra vez. El bucle sigue vivo:

```python
numero = 0

while numero < 10:
        numero += 1
    if numero % 2 == 0:
                continue
    print(numero)
```

```salida
1
3
5
7
9
```

Los pares llegan al `continue` y nunca alcanzan el `print`. Los impares se lo saltan y se imprimen.

| Instrucción | Qué hace con la iteración actual | Qué hace con el bucle |
| --- | --- | --- |
| `break` | La corta | Lo termina |
| `continue` | La corta | Lo continúa por la vuelta siguiente |

> [!aviso] Con continue, cuidado con el contador
>
> En el ejemplo de arriba, el `numero += 1` está en la **primera** línea del bloque, no en la última. Es a propósito: si lo pusieras al final, la vuelta que ejecuta el `continue` se saltaría el incremento, el contador se quedaría clavado y tendrías un bucle infinito. Cuando uses `continue` en un `while`, asegúrate de que el contador se actualiza antes de cualquier `continue` posible.

## El patrón while True con break

Aquí está la razón principal por la que existe `break`. Recuerda el validador de la lección anterior:

```python
edad_texto = input("Edad: ").strip()

while not edad_texto.isdigit():
        print("Eso no es un número entero.")
    edad_texto = input("Edad: ").strip()
```

El `input` estaba escrito dos veces, con su `strip()` y su prompt duplicados. Si mañana cambias el texto de la pregunta tienes que acordarte de cambiarlo en los dos sitios. La versión idiomática mueve la comprobación al medio del bucle:

```python
while True:
        edad_texto = input("Edad: ").strip()
    if edad_texto.isdigit():
                break
    print("Eso no es un número entero.")

edad = int(edad_texto)
print(f"Gracias. Has escrito {edad}.")
```

```salida
Edad: abc
Eso no es un número entero.
Edad: 34
Gracias. Has escrito 34.
```

Se lee como el proceso mental real: pregunta, comprueba, si vale sal, si no avisa y vuelve a preguntar. Un solo `input`, una sola condición y la salida exactamente donde se decide.

**Memoriza esta estructura.** Es la forma estándar de pedir datos en Python y la vas a escribir cientos de veces:

```python
while True:
        respuesta = input("Pregunta: ").strip()
    if respuesta_es_valida:
                break
    print("Mensaje de error")
```

> [!consejo] while True no es hacer trampas
>
> Puede parecer que un bucle "sin condición" es peor estilo que uno con una condición honesta arriba. Es al contrario: cuando la salida depende de algo que se calcula dentro del bloque, forzarla a la línea del `while` obliga a duplicar código, como acabas de ver. La condición sigue estando, solo que escrita donde de verdad se decide.

## La cláusula else de los bucles

Esto es una particularidad de Python que sorprende incluso a quien lleva tiempo con el lenguaje: un bucle puede llevar `else`.

No significa lo mismo que en un `if`. El `else` de un bucle se ejecuta **cuando el bucle termina de forma natural, sin haber pasado por ningún `break`**. Si hubo `break`, se salta.

Sirve para un caso muy concreto: buscar algo y hacer una cosa distinta si no lo encuentras. Busquemos el primer guion bajo de un nombre de fichero:

```python
texto = "informe_2024_final.txt"
posicion = 0

while posicion < len(texto):
        if texto[posicion] == "_":
                print(f"Primer guion bajo en la posición {posicion}")
        break
    posicion += 1
else:
        print("No hay ningún guion bajo en el texto.")
```

```salida
Primer guion bajo en la posición 7
```

Lo encuentra, ejecuta el `break` y el `else` no se ejecuta. Ahora con un texto donde no hay nada que encontrar, sin cambiar ni una línea del bucle:

```python
texto = "informe.txt"
posicion = 0

while posicion < len(texto):
        if texto[posicion] == "_":
                print(f"Primer guion bajo en la posición {posicion}")
        break
    posicion += 1
else:
        print("No hay ningún guion bajo en el texto.")
```

```salida
No hay ningún guion bajo en el texto.
```

El bucle ha recorrido el texto entero, la condición se ha vuelto falsa y entonces sí entra el `else`.

> [!nota] Se leería mejor si se llamara "nobreak"
>
> El nombre `else` es reconocidamente malo, y el propio creador del lenguaje ha dicho que se arrepiente de haberlo elegido. Piénsalo siempre como "si no hubo break". Sin `break` dentro, un `else` de bucle es inútil: se ejecutaría siempre, así que da igual ponerlo o dejar la línea sin sangrar.

La alternativa, si el `else` no te resulta legible, es una variable bandera:

```python
encontrado = False
posicion = 0

while posicion < len(texto):
        if texto[posicion] == "_":
                encontrado = True
        break
    posicion += 1

if not encontrado:
        print("No hay ningún guion bajo en el texto.")
```

Hace lo mismo con dos líneas más. Las dos formas son correctas; usa la que entiendas de un vistazo.

## Ejemplo completo

Un control de acceso con intentos limitados, que junta `break`, el `else` del bucle y el operador condicional:

```python title="acceso.py"
INTENTOS_MAXIMOS = 3
intentos = 0

while intentos < INTENTOS_MAXIMOS:
        clave = input("Contraseña: ").strip()

    if clave == "python2024":
                print("Acceso concedido.")
        break

    intentos += 1
    restantes = INTENTOS_MAXIMOS - intentos
    print(f"Incorrecta. Te queda{'' if restantes == 1 else 'n'} {restantes} intento{'' if restantes == 1 else 's'}.")
else:
        print("Cuenta bloqueada. Contacta con el administrador.")
```

```salida
Contraseña: hola
Incorrecta. Te quedan 2 intentos.
Contraseña: adios
Incorrecta. Te queda 1 intento.
Contraseña: mal
Incorrecta. Te quedan 0 intentos.
Cuenta bloqueada. Contacta con el administrador.
```

Acierta antes y el `else` no aparece:

```salida
Contraseña: hola
Incorrecta. Te quedan 2 intentos.
Contraseña: python2024
Acceso concedido.
```

Esa es la utilidad del `else` aquí: distinguir "ha salido porque ha acertado" de "ha salido porque se le han acabado los intentos", sin ninguna variable extra.

## No abuses

`break` y `continue` son cómodos, y por eso es fácil pasarse. Un bucle con cuatro `break` repartidos y dos `continue` obliga a leerlo entero, de arriba abajo y varias veces, para saber en qué condiciones termina. La condición del `while` deja de significar nada.

Reglas prácticas:

- Un `break` por bucle es lo normal. Dos, revisable. Tres, reescríbelo.
- Si el `break` está en la última línea del bloque, no hace falta: pon la condición en el `while`.
- Un `continue` al principio del bloque para descartar casos se lee bien. En medio del bloque, casi nunca.
- Si te cuesta explicar con una frase cuándo termina tu bucle, simplifícalo.

> [!error] SyntaxError: 'break' outside loop
>
> Has escrito `break` fuera de un bucle, normalmente dentro de un `if` que no está dentro de ningún `while` o `for`. `break` solo tiene sentido dentro de un bucle: si lo que querías era terminar el programa, eso se hace de otra forma que veremos más adelante.

> [!error] El bucle se queda colgado justo al usar continue
>
> Es el fallo del apartado de arriba: el `continue` salta por encima de la línea que actualiza el contador, así que la condición nunca cambia. Mueve la actualización a la parte del bloque que se ejecuta siempre, antes de cualquier `continue`:
>
> ```python
> contador = 0
>
> while contador < 5:
>         if contador == 2:
>                 continue          # bucle infinito: nunca llega al incremento
>     print(contador)
>     contador += 1
> ```

> [!resumen] En resumen
>
> `break` termina el bucle en el sitio donde está, sin acabar la iteración ni volver a comprobar la condición. `continue` abandona el resto del bloque y salta a la vuelta siguiente, así que con él el contador debe actualizarse antes. La combinación `while True` con un `break` en medio es la forma idiomática de validar entradas, porque evita duplicar el `input`. Los bucles admiten una cláusula `else` que se ejecuta solo si **no** hubo `break`, ideal para el caso "no lo he encontrado". Y como todo lo que rompe el flujo lineal, conviene usarlos con moderación: si no puedes explicar en una frase cuándo acaba tu bucle, simplifícalo.

> [!ejercicio] Practica
>
> Crea `16-break.py` y resuelve:
>
> 1. Pide números por teclado y ve sumándolos, pero termina con `break` en cuanto alguien escriba `fin`. Muestra la suma al salir.
> 2. Reescribe con `while True` y `break` la validación de un número entre 1 y 10, de forma que el `input` aparezca una sola vez.
> 3. Imprime los números del 1 al 30 saltándote con `continue` los múltiplos de 3.
> 4. Recorre carácter a carácter el texto `"usuario@dominio.com"` y muestra en qué posición está la arroba. Usa el `else` del bucle para avisar si no hubiera ninguna, y compruébalo después con un texto sin arroba.
> 5. Escribe un menú que se repita con `while True` y salga con `break` cuando se elija la opción de salir. Compáralo con la versión de bandera booleana de la lección anterior.
> 6. Coge el ejemplo de `continue` que provoca un bucle infinito, ejecútalo, córtalo con <kbd>Ctrl</kbd> + <kbd>C</kbd> y arréglalo moviendo una sola línea.
