---
titulo: "Teclado y ratón en detalle"
resumen: "El <Enter> que no es la tecla Enter, los ángulos que si faltan no dan error, el doble clic que dispara también el simple, y los modificadores que vienen como número."
minutos: 25
orden: 35
---

La lección anterior explicó el sistema de eventos. Esta baja a los dos dispositivos, y lo hace porque aquí es donde están los nombres mal puestos. Tkinter heredó de Tk, y Tk del sistema de ventanas de los años ochenta, una nomenclatura en la que `<Enter>` no tiene nada que ver con la tecla Enter, en la que el signo menos se llama `minus` y en la que olvidarse de dos caracteres hace que un atajo no funcione sin que nadie proteste.

También está aquí el detalle que rompe más interfaces: un doble clic no sustituye al clic simple, lo añade.

> [!objetivo] Qué vas a aprender
>
> Escribir secuencias de teclado sin equivocarse en los nombres y sabiendo qué campo del evento leer en cada caso; distinguir `char` de `keysym` y saber cuál sirve para qué; comprobar los modificadores, que vienen como número y no como lista; atender el ratón sin que el doble clic pelee con el simple; y manejar el foco, incluido el patrón de que Enter avance al campo siguiente.

## Los nombres del teclado

Una tecla se ata de tres formas, de la más general a la más concreta:

```python
campo.bind("<Key>", cualquier_tecla)        # todas
campo.bind("<Key-a>", solo_la_a)            # una concreta
campo.bind("<a>", solo_la_a)                # lo mismo, forma corta
campo.bind("<Control-Key-s>", guardar)      # con modificador
campo.bind("<Control-s>", guardar)          # lo mismo, forma corta
```

`<Key>` y `<KeyPress>` son sinónimos, y `<KeyRelease>` es al soltar. La forma corta funciona para las letras y los dígitos, pero **las teclas que no producen un carácter tienen nombre propio y el nombre es obligatorio**:

| Tecla | `keysym` | Tecla | `keysym` |
| --- | --- | --- | --- |
| Enter / Intro | `Return` | Retroceso | `BackSpace` |
| Escape | `Escape` | Suprimir | `Delete` |
| Tabulador | `Tab` | Insertar | `Insert` |
| Barra espaciadora | `space` | Inicio / Fin | `Home` / `End` |
| Flechas | `Up` `Down` `Left` `Right` | Página arriba / abajo | `Prior` / `Next` |
| Función | `F1` … `F12` | Mayúsculas | `Shift_L` / `Shift_R` |

Las dos últimas filas son las que más se buscan mal: **página arriba y abajo se llaman `Prior` y `Next`**, no `PageUp` y `PageDown`.

Y la puntuación también tiene nombre, porque el carácter en crudo no se puede poner en una secuencia:

```consola
>>> para nombre in ("period", "comma", "minus", "plus", "slash", "question",
...                 "exclam", "parenleft", "bracketleft", "braceleft",
...                 "asterisk", "percent"):   →  todos válidos
```

Si te equivocas, Tk sí protesta, y el error dice exactamente qué pasa:

```consola
>>> ventana.bind("<Key-Retorno>", manejador)
_tkinter.TclError: bad event type or keysym "Retorno"
>>> ventana.bind("<Ctrl-s>", manejador)
_tkinter.TclError: bad event type or keysym "Ctrl"
>>> ventana.bind("<control-s>", manejador)
_tkinter.TclError: bad event type or keysym "control"
```

Tres cosas de ahí: el modificador se llama **`Control`** y no `Ctrl`; **las mayúsculas importan** en los nombres de modificadores y de teclas; y el mensaje es el mismo para un tipo de evento inventado y para un nombre de tecla inventado, porque en esa posición Tk acepta las dos cosas.

> [!error] Si faltan los ángulos, Tk no protesta
>
> Esta es la trampa que cuesta más, porque es la única de la lección que no da error:
>
> ```consola
> >>> ventana.bind("Control-s", manejador)      # sin < >
> >>> ventana.bind()
> ('Control-s',)
> ```
>
> Aceptado y registrado. Y completamente inútil:
>
> ```consola
> >>> ventana.event_generate("<Control-Key-s>")
> >>> recibido
> []
> ```
>
> Lo que has atado no es «Control y s», sino **la secuencia de caracteres literales C, o, n, t, r, o, l, guion, s**, escritos uno detrás de otro. Es una función de Tk que existe de verdad, para atajos de varias pulsaciones al estilo de los editores antiguos, y es la razón de que no dé error: es sintaxis válida con otro significado.
>
> El síntoma es un atajo que simplemente no hace nada, sin ninguna pista en ninguna parte. Cuando un `bind` no responde, lo primero es mirar `widget.bind()` y comprobar que la secuencia sale entre ángulos.

