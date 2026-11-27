---
titulo: "rich: tablas y progreso"
resumen: "Tablas que se ajustan solas, barras de progreso, pantallas que se refrescan y preguntas con validación, todo resuelto."
minutos: 29
orden: 25
---

La lección anterior era el calentamiento. Esta es la parte de `rich` por la que la instala casi todo el mundo: tablas que calculan sus anchos, barras de progreso con tiempo restante, pantallas que se actualizan en vivo y preguntas que validan lo que escribes.

Todo esto lo montaste a mano en las lecciones anteriores del módulo, así que sabes cuánto cuesta. Una tabla con columnas que se ajustan al contenido y textos que saltan de línea dentro de su celda no es un ejercicio de tarde. Aquí son cinco líneas.

> [!nota] Las capturas van sin color, pero con su dibujo
>
> Igual que en la lección anterior, las salidas se han tomado redirigiendo a un fichero, así que `rich` ha omitido los colores y ha conservado los bordes y el ajuste. Las de las barras de progreso y las pantallas en vivo son fotogramas reales capturados a mitad de la ejecución.

## Tablas

Una tabla se construye en tres pasos: crearla, añadir las columnas y añadir las filas.

```python
from rich.console import Console
from rich.table import Table

consola = Console(width=70)

tabla = Table(title="Gastos de septiembre")

tabla.add_column("Fecha", style="dim")
tabla.add_column("Concepto")
tabla.add_column("Importe", justify="right", style="bold green")
tabla.add_column("Categoría", justify="center")

tabla.add_row("2026-09-02", "Café con leche", "1.60 €", "comida")
tabla.add_row("2026-09-05", "Billete de metro", "2.40 €", "transporte")
tabla.add_row("2026-09-11", "Compra semanal", "54.20 €", "comida")
tabla.add_row("2026-09-18", "Entradas de cine", "18.00 €", "ocio")

consola.print(tabla)
```

```salida
                  Gastos de septiembre                  
┏━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━┓
┃ Fecha      ┃ Concepto         ┃ Importe ┃ Categoría  ┃
┡━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━┩
│ 2026-09-02 │ Café con leche   │  1.60 € │   comida   │
│ 2026-09-05 │ Billete de metro │  2.40 € │ transporte │
│ 2026-09-11 │ Compra semanal   │ 54.20 € │   comida   │
│ 2026-09-18 │ Entradas de cine │ 18.00 € │    ocio    │
└────────────┴──────────────────┴─────────┴────────────┘
```

Fíjate en lo que no has tenido que hacer. No has medido el texto más largo de cada columna, no has contado caracteres para los bordes, no has centrado el título y no te has peleado con la eñe ni con la tilde de "Categoría". La tabla ha salido del ancho justo del contenido, y si añades una fila con un concepto más largo, todas las columnas se recolocan.

Los parámetros de `add_column`:

| Parámetro | Qué hace |
| --- | --- |
| `justify` | `"left"`, `"center"`, `"right"` o `"full"` |
| `style` | Estilo de las celdas de esa columna |
| `header_style` | Estilo de la cabecera de esa columna |
| `no_wrap=True` | No parte el texto en varias líneas |
| `width` | Ancho fijo en caracteres |
| `min_width` y `max_width` | Límites, dejando que se ajuste entre ellos |
| `ratio` | Reparto proporcional del espacio sobrante |

Las filas se añaden con `add_row` y tantos argumentos como columnas haya. Si le pasas menos, las que falten quedan vacías; si le pasas más, dará error. Y los valores tienen que ser cadenas o objetos de `rich`, así que los números hay que formatearlos antes, que es donde siguen entrando las f-strings de siempre.

### Cambiar el borde con `box`

El dibujo del recuadro se elige con el parámetro `box`, y las opciones están en el módulo `rich.box`:

```python
from rich import box
from rich.console import Console
from rich.table import Table

consola = Console(width=70)

filas = [
    ("comida", "55.80 €", "2"),
    ("ocio", "18.00 €", "1"),
    ("transporte", "2.40 €", "1"),
]

for nombre, borde in [
    ("box.SIMPLE", box.SIMPLE),
    ("box.MINIMAL", box.MINIMAL),
    ("box.ROUNDED", box.ROUNDED),
    ("box.HEAVY_HEAD", box.HEAVY_HEAD),
    ("box.ASCII", box.ASCII),
]:
        tabla = Table(title=nombre, box=borde)
    tabla.add_column("Categoría")
    tabla.add_column("Total", justify="right")
    tabla.add_column("Nº", justify="right")
    for fila in filas:
                tabla.add_row(*fila)
    consola.print(tabla)
```

