---
titulo: "El lienzo: Canvas"
resumen: "El widget donde dibujas tú: las nueve figuras y su sistema de coordenadas, los identificadores que fallan en silencio cuando la figura ya no está, y las etiquetas que convierten mil figuras en un grupo."
minutos: 32
orden: 25
---

Los doce widgets del bloque hasta aquí son controles. Les dices cómo tienen que ser y ellos se dibujan solos; nunca has decidido dónde va un píxel. El `Canvas` rompe eso: es una superficie vacía donde **tú** colocas figuras, una por una, con sus coordenadas.

Eso cambia el modelo de trabajo y conviene decirlo antes de empezar, porque es la causa de casi todos los tropiezos. En el resto del módulo el widget es un objeto de Python con métodos y opciones. En el `Canvas` el widget es uno solo, y lo que hay dentro **no son objetos**: son figuras identificadas por un número entero, que se manipulan pidiéndole al lienzo que actúe sobre ese número. No hay un objeto `Rectangulo` al que llamar `.mover()`.

De ahí salen las dos cosas que más cuesta interiorizar, y las dos están medidas más abajo: que un identificador viejo **no da ningún error** cuando la figura ya no existe, y que las etiquetas son la herramienta de verdad, porque permiten tratar cien figuras como una.

Esta lección es la primera de dos. Aquí van las figuras, las coordenadas y la manipulación; en la siguiente, los eventos sobre figuras, arrastrar con el ratón, las imágenes y la animación. Y algo ya lo viste en la lección 24: `create_window`, `scrollregion` y el hecho de que el `Canvas` no trae ningún atajo de teclado ni de rueda.

> [!objetivo] Qué vas a aprender
>
> Entender el sistema de coordenadas y las nueve figuras que se pueden dibujar; saber que cada figura es un entero y reconocer el fallo silencioso de usar uno caducado; distinguir `coords` de `bbox` y por qué no coinciden; usar etiquetas para operar sobre grupos; consultar y reordenar lo que hay en el lienzo con la familia `find_*`; y dibujar un gráfico a partir de datos, que es el trabajo real donde todo esto se junta.

## Es un widget clásico, y su tamaño viene en centímetros

No hay versión temática, así que no hay nada que decidir:

```consola
>>> hasattr(ttk, "Canvas")
False
```

Y antes de dibujar, una rareza que da guerra la primera vez. El tamaño por omisión de un `Canvas` no está en píxeles:

```consola
>>> lienzo = tk.Canvas(ventana)
>>> lienzo.cget("width")
'10c'
```

Diez **centímetros**. Es una cadena con unidad, y por tanto no es un número:

```consola
>>> int(lienzo.cget("width"))
ValueError: invalid literal for int() with base 10: '10c'
```

Si el tamaño lo pones tú, sale como lo escribiste, `'300'`, y entonces `int()` funciona. Pero como no puedes saber de antemano cuál de los dos casos tienes, la forma fiable de preguntar cuánto mide un `Canvas` no es `cget`:

```consola
>>> lienzo.winfo_reqwidth(), lienzo.winfo_reqheight()
(384, 270)
```

Y si lo que quieres es el tamaño real que ha acabado teniendo en la ventana, `winfo_width()` y `winfo_height()`, que es lo que hace falta para dibujar algo que se adapte.

## Las coordenadas

El origen está **arriba a la izquierda**, y la `y` crece **hacia abajo**. Es lo contrario de las matemáticas del instituto y la causa del error más habitual al dibujar gráficos: la barra que crece hacia arriba se dibuja restando.

```consola
>>> lienzo.coords(lienzo.create_text(10, 10, text="arriba", anchor="nw"))
[10.0, 10.0]
>>> lienzo.coords(lienzo.create_text(10, 150, text="abajo", anchor="nw"))
[10.0, 150.0]
```

Las coordenadas no están limitadas por el tamaño del lienzo. Puedes dibujar fuera, y puedes dibujar en negativo:

