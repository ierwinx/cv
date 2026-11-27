---
titulo: "Estructura de un proyecto"
resumen: "Cómo se reparte una herramienta de terminal en carpetas y ficheros, y por qué la lógica no debe saber nada de la pantalla."
minutos: 26
orden: 20
---

Hasta ahora tus programas han cabido en un fichero. Funciona mientras el programa sea tuyo y de hoy, pero en cuanto quieras que otra persona lo instale, que haya pruebas automáticas o que la misma lógica sirva más adelante para una ventana o para una web, el fichero suelto se queda corto: no se puede importar limpiamente, no se puede empaquetar y no se puede probar sin ejecutar el menú entero.

Un proyecto de verdad tiene una forma reconocible. No es una convención caprichosa: cada carpeta y cada fichero está donde está por una razón concreta, y quien abra tu repositorio sabrá orientarse en treinta segundos porque ya ha visto esa misma forma diez veces.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás montar la disposición `src/`, repartir el código entre `__init__.py`, `__main__.py`, `cli.py` y los módulos del núcleo, y explicar por qué la lógica no debe imprimir ni preguntar nada.

## El proyecto de ejemplo

Todo el módulo va a girar en torno a la misma herramienta: `misgastos`, un programa que apunta gastos en un fichero JSON y los resume por categoría. Es pequeña a propósito, pero tiene las tres partes que tiene cualquier herramienta: unos datos, unas operaciones sobre esos datos y una manera de manejarla desde la terminal.

Este es el árbol completo:

```text
misgastos/
├── src/
│   └── misgastos/
│       ├── __init__.py
│       ├── __main__.py
│       ├── cli.py
│       ├── modelo.py
│       └── almacen.py
├── tests/
│   ├── test_modelo.py
│   ├── test_almacen.py
│   └── test_cli.py
├── .gitignore
├── LICENSE
├── pyproject.toml
└── README.md
```

Doce ficheros para un programa de doscientas líneas puede parecer exagerado. Lo que sigue explica qué aporta cada uno.

## La disposición `src/`

Fíjate en que el paquete `misgastos` no está en la raíz del proyecto, sino dentro de una carpeta `src/`. Esa carpeta no es un paquete: no tiene `__init__.py` y nunca se importa. Solo sirve para que el paquete real no esté al mismo nivel que el `pyproject.toml`, el `README.md` y la carpeta `tests/`.

La alternativa, llamada **disposición plana**, pone el paquete directamente en la raíz:

```text
misgastos/
├── misgastos/
│   ├── __init__.py
│   └── cli.py
├── tests/
└── pyproject.toml
```

Se escribe menos y parece más sencilla. El problema aparece en cuanto empaquetas.

### Por qué se prefiere `src/`

Recuerda de la lección de módulos que Python busca primero en la carpeta desde la que ejecutas. Con la disposición plana, si te sitúas en la raíz del proyecto, el paquete se importa **aunque no lo hayas instalado**:

```bash
python -c "import misgastos; print(misgastos.__version__, '->', misgastos.__file__)"
```

```salida
0.1.0 -> /home/erwin/proyectos/misgastos/misgastos/__init__.py
```

Ahí no se ha instalado nada. Python ha encontrado la carpeta `misgastos/` al lado y la ha importado directamente. Eso significa que tus pruebas pasarán, tus ejemplos funcionarán y tú estarás convencido de que todo va bien, mientras que la persona que instale el paquete recibirá un módulo que falta, un fichero de datos que no se copió o un `__init__.py` que se quedó fuera. El error solo aparece en el ordenador de otro.

Con `src/`, eso no puede pasar. Desde la raíz del proyecto no hay ninguna carpeta `misgastos` que importar:

```bash
python -c "import misgastos"
```

```salida
  File "<string>", line 1, in <module>
    import misgastos
ModuleNotFoundError: No module named 'misgastos'
```

Si quieres usar el paquete, tienes que instalarlo. Y en cuanto lo instalas, estás probando exactamente lo mismo que probará quien te lo descargue.

Hay un segundo motivo, más prosaico. Las herramientas de empaquetado buscan solas los paquetes que hay en la raíz, y no siempre aciertan. Con la disposición plana y dos carpetas con `__init__.py` al lado, la instalación se para en seco:

