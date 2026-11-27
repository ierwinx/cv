---
titulo: "Interrupciones y limpieza"
resumen: "Qué pasa al pulsar Ctrl+C, cómo terminar con elegancia y cómo garantizar que no quedan ficheros a medias."
minutos: 21
orden: 19
---

Tu herramienta lleva cuarenta segundos sincronizando y quien la lanzó se ha dado cuenta de que ha escrito mal un parámetro. Pulsa <kbd>Ctrl</kbd> + <kbd>C</kbd> para cortar. Con un programa tan simple como este:

```python title="cuenta.py"
import time

for segundo in range(1, 11):
        print(f"Trabajando... {segundo}")
    time.sleep(1)
print("Terminado")
```

lo que se encuentra es esto:

```salida
Trabajando... 1
Trabajando... 2
Trabajando... 3
Traceback (most recent call last):
  File "/Users/erwin/curso-python/cuenta.py", line 5, in <module>
    time.sleep(1)
    ~~~~~~~~~~^^^
KeyboardInterrupt
```

Una traza de error por hacer algo perfectamente normal. Y lo que no se ve es peor: el fichero que se estaba escribiendo ha quedado a medias, el fichero de bloqueo sigue ahí y la próxima ejecución se negará a arrancar.

## Ctrl+C lanza una excepción normal

Lo primero que hay que entender es que <kbd>Ctrl</kbd> + <kbd>C</kbd> no mata tu programa de golpe. Lo que hace el sistema es enviarle una señal, y Python la traduce a algo que ya sabes manejar: **lanza un `KeyboardInterrupt`** en la línea que se estuviera ejecutando.

Es una excepción como cualquier otra. Se puede capturar con `except`, tiene `finally`, y sube por la pila igual que un `ValueError`.

> [!aviso] except Exception no captura KeyboardInterrupt
>
> Igual que `SystemExit`, `KeyboardInterrupt` desciende directamente de `BaseException` y no de `Exception`. Es deliberado: si un `except Exception` genérico se la tragara, habría programas imposibles de parar con <kbd>Ctrl</kbd> + <kbd>C</kbd>.
>
> Para capturarla hay que nombrarla: `except KeyboardInterrupt`.

## Terminar con elegancia

El patrón es el mismo de la lección de códigos de salida, con una cláusula más. Se captura en `main`, se avisa por `stderr` y se devuelve **130**, que es el código convencional para "interrumpido por el usuario":

```python title="cuenta.py"
import sys
import time


def main() -> int:
        try:
                for segundo in range(1, 11):
                        print(f"Trabajando... {segundo}")
            time.sleep(1)
    except KeyboardInterrupt:
                print("\nInterrumpido por el usuario.", file=sys.stderr)
        return 130
    print("Terminado")
    return 0


raise SystemExit(main())
```

```bash
python3 cuenta.py
echo $?
```

```salida
Trabajando... 1
Trabajando... 2
Trabajando... 3

Interrumpido por el usuario.
130
```

Tres detalles que parecen pequeños y no lo son. El mensaje empieza con `\n` porque el cursor se ha quedado a mitad de la línea donde apareció el `^C` de la terminal. Va por `stderr`, porque no es el resultado del programa. Y 130 sale de la convención de sumar 128 al número de la señal, que para SIGINT es la 2.

> [!nota] Ese 130 es el que ya devolvía Python
>
> Si no capturas nada, Python también termina con 130: al recibir la señal restablece el comportamiento por defecto y se deja matar por ella. Lo que ganas capturándola no es el código, es todo lo demás: no escupir la traza, poder avisar con un mensaje comprensible y, sobre todo, poder limpiar.

## Garantizar la limpieza con finally

Capturar la excepción no basta si el programa dejó cosas a medio hacer. Para eso está `finally`, que se ejecuta pase lo que pase: si todo va bien, si falla, y también si el usuario interrumpe.

```python title="limpieza.py"
import sys
import time
from pathlib import Path

BLOQUEO = Path("proceso.lock")


def main() -> int:
        BLOQUEO.write_text("en marcha", encoding="utf-8")
    print("Bloqueo creado")
    try:
                for segundo in range(1, 11):
                        print(f"Trabajando... {segundo}")
            time.sleep(1)
    except KeyboardInterrupt:
                print("\nInterrumpido por el usuario.", file=sys.stderr)
        return 130
    finally:
                BLOQUEO.unlink(missing_ok=True)
        print("Bloqueo liberado")
    return 0


raise SystemExit(main())
```

