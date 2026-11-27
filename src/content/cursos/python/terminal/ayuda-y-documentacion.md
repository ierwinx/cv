---
titulo: "Ayuda y documentación"
resumen: "La salida de -h es la cara de tu programa: cómo escribirla para que se entienda sin buscar el manual en ningún otro sitio."
minutos: 25
orden: 13
---

Cuando alguien se encuentra con una herramienta de terminal que no conoce, hace una sola cosa: escribir `programa -h`. Lo que salga ahí decide si esa persona usa tu programa o busca otro. No es documentación adicional, **es la interfaz**, igual que los botones lo son de una aplicación con ventanas.

La buena noticia es que `argparse` ya te da una ayuda correcta sin hacer nada. La mejorable es que "correcta" no es lo mismo que "buena": una lista de veinte opciones en un solo bloque, sin ejemplos, sin valores por defecto y con los nombres internos de las variables asomando, es técnicamente completa y prácticamente inútil.

> [!objetivo] Qué vas a aprender
>
> Controlar todas las piezas de la ayuda que genera `argparse`: `prog`, `description`, `epilog` y `usage`, los formateadores que conservan los saltos de línea y muestran los valores por defecto, los textos `help` y `metavar` de cada argumento, los grupos temáticos, las opciones ocultas y la bandera `--version`.

## Las cuatro piezas de la cabecera

Tres se le pasan al constructor y la cuarta se deduce sola:

| Parámetro | Dónde sale | Para qué |
| --- | --- | --- |
| `prog` | Al principio del `usage:` y en los mensajes de error | El nombre con el que se invoca el programa |
| `usage` | La primera línea de la ayuda | Cómo se escribe la invocación |
| `description` | Justo debajo del `usage:` | Qué hace el programa |
| `epilog` | Al final del todo | Ejemplos, notas, dónde acudir |

```python title="cabecera.py"
import argparse

analizador = argparse.ArgumentParser(
    prog="respaldo",
    description="Copia una carpeta a un destino y guarda un registro de lo copiado.",
    epilog="Los respaldos se guardan con la fecha en el nombre. Más información en respaldo.es.",
)
analizador.add_argument("origen", help="carpeta que hay que copiar")
analizador.parse_args()
```

```bash
python3 cabecera.py -h
```

```salida
usage: respaldo [-h] origen

Copia una carpeta a un destino y guarda un registro de lo copiado.

positional arguments:
  origen      carpeta que hay que copiar

options:
  -h, --help  show this help message and exit

Los respaldos se guardan con la fecha en el nombre. Más información en
respaldo.es.
```

De serie, `prog` vale el nombre del fichero, lo que está bien mientras el programa se lance con `python3 respaldo.py`. En cuanto lo empaquetes y se instale como un comando, la ayuda tiene que decir `respaldo` y no `respaldo.py`, y ahí es donde hace falta fijarlo a mano.

El `usage` también se genera solo, y casi siempre está bien. Se sustituye cuando la línea automática sale demasiado larga o cuando quieres explicar una forma de uso que `argparse` no puede adivinar:

```python title="uso.py"
import argparse

analizador = argparse.ArgumentParser(
    description="Copia una carpeta a un destino.",
    usage="%(prog)s [opciones] ORIGEN DESTINO",
)
analizador.add_argument("origen", help="carpeta que hay que copiar")
analizador.add_argument("destino", help="dónde dejar la copia")
analizador.add_argument("-c", "--comprimir", action="store_true", help="comprimir la copia")
analizador.parse_args()
```

```bash
python3 uso.py -h
```

```salida
usage: uso.py [opciones] ORIGEN DESTINO

Copia una carpeta a un destino.

positional arguments:
  origen           carpeta que hay que copiar
  destino          dónde dejar la copia

options:
  -h, --help       show this help message and exit
  -c, --comprimir  comprimir la copia
```

Ese `%(prog)s` es un marcador que `argparse` sustituye por el nombre del programa. Úsalo siempre en vez de escribir el nombre a mano: así el `usage` sigue siendo correcto si cambias el `prog` o si el programa es un subcomando.

> [!aviso] Un `usage` a mano se queda desfasado
>
> Es la única parte de la ayuda que deja de mantenerse sola en cuanto la tocas. Si añades un argumento obligatorio y te olvidas de actualizar el `usage`, la ayuda mentirá y nadie se dará cuenta hasta que alguien la siga y le salte un error. Escribe `usage` solo cuando la línea automática sea de verdad ilegible, y entonces déjala genérica, con un `[opciones]` que no haya que tocar cada vez.