```consola
>>> fuera = lienzo.create_rectangle(500, 500, 600, 600)   # en un lienzo de 300x200
>>> fuera in lienzo.find_all()
True
>>> lienzo.coords(lienzo.create_oval(-50, -50, 20, 20))
[-50.0, -50.0, 20.0, 20.0]
```

La figura existe, está ahí y responde a todo; simplemente no se ve. Eso es útil (se puede preparar algo fuera y traerlo) y es una trampa: **una figura que no aparece no significa que no se haya creado**, y antes de buscar el fallo en el dibujo conviene mirar las coordenadas.

Lo que sí hace Tk es ordenarlas. Si das las esquinas al revés, las normaliza:

```consola
>>> al_reves = lienzo.create_rectangle(200, 150, 100, 50)
>>> lienzo.coords(al_reves)
[100.0, 50.0, 200.0, 150.0]
```

Así que no puedes contar con recuperar lo que escribiste: siempre sale de menor a mayor. Para un rectángulo da igual, pero si estabas usando el orden para saber en qué dirección se arrastró algo, ese dato se ha perdido.

## Las nueve figuras

```consola
>>> sorted(m for m in dir(lienzo) if m.startswith("create_"))
['create_arc', 'create_bitmap', 'create_image', 'create_line', 'create_oval',
 'create_polygon', 'create_rectangle', 'create_text', 'create_window']
```

| Método | Coordenadas que pide | Para qué |
| --- | --- | --- |
| `create_line` | Dos puntos o más | Líneas y trazados. Con `arrow` lleva punta de flecha |
| `create_rectangle` | Dos esquinas opuestas | Rectángulos, marcos, barras |
| `create_oval` | Las dos esquinas del rectángulo que lo contiene | Círculos y elipses |
| `create_arc` | Igual que el óvalo, más `start` y `extent` | Sectores y quesitos |
| `create_polygon` | Tres puntos o más | Cualquier forma cerrada |
| `create_text` | Un punto | Texto, con `font`, `anchor` y hasta `angle` para girarlo |
| `create_image` | Un punto | Una imagen. Es la lección siguiente |
| `create_window` | Un punto, más `window=` | Un widget de verdad dentro del lienzo. Ya salió en la 24 |
| `create_bitmap` | Un punto | Mapas de bits antiguos. No lo vas a usar |

Dos detalles que sorprenden. El **círculo no tiene método propio**: se hace con `create_oval` dando un cuadrado, y es de esas cosas que se buscan tres veces antes de aceptarlas. Y el `anchor` de fábrica de un texto es `center`:

```consola
>>> lienzo.itemcget(lienzo.create_text(0, 0, text="x"), "anchor")
'center'
```

De modo que un texto en `(0, 0)` sale centrado en la esquina, y se ve solo el cuarto de abajo a la derecha. Con texto casi siempre quieres `anchor="nw"`, que lo coloca como se lee.

Las opciones de relleno y borde se llaman distinto según la figura, y esto también se aprende tropezando. En un rectángulo, un óvalo o un polígono el relleno es `fill` y el borde es `outline`. En una línea o un texto **no hay `outline`**, y el color del trazo o de la letra es `fill`. Así que `create_line(..., outline="red")` da error, y la forma de pintar una línea de rojo es `fill="red"`.

## Cada figura es un número

Todos los `create_*` devuelven un entero:

```consola
>>> a = lienzo.create_rectangle(10, 10, 60, 40)
>>> b = lienzo.create_oval(70, 10, 120, 40)
>>> t = lienzo.create_text(10, 60, text="hola", anchor="nw")
>>> a, b, t
(1, 2, 3)
```

Con ese número se hace todo después: cambiar opciones, mover, consultar, borrar.

```python
lienzo.itemconfigure(a, fill="#0A84FF", outline="")   # cambiar opciones
lienzo.coords(a, 100, 100, 200, 160)                  # colocar en otro sitio
lienzo.move(a, 10, 5)                                 # desplazar en relativo
lienzo.itemcget(a, "fill")                            # consultar una opción
lienzo.delete(a)                                      # borrar
```

