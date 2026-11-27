---
titulo: "La lista: Listbox"
resumen: "Ver varias opciones a la vez y elegir una o muchas: los cuatro modos de selección, los índices que devuelve en vez de valores, y el descuido que hace que dos listas se desmarquen entre sí."
minutos: 23
orden: 20
---

El `Listbox` es la tercera forma de elegir, y la que se usa cuando hace falta **ver varias opciones a la vez**. Un desplegable esconde su lista y un grupo de botones de radio no aguanta más de cinco; una lista muestra ocho o diez opciones en el sitio de tres, se desplaza para el resto, y admite elegir varias.

También es el tercer widget del módulo sin versión temática:

```consola
>>> hasattr(ttk, "Listbox")
False
```

Así que es `tk.Listbox` sin discusión, con las consecuencias de siempre: su aspecto no lo pone el tema y hay que cuidar que no cante al lado de los widgets temáticos. A cambio, tiene una cosa que ningún widget de `ttk` da: **cada fila se puede pintar por separado**, y eso lo convierte en la opción práctica para listas donde el color significa algo.

Si dudas entre este widget, el desplegable y los botones de radio, la tabla comparativa está en la lección 18.

> [!objetivo] Qué vas a aprender
>
> Crear listas, rellenarlas y leer lo seleccionado sabiendo que lo que devuelve son índices y no valores; elegir entre los cuatro modos de selección; pintar filas sueltas para dar información con el color; reordenar elementos; y conocer el descuido de `exportselection` que hace que dos listas de la misma ventana se peleen.

## Rellenar y leer

Los elementos se meten con `insert`, y como acepta varios de golpe, una lista entera cabe en una línea:

```consola
>>> CIUDADES = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao", "Zaragoza"]
>>> lista = tk.Listbox(ventana, height=6)
>>> lista.insert("end", *CIUDADES)
>>> lista.size()
6
```

Ese `height=6` va en filas, y como en el `Text`, conviene ponerlo siempre: el valor por defecto es diez y una lista sin `height` se lleva por delante el diseño.

Para leer, `get` acepta una posición o un tramo, y el tramo **incluye el final**, al contrario que el rebanado de Python:

```consola
>>> lista.get(0)
'Madrid'
>>> lista.get(0, 2)
('Madrid', 'Barcelona', 'Valencia')
>>> lista.get(0, "end")
('Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza')
```

`get(0, 2)` devuelve tres elementos, no dos. Es uno de esos detalles que solo se notan cuando el último elemento aparece repetido o falta, y como el widget es de los años noventa, no va a cambiar.

Borrar sigue la misma lógica, con el tramo inclusivo y el `"end"` de siempre:

```consola
>>> lista.delete(0)              # una fila
>>> lista.delete(0, 1)           # dos filas
>>> lista.delete(0, "end")       # todas
>>> lista.size()
0
```

> [!aviso] Un `Listbox` deshabilitado también te ignora
>
> Como el `Entry` y el `Text`:
>
> ```consola
> >>> lista.configure(state="disabled")
> >>> lista.insert("end", "no entra")
> >>> lista.get(0, "end")
> ()
> ```
>
> Sin error. Es el mismo patrón y la misma solución: abrir, escribir y cerrar. A estas alturas del bloque conviene tomarlo como una regla general de Tk y no como una rareza de cada widget: **el estado bloquea el widget, no solo a quien lo usa.**

## Lo que devuelve no son los valores

Esta es la particularidad que hay que interiorizar. Para saber qué está seleccionado se llama a `curselection()`, y lo que devuelve es una tupla de **posiciones**:

```consola
>>> lista.selection_set(1, 2)
>>> lista.curselection()
(1, 2)
```

Números, no ciudades. Para tener los valores hay que dar el paso extra:

```consola
>>> [lista.get(i) for i in lista.curselection()]
['Barcelona', 'Valencia']
```

Ese salto de índices a valores es el que da forma a casi todo el código que usa este widget, y tiene dos consecuencias.

La primera es que **hay que comprobar siempre que hay algo seleccionado**, porque con nada seleccionado la tupla está vacía y el `[0]` de la costumbre falla:

```python
seleccion = lista.curselection()
if not seleccion:
        return
elegida = lista.get(seleccion[0])
```

La segunda es más de fondo. Si los elementos de la lista son objetos de tu programa (contactos, ficheros, tareas) y no cadenas, lo que la lista guarda son las cadenas con las que se dibujan, no los objetos. El patrón que resuelve eso es mantener **una lista paralela de Python** en el mismo orden y usar el índice para ir de una a otra:

