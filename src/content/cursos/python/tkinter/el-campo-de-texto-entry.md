---
titulo: "El campo de texto: Entry"
resumen: "El primer widget que guarda lo que escribe quien usa el programa: leerlo, rellenarlo, protegerlo, ponerlo de solo lectura y validarlo sin que la validación se desactive a tus espaldas."
minutos: 26
orden: 15
---

Con el `Entry` cambia el tipo de widget. La etiqueta muestra y el botón actúa, pero los dos son tuyos: el programa decide qué dicen. Un campo de texto **guarda un dato que no controlas**, escrito por quien usa el programa, en el momento que le apetezca y con el contenido que le dé la gana. Eso convierte el widget en una frontera, y como toda frontera, hay que vigilarla.

Por eso esta lección es más larga que las dos anteriores. El widget en sí es fácil: se crea, se lee con `get` y ya está. Lo que tiene fondo es lo que lo rodea: cómo se pone de solo lectura sin que parezca roto, cómo se protege una contraseña, y sobre todo la **validación**, que es el mecanismo peor documentado de Tkinter y el que tiene el fallo más traicionero de todo el módulo.

> [!objetivo] Qué vas a aprender
>
> Leer y escribir el contenido de un campo con `get`, `insert` y `delete`, y decidir entre esos métodos y una variable de control; usar los tres estados y saber por qué `readonly` ignora tus cambios en silencio; ocultar una contraseña con `show`; poner un texto de sugerencia; y montar la validación con `validate`, `register` y los códigos de sustitución, conociendo el fallo que la desactiva sin avisar.

## Crear, leer y rellenar

Un campo se crea con su ancho en caracteres y se lee con `get`:

```consola
>>> campo = ttk.Entry(ventana, width=26)
>>> campo.insert(0, "hola mundo")
>>> campo.get()
'hola mundo'
```

Los tres métodos que vas a usar siempre trabajan con posiciones de carácter, como si el contenido fuese una cadena:

```consola
>>> campo.insert("end", "!")
>>> campo.get()
'hola mundo!'
>>> campo.delete(0, 5)
>>> campo.get()
'mundo!'
>>> campo.delete(0, "end")
>>> campo.get()
''
```

`delete(0, "end")` es la forma de vaciar un campo, y conviene memorizarla porque se escribe mucho. La palabra `"end"` vale como posición en los tres métodos, igual que un número.

Los demás métodos propios del widget son estos, y salen de comparar el campo con un marco:

| Método | Para qué |
| --- | --- |
| `get()` | El contenido, como `str` |
| `insert(pos, texto)` | Mete texto en una posición |
| `delete(desde, hasta)` | Borra un tramo |
| `index("insert")` | Dónde está el cursor |
| `icursor(pos)` | Mueve el cursor |
| `select_range(a, b)` | Selecciona un tramo |
| `selection_present()` | Si hay algo seleccionado |
| `selection_get()` | El texto seleccionado |
| `xview_moveto(frac)` | Desplaza la vista si el texto no cabe |
| `validate()` | Lanza la validación a mano |

Un ejemplo de los que sí se usan a diario, seleccionar todo el contenido para que la primera tecla lo sustituya:

```consola
>>> campo.insert(0, "texto de prueba")
>>> campo.select_range(0, "end")
>>> campo.selection_present()
True
>>> campo.selection_get()
'texto de prueba'
```

## `get()` o `textvariable`

En la etiqueta, `textvariable` era una comodidad. Aquí es una decisión de diseño con consecuencias.

Con **`get()`** lees el campo cuando te hace falta, normalmente al pulsar un botón:

```python
def guardar():
        nombre = campo.get().strip()
```

Con **`textvariable`** el dato vive fuera del widget y tú te limitas a leer la variable:

```python
nombre = tk.StringVar()
ttk.Entry(formulario, textvariable=nombre).pack()
...
nombre.get().strip()
```

Parecen lo mismo y no lo son. La diferencia práctica es que una variable de control **se puede vigilar**, y un campo no. Con `trace_add` te enteras de cada pulsación sin atar un solo evento de teclado:

```python
filtro = tk.StringVar()
ttk.Entry(barra, textvariable=filtro).pack()
filtro.trace_add("write", aplicar_filtro)
```

Eso es un buscador que filtra mientras escribes, en tres líneas, y es exactamente lo que hace la tabla del panel de control de referencia. Con `get()` haría falta atar `<KeyRelease>` y acordarse de que hay teclas que no lo disparan.