Fíjate en el par `coords` y `move`: `coords` pone las coordenadas absolutas y `move` suma un desplazamiento. Para animar o arrastrar, `move` es mucho más cómodo porque no hay que saber dónde estaba.

Una buena noticia medida: **los identificadores no se reciclan.** Borres lo que borres, los siguientes siguen subiendo:

```consola
>>> ids = [lienzo.create_rectangle(i*10, 0, i*10+5, 5) for i in range(5)]
>>> ids
[1, 2, 3, 4, 5]
>>> lienzo.delete(2, 3)
>>> [lienzo.create_rectangle(0, 50, 5, 55) for _ in range(3)]
[6, 7, 8]
```

Eso significa que un identificador guardado nunca acabará señalando por error a una figura distinta. Lo cual sería un consuelo si no fuera por lo que viene ahora.

> [!error] Un identificador caducado no da ningún error
>
> Cuando la figura ya no existe, el `Canvas` **no te lo dice de ninguna forma**. Todas las operaciones siguen funcionando y no hacen nada:
>
> ```consola
> >>> muerto = lienzo.create_rectangle(0, 0, 10, 10)
> >>> lienzo.delete(muerto)
> >>> lienzo.type(muerto)          # devuelve None
> >>> lienzo.coords(muerto)
> []
> >>> lienzo.bbox(muerto)          # devuelve None
> >>> lienzo.itemconfigure(muerto, fill="red")
> >>> lienzo.itemcget(muerto, "fill")
> ''
> >>> lienzo.delete(muerto)        # borrarlo otra vez tampoco protesta
> ```
>
> Ni una excepción en toda la lista. Esto es lo contrario de lo que hace el resto de Tk, que salta con `TclError` a la mínima; un `ttk.Label` te lo dice si le pones `bg` en vez de `background`, pero pintar de rojo una figura que ya no está es una operación perfectamente válida.
>
> El síntoma es de los peores: **un programa que no hace nada y no falla**. Pulsas el botón de resaltar, no se resalta nada, no hay error en la consola y no hay por dónde empezar. Lo que ha pasado es que en algún momento se borró y se volvió a crear el dibujo, y el identificador que tenías guardado se quedó apuntando al vacío.
>
> Dos formas de no pasar por ahí:
>
> 1. **Comprueba antes de fiarte.** `lienzo.type(id)` devuelve `None` si la figura no existe, y es la comprobación más directa. Tenlo presente sobre todo con `bbox`, porque devolver `None` en vez de una tupla rompe el desempaquetado:
>
> ```consola
> >>> x1, y1, x2, y2 = lienzo.bbox(9999)
> TypeError: cannot unpack non-iterable NoneType object
> ```
>
> 2. **No guardes identificadores, usa etiquetas.** Es la solución de verdad y es lo que viene en el apartado siguiente. Una etiqueta no caduca: si la figura se borró y se creó otra con la misma etiqueta, la etiqueta apunta a la nueva.

## `coords` no es `bbox`

Las dos dan coordenadas y son cosas distintas. `coords` son los puntos que definen la figura; `bbox` es el rectángulo que ocupa **dibujada**, borde incluido:

```consola
>>> r = lienzo.create_rectangle(50, 50, 150, 100)
>>> lienzo.coords(r)
[50.0, 50.0, 150.0, 100.0]
>>> lienzo.bbox(r)
(49, 49, 151, 101)
```

Un píxel de más por cada lado, que es el grosor del borde. Y crece con él:

```consola
>>> lienzo.itemconfigure(r, width=10)
>>> lienzo.bbox(r)
(45, 45, 155, 105)
>>> lienzo.itemconfigure(r, width=1, outline="")
>>> lienzo.bbox(r)
(50, 50, 150, 100)
```

Sin borde coinciden exactamente. Fíjate también en que `coords` devuelve `float` en una lista y `bbox` devuelve `int` en una tupla, lo que delata que son dos cosas de distinta naturaleza.

Dónde importa esto de verdad es en el texto, porque **un texto no tiene tamaño hasta que se dibuja**. Solo `bbox` sabe cuánto mide, y depende de la fuente:

```consola
>>> t = lienzo.create_text(10, 60, text="hola", anchor="nw")
>>> lienzo.bbox(t)
(9, 60, 37, 76)
>>> grande = lienzo.create_text(10, 100, text="hola", anchor="nw",
...                            font=("Helvetica", 30))
>>> lienzo.bbox(grande)
(9, 100, 87, 146)
```

El mismo «hola» mide 28 píxeles de ancho en un caso y 78 en el otro. Así que si necesitas centrar un texto, o poner un rectángulo detrás como fondo de una etiqueta, el orden es: crear el texto, preguntar su `bbox`, y después dibujar y colocar lo demás. No hay forma de calcularlo antes.

Y `bbox("all")` da lo que ocupa todo el contenido, que es lo que usaste en la lección 24 para el `scrollregion`.

## Las etiquetas

Aquí está la herramienta que hace el `Canvas` manejable. Cualquier figura puede llevar etiquetas, y **cualquier método que acepte un identificador acepta una etiqueta**, actuando sobre todas las que la lleven:

```consola
>>> for i in range(5):
...     lienzo.create_rectangle(i*30, 200, i*30+20, 220, tags=("barra", f"barra{i}"))
...
>>> lienzo.find_withtag("barra")
(6, 7, 8, 9, 10)
>>> lienzo.itemconfigure("barra", fill="#0A84FF")
```

Esa última línea pinta las cinco de una vez. Con mil figuras sería la misma línea.

El patrón que conviene adoptar desde el principio es **dos etiquetas por figura**: una del grupo y otra propia. La del grupo sirve para operar en masa y para borrar; la propia, para localizar una concreta sin guardar su número.

```consola
>>> lienzo.gettags(6)
('barra', 'barra0', 'todas')
```

Y borrar un grupo entero es una línea:

```consola
>>> lienzo.delete("barra")
>>> lienzo.find_all()
(1, 3, 4, 5)
```

Eso es el patrón central de cualquier dibujo que se regenere: **borra por etiqueta y vuelve a dibujar.** Un gráfico que cambia cuando llegan datos nuevos no se actualiza figura por figura, se borra con `delete("grafico")` y se dibuja otra vez. Es más simple, más difícil de equivocar, y resuelve de paso el problema de los identificadores caducados, porque ya no guardas ninguno.

Hay dos etiquetas que Tk se reserva. `"all"` significa todas las figuras, y `"current"` la que está bajo el puntero, que es de la lección siguiente.

> [!error] `itemconfigure` sobre un grupo mezclado falla a medias
>
> La comodidad de `itemconfigure("barra", fill="azul")` tiene un límite que conviene conocer antes de tropezar, porque el tropiezo es sucio. Las opciones no son las mismas en todas las figuras, y si el grupo mezcla tipos, la llamada puede pedir algo que unas entienden y otras no:
>
> ```consola
> >>> r = lienzo.create_rectangle(0, 0, 50, 50, outline="black", tags="grupo")
> >>> t = lienzo.create_text(10, 10, text="x", tags="grupo")
> >>> lienzo.itemconfigure("grupo", outline="red")
> _tkinter.TclError: unknown option "-outline"
> ```
>
> Lógico, porque un texto no tiene borde. Lo que no es lógico es lo que queda después:
>
> ```consola
> >>> lienzo.itemcget(r, "outline")
> 'red'
> ```
>
> **El rectángulo sí ha cambiado.** Tk recorre las figuras en orden y va aplicando, y al llegar a la primera que no entiende la opción lanza el error y se detiene. El resultado es un cambio a medias más una excepción: unas figuras con el color nuevo, otras con el viejo, y el dibujo en un estado que no habías previsto.
>
> Y hay una variante peor, sin excepción que te avise. Algunas opciones existen en varias figuras **significando cosas distintas**: `width` en un rectángulo es el grosor del borde, y en un texto es el ancho al que se parte en líneas. Así que esto no falla:
>
> ```consola
> >>> lienzo.itemconfigure("grupo", width=3)
> ```
>
> Y deja el rectángulo con un borde de tres píxeles y el texto partiéndose cada tres píxeles, o sea ilegible, sin decir nada.
>
> De ahí sale una regla de diseño para las etiquetas: **las etiquetas con las que vayas a dar estilo tienen que agrupar figuras del mismo tipo.** El patrón que funciona es tener etiquetas de dos clases. Unas de estructura, que agrupan todo lo que forma una cosa y sirven para mover, borrar y atar eventos; y otras de tipo, más finas, para `itemconfigure`. En el ejemplo del gráfico las barras llevan `barra` y los rótulos `etiqueta` precisamente por esto, aunque las tres comparten `grafico`.

