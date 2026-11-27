---
titulo: "El desplegable: Combobox"
resumen: "Un campo de texto con una lista colgando: la decisión entre dejar escribir o no, el índice que vale menos de lo que parece, y las listas que dependen de otra lista."
minutos: 21
orden: 19
---

Un `Combobox` es literalmente lo que dice su nombre: la combinación de un campo de texto y una lista. Y no es una metáfora, es la implementación:

```consola
>>> issubclass(ttk.Combobox, ttk.Entry)
True
```

Hereda del `Entry` de la lección 15, así que todo lo que sabes de ahí sigue valiendo: `get`, `textvariable`, `justify`, los estados, e incluso la validación con sus trampas. Lo que añade es la lista desplegable y tres cosas para manejarla.

Esta lección tiene además una decisión de diseño en el centro, que es si el desplegable deja escribir o no. Se resuelve con una sola opción y cambia por completo el widget con el que estás trabajando.

> [!objetivo] Qué vas a aprender
>
> Crear desplegables con su lista de valores y leer lo elegido; decidir entre un desplegable cerrado y uno editable, y saber lo que implica cada uno; usar `current` conociendo el valor que devuelve cuando no hay coincidencia; encadenar dos desplegables donde el segundo depende del primero sin dejar valores huérfanos; y saber por qué `trace_add` es más fiable que el evento de selección.

## Solo existe en ttk

Al contrario que el `Text` de la lección 16, aquí no hay versión clásica:

```consola
>>> hasattr(tk, "Combobox")
False
```

El desplegable llegó con `ttk` en 2007, así que no hay nada que decidir ni justificar: es `ttk.Combobox` y punto. Es el caso simétrico del `Text`, y entre los dos resumen la historia de las dos familias.

## Crear y leer

La lista se pasa en `values` y el resultado se lee con `get`, igual que un campo de texto:

```python
AREAS = ["Backend", "iOS", "Diseño", "DevOps", "QA", "Datos"]

area = ttk.Combobox(formulario, values=AREAS, state="readonly", width=24)
area.current(0)
```

Ojo con un detalle: **un desplegable recién creado está vacío**, aunque tenga valores. No se preselecciona nada:

```consola
>>> area = ttk.Combobox(ventana, values=AREAS, state="readonly")
>>> area.get()
''
>>> area.current()
-1
```

Así que después de crearlo hay que elegir: o `current(0)` para que arranque con el primero, o dejarlo vacío a propósito porque la elección es obligatoria. Es la misma decisión que el valor inicial de los botones de radio, y conviene tomarla igual de conscientemente.

Los dos métodos que añade sobre el `Entry` son estos, y no hay más:

```consola
>>> area.current(0)
>>> area.get()
'Backend'
>>> area.set("Datos")
>>> area.current()
5
```

`set(texto)` pone un valor y `current(índice)` pone el que está en esa posición. Sin argumento, `current()` devuelve la posición del valor actual dentro de la lista.

Y `values` se guarda como una tupla, se lea como se escriba:

```consola
>>> ttk.Combobox(ventana, values=["a", "b"]).cget("values")
('a', 'b')
```

Eso viene bien, porque permite tratarla como una secuencia normal de Python para buscar en ella o contar cuántas opciones hay.

> [!aviso] `current()` devuelve `-1` más veces de lo que crees
>
> `current()` no responde a "qué está elegido", responde a "en qué posición de la lista está lo que hay escrito". Si lo que hay no está en la lista, devuelve `-1`:
>
> ```consola
> >>> area.set("Inventado")
> >>> area.get()
> 'Inventado'
> >>> area.current()
> -1
> ```
>
> Y fíjate en que `set()` ha aceptado un valor que no está en la lista **aunque el desplegable sea `readonly`**. Ese estado impide escribir a quien usa el programa, no a tu código.
>
> De ahí dos consecuencias prácticas. La primera es que `current()` no sirve para saber si hay algo elegido, porque `-1` significa tanto "no hay nada" como "hay algo que no está en la lista". Para eso, mira el contenido:
>
> ```python
> if not area.get():
>         ...
> ```
>
> La segunda es que si necesitas la posición para indexar otra estructura paralela, hay que protegerse del `-1`, porque en Python `lista[-1]` no falla: te devuelve el último elemento, y ese es un error que no da ninguna señal.

