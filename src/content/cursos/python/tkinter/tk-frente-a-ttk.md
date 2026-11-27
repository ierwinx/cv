---
titulo: "Tk frente a ttk"
resumen: "Por qué hay dos juegos de widgets, cuál está en cada uno, por qué ttk rechaza las opciones de aspecto y cómo se le cambia la cara con estilos."
minutos: 27
orden: 6
---

Buscas cómo poner un botón en Tkinter y encuentras dos respuestas. Una dice `tk.Button(ventana, text="Guardar")`. La otra dice `ttk.Button(ventana, text="Guardar")`. Las dos funcionan, las dos son de la biblioteca estándar y ninguna de las dos páginas explica por qué existe la otra.

Esa es la confusión número uno de quien empieza con Tkinter, y arrastra una segunda que duele más: copias un ejemplo con `ttk`, le añades un `bg="green"` que en el ejemplo anterior funcionaba, y el programa se cae con un error que no menciona ni el color ni `ttk`. En ese punto mucha gente concluye que Tkinter está roto y se va a otra biblioteca.

No está roto. Hay dos juegos de widgets porque Tkinter tiene más de treinta años y en medio cambió el mundo. Entender ese cambio cuesta diez minutos y ahorra semanas de pelearse con cosas que no van a funcionar nunca.

> [!objetivo] Qué vas a aprender
>
> Saber por qué conviven los widgets `tk` y los `ttk`, qué widgets están en cada juego, por qué `ttk` rechaza opciones como `bg` o `relief`, manejar `ttk.Style` para cambiar el aspecto con temas y estilos propios, y tener un criterio fijo para elegir uno u otro en cada widget.

## Dos juegos y treinta años de por medio

Tk nació a principios de los noventa y tomó una decisión razonable para la época: **dibujar sus propios widgets**. Un botón de Tk no le pide al sistema operativo un botón; pinta un rectángulo gris con un borde en relieve y un texto centrado. Eso le dio una ventaja enorme en su momento, porque el mismo programa se veía exactamente igual en Unix, en Windows y en Mac, cuando conseguir eso era muy difícil.

El problema es que ese aspecto se quedó congelado. Los sistemas fueron cambiando de cara —bordes redondeados, sombras, colores de acento, modo oscuro— y los widgets de Tk siguieron pintando su rectángulo gris de 1994. Hoy una aplicación hecha con widgets `tk` no parece anticuada por casualidad: es literalmente la interfaz de hace treinta años.

La respuesta llegó en 2007 con Tk 8.5, que incorporó **themed Tk**, abreviado `ttk`. El cambio de fondo es que los widgets `ttk` no se dibujan a sí mismos: delegan el dibujado en un motor de temas, y en Windows y en macOS ese motor llama a las rutinas de dibujo del propio sistema. Un `ttk.Button` en macOS es un botón de macOS, con su forma, su tipografía y su animación al pulsarlo. El mismo programa en Windows sale con aspecto de Windows.

No sustituyeron a los antiguos, y no podían: había miles de programas escritos contra ellos. Así que se añadieron al lado, en el módulo `tkinter.ttk`, y desde entonces conviven.

## Qué se ve distinto

Puesto el uno junto al otro, en macOS con el tema `aqua`, un `tk.Button` es un rectángulo gris claro de esquinas apenas redondeadas, con un borde en relieve marcado y el texto en la tipografía por defecto de Tk. Un `ttk.Button` tiene la forma de cápsula de los botones del sistema, el borde fino, la tipografía de la interfaz de macOS y se tiñe del color de acento cuando es el botón por defecto.

En un campo de texto la diferencia es más sutil pero igual de reveladora: el `tk.Entry` se dibuja hundido, con ese borde de dos tonos que imita un hueco, y el `ttk.Entry` lleva el marco fino y el foco resaltado como el resto de los campos del sistema.

Y hay algo que no se ve en una captura: los widgets `ttk` se adaptan solos. Si quien usa tu programa cambia a modo oscuro o sube el tamaño de la letra del sistema, `ttk` lo acompaña y `tk` no.

## Qué widget está en cada juego

Esta es la tabla que hay que tener delante. La mayoría de los widgets básicos están en los dos, pero algunos de los más útiles están solo en uno.

