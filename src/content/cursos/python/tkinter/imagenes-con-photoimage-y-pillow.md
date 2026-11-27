---
titulo: "Imágenes con PhotoImage y Pillow"
resumen: "La imagen que desaparece sin dar ningún error, los formatos que Tk sí y no entiende (con una sorpresa en Tk 9), el escalado que solo admite enteros, y la trampa que Pillow añade encima."
minutos: 26
orden: 44
---

Poner una imagen en una ventana son dos líneas. El problema es que una de esas dos líneas tiene la trampa más conocida de Tkinter, y la forma en que falla es la peor posible: **no hay error, no hay excepción, no hay aviso en la consola. Solo un hueco donde iba la imagen.**

Esta lección empieza por ahí, porque hasta que eso no se entiende no se puede trabajar con imágenes. Después vienen los formatos, donde hay una sorpresa agradable si tu Tk es el 9, y el escalado, donde Tk se queda muy corto y aparece la razón de instalar Pillow. Y Pillow, ya que estamos, tiene la misma trampa con un giro más.

> [!objetivo] Qué vas a aprender
>
> Entender por qué una imagen desaparece y qué referencia exactamente hay que guardar, en los tres casos que hay (la imagen cargada, la imagen intermedia de un escalado y la de Pillow); saber qué formatos entiende `tk.PhotoImage` sin instalar nada y por qué el JPEG no está; escalar con lo que trae Tk y saber cuándo eso no basta; y usar Pillow para lo demás sin que el programa deje de funcionar si no está instalado.

## La imagen que desaparece

El código parece impecable:

```python
def crear_mal(padre):
        """La imagen es local: al volver, nadie la referencia."""
    imagen = tk.PhotoImage(file="foto.png")
    return ttk.Label(padre, image=imagen)
```

Y el resultado es una etiqueta vacía. Lo medido:

```consola
>>> etiqueta = crear_mal(ventana)
>>> etiqueta.cget("image")
('pyimage14',)
>>> gc.collect()
>>> etiqueta.cget("image")
('pyimage14',)
>>> ventana.tk.call("image", "width", "pyimage14")
TclError: image "pyimage14" does not exist
>>> etiqueta.winfo_exists()
True
```

Fíjate en lo cruel del detalle: **la etiqueta sigue diciendo que tiene la imagen `pyimage14`**. Preguntarle al widget no delata nada. Solo preguntando al intérprete de Tcl se descubre que la imagen ya no está.

La razón es la misma que la de las variables de control de la lección 33, y es el mismo hallazgo con otra cara: **`tk.PhotoImage` no guarda los píxeles, guarda el nombre de una imagen que vive en el intérprete de Tcl.** Y el destructor del objeto Python borra la imagen de Tcl. Cuando la función acaba, `imagen` es basura, Python la recoge, el destructor se ejecuta, y en Tcl desaparece la imagen. El widget conserva un nombre que ya no apunta a nada, y Tk dibuja lo que puede dibujar: nada.

> [!aviso] La regla y sus tres caras
>
> **Una imagen tiene que estar referenciada desde Python mientras el widget la use.** En la práctica, se guarda como atributo del widget o de la aplicación:
>
> ```python
> etiqueta = ttk.Label(padre, image=imagen)
> etiqueta.imagen = imagen          # la referencia vive con el widget
> ```
>
> Y hay tres caras de la misma trampa que muerden por separado.
>
> **Primera: la imagen intermedia de un escalado es otro objeto.**
>
> ```consola
> >>> original = tk.PhotoImage(file="foto.png")
> >>> etiqueta = ttk.Label(padre, image=original.subsample(2))
> >>> # guardando 'original' no basta: lo que se muestra es la reducida
> ```
>
> `subsample()` devuelve **una imagen nueva**, y es esa la que hay que guardar. Guardar la original no la protege.
>
> **Segunda: guardar el nombre no sirve de nada.**
>
> ```python
> etiqueta.imagen = etiqueta.cget("image")   # NO: es una cadena, no el objeto
> ```
>
> Medido: la imagen desaparece igual. `cget("image")` devuelve el nombre en Tcl, y una cadena no mantiene vivo nada.
>
> **Tercera, la de Pillow**, que está más abajo: hay que guardar la `ImageTk.PhotoImage` y no la `Image`.

