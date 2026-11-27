---
titulo: "El deslizador: Scale"
resumen: "Elegir arrastrando en vez de escribiendo: el widget temático con doce opciones, el valor decimal que nunca pediste, y el único caso del bloque donde el widget clásico es claramente mejor."
minutos: 18
orden: 22
---

Un `Scale` es una barra con un tirador que se arrastra. Sirve para lo que el `Spinbox` de la lección anterior no sabe hacer: elegir un valor cuando **lo que importa es la proporción y no la cifra**. El volumen, el brillo, la opacidad, el nivel de zoom. Nadie pone el volumen «al 63 %»; se sube hasta que suena bien.

Esa es la frase que decide si este widget es el adecuado, y conviene tenerla clara porque el deslizador se usa mal a menudo. Si alguien podría decir de antemano el número que quiere, el deslizador es el widget equivocado: es impreciso por naturaleza, y eso es una virtud cuando la precisión no importa y un defecto en cuanto importa.

Además, esta lección trae algo que no ha pasado en todo el bloque: **el widget clásico es mejor que el temático**, y no por poco.

> [!objetivo] Qué vas a aprender
>
> Crear deslizadores horizontales y verticales y leer su valor; saber por qué `get` devuelve decimales incluso con un rango entero y por qué el valor del widget y el de un `IntVar` pueden no coincidir; entender que el `command` recibe una cadena; y conocer las cuatro opciones que solo tiene `tk.Scale` y que justifican usarlo.

## Crear y leer

El rango y la orientación, y ya está:

```python
volumen = ttk.Scale(caja, from_=0, to=100, orient="horizontal", length=200)
volumen.set(35)
```

`length` es el largo de la barra en píxeles, y hay que ponerlo o el deslizador sale con su tamaño mínimo, que es diminuto. Es una medida en píxeles y no en caracteres, porque aquí no hay texto que medir.

`orient` acepta dos valores, y Tk los enumera:

```consola
>>> ttk.Scale(ventana, orient="z")
_tkinter.TclError: bad orient "z": must be horizontal or vertical
```

Para el vertical hay que saber una cosa que desconcierta: **el `from_` queda arriba**. Así que un deslizador vertical de volumen, donde lo lógico es que el máximo esté arriba, se declara al revés de como se lee:

```python
ttk.Scale(caja, from_=100, to=0, orient="vertical", length=160)
```

Las escalas invertidas funcionan sin problema y el valor se interpreta bien:

```consola
>>> invertida = ttk.Scale(ventana, from_=100, to=0)
>>> invertida.set(25)
>>> invertida.get()
25.0
```

## Todo es decimal

Ese `25.0` no es casualidad. Un `ttk.Scale` trabaja siempre con números en coma flotante:

```consola
>>> escala = ttk.Scale(ventana, from_=0, to=100)
>>> escala.get()
0.0
>>> escala.set(50)
>>> escala.get()
50.0
>>> type(escala.get())
<class 'float'>
```

Aunque el rango sea de enteros y el valor lo hayas puesto con un entero, lo que sale es un `float`. Y arrastrando el tirador no salen valores redondos, salen los que caen bajo el ratón: `37.42857142857143` es un valor perfectamente normal de este widget.

Eso tiene dos consecuencias que hay que tratar.

La primera es la presentación. Nunca muestres el valor crudo de un deslizador en una etiqueta: redondéalo.

```python
def mostrar(valor):
        """El command recibe el valor, y lo recibe como cadena."""
    nivel.set(f"{float(valor):.0f} %")
```

La segunda es más traicionera, y es lo que pasa si atas el deslizador a un `IntVar` creyendo que así se redondea:

> [!aviso] Con un `IntVar`, el widget y la variable dejan de coincidir
>
> Parece la solución evidente al problema de los decimales, y no lo es:
>
> ```consola
> >>> entero = tk.IntVar(value=0)
> >>> escala = ttk.Scale(ventana, from_=0, to=100, variable=entero)
> >>> escala.set(42.7)
> >>> entero.get()
> 42
> >>> escala.get()
> 42.7
> ```
>
> **La variable dice 42 y el widget dice 42.7.** La variable no redondea el valor del deslizador, solo trunca lo que devuelve al leerlo, y el tirador sigue donde estaba. Si una parte de tu programa lee la variable y otra llama a `get()`, trabajan con números distintos.
>
> Con un `DoubleVar` los dos coinciden, porque no hay conversión:
>
> ```consola
> >>> doble = tk.DoubleVar(value=0)
> >>> escala = ttk.Scale(ventana, from_=0, to=100, variable=doble)
> >>> escala.set(42.7)
> >>> doble.get(), escala.get()
> (42.7, 42.7)
> ```
>
> Así que la regla es: **`DoubleVar` siempre con un `ttk.Scale`**, y el redondeo se hace al usar el valor, no al guardarlo. Si lo que necesitas de verdad es que el deslizador solo dé valores enteros, lo que quieres es el widget clásico, que sabe hacerlo y se explica más abajo.

