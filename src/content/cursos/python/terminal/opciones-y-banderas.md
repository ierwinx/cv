---
titulo: "Opciones y banderas"
resumen: "Argumentos con guion que se pueden omitir: nombres cortos y largos, valores por defecto, interruptores, contadores y listas."
minutos: 23
orden: 10
---

Los argumentos posicionales de la lección anterior son obligatorios y van en un orden fijo. Eso está bien para lo esencial de un programa, el fichero que hay que procesar o la cantidad que hay que convertir, pero no para todo lo demás: si quieres elegir el formato, cambiar la carpeta de destino o pedir que hable más, no puedes obligar a escribirlo todo siempre y en el mismo orden.

Para eso están las **opciones**, los argumentos que empiezan por guion. Se reconocen por su nombre y no por su sitio, se pueden poner en cualquier posición de la línea y, salvo que digas lo contrario, se pueden omitir. Es la diferencia entre `cp origen destino`, donde el orden lo es todo, y `cp -r --verbose origen destino`, donde `-r` y `--verbose` van donde quieras.

> [!objetivo] Qué vas a aprender
>
> Declarar opciones con nombre corto y largo, saber cómo se llama el atributo que generan y cambiarlo con `dest`, dar valores por defecto, y usar las acciones `store_true`, `store_false`, `count`, `append` y `BooleanOptionalAction` para construir interruptores, contadores y listas.

## Posicional u opción: lo decide el guion

La regla es literalmente esa. Si el nombre que le pasas a `add_argument` empieza por guion, es una opción; si no, es un posicional.

```python title="exportar.py"
"""Exporta un fichero a otro formato."""

import argparse

analizador = argparse.ArgumentParser(description="Exporta un fichero a otro formato.")
analizador.add_argument("entrada", help="fichero que hay que exportar")
analizador.add_argument("-s", "--salida", help="fichero donde escribir el resultado")
argumentos = analizador.parse_args()

print(f"entrada = {argumentos.entrada!r}")
print(f"salida  = {argumentos.salida!r}")
```

La ayuda ya distingue los dos apartados:

```bash
python3 exportar.py -h
```

```salida
usage: exportar.py [-h] [-s SALIDA] entrada

Exporta un fichero a otro formato.

positional arguments:
  entrada              fichero que hay que exportar

options:
  -h, --help           show this help message and exit
  -s, --salida SALIDA  fichero donde escribir el resultado
```

Fíjate en la línea `usage:`: `[-s SALIDA]` entre corchetes, `entrada` sin ellos. Los corchetes son la forma universal de decir "esto se puede omitir".

Y si se omite, el atributo existe igualmente y vale `None`:

```bash
python3 exportar.py datos.csv
```

```salida
entrada = 'datos.csv'
salida  = None
```

> [!nota] Por qué `!r` en la f-string
>
> El `!r` pide la representación de depuración del valor, la que saldría con `repr()`. Sirve para distinguir de un vistazo `None` de la cadena `'None'`, y `''` de un valor que no está. Cuando estés depurando qué ha entendido `argparse`, úsalo siempre.

## Nombre corto y nombre largo

A `add_argument` le puedes dar varias formas de la misma opción. La costumbre es dos:

- **La corta**, un solo guion y una sola letra: `-s`. Para escribir rápido a diario.
- **La larga**, dos guiones y una palabra: `--salida`. Para que se entienda al leerla en un script seis meses después.

Las cuatro invocaciones siguientes son idénticas para `argparse`:

```bash
python3 exportar.py datos.csv --salida informe.json
python3 exportar.py datos.csv -s informe.json
python3 exportar.py --salida informe.json datos.csv
python3 exportar.py datos.csv --salida=informe.json
```

```salida
entrada = 'datos.csv'
salida  = 'informe.json'
entrada = 'datos.csv'
salida  = 'informe.json'
entrada = 'datos.csv'
salida  = 'informe.json'
entrada = 'datos.csv'
salida  = 'informe.json'
```

El valor puede ir separado por un espacio o pegado con un `=` en la forma larga. Con la forma corta también se puede pegar directamente, `-sinforme.json`, aunque eso se lee fatal y no conviene usarlo.

