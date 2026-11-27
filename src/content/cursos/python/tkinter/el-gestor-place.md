---
titulo: "El gestor place"
resumen: "Colocar por coordenadas exactas o proporcionales, por qué casi nunca conviene, y los tres casos en los que es la única respuesta."
minutos: 14
orden: 10
---

El tercer gestor es el que menos vas a usar, y esta lección es más corta por eso. Pero conviene conocerlo por dos motivos: resuelve un par de cosas que los otros dos no pueden hacer de ninguna manera, y es el que eligen por instinto quienes vienen de otras herramientas, así que verás código ajeno lleno de `place` mal usado.

`place` coloca cada widget en unas coordenadas que tú das, con un tamaño que tú das. Suena a lo más cómodo del mundo y es justo lo contrario: es el que más trabajo da en cuanto la ventana cambia de tamaño, cambia de fuente o cambia de sistema operativo.

> [!objetivo] Qué vas a aprender
>
> Colocar widgets con coordenadas absolutas y relativas, fijar su tamaño en píxeles o en proporción, entender por qué `place` no influye en el tamaño del contenedor, y reconocer los tres casos en los que es la herramienta correcta y no un atajo.

## Coordenadas absolutas

La forma más directa: píxeles contados desde la esquina superior izquierda del contenedor.

```python
etiqueta.place(x=10, y=20)
```

Sin más opciones, el widget se queda de su tamaño natural con su esquina superior izquierda en ese punto. Se puede comprobar:

```consola
>>> etiqueta.place(x=10, y=20)
>>> etiqueta.place_info()
{'in': <tkinter.Tk object .>, 'x': '10', 'relx': '0', 'y': '20', 'rely': '0',
 'width': '', 'relwidth': '', 'height': '', 'relheight': '',
 'anchor': 'nw', 'bordermode': 'inside'}
```

Dos cosas de esa salida merecen comentario. Que el anclaje por defecto es `nw`, la esquina superior izquierda, a diferencia de `pack` y `grid` que centran. Y que **los valores vienen como cadenas**, no como números, que es una de esas asperezas que delatan que por debajo hay un intérprete de Tcl donde todo es texto. Si necesitas operar con ellos, hay que convertirlos.

## Coordenadas relativas

Aquí está lo que `place` aporta de verdad. Las opciones `relx` y `rely` reciben una proporción de 0.0 a 1.0 del tamaño del contenedor:

| Valor | Significa |
| --- | --- |
| `relx=0.0` | Borde izquierdo |
| `relx=0.5` | Mitad del ancho |
| `relx=1.0` | Borde derecho |

Como son proporciones, **sobreviven al redimensionado**. Un widget con `relx=0.5` se queda en la mitad de la ventana mida lo que mida.

Combinado con `anchor`, eso da el centrado exacto en una línea:

```python
etiqueta.place(relx=0.5, rely=0.5, anchor="center")
```

Sin el `anchor`, lo que quedaría en la mitad sería la esquina superior izquierda del widget, no su centro, y el resultado se vería descolocado hacia abajo y a la derecha.

> [!nota] Lo absoluto y lo relativo se suman
>
> `x` y `relx` no son alternativas: si pones las dos, Tk las suma. `place(relx=0.5, x=-20)` significa "en la mitad, y veinte píxeles a la izquierda de ahí".
>
> Eso, que parece un detalle, es lo que hace útil a `place` para los casos en los que sirve: permite decir "pegado a la esquina inferior derecha, con doce píxeles de margen" con `relx=1.0, x=-12, rely=1.0, y=-12, anchor="se"`, y que ese margen se mantenga exacto mientras la esquina se mueve con la ventana.

## El tamaño

`place` es el único gestor que también decide el tamaño del widget, y con la misma pareja de formas:

| Opción | Qué hace |
| --- | --- |
| `width`, `height` | Tamaño en píxeles |
| `relwidth`, `relheight` | Proporción del tamaño del contenedor |

```consola
>>> etiqueta.place(relx=0.5, rely=0.5, anchor="center", relwidth=0.4)
>>> etiqueta.winfo_width(), ventana.winfo_width()
(200, 500)
```

Cuatro décimas de quinientos son doscientos, y así se mantiene al redimensionar. Como con las coordenadas, las dos formas se suman: `relwidth=1.0, width=-24` es "todo el ancho menos veinticuatro píxeles", que es la forma de dejar un margen constante a los dos lados.

