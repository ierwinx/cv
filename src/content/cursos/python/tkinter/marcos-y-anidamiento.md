---
titulo: "Marcos y anidamiento"
resumen: "El widget invisible que estructura toda interfaz: por qué se anidan los marcos, cómo dividir una ventana en bloques y una función por bloque."
minutos: 17
orden: 11
---

Las tres lecciones anteriores han explicado los gestores por separado, y las dos primeras terminaban con la misma advertencia: dentro de un contenedor solo puede mandar uno. Eso plantea un problema evidente. Una ventana real necesita una barra de herramientas en horizontal, un formulario en rejilla y unos botones alineados a la derecha, y esas tres cosas no se colocan igual.

La respuesta es el marco, y es tan importante que merece lección propia. Un `Frame` es un rectángulo vacío que no hace nada y normalmente ni se ve. Su única función es **ser un contenedor**, y con eso resuelve las dos cosas que hacen posible una interfaz de verdad: permite que cada zona use el gestor que le conviene, y permite pensar la ventana por bloques en vez de widget a widget.

> [!objetivo] Qué vas a aprender
>
> Usar marcos para dividir una ventana en bloques independientes, entender que cada marco tiene su propio gestor y su propio reparto de espacio, conocer las opciones de aspecto del marco y las diferencias entre `tk.Frame`, `ttk.Frame` y `LabelFrame`, controlar la propagación del tamaño, y organizar el código con una función por bloque.

## Un contenedor dentro de otro

Un marco se crea como cualquier widget, con su contenedor como primer argumento, y se coloca como cualquier widget:

```python
marco = tk.Frame(ventana)
marco.pack(side="top", fill="x")
```

Lo nuevo es lo que se puede hacer después: meterle cosas dentro, pasándole el marco como contenedor en lugar de la ventana.

```python
tk.Button(marco, text="Guardar").pack(side="left")
```

Ese cambio de primer argumento es todo el mecanismo. Ya viste en la lección del sistema de widgets que la interfaz es un árbol y que el primer argumento construye ese árbol; el marco es la pieza con la que se le añaden ramas.

La consecuencia importante es esta: **el marco es un contenedor completamente independiente**. Dentro de él, el reparto del espacio empieza de cero, con su propio gestor y su propia cavidad o su propia rejilla. Lo que pase dentro no afecta a lo de fuera, y al revés.

Por eso esto funciona sin ningún conflicto:

```python
marco = tk.Frame(ventana)
marco.pack(fill="x")              # el marco, colocado con pack
tk.Label(marco, text="Nombre").grid(row=0, column=0)   # su contenido, con grid
tk.Entry(marco).grid(row=0, column=1)
```

El error de mezclar gestores que viste en la lección de `pack` se refería a un mismo contenedor. Aquí hay dos: la ventana, donde manda `pack`, y el marco, donde manda `grid`.

## Las opciones del marco

Un `tk.Frame` es invisible por defecto, pero tiene bastantes opciones de aspecto:

| Opción | Qué hace |
| --- | --- |
| `bg` | Color de fondo. Es la forma rápida de ver dónde está el marco |
| `width`, `height` | Tamaño pedido en píxeles, que por defecto se ignora |
| `padx`, `pady` | Margen interior, entre el borde del marco y su contenido |
| `borderwidth` | Grosor del borde |
| `relief` | Estilo del borde |
| `highlightthickness` | Grosor del borde exterior de foco |
| `highlightbackground` | Color de ese borde exterior |
| `cursor` | Forma del puntero al pasar por encima |

`relief` acepta seis valores, y Tk los enumera si te equivocas:

```consola
>>> marco.configure(relief="z")
_tkinter.TclError: bad relief "z": must be flat, groove, raised, ridge, solid, or sunken
```

De los seis, los útiles hoy son `flat`, que es el valor por defecto y significa sin borde, y `solid`, una línea limpia de un píxel. Los otros cuatro dibujan biseles en relieve que tenían sentido cuando las interfaces imitaban botones físicos y hoy se ven anticuados.

> [!consejo] El truco de los fondos de colores para depurar
>
> Cuando una interfaz no se coloca como esperas, lo más rápido es ponerle a cada marco un color de fondo distinto y ejecutar. De golpe se ve qué marco ocupa qué, cuál no está creciendo y cuál está aplastado. Es el equivalente visual de sembrar el código de `print`.
>
> Se quita cuando ya funciona, o mejor, se deja detrás de una constante `DEPURAR = False` para poder volver a encenderlo.

