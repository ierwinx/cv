---
titulo: "Ficheros de configuración"
resumen: "Dónde y cómo guardar los ajustes de tu herramienta para que los recuerde, y en qué orden combinarlos con el entorno y los argumentos."
minutos: 20
orden: 17
---

Una herramienta de terminal que se usa a diario acumula ajustes: el idioma, cuántos resultados mostrar, si pintar con color, la dirección del servidor. Obligar a escribirlos en cada llamada es insufrible, y las variables de entorno tampoco valen para esto, porque hay que volver a ponerlas cada vez que abres una terminal.

Lo que hace falta es que la herramienta **recuerde** los ajustes entre ejecuciones, en un fichero que el usuario pueda abrir con su editor y cambiar a mano. Eso es un fichero de configuración, y hay tres formatos razonables para escribirlo.

## Elegir formato

| Formato | Módulo | Tipos que entiende | Anidamiento | Cuándo usarlo |
| --- | --- | --- | --- | --- |
| JSON | `json` | Texto, números, booleanos, nulo, listas, objetos | Ilimitado | Datos que genera y consume el programa, no una persona |
| INI | `configparser` | Solo texto, con conversores para los demás | Un nivel de secciones | Ajustes sencillos, agrupados en secciones planas |
| TOML | `tomllib` | Texto, números, booleanos, fechas, listas, tablas | Ilimitado | Configuración escrita por personas. La opción por defecto hoy |

La diferencia práctica está en quién escribe el fichero. JSON es exacto y aburrido, pero no admite comentarios, y una configuración sin comentarios es una configuración que nadie entiende a los seis meses. INI y TOML sí los admiten y perdonan las comas de más porque no hay comas.

> [!nota] TOML es el formato de la propia Python
>
> Cuando empaquetas un proyecto, su descripción va en un `pyproject.toml`. Cuando configuras casi cualquier herramienta moderna de Python, también. Por eso `tomllib` entró en la biblioteca estándar en Python 3.11: el lenguaje lo usa para sí mismo. Si empiezas un proyecto hoy y no tienes un motivo para lo contrario, usa TOML.

## JSON, que ya conoces

No hay nada nuevo respecto a lo que viste en el módulo anterior. Se lee con `json.load` y se escribe con `json.dump`:

```python
import json
from pathlib import Path

ruta = Path("config.json")

with open(ruta, encoding="utf-8") as fichero:
        configuracion = json.load(fichero)

configuracion["tema"] = "oscuro"

with open(ruta, "w", encoding="utf-8") as fichero:
        json.dump(configuracion, fichero, indent=2, ensure_ascii=False)
```

Su gran ventaja para la configuración es que es el único de los tres que puedes **escribir** cómodamente desde Python. Su gran defecto es que no admite comentarios: si tu usuario quiere anotar por qué puso ese valor, no tiene dónde.

## INI, con configparser

El formato INI viene de los tiempos de Windows 3.1 y sigue vivo porque es tan simple que no hay forma de escribirlo mal: secciones entre corchetes y pares `clave = valor` debajo.

```text title="ajustes.ini"
[general]
tema = oscuro
idioma = es
avisos = true

[red]
servidor = api.ejemplo.es
puerto = 8080
tiempo_espera = 5.5
```

`configparser` se comporta casi como un diccionario de diccionarios:

```python title="ini_leer.py"
import configparser

configuracion = configparser.ConfigParser()
leidos = configuracion.read("ajustes.ini", encoding="utf-8")
print("Ficheros leídos:", leidos)

print("Secciones:", configuracion.sections())
print("Tema:", configuracion["general"]["tema"])
print("Puerto:", configuracion.getint("red", "puerto") + 1)
print("Espera:", configuracion.getfloat("red", "tiempo_espera"))
print("Avisos:", configuracion.getboolean("general", "avisos"))
print("Ausente:", configuracion.get("general", "tamano", fallback="mediano"))
```

```salida
Ficheros leídos: ['ajustes.ini']
Secciones: ['general', 'red']
Tema: oscuro
Puerto: 8081
Espera: 5.5
Avisos: True
Ausente: mediano
```

Lo importante de esa salida son los conversores. **En INI todo es texto**, igual que en las variables de entorno, así que `configparser` trae `getint`, `getfloat` y `getboolean` para ahorrarte la conversión y sus fallos. `getboolean` es especialmente agradecido: entiende `true`, `yes`, `on` y `1` como verdadero, y `false`, `no`, `off` y `0` como falso, así que te libra del problema de `bool("false")`.

