---
titulo: "El bucle while"
resumen: "Repetir un bloque mientras se cumpla una condición, los bucles infinitos y los tres patrones que vas a usar todos los días."
minutos: 12
orden: 15
---

Imagina que quieres imprimir los números del 1 al 5. Con lo que sabes hasta ahora tendrías que escribir cinco `print`. Del 1 al 1000 ya no es una opción. Y si ni siquiera sabes cuántas veces hay que repetir, porque depende de lo que escriba el usuario, es directamente imposible.

Los bucles resuelven eso: un trozo de código escrito una sola vez que se ejecuta muchas. El primero de los dos que tiene Python se llama `while`, y repite **mientras** una condición sea verdadera.

## La forma básica

```python
contador = 1

while contador <= 5:
        print(f"Vuelta {contador}")
    contador += 1

print("Fin del bucle.")
```

```salida
Vuelta 1
Vuelta 2
Vuelta 3
Vuelta 4
Vuelta 5
Fin del bucle.
```

La sintaxis es idéntica a la del `if`: la palabra clave, la condición, dos puntos y un bloque sangrado cuatro espacios. La diferencia está en lo que ocurre al llegar al final del bloque:

1. Python comprueba la condición.
2. Si es verdadera, ejecuta el bloque entero.
3. **Vuelve al paso 1.**
4. Cuando la condición es falsa, se salta el bloque y continúa por la primera línea sin sangrar.

Un `if` mira la condición una vez; un `while` la mira antes de cada vuelta. Cada una de esas vueltas se llama **iteración**.

## La condición se comprueba antes

Si la condición es falsa desde el principio, el bloque no se ejecuta ni una sola vez:

```python
intentos = 0

while intentos > 3:
        print("Esto no se imprime nunca")

print("El bucle no se ha ejecutado ni una vez.")
```

```salida
El bucle no se ha ejecutado ni una vez.
```

No es un error, es el comportamiento normal. Un `while` puede dar cero vueltas.

## El contador

En el primer ejemplo había tres líneas repartidas que forman un patrón que verás miles de veces:

```python
contador = 1               # 1. inicializar antes del bucle
while contador <= 5:       # 2. comparar en la condición
        print(contador)
    contador += 1          # 3. modificar dentro del bucle
```

Las tres son imprescindibles, y **la tercera es la que se olvida**. Si no cambias nunca la variable que aparece en la condición, la condición nunca dejará de ser verdadera.

```python
segundos = 3

while segundos > 0:
        print(f"{segundos}...")
    segundos -= 1

print("Despegue.")
```

```salida
3...
2...
1...
Despegue.
```

> [!consejo] Pon el incremento en la última línea del bloque
>
> Si lo dejas en medio del bloque, el día que añadas una línea debajo puedes acabar cambiando el contador antes de haberlo usado. Como costumbre, la actualización del contador va al final, pegada al borde inferior del bloque.

## El bucle infinito

Es el error clásico de esta lección. Este programa no termina nunca:

```python title="bucle_infinito.py"
contador = 1

while contador <= 5:
        print(f"Vuelta {contador}")
```

Falta el `contador += 1`, así que `contador` vale 1 para siempre, `1 <= 5` es verdadero para siempre y el programa imprime `Vuelta 1` hasta que lo pares tú.

**Para cortarlo, pulsa <kbd>Ctrl</kbd> + <kbd>C</kbd> en la terminal.** Python interrumpe la ejecución y, después de los miles de `Vuelta 1` que hayan salido, te deja este mensaje:

```salida
Traceback (most recent call last):
  File "/tmp/bucle_infinito.py", line 3, in <module>
    print(f"Vuelta {contador}")
    ~~~~~^^^^^^^^^^^^^^^^^^^^^^
KeyboardInterrupt
```

> [!aviso] KeyboardInterrupt no es un fallo de tu código
>
> Ese `KeyboardInterrupt` solo dice "alguien ha pulsado <kbd>Ctrl</kbd> + <kbd>C</kbd>". Aparece en la línea que se estuviera ejecutando en ese instante, que puede ser cualquiera del bloque, así que no la mires buscando el error: el error está en que falta la línea que modifica la condición.

