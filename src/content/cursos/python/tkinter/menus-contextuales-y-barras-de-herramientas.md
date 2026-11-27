---
titulo: "Menús contextuales y barras de herramientas"
resumen: "El evento que evita adivinar el botón derecho, el tk_popup que no vuelve hasta que lo cierras, el grab que deja la interfaz muerta si te descuidas, y la barra de herramientas que no es un widget."
minutos: 26
orden: 32
---

Última lección del bloque, y las dos cosas que trae tienen algo en común: **ninguna es un widget nuevo**. Un menú contextual es el mismo `tk.Menu` de la lección anterior, mostrado en otro momento y en otro sitio. Y una barra de herramientas es un `Frame` con botones dentro, de los del bloque B, con un estilo que ya conoces de la lección 14.

Así que esta lección no es una lista de opciones, sino de problemas: cómo se llama el botón derecho en cada sistema, por qué el código que va después de mostrar el menú no se ejecuta cuando esperas, y por qué un menú contextual mal hecho actúa sobre la fila equivocada.

> [!objetivo] Qué vas a aprender
>
> Abrir un menú contextual con el gesto correcto en cualquier sistema, sin escribir a mano ningún número de botón; entender por qué `tk_popup` es modal y qué hay que poner en un `finally` para no dejar la interfaz muerta; hacer que el menú actúe sobre lo que se ha pulsado y no sobre lo que estaba seleccionado antes; y montar una barra de herramientas con el estilo que la hace parecer una barra de herramientas.

## El botón derecho no se llama igual en todas partes

El primer impulso es atar `<Button-3>`, y en Windows y Linux funciona. En macOS ha sido `<Button-2>` durante años y en las versiones recientes de Tk es `<Button-3>`, así que cualquier número escrito a mano es una apuesta sobre la versión y el sistema de quien ejecute el programa.

No hay que apostar, porque Tk trae un evento virtual para esto:

```consola
>>> ventana.event_info("<<ContextMenu>>")
('<Button-3>',)
```

Eso es lo que devuelve en macOS con Tk 9. En otro sistema o en otra versión devolverá lo que allí corresponda, y ahí está la ventaja: **`<<ContextMenu>>` es el gesto de «abrir el menú contextual», sea cual sea la tecla o el botón.** Se ata como cualquier otro evento:

```python
tabla.bind("<<ContextMenu>>", abrir_contextual)
```

Y si quieres añadir un gesto más, se hace sobre el propio evento virtual en vez de con un `bind` aparte. En macOS, Control+clic es la costumbre de toda la vida y mucha gente la sigue usando:

```consola
>>> ventana.event_add("<<ContextMenu>>", "<Control-Button-1>")
>>> ventana.event_info("<<ContextMenu>>")
('<Button-3>', '<Control-Button-1>')
```

Con eso, los dos gestos entran por el mismo manejador y no hay nada duplicado. Es el mismo razonamiento del hallazgo de la lección 31 sobre los atajos de edición: cuando Tk ya tiene un nombre para algo, se usa el nombre y no la tecla.

## `tk_popup` es modal, y eso cambia cómo se escribe

Mostrar el menú son dos líneas, pero hay que entender la primera:

```python
contextual.tk_popup(evento.x_root, evento.y_root)
```

> [!aviso] Las coordenadas son de la pantalla, no del widget
>
> `evento.x` y `evento.y` son la posición del clic **dentro del widget**, y son las que se usan para averiguar sobre qué se ha pulsado. `evento.x_root` y `evento.y_root` son la posición **en la pantalla**, y son las que quiere `tk_popup`, porque el menú es una ventana del sistema y no un dibujo dentro de tu ventana.
>
> Confundirlas no da ningún error: el menú aparece en la esquina superior izquierda de la pantalla, lejos del ratón, y parece un fallo de Tk.
>
> ```consola
> >>> texto.winfo_rootx(), texto.winfo_rooty()
> (34, 96)
> ```
>
> Esa es la diferencia entre los dos sistemas de coordenadas para ese widget concreto. Si alguna vez necesitas convertir a mano, `x_root == winfo_rootx() + x`.