Y una alternativa que conviene conocer para las líneas divisorias: en vez de un borde, un marco de un píxel de alto pintado de color.

```python
tk.Frame(contenedor, bg="#D1D1D6", height=1).pack(fill="x", pady=8)
```

Eso da una línea fina y limpia, con el color que tú elijas, sin el aspecto tridimensional de los relieves clásicos. Es el recurso que usaba la ficha de la lección 7.

## `tk.Frame`, `ttk.Frame` y `LabelFrame`

Hay tres variantes y conviene saber cuál usar.

`ttk.Frame` es el que corresponde según el criterio del módulo, y tiene muchas menos opciones:

```consola
>>> sorted(ttk.Frame(ventana).configure().keys())
['borderwidth', 'class', 'cursor', 'height', 'padding', 'relief', 'style',
 'takefocus', 'width']
```

No tiene `bg` ni `padx` ni `pady`, porque el aspecto de `ttk` vive en el estilo. A cambio tiene `padding`, que sustituye a la pareja de rellenos y es más flexible:

```python
ttk.Frame(ventana, padding=12)              # 12 por los cuatro lados
ttk.Frame(ventana, padding=(12, 8))         # 12 horizontal, 8 vertical
ttk.Frame(ventana, padding=(12, 8, 12, 4))  # izquierda, arriba, derecha, abajo
```

`padding` es una de las mejores razones para preferir `ttk.Frame`: **el margen se declara una vez en el contenedor** en vez de repetir `padx` y `pady` en cada widget de dentro.

`LabelFrame` es un marco con un título escrito en su borde, que es la forma estándar de agrupar visualmente un conjunto de campos relacionados. Sus opciones son las del marco más seis:

```consola
>>> sorted(set(tk.LabelFrame(ventana, text="Datos").configure())
...        - set(tk.Frame(ventana).configure()))
['fg', 'font', 'foreground', 'labelanchor', 'labelwidget', 'text']
```

`text` es el título y `labelanchor` decide dónde va, con valores como `"nw"` para arriba a la izquierda, que es lo habitual, o `"n"` para centrado. `labelwidget` es más curioso: permite poner **un widget entero** como título en vez de un texto, que es como se consigue un grupo con una casilla de activar en su cabecera.

Hay versión temática, `ttk.LabelFrame`, y es la que conviene.

## La propagación del tamaño

Esta es la particularidad del marco que más desconcierta. Pones `width=200, height=100` y el marco mide otra cosa completamente distinta:

```consola
>>> marco = tk.Frame(ventana, width=200, height=100)
>>> marco.pack()
>>> tk.Label(marco, text="hola").pack()
>>> marco.winfo_width(), marco.winfo_height()
(32, 22)
```

Treinta y dos por veintidós, que es lo que mide la etiqueta que tiene dentro. El `200x100` se ha ignorado por completo.

La razón es la **propagación del tamaño**, que está activada por defecto: un contenedor adopta el tamaño que necesita su contenido, ignorando el que le hayas pedido. Tiene todo el sentido, porque es lo que hace que una ventana se ajuste sola a lo que lleva dentro, y es lo que quieres el noventa por ciento del tiempo.

Cuando no lo quieres, se desactiva:

```consola
>>> marco = tk.Frame(ventana, width=200, height=100)
>>> marco.pack_propagate(False)
>>> marco.pack()
>>> tk.Label(marco, text="hola").pack()
>>> marco.winfo_width(), marco.winfo_height()
(200, 100)
```

Ahora sí respeta el tamaño pedido. El método se llama según el gestor que use el contenido: `pack_propagate` si dentro se usa `pack`, `grid_propagate` si se usa `grid`.

Conviene desactivarlo **antes de meter contenido**, porque si no, el tamaño puede haberse calculado ya. Y conviene usarlo poco: un marco de tamaño fijo es un marco que no se adapta, con los mismos problemas que `place`. Los casos legítimos son las zonas que deben mantener un tamaño reservado pase lo que pase, como el panel de una previsualización o una zona de dibujo.

## Pensar la ventana por bloques

Aquí está el método de trabajo, que vale más que cualquier opción concreta.

Antes de escribir una línea, mira la ventana que quieres y **divídela en rectángulos grandes**. No pienses en widgets todavía: piensa en zonas. Una aplicación típica sale en cuatro o cinco: la barra superior, el panel lateral, el contenido, la fila de botones, la barra de estado.

