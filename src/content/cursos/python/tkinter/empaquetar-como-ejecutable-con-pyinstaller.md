---
titulo: "Empaquetar como ejecutable con PyInstaller"
resumen: "Las preferencias que se borran en cada arranque sin que nadie se entere, el programa que no abre y no dice por qué, y el módulo que falta solo en el paquete."
minutos: 25
orden: 45
---

Hasta aquí, tu programa se ejecuta con `python3 programa.py`. Eso vale para ti y no vale para nadie más: la persona a la que quieres dárselo no tiene Python instalado, no sabe qué es una terminal, y si le mandas una carpeta con ficheros `.py` no va a pasar nada.

**PyInstaller** convierte eso en algo que se abre con doble clic. No compila y no hace el programa más rápido: mete tu código, el intérprete de Python y todas las bibliotecas en un paquete que arranca solo. Y funciona bastante bien, con tres fallos que se llevan casi todo el tiempo perdido y que tienen en común la forma de fallar: **el paquete se construye sin errores y el programa se porta distinto que en tu máquina**.

La lección 22 del módulo 2 ya cubrió la otra forma de distribuir, la de `pipx` y PyPI, que es la buena para herramientas de terminal dirigidas a gente con Python. Esto es lo contrario: un programa con ventana para alguien que no tiene nada.

> [!objetivo] Qué vas a aprender
>
> Construir un ejecutable con las opciones que hacen falta; entender la diferencia entre `--onefile` y `--onedir` y por qué la primera hace desaparecer las preferencias del usuario en cada arranque; incluir ficheros de datos y saber dónde aparecen; encontrar el error cuando el programa no abre y no dice nada; y saber qué importaciones PyInstaller no detecta.

## Lo primero, y lo que no hace

```bash
python3 -m pip install pyinstaller
pyinstaller --onedir --windowed --name MiPrograma programa.py
```

Eso deja el resultado en `dist/`, más una carpeta `build/` con los temporales y un fichero `MiPrograma.spec` que veremos al final. Las dos opciones que casi siempre quieres:

**`--windowed`** (o `--noconsole`) evita que aparezca una ventana de terminal detrás de tu programa. En Windows es imprescindible; en macOS es lo que hace que salga un `.app` de verdad en vez de un binario suelto.

**`--name`** pone el nombre, que si no se saca del fichero `.py`.

Y conviene tener claro lo que PyInstaller **no** hace, porque hay bastante confusión:

- **No compila.** Tu código sigue siendo Python; va empaquetado, no traducido. El programa no va más rápido, y de hecho **arranca más lento**.
- **No oculta tu código.** Se puede extraer con algo de esfuerzo. Si tu programa lleva una contraseña dentro, sigue estando dentro.
- **No sirve para otro sistema operativo.** Para hacer un `.exe` de Windows hay que ejecutar PyInstaller **en** Windows. No hay opción de cruzar, y es la primera pregunta que hace todo el mundo.

## `--onefile` o `--onedir`

Son las dos formas, y elegir mal tiene consecuencias que no se ven en pruebas rápidas.

**`--onedir`** (lo que hace por defecto) deja una carpeta con el ejecutable y todo lo demás al lado. **`--onefile`** deja un único fichero que, al arrancar, **se descomprime en una carpeta temporal** y se ejecuta desde ahí.

Medido en el mismo programa:

|  | `--onedir` | `--onefile` |
| --- | --- | --- |
| Tamaño en disco | 26 MB | 10 MB |
| Arranque (mediana de 5) | 695 ms | 1323 ms |

`--onefile` ocupa menos porque va comprimido, y **tarda el doble en arrancar** porque cada ejecución descomprime todo otra vez. Con programas más grandes la diferencia crece: son varios segundos de ventana en blanco antes de que aparezca nada.

Pero el problema de verdad es otro.