| Widget | `tk` | `ttk` | Notas |
| --- | --- | --- | --- |
| `Button` | Sí | Sí |  |
| `Checkbutton` | Sí | Sí |  |
| `Radiobutton` | Sí | Sí |  |
| `Entry` | Sí | Sí |  |
| `Label` | Sí | Sí |  |
| `Frame` | Sí | Sí |  |
| `LabelFrame` | Sí | Sí | En `ttk` se escribe `Labelframe`, con la efe minúscula |
| `PanedWindow` | Sí | Sí | En `ttk` se escribe `Panedwindow` |
| `Menubutton` | Sí | Sí |  |
| `OptionMenu` | Sí | Sí |  |
| `Scale` | Sí | Sí |  |
| `Scrollbar` | Sí | Sí |  |
| `Spinbox` | Sí | Sí | El de `ttk` llegó en Tk 8.6; en versiones anteriores solo estaba en `tk` |
| `Listbox` | Sí | No |  |
| `Text` | Sí | No |  |
| `Canvas` | Sí | No |  |
| `Menu` | Sí | No | Las barras de menú son siempre del sistema |
| `Message` | Sí | No |  |
| `Toplevel` | Sí | No | Las ventanas secundarias son siempre `tk` |
| `Combobox` | No | Sí |  |
| `Treeview` | No | Sí | Listas con columnas y árboles |
| `Notebook` | No | Sí | Pestañas |
| `Progressbar` | No | Sí |  |
| `Separator` | No | Sí |  |
| `Sizegrip` | No | Sí | El tirador de la esquina para redimensionar |

Lee esa tabla dos veces, porque de ella sale la conclusión más importante de la lección: **en cuanto un programa hace algo interesante, mezcla los dos juegos, y eso es normal**. Una aplicación con una tabla de datos y una zona de texto necesita `ttk.Treeview` y `tk.Text` a la fuerza, porque no existen en el otro lado. No es un apaño ni una señal de que lo estés haciendo mal; es la forma prevista de usar Tkinter.

> [!nota] Las cajas de texto grandes se quedaron fuera
>
> Llama la atención que `Text`, `Listbox` y `Canvas`, tres de los widgets más potentes, no tengan versión temática. El motivo es que los tres dibujan contenido que el programa controla carácter a carácter o píxel a píxel, y eso no se puede delegar en el sistema. Lo que sí se puede es rodearlos: la costumbre es meter un `tk.Text` dentro de un `ttk.Frame` y darle una `ttk.Scrollbar`, y el conjunto queda razonable.

## La importación

`ttk` es un submódulo, así que hay que importarlo aparte. La forma habitual, y la que usa el resto del módulo, es esta:

```python
import tkinter as tk
from tkinter import ttk
```

A partir de ahí, `tk.` para los antiguos y `ttk.` para los temáticos:

```python
ventana = tk.Tk()
boton = ttk.Button(ventana, text="Guardar")
lista = tk.Listbox(ventana)
```

Esa doble importación tiene una ventaja que no es cosmética: **al leer el código se ve de un vistazo de qué juego es cada widget**. Por eso no conviene hacer `from tkinter.ttk import *`, que además machaca varios nombres de `tkinter` con los de `ttk` y produce errores muy difíciles de rastrear.

## La diferencia que más duele

Aquí está la piedra con la que tropieza todo el mundo. Los widgets `ttk` **no aceptan las opciones de aspecto directas**. No es que las ignoren: lanzan un error y el programa no arranca.

Guarda esto como `boton_ttk_mal.py` y ejecútalo:

```python
"""Intento de dar color a un botón de ttk como si fuera de tk."""

import tkinter as tk
from tkinter import ttk

ventana = tk.Tk()
boton = ttk.Button(ventana, text="Guardar", bg="green")
boton.pack()

ventana.mainloop()
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/tkinter/boton_ttk_mal.py", line 7, in <module>
    boton = ttk.Button(ventana, text="Guardar", bg="green")
  File "/.../lib/python3.14/tkinter/ttk.py", line 591, in __init__
    Widget.__init__(self, master, "ttk::button", kw)
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/.../lib/python3.14/tkinter/ttk.py", line 536, in __init__
    tkinter.Widget.__init__(self, master, widgetname, kw=kw)
    ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/.../lib/python3.14/tkinter/__init__.py", line 2826, in __init__
    self.tk.call(
    ~~~~~~~~~~~~^
        (widgetName, self._w) + extra + self._options(cnf))
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
_tkinter.TclError: unknown option "-bg"
```

