---
titulo: "Diálogos de ficheros y de color"
resumen: "El askcolor que devuelve un par y hace cierto el if al cancelar, los dos valores distintos que significan «he cancelado», el fichero que se queda abierto, y la opción que impide sobrescribir sin querer."
minutos: 23
orden: 37
---

Los diálogos de fichero son los que más se usan y los que más código de alrededor necesitan, porque lo que devuelven no es lo que uno espera. La lección anterior tenía una función que devolvía la cadena `'no'` donde todos ven un booleano; esta tiene una que devuelve **dos cosas a la vez** y otra en la que «he cancelado» se escribe de tres maneras distintas según a cuál llames.

> [!objetivo] Qué vas a aprender
>
> Abrir, guardar y elegir carpeta sabiendo exactamente qué llega al cancelar en cada caso; filtrar por tipo de fichero con el formato que Tk acepta; evitar que el usuario sobrescriba sin darse cuenta y que tu programa deje ficheros abiertos; y usar el selector de color entendiendo por qué devuelve un par y por qué `if color:` no sirve para nada.

## Las siete funciones de fichero

```consola
>>> sorted(n for n in dir(filedialog) if n.startswith("ask"))
['askdirectory', 'askopenfile', 'askopenfilename', 'askopenfilenames',
 'askopenfiles', 'asksaveasfile', 'asksaveasfilename']
```

Se dividen en dos familias, y la diferencia es la que da nombre a la mitad de ellas:

- Las que acaban en **`name`** devuelven **una ruta de texto**. Son las que hay que usar.
- Las que no devuelven un **fichero ya abierto**, y tienen un problema que está en su sección.

```python
from tkinter import filedialog

ruta = filedialog.askopenfilename()      # una ruta, o ''
rutas = filedialog.askopenfilenames()    # una tupla de rutas, o ()
destino = filedialog.asksaveasfilename() # una ruta, o ''
carpeta = filedialog.askdirectory()      # una ruta, o ''
```

> [!error] «He cancelado» se escribe de tres maneras
>
> No hay un único valor de cancelación, y esto es lo que más rompe:
>
> | Función | Al elegir | Al cancelar |
> | --- | --- | --- |
> | `askopenfilename` | `'/Users/erwin/notas.txt'` | `''` |
> | `askopenfilenames` | `('/a.txt', '/b.txt')` | `()` |
> | `asksaveasfilename` | `'/Users/erwin/nuevo.txt'` | `''` |
> | `askdirectory` | `'/Users/erwin/Documentos'` | `''` |
> | `askopenfile` | un objeto de fichero | `None` |
> | `askcolor` | `((21, 101, 192), '#1565c0')` | `(None, None)` |
>
> Cadena vacía, tupla vacía, `None` y una tupla de dos `None`. Las cuatro primeras son falsas, así que `if not ruta: return` funciona; **la última no**:
>
> ```consola
> >>> bool((None, None))
> True
> ```
>
> Así que el `if` que sirve para los ficheros **está mal para el color**, y ese es el fallo de la sección de más abajo. La costumbre segura es comprobar siempre lo que de verdad necesitas:
>
> ```python
> ruta = filedialog.askopenfilename()
> if not ruta:
>         return                  # cancelado
>
> color = colorchooser.askcolor()[1]      # el [1] primero
> if color is None:
>         return                  # cancelado
> ```
>
> Y hay un detalle adicional con `askopenfilenames`: internamente, cuando Tk no devuelve objetos, Tkinter parte la cadena que le llega con `splitlist`, así que en algunas plataformas la respuesta cancelada puede llegar como cadena vacía en vez de tupla vacía. Las dos son falsas, o sea que `if not rutas:` está bien en los dos casos; lo que no se puede dar por hecho es que sea una tupla, así que **si vas a iterar, envuelve en `tuple()` o comprueba antes**.

## Las opciones

Tk las enumera, y cada diálogo acepta las suyas:

```consola
>>> # tk_getOpenFile
-command, -defaultextension, -filetypes, -initialdir, -initialfile,
-message, -multiple, -parent, -title, -typevariable
>>> # tk_getSaveFile: las mismas más
-confirmoverwrite
>>> # tk_chooseDirectory
-command, -initialdir, -message, -mustexist, -parent, -title
>>> # tk_chooseColor
-initialcolor, -parent, -title
```

