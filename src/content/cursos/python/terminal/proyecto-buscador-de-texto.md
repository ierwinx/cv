---
titulo: "Proyecto: buscador de texto"
resumen: "Un clon sencillo de grep con expresiones regulares, entrada estándar, resaltado en color y los códigos de salida que lo hacen encadenable."
minutos: 45
orden: 28
---

`grep` es la herramienta que más se usa en una terminal después de `cd` y `ls`. Busca un texto dentro de ficheros y escribe las líneas que lo contienen. Existe desde 1973 y no ha cambiado mucho, porque no hace falta.

Escribir una versión propia es el mejor cierre posible para este módulo, porque obliga a tocar todo lo que se ha visto: argumentos, colores, entrada estándar, tuberías, códigos de salida y errores por `stderr`. Y de paso introduce lo único nuevo de esta lección: las **expresiones regulares**, que son la forma de describir un patrón de texto en vez de un texto concreto.

> [!objetivo] Qué vas a aprender
>
> Construir un buscador de texto en ficheros con expresiones regulares. Se practica el módulo `re`, la lectura desde `sys.stdin` para encadenar la herramienta con tuberías, el resaltado con códigos ANSI, los códigos de salida como convención (0 si encuentra, 1 si no), el manejo de `BrokenPipeError` y la detección de ficheros binarios.

## Cómo se va a usar

```bash
buscar "TODO" tienda/src/tienda.py
buscar -rn "ERROR" tienda
cat registro.log | buscar "^2026-09-18.*ERROR"
buscar -rc "TODO" tienda
```

Y lo que lo hace una herramienta de terminal de verdad y no un programa suelto:

```bash
if buscar -r "contraseña" src/ > /dev/null; then
  echo "hay una contraseña en el código"
fi
```

Ese `if` funciona porque el programa devuelve 0 cuando encuentra algo y 1 cuando no. Volveremos a ello.

## Lo imprescindible de las expresiones regulares

Una expresión regular es un patrón que describe una familia de textos. En vez de buscar `ERROR`, buscas "cuatro dígitos, un guion, dos dígitos" y encuentras todas las fechas del fichero.

El módulo se llama `re` y viene en la biblioteca estándar.

```python
import re

texto = "El pedido 8812 salió el 2026-09-18 y el 8813 el 2026-09-19."

print(re.search(r"\d+", texto))
print(re.search(r"\d+", texto).group())
print(re.findall(r"\d{4}-\d{2}-\d{2}", texto))
print(re.search(r"bizum", texto))
```

```salida
<re.Match object; span=(10, 14), match='8812'>
8812
['2026-09-18', '2026-09-19']
None
```

Cuatro cosas ya en este ejemplo:

- **`re.search` busca el patrón en cualquier parte del texto** y devuelve un objeto `Match` con lo encontrado, o `None` si no hay nada. Ese `None` es lo que permite escribir `if re.search(...)`.
- **`.group()`** saca el texto que encajó, y **`.span()`** las posiciones de inicio y fin, que es lo que hará falta para resaltarlo en color.
- **`re.findall`** devuelve una lista con todas las coincidencias.
- **`\d`** significa "un dígito" y **`{4}`** significa "cuatro veces".

Los patrones se escriben siempre entre `r"..."`, una **cadena en bruto**. La razón es que la barra invertida es el carácter de escape de Python y también el de las expresiones regulares, y sin la `r` habría que duplicarla:

```python
print(r"\d+")
print(len(r"\d+"), len("\n"))
```

```salida
\d+
3 1
```

`r"\d+"` son tres caracteres: barra, d, más. `"\n"` es uno solo, el salto de línea. Escribir `"\d+"` sin la `r` funciona hoy de milagro, pero Python ya avisa:

```salida
SyntaxWarning: "\d" is an invalid escape sequence. Such sequences will not work in the future. Did you mean "\\d"? A raw string is also an option.
```

La regla es mecánica: **todo patrón, con `r` delante**. Siempre.

Esto es lo que necesitas para esta lección y para el noventa por ciento de lo que te vas a encontrar:

| Patrón | Significa |
| --- | --- |
| `abc` | Ese texto tal cual |
| `.` | Un carácter cualquiera, menos el salto de línea |
| `\d` | Un dígito. `\D` es lo contrario |
| `\w` | Una letra, un dígito o un guion bajo. `\W` es lo contrario |
| `\s` | Un espacio, tabulador o salto de línea. `\S` es lo contrario |
| `[aeiou]` | Uno cualquiera de esos caracteres |
| `[^aeiou]` | Cualquiera menos esos |
| `[a-z]` | Un carácter del rango |
| `*` | Cero o más veces lo anterior |
| `+` | Una o más veces lo anterior |
| `?` | Cero o una vez lo anterior |
| `{3}` | Exactamente tres veces. `{2,5}`, entre dos y cinco |
| `^` | El principio de la línea |
| `$` | El final de la línea |
| `\b` | Un límite de palabra |
| `(...)` | Un grupo, para agrupar o para capturar |

Falta uno que no cabe en la tabla porque su símbolo rompería las columnas: la **barra vertical** es la alternativa, y `ERROR|WARNING` encaja con cualquiera de las dos palabras.

Algunos ejemplos que ya se pueden leer:

| Patrón | Encuentra |
| --- | --- |
| `r"^def "` | Las líneas que empiezan por `def` |
| `r"\d{4}-\d{2}-\d{2}"` | Fechas como `2026-09-18` |
| `r"\bIVA\b"` | La palabra IVA suelta, no la de `PRIVADO` |
| `r"^\s*$"` | Las líneas vacías o con solo espacios |
| `r"[\w.+-]+@[\w-]+\.[\w.]+"` | Direcciones de correo, más o menos |

Y con la barra vertical, `r"TODO|FIXME"` encuentra cualquiera de las dos marcas, y `r"ERROR|WARNING"` cualquiera de los dos niveles de un registro.

Dos funciones más que hacen falta para el proyecto:

```python
import re

texto = "El pedido 8812 salió el 2026-09-18 y el 8813 el 2026-09-19."

for encaje in re.finditer(r"pedido (\d+)", texto):
        print(encaje.span(), encaje.group(), encaje.group(1))

print(re.search(r"PEDIDO", texto, re.IGNORECASE))
```

```salida
(3, 14) pedido 8812 8812
<re.Match object; span=(3, 9), match='pedido'>
```

- **`re.finditer`** recorre todas las coincidencias entregando el `Match` completo, con sus posiciones. Es lo que usaremos para saber qué tramos hay que pintar de rojo.
- **`group(1)`** da el contenido del primer paréntesis. Los grupos se numeran desde 1; el 0 es la coincidencia entera.
- **`re.IGNORECASE`** es una **bandera** que hace que no distinga mayúsculas de minúsculas. Es la que implementa la opción `-i`.

> [!consejo] Compila los patrones que vas a usar muchas veces
>
> `re.search(patron, texto)` compila el patrón cada vez que se llama. Hay una caché interna que lo disimula, pero cuando el mismo patrón se va a aplicar a cien mil líneas, lo correcto es compilarlo una vez:
>
> ```python
> expresion = re.compile(r"\d{4}-\d{2}-\d{2}")
> for linea in fichero:
>         if expresion.search(linea):
>                 ...
> ```
>
> El objeto que devuelve `re.compile` tiene los mismos métodos, `search`, `findall`, `finditer`, pero sin el primer argumento. Es lo que hace el buscador.

> [!aviso] Si buscas un texto literal, escápalo
>
> `re.search("3.99", "cuesta 3X99 euros")` encuentra algo, porque el punto significa "un carácter cualquiera". Cuando el patrón viene de fuera y tiene que tomarse al pie de la letra, `re.escape()` pone las barras invertidas donde hacen falta:
>
> ```python
> print(re.escape("precio: 3.99 (oferta)"))
> ```
>
> ```salida
> precio:\ 3\.99\ \(oferta\)
> ```
>
> En nuestro buscador el patrón se interpreta como expresión regular a propósito, igual que en `grep`. Pero si algún día construyes uno a partir de lo que escribe un usuario en un formulario, `re.escape` es obligatorio.

## El diseño

Dos módulos, la separación de siempre:

```text title="estructura del proyecto"
buscador/
    pyproject.toml
    src/
        buscador/
            __init__.py
            busqueda.py   Compilar, buscar, recorrer ficheros, detectar binarios
            cli.py        Argumentos, color, entrada estándar y códigos de salida
            __main__.py
```

| Módulo | De qué se encarga | ¿Imprime? |
| --- | --- | --- |
| `busqueda.py` | Encontrar las líneas que encajan y decir dónde | No |
| `cli.py` | Argumentos, color, tuberías, códigos de salida | Sí |

La pieza que las une es una dataclass. `busqueda.py` no devuelve texto ya formateado: devuelve **datos** sobre lo encontrado, y `cli.py` decide cómo se ven.

## Parte 1: compilar el patrón

```python title="src/buscador/busqueda.py"
import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

TAMANO_MUESTRA = 1024


@dataclass
class Coincidencia:
        """Una línea que cumple lo que se buscaba."""

    origen: str
    numero: int
    linea: str
    tramos: list[tuple[int, int]]


def compilar(patron: str, ignorar_mayusculas: bool = False) -> re.Pattern:
        """Compila el patrón una sola vez y traduce re.error a ValueError."""
    banderas = re.IGNORECASE if ignorar_mayusculas else 0
    try:
                return re.compile(patron, banderas)
    except re.error as error:
                raise ValueError(f"patrón no válido: {error}") from None
```

- **`Coincidencia` guarda las posiciones, no el texto pintado.** El campo `tramos` es una lista de parejas `(inicio, fin)`: las posiciones dentro de la línea donde encajó el patrón. Con eso, la capa de interfaz puede pintarlas de rojo, subrayarlas, rodearlas de asteriscos o ignorarlas. Si `busqueda.py` devolviera la línea con los códigos ANSI ya metidos, la opción `--color nunca` sería imposible sin duplicar código.
- **`origen` es una cadena y no un `Path`** porque una de las fuentes no es un fichero: es la entrada estándar, y se identifica con un texto.
- **Un patrón mal escrito lanza `re.error`**, que es una excepción del módulo y que `cli.py` no debería tener que conocer. Se traduce a `ValueError`, que es lo que significa de verdad: el valor que te han dado no vale.
- **`banderas` vale `0` cuando no hay ninguna**, porque las banderas de `re` son números que se combinan sumando bits, y el cero es "ninguna". Es el valor neutro.

## Parte 2: buscar en las líneas

El corazón del programa son nueve líneas:

```python title="src/buscador/busqueda.py"
def buscar_en_lineas(
    expresion: re.Pattern,
    lineas: Iterable[str],
    origen: str,
    invertir: bool = False,
) -> Iterator[Coincidencia]:
        """Recorre las líneas y va entregando las que cumplen el patrón."""
    for numero, linea in enumerate(lineas, start=1):
                linea = linea.rstrip("\n")
        tramos = [encaje.span() for encaje in expresion.finditer(linea)]
        if invertir:
                        if not tramos:
                                yield Coincidencia(origen, numero, linea, [])
        elif tramos:
                        yield Coincidencia(origen, numero, linea, tramos)
```

```python
from buscador.busqueda import buscar_en_lineas, compilar

lineas = [
    "2026-09-18 10:03:41 WARNING stock negativo en el producto 44\n",
    "2026-09-18 10:04:02 ERROR  no se ha podido conectar\n",
    "2026-09-18 10:05:00 INFO  pedido 8812 confirmado\n",
]

expresion = compilar(r"\d{4}")
for coincidencia in buscar_en_lineas(expresion, lineas, "registro.log"):
        print(coincidencia.numero, coincidencia.tramos, coincidencia.linea[:30])

expresion = compilar("error", ignorar_mayusculas=True)
print([c.numero for c in buscar_en_lineas(expresion, lineas, "x")])
print([c.numero for c in buscar_en_lineas(expresion, lineas, "x", invertir=True)])
```