Para ver qué hay realmente vivo, el intérprete tiene la lista:

```consola
>>> len(ventana.tk.call("image", "names"))
22
```

Es el mejor sitio para mirar cuando una imagen no aparece y no entiendes por qué.

## Qué formatos entiende Tk

Aquí depende de la versión, y conviene comprobarlo en vez de suponerlo:

```consola
>>> ventana.tk.eval("info patchlevel")
'9.0.4'
```

Con **Tk 8.6**, que es lo que viene con muchas instalaciones de Python, `tk.PhotoImage` lee **GIF, PNG, PPM/PGM**. Con **Tk 9** se añade una que sorprende:

```consola
>>> tk.PhotoImage(file="dibujo.svg").width()
80
>>> tk.PhotoImage(file="dibujo.svg", format="svg -scale 2").width()
160
```

**SVG, y con escalado**, sin instalar nada. Para iconos de barra de herramientas eso es una noticia excelente, porque un icono en SVG se ve nítido a cualquier tamaño y en cualquier pantalla, que es justo el problema de los iconos en PNG.

Lo que **no** está en ninguna versión es el JPEG:

```consola
>>> tk.PhotoImage(file="foto.jpg")
TclError: couldn't recognize data in image file "foto.jpg"
```

Y ese es el motivo principal de instalar Pillow: las fotos del mundo real son JPEG.

Los dos errores al cargar son distintos y conviene distinguirlos, porque uno es culpa del usuario y el otro casi siempre del programa:

```consola
>>> tk.PhotoImage(file="roto.png")
TclError: couldn't recognize data in image file "roto.png"
>>> tk.PhotoImage(file="nada.png")
TclError: couldn't open "nada.png": no such file or directory
```

Los dos son `TclError`, así que hay que mirar el texto o, mejor, comprobar antes con `pathlib` que el fichero existe y dejar el `except` para el contenido.

### Escribir imágenes

`write()` guarda, y aquí hay un detalle que muerde:

```consola
>>> imagen.write("a.png", format="png")       # ok
>>> imagen.write("a.ppm", format="ppm")       # ok
>>> imagen.write("a.gif", format="gif")
TclError: too many colors
>>> imagen.write("a.jpg", format="jpeg")
TclError: image file format "jpeg" is unknown
```

El GIF solo admite 256 colores, así que cualquier degradado o foto no cabe. Y lo importante:

```consola
>>> pathlib.Path("a.gif").exists()
True
>>> pathlib.Path("a.gif").stat().st_size
6
```

**La escritura fallida deja el fichero creado y roto.** Seis bytes de cabecera y nada más. Si tu programa guarda imágenes, un `except TclError` que solo avise no basta: hay que borrar el fichero a medias, o usar el `os.replace` sobre un temporal de la lección 43, que aquí sirve igual.

## Escalar con lo que trae Tk

Hay dos métodos y los dos solo admiten enteros:

```consola
>>> base.width(), base.height()
(64, 48)
>>> base.subsample(2).width()
32
>>> base.zoom(3).width()
192
```

`subsample(n)` se queda con uno de cada *n* píxeles y `zoom(n)` repite cada píxel *n* veces. Rápidos, sin dependencias, y con tres problemas.

**Uno: redondean hacia arriba.** `subsample(3)` sobre 64 da 22, no 21, porque es el techo de la división.

**Dos: los valores raros no avisan.**

```consola
>>> base.subsample(1.5)
TclError: expected integer but got "1.5"
>>> base.subsample(0).width()
0
>>> base.subsample(-1).width()
64
```

`1.5` falla con un error claro, que está bien. Pero **`0` devuelve una imagen de 0×0 sin protestar** y `-1` devuelve la original tal cual. Si el factor sale de un cálculo, un cero accidental no da ningún error: da una imagen invisible, que es otra vez el fallo silencioso de esta lección.

