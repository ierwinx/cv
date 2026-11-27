---
titulo: "La etiqueta: Label"
resumen: "El widget que muestra texto y hace de print en una interfaz: las dos alineaciones que se confunden, el texto que se parte en varias líneas, el texto que cambia solo y las etiquetas que tiemblan."
minutos: 25
orden: 13
---

Empieza aquí el bloque más largo del módulo: los widgets, uno por lección. El criterio es el mismo en las diecinueve, y conviene decirlo una vez: cada lección explica **todas las opciones del widget**, no las tres de siempre, porque la diferencia entre una interfaz que parece hecha por un aficionado y una que parece profesional casi nunca está en el widget que eliges, sino en las opciones que le pones.

Y se empieza por el `Label` por dos razones. La primera es que es el widget más simple que existe: muestra texto y no hace nada más. La segunda es menos evidente y más importante: **el `Label` es el `print` de una interfaz gráfica**. En los módulos anteriores, cuando un programa tenía algo que contar, lo imprimía. Aquí no hay dónde imprimir, y todo lo que un programa quiere decirle a quien lo usa (el resultado de un cálculo, el nombre del fichero abierto, el mensaje de error, el rótulo de cada campo del formulario) sale por una etiqueta. Es, con diferencia, el widget que más veces vas a escribir.

> [!objetivo] Qué vas a aprender
>
> Crear etiquetas y conocer sus veinte opciones; distinguir `anchor` de `justify`, que es la confusión clásica; partir un texto largo en varias líneas con `wraplength`; cambiar el texto de una etiqueta de las dos formas posibles y saber cuándo conviene cada una; evitar que la interfaz tiemble al actualizar un valor; y dar formato a un título con un estilo propio.

## Crear una etiqueta

Lo mínimo es el contenedor y el texto:

```python
etiqueta = ttk.Label(ventana, text="Nombre:")
etiqueta.pack()
```

Como todo widget, no aparece hasta que se coloca, y el contenedor va primero. Eso ya lo viste en el bloque B y no se repetirá más.

Un `ttk.Label` acepta veinte opciones, que salen todas de preguntárselo:

```consola
>>> sorted(ttk.Label(ventana).configure().keys())
['anchor', 'background', 'borderwidth', 'class', 'compound', 'cursor', 'font',
 'foreground', 'image', 'justify', 'padding', 'relief', 'state', 'style',
 'takefocus', 'text', 'textvariable', 'underline', 'width', 'wraplength']
```

Agrupadas por lo que hacen, quedan así:

| Grupo | Opciones | Para qué |
| --- | --- | --- |
| Contenido | `text`, `textvariable`, `image`, `compound`, `underline` | Qué se muestra |
| Colocación del contenido | `anchor`, `justify`, `wraplength`, `width`, `padding` | Dónde y cómo se reparte dentro de la etiqueta |
| Aspecto | `font`, `foreground`, `background`, `relief`, `borderwidth`, `style` | Cómo se ve |
| Comportamiento | `state`, `cursor`, `takefocus`, `class` | Cómo se porta |

De esas, `font`, `foreground` y `background` se explicaron en la lección 7, y `relief`, `borderwidth`, `state`, `cursor` y `takefocus` en la lección 5, porque las comparte casi todo el mundo. Esta lección va a por las demás.

> [!nota] Los nombres cortos no existen en ttk
>
> En `tk` puedes escribir `bg` y `fg` como abreviatura de `background` y `foreground`. En `ttk` no:
>
> ```consola
> >>> ttk.Label(ventana, bg="red")
> _tkinter.TclError: unknown option "-bg"
> ```
>
> Los widgets temáticos solo aceptan los nombres largos. Si trabajas con `ttk`, que es el criterio del curso, acostúmbrate a `background` y `foreground` y te ahorras el error.

## Las dos alineaciones que se confunden

Esta es la parte de la lección que más veces vas a agradecer, porque `anchor` y `justify` suenan a lo mismo y hacen cosas distintas:

- **`anchor` coloca el texto dentro de la etiqueta.** Solo se nota si la etiqueta es más grande que su texto.
- **`justify` alinea las líneas entre sí** cuando el texto tiene más de una. Con una sola línea no hace absolutamente nada.

