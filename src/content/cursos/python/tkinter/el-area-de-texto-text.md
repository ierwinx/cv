---
titulo: "El área de texto: Text"
resumen: "El widget más potente de Tkinter y el que tiene sus propias reglas: índices de línea y columna, el salto de línea que nunca pediste, etiquetas que dan formato, y deshacer sin que se lleve el contenido inicial."
minutos: 24
orden: 16
---

El `Text` es el widget más potente de Tkinter, y no por poco. Los demás hacen una cosa; este es un editor completo: admite varias líneas, deshacer y rehacer, buscar, marcar tramos con colores y tipos de letra distintos, poner imágenes y hasta otros widgets incrustados entre las letras. El editor de texto que se escribe como proyecto del bloque E se apoya en él casi entero.

El precio de esa potencia es que **el `Text` no se maneja como el resto del módulo**. No tiene versión temática, no se lee con `get()` a secas y no usa posiciones de carácter, sino un sistema propio de índices que hay que aprender. Nada de eso es difícil, pero conviene saber desde el principio que aquí las reglas cambian.

> [!objetivo] Qué vas a aprender
>
> Crear un área de texto y entender su sistema de índices de línea y columna; leer y escribir su contenido evitando el salto de línea de más; dar formato con etiquetas y buscar dentro del texto; activar el deshacer sin que el primer deshacer se lleve el contenido cargado; y montar un área de solo lectura para un registro de actividad.

## Un widget sin versión temática

Lo primero, porque rompe el criterio del módulo:

```consola
>>> hasattr(ttk, "Text")
False
```

No hay `ttk.Text`. El área de texto solo existe en la familia clásica, así que aquí se usa `tk.Text` sin excusas ni comentario justificativo. Lo mismo pasará con `Listbox` y `Canvas` en sus lecciones. La consecuencia práctica es que su aspecto **no** viene del tema: los colores, el borde y la fuente se le ponen encima, y hay que tener cuidado de que no cante al lado de los widgets temáticos que lo rodean.

Se crea con su tamaño en líneas y caracteres:

```python
notas = tk.Text(ventana, height=6, wrap="word")
notas.pack(fill="both", expand=True)
```

Sus valores por defecto son grandes y sorprenden la primera vez:

```consola
>>> tk.Text(ventana).cget("height"), tk.Text(ventana).cget("width")
(24, 80)
```

Veinticuatro líneas por ochenta caracteres, que son las medidas de un terminal clásico. Si no pones `height`, el widget pide un tamaño enorme y se lleva por delante el diseño de la ventana. Ponle siempre `height`.

> [!aviso] `wrap` viene mal puesto por defecto
>
> El valor de fábrica parte las líneas por el carácter, no por la palabra:
>
> ```consola
> >>> tk.Text(ventana).cget("wrap")
> 'char'
> ```
>
> Eso significa que una línea larga se corta a mitad de palabra, como en los terminales antiguos. Los tres valores son:
>
> ```consola
> >>> tk.Text(ventana, wrap="z")
> _tkinter.TclError: bad wrap "z": must be char, none, or word
> ```
>
> `word` es lo que quieres casi siempre, y `none` sirve para lo que no debe partirse nunca, como código o una tabla, a costa de necesitar una barra de desplazamiento horizontal. Pon `wrap="word"` por costumbre, igual que pones `height`.

## Los índices

Aquí está la diferencia de fondo. Una posición en un `Text` no es un número, es una cadena con la forma `"línea.columna"`, y va con una trampa incorporada: **las líneas empiezan en uno y las columnas en cero.**

```python
notas.insert("1.0", "def saludar(nombre):\n    return f\"Hola {nombre}\"\n")
```

`"1.0"` es el principio del contenido, y es el índice que más vas a escribir. Que no sea `"0.0"` es la causa de la mitad de los despistes al empezar.

Además de los índices literales, hay palabras y aritmética. Estas son las que se usan de verdad, medidas sobre el texto de arriba:

```consola
>>> for idx in ("1.0", "1.end", "2.4", "end", "end-1c", "insert", "1.0 lineend"):
...     print(f"{idx!r:15} -> {notas.index(idx)}")
...
'1.0'           -> 1.0
'1.end'         -> 1.20
'2.4'           -> 2.4
'end'           -> 4.0
'end-1c'        -> 3.0
'insert'        -> 3.0
'1.0 lineend'   -> 1.20
```

