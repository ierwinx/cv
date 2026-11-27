---
titulo: "Colores y estilos en la terminal"
resumen: "Los códigos de escape ANSI explicados por dentro, un módulo propio para usarlos y cuándo hay que renunciar al color."
minutos: 20
orden: 5
---

Un programa que escupe veinte líneas del mismo gris obliga a leerlas todas para encontrar la que importa. Con el error en rojo y los avisos en amarillo, la línea que importa salta a la vista sin leer nada. Es la diferencia entre una herramienta que se usa a gusto y una que cansa.

El color en la terminal no lo pone ninguna función de Python: se pide **metiendo unos caracteres especiales en el propio texto**. La terminal los intercepta, los interpreta como órdenes y no los dibuja. Entender ese mecanismo lleva diez minutos y evita tratarlo como magia.

> [!objetivo] Qué vas a aprender
>
> Entender la estructura de un código de escape ANSI, conocer los colores de texto y de fondo y los cinco estilos habituales, usar las paletas de 256 colores y de 24 bits, construir un módulo `colores.py` reutilizable y saber detectar cuándo no se debe colorear.

## Anatomía de un código de escape

Este es el código completo para escribir tres palabras en rojo:

```python
rojo = "\033[31mtexto en rojo\033[0m"
print(rojo)
```

Y esto es lo que hay realmente dentro de esa cadena:

```consola
>>> rojo = "\033[31mtexto en rojo\033[0m"
>>> rojo
'\x1b[31mtexto en rojo\x1b[0m'
>>> len(rojo)
22
>>> len("texto en rojo")
13
```

La cadena tiene 22 caracteres y solo 13 se ven en la pantalla. Los otros nueve son las dos órdenes, y se desglosan así:

| Trozo | Qué es |
| --- | --- |
| `\033` | El carácter de escape, el número 27 de la tabla ASCII. Es el que avisa a la terminal de que lo que viene no es texto |
| `[` | Abre la secuencia. Escape más corchete se llama *Control Sequence Introducer* |
| `31` | El parámetro. Aquí, "pon el texto en rojo" |
| `m` | Cierra la secuencia. La `m` significa que esto va de aspecto del texto |

`\033` es una forma de escribir el carácter 27 en octal, y verás las otras dos por ahí: `\x1b` en hexadecimal, que es la que usa Python al mostrar la cadena, y `\u001b`. Las tres son exactamente el mismo carácter:

```consola
>>> ord("\033")
27
>>> "\033" == "\x1b" == "\u001b"
True
```

## Por qué hay que cerrar con \\033\[0m

La terminal no colorea una cadena: **cambia de estado**. En cuanto recibe `\033[31m`, todo lo que salga a partir de ahí es rojo, incluida la salida de tu programa una hora después, y el prompt de la terminal cuando el programa termine. `\033[0m` es el código que devuelve todo a la normalidad.

```python
print("\033[31mesto sale en rojo")
print("y esto también, aunque no haya pedido nada")
print("\033[0mesto ya está normal")
```

Si ejecutas eso, las dos primeras líneas salen rojas. Es el error más común del principiante con colores y es fácil de reconocer: si tu prompt se queda de otro color después de ejecutar tu programa, te has dejado un `\033[0m` sin escribir. Se arregla ejecutando `reset` en la terminal.

> [!consejo] Cierra siempre en la misma cadena
>
> La costumbre es no dejar nunca el color abierto entre dos `print`: se abre y se cierra en la misma cadena. Por eso todas las funciones de color de esta lección devuelven el texto ya envuelto, con su apertura y su cierre. Así es imposible olvidarse.

## Los colores de texto

Ocho colores, con los números del 30 al 37, más ocho versiones brillantes del 90 al 97:

| Color | Normal | Brillante |
| --- | --- | --- |
| Negro | `\033[30m` | `\033[90m` |
| Rojo | `\033[31m` | `\033[91m` |
| Verde | `\033[32m` | `\033[92m` |
| Amarillo | `\033[33m` | `\033[93m` |
| Azul | `\033[34m` | `\033[94m` |
| Magenta | `\033[35m` | `\033[95m` |
| Cian | `\033[36m` | `\033[96m` |
| Blanco | `\033[37m` | `\033[97m` |

El tono exacto de cada uno lo decide **el tema de la terminal**, no tu programa. El "rojo" de quien use tu herramienta con un tema claro no será el mismo que el tuyo. Eso es bueno: respeta las preferencias de cada uno y garantiza que el texto se lea sobre su fondo.

## Los colores de fondo

Los mismos ocho, sumando 10 a cada número: del 40 al 47, y del 100 al 107 para los brillantes.

