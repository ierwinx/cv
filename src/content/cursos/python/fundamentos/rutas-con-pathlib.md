---
titulo: "Rutas de ficheros con pathlib"
resumen: "Cómo construir y manipular rutas de forma que funcionen igual en Windows, macOS y Linux, sin pelearse con las barras."
minutos: 13
orden: 46
---

Escribe una ruta a mano y ya tienes un problema de portabilidad. En Windows las carpetas se separan con barra invertida, `datos\informes\ventas.csv`, y en macOS y Linux con barra normal, `datos/informes/ventas.csv`. Si escribes una de las dos en tu código, el programa deja de funcionar en el otro sistema.

Y la barra invertida tiene un problema añadido: dentro de una cadena de Python es el carácter de escape. `"datos\nuevos"` no contiene la carpeta `nuevos`, contiene un salto de línea seguido de `uevos`, porque `\n` es un salto de línea. Es un fallo silencioso de los peores, y a nadie se le ocurre mirar ahí.

La solución está en la biblioteca estándar y se llama `pathlib`. En vez de tratar las rutas como texto, las trata como lo que son.

## Construir rutas con el operador /

```python
from pathlib import Path

ruta = Path("datos") / "informes" / "ventas-2026.csv"
print(ruta)
print(type(ruta))
```

```salida
datos/informes/ventas-2026.csv
<class 'pathlib.PosixPath'>
```

La barra `/` entre dos trozos de ruta los une con el separador que corresponda al sistema. En Windows ese mismo programa imprime `datos\informes\ventas-2026.csv` y el tipo es `WindowsPath`. Tú escribes lo mismo y Python traduce.

Un objeto `Path` sirve en cualquier sitio donde antes pondrías una cadena con la ruta, empezando por `open()`:

```python
from pathlib import Path

ruta = Path("datos") / "notas.txt"

with open(ruta, encoding="utf-8") as fichero:
        print(fichero.read())
```

> [!nota] Por qué la barra y no un método
>
> Al principio choca usar el operador de dividir para unir rutas. Es una decisión de diseño deliberada: una ruta escrita `Path("datos") / "informes" / "ventas.csv"` se lee casi igual que la ruta real, mientras que la forma antigua, `os.path.join("datos", "informes", "ventas.csv")`, tiene más ruido que contenido. Si el operador te incomoda, `Path("datos", "informes", "ventas.csv")` hace exactamente lo mismo.

## Las partes de una ruta

Un `Path` sabe descomponerse solo, sin `split(".")` ni rebanadas contadas a mano:

```python
from pathlib import Path

ruta = Path("datos") / "informes" / "ventas-2026.csv"

print(ruta.name)
print(ruta.stem)
print(ruta.suffix)
print(ruta.parent)
print(ruta.parent.parent)
print(ruta.parts)
```

```salida
ventas-2026.csv
ventas-2026
.csv
datos/informes
datos
('datos', 'informes', 'ventas-2026.csv')
```

| Propiedad | Qué devuelve |
| --- | --- |
| `name` | El nombre del fichero con extensión |
| `stem` | El nombre sin extensión |
| `suffix` | La extensión, con el punto incluido |
| `parent` | La carpeta que lo contiene |
| `parts` | Una tupla con todos los trozos |

Con `stem` y `suffix` se construyen nombres derivados sin cortar cadenas:

```python
from pathlib import Path

original = Path("informe.txt")
copia = original.parent / f"{original.stem}-copia{original.suffix}"
print(copia)
```

```salida
informe-copia.txt
```

## Comprobar qué hay ahí

Tres preguntas, tres métodos, y todos devuelven `True` o `False` sin lanzar errores. Suponiendo que junto a tu programa haya una carpeta llamada `datos`:

```python
from pathlib import Path

carpeta = Path("datos")

print(carpeta.exists())
print(carpeta.is_dir())
print(carpeta.is_file())
print(Path("no-existe.txt").exists())
```

```salida
True
True
False
False
```

`exists()` dice si hay algo, `is_file()` si eso es un fichero e `is_dir()` si es una carpeta. Preguntar por una ruta inventada no falla: simplemente responde `False`.

## Crear carpetas

```python
from pathlib import Path

carpeta = Path("datos") / "informes"
carpeta.mkdir(parents=True, exist_ok=True)
print(carpeta.exists(), carpeta.is_dir())
```

```salida
True True
```

Los dos parámetros son los que hacen que esta línea sea de fiar:

- `parents=True` crea también las carpetas intermedias que falten. Sin él, si `datos` no existe, crear `datos/informes` falla.
- `exist_ok=True` hace que no pase nada si la carpeta ya estaba. Sin él, la segunda ejecución del programa muere con `FileExistsError`.

