---
titulo: "Los botones de radio: Radiobutton"
resumen: "Elegir una opción entre varias: el grupo que se forma compartiendo una variable, el descuido que deja todos los botones sin marcar, y cuándo conviene un desplegable o una lista en su lugar."
minutos: 18
orden: 18
---

Un botón de radio nunca va solo. La casilla de la lección anterior era un widget completo por sí misma, con su sí y su no; un `Radiobutton` aislado no significa nada, porque su razón de ser es **ser uno de varios** y que solo uno pueda estar marcado. El nombre viene de los botones mecánicos de las radios de coche, donde apretar uno soltaba el que estuviera apretado.

Eso cambia cómo se piensa el widget. Lo que se crea no es un botón, es un **grupo**, y el grupo no es una caja ni un marco: se forma por compartir la variable. Entender esa frase es entender la lección entera.

> [!objetivo] Qué vas a aprender
>
> Crear grupos de botones de radio con una variable compartida y un `value` por botón; saber por qué olvidar el valor inicial deja el grupo sin ninguna opción marcada y por qué olvidar la variable junta todos los botones del programa en uno solo; disponerlos de forma que se lean bien; y decidir con criterio cuándo la elección va en botones de radio, en un desplegable o en una lista.

## El grupo se forma con la variable

Tres botones, una variable, un `value` por botón:

```python
turno = tk.StringVar(value="Matutino")

for texto in ("Matutino", "Vespertino", "Mixto"):
        ttk.Radiobutton(caja, text=texto, value=texto,
                    variable=turno).pack(anchor="w")
```

Lo que hace que esos tres sean un grupo es que los tres apuntan a `turno`. No están agrupados porque estén en el mismo marco ni porque se hayan creado juntos: si crearas un cuarto botón en otra parte de la ventana con la misma variable, entraría en el grupo igual.

El mecanismo es sencillo: **un botón se dibuja marcado cuando el valor de la variable coincide con su `value`.** De ahí sale todo lo demás, incluido que solo uno pueda estar marcado, porque la variable solo puede tener un valor a la vez.

```consola
>>> turno.get()
'Matutino'
>>> botones["Mixto"].invoke()
>>> turno.get()
'Mixto'
>>> [t for t, b in botones.items() if b.instate(["selected"])]
['Mixto']
```

Y como el marcado depende de la variable, no hace falta desmarcar nada a mano. Cambiar la variable mueve el grupo entero:

```python
turno.set("Vespertino")      # se marca ese y se desmarca el que estuviera
```

El `value` puede ser de cualquier tipo, siempre que la variable sea del tipo adecuado:

```consola
>>> n = tk.IntVar(value=2)
>>> opciones = {i: ttk.Radiobutton(ventana, text=str(i), value=i, variable=n)
...             for i in (1, 2, 3)}
>>> [i for i, b in opciones.items() if b.instate(["selected"])]
[2]
```

Con un `IntVar` y valores numéricos te ahorras convertir después, que es lo cómodo cuando la opción elegida es una cantidad o un identificador.

## Los dos descuidos

Este widget tiene dos formas de salir mal, y las dos son silenciosas.

**El primero: ninguna opción marcada.** Si el valor inicial de la variable no coincide con ningún `value`, no se marca nada:

```consola
>>> sin_valor = tk.StringVar()          # empieza en cadena vacía
>>> grupo = {t: ttk.Radiobutton(ventana, text=t, value=t, variable=sin_valor)
...          for t in ("A", "B", "C")}
>>> sin_valor.get()
''
>>> any(b.instate(["selected"]) for b in grupo.values())
False
```

Fíjate en la diferencia con la casilla de la lección anterior. Allí el valor desconocido producía el tercer estado, con su guion; aquí no hay tercer estado que valga:

```consola
>>> [t for t, b in grupo.items() if b.instate(["alternate"])]
[]
```

Simplemente no hay nada marcado, que visualmente es idéntico a "el programa espera que elijas". Y a veces es justo lo que quieres, cuando la opción es obligatoria y no debe haber respuesta por omisión. Lo que no puede pasar es que sea un accidente. Así que decide siempre a propósito, y si quieres un valor por omisión, declara la variable con él:

```python
turno = tk.StringVar(value="Matutino")
```