```salida
1 [(0, 4)] 2026-09-18 10:03:41 WARNING st
2 [(0, 4)] 2026-09-18 10:04:02 ERROR  no 
3 [(0, 4), (33, 37)] 2026-09-18 10:05:00 INFO  pedi
```

```salida
[2]
[1, 3]
```

Las decisiones:

- **Es un generador.** El `yield` en vez de acumular en una lista es lo que permite buscar en un registro de doce megas sin cargarlo entero en memoria, y es lo que hace que la primera coincidencia aparezca en pantalla al instante en vez de al final. Combinado con la lectura línea a línea, el consumo de memoria del programa no depende del tamaño del fichero.
- **Recibe cualquier iterable de cadenas**, no una ruta. Por eso la misma función sirve para un fichero abierto, para `sys.stdin` y para la lista de tres cadenas del ejemplo. Probarla no requiere crear ficheros.
- **`enumerate(lineas, start=1)`** numera desde 1 porque los editores de texto numeran desde 1.
- **`rstrip("\n")`** quita el salto final, que si no se cuela en el `print`. Se usa `rstrip("\n")` y no `strip()` a secas para no perder la sangría de la línea, que en código fuente es información.
- **La inversión se resuelve con los mismos tramos.** Con `-v` la línea buena es la que no encajó, así que sus `tramos` están vacíos y se entrega con la lista vacía. No hay nada que resaltar en una línea que se ha elegido por no contener el patrón.
- **La tercera línea del ejemplo tiene dos tramos**, `2026` y `8812`, y ahí se ve para qué sirve guardar las posiciones.

## Parte 3: qué ficheros mirar, y cuáles no

```python title="src/buscador/busqueda.py"
def es_binario(ruta: Path) -> bool:
        """Un fichero con un byte cero en su primer kilobyte no es texto."""
    with open(ruta, "rb") as fichero:
                return b"\x00" in fichero.read(TAMANO_MUESTRA)


def leer_lineas(ruta: Path) -> Iterator[str]:
        """Lee el fichero línea a línea sin cargarlo entero en memoria."""
    with open(ruta, encoding="utf-8", errors="replace") as fichero:
                yield from fichero


def expandir(rutas: list[Path], recursivo: bool = False) -> tuple[list[Path], list[str]]:
        """Convierte lo que se pidió en una lista de ficheros, y avisa de lo que descarta."""
    ficheros: list[Path] = []
    avisos: list[str] = []

    for ruta in rutas:
                if not ruta.exists():
                        avisos.append(f"{ruta}: no existe")
        elif ruta.is_file():
                        ficheros.append(ruta)
        elif ruta.is_dir() and recursivo:
                        ficheros.extend(
                hijo for hijo in sorted(ruta.rglob("*"))
                if hijo.is_file() and not any(parte.startswith(".") for parte in hijo.parts)
            )
        elif ruta.is_dir():
                        avisos.append(f"{ruta}: es una carpeta (usa -r)")
        else:
                        avisos.append(f"{ruta}: no es un fichero normal")

    return ficheros, avisos
```

```python
from pathlib import Path

from buscador.busqueda import es_binario, expandir

print(es_binario(Path("tienda/datos.bin")), es_binario(Path("tienda/registro.log")))

ficheros, avisos = expandir([Path("tienda")], recursivo=True)
print([str(f) for f in ficheros])
print(expandir([Path("tienda"), Path("no-existe.txt")]))
```

```salida
True False
['tienda/datos.bin', 'tienda/docs/leeme.md', 'tienda/registro.log', 'tienda/src/clientes.py', 'tienda/src/tienda.py']
([], ['tienda: es una carpeta (usa -r)', 'no-existe.txt: no existe'])
```

Las decisiones:

- **Los binarios se detectan buscando un byte cero.** Es la heurística que usan `grep`, `git` y casi todo el mundo, y funciona porque un fichero de texto en UTF-8 no contiene nunca el byte `0x00`, mientras que casi cualquier formato binario lo tiene en el primer kilobyte. No es infalible, pero se equivoca poquísimo y cuesta dos líneas. Sin ella, buscar en una carpeta con imágenes llena la terminal de basura y puede dejarla en un estado raro, porque entre esos bytes hay secuencias de control.
- **Solo se lee el primer kilobyte**, no el fichero entero. Con un vídeo de dos gigas la diferencia no es pequeña.
- **`errors="replace"` al leer texto.** Un fichero de texto puede tener un byte suelto que no es UTF-8 válido, por ejemplo porque viene de un sistema antiguo. Sin esa opción, el programa moriría con `UnicodeDecodeError` a mitad de la búsqueda; con ella, ese byte se convierte en el carácter de reemplazo y la línea se busca igual.
- **`yield from fichero`** es un generador que entrega las líneas del fichero según se piden. Lo importante es que el `with` sigue abierto mientras se consume: el fichero se cierra cuando el generador se agota.
- **`expandir` devuelve los avisos en vez de imprimirlos.** Es la misma regla del resto del módulo: la lógica informa, la interfaz decide. Aquí se nota porque esos avisos van a `stderr`, y decidir eso no es asunto de `busqueda.py`.
- **Los ficheros ocultos se saltan al bajar por una carpeta.** Sin ese `any(...)`, un `buscar -r "algo" .` en un proyecto con Git se metería en `.git/` y sacaría cientos de resultados inútiles. Si se nombra el fichero oculto explícitamente, en cambio, se busca en él: lo pediste tú.

> [!nota] Un fichero nombrado explícitamente no se discute
>
> Fíjate en la asimetría: `-r` sobre una carpeta salta los ocultos y los binarios, pero `buscar "x" .gitignore` busca en `.gitignore` sin rechistar. Es la convención de las herramientas de terminal: cuando el usuario nombra algo, sabe lo que hace; cuando la herramienta adivina, se pone prudente. Las opciones por defecto son para el caso en que nadie ha dicho nada.

## Parte 4: resaltar las coincidencias