> [!aviso] `<Enter>` no es la tecla Enter
>
> ```python
> widget.bind("<Enter>", manejador)     # el PUNTERO entra en el widget
> widget.bind("<Return>", manejador)    # la TECLA Enter
> ```
>
> `<Enter>` y `<Leave>` son eventos de ratón: el puntero entra y sale del widget. La tecla se llama `<Return>`. Y por si alguien intenta el híbrido:
>
> ```consola
> >>> ventana.bind("<Enter-Key>", manejador)
> _tkinter.TclError: specified keysym "Key" for non-key event
> ```
>
> Ese error, con lo raro que parece, es de los útiles: dice que has puesto un nombre de tecla en un evento que no es de teclado.

## `char`, `keysym` y `keycode`

Los tres campos del evento hablan de la misma pulsación desde tres alturas distintas:

- **`char`** es el carácter que produce, como texto. Con la `a` es `'a'`; con Mayúsculas y `a` es `'A'`; con las flechas o F1 está vacío. Es lo que sirve para **escribir**.
- **`keysym`** es el nombre de la tecla: `'a'`, `'A'`, `'Return'`, `'F1'`, `'Left'`. Es lo que sirve para **decidir**, porque existe siempre.
- **`keycode`** es el código físico. Depende del teclado y del sistema, así que no se usa salvo para casos muy raros.

La regla práctica: **`keysym` para comparar, `char` para insertar.** Un manejador que decida con `char` falla con todas las teclas que no producen carácter, y uno que inserte `keysym` escribe `Return` en medio del texto.

Y recuerda el hallazgo de la lección anterior: en un evento que no es de teclado, `char` y `keysym` **valen `'??'`**, no cadena vacía, así que `if evento.char:` es verdadero.

## Los modificadores vienen como número

No hay una lista de teclas pulsadas: hay un entero con un bit por modificador.

```consola
>>> evento.state
5
```

Eso significa Shift y Control a la vez, porque 5 es 1 + 4. La tabla de máscaras:

| Bit | Valor | Qué es |
| --- | --- | --- |
| 0 | 1 | Shift |
| 1 | 2 | Bloqueo de mayúsculas |
| 2 | 4 | Control |
| 3 | 8 | `Mod1`: Alt en Windows y Linux, **Command en macOS** |
| 8 | 256 | Botón 1 del ratón pulsado |
| 9 | 512 | Botón 2 |
| 10 | 1024 | Botón 3 |

Y se comprueba con el operador de bits:

```python
if evento.state & 4:
        ...     # Control estaba pulsado
```

Esto hace falta poco, porque normalmente es más limpio atar `<Control-Key-a>` y que Tk se encargue. Sirve cuando el modificador **cambia el significado de un gesto que ya estás atendiendo**: un arrastre en el `Canvas` que con Shift restringe el movimiento a un eje, o un clic en una lista que con Control añade a la selección en vez de sustituirla.

Cuidado con el bit 3 en macOS: como se vio en la lección 31, Command se registra como `Mod1`, el mismo bit que Alt en los otros sistemas. Si tu programa distingue Alt de Command, hay que mirar también `windowingsystem`.

## El ratón

Los botones se numeran, y el número va en el detalle y en `evento.num`:

```python
lienzo.bind("<Button-1>", empezar)          # botón izquierdo
lienzo.bind("<ButtonRelease-1>", soltar)
lienzo.bind("<B1-Motion>", arrastrar)       # mover CON el botón pulsado
lienzo.bind("<Motion>", mover)              # mover sin pulsar nada
lienzo.bind("<Enter>", entrar)
lienzo.bind("<Leave>", salir)
lienzo.bind("<MouseWheel>", rueda)          # lección 24, con sus diferencias
```

`<B1-Motion>` es el que se usa para arrastrar, y ya apareció en la lección 26. Y `<Motion>` sin botón es caro: se dispara decenas de veces por segundo, así que el manejador tiene que ser corto o hay que espaciarlo.