Fíjate en que aquí `width` sí son píxeles, aunque el widget sea un `Label`. Es una excepción a la tabla de unidades de la lección 7: la opción `width` del widget mide en caracteres, pero la opción `width` de `place` mide en píxeles, porque es del gestor y no del widget.

## `place` no cuenta para el tamaño del contenedor

Esta es la diferencia de fondo con los otros dos, y la razón por la que no se puede usar como gestor general.

`pack` y `grid` calculan cuánto necesita el contenedor a partir de lo que hay dentro, y por eso una ventana se ajusta sola al tamaño de su contenido. `place` no hace eso: **coloca el widget donde le digas y no informa a nadie**.

Las consecuencias son concretas:

- Un contenedor cuyos hijos están todos con `place` calcula que no necesita ningún tamaño. Si no le fijas uno, se queda en un píxel.
- Un widget colocado en unas coordenadas que caen fuera del contenedor **no se ve**, y no hay ningún aviso.
- Si la ventana se encoge por debajo de lo que ocupan tus coordenadas, los widgets se salen y desaparecen por los bordes.

Por eso un programa entero hecho con `place` se ve perfecto en el equipo de quien lo escribió y se rompe en cualquier otro, en cuanto la fuente del sistema es un punto más grande o la pantalla tiene otra densidad.

> [!aviso] `place` es el que más parece una buena idea y menos lo es
>
> A quien viene de diseñar interfaces arrastrando cajas, `place` le resulta natural y los otros dos le parecen indirectos. Es una trampa que cuesta cara.
>
> Las interfaces se colocan con `pack` y `grid` porque el tamaño real de un widget **no se sabe de antemano**: depende de la fuente del sistema, del tema, del idioma del texto y de la densidad de la pantalla. Un botón que pone "Guardar" mide una cosa en tu macOS y otra en un Windows con el texto ampliado por accesibilidad. Al colocar por coordenadas estás congelando unas medidas que no son fijas.
>
> La regla es: **`place` solo cuando `pack` y `grid` no pueden hacerlo**, que son los tres casos del apartado siguiente.

## Cuándo sí

`place` tiene una capacidad que los otros dos no tienen en absoluto: **superponer widgets**. `pack` y `grid` reparten el espacio y nunca solapan nada. `place` no reparte, así que puede poner una cosa encima de otra.

De ahí salen sus usos legítimos.

**Superponer algo sobre otro widget.** Un contador encima de un icono, una etiqueta de "Nuevo" sobre una tarjeta, un botón de cerrar en la esquina de un panel, un mensaje de "cargando" tapando el contenido mientras llegan los datos.

```python
insignia.place(in_=icono, relx=1.0, rely=0.0, anchor="ne", x=4, y=-4)
```

Ese `in_` coloca el widget dentro de otro widget que no es su padre, y con `place` es donde de verdad se usa.

**Fondos y marcas de agua.** Una imagen que ocupa toda la ventana por detrás del resto, con `relwidth=1.0, relheight=1.0`, y los demás widgets encima.

**Pantallas de presentación y diálogos centrados a mano**, donde lo único que se quiere es una cosa en el centro exacto y no hay nada más que colocar.

```python title="superpuesto.py"
"""El uso legítimo de place: una insignia encima de otro widget."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Superposición")
ventana.geometry("360x220")

# La estructura, con un gestor normal.
tarjeta = tk.Frame(ventana, bg="#F2F2F7", width=200, height=120)
tarjeta.pack(expand=True)
tarjeta.pack_propagate(False)

tk.Label(tarjeta, text="Mensajes", bg="#F2F2F7",
         font=("Helvetica", 14)).place(relx=0.5, rely=0.5, anchor="center")

# La insignia, superpuesta en la esquina. Esto solo lo puede hacer place.
insignia = tk.Label(tarjeta, text=" 7 ", bg="#D32F2F", fg="white",
                    font=("Helvetica", 10, "bold"))
insignia.place(relx=1.0, rely=0.0, anchor="ne", x=-6, y=6)

ventana.mainloop()
```