El criterio, entonces: **`textvariable` para lo que reacciona mientras se escribe, o para lo que se comparte con otros widgets; `get()` para un formulario normal que se lee al aceptar.** Y ojo, si pones `textvariable`, `get()` del widget sigue funcionando y devuelve lo mismo; no son excluyentes, es solo que el dato ya tiene otra casa.

## Los tres estados, y el que engaña

Un campo tiene tres estados, uno más que el botón:

```python
campo.configure(state="normal")     # se escribe
campo.configure(state="readonly")   # se lee y se copia, no se escribe
campo.configure(state="disabled")   # apagado del todo
```

La diferencia entre los dos últimos importa: `readonly` deja seleccionar y copiar el texto, y se ve normal; `disabled` lo pinta gris y no deja ni copiar. Para mostrar un dato calculado que quien usa el programa quizá quiera copiar, como una ruta o un identificador, lo que quieres es `readonly`.

Y aquí viene el comportamiento que hay que conocer antes de tropezar con él.

> [!aviso] `readonly` y `disabled` también te ignoran a ti
>
> "Solo lectura" no significa solo para quien escribe. Significa **para todos, incluido tu código**, y los intentos fracasan sin dar ningún error:
>
> ```consola
> >>> campo = ttk.Entry(ventana)
> >>> campo.insert(0, "abc")
> >>> campo.configure(state="readonly")
> >>> campo.insert("end", "Z")
> >>> campo.get()
> 'abc'
> >>> campo.delete(0, "end")
> >>> campo.get()
> 'abc'
> ```
>
> Ni excepción, ni aviso, ni cambio. Es de los fallos más desconcertantes que hay, porque el código parece correcto y el campo no se mueve.
>
> El patrón para actualizar un campo de solo lectura es abrirlo, escribir y volver a cerrarlo:
>
> ```python
> ruta.configure(state="normal")
> ruta.delete(0, "end")
> ruta.insert(0, str(destino))
> ruta.configure(state="readonly")
> ```
>
> Es tedioso, y es la razón por la que para un campo de solo lectura suele salir mejor `textvariable`: la variable se cambia siempre, sin importar el estado del widget.

## Contraseñas: `show`

`show` sustituye cada carácter por el que le digas al dibujarlo, sin tocar el contenido:

```consola
>>> clave = ttk.Entry(ventana, show="*")
>>> clave.insert(0, "secreto")
>>> clave.get()
'secreto'
```

El campo muestra `*******` y `get()` devuelve `'secreto'`, que es justo lo que quieres. El valor tradicional es `"*"`, aunque hoy se estila más el punto gordo, `"\u2022"`.

> [!nota] Ocultar no es proteger
>
> `show` es cosa del dibujado y nada más. La contraseña está en memoria en claro, `get()` la devuelve tal cual y cualquier parte del programa puede leerla. Que no se vea en pantalla solo resuelve el problema de quien mira por encima del hombro.
>
> Lo demás (no guardarla en un fichero de texto, no escribirla en el registro, no mandarla sin cifrar) es exactamente igual que en un programa de terminal y no tiene nada que ver con el widget.

## El texto de sugerencia

El gris que dice "Buscar..." dentro del campo hasta que escribes. En Tk 9 es una opción del widget:

```consola
>>> buscador = ttk.Entry(ventana, placeholder="Buscar...")
>>> buscador.get()
''
```

Fíjate en lo importante: `get()` devuelve la cadena vacía. La sugerencia se dibuja pero **no es contenido**, que es precisamente lo que se espera de ella.

El problema es que `placeholder` no existe en Tk 8.6, que es lo que trae la mayoría de instalaciones todavía. Así que lo primero es mirar con qué cuentas:

```consola
>>> tk.TkVersion
9.0
>>> ventana.tk.call("info", "patchlevel")
'9.0.4'
```

Y si te toca 8.6, lo que **no** vale es lo evidente:

```python
buscador.insert(0, "Buscar...")   # mal
```

Eso no es una sugerencia, es texto de verdad: sale negro, no se borra al empezar a escribir y `get()` devuelve `'Buscar...'` como si alguien lo hubiera teclado. Es el apaño rápido que tiene el panel de control de referencia en su barra, y funciona ahí solo porque ese campo es decorativo y nadie lee su valor. En un campo que se lee, mete un dato falso en el formulario.

