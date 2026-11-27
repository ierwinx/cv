---
titulo: "El botón: Button"
resumen: "El widget que convierte una ventana en un programa: cómo se ata una función, cómo se le pasan argumentos sin caer en las dos trampas clásicas, cómo se deshabilita y cómo se prueba sin pulsarlo."
minutos: 22
orden: 14
---

Si el `Label` es la salida de una interfaz, el botón es la entrada. Y es más que un widget más: es la pieza que cambia la forma de programar. Hasta el módulo 2, tus programas decidían ellos cuándo pedir datos y en qué orden. Un botón invierte eso: tú escribes la función y **es quien usa el programa el que decide cuándo se ejecuta**, o si se ejecuta. Eso es el bucle de eventos de la lección 3, visto desde el lado práctico.

El widget en sí es sencillo, casi un `Label` con una función atada. Lo que tiene sustancia son las tres o cuatro formas de meter la pata al atar esa función, y eso es el centro de la lección.

> [!objetivo] Qué vas a aprender
>
> Atar una función a un botón con `command`, pasarle argumentos con `lambda` o con `partial` sin caer en la trampa de la variable tardía, distinguir el botón temático del clásico y saber cuándo hace falta el clásico, deshabilitar un botón mientras el programa trabaja, marcar el botón principal de una ventana, y probar un botón desde el código con `invoke`.

## `command`: la función, no la llamada

Un botón se crea con su texto y su función:

```python
def guardar():
        print("Guardando")

ttk.Button(ventana, text="Guardar", command=guardar).pack()
```

Fíjate bien en `command=guardar`, **sin paréntesis**. Le estás dando la función para que la llame él más tarde, no el resultado de llamarla. Es el mismo concepto de función como valor que usabas al pasarle `key=len` a `sorted`, y aquí es obligatorio.

Con paréntesis, el error es silencioso y desconcertante:

```consola
>>> veces = 0
>>> def contar():
...     global veces
...     veces += 1
...     print("pulsado, veces =", veces)
...
>>> boton = ttk.Button(ventana, text="mal", command=contar())
pulsado, veces = 1
>>> boton.cget("command")
''
```

Mira lo que ha pasado. La función se ha ejecutado **al crear el botón**, antes de que exista la ventana y sin que nadie haya pulsado nada, y el botón se ha quedado con `command` vacío, porque lo que recibió fue el `None` que devolvía `contar`. El síntoma clásico es "la acción se ejecuta sola al arrancar y luego el botón no hace nada", y siempre es este par de paréntesis.

> [!aviso] Y si la función devuelve algo, tampoco da error
>
> Lo esperable sería que pasarle un valor cualquiera fallase. No falla:
>
> ```consola
> >>> ttk.Button(ventana, command=5).cget("command")
> 5
> ```
>
> Tk se lo queda como el nombre de una orden de Tcl y no se queja hasta que alguien pulsa:
>
> ```consola
> >>> ttk.Button(ventana, command="hola").invoke()
> _tkinter.TclError: invalid command name "hola"
> ```
>
> Así que el error puede aparecer minutos después, en la pulsación, lejos de la línea que lo causó.

## Pasarle argumentos

`command` no admite argumentos: Tk llama a la función sin nada. Cuando el botón tiene que decirle algo a la función, se envuelve.

La forma corta es `lambda`:

```python
ttk.Button(ventana, text="Borrar", command=lambda: borrar(fichero)).pack()
```

La forma explícita es `functools.partial`, que deja ver mejor qué se está fijando:

```consola
>>> from functools import partial
>>> def saludar(nombre, veces=1):
...     print("hola", nombre, "x", veces)
...
>>> ttk.Button(ventana, command=partial(saludar, "Erwin", veces=2)).invoke()
hola Erwin x 2
```

Las dos valen. `lambda` para algo corto, `partial` cuando hay varios argumentos o quieres que se lea como lo que es.

Y ahora la trampa buena, que es la que pilla a todo el mundo la primera vez. Botones creados en un bucle:

```python
for nombre in ("A", "B", "C"):
        ttk.Button(ventana, text=nombre,
               command=lambda: print("pulsado", nombre)).pack()
```

Los tres botones dicen lo mismo:

```salida
pulsado C
pulsado C
pulsado C
```

