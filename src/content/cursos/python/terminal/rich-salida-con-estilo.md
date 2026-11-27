---
titulo: "rich: salida con estilo"
resumen: "La primera biblioteca externa del curso: colores, paneles, reglas y volcado de objetos sin escribir un solo código ANSI."
minutos: 27
orden: 24
---

En las lecciones anteriores montaste a mano los colores de la terminal con códigos ANSI, las tablas con f-strings alineadas y las barras de progreso contando caracteres. Funciona, y ha merecido la pena hacerlo una vez: ahora sabes qué hay debajo. Pero también sabes lo que cuesta. Una tabla con anchos que se ajusten al contenido son cuarenta líneas, y un color mal cerrado te deja la terminal en rojo hasta que la cierras.

`rich` es una biblioteca que hace todo eso. No inventa nada que no pudieras escribir tú; lo que hace es que no tengas que escribirlo. Es la primera biblioteca externa del curso, y es una buena primera porque no tiene dependencias raras, funciona en los tres sistemas operativos y se nota desde la primera línea.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás instalar `rich`, dar color y estilo al texto con su marcado, dibujar paneles y reglas, controlar el resaltado automático y volcar estructuras de datos y excepciones de forma legible.

> [!nota] Las salidas de esta lección salen en color
>
> Todos los ejemplos están ejecutados de verdad, pero las capturas se han tomado redirigiendo la salida a un fichero. Al hacer eso, `rich` detecta que no está escribiendo en una terminal y omite los códigos de color, aunque conserva el dibujo de los bordes y el ajuste de los textos. En tu terminal verás exactamente lo mismo, con los colores puestos.

## Instalarla

Con el entorno virtual del proyecto activado:

```bash
pip install rich
```

```salida
Collecting rich
  Using cached rich-15.0.0-py3-none-any.whl.metadata (18 kB)
Collecting markdown-it-py>=2.2.0 (from rich)
  Using cached markdown_it_py-4.2.0-py3-none-any.whl.metadata (7.4 kB)
Collecting pygments<3.0.0,>=2.13.0 (from rich)
  Using cached pygments-2.21.0-py3-none-any.whl.metadata (2.5 kB)
Collecting mdurl~=0.1 (from markdown-it-py>=2.2.0->rich)
  Using cached mdurl-0.1.2-py3-none-any.whl.metadata (1.6 kB)
Installing collected packages: pygments, mdurl, markdown-it-py, rich
Successfully installed markdown-it-py-4.2.0 mdurl-0.1.2 pygments-2.21.0 rich-15.0.0
```

Cuatro paquetes: `rich` y tres dependencias suyas. `pygments` es el que colorea el código fuente y `markdown-it-py` el que interpreta Markdown, dos cosas que verás en la lección siguiente.

Si tu herramienta va a usar `rich`, acuérdate de declararlo en el `pyproject.toml`, porque si no, quien la instale no lo tendrá:

```text title="pyproject.toml"
dependencies = [
    "rich>=13.0",
]
```

## El objeto `Console`

Todo en `rich` gira alrededor de una `Console`. Se crea una vez y se usa en todo el programa, y su método `print` sustituye al `print` normal:

```python
from rich.console import Console

consola = Console()

consola.print("Hola desde rich")
consola.print("Un texto [bold]en negrita[/bold] y otro [italic]en cursiva[/italic]")
consola.print("Peligro: [bold red]saldo negativo[/bold red]")
consola.print("Fondo y color: [white on blue] RESUMEN [/white on blue]")
consola.print("Cerrar sin nombre: [bold]así también vale[/]")
```

```salida
Hola desde rich
Un texto en negrita y otro en cursiva
Peligro: saldo negativo
Fondo y color:  RESUMEN 
Cerrar sin nombre: así también vale
```

## El marcado entre corchetes