El noventa por ciento de las veces que alguien pone `justify="left"` y no ve ningún cambio, lo que quería era `anchor="w"`.

`anchor` acepta los ocho puntos cardinales y el centro, y Tk los enumera si te equivocas:

```consola
>>> ttk.Label(ventana, anchor="z")
_tkinter.TclError: bad anchor "z": must be n, ne, e, se, s, sw, w, nw, or center
```

`justify` solo acepta tres:

```consola
>>> ttk.Label(ventana, justify="z")
_tkinter.TclError: bad justification "z": must be left, right, center, or ""
```

Hay una diferencia de valores por defecto entre las dos familias que conviene tener presente, y que es igual en los cinco temas:

```consola
>>> ttk.Label(ventana).cget("anchor"), tk.Label(ventana).cget("anchor")
(<index object: 'w'>, 'center')
```

**Un `ttk.Label` alinea a la izquierda y un `tk.Label` centra.** Es una de esas diferencias pequeñas que explican por qué una interfaz cambia de aspecto al pasar de una familia a otra.

> [!aviso] Lo que devuelve `cget` en ttk no siempre es una cadena
>
> Fíjate en el `<index object: 'w'>` de ahí arriba. No es una rareza de la impresión: es que `ttk` devuelve objetos de Tcl en vez de cadenas de Python, y eso rompe la comparación evidente.
>
> ```consola
> >>> ttk.Label(ventana).cget("anchor") == "w"
> False
> >>> str(ttk.Label(ventana).cget("anchor")) == "w"
> True
> ```
>
> Es un fallo desagradable de encontrar, porque el `if` no da error, simplemente nunca se cumple. Cuando compares el valor de una opción de `ttk` con una cadena, envuélvelo en `str()`.

> [!aviso] `anchor` no hace nada si la etiqueta mide lo que su texto
>
> Una etiqueta se ajusta a su contenido, así que por defecto no hay espacio de sobra dentro y `anchor` no tiene dónde mover nada. Solo empieza a servir cuando la etiqueta es más ancha que su texto, y eso pasa por tres vías: porque la estiras al colocarla (`fill="x"` en `pack`, `sticky="ew"` en `grid`), porque le fijas un `width`, o porque comparte una celda de `grid` con algo más ancho.
>
> Dicho al revés: si `anchor="e"` no mueve el texto a la derecha, el problema no está en `anchor`, está en que la etiqueta no es más ancha que el texto.

## `wraplength`: texto de varias líneas

Una etiqueta no parte el texto por su cuenta. Le des la frase que le des, la pone en una sola línea, y la ventana se estira hasta donde haga falta:

```consola
>>> largo = "Una línea bastante larga que debería partirse en varias si le ponemos wraplength"
>>> a = ttk.Label(ventana, text=largo)
>>> a.pack(); ventana.update_idletasks()
>>> a.winfo_reqwidth(), a.winfo_reqheight()
(493, 20)
```

Cuatrocientos noventa y tres píxeles de ancho y una línea de alto. Con `wraplength` le dices el ancho máximo en píxeles y se parte solo:

```consola
>>> b = ttk.Label(ventana, text=largo, wraplength=200)
>>> b.pack(); ventana.update_idletasks()
>>> b.winfo_reqwidth(), b.winfo_reqheight()
(186, 52)
```

Ciento ochenta y seis de ancho (no llega a doscientos porque corta por palabras, no por píxeles exactos) y cincuenta y dos de alto, que son tres líneas de dieciséis píxeles más el relleno. Fíjate en lo que ha pasado de verdad: **la etiqueta no se ha adaptado a su hueco, ha cambiado el tamaño que pide.** `wraplength` no es una opción de diseño adaptable, es una medida fija en píxeles.

Aquí es donde `justify` empieza a servir, porque ahora sí hay varias líneas que alinear entre sí. Y la combinación que quieres casi siempre para un párrafo de ayuda es esta:

```python
ttk.Label(contenedor, text=ayuda, wraplength=240, justify="left")
```

