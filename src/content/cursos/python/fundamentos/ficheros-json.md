---
titulo: "Ficheros JSON"
resumen: "El formato en el que se intercambian datos en toda la web, y las cuatro funciones que lo convierten en estructuras de Python."
minutos: 13
orden: 48
---

Un CSV sirve para una tabla: filas y columnas, todo plano. Pero la mayoría de los datos reales no son planos. Una configuración tiene secciones dentro de secciones, un usuario tiene una lista de direcciones y cada dirección tiene sus campos. Para eso hace falta un formato que admita estructuras anidadas, y el que ha ganado es **JSON**.

JSON viene de *JavaScript Object Notation*, aunque hoy no tiene nada que ver con JavaScript: lo hablan todos los lenguajes. Cuando una aplicación móvil pide datos a un servidor, cuando guardas la configuración de un programa, cuando consumes una API, hay JSON de por medio. Y si ya sabes manejar diccionarios y listas de Python, lo tienes aprendido casi entero, porque un JSON es exactamente eso escrito como texto.

## Qué aspecto tiene

```json title="ajustes.json"
{
  "aplicacion": "Gestor de reservas",
  "puerto": 8080,
  "depuracion": false,
  "administradores": ["lferrer", "mruiz"],
  "correo": {
    "servidor": "smtp.ejemplo.es",
    "puerto": 587
  }
}
```

Llaves para las estructuras clave-valor, corchetes para las listas, comillas dobles para el texto. Igual que un diccionario de Python con listas y diccionarios dentro, con tres diferencias que se aprenden de golpe:

| Python | JSON | Nota |
| --- | --- | --- |
| `dict` | objeto `{}` | Las claves solo pueden ser texto |
| `list`, `tuple` | array `[]` | Las tuplas se convierten en arrays |
| `str` | string | **Siempre con comillas dobles** |
| `int` | number |  |
| `float` | number |  |
| `True` | `true` | En minúscula |
| `False` | `false` | En minúscula |
| `None` | `null` |  |

> [!aviso] Las comillas simples no son JSON válido
>
> En Python da igual `'hola'` que `"hola"`. En JSON, no: el estándar exige comillas dobles, tanto en las claves como en los textos. Un fichero con comillas simples fallará al leerlo, y es el error más común cuando alguien escribe un JSON a mano.

## Las cuatro funciones

El módulo `json` tiene cuatro funciones que se resumen en dos ideas cruzadas: convertir en un sentido o en el otro, y trabajar con cadenas o con ficheros.

| Función | De qué a qué | Dónde |
| --- | --- | --- |
| `json.dumps(datos)` | Python a JSON | Devuelve una cadena |
| `json.loads(texto)` | JSON a Python | Recibe una cadena |
| `json.dump(datos, fichero)` | Python a JSON | Escribe en un fichero |
| `json.load(fichero)` | JSON a Python | Lee de un fichero |

> [!consejo] La s es de string
>
> Es la única regla que hay que recordar: `dumps` y `loads`, **con `s`**, trabajan con cadenas de texto en memoria. `dump` y `load`, sin la `s`, trabajan con ficheros. Y `dump` es "volcar" (de Python hacia fuera) mientras que `load` es "cargar" (de fuera hacia Python).

### dumps y loads, con cadenas

```python
import json

configuracion = {
    "nombre": "Panel de control",
    "version": 3,
    "activo": True,
    "margen": 1.5,
    "idiomas": ["es", "en", "gl"],
    "tema": None,
}

texto = json.dumps(configuracion)
print(texto)
print(type(texto))
```

```salida
{"nombre": "Panel de control", "version": 3, "activo": true, "margen": 1.5, "idiomas": ["es", "en", "gl"], "tema": null}
<class 'str'>
```

Mira las traducciones: `True` ha pasado a `true` y `None` a `null`. Y lo que tienes ahora es una **cadena**, no un diccionario: no puedes hacer `texto["version"]`.

El camino de vuelta es `loads`, y es el que usarás al recibir datos de una API:

```python
import json

recibido = '{"usuario": "lferrer", "intentos": 3, "bloqueado": false}'
datos = json.loads(recibido)

print(datos)
print(type(datos))
print(datos["intentos"] + 1)
print(type(datos["bloqueado"]))
```

```salida
{'usuario': 'lferrer', 'intentos': 3, 'bloqueado': False}
<class 'dict'>
4
<class 'bool'>
```

Ahora sí es un diccionario de verdad, con sus tipos recuperados: el `3` es un entero con el que se puede sumar y el `false` ha vuelto a ser `False`. Esa es la gran diferencia con el CSV, donde todo llegaba como texto.

### dump y load, con ficheros

