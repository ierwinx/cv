---
titulo: "Distribuir tu herramienta"
resumen: "Cómo llega tu programa al ordenador de otra persona: instalación desde git, pipx, construcción de paquetes y publicación en PyPI."
minutos: 22
orden: 22
---

Tu herramienta se instala con `pip install -e .` y funciona. Pero esa orden solo la puedes ejecutar tú, porque necesita la carpeta del proyecto delante. Para que la use otra persona hay que responder a una pregunta nueva: cómo consigue esa persona el código y qué escribe para tenerlo funcionando.

Hay tres respuestas, de menos a más formal: le pasas la carpeta, le pasas la dirección del repositorio o lo publicas en el índice público de paquetes. Las tres usan las mismas herramientas y el mismo `pyproject.toml` que ya tienes.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás instalar desde una carpeta o desde un repositorio de git, usar `pipx` para las herramientas de línea de comandos, construir los ficheros distribuibles con `python -m build` y recorrer la publicación en PyPI con `twine`.

## Instalar desde una carpeta

Es lo mismo que hiciste en la lección anterior, pero sin la `-e`:

```bash
pip install /Users/erwin/proyectos/misgastos
```

Sin `-e`, `pip` construye el paquete y **copia** el resultado dentro del entorno. A partir de ese momento las dos cosas son independientes: puedes borrar la carpeta del proyecto y el comando seguirá funcionando.

```bash
misgastos resumen
```

```salida
comida            55.80 €
ocio              18.00 €
transporte         2.40 €
```

Esta es la forma de probar que tu proyecto se instala de verdad, y conviene hacerlo en un entorno virtual limpio antes de dárselo a nadie. Si te has dejado un módulo fuera del paquete o el punto de entrada está mal, aquí se ve; con la instalación editable, no.

## Instalar desde un repositorio de git

`pip` sabe clonar. Le das la dirección del repositorio con el prefijo `git+` y él se encarga:

```bash
pip install git+https://github.com/erwin/misgastos.git
```

```salida
Building wheels for collected packages: misgastos
  Building wheel for misgastos (pyproject.toml): started
  Building wheel for misgastos (pyproject.toml): finished with status 'done'
  Created wheel for misgastos: filename=misgastos-0.1.0-py3-none-any.whl size=5132
Successfully built misgastos
Installing collected packages: misgastos
Successfully installed misgastos-0.1.0
```

Clona en una carpeta temporal, encuentra el `pyproject.toml`, construye el paquete, lo instala y borra la copia. Quien lo ejecute no necesita saber nada de tu proyecto más allá de la dirección.

Se puede pedir una rama, una etiqueta o un commit concreto añadiendo `@` al final:

```bash
pip install git+https://github.com/erwin/misgastos.git@v0.2.0
pip install git+https://github.com/erwin/misgastos.git@desarrollo
```

Esta es la forma habitual de compartir algo que todavía no está publicado, o que nunca lo estará porque solo lo usáis en tu equipo.

> [!nota] Funciona con cualquier repositorio accesible
>
> No tiene que ser GitHub. Vale cualquier servidor de git al que tengas acceso, incluido uno de tu empresa, y también una ruta local con `git+file:///ruta/al/repositorio`. Si el repositorio es privado, `pip` usará las credenciales que ya tenga configuradas tu git.

## `pipx`: la forma correcta de instalar herramientas

Aquí hay un problema que todavía no hemos mirado de frente. Una herramienta de línea de comandos no es una biblioteca: no la vas a importar desde tus programas, la vas a **ejecutar**. Y quieres ejecutarla desde cualquier carpeta, sin acordarte de activar ningún entorno.

La tentación es instalarla en el Python del sistema:

```bash
pip install --user misgastos
```

Y ahí empiezan los problemas que ya conoces de la lección de entornos virtuales, multiplicados. Si `misgastos` necesita `rich>=13` y otra herramienta que instalaste el año pasado necesita `rich<13`, una de las dos se rompe. Cada herramienta que instalas así ensucia un poco más un entorno compartido que nadie controla, y tarde o temprano una actualización deja algo inservible.

`pipx` resuelve esto con una idea muy simple: **crea un entorno virtual por herramienta y deja solo el comando a la vista**. Cada programa tiene sus dependencias aisladas, y tú escribes su nombre desde cualquier sitio sin activar nada.

### Instalar pipx

```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
```

`ensurepath` añade a tu `PATH` la carpeta donde `pipx` deja los comandos. Hay que abrir una terminal nueva para que el cambio surta efecto. En macOS con Homebrew, `brew install pipx` hace las dos cosas.

