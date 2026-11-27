---
titulo: "El marco con título: LabelFrame"
resumen: "El widget que cierra la escala de separación, el labelwidget que convierte el título en una casilla, y el hallazgo que da de verdad trabajo: desactivar un marco no desactiva nada de lo que hay dentro."
minutos: 26
orden: 30
---

La lección 29 dejó una escala de tres peldaños para separar cosas en una ventana: primero espacio en blanco, luego un marco con título, y la línea del `Separator` solo cuando no cabe ninguna de las dos. Este es el peldaño de en medio, y es el que se usa más: un `Frame` normal, de los de la lección 11, con un borde y un rótulo encima.

La diferencia con una línea es que **un marco dice qué separa**. Un `Separator` entre dos grupos de campos informa de que hay un corte; un marco con el título «Conexión» encima informa de que los tres campos de dentro van juntos y de por qué. Cuando un formulario pasa de una docena de campos, eso es la diferencia entre una ventana que se entiende de un vistazo y una lista larga.

Y trae un regalo que casi nadie usa y una trampa que todo el mundo se come. El regalo es que el título puede ser **un widget cualquiera**, normalmente una casilla que enciende y apaga el grupo entero. La trampa es que apagarlo no apaga nada.

> [!objetivo] Qué vas a aprender
>
> Agrupar campos con marcos titulados y saber cuándo el título sobra; colocar el rótulo en cualquiera de sus posiciones sabiendo que aquí Tk no valida lo que le pasas; poner una casilla como título con el patrón de grupo que se activa; y sobre todo resolver bien lo que no viene resuelto: desactivar todo el contenido de un grupo sin romper la casilla que lo manda ni perder los estados de los campos.

## Las opciones

```consola
>>> sorted(ttk.Labelframe(ventana).configure().keys())
['borderwidth', 'class', 'cursor', 'height', 'labelanchor', 'labelwidget',
 'padding', 'relief', 'style', 'takefocus', 'text', 'underline', 'width']
```

Trece, y solo cuatro son de este widget y no de cualquier otro:

| Opción | Qué hace |
| --- | --- |
| `text` | El rótulo del marco. |
| `labelwidget` | Un widget que hace de rótulo **en lugar** del `text`. |
| `labelanchor` | Dónde se coloca el rótulo. De fábrica `nw`. |
| `underline` | Subraya una letra del `text`, por su posición. |

`ttk.Labelframe` es uno de los pocos widgets temáticos que conserva `relief` y `borderwidth`, aunque los dos vienen vacíos porque de fábrica decide el tema. Y como en todo el módulo, `ttk.LabelFrame` con la F grande es el mismo objeto:

```consola
>>> ttk.LabelFrame is ttk.Labelframe
True
```

Lo que le falta respecto al clásico es lo de siempre, más una cosa que se echa en falta de verdad:

```consola
>>> sorted(set(tk.LabelFrame(ventana).configure()) - set(ttk.Labelframe(ventana).configure()))
['background', 'bd', 'bg', 'colormap', 'container', 'fg', 'font', 'foreground',
 'highlightbackground', 'highlightcolor', 'highlightthickness', 'padx', 'pady',
 'visual']
```

**`font` y `foreground`**: en la versión temática no se puede poner el título en negrita sin crear un estilo, que es asunto de la lección de temas del bloque E. Si lo único que quieres es un rótulo en negrita, casi siempre sale mejor un `Frame` normal con un `Label` en negrita encima que pelearse con esto.

Y el reparto del relleno es el habitual entre las dos familias:

```consola
>>> "padx" in ttk.Labelframe(ventana).configure()
False
>>> "padding" in tk.LabelFrame(ventana).configure()
False
```

El temático usa `padding`, que ya conoces del `Frame` de la lección 11, y acepta uno, dos o cuatro números. El clásico usa `padx` y `pady`. Aquí el relleno importa más que en un `Frame` pelado, porque el contenido pegado al borde de un marco con título queda peor que pegado a la nada:

```consola
>>> sin_relleno.winfo_reqwidth(), sin_relleno.winfo_reqheight()
(39, 38)
>>> con_padding_10.winfo_reqwidth(), con_padding_10.winfo_reqheight()
(44, 58)
```

## Dónde va el rótulo

