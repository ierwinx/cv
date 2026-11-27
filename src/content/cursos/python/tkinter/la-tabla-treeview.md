---
titulo: "La tabla: Treeview"
resumen: "El widget de las tablas y los árboles: la columna cero que no está en la lista, los valores que vuelven con el tipo adivinado y destrozan un código postal, ordenar al pulsar la cabecera, y la edición de celdas que no existe."
minutos: 38
orden: 27
---

El `Treeview` es el widget más complicado del módulo y el que más trabajo ahorra. Es la respuesta a «necesito una tabla», que es una de las cosas que más se piden en un programa de escritorio, y también a «necesito un árbol», como el panel de carpetas de un explorador de ficheros. Son las dos cosas a la vez, y de ahí sale buena parte de su rareza.

Antes de nada, la comparación que conviene tener presente. En la lección 20 viste el `Listbox`, que muestra una lista de textos. El `Treeview` muestra **filas con columnas**, y además pueden colgar unas de otras. Si tus datos son una lista de cadenas, el `Listbox` es más simple y es el widget correcto; en cuanto cada elemento tiene más de un campo, el `Treeview` es el único candidato, porque dibujar una tabla a mano en un `Canvas` es meterse en un trabajo enorme.

Y hay un aviso que da sentido a media lección: **el `Treeview` no es un almacén de datos, es una vista.** Guarda lo que le metes convertido a texto de Tcl, y al recuperarlo pasa una cosa que está medida más abajo y que estropea códigos postales, teléfonos y referencias de producto. Los datos de verdad tienen que vivir en Python; el árbol solo los muestra.

> [!objetivo] Qué vas a aprender
>
> Montar una tabla con sus columnas y cabeceras, entendiendo la columna `#0` y la opción `show`; insertar filas con identificador propio; leer los valores **sin** que se corrompan; ordenar al pulsar una cabecera, con la trampa del orden alfabético; usar la jerarquía; distinguir selección de foco; pintar filas con etiquetas; filtrar con `detach` sin perder datos; saber dónde se ha pulsado con `identify_*`; y montar la edición de celdas, que el widget no trae.

## Solo existe en ttk

```consola
>>> hasattr(tk, "Treeview")
False
```

Es de la familia temática, y aquí eso es una gran noticia: un `Treeview` se ve como una tabla del sistema, con sus cabeceras y su fila resaltada, y eso a mano no se consigue.

## La columna que no está en la lista

Esta es la primera rareza y conviene entenderla antes de escribir nada. Las columnas se declaran al crear el widget:

```python
tabla = ttk.Treeview(caja, columns=("cantidad", "precio"))
```

Pero hay una columna más que no aparece ahí y que existe siempre:

```consola
>>> tabla.cget("columns")
('cantidad', 'precio')
>>> tabla.column("#0")
{'width': 200, 'minwidth': 20, 'separator': 0, 'stretch': 1, 'anchor': 'w', 'id': '#0'}
```

Esa es la **columna del árbol**, la número cero. Es la que dibuja los triángulos para desplegar, la que puede llevar iconos, y la que muestra el `text` de cada fila. Las columnas que declaras en `columns` son las de datos y van a su derecha.

De ahí sale la distinción que hay que tener clara:

- El **`text`** de una fila se muestra en `#0`.
- Los **`values`** de una fila se reparten por las columnas declaradas, en orden.

Y de ahí sale también la opción que decide qué aspecto tiene el widget:

```consola
>>> tuple(str(x) for x in ttk.Treeview(ventana).cget("show"))
('tree', 'headings')
```

| `show` | Qué se ve | Cuándo |
| --- | --- | --- |
| `"tree headings"` | La columna del árbol y las cabeceras. Es el valor de fábrica | Un árbol con datos, como un explorador con tamaños y fechas |
| `"headings"` | Solo las columnas de datos, sin la columna cero | **Una tabla normal.** Es lo que quieres casi siempre |
| `"tree"` | Solo el árbol, sin cabeceras | Un árbol sin datos, tipo índice |

Así que para una tabla corriente, la línea es esta, y el `show="headings"` no es opcional:

```python
tabla = ttk.Treeview(caja, columns=("nombre", "importe"), show="headings")
```

Sin él te queda una primera columna vacía a la izquierda, de doscientos píxeles, que no hay forma de quitar configurándola. Es el primer desconcierto de todo el mundo con este widget.

## Cabeceras y columnas

Son dos métodos distintos y se confunden. `heading` configura **la cabecera**: su texto, su alineación y qué pasa al pulsarla. `column` configura **la columna**: su ancho y la alineación del contenido.

```python
tabla.heading("nombre", text="Cliente", anchor="w")
tabla.heading("importe", text="Importe", anchor="e")

tabla.column("nombre", width=220, minwidth=140, stretch=True, anchor="w")
tabla.column("importe", width=100, minwidth=100, stretch=False, anchor="e")
```

Los valores de fábrica y sus consecuencias:

```consola
>>> tabla.column("nombre")
{'width': 200, 'minwidth': 20, 'separator': 0, 'stretch': 1, 'anchor': 'w', ...}
>>> str(tabla.heading("nombre")["anchor"])
'center'
```

Fíjate en el desajuste: la **columna** alinea a la izquierda y su **cabecera** al centro. Si no lo tocas, el título queda centrado sobre datos alineados a la izquierda, que es exactamente el detalle que hace que una tabla parezca descuidada. Conviene poner el `anchor` en los dos sitios y que coincidan, con la excepción clásica de las cifras: alineadas a la derecha en los dos.

`stretch` es la que más se agradece conocer. Con `stretch=True` la columna se reparte el espacio de sobra al agrandar la ventana, y con `stretch=False` se queda con su ancho. El reparto que funciona en casi cualquier tabla es **dejar que estire la columna de texto y fijar las de cifras y fechas**, porque esas tienen un ancho natural y estirarlas solo separa el número de su cabecera.

Y `width` es un ancho inicial, no una imposición: quien use el programa puede arrastrar los separadores. `minwidth` es el límite de ese arrastre, y ahí sí conviene poner algo razonable, porque de fábrica son 20 píxeles y una columna se puede dejar en nada.

## `height` se mide en filas

```consola
>>> ttk.Treeview(ventana, height=5).winfo_reqheight()
118
>>> ttk.Treeview(ventana, height=10).winfo_reqheight()
208
```

Cinco filas son 118 píxeles y diez son 208, o sea unos dieciocho por fila más el hueco de la cabecera. Es como el `Text` y el `Listbox`, y por tanto de las pocas cosas de este widget que no sorprenden. Diez filas es el valor de fábrica.

## Insertar filas

`insert` tiene una firma con más partes de las que parece:

```python
tabla.insert("", "end", iid="c-104", text="", values=("Ana Ruiz", 1250.40),
             tags=("pendiente",), open=False)
```

- El **primer argumento es el padre**: `""` significa la raíz, o sea una fila de primer nivel.
- El **segundo es la posición**: `"end"` al final, o un número para intercalar.
- `iid` es el identificador de la fila. Si no lo das, Tk inventa uno.
- `text` va a la columna `#0`, `values` a las columnas declaradas.

Los identificadores automáticos tienen esta forma:

```consola
>>> tabla.insert("", "end", text="Manzanas")
'I001'
>>> tabla.insert("", "end", text="Peras")
'I002'
```

Y aquí está la primera decisión de diseño que paga la pena tomar bien: **pon tú los identificadores** y que sean la clave de tus datos. Si la fila de un cliente tiene `iid="c-104"`, cuando alguien la seleccione tendrás directamente el cliente, sin buscar nada. Con los `I001` automáticos hace falta un diccionario de traducción que hay que mantener.

Lo único que hay que respetar es que no se repitan, y en eso el widget sí avisa, al contrario que el `Canvas` de las dos lecciones anteriores:

```consola
>>> tabla.insert("", "end", iid="uvas", text="Uvas")
'uvas'
>>> tabla.insert("", "end", iid="uvas", text="Otra")
_tkinter.TclError: Item uvas already exists
```

Y hay `exists` para comprobar antes:

```consola
>>> tabla.exists("uvas"), tabla.exists("nada")
(True, False)
```

Ese rigor es general. Operar sobre una fila borrada da error, lo que es una diferencia enorme con el `Canvas`:

```consola
>>> tabla.delete("uvas")
>>> tabla.item("uvas")
_tkinter.TclError: Item uvas not found
>>> tabla.delete("uvas")
_tkinter.TclError: Item uvas not found
```

Se agradece: aquí los errores se ven.

## Leer los valores

Y ahora el apartado importante de la lección. Hay dos formas de recuperar lo que metiste, y **no devuelven lo mismo**.

```consola
>>> fila = tabla.insert("", "end", values=("007", "10", "1.50"))
>>> tabla.item(fila)["values"]
[7, 10, '1.50']
>>> [tabla.set(fila, c) for c in ("codigo", "cantidad", "precio")]
['007', '10', '1.50']
```

Mira la primera línea con calma. Metiste **tres cadenas** y te devuelven un `7`, un `10` y un `'1.50'`. El `'007'` se ha convertido en el número siete y ha perdido los ceros; el `'10'` es un entero; y el `'1.50'`, que también parece un número, sigue siendo texto.

Medido sobre más casos, el patrón es este:

| Lo que metes | `item()["values"]` | `set()` |
| --- | --- | --- |
| `"007"` | `7` | `'007'` |
| `"0912345678"` | `912345678` | `'0912345678'` |
| `"28001"` | `28001` | `'28001'` |
| `"1.50"` | `'1.50'` | `'1.50'` |
| `"  5  "` | `5` | `'  5  '` |
| `"1_000"` | `1000` | `'1_000'` |
| `"1e3"` | `'1e3'` | `'1e3'` |
| `"0x10"` | `'0x10'` | `'0x10'` |