Las que se usan de verdad son cuatro.

**`filetypes`** es una lista de pares, descripción y patrón:

```python
TIPOS = [("Texto", "*.txt"),
         ("Markdown", "*.md *.markdown"),      # varios, separados por espacios
         ("Todos los ficheros", "*.*")]

ruta = filedialog.askopenfilename(filetypes=TIPOS)
```

Si te equivocas en el formato, el error explica la sintaxis:

```consola
>>> filedialog.askopenfilename(filetypes="texto")
_tkinter.TclError: bad file type "texto", should be
"typeName {extension ?extensions ...?} ?{macType ?macTypes ...?}?"
```

El orden importa: **el primer par es el filtro activo al abrirse el diálogo**, así que «Todos los ficheros» va al final. Y conviene que esté, porque un filtro sin escapatoria es una forma habitual de que alguien no encuentre su fichero.

**`initialdir`** e **`initialfile`** dicen dónde empieza el diálogo. Y aquí hay un detalle bueno de Tkinter: **las clases recuerdan la última carpeta por su cuenta**. Se ve en el código de `SaveAs`:

```python
if result:
        path, file = os.path.split(result)
    self.options["initialdir"] = path
    self.options["initialfile"] = file
```

Eso solo funciona si reutilizas el mismo objeto `filedialog.SaveAs(...)`, no si llamas a la función suelta cada vez. Con las funciones, ese trabajo lo haces tú, y hay que hacerlo: un diálogo que siempre empieza en la carpeta de inicio obliga a navegar desde cero cada vez.

> [!consejo] `confirmoverwrite`, y la pregunta que no tienes que escribir
>
> `asksaveasfilename` tiene una opción que los otros no:
>
> ```python
> destino = filedialog.asksaveasfilename(confirmoverwrite=True)   # el de fábrica
> ```
>
> Con ella, **el sistema pregunta por ti** si el fichero ya existe, con su propio diálogo nativo y en el idioma del sistema. Y viene activada de fábrica, así que lo importante es lo contrario: **no la desactives**, y sobre todo no escribas tú esa confirmación, porque tendrías dos preguntas seguidas.
>
> `askdirectory` tiene la suya, `mustexist`, que impide elegir una carpeta que no existe. También conviene dejarla como está salvo que tu programa sepa crear la carpeta.
>
> Y `defaultextension` añade la extensión si la persona no la escribe. Aquí hay que tener cuidado, porque los diálogos nativos de macOS y de Linux ya la añaden según el filtro seleccionado, y combinar las dos cosas puede dar un `notas.txt.txt` o hacer que la opción se ignore. **Lo fiable es comprobarlo en código**, que además funciona igual en los tres sistemas:
>
> ```python
> if destino and not destino.lower().endswith(".txt"):
>         destino += ".txt"
> ```

## El fichero que se queda abierto

> [!error] `askopenfile` abre el fichero y nadie lo cierra
>
> Mira lo que hace por dentro:
>
> ```python
> def askopenfile(mode="r", **options):
>         filename = Open(**options).show()
>     if filename:
>                 return open(filename, mode)
>     return None
> ```
>
> Dos problemas. El primero es que devuelve un fichero abierto **que hay que cerrar tú**, y el código que lo usa casi nunca lo hace, porque no parece que haya nada que cerrar:
>
> ```python
> fichero = filedialog.askopenfile()
> contenido = fichero.read()       # y ahí se queda abierto
> ```
>
> El segundo es que al cancelar devuelve `None`, así que no se puede meter directamente en un `with`:
>
> ```python
> with filedialog.askopenfile() as fichero:     # AttributeError si se cancela
>         ...
> ```
>
> Y el tercero, que no se ve en el código: **el `open()` puede lanzar excepción** (permisos, un fichero que ha desaparecido entre que se eligió y se abrió) y lo hace desde dentro de la función del diálogo, donde no lo esperas.
>
> La forma correcta es no usarlas. Pide la ruta y abre tú, que es una línea más y resuelve las tres cosas:
>
> ```python
> ruta = filedialog.askopenfilename(filetypes=TIPOS, parent=ventana)
> if not ruta:
>         return
> try:
>         with open(ruta, encoding="utf-8") as fichero:
>                 contenido = fichero.read()
> except OSError as error:
>         informar_error("Abrir", "No se ha podido leer el fichero.", str(error))
>     return
> ```
>
> Ese `try` no es ceremonia: entre que se elige un fichero y se abre pueden pasar cosas, y el `encoding="utf-8"` explícito evita que el programa se comporte distinto según el sistema, que es el valor por omisión de Python.

