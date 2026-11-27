---
titulo: "La barra de desplazamiento: Scrollbar"
resumen: "El widget que no funciona solo: las dos mitades de la conexión y los dos síntomas de olvidar una, por qué un Frame no se puede desplazar, y la receta del Canvas con lo que nadie te cuenta de la rueda del ratón."
minutos: 27
orden: 24
---

La `Scrollbar` es distinta de todo lo anterior. Los once widgets del bloque hasta aquí se podían crear, mirar y probar por su cuenta; una barra de desplazamiento sola no hace absolutamente nada. No es que quede sosa: es que **no sabe qué está desplazando**, y el widget desplazado tampoco sabe que existe la barra.

Conectarlos es todo el trabajo de esta lección, y son dos conexiones, no una. Ahí está el error que comete todo el mundo la primera vez, y tiene la particularidad de que **olvidar cada mitad produce un síntoma distinto**, los dos desconcertantes.

Y luego está la segunda parte, que es la que de verdad duele: en Tk **un `Frame` no se puede desplazar**. Si lo que quieres es un formulario largo con una barra al lado, que es lo más normal del mundo, el camino pasa por un `Canvas` y una receta de seis pasos que conviene tener escrita.

> [!objetivo] Qué vas a aprender
>
> Conectar una barra con un widget en los dos sentidos y reconocer el síntoma de cada mitad que falte; saber qué widgets se pueden desplazar y cuáles no; colocar la barra sin que se encoja ni desaparezca; montar un área desplazable con `Canvas` cuando lo que hay que desplazar es un `Frame`; y hacer que la rueda del ratón funcione, que no viene de serie.

## Las dos mitades

Esta es la idea central de la lección y, si se entiende, el resto es detalle. Widget y barra se informan mutuamente, cada uno por su canal:

```python
lista = tk.Listbox(caja, height=12)
barra = ttk.Scrollbar(caja, orient="vertical", command=lista.yview)
lista.configure(yscrollcommand=barra.set)
```

Léelo como una conversación de dos frases:

- **`command=lista.yview`** es la barra hablándole al widget. «Me han arrastrado; ponte aquí.»
- **`yscrollcommand=barra.set`** es el widget hablándole a la barra. «He cambiado de posición o de tamaño; dibújate así.»

Fíjate en que hay que crear la barra después del `Listbox`, porque necesita nombrar su método `yview`, y completar la otra mitad con `configure` después, porque necesita nombrar el `set` de la barra. Es una dependencia circular y no hay forma de escribirla en una sola línea; el orden es siempre widget, barra, `configure`.

> [!aviso] Olvidar una mitad da dos fallos distintos, y los dos parecen otra cosa
>
> Si olvidas **`yscrollcommand=barra.set`**, el widget se desplaza bien pero la barra se queda inerte: llena, del todo arriba y sin moverse por mucho contenido que haya. Comprobado, la barra sigue diciendo lo mismo mientras la lista ya se ha movido a la mitad:
>
> ```consola
> >>> barra.get()
> (0.0, 1.0)
> >>> lista.yview_moveto(0.5)
> >>> barra.get()
> (0.0, 1.0)
> >>> lista.yview()
> (0.5, 0.525)
> ```
>
> El síntoma se suele leer como «la barra está rota» o «no le llega el contenido», cuando lo que pasa es que nadie se lo ha contado.
>
> Si olvidas **`command=lista.yview`**, al contrario: la barra se dibuja bien y se mueve con el contenido, porque sí se está enterando, pero arrastrarla no hace nada. El tirador se queda pegado donde está. Esto se suele leer como «la barra no responde al ratón».
>
> Y el caso peor es el que pasa en un programa con dos zonas desplazables, cuando por copiar y pegar una barra apunta al widget equivocado. Entonces todo funciona, nada falla y arrastrar una barra mueve el otro panel.

## Qué recibe y qué devuelve

Lo que el widget le manda a la barra son dos fracciones entre 0 y 1: dónde empieza y dónde acaba la parte visible.

