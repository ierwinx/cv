---
titulo: "Proyecto: organizador de ficheros"
resumen: "Una herramienta que ordena la carpeta de descargas por tipo de fichero, con modo de simulación, recursividad y resumen en tabla."
minutos: 39
orden: 26
---

Abre tu carpeta de descargas. Si se parece a la media, ahí dentro conviven facturas en PDF, capturas de pantalla, instaladores que ya no sirven y algún vídeo que pesa dos gigas. Ordenarlo a mano lleva veinte minutos y se vuelve a desordenar en una semana.

Este es el primero de los tres proyectos que cierran el módulo, y el más sencillo de los tres. Junta `argparse` y `pathlib` en una herramienta que se usa de verdad, y sirve para asentar un patrón que vas a repetir el resto de tu vida como programador: **separar el decidir del hacer**.

> [!objetivo] Qué vas a aprender
>
> Construir una herramienta de terminal que reparte los ficheros de una carpeta en subcarpetas por categoría. Se practica `pathlib` para recorrer y mover ficheros, `argparse` con posicionales y banderas, el manejo de colisiones de nombre, los códigos de salida, los mensajes de error por `stderr` y, sobre todo, el modo de simulación que toda herramienta que borra o mueve cosas debería tener.

## Cómo se va a usar

Antes de escribir una línea, conviene tener clarísimo qué se teclea y qué se ve. La herramienta terminada se usa así:

```bash
python3 -m organizador ~/Descargas --simular
python3 -m organizador ~/Descargas
python3 -m organizador ~/Descargas --recursivo
```

La primera orden no toca nada: enseña el plan. La segunda lo ejecuta. La tercera baja también por las subcarpetas.

Y esto es lo que deja detrás:

```text
Descargas/
    comprimidos/
    documentos/
    imagenes/
    otros/
    videos/
```

Solo eso. Cinco carpetas y ningún fichero suelto.

## El diseño

Tres ficheros con código y dos de fontanería:

```text title="estructura del proyecto"
organizador/
    __init__.py       Marca la carpeta como paquete
    categorias.py     Qué extensión va a qué categoría
    logica.py         Decide qué se mueve y lo mueve
    cli.py            Argumentos, mensajes y códigos de salida
    __main__.py       Permite python3 -m organizador
```

| Fichero | De qué se encarga | ¿Imprime? |
| --- | --- | --- |
| `categorias.py` | Los datos: el mapa de extensiones | No |
| `logica.py` | Listar, planificar, renombrar, mover | No |
| `cli.py` | Leer argumentos, pintar tablas, decidir el código de salida | Sí, solo él |

La columna de la derecha es la regla entera. En `logica.py` no hay ni un `print`, igual que en el gestor de tareas del módulo anterior las clases no imprimían. Esa separación, la misma de la lección de estructura de un proyecto, aquí tiene un premio inmediato y concreto: el modo `--simular` sale gratis. Lo verás en cuanto lleguemos a él.

## Parte 1: el mapa de categorías

Empezamos por los datos, que es la parte que más se toca y la que menos código tiene.

```python title="organizador/categorias.py"
"""Las categorías del organizador y las extensiones que van a cada una."""

from pathlib import Path

CATEGORIAS: dict[str, set[str]] = {
    "imagenes": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".svg"},
    "documentos": {
        ".pdf", ".txt", ".md", ".doc", ".docx", ".odt",
        ".xls", ".xlsx", ".ods", ".csv", ".ppt", ".pptx",
    },
    "videos": {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mpg", ".mpeg"},
    "comprimidos": {".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".rar", ".7z"},
}

CATEGORIA_POR_DEFECTO = "otros"

# Índice al revés: de extensión a categoría. Se construye una vez, al importar.
CATEGORIA_DE_EXTENSION: dict[str, str] = {
    extension: categoria
    for categoria, extensiones in CATEGORIAS.items()
    for extension in extensiones
}

NOMBRES_DE_CARPETA: set[str] = set(CATEGORIAS) | {CATEGORIA_POR_DEFECTO}


def categoria_de(fichero: Path) -> str:
        """Devuelve la categoría que le toca a un fichero por su extensión."""
    return CATEGORIA_DE_EXTENSION.get(fichero.suffix.lower(), CATEGORIA_POR_DEFECTO)
```

Probándolo:

```python
from pathlib import Path

from organizador.categorias import CATEGORIA_DE_EXTENSION, categoria_de

print(categoria_de(Path("foto.JPG")))
print(categoria_de(Path("contrato.pdf")))
print(categoria_de(Path("instalador.dmg")))
print(categoria_de(Path("leeme")))
print(len(CATEGORIA_DE_EXTENSION), CATEGORIA_DE_EXTENSION[".mp4"])
```

```salida
imagenes
documentos
otros
otros
35 videos
```

Las decisiones de este fichero:

- **El diccionario va de categoría a extensiones, no al revés.** Escrito así se lee y se amplía de un vistazo: añadir el `.avif` a las imágenes es tocar una línea. El diccionario que de verdad necesita el programa es el contrario, de extensión a categoría, y por eso se construye con una comprensión anidada en el momento de importar. Se escribe cómodo y se consulta rápido.
- **La comprensión tiene dos `for`.** El primero recorre las parejas del diccionario y el segundo, las extensiones de cada categoría. Se leen en el mismo orden en que se escribirían dos bucles anidados.
- **`suffix.lower()`.** Una captura de pantalla de Windows se llama `Captura.PNG`, con la extensión en mayúsculas, y `.PNG` no está en ningún conjunto. Bajar a minúsculas antes de buscar evita tener que duplicar cada extensión.
- **`.get()` con valor por defecto** en vez de un `if extension in ...`. Lo que no conoce el programa cae en `otros`, y esa es exactamente la semántica de `get`.
- **`NOMBRES_DE_CARPETA`** existe por una razón que se entiende en la parte siguiente: el programa tiene que saber reconocer las carpetas que él mismo crea para no volver a meterse en ellas.
- **Un fichero sin extensión** devuelve cadena vacía en `suffix`, que tampoco está en el mapa, así que va a `otros` sin tratamiento especial.