En pantalla hay una tarjeta gris centrada, con su texto en medio y un círculo rojo con el número siete pegado a su esquina superior derecha, seis píxeles hacia dentro por los dos lados. Esa insignia se queda en su sitio al redimensionar, porque su posición es relativa a la tarjeta y su margen es absoluto.

Ese `pack_propagate(False)` de la tercera línea es necesario y conviene entenderlo: por defecto, un contenedor **encoge hasta el tamaño de su contenido**, ignorando el `width` y el `height` que le hayas puesto. Desactivar la propagación es lo que hace que respete el tamaño pedido. Tiene su equivalente `grid_propagate(False)`, y es un recurso que hace falta de vez en cuando con marcos que deben medir algo fijo.

## Consultar y deshacer

Los mismos tres métodos que los otros gestores:

| Método | Qué hace |
| --- | --- |
| `widget.place_info()` | Devuelve la colocación, con los valores como cadenas |
| `contenedor.place_slaves()` | Lista los widgets colocados con `place` |
| `widget.place_forget()` | Lo quita sin destruirlo |

Y el mismo control de errores que los demás, con la lista de opciones válidas en el mensaje:

```consola
>>> etiqueta.place(posx=3)
_tkinter.TclError: unknown option "-posx"
```

> [!consejo] Se puede mezclar place con los otros dos
>
> Esta es la única excepción a la regla de un gestor por contenedor, y es deliberada. Como `place` no participa en el reparto del espacio ni influye en el tamaño del contenedor, **no entra en conflicto con `pack` ni con `grid`**, y se pueden usar a la vez en el mismo sitio.
>
> Eso es justo lo que hace el ejemplo de la insignia: la tarjeta se coloca con `pack`, y encima se superpone algo con `place`. Es el patrón correcto, y el único en el que conviene mezclar.

> [!resumen] En resumen
>
> `place` coloca por coordenadas, absolutas con `x` e `y` en píxeles o proporcionales con `relx` y `rely` de 0.0 a 1.0, y las dos formas se suman cuando se dan juntas, lo que permite expresar cosas como "en la esquina, con doce píxeles de margen". Es el único gestor que además fija el tamaño, con `width` y `height` en píxeles o `relwidth` y `relheight` en proporción, y ahí `width` sí son píxeles aunque el widget mida normalmente en caracteres. Su diferencia de fondo con los otros dos es que no informa del espacio que necesita, así que un contenedor lleno de widgets con `place` cree que no necesita tamaño, y un widget colocado fuera de los límites desaparece sin aviso. Por eso no sirve como gestor general: las medidas reales de un widget dependen de la fuente del sistema, del tema y de la pantalla, y colocar por coordenadas las congela. A cambio tiene una capacidad exclusiva, superponer widgets, que es lo que lo hace la respuesta correcta para insignias sobre iconos, fondos que ocupan la ventana entera y capas que tapan el contenido mientras carga. Y como no participa en el reparto, es el único que se puede mezclar con `pack` o `grid` en el mismo contenedor.

> [!ejercicio] Practica
>
> Trabaja en un fichero `10-place.py` salvo donde se indique otra cosa:
>
> 1. Coloca una etiqueta con `x=50, y=50` y otra con `relx=0.5, rely=0.5, anchor="center"`. Redimensiona la ventana y describe qué le pasa a cada una.
> 2. Comprueba que lo absoluto y lo relativo se suman: coloca cuatro etiquetas en las cuatro esquinas, siempre con dieciséis píxeles de margen, usando `relx`, `rely`, `x`, `y` y el `anchor` que corresponda.
> 3. Crea un marco vacío y coloca dentro tres etiquetas solo con `place`. Comprueba a qué tamaño se queda el marco y explica por qué. Arréglalo de dos formas distintas.
> 4. Escribe en `10-insignia.py` una versión del ejemplo de la lección con tres tarjetas, cada una con su insignia, y un botón que cambie los números de las tres.
> 5. Escribe una capa de carga: un marco que ocupe toda la ventana con `relwidth=1.0, relheight=1.0`, con un texto centrado, que aparezca al pulsar un botón y desaparezca tres segundos después con `after` y `place_forget()`.
> 6. Coge el `formulario.py` de la lección de `grid` e intenta reproducirlo solo con `place`. Cuando lo tengas, redimensiona la ventana y cambia el tamaño de la fuente por defecto, y escribe en un comentario qué se rompe y por qué.