```bash
python3 limpieza.py
echo $?
ls proceso.lock
```

```salida
Bloqueo creado
Trabajando... 1
Trabajando... 2
Trabajando... 3

Interrumpido por el usuario.
Bloqueo liberado
130
ls: proceso.lock: No such file or directory
```

El `finally` se ha ejecutado aunque el `except` devolviera un valor. Ese `return 130` no sale de la función hasta que el `finally` termina, y por eso el fichero de bloqueo desaparece siempre. `missing_ok=True` evita que la limpieza falle si el fichero ya no estaba.

## atexit, para lo que hay que hacer al final

`finally` cubre un bloque. Cuando lo que quieres es "esto hay que hacerlo al terminar el programa, se salga por donde se salga", el módulo `atexit` lo registra de una vez y se despreocupa.

```python title="atexit_demo.py"
import atexit
from pathlib import Path

TEMPORAL = Path("descarga.parcial")


def despedirse() -> None:
        print("Cerrando la sesión y borrando restos")
    TEMPORAL.unlink(missing_ok=True)


atexit.register(despedirse)

TEMPORAL.write_text("datos a medias", encoding="utf-8")
print("Descargando...")
raise SystemExit("No hay conexión con el servidor")
```

```bash
python3 atexit_demo.py
echo $?
```

```salida
Descargando...
No hay conexión con el servidor
Cerrando la sesión y borrando restos
1
```

La función registrada se ha ejecutado aunque la salida fuera por un `SystemExit` lanzado a mitad, y sin que haya un solo `try` en el programa. Se pueden registrar varias, y se ejecutan en orden inverso al de registro, como una pila.

| Herramienta | Alcance | Cuándo usarla |
| --- | --- | --- |
| `finally` | Un bloque `try` | Limpieza local: cerrar lo que acabas de abrir |
| `with` | Un bloque `with` | Cuando el recurso ya tiene gestor de contexto |
| `atexit` | Todo el programa | Recursos globales: ficheros de bloqueo, sesiones, temporales |

> [!aviso] atexit no se ejecuta siempre
>
> Tiene dos agujeros. Si el proceso muere de golpe, por ejemplo con `os._exit()` o porque el sistema lo mata con SIGKILL, las funciones registradas no llegan a ejecutarse. Y si una de ellas lanza una excepción, Python la imprime y sigue con las demás, pero esa no habrá hecho su trabajo.
>
> Por eso `atexit` es una red de seguridad, no una garantía. Lo que de verdad no puede quedar a medias se resuelve con el patrón de escritura segura del final de esta lección.

## Gestores de contexto propios

Ya usas `with` con los ficheros: garantiza que se cierran al salir del bloque, falle lo que falle. Eso no es magia exclusiva de `open()`, es un mecanismo del lenguaje al que te puedes apuntar.

La forma corta de hacerlo es el decorador `contextmanager` del módulo `contextlib`. Escribes una función con un `yield` en medio: lo de antes del `yield` se ejecuta al entrar en el bloque, y lo de después, al salir.

```python title="paso.py"
from contextlib import contextmanager


@contextmanager
def paso(descripcion: str):
        """Anuncia un paso y dice si ha ido bien o mal, falle lo que falle dentro."""
    print(f"{descripcion}...", end=" ", flush=True)
    try:
                yield
    except Exception as error:
                print(f"ERROR ({error})")
        raise
    else:
                print("hecho")


with paso("Leyendo la configuración"):
        pass

with paso("Descargando el catálogo"):
        pass

with paso("Guardando en la base de datos"):
        raise RuntimeError("conexión rechazada")
```

```salida
Leyendo la configuración... hecho
Descargando el catálogo... hecho
Guardando en la base de datos... ERROR (conexión rechazada)
Traceback (most recent call last):
  File "/Users/erwin/curso-python/paso.py", line 24, in <module>
    raise RuntimeError("conexión rechazada")
RuntimeError: conexión rechazada
```

El `raise` desnudo dentro del `except` vuelve a lanzar la misma excepción después de imprimir el aviso: el gestor informa, pero no se queda el problema.

Donde esto se vuelve imprescindible es al tocar el estado de la terminal. Si ocultas el cursor con un código ANSI y el usuario interrumpe, el cursor se queda invisible **en su terminal**, después de que tu programa haya muerto. Un gestor de contexto lo impide:

```python title="terminal.py"
from contextlib import contextmanager

OCULTAR_CURSOR = "\033[?25l"
MOSTRAR_CURSOR = "\033[?25h"


@contextmanager
def cursor_oculto():
        """Oculta el cursor mientras dura el bloque y lo restaura pase lo que pase."""
    print(OCULTAR_CURSOR, end="", flush=True)
    try:
                yield
    finally:
                print(MOSTRAR_CURSOR, end="", flush=True)


with cursor_oculto():
        dibujar_barra_de_progreso()
```

El `try`/`finally` alrededor del `yield` es lo que hace el trabajo: si dentro del bloque salta un `KeyboardInterrupt`, la excepción atraviesa el `yield`, se ejecuta el `finally` y el cursor vuelve antes de que el programa termine. Sin gestor, tendrías que acordarte de restaurarlo en cada uno de los caminos de salida, y te olvidarías de alguno.

> [!consejo] Envuelve todo lo que cambie el estado de la terminal
>
> Colores, cursor oculto, pantalla alternativa, entrada sin eco. Todo lo que modifique la terminal tiene que ir dentro de un gestor de contexto que lo deshaga. Una herramienta que deja la terminal inutilizable al interrumpirla es una herramienta rota, por muy bien que funcione en el camino feliz.

## Ficheros temporales con tempfile

Inventarse un nombre como `temporal.txt` tiene tres problemas: puede existir ya, dos ejecuciones simultáneas se pisan, y si el programa muere se queda ahí para siempre. El módulo `tempfile` los resuelve los tres.

```python title="temp_demo.py"
import tempfile
from pathlib import Path

# Un fichero temporal que se borra solo al cerrar el bloque.
with tempfile.NamedTemporaryFile(
    mode="w", suffix=".csv", prefix="informe-", encoding="utf-8", delete=True
) as temporal:
        temporal.write("codigo;unidades\nA-45;12\n")
    temporal.flush()
    ruta = Path(temporal.name)
    print("Existe mientras dura el bloque:", ruta.exists())
    print("Nombre generado:", ruta.name[:8] + "...")

print("Tras salir del bloque:", ruta.exists())

# Una carpeta temporal entera, con lo que haya dentro.
with tempfile.TemporaryDirectory(prefix="trabajo-") as carpeta:
        directorio = Path(carpeta)
    (directorio / "parcial.txt").write_text("datos", encoding="utf-8")
    print("Ficheros dentro:", [f.name for f in directorio.iterdir()])

print("La carpeta sigue existiendo:", directorio.exists())
```

```salida
Existe mientras dura el bloque: True
Nombre generado: informe-...
Tras salir del bloque: False
Ficheros dentro: ['parcial.txt']
La carpeta sigue existiendo: False
```

| Función | Qué te da | Se borra |
| --- | --- | --- |
| `NamedTemporaryFile()` | Un fichero abierto, con nombre en disco | Al cerrarlo |
| `TemporaryDirectory()` | Una carpeta vacía | Al salir del `with`, con todo lo que tenga dentro |
| `mkstemp()` | Un descriptor y una ruta, sin borrado automático | Nunca, lo borras tú |
| `gettempdir()` | La carpeta temporal del sistema |  |

`gettempdir()` devuelve `/tmp` en la mayoría de Linux, una carpeta larga dentro de `/var/folders/` en macOS y algo bajo `C:\Users\...\AppData\Local\Temp` en Windows. No la escribas a mano: pregúntale a `tempfile`.

## Escribir de forma segura

Llegamos al problema que dejó abierto el proyecto del módulo 1. Este código, que parece inofensivo, puede destruir datos:

```python
with open("estado.json", "w", encoding="utf-8") as fichero:
        json.dump(estado, fichero, indent=2, ensure_ascii=False)
```

El modo `"w"` **vacía el fichero antes de escribir nada**. Si el programa se interrumpe entre ese vaciado y el final de la escritura —por un <kbd>Ctrl</kbd> + <kbd>C</kbd>, por un corte de luz, porque el disco se llenó—, lo que queda en disco es un fichero truncado. Ya no tienes el estado nuevo, y tampoco el viejo.

La solución la usan todos los programas serios y consiste en no tocar el fichero bueno hasta el último instante: escribes en un temporal y, cuando está completo, lo **renombras** sobre el destino. El sistema operativo garantiza que ese renombrado es atómico: para cualquiera que mire el fichero, o está el contenido viejo entero o está el nuevo entero, nunca una mezcla.

