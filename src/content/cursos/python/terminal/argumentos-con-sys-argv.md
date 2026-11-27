---
titulo: "Argumentos con sys.argv"
resumen: "Cómo llegan a tu programa las palabras que se escriben detrás de su nombre en la terminal, y hasta dónde aguanta leerlas a mano."
minutos: 14
orden: 8
---

Hasta ahora, cuando un programa necesitaba un dato, lo pedía con `input()` y esperaba a que alguien lo tecleara. Funciona, pero obliga a estar delante. Un programa que se para a preguntar no se puede meter en un script, ni programar a las tres de la mañana, ni encadenar con otros.

Las herramientas de terminal de verdad reciben sus datos **en la misma línea con la que se las invoca**: `cp origen destino`, `python3 build.py --servir`, `git commit -m "arreglado"`. Todo lo que va detrás del nombre del programa son sus **argumentos**, y Python te los entrega en una lista.

> [!objetivo] Qué vas a aprender
>
> Entender qué hay dentro de `sys.argv`, leer argumentos a mano comprobando cuántos han llegado, saber cómo parte la terminal la línea en palabras y por qué a veces hacen falta comillas, y reconocer el punto en el que hacer esto a mano deja de merecer la pena.

## La lista `sys.argv`

El módulo `sys` de la biblioteca estándar tiene una variable llamada `argv` que contiene los argumentos de la invocación, **todos como cadenas de texto**:

```python title="argumentos.py"
"""Muestra lo que llega en sys.argv."""

import sys

print(sys.argv)
print(f"Han llegado {len(sys.argv)} elementos")
```

Ejecútalo sin nada detrás:

```bash
python3 argumentos.py
```

```salida
['argumentos.py']
Han llegado 1 elementos
```

La lista nunca está vacía. **En la posición cero está el nombre del script**, tal cual lo has escrito tú, no el primer argumento. Los argumentos de verdad empiezan en la posición 1:

```bash
python3 argumentos.py hola 42 --verboso
```

```salida
['argumentos.py', 'hola', '42', '--verboso']
Han llegado 4 elementos
```

Fíjate en dos cosas de esa salida. La primera: `42` llega como `'42'`, con comillas, porque **todo llega como texto**. Si lo necesitas como número, tendrás que convertirlo tú con `int()` o `float()`, exactamente igual que con `input()`. La segunda: `--verboso` no tiene nada de especial para `sys.argv`, es una cadena más. Los guiones solo significan algo cuando alguien decide interpretarlos, y de momento ese alguien eres tú.

> [!nota] Qué hay exactamente en `sys.argv[0]`
>
> Es la ruta del script tal como la escribiste en la terminal, ni más ni menos. Si lanzas `python3 conversor.py` valdrá `'conversor.py'`; si lanzas `python3 /tmp/pruebas/conversor.py` valdrá `'/tmp/pruebas/conversor.py'`. No te fíes de él para localizar ficheros vecinos: para eso está `Path(__file__)`, que sí da siempre la ruta real del módulo.

## Leer un argumento a mano

El caso más simple es un único argumento obligatorio:

```python title="saludo.py"
import sys

nombre = sys.argv[1]
print(f"Hola, {nombre}.")
```

```bash
python3 saludo.py Erwin
```

```salida
Hola, Erwin.
```

Funciona mientras se use bien. En cuanto alguien lo lance sin el nombre, el programa revienta:

```bash
python3 saludo.py
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/terminal/saludo.py", line 3, in <module>
    nombre = sys.argv[1]
             ~~~~~~~~^^^
IndexError: list index out of range
```

> [!error] IndexError: list index out of range
>
> Estás pidiendo `sys.argv[1]` y en la lista solo hay un elemento, el nombre del script. Es decir: han lanzado tu programa sin argumentos.
>
> La solución no es capturar la excepción, es **comprobar la longitud antes de indexar** y explicar cómo se usa el programa:
>
> ```python
> if len(sys.argv) < 2:
>         print("Uso: python3 saludo.py NOMBRE")
>     sys.exit(1)
>
> nombre = sys.argv[1]
> ```
>
> Un traceback en la cara de quien usa tu herramienta no le dice qué ha hecho mal; un mensaje de uso, sí.

Ese `sys.exit(1)` termina el programa inmediatamente. El número es el **código de salida**: cero significa "todo bien" y cualquier otro valor significa "algo ha fallado". La terminal lo usa para encadenar órdenes, y lo verás con detalle más adelante en el módulo. Por ahora quédate con la costumbre: si tu programa no ha podido hacer su trabajo, no salgas con cero.

## Todos los argumentos de golpe

Cuando no sabes cuántos van a llegar, rebana la lista desde la posición 1 y trátala como cualquier otra lista:

```python title="sumar.py"
"""Suma todos los números que reciba por la línea de comandos."""

import sys

numeros = [float(dato) for dato in sys.argv[1:]]

print(f"He recibido {len(numeros)} números")
print(f"Suma: {sum(numeros)}")
```

```bash
python3 sumar.py 10 20 5.5
```

```salida
He recibido 3 números
Suma: 35.5
```

`sys.argv[1:]` es el modismo que verás en todas partes: "la lista sin el nombre del script".

## Cómo parte la terminal la línea

Esto no lo hace Python, lo hace la terminal antes de arrancarlo: **corta la línea por los espacios** y le pasa a tu programa el resultado ya troceado. Por eso un nombre con espacios se convierte en varios argumentos:

```bash
python3 argumentos.py informe final.txt
```

```salida
['argumentos.py', 'informe', 'final.txt']
Han llegado 3 elementos
```

Han llegado dos argumentos donde tú querías uno. Para que un valor con espacios viaje entero hay que **encerrarlo entre comillas**, simples o dobles:

```bash
python3 argumentos.py "informe final.txt"
```

```salida
['argumentos.py', 'informe final.txt']
Han llegado 2 elementos
```

Las comillas desaparecen por el camino: son una instrucción para la terminal, no parte del dato. Lo mismo vale para cualquier valor que contenga espacios, aunque no sea un nombre de fichero:

```bash
python3 argumentos.py "2 + 3" "5 * 4"
```

```salida
['argumentos.py', '2 + 3', '5 * 4']
Han llegado 3 elementos
```

> [!aviso] El asterisco tampoco llega como lo escribes
>
> Si lanzas `python3 argumentos.py *.txt`, tu programa no recibe `*.txt`: recibe la lista de todos los ficheros `.txt` de la carpeta, ya expandida por la terminal. Y si no hay ninguno, recibe el `*.txt` literal. Es una comodidad enorme cuando la conoces y una sorpresa desagradable cuando no. Para pasar el asterisco tal cual, entrécomíllalo: `"*.txt"`.

## Un programa completo

Con lo anterior ya se puede escribir una herramienta útil de verdad. Este conversor de unidades de longitud recibe tres argumentos y los valida todos antes de calcular nada:

```python title="conversor.py"
"""Convierte una cantidad entre unidades de longitud.

Uso: python3 conversor.py CANTIDAD ORIGEN DESTINO
"""

import sys

# Cuántos metros vale una unidad de cada tipo.
METROS_POR_UNIDAD = {
    "m": 1.0,
    "km": 1000.0,
    "milla": 1609.344,
    "pie": 0.3048,
    "pulgada": 0.0254,
}


def convertir(cantidad: float, origen: str, destino: str) -> float:
        """Pasa la cantidad de la unidad de origen a la de destino."""
    metros = cantidad * METROS_POR_UNIDAD[origen]
    return metros / METROS_POR_UNIDAD[destino]


def main() -> None:
        if len(sys.argv) != 4:
                print("Uso: python3 conversor.py CANTIDAD ORIGEN DESTINO")
        print(f"Unidades: {', '.join(METROS_POR_UNIDAD)}")
        sys.exit(1)

    try:
                cantidad = float(sys.argv[1])
    except ValueError:
                print(f"'{sys.argv[1]}' no es un número.")
        sys.exit(1)

    origen = sys.argv[2]
    destino = sys.argv[3]

    if origen not in METROS_POR_UNIDAD or destino not in METROS_POR_UNIDAD:
                print(f"Unidad desconocida. Usa una de: {', '.join(METROS_POR_UNIDAD)}")
        sys.exit(1)

    resultado = convertir(cantidad, origen, destino)
    print(f"{cantidad:g} {origen} = {resultado:.4g} {destino}")


if __name__ == "__main__":
        main()
```

Funcionando:

```bash
python3 conversor.py 42 km milla
```

```salida
42 km = 26.1 milla
```

```bash
python3 conversor.py 1 milla m
```

```salida
1 milla = 1609 m
```

Y los tres caminos de error, cada uno con su mensaje:

```bash
python3 conversor.py
```

```salida
Uso: python3 conversor.py CANTIDAD ORIGEN DESTINO
Unidades: m, km, milla, pie, pulgada
```

```bash
python3 conversor.py mucho km m
```

```salida
'mucho' no es un número.
```

```bash
python3 conversor.py 5 km leguas
```

```salida
Unidad desconocida. Usa una de: m, km, milla, pie, pulgada
```

Merece la pena mirar cómo está montado. La función `convertir` no sabe nada de `sys.argv`: recibe tres valores ya limpios y devuelve un número, así que se puede importar y probar por separado. Toda la suciedad de la línea de comandos está en `main`, que es la que comprueba, convierte y se rinde con `sys.exit(1)` cuando algo no cuadra. Es la misma separación entre lógica e interfaz del gestor de tareas del módulo anterior, solo que ahora la interfaz no es un menú sino la propia invocación.