| Color | Fondo | Fondo brillante |
| --- | --- | --- |
| Negro | `\033[40m` | `\033[100m` |
| Rojo | `\033[41m` | `\033[101m` |
| Verde | `\033[42m` | `\033[102m` |
| Amarillo | `\033[43m` | `\033[103m` |
| Azul | `\033[44m` | `\033[104m` |
| Magenta | `\033[45m` | `\033[105m` |
| Cian | `\033[46m` | `\033[106m` |
| Blanco | `\033[47m` | `\033[107m` |

> [!aviso] El fondo, con cuentagotas
>
> Un fondo de color llama mucho la atención y cansa enseguida. Resérvalo para lo que de verdad es excepcional, como una línea de error grave, y no pongas nunca fondo sin poner también color de texto: si alguien usa un tema claro, tu texto negro sobre fondo negro no se leerá.

## Los estilos

Cinco que funcionan en casi cualquier terminal actual:

| Estilo | Código | Notas |
| --- | --- | --- |
| Negrita | `\033[1m` | En algunas terminales solo aclara el color |
| Tenue | `\033[2m` | Para lo secundario. No lo soportan todas |
| Cursiva | `\033[3m` | Bien soportada en macOS y Linux, irregular en Windows |
| Subrayado | `\033[4m` | Muy fiable |
| Invertido | `\033[7m` | Intercambia texto y fondo. El más fiable de todos |

El invertido merece un comentario: como intercambia los colores que ya usa la terminal, siempre se lee, con tema claro o oscuro. Es la forma más segura de destacar una línea entera.

## Combinar códigos

Los parámetros se pueden encadenar separados por punto y coma, o poner uno detrás de otro. Es lo mismo:

```python
print("\033[1;31mrojo y en negrita\033[0m")
print("\033[1m\033[31mrojo y en negrita\033[0m")
```

Un solo `\033[0m` al final cierra todo lo que se haya abierto, no hace falta uno por estilo.

## 256 colores y color real

Los ocho colores básicos se quedan cortos en cuanto quieres matices. Hay dos ampliaciones, y la estructura del código cambia:

```consola
>>> f"\033[38;5;208m"
'\x1b[38;5;208m'
>>> f"\033[38;2;255;128;0m"
'\x1b[38;2;255;128;0m'
```

| Forma | Código | Qué significa |
| --- | --- | --- |
| Paleta de 256 | `\033[38;5;Nm` | El color número N de una paleta fija, de 0 a 255 |
| Color de 24 bits | `\033[38;2;R;G;Bm` | El color exacto, con sus tres componentes de 0 a 255 |

El `38` significa "color de texto ampliado" y el `48` es su equivalente para el fondo: `\033[48;5;208m` pinta el fondo de naranja. El `5` o el `2` de después indican cuál de las dos formas viene detrás.

En la paleta de 256, los números del 0 al 15 son los dieciséis colores básicos, del 16 al 231 hay un cubo de tonos y del 232 al 255, una escala de grises. Este programa la pinta entera:

```python title="paleta.py"
for numero in range(256):
        print(f"\033[38;5;{numero}m{numero:>4}", end="")
    if numero % 16 == 15:
                print("\033[0m")
```

En pantalla salen dieciséis filas de dieciséis números, cada uno escrito de su color. Es la forma rápida de elegir un tono: lo miras y te quedas con el número.

> [!nota] El color de 24 bits no siempre está
>
> La paleta de 256 funciona en cualquier terminal de los últimos veinte años. El color de 24 bits necesita una terminal moderna, y cuando no lo soporta hace algo razonable: aproximar al más parecido de su paleta. Para un programa de terminal, los ocho colores básicos son la elección prudente, precisamente porque respetan el tema de quien lo usa.

## El módulo colores.py

Escribir `\033[31m` a mano por todo el programa es ilegible y frágil. Lo que se hace es meterlo en constantes, una vez, y no volver a mirarlo:

```python title="colores.py"
"""Colores y estilos ANSI para la terminal, sin bibliotecas externas."""

import os
import sys

RESET = "\033[0m"

NEGRO = "\033[30m"
ROJO = "\033[31m"
VERDE = "\033[32m"
AMARILLO = "\033[33m"
AZUL = "\033[34m"
MAGENTA = "\033[35m"
CIAN = "\033[36m"
BLANCO = "\033[37m"

FONDO_ROJO = "\033[41m"
FONDO_VERDE = "\033[42m"
FONDO_AMARILLO = "\033[43m"
FONDO_AZUL = "\033[44m"

NEGRITA = "\033[1m"
TENUE = "\033[2m"
CURSIVA = "\033[3m"
SUBRAYADO = "\033[4m"
INVERTIDO = "\033[7m"


def hay_color() -> bool:
        """Decide si tiene sentido escribir códigos de color."""
    if os.environ.get("NO_COLOR"):
                return False
    if os.environ.get("TERM") == "dumb":
                return False
    return sys.stdout.isatty()


COLOR_ACTIVO = hay_color()


def pintar(texto: str, *codigos: str) -> str:
        """Devuelve el texto envuelto en los códigos dados, o tal cual sin color."""
    if not COLOR_ACTIVO or not codigos:
                return texto
    return "".join(codigos) + texto + RESET


def color_256(numero: int) -> str:
        """Código de texto para uno de los 256 colores de la paleta."""
    return f"\033[38;5;{numero}m"


def color_rgb(rojo: int, verde: int, azul: int) -> str:
        """Código de texto para un color exacto de 24 bits."""
    return f"\033[38;2;{rojo};{verde};{azul}m"
```