La razón es que la `lambda` no guarda el valor de `nombre`, guarda **la variable** `nombre`. Cuando alguien pulsa, el bucle terminó hace rato y la variable vale `"C"`. No es cosa de Tkinter, es cómo funcionan los cierres en Python, y aquí se nota porque la llamada ocurre mucho después.

La solución es capturar el valor en un argumento por defecto, que sí se evalúa en el momento de crear la `lambda`:

```python
for nombre in ("A", "B", "C"):
        ttk.Button(ventana, text=nombre,
               command=lambda n=nombre: print("pulsado", n)).pack()
```

```salida
pulsado A
pulsado B
pulsado C
```

Con `partial` el problema no existe, porque `partial(mostrar, nombre)` evalúa `nombre` al construirse. Es un argumento decente para preferirlo en los bucles.

> [!consejo] El `command` no debe tardar
>
> Un botón cuyo `command` tarda tres segundos congela la ventana durante tres segundos: no se repinta, no responde y el sistema puede marcarla como bloqueada. Es lo que viste en la lección del bucle de eventos, y ahora ya sabes dónde aparece de verdad.
>
> La regla mientras no llegue la lección de tareas largas del bloque E: lo que vaya en un `command` tiene que ser instantáneo. Si no lo es, lo mínimo decente es deshabilitar el botón y avisar en una etiqueta antes de empezar, que es lo que se ve en el ejemplo del final.

## Las opciones del botón

Un `ttk.Button` tiene quince opciones, la mitad que su equivalente clásico:

```consola
>>> sorted(ttk.Button(ventana).configure().keys())
['class', 'command', 'compound', 'cursor', 'default', 'image', 'justify',
 'padding', 'state', 'style', 'takefocus', 'text', 'textvariable',
 'underline', 'width']
```

Las que no viste en el `Label`:

| Opción | Qué hace |
| --- | --- |
| `command` | La función que se llama al pulsar |
| `default` | Marca este botón como el de por omisión de la ventana |
| `state` | `normal` o `disabled` |
| `takefocus` | Si el botón entra en el recorrido del tabulador |

`width` y `padding` funcionan como en la etiqueta, y merece la pena ver la diferencia medida, porque se confunden:

```consola
>>> for kw in ({}, {"width": 12}, {"padding": 10}):
...     b = ttk.Button(ventana, text="Guardar", **kw)
...     b.pack(); ventana.update_idletasks()
...     print(kw, b.winfo_reqwidth(), b.winfo_reqheight())
...
{} 89 28
{'width': 12} 148 28
{'padding': 10} 109 48
```

`width` reserva caracteres y solo afecta al ancho. `padding` añade píxeles por los cuatro lados y engorda también el alto. Para una fila de botones que deban medir todos lo mismo, `width` es lo que quieres.

> [!nota] Lo que el botón temático no tiene
>
> Comparado con el clásico, al `ttk.Button` le faltan veintidós opciones, y tres duelen:
>
> ```consola
> >>> ttk.Button(ventana, font=("Helvetica", 14))
> _tkinter.TclError: unknown option "-font"
> >>> ttk.Button(ventana, relief="solid")
> _tkinter.TclError: unknown option "-relief"
> >>> ttk.Button(ventana, wraplength=100)
> _tkinter.TclError: unknown option "-wraplength"
> ```
>
> No es un olvido: en `ttk` la fuente, el relieve y los colores viven en el estilo, como se explicó en la lección 6. Un botón con otra fuente es un `ttk.Style` con un nombre acabado en `.TButton`. Lo que de verdad no tiene sustituto es `wraplength`: un botón temático no parte su texto en dos líneas, y si necesitas eso, o acortas el texto, o usas `tk.Button`.

## Deshabilitar un botón

Un botón que no se puede pulsar todavía tiene que estar apagado, no ausente. Es una de las cosas que más se olvidan y que más diferencia notan quienes usan el programa: si "Guardar" está gris, ya saben que falta algo, mientras que si está normal y no hace nada, piensan que el programa está roto.

```python
boton.configure(state="disabled")   # apagado
boton.configure(state="normal")     # encendido
```

Un botón deshabilitado ignora las pulsaciones, y también ignora las llamadas desde el código:

```consola
>>> boton = ttk.Button(ventana, text="x", command=lambda: print("EJECUTADO"),
...                    state="disabled")
>>> boton.invoke()
''
>>> boton.configure(state="normal")
>>> boton.invoke()
EJECUTADO
'None'
```

