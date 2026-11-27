---
titulo: "Proyecto: gestor de gastos"
resumen: "Una herramienta de gastos personales con subcomandos, almacenamiento en CSV, dinero exacto con Decimal y resumen con gráfico de barras."
minutos: 61
orden: 27
---

En la lección de números del módulo anterior quedó una promesa pendiente. Decía así: "si tu programa maneja euros y céntimos, los errores de redondeo se acumulan y acaban descuadrando cuentas. Lo veremos en el módulo de aplicaciones de terminal, cuando construyamos una herramienta de gastos".

Esta es esa herramienta, y es el proyecto central del módulo. Tiene subcomandos como `git`, guarda los datos en un CSV que puedes abrir con una hoja de cálculo, se configura con un fichero JSON, saca tablas en color y dibuja un gráfico de barras en la terminal. Y maneja el dinero como hay que manejarlo.

> [!objetivo] Qué vas a aprender
>
> Construir una aplicación de terminal con subcomandos (`añadir`, `listar`, `resumen`, `borrar`, `exportar`), una dataclass `Gasto`, una capa de almacenamiento en CSV separada de la interfaz, dinero exacto con `Decimal`, fechas con `datetime`, salida en tablas alineadas y con color, configuración en un fichero JSON y un empaquetado que convierte todo eso en un comando `gastos` instalable.

## Cómo se va a usar

La herramienta terminada se maneja así:

```bash
gastos añadir 12,50 comida "Menú del día"
gastos listar --mes 2026-09 --categoria comida
gastos resumen --mes 2026-09
gastos borrar 6
gastos exportar gastos-septiembre.json --mes 2026-09
```

Y la vista que justifica el proyecto entero es esta:

```salida
Resumen de 2026-09

CATEGORÍA          IMPORTE       %  GRÁFICO
--------------------------------------------------------------------
hogar             129.99 €   42.1%  ████████████████████████████████
ocio               81.99 €   26.5%  ████████████████████▏
transporte         49.30 €   15.9%  ████████████▏
comida             47.85 €   15.5%  ███████████▊
--------------------------------------------------------------------
TOTAL             309.13 €
```

En la terminal, cada categoría sale de un color y los totales en negrita. Aquí se ve en blanco y negro porque la salida está capturada a un fichero, y ya veremos que eso el programa lo detecta solo.

## Antes de nada: por qué no se puede usar float

Un gasto es un número con dos decimales. La tentación es guardarlo en un `float` y seguir adelante. Mira lo que pasa:

```python
from decimal import Decimal

gastos_float = [12.50, 8.20, 27.15, 54.30, 0.1, 0.2]
gastos_decimal = [Decimal("12.50"), Decimal("8.20"), Decimal("27.15"),
                  Decimal("54.30"), Decimal("0.1"), Decimal("0.2")]

print(sum(gastos_float))
print(sum(gastos_decimal))
print(sum(gastos_float) == 102.45)
print(sum(gastos_decimal) == Decimal("102.45"))
print(Decimal("0.1") + Decimal("0.2"))
print(Decimal(0.1))
```

```salida
102.44999999999999
102.45
False
True
0.3
0.1000000000000000055511151231257827021181583404541015625
```

Seis gastos han bastado para descuadrar la suma. No es un fallo de Python: los `float` se guardan en binario, y `0.1` en binario es periódico igual que un tercio en decimal, así que lo que se guarda es *casi* 0.1. La última línea lo enseña sin maquillaje.

Un céntimo de nada en una suma no importa. Importa cuando ese resultado se compara con `==` para cuadrar un arqueo, cuando se acumulan diez mil líneas, o cuando alguien mira el total y no le sale.

El módulo `decimal` guarda los números en base diez, como los escribimos. Tres reglas y ya lo sabes usar:

- **Se construye desde una cadena**, no desde un `float`. `Decimal("0.1")` es exactamente una décima; `Decimal(0.1)` arrastra la basura del `float`, como se ve en la última línea del ejemplo.
- **Suma, resta y multiplica exacto.** La división puede dar decimales infinitos, y ahí sí hay que redondear.
- **`quantize` fija los decimales.** `importe.quantize(Decimal("0.01"))` deja dos, que es lo que tiene el euro.

> [!nota] La otra solución: trabajar en céntimos
>
> La alternativa clásica es guardarlo todo en enteros de céntimos: 12,50 € son 1250. Los enteros de Python son exactos y no tienen límite de tamaño, así que funciona perfectamente, y es lo que hacen muchos sistemas bancarios. El precio es que hay que dividir por cien cada vez que se enseña un importe y multiplicar por cien cada vez que se lee uno, y se acaba colando un `/ 100` donde no tocaba. `Decimal` hace el mismo trabajo sin que tengas que acordarte.

## El diseño

Seis módulos, partidos por la línea que ya conoces: los que saben de dinero y los que saben de pantalla.

```text title="estructura del proyecto"
gastos/
    pyproject.toml        Metadatos y el comando gastos
    src/
        gastos/
            __init__.py
            modelo.py         La dataclass Gasto y las conversiones desde texto
            almacen.py        Leer y escribir el CSV
            configuracion.py  Moneda y ruta de los datos
            informes.py       Totales por categoría y barras
            presentacion.py   Colores y tablas
            cli.py            Argumentos, subcomandos y códigos de salida
            __main__.py       Permite python3 -m gastos
```

| Módulo | De qué se encarga | ¿Imprime? |
| --- | --- | --- |
| `modelo.py` | Qué es un gasto y cómo se valida | No |
| `almacen.py` | El CSV: cargar, guardar, filtrar, borrar | No |
| `configuracion.py` | De dónde salen la moneda y la ruta | No |
| `informes.py` | Los cálculos del resumen | No |
| `presentacion.py` | Colores, tablas y gráficos | Sí |
| `cli.py` | Traducir la línea de comandos en llamadas | Sí |

Las cuatro primeras filas no saben que existe una terminal. Podrías poner este programa detrás de una web sin tocarlas.

> [!nota] Por qué src/
>
> La carpeta `src/` no es una manía. Sin ella, al ejecutar Python desde la raíz del proyecto, el paquete `gastos` se encuentra por estar en la carpeta actual, no por estar instalado, y puedes pasarte semanas sin darte cuenta de que tu `pyproject.toml` está mal. Con `src/`, la única forma de importar `gastos` es habiéndolo instalado, así que lo pruebas como lo va a usar la gente. Es lo que viste en la lección de estructura de un proyecto y aquí se aplica tal cual.

## Parte 1: el modelo

El dato central, y las conversiones desde texto, que es como llega todo desde la terminal.

```python title="src/gastos/modelo.py"
"""El dato central del programa: un gasto, y cómo se convierte desde texto."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

CENTIMOS = Decimal("0.01")


@dataclass
class Gasto:
        """Un gasto apuntado: cuándo, en qué, cuánto."""

    identificador: int
    fecha: date
    categoria: str
    concepto: str
    importe: Decimal

    @property
    def mes(self) -> str:
                """El mes del gasto en formato aaaa-mm, que es como se filtra."""
        return self.fecha.strftime("%Y-%m")

    def __str__(self) -> str:
                return f"[{self.identificador}] {self.fecha} {self.categoria}: {self.concepto} ({self.importe})"


def a_importe(texto: str) -> Decimal:
        """Convierte texto en un importe exacto de dos decimales.

    Acepta la coma decimal española y el símbolo del euro.
    """
    limpio = texto.strip().replace("€", "").replace(" ", "").replace(",", ".")
    try:
                importe = Decimal(limpio)
    except InvalidOperation:
                raise ValueError(f"'{texto}' no es un importe") from None
    if importe <= 0:
                raise ValueError("el importe tiene que ser mayor que cero")
    if importe.as_tuple().exponent < -2:
                raise ValueError("el importe no puede tener más de dos decimales")
    return importe.quantize(CENTIMOS)


def a_fecha(texto: str) -> date:
        """Convierte texto en fecha. Solo admite el formato aaaa-mm-dd."""
    try:
                return date.fromisoformat(texto)
    except ValueError:
                raise ValueError(f"'{texto}' no es una fecha aaaa-mm-dd") from None


def a_mes(texto: str) -> str:
        """Valida un mes en formato aaaa-mm y lo devuelve tal cual."""
    try:
                date.fromisoformat(f"{texto}-01")
    except ValueError:
                raise ValueError(f"'{texto}' no es un mes aaaa-mm") from None
    return texto


def a_categoria(texto: str) -> str:
        """Normaliza la categoría: sin espacios sobrantes y en minúsculas."""
    categoria = texto.strip().lower()
    if not categoria:
                raise ValueError("la categoría no puede estar vacía")
    return categoria
```