> [!error] Las preferencias que se borran en cada arranque
>
> Este es el fallo número uno, y es de los buenos: en tu máquina funciona, en `--onedir` funciona, y en `--onefile` el programa **olvida todo cada vez que se abre sin dar ningún error**.
>
> La causa es dónde acaba `__file__`. Medido:
>
> ```consola
> >>> # con --onedir
> sys._MEIPASS: /tmp/pi/dist/EscribeDir/_internal
> >>> # con --onefile, primera ejecución
> sys._MEIPASS: /var/folders/.../T/_MEI0000527dLkCfPY
> >>> # con --onefile, segunda ejecución
> sys._MEIPASS: /var/folders/.../T/_MEI00005283CXL2N3
> ```
>
> **La carpeta es distinta cada vez**, porque es temporal y se borra al salir. Así que un programa que guarda su configuración junto a `__file__` la escribe ahí, y la escritura funciona, y no hay excepción, y al arrancar otra vez:
>
> ```consola
> >>> # --onefile, primera vez
> lo anterior: (no habia nada)
> >>> # --onefile, segunda vez
> lo anterior: (no habia nada)
> >>> # --onedir, segunda vez
> lo anterior: visita a las 15:42:13
> ```
>
> Alguien ajusta el tamaño de la ventana, elige el tema oscuro, lo cierra, y al volver a abrirlo está todo como al principio. Para siempre. Y no hay ningún mensaje que lo explique.
>
> La solución ya estaba escrita en la lección 43 y ahora se entiende por qué era importante: **la configuración va en la carpeta del sistema**, nunca junto al programa. Con `carpeta_de_configuracion()` de la lección 43, esto no pasa ni en `--onefile` ni en `--onedir`.
>
> La regla general: **dentro del paquete se lee, nunca se escribe.**

## Incluir ficheros de datos

Tu programa probablemente necesita cosas que no son código: iconos, un fichero de plantilla, una base de datos inicial. PyInstaller no los incluye por su cuenta, porque no tiene forma de saber que existen.

```bash
pyinstaller --onefile --windowed --add-data "recursos:recursos" programa.py
```

El formato es `origen:destino`, y **el separador cambia en Windows**, donde es un punto y coma:

```bash
pyinstaller --add-data "recursos;recursos" programa.py    # Windows
```

Es una de esas diferencias que hacen que el comando de un tutorial no funcione y no se sepa por qué.

Y después hay que encontrarlos. Sin empaquetar, los datos están junto a tu `.py`; empaquetado, están donde PyInstaller los haya puesto, y ese sitio tiene un nombre:

```consola
>>> getattr(sys, "frozen", False)
True
>>> sys._MEIPASS
'/var/folders/.../T/_MEI00004f2bpiz2EK'
```

`sys.frozen` solo existe dentro de un paquete, y `sys._MEIPASS` es la carpeta donde están los datos. La función que resuelve los dos casos es esta, y conviene copiarla tal cual:

```python
def base_de_recursos():
        """Donde están los ficheros de datos, empaquetado o no."""
    return pathlib.Path(getattr(sys, "_MEIPASS", pathlib.Path(__file__).parent))
```

Una nota que ahorra confusión: en las versiones actuales de PyInstaller, `__file__` **también** apunta dentro de `_MEIPASS`, así que leer datos con `Path(__file__).parent` funciona igual. Lo que no funciona es escribir ahí, y lo que nunca funciona es esto:

```consola
>>> pathlib.Path.cwd()
'/private/tmp'
```

**El directorio actual es de donde se lanzó el programa**, que no tiene nada que ver con donde está. Cualquier ruta relativa del estilo `open("recursos/datos.json")` falla en cuanto alguien abre el programa con doble clic desde otra carpeta. Y este sí falla con una excepción, que con `--windowed` no va a ver nadie: sigue leyendo.

## Cuando el programa no abre y no dice nada

Aquí está el segundo fallo grande. Un error sin capturar durante el arranque, empaquetado con `--windowed`, produce esto:

```consola
>>> # doble clic en la aplicación
>>> # (nada. el programa ha arrancado, ha fallado y se ha ido)
```

Comprobado: el programa llega a ejecutarse (deja su rastro en un fichero), lanza la excepción, y **el usuario no ve absolutamente nada**. El icono rebota y no pasa más. Con `--windowed` no hay consola donde escribir el rastro, así que el rastro no va a ninguna parte visible.

Las tres formas de salir de ahí, por orden de cuándo se usan:

**Una: construir sin `--windowed` y ejecutar desde la terminal.** Es lo primero que hay que hacer siempre que algo no funcione, porque entonces el rastro sí aparece:

```consola
Traceback (most recent call last):
  File "revienta.py", line 5, in <module>
    raise ValueError("esto deberia verse en algun sitio")
ValueError: esto deberia verse en algun sitio
[PYI-29464:ERROR] Failed to execute script 'revienta' due to unhandled exception!
```