## Consultar el lienzo

La familia `find_*` responde a «qué hay ahí». Son cinco y cada una contesta una pregunta distinta:

```consola
>>> lienzo.find_all()
(1, 2, 3)
>>> lienzo.find_withtag("barra")
(6, 7, 8, 9, 10)
>>> lienzo.find_overlapping(60, 60, 70, 70)
(1, 2, 3)
>>> lienzo.find_enclosed(0, 0, 200, 200)
(2, 3)
>>> lienzo.find_closest(10, 10)
(1,)
```

`find_overlapping` da las que **tocan** el rectángulo que le pasas, aunque sea por una esquina; `find_enclosed` solo las que caben **enteras** dentro. La diferencia se ve en el ejemplo: tres figuras tocan la zona central, pero solo dos están completamente dentro del lienzo.

Y `find_closest` tiene una trampa que hay que conocer antes de usarla para detectar clics:

```consola
>>> lienzo.find_closest(199, 199)      # una zona vacía
(2,)
```

**`find_closest` nunca devuelve vacío.** Busca la más cercana, y en un lienzo con figuras siempre hay una más cercana, por lejos que esté. Si lo usas para saber qué se ha pulsado, pulsar en el fondo te devolverá una figura cualquiera y tu programa creerá que se ha hecho clic en ella. Para detectar clics lo correcto es `find_overlapping` con un rectángulo pequeño alrededor del punto, o directamente `tag_bind`, que es lo de la lección siguiente.

## El orden de apilado

Las figuras se dibujan en el orden en que se crearon, y las últimas tapan a las primeras. `find_all` devuelve ese orden, de abajo a arriba:

```consola
>>> c.find_all()
(1, 2, 3)
```

Y se puede cambiar, con el efecto visible en la propia lista:

```consola
>>> c.tag_raise("fondo")       # "fondo" es la etiqueta de la figura 1
>>> c.find_all()
(2, 3, 1)
```

La figura 1 ha pasado al final, o sea arriba. `tag_raise` sube al frente y `tag_lower` manda al fondo, y las dos aceptan etiquetas, con lo que se puede subir un grupo entero. Para preguntar por vecinos concretos hay `find_above` y `find_below`.

Esto importa más de lo que parece en cuanto dibujas algo con capas. Si pintas una rejilla de fondo después de las barras de un gráfico, la rejilla las tapa; el arreglo es `tag_lower("rejilla")` y no reordenar el código.

## Esconder, escalar y mover

Una figura tiene tres estados posibles, y el intermedio es útil:

```consola
>>> lienzo.itemconfigure(f, state="hidden")
>>> lienzo.bbox(f)            # devuelve None
>>> lienzo.find_all()
(1,)
>>> lienzo.find_overlapping(0, 0, 200, 200)
()
```

Con `hidden` la figura **sigue existiendo** (está en `find_all`) pero no se dibuja, no ocupa y no se encuentra. Es la forma de apagar algo sin perderlo, mucho más barata que borrar y volver a crear. Con `disabled` sí se ve y sí se encuentra, pero ignora los eventos. Y Tk enumera los tres si te equivocas:

```consola
>>> lienzo.itemconfigure(f, state="z")
_tkinter.TclError: bad state value "z": must be normal, hidden, or disabled
```

`move` y `scale` funcionan sobre etiquetas, así que mueven o escalan grupos:

```consola
>>> c.scale("all", 0, 0, 2, 2)      # el doble, desde el origen
>>> c.coords(r)
[20.0, 20.0, 100.0, 100.0]
>>> c.move("all", 5, 5)
>>> c.coords(r)
[25.0, 25.0, 105.0, 105.0]
```