La versión que sí se porta bien necesita atar el foco, que es materia del bloque D, pero déjala anotada:

```python
def poner_sugerencia(campo, texto):
        """Sugerencia en gris que se quita al enfocar y vuelve si el campo queda vacío."""
    def salir(_=None):
                if not campo.get():
                        campo.insert(0, texto)
            campo.configure(foreground="#8E8E93")

    def entrar(_=None):
                if campo.get() == texto:
                        campo.delete(0, "end")
            campo.configure(foreground="")

    campo.bind("<FocusIn>", entrar)
    campo.bind("<FocusOut>", salir)
    salir()
```

Sigue sin ser perfecto (si alguien escribe literalmente "Buscar..." se lo come), y eso explica por qué se agradece que Tk 9 lo traiga de serie.

## La validación

Llegamos a la parte con fondo. Un campo puede rechazar lo que se escribe en él antes de aceptarlo, y el mecanismo tiene tres piezas.

La primera es **`validate`**, que dice cuándo se comprueba:

```consola
>>> ttk.Entry(ventana, validate="z")
_tkinter.TclError: bad validate "z": must be all, key, focus, focusin, focusout, or none
```

De los seis valores, los que se usan son `key`, que comprueba en cada pulsación y es lo habitual, y `focusout`, que comprueba al salir del campo y sirve para lo que solo se puede juzgar completo, como una fecha o un correo.

La segunda es **`validatecommand`**, la función que decide. No se le pasa la función directamente: hay que registrarla en Tk, porque Tcl necesita un nombre para ella:

```consola
>>> def solo_digitos(nuevo):
...     return nuevo.isdigit() or nuevo == ""
...
>>> ventana.register(solo_digitos)
'4331956160solo_digitos'
```

Ese nombre feo es lo que Tk guarda. Y la tercera pieza son los **códigos de sustitución**, con los que se pide la información que la función necesita:

```python
comprobar = (ventana.register(solo_digitos), "%P")
campo = ttk.Entry(ventana, validate="key", validatecommand=comprobar)
```

La función devuelve `True` para aceptar y `False` para rechazar, y si rechaza, la pulsación no llega al campo:

```consola
>>> campo.insert(0, "123")
>>> campo.get()
'123'
>>> campo.insert("end", "abc")
>>> campo.get()
'123'
```

Los ocho códigos son estos. Se piden los que hagan falta, en el orden que quieras, y la función recibe uno por cada uno:

| Código | Qué trae |
| --- | --- |
| `%P` | **El valor que quedaría si se acepta.** Es el que se usa el noventa por ciento de las veces |
| `%s` | El valor que hay ahora, antes del cambio |
| `%S` | Lo que se está insertando o borrando |
| `%d` | `1` si es una inserción, `0` si es un borrado, `-1` si es una comprobación de foco |
| `%i` | La posición del cambio |
| `%v` | El valor de la opción `validate` |
| `%V` | Qué ha disparado la comprobación: `key`, `focusin`, `focusout` o `forced` |
| `%W` | El nombre interno del widget |

Verlos en funcionamiento aclara más que la tabla. Con una función que los pide todos y devuelve siempre `True`, al escribir `AB` en un campo vacío llegan estos valores:

```salida
%P = 'AB'   %s = ''     %S = 'AB'   %d = '1'
%i = '0'    %v = 'all'  %V = 'key'  %W = '.!entry2'
```

Y al borrar el primer carácter de `AB`:

```salida
%P = 'B'    %s = 'AB'   %S = 'A'    %d = '0'
%i = '0'    %v = 'all'  %V = 'key'  %W = '.!entry2'
```

Tres cosas que se ven ahí y que ahorran depuración. Todos los valores llegan **como cadenas**, incluido `%d`, así que se compara con `"1"` y no con `1`. `%P` ya trae el resultado calculado, por lo que casi nunca hace falta combinar `%s` con `%S` a mano. Y en un borrado, `%S` es lo que se va, no lo que se queda.