Y aquí hay que romper una costumbre del bloque. Hasta ahora, cuando había que saber los valores válidos de una opción, la lección los sacaba del error de Tk, porque es más fiable que una lista copiada a mano. Con esta opción **eso no funciona**:

```consola
>>> ttk.Labelframe(ventana, labelanchor="z")
_tkinter.TclError: Bad label anchor specification z
```

No los enumera. Es el primer caso del módulo en que Tk protesta sin decir qué esperaba. Y al buscarlos a la fuerza, probando las cuatro letras solas y todas sus parejas, aparece algo peor:

```consola
>>> [c for c in candidatos if acepta(c)]
['n', 's', 'e', 'w', 'nn', 'ns', 'ne', 'nw', 'sn', 'ss', 'se', 'sw',
 'en', 'es', 'ee', 'ew', 'wn', 'ws', 'we', 'ww']
```

Veinte valores aceptados, y ahí dentro hay cosas que no significan nada: `nn`, `ww`, `ee`, `ss`, `ew`. **Tk las traga sin decir nada y coloca el rótulo donde le parece.** Los que tienen sentido son doce, y se leen en dos partes: la primera letra es el lado del marco y la segunda, dónde queda a lo largo de ese lado.

| Lado | Valores | Dónde sale el rótulo |
| --- | --- | --- |
| Arriba | `nw`, `n`, `ne` | Sobre el borde superior, a la izquierda, centrado o a la derecha. |
| Derecha | `en`, `e`, `es` | Sobre el borde derecho, girado, arriba, centrado o abajo. |
| Abajo | `sw`, `s`, `se` | Sobre el borde inferior. |
| Izquierda | `wn`, `w`, `ws` | Sobre el borde izquierdo, girado. |

> [!aviso] Aquí no te avisa nadie
>
> Esta es la excepción a la regla de que Tk valida lo que le pasas, y conviene recordarla porque cambia cómo se depura. Un `labelanchor="en"` mal escrito como `"ne"` no da error: el rótulo aparece en otro sitio y hay que darse cuenta mirando. Lo mismo vale para el `anchor` a secas, que en este widget **no existe**:
>
> ```consola
> >>> ttk.Labelframe(ventana, anchor="e")
> _tkinter.TclError: unknown option "-anchor"
> ```
>
> Ese sí protesta, y menos mal, porque escribir `anchor` donde va `labelanchor` es el error natural.
>
> En la práctica se usan dos: `nw`, el de fábrica, y `n` cuando el marco es ancho y el título centrado queda mejor. Los ocho de los laterales piden un rótulo cortísimo y son más una curiosidad que una herramienta.

## El título ensancha el marco

Un detalle de colocación que sorprende la primera vez. El marco pide sitio para su título, aunque el contenido no lo necesite:

```consola
>>> reqwidth con text=""                                →  39
>>> reqwidth con text="Red"                             →  51
>>> reqwidth con text="Opciones avanzadas de conexion"  → 193
```

En los tres casos el contenido es la misma etiqueta de dos letras. O sea que **un título largo fija el ancho mínimo del marco**, y en una columna de marcos apilados, el del título más largo estira a todos los demás. No es un fallo, pero explica por qué a veces un grupo sale mucho más ancho de lo que su contenido justifica, y es una razón práctica para que los títulos sean cortos.

Y `width`, si lo pones, manda por encima de eso:

```consola
>>> marco = ttk.Labelframe(ventana, text="Opciones avanzadas de conexion", width=60)
>>> marco.winfo_reqwidth()
60
```

Sesenta, con el título recortado. Es lo mismo que pasaba con el `Notebook` en la lección 28, así que ya son dos veces y se puede dar por regla: **en los contenedores de `ttk`, `width` y `height` son tamaños estrictos y no mínimos.** Si lo que quieres es un mínimo, es cosa de los pesos del `grid` o del `minsize` de la ventana.

## Una casilla como título

Esto es lo mejor que tiene el widget. `labelwidget` sustituye el rótulo por un widget de verdad:

```python
grupo = ttk.Labelframe(cuerpo)
activo = tk.BooleanVar(value=False)
casilla = ttk.Checkbutton(grupo, text="Copia automática", variable=activo,
                          command=cambiar)
grupo.configure(labelwidget=casilla)
```

Y lo que sale es el patrón del grupo que se enciende: una casilla en el borde del marco que activa o desactiva todo lo que hay dentro. Se ve en cualquier diálogo de preferencias del sistema y evita la alternativa mala, que es una casilla suelta encima de un marco con el título repetido.