> [!nota] Las categorías sin acentos ni eñes
>
> `imagenes` y `videos` van sin tilde a propósito, porque son nombres de carpeta que acabarán en un disco duro que puede viajar a otro sistema operativo. Los acentos en nombres de fichero funcionan, pero dan disgustos al copiar entre Windows, macOS y Linux, y al sincronizar con servicios en la nube. En el contenido de los programas, tildes todas las que hagan falta; en los nombres de fichero, ninguna.

## Parte 2: qué ficheros hay que mover

Ahora la lógica. Primero, listar lo que hay que tocar, que tiene más miga de la que parece.

```python title="organizador/logica.py"
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from .categorias import NOMBRES_DE_CARPETA, categoria_de


def ficheros_a_ordenar(carpeta: Path, recursivo: bool = False) -> list[Path]:
        """Devuelve los ficheros de la carpeta que hay que clasificar, ya ordenados."""
    patron = "**/*" if recursivo else "*"
    encontrados = []
    for elemento in carpeta.glob(patron):
                if not elemento.is_file() or elemento.name.startswith("."):
                        continue
        if elemento.relative_to(carpeta).parts[0] in NOMBRES_DE_CARPETA:
                        continue
        encontrados.append(elemento)
    return sorted(encontrados)
```

Son doce líneas con cuatro decisiones dentro:

- **El patrón cambia según `recursivo`.** `glob("*")` mira un solo nivel y `glob("**/*")` baja por todo el árbol, que es lo mismo que hace `rglob("*")`. Tener la diferencia en una sola variable evita duplicar el bucle.
- **`is_file()` descarta las carpetas**, porque `glob` devuelve las dos cosas.
- **Los ficheros ocultos se saltan.** En macOS y Linux, todo lo que empieza por punto es configuración: `.DS_Store`, `.gitignore`, `.env`. Mover esos ficheros rompe cosas.
- **Y la más importante: se ignora lo que ya está dentro de una carpeta de categoría.** Sin ese `if`, la segunda ejecución con `--recursivo` volvería a encontrar `imagenes/foto.jpg`, calcularía que le toca ir a `imagenes/` y se pondría a mover ficheros encima de sí mismos. `relative_to(carpeta).parts[0]` es el primer tramo de la ruta relativa, es decir, la subcarpeta de primer nivel donde vive el fichero.

> [!consejo] Un programa que se puede ejecutar dos veces
>
> Que la segunda ejecución no haga nada y no rompa nada se llama **idempotencia**, y es una propiedad que merece la pena buscar en cualquier herramienta que toque ficheros. La gente ejecuta las cosas dos veces: porque no vio la salida, porque no se fio, o porque la flecha arriba de la terminal es muy cómoda. Si la segunda vez destroza el resultado de la primera, el programa está mal hecho.

Con la carpeta de ejemplo que usaremos en toda la lección:

```python
from pathlib import Path

from organizador.logica import ficheros_a_ordenar

print([f.name for f in ficheros_a_ordenar(Path("descargas"))])
```

```salida
['apuntes.txt', 'boda.mp4', 'captura.PNG', 'clip.mov', 'contrato.pdf', 'copia-seguridad.zip', 'foto-playa.jpg', 'instalador.dmg', 'logo.svg', 'notas.xyz', 'presentacion.pptx', 'proyecto.tar.gz', 'ventas-2026.csv']
```

El `sorted()` del final no es decorativo. `glob` entrega los ficheros en el orden que le dé el sistema de ficheros, que ni es alfabético ni es el mismo en dos ordenadores. Al ordenar, la salida del programa es predecible y comparable entre ejecuciones, que es justo lo que quieres cuando alguien te mande una captura preguntando por qué ha pasado algo.

## Parte 3: las colisiones de nombre

Dos ficheros distintos pueden llamarse igual. Pasa constantemente: el navegador ya numera las descargas repetidas, pero en cuanto juntas los ficheros de dos subcarpetas, aparecen dos `contrato.pdf` que no tienen nada que ver.

Mover el segundo encima del primero es perder datos en silencio, y `Path.rename()` hace exactamente eso en macOS y Linux: sobrescribe sin preguntar.

```python title="organizador/logica.py"
def nombre_libre(destino: Path, reservados: set[Path]) -> Path:
        """Devuelve el destino, o una variante con sufijo numérico si ya está ocupado."""
    candidato = destino
    contador = 1
    while candidato.exists() or candidato in reservados:
                candidato = destino.with_name(f"{destino.stem}-{contador}{destino.suffix}")
        contador += 1
    return candidato
```

```python
from pathlib import Path

from organizador.logica import nombre_libre

carpeta = Path("descargas")
print(nombre_libre(carpeta / "imagenes" / "foto-playa.jpg", set()))
print(nombre_libre(carpeta / "imagenes" / "nueva.png", set()))
print(nombre_libre(carpeta / "imagenes" / "nueva.png", {carpeta / "imagenes" / "nueva.png"}))
```

```salida
descargas/imagenes/foto-playa-1.jpg
descargas/imagenes/nueva.png
descargas/imagenes/nueva-1.png
```