Y ahora lo importante:

> [!error] `tk_popup` no vuelve hasta que se cierra el menú
>
> Medido con un plazo de seis segundos y un menú que nadie puede cerrar:
>
> ```consola
> $ timeout 6 python3 medir_grab.py
> grab_current antes: None
> llamando a tk_popup... (si no vuelve, es que bloquea)
> --- código de salida: 124 (124 = agotado el plazo)
> ```
>
> La línea de después nunca se imprimió. **`tk_popup` es modal**: se queda dentro hasta que quien usa el programa elige una entrada o cierra el menú pulsando fuera. No es un fallo, es lo que tiene que hacer un menú, pero tiene dos consecuencias que sorprenden.
>
> La primera es que **el código que pongas después de `tk_popup` se ejecuta cuando el menú ya se ha cerrado**, no mientras está abierto. Cualquier cosa que quieras hacer antes de mostrarlo (activar y desactivar entradas, por ejemplo) va antes, o en el `postcommand` de la lección 31.
>
> La segunda es que `post` **no** es la alternativa que parece:
>
> ```consola
> $ timeout 6 python3 medir_post.py
> post(100,100)...
> --- código de salida: 124
> ```
>
> En macOS `post` también es modal, así que el `unpost()` de la línea siguiente no llega a ejecutarse nunca. La pareja `post`/`unpost` sirve en otros sistemas para mostrar un menú y seguir trabajando, pero no se puede contar con ella. **Para un menú contextual, `tk_popup` y nada más.**

Y de ahí sale la línea que hay que escribir siempre y que en los ejemplos de internet aparece sin explicación:

```python
try:
        contextual.tk_popup(evento.x_root, evento.y_root)
finally:
        contextual.grab_release()
```

> [!error] Sin el `finally`, un fallo deja la interfaz muerta
>
> `tk_popup` pone un *grab*, que es como Tk dice «todos los clics son míos hasta que yo termine». Medido sin mostrar ningún menú, solo con el grab:
>
> ```consola
> >>> menu.grab_set()
> >>> ventana.grab_current()
> <tkinter.Menu object .!menu>
> >>> menu.grab_status()
> 'local'
> >>> menu.grab_release()
> >>> ventana.grab_current()
> None
> ```
>
> Y esto es lo que pasa si algo revienta con el grab puesto:
>
> ```consola
> >>> menu.grab_set()
> >>> try:
> ...     raise ValueError("un fallo cualquiera en el manejador")
> ... except ValueError as e:
> ...     print("excepción atrapada:", e)
> excepción atrapada: un fallo cualquiera en el manejador
> >>> ventana.grab_current()
> <tkinter.Menu object .!menu>
> ```
>
> El grab sigue puesto. La ventana no responde a nada, no hay ningún menú visible que cerrar, y el programa parece colgado cuando en realidad está perfectamente vivo. Es de los fallos más difíciles de diagnosticar, porque el síntoma no se parece en nada a la causa.
>
> El `finally` lo arregla, y es gratis, porque `grab_release` se puede llamar aunque no haya ningún grab:
>
> ```consola
> >>> menu.grab_release()      # sin tener el grab
> >>> # no protesta: se puede llamar siempre
> ```

> [!nota] Lo que no se puede probar sin abrir una ventana
>
> Este curso comprueba cada ejemplo ejecutándolo sin que aparezca nada en pantalla, y aquí hay un límite honesto: **un menú contextual no se puede ejercitar así**, precisamente porque `tk_popup` no vuelve. La prueba llega hasta la línea de antes.
>
> La consecuencia práctica, y es un buen criterio de diseño en general: conviene que el manejador del menú contextual no tenga lógica propia. Que averigüe sobre qué se ha pulsado, llame a una función que sí se pueda probar, y muestre el menú. Todo lo que hagan las entradas debe vivir en funciones sueltas, que son las mismas que llaman los botones de la barra de herramientas.

