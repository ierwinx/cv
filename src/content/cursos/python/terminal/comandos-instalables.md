---
titulo: "Comandos instalables"
resumen: "Cómo convertir tu proyecto en un comando que se escribe por su nombre, con el pyproject.toml explicado campo a campo."
minutos: 22
orden: 21
---

Tu herramienta funciona, pero para usarla tienes que escribir esto:

```bash
python3 /Users/erwin/proyectos/misgastos/src/misgastos/cli.py anadir "Café" 1.60
```

Y eso suponiendo que te acuerdes de la ruta, que estés en el entorno virtual correcto y que la importación de `misgastos.modelo` encuentre el paquete, cosa que desde ahí no va a pasar. Lo que quieres escribir es esto:

```bash
misgastos anadir "Café" 1.60
```

Desde cualquier carpeta, sin rutas y sin pensar. Eso se consigue con un fichero de configuración de quince líneas y una orden de instalación.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás escribir un `pyproject.toml` completo, entender qué hace cada uno de sus campos, crear un comando con `[project.scripts]` e instalar tu proyecto en modo editable para desarrollarlo cómodamente.

## Qué es el `pyproject.toml`

Es el fichero que describe tu proyecto para las herramientas de empaquetado. Va en la raíz, al lado de `src/`, y en un proyecto moderno es el único fichero de configuración que hace falta.

Está escrito en TOML, un formato pensado para configuración que ya te resultará familiar: parejas de `clave = valor` agrupadas en **tablas**, que son esas cabeceras entre corchetes. Los textos van entre comillas, los números sin ellas y las listas entre corchetes.

Este es el fichero entero de `misgastos`:

```text title="pyproject.toml"
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "misgastos"
version = "0.1.0"
description = "Apunta tus gastos desde la terminal y consulta el total por categoría."
readme = "README.md"
requires-python = ">=3.11"
license = "MIT"
authors = [{ name = "Erwin", email = "erwin@example.com" }]
keywords = ["gastos", "terminal", "cli"]
dependencies = []

[project.scripts]
misgastos = "misgastos.cli:main"
```

Quince líneas útiles. Vamos una por una.

## La tabla `[build-system]`