## Conservar los saltos de línea

El formateador por defecto **aplasta** el `description` y el `epilog`: junta todo en un párrafo y lo reparte según el ancho de la terminal. Con un texto de una frase da igual, pero en cuanto quieras dos párrafos o una lista de ejemplos, el resultado es un churro:

```python title="aplastado.py"
import argparse

analizador = argparse.ArgumentParser(
    description="""Copia una carpeta a un destino.

La copia conserva la estructura de subcarpetas y no borra nada
del destino: los ficheros que ya estuvieran allí se mantienen.""",
    epilog="""Ejemplos:

  respaldo.py ~/documentos /medios/usb
  respaldo.py ~/documentos /medios/usb --comprimir -e "*.tmp"
""",
)
analizador.add_argument("origen", help="carpeta que hay que copiar")
analizador.parse_args()
```

```bash
python3 aplastado.py -h
```

```salida
usage: aplastado.py [-h] origen

Copia una carpeta a un destino. La copia conserva la estructura de subcarpetas
y no borra nada del destino: los ficheros que ya estuvieran allí se mantienen.

positional arguments:
  origen      carpeta que hay que copiar

options:
  -h, --help  show this help message and exit

Ejemplos: respaldo.py ~/documentos /medios/usb respaldo.py ~/documentos
/medios/usb --comprimir -e "*.tmp"
```

Los ejemplos han quedado en una sola línea y no se distingue dónde acaba uno y empieza el otro. La solución es cambiar el formateador con `formatter_class`. El mismo programa, con una línea más en el constructor:

```python title="crudo.py"
import argparse

analizador = argparse.ArgumentParser(
    description="""Copia una carpeta a un destino.

La copia conserva la estructura de subcarpetas y no borra nada
del destino: los ficheros que ya estuvieran allí se mantienen.""",
    epilog="""Ejemplos:

  respaldo.py ~/documentos /medios/usb
  respaldo.py ~/documentos /medios/usb --comprimir -e "*.tmp"
""",
    formatter_class=argparse.RawDescriptionHelpFormatter,
)
analizador.add_argument("origen", help="carpeta que hay que copiar")
analizador.parse_args()
```

```bash
python3 crudo.py -h
```

```salida
usage: crudo.py [-h] origen

Copia una carpeta a un destino.

La copia conserva la estructura de subcarpetas y no borra nada
del destino: los ficheros que ya estuvieran allí se mantienen.

positional arguments:
  origen      carpeta que hay que copiar

options:
  -h, --help  show this help message and exit

Ejemplos:

  respaldo.py ~/documentos /medios/usb
  respaldo.py ~/documentos /medios/usb --comprimir -e "*.tmp"
```

Ojo con el nombre: `RawDescriptionHelpFormatter` respeta el `description` y el `epilog`, pero **sigue reordenando los textos `help` de cada argumento**, que es justo lo que quieres, porque esos sí deben adaptarse al ancho de la pantalla. Existe también `RawTextHelpFormatter`, que respeta todo, incluidos los `help`; se usa poco y solo cuando algún argumento necesita una explicación de varias líneas.

Como el formateador respeta los saltos de línea tal cual, tendrás que partir tú las líneas a mano. Ochenta caracteres es el ancho seguro.

## Mostrar los valores por defecto

Un `help` que dice "cuántas copias conservar" deja a medias a quien lo lee: ¿cuántas conserva si no digo nada? `argparse.ArgumentDefaultsHelpFormatter` añade esa información a todos los argumentos automáticamente:

```python title="defectos.py"
import argparse

analizador = argparse.ArgumentParser(
    description="Muestra los valores por defecto en la ayuda.",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter,
)
analizador.add_argument("-d", "--destino", default="./copias", help="carpeta de destino")
analizador.add_argument("-n", "--copias", type=int, default=3, help="cuántas copias conservar")
analizador.add_argument("--comprimir", action="store_true", help="comprimir el resultado")
analizador.parse_args()
```

```bash
python3 defectos.py -h
```

```salida
usage: defectos.py [-h] [-d DESTINO] [-n COPIAS] [--comprimir]

Muestra los valores por defecto en la ayuda.

options:
  -h, --help            show this help message and exit
  -d, --destino DESTINO
                        carpeta de destino (default: ./copias)
  -n, --copias COPIAS   cuántas copias conservar (default: 3)
  --comprimir           comprimir el resultado (default: False)
```