Con un aviso sobre `scale`, porque es lo primero que se intenta para hacer un zoom y no vale:

```consola
>>> c.scale("all", 0, 0, 3, 3)
>>> c.itemcget(t, "font")
'Helvetica 12'
```

**`scale` solo toca las coordenadas.** No cambia el grosor de los bordes ni el tamaño de las fuentes, así que al ampliar al triple el dibujo se estira pero las letras se quedan iguales y las líneas se quedan finas. Un zoom de verdad hay que hacerlo recalculando y redibujando, que es otra razón para el patrón de borrar por etiqueta y volver a dibujar.

## Un gráfico de barras

Dibujar un gráfico es donde todo esto se junta, y es además el uso más habitual del widget: que el dato se convierta en un dibujo que se adapta al tamaño de la ventana.

```python title="lienzo.py"
"""Canvas: dibujar un gráfico de barras que se redibuja al cambiar el tamaño."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

# Margen interior del gráfico: hueco para las etiquetas de los ejes.
IZQUIERDA, DERECHA, ARRIBA, ABAJO = 48, 16, 16, 32

DATOS = {"Enero": 1240, "Febrero": 1580, "Marzo": 980, "Abril": 1720,
         "Mayo": 2010, "Junio": 1460}

AZUL = "#0A84FF"
GRIS = "#8E8E93"
REJILLA = "#D8D8DC"


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def dibujar(evento=None):
        """Borra por etiqueta y vuelve a dibujar. Nunca guarda identificadores."""
    lienzo.delete("grafico")

    # winfo_width y no cget("width"): el tamaño real, no el pedido.
    ancho = lienzo.winfo_width()
    alto = lienzo.winfo_height()
    if ancho < 60 or alto < 60:          # aún no tiene tamaño de verdad
                return

    x0, y0 = IZQUIERDA, ARRIBA
    x1, y1 = ancho - DERECHA, alto - ABAJO
    if x1 <= x0 or y1 <= y0:
                return

    tope = max(DATOS.values())
    escala = redondear_arriba(tope)

    dibujar_rejilla(x0, y0, x1, y1, escala)
    dibujar_barras(x0, y0, x1, y1, escala)

    # La rejilla se dibujó primero, pero por si acaso: al fondo.
    lienzo.tag_lower("rejilla")


def redondear_arriba(valor):
        """El tope del eje, redondeado a una cifra cómoda."""
    paso = 10 ** (len(str(int(valor))) - 1)
    return (int(valor) // paso + 1) * paso


def dibujar_rejilla(x0, y0, x1, y1, escala):
        """Cinco líneas horizontales con su valor a la izquierda."""
    for n in range(6):
        # La y se resta: en el Canvas el eje crece hacia abajo.
                y = y1 - (y1 - y0) * n / 5
        valor = escala * n / 5
        lienzo.create_line(x0, y, x1, y, fill=REJILLA,
                           tags=("grafico", "rejilla"))
        lienzo.create_text(x0 - 6, y, text=f"{valor:,.0f}".replace(",", "."),
                           anchor="e", fill=GRIS, font=("Helvetica", 10),
                           tags=("grafico", "rejilla"))


def dibujar_barras(x0, y0, x1, y1, escala):
        """Una barra por dato, con su nombre debajo y su cifra encima."""
    cuantas = len(DATOS)
    hueco = (x1 - x0) / cuantas
    grosor = hueco * 0.6

    for n, (nombre, valor) in enumerate(DATOS.items()):
                centro = x0 + hueco * (n + 0.5)
        altura = (y1 - y0) * valor / escala
        # Dos etiquetas: la del grupo y una propia para localizarla.
        lienzo.create_rectangle(centro - grosor / 2, y1 - altura,
                                centro + grosor / 2, y1,
                                fill=AZUL, outline="",
                                tags=("grafico", "barra", f"mes{n}"))
        lienzo.create_text(centro, y1 + 6, text=nombre, anchor="n",
                           fill=GRIS, font=("Helvetica", 10),
                           tags=("grafico", "etiqueta"))
        lienzo.create_text(centro, y1 - altura - 4, text=f"{valor}",
                           anchor="s", fill=AZUL, font=("Helvetica", 10),
                           tags=("grafico", "cifra"))


def resaltar():
        """Por etiqueta, no por identificador: así no hay nada que caduque."""
    global resaltado
    resaltado = not resaltado
    lienzo.itemconfigure("barra", fill=GRIS if resaltado else AZUL)
    mayor = max(range(len(DATOS)), key=lambda n: list(DATOS.values())[n])
    if resaltado:
                lienzo.itemconfigure(f"mes{mayor}", fill=AZUL)


def alternar_cifras():
        """hidden en vez de borrar: la figura sigue ahí, solo no se dibuja."""
    global cifras_visibles
    cifras_visibles = not cifras_visibles
    lienzo.itemconfigure("cifra",
                         state="normal" if cifras_visibles else "hidden")


def contar():
        estado.set(f"{len(lienzo.find_all())} figuras en el lienzo, "
               f"{len(lienzo.find_withtag('barra'))} barras. "
               f"Ocupado: {lienzo.bbox('all')}")


ventana = tk.Tk()
ventana.title("Gráfico")
ventana.minsize(560, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
resaltado = False
cifras_visibles = True
estado = tk.StringVar(value="Cambia el tamaño de la ventana")

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

# highlightthickness=0 quita el marco de foco, que en un lienzo estorba.
lienzo = tk.Canvas(cuerpo, background="white", highlightthickness=0,
                   borderwidth=1, relief="solid")
lienzo.pack(fill="both", expand=True)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x", pady=(MARGEN, 0))
ttk.Button(botones, text="Resaltar el mayor", command=resaltar).pack(side="left")
ttk.Button(botones, text="Cifras", command=alternar_cifras).pack(
    side="left", padx=AIRE)
ttk.Button(botones, text="Contar", command=contar).pack(side="left")

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS,
          wraplength=500, justify="left").pack(anchor="w", pady=(AIRE, 0))

# El <Configure> del lienzo: cada cambio de tamaño lo redibuja entero.
lienzo.bind("<Configure>", dibujar)

centrar(ventana)
ventana.mainloop()
```