Eso de `[bold red]...[/bold red]` es el **marcado** de `rich`, y funciona como el HTML: una etiqueta de apertura entre corchetes, el texto, y una de cierre con una barra delante. La etiqueta de cierre puede ir vacía, `[/]`, y cierra la última que se abriera.

Dentro de la etiqueta caben varias palabras separadas por espacios, y `rich` las combina:

| Etiqueta | Efecto |
| --- | --- |
| `[bold]` | Negrita |
| `[italic]` | Cursiva |
| `[underline]` | Subrayado |
| `[strike]` | Tachado |
| `[dim]` | Atenuado |
| `[reverse]` | Colores invertidos |
| `[red]` | Color de letra |
| `[on blue]` | Color de fondo |
| `[bold red on white]` | Todo a la vez |

La ventaja sobre los códigos ANSI que escribiste a mano no es solo que se lea mejor. Es que `rich` **cierra siempre**: aunque tu programa muera en mitad de una línea, la terminal no se queda pintada de rojo, porque el estilo se aplica por trozos y no como un interruptor global.

## Escapar los corchetes

El precio de ese marcado es que los corchetes pasan a ser especiales. Si imprimes un texto que los contiene, `rich` intentará interpretarlos:

```python
from rich.console import Console
from rich.markup import escape

consola = Console()

etiquetas = "[red] y [bold]"

# rich se come los corchetes: cree que son estilos.
consola.print(f"Etiquetas del gasto: {etiquetas}")

# Con la barra invertida delante del corchete de apertura se imprimen literales.
consola.print(r"Etiquetas del gasto: \[red] y \[bold]")

# escape() pone esas barras por ti. Es lo que se usa con datos de fuera.
consola.print(f"Etiquetas del gasto: {escape(etiquetas)}")

# O se apaga el marcado para esa línea.
consola.print(f"Etiquetas del gasto: {etiquetas}", markup=False)

print(escape("[red]"))
```

```salida
Etiquetas del gasto:  y 
Etiquetas del gasto: [red] y [bold]
Etiquetas del gasto: [red] y [bold]
Etiquetas del gasto: [red] y [bold]
\[red]
```

La primera línea ha perdido los corchetes y lo que había dentro: `rich` los ha tomado por estilos y los ha aplicado. Las tres soluciones son la barra invertida a mano, la función `escape()` y desactivar el marcado con `markup=False`.

> [!aviso] Escapa siempre lo que venga de fuera
>
> Un concepto de gasto escrito por quien usa el programa, el contenido de un fichero, el nombre de un fichero o un mensaje de error pueden contener corchetes. Si los pasas sin escapar, el texto se mutilará como en la primera línea del ejemplo, y en el peor caso `rich` protestará por un estilo que no existe.
>
> La regla práctica: el marcado es para el texto que escribes tú en el código; todo lo que llegue en una variable de fuera pasa antes por `escape()`.

## Colores

Hay tres formas de nombrar un color, y se pueden mezclar:

```python
from rich.console import Console

consola = Console()

# Por nombre
consola.print("[green]Pagado[/green] · [yellow]Pendiente[/yellow] · [red]Vencido[/red]")

# Por número de la paleta de 256
consola.print("[color(208)]Naranja del 208[/color(208)]")

# En hexadecimal
consola.print("[#1e88e5]Azul corporativo #1e88e5[/#1e88e5]")

# Fondo en hexadecimal
consola.print("[bold white on #b71c1c] IMPORTE FUERA DE PRESUPUESTO [/]")

# Varios estilos a la vez
consola.print("[bold underline #00897b]Total del mes[/]")
```

```salida
Pagado · Pendiente · Vencido
Naranja del 208
Azul corporativo #1e88e5
 IMPORTE FUERA DE PRESUPUESTO 
Total del mes
```