```python title="src/buscador/cli.py"
NORMAL = "\033[0m"
ROJO = "\033[1;31m"
MAGENTA = "\033[35m"
VERDE = "\033[32m"
CIAN = "\033[36m"


def resaltar(coincidencia: Coincidencia, color: bool) -> str:
        """Devuelve la línea con los tramos encontrados envueltos en rojo."""
    if not color or not coincidencia.tramos:
                return coincidencia.linea

    trozos = []
    final_anterior = 0
    for inicio, fin in coincidencia.tramos:
                trozos.append(coincidencia.linea[final_anterior:inicio])
        trozos.append(ROJO + coincidencia.linea[inicio:fin] + NORMAL)
        final_anterior = fin
    trozos.append(coincidencia.linea[final_anterior:])
    return "".join(trozos)


def pintar_coincidencia(coincidencia: Coincidencia, opciones, varios: bool, color: bool) -> None:
        """Imprime una línea al estilo de grep: fichero, número y texto."""
    partes = []
    if varios:
                nombre = coincidencia.origen
        partes.append(f"{MAGENTA}{nombre}{NORMAL}" if color else nombre)
    if opciones.numero_de_linea:
                numero = str(coincidencia.numero)
        partes.append(f"{VERDE}{numero}{NORMAL}" if color else numero)
    partes.append(resaltar(coincidencia, color))
    separador = f"{CIAN}:{NORMAL}" if color else ":"
    print(separador.join(partes))
```

`resaltar` reconstruye la línea a trozos alternando lo que no encajó con lo que sí, usando `final_anterior` para no perderse nada por el camino. La tentación es hacerlo con `linea.replace(encontrado, ROJO + encontrado + NORMAL)`, y es un error: `replace` sustituiría también las apariciones que el patrón no había seleccionado, y con `-i` ni siquiera encontraría las que tienen otra capitalización. Las posiciones que devuelve `finditer` son exactas; el texto, no.

Se construyen los trozos en una lista y se juntan al final con `"".join()` en vez de ir concatenando con `+=`, que es lo que viste en la lección de cadenas: concatenar en un bucle crea una cadena nueva en cada vuelta.

`pintar_coincidencia` arma la línea con la estructura clásica de `grep`, `fichero:numero:texto`, saltándose las partes que no toquen. Y el nombre del fichero solo sale **si hay más de uno**: cuando buscas en un solo fichero ya sabes cuál es, y repetirlo ochenta veces solo estorba.

```bash
buscar --color siempre -n "ERROR|WARNING" tienda/registro.log
```

```salida
3:2026-09-18 10:03:41 WARNING stock negativo en el producto 44
4:2026-09-18 10:04:02 ERROR  no se ha podido conectar con la pasarela de pago
6:2026-09-18 10:04:19 ERROR  no se ha podido conectar con la pasarela de pago
```

Esta salida está capturada a un fichero, así que sale limpia. En la terminal, el número de línea va en verde, los dos puntos en cian y `ERROR` y `WARNING` en rojo brillante. Lo que de verdad viaja por la tubería es esto:

```text
\033[32m3\033[0m\033[36m:\033[0m2026-09-18 10:03:41 \033[1;31mWARNING\033[0m stock negativo...
```

Por eso existe `--color` con sus tres valores y por eso, en modo `auto`, el color se apaga solo cuando la salida no va a una terminal. Igual que en el proyecto anterior:

```python title="src/buscador/cli.py"
def quiere_color(modo: str) -> bool:
        if modo == "nunca":
                return False
    if modo == "siempre":
                return True
    if os.environ.get("NO_COLOR"):
                return False
    return sys.stdout.isatty()
```

## Parte 5: leer de la entrada estándar

Esta es la diferencia entre un programa que busca en ficheros y una herramienta de terminal:

```python title="src/buscador/cli.py"
        if not opciones.ficheros:
                fuentes = [(ENTRADA_ESTANDAR, sys.stdin)]
        varios = False
    else:
                fuentes = []
        varios = len(ficheros) > 1
        for fichero in ficheros:
                        try:
                                if es_binario(fichero):
                                        print(f"buscador: {fichero}: fichero binario, me lo salto", file=sys.stderr)
                    continue
                fuentes.append((str(fichero), leer_lineas(fichero)))
            except OSError as error:
                                print(f"buscador: {fichero}: {error.strerror}", file=sys.stderr)
                hubo_errores = True
```

La clave es que `fuentes` es una lista de parejas `(nombre, iterable de líneas)`, y a `buscar_en_lineas` le da exactamente igual de dónde salgan esas líneas. `sys.stdin` se recorre con un `for` como cualquier fichero abierto, porque es un fichero abierto: el que el sistema operativo conecta a la entrada del proceso.

```bash
cat tienda/registro.log | buscar "ERROR"
```

```salida
2026-09-18 10:04:02 ERROR  no se ha podido conectar con la pasarela de pago
2026-09-18 10:04:19 ERROR  no se ha podido conectar con la pasarela de pago
```

```bash
ls tienda | buscar "\.log$"
```

```salida
registro.log
```

En el segundo ejemplo el buscador ni siquiera está leyendo un fichero: está filtrando la salida de `ls`. Eso es lo que significa encajar en la terminal, y sale de una sola decisión de diseño: **si no hay ficheros, la fuente es `sys.stdin`**.

- **`nargs="*"` en el argumento `ficheros`** es lo que permite que la lista esté vacía sin que `argparse` proteste.
- **Con la entrada estándar, `varios` es `False`**, así que no se imprime el nombre del origen delante de cada línea. Poner `(entrada estándar):` ochenta veces sería ruido, y además rompería el encadenado con otras herramientas.

## Parte 6: el código de salida, que es lo que lo hace encadenable

`grep` tiene una convención que lleva cincuenta años en pie:

| Código | Significa |
| --- | --- |
| `0` | Ha encontrado al menos una coincidencia |
| `1` | No ha encontrado ninguna. No es un error |
| `2` | Ha habido un problema: un fichero que no existe, un patrón mal escrito |