Si te ocurre con un bucle que imprime mucho, la terminal se te llenará de miles de líneas. Es incómodo pero inofensivo: nada se rompe y el ordenador no sufre.

### Cuando el bucle infinito es intencionado

Hay un caso en el que un bucle sin fin es exactamente lo que quieres: cuando no sabes cuántas vueltas hará y la salida depende de algo que pasa dentro. Entonces se escribe así, con la condición siempre verdadera:

```python
while True:
    # ... y aquí dentro se decide cuándo salir
```

`True` es verdadero por definición, así que el bucle no termina solo. Necesita una instrucción específica para salir, `break`, que es el tema de la lección siguiente. Hasta entonces usaremos una variable de control.

## Patrón 1: el acumulador

Una variable que va guardando el total de todas las vueltas. Se inicializa a cero antes del bucle y va creciendo dentro:

```python
numero = 1
suma = 0

while numero <= 100:
        suma += numero
    numero += 1

print(f"La suma de 1 a 100 es {suma}")
```

```salida
La suma de 1 a 100 es 5050
```

Dos variables con papeles distintos: `numero` controla el bucle y `suma` acumula. No las mezcles en una sola.

El acumulador vale para cualquier cosa que se combine: sumar precios, contar cuántos elementos cumplen algo, multiplicar para calcular un factorial. Este ejemplo acumula y además cuenta, para poder sacar la media:

```python
total = 0.0
articulos = 0
precio = 10.0

while articulos < 4:
        total += precio
    articulos += 1
    precio += 2.5

print(f"{'Artículos:':<14}{articulos}")
print(f"{'Total:':<14}{total:.2f} €")
print(f"{'Media:':<14}{total / articulos:.2f} €")
```

```salida
Artículos:    4
Total:        55.00 €
Media:        13.75 €
```

> [!nota] El acumulador se inicializa según la operación
>
> Para sumar, empieza en `0`. Para multiplicar, en `1`, porque partir de cero daría cero siempre. Para construir un texto, en `""`. La regla es: el valor inicial tiene que ser el que no altere el resultado.

Los contadores también sirven para descomponer números, combinando la división entera y el resto que ya conoces:

```python
numero = 4071
suma_digitos = 0

while numero > 0:
        suma_digitos += numero % 10      # el último dígito
    numero //= 10                    # quita el último dígito

print(f"Suma de los dígitos: {suma_digitos}")
```

```salida
Suma de los dígitos: 12
```

Aquí la condición no depende de un contador, sino del propio dato, que se va encogiendo hasta llegar a cero. Es el `while` en su forma más natural: repetir hasta que algo se acabe.

## Patrón 2: la validación

Insistir con la misma pregunta hasta que la respuesta sirva. Fíjate en que el `input` aparece dos veces, una antes del bucle y otra dentro:

```python
edad_texto = input("Edad: ").strip()

while not edad_texto.isdigit():
        print("Eso no es un número entero.")
    edad_texto = input("Edad: ").strip()

edad = int(edad_texto)
print(f"Gracias. Has escrito {edad}.")
```

```salida
Edad: treinta
Eso no es un número entero.
Edad: -5
Eso no es un número entero.
Edad: 34
Gracias. Has escrito 34.
```

Con esto se acaba el problema del `ValueError` que arrastrábamos desde la lección de `input()`: la conversión a `int` de la penúltima línea no puede fallar, porque el bucle no deja pasar nada que no sea un número.

La pregunta duplicada es fea y tiene arreglo. Es justo lo que resuelve el `while True` con `break` de la lección siguiente.

## Patrón 3: el menú

El bucle mantiene el programa vivo mostrando opciones hasta que la persona decide salir:

```python title="menu.py"
saldo = 1000.00
salir = False

while not salir:
        print()
    print("BANCO")
    print("1. Ver saldo")
    print("2. Ingresar")
    print("3. Salir")

    opcion = input("Opción: ").strip()

    if opcion == "1":
                print(f"Saldo actual: {saldo:.2f} €")
    elif opcion == "2":
                cantidad = float(input("Cantidad a ingresar: "))
        saldo += cantidad
        print(f"Nuevo saldo: {saldo:.2f} €")
    elif opcion == "3":
                salir = True
        print("Hasta luego.")
    else:
                print("Opción no válida.")
```

