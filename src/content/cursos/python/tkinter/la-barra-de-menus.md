---
titulo: "La barra de menús"
resumen: "El único widget que no va dentro de la ventana, el accelerator que no ata nada, el índice que vale None en un menú vacío, y el tearoff que desplaza todo lo demás."
minutos: 31
orden: 31
---

La barra de menús es el widget más raro del módulo, por tres motivos. No se coloca con ningún gestor, porque no es un hijo de la ventana sino **una opción** de la ventana. No tiene versión temática, y por una vez eso es una buena noticia. Y en macOS ni siquiera se dibuja dentro de la ventana: aparece arriba, en la barra del sistema, compartida con el resto de los programas.

Es también el widget donde más se nota en qué sistema operativo estás, y por eso la lección lo trata como un asunto de primera clase en vez de dejarlo en una nota al pie.

Y cumple una referencia pendiente de la lección 29: el separador de dentro de un menú **no es el widget `Separator`**. Es una entrada del propio menú, `add_separator()`, y es el único sitio del curso donde una línea divisoria se pone sin pensarlo dos veces, porque en un menú es la convención de todos los sistemas.

> [!objetivo] Qué vas a aprender
>
> Montar una barra de menús completa con submenús, casillas y grupos de opciones; entender por qué `accelerator` no hace funcionar ningún atajo y cómo escribir las dos mitades de forma que no se separen; activar y desactivar entradas en el momento correcto, que no es cuando lo harías con un widget normal; reconstruir un submenú sin tropezar con el índice que vale `None`; y dejar el programa correcto en macOS sin romperlo en Windows y Linux.

## No hay versión temática, y da igual

```consola
>>> hasattr(ttk, "Menu")
False
```

Los menús son solo `tk`, como el `Text`, el `Listbox` y el `Canvas`. Pero al contrario que aquellos, aquí no se pierde nada: **Tk dibuja los menús con los del sistema**, así que ya tienen el aspecto nativo sin ayuda de `ttk`. Un menú de Tkinter en macOS es un menú de macOS de verdad, con su tipografía y su comportamiento.

La consecuencia es que casi todas las opciones de aspecto del widget no hacen nada en macOS, y conviene no tocarlas:

```consola
>>> sorted(tk.Menu(ventana).configure().keys())
['activebackground', 'activeborderwidth', 'activeforeground', 'activerelief',
 'background', 'bd', 'bg', 'borderwidth', 'cursor', 'disabledforeground',
 'fg', 'font', 'foreground', 'postcommand', 'relief', 'selectcolor',
 'takefocus', 'tearoff', 'tearoffcommand', 'title', 'type']
```

De esas veintiuna, las que se usan de verdad son tres: `tearoff`, `postcommand` y, de vez en cuando, `title`. Las demás son colores y bordes de un menú dibujado por Tk, que es lo que ocurría en los años noventa.

## La barra es una opción de la ventana

Esto es lo primero que hay que interiorizar, porque rompe todo lo aprendido en el bloque B:

```consola
>>> "menu" in ventana.configure()
True
```

La barra no se empaqueta ni se coloca en una rejilla. Se construye y se le entrega a la ventana:

```python
barra = tk.Menu(ventana)
ventana.configure(menu=barra)
```

Y se quita igual de fácil, lo que vale para el modo de pantalla completa o para una ventana secundaria sin menús:

```consola
>>> ventana.configure(menu="")
>>> str(ventana.cget("menu"))
''
```

La estructura tiene tres niveles y se repite igual en cualquier programa. La **barra** es un `Menu`. Cada título de la barra es una entrada de tipo `cascade`, que apunta a otro `Menu`. Y dentro de ese van las **entradas**, que son de cinco tipos:

```consola
>>> for i in range(archivo.index("end") + 1):
...     print(i, archivo.type(i))
0 command
1 separator
2 checkbutton
3 radiobutton
```

Más el `cascade`, que sirve tanto en la barra como dentro de un menú para hacer un submenú. Cada tipo se añade con su método (`add_command`, `add_separator`, `add_checkbutton`, `add_radiobutton`, `add_cascade`) y tiene sus propias opciones, que se leen igual que las de un widget:

```consola
>>> sorted(archivo.entryconfigure(0).keys())          # un command
['accelerator', 'activebackground', 'activeforeground', 'background', 'bitmap',
 'columnbreak', 'command', 'compound', 'font', 'foreground', 'hidemargin',
 'image', 'label', 'state', 'underline']
>>> sorted(separadores.entryconfigure(0).keys())      # un separator
['background']
```

Un separador tiene **una sola opción**, así que ni se le pone etiqueta ni se le pregunta nada:

```consola
>>> separadores.entryconfigure(0, label="X")
_tkinter.TclError: unknown option "-label"
```

Y una cosa curiosa, que conviene saber para no dudar: un `cascade` tiene `command` **y** `menu` a la vez. El `command` de un cascade se ejecuta al abrirlo, y es una forma más torpe de hacer lo que hace `postcommand`.

## El `tearoff`, que ya casi no molesta

En los manuales antiguos la primera línea de cualquier menú es `tearoff=0`, para quitar una línea de puntos que aparecía arriba y que, al pulsarla, arrancaba el menú en una ventanita flotante. Medido hoy:

```consola
>>> str(tk.Menu(ventana).cget("tearoff"))
'0'
```

Ya viene apagado, al menos en Tk 9 sobre macOS. Pero **hay que seguir escribiéndolo**, y el motivo no es el adorno:

```consola
>>> con_tearoff.index("Uno"), con_tearoff.index("end")
(1, 2)
>>> sin_tearoff.index("Uno"), sin_tearoff.index("end")
(0, 1)
```

**Con `tearoff=1`, la línea de puntos ocupa el índice 0 y desplaza todo lo demás.** O sea que cualquier código que diga `entryconfigure(0, ...)` o `delete(0, "end")` apunta a otra cosa según cómo esté el menú, y como el valor de fábrica cambia entre versiones de Tk y entre sistemas, un programa escrito sin `tearoff=0` funciona en tu máquina y se desordena en otra. Escríbelo siempre, en todos los menús menos en la barra.

## `accelerator` no ata nada

Este es el hallazgo que más tiempo hace perder, porque lo natural es suponer lo contrario.

> [!error] El atajo del menú es solo un dibujo
>
> ```python
> menu.add_command(label="Guardar", accelerator="Ctrl+S", command=guardar)
> ```
>
> Cualquiera diría que eso deja Ctrl+S funcionando. Medido:
>
> ```consola
> >>> pulsado = []
> >>> menu.add_command(label="Guardar", accelerator="Ctrl+S",
> ...                  command=lambda: pulsado.append("menu"))
> >>> ventana.event_generate("<Control-s>")
> >>> pulsado
> []
> ```
>
> Nada. **`accelerator` solo escribe un texto a la derecha de la entrada.** No ata ninguna tecla, y de hecho le da igual lo que le pongas:
>
> ```consola
> >>> menu.entryconfigure(0, accelerator="lo que sea")
> >>> str(menu.entrycget(0, "accelerator"))
> 'lo que sea'
> ```
>
> Acepta cualquier cosa porque no lo interpreta: lo pinta. El atajo hay que atarlo aparte, con el `bind` de la lección 5 y del bloque D:
>
> ```python
> ventana.bind_all("<Control-s>", lambda evento: guardar())
> ```
>
> Y ahí está el problema de verdad, que no es escribir dos líneas en vez de una: son **dos sitios que dicen lo mismo y no se comprueban entre sí**. El día que alguien cambie el atajo en el `bind` y se olvide del `accelerator`, el menú anunciará una tecla que no hace nada, y eso no lo detecta ninguna prueba. La solución es que las dos mitades salgan de un sitio único, y es lo que hace la función `atajo()` del ejemplo.

Pero cuidado con la conclusión, porque pasarse al otro extremo tiene su propio castigo.

