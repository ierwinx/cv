---
titulo: "Instalación: el entorno virtual y el primer proyecto"
resumen: "La primera dependencia del curso, por qué no se instala a lo bruto, y las dos órdenes que crean un proyecto de Django."
minutos: 15
orden: 3
---

Hasta aquí, todo el curso se ha ejecutado con lo que trae Python de fábrica. Ciento cuarenta y seis lecciones sin instalar nada es una rareza que ha merecido la pena, porque los ejemplos funcionan en cualquier máquina y porque obliga a conocer bien la biblioteca estándar. Se acabó: Django no viene con Python y hay que instalarlo.

La lección 30 del módulo 1 ya explicó qué es un entorno virtual y la 22 del módulo 2 lo usó para empaquetar una herramienta. Aquí se repasa lo justo y se va al grano, porque lo que de verdad da problemas no es crear el entorno, es olvidarse de activarlo.

> [!objetivo] Qué vas a aprender
>
> Crear un entorno virtual en Windows, macOS o Linux e instalar Django dentro, saber diagnosticar los dos fallos que produce trabajar con el entorno sin activar, crear el proyecto con `django-admin startproject` entendiendo el punto del final, y dejar anotadas las dependencias en un `requirements.txt`.

## Por qué un entorno virtual y no `pip install django` a secas

Instalar Django en el Python del sistema funciona el primer día y estorba a partir del segundo, por tres motivos concretos:

- **Un proyecto no usa la última versión de todo, usa una.** Cuando tengas dos proyectos, uno de hace dos años con Django 5.2 y el nuevo con 6.1, no caben los dos en la misma instalación. Y el de hace dos años no se actualiza porque sí, se actualiza cuando hay tiempo.
- **Nadie sabe qué necesita tu proyecto.** Con todo instalado en el mismo sitio, tu proyecto funciona porque en esa máquina está lo que hace falta, mezclado con veinte cosas de otros proyectos. El día que hay que ponerlo en un servidor, no hay forma de saber qué había que copiar.
- **En macOS y en Linux hay un Python que es del sistema operativo.** Lo usan utilidades del propio sistema, y tocarlo con `pip` puede romperlas. Las distribuciones modernas y Homebrew directamente te lo impiden, con un error que dice `externally-managed-environment`.

Un entorno virtual es una carpeta con su propio Python y sus propios paquetes. No es magia ni es una máquina virtual: son unos enlaces y una variable de entorno.

## Crear el entorno

Colócate donde vayas a tener el proyecto y crea una carpeta para él:

```bash
mkdir agenda
cd agenda
```

La orden que crea el entorno es la misma en los tres sistemas:

```bash
python3 -m venv .venv
```

En Windows, casi siempre `python` en lugar de `python3`:

```bash
python -m venv .venv
```

El nombre `.venv` es una convención muy extendida. Empieza por punto, así que no estorba al listar, y los editores lo reconocen solos: tanto VS Code como PyCharm detectan una carpeta `.venv` dentro del proyecto y la usan sin que les digas nada.

Activarlo sí cambia según el sistema:

| Sistema y terminal | Orden |
| --- | --- |
| macOS y Linux | `source .venv/bin/activate` |
| Windows, PowerShell | `.venv\Scripts\Activate.ps1` |
| Windows, `cmd.exe` | `.venv\Scripts\activate.bat` |
| Git Bash en Windows | `source .venv/Scripts/activate` |

Sabrás que ha funcionado porque el prompt cambia y aparece `(.venv)` delante. Para salir, `deactivate`, en todos los sistemas.