```python
contactos = cargar_contactos()
for contacto in contactos:
        lista.insert("end", f"{contacto.nombre} · {contacto.telefono}")
...
elegido = contactos[lista.curselection()[0]]
```

Funciona bien, con la condición de que las dos listas se modifiquen siempre juntas. En cuanto se borra de una y no de la otra, los índices dejan de corresponder y el programa empieza a enseñar el contacto de al lado. Cuando esa disciplina se vuelve pesada, la señal es que lo que quieres es un `Treeview`, que sí puede llevar un identificador propio por fila y tiene su lección más adelante.

## Los cuatro modos de selección

`selectmode` decide cuántos elementos se pueden elegir y cómo:

| Modo | Qué permite |
| --- | --- |
| `browse` | Uno solo, y se puede arrastrar el ratón para ir cambiando. Es el valor por defecto |
| `single` | Uno solo, sin arrastrar |
| `multiple` | Varios, cada clic marca o desmarca uno |
| `extended` | Varios, con <kbd>Mayús</kbd> para un tramo y <kbd>Cmd</kbd> o <kbd>Ctrl</kbd> para sueltos |

```consola
>>> tk.Listbox(ventana).cget("selectmode")
'browse'
```

El criterio es corto. Para elegir uno, `browse`, que es lo que ya viene puesto. Para elegir varios, **`extended` casi siempre**, porque es el comportamiento que quien usa un ordenador ya conoce de su explorador de ficheros. `multiple` solo si los elementos se marcan de uno en uno como si fueran casillas, y `single` casi nunca.

> [!aviso] El modo solo limita el ratón, no tu código
>
> Parece que `selectmode="browse"` garantice que nunca haya más de uno seleccionado. No lo garantiza. Desde el código puedes seleccionar tantos como quieras en cualquiera de los cuatro modos:
>
> ```salida
> browse     tras dos selection_set -> (0, 2)
> single     tras dos selection_set -> (0, 2)
> multiple   tras dos selection_set -> (0, 2)
> extended   tras dos selection_set -> (0, 2)
> ```
>
> Los cuatro modos han aceptado dos selecciones. Así que si tu programa selecciona filas por su cuenta y quiere mantener una sola, tiene que llamar a `selection_clear(0, "end")` antes de cada `selection_set`. El widget no lo hace por ti.

## La trampa de las dos listas

Esta merece apartado propio porque el síntoma es incomprensible si no conoces la causa. Dos listas en la misma ventana, seleccionas en una y **se pierde la selección de la otra**:

```salida
con exportselection por defecto -> a: ()     b: (1,)
con exportselection=False       -> a: (0,)   b: (1,)
```

En la primera línea, la lista `a` tenía su fila cero seleccionada y se ha quedado sin nada solo porque después se seleccionó algo en `b`.

La causa es `exportselection`, que está a `1` por defecto: la selección del widget **se publica como la selección del sistema**, la misma que usa el portapapeles. Y como el sistema solo puede tener una selección a la vez, cada widget que selecciona algo se la quita al anterior.

En un widget suelto eso está bien, porque permite copiar lo seleccionado con el atajo de siempre. En cuanto hay dos listas que deben mostrar su selección al mismo tiempo, es un error. La solución es una opción:

```python
tk.Listbox(contenedor, exportselection=False)
```

Ponlo en las dos, y las dos mantienen su selección. Es imprescindible en el patrón de las dos listas con botones de pasar elementos de una a otra, que es justo el ejemplo del final de la lección. Lo mismo vale, con el mismo remedio, para dos `Entry` o dos `Text`.

## Pintar las filas

Aquí está lo que el `Listbox` tiene y los widgets temáticos no. `itemconfigure` da color a una fila concreta:

```consola
>>> lista.itemconfigure(1, background="#FFE58F", foreground="#B02A37")
>>> lista.itemcget(1, "background")
'#FFE58F'
```

Las opciones por fila son solo seis, y con eso sobra:

```consola
>>> sorted(lista.itemconfigure(0).keys())
['background', 'bg', 'fg', 'foreground', 'selectbackground', 'selectforeground']
```

Con eso se hacen las cosas que de verdad ayudan a leer una lista: marcar en rojo las entradas con error, en gris las inactivas, o alternar el fondo de las filas pares para seguir la línea con la vista.

```python
for i in range(lista.size()):
        if i % 2:
                lista.itemconfigure(i, background="#F5F5F7")
```