Lo que no puede faltar es el valor: una opción declarada así **exige** uno detrás.

```bash
python3 exportar.py -s
```

```salida
usage: exportar.py [-h] [-s SALIDA] entrada
exportar.py: error: argument -s/--salida: expected one argument
```

> [!aviso] Las opciones largas se pueden abreviar sin que lo pidas
>
> De serie, `argparse` acepta cualquier prefijo no ambiguo de una opción larga: si solo tienes `--salida`, tanto `--sal` como `--s` funcionarán. Es cómodo al teclear y es una trampa en los scripts, porque el día que añadas `--saltar` la abreviatura `--sal` pasará a ser ambigua y los scripts que ya la usaban dejarán de funcionar. Para desactivarlo, `argparse.ArgumentParser(allow_abbrev=False)`.

## Cómo se llama el atributo

`argparse` deduce el nombre del atributo de la **forma larga**, o de la corta si no hay larga, quitando los guiones del principio. Y hay una conversión que sorprende la primera vez: los guiones interiores se cambian por guiones bajos, porque un guion no puede formar parte de un nombre de variable en Python.

```python title="nombres.py"
import argparse

analizador = argparse.ArgumentParser(description="Cómo se nombran los atributos.")
analizador.add_argument("--nombre-fichero", help="con guion en medio")
analizador.add_argument("-n", "--numero-de-lineas", help="corta y larga")
analizador.add_argument("--dir", dest="directorio", help="nombre del atributo cambiado")
argumentos = analizador.parse_args()

print(vars(argumentos))
print(argumentos.nombre_fichero)
print(argumentos.numero_de_lineas)
print(argumentos.directorio)
```

```bash
python3 nombres.py --nombre-fichero informe.md -n 20 --dir /tmp
```

```salida
{'nombre_fichero': 'informe.md', 'numero_de_lineas': '20', 'directorio': '/tmp'}
informe.md
20
/tmp
```

En la línea de comandos se escribe `--nombre-fichero`, con guion, porque es lo que espera quien usa herramientas de terminal. En el código se lee `argumentos.nombre_fichero`, con guion bajo, porque es lo que exige Python. La traducción la hace `argparse` y no tienes que pensar en ella, solo recordarla.

El tercer argumento enseña el parámetro **`dest`**, que rompe esa deducción y fija el nombre del atributo a mano. Se usa en dos situaciones:

- Cuando la opción es corta o abreviada, como `--dir`, y quieres un nombre legible dentro del código.
- Cuando el nombre deducido chocaría con una palabra reservada de Python. `--class` daría `argumentos.class`, que es sintaxis inválida; con `dest="clase"` se arregla.

## Valores por defecto

Un `None` es incómodo: obliga a comprobarlo antes de usar el valor. Casi siempre es mejor dar un valor sensato con **`default`**:

```python
analizador.add_argument("-p", "--patron", default="*",
                        help="patrón de nombre que deben cumplir los ficheros")
```

Con eso, `argumentos.patron` vale `"*"` cuando nadie escribe la opción, y el resto del programa no tiene que preguntarse nada. La regla práctica: usa `default` siempre que exista un comportamiento razonable por omisión, y deja `None` solo cuando "no lo han dicho" sea una situación de verdad distinta de cualquier valor posible.

## Banderas: opciones sin valor

Una **bandera** es una opción que no lleva valor detrás. Está o no está, y eso es todo. Se declaran con `action`:

```python title="respaldo.py"
import argparse

analizador = argparse.ArgumentParser(description="Sincroniza una carpeta.")
analizador.add_argument("--forzar", action="store_true", help="sobrescribir sin preguntar")
analizador.add_argument("--sin-copia", action="store_false", dest="copia",
                        help="no crear copia de seguridad antes de escribir")
argumentos = analizador.parse_args()

print(f"forzar = {argumentos.forzar}")
print(f"copia  = {argumentos.copia}")
```

```bash
python3 respaldo.py
```

```salida
forzar = False
copia  = True
```

```bash
python3 respaldo.py --forzar --sin-copia
```