## Sobre qué se ha pulsado

Este es el detalle que separa un menú contextual que funciona de uno que parece funcionar. Al pulsar con el botón derecho sobre una fila, lo que espera cualquiera es que el menú actúe **sobre esa fila**. Pero el clic derecho no cambia la selección por su cuenta:

```consola
>>> sorted(b for b in ventana.bind_class("Treeview") if "Button" in b)
['<Button-1>', '<Double-Button-1>', '<Shift-Button-1>']
```

Solo el botón izquierdo. Así que si no haces nada, el menú se abre sobre la fila que estuviera seleccionada de antes, y «Borrar» borra otra cosa. En una tabla se arregla con los métodos `identify_*` de la lección 27:

```python
fila = tabla.identify_row(evento.y)      # evento.y, el del widget
if fila:
        tabla.selection_set(fila)
    tabla.focus(fila)
```

`identify_row` devuelve la cadena vacía si se ha pulsado en el hueco de debajo de las filas:

```consola
>>> tabla.identify_row(999)
''
```

Y ese caso hay que tratarlo: pulsar en el vacío no debe cambiar la selección, y el menú debe abrirse con las entradas de fila desactivadas o no abrirse. El equivalente para un `Text` es convertir el clic en un índice:

```consola
>>> texto.index("@0,0")
'1.0'
>>> texto.index("@999,999")
'1.10'
```

## La barra de herramientas no es un widget

No hay `ttk.Toolbar`. Una barra de herramientas es un `Frame` con `pack(side="top", fill="x")` y botones dentro con `side="left"`, o sea el bloque B otra vez. Lo único que la hace parecer una barra de herramientas es el estilo, el mismo `Toolbutton` que apareció en la lección 14:

```python
ttk.Button(barra, text="Negrita", style="Toolbutton")
```

La diferencia es medible:

```consola
>>> normal.winfo_reqwidth()       # ttk.Button con el mismo texto
85
>>> herramienta.winfo_reqwidth()  # style="Toolbutton"
57
```

Veintiocho píxeles menos por botón, porque un `Toolbutton` no dibuja el relieve ni reserva el margen de un botón normal: solo se ilumina al pasar por encima. En una barra de ocho botones eso son más de doscientos píxeles, que es la diferencia entre caber y no caber.

Y sirve para más de un widget:

```consola
>>> ttk.Checkbutton(barra, text="X", style="Toolbutton")   # pide 21
>>> ttk.Radiobutton(barra, text="X", style="Toolbutton")   # pide 21
>>> ttk.Menubutton(barra, text="X", style="Toolbutton")    # pide 21
```

Eso da las tres piezas que necesita cualquier barra. El `Checkbutton` con este estilo es el **botón que se queda hundido**, que es exactamente lo que quieres para «Negrita» o «Ajustar líneas»: se ve de un vistazo si está activo, sin casilla de verificación. El `Radiobutton` da el grupo de botones del que solo uno puede estar hundido, como la alineación de un párrafo. Y el `Menubutton` es el botón que abre un menú:

```consola
>>> sorted(ttk.Menubutton(ventana).configure().keys())
['class', 'compound', 'cursor', 'direction', 'image', 'justify', 'menu',
 'padding', 'state', 'style', 'takefocus', 'text', 'textvariable', 'underline',
 'width']
>>> str(ttk.Menubutton(ventana).cget("direction"))
'below'
>>> ttk.Menubutton(ventana, direction="z")
_tkinter.TclError: bad direction "z": must be above, below, flush, left, or right
```

Se le da un `Menu` igual que a la barra de la lección 31, con `configure(menu=...)`, y se abre solo al pulsarlo: no hace falta ni `tk_popup` ni `grab_release`. Para un botón de barra que despliega opciones es mucho más sencillo que montar el menú contextual a mano.