Las decisiones:

- **La fecha es un `date` de verdad**, no una cadena como en el gestor de tareas del módulo anterior. Allí se guardaba como texto porque JSON no sabe escribir fechas; aquí el CSV tampoco, pero el programa necesita agrupar por mes y comparar, así que se convierte al leer y al escribir, y dentro del programa siempre es un objeto.
- **`mes` es una propiedad** que calcula `"2026-09"` a partir de la fecha. Es el dato por el que se filtra, y deducirlo evita guardarlo dos veces.
- **Las cuatro funciones de conversión viven aquí y no en `cli.py`.** Son reglas del negocio: qué es un importe válido no depende de si el dato entró por teclado, por un fichero o por una web. Que estén en el modelo permite que `almacen.py` las use también al leer el CSV, y así los datos se validan siempre igual.
- **Se acepta la coma decimal.** Quien escribe en español teclea `12,50` sin pensar. Rechazarlo sería tener razón y perder al usuario. También se quita el `€` y los espacios, por si alguien copia y pega.
- **Todas lanzan `ValueError`**, que es la excepción estándar de "este valor no vale". Ninguna imprime nada ni sabe nada de `argparse`.
- **`raise ... from None`** corta el encadenado de excepciones. Sin él, el mensaje que ve quien usa el programa vendría precedido de un "During handling of the above exception, another exception occurred" y del `InvalidOperation` original, que no le dice nada a nadie.
- **`as_tuple().exponent`** da el número de decimales. Sin esa comprobación, `12.999` se redondearía a `13.00` en silencio, y redondear el dinero de otro sin avisar no es aceptable.

## Parte 2: el almacén

Aquí se decide el formato del fichero. Un CSV, por tres razones: se abre con cualquier hoja de cálculo, se puede mirar y corregir con un editor de texto, y crece bien cuando hay miles de líneas.

```python title="src/gastos/almacen.py"
"""Guardar y recuperar los gastos en un CSV. No sabe nada de la pantalla."""

import csv
from decimal import Decimal
from pathlib import Path

from .modelo import CENTIMOS, Gasto, a_fecha, a_importe

CAMPOS = ["identificador", "fecha", "categoria", "concepto", "importe"]


class ErrorDeAlmacen(Exception):
        """El fichero de datos existe pero no se puede usar."""


class Almacen:
        """La lista de gastos en memoria y su fichero CSV en disco."""

    def __init__(self, ruta: Path):
                self.ruta = Path(ruta)
        self.gastos: list[Gasto] = []

    def __len__(self) -> int:
                return len(self.gastos)

    def cargar(self) -> None:
                """Lee el CSV. Si no existe, se empieza con la lista vacía."""
        if not self.ruta.exists():
                        self.gastos = []
            return
        gastos = []
        with open(self.ruta, encoding="utf-8", newline="") as fichero:
                        for numero, fila in enumerate(csv.DictReader(fichero), start=2):
                                try:
                                        gastos.append(Gasto(
                        identificador=int(fila["identificador"]),
                        fecha=a_fecha(fila["fecha"]),
                        categoria=fila["categoria"],
                        concepto=fila["concepto"],
                        importe=a_importe(fila["importe"]),
                    ))
                except (KeyError, TypeError, ValueError) as error:
                                        raise ErrorDeAlmacen(
                        f"{self.ruta}, línea {numero}: {error}"
                    ) from error
        self.gastos = gastos

    def guardar(self) -> None:
                """Escribe el CSV entero, primero en un temporal y luego encima."""
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        temporal = self.ruta.with_suffix(".csv.tmp")
        with open(temporal, "w", encoding="utf-8", newline="") as fichero:
                        escritor = csv.DictWriter(fichero, fieldnames=CAMPOS)
            escritor.writeheader()
            for gasto in sorted(self.gastos, key=lambda gasto: (gasto.fecha, gasto.identificador)):
                                escritor.writerow({
                    "identificador": gasto.identificador,
                    "fecha": gasto.fecha.isoformat(),
                    "categoria": gasto.categoria,
                    "concepto": gasto.concepto,
                    "importe": f"{gasto.importe:.2f}",
                })
        temporal.replace(self.ruta)
```

Las decisiones de estos dos métodos:

- **El CSV se lee con `DictReader` y se escribe con `DictWriter`**, con `encoding="utf-8"` y `newline=""` en los dos, tal como quedó dicho en la lección de CSV. Sin `newline=""`, un concepto con un salto de línea dentro rompe la lectura, y en Windows el fichero sale con una línea en blanco entre cada dos.
- **La numeración de líneas empieza en 2.** `enumerate(..., start=2)` cuenta la cabecera, así que cuando el programa dice "línea 7" es la línea 7 del fichero que vas a abrir con el editor. Decir "línea 6" y que no cuadre es la clase de detalle que hace perder diez minutos.
- **Un CSV corrupto lanza `ErrorDeAlmacen`, una excepción propia.** El almacén no puede decidir qué hacer ante un fichero ilegible: ¿avisar y seguir?, ¿parar?, ¿preguntar? Esa es una decisión de interfaz, así que el almacén informa y la capa de arriba decide. Y como es una clase propia, `cli.py` puede capturarla sin capturar de paso cualquier `ValueError` que venga de otro sitio.
- **El importe se escribe con `f"{gasto.importe:.2f}"`** y no con `str()`. Un `Decimal("9")` se imprimiría como `9` y en el fichero de dinero queremos `9.00`.
- **Se ordena al guardar**, por fecha y en caso de empate por identificador. Un fichero de datos ordenado se lee a ojo y se compara con el de ayer.
- **Y lo más importante: se escribe en un temporal y luego `replace`.** Escribir encima del fichero de datos es el momento más peligroso de todo el programa: si el disco se llena o se corta la luz a mitad, el `open(..., "w")` ya ha vaciado tu fichero y lo que queda es medio CSV. Con un temporal, el original no se toca hasta el final, y `Path.replace()` hace el cambio en una sola operación del sistema de ficheros. O tienes el fichero viejo entero o el nuevo entero, nunca la mitad de ninguno.

> [!consejo] Escribir-y-renombrar, el patrón de las tres líneas
>
> Guárdate este patrón para cualquier programa que reescriba un fichero que importe:
>
> ```python
> temporal = ruta.with_suffix(".tmp")
> temporal.write_text(contenido, encoding="utf-8")
> temporal.replace(ruta)
> ```
>
> Cuesta una línea más que escribir directamente y elimina toda una familia de desastres. Lo usan por dentro los editores de texto, los navegadores y los gestores de paquetes.

El resto de la clase son las operaciones sobre la lista, sin ninguna sorpresa:

```python title="src/gastos/almacen.py"
        def siguiente_identificador(self) -> int:
                if not self.gastos:
                        return 1
        return max(gasto.identificador for gasto in self.gastos) + 1

    def anadir(self, fecha, categoria: str, concepto: str, importe: Decimal) -> Gasto:
                concepto = concepto.strip()
        if not concepto:
                        raise ValueError("el concepto no puede estar vacío")
        gasto = Gasto(self.siguiente_identificador(), fecha, categoria, concepto, importe)
        self.gastos.append(gasto)
        return gasto

    def buscar(self, identificador: int) -> Gasto | None:
                for gasto in self.gastos:
                        if gasto.identificador == identificador:
                                return gasto
        return None

    def borrar(self, identificador: int) -> Gasto | None:
                gasto = self.buscar(identificador)
        if gasto is not None:
                        self.gastos.remove(gasto)
        return gasto

    def filtrar(self, mes: str | None = None, categoria: str | None = None) -> list[Gasto]:
                """Devuelve los gastos que cumplen los filtros, ordenados por fecha."""
        seleccion = self.gastos
        if mes is not None:
                        seleccion = [gasto for gasto in seleccion if gasto.mes == mes]
        if categoria is not None:
                        seleccion = [gasto for gasto in seleccion if gasto.categoria == categoria]
        return sorted(seleccion, key=lambda gasto: (gasto.fecha, gasto.identificador))

    def meses(self) -> list[str]:
                return sorted({gasto.mes for gasto in self.gastos})


def total(gastos: list[Gasto]) -> Decimal:
        """Suma exacta de una lista de gastos."""
    return sum((gasto.importe for gasto in gastos), Decimal("0")).quantize(CENTIMOS)
```

Dos detalles que merecen la pena:

- **`filtrar` acumula filtros con `None` como "sin filtro".** Cada `if` reduce la selección, y llamarla sin argumentos devuelve todo ordenado. Es mucho más fácil de ampliar que una condición gigante, y cada filtro es una comprensión de una línea.
- **`sum` lleva un segundo argumento, `Decimal("0")`.** Sin él, `sum` empieza en el entero `0` y sumar un `int` con un `Decimal` funciona, pero con la lista vacía devolvería el `int` `0` en lugar de un `Decimal`, y el `.quantize` de después fallaría. El valor inicial de la suma marca el tipo del resultado.

Probando el almacén sin nada de interfaz:

```python
from datetime import date
from pathlib import Path

from gastos.almacen import Almacen, total
from gastos.modelo import a_importe

almacen = Almacen(Path("prueba/demo.csv"))
almacen.cargar()

almacen.anadir(date(2026, 9, 1), "comida", "Menú del día", a_importe("12,50"))
almacen.anadir(date(2026, 9, 3), "comida", "Café y tostada", a_importe("8.20"))
almacen.anadir(date(2026, 8, 28), "ocio", "Cine", a_importe("9"))
almacen.guardar()

print(len(almacen))
print(total(almacen.gastos))
print([gasto.identificador for gasto in almacen.filtrar(mes="2026-09")])
print(almacen.meses())

otro = Almacen(Path("prueba/demo.csv"))
otro.cargar()
print(otro.filtrar() == almacen.filtrar())
print(Path("prueba/demo.csv").read_text(encoding="utf-8"))
```

```salida
3
29.70
[1, 2]
['2026-08', '2026-09']
True
identificador,fecha,categoria,concepto,importe
3,2026-08-28,ocio,Cine,9.00
1,2026-09-01,comida,Menú del día,12.50
2,2026-09-03,comida,Café y tostada,8.20
```

El `True` de la penúltima línea es la prueba de que el viaje de ida y vuelta no ha perdido nada: se guardó, se leyó en un objeto nuevo y los gastos salen iguales, importes `Decimal` y fechas `date` incluidos. Funciona gracias al `__eq__` que genera la dataclass. Se comparan los resultados de `filtrar()` y no las listas en bruto porque en memoria están en el orden en que se añadieron y en el fichero están ordenados por fecha.

## Parte 3: la configuración

Dos cosas tienen que poder cambiarse sin tocar el código: la moneda y dónde viven los datos.

```python title="src/gastos/configuracion.py"
"""De dónde salen la moneda y la ruta de los datos."""

import json
import os
from dataclasses import dataclass
from pathlib import Path

RUTA_CONFIGURACION_POR_DEFECTO = Path.home() / ".config" / "gastos" / "configuracion.json"
RUTA_DATOS_POR_DEFECTO = Path.home() / ".local" / "share" / "gastos" / "gastos.csv"


@dataclass
class Configuracion:
        """Los ajustes del programa, ya resueltos."""

    moneda: str = "€"
    datos: Path = RUTA_DATOS_POR_DEFECTO
    ancho_barra: int = 32


def ruta_configuracion() -> Path:
        """La ruta del fichero de ajustes, que GASTOS_CONFIG puede cambiar."""
    variable = os.environ.get("GASTOS_CONFIG")
    if variable:
                return Path(variable).expanduser()
    return RUTA_CONFIGURACION_POR_DEFECTO


def cargar_configuracion() -> Configuracion:
        """Lee el fichero de ajustes si existe y rellena lo que falte por defecto."""
    ruta = ruta_configuracion()
    if not ruta.exists():
                return Configuracion()

    try:
                datos = json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
                raise ValueError(f"{ruta} no es un JSON válido: {error}") from error
    if not isinstance(datos, dict):
                raise ValueError(f"{ruta} debería contener un objeto JSON")

    configuracion = Configuracion()
    if "moneda" in datos:
                configuracion.moneda = str(datos["moneda"])
    if "datos" in datos:
                configuracion.datos = Path(str(datos["datos"])).expanduser()
    if "ancho_barra" in datos:
                configuracion.ancho_barra = int(datos["ancho_barra"])
    return configuracion
```

El fichero de ajustes tiene esta pinta:

```text title="~/.config/gastos/configuracion.json"
{
  "moneda": "€",
  "datos": "~/Documentos/gastos.csv",
  "ancho_barra": 28
}
```

Hay tres niveles, y el orden importa:

| Nivel | Quién manda | Para qué |
| --- | --- | --- |
| 1. Valores por defecto | La dataclass `Configuracion` | Que el programa funcione recién instalado, sin configurar nada |
| 2. Fichero de ajustes | `~/.config/gastos/configuracion.json` | Tus preferencias, que no cambian |
| 3. Opción `--datos` | La línea de comandos | Esta vez y solo esta vez |

Cada nivel pisa al anterior, y es el orden que siguen casi todas las herramientas de terminal. Los detalles:

- **La configuración es una dataclass con valores por defecto**, no un diccionario. Así `configuracion.moneda` se completa solo en el editor y un error de escritura salta al momento, en vez de devolver `None` desde un `.get("monneda")`.
- **Falta el fichero, no pasa nada.** La primera ejecución no tiene ajustes y no debe dar un error; devuelve los valores por defecto.
- **Fichero ilegible sí es un error**, y se lanza como `ValueError` para que `cli.py` lo cuente con su formato. Callarse un JSON roto significaría usar la ruta por defecto y que el usuario no encuentre sus gastos.
- **Cada clave se lee con un `if` propio.** Un fichero con solo `{"moneda": "$"}` es válido y las otras dos claves se quedan por defecto. Si se hubiera hecho `Configuracion(**datos)`, una clave desconocida tiraría el programa con `TypeError`.
- **`expanduser()`** convierte el `~` en la carpeta del usuario. Dentro de un JSON, `~` es un carácter más: nadie lo expande por ti.
- **`GASTOS_CONFIG` cambia dónde se busca el fichero.** Es lo que permite tener un juego de datos para las pruebas sin tocar los de verdad, y es lo que se usa en toda esta lección.

> [!nota] Por qué \~/.config y no una carpeta junto al programa
>
> En Linux y macOS la costumbre es `~/.config/nombre/` para los ajustes y `~/.local/share/nombre/` para los datos, y viene de una norma llamada *XDG Base Directory*. Respetarla significa que tus copias de seguridad ya incluyen los datos del programa y que desinstalarlo no se lleva por delante tu historial. En Windows el equivalente es `%APPDATA%`, y para cubrir los dos casos hay bibliotecas como `platformdirs`; con la biblioteca estándar, `Path.home()` y una convención sencilla bastan para una herramienta personal.

## Parte 4: el resumen y las barras

Los cálculos del informe, tres funciones cortas y ni un `print`:

```python title="src/gastos/informes.py"
"""Los cálculos del resumen: totales por categoría y barras de texto."""

from decimal import Decimal

from .modelo import CENTIMOS, Gasto

# El bloque lleno y los ocho anchos parciales, del más estrecho al lleno.
OCTAVOS = " ▏▎▍▌▋▊▉█"


def totales_por_categoria(gastos: list[Gasto]) -> list[tuple[str, Decimal]]:
        """Suma por categoría, de mayor a menor gasto."""
    acumulado: dict[str, Decimal] = {}
    for gasto in gastos:
                acumulado[gasto.categoria] = acumulado.get(gasto.categoria, Decimal("0")) + gasto.importe
    parejas = [(categoria, suma.quantize(CENTIMOS)) for categoria, suma in acumulado.items()]
    return sorted(parejas, key=lambda par: (-par[1], par[0]))


def barra(valor: Decimal, maximo: Decimal, ancho: int) -> str:
        """Dibuja una barra proporcional con bloques, con resolución de un octavo."""
    if maximo <= 0 or valor <= 0:
                return ""
    octavos = int(valor / maximo * ancho * 8)
    octavos = max(octavos, 1)
    enteros, resto = divmod(octavos, 8)
    return OCTAVOS[8] * enteros + (OCTAVOS[resto] if resto else "")


def porcentaje(valor: Decimal, total: Decimal) -> Decimal:
        """El peso de un importe sobre el total, con un decimal."""
    if total <= 0:
                return Decimal("0.0")
    return (valor / total * 100).quantize(Decimal("0.1"))
```

```python
from decimal import Decimal

from gastos.informes import barra

maximo = Decimal("62.00")
for valor in ["62.00", "45.90", "20.70", "3.00", "0.40"]:
        print(f"{valor:>6} |{barra(Decimal(valor), maximo, 20)}|")
```

```salida
 62.00 |████████████████████|
 45.90 |██████████████▊|
 20.70 |██████▋|
  3.00 |▉|
  0.40 |▏|
```

Las decisiones:

- **Los bloques parciales dan ocho veces más resolución.** Unicode trae ocho caracteres de bloque de anchos crecientes, y con ellos una barra de veinte caracteres distingue ciento sesenta niveles en vez de veinte. Por eso `45.90` no se confunde con `48.00`.
- **La cuenta se hace en octavos.** Se calcula el ancho total en octavos, `divmod` lo parte en bloques enteros y resto, y el resto elige el carácter parcial. La cadena `OCTAVOS` empieza por un espacio para que el índice `0` sea "nada".
- **`max(octavos, 1)`** garantiza que un importe pequeño pero real deje una marca visible. Una barra vacía junto a un importe distinto de cero parece un fallo, como se ve en la última línea del ejemplo.
- **El orden es por importe descendente y, en caso de empate, alfabético.** La clave `(-par[1], par[0])` hace las dos cosas a la vez: negar el importe invierte el criterio numérico sin invertir el del texto. Es el truco que ya viste en la lección de ordenar.
- **El acumulado usa `.get(categoria, Decimal("0"))`.** Un `Counter` no sirve aquí: está pensado para contar enteros, y sumar `Decimal` con él da problemas en cuanto se mezcla con su cero implícito.

## Parte 5: la presentación

Esta capa es la única que imprime. Dos ideas nuevas.

```python title="src/gastos/presentacion.py"
"""Todo lo que se ve: colores, tablas y gráficos. Aquí sí se imprime."""

import os
import sys
from decimal import Decimal

from .informes import barra, porcentaje, totales_por_categoria
from .modelo import Gasto

NORMAL = "\033[0m"
NEGRITA = "\033[1m"
APAGADO = "\033[2m"
ROJO = "\033[31m"

# Colores que se reparten entre las categorías: cian, verde, amarillo, magenta, azul.
PALETA = ["\033[36m", "\033[32m", "\033[33m", "\033[35m", "\033[34m"]

ANCHO_CONCEPTO = 28
ANCHO_CATEGORIA = 12


def quiere_color(modo: str, flujo=sys.stdout) -> bool:
        """Decide si se pinta en color: por opción, por entorno o por destino."""
    if modo == "nunca":
                return False
    if modo == "siempre":
                return True
    if os.environ.get("NO_COLOR"):
                return False
    return flujo.isatty()


class Pintor:
        """Envuelve texto en códigos ANSI, o no hace nada si el color está apagado."""

    def __init__(self, activo: bool):
                self.activo = activo

    def pinta(self, texto: str, *codigos: str) -> str:
                if not self.activo or not codigos:
                        return texto
        return "".join(codigos) + texto + NORMAL

    def color_de(self, categoria: str) -> str:
                """Un color estable para cada categoría, el mismo en todas las ejecuciones."""
        return PALETA[sum(ord(letra) for letra in categoria) % len(PALETA)]
```

La primera idea es **el color se apaga solo cuando no hay nadie mirando**. `flujo.isatty()` devuelve `True` si la salida va a una terminal y `False` si va a un fichero o a una tubería. Sin esa comprobación, esto dejaría basura:

```bash
gastos listar > gastos.txt
```

El fichero se llenaría de `\033[36m` y compañía, y peor todavía: encadenar la salida con `grep` fallaría porque las secuencias de escape se meten en medio de las palabras. Las tres condiciones de `quiere_color` son el estándar de hecho: la opción explícita manda sobre todo, la variable de entorno `NO_COLOR` la respetan cada vez más herramientas, y en último término se mira a dónde va la salida.

La segunda idea es **el color de cada categoría tiene que ser el mismo siempre**. La tentación es usar `hash(categoria) % len(PALETA)`, y es un error clásico: Python aleatoriza el hash de las cadenas en cada arranque del intérprete por seguridad, así que `comida` saldría verde una vez y azul la siguiente. Sumar los códigos de los caracteres con `ord` da un número que no cambia nunca.

> [!aviso] El color no ocupa ancho, pero sí ocupa caracteres
>
> Este es el fallo que se comete la primera vez que se mezclan colores y tablas:
>
> ```python
> print(f"{VERDE}{categoria}{NORMAL:<12}")   # mal
> print(f"{VERDE}{categoria:<12}{NORMAL}")   # bien
> ```
>
> En la primera línea se rellena hasta doce caracteres el código de apagado, no el texto. En la segunda se formatea primero y se pinta después, que es el orden correcto. La regla: **dale el ancho al texto, no al color.** Por eso, en el código de abajo, cada celda se construye con su `f"{...:<12}"` en una variable y solo después se pasa por el pintor.

```python title="src/gastos/presentacion.py"
def importe_con_moneda(importe: Decimal, moneda: str) -> str:
        return f"{importe:,.2f} {moneda}".replace(",", " ")


def tabla_gastos(gastos: list[Gasto], moneda: str, pintor: Pintor) -> None:
        """Pinta la lista de gastos en columnas alineadas."""
    cabecera = (
        f"{'ID':>4}  {'FECHA':<10}  {'CATEGORÍA':<{ANCHO_CATEGORIA}}  "
        f"{'CONCEPTO':<{ANCHO_CONCEPTO}}  {'IMPORTE':>12}"
    )
    print(pintor.pinta(cabecera, NEGRITA))
    print(pintor.pinta("-" * len(cabecera), APAGADO))

    for gasto in gastos:
                categoria = f"{gasto.categoria[:ANCHO_CATEGORIA]:<{ANCHO_CATEGORIA}}"
        concepto = f"{gasto.concepto[:ANCHO_CONCEPTO]:<{ANCHO_CONCEPTO}}"
        importe = f"{importe_con_moneda(gasto.importe, moneda):>12}"
        print(
            f"{gasto.identificador:>4}  "
            f"{pintor.pinta(gasto.fecha.isoformat(), APAGADO)}  "
            f"{pintor.pinta(categoria, pintor.color_de(gasto.categoria))}  "
            f"{concepto}  "
            f"{pintor.pinta(importe, NEGRITA)}"
        )


def tabla_resumen(gastos: list[Gasto], moneda: str, ancho_barra: int, pintor: Pintor) -> None:
        """Pinta los totales por categoría con su gráfico de barras."""
    totales = totales_por_categoria(gastos)
    suma = sum((importe for _, importe in totales), Decimal("0"))
    mayor = totales[0][1]

    cabecera = f"{'CATEGORÍA':<{ANCHO_CATEGORIA}}  {'IMPORTE':>12}  {'%':>6}  GRÁFICO"
    print(pintor.pinta(cabecera, NEGRITA))
    print(pintor.pinta("-" * (len(cabecera) + ancho_barra - 7), APAGADO))

    for categoria, importe in totales:
                nombre = f"{categoria[:ANCHO_CATEGORIA]:<{ANCHO_CATEGORIA}}"
        peso = f"{porcentaje(importe, suma):>5.1f}%"
        dibujo = barra(importe, mayor, ancho_barra)
        print(
            f"{pintor.pinta(nombre, pintor.color_de(categoria))}  "
            f"{importe_con_moneda(importe, moneda):>12}  {peso}  "
            f"{pintor.pinta(dibujo, pintor.color_de(categoria))}"
        )

    print(pintor.pinta("-" * (len(cabecera) + ancho_barra - 7), APAGADO))
    total = f"{'TOTAL':<{ANCHO_CATEGORIA}}  {importe_con_moneda(suma, moneda):>12}"
    print(pintor.pinta(total, NEGRITA))


def aviso(mensaje: str, pintor: Pintor) -> None:
        """Un mensaje de error por stderr, en rojo si hay color."""
    print(pintor.pinta(f"gastos: {mensaje}", ROJO), file=sys.stderr)
```

Dos detalles más:

- **Los textos se recortan antes de rellenar**, con `gasto.concepto[:ANCHO_CONCEPTO]`. Un concepto de cuarenta caracteres desplazaría la columna del importe y rompería la alineación de esa fila.
- **La barra se dibuja contra el mayor de los totales**, no contra la suma. Así la categoría más cara siempre llena la barra entera y las demás se comparan con ella, que es lo que el ojo quiere ver. El porcentaje, en cambio, sí se calcula sobre la suma, porque ahí lo que interesa es el reparto.

## Parte 6: los subcomandos

Cinco subcomandos, cada uno con sus opciones. La pieza que los une es `set_defaults(funcion=...)`.

```python title="src/gastos/cli.py"
def validador(conversor):
        """Convierte una función de modelo.py en un type= de argparse."""
    def convertir(texto: str):
                try:
                        return conversor(texto)
        except ValueError as error:
                        raise argparse.ArgumentTypeError(str(error)) from None
    convertir.__name__ = conversor.__name__
    return convertir
```