## El `command` recibe una cadena

`command` en un deslizador funciona distinto que en el botón o la casilla: **recibe un argumento**, que es el valor nuevo.

```consola
>>> registro = []
>>> escala = ttk.Scale(ventana, from_=0, to=100,
...                    command=lambda valor: registro.append((valor, type(valor).__name__)))
>>> escala.set(42)
>>> registro
[('42.0', 'str')]
```

Mira los dos detalles. El valor llega como **cadena**, no como número, así que hay que convertirlo con `float()`. Y una función que no acepte ese argumento falla, lo que explica el error más común del widget:

```python
ttk.Scale(caja, from_=0, to=100, command=actualizar)      # actualizar() sin parámetros
```

Si `actualizar` no recibe nada, eso lanza un `TypeError` en cuanto alguien mueve el tirador, no al crearlo. La firma correcta es `def actualizar(valor)`, y si el valor no te interesa, `lambda _: actualizar()`.

La otra cosa que hay que saber es que **`command` se dispara muchísimo**: una vez por cada píxel que se mueve el tirador, no una vez al soltarlo. Para actualizar una etiqueta va bien. Para algo que cueste, como redibujar una gráfica o recargar algo, hay que espaciarlo, y la forma de hacerlo se ve en la lección de tareas largas del bloque E.

Y como es costumbre en el bloque, `command` responde al movimiento y `trace_add` sobre la variable responde al dato, con lo que si el programa también cambia el deslizador por su cuenta, lo fiable es el segundo.

## Las doce opciones, y lo que falta

Aquí está la sorpresa de la lección. Un `ttk.Scale` tiene doce opciones, y es con diferencia el widget más pelado del bloque:

```consola
>>> sorted(ttk.Scale(ventana).configure().keys())
['class', 'command', 'cursor', 'from', 'length', 'orient', 'state', 'style',
 'takefocus', 'to', 'value', 'variable']
```

Eso es todo: el rango, el largo, la orientación, el valor y la variable. No hay forma de mostrar el número, ni de poner marcas, ni de redondear.

El clásico tiene veinticuatro más, y cuatro de ellas son justo las que se echan en falta:

```consola
>>> [o for o in ("resolution", "tickinterval", "showvalue", "label")
...  if o in ttk.Scale(ventana).configure()]
[]
```

| Opción de `tk.Scale` | Qué hace |
| --- | --- |
| `resolution` | Redondea a múltiplos de ese número. Con `resolution=5`, solo salen 0, 5, 10... |
| `tickinterval` | Dibuja marcas numeradas debajo de la barra cada tantas unidades |
| `showvalue` | Muestra el valor actual sobre el tirador. Está activado por defecto |
| `label` | Un rótulo dibujado dentro del propio widget |

`resolution` es la que cambia el juego, porque además arregla el problema de los decimales de raíz:

```consola
>>> clasica = tk.Scale(ventana, from_=0, to=100, orient="horizontal",
...                    resolution=5, tickinterval=25, label="Volumen")
>>> clasica.set(37)
>>> clasica.get()
35
>>> type(clasica.get())
<class 'int'>
```

Le has pedido 37 y te ha dado 35, que es el múltiplo de cinco más cercano por debajo. Y `get()` devuelve un **entero de verdad**, no un `float`.

> [!nota] El único caso del bloque donde el clásico gana claramente
>
> En el resto del módulo, bajar de `ttk` a `tk` ha sido una excepción que había que justificar: el botón por omisión de macOS en la lección 14, y los widgets que simplemente no existen en `ttk`, como el `Text` y el `Listbox`.
>
> Aquí es distinto. Los dos widgets existen y el clásico **hace más cosas**, todas útiles: redondear, mostrar el valor, poner marcas y llevar rótulo. Un deslizador temático de 0 a 100 no puede decirte en qué número estás, lo que obliga a añadir una etiqueta al lado y a mantenerla sincronizada con un `command`; el clásico lo trae puesto.
>
> El criterio práctico, entonces:
>
> - **`ttk.Scale`** cuando el número no se muestra y el valor exacto no importa, y quieres que el widget se vea nativo. Es el caso del volumen o del brillo, donde lo que hay es un efecto inmediato y la cifra sobra.
> - **`tk.Scale`** cuando necesitas valores redondeados, marcas o el número a la vista. Te ahorra código y una fuente de fallos, al precio de un aspecto algo anticuado.
>
> En el panel de control de referencia el deslizador es `ttk.Scale` con una etiqueta al lado, que es el patrón del primer caso.

