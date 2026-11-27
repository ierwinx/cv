---
titulo: "Subcomandos"
resumen: "Cómo agrupar varias órdenes distintas bajo un mismo programa, al estilo de git commit o pip install, con add_subparsers."
minutos: 22
orden: 12
---

`git` no es un programa, son cincuenta: `git commit`, `git log`, `git push`, `git rebase`. Cada uno hace algo distinto y tiene sus propias opciones, pero todos se escriben detrás de la misma palabra y comparten la configuración. Lo mismo pasa con `pip install` y `pip list`, o con `docker run` y `docker ps`.

Ese patrón se llama **subcomandos**, y es la forma habitual de organizar una herramienta que hace más de una cosa. La alternativa, un programa suelto por cada operación, obliga a recordar cuatro nombres distintos y a repetir el mismo código de configuración en los cuatro. `argparse` lo resuelve con `add_subparsers`, que permite tener **un analizador dentro de otro**.

> [!objetivo] Qué vas a aprender
>
> Declarar subcomandos con `add_subparsers`, dar a cada uno sus propios argumentos y su propia ayuda, despacharlos con `set_defaults(func=...)`, compartir opciones entre todos con un parser padre y `parents=[...]`, y montar con todo ello una herramienta de notas completa.

## Un analizador dentro de otro

Se pide a `add_subparsers` un objeto que fabrica analizadores hijos, y a ese objeto se le piden los subcomandos con `add_parser`:

```python title="herramienta.py"
import argparse

analizador = argparse.ArgumentParser(description="Dos subcomandos de juguete.")
subcomandos = analizador.add_subparsers(dest="comando", required=True)

saludar = subcomandos.add_parser("saludar", help="saluda a alguien")
saludar.add_argument("nombre", help="a quién")

sumar = subcomandos.add_parser("sumar", help="suma dos números")
sumar.add_argument("a", type=float)
sumar.add_argument("b", type=float)

argumentos = analizador.parse_args()
print(argumentos)
```

Cada `add_parser` devuelve un `ArgumentParser` normal y corriente, así que le puedes añadir argumentos con todo lo de las lecciones anteriores: posicionales, opciones, `type`, `nargs`, `choices`, grupos excluyentes.

Al ejecutarlo, el `Namespace` trae el subcomando elegido más los argumentos de ese subcomando, y solo de ese:

```bash
python3 herramienta.py saludar Erwin
python3 herramienta.py sumar 2 3
```

```salida
Namespace(comando='saludar', nombre='Erwin')
Namespace(comando='sumar', a=2.0, b=3.0)
```

Los dos parámetros de `add_subparsers` que importan son estos:

- **`dest="comando"`** le da nombre al atributo donde se guardará el subcomando elegido. Sin él, el nombre queda sin definir y no puedes saber qué te han pedido.
- **`required=True`** obliga a escribir uno. Es lo que casi siempre quieres, y no es el valor por defecto por razones históricas.

```bash
python3 herramienta.py
```

```salida
usage: herramienta.py [-h] {saludar,sumar} ...
herramienta.py: error: the following arguments are required: comando
```

## La ayuda tiene dos niveles

Esta es la gran ventaja del patrón. La ayuda general enumera los subcomandos disponibles con su descripción corta:

```bash
python3 herramienta.py -h
```

```salida
usage: herramienta.py [-h] {saludar,sumar} ...

Dos subcomandos de juguete.

positional arguments:
  {saludar,sumar}
    saludar        saluda a alguien
    sumar          suma dos números

options:
  -h, --help       show this help message and exit
```

Ese texto de una línea es el `help` que le pasas a `add_parser`. Y cada subcomando tiene además su propia ayuda completa, que se pide poniendo el `-h` **detrás** del subcomando:

```bash
python3 herramienta.py saludar -h
```

```salida
usage: herramienta.py saludar [-h] nombre

positional arguments:
  nombre      a quién

options:
  -h, --help  show this help message and exit
```