**Tres, y es el que decide si necesitas Pillow: no se puede llegar a un tamaño concreto.** Desde 64×48, con enteros, se llega a 32×24, a 21×16, a 128×96… pero no a 100×75. Y «que la miniatura mida 100 píxeles de ancho» es exactamente lo que se pide en la vida real.

Hay una forma de acercarse, combinando los dos:

```consola
>>> escalado = tk.PhotoImage()
>>> escalado.copy_replace(base, zoom=2, subsample=3)
>>> escalado.width(), escalado.height()
(44, 32)
```

Y el resultado enseña cómo funciona por dentro: **`subsample` se aplica antes que `zoom`**, así que de 64 sale techo(64/3) = 22 y luego 22×2 = 44, no los 42 que daría la fracción exacta. Los tamaños alcanzables son pocos y la calidad del reescalado es mala (es tirar píxeles, sin promediar). Sirve para un icono, no para una foto.

`copy_replace` es además la forma moderna de recortar:

```consola
>>> destino = tk.PhotoImage(width=32, height=24)
>>> destino.copy_replace(base, from_coords=(0, 0, 32, 24))
```

Y una advertencia sobre otro método que parece lo que no es:

```consola
>>> copia.blank()
>>> copia.width(), copia.height()
(64, 48)
```

**`blank()` no borra la imagen**: la deja del mismo tamaño y completamente transparente. Para quitar una imagen de un widget se pone `image=""`.

## Dónde se puede poner una imagen

En más sitios de los que uno espera, y en todos con la misma regla de la referencia:

```consola
>>> ttk.Label(ventana, image=base)              # y Button, Checkbutton, Radiobutton
>>> lienzo.create_image(10, 10, image=base, anchor="nw")
>>> texto.image_create("1.0", image=base)
>>> menu.add_command(label="Con icono", image=base, compound="left")
>>> arbol.insert("", "end", text="fila", image=base)
>>> ventana.iconphoto(True, base)               # el icono de la ventana
```

El `compound` es el que decide cómo conviven imagen y texto, y es el que hace las barras de herramientas de la lección 32:

```consola
>>> for valor in ("top", "bottom", "left", "right", "center", "none", "image", "text"):
...     etiqueta.configure(compound=valor)      # los ocho valen
>>> etiqueta.configure(compound="mal")
TclError: bad compound "mal": must be none, text, image, center, top, bottom
```

`compound="image"` muestra solo la imagen y `compound="text"` solo el texto, lo cual es cómodo: se pueden configurar las dos cosas una vez y cambiar de vista con una sola opción, que es cómo se hace un botón de «mostrar iconos y texto» en las preferencias.

Y el `iconphoto` de la ventana merece un recordatorio: **también hay que mantener viva esa imagen.** Un icono de ventana que se pone en el `__init__` con una variable local desaparece por el mismo motivo que todo lo demás.

## Pillow, para lo que Tk no llega

Pillow es la biblioteca de imágenes de Python y no es de la biblioteca estándar, así que hay que instalarla:

```bash
python3 -m pip install pillow
```

Se importa como `PIL`, por razones históricas (era la *Python Imaging Library*), y lo que hace falta son dos cosas: `Image` para trabajar con la imagen y `ImageTk` para convertirla en algo que Tk pueda dibujar.

```python
from PIL import Image, ImageTk

original = Image.open("foto.jpg")          # Tk no sabe leer esto
original.thumbnail((200, 200))             # cualquier tamaño, no solo enteros
lista = ImageTk.PhotoImage(original)
etiqueta.configure(image=lista)
etiqueta.imagen = lista                    # la referencia, otra vez
```

Lo que aporta, medido:

**Formatos.** 42 registrados, entre ellos JPEG, WEBP, TIFF, BMP e ICO.

**Escalado a cualquier tamaño**, con `resize((ancho, alto))`, y sobre todo con `thumbnail`, que es el que se quiere casi siempre porque **respeta la proporción**:

```consola
>>> img.size
(120, 90)
>>> copia = img.copy(); copia.thumbnail((100, 100)); copia.size
(100, 75)
```

Dos cosas de `thumbnail` que sorprenden: **modifica la imagen en el sitio** y no devuelve nada (de ahí el `copy()` si quieres conservar la original), y **nunca agranda**:

```consola
>>> chica = Image.new("RGB", (30, 20))
>>> chica.thumbnail((200, 200)); chica.size
(30, 20)
```

Eso último es una decisión sensata, no un fallo: agrandar una imagen pequeña se ve mal. Pero si esperabas que rellenara la caja, no lo hará.

**Filtros de reescalado**, que es lo que Tk no tiene:

```python
img.resize((40, 30), Image.Resampling.LANCZOS)
```

`LANCZOS` para reducir fotos (promedia, así que no aparecen esos dientes de sierra del `subsample`), y `NEAREST` cuando quieres el efecto contrario, que es conservar los píxeles cuadrados de un dibujo de píxel art.

**Rotar**, con un detalle útil:

```consola
>>> img.rotate(90, expand=True).size
(90, 120)
>>> img.transpose(Image.Transpose.ROTATE_90).size
(90, 120)
```

Dan el mismo tamaño, pero `rotate` interpola (calcula píxeles nuevos) y `transpose` solo reordena. **Para giros de 90, 180 y 270 grados usa `transpose`**: es más rápido y no pierde nada.

Y un detalle de rendimiento que importa al abrir ficheros grandes: **`Image.open` es perezoso.** Lee la cabecera, así que `size` ya se sabe, pero no descomprime los píxeles hasta que hace falta. Por eso abrir un fichero enorme es instantáneo y el `resize` es lo que tarda, que es justo el caso de la lección 42: si vas a cargar una carpeta de fotos, el hilo va en el `resize`, no en el `open`.

> [!error] La trampa de Pillow: guardar la `Image` no sirve
>
> Esta es la variante que hace perder una tarde incluso a quien ya conoce la trampa de `PhotoImage`:
>
> ```python
> def mal(padre):
>         original = Image.open("foto.jpg")
>     lista = ImageTk.PhotoImage(original)
>     etiqueta = ttk.Label(padre, image=lista)
>     etiqueta.original = original       # se guarda... la equivocada
>     return etiqueta
> ```
>
> Medido: la imagen desaparece igual. **La que hay que guardar es la `ImageTk.PhotoImage`**, porque es la que tiene el nombre en Tcl y la que borra el intérprete al recogerse. La `Image` de Pillow es un objeto de Python que a Tk no le consta.
>
> Y hay un detalle relacionado que conviene saber:
>
> ```consola
> >>> isinstance(lista, tk.PhotoImage)
> False
> >>> lista.subsample(2)
> AttributeError: 'PhotoImage' object has no attribute 'subsample'
> ```
>
> `ImageTk.PhotoImage` **no hereda de `tk.PhotoImage`**. Vale en cualquier sitio donde se acepte `image=`, y tiene `width()` y `height()`, pero no tiene los métodos de Tk. Es lógico: con Pillow, el escalado se hace antes de convertir.

Los errores de Pillow son excepciones de Python normales, lo cual es una mejora sobre los `TclError`:

```consola
>>> Image.open("falso.jpg")
UnidentifiedImageError: cannot identify image file 'falso.jpg'
>>> Image.open("nada.jpg")
FileNotFoundError: [Errno 2] No such file or directory: 'nada.jpg'
```

`UnidentifiedImageError` hereda de `OSError`, así que un `except OSError` cubre las dos.

## Si Pillow no está

Este módulo no ha instalado nada de fuera hasta ahora, y una imagen no debería ser la razón de que un programa no arranque. Así que el ejemplo hace lo que conviene hacer siempre: **importa Pillow si está, y si no, sigue con lo que trae Tk**, avisando de lo que no podrá hacer.

```python
try:
        from PIL import Image, ImageTk
    HAY_PILLOW = True
except ImportError:
        HAY_PILLOW = False
```

Ese patrón es el estándar para una dependencia opcional, y tiene una ventaja que se nota al empaquetar (lección 45): el programa funciona en la máquina de alguien que no ha instalado nada.

## El ejemplo

Un visor de imágenes con miniaturas que usa Pillow si está y `subsample` si no, con las referencias bien guardadas y los dos errores de carga distinguidos.

