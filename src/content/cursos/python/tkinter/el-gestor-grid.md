---
titulo: "El gestor grid"
resumen: "La rejilla de filas y columnas: sticky, las celdas combinadas y el peso, que es lo que decide quién crece al agrandar la ventana."
minutos: 20
orden: 9
---

Intenta montar un formulario con `pack`. Cinco etiquetas a la izquierda y cinco campos a la derecha, alineados en columna. Se puede, metiendo cada pareja en un marco y colocando los marcos en vertical, pero hay un problema que no tiene arreglo: **los campos no quedan alineados entre sí**, porque cada marco calcula su ancho por su cuenta y la etiqueta "Correo" no mide lo mismo que "Contraseña".

Ese es exactamente el hueco que llena `grid`. Coloca los widgets en una rejilla de filas y columnas, y todas las celdas de una misma columna comparten anchura. Es la diferencia entre un formulario alineado y uno que parece escalonado.

`grid` es el gestor que más se usa en programas reales, y es el que conviene por defecto salvo que lo que estés colocando sea claramente una franja.

> [!objetivo] Qué vas a aprender
>
> Colocar widgets en una rejilla con `row` y `column`, usar `sticky` para decidir a qué bordes se pega cada widget, combinar celdas con `columnspan` y `rowspan`, repartir el espacio sobrante con el peso de filas y columnas, y distinguir `grid_forget` de `grid_remove`.

## Filas y columnas

La forma básica es indicar la posición con dos números:

```python
tk.Label(ventana, text="Nombre").grid(row=0, column=0)
tk.Entry(ventana).grid(row=0, column=1)
tk.Label(ventana, text="Correo").grid(row=1, column=0)
tk.Entry(ventana).grid(row=1, column=1)
```

Cuatro cosas conviene saber de entrada.

**La rejilla no se declara.** No hay que decir en ningún sitio cuántas filas y columnas hay: existen las que uses. Si colocas algo en la fila 7 de una rejilla vacía, se crean las siete anteriores, vacías y de altura cero.

**Las filas y columnas vacías no ocupan.** Eso significa que numerar de diez en diez para dejar sitio no hace nada raro, y es una técnica válida cuando no sabes cuántas filas va a haber.

**Se empieza en cero**, como todo en Python.

**Los dos argumentos tienen valor por defecto cero**, así que `.grid()` a secas coloca en la esquina superior izquierda. En la práctica se escriben siempre los dos, porque un `grid` sin números es imposible de leer.

Las opciones que acepta son diez, y como con `pack`, el error las enumera:

```consola
>>> etiqueta.grid(fila=1)
_tkinter.TclError: bad option "-fila": must be -column, -columnspan, -in, -ipadx,
-ipady, -padx, -pady, -row, -rowspan, or -sticky
```

Y `grid_info()` muestra cómo ha quedado, con los valores por defecto resueltos:

```consola
>>> etiqueta.grid(row=0, column=0)
>>> etiqueta.grid_info()
{'in': <tkinter.Tk object .>, 'column': 0, 'row': 0, 'columnspan': 1,
 'rowspan': 1, 'ipadx': 0, 'ipady': 0, 'padx': 0, 'pady': 0, 'sticky': ''}
```

Fíjate en que `sticky` viene vacío. Eso es lo siguiente, y es lo más importante de la lección.

## `sticky`: a qué bordes se pega

Cada celda de la rejilla es tan ancha como el widget más ancho de su columna y tan alta como el más alto de su fila. Un widget pequeño en una celda grande **se queda centrado y de su tamaño natural**, que casi nunca es lo que quieres.

`sticky` recibe una cadena con los puntos cardinales a los que el widget debe pegarse, y esa cadena hace dos trabajos a la vez: alinear y estirar.

```consola
>>> etiqueta.grid(row=0, column=0, sticky="z")
_tkinter.TclError: bad stickyness value "z": must be a string containing n, e, s, and/or w
```

| Valor | Qué hace |
| --- | --- |
| `""` | Centrado, tamaño natural. El valor por defecto |
| `"w"` | Pegado a la izquierda |
| `"e"` | Pegado a la derecha |
| `"n"` | Pegado arriba |
| `"s"` | Pegado abajo |
| `"ew"` | Pegado a los dos lados, así que **se estira a lo ancho** |
| `"ns"` | Pegado arriba y abajo, así que **se estira a lo alto** |
| `"nsew"` | Pegado a los cuatro, así que llena la celda |

Ahí está la clave: **pegarse a dos bordes opuestos equivale a estirarse**. Un widget no puede tocar el borde izquierdo y el derecho a la vez sin crecer, así que crece. Eso hace que `sticky` sustituya por sí solo a lo que en `pack` eran dos opciones, `fill` y `anchor`.