```consola
>>> barra = ttk.Scrollbar(ventana, orient="vertical")
>>> barra.get()
(0.0, 1.0)
>>> barra.set(0.25, 0.75)
>>> barra.get()
(0.25, 0.75)
```

`(0.25, 0.75)` significa «se ve la mitad central», y el tirador ocupa la mitad de la canal. De ahí sale el comportamiento que a veces se toma por un fallo:

```consola
>>> barra.set(0, 1)
>>> barra.get()
(0.0, 1.0)
```

**`(0.0, 1.0)` quiere decir que cabe todo**, y entonces la barra se dibuja llena y no se puede arrastrar, porque no hay dónde ir. No está estropeada: está diciendo la verdad. Si te aparece así con contenido de sobra, lo que falla es la mitad del `yscrollcommand`.

`set` necesita los dos argumentos, siempre:

```consola
>>> barra.set(0.5)
TypeError: Scrollbar.set() missing 1 required positional argument: 'last'
```

Del otro lado, `yview` acepta dos formas, y merece conocerlas porque sirven para desplazar desde el código:

```python
lista.yview_moveto(0.25)              # ponte al 25 % del total
lista.yview("scroll", 3, "units")     # baja tres líneas
lista.yview("scroll", 1, "pages")     # baja una pantalla
lista.yview_moveto(1.0)               # al final, útil tras añadir algo
```

Y `yview()` sin argumentos devuelve la fracción visible, que es lo mismo que la barra recibe. Todo esto existe igual en horizontal con `xview` y `xscrollcommand`.

## Quién se puede desplazar

Esta tabla ahorra tiempo, y la última fila es la importante:

| Widget | Vertical | Horizontal |
| --- | :---: | :---: |
| `Text` | Sí | Sí |
| `Listbox` | Sí | Sí |
| `Canvas` | Sí | Sí |
| `Treeview` | Sí | Sí |
| `Entry` y `Combobox` | No | Sí |
| `Frame`, `LabelFrame`, `Notebook` | **No** | **No** |

Los cuatro primeros son los que tienen contenido propio que puede exceder su tamaño. El `Entry` solo se desplaza a lo ancho, que es lo único que le puede sobrar, aunque en la práctica casi nadie le pone barra.

Y la última fila es la que cambia planes:

```consola
>>> "yscrollcommand" in ttk.Frame(ventana).configure()
False
>>> "yscrollcommand" in ttk.LabelFrame(ventana).configure()
False
>>> "yscrollcommand" in ttk.Notebook(ventana).configure()
False
```

**Ningún contenedor de Tk se puede desplazar.** No hay opción que activarlo, ni un `ScrollableFrame` escondido en el módulo. Un `Frame` con veinte widgets dentro que no caben en la ventana simplemente los recorta, y no hay barra que ponerle. La solución está más abajo y pasa por el `Canvas`, que sí se desplaza y sí puede contener widgets.

## Seis opciones

```consola
>>> sorted(ttk.Scrollbar(ventana).configure().keys())
['class', 'command', 'cursor', 'orient', 'style', 'takefocus']
```

Seis. Es **el widget más pelado del módulo**, por debajo incluso del `Scale`. Y de esas seis, las que usarás son dos: `orient` y `command`. Ni siquiera hay forma de decidir el grosor:

```consola
>>> "width" in ttk.Scrollbar(ventana).configure()
False
>>> "width" in tk.Scrollbar(ventana).configure()
True
```

El grosor lo pone el tema, y es lo correcto: una barra de desplazamiento más gorda o más fina que las del sistema se nota y molesta. Si alguna vez necesitas cambiarlo, se hace con `ttk.Style` y no con una opción del widget, y hay lección para eso en el bloque D.

`orient` tiene los dos valores de siempre, y hay que ponerlo cuando la barra es horizontal, porque el valor de fábrica es `vertical`:

```consola
>>> str(ttk.Scrollbar(ventana).cget("orient"))
'vertical'
```