## Cerrado o editable

Aquí está la decisión de la lección. `state` tiene el mismo juego que el `Entry`, y los dos primeros valores producen widgets que se usan de forma distinta:

```python
ttk.Combobox(formulario, values=AREAS, state="readonly")   # cerrado
ttk.Combobox(formulario, values=AREAS)                     # editable
ttk.Combobox(formulario, values=AREAS, state="disabled")   # apagado
```

Un desplegable **cerrado** solo admite valores de la lista. Es lo que quieres casi siempre, y por eso `state="readonly"` se escribe tanto que conviene tomarlo como la opción por omisión mental: si el dato va a una base de datos con valores fijos, a un campo con opciones cerradas o a cualquier sitio donde "Diseño" y "diseño" sean cosas distintas, cerrado.

Un desplegable **editable** deja escribir cualquier cosa, y la lista pasa a ser una ayuda en vez de una restricción. Tiene dos usos legítimos y solo dos: cuando de verdad se admite cualquier valor y la lista son solo sugerencias o valores frecuentes, y cuando la lista es tan larga que escribir es más rápido que buscar.

> [!aviso] El editable no filtra ni completa nada por su cuenta
>
> Esta es la expectativa que falla. Un `Combobox` editable **no** es un autocompletado: al escribir "Dis" no se filtra la lista ni aparece "Diseño" sugerido. El campo y la lista son independientes, y la lista siempre muestra todos los valores.
>
> El autocompletado hay que programarlo, atando las pulsaciones y reemplazando `values` con lo que coincida. Se puede hacer en unas veinte líneas con lo que sabrás al terminar el bloque D, pero no viene de serie, y es habitual descubrirlo después de habérselo prometido a alguien.
>
> El otro efecto del editable es que **te obliga a validar**. Si se puede escribir, alguien escribirá "Backand" con una errata, y ese valor llegará a tu programa tal cual. Como hereda del `Entry`, tienes la validación de la lección 15 disponible, con la advertencia de que la comprobación de "está en la lista" es de las que hay que hacer al aceptar y no al escribir.

## Reaccionar a la elección

El desplegable trae su propio evento, `<<ComboboxSelected>>`, que se ata con `bind`:

```python
area.bind("<<ComboboxSelected>>", lambda evento: actualizar())
```

Funciona, y lo verás en mucho código. Pero tiene una limitación que conviene medir antes de fiarse de él. Con un desplegable que tenga las dos cosas atadas, un `bind` del evento y un `trace_add` sobre su variable:

```salida
tras set('b')     -> [('trace', 'b')]
tras current(2)   -> [('trace', 'b'), ('trace', 'c')]
```

**El evento no aparece ni una vez.** `<<ComboboxSelected>>` solo se dispara cuando alguien elige con el ratón o el teclado en la lista desplegada; los cambios que hace tu programa con `set()` o `current()` no lo disparan.

Es el mismo reparto que en la casilla y en los botones de radio, con los mismos nombres cambiados: el evento responde a la interacción, `trace_add` responde al dato. Y como lo que suele interesar es el dato, **`textvariable` más `trace_add` es la opción fiable**:

```python
area = tk.StringVar(value="Backend")
ttk.Combobox(formulario, values=AREAS, textvariable=area, state="readonly")
area.trace_add("write", lambda *_: actualizar())
```

El caso en el que sí quieres el evento es cuando la acción debe ocurrir **solo** si la eligió una persona: recargar algo de la red, por ejemplo, donde no te interesa dispararlo cada vez que el programa ajusta el valor por su cuenta.

## Listas que dependen de otra lista

El caso clásico: país y ciudad, categoría y subcategoría, año y mes. El segundo desplegable cambia de contenido según el primero.

La parte fácil es cambiar la lista, porque `values` se puede reconfigurar en marcha. La parte que se olvida es lo que pasa con el valor que había:

```consola
>>> ciudad = ttk.Combobox(ventana, values=["Madrid", "Barcelona"], state="readonly")
>>> ciudad.current(1)
>>> ciudad.get(), ciudad.current()
('Barcelona', 1)
>>> ciudad.configure(values=["Lisboa", "Oporto"])
>>> ciudad.get(), ciudad.current()
('Barcelona', -1)
```

Cambiar la lista **no cambia el contenido del campo**. El desplegable sigue mostrando "Barcelona" mientras su lista ofrece Lisboa y Oporto, y `current()` avisa con un `-1` que nadie está mirando. Si alguien acepta el formulario en ese momento, se guarda una ciudad portuguesa llamada Barcelona.

El arreglo es una línea, y es la que hay que acordarse de escribir:

```python
def refrescar_ciudades(*_):
        """Ajusta la lista del segundo desplegable y su valor si quedó huérfano."""
    ciudades = PAISES[pais.get()]
    combo_ciudad.configure(values=ciudades)
    if ciudad.get() not in ciudades:
                combo_ciudad.current(0)
```

Con eso, la cadena se porta:

```salida
inicial                     -> 'España'   'Madrid'
tras cambiar a Francia      -> 'París'
tras cambiar a Portugal     -> 'Lisboa'
```

La comprobación `if ciudad.get() not in ciudades` es mejor que poner `current(0)` a secas, porque si el valor sigue siendo válido en la lista nueva conviene respetarlo en vez de reiniciarlo.

## Las demás opciones

```consola
>>> sorted(ttk.Combobox(ventana).configure().keys())
['background', 'class', 'cursor', 'exportselection', 'font', 'foreground',
 'height', 'invalidcommand', 'justify', 'placeholder', 'placeholderforeground',
 'postcommand', 'show', 'state', 'style', 'takefocus', 'textvariable',
 'validate', 'validatecommand', 'values', 'width', 'xscrollcommand']
```

Casi todas son del `Entry` del que hereda. Las propias del desplegable son cuatro:

| Opción | Qué hace |
| --- | --- |
| `values` | La lista de opciones |
| `height` | Cuántas filas se ven en el desplegable antes de tener que desplazarse |
| `postcommand` | Una función que se llama justo antes de abrir la lista |
| `state` | Con el valor extra `readonly`, que es el que decide todo |

`height` está en diez por defecto, y se nota con listas largas:

```consola
>>> ttk.Combobox(ventana).cget("height")
10
```

Con cincuenta valores y `height=10`, el desplegable muestra diez y se desplaza. Subirlo mucho da un desplegable que tapa la ventana; el valor de fábrica está bien elegido y rara vez hay que tocarlo.

`postcommand` es el más interesante de los cuatro y el menos usado. Sirve para **rellenar la lista en el último momento**, justo cuando alguien va a abrirla:

```python
ttk.Combobox(barra, textvariable=fichero,
             postcommand=lambda: actualizar_lista_de_ficheros())
```

Eso resuelve el problema de una lista que caduca: los ficheros de una carpeta, las impresoras conectadas, las sesiones abiertas. En vez de refrescarla cada pocos segundos o dejarla desactualizada, se refresca en el único momento en que importa. Con la advertencia de que esa función tiene que ser rápida, porque se ejecuta mientras alguien espera a que se abra el desplegable, y aquí vale lo dicho del `command` del botón.

Y como detalle de ancho: `width` va en caracteres, como siempre, y conviene ponerlo a la medida de la opción más larga de la lista. Si no, el desplegable se ajusta al contenido inicial y cambia de tamaño al elegir un valor más largo, con el temblor de la interfaz que viste en la lección 13.

## Un formulario con desplegables encadenados