> [!consejo] Qué va en la barra y qué no
>
> Una barra de herramientas es para las **tres o cuatro acciones que se repiten muchas veces al día**, no para un resumen del menú. Si tiene doce botones, nadie los distingue y se usa el menú igual.
>
> Tres reglas que se sostienen bien:
>
> - **Todo lo que está en la barra tiene que estar también en un menú.** La barra es un atajo, no el único camino: alguien que no reconoce un icono necesita poder encontrar la orden por su nombre.
> - **Nada que no se pueda deshacer**, salvo con confirmación. Un botón sin etiqueta se pulsa por error, y un menú contextual también.
> - **Los grupos se separan con un `Separator` vertical**, que es el segundo caso claro del widget de la lección 29 después de la fila de botones. Y lleva su `fill="y"`, con la trampa medida: si en la barra solo hay un separador, el `Frame` pide un píxel de alto y no se ve nada.
>
> ```consola
> >>> barra.winfo_reqheight()       # solo el separador
> 1
> >>> barra.winfo_reqheight()       # con un Toolbutton al lado
> 28
> ```
>
> La altura de la barra la fijan los botones, y el separador se estira a lo que haya. Un separador solo, sin nada al lado, no se dibuja.

## El ejemplo

Una lista de ficheros con las dos cosas: barra de herramientas arriba y menú contextual en la tabla, compartiendo las mismas funciones.