Los métodos propios son cinco: `set` y `get`, que ya conoces, y `activate`, `delta` y `fraction`, que traducen píxeles a fracciones y solo hacen falta si te pones a construir tu propio widget desplazable. En el trabajo normal no se tocan.

## Colocarla

La barra va pegada al widget y tiene que estirarse **a lo largo**. Con `pack`:

```python
barra.pack(side="right", fill="y")
lista.pack(side="left", fill="both", expand=True)
```

El orden importa y es contraintuitivo: **la barra primero**. `pack` reparte el hueco por orden de llamada, así que si el `Listbox` va antes con `expand=True`, se queda con todo el espacio y la barra se ve aplastada o no se ve. Es el error de colocación más habitual del widget, y da un síntoma que parece de otra cosa: una barra que aparece y desaparece al cambiar el tamaño de la ventana.

Y el `fill="y"` tampoco es opcional. Sin él la barra sale con su alto mínimo, unos veinte píxeles, un botoncito cuadrado en la esquina.

Con `grid` es más explícito, y es lo que conviene cuando hay barra vertical y horizontal:

```python
lista.grid(row=0, column=0, sticky="nsew")
vertical.grid(row=0, column=1, sticky="ns")
horizontal.grid(row=1, column=0, sticky="ew")

caja.rowconfigure(0, weight=1)
caja.columnconfigure(0, weight=1)
```

Las dos últimas líneas son las de la lección 10 y aquí son imprescindibles: sin peso en la fila y la columna del widget, al agrandar la ventana el hueco de sobra se queda sin repartir y el conjunto no crece. Fíjate también en que la barra vertical lleva `sticky="ns"` y no `"nsew"`: se estira a lo largo, pero no a lo ancho.

> [!consejo] Dos barras dejan una esquina vacía
>
> Con barra vertical y horizontal a la vez queda un cuadradito libre en el cruce, abajo a la derecha. En `grid` es la celda `row=1, column=1`, y si no pones nada ahí se ve el fondo de la ventana, que a veces canta.
>
> Lo normal es dejarlo vacío, que es lo que hacen muchos programas del sistema. Si molesta, un `ttk.Frame` pequeño en esa celda lo tapa con el color del tema.
>
> Y antes de poner la horizontal, comprueba que hace falta. En un `Text` con `wrap="word"`, que es lo que casi siempre quieres, **nunca sobra nada a lo ancho** porque las líneas se parten solas, y la barra horizontal está permanentemente inútil. Solo tiene sentido con `wrap="none"`, que es el caso del código o de los datos en columnas.

## Desplazar un formulario largo

Aquí está la receta que hace falta porque el `Frame` no se desplaza. La idea es meter un `Frame` dentro de un `Canvas`, que sí se desplaza, y decirle al `Canvas` cuánto mide su contenido.

Son seis pasos y todos hacen falta:

```python
# 1. El Canvas, que es el que se desplaza, y su barra.
lienzo = tk.Canvas(caja, highlightthickness=0)
barra = ttk.Scrollbar(caja, orient="vertical", command=lienzo.yview)
lienzo.configure(yscrollcommand=barra.set)

# 2. El Frame de verdad, donde irán los widgets. Hijo del Canvas.
interior = ttk.Frame(lienzo)

# 3. Meterlo en el Canvas como un elemento. anchor="nw" para que
#    empiece arriba a la izquierda, no centrado.
ventanilla = lienzo.create_window((0, 0), window=interior, anchor="nw")
```

Los tres primeros son mecánica. El cuarto es el que falta en la mitad de los ejemplos que se encuentran por ahí:

```python
# 4. Decirle al Canvas cuánto mide su contenido, cada vez que cambie.
def medir(evento=None):
        lienzo.configure(scrollregion=lienzo.bbox("all"))

interior.bind("<Configure>", medir)
```

`scrollregion` es el rectángulo por el que el `Canvas` deja desplazarse, y **de fábrica está vacío**:

```consola
>>> lienzo.cget("scrollregion")
''
```