Después, para cada zona, decide tres cosas:

1. **Dónde va en la ventana** y con qué gestor se coloca ahí.
2. **Qué gestor usa por dentro**, que puede ser otro distinto.
3. **Si crece o no** cuando la ventana crece.

Esa tercera pregunta es la que más se olvida y la que hay que contestar zona por zona. En una aplicación normal, la respuesta es que solo una zona crece de verdad, el contenido, y las demás mantienen su tamaño.

Con eso hecho, escribir el código es mecánico. Y hay un patrón de organización que conviene adoptar desde el principio: **una función por bloque**.

```python
def crear_barra(ventana):
        """Barra de herramientas superior."""
    barra = ttk.Frame(ventana, padding=(8, 6))
    barra.pack(side="top", fill="x")
    for texto in ("Nuevo", "Abrir", "Guardar"):
                ttk.Button(barra, text=texto).pack(side="left", padx=2)
    return barra
```

Cada función crea su marco, lo coloca, lo rellena y lo devuelve. El programa principal queda como un índice legible:

```python
crear_barra(ventana)
crear_lateral(ventana)
crear_contenido(ventana)
crear_estado(ventana)
```

Eso es exactamente lo que hace tu panel de control con sus métodos `_crear_toolbar`, `_crear_notebook` y `_crear_statusbar`. Es la misma idea de separar en funciones que ya aplicabas en la terminal, y aquí importa más todavía, porque una interfaz mediana pasa de las trescientas líneas con facilidad.

## Una ventana montada por bloques

```python title="bloques.py"
"""Una ventana dividida en zonas, con una función por bloque."""

import tkinter as tk
from tkinter import ttk

MARGEN = 8
AIRE = 4


def crear_barra(ventana):
        """Barra de herramientas: horizontal, no crece en alto."""
    barra = ttk.Frame(ventana, padding=(MARGEN, AIRE))
    barra.pack(side="top", fill="x")
    for texto in ("Nuevo", "Abrir", "Guardar"):
                ttk.Button(barra, text=texto).pack(side="left", padx=(0, AIRE))
    ttk.Separator(ventana, orient="horizontal").pack(fill="x")
    return barra


def crear_estado(ventana):
        """Barra de estado: se coloca antes que el contenido para ganar su franja."""
    ttk.Separator(ventana, orient="horizontal").pack(side="bottom", fill="x")
    estado = ttk.Label(ventana, text="Listo", padding=(MARGEN, AIRE))
    estado.pack(side="bottom", fill="x")
    return estado


def crear_lateral(ventana):
        """Panel lateral: vertical, ancho fijo, no crece a lo ancho."""
    lateral = ttk.Frame(ventana, padding=MARGEN)
    lateral.pack(side="left", fill="y")
    for texto in ("Resumen", "Ventas", "Equipo"):
                ttk.Button(lateral, text=texto, width=12).pack(fill="x", pady=AIRE)
    return lateral


def crear_contenido(ventana):
        """Contenido: el único que crece, y por dentro usa grid."""
    contenido = ttk.Frame(ventana, padding=MARGEN)
    contenido.pack(side="left", fill="both", expand=True)

    ttk.Label(contenido, text="Buscar colaborador",
              font=("Helvetica", 14, "bold")).grid(
        row=0, column=0, columnspan=2, sticky="w", pady=(0, MARGEN))

    ttk.Label(contenido, text="Nombre:").grid(row=1, column=0, sticky="w")
    ttk.Entry(contenido).grid(row=1, column=1, sticky="ew", padx=(AIRE, 0))

    ttk.Label(contenido, text="Área:").grid(row=2, column=0, sticky="w", pady=AIRE)
    ttk.Entry(contenido).grid(row=2, column=1, sticky="ew", padx=(AIRE, 0), pady=AIRE)

    resultados = tk.Listbox(contenido, height=6)
    resultados.grid(row=3, column=0, columnspan=2, sticky="nsew", pady=(MARGEN, 0))

    # El reparto, agrupado al final: crece la columna de campos y la fila de la lista.
    contenido.columnconfigure(1, weight=1)
    contenido.rowconfigure(3, weight=1)
    return contenido


ventana = tk.Tk()
ventana.title("Montada por bloques")
ventana.geometry("680x440")
ventana.minsize(520, 340)

crear_barra(ventana)
crear_estado(ventana)
crear_lateral(ventana)
crear_contenido(ventana)

ventana.mainloop()
```