Fíjate en la línea `usage:`: dice `herramienta.py saludar`, no solo `herramienta.py`. `argparse` construye el `prog` de cada hijo encadenando el del padre, así que la ayuda es correcta a cualquier profundidad.

> [!consejo] Pon `help` y `description` en cada subcomando
>
> Son dos textos distintos y hacen falta los dos. El `help` es la línea que sale en la lista del nivel de arriba y tiene que ser cortísima, en minúscula y sin punto. El `description` es el párrafo que encabeza la ayuda propia del subcomando y puede ser más largo. Si solo pones uno, la mitad de la ayuda se queda vacía.

## Despachar: llamar a la función que toca

Sabiendo qué subcomando han pedido, hay que ejecutar el código correspondiente. Hay dos formas, y la segunda es la buena.

### Con un diccionario

La primera que se le ocurre a cualquiera es mirar `argumentos.comando` y elegir:

```python
ACCIONES = {
    "saludar": accion_saludar,
    "sumar": accion_sumar,
}

argumentos = analizador.parse_args()
ACCIONES[argumentos.comando](argumentos)
```

Funciona y se lee bien, pero tiene una pega: el nombre del subcomando está escrito en dos sitios, en el `add_parser` y en el diccionario. El día que renombres `saludar` a `saluda` y te olvides de uno de los dos, el programa fallará con un `KeyError` en tiempo de ejecución, no al arrancar.

### Con `set_defaults(func=...)`

El patrón idiomático mete la función **dentro del propio subparser**. `set_defaults` añade al `Namespace` valores fijos que no vienen de la línea de comandos, y como cada subparser tiene el suyo, solo se aplica el del subcomando elegido:

```python
p_saludar = subcomandos.add_parser("saludar", help="saluda a alguien")
p_saludar.add_argument("nombre", help="a quién")
p_saludar.set_defaults(func=accion_saludar)
```

Y el despacho se convierte en una línea que no menciona ningún nombre de subcomando:

```python
argumentos = analizador.parse_args()
argumentos.func(argumentos)
```

Merece la pena entender por qué esto es mejor:

- **No hay ninguna tabla que mantener.** La declaración del subcomando y la función que lo implementa están pegadas, en las mismas cuatro líneas. Añadir un subcomando es escribir su bloque y nada más; renombrarlo no rompe nada.
- **`func` es una variable normal que guarda una función.** No hay magia: recuerda que en Python una función es un valor que se puede meter en un diccionario, pasar como parámetro o, como aquí, guardar en un atributo. Lo único llamativo es que se guarda sin paréntesis, porque queremos la función, no su resultado.
- **El despacho no crece.** Con cuatro subcomandos o con cuarenta, la línea sigue siendo la misma.

La convención es llamar al atributo `func`, y así lo verás en toda la documentación y en el código ajeno. El nombre no es obligatorio, pero respétalo.

> [!error] AttributeError: 'Namespace' object has no attribute 'func'
>
> Este es **el** error de los subcomandos, y sale de haberse olvidado el `required=True`. Sin él, ejecutar el programa a secas es una invocación perfectamente válida: no se elige ningún subcomando, no se ejecuta ningún `set_defaults`, y el `Namespace` llega sin el atributo que esperabas.
>
> ```python title="olvido.py"
> import argparse
>
>
> def saludar(argumentos):
>         print(f"Hola, {argumentos.nombre}.")
>
>
> analizador = argparse.ArgumentParser()
> subcomandos = analizador.add_subparsers(dest="comando")
>
> p_saludar = subcomandos.add_parser("saludar")
> p_saludar.add_argument("nombre")
> p_saludar.set_defaults(func=saludar)
>
> argumentos = analizador.parse_args()
> argumentos.func(argumentos)
> ```
>
> ```bash
> python3 olvido.py saludar Erwin
> ```
>
> ```salida
> Hola, Erwin.
> ```
>
> ```bash
> python3 olvido.py
> ```
>
> ```salida
> Traceback (most recent call last):
>   File "/Users/erwin/terminal/olvido.py", line 16, in <module>
>     argumentos.func(argumentos)
>     ^^^^^^^^^^^^^^^
> AttributeError: 'Namespace' object has no attribute 'func'
> ```
>
> Lo desconcertante es que con cualquier subcomando el programa funciona bien, así que el fallo solo aparece cuando alguien escribe el nombre del programa y pulsa <kbd>Intro</kbd>. La solución es `add_subparsers(dest="comando", required=True)`.

