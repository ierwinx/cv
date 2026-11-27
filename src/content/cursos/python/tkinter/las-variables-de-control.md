---
titulo: "Las variables de control"
resumen: "Qué es de verdad una StringVar, el fallo que la hace desaparecer a media ejecución, el IntVar que revienta con el campo vacío, y las cuatro cosas de trace_add que nadie cuenta."
minutos: 26
orden: 33
---

Empieza el bloque D, y empieza pagando una deuda. Casi todas las lecciones del bloque C han usado `StringVar`, `IntVar` o `BooleanVar` con la misma nota al pie: «esto se explica en su lección del bloque D». Esta es esa lección, y llega con ventaja, porque ya has visto las variables de control resolviendo problemas de verdad en una docena de widgets distintos. Ahora toca entender por qué funcionan y qué cuatro cosas hacen que no son obvias.

Y hay un motivo para tratarlas con respeto: son el sitio donde vive un fallo que hace desaparecer datos a media ejecución sin que nadie diga nada.

> [!objetivo] Qué vas a aprender
>
> Entender qué es realmente una variable de control, que explica todo lo demás; evitar el fallo por el que un widget se queda apuntando a una variable que ya no existe; elegir la clase correcta sabiendo dónde revienta cada una; y dominar `trace_add` con sus cuatro sorpresas: el orden de llamada, la traza que se desactiva sola, el disparo que se repite y la excepción que no llega a ningún sitio.

## Qué es una variable de control

Las cuatro clases son envoltorios finos sobre la misma cosa:

```consola
>>> tk.StringVar().get()      →  ''      (str)
>>> tk.IntVar().get()         →  0       (int)
>>> tk.DoubleVar().get()      →  0.0     (float)
>>> tk.BooleanVar().get()     →  False   (bool)
>>> tk.Variable().get()       →  ''
```

Las cuatro heredan de `tk.Variable`, y lo único que cambia es la conversión que aplica `get()` al leer. Pero lo importante no es eso, sino dónde está guardado el valor:

```consola
>>> nombre = tk.StringVar()
>>> str(nombre)
'PY_VAR5'
```

Eso no es una representación bonita: es **el nombre de una variable dentro del intérprete de Tcl**. El objeto de Python no guarda el valor; guarda el nombre. Y se comprueba mirando por el otro lado:

```consola
>>> apodo = tk.StringVar(name="mi_variable")
>>> apodo.set("hola")
>>> ventana.tk.globalgetvar("mi_variable")
'hola'
>>> ventana.tk.globalsetvar("mi_variable", "cambiado por Tcl")
>>> apodo.get()
'cambiado por Tcl'
```

Son la misma variable vista desde dos lenguajes. Y de ahí sale todo lo demás de la lección: por qué un `textvariable` funciona en los dos sentidos (los dos lados leen el mismo sitio), por qué dos widgets con la misma variable se mantienen sincronizados solos, y por qué existe el fallo de la sección siguiente.

## El fallo que hace desaparecer la variable

> [!error] Una variable sin referencia en Python desaparece de Tcl
>
> Este código parece razonable y está roto:
>
> ```python
> def crear_mal(padre):
>         local = tk.StringVar(value="soy local")
>     return ttk.Label(padre, textvariable=local)
> ```
>
> La variable es local a la función. Al volver, nadie en Python la referencia, así que el recolector de basura la destruye. Y el destructor de `tk.Variable` **borra la variable de Tcl**, dejando al widget apuntando a un nombre que ya no existe:
>
> ```consola
> >>> etiqueta = crear_mal(ventana)
> >>> str(etiqueta.cget("textvariable"))
> 'PY_VAR3'
> >>> gc.collect()
> >>> ventana.tk.globalgetvar("PY_VAR3")
> _tkinter.TclError: can't read "PY_VAR3": no such variable
> ```
>
> El síntoma es de los peores del módulo, porque **depende de cuándo pase el recolector**: la etiqueta funciona un rato y en algún momento deja de actualizarse, o se queda con el último valor, o el widget deja de responder a los `set`. No hay error visible, no es reproducible con fiabilidad, y no se parece en nada a su causa.
>
> La regla, que es la que han seguido todos los ejemplos del bloque C sin explicarla: **una variable de control tiene que vivir tanto como el widget que la usa**. En los ejemplos de este módulo eso son variables de módulo declaradas junto a la ventana; en el bloque E serán atributos de la clase (`self.nombre = tk.StringVar()`), que es la forma limpia y la que hace que el problema desaparezca por construcción.
>
> Si necesitas crear variables dentro de una función, guárdalas en algún sitio que sobreviva:
>
> ```python
> VARIABLES = {}          # o un atributo de la clase
>
> def crear_campo(padre, clave):
>         VARIABLES[clave] = tk.StringVar()
>     return ttk.Entry(padre, textvariable=VARIABLES[clave])
> ```

