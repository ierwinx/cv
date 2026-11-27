---
titulo: "El sistema de widgets"
resumen: "El árbol de contenedores, las tres formas de dar opciones a un widget, cómo preguntarle cuáles acepta y lo que comparten todos."
minutos: 32
orden: 5
---

La ventana que ya sabes abrir está vacía. Todo lo que se pone dentro —una etiqueta, un campo de texto, un botón, una tabla— es un **widget**, y Tkinter trae unos treinta. El módulo le dedica una lección a cada uno, lo que de entrada suena a treinta ratos de memorizar opciones.

No lo es, y esta lección explica por qué. Los widgets de Tkinter no son treinta cosas distintas: son treinta variaciones del mismo objeto. Se crean igual, se configuran igual, se leen igual y comparten buena parte de sus opciones y de sus métodos. Un `Button` y un `Listbox` se parecen mucho más de lo que parece desde fuera.

Aprender ese patrón una vez convierte las lecciones de widgets en lo que deberían ser: un catálogo que se consulta cuando hace falta, no un temario que se estudia. Y trae algo mejor todavía. En cuanto conoces el patrón puedes preguntarle al propio widget qué opciones acepta y qué valor tienen ahora mismo, sin abrir la documentación.

> [!objetivo] Qué vas a aprender
>
> Entender que una interfaz de Tkinter es un árbol de widgets y saber recorrerlo, dominar las tres formas equivalentes de dar opciones a un widget, descubrir las opciones de cualquier widget con `configure()`, conocer las opciones y los métodos que comparten casi todos, y manejar `state` y `relief`, que son las dos que más se usan.

## Un widget es un objeto con un padre

Crear un widget es instanciar una clase. La particularidad está en el primer argumento, que no es una opción: es **el widget que lo contiene**.

```python
etiqueta = tk.Label(ventana, text="Total: 0 €")
```

Ahí `ventana` es el padre de la etiqueta. No es un detalle administrativo. Ese argumento decide dentro de qué se dibuja el widget, de quién hereda ciertos valores y, sobre todo, qué se lleva por delante cuando se destruye: al cerrar la ventana desaparecen todos sus descendientes, sin que tengas que ocuparte tú.

Como el padre puede a su vez tener padre, lo que se construye es un árbol. En la raíz está siempre el objeto `Tk`, y de él cuelgan marcos, y de los marcos cuelgan etiquetas y botones. **Ese árbol no es una metáfora: es la estructura real que Tk recorre para dibujar la interfaz**, y es lo que consulta cuando calcula tamaños, reparte el espacio sobrante o decide quién recibe una pulsación de tecla.

Los widgets que sirven para contener a otros se llaman contenedores. El más usado con diferencia es `Frame`, que no se ve: es una caja transparente cuyo único trabajo es agrupar. En cuanto un formulario tiene más de cuatro elementos, lo normal es partirlo en marcos, porque el árbol es también la unidad de organización del código.

## Recorrer el árbol de verdad

Dos métodos que tiene cualquier widget dejan ver esa estructura:

| Método | Qué devuelve |
| --- | --- |
| `winfo_children()` | La lista de widgets hijos, en el orden en que se crearon |
| `winfo_parent()` | El nombre del padre, **como cadena**, no como objeto |
| `winfo_class()` | El nombre de la clase de Tk del widget, en una cadena |

Con `winfo_children()` y un poco de recursividad sale una función que imprime la interfaz entera:

```python title="arbol.py"
"""Imprime el árbol de widgets de una ventana, con sangría por nivel."""

import tkinter as tk


def mostrar_arbol(widget, nivel=0):
        """Escribe el widget y, debajo, todos sus descendientes."""
    sangria = "    " * nivel
    print(f"{sangria}{widget.winfo_class():12s} {widget}")
    for hijo in widget.winfo_children():
                mostrar_arbol(hijo, nivel + 1)


ventana = tk.Tk()
ventana.title("Alta de cliente")

cabecera = tk.Frame(ventana)
cabecera.pack()
tk.Label(cabecera, text="Alta de cliente").pack()

formulario = tk.Frame(ventana)
formulario.pack()
tk.Label(formulario, text="Nombre").pack()
campo_nombre = tk.Entry(formulario)
campo_nombre.pack()
tk.Label(formulario, text="Correo").pack()
campo_correo = tk.Entry(formulario)
campo_correo.pack()

botonera = tk.Frame(ventana)
botonera.pack()
tk.Button(botonera, text="Guardar").pack()
tk.Button(botonera, text="Cancelar").pack()

mostrar_arbol(ventana)

print()
print("Padre del campo de nombre:", campo_nombre.winfo_parent())
print("Nombre interno del campo:", str(campo_nombre))
print("Hijos del formulario:", formulario.winfo_children())

ventana.mainloop()
```

```salida
Tk           .
    Frame        .!frame
        Label        .!frame.!label
    Frame        .!frame2
        Label        .!frame2.!label
        Entry        .!frame2.!entry
        Label        .!frame2.!label2
        Entry        .!frame2.!entry2
    Frame        .!frame3
        Button       .!frame3.!button
        Button       .!frame3.!button2

Padre del campo de nombre: .!frame2
Nombre interno del campo: .!frame2.!entry
Hijos del formulario: [<tkinter.Label object .!frame2.!label>, <tkinter.Entry object .!frame2.!entry>, <tkinter.Label object .!frame2.!label2>, <tkinter.Entry object .!frame2.!entry2>]
```

Fíjate en la asimetría entre los dos métodos. `winfo_children()` devuelve **objetos** de Python, con los que puedes trabajar directamente. `winfo_parent()` devuelve una **cadena** con el nombre interno del padre. Si necesitas el objeto padre, tienes el atributo `master`, que sí lo es. Es una incoherencia heredada de Tcl y no hay forma de evitarla; basta con saberla.

> [!consejo] Guárdate esta función
>
> `mostrar_arbol` es la primera herramienta de depuración que conviene tener a mano en este módulo. Cuando un widget no aparece en la pantalla, casi siempre es por una de dos razones: se lo ha colgado del padre equivocado, o no se ha colocado. El árbol resuelve la primera en un vistazo, porque el widget aparece impreso pero sangrado donde no toca. Añádela a un `depurar.py` propio y llámala desde cualquier ejemplo del módulo cuando algo no cuadre.

## El catálogo, por familias

Estos son los widgets que existen, agrupados por lo que hacen. No hace falta retenerlos: la tabla es el mapa del bloque de widgets, para que sepas qué hay disponible cuando tengas que resolver algo.

| Familia | Widgets | Dónde se explican |
| --- | --- | --- |
| Mostrar información | `Label`, `Message`, `Progressbar`, `Separator`, `Sizegrip` | Bloque de widgets, lecciones de texto e indicadores |
| Recibir entrada | `Entry`, `Text`, `Button`, `Checkbutton`, `Radiobutton`, `Scale`, `Spinbox`, `Combobox` | Bloque de widgets, lecciones de campos y de botones |
| Contener a otros | `Frame`, `LabelFrame`, `PanedWindow`, `Notebook`, `Toplevel` | Bloque de widgets, lecciones de contenedores; `Toplevel`, en la de ventanas secundarias |
| Listas y tablas | `Listbox`, `Treeview` | Bloque de widgets, lecciones de `Listbox` y de `Treeview` |
| Menús | `Menu`, `Menubutton`, `OptionMenu` | Bloque de menús y diálogos |
| Dibujo | `Canvas` | Bloque de widgets, lección de `Canvas` |