- **Por nombre** hay unos ciento cincuenta: los ocho de siempre (`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`), sus versiones brillantes con el prefijo `bright_`, y una lista larga con nombres como `deep_sky_blue1` o `dark_orange3`.
- **Por número**, con `color(N)` y un número del 0 al 255, que es la paleta estándar de las terminales.
- **En hexadecimal**, con la misma notación que en la web. Es la que usarás si tienes unos colores de marca.

Para ver la lista completa de nombres en tu propia terminal:

```bash
python -m rich.color
```

> [!nota] rich se adapta a la terminal que tenga delante
>
> Si la terminal solo admite 256 colores, `rich` convierte tu `#1e88e5` al más parecido de la paleta. Si no admite color ninguno, o si la salida va a un fichero o a una tubería, no escribe códigos de color en absoluto. Por eso las capturas de esta lección salen en blanco y negro y aun así se entienden: el texto nunca queda ensuciado con caracteres raros.

## El resaltado automático

`rich` mira lo que imprimes y colorea solo los números, las cadenas entre comillas, las rutas, las direcciones web, los `True`, los `False` y los `None`. Se llama resaltado automático y está activado por defecto:

```python
from rich.console import Console

consola = Console()

consola.print("He apuntado 4 gastos por 76.20 euros en /home/erwin/gastos.json")
consola.print({"comida": 55.8, "ocio": 18.0, "transporte": 2.4})
consola.print("Sin resaltar: 4 gastos, 76.20 euros", highlight=False)

sin_resaltado = Console(highlight=False)
sin_resaltado.print("Esta consola nunca resalta: 4 gastos, 76.20 euros")
```

```salida
He apuntado 4 gastos por 76.20 euros en /home/erwin/gastos.json
{'comida': 55.8, 'ocio': 18.0, 'transporte': 2.4}
Sin resaltar: 4 gastos, 76.20 euros
Esta consola nunca resalta: 4 gastos, 76.20 euros
```

En la terminal, las dos primeras líneas salen con los números y la ruta en colores distintos, y las dos últimas en blanco.

Es cómodo para depurar y molesto para los mensajes cuidados, porque te pinta de color cosas que no querías destacar. Se apaga en una llamada suelta con `highlight=False` o para toda la consola pasándoselo al constructor. En una herramienta con una salida diseñada, lo normal es crear la consola con el resaltado apagado y colorear a mano lo que interese.

## `rich.print` como sustituto directo

Si no quieres crear una consola, `rich` trae una función `print` que usa una consola global:

```python
from rich import print

print("Hola desde [bold green]rich.print[/bold green]")
print({"comida": 55.8, "ocio": 18.0})
print([1, 2, 3], (True, None))
```

```salida
Hola desde rich.print
{'comida': 55.8, 'ocio': 18.0}
[1, 2, 3]
(True, None)
```

Ese `from rich import print` tapa el `print` normal en ese fichero, lo cual es a la vez su gracia y su peligro: te da color en todo el programa cambiando una línea, pero cualquiera que lea el fichero verá `print(...)` y pensará en el de siempre. Para un script corto está bien; en una herramienta con varios módulos, crea una `Console` y pásala por ahí, que se ve de dónde sale.

## Justificar, recortar y ajustar al ancho

`rich` conoce el ancho de la terminal y lo usa para colocar el texto:

```python
from rich.console import Console

consola = Console(width=40)

concepto = "Compra semanal del supermercado del barrio"

consola.print("Centrado", justify="center")
consola.print("A la derecha", justify="right")
consola.print(concepto, justify="full")
consola.rule()
consola.print(concepto, overflow="ellipsis", no_wrap=True)
consola.print(concepto, overflow="crop", no_wrap=True)
consola.print(concepto)
```

```salida
                Centrado                
                            A la derecha
Compra  semanal  del  supermercado   del
barrio
────────────────────────────────────────
Compra semanal del supermercado del bar…
Compra semanal del supermercado del barr
Compra semanal del supermercado del 
barrio
```

Lo que hace cada opción:

- **`justify`** coloca el texto dentro del ancho: `"left"` por defecto, `"center"`, `"right"` y `"full"`, que reparte espacios entre las palabras para que las dos márgenes queden rectos, como en un periódico.
- **`no_wrap=True`** impide que el texto salte de línea.
- **`overflow`** decide qué pasa con lo que sobra: `"ellipsis"` lo corta y pone puntos suspensivos, `"crop"` lo corta a secas y `"fold"`, que es lo que hace por defecto, lo pasa a la línea siguiente.

El `Console(width=40)` del ejemplo fija el ancho para que la captura sea estable. En un programa de verdad no se pone: sin él, `rich` mide la terminal y usa su ancho real, y si la salida va a un fichero usa 80 columnas.

## Reglas con `rule`

Una línea horizontal, con un título opcional en medio, para separar secciones:

```python
from rich.console import Console

consola = Console(width=60)

consola.rule()
consola.rule("Gastos de septiembre")
consola.rule("[bold red]Fuera de presupuesto", style="red")
consola.rule("A la izquierda", align="left")
consola.rule("Con otro carácter", characters="=")
```

```salida
────────────────────────────────────────────────────────────
─────────────────── Gastos de septiembre ───────────────────
─────────────────── Fuera de presupuesto ───────────────────
A la izquierda ─────────────────────────────────────────────
==================== Con otro carácter =====================
```

Es el equivalente a aquel `print("-" * 60)` que escribías a mano, pero midiendo la terminal sola y con el título centrado sin hacer cuentas.

## Paneles

Un `Panel` es un recuadro alrededor de un contenido. Sirve para destacar un mensaje, encuadrar un resumen o avisar de algo:

```python
from rich.console import Console
from rich.panel import Panel

consola = Console(width=60)

consola.print(Panel("Se han apuntado 4 gastos."))
consola.print(Panel("Se han apuntado 4 gastos.", title="misgastos"))
consola.print(
    Panel(
        "Llevas [bold]76.20 €[/bold] gastados este mes.\n"
        "El presupuesto eran 60.00 €.",
        title="[bold red]Aviso",
        subtitle="septiembre de 2026",
        border_style="red",
        padding=(1, 2),
    )
)
consola.print(Panel("Solo lo que ocupa el texto", expand=False))
```

```salida
╭──────────────────────────────────────────────────────────╮
│ Se han apuntado 4 gastos.                                │
╰──────────────────────────────────────────────────────────╯
╭─────────────────────── misgastos ────────────────────────╮
│ Se han apuntado 4 gastos.                                │
╰──────────────────────────────────────────────────────────╯
╭───────────────────────── Aviso ──────────────────────────╮
│                                                          │
│  Llevas 76.20 € gastados este mes.                       │
│  El presupuesto eran 60.00 €.                            │
│                                                          │
╰─────────────────── septiembre de 2026 ───────────────────╯
╭────────────────────────────╮
│ Solo lo que ocupa el texto │
╰────────────────────────────╯
```

Los parámetros que vas a usar:

- **`title` y `subtitle`**, arriba y abajo, y admiten marcado.
- **`border_style`**, un estilo para el borde entero.
- **`padding`**, el hueco entre el borde y el contenido, como `(vertical, horizontal)`.
- **`expand=False`**, para que el panel mida lo que mida el contenido en vez de ocupar el ancho entero.

Y un detalle importante: lo que le pasas a `Panel` no tiene que ser texto. Puede ser otro objeto de `rich`, por ejemplo una tabla, y lo verás en la lección siguiente.

## Emojis

`rich` traduce los nombres de emoji entre dos puntos, con la misma lista que usan otras herramientas:

```python
from rich.console import Console

consola = Console(width=60)

consola.print(":white_check_mark: Gasto apuntado")
consola.print(":cross_mark: El importe debe ser positivo")
consola.print(":warning: Te quedan 3.80 € de presupuesto")
consola.print(":money_with_wings: :bar_chart: :file_folder: :hourglass:")
consola.print("Sin traducir: :white_check_mark:", emoji=False)
```