> [!error] La mitad de los atajos ya están atados, y atarlos otra vez los duplica
>
> Acabamos de ver que `accelerator` no ata nada, así que lo natural es atar todos los atajos del menú a mano. Y para Copiar, Pegar, Cortar y Deshacer **eso está mal**, porque Tk ya los trae:
>
> ```consola
> >>> ventana.event_info("<<Paste>>")
> ('<Mod1-Key-v>', '<Key-F4>', '<Lock-Mod1-Key-V>', '<Key-XF86Paste>')
> >>> ventana.event_info("<<Copy>>")
> ('<Mod1-Key-c>', '<Key-F3>', '<Lock-Mod1-Key-C>', '<Key-XF86Copy>')
> >>> ventana.event_info("<<Undo>>")
> ('<Mod1-Key-z>', '<Lock-Mod1-Key-Z>', '<Key-Undo>')
> ```
>
> Tk mapea la tecla de cada sistema al evento virtual correspondiente, `Mod1` que es Command en macOS, y luego el `Text` y el `Entry` traen atado el evento virtual a la acción:
>
> ```consola
> >>> bool(ventana.bind_class("Text", "<<Paste>>"))
> True
> >>> ventana.bind_class("Text", "<<Paste>>")[:20]
> '    tk_textPaste %W '
> ```
>
> O sea que el camino ya está completo de fábrica: tecla → evento virtual → pegado. Si además escribes
>
> ```python
> ventana.bind_all("<Command-v>", lambda evento: texto.event_generate("<<Paste>>"))
> ```
>
> lo que consigues es un segundo camino que lleva al mismo sitio, y **Cmd+V pega dos veces**. Con Copiar no se nota, porque copiar dos veces lo mismo da igual; con Pegar y con Cortar sí, y el fallo es de los desconcertantes, porque el menú funciona bien con el ratón y solo se estropea con el teclado.
>
> La regla, entonces, tiene dos mitades:
>
> - **Los comandos propios de tu programa** (Nuevo, Abrir, Guardar) no los conoce nadie: `accelerator` y `bind` juntos, con la función que escribe los dos a la vez.
> - **Los comandos de edición estándar** ya están atados: se pone **solo** el texto del `accelerator`, y el `command` de la entrada manda el evento virtual al widget que tenga el foco, que es para cuando alguien usa el menú con el ratón:
>
> ```python
> def mandar(evento_virtual):
>         destino = ventana.focus_get() or texto
>     destino.event_generate(evento_virtual)
> ```
>
> El `focus_get()` importa: si el programa tiene varios campos, Pegar debe pegar en el que esté activo y no siempre en el mismo. Y devuelve `None` si la ventana no tiene el foco, de ahí el `or`.

## El sistema operativo, aquí sí importa

Los menús son el único punto del módulo donde escribir un programa que quede bien en los tres sistemas cuesta algo de trabajo. Lo primero es saber dónde estás:

```consola
>>> ventana.tk.call("tk", "windowingsystem")
'aqua'
```

Devuelve `aqua` en macOS, `win32` en Windows y `x11` en Linux. Y lo que cambia es sobre todo la tecla:

```consola
>>> ventana.bind_all("<Command-s>", guardar)
>>> sorted(b for b in ventana.bind_all() if "s" in b.lower())
['<Control-Key-s>', '<Mod1-Key-s>']
```

En macOS los atajos van con `Command`, que Tk registra como `Mod1`, y en Windows y Linux con `Control`. No es cosmético: en macOS, Control+S no es el atajo de guardar y usarlo delata un programa mal portado. De ahí el par de constantes del ejemplo, que se calculan una vez:

```python
SISTEMA = ventana.tk.call("tk", "windowingsystem")
MODIFICADOR, TECLA = ("Command", "Cmd") if SISTEMA == "aqua" else ("Control", "Ctrl")
```

Y en cuanto al texto del `accelerator`, Tk guarda literalmente lo que le pases, sin normalizar nada:

```consola
>>> accelerator="Command-S"  →  'Command-S'
>>> accelerator="Cmd+O"      →  'Cmd+O'
```