```text
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

Esta tabla responde a una sola pregunta: **quién va a construir el paquete**. Empaquetar no lo hace `pip`; `pip` solo descarga e instala. La construcción la hace una herramienta aparte llamada *backend*, y aquí le dices a `pip` cuál quieres y qué necesita.

- `requires` es la lista de lo que hay que instalar **para construir**, no para usar tu programa. `pip` crea un entorno temporal aparte, instala ahí esas herramientas, construye el paquete y tira el entorno. Nada de esto acaba en el ordenador de quien te instale.
- `build-backend` es el módulo Python que hace el trabajo.

`setuptools` es el backend más antiguo y el que verás en más proyectos. Hay otros, como `hatchling` o `flit`, con configuraciones algo más cortas. Para lo que vas a hacer, cualquiera vale, y estas tres líneas se copian tal cual de proyecto en proyecto.

> [!nota] Esta tabla no es opcional aunque parezca que sí
>
> Si la omites, las herramientas se inventan un valor por defecto para no romper proyectos antiguos. Funciona hoy, pero no está garantizado que funcione mañana ni con todas las herramientas. Escríbela siempre.

## La tabla `[project]`

Aquí van los datos de tu proyecto: los que se enseñan en el índice de paquetes, los que aparecen al hacer `pip show` y los que determinan si se puede instalar o no.

### `name`

```text
name = "misgastos"
```

El nombre con el que se instala y con el que se desinstala. Tiene que ser único en el índice de paquetes si algún día lo publicas, así que conviene buscarlo antes en `pypi.org`. Solo admite letras, números, guiones, guiones bajos y puntos, y no distingue mayúsculas de minúsculas.

No tiene por qué coincidir con el nombre del paquete Python, aunque lo normal es que coincida y así se evitan confusiones. Un ejemplo conocido de lo contrario: el paquete que se instala con `pip install pillow` se importa con `import PIL`.

### `version`

```text
version = "0.1.0"
```

La versión de esta entrega. Es obligatoria y, como ves, está repetida: también está en `__init__.py`. Son dos sitios distintos porque los lee gente distinta (el fichero lo lee Python, la tabla la leen las herramientas de empaquetado) y hay que acordarse de tocar los dos. En la lección siguiente verás qué significa cada número.

### `description`

```text
description = "Apunta tus gastos desde la terminal y consulta el total por categoría."
```

Una sola frase. Es lo que sale al lado del nombre en las listas de resultados y en `pip show`. Sin punto final o con él, da igual, pero que quepa en una línea.

### `readme`

```text
readme = "README.md"
```

El fichero que se usará como descripción larga. El índice de paquetes lo renderiza tal cual en la página del proyecto, así que ese `README.md` acaba siendo la portada pública de tu herramienta.

### `requires-python`

```text
requires-python = ">=3.11"
```

La versión mínima de Python con la que funciona. No es decorativo: si alguien con Python 3.9 intenta instalarlo, `pip` se lo impedirá con un mensaje claro en lugar de instalarlo y dejar que reviente en mitad de la ejecución.

Pon aquí la versión más antigua que hayas probado de verdad. `misgastos` usa `list[Gasto]` y `str | None` en las anotaciones, que necesitan 3.9 y 3.10 respectivamente, así que declarar 3.11 va sobrado y es la versión razonable hoy.

### `license`

```text
license = "MIT"
```

El identificador de la licencia. La forma moderna es esta cadena corta con un identificador estándar (`MIT`, `Apache-2.0`, `GPL-3.0-or-later`), y el fichero `LICENSE` con el texto completo va en la raíz del proyecto. Las herramientas lo copian solo dentro del paquete construido.

### `authors`

```text
authors = [{ name = "Erwin", email = "erwin@example.com" }]
```

Una lista de tablas en línea, con llaves. Es la sintaxis TOML para meter un diccionario dentro de una lista, y admite varias personas separadas por comas. Tanto `name` como `email` son opcionales por separado, pero alguno tiene que haber.

### `keywords`

```text
keywords = ["gastos", "terminal", "cli"]
```

Palabras para que te encuentren en el buscador del índice de paquetes. No sirven para nada más y se pueden omitir.

### `dependencies`

```text
dependencies = []
```

La lista de bibliotecas que tu programa necesita **para funcionar**, no para construirse. Cuando alguien instale tu herramienta, `pip` instalará también todo lo que haya aquí.

`misgastos` no usa nada fuera de la biblioteca estándar, así que la lista está vacía. En cuanto añadas `rich`, en la lección 24, pasará a ser así:

```text
dependencies = [
    "rich>=13.0",
]
```

Ese `>=13.0` es una **restricción de versión**: pides al menos la 13.0 porque es la primera que tiene lo que usas. Las formas habituales:

| Restricción | Significado |
| --- | --- |
| `rich` | Cualquier versión |
| `rich>=13.0` | De la 13.0 en adelante |
| `rich>=13.0,<16` | De la 13.0 en adelante, pero antes de la 16 |
| `rich==13.7.1` | Exactamente esa |

> [!aviso] No confundas `dependencies` con `requirements.txt`
>
> Son dos cosas distintas y coexisten. En `dependencies` se declaran las bibliotecas con la restricción **más amplia** que tu código admita, porque quien instale tu herramienta puede tener otras cosas instaladas y hay que dejarle margen. En un `requirements.txt` se fijan las versiones **exactas** con `==`, porque ahí lo que quieres es reproducir un entorno idéntico. Para una biblioteca o una herramienta publicada manda el `pyproject.toml`; el `requirements.txt` se queda para desplegar aplicaciones.

## La tabla `[project.scripts]`: el comando

Y llegamos a la línea que hace toda la magia:

```text
[project.scripts]
misgastos = "misgastos.cli:main"
```

Se lee así: **crea un comando llamado `misgastos` que ejecute la función `main` del módulo `misgastos.cli`**.

La sintaxis es siempre la misma, `paquete.modulo:funcion`, con un punto separando el paquete del módulo y **dos puntos** separando el módulo de la función. Ese detalle de los dos puntos es la fuente del error más común de todo el fichero, y lo verás al final de la lección.

Esa cadena se llama **punto de entrada**. La función a la que apunta tiene dos requisitos:

- **No recibe argumentos.** El comando la llamará sin pasarle nada, así que si necesita datos, los saca de `sys.argv` (o deja que `argparse` lo haga). Por eso `main(argv=None)` funciona: tiene un parámetro, pero con valor por defecto, así que se puede llamar sin nada.
- **Lo que devuelva se usa como código de salida.** Si devuelve `None`, el código es 0.

Puedes declarar varios comandos, uno por línea, apuntando a funciones distintas:

```text
[project.scripts]
misgastos = "misgastos.cli:main"
misgastos-importar = "misgastos.importar:main"
```

### Qué crea exactamente la instalación

No hay nada mágico. Al instalar, se escribe un pequeño fichero ejecutable dentro de la carpeta `bin` del entorno virtual (`Scripts` en Windows). Puedes abrirlo y mirarlo:

```bash
cat .venv/bin/misgastos
```

```salida
#!/Users/erwin/proyectos/misgastos/.venv/bin/python3.14
import sys
from misgastos.cli import main
if __name__ == '__main__':
    sys.argv[0] = sys.argv[0].removesuffix('.exe')
    sys.exit(main())
