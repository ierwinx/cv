---
titulo: "La casilla de verificación: Checkbutton"
resumen: "El widget de sí o no, y el tercer estado que nadie espera: por qué una casilla sin variable nace a medias, cómo se manejan grupos de opciones y cómo se hace un «seleccionar todo» que se entera de lo que pasa."
minutos: 19
orden: 17
---

Una casilla de verificación es un sí o un no. Después del `Text`, que tenía cuarenta y tres opciones y un sistema de índices propio, este widget parece un descanso, y en parte lo es.

Pero trae una idea nueva que conviene subrayar, porque a partir de aquí se repite en el `Radiobutton`, el `Combobox`, el `Scale` y el `Spinbox`: **el dato no está en el widget, está en una variable de control.** En la etiqueta la variable era opcional y en el campo de texto era una elección de diseño. Aquí es obligatoria de hecho, y si te la saltas el widget hace algo que no esperas en absoluto.

> [!objetivo] Qué vas a aprender
>
> Crear casillas atadas a una variable de control y entender por qué sin variable nacen en un tercer estado; elegir el tipo de variable y los valores que guarda; manejar un grupo de opciones con un diccionario de variables; usar el estado intermedio a propósito para un «seleccionar todo»; y saber cuándo una casilla debe parecer un botón.

## La casilla y su variable

Lo normal son dos líneas:

```python
activo = tk.BooleanVar(value=False)
ttk.Checkbutton(ventana, text="Recibir avisos", variable=activo).pack(anchor="w")
```

Y a partir de ahí el widget se olvida: el valor se lee y se escribe en la variable.

```consola
>>> activo.get()
False
>>> casilla.invoke()
>>> activo.get()
True
>>> activo.set(False)
>>> casilla.instate(["selected"])
False
```

Los dos sentidos funcionan. `invoke()` simula la pulsación y actualiza la variable, y `set()` desde el código mueve la casilla en pantalla. Esa es toda la mecánica.

Fíjate en el `anchor="w"` del `pack`. Una casilla suele ser más estrecha que su contenedor, y sin ese anclaje queda centrada, lo que en una columna de opciones se ve fatal. Es el `anchor` de la lección 13 en su uso más frecuente.

## El tercer estado, que es la trampa de la lección

Ahora la parte importante. Crea una casilla sin `variable` y mírala:

```consola
>>> suelta = ttk.Checkbutton(ventana, text="Sin variable")
>>> suelta.cget("variable")
'.!checkbutton3'
>>> suelta.state()
('alternate',)
```

Dos cosas ahí. La primera es que **la variable existe igual**: al no dársela tú, Tk se inventa una con el nombre interno del widget. Así que no te has ahorrado nada, solo has perdido el acceso.

La segunda es la que importa: el estado es `alternate`. Un `Checkbutton` no tiene dos estados, tiene tres, y el tercero es el **intermedio**, ese que se dibuja con un guion o un cuadrado relleno en vez de con la marca de verificación, y que significa "ni sí ni no". La variable inventada por Tk nace vacía, y como el valor vacío no es ni `onvalue` ni `offvalue`, la casilla nace a medias.

```consola
>>> suelta.instate(["alternate"])
True
>>> suelta.instate(["selected"])
False
```

El síntoma que verás es una casilla que **arranca con un guion** y que necesita dos clics para desmarcarse: el primero la lleva del estado intermedio a marcada, y el segundo a desmarcada. Es exactamente el problema que explica un comentario del panel de control de referencia, y la solución es la de siempre: dale su variable a cada casilla, con un valor inicial explícito.