```salida
forzar = True
copia  = False
```

Las dos acciones son simétricas:

- **`store_true`**: el valor por defecto es `False` y escribir la opción lo pone a `True`. Es el caso normal, para activar algo que de serie está apagado.
- **`store_false`**: el valor por defecto es `True` y escribir la opción lo pone a `False`. Sirve para apagar algo que de serie está encendido.

Con `store_false` casi siempre querrás un `dest`. Sin él, la opción `--sin-copia` produciría el atributo `argumentos.sin_copia`, y tendrías que escribir `if not argumentos.sin_copia:`, una doble negación que se lee mal. Con `dest="copia"` el código queda `if argumentos.copia:`, que dice lo que hace.

> [!aviso] Una bandera nunca lleva valor
>
> Es un error clásico intentar escribir `--forzar true` o `--verboso=no`. Para una bandera, cualquier cosa que venga detrás es otro argumento distinto:
>
> ```bash
> python3 respaldo.py --forzar true
> ```
>
> ```salida
> usage: respaldo.py [-h] [--forzar] [--sin-copia]
> respaldo.py: error: unrecognized arguments: true
> ```
>
> Si de verdad necesitas poder decir sí y no explícitamente, no uses `store_true`: usa `BooleanOptionalAction`, unas líneas más abajo.

## Contar repeticiones con `action="count"`

Casi todas las herramientas de terminal usan `-v` para hablar más y `-vvv` para hablar mucho más. Eso se consigue con `count`, que suma uno por cada vez que aparece la opción:

```python title="detalle.py"
import argparse

NIVELES = ["solo errores", "normal", "detallado", "depuración"]

analizador = argparse.ArgumentParser(description="Niveles de detalle con -v.")
analizador.add_argument("-v", "--verboso", action="count", default=0,
                        help="sube el nivel de detalle, se puede repetir")
argumentos = analizador.parse_args()

nivel = min(argumentos.verboso, len(NIVELES) - 1)
print(f"verboso={argumentos.verboso}, salida {NIVELES[nivel]}")
```

```bash
python3 detalle.py
python3 detalle.py -v
python3 detalle.py -vv
python3 detalle.py -vvv
python3 detalle.py -vvvvv
```

```salida
verboso=0, salida solo errores
verboso=1, salida normal
verboso=2, salida detallado
verboso=3, salida depuración
verboso=5, salida depuración
```

Dos detalles que importan:

- **`default=0` no es opcional en la práctica.** Sin él, el valor por defecto es `None`, y `None >= 1` lanza un `TypeError`. Con `count` pon siempre `default=0`.
- **El `min` que recorta el nivel.** Nada impide escribir `-vvvvvvv`, así que el programa tiene que aguantarlo sin salirse del índice de la lista. Es un descuido muy fácil de cometer.

Fíjate también en que `-vvv` es un solo argumento en la terminal. Las opciones cortas de una letra se pueden apelotonar, y `argparse` las desmonta: `-vvv` equivale a `-v -v -v`, y `-rv` equivale a `-r -v`.

## Acumular valores con `action="append"`

Cuando una opción tiene sentido varias veces, `append` guarda todas las apariciones en una lista en vez de quedarse con la última:

```python title="filtrar.py"
import argparse

analizador = argparse.ArgumentParser(description="Acumula exclusiones.")
analizador.add_argument("-e", "--excluir", action="append", default=[],
                        help="texto que descarta un fichero, se puede repetir")
argumentos = analizador.parse_args()

print(argumentos.excluir)
```

```bash
python3 filtrar.py -e "*.tmp" -e "*.log"
```

```salida
['*.tmp', '*.log']
```

Sin `append`, la segunda aparición pisaría a la primera y solo quedaría `'*.log'`. Y si no se escribe ninguna vez, el atributo es la lista vacía, que se puede recorrer sin comprobar nada:

```bash
python3 filtrar.py
```

```salida
[]
```