```

Es justo lo que harías a mano: un script que importa tu función y la ejecuta, con la ruta del intérprete del entorno en la primera línea para que se lance con el Python correcto. Y como la carpeta `bin` del entorno está en el `PATH` mientras el entorno esté activado, la terminal lo encuentra escribiendo solo su nombre.

## Instalar en modo editable

Con el `pyproject.toml` escrito, sitúate en la raíz del proyecto, con el entorno virtual activado, y ejecuta:

```bash
pip install -e .
```

Ese punto final es la carpeta actual: le estás diciendo a `pip` que instale el proyecto que hay aquí. La `-e` es lo interesante, y significa *editable*.

```salida
Obtaining file:///Users/erwin/proyectos/misgastos
  Installing build dependencies: started
  Installing build dependencies: finished with status 'done'
  Checking if build backend supports build_editable: started
  Checking if build backend supports build_editable: finished with status 'done'
  Getting requirements to build editable: started
  Getting requirements to build editable: finished with status 'done'
  Preparing editable metadata (pyproject.toml): started
  Preparing editable metadata (pyproject.toml): finished with status 'done'
Building wheels for collected packages: misgastos
  Building editable for misgastos (pyproject.toml): started
  Building editable for misgastos (pyproject.toml): finished with status 'done'
  Created wheel for misgastos: filename=misgastos-0.1.0-0.editable-py3-none-any.whl size=2078
Successfully built misgastos
Installing collected packages: misgastos
Successfully installed misgastos-0.1.0
```

Y ya está. El comando existe:

```bash
which misgastos
```

```salida
/Users/erwin/proyectos/misgastos/.venv/bin/misgastos
```

```bash
misgastos --version
```

```salida
misgastos 0.1.0
```

```bash
misgastos --help
```

```salida
usage: misgastos [-h] [--version] [-f FICHERO] {anadir,listar,resumen} ...

Apunta tus gastos y consulta cuánto llevas gastado.

positional arguments:
  {anadir,listar,resumen}
    anadir              apunta un gasto nuevo
    listar              muestra los gastos apuntados
    resumen             muestra el total por categoría

options:
  -h, --help            show this help message and exit
  --version             show program's version number and exit
  -f, --fichero FICHERO
                        fichero JSON donde se guardan los gastos