`index()` traduce cualquier índice a su forma canónica, y es la herramienta para entender lo que está pasando cuando algo no cuadra. Lo que hay ahí:

| Índice | Qué señala |
| --- | --- |
| `"1.0"` | El principio de todo |
| `"2.4"` | Línea dos, quinto carácter |
| `"1.end"` | El final de la línea uno |
| `"end"` | El final del contenido, y lee bien el apartado siguiente |
| `"insert"` | Donde está el cursor |
| `"sel.first"`, `"sel.last"` | Los extremos de la selección |
| `"end-1c"` | Un carácter antes del final |
| `"insert linestart"` | El principio de la línea del cursor |
| `"2.0 wordend"` | El final de la palabra que empieza en `2.0` |

La aritmética se escribe pegada (`end-1c`, `insert+5c`, `end-1l`) y las unidades son `c` para caracteres, `l` para líneas, `w` para palabras. Y para contar líneas, el idioma es este:

```consola
>>> int(notas.index("end-1c").split(".")[0])
3
```

## El salto de línea que no pediste

Este es **el** detalle del `Text`, el que hay que saber antes de escribir la primera línea de código que lo use. Un `Text` siempre termina en un salto de línea, lo hayas puesto tú o no. Así que leerlo de la forma evidente devuelve un `\n` de más:

```consola
>>> notas.get("1.0", "end")
'def saludar(nombre):\n    return f"Hola {nombre}"\n\n'
>>> notas.get("1.0", "end-1c")
'def saludar(nombre):\n    return f"Hola {nombre}"\n'
```

Mira las dos comillas del final de la primera: hay dos `\n` y solo uno se insertó. Por eso **la forma correcta de leer un `Text` completo es `get("1.0", "end-1c")`**, y conviene aprenderla de memoria, porque si no, cada vez que guardes el contenido en un fichero le añadirás una línea en blanco, y cada vez que compares lo guardado con lo que hay en pantalla te dirá que son distintos.

Lo mismo explica un valor que desconcierta en un widget recién creado y vacío:

```consola
>>> vacio = tk.Text(ventana)
>>> vacio.index("end")
'2.0'
>>> vacio.get("1.0", "end-1c")
''
```

Un `Text` vacío ya tiene dos líneas para Tk, porque tiene ese salto. De ahí que la manera de preguntar si está vacío sea mirar el contenido y no el índice:

```python
if not notas.get("1.0", "end-1c").strip():
        ...
```

Lo demás funciona como esperas. Se escribe con `insert`, se borra con `delete` y se vacía con el mismo tramo de siempre:

```python
notas.insert("end", "una línea más\n")
notas.delete("2.0", "3.0")        # borra la línea dos entera
notas.delete("1.0", "end")        # lo vacía todo
```

## Etiquetas: el formato

Una **etiqueta** de `Text`, que no tiene nada que ver con el widget `Label`, es un nombre que se le pone a uno o varios tramos de texto. Se configura una vez y se aplica donde haga falta:

```python
notas.tag_configure("clave", foreground="#AF52DE")
notas.tag_configure("error", background="#FFE5E5", foreground="#B02A37")
notas.tag_add("clave", "1.0", "1.3")
```

Y se puede aplicar en el mismo `insert`, que es lo cómodo cuando vas escribiendo:

```consola
>>> notas.insert("end", "import", "clave")
>>> [str(i) for i in notas.tag_ranges("clave")]
['3.0', '3.6']
```

`tag_ranges` devuelve las parejas de extremos de todos los tramos marcados. Lo que una etiqueta puede cambiar es casi todo el aspecto del tramo: `foreground`, `background`, `font`, `underline`, `overstrike`, `justify`, `spacing1` y `spacing3` para el aire de alrededor, y `lmargin1`, `lmargin2` y `rmargin` para los márgenes. Con eso se hace el resaltado de sintaxis de un editor, y con `tag_bind` se hace que un tramo responda al ratón, que es como se pintan los enlaces.