## Los dos sentidos, gratis

Un `textvariable` no es «volcar el valor al widget». Los dos lados leen y escriben el mismo sitio:

```consola
>>> s = tk.StringVar(value="desde la variable")
>>> campo = ttk.Entry(ventana, textvariable=s)
>>> campo.get()
'desde la variable'
>>> # escribimos en el widget…
>>> s.get()
'escrito en el widget'
>>> s.set("cambiado en la variable")
>>> campo.get()
'cambiado en la variable'
```

Y de ahí un truco que sale gratis: **la misma variable en dos widgets los mantiene sincronizados sin una línea de código**.

```consola
>>> comun = tk.StringVar(value="uno")
>>> primero = ttk.Entry(ventana, textvariable=comun)
>>> segundo = ttk.Entry(ventana, textvariable=comun)
>>> # se escribe en el primero…
>>> segundo.get()
'escrito en el primero'
```

Sirve para una vista previa, para un campo repetido en dos pestañas, o para el rótulo que acompaña a un `Scale`. Y se puede desatar:

```consola
>>> campo.configure(textvariable="")
>>> campo.get()
'escrito en el primero'      # se queda con lo que hubiera
>>> comun.set("ya no le afecta")
>>> campo.get()
'escrito en el primero'
```

## Elegir la clase, y dónde revienta cada una

Aquí está el segundo problema serio, y explica una regla que conviene aplicar siempre.

```consola
>>> tk.StringVar(value="007").get()
'007'
```

Una `StringVar` es fiel: devuelve exactamente lo que hay. Las otras convierten, y convertir puede fallar o puede perder datos:

```consola
>>> n = tk.IntVar()
>>> n.set(3.7)
>>> n.get()
3
```

**Trunca, no redondea**, y sin avisar. Un 3,7 se convierte en 3 y nadie se enteró.

Pero el problema de verdad es este:

> [!error] `IntVar.get()` revienta con el campo vacío
>
> Es el fallo más frecuente de todo Tkinter, y aparece en cuanto se ata un `IntVar` a un `Entry`:
>
> ```consola
> >>> cantidad = tk.IntVar(value=0)
> >>> campo = ttk.Entry(ventana, textvariable=cantidad)
> >>> # alguien escribe "no soy un numero"
> >>> cantidad.get()
> _tkinter.TclError: expected floating-point number but got a list
> >>> # alguien borra el campo del todo
> >>> cantidad.get()
> _tkinter.TclError: expected floating-point number but got ""
> ```
>
> Fíjate en los mensajes, porque son parte del problema: un `IntVar` se queja de un **número en coma flotante**, y del texto dice que es **una lista**. Buscar esos mensajes en internet no lleva a ninguna parte, y es fácil pasar media hora convencido de que el fallo está en otro sitio.
>
> Y el caso del **campo vacío** es el que hay que tener presente, porque no es un usuario raro escribiendo tonterías: es lo que pasa cuando alguien selecciona el contenido y lo borra para escribir otra cosa. Entre el borrado y el primer dígito, tu programa tiene un `IntVar` que revienta al leerlo, y si en ese hueco hay un `trace_add` que llama a `get()`, el fallo salta solo.
>
> **La regla, y vale para todo el curso: si lo escribe una persona, `StringVar`.** La conversión se hace en tu código, donde puedes decidir qué hacer con lo que no es un número:
>
> ```python
> def cantidad_valida(variable, por_omision=0):
>         """Lee un número de un campo de texto sin reventar."""
>     try:
>                 return int(variable.get())
>     except ValueError:
>                 return por_omision
> ```
>
> Los otros tipos son para donde el valor lo pone un widget y no un teclado: `IntVar` con un `Radiobutton` o un `Checkbutton`, `DoubleVar` con un `ttk.Scale` (que siempre da decimales, lección 22), `BooleanVar` con un `Checkbutton`. Ahí nunca hay texto inválido y `get()` no puede fallar.