> [!aviso] El `default` de `append` se conserva, no se sustituye
>
> Es la trampa de esta acción. Uno espera que escribir la opción reemplace el valor por defecto, y lo que hace es añadirse a él:
>
> ```python title="trampa.py"
> import argparse
>
> analizador = argparse.ArgumentParser()
> analizador.add_argument("-e", "--excluir", action="append", default=["*.tmp"])
> argumentos = analizador.parse_args()
>
> print(argumentos.excluir)
> ```
>
> ```bash
> python3 trampa.py -e "*.log"
> ```
>
> ```salida
> ['*.tmp', '*.log']
> ```
>
> La exclusión por defecto sigue ahí aunque quien usa el programa creyera estar cambiándola. Por eso, con `append`, el `default` debe ser casi siempre la lista vacía: si necesitas un valor por defecto de verdad, déjalo en `None` y decide tú en el código qué poner cuando no hay nada.

## Las dos caras de una bandera con `BooleanOptionalAction`

`store_true` sirve para encender algo apagado, y `store_false` para apagar algo encendido, pero ninguna de las dos permite las dos cosas a la vez. Cuando el valor por defecto depende de la situación y quien usa el programa necesita poder forzarlo en cualquier dirección, la solución es `argparse.BooleanOptionalAction`, que **crea las dos opciones de golpe**:

```python title="color.py"
import argparse

analizador = argparse.ArgumentParser(description="Bandera de dos caras.")
analizador.add_argument("--color", action=argparse.BooleanOptionalAction, default=True,
                        help="colorear la salida")
argumentos = analizador.parse_args()

print(argumentos.color)
```

```bash
python3 color.py -h
```

```salida
usage: color.py [-h] [--color | --no-color]

Bandera de dos caras.

options:
  -h, --help           show this help message and exit
  --color, --no-color  colorear la salida
```

La ayuda las presenta como alternativas con la barra vertical, y funcionan las tres invocaciones:

```bash
python3 color.py
python3 color.py --color
python3 color.py --no-color
```

```salida
True
True
False
```

Es exactamente el caso del color en la terminal que viste en la lección de colores y estilos: lo razonable es colorear cuando se está mirando la pantalla y no colorear cuando la salida va a un fichero, así que el programa lo decide solo. Pero quien lo use tiene que poder imponer su criterio en las dos direcciones, y para eso hacen falta las dos opciones.

Ten en cuenta que `BooleanOptionalAction` se pasa como **objeto, sin comillas**, al contrario que `"store_true"` y las demás, que son cadenas. Es un despiste habitual.

## Opciones obligatorias con `required=True`

Se puede obligar a escribir una opción:

```python title="obligatoria.py"
import argparse

analizador = argparse.ArgumentParser(description="Una opción obligatoria.")
analizador.add_argument("--destino", required=True, help="carpeta donde dejar el resultado")
argumentos = analizador.parse_args()

print(argumentos.destino)
```

```bash
python3 obligatoria.py
```

```salida
usage: obligatoria.py [-h] --destino DESTINO
obligatoria.py: error: the following arguments are required: --destino
```

Fíjate en que en la línea `usage:` el `--destino DESTINO` sale **sin corchetes**, porque ya no es opcional.

> [!consejo] Piénsatelo dos veces antes de usar `required=True`
>
> Una opción obligatoria es una contradicción: el guion le está diciendo a quien lee la línea "esto se puede omitir" y el programa le dice que no. Quien conoce la convención se confía y se lleva un error.
>
> Antes de recurrir a ella, plantéate las dos alternativas, que casi siempre son mejores:
>
> - **Convertirlo en posicional.** Si el dato es imprescindible, es que es parte de la esencia del programa y merece ir sin guion. `programa --destino carpeta` se escribe mejor como `programa carpeta`.
> - **Darle un `default` razonable.** La carpeta actual, el fichero de configuración habitual, el formato más común. Un valor por defecto sensato evita la obligación.
>
> Queda un caso legítimo: cuando hay varios datos imprescindibles del mismo tipo y ponerlos como posicionales sería un baile de orden imposible de recordar, como en `programa --origen X --destino Y --clave Z`. Ahí `required=True` es lo correcto, porque el nombre desambigua lo que la posición no puede.

## Todas las acciones de un vistazo