```salida
         box.SIMPLE          
                             
  Categoría      Total   Nº  
 ─────────────────────────── 
  comida       55.80 €    2  
  ocio         18.00 €    1  
  transporte    2.40 €    1  
                             
         box.MINIMAL         
             ╷         ╷     
  Categoría  │   Total │ Nº  
╶────────────┼─────────┼────╴
  comida     │ 55.80 € │  2  
  ocio       │ 18.00 € │  1  
  transporte │  2.40 € │  1  
             ╵         ╵     
         box.ROUNDED         
╭────────────┬─────────┬────╮
│ Categoría  │   Total │ Nº │
├────────────┼─────────┼────┤
│ comida     │ 55.80 € │  2 │
│ ocio       │ 18.00 € │  1 │
│ transporte │  2.40 € │  1 │
╰────────────┴─────────┴────╯
       box.HEAVY_HEAD        
┏━━━━━━━━━━━━┳━━━━━━━━━┳━━━━┓
┃ Categoría  ┃   Total ┃ Nº ┃
┡━━━━━━━━━━━━╇━━━━━━━━━╇━━━━┩
│ comida     │ 55.80 € │  2 │
│ ocio       │ 18.00 € │  1 │
│ transporte │  2.40 € │  1 │
└────────────┴─────────┴────┘
          box.ASCII          
+---------------------------+
| Categoría  |   Total | Nº |
|------------+---------+----|
| comida     | 55.80 € |  2 |
| ocio       | 18.00 € |  1 |
| transporte |  2.40 € |  1 |
+---------------------------+
```

`HEAVY_HEAD` es el que viene por defecto. `SIMPLE` y `MINIMAL` quedan mejor cuando hay muchas tablas seguidas y el marco distrae. Y **`ASCII` merece una mención aparte**: solo usa caracteres de los de toda la vida, así que es el que funciona en cualquier terminal por vieja que sea y el único seguro si vas a guardar la salida en un fichero que abrirá otro programa.

### Columnas que se ajustan solas

Cuando el contenido no cabe, `rich` reparte el espacio. El parámetro `ratio` dice en qué proporción, y `no_wrap` protege a una columna de que le partan el texto:

```python
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

consola = Console(width=60)

tabla = Table(show_header=True, header_style="bold magenta")
tabla.add_column("Concepto", ratio=2)
tabla.add_column("Nota", ratio=3)
tabla.add_column("Importe", justify="right", no_wrap=True)

tabla.add_row(
    "Compra semanal",
    "Supermercado del barrio, incluye la fruta de toda la semana",
    "54.20 €",
)
tabla.add_row("Café con leche", "Con el equipo, después de la reunión", "1.60 €")

tabla.expand = True
consola.print(tabla)
```

```salida
┏━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━┓
┃ Concepto          ┃ Nota                       ┃ Importe ┃
┡━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━┩
│ Compra semanal    │ Supermercado del barrio,   │ 54.20 € │
│                   │ incluye la fruta de toda   │         │
│                   │ la semana                  │         │
│ Café con leche    │ Con el equipo, después de  │  1.60 € │
│                   │ la reunión                 │         │
└───────────────────┴────────────────────────────┴─────────┘
```

Esa nota larga se ha repartido en tres líneas dentro de su celda, y la fila entera ha crecido con ella sin que las demás columnas se muevan. Eso es lo que hacía inviable escribir tablas a mano en cuanto el contenido no cabía.

`expand = True` hace que la tabla ocupe todo el ancho disponible en vez de solo el que necesita, y es lo que da sentido a los `ratio`: el espacio sobrante se reparte entre las columnas que lo declaran, dos partes para una y tres para la otra.

### Tablas dentro de paneles

Como una tabla es un objeto de `rich`, se le puede pasar a un `Panel`. Y hay una variante sin bordes, `Table.grid`, pensada justo para eso: alinear cosas en columnas sin que parezca una tabla.