Ese `invoke` es una herramienta muy útil: **pulsa el botón desde el código**. Sirve para probar una interfaz sin tocar el ratón, para ejecutar la acción por omisión al pulsar <kbd>Intro</kbd>, y para comprobar que un botón deshabilitado está realmente deshabilitado. Lo que devuelve es el valor del `command` convertido a cadena por Tcl, por eso sale `'None'` entre comillas en vez de `None`; no lo uses para recoger resultados.

> [!aviso] `ttk` se traga los estados inventados
>
> En `tk`, un estado mal escrito falla en el momento:
>
> ```consola
> >>> tk.Button(ventana, state="pepe")
> _tkinter.TclError: bad state "pepe": must be active, disabled, or normal
> ```
>
> En `ttk`, no:
>
> ```consola
> >>> boton = ttk.Button(ventana, text="x", state="pepe")
> >>> boton.cget("state")
> 'pepe'
> >>> boton.instate(["disabled"])
> False
> ```
>
> Sin error, sin aviso, y el botón sigue funcionando como si nada. Si alguna vez escribes `state="disable"` en singular por descuido, el botón se queda encendido y no hay ninguna pista. Merece la pena comprobarlo con `instate(["disabled"])`, que responde a lo que de verdad importa.

## El botón principal de la ventana

Cuando una ventana tiene varios botones, uno suele ser el principal: el que se activa al pulsar <kbd>Intro</kbd> y el que el sistema dibuja resaltado. Se marca con `default`:

```python
ttk.Button(acciones, text="Guardar", command=guardar, default="active")
```

Y hace falta una línea más, porque `default` marca el botón pero no ata la tecla:

```python
ventana.bind("<Return>", lambda evento: guardar())
```

Los tres valores de `default` son `active` para el principal, `normal` para los demás y `disabled` para los que nunca deben responder a <kbd>Intro</kbd>. Los valores por defecto no coinciden entre familias:

```consola
>>> ttk.Button(ventana).cget("default"), tk.Button(ventana).cget("default")
('normal', 'disabled')
```

Aquí aparece el primer caso del módulo en que hay que romper el criterio de usar `ttk`, y merece verse porque es exactamente el tipo de decisión que se toma en un programa real. En macOS, el tema nativo no dibuja el relleno azul del botón por omisión en un `ttk.Button`: solo deja cambiar el color del texto, que sobre el gris del tema oscuro no se lee. El botón clásico sí lo dibuja. Así que en el panel de control de referencia el botón principal es este:

```python
def boton_principal(padre, texto, comando):
        """El botón relleno con el color de acento: el botón por omisión de macOS.

    ttk en el tema aqua no lo expone, y ahí solo se puede cambiar el color del
    texto, que sobre el gris del tema oscuro se pierde. El tk.Button clásico con
    default="active" sí lo dibuja, y al pintarlo el sistema se lee igual en
    claro y en oscuro.

    No se le puede fijar la fuente: en cuanto se le pasa `font`, Tk abandona el
    dibujado nativo y el botón queda como un rectángulo blanco y plano.
    """
    return tk.Button(padre, text=texto, command=comando, default="active",
                     highlightthickness=0)
```

Dos cosas que llevarte de ahí. Una es el criterio: se usa `ttk` por defecto, y cuando no llega, se baja a `tk` **para ese widget concreto**, con un comentario que explique por qué, y encapsulado en una función para que la excepción esté en un solo sitio. La otra es el aviso del final, que es una regla real de Tk en macOS: a un `tk.Button` nativo no se le puede tocar la fuente sin perder el dibujado del sistema. Es el precio de usar el widget clásico.

## Botones con icono

Con `image` y `compound` un botón lleva icono, texto o los dos, igual que la etiqueta:

```python
ttk.Button(barra, text="Guardar", image=icono_guardar, compound="left")
```

`compound="left"` es el estándar para las barras de herramientas con texto, y `compound="image"` deja solo el icono manteniendo el texto guardado, que es lo que se usa cuando la barra tiene un modo compacto. Sigue aplicando el aviso de la lección anterior: la imagen tiene que sobrevivir a la función que la creó.

`underline` subraya un carácter para señalar su atajo, y como en la etiqueta, solo lo dibuja. Atarlo es cosa de `bind`, en el bloque D.

## Dos opciones que solo tiene el clásico

Merecen mención porque no hay forma de conseguirlas con `ttk` y alguna vez hacen falta.