Y `read()` no falla si el fichero no existe: devuelve la lista de los que sí ha conseguido leer, que puede estar vacía. Eso permite pasarle varias rutas por orden y quedarte con lo que haya.

Escribirlo es igual de directo:

```python title="ini_demo.py"
import configparser

configuracion = configparser.ConfigParser()
configuracion["general"] = {
    "tema": "oscuro",
    "idioma": "es",
    "avisos": "true",
}
configuracion["red"] = {
    "servidor": "api.ejemplo.es",
    "puerto": "8080",
    "tiempo_espera": "5.5",
}

with open("ajustes.ini", "w", encoding="utf-8") as fichero:
        configuracion.write(fichero)
```

Fíjate en que los valores se pasan como cadenas, incluso los números. Si le das un entero, `configparser` protesta con un `TypeError`.

> [!error] configparser.MissingSectionHeaderError: File contains no section headers
>
> Tu fichero INI empieza con un `clave = valor` sin ninguna sección por encima. En INI **todo tiene que vivir dentro de una sección**, no existen las claves sueltas en la raíz. Añade una cabecera al principio, por ejemplo `[general]`. El mensaje te dice el fichero y la línea exacta.

## TOML, con tomllib

TOML se parece a INI pero con tipos de verdad: el intérprete distingue `8080` de `"8080"` y `true` de `"true"`, así que no hay que convertir nada.

```text title="ajustes.toml"
# Configuración de mi-herramienta
tema = "oscuro"
idioma = "es"
avisos = true
maximo_resultados = 50

[red]
servidor = "api.ejemplo.es"
puerto = 8080
tiempo_espera = 5.5

[[atajos]]
tecla = "ctrl+n"
accion = "nuevo"

[[atajos]]
tecla = "ctrl+g"
accion = "guardar"
```

Las claves de arriba, antes de la primera sección, quedan en la raíz. `[red]` es una tabla, que en Python será un diccionario. Y `[[atajos]]`, con dobles corchetes, es una **lista de tablas**: cada bloque repetido añade un elemento a una lista.

```python title="toml_leer.py"
import tomllib

with open("ajustes.toml", "rb") as fichero:
        configuracion = tomllib.load(fichero)

print(configuracion["tema"], type(configuracion["tema"]))
print(configuracion["avisos"], type(configuracion["avisos"]))
print(configuracion["red"]["puerto"] + 1, type(configuracion["red"]["puerto"]))
print(configuracion["red"]["tiempo_espera"], type(configuracion["red"]["tiempo_espera"]))
for atajo in configuracion["atajos"]:
        print(atajo["tecla"], "->", atajo["accion"])
```

```salida
oscuro <class 'str'>
True <class 'bool'>
8081 <class 'int'>
5.5 <class 'float'>
ctrl+n -> nuevo
ctrl+g -> guardar
```

Ningún `getint`, ningún `getboolean`: lo que sale ya es un `int` y un `bool`. Lo que te devuelve `tomllib.load` es un diccionario de Python corriente, con diccionarios y listas dentro.

> [!aviso] tomllib exige abrir el fichero en modo binario
>
> Ese `"rb"` del `open` no es un capricho ni un descuido. TOML obliga a que los ficheros estén en UTF-8, y `tomllib` prefiere leer los bytes y decodificarlos él mismo antes que fiarse de la codificación con la que se abrió el fichero.

> [!error] TypeError: File must be opened in binary mode, e.g. use `open('foo.toml', 'rb')`
>
> Has hecho `open(ruta, encoding="utf-8")` en vez de `open(ruta, "rb")`. El mensaje te da la solución literal. Si lo que tienes es una cadena en memoria y no un fichero, usa `tomllib.loads(texto)`, que sí recibe texto.

> [!error] tomllib.TOMLDecodeError: Invalid value (at line 1, column 8)
>
> El fichero no es TOML válido, y casi siempre es lo mismo: **un texto sin comillas**. En TOML, `tema = oscuro` es un error; tiene que ser `tema = "oscuro"`. A diferencia de INI, donde todo es texto y las comillas sobran, aquí el tipo se deduce de cómo lo escribes. El mensaje trae la línea y la columna.