```

Y funciona desde cualquier carpeta:

```bash
cd ~/Documentos
misgastos anadir "Café con leche" 1.60 -c comida
misgastos anadir "Billete de metro" 2.40 -c transporte
misgastos anadir "Compra semanal" 54.20 -c comida
misgastos anadir "Entradas cine" 18.00 -c ocio
misgastos listar
```

```salida
Apuntado: Café con leche (1.60 €, comida)
Apuntado: Billete de metro (2.40 €, transporte)
Apuntado: Compra semanal (54.20 €, comida)
Apuntado: Entradas cine (18.00 €, ocio)
2026-09-19  Café con leche                   1.60 €  comida
2026-09-19  Billete de metro                 2.40 €  transporte
2026-09-19  Compra semanal                  54.20 €  comida
2026-09-19  Entradas cine                   18.00 €  ocio
TOTAL                                       76.20 €
```

### Qué significa "editable"

Una instalación normal **copia** tu código a la carpeta de paquetes del entorno. A partir de ahí hay dos copias del programa: la que editas y la que se ejecuta. Cada vez que cambiaras una línea tendrías que reinstalar para verla.

Una instalación editable no copia nada. Deja en el entorno un apuntador a la carpeta de tu proyecto:

```bash
ls .venv/lib/python3.14/site-packages/
```

```salida
__editable__.misgastos-0.1.0.pth
misgastos-0.1.0.dist-info
```

Ese fichero `.pth` es el apuntador. Cuando Python arranca, lo lee y añade tu `src/` a la lista de sitios donde buscar módulos. Solo hay una copia del código: la tuya.

### Qué cambia y qué no al editar

Esta distinción evita mucha confusión:

| Qué tocas | ¿Hay que reinstalar? |
| --- | --- |
| El cuerpo de una función en `cli.py` | No |
| Un módulo nuevo dentro del paquete | No |
| `dependencies` en el `pyproject.toml` | Sí |
| `version` en el `pyproject.toml` | Sí |
| `[project.scripts]` en el `pyproject.toml` | Sí |

La regla es sencilla: **el código se lee en cada ejecución, el `pyproject.toml` solo se leyó al instalar**.

Compruébalo. Cambia un mensaje en `cli.py`:

```python title="src/misgastos/cli.py"
        if not gastos:
                print("Todavía no has apuntado nada.")
        return 0