**Botones que se repiten al mantenerlos pulsados.** Es lo que quieres en un par de flechas de más y menos:

```python
tk.Button(fila, text="+", command=subir, repeatdelay=500, repeatinterval=100)
```

Medio segundo hasta que arranca la repetición y luego diez veces por segundo. Por defecto las dos valen cero, que significa sin repetición.

**`overrelief`**, el relieve que adopta el botón al pasar el ratón por encima, con los mismos valores que `relief` más la cadena vacía:

```consola
>>> tk.Button(ventana, overrelief="z")
_tkinter.TclError: bad relief "z": must be flat, groove, raised, ridge, solid, sunken, or ""
```

Y de paso, `activebackground` y `activeforeground` son los colores mientras el botón está pulsado. En `ttk` todo eso se hace con `estilo.map`, que ya viste en la lección 6.

## Un formulario con sus botones

Este programa junta lo de la lección: una barra de herramientas, un formulario, una fila de acciones con botón principal, botones que se apagan cuando no procede y una acción lenta que no congela la ventana del todo.

```python title="botones.py"
"""Botones: atado de funciones, estados y botón principal."""

import tkinter as tk
from tkinter import ttk
from functools import partial

MARGEN = 12
AIRE = 4

HERRAMIENTAS = ("Nuevo", "Abrir", "Guardar", "Exportar")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def boton_principal(padre, texto, comando):
        """El botón por omisión, en tk porque ttk no lo dibuja en macOS."""
    return tk.Button(padre, text=texto, command=comando, default="active",
                     highlightthickness=0)


def registrar(accion):
        """La acción de cada botón de la barra. Recibe su nombre."""
    estado.set(f"{accion}: hecho")


def crear_barra(ventana):
        """Barra de herramientas. partial evita la trampa de la variable tardía."""
    barra = ttk.Frame(ventana, padding=(MARGEN, AIRE))
    barra.pack(side="top", fill="x")

    for accion in HERRAMIENTAS:
                ttk.Button(barra, text=accion, width=9,
                   command=partial(registrar, accion)).pack(
            side="left", padx=(0, AIRE))

    ttk.Separator(ventana, orient="horizontal").pack(fill="x")
    return barra


def crear_formulario(contenedor):
        """Un campo que decide si el botón principal se puede pulsar."""
    formulario = ttk.Frame(contenedor)
    formulario.pack(fill="x", pady=(0, MARGEN))

    ttk.Label(formulario, text="Nombre:", anchor="e", width=9).grid(
        row=0, column=0, sticky="e")
    campo = ttk.Entry(formulario, textvariable=nombre)
    campo.grid(row=0, column=1, sticky="ew", padx=(AIRE, 0))

    formulario.columnconfigure(1, weight=1)
    return formulario


def revisar(*_):
        """Enciende o apaga el botón de guardar según haya nombre o no."""
    guardar_boton.configure(state="normal" if nombre.get().strip() else "disabled")


def guardar():
        """Acción lenta: apaga el botón y avisa antes de ponerse a trabajar."""
    guardar_boton.configure(state="disabled")
    estado.set("Guardando...")
    # El after suelta el control para que Tk repinte antes de seguir.
    ventana.after(600, terminar_guardado)


def terminar_guardado():
        estado.set(f"Guardado: {nombre.get().strip()}")
    revisar()


def cancelar():
        nombre.set("")
    estado.set("Cancelado")


def crear_acciones(contenedor):
        """Fila inferior, alineada a la derecha: el orden importa."""
    global guardar_boton
    acciones = ttk.Frame(contenedor)
    acciones.pack(fill="x", pady=(MARGEN, 0))

    ttk.Button(acciones, text="Cancelar", width=10,
               command=cancelar).pack(side="right", padx=(AIRE, 0))
    guardar_boton = boton_principal(acciones, "Guardar", guardar)
    guardar_boton.pack(side="right")
    return acciones


ventana = tk.Tk()
ventana.title("Botones")
ventana.minsize(460, 240)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
nombre = tk.StringVar()
estado = tk.StringVar(value="Listo")
guardar_boton = None

crear_barra(ventana)

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_formulario(cuerpo)
ttk.Label(cuerpo, textvariable=estado, width=28, anchor="w").pack(anchor="w")
crear_acciones(cuerpo)

# El campo vigila lo que se escribe para encender el botón.
nombre.trace_add("write", revisar)
revisar()

# El botón principal responde a Intro, que default no ata por su cuenta.
ventana.bind("<Return>", lambda evento: guardar_boton.invoke())

centrar(ventana)
ventana.mainloop()
```