```bash
pip install -e .
```

```salida
  × Getting requirements to build editable did not run successfully.
  │ exit code: 1
  ╰─> [14 lines of output]
      error: Multiple top-level packages discovered in a flat-layout: ['misgastos', 'utilidades'].

      To avoid accidental inclusion of unwanted files or directories,
      setuptools will not proceed with this build.

      If you are trying to create a single distribution with multiple packages
      on purpose, you should not rely on automatic discovery.
      Instead, consider the following options:

      1. set up custom discovery (`find` directive with `include` or `exclude`)
      2. use a `src-layout`
      3. explicitly set `py_modules` or `packages` with a list of names

      To find more information, look for "package discovery" on setuptools docs.
      [end of output]
```

La propia herramienta te sugiere la disposición `src/` como segunda opción. Con `src/` no hay ambigüedad posible: lo que hay dentro es el paquete, lo que hay fuera no.

> [!aviso] La carpeta `tests/` acaba instalándose sin que te enteres
>
> En la disposición plana, si tu carpeta `tests/` tiene un `__init__.py`, las herramientas de empaquetado la tratan como un paquete más y la instalan junto al tuyo. El resultado es que cualquiera que instale tu herramienta tendrá un módulo llamado `tests` importable a nivel global, pisando el de cualquier otro proyecto que haya hecho lo mismo. Con `src/` el problema desaparece solo.

## Qué va en cada fichero

### `__init__.py`: la identidad del paquete

Corto y con una sola responsabilidad de verdad: decir qué versión es esto.

```python title="src/misgastos/__init__.py"
"""misgastos: registro de gastos personales desde la terminal."""

__version__ = "0.1.0"
```

La variable `__version__` es una convención que entiende todo el ecosistema. La usarás en la opción `--version` del programa y la verás repetida en el `pyproject.toml`. Ponerla aquí permite que cualquier módulo la lea con un `from misgastos import __version__` sin leer ficheros de configuración.

Si el paquete tuviera una cara pública que enseñar, este sería el sitio para subirla a primer plano con unos cuantos `from ... import ...`, como viste en la lección de paquetes. En una herramienta de terminal normalmente no hace falta: nadie va a importar `misgastos` desde otro programa.

### `modelo.py` y `almacen.py`: el núcleo

Aquí vive lo que hace el programa. Y aquí está la regla más importante de toda la lección: **estos módulos no imprimen nada y no llaman a `input()`**.

```python title="src/misgastos/modelo.py"
"""El gasto y las operaciones sobre una lista de gastos.

Este módulo no imprime nada y no llama a input(). Solo maneja datos.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal


CATEGORIAS = ("comida", "transporte", "ocio", "casa", "otros")


@dataclass
class Gasto:
        """Un gasto apuntado."""

    concepto: str
    importe: Decimal
    categoria: str = "otros"
    fecha: str = field(default_factory=lambda: date.today().isoformat())

    def __post_init__(self) -> None:
                self.concepto = self.concepto.strip()
        if not self.concepto:
                        raise ValueError("El concepto no puede estar vacío")
        # Pasa por str: así un importe leído del JSON como texto o llegado
        # como float acaba siendo siempre un Decimal exacto.
        self.importe = Decimal(str(self.importe))
        if self.importe <= 0:
                        raise ValueError(f"El importe debe ser positivo, no {self.importe}")
        if self.categoria not in CATEGORIAS:
                        raise ValueError(f"Categoría desconocida: {self.categoria}")


def total(gastos: list[Gasto]) -> Decimal:
        """Suma los importes de todos los gastos."""
    return sum((gasto.importe for gasto in gastos), Decimal("0"))


def total_por_categoria(gastos: list[Gasto]) -> dict[str, Decimal]:
        """Devuelve cuánto se ha gastado en cada categoría, de mayor a menor."""
    sumas: dict[str, Decimal] = {}
    for gasto in gastos:
                sumas[gasto.categoria] = (sumas.get(gasto.categoria, Decimal("0"))
                                  + gasto.importe)
    return dict(sorted(sumas.items(), key=lambda par: par[1], reverse=True))


def filtrar(gastos: list[Gasto], categoria: str | None = None) -> list[Gasto]:
        """Devuelve los gastos de una categoría, o todos si no se indica ninguna."""
    if categoria is None:
                return list(gastos)
    return [gasto for gasto in gastos if gasto.categoria == categoria]
```