> [!error] unknown option "-bg"
>
> Le estás pasando a un widget de `ttk` una opción de aspecto que solo existe en los widgets de `tk`. El mensaje sale igual con `-fg`, con `-font`, con `-relief` o con `-padx`, cambiando el nombre entre comillas.
>
> No lo arregles poniendo el nombre largo: `background="green"` en un `ttk.Button` falla igual, con `unknown option "-background"`. Y no lo arregles cambiando a `tk.Button`, aunque funcione, porque estarías renunciando al aspecto del sistema por un color.
>
> La solución es un estilo, que es lo que viene a continuación en esta lección.

La razón de fondo es coherente con el diseño de `ttk`. Un widget que se dibuja a sí mismo puede aceptar "píntate de verde", porque es él quien pinta. Un widget que le pide el dibujado al sistema, no: el sistema dibuja botones de macOS, y un botón de macOS no tiene una opción para ser verde. **El aspecto de `ttk` no vive en el widget, vive en el estilo**, y el widget solo dice a qué estilo pertenece.

Puedes comprobarlo preguntándole al propio widget qué acepta, con el `configure()` de la lección anterior:

```consola
>>> from tkinter import ttk
>>> boton = ttk.Button(ventana)
>>> sorted(boton.configure())
['class', 'command', 'compound', 'cursor', 'default', 'image', 'justify', 'padding', 'state', 'style', 'takefocus', 'text', 'textvariable', 'underline', 'width']
```

Quince opciones, frente a las treinta y cinco que tiene un `tk.Button`. No hay `background`, ni `foreground`, ni `font`, ni `relief`, ni `padx`. Sí hay dos que no estaban en `tk`: `style`, que es la que enlaza con el estilo, y `padding`, que sustituye a `padx` y `pady` en una sola opción.

> [!aviso] No todos los ttk son igual de estrictos
>
> La regla "`ttk` no acepta opciones de aspecto" es la que hay que interiorizar, pero conviene saber que tiene excepciones. Los widgets que muestran contenido propio sí aceptan algunas de las opciones largas:
>
> ```consola
> >>> etiqueta = ttk.Label(ventana)
> >>> sorted(etiqueta.configure())
> ['anchor', 'background', 'borderwidth', 'class', 'compound', 'cursor', 'font', 'foreground', 'image', 'justify', 'padding', 'relief', 'state', 'style', 'takefocus', 'text', 'textvariable', 'underline', 'width', 'wraplength']
> ```
>
> Ahí están `background`, `foreground`, `font` y `relief`. O sea que `ttk.Label(ventana, text="Hola", background="yellow")` funciona y `ttk.Button(ventana, text="Hola", background="yellow")` no.
>
> Lo que no funciona nunca, en ningún widget de `ttk`, son las abreviaturas `bg`, `fg` y `bd`. Y aunque las opciones largas te dejen en `Label` y en `Entry`, mezclar los dos mecanismos lleva a interfaces incoherentes. Usa estilos para todo y tendrás una sola cosa que mantener.

## ttk.Style, el mando del aspecto

Todo el aspecto de `ttk` se maneja desde un objeto `ttk.Style`. Se crea uno y sirve para toda la aplicación, porque por debajo no guarda nada: habla con la base de estilos del intérprete de Tcl.

Tiene dos niveles. El grueso es el **tema**, que define el aspecto de todos los widgets a la vez. El fino es el **estilo**, que retoca un widget concreto o un grupo de ellos.

### Temas

```python
estilo = ttk.Style()
print("Temas disponibles:", estilo.theme_names())
print("Tema en uso:", estilo.theme_use())
```

En la máquina de referencia del curso, macOS con Tcl/Tk 9.0, la salida es esta:

```salida
Temas disponibles: ('aqua', 'clam', 'alt', 'default', 'classic')
Tema en uso: aqua
```

Los temas disponibles cambian según el sistema, porque los nativos solo existen donde tienen sentido:

| Sistema | Temas | Por defecto |
| --- | --- | --- |
| macOS | `aqua`, `clam`, `alt`, `default`, `classic` | `aqua` |
| Windows | `vista`, `xpnative`, `winnative`, `clam`, `alt`, `default`, `classic` | `vista` |
| Linux | `clam`, `alt`, `default`, `classic` | `default` |