> [!error] Un doble clic dispara también el clic simple
>
> Medido con los dos manejadores atados y dos pulsaciones seguidas en el mismo sitio:
>
> ```consola
> >>> marco.bind("<Button-1>", lambda e: huellas.append("simple"), add="+")
> >>> marco.bind("<Double-Button-1>", lambda e: huellas.append("doble"), add="+")
> >>> # dos clics seguidos…
> >>> huellas
> ['simple', 'doble']
> ```
>
> **Los dos.** Tk no adivina el futuro: cuando llega el primer clic no puede saber si vendrá otro, así que lo entrega, y si llega el segundo entrega además el doble.
>
> Eso hace que este diseño esté roto:
>
> - clic simple: selecciona la fila
> - doble clic: la borra
>
> Porque al borrar se ha seleccionado antes, y si el borrado usa la selección, más o menos funciona; pero si el clic simple hace algo que no se puede deshacer, o algo caro como cargar un fichero, el doble clic lo hará igualmente.
>
> La salida limpia es que **el simple y el doble sean la misma acción a distinta intensidad**, que es lo que hacen todos los sistemas: el simple selecciona y el doble selecciona *y* abre. Si de verdad necesitas acciones incompatibles, hay que retrasar la del simple con un `after` de unos 300 ms y cancelarla con `after_cancel` si llega el doble, y eso se nota al usarlo, así que casi siempre es mejor cambiar el diseño.
>
> Y un detalle para las pruebas: **un doble clic no se puede sintetizar**.
>
> ```consola
> >>> marco.event_generate("<Double-Button-1>")
> _tkinter.TclError: Double, Triple, or Quadruple modifier not allowed
> ```
>
> Atarlo sí vale; generarlo no. Para provocarlo hay que emitir dos `<Button-1>` seguidos en las mismas coordenadas, que es lo que hace la medición de arriba.

## El foco

El foco decide **quién recibe el teclado**, y solo lo tiene un widget a la vez.

```python
campo.focus_set()          # pídelo cuando puedas
campo.focus_force()        # quítaselo a quien lo tenga (casi nunca)
ventana.focus_get()        # quién lo tiene ahora, o None
```

`focus_set()` es lo que se usa: pone el cursor en el primer campo de un formulario o en el campo de un diálogo recién abierto, que es de las cosas que más se agradecen y más se olvidan. `focus_force()` se lo arrebata a otra ventana del sistema y es de mala educación; hay un caso legítimo en la lección 38, con las ventanas modales.

Quién puede recibir el foco lo decide `takefocus`:

```consola
>>> ttk.Entry(ventana).cget("takefocus")      →  'ttk::takefocus'
>>> ttk.Button(ventana).cget("takefocus")     →  'ttk::takefocus'
>>> ttk.Treeview(ventana).cget("takefocus")   →  'ttk::takefocus'
>>> ttk.Label(ventana).cget("takefocus")      →  ''
>>> ttk.Frame(ventana).cget("takefocus")      →  ''
```

Los widgets interactivos de `ttk` traen una función de Tcl que lo decide según su estado (uno desactivado no recibe el foco), y los decorativos traen la cadena vacía, que significa «decide tú, Tk». Se puede forzar con `takefocus=True` o sacar un widget del recorrido con `takefocus=False`.

Y el recorrido se puede consultar y mover a mano:

```consola
>>> primero.tk_focusNext()
.!entry2
>>> segundo.tk_focusPrev()
.!entry
```

Lo interesante es que **el tabulador es un evento virtual**:

```consola
>>> ventana.event_info("<<NextWindow>>")
('<Key-Tab>',)
>>> ventana.event_info("<<PrevWindow>>")
('<Shift-Key-Tab>',)
```

O sea que el orden de tabulación no está cableado: se puede añadir otra tecla al evento virtual con `event_add`, que es la forma correcta de conseguir lo que más se pide en un formulario, **que Enter pase al campo siguiente**:

```python
def siguiente(evento):
        evento.widget.tk_focusNext().focus_set()
    return "break"      # que el Enter no llegue al nivel de clase

for campo in campos:
        campo.bind("<Return>", siguiente)
```

El `"break"` de la lección anterior importa aquí: sin él, el Enter sigue su camino y en un `Text` insertaría un salto de línea además de mover el foco.

## El cursor

Cambiar la forma del puntero es una opción común de todos los widgets, y es la señal más barata de que algo se puede pulsar o arrastrar:

```consola
>>> marco.cget("cursor")
''
>>> marco.configure(cursor="inventado")
_tkinter.TclError: bad cursor spec "inventado" ...
```

Los útiles son pocos: `hand2` para lo que se pulsa, `xterm` para texto, `watch` para esperar, `fleur` para lo que se arrastra, `crosshair` para precisión, y `sb_h_double_arrow` para un divisor horizontal como el de la lección 29. La cadena vacía significa «el del padre».