Cuando un dato no vale, se lanza una excepción. No se imprime un mensaje de error: el módulo no sabe si hay una pantalla al otro lado.

Un apunte sobre el importe antes de seguir. Es un `Decimal` y no un `float`, que es la promesa que dejó pendiente la lección 2 del módulo 1: con euros y céntimos, los errores de redondeo de la coma flotante se acumulan y descuadran las cuentas. Aquí sale gratis, porque `argparse` acepta `type=Decimal` igual que aceptaba `type=float`, y el `__post_init__` lo normaliza pasando por texto.

El almacenamiento va aparte, por el mismo motivo: son dos responsabilidades distintas y cambian por razones distintas. Si mañana guardas en una base de datos, `modelo.py` no se toca.

```python title="src/misgastos/almacen.py"
"""Lectura y escritura de los gastos en un fichero JSON.

Tampoco imprime nada: si algo va mal, lanza una excepción.
"""

import json
from dataclasses import asdict
from pathlib import Path

from misgastos.modelo import Gasto


def cargar(ruta: Path) -> list[Gasto]:
        """Lee los gastos del fichero. Si no existe, devuelve una lista vacía."""
    if not ruta.exists():
                return []
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    return [Gasto(**fila) for fila in datos]


def guardar(ruta: Path, gastos: list[Gasto]) -> None:
        """Escribe los gastos en el fichero, creando la carpeta si hace falta."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    # El importe se escribe como texto: json.dumps no sabe serializar un
    # Decimal, y convertirlo a float perdería la exactitud que buscábamos.
    datos = [asdict(gasto) | {"importe": str(gasto.importe)} for gasto in gastos]
    ruta.write_text(
        json.dumps(datos, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
```

Fíjate en las importaciones: `from misgastos.modelo import Gasto`, con el nombre completo del paquete. Dentro de un paquete instalado, esa es la forma que funciona siempre, tanto si ejecutas el comando como si ejecutas `python -m misgastos` como si corres las pruebas.

### `cli.py`: la capa de terminal

Y aquí, y solo aquí, está todo lo que tiene que ver con la línea de comandos: el análisis de argumentos, los `print`, los mensajes a `stderr` y los códigos de salida.

```python title="src/misgastos/cli.py"
"""La capa de terminal: argumentos, mensajes y códigos de salida."""

import argparse
import sys
from decimal import Decimal
from pathlib import Path

from misgastos import __version__
from misgastos.almacen import cargar, guardar
from misgastos.modelo import CATEGORIAS, Gasto, filtrar, total, total_por_categoria

FICHERO_POR_DEFECTO = Path("gastos.json")


def crear_analizador() -> argparse.ArgumentParser:
        """Construye el analizador de argumentos con sus subcomandos."""
    analizador = argparse.ArgumentParser(
        prog="misgastos",
        description="Apunta tus gastos y consulta cuánto llevas gastado.",
    )
    analizador.add_argument("--version", action="version", version=f"misgastos {__version__}")
    analizador.add_argument(
        "-f",
        "--fichero",
        type=Path,
        default=FICHERO_POR_DEFECTO,
        help="fichero JSON donde se guardan los gastos",
    )

    subcomandos = analizador.add_subparsers(dest="comando", required=True)

    anadir = subcomandos.add_parser("anadir", help="apunta un gasto nuevo")
    anadir.add_argument("concepto", help="en qué te lo has gastado")
    anadir.add_argument("importe", type=Decimal, help="cuánto, en euros")
    anadir.add_argument("-c", "--categoria", choices=CATEGORIAS, default="otros")

    listar = subcomandos.add_parser("listar", help="muestra los gastos apuntados")
    listar.add_argument("-c", "--categoria", choices=CATEGORIAS)

    subcomandos.add_parser("resumen", help="muestra el total por categoría")

    return analizador


def comando_anadir(argumentos: argparse.Namespace) -> int:
        gastos = cargar(argumentos.fichero)
    gasto = Gasto(argumentos.concepto, argumentos.importe, argumentos.categoria)
    gastos.append(gasto)
    guardar(argumentos.fichero, gastos)
    print(f"Apuntado: {gasto.concepto} ({gasto.importe:.2f} €, {gasto.categoria})")
    return 0


def comando_listar(argumentos: argparse.Namespace) -> int:
        gastos = filtrar(cargar(argumentos.fichero), argumentos.categoria)
    if not gastos:
                print("No hay gastos apuntados.")
        return 0
    for gasto in gastos:
                print(f"{gasto.fecha}  {gasto.concepto:<28} {gasto.importe:>8.2f} €  {gasto.categoria}")
    print(f"{'TOTAL':<40} {total(gastos):>8.2f} €")
    return 0


def comando_resumen(argumentos: argparse.Namespace) -> int:
        gastos = cargar(argumentos.fichero)
    if not gastos:
                print("No hay gastos apuntados.")
        return 0
    for categoria, importe in total_por_categoria(gastos).items():
                print(f"{categoria:<14} {importe:>8.2f} €")
    return 0


def main(argv: list[str] | None = None) -> int:
        """Punto de entrada. Devuelve el código de salida del programa."""
    analizador = crear_analizador()
    argumentos = analizador.parse_args(argv)

    acciones = {
        "anadir": comando_anadir,
        "listar": comando_listar,
        "resumen": comando_resumen,
    }
    try:
                return acciones[argumentos.comando](argumentos)
    except ValueError as error:
                print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
        sys.exit(main())
```