```python title="visor_imagenes.py"
"""Miniaturas con Pillow si está, y con lo de Tk si no."""

import math
import pathlib
import tkinter as tk
from tkinter import filedialog, ttk

try:
        from PIL import Image, ImageTk, UnidentifiedImageError
    HAY_PILLOW = True
except ImportError:
        HAY_PILLOW = False

MARGEN = 12
AIRE = 6
GRIS = "#8E8E93"
ROSA = "#C2185B"

LADO_MINIATURA = 96
COLUMNAS = 4

# Lo que lee tk.PhotoImage sin ayuda. El SVG solo en Tk 9, y el JPEG nunca.
DE_TK = {".png", ".gif", ".ppm", ".pgm", ".svg"}
DE_PILLOW = {".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff", ".ico"}


class Miniatura(ttk.Frame):
        """Una imagen escalada con su nombre debajo.

    Guarda la imagen como atributo: sin esa referencia la imagen se recoge y
    queda un hueco, sin ningún error.
    """

    def __init__(self, padre, ruta, al_elegir, **opciones):
                super().__init__(padre, **opciones)
        self.ruta = ruta
        self.imagen = None            # la referencia que lo mantiene vivo
        self.problema = None

        self.boton = ttk.Button(self, text=ruta.name, compound="top",
                                width=14, command=lambda: al_elegir(ruta))
        self.boton.pack()
        self.cargar()

    def cargar(self):
                try:
                        self.imagen = miniatura(self.ruta, LADO_MINIATURA)
        except (OSError, tk.TclError) as error:
                        self.problema = error
            self.boton.configure(text=f"{self.ruta.name}\n(no se puede leer)",
                                 state="disabled")
            return
        # Solo aquí se le da la imagen al widget, y la referencia ya está puesta.
        self.boton.configure(image=self.imagen)


def miniatura(ruta, lado):
        """Devuelve una imagen escalada lista para un widget.

    Con Pillow cabe exactamente en el cuadrado; sin Pillow solo se puede
    dividir por enteros, así que la miniatura sale más pequeña de la cuenta.
    """
    if HAY_PILLOW:
                original = Image.open(ruta)
        original.thumbnail((lado, lado), Image.Resampling.LANCZOS)
        # Hay que devolver la ImageTk, no la Image: la Image no le consta a Tk.
        return ImageTk.PhotoImage(original)
    imagen = tk.PhotoImage(file=str(ruta))
    factor = max(1, math.ceil(max(imagen.width(), imagen.height()) / lado))
    return imagen.subsample(factor) if factor > 1 else imagen


class Aplicacion(tk.Tk):

        def __init__(self):
                super().__init__()
        self.title("Visor de imágenes")
        self.minsize(560, 420)

        self.grande = None            # la imagen del panel derecho
        self.miniaturas = []          # y las de la rejilla
        self.estado = tk.StringVar()

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        barra = ttk.Frame(cuerpo)
        barra.pack(fill="x")
        ttk.Button(barra, text="Abrir carpeta…",
                   command=self.elegir_carpeta).pack(side="left")
        ttk.Label(barra, text=self.que_se_puede(), foreground=GRIS).pack(
            side="left", padx=AIRE)

        paneles = ttk.Panedwindow(cuerpo, orient="horizontal")
        paneles.pack(fill="both", expand=True, pady=(MARGEN, AIRE))
        izquierda = ttk.Labelframe(paneles, text="Miniaturas", padding=AIRE)
        self.rejilla = ttk.Frame(izquierda)
        self.rejilla.pack(fill="both", expand=True)
        derecha = ttk.Labelframe(paneles, text="Vista", padding=AIRE)
        self.vista = ttk.Label(derecha, anchor="center")
        self.vista.pack(fill="both", expand=True)
        paneles.add(izquierda, weight=0)
        paneles.add(derecha, weight=1)

        self.pie = ttk.Label(cuerpo, textvariable=self.estado)
        self.pie.pack(anchor="w")

        self.centrar()

    def que_se_puede(self):
                version = self.tk.eval("info patchlevel")
        if HAY_PILLOW:
                        return f"Tk {version} con Pillow: cualquier formato y cualquier tamaño"
        return (f"Tk {version} sin Pillow: {' '.join(sorted(DE_TK))}"
                " y escalado por enteros")

    def extensiones_que_valen(self):
                return DE_TK | (DE_PILLOW if HAY_PILLOW else set())

    def elegir_carpeta(self):
                carpeta = filedialog.askdirectory(parent=self, title="Carpeta de imágenes")
        if not carpeta:               # cancelar devuelve cadena vacía
                        return
        self.mostrar_carpeta(pathlib.Path(carpeta))

    def mostrar_carpeta(self, carpeta):
                for pieza in self.miniaturas:
                        pieza.destroy()           # y con ellas se van sus imágenes
        self.miniaturas.clear()

        validas = self.extensiones_que_valen()
        rutas = sorted(ruta for ruta in carpeta.iterdir()
                       if ruta.is_file() and ruta.suffix.lower() in validas)
        if not rutas:
                        self.estado.set(f"No hay imágenes legibles en {carpeta.name}")
            self.pie.configure(foreground=GRIS)
            return

        for numero, ruta in enumerate(rutas[:24]):
                        pieza = Miniatura(self.rejilla, ruta, self.mostrar_grande,
                              padding=AIRE // 2)
            pieza.grid(row=numero // COLUMNAS, column=numero % COLUMNAS)
            self.miniaturas.append(pieza)

        fallos = [p.ruta.name for p in self.miniaturas if p.problema]
        if fallos:
                        self.estado.set(f"{len(rutas)} imágenes, {len(fallos)} ilegibles: "
                            f"{', '.join(fallos[:3])}")
            self.pie.configure(foreground=ROSA)
        else:
                        self.estado.set(f"{len(rutas)} imágenes en {carpeta.name}")
            self.pie.configure(foreground=GRIS)

    def mostrar_grande(self, ruta):
                """El panel derecho, a un tamaño que quepa."""
        lado = max(200, min(self.vista.winfo_width(), self.vista.winfo_height()))
        try:
                        self.grande = miniatura(ruta, lado)
        except (OSError, tk.TclError) as error:
                        self.estado.set(f"No se ha podido abrir {ruta.name}: {error}")
            self.pie.configure(foreground=ROSA)
            return
        self.vista.configure(image=self.grande)
        self.estado.set(f"{ruta.name} — {self.grande.width()}×{self.grande.height()}"
                        f" px mostrados")
        self.pie.configure(foreground=GRIS)

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


if __name__ == "__main__":
        Aplicacion().mainloop()
```