> [!nota] La selección es una etiqueta llamada `sel`
>
> No es una cosa aparte: lo que está seleccionado es lo que lleva la etiqueta `sel`, y se puede leer y manipular como cualquier otra.
>
> ```consola
> >>> notas.tag_add("sel", "1.4", "1.11")
> >>> notas.get("sel.first", "sel.last")
> 'saludar'
> ```
>
> Con un aviso importante, y es que si no hay nada seleccionado esos índices no existen y `get` no devuelve vacío, sino que falla:
>
> ```consola
> >>> notas.tag_remove("sel", "1.0", "end")
> >>> notas.get("sel.first", "sel.last")
> _tkinter.TclError: text doesn't contain any characters tagged with "sel"
> ```
>
> Así que cualquier función de copiar o de poner en negrita lo seleccionado tiene que comprobar antes que haya selección, con un `try` o preguntando por `notas.tag_ranges("sel")`.

## Buscar

`search` devuelve el índice de la primera coincidencia, o la cadena vacía si no hay ninguna:

```consola
>>> notas.search("return", "1.0", "end")
'2.4'
>>> notas.search("nada", "1.0", "end")
''
```

Acepta ir hacia atrás y buscar con expresiones regulares, aunque las de Tcl, no las de Python:

```consola
>>> notas.search(r"f\"[^\"]*\"", "1.0", "end", regexp=True)
'2.11'
>>> notas.search("a", "end", "1.0", backwards=True)
'2.16'
```

Un buscar todas las coincidencias se monta encadenando llamadas desde el final de la anterior, y con `count` se recupera la longitud de lo encontrado para poder marcarlo:

```python
def marcar_todas(texto, patron, etiqueta):
        """Marca con una etiqueta todas las apariciones de un patrón."""
    texto.tag_remove(etiqueta, "1.0", "end")
    if not patron:
                return 0
    largo = tk.IntVar()
    posicion, encontradas = "1.0", 0
    while True:
                posicion = texto.search(patron, posicion, "end", count=largo, nocase=True)
        if not posicion or largo.get() == 0:
                        return encontradas
        fin = f"{posicion}+{largo.get()}c"
        texto.tag_add(etiqueta, posicion, fin)
        posicion, encontradas = fin, encontradas + 1
```

Fíjate en que `count` no devuelve un número: se le pasa un `IntVar` que Tk rellena. Es una costumbre de Tcl que aparece en varios sitios del widget.

## Deshacer

El `Text` trae deshacer y rehacer, pero apagados:

```python
editor = tk.Text(ventana, height=10, wrap="word", undo=True, maxundo=-1)
```

Con eso funcionan `edit_undo()` y `edit_redo()`, y también los atajos del sistema. `maxundo=-1` es sin límite, y `autoseparators`, que viene a `1`, es lo que agrupa las pulsaciones en pasos razonables en vez de deshacer letra a letra.

Y aquí hay una trampa preciosa:

```consola
>>> editor = tk.Text(ventana, undo=True)
>>> editor.insert("1.0", "contenido cargado del fichero")
>>> editor.edit_undo()
>>> editor.get("1.0", "end-1c")
''
```

**El primer deshacer se ha llevado el fichero entero.** Es lógico cuando lo piensas: tu `insert` es una modificación como cualquier otra y ha entrado en la pila de deshacer. Pero desde fuera es un editor que borra el documento al pulsar <kbd>Cmd</kbd> + <kbd>Z</kbd> recién abierto.

La solución es vaciar el historial después de cargar:

```consola
>>> editor = tk.Text(ventana, undo=True)
>>> editor.insert("1.0", "contenido cargado del fichero")
>>> editor.edit_reset()
>>> editor.edit_undo()
_tkinter.TclError: nothing to undo
>>> editor.get("1.0", "end-1c")
'contenido cargado del fichero'
```

`edit_reset()` después de cada carga, y `edit_undo()` dentro de un `try`, porque cuando no hay nada que deshacer lanza esa excepción en vez de no hacer nada.

El compañero de todo esto es `edit_modified()`, la bandera de "hay cambios sin guardar", que devuelve un entero y no un booleano:

```consola
>>> editor.edit_modified()
0
>>> editor.insert("end", "algo")
>>> editor.edit_modified()
1
>>> editor.edit_modified(False)
>>> editor.edit_modified()
0
```