```python title="ajustes.py"
import json

ajustes = {
    "aplicacion": "Gestor de reservas",
    "puerto": 8080,
    "depuracion": False,
    "administradores": ["lferrer", "mruiz"],
    "correo": {
        "servidor": "smtp.ejemplo.es",
        "puerto": 587,
        "remitente": "reservas@ejemplo.es",
    },
}

with open("ajustes.json", "w", encoding="utf-8") as fichero:
        json.dump(ajustes, fichero, indent=2, ensure_ascii=False)

with open("ajustes.json", encoding="utf-8") as fichero:
        recuperado = json.load(fichero)

print(recuperado["correo"]["servidor"])
print(recuperado == ajustes)
```

```salida
smtp.ejemplo.es
True
```

Esa última línea es la que importa: lo que has recuperado es idéntico a lo que guardaste, con su estructura anidada y sus tipos intactos. Has guardado un diccionario en disco y lo has traído de vuelta en dos líneas.

Fíjate también en el orden de los argumentos de `dump`: primero los datos, después el fichero. Se confunde siempre.

## Los dos parámetros que se ponen siempre

### indent, para que se pueda leer

Sin `indent`, el JSON sale en una sola línea interminable. Con él, sale con sangría:

```python
import json

configuracion = {"nombre": "Panel", "idiomas": ["es", "en"], "activo": True}
print(json.dumps(configuracion, indent=2))
```

```salida
{
  "nombre": "Panel",
  "idiomas": [
    "es",
    "en"
  ],
  "activo": true
}
```

Usa `indent=2` para cualquier fichero que una persona vaya a abrir alguna vez: configuraciones, datos de ejemplo, ficheros que van a un repositorio. Para datos que solo viajan entre máquinas, déjalo sin poner y ahorra bytes.

### ensure\_ascii=False, para los acentos

Por defecto, `json` escapa cualquier carácter que no sea ASCII, y las tildes se convierten en códigos:

```python
import json

datos = {"ciudad": "Alcalá de Henares", "región": "Madrid"}

print(json.dumps(datos))
print(json.dumps(datos, ensure_ascii=False))
```

```salida
{"ciudad": "Alcal\u00e1 de Henares", "regi\u00f3n": "Madrid"}
{"ciudad": "Alcalá de Henares", "región": "Madrid"}
```

Las dos líneas son JSON válido y las dos se leen igual de bien: `\u00e1` **es** una á, solo que escrita en su forma escapada. La diferencia es para el ojo humano. Como hoy todo el mundo usa UTF-8, pon `ensure_ascii=False` y guarda las tildes tal cual.

> [!nota] La receta completa para guardar
>
> Para casi cualquier fichero JSON que escribas, esta es la línea que quieres:
>
> ```python
> json.dump(datos, fichero, indent=2, ensure_ascii=False)
> ```
>
> Y el `open()` que la acompaña, con `encoding="utf-8"` como siempre.

## Qué no se puede convertir

JSON solo conoce los tipos de la tabla de arriba. Todo lo demás falla.

Las tuplas son un caso especial: sí se convierten, pero **pierden su identidad** y vuelven como listas.

```python
import json

print(json.dumps({"punto": (3, 4)}))
```

```salida
{"punto": [3, 4]}
```

Los conjuntos y las fechas no se convierten en absoluto:

```python
import json

print(json.dumps({"es", "en"}))
```

```salida
TypeError: Object of type set is not JSON serializable
```

> [!error] TypeError: Object of type set is not JSON serializable
>
> Hay un dato en tu estructura que JSON no sabe representar. El mensaje te dice el tipo, y en las versiones recientes de Python añade una segunda línea con la clave donde está, por ejemplo `when serializing dict item 'idiomas'`. Las dos soluciones habituales:
>
> - Para un conjunto, conviértelo a lista antes: `list(mi_conjunto)`. Ten en cuenta que al recuperarlo tendrás una lista, así que si lo necesitas como conjunto vuelve a convertirlo con `set()`.
> - Para una fecha, guárdala como texto con `fecha.isoformat()`, que da `'2026-03-01'`, y al leerla recupérala con `date.fromisoformat(texto)`. Es el formato estándar y se ordena bien como cadena.

## Cuando el fichero está mal formado

Este JSON tiene un fallo, y es el más frecuente de todos:

```json title="ajustes.json"
{
  "aplicacion": "Gestor de reservas",
  "puerto": 8080,
  "depuracion": false,
}
```

La coma después de `false` sobra. En Python una coma final es perfectamente legal; en JSON, no.

```salida
json.decoder.JSONDecodeError: Illegal trailing comma before end of object: line 4 column 22 (char 79)
```

> [!error] json.decoder.JSONDecodeError
>
> El fichero no es JSON válido. El mensaje trae la línea y la columna exactas, así que ve directo ahí. Los cuatro fallos que causan el 90% de los casos:
>
> - **Una coma de más** antes de un `}` o un `]`. Mensaje: `Illegal trailing comma`.
> - **Comillas simples** en vez de dobles. Mensaje: `Expecting property name enclosed in double quotes`.
> - **Un fichero vacío**. Mensaje: `Expecting value: line 1 column 1 (char 0)`. Esto pasa cuando el programa que lo escribió murió a mitad.
> - **Valores de Python en vez de JSON**: `True`, `False` o `None` con mayúscula. En JSON son `true`, `false` y `null`.
>
> Si el fichero es largo, pégalo en un validador de JSON o ábrelo con Visual Studio Code, que te subraya el error al momento.