```bash
pipx --version
```

```salida
1.17.4
```

### Instalar una herramienta

Admite lo mismo que `pip`: un nombre del índice público, una carpeta o una dirección de git con `git+`. Como `misgastos` todavía no está publicado, se instala desde su carpeta:

```bash
pipx install /Users/erwin/proyectos/misgastos
```

```salida
creating virtual environment...
determining package name from '/Users/erwin/proyectos/misgastos'...
creating virtual environment...
installing misgastos from spec '/Users/erwin/proyectos/misgastos'...
done! ✨ 🌟 ✨
  installed package misgastos 0.1.0, installed using Python 3.14.7
  These apps are now available
    - misgastos
```

```bash
misgastos resumen
```

```salida
comida            55.80 €
ocio              18.00 €
transporte         2.40 €
```

Y ahí está lo importante: eso funciona con cualquier entorno virtual activado y sin ninguno.

### Las órdenes de pipx

| Orden | Qué hace |
| --- | --- |
| `pipx install NOMBRE` | Instala la herramienta en su propio entorno |
| `pipx list` | Enseña lo instalado y qué comandos expone cada cosa |
| `pipx list --short` | Lo mismo, una línea por herramienta |
| `pipx upgrade NOMBRE` | Actualiza una |
| `pipx upgrade-all` | Actualiza todas |
| `pipx uninstall NOMBRE` | La borra con su entorno |
| `pipx reinstall-all` | Rehace todos los entornos, útil al cambiar de versión de Python |
| `pipx run NOMBRE` | La ejecuta sin instalarla, descargándola a un caché temporal |
| `pipx runpip NOMBRE pip ...` | Ejecuta `pip` dentro del entorno de esa herramienta |

Ver lo que hay instalado:

```bash
pipx list
```

```salida
venvs are in /Users/erwin/.local/share/pipx/venvs
apps are exposed on your $PATH at /Users/erwin/.local/bin
manual pages are exposed at /Users/erwin/.local/share/man
shell completions are exposed at /Users/erwin/.local/share
   package misgastos 0.1.0, installed using Python 3.14.7
    - misgastos
```

Actualizar, después de subir la versión a `0.2.0` en el `pyproject.toml` y en el `__init__.py`:

```bash
pipx upgrade misgastos
```

```salida
upgrading shared libraries...
upgrading misgastos from spec '/Users/erwin/proyectos/misgastos'...
upgraded package misgastos from 0.1.0 to 0.2.0 (location:
/Users/erwin/.local/share/pipx/venvs/misgastos)
```

Mirar qué hay dentro del entorno de una herramienta, sin activarlo:

```bash
pipx runpip misgastos list
```

```salida
Package   Version
--------- -------
misgastos 0.2.0
pip       26.2.1
```

Y desinstalar, que se lleva por delante el entorno entero:

```bash
pipx uninstall misgastos
```

```salida
uninstalled misgastos! ✨ 🌟 ✨
```

> [!consejo] `pipx run` para lo que usas una vez al año
>
> Hay herramientas que solo necesitas de uvas a peras. Con `pipx run` se descargan a un caché, se ejecutan y no dejan nada instalado: `pipx run cowsay hola`. Es el equivalente al `npx` de Node para quien venga de ahí, y evita acumular comandos que no vuelves a usar.

> [!aviso] `pipx` es para herramientas, no para bibliotecas
>
> Si lo que instalas es algo que vas a **importar** desde tu código, como `requests` o `pandas`, `pipx` no sirve: quedaría en un entorno aislado al que tu programa no tiene acceso. Esas van con `pip install` dentro del entorno virtual del proyecto, como siempre. La regla: si el paquete trae un comando que escribes en la terminal, `pipx`; si trae módulos que importas, `pip` en tu entorno.

## Construir los paquetes distribuibles

Hasta ahora la instalación partía de tu carpeta o de un repositorio, y el paquete se construía sobre la marcha en el ordenador de destino. Para publicar hay que construirlo antes y subir el resultado.

La herramienta se llama `build` y se instala en el entorno virtual:

```bash
pip install build
```

Desde la raíz del proyecto:

```bash
python -m build
```

Tarda unos segundos y termina así:

```salida
Successfully built misgastos-0.1.0.tar.gz and misgastos-0.1.0-py3-none-any.whl
```

En una carpeta `dist/` nueva han aparecido dos ficheros:

```bash
ls -l dist
```