```python title="herramientas.py"
"""Menú contextual y barra de herramientas sobre una tabla."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"

FICHEROS = {
    "notas.txt": {"tamano": 1240, "tipo": "Texto", "favorito": False},
    "informe.md": {"tamano": 8931, "tipo": "Markdown", "favorito": True},
    "presupuesto.csv": {"tamano": 2048, "tipo": "Hoja de cálculo",
                        "favorito": False},
    "retrato.png": {"tamano": 184320, "tipo": "Imagen", "favorito": False},
    "copia.zip": {"tamano": 998400, "tipo": "Comprimido", "favorito": True},
}

COLUMNAS = {
    "nombre": {"titulo": "Nombre", "ancho": 200, "anchor": "w"},
    "tipo": {"titulo": "Tipo", "ancho": 140, "anchor": "w"},
    "tamano": {"titulo": "Tamaño", "ancho": 100, "anchor": "e"},
}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_barra(contenedor):
        """Un Frame con botones: no hay ningún widget de barra de herramientas.

    Lo que la hace parecer una barra es style="Toolbutton", que pide 28 px
    menos por botón que un ttk.Button normal.
    """
    barra = ttk.Frame(contenedor)
    barra.pack(fill="x", pady=(0, MARGEN))

    ttk.Button(barra, text="Abrir", style="Toolbutton",
               command=abrir).pack(side="left")
    ttk.Button(barra, text="Renombrar", style="Toolbutton",
               command=renombrar).pack(side="left")

    # Segundo caso claro del Separator: separar grupos en una barra.
    # Lleva fill="y", y la altura la dan los botones de al lado.
    ttk.Separator(barra, orient="vertical").pack(side="left", fill="y",
                                                 padx=MARGEN // 2)

    # Un Checkbutton con este estilo es un botón que se queda hundido.
    ttk.Checkbutton(barra, text="Favorito", style="Toolbutton",
                    variable=favorito,
                    command=cambiar_favorito).pack(side="left")

    ttk.Separator(barra, orient="vertical").pack(side="left", fill="y",
                                                 padx=MARGEN // 2)

    # Un Menubutton se abre solo: ni tk_popup ni grab_release.
    ordenar = ttk.Menubutton(barra, text="Ordenar", style="Toolbutton")
    menu_ordenar = tk.Menu(ordenar, tearoff=0)
    for columna, datos in COLUMNAS.items():
                menu_ordenar.add_radiobutton(label=datos["titulo"], value=columna,
                                     variable=orden, command=aplicar_orden)
    ordenar.configure(menu=menu_ordenar)
    ordenar.pack(side="left")

    ttk.Button(barra, text="Borrar", style="Toolbutton",
               command=borrar).pack(side="right")
    return barra


def crear_tabla(contenedor):
        """show='headings' para que no salga la columna #0, lección 27."""
    tabla = ttk.Treeview(contenedor, columns=list(COLUMNAS),
                         show="headings", height=len(FICHEROS),
                         selectmode="browse")
    for columna, datos in COLUMNAS.items():
                tabla.heading(columna, text=datos["titulo"], anchor=datos["anchor"])
        tabla.column(columna, width=datos["ancho"], anchor=datos["anchor"])
    tabla.tag_configure("favorito", foreground="#C2185B")

    barra = ttk.Scrollbar(contenedor, orient="vertical", command=tabla.yview)
    tabla.configure(yscrollcommand=barra.set)      # las dos mitades
    barra.pack(side="right", fill="y")
    tabla.pack(side="left", fill="both", expand=True)
    return tabla


def crear_contextual():
        """El mismo tk.Menu de la lección 31, mostrado a mano."""
    menu = tk.Menu(ventana, tearoff=0)
    menu.add_command(label="Abrir", command=abrir)
    menu.add_command(label="Renombrar", command=renombrar)
    menu.add_separator()
    menu.add_checkbutton(label="Marcar como favorito", variable=favorito,
                         command=cambiar_favorito)
    menu.add_separator()
    menu.add_command(label="Borrar", command=borrar)
    return menu


def rellenar():
        """La tabla es una vista; los datos viven en FICHEROS, lección 27."""
    tabla.delete(*tabla.get_children(""))
    clave = orden.get()
    def valor(nombre):
                return nombre.lower() if clave == "nombre" else FICHEROS[nombre][clave]
    for nombre in sorted(FICHEROS, key=valor):
                datos = FICHEROS[nombre]
        tabla.insert("", "end", iid=nombre,
                     values=(nombre, datos["tipo"], f"{datos['tamano']:,} B"),
                     tags=("favorito",) if datos["favorito"] else ())


def seleccionado():
        """El nombre de la fila marcada, o None. selection() es siempre tupla."""
    filas = tabla.selection()
    return filas[0] if filas else None


def abrir_contextual(evento):
        """El manejador del menú contextual, sin lógica propia.

    Se ata a <<ContextMenu>>, no a <Button-3>: el número del botón cambia
    entre sistemas y entre versiones de Tk.
    """
    # El clic derecho no cambia la selección por su cuenta: solo el
    # izquierdo está atado en la clase Treeview.
    fila = tabla.identify_row(evento.y)      # evento.y, el del widget
    if fila:
                tabla.selection_set(fila)
        tabla.focus(fila)
    repasar_contextual()

    try:
        # x_root e y_root, que son de la pantalla. Con evento.x y evento.y
        # el menú aparecería en la esquina, lejos del ratón.
                contextual.tk_popup(evento.x_root, evento.y_root)
    finally:
        # Sin esto, un fallo dentro del menú deja el grab puesto y la
        # ventana no responde a nada, sin ningún menú visible que cerrar.
                contextual.grab_release()


def repasar_contextual():
        """Lo que en la lección 31 hacía postcommand, aquí antes del tk_popup."""
    nombre = seleccionado()
    estado_fila = "normal" if nombre else "disabled"
    for etiqueta in ("Abrir", "Renombrar", "Marcar como favorito", "Borrar"):
                contextual.entryconfigure(etiqueta, state=estado_fila)
    if nombre:
                favorito.set(FICHEROS[nombre]["favorito"])


def cambio_de_seleccion(evento=None):
        nombre = seleccionado()
    if nombre:
                favorito.set(FICHEROS[nombre]["favorito"])
        datos = FICHEROS[nombre]
        anunciar(f"{nombre} — {datos['tipo']}, {datos['tamano']:,} bytes")
    else:
                anunciar("Nada seleccionado")


def abrir():
        nombre = seleccionado()
    if nombre:
                anunciar(f"Abriendo {nombre}…")


def renombrar():
        """El diálogo de pedir un texto es del bloque D."""
    nombre = seleccionado()
    if nombre:
                anunciar(f"Aquí iría el diálogo para renombrar {nombre}, bloque D")


def cambiar_favorito():
        nombre = seleccionado()
    if not nombre:
                return
    FICHEROS[nombre]["favorito"] = favorito.get()
    rellenar()
    tabla.selection_set(nombre)
    anunciar(f"{nombre}: favorito {'sí' if favorito.get() else 'no'}")


def borrar():
        """Sin confirmación no debería estar en una barra; el diálogo es del bloque D."""
    nombre = seleccionado()
    if not nombre:
                return
    del FICHEROS[nombre]
    rellenar()
    anunciar(f"Borrado {nombre}. Quedan {len(FICHEROS)}.")


def aplicar_orden():
        nombre = seleccionado()
    rellenar()
    if nombre in FICHEROS:
                tabla.selection_set(nombre)
    anunciar(f"Ordenado por {COLUMNAS[orden.get()]['titulo'].lower()}")


def anunciar(mensaje):
        estado.set(mensaje)


ventana = tk.Tk()
ventana.title("Ficheros")
ventana.minsize(520, 340)

# En macOS, Control+clic es la costumbre de toda la vida. Se añade al
# evento virtual, no con un bind aparte, así entra por el mismo manejador.
if ventana.tk.call("tk", "windowingsystem") == "aqua":
        ventana.event_add("<<ContextMenu>>", "<Control-Button-1>")

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
favorito = tk.BooleanVar(value=False)
orden = tk.StringVar(value="nombre")
estado = tk.StringVar(value="Pulsa con el botón derecho sobre una fila.")

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_barra(cuerpo)

caja = ttk.Frame(cuerpo)
caja.pack(fill="both", expand=True)
tabla = crear_tabla(caja)
contextual = crear_contextual()

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS).pack(
    anchor="w", pady=(MARGEN, 0))

rellenar()
tabla.bind("<<TreeviewSelect>>", cambio_de_seleccion)
tabla.bind("<<ContextMenu>>", abrir_contextual)

centrar(ventana)
ventana.mainloop()
```

