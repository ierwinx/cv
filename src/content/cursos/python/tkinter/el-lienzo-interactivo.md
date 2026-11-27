---
titulo: "El lienzo interactivo: eventos, imágenes y animación"
resumen: "Hacer que el dibujo responda: atar eventos a figuras y qué eventos no acepta, traducir el píxel de la ventana a coordenada del lienzo, arrastrar con el ratón, y la trampa de las imágenes con su diagnóstico exacto."
minutos: 30
orden: 26
---

En la lección anterior el lienzo era un sitio donde dibujar. Aquí pasa a ser un sitio donde **pasan cosas**: figuras que responden al ratón, que se arrastran, que se iluminan al pasar por encima, que se mueven solas.

Eso trae un mecanismo que no existe en ningún otro widget del módulo. Hasta ahora los eventos se ataban al widget con `bind`, y en el `Canvas` eso sigue funcionando, pero el widget es uno solo: un `bind` al lienzo te dice que alguien ha pulsado, no **sobre qué**. La respuesta es `tag_bind`, que ata eventos a las figuras. Y como todo en este widget, trabaja con etiquetas, con una consecuencia útil que se mide más abajo.

También aquí toca resolver la deuda de coordenadas de la lección 24. Un evento del ratón trae la posición en píxeles de la ventana, y las figuras están en coordenadas del lienzo. Mientras no hay desplazamiento son el mismo número, y en cuanto lo hay dejan de serlo.

> [!objetivo] Qué vas a aprender
>
> Atar eventos a figuras con `tag_bind` y saber qué eventos no acepta; usar la etiqueta `current` para saber sobre qué se ha actuado; conseguir el efecto de resalte sin escribir ningún evento; traducir la posición del ratón a coordenadas del lienzo; implementar el arrastre completo; poner imágenes sin arrastrar ficheros y reconocer el fallo de la referencia perdida; y animar con `after`.

## `tag_bind`

La forma es igual que un `bind` normal, con un primer argumento que dice a qué figura:

```python
lienzo.tag_bind(identificador, "<Button-1>", pulsar)
lienzo.tag_bind("nodo", "<Enter>", entrar)
```

Y aquí está la parte que conviene entender bien, porque cambia cómo se organiza el código. Cuando le pasas una etiqueta, **el evento se ata al nombre de la etiqueta y no a las figuras que la tienen**. Se puede comprobar atando una etiqueta que todavía no usa nadie:

```consola
>>> lienzo.find_withtag("grupo")
()
>>> lienzo.tag_bind("grupo", "<Button-1>", lambda evento: None)
>>> lienzo.tag_bind("grupo")
('<Button-1>',)
```

No hay ni una figura con esa etiqueta y el binding ya existe. La consecuencia práctica es la buena noticia de la lección: **las figuras que crees después con esa etiqueta responden al evento sin que hagas nada más.** Puedes atar los eventos una sola vez al arrancar y luego crear, borrar y recrear figuras cuantas veces quieras.

Eso encaja con el patrón de la lección anterior, borrar por etiqueta y redibujar. Si los eventos estuvieran atados a los identificadores habría que volver a atarlos en cada redibujado, y olvidarse una vez daría un dibujo que deja de responder sin ningún error. Con etiquetas, el problema no existe.

> [!aviso] `tag_bind` no acepta cualquier evento
>
> Aquí la lista es corta y Tk la recita si te sales de ella:
>
> ```consola
> >>> lienzo.tag_bind(figura, "<MouseWheel>", rueda)
> _tkinter.TclError: requested illegal events; only key, button, motion, enter,
> leave, and virtual events may be used
> ```
>
> Solo teclas, botones del ratón, movimiento, entrada, salida y eventos virtuales. De modo que estos sí:
>
> `<Button-1>`, `<ButtonRelease-1>`, `<B1-Motion>`, `<Double-Button-1>`, `<Enter>`, `<Leave>`, `<Motion>`, `<Key>`.
>
> Y estos no: **`<MouseWheel>` y `<Configure>`**, entre otros. Tiene sentido si lo piensas, porque una figura no cambia de tamaño por su cuenta ni recibe la rueda, esas cosas le pasan al widget. Pero conviene saberlo antes de diseñar: si querías que la rueda sobre una figura hiciera zoom, el binding va al `Canvas` y dentro averiguas qué figura había debajo. Y eso enlaza con lo de la lección 24, que el `Canvas` tampoco trae la rueda de serie: hay que atarla al widget y a mano.

