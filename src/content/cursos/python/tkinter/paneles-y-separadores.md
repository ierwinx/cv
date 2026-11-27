---
titulo: "Paneles y separadores: PanedWindow y Separator"
resumen: "Divisiones que se arrastran: la regla exacta de weight, el sashpos que solo funciona cuando el widget ya mide algo, el panel que se puede encoger hasta desaparecer, y el separador de un píxel que no se ve."
minutos: 23
orden: 29
---

Dos widgets en una lección, porque son pequeños y están relacionados: los dos dividen el sitio. La diferencia es quién manda. Un `Separator` dibuja una línea donde tú decides; un `PanedWindow` dibuja una división **que se puede arrastrar**, y a partir de ahí el reparto lo decide quien use el programa.

El `PanedWindow` es el que cierra el patrón que quedó prometido en la lección anterior: cuando hay más de cinco secciones, en vez de pestañas se pone una lista de categorías a la izquierda y el contenido a la derecha, con una división arrastrable en medio. Es el diseño de los diálogos de preferencias grandes, de los clientes de correo y de los editores de código, y el ejemplo de esta lección lo monta.

Y trae dos cosas que hacen perder tiempo: una opción `weight` que casi todo el mundo interpreta mal, y un `sashpos` que no funciona si lo llamas en el momento natural.

> [!objetivo] Qué vas a aprender
>
> Montar paneles arrastrables en los dos sentidos; entender la regla exacta con la que se reparte el espacio y qué hace de verdad `weight`; colocar la división desde el código sabiendo por qué falla si se hace antes de tiempo; saber qué se pierde al usar la versión temática y cuándo bajar a la clásica; y usar el `Separator` sin que quede invisible.

## El temático es mucho más pobre

Aquí hay que elegir familia con criterio, porque la diferencia es grande.

```consola
>>> sorted(ttk.Panedwindow(ventana).configure().keys())
['class', 'cursor', 'height', 'orient', 'style', 'takefocus', 'width']
```

Siete opciones. Y lo que le falta respecto al clásico:

```consola
>>> sorted(set(tk.PanedWindow(ventana).configure()) - set(ttk.Panedwindow(ventana).configure()))
['background', 'bd', 'bg', 'borderwidth', 'handlepad', 'handlesize',
 'opaqueresize', 'proxybackground', 'proxyborderwidth', 'proxyrelief',
 'relief', 'sashcursor', 'sashpad', 'sashrelief', 'sashwidth', 'showhandle']
```

Casi todo eso es aspecto de la división y no importa. Lo que sí importa es lo de los paneles, y ahí la diferencia es seria:

```consola
>>> sorted(paneles.pane(0).keys())               # ttk
['weight']
>>> sorted(clasico.paneconfigure(panel).keys())  # tk
['after', 'before', 'height', 'hide', 'minsize', 'padx', 'pady', 'sticky',
 'stretch', 'width']
```

**Un panel temático tiene una sola opción, `weight`.** El clásico tiene diez, y entre ellas `minsize`, que es la que se echa en falta:

```consola
>>> clasico.add(izquierda, minsize=120)
>>> clasico.sash_place(0, 10, 0)        # intentamos dejarlo en 10
>>> clasico.sash_coord(0)
(121, 1)
```

Ha respetado el mínimo. En la versión temática **eso no existe**, y un panel se puede arrastrar hasta desaparecer del todo, dejando una interfaz en la que falta media pantalla y no hay forma obvia de recuperarla más que encontrar la división y volver a tirar de ella.

> [!consejo] Cuál usar
>
> Como en el `Scale` de la lección 22, aquí el clásico hace más cosas. El criterio:
>
> - **`ttk.Panedwindow`** cuando los paneles tienen contenido que aguanta cualquier tamaño y quieres el aspecto del sistema. Es el caso normal y es lo que usa el ejemplo.
> - **`tk.PanedWindow`** cuando necesitas `minsize` de verdad, porque hay un panel que no tiene sentido por debajo de cierto ancho. Un panel con una lista de categorías de una palabra puede quedarse en cuarenta píxeles y seguir siendo usable; uno con un formulario, no.
>
> Y hay una tercera opción que a menudo es la mejor: **no usar paneles**. Si el reparto no tiene por qué cambiar, dos `Frame` con `grid` y su `columnconfigure` con pesos hacen el mismo reparto, se ven mejor y no hay nada que se pueda romper arrastrando. Los paneles son para cuando el reparto correcto depende de lo que cada persona esté haciendo.