## El selector de color

Es un módulo aparte y una sola función:

```consola
>>> from tkinter import colorchooser
>>> colorchooser.askcolor(color="#1565C0", title="Color del fondo")
((21, 101, 192), '#1565c0')
```

> [!error] `askcolor` devuelve un par, y al cancelar el par es cierto
>
> Los dos errores clásicos están en la misma línea:
>
> ```python
> color = colorchooser.askcolor()
> if color:                            # SIEMPRE cierto, incluso al cancelar
>         widget.configure(background=color)   # TclError: color es una tupla
> ```
>
> Lo que devuelve son **dos representaciones del mismo color**: una tupla `(rojo, verde, azul)` con enteros de 0 a 255, y la cadena `'#rrggbb'`. La primera sirve para calcular y la segunda es la única que entiende `configure`. Y al cancelar devuelve `(None, None)`, que es una tupla de dos elementos y por tanto cierta.
>
> Las dos correcciones van juntas:
>
> ```python
> _, color = colorchooser.askcolor(color=actual, parent=ventana)
> if color is None:
>         return
> widget.configure(background=color)
> ```
>
> Coger el `[1]` primero y comprobar `is None` después resuelve las dos cosas de una vez. Y si necesitas los componentes, el primer elemento del par ya los trae, sin tener que descomponer la cadena.

Para qué sirve la tupla de componentes: lo más habitual es **decidir si el texto encima va en blanco o en negro**, que es un problema real en cuanto dejas elegir un color de fondo.

```python
def texto_sobre(rgb):
        """Negro sobre claro y blanco sobre oscuro, con la fórmula de luminancia."""
    rojo, verde, azul = rgb
    luminancia = (0.299 * rojo + 0.587 * verde + 0.114 * azul) / 255
    return "black" if luminancia > 0.55 else "white"
```

Y si solo tienes la cadena, se convierte con lo que ya trae Tk:

```consola
>>> ventana.winfo_rgb("#1565C0")
(5397, 25957, 49344)
```

Ojo: **`winfo_rgb` devuelve componentes de 16 bits**, no de 8. Hay que dividir entre 256, que es exactamente lo que hace `askcolor` por dentro.

## Los diálogos de texto

Hay un cuarto módulo con tres funciones que piden un valor:

```python
from tkinter import simpledialog

nombre = simpledialog.askstring("Nueva nota", "Título:", parent=ventana)
cuantos = simpledialog.askinteger("Copias", "¿Cuántas?", minvalue=1, maxvalue=99)
factor = simpledialog.askfloat("Escala", "Factor:", initialvalue=1.0)
```

Devuelven `None` al cancelar, y `askinteger` y `askfloat` validan el rango con `minvalue` y `maxvalue`, volviendo a preguntar si el valor no cabe. Son útiles y tienen un problema: **no son nativas**, están dibujadas con Tkinter, así que se ven distintas del resto de los diálogos del sistema. Para pedir un dato suelto valen; para algo que se usa a menudo, es mejor un campo en la ventana o un `Toplevel` propio, que es la lección siguiente.

## El ejemplo

Un visor de texto que abre, guarda, guarda como y deja elegir los colores, con todas las comprobaciones en su sitio.