## La etiqueta `current`

Cuando salta un evento de figura, la pregunta inmediata es «¿sobre cuál?». Tk mantiene una etiqueta reservada, `current`, que señala a la figura que está bajo el puntero:

```python
def pulsar(evento):
        figura = lienzo.find_withtag("current")[0]
    etiquetas = lienzo.gettags(figura)
```

Fuera de un evento no apunta a nada, que es lo esperable:

```consola
>>> lienzo.find_withtag("current")
()
```

Con `current` y el patrón de dos etiquetas por figura de la lección anterior se resuelve la identificación sin guardar nada. La figura lleva su etiqueta de grupo y su etiqueta propia, y al recibir el evento se leen sus etiquetas y se deduce cuál es:

```python
def pulsar(evento):
        for etiqueta in lienzo.gettags("current"):
                if etiqueta.startswith("nodo-"):
                        seleccionar(etiqueta.removeprefix("nodo-"))
            return
```

Ese es el puente entre el dibujo y los datos, y es la parte que hay que diseñar con cabeza en cualquier programa de lienzo: la etiqueta propia de cada figura tiene que llevar dentro la clave del dato que representa, porque es lo único que te va a llegar cuando alguien pulse.

## Resaltar sin escribir eventos

Antes de ponerse a atar `<Enter>` y `<Leave>`, conviene saber que para el caso más común no hacen falta. Las figuras tienen opciones que se aplican solas cuando el puntero está encima:

```consola
>>> a = lienzo.create_rectangle(10, 100, 100, 150, fill="#0A84FF",
...                            activefill="#FF375F", activewidth=3)
>>> lienzo.itemcget(a, "activefill")
'#FF375F'
>>> lienzo.itemcget(a, "activewidth")
'3.0'
```

Con eso, la figura cambia de color y engorda su borde al pasar por encima, y vuelve sola al salir. Cero eventos, cero código. Hay una familia completa: `activefill`, `activeoutline`, `activewidth`, `activedash` y `activestipple`, más las equivalentes `disabled*` que se aplican cuando la figura está en `state="disabled"`.

Así que la regla es cómoda: **si el resalte es solo visual, opciones `active*`; si además tiene que pasar algo, `tag_bind`.** Poner un `<Enter>` que solo cambia un color es escribir código que el widget ya trae.

## Del píxel de la ventana a la coordenada del lienzo

Todo evento del ratón trae `evento.x` y `evento.y`, que son píxeles **dentro del widget**. Mientras el lienzo no esté desplazado, coinciden con las coordenadas del dibujo:

```consola
>>> lienzo.canvasx(50), lienzo.canvasy(50)
(50.0, 50.0)
```

Y en cuanto hay `scrollregion` y alguien desplaza, dejan de coincidir:

```consola
>>> lienzo.xview_moveto(0.5)
>>> lienzo.yview_moveto(0.25)
>>> lienzo.canvasx(50), lienzo.canvasy(50)
(547.0, 247.0)
```

El píxel 50 de la ventana es ahora la coordenada 547 del lienzo. `evento.x` sigue valiendo 50, porque el ratón está donde está; lo que ha cambiado es qué parte del dibujo se ve ahí.

