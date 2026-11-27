---
titulo: "Variables de entorno"
resumen: "Cómo configurar un programa desde fuera, sin tocar su código, y dónde guardar las claves que no pueden acabar en git."
minutos: 17
orden: 16
---

Tu herramienta funciona. Ahora hay que ponerla en un servidor, donde la base de datos está en otra dirección, el nivel de detalle del registro tiene que ser menor y hace falta una clave de acceso a un servicio externo. Con lo que sabes hasta ahora tienes dos salidas, y las dos son malas: editar el código para cada sitio donde se ejecute, o pasar la clave como argumento de la línea de comandos, donde queda guardada en el historial de la terminal y visible para cualquiera que liste los procesos de la máquina.

La solución que usa todo el mundo son las **variables de entorno**: una lista de pares nombre-valor que el sistema operativo le entrega a cada programa cuando arranca. El mismo código, sin tocar una línea, se comporta distinto según lo que encuentre ahí.

## Qué son exactamente

Cada proceso hereda del que lo lanzó un diccionario de cadenas. Cuando abres una terminal, ese diccionario ya viene con unas cuantas variables puestas por el sistema, y todo lo que lances desde ahí las recibirá.

En macOS y Linux las ves todas con `env`, y una concreta con `echo`:

```bash
echo $HOME
```

```salida
/Users/erwin
```

Desde Python se accede a ellas con el módulo `os`.

## Las tres formas de leerlas

```python title="entorno.py"
import os

print(os.environ["USER"])
print(os.environ.get("EDITOR", "nano"))
print(os.getenv("API_TOKEN"))
print(os.getenv("NIVEL_REGISTRO", "INFO"))
```

```bash
python3 entorno.py
```

```salida
erwin
nano
None
INFO
```

`os.environ` es, a todos los efectos, un diccionario, así que se comporta como ya sabes:

| Forma | Si la variable no existe |
| --- | --- |
| `os.environ["CLAVE"]` | Lanza `KeyError` |
| `os.environ.get("CLAVE")` | Devuelve `None` |
| `os.environ.get("CLAVE", "valor")` | Devuelve `"valor"` |
| `os.getenv("CLAVE")` | Devuelve `None` |
| `os.getenv("CLAVE", "valor")` | Devuelve `"valor"` |

`os.getenv` y `os.environ.get` hacen literalmente lo mismo; la primera es un atajo de la segunda. Usa la que te resulte más legible, pero sé coherente dentro de un mismo programa.

> [!error] KeyError: 'API\_TOKEN'
>
> Has usado `os.environ["API_TOKEN"]` y esa variable no está definida en el entorno desde el que lanzaste el programa.
>
> Los corchetes solo valen para variables que **tienen que estar sí o sí**, y en ese caso el `KeyError` es un fallo razonable. Pero un mensaje propio se entiende mucho mejor:
>
> ```python
> token = os.getenv("API_TOKEN")
> if token is None:
>         raise SystemExit("Falta la variable API_TOKEN. Defínela antes de ejecutar.")
> ```

> [!consejo] Los nombres van en mayúsculas
>
> Por convención, las variables de entorno se escriben en MAYÚSCULAS con guiones bajos. No es obligatorio y Python las leería igual, pero en Windows los nombres no distinguen mayúsculas de minúsculas, así que ceñirse a la costumbre evita sorpresas al cambiar de sistema.

## Siempre son cadenas

Esto no tiene excepciones: da igual que escribas `PUERTO=9000`, lo que llega a Python es el texto `"9000"`. La conversión es cosa tuya.

```python title="tipos_entorno.py"
import os

puerto = os.getenv("PUERTO", "8080")
print(puerto, type(puerto))
print(int(puerto) + 1)

depurar = os.getenv("DEPURAR", "")
print(repr(depurar), bool(depurar))
```

```bash
PUERTO=9000 DEPURAR=false python3 tipos_entorno.py
```

```salida
9000 <class 'str'>
9001
'false' True
```

Mira la última línea. Has escrito `DEPURAR=false`, con toda la intención de desactivar algo, y `bool()` te ha devuelto `True`. No es un fallo de Python: `"false"` es una cadena con cinco caracteres dentro, y en Python cualquier cadena no vacía es verdadera. Si usaras `bool(os.getenv("DEPURAR"))` directamente, tu programa estaría en modo depuración exactamente cuando pediste que no lo estuviera.