## El ejemplo

Un formulario con navegación por Enter y un lienzo que reacciona a teclado, ratón y modificadores.

```python title="teclado.py"
"""Teclado y ratón: navegación con Enter, arrastre y modificadores."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
AZUL = "#1565C0"
ROSA = "#C2185B"

LADO = 40
PASO = 10

# Máscaras de bits de evento.state. Mod1 es Alt en Windows y Linux, y
# Command en macOS, como se vio en la lección 31.
MODIFICADORES = ((1, "Shift"), (2, "Bloq Mayús"), (4, "Control"),
                 (8, "Mod1 (Alt/Cmd)"), (256, "Botón 1"))


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def pulsados(state):
        """Los modificadores de un evento, que vienen como un solo entero."""
    return [nombre for bit, nombre in MODIFICADORES if state & bit]


def siguiente(evento):
        """Que Enter avance al campo siguiente, lo que más se pide de un formulario.

    El "break" es necesario: sin él el Enter sigue por la cadena de la
    lección 34 y llega al comportamiento de fábrica del widget.
    """
    evento.widget.tk_focusNext().focus_set()
    return "break"


def anterior(evento):
        evento.widget.tk_focusPrev().focus_set()
    return "break"


def crear_formulario(contenedor):
        """Tres campos donde Enter avanza y Shift+Enter retrocede."""
    marco = ttk.Labelframe(contenedor, text="Enter avanza de campo",
                           padding=MARGEN)
    marco.pack(fill="x")

    primero = None
    for etiqueta, variable in (("Nombre", nombre), ("Ciudad", ciudad),
                               ("Correo", correo)):
                fila = ttk.Frame(marco)
        fila.pack(fill="x", pady=AIRE)
        ttk.Label(fila, text=f"{etiqueta}:", width=10,
                  anchor="w").pack(side="left")
        campo = ttk.Entry(fila, textvariable=variable)
        campo.pack(side="left", fill="x", expand=True)
        campo.bind("<Return>", siguiente)
        campo.bind("<Shift-Return>", anterior)
        if primero is None:
                        primero = campo

    ttk.Label(marco, foreground=GRIS, text="Shift+Enter retrocede. El "
              "tabulador funciona solo: es el evento virtual "
              "<<NextWindow>>.").pack(anchor="w", pady=(AIRE, 0))
    return marco, primero


def crear_lienzo(contenedor):
        """El Canvas, que sí necesita takefocus para recibir el teclado.

    Un Canvas no está en el recorrido del tabulador de fábrica.
    """
    marco = ttk.Labelframe(contenedor, text="Teclado, ratón y modificadores",
                           padding=MARGEN)
    marco.pack(fill="both", expand=True, pady=(MARGEN, 0))

    lienzo = tk.Canvas(marco, height=200, background="white",
                       highlightthickness=1, takefocus=True,
                       cursor="crosshair")
    lienzo.pack(fill="both", expand=True)
    lienzo.create_rectangle(80, 80, 80 + LADO, 80 + LADO, fill=AZUL,
                            outline="", tags="caja")
    return lienzo


def mover(dx, dy):
        """Mueve la caja y actualiza el rótulo."""
    lienzo.move("caja", dx, dy)
    x1, y1, x2, y2 = lienzo.coords("caja")
    posicion.set(f"Caja en ({x1:.0f}, {y1:.0f})")


def tecla(evento):
        """keysym para decidir, no char: las flechas no producen carácter."""
    # El paso depende de Shift, que es un modificador de un gesto que ya
    # estamos atendiendo: aquí sí hace falta mirar evento.state.
    paso = PASO * (5 if evento.state & 1 else 1)
    direcciones = {"Left": (-paso, 0), "Right": (paso, 0),
                   "Up": (0, -paso), "Down": (0, paso)}
    if evento.keysym in direcciones:
                mover(*direcciones[evento.keysym])
        apuntar(f"keysym={evento.keysym} char={evento.char!r} "
                f"modificadores={pulsados(evento.state) or 'ninguno'}")
        return "break"
    if evento.keysym == "Home":
                lienzo.coords("caja", 80, 80, 80 + LADO, 80 + LADO)
        mover(0, 0)
        apuntar("keysym=Home: la caja vuelve al origen")
        return "break"
    # Cualquier otra tecla: aquí sí se usa char, que es para escribir.
    if evento.char and evento.char != "??" and evento.char.isprintable():
                apuntar(f"char={evento.char!r} keysym={evento.keysym!r}")
    else:
                apuntar(f"keysym={evento.keysym!r} sin carácter "
                f"(char vale {evento.char!r})")


def empezar(evento):
        """El arrastre, lección 26. focus_set para que el Canvas oiga el teclado."""
    lienzo.focus_set()
    arrastre["x"] = lienzo.canvasx(evento.x)
    arrastre["y"] = lienzo.canvasy(evento.y)
    arrastre["activo"] = bool(lienzo.find_withtag("current"))
    apuntar(f"Button-{evento.num} en ({evento.x}, {evento.y}) "
            f"— sobre la caja: {arrastre['activo']}")


def arrastrar(evento):
        """B1-Motion: mover con el botón pulsado. Shift restringe a un eje."""
    if not arrastre["activo"]:
                return
    x = lienzo.canvasx(evento.x)
    y = lienzo.canvasy(evento.y)
    dx, dy = x - arrastre["x"], y - arrastre["y"]
    if evento.state & 1:                 # Shift: solo el eje que más se mueve
                if abs(dx) > abs(dy):
                        dy = 0
        else:
                        dx = 0
    lienzo.move("caja", dx, dy)
    if not (evento.state & 1) or dx:
                arrastre["x"] = x
    if not (evento.state & 1) or dy:
                arrastre["y"] = y
    x1, y1, _, _ = lienzo.coords("caja")
    posicion.set(f"Caja en ({x1:.0f}, {y1:.0f})")


def soltar(evento):
        arrastre["activo"] = False
    apuntar(f"ButtonRelease-{evento.num}: soltado")


def entrar(evento):
        """<Enter> es el PUNTERO entrando, no la tecla Enter."""
    lienzo.configure(background="#F5F9FF")
    apuntar("<Enter>: el puntero ha entrado en el lienzo")


def salir(evento):
        lienzo.configure(background="white")
    apuntar("<Leave>: el puntero ha salido")


def doble(evento):
        """Ojo: el clic simple ya se ha disparado antes de llegar aquí.

    Por eso el simple y el doble son la misma acción a distinta
    intensidad, y no dos cosas incompatibles.
    """
    lienzo.itemconfigure("caja", fill=ROSA if lienzo.itemcget("caja", "fill")
                         == AZUL else AZUL)
    apuntar("Double-Button-1: cambia el color. El simple ya se disparó.")


def apuntar(mensaje):
        ultimo.set(mensaje)


ventana = tk.Tk()
ventana.title("Teclado y ratón")
ventana.minsize(600, 520)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
nombre = tk.StringVar()
ciudad = tk.StringVar()
correo = tk.StringVar()
posicion = tk.StringVar(value="Caja en (80, 80)")
ultimo = tk.StringVar(value="Pulsa en el lienzo y usa las flechas.")
arrastre = {"x": 0, "y": 0, "activo": False}

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

formulario, primer_campo = crear_formulario(cuerpo)
lienzo = crear_lienzo(cuerpo)

pie = ttk.Frame(cuerpo)
pie.pack(fill="x", pady=(MARGEN, 0))
ttk.Label(pie, textvariable=posicion).pack(side="left")
ttk.Label(cuerpo, textvariable=ultimo, foreground=GRIS, wraplength=560,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

# add="+" en todos, que es la regla de la lección 34 cuando hay varios
# bind sobre el mismo widget.
lienzo.bind("<Key>", tecla, add="+")
lienzo.bind("<Button-1>", empezar, add="+")
lienzo.bind("<B1-Motion>", arrastrar, add="+")
lienzo.bind("<ButtonRelease-1>", soltar, add="+")
lienzo.bind("<Double-Button-1>", doble, add="+")
lienzo.bind("<Enter>", entrar, add="+")
lienzo.bind("<Leave>", salir, add="+")

primer_campo.focus_set()      # el cursor donde se va a escribir
centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Los nombres del teclado vienen de Tk y hay que aprendérselos: **`<Enter>` es el puntero entrando en el widget y la tecla se llama `<Return>`**; página arriba y abajo son **`Prior` y `Next`**; el modificador es `Control` y no `Ctrl`; las mayúsculas importan; y la puntuación tiene nombre (`period`, `minus`, `parenleft`). Los errores de Tk son útiles aquí (`bad event type or keysym "Ctrl"`, y `specified keysym "Key" for non-key event` si mezclas teclas con eventos de ratón), salvo en la trampa de la lección: **si faltan los ángulos, `bind("Control-s", ...)` se acepta sin error** porque significa otra cosa, la secuencia de los nueve caracteres literales, y el síntoma es un atajo que no hace nada sin ninguna pista; cuando un `bind` no responde, mirar `widget.bind()`. De los tres campos, **`keysym` sirve para decidir porque existe siempre, y `char` para insertar**; `keycode` depende del teclado y no se usa; y en un evento que no es de teclado los dos valen `'??'`, no cadena vacía (hallazgo de la lección 34). Los modificadores **no vienen como lista sino como un entero de bits** en `evento.state` (1 Shift, 2 Bloq Mayús, 4 Control, 8 `Mod1` que es Alt en Windows y Linux y **Command en macOS**, 256 botón 1), y se comprueban con `&`; hace falta poco, porque casi siempre es mejor atar `<Control-Key-a>`, y sirve cuando el modificador cambia el significado de un gesto que ya estás atendiendo. Del ratón: `<B1-Motion>` para arrastrar, `<Motion>` sin botón es caro porque salta decenas de veces por segundo, y `<Enter>`/`<Leave>` para el puntero. Y el detalle que rompe interfaces: **un doble clic dispara también el clic simple**, medido, porque cuando llega el primero Tk no puede saber si vendrá otro; así que el simple y el doble deben ser la misma acción a distinta intensidad (seleccionar, y seleccionar y abrir) y no dos cosas incompatibles, y si de verdad hacen falta incompatibles hay que retrasar la del simple con `after` y cancelarla con `after_cancel`. Para las pruebas, **un doble clic no se puede sintetizar** (`Double, Triple, or Quadruple modifier not allowed`): hay que emitir dos `<Button-1>` seguidos. El foco decide quién recibe el teclado, se pide con `focus_set()` (poner el cursor en el primer campo es de lo que más se agradece), `focus_force()` es de mala educación salvo en las modales de la lección 38, y `takefocus` decide quién entra en el recorrido, con `'ttk::takefocus'` en los widgets interactivos de `ttk` y `''` en los decorativos. Y como **el tabulador es el evento virtual `<<NextWindow>>`**, el orden no está cableado: de ahí el patrón de que Enter avance de campo con `tk_focusNext().focus_set()` y un `return "break"` para que el Enter no siga por la cadena.

> [!ejercicio] Practica
>
> Trabaja en un fichero `35-teclado.py` salvo donde se indique otra cosa:
>
> 1. Ata `<Key>` a un `Entry` e imprime `char`, `keysym` y `keycode` de cada pulsación. Prueba con una letra, con Mayúsculas y una letra, con una flecha, con F1 y con la ñ.
> 2. Ata `<Enter>` y `<Return>` al mismo widget con mensajes distintos. Pasa el ratón por encima y después pulsa Enter, y comprueba cuál salta en cada caso.
> 3. En `35-angulos.py`, ata `"Control-s"` sin ángulos y comprueba que no da error y que Control+S no hace nada. Imprime `widget.bind()` y mira cómo aparece.
> 4. Prueba a atar `<Ctrl-s>`, `<control-s>`, `<Key-Retorno>` y `<Enter-Key>`, y copia los cuatro errores.
> 5. Escribe un manejador que imprima los modificadores a partir de `evento.state` con la tabla de bits. Pulsa combinaciones y comprueba los números.
> 6. En `35-doble.py`, ata `<Button-1>` y `<Double-Button-1>` con mensajes distintos. Haz un doble clic y anota el orden en que salen.
> 7. Rediseña ese ejemplo para que el simple y el doble sean compatibles, y después inténtalo con `after` y `after_cancel` para que sean exclusivos. Compara cómo se siente cada uno.
> 8. Intenta generar un doble clic con `event_generate("<Double-Button-1>")` y lee el error. Consíguelo con dos `<Button-1>`.
> 9. En `35-foco.py`, monta cuatro campos y haz que Enter avance y Shift+Enter retroceda. Quita el `return "break"` y explica qué cambia.
> 10. Saca el tercer campo del recorrido del tabulador con `takefocus=False` y comprueba el nuevo orden con `tk_focusNext`.
> 11. Añade `<Key-Return>` al evento virtual `<<NextWindow>>` con `event_add` y compara ese enfoque con el del ejercicio 9.
> 12. Pon un `cursor` distinto en cuatro widgets (`hand2`, `xterm`, `watch`, `fleur`) y comprueba el error con un nombre inventado.