En macOS hay un atajo: aunque la aplicación sea `--windowed`, se puede ejecutar el binario de dentro (`MiPrograma.app/Contents/MacOS/MiPrograma`) desde la terminal y el rastro sale igual.

**Dos: el gancho de Tkinter para los errores de los callbacks.** Esto no es de PyInstaller, es de Tkinter, y merece conocerse por sí solo. Por defecto, una excepción en un `command`, en un `bind` o en un `after` **no para el programa**: se imprime en la salida de errores y el bucle sigue. Eso está bien en desarrollo y es malísimo empaquetado, porque el programa se queda medio roto en silencio.

```consola
>>> boton = ttk.Button(ventana, command=lambda: 1 / 0)
>>> boton.invoke()
>>> ventana.winfo_exists()
True
```

Se cambia reemplazando un método:

```python
def report_callback_exception(self, clase, valor, rastro):
        """Tkinter llama a esto ante cualquier excepción de un callback."""
    logging.exception("Fallo en la interfaz", exc_info=(clase, valor, rastro))
    messagebox.showerror("Error inesperado", f"{clase.__name__}: {valor}")
```

Comprobado que recoge las de `command`, las de `bind` y las de `after`. Lo que **no** recoge son los errores de antes de que exista el bucle de eventos, como los del propio `__init__`: para esos hace falta un `try`/`except` alrededor del arranque.

**Tres: dejar un registro en un fichero.** El `logging` de la lección 18 del módulo 2 es exactamente lo que hace falta aquí, con el fichero en la carpeta de configuración de la lección 43. Es lo único que permite que alguien te cuente qué ha pasado en su ordenador.

## El módulo que falta solo en el paquete

Tercer fallo. PyInstaller averigua qué necesita tu programa **leyendo el código**, buscando los `import`. Y eso funciona con los `import` normales y con los que están dentro de un `try`:

```consola
>>> # en el paquete
Pillow (try/except): PIL.Image SI incluido
```

Bien: la dependencia opcional de la lección 44 se incluye si está instalada cuando construyes. Lo que no funciona es cuando el nombre del módulo es una cadena:

```consola
>>> importlib.import_module("sqlite3")
ModuleNotFoundError: No module named 'sqlite3'
```

Ese error, en un programa que funcionaba perfectamente sin empaquetar. PyInstaller no puede saber qué hay en esa cadena, así que no lo incluye. Se arregla diciéndoselo:

```bash
pyinstaller --hidden-import sqlite3 programa.py
```

Y entonces sí:

```consola
>>> # con --hidden-import sqlite3
sqlite3 (importlib): ok
```

Esto pasa más de lo que parece, porque no hace falta que seas tú quien use `importlib`: lo hacen muchas bibliotecas por dentro para cargar sus propios complementos. El síntoma es siempre un `ModuleNotFoundError` que solo ocurre empaquetado.

Hay un fichero de avisos en `build/MiPrograma/warn-MiPrograma.txt` con los módulos que PyInstaller no encontró, pero avisa: **son cientos de líneas y casi todas son ruido** (módulos de Windows en macOS y al revés). Sirve para buscar un nombre concreto que sospechas, no para leerlo de arriba abajo.

## El icono

```bash
pyinstaller --windowed --icon recursos/icono.png --name MiPrograma programa.py
```

Históricamente había que dar un `.ico` en Windows y un `.icns` en macOS. Las versiones actuales aceptan un PNG y hacen la conversión:

```consola
>>> # dist/MiPrograma.app/Contents/Resources/
generated-91db3f25...4ae4773.icns
```

Y aquí se cierra el aviso que quedó abierto en la lección 4: en macOS, `iconphoto()` no pinta un icono por ventana, porque el icono de una aplicación es el de su paquete. **Este `--icon` es el que lo pone.** En Windows y Linux funcionan los dos, y conviene hacer las dos cosas.

## El fichero `.spec`

La primera vez que ejecutas PyInstaller, genera un `MiPrograma.spec` con todo lo que le has pedido:

```python
a = Analysis(
    ['programa.py'],
    datas=[('recursos', 'recursos')],
    hiddenimports=[],
    # ...y otras veinte opciones que PyInstaller rellena por ti
)
```