```salida
-rw-r--r--  1 erwin  staff  5132 19 sep 14:20 misgastos-0.1.0-py3-none-any.whl
-rw-r--r--  1 erwin  staff  5526 19 sep 14:20 misgastos-0.1.0.tar.gz
```

Son las dos formas en que viaja un paquete Python, y conviene entender en qué se diferencian.

### El `.whl`, la rueda

Es un fichero ZIP con el paquete **ya construido**, listo para copiar. Instalarlo es descomprimirlo en el sitio correcto y escribir los ejecutables: no se ejecuta código tuyo, no se compila nada y tarda un instante.

```bash
unzip -l dist/misgastos-0.1.0-py3-none-any.whl
```

```salida
Archive:  dist/misgastos-0.1.0-py3-none-any.whl
  Length      Date    Time    Name
---------  ---------- -----   ----
       89  09-19-2026 20:17   misgastos/__init__.py
      121  09-19-2026 20:18   misgastos/__main__.py
      836  09-19-2026 20:17   misgastos/almacen.py
     3116  09-19-2026 20:18   misgastos/cli.py
     1663  09-19-2026 20:17   misgastos/modelo.py
      185  09-19-2026 20:20   misgastos-0.1.0.dist-info/licenses/LICENSE
      571  09-19-2026 20:20   misgastos-0.1.0.dist-info/METADATA
       91  09-19-2026 20:20   misgastos-0.1.0.dist-info/WHEEL
       49  09-19-2026 20:20   misgastos-0.1.0.dist-info/entry_points.txt
       10  09-19-2026 20:20   misgastos-0.1.0.dist-info/top_level.txt
      878  09-19-2026 20:20   misgastos-0.1.0.dist-info/RECORD
---------                     -------
     7609                     11 files
```

Fíjate en dos cosas. La primera: la carpeta `src/` ha desaparecido. Dentro de la rueda el paquete está en la raíz, porque `src/` solo servía para organizar el proyecto, no para instalarlo. La segunda: ahí está el punto de entrada que escribiste, convertido en un fichero de texto:

```bash
unzip -p dist/misgastos-0.1.0-py3-none-any.whl misgastos-0.1.0.dist-info/entry_points.txt
```

```salida
[console_scripts]
misgastos = misgastos.cli:main
```

El nombre del fichero también dice cosas: `misgastos-0.1.0-py3-none-any.whl` significa nombre, versión, cualquier Python 3, ninguna ABI concreta y cualquier sistema operativo. Un paquete con código en C tendría ahí algo como `cp313-cp313-macosx_11_0_arm64`, y habría una rueda distinta por cada combinación.

### El `.tar.gz`, la distribución de fuentes

Es un comprimido con el proyecto **tal como lo escribiste**, incluidas las cosas que no se instalan:

```bash
tar tzf dist/misgastos-0.1.0.tar.gz
```

```salida
misgastos-0.1.0/
misgastos-0.1.0/LICENSE
misgastos-0.1.0/PKG-INFO
misgastos-0.1.0/README.md
misgastos-0.1.0/pyproject.toml
misgastos-0.1.0/setup.cfg
misgastos-0.1.0/src/
misgastos-0.1.0/src/misgastos/
misgastos-0.1.0/src/misgastos/__init__.py
misgastos-0.1.0/src/misgastos/__main__.py
misgastos-0.1.0/src/misgastos/almacen.py
misgastos-0.1.0/src/misgastos/cli.py
misgastos-0.1.0/src/misgastos/modelo.py
misgastos-0.1.0/tests/
misgastos-0.1.0/tests/test_almacen.py
misgastos-0.1.0/tests/test_cli.py
misgastos-0.1.0/tests/test_modelo.py
```

Aquí sí está `src/`, está el `pyproject.toml` y están las pruebas. Para instalarlo hay que construirlo primero, así que es más lento.

|  | `.whl` | `.tar.gz` |
| --- | --- | --- |
| Qué contiene | El paquete construido | El proyecto entero |
| Al instalar | Se descomprime y ya | Hay que construirlo antes |
| Velocidad | Inmediata | Segundos o minutos |
| Lleva `src/`, pruebas y configuración | No | Sí |
| Sirve para compilar en otra plataforma | No | Sí |

Se publican los dos. `pip` usará la rueda siempre que pueda, y recurrirá al `.tar.gz` cuando no haya una rueda compatible con ese sistema. Y `python -m build` los genera a la vez precisamente porque lo normal es subir ambos.

