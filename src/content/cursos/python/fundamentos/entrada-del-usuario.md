---
titulo: "Pedir datos al usuario"
resumen: "La función input(), por qué todo lo que devuelve es texto y cómo construir tu primer programa realmente interactivo."
minutos: 9
orden: 6
---

Hasta ahora tus programas hacían siempre exactamente lo mismo. Con `input()` empiezan a responder a quien los usa.

## Cómo funciona

```python
nombre = input("¿Cómo te llamas? ")
print(f"Encantado, {nombre}")
```

```salida
¿Cómo te llamas? Erwin
Encantado, Erwin
```

Al llegar a `input()` ocurren tres cosas:

1. Se escribe en pantalla el texto que le pasas entre paréntesis, que se llama *prompt*.
2. **El programa se detiene** y espera. No avanza hasta que la persona pulse <kbd>Intro</kbd>.
3. Lo que haya escrito se devuelve, y en este caso se guarda en `nombre`.

> [!consejo] Deja un espacio al final del prompt
>
> `input("¿Cómo te llamas? ")` con espacio después del signo es mucho más legible que `input("¿Cómo te llamas?")`, donde el cursor queda pegado al texto.

## La regla de oro: input siempre devuelve texto

Este es el punto que hay que interiorizar hoy. **Aunque el usuario escriba cifras, lo que recibes es una cadena.**

```python
edad = input("¿Cuántos años tienes? ")
print(type(edad))
print(edad + 1)
```

```salida
¿Cuántos años tienes? 30
<class 'str'>
TypeError: can only concatenate str (not "int") to str
```

Python no puede sumar 1 al texto `"30"`. Hay que convertirlo primero:

```python
edad = int(input("¿Cuántos años tienes? "))
print(f"El año que viene tendrás {edad + 1}")
```

```salida
¿Cuántos años tienes? 30
El año que viene tendrás 31
```

Fíjate en cómo se anidan: `input()` se ejecuta primero y su resultado entra directamente en `int()`. Si te resulta confuso, sepáralo en dos líneas; hace exactamente lo mismo:

```python
respuesta = input("¿Cuántos años tienes? ")
edad = int(respuesta)
```

Para decimales se usa `float()` en vez de `int()`:

```python
altura = float(input("¿Cuánto mides en metros? "))
print(f"Mides {altura * 100:.0f} centímetros")
```

> [!aviso] Cuidado con el ValueError
>
> Si la persona escribe `"treinta"` o deja el campo vacío, `int()` revienta con `ValueError` y el programa se corta. Es un comportamiento normal por ahora: en la lección de condiciones aprenderás a comprobar la entrada antes de convertirla, y en la de excepciones a capturar el error y volver a preguntar.

## Limpia siempre lo que llega

Las personas escriben espacios de más sin darse cuenta, y en un cambio de línea copiado y pegado pasa siempre. Acostúmbrate a encadenar `strip()`:

```python
ciudad = input("¿De qué ciudad eres? ").strip()
```

Y si vas a comparar la respuesta con algo, añade también `lower()`:

```python
respuesta = input("¿Quieres continuar? (s/n) ").strip().lower()
print(f"Has respondido: {respuesta}")
```

Así te da igual que escriban `"S"`, `" s "` o `"s"`.

## Un programa completo

Junta todo lo del módulo hasta ahora:

```python title="calculadora_imc.py"
print("=" * 40)
print("CALCULADORA DE ÍNDICE DE MASA CORPORAL".center(40))
print("=" * 40)

nombre = input("Nombre: ").strip().title()
peso = float(input("Peso en kilos: "))
altura = float(input("Altura en metros: "))

imc = peso / (altura ** 2)

print()
print(f"{'Persona:':<12}{nombre}")
print(f"{'Peso:':<12}{peso:.1f} kg")
print(f"{'Altura:':<12}{altura:.2f} m")
print(f"{'IMC:':<12}{imc:.1f}")
print("=" * 40)
```

```salida
========================================
 CALCULADORA DE ÍNDICE DE MASA CORPORAL
========================================
Nombre: erwin garcía
Peso en kilos: 74.5
Altura en metros: 1.78

Persona:    Erwin García
Peso:       74.5 kg
Altura:     1.78 m
IMC:        23.5
========================================
```

Con veinte líneas ya tienes una herramienta que funciona. Repasa el código y localiza cada cosa que has aprendido: variables, conversión de tipos, operadores, métodos de cadena y formato.

> [!nota] print() sin nada dentro
>
> `print()` a secas imprime una línea en blanco. Es la forma habitual de separar visualmente las secciones de la salida.

## Varios datos en una sola línea

Si quieres pedir varios valores de golpe, parte la respuesta con `split()`:

```python
entrada = input("Escribe tres números separados por espacios: ")
partes = entrada.split()
a = int(partes[0])
b = int(partes[1])
c = int(partes[2])
print(f"Suma: {a + b + c}")
```

```salida
Escribe tres números separados por espacios: 4 10 6
Suma: 20
```

Cuando veamos listas y bucles esto se podrá escribir en una sola línea elegante, pero de momento así se entiende mejor lo que ocurre.

> [!error] EOFError: EOF when reading a line
>
> Estás ejecutando el programa en un entorno que no permite escribir, como algunos ejecutores automáticos en la web o un editor mal configurado. Ejecútalo desde la terminal con `python fichero.py`.

> [!error] El programa se queda parado y no hace nada
>
> No está colgado: está esperando a que escribas y pulses <kbd>Intro</kbd>. Si quieres cortarlo, <kbd>Ctrl</kbd> + <kbd>C</kbd>.

> [!resumen] En resumen
>
> `input("mensaje")` muestra un texto, detiene el programa y devuelve lo que escriba la persona, **siempre como cadena**. Para operar con números hay que convertir con `int()` o `float()`. Limpia siempre la entrada con `.strip()`, y añade `.lower()` si vas a compararla.

> [!ejercicio] Practica
>
> Crea `06-entrada.py` y resuelve:
>
> 1. Pide el nombre y el año de nacimiento, y calcula e imprime la edad aproximada.
> 2. Pide dos números y muestra su suma, resta, producto y división con dos decimales.
> 3. Pide una frase y muestra cuántos caracteres tiene, cuántas palabras y cómo queda en mayúsculas.
> 4. Pide el precio de un producto y el porcentaje de descuento, y muestra el precio final con formato de euros.
> 5. Pide una temperatura en grados Celsius y conviértela a Fahrenheit, sabiendo que la fórmula es multiplicar por 9, dividir entre 5 y sumar 32.
> 6. Escribe un programa que pida tu nombre y lo muestre centrado dentro de un marco de asteriscos de 40 caracteres de ancho.