> [!error] Usar `evento.x` directamente funciona hasta que el lienzo se desplaza
>
> Es el fallo más difícil de encontrar de los dos lienzos, porque **el programa funciona perfectamente mientras pruebas**. Dibujas, arrastras, todo bien. Y el día que el dibujo crece y aparece la barra de desplazamiento, las figuras empiezan a saltar al pulsarlas, y con un desplazamiento de mitad de lienzo saltan cientos de píxeles.
>
> La regla, sin excepciones: **en un `Canvas`, la primera línea de todo manejador de ratón traduce.**
>
> ```python
> def pulsar(evento):
>         x = lienzo.canvasx(evento.x)
>     y = lienzo.canvasy(evento.y)
> ```
>
> Cuesta dos líneas y no tiene ningún inconveniente: sin desplazamiento devuelven el mismo número, así que ponerlas siempre no cambia nada y te ahorra el día malo.
>
> `canvasx` tiene además un segundo argumento que redondea a una rejilla, y es la forma más corta de conseguir que las cosas se coloquen alineadas:
>
> ```consola
> >>> lienzo.canvasx(53, 10)
> 50.0
> >>> lienzo.canvasx(57, 10)
> 60.0
> ```

Relacionado con esto hay una opción del lienzo que explica un comportamiento raro. `closeenough` es la tolerancia en píxeles con la que se considera que el puntero está «encima» de una figura:

```consola
>>> lienzo.cget("closeenough")
1.0
```

Un píxel de fábrica, lo que hace difícil pulsar sobre una línea fina. Subirlo a `5` da margen y se agradece en dibujos de líneas. Y una precisión medida que evita confusiones: **`closeenough` solo afecta a los eventos**, no a las búsquedas.

```consola
>>> lienzo.configure(closeenough=5)
>>> lienzo.find_overlapping(100, 102, 100, 102)     # la línea está en y=100
()
```

`find_overlapping` sigue siendo estricto. Así que si comparas lo que detecta un clic con lo que encuentra `find_overlapping`, pueden no coincidir, y no es un fallo tuyo.

## Arrastrar

El arrastre son tres eventos y un dato que hay que recordar entre ellos. La clave es guardar la última posición del ratón y mover la figura **por la diferencia**, no a la posición absoluta, porque si no la figura salta para centrarse en el puntero.

```python
arrastre = {"x": 0, "y": 0, "figura": None}


def empezar(evento):
        """Guarda qué se agarró y dónde, traduciendo las coordenadas."""
    arrastre["figura"] = lienzo.find_withtag("current")[0]
    arrastre["x"] = lienzo.canvasx(evento.x)
    arrastre["y"] = lienzo.canvasy(evento.y)


def mover(evento):
        """Mueve por la diferencia desde la última posición."""
    x = lienzo.canvasx(evento.x)
    y = lienzo.canvasy(evento.y)
    lienzo.move(arrastre["figura"], x - arrastre["x"], y - arrastre["y"])
    arrastre["x"] = x
    arrastre["y"] = y


def soltar(evento):
        arrastre["figura"] = None


lienzo.tag_bind("nodo", "<Button-1>", empezar)
lienzo.tag_bind("nodo", "<B1-Motion>", mover)
lienzo.tag_bind("nodo", "<ButtonRelease-1>", soltar)
```

Tres detalles de ese código que son los que suelen faltar. El `<B1-Motion>` es el movimiento **con el botón pulsado**, y no `<Motion>`, que se dispara siempre. La figura se agarra en `<Button-1>` con `current` y se recuerda, porque durante el arrastre el puntero puede salirse de ella y entonces `current` ya señala a otra cosa. Y `move` recibe la diferencia, con lo que da igual en qué punto de la figura se hizo clic: se mueve con el ratón sin dar un salto inicial.

Si lo que arrastras son varias figuras que forman un dibujo, como un rectángulo con su texto dentro, lo cómodo es darles a todas una etiqueta común y mover la etiqueta, que arrastra el grupo entero de una vez.

## Las teclas

Un `Canvas` puede recibir teclas, pero no las pide:

```consola
>>> lienzo.cget("takefocus")
''
```

Vacío significa que Tk decide, y para un lienzo decide que no. Así que para que funcionen las flechas o el `Supr` hay que pedir el foco explícitamente, normalmente al pulsar sobre el lienzo:

```python
lienzo.bind("<Button-1>", lambda evento: lienzo.focus_set(), add="+")
lienzo.bind("<Delete>", borrar_seleccion)
lienzo.bind("<Left>", lambda evento: lienzo.move("seleccion", -5, 0))
```

Ese `add="+"` es importante y es de la lección de eventos del bloque B: añade un manejador más en vez de sustituir el que ya hubiera para `<Button-1>`.

Y aunque `tag_bind` acepta `<Key>`, en la práctica las teclas se atan al lienzo y no a las figuras, porque una figura no tiene foco de teclado. El patrón normal es mantener tú qué está seleccionado, con una etiqueta, y que las teclas actúen sobre esa etiqueta.

## Imágenes

`create_image` coloca una imagen en un punto, y como el texto, su `anchor` de fábrica es el centro:

```consola
>>> lienzo.itemcget(lienzo.create_image(0, 0, image=img), "anchor")
'center'
```

El `bbox` sale del tamaño de la imagen, y las `coords` son un solo punto:

```consola
>>> i = lienzo.create_image(100, 100, image=img, anchor="nw")
>>> lienzo.coords(i)
[100.0, 100.0]
>>> lienzo.bbox(i)
(100, 100, 140, 140)
```

Lo que Tk sabe leer por su cuenta es poco:

```consola
>>> ventana.call("image", "types")
('nsimage', 'photo', 'bitmap')
```

Un `PhotoImage` lee PNG y GIF, y no lee JPEG. Para eso hace falta Pillow, y hay una lección de imágenes en el bloque E que lo trata a fondo; aquí interesa solo lo que el lienzo necesita.

Para practicar sin arrastrar ficheros se puede pintar una imagen por código, que es lo que hace el ejemplo y lo que ya viste en la lección 4 con el icono de la ventana:

```python
img = tk.PhotoImage(width=40, height=40)
img.put("#0A84FF", to=(0, 0, 40, 40))       # todo azul
img.put("#FF375F", to=(10, 10, 30, 30))     # un cuadro rosa en medio
```

Y se puede leer un píxel, lo que sirve para comprobar que ha funcionado:

```consola
>>> img.get(15, 15)
(255, 55, 95)
>>> img.get(5, 5)
(10, 132, 255)
```

`zoom` y `subsample` cambian el tamaño en múltiplos enteros, sin necesidad de Pillow:

```consola
>>> img.zoom(2).width()
80
>>> img.subsample(2).width()
20
```

> [!error] La imagen que desaparece, y cómo saber que es eso
>
> Ya lo avisó la lección 13 y en el lienzo pasa igual: si el `PhotoImage` es una variable local, al salir de la función Python lo recoge y la imagen deja de dibujarse. Lo que hace este caso difícil de diagnosticar es lo que queda, que está medido:
>
> ```consola
> >>> ident = dibujar_mal()          # crea el PhotoImage en una local
> >>> import gc; gc.collect()
> >>> lienzo.type(ident)
> 'image'
> >>> lienzo.bbox(ident)
> (10, 10, 30, 30)
> ```
>
> **La figura sigue existiendo y conserva su tamaño.** No ha desaparecido nada del lienzo, no hay error, y `bbox` responde como si todo fuera bien. Solo falta el dibujo.
>
> La forma de confirmarlo es preguntar si la imagen a la que apunta la figura existe todavía:
>
> ```consola
> >>> nombre = lienzo.itemcget(ident, "image")
> >>> nombre
> 'pyimage1'
> >>> nombre in ventana.call("image", "names")
> False
> ```
>
> Ese `False` es el diagnóstico. La figura guarda el **nombre** de una imagen que Tk ya ha destruido, porque el objeto de Python que la sostenía se fue. Con la referencia guardada, la misma comprobación da `True`.
>
> La solución es que la imagen viva tanto como la figura. En un programa con clases es un atributo; mientras no llegue el bloque E, una lista o un diccionario que no se destruya:
>
> ```python
> imagenes = []          # vive tanto como el programa
>
> def dibujar_nodo(x, y):
>         img = tk.PhotoImage(width=20, height=20)
>     img.put("#0A84FF", to=(0, 0, 20, 20))
>     imagenes.append(img)                     # esto es lo que salva el dibujo
>     return lienzo.create_image(x, y, image=img, anchor="nw")
> ```
>
> Y ojo con el patrón de borrar y redibujar de la lección anterior: si cada redibujado añade imágenes a la lista y nunca las quita, la lista crece sin parar. Lo correcto es vaciarla al borrar, o mejor, crear las imágenes una vez al arrancar y reutilizarlas, que es lo que hace el ejemplo.