## Crear y añadir

Dos avisos de golpe en la primera línea:

```python
paneles = ttk.Panedwindow(cuerpo, orient="horizontal")
```

El primero es que **`orient` es de solo lectura**:

```consola
>>> paneles.configure(orient="vertical")
_tkinter.TclError: attempt to change read-only option
```

No se puede girar un `PanedWindow` después de crearlo. Si tu programa ofrece cambiar entre disposición horizontal y vertical, hay que destruir el widget y montarlo otra vez.

El segundo es que el valor de fábrica quizá no es el que esperas:

```consola
>>> str(ttk.Panedwindow(ventana).cget("orient"))
'vertical'
```

**Vertical**, o sea paneles uno encima de otro. Y `orient="horizontal"`, que es lo que se quiere la mayoría de las veces, significa que los paneles se colocan **en fila** y la división es vertical. Ese cruce de nombres despista: el `orient` describe cómo se reparten los paneles, no cómo se dibuja la línea que los separa.

Los paneles se añaden como las pestañas del `Notebook`:

```python
izquierda = ttk.Frame(paneles)
derecha = ttk.Frame(paneles)

paneles.add(izquierda, weight=1)
paneles.add(derecha, weight=3)
```

Y vale el mismo aviso de la lección anterior, medido también aquí:

```consola
>>> ajeno = ttk.Frame(ventana)          # hijo de la ventana, no del paned
>>> paneles.add(ajeno)
>>> ajeno.winfo_parent(), ajeno.winfo_ismapped()
('.', 0)
```

Aceptado sin error y nunca se ve. Y un nieto sí protesta:

```consola
>>> paneles.add(nieto)
_tkinter.TclError: cannot add ".!panedwindow.!frame.!frame" as content of ".!panedwindow"
```

Es exactamente lo que pasaba con el `Notebook`, así que se puede subir a regla general: **en los contenedores de `ttk`, el hijo que añades tiene que ser hijo directo del contenedor**, y si te equivocas puede que nadie te lo diga.

Los demás métodos son los esperables. `panes()` da la lista de nombres, `pane(n)` lee o cambia las opciones de un panel, `forget` lo quita, e `insert` lo pone en una posición o **mueve** uno que ya estaba:

```consola
>>> paneles.insert("end", primero)
>>> [paneles.pane(i)["weight"] for i in range(len(paneles.panes()))]
[2, 1, 1]
```

## Qué hace `weight` exactamente

Esta es la parte que se suele explicar mal, incluso a uno mismo. `weight` **no es la proporción de los paneles**. Medido con dos paneles en un ancho de 400:

| Lo que piden los hijos | `weight` | Dónde queda la división |
| --- | --- | --- |
| 100 y 100 | 1 y 1 | 198 |
| 100 y 100 | 1 y 3 | 149 |
| 300 y 50 | 1 y 3 | 312 |
| 150 y 150 | 0 y 1 | 150 |

La regla que explica las cuatro filas: **cada panel recibe primero el tamaño que pide, y lo que sobra se reparte según los pesos.**

Compruébalo con la segunda fila. Los hijos piden 100 y 100, o sea 200 de los 400; sobran 200, y con pesos 1 y 3 al primero le toca un cuarto, 50. Total para el primero: 100 + 50 = 150, y ahí está la división. Y la tercera fila: piden 300 y 50, sobran 50, un cuarto son 12,5, y la división sale en 312.

La cuarta fila es la más útil de recordar. Con **`weight=0` el panel no crece nunca**: se queda con lo que pide y todo el espacio de sobra se va al otro. Eso es justo lo que quieres para el panel de una lista de categorías o de una barra de herramientas lateral, donde ensanchar no aporta nada.

Y lo mismo vale al agrandar la ventana después:

```consola
>>> paneles.sashpos(0, 250)           # la movemos a mano
>>> paneles.sashpos(0)
250
>>> paneles.configure(width=800)      # de 400 a 800
>>> paneles.sashpos(0)
450
```

Los 400 píxeles nuevos se han repartido a partes iguales, y la división se ha quedado donde estaba más su parte. No vuelve a su sitio original, que es lo correcto: si alguien movió la división, mover la ventana no debe deshacerlo.

## `sashpos`, y por qué falla

Colocar la división desde el código es `sashpos(indice, posicion)`, con la posición en píxeles desde el borde. Con dos paneles hay una sola división, la cero:

```consola
>>> paneles.sashpos(1)
_tkinter.TclError: sash index 1 out of range
```