El `stem` y el `suffix` de `pathlib` hacen el trabajo sucio: `foto-playa.jpg` se convierte en `foto-playa-1.jpg` y no en `foto-playa.jpg-1`, que es lo que saldría concatenando cadenas a mano. Y `with_name()` construye la ruta hermana sin tocar la carpeta.

Fíjate en el segundo parámetro, `reservados`, y en la tercera llamada del ejemplo. Ese conjunto es la parte que se olvida siempre. El bucle `while` pregunta por `exists()`, que consulta el disco, pero **los ficheros del plan todavía no están en el disco**. Si dos ficheros distintos de la lista van a acabar llamándose igual, `exists()` dirá que no a los dos y el segundo machacará al primero en cuanto se ejecute el plan. Apuntando cada destino elegido en `reservados` se cierra el agujero.

> [!aviso] El hueco entre comprobar y actuar
>
> Aun con el conjunto, entre el momento en que se comprueba `exists()` y el momento en que se llama a `rename()` pasa un instante. Si durante ese instante otro programa crea un fichero con ese nombre, se pierde. Es una condición de carrera, tiene nombre propio en inglés (*time of check to time of use*) y en una herramienta de uso personal es aceptable. En una que corra en un servidor con varios procesos a la vez, no: ahí se usan operaciones que comprueban y crean en un solo paso, como abrir el fichero en modo `"x"`.

## Parte 4: el plan y su ejecución

Aquí está el corazón del diseño, y son veinte líneas:

```python title="organizador/logica.py"
@dataclass
class Movimiento:
        """Un fichero y el sitio al que le toca ir."""

    origen: Path
    destino: Path
    categoria: str

    @property
    def renombrado(self) -> bool:
                """True si hubo que cambiarle el nombre para evitar una colisión."""
        return self.origen.name != self.destino.name


def planificar(carpeta: Path, recursivo: bool = False) -> list[Movimiento]:
        """Construye la lista de movimientos sin tocar el disco."""
    movimientos = []
    reservados: set[Path] = set()
    for fichero in ficheros_a_ordenar(carpeta, recursivo):
                categoria = categoria_de(fichero)
        destino = nombre_libre(carpeta / categoria / fichero.name, reservados)
        reservados.add(destino)
        movimientos.append(Movimiento(fichero, destino, categoria))
    return movimientos


def ejecutar(movimientos: list[Movimiento]) -> tuple[list[Movimiento], list[tuple[Movimiento, OSError]]]:
        """Realiza los movimientos. Devuelve los hechos y los fallidos con su error."""
    hechos: list[Movimiento] = []
    fallidos: list[tuple[Movimiento, OSError]] = []
    for movimiento in movimientos:
                try:
                        movimiento.destino.parent.mkdir(parents=True, exist_ok=True)
            movimiento.origen.rename(movimiento.destino)
        except OSError as error:
                        fallidos.append((movimiento, error))
        else:
                        hechos.append(movimiento)
    return hechos, fallidos


def contar_por_categoria(movimientos: list[Movimiento]) -> Counter:
        """Cuántos ficheros hay en cada categoría."""
    return Counter(movimiento.categoria for movimiento in movimientos)
```

```python
from pathlib import Path

from organizador.logica import contar_por_categoria, planificar

plan = planificar(Path("descargas"), recursivo=True)
print(len(plan))
print(contar_por_categoria(plan))
print(plan[6])
```

```salida
16
Counter({'documentos': 6, 'imagenes': 4, 'videos': 2, 'comprimidos': 2, 'otros': 2})
Movimiento(origen=PosixPath('descargas/facturas/contrato.pdf'), destino=PosixPath('descargas/documentos/contrato-1.pdf'), categoria='documentos')
```

Las decisiones:

- **`planificar` no toca el disco y `ejecutar` no decide nada.** El primero devuelve una lista de objetos; el segundo la recorre y obedece. Son dos funciones porque son dos momentos distintos, y entre uno y otro se puede enseñar el plan, filtrarlo, guardarlo en un registro o tirarlo a la basura.
- **`Movimiento` es una dataclass y no una tupla.** `movimiento.destino` se lee; `movimiento[1]`, no. Y el `__repr__` que regala la dataclass hace que depurar el plan sea imprimirlo, como se ve arriba.
- **`renombrado` es una propiedad**, no un campo, porque es un dato deducido de los otros dos. Guardarlo sería duplicar información que puede quedar desincronizada.
- **`mkdir` va dentro del bucle**, no antes. Así solo se crean las carpetas de las categorías que de verdad tienen ficheros: una carpeta de descargas sin vídeos no acaba con una carpeta `videos` vacía. Y con `exist_ok=True` llamarlo trece veces no cuesta nada.
- **`ejecutar` atrapa `OSError` fichero a fichero y sigue.** Un permiso denegado en el séptimo fichero no puede tirar el programa dejando el trabajo a medias y sin decir cuánto se hizo. Se apunta y se continúa.
- **El `else` del `try`.** El cuerpo del `else` se ejecuta solo si no hubo excepción, y deja clarísimo que `hechos.append` es lo que pasa en el caso bueno. Podría ir al final del `try`, pero entonces habría dos líneas dentro del `try` y solo una puede fallar.
- **`Counter` sobre una expresión generadora** resuelve el recuento en una línea, tal como viste en la lección de la biblioteca estándar.

## El apartado importante: por qué `--simular`

Toda herramienta que mueva, sobrescriba o borre ficheros tiene que poder decirte qué va a hacer antes de hacerlo. Sin excepciones.