```salida
✅ Gasto apuntado
❌ El importe debe ser positivo
⚠ Te quedan 3.80 € de presupuesto
💸 📊 📁 ⌛
Sin traducir: :white_check_mark:
```

Para ver la lista entera:

```bash
python -m rich.emoji
```

> [!aviso] Los emojis no se ven igual en todas partes
>
> Dependen de la fuente de la terminal. En Windows con la consola antigua muchos salen como un cuadrado, y algunos ocupan dos columnas en un sitio y una en otro, lo que te descuadra las tablas. Si tu herramienta la va a usar gente con terminales que no controlas, quédate con los símbolos sencillos, o con caracteres como `✓` y `✗`, o deja que se puedan apagar con una opción.

## Volcar objetos de forma legible

El `print` normal imprime un diccionario anidado en una sola línea kilométrica. El de `rich` lo reparte y lo indenta:

```python
from rich import print

presupuesto = {
    "mes": "septiembre",
    "limite": 60.0,
    "categorias": {
        "comida": {"limite": 30.0, "gastado": 55.8},
        "ocio": {"limite": 20.0, "gastado": 18.0},
    },
    "avisos": ["comida por encima del límite", "quedan 11 días"],
}

print(presupuesto)
```

```salida
{
    'mes': 'septiembre',
    'limite': 60.0,
    'categorias': {
        'comida': {'limite': 30.0, 'gastado': 55.8},
        'ocio': {'limite': 20.0, 'gastado': 18.0}
    },
    'avisos': ['comida por encima del límite', 'quedan 11 días']
}
```

Fíjate en que no lo rompe todo a lo tonto: los diccionarios pequeños caben en una línea y se quedan en una línea. `rich` mide antes de decidir.

Para inspeccionar un objeto por dentro está `inspect`, que enseña su documentación, sus atributos y sus métodos:

```python
from dataclasses import dataclass

from rich import inspect
from rich.console import Console

consola = Console(width=70)


@dataclass
class Gasto:
        """Un gasto apuntado."""

    concepto: str
    importe: float
    categoria: str = "otros"

    def encarecer(self, porcentaje: float) -> float:
                """Devuelve el importe subido en ese porcentaje."""
        return self.importe * (1 + porcentaje / 100)


inspect(Gasto("Café con leche", 1.60, "comida"), console=consola, methods=True)
```

```salida
╭───────────────────── <class '__main__.Gasto'> ─────────────────────╮
│ Un gasto apuntado.                                                 │
│                                                                    │
│ ╭────────────────────────────────────────────────────────────────╮ │
│ │ Gasto(                                                         │ │
│ │ │   concepto='Café con leche',                                 │ │
│ │ │   importe=1.6,                                               │ │
│ │ │   categoria='comida'                                         │ │
│ │ )                                                              │ │
│ ╰────────────────────────────────────────────────────────────────╯ │
│                                                                    │
│ categoria = 'comida'                                               │
│  concepto = 'Café con leche'                                       │
│   importe = 1.6                                                    │
│ encarecer = def encarecer(porcentaje: float) -> float: Devuelve el │
│             importe subido en ese porcentaje.                      │
╰────────────────────────────────────────────────────────────────────╯
```

Ahí está todo: el docstring de la clase, el `repr` del objeto, sus tres atributos con sus valores y el método con su firma y su docstring. `methods=True` es lo que hace que aparezcan los métodos; sin él solo salen los datos.

`inspect` es una herramienta de exploración, no de programa terminado: sirve para mirar qué trae un objeto de una biblioteca que no conoces, y para eso es más rápido que buscar la documentación. Pruébalo con `inspect(inspect)` para ver todas sus opciones.

## Excepciones legibles