Y ahora el problema. Esto, que es lo que uno escribe, no funciona:

```python
paneles.add(izquierda, weight=0)
paneles.add(derecha, weight=1)
paneles.sashpos(0, 200)            # no hace nada útil
```

> [!error] `sashpos` necesita que el widget ya mida algo
>
> Medido en el momento en que se escribe normalmente, justo después de los `add`:
>
> ```consola
> >>> paneles.sashpos(0)
> 0
> >>> paneles.sashpos(0, 200)
> >>> paneles.sashpos(0)
> -5
> ```
>
> Un `-5`. No es que ignore la orden: es que el widget todavía no tiene tamaño, porque Tk no ha calculado el diseño, y colocar una división dentro de un ancho de cero da un número sin sentido. Y como el valor queda guardado, el resultado visible es una división en un sitio raro o un panel aplastado.
>
> La causa es la misma que la del `centrar()` de la lección 4, donde había que llamar a `update_idletasks()` antes de medir la ventana: **entre crear los widgets y que tengan tamaño hay un paso que no ha ocurrido todavía.** Aquí hay dos formas de esperarlo:
>
> ```python
> ventana.update_idletasks()         # calcula el diseño ahora
> paneles.sashpos(0, 200)
> ```
>
> ```python
> ventana.after_idle(lambda: paneles.sashpos(0, 200))   # hazlo cuando esté
> ```
>
> La segunda es la más limpia, porque no fuerza nada: `after_idle` ejecuta eso en cuanto Tk termina lo que tiene pendiente, que es justo después del primer diseño. Y si la posición inicial tiene que depender del tamaño real, lo correcto es hacerlo en un manejador del `<Configure>` la primera vez, con una bandera para no repetirlo.
>
> La alternativa que evita el problema del todo, y que conviene preferir: **no llamar a `sashpos` al arrancar.** Da a los hijos su tamaño natural y usa `weight=0` en el panel que no deba crecer; el reparto inicial sale bien sin colocar nada a mano. `sashpos` queda para lo que de verdad lo necesita, como restaurar la división que alguien dejó en la sesión anterior, y eso ya ocurre con el programa en marcha.

## El `Separator`

Después de eso, el `Separator` es un descanso. Es una línea, y tiene cinco opciones:

```consola
>>> sorted(ttk.Separator(ventana).configure().keys())
['class', 'cursor', 'orient', 'style', 'takefocus']
```

Ni color, ni grosor: eso lo pone el tema, y está bien que sea así porque una línea divisoria más gruesa que las del sistema canta enseguida.

Lo único que hay que saber es esto, y explica el desconcierto habitual:

```consola
>>> ttk.Separator(ventana, orient="horizontal").winfo_reqwidth()
1
>>> ttk.Separator(ventana, orient="horizontal").winfo_reqheight()
1
```

**Un píxel por un píxel.** Un separador no pide sitio a lo largo, solo su grosor, así que si lo colocas sin decirle que se estire, se dibuja un punto de un píxel y se da por hecho que el widget está roto. La línea que hay que escribir siempre:

```python
ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Separator(cuerpo, orient="vertical").pack(fill="y", padx=MARGEN)
```

`fill="x"` en el horizontal y `fill="y"` en el vertical, o con `grid`, `sticky="ew"` y `sticky="ns"`. Y el `pady` o `padx` importa casi tanto: una línea pegada al contenido no separa nada, porque lo que separa visualmente es el hueco, y la línea solo lo subraya.

> [!consejo] Tres formas de separar, y cuál elegir
>
> Esto aparece constantemente al montar una interfaz, y la respuesta casi nunca es la línea:
>
> - **Espacio en blanco.** Un `pady` mayor entre dos grupos separa perfectamente y no añade ningún elemento. Es la primera opción y la que mejor envejece.
> - **Un `LabelFrame`**, la lección siguiente, cuando cada grupo además necesita un título. Un marco con rótulo dice lo que separa, y una línea solo dice que hay un corte.
> - **Un `Separator`**, cuando hay que marcar un cambio de categoría sin poder añadir título ni más espacio. El caso claro es **antes de la fila de botones** de un diálogo, para despegarla del contenido, y dentro de un menú, donde de hecho no es este widget sino una entrada del propio menú, como se verá en la lección de la barra de menús.
>
> Y una regla de cantidad: si en una ventana hay tres o más separadores, casi siempre lo que falta es agrupar de otra manera, no más líneas.

## La lista de categorías