Los tres valores que se usan el noventa por ciento del tiempo son estos:

- **`sticky="w"` en las etiquetas de un formulario**, para que el texto quede alineado a la izquierda de su columna en vez de centrado.
- **`sticky="ew"` en los campos**, para que ocupen todo el ancho de su columna y queden todos iguales.
- **`sticky="nsew"` en el widget principal**, el que tiene que crecer con la ventana.

> [!nota] Se puede escribir con signos y en cualquier orden
>
> `sticky="nsew"`, `sticky="ewns"` y `sticky=tk.N + tk.S + tk.E + tk.W` son lo mismo. También se admite `"n+s+e+w"` con signos por medio. Verás las tres formas por ahí. La corta en minúsculas es la más legible y es la que usa este curso.

## Celdas combinadas

`columnspan` y `rowspan` hacen que un widget ocupe varias celdas, exactamente igual que combinar celdas en una hoja de cálculo:

```python
tk.Label(ventana, text="Alta de colaborador").grid(
    row=0, column=0, columnspan=3, sticky="w")
```

Ese título se extiende por las tres columnas y queda alineado a la izquierda del conjunto. Es el uso más habitual: títulos de sección y separadores que cruzan el formulario entero.

`rowspan` se usa menos, y casi siempre para lo mismo: un widget alto a un lado, como una lista o una imagen, junto a varias filas de campos.

Se pueden combinar los dos, y hay una regla que evita casi todos los problemas: **planifica la rejilla antes de escribirla**. Dibújala en un papel con sus filas y columnas numeradas. Los líos de `grid` casi siempre vienen de haber ido improvisando posiciones.

## Los rellenos

Funcionan igual que en `pack`, con las mismas dos parejas: `padx` y `pady` separan la celda de sus vecinas, `ipadx` e `ipady` agrandan el widget por dentro. Y también aceptan tuplas para dar valores distintos a cada lado.

Hay un detalle que ahorra escribir mucho: el relleno también se puede poner **en la fila o la columna entera**, con la opción `pad` de `columnconfigure` y `rowconfigure`, que se ve a continuación. Así no hay que repetir `pady=4` en quince llamadas.

## El peso: quién crece

Y aquí está la segunda mitad de `grid`, la que decide qué pasa al redimensionar. Es la parte que más se olvida y la que produce el fallo clásico de la ventana que crece dejando todo arriba a la izquierda.

Por defecto, **todas las filas y columnas tienen peso cero**, que significa "no crezcas nunca". El espacio que sobra al agrandar la ventana se queda sin repartir.

Se cambia con dos métodos del contenedor:

```python
ventana.columnconfigure(1, weight=1)
ventana.rowconfigure(3, weight=1)
```

El peso funciona como una proporción. Si la columna 1 tiene peso 1 y la 2 tiene peso 3, el espacio sobrante se reparte en cuatro partes: una para la primera y tres para la segunda. Con pesos iguales, reparto a partes iguales.

Las opciones que aceptan son cuatro:

| Opción | Qué hace |
| --- | --- |
| `weight` | Proporción del espacio sobrante que le toca. Cero, nada |
| `minsize` | Tamaño mínimo en píxeles, aunque esté vacía |
| `pad` | Relleno añadido a toda la fila o columna |
| `uniform` | Un nombre de grupo: las que lo comparten se mantienen del mismo tamaño |

Se pueden consultar llamando sin valores:

```consola
>>> ventana.columnconfigure(1, weight=1, minsize=120, uniform="campos", pad=4)
>>> ventana.grid_columnconfigure(1)
{'minsize': 120, 'pad': 4, 'uniform': 'campos', 'weight': 1}
>>> ventana.grid_rowconfigure(0)
{'minsize': 0, 'pad': 0, 'uniform': None, 'weight': 0}
```

Esa segunda línea muestra los valores de partida de cualquier fila o columna que no hayas tocado: sin peso, sin mínimo, sin relleno y sin grupo.

`uniform` es el menos conocido y resuelve un problema concreto muy real: **columnas que deben medir lo mismo aunque su contenido no lo sea**. Tres botones de acción en tres columnas del mismo grupo uniforme salen todos del mismo ancho, aunque uno ponga "Sí" y otro "Cancelar y volver".

> [!aviso] El peso se le pone al contenedor, no al widget
>
> Es el error de escritura más repetido con `grid`. `weight` no es una opción de `.grid()`, es una opción de `columnconfigure` y `rowconfigure`, que son métodos **del contenedor**.
>
> Y hay una segunda parte, igual de importante: **el peso solo reparte espacio, no hace que el widget lo ocupe**. Una columna con peso crece, pero el widget que hay dentro se queda centrado y de su tamaño natural si no lleva `sticky`. Las dos cosas van juntas siempre: peso en la columna para que la celda crezca, y `sticky` en el widget para que la llene.

