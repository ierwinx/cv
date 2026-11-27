---
titulo: "Registro con logging"
resumen: "Cómo dejar constancia de lo que hace tu programa, con niveles de detalle que se encienden y se apagan sin tocar el código."
minutos: 20
orden: 18
---

Todo el mundo depura con `print`. Metes un `print(f"aquí llega con {valor}")`, ejecutas, ves qué pasa y lo borras. Funciona mientras el programa cabe en una pantalla.

En cuanto tu herramienta se usa de verdad, los `print` de depuración fallan por tres motivos a la vez. No se pueden apagar: o los borras uno por uno o los sufres siempre. No dicen cuándo ocurrieron ni de qué parte del programa salieron, así que un fichero con mil líneas de salida no te sirve para reconstruir nada. Y se mezclan con la salida útil, con lo que se cargan las tuberías y las redirecciones que montaste en las lecciones anteriores.

El módulo `logging` de la biblioteca estándar resuelve los tres.

## Los cinco niveles

La idea central de `logging` es que cada mensaje lleva una **etiqueta de importancia**, y tú decides a partir de qué importancia se muestran. Los niveles son cinco y están ordenados:

| Nivel | Valor | Cuándo usarlo |
| --- | --- | --- |
| `DEBUG` | 10 | Detalles internos que solo interesan mientras investigas un fallo |
| `INFO` | 20 | Hitos normales: "he cargado 120 artículos", "conectado al servidor" |
| `WARNING` | 30 | Algo raro, pero el programa sigue: un dato mal formado que se ignora |
| `ERROR` | 40 | Una operación ha fallado y no se ha podido completar |
| `CRITICAL` | 50 | El programa no puede continuar |

La duda habitual es entre `WARNING` y `ERROR`. La regla que funciona: si el programa va a devolver un código de salida distinto de cero por culpa de eso, es `ERROR`; si va a terminar bien de todos modos, es `WARNING`.

Las cinco funciones se llaman igual que los niveles:

```python title="log1.py"
import logging

logging.debug("Valor intermedio del cálculo: 42")
logging.info("Procesando el fichero clientes.csv")
logging.warning("El fichero tiene 3 filas vacías")
logging.error("No se ha podido abrir pedidos.csv")
logging.critical("Sin espacio en disco, abortando")
```

```salida
WARNING:root:El fichero tiene 3 filas vacías
ERROR:root:No se ha podido abrir pedidos.csv
CRITICAL:root:Sin espacio en disco, abortando
```

Has escrito cinco mensajes y han salido tres. Sin configurar nada, `logging` muestra a partir de `WARNING` y se calla el resto. Ese es exactamente el comportamiento que querías con los `print`: los mensajes de depuración siguen ahí, en el código, sin molestar.

> [!nota] Todo esto sale por stderr
>
> Los mensajes de `logging` van por `stderr`, no por `stdout`. Es la decisión correcta y encaja con la regla de la lección de códigos de salida: el registro es conversación con la persona, no el resultado del programa. Por eso `python3 programa.py > datos.txt` te deja el registro en pantalla y los datos limpios en el fichero.

## La configuración rápida

`logging.basicConfig()` prepara el registro de una vez. Se llama **una sola vez**, al principio del programa:

```python title="log2.py"
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.debug("Valor intermedio del cálculo: 42")
logging.info("Procesando el fichero clientes.csv")
logging.warning("El fichero tiene 3 filas vacías")
logging.error("No se ha podido abrir pedidos.csv")
```

```salida
2026-09-19 14:27:52 [DEBUG] Valor intermedio del cálculo: 42
2026-09-19 14:27:52 [INFO] Procesando el fichero clientes.csv
2026-09-19 14:27:52 [WARNING] El fichero tiene 3 filas vacías
2026-09-19 14:27:52 [ERROR] No se ha podido abrir pedidos.csv
```

Las fechas que veas serán las de tu ordenador en el momento de ejecutarlo, claro; aquí y en el resto de la lección aparecen las del día en que se escribió.

### El formato de los mensajes

`format` usa el estilo antiguo de Python, con `%(nombre)s`, y no f-strings. Estos son los marcadores que de verdad se usan:

| Marcador | Qué pone |
| --- | --- |
| `%(asctime)s` | La fecha y la hora |
| `%(levelname)s` | El nivel: `DEBUG`, `INFO`... |
| `%(message)s` | Tu mensaje |
| `%(name)s` | El nombre del registrador que lo emitió |
| `%(filename)s` | El fichero desde el que se llamó |
| `%(lineno)d` | La línea exacta |
| `%(funcName)s` | La función desde la que se llamó |

Admiten la sintaxis de alineación que ya conoces de las f-strings: `%(levelname)-8s` rellena el nivel con espacios hasta ocho caracteres, para que las columnas queden cuadradas.

### El formato de la fecha

`datefmt` usa los códigos de `strftime`: `%Y` el año con cuatro cifras, `%m` el mes, `%d` el día, `%H:%M:%S` la hora. Si no lo pones, `logging` añade los milisegundos con una coma, así: `2026-09-19 14:28:32,722`. Para un fichero de registro que vayas a leer tú, el formato corto se agradece; para investigar un problema de rendimiento, los milisegundos son justo lo que necesitas.

> [!error] He llamado a basicConfig y no ha cambiado nada
>
> `basicConfig` **no hace nada si el registro ya está configurado**. Y se configura solo la primera vez que llamas a `logging.warning` o similar. Si en alguna parte del programa hay un `logging.warning` que se ejecuta antes de tu `basicConfig`, tu configuración se ignora en silencio.
>
> Ponlo lo más arriba posible, antes de cualquier mensaje. Y si no te queda más remedio, fuérzalo:
>
> ```python
> logging.basicConfig(level=logging.DEBUG, force=True)
> ```

> [!consejo] Pasa los datos como argumentos, no con f-strings
>
> Estas dos líneas hacen lo mismo:
>
> ```python
> registro.debug(f"Procesando el artículo {codigo}")   # se construye siempre
> registro.debug("Procesando el artículo %s", codigo)  # solo si se va a mostrar
> ```
>
> La diferencia es cuándo se construye el texto. Con la f-string, Python la monta siempre, aunque el nivel `DEBUG` esté apagado y el mensaje acabe en la basura. Con la segunda forma, `logging` solo junta las piezas si de verdad va a escribir la línea. En un bucle de un millón de vueltas con el `DEBUG` apagado, la diferencia se nota.

## A la pantalla y al fichero a la vez

`basicConfig` vale para empezar, pero en cuanto quieres dos destinos con reglas distintas hay que bajar un escalón. Las piezas de `logging` son tres:

- Un **registrador** (`Logger`), que es al que le hablas.
- Uno o varios **manejadores** (`Handler`), que deciden a dónde va cada mensaje.
- Un **formateador** (`Formatter`) por manejador, que decide qué aspecto tiene.

Cada pieza tiene su propio nivel, y el mensaje tiene que pasar los dos filtros: primero el del registrador y después el del manejador.

```python title="log3.py"
import logging
import sys

registro = logging.getLogger("inventario")
registro.setLevel(logging.DEBUG)

# A la pantalla, solo lo importante y sin fecha, que estorba.
a_pantalla = logging.StreamHandler(sys.stderr)
a_pantalla.setLevel(logging.WARNING)
a_pantalla.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))

# Al fichero, todo y con fecha, para poder investigar después.
a_fichero = logging.FileHandler("inventario.log", encoding="utf-8")
a_fichero.setLevel(logging.DEBUG)
a_fichero.setFormatter(
    logging.Formatter(
        "%(asctime)s %(levelname)-8s %(name)s:%(lineno)d %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)

registro.addHandler(a_pantalla)
registro.addHandler(a_fichero)

registro.debug("Conectando con la base de datos")
registro.info("Cargados 120 artículos")
registro.warning("El artículo A-45 no tiene precio")
registro.error("No se ha podido guardar el inventario")
```

En pantalla solo aparecen los dos últimos, cortos y directos:

```salida
WARNING: El artículo A-45 no tiene precio
ERROR: No se ha podido guardar el inventario
```

Y en el fichero han quedado los cuatro, con toda la información:

```text title="inventario.log"
2026-09-19 14:27:59 DEBUG    inventario:25 Conectando con la base de datos
2026-09-19 14:27:59 INFO     inventario:26 Cargados 120 artículos
2026-09-19 14:27:59 WARNING  inventario:27 El artículo A-45 no tiene precio
2026-09-19 14:27:59 ERROR    inventario:28 No se ha podido guardar el inventario
```

Esto es lo que quieres en una herramienta real: el usuario ve solo lo que le afecta, y cuando algo falla le pides el fichero de registro y tienes la historia completa.

> [!aviso] El nivel del registrador manda sobre el de los manejadores
>
> Si pusieras `registro.setLevel(logging.WARNING)`, el manejador del fichero no vería nunca un `DEBUG`, por mucho que su propio nivel fuera `DEBUG`. El registrador filtra primero y lo que descarta no llega a ningún sitio. Pon el nivel del registrador en el más permisivo de todos los que quieras y ajusta el resto en cada manejador.

## Conectarlo con la opción -v

El nivel de detalle no debería estar escrito en el código: debería poder cambiarlo quien usa la herramienta. La convención universal en la terminal es la opción `-v`, que se puede repetir para pedir más y más detalle.

`argparse` lo resuelve con `action="count"`, que cuenta cuántas veces aparece la opción:

```python title="log_v.py"
import argparse
import logging

NIVELES = [logging.WARNING, logging.INFO, logging.DEBUG]


def configurar_registro(cuenta_v: int) -> None:
        """Ajusta el nivel de detalle según cuántas veces se haya puesto -v."""
    nivel = NIVELES[min(cuenta_v, len(NIVELES) - 1)]
    logging.basicConfig(level=nivel, format="%(levelname)s: %(message)s")


def main() -> int:
        analizador = argparse.ArgumentParser(description="Sincroniza el inventario")
    analizador.add_argument(
        "-v", "--verboso",
        action="count",
        default=0,
        help="Más detalle en el registro. Se puede repetir: -v, -vv",
    )
    argumentos = analizador.parse_args()
    configurar_registro(argumentos.verboso)

    logging.debug("Nivel de detalle: %s", argumentos.verboso)
    logging.info("Sincronizando 120 artículos")
    logging.warning("El artículo A-45 no tiene precio")
    return 0


raise SystemExit(main())
```

```bash
python3 log_v.py
```

```salida
WARNING: El artículo A-45 no tiene precio
```

```bash
python3 log_v.py -v
```

```salida
INFO: Sincronizando 120 artículos
WARNING: El artículo A-45 no tiene precio
```

```bash
python3 log_v.py -vv
```

```salida
DEBUG: Nivel de detalle: 2
INFO: Sincronizando 120 artículos
WARNING: El artículo A-45 no tiene precio
```

El `min(cuenta_v, len(NIVELES) - 1)` evita el `IndexError` si a alguien le da por escribir `-vvvvv`: a partir de dos, ya no hay más detalle que dar. Y por coherencia, muchas herramientas añaden también un `-q` o `--silencioso` que sube el nivel a `ERROR`.

## Registrar una excepción entera

Dentro de un `except`, `logging.exception()` escribe el mensaje **y la traza completa**, sin que tengas que pasarle nada más:

```python title="log_exc.py"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def dividir(a: int, b: int) -> float:
        return a / b


try:
        dividir(10, 0)
except ZeroDivisionError:
        logging.exception("Ha fallado el cálculo del promedio")

print("El programa continúa")
```

```salida
ERROR: Ha fallado el cálculo del promedio
Traceback (most recent call last):
  File "/Users/erwin/curso-python/log_exc.py", line 11, in <module>
    dividir(10, 0)
    ~~~~~~~^^^^^^^
  File "/Users/erwin/curso-python/log_exc.py", line 7, in dividir
    return a / b
           ~~^~~
ZeroDivisionError: division by zero
El programa continúa
```

Esto resuelve el problema que dejaba abierto la lección de excepciones: hasta ahora, capturar una excepción para que el programa no muriera significaba perder la traza y quedarte con un mensaje pelado. Con `logging.exception` te quedas las dos cosas, el programa sigue vivo y en el fichero de registro está todo lo necesario para arreglarlo.