Ese programa usa los dos gestores sin un solo conflicto. La ventana reparte sus zonas con `pack`. La barra y el lateral colocan sus botones con `pack`. Y el contenido usa `grid` por dentro, con su propio peso, que es independiente del de la ventana.

Al redimensionar, la barra y el estado mantienen su altura, el lateral mantiene su anchura, y el contenido absorbe todo el cambio: los campos se estiran a lo ancho y la lista crece en las dos direcciones.

> [!aviso] Un marco vacío no se ve, aunque esté ahí
>
> Un marco sin contenido y sin color de fondo mide cero por cero y es completamente invisible. Eso hace que un error tonto, como crear el marco y olvidar colocarlo, o meterle los widgets pasándole la ventana como contenedor en vez del marco, produzca una interfaz que no tiene nada mal aparentemente.
>
> El síntoma es siempre el mismo: los widgets aparecen, pero colocados como si el marco no existiera. La comprobación rápida es el truco de los fondos de colores, o recorrer el árbol con `winfo_children()` para ver quién cuelga de quién.

> [!consejo] No anides más de lo necesario
>
> Los marcos son baratos pero no gratis. Cada nivel de anidamiento es un reparto de espacio más, y con muchos niveles el redimensionado se vuelve difícil de razonar, porque el peso hay que configurarlo en cada uno.
>
> Una interfaz normal tiene dos o tres niveles: la ventana, sus zonas y algún marco interno para agrupar botones. Si te ves en el quinto nivel, casi siempre es que una rejilla con `columnspan` resolvía lo mismo en plano.

> [!resumen] En resumen
>
> El `Frame` es un rectángulo vacío cuya única función es contener otros widgets, y es lo que hace posible una interfaz real, porque cada marco es un contenedor independiente con su propio gestor y su propio reparto de espacio. Eso permite colocar un marco con `pack` en la ventana y usar `grid` dentro de él, que es lo normal y no un apaño. Sus opciones de aspecto son el fondo, el tamaño pedido, los márgenes interiores y el borde con sus seis relieves, de los que solo `flat` y `solid` se ven bien hoy; para una línea divisoria, un marco de un píxel de alto con color de fondo queda mejor que cualquier relieve. `ttk.Frame` tiene menos opciones porque su aspecto vive en el estilo, pero aporta `padding`, que declara el margen una sola vez en el contenedor en lugar de repetirlo en cada hijo. `LabelFrame` añade un título en el borde para agrupar campos relacionados. La propagación del tamaño está activada por defecto y hace que un marco adopte el tamaño de su contenido ignorando el `width` y el `height` pedidos; se desactiva con `pack_propagate(False)` o `grid_propagate(False)`, antes de meter contenido, y conviene usarlo poco. Y el método de trabajo es dividir la ventana en zonas antes de escribir código, decidir para cada una dónde va, qué gestor usa por dentro y si crece, y escribir una función por bloque que cree su marco, lo coloque, lo rellene y lo devuelva.

> [!ejercicio] Practica
>
> Trabaja en un fichero `11-marcos.py` salvo donde se indique otra cosa:
>
> 1. Coge el `bloques.py` de la lección y pon a cada marco un color de fondo distinto usando `tk.Frame` en lugar de `ttk.Frame`. Redimensiona y anota qué zona absorbe el cambio.
> 2. Comprueba la propagación: crea un marco de 200 por 100 con una etiqueta corta dentro, imprime su tamaño real, y después desactiva la propagación y vuelve a imprimirlo.
> 3. Escribe en `11-panel.py` una ventana con tres `LabelFrame` en la misma fila, titulados "Personales", "Contacto" y "Preferencias", cada uno con tres campos por dentro colocados con `grid`.
> 4. Convierte uno de esos `LabelFrame` en uno cuyo título sea una casilla de verificación, usando `labelwidget`, y haz que al desmarcarla se deshabiliten los campos de dentro.
> 5. Escribe una interfaz de tres niveles de anidamiento y haz que el widget del último nivel crezca con la ventana. Después quita el peso de un nivel intermedio y comprueba qué pasa.
> 6. Reescribe el `formulario.py` de la lección de `grid` repartiéndolo en funciones, una por bloque, de forma que el programa principal sean cuatro líneas legibles.