Sin `justify="left"` las líneas salen centradas, que es lo que hace `tk.Label` por defecto y lo que hace que un párrafo de ayuda parezca un poema.

> [!consejo] Un párrafo que se adapta de verdad
>
> Como `wraplength` es un número fijo, un párrafo con `wraplength=240` sigue midiendo 240 aunque la ventana crezca hasta el doble. Para que se reajuste hay que recalcularlo cuando la etiqueta cambia de tamaño, y eso se hace atando el evento `<Configure>`, que es materia del bloque D:
>
> ```python
> parrafo = ttk.Label(contenedor, text=ayuda, justify="left")
> parrafo.bind("<Configure>",
>              lambda evento: parrafo.configure(wraplength=evento.width - 8))
> ```
>
> Los ocho píxeles que se restan evitan que el nuevo ancho vuelva a disparar el evento en bucle. Guárdalo como receta y no le des más vueltas hasta la lección de eventos.

## Texto que cambia: `text` frente a `textvariable`

Casi todas las etiquetas interesantes cambian de texto mientras el programa corre. Hay dos formas de hacerlo y las dos son correctas.

La primera es `configure`, que ya conoces:

```python
estado.configure(text="Guardado")
```

La segunda es atar la etiqueta a una **variable de control**, un objeto de Tk que envuelve un valor y avisa a quien lo esté mirando cuando cambia:

```consola
>>> texto = tk.StringVar(value="inicial")
>>> etiqueta = ttk.Label(ventana, textvariable=texto)
>>> etiqueta.cget("text")
'inicial'
>>> texto.set("otro texto más largo")
>>> etiqueta.cget("text")
'otro texto más largo'
```

Nadie ha tocado la etiqueta y su texto ha cambiado. Eso es todo el mecanismo: la etiqueta se suscribe a la variable, y actualizar la variable actualiza la etiqueta.

¿Cuál usar? El criterio práctico:

- **`configure(text=...)`** cuando una sola etiqueta muestra algo que se calcula en un sitio. Es más directo y no hay que guardar nada.
- **`textvariable`** cuando el mismo dato se muestra en varios sitios, o cuando ese dato también está en un `Entry`, un `Checkbutton` o un `Scale`. Entonces la variable es la fuente única y todos los widgets se sincronizan gratis.

Las variables de control tienen lección propia en el bloque D, con `IntVar`, `DoubleVar`, `BooleanVar` y el `trace_add` que permite reaccionar a cada cambio. Aquí basta con saber que existen y que `textvariable` es la puerta de entrada.

> [!aviso] Si pones las dos, gana `textvariable`
>
> Es un despiste habitual al añadir la variable a una etiqueta que ya tenía texto:
>
> ```consola
> >>> texto = tk.StringVar(value="de la variable")
> >>> etiqueta = ttk.Label(ventana, text="fijo", textvariable=texto)
> >>> etiqueta.cget("text")
> 'de la variable'
> ```
>
> El `text="fijo"` no da error, no avisa y no se ve nunca. Y hay una variante peor, que es pasarle una cadena normal en lugar de una variable de control:
>
> ```consola
> >>> ttk.Label(ventana, textvariable="hola").cget("text")
> ''
> ```
>
> Tampoco da error: la etiqueta sale vacía. Tk interpreta esa cadena como el *nombre* de una variable de Tcl que no existe. Si una etiqueta aparece en blanco sin motivo, mira si le has pasado un `str` donde iba un `StringVar`.

## Etiquetas que tiemblan

Este es el detalle que separa una interfaz cuidada de una que da dentera, y casi nadie lo ve venir.

Una etiqueta pide el ancho de su texto. Si el texto cambia, cambia el ancho, y si cambia el ancho **se mueve todo lo que tenga al lado**:

```consola
>>> contador = ttk.Label(ventana, text="0 elementos")
>>> contador.pack(); ventana.update_idletasks()
>>> contador.winfo_reqwidth()
79
>>> contador.configure(text="128 elementos"); ventana.update_idletasks()
>>> contador.winfo_reqwidth()
93
```