## Animar

La animación es la técnica de la lección 23, la de trocear con `after`, aplicada a `move`. Un paso por llamada y el lienzo se repinta entre paso y paso:

```python
def animar(paso=0):
        if paso >= 30:
                return
    lienzo.move("nodo", 2, 0)
    ventana.after(16, animar, paso + 1)
```

Los dieciséis milisegundos son aproximadamente sesenta pasos por segundo, que es el objetivo razonable. Bajarlo más no gana nada porque la pantalla no va más rápido.

Dos cosas que hay que tener en cuenta y que no aparecen en la versión de la barra de progreso. La primera es que hay que poder **parar**: guarda lo que devuelve `after`, que es un identificador, y cancela con `after_cancel` cuando haga falta. Si no, una animación lanzada dos veces corre dos veces a la vez y el dibujo se mueve al doble de velocidad.

```python
animacion = None

def animar(paso=0):
        global animacion
    if paso >= 30:
                animacion = None
        return
    lienzo.move("nodo", 2, 0)
    animacion = ventana.after(16, animar, paso + 1)

def parar():
        global animacion
    if animacion is not None:
                ventana.after_cancel(animacion)
        animacion = None
```

La segunda es que **`move` acumula**. Si animas moviendo y no llevas la cuenta, no hay forma de volver al punto de partida más que redibujando, porque las coordenadas originales se han perdido. Para animaciones que van y vuelven es más fiable calcular la posición en cada paso con `coords` absolutas a partir de un origen que guardas, que ir sumando desplazamientos.

## Un diagrama que se manipula

Este programa junta todo: nodos arrastrables con líneas que los siguen, resalte automático, selección con la etiqueta `current`, teclas, una imagen generada por código y una animación que se puede parar.