```python title="ficheros.py"
"""Diálogos de fichero y de color, con el valor de cancelar bien tratado."""

import pathlib
import tkinter as tk
from tkinter import colorchooser, filedialog, messagebox, ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"

# El primer par es el filtro activo al abrirse, y «todos» va al final para
# que nadie se quede sin poder elegir su fichero.
TIPOS = [("Texto", "*.txt"),
         ("Markdown", "*.md *.markdown"),
         ("Todos los ficheros", "*.*")]

EXTENSION = ".txt"


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def informar_error(titulo, mensaje, detalle=""):
        """Encapsulado: el parent en un solo sitio, y el programa se puede probar."""
    messagebox.showerror(title=titulo, message=mensaje, detail=detalle,
                         parent=ventana)


def preguntar_guardar():
        """Tres respuestas: True, False y None. El is None va primero."""
    return messagebox.askyesnocancel(
        title="Cambios sin guardar",
        message="¿Guardar los cambios antes de continuar?",
        detail="Si no los guardas se perderán.", parent=ventana)


def pedir_apertura():
        """askopenfilename, no askopenfile: la que abre el fichero lo deja abierto.

    initialdir recuerda la última carpeta: sin eso el diálogo empieza cada
    vez en la carpeta de inicio y hay que navegar desde cero.
    """
    return filedialog.askopenfilename(title="Abrir", filetypes=TIPOS,
                                      initialdir=ultima_carpeta.get(),
                                      parent=ventana)


def pedir_destino():
        """confirmoverwrite viene activado: el sistema pregunta por ti.

    Por eso aquí no hay ninguna confirmación escrita a mano.
    """
    return filedialog.asksaveasfilename(
        title="Guardar como", filetypes=TIPOS, defaultextension=EXTENSION,
        initialdir=ultima_carpeta.get(), initialfile=nombre_sugerido(),
        confirmoverwrite=True, parent=ventana)


def pedir_color(inicial):
        """El [1] primero y el is None después: las dos trampas de una vez."""
    _, color = colorchooser.askcolor(color=inicial, title="Elegir color",
                                     parent=ventana)
    return color


def nombre_sugerido():
        return pathlib.Path(ruta_actual.get()).name if ruta_actual.get() else "nota"


def asegurar_extension(destino):
        """En código, porque defaultextension se comporta distinto en cada sistema."""
    if destino and "." not in pathlib.Path(destino).name:
                return destino + EXTENSION
    return destino


def texto_sobre(rgb):
        """Blanco o negro según la luminancia: para eso sirve la tupla del par."""
    rojo, verde, azul = rgb
    luminancia = (0.299 * rojo + 0.587 * verde + 0.114 * azul) / 255
    return "black" if luminancia > 0.55 else "white"


def componentes(color):
        """winfo_rgb da 16 bits, así que hay que dividir entre 256."""
    return tuple(x // 256 for x in ventana.winfo_rgb(color))


def hay_cambios():
        return bool(texto.edit_modified())


def continuar_perdiendo_cambios():
        """El guardián que va antes de abrir, de cerrar o de empezar de nuevo."""
    if not hay_cambios():
                return True
    respuesta = preguntar_guardar()
    if respuesta is None:           # Cancelar, antes que nada
                return False
    if respuesta:
                return guardar()            # si guardar falla, no se continúa
    return True


def abrir():
        if not continuar_perdiendo_cambios():
                return
    ruta = pedir_apertura()
    if not ruta:                    # cadena vacía: se ha cancelado
                return
    try:
                contenido = pathlib.Path(ruta).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        # Entre elegir el fichero y leerlo pueden pasar cosas.
                informar_error("Abrir", "No se ha podido leer el fichero.",
                       f"{pathlib.Path(ruta).name}: {error}")
        return
    texto.delete("1.0", "end")
    texto.insert("1.0", contenido)
    texto.edit_reset()              # el deshacer empieza de cero
    texto.edit_modified(False)
    ruta_actual.set(ruta)
    ultima_carpeta.set(str(pathlib.Path(ruta).parent))
    marcar_estado(f"Abierto: {pathlib.Path(ruta).name}")


def guardar():
        if not ruta_actual.get():
                return guardar_como()
    return escribir(ruta_actual.get())


def guardar_como():
        destino = asegurar_extension(pedir_destino())
    if not destino:
                return False
    return escribir(destino)


def escribir(destino):
        try:
                pathlib.Path(destino).write_text(texto.get("1.0", "end-1c"),
                                         encoding="utf-8")
    except OSError as error:
                informar_error("Guardar", "No se ha podido guardar el fichero.",
                       f"{pathlib.Path(destino).name}: {error}")
        return False
    texto.edit_modified(False)
    ruta_actual.set(destino)
    ultima_carpeta.set(str(pathlib.Path(destino).parent))
    marcar_estado(f"Guardado: {pathlib.Path(destino).name}")
    return True


def elegir_carpeta():
        """askdirectory: mustexist viene activado y conviene dejarlo."""
    carpeta = filedialog.askdirectory(title="Carpeta de trabajo",
                                      initialdir=ultima_carpeta.get(),
                                      mustexist=True, parent=ventana)
    if not carpeta:
                return
    ultima_carpeta.set(carpeta)
    cuantos = len(list(pathlib.Path(carpeta).glob("*.txt")))
    marcar_estado(f"{pathlib.Path(carpeta).name}: {cuantos} ficheros .txt")


def cambiar_fondo():
        color = pedir_color(fondo.get())
    if color is None:               # y no `if not color`, que sería cierto
                return
    fondo.set(color)
    aplicar_colores()


def cambiar_letra():
        color = pedir_color(letra.get())
    if color is None:
                return
    letra.set(color)
    aplicar_colores()


def contraste_automatico():
        """La tupla del par sirve para esto: decidir el color de encima."""
    letra.set(texto_sobre(componentes(fondo.get())))
    aplicar_colores()


def aplicar_colores():
        texto.configure(background=fondo.get(), foreground=letra.get(),
                    insertbackground=letra.get())
    muestra.configure(background=fondo.get(), foreground=letra.get(),
                      text=f"  {fondo.get()} sobre {letra.get()}  ")


def marcar_estado(mensaje=None):
        if mensaje is not None:
                estado.set(mensaje)
    nombre = pathlib.Path(ruta_actual.get()).name if ruta_actual.get() \
        else "sin título"
    ventana.title(f"Visor — {nombre}{' •' if hay_cambios() else ''}")


def al_modificar(evento=None):
        marcar_estado()


def al_cerrar():
        if continuar_perdiendo_cambios():
                ventana.destroy()


ventana = tk.Tk()
ventana.minsize(620, 460)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
ruta_actual = tk.StringVar(value="")
ultima_carpeta = tk.StringVar(value=str(pathlib.Path.home()))
estado = tk.StringVar(value="Sin título")
fondo = tk.StringVar(value="#FFFFFF")
letra = tk.StringVar(value="#000000")

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

barra = ttk.Frame(cuerpo)
barra.pack(fill="x")
for etiqueta, orden in (("Abrir…", abrir), ("Guardar", guardar),
                        ("Guardar como…", guardar_como),
                        ("Carpeta…", elegir_carpeta)):
        ttk.Button(barra, text=etiqueta, command=orden,
               style="Toolbutton").pack(side="left", padx=(0, AIRE))

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

caja = ttk.Frame(cuerpo)
caja.pack(fill="both", expand=True)
texto = tk.Text(caja, wrap="word", undo=True, width=44, height=14,
                font=("Menlo", 12), borderwidth=1, relief="solid",
                highlightthickness=0)
vertical = ttk.Scrollbar(caja, orient="vertical", command=texto.yview)
texto.configure(yscrollcommand=vertical.set)      # las dos mitades
vertical.pack(side="right", fill="y")
texto.pack(side="left", fill="both", expand=True)

colores = ttk.Frame(cuerpo)
colores.pack(fill="x", pady=(MARGEN, 0))
ttk.Button(colores, text="Fondo…", command=cambiar_fondo).pack(side="left")
ttk.Button(colores, text="Letra…", command=cambiar_letra).pack(
    side="left", padx=AIRE)
ttk.Button(colores, text="Contraste automático",
           command=contraste_automatico).pack(side="left")
muestra = tk.Label(colores, borderwidth=1, relief="solid")
muestra.pack(side="right")

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS).pack(
    anchor="w", pady=(AIRE, 0))

texto.bind("<<Modified>>", al_modificar)
ventana.protocol("WM_DELETE_WINDOW", al_cerrar)

aplicar_colores()
marcar_estado()
centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Las funciones de fichero se dividen en las que acaban en **`name`**, que devuelven una ruta de texto y son las que hay que usar, y las que devuelven un **fichero ya abierto**, que no. Lo primero que hay que saber es que **«he cancelado» se escribe de tres maneras**: cadena vacía en `askopenfilename`, `asksaveasfilename` y `askdirectory`; tupla vacía en `askopenfilenames` (que en algunas plataformas puede llegar como cadena vacía, porque Tkinter parte la respuesta con `splitlist`, así que no se puede dar por hecho que sea una tupla); `None` en `askopenfile`; y **`(None, None)` en `askcolor`**, que es la excepción peligrosa, porque una tupla de dos elementos es cierta y el `if not ruta` que sirve para los ficheros no sirve para el color. De las opciones, `filetypes` es una lista de pares descripción-patrón (`[("Texto", "*.txt")]`, con varios patrones separados por espacios) y **el primer par es el filtro activo**, así que «todos los ficheros» va al final y conviene que esté; `initialdir` e `initialfile` deciden dónde empieza el diálogo, y ese trabajo hay que hacerlo (las clases lo recuerdan por su cuenta, pero solo si reutilizas el objeto, no llamando a la función suelta); **`confirmoverwrite` viene activado en `asksaveasfilename` y hace que el sistema pregunte por ti**, así que lo importante es no desactivarlo y no escribir tú esa confirmación; y `defaultextension` se comporta distinto en cada sistema porque los diálogos nativos ya añaden la extensión, así que lo fiable es comprobarla en código. **`askopenfile` y compañía tienen tres problemas**: devuelven un fichero abierto que casi nadie cierra, devuelven `None` al cancelar y por tanto no se pueden meter en un `with`, y el `open()` puede lanzar excepción desde dentro del diálogo; pide la ruta y abre tú, con `try` y `encoding="utf-8"` explícito. **`askcolor` devuelve un par**: la tupla `(r, g, b)` con enteros de 0 a 255 y la cadena `'#rrggbb'`, que es la única que entiende `configure`; los dos errores clásicos están en la misma línea (`if color:` es cierto al cancelar y `configure(background=color)` falla porque es una tupla) y se arreglan juntos cogiendo el `[1]` primero y comprobando `is None` después. La tupla de componentes sirve sobre todo para decidir si el texto encima va en blanco o en negro con la fórmula de luminancia; y si solo tienes la cadena, `winfo_rgb` la convierte, pero **devuelve 16 bits**, así que hay que dividir entre 256. Por último, `simpledialog` tiene `askstring`, `askinteger` y `askfloat`, que devuelven `None` al cancelar y validan el rango con `minvalue` y `maxvalue`, pero **no son nativas**: están dibujadas con Tkinter y se ven distintas del resto, así que para algo frecuente es mejor un `Toplevel` propio.

> [!ejercicio] Practica
>
> Trabaja en un fichero `37-ficheros.py` salvo donde se indique otra cosa:
>
> 1. Llama a `askopenfilename`, `askopenfilenames`, `asksaveasfilename` y `askdirectory`, y cancela las cuatro. Imprime el valor y su tipo.
> 2. En `37-color.py`, escribe `color = askcolor()` seguido de `if color: widget.configure(background=color)`. Cancela y explica los dos errores. Arréglalo.
> 3. Imprime el par completo que devuelve `askcolor` con un color elegido, y comprueba que el `[1]` es lo que acepta `configure`.
> 4. Escribe la función de luminancia y pruébala con blanco, negro, `#1565C0` y `#FFD54F`. Comprueba que el texto que elige se lee bien.
> 5. Compara `winfo_rgb("#1565C0")` con los componentes que da `askcolor` y explica el factor 256.
> 6. Monta un `filetypes` con tres entradas y comprueba cuál sale activa al abrirse. Cambia el orden y vuelve a mirarlo.
> 7. Provoca el error de un `filetypes` mal escrito y copia la sintaxis que sugiere Tk.
> 8. En `37-abierto.py`, usa `askopenfile` y lee el contenido sin cerrar el fichero. Después intenta meterlo en un `with` y cancela, y copia el error. Reescríbelo con `askopenfilename`.
> 9. Guarda un fichero con `asksaveasfilename` sobre uno que ya exista y comprueba que el sistema pregunta sin que tú hayas escrito nada.
> 10. Prueba `defaultextension=".txt"` escribiendo un nombre sin extensión y otro con una distinta. Anota qué hace tu sistema y compáralo con la comprobación en código.
> 11. Haz que `initialdir` recuerde la última carpeta usada. Comprueba la diferencia abriendo dos ficheros seguidos de la misma carpeta.
> 12. Sustituye un `simpledialog.askstring` del ejemplo por un campo en la propia ventana y compara qué se siente mejor.