`aqua`, `vista`, `xpnative` y `winnative` son los que llaman al sistema. `clam`, `alt`, `default` y `classic` están en todas partes porque los dibuja el propio Tk; `classic` es, precisamente, el aspecto de los widgets antiguos.

Cambiar de tema es una línea, y afecta a todos los widgets `ttk` de la aplicación:

```python
estilo.theme_use("clam")
```

> [!aviso] En macOS, aqua ignora buena parte de lo que le pidas
>
> Esta es la frustración más repetida con `ttk`, y conviene saberla antes de perder una tarde. Con el tema `aqua`, muchas configuraciones de estilo **no tienen ningún efecto**. Cambias el color de fondo de un `TButton`, ejecutas, y el botón sale exactamente igual que antes, sin error ni aviso.
>
> No es un fallo tuyo. `aqua` delega el dibujado en las rutinas de macOS, y esas rutinas no admiten que les cambies el fondo de un botón. El sistema dibuja el botón que sabe dibujar.
>
> Hay dos caminos. Si lo que quieres es el aspecto nativo, acéptalo y no personalices: es la opción correcta en la mayoría de los programas. Si necesitas control sobre el aspecto, cambia a `clam`, que es un tema dibujado por Tk y **el que mejor se deja personalizar de todos**. Lo que no funciona es intentar personalizar `aqua`.

### Estilos propios

Un estilo se define con `configure` sobre el objeto `Style`, dándole un nombre, y se aplica al widget con la opción `style`:

```python
estilo.configure("Peligro.TButton", foreground="white", background="#b3261e")
boton_borrar = ttk.Button(ventana, text="Borrar", style="Peligro.TButton")
```

El nombre `Peligro.TButton` parece arbitrario y no lo es. Los nombres de estilo se leen **de derecha a izquierda, separados por puntos**, y el trozo final es el estilo del que se hereda. `TButton` es el nombre del estilo base de todos los botones temáticos, así que `Peligro.TButton` significa "un estilo llamado Peligro que parte de lo que ya es un botón y cambia solo lo que yo diga".

Esto es lo que hace que funcione, y no es opcional. Si llamas al estilo `Peligro` a secas, sin el sufijo, `ttk` no encuentra de dónde sacar la forma del widget y el programa se cae:

```consola
>>> estilo.configure("Peligro", foreground="white", background="#b3261e")
>>> ttk.Button(ventana, text="Borrar", style="Peligro")
Traceback (most recent call last):
  ...
_tkinter.TclError: Layout Peligro not found
```

Ese "layout" es la receta de cómo se monta el widget con sus piezas, y es lo que se hereda del estilo base. Estos son los nombres base que hay que usar como sufijo:

| Widget | Estilo base |
| --- | --- |
| `ttk.Button` | `TButton` |
| `ttk.Label` | `TLabel` |
| `ttk.Entry` | `TEntry` |
| `ttk.Frame` | `TFrame` |
| `ttk.Checkbutton` | `TCheckbutton` |
| `ttk.Radiobutton` | `TRadiobutton` |
| `ttk.Combobox` | `TCombobox` |
| `ttk.Notebook` | `TNotebook` |
| `ttk.Treeview` | `Treeview` |

Fíjate en la última: `Treeview`, sin la `T` delante. Es la excepción y no hay más lógica que la histórica.

Hay una variante importante. Si en vez de `Peligro.TButton` configuras `TButton` a secas, estás cambiando el estilo base, y el cambio afecta **a todos los botones de la aplicación** de golpe. Es justo lo que quieres para fijar el aspecto general del programa en un sitio, y es la respuesta a aquel problema de la lección anterior de tener que repetir la misma opción en doce widgets.

### Los cambios de estado, con map

`configure` fija el aspecto en reposo. Pero un botón no está siempre en reposo: se pulsa, se deshabilita, el ratón pasa por encima. Para eso está `map`, que asocia valores a estados:

```python
estilo.map(
    "Peligro.TButton",
    background=[("pressed", "#7a1912"), ("active", "#d03a2f"), ("disabled", "#cccccc")],
)
```

Cada opción recibe una lista de pares. El primer elemento del par es el estado y el segundo, el valor que toma la opción en ese estado. Tk recorre la lista en orden y se queda con el primero que encaje, así que el orden importa: lo más específico va primero.