> [!aviso] Sin variable, todos los botones del programa son un solo grupo
>
> El segundo descuido es peor, y es el que hay que conocer. Un `Radiobutton` sin `variable` no se queda sin variable: Tk le da una, pero no una para él, sino **la misma para todos**:
>
> ```consola
> >>> r1 = ttk.Radiobutton(ventana, text="uno", value="1")
> >>> r2 = ttk.Radiobutton(ventana, text="dos", value="2")
> >>> r1.cget("variable"), r2.cget("variable")
> ('::selectedButton', '::selectedButton')
> ```
>
> Ese `::selectedButton` es una variable global de Tcl, una sola para todo el programa. Y el efecto es el que te imaginas:
>
> ```consola
> >>> r1.invoke()
> >>> r1.instate(["selected"]), r2.instate(["selected"])
> (True, False)
> ```
>
> Dos botones que no tienen nada que ver se han puesto de acuerdo. En una ventana con dos preguntas independientes, «turno» y «modalidad», marcar una respuesta de la primera desmarca la de la segunda, y el fallo se describe como "los botones se pelean". Es un despiste de una línea y produce un síntoma que no se parece a su causa.
>
> La regla, entonces: **tantas variables como preguntas**, siempre explícitas. Y si te encuentras ese síntoma, lo primero que hay que mirar es `cget("variable")` de los botones que se pelean.

## Disponerlos

Un grupo se lee mucho mejor en vertical que en horizontal, porque las opciones se comparan de un vistazo recorriendo una columna:

```python
for fila, texto in enumerate(OPCIONES):
        ttk.Radiobutton(caja, text=texto, value=texto, variable=eleccion).grid(
        row=fila, column=0, sticky="w", pady=2)
```

El `sticky="w"` es imprescindible, como el `anchor="w"` de la casilla: sin él los botones quedan centrados en la columna y el resultado es un grupo con las marcas desalineadas, que es difícil de leer.

Lo normal es meterlos en un `LabelFrame` cuyo título sea la pregunta, que es la forma estándar de dejar claro qué opciones pertenecen a qué:

```python
caja = ttk.LabelFrame(contenedor, text="Turno", padding=MARGEN)
```

La alternativa de la etiqueta encima del grupo también vale, pero el `LabelFrame` dibuja el borde que delimita hasta dónde llega la pregunta, y eso importa cuando hay dos grupos seguidos.

Y un detalle de accesibilidad y de comodidad: el grupo entero ocupa una sola parada del tabulador, y dentro se recorre con las flechas. Eso es cosa de Tk y no hay que programarlo, pero conviene saberlo, porque explica por qué a veces el tabulador "se salta" opciones.

## `command` y `trace_add`, otra vez

Vale exactamente lo mismo que en la casilla, y por eso se dice corto. `command` se llama tras la pulsación y ve el valor nuevo:

```consola
>>> registro = []
>>> seleccion = tk.StringVar(value="a")
>>> ra = ttk.Radiobutton(ventana, value="a", variable=seleccion,
...                      command=lambda: registro.append(seleccion.get()))
>>> rb = ttk.Radiobutton(ventana, value="b", variable=seleccion,
...                      command=lambda: registro.append(seleccion.get()))
>>> rb.invoke(); ra.invoke(); rb.invoke()
>>> registro
['b', 'a', 'b']
```

Y no se llama si la variable cambia desde el código:

```consola
>>> seleccion.set("a")
>>> registro
['b', 'a', 'b']
```

Con el añadido de que aquí hay una razón extra para preferir `trace_add`: con `command` tendrías que ponerlo en **cada** botón del grupo, repitiendo la misma función tres o cinco veces, mientras que `trace_add` se pone una vez sobre la variable y cubre el grupo entero.

```python
turno.trace_add("write", lambda *_: aplicar_turno())
```

## Las opciones

Un `ttk.Radiobutton` tiene dieciséis opciones, las mismas que la casilla cambiando `onvalue` y `offvalue` por `value`:

```consola
>>> sorted(ttk.Radiobutton(ventana).configure().keys())
['class', 'command', 'compound', 'cursor', 'image', 'justify', 'padding',
 'state', 'style', 'takefocus', 'text', 'textvariable', 'underline', 'value',
 'variable', 'width']
```

No hay nada nuevo que explicar: `text`, `image` y `compound` funcionan como en el `Label`, `state` como en el botón, y `style="Toolbutton"` convierte el grupo en una fila de botones de los que solo uno queda hundido, que es la forma habitual de elegir entre tres o cuatro vistas en una barra de herramientas.