A partir de ahí puedes construir con `pyinstaller MiPrograma.spec` en vez de repetir todas las opciones, y editarlo cuando la línea de comandos se hace larga. Conviene **guardarlo en el repositorio** y no en `.gitignore`: es la receta de cómo se construye tu programa. Lo que sí van al `.gitignore` son `build/` y `dist/`.

## Lista de comprobación antes de mandarlo

1. **Ejecutarlo en otra carpeta**, no en `dist/`, para cazar las rutas relativas.
2. **Cerrarlo y volver a abrirlo**, y comprobar que recuerda lo que debe. Es la prueba de la carpeta temporal.
3. **Construirlo sin `--windowed` una vez** y ejecutarlo desde la terminal, para ver los avisos que en modo ventana no salen.
4. **Probarlo en un ordenador sin Python.** Es la única prueba real, porque en el tuyo hay demasiadas cosas instaladas.
5. **Comprobar el tamaño.** Si son 300 MB, probablemente estás arrastrando algo que no usas; se quita con `--exclude-module`.

Y una advertencia práctica que no es técnica: **los dos sistemas van a desconfiar de tu programa.** En Windows, Defender avisará de un editor desconocido; en macOS, Gatekeeper dirá que no se puede abrir porque no se ha podido comprobar el desarrollador. Se arregla firmando el programa, lo que requiere pagar una cuenta de desarrollador en los dos casos, y eso queda fuera de este curso. Mientras tanto, a quien le mandes el programa habrá que explicarle cómo abrirlo de todas formas (botón derecho, Abrir, en macOS).

## El ejemplo

Un módulo de rutas que resuelve los tres casos, más el arranque con el gancho de errores. Es lo que hay que añadir a cualquier programa de los bloques anteriores para que se pueda empaquetar.

```python title="rutas.py"
"""Dónde está cada cosa, empaquetado o no. Sin tkinter: es lógica."""

import os
import pathlib
import sys

APLICACION = "MiPrograma"


def empaquetado():
        """sys.frozen solo existe dentro de un paquete de PyInstaller."""
    return getattr(sys, "frozen", False)


def base_de_recursos():
        """Los ficheros de datos que viajan con el programa. Solo para leer.

    Empaquetado están en sys._MEIPASS, que con --onefile es una carpeta
    temporal distinta en cada arranque; sin empaquetar, junto a este fichero.
    """
    return pathlib.Path(getattr(sys, "_MEIPASS", pathlib.Path(__file__).parent))


def recurso(*partes):
        return base_de_recursos().joinpath(*partes)


def carpeta_de_datos():
        """Donde el programa escribe. NUNCA junto al ejecutable: con --onefile
    eso es una carpeta temporal que se borra al salir, y las preferencias
    desaparecen en cada arranque sin dar ningún error."""
    if sys.platform == "darwin":
                base = pathlib.Path.home() / "Library" / "Application Support"
    elif sys.platform == "win32":
                base = pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home()))
    else:
                base = pathlib.Path(os.environ.get(
            "XDG_CONFIG_HOME", pathlib.Path.home() / ".config"))
    carpeta = base / APLICACION
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


def fichero_de_registro():
        return carpeta_de_datos() / "registro.log"


def informe():
        """Para depurar el paquete en el ordenador de otra persona."""
    return {
        "empaquetado": empaquetado(),
        "ejecutable": str(sys.executable),
        "recursos": str(base_de_recursos()),
        "datos": str(carpeta_de_datos()),
        "directorio actual": str(pathlib.Path.cwd()),
    }
```