La forma correcta es decidir tú qué textos cuentan como verdadero:

```python title="booleanos.py"
import os

VERDADEROS = {"1", "true", "yes", "si", "sí", "on"}


def variable_activada(nombre: str, por_defecto: bool = False) -> bool:
        """Interpreta una variable de entorno como un booleano."""
    valor = os.getenv(nombre)
    if valor is None:
                return por_defecto
    return valor.strip().lower() in VERDADEROS


for prueba in ["1", "true", "TRUE", "sí", "on", "0", "false", "no", ""]:
        os.environ["DEPURAR"] = prueba
    print(f"{prueba!r:>8} -> {variable_activada('DEPURAR')}")

del os.environ["DEPURAR"]
print(f"{'(sin definir)':>13} -> {variable_activada('DEPURAR')}")
```

```salida
     '1' -> True
  'true' -> True
  'TRUE' -> True
    'sí' -> True
    'on' -> True
     '0' -> False
 'false' -> False
    'no' -> False
      '' -> False
(sin definir) -> False
```

Para los números, la conversión también hay que protegerla, porque en el entorno puede haber cualquier cosa:

```python
def variable_entera(nombre: str, por_defecto: int) -> int:
        """Lee una variable de entorno como entero, o devuelve el valor por defecto."""
    valor = os.getenv(nombre)
    if valor is None:
                return por_defecto
    try:
                return int(valor)
    except ValueError:
                raise SystemExit(f"{nombre} debe ser un número entero, no {valor!r}")
```

> [!aviso] Nunca uses bool() sobre una variable de entorno
>
> Es el fallo más caro de esta lección porque no da ningún error: el programa funciona, solo que hace lo contrario de lo que le pediste. `bool("false")`, `bool("0")` y `bool("no")` valen los tres `True`. Escribe siempre una función como la de arriba.

## Definirlas desde la terminal

### Para una sola ejecución

En macOS y Linux basta con ponerlas delante del comando, separadas por espacios. Solo existen durante esa ejecución y desaparecen después:

```bash
PUERTO=9000 NIVEL_REGISTRO=DEBUG python3 entorno.py
```

Es la forma más limpia de probar una configuración distinta sin ensuciar nada.

### Para toda la sesión de la terminal

Con `export` la variable queda puesta hasta que cierres esa ventana, y la heredan todos los programas que lances desde ahí:

```bash
export API_TOKEN="sk-de-mentira-1234567890"
python3 entorno.py
unset API_TOKEN
```

`unset` la borra. Si abres otra terminal, esta no tendrá nada de eso: cada ventana es un entorno independiente.

### Para siempre

Para que una variable esté puesta cada vez que abras una terminal, se añade la línea `export` al fichero de arranque de tu intérprete de órdenes: `~/.zshrc` en macOS (y en Linux si usas zsh) o `~/.bashrc` en la mayoría de Linux. El cambio afecta a las terminales que abras después, no a la que tienes abierta.

### En Windows

Cambia la sintaxis, no la idea:

| Qué quieres | PowerShell | Consola `cmd` |
| --- | --- | --- |
| Ver una variable | `echo $env:PUERTO` | `echo %PUERTO%` |
| Definirla para la sesión | `$env:PUERTO = "9000"` | `set PUERTO=9000` |
| Definirla para siempre | `setx PUERTO 9000` | `setx PUERTO 9000` |
| Borrarla de la sesión | `Remove-Item Env:PUERTO` | `set PUERTO=` |

En PowerShell no existe el atajo de ponerla delante del comando: hay que definirla y después lanzar el programa, en dos instrucciones o separadas por punto y coma. Y `setx` no afecta a la ventana actual, solo a las que abras a partir de entonces.

## Las variables que ya existen

Estas están puestas por el sistema y conviene conocerlas, porque tu programa puede aprovecharlas:

| Variable | Qué contiene | Para qué te sirve |
| --- | --- | --- |
| `PATH` | Las carpetas donde el sistema busca los programas | Por qué `python3` funciona desde cualquier sitio |
| `HOME` | La carpeta personal del usuario | Dónde guardar la configuración. En Windows es `USERPROFILE` |
| `USER` | El nombre del usuario | Saludar, registrar quién ejecutó algo. En Windows es `USERNAME` |
| `EDITOR` | El editor de texto preferido | Abrir un fichero para que lo edite el usuario, como hace `git commit` |
| `LANG` | El idioma y la codificación del sistema | Decidir en qué idioma hablar |
| `NO_COLOR` | Si está definida, con cualquier valor, no uses color | Respetarla en tu salida con ANSI |