Un traceback de Python es útil pero incómodo de leer, sobre todo cuando tiene diez niveles. `rich` puede sustituirlo por uno con la línea del fallo destacada y el valor de las variables de cada marco:

```python title="medias.py"
from rich.console import Console
from rich.traceback import install

install(show_locals=True, width=76)


def calcular_media(importes):
        return sum(importes) / len(importes)


consola = Console(width=76)
consola.print("Calculando la media de los gastos...")
print(calcular_media([]))
```

```bash
python3 medias.py
```

```salida
Calculando la media de los gastos...
╭─────────────────── Traceback (most recent call last) ────────────────────╮
│ /Users/erwin/proyectos/misgastos/medias.py:13 in <module>                │
│                                                                          │
│   10                                                                     │
│   11 consola = Console(width=76)                                         │
│   12 consola.print("Calculando la media de los gastos...")               │
│ ❱ 13 print(calcular_media([]))                                           │
│   14                                                                     │
│                                                                          │
│ ╭───────────── locals ──────────────╮                                    │
│ │ consola = <console width=76 None> │                                    │
│ ╰───────────────────────────────────╯                                    │
│                                                                          │
│ /Users/erwin/proyectos/misgastos/medias.py:8 in calcular_media           │
│                                                                          │
│    5                                                                     │
│    6                                                                     │
│    7 def calcular_media(importes):                                       │
│ ❱  8 │   return sum(importes) / len(importes)                            │
│    9                                                                     │
│   10                                                                     │
│   11 consola = Console(width=76)                                         │
│                                                                          │
│ ╭─── locals ────╮                                                        │
│ │ importes = [] │                                                        │
│ ╰───────────────╯                                                        │
╰──────────────────────────────────────────────────────────────────────────╯
ZeroDivisionError: division by zero
```

La flecha `❱` marca la línea que falló, y alrededor se ven las de contexto con su número. Pero lo que de verdad ahorra tiempo es el recuadro `locals`: ahí está `importes = []`, que es la causa del problema, sin haber tenido que poner un solo `print` para averiguarlo.

Basta con llamar a `install()` una vez, al principio del programa. A partir de ahí, cualquier excepción que no captures se imprime así.

> [!aviso] `show_locals=True` puede enseñar cosas que no debe
>
> El recuadro de variables locales imprime el contenido de todo lo que haya en ese momento en cada función, y eso incluye contraseñas, claves de acceso y datos personales. Está muy bien mientras desarrollas, pero piénsalo dos veces antes de dejarlo activado en un programa que otros ejecuten o cuyos registros se guarden en algún sitio. `install()` a secas, sin `show_locals`, da el traceback bonito sin ese riesgo.

> [!consejo] Una consola para toda la herramienta
>
> En un proyecto con varios módulos, crea una sola consola y compártela, por ejemplo en `cli.py`, y pásala como parámetro a las funciones que pintan. Así puedes crearla con las opciones que quieras (`highlight=False`, un ancho fijo, o `stderr=True` para los mensajes de error) y cambiarlas en un solo sitio. Y en las pruebas puedes darles otra consola distinta, configurada para escribir donde tú quieras.

> [!error] MarkupError: closing tag doesn't match any open tag
>
> El mensaje completo, al imprimir `"Un texto [bold]en negrita[/italic] mal cerrado"`:
>
> ```salida
> rich.errors.MarkupError: closing tag '[/italic]' at position 25 doesn't match any open tag
> ```
>
> Has cerrado una etiqueta que no estaba abierta, normalmente por un error de escritura o porque el texto venía de fuera con corchetes dentro. `rich` te da la posición exacta dentro de la cadena. Revisa la línea contando aperturas y cierres, y si el texto no lo escribiste tú, pásalo por `escape()`. Si te lías con los nombres, recuerda que `[/]` cierra la última etiqueta abierta, sea cual sea.