Hay un detalle que esa tabla esconde a propósito: algunos de esos widgets vienen en dos versiones y otros solo existen en una. `Treeview` y `Notebook`, por ejemplo, no están donde esperarías. Eso tiene explicación y ocupa la lección siguiente entera, así que por ahora quédate con los nombres.

## Tres formas de dar una opción

Aquí está el corazón de la lección. Un widget se configura con opciones con nombre, y Tkinter ofrece **tres sintaxis distintas que hacen exactamente lo mismo**.

La primera es el constructor, y es la que ya has visto:

```python
etiqueta = tk.Label(ventana, text="Total: 0 €", width=20)
```

La segunda es el método `configure`, que acepta las mismas opciones y se puede llamar en cualquier momento de la vida del widget:

```python
etiqueta.configure(text="Total: 37,50 €")
etiqueta.configure(text="Total: 37,50 €", width=24)
```

`config` es un alias de `configure`, letra por letra el mismo método. Verás las dos escrituras por ahí y no hay diferencia; en el curso se usa `configure`, que se lee mejor.

La tercera trata el widget como si fuera un diccionario:

```python
etiqueta["text"] = "Total: 37,50 €"
```

Las tres son equivalentes. Y la pregunta razonable es por qué hay tres.

La respuesta está en cómo funciona Tkinter por debajo. Tkinter no implementa los widgets: es una capa fina sobre **Tcl/Tk**, un lenguaje y un conjunto de bibliotecas escritos en C a finales de los ochenta. Cuando escribes `etiqueta.configure(text="Hola")`, Tkinter compone la orden Tcl `.!label configure -text Hola` y se la manda al intérprete. En Tcl las opciones son cadenas con un guion delante, y por eso `etiqueta["text"]` tiene sentido: el widget, visto desde Tcl, es una tabla de opciones indexada por cadenas. La sintaxis de diccionario no es un capricho de Python, es la forma natural del modelo que hay debajo.

En la práctica, el criterio es este: **el constructor para lo que el widget es desde el principio, y `configure` para lo que cambia mientras el programa corre**. La sintaxis de diccionario queda cómoda para una sola opción y es la que menos se escribe.

```python
# El aspecto fijo, al crearlo
boton_guardar = tk.Button(ventana, text="Guardar", width=12)

# Lo que cambia según el estado del programa
boton_guardar.configure(state="disabled")
```

> [!nota] Una opción por widget, no una por aplicación
>
> Las opciones se dan widget a widget. Si quieres que los doce campos de un formulario tengan el mismo ancho, hay que decírselo a los doce, y eso cansa enseguida. Tkinter tiene una base de datos de opciones (`ventana.option_add`) para fijar valores por defecto de golpe, y `ttk` tiene los estilos, que es el mecanismo bueno y lo ves en la lección siguiente. Para dos o tres widgets, repetir la opción está bien; para doce, no.

## Preguntarle al widget qué acepta

Dar opciones es la mitad. La otra mitad es leerlas, y ahí es donde Tkinter se vuelve sorprendentemente cómodo.

Para leer una opción suelta hay dos formas, otra vez equivalentes: el método `cget` y la sintaxis de diccionario.

```consola
>>> import tkinter as tk
>>> ventana = tk.Tk()
>>> etiqueta = tk.Label(ventana, text="Total: 0 €")
>>> etiqueta.cget("text")
'Total: 0 €'
>>> etiqueta["text"]
'Total: 0 €'
```

Lo interesante viene al llamar a `configure()` **sin ningún argumento**. Entonces no configura nada: devuelve un diccionario con todas las opciones del widget.

```consola
>>> len(etiqueta.configure())
30
>>> etiqueta.configure()["text"]
('text', 'text', 'Text', '', 'Total: 0 €')
>>> etiqueta.configure()["relief"]
('relief', 'relief', 'Relief', <index object: 'flat'>, 'flat')
```

Una `tk.Label` tiene treinta opciones, y cada una viene descrita por una tupla de cinco elementos:

| Posición | Qué es | En `text` |
| --- | --- | --- |
| 0 | El nombre de la opción | `'text'` |
| 1 | Su nombre en la base de datos de opciones | `'text'` |
| 2 | Su clase en la base de datos de opciones | `'Text'` |
| 3 | **El valor por defecto** | `''` |
| 4 | **El valor actual** | `'Total: 0 €'` |

Las posiciones 3 y 4 son las que usarás. Comparar la una con la otra responde de un vistazo a "¿esto lo he puesto yo o venía así?", que es la pregunta típica cuando un widget se ve raro.

En el caso de `relief`, el valor por defecto aparece como `<index object: 'flat'>` en vez de como una cadena limpia. Es un objeto de Tcl sin convertir que Tkinter deja pasar tal cual. No te pelees con él: si lo necesitas comparar, pásalo antes por `str()`.

Con eso, una función de cinco líneas sustituye a la documentación:

```python
def listar_opciones(widget):
        """Escribe las opciones de un widget ordenadas, con su valor y su defecto."""
    for nombre in sorted(widget.configure()):
                detalle = widget.configure()[nombre]
        if len(detalle) == 2:
                        print(f"{nombre:20s} -> alias de {detalle[1]}")
        else:
                        print(f"{nombre:20s} actual={detalle[4]!r} defecto={str(detalle[3])!r}")
```

Pasándole la etiqueta de antes salen sus treinta opciones ordenadas alfabéticamente:

```salida
activebackground     actual='systemWindowBackgroundColor' defecto='systemWindowBackgroundColor'
activeforeground     actual='systemPressedButtonTextColor' defecto='systemPressedButtonTextColor'
anchor               actual='center' defecto='center'
background           actual='systemWindowBackgroundColor' defecto='systemWindowBackgroundColor'
bd                   -> alias de -borderwidth
bg                   -> alias de -background
bitmap               actual='' defecto=''
borderwidth          actual=2 defecto='2'
compound             actual='none' defecto='none'
cursor               actual='' defecto=''
disabledforeground   actual='systemDisabledControlTextColor' defecto='systemDisabledControlTextColor'
fg                   -> alias de -foreground
font                 actual='TkDefaultFont' defecto='TkDefaultFont'
foreground           actual='systemTextColor' defecto='systemTextColor'
height               actual=0 defecto='0'
highlightbackground  actual='systemWindowBackgroundColor' defecto='systemWindowBackgroundColor'
highlightcolor       actual='systemTextColor' defecto='systemTextColor'
highlightthickness   actual=0 defecto='0'
image                actual='' defecto=''
justify              actual='center' defecto='center'
padx                 actual=1 defecto='1'
pady                 actual=1 defecto='1'
relief               actual='flat' defecto='flat'
state                actual='normal' defecto='normal'
takefocus            actual='0' defecto='0'
text                 actual='Total: 0 €' defecto=''
textvariable         actual='' defecto=''
underline            actual='' defecto=''
width                actual=0 defecto='0'
wraplength           actual=0 defecto='0'
```

De un vistazo se ve todo lo que hay: las tres opciones que son alias, las que están tal como vinieron y la única que hemos tocado, `text`, que es la que tiene el valor actual distinto del valor por defecto. Es la forma rápida de contestar a "¿esto acepta una opción para tal cosa?": la listas y la buscas. Y funciona con cualquier widget, incluso con los que aún no has estudiado.

Los valores que empiezan por `system` son colores del sistema operativo, y `TkDefaultFont` es la tipografía de la interfaz. Los dos tienen su lección un poco más adelante en este bloque; aquí solo interesa que aparezcan en su sitio.

> [!consejo] Explora antes de buscar
>
> Cuando no sepas si un widget tiene la opción que necesitas, `sorted(widget.configure())` te da la lista completa en un segundo, sin salir de Python y sin arriesgarte a leer documentación de otra versión de Tk. Lo que `configure()` no te da es qué hace cada opción; para eso sí hace falta leer. Pero el noventa por ciento de las veces la duda es si existe, no qué hace.