El motivo no es la elegancia, es que **tú no puedes probar el programa de otra manera**. Una herramienta que solo tiene un modo se prueba ejecutándola, y ejecutarla es justo lo que da miedo. Con un modo de simulación, la prueba es gratis: la ejecutas sobre tu carpeta real, lees las veinte líneas del plan, ves que la tercera está mal, arreglas el programa y vuelves a ejecutar. Sin simulación ese ciclo cuesta una copia de seguridad cada vuelta, así que en la práctica no se hace, y lo que no se prueba no funciona.

Hay más razones:

- **Las extensiones sorprenden.** Descubrirás que tu `.heic` del móvil no estaba en la lista, que los `.tar.gz` cuentan como `.gz`, o que tenías cuarenta ficheros sin extensión. Mejor descubrirlo leyendo que buscando dónde han ido a parar.
- **La confianza se construye.** La primera vez se usa con `--simular`, la décima ya no. Un programa en el que no confías es un programa que no usas.
- **Deshacer es carísimo.** Una vez movidos trece mil ficheros, volver atrás requiere un programa nuevo. Leer trece mil líneas de plan antes es incómodo, pero es posible.

Lo bonito es cuánto cuesta implementarlo aquí: **nada**. Como `planificar` ya está separada de `ejecutar`, el modo simulación es no llamar a la segunda.

```python
movimientos = planificar(carpeta, opciones.recursivo)

if opciones.simular:
        mostrar_plan(movimientos, carpeta)
    return 0

hechos, fallidos = ejecutar(movimientos)
```

Ese es el premio del diseño de la parte anterior. Cuando una herramienta mezcla decidir y hacer, añadirle un modo de simulación después obliga a meter un `if not simular:` alrededor de cada operación peligrosa, y basta que se escape uno para que el modo seguro no sea seguro. Con las dos fases separadas, el modo seguro es imposible de romper: no hay ninguna llamada a `rename` que pueda ejecutarse por accidente, porque la fase que las hace ni siquiera se llama.

> [!consejo] El nombre en inglés lo verás por todas partes
>
> En las herramientas que te encontrarás por ahí esta opción se llama `--dry-run`, "ensayo en seco". `rsync`, `git clean`, `apt`, `terraform` y media terminal la tienen. Si alguna vez escribes una herramienta para un equipo que trabaja en inglés, ese es el nombre que la gente va a buscar en el `--help`.

## Parte 5: la interfaz

Tres argumentos y ninguna sorpresa:

```python title="organizador/cli.py"
def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(
        prog="organizador",
        description="Ordena una carpeta moviendo cada fichero a una subcarpeta según su extensión.",
        epilog="Prueba siempre primero con --simular.",
    )
    analizador.add_argument(
        "carpeta",
        type=Path,
        help="carpeta que hay que ordenar",
    )
    analizador.add_argument(
        "-s", "--simular",
        action="store_true",
        help="enseña lo que haría, pero no mueve nada",
    )
    analizador.add_argument(
        "-r", "--recursivo",
        action="store_true",
        help="ordena también los ficheros de las subcarpetas",
    )
    return analizador
```

```bash
python3 -m organizador --help
```

```salida
usage: organizador [-h] [-s] [-r] carpeta

Ordena una carpeta moviendo cada fichero a una subcarpeta según su extensión.

positional arguments:
  carpeta          carpeta que hay que ordenar

options:
  -h, --help       show this help message and exit
  -s, --simular    enseña lo que haría, pero no mueve nada
  -r, --recursivo  ordena también los ficheros de las subcarpetas

Prueba siempre primero con --simular.
```

- **`type=Path`** hace que `opciones.carpeta` llegue ya como objeto `Path` y no como cadena. Es el mismo mecanismo que `type=int`: cualquier función de un argumento sirve.
- **La carpeta es un posicional y no una opción** porque es obligatoria y solo hay una. Lo que no se puede omitir va sin guiones.
- **`action="store_true"`** convierte las dos opciones en banderas: están o no están, sin valor detrás.
- **`prog="organizador"`** fija el nombre que sale en la ayuda. Sin él, al ejecutar con `python3 -m` saldría `__main__.py`, que no le dice nada a nadie.
- **`epilog`** es el sitio para el consejo que quieres que lea quien pida ayuda.

## Parte 6: el resumen en tabla

Trece líneas de "esto va allí" no dicen gran cosa. El recuento por categoría, sí:

```python title="organizador/cli.py"
ANCHO_NOMBRE = 34


def plural(cantidad: int, singular: str, varios: str) -> str:
        """Elige la forma que toca para que los mensajes no canten."""
    return singular if cantidad == 1 else varios


def mostrar_plan(movimientos: list[Movimiento], carpeta: Path) -> None:
        """Enseña, fichero a fichero, a dónde va cada uno."""
    for movimiento in movimientos:
                origen = movimiento.origen.relative_to(carpeta)
        destino = movimiento.destino.relative_to(carpeta)
        aviso = "  (renombrado)" if movimiento.renombrado else ""
        print(f"  {str(origen):<{ANCHO_NOMBRE}} -> {destino}{aviso}")


def mostrar_resumen(movimientos: list[Movimiento]) -> None:
        """Pinta la tabla con el recuento por categoría."""
    recuento = contar_por_categoria(movimientos)
    orden = list(CATEGORIAS) + [CATEGORIA_POR_DEFECTO]

    print()
    print(f"  {'CATEGORÍA':<14}{'FICHEROS':>9}")
    print("  " + "-" * 23)
    for categoria in orden:
                if recuento[categoria]:
                        print(f"  {categoria:<14}{recuento[categoria]:>9}")
    print("  " + "-" * 23)
    print(f"  {'TOTAL':<14}{len(movimientos):>9}")
```