Arrastra la esquina de la ventana y el gráfico se recalcula solo, porque el `<Configure>` del lienzo llama a `dibujar` y `dibujar` empieza borrando. Esa es la estructura que conviene copiar: **una función que dibuja el estado actual entero, y nada más que la llame**. No hay ningún identificador guardado en todo el programa, y por eso los botones de resaltar y de esconder cifras siguen funcionando después de veinte redibujados.

Fíjate en tres cosas concretas. La `y` de la rejilla y de las barras se calcula **restando** de `y1`, porque el eje crece hacia abajo. El tamaño se pregunta con `winfo_width()` y no con `cget("width")`, por lo de los centímetros. Y hay una guarda al principio que no dibuja si el lienzo mide menos de 60 píxeles, porque el primer `<Configure>` llega antes de que el widget tenga su tamaño de verdad y sin ella el primer dibujo sale absurdo.

> [!consejo] Cuándo `Canvas` y cuándo no
>
> El `Canvas` es el widget más potente del módulo y por eso se usa de más. Tres casos donde parece la respuesta y no lo es:
>
> - **Para tablas, un `Treeview`.** Dibujar filas y columnas a mano en un lienzo es posible y es meterse en un trabajo enorme, con la selección, el orden y el desplazamiento por resolver. La lección siguiente a estas dos es justo esa.
> - **Para colocar widgets en sitios raros, `place`.** Si lo que quieres es un widget en una posición concreta, `place` lo hace, y `create_window` solo compensa si además hace falta desplazarlo.
> - **Para un texto con formato, un `Text`.** Con sus tags hace negritas, colores y enlaces sin que tú calcules ni un píxel.
>
> El `Canvas` es la respuesta cuando lo que hay es **geometría**: gráficos, diagramas, mapas, un editor de figuras, un juego, cualquier cosa donde la posición signifique algo. Si estás calculando coordenadas para conseguir una disposición que un gestor de geometría te daría hecha, es señal de que el widget es otro.