## Las opciones que comparte casi todo el mundo

Estas catorce aparecen una y otra vez. No todas están en todos los widgets —una etiqueta no tiene `command`, un marco no tiene `text`—, pero cuando están significan siempre lo mismo.

| Opción | Qué hace | Valor por defecto |
| --- | --- | --- |
| `text` | El texto que muestra el widget | `''`, sin texto |
| `textvariable` | Un `StringVar` al que se engancha el texto, para que se actualice solo | `''`, sin variable |
| `width` | El ancho. **En caracteres** si el widget muestra texto, en píxeles si no | `0`, que significa "ajústate al contenido". En `Entry`, `20` |
| `height` | El alto, con la misma regla: en líneas o en píxeles según el widget | `0`, ajustarse al contenido |
| `state` | Si el widget responde o está inerte | `'normal'` |
| `cursor` | La forma del puntero del ratón al pasar por encima | `''`, hereda el del padre. En `Entry`, `'xterm'` |
| `padx` | Relleno interno a los lados, entre el borde y el contenido | `1` en `Label` y `Button`, `0` en `Frame` |
| `pady` | Relleno interno arriba y abajo | `1` en `Label` y `Button`, `0` en `Frame` |
| `borderwidth` | El grosor del borde en píxeles | `2` en `Label`, `Button` y `Entry`; `0` en `Frame` |
| `relief` | El efecto de relieve del borde | `'flat'` en casi todos; `'sunken'` en `Entry` |
| `anchor` | Dónde se pega el contenido dentro del widget: `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`, `center` | `'center'` |
| `justify` | Cómo se alinean entre sí las líneas de un texto de varias líneas | `'center'` en `Label` y `Button`, `'left'` en `Entry` |
| `takefocus` | Si el widget entra en el recorrido del tabulador | `'0'` en los pasivos como `Label` y `Frame`; `''` en `Button` y `Entry`, que significa "decídelo tú" |
| `command` | La función que se llama al activar el widget | `''`, sin función |

Esos valores están leídos con `configure()` en la máquina de referencia del curso, macOS con Tcl/Tk 9.0, y **cambian de un sistema operativo a otro**. El caso más llamativo es `relief`: en macOS un `tk.Button` nace `flat`, porque el sistema ya le dibuja su propio borde, mientras que en otros sistemas los botones nacen en relieve. Cuando un valor por defecto te importe, míralo en tu máquina en lugar de fiarte de una tabla; para eso tienes `listar_opciones`.

Dos aclaraciones sobre esa lista. `anchor` y `justify` se confunden a menudo: `anchor` coloca el bloque de contenido dentro del hueco del widget, y `justify` alinea las líneas unas respecto a otras dentro de ese bloque. Con una sola línea de texto y un widget ajustado al contenido, ninguna de las dos hace nada visible, y de ahí viene la confusión.

Y `command` merece una nota: recibe **la función, no su resultado**. Se escribe `command=guardar`, sin paréntesis. Con paréntesis llamarías a la función al construir la ventana y le pasarías al botón lo que devuelva, que casi siempre es `None`. Es el error más repetido del módulo y tiene lección propia en el bloque de eventos.

Faltan tres de las más visibles: `background`, `foreground` y `font`. Existen en casi todos los widgets y hacen lo que te imaginas, pero los colores, las tipografías y las unidades en las que se miden los tamaños tienen su propia lección justo después de la siguiente. Aquí basta con saber que están.

### Nombres cortos y nombres largos

Varias opciones tienen dos nombres, uno completo y otro abreviado:

| Corto | Largo |
| --- | --- |
| `bg` | `background` |
| `fg` | `foreground` |
| `bd` | `borderwidth` |