> [!aviso] La misma trampa con una variable propia mal inicializada
>
> No basta con pasar una variable: tiene que tener un valor válido. Un `StringVar()` sin `value` empieza en la cadena vacía, y si la casilla espera `"si"` o `"no"`, la cadena vacía tampoco es ninguno de los dos:
>
> ```python
> estado = tk.StringVar()                                   # empieza en ""
> ttk.Checkbutton(ventana, variable=estado,
>                 onvalue="si", offvalue="no")              # nace intermedia
> ```
>
> La costumbre que evita todos estos casos es declarar siempre el valor inicial:
>
> ```python
> estado = tk.StringVar(value="no")
> ```
>
> Y si alguna vez te encuentras una casilla con guion, ya sabes las dos preguntas: ¿tiene variable propia?, ¿esa variable vale exactamente `onvalue` u `offvalue`?

## Qué guarda la variable

Por defecto, una casilla marca con `1` y desmarca con `0`, así que con un `BooleanVar` obtienes `True` y `False`, y con un `IntVar` obtienes unos y ceros:

```consola
>>> n = tk.IntVar()
>>> casilla = ttk.Checkbutton(ventana, variable=n)
>>> casilla.invoke(); n.get()
1
>>> casilla.invoke(); n.get()
0
```

Con `onvalue` y `offvalue` decides tú los dos valores, de cualquier tipo, siempre que la variable sea del tipo adecuado:

```consola
>>> estado = tk.StringVar(value="no")
>>> acepto = ttk.Checkbutton(ventana, text="Acepto", variable=estado,
...                          onvalue="si", offvalue="no")
>>> acepto.invoke(); estado.get()
'si'
>>> acepto.invoke(); estado.get()
'no'
```

Eso viene bien cuando el valor va directo a un fichero de configuración o a una base de datos que espera `"si"` y `"no"`, o `"activo"` e `"inactivo"`, y te ahorra traducir. Para todo lo demás, `BooleanVar` y a otra cosa.

## `command` y cuándo se llama

La casilla acepta un `command`, como el botón, y se llama después de cada cambio hecho con el ratón o el teclado. Lo útil es que **ya ve el valor nuevo**:

```consola
>>> registro = []
>>> valor = tk.BooleanVar(value=False)
>>> casilla = ttk.Checkbutton(ventana, variable=valor,
...                           command=lambda: registro.append(valor.get()))
>>> casilla.invoke(); casilla.invoke()
>>> registro
[True, False]
```

No hace falta invertir nada ni consultar el estado anterior: cuando entra tu función, la variable ya está actualizada.

> [!nota] `command` no se dispara al cambiar la variable
>
> Y esto es la mitad de los despistes con este widget. `command` responde a la pulsación, no al valor. Si cambias la variable desde el código, la casilla se mueve en pantalla pero **tu función no se llama**:
>
> ```python
> activo.set(True)      # la casilla se marca, command NO se ejecuta
> ```
>
> Si lo que quieres es reaccionar al valor venga de donde venga, lo que hay que vigilar es la variable, con `trace_add`, igual que en el buscador de la lección del `Entry`:
>
> ```python
> activo.trace_add("write", lambda *_: aplicar())
> ```
>
> Regla práctica: `command` para "qué hago cuando alguien pulsa aquí"; `trace_add` para "qué hago cuando este dato cambia". Si dudas, casi siempre quieres el segundo.

## Las opciones

Un `ttk.Checkbutton` tiene diecisiete opciones:

```consola
>>> sorted(ttk.Checkbutton(ventana).configure().keys())
['class', 'command', 'compound', 'cursor', 'image', 'justify', 'offvalue',
 'onvalue', 'padding', 'state', 'style', 'takefocus', 'text', 'textvariable',
 'underline', 'variable', 'width']
```

Casi todas las conoces ya del `Label` y del `Button`. Las propias son `variable`, `onvalue` y `offvalue`, y no hay ninguna más: **el resto de la casilla es su texto**.

De métodos, en cambio, hay una diferencia con la familia clásica que conviene saber:

```consola
>>> hasattr(ttk.Checkbutton(ventana), "toggle")
False
```