Dos cosas que hay que saber. La primera, el padre, que a estas alturas ya es la cantinela del módulo: **la casilla tiene que ser hija del propio `Labelframe`**. Y el castigo depende de con quién te equivoques:

```consola
>>> ajeno = ttk.Checkbutton(ventana, text="y")      # hijo de la ventana
>>> marco.configure(labelwidget=ajeno)              # aceptado, sin error
>>> ajeno.winfo_ismapped(), marco.winfo_reqwidth()
(0, 1)
>>> de_otro_marco = ttk.Checkbutton(otro_marco, text="x")
>>> marco.configure(labelwidget=de_otro_marco)
_tkinter.TclError: cannot add ".!labelframe2.!checkbutton" as content of ".!labelframe3"
```

Un hermano se acepta en silencio y deja el marco en **un píxel de ancho**, sin rótulo y sin sitio; un hijo de otro widget sí lanza el error. Es exactamente el mismo reparto que en el `add` del `Notebook` y del `Panedwindow`, tercera vez que aparece: cuando un contenedor de `ttk` adopta un widget, el padre tiene que ser él.

La segunda es que el `text` no se pierde:

```consola
>>> marco = ttk.Labelframe(ventana, text="Conexión")
>>> marco.configure(labelwidget=casilla)
>>> str(marco.cget("text"))
'Conexión'
>>> marco.configure(labelwidget="")     # quitamos la casilla
```

El `labelwidget` gana mientras está puesto, pero el texto sigue guardado y vuelve a verse al quitarlo. Sirve para alternar entre las dos formas del mismo marco sin llevar la cuenta a mano.

## Desactivar el grupo no desactiva nada

Y llegamos al motivo de que esta lección no sea corta.

> [!error] El estado de un marco no baja a sus hijos
>
> Lo que uno escribe al montar el patrón de la casilla es esto, y no hace nada:
>
> ```python
> grupo.state(["disabled"])       # inútil para el contenido
> ```
>
> Medido con tres widgets dentro:
>
> ```consola
> >>> grupo.state(["disabled"])
> >>> grupo.instate(["disabled"])
> True
> >>> campo.instate(["disabled"]), boton.instate(["disabled"])
> (False, False)
> ```
>
> El marco se pone en `disabled` y sus hijos siguen tan vivos como antes. **En Tk el estado no se hereda**: no hay ninguna relación entre el estado de un contenedor y el de lo que contiene, ni en `tk` ni en `ttk`. Un marco desactivado es solo un marco con el título en gris, con todos sus campos funcionando debajo, que es la peor interfaz posible porque promete una cosa y hace otra.
>
> No hay opción que lo arregle. Hay que **recorrer los hijos**, y el recorrido tiene tres pegas que no se ven venir.

La primera es que hay que bajar a los nietos, porque un grupo casi siempre tiene un `Frame` por medio para colocar una fila, como manda la convención del bloque B.

La segunda es que no todos los widgets tienen `state`:

```consola
>>> "state" in ttk.Frame(ventana).configure()
False
>>> "state" in ttk.Label(ventana).configure()
True
```

Un `Frame` no lo tiene y protesta con `unknown option "-state"`, así que el recorrido tiene que saltárselo. Lo bueno es que un `Label` sí lo tiene, y conviene usarlo: si los campos se apagan y sus etiquetas siguen en negro, el grupo se ve a medio apagar.

La tercera es la más sucia, y son dos trampas juntas:

> [!error] Las dos trampas del recorrido
>
> **La casilla del título es hija del marco.** Es la condición para que `labelwidget` funcione, así que aparece en `winfo_children()` con todo lo demás:
>
> ```consola
> >>> [h.winfo_class() for h in grupo.winfo_children()]
> ['TCheckbutton', 'TEntry']
> >>> casilla in grupo.winfo_children()
> True
> ```
>
> Y por tanto el recorrido ingenuo **la desactiva a ella también**:
>
> ```consola
> >>> apagar(grupo)
> >>> casilla.instate(["disabled"])
> True
> ```
>
> Ahí se acaba el programa: la casilla que apaga el grupo está apagada y no hay forma de volver a encenderlo. Hay que excluirla explícitamente.
>
> **Y al encender se pierden los estados especiales.** Si el recorrido pone `state="normal"` en todo, un campo que estaba en `readonly` (o en `disabled` por otro motivo, como la lección 19 hacía con el `Combobox` dependiente) se despierta editable:
>
> ```consola
> >>> str(campo_readonly.cget("state"))     # antes de apagar
> 'readonly'
> >>> apagar(grupo); encender(grupo)
> >>> str(campo_readonly.cget("state"))
> 'normal'
> ```
>
> Apagar y encender un grupo no puede cambiar lo que los campos eran. La solución es guardar el estado de cada widget la primera vez que se apaga y restaurar ese, no `"normal"`.