Los dos formateadores no son incompatibles, pero tampoco se pueden pasar los dos a la vez. Se combinan creando una clase que herede de ambos:

```python title="combinado.py"
import argparse


class Formato(argparse.RawDescriptionHelpFormatter,
              argparse.ArgumentDefaultsHelpFormatter):
        """Respeta los saltos de línea y añade los valores por defecto."""


analizador = argparse.ArgumentParser(
    description="Primera línea.\n\nSegunda línea, en su propio párrafo.",
    formatter_class=Formato,
)
analizador.add_argument("-n", "--copias", type=int, default=3, help="cuántas copias conservar")
analizador.parse_args()
```

```bash
python3 combinado.py -h
```

```salida
usage: combinado.py [-h] [-n COPIAS]

Primera línea.

Segunda línea, en su propio párrafo.

options:
  -h, --help           show this help message and exit
  -n, --copias COPIAS  cuántas copias conservar (default: 3)
```

Una clase vacía con un docstring y dos clases base. No hay que escribir ni un método: hereda el comportamiento de las dos.

> [!consejo] `%(default)s` en vez del formateador
>
> `ArgumentDefaultsHelpFormatter` es cómodo, pero pone el defecto en **todos** los argumentos, y eso llena la ayuda de ruido: `(default: None)` en las opciones que no tienen valor por omisión, `(default: [])` en las de `append`, `(default: False)` en cada bandera. Ninguna de esas tres aporta nada.
>
> La alternativa es escribirlo solo donde importa, usando el marcador `%(default)s` dentro del propio `help`:
>
> ```python
> formato.add_argument("-n", "--conservar", type=int, default=3, metavar="N",
>                      help="cuántos respaldos antiguos mantener (por defecto: %(default)s)")
> ```
>
> Cuesta unos caracteres más por argumento, te deja escribirlo en tu idioma y solo aparece donde de verdad hace falta. Para un programa con muchas opciones, es lo que produce mejor ayuda.

## El nombre que sale en la ayuda: `metavar`

De serie, el valor de una opción se representa en la ayuda con su nombre en mayúsculas: `--destino DESTINO`. Suele bastar, pero hay tres casos en los que queda mal, y `metavar` los arregla:

```python title="metavar.py"
import argparse

analizador = argparse.ArgumentParser(description="El nombre que sale en la ayuda.")
analizador.add_argument("-d", "--destino", metavar="CARPETA", help="dónde dejar la copia")
analizador.add_argument("--recorte", nargs=4, type=int,
                        metavar=("X", "Y", "ANCHO", "ALTO"), help="zona que hay que recortar")
analizador.add_argument("-f", "--formato", choices=["zip", "tar", "ninguno"],
                        metavar="FORMATO", default="zip",
                        help="compresión: zip, tar o ninguno")
analizador.parse_args()
```

```bash
python3 metavar.py -h
```

```salida
usage: metavar.py [-h] [-d CARPETA] [--recorte X Y ANCHO ALTO] [-f FORMATO]

El nombre que sale en la ayuda.

options:
  -h, --help            show this help message and exit
  -d, --destino CARPETA
                        dónde dejar la copia
  --recorte X Y ANCHO ALTO
                        zona que hay que recortar
  -f, --formato FORMATO
                        compresión: zip, tar o ninguno
```

Los tres casos, en el orden del ejemplo:

- **Decir qué clase de valor se espera.** `--destino CARPETA` informa más que `--destino DESTINO`, que no dice nada que no estuviera ya en el nombre de la opción.
- **Nombrar cada valor de un `nargs` con varios.** Compara `--recorte X Y ANCHO ALTO` con el `--recorte RECORTE RECORTE RECORTE RECORTE` que salía en la lección de tipos. Con una tupla de la misma longitud que el `nargs`, cada hueco tiene su nombre.
- **Acortar un `choices` largo.** Sin `metavar`, la línea `usage:` llevaría `{zip,tar,ninguno}` incrustado, y con diez valores sería ilegible. Poniendo un `metavar` corto y enumerando las opciones en el `help`, la cabecera se limpia. El `choices` sigue validando igual, y el mensaje de error sigue diciendo qué se admite.

`metavar` también funciona en los posicionales, donde sustituye el nombre en minúsculas por el que le pongas. Es la forma de que la ayuda diga `ORIGEN DESTINO` en vez de `origen destino`, que es la convención más habitual.

## Agrupar las opciones relacionadas