```python title="habituales.py"
import os

print("Usuario:", os.getenv("USER") or os.getenv("USERNAME"))
print("Carpeta personal:", os.path.expanduser("~"))
print("Editor preferido:", os.getenv("EDITOR", "no definido"))
print("Sin color:", "NO_COLOR" in os.environ)
```

```bash
EDITOR=vim NO_COLOR=1 python3 habituales.py
```

```salida
Usuario: erwin
Carpeta personal: /Users/erwin
Editor preferido: vim
Sin color: True
```

Fíjate en dos detalles. `os.getenv("USER") or os.getenv("USERNAME")` cubre los tres sistemas de una tacada, aprovechando que `or` devuelve el primer valor que no sea falso. Y para la carpeta personal es mejor `os.path.expanduser("~")` que leer `HOME`, porque funciona igual en Windows sin tener que saber cómo se llama la variable allí.

> [!nota] NO\_COLOR es un estándar de verdad
>
> No es un invento del curso: hay una convención pública que muchas herramientas respetan. Si la variable está definida, aunque sea con la cadena vacía, el programa debe salir sin colores. Por eso se comprueba con `in os.environ` y no por su valor. Cuando pongas colores ANSI en tus herramientas, mírala.

## Ficheros .env

Definir seis variables a mano cada vez que abres una terminal es insufrible. La costumbre, nacida en el desarrollo web y extendida a todo, es guardarlas en un fichero llamado `.env` en la raíz del proyecto:

```text title=".env"
# Credenciales de desarrollo. Este fichero NO se sube a git.
API_TOKEN=sk-de-mentira-1234567890
BASE_DATOS_URL=postgresql://localhost:5432/tienda
NIVEL_REGISTRO=DEBUG
ENVIAR_CORREOS=false
```

El formato es tan simple que leerlo no necesita ninguna biblioteca:

```python title="cargar_env.py"
import os
from pathlib import Path


def cargar_env(ruta: str | Path = ".env") -> int:
        """Carga en os.environ las variables de un fichero .env. Devuelve cuántas."""
    fichero = Path(ruta)
    if not fichero.exists():
                return 0

    cargadas = 0
    for linea in fichero.read_text(encoding="utf-8").splitlines():
                linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
                        continue
        clave, _, valor = linea.partition("=")
        clave = clave.strip()
        valor = valor.strip().strip("\"'")
        # Lo que ya venga del entorno real manda sobre el fichero.
        os.environ.setdefault(clave, valor)
        cargadas += 1
    return cargadas


cuantas = cargar_env()
print(f"Cargadas {cuantas} variables de .env")
print("NIVEL_REGISTRO:", os.getenv("NIVEL_REGISTRO"))
print("ENVIAR_CORREOS:", os.getenv("ENVIAR_CORREOS"))
print("SIN_DEFINIR:", os.getenv("SIN_DEFINIR", "(valor por defecto)"))
```

```bash
python3 cargar_env.py
```

```salida
Cargadas 4 variables de .env
NIVEL_REGISTRO: DEBUG
ENVIAR_CORREOS: false
SIN_DEFINIR: (valor por defecto)
```

Escribir en `os.environ` es perfectamente legal, y afecta a este proceso y a los que él lance, nunca a la terminal desde la que arrancaste: cuando el programa termina, no queda rastro. La clave del diseño está en `setdefault`, que solo escribe si la clave no existía. Así, una variable puesta de verdad en el entorno gana sobre lo que diga el fichero, y puedes saltarte el `.env` puntualmente:

```bash
NIVEL_REGISTRO=WARNING python3 cargar_env.py
```

```salida
Cargadas 4 variables de .env
NIVEL_REGISTRO: WARNING
ENVIAR_CORREOS: false
SIN_DEFINIR: (valor por defecto)
```