## La trampa de los contenedores anidados

Hay un caso que desconcierta mucho y conviene anticipar. Pones peso a la columna de la ventana, el marco que hay dentro tiene su `sticky="nsew"`, y aun así el contenido del marco no crece.

La razón es que **el peso no se hereda**. Cada contenedor reparte su propio espacio, y un marco que ha crecido no reparte ese crecimiento entre sus hijos salvo que tú se lo digas. Si tienes una ventana con un marco dentro y widgets dentro del marco, necesitas configurar el peso **en los dos niveles**: en la ventana para que el marco crezca, y en el marco para que su contenido crezca.

Es la causa número uno de los redimensionados que no funcionan, y la forma de diagnosticarlo es ir nivel por nivel de fuera hacia dentro preguntándose si ese contenedor concreto tiene peso.

## Consultar y deshacer

| Método | Qué devuelve |
| --- | --- |
| `widget.grid_info()` | La colocación resuelta del widget |
| `contenedor.grid_size()` | Una tupla `(columnas, filas)` con el tamaño de la rejilla |
| `contenedor.grid_bbox(col, fila)` | La caja en píxeles de una celda |
| `contenedor.grid_slaves()` | Los widgets colocados, en orden inverso al de creación |
| `widget.grid_forget()` | Lo quita y **olvida** su posición |
| `widget.grid_remove()` | Lo quita y **recuerda** su posición |

```consola
>>> ventana.grid_size()
(3, 1)
>>> ventana.grid_bbox(0, 0)
(0, 0, 55, 34)
```

Esa caja son cuatro números: la esquina superior izquierda de la celda y sus dimensiones. Sirve para dibujar encima o para depurar cuando algo no está donde crees.

La diferencia entre los dos últimos métodos es pequeña de escribir y grande en la práctica:

```python
campo.grid_remove()          # desaparece
campo.grid()                 # vuelve a su sitio exacto, sin repetir nada
```

Con `grid_forget()`, esa segunda línea colocaría el widget en la fila 0, columna 0, sin `sticky` y sin rellenos, porque la información se ha perdido. **Para esconder y mostrar, siempre `grid_remove()`.**

Eso es justo lo que hace falta para los campos que aparecen según lo que se elija en otro sitio, que es un patrón constante en los formularios:

```python
def al_cambiar_tipo():
        if tipo.get() == "empresa":
                campo_cif.grid()
    else:
                campo_cif.grid_remove()
```

## Un formulario de verdad

Todo junto, un alta de colaborador con sus etiquetas alineadas, sus campos estirados, su título cruzando el formulario y sus botones abajo a la derecha.

```python title="formulario.py"
"""Alta de colaborador: el uso típico de grid, con peso y sticky bien puestos."""

import tkinter as tk

MARGEN = 12
AIRE = 6

ventana = tk.Tk()
ventana.title("Alta de colaborador")
ventana.geometry("520x300")
ventana.minsize(420, 260)

marco = tk.Frame(ventana, padx=MARGEN, pady=MARGEN)
marco.pack(fill="both", expand=True)

# El título cruza las dos columnas del formulario.
tk.Label(marco, text="Datos del colaborador",
         font=("Helvetica", 15, "bold")).grid(
    row=0, column=0, columnspan=2, sticky="w", pady=(0, MARGEN))

campos = {}
for fila, etiqueta in enumerate(("Nombre", "Correo", "Área", "Teléfono"), start=1):
        tk.Label(marco, text=f"{etiqueta}:").grid(
        row=fila, column=0, sticky="w", pady=AIRE, padx=(0, AIRE))
    campo = tk.Entry(marco)
    campo.grid(row=fila, column=1, sticky="ew", pady=AIRE)
    campos[etiqueta] = campo

# Las notas ocupan alto: se llevan el crecimiento vertical.
tk.Label(marco, text="Notas:").grid(row=5, column=0, sticky="nw", pady=AIRE)
notas = tk.Text(marco, height=4, wrap="word")
notas.grid(row=5, column=1, sticky="nsew", pady=AIRE)

# Los botones, abajo a la derecha, cruzando las dos columnas.
botones = tk.Frame(marco)
botones.grid(row=6, column=0, columnspan=2, sticky="e", pady=(MARGEN, 0))
tk.Button(botones, text="Cancelar").pack(side="left", padx=(0, AIRE))
tk.Button(botones, text="Guardar").pack(side="left")

# El peso: solo la columna de los campos y la fila de las notas crecen.
marco.columnconfigure(1, weight=1)
marco.rowconfigure(5, weight=1)

ventana.mainloop()
```