> [!resumen] En resumen
>
> El `Canvas` es una superficie donde colocas figuras tú, y lo que hay dentro no son objetos de Python sino figuras identificadas por un entero, que se manipulan pidiéndole al lienzo que actúe sobre ese número. Solo existe en la familia clásica, y su tamaño de fábrica viene en centímetros, `'10c'`, una cadena con unidad que rompe cualquier `int()`, de modo que para saber cuánto mide hay que usar `winfo_width` y no `cget`. El origen está arriba a la izquierda y la `y` crece hacia abajo, lo que obliga a restar al dibujar cualquier cosa que suba; las coordenadas no están limitadas por el tamaño del lienzo, así que una figura puede existir sin verse, y Tk las normaliza, con lo que no recuperas el orden en que las escribiste. Hay nueve métodos `create_*`, sin ninguno para el círculo, que se hace con `create_oval`; el `anchor` de fábrica del texto es `center`, y el relleno se llama `fill` en todas las figuras mientras `outline` solo existe en las cerradas. Los identificadores nunca se reciclan, pero usar uno caducado **no da ningún error**: `type` devuelve `None`, `coords` una lista vacía, `bbox` un `None` que rompe el desempaquetado, e `itemconfigure` no protesta, lo que produce un programa que no hace nada y no falla. La solución es no guardar identificadores y trabajar con etiquetas, que no caducan, admiten grupos y hacen que `itemconfigure("barra", ...)` pinte cien figuras de una vez. `coords` son los puntos que definen la figura y `bbox` lo que ocupa dibujada, borde incluido, y en el texto `bbox` es la única forma de saber cuánto mide, porque depende de la fuente. La familia `find_*` consulta el lienzo, con el cuidado de que `find_closest` nunca devuelve vacío y por tanto no sirve para detectar clics. El orden de apilado es el de creación, se cambia con `tag_raise` y `tag_lower`, y se lee en `find_all`. `state="hidden"` apaga una figura sin perderla, y `scale` solo toca coordenadas, no fuentes ni grosores, así que no sirve para un zoom. El patrón que resuelve casi todo es borrar por etiqueta y volver a dibujar el estado entero.

> [!ejercicio] Practica
>
> Trabaja en un fichero `25-lienzo.py` salvo donde se indique otra cosa:
>
> 1. Crea un lienzo sin darle tamaño y muestra `cget("width")`, `winfo_reqwidth()` e `int(cget("width"))`. Anota qué pasa con el último.
> 2. Dibuja un cuadrado, un círculo y una línea roja. Consigue que la línea sea roja y anota qué opción no funciona y por qué.
> 3. Dibuja un texto en `(0, 0)` y mira qué se ve. Arréglalo con `anchor` y comprueba con `bbox` dónde estaba realmente.
> 4. Crea un rectángulo, guarda su identificador, bórralo y después intenta pintarlo, moverlo y leer su `bbox`. Anota cuántos errores da. Comprueba con `type()`.
> 5. Escribe en `25-etiquetas.py` veinte círculos con las etiquetas `("punto", f"punto{i}")`. Píntalos todos de azul en una línea, pon el número 7 en rojo, esconde los pares y bórralos todos de una vez.
> 6. Dibuja un texto con `font=("Helvetica", 10)` y otro igual con 30. Usa `bbox` para dibujar un rectángulo ajustado detrás de cada uno.
> 7. Dibuja tres rectángulos que se solapen y experimenta con `tag_raise`, `tag_lower`, `find_above` y `find_below`, mirando cómo cambia `find_all` cada vez.
> 8. Compara `find_overlapping`, `find_enclosed` y `find_closest` sobre la misma zona, incluyendo un punto donde no haya nada, y explica cuál usarías para detectar un clic.
> 9. Añade al gráfico del ejemplo un segundo grupo de barras en otro color, desplazadas a la derecha, sin guardar ningún identificador.