La función `pintar` recibe el texto y **cuántos códigos quieras**, gracias al `*codigos` de la lección de argumentos variables:

```python
from colores import pintar, ROJO, VERDE, NEGRITA, SUBRAYADO, color_256

print(pintar("todo bien", VERDE))
print(pintar("fallo grave", ROJO, NEGRITA))
print(pintar("importante", SUBRAYADO))
print(pintar("naranja", color_256(208)))
```

Esa salida no se puede reproducir aquí: en la pantalla se ven cuatro líneas, la primera en verde, la segunda en rojo y negrita, la tercera subrayada y la cuarta naranja. El texto es exactamente el mismo que ves escrito; lo único que cambia es su aspecto.

## Cuándo no hay que colorear

Aquí está la parte que casi todo el mundo se salta, y es la que separa un programa amateur de uno serio. Los códigos de color son caracteres normales, así que **si la salida no va a una terminal, se guardan en el fichero y lo ensucian**. Esto es lo que aparecería dentro de un fichero al redirigir la salida de un programa que colorea sin comprobar nada:

```text
^[[32m[OK]    Copiados 24 ficheros^[[0m
```

Ese `^[` es el carácter de escape visto por un editor de texto. Nadie quiere eso en un registro de actividad ni en un CSV.

La comprobación clave es `sys.stdout.isatty()`, que responde a la pregunta "¿mi salida es una terminal de verdad?". Devuelve `False` cuando el programa se ha lanzado con `>` a un fichero o con `|` hacia otro programa. Además de eso, hay dos convenciones que conviene respetar:

| Comprobación | Por qué |
| --- | --- |
| `sys.stdout.isatty()` | Si no hay terminal, nadie va a ver los colores y solo estorban |
| La variable `NO_COLOR` | Convención aceptada por muchas herramientas: si existe, no se colorea |
| `TERM` con valor `dumb` | Terminal sin capacidades, típica de algunos editores y entornos de integración continua |

Con las tres metidas en `hay_color()`, el mismo programa se comporta bien en los dos casos. Este es el ejemplo de mensajes de estado:

```python title="estado.py"
"""Mensajes de estado en verde, amarillo y rojo."""

import sys

from colores import pintar, ROJO, VERDE, AMARILLO, NEGRITA, COLOR_ACTIVO


def exito(mensaje: str) -> None:
        print(pintar(f"[OK]    {mensaje}", VERDE))


def aviso(mensaje: str) -> None:
        print(pintar(f"[AVISO] {mensaje}", AMARILLO))


def error(mensaje: str) -> None:
        print(pintar(f"[ERROR] {mensaje}", ROJO, NEGRITA), file=sys.stderr)


if __name__ == "__main__":
        print(f"¿Color activo? {COLOR_ACTIVO}")
    exito("Copiados 24 ficheros")
    aviso("El fichero de configuración está vacío")
    error("No existe la carpeta destino")
```

Ejecutado en una terminal, las tres líneas salen de su color. Ejecutado con la salida redirigida, `isatty()` devuelve `False` y el fichero queda limpio:

```bash
python3 estado.py > registro.txt
cat registro.txt
```

```salida
¿Color activo? False
[OK]    Copiados 24 ficheros
[AVISO] El fichero de configuración está vacío
```

La línea del error no está en el fichero porque salió por `stderr`, que no se ha redirigido: apareció en la pantalla, que es justo donde hace falta.

Lo mismo ocurre con la variable de entorno, sin tocar ni una línea del programa:

```bash
NO_COLOR=1 python3 estado.py
```

Y ahí está la razón de fondo para que todo el color pase por `pintar`: la decisión de colorear o no se toma **en un solo sitio**. Con los códigos repartidos por el programa habría que añadir un `if` en cada `print`.