```python title="arranque.py"
"""El arranque que hace visible lo que --windowed esconde."""

import logging
import sys
import tkinter as tk
from tkinter import messagebox, ttk

import rutas

MARGEN = 12
AIRE = 6
GRIS = "#8E8E93"


def preparar_registro():
        """Un fichero de registro es lo único que permite que alguien te cuente
    qué ha pasado en su ordenador."""
    logging.basicConfig(
        filename=rutas.fichero_de_registro(),
        filemode="a",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    logging.info("Arranque: %s", rutas.informe())


class Aplicacion(tk.Tk):

        def __init__(self):
                super().__init__()
        self.title("Listo para empaquetar")
        self.minsize(520, 360)

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        ttk.Label(cuerpo, text="Dónde está cada cosa",
                  font=("", 14, "bold")).pack(anchor="w")
        tabla = ttk.Frame(cuerpo)
        tabla.pack(fill="x", pady=(AIRE, MARGEN))
        for fila, (clave, valor) in enumerate(rutas.informe().items()):
                        ttk.Label(tabla, text=f"{clave}:").grid(row=fila, column=0,
                                                    sticky="w", padx=(0, AIRE))
            ttk.Label(tabla, text=str(valor), foreground=GRIS,
                      wraplength=360).grid(row=fila, column=1, sticky="w")

        ttk.Separator(cuerpo, orient="horizontal").pack(fill="x")
        ttk.Label(cuerpo, text="Comprobaciones", font=("", 12, "bold")).pack(
            anchor="w", pady=(MARGEN, AIRE))
        ttk.Button(cuerpo, text="Leer un recurso empaquetado",
                   command=self.leer_recurso).pack(anchor="w")
        ttk.Button(cuerpo, text="Escribir en la carpeta de datos",
                   command=self.escribir_dato).pack(anchor="w", pady=AIRE)
        ttk.Button(cuerpo, text="Provocar un error a propósito",
                   command=self.reventar).pack(anchor="w")

        self.estado = tk.StringVar(value="Sin probar nada todavía")
        ttk.Label(cuerpo, textvariable=self.estado, wraplength=460).pack(
            anchor="w", pady=(MARGEN, 0))

    def report_callback_exception(self, clase, valor, rastro):
                """Tkinter llama a esto ante cualquier excepción de un command, un
        bind o un after. Sin esto, el rastro va a una salida de errores que
        con --windowed no ve nadie, y el programa sigue medio roto."""
        logging.exception("Fallo en la interfaz",
                          exc_info=(clase, valor, rastro))
        messagebox.showerror(
            "Error inesperado",
            f"{clase.__name__}: {valor}",
            detail=f"Se ha anotado en {rutas.fichero_de_registro()}",
            parent=self)

    def leer_recurso(self):
                ruta = rutas.recurso("recursos", "datos.txt")
        try:
                        self.estado.set(f"Leído de {ruta}: {ruta.read_text().strip()!r}")
        except OSError as error:
                        self.estado.set(f"No está empaquetado el recurso: {error}")

    def escribir_dato(self):
                ruta = rutas.carpeta_de_datos() / "visitas.txt"
        anterior = ruta.read_text() if ruta.exists() else ""
        ruta.write_text(anterior + "una visita\n")
        cuantas = len(ruta.read_text().splitlines())
        self.estado.set(f"{cuantas} visitas anotadas en {ruta}. "
                        "Cierra y vuelve a abrir: el número tiene que subir.")

    def reventar(self):
                raise ValueError("un error de mentira, para ver si se ve")


def main():
        preparar_registro()
    try:
                Aplicacion().mainloop()
    except Exception:
        # El __init__ pasa antes de que haya bucle de eventos, así que
        # report_callback_exception no lo cubre.
                logging.exception("Fallo durante el arranque")
        raise


if __name__ == "__main__":
        main()
```

Y el comando que lo construye:

```bash
pyinstaller --onedir --windowed --name MiPrograma \
    --icon recursos/icono.png \
    --add-data "recursos:recursos" \
    arranque.py
```