Con las tres pegas resueltas, la función queda así, y es de las que conviene copiar tal cual al resto del curso:

```python
ESTADOS = {}        # el estado de cada widget antes del primer apagón


def cambiar_estado(marco, activo, salvo=()):
        """Apaga o enciende todo lo que hay dentro de un marco.

    Hace falta recorrer los hijos porque en Tk el estado de un
    contenedor no se hereda. `salvo` es para la casilla del título,
    que es hija del marco y no debe apagarse nunca.
    """
    for hijo in marco.winfo_children():
                if hijo in salvo:
                        continue
        if hijo.winfo_children():           # un Frame por medio: baja
                        cambiar_estado(hijo, activo, salvo)
        if "state" not in hijo.configure():  # un Frame no tiene state
                        continue
        if hijo not in ESTADOS:              # guarda el original una vez
                        ESTADOS[hijo] = str(hijo.cget("state"))
        hijo.configure(state=ESTADOS[hijo] if activo else "disabled")
```

> [!consejo] Cuándo un marco con título, y cuándo no
>
> Completando la escala de la lección 29, con la frontera puesta donde se nota:
>
> - **Nada, solo espacio.** Hasta cuatro o cinco campos que van claramente juntos no hacen falta ni marcos ni líneas. Una ventana con un solo marco que lo envuelve todo tiene un marco de más.
> - **Un `Labelframe`** desde dos grupos de campos que hay que distinguir, o desde uno cuando el grupo se activa y se desactiva, porque ahí el marco además delimita **qué** se apaga. Es su caso más fuerte.
> - **Un `Separator`** cuando hay un corte que no admite título, como delante de la fila de botones.
>
> Y dos límites. Un marco dentro de otro marco casi nunca se justifica: si un grupo necesita subgrupos, lo que hace falta son pestañas o un panel de categorías, las lecciones 28 y 29. Y si en una ventana hay más de cuatro o cinco marcos, la ventana es la que está haciendo demasiado.

## El ejemplo

Un diálogo de copias de seguridad, con tres grupos: uno normal, uno que se activa con la casilla del título y uno con el rótulo centrado.

