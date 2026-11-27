---
titulo: "Controlar la salida en pantalla"
resumen: "Los parámetros de print que casi nadie usa, escribir sin salto de línea, reescribir la línea actual, limpiar la pantalla y medir su ancho."
minutos: 16
orden: 2
---

Llevas dos módulos usando `print` para una sola cosa: escribir una línea y bajar a la siguiente. Con eso se puede hacer un programa que funcione, pero no uno que se vea bien. Un programa de terminal decente escribe en el sitio exacto, no baja de línea cuando no le toca y sabe cuánto espacio tiene.

Todo eso está en `print` y en un par de módulos de la biblioteca estándar. No hace falta instalar nada.

> [!objetivo] Qué vas a aprender
>
> Dominar los parámetros `sep`, `end` y `flush` de `print`, construir una línea por partes, reescribir la línea actual con el retorno de carro, limpiar la pantalla de forma portable, escribir directamente en `sys.stdout` y `sys.stderr`, y adaptar la salida al ancho real de la terminal.

## print acepta varios valores

Cuando le pasas más de un valor separados por comas, `print` los imprime todos con un espacio entre medias y convierte cada uno a texto por su cuenta. No hace falta `str()` ni sumar cadenas:

```python
edad = 34
print("Tienes", edad, "años")
```

```salida
Tienes 34 años
```

Ese espacio de separación no es obligatorio: es el valor por defecto de un parámetro llamado `sep`.

## sep: qué se pone entre los valores

```python
print("uno", "dos", "tres")
print("uno", "dos", "tres", sep="")
print("uno", "dos", "tres", sep=" | ")
print("2026", "09", "19", sep="-")
print("ruta", "a", "un", "sitio", sep="/")
```

```salida
uno dos tres
unodostres
uno | dos | tres
2026-09-19
ruta/a/un/sitio
```

Combinado con el desempaquetado que viste en la lección de argumentos variables, `sep` sirve para imprimir una lista entera en una línea:

```python
partes = ["rojo", "verde", "azul"]
print(*partes, sep=", ")
```

```salida
rojo, verde, azul
```

> [!consejo] sep o join
>
> `print(*lista, sep=", ")` y `print(", ".join(lista))` dan el mismo resultado, con una diferencia: `join` exige que todos los elementos sean cadenas y `print` convierte lo que le echen. Con una lista de números, `join` falla y `sep` no.

## end: qué se pone al final

El salto de línea del final tampoco es obligatorio. `print` termina con `"\n"` porque ese es el valor por defecto de `end`. Si lo cambias por una cadena vacía, el cursor se queda donde está y el siguiente `print` continúa en la misma línea:

```python
print("Cargando", end="")
print(".", end="")
print(".", end="")
print(".", end="")
print(" listo")
```

```salida
Cargando... listo
```

Cinco llamadas a `print` y una sola línea de salida. Esto es lo que permite construir una línea por trozos, según se van calculando, que es justo lo que hace falta cuando el programa procesa cosas dentro de un bucle:

```python
for numero in range(1, 6):
        print(numero, end=" ")
print()
```

```salida
1 2 3 4 5 
```

Fíjate en el `print()` vacío del final. Es imprescindible: sin él, el cursor se queda colgado al final de la línea y el prompt de la terminal aparecerá pegado a tus números. **Cada vez que uses `end=""` en un bucle, acuérdate de cerrar la línea al salir.**

Y `end` puede ser cualquier cosa, no solo la cadena vacía:

```python
print("primera", end="\n\n")
print("segunda")
```

```salida
primera

segunda
```

## flush: por qué a veces no se ve nada

Escribir en la pantalla es lento, así que Python no manda los caracteres uno a uno: los acumula en una memoria intermedia, el **búfer**, y los suelta de golpe cuando hay un salto de línea o cuando el programa termina.

Mientras cada `print` acabe en `\n`, no lo notas. En cuanto usas `end=""`, sí:

```python
import time

for i in range(1, 4):
        print(f"paso {i}", end=" ")
    time.sleep(0.2)
print("fin")
```

Sin `flush`, en muchas terminales verás la pantalla vacía durante seis décimas y luego todo de golpe. El programa está trabajando, pero parece colgado. La solución es pedir explícitamente que se vacíe el búfer:

```python
import time

for i in range(1, 4):
        print(f"paso {i}", end=" ", flush=True)
    time.sleep(0.2)
print("fin")
```

```salida
paso 1 paso 2 paso 3 fin
```

La salida final es idéntica; lo que cambia es **cuándo** aparece cada trozo. Con `flush=True` los pasos se ven salir uno a uno.

> [!aviso] La regla práctica
>
> Siempre que imprimas con `end=""` algo que quieras ver *en ese momento*, pon `flush=True`. Es la diferencia entre una barra de progreso que avanza y una barra de progreso que aparece entera cuando ya no sirve de nada.

El búfer también explica una rareza que verás en cuanto redirijas la salida de un programa a un fichero. Con este programa:

```python title="orden.py"
import sys

print("línea a stdout")
print("línea a stderr", file=sys.stderr)
print("otra a stdout")
print("otra a stderr", file=sys.stderr)
```