> [!consejo] Aprende de memoria mkdir(parents=True, exist\_ok=True)
>
> Es la forma que quieres el 95% de las veces: "asegúrame que esta carpeta existe, y si ya existe no me molestes". Ponla al principio de cualquier programa que vaya a escribir ficheros en una carpeta propia.

## Listar y buscar

Trabajaremos sobre este árbol:

```text title="estructura de carpetas"
datos/
    leeme.md
    notas.txt
    informes/
        ventas-2025.csv
        ventas-2026.csv
```

`iterdir()` recorre lo que hay dentro de una carpeta, un nivel y nada más:

```python
from pathlib import Path

for elemento in sorted(Path("datos").iterdir()):
        tipo = "carpeta" if elemento.is_dir() else "fichero"
    print(f"{tipo}: {elemento.name}")
```

```salida
carpeta: informes
fichero: leeme.md
fichero: notas.txt
```

El `sorted()` no es decorativo: `iterdir()` entrega los elementos en el orden que le dé el sistema de ficheros, que no tiene por qué ser alfabético ni ser el mismo en dos ordenadores. Si el orden te importa, ordena tú.

`glob()` busca por patrón en esa carpeta, y `rglob()` hace lo mismo bajando por todas las subcarpetas:

```python
from pathlib import Path

print(sorted(Path("datos").glob("*.txt")))
print(sorted(Path("datos").glob("*.csv")))
print(sorted(Path("datos").rglob("*.csv")))
```

```salida
[PosixPath('datos/notas.txt')]
[]
[PosixPath('datos/informes/ventas-2025.csv'), PosixPath('datos/informes/ventas-2026.csv')]
```

La segunda línea sale vacía porque en `datos` no hay ningún `.csv`: están en la subcarpeta, y `glob()` no baja. La `r` de `rglob` es de *recursivo*, y es la que los encuentra.

En los patrones, `*` significa "cualquier cosa" y `?` "un carácter cualquiera". Así, `*.csv` son todos los CSV, `ventas-*` todo lo que empiece por eso y `informe-202?.txt` cubre del 2020 al 2029.

> [!nota] Los Path se imprimen con su tipo dentro de una lista
>
> Al imprimir una lista de rutas ves `PosixPath('datos/notas.txt')` en vez de la ruta a secas. Es la representación técnica que usa Python dentro de las colecciones. Si imprimes la ruta sola con `print(ruta)`, o la metes en una f-string, sale limpia.

## Leer y escribir en un solo paso

Para ficheros pequeños, `pathlib` te ahorra el `with`:

```python
from pathlib import Path

destino = Path("saludo.txt")
destino.write_text("Hola desde pathlib\n", encoding="utf-8")

contenido = destino.read_text(encoding="utf-8")
print(repr(contenido))
```

```salida
'Hola desde pathlib\n'
```

`write_text()` crea el fichero o lo reemplaza entero, igual que el modo `"w"`, y `read_text()` lo devuelve como una cadena, igual que `read()`. Ambos abren y cierran solos.

> [!aviso] También aquí hace falta el encoding
>
> `read_text()` y `write_text()` sin `encoding` heredan el mismo problema que `open()` sin `encoding`: dependen del sistema. Escríbelo siempre.

Para ficheros grandes sigue usando `with open(ruta)` y el bucle `for`, porque `read_text()` carga todo en memoria de golpe.

## Renombrar y borrar

```python
from pathlib import Path

origen = Path("datos") / "notas.txt"
destino = Path("datos") / "notas-antiguas.txt"
origen.rename(destino)
print(destino.exists(), origen.exists())

temporal = Path("datos") / "borrame.tmp"
temporal.write_text("nada importante\n", encoding="utf-8")
print(temporal.exists())
temporal.unlink()
print(temporal.exists())
```

```salida
True False
True
False
```

`rename()` cambia el nombre o mueve el fichero, y `unlink()` lo borra. El nombre `unlink` viene de Unix y despista; es el borrar de toda la vida.

> [!aviso] unlink() borra de verdad
>
> No manda el fichero a la papelera: lo elimina. Y `rename()` sobre un destino que ya existe lo sustituye sin preguntar en macOS y Linux. Antes de borrar o mover en un programa que trabaje con ficheros ajenos, comprueba con `exists()` y pregunta.

## Las dos rutas de referencia

Toda ruta relativa se resuelve desde algún punto, y confundir cuál es el punto causa la mitad de los `FileNotFoundError`.

```python title="programa.py"
from pathlib import Path

print(Path.cwd())
print(Path(__file__))
print(Path(__file__).parent)
```

```salida
/Users/erwin/curso-python
/Users/erwin/curso-python/programa.py
/Users/erwin/curso-python
```