> [!error] La validación se desactiva sola y no te lo dice
>
> Este es el fallo más traicionero del módulo, y hay que verlo para creerlo. Una función de validación con un descuido de los normales:
>
> ```python
> def positivo(P):
>         return int(P) > 0          # revienta con "" o con letras
> ```
>
> En cuanto llega algo que no es un número, `int()` lanza `ValueError`. Y lo que hace Tk al no recibir un booleano es esto:
>
> ```consola
> >>> campo.insert(0, "5")
> >>> str(campo.cget("validate"))
> 'key'
> >>> campo.insert("end", "x")          # int("5x") revienta
> >>> str(campo.cget("validate"))
> 'none'
> >>> campo.insert("end", "zzz")
> >>> campo.get()
> '5zzz'
> ```
>
> **Tk ha puesto `validate` en `none` y el campo ha dejado de validar para siempre.** A partir de ahí entra cualquier cosa. Dentro de `mainloop` la excepción se imprime en la terminal y el programa sigue, así que el síntoma que ve quien usa el programa es "la validación funcionaba y de repente dejó de funcionar", sin nada roto a la vista.
>
> Las dos precauciones que evitan esto:
>
> 1. **Que la función de validación no pueda lanzar una excepción nunca.** Nada de `int()` sin protección: se usan métodos de cadena, que no fallan, como `P.isdigit()`, `P.replace(",", "").isdigit()` o comprobar la longitud.
> 2. **Que devuelva siempre un booleano de verdad.** Si devuelve `None`, porque a algún camino le falta el `return`, pasa exactamente lo mismo:
>
> ```consola
> >>> ttk.Entry(ventana, validate="key",
> ...           validatecommand=(ventana.register(lambda P: "quizás"), "%P")).insert(0, "x")
> _tkinter.TclError: expected boolean value but got "quizás"
> ```

La tercera pieza, opcional, es **`invalidcommand`**, que se llama cada vez que se rechaza algo y sirve para avisar:

```python
campo = ttk.Entry(
    ventana, validate="key",
    validatecommand=(ventana.register(lambda P: P.isdigit() or P == ""), "%P"),
    invalidcommand=ventana.register(lambda: aviso.set("Solo números")),
)
```

> [!consejo] Valida al escribir solo lo que es imposible, y lo demás al aceptar
>
> `validate="key"` está bien para impedir lo que no puede estar ahí de ninguna manera: una letra en un campo de cantidad, más de nueve dígitos en un teléfono. Para todo lo demás es mala idea, porque un valor a medio escribir casi nunca es válido: un correo no lo es hasta que se termina, y un campo que se resiste mientras escribes resulta irritante.
>
> La regla que funciona: `validate="key"` para filtrar caracteres, comprobación completa al pulsar el botón de aceptar, y el botón deshabilitado mientras falte algo, como en la lección anterior. La estrategia completa de un formulario, con los mensajes y el resaltado del campo que falla, tiene su propia lección en el bloque D.

Y una alternativa que conviene conocer: si lo que quieres es **reaccionar** a lo que se escribe en vez de **impedirlo**, no uses validación. Usa `trace_add` sobre la variable, que es más simple y no tiene ninguna de estas trampas:

```python
texto = tk.StringVar()
ttk.Entry(ventana, textvariable=texto).pack()
texto.trace_add("write", lambda *_: contador.set(f"{len(texto.get())} caracteres"))
```

## Las demás opciones

Un `ttk.Entry` tiene diecinueve opciones:

```consola
>>> sorted(ttk.Entry(ventana).configure().keys())
['background', 'class', 'cursor', 'exportselection', 'font', 'foreground',
 'invalidcommand', 'justify', 'placeholder', 'placeholderforeground', 'show',
 'state', 'style', 'takefocus', 'textvariable', 'validate', 'validatecommand',
 'width', 'xscrollcommand']
```

Las que faltaban por nombrar: `justify` alinea el contenido, y `justify="right"` es lo correcto para cantidades; `width` va en caracteres, como siempre; `xscrollcommand` conecta el campo con una barra horizontal cuando el texto no cabe, y se ve en la lección de `Scrollbar`; y `exportselection`, que está a `1` por defecto, hace que seleccionar en el campo se lleve el portapapeles del sistema, algo que conviene poner a `0` si tienes dos campos y quieres que se puedan ver seleccionados a la vez.

De lo que solo tiene el clásico, lo único llamativo es que `tk.Entry` deja pintar el cursor y la selección con `insertbackground`, `selectbackground` y `readonlybackground`, mientras en `ttk` eso va por el estilo.

## Un formulario con validación