```python title="src/buscador/cli.py"
        if hubo_errores and not encontrado:
                return 2
    return 0 if encontrado else 1
```

Dos líneas, y son las que convierten el programa en una pieza de construcción. La terminal usa el código de salida como valor de verdad, así que:

```bash
if buscar -r "IVA" tienda > /dev/null 2>&1; then
  echo "queda IVA por revisar"
else
  echo "nada de IVA"
fi
```

```salida
queda IVA por revisar
```

Fíjate en que **"no he encontrado nada" devuelve 1 y no es un fallo**. Es la parte que más cuesta aceptar, porque un 1 parece un error. Pero si "no encontrado" devolviera 0, el `if` de arriba sería siempre verdadero y no serviría para nada. El código de salida no dice "¿ha ido bien?", dice "¿la respuesta es que sí?".

Y por eso el 2 existe: hay que poder distinguir "he mirado y no hay" de "no he podido mirar". El `if hubo_errores and not encontrado` es deliberado: si se encontró algo en cuatro ficheros y el quinto no existía, la respuesta útil sigue siendo que sí, y el aviso ya salió por `stderr`.

## Parte 7: cuando quien te lee se va

Prueba a encadenar cualquier programa largo con `head`:

```bash
buscar -n "peticion" grande.log | head -3
```

`head` imprime tres líneas y se cierra. Pero el buscador sigue escribiendo en una tubería que ya no tiene a nadie al otro lado, y el siguiente `print` revienta con `BrokenPipeError`. Sin tratarlo, la salida es un traceback feísimo y, de propina, un segundo mensaje de "Exception ignored" cuando el intérprete intenta vaciar la salida al cerrar.

```python title="src/buscador/cli.py"
def ejecutar() -> int:
        """Envoltorio que aguanta las tuberías cerradas y el Ctrl+C."""
    try:
                codigo = main()
        sys.stdout.flush()
    except KeyboardInterrupt:
                print("\nbuscador: interrumpido", file=sys.stderr)
        return 130
    except BrokenPipeError:
        # Quien leía se ha ido. Se desvía la salida al vacío para que Python
        # no vuelva a intentar vaciarla al cerrar y se queje.
                os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 141
    return codigo
```

Tres detalles, y ninguno es evidente:

- **El `flush` va dentro del `try`.** La salida está en un búfer, así que el `BrokenPipeError` puede no aparecer en el `print` sino más tarde, al vaciarlo. Si el `flush` quedara fuera, la excepción se escaparía del `try` y no habríamos ganado nada.
- **El `dup2` sobre `/dev/null`** sustituye el descriptor de la salida estándar por el agujero negro del sistema. Sin eso, al terminar el programa Python intenta vaciar `stdout` una última vez, vuelve a fallar y escribe por `stderr` un `Exception ignored in: <_io.TextIOWrapper name='<stdout>'...>` que no hay forma de capturar desde el código normal.
- **El 141 es 128 más 13**, y 13 es el número de la señal `SIGPIPE`. Es lo que devolvería un programa en C, que se muere por la señal en vez de recibir una excepción. Python desactiva esa señal y te la entrega como `BrokenPipeError`, pero el código de salida conviene mantenerlo por compatibilidad.

Y hay una trampa más, que se ve mirando la jerarquía de excepciones:

```python title="src/buscador/cli.py"
                except BrokenPipeError:
            # Es un OSError, así que hay que dejarlo pasar antes del except de abajo.
                        raise
        except OSError as error:
                        print(f"buscador: {origen}: {error.strerror}", file=sys.stderr)
```

**`BrokenPipeError` hereda de `OSError`.** El bucle que recorre los ficheros captura `OSError` para avisar de permisos denegados, y sin ese `except ... raise` delante se tragaría también la tubería rota, imprimiendo un absurdo `buscador: grande.log: Broken pipe` justo después de que `head` haya hecho su trabajo. Poner primero el `except` más específico y volver a lanzarlo es la forma de dejarlo pasar.

Con todo en su sitio, el encadenado con `head` es limpio:

```bash
buscar -n "peticion" grande.log | head -3
echo $?
```

```salida
1:2026-09-18 10:00:00 INFO  peticion 0 atendida en 0 ms
2:2026-09-18 10:00:01 INFO  peticion 1 atendida en 1 ms
3:2026-09-18 10:00:02 INFO  peticion 2 atendida en 2 ms
0
```

El `0` es el código de `head`, que es el último de la tubería. El 141 del buscador está ahí, pero la terminal informa del último eslabón.

## El programa completo

```python title="src/buscador/busqueda.py"
"""La lógica de la búsqueda. No imprime ni lee argumentos."""

import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

TAMANO_MUESTRA = 1024


@dataclass
class Coincidencia:
        """Una línea que cumple lo que se buscaba."""

    origen: str
    numero: int
    linea: str
    tramos: list[tuple[int, int]]


def compilar(patron: str, ignorar_mayusculas: bool = False) -> re.Pattern:
        """Compila el patrón una sola vez y traduce re.error a ValueError."""
    banderas = re.IGNORECASE if ignorar_mayusculas else 0
    try:
                return re.compile(patron, banderas)
    except re.error as error:
                raise ValueError(f"patrón no válido: {error}") from None


def buscar_en_lineas(
    expresion: re.Pattern,
    lineas: Iterable[str],
    origen: str,
    invertir: bool = False,
) -> Iterator[Coincidencia]:
        """Recorre las líneas y va entregando las que cumplen el patrón."""
    for numero, linea in enumerate(lineas, start=1):
                linea = linea.rstrip("\n")
        tramos = [encaje.span() for encaje in expresion.finditer(linea)]
        if invertir:
                        if not tramos:
                                yield Coincidencia(origen, numero, linea, [])
        elif tramos:
                        yield Coincidencia(origen, numero, linea, tramos)


def es_binario(ruta: Path) -> bool:
        """Un fichero con un byte cero en su primer kilobyte no es texto."""
    with open(ruta, "rb") as fichero:
                return b"\x00" in fichero.read(TAMANO_MUESTRA)


def leer_lineas(ruta: Path) -> Iterator[str]:
        """Lee el fichero línea a línea sin cargarlo entero en memoria."""
    with open(ruta, encoding="utf-8", errors="replace") as fichero:
                yield from fichero


def expandir(rutas: list[Path], recursivo: bool = False) -> tuple[list[Path], list[str]]:
        """Convierte lo que se pidió en una lista de ficheros, y avisa de lo que descarta."""
    ficheros: list[Path] = []
    avisos: list[str] = []

    for ruta in rutas:
                if not ruta.exists():
                        avisos.append(f"{ruta}: no existe")
        elif ruta.is_file():
                        ficheros.append(ruta)
        elif ruta.is_dir() and recursivo:
                        ficheros.extend(
                hijo for hijo in sorted(ruta.rglob("*"))
                if hijo.is_file() and not any(parte.startswith(".") for parte in hijo.parts)
            )
        elif ruta.is_dir():
                        avisos.append(f"{ruta}: es una carpeta (usa -r)")
        else:
                        avisos.append(f"{ruta}: no es un fichero normal")

    return ficheros, avisos
```