```bash
python3 orden.py 2>&1 | cat
```

```salida
línea a stderr
otra a stderr
línea a stdout
otra a stdout
```

El orden está del revés. La razón es que, cuando la salida no va a una terminal, Python acumula lo de `stdout` en bloques grandes, mientras que `stderr` sale siempre de inmediato. En la terminal se ven en orden; en un fichero, no.

## Reescribir la línea con \\r

El carácter `\r`, el **retorno de carro**, no baja de línea: devuelve el cursor al principio de la línea actual. Lo que imprimas después pisa lo que había.

```python
import time

for restantes in range(3, 0, -1):
        print(f"\rEmpieza en {restantes}...", end="", flush=True)
    time.sleep(1)
print("\rYa            ")
```

En la terminal no se ven tres líneas, se ve **una sola línea que cambia**: primero `Empieza en 3...`, luego el 3 se convierte en 2, luego en 1. Lo que Python manda a la salida es exactamente esto:

```text
\rEmpieza en 3...\rEmpieza en 2...\rEmpieza en 1...\rYa            \n
```

Es la base de los contadores, los spinners y las barras de progreso de la última lección del bloque.

> [!aviso] Lo que no se pisa, se queda
>
> `\r` mueve el cursor, no borra nada. Si escribes `Descargando 120 ficheros` y luego `\rListo`, en la pantalla queda `Listorgando 120 ficheros`: las cinco letras nuevas han tapado las cinco primeras y el resto sigue ahí.
>
> Hay dos soluciones. La casera es rellenar con espacios hasta el ancho de lo anterior: `print("\rListo" + " " * 20, end="")`. La fina es borrar la línea con un código de escape, `\033[2K`, que verás en la lección de colores.

## Limpiar la pantalla

Un menú que se redibuja necesita empezar con la pantalla limpia. No hay una función de Python para esto, porque el comando depende del sistema, así que se envuelve en una función propia:

```python
import os


def limpiar_pantalla() -> None:
        """Borra la pantalla en Windows, macOS y Linux."""
    os.system("cls" if os.name == "nt" else "clear")
```

`os.name` vale `"nt"` en Windows y `"posix"` en macOS y Linux:

```python
import os

print(os.name)
```

```salida
posix
```

`os.system` arranca otro programa, y eso es lento y no funciona si la salida está redirigida. La alternativa es mandar el código de escape que significa "borra la pantalla y pon el cursor arriba a la izquierda":

```python
def limpiar_pantalla() -> None:
        print("\033[2J\033[H", end="")
```

Funciona en cualquier terminal moderna, incluida la de Windows 10 en adelante, y no arranca ningún proceso. Los detalles de esos códigos son el tema de la lección de colores.

## Escribir directamente en stdout y stderr

`print` es una comodidad construida encima de algo más básico: `sys.stdout`, el fichero de la salida estándar. Escribir ahí directamente tiene dos diferencias importantes:

```python
import sys

print("stdout normal")
sys.stdout.write("escrito con write\n")
sys.stdout.write("sin salto")
sys.stdout.write(" y sigue\n")
cuantos = sys.stdout.write("cuenta\n")
print(cuantos)
```

```salida
stdout normal
escrito con write
sin salto y sigue
cuenta
7
```

La primera diferencia es que `write` **no añade nada**: ni separadores ni salto de línea, tienes que ponerlos tú. La segunda es que devuelve el número de caracteres escritos, siete en ese último caso contando el `\n`.

Todo programa tiene además una segunda salida, `sys.stderr`, pensada para los mensajes que no son el resultado del trabajo: avisos, errores y diagnósticos. Se escribe igual, o con el parámetro `file` de `print`:

```python
import sys

sys.stderr.write("esto va a error\n")
print("y esto también", file=sys.stderr)
```

```salida
esto va a error
y esto también
```

En la terminal se ven juntas, así que la distinción parece inútil. No lo es: quien use tu programa con `>` para guardar el resultado en un fichero se llevará solo `stdout`, y los avisos seguirán apareciendo en su pantalla, que es exactamente lo que quiere. Los códigos de salida y la redirección tienen su lección en este módulo.

> [!consejo] Dónde va cada cosa
>
> El resultado útil, a `stdout`. Todo lo demás —avisos, errores, barras de progreso, mensajes de "procesando"— a `stderr`. Esa es la costumbre de las herramientas de Unix y la razón de que `programa | otro` funcione limpio.

## El ancho de la terminal

Si dibujas una línea de 80 guiones en una ventana de 60 columnas, la terminal la parte en dos y el diseño se descuadra. La medida real está en `shutil`:

```python
import shutil

tamano = shutil.get_terminal_size()
print(tamano)
print(tamano.columns, tamano.lines)
```

```salida
os.terminal_size(columns=80, lines=24)
80 24
```

Esos 80 por 24 son el **valor de reserva**, y salen porque este ejemplo se ha ejecutado con la salida redirigida a un fichero, donde no hay ninguna ventana que medir. En tu terminal verás las medidas de verdad. El valor de reserva se puede cambiar:

```python
import shutil

print(shutil.get_terminal_size(fallback=(100, 30)).columns)
```

```salida
100
```

> [!nota] Las variables COLUMNS y LINES
>
> `get_terminal_size` mira primero las variables de entorno `COLUMNS` y `LINES`, y solo si no existen pregunta al sistema. Eso te permite probar cómo se ve tu programa en una ventana estrecha sin redimensionar nada:
>
> ```bash
> COLUMNS=40 python3 mi_programa.py
> ```

Con esa medida ya se puede adaptar la salida. Tres funciones que vas a reutilizar todo el módulo:

```python title="ancho.py"
import shutil


def columnas() -> int:
        """Ancho útil de la terminal ahora mismo."""
    return shutil.get_terminal_size().columns


def regla(caracter: str = "-") -> str:
        """Una línea horizontal de lado a lado."""
    return caracter * columnas()


def titulo_centrado(texto: str, relleno: str = "=") -> str:
        """El texto centrado y rodeado del carácter de relleno."""
    return f" {texto} ".center(columnas(), relleno)


def ajustar(texto: str) -> str:
        """Recorta el texto si no cabe en una línea."""
    ancho = columnas()
    if len(texto) <= ancho:
                return texto
    return texto[: ancho - 1] + "…"
```

Probándolas en una salida de 80 columnas:

```python
print(titulo_centrado("INFORME DE VENTAS"))
print(titulo_centrado("resumen", "-"))
print(regla())

largo = "Este mensaje es muy largo y no cabe en una terminal estrecha, así que hay que recortarlo antes de imprimirlo."
print(len(largo))
print(ajustar(largo))
```

```salida
============================== INFORME DE VENTAS ===============================
----------------------------------- resumen ------------------------------------
--------------------------------------------------------------------------------
109
Este mensaje es muy largo y no cabe en una terminal estrecha, así que hay que r…
```

El `center` es el mismo método de cadenas del módulo 1; lo único nuevo es que el ancho se calcula en vez de escribirse a mano.

> [!aviso] Consulta el ancho cada vez, no lo guardes
>
> Es tentador hacer `ANCHO = shutil.get_terminal_size().columns` al principio del programa. No lo hagas en un programa interactivo: quien lo usa puede redimensionar la ventana mientras está abierto, y tu diseño se quedará con la medida antigua. Llamar a la función es barato.

> [!error] TypeError: 'str' object cannot be interpreted as an integer
>
> Sale al escribir `print("hola", end=2)` o `"texto" * "3"`. En el caso de `print`, `sep` y `end` tienen que ser cadenas o `None`, y los anchos y repeticiones tienen que ser enteros. Revisa si te falta un `int()` o si has puesto el valor en el parámetro equivocado.

> [!error] El prompt de la terminal aparece pegado a mi salida
>
> Te ha faltado cerrar la línea. Después de un bucle con `end=""`, pon un `print()` vacío. Si además usaste `\r` y ves restos de texto antiguo, rellena con espacios o borra la línea con `\033[2K`.

> [!resumen] En resumen
>
> `print` tiene tres parámetros que cambian todo: `sep` decide qué va entre los valores, `end` qué va al final, y `flush=True` fuerza a que lo escrito aparezca ya en vez de quedarse en el búfer. Con `end=""` se construye una línea por partes, y hay que acordarse de cerrarla con un `print()` vacío. El retorno de carro `\r` devuelve el cursor al principio de la línea y permite reescribirla, pero no borra lo que había. La pantalla se limpia con `os.system` o con el código `\033[2J\033[H`. Por debajo de `print` están `sys.stdout`, para el resultado, y `sys.stderr`, para avisos y errores, que no se pierden al redirigir. Y `shutil.get_terminal_size()` da el ancho real, que conviene consultar cada vez porque la ventana puede cambiar de tamaño.

> [!ejercicio] Practica
>
> Crea un fichero `02-salida.py` y resuelve:
>
> 1. Imprime los números del 1 al 20 en una sola línea, separados por comas y sin espacio detrás de la última. Hazlo de dos formas: con `end` y con `sep`.
> 2. Escribe una función `barra_sencilla(actual, total)` que imprima en una sola línea reescrita `[####------] 4/10`. Llámala dentro de un bucle con una pausa de dos décimas y comprueba que avanza sin bajar de línea.
> 3. Escribe una cuenta atrás de cinco segundos que use `\r` y que al terminar deje la línea limpia, sin restos del texto anterior.
> 4. Escribe una función `encabezado(texto)` que imprima el texto centrado entre dos reglas del ancho exacto de tu terminal. Pruébala redimensionando la ventana y con `COLUMNS=40` delante de la orden.
> 5. Modifica un programa cualquiera del módulo 1 para que los mensajes de error salgan por `stderr` y el resultado por `stdout`. Compruébalo con `python3 programa.py > resultado.txt` y mirando qué queda en pantalla y qué en el fichero.
> 6. Escribe una función `tabla_de_dos_columnas(pares)` que reciba una lista de tuplas y las imprima con la etiqueta a la izquierda, puntos de relleno en medio y el valor pegado al borde derecho de la terminal.
