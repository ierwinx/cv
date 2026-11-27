---
titulo: "Spinners y barras de progreso"
resumen: "Cómo decirle a quien espera que el programa sigue vivo: spinners, porcentajes, tiempo transcurrido y estimación de lo que falta."
minutos: 19
orden: 7
---

Un programa que tarda treinta segundos sin escribir nada es indistinguible de un programa colgado. Quien lo está usando no sabe si esperar o matarlo con <kbd>Ctrl</kbd> + <kbd>C</kbd>, y en la duda lo mata. Eso no es un problema estético: es un programa que no se puede usar.

La solución cuesta muy poco. Con el `\r` y el `flush` de la lección de salida en pantalla ya tienes todo lo necesario para escribir en una sola línea que se va actualizando, y con eso se hacen tanto un spinner que gira como una barra con su porcentaje y su tiempo restante.

> [!objetivo] Qué vas a aprender
>
> Escribir un spinner con `\r` y `flush`, construir una barra de progreso con porcentaje, contador y tiempo transcurrido, estimar el tiempo que falta, ocultar y restaurar el cursor con códigos ANSI, y no dibujar nada de esto cuando la salida no es una terminal.

## El spinner

Un spinner son cuatro caracteres que se van sustituyendo en el mismo sitio. Estos son los cuatro clásicos:

```python
for marco in "|/-\\":
        print(f"{marco} Procesando...")
```

```salida
| Procesando...
/ Procesando...
- Procesando...
\ Procesando...
```

Ese `"|/-\\"` lleva la barra invertida duplicada porque, como ya sabes de la lección de cadenas, una sola empezaría una secuencia de escape.

Puestos uno encima de otro en vez de uno debajo de otro, esos cuatro fotogramas parecen una línea que gira. Y para poner uno encima de otro solo hace falta `\r`, no bajar de línea y vaciar el búfer en cada vuelta:

```python
import itertools
import time

for marco in itertools.cycle("|/-\\"):
        print(f"\r{marco} Procesando...", end="", flush=True)
    time.sleep(0.1)
```

`itertools.cycle` da vueltas a la cadena para siempre, así que ese bucle no termina nunca; dentro de un momento le pondremos una condición de salida. En la pantalla se ve una sola línea, `| Procesando...`, con el primer carácter girando diez veces por segundo.

También hay juegos de fotogramas más finos, como los puntos braille, que son diez y dan una sensación de giro mucho más suave:

```python
print(" ".join("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"))
```

```salida
⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
```

Son caracteres Unicode normales, uno solo cada uno, así que no descuadran nada. Necesitan una tipografía que los tenga, que es lo habitual en las terminales de hoy.

> [!consejo] Entre 8 y 12 fotogramas por segundo
>
> Con menos, el spinner parece que va a tirones. Con más, no se distingue del ruido y se gasta más tiempo imprimiendo que trabajando. Una pausa de `0.08` o `0.1` segundos entre fotogramas es el punto razonable.

## Una barra de progreso, pieza a pieza

El spinner dice "estoy vivo". La barra dice además "voy por aquí y me queda esto", y para eso hace falta saber el total. Son cuatro cálculos:

```python
actual = 7
total = 40
ancho = 30

fraccion = actual / total
llenos = round(ancho * fraccion)
dibujo = "█" * llenos + "░" * (ancho - llenos)
print(f"[{dibujo}] {fraccion:6.1%}  {actual}/{total}")
```

```salida
[█████░░░░░░░░░░░░░░░░░░░░░░░░░]  17.5%  7/40
```

- **La fracción** es una simple división, y el formato `%` de las f-strings la convierte en porcentaje sin tener que multiplicar por cien.
- **Los bloques llenos** salen de multiplicar el ancho por la fracción, redondeando. Con `int()` en vez de `round()` la barra iría siempre un poco por detrás.
- **Los vacíos son el resto**, `ancho - llenos`, y así la barra mide siempre lo mismo, que es imprescindible para que no baile al reescribirse.
- **El `6.1%`** reserva seis columnas para el porcentaje. Sin ese ancho, la línea se movería al pasar de `9.9%` a `10.0%`.

Los caracteres `█` y `░` son los de dibujo de la lección anterior. Si tu terminal no los tiene, `#` y `-` hacen el mismo papel.

## El tiempo transcurrido y el que falta

Para el tiempo hay que apuntar cuándo se empezó y restar. La función que lo mide es `time.monotonic`, y no `time.time`:

```python
import time

inicio = time.monotonic()
# ... trabajo ...
transcurrido = time.monotonic() - inicio
```