```python title="marcos.py"
"""Labelframe: grupos de campos y el patrón del grupo que se activa."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"

DESTINOS = ("Disco externo", "Carpeta en red", "Servicio en la nube")
FRECUENCIAS = ("Cada hora", "Cada día", "Cada semana")

# El estado de cada widget antes de que lo apaguemos por primera vez.
ESTADOS = {}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def cambiar_estado(marco, activo, salvo=()):
        """Apaga o enciende todo lo que hay dentro de un marco.

    Hace falta recorrer los hijos porque en Tk el estado de un
    contenedor no se hereda. `salvo` es para la casilla del título,
    que es hija del marco y no debe apagarse nunca.
    """
    for hijo in marco.winfo_children():
                if hijo in salvo:
                        continue
        if hijo.winfo_children():
                        cambiar_estado(hijo, activo, salvo)
        if "state" not in hijo.configure():
                        continue
        if hijo not in ESTADOS:
                        ESTADOS[hijo] = str(hijo.cget("state"))
        hijo.configure(state=ESTADOS[hijo] if activo else "disabled")


def fila(marco, etiqueta):
        """Una etiqueta a la izquierda y sitio a la derecha. Convención del bloque B."""
    caja = ttk.Frame(marco)
    caja.pack(fill="x", pady=AIRE)
    ttk.Label(caja, text=etiqueta, width=14, anchor="w").pack(side="left")
    return caja


def crear_origen(contenedor):
        """Un marco con título de los normales."""
    marco = ttk.Labelframe(contenedor, text="Qué se copia", padding=MARGEN)
    marco.pack(fill="x")

    caja = fila(marco, "Carpeta:")
    ttk.Entry(caja, textvariable=carpeta).pack(side="left", fill="x", expand=True)

    caja = fila(marco, "Destino:")
    ttk.Combobox(caja, values=DESTINOS, textvariable=destino,
                 state="readonly").pack(side="left", fill="x", expand=True)

    ttk.Checkbutton(marco, text="Incluir las subcarpetas",
                    variable=subcarpetas).pack(anchor="w", pady=(AIRE, 0))
    return marco


def crear_programada(contenedor):
        """El patrón del grupo que se activa: la casilla es el título.

    La casilla tiene que ser hija del propio Labelframe. Si fuera hija
    de `contenedor`, se aceptaría sin error y el marco se quedaría en
    un píxel de ancho.
    """
    marco = ttk.Labelframe(contenedor, padding=MARGEN)
    casilla = ttk.Checkbutton(marco, text="Copia programada",
                              variable=programada, command=cambiar_programada)
    marco.configure(labelwidget=casilla)
    marco.pack(fill="x", pady=(MARGEN, 0))

    caja = fila(marco, "Frecuencia:")
    ttk.Combobox(caja, values=FRECUENCIAS, textvariable=frecuencia,
                 state="readonly").pack(side="left", fill="x", expand=True)

    caja = fila(marco, "Copias:")
    ttk.Spinbox(caja, from_=1, to=30, width=6,
                textvariable=copias).pack(side="left")
    ttk.Label(caja, text="(según el plan contratado)",
              foreground=GRIS).pack(side="left", padx=(AIRE, 0))

    # Este campo no es editable por su cuenta, y al encender el grupo tiene
    # que volver a readonly y no a normal. De eso se ocupa ESTADOS.
    caja = fila(marco, "Verificar:")
    ttk.Entry(caja, textvariable=comprobacion,
              state="readonly").pack(side="left", fill="x", expand=True)
    return marco, casilla


def crear_avisos(contenedor):
        """labelanchor='n': el rótulo centrado, que en un marco ancho queda mejor."""
    marco = ttk.Labelframe(contenedor, text="Avisos", labelanchor="n",
                           padding=MARGEN)
    marco.pack(fill="x", pady=(MARGEN, 0))
    for texto, variable in (("Al terminar", al_terminar),
                            ("Si algo falla", si_falla)):
                ttk.Checkbutton(marco, text=texto, variable=variable).pack(
            side="left", padx=(0, MARGEN))
    return marco


def cambiar_programada():
        """El command de la casilla del título."""
    activo = programada.get()
    cambiar_estado(marco_programada, activo, salvo=(casilla_programada,))
    describir()


def describir():
        partes = [f"Origen: {carpeta.get() or '(sin elegir)'} → {destino.get()}"]
    if programada.get():
                partes.append(f"Programada: {frecuencia.get().lower()}, "
                      f"{copias.get()} copias")
    else:
                partes.append("Programada: no")
    avisos = [t for t, v in (("al terminar", al_terminar), ("si falla", si_falla))
              if v.get()]
    partes.append("Avisos: " + (", ".join(avisos) if avisos else "ninguno"))
    estado.set(" | ".join(partes))


ventana = tk.Tk()
ventana.title("Copias de seguridad")
ventana.minsize(520, 460)
ventana.resizable(True, False)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
carpeta = tk.StringVar(value="~/Documentos")
destino = tk.StringVar(value=DESTINOS[0])
subcarpetas = tk.BooleanVar(value=True)
programada = tk.BooleanVar(value=False)
frecuencia = tk.StringVar(value=FRECUENCIAS[1])
copias = tk.IntVar(value=7)
comprobacion = tk.StringVar(value="Suma de comprobación SHA-256")
al_terminar = tk.BooleanVar(value=True)
si_falla = tk.BooleanVar(value=True)
estado = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

marco_origen = crear_origen(cuerpo)
marco_programada, casilla_programada = crear_programada(cuerpo)
marco_avisos = crear_avisos(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x")
ttk.Button(botones, text="Copiar ahora").pack(side="left")
ttk.Button(botones, text="Guardar", command=describir).pack(side="right")

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS, wraplength=470,
          justify="left").pack(anchor="w", pady=(AIRE, 0))

# El grupo arranca apagado, según la casilla. Esta llamada es la que
# guarda el estado original de cada campo en ESTADOS.
cambiar_programada()

for variable in (destino, subcarpetas, frecuencia, al_terminar, si_falla):
        variable.trace_add("write", lambda *_: describir())

centrar(ventana)
ventana.mainloop()
```