Tres detalles importantes:

- `logging.exception` **solo funciona dentro de un `except`**. Fuera, no hay ninguna excepción activa de la que sacar la traza.
- Registra siempre con nivel `ERROR`; no se puede cambiar.
- Si quieres la traza con otro nivel, usa el parámetro `exc_info=True`: `registro.warning("Fallo recuperable", exc_info=True)`.

## Un registrador por módulo

Hasta ahora hemos llamado a `logging.warning()` directamente. Eso usa un registrador especial llamado `root`, el que salía en `WARNING:root:...` al principio. Sirve para un programa de un solo fichero y se queda corto en cuanto hay varios.

La buena práctica es que **cada módulo cree el suyo** con esta línea exacta, al principio del fichero:

```python
registro = logging.getLogger(__name__)
```

`__name__` vale el nombre del módulo, así que cada fichero acaba con un registrador que se llama como él. Eso te da dos cosas: cada mensaje dice de dónde salió, y puedes subir o bajar el nivel de un módulo concreto sin tocar los demás.

```python title="almacen.py"
import logging

registro = logging.getLogger(__name__)


def guardar(articulo: str) -> None:
        registro.info("Guardando %s", articulo)
```

```python title="red.py"
import logging

registro = logging.getLogger(__name__)


def descargar(url: str) -> None:
        registro.warning("Reintentando la descarga de %s", url)
```

El programa principal es el único que configura el registro, y lo hace una sola vez:

```python title="principal.py"
import logging

import almacen
import red

logging.basicConfig(level=logging.DEBUG, format="%(levelname)-8s %(name)s | %(message)s")

registro = logging.getLogger(__name__)

registro.info("Arrancando la herramienta")
almacen.guardar("A-45")
red.descargar("https://api.ejemplo.es/precios")
logging.getLogger("red").setLevel(logging.ERROR)
red.descargar("https://api.ejemplo.es/stock")
registro.info("Terminado")
```

```salida
INFO     __main__ | Arrancando la herramienta
INFO     almacen | Guardando A-45
WARNING  red | Reintentando la descarga de https://api.ejemplo.es/precios
INFO     __main__ | Terminado
```

Mira la columna del nombre: `__main__` para el fichero que ejecutaste, `almacen` y `red` para los módulos. Y fíjate en la segunda llamada a `red.descargar`: no ha salido nada, porque una línea antes le subimos el nivel a ese módulo concreto. Los demás siguen igual.

> [!consejo] Una biblioteca nunca llama a basicConfig
>
> Es la regla que separa un módulo educado de uno maleducado. Si escribes un módulo que otros importan, crea tu registrador con `getLogger(__name__)` y emite mensajes, pero **no configures nada**: ni nivel, ni manejadores, ni formato. Quien use tu módulo decidirá si quiere ver esos mensajes y cómo. Configurar el registro es responsabilidad exclusiva del programa que arranca.

## Rotar el fichero cuando crece

Un fichero de registro al que se escribe sin parar acaba ocupando gigabytes. `RotatingFileHandler`, del submódulo `logging.handlers`, lo corta por tamaño: cuando el fichero llega al límite, lo renombra y empieza uno nuevo.

```python title="log_rota.py"
import logging
from logging.handlers import RotatingFileHandler

manejador = RotatingFileHandler(
    "rota.log",
    maxBytes=1024,        # 1 KB, ridículo a propósito para verlo rotar
    backupCount=3,        # conserva rota.log.1, rota.log.2 y rota.log.3
    encoding="utf-8",
)
manejador.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))

registro = logging.getLogger("sincronizacion")
registro.setLevel(logging.INFO)
registro.addHandler(manejador)

for numero in range(1, 101):
        registro.info("Artículo %03d sincronizado correctamente", numero)
```

```bash
python3 log_rota.py
ls -1 rota.log*
```

```salida
rota.log
rota.log.1
rota.log.2
rota.log.3
```