De métodos, como en la casilla, el temático solo tiene `invoke()`; `select()` y `deselect()` son del clásico y no hacen falta, porque para mover el grupo desde el código se cambia la variable.

## Cuándo radio, cuándo desplegable, cuándo lista

Las tres próximas lecciones resuelven el mismo problema, elegir entre varias opciones, con tres widgets distintos. Conviene tener el criterio antes de conocerlos, porque elegir mal el widget se nota más que cualquier detalle de programación.

| Widget | Cuántas opciones | Se ven todas | Elección múltiple | Cuándo es el adecuado |
| --- | --- | --- | --- | --- |
| `Radiobutton` | 2 a 5 | Sí, siempre | No | Las opciones importan y hay que compararlas. Ocupa sitio, y eso es su virtud: las opciones están a la vista |
| `Checkbutton` | Las que sean | Sí, siempre | Sí, independientes | Varias opciones que no se excluyen. Cada una es un sí o un no por su cuenta |
| `Combobox` | 5 a cientos | No, hay que abrirlo | No | Hay muchas opciones o poco espacio, o la elección es rutinaria. También si quieres permitir escribir un valor que no está en la lista |
| `Listbox` | Docenas o más | Varias a la vez | Sí, con selección extendida | Hay que ver bastantes de golpe, reordenarlas o elegir varias contiguas |

Los dos errores que se ven más a menudo, en ambos sentidos. Un `Combobox` con tres opciones esconde información que cabía perfectamente en pantalla y obliga a un clic extra para saber qué hay. Y quince botones de radio llenan la ventana de una cosa que en un desplegable habría ocupado una línea.

La frontera práctica está alrededor de **cinco**: por debajo, botones de radio; por encima, desplegable. Y hay un matiz que decide los casos dudosos: si quien usa el programa necesita **comparar** las opciones para decidir, tienen que estar a la vista, aunque sean siete.

## Un formulario con dos grupos

```python title="radios.py"
"""Radiobutton: dos grupos independientes, con estilo Toolbutton y dependencias."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

TURNOS = ("Matutino", "Vespertino", "Mixto")
MODALIDADES = ("Presencial", "Híbrida", "Remota")
VISTAS = ("Lista", "Fichas", "Tabla")

# Días de teletrabajo permitidos según la modalidad elegida.
DIAS = {"Presencial": 0, "Híbrida": 3, "Remota": 5}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_grupo(contenedor, titulo, opciones, variable):
        """Un LabelFrame con la pregunta por título y sus opciones en columna."""
    caja = ttk.LabelFrame(contenedor, text=titulo, padding=MARGEN)
    caja.pack(side="left", fill="both", expand=True, padx=(0, AIRE))

    for fila, texto in enumerate(opciones):
                ttk.Radiobutton(caja, text=texto, value=texto, variable=variable).grid(
            row=fila, column=0, sticky="w", pady=2)
    return caja


def crear_vista(contenedor):
        """El mismo widget con aspecto de botones de barra: solo uno queda hundido."""
    caja = ttk.LabelFrame(contenedor, text="Vista", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    for texto in VISTAS:
                ttk.Radiobutton(caja, text=texto, value=texto, variable=vista,
                        width=8, style="Toolbutton").pack(
            side="left", padx=(0, AIRE))
    return caja


def describir(*_):
        """Se llama cuando cambia cualquiera de las tres variables."""
    dias = DIAS[modalidad.get()]
    resumen.set(f"Turno {turno.get().lower()}, modalidad {modalidad.get().lower()}, "
                f"vista de {vista.get().lower()}.")
    detalle.set(f"{dias} días de teletrabajo a la semana" if dias
                else "Sin teletrabajo")


ventana = tk.Tk()
ventana.title("Condiciones del puesto")
ventana.minsize(520, 340)

# Una variable por pregunta, y todas con valor inicial explícito.
# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
turno = tk.StringVar(value="Matutino")
modalidad = tk.StringVar(value="Híbrida")
vista = tk.StringVar(value="Lista")
resumen = tk.StringVar()
detalle = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

grupos = ttk.Frame(cuerpo)
grupos.pack(fill="x")
crear_grupo(grupos, "Turno", TURNOS, turno)
crear_grupo(grupos, "Modalidad", MODALIDADES, modalidad)

crear_vista(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=resumen, wraplength=460, justify="left").pack(
    anchor="w")
ttk.Label(cuerpo, textvariable=detalle, foreground="#6E6E73").pack(
    anchor="w", pady=(AIRE, 0))

# Un trace por variable cubre su grupo entero, sin repetir command por botón.
for variable in (turno, modalidad, vista):
        variable.trace_add("write", describir)
describir()

centrar(ventana)
ventana.mainloop()
```