`tk.Checkbutton` tiene `toggle()`, `select()` y `deselect()`. El temático no: solo tiene `invoke()`. No se pierde nada, porque para marcar o desmarcar desde el código lo correcto es tocar la variable, que es más claro y no dispara el `command`:

```python
activo.set(True)      # en vez de casilla.select()
```

Y como en el botón, una casilla deshabilitada ignora también las llamadas del código:

```consola
>>> apagada = ttk.Checkbutton(ventana, variable=tk.BooleanVar(), state="disabled")
>>> apagada.invoke()
>>> apagada.instate(["selected"])
False
```

## Un grupo de opciones

Cuando hay varias casillas, lo que no hay que hacer es una variable con nombre propio por cada una. El patrón bueno es un diccionario:

```python
OPCIONES = ("Recibir notificaciones", "Modo oscuro", "Acceso remoto")

preferencias = {texto: tk.BooleanVar(value=False) for texto in OPCIONES}

for fila, texto in enumerate(OPCIONES):
        ttk.Checkbutton(caja, text=texto, variable=preferencias[texto]).grid(
        row=fila, column=0, sticky="w", pady=2)
```

Con eso, leer el estado completo es una línea:

```python
activas = [texto for texto, var in preferencias.items() if var.get()]
```

Es el patrón que usa el panel de control de referencia para su bloque de preferencias, y escala sin tocar nada: añadir una opción es añadir una cadena a la tupla.

> [!consejo] Redacta la casilla en afirmativo
>
> Una casilla dice lo que pasa **cuando está marcada**, así que la etiqueta tiene que ser una afirmación: "Recibir notificaciones", "Recordar la sesión", "Abrir al iniciar".
>
> Lo que hay que evitar son las negaciones, porque obligan a pensar dos veces: una casilla que dice "No mostrar este aviso otra vez" marcada significa que el aviso no se muestra, y desmarcada que sí, y eso es una doble negación mental. Es tan frecuente que hay quien la llama la casilla al revés. Cuando no haya manera de evitarlo, al menos que la variable se llame igual que la etiqueta, para que el código no sume otra inversión.

## El estado intermedio, ahora a propósito

El tercer estado era un problema cuando aparecía sin querer. Usado adrede, resuelve un caso concreto: la casilla maestra de un grupo, que tiene que poder decir "algunas".

Se enciende y se apaga con el método `state`, que es el mando de los estados de `ttk`:

```consola
>>> maestra_casilla.state(["alternate"])
>>> maestra_casilla.state()
('alternate',)
>>> maestra_casilla.state(["!alternate"])
>>> maestra_casilla.state()
()
```

La exclamación delante del nombre quita el estado. Con eso, un «seleccionar todo» de tres posiciones queda así:

```python
def sincronizar():
        """Pone la casilla maestra según cuántas hijas estén marcadas."""
    marcadas = sum(var.get() for var in hijas.values())
    if marcadas == 0:
                maestra.set(False)
        maestra_casilla.state(["!alternate"])
    elif marcadas == len(hijas):
                maestra.set(True)
        maestra_casilla.state(["!alternate"])
    else:
                maestra_casilla.state(["alternate"])
```

Y comprobado con una de tres, tres de tres y ninguna, la maestra pasa por los tres estados como debe:

```salida
con 1 de 3 marcadas -> maestra state: ('alternate',)
con 3 de 3          -> maestra state: ('selected',)  valor: True
con 0 de 3          -> maestra state: ()             valor: False
```

Lo que hay que recordar es quitar el `alternate` en los dos extremos, porque si no se queda pegado y la maestra muestra un guion aunque estén todas marcadas.

## Cuando la casilla debe parecer un botón

En una barra de herramientas, una opción de sí o no no se dibuja como casilla: se dibuja como un botón que se queda hundido, como el de negrita de un procesador de textos. Sigue siendo un `Checkbutton`, solo cambia el aspecto.

En `ttk` se consigue con un estilo que ya viene hecho en todos los temas:

```python
ttk.Checkbutton(barra, text="Negrita", variable=negrita,
                style="Toolbutton").pack(side="left")
```