Con la advertencia de que el color se aplica a la **posición**, no al elemento: si insertas o borras una fila por encima, los colores se quedan donde estaban y hay que volver a aplicarlos. Conviene tener una función que repinte la lista entera y llamarla después de cada cambio.

## Moverse y reordenar

Tres métodos que resuelven lo que falta:

| Método | Para qué |
| --- | --- |
| `see(i)` | Desplaza la vista para que esa fila se vea |
| `activate(i)` | Marca esa fila como la activa, la del recuadro punteado |
| `index("end")`, `size()` | Cuántos elementos hay |
| `selection_includes(i)` | Si esa fila está seleccionada |
| `selection_clear(a, b)` | Quita la selección de un tramo |

`see` es el que se olvida, igual que en el `Text`: si seleccionas por código una fila que está fuera de la vista, no se ve nada hasta que alguien se desplaza a mano.

Y reordenar, que es una de las razones para usar este widget, no tiene método propio: se hace borrando e insertando en otro sitio. El patrón completo, con la selección siguiendo al elemento:

```python
def subir(lista):
        """Sube una posición el elemento seleccionado."""
    seleccion = lista.curselection()
    if not seleccion or seleccion[0] == 0:
                return
    i = seleccion[0]
    valor = lista.get(i)
    lista.delete(i)
    lista.insert(i - 1, valor)
    lista.selection_set(i - 1)
    lista.activate(i - 1)
```

Probado sobre cuatro elementos con el tercero seleccionado:

```salida
antes:      ('uno', 'dos', 'tres', 'cuatro')   sel: (2,)
tras subir: ('uno', 'tres', 'dos', 'cuatro')   sel: (1,)
```

Las dos últimas líneas son las que distinguen un botón de subir que funciona de uno que parece roto: sin ellas, el elemento se mueve pero la selección se queda en la posición antigua, y el segundo clic sube otro elemento distinto. Y acuérdate de mover también el elemento en la lista paralela de Python, si la tienes.

## `listvariable` y por qué usarla poco

Un `Listbox` puede atarse a una variable de control, y entonces el contenido se cambia de golpe:

```consola
>>> contenido = tk.StringVar()
>>> lista = tk.Listbox(ventana, listvariable=contenido)
>>> contenido.set(["x", "y z", "w"])
>>> lista.get(0, "end")
('x', 'y z', 'w')
```

Para **escribir** está muy bien: reemplazar la lista entera es una línea, sin `delete` ni bucle, y los elementos con espacios se manejan solos. Para **leer**, en cambio, es una trampa:

```consola
>>> contenido.get()
"('x', 'y z', 'w')"
```

Eso es un `str`, la representación de la tupla, no la tupla. Para recuperar los elementos tendrías que analizar esa cadena, que es exactamente lo que no quieres hacer. Así que el criterio es: **`listvariable` para poner el contenido, `get(0, "end")` para leerlo.** Mezclarlos no compensa.

## Reaccionar a la selección

El evento es `<<ListboxSelect>>` y se ata con `bind`:

```python
lista.bind("<<ListboxSelect>>", lambda evento: mostrar_detalle())
```

Con la misma limitación que el desplegable, medida igual:

```consola
>>> lista.selection_set(1)
>>> registro
[]
```

Lo dispara la persona, no el código. Ya es la tercera vez que aparece el mismo reparto en el bloque, así que conviene enunciarlo como regla: **en Tk, los eventos son de la interacción y las variables son de los datos.** Cuando quieras que algo pase pase lo que pase, vigila el dato.

El otro `bind` que este widget pide casi siempre es el del doble clic, porque en una lista el doble clic significa "esta y adelante":

```python
lista.bind("<Double-Button-1>", lambda evento: aceptar())
```

Los dos son del bloque D, pero un `Listbox` sin doble clic se siente incompleto, así que quedan anotados.

## Dos listas para pasar elementos

El patrón clásico: lo disponible a la izquierda, lo elegido a la derecha, botones en medio y la posibilidad de reordenar lo elegido.

