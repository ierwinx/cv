---
titulo: "Las pestañas: Notebook"
resumen: "Repartir una interfaz en pestañas: el widget que debe ser padre de sus páginas, el select que devuelve un nombre y no un widget, las tres formas de esconder una pestaña, y el evento que salta antes de que tu programa exista."
minutos: 25
orden: 28
---

Las cinco lecciones que quedan del bloque son de **organización**: widgets que no muestran datos, sino que reparten el sitio. El `Notebook` es el primero y el más usado, y es la respuesta a un problema que ya ha salido dos veces en el bloque: cuando hay más controles de los que caben, la primera opción no es una barra de desplazamiento, son pestañas.

Lo dijo la lección 24 al final de la receta del `Canvas` desplazable, y lo dijo la 21 hablando de formularios largos. Diecisiete campos seguidos casi siempre son tres grupos de seis, y en pestañas se navegan mejor, con menos código y sin ningún truco.

El widget es sencillo y tiene pocas sorpresas, pero las que tiene son de las que cuestan una tarde: un `select` que no devuelve lo que parece, tres formas distintas de esconder una pestaña que no son equivalentes, y un evento que se dispara antes de que tu interfaz esté construida.

> [!objetivo] Qué vas a aprender
>
> Montar pestañas con un `Frame` por página y entender por qué cada página tiene que ser hija del `Notebook`; leer y cambiar la pestaña activa sabiendo qué devuelve `select`; distinguir `hide`, `forget` y `state="hidden"`; controlar el tamaño, que lo decide la página más grande; reaccionar al cambio de pestaña sin que el programa falle al arrancar; y dejarlo manejable con el teclado.

## Una página por pestaña

Solo existe en la familia temática, y se usa en dos pasos: crear el `Notebook` y añadirle páginas.

```python
pestanas = ttk.Notebook(cuerpo)
pestanas.pack(fill="both", expand=True)

general = ttk.Frame(pestanas, padding=MARGEN)
avanzado = ttk.Frame(pestanas, padding=MARGEN)

pestanas.add(general, text="General")
pestanas.add(avanzado, text="Avanzado")
```

Cada página es **un `Frame`**, y dentro de ese `Frame` se monta lo que sea con `pack` o `grid` como en cualquier otro sitio. El `Notebook` no impone nada al contenido; solo decide cuál se ve.

Y ahí está el primer detalle importante, que además es fácil de escribir mal:

> [!aviso] Cada página tiene que ser hija del `Notebook`
>
> Mira el `ttk.Frame(pestanas, ...)` del ejemplo: el padre es el `Notebook`, no la ventana ni el `Frame` del cuerpo. Si te equivocas, pasa una de dos cosas, y la mala es la primera.
>
> Si pones un widget que está **al lado** del `Notebook`, o sea hijo del mismo padre, `add` lo acepta sin decir nada y la pestaña queda muerta:
>
> ```consola
> >>> ajeno = ttk.Frame(ventana)          # hijo de la ventana, no del Notebook
> >>> pestanas.add(ajeno, text="Ajeno")
> >>> ajeno.winfo_parent()
> '.'
> >>> ajeno.winfo_ismapped()
> 0
> ```
>
> El padre sigue siendo la ventana, el widget nunca se muestra y no hay ningún error. La pestaña aparece en la fila de arriba y al pulsarla no se ve nada.
>
> Si en cambio pones un **nieto**, un `Frame` dentro de otro `Frame` que sí es hijo del `Notebook`, entonces sí protesta y con un mensaje claro:
>
> ```consola
> >>> pestanas.add(nieto, text="Nieto")
> _tkinter.TclError: cannot add ".!notebook.!frame.!frame" as content of ".!notebook"
> ```
>
> Así que la regla es simple y conviene aplicarla mecánicamente: **el primer argumento de cada página es el `Notebook`.** Si una pestaña sale en blanco y no hay ningún error, eso es lo primero que hay que mirar.

## Las opciones de cada pestaña

`add` acepta bastante más que el texto, y `tab` permite cambiarlo después:

```consola
>>> pestanas.tab(general)
{'padding': [0], 'sticky': 'nsew', 'state': 'normal', 'text': 'General',
 'image': '', 'compound': '', 'underline': ''}
```