Este es el patrón que prometía la lección 28 para cuando hay demasiadas secciones para pestañas: un `Listbox` de categorías a la izquierda, el contenido a la derecha, y la división arrastrable.

```python title="paneles.py"
"""Panedwindow: lista de categorías a la izquierda y contenido a la derecha."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"

SECCIONES = {
    "General": ("Nombre del usuario", "Idioma", "Carpeta de trabajo"),
    "Aspecto": ("Tema", "Tamaño de la letra", "Densidad de la vista"),
    "Editor": ("Tabulación", "Ajuste de línea", "Número de línea",
               "Resaltado de sintaxis"),
    "Red": ("Servidor", "Puerto", "Tiempo de espera"),
    "Copias": ("Carpeta de destino", "Frecuencia", "Copias que se guardan"),
    "Atajos": ("Guardar", "Buscar", "Ir a la línea"),
    "Avanzado": ("Registro detallado", "Caché", "Reiniciar los ajustes"),
}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_paneles(contenedor):
        """orient='horizontal': los paneles van en fila y la división es vertical.

    Y es de solo lectura: no se puede girar después de crearlo.
    """
    paneles = ttk.Panedwindow(contenedor, orient="horizontal")
    paneles.pack(fill="both", expand=True)

    # Los dos paneles, hijos del Panedwindow. Si el padre fuera "contenedor",
    # add() los aceptaría sin error y no se verían nunca.
    izquierda = ttk.Frame(paneles)
    derecha = ttk.Frame(paneles, padding=(MARGEN, 0, 0, 0))

    # weight=0 en la lista: se queda con lo que pide y no crece.
    # Todo el espacio de sobra se va al contenido.
    paneles.add(izquierda, weight=0)
    paneles.add(derecha, weight=1)
    return paneles, izquierda, derecha


def crear_lista(panel):
        """La lista de categorías. exportselection=False, lección 20."""
    lista = tk.Listbox(panel, exportselection=False, activestyle="none",
                       borderwidth=1, relief="solid", highlightthickness=0,
                       width=16, height=len(SECCIONES))
    barra = ttk.Scrollbar(panel, orient="vertical", command=lista.yview)
    lista.configure(yscrollcommand=barra.set)      # las dos mitades

    barra.pack(side="right", fill="y")
    lista.pack(side="left", fill="both", expand=True)

    for nombre in SECCIONES:
                lista.insert("end", f"  {nombre}")
    lista.selection_set(0)
    return lista


def mostrar_seccion(evento=None):
        """Borra el contenido y lo vuelve a montar. Igual que el Canvas."""
    for hijo in contenido.winfo_children():
                hijo.destroy()

    indices = lista.curselection()          # índices, no valores
    if not indices:
                return
    nombre = list(SECCIONES)[indices[0]]

    ttk.Label(contenido, text=nombre,
              font=("Helvetica", 15, "bold")).pack(anchor="w")
    ttk.Separator(contenido, orient="horizontal").pack(fill="x",
                                                       pady=(AIRE, MARGEN))

    for campo in SECCIONES[nombre]:
                fila = ttk.Frame(contenido)
        fila.pack(fill="x", pady=AIRE)
        ttk.Label(fila, text=f"{campo}:", width=22, anchor="w").pack(
            side="left")
        ttk.Entry(fila).pack(side="left", fill="x", expand=True)

    describir()


def describir():
        estado.set(f"{len(SECCIONES)} secciones. "
               f"División en {paneles.sashpos(0)} px de {paneles.winfo_width()}. "
               f"Arrastra la línea vertical: la lista no crece sola porque "
               f"su weight es 0.")


def repartir():
        """sashpos con el programa en marcha sí funciona: ya hay tamaño."""
    paneles.sashpos(0, max(140, paneles.winfo_width() // 4))
    describir()


ventana = tk.Tk()
ventana.title("Preferencias")
ventana.minsize(640, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
estado = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

paneles, panel_izquierdo, panel_derecho = crear_paneles(cuerpo)
lista = crear_lista(panel_izquierdo)

contenido = ttk.Frame(panel_derecho)
contenido.pack(fill="both", expand=True)

# El Separator antes de los botones: es su caso más claro, y lleva fill="x"
# porque un separador solo pide un píxel y sin estirarse no se ve.
ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x")
ttk.Button(botones, text="Repartir", command=repartir).pack(side="left")
ttk.Button(botones, text="Guardar").pack(side="right")

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS, wraplength=580,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

lista.bind("<<ListboxSelect>>", mostrar_seccion)
mostrar_seccion()

# describir() mide la división, y aquí todavía no hay diseño: diría "0 px de 1".
# after_idle lo deja para cuando Tk termine, que es el mismo remedio que
# necesita sashpos.
ventana.after_idle(describir)

centrar(ventana)
ventana.mainloop()
```