> [!consejo] El menú de la aplicación en macOS
>
> En macOS, el primer menú de la barra es el de la aplicación, el que lleva el nombre del programa y contiene «Acerca de», «Preferencias» y «Salir». Tkinter lo monta si le das a un menú el nombre reservado `apple`:
>
> ```python
> aplicacion = tk.Menu(barra, name="apple")
> aplicacion.add_command(label="Acerca de este programa", command=acerca_de)
> barra.add_cascade(menu=aplicacion)          # sin label: lo pone el sistema
> ```
>
> Ese `name="apple"` es el único caso del curso en que hace falta el argumento `name` de un widget. Y hay tres funciones de Tcl que macOS llama por su cuenta si existen, y que se definen así:
>
> ```python
> if SISTEMA == "aqua":
>         ventana.createcommand("tk::mac::ShowPreferences", abrir_preferencias)
>     ventana.createcommand("tk::mac::Quit", salir)
> ```
>
> Con eso, «Preferencias» del menú de la aplicación y Cmd+Q van a tus funciones en vez de cerrar el programa de golpe. Medido: ninguna de ellas está definida de antemano, así que si no las creas, macOS usa su comportamiento por omisión.
>
> ```consola
> >>> bool(ventana.tk.call("info", "commands", "tk::mac::ShowPreferences"))
> False
> >>> bool(ventana.tk.call("info", "commands", "::tk::mac::standardAboutPanel"))
> True
> ```
>
> La de «Acerca de» sí existe ya, y se puede llamar tal cual para tener el panel estándar del sistema sin escribir nada.
>
> Y la regla de reparto, que es la que hace que un programa parezca nativo: en macOS, «Acerca de», «Preferencias» y «Salir» van en el menú de la aplicación, **no** en el menú «Archivo»; en Windows y Linux, «Salir» va al final de «Archivo» y «Preferencias» normalmente en «Edición» o en «Herramientas». El ejemplo lo resuelve con un `if` sobre `SISTEMA` y es la única parte del programa que se bifurca.

## Activar y desactivar entradas

Aquí conecta con la lección 30, y por contraste. Un menú no tiene hijos que recorrer: sus entradas no son widgets, así que ni `winfo_children()` ni la función `cambiar_estado` sirven de nada. Las entradas se tocan una por una, por índice o por etiqueta:

```python
menu.entryconfigure("Pegar", state="disabled")
```

Y los estados son tres, con el error enumerándolos como es debido:

```consola
>>> menu.entryconfigure(0, state="readonly")
_tkinter.TclError: bad state "readonly": must be active, disabled, or normal
```

Una entrada desactivada no se puede lanzar, y además falla en silencio, como tantas cosas del módulo:

```consola
>>> menu.entryconfigure("Pegar", state="disabled")
>>> menu.invoke("Pegar")
>>> hecho
[]
```

Ni error ni aviso: simplemente no pasa nada. Que está bien, porque es lo que hace una persona al pulsarla.

Lo interesante es **cuándo** desactivarlas, y la respuesta no es la que se usa con un widget normal. «Pegar» debe estar gris si el portapapeles está vacío, y «Deshacer» si no hay nada que deshacer; mantener eso al día desde todos los sitios que cambian el estado del programa es imposible de hacer bien. Para eso está `postcommand`:

```python
edicion = tk.Menu(barra, tearoff=0, postcommand=lambda: repasar(edicion))
```

**Tk llama a `postcommand` justo antes de abrir el menú**, así que ahí se pregunta por el estado real y se pone cada entrada como toque. Es el mismo reparto de la lección 20 entre eventos y datos, aplicado a otra cosa: en vez de intentar enterarse de cada cambio, se calcula la respuesta en el único momento en que alguien la va a mirar.

## El índice que vale `None`

Y un último tropiezo, que aparece en la función más común de todas: la que rellena el submenú de «Abrir recientes».

> [!error] `index("end")` no es un número si el menú está vacío
>
> Los índices de un menú empiezan en cero, y `index("end")` devuelve el del **último**, no el número de entradas:
>
> ```consola
> >>> archivo.index("end")        # con cuatro entradas
> 3
> ```
>
> Hasta ahí, bien. El problema es el caso vacío:
>
> ```consola
> >>> vacio = tk.Menu(ventana, tearoff=0)
> >>> repr(vacio.index("end"))
> 'None'
> >>> range(vacio.index("end") + 1)
> TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'
> ```
>
> **`None`, no `-1` ni `0`.** Y ese caso no es raro ni rebuscado: es exactamente el estado en que queda un menú después de `delete(0, "end")`, que es la primera línea de cualquier función que reconstruya un submenú. Así que el bucle natural revienta justo en el camino más transitado.
>
> El patrón seguro, que conviene tener a mano:
>
> ```python
> def cuantas(menu):
>         """Número de entradas. index('end') vale None si el menú está vacío."""
>     fin = menu.index("end")
>     return 0 if fin is None else fin + 1
> ```
>
> También hay dos índices simbólicos que devuelven `None` en vez de un número, `"none"` y `"active"`, así que cualquier cosa que venga de `index()` merece desconfianza antes de sumarle uno.