Un `Canvas` sin `scrollregion` no se desplaza nada, por mucho que le hayas metido contenido y conectado la barra. Y `bbox("all")` es lo que mide todo lo que hay dentro:

```consola
>>> lienzo.bbox("all")
(0, 0, 40, 400)
>>> lienzo.configure(scrollregion=lienzo.bbox("all"))
>>> lienzo.cget("scrollregion")
'0 0 40 400'
```

Cuatrocientos píxeles de alto para veinte etiquetas. El `bind` al `<Configure>` del interior es lo que mantiene eso al día: cada vez que el contenido cambia de tamaño, porque añades widgets o porque uno crece, se vuelve a medir. Sin ese `bind` funciona al arrancar y se rompe en cuanto el formulario cambia.

El quinto paso arregla un defecto visual. El `Frame` interior mide lo que necesita, que suele ser menos que el ancho del `Canvas`, y entonces el contenido queda apretado a la izquierda con una franja vacía a la derecha:

```python
# 5. Estirar el interior al ancho del Canvas.
def estirar(evento):
        lienzo.itemconfigure(ventanilla, width=evento.width)

lienzo.bind("<Configure>", estirar)
```

Se ve bien medido:

```consola
>>> lienzo.bbox("all")                       # el interior a su ancho natural
(0, 0, 40, 400)
>>> lienzo.itemconfigure(ventanilla, width=180)
>>> lienzo.bbox("all")
(0, 0, 180, 400)
```

Ojo con un detalle de ese paso: hay **dos `<Configure>` distintos**, el del interior y el del `Canvas`, y hacen cosas diferentes. Si los confundes entras en un bucle donde cada uno provoca el otro.

Y el sexto paso es el que nadie menciona.

> [!error] La rueda del ratón no funciona, y el `Canvas` es el culpable
>
> Monta la receta entera, correctamente, y prueba la rueda del ratón sobre el formulario. No pasa nada. La barra funciona si la arrastras, pero la rueda es como si no existiera, y eso hoy se siente directamente como un programa roto.
>
> El motivo es concreto y se puede consultar. `bind_class` dice qué atajos trae de serie cada clase de widget, así que basta con buscar los de la rueda:
>
> ```consola
> >>> def rueda_de(clase):
> ...     return [b for b in ventana.bind_class(clase) if "Wheel" in b]
> ...
> >>> rueda_de("Text")
> ['<Shift-Mod2-MouseWheel>', '<Shift-MouseWheel>', '<Mod2-MouseWheel>', '<MouseWheel>']
> >>> rueda_de("Listbox")
> ['<Shift-Mod2-MouseWheel>', '<Shift-MouseWheel>', '<Mod2-MouseWheel>', '<MouseWheel>']
> >>> rueda_de("Treeview")
> ['<MouseWheel>', '<Mod2-MouseWheel>', '<Shift-MouseWheel>', '<Shift-Mod2-MouseWheel>']
> >>> rueda_de("Canvas")
> []
> >>> ventana.bind_class("Canvas")
> ()
> ```
>
> **El `Canvas` no tiene ni un solo binding de clase.** Ni la rueda, ni las flechas, ni nada. El `Text`, el `Listbox` y el `Treeview` atienden la rueda ellos solos sin que tú hagas nada, y por eso ahí nunca te has planteado el problema; el `Canvas` viene completamente en blanco, porque es un lienzo de dibujo y Tk no presupone qué debe hacer.
>
> Así que el sexto paso es atender la rueda a mano:
>
> ```python
> def rueda(evento):
>         lienzo.yview_scroll(-1 * (evento.delta // 120), "units")
>
> lienzo.bind("<MouseWheel>", rueda)
> ```
>
> Y aquí hay una diferencia entre sistemas que hay que conocer. En Windows y macOS la rueda llega como un evento `<MouseWheel>` con un `delta`, pero en Windows ese `delta` viene en múltiplos de 120 y en macOS en unidades pequeñas, así que dividir por 120 en macOS deja el resultado en cero y no se mueve nada. Y en Linux no hay `<MouseWheel>`: la rueda llega como los botones 4 y 5 del ratón. La versión que aguanta las tres:
>
> ```python
> import sys
>
> def rueda(evento):
>         if evento.num == 4:                      # Linux, rueda arriba
>                 lienzo.yview_scroll(-1, "units")
>     elif evento.num == 5:                    # Linux, rueda abajo
>                 lienzo.yview_scroll(1, "units")
>     elif sys.platform == "win32":
>                 lienzo.yview_scroll(-evento.delta // 120, "units")
>     else:                                    # macOS
>                 lienzo.yview_scroll(-evento.delta, "units")
>
> lienzo.bind("<MouseWheel>", rueda)
> lienzo.bind("<Button-4>", rueda)
> lienzo.bind("<Button-5>", rueda)
> ```
>
> Un último detalle práctico: el `bind` va al `Canvas`, pero los widgets de dentro están encima, y la rueda sobre una etiqueta del formulario no llega al `Canvas`. Hay dos salidas. La limpia es recorrer los hijos y atarles el mismo `bind`. La cómoda es `bind_all` cuando el puntero entra en la zona y desatarlo al salir, que es lo que hace el ejemplo de abajo y funciona bien:
>
> ```salida
> antes del <Enter>, bind_all de <MouseWheel>: ''
> tras el <Enter>, hay binding: True
> rueda abajo: 0.0000 -> 0.1050 | se movio: True
> rueda encima de un Entry, se movio el Canvas: True
> tras el <Leave>, queda binding: False
> rueda fuera de la zona, se movio: False
> ```
>
> Eso sí, `bind_all` y `unbind_all` trabajan sobre **todos** los widgets del programa, así que `unbind_all("<MouseWheel>")` borra cualquier otra atención a la rueda que hubiera puesto otra parte del código, no solo la tuya. Con una sola zona desplazable da igual, y con varias también, porque cada `<Enter>` vuelve a atar la suya. Pero si tu programa tiene algún atajo global de rueda, esta pareja se lo come, y entonces toca la salida limpia de recorrer los hijos.