No son opciones distintas: la corta es un alias de la larga. El motivo es histórico. En Tcl las órdenes se escriben a mano en una consola y las abreviaturas ahorran teclas, así que Tk las ofreció desde el principio. Tkinter las expone igual porque no tiene por qué esconderlas.

El propio `configure()` lo enseña. Las opciones normales devuelven una tupla de cinco elementos; los alias devuelven una de dos, con el nombre real al que apuntan:

```consola
>>> etiqueta.configure()["bg"]
('bg', '-background')
```

Por eso `listar_opciones` comprueba la longitud de la tupla antes de leer las posiciones 3 y 4: con un alias no existen. En el curso se usa siempre el nombre largo. Se escribe más, pero `borderwidth` se entiende sin contexto y `bd` no, y eso importa mucho más al releer el código dentro de seis meses.

## state: la opción del formulario real

De todas, `state` es la que más juego da en una aplicación de verdad, porque es la que apaga y enciende partes de la interfaz.

| Valor | Qué significa |
| --- | --- |
| `normal` | El widget funciona. Responde al ratón y al teclado |
| `disabled` | Inerte. Se dibuja apagado, no responde y el tabulador lo salta |
| `readonly` | Solo en los que aceptan escritura: se ve y se puede seleccionar y copiar, pero no editar |

La diferencia entre `disabled` y `readonly` importa. Un campo `disabled` comunica "esto no va contigo"; uno `readonly` comunica "esto es información, cópiala si quieres". Para un número de pedido calculado por el programa, `readonly` es lo correcto: `disabled` lo pinta en gris claro, cuesta leerlo y, en algunos sistemas, ni siquiera deja seleccionarlo.

No todos los widgets aceptan los tres. `readonly` solo tiene sentido donde se puede escribir: `Entry`, `Spinbox` y `Combobox`. En una etiqueta o en un botón no significa nada, y Tk lo dice sin rodeos:

```consola
>>> etiqueta.configure(state="readonly")
Traceback (most recent call last):
  ...
_tkinter.TclError: bad state "readonly": must be active, disabled, or normal
```

Ese mensaje es más útil de lo que parece, porque **te enumera los valores válidos del widget que tengas delante**. Probar un valor a ver qué pasa es una forma perfectamente razonable de salir de dudas, y de paso ahí asoma `active`, un cuarto valor que indica que el ratón está encima y que normalmente pone Tk solo, no tú.

El patrón habitual es apagar lo que no se puede hacer todavía en vez de dejar que se pulse y avisar después con un mensaje:

```python
boton_guardar = tk.Button(ventana, text="Guardar", state="disabled")

# Más adelante, cuando el formulario ya es válido
boton_guardar.configure(state="normal")
```

## relief: los cinco relieves

`relief` decide cómo se dibuja el borde del widget, y solo se nota si `borderwidth` es mayor que cero. Son cinco valores y se entienden mejor viéndolos juntos que leyendo su descripción:

| Valor | Aspecto |
| --- | --- |
| `flat` | Sin relieve. El borde no se dibuja aunque tenga grosor |
| `raised` | Sobresale, como una tecla sin pulsar |
| `sunken` | Hundido, como un hueco |
| `groove` | Un surco grabado alrededor del contenido |
| `ridge` | Una moldura que sobresale alrededor del contenido |

```python title="relieves.py"
"""Los cinco relieves de Tkinter, uno al lado del otro."""

import tkinter as tk

RELIEVES = ("flat", "raised", "sunken", "groove", "ridge")

ventana = tk.Tk()
ventana.title("Relieves")

for nombre in RELIEVES:
        muestra = tk.Label(
        ventana,
        text=nombre,
        relief=nombre,
        borderwidth=4,
        width=12,
        padx=10,
        pady=10,
    )
    muestra.pack(padx=10, pady=5)

ventana.mainloop()
```

