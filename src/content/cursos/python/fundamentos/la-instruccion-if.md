---
titulo: "La instrucción if"
resumen: "Cómo ejecutar unas líneas solo cuando se cumple una condición, y por qué la sangría decide qué está dentro del bloque."
minutos: 10
orden: 10
---

Ya sabes formular preguntas que dan `True` o `False`. Lo que falta es que el programa haga algo distinto según la respuesta. Esa es la primera forma de control de flujo, y con ella tus programas dejan de ser una lista de pasos siempre igual para convertirse en algo que reacciona a los datos.

## La forma básica

```python
edad = 20

if edad >= 18:
        print("Eres mayor de edad.")
```

```salida
Eres mayor de edad.
```

Tres piezas, y las tres son obligatorias:

1. La palabra `if`, seguida de un espacio y de la **condición**.
2. **Dos puntos** al final de la línea.
3. Debajo, el **bloque** de líneas que se ejecutan si la condición es verdadera, desplazadas cuatro espacios a la derecha.

Los dos puntos son la señal de "aquí abajo viene un bloque". Los verás en todas las estructuras del lenguaje: `if`, `while`, `for`, `def`, `class`. Cuando escribas dos puntos, la línea siguiente va siempre sangrada.

> [!nota] Por qué cuatro espacios
>
> Python solo exige que la sangría sea consistente, pero la guía de estilo PEP 8 fija cuatro espacios y eso es lo que usa todo el mundo. Configura tu editor para que la tecla <kbd>Tab</kbd> inserte cuatro espacios y no un tabulador; mezclarlos da errores que no se ven a simple vista.

## El bloque puede tener varias líneas

Todo lo que esté sangrado al mismo nivel pertenece al bloque y se ejecuta junto:

```python
saldo = 1200.50
retirada = 300

if retirada <= saldo:
        saldo = saldo - retirada
    print(f"Retirada aceptada: {retirada:.2f} €")
    print(f"Saldo restante: {saldo:.2f} €")

print("Operación terminada.")
```

```salida
Retirada aceptada: 300.00 €
Saldo restante: 900.50 €
Operación terminada.
```

Las tres primeras líneas están dentro. La última no: está pegada al margen izquierdo, así que se ejecuta siempre, pase lo que pase con el `if`. **La sangría es lo único que decide qué está dentro y qué está fuera.** En otros lenguajes eso se marca con llaves y la sangría es decoración; aquí es parte de la sintaxis.

## Qué pasa si la condición es falsa

Nada. Python se salta el bloque entero y continúa por la primera línea que vuelva al margen:

```python
temperatura = 12

if temperatura > 30:
        print("Hace calor.")

print("Fin del informe.")
```

```salida
Fin del informe.
```

No hay error ni aviso. El bloque simplemente no ocurre, y eso tiene una consecuencia que conviene tener presente:

> [!error] NameError: name 'estado' is not defined
>
> Si creas una variable dentro de un `if` y la condición resulta falsa, esa variable **no existe** después. Usarla más abajo da `NameError`:
>
> ```python
> nota = 3
> if nota >= 5:
>         estado = "aprobado"
> print(estado)      # NameError si la nota era menor que 5
> ```
>
> La solución es darle un valor por defecto antes del `if`:
>
> ```python
> nota = 3
> estado = "suspendido"
> if nota >= 5:
>         estado = "aprobado"
> print(estado)
> ```

## La condición no tiene que ser una comparación

Esto sorprende al principio: **entre `if` y los dos puntos puede ir cualquier valor**, no solo una comparación. Python le aplica `bool()` por su cuenta y actúa según el resultado. Y ya sabes qué es falso para `bool()`:

```python
print(bool(0), bool(""), bool(None), bool("0"), bool(0.0))
```

```salida
False False False True False
```

Así que estos dos `if` significan lo mismo, y el segundo es el que se escribe en la práctica:

```python
articulos = 3

if articulos != 0:
        print(f"Tienes {articulos} artículos en el carrito.")

if articulos:
        print(f"Tienes {articulos} artículos en el carrito.")
```

```salida
Tienes 3 artículos en el carrito.
Tienes 3 artículos en el carrito.
```

El caso más útil es comprobar si un texto está vacío. `if nombre:` se lee como "si hay nombre":

```python
nombre = input("¿Cómo te llamas? ").strip()

if nombre:
        print(f"Hola, {nombre}.")
```