## Las dos cosas juntas

Este programa tiene un `Listbox` con barra, que es el caso fácil, y un formulario largo desplazable, que es el caso de la receta. Puestos uno al lado del otro para que se vea cuánto trabajo cuesta cada uno.

```python title="desplazamiento.py"
"""Scrollbar: el caso directo con Listbox y la receta del Canvas para un Frame."""

import sys
import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

CAMPOS = ("Nombre", "Apellidos", "Documento", "Teléfono", "Correo",
          "Dirección", "Población", "Provincia", "Código postal", "País",
          "Empresa", "Cargo", "Departamento", "Teléfono de empresa",
          "Contacto de urgencia", "Teléfono de urgencia", "Observaciones")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_lista(contenedor):
        """El caso directo: el Listbox ya sabe desplazarse y atiende la rueda."""
    caja = ttk.LabelFrame(contenedor, text="Listbox (directo)", padding=MARGEN)
    caja.pack(side="left", fill="both", expand=True)

    # grid en vez de pack: con dos barras es más claro quién ocupa qué.
    lista = tk.Listbox(caja, height=14, exportselection=False,
                       activestyle="none", borderwidth=1, relief="solid")
    vertical = ttk.Scrollbar(caja, orient="vertical", command=lista.yview)
    horizontal = ttk.Scrollbar(caja, orient="horizontal", command=lista.xview)
    # Las dos mitades de cada conexión.
    lista.configure(yscrollcommand=vertical.set, xscrollcommand=horizontal.set)

    lista.grid(row=0, column=0, sticky="nsew")
    vertical.grid(row=0, column=1, sticky="ns")
    horizontal.grid(row=1, column=0, sticky="ew")
    caja.rowconfigure(0, weight=1)
    caja.columnconfigure(0, weight=1)

    for n in range(1, 61):
                lista.insert("end", f"{n:03d} — registro con un texto largo para que "
                            f"sobre también a lo ancho")
    return caja


def crear_formulario(contenedor):
        """La receta: Canvas + Frame dentro, porque un Frame no se desplaza."""
    caja = ttk.LabelFrame(contenedor, text="Frame (con Canvas)", padding=MARGEN)
    caja.pack(side="left", fill="both", expand=True, padx=(MARGEN, 0))

    # 1. El Canvas y su barra, con las dos mitades.
    lienzo = tk.Canvas(caja, highlightthickness=0, width=260)
    barra = ttk.Scrollbar(caja, orient="vertical", command=lienzo.yview)
    lienzo.configure(yscrollcommand=barra.set)

    # La barra primero: si el Canvas va antes con expand se la come.
    barra.pack(side="right", fill="y")
    lienzo.pack(side="left", fill="both", expand=True)

    # 2 y 3. El Frame de verdad, metido como elemento del Canvas.
    interior = ttk.Frame(lienzo, padding=(0, 0, MARGEN, 0))
    ventanilla = lienzo.create_window((0, 0), window=interior, anchor="nw")

    # 4. Volver a medir cuando el contenido cambie de tamaño.
    def medir(evento=None):
                lienzo.configure(scrollregion=lienzo.bbox("all"))

    # 5. Estirar el interior al ancho del Canvas. Ojo: este <Configure>
    #    es el del Canvas, el de arriba es el del interior.
    def estirar(evento):
                lienzo.itemconfigure(ventanilla, width=evento.width)

    interior.bind("<Configure>", medir)
    lienzo.bind("<Configure>", estirar)

    # 6. La rueda, que el Canvas no atiende por su cuenta.
    def rueda(evento):
                if evento.num == 4:
                        lienzo.yview_scroll(-1, "units")
        elif evento.num == 5:
                        lienzo.yview_scroll(1, "units")
        elif sys.platform == "win32":
                        lienzo.yview_scroll(-evento.delta // 120, "units")
        else:
                        lienzo.yview_scroll(-evento.delta, "units")

    # bind_all mientras el puntero está dentro: así la rueda funciona
    # también encima de los widgets del formulario, que tapan el Canvas.
    def atender(evento=None):
                for secuencia in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
                        lienzo.bind_all(secuencia, rueda)

    def dejar(evento=None):
                for secuencia in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
                        lienzo.unbind_all(secuencia)

    lienzo.bind("<Enter>", atender)
    lienzo.bind("<Leave>", dejar)

    for fila, campo in enumerate(CAMPOS):
                ttk.Label(interior, text=f"{campo}:").grid(
            row=fila * 2, column=0, sticky="w", pady=(AIRE, 0))
        ttk.Entry(interior, width=26).grid(
            row=fila * 2 + 1, column=0, sticky="ew")
    interior.columnconfigure(0, weight=1)

    medir()
    return caja


ventana = tk.Tk()
ventana.title("Desplazamiento")
ventana.minsize(700, 420)

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

zonas = ttk.Frame(cuerpo)
zonas.pack(fill="both", expand=True)
crear_lista(zonas)
crear_formulario(zonas)

ttk.Label(cuerpo, text="El Listbox se desplaza solo y atiende la rueda. "
                       "El formulario necesita Canvas, scrollregion y el bind "
                       "de la rueda a mano.",
          wraplength=640, justify="left", foreground="#6E6E73").pack(
    anchor="w", pady=(MARGEN, 0))

centrar(ventana)
ventana.mainloop()
```