Y la `BooleanVar` acepta los booleanos de Tcl, que son más de los que uno espera:

```consola
>>> para valor in (True, 1, "1", "true", "yes")   →  get() == True
>>> para valor in (False, 0, "0", "no")           →  get() == False
>>> tk.BooleanVar().set("")
_tkinter.TclError: expected boolean value but got ""
```

O sea que `"yes"` y `"no"` valen, pero la cadena vacía no. Es otra razón para no atar una `BooleanVar` a nada donde pueda entrar texto.

## `trace_add`, con sus cuatro sorpresas

Ya lo has usado en media docena de lecciones. Aquí va lo que hace que no es evidente.

Primero lo normal. Los modos son cuatro, y el error los enumera:

```consola
>>> variable.trace_add("escribir", funcion)
_tkinter.TclError: bad operation "escribir": must be array, read, unset, or write
```

`write` es el que se usa el noventa y nueve por ciento de las veces. `read` salta al leer, y es una curiosidad. `unset` salta al destruirse. Y se pueden pasar varios a la vez con una tupla.

La función recibe **tres cadenas**:

```consola
>>> variable.trace_add("write", lambda *a: print(a))
>>> variable.set("nuevo")
('PY_VAR0', '', 'write')
```

El nombre interno, el índice (para arrays de Tcl, siempre vacío aquí) y el modo. De ahí el `lambda *_:` que aparece en todos los ejemplos del curso: los tres argumentos no sirven casi nunca. Y ojo con el primero: es el nombre **de Tcl**, no el de tu variable de Python, así que no sirve para saber cuál de varias ha cambiado. Si una misma función atiende a varias variables, hay que decírselo con un `partial`.

Y se pueden quitar, para lo que `trace_add` devuelve un identificador:

```consola
>>> identificador = variable.trace_add("write", funcion)
>>> identificador
'4387844736<lambda>'
>>> len(variable.trace_info())
1
>>> variable.trace_remove("write", identificador)
>>> len(variable.trace_info())
0
```

Ahora las cuatro sorpresas.

> [!aviso] La última traza añadida se ejecuta primero
>
> ```consola
> >>> variable.trace_add("write", lambda *a: orden.append("primera"))
> >>> variable.trace_add("write", lambda *a: orden.append("segunda"))
> >>> variable.set("x")
> >>> orden
> ['segunda', 'primera']
> ```
>
> **Al revés del orden de registro.** No importa si las trazas son independientes, y casi siempre lo son, pero si una calcula algo que la otra usa, el resultado es el contrario del que dice el código leído de arriba abajo. Cuando el orden importa, la respuesta no es apilar trazas contando con ello: es una sola traza que llame a las dos cosas en el orden que quieras.