```salida
  CATEGORÍA      FICHEROS
  -----------------------
  imagenes              3
  documentos            4
  videos                2
  comprimidos           2
  otros                 2
  -----------------------
  TOTAL                13
```

Las decisiones:

- **Las rutas se enseñan relativas a la carpeta.** Con `relative_to(carpeta)`, en pantalla sale `facturas/contrato.pdf` en vez de `/Users/erwin/Descargas/facturas/contrato.pdf` repetido dieciséis veces. La información que importa es la que cambia de línea a línea.
- **El orden de la tabla sale del diccionario `CATEGORIAS`**, no del recuento. Así las categorías salen siempre en el mismo orden, y `otros` queda al final porque es el cajón de sastre. Los diccionarios de Python conservan el orden de inserción desde la versión 3.7, y aquí eso se usa como característica.
- **Las categorías con cero se omiten** con el `if recuento[categoria]`. Una fila que pone `videos 0` es ruido.
- **`Counter` devuelve `0` para las claves que no tiene** en vez de lanzar `KeyError`, que es lo que permite escribir ese `if` tan corto.
- **La función `plural`** existe porque "1 ficheros movidos" canta muchísimo. Tres líneas para que los mensajes estén bien escritos son tres líneas bien gastadas.

## Parte 7: códigos de salida y errores

Un programa de terminal habla con el sistema por dos canales que no se ven en pantalla: el código de salida y `stderr`.

```python title="organizador/cli.py"
def main(argumentos: list[str] | None = None) -> int:
        opciones = construir_analizador().parse_args(argumentos)
    carpeta: Path = opciones.carpeta

    if not carpeta.exists():
                print(f"organizador: la carpeta '{carpeta}' no existe.", file=sys.stderr)
        return 1
    if not carpeta.is_dir():
                print(f"organizador: '{carpeta}' no es una carpeta.", file=sys.stderr)
        return 1
    ...
```

El reparto que usa este programa, que es el habitual:

| Código | Cuándo |
| --- | --- |
| `0` | Todo bien, aunque no hubiera nada que mover |
| `1` | El programa se ejecutó pero algo salió mal: la carpeta no existe, o falló algún movimiento |
| `2` | Los argumentos estaban mal. Lo pone `argparse` él solo |

- **`main` devuelve un número, no llama a `sys.exit`.** Quien decide terminar el proceso es `__main__.py`, con `sys.exit(main())`. Así `main` se puede llamar desde una prueba automática, pasarle una lista de argumentos y mirar qué devuelve sin que el intérprete se cierre a mitad de la suite.
- **El parámetro `argumentos` por defecto vale `None`**, y `parse_args(None)` lee `sys.argv`. Es decir: en producción no se le pasa nada y funciona solo; en una prueba se le pasa `["descargas", "--simular"]`.
- **Los errores van a `stderr` y llevan el nombre del programa delante.** Eso es lo que permite `python3 -m organizador descargas 2> errores.txt`: la tabla sale por pantalla y los problemas se quedan en el fichero. El prefijo `organizador:` es la convención de toda la terminal, y se agradece cuando el mensaje aparece en medio de la salida de otras diez herramientas.
- **"No había nada que ordenar" devuelve 0.** No es un fallo. Confundir "no hay trabajo" con "ha ido mal" hace que los guiones que usen tu herramienta se paren sin motivo.

## El programa completo

```python title="organizador/categorias.py"
"""Las categorías del organizador y las extensiones que van a cada una."""

from pathlib import Path

CATEGORIAS: dict[str, set[str]] = {
    "imagenes": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp", ".svg"},
    "documentos": {
        ".pdf", ".txt", ".md", ".doc", ".docx", ".odt",
        ".xls", ".xlsx", ".ods", ".csv", ".ppt", ".pptx",
    },
    "videos": {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mpg", ".mpeg"},
    "comprimidos": {".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".rar", ".7z"},
}

CATEGORIA_POR_DEFECTO = "otros"

# Índice al revés: de extensión a categoría. Se construye una vez, al importar.
CATEGORIA_DE_EXTENSION: dict[str, str] = {
    extension: categoria
    for categoria, extensiones in CATEGORIAS.items()
    for extension in extensiones
}

NOMBRES_DE_CARPETA: set[str] = set(CATEGORIAS) | {CATEGORIA_POR_DEFECTO}


def categoria_de(fichero: Path) -> str:
        """Devuelve la categoría que le toca a un fichero por su extensión."""
    return CATEGORIA_DE_EXTENSION.get(fichero.suffix.lower(), CATEGORIA_POR_DEFECTO)
```