Los estados que más se usan son `active` (el ratón está encima), `pressed` (se está pulsando), `disabled`, `focus` (tiene el foco de teclado) y `selected`. Hay más, y se pueden combinar y negar con un `!` delante, pero eso ya es afinar y no hace falta para trabajar.

Este ejemplo junta las tres piezas:

```python title="estilos.py"
"""Un tema, un estilo propio y sus cambios de estado."""

import tkinter as tk
from tkinter import ttk

ventana = tk.Tk()
ventana.title("Estilos de ttk")

estilo = ttk.Style()
print("Temas disponibles:", estilo.theme_names())
print("Tema en uso:", estilo.theme_use())

# clam es el tema que mejor admite personalización en los tres sistemas.
estilo.theme_use("clam")

estilo.configure("Peligro.TButton", foreground="white", background="#b3261e")
estilo.map(
    "Peligro.TButton",
    background=[("pressed", "#7a1912"), ("active", "#d03a2f"), ("disabled", "#cccccc")],
)

ttk.Button(ventana, text="Guardar").pack(padx=20, pady=10)
ttk.Button(ventana, text="Borrar la cuenta", style="Peligro.TButton").pack(padx=20, pady=10)

ventana.mainloop()
```

```salida
Temas disponibles: ('aqua', 'clam', 'alt', 'default', 'classic')
Tema en uso: aqua
```

La salida se imprime antes del `theme_use("clam")`, por eso dice que el tema en uso es `aqua`. En la ventana se ven dos botones con el aspecto de `clam`: el primero normal y el segundo rojo, que se oscurece al pulsarlo y se aclara al pasar el ratón por encima.

## El criterio del curso

Con todo lo anterior, la regla se puede enunciar en una frase, y **es la que sigue el resto del módulo**:

> Usa `ttk` siempre. Recurre a `tk` solo para los widgets que no tienen equivalente temático, o cuando necesites un control del aspecto que `ttk` no te da.

Desarrollada en tres puntos:

1. **Por defecto, `ttk`.** Botones, etiquetas, campos, casillas, marcos y barras de desplazamiento salen de `ttk` sin pensarlo. El programa se ve como una aplicación del sistema y envejece mejor.
2. **`tk` para lo que no está en `ttk`.** `Text`, `Listbox`, `Canvas`, `Menu`, `Message` y `Toplevel` no tienen alternativa. Mezclarlos con `ttk` es lo esperado.
3. **`tk` cuando necesitas pintar algo concreto.** Si lo que quieres es una etiqueta con un fondo de color exacto y la pelea con los estilos no compensa, un `tk.Label` es una respuesta legítima. Que sea una decisión consciente, no la salida fácil ante un `TclError`.

El segundo punto tiene una consecuencia práctica que conviene anticipar: al mezclar, los fondos pueden no coincidir. Un `tk.Frame` gris junto a un `ttk.Frame` del tema del sistema se nota. La solución habitual es usar `ttk.Frame` para todos los contenedores y dejar los widgets `tk` solo donde hacen falta.

## El mismo formulario, dos veces

Para cerrar, el mismo formulario escrito con los dos juegos, en la misma ventana, para poder compararlos sin cambiar de programa:

```python title="comparacion.py"
"""El mismo formulario con widgets tk y con widgets ttk, lado a lado."""

import tkinter as tk
from tkinter import ttk


def crear_formulario_tk(padre):
        """Formulario con los widgets clásicos, que se dibujan ellos mismos."""
    marco = tk.LabelFrame(padre, text="Widgets tk")
    tk.Label(marco, text="Nombre").pack()
    tk.Entry(marco).pack()
    tk.Label(marco, text="Departamento").pack()
    tk.Entry(marco).pack()
    tk.Checkbutton(marco, text="Recibir avisos").pack()
    tk.Button(marco, text="Guardar").pack()
    return marco


def crear_formulario_ttk(padre):
        """El mismo formulario con los widgets temáticos."""
    marco = ttk.Labelframe(padre, text="Widgets ttk")
    ttk.Label(marco, text="Nombre").pack()
    ttk.Entry(marco).pack()
    ttk.Label(marco, text="Departamento").pack()
    ttk.Entry(marco).pack()
    ttk.Checkbutton(marco, text="Recibir avisos").pack()
    ttk.Button(marco, text="Guardar").pack()
    return marco


ventana = tk.Tk()
ventana.title("tk frente a ttk")

crear_formulario_tk(ventana).pack(padx=15, pady=15)
crear_formulario_ttk(ventana).pack(padx=15, pady=15)

ventana.mainloop()
```