```python title="diagrama.py"
"""Canvas interactivo: arrastrar, seleccionar, resaltar y animar."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

AZUL = "#0A84FF"
ROSA = "#FF375F"
GRIS = "#8E8E93"
BORDE = "#3A3A3C"

ANCHO_NODO, ALTO_NODO = 110, 46

NODOS = {
    "entrada": ("Entrada", 60, 60),
    "validar": ("Validar", 260, 60),
    "guardar": ("Guardar", 260, 180),
    "informe": ("Informe", 60, 180),
}
ENLACES = (("entrada", "validar"), ("validar", "guardar"),
           ("guardar", "informe"))


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_icono():
        """Imagen pintada por código, para no arrastrar ficheros.

    Se crea una vez y se guarda en una variable que vive tanto como el
    programa: si fuera local, Python la recogería y no se dibujaría nada.
    """
    img = tk.PhotoImage(width=14, height=14)
    img.put(AZUL, to=(0, 0, 14, 14))
    img.put("#FFFFFF", to=(4, 4, 10, 10))
    return img


def dibujar():
        """Dibuja el diagrama entero desde NODOS. Borra por etiqueta."""
    lienzo.delete("diagrama")
    for origen, destino in ENLACES:
        # Etiqueta propia con las dos claves dentro: así se sabe qué
        # línea hay que recolocar al mover un nodo.
                lienzo.create_line(0, 0, 0, 0, fill=GRIS, width=2, arrow="last",
                           tags=("diagrama", "enlace", f"de-{origen}",
                                 f"a-{destino}"))
    for clave, (texto, x, y) in NODOS.items():
        # Tres figuras por nodo con una etiqueta común: mover esa
        # etiqueta arrastra el grupo entero de una vez.
                grupo = ("diagrama", "nodo", f"nodo-{clave}")
        # La caja lleva además una etiqueta propia solo para rectángulos:
        # itemconfigure(outline=...) sobre "nodo-x" fallaría, porque el
        # texto y la imagen no tienen esa opción.
        lienzo.create_rectangle(x, y, x + ANCHO_NODO, y + ALTO_NODO,
                                fill="white", outline=BORDE, width=1,
                                activeoutline=AZUL, activewidth=2,
                                tags=grupo + ("caja", f"caja-{clave}"))
        lienzo.create_image(x + 10, y + 16, image=icono, anchor="nw",
                            tags=grupo)
        lienzo.create_text(x + 32, y + ALTO_NODO / 2, text=texto, anchor="w",
                           fill=BORDE, font=("Helvetica", 12), tags=grupo)
    recolocar_enlaces()


def recolocar_enlaces():
        """Cada línea va del centro de un nodo al centro del otro."""
    for origen, destino in ENLACES:
                caja_origen = lienzo.bbox(f"nodo-{origen}")
        caja_destino = lienzo.bbox(f"nodo-{destino}")
        if caja_origen is None or caja_destino is None:
                        continue          # bbox devuelve None si no hay nada
        x1 = (caja_origen[0] + caja_origen[2]) / 2
        y1 = (caja_origen[1] + caja_origen[3]) / 2
        x2 = (caja_destino[0] + caja_destino[2]) / 2
        y2 = (caja_destino[1] + caja_destino[3]) / 2
        lienzo.coords(f"de-{origen}", x1, y1, x2, y2)
    lienzo.tag_lower("enlace")


def clave_de(figura):
        """Saca la clave del dato de las etiquetas de la figura."""
    for etiqueta in lienzo.gettags(figura):
                if etiqueta.startswith("nodo-"):
                        return etiqueta.removeprefix("nodo-")
    return None


def empezar(evento):
        """Agarra el nodo entero, no la figura suelta que se pulsó."""
    clave = clave_de("current")
    if clave is None:
                return
    arrastre["clave"] = clave
    # canvasx y canvasy siempre: sin ellas esto se rompe al desplazar.
    arrastre["x"] = lienzo.canvasx(evento.x)
    arrastre["y"] = lienzo.canvasy(evento.y)
    seleccionar(clave)


def mover(evento):
        """Mueve por la diferencia, no a la posición absoluta."""
    if arrastre["clave"] is None:
                return
    x = lienzo.canvasx(evento.x)
    y = lienzo.canvasy(evento.y)
    lienzo.move(f"nodo-{arrastre['clave']}", x - arrastre["x"],
                y - arrastre["y"])
    arrastre["x"] = x
    arrastre["y"] = y
    recolocar_enlaces()


def soltar(evento):
        arrastre["clave"] = None


def seleccionar(clave):
        """La selección es una etiqueta más, no una variable con ids.

    Se pinta sobre "caja-x" y no sobre "nodo-x": el grupo del nodo tiene
    figuras de tres tipos y solo el rectángulo entiende de outline.
    """
    lienzo.itemconfigure("caja", outline=BORDE, width=1)
    lienzo.itemconfigure(f"caja-{clave}", outline=ROSA, width=2)
    caja = lienzo.bbox(f"nodo-{clave}")
    estado.set(f"Seleccionado: {NODOS[clave][0]} — ocupa {caja}")
    seleccion["clave"] = clave


def mover_con_teclas(dx, dy):
        """Las teclas van al lienzo, no a las figuras: no tienen foco."""
    if seleccion["clave"] is None:
                return
    lienzo.move(f"nodo-{seleccion['clave']}", dx, dy)
    recolocar_enlaces()


def animar(paso=0):
        """Un paso por llamada, guardando el identificador para poder parar."""
    global animacion
    if paso >= 40:
                animacion = None
        return
    lienzo.move("nodo", 1, 0)
    recolocar_enlaces()
    animacion = ventana.after(16, animar, paso + 1)


def alternar_animacion():
        global animacion
    if animacion is not None:
                ventana.after_cancel(animacion)
        animacion = None
        estado.set("Animación parada")
    else:
                animar()


ventana = tk.Tk()
ventana.title("Diagrama")
ventana.minsize(520, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
arrastre = {"clave": None, "x": 0, "y": 0}
seleccion = {"clave": None}
animacion = None
estado = tk.StringVar(value="Arrastra un nodo, o púlsalo y usa las flechas")

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

lienzo = tk.Canvas(cuerpo, background="white", highlightthickness=0,
                   borderwidth=1, relief="solid", closeenough=3)
lienzo.pack(fill="both", expand=True)

# La imagen en una variable del módulo: si fuera local no se vería nada.
icono = crear_icono()

botones = ttk.Frame(cuerpo)
botones.pack(fill="x", pady=(MARGEN, 0))
ttk.Button(botones, text="Animar", command=alternar_animacion).pack(side="left")
ttk.Button(botones, text="Redibujar", command=dibujar).pack(side="left",
                                                            padx=AIRE)

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS, wraplength=460,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

# Los eventos se atan a la etiqueta UNA vez: las figuras que se creen
# después la heredan, así que redibujar no obliga a volver a atarlos.
lienzo.tag_bind("nodo", "<Button-1>", empezar)
lienzo.tag_bind("nodo", "<B1-Motion>", mover)
lienzo.tag_bind("nodo", "<ButtonRelease-1>", soltar)

# Las teclas, al lienzo, y pidiendo el foco: un Canvas no lo pide.
lienzo.bind("<Button-1>", lambda evento: lienzo.focus_set(), add="+")
lienzo.bind("<Left>", lambda evento: mover_con_teclas(-8, 0))
lienzo.bind("<Right>", lambda evento: mover_con_teclas(8, 0))
lienzo.bind("<Up>", lambda evento: mover_con_teclas(0, -8))
lienzo.bind("<Down>", lambda evento: mover_con_teclas(0, 8))

dibujar()

centrar(ventana)
ventana.mainloop()
```