Fíjate en que las seis acciones (`abrir`, `renombrar`, `cambiar_favorito`, `borrar`, `aplicar_orden`) son funciones sueltas que no saben nada de menús ni de barras. La barra las llama, el menú contextual las llama, y mañana un atajo de teclado las llamará también. Ese reparto es lo que hace que el manejador del menú contextual quede en cinco líneas y que todo lo demás se pueda probar.

> [!resumen] En resumen
>
> Ni el menú contextual ni la barra de herramientas son widgets nuevos: el primero es el `tk.Menu` de la lección 31 mostrado a mano, y la segunda un `Frame` con botones del bloque B. El botón derecho **no se ata por su número**, porque en macOS ha sido `<Button-2>` durante años y ahora es `<Button-3>`: se ata el evento virtual **`<<ContextMenu>>`**, que en cada sistema vale lo que allí corresponda, y si quieres añadir un gesto (el Control+clic de macOS) se hace con `event_add` sobre el propio evento virtual para que todo entre por el mismo manejador. Se muestra con `tk_popup(evento.x_root, evento.y_root)`, con las coordenadas **de la pantalla** y no las del widget, porque confundirlas deja el menú en la esquina sin dar ningún error. **`tk_popup` es modal**: comprobado con un plazo de seis segundos que no vuelve hasta que alguien cierra el menú, así que lo que haya que preparar va antes y no después; y `post` tampoco vale como alternativa porque en macOS también bloquea y su `unpost()` nunca se ejecuta. El `try`/`finally` con **`grab_release()`** no es un adorno: `tk_popup` pone un grab, y si algo revienta con el grab puesto `grab_current()` sigue apuntando al menú, la ventana deja de responder y no hay ningún menú visible que cerrar, un fallo cuyo síntoma no se parece a su causa; `grab_release` se puede llamar siempre, incluso sin grab, así que el `finally` es gratis. El clic derecho **no cambia la selección** (solo `<Button-1>` está atado en la clase `Treeview`), de modo que sin un `identify_row(evento.y)` seguido de `selection_set` el menú actúa sobre la fila anterior y «Borrar» borra otra cosa; `identify_row` devuelve cadena vacía en el hueco de debajo, y el equivalente para un `Text` es `index("@x,y")`. La barra de herramientas se hace con **`style="Toolbutton"`**, que mide 57 px donde un botón normal mide 85, y vale para `Button`, `Checkbutton` (el botón que se queda hundido), `Radiobutton` (grupo de uno solo hundido) y `Menubutton` (el botón que abre un menú, con `direction` y sin necesidad de `tk_popup` ni de grab). Los grupos se separan con un `Separator` vertical con `fill="y"`, y con la trampa de que un separador solo en la barra deja el `Frame` en un píxel de alto: la altura la dan los botones. Y el criterio: tres o cuatro acciones en la barra, todo lo que esté en ella también en un menú, y nada irreversible sin confirmación. Como `tk_popup` no vuelve, **un menú contextual no se puede ejercitar sin abrir una ventana**, lo que refuerza la regla de que el manejador no tenga lógica propia: averiguar dónde se ha pulsado, llamar a funciones sueltas y mostrar el menú.