| Opción | Para qué |
| --- | --- |
| `text` | El rótulo de la pestaña |
| `underline` | El índice de la letra subrayada, para el atajo de teclado |
| `image` y `compound` | Un icono, y cómo se combina con el texto, igual que en el botón |
| `state` | `normal`, `disabled` o `hidden` |
| `sticky` | Cómo se estira la página dentro del hueco. De fábrica `nsew`, y así está bien |
| `padding` | Relleno alrededor de la página |

El `padding` merece una nota práctica. Se puede poner aquí, en la pestaña, o en el `Frame` de la página al crearlo. Es más cómodo en el `Frame`, porque así cada página lleva el suyo y se ve en la misma línea donde se crea; el `padding` de la pestaña sirve cuando quieres el mismo para todas y lo pones en un bucle.

Y el `Notebook` en sí solo tiene siete opciones:

```consola
>>> sorted(ttk.Notebook(ventana).configure().keys())
['class', 'cursor', 'height', 'padding', 'style', 'takefocus', 'width']
```

## Leer y cambiar la pestaña activa

Aquí está la sorpresa que da más guerra:

```consola
>>> pestanas.select()
'.!notebook.!frame'
>>> type(pestanas.select())
<class 'str'>
```

**`select()` devuelve el nombre interno del widget, no el widget.** Es una cadena con la ruta que Tk usa por dentro. La consecuencia es que la comparación que uno escribe sin pensar nunca es verdad:

```python
if pestanas.select() == general:        # nunca, es str contra widget
        ...
```

Hay tres formas de arreglarlo y las tres valen:

```consola
>>> pestanas.nametowidget(pestanas.select()) is general
True
>>> pestanas.index(pestanas.select())
0
>>> pestanas.tab("current")["text"]
'General'
```

La primera convierte el nombre en el widget. La segunda da el número de la pestaña, contando desde cero. Y la tercera, que suele ser la más legible, usa la palabra reservada `"current"` y lee el rótulo.

Para cambiar de pestaña, el mismo método con argumento:

```python
pestanas.select(avanzado)        # por widget
pestanas.select(0)               # por posición
```

Una pestaña se puede identificar de varias maneras en cualquier método que la pida: por el widget, por su número, con `"current"` para la activa, y con `"@x,y"` para la que está en un punto, que es lo que hace falta para un menú contextual sobre la fila de pestañas. Lo que no funciona es `"end"`, que solo vale para contar:

```consola
>>> pestanas.index("end")
3
>>> pestanas.tab("end")
_tkinter.TclError: Tab index "end" out of bounds
```

Ese `index("end")` es la forma de saber cuántas pestañas hay. Y `tabs()` da la lista completa, también de nombres:

```consola
>>> pestanas.tabs()
('.!notebook.!frame', '.!notebook.!frame2', '.!notebook.!frame3')
```

## Tres formas de esconder una pestaña

No son equivalentes y elegir la que no toca da problemas. Medido:

```consola
>>> pestanas.hide(avanzado)
>>> len(pestanas.tabs())
3
>>> pestanas.add(avanzado)              # la devuelve
>>> pestanas.tab(avanzado)["text"]
'Avanzado'
```

`hide` la quita de la vista pero **la recuerda**: sigue contando en `tabs()`, y un `add` sin argumentos la devuelve con su rótulo intacto. Es lo que quieres para esconder algo temporalmente.

```consola
>>> pestanas.forget(avanzado)
>>> len(pestanas.tabs())
2
>>> pestanas.tab(avanzado)
_tkinter.TclError: .!notebook.!frame2 is not managed by .!notebook
>>> avanzado.winfo_exists()
1
```

`forget` la desvincula de verdad. Deja de estar gestionada, preguntar por ella da error, y **el `Frame` sigue existiendo** aunque ya no pertenezca al `Notebook`, lo que permite volver a añadirla, eso sí, repitiendo el texto y las demás opciones, que se han perdido.

Y la tercera es una opción de la pestaña:

```python
pestanas.tab(avanzado, state="hidden")
```

Que hace lo mismo que `hide` pero se escribe como configuración, lo cual encaja mejor si ya estás decidiendo estados. La cuarta posibilidad, que no esconde nada, es dejarla a la vista pero inaccesible:

```python
pestanas.tab(avanzado, state="disabled")
```