Catorce píxeles de diferencia. En una barra de estado donde ese contador se actualiza cada segundo, y con un botón a su derecha, el botón da un salto de catorce píxeles cada vez. Con un reloj que cambia de `9:59` a `10:00`, igual.

La solución es `width`, que en las etiquetas **se mide en caracteres, no en píxeles**, como ya viste en la lección 7:

```consola
>>> contador.configure(width=14); ventana.update_idletasks()
>>> contador.winfo_reqwidth()
130
>>> contador.configure(text="0 elementos"); ventana.update_idletasks()
>>> contador.winfo_reqwidth()
130
```

Reservados catorce caracteres, el ancho ya no depende del texto y nada se mueve. La regla es sencilla: **toda etiqueta cuyo texto cambie solo debe tener `width`**, calculado a ojo sobre el valor más largo que pueda mostrar. Y como `width` reserva sitio de sobra, es justo el caso en el que `anchor` empieza a importar: `anchor="w"` para que el texto no baile dentro del hueco reservado, o `anchor="e"` para las cifras, que se leen mejor alineadas a la derecha.

## Imágenes: `image` y `compound`

Una etiqueta también muestra imágenes, y es la forma normal de poner un icono o una ilustración en una ventana:

```python
logo = tk.PhotoImage(file="logo.png")
ttk.Label(ventana, image=logo).pack()
```

Con `compound` se combinan texto e imagen en la misma etiqueta, y el valor dice dónde va la imagen respecto al texto:

```consola
>>> ttk.Label(ventana, compound="z")
_tkinter.TclError: bad compound "z": must be none, text, image, center, top, bottom, left, right, or ""
```

Los útiles son `left`, que es el icono a la izquierda del texto y el más frecuente, sus tres hermanos `right`, `top` y `bottom`, y `center`, que pone el texto encima de la imagen. Los otros dos son interruptores: `text` muestra solo el texto ignorando la imagen, e `image` al contrario, que sirve para alternar entre los dos sin borrar ninguno.

> [!aviso] La imagen hay que guardarla en algún sitio
>
> El fallo más famoso de Tkinter: si el `PhotoImage` es una variable local de una función, al terminar la función el recolector de basura se lleva la imagen y la etiqueta aparece vacía. Tk guarda una referencia interna a los píxeles, pero no al objeto de Python.
>
> La solución es que la imagen viva tanto como la ventana: un atributo del objeto, un diccionario global de imágenes, o cualquier cosa que no se destruya al salir de la función. La lección de imágenes del bloque E lo trata a fondo, con `PhotoImage` y con Pillow para los formatos que Tk no lee.

## Títulos: el estilo en vez de la fuente

Para un título no pongas `font` en cada etiqueta. Define un estilo una vez y úsalo por nombre, que es el mecanismo de `ttk` que viste en la lección 6:

```python
estilo = ttk.Style()
estilo.configure("Titulo.TLabel", font=("Helvetica", 16, "bold"))

ttk.Label(ventana, text="Alta de colaborador", style="Titulo.TLabel").pack(anchor="w")
```

El nombre tiene que acabar en `.TLabel`, que es la clase de estilo del widget, para heredar todo lo demás del tema:

```consola
>>> ttk.Label(ventana).winfo_class()
'TLabel'
```

La ventaja no es escribir menos, es que el día que decidas que los títulos van a 18 en vez de 16 lo cambias en un sitio. Es exactamente lo que hace el panel de control de referencia, con un único `Titulo.TLabel` reutilizado en cada pestaña.

`underline` subraya un carácter por su posición, contando desde cero, y se usa para señalar la tecla de acceso de un rótulo:

```python
ttk.Label(ventana, text="Nombre:", underline=0)
```

Ojo con lo que hace y lo que no: `underline` **solo dibuja el subrayado**. Que la tecla funcione de verdad es cosa de `bind`, en el bloque D. La excepción son los menús, donde Tk se encarga solo, y eso se ve en la lección de la barra de menús.

## Un panel de estado completo

Este programa reúne todo lo de la lección: un título con estilo propio, rótulos y valores en rejilla, un párrafo de ayuda partido en varias líneas, dos etiquetas atadas a variables y una barra de estado con un contador que no tiembla.