```python
resumen = Table.grid(padding=(0, 2))
resumen.add_column(justify="right", style="bold")
resumen.add_column()
resumen.add_row("Total:", "76.20 €")
resumen.add_row("Media:", "19.05 €")
resumen.add_row("Mayor:", "Compra semanal")

consola.print(Panel(resumen, title="Resumen", expand=False))
```

```salida
╭─────── Resumen ────────╮
│ Total:  76.20 €        │
│ Media:  19.05 €        │
│ Mayor:  Compra semanal │
╰────────────────────────╯
```

`Table.grid` es la herramienta para maquetar: sin bordes, sin cabecera y sin relleno salvo el que pidas. Es lo que usarías para una ficha de datos, una cabecera con el logo a un lado y la versión al otro, o cualquier cosa que tenga que quedar alineada en columnas.

## Barras de progreso

### El caso sencillo: `track`

Si lo único que quieres es recorrer una secuencia con una barra, hay una función que lo hace en una línea. Envuelve el objeto por el que ibas a iterar y ya está:

```python
import time

from rich.progress import track

gastos = ["Café", "Metro", "Compra", "Cine", "Farmacia", "Gasolina"]

for gasto in track(gastos, description="Importando gastos..."):
        time.sleep(0.3)

print("Importados", len(gastos), "gastos")
```

A mitad de la ejecución, la terminal enseña esto:

```salida
Importando gastos... ━━━━━━━━━━━━━╺━━━━━━━━━━━━━━━━━━━━━━━━━━  33% 0:00:02
```

Y al terminar, la barra se queda completa y el programa sigue:

```salida
Importando gastos... ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:01
Importados 6 gastos
```

`track` saca el total de la longitud de la secuencia, así que funciona con listas, tuplas y cualquier cosa que tenga `len`. Con un generador, que no la tiene, hay que pasarle `total=` a mano.

### La barra completa: `Progress`

Cuando quieres controlar qué columnas aparecen, o avanzar la barra desde varios sitios, se usa `Progress` con un `with`:

```python
import time

from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

ficheros = [f"extracto-2026-{mes:02d}.csv" for mes in range(1, 13)]

with Progress(
    SpinnerColumn(),
    TextColumn("[bold blue]{task.description}"),
    BarColumn(bar_width=20),
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    MofNCompleteColumn(),
    TimeElapsedColumn(),
    TimeRemainingColumn(),
) as progreso:
        tarea = progreso.add_task("Leyendo extractos", total=len(ficheros))
    for fichero in ficheros:
                time.sleep(0.25)
        progreso.advance(tarea)
```

Un fotograma a mitad:

```salida
⠹ Leyendo extractos ━━━━━━━━━━━╸━━━━━━━━  58%  7/12 0:00:02 0:00:02
```

Y el último, con el giro ya parado:

```salida
  Leyendo extractos ━━━━━━━━━━━━━━━━━━━━ 100% 12/12 0:00:03 0:00:00
```

Las piezas del patrón:

- **Los argumentos de `Progress` son las columnas**, en el orden en que quieres verlas. Sin argumentos, trae un juego razonable por defecto.
- **`with`** se encarga de arrancar el dibujo y, sobre todo, de apagarlo al salir, incluso si hay una excepción. Sin él, un fallo en mitad del bucle te dejaría la terminal sin cursor.
- **`add_task`** crea una barra y devuelve un identificador. El `total` es el número de pasos.
- **`advance(tarea)`** suma uno. Con `advance(tarea, 10)` suma diez, y con `progreso.update(tarea, completed=50)` se fija el valor absoluto.

Las columnas que más se usan:

| Columna | Qué enseña |
| --- | --- |
| `TextColumn("...")` | Texto con marcado y campos como `{task.description}` |
| `BarColumn()` | La barra. Con `bar_width=None` ocupa lo que sobre |
| `TaskProgressColumn()` | El porcentaje |
| `MofNCompleteColumn()` | Cuántos de cuántos, `7/12` |
| `TimeElapsedColumn()` | Tiempo transcurrido |
| `TimeRemainingColumn()` | Tiempo restante estimado |
| `SpinnerColumn()` | Un indicador que gira mientras haya actividad |
| `DownloadColumn()` | Bytes descargados sobre el total |
| `TransferSpeedColumn()` | Velocidad de transferencia |

El tiempo restante es una estimación a partir de lo que ha tardado lo anterior, y por eso al principio sale como `-:--:--`: hasta que no hay un par de pasos hechos no hay con qué calcular.