Se pone a cero al guardar y se consulta al cerrar, que es como se decide si hay que preguntar "¿quieres guardar los cambios?". El diálogo en sí es del bloque D.

## Un área de solo lectura

Un registro de actividad, una consola de salida o un panel de ayuda son áreas de texto que el programa escribe y nadie más. Se consigue con `state="disabled"`, y tiene el mismo comportamiento que viste en el `Entry`: **el estado también te bloquea a ti**, en silencio.

```consola
>>> registro = tk.Text(ventana, height=4, state="disabled")
>>> registro.insert("end", "no va a entrar\n")
>>> registro.get("1.0", "end-1c")
''
```

Ni error ni contenido. El patrón, que vas a escribir muchas veces, es abrir, escribir y cerrar:

```python
def anotar(registro, mensaje):
        """Añade una línea a un área de solo lectura y baja la vista hasta ella."""
    registro.configure(state="normal")
    registro.insert("end", f"{mensaje}\n")
    registro.configure(state="disabled")
    registro.see("end")
```

`see()` es la pieza que se olvida: desplaza la vista para que ese índice quede visible. Sin él, el registro sigue creciendo pero se queda mirando la primera línea.

## Las demás opciones

`tk.Text` tiene cuarenta y tres opciones, más que ningún otro widget del módulo. Las que no se han nombrado y de verdad se usan:

| Opción | Qué hace |
| --- | --- |
| `spacing1`, `spacing2`, `spacing3` | Aire antes del párrafo, entre líneas partidas y después del párrafo |
| `tabs` | Las posiciones de tabulación |
| `insertbackground` | Color del cursor de escritura |
| `insertwidth` | Grosor del cursor |
| `selectbackground` | Color del fondo de lo seleccionado |
| `padx`, `pady` | Margen interior, que por defecto es de un píxel y queda apretado |
| `yscrollcommand` | Conexión con la barra de desplazamiento |
| `exportselection` | Si la selección se lleva el portapapeles del sistema |

De esas, `spacing3` merece una mención porque es la forma barata de que un texto largo se lea bien: un par de píxeles de aire después de cada párrafo cambian bastante la sensación.

Y la conexión con la barra de desplazamiento son estas dos líneas, que aparecen en pareja siempre y que tienen lección propia:

```python
barra = ttk.Scrollbar(contenedor, orient="vertical", command=notas.yview)
notas.configure(yscrollcommand=barra.set)
```

Cada uno apunta al otro: la barra mueve el texto y el texto mueve la barra. Es exactamente lo que hace el área de notas del panel de control de referencia.

## Un editor pequeño pero honesto