En la familia clásica, la opción equivalente es `indicatoron=False`, que quita el cuadradito y deja que el propio botón se hunda:

```consola
>>> "indicatoron" in ttk.Checkbutton(ventana).configure()
False
>>> tk.Checkbutton(ventana, text="Negrita", indicatoron=False).cget("indicatoron")
0
```

Con `style="Toolbutton"` resuelto en `ttk`, no hay razón para bajar al clásico por esto. De lo demás que solo tiene `tk.Checkbutton`, lo único que a veces se echa en falta es `selectcolor`, el color del interior de la casilla, que en `ttk` va por el estilo.

## Un panel de preferencias

```python title="casillas.py"
"""Checkbutton: grupo de opciones, seleccionar todo en tres estados y Toolbutton."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

OPCIONES = ("Recibir notificaciones", "Modo oscuro", "Acceso remoto",
            "Copia de seguridad diaria", "Enviar estadísticas de uso")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def sincronizar(*_):
        """Ajusta la maestra y el resumen. Se llama ante cualquier cambio."""
    marcadas = [texto for texto, var in preferencias.items() if var.get()]

    if len(marcadas) == 0:
                maestra.set(False)
        maestra_casilla.state(["!alternate"])
    elif len(marcadas) == len(OPCIONES):
                maestra.set(True)
        maestra_casilla.state(["!alternate"])
    else:
                maestra_casilla.state(["alternate"])

    resumen.set(f"{len(marcadas)} de {len(OPCIONES)} activas"
                + (f": {', '.join(marcadas)}" if marcadas else ""))
    # El acceso remoto manda sobre su opción dependiente.
    dependiente.configure(
        state="normal" if preferencias["Acceso remoto"].get() else "disabled")


def alternar_todas():
        """command de la maestra: se llama tras la pulsación, con el valor ya puesto."""
    for var in preferencias.values():
                var.set(maestra.get())


def crear_opciones(contenedor):
        """El grupo de casillas, con su diccionario de variables."""
    global dependiente, maestra_casilla
    caja = ttk.LabelFrame(contenedor, text="Preferencias", padding=MARGEN)
    caja.pack(fill="x")

    maestra_casilla = ttk.Checkbutton(caja, text="Activar todas",
                                      variable=maestra, command=alternar_todas)
    maestra_casilla.pack(anchor="w")
    ttk.Separator(caja, orient="horizontal").pack(fill="x", pady=AIRE)

    for texto in OPCIONES:
                ttk.Checkbutton(caja, text=texto, variable=preferencias[texto]).pack(
            anchor="w", pady=1)

    dependiente = ttk.Checkbutton(caja, text="Pedir confirmación al conectar",
                                  variable=confirmar)
    dependiente.pack(anchor="w", padx=(20, 0), pady=1)
    return caja


def crear_formato(contenedor):
        """Las mismas casillas con aspecto de botón de barra de herramientas."""
    caja = ttk.LabelFrame(contenedor, text="Formato", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    for texto, var in formato.items():
                ttk.Checkbutton(caja, text=texto, variable=var, width=9,
                        style="Toolbutton").pack(side="left", padx=(0, AIRE))
    return caja


ventana = tk.Tk()
ventana.title("Preferencias")
ventana.minsize(480, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
preferencias = {texto: tk.BooleanVar(value=False) for texto in OPCIONES}
formato = {texto: tk.BooleanVar(value=False)
           for texto in ("Negrita", "Cursiva", "Subrayado")}
maestra = tk.BooleanVar(value=False)
confirmar = tk.BooleanVar(value=True)
resumen = tk.StringVar()
dependiente = None
maestra_casilla = None

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_opciones(cuerpo)
crear_formato(cuerpo)

ttk.Label(cuerpo, textvariable=resumen, wraplength=420, justify="left").pack(
    anchor="w", pady=(MARGEN, 0))

# trace_add y no command: así reacciona también a los cambios de la maestra.
for variable in preferencias.values():
        variable.trace_add("write", sincronizar)
sincronizar()

centrar(ventana)
ventana.mainloop()
```