La diferencia importa. `time.time` devuelve la hora del reloj del sistema, que puede cambiar de golpe si el ordenador se sincroniza por red o cambia la hora, y entonces tu barra diría que lleva menos veinte segundos. `time.monotonic` es un contador que solo avanza, y sirve exactamente para esto: medir intervalos.

Los segundos se presentan en minutos y segundos con una función de dos líneas:

```python
def reloj(segundos: float) -> str:
        """Formatea unos segundos como mm:ss."""
    minutos, restantes = divmod(int(segundos), 60)
    return f"{minutos:02d}:{restantes:02d}"
```

```python
print(reloj(0), reloj(9.7), reloj(65), reloj(3600))
```

```salida
00:00 00:09 01:05 60:00
```

`divmod` devuelve de una vez el cociente y el resto, que es justo lo que hace falta. El `02d` es el relleno con ceros de la lección de f-strings.

La estimación de lo que queda es una regla de tres: si en el tiempo transcurrido se ha hecho una fracción del trabajo, el total llevará `transcurrido / fraccion`, y lo que falta es eso menos lo ya gastado:

```python
restante = transcurrido / fraccion - transcurrido
```

> [!aviso] La estimación es una mentira útil
>
> Esa fórmula supone que lo que queda va a tardar lo mismo por unidad que lo que ya se ha hecho, y casi nunca es verdad: los ficheros no pesan lo mismo, la red va y viene. Por eso las estimaciones dan esos saltos absurdos que todos hemos visto. Sirve para hacerse una idea, no para planificar la tarde. Y ojo con dividir: si `actual` es cero, la fracción es cero y la división explota con un `ZeroDivisionError`, así que hay que tratar ese caso aparte.

## Ocultar el cursor

Mientras la barra se redibuja, el cursor de la terminal se queda al final de la línea parpadeando, y con un spinner delante llama bastante la atención. Dos códigos ANSI de los de la lección anterior lo arreglan:

| Código | Qué hace |
| --- | --- |
| `\033[?25l` | Oculta el cursor |
| `\033[?25h` | Lo vuelve a mostrar |
| `\033[2K` | Borra la línea entera, sin mover el cursor |

Ese `\033[2K` es la forma limpia de resolver el problema de los restos que dejaba `\r`: en vez de rellenar con espacios a mano, se borra la línea y se escribe encima.

> [!aviso] Restaura el cursor siempre, pase lo que pase
>
> Si tu programa oculta el cursor y muere por una excepción o por un <kbd>Ctrl</kbd> + <kbd>C</kbd>, el cursor **se queda oculto en la terminal** después de que el programa haya terminado, y quien la esté usando tendrá que escribir `reset` para recuperarlo. Es exactamente el mismo problema que el color sin cerrar. La solución es la misma: el código de restauración va en un `finally`, que se ejecuta siempre, como viste en la lección de manejar errores.

## El módulo progreso.py

Con todo eso, el módulo reutilizable:

```python title="progreso.py"
"""Spinners y barras de progreso con la biblioteca estándar."""

import itertools
import shutil
import sys
import time

LLENO = "█"
VACIO = "░"
GIROS = "|/-\\"
BRAILLE = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
OCULTAR_CURSOR = "\033[?25l"
MOSTRAR_CURSOR = "\033[?25h"
BORRAR_LINEA = "\r\033[2K"


def es_terminal() -> bool:
        """True si la salida es una terminal y no un fichero o una tubería."""
    return sys.stdout.isatty()


def reloj(segundos: float) -> str:
        """Formatea unos segundos como mm:ss."""
    minutos, restantes = divmod(int(segundos), 60)
    return f"{minutos:02d}:{restantes:02d}"


def formato_barra(actual: int, total: int, transcurrido: float, ancho: int = 30) -> str:
        """Construye la línea de la barra: bloques, porcentaje, contador y tiempos."""
    fraccion = actual / total if total else 1.0
    llenos = round(ancho * fraccion)
    dibujo = LLENO * llenos + VACIO * (ancho - llenos)
    cifras = f"{actual:>{len(str(total))}}/{total}"
    if actual and fraccion < 1:
                restante = transcurrido / fraccion - transcurrido
        tiempos = f"{reloj(transcurrido)} < {reloj(restante)}"
    else:
                tiempos = reloj(transcurrido)
    return f"[{dibujo}] {fraccion:6.1%}  {cifras}  {tiempos}"


def ancho_disponible(reservado: int = 28) -> int:
        """Columnas que le quedan a los bloques después del texto de la derecha."""
    return max(10, shutil.get_terminal_size().columns - reservado)


def barra(actual: int, total: int, inicio: float | None = None, ancho: int | None = None) -> None:
        """Redibuja la barra en la línea actual. Al llegar al total, salta de línea."""
    if not es_terminal():
                return
    if ancho is None:
                ancho = ancho_disponible()
    transcurrido = time.monotonic() - inicio if inicio else 0.0
    linea = formato_barra(actual, total, transcurrido, ancho)
    print(f"{BORRAR_LINEA}{linea}", end="", flush=True)
    if actual >= total:
                print()


def girar(mensaje: str, segundos: float, marcos: str = BRAILLE) -> None:
        """Enseña un spinner con el mensaje durante los segundos indicados."""
    if not es_terminal():
                print(mensaje)
        time.sleep(segundos)
        return
    final = time.monotonic() + segundos
    print(OCULTAR_CURSOR, end="")
    try:
                for marco in itertools.cycle(marcos):
                        if time.monotonic() >= final:
                                break
            print(f"\r{marco} {mensaje}", end="", flush=True)
            time.sleep(0.08)
    finally:
                print(f"{BORRAR_LINEA}{MOSTRAR_CURSOR}", end="", flush=True)
```