```salida
¿Cómo te llamas? Erwin
Hola, Erwin.
```

Y como `strip()` deja vacía una cadena que solo tenía espacios, la combinación cubre también al usuario que pulsa <kbd>Intro</kbd> sin escribir nada o escribe tres espacios.

> [!aviso] Cuidado al comprobar números con if valor:
>
> `if cantidad:` es falso cuando `cantidad` vale `0`, y a veces el cero es un dato perfectamente válido. Si lo que te interesa es distinguir "no hay valor" de "el valor es cero", escribe la comparación explícita: `if cantidad > 0:` o `if cantidad is not None:`. El atajo es cómodo con textos; con números, piénsalo.

## Un ejemplo completo

```python title="control_acceso.py"
PRECIO_ENTRADA = 12.00

edad = int(input("Edad: "))
socio = input("¿Eres socio? (s/n) ").strip().lower()

precio = PRECIO_ENTRADA
descuentos = ""

if edad < 18:
        precio = precio * 0.5
    descuentos = descuentos + "menor "

if socio == "s":
        precio = precio - 2
    descuentos = descuentos + "socio "

print()
print(f"{'Precio base:':<16}{PRECIO_ENTRADA:>8.2f} €")
print(f"{'Descuentos:':<16}{descuentos.strip():>8}")
print(f"{'Total:':<16}{precio:>8.2f} €")
```

```salida
Edad: 15
¿Eres socio? (s/n) s

Precio base:       12.00 €
Descuentos:     menor socio
Total:              4.00 €
```

Fíjate en que los dos `if` son independientes: se comprueban los dos y se pueden cumplir los dos a la vez. Cuando las alternativas sean excluyentes necesitarás `else` y `elif`, que es la lección siguiente.

## Los dos errores característicos

> [!error] IndentationError: expected an indented block after 'if' statement on line 2
>
> Has puesto los dos puntos pero no has sangrado la línea de debajo. Después de un `:` **siempre** hay una línea desplazada a la derecha:
>
> ```python
> edad = 20
> if edad >= 18:
> print("Eres mayor de edad.")     # falta la sangría
> ```

> [!error] SyntaxError: expected ':'
>
> Te has olvidado de los dos puntos al final de la línea del `if`. Python te señala con un acento circunflejo el sitio exacto donde los esperaba:
>
> ```python
> edad = 20
> if edad >= 18
>         print("Eres mayor de edad.")
> ```

> [!error] IndentationError: unexpected indent
>
> Has sangrado una línea que no tocaba, o has puesto más espacios en una línea que en la anterior del mismo bloque. Todas las líneas de un mismo bloque llevan exactamente la misma sangría:
>
> ```python
> edad = 20
> if edad >= 18:
>         print("Mayor de edad.")
>             print("Puedes votar.")     # dos espacios de más
> ```

> [!resumen] En resumen
>
> `if condicion:` ejecuta el bloque sangrado solo cuando la condición es verdadera, y si es falsa lo salta por completo y sigue en la primera línea que vuelve al margen. Los dos puntos y los cuatro espacios de sangría son obligatorios: la sangría es lo único que marca qué instrucciones están dentro del bloque. La condición no tiene que ser una comparación, porque Python convierte a booleano cualquier valor, y `0`, `""` y `None` cuentan como falsos. Una variable creada dentro de un `if` no existe si la condición no se cumple, así que dale un valor por defecto antes.

> [!ejercicio] Practica
>
> Crea `10-if.py` y resuelve:
>
> 1. Pide un número y muestra el mensaje `"Es positivo"` solo si lo es. Comprueba que con un número negativo el programa no imprime nada y termina sin error.
> 2. Pide una nota del 0 al 10 e imprime `"Aprobado"` si es 5 o más. Añade dentro del mismo bloque una segunda línea que muestre la nota con un decimal.
> 3. Pide un nombre y saluda solo si ha escrito algo, usando `if nombre:` después de aplicar `strip()`.
> 4. Pide una contraseña e imprime un aviso si tiene menos de 8 caracteres, y otro aviso distinto, en otro `if` independiente, si no contiene ningún dígito. Para lo segundo te sirve `isdigit()` sobre la contraseña entera.
> 5. Escribe un programa que calcule el precio de un envío: 4.95 euros de base, y con un `if` déjalo en 0 si el importe del pedido supera los 50 euros.
> 6. Provoca a propósito los tres errores del final de la lección, uno cada vez, y comprueba que reconoces cada mensaje.