Esta función de seis líneas es el puente entre las dos capas. El modelo lanza `ValueError`, que es lo correcto para una regla de negocio que no sabe nada de terminales. Pero `argparse` quiere `ArgumentTypeError` para poder enseñar su mensaje de uso y salir con el código 2. `validador` toma una función del modelo y devuelve otra que hace lo mismo y traduce la excepción. Es una función que recibe una función y devuelve una función, exactamente como las que viste en la lección de funciones.

```python title="src/gastos/cli.py"
        subcomandos = analizador.add_subparsers(dest="subcomando", metavar="SUBCOMANDO")
    subcomandos.required = True

    anadir = subcomandos.add_parser(
        "añadir", aliases=["anadir"], help="apunta un gasto nuevo",
        description="Apunta un gasto nuevo.",
    )
    anadir.add_argument("importe", type=validador(a_importe), help="cuánto, por ejemplo 12,50")
    anadir.add_argument("categoria", type=validador(a_categoria), help="comida, transporte, ocio...")
    anadir.add_argument("concepto", help="descripción corta, entre comillas si lleva espacios")
    anadir.add_argument(
        "-f", "--fecha",
        type=validador(a_fecha),
        default=date.today(),
        help="fecha aaaa-mm-dd (por defecto: hoy)",
    )
    anadir.set_defaults(funcion=accion_anadir)
```

```bash
python3 -m gastos --help
```

```salida
usage: gastos [-h] [--datos FICHERO] [--color {auto,siempre,nunca}]
              SUBCOMANDO ...

Lleva la cuenta de tus gastos desde la terminal.

positional arguments:
  SUBCOMANDO
    añadir (anadir)     apunta un gasto nuevo
    listar              enseña los gastos apuntados
    resumen             totales por categoría con gráfico de barras
    borrar              elimina un gasto por su identificador
    exportar            vuelca los gastos a JSON

options:
  -h, --help            show this help message and exit
  --datos FICHERO       usa este CSV en vez del de la configuración
  --color {auto,siempre,nunca}
                        cuándo usar color (por defecto: auto)
```

Las decisiones:

- **`set_defaults(funcion=...)` guarda la función en el espacio de nombres**, y `main` termina con `return opciones.funcion(opciones, contexto)`. No hay ningún `match` gigante sobre el nombre del subcomando: añadir uno nuevo es escribir su `add_parser` y su función, y nada más.
- **`subcomandos.required = True`** hace que `gastos` a secas sea un error de uso en vez de una ejecución que no hace nada. Desde Python 3, los subcomandos son opcionales por defecto, y casi nunca es lo que quieres.
- **`aliases=["anadir"]`** permite escribirlo sin la eñe. El subcomando se llama `añadir` porque el programa está en español, pero teclear una eñe en un teclado ajeno es una lotería, y un alias cuesta seis caracteres.
- **La fecha por defecto es `date.today()`.** Ojo con dónde se evalúa: está en el cuerpo de `construir_analizador`, que se llama en cada arranque, así que se calcula bien. Si estuviera como valor por defecto de un parámetro de función, se calcularía una sola vez al importar el módulo, que es la trampa de los argumentos por defecto mutables que ya viste.
- **`metavar="SUBCOMANDO"`** limpia la ayuda: sin él, `argparse` enseña la lista entera de subcomandos entre llaves en la línea de uso.

> [!nota] Las opciones generales van antes del subcomando
>
> `--datos` y `--color` están en el analizador principal, así que se escriben delante:
>
> ```bash
> gastos --datos viaje.csv listar
> ```
>
> Escribirlo al revés, `gastos listar --datos viaje.csv`, da un error de argumento desconocido, porque a partir del subcomando manda el analizador del subcomando. Es el mismo comportamiento que `git --no-pager log` o `docker --context otro ps`, y conviene decirlo en el `epilog` para quien no lo sepa.

## Parte 7: las acciones

Cada subcomando es una función con la misma firma, y las tres capas se ven en cada una: pedir, llamar a la lógica, contar el resultado.

```python title="src/gastos/cli.py"
@dataclass
class Contexto:
        """Lo que necesita cualquier acción para hacer su trabajo."""

    almacen: Almacen
    configuracion: Configuracion
    pintor: Pintor
    pintor_error: Pintor


def accion_anadir(opciones, contexto: Contexto) -> int:
        try:
                gasto = contexto.almacen.anadir(
            opciones.fecha, opciones.categoria, opciones.concepto, opciones.importe
        )
    except ValueError as error:
                aviso(str(error), contexto.pintor_error)
        return 1
    contexto.almacen.guardar()
    moneda = contexto.configuracion.moneda
    print(
        f"Apuntado [{gasto.identificador}] "
        f"{importe_con_moneda(gasto.importe, moneda)} en {gasto.categoria} el {gasto.fecha}."
    )
    return 0


def accion_borrar(opciones, contexto: Contexto) -> int:
        gasto = contexto.almacen.buscar(opciones.identificador)
    if gasto is None:
                aviso(f"no hay ningún gasto con el identificador {opciones.identificador}.", contexto.pintor_error)
        return 1

    if not opciones.si:
                if not sys.stdin.isatty():
                        aviso("no puedo preguntar sin terminal; repite con --si.", contexto.pintor_error)
            return 1
        moneda = contexto.configuracion.moneda
        print(f"Vas a borrar [{gasto.identificador}] {gasto.concepto}, "
              f"{importe_con_moneda(gasto.importe, moneda)} del {gasto.fecha}.")
        try:
                        respuesta = input("¿Seguro? [s/N]: ").strip().lower()
        except EOFError:
                        respuesta = ""
            print()
        if respuesta not in {"s", "si", "sí"}:
                        print("Cancelado. No se ha borrado nada.")
            return 1

    contexto.almacen.borrar(opciones.identificador)
    contexto.almacen.guardar()
    print(f"Borrado el gasto {opciones.identificador}.")
    return 0
```

`accion_borrar` es la interesante, porque borrar es la única operación que destruye datos:

- **Se pregunta antes**, y se enseña qué se va a borrar. Un identificador tecleado de memoria se equivoca cada dos por tres.
- **`[s/N]` con la ene en mayúscula** es la convención de toda la terminal para decir cuál es la opción por defecto. Y la comprobación es coherente: cualquier cosa que no sea una confirmación explícita se entiende como un no.
- **`--si` se salta la pregunta**, porque un programa que siempre pregunta no se puede usar dentro de un guion.
- **Sin terminal no se pregunta, se falla.** Si `stdin` viene de una tubería, `input()` leería la siguiente línea de esa tubería como si fuera la respuesta, que es una forma preciosa de borrar datos sin querer. Se comprueba con `isatty()` y se pide `--si`.
- **También se atrapa `EOFError`**, que es lo que lanza `input()` cuando quien usa el programa pulsa <kbd>Ctrl</kbd> + <kbd>D</kbd>. Se trata como un "no".
- **Cancelar devuelve 1.** "No he hecho lo que me pediste" no es un éxito, y un guion que dependa de que el gasto desaparezca tiene que enterarse.

Las otras tres acciones son más cortas:

```python title="src/gastos/cli.py"
def accion_listar(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes, opciones.categoria)
    if not gastos:
                print("No hay gastos que cumplan esos filtros.")
        return 0
    tabla_gastos(gastos, contexto.configuracion.moneda, contexto.pintor)
    suma = importe_con_moneda(total(gastos), contexto.configuracion.moneda)
    etiqueta = "gasto" if len(gastos) == 1 else "gastos"
    print(f"\n{len(gastos)} {etiqueta}, {suma} en total.")
    return 0


def accion_resumen(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes)
    if not gastos:
                print("No hay gastos que resumir.")
        return 0
    titulo = f"Resumen de {opciones.mes}" if opciones.mes else "Resumen de todo"
    print(f"{titulo}\n")
    tabla_resumen(
        gastos,
        contexto.configuracion.moneda,
        contexto.configuracion.ancho_barra,
        contexto.pintor,
    )
    return 0


def accion_exportar(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes)
    datos = [
        {
            "identificador": gasto.identificador,
            "fecha": gasto.fecha.isoformat(),
            "categoria": gasto.categoria,
            "concepto": gasto.concepto,
            "importe": f"{gasto.importe:.2f}",
        }
        for gasto in gastos
    ]
    texto = json.dumps(datos, indent=2, ensure_ascii=False)

    if str(opciones.fichero) == "-":
                print(texto)
        return 0
    try:
                opciones.fichero.write_text(texto + "\n", encoding="utf-8")
    except OSError as error:
                aviso(f"no he podido escribir en {opciones.fichero}: {error}", contexto.pintor_error)
        return 1
    print(f"Exportados {len(datos)} gastos a {opciones.fichero}.")
    return 0
```