```

Sin reinstalar nada, el comando ya lo dice:

```bash
misgastos -f vacio.json listar
```

```salida
Todavía no has apuntado nada.
```

Cambia ahora la versión en el `pyproject.toml` a `0.3.0` y pregunta:

```bash
pip show misgastos
```

```salida
Name: misgastos
Version: 0.1.0
```

Sigue diciendo 0.1.0. Esa información se guardó en el `dist-info` durante la instalación y ahí se queda hasta que vuelvas a ejecutar `pip install -e .`.

> [!consejo] Instala editable siempre que estés desarrollando
>
> No es un truco para ir rápido: es la forma normal de trabajar en un proyecto propio. El primer día creas el entorno, ejecutas `pip install -e .` y te olvidas, porque a partir de ahí el comando instalado y el código que editas son lo mismo. Y como el paquete está instalado de verdad, las pruebas de la lección 23 podrán importarlo como lo hará cualquiera.

## Ejecutar sin instalar con `python -m`

El `__main__.py` de la lección anterior sigue ahí, y con el paquete instalado también funciona:

```bash
python -m misgastos resumen
```

```salida
comida            55.80 €
ocio              18.00 €
transporte         2.40 €
```

Las dos formas hacen exactamente lo mismo. La diferencia práctica está en cuál de los dos Python se usa: `misgastos` a secas usa el intérprete que quedó escrito en la primera línea del ejecutable, mientras que `python -m misgastos` usa el `python` que tengas activo ahora mismo. Cuando algo se comporta de forma rara con varios entornos por medio, comparar las dos es una buena manera de averiguar qué está pasando.

## Los errores típicos del `pyproject.toml`

Cuatro fallos que vas a cometer, con su mensaje real.

> [!error] Invalid script entry point: A callable suffix is required
>
> El texto completo:
>
> ```salida
> ERROR: For req: misgastos==0.1.0. Invalid script entry point:
> <ExportEntry misgastos = misgastos.cli:None []> - A callable suffix is required.
> ```
>
> Te has dejado los dos puntos y la función en el punto de entrada. Habías escrito esto:
>
> ```text
> [project.scripts]
> misgastos = "misgastos.cli"
> ```
>
> Un punto de entrada tiene que decir qué función llamar, no solo en qué módulo está:
>
> ```text
> [project.scripts]
> misgastos = "misgastos.cli:main"
> ```

> [!error] configuration error: `project` must contain \['version'\] properties
>
> El texto completo, al final de un traceback largo:
>
> ```salida
>       ValueError: invalid pyproject.toml config: `project`.
>       configuration error: `project` must contain ['version'] properties
>       [end of output]
>
>   note: This error originates from a subprocess, and is likely not a problem with pip.
> ERROR: Failed to build 'file:///Users/erwin/proyectos/misgastos' when getting requirements to build editable
> ```
>
> Falta un campo obligatorio de la tabla `[project]`, en este caso `version`. Los obligatorios son solo dos, `name` y `version`, así que el mensaje siempre se refiere a uno de los dos. Pasa al comentar una línea para probar algo y olvidarse de descomentarla.
>
> Fíjate también en la última línea del aviso: el fallo viene de un subproceso, no de `pip`. Es normal en todos los errores de construcción y significa que el mensaje útil está más arriba, no abajo.

> [!error] ImportError: cannot import name 'principal' from 'misgastos.cli'
>
> Este no aparece al instalar, sino al ejecutar el comando, y por eso despista:
>
> ```salida
> Traceback (most recent call last):
>   File "/Users/erwin/proyectos/misgastos/.venv/bin/misgastos", line 3, in <module>
>     from misgastos.cli import principal
> ImportError: cannot import name 'principal' from 'misgastos.cli'
> ```
>
> El punto de entrada apunta a una función que no existe: la has renombrado en el código, o te la has inventado al escribir el `pyproject.toml`. La instalación no lo comprueba, porque en ese momento el paquete todavía no se puede importar. El fallo espera hasta la primera ejecución.
>
> Mira la ruta del traceback: apunta al ejecutable generado, no a tu código. Eso ya te dice que el problema está en el punto de entrada.

> [!error] Multiple top-level packages discovered in a flat-layout
>
> Ya lo viste en la lección anterior. La herramienta ha encontrado varias carpetas importables en la raíz y no sabe cuál es tu paquete. La solución recomendada por el propio mensaje es mover el paquete a `src/`.

> [!aviso] El comando se llama igual pero ejecuta otra cosa
>
> Si tienes el mismo proyecto instalado en dos entornos, o instalado a la vez en un entorno y con `pipx`, la terminal ejecutará el primero que encuentre en el `PATH`, que no tiene por qué ser el que tú crees. Cuando el comportamiento no cuadre con el código que estás viendo, ejecuta `which misgastos` (o `where misgastos` en Windows) y comprueba de dónde sale el ejecutable antes de seguir buscando.

> [!resumen] En resumen
>
> Un comando instalable sale de un `pyproject.toml` con tres tablas. `[build-system]` dice qué herramienta construye el paquete y son tres líneas que se copian tal cual. `[project]` describe el proyecto: `name` y `version` son obligatorios, y alrededor van `description`, `readme`, `requires-python`, `license`, `authors` y la lista `dependencies` con las bibliotecas que hacen falta para ejecutarlo, declaradas con restricciones amplias. `[project.scripts]` crea el comando con la sintaxis `nombre = "paquete.modulo:funcion"`, donde la función no recibe argumentos y lo que devuelve es el código de salida. Con `pip install -e .` dentro del entorno virtual, el proyecto queda instalado como un apuntador a tu carpeta: los cambios en el código se ven al instante, pero cualquier cambio en el `pyproject.toml` exige reinstalar. Y `python -m paquete` sigue funcionando en paralelo gracias al `__main__.py`.

> [!ejercicio] Practica
>
> Sigue con la herramienta `misnotas` de la lección anterior.
>
> 1. Escribe su `pyproject.toml` completo, con las tres tablas y todos los campos que has visto. Crea el comando `misnotas`.
> 2. Con el entorno virtual activado, ejecuta `pip install -e .` y comprueba con `which misnotas` y `misnotas --help` que el comando existe y responde.
> 3. Abre el ejecutable que se ha creado en `.venv/bin/` (o `.venv\Scripts\` en Windows) y lee sus cinco líneas. Localiza el nombre de tu función dentro.
> 4. Cambia un mensaje de `cli.py` y vuelve a ejecutar el comando sin reinstalar. Después cambia la versión en el `pyproject.toml` y comprueba con `pip show misnotas` que no cambia hasta que reinstalas.
> 5. Rompe el punto de entrada a propósito de las tres maneras de la lección (sin los dos puntos, apuntando a una función inexistente y borrando `version`) y anota en qué momento aparece cada error: al instalar o al ejecutar.
> 6. Añade un segundo comando en `[project.scripts]`, por ejemplo `misnotas-buscar`, que apunte a otra función tuya sin argumentos. Reinstala y comprueba que los dos comandos conviven.