```python title="listas.py"
"""Listbox: dos listas con traspaso, reordenación y filas de color."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

DISPONIBLES = ["Backend", "iOS", "Android", "Diseño", "DevOps", "QA",
               "Datos", "Soporte", "Ventas", "Marketing"]

# Las áreas que requieren aprobación se marcan en la lista.
ESPECIALES = {"DevOps", "Datos"}

MAXIMO = 4


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_lista(contenedor, titulo, modo):
        """Una lista con su título y su barra de desplazamiento."""
    caja = ttk.LabelFrame(contenedor, text=titulo, padding=AIRE)

    # exportselection=False: sin esto, seleccionar aquí borra la selección
    # de la otra lista y los botones de traspaso dejan de funcionar.
    lista = tk.Listbox(caja, height=10, selectmode=modo, exportselection=False,
                       relief="flat", highlightthickness=1,
                       highlightbackground="#D1D1D6", activestyle="none")
    barra = ttk.Scrollbar(caja, orient="vertical", command=lista.yview)
    lista.configure(yscrollcommand=barra.set)

    lista.pack(side="left", fill="both", expand=True)
    barra.pack(side="right", fill="y")
    return caja, lista


def pintar(lista, elementos):
        """Repinta la lista entera. Los colores van por posición, no por elemento."""
    lista.delete(0, "end")
    for i, elemento in enumerate(elementos):
                lista.insert("end", elemento)
        if elemento in ESPECIALES:
                        lista.itemconfigure(i, foreground="#B02A37")
        elif i % 2:
                        lista.itemconfigure(i, background="#F5F5F7")


def seleccionados(lista):
        """Los valores, no los índices, comprobando que haya selección."""
    return [lista.get(i) for i in lista.curselection()]


def anadir():
        elegidos = seleccionados(lista_libres)
    if not elegidos:
                aviso.set("Elige algo en la lista de la izquierda")
        return
    hueco = MAXIMO - len(elegidas)
    if hueco <= 0:
                aviso.set(f"Como máximo {MAXIMO} áreas")
        return
    for area in elegidos[:hueco]:
                libres.remove(area)
        elegidas.append(area)
    if len(elegidos) > hueco:
                aviso.set(f"Solo caben {hueco} más, el resto se ha quedado fuera")
    else:
                aviso.set("")
    refrescar()


def quitar():
        elegidos = seleccionados(lista_elegidas)
    if not elegidos:
                aviso.set("Elige algo en la lista de la derecha")
        return
    for area in elegidos:
                elegidas.remove(area)
        libres.append(area)
    libres.sort(key=DISPONIBLES.index)
    aviso.set("")
    refrescar()


def mover(paso):
        """Sube o baja el elemento elegido, arrastrando la selección con él."""
    seleccion = lista_elegidas.curselection()
    if not seleccion:
                aviso.set("Elige algo en la lista de la derecha")
        return
    i = seleccion[0]
    destino = i + paso
    if not 0 <= destino < len(elegidas):
                return
    elegidas[i], elegidas[destino] = elegidas[destino], elegidas[i]
    refrescar()
    lista_elegidas.selection_set(destino)
    lista_elegidas.activate(destino)
    lista_elegidas.see(destino)


def refrescar():
        """Redibuja las dos listas y el resumen desde las listas de Python."""
    pintar(lista_libres, libres)
    pintar(lista_elegidas, elegidas)
    resumen.set(f"{len(elegidas)} de {MAXIMO} elegidas"
                + (f": {', '.join(elegidas)}" if elegidas else ""))


def crear_botones(contenedor):
        """La columna de botones de en medio."""
    columna = ttk.Frame(contenedor)
    ttk.Button(columna, text="Añadir  ▸", width=11, command=anadir).pack(
        pady=(0, AIRE))
    ttk.Button(columna, text="◂  Quitar", width=11, command=quitar).pack(
        pady=(0, MARGEN))
    ttk.Button(columna, text="Subir", width=11,
               command=lambda: mover(-1)).pack(pady=(0, AIRE))
    ttk.Button(columna, text="Bajar", width=11,
               command=lambda: mover(1)).pack()
    return columna


ventana = tk.Tk()
ventana.title("Áreas del puesto")
ventana.minsize(620, 380)

# Las dos listas de Python son la fuente de verdad; los widgets solo las muestran.
libres = list(DISPONIBLES)
elegidas = []
resumen = tk.StringVar()
aviso = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

fila = ttk.Frame(cuerpo)
fila.pack(fill="both", expand=True)

caja_libres, lista_libres = crear_lista(fila, "Disponibles", "extended")
caja_libres.pack(side="left", fill="both", expand=True)

crear_botones(fila).pack(side="left", fill="y", padx=MARGEN)

caja_elegidas, lista_elegidas = crear_lista(fila, "Elegidas", "browse")
caja_elegidas.pack(side="left", fill="both", expand=True)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=resumen, wraplength=560, justify="left").pack(
    anchor="w")
ttk.Label(cuerpo, textvariable=aviso, foreground="#B02A37").pack(
    anchor="w", pady=(AIRE, 0))

lista_libres.bind("<Double-Button-1>", lambda evento: anadir())
lista_elegidas.bind("<Double-Button-1>", lambda evento: quitar())

refrescar()

centrar(ventana)
ventana.mainloop()
```