```python title="etiquetas.py"
"""Panel de estado: todo lo que da de sí un Label."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

DATOS = (
    ("Servidor", "produccion-01"),
    ("Dirección", "10.0.4.18"),
    ("Región", "eu-west-1"),
    ("Versión", "3.14.0"),
)

AYUDA = ("Los valores se refrescan cada segundo. Si la conexión se pierde, "
         "el último valor conocido se queda en pantalla en gris hasta que "
         "vuelva a haber respuesta.")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_ficha(contenedor):
        """Los datos fijos: rótulo a la izquierda, valor a la derecha."""
    ficha = ttk.Frame(contenedor)
    ficha.pack(fill="x", pady=(0, MARGEN))

    for fila, (rotulo, valor) in enumerate(DATOS):
        # El rótulo se pega al este para que los dos puntos queden alineados.
                ttk.Label(ficha, text=f"{rotulo}:", anchor="e", width=10).grid(
            row=fila, column=0, sticky="e", pady=AIRE)
        ttk.Label(ficha, text=valor, anchor="w").grid(
            row=fila, column=1, sticky="w", padx=(AIRE, 0), pady=AIRE)

    ficha.columnconfigure(1, weight=1)
    return ficha


def crear_medidores(contenedor):
        """Los dos valores que cambian, atados a variables de control."""
    medidores = ttk.Frame(contenedor)
    medidores.pack(fill="x")

    ttk.Label(medidores, text="Memoria:", anchor="e", width=10).grid(
        row=0, column=0, sticky="e")
    # width fijo y anchor al este: la cifra cambia sin mover nada de su lado.
    ttk.Label(medidores, textvariable=memoria, width=9, anchor="e").grid(
        row=0, column=1, sticky="w", padx=(AIRE, 0))

    ttk.Label(medidores, text="Peticiones:", anchor="e", width=10).grid(
        row=1, column=0, sticky="e", pady=AIRE)
    ttk.Label(medidores, textvariable=peticiones, width=9, anchor="e").grid(
        row=1, column=1, sticky="w", padx=(AIRE, 0), pady=AIRE)

    return medidores


def crear_estado(ventana):
        """Barra inferior. El contador lleva width para que el reloj no tiemble."""
    ttk.Separator(ventana, orient="horizontal").pack(side="bottom", fill="x")
    barra = ttk.Frame(ventana, padding=(MARGEN, AIRE))
    barra.pack(side="bottom", fill="x")

    ttk.Label(barra, text="Conectado").pack(side="left")
    ttk.Label(barra, textvariable=reloj, width=12, anchor="e").pack(side="right")
    return barra


def refrescar():
        """Simula la llegada de datos nuevos. Solo toca las variables."""
    global segundos
    segundos += 1
    memoria.set(f"{412 + segundos % 37} MB")
    peticiones.set(f"{1000 + segundos * 13:,}".replace(",", "."))
    reloj.set(f"hace {segundos} s")
    ventana.after(1000, refrescar)


ventana = tk.Tk()
ventana.title("Estado del servidor")
ventana.minsize(420, 340)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
segundos = 0
memoria = tk.StringVar(value="412 MB")
peticiones = tk.StringVar(value="1.000")
reloj = tk.StringVar(value="hace 0 s")

estilo = ttk.Style()
estilo.configure("Titulo.TLabel", font=("Helvetica", 16, "bold"))
estilo.configure("Tenue.TLabel", foreground="#6E6E73")

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

ttk.Label(cuerpo, text="Estado del servidor", style="Titulo.TLabel").pack(
    anchor="w", pady=(0, MARGEN))

crear_ficha(cuerpo)
crear_medidores(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

# El párrafo se ata a <Configure> para que se reparta al cambiar el ancho.
ayuda = ttk.Label(cuerpo, text=AYUDA, justify="left", style="Tenue.TLabel")
ayuda.pack(fill="x", anchor="w")
ayuda.bind("<Configure>",
           lambda evento: ayuda.configure(wraplength=evento.width - 8))

crear_estado(ventana)

centrar(ventana)
ventana.mainloop()
```