| `action` | Qué hace | Valor por defecto recomendado |
| --- | --- | --- |
| `"store"` | Guarda el valor. Es lo que ocurre si no pones `action` | `None` o el que tenga sentido |
| `"store_true"` | `True` si aparece, `False` si no | Lo pone solo |
| `"store_false"` | `False` si aparece, `True` si no | Lo pone solo |
| `"count"` | Cuenta las veces que aparece | `0`, siempre |
| `"append"` | Acumula cada aparición en una lista | `[]` |
| `"store_const"` | Guarda el valor fijo de `const` si aparece | El que tenga sentido |
| `"append_const"` | Añade el valor fijo de `const` a una lista | `[]` |
| `argparse.BooleanOptionalAction` | Crea `--x` y `--no-x` | `True` o `False`, explícito |
| `"version"` | Imprime la versión y termina | No aplica |
| `"help"` | Imprime la ayuda y termina. Es lo que hace `-h` | No aplica |

## Un programa con todo junto

Este listador de ficheros usa un posicional y cinco opciones de tipos distintos:

```python title="listar.py"
"""Lista los ficheros de una carpeta con unas cuantas opciones."""

import argparse
from pathlib import Path


def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(description="Lista los ficheros de una carpeta.")
    analizador.add_argument("carpeta", help="carpeta que hay que listar")
    analizador.add_argument("-p", "--patron", default="*",
                            help="patrón de nombre que deben cumplir los ficheros")
    analizador.add_argument("-e", "--excluir", action="append", default=[],
                            help="texto que descarta un fichero, se puede repetir")
    analizador.add_argument("-r", "--recursivo", action="store_true",
                            help="entrar también en las subcarpetas")
    analizador.add_argument("--ocultos", action=argparse.BooleanOptionalAction, default=False,
                            help="incluir los ficheros que empiezan por punto")
    analizador.add_argument("-v", "--verboso", action="count", default=0,
                            help="explica lo que hace, repetible para más detalle")
    return analizador


def main() -> None:
        argumentos = construir_analizador().parse_args()
    carpeta = Path(argumentos.carpeta)

    if argumentos.verboso >= 1:
                print(f"Buscando '{argumentos.patron}' en {carpeta}")
    if argumentos.verboso >= 2:
                print(f"  recursivo={argumentos.recursivo} ocultos={argumentos.ocultos}")
        print(f"  exclusiones={argumentos.excluir}")

    patron = f"**/{argumentos.patron}" if argumentos.recursivo else argumentos.patron
    encontrados = 0

    for ruta in sorted(carpeta.glob(patron)):
                if not ruta.is_file():
                        continue
        if not argumentos.ocultos and ruta.name.startswith("."):
                        continue
        if any(texto in ruta.name for texto in argumentos.excluir):
                        if argumentos.verboso >= 2:
                                print(f"  descartado {ruta.name}")
            continue
        print(ruta)
        encontrados += 1

    if argumentos.verboso >= 1:
                print(f"Total: {encontrados} ficheros")


if __name__ == "__main__":
        main()
```

La ayuda que produce, sin escribir ni una línea de texto de uso:

```bash
python3 listar.py -h
```

```salida
usage: listar.py [-h] [-p PATRON] [-e EXCLUIR] [-r] [--ocultos | --no-ocultos]
                 [-v]
                 carpeta

Lista los ficheros de una carpeta.

positional arguments:
  carpeta               carpeta que hay que listar

options:
  -h, --help            show this help message and exit
  -p, --patron PATRON   patrón de nombre que deben cumplir los ficheros
  -e, --excluir EXCLUIR
                        texto que descarta un fichero, se puede repetir
  -r, --recursivo       entrar también en las subcarpetas
  --ocultos, --no-ocultos
                        incluir los ficheros que empiezan por punto
  -v, --verboso         explica lo que hace, repetible para más detalle
```

Sobre una carpeta `proyecto/` que contiene `notas.md`, `informe.md`, `datos.csv`, `borrador.tmp.md`, un `.oculto.md` y una subcarpeta `informes/` con `anual.md`:

```bash
python3 listar.py proyecto
```