> [!resumen] En resumen
>
> La trampa de las imágenes en Tkinter es la misma que la de las variables de control, con otra cara: **`tk.PhotoImage` no guarda los píxeles, guarda el nombre de una imagen que vive en Tcl**, y el destructor del objeto Python la borra de ahí. Si nadie la referencia, se recoge y **no hay error ninguno**: el widget sigue diciendo que tiene la imagen `pyimage14` y solo preguntando al intérprete (`tk.call("image", "width", ...)`) se descubre que ya no existe. La regla es que la imagen esté referenciada mientras el widget la use, normalmente como atributo del widget, y tiene tres caras que muerden por separado: **la imagen intermedia de un `subsample()` es otro objeto** y es esa la que hay que guardar; **guardar `cget("image")` no sirve**, porque es una cadena; y con Pillow hay que guardar la `ImageTk.PhotoImage` y no la `Image`. Sobre **formatos**, Tk 8.6 lee GIF, PNG y PPM/PGM, y **Tk 9 añade SVG, con `format="svg -scale 2"`**, que para iconos es excelente; **el JPEG no está en ninguna versión**, y ese es el motivo principal de instalar Pillow. Los dos errores de carga son `TclError` pero dicen cosas distintas (`couldn't recognize data` frente a `couldn't open ... no such file`), así que conviene comprobar la existencia con `pathlib` aparte. Al **escribir**, el GIF falla con `too many colors` en cualquier degradado, el JPEG no se puede escribir, y **una escritura fallida deja el fichero creado y roto** (seis bytes), así que hace falta borrarlo o usar el `os.replace` de la lección 43. Para **escalar**, `subsample(n)` y `zoom(n)` **solo admiten enteros**, redondean hacia arriba (`subsample(3)` de 64 da 22), y los valores raros no siempre avisan: `1.5` da `TclError` pero **`0` devuelve una imagen de 0×0 sin protestar** y `-1` devuelve la original. Lo decisivo es que **no se puede llegar a un tamaño concreto**: de 64×48 no hay forma de sacar 100×75, y `copy_replace(zoom=2, subsample=3)` da 44 y no 42 porque **`subsample` se aplica antes que `zoom`**. Y `blank()` **no borra la imagen**: la deja del mismo tamaño y transparente; para quitarla del widget se pone `image=""`. Una imagen se puede poner en `Label`, `Button`, `Checkbutton`, `Canvas` (`create_image`), `Text` (`image_create`), `Menu`, `Treeview` y en el icono de la ventana (`iconphoto`, que también hay que mantener vivo), y el `compound` decide cómo conviven con el texto, con `"image"` y `"text"` como forma cómoda de cambiar de vista sin reconfigurar nada. **Pillow** aporta 42 formatos, `resize` a cualquier tamaño y `thumbnail`, que respeta la proporción pero **modifica en el sitio** (de ahí el `copy()`) y **nunca agranda**; filtros de reescalado (`LANCZOS` para reducir fotos, `NEAREST` para píxel art); y `transpose` para giros de 90 grados, que no interpola, frente a `rotate`, que sí. `Image.open` es **perezoso**: sabe el `size` sin descomprimir, así que lo que tarda es el `resize`, y es ahí donde va el hilo de la lección 42. `ImageTk.PhotoImage` **no hereda de `tk.PhotoImage`**, así que no tiene `subsample`, y sus errores son excepciones normales de Python (`UnidentifiedImageError`, que hereda de `OSError`). Y como Pillow no es de la biblioteca estándar, se importa dentro de un `try`/`except ImportError` con una bandera, para que el programa siga funcionando sin ella.