Tres cosas de ese programa merecen la pena aunque no sean del widget. Los rótulos usan `width=10` y `anchor="e"` para que los dos puntos caigan en la misma columna, que es el detalle que hace que una ficha se lea como una ficha y no como una lista de palabras. Los medidores usan `width=9` y `anchor="e"` porque sus cifras cambian cada segundo, y sin eso la interfaz vibraría. Y `refrescar` no toca ninguna etiqueta: solo cambia variables, y las etiquetas se enteran solas. Esa es la ventaja de `textvariable` que cuesta ver hasta que se prueba.

> [!consejo] Rótulo y campo, siempre en la misma rejilla
>
> Cuando llegues a los formularios de las próximas lecciones vas a escribir cientos de parejas rótulo y campo. El patrón bueno es el de `crear_ficha`: el rótulo en la columna cero con `sticky="e"`, el campo en la columna uno con `sticky="ew"`, y `columnconfigure(1, weight=1)` al final para que el campo crezca y el rótulo no.
>
> Lo que hay que evitar es colocar el rótulo encima del campo con `pack` y confiar en que quede alineado. No queda.

> [!resumen] En resumen
>
> El `Label` muestra texto y hace en una interfaz el papel que hacía `print` en un programa de terminal, y por eso es el widget que más vas a escribir. De sus veinte opciones, las propias son las de contenido y reparto. `anchor` coloca el texto dentro de la etiqueta y solo se nota cuando la etiqueta es más ancha que su texto, mientras que `justify` alinea las líneas entre sí y no hace nada si hay una sola; confundir las dos es el error clásico, y un `ttk.Label` alinea a la izquierda mientras un `tk.Label` centra. `wraplength` parte el texto a un ancho fijo en píxeles y es lo que convierte una etiqueta en un párrafo, siempre acompañado de `justify="left"`; como es un número fijo, para que se adapte hay que recalcularlo con el evento `<Configure>`. El texto se cambia con `configure(text=...)` cuando lo muestra una sola etiqueta, o con `textvariable` y un `StringVar` cuando el dato se comparte con otros widgets, teniendo en cuenta que si pones `text` y `textvariable` a la vez gana la variable y que pasar una cadena normal donde iba un `StringVar` deja la etiqueta vacía sin dar ningún error. Toda etiqueta cuyo texto cambie solo necesita `width`, que se mide en caracteres, porque si no la interfaz salta cada vez que el valor crece. `image` con `compound` combina icono y texto, recordando guardar el `PhotoImage` en algún sitio que no desaparezca. Y para los títulos se define un estilo propio acabado en `.TLabel` en lugar de repetir la fuente etiqueta por etiqueta.

> [!ejercicio] Practica
>
> Trabaja en un fichero `13-etiquetas.py` salvo donde se indique otra cosa:
>
> 1. Pon cuatro etiquetas en una columna con `fill="x"` y dales `anchor` distinto: `"w"`, `"center"`, `"e"` y sin poner nada. Después quita el `fill="x"` y comprueba que las cuatro se ven igual, y explica por qué.
> 2. Coge una frase de unas treinta palabras y muéstrala con `wraplength=200` y `justify="left"`, `"center"` y `"right"` en tres etiquetas seguidas. Imprime el `winfo_reqheight()` de cada una y comprueba que las tres miden lo mismo de alto.
> 3. Escribe en `13-reloj.py` un reloj que se actualice cada segundo con `after` y muestre la hora con `textvariable`. Ejecútalo primero sin `width` y con un botón a la derecha, fíjate en el salto al pasar de las 9 a las 10, y arréglalo.
> 4. Haz una ficha de seis parejas rótulo y valor alineada con `grid`, con los rótulos pegados al este, y que al ensanchar la ventana crezca solo la columna de los valores.
> 5. Ata la misma `StringVar` a tres etiquetas colocadas en sitios distintos de la ventana y cámbiala desde una función. Comprueba que las tres se actualizan con un solo `set`.
> 6. Escribe una etiqueta de párrafo que se reajuste al ancho de la ventana con `<Configure>`. Prueba primero sin restar nada al `evento.width` y anota qué ocurre; después resta los ocho píxeles.