Las dos funciones son la misma línea a línea; lo único que cambia es el prefijo. Ejecútalo y mira los dos bloques: el de arriba es Tkinter de 1994 y el de abajo es una aplicación de tu sistema operativo. La colocación con `.pack()` está puesta a secas para que se vea algo, y tiene su propio bloque más adelante en el módulo.

> [!consejo] Ejecútalo en más de un sistema si puedes
>
> Si tienes a mano una máquina con Windows o con Linux, o una máquina virtual, pasa ese fichero y compáralo. El bloque de arriba saldrá prácticamente igual que en macOS, porque los widgets `tk` se dibujan ellos mismos y solo cambian en detalles como la tipografía del sistema o el relieve que traen por defecto. El de abajo saldrá completamente distinto. Es la demostración más clara de lo que hace `ttk`, y verla una vez fija la idea mejor que cualquier explicación.

> [!resumen] En resumen
>
> Tkinter tiene dos juegos de widgets por razones históricas: los `tk` originales se dibujan a sí mismos y se ven igual en todos los sistemas, con el aspecto congelado de los noventa, y los `ttk` o *themed Tk*, incorporados en Tk 8.5, delegan el dibujado en el sistema operativo y adoptan su apariencia. La mayoría de los widgets básicos están en los dos juegos, pero `Text`, `Listbox`, `Canvas`, `Menu`, `Message` y `Toplevel` solo están en `tk`, y `Combobox`, `Treeview`, `Notebook`, `Progressbar`, `Separator` y `Sizegrip` solo en `ttk`, así que mezclar los dos no es un apaño sino lo normal. Se importan con `from tkinter import ttk` y se distinguen por el prefijo. La diferencia que más problemas da es que los widgets `ttk` rechazan las opciones de aspecto con un `TclError` del tipo `unknown option "-bg"`, porque su aspecto no está en el widget sino en el estilo: se maneja con `ttk.Style`, que permite listar y cambiar el tema con `theme_names()` y `theme_use()`, definir estilos propios con `configure("Peligro.TButton", ...)` heredando del estilo base indicado por el sufijo, y fijar el aspecto de cada estado con `map()`. Conviene saber que `aqua` ignora buena parte de la personalización y que `clam` es el tema más maleable. El criterio del módulo es usar `ttk` siempre y bajar a `tk` solo para lo que no tiene equivalente o cuando haga falta un control del aspecto que `ttk` no ofrezca.

> [!ejercicio] Practica
>
> Crea un fichero `06-ttk.py` y trabaja sobre él:
>
> 1. Ejecuta `ttk.Style().theme_names()` en tu máquina y apunta la lista. Escribe después un programa que recorra esa lista, aplique cada tema y muestre una ventana con un botón, un campo y una casilla, esperando a que pulses <kbd>Intro</kbd> en la terminal antes de pasar al siguiente. Anota cuál te gusta más.
> 2. Provoca el error a propósito: crea un `ttk.Entry` con `bg="white"`, ejecuta y copia el mensaje exacto. Prueba después con `background="white"` en el mismo widget y explica por qué ese no falla.
> 3. Define un estilo `Aceptar.TButton` con fondo verde y otro `Cancelar.TButton` con el texto en rojo, y aplícalos a dos botones. Hazlo primero con el tema por defecto de tu sistema y después con `clam`, y anota qué cambia entre las dos ejecuciones.
> 4. Usa `estilo.configure("TLabel", padding=8)` sin nombre propio delante y comprueba que afecta a todas las etiquetas de la ventana a la vez. Escribe en un comentario cuándo conviene esto y cuándo conviene un estilo con nombre.
> 5. Amplía el estilo del ejercicio 3 con `map` para que el botón de aceptar se oscurezca al pulsarlo y se vea gris al deshabilitarlo. Añade un tercer botón que llame a `configure(state="disabled")` sobre él para poder verlo.
> 6. Coge el `comparacion.py` de la lección y añádele una tercera columna con un `tk.Listbox` y un `ttk.Treeview` con tres filas cada uno, para ver cómo queda un widget sin versión temática al lado de uno que sí la tiene.