> [!aviso] Una pestaña desactivada no se puede seleccionar, y no te lo dice
>
> ```consola
> >>> pestanas.tab(acerca, state="disabled")
> >>> pestanas.select(acerca)
> >>> pestanas.index("current")
> 0
> ```
>
> El `select` no ha hecho nada y no ha lanzado ningún error: seguimos en la pestaña cero. Es el mismo tipo de fallo silencioso que el `Canvas` de la lección 25, y la forma de evitarlo es comprobar el estado antes de seleccionar, o al revés, activar la pestaña y después seleccionarla.
>
> Y una nota de criterio: `disabled` es mejor que `hidden` cuando quieres que se vea **que la pestaña existe** aunque ahora no se pueda usar, porque una pestaña que aparece y desaparece deja a quien mira sin saber si la recordaba mal. Esconder está bien cuando la pestaña no aplica en absoluto, como una sección de una función que no está contratada.

## El tamaño lo decide la página más grande

Esto explica un comportamiento que desconcierta:

```consola
>>> primera.winfo_reqwidth(), segunda.winfo_reqwidth()
(36, 267)
>>> pestanas.winfo_reqwidth()
321
```

El `Notebook` pide el tamaño de **la página más grande**, no el de la activa. Todas las pestañas ocupan lo mismo.

Eso es deliberado y es lo que quieres, porque si no la ventana cambiaría de tamaño al cambiar de pestaña, que se siente como un fallo. Pero tiene una consecuencia: **una sola página grande agranda todas**. Si tienes tres pestañas cómodas y una con una tabla enorme, las tres cómodas salen con un montón de sitio vacío.

Dos salidas. La primera es fijar el tamaño en el `Notebook`, y entonces manda él:

```consola
>>> nb = ttk.Notebook(ventana, width=150, height=80)
>>> nb.winfo_reqwidth()         # el hijo pedía 274
204
```

Fíjate en que 150 es **menos** de lo que pedía la página y aun así se ha impuesto, lo que quiere decir que el contenido se recorta. Así que `width` y `height` no son un mínimo, son la medida, y hay que usarlos sabiendo que la página grande se va a quedar sin ver parte de sí misma. Lo razonable es combinarlos con un `minsize` en la ventana.

La segunda salida, casi siempre mejor, es **repartir el contenido de otra forma**: si una pestaña desequilibra las demás, suele ser señal de que ese contenido no es una pestaña sino la vista principal del programa, y las otras tres son ajustes que van en un diálogo aparte.

## Enterarse del cambio

El evento es `<<NotebookTabChanged>>`, y aquí hay un hallazgo que conviene tener en cuenta desde la primera línea:

```consola
>>> pestanas.bind("<<NotebookTabChanged>>", registrar)
>>> pestanas.add(primera, text="Uno")
>>> disparos
[0]
```

**Se dispara al añadir la primera pestaña.** Es coherente, porque al añadirla pasa a ser la activa y eso es un cambio, pero es contraintuitivo, y el problema es el momento: ocurre mientras estás construyendo la interfaz, cuando la mitad de tus widgets todavía no existen.

> [!error] El programa falla al arrancar por el evento de la pestaña
>
> El síntoma es un `NameError` o un `AttributeError` en el arranque, en una línea que parece correcta, y desaparece si comentas el `bind`.
>
> Lo que pasa es esto: atas el evento, después añades la primera pestaña, el evento salta y tu manejador intenta escribir en una etiqueta de estado que se crea diez líneas más abajo.
>
> Hay dos formas de arreglarlo y conviene usar las dos:
>
> 1. **Ata el evento al final**, cuando ya está todo creado y las pestañas añadidas. Es lo que hacen los ejemplos de todo el bloque, con los `bind` y los `trace_add` agrupados justo antes del `mainloop`.
> 2. **Escribe el manejador a la defensiva**, porque el orden no siempre se controla. Salir pronto si no hay pestañas evita el caso raro:
>
> ```python
> def cambio_de_pestana(evento=None):
>         if not pestanas.tabs():
>                 return
>     ...
> ```
>
> Y dos precisiones más que salieron al medirlo. El evento **no** se repite si seleccionas la pestaña que ya estaba activa, así que no hace falta comprobarlo. Y sí salta cuando esconder la pestaña activa obliga al `Notebook` a pasarse a otra, lo que es justo lo que quieres para que el estado se actualice.

El uso más interesante de este evento es **cargar la página cuando se abre por primera vez**. Si una pestaña necesita leer un fichero o consultar algo, hacerlo al arrancar retrasa el arranque de todo el programa para algo que quizá nadie mire:

```python
def cambio_de_pestana(evento=None):
        if not pestanas.tabs():
                return
    clave = pestanas.tab("current")["text"]
    if clave not in cargadas:
                cargadas.add(clave)
        construir_pagina(clave)
```

Es la versión sencilla de una idea que reaparece en el bloque E: no hagas trabajo hasta que se vea.

## El teclado

El `Notebook` trae bastante de serie, y verlo evita reinventarlo:

```consola
>>> ventana.bind_class("TNotebook")
('<TouchpadScroll>', '<Shift-MouseWheel>', '<MouseWheel>', '<Enter>',
 '<Destroy>', '<Control-Shift-Key-Tab>', '<Control-Key-Tab>',
 '<Key-Left>', '<Key-Right>', '<Button-1>')
```

Las flechas izquierda y derecha cambian de pestaña cuando la fila tiene el foco, y `Control-Tab` pasa a la siguiente. Y hay algo que no todo el mundo sabe: **la rueda del ratón sobre la fila de pestañas también cambia de pestaña**. Es útil si lo sabes y sorprende si no, y no se puede desactivar con una opción; haría falta un `bind` que corte el evento.

Lo que sí hay que pedir explícitamente es la travesía completa:

```python
pestanas.enable_traversal()
```

Con eso, `Control-Tab` y `Control-Mayúsculas-Tab` funcionan desde cualquier sitio del programa y no solo con el foco en las pestañas, y se activan los atajos de la letra subrayada:

```python
pestanas.add(general, text="General", underline=0)
```

Ese `underline=0` subraya la G y hace que `Alt+G` salte a esa pestaña. Es una línea por pestaña y mejora mucho el programa para quien no usa el ratón. El único cuidado es no repetir letra entre pestañas, y que en macOS los atajos con `Alt` no son la costumbre del sistema, así que ahí cuenta menos.

## Un diálogo de preferencias