Con más de seis o siete opciones, el bloque `options:` deja de ser una lista y pasa a ser un muro. `add_argument_group` crea apartados con su propio título:

```python
seleccion = analizador.add_argument_group("qué se copia")
seleccion.add_argument("-e", "--excluir", action="append", default=[], metavar="PATRÓN",
                       help="patrón de nombre que no hay que copiar, repetible")
```

Los argumentos se añaden al grupo en lugar de al analizador, y todo lo demás funciona igual: el grupo solo afecta a cómo se dibuja la ayuda, no a cómo se analiza la línea. No lo confundas con `add_mutually_exclusive_group` de la lección de validación, que sí cambia el comportamiento.

Agrupa por lo que hace el usuario, no por el tipo de dato: "qué se copia", "cómo se copia", "qué se cuenta". Un grupo llamado "opciones booleanas" no ayuda a nadie.

## Esconder lo que no es asunto de nadie

Casi todo programa acaba teniendo alguna opción interna: una para medir tiempos, otra para forzar un camino raro al depurar. Son útiles y no deben salir en la ayuda. `argparse.SUPPRESS` las hace invisibles sin desactivarlas:

```python
analizador.add_argument("--perfilar", action="store_true", help=argparse.SUPPRESS)
```

La opción sigue funcionando y sigue llegando al `Namespace`; simplemente no aparece ni en `usage:` ni en la lista.

> [!aviso] Esconder no es proteger
>
> Una opción con `SUPPRESS` la puede usar cualquiera que la conozca, y bastan cinco segundos leyendo tu código para conocerla. Sirve para no ensuciar la ayuda con cosas que no le interesan a quien usa el programa, no para impedir nada. Si una opción es peligrosa, la solución es pedir confirmación o exigir una bandera explícita como `--si-de-verdad`, no ocultarla.

## Añadir `--version`

Es una de las dos banderas que se esperan en cualquier herramienta, junto con `-h`. La acción `version` la implementa entera: imprime el texto y termina con código 0.

```python title="version.py"
import argparse

VERSION = "2.1.0"

analizador = argparse.ArgumentParser(prog="respaldo", description="Copia carpetas.")
analizador.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")
analizador.add_argument("origen", help="carpeta que hay que copiar")
analizador.parse_args()
print("copiando...")
```

```bash
python3 version.py --version
```

```salida
respaldo 2.1.0
```

Fíjate en que el argumento obligatorio `origen` no se echa en falta: igual que con `-h`, `argparse` atiende la bandera y sale antes de comprobar nada más. El `%(prog)s` funciona aquí igual que en el `usage`.

El formato `nombre versión` de esa salida es la convención universal, y hay scripts que la analizan esperándola. No le añadas adornos.

> [!nota] `--version` sin forma corta
>
> Verás herramientas con `-V` mayúscula como atajo de `--version`, y otras que no lo tienen. La razón de que no sea `-v` es que esa letra está tomada por `--verboso` en casi todo el mundo, y confundirlas es un clásico. Si tu programa no usa `-v` para nada, puedes ponerla; si la usa, deja `--version` solo con su forma larga.

## Un programa bien documentado, entero

Juntando todo lo anterior, esta es la pinta que tiene una herramienta con la ayuda cuidada. El cuerpo solo imprime la configuración, porque lo que interesa aquí es la declaración:

```python title="respaldo.py"
"""Herramienta de respaldo con la ayuda cuidada."""

import argparse
from pathlib import Path

VERSION = "2.1.0"

DESCRIPCION = """Copia una carpeta a un destino y deja un registro de lo copiado.

La copia conserva la estructura de subcarpetas y nunca borra nada del
destino: los ficheros que ya estuvieran allí se mantienen tal cual."""

EPILOGO = """Ejemplos:

  respaldo ~/documentos /medios/usb
  respaldo ~/documentos /medios/usb --comprimir -e "*.tmp" -e "*.log"
  respaldo ~/documentos /medios/usb --simular -vv

Códigos de salida: 0 todo bien, 1 algún fichero no se ha podido copiar,
2 error en los argumentos."""


def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(
        prog="respaldo",
        description=DESCRIPCION,
        epilog=EPILOGO,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    analizador.add_argument("origen", type=Path, metavar="ORIGEN",
                            help="carpeta que hay que copiar")
    analizador.add_argument("destino", type=Path, metavar="DESTINO",
                            help="carpeta donde dejar la copia")
    analizador.add_argument("--version", action="version",
                            version=f"%(prog)s {VERSION}")

    seleccion = analizador.add_argument_group("qué se copia")
    seleccion.add_argument("-e", "--excluir", action="append", default=[],
                           metavar="PATRÓN",
                           help="patrón de nombre que no hay que copiar, repetible")
    seleccion.add_argument("--ocultos", action=argparse.BooleanOptionalAction,
                           default=False, help="incluir los ficheros que empiezan por punto")
    seleccion.add_argument("--desde", metavar="AAAA-MM-DD",
                           help="copiar solo lo modificado a partir de esa fecha")

    formato = analizador.add_argument_group("cómo se copia")
    formato.add_argument("-c", "--comprimir", choices=["zip", "tar", "ninguno"],
                         metavar="FORMATO", default="ninguno",
                         help="compresión del resultado: zip, tar o ninguno (por defecto: %(default)s)")
    formato.add_argument("-n", "--conservar", type=int, default=3, metavar="N",
                         help="cuántos respaldos antiguos mantener (por defecto: %(default)s)")

    informes = analizador.add_argument_group("qué se cuenta")
    informes.add_argument("-v", "--verboso", action="count", default=0,
                          help="explica lo que hace, repetible para más detalle")
    informes.add_argument("-s", "--simular", action="store_true",
                          help="enseñar lo que haría sin copiar nada")
    informes.add_argument("--registro", type=Path, metavar="FICHERO",
                          help="escribir el detalle de la copia en este fichero")

    analizador.add_argument("--perfilar", action="store_true", help=argparse.SUPPRESS)

    return analizador


def main() -> None:
        argumentos = construir_analizador().parse_args()
    print(vars(argumentos))


if __name__ == "__main__":
        main()
```

Y esta es su ayuda, que es el resultado que perseguíamos:

```bash
python3 respaldo.py -h
```

```salida
usage: respaldo [-h] [--version] [-e PATRÓN] [--ocultos | --no-ocultos]
                [--desde AAAA-MM-DD] [-c FORMATO] [-n N] [-v] [-s]
                [--registro FICHERO]
                ORIGEN DESTINO

Copia una carpeta a un destino y deja un registro de lo copiado.

La copia conserva la estructura de subcarpetas y nunca borra nada del
destino: los ficheros que ya estuvieran allí se mantienen tal cual.

positional arguments:
  ORIGEN                carpeta que hay que copiar
  DESTINO               carpeta donde dejar la copia

options:
  -h, --help            show this help message and exit
  --version             show program's version number and exit

qué se copia:
  -e, --excluir PATRÓN  patrón de nombre que no hay que copiar, repetible
  --ocultos, --no-ocultos
                        incluir los ficheros que empiezan por punto
  --desde AAAA-MM-DD    copiar solo lo modificado a partir de esa fecha

cómo se copia:
  -c, --comprimir FORMATO
                        compresión del resultado: zip, tar o ninguno (por
                        defecto: ninguno)
  -n, --conservar N     cuántos respaldos antiguos mantener (por defecto: 3)

qué se cuenta:
  -v, --verboso         explica lo que hace, repetible para más detalle
  -s, --simular         enseñar lo que haría sin copiar nada
  --registro FICHERO    escribir el detalle de la copia en este fichero

Ejemplos:

  respaldo ~/documentos /medios/usb
  respaldo ~/documentos /medios/usb --comprimir -e "*.tmp" -e "*.log"
  respaldo ~/documentos /medios/usb --simular -vv

Códigos de salida: 0 todo bien, 1 algún fichero no se ha podido copiar,
2 error en los argumentos.
```

Diez opciones y se lee sin esfuerzo. Lo que lo consigue: tres grupos con nombres que dicen para qué sirven, `metavar` en todo lo que necesitaba aclaración, ejemplos reales en el epílogo y la opción interna `--perfilar` fuera de la vista. Todo eso son veinte caracteres de más por línea en el código.

La opción oculta sigue ahí, aunque no aparezca en ningún sitio de la ayuda:

```bash
python3 respaldo.py documentos /medios/usb -e "*.tmp" -e "*.log" -c zip -vv
```

```salida
{'origen': PosixPath('documentos'), 'destino': PosixPath('/medios/usb'), 'excluir': ['*.tmp', '*.log'], 'ocultos': False, 'desde': None, 'comprimir': 'zip', 'conservar': 3, 'verboso': 2, 'simular': False, 'registro': None, 'perfilar': False}
```