## Un panel de ajustes

Este programa tiene las dos familias, para que la diferencia se vea de una vez, y el patrón de la etiqueta sincronizada que hace falta con el temático.

```python title="deslizadores.py"
"""Scale: temático con etiqueta, clásico con marcas, y un vertical invertido."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_tematico(contenedor):
        """ttk.Scale: hay que añadir la etiqueta del valor y mantenerla al día."""
    caja = ttk.LabelFrame(contenedor, text="ttk.Scale", padding=MARGEN)
    caja.pack(fill="x")

    fila = ttk.Frame(caja)
    fila.pack(fill="x")
    ttk.Label(fila, text="Volumen", width=10, anchor="w").pack(side="left")
    ttk.Scale(fila, from_=0, to=100, orient="horizontal",
              variable=volumen).pack(side="left", fill="x", expand=True,
                                     padx=AIRE)
    # width fijo: la cifra cambia sin mover el deslizador de su sitio.
    ttk.Label(fila, textvariable=volumen_texto, width=6,
              anchor="e").pack(side="left")

    fila2 = ttk.Frame(caja)
    fila2.pack(fill="x", pady=(AIRE, 0))
    ttk.Label(fila2, text="Opacidad", width=10, anchor="w").pack(side="left")
    ttk.Scale(fila2, from_=0, to=1, orient="horizontal",
              variable=opacidad).pack(side="left", fill="x", expand=True,
                                      padx=AIRE)
    ttk.Label(fila2, textvariable=opacidad_texto, width=6,
              anchor="e").pack(side="left")

    ttk.Label(caja, text="Doce opciones: ni valor a la vista ni redondeo.",
              foreground="#6E6E73").pack(anchor="w", pady=(AIRE, 0))
    return caja


def crear_clasico(contenedor):
        """tk.Scale: el valor, las marcas y el redondeo vienen de serie."""
    caja = ttk.LabelFrame(contenedor, text="tk.Scale", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    tk.Scale(caja, from_=0, to=100, orient="horizontal", variable=calidad,
             resolution=5, tickinterval=25, label="Calidad (múltiplos de 5)",
             length=300, relief="flat", highlightthickness=0).pack(fill="x")

    ttk.Label(caja, text="Redondea, se lee el número y lleva marcas.",
              foreground="#6E6E73").pack(anchor="w")
    return caja


def crear_vertical(contenedor):
        """Vertical: from_ queda arriba, así que el rango se declara al revés."""
    caja = ttk.LabelFrame(contenedor, text="Vertical", padding=MARGEN)
    caja.pack(side="left", fill="y", pady=(MARGEN, 0))

    ttk.Scale(caja, from_=100, to=0, orient="vertical", length=120,
              variable=graves).pack()
    ttk.Label(caja, textvariable=graves_texto, width=4, anchor="center").pack(
        pady=(AIRE, 0))
    return caja


def describir(*_):
        """Formatea las etiquetas y el resumen, redondeando al usar el valor.

    Va en un trace_add y no en el command de cada deslizador: así también se
    entera de los cambios que haga el programa, que el command se perdería.
    """
    volumen_texto.set(f"{volumen.get():.0f} %")
    opacidad_texto.set(f"{opacidad.get():.2f}")
    graves_texto.set(f"{graves.get():.0f}")
    resumen.set(f"Volumen {volumen.get():.0f} %, opacidad {opacidad.get():.2f}, "
                f"calidad {calidad.get()}, graves {graves.get():.0f}.")


ventana = tk.Tk()
ventana.title("Ajustes")
ventana.minsize(560, 460)

# DoubleVar con los ttk.Scale: un IntVar haría que el widget y la variable
# dijeran números distintos. El clásico con resolution sí puede usar IntVar.
# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
volumen = tk.DoubleVar(value=35)
opacidad = tk.DoubleVar(value=0.8)
graves = tk.DoubleVar(value=60)
calidad = tk.IntVar(value=75)
volumen_texto = tk.StringVar()
opacidad_texto = tk.StringVar()
graves_texto = tk.StringVar()
resumen = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_tematico(cuerpo)
crear_clasico(cuerpo)

abajo = ttk.Frame(cuerpo)
abajo.pack(fill="both", expand=True)
crear_vertical(abajo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=resumen, wraplength=500, justify="left").pack(
    anchor="w")

# Un solo trace por variable cubre las etiquetas y el resumen.
for variable in (volumen, opacidad, graves, calidad):
        variable.trace_add("write", describir)
describir()

centrar(ventana)
ventana.mainloop()
```