```python title="campos.py"
"""Entry: lectura, estados, contraseña, validación y filtro en vivo."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

CIUDADES = ("Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao",
            "Zaragoza", "Málaga", "Murcia", "Palma", "Valladolid")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def solo_digitos(propuesto):
        """Validación de teclado. Nunca lanza excepción y siempre devuelve bool."""
    return propuesto == "" or (propuesto.isdigit() and len(propuesto) <= 9)


def rechazado():
        aviso.set("Ese campo solo admite números, hasta nueve dígitos")


def crear_campos(contenedor):
        """El formulario. Devuelve el campo de solo lectura para poder actualizarlo."""
    global telefono_campo
    formulario = ttk.Frame(contenedor)
    formulario.pack(fill="x")

    ttk.Label(formulario, text="Nombre:", anchor="e", width=11).grid(
        row=0, column=0, sticky="e", pady=AIRE)
    ttk.Entry(formulario, textvariable=nombre, width=28).grid(
        row=0, column=1, sticky="ew", pady=AIRE)

    ttk.Label(formulario, text="Teléfono:", anchor="e", width=11).grid(
        row=1, column=0, sticky="e", pady=AIRE)
    telefono_campo = ttk.Entry(
        formulario, textvariable=telefono, width=28, justify="right",
        validate="key",
        validatecommand=(ventana.register(solo_digitos), "%P"),
        invalidcommand=ventana.register(rechazado))
    telefono_campo.grid(row=1, column=1, sticky="ew", pady=AIRE)

    ttk.Label(formulario, text="Contraseña:", anchor="e", width=11).grid(
        row=2, column=0, sticky="e", pady=AIRE)
    ttk.Entry(formulario, textvariable=clave, width=28, show="\u2022").grid(
        row=2, column=1, sticky="ew", pady=AIRE)

    ttk.Label(formulario, text="Ficha:", anchor="e", width=11).grid(
        row=3, column=0, sticky="e", pady=AIRE)
    # readonly y textvariable: la variable se cambia aunque el campo esté cerrado.
    ttk.Entry(formulario, textvariable=ficha, width=28,
              state="readonly").grid(row=3, column=1, sticky="ew", pady=AIRE)

    formulario.columnconfigure(1, weight=1)
    return formulario


def crear_buscador(contenedor):
        """Filtro en vivo: trace_add sobre la variable, sin atar ninguna tecla."""
    caja = ttk.LabelFrame(contenedor, text="Ciudad", padding=MARGEN)
    caja.pack(fill="both", expand=True, pady=(MARGEN, 0))

    fila = ttk.Frame(caja)
    fila.pack(fill="x", pady=(0, AIRE))
    ttk.Label(fila, text="Buscar:").pack(side="left", padx=(0, AIRE))
    ttk.Entry(fila, textvariable=filtro).pack(side="left", fill="x", expand=True)
    ttk.Button(fila, text="Limpiar", width=8,
               command=lambda: filtro.set("")).pack(side="left", padx=(AIRE, 0))

    ttk.Label(caja, textvariable=coincidencias, anchor="w").pack(fill="x")
    return caja


def filtrar(*_):
        """Se llama en cada pulsación del buscador."""
    texto = filtro.get().strip().lower()
    halladas = [c for c in CIUDADES if texto in c.lower()]
    coincidencias.set(", ".join(halladas) if halladas else "Ninguna coincidencia")


def revisar(*_):
        """El botón de alta solo se enciende cuando el formulario está completo."""
    completo = bool(nombre.get().strip()) and len(telefono.get()) == 9
    alta_boton.configure(state="normal" if completo else "disabled")


def dar_alta():
        ficha.set(f"{nombre.get().strip().upper()}-{telefono.get()[-4:]}")
    aviso.set("Alta realizada")


def limpiar():
        for variable in (nombre, telefono, clave, ficha):
                variable.set("")
    aviso.set("")


def crear_acciones(contenedor):
        global alta_boton
    acciones = ttk.Frame(contenedor)
    acciones.pack(fill="x", pady=(MARGEN, 0))

    ttk.Label(acciones, textvariable=aviso, width=34).pack(side="left")
    ttk.Button(acciones, text="Limpiar", width=9,
               command=limpiar).pack(side="right", padx=(AIRE, 0))
    alta_boton = ttk.Button(acciones, text="Dar de alta", width=12,
                            command=dar_alta, default="active")
    alta_boton.pack(side="right")
    return acciones


ventana = tk.Tk()
ventana.title("Alta de contacto")
ventana.minsize(520, 380)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
nombre = tk.StringVar()
telefono = tk.StringVar()
clave = tk.StringVar()
ficha = tk.StringVar()
filtro = tk.StringVar()
coincidencias = tk.StringVar()
aviso = tk.StringVar()
telefono_campo = None
alta_boton = None

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_campos(cuerpo)
crear_buscador(cuerpo)
crear_acciones(cuerpo)

nombre.trace_add("write", revisar)
telefono.trace_add("write", revisar)
filtro.trace_add("write", filtrar)
revisar()
filtrar()

ventana.bind("<Return>", lambda evento: alta_boton.invoke())

centrar(ventana)
ventana.mainloop()
```