Pulsa «Redibujar» después de arrastrar los nodos y verás dos cosas de golpe. Los nodos vuelven a su sitio, porque `dibujar` los coloca desde `NODOS` y el arrastre solo movió las figuras sin tocar los datos. Y **el arrastre sigue funcionando** sobre las figuras nuevas, sin haber vuelto a atar ningún evento, que es la propiedad de `tag_bind` sobre etiquetas.

Esa primera parte, por cierto, es un defecto a propósito del ejemplo y una buena pregunta de diseño: si arrastrar tiene que ser permanente, lo que hay que actualizar al soltar son las coordenadas en `NODOS`, no las figuras. El dibujo se deriva de los datos, y cualquier cambio que deba durar tiene que llegar a los datos. Es el ejercicio 8.

> [!consejo] Que el lienzo no sea el dueño de los datos
>
> El error de arquitectura típico de un programa de `Canvas` es dejar que el dibujo sea la única copia de la información. Cuando las posiciones, los nombres y las relaciones solo existen como figuras, cualquier cosa que quieras hacer después (guardar en un fichero, deshacer, exportar, contar) obliga a reconstruirlo leyendo `coords` y `gettags`, y eso se vuelve imposible enseguida.
>
> La estructura que aguanta es la del ejemplo: un diccionario con los datos, una función que dibuja el diccionario entero, y eventos que **modifican el diccionario** y vuelven a dibujar. El lienzo pasa a ser una vista de los datos y no su almacén, y entonces guardar es guardar el diccionario, deshacer es quedarse con el anterior, y el dibujo siempre es correcto porque se deriva.