Hay dos cosas en ese programa que merecen la mirada. El grupo programado arranca apagado, y al encenderlo el campo «Verificar», que era `readonly`, **vuelve a `readonly`** y no a editable: eso es lo que hace el diccionario `ESTADOS`. Y la casilla del título sigue funcionando cuando todo lo demás está apagado, porque va en `salvo`; si la quitas de ahí, el programa se queda muerto en cuanto desmarcas la casilla, que es exactamente el fallo que describe la lección.

> [!resumen] En resumen
>
> El `Labelframe` es un `Frame` con borde y rótulo, y es el peldaño de en medio de la escala de separación: se usa desde dos grupos de campos que hay que distinguir, o desde uno cuando el grupo se activa y se desactiva. De sus trece opciones solo cuatro son suyas: `text`, `labelwidget`, `labelanchor` y `underline`; el temático conserva `relief` y `borderwidth` pero **pierde `font` y `foreground`**, así que un título en negrita pide un estilo o directamente un `Frame` con un `Label`. Con `labelanchor` se rompe la costumbre del bloque de sacar los valores válidos del error de Tk, porque aquí el error **no los enumera** y además el widget **acepta veinte valores**, entre ellos disparates como `nn` o `ew` que traga en silencio; los que significan algo son doce y en la práctica se usan `nw` y `n`. El `anchor` a secas no existe. Un título largo **fija el ancho mínimo del marco** aunque el contenido no lo necesite, y `width` recorta por encima de eso, lo que confirma como regla que en los contenedores de `ttk` el tamaño es estricto y no un mínimo. `labelwidget` cambia el rótulo por un widget y es lo mejor que tiene: con una casilla se monta el grupo que se enciende, pero el widget **tiene que ser hijo del `Labelframe`**, y un hermano se acepta sin error dejando el marco en un píxel mientras el hijo de otro widget sí lanza `TclError`; el `text` sigue guardado debajo y vuelve al quitar el `labelwidget`. Y el hallazgo que da trabajo: **en Tk el estado no se hereda**, así que `marco.state(["disabled"])` deja todos los campos funcionando debajo de un título gris. Hay que recorrer los hijos, y el recorrido tiene que bajar a los nietos, saltarse los widgets sin `state` como el `Frame`, **excluir la casilla del título** porque es hija del marco y apagarla deja el grupo sin forma de volver, y **guardar el estado original de cada widget** para no convertir un `readonly` en editable al encender. La función `cambiar_estado` de esta lección resuelve las cuatro cosas y se reutiliza en el resto del curso.

> [!ejercicio] Practica
>
> Trabaja en un fichero `30-marcos.py` salvo donde se indique otra cosa:
>
> 1. Monta tres `Labelframe` apilados con un solo campo dentro de cada uno, y dale a uno un título muy largo. Comprueba que los tres salen del ancho del más largo y explica por qué.
> 2. Prueba `labelanchor` con los doce valores con sentido y anota dónde sale el rótulo en cada uno. Después prueba `"nn"` y `"ew"`, y mira que no dan error.
> 3. Escribe `labelanchor="e"` y luego `anchor="e"`. Compara lo que ocurre en cada caso.
> 4. En `30-estado.py`, mete un `Entry` y un `Button` en un marco, llama a `marco.state(["disabled"])` y comprueba con `instate(["disabled"])` que los hijos siguen activos. Escribe tú la función que los recorre.
> 5. Añade a ese marco un `Frame` con otro `Entry` dentro y comprueba que tu función no llega al nieto si no baja. Arréglala.
> 6. Pon una casilla como `labelwidget` y haz que apague el grupo, **sin** excluirla del recorrido. Comprueba que el programa se queda muerto y arréglalo.
> 7. Mete en el grupo un `Entry` con `state="readonly"`, apaga y enciende, y comprueba que se ha vuelto editable. Arréglalo guardando los estados.
> 8. Crea la casilla del `labelwidget` como hija del contenedor en vez del marco, y anota qué ancho pide el marco entonces.
> 9. Coge el formulario de la lección 15 o el diálogo de la 29 y agrúpalo con marcos titulados. Decide cuántos marcos necesita de verdad y justifica los que descartes.