La separación entre `formato_barra` y `barra` no es un adorno. La primera **construye una cadena y no imprime nada**, así que se puede comprobar fotograma a fotograma sin montar ninguna animación:

```python
from progreso import formato_barra

for actual, transcurrido in [(0, 0.0), (1, 0.4), (7, 2.8), (25, 10.0), (40, 16.0)]:
        print(formato_barra(actual, 40, transcurrido))
```

```salida
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0.0%   0/40  00:00
[█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   2.5%   1/40  00:00 < 00:15
[█████░░░░░░░░░░░░░░░░░░░░░░░░░]  17.5%   7/40  00:02 < 00:13
[███████████████████░░░░░░░░░░░]  62.5%  25/40  00:10 < 00:06
[██████████████████████████████] 100.0%  40/40  00:16
```

**En la terminal esos cinco fotogramas no son cinco líneas: son la misma línea, cambiando.** Aquí se ven apilados porque es la única forma de imprimirlos en una página.

Fíjate en los dos extremos. En el primero no hay estimación, porque con cero unidades hechas no hay nada de lo que deducirla, y es también el caso que evita la división por cero. En el último tampoco, porque ya no queda nada: solo el tiempo total que ha costado.

El contador `{actual:>{len(str(total))}}/{total}` merece una mirada: reserva para el número actual tantas columnas como dígitos tenga el total, así que ni la barra ni el porcentaje se mueven al pasar de 9 a 10. Con un total de mil se ve mejor:

```python
for actual, transcurrido in [(3, 1.0), (150, 50.0), (1000, 333.3)]:
        print(formato_barra(actual, 1000, transcurrido, ancho=20))
```

```salida
[░░░░░░░░░░░░░░░░░░░░]   0.3%     3/1000  00:01 < 05:32
[███░░░░░░░░░░░░░░░░░]  15.0%   150/1000  00:50 < 04:43
[████████████████████] 100.0%  1000/1000  05:33
```

## Usarlo en un trabajo de verdad

Así se ve en un programa que procesa cuarenta ficheros:

```python title="copiar.py"
"""Uso de progreso.py en un trabajo largo de verdad."""

import time

from progreso import barra, girar

ficheros = [f"informe-{numero:03d}.csv" for numero in range(1, 41)]

girar("Buscando ficheros", 1.5)
print(f"Encontrados {len(ficheros)} ficheros.")

inicio = time.monotonic()
for numero, fichero in enumerate(ficheros, start=1):
        time.sleep(0.05)  # aquí iría el trabajo de verdad
    barra(numero, len(ficheros), inicio)

print("Terminado.")
```

Durante el primer segundo y medio gira el spinner. Después, la barra avanza en una sola línea hasta llenarse, y al completarse salta de línea ella sola para que el `Terminado.` no la pise. Este es el aspecto de la pantalla en un momento cualquiera de la segunda fase, con una ventana de 80 columnas:

```salida
Encontrados 40 ficheros.
[██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  35.0%  14/40  00:00 < 00:01
```

La barra mide 52 bloques y no 30, porque `ancho_disponible` ha restado del ancho de la ventana lo que ocupan el porcentaje, el contador y los tiempos. En una ventana más estrecha se dibujaría más corta, sin descuadrarse.

Dos detalles de la llamada en el bucle:

- **`enumerate(ficheros, start=1)`** da el número de fichero empezando por uno. Con el `start` por defecto, la barra acabaría en 39 de 40.
- **La barra se dibuja después del trabajo**, no antes. Así el `1/40` significa "uno hecho" y no "empezando el primero", que es lo que se espera cuando llega al `40/40`.