De `accion_exportar`, tres cosas:

- **El importe se exporta como cadena**, `"12.50"`. JSON no tiene tipo decimal: sus números son de coma flotante, así que escribir el `Decimal` como número volvería a meter la imprecisión que tanto trabajo ha costado evitar. Quien lea el JSON reconstruye el `Decimal` desde el texto.
- **`ensure_ascii=False`** para que las eñes y los acentos se guarden tal cual y el fichero se pueda leer.
- **El guion como nombre de fichero significa "la salida estándar"**, que es una convención universal en la terminal. Eso convierte el subcomando en una pieza encadenable:

```bash
gastos exportar - --mes 2026-09 | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'gastos')"
```

```salida
8 gastos
```

## Parte 8: el arranque

```python title="src/gastos/cli.py"
def main(argumentos: list[str] | None = None) -> int:
        opciones = construir_analizador().parse_args(argumentos)

    pintor = Pintor(quiere_color(opciones.color, sys.stdout))
    pintor_error = Pintor(quiere_color(opciones.color, sys.stderr))

    try:
                configuracion = cargar_configuracion()
    except ValueError as error:
                aviso(str(error), pintor_error)
        return 1
    if opciones.datos is not None:
                configuracion.datos = opciones.datos

    almacen = Almacen(configuracion.datos)
    try:
                almacen.cargar()
    except (ErrorDeAlmacen, OSError) as error:
                aviso(str(error), pintor_error)
        return 1

    contexto = Contexto(almacen, configuracion, pintor, pintor_error)
    return opciones.funcion(opciones, contexto)


def ejecutar() -> int:
        """Punto de entrada del comando instalado. Aquí muere el Ctrl+C."""
    try:
                return main()
    except KeyboardInterrupt:
                print("\nCancelado.", file=sys.stderr)
        return 130
```

`main` hace siempre lo mismo, pase lo que pase: prepara los dos pintores, resuelve la configuración, carga el almacén y delega en la acción que toque. Todo lo específico de cada subcomando está en su función.

- **Dos pintores, uno para cada flujo.** No es exageración: `gastos listar > fichero.txt` manda `stdout` a un fichero pero deja `stderr` en la terminal. Con un solo pintor, o el fichero se llena de códigos de color o los errores salen en gris.
- **`ejecutar` envuelve a `main` para el <kbd>Ctrl</kbd> + <kbd>C</kbd>.** Sin eso, interrumpir el programa mientras espera la confirmación de un borrado suelta un traceback de seis líneas. El código 130 es la convención de la terminal para "interrumpido por el usuario": 128 más el número de la señal, que para la interrupción es 2.
- **`main` devuelve un número y no llama a `sys.exit`**, por lo mismo que en el proyecto anterior: así se puede llamar desde una prueba con una lista de argumentos y mirar el resultado.

## El fichero cli.py completo

Las piezas de los dos apartados anteriores, en su sitio y en orden:

```python title="src/gastos/cli.py"
"""La interfaz de terminal: argumentos, subcomandos y códigos de salida."""

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from .almacen import Almacen, ErrorDeAlmacen, total
from .configuracion import Configuracion, cargar_configuracion
from .modelo import a_categoria, a_fecha, a_importe, a_mes
from .presentacion import (
    Pintor,
    aviso,
    importe_con_moneda,
    quiere_color,
    tabla_gastos,
    tabla_resumen,
)


@dataclass
class Contexto:
        """Lo que necesita cualquier acción para hacer su trabajo."""

    almacen: Almacen
    configuracion: Configuracion
    pintor: Pintor
    pintor_error: Pintor


def validador(conversor):
        """Convierte una función de modelo.py en un type= de argparse."""
    def convertir(texto: str):
                try:
                        return conversor(texto)
        except ValueError as error:
                        raise argparse.ArgumentTypeError(str(error)) from None
    convertir.__name__ = conversor.__name__
    return convertir


def construir_analizador() -> argparse.ArgumentParser:
        analizador = argparse.ArgumentParser(
        prog="gastos",
        description="Lleva la cuenta de tus gastos desde la terminal.",
    )
    analizador.add_argument(
        "--datos",
        type=Path,
        metavar="FICHERO",
        help="usa este CSV en vez del de la configuración",
    )
    analizador.add_argument(
        "--color",
        choices=["auto", "siempre", "nunca"],
        default="auto",
        help="cuándo usar color (por defecto: auto)",
    )

    subcomandos = analizador.add_subparsers(dest="subcomando", metavar="SUBCOMANDO")
    subcomandos.required = True

    anadir = subcomandos.add_parser(
        "añadir", aliases=["anadir"], help="apunta un gasto nuevo",
        description="Apunta un gasto nuevo.",
    )
    anadir.add_argument("importe", type=validador(a_importe), help="cuánto, por ejemplo 12,50")
    anadir.add_argument("categoria", type=validador(a_categoria), help="comida, transporte, ocio...")
    anadir.add_argument("concepto", help="descripción corta, entre comillas si lleva espacios")
    anadir.add_argument(
        "-f", "--fecha",
        type=validador(a_fecha),
        default=date.today(),
        help="fecha aaaa-mm-dd (por defecto: hoy)",
    )
    anadir.set_defaults(funcion=accion_anadir)

    listar = subcomandos.add_parser(
        "listar", help="enseña los gastos apuntados",
        description="Enseña los gastos, con filtros opcionales.",
    )
    listar.add_argument("-m", "--mes", type=validador(a_mes), help="solo los de este mes, aaaa-mm")
    listar.add_argument("-c", "--categoria", type=validador(a_categoria), help="solo los de esta categoría")
    listar.set_defaults(funcion=accion_listar)

    resumen = subcomandos.add_parser(
        "resumen", help="totales por categoría con gráfico de barras",
        description="Totales por categoría con gráfico de barras.",
    )
    resumen.add_argument("-m", "--mes", type=validador(a_mes), help="solo los de este mes, aaaa-mm")
    resumen.set_defaults(funcion=accion_resumen)

    borrar = subcomandos.add_parser(
        "borrar", help="elimina un gasto por su identificador",
        description="Elimina un gasto por su identificador.",
    )
    borrar.add_argument("identificador", type=int, help="el número que sale en la columna ID")
    borrar.add_argument("-s", "--si", action="store_true", help="no preguntar antes de borrar")
    borrar.set_defaults(funcion=accion_borrar)

    exportar = subcomandos.add_parser(
        "exportar", help="vuelca los gastos a JSON",
        description="Vuelca los gastos a un fichero JSON, o a la salida estándar con -.",
    )
    exportar.add_argument("fichero", type=Path, help="fichero de destino, o - para la salida estándar")
    exportar.add_argument("-m", "--mes", type=validador(a_mes), help="solo los de este mes, aaaa-mm")
    exportar.set_defaults(funcion=accion_exportar)

    return analizador


def accion_anadir(opciones, contexto: Contexto) -> int:
        try:
                gasto = contexto.almacen.anadir(
            opciones.fecha, opciones.categoria, opciones.concepto, opciones.importe
        )
    except ValueError as error:
                aviso(str(error), contexto.pintor_error)
        return 1
    contexto.almacen.guardar()
    moneda = contexto.configuracion.moneda
    print(
        f"Apuntado [{gasto.identificador}] "
        f"{importe_con_moneda(gasto.importe, moneda)} en {gasto.categoria} el {gasto.fecha}."
    )
    return 0


def accion_listar(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes, opciones.categoria)
    if not gastos:
                print("No hay gastos que cumplan esos filtros.")
        return 0
    tabla_gastos(gastos, contexto.configuracion.moneda, contexto.pintor)
    suma = importe_con_moneda(total(gastos), contexto.configuracion.moneda)
    etiqueta = "gasto" if len(gastos) == 1 else "gastos"
    print(f"\n{len(gastos)} {etiqueta}, {suma} en total.")
    return 0


def accion_resumen(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes)
    if not gastos:
                print("No hay gastos que resumir.")
        return 0
    titulo = f"Resumen de {opciones.mes}" if opciones.mes else "Resumen de todo"
    print(f"{titulo}\n")
    tabla_resumen(
        gastos,
        contexto.configuracion.moneda,
        contexto.configuracion.ancho_barra,
        contexto.pintor,
    )
    return 0


def accion_borrar(opciones, contexto: Contexto) -> int:
        gasto = contexto.almacen.buscar(opciones.identificador)
    if gasto is None:
                aviso(f"no hay ningún gasto con el identificador {opciones.identificador}.", contexto.pintor_error)
        return 1

    if not opciones.si:
                if not sys.stdin.isatty():
                        aviso("no puedo preguntar sin terminal; repite con --si.", contexto.pintor_error)
            return 1
        moneda = contexto.configuracion.moneda
        print(f"Vas a borrar [{gasto.identificador}] {gasto.concepto}, "
              f"{importe_con_moneda(gasto.importe, moneda)} del {gasto.fecha}.")
        try:
                        respuesta = input("¿Seguro? [s/N]: ").strip().lower()
        except EOFError:
                        respuesta = ""
            print()
        if respuesta not in {"s", "si", "sí"}:
                        print("Cancelado. No se ha borrado nada.")
            return 1

    contexto.almacen.borrar(opciones.identificador)
    contexto.almacen.guardar()
    print(f"Borrado el gasto {opciones.identificador}.")
    return 0


def accion_exportar(opciones, contexto: Contexto) -> int:
        gastos = contexto.almacen.filtrar(opciones.mes)
    datos = [
        {
            "identificador": gasto.identificador,
            "fecha": gasto.fecha.isoformat(),
            "categoria": gasto.categoria,
            "concepto": gasto.concepto,
            "importe": f"{gasto.importe:.2f}",
        }
        for gasto in gastos
    ]
    texto = json.dumps(datos, indent=2, ensure_ascii=False)

    if str(opciones.fichero) == "-":
                print(texto)
        return 0
    try:
                opciones.fichero.write_text(texto + "\n", encoding="utf-8")
    except OSError as error:
                aviso(f"no he podido escribir en {opciones.fichero}: {error}", contexto.pintor_error)
        return 1
    print(f"Exportados {len(datos)} gastos a {opciones.fichero}.")
    return 0


def main(argumentos: list[str] | None = None) -> int:
        opciones = construir_analizador().parse_args(argumentos)

    pintor = Pintor(quiere_color(opciones.color, sys.stdout))
    pintor_error = Pintor(quiere_color(opciones.color, sys.stderr))

    try:
                configuracion = cargar_configuracion()
    except ValueError as error:
                aviso(str(error), pintor_error)
        return 1
    if opciones.datos is not None:
                configuracion.datos = opciones.datos

    almacen = Almacen(configuracion.datos)
    try:
                almacen.cargar()
    except (ErrorDeAlmacen, OSError) as error:
                aviso(str(error), pintor_error)
        return 1

    contexto = Contexto(almacen, configuracion, pintor, pintor_error)
    return opciones.funcion(opciones, contexto)


def ejecutar() -> int:
        """Punto de entrada del comando instalado. Aquí muere el Ctrl+C."""
    try:
                return main()
    except KeyboardInterrupt:
                print("\nCancelado.", file=sys.stderr)
        return 130


if __name__ == "__main__":
        sys.exit(ejecutar())
```