Agranda la ventana y comprueba las tres cosas que hacen que ese formulario esté bien montado. Las etiquetas se quedan pegadas a la izquierda y con su ancho natural, porque su columna no tiene peso. Los campos se estiran a lo ancho, porque su columna tiene peso y ellos llevan `sticky="ew"`. Y el área de notas crece en las dos direcciones, porque su fila tiene peso y lleva `sticky="nsew"`.

Fíjate también en que ahí conviven los dos gestores sin problema: el marco se coloca en la ventana con `pack`, su contenido usa `grid`, y los dos botones vuelven a usar `pack` dentro de su propio marco. Cada contenedor con un solo gestor, y todos distintos.

> [!consejo] Pon el peso al final, junto
>
> Configurar el peso justo después de crear cada widget dispersa esas líneas por todo el código y hace imposible ver de un vistazo cómo se reparte el espacio. La costumbre que mejor funciona es agrupar todas las llamadas a `columnconfigure` y `rowconfigure` al final del bloque que monta ese contenedor, con un comentario. Ahí se lee de un golpe qué crece y qué no, que es la pregunta que te vas a hacer cada vez que vuelvas al código.

> [!error] Mi ventana crece pero los widgets se quedan arriba a la izquierda
>
> El fallo clásico de `grid`, y casi siempre son las mismas tres causas, en este orden de probabilidad. Que no hayas puesto peso a ninguna fila ni columna, con lo que no hay nadie que reclame el espacio. Que el peso esté puesto pero al widget le falte `sticky`, con lo que la celda crece y él se queda centrado y pequeño. O que haya contenedores anidados y solo hayas configurado el peso del nivel de fuera, olvidando que no se hereda.

> [!resumen] En resumen
>
> `grid` coloca en una rejilla de filas y columnas que no hay que declarar: existen las que se usen, y las vacías no ocupan. Su opción central es `sticky`, que recibe los puntos cardinales a los que el widget debe pegarse y hace dos trabajos a la vez, porque pegarse a dos bordes opuestos obliga a estirarse; con eso sustituye a `fill` y `anchor` de `pack`, y en la práctica se reduce a `w` para las etiquetas, `ew` para los campos y `nsew` para lo que debe crecer. `columnspan` y `rowspan` combinan celdas como en una hoja de cálculo, y se usan sobre todo para títulos y separadores que cruzan el formulario. El reparto del espacio al redimensionar lo decide el peso, que se configura en el contenedor con `columnconfigure` y `rowconfigure`, nunca en la llamada a `grid`, y que por defecto es cero en todo; el peso reparte espacio pero no hace que el widget lo ocupe, así que siempre va acompañado de `sticky`, y no se hereda, por lo que en contenedores anidados hay que configurarlo en cada nivel. `minsize`, `pad` y `uniform` completan esa configuración, y este último mantiene varias columnas del mismo tamaño aunque su contenido difiera. Para esconder y volver a mostrar se usa `grid_remove()`, que recuerda la posición, y no `grid_forget()`, que la olvida.

> [!ejercicio] Practica
>
> Trabaja en un fichero `09-grid.py` salvo donde se indique otra cosa:
>
> 1. Monta una rejilla de tres por tres con nueve etiquetas de colores distintos y sin `sticky`. Después ponle `sticky="nsew"` a todas y peso 1 a las tres filas y las tres columnas. Compara los dos resultados al redimensionar.
> 2. Coge el `formulario.py` de la lección y quítale primero el peso de la columna 1, y después el `sticky` de los campos dejando el peso. Comprueba que los dos fallos se ven distintos y describe cada uno.
> 3. Escribe en `09-calculadora.py` la rejilla de una calculadora: una pantalla que cruza cuatro columnas arriba y cuatro filas de botones debajo, con el cero ocupando dos columnas. No hace falta que calcule nada, solo que la disposición aguante el redimensionado.
> 4. Prueba `uniform`: pon tres botones de textos muy distintos en tres columnas, primero sin grupo uniforme y después con las tres en el mismo. Anota la diferencia de anchos.
> 5. Escribe un formulario con un campo que aparezca y desaparezca según una casilla, usando `grid_remove()` y `grid()`. Después cámbialo a `grid_forget()` y comprueba qué le pasa a la posición.
> 6. Monta una ventana con un marco dentro de otro marco, tres niveles en total, y haz que el widget del fondo crezca con la ventana. Configura el peso nivel por nivel y comprueba qué ocurre si te saltas uno.