Arrastra los tres y verás la diferencia de trabajo: los temáticos necesitan una etiqueta, alguien que la formatee y un `width` fijo para que no tiemble, mientras el clásico enseña su número sin que nadie se lo pida. Ese `width=6` de las etiquetas es el truco de la lección 13: sin él, pasar del 99 al 100 movería el deslizador entero.

Y fíjate en que ningún deslizador lleva `command`, aunque esta lección lo haya explicado. El motivo es el de siempre, y aquí tiene una consecuencia visible: si las etiquetas se rellenaran desde el `command`, bastaría con que el programa cambiara una variable por su cuenta para que la cifra de al lado se quedara con el valor viejo. Con un `trace_add` por variable, las etiquetas y el resumen se enteran de todo y hay una sola función que formatea.

> [!consejo] Un deslizador sin números necesita contexto
>
> Un `ttk.Scale` a secas es una barra con un tirador y nada más: no dice qué controla, ni en qué unidades, ni cuál es el mínimo y el máximo. Las tres cosas que lo hacen usable, y que hay que añadir a mano:
>
> - **Un rótulo a la izquierda** con lo que controla.
> - **El valor a la derecha**, con su unidad y con `width` fijo.
> - **Los extremos**, si no son obvios. Dos etiquetas pequeñas bajo la barra con el mínimo y el máximo, o un rótulo cualitativo en cada punta, del estilo «Menos aire» y «Más aire», que a veces informa más que el número.
>
> Y si al final has añadido el rótulo, el valor y las marcas, párate un momento: eso es un `tk.Scale`, y lo traía hecho.

> [!resumen] En resumen
>
> El `Scale` sirve para elegir un valor arrastrando, y es el widget adecuado cuando importa la proporción y no la cifra exacta; si alguien podría decir de antemano el número que quiere, el widget correcto es un `Spinbox` o un campo. Se crea con `from_`, `to`, `orient` y un `length` en píxeles que hay que poner o sale diminuto, y en los verticales hay que recordar que `from_` queda arriba, así que un volumen vertical se declara de 100 a 0. Un `ttk.Scale` trabaja siempre en coma flotante: `get()` devuelve un `float` aunque el rango sea entero, y arrastrando salen valores como 37.42857142857143, de modo que el valor se redondea al mostrarlo y nunca se enseña crudo. Atarlo a un `IntVar` no resuelve eso, lo empeora, porque la variable trunca lo que devuelve mientras el widget conserva el decimal y los dos dejan de coincidir; con un `ttk.Scale` se usa `DoubleVar`. Su `command` recibe un argumento, el valor nuevo y como cadena, así que hay que convertirlo con `float()` y una función sin parámetros falla al mover el tirador; además se dispara una vez por píxel de movimiento, no al soltar. Y este es el único caso del bloque donde el widget clásico es claramente mejor: `ttk.Scale` tiene solo doce opciones y no sabe mostrar su valor, ni poner marcas, ni redondear, mientras `tk.Scale` trae `resolution`, que redondea a múltiplos y hace que `get()` devuelva un entero de verdad, más `tickinterval`, `showvalue` y `label`. Si vas a necesitar el número a la vista o valores redondeados, el clásico te ahorra código y errores.

> [!ejercicio] Practica
>
> Trabaja en un fichero `22-deslizadores.py` salvo donde se indique otra cosa:
>
> 1. Crea un `ttk.Scale` de 0 a 100 y una etiqueta que muestre su valor sin redondear mientras lo arrastras. Anota los números que salen y después redondéalo.
> 2. Ata un deslizador a un `IntVar` y muestra a la vez `variable.get()` y `escala.get()` en dos etiquetas. Muévelo y comprueba en qué momentos no coinciden. Cámbialo a `DoubleVar`.
> 3. Pon `command=mi_funcion` donde `mi_funcion` no acepte argumentos. Mueve el tirador y lee el error. Arréglalo de las dos formas posibles.
> 4. Escribe en `22-comparar.py` el mismo control con `ttk.Scale` y con `tk.Scale`, el clásico con `resolution=10`, `tickinterval=20` y `label`. Cuenta las líneas que necesita cada uno para mostrar su valor.
> 5. Haz un deslizador vertical de 0 a 10 donde el 10 quede arriba, con el valor debajo. Prueba primero con `from_=0, to=10` y anota qué pasa.
> 6. Monta tres deslizadores de rojo, verde y azul de 0 a 255 con `tk.Scale` y `resolution=1`, y pinta con el color resultante el fondo de un `tk.Frame`.