Con eso, reconstruir un submenú es esto, y hay que fijarse en el caso vacío:

```python
def rellenar_recientes():
        recientes.delete(0, "end")
    if not RECIENTES:
                recientes.add_command(label="(ninguno)", state="disabled")
        return
    for ruta in RECIENTES:
                recientes.add_command(label=ruta, command=partial(abrir, ruta))
```

Un submenú vacío es un submenú que se abre y no muestra nada, y parece un fallo. La entrada `(ninguno)` desactivada cuesta dos líneas y explica la situación. Y el `partial` es el de la lección 14: sin él, todas las entradas abrirían el último fichero de la lista.

> [!nota] El padre del submenú, por una vez, da igual
>
> Tres lecciones seguidas avisando de que el hijo tiene que ser hijo directo del contenedor, y aquí el mismo descuido sale bien:
>
> ```consola
> >>> suelto = tk.Menu(ventana, tearoff=0)      # hijo de la ventana, no de la barra
> >>> barra.add_cascade(label="Ajeno", menu=suelto)
> >>> str(barra.entrycget("Ajeno", "menu"))
> '.!menu2'
> ```
>
> Aceptado y en su sitio. Un menú no se coloca dentro de otro como un widget dentro de un contenedor: solo se apunta a él, así que la jerarquía de padres no tiene que coincidir con la del menú.
>
> Aun así, la convención es crear cada menú como hijo del que lo contiene, y el ejemplo lo hace. La documentación de Tk lo pide, y hay un motivo práctico: así los menús se destruyen con su ventana y `winfo_children()` cuenta lo que uno espera.

## El ejemplo

Un editor con la barra completa: submenú de recientes que se reconstruye, casilla y grupo de opciones, entradas que se activan solas con `postcommand`, y los atajos saliendo de un sitio único.