- `Path.cwd()` es la **carpeta actual de trabajo**: aquella desde la que se lanzó el comando `python`. Cambia según desde dónde ejecutes.
- `Path(__file__)` es la ruta del fichero `.py` que se está ejecutando, y `.parent` la carpeta donde vive. No cambia nunca.

Cuando escribes `open("datos/notas.txt")`, Python busca desde `Path.cwd()`. Si tu programa está en `proyecto/` junto a su carpeta `datos/`, pero lo ejecutas desde el escritorio con `python proyecto/programa.py`, buscará `datos/notas.txt` en el escritorio y no lo encontrará.

> [!consejo] Ancla las rutas al fichero del programa
>
> La costumbre que evita el problema entero es poner esto arriba del todo y colgar de ahí todas las rutas:
>
> ```python
> from pathlib import Path
>
> BASE = Path(__file__).parent
> RUTA_DATOS = BASE / "datos"
> RUTA_INFORME = BASE / "salida" / "informe.txt"
> ```
>
> Así el programa encuentra sus ficheros desde cualquier carpeta desde la que lo lances.

## Un inventario de carpeta

Juntando `rglob`, `suffix` y el `Counter` de la lección de la biblioteca estándar:

```python title="inventario.py"
from collections import Counter
from pathlib import Path

CARPETA = Path("datos")


def inventariar(carpeta: Path) -> None:
        """Muestra cuántos ficheros hay de cada extensión, mirando también las subcarpetas."""
    extensiones = Counter()
    total_bytes = 0

    for elemento in carpeta.rglob("*"):
                if elemento.is_file():
                        extensiones[elemento.suffix] += 1
            total_bytes += elemento.stat().st_size

    print(f"Ficheros en {carpeta}: {sum(extensiones.values())}")
    for extension, cuantos in extensiones.most_common():
                print(f"  {extension:<6} {cuantos}")
    print(f"Ocupan {total_bytes} bytes en total")


inventariar(CARPETA)
```

```salida
Ficheros en datos: 4
  .csv   2
  .md    1
  .txt   1
Ocupan 76 bytes en total
```

El `rglob("*")` devuelve ficheros **y** carpetas, por eso hace falta el `is_file()` para descartar las segundas. `stat().st_size` da el tamaño en bytes. El total dependerá de lo que tengas dentro, claro.

> [!error] FileNotFoundError: \[Errno 2\] No such file or directory: 'datos/notas.txt'
>
> Con `pathlib` el error es el mismo que con cadenas, y la causa más probable sigue siendo la carpeta desde la que ejecutas. Para verlo de un vistazo, imprime la ruta absoluta antes de abrir: `print(ruta.resolve())`. Te dirá exactamente dónde está mirando Python, y casi siempre la sorpresa está ahí.

> [!resumen] En resumen
>
> `pathlib` trata las rutas como rutas y no como texto, y por eso el mismo código funciona en Windows, macOS y Linux. Las rutas se construyen con `Path("datos") / "fichero.txt"` y se descomponen con `name`, `stem`, `suffix` y `parent`. `exists()`, `is_file()` e `is_dir()` responden sin fallar, `mkdir(parents=True, exist_ok=True)` asegura una carpeta, `iterdir()` lista un nivel y `glob()` y `rglob()` buscan por patrón, el segundo bajando por las subcarpetas. Para ficheros pequeños, `read_text()` y `write_text()` evitan el `with`, siempre con su `encoding`. Y para que tu programa encuentre sus datos desde donde sea que lo lancen, ancla las rutas a `Path(__file__).parent`.

> [!ejercicio] Practica
>
> Crea `46-rutas.py` y resuelve:
>
> 1. Construye con `Path` la ruta `proyecto/datos/clientes.csv` e imprime su `name`, su `stem`, su `suffix` y su `parent`.
> 2. Crea la carpeta `salida/informes` con una sola llamada, y haz que ejecutar el programa dos veces seguidas no dé ningún error.
> 3. Escribe cinco ficheros `.txt` dentro de `salida` con `write_text()`, y después lístalos ordenados alfabéticamente.
> 4. Escribe una función `renombrar_a_minusculas(carpeta)` que pase a minúsculas el nombre de todos los ficheros de una carpeta, conservando la extensión.
> 5. Cuenta cuántos ficheros `.py` hay en la carpeta de tus ejercicios del curso, subcarpetas incluidas, y muestra el más largo en bytes.
> 6. Imprime `Path.cwd()` y `Path(__file__).parent`. Ejecuta el programa desde su propia carpeta y después desde la carpeta de arriba (`python3 46/46-rutas.py`) y compara las dos salidas.