```python title="src/buscador/cli.py"
"""La interfaz: argumentos, color, entrada estándar y códigos de salida."""

import argparse
import os
import sys
from pathlib import Path

from .busqueda import (
    Coincidencia,
    buscar_en_lineas,
    compilar,
    es_binario,
    expandir,
    leer_lineas,
)

NORMAL = "\033[0m"
ROJO = "\033[1;31m"
MAGENTA = "\033[35m"
VERDE = "\033[32m"
CIAN = "\033[36m"

ENTRADA_ESTANDAR = "(entrada estándar)"


def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(
        prog="buscador",
        description="Busca un patrón en ficheros, o en lo que le llegue por una tubería.",
        epilog="Sin ficheros, lee de la entrada estándar. Devuelve 0 si encuentra algo y 1 si no.",
    )
    analizador.add_argument("patron", help="expresión regular que hay que buscar")
    analizador.add_argument(
        "ficheros",
        nargs="*",
        type=Path,
        help="ficheros o carpetas donde buscar (si no pones ninguno, lee de la entrada estándar)",
    )
    analizador.add_argument("-i", "--ignorar-mayusculas", action="store_true",
                            help="no distinguir mayúsculas de minúsculas")
    analizador.add_argument("-n", "--numero-de-linea", action="store_true",
                            help="mostrar el número de línea")
    analizador.add_argument("-r", "--recursivo", action="store_true",
                            help="bajar por las subcarpetas de las carpetas indicadas")
    analizador.add_argument("-c", "--contar", action="store_true",
                            help="mostrar solo cuántas líneas encajan")
    analizador.add_argument("-v", "--invertir", action="store_true",
                            help="mostrar las líneas que NO encajan")
    analizador.add_argument("--color", choices=["auto", "siempre", "nunca"], default="auto",
                            help="cuándo colorear las coincidencias (por defecto: auto)")
    return analizador


def quiere_color(modo: str) -> bool:
        if modo == "nunca":
                return False
    if modo == "siempre":
                return True
    if os.environ.get("NO_COLOR"):
                return False
    return sys.stdout.isatty()


def resaltar(coincidencia: Coincidencia, color: bool) -> str:
        """Devuelve la línea con los tramos encontrados envueltos en rojo."""
    if not color or not coincidencia.tramos:
                return coincidencia.linea

    trozos = []
    final_anterior = 0
    for inicio, fin in coincidencia.tramos:
                trozos.append(coincidencia.linea[final_anterior:inicio])
        trozos.append(ROJO + coincidencia.linea[inicio:fin] + NORMAL)
        final_anterior = fin
    trozos.append(coincidencia.linea[final_anterior:])
    return "".join(trozos)


def pintar_coincidencia(coincidencia: Coincidencia, opciones, varios: bool, color: bool) -> None:
        """Imprime una línea al estilo de grep: fichero, número y texto."""
    partes = []
    if varios:
                nombre = coincidencia.origen
        partes.append(f"{MAGENTA}{nombre}{NORMAL}" if color else nombre)
    if opciones.numero_de_linea:
                numero = str(coincidencia.numero)
        partes.append(f"{VERDE}{numero}{NORMAL}" if color else numero)
    partes.append(resaltar(coincidencia, color))
    separador = f"{CIAN}:{NORMAL}" if color else ":"
    print(separador.join(partes))


def main(argumentos: list[str] | None = None) -> int:
        opciones = construir_analizador().parse_args(argumentos)
    color = quiere_color(opciones.color)

    try:
                expresion = compilar(opciones.patron, opciones.ignorar_mayusculas)
    except ValueError as error:
                print(f"buscador: {error}", file=sys.stderr)
        return 2

    ficheros, avisos = expandir(opciones.ficheros, opciones.recursivo)
    for aviso in avisos:
                print(f"buscador: {aviso}", file=sys.stderr)

    hubo_errores = bool(avisos)
    encontrado = False

    if not opciones.ficheros:
                fuentes = [(ENTRADA_ESTANDAR, sys.stdin)]
        varios = False
    else:
                fuentes = []
        varios = len(ficheros) > 1
        for fichero in ficheros:
                        try:
                                if es_binario(fichero):
                                        print(f"buscador: {fichero}: fichero binario, me lo salto", file=sys.stderr)
                    continue
                fuentes.append((str(fichero), leer_lineas(fichero)))
            except OSError as error:
                                print(f"buscador: {fichero}: {error.strerror}", file=sys.stderr)
                hubo_errores = True

    for origen, lineas in fuentes:
                cuantas = 0
        try:
                        for coincidencia in buscar_en_lineas(expresion, lineas, origen, opciones.invertir):
                                encontrado = True
                cuantas += 1
                if not opciones.contar:
                                        pintar_coincidencia(coincidencia, opciones, varios, color)
        except BrokenPipeError:
            # Es un OSError, así que hay que dejarlo pasar antes del except de abajo.
                        raise
        except OSError as error:
                        print(f"buscador: {origen}: {error.strerror}", file=sys.stderr)
            hubo_errores = True
            continue
        if opciones.contar:
                        etiqueta = f"{MAGENTA}{origen}{NORMAL}:" if color else f"{origen}:"
            print(f"{etiqueta}{cuantas}" if varios else cuantas)

    if hubo_errores and not encontrado:
                return 2
    return 0 if encontrado else 1


def ejecutar() -> int:
        """Envoltorio que aguanta las tuberías cerradas y el Ctrl+C."""
    try:
                codigo = main()
        sys.stdout.flush()
    except KeyboardInterrupt:
                print("\nbuscador: interrumpido", file=sys.stderr)
        return 130
    except BrokenPipeError:
        # Quien leía se ha ido. Se desvía la salida al vacío para que Python
        # no vuelva a intentar vaciarla al cerrar y se queje.
                os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 141
    return codigo


if __name__ == "__main__":
        sys.exit(ejecutar())
```