```python title="organizador/logica.py"
"""La lógica del organizador: decidir qué se mueve y moverlo. No imprime nada."""

from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from .categorias import NOMBRES_DE_CARPETA, categoria_de


@dataclass
class Movimiento:
        """Un fichero y el sitio al que le toca ir."""

    origen: Path
    destino: Path
    categoria: str

    @property
    def renombrado(self) -> bool:
                """True si hubo que cambiarle el nombre para evitar una colisión."""
        return self.origen.name != self.destino.name


def ficheros_a_ordenar(carpeta: Path, recursivo: bool = False) -> list[Path]:
        """Devuelve los ficheros de la carpeta que hay que clasificar, ya ordenados."""
    patron = "**/*" if recursivo else "*"
    encontrados = []
    for elemento in carpeta.glob(patron):
                if not elemento.is_file() or elemento.name.startswith("."):
                        continue
        if elemento.relative_to(carpeta).parts[0] in NOMBRES_DE_CARPETA:
                        continue
        encontrados.append(elemento)
    return sorted(encontrados)


def nombre_libre(destino: Path, reservados: set[Path]) -> Path:
        """Devuelve el destino, o una variante con sufijo numérico si ya está ocupado."""
    candidato = destino
    contador = 1
    while candidato.exists() or candidato in reservados:
                candidato = destino.with_name(f"{destino.stem}-{contador}{destino.suffix}")
        contador += 1
    return candidato


def planificar(carpeta: Path, recursivo: bool = False) -> list[Movimiento]:
        """Construye la lista de movimientos sin tocar el disco."""
    movimientos = []
    reservados: set[Path] = set()
    for fichero in ficheros_a_ordenar(carpeta, recursivo):
                categoria = categoria_de(fichero)
        destino = nombre_libre(carpeta / categoria / fichero.name, reservados)
        reservados.add(destino)
        movimientos.append(Movimiento(fichero, destino, categoria))
    return movimientos


def ejecutar(movimientos: list[Movimiento]) -> tuple[list[Movimiento], list[tuple[Movimiento, OSError]]]:
        """Realiza los movimientos. Devuelve los hechos y los fallidos con su error."""
    hechos: list[Movimiento] = []
    fallidos: list[tuple[Movimiento, OSError]] = []
    for movimiento in movimientos:
                try:
                        movimiento.destino.parent.mkdir(parents=True, exist_ok=True)
            movimiento.origen.rename(movimiento.destino)
        except OSError as error:
                        fallidos.append((movimiento, error))
        else:
                        hechos.append(movimiento)
    return hechos, fallidos


def contar_por_categoria(movimientos: list[Movimiento]) -> Counter:
        """Cuántos ficheros hay en cada categoría."""
    return Counter(movimiento.categoria for movimiento in movimientos)
```

```python title="organizador/cli.py"
"""La interfaz de terminal del organizador: argumentos, mensajes y códigos de salida."""

import argparse
import sys
from pathlib import Path

from .categorias import CATEGORIAS, CATEGORIA_POR_DEFECTO
from .logica import Movimiento, contar_por_categoria, ejecutar, planificar

ANCHO_NOMBRE = 34


def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(
        prog="organizador",
        description="Ordena una carpeta moviendo cada fichero a una subcarpeta según su extensión.",
        epilog="Prueba siempre primero con --simular.",
    )
    analizador.add_argument(
        "carpeta",
        type=Path,
        help="carpeta que hay que ordenar",
    )
    analizador.add_argument(
        "-s", "--simular",
        action="store_true",
        help="enseña lo que haría, pero no mueve nada",
    )
    analizador.add_argument(
        "-r", "--recursivo",
        action="store_true",
        help="ordena también los ficheros de las subcarpetas",
    )
    return analizador


def plural(cantidad: int, singular: str, varios: str) -> str:
        """Elige la forma que toca para que los mensajes no canten."""
    return singular if cantidad == 1 else varios


def mostrar_plan(movimientos: list[Movimiento], carpeta: Path) -> None:
        """Enseña, fichero a fichero, a dónde va cada uno."""
    for movimiento in movimientos:
                origen = movimiento.origen.relative_to(carpeta)
        destino = movimiento.destino.relative_to(carpeta)
        aviso = "  (renombrado)" if movimiento.renombrado else ""
        print(f"  {str(origen):<{ANCHO_NOMBRE}} -> {destino}{aviso}")


def mostrar_resumen(movimientos: list[Movimiento]) -> None:
        """Pinta la tabla con el recuento por categoría."""
    recuento = contar_por_categoria(movimientos)
    orden = list(CATEGORIAS) + [CATEGORIA_POR_DEFECTO]

    print()
    print(f"  {'CATEGORÍA':<14}{'FICHEROS':>9}")
    print("  " + "-" * 23)
    for categoria in orden:
                if recuento[categoria]:
                        print(f"  {categoria:<14}{recuento[categoria]:>9}")
    print("  " + "-" * 23)
    print(f"  {'TOTAL':<14}{len(movimientos):>9}")


def main(argumentos: list[str] | None = None) -> int:
        opciones = construir_analizador().parse_args(argumentos)
    carpeta: Path = opciones.carpeta

    if not carpeta.exists():
                print(f"organizador: la carpeta '{carpeta}' no existe.", file=sys.stderr)
        return 1
    if not carpeta.is_dir():
                print(f"organizador: '{carpeta}' no es una carpeta.", file=sys.stderr)
        return 1

    movimientos = planificar(carpeta, opciones.recursivo)

    if not movimientos:
                print(f"No hay nada que ordenar en {carpeta}.")
        return 0

    if opciones.simular:
                print(f"Simulación sobre {carpeta}. No se va a mover nada.\n")
        mostrar_plan(movimientos, carpeta)
        mostrar_resumen(movimientos)
        cuantos = len(movimientos)
        verbo = plural(cuantos, "fichero se movería", "ficheros se moverían")
        print(f"\n{cuantos} {verbo}. Repite sin --simular para hacerlo.")
        return 0

    print(f"Ordenando {carpeta}.\n")
    hechos, fallidos = ejecutar(movimientos)
    mostrar_plan(hechos, carpeta)
    mostrar_resumen(hechos)

    for movimiento, error in fallidos:
                print(f"organizador: no he podido mover '{movimiento.origen.name}': {error}", file=sys.stderr)

    verbo = plural(len(hechos), "fichero movido", "ficheros movidos")
    if fallidos:
                print(f"\n{len(hechos)} {verbo}, {len(fallidos)} con errores.")
        return 1

    print(f"\n{len(hechos)} {verbo}.")
    return 0


if __name__ == "__main__":
        sys.exit(main())
```

