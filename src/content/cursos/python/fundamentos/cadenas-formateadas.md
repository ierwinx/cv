---
titulo: "Cadenas formateadas (f-strings)"
resumen: "La forma moderna de mezclar variables dentro de un texto, y cómo controlar decimales, alineación y separadores de millares."
minutos: 10
orden: 5
---

## El problema

Quieres componer un mensaje mezclando texto y datos. Con lo que sabes hasta ahora tendrías que hacer esto:

```python
nombre = "Erwin"
edad = 34

print("Hola, " + nombre + ". Tienes " + str(edad) + " años.")
```

Funciona, pero es incómodo: hay que acordarse de los espacios, hay que convertir el número con `str()` y con cuatro variables se vuelve ilegible.

## La solución: f-strings

Pon una `f` justo antes de la comilla de apertura y podrás meter variables entre llaves:

```python
nombre = "Erwin"
edad = 34

print(f"Hola, {nombre}. Tienes {edad} años.")
```

```salida
Hola, Erwin. Tienes 34 años.
```

Esa `f` viene de *formatted*. Dentro de las llaves puedes poner **cualquier expresión**, no solo un nombre de variable:

```python
precio = 20
cantidad = 3

print(f"Total: {precio * cantidad} euros")
print(f"En mayúsculas: {nombre.upper()}")
print(f"El año que viene tendrás {edad + 1}")
```

```salida
Total: 60 euros
En mayúsculas: ERWIN
El año que viene tendrás 35
```

> [!aviso] No olvides la f
>
> Sin ella, las llaves se imprimen tal cual:
>
> ```python
> print("Hola, {nombre}")     # imprime literalmente Hola, {nombre}
> ```
>
> Es un despiste tan frecuente que conviene reconocerlo de un vistazo: si ves llaves en tu salida, te falta la `f`.

## Controlar el formato

Después del valor puedes poner dos puntos y una instrucción de formato. Aquí está casi todo lo que necesitarás:

### Decimales

```python
pi = 3.14159265
precio = 1234.5

print(f"{pi:.2f}")        # dos decimales
print(f"{pi:.4f}")        # cuatro decimales
print(f"{precio:.2f} €")
```

```salida
3.14
3.1416
1234.50 €
```

`.2f` significa "formato de coma flotante con dos decimales". Fíjate en que rellena con ceros si hace falta: `1234.5` sale como `1234.50`, que es justo lo que quieres para precios.

### Separador de millares

```python
poblacion = 1234567
print(f"{poblacion:,}")
print(f"{poblacion:,.2f}")
```

```salida
1,234,567
1,234,567.00
```

> [!consejo] Cambiar al formato español
>
> Python usa la convención inglesa: coma para millares y punto para decimales. Para darle la vuelta, un truco rápido es formatear en inglés e intercambiar los símbolos:
>
> ```python
> numero = f"{1234567.89:,.2f}"
> espanol = numero.replace(",", "X").replace(".", ",").replace("X", ".")
> print(espanol)
> ```
>
> ```salida
> 1.234.567,89
> ```

### Porcentajes

```python
completado = 0.734
print(f"Llevas un {completado:.1%}")
```

```salida
Llevas un 73.4%
```

El formato `%` multiplica por cien y añade el símbolo automáticamente.

### Alineación y ancho

Reserva un número de caracteres y decide hacia dónde se pega el contenido:

```python
print(f"{'Nombre':<12}{'Edad':>5}")
print(f"{'Erwin':<12}{34:>5}")
print(f"{'Ana':<12}{7:>5}")
print(f"{'MENÚ':^30}")
print(f"{'MENÚ':=^30}")
```

```salida
Nombre       Edad
Erwin          34
Ana             7
             MENÚ
=============MENÚ=============
```

| Símbolo | Significa |
| --- | --- |
| `<` | Alinear a la izquierda |
| `>` | Alinear a la derecha |
| `^` | Centrar |
| El carácter antes del símbolo | Con qué rellenar en vez de espacios |

Esto es lo que te permitirá sacar tablas decentes por la terminal en el módulo 2.

### Ceros a la izquierda

```python
print(f"Factura {3:04d}")
print(f"Factura {42:04d}")
print(f"Factura {137:04d}")
```

```salida
Factura 0003
Factura 0042
Factura 0137
```

El `4` es el ancho total y la `d` significa "número entero". Verás este formato en códigos de referencia, números de factura y horas.

## Depurar con f-strings

Un signo `=` dentro de las llaves imprime el nombre y el valor. Es comodísimo para depurar:

```python
total = 42
print(f"{total=}")
print(f"{total * 2=}")
```

```salida
total=42
total * 2=84
```

## Textos largos en varias líneas

Para no pasarte del ancho de pantalla, puedes escribir cadenas consecutivas entre paréntesis y Python las unirá:

```python
nombre = "Erwin"
puntos = 1250

mensaje = (
    f"Hola {nombre}, "
    f"tienes {puntos} puntos acumulados "
    f"y te faltan {2000 - puntos} para el siguiente nivel."
)
print(mensaje)
```

```salida
Hola Erwin, tienes 1250 puntos acumulados y te faltan 750 para el siguiente nivel.
```

Cada trozo necesita su propia `f`.

## Las formas antiguas

Te las encontrarás en código de otros, así que conviene reconocerlas:

```python
nombre = "Erwin"

print("Hola, %s" % nombre)                 # estilo de los años 90
print("Hola, {}".format(nombre))           # estilo Python 2.7 a 3.5
print(f"Hola, {nombre}")                   # estilo actual, desde Python 3.6
```

Las tres funcionan. **Usa siempre la tercera**: es más corta, más rápida y mucho más legible.

> [!error] ValueError: Invalid format specifier
>
> Has escrito mal lo que va detrás de los dos puntos. Errores típicos: poner `{precio:2f}` en vez de `{precio:.2f}` (falta el punto), o intentar usar `.2f` sobre algo que no es un número.

> [!error] Aparecen las llaves literales
>
> Si de verdad quieres imprimir una llave dentro de una f-string, duplícala: `f"{{esto sale con llaves}}"`.

> [!resumen] En resumen
>
> Pon una `f` antes de la comilla y escribe variables o expresiones entre llaves. Tras dos puntos puedes dar formato: `.2f` para decimales, `,` para millares, `%` para porcentajes, `<` `>` `^` para alinear y `04d` para ceros a la izquierda. `{variable=}` imprime nombre y valor, ideal para depurar.

> [!ejercicio] Practica
>
> Crea `05-formato.py` y resuelve:
>
> 1. Pide tres datos a mano (escríbelos en variables) e imprime una ficha: nombre, edad y ciudad, cada uno en su línea y bien alineado.
> 2. Calcula el precio con IVA de un producto de 45.90 euros e imprímelo con exactamente dos decimales y el símbolo del euro.
> 3. Imprime una tabla de tres productos con columnas alineadas: nombre a la izquierda en 20 caracteres, cantidad centrada en 8 y precio a la derecha en 10 con dos decimales.
> 4. Muestra el número 9876543.21 con separador de millares.
> 5. Escribe tres líneas que impriman los códigos `REF-0007`, `REF-0042` y `REF-0999` partiendo de los números 7, 42 y 999.
> 6. Imprime qué porcentaje de 250 son 87, con un decimal.