> [!error] `item()["values"]` adivina el tipo y te destroza los datos
>
> La lista de arriba no es una curiosidad, es una fuente de errores de los que llegan a producción. Tres consecuencias concretas:
>
> **Los ceros a la izquierda desaparecen.** Un teléfono `"0912345678"` vuelve como `912345678`, un código postal `"28001"` como entero, y `"007"` como `7`. Si eso se guarda de vuelta en un fichero o se manda a una base de datos, el dato queda corrompido, y el sitio donde se corrompió está a tres capas del sitio donde se nota.
>
> **Los tipos son incoherentes dentro de la misma fila.** En el ejemplo de arriba, la cantidad vuelve como `int` y el precio como `str`, porque los enteros se convierten y los decimales no. Así que un `sum(...)` sobre una columna funciona y sobre la otra falla, en la misma tabla.
>
> **Las dos formas de leer no coinciden.** `set(fila, "codigo")` devuelve `'007'` y `item(fila)["values"][0]` devuelve `7`. Dos líneas del mismo programa leyendo el mismo dato y obteniendo cosas distintas.
>
> De ahí salen dos reglas, y la segunda es la de verdad:
>
> 1. **Para leer del árbol, `set(fila, columna)`**, que devuelve siempre el texto tal cual se guardó. Si necesitas el número, conviértelo tú, que además es donde te vas a acordar de proteger la conversión.
> 2. **No uses el árbol como almacén.** Los datos viven en Python, en un diccionario o una lista de objetos, y el `Treeview` solo los muestra. Cuando alguien selecciona una fila, su `iid` te da la clave y vas a buscar el dato de verdad a tu estructura, donde el teléfono sigue teniendo su cero. Esto es lo mismo que se dijo del `Canvas` en la lección 26, y por el mismo motivo: una vista no es un almacén.

## Ordenar al pulsar la cabecera

Esto no viene hecho, pero es fácil y se espera de cualquier tabla. `heading` acepta un `command` que se llama al pulsar:

```python
def ordenar(columna, descendente=False):
        """Reordena moviendo las filas, sin borrar nada."""
    filas = [(tabla.set(fila, columna), fila) for fila in tabla.get_children("")]
    filas.sort(key=clave_de(columna), reverse=descendente)
    for posicion, (_, fila) in enumerate(filas):
                tabla.move(fila, "", posicion)
    # La próxima vez, al revés.
    tabla.heading(columna, command=lambda: ordenar(columna, not descendente))
```

La mecánica es `move`: se recorren las filas en el orden nuevo y cada una se manda a su posición. No se borra ni se vuelve a insertar nada, con lo que la selección y los identificadores se conservan.

Lo que no se puede olvidar es la conversión, porque el valor que da `set` es texto:

```consola
>>> ordenar("importe")                  # ordenando como texto
['1200', '340', '75', '9800']
>>> ordenar_por_numero("importe")       # convirtiendo a float
['75', '340', '1200', '9800']
```

Ese primer resultado es el error clásico de las tablas: 1200 antes que 75 porque el uno es menor que el siete. Y como el `Treeview` guarda todo como texto, **cada columna necesita saber cómo se ordena**. La forma limpia es declararlo junto a las columnas:

```python
COLUMNAS = {
    "nombre": {"titulo": "Cliente", "ancho": 200, "clave": str.lower},
    "importe": {"titulo": "Importe", "ancho": 100, "clave": float},
    "fecha": {"titulo": "Fecha", "ancho": 110, "clave": str},
}
```

Fíjate en el `str.lower` del nombre. Ordenar textos con `sort` a secas pone las mayúsculas antes que todas las minúsculas, así que «luis» acaba detrás de «Berta» y de «Carlos»:

```consola
>>> sorted(["Ana", "luis", "Berta", "Carlos"])
['Ana', 'Berta', 'Carlos', 'luis']
```

Correcto para un ordenador y raro para una persona. Con `key=str.lower` sale como se espera. Pero en español eso todavía no basta.