> [!resumen] En resumen
>
> PyInstaller mete tu código, el intérprete y las bibliotecas en algo que se abre con doble clic, y es la forma de dar un programa con ventana a quien no tiene Python (para herramientas de terminal, la vía buena sigue siendo el `pipx` de la lección 22 del módulo 2). **No compila, no oculta el código, no acelera nada y no sirve para otro sistema operativo**: un `.exe` hay que construirlo en Windows. Las opciones de partida son `--windowed` (sin ventana de terminal detrás; en macOS es lo que produce un `.app`) y `--name`. Entre **`--onefile` y `--onedir`**, medido en el mismo programa: 10 MB y 1323 ms de arranque frente a 26 MB y 695 ms, porque `--onefile` se descomprime entero en cada ejecución. Y la consecuencia grave: **con `--onefile`, `sys._MEIPASS` es una carpeta temporal distinta cada vez y se borra al salir**, así que un programa que guarda su configuración junto a `__file__` la escribe sin error y la pierde en cada arranque, para siempre y sin ningún mensaje; funciona en tu máquina y en `--onedir`, y falla solo ahí. La regla es **dentro del paquete se lee, nunca se escribe**, y la configuración va donde dijo la lección 43. Los ficheros de datos se incluyen con `--add-data "origen:destino"`, con **punto y coma en Windows**, y se encuentran con `getattr(sys, "_MEIPASS", pathlib.Path(__file__).parent)`; `sys.frozen` dice si estás empaquetado. **El directorio actual es de donde se lanzó el programa**, así que ninguna ruta relativa vale. Cuando el programa **no abre y no dice nada**, es un error sin capturar que con `--windowed` no tiene dónde escribirse: comprobado que el programa arranca, falla y el usuario no ve nada. Las salidas son construir sin `--windowed` y ejecutar desde la terminal (en macOS basta lanzar el binario de dentro del `.app`), poner un fichero de registro, y sobre todo **reemplazar `report_callback_exception`**, el gancho de Tkinter que recibe las excepciones de `command`, `bind` y `after`, que por defecto se imprimen en la salida de errores **sin parar el programa**, dejándolo medio roto en silencio; lo que ese gancho no cubre son los errores del `__init__`, para los que hace falta un `try`/`except` alrededor del arranque. PyInstaller detecta las dependencias **leyendo los `import`**, incluidos los que están dentro de un `try` (la dependencia opcional de la lección 44 se incluye bien), pero **no los de `importlib.import_module("nombre")`**, que dan un `ModuleNotFoundError` solo empaquetado y se arreglan con `--hidden-import`; el fichero `warn-*.txt` sirve para buscar un nombre concreto, no para leerlo, porque son cientos de líneas de ruido. El `--icon` acepta ya un PNG y lo convierte, y es lo que cierra el aviso de la lección 4 sobre el icono en macOS. El `.spec` que se genera la primera vez es la receta de la construcción: se guarda en el repositorio, y `build/` y `dist/` van al `.gitignore`. Antes de mandarlo: ejecutarlo desde otra carpeta, cerrarlo y reabrirlo para ver si recuerda, construirlo una vez con consola, probarlo en un ordenador sin Python, y contar con que **Defender y Gatekeeper van a desconfiar** hasta que se firme el programa.

> [!ejercicio] Practica
>
> 1. Instala PyInstaller en un entorno virtual y empaqueta con `--onedir --windowed` cualquier programa de las lecciones anteriores.
> 2. Empaquétalo también con `--onefile`. Compara el tamaño con `du -sh` y el tiempo de arranque.
> 3. Escribe un programa que imprima `sys.frozen`, `sys.executable`, `__file__`, `sys._MEIPASS` y `pathlib.Path.cwd()`. Ejecútalo sin empaquetar, en `--onedir` y en `--onefile`, y pon los tres resultados en una tabla.
> 4. Haz que ese programa escriba un fichero junto a `__file__` con la hora, y que al arrancar imprima lo que había. Ejecútalo dos veces en `--onedir` y dos veces en `--onefile`. Explica la diferencia.
> 5. Arréglalo usando la `carpeta_de_datos()` del ejemplo y comprueba que ahora recuerda en los dos modos.
> 6. Añade una carpeta `recursos` con un fichero de texto. Empaqueta **sin** `--add-data` y comprueba el error; después con `--add-data` y comprueba que se lee.
> 7. Cambia `recurso()` por `open("recursos/datos.txt")` a secas. Ejecuta el programa desde otra carpeta y copia el error.
> 8. Haz que el programa lance una excepción en el `__init__`. Empaquétalo con `--windowed`, ábrelo con doble clic y anota qué ves.
> 9. Ejecuta el binario de dentro del paquete desde la terminal y copia el rastro.
> 10. Añade `report_callback_exception` y un botón que divida por cero. Comprueba que ahora sale un diálogo.
> 11. Comprueba que el gancho **no** captura un error del `__init__`, y añade el `try`/`except` del arranque.
> 12. Carga un módulo con `importlib.import_module("sqlite3")`, empaqueta y ejecuta. Copia el error y arréglalo con `--hidden-import`.
> 13. Busca `sqlite3` en el fichero `warn-*.txt` de `build/` y cuenta cuántas líneas tiene el fichero entero.
> 14. Añade un icono con `--icon` y comprueba que aparece en el paquete.
> 15. Abre el `.spec` generado, añade una entrada a `hiddenimports` a mano y construye con `pyinstaller MiPrograma.spec`.