Lo que sostiene ese programa son tres variables, una por pregunta, cada una con su valor inicial declarado. Los nueve botones se reparten en tres grupos sin que ningún grupo sepa de los otros, y `crear_grupo` funciona para cualquier pregunta porque recibe la variable como argumento: es la misma idea de una función por bloque del bloque B, aplicada a un patrón que se repite.

Fíjate también en que ningún botón lleva `command`. Son nueve; con `command` habría nueve referencias a la misma función. Con tres `trace_add`, tres líneas.

> [!consejo] Redacta las opciones en paralelo
>
> Un grupo de botones de radio se lee de golpe, en columna, y eso obliga a que las opciones tengan la misma forma gramatical y una longitud parecida. "Matutino, Vespertino, Mixto" se compara de un vistazo. "Por la mañana, Vespertino, Mezcla de los dos" obliga a leer las tres con atención para entender que son alternativas de lo mismo.
>
> Y el título del grupo tiene que ser la pregunta, no una categoría: "Turno" mejor que "Opciones", y "Modalidad" mejor que "Configuración".

> [!resumen] En resumen
>
> Un botón de radio nunca va solo, porque lo que se construye es un grupo, y el grupo no lo forma un marco sino la variable compartida: cada botón se dibuja marcado cuando el valor de la variable coincide con su `value`, y de ahí sale que solo uno pueda estar marcado y que cambiar la variable mueva el grupo entero sin tener que desmarcar nada. El `value` puede ser de cualquier tipo mientras la variable sea del tipo adecuado. Hay dos descuidos silenciosos: si el valor inicial de la variable no coincide con ningún `value` no se marca nada, que a diferencia de la casilla no produce ningún estado intermedio sino simplemente un grupo en blanco, legítimo cuando la respuesta es obligatoria pero nunca por accidente; y si a un botón no se le pasa `variable`, Tk no le da una propia sino la global `::selectedButton` que comparten todos, de modo que grupos independientes se desmarcan entre sí y el síntoma no se parece a la causa. Se disponen en columna con `sticky="w"` dentro de un `LabelFrame` cuyo título sea la pregunta, y el grupo entero ocupa una sola parada del tabulador. Para reaccionar conviene `trace_add` sobre la variable en vez de `command` en cada botón, porque cubre el grupo con una sola línea. Y a la hora de elegir el widget, la frontera práctica está en cinco opciones: por debajo botones de radio, por encima un desplegable, salvo que haya que comparar las opciones para decidir, en cuyo caso tienen que estar a la vista.

> [!ejercicio] Practica
>
> Trabaja en un fichero `18-radios.py` salvo donde se indique otra cosa:
>
> 1. Haz un grupo de cuatro opciones con una variable y una etiqueta que muestre la elegida. Añade un botón que cambie la selección con `variable.set()` y comprueba que el grupo se mueve.
> 2. Crea dos grupos de tres opciones cada uno y, a propósito, no pases `variable` a ninguno. Ejecútalo y anota qué pasa al pulsar. Después imprime `cget("variable")` de un botón de cada grupo para ver la causa.
> 3. Reproduce el otro descuido: declara la variable con `tk.StringVar()` sin `value` y comprueba con `instate` que ningún botón está marcado y que ninguno está en `alternate`.
> 4. Escribe en `18-envio.py` un grupo de tres formas de envío donde cada opción tenga un precio, con un `IntVar` guardando el precio como `value`, y una etiqueta que muestre el total.
> 5. Haz que un grupo de radio habilite y deshabilite otro: al elegir "Presencial" en el primero, el segundo grupo entero debe quedar deshabilitado.
> 6. Convierte un grupo de tres opciones en una fila de botones con `style="Toolbutton"` y compáralo con el mismo grupo en formato normal. Decide cuál usarías para elegir la vista de una aplicación y por qué.