Son unas 250 líneas, y la mitad son los `add_argument` de los cinco subcomandos.

```python title="src/gastos/__main__.py"
"""Permite ejecutar el paquete con python3 -m gastos."""

import sys

from .cli import ejecutar

sys.exit(ejecutar())
```

## El empaquetado

Con un `pyproject.toml` de doce líneas, `gastos` deja de ser un `python3 -m` y pasa a ser un comando:

```text title="pyproject.toml"
[project]
name = "gastos"
version = "1.0.0"
description = "Control de gastos personales desde la terminal"
requires-python = ">=3.11"

[project.scripts]
gastos = "gastos.cli:ejecutar"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
gastos resumen --mes 2026-09
```

La línea `gastos = "gastos.cli:ejecutar"` dice: crea un comando llamado `gastos` que llame a la función `ejecutar` del módulo `gastos.cli`. Apunta a `ejecutar` y no a `main` para que el comando instalado también sepa morirse con elegancia con <kbd>Ctrl</kbd> + <kbd>C</kbd>. Y el instalador envuelve esa función en un `sys.exit(...)`, así que el número que devuelve se convierte en el código de salida del proceso.

> [!error] error: Multiple top-level packages discovered in a flat-layout: \['gastos', 'prueba'\]
>
> Este sale al ejecutar `pip install -e .` en un proyecto sin `src/` que tenga más de una carpeta en la raíz. `setuptools` intenta adivinar qué hay que empaquetar, encuentra dos candidatas y se niega a elegir, con razón: si acertara por casualidad, acabarías publicando tu carpeta de pruebas dentro del paquete.
>
> La solución es la que usa este proyecto: mover el paquete a `src/`. Con esa estructura no hay nada que adivinar.

## Una sesión de uso

Se empieza apuntando gastos. La fecha se puede omitir, y entonces es la de hoy; aquí se fija a propósito para que el ejemplo no cambie mañana.

```bash
gastos añadir 12,50 comida "Menú del día" --fecha 2026-09-01
gastos añadir 45.90 transporte "Abono mensual" -f 2026-09-01
gastos añadir 8,20 comida "Café y tostada" -f 2026-09-03
gastos añadir 62 ocio "Entradas del teatro" -f 2026-09-05
gastos añadir 129.99 hogar "Lámpara del salón" -f 2026-09-08
gastos añadir 3,40 transporte "Billete de metro" -f 2026-09-09
gastos añadir 27,15 comida "Compra semanal" -f 2026-09-12
gastos añadir 19,99 ocio "Suscripción de música" -f 2026-09-15
gastos añadir 54,30 comida "Cena con Marta" -f 2026-08-28
```

```salida
Apuntado [1] 12.50 € en comida el 2026-09-01.
Apuntado [2] 45.90 € en transporte el 2026-09-01.
Apuntado [3] 8.20 € en comida el 2026-09-03.
Apuntado [4] 62.00 € en ocio el 2026-09-05.
Apuntado [5] 129.99 € en hogar el 2026-09-08.
Apuntado [6] 3.40 € en transporte el 2026-09-09.
Apuntado [7] 27.15 € en comida el 2026-09-12.
Apuntado [8] 19.99 € en ocio el 2026-09-15.
Apuntado [9] 54.30 € en comida el 2026-08-28.
```

Da igual el orden en que se apunten: el fichero sale ordenado por fecha, y se puede abrir con cualquier hoja de cálculo.

```text title="gastos.csv"
identificador,fecha,categoria,concepto,importe
9,2026-08-28,comida,Cena con Marta,54.30
1,2026-09-01,comida,Menú del día,12.50
2,2026-09-01,transporte,Abono mensual,45.90
3,2026-09-03,comida,Café y tostada,8.20
4,2026-09-05,ocio,Entradas del teatro,62.00
5,2026-09-08,hogar,Lámpara del salón,129.99
6,2026-09-09,transporte,Billete de metro,3.40
7,2026-09-12,comida,Compra semanal,27.15
8,2026-09-15,ocio,Suscripción de música,19.99
```

La lista completa:

```bash
gastos listar
```

```salida
  ID  FECHA       CATEGORÍA     CONCEPTO                           IMPORTE
--------------------------------------------------------------------------
   9  2026-08-28  comida        Cena con Marta                     54.30 €
   1  2026-09-01  comida        Menú del día                       12.50 €
   2  2026-09-01  transporte    Abono mensual                      45.90 €
   3  2026-09-03  comida        Café y tostada                      8.20 €
   4  2026-09-05  ocio          Entradas del teatro                62.00 €
   5  2026-09-08  hogar         Lámpara del salón                 129.99 €
   6  2026-09-09  transporte    Billete de metro                    3.40 €
   7  2026-09-12  comida        Compra semanal                     27.15 €
   8  2026-09-15  ocio          Suscripción de música              19.99 €

9 gastos, 363.43 € en total.
```

Con los dos filtros a la vez:

```bash
gastos listar --mes 2026-09 --categoria comida
```

```salida
  ID  FECHA       CATEGORÍA     CONCEPTO                           IMPORTE
--------------------------------------------------------------------------
   1  2026-09-01  comida        Menú del día                       12.50 €
   3  2026-09-03  comida        Café y tostada                      8.20 €
   7  2026-09-12  comida        Compra semanal                     27.15 €

3 gastos, 47.85 € en total.
```

El resumen del mes, que es para lo que se hizo todo esto:

```bash
gastos resumen --mes 2026-09
```

```salida
Resumen de 2026-09

CATEGORÍA          IMPORTE       %  GRÁFICO
--------------------------------------------------------------------
hogar             129.99 €   42.1%  ████████████████████████████████
ocio               81.99 €   26.5%  ████████████████████▏
transporte         49.30 €   15.9%  ████████████▏
comida             47.85 €   15.5%  ███████████▊
--------------------------------------------------------------------
TOTAL             309.13 €
```