> [!aviso] tomllib solo sabe leer
>
> En la biblioteca estándar no hay nada para **escribir** TOML: `tomllib` tiene `load` y `loads`, pero no `dump` ni `dumps`. Es una decisión deliberada, porque escribir TOML conservando comentarios y formato es mucho más difícil que leerlo.
>
> Tienes tres salidas. Si la configuración la escribe solo la persona y tu programa únicamente la lee, no necesitas nada. Si tu programa tiene que guardar ajustes, usa JSON para eso y deja el TOML para lo que edita el usuario. Y si de verdad necesitas escribir TOML, instala `tomli-w` o `tomlkit`, esta última capaz de conservar los comentarios al reescribir.

## Dónde se guarda

Un error clásico es dejar el fichero de configuración junto al programa. Si la herramienta se instala en una carpeta del sistema, el usuario no tendrá permiso para escribir ahí, y si hay varios usuarios en la máquina compartirán ajustes sin querer.

Cada sistema tiene su sitio acordado:

| Sistema | Carpeta | Ejemplo |
| --- | --- | --- |
| Linux | `~/.config/nombre/` | `/home/erwin/.config/mi-herramienta/` |
| macOS | `~/.config/nombre/` | `/Users/erwin/.config/mi-herramienta/` |
| Windows | `%APPDATA%\nombre\` | `C:\Users\erwin\AppData\Roaming\mi-herramienta\` |

En macOS el sitio oficial de Apple es `~/Library/Application Support/`, pero las herramientas de terminal usan `~/.config` casi sin excepción, porque es lo mismo que en Linux y quien usa la terminal espera encontrarlo ahí.

Una función lo resuelve para los tres:

```python title="rutas.py"
import os
import sys
from pathlib import Path

NOMBRE_HERRAMIENTA = "mi-herramienta"


def carpeta_de_configuracion(nombre: str = NOMBRE_HERRAMIENTA) -> Path:
        """Devuelve la carpeta donde va la configuración del usuario en este sistema."""
    if sys.platform == "win32":
                base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        # XDG_CONFIG_HOME es el estándar en Linux; en macOS casi nadie lo define.
                base = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return base / nombre


def ruta_de_configuracion(nombre: str = NOMBRE_HERRAMIENTA) -> Path:
        """Devuelve la ruta completa del fichero de configuración."""
    return carpeta_de_configuracion(nombre) / "config.toml"


if __name__ == "__main__":
        print(carpeta_de_configuracion())
    print(ruta_de_configuracion())
```

```bash
python3 rutas.py
```

```salida
/Users/erwin/.config/mi-herramienta
/Users/erwin/.config/mi-herramienta/config.toml
```

`sys.platform` vale `"win32"` en Windows, `"darwin"` en macOS y `"linux"` en Linux. Y `Path.home()` te da la carpeta personal sin tener que saber si la variable se llama `HOME` o `USERPROFILE`.

> [!consejo] Deja que el usuario se salte tu carpeta
>
> Además de la carpeta del sistema, las herramientas serias miran si hay un fichero de configuración en la carpeta actual, para que un proyecto concreto pueda tener sus propios ajustes. Es lo que hacen `git` con `.gitconfig` o `ruff` con su sección en `pyproject.toml`. Se resuelve con el mismo mecanismo de precedencia del siguiente apartado.

## El orden de precedencia

Ahora tienes cuatro sitios de donde puede salir un ajuste: el código, el fichero, el entorno y los argumentos. ¿Cuál gana?

Todas las herramientas serias usan el mismo orden, y no es arbitrario: **gana el más concreto y el más cercano al momento de ejecutar**.

| Orden | Fuente | Alcance |
| --- | --- | --- |
| 1 | Valores por defecto del código | Siempre, es el suelo |
| 2 | Fichero de configuración | Este usuario, en esta máquina |
| 3 | Variables de entorno | Esta terminal, esta sesión |
| 4 | Argumentos de la línea de comandos | Esta ejecución y ninguna más |

Cada nivel pisa al anterior. Tiene toda la lógica: si escribes `--tema oscuro` en una llamada concreta, es porque quieres el tema oscuro **ahora**, y sería absurdo que el fichero de configuración se impusiera.

En Python, "pisar al anterior" se traduce en `update()` sobre un diccionario, y el código sale casi tan corto como la tabla:

```python title="config_completa.py"
import argparse
import json
import os
from pathlib import Path