> [!error] `no se puede cargar el archivo ... Activate.ps1`
>
> En Windows con PowerShell, la primera activación suele fallar con un mensaje sobre la ejecución de scripts deshabilitada. No es cosa de Python: PowerShell viene configurado para no ejecutar guiones. Se arregla una vez, para tu usuario:
>
> ```bash
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
>
> Eso permite ejecutar los guiones que has creado tú en tu máquina y sigue bloqueando los descargados sin firmar.

## Instalar Django

Con el entorno activado:

```bash
pip install django
```

Para el curso conviene fijar la versión, y así te sale exactamente lo mismo que aquí:

```bash
pip install "django==6.1.1"
```

```salida
Installing collected packages: sqlparse, asgiref, django
Successfully installed asgiref-3.12.1 django-6.1.1 sqlparse-0.6.0
```

Han entrado tres paquetes y tú pediste uno. `asgiref` y `sqlparse` son **dependencias** de Django: cosas que Django necesita y que `pip` ha traído por su cuenta. La primera se ocupa de la parte asíncrona y la segunda da formato al SQL que verás en la lección de migraciones. No hay que saber nada más de ellas, pero conviene no asustarse al verlas.

```bash
pip list
```

```salida
Package  Version
-------- -------
asgiref  3.12.1
Django   6.1.1
pip      26.2.1
sqlparse 0.6.0
```

Cuatro paquetes y nada más. Eso es lo que da un entorno virtual: saber exactamente lo que hay.

> [!nota] Qué versión usar si no sigues el curso al pie de la letra
>
> Django saca versión cada ocho meses y algunas se marcan como LTS, con parches de seguridad durante unos tres años. Si vas a empezar un proyecto de verdad y quieres tocarlo lo menos posible, coge la LTS. Si vas a mantenerlo, coge la última.
>
> Ten en cuenta la versión de Python que pide cada una: **Django 6.x necesita Python 3.12 o superior**, mientras que la 5.2 funciona desde la 3.10. Si estás atado a un Python antiguo, eso decide por ti.

## Los dos fallos de no activar el entorno

Merece la pena provocarlos ahora, con calma, porque cuando aparezcan de verdad lo harán en mitad de otra cosa.

**El primero: `ImportError` al ejecutar `manage.py`.** Abre una terminal nueva, no actives nada y ejecuta cualquier orden del proyecto. Django está instalado, pero no en el Python que se está usando:

```salida
ImportError: Couldn't import Django. Are you sure it's installed and available on your
PYTHONPATH environment variable? Did you forget to activate a virtual environment?
```

Es de los pocos mensajes de error que te dicen la solución con todas las letras, y está en `manage.py`, escrito a mano por la gente de Django precisamente porque sabían que esto iba a pasar mucho. Actívalo y ya está.

**El segundo es peor, porque no da ningún error.** Si alguna vez instalaste Django fuera de un entorno virtual, la orden `django-admin` existe en el sistema. Sin activar el entorno:

```bash
which django-admin
```

```salida
/Users/erwin/Library/Python/3.14/bin/django-admin
```

Esa no es la del proyecto. Es otra instalación, probablemente de otra versión, y va a funcionar: creará el proyecto, arrancará el servidor y te dará errores incomprensibles el día que uses algo que en esa versión no existe. La comprobación que resuelve la duda en dos segundos:

```bash
which django-admin      # en Windows: where django-admin
python -c "import django; print(django.__file__)"
```

Si las dos rutas no pasan por tu carpeta `.venv`, el entorno no está activado.

> [!consejo] Salta la activación con la ruta completa
>
> La activación es cómoda pero se olvida. Para órdenes sueltas, para un guion o para un servicio, lo seguro es no depender de ella y llamar al Python del entorno por su ruta:
>
> ```bash
> .venv/bin/python manage.py runserver
> ```
>
> En Windows sería `.venv\Scripts\python manage.py runserver`. Esa forma no puede equivocarse de intérprete porque no consulta el `PATH`, y es la que conviene poner en cualquier automatización. Trabajando a mano en la terminal, activa y olvídate.

## Crear el proyecto

Con el entorno activado y Django dentro:

```bash
django-admin startproject agenda .
```

No imprime nada. Eso es buena señal.

**El punto del final importa mucho** y es la primera decisión de forma del módulo. Con el punto, Django crea el paquete de configuración dentro de la carpeta en la que estás. Sin el punto, crea una carpeta nueva llamada `agenda` y mete todo dentro, y como tú ya estabas en una carpeta llamada `agenda`, acabas con `agenda/agenda/agenda/`, tres niveles con el mismo nombre. Funciona, pero cada vez que abras un fichero tendrás que pensar en cuál de las tres estás.

Esto es lo que ha aparecido:

```text
agenda/
  .venv/            El entorno virtual, que ya estaba
  agenda/           La configuración del proyecto
    __init__.py
    settings.py     Los ajustes
    urls.py         Las direcciones
    asgi.py         Punto de entrada para servidores asíncronos
    wsgi.py         Punto de entrada para servidores clásicos
  manage.py         Por aquí se ejecuta todo
```

Cada fichero tiene su explicación en la lección siguiente, que es solo para eso. Lo que hace falta ahora es probar que funciona:

```bash
python manage.py runserver
```

Abre `http://127.0.0.1:8000/` y verás una página con un cohete despegando y el texto "The install worked successfully! Congratulations!". Se para con <kbd>Ctrl</kbd> + <kbd>C</kbd>.