```python title="desplegables.py"
"""Combobox: cerrado, editable, encadenado y con postcommand."""

import tkinter as tk
from tkinter import ttk
from datetime import datetime

MARGEN = 12
AIRE = 4

DESTINOS = {
    "España": ("Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"),
    "Portugal": ("Lisboa", "Oporto", "Faro"),
    "Francia": ("París", "Lyon", "Marsella", "Niza"),
    "Italia": ("Roma", "Milán", "Florencia", "Nápoles", "Venecia"),
}

MOTIVOS = ("Reunión con cliente", "Formación", "Congreso", "Auditoría")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_formulario(contenedor):
        """Los tres desplegables: dos cerrados encadenados y uno editable."""
    global combo_ciudad
    caja = ttk.LabelFrame(contenedor, text="Viaje", padding=MARGEN)
    caja.pack(fill="x")

    ttk.Label(caja, text="País:", anchor="e", width=9).grid(
        row=0, column=0, sticky="e", pady=AIRE)
    ttk.Combobox(caja, values=list(DESTINOS), textvariable=pais,
                 state="readonly", width=24).grid(
        row=0, column=1, sticky="ew", pady=AIRE)

    ttk.Label(caja, text="Ciudad:", anchor="e", width=9).grid(
        row=1, column=0, sticky="e", pady=AIRE)
    combo_ciudad = ttk.Combobox(caja, textvariable=ciudad,
                                state="readonly", width=24)
    combo_ciudad.grid(row=1, column=1, sticky="ew", pady=AIRE)

    # Editable a propósito: el motivo admite cualquier texto y la lista
    # son solo los cuatro más frecuentes.
    ttk.Label(caja, text="Motivo:", anchor="e", width=9).grid(
        row=2, column=0, sticky="e", pady=AIRE)
    ttk.Combobox(caja, values=MOTIVOS, textvariable=motivo, width=24).grid(
        row=2, column=1, sticky="ew", pady=AIRE)

    caja.columnconfigure(1, weight=1)
    return caja


def crear_hora(contenedor):
        """Un desplegable cuya lista se rellena al abrirla, con postcommand."""
    caja = ttk.LabelFrame(contenedor, text="Salida", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    ttk.Label(caja, text="Hora:", anchor="e", width=9).grid(
        row=0, column=0, sticky="e")
    combo = ttk.Combobox(caja, textvariable=hora, state="readonly", width=24,
                         height=6)
    combo.configure(postcommand=lambda: combo.configure(values=proximas_horas()))
    combo.grid(row=0, column=1, sticky="ew")

    caja.columnconfigure(1, weight=1)
    return caja


def proximas_horas():
        """Las seis próximas horas en punto, calculadas al abrir la lista."""
    ahora = datetime.now().hour
    return tuple(f"{(ahora + i) % 24:02d}:00" for i in range(1, 7))


def refrescar_ciudades(*_):
        """La lista del segundo desplegable y su valor, que puede quedar huérfano."""
    ciudades = DESTINOS[pais.get()]
    combo_ciudad.configure(values=ciudades)
    if ciudad.get() not in ciudades:
                combo_ciudad.current(0)


def describir(*_):
        """El resumen. Avisa si el motivo no es uno de los de la lista."""
    partes = [f"{ciudad.get()} ({pais.get()})"]
    if motivo.get().strip():
                partes.append(motivo.get().strip())
    if hora.get():
                partes.append(f"salida a las {hora.get()}")
    resumen.set(" · ".join(partes))

    if motivo.get().strip() and motivo.get() not in MOTIVOS:
                nota.set("Motivo libre: se guardará tal cual está escrito")
    else:
                nota.set("")


ventana = tk.Tk()
ventana.title("Solicitud de viaje")
ventana.minsize(520, 340)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
pais = tk.StringVar(value="España")
ciudad = tk.StringVar()
motivo = tk.StringVar(value=MOTIVOS[0])
hora = tk.StringVar()
resumen = tk.StringVar()
nota = tk.StringVar()
combo_ciudad = None

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_formulario(cuerpo)
crear_hora(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=resumen, wraplength=460, justify="left").pack(
    anchor="w")
ttk.Label(cuerpo, textvariable=nota, foreground="#B02A37").pack(
    anchor="w", pady=(AIRE, 0))

# trace_add y no <<ComboboxSelected>>: así también se entera de refrescar_ciudades.
pais.trace_add("write", refrescar_ciudades)
for variable in (pais, ciudad, motivo, hora):
        variable.trace_add("write", describir)
refrescar_ciudades()
describir()

centrar(ventana)
ventana.mainloop()
```