> [!aviso] `str.lower` manda las tildes al final de la tabla
>
> Es un fallo que se cuela en cualquier tabla de nombres en español y que no se ve hasta que aparece un Álvaro:
>
> ```consola
> >>> nombres = ["Ana", "luis", "Berta", "Álvaro", "Ñuño", "Óscar"]
> >>> sorted(nombres, key=str.lower)
> ['Ana', 'Berta', 'luis', 'Álvaro', 'Ñuño', 'Óscar']
> ```
>
> Álvaro, Ñuño y Óscar al final, después de la Z. El motivo es que ordenar cadenas compara puntos de código Unicode, y las letras con tilde están muy por encima de las básicas:
>
> ```consola
> >>> ord("a"), ord("z"), ord("á"), ord("ñ")
> (97, 122, 225, 241)
> ```
>
> `casefold` tampoco lo arregla, porque el problema no son las mayúsculas. La solución correcta es pedirle al sistema que ordene según el idioma, que es lo que hace `locale.strxfrm`:
>
> ```python
> import locale
>
> locale.setlocale(locale.LC_COLLATE, "")      # el idioma del sistema
> nombres.sort(key=locale.strxfrm)
> ```
>
> ```consola
> >>> sorted(nombres, key=locale.strxfrm)
> ['Álvaro', 'Ana', 'Berta', 'luis', 'Ñuño', 'Óscar']
> ```
>
> Ahora sí: la A con tilde entre las A, y la Ñ después de la N, que es como se ordena en español. Ese `""` de `setlocale` significa «lo que tenga configurado el sistema», y es lo que conviene usar en vez de escribir `"es_ES.UTF-8"` a mano, porque el nombre exacto del idioma cambia entre sistemas y la llamada lanza `locale.Error` si no existe. Envolverla en un `try` y quedarse con `str.lower` como reserva es razonable.
>
> Verás por ahí el truco de quitar las tildes con `unicodedata` para ordenar. Funciona para las vocales, pero convierte la «ñ» en «n», con lo que Ñuño se mezcla entre los nombres que empiezan por «nu». Para un listado en español, `locale.strxfrm`.

## La jerarquía

Para un árbol, el padre de cada fila es el primer argumento de `insert`:

```python
frutas = tabla.insert("", "end", text="Frutas", open=True)
tabla.insert(frutas, "end", text="Manzana")
tabla.insert(frutas, "end", text="Pera")
```

`open=True` lo crea desplegado. Y para recorrer o consultar:

```consola
>>> tabla.get_children("")          # las de primer nivel
('I001',)
>>> tabla.get_children(frutas)      # las hijas
('I002', 'I003')
>>> tabla.parent(hija)
'I001'
>>> tabla.parent(frutas)            # la raíz es cadena vacía
''
>>> tabla.index(hija)               # su posición entre sus hermanas
1
```

`get_children("")` con la cadena vacía son las de primer nivel, y eso hay que recordarlo porque `get_children()` sin argumento hace lo mismo pero se lee peor. Y como `parent` de una fila de primer nivel devuelve `""`, el mismo valor sirve de raíz en todas partes, lo que permite recorrer el árbol recursivamente sin casos especiales.

Hay dos eventos virtuales para enterarse de los despliegues, `<<TreeviewOpen>>` y `<<TreeviewClose>>`, y son la base de un árbol que carga sus hijos solo cuando hacen falta, como un explorador de ficheros que no recorre el disco entero al arrancar.

## Selección y foco no son lo mismo

```consola
>>> tabla.selection()
()
>>> tabla.selection_set("r1")
>>> tabla.selection()
('r1',)
>>> tabla.selection_add("r3")
>>> tabla.selection()
('r1', 'r3')
>>> tabla.selection_toggle("r1")
>>> tabla.selection()
('r3',)
```

`selection()` devuelve una tupla de identificadores, siempre, aunque solo haya uno. Es el detalle que hay que recordar al leerla: con `selectmode="browse"` sigue siendo una tupla de un elemento, no una cadena.

Y hay una segunda noción que se confunde con la selección:

```consola
>>> tabla.focus()
''
>>> tabla.focus("r2")
>>> tabla.focus(), tabla.selection()
('r2', ('r0', 'r2', 'r4'))
```

**El foco es la fila activa y la selección es el conjunto marcado**, y pueden no coincidir. Dar el foco a una fila no la selecciona. Para una tabla de selección simple los dos dicen casi siempre lo mismo y da igual cuál uses, pero con selección múltiple son cosas distintas: el foco es la fila desde la que se extiende la selección con las flechas.

Los tres modos:

```consola
>>> tabla.configure(selectmode="z")
_tkinter.TclError: bad selectmode "z": must be none, browse, or extended
```

`extended` es el de fábrica y permite varias con `Mayúsculas` y `Control`. `browse` permite solo una. Y `none` no permite ninguna, que sirve para una tabla de solo lectura donde la selección no significa nada.

Para enterarse de los cambios, `<<TreeviewSelect>>`:

```python
tabla.bind("<<TreeviewSelect>>", lambda evento: mostrar_detalle())
```

Aquí, al contrario que en el resto del bloque, el evento virtual es lo correcto: no hay ninguna variable de control que observar, así que no hay alternativa con `trace_add`.

## Pintar filas con etiquetas

Como en el `Canvas` y como en el `Text`, la herramienta son las etiquetas. Se declara el aspecto una vez y se aplica a las filas:

```python
tabla.tag_configure("negativo", foreground="#FF375F")
tabla.tag_configure("impar", background="#F2F2F7")

tabla.insert("", "end", values=("Devolución", -240), tags=("negativo",))
```

Lo que admite una etiqueta:

```consola
>>> sorted(tabla.tag_configure("cualquiera").keys())
['background', 'font', 'foreground', 'image', 'imageanchor', 'padding',
 'stripedbackground']
```

Colores, fuente y relleno, más una imagen para la columna cero. Y se puede preguntar quién la lleva:

```consola
>>> tabla.tag_has("negativo")
('I001', 'I003')
```

Eso convierte las etiquetas en una forma de marcar filas por su significado y luego operar sobre el grupo, igual que en el lienzo. Una fila puede llevar varias, y si dos etiquetas pisan la misma opción gana la primera de la lista de la fila, así que el orden importa cuando se combinan.

El uso más común es la fila alterna, para que la vista se lea mejor. En Tk 9 hay un atajo que lo hace solo:

```consola
>>> "striped" in ttk.Treeview(ventana).configure()
True
```

Con `striped=True` las filas se pintan alternas sin que hagas nada. Pero es **novedad de Tk 9**, como el `placeholder` del `Entry` y el texto de la `Progressbar`, así que si el programa tiene que funcionar en 8.6 hay que seguir haciéndolo a mano con una etiqueta y el índice de cada fila.

## Filtrar sin perder datos

Para esconder filas hay una alternativa a borrarlas que casi nadie conoce y que es justo lo que hace falta al filtrar:

```consola
>>> tabla.detach("d2")
>>> tabla.get_children("")
('d0', 'd1', 'd3', 'd4')
>>> tabla.exists("d2")
True
>>> tabla.reattach("d2", "", 0)
>>> tabla.get_children("")
('d2', 'd0', 'd1', 'd3', 'd4')
```

`detach` quita la fila de la vista pero **no la destruye**: sigue existiendo, con sus valores y sus etiquetas, y `reattach` la devuelve donde le digas. Para un buscador que filtra mientras se escribe, eso es mucho mejor que borrar y reinsertar, porque no se pierde nada y es más rápido.

El único cuidado es que una fila desenganchada no está en `get_children`, así que hay que llevar la cuenta de cuáles hay fuera. Si el filtrado se complica, siempre queda la opción de volver a poblar la tabla desde los datos de Python, que es lo que hace el ejemplo por ser más fácil de seguir.

Hay también `displaycolumns`, que esconde **columnas** sin perderlas, e incluso las reordena:

```consola
>>> tabla.configure(displaycolumns=("a", "c"))
>>> tabla.cget("columns")
('a', 'b', 'c')
>>> tabla.set(fila, "b")
'2'
```

La columna `b` no se ve y su dato sigue ahí. Sirve para un menú de «columnas visibles» sin tocar la estructura.

## Dónde se ha pulsado

Para un menú contextual o para editar una celda hace falta saber en qué fila y en qué columna se ha pulsado, y para eso está la familia `identify_*`:

```python
def pulsar(evento):
        region = tabla.identify_region(evento.x, evento.y)
    if region != "cell":
                return
    fila = tabla.identify_row(evento.y)
    columna = tabla.identify_column(evento.x)
```

`identify_region` devuelve `heading`, `separator`, `tree`, `cell` o `nothing`, y comprobarlo evita el fallo de tratar un clic en la cabecera como un clic en una fila. Y hay un detalle que hace tropezar:

```consola
>>> tabla.identify_column(50)
'#1'
>>> tabla.identify_column(250)
'#2'
```

**Devuelve `'#1'`, no el nombre de la columna.** Y además `'#1'` es la primera de las declaradas, mientras `'#0'` es la columna del árbol. Así que para pasar de eso al nombre hay que traducir:

```python
nombre = tabla.cget("columns")[int(columna.removeprefix("#")) - 1]
```

## La edición de celdas no existe

Esto conviene saberlo antes de prometérselo a nadie:

```consola
>>> [m for m in dir(tabla) if "edit" in m.lower()]
[]
>>> [o for o in tabla.configure() if "edit" in o]
[]
```

Ni un método, ni una opción. **El `Treeview` es de solo lectura**, y editar una celda hay que montarlo a mano superponiendo un `ttk.Entry` justo encima. La pieza que lo hace posible es `bbox`, que dice dónde está una celda:

```python
def editar(fila, columna):
        """Coloca un Entry encima de la celda."""
    caja = tabla.bbox(fila, columna)
    if not caja:                      # la fila no está visible
                return
    x, y, ancho, alto = caja

    valor = tk.StringVar(value=tabla.set(fila, columna))
    campo = ttk.Entry(tabla, textvariable=valor, justify="right")
    campo.place(x=x, y=y, width=ancho, height=alto)
    campo.focus_set()
    campo.select_range(0, "end")

    def aceptar(evento=None):
                tabla.set(fila, columna, valor.get())
        campo.destroy()

    campo.bind("<Return>", aceptar)
    campo.bind("<FocusOut>", aceptar)
    campo.bind("<Escape>", lambda evento: campo.destroy())
```

Cuatro cosas de ahí que son las que se olvidan. `bbox` devuelve una cadena vacía si la fila está fuera de la parte visible, y hay que comprobarlo. El `Entry` se coloca con `place`, que es el gestor de la lección 11 y aquí es el único que sirve. Hace falta `focus_set`, porque un campo recién creado no tiene el foco. Y hay que atar tanto `<Return>` como `<FocusOut>` para aceptar y `<Escape>` para cancelar, o el campo se queda ahí flotando cuando alguien pulsa en otro sitio.