> [!consejo] La traza se desactiva mientras se ejecuta
>
> Esto es una buena noticia y no está documentada de forma evidente. Una traza de escritura que cambie su propia variable **no se vuelve a disparar**:
>
> ```consola
> >>> def normalizar(*_):
> ...     llamadas.append(z.get())
> ...     z.set(z.get().upper())        # cambia la variable desde dentro
> >>> z.trace_add("write", normalizar)
> >>> z.set("hola")
> >>> llamadas
> ['hola']
> >>> z.get()
> 'HOLA'
> ```
>
> Una sola llamada. Tcl desactiva la traza mientras corre, así que **se puede corregir el valor desde dentro de su propia traza** sin bucles infinitos y sin banderas. Es la forma limpia de normalizar lo que alguien escribe: pasar a mayúsculas un código, quitar espacios de los lados, recortar a una longitud máxima.
>
> Lo mismo protege el caso de dos variables que se escriben la una a la otra, que es el conversor de unidades de toda la vida:
>
> ```consola
> >>> grados.trace_add("write", c_a_f)
> >>> fahrenheit.trace_add("write", f_a_c)
> >>> grados.set(100)
> >>> pasos
> ['c->f', 'f->c']
> >>> grados.get(), fahrenheit.get()
> (100.0, 212.0)
> ```
>
> Un ida y vuelta y se para. Sin la desactivación automática eso sería un bucle infinito.

> [!aviso] Un `set` con el mismo valor dispara igual
>
> ```consola
> >>> variable.set("igual")
> >>> variable.set("igual")
> >>> len(disparos)
> 2
> ```
>
> Tk no compara: si escribes, avisa. Da igual en una traza que actualiza un rótulo, pero no si la traza hace algo caro, como rehacer una consulta o redibujar un `Canvas` entero. En ese caso el guardia lo pones tú:
>
> ```python
> def al_cambiar(*_):
>         global ultimo
>     valor = busqueda.get()
>     if valor == ultimo:
>                 return
>     ultimo = valor
>     buscar(valor)
> ```
>
> Y si además viene de alguien escribiendo, lo correcto es esperar a que pare, con el patrón de `after` de la lección 23 y un `after_cancel` de la anterior pendiente.

> [!error] Una excepción dentro de una traza no llega a ninguna parte
>
> La cuarta, y es la peligrosa:
>
> ```consola
> >>> def revienta(*_): raise ValueError("fallo en la traza")
> >>> variable.trace_add("write", revienta)
> >>> variable.set("x")          # no lanza nada
> >>> variable.get()
> 'x'
> ```
>
> El `set()` vuelve como si nada, la variable **sí cambia**, y el error solo aparece impreso en la salida de errores. Desde el punto de vista del programa no ha pasado nada: ningún `try` lo atrapa, ninguna prueba lo detecta.
>
> Es el mismo tipo de trampa que el `validatecommand` de la lección 15, aunque con distinta consecuencia: allí Tk desactivaba la validación para siempre, y aquí la traza sigue viva y volverá a fallar en cada cambio, llenando la consola de rastros que nadie mira. Así que una función de traza se escribe **a la defensiva**: sin `int()` sin proteger, sin suponer que el campo tiene contenido, y comprobando que los widgets que va a tocar ya existen (que es lo que obligaba a atar el `<<NotebookTabChanged>>` al final, en la lección 28).

## La regla, ahora con su justificación

La lección 20 enunció el reparto y aquí se puede cerrar con lo que sabemos: **en Tk los eventos son de la interacción y las variables son de los datos.**

|  | `command` y eventos `<<...>>` | `trace_add` de la variable |
| --- | --- | --- |
| Lo dispara una persona | Sí | Sí |
| Lo dispara tu código con `set()` | **No** | Sí |
| Lo dispara otro widget que comparte la variable | **No** | Sí |
| Sirve para saber *qué* pasó | Sí | No, solo que cambió |

Un `command` es una respuesta a un gesto: sirve para «se ha pulsado este botón». Una traza es una respuesta a un dato: sirve para «este valor ahora es otro, venga de donde venga». El caso que lo demostró fue el de la lección 17, con una casilla maestra que cambiaba cinco variables de golpe: ningún `command` de las cinco casillas se enteró, y las cinco trazas sí.

## El ejemplo

Un formulario con los cuatro tipos, el espejo gratis, el conversor de dos trazas y la lectura segura de números.