Tres decisiones ahí. El país y la ciudad son cerrados porque solo valen los destinos previstos; el motivo es editable **a propósito**, y precisamente por eso el programa avisa cuando lo escrito no es una de las opciones conocidas, que es la clase de comprobación que un desplegable editable te obliga a añadir. La hora usa `postcommand` porque su lista depende de la hora actual y estaría mal calculada si se hiciera al arrancar. Y el orden de los dos `trace_add` sobre `pais` importa: primero se refresca la lista de ciudades y luego se describe, porque describir antes usaría la ciudad huérfana.

> [!consejo] Ordena la lista pensando en quien elige
>
> Una lista de opciones no se ordena alfabéticamente por defecto, se ordena por lo que más se va a elegir. Si el noventa por ciento de los viajes son a España, España va primera aunque empiece por E.
>
> Con listas largas, en cambio, el alfabético gana, porque ahí lo que se hace no es elegir sino buscar, y para buscar hace falta un orden previsible. Y si hay tres o cuatro valores muy frecuentes entre cincuenta, la solución es ponerlos arriba y el resto alfabético debajo, que es lo que hacen los selectores de país que empiezan por los cuatro países del negocio.

> [!resumen] En resumen
>
> Un `Combobox` es un campo de texto con una lista colgando, y no en sentido figurado: hereda de `ttk.Entry`, así que todo lo de la lección 15 sigue valiendo, incluida la validación. Solo existe en la familia temática, que es el caso simétrico del `Text`. La lista se pasa en `values`, que se guarda como tupla, y un desplegable recién creado está vacío aunque tenga valores, de modo que hay que decidir si arranca con `current(0)` o en blanco a propósito. Sus dos métodos propios son `set` y `current`, y hay que saber que `current()` devuelve `-1` cuando lo que hay escrito no está en la lista, lo que significa que no sirve para preguntar si hay algo elegido y que es peligroso usarlo como índice, porque en Python el `-1` no falla sino que devuelve el último elemento. La decisión importante es `state`: cerrado con `readonly` para que solo valgan los valores de la lista, que es lo correcto casi siempre, o editable cuando de verdad se admite cualquier texto, teniendo claro que un editable no filtra ni autocompleta nada por su cuenta y que obliga a validar lo escrito. Para reaccionar existe el evento `<<ComboboxSelected>>`, pero solo se dispara si la elección la hace una persona, no cuando el programa llama a `set` o `current`, así que lo fiable es `textvariable` con `trace_add`. Al encadenar dos desplegables hay que recordar que cambiar `values` no cambia el contenido del campo, de manera que el segundo puede quedarse mostrando un valor que ya no está en su lista; se arregla comprobando si el valor sigue siendo válido y reiniciándolo si no. Y de sus cuatro opciones propias, `height` limita las filas visibles del desplegable y `postcommand` permite rellenar la lista justo antes de abrirla, que es la forma de tener listas que caducan siempre al día.

> [!ejercicio] Practica
>
> Trabaja en un fichero `19-desplegables.py` salvo donde se indique otra cosa:
>
> 1. Crea un desplegable cerrado con seis opciones y una etiqueta que muestre lo elegido y su posición con `current()`. Comprueba qué muestra antes de elegir nada.
> 2. Usa `set()` con un valor que no esté en la lista sobre un desplegable `readonly`. Comprueba que lo acepta, que `current()` devuelve `-1`, y escribe la comprobación que evitaría guardar ese valor.
> 3. Pon el mismo desplegable en cerrado y en editable, uno al lado del otro. Escribe en el editable las tres primeras letras de una opción y anota si la lista se filtra.
> 4. Escribe en `19-encadenados.py` dos desplegables de país y ciudad. Pruébalo primero sin reajustar el valor del segundo, cambia de país y comprueba que se queda una ciudad que no corresponde. Después arréglalo.
> 5. Ata a un desplegable un `<<ComboboxSelected>>` y un `trace_add` que escriban en una lista, y cámbialo con `set()` desde un botón. Comprueba cuál de los dos se enteró.
> 6. Haz un desplegable con `postcommand` que muestre los ficheros `.py` de la carpeta actual, y comprueba que si creas un fichero nuevo aparece al abrir la lista sin reiniciar el programa.