El aviso que acompaña a esto: `tabla.set(fila, columna, valor)` cambia lo que se ve, y eso **no actualiza tus datos**. Hay que escribir también en la estructura de Python, y es el momento de acordarse de que el árbol es una vista.

> [!consejo] Si necesitas mucha edición, el widget es otro
>
> Montar la edición de una celda son veinte líneas. Montarla bien, con validación, con `Tab` para pasar a la siguiente celda, con desplazamiento mientras se edita y con deshacer, son muchas más, y es un camino que se hace largo.
>
> Antes de meterte, mira si el caso admite otra forma. Lo que suele funcionar mejor es **la tabla para ver y un formulario para editar**: se selecciona una fila, sus datos aparecen en campos debajo o en una ventana aparte, se modifican con todo lo que sabes de los bloques anteriores, y al guardar se actualiza la fila. Es más código en apariencia pero mucho menos delicado, valida mejor, funciona con teclado sin inventar nada y es lo que hacen la mayoría de los programas de escritorio que manejan datos.
>
> La edición en la propia celda merece la pena cuando lo que se edita es **una sola columna y se hace muchas veces**, como marcar cantidades en un inventario.

## Una tabla completa

```python title="tabla.py"
"""Treeview: columnas, orden al pulsar, filtro, etiquetas y edición de celda."""

import locale
import tkinter as tk
from tkinter import ttk

try:
    # El idioma del sistema, para que las tildes y la ñ se ordenen bien.
        locale.setlocale(locale.LC_COLLATE, "")
    ordenar_texto = locale.strxfrm
except locale.Error:
        ordenar_texto = str.lower

MARGEN = 12
AIRE = 4

ROSA = "#FF375F"
GRIS = "#8E8E93"
SUAVE = "#F2F2F7"

# Los datos de verdad viven aquí, no en el árbol. El teléfono conserva
# su cero inicial porque nunca se lee de vuelta del Treeview.
CLIENTES = {
    "c-101": {"nombre": "Ana Ruiz", "telefono": "0912345678",
              "postal": "28001", "saldo": 1250.40},
    "c-102": {"nombre": "luis Serna", "telefono": "0655001122",
              "postal": "08015", "saldo": -240.00},
    "c-103": {"nombre": "Berta Lima", "telefono": "0911002233",
              "postal": "41003", "saldo": 9800.15},
    "c-104": {"nombre": "Carlos Vera", "telefono": "0699887766",
              "postal": "07001", "saldo": 75.00},
    "c-105": {"nombre": "Álvaro Pons", "telefono": "0600112233",
              "postal": "28080", "saldo": -12.50},
}

# Cada columna declara su título, su ancho, si estira y cómo se ordena.
COLUMNAS = {
    "nombre": {"titulo": "Cliente", "ancho": 180, "min": 120,
               "estira": True, "anchor": "w", "clave": ordenar_texto},
    "telefono": {"titulo": "Teléfono", "ancho": 110, "min": 110,
                 "estira": False, "anchor": "w", "clave": str},
    "postal": {"titulo": "C.P.", "ancho": 70, "min": 70,
               "estira": False, "anchor": "center", "clave": str},
    "saldo": {"titulo": "Saldo", "ancho": 100, "min": 100,
              "estira": False, "anchor": "e", "clave": float},
}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_tabla(contenedor):
        """show='headings' para una tabla normal: sin él sobra la columna cero."""
    caja = ttk.Frame(contenedor)
    caja.pack(fill="both", expand=True)

    tabla = ttk.Treeview(caja, columns=tuple(COLUMNAS), show="headings",
                         height=12, selectmode="browse")
    barra = ttk.Scrollbar(caja, orient="vertical", command=tabla.yview)
    tabla.configure(yscrollcommand=barra.set)    # las dos mitades, lección 24

    barra.pack(side="right", fill="y")
    tabla.pack(side="left", fill="both", expand=True)

    for nombre, ajuste in COLUMNAS.items():
        # El anchor, en los dos sitios: si no, el título queda centrado
        # sobre datos alineados a la izquierda.
                tabla.heading(nombre, text=ajuste["titulo"], anchor=ajuste["anchor"],
                      command=lambda c=nombre: ordenar(c))
        tabla.column(nombre, width=ajuste["ancho"], minwidth=ajuste["min"],
                     stretch=ajuste["estira"], anchor=ajuste["anchor"])

    tabla.tag_configure("negativo", foreground=ROSA)
    tabla.tag_configure("alterna", background=SUAVE)
    return tabla


def poblar(*_):
        """Rellena la tabla desde CLIENTES, aplicando el filtro."""
    tabla.delete(*tabla.get_children(""))
    buscado = filtro.get().strip().lower()

    for n, (clave, datos) in enumerate(CLIENTES.items()):
                if buscado and buscado not in datos["nombre"].lower():
                        continue
        etiquetas = []
        if datos["saldo"] < 0:
                        etiquetas.append("negativo")
        if n % 2:
                        etiquetas.append("alterna")
        # El iid es la clave del dato: al seleccionar, no hay que buscar nada.
        tabla.insert("", "end", iid=clave, tags=tuple(etiquetas),
                     values=(datos["nombre"], datos["telefono"],
                             datos["postal"], f"{datos['saldo']:.2f}"))
    contar()


def ordenar(columna, descendente=False):
        """Mueve las filas, sin borrarlas: la selección se conserva."""
    clave = COLUMNAS[columna]["clave"]

    def valor_de(fila):
        # set() y no item()['values']: set devuelve el texto tal cual.
                try:
                        return (0, clave(tabla.set(fila, columna)))
        except ValueError:
            # Una celda vacía o rara no debe romper el orden: va al final.
                        return (1, 0)

    filas = sorted(tabla.get_children(""), key=valor_de, reverse=descendente)
    for posicion, fila in enumerate(filas):
                tabla.move(fila, "", posicion)

    # La próxima pulsación, al revés.
    tabla.heading(columna,
                  command=lambda: ordenar(columna, not descendente))
    flecha = " ▼" if descendente else " ▲"
    for nombre, ajuste in COLUMNAS.items():
                titulo = ajuste["titulo"] + (flecha if nombre == columna else "")
        tabla.heading(nombre, text=titulo)


def mostrar_detalle(evento=None):
        """El iid es la clave: los datos se leen de CLIENTES, no del árbol."""
    seleccion = tabla.selection()          # siempre una tupla
    if not seleccion:
                detalle.set("Sin selección")
        return
    clave = seleccion[0]
    datos = CLIENTES[clave]
    # El teléfono sale con su cero porque viene del diccionario.
    detalle.set(f"{clave}: {datos['nombre']} · tel {datos['telefono']} · "
                f"C.P. {datos['postal']} · saldo {datos['saldo']:.2f}")


def pulsar_doble(evento):
        """Doble clic en una celda de saldo: la edita."""
    if tabla.identify_region(evento.x, evento.y) != "cell":
                return
    fila = tabla.identify_row(evento.y)
    columna = tabla.identify_column(evento.x)
    if not fila:
                return
    # identify_column da '#1', no el nombre: hay que traducir.
    nombre = tabla.cget("columns")[int(columna.removeprefix("#")) - 1]
    if nombre != "saldo":
                detalle.set("Solo se puede editar el saldo")
        return
    editar(fila, columna, nombre)


def editar(fila, columna, nombre):
        """Superpone un Entry sobre la celda: el widget no sabe editar."""
    caja = tabla.bbox(fila, columna)
    if not caja:                     # la fila no está visible
                return
    x, y, ancho, alto = caja

    valor = tk.StringVar(value=tabla.set(fila, columna))
    campo = ttk.Entry(tabla, textvariable=valor, justify="right")
    campo.place(x=x, y=y, width=ancho, height=alto)
    campo.focus_set()
    campo.select_range(0, "end")

    def aceptar(evento=None):
                try:
                        nuevo = float(valor.get().replace(",", "."))
        except ValueError:
                        detalle.set("Eso no es un número; no se ha cambiado nada")
            campo.destroy()
            return
        # Primero el dato, después la vista.
        CLIENTES[fila][nombre] = nuevo
        tabla.set(fila, columna, f"{nuevo:.2f}")
        etiquetas = [t for t in tabla.item(fila)["tags"] if t != "negativo"]
        if nuevo < 0:
                        etiquetas.append("negativo")
        tabla.item(fila, tags=tuple(etiquetas))
        campo.destroy()
        mostrar_detalle()

    campo.bind("<Return>", aceptar)
    campo.bind("<FocusOut>", aceptar)
    campo.bind("<Escape>", lambda evento: campo.destroy())


def contar():
        visibles = len(tabla.get_children(""))
    estado.set(f"{visibles} de {len(CLIENTES)} clientes. "
               f"Pulsa una cabecera para ordenar, doble clic en el saldo "
               f"para editarlo.")


ventana = tk.Tk()
ventana.title("Clientes")
ventana.minsize(600, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
filtro = tk.StringVar()
detalle = tk.StringVar(value="Sin selección")
estado = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

busqueda = ttk.Frame(cuerpo)
busqueda.pack(fill="x", pady=(0, MARGEN))
ttk.Label(busqueda, text="Buscar:").pack(side="left")
ttk.Entry(busqueda, textvariable=filtro, width=24).pack(side="left", padx=AIRE)

tabla = crear_tabla(cuerpo)

ttk.Label(cuerpo, textvariable=detalle, wraplength=540, justify="left").pack(
    anchor="w", pady=(MARGEN, 0))
ttk.Label(cuerpo, textvariable=estado, foreground=GRIS, wraplength=540,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

# trace_add en el filtro, evento virtual en la selección: aquí no hay
# variable que observar, así que el evento es lo correcto.
filtro.trace_add("write", poblar)
tabla.bind("<<TreeviewSelect>>", mostrar_detalle)
tabla.bind("<Double-Button-1>", pulsar_doble)

poblar()

centrar(ventana)
ventana.mainloop()
```