Tres detalles de este fichero que van a importar mucho en las lecciones siguientes:

- **`crear_analizador` es una función aparte** en vez de montarse dentro de `main`. Así se puede pedir el analizador desde una prueba y examinarlo sin ejecutar el programa.
- **`main` recibe `argv` como parámetro**, con `None` por defecto. Cuando vale `None`, `parse_args` lee `sys.argv` como siempre; cuando recibe una lista, analiza esa lista. Es una línea de código y convierte un programa imposible de probar en uno trivial de probar.
- **`main` devuelve un entero** en lugar de llamar a `sys.exit()`. El que decide morir es quien llama, no la función. Por eso el `if __name__` del final hace `sys.exit(main())`.

### `__main__.py`: ejecutar el paquete con `python -m`

Un paquete con un fichero llamado `__main__.py` se puede lanzar con `python -m nombre_del_paquete`. Python importa el paquete y a continuación ejecuta ese fichero.

```python title="src/misgastos/__main__.py"
"""Permite ejecutar el paquete con python -m misgastos."""

import sys

from misgastos.cli import main

sys.exit(main())
```

Tres líneas, y con ellas la herramienta ya se puede usar sin instalar el comando:

```bash
python -m misgastos resumen
```

```salida
comida            55.80 €
ocio              18.00 €
transporte         2.40 €
```

Eso funciona con el paquete instalado, que es lo que verás en la lección siguiente. Mientras tanto, y solo para ir probando, la misma orden funciona si te sitúas dentro de `src/`, porque desde ahí Python sí encuentra la carpeta `misgastos`.

Merece la pena tener el `__main__.py` aunque el comando instalado funcione, porque hay situaciones en las que el comando no está disponible y `python -m` sí: al depurar con otro intérprete, al ejecutar desde un `subprocess` en las pruebas o cuando la carpeta de los comandos no está en el `PATH`.

> [!nota] Aquí no se pone `if __name__ == "__main__":`
>
> En un fichero normal, ese `if` distingue entre ejecutarlo y importarlo. En un `__main__.py` no hace falta: Python solo lo ejecuta cuando alguien escribe `python -m paquete`, y en ese caso `__name__` ya vale `"__main__"`. Ponerlo no rompe nada, pero sobra.

## La separación entre la interfaz y el núcleo

Todo lo anterior se resume en una línea imaginaria que parte el paquete en dos:

| Fichero | Sabe de la terminal | Responsabilidad |
| --- | --- | --- |
| `__init__.py` | No | La versión del paquete |
| `modelo.py` | No | Qué es un gasto y qué operaciones admite |
| `almacen.py` | No | Leer y escribir el fichero |
| `cli.py` | Sí | Argumentos, mensajes, códigos de salida |
| `__main__.py` | Sí | Arrancar con `python -m` |