La decisión que sostiene ese programa es la del apartado de `command`. Las casillas del grupo **no** llevan `command`, llevan `trace_add` sobre sus variables. Si llevaran `command`, al pulsar "Activar todas" las cinco variables cambiarían de valor y el resumen no se enteraría, porque `command` solo responde a las pulsaciones. Con `trace_add` se entera de todo: de un clic en una casilla, del botón maestro y de cualquier cambio que haga el programa en el futuro. La maestra sí lleva `command`, porque ahí lo que hace falta es justamente reaccionar a la pulsación y no al valor, o se entraría en un bucle.

> [!resumen] En resumen
>
> Una casilla de verificación guarda un sí o un no, y con ella aparece la idea que gobierna el resto de los widgets de dato: el valor no vive en el widget, vive en una variable de control. La variable es obligatoria de hecho, porque si no la pasas Tk se inventa una que nace vacía, y como el valor vacío no es ni `onvalue` ni `offvalue`, la casilla arranca en el tercer estado, el intermedio, con su guion en vez de su marca y necesitando dos clics para apagarse; lo mismo pasa con una variable propia sin valor inicial, así que se declara siempre con `value`. Por defecto marca con uno y desmarca con cero, y con `onvalue` y `offvalue` se eligen los dos valores que se quieran, lo que viene bien cuando van directos a un fichero de configuración. El `command` se llama después de cada pulsación y ya ve el valor nuevo, pero no se dispara cuando la variable cambia desde el código, de modo que para reaccionar a un dato hay que vigilar la variable con `trace_add` y dejar `command` para responder a la pulsación. Sus únicas opciones propias son `variable`, `onvalue` y `offvalue`, y de métodos el temático solo tiene `invoke`, que tampoco hace falta porque marcar desde el código es cambiar la variable. Un grupo de opciones se maneja con un diccionario de variables en vez de una por nombre, lo que hace que leer el estado completo sea una comprensión de lista. El estado intermedio, usado a propósito con `state(["alternate"])`, es lo que permite una casilla maestra de «seleccionar todo» que sepa decir «algunas», acordándose de quitarlo con `state(["!alternate"])` en los dos extremos. Y cuando una opción va en una barra de herramientas y debe parecer un botón hundido, la solución en `ttk` es `style="Toolbutton"`, sin necesidad de bajar al `indicatoron=False` del widget clásico.

> [!ejercicio] Practica
>
> Trabaja en un fichero `17-casillas.py` salvo donde se indique otra cosa:
>
> 1. Crea dos casillas, una con `variable` y otra sin ella, y ejecútalo. Compara cómo se dibujan al arrancar y cuántos clics necesita cada una para quedar desmarcada. Imprime el `state()` de las dos antes de tocarlas.
> 2. Haz una casilla con `onvalue="activo"` y `offvalue="inactivo"` sobre un `StringVar`, y muestra su valor en una etiqueta. Prueba a crearla con `tk.StringVar()` sin `value` y anota qué pasa.
> 3. Monta cinco opciones con un diccionario de variables y un botón que imprima la lista de las marcadas. Añade una sexta opción tocando solo la tupla de textos.
> 4. Escribe en `17-todas.py` un «seleccionar todo» con los tres estados. Comprueba que al marcar una sola de las cinco la maestra muestra el guion, y que al marcarlas todas desaparece.
> 5. Pon `command` en las casillas de un grupo en lugar de `trace_add` y comprueba que el resumen no se actualiza al pulsar la maestra. Después cámbialo a `trace_add` y verifica que sí.
> 6. Haz una casilla que habilite y deshabilite a otras dos que dependen de ella, y que además las desmarque al apagarlas, para que no queden marcadas e inaccesibles.