> [!nota] `dist/` y `build/` no se suben a git
>
> Son resultados, no fuentes, y se regeneran con una orden. Por eso están en el `.gitignore` de la lección 20. Además, dejar ruedas antiguas en `dist/` es una fuente de accidentes: `twine upload dist/*` subiría también las versiones viejas que se quedaron ahí. Borra la carpeta antes de construir.

## Publicar en PyPI

PyPI es el índice público de paquetes de Python: el sitio del que descarga `pip install` cuando le das un nombre a secas. Publicar ahí significa que cualquiera en el mundo puede instalar tu herramienta escribiendo su nombre.

La herramienta para subir se llama `twine`:

```bash
pip install twine
```

### Antes de subir: comprobar

`twine` sabe revisar los ficheros construidos y avisar de los problemas que rechazaría el índice, sobre todo un `README.md` que no se renderiza bien:

```bash
twine check dist/*
```

```salida
Checking dist/misgastos-0.1.0-py3-none-any.whl: PASSED
Checking dist/misgastos-0.1.0.tar.gz: PASSED
```

### TestPyPI: el índice de pruebas

Hay una copia completa de PyPI para practicar, con su propio registro de usuarios y sus propios nombres de paquete. Se llama TestPyPI y sirve exactamente para lo que suena: equivocarse sin consecuencias.

```bash
twine upload --repository testpypi dist/*
```

Te pedirá credenciales, que se obtienen creando una cuenta en `test.pypi.org` y generando allí un *token*. Una vez subido, se puede probar la instalación de verdad apuntando `pip` a ese índice:

```bash
pipx install --index-url https://test.pypi.org/simple/ misgastos
```

Hazlo al menos una vez antes de tu primera publicación real. Es la única manera de ver el aspecto que tendrá la página de tu proyecto y de comprobar que la instalación desde un índice funciona.

### El índice de verdad

```bash
twine upload dist/*
```

Y con eso, cualquiera puede hacer:

```bash
pipx install misgastos
```

> [!aviso] Una versión publicada no se puede reemplazar
>
> PyPI no deja subir dos veces la misma versión, ni siquiera borrando la anterior: el número queda quemado para siempre. Es una decisión deliberada, porque si se pudiera cambiar el contenido de una versión ya publicada, nadie podría fiarse de que `misgastos==0.1.0` significa lo mismo hoy que ayer.
>
> Si publicas algo roto, la única salida es subir `0.1.1` con el arreglo. Por eso conviene pasar por TestPyPI y por eso existe la lista de comprobación del final de esta lección.

## Versionado semántico

El número de versión no es un contador. La convención que sigue casi todo el ecosistema se llama **versionado semántico** y tiene tres números separados por puntos:

```text
MAYOR.MENOR.PARCHE
```

Cada uno se sube por una razón distinta:

| Número | Cuándo sube | Ejemplo en `misgastos` |
| --- | --- | --- |
| **PARCHE** | Arreglas un fallo sin cambiar nada más | El total sumaba mal con la categoría vacía |
| **MENOR** | Añades algo nuevo sin romper lo anterior | Un subcomando `exportar` |
| **MAYOR** | Cambias algo que rompe el uso actual | `anadir` pasa a exigir la categoría |

Y la regla que lo ata todo: **al subir un número, los de su derecha se ponen a cero**. De la `1.4.7`, un arreglo lleva a la `1.4.8`, una función nueva a la `1.5.0` y un cambio incompatible a la `2.0.0`.

Lo que cuenta como "romper" es cualquier cosa que obligue a quien usa tu herramienta a cambiar lo que hacía: quitar un subcomando, renombrar una opción, cambiar el formato del fichero de datos o modificar un código de salida. Si alguien tenía un script que llamaba a tu comando y ese script deja de funcionar, es un cambio mayor.

> [!nota] El cero de la izquierda es una promesa de inestabilidad
>
> Mientras la versión mayor sea `0`, la convención dice que no garantizas nada: `0.2.0` puede romper cosas de `0.1.0` sin remordimiento. Publicar la `1.0.0` es declarar que la interfaz se queda quieta, y a partir de ahí los cambios incompatibles cuestan una versión mayor. No tengas prisa en llegar al uno.

## Lista de comprobación antes de publicar

Repásala entera cada vez. Ocupa cinco minutos y evita una versión quemada.