## Nada de esto sirve si no hay terminal

Es la misma historia que con el color, y por eso `barra` y `girar` empiezan preguntando por `es_terminal()`. Una barra de progreso redirigida a un fichero deja algo así dentro:

```text
\r\033[2K[█░░░...]   2.5%   1/40\r\033[2K[███░░░...]   5.0%   2/40
```

Cuarenta fotogramas de basura, uno detrás de otro, porque `\r` no borra nada en un fichero: solo es un carácter más. Lo mismo ocurre en los registros de un servidor o de un sistema de integración continua, que es donde más molesta.

Con la comprobación puesta, el mismo programa sin terminal escribe lo justo:

```bash
python3 copiar.py > registro.txt
cat registro.txt
```

```salida
Buscando ficheros
Encontrados 40 ficheros.
Terminado.
```

El spinner se ha convertido en una línea de texto y la barra ha desaparecido por completo, que es exactamente lo que quiere quien lea ese fichero.

> [!consejo] Y además, mándalo a stderr
>
> En un programa cuya salida útil se pueda encadenar con una tubería, la barra debería ir a `sys.stderr` incluso cuando hay terminal, para no mezclarse con el resultado. Es un `file=sys.stderr` en los dos `print`, y la comprobación pasa entonces a ser `sys.stderr.isatty()`.

> [!error] ZeroDivisionError: float division by zero
>
> Has calculado la estimación con `actual` a cero, o el total es cero. El `if actual and fraccion < 1` de `formato_barra` cubre los dos casos, y el `if total else 1.0` evita el segundo al calcular la fracción. Si escribes tu propia versión, acuérdate de que la primera llamada siempre llega con el contador a cero.

> [!error] La barra deja un rastro de líneas en vez de actualizarse
>
> Te falta el `\r`, o te falta el `flush=True`, o has usado `print` sin `end=""` y cada fotograma baja de línea. Los tres tienen que estar. Si el rastro aparece solo al ejecutar el programa desde tu editor, es que su panel de salida no es una terminal de verdad: pruébalo en una.

> [!error] El cursor ha desaparecido de mi terminal
>
> Tu programa ocultó el cursor y terminó sin restaurarlo. Escribe `reset` en la terminal para recuperarlo, y pon la restauración en un `finally`.

> [!resumen] En resumen
>
> Un programa que tarda tiene que decir que está vivo, y con `\r`, `end=""` y `flush=True` se escribe una línea que se actualiza en el sitio. Un spinner es un ciclo de fotogramas, `|/-\` o los puntos braille, reescritos ocho o diez veces por segundo con `itertools.cycle`. Una barra es aritmética: la fracción entre lo hecho y el total, redondeada al ancho en bloques, con el porcentaje en un campo de ancho fijo para que no baile, el contador alineado a los dígitos del total y los tiempos medidos con `time.monotonic`, que no da saltos. El tiempo restante es una regla de tres que hay que proteger de la división por cero y que conviene no tomarse muy en serio. El cursor se oculta con `\033[?25l` y se restaura con `\033[?25h`, y esa restauración va en un `finally` o dejarás la terminal tocada. Y todo ello solo si `sys.stdout.isatty()`: sin terminal, una barra de progreso solo llena de basura el fichero de registro.

> [!ejercicio] Practica
>
> Crea el módulo `progreso.py` de la lección y un fichero `07-progreso.py` que lo use:
>
> 1. Añade a `barra` un parámetro `etiqueta` que escriba un texto corto delante de los bloques, y recorta el ancho de la barra para que la línea siga cabiendo en la terminal.
> 2. Escribe una función `barra_indeterminada()` que dibuje un bloque de cinco caracteres rebotando de un lado a otro dentro de un marco fijo, para los trabajos en los que no se sabe el total.
> 3. Añade un juego de fotogramas propio a `progreso.py`, por ejemplo con los caracteres `◐◓◑◒`, y prueba cuál te resulta más agradable a distintas velocidades.
> 4. Mide con `time.monotonic` cuánto cuesta dibujar diez mil fotogramas de barra y calcula cuánto tiempo del total de un trabajo se iría en pintar. Después añade a `barra` una condición que solo redibuje si ha cambiado el porcentaje entero.
> 5. Combina esta lección con la de colores: pinta la barra de verde cuando pase del 80 %, de amarillo entre el 40 y el 80 y de rojo por debajo. Recuerda colorear después de alinear.
> 6. Coge un programa tuyo que recorra muchos ficheros con `pathlib` y añádele la barra. Compruébalo en la terminal y con la salida redirigida a un fichero.