## Argumentos comunes a todos los subcomandos

Casi siempre hay una opción que tiene sentido en todos: el fichero de datos, el nivel de verbosidad, la configuración. Repetir su `add_argument` en cada subparser es pedir que se desincronicen.

La solución es un **parser padre**: un `ArgumentParser` que no se usa para analizar nada, solo para guardar argumentos que otros heredan.

```python
comunes = argparse.ArgumentParser(add_help=False)
comunes.add_argument("-f", "--fichero", type=Path, default=FICHERO_POR_DEFECTO,
                     help="cuaderno donde están las notas")
```

Y cada subparser lo recibe en `parents`, que es una lista porque puedes heredar de varios:

```python
p_listar = subcomandos.add_parser("listar", parents=[comunes], help="muestra las notas")
```

> [!aviso] El `add_help=False` del parser padre es obligatorio
>
> Sin él, el padre trae su propio `-h`, el hijo trae el suyo, y al heredar chocan los dos. El programa muere con `argparse.ArgumentError: argument -h/--help: conflicting option strings: -h, --help` al construir el analizador, antes de leer nada de la línea de comandos. Un parser hecho solo para heredar de él lleva siempre `add_help=False`.

> [!nota] Dónde se escriben las opciones heredadas
>
> Con `parents`, la opción `-f` pertenece a cada subcomando, así que se escribe **detrás** de él: `notas.py listar -f trabajo.json`. Ponerla antes falla, porque en esa posición `argparse` espera el nombre del subcomando:
>
> ```bash
> python3 notas.py -f trabajo.json listar
> ```
>
> ```salida
> usage: notas.py [-h] COMANDO ...
> notas.py: error: argument COMANDO: invalid choice: 'trabajo.json' (choose from 'añadir', 'listar', 'buscar', 'borrar')
> ```
>
> La alternativa es declarar la opción en el analizador principal, y entonces va delante: `notas.py -f trabajo.json listar`. Las dos formas son legítimas y hay herramientas de verdad que usan cada una; `git --no-pager log` es del segundo tipo y `pip install --quiet` del primero. Elige una y sé coherente, porque mezclarlas confunde a todo el mundo, empezando por ti.

## Un cuaderno de notas completo

Con todo lo anterior, una herramienta de verdad. Cuatro subcomandos, una opción común, persistencia en JSON y un código de salida por cada resultado:

```python title="notas.py"
"""Un cuaderno de notas manejado por subcomandos."""

import argparse
import json
from datetime import date
from pathlib import Path

FICHERO_POR_DEFECTO = Path("notas.json")


def cargar(ruta: Path) -> list[dict]:
        """Devuelve las notas guardadas, o una lista vacía si no hay fichero."""
    if not ruta.exists():
                return []
    return json.loads(ruta.read_text(encoding="utf-8"))


def guardar(ruta: Path, notas: list[dict]) -> None:
        """Escribe las notas en el fichero, con acentos legibles."""
    ruta.write_text(json.dumps(notas, indent=2, ensure_ascii=False), encoding="utf-8")


def anadir(argumentos: argparse.Namespace) -> int:
        notas = cargar(argumentos.fichero)
    nota = {
        "id": max((nota["id"] for nota in notas), default=0) + 1,
        "texto": " ".join(argumentos.texto),
        "etiquetas": argumentos.etiqueta,
        "fecha": date.today().isoformat(),
    }
    notas.append(nota)
    guardar(argumentos.fichero, notas)
    print(f"Añadida la nota {nota['id']}.")
    return 0


def listar(argumentos: argparse.Namespace) -> int:
        notas = cargar(argumentos.fichero)
    if argumentos.etiqueta:
                notas = [nota for nota in notas if argumentos.etiqueta in nota["etiquetas"]]
    if not notas:
                print("No hay notas que mostrar.")
        return 0
    for nota in notas[: argumentos.maximo]:
                etiquetas = " ".join(f"#{etiqueta}" for etiqueta in nota["etiquetas"])
        print(f"{nota['id']:>3}  {nota['fecha']}  {nota['texto']}  {etiquetas}".rstrip())
    return 0


def buscar(argumentos: argparse.Namespace) -> int:
        notas = cargar(argumentos.fichero)
    texto = argumentos.texto if argumentos.sensible else argumentos.texto.lower()
    encontradas = [
        nota for nota in notas
        if texto in (nota["texto"] if argumentos.sensible else nota["texto"].lower())
    ]
    if not encontradas:
                print(f"Ninguna nota contiene '{argumentos.texto}'.")
        return 1
    for nota in encontradas:
                print(f"{nota['id']:>3}  {nota['fecha']}  {nota['texto']}")
    return 0


def borrar(argumentos: argparse.Namespace) -> int:
        notas = cargar(argumentos.fichero)
    quedan = [nota for nota in notas if nota["id"] not in argumentos.identificadores]
    borradas = len(notas) - len(quedan)
    if borradas == 0:
                print("No he encontrado ninguna de esas notas.")
        return 1
    cuenta = f"{borradas} nota" if borradas == 1 else f"{borradas} notas"
    if not argumentos.si:
                respuesta = input(f"¿Borrar {cuenta}? [s/N] ").strip().lower()
        if respuesta != "s":
                        print("No se ha borrado nada.")
            return 0
    guardar(argumentos.fichero, quedan)
    print(f"Borrada {cuenta}." if borradas == 1 else f"Borradas {cuenta}.")
    return 0


def construir_analizador() -> argparse.ArgumentParser:
        comunes = argparse.ArgumentParser(add_help=False)
    comunes.add_argument("-f", "--fichero", type=Path, default=FICHERO_POR_DEFECTO,
                         help="cuaderno donde están las notas")

    analizador = argparse.ArgumentParser(description="Cuaderno de notas de terminal.")
    subcomandos = analizador.add_subparsers(dest="comando", required=True,
                                            metavar="COMANDO")

    p_anadir = subcomandos.add_parser("añadir", parents=[comunes],
                                      help="guarda una nota nueva",
                                      description="Guarda una nota nueva en el cuaderno.")
    p_anadir.add_argument("texto", nargs="+", help="el contenido de la nota")
    p_anadir.add_argument("-t", "--etiqueta", action="append", default=[],
                          help="etiqueta de la nota, se puede repetir")
    p_anadir.set_defaults(func=anadir)

    p_listar = subcomandos.add_parser("listar", parents=[comunes],
                                      help="muestra las notas guardadas",
                                      description="Muestra las notas del cuaderno.")
    p_listar.add_argument("-t", "--etiqueta", help="mostrar solo las de esta etiqueta")
    p_listar.add_argument("-n", "--maximo", type=int, help="cuántas notas mostrar como mucho")
    p_listar.set_defaults(func=listar)

    p_buscar = subcomandos.add_parser("buscar", parents=[comunes],
                                      help="busca un texto en las notas",
                                      description="Busca un texto dentro de las notas.")
    p_buscar.add_argument("texto", help="lo que hay que buscar")
    p_buscar.add_argument("-s", "--sensible", action="store_true",
                          help="distinguir mayúsculas de minúsculas")
    p_buscar.set_defaults(func=buscar)

    p_borrar = subcomandos.add_parser("borrar", parents=[comunes],
                                      help="elimina notas por su número",
                                      description="Elimina una o varias notas por su número.")
    p_borrar.add_argument("identificadores", nargs="+", type=int, help="números de las notas")
    p_borrar.add_argument("--si", action="store_true", help="no preguntar antes de borrar")
    p_borrar.set_defaults(func=borrar)

    return analizador


def main() -> int:
        argumentos = construir_analizador().parse_args()
    return argumentos.func(argumentos)


if __name__ == "__main__":
        raise SystemExit(main())
```