POR_DEFECTO = {
    "tema": "claro",
    "idioma": "es",
    "maximo_resultados": 20,
    "avisos": True,
}

RUTA = Path("config.json")


def leer_fichero() -> dict:
        """Lee el fichero de configuración, o devuelve un diccionario vacío."""
    if not RUTA.exists():
                return {}
    with open(RUTA, encoding="utf-8") as fichero:
                return json.load(fichero)


def leer_entorno() -> dict:
        """Recoge las variables MIAPP_* que correspondan a claves conocidas."""
    valores = {}
    for clave in POR_DEFECTO:
                bruto = os.getenv(f"MIAPP_{clave.upper()}")
        if bruto is None:
                        continue
        modelo = POR_DEFECTO[clave]
        if isinstance(modelo, bool):
                        valores[clave] = bruto.strip().lower() in {"1", "true", "si", "sí", "on"}
        elif isinstance(modelo, int):
                        valores[clave] = int(bruto)
        else:
                        valores[clave] = bruto
    return valores


def leer_argumentos() -> dict:
        """Devuelve solo las opciones que el usuario ha escrito de verdad."""
    analizador = argparse.ArgumentParser(description="Ejemplo de precedencia")
    analizador.add_argument("--tema", choices=["claro", "oscuro"])
    analizador.add_argument("--idioma")
    analizador.add_argument("--maximo-resultados", type=int)
    argumentos = analizador.parse_args()
    return {clave: valor for clave, valor in vars(argumentos).items() if valor is not None}


def cargar_configuracion() -> dict:
        """Combina las cuatro fuentes por orden de precedencia."""
    configuracion = dict(POR_DEFECTO)
    configuracion.update(leer_fichero())
    configuracion.update(leer_entorno())
    configuracion.update(leer_argumentos())
    return configuracion


for clave, valor in cargar_configuracion().items():
        print(f"{clave}: {valor}")
```

Sin fichero, sin variables y sin argumentos, mandan los valores del código:

```bash
python3 config_completa.py
```

```salida
tema: claro
idioma: es
maximo_resultados: 20
avisos: True
```

Creamos el fichero con dos ajustes y los dos pisan a los de fábrica:

```bash
echo '{"tema": "oscuro", "maximo_resultados": 50}' > config.json
python3 config_completa.py
```

```salida
tema: oscuro
idioma: es
maximo_resultados: 50
avisos: True
```

El entorno pisa al fichero:

```bash
MIAPP_MAXIMO_RESULTADOS=100 MIAPP_AVISOS=false python3 config_completa.py
```

```salida
tema: oscuro
idioma: es
maximo_resultados: 100
avisos: False
```

Y los argumentos pisan a todo:

```bash
MIAPP_MAXIMO_RESULTADOS=100 python3 config_completa.py --tema claro --maximo-resultados 5
```

```salida
tema: claro
idioma: es
maximo_resultados: 5
avisos: True
```

Hay dos detalles que hacen que esto funcione y que se copian mal a menudo.

El primero es que `leer_argumentos` **no** pone valores por defecto en `add_argument`. Si los pusiera, `argparse` rellenaría todas las opciones y su `update` machacaría el fichero y el entorno siempre, aunque el usuario no hubiera escrito nada. Al dejarlos en `None` y filtrarlos con la comprensión, solo llega lo que se ha escrito de verdad.

El segundo es que los valores por defecto viven en un único diccionario, `POR_DEFECTO`, que además sirve para saber **qué tipo tiene cada clave**. Por eso `leer_entorno` puede convertir sola: mira el tipo del valor de fábrica y convierte en consecuencia. Añadir un ajuste nuevo al programa es añadir una línea ahí.

> [!aviso] Comprueba el tipo bool antes que el int
>
> En `leer_entorno`, el `isinstance(modelo, bool)` va primero a propósito. En Python `bool` es una subclase de `int`, así que `isinstance(True, int)` vale `True`. Si preguntaras por `int` antes, todos tus booleanos acabarían pasando por `int()` y `int("false")` reventaría con un `ValueError`.

## Crear el fichero la primera vez

La primera vez que alguien ejecuta tu herramienta no hay configuración. En vez de trabajar en silencio con los valores de fábrica, escribe el fichero: así el usuario tiene algo que abrir y ve qué se puede tocar. Este ejemplo reutiliza la función `ruta_de_configuracion` de más arriba:

```python title="primera_vez.py"
import json
from pathlib import Path