La decisión que hace que ese programa sea manejable está en dos líneas del final: `libres` y `elegidas` son listas de Python y son **la fuente de verdad**. Los widgets no guardan el estado, solo lo muestran, y `refrescar()` los redibuja enteros desde las listas. Así no hay que sincronizar índices ni acordarse de qué fila corresponde a qué, que es de donde vienen casi todos los fallos de este widget. Cuesta un redibujado completo en cada cambio, y con listas de este tamaño eso no se nota.

Lo otro que hay que mirar es el `exportselection=False` de `crear_lista`. Quítalo, ejecuta, selecciona algo en la izquierda y luego algo en la derecha: verás que la primera se queda sin selección y que el botón de añadir empieza a decir que no has elegido nada.

> [!consejo] Una lista sin doble clic y sin teclado está a medias
>
> Un `Listbox` en el que solo se puede seleccionar con el ratón y pulsar botones funciona, pero se siente tosco. Las tres cosas que lo arreglan, todas del bloque D, valen la pena en cuanto la lista es importante en tu programa:
>
> - **Doble clic** con `<Double-Button-1>` para la acción principal, que es lo que la gente prueba primero.
> - **<kbd>Intro</kbd>** para lo mismo desde el teclado, y <kbd>Supr</kbd> para quitar.
> - **Escribir para buscar**, saltando a la primera entrada que empiece por esas letras, que en una lista de cincuenta elementos cambia por completo la sensación.

> [!resumen] En resumen
>
> El `Listbox` es la forma de elegir cuando hay que ver varias opciones a la vez, y el tercer widget del bloque sin versión temática, lo que le da la ventaja de poder pintar cada fila por separado con `itemconfigure`, algo que ningún widget de `ttk` permite. Se rellena con `insert`, que acepta varios elementos de golpe, y se lee con `get`, cuyo tramo incluye el final al contrario que el rebanado de Python; `height` va en filas y conviene ponerlo siempre. Lo fundamental es que `curselection()` devuelve posiciones y no valores, de modo que hay que dar el paso extra de traducir y comprobar antes que la tupla no esté vacía; y si los elementos son objetos de tu programa, el patrón es una lista paralela de Python con el índice como puente, que hay que mantener sincronizada. De los cuatro modos de selección, `browse` es el de fábrica para elegir uno y `extended` el que quieres para elegir varios, teniendo en cuenta que el modo solo limita el ratón y que desde el código se puede seleccionar de más en cualquiera de ellos. El descuido que más cuesta encontrar es `exportselection`, que está activado por defecto y hace que la selección de una lista borre la de la otra, y que hay que poner a `False` siempre que dos listas deban mostrar su selección a la vez. Reordenar no tiene método propio y se hace borrando e insertando, acordándose de mover también la selección con `selection_set` y `activate`, o el botón de subir parecerá roto. `listvariable` sirve para poner el contenido de golpe pero no para leerlo, porque lo que devuelve es la representación en texto de la tupla. Y su evento `<<ListboxSelect>>`, como los de la casilla y el desplegable, solo lo dispara la interacción y no el código.

> [!ejercicio] Practica
>
> Trabaja en un fichero `20-listas.py` salvo donde se indique otra cosa:
>
> 1. Crea una lista con diez elementos y un botón que muestre en una etiqueta lo seleccionado. Pulsa el botón sin haber seleccionado nada y arregla lo que pase.
> 2. Pon dos listas en la misma ventana sin `exportselection=False`, selecciona en una y luego en la otra, y anota el síntoma. Después añade la opción a las dos y comprueba la diferencia.
> 3. Prueba los cuatro modos de selección con el ratón y describe con tus palabras la diferencia entre `browse` y `single`, y entre `multiple` y `extended`.
> 4. Escribe en `20-colores.py` una lista de veinte números donde los pares salgan con fondo gris y los múltiplos de cinco en rojo. Añade un botón que inserte un elemento al principio y comprueba qué les pasa a los colores.
> 5. Monta una lista con botones de subir y bajar. Pruébalos primero sin volver a seleccionar el elemento movido y anota por qué el segundo clic hace algo raro.
> 6. Haz una lista de diccionarios con nombre y teléfono, muéstrala como cadenas formateadas y, al seleccionar una fila, enseña el teléfono en una etiqueta usando la lista paralela. Después borra un elemento solo del widget y comprueba cómo se descuadra todo.