```python title="menus.py"
"""La barra de menús de un editor, correcta en los tres sistemas."""

import tkinter as tk
from functools import partial
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"

TAMANOS = (11, 13, 16)
RECIENTES = ["notas.txt", "informe.md", "lista de la compra.txt"]


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def cuantas(menu):
        """Número de entradas. index('end') vale None si el menú está vacío."""
    fin = menu.index("end")
    return 0 if fin is None else fin + 1


def atajo(menu, etiqueta, letra, orden, **extras):
        """Una entrada propia del programa, con su atajo atado aquí mismo.

    `accelerator` solo dibuja un texto y no ata nada, así que el bind hay
    que hacerlo aparte. Si las dos mitades no salen del mismo sitio, el
    día que alguien cambie una el menú anunciará una tecla que no existe.
    """
    menu.add_command(label=etiqueta, command=orden,
                     accelerator=f"{TECLA}+{letra.upper()}", **extras)
    ventana.bind_all(f"<{MODIFICADOR}-{letra.lower()}>",
                     lambda evento: orden())


def estandar(menu, etiqueta, letra, evento_virtual):
        """Una entrada de edición, que Tk ya trae atada.

    Aquí NO se ata nada: event_info dice que la tecla ya lleva al evento
    virtual, y el Text ya tiene el evento virtual atado a la acción. Un
    bind de más haría que Cmd+V pegase dos veces.
    """
    menu.add_command(label=etiqueta, accelerator=f"{TECLA}+{letra.upper()}",
                     command=lambda: mandar(evento_virtual))


def mandar(evento_virtual):
        """Al widget con el foco, que es el que sabe copiar o pegar.

    Es para cuando se usa el menú con el ratón; con el teclado no pasa
    por aquí. focus_get() vale None si la ventana no tiene el foco.
    """
    destino = ventana.focus_get() or texto
    destino.event_generate(evento_virtual)


def crear_barra():
        """La barra no se coloca: es una opción de la ventana."""
    barra = tk.Menu(ventana)

    if SISTEMA == "aqua":
        # El menú de la aplicación: el name "apple" es reservado y es el
        # único sitio del curso donde hace falta el argumento `name`.
                aplicacion = tk.Menu(barra, name="apple")
        aplicacion.add_command(label="Acerca de este editor", command=acerca_de)
        barra.add_cascade(menu=aplicacion)
        ventana.createcommand("tk::mac::ShowPreferences", preferencias)

    barra.add_cascade(label="Archivo", menu=crear_archivo(barra), underline=0)
    barra.add_cascade(label="Edición", menu=crear_edicion(barra), underline=0)
    barra.add_cascade(label="Ver", menu=crear_ver(barra), underline=0)

    ventana.configure(menu=barra)
    return barra


def crear_archivo(barra):
        global recientes
    menu = tk.Menu(barra, tearoff=0)   # tearoff=0 siempre: si no, desplaza

    atajo(menu, "Nuevo", "n", nuevo)
    atajo(menu, "Abrir…", "o", abrir_dialogo)

    # El submenú, hijo del menú que lo contiene.
    recientes = tk.Menu(menu, tearoff=0)
    menu.add_cascade(label="Abrir recientes", menu=recientes)
    rellenar_recientes()

    menu.add_separator()               # esto, y no el widget Separator
    atajo(menu, "Guardar", "s", guardar)

    if SISTEMA != "aqua":
        # En macOS "Salir" y "Preferencias" van en el menú de la aplicación.
                menu.add_separator()
        menu.add_command(label="Preferencias…", command=preferencias)
        menu.add_command(label="Salir", command=ventana.destroy)
    return menu


def crear_edicion(barra):
        """postcommand: Tk lo llama justo antes de abrir el menú.

    Las cuatro entradas son estándar, así que ninguna ata su tecla.
    """
    menu = tk.Menu(barra, tearoff=0)
    menu.configure(postcommand=lambda: repasar_edicion(menu))

    estandar(menu, "Deshacer", "z", "<<Undo>>")
    menu.add_separator()
    estandar(menu, "Cortar", "x", "<<Cut>>")
    estandar(menu, "Copiar", "c", "<<Copy>>")
    estandar(menu, "Pegar", "v", "<<Paste>>")
    return menu


def crear_ver(barra):
        """Una casilla y un grupo de opciones, con sus variables de control."""
    menu = tk.Menu(barra, tearoff=0)
    menu.add_checkbutton(label="Ajustar las líneas", variable=ajustar,
                         command=aplicar_ajuste)
    menu.add_separator()
    for tamano in TAMANOS:
                menu.add_radiobutton(label=f"Letra de {tamano} puntos",
                             variable=cuerpo_letra, value=tamano,
                             command=aplicar_letra)
    return menu


def rellenar_recientes():
        """Reconstruir un submenú: borrar y volver a poner.

    El caso vacío necesita una entrada desactivada; un submenú que se abre
    y no muestra nada parece un fallo.
    """
    recientes.delete(0, "end")
    if not RECIENTES:
                recientes.add_command(label="(ninguno)", state="disabled")
        return
    for ruta in RECIENTES:
        # partial, lección 14: sin él todas abrirían el último de la lista.
                recientes.add_command(label=ruta, command=partial(abrir, ruta))


def repasar_edicion(menu):
        """Calcula el estado de las entradas en el único momento en que se miran."""
    hay_seleccion = bool(texto.tag_ranges("sel"))
    for etiqueta in ("Cortar", "Copiar"):
                menu.entryconfigure(etiqueta,
                            state="normal" if hay_seleccion else "disabled")
    try:
                hay_portapapeles = bool(ventana.clipboard_get())
    except tk.TclError:       # el portapapeles vacío lanza TclError
                hay_portapapeles = False
    menu.entryconfigure("Pegar",
                        state="normal" if hay_portapapeles else "disabled")
    menu.entryconfigure("Deshacer",
                        state="normal" if texto.edit_modified() else "disabled")


def nuevo():
        texto.delete("1.0", "end")
    texto.edit_modified(False)
    anunciar("Documento nuevo")


def abrir(ruta):
        texto.delete("1.0", "end")
    texto.insert("1.0", f"(contenido de {ruta})")
    texto.edit_modified(False)
    anunciar(f"Abierto: {ruta}")


def abrir_dialogo():
        """Los diálogos de ficheros son del bloque D; aquí solo se simula."""
    anunciar("Aquí iría el diálogo de abrir, bloque D")


def guardar():
        texto.edit_modified(False)
    anunciar(f"Guardado ({cuantas(recientes)} recientes en la lista)")


def aplicar_ajuste():
        texto.configure(wrap="word" if ajustar.get() else "none")
    anunciar(f"Ajuste de líneas: {'sí' if ajustar.get() else 'no'}")


def aplicar_letra():
        texto.configure(font=("Menlo", cuerpo_letra.get()))
    anunciar(f"Letra de {cuerpo_letra.get()} puntos")


def preferencias():
        anunciar("Aquí iría la ventana de preferencias, bloque D")


def acerca_de():
        """En macOS existe ya el panel del sistema y se puede llamar tal cual."""
    ventana.tk.call("tk::mac::standardAboutPanel")


def anunciar(mensaje):
        estado.set(mensaje)


ventana = tk.Tk()
ventana.title("Editor")
ventana.minsize(560, 420)

# Una vez, al principio: en macOS los atajos van con Command y no con Control.
SISTEMA = ventana.tk.call("tk", "windowingsystem")
MODIFICADOR, TECLA = (("Command", "Cmd") if SISTEMA == "aqua"
                      else ("Control", "Ctrl"))

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
ajustar = tk.BooleanVar(value=True)
cuerpo_letra = tk.IntVar(value=TAMANOS[1])
estado = tk.StringVar(value=f"Sistema: {SISTEMA}. Atajos con {TECLA}.")
recientes = None

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

texto = tk.Text(cuerpo, wrap="word", undo=True, font=("Menlo", TAMANOS[1]),
                borderwidth=1, relief="solid", highlightthickness=0)
barra_texto = ttk.Scrollbar(cuerpo, orient="vertical", command=texto.yview)
texto.configure(yscrollcommand=barra_texto.set)
barra_texto.pack(side="right", fill="y")
texto.pack(side="left", fill="both", expand=True)
texto.insert("1.0", "Abre el menú Edición con el portapapeles vacío y sin "
                    "nada seleccionado: verás Cortar, Copiar y Pegar en gris.")
texto.edit_modified(False)

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS).pack(
    side="bottom", anchor="w", pady=(AIRE, 0))

crear_barra()

centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> La barra de menús es el widget más raro del módulo: no se coloca con ningún gestor porque es **una opción de la ventana** (`ventana.configure(menu=barra)`, y `menu=""` la quita), no tiene versión temática, y en macOS se dibuja fuera de la ventana. Que sea solo `tk` no es una pérdida, porque Tk usa los menús nativos del sistema; por eso las veinte opciones de color y borde del widget sobran y solo se usan `tearoff`, `postcommand` y `title`. La estructura es barra → entrada `cascade` → menú → entradas, de cinco tipos (`command`, `separator`, `checkbutton`, `radiobutton`, `cascade`), y **el separador de un menú es una entrada, `add_separator()`, no el widget `Separator` de la lección 29**: es el único sitio donde una línea divisoria se pone sin pensar. El `tearoff` ya viene en `0` en Tk 9 sobre macOS, pero hay que escribirlo siempre porque **con `tearoff=1` la línea de puntos ocupa el índice 0 y desplaza todas las entradas**, y el valor de fábrica cambia entre sistemas y versiones. El hallazgo que más tiempo hace perder: **`accelerator` no ata ninguna tecla**, solo dibuja un texto, y acepta cualquier cosa porque no lo interpreta; el atajo se ata aparte con `bind_all`, y como son dos sitios que dicen lo mismo sin comprobarse, las dos mitades tienen que salir de una sola función. Pero **los atajos de edición ya vienen atados**: `event_info("<<Paste>>")` enseña que Tk mapea la tecla del sistema al evento virtual, y el `Text` y el `Entry` traen el evento virtual atado a la acción, así que atar `<Command-v>` otra vez hace que **Cmd+V pegue dos veces**, un fallo que no se nota con el ratón y sí con el teclado. De ahí las dos mitades de la regla: los comandos propios del programa llevan `accelerator` y `bind`, y los de edición llevan **solo** el texto del `accelerator` más un `command` que manda el evento virtual al widget que tenga el foco, con `focus_get()` para que pegue en el campo activo y no siempre en el mismo. En macOS los atajos van con `Command` (`Mod1` para Tk) y no con `Control`, se averigua con `tk.call("tk", "windowingsystem")`, el menú de la aplicación se monta con el nombre reservado `name="apple"`, «Acerca de», «Preferencias» y «Salir» van allí y no en «Archivo», y `tk::mac::ShowPreferences` y `tk::mac::Quit` son funciones que defines tú con `createcommand` (no existen de antemano; la de «Acerca de» sí). Las entradas no son widgets, así que la función `cambiar_estado` de la lección 30 no sirve: se tocan con `entryconfigure` por índice o etiqueta, sus estados son `active`, `disabled` y `normal`, y un `invoke` sobre una desactivada no hace nada y no avisa. El momento correcto para activarlas y desactivarlas es **`postcommand`**, que Tk llama justo antes de abrir el menú. Y el último tropiezo: **`index("end")` vale `None` en un menú vacío**, que es justo el estado en que lo deja `delete(0, "end")`, así que el bucle natural revienta con `TypeError` en el camino más transitado; de ahí la función `cuantas()` y la entrada `(ninguno)` desactivada para un submenú sin contenido.

> [!ejercicio] Practica
>
> Trabaja en un fichero `31-menus.py` salvo donde se indique otra cosa:
>
> 1. Monta una barra con un solo menú «Archivo» y tres entradas. Intenta colocarla con `pack` y lee el error; después hazlo bien con `configure(menu=...)`.
> 2. Quita la barra con `configure(menu="")` y vuelve a ponerla con un botón.
> 3. Crea el mismo menú dos veces, con `tearoff=0` y con `tearoff=1`, y compara lo que devuelve `index` de la primera entrada en cada caso.
> 4. Pon una entrada con `accelerator="Ctrl+G"` y **sin** `bind`. Comprueba que la tecla no hace nada. Después átala y comprueba que el texto del menú no ha cambiado por sí solo.
> 5. En `31-atajo.py`, escribe tú la función que añade una entrada y su atajo a la vez, y úsala para tres entradas. Cambia el modificador en un solo sitio y comprueba que cambian las seis cosas.
> 6. Averigua con `tk.call("tk", "windowingsystem")` en qué sistema estás y haz que el texto del `accelerator` sea `Cmd+` o `Ctrl+` según corresponda.
> 7. Añade un submenú «Recientes» que se rellene desde una lista, y prueba con la lista vacía. Comprueba qué devuelve `index("end")` y arregla el bucle.
> 8. Usa `partial` en las entradas de ese submenú y luego pruébalo con una `lambda` sin `partial`. Explica por qué todas abren el mismo fichero.
> 9. Mira lo que devuelve `ventana.event_info("<<Paste>>")` y `bool(ventana.bind_class("Text", "<<Paste>>"))`. Con eso a la vista, explica por qué no hay que atar `<Command-v>` a mano.
> 10. En `31-doble.py`, pon un `Text` con algo en el portapapeles y ata tú `<Control-v>` (o `<Command-v>`) a un `event_generate("<<Paste>>")`. Pulsa la tecla y cuenta cuántas veces se pega. Quita el `bind` y vuelve a probar.
> 11. Añade un menú «Edición» con «Pegar» y un `postcommand` que la desactive si el portapapeles está vacío. Copia algo desde otro programa y comprueba que cambia al abrir el menú.
> 12. Añade un `add_checkbutton` atado a una `BooleanVar` y un grupo de tres `add_radiobutton` con la misma variable. Comprueba que la marca del menú sigue a la variable aunque la cambies desde un botón de la ventana.