```python title="escritura_segura.py"
import json
import os
import tempfile
from pathlib import Path


def guardar_json_seguro(ruta: Path, datos: dict) -> None:
        """Escribe el JSON de forma que el fichero final nunca quede a medias."""
    ruta.parent.mkdir(parents=True, exist_ok=True)

    # 1. Escribimos en un temporal en la MISMA carpeta que el destino.
    descriptor, nombre_temporal = tempfile.mkstemp(
        dir=ruta.parent, prefix=ruta.name + ".", suffix=".tmp"
    )
    temporal = Path(nombre_temporal)
    try:
                with os.fdopen(descriptor, "w", encoding="utf-8") as fichero:
                        json.dump(datos, fichero, indent=2, ensure_ascii=False)
            fichero.flush()
            os.fsync(fichero.fileno())   # 2. Nos aseguramos de que está en disco.
        temporal.replace(ruta)           # 3. Sustitución atómica.
    except BaseException:
                temporal.unlink(missing_ok=True)
        raise


RUTA = Path("estado.json")

guardar_json_seguro(RUTA, {"ultima_sincronizacion": "2026-09-19", "articulos": 120})
print(RUTA.read_text(encoding="utf-8"))
print("Ficheros .tmp que han quedado:", list(Path(".").glob("*.tmp")))
```

```salida
{
  "ultima_sincronizacion": "2026-09-19",
  "articulos": 120
}
Ficheros .tmp que han quedado: []
```

Cada línea del patrón está ahí por un motivo:

- El temporal va en **la misma carpeta** que el destino. Renombrar solo es atómico dentro del mismo sistema de ficheros, y `/tmp` puede estar en otro disco. Por eso se pasa `dir=ruta.parent` en vez de dejar que `mkstemp` elija.
- `flush()` saca los datos del búfer de Python y `os.fsync()` obliga al sistema a escribirlos de verdad en el disco. Sin esa segunda llamada, el renombrado podría completarse mientras el contenido sigue esperando en la memoria del sistema operativo.
- `Path.replace()` sustituye el destino aunque ya exista, y funciona igual en Windows, cosa que `rename()` no garantiza.
- El `except BaseException` captura también `KeyboardInterrupt` y `SystemExit`, borra el temporal y vuelve a lanzar la excepción con un `raise` desnudo. Es de los poquísimos sitios donde capturar `BaseException` está justificado: no nos quedamos el problema, solo barremos antes de irnos.

> [!consejo] Esta función es para copiar y pegar
>
> `guardar_json_seguro` es exactamente el tipo de cosa que se escribe una vez y se lleva de proyecto en proyecto. Cámbiale el `json.dump` por lo que necesites escribir y tienes escritura segura para cualquier formato. Mételo en tu módulo de utilidades y no vuelvas a usar `open(ruta, "w")` para nada que importe.

## Cuando la interrupción no viene del teclado

<kbd>Ctrl</kbd> + <kbd>C</kbd> es la señal SIGINT, y Python te la da ya convertida en excepción. Hay otra que conviene conocer: **SIGTERM**, la que envía el sistema cuando apaga el ordenador, cuando un gestor de servicios reinicia tu proceso o cuando alguien ejecuta `kill` sin más argumentos. Es la forma educada de pedir que termines.

Python no la convierte en excepción: por defecto mata el proceso en el acto, sin `finally` ni `atexit`. Para atenderla hay que registrarla con el módulo `signal`:

```python title="senal.py"
import signal
import sys
import time

seguir = True


def atender_sigterm(numero_senal, marco) -> None:
        """El sistema nos pide que terminemos: lo apuntamos y salimos del bucle."""
    global seguir
    print(f"\nRecibida la señal {numero_senal}, terminando con calma.", file=sys.stderr)
    seguir = False


signal.signal(signal.SIGTERM, atender_sigterm)

segundo = 0
while seguir and segundo < 60:
        segundo += 1
    print(f"Trabajando... {segundo}")
    time.sleep(1)

print("Todo guardado. Adiós.")
```

Lanzado en una terminal y enviándole `kill NUMERO_DE_PROCESO` desde otra:

```salida
Trabajando... 1
Trabajando... 2
Trabajando... 3

Recibida la señal 15, terminando con calma.
Todo guardado. Adiós.
```