Cuatro decisiones de ese programa que son el resumen práctico de la lección. `solo_digitos` no usa `int()` en ningún sitio, solo `isdigit` y `len`, así que no puede lanzar una excepción y la validación no se va a desactivar. El campo de la ficha es `readonly` pero se actualiza sin problemas porque lo que se cambia es su variable, no el widget. El buscador filtra con `trace_add` en lugar de con validación, porque quiere reaccionar y no impedir. Y el botón de alta comprueba el formulario completo, que es lo que la validación de teclado no puede hacer: que el teléfono tenga exactamente nueve dígitos no se puede exigir mientras se escribe, porque para llegar a nueve hay que pasar por uno.

> [!resumen] En resumen
>
> El `Entry` es el primer widget que guarda un dato que no controlas, y por eso es una frontera que hay que vigilar. Se lee con `get()`, se rellena con `insert` y se vacía con `delete(0, "end")`, y todos sus métodos trabajan con posiciones de carácter donde la palabra `"end"` vale como número. La alternativa a `get()` es `textvariable`, y la diferencia real es que una variable de control se puede vigilar con `trace_add`, lo que da un filtro en vivo en tres líneas; el criterio es usar la variable para lo que reacciona mientras se escribe y `get()` para el formulario que se lee al aceptar. Tiene tres estados en vez de dos, y `readonly`, que deja copiar pero no escribir, es el adecuado para los datos calculados; lo que hay que saber es que `readonly` y `disabled` ignoran también los `insert` y `delete` de tu propio código, sin dar ningún error, de modo que para cambiarlos hay que abrir el campo y volver a cerrarlo, o usar una variable. `show` oculta el contenido al dibujarlo sin tocar lo que devuelve `get()`, y ocultar no es proteger. El texto de sugerencia es la opción `placeholder` en Tk 9, y en 8.6 hay que apañarlo con el foco, nunca con un `insert`, porque eso mete un dato falso en el formulario. La validación se monta con `validate` para decir cuándo, una función registrada con `register` para decidir, y los códigos de sustitución para pedir datos, de los que `%P` (el valor resultante) resuelve casi todo; la función debe devolver siempre un booleano y no puede lanzar una excepción jamás, porque si lo hace Tk pone `validate` en `none` y el campo deja de validar para siempre sin avisar. Y valida al escribir solo lo que es imposible, deja la comprobación completa para el botón de aceptar, y si lo que quieres es reaccionar en vez de impedir, usa `trace_add` y no la validación.

> [!ejercicio] Practica
>
> Trabaja en un fichero `15-campos.py` salvo donde se indique otra cosa:
>
> 1. Escribe un campo y un botón que muestre en una etiqueta lo que hay escrito, su longitud y si está vacío. Añade otro botón que lo vacíe y otro que seleccione todo su contenido.
> 2. Pon un campo en `readonly` e intenta cambiar su contenido con `insert` desde un botón. Comprueba que no pasa nada y que no hay error. Después arréglalo de las dos formas: abriendo y cerrando el estado, y con `textvariable`.
> 3. Escribe en `15-validar.py` un campo que solo acepte números con `validate="key"`, y añade un `invalidcommand` que ponga un aviso en rojo durante dos segundos usando `after`.
> 4. Reproduce el fallo de la lección a propósito: usa `int(P) > 0` como validación, escribe una letra y luego comprueba con `cget("validate")` que la validación se ha apagado. Después arréglalo sin usar `int`.
> 5. Haz un campo que pida los ocho códigos de sustitución y los imprima. Escribe, borra, pega algo y sal del campo con el tabulador, y anota qué llega en cada caso.
> 6. Monta un buscador sobre una lista de veinte palabras con `trace_add`, que muestre las coincidencias y cuántas son. Después haz lo mismo atando `<KeyRelease>` y compara cuál de los dos te parece más fiable.