```salida

BANCO
1. Ver saldo
2. Ingresar
3. Salir
Opción: 1
Saldo actual: 1000.00 €

BANCO
1. Ver saldo
2. Ingresar
3. Salir
Opción: 2
Cantidad a ingresar: 250
Nuevo saldo: 1250.00 €

BANCO
1. Ver saldo
2. Ingresar
3. Salir
Opción: 3
Hasta luego.
```

Este programa junta casi todo el módulo: variables, `input`, conversiones, f-strings con formato, una cadena de `elif` y un bucle. La variable `salir` se llama *bandera*: un booleano que existe solo para controlar cuándo acaba el bucle. Fíjate en que la opción no válida no rompe nada; el bucle vuelve a preguntar.

> [!nota] Por qué no está en un bucle for
>
> Este bucle no tiene un número de vueltas conocido: pueden ser dos o doscientas, según lo que haga quien lo use. Esa es exactamente la frontera entre los dos bucles de Python, y la veremos con detalle en la lección de `for`.

> [!error] El programa se queda imprimiendo sin parar
>
> Bucle infinito. Corta con <kbd>Ctrl</kbd> + <kbd>C</kbd> y revisa dos cosas: que la variable de la condición se modifique dentro del bloque, y que se modifique **en la dirección correcta**. Un `contador -= 1` con la condición `contador <= 5` se aleja del final en vez de acercarse.

> [!error] El programa se queda parado sin imprimir nada
>
> Esto no es un bucle infinito: es un `input()` esperando. Mira si has puesto un `input` sin texto de prompt dentro del bucle, porque entonces no se ve nada en pantalla y parece colgado. Escribe <kbd>Intro</kbd> o corta con <kbd>Ctrl</kbd> + <kbd>C</kbd>.

> [!error] El bucle da una vuelta de más o de menos
>
> Revisa si la condición usa `<` o `<=`. Con `contador = 1` y `while contador <= 5:` salen cinco vueltas; con `while contador < 5:`, cuatro. Y si empiezas el contador en 0, todo se desplaza uno. Cuando dudes, escribe un `print(contador)` como primera línea del bloque y cuéntalas.

> [!resumen] En resumen
>
> `while condicion:` repite el bloque sangrado mientras la condición sea verdadera, comprobándola antes de cada vuelta, así que puede dar cero vueltas. El patrón del contador tiene tres partes: inicializarlo antes, compararlo en la condición y **modificarlo dentro del bloque**; si falta lo tercero tienes un bucle infinito, que se corta con <kbd>Ctrl</kbd> + <kbd>C</kbd> y da un `KeyboardInterrupt`. Un bucle infinito a propósito se escribe `while True` y necesita `break` para salir. Los tres patrones básicos son el acumulador, que va guardando un total en una variable inicializada antes; la validación, que repite la pregunta hasta que la respuesta sirve; y el menú, que gira hasta que una bandera booleana dice basta.

> [!ejercicio] Practica
>
> Crea `15-while.py` y resuelve:
>
> 1. Imprime los números del 1 al 20, cada uno en su línea. Después cámbialo para que vayan del 20 al 1.
> 2. Imprime la tabla de multiplicar del 7 desde `7 x 1` hasta `7 x 10`, con el resultado alineado a la derecha en columnas.
> 3. Pide números por teclado uno a uno y ve acumulando la suma. Termina cuando la persona escriba `0`, y muestra entonces la suma, cuántos números había y la media.
> 4. Escribe un juego: piensa un número fijo entre 1 y 100 y pide intentos hasta acertar, diciendo en cada uno si el número buscado es mayor o menor. Al final muestra cuántos intentos han hecho falta.
> 5. Pide una contraseña y no dejes continuar hasta que tenga al menos 8 caracteres y contenga un dígito. Muestra en cada intento fallido qué requisito falta.
> 6. Escribe a propósito un bucle infinito, ejecútalo, córtalo con <kbd>Ctrl</kbd> + <kbd>C</kbd> y lee el `KeyboardInterrupt`. Después arréglalo.