En la terminal, cada nombre de categoría y su barra salen del mismo color, la cabecera en negrita y las líneas de guiones atenuadas. Esta captura está tomada redirigiendo la salida a un fichero, así que `isatty()` devolvió `False` y el programa apagó el color él solo, que es justo lo que se buscaba.

Un borrado, con su confirmación:

```bash
gastos borrar 6
```

```salida
Vas a borrar [6] Billete de metro, 3.40 € del 2026-09-09.
¿Seguro? [s/N]: s
Borrado el gasto 6.
```

Y el mismo borrado cuando uno se lo piensa mejor:

```bash
gastos borrar 6
echo $?
```

```salida
Vas a borrar [6] Billete de metro, 3.40 € del 2026-09-09.
¿Seguro? [s/N]: n
Cancelado. No se ha borrado nada.
1
```

La exportación a JSON:

```bash
gastos exportar gastos-septiembre.json --mes 2026-09
```

```salida
Exportados 8 gastos a gastos-septiembre.json.
```

```text title="gastos-septiembre.json"
[
  {
    "identificador": 1,
    "fecha": "2026-09-01",
    "categoria": "comida",
    "concepto": "Menú del día",
    "importe": "12.50"
  },
  {
    "identificador": 2,
    "fecha": "2026-09-01",
    "categoria": "transporte",
    "concepto": "Abono mensual",
    "importe": "45.90"
  }
]
```

Con `--datos` se puede llevar una contabilidad aparte sin tocar la principal, por ejemplo la de un viaje:

```bash
gastos --datos viaje.csv añadir 340 transporte "Vuelo a Bilbao" -f 2026-09-10
gastos --datos viaje.csv listar
```

```salida
Apuntado [1] 340.00 € en transporte el 2026-09-10.
  ID  FECHA       CATEGORÍA     CONCEPTO                           IMPORTE
--------------------------------------------------------------------------
   1  2026-09-10  transporte    Vuelo a Bilbao                    340.00 €

1 gasto, 340.00 € en total.
```

Y los errores, todos con su mensaje por `stderr` y su código de salida:

```bash
gastos añadir doce comida "Prueba"
echo $?
```

```salida
usage: gastos añadir [-h] [-f FECHA] importe categoria concepto
gastos añadir: error: argument importe: 'doce' no es un importe
2
```

```bash
gastos añadir 5 comida "Prueba" -f 31-12-2026
echo $?
```

```salida
usage: gastos añadir [-h] [-f FECHA] importe categoria concepto
gastos añadir: error: argument -f/--fecha: '31-12-2026' no es una fecha aaaa-mm-dd
2
```

```bash
gastos borrar 99 --si
echo $?
```

```salida
gastos: no hay ningún gasto con el identificador 99.
1
```

Fíjate en que los mensajes de los dos primeros salen tal como los escribiste en `modelo.py`, aunque esas funciones no sepan que existe `argparse`. Eso lo hace el puente de seis líneas de `validador`.

## Lo que se ha usado

| Del curso | Dónde |
| --- | --- |
| `Decimal` y `quantize` | Todo el manejo del dinero |
| `datetime.date`, `fromisoformat`, `strftime` | `modelo.py` y los filtros por mes |
| Dataclasses y propiedades | `Gasto`, `Configuracion`, `Contexto` |
| Excepciones propias y `raise ... from` | `ErrorDeAlmacen` y las conversiones |
| CSV con `DictReader` y `DictWriter` | `almacen.py` |
| JSON | La configuración y la exportación |
| `pathlib`, `replace`, `expanduser` | El guardado seguro y las rutas |
| Comprensiones y `sorted` con clave compuesta | `filtrar` y `totales_por_categoria` |
| Funciones que devuelven funciones | `validador` |
| `argparse` con subcomandos y `set_defaults` | `cli.py` |
| Colores ANSI, `isatty`, tablas y barras | `presentacion.py` e `informes.py` |
| `os.environ`, códigos de salida, `stderr` | La configuración y `main` |
| `pyproject.toml` con `[project.scripts]` | El empaquetado |

> [!error] decimal.InvalidOperation: \[&lt;class 'decimal.ConversionSyntax'>\]
>
> Le has pasado a `Decimal()` una cadena que no es un número: una coma española sin convertir, un símbolo de euro pegado, un espacio fino de los que copia una web. El mensaje no dice cuál era el texto culpable, que es lo peor que tiene.
>
> Por eso `a_importe` la captura y la vuelve a lanzar como `ValueError` con el texto original dentro. Cuando escribas conversiones, acuérdate de meter el dato que falló en el mensaje: quien lo lea no tiene tu depurador delante.

> [!aviso] No uses Decimal para todo
>
> `Decimal` es para el dinero y para cualquier cosa que tenga que cuadrar al céntimo. Para medidas físicas, estadísticas o gráficos, `float` es el tipo correcto y además es mucho más rápido: `Decimal` va por software y `float` por hardware.
>
> Y no se pueden mezclar: `Decimal("1.5") + 1.5` lanza `unsupported operand type(s) for +: 'decimal.Decimal' and 'float'`. Con enteros sí funciona, porque un entero es exacto. Así que conviene decidir el tipo de cada dato una vez, al entrar en el programa, y no ir convirtiendo por el camino.

> [!resumen] En resumen
>
> El gestor de gastos reparte el trabajo en seis módulos separados por una línea clara: `modelo`, `almacen`, `configuracion` e `informes` no saben que existe una pantalla, y `presentacion` y `cli` no saben nada de ficheros. El dinero se maneja con `Decimal` construido siempre desde cadenas, porque `float` descuadra las sumas y en una herramienta de cuentas eso no vale; el importe se guarda en el CSV con dos decimales forzados y se exporta a JSON como texto para no perder la exactitud. El almacén escribe en un fichero temporal y lo renombra encima del bueno, de modo que un corte a mitad no destruye los datos. La configuración se resuelve en tres niveles, valores por defecto, fichero JSON y opción de la línea de comandos, y la variable `GASTOS_CONFIG` permite tener un juego de datos aparte. La interfaz usa subcomandos con `set_defaults(funcion=...)`, un puente que traduce los `ValueError` del modelo en `ArgumentTypeError` de `argparse`, tablas alineadas donde el ancho se aplica al texto y nunca al código de color, y un color que se apaga solo cuando la salida no va a una terminal. Y el `pyproject.toml` convierte todo eso en un comando `gastos` instalable.

> [!ejercicio] Ampliaciones
>
> La herramienta ya se puede usar a diario, pero le falta lo que hace que uno no la abandone al segundo mes. En orden de dificultad:
>
> 1. **Un subcomando `categorias`.** Que liste las categorías usadas, cuántos gastos tiene cada una y su total, aprovechando `totales_por_categoria`. Añade también una opción `--meses` a `resumen` que enseñe una barra por mes en vez de por categoría: verás que `barra` y `tabla_resumen` te sirven casi tal cual.
> 2. **Presupuestos.** Añade al fichero de configuración una clave `presupuestos` con un tope mensual por categoría, y haz que `resumen` marque en rojo las que se han pasado y enseñe cuánto queda en las demás. Al añadir un gasto que rompa el tope, avisa por `stderr` sin impedirlo.
> 3. **Editar un gasto.** Un subcomando `editar ID` con opciones `--importe`, `--categoria`, `--concepto` y `--fecha`, todas opcionales, que cambie solo lo que se le pase. El detalle interesante es distinguir "no me has dado esta opción" de "me la has dado vacía": mira `default=None` y, para el caso general, `argparse.SUPPRESS`.
> 4. **Importar un CSV del banco.** Un subcomando `importar` que lea un extracto bancario con otras columnas y otro orden de fecha, lo convierta a gastos y evite duplicar los que ya estaban. Tendrás que decidir qué hace que dos apuntes sean el mismo, y descubrirás que la fecha y el importe no bastan.
> 5. **Gastos periódicos.** Guarda en otro fichero las suscripciones y alquileres con su día del mes, y añade un subcomando `aplicar` que apunte los que tocaban y todavía no están, desde la última vez que se ejecutó hasta hoy. Aquí necesitarás `datetime.timedelta` y pensar bien qué pasa con el día 31 en febrero.
> 6. **Pruebas y empaquetado completo.** Escribe pruebas con `pytest` para `a_importe` (con los casos raros: `"12,50"`, `"12.999"`, `"-3"`, `"€ 8"`), para el ciclo guardar-cargar del almacén usando `tmp_path`, y para `main` pasándole listas de argumentos y comprobando el código de salida que devuelve. Después añade `[project.optional-dependencies]` al `pyproject.toml` con `pytest` dentro, para que `pip install -e ".[dev]"` prepare el entorno de desarrollo entero.