```python title="areatexto.py"
"""Text: índices, etiquetas, búsqueda, deshacer y un registro de solo lectura."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

INICIAL = """El widget Text admite varias líneas y da formato por tramos.

Escribe algo y fíjate en el contador de abajo: cuenta líneas, palabras y
caracteres en cada pulsación. Busca una palabra arriba y se marcará en
amarillo en todas sus apariciones.

Prueba también a deshacer: el historial se vació al cargar este texto, así
que el primer deshacer no se lleva el documento."""


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def anotar(mensaje):
        """Añade una línea al registro, que está en solo lectura."""
    registro.configure(state="normal")
    registro.insert("end", f"{mensaje}\n")
    registro.configure(state="disabled")
    registro.see("end")


def contar(*_):
        """Se llama en cada modificación del editor."""
    contenido = editor.get("1.0", "end-1c")
    lineas = int(editor.index("end-1c").split(".")[0])
    resumen.set(f"{lineas} líneas, {len(contenido.split())} palabras, "
                f"{len(contenido)} caracteres")
    # La bandera hay que rearmarla a mano o el evento no vuelve a dispararse.
    editor.edit_modified(False)


def marcar_todas(patron):
        """Marca todas las apariciones del patrón y devuelve cuántas hay."""
    editor.tag_remove("hallado", "1.0", "end")
    if not patron:
                return 0
    largo = tk.IntVar()
    posicion, encontradas = "1.0", 0
    while True:
                posicion = editor.search(patron, posicion, "end", count=largo, nocase=True)
        if not posicion or largo.get() == 0:
                        return encontradas
        fin = f"{posicion}+{largo.get()}c"
        editor.tag_add("hallado", posicion, fin)
        posicion, encontradas = fin, encontradas + 1


def buscar(*_):
        encontradas = marcar_todas(patron.get().strip())
    if patron.get().strip():
                anotar(f"«{patron.get().strip()}»: {encontradas} apariciones")


def negrita():
        """Pone en negrita lo seleccionado, si hay algo seleccionado."""
    if not editor.tag_ranges("sel"):
                anotar("No hay nada seleccionado")
        return
    editor.tag_add("negrita", "sel.first", "sel.last")
    anotar(f"Negrita de {editor.index('sel.first')} a {editor.index('sel.last')}")


def deshacer():
        try:
                editor.edit_undo()
    except tk.TclError:
                anotar("Nada que deshacer")


def rehacer():
        try:
                editor.edit_redo()
    except tk.TclError:
                anotar("Nada que rehacer")


def crear_barra(ventana):
        """Buscador y acciones de formato."""
    barra = ttk.Frame(ventana, padding=(MARGEN, AIRE))
    barra.pack(side="top", fill="x")

    ttk.Label(barra, text="Buscar:").pack(side="left", padx=(0, AIRE))
    campo = ttk.Entry(barra, textvariable=patron, width=18)
    campo.pack(side="left")
    ttk.Button(barra, text="Marcar", width=8, command=buscar).pack(
        side="left", padx=AIRE)

    ttk.Separator(barra, orient="vertical").pack(side="left", fill="y", padx=MARGEN)
    ttk.Button(barra, text="Negrita", width=8, command=negrita).pack(side="left")
    ttk.Button(barra, text="Deshacer", width=9, command=deshacer).pack(
        side="left", padx=AIRE)
    ttk.Button(barra, text="Rehacer", width=9, command=rehacer).pack(side="left")

    ttk.Separator(ventana, orient="horizontal").pack(fill="x")
    return barra


def crear_editor(contenedor):
        """El área principal, con su barra de desplazamiento."""
    global editor
    caja = ttk.LabelFrame(contenedor, text="Documento", padding=AIRE)
    caja.pack(fill="both", expand=True)

    editor = tk.Text(caja, height=12, wrap="word", undo=True, maxundo=-1,
                     padx=6, pady=6, spacing3=4, relief="flat",
                     highlightthickness=1, highlightbackground="#D1D1D6")
    barra = ttk.Scrollbar(caja, orient="vertical", command=editor.yview)
    editor.configure(yscrollcommand=barra.set)

    editor.pack(side="left", fill="both", expand=True)
    barra.pack(side="right", fill="y")

    editor.tag_configure("hallado", background="#FFE58F")
    editor.tag_configure("negrita", font=("Helvetica", 13, "bold"))
    return caja


def crear_registro(contenedor):
        """Área de solo lectura para el registro de lo que va pasando."""
    global registro
    caja = ttk.LabelFrame(contenedor, text="Registro", padding=AIRE)
    caja.pack(fill="x", pady=(MARGEN, 0))

    registro = tk.Text(caja, height=4, wrap="word", state="disabled",
                       padx=6, pady=6, relief="flat",
                       highlightthickness=1, highlightbackground="#D1D1D6")
    registro.pack(fill="x")
    return caja


ventana = tk.Tk()
ventana.title("Área de texto")
ventana.minsize(620, 520)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
patron = tk.StringVar()
resumen = tk.StringVar()
editor = None
registro = None

crear_barra(ventana)

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_editor(cuerpo)
crear_registro(cuerpo)
ttk.Label(cuerpo, textvariable=resumen, anchor="w").pack(
    fill="x", pady=(AIRE, 0))

editor.insert("1.0", INICIAL)
# Sin este edit_reset, el primer deshacer se llevaría el texto cargado.
editor.edit_reset()
editor.edit_modified(False)
editor.bind("<<Modified>>", contar)
contar()
anotar("Documento cargado")

centrar(ventana)
ventana.mainloop()
```