> [!consejo] El prefijo de texto, además del color
>
> Fíjate en que los mensajes llevan `[OK]`, `[AVISO]` y `[ERROR]` escritos, no solo el color. Es deliberado: así siguen siendo comprensibles sin color, en un fichero de registro, y para quien no distinga el rojo del verde, que es aproximadamente uno de cada doce hombres. **El color informa, pero no debe ser la única fuente de información.**

## Windows

Desde Windows 10, la terminal entiende los códigos ANSI igual que macOS y Linux, y todo lo de esta lección funciona tal cual. En las versiones antiguas, y en algunas consolas empotradas, los códigos aparecían escritos en la pantalla en vez de interpretarse.

La solución habitual, si necesitas dar soporte a eso, es la biblioteca `colorama`, que se instala con `pip` y traduce los códigos a llamadas de la API de Windows:

```python
import colorama

colorama.just_fix_windows_console()
```

Esa línea al principio del programa no hace nada en macOS ni en Linux, y arregla las consolas antiguas de Windows. Es la única dependencia externa que merece la pena considerar para esto; el resto de la lección no necesita instalar nada.

> [!aviso] El color rompe la alineación de las columnas
>
> Este es el problema que te vas a encontrar en la lección siguiente. Los códigos de escape ocupan caracteres pero no columnas, así que los anchos de las f-strings cuentan mal:
>
> ```consola
> >>> coloreado = "\033[31m" + "error" + "\033[0m"
> >>> len("error")
> 5
> >>> len(coloreado)
> 14
> >>> f"|{coloreado:<10}|"
> '|\x1b[31merror\x1b[0m|'
> ```
>
> El ancho de 10 no ha rellenado nada, porque para Python la cadena ya mide 14. La regla práctica: **alinea primero y colorea después**, nunca al revés.

> [!error] Mi prompt se ha quedado de color después de ejecutar el programa
>
> Te falta un `\033[0m`. Ocurre sobre todo cuando el programa termina por una excepción entre la apertura y el cierre del color. Para arreglarlo ahora, escribe `reset` en la terminal. Para que no vuelva a pasar, envuelve el texto de una vez con `pintar`, y en los programas que cambian de color a lo largo del tiempo, pon el cierre en un `finally`.

> [!error] En el fichero de salida aparecen caracteres raros como ^\[\[32m
>
> Estás coloreando sin comprobar el destino. Ese es el código de escape tal cual, guardado en el fichero. Mete la comprobación de `sys.stdout.isatty()` en tu función de color y desaparecerá.

> [!resumen] En resumen
>
> El color se pide insertando códigos de escape en el propio texto: `\033[`, uno o varios números separados por punto y coma, y una `m` final. Los colores de texto van del 30 al 37, los de fondo del 40 al 47, los brillantes suman 60, y los estilos útiles son negrita, tenue, cursiva, subrayado e invertido. Hay dos ampliaciones, `\033[38;5;Nm` para la paleta de 256 y `\033[38;2;R;G;Bm` para el color exacto. Todo lo que se abre hay que cerrarlo con `\033[0m`, porque la terminal cambia de estado y no colorea cadenas. Lo sensato es encerrar todo eso en un módulo con constantes y una función `pintar`, que además concentra en un solo punto la decisión de no colorear: cuando `sys.stdout.isatty()` es falso, cuando existe la variable `NO_COLOR` o cuando `TERM` vale `dumb`. Y el color nunca debe ser la única fuente de información, porque los códigos no se ven en un fichero y no todo el mundo los distingue.

> [!ejercicio] Practica
>
> Crea el módulo `colores.py` de la lección y un fichero `05-colores.py` para probarlo:
>
> 1. Escribe un programa que imprima una muestra de los ocho colores de texto, los ocho brillantes y los ocho de fondo, cada uno con su código escrito al lado. Guárdalo: lo usarás como chuleta.
> 2. Añade a `colores.py` una función `fondo_256(numero)` y otra `fondo_rgb(rojo, verde, azul)`, siguiendo el patrón de las de texto con el `48` en vez del `38`.
> 3. Escribe una función `degradado(texto)` que imprima el texto con un color de 24 bits que vaya cambiando letra a letra, del rojo al azul.
> 4. Añade a `colores.py` una función `sin_color(texto)` que quite todos los códigos de escape de una cadena. Necesitarás expresiones regulares o un recorrido a mano buscando la `m` que cierra cada secuencia.
> 5. Coge el `agenda.py` de la lección anterior y colorea su menú: el título en negrita, las teclas en cian y los mensajes de error en rojo. Comprueba que `python3 agenda.py > salida.txt` deja el fichero limpio de códigos.
> 6. Escribe un programa que imprima diez líneas de registro con niveles mezclados (`INFO`, `AVISO`, `ERROR`) y compruébalo tres veces: en la terminal, con `NO_COLOR=1` delante y con la salida redirigida a un fichero.