### Varias barras a la vez

Un mismo `Progress` admite todas las tareas que quieras, y las dibuja una debajo de otra:

```python
import time

from rich.progress import Progress

with Progress() as progreso:
        leer = progreso.add_task("[cyan]Leyendo el CSV", total=120)
    validar = progreso.add_task("[magenta]Validando importes", total=120)
    guardar = progreso.add_task("[green]Guardando en JSON", total=120)

    while not progreso.finished:
                progreso.advance(leer, 3)
        progreso.advance(validar, 2)
        progreso.advance(guardar, 1)
        time.sleep(0.05)
```

A mitad de camino:

```salida
Leyendo el CSV     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╺━━━━  88% 0:00:01
Validando importes ━━━━━━━━━━━━━━━━━━━━━━╺━━━━━━━━━━━━━━━  58% 0:00:02
Guardando en JSON  ━━━━━━━━━━━╺━━━━━━━━━━━━━━━━━━━━━━━━━━  29% 0:00:05
```

Y al final:

```salida
Leyendo el CSV     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:00
Validando importes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:00
Guardando en JSON  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100% 0:00:00
```

`progreso.finished` vale `True` cuando todas las tareas han llegado a su total, y es lo que permite ese `while` sin llevar la cuenta a mano. Las descripciones se han alineado solas, porque `rich` mide la más larga antes de empezar.

## `Status`: cuando no sabes cuánto falta

Una barra de progreso necesita saber el total. Para lo que tarda un rato indeterminado (una consulta a un servidor, una espera) hay un indicador que solo gira:

```python
import time

from rich.console import Console

consola = Console(width=70)

with consola.status("Conectando con el banco...") as estado:
        time.sleep(1)
    estado.update("Descargando los movimientos...")
    time.sleep(1)
    estado.update("[bold green]Guardando en gastos.json...")
    time.sleep(1)

consola.print("Listo: 37 movimientos descargados.")
```

Mientras corre, la terminal enseña una sola línea que va cambiando:

```salida
⠸ Conectando con el banco...
```

```salida
⠼ Guardando en gastos.json...
```

Y al salir del `with`, la línea desaparece y queda solo lo que imprimas después:

```salida
Listo: 37 movimientos descargados.
```

El `estado.update()` cambia el texto sin parar el giro. Y como el `with` limpia la línea al salir, el registro de la sesión queda limpio: no se acumulan diez mensajes de "conectando", solo queda el resultado.

## `Live`: actualizar una tabla en tiempo real

`Progress` y `Status` son casos particulares de algo más general: un objeto `Live` puede redibujar **cualquier** cosa de `rich` mientras el programa trabaja.

```python
import random
import time

from rich.live import Live
from rich.table import Table

CATEGORIAS = ["comida", "transporte", "ocio", "casa"]


def construir_tabla(totales: dict[str, float]) -> Table:
        tabla = Table(title="Gastos en directo")
    tabla.add_column("Categoría")
    tabla.add_column("Total", justify="right")
    tabla.add_column("Barra")
    mayor = max(totales.values(), default=1) or 1
    for categoria, total in sorted(totales.items(), key=lambda par: -par[1]):
                ancho = int(total / mayor * 20)
        tabla.add_row(categoria, f"{total:.2f} €", "█" * ancho)
    return tabla


random.seed(7)
totales = dict.fromkeys(CATEGORIAS, 0.0)

with Live(construir_tabla(totales), refresh_per_second=4) as directo:
        for _ in range(20):
                time.sleep(0.15)
        categoria = random.choice(CATEGORIAS)
        totales[categoria] += round(random.uniform(1, 25), 2)
        directo.update(construir_tabla(totales))
```

Un fotograma a mitad:

```salida
               Gastos en directo
┏━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┓
┃ Categoría  ┃   Total ┃ Barra                ┃
┡━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━┩
│ comida     │ 91.91 € │ ████████████████████ │
│ transporte │ 42.54 € │ █████████            │
│ ocio       │ 38.20 € │ ████████             │
│ casa       │ 32.27 € │ ███████              │
└────────────┴─────────┴──────────────────────┘
```

Y el final, con la tabla ya quieta en pantalla:

```salida
               Gastos en directo
┏━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┓
┃ Categoría  ┃    Total ┃ Barra                ┃
┡━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━┩
│ comida     │ 106.45 € │ ████████████████████ │
│ transporte │  55.45 € │ ██████████           │
│ ocio       │  38.20 € │ ███████              │
│ casa       │  32.27 € │ ██████               │
└────────────┴──────────┴──────────────────────┘
```

Fíjate en que la columna del total ha crecido una posición entre los dos fotogramas, porque el número pasó de dos a tres cifras. `Live` no parchea la pantalla: en cada refresco vuelve a dibujar el objeto entero, y por eso la función `construir_tabla` crea una tabla nueva cada vez en lugar de modificar la anterior.

Dos cosas que hay que saber:

- **`refresh_per_second`** limita los redibujados. Ponerlo alto no mejora nada y hace parpadear.
- **No imprimas con `print` dentro de un `Live`.** El dibujo y tu texto se pisarían. Si necesitas contar algo, usa `directo.console.print(...)`, que lo coloca encima de la zona viva.

> [!aviso] Todo esto necesita una terminal de verdad
>
> `Progress`, `Status` y `Live` funcionan moviendo el cursor y reescribiendo líneas. Si la salida va a un fichero o a una tubería, `rich` lo detecta y se comporta: no escribe la animación, solo el estado final. Es lo correcto, y es lo que hace que tu herramienta siga siendo utilizable dentro de un `|` sin llenar el resultado de basura. Pero conviene saberlo, porque explica por qué al redirigir la salida no ves la barra moverse.

## Preguntar con validación

En la lección 3 del módulo escribiste a mano las funciones que piden datos y no se rinden hasta recibir algo válido: el bucle, el `try`/`except` del `int()`, la comprobación de que la respuesta está en la lista de opciones y el mensaje de error. `rich` trae todo eso hecho.

```python
from rich.prompt import Confirm, FloatPrompt, Prompt

CATEGORIAS = ["comida", "transporte", "ocio", "casa", "otros"]

concepto = Prompt.ask("Concepto del gasto")
importe = FloatPrompt.ask("Importe en euros")
categoria = Prompt.ask("Categoría", choices=CATEGORIAS, default="otros")

if Confirm.ask(f"¿Apunto [bold]{concepto}[/bold] por {importe:.2f} €?"):
        print(f"Apuntado: {concepto} ({importe:.2f} €, {categoria})")
else:
        print("No he apuntado nada.")
```

Una sesión contestando bien a todo:

```salida
Concepto del gasto: Compra semanal
Importe en euros: 54.20
Categoría [comida/transporte/ocio/casa/otros] (otros): comida
¿Apunto Compra semanal por 54.20 €? [y/n]: y
Apuntado: Compra semanal (54.20 €, comida)
```

Y otra metiendo la pata a propósito:

```salida
Concepto del gasto: Compra semanal
Importe en euros: cincuenta euros
Please enter a number
Importe en euros: 54.20
Categoría [comida/transporte/ocio/casa/otros] (otros): deporte
Please select one of the available options
Categoría [comida/transporte/ocio/casa/otros] (otros): comida
¿Apunto Compra semanal por 54.20 €? [y/n]: n
No he apuntado nada.
```

Vuelve a preguntar, enseña las opciones disponibles entre corchetes y el valor por defecto entre paréntesis, y convierte el texto al tipo que toca. Eso es exactamente lo que escribiste a mano, en cuatro líneas.

Las clases disponibles:

| Clase | Qué devuelve |
| --- | --- |
| `Prompt` | Una cadena |
| `IntPrompt` | Un entero |
| `FloatPrompt` | Un número con decimales |
| `Confirm` | `True` o `False` |

Y los parámetros de `ask`:

| Parámetro | Qué hace |
| --- | --- |
| `default` | Valor si se pulsa <kbd>Intro</kbd> sin escribir nada |
| `choices` | Lista de respuestas admitidas |
| `case_sensitive=False` | Acepta las opciones sin distinguir mayúsculas |
| `show_default=False` | No enseña el valor por defecto |
| `show_choices=False` | No enseña las opciones |
| `password=True` | No muestra lo que se escribe |

### Los mensajes están en inglés

Ese `Please enter a number` desentona en un programa en español. Los textos son atributos de clase, así que se cambian heredando:

```python
from rich.prompt import Confirm


class Confirmar(Confirm):
        """Como Confirm, pero responde a «s» y «n» y avisa en español."""

    choices = ["s", "n"]
    validate_error_message = "[prompt.invalid]Responde s o n"


if Confirmar.ask("¿Borro todos los gastos?", default=False):
        print("Borrados.")
else:
        print("No he tocado nada.")
```