> [!nota] La alternativa se llama python-dotenv
>
> Existe una biblioteca externa, `python-dotenv`, que hace esto mismo y bastantes cosas más: valores en varias líneas, referencias entre variables, comillas con escapes. Se instala con `pip install python-dotenv` y se usa con dos líneas:
>
> ```python
> from dotenv import load_dotenv
>
> load_dotenv()
> ```
>
> Para un fichero sencillo, las veinte líneas de arriba te ahorran una dependencia. Cuando el `.env` se complique, cambia a la biblioteca.

## La regla de oro

Las credenciales, las claves de API, las contraseñas de base de datos y los tokens **no se escriben nunca en el código**. Dan igual las buenas intenciones: en cuanto están en un fichero `.py`, están en el repositorio, y en cuanto están en el repositorio, están en el historial de git para siempre, aunque después los borres.

Por eso el `.env` es lo primero que se añade a `.gitignore`:

```text title=".gitignore"
.env
__pycache__/
*.pyc
```

Y para que quien clone el proyecto sepa qué variables necesita, se sube un `.env.ejemplo` **sin valores reales**, que sí entra en git:

```text title=".env.ejemplo"
API_TOKEN=
BASE_DATOS_URL=postgresql://localhost:5432/tienda
NIVEL_REGISTRO=INFO
ENVIAR_CORREOS=false
```

> [!aviso] Los argumentos de la línea de comandos tampoco son un sitio seguro
>
> `python3 subir.py --token sk-de-verdad-123` parece inofensivo y no lo es. Ese texto queda en `~/.zsh_history`, y mientras el programa se ejecuta cualquier usuario de la máquina puede verlo entero con `ps aux`. Las variables de entorno no aparecen en el historial ni en el listado normal de procesos. No son un cofre blindado, pero son varios escalones mejores.

> [!error] Mi programa no ve la variable que acabo de exportar
>
> Tres causas, por orden de frecuencia. La has definido en una terminal y estás ejecutando el programa en otra: cada ventana tiene su entorno. La has escrito con `VARIABLE=valor` sin `export`, con lo que existe para esa terminal pero no se hereda a los programas hijos. O la has escrito en `~/.zshrc` y no has abierto una terminal nueva. Comprueba lo primero con `echo $VARIABLE` en la misma ventana desde la que lanzas el programa.

> [!resumen] En resumen
>
> Las variables de entorno son un diccionario de cadenas que el sistema entrega a cada programa al arrancar, y sirven para configurarlo desde fuera sin tocar el código y sin pasar datos sensibles por la línea de comandos, donde quedarían en el historial. Se leen con `os.environ`, que funciona como un diccionario y lanza `KeyError` con corchetes, o con `os.getenv`, que admite un valor por defecto. Su valor es **siempre** una cadena, así que hay que convertirlo, y el caso peligroso son los booleanos: `bool("false")` vale `True`, por lo que necesitas una función propia que decida qué textos cuentan como verdadero. Se definen para una sola ejecución poniéndolas delante del comando, para toda la sesión con `export`, y para siempre en `~/.zshrc`; en Windows la sintaxis es `$env:NOMBRE` o `set`. Un fichero `.env` agrupa las de un proyecto y se lee con veinte líneas de Python usando `setdefault`, para que el entorno real siempre gane. Y la regla que no se negocia: ese fichero va al `.gitignore` y las credenciales no entran jamás en el código.

> [!ejercicio] Practica
>
> Crea `16-entorno.py` y resuelve:
>
> 1. Escribe un programa que muestre tu usuario, tu carpeta personal y tu editor preferido, con un valor por defecto razonable para los que no estén definidos.
> 2. Haz que lea una variable `PUERTO` y la convierta a entero, con 8080 por defecto. Pruébalo sin definirla, definiéndola con un número y definiéndola con `PUERTO=ocho`, y decide qué debe pasar en el tercer caso.
> 3. Implementa la función `variable_activada` de la lección y compruébala con al menos seis valores distintos, incluida la cadena vacía y la variable sin definir.
> 4. Escribe un `.env` con cuatro variables, cárgalo con la función `cargar_env` y comprueba que una variable definida en la terminal gana sobre la del fichero.
> 5. Añade `.env` a un `.gitignore` y crea el `.env.ejemplo` correspondiente, con las mismas claves y sin ningún valor secreto.
> 6. Modifica el programa para que respete `NO_COLOR`: si está definida, que imprima sin códigos ANSI, y si no, que use color. Pruébalo con `NO_COLOR=1 python3 16-entorno.py` y sin ella.
