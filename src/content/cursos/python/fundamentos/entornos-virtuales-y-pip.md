---
titulo: "Entornos virtuales y pip"
resumen: "Cómo aislar las bibliotecas de cada proyecto para que no se pisen entre ellas, y cómo instalarlas y anotarlas con pip."
minutos: 13
orden: 43
---

Imagina que tienes dos proyectos. Uno es una web que lleva dos años funcionando y necesita Django 4.2, porque con la versión nueva se rompe. El otro lo empiezas hoy y quieres Django 5.2. Si instalas las bibliotecas en el Python de tu sistema, solo puede haber una versión de Django instalada a la vez: cada vez que cambies de proyecto tendrás que desinstalar y reinstalar, y tarde o temprano uno de los dos dejará de arrancar.

La solución es no instalar nada en el Python del sistema. En su lugar, cada proyecto tiene su propia copia privada de Python con sus propias bibliotecas dentro de una carpeta. Eso es un **entorno virtual**, y hoy es la forma normal de trabajar en Python: un proyecto, un entorno.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás crear un entorno virtual, activarlo en tu sistema, instalar bibliotecas dentro, guardar la lista en `requirements.txt` y recuperarla en otro ordenador.

## Crear el entorno

Colócate en la carpeta del proyecto y ejecuta:

```bash
python3 -m venv .venv
```

`venv` es un módulo de la biblioteca estándar, por eso se lanza con `-m`. El último argumento es el nombre de la carpeta que va a crear; `.venv` es el nombre que usa todo el mundo y el que reconocen los editores automáticamente.

Tarda unos segundos y deja una carpeta nueva:

```bash
ls -a .venv
```

```salida
.        ..        .gitignore    bin        include        lib        pyvenv.cfg
```

Dentro hay una copia del intérprete y una carpeta vacía donde se instalarán las bibliotecas. En Windows, en vez de `bin` verás `Scripts`.

> [!nota] Un entorno por proyecto, y desechable
>
> La carpeta `.venv` no contiene nada tuyo: ni tu código ni nada que no se pueda regenerar. Si un día se estropea, la borras entera y la vuelves a crear en diez segundos. Por eso no se copia, no se comparte y no se sube a ningún sitio.

## Activarlo

Crear el entorno no basta: hay que **activarlo** en cada terminal donde vayas a usarlo. El comando depende del sistema.

En Windows, con PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

En Windows, con `cmd`:

```bash
.venv\Scripts\activate.bat
```

En macOS y Linux:

```bash
source .venv/bin/activate
```

Sabrás que ha funcionado porque el prompt de la terminal cambia y aparece el nombre del entorno entre paréntesis delante:

```salida
(.venv) erwin@portatil curso-python %
```

Ese `(.venv)` es toda la señal que tienes. Si no está, el entorno no está activo y todo lo que instales irá a parar al Python del sistema.

Para salir, en cualquier sistema:

```bash
deactivate
```

> [!aviso] En PowerShell puede fallar por la política de ejecución
>
> Si al activar ves `No se puede cargar el archivo ... Activate.ps1 porque la ejecución de scripts está deshabilitada en este sistema`, Windows está bloqueando los scripts. Se arregla una sola vez, con esta orden en la misma ventana de PowerShell:
>
> ```bash
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```
>
> Después vuelve a activar el entorno.

## Instalar bibliotecas con pip

Con el entorno activo, `pip` instala lo que le pidas **dentro del entorno**, sin tocar nada del sistema:

```bash
pip install requests
```