Dos cosas de ese programa merecen mirarse despacio. La primera es que **el teléfono se muestra con su cero inicial** y sigue teniéndolo después de ordenar, filtrar y editar, porque nunca se lee del árbol: sale de `CLIENTES` cada vez. Prueba a cambiar `mostrar_detalle` para que lea con `tabla.item(clave)["values"]` y verás el cero desaparecer.

La segunda es el diccionario `COLUMNAS`, que reúne en un sitio el título, el ancho, la alineación y **cómo se ordena** cada columna. Añadir una columna es añadir una entrada, y no hay que tocar ni el orden, ni la creación, ni el poblado.

> [!resumen] En resumen
>
> El `Treeview` es a la vez una tabla y un árbol, y solo existe en la familia temática. Tiene una columna implícita, `#0`, que no aparece en `columns` y que dibuja los triángulos y el `text` de cada fila, mientras los `values` se reparten por las columnas declaradas; para una tabla normal hace falta `show="headings"`, o queda una primera columna vacía que no hay forma de quitar. `heading` configura la cabecera y `column` la columna, con el desajuste de que la columna alinea a la izquierda y su cabecera al centro, así que conviene poner `anchor` en los dos; `stretch` decide quién se reparte el espacio de sobra, y lo razonable es que estire la columna de texto y no las de cifras. El `height` se mide en filas. Al insertar, el primer argumento es el padre y `""` es la raíz, y conviene **poner uno mismo los `iid` con la clave del dato**, porque así una fila seleccionada ya te dice a qué corresponde; los identificadores repetidos y las filas borradas sí dan error, al contrario que en el `Canvas`. Lo fundamental es cómo se leen los valores: `item()["values"]` **adivina el tipo** y convierte `"007"` en `7`, `"0912345678"` en `912345678` y `"  5  "` en `5`, mientras deja `"1.50"` como texto, de modo que los ceros a la izquierda se pierden y los tipos son incoherentes dentro de una fila; `set(fila, columna)` devuelve siempre el texto fiel y es la forma correcta de leer, pero la regla de verdad es que el árbol es una vista y los datos viven en Python. Ordenar se monta con un `command` en la cabecera moviendo las filas con `move`, que conserva la selección, y cada columna necesita declarar su conversión, porque ordenar cifras como texto pone 1200 antes de 75 y ordenar nombres sin `str.lower` pone las minúsculas al final. La selección es una tupla incluso con una sola fila, y no es lo mismo que el foco, que es la fila activa. Las etiquetas pintan filas con `tag_configure`, y el `striped` que lo hace solo es novedad de Tk 9. `detach` y `reattach` esconden filas sin destruirlas, y `displaycolumns` hace lo mismo con columnas. Para saber dónde se ha pulsado están `identify_region`, `identify_row` e `identify_column`, con el detalle de que este último devuelve `'#1'` y no el nombre. Y no hay edición de celdas: se monta superponiendo un `ttk.Entry` con `place` sobre lo que devuelve `bbox`, sin olvidar que `set` cambia la vista y los datos hay que actualizarlos aparte.