```python title="variables.py"
"""Las cuatro variables de control, con sus trampas resueltas."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
ROJO = "#C2185B"

MAX_NOMBRE = 20


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def entero(variable, por_omision=0):
        """Lee un número de una StringVar sin reventar.

    Por esto los campos de texto llevan StringVar y no IntVar: un IntVar
    atado a un Entry lanza TclError en cuanto el campo se queda vacío.
    """
    try:
                return int(variable.get())
    except ValueError:
                return por_omision


def crear_texto(contenedor):
        """StringVar: lo que escribe una persona, siempre StringVar."""
    marco = ttk.Labelframe(contenedor, text="StringVar", padding=MARGEN)
    marco.pack(fill="x")

    fila = ttk.Frame(marco)
    fila.pack(fill="x")
    ttk.Label(fila, text="Nombre:", width=12, anchor="w").pack(side="left")
    ttk.Entry(fila, textvariable=nombre).pack(side="left", fill="x",
                                              expand=True)

    # La misma variable en un segundo widget: espejo sin una línea de código.
    fila = ttk.Frame(marco)
    fila.pack(fill="x", pady=(AIRE, 0))
    ttk.Label(fila, text="Espejo:", width=12, anchor="w").pack(side="left")
    ttk.Entry(fila, textvariable=nombre).pack(side="left", fill="x",
                                              expand=True)

    ttk.Label(marco, textvariable=aviso_nombre, foreground=ROJO).pack(
        anchor="w", pady=(AIRE, 0))
    return marco


def crear_numeros(contenedor):
        """Un campo de texto con StringVar, y un Scale con DoubleVar."""
    marco = ttk.Labelframe(contenedor, text="Números", padding=MARGEN)
    marco.pack(fill="x", pady=(MARGEN, 0))

    fila = ttk.Frame(marco)
    fila.pack(fill="x")
    ttk.Label(fila, text="Unidades:", width=12, anchor="w").pack(side="left")
    # StringVar, aunque sea un número: lo escribe una persona.
    ttk.Entry(fila, textvariable=unidades, width=10).pack(side="left")
    ttk.Label(fila, textvariable=total, foreground=GRIS).pack(
        side="left", padx=(MARGEN, 0))

    fila = ttk.Frame(marco)
    fila.pack(fill="x", pady=(AIRE, 0))
    ttk.Label(fila, text="Descuento:", width=12, anchor="w").pack(side="left")
    # DoubleVar porque ttk.Scale siempre da decimales, lección 22.
    ttk.Scale(fila, from_=0, to=50, orient="horizontal",
              variable=descuento).pack(side="left", fill="x", expand=True)
    ttk.Label(fila, textvariable=descuento_texto, width=5,
              anchor="e").pack(side="left")
    return marco


def crear_conversor(contenedor):
        """Dos variables que se escriben la una a la otra.

    No hay bucle infinito porque Tcl desactiva cada traza mientras corre.
    """
    marco = ttk.Labelframe(contenedor, text="Dos trazas cruzadas",
                           padding=MARGEN)
    marco.pack(fill="x", pady=(MARGEN, 0))

    fila = ttk.Frame(marco)
    fila.pack(fill="x")
    for etiqueta, variable in (("Celsius", grados), ("Fahrenheit", fahrenheit)):
                ttk.Label(fila, text=f"{etiqueta}:").pack(side="left")
        ttk.Spinbox(fila, from_=-100, to=500, width=8, increment=5,
                    textvariable=variable).pack(side="left", padx=(AIRE,
                                                                  MARGEN))
    return marco


def crear_opciones(contenedor):
        """BooleanVar e IntVar: aquí el valor lo pone un widget, no un teclado."""
    marco = ttk.Labelframe(contenedor, text="BooleanVar e IntVar",
                           padding=MARGEN)
    marco.pack(fill="x", pady=(MARGEN, 0))

    ttk.Checkbutton(marco, text="Enviar una copia por correo",
                    variable=copia).pack(anchor="w")
    fila = ttk.Frame(marco)
    fila.pack(fill="x", pady=(AIRE, 0))
    for texto, valor in (("Normal", 1), ("Urgente", 2), ("Inmediato", 3)):
                ttk.Radiobutton(fila, text=texto, value=valor,
                        variable=prioridad).pack(side="left",
                                                 padx=(0, MARGEN))
    return marco


def limitar_nombre(*_):
        """Se corrige la variable desde su propia traza.

    Tcl desactiva la traza mientras se ejecuta, así que este set() no
    vuelve a llamar a esta función: no hace falta ninguna bandera.
    """
    valor = nombre.get()
    recortado = valor.strip()[:MAX_NOMBRE]
    if recortado != valor:
                nombre.set(recortado)
        aviso_nombre.set(f"Recortado a {MAX_NOMBRE} caracteres y sin espacios "
                         f"a los lados.")
    else:
                aviso_nombre.set("")


def calcular_total(*_):
        """entero() en vez de un IntVar: el campo puede estar vacío."""
    cuantas = entero(unidades)
    precio = cuantas * 9.90 * (1 - descuento.get() / 100)
    total.set(f"= {precio:,.2f} €")


def mostrar_descuento(*_):
        descuento_texto.set(f"{descuento.get():.0f}%")
    calcular_total()


def de_celsius(*_):
        """Sin esto no habría forma de escribir en los dos campos."""
    try:
                fahrenheit.set(round(grados.get() * 9 / 5 + 32, 1))
    except tk.TclError:      # el Spinbox se ha quedado vacío
                pass


def de_fahrenheit(*_):
        try:
                grados.set(round((fahrenheit.get() - 32) * 5 / 9, 1))
    except tk.TclError:
                pass


def describir(*_):
        urgencias = {1: "normal", 2: "urgente", 3: "inmediato"}
    resumen.set(f"{nombre.get() or '(sin nombre)'} — "
                f"{entero(unidades)} unidades, {descuento.get():.0f}% dto., "
                f"envío {urgencias[prioridad.get()]}, "
                f"copia {'sí' if copia.get() else 'no'}")


ventana = tk.Tk()
ventana.title("Variables de control")
ventana.minsize(560, 560)

# Todas las variables aquí, vivas mientras viva la ventana. Una variable
# creada dentro de una función y no guardada en ningún sitio la recoge el
# recolector, y el widget se queda apuntando a nada.
nombre = tk.StringVar(value="Erwin")
aviso_nombre = tk.StringVar()
unidades = tk.StringVar(value="3")       # StringVar: lo escribe una persona
total = tk.StringVar()
descuento = tk.DoubleVar(value=10)       # DoubleVar: lo pone un Scale
descuento_texto = tk.StringVar()
grados = tk.DoubleVar(value=20)
fahrenheit = tk.DoubleVar(value=68)
copia = tk.BooleanVar(value=True)
prioridad = tk.IntVar(value=1)
resumen = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_texto(cuerpo)
crear_numeros(cuerpo)
crear_conversor(cuerpo)
crear_opciones(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=resumen, foreground=GRIS, wraplength=500,
          justify="left").pack(anchor="w")

# Las trazas al final, cuando todos los widgets existen: una traza que se
# dispara con la interfaz a medio construir es un NameError de arranque.
nombre.trace_add("write", limitar_nombre)
unidades.trace_add("write", calcular_total)
descuento.trace_add("write", mostrar_descuento)
grados.trace_add("write", de_celsius)
fahrenheit.trace_add("write", de_fahrenheit)

for variable in (nombre, unidades, descuento, copia, prioridad):
        variable.trace_add("write", describir)

mostrar_descuento()
describir()

centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Una variable de control **no guarda el valor: guarda un nombre** dentro del intérprete de Tcl (`str(variable)` da algo como `'PY_VAR5'`), y las dos mitades leen el mismo sitio. Eso explica que un `textvariable` funcione en los dos sentidos y que dos widgets con la misma variable se sincronicen sin escribir nada, y explica también el peor fallo del asunto: **una variable sin referencia en Python la recoge el recolector y desaparece de Tcl**, dejando al widget apuntando a un nombre inexistente (`can't read "PY_VAR3": no such variable`); el síntoma es intermitente porque depende de cuándo pase el recolector. De ahí la regla de que una variable viva tanto como su widget: variables de módulo en los ejemplos del curso, atributos de la clase en el bloque E. Las cuatro clases solo se diferencian en la conversión de `get()`, y ahí está el segundo problema: `IntVar.set(3.7)` **trunca a 3** sin avisar, y **`IntVar.get()` lanza `TclError` si el `Entry` atado está vacío** o tiene texto, con mensajes que despistan («expected floating-point number but got a list» para un entero y un texto). El caso del campo vacío no es raro: es lo que ocurre entre que alguien borra y escribe. La regla para todo el curso: **si lo escribe una persona, `StringVar`**, y la conversión se hace en tu código con un `try`; los demás tipos son para cuando el valor lo pone un widget (`IntVar` con `Radiobutton`, `DoubleVar` con `ttk.Scale`, `BooleanVar` con `Checkbutton`). `BooleanVar` acepta los booleanos de Tcl (`"yes"`, `"no"`, `"1"`) pero revienta con la cadena vacía. De `trace_add` hay cuatro cosas que no son evidentes: los modos son `array`, `read`, `unset` y `write`, la función recibe **tres cadenas** (nombre interno de Tcl, índice y modo, de ahí el `lambda *_:`) y `trace_add` devuelve un identificador para `trace_remove`; **la última traza añadida se ejecuta primero**, al revés de lo que se lee; **la traza se desactiva mientras corre**, lo que permite corregir el valor desde dentro de su propia traza sin banderas y hace que dos variables cruzadas no entren en bucle; **un `set` con el mismo valor dispara igual**, porque Tk no compara; y **una excepción dentro de una traza no propaga**: el `set()` vuelve como si nada, la variable cambia y el error solo sale por la salida de errores, así que una traza se escribe a la defensiva. Con todo eso queda justificado el reparto de la lección 20: `command` y los eventos solo los dispara una persona, y `trace_add` se entera de todo, incluido lo que cambia tu propio código.