```salida
Collecting requests
  Downloading requests-2.34.2-py3-none-any.whl.metadata (4.8 kB)
Collecting charset_normalizer<4,>=2 (from requests)
  Downloading charset_normalizer-3.5.1-cp314-cp314-macosx_10_15_universal2.whl.metadata (45 kB)
Collecting idna<4,>=2.5 (from requests)
  Downloading idna-3.20-py3-none-any.whl.metadata (7.2 kB)
Collecting urllib3<3,>=1.26 (from requests)
  Downloading urllib3-2.8.0-py3-none-any.whl.metadata (7.4 kB)
Collecting certifi>=2023.5.7 (from requests)
  Downloading certifi-2026.7.22-py3-none-any.whl.metadata (2.5 kB)
Installing collected packages: urllib3, idna, charset_normalizer, certifi, requests
Successfully installed certifi-2026.7.22 charset_normalizer-3.5.1 idna-3.20 requests-2.34.2 urllib3-2.8.0
```

Fíjate en que has pedido una biblioteca y se han instalado cinco. Las otras cuatro son **dependencias**: cosas que `requests` necesita por dentro. Es normal y no tienes que hacer nada al respecto.

Las órdenes de `pip` que usarás a diario:

| Orden | Qué hace |
| --- | --- |
| `pip install requests` | Instala la última versión |
| `pip install requests==2.31.0` | Instala una versión exacta |
| `pip install -U requests` | Actualiza a la última |
| `pip uninstall requests` | La desinstala |
| `pip list` | Lista lo instalado en el entorno |
| `pip show requests` | Detalles de una biblioteca |
| `pip freeze > requirements.txt` | Guarda la lista en un fichero |
| `pip install -r requirements.txt` | Instala todo lo del fichero |

Para ver qué hay dentro del entorno:

```bash
pip list
```

```salida
Package            Version
------------------ ---------
certifi            2026.7.22
charset-normalizer 3.5.1
idna               3.20
pip                26.2.1
requests           2.34.2
urllib3            2.8.0
```

> [!consejo] Usa python -m pip cuando dudes
>
> Si tienes varios Python instalados, el comando `pip` a secas puede no ser el del entorno que crees. `python -m pip install requests` usa siempre el `pip` del mismo intérprete que ejecuta `python`, y eso elimina la duda. En macOS y Linux, `python3 -m pip`.

## Congelar y restaurar: requirements.txt

Tu proyecto no viaja con la carpeta `.venv`, pero sí tiene que viajar con **la lista de lo que hay que instalar**. Esa lista se genera con `pip freeze`:

```bash
pip freeze > requirements.txt
```

El fichero que sale es texto plano, una biblioteca por línea con su versión exacta:

```text title="requirements.txt"
certifi==2026.7.22
charset-normalizer==3.5.1
idna==3.20
requests==2.34.2
urllib3==2.8.0
```

Ese fichero **sí** se sube al repositorio, porque es la receta. Cuando alguien clone tu proyecto (o cuando lo hagas tú en otro ordenador), solo tiene que crear su entorno e instalar la receta:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

```salida
Installing collected packages: urllib3, idna, charset-normalizer, certifi, requests
Successfully installed certifi-2026.7.22 charset-normalizer-3.5.1 idna-3.20 requests-2.34.2 urllib3-2.8.0
```

Y tendrá exactamente las mismas versiones que tú. Se acabó el "en mi ordenador funciona".

> [!nota] Las versiones fijadas no son manía
>
> `pip freeze` escribe `==` con la versión exacta a propósito. Una actualización menor de una biblioteca puede cambiar un comportamiento del que dependía tu código, y si el fichero dijera solo `requests` cada instalación traería algo distinto. Fijar versiones hace que el proyecto sea reproducible; actualizarlas es una decisión consciente que tomas tú, no algo que pasa solo.

## Seleccionar el intérprete en Visual Studio Code

El editor necesita saber qué Python estás usando. Si no se lo dices, te subrayará en amarillo los `import` de todo lo que hayas instalado en el entorno, porque estará mirando el Python del sistema.

1. Abre la carpeta del proyecto en Visual Studio Code, no un fichero suelto.
2. Pulsa <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (en macOS, <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>).
3. Escribe `Python: Select Interpreter` y pulsa <kbd>Intro</kbd>.
4. En la lista, elige el que lleve `.venv` en la ruta. Suele aparecer marcado como **Recommended**.