Cuenta las líneas de cada lado y tendrás el resumen de la lección: el `Listbox` necesita cuatro, y el formulario desplazable necesita treinta. Merece la pena guardarse esa función `crear_formulario` en algún sitio, porque la vas a volver a necesitar y no es de las que se recuerdan de memoria.

> [!consejo] Antes de montar la receta, pregúntate si hace falta
>
> Treinta líneas y seis pasos para desplazar un formulario es mucho, y a menudo el problema no era el que parecía. Tres salidas que suelen ser mejores:
>
> - **Un `Notebook`**, la lección de las pestañas de este mismo bloque. Diecisiete campos en un formulario interminable casi siempre son tres grupos de seis, y en pestañas se navegan mejor que desplazándose.
> - **Una ventana más grande**, o un `minsize` mayor. Si el formulario cabe en una pantalla normal y solo se desborda porque la ventana arranca pequeña, el arreglo es el tamaño inicial.
> - **Un `Treeview` o un `Text`**, si lo que hay dentro son datos y no controles. Esos ya se desplazan solos, atienden la rueda y no necesitan receta.
>
> La receta del `Canvas` es la respuesta correcta cuando de verdad hay muchos **controles** que no caben y no se pueden agrupar. Que pasa, pero menos de lo que parece.

> [!resumen] En resumen
>
> La `Scrollbar` es el primer widget del bloque que no funciona solo, y conectarla son dos conexiones: `command=widget.yview` para que la barra mueva el contenido, y `yscrollcommand=barra.set` para que el contenido mueva la barra. El orden de escritura es forzoso, primero el widget, luego la barra y luego un `configure`, porque cada uno necesita nombrar al otro. Olvidar cada mitad da un síntoma distinto: sin `yscrollcommand` la barra se queda inerte y llena, sin `command` no responde al arrastre. Lo que viaja entre los dos son fracciones entre 0 y 1, y `(0.0, 1.0)` significa que cabe todo, por lo que una barra llena y quieta no está rota, está informando. Solo se pueden desplazar el `Text`, el `Listbox`, el `Canvas` y el `Treeview`, más el `Entry` a lo ancho; **ningún contenedor se desplaza**, ni `Frame`, ni `LabelFrame`, ni `Notebook`, y no hay opción que lo active. Es el widget más pelado del módulo con seis opciones, sin ni siquiera un grosor que ajustar, porque eso lo decide el tema. Al colocarla hay que acordarse de que va primero en el `pack` y con `fill` en su eje, y de poner peso a la fila y columna del widget si usas `grid`. Para desplazar un formulario hay que meterlo en un `Canvas` con `create_window`, mantener el `scrollregion` al día desde el `<Configure>` del interior con `bbox("all")` porque de fábrica está vacío, y estirar el interior desde el `<Configure>` del `Canvas`. Y hay un sexto paso que casi nunca se cuenta: el `Canvas` **no tiene ningún binding de clase**, ni para la rueda ni para nada, así que la rueda del ratón hay que atarla a mano, con las diferencias de Windows, macOS y Linux. Antes de montar todo eso, conviene comprobar si el caso no se resuelve mejor con pestañas, con una ventana mayor o con un widget que ya se desplace solo.