1. **Las pruebas pasan.** `pytest` en verde, que es lo de la lección siguiente.
2. **El número de versión está subido en los dos sitios**, `pyproject.toml` y `__init__.py`, y el salto es el que corresponde según el versionado semántico.
3. **El `README.md` está al día.** Es la portada pública: si documenta un subcomando que ya no existe, se nota enseguida.
4. **El `LICENSE` está en la raíz** y el campo `license` del `pyproject.toml` dice lo mismo.
5. **`dependencies` está completo.** Instala el proyecto en un entorno virtual recién creado y ejecútalo: si falta una biblioteca, ahí saltará el `ModuleNotFoundError`.
6. **`requires-python` es cierto.** No declares 3.9 si nunca lo has probado con 3.9.
7. **Borra `dist/` y reconstruye.** `rm -rf dist build` y después `python -m build`, para no subir restos de versiones anteriores.
8. **`twine check dist/*` pasa.**
9. **Prueba la instalación desde el fichero construido**, no desde la carpeta: `pip install dist/misgastos-0.1.0-py3-none-any.whl` en un entorno limpio, y ejecuta el comando.
10. **Sube primero a TestPyPI** si es tu primera vez o si has tocado el `pyproject.toml`.
11. **Pon una etiqueta en git** con la versión, `git tag v0.1.0`, para poder volver exactamente a lo que publicaste.

> [!error] ERROR: File already exists
>
> El mensaje al intentar subir una versión que ya está publicada. No hay forma de forzarlo: sube el número de `PARCHE`, reconstruye y vuelve a subir. Si te pasa en TestPyPI, recuerda que allí tampoco se puede repetir versión, así que lo habitual es ir gastando números sin miedo porque ese índice no lo mira nadie.

> [!error] ModuleNotFoundError al instalar desde el `.whl`
>
> Si el comando funciona con `pip install -e .` pero falla al instalarlo desde la rueda, casi siempre es que un módulo se quedó fuera del paquete. Abre el `.whl` con `unzip -l` y comprueba que están todos tus ficheros. Con la disposición `src/` esto es raro; con la disposición plana es el pan de cada día, porque la herramienta de construcción tiene que adivinar qué carpetas son tuyas.

> [!resumen] En resumen
>
> Hay tres maneras de que tu herramienta llegue a otra persona. La directa es `pip install` apuntando a una carpeta o a un repositorio con `git+https://...`, que sirve para compartir algo sin publicarlo. La correcta para una herramienta de línea de comandos es `pipx`, que le da a cada programa su propio entorno virtual y deja solo el comando en el `PATH`, de modo que dos herramientas con dependencias incompatibles pueden convivir; `pipx` se usa para lo que se ejecuta y `pip` para lo que se importa. Para publicar se construye con `python -m build`, que genera un `.whl` con el paquete listo para copiar y un `.tar.gz` con el proyecto entero, y se sube con `twine`, practicando antes en TestPyPI porque una versión publicada no se puede reemplazar nunca. El número de versión sigue el esquema mayor, menor y parche, que sube según arregles, añadas o rompas, y antes de publicar se repasa una lista que empieza por las pruebas en verde y termina por probar la instalación desde el fichero construido en un entorno limpio.

> [!ejercicio] Practica
>
> Sigue con `misnotas`. Necesitarás `build`, `twine` y `pipx` instalados.
>
> 1. Crea un entorno virtual nuevo en otra carpeta e instala `misnotas` desde su ruta con `pip install /ruta/al/proyecto`, sin la `-e`. Comprueba que el comando funciona y después borra la carpeta original para verificar que sigue funcionando.
> 2. Convierte tu proyecto en un repositorio de git con un commit, e instálalo en otro entorno con `pip install git+file:///ruta/al/proyecto`. Lee la salida y localiza el momento en que construye la rueda.
> 3. Instálalo con `pipx`, desactiva todos los entornos virtuales y comprueba que el comando responde igual. Ejecuta `pipx list` y localiza dónde ha dejado el entorno.
> 4. Construye los distribuibles con `python -m build`. Abre el `.whl` con `unzip -l` y el `.tar.gz` con `tar tzf`, y anota tres diferencias entre lo que hay dentro de cada uno.
> 5. Extrae el `entry_points.txt` de la rueda y comprueba que coincide con lo que escribiste en `[project.scripts]`.
> 6. Ejecuta `twine check dist/*`. Después rompe el `README.md` a propósito, reconstruye y vuelve a comprobar para ver qué avisa.
> 7. Sube la versión a `0.2.0` en los dos sitios, reconstruye y recorre la lista de comprobación entera anotando en qué punto te habrías dado cuenta de un error si no la hubieras seguido.