> [!ejercicio] Practica
>
> Trabaja en un fichero `32-contextual.py` salvo donde se indique otra cosa:
>
> 1. Mira lo que devuelve `ventana.event_info("<<ContextMenu>>")` en tu máquina y anótalo. Compáralo con `<Button-3>`.
> 2. Monta un `Text` con un menú contextual de tres entradas atado a `<<ContextMenu>>`. Comprueba que funciona con el gesto que use tu sistema.
> 3. Cambia `x_root` e `y_root` por `x` e `y` y mira dónde aparece el menú. Vuelve a dejarlo bien.
> 4. Quita el `try`/`finally` y provoca una excepción dentro de la función de una entrada (por ejemplo, un `int("hola")`). Comprueba qué le pasa a la ventana y arréglalo con el `finally`.
> 5. Añade `<Control-Button-1>` al evento virtual con `event_add` y comprueba que los dos gestos abren el mismo menú.
> 6. En `32-tabla.py`, pon un `Treeview` con cinco filas y un menú contextual **sin** el `identify_row`. Selecciona una fila con el botón izquierdo, pulsa con el derecho sobre otra y mira sobre cuál actúa el menú. Arréglalo.
> 7. Pulsa con el botón derecho en el hueco de debajo de las filas y comprueba qué devuelve `identify_row`. Haz que en ese caso las entradas de fila salgan desactivadas.
> 8. En `32-barra.py`, pon dos botones iguales, uno normal y otro con `style="Toolbutton"`, y compara lo que devuelve `winfo_reqwidth()` de cada uno.
> 9. Añade un `Checkbutton` con `style="Toolbutton"` y comprueba que se queda hundido. Después añade tres `Radiobutton` con el mismo estilo y una sola variable.
> 10. Pon un `ttk.Menubutton` con un menú de tres opciones y prueba los cinco valores de `direction`.
> 11. Pon un `Separator` vertical como único hijo de la barra y mira qué alto pide el `Frame`. Añade un botón al lado y vuelve a medirlo.

> [!nota] Fin del bloque C
>
> Con esta lección quedan cubiertos los veinte widgets, uno por uno, del `Label` de la lección 13 a la barra de herramientas. A partir de aquí el módulo deja de ir por piezas y empieza a ir por comportamientos: el **bloque D** trata la interacción a fondo, y abre con las variables de control (`StringVar` y compañía), que han ido apareciendo en casi todas las lecciones del bloque C con la promesa de explicarse en su momento. Después vienen los eventos y `bind`, el teclado y el ratón en detalle, los diálogos estándar, las ventanas secundarias y la validación de formularios.