Tres detalles con intención. Los botones de la barra usan `partial(registrar, accion)`, no una `lambda` sin captura, y por eso cada uno informa de lo suyo. El botón de guardar nace apagado y se enciende solo cuando hay algo escrito, lo que hace innecesario comprobar el campo dentro de `guardar`. Y el `bind` de <kbd>Intro</kbd> llama a `invoke()`, con lo que si el botón está deshabilitado la tecla tampoco hace nada: la comprobación está en un sitio y no en dos.

> [!consejo] El orden de los botones y su lado
>
> En la fila de acciones, el botón principal va a la derecha en macOS y Windows, y a la izquierda en el escritorio de Linux según el entorno. Como el curso no va a hacer una interfaz distinta por sistema, la convención que se sigue es la de macOS y Windows: los botones a la derecha, el principal el último.
>
> Fíjate en que con `side="right"` los botones se colocan en orden inverso al de lectura: el primero que se empaqueta es el que queda más a la derecha. Por eso en el ejemplo se crea antes "Cancelar" que "Guardar" y aun así "Guardar" aparece a su derecha. Es la cavidad de `pack` de la lección 8, y es la causa de la mitad de las filas de botones que salen del revés.

> [!resumen] En resumen
>
> El botón es la pieza que invierte el control de un programa: tú escribes la función y quien lo usa decide cuándo se ejecuta. Se ata con `command`, al que se le pasa la función sin paréntesis, porque con paréntesis se ejecuta al crear el botón y el `command` se queda vacío; y como Tk acepta cualquier valor ahí sin protestar, el error puede no aparecer hasta la primera pulsación. Para pasarle argumentos se envuelve en una `lambda` o en un `functools.partial`, y en un bucle hay que capturar el valor con un argumento por defecto o usar `partial`, porque si no los botones comparten la variable y todos acaban haciendo lo del último. De sus quince opciones, las propias son `command`, `default`, `state` y `takefocus`; `width` reserva caracteres y `padding` añade píxeles por los cuatro lados. Un botón que no procede se deshabilita en lugar de dejarlo encendido sin efecto, teniendo en cuenta que `ttk` acepta estados mal escritos sin dar error y que lo fiable es preguntar con `instate(["disabled"])`. El botón principal se marca con `default="active"` y necesita además un `bind` de <kbd>Intro</kbd>, que conviene atar a `invoke()` para que respete el estado del botón; en macOS ese botón es el primer caso en que hay que bajar a `tk.Button`, encapsulado en una función y con el motivo comentado. Y del botón clásico quedan dos cosas sin equivalente temático: la repetición al mantener pulsado con `repeatdelay` y `repeatinterval`, y el relieve al pasar el ratón con `overrelief`.

> [!ejercicio] Practica
>
> Trabaja en un fichero `14-botones.py` salvo donde se indique otra cosa:
>
> 1. Escribe un contador con dos botones, más y menos, y una etiqueta que muestre el valor. Dale a los botones `width` igual y al de menos `state="disabled"` cuando el contador llegue a cero.
> 2. Reproduce a propósito el error de los paréntesis: pon `command=funcion()` y anota qué pasa al arrancar y qué devuelve `boton.cget("command")`. Después arréglalo.
> 3. Crea cinco botones en un bucle con los nombres de cinco ciudades, primero con una `lambda` sin captura y luego con `partial`. Comprueba con `invoke()`, sin pulsar nada, que en el primer caso los cinco dicen lo mismo.
> 4. Escribe en `14-confirmar.py` una fila de acciones con "Cancelar", "No guardar" y "Guardar", con el principal marcado con `default="active"`, atado a <kbd>Intro</kbd> y colocado a la derecha. Comprueba en qué orden hay que empaquetarlos.
> 5. Haz un botón cuya acción tarde dos segundos con un `time.sleep` y pulsalo: fíjate en que la ventana se queda congelada y en que la etiqueta de estado no llega a cambiar. Después quita el `sleep` y haz lo mismo con `after`, como en el ejemplo de la lección.
> 6. Con un `tk.Button`, monta un par de flechas de más y menos con `repeatdelay=500` y `repeatinterval=100`, y ajusta los dos valores hasta que la repetición te resulte cómoda.