```python title="pestanas.py"
"""Notebook: páginas hijas del Notebook, carga diferida y pestaña condicional."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_general(pagina):
        """Lo de siempre dentro de la página: es un Frame como cualquier otro."""
    ttk.Label(pagina, text="Nombre del usuario:").grid(
        row=0, column=0, sticky="w", pady=AIRE)
    ttk.Entry(pagina, textvariable=usuario, width=26).grid(
        row=1, column=0, sticky="ew")

    ttk.Checkbutton(pagina, text="Abrir el último fichero al arrancar",
                    variable=abrir_ultimo).grid(row=2, column=0, sticky="w",
                                                pady=(MARGEN, 0))
    # La casilla que decide si existe la tercera pestaña.
    ttk.Checkbutton(pagina, text="Mostrar las opciones de red",
                    variable=mostrar_red,
                    command=actualizar_red).grid(row=3, column=0, sticky="w")
    pagina.columnconfigure(0, weight=1)


def crear_aspecto(pagina):
        """Se construye la primera vez que se abre la pestaña, no al arrancar."""
    ttk.Label(pagina, text="Tamaño de la letra:").grid(
        row=0, column=0, sticky="w", pady=AIRE)
    ttk.Spinbox(pagina, from_=9, to=24, textvariable=tamano, width=6,
                justify="right", state="readonly").grid(row=1, column=0,
                                                        sticky="w")

    ttk.Label(pagina, text="Tema:").grid(row=2, column=0, sticky="w",
                                         pady=(MARGEN, AIRE))
    ttk.Combobox(pagina, textvariable=tema, state="readonly", width=18,
                 values=("Claro", "Oscuro", "Según el sistema")).grid(
        row=3, column=0, sticky="w")
    pagina.columnconfigure(0, weight=1)


def crear_red(pagina):
        ttk.Label(pagina, text="Servidor:").grid(row=0, column=0, sticky="w",
                                             pady=AIRE)
    ttk.Entry(pagina, textvariable=servidor, width=26).grid(
        row=1, column=0, sticky="ew")
    ttk.Label(pagina, text="Se esconde con hide(), así que al volver "
                           "conserva su rótulo.",
              foreground=GRIS, wraplength=280, justify="left").grid(
        row=2, column=0, sticky="w", pady=(MARGEN, 0))
    pagina.columnconfigure(0, weight=1)


def actualizar_red():
        """hide y add: la pestaña se recuerda con su texto, no hay que repetirlo."""
    if mostrar_red.get():
                pestanas.add(red)
    else:
                pestanas.hide(red)
    describir()


def cambio_de_pestana(evento=None):
        """A la defensiva: este evento salta ya en el primer add()."""
    if not pestanas.tabs():
                return
    rotulo = pestanas.tab("current")["text"]
    # Carga diferida: la página se construye la primera vez que se ve.
    if rotulo not in construidas:
                construidas.add(rotulo)
        if rotulo == "Aspecto":
                        crear_aspecto(aspecto)
        elif rotulo == "Red":
                        crear_red(red)
    describir()


def describir():
    # select() devuelve un nombre, no un widget: hay que traducirlo.
        nombre = pestanas.select()
    pagina = pestanas.nametowidget(nombre) if nombre else None
    estado.set(f"Activa: {pestanas.tab('current')['text']} "
               f"(índice {pestanas.index('current')} de {pestanas.index('end')}). "
               f"Construidas: {', '.join(sorted(construidas))}. "
               f"El widget es {pagina.winfo_class() if pagina else '-'}.")


def guardar():
        resumen.set(f"{usuario.get() or 'sin nombre'} · letra {tamano.get()} · "
                f"tema {tema.get()} · "
                f"servidor {servidor.get() if mostrar_red.get() else '(sin red)'}")


ventana = tk.Tk()
ventana.title("Preferencias")
ventana.minsize(460, 360)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
usuario = tk.StringVar(value="erwin")
abrir_ultimo = tk.BooleanVar(value=True)
mostrar_red = tk.BooleanVar(value=False)
tamano = tk.IntVar(value=12)
tema = tk.StringVar(value="Según el sistema")
servidor = tk.StringVar(value="192.168.1.10")
estado = tk.StringVar()
resumen = tk.StringVar(value="Sin guardar")
construidas = {"General"}

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

pestanas = ttk.Notebook(cuerpo)
pestanas.pack(fill="both", expand=True)

# Cada página, hija del Notebook. Si el padre fuera "cuerpo", la pestaña
# saldría en blanco y no habría ningún error.
general = ttk.Frame(pestanas, padding=MARGEN)
aspecto = ttk.Frame(pestanas, padding=MARGEN)
red = ttk.Frame(pestanas, padding=MARGEN)

# underline para el atajo Alt+letra, sin repetir letra entre pestañas.
pestanas.add(general, text="General", underline=0)
pestanas.add(aspecto, text="Aspecto", underline=0)
pestanas.add(red, text="Red", underline=0)

crear_general(general)
# Aspecto y Red se construyen al abrirse por primera vez.
pestanas.hide(red)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x", pady=(MARGEN, 0))
ttk.Button(botones, text="Guardar", command=guardar).pack(side="left")

ttk.Label(cuerpo, textvariable=resumen, wraplength=400, justify="left").pack(
    anchor="w", pady=(MARGEN, 0))
ttk.Label(cuerpo, textvariable=estado, foreground=GRIS, wraplength=400,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

# El bind, al final: si estuviera arriba, el primer add() lo dispararía
# cuando la etiqueta de estado todavía no existe.
pestanas.bind("<<NotebookTabChanged>>", cambio_de_pestana)
pestanas.enable_traversal()
describir()

centrar(ventana)
ventana.mainloop()
```

Pulsa la pestaña «Aspecto» y mira la línea de estado: aparece en la lista de construidas justo al abrirla y no antes. Marca «Mostrar las opciones de red» y aparece la tercera pestaña; desmárcala y desaparece, y al volver conserva su rótulo sin que nadie lo repita, que es la diferencia entre `hide` y `forget`.

Y el `bind` está deliberadamente en el penúltimo bloque del fichero. Muévelo arriba, justo después de crear el `Notebook`, y el programa dejará de arrancar: el primer `add` disparará `cambio_de_pestana`, que llama a `describir`, que escribe en `estado`, que todavía no existe.