```salida
proyecto/borrador.tmp.md
proyecto/datos.csv
proyecto/informe.md
proyecto/notas.md
```

```bash
python3 listar.py proyecto -p "*.md" --ocultos -e tmp
```

```salida
proyecto/.oculto.md
proyecto/informe.md
proyecto/notas.md
```

```bash
python3 listar.py proyecto -p "*.md" -r -v
```

```salida
Buscando '*.md' en proyecto
proyecto/borrador.tmp.md
proyecto/informe.md
proyecto/informes/anual.md
proyecto/notas.md
Total: 4 ficheros
```

```bash
python3 listar.py proyecto -p "*.md" -e tmp -vv
```

```salida
Buscando '*.md' en proyecto
  recursivo=False ocultos=False
  exclusiones=['tmp']
  descartado borrador.tmp.md
proyecto/informe.md
proyecto/notas.md
Total: 2 ficheros
```

> [!consejo] Saca el analizador a su propia función
>
> Fíjate en `construir_analizador()`. Es una costumbre que compensa en cuanto el programa pasa de tres opciones: `main` se queda con la lógica y la declaración de la interfaz vive aparte, donde se lee de un tirón. Además hace el analizador reutilizable, cosa que agradecerás al escribir pruebas, porque `parse_args()` acepta una lista de argumentos como parámetro y puedes llamarlo con `analizador.parse_args(["proyecto", "-vv"])` sin tocar la terminal.

> [!resumen] En resumen
>
> Las opciones son los argumentos que empiezan por guion, y a diferencia de los posicionales se reconocen por su nombre, van en cualquier posición y normalmente se pueden omitir. Se declaran con una forma corta y una larga, `-s` y `--salida`, y el atributo que producen toma el nombre de la forma larga cambiando los guiones interiores por guiones bajos, o el que le fijes con `dest`. Con `default` evitas el `None` y le das al programa un comportamiento razonable cuando no dicen nada. El parámetro `action` decide qué hacer con la opción: `store_true` y `store_false` construyen interruptores sin valor, `count` cuenta repeticiones para el clásico `-vvv` y necesita siempre `default=0`, `append` acumula en una lista pero conserva el `default` en lugar de sustituirlo, y `BooleanOptionalAction` crea `--color` y `--no-color` a la vez para cuando hace falta poder forzar las dos direcciones. `required=True` obliga a escribir una opción, pero contradice lo que el guion promete: antes de usarla, plantéate si el dato no debería ser un posicional o tener un valor por defecto.

> [!ejercicio] Practica
>
> Crea los ficheros indicados y resuelve:
>
> 1. En `exportar.py`, parte de un posicional `entrada` y añade `-s/--salida` con `default="salida.json"` y `-f/--formato` con `default="json"`. Imprime la configuración resultante y pruébala con las cuatro formas de escribir una opción: separada, pegada con `=`, corta y colocada antes del posicional.
> 2. En `respaldo.py`, declara `--forzar` con `store_true` y `--sin-comprimir` con `store_false` y un `dest` que te permita escribir `if argumentos.comprimir:`. Comprueba que los valores por defecto son los contrarios.
> 3. En `detalle.py`, monta el contador de verbosidad con tres niveles y prueba a quitarle el `default=0`. Lee el `TypeError` que sale y entiende por qué.
> 4. En `filtrar.py`, añade `-e/--excluir` con `action="append"` y `default=["*.tmp"]`. Ejecútalo con dos exclusiones propias y observa que la de por defecto sigue en la lista. Arréglalo dejando el `default` en `[]`.
> 5. En `avisos.py`, declara `--sonido` con `BooleanOptionalAction` y `default=True`, y comprueba las tres invocaciones posibles. Después intenta conseguir lo mismo con dos `add_argument` separados y compara el trabajo.
> 6. Coge `listar.py` de la lección y añádele una opción `--orden` que acepte `nombre` o `tamano` y ordene la salida en consecuencia, y una `-n/--maximo` que limite cuántos ficheros se imprimen. Deja el valor por defecto de `--maximo` en `None` y decide en el código qué significa eso.