El 15 es el número de SIGTERM. Y fíjate en lo que **no** hace la función: no cierra ficheros, no guarda nada, no llama a `sys.exit`. Solo pone una variable a `False`. Esa es la forma correcta de tratar una señal, porque el manejador se ejecuta interrumpiendo cualquier línea del programa, incluso a mitad de una escritura. Levantas la bandera y dejas que el bucle principal termine su vuelta y salga por la puerta.

> [!nota] SIGKILL no se puede atender
>
> Existe una señal, SIGKILL (la 9), que el sistema no deja interceptar: el proceso muere al instante, sin `finally`, sin `atexit` y sin manejadores. Es lo que ocurre con `kill -9` y cuando el sistema se queda sin memoria. Contra eso no hay defensa posible dentro del programa, y es la razón definitiva por la que la escritura segura no se basa en limpiar al salir, sino en no dejar nunca el fichero bueno en un estado inválido.

> [!error] Mi programa no responde a Ctrl+C
>
> La causa casi siempre es una captura demasiado ancha **dentro** de un bucle. Un `except BaseException` o un `except KeyboardInterrupt` con `pass` en el cuerpo del bucle se come la interrupción en cada vuelta, así que por muchas veces que la pulses el programa sigue corriendo.
>
> La solución es sacar la captura fuera del bucle, que es donde tiene sentido: dentro se atienden los fallos de una vuelta concreta, fuera se atiende el final del trabajo. Y si te pilla con el programa ya lanzado, <kbd>Ctrl</kbd> + <kbd>Z</kbd> lo suspende en macOS y Linux y te devuelve el control para matarlo con `kill`.

> [!resumen] En resumen
>
> Pulsar <kbd>Ctrl</kbd> + <kbd>C</kbd> no mata el programa de golpe: lanza un `KeyboardInterrupt`, que es una excepción normal salvo porque desciende de `BaseException` y por eso un `except Exception` no la captura. Lo correcto es capturarla en `main`, avisar por `stderr` y devolver 130, el código convencional para una interrupción del usuario. La limpieza se garantiza con `finally`, que se ejecuta incluso cuando el `except` hace `return`, y con `atexit` para lo que deba ocurrir al terminar el programa venga de donde venga la salida. Para restaurar el estado de la terminal o borrar lo que sobre, lo mejor es un gestor de contexto propio escrito con `@contextmanager`, con un `try`/`finally` alrededor del `yield`, que se usa con el mismo `with` de los ficheros. Los ficheros y carpetas temporales se piden a `tempfile`, que se encarga de los nombres y del borrado. Y lo más importante: para que un fichero no quede nunca a medias, no se escribe encima del bueno, sino en un temporal de la misma carpeta que después se renombra con `Path.replace()`, porque esa sustitución es atómica y sobrevive a cualquier interrupción, incluido un corte de luz.

> [!ejercicio] Practica
>
> Crea `19-limpieza.py` y resuelve:
>
> 1. Escribe un bucle que cuente hasta treinta imprimiendo un número por segundo. Interrúmpelo con <kbd>Ctrl</kbd> + <kbd>C</kbd> y anota la traza. Después captura el `KeyboardInterrupt` en `main`, muestra un mensaje por `stderr` y devuelve 130. Comprueba el código con `echo $?`.
> 2. Haz que el programa cree un fichero `proceso.lock` al empezar y lo borre en un `finally`. Comprueba que desaparece tanto si termina bien como si lo interrumpes.
> 3. Registra con `atexit` una función que imprima cuántos segundos estuvo trabajando el programa. Comprueba que se ejecuta en los tres casos: final normal, interrupción y `raise SystemExit` a mitad.
> 4. Escribe con `@contextmanager` un gestor `cronometro(descripcion)` que imprima al entrar y, al salir, cuánto ha tardado el bloque, incluso si dentro se lanza una excepción.
> 5. Usa `tempfile.TemporaryDirectory` para crear una carpeta, escribe tres ficheros dentro y comprueba con `Path.exists()` que la carpeta ya no está al salir del `with`.
> 6. Implementa `guardar_json_seguro` y pruébala de verdad: mete un `time.sleep(5)` justo antes del `replace`, ejecuta el programa, interrúmpelo durante la espera y comprueba que el `estado.json` anterior sigue intacto y que no ha quedado ningún `.tmp` por ahí.