> [!nota] `django-admin` y `manage.py` son casi lo mismo
>
> Te vas a encontrar las dos órdenes y la diferencia es pequeña: `manage.py` es `django-admin` **con los ajustes de tu proyecto ya puestos**. Mira las líneas que trae dentro:
>
> ```python
> os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agenda.settings')
> ```
>
> Eso es todo lo que añade. Por eso `startproject` se hace con `django-admin`, porque todavía no hay proyecto ni ajustes que cargar, y **todo lo demás se hace con `manage.py`**. Si lo ejecutas sin argumentos, cualquiera de los dos te lista las órdenes disponibles, que son unas treinta.

## Anotar lo que hace falta

Un entorno virtual no se comparte ni se sube a ningún sitio: pesa, y tiene rutas absolutas de tu máquina dentro. Lo que se comparte es la lista de lo que hay que instalar. Se genera sola:

```bash
pip freeze > requirements.txt
```

```text title="requirements.txt"
asgiref==3.12.1
Django==6.1.1
sqlparse==0.6.0
```

Con ese fichero, cualquiera —incluido tú mismo dentro de un año, o el servidor donde acabe el proyecto— reconstruye el entorno exacto:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Fíjate en que `pip freeze` lista también las dependencias de las dependencias, con la versión clavada. Es lo que se quiere: no se trata de decir "algo de Django", se trata de reproducir lo que funcionaba.

> [!consejo] El `.gitignore` desde el primer día
>
> Tres cosas no van nunca al control de versiones, y conviene decirlo antes de que existan:
>
> ```text title=".gitignore"
> .venv/
> __pycache__/
> *.pyc
> db.sqlite3
> ```
>
> El entorno virtual, porque se reconstruye desde `requirements.txt`. Los `.pyc`, porque los regenera Python. Y la base de datos, porque es tuya, con tus pruebas dentro, y en un servidor de verdad será otra. La lección de configuración por entornos añade a esta lista el fichero de secretos.

> [!resumen] En resumen
>
> Django es la primera dependencia del curso, y se instala dentro de un entorno virtual y no en el Python del sistema, porque cada proyecto necesita su versión, porque es la única forma de saber qué hace falta para ejecutarlo y porque en macOS y en Linux el Python del sistema es del sistema. Se crea con `python3 -m venv .venv` en cualquier sistema operativo y se activa de una manera distinta en cada uno, con `source .venv/bin/activate` en macOS y Linux y con un guion de la carpeta `Scripts` en Windows. Al instalar Django entran tres paquetes porque dos son dependencias suyas. Olvidarse de activar el entorno produce dos fallos: un `ImportError` que dice la solución con todas las letras, y uno peor y silencioso, que es acabar usando un `django-admin` de otra instalación; ante la duda, `which django-admin` y `python -c "import django; print(django.__file__)"` tienen que apuntar a tu `.venv`. El proyecto se crea con `django-admin startproject agenda .`, y el punto del final evita acabar con tres carpetas anidadas con el mismo nombre. A partir de ahí todo se hace con `manage.py`, que es `django-admin` con los ajustes del proyecto ya cargados. Y lo que se comparte nunca es el entorno, sino el `requirements.txt` que lo reconstruye.

> [!ejercicio] Practica
>
> 1. Crea la carpeta del proyecto, el entorno virtual e instala Django con la versión fijada. Comprueba con `pip list` que hay exactamente cuatro paquetes.
> 2. Con el entorno activado, ejecuta `which django-admin` (o `where` en Windows) y `python -c "import django; print(django.__file__)"`. Después haz `deactivate` y repítelos. Anota las diferencias.
> 3. Crea el proyecto **sin** el punto del final en una carpeta aparte y mira el árbol que sale. Compáralo con el que tienes y quédate con el bueno.
> 4. Arranca el servidor, visita la página del cohete y páralo con <kbd>Ctrl</kbd> + <kbd>C</kbd>. Después arráncalo con la ruta completa al Python del entorno, sin activar nada, y comprueba que funciona igual.
> 5. Genera el `requirements.txt` y el `.gitignore`. Luego borra la carpeta `.venv` entera, recréala desde el `requirements.txt` y comprueba que el servidor sigue arrancando.
> 6. Ejecuta `python manage.py` sin más y lee la lista de órdenes. Busca cuáles te suenan de lo que dice el índice del módulo y cuáles no tienes ni idea de qué hacen; volverás a esa lista varias veces.