Tres decisiones de ese programa son el resumen práctico de la lección. La lista lleva `weight=0`, así que al agrandar la ventana crece el contenido y la lista se queda como está, que es lo que tiene sentido. **No hay ningún `sashpos` al arrancar**: el reparto inicial sale del ancho que pide el `Listbox` más el `weight`, y el botón «Repartir» demuestra que con el programa ya en marcha `sashpos` funciona sin ningún truco. Y el `Separator` de antes de los botones lleva su `fill="x"` y su `pady`, sin los cuales no sería más que un punto.

> [!resumen] En resumen
>
> El `PanedWindow` divide el sitio con una separación que se puede arrastrar, y es el patrón correcto cuando hay demasiadas secciones para pestañas: lista de categorías a la izquierda y contenido a la derecha. La versión temática tiene siete opciones y sus paneles **una sola**, `weight`, mientras la clásica tiene `minsize`, `sticky` y `stretch` por panel; la consecuencia práctica es que en `ttk` un panel se puede arrastrar hasta desaparecer y no hay forma de impedirlo, que es la razón para bajar a `tk.PanedWindow` cuando algún panel tiene un ancho mínimo real. El `orient` es **de solo lectura**, no se puede girar después, y su valor de fábrica es `vertical`, con el detalle de que describe cómo se reparten los paneles y no cómo se dibuja la línea. Los paneles se añaden como las pestañas y vale la misma advertencia, ya medida dos veces y por tanto regla general de los contenedores de `ttk`: el hijo tiene que ser hijo directo, y un hermano se acepta sin error y no se ve nunca. `weight` no es la proporción de los paneles: **cada panel recibe primero el tamaño que pide y lo que sobra se reparte según los pesos**, de modo que `weight=0` significa que ese panel no crece nunca, que es justo lo que quieres para una lista lateral; y al agrandar la ventana la división conserva su posición más su parte del espacio nuevo, sin deshacer lo que alguien hubiera arrastrado. `sashpos` coloca la división, pero **falla si el widget no tiene tamaño todavía**: llamado justo después de los `add` devuelve valores absurdos como `-5`, y hay que esperar al primer diseño con `update_idletasks` o, mejor, con `after_idle`; la alternativa que evita el problema es no llamarlo al arrancar y dejar que el reparto salga de los tamaños naturales y los pesos. El `Separator` es una línea con cinco opciones, sin color ni grosor porque los pone el tema, y pide **un píxel por un píxel**, así que sin `fill="x"` o `fill="y"` se dibuja un punto y parece estropeado; además necesita hueco alrededor, porque lo que separa es el espacio y la línea solo lo subraya. Antes de poner una línea conviene probar con más espacio en blanco o con un marco con título.

> [!ejercicio] Practica
>
> Trabaja en un fichero `29-paneles.py` salvo donde se indique otra cosa:
>
> 1. Monta un `ttk.Panedwindow` sin decirle el `orient` y mira en qué dirección quedan los paneles. Intenta cambiarlo con `configure` y lee el error.
> 2. Crea dos paneles con etiquetas dentro y arrastra la división hasta el extremo. Comprueba que un panel puede desaparecer por completo.
> 3. Repite el ejercicio anterior con `tk.PanedWindow` y `minsize=120` en los dos paneles, y compara.
> 4. Escribe en `29-pesos.py` dos paneles con hijos que pidan 100 píxeles cada uno, y prueba los pesos `1 y 1`, `1 y 3` y `0 y 1`. Anota dónde queda la división en cada caso y comprueba la regla con lápiz.
> 5. Con los pesos `1 y 1`, mueve la división a mano y después agranda la ventana. Explica por qué la división no vuelve al centro.
> 6. Llama a `sashpos(0, 200)` justo después de los `add` y muestra lo que devuelve `sashpos(0)`. Después arréglalo con `after_idle` y compara.
> 7. Pon un `Separator` horizontal sin `fill` y mira qué se dibuja. Añade `fill="x"` y luego `pady`, y anota qué cambia en cada paso.
> 8. Coge el diálogo de pestañas de la lección 28 y conviértelo a este patrón, con las tres secciones en una lista a la izquierda. Decide cuál de los dos prefieres para tres secciones y para diez.