Las decisiones de este programa:

- **Cada acción devuelve un entero**, que `main` devuelve a su vez y `SystemExit` convierte en el código de salida del proceso. Cero si todo ha ido bien, uno si no había nada que hacer. Eso permite encadenar el programa con otros en un script, y lo verás en detalle en la lección de códigos de salida.
- **`raise SystemExit(main())`** en lugar de `sys.exit(main())`. Hacen exactamente lo mismo, porque `sys.exit` no es más que un `raise SystemExit` disfrazado, pero así se ve que la salida es una excepción y no hace falta importar `sys`.
- **Las acciones reciben el `Namespace` entero.** Es lo que permite que todas tengan la misma firma y que `argumentos.func(argumentos)` funcione sin saber cuál es.
- **`texto` es `nargs="+"` en `añadir` y un posicional suelto en `buscar`.** En el primero se unen las palabras con `" ".join(...)`, así que se puede escribir la nota sin comillas. En el segundo se busca una cosa concreta y las comillas son el comportamiento esperado.
- **`metavar="COMANDO"`** en `add_subparsers` sustituye el `{añadir,listar,buscar,borrar}` de la línea `usage:` por una palabra corta. Con cuatro subcomandos ya se agradece; con quince es imprescindible.
- **`notas[: argumentos.maximo]`** funciona aunque `maximo` sea `None`, porque rebanar hasta `None` significa "hasta el final". Es un pequeño truco que evita un `if`.

## La ayuda de cada nivel

Arriba del todo, el índice de la herramienta:

```bash
python3 notas.py -h
```

```salida
usage: notas.py [-h] COMANDO ...

Cuaderno de notas de terminal.

positional arguments:
  COMANDO
    añadir    guarda una nota nueva
    listar    muestra las notas guardadas
    buscar    busca un texto en las notas
    borrar    elimina notas por su número

options:
  -h, --help  show this help message and exit
```

Y la de cada subcomando, con su opción heredada `-f` ya en su sitio:

```bash
python3 notas.py añadir -h
```

```salida
usage: notas.py añadir [-h] [-f FICHERO] [-t ETIQUETA] texto [texto ...]

Guarda una nota nueva en el cuaderno.

positional arguments:
  texto                 el contenido de la nota

options:
  -h, --help            show this help message and exit
  -f, --fichero FICHERO
                        cuaderno donde están las notas
  -t, --etiqueta ETIQUETA
                        etiqueta de la nota, se puede repetir
```

```bash
python3 notas.py borrar -h
```

```salida
usage: notas.py borrar [-h] [-f FICHERO] [--si]
                       identificadores [identificadores ...]

Elimina una o varias notas por su número.

positional arguments:
  identificadores       números de las notas

options:
  -h, --help            show this help message and exit
  -f, --fichero FICHERO
                        cuaderno donde están las notas
  --si                  no preguntar antes de borrar
```

Un subcomando que no existe se rechaza con la lista de los que sí:

```bash
python3 notas.py editar 1
```

```salida
usage: notas.py [-h] COMANDO ...
notas.py: error: argument COMANDO: invalid choice: 'editar' (choose from 'añadir', 'listar', 'buscar', 'borrar')
```

## Una sesión de uso

```bash
python3 notas.py añadir Comprar pilas para el mando -t casa
python3 notas.py añadir "Llamar al taller el lunes" -t coche -t urgente
python3 notas.py añadir Revisar el informe anual -t trabajo
```

```salida
Añadida la nota 1.
Añadida la nota 2.
Añadida la nota 3.
```

```bash
python3 notas.py listar
```

```salida
  1  2026-09-19  Comprar pilas para el mando  #casa
  2  2026-09-19  Llamar al taller el lunes  #coche #urgente
  3  2026-09-19  Revisar el informe anual  #trabajo
```

```bash
python3 notas.py listar -t coche
```

```salida
  2  2026-09-19  Llamar al taller el lunes  #coche #urgente
```