> [!ejercicio] Practica
>
> Trabaja en un fichero `24-desplazamiento.py` salvo donde se indique otra cosa:
>
> 1. Monta un `Listbox` con 100 elementos y una barra vertical, pero pon solo `command=lista.yview`. Desplaza con la rueda y anota qué hace la barra. Añade la otra mitad.
> 2. Repite el ejercicio anterior al contrario: solo `yscrollcommand=barra.set`. Intenta arrastrar el tirador y anota el síntoma.
> 3. Coloca el `Listbox` con `pack(fill="both", expand=True)` **antes** de la barra. Ejecuta, cambia el tamaño de la ventana y explica lo que ves.
> 4. Escribe en `24-texto.py` un `Text` con `wrap="word"` y barras vertical y horizontal. Comprueba si la horizontal sirve para algo y después cambia a `wrap="none"`.
> 5. Monta la receta del `Canvas` con veinte `Entry`, pero sin el paso 4. Comprueba qué hace la barra y qué devuelve `lienzo.cget("scrollregion")`.
> 6. Añade el paso 4 y prueba la rueda del ratón. Cuando no funcione, consulta `ventana.bind_class("Canvas")` y explica por qué. Después añade el paso 6.
> 7. Con la receta terminada, añade un botón que meta un `Entry` nuevo en el interior. Comprueba que el `scrollregion` se actualiza solo y explica gracias a qué.