> [!ejercicio] Practica
>
> Trabaja en un fichero `27-tabla.py` salvo donde se indique otra cosa:
>
> 1. Crea un `Treeview` con tres columnas **sin** `show="headings"` y mira qué sobra. Añádelo después y compara.
> 2. Inserta una fila con `values=("007", "28001", "1.50")` y lee los tres valores con `item()["values"]` y con `set()`. Anota las diferencias y explica cuál usarías.
> 3. Pon el `anchor` de una columna a la derecha pero no el de su cabecera. Mira el resultado y arréglalo.
> 4. Escribe en `27-ordenar.py` una tabla de cinco filas con una columna de importes y ordénala pulsando la cabecera, primero sin convertir y luego con `float`. Añade la flecha que indica el sentido.
> 5. Ordena una columna de nombres que mezcle mayúsculas y minúsculas, primero con `sort` a secas y luego con `key=str.lower`.
> 6. Selecciona tres filas con `selection_set` y muestra `selection()` y `focus()`. Explica por qué no coinciden.
> 7. Marca con una etiqueta las filas de importe negativo para que salgan en rojo. Después usa `tag_has` para contarlas.
> 8. Escribe en `27-filtrar.py` un filtro que use `detach` y `reattach` en vez de borrar y reinsertar. Comprueba con `exists` que las filas escondidas siguen vivas.
> 9. Ata un clic que muestre en una etiqueta la región, la fila y la columna con los tres `identify_*`. Pulsa en la cabecera, en un separador y en una celda.
> 10. Monta la edición de una celda con un `Entry` superpuesto. Comprueba qué pasa si olvidas el `<FocusOut>` y pulsas en otra fila.