Dos detalles de ese programa que no son evidentes. El contador se engancha al evento `<<Modified>>`, que es del propio widget y avisa de cualquier cambio venga de donde venga, pero **solo se dispara una vez**: hasta que no pones la bandera otra vez a `False` con `edit_modified(False)` no vuelve a avisar, y ese rearme dentro de `contar` es la línea que hace que funcione a partir de la segunda pulsación. Y el `edit_reset()` después de cargar el texto inicial es lo que evita la trampa del deshacer; quítalo, ejecuta y deshaz para verlo.

> [!consejo] Cuándo `Text` y cuándo otra cosa
>
> El `Text` es tentador porque lo hace todo, y se usa de más. Tres casos en los que no es lo que quieres:
>
> - Para **una línea** de texto, un `Entry`. Un `Text` de `height=1` parece lo mismo y no lo es: acepta saltos de línea pegados, no responde a <kbd>Intro</kbd> como un campo y no entra en el recorrido del tabulador igual.
> - Para **elegir de una lista**, un `Listbox` o un `Combobox`. Escribir opciones en un `Text` y leer la línea del cursor es reinventar mal esos widgets.
> - Para **una tabla**, un `Treeview`. Alinear columnas con tabulaciones en un `Text` funciona hasta que un dato es más largo de lo previsto.

> [!resumen] En resumen
>
> El `Text` es el widget más potente de Tkinter y el que menos se parece a los demás: no tiene versión temática, así que se usa `tk.Text` sin excusas y su aspecto no lo pone el tema. Sus valores por defecto son de terminal antiguo, veinticuatro por ochenta y partiendo las líneas por el carácter, de modo que `height` y `wrap="word"` se ponen por costumbre. Las posiciones no son números sino cadenas con la forma línea punto columna, donde las líneas empiezan en uno y las columnas en cero, y hay palabras y aritmética (`end`, `insert`, `sel.first`, `end-1c`, `insert linestart`) que `index()` traduce cuando algo no cuadra. Lo que nunca hay que olvidar es que un `Text` siempre acaba en un salto de línea que tú no pusiste, y por eso leerlo completo es `get("1.0", "end-1c")` y no `get("1.0", "end")`, que devuelve un `\n` de más, y también por eso un widget vacío dice que su final está en la línea dos. El formato se da con etiquetas, que son nombres aplicados a tramos y admiten color, fuente, subrayado y márgenes, y la selección no es más que una etiqueta llamada `sel` cuyos índices fallan si no hay nada seleccionado. `search` devuelve el índice de la primera coincidencia o la cadena vacía, y para marcarlas todas se encadena desde el final de la anterior pidiendo la longitud con un `IntVar`. El deshacer se activa con `undo=True` y hay que llamar a `edit_reset()` después de cargar contenido, porque si no el primer deshacer borra el documento, además de envolver `edit_undo()` en un `try` porque lanza excepción cuando no hay nada que deshacer. Y un área de solo lectura se hace con `state="disabled"`, recordando que ese estado también bloquea a tu código, así que para escribir en ella hay que abrirla, escribir, cerrarla y llamar a `see("end")`.

> [!ejercicio] Practica
>
> Trabaja en un fichero `16-texto.py` salvo donde se indique otra cosa:
>
> 1. Crea un `Text` y escribe tres líneas. Imprime `index("end")`, `index("end-1c")`, `get("1.0", "end")` y `get("1.0", "end-1c")`, y explica con tus palabras las diferencias entre los cuatro.
> 2. Haz un contador de líneas, palabras y caracteres que se actualice con el evento `<<Modified>>`. Pruébalo primero sin rearmar la bandera con `edit_modified(False)` y anota a partir de cuándo deja de contar.
> 3. Escribe en `16-resaltar.py` un buscador que marque en amarillo todas las apariciones de una palabra, cuente cuántas son y ponga el cursor en la primera con `see`.
> 4. Monta un editor con `undo=True` que cargue el contenido de un fichero de texto cualquiera. Pulsa deshacer nada más abrir, comprueba que se borra todo, y arréglalo con `edit_reset()`.
> 5. Haz un área de registro en solo lectura con un botón que le añada una línea con la hora. Comprueba qué pasa si te olvidas del `see("end")` cuando ya hay más líneas de las que caben.
> 6. Define tres etiquetas de formato (título, código y aviso) con fuentes y colores distintos y aplícalas a tramos de un texto de ejemplo. Después usa `tag_ranges` para imprimir qué tramos lleva cada una.