En la ventana salen cinco etiquetas apiladas, cada una con su nombre escrito dentro y dibujada con su relieve. `flat` se ve como una etiqueta sin más; `raised` y `sunken` son los dos clásicos, uno hacia fuera y otro hacia dentro; `groove` y `ridge` dibujan una línea doble y se distinguen entre sí por poco. El `borderwidth=4` está puesto a propósito: con el grosor por defecto la diferencia es tan sutil que no se aprecia.

En cuanto a cuándo usarlos, la respuesta corta es casi nunca. Los relieves son de los noventa y hoy delatan enseguida que una aplicación es vieja. `sunken` en un marco que agrupa cosas sigue pasando por bueno; el resto, mejor dejarlos salvo que busques ese aire retro a conciencia.

## El nombre interno del widget

En la salida del árbol aparecían nombres como `.!frame2.!entry`. Ese es el **nombre del widget dentro del intérprete de Tcl**, y lo devuelve `str(widget)`.

Se lee igual que una ruta de ficheros, con puntos en vez de barras. El `.` solo es la ventana raíz. `.!frame2` es el segundo marco creado bajo la raíz, y `.!frame2.!entry` es el primer `Entry` creado dentro de ese marco. Tkinter genera esos nombres automáticamente: el signo de admiración y el número los pone él para que no se repitan.

Merece treinta segundos por una razón muy práctica: **cuando Tk lanza un error, lo hace citando ese nombre, no el de tu variable**. Un mensaje que hable de `.!frame3.!button2` no dice nada si no sabes leerlo, y en cambio te está diciendo que el problema está en el segundo botón del tercer marco. Con la función `mostrar_arbol` de más arriba, localizarlo es inmediato.

## Los métodos que tienen todos

Igual que hay opciones comunes, hay métodos que trae cualquier widget por el simple hecho de serlo.

| Método | Qué hace |
| --- | --- |
| `destroy()` | Elimina el widget y, con él, todos sus descendientes |
| `winfo_width()` | El ancho actual en píxeles |
| `winfo_height()` | El alto actual en píxeles |
| `winfo_ismapped()` | Si el widget está colocado y visible en la pantalla |
| `focus_set()` | Le da el foco de teclado |

`destroy()` es la forma de quitar algo de la interfaz. Aprovecha el árbol: destruir un marco destruye lo que hay dentro, así que vaciar una zona entera de la ventana es una sola llamada sobre el contenedor. Después de destruirlo, el objeto de Python sigue existiendo pero ya no sirve para nada; cualquier operación sobre él falla.

`focus_set()` se usa sobre todo al abrir un formulario, para que el cursor esté ya en el primer campo y quien lo rellena no tenga que ir al ratón para empezar a escribir. Es un detalle pequeño que se nota mucho.

Y `winfo_width()` y `winfo_height()` esconden una trampa que pilla a todo el mundo una vez.

> [!aviso] Mis widgets miden 1 píxel
>
> Si consultas `winfo_width()` justo después de crear un widget, devuelve `1`. Y si lo consultas después de colocarlo, también. Este programa lo mide en los tres momentos:
>
> ```python title="medidas.py"
> """Cuándo empiezan a valer las medidas de un widget."""
>
> import tkinter as tk
>
> ventana = tk.Tk()
> etiqueta = tk.Label(ventana, text="Total: 0 €", width=20)
>
> print("Recién creada:        ", etiqueta.winfo_width(), etiqueta.winfo_height(), etiqueta.winfo_ismapped())
> etiqueta.pack()
> print("Ya colocada:          ", etiqueta.winfo_width(), etiqueta.winfo_height(), etiqueta.winfo_ismapped())
> ventana.update_idletasks()
> print("Tras update_idletasks:", etiqueta.winfo_width(), etiqueta.winfo_height(), etiqueta.winfo_ismapped())
> ```
>
> ```salida
> Recién creada:         1 1 0
> Ya colocada:           1 1 0
> Tras update_idletasks: 186 22 1
> ```
>
> No es un fallo: es que **todavía no se ha dibujado nada**. Tk no calcula los tamaños al crear los widgets ni al colocarlos, sino al procesar los eventos pendientes, y eso no ocurre hasta que arranca el bucle de eventos. Hasta entonces cada widget lleva el valor provisional que Tk pone al nacer, que es `1`.
>
> Fíjate en la tercera columna, que es `winfo_ismapped()`: vale `0` mientras las medidas son falsas y `1` en cuanto son buenas. Es la forma de saber en qué punto estás.
>
> La salida rápida es la del ejemplo, `update_idletasks()`, que fuerza el cálculo antes de preguntar. La buena, cuando el tamaño te interesa de verdad, es no preguntarlo a destiempo: pedirlo dentro de un manejador del evento `<Configure>`, que Tk dispara cada vez que un widget cambia de tamaño. Así te enteras del tamaño real y además de cada cambio posterior. Los eventos tienen su propio bloque en el módulo.