```bash
python3 notas.py buscar taller
```

```salida
  2  2026-09-19  Llamar al taller el lunes
```

La búsqueda que no encuentra nada avisa y sale con código 1, para que un script pueda enterarse:

```bash
python3 notas.py buscar TALLER -s
```

```salida
Ninguna nota contiene 'TALLER'.
```

El borrado pregunta antes, salvo que le digas que no lo haga:

```bash
python3 notas.py borrar 3
```

```salida
¿Borrar 1 nota? [s/N] n
No se ha borrado nada.
```

```bash
python3 notas.py borrar 3 --si
```

```salida
Borrada 1 nota.
```

Y la opción común funciona en cualquier subcomando, así que se pueden tener varios cuadernos:

```bash
python3 notas.py añadir Preparar la reunión del martes -f trabajo.json -t reunion
python3 notas.py listar -f trabajo.json
```

```salida
Añadida la nota 1.
  1  2026-09-19  Preparar la reunión del martes  #reunion
```

> [!consejo] Los subcomandos se pueden anidar
>
> Nada impide que un subparser tenga a su vez sus propios subcomandos, y así se construyen herramientas como `docker container ls`. Técnicamente es repetir lo mismo un nivel más abajo. En la práctica, piénsatelo: tres niveles de subcomandos son muy difíciles de recordar y casi siempre indican que la herramienta debería ser dos herramientas. Si llegas ahí, replantea el diseño antes de escribir el código.

> [!resumen] En resumen
>
> Los subcomandos agrupan varias órdenes bajo un único programa, cada una con sus propios argumentos y su propia ayuda. Se declaran pidiendo `add_subparsers(dest="comando", required=True)` al analizador principal y añadiendo un `add_parser` por cada orden, que devuelve un `ArgumentParser` completo al que se le pueden poner posicionales, opciones, tipos y todo lo demás. El `required=True` es fácil de olvidar y su ausencia se paga con un `AttributeError` el día que alguien ejecute el programa a secas. Para decidir qué código ejecutar, el patrón idiomático no es un diccionario de nombres sino `set_defaults(func=...)` en cada subparser, porque deja la función pegada a la declaración del subcomando y convierte el despacho en la línea `argumentos.func(argumentos)`, que no cambia por muchos subcomandos que añadas. Las opciones comunes se declaran una sola vez en un `ArgumentParser` aparte creado con `add_help=False` y se reparten con `parents=[...]`, teniendo en cuenta que así se escriben detrás del subcomando. Y la ayuda funciona a dos niveles: la general lista los subcomandos con el `help` de cada uno, y la de cada subcomando se pide poniendo `-h` detrás de su nombre.

> [!ejercicio] Practica
>
> Trabaja sobre `notas.py` y resuelve:
>
> 1. Añade un subcomando `editar` que reciba el número de una nota y el texto nuevo, y que falle con código 1 si ese número no existe. Fíjate en que no tienes que tocar ni `main` ni ninguna otra acción.
> 2. Quita el `required=True` de `add_subparsers`, ejecuta el programa sin subcomando y lee el `AttributeError`. Después arréglalo de otra manera: con `analizador.set_defaults(func=None)` y una comprobación que imprima la ayuda cuando no hay subcomando. Decide cuál de las dos soluciones prefieres.
> 3. Mueve la opción `-f/--fichero` del parser padre al analizador principal, de modo que se escriba antes del subcomando. Comprueba qué cambia en las dos ayudas y en la forma de invocarlo.
> 4. Añade al parser padre una opción `-v/--verboso` con `action="count"` y úsala en todas las acciones para imprimir información extra. Verás que basta con declararla una vez.
> 5. Añade un subcomando `etiquetas` que liste todas las etiquetas usadas con cuántas notas tiene cada una, ordenadas de más a menos. Un `collections.Counter` te lo resuelve en dos líneas.
> 6. Reescribe el despacho con un diccionario en vez de con `set_defaults`, renombra después el subcomando `borrar` a `eliminar` y comprueba cuántos sitios has tenido que tocar en cada versión.