> [!consejo] Cuántas pestañas y de qué
>
> El `Notebook` se estropea por exceso. Tres criterios que funcionan:
>
> - **Entre dos y cinco.** Con una no tiene sentido, y con ocho la fila se llena, los rótulos se recortan y encontrar algo cuesta más que en una lista. Por encima de cinco secciones, lo que quieres es una lista de categorías a la izquierda y el contenido a la derecha, que es el patrón de los diálogos de preferencias grandes y se monta con un `PanedWindow`, la lección siguiente.
> - **Secciones independientes, no pasos.** Las pestañas dicen «esto también está aquí», no «primero esto y luego lo otro». Para una secuencia con orden, lo correcto es un asistente con botones de siguiente y anterior, y hay lección en el bloque D.
> - **Rótulos de una palabra.** «General», «Aspecto», «Red». En cuanto un rótulo necesita tres palabras, esa pestaña está agrupando cosas que no van juntas.
>
> Y una regla que ahorra disgustos: **nada importante debe estar solo en una pestaña que no sea la primera.** Si el botón de guardar vive dentro de la tercera pestaña, habrá quien no lo encuentre. Los botones que valen para todo el diálogo van fuera del `Notebook`, debajo, como en el ejemplo.

> [!resumen] En resumen
>
> El `Notebook` reparte una interfaz en pestañas y es la primera respuesta a «no caben los controles», por delante de las barras de desplazamiento. Cada página es un `Frame` que **tiene que ser hijo del `Notebook`**: un widget hermano se acepta sin error y la pestaña queda en blanco, mientras un nieto sí da `TclError`, así que una pestaña vacía sin mensaje es casi siempre un padre equivocado. Las pestañas se configuran con `add` y `tab`, con `text`, `underline` para el atajo, `image`, `state`, `sticky` y `padding`. Lo que más despista es que `select()` devuelve **el nombre interno del widget y no el widget**, de modo que compararlo con un `Frame` nunca es verdad; se resuelve con `nametowidget`, con `index` o leyendo `tab("current")["text"]`. Para esconder hay tres caminos que no son iguales: `hide` la quita de la vista pero la recuerda con su rótulo y un `add` la devuelve, `forget` la desvincula y obliga a repetir las opciones al volver a añadirla aunque el `Frame` siga existiendo, y `state="hidden"` hace lo de `hide` en forma de configuración; `state="disabled"` la deja visible e inaccesible, y entonces `select` sobre ella no hace nada y tampoco avisa. El tamaño lo decide la página más grande, no la activa, lo que evita que la ventana salte al cambiar de pestaña pero hace que una página enorme infle las demás; `width` y `height` se imponen incluso por debajo de lo que pide el contenido, así que lo recortan. El evento `<<NotebookTabChanged>>` **se dispara ya al añadir la primera pestaña**, cuando la interfaz está a medio construir, y esa es la causa de un fallo de arranque que parece inexplicable: la solución es atar el evento al final y escribir el manejador a la defensiva. Ese mismo evento es lo que permite construir cada página la primera vez que se abre en vez de al arrancar. Y de teclado, el widget ya trae las flechas, `Control-Tab` y la rueda del ratón sobre la fila; lo que hay que pedir es `enable_traversal()` para que los atajos funcionen desde todo el programa y para activar el `underline`.

> [!ejercicio] Practica
>
> Trabaja en un fichero `28-pestanas.py` salvo donde se indique otra cosa:
>
> 1. Monta tres pestañas con un `Frame` y una etiqueta en cada una. Después crea una cuarta página con la ventana como padre en vez del `Notebook`, añádela y explica lo que ves.
> 2. Muestra en una etiqueta lo que devuelve `select()`, `index("current")` y `tab("current")["text"]`. Intenta comparar `select()` con el `Frame` de la página y anota el resultado.
> 3. Escribe en `28-esconder.py` tres botones que hagan `hide`, `forget` y `state="hidden"` sobre la misma pestaña, y otro que intente devolverla con `add`. Compara qué conserva cada uno.
> 4. Desactiva una pestaña con `state="disabled"` e intenta seleccionarla desde un botón. Comprueba que no hay error y que no cambia nada.
> 5. Pon en una pestaña una etiqueta con un texto muy largo y mira qué les pasa a las demás. Arréglalo con `width` y `height` y explica qué pierdes.
> 6. Ata `<<NotebookTabChanged>>` **antes** de añadir las pestañas, con un manejador que escriba en una variable creada más abajo. Lee el error y arréglalo de las dos formas de la lección.
> 7. Haz que una pestaña muestre en su etiqueta la hora de cuando se construyó, y comprueba con el evento que solo se construye la primera vez que la abres.
> 8. Añade `underline` a las tres pestañas y llama a `enable_traversal()`. Prueba `Control-Tab`, las flechas, la rueda sobre los rótulos y `Alt` con cada letra.