> [!resumen] En resumen
>
> Todo lo que se ve dentro de una ventana es un widget, y todos los widgets siguen el mismo patrón. Se crean pasando el padre como primer argumento, lo que construye un árbol que Tk recorre para dibujar y que puedes inspeccionar con `winfo_children()`, `winfo_parent()` y `winfo_class()`. Las opciones se dan de tres formas equivalentes: en el constructor, con `configure()` o `config()`, y con la sintaxis de diccionario `widget["text"] = "otro"`, que viene de que por debajo hay un intérprete de Tcl donde las opciones son cadenas. Se leen con `cget()` o con la sintaxis de diccionario, y sobre todo con `configure()` sin argumentos, que devuelve un diccionario con todas las opciones del widget y, en cada una, una tupla con su valor por defecto y su valor actual; los alias como `bg` o `bd` se reconocen porque devuelven una tupla de dos elementos. Casi todos los widgets comparten `text`, `width`, `height`, `state`, `relief`, `anchor`, `command` y compañía, y también los métodos `destroy()`, `focus_set()` y los `winfo_`, con la trampa de que las medidas valen `1` hasta que la ventana se dibuja. Con eso, cualquier widget nuevo del módulo se reduce a lo poco que tenga de particular.

> [!ejercicio] Practica
>
> Crea un fichero `05-widgets.py` y trabaja sobre él:
>
> 1. Copia `mostrar_arbol` en un módulo `depurar.py` propio y amplíala para que, además de la clase y el nombre interno, escriba el valor de la opción `text` de cada widget que la tenga. Ten en cuenta que no todos la tienen y que `cget` falla en los que no.
> 2. Construye una ventana con tres marcos anidados uno dentro de otro, con una etiqueta en cada uno, y comprueba con `winfo_parent()` que la jerarquía es la que creías. Luego destruye el marco de en medio y vuelve a imprimir el árbol.
> 3. Escribe una función `comparar_defectos(widget)` que recorra `configure()` y escriba solo las opciones cuyo valor actual sea distinto del valor por defecto. Pásasela a un `tk.Button` al que hayas dado cuatro opciones y comprueba que salen esas cuatro.
> 4. Haz un formulario con dos campos y un botón "Guardar" que empiece en `state="disabled"`. Añade un botón "Revisar" que lo pase a `normal`. Prueba además a poner uno de los campos en `readonly` y fíjate en la diferencia con `disabled` al intentar seleccionar su texto.
> 5. Reescribe el ejemplo de los relieves para que las cinco etiquetas usen `borderwidth=1` en vez de `4`, y compara las dos ventanas. Anota cuáles siguen distinguiéndose.
> 6. Amplía `medidas.py` para que mida también el ancho de la ventana, y para que vuelva a medirlo después de añadir una segunda etiqueta muy larga. Explica con tus palabras por qué el ancho cambia y en qué momento exacto lo hace.