Es la misma separación que ya hiciste en el proyecto del gestor de tareas, pero ahora con ficheros distintos en vez de con funciones distintas dentro del mismo fichero, y eso la hace mucho más difícil de romper por descuido: para meter un `print` en el núcleo tienes que abrir otro fichero, y al abrirlo lees el docstring que dice que ahí no se imprime.

La consecuencia práctica es la que ya conoces, pero conviene decirla entera. El día que quieras poner esta herramienta detrás de una ventana de Tkinter, escribirás un `ventana.py` nuevo que importe `modelo` y `almacen` y tire `cli.py` a la basura. El día que quieras una web con Django, igual. Si la validación del importe estuviera metida en el `comando_anadir`, tendrías que reescribirla, y reescribir una validación es reescribir sus errores.

Hay una forma rápida de comprobar si la línea está bien puesta: **busca `print` y `input` en el núcleo**. Si no hay ninguno, va bien.

> [!consejo] Las excepciones son la frontera
>
> El núcleo avisa de los problemas lanzando excepciones; la capa de terminal las captura y decide qué contar y con qué código salir. Mira otra vez el `try` de `main`: el `ValueError` puede venir de `Gasto.__post_init__` o del `json.loads` de `almacen`, y en los dos casos acaba en el mismo sitio, convertido en un mensaje por `stderr` y un código de salida 1. El núcleo no ha tenido que enterarse de que existía una terminal.

## Los ficheros que acompañan al proyecto

Fuera de `src/` quedan cinco cosas que no son código pero sin las cuales el proyecto no está terminado.

### `pyproject.toml`

El fichero que convierte una carpeta con código en algo instalable. Declara el nombre, la versión, las dependencias y el comando que se va a crear. Es el tema de la lección siguiente, así que por ahora basta con saber que va en la raíz y que es el único fichero de configuración que necesita un proyecto Python moderno.

### `README.md`

Lo primero que lee cualquiera, incluido tú dentro de seis meses. Con cuatro apartados sobra: qué hace el programa, cómo se instala, cómo se usa y con qué licencia. Y va en la raíz porque tanto los sitios de alojamiento de código como el índice de paquetes lo buscan exactamente ahí.

```text title="README.md"
# misgastos

Apunta tus gastos desde la terminal y consulta el total por categoría.

## Instalación

pipx install misgastos

## Uso

misgastos anadir "Café" 1.60 -c comida
misgastos listar
misgastos resumen
```

### `LICENSE`

El texto de la licencia, tal cual, sin modificar. Sin él, tu código es propiedad tuya y nadie puede usarlo legalmente ni aunque esté publicado. La MIT es la elección habitual para herramientas pequeñas: permite hacer casi cualquier cosa siempre que se conserve el aviso de autoría.

### `.gitignore`

La lista de lo que no se sube al repositorio. En un proyecto empaquetado hay más cosas que ignorar que en un script suelto, porque la construcción del paquete genera carpetas propias:

```text title=".gitignore"
.venv/
__pycache__/
*.pyc
dist/
build/
*.egg-info/
.pytest_cache/
```

### `tests/`

Las pruebas automáticas, en una carpeta hermana de `src/` y no dentro del paquete. La razón es la misma de antes: las pruebas son tuyas, no de quien instala la herramienta, y con esta disposición no se empaquetan por accidente. Es el tema de la lección 23.

## El recorrido de una ejecución

Con todas las piezas en su sitio, esto es lo que pasa exactamente cuando escribes una orden:

```bash
misgastos anadir "Café con leche" 1.60 -c comida
```

```salida
Apuntado: Café con leche (1.60 €, comida)
```

Paso a paso:

1. La terminal encuentra un ejecutable llamado `misgastos` y lo lanza. Ese ejecutable lo creó la instalación a partir del `pyproject.toml`, y lo único que hace es importar `misgastos.cli` y llamar a su función `main`.
2. `main` pide el analizador a `crear_analizador()` y le pasa los argumentos. `argparse` reconoce el subcomando `anadir`, convierte `"1.60"` en `Decimal("1.60")` porque la opción se declaró con `type=Decimal`, y comprueba que `comida` está en la lista de categorías permitidas.
3. `main` busca en su diccionario la función del subcomando y llama a `comando_anadir`.
4. `comando_anadir` llama a `almacen.cargar`, que lee `gastos.json` y devuelve una lista de objetos `Gasto`. Si el fichero no existe todavía, devuelve una lista vacía.
5. Construye un `Gasto` nuevo. En ese momento se ejecuta `__post_init__`, que limpia el concepto y valida el importe y la categoría. Si algo no cuadra, lanza `ValueError` y el flujo salta directamente al `except` de `main`.
6. Añade el gasto a la lista y llama a `almacen.guardar`, que vuelca la lista entera a JSON.
7. Imprime el mensaje de confirmación y devuelve `0`.
8. El `sys.exit(main())` del ejecutable convierte ese `0` en el código de salida del proceso.

Cuenta cuántos de esos ocho pasos ocurren en un fichero que sabe que existe una terminal: el 1, el 2, el 3, el 7 y el 8. Los pasos 4, 5 y 6, que son los que hacen el trabajo, podrían ejecutarse igual desde una ventana, desde una web o desde una prueba automática.

Y si algo falla, el recorrido se acorta:

```bash
misgastos anadir "Devolución" -3
```

```salida
Error: El importe debe ser positivo, no -3.0
```

```bash
echo $?
```

```salida
1
```

El mensaje lo ha escrito `cli.py` en `stderr`; el texto lo ha redactado `modelo.py` al lanzar la excepción. Cada capa aporta lo suyo.

> [!error] ModuleNotFoundError: No module named 'misgastos'
>
> Con la disposición `src/`, este error es lo normal hasta que instalas el paquete: desde la raíz del proyecto no hay ninguna carpeta `misgastos` que Python pueda encontrar. La solución no es añadir rutas a mano ni copiar ficheros, sino instalar el proyecto en tu entorno virtual con `pip install -e .`, que es justo lo que verás en la lección siguiente.
>
> Si ya lo has instalado y sigue saliendo, comprueba que el entorno virtual está activado en esa terminal.

> [!resumen] En resumen
>
> Una herramienta de terminal se reparte en un paquete dentro de una carpeta `src/`, que impide que Python importe el código sin haberlo instalado y obliga a que pruebes lo mismo que recibirá quien te lo descargue. Dentro del paquete, `__init__.py` guarda la versión, `__main__.py` permite lanzarlo con `python -m`, `cli.py` concentra los argumentos y los mensajes, y los módulos del núcleo manejan los datos sin imprimir ni preguntar nada: avisan de los problemas lanzando excepciones y dejan que la capa de terminal decida qué contar. Esa separación es la decisión de diseño más importante del módulo, porque es lo que permite reutilizar la lógica detrás de otra interfaz sin reescribirla. Alrededor del paquete van el `pyproject.toml` que lo hace instalable, el `README.md`, el `LICENSE`, el `.gitignore` con las carpetas que genera la construcción y una carpeta `tests/` hermana de `src/`.

> [!ejercicio] Practica
>
> Monta el esqueleto de una herramienta tuya, en una carpeta nueva llamada `misnotas/`.
>
> 1. Crea el árbol completo: `src/misnotas/` con sus cuatro ficheros, una carpeta `tests/` vacía y los ficheros `README.md`, `LICENSE`, `.gitignore` y un `pyproject.toml` vacío por ahora.
> 2. Escribe `modelo.py` con una dataclass `Nota` que tenga título, texto y fecha, y que valide en `__post_init__` que el título no está vacío. Añade funciones `buscar` y `contar_por_mes`. Comprueba a mano que no hay ni un `print` en el fichero.
> 3. Escribe `almacen.py` con `cargar` y `guardar` sobre un JSON, copiando el patrón de `misgastos`.
> 4. Escribe `cli.py` con `crear_analizador`, tres subcomandos y un `main(argv=None)` que devuelva un entero.
> 5. Escribe `__main__.py` y comprueba que `python -m misnotas` funciona. Necesitarás situarte dentro de `src/` para que Python encuentre el paquete, y ese incordio es exactamente el motivo de la lección siguiente.
> 6. Haz una copia del proyecto con la disposición plana, añade una segunda carpeta con `__init__.py` al lado del paquete e intenta instalarla. Lee el error entero y compáralo con el de esta lección.