```text title="pyproject.toml"
[project]
name = "buscador"
version = "1.0.0"
description = "Un buscador de texto en ficheros, al estilo de grep"
requires-python = ">=3.11"

[project.scripts]
buscar = "buscador.cli:ejecutar"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

Con `pip install -e .` el comando pasa a llamarse `buscar`, que es como se usa en el resto de la lección.

## Una sesión de uso

Trabajamos sobre esta carpeta, que imita un proyecto pequeño:

```text
tienda/
    datos.bin
    registro.log
    docs/
        leeme.md
    src/
        clientes.py
        tienda.py
```

La ayuda:

```bash
buscar --help
```

```salida
usage: buscador [-h] [-i] [-n] [-r] [-c] [-v] [--color {auto,siempre,nunca}]
                patron [ficheros ...]

Busca un patrón en ficheros, o en lo que le llegue por una tubería.

positional arguments:
  patron                expresión regular que hay que buscar
  ficheros              ficheros o carpetas donde buscar (si no pones ninguno,
                        lee de la entrada estándar)

options:
  -h, --help            show this help message and exit
  -i, --ignorar-mayusculas
                        no distinguir mayúsculas de minúsculas
  -n, --numero-de-linea
                        mostrar el número de línea
  -r, --recursivo       bajar por las subcarpetas de las carpetas indicadas
  -c, --contar          mostrar solo cuántas líneas encajan
  -v, --invertir        mostrar las líneas que NO encajan
  --color {auto,siempre,nunca}
                        cuándo colorear las coincidencias (por defecto: auto)

Sin ficheros, lee de la entrada estándar. Devuelve 0 si encuentra algo y 1 si
no.
```

Un fichero suelto, sin nombre delante porque solo hay uno:

```bash
buscar "TODO" tienda/src/tienda.py
```

```salida
    # TODO: aplicar el IVA correspondiente
```

Toda la carpeta, con número de línea:

```bash
buscar -rn "TODO" tienda
```

```salida
buscador: tienda/datos.bin: fichero binario, me lo salto
tienda/docs/leeme.md:11:- TODO: escribir las pruebas del carrito
tienda/src/clientes.py:9:    # TODO: aceptar también los dominios con acentos
tienda/src/tienda.py:14:    # TODO: aplicar el IVA correspondiente
```

El aviso del binario sale por `stderr` y las coincidencias por `stdout`, así que `buscar -rn "TODO" tienda 2> /dev/null` deja solo los resultados.

Contando en vez de listando:

```bash
buscar -rc "TODO" tienda 2> /dev/null
```

```salida
tienda/docs/leeme.md:1
tienda/registro.log:0
tienda/src/clientes.py:1
tienda/src/tienda.py:1
```

Sin distinguir mayúsculas:

```bash
buscar -in "todo" tienda/docs/leeme.md
```

```salida
11:- TODO: escribir las pruebas del carrito
```

Al revés, las líneas que no llevan `INFO`:

```bash
buscar -vn "INFO" tienda/registro.log
```

```salida
3:2026-09-18 10:03:41 WARNING stock negativo en el producto 44
4:2026-09-18 10:04:02 ERROR  no se ha podido conectar con la pasarela de pago
6:2026-09-18 10:04:19 ERROR  no se ha podido conectar con la pasarela de pago
```

Y con una expresión regular de verdad, para quedarse solo con los errores de una hora concreta:

```bash
buscar -n "\d{2}:\d{2}:\d{2} ERROR" tienda/registro.log
```

```salida
4:2026-09-18 10:04:02 ERROR  no se ha podido conectar con la pasarela de pago
6:2026-09-18 10:04:19 ERROR  no se ha podido conectar con la pasarela de pago
```

Los errores, cada uno con su código:

```bash
buscar "TODO" tienda
echo $?
```

```salida
buscador: tienda: es una carpeta (usa -r)
2
```

```bash
buscar "(abierto" tienda/registro.log
echo $?
```

```salida
buscador: patrón no válido: missing ), unterminated subpattern at position 0
2
```

```bash
buscar -r "Bizum" tienda 2> /dev/null
echo $?
```

```salida
1
```

## Encadenado con el resto de la terminal

Aquí es donde el módulo entero cobra sentido. El buscador no es un programa que se usa solo: es una pieza que se conecta con las demás.

Contar las líneas de código que definen algo:

```bash
buscar -r "^def |^class " tienda/src -n
```

```salida
tienda/src/clientes.py:8:def validar_correo(texto):
tienda/src/clientes.py:13:def normalizar(nombre):
tienda/src/tienda.py:7:class Producto:
tienda/src/tienda.py:13:def total_del_carrito(productos):
tienda/src/tienda.py:18:def buscar_producto(catalogo, nombre):
```

Cuántos avisos hay de cada nivel en el registro, pasando el resultado por `cut`, `sort` y `uniq`:

```bash
buscar "INFO|ERROR|WARNING" tienda/registro.log | cut -d' ' -f3 | sort | uniq -c | sort -rn
```

```salida
   5 INFO
   2 ERROR
   1 WARNING