`rota.log` siempre es el actual, el que se está escribiendo ahora; `rota.log.1` es el anterior, y así hasta el `.3`. Cuando toca rotar otra vez, el `.3` se borra y los demás se desplazan. Con `maxBytes=1024` y `backupCount=3` nunca se ocuparán más de 4 KB, pase lo que pase y por muchos meses que el programa esté funcionando.

En un programa de verdad los valores razonables son del orden de `maxBytes=5_000_000` y `backupCount=5`: 25 MB como mucho, suficiente para investigar cualquier cosa.

> [!nota] También se puede rotar por tiempo
>
> Si lo que quieres es un fichero por día, `TimedRotatingFileHandler` hace lo mismo pero cortando por fecha: `TimedRotatingFileHandler("app.log", when="midnight", backupCount=7)` te deja el registro de la última semana, un fichero por día. Está en el mismo submódulo `logging.handlers`.

> [!aviso] No registres contraseñas ni datos personales
>
> Un fichero de registro se copia, se envía por correo cuando alguien pide ayuda, se sube a un servidor de errores y se guarda durante meses sin que nadie lo mire. Todo lo que escribas ahí deja de estar bajo tu control.
>
> Nunca registres contraseñas, tokens, números de tarjeta ni los datos personales completos de nadie. Si necesitas saber de qué usuario se trata, registra su identificador interno, no su correo. Y si tienes que registrar una clave para depurar, escribe solo los cuatro últimos caracteres:
>
> ```python
> registro.debug("Usando el token ...%s", token[-4:])
> ```
>
> En España esto no es solo buena educación: los datos personales en un registro entran de lleno en el Reglamento General de Protección de Datos.

> [!resumen] En resumen
>
> Los `print` de depuración no valen para un programa real porque no se pueden apagar, no dicen cuándo ni dónde ocurrieron y contaminan la salida útil. El módulo `logging` etiqueta cada mensaje con uno de cinco niveles, de `DEBUG` a `CRITICAL`, y muestra solo a partir del que tú elijas, que por defecto es `WARNING`. Todo sale por `stderr`. `basicConfig` configura el nivel, el formato con marcadores como `%(asctime)s` y `%(levelname)s`, y el formato de la fecha, y hay que llamarlo una sola vez y antes que cualquier mensaje. Para escribir a la pantalla y a un fichero con reglas distintas se usan dos manejadores, cada uno con su nivel y su formateador, teniendo en cuenta que el nivel del registrador filtra primero. El nivel se conecta con la línea de comandos mediante una opción `-v` con `action="count"`. Dentro de un `except`, `logging.exception` registra el mensaje junto con la traza completa. Cada módulo debe crear su propio registrador con `logging.getLogger(__name__)`, y solo el programa principal configura nada. `RotatingFileHandler` evita que el fichero crezca sin límite. Y en el registro no entran nunca contraseñas ni datos personales.

> [!ejercicio] Practica
>
> Crea `18-registro.py` y resuelve:
>
> 1. Escribe un programa que emita un mensaje de cada uno de los cinco niveles. Ejecútalo sin configurar nada y anota cuáles salen y cuáles no.
> 2. Añade `basicConfig` con nivel `DEBUG`, fecha con `%H:%M:%S` y un formato que incluya el nivel alineado a ocho caracteres y el número de línea. Comprueba que ahora salen los cinco.
> 3. Monta dos manejadores: uno a pantalla desde `WARNING` con formato corto y otro a `mi-herramienta.log` desde `DEBUG` con fecha. Ejecuta y compara lo que ves con lo que hay en el fichero.
> 4. Añade una opción `-v` repetible con `action="count"` que mueva el nivel entre `WARNING`, `INFO` y `DEBUG`. Pruébala sin la opción, con `-v` y con `-vvv`.
> 5. Provoca un `ZeroDivisionError` dentro de un `try`, captúralo y regístralo con `logging.exception`. Comprueba que la traza completa acaba en el fichero y que el programa continúa.
> 6. Parte el programa en dos módulos, cada uno con su `logging.getLogger(__name__)`, configura el registro solo en el principal y después sube el nivel de uno de los dos módulos a `ERROR` para comprobar que el otro no se entera.