> [!ejercicio] Practica
>
> 1. En `44-imagen.py`, escribe la función que crea la imagen en una variable local y devuelve la etiqueta. Comprueba que no se ve nada y que no hay ningún error.
> 2. Imprime `etiqueta.cget("image")` antes y después de un `gc.collect()`, y después pregunta a Tcl con `tk.call("image", "width", nombre)`. Copia los tres resultados.
> 3. Arregla el ejercicio 1 guardando la imagen como atributo del widget.
> 4. Prueba a «arreglarlo» guardando `etiqueta.cget("image")` y explica por qué no funciona.
> 5. Escala con `subsample(2)`, pásale la reducida a la etiqueta y guarda solo la original. Comprueba qué pasa.
> 6. Imprime `ventana.tk.eval("info patchlevel")`. Si es 9 o más, crea un SVG a mano y cárgalo con `format="svg -scale 2"`.
> 7. Intenta cargar un `.jpg` con `tk.PhotoImage` y copia el error. Después intenta cargar un fichero que no existe y compara los dos mensajes.
> 8. Crea una imagen con un degradado con `put()` e intenta escribirla en GIF. Copia el error y después comprueba el tamaño del fichero que ha quedado.
> 9. Prueba `subsample` con 1.5, con 0 y con -1. Anota qué hace cada uno.
> 10. Con una imagen de 64×48, intenta llegar a 100×75 con `subsample` y `zoom`. Explica por qué no se puede.
> 11. Usa `copy_replace(zoom=2, subsample=3)` y comprueba si el resultado es 42 o 44. Deduce en qué orden se aplican.
> 12. Pon la misma imagen en un `Button` con los ocho valores de `compound` y anota qué cambia.
> 13. Si tienes Pillow, escala un JPEG a exactamente 100 píxeles de ancho con `thumbnail` y comprueba el alto que sale. Si no, instálalo en un entorno virtual como en la lección 20 del módulo 1.
> 14. Con Pillow, guarda la `Image` en lugar de la `ImageTk.PhotoImage` y comprueba que la imagen desaparece igual.
> 15. Haz `isinstance(lista, tk.PhotoImage)` y prueba a llamar a `lista.subsample(2)`. Copia los dos resultados.