## Dónde se rompe esto

El conversor está bien para tres argumentos obligatorios y en orden fijo. Ahora imagina que quieres añadir una opción para elegir los decimales del resultado. La opción es opcional, puede aparecer en cualquier sitio de la línea y lleva un valor pegado detrás. A mano queda así:

```python title="conversor_manual.py"
import sys

argumentos = sys.argv[1:]
decimales = 2

# Buscar la opción y sacarla de la lista antes de contar los posicionales.
if "--decimales" in argumentos:
        posicion = argumentos.index("--decimales")
    try:
                decimales = int(argumentos[posicion + 1])
    except (IndexError, ValueError):
                print("--decimales necesita un número entero detrás.")
        sys.exit(1)
    del argumentos[posicion:posicion + 2]

if len(argumentos) != 3:
        print("Uso: python3 conversor_manual.py CANTIDAD ORIGEN DESTINO [--decimales N]")
    sys.exit(1)

print(f"decimales={decimales}, posicionales={argumentos}")
```

```bash
python3 conversor_manual.py 42 km milla --decimales 4
```

```salida
decimales=4, posicionales=['42', 'km', 'milla']
```

```bash
python3 conversor_manual.py --decimales 4 42 km milla
```

```salida
decimales=4, posicionales=['42', 'km', 'milla']
```

Veinte líneas para **una sola opción**, y ni siquiera son veinte líneas completas: falta aceptar `-d` como forma corta, falta admitir `--decimales=4` con el igual pegado, falta que `-h` explique el programa, falta rechazar una opción mal escrita en vez de tomarla por un posicional. Cada opción nueva multiplica el enredo, y el código que decide qué es un valor y qué es una opción acaba siendo más largo que el programa de verdad.

Esa es exactamente la razón de que la biblioteca estándar traiga `argparse`, que es la lección siguiente. No es una comodidad de lujo: es que el problema, aunque parezca trivial desde fuera, tiene demasiados casos particulares para resolverlo bien a mano dos veces.

> [!consejo] Cuándo sí basta con `sys.argv`
>
> Para un script de tres líneas que solo tú vas a usar y que recibe un fichero y nada más, `sys.argv[1]` con su comprobación de longitud es perfectamente razonable. La regla práctica: en cuanto aparezca la primera opción con guion, la primera bandera o el primer valor por defecto, cambia a `argparse`. Nunca te arrepentirás de haberlo hecho pronto, y sí de haberlo hecho tarde.

> [!resumen] En resumen
>
> Los argumentos de la línea de comandos llegan a Python en la lista `sys.argv`, siempre como cadenas de texto y con el nombre del script en la posición cero, de modo que los datos de verdad empiezan en la posición 1 y `sys.argv[1:]` los da todos. Antes de indexar hay que comprobar `len(sys.argv)`, porque pedir una posición que no existe da un `IndexError` con un traceback que no ayuda a nadie; lo correcto es imprimir cómo se usa el programa y salir con `sys.exit(1)`. Quien parte la línea en palabras es la terminal, no Python, así que un valor con espacios hay que escribirlo entre comillas para que llegue de una pieza. Leer todo esto a mano funciona con unos pocos argumentos obligatorios y en orden fijo, pero se vuelve insostenible en cuanto aparecen opciones, valores por defecto o una ayuda que mantener, y ese es el hueco que llena `argparse`.

> [!ejercicio] Practica
>
> Crea los ficheros indicados y resuelve:
>
> 1. En `eco.py`, imprime cada argumento recibido en una línea, precedido de su posición, incluido el cero. Lánzalo con varios argumentos y comprueba dónde está el nombre del script.
> 2. En `saludo.py`, escribe un programa que salude a la persona que le pasen. Si no le pasan ninguna, que imprima `Uso: python3 saludo.py NOMBRE` y salga con código 1. Si le pasan varias, que las salude a todas.
> 3. En `estadisticas.py`, recibe una cantidad cualquiera de números y muestra cuántos son, su suma, su media, el mínimo y el máximo. Controla con un mensaje claro los dos casos malos: que no llegue ningún número y que alguno no se pueda convertir a `float`.
> 4. En `renombrar.py`, recibe exactamente dos argumentos, un nombre de fichero y una extensión nueva, y muestra cómo quedaría el nombre. Pruébalo con un fichero cuyo nombre lleve espacios, primero sin comillas y después con ellas, y explica por escrito la diferencia en la salida.
> 5. Amplía `conversor.py` de la lección para que acepte una opción `--decimales N` en cualquier posición de la línea. Cuando lo tengas funcionando, cuenta las líneas que te ha costado y guárdalas para compararlas con la lección siguiente.