> [!resumen] En resumen
>
> Para que un dibujo responda, los eventos se atan a las figuras con `tag_bind`, y cuando se ata a una etiqueta el evento vive en **el nombre de la etiqueta**, no en las figuras, de modo que las que crees después lo heredan y el patrón de borrar y redibujar no obliga a volver a atar nada. `tag_bind` solo acepta teclas, botones, movimiento, entrada, salida y eventos virtuales, así que rechaza `<MouseWheel>` y `<Configure>`, que van al widget. La etiqueta reservada `current` señala a la figura bajo el puntero y es la que te dice sobre qué se ha actuado, por lo que conviene que cada figura lleve una etiqueta propia con la clave del dato dentro. Para el resalte puramente visual no hace falta ningún evento: las opciones `activefill`, `activeoutline` y `activewidth` se aplican solas al pasar por encima. La posición del ratón llega en píxeles del widget y hay que traducirla con `canvasx` y `canvasy` en la primera línea de cada manejador, porque sin desplazamiento coinciden pero con el lienzo desplazado a la mitad el píxel 50 es la coordenada 547, y ese es el fallo que no aparece hasta que el dibujo crece; `canvasx` acepta además un segundo argumento que redondea a una rejilla. `closeenough`, un píxel de fábrica, da tolerancia al pulsar sobre líneas finas y solo afecta a los eventos, no a `find_overlapping`. El arrastre son tres eventos, con `<B1-Motion>` y no `<Motion>`, guardando en `<Button-1>` qué se agarró porque `current` cambia durante el arrastre, y moviendo por la diferencia para que la figura no salte. Las teclas se atan al lienzo y hay que pedir el foco con `focus_set`, porque un `Canvas` no lo pide. En las imágenes, `create_image` centra por omisión, Tk solo lee PNG y GIF, y si el `PhotoImage` no se guarda en algo que dure, la figura **sobrevive con su `bbox` intacto** mientras el dibujo desaparece; se confirma comprobando que el nombre que devuelve `itemcget(id, "image")` ya no está en `ventana.call("image", "names")`. Y la animación es el `after` de la lección 23 aplicado a `move`, guardando el identificador para poder cancelar y teniendo en cuenta que `move` acumula.

> [!ejercicio] Practica
>
> Trabaja en un fichero `26-interactivo.py` salvo donde se indique otra cosa:
>
> 1. Dibuja cinco círculos y ata `<Button-1>` a su etiqueta común para que el pulsado se pinte de rojo, usando `current`. Después crea un sexto círculo con la misma etiqueta y comprueba si responde sin atar nada.
> 2. Intenta atar `<MouseWheel>` a una figura con `tag_bind` y lee el error completo. Consigue el mismo efecto atándolo al lienzo y averiguando la figura con `find_overlapping`.
> 3. Haz que un rectángulo cambie de color al pasar por encima, primero con `<Enter>` y `<Leave>` y luego con `activefill`. Compara el código.
> 4. Escribe en `26-coordenadas.py` un lienzo con `scrollregion` grande y un manejador de clic que muestre `evento.x` y `canvasx(evento.x)` en una etiqueta. Desplaza y comprueba cuándo dejan de coincidir.
> 5. Implementa el arrastre con `lienzo.coords(figura, x, y, ...)` en vez de con `move` y la diferencia. Observa el salto y explica por qué pasa.
> 6. Crea un `PhotoImage` dentro de una función sin guardarlo y colócalo en el lienzo. Comprueba `type`, `bbox` y si el nombre sigue en `ventana.call("image", "names")`.
> 7. Anima una figura de ida y vuelta con `after`, con un botón para arrancar y parar. Pulsa «Animar» dos veces seguidas sin la protección de `after_cancel` y anota qué pasa.
> 8. En el ejemplo del diagrama, haz que al soltar un nodo se actualicen sus coordenadas en `NODOS`, de forma que «Redibujar» ya no lo devuelva a su sitio.