```python title="organizador/__main__.py"
"""Permite ejecutar el paquete con python3 -m organizador."""

import sys

from .cli import main

sys.exit(main())
```

Unas 190 líneas repartidas en cuatro ficheros, y la mitad son las categorías y la tabla.

## Una sesión de uso

Partimos de esta carpeta de descargas, que tiene de todo a propósito: un fichero oculto, extensiones raras, una subcarpeta y dos nombres repetidos.

```text
descargas/
    .oculto
    apuntes.txt
    boda.mp4
    captura.PNG
    clip.mov
    contrato.pdf
    copia-seguridad.zip
    foto-playa.jpg
    instalador.dmg
    logo.svg
    notas.xyz
    presentacion.pptx
    proyecto.tar.gz
    ventas-2026.csv
    facturas/
        contrato.pdf
        escaneo.jpg
        recibo-luz.pdf
    imagenes/
        foto-playa.jpg
```

Primero, sin tocar nada:

```bash
python3 -m organizador descargas --simular
```

```salida
Simulación sobre descargas. No se va a mover nada.

  apuntes.txt                        -> documentos/apuntes.txt
  boda.mp4                           -> videos/boda.mp4
  captura.PNG                        -> imagenes/captura.PNG
  clip.mov                           -> videos/clip.mov
  contrato.pdf                       -> documentos/contrato.pdf
  copia-seguridad.zip                -> comprimidos/copia-seguridad.zip
  foto-playa.jpg                     -> imagenes/foto-playa-1.jpg  (renombrado)
  instalador.dmg                     -> otros/instalador.dmg
  logo.svg                           -> imagenes/logo.svg
  notas.xyz                          -> otros/notas.xyz
  presentacion.pptx                  -> documentos/presentacion.pptx
  proyecto.tar.gz                    -> comprimidos/proyecto.tar.gz
  ventas-2026.csv                    -> documentos/ventas-2026.csv

  CATEGORÍA      FICHEROS
  -----------------------
  imagenes              3
  documentos            4
  videos                2
  comprimidos           2
  otros                 2
  -----------------------
  TOTAL                13

13 ficheros se moverían. Repite sin --simular para hacerlo.
```

Cuatro cosas que confirma esta salida y que no se podían dar por supuestas: `captura.PNG` ha ido a imágenes pese a la extensión en mayúsculas, `foto-playa.jpg` se ha renombrado porque ya había una en `imagenes/`, `proyecto.tar.gz` ha entrado en comprimidos por su `.gz`, y ni `.oculto` ni el contenido de `facturas/` aparecen, que es lo que toca sin `--recursivo`.

El plan convence, así que se ejecuta:

```bash
python3 -m organizador descargas
```

```salida
Ordenando descargas.

  apuntes.txt                        -> documentos/apuntes.txt
  boda.mp4                           -> videos/boda.mp4
  captura.PNG                        -> imagenes/captura.PNG
  clip.mov                           -> videos/clip.mov
  contrato.pdf                       -> documentos/contrato.pdf
  copia-seguridad.zip                -> comprimidos/copia-seguridad.zip
  foto-playa.jpg                     -> imagenes/foto-playa-1.jpg  (renombrado)
  instalador.dmg                     -> otros/instalador.dmg
  logo.svg                           -> imagenes/logo.svg
  notas.xyz                          -> otros/notas.xyz
  presentacion.pptx                  -> documentos/presentacion.pptx
  proyecto.tar.gz                    -> comprimidos/proyecto.tar.gz
  ventas-2026.csv                    -> documentos/ventas-2026.csv

  CATEGORÍA      FICHEROS
  -----------------------
  imagenes              3
  documentos            4
  videos                2
  comprimidos           2
  otros                 2
  -----------------------
  TOTAL                13

13 ficheros movidos.
```

La carpeta queda así:

```text
descargas/
    .oculto
    comprimidos/
        copia-seguridad.zip
        proyecto.tar.gz
    documentos/
        apuntes.txt
        contrato.pdf
        presentacion.pptx
        ventas-2026.csv
    facturas/
        contrato.pdf
        escaneo.jpg
        recibo-luz.pdf
    imagenes/
        captura.PNG
        foto-playa-1.jpg
        foto-playa.jpg
        logo.svg
    otros/
        instalador.dmg
        notas.xyz
    videos/
        boda.mp4
        clip.mov
```

Segunda ejecución, para comprobar la idempotencia:

```bash
python3 -m organizador descargas
echo $?
```

```salida
No hay nada que ordenar en descargas.
0
```

Ahora sí, bajando por las subcarpetas:

```bash
python3 -m organizador descargas --recursivo
```

```salida
Ordenando descargas.

  facturas/contrato.pdf              -> documentos/contrato-1.pdf  (renombrado)
  facturas/escaneo.jpg               -> imagenes/escaneo.jpg
  facturas/recibo-luz.pdf            -> documentos/recibo-luz.pdf

  CATEGORÍA      FICHEROS
  -----------------------
  imagenes              1
  documentos            2
  -----------------------
  TOTAL                 3

3 ficheros movidos.
```

Los dos `contrato.pdf` han sobrevivido los dos, y la carpeta `facturas` se queda vacía, porque el programa mueve ficheros y no borra carpetas. Eso es deliberado: borrar carpetas es otra decisión y merece su propia opción, que tienes en las ampliaciones.

Y el caso de error:

```bash
python3 -m organizador descargas-de-ayer
echo $?
```