> [!ejercicio] Practica
>
> Trabaja en un fichero `33-variables.py` salvo donde se indique otra cosa:
>
> 1. Crea una `StringVar` e imprime `str(variable)`. Créala también con `name="prueba"` y lee su valor con `ventana.tk.globalgetvar("prueba")`.
> 2. En `33-recolector.py`, escribe la función que crea la variable dentro y devuelve solo la etiqueta. Llama a `gc.collect()` y comprueba el error. Arréglalo guardando la variable en un diccionario de módulo.
> 3. Pon dos `Entry` con la misma `StringVar` y comprueba que se copian solos. Desata uno con `configure(textvariable="")` y mira qué conserva.
> 4. Prueba `IntVar().set(3.7)` y `set(-3.7)`, y anota lo que devuelve `get()` en cada caso.
> 5. Ata un `IntVar` a un `Entry`, borra el campo y llama a `get()`. Copia el mensaje de error exacto. Cámbialo a `StringVar` y escribe la función que convierte con `try`.
> 6. Prueba `BooleanVar().set()` con `"yes"`, `"no"`, `"si"`, `2` y `""`. Anota cuáles funcionan.
> 7. En `33-orden.py`, pon dos trazas de escritura sobre la misma variable que impriman «primera» y «segunda». Ejecuta y explica el orden.
> 8. Escribe una traza que pase a mayúsculas su propia variable. Comprueba con un contador que solo se llama una vez por cambio.
> 9. Monta el conversor de Celsius a Fahrenheit con dos trazas cruzadas y comprueba que no hay bucle. Después quita la conversión de una de las dos y mira qué se rompe.
> 10. Haz que una traza lance una excepción. Comprueba que el `set()` no falla, que la variable cambia, y dónde aparece el error.
> 11. Cuenta con una lista cuántas veces se dispara una traza al hacer tres `set` con el mismo valor. Añade el guardia que evita el trabajo repetido.