Abajo a la derecha, en la barra de estado, verás la versión y el entorno seleccionados. Desde ese momento, cada terminal que abras dentro del editor se activará sola.

## El entorno y git

La carpeta `.venv` no se sube al repositorio nunca. Pesa cientos de megas, contiene rutas absolutas de tu ordenador y no sirve en una máquina distinta. Añade esta línea a tu `.gitignore`:

```text title=".gitignore"
.venv/
```

De hecho, `python3 -m venv` crea un `.gitignore` dentro de la propia carpeta `.venv` para protegerte del descuido. Aun así, pon la línea también en el `.gitignore` del proyecto: es lo que espera ver cualquiera que mire tu código.

Lo que sí se sube es `requirements.txt`. Regla sencilla: **se sube la receta, no el pastel**.

## Los dos errores de siempre

> [!error] He instalado la biblioteca pero sigue sin encontrarla
>
> Casi siempre es que instalaste con el entorno desactivado, así que la biblioteca está en el Python del sistema y el programa se ejecuta con el del entorno (o al revés). Comprueba dos cosas: que el prompt muestra `(.venv)` y que `pip list` enseña lo que esperas. Si no aparece, actívalo y vuelve a instalar.

> [!error] ModuleNotFoundError: No module named 'requests'
>
> El intérprete que está ejecutando el programa no tiene esa biblioteca. Tres causas, por orden de frecuencia: el entorno no está activado en esa terminal, el editor tiene seleccionado otro intérprete, o sencillamente no la has instalado todavía. Para saber qué Python está corriendo de verdad, añade al principio del programa `import sys` y `print(sys.prefix)`: si la ruta que sale no acaba en `.venv`, ya tienes la respuesta.

> [!aviso] No crees el entorno dentro de otro entorno
>
> Si al ejecutar `python3 -m venv .venv` ya tenías otro entorno activo, el nuevo heredará configuración rara y acabarás con dos `(.venv)` en el prompt. Antes de crear un entorno, escribe `deactivate` para asegurarte de que partes de cero.

> [!resumen] En resumen
>
> Un entorno virtual es una copia privada de Python para un solo proyecto, y evita que dos proyectos se peleen por la versión de una misma biblioteca. Se crea con `python3 -m venv .venv`, se activa con `source .venv/bin/activate` en macOS y Linux o con `.venv\Scripts\Activate.ps1` en Windows, y sabes que está activo porque el prompt muestra `(.venv)`. Con él activo, `pip install` instala dentro, `pip list` enseña lo que hay, `pip freeze > requirements.txt` guarda la receta y `pip install -r requirements.txt` la restaura. La carpeta `.venv` no se sube a git; `requirements.txt` sí. Y cuando algo dé `ModuleNotFoundError`, lo primero que hay que mirar es si el entorno está activado.

> [!ejercicio] Practica
>
> Todo este ejercicio es de terminal. Anota en un fichero `43-notas.txt` lo que vas observando.
>
> 1. Crea una carpeta `pruebas-entorno`, entra en ella y crea dentro un entorno virtual llamado `.venv`.
> 2. Actívalo y comprueba que el prompt cambia. Ejecuta `pip list` y anota qué hay recién creado el entorno.
> 3. Instala la biblioteca `rich` y vuelve a ejecutar `pip list`. ¿Cuántas bibliotecas hay ahora y por qué son más de una?
> 4. Genera `requirements.txt` con `pip freeze` y ábrelo con el editor para ver su contenido.
> 5. Desactiva el entorno con `deactivate` y ejecuta `python3 -c "import rich"`. Lee el error y explica por escrito por qué ocurre.
> 6. Borra la carpeta `.venv` entera, créala de nuevo, actívala y restaura todo con `pip install -r requirements.txt`. Comprueba con `pip list` que has vuelto al mismo punto.