```salida
organizador: la carpeta 'descargas-de-ayer' no existe.
1
```

## Lo que se ha usado

| Del curso | Dónde |
| --- | --- |
| `pathlib`: `glob`, `stem`, `suffix`, `with_name`, `relative_to`, `rename`, `mkdir` | Todo `logica.py` |
| Comprensiones de diccionario anidadas | El índice invertido de `categorias.py` |
| Conjuntos y su unión | Las extensiones y `NOMBRES_DE_CARPETA` |
| Dataclasses y propiedades | `Movimiento` |
| `Counter` | El recuento por categoría |
| `try`/`except`/`else` con `OSError` | `ejecutar` |
| f-strings con ancho variable | Las dos tablas |
| `argparse` con posicional y banderas | `cli.py` |
| `sys.stderr` y códigos de salida | `main` |
| Paquetes propios e importaciones relativas | Los cuatro ficheros |

> [!error] FileExistsError: \[Errno 17\] File exists: 'descargas/imagenes'
>
> Este sale cuando en la carpeta hay un **fichero** llamado igual que una categoría. `mkdir` no puede crear la carpeta `imagenes` porque ese nombre ya lo ocupa un fichero sin extensión. Lo bueno es que el programa no se muere: lo apunta como fallido, sigue con el resto y lo cuenta al final.
>
> ```salida
> Ordenando caso.
>
>   nota.txt                           -> documentos/nota.txt
>
>   CATEGORÍA      FICHEROS
>   -----------------------
>   documentos            1
>   -----------------------
>   TOTAL                 1
> organizador: no he podido mover 'foto.jpg': [Errno 17] File exists: 'caso/imagenes'
>
> 1 fichero movido, 1 con errores.
> ```
>
> La solución es renombrar ese fichero a mano. Y la lección de fondo es la de siempre: el `except OSError` que rodea cada movimiento convierte un desastre en un aviso.

> [!aviso] rename no cruza discos
>
> `Path.rename()` mueve dentro del mismo sistema de ficheros. Si intentas mover un fichero de tu disco interno a un disco externo o a una unidad de red, falla con `OSError: [Errno 18] Invalid cross-device link`, porque por debajo no hay una copia, solo un cambio de nombre. Para eso está `shutil.move()`, que copia y borra cuando hace falta y funciona en los dos casos.
>
> En este programa se ha usado `rename` a propósito, porque el origen y el destino están siempre dentro de la misma carpeta. En cuanto le añadas una opción de carpeta de destino, cámbialo.

> [!resumen] En resumen
>
> El programa reparte los ficheros de una carpeta en subcarpetas por extensión, y su diseño gira en torno a una sola idea: `planificar` decide y `ejecutar` obedece. De esa separación sale gratis el modo `--simular`, que es la característica más importante de cualquier herramienta que mueva o borre ficheros, porque es la única forma de probarla sin miedo. Las categorías viven en un diccionario legible que se invierte con una comprensión para consultarlo rápido, y las extensiones se comparan en minúsculas. Las colisiones de nombre se resuelven con un sufijo numérico construido con `stem` y `suffix`, comprobando tanto lo que hay en disco como lo que el propio plan ya ha reservado. `ejecutar` atrapa `OSError` fichero a fichero para que un permiso denegado no tire el trabajo entero. Y la capa de terminal se limita a `argparse`, dos tablas alineadas con f-strings, los errores por `stderr` y un código de salida que distingue "no había nada que hacer" de "algo ha fallado".

> [!ejercicio] Ampliaciones
>
> El organizador funciona, pero le falta bastante para ser una herramienta seria. En orden de dificultad:
>
> 1. **Limpiar las carpetas vacías.** Añade una opción `--limpiar` que, después de mover, borre las subcarpetas que se hayan quedado sin nada, como `facturas/` en la sesión de ejemplo. Necesitarás `Path.rmdir()`, que solo borra carpetas vacías, y recorrer el árbol de abajo arriba para que una carpeta que solo contenía carpetas vacías también desaparezca.
> 2. **Una opción `--categoria` a medida.** Permite `--categoria musica=.mp3,.flac,.wav` para añadir categorías sin tocar el código. Con `action="append"` y `nargs` ya sabes recoger varias; lo interesante es partir el texto y fundirlo con el diccionario `CATEGORIAS`.
> 3. **Fichero de configuración.** Lo anterior se cansa de escribirse. Mueve el mapa de categorías a un `organizador.toml` que se lea con `tomllib`, y haz que el programa use el del usuario si existe y el de por defecto si no. Aprovecha para permitir que se configure también si se ignoran los ficheros ocultos.
> 4. **Ordenar por fecha.** Añade `--por-fecha`, que en vez de por categoría reparta en carpetas `2026/09`, usando `Path.stat().st_mtime` y `datetime.fromtimestamp()`. Fíjate en que solo cambia el cálculo del destino dentro de `planificar`: el resto del programa no se entera.
> 5. **Deshacer.** Haz que cada ejecución real escriba un `organizador-ultima-vez.json` con la lista de movimientos, y añade un subcomando `deshacer` que lo lea y los invierta. Aquí tendrás que pasar de banderas a subcomandos con `add_subparsers`, y pensar qué hacer si el fichero ya no está donde lo dejaste.
> 6. **Pruebas automáticas.** Escribe pruebas con `pytest` para `categoria_de`, `nombre_libre` y `planificar`. La pieza que te falta es `tmp_path`, el parámetro mágico que te da una carpeta temporal limpia en cada prueba. Comprueba también que `planificar` no toca el disco: ejecútala y verifica con `exists()` que no se ha creado ni una carpeta.