```

Filtrando la salida de otro programa, sin ficheros de por medio:

```bash
ls tienda | buscar "\.log$"
```

```salida
registro.log
```

Y encadenando el buscador consigo mismo, que es la prueba definitiva de que se comporta:

```bash
buscar -rn "def " tienda 2> /dev/null | buscar "producto"
```

```salida
tienda/src/tienda.py:13:def total_del_carrito(productos):
tienda/src/tienda.py:18:def buscar_producto(catalogo, nombre):
```

El primer buscador escribe en la tubería, detecta que su salida no es una terminal y apaga el color. El segundo lee esas líneas por `sys.stdin` y las filtra otra vez. Ninguno de los dos sabe que el otro existe, y eso es exactamente lo que se pretendía.

## Lo que se ha usado

| Del curso | Dónde |
| --- | --- |
| `re`: `compile`, `finditer`, `span`, `IGNORECASE` | `busqueda.py` |
| Generadores con `yield` y `yield from` | `buscar_en_lineas` y `leer_lineas` |
| Dataclasses | `Coincidencia` |
| `pathlib`, `rglob`, lectura en binario | `es_binario` y `expandir` |
| Excepciones y jerarquía de `OSError` | El tratamiento de la tubería rota |
| `argparse` con `nargs`, banderas y `choices` | `cli.py` |
| `sys.stdin`, `sys.stdout.isatty()`, `sys.stderr` | La entrada estándar y el color |
| Códigos ANSI y rebanado de cadenas | `resaltar` |
| Códigos de salida como convención | `main` y `ejecutar` |
| `os.environ` y `os.dup2` | `NO_COLOR` y el `BrokenPipeError` |

> [!error] re.error: missing ), unterminated subpattern at position 0
>
> Has abierto un paréntesis y no lo has cerrado, casi siempre porque buscabas un paréntesis literal. En una expresión regular los paréntesis agrupan, así que para buscar uno de verdad hay que escaparlo: `\(`.
>
> Los otros dos mensajes de esta familia son `nothing to repeat at position 0`, que sale al empezar un patrón con `*` o `+` sin nada delante que repetir, y `bad character range`, cuando dentro de unos corchetes el rango va al revés, como `[z-a]`.

> [!aviso] Las expresiones regulares no sirven para todo
>
> Hay una regla que conviene aprenderse pronto: las expresiones regulares valen para texto plano con estructura simple, y no valen para lenguajes anidados. No intentes analizar HTML, JSON ni código fuente con ellas. Funcionará con tus tres ejemplos y fallará con el cuarto, porque esos formatos permiten anidamiento infinito y una expresión regular no sabe contar paréntesis abiertos.
>
> Para HTML hay analizadores, para JSON está `json`, y para el código de Python está `ast`. Para un registro de texto o un CSV mal formado, `re` es perfecto.

> [!resumen] En resumen
>
> El buscador es un clon reducido de `grep`, y sale de dos módulos: `busqueda.py`, que compila el patrón con `re.compile`, recorre las líneas con un generador y devuelve objetos `Coincidencia` con las posiciones de lo encontrado; y `cli.py`, que decide cómo se ve eso. Guardar las posiciones en vez del texto ya pintado es lo que permite que `--color nunca` y `--color siempre` compartan todo el código. Las expresiones regulares se escriben siempre en cadenas en bruto, `r"..."`, y se compilan una vez cuando se van a aplicar a muchas líneas. La herramienta lee de `sys.stdin` cuando no le dan ficheros, lo que la convierte en una pieza encadenable; apaga el color sola cuando la salida no va a una terminal; se salta los binarios buscando un byte cero en el primer kilobyte; y devuelve 0 si encontró algo, 1 si no y 2 si hubo un problema, que es la convención que permite usarla dentro de un `if`. Y como toda herramienta que escribe mucho, atrapa `BrokenPipeError` para morirse en silencio cuando `head` cierra la tubería, con cuidado de dejarlo pasar antes del `except OSError` del que hereda.

> [!ejercicio] Ampliaciones
>
> El buscador funciona, pero a `grep` le quedan cuarenta opciones más. En orden de dificultad:
>
> 1. **Contexto alrededor.** Añade `-A n` y `-B n` para mostrar n líneas después y antes de cada coincidencia, y `-C n` para las dos cosas. La estructura que lo resuelve limpiamente es `collections.deque` con `maxlen`, que guarda las últimas n líneas sin que tengas que recortar nada.
> 2. **Solo los nombres.** Añade `-l`, que en vez de las líneas enseñe solo los ficheros que tienen alguna coincidencia, y `-L`, que enseñe los que no tienen ninguna. Lo interesante es que con `-l` puedes parar de leer el fichero en cuanto encuentres la primera, y eso en un fichero de un giga se nota.
> 3. **Filtrar por nombre de fichero.** Añade `--incluir "*.py"` y `--excluir "*.min.js"` para acotar qué se mira al bajar por una carpeta. El módulo `fnmatch` compara un nombre con un patrón de los de la terminal, que no son expresiones regulares.
> 4. **Texto literal.** Añade `-F`, que trate el patrón como texto tal cual en vez de como expresión regular. Tienes la pieza en la lección: `re.escape`. Aprovecha para añadir `-w`, que exija que la coincidencia sea una palabra entera, rodeando el patrón con `\b`.
> 5. **Sustituir.** Añade un modo `--reemplazar TEXTO` que escriba las líneas con las coincidencias cambiadas, usando `expresion.sub()`, y una opción `--en-el-sitio` que reescriba el fichero. Esta última es destructiva, así que aplica lo aprendido en el primer proyecto: fase de plan, opción de simulación, y escritura en un temporal que se renombra encima.
> 6. **Paralelo.** Cuando hay que mirar miles de ficheros, casi todo el tiempo se va en esperar al disco. Reparte el trabajo con `concurrent.futures.ThreadPoolExecutor`, un fichero por tarea. El reto no es lanzarlas, es que la salida siga saliendo ordenada por fichero y que el código de salida siga siendo correcto.