> [!error] El texto sale con caracteres raros como `[0m` o `[1;31m`
>
> Esos son los códigos ANSI sin interpretar, y significan que algo está escribiendo color donde no se puede. Suele pasar al capturar la salida de un programa desde otro forzando el color, o en una consola de Windows muy antigua. `rich` solo, sin forzarle nada, no lo hace: detecta el destino y calla.
>
> Comprueba que no tienes la variable de entorno `FORCE_COLOR` puesta, y que no estás creando la consola con `Console(force_terminal=True)`.

> [!aviso] Añadir una dependencia tiene un coste
>
> `rich` es excelente y esta lección debería haberte convencido. Aun así, conviene decir la otra mitad.
>
> Cada dependencia que añades es código que no controlas, que puede cambiar, que puede dejar de mantenerse y que tiene que instalarse en el ordenador de todo el que use tu programa. En el caso de `rich` son cuatro paquetes y unos cuantos megas, y a partir de ahora tu herramienta ya no arranca en un sistema donde no se pueda instalar nada.
>
> Para un script de treinta líneas que imprime tres mensajes, la biblioteca estándar basta y sobra: un par de f-strings y los códigos ANSI que ya sabes escribir. Para una herramienta con tablas, barras de progreso y una salida que quieres que esté bien, `rich` te ahorra semanas y no hay discusión.
>
> La pregunta útil no es si la biblioteca es buena, sino si lo que resuelve es un problema que tienes. Y esa pregunta hay que hacérsela una vez por dependencia, no una vez por proyecto.

> [!resumen] En resumen
>
> `rich` es una biblioteca externa que se instala con pip y que resuelve de golpe todo lo que en las lecciones anteriores hubo que montar a mano. Gira alrededor del objeto `Console`, cuyo método `print` entiende un marcado entre corchetes al estilo del HTML, con estilos combinables y colores por nombre, por número de la paleta de 256 o en hexadecimal. El precio es que los corchetes pasan a ser especiales, así que todo el texto que venga de fuera hay que pasarlo por `escape()`. Trae resaltado automático de números, cadenas y rutas, que se apaga con `highlight=False`; un `rich.print` que sustituye al de siempre en una línea; control de la justificación, el recorte y el ajuste al ancho real de la terminal; reglas con `rule` y recuadros con `Panel`; traducción de emojis por su nombre; volcado legible de estructuras anidadas y de objetos con `inspect`; y un manejador de excepciones que se instala con `rich.traceback.install()` y enseña la línea culpable junto con el valor de las variables. Todo eso a cambio de cuatro paquetes instalados, que es una decisión que hay que tomar a sabiendas y no por costumbre.

> [!ejercicio] Practica
>
> Crea una carpeta nueva con su entorno virtual, instala `rich` y resuelve en un fichero `24-rich.py`.
>
> 1. Crea una `Console` e imprime cinco líneas que combinen negrita, cursiva, subrayado, color de letra y color de fondo. Usa las tres formas de indicar un color: por nombre, con `color(N)` y en hexadecimal.
> 2. Imprime una lista de conceptos leída de una variable que contenga corchetes, primero sin escapar y después con `escape()`. Observa la diferencia y explica por escrito qué ha pasado con la primera.
> 3. Imprime la misma frase con números y una ruta dentro, con el resaltado automático activado y desactivado, y después crea una segunda consola con `highlight=False` para toda ella.
> 4. Pinta un informe de gastos ficticio usando `rule` para separar tres secciones y un `Panel` para el total, con título, subtítulo y color de borde.
> 5. Construye un diccionario anidado con al menos tres niveles e imprímelo con el `print` normal y con el de `rich`. Después pásale una dataclass tuya a `inspect` con `methods=True`.
> 6. Instala el manejador de excepciones con `show_locals=True` y provoca a propósito un `KeyError` dentro de una función con tres variables locales. Comprueba que las tres aparecen en el recuadro.