```salida
¿Borro todos los gastos? [s/n] (n): vale
Responde s o n
¿Borro todos los gastos? [s/n] (n): n
No he tocado nada.
```

Con dos atributos, la confirmación responde a la tecla que espera quien lee en español. Lo mismo vale para los demás: `Prompt` tiene `illegal_choice_message` y los numéricos tienen `validate_error_message`.

> [!consejo] Las preguntas van en la capa de terminal
>
> `Prompt` y `Confirm` llaman a `input()` por dentro. Eso significa que son de `cli.py`, nunca del núcleo, por lo que viste en la lección 20. Un módulo que pregunta no se puede probar sin simular un teclado, y no sirve detrás de una ventana ni de una web.
>
> Y un aviso práctico: en las pruebas, cualquier cosa que llame a `Prompt.ask` se quedará esperando para siempre. Una razón más para que la frontera esté clara.

## Markdown y código con formato

Dos objetos más, útiles para la ayuda y la documentación dentro del propio programa.

```python
from rich.console import Console
from rich.markdown import Markdown
from rich.syntax import Syntax

consola = Console(width=70)

ayuda = """
# misgastos

Apunta tus gastos desde la terminal.

## Órdenes

- `misgastos anadir CONCEPTO IMPORTE` apunta un gasto
- `misgastos listar` muestra lo apuntado
- `misgastos resumen` suma por categoría

> Los datos se guardan en `gastos.json`, en la carpeta actual.
"""

consola.print(Markdown(ayuda))

codigo = '''def total(gastos):
    """Suma los importes de todos los gastos."""
    return sum(gasto.importe for gasto in gastos)
'''

consola.print(Syntax(codigo, "python", theme="monokai", line_numbers=True))
```

```salida
                              misgastos                               

Apunta tus gastos desde la terminal.                                  

Órdenes                                                               

 • misgastos anadir CONCEPTO IMPORTE apunta un gasto                  
 • misgastos listar muestra lo apuntado                               
 • misgastos resumen suma por categoría                               

▌ Los datos se guardan en gastos.json, en la carpeta actual.          
  1 def total(gastos):                                                
  2     """Suma los importes de todos los gastos."""                  
  3     return sum(gasto.importe for gasto in gastos)                 
```

`Markdown` interpreta títulos, listas, citas, negritas, enlaces y bloques de código. Es la forma cómoda de tener un subcomando `misgastos ayuda` que enseñe un texto bien maquetado sin escribir el formato a mano; en color, los títulos salen destacados y el `gastos.json` de la cita en otro tono.

`Syntax` colorea código con `pygments`, que se instaló como dependencia de `rich`. Entiende decenas de lenguajes por su nombre, tiene varios temas (`monokai`, `dracula`, `github-dark`) y admite `line_numbers=True` para numerar. Sirve para enseñar un ejemplo de configuración, para volcar un fragmento de un fichero al informar de un error o para una herramienta que muestre código.

> [!nota] `Syntax.from_path` lee directamente de un fichero
>
> `Syntax.from_path("config.json")` carga el fichero y deduce el lenguaje por la extensión, sin que tengas que leerlo tú ni decirle de qué lenguaje se trata. Es de una línea y es lo que usarías en un subcomando que enseñe la configuración actual.

## Referencia de los componentes

Todo lo que has visto en las dos lecciones, junto:

| Componente | Se importa de | Para qué sirve |
| --- | --- | --- |
| `Console` | `rich.console` | El objeto central: imprime, mide la terminal y aplica los estilos |
| `print` | `rich` | Sustituto directo del `print` normal |
| `inspect` | `rich` | Enseña los atributos y métodos de un objeto |
| `Panel` | `rich.panel` | Un recuadro con título alrededor de cualquier contenido |
| `Table` | `rich.table` | Tablas con anchos automáticos y celdas que ajustan el texto |
| `Table.grid` | `rich.table` | Alinear cosas en columnas sin bordes ni cabecera |
| `box` | `rich` | Los estilos de borde de tablas y paneles |
| `track` | `rich.progress` | Barra de progreso al recorrer una secuencia, en una línea |
| `Progress` | `rich.progress` | Barras con columnas a medida y varias tareas a la vez |
| `Console.status` | `rich.console` | Indicador giratorio para esperas de duración desconocida |
| `Live` | `rich.live` | Redibuja cualquier objeto mientras el programa trabaja |
| `Prompt`, `IntPrompt`, `FloatPrompt` | `rich.prompt` | Preguntas con conversión de tipo, opciones y valor por defecto |
| `Confirm` | `rich.prompt` | Pregunta de sí o no |
| `Markdown` | `rich.markdown` | Renderiza texto en Markdown en la terminal |
| `Syntax` | `rich.syntax` | Código coloreado, con tema y números de línea |
| `escape` | `rich.markup` | Protege los corchetes del texto que viene de fuera |
| `traceback.install` | `rich.traceback` | Sustituye el traceback de Python por uno legible |
| `Columns` | `rich.columns` | Coloca varios elementos en columnas que se reparten el ancho |
| `Tree` | `rich.tree` | Dibuja jerarquías con las guías de un árbol de carpetas |
| `Align` | `rich.align` | Centra o alinea cualquier objeto dentro del ancho |
| `Layout` | `rich.layout` | Divide la pantalla en regiones, para interfaces completas |

Para ver casi todo esto funcionando de golpe, `rich` trae una demostración:

```bash
python -m rich
```

> [!consejo] Elige un componente y no los mezcles todos
>
> Con esta caja de herramientas es tentador poner paneles dentro de tablas dentro de barras de progreso. Una herramienta con una tabla clara y un mensaje de confirmación se usa mejor que una con seis colores, cuatro marcos y emojis en cada fila. La regla de siempre: el formato está para que la información se lea, no para que se note el formato.

> [!resumen] En resumen
>
> `Table` construye tablas en tres pasos, creándola, añadiendo columnas con su justificación y su estilo y añadiendo filas, y calcula sola los anchos, parte el texto largo dentro de la celda y reparte el espacio sobrante entre las columnas que declaran un `ratio`. El dibujo del borde se elige con `box`, donde `ASCII` es el seguro para terminales viejas y ficheros, y `Table.grid` da una variante sin bordes para maquetar. Para el progreso hay dos niveles: `track()` envuelve una secuencia en una línea, y `Progress` con un `with` permite elegir las columnas de porcentaje, tiempo transcurrido y tiempo restante y llevar varias barras a la vez, comprobando con `finished` si han terminado todas. `Status` cubre las esperas de duración desconocida y `Live` generaliza la idea a cualquier objeto, redibujándolo entero en cada refresco. `Prompt` y `Confirm` hacen lo que escribiste a mano en la lección 3: preguntan, validan, convierten al tipo pedido y vuelven a preguntar, y sus mensajes en inglés se traducen heredando y cambiando un par de atributos. Y `Markdown` y `Syntax` muestran texto y código con formato dentro de la propia terminal.

> [!ejercicio] Practica
>
> Trabaja sobre `misgastos` o sobre tu herramienta `misnotas`, con `rich` instalado y declarado en `dependencies`.
>
> 1. Sustituye el bucle de `print` del subcomando `listar` por una `Table` de verdad, con la fecha atenuada, el importe a la derecha y la categoría centrada. Añade una fila final con el total en negrita.
> 2. Prueba la misma tabla con cuatro valores distintos de `box` y quédate con el que mejor se lea. Comprueba cómo queda `box.ASCII` al redirigir la salida a un fichero.
> 3. Añade a `resumen` un `Panel` con un `Table.grid` dentro que muestre el total, la media y la categoría con más gasto.
> 4. Escribe un subcomando `importar` que lea un CSV con veinte filas y las vaya apuntando, envuelto en un `track()`. Después conviértelo a un `Progress` con columnas a medida, incluyendo `MofNCompleteColumn` y el tiempo restante.
> 5. Añade un `Confirm` en español antes de borrar un gasto, heredando de `Confirm` para que acepte «s» y «n» y avise en castellano. Compruébalo respondiendo primero algo que no valga.
> 6. Escribe un subcomando `ayuda` que muestre un texto en `Markdown` con las órdenes del programa, y otro que enseñe el fichero `gastos.json` con `Syntax.from_path`.
> 7. Monta con `Live` un panel que muestre durante cinco segundos un contador de gastos que va subiendo. Después comprueba qué pasa si pones un `print` normal dentro del `with`.