## Un fichero de preferencias

El caso de uso más común de JSON en un programa de escritorio: recordar las preferencias entre ejecuciones, partiendo de unas de fábrica la primera vez.

```python title="preferencias.py"
import json
from pathlib import Path

RUTA = Path(__file__).parent / "preferencias.json"

PREFERENCIAS_POR_DEFECTO = {
    "tema": "claro",
    "idioma": "es",
    "tamano_letra": 14,
    "avisos": True,
    "carpetas_recientes": [],
}


def cargar_preferencias() -> dict:
        """Devuelve las preferencias guardadas, o las de fábrica si no hay fichero."""
    if not RUTA.exists():
                return dict(PREFERENCIAS_POR_DEFECTO)
    with open(RUTA, encoding="utf-8") as fichero:
                return json.load(fichero)


def guardar_preferencias(preferencias: dict) -> None:
        """Escribe las preferencias en disco de forma legible."""
    with open(RUTA, "w", encoding="utf-8") as fichero:
                json.dump(preferencias, fichero, indent=2, ensure_ascii=False)


preferencias = cargar_preferencias()
print("Al arrancar:", preferencias["tema"], preferencias["tamano_letra"])

preferencias["tema"] = "oscuro"
preferencias["tamano_letra"] = 16
preferencias["carpetas_recientes"].append("/Users/erwin/informes año 2026")
guardar_preferencias(preferencias)

recuperadas = cargar_preferencias()
print("Tras recargar:", recuperadas["tema"], recuperadas["tamano_letra"])
print("Recientes:", recuperadas["carpetas_recientes"])
```

La primera vez que lo ejecutas, el fichero no existe y salen las preferencias de fábrica:

```salida
Al arrancar: claro 14
Tras recargar: oscuro 16
Recientes: ['/Users/erwin/informes año 2026']
```

Y deja esto en el disco:

```json title="preferencias.json"
{
  "tema": "oscuro",
  "idioma": "es",
  "tamano_letra": 16,
  "avisos": true,
  "carpetas_recientes": [
    "/Users/erwin/informes año 2026"
  ]
}
```

Si lo vuelves a ejecutar, la primera línea ya dirá `oscuro 16`: las preferencias han sobrevivido al cierre del programa.

Dos decisiones del diseño que merece la pena imitar. `cargar_preferencias()` devuelve `dict(PREFERENCIAS_POR_DEFECTO)`, una copia, y no el diccionario original: si devolviera el original, modificar las preferencias en memoria cambiaría también las de fábrica. Y la ruta cuelga de `Path(__file__).parent`, para que el fichero se guarde junto al programa y no en la carpeta desde la que se lanzó.

> [!resumen] En resumen
>
> JSON es el formato universal de intercambio de datos, y se corresponde casi uno a uno con los diccionarios y las listas de Python: las diferencias son que el texto va siempre entre comillas dobles y que `True`, `False` y `None` se escriben `true`, `false` y `null`. Hay cuatro funciones, y la `s` distingue las que trabajan con cadenas: `dumps` y `loads` en memoria, `dump` y `load` con ficheros. Al escribir, pon `indent=2` para que se pueda leer y `ensure_ascii=False` para conservar las tildes. Los conjuntos y las fechas no se pueden convertir y dan `TypeError`; las tuplas sí, pero vuelven como listas. Y si un fichero está mal escrito, `JSONDecodeError` te dice la línea y la columna exactas.

> [!ejercicio] Practica
>
> Crea `48-json.py` y resuelve:
>
> 1. Construye un diccionario con tus datos (nombre, edad, lista de aficiones y un diccionario con ciudad y provincia) y muéstralo con `json.dumps` usando `indent=2` y `ensure_ascii=False`.
> 2. Guárdalo en `perfil.json`, vuelve a leerlo con `json.load` y comprueba con `==` que es idéntico al original.
> 3. Escribe una agenda de contactos como lista de diccionarios y guárdala en `contactos.json`. Después léela y muestra solo los contactos de una provincia concreta.
> 4. Añade al diccionario un conjunto de idiomas y trata de guardarlo. Lee el `TypeError` y arréglalo convirtiéndolo a lista.
> 5. Abre `perfil.json` con tu editor, añade una coma sobrante al final y ejecuta el programa. Anota el mensaje de error, la línea y la columna que te da.
> 6. Escribe un contador de arranques que guarde en `estado.json` cuántas veces se ha ejecutado el programa y la fecha del último, usando `date.today().isoformat()` para la fecha.