from rutas import carpeta_de_configuracion

POR_DEFECTO = {
    "tema": "claro",
    "idioma": "es",
    "maximo_resultados": 20,
    "avisos": True,
}

RUTA = carpeta_de_configuracion() / "config.json"


def cargar_o_crear() -> dict:
        """Lee la configuración del usuario, creándola con valores de fábrica si no existe."""
    if not RUTA.exists():
                RUTA.parent.mkdir(parents=True, exist_ok=True)
        with open(RUTA, "w", encoding="utf-8") as fichero:
                        json.dump(POR_DEFECTO, fichero, indent=2, ensure_ascii=False)
        print(f"He creado la configuración en {RUTA}")
        return dict(POR_DEFECTO)

    with open(RUTA, encoding="utf-8") as fichero:
                guardada = json.load(fichero)

    # Las claves nuevas de esta versión se rellenan con su valor de fábrica.
    return {**POR_DEFECTO, **guardada}


configuracion = cargar_o_crear()
print("Tema:", configuracion["tema"])
```

La primera ejecución lo crea y avisa:

```bash
python3 primera_vez.py
```

```salida
He creado la configuración en /Users/erwin/.config/mi-herramienta/config.json
Tema: claro
```

La segunda ya se lo encuentra hecho y no dice nada:

```bash
python3 primera_vez.py
```

```salida
Tema: claro
```

Dos cosas que merece la pena imitar. `mkdir(parents=True, exist_ok=True)` crea la carpeta y todas las que falten por el camino, y no protesta si ya existía. Y el `{**POR_DEFECTO, **guardada}` del final resuelve un problema que aparece con el tiempo: cuando saques la versión 2 de tu herramienta con un ajuste nuevo, los usuarios tendrán un fichero antiguo sin esa clave. Combinando los dos diccionarios, lo que falte se rellena con el valor de fábrica y `configuracion["ajuste_nuevo"]` nunca lanza un `KeyError`.

> [!resumen] En resumen
>
> Un fichero de configuración es lo que permite que una herramienta recuerde sus ajustes entre ejecuciones. Hay tres formatos razonables: JSON, que ya conoces y es el único que se escribe cómodamente desde Python pero no admite comentarios; INI con `configparser`, sencillo y con secciones planas, donde todo es texto y por eso existen `getint`, `getfloat` y `getboolean`; y TOML con `tomllib`, que devuelve los tipos ya convertidos, admite anidamiento y comentarios, y es el formato que usa la propia Python, con la limitación importante de que `tomllib` solo lee y para escribir hace falta una biblioteca externa. El fichero no va junto al programa, sino en `~/.config/nombre/` en Linux y macOS y en `%APPDATA%\nombre\` en Windows, lo que se resuelve con una función que mire `sys.platform`. Y cuando un ajuste puede venir de varios sitios, el orden que usan todas las herramientas serias es valores por defecto, fichero, variables de entorno y argumentos, cada uno pisando al anterior, lo que en Python se escribe como una cadena de `update()` sobre un diccionario.

> [!ejercicio] Practica
>
> Crea `17-configuracion.py` y resuelve:
>
> 1. Escribe un `ajustes.ini` con dos secciones y léelo con `configparser`, usando `getint` y `getboolean` para al menos dos claves. Prueba a leer una clave que no existe con `fallback`.
> 2. Escribe el mismo contenido como `ajustes.toml` y léelo con `tomllib`. Compara el código de los dos y anota cuál te ha resultado más corto y por qué.
> 3. Provoca a propósito el `TypeError` de abrir el TOML en modo texto y el `TOMLDecodeError` de un texto sin comillas. Apunta los mensajes exactos.
> 4. Implementa `carpeta_de_configuracion` y comprueba qué ruta te devuelve en tu sistema. Crea la carpeta y escribe dentro un `config.json` con cuatro ajustes.
> 5. Escribe la función `cargar_configuracion` con las cuatro fuentes y demuestra la precedencia: ejecuta el programa cuatro veces, añadiendo cada vez una fuente, y comprueba que el valor final cambia como toca.
> 6. Añade a `POR_DEFECTO` una clave nueva sin tocar el `config.json` que ya tenías guardado y comprueba que el programa no falla gracias a `{**POR_DEFECTO, **guardada}`.