## Cómo escribir los textos

Las reglas de estilo de los `help` no son opinión: son la convención que siguen todas las herramientas de terminal, y desviarse de ellas hace que la tuya cante.

- **Empieza en minúscula y no termines en punto.** `carpeta que hay que copiar`, no `Carpeta que hay que copiar.`. Son fragmentos de frase, no frases, y así quedan alineados con los de `argparse`, que también lo hacen.
- **Di qué es el valor, no cómo se llama la opción.** `--excluir` con el `help` "excluye ficheros" no aporta nada. "patrón de nombre que no hay que copiar, repetible" sí.
- **Concreta las unidades y los formatos.** "tiempo de espera" es inútil; "segundos que esperar antes de rendirse" se entiende. Para las fechas, di el formato: eso es lo que hace el `metavar="AAAA-MM-DD"` del ejemplo.
- **Menciona lo que no es obvio**, como que una opción se puede repetir o que otra no hace nada si no está puesta una tercera.
- **Una línea.** Si necesitas un párrafo, es que la explicación va en el `description` o en el `epilog`, no en el `help` del argumento.
- **En el `epilog`, ejemplos reales.** Es lo primero que mira todo el mundo y lo que más rápido enseña a usar un programa. Dos o tres invocaciones completas, que se puedan copiar y pegar, valen más que cinco párrafos.

> [!consejo] Lee tu propia ayuda antes de dar el programa por terminado
>
> Ejecuta `-h` y léela como si no hubieras escrito el programa. Suele aparecer al menos un `help` que solo tiene sentido si ya sabes cómo funciona la herramienta por dentro, y ese es exactamente el que hay que reescribir. Estréchale la terminal a ochenta columnas mientras lo haces, porque es el ancho que tendrá quien la use de verdad.

> [!resumen] En resumen
>
> La salida de `-h` es la interfaz de una herramienta de terminal y merece el mismo cuidado que se le pondría a una pantalla. La cabecera se controla con `prog`, que fija el nombre que aparece en el `usage` y en los errores, `description`, que explica qué hace el programa, `epilog`, que va al final y es el sitio de los ejemplos, y `usage`, que se genera solo y conviene no tocar salvo que salga ilegible. El formateador por defecto aplasta los párrafos, así que un `description` o un `epilog` con estructura necesitan `formatter_class=argparse.RawDescriptionHelpFormatter`; `ArgumentDefaultsHelpFormatter` añade los valores por defecto a todos los argumentos, y los dos se combinan heredando de ambos en una clase vacía, aunque para una ayuda limpia suele salir mejor escribir `%(default)s` solo donde aporta. En cada argumento, el `help` es la línea que lo describe y el `metavar` el nombre con el que aparece su valor, útil para aclarar qué se espera, para nombrar los valores de un `nargs` múltiple y para que un `choices` largo no ensucie el `usage`. Con muchas opciones, `add_argument_group` las reparte en apartados temáticos, y `help=argparse.SUPPRESS` esconde las internas sin desactivarlas. Añade siempre `--version` con `action="version"`, y escribe los textos en minúscula, sin punto final, concretos y de una sola línea.

> [!ejercicio] Practica
>
> Trabaja sobre las herramientas que ya has escrito y resuelve:
>
> 1. Coge `listar.py` de la lección de opciones y ponle `prog`, un `description` de dos párrafos, un `epilog` con tres ejemplos reales y un `--version` con `action="version"`. Mira la ayuda primero sin cambiar el formateador y después con `RawDescriptionHelpFormatter`, y compara las dos salidas.
> 2. Recorre todos sus argumentos poniendo `metavar` donde el nombre automático no diga nada, y usa una tupla en alguno que tenga `nargs` con varios valores.
> 3. Reparte sus opciones en dos o tres grupos con `add_argument_group` y ponles títulos que describan para qué sirven, no de qué tipo son.
> 4. Añade una opción `--depurar` oculta con `help=argparse.SUPPRESS` que imprima el `Namespace` entero, y comprueba que no aparece en la ayuda pero sí funciona.
> 5. Prueba las dos formas de mostrar los valores por defecto, primero con `ArgumentDefaultsHelpFormatter` y después con `%(default)s` en los `help` que lo necesiten, y quédate con la que produzca una ayuda más limpia en tu caso.
> 6. Haz lo mismo con `notas.py` de la lección de subcomandos: cada subparser admite su propio `description`, su `epilog` y su `formatter_class`, y merece la pena que los tenga.
