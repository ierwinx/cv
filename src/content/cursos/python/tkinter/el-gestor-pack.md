---
titulo: "El gestor pack"
resumen: "Cómo razona pack repartiendo la cavidad de la ventana, sus nueve opciones, y la diferencia entre fill y expand que todo el mundo confunde."
minutos: 22
orden: 8
---

Llevas seis lecciones escribiendo `.pack()` a secas, sin argumentos, con la promesa de que eso se explicaría más adelante. Este bloque es ese más adelante.

Colocar widgets tiene más miga de la que parece. No basta con decir dónde va cada cosa: hay que decidir qué pasa cuando la ventana crece, cuál de los elementos se queda con el espacio sobrante y cuáles se quedan como están. Un formulario que se ve perfecto al abrirlo y se deshace al agrandar la ventana es el resultado típico de no haber pensado eso.

Tkinter tiene tres sistemas para colocar widgets, y `pack` es el primero de los tres y el más usado. La clave para entenderlo es que **no piensa en coordenadas**: piensa en ir cortando rebanadas del espacio disponible.

> [!objetivo] Qué vas a aprender
>
> Entender el modelo de cavidad con el que razona `pack`, usar sus nueve opciones —`side`, `fill`, `expand`, `anchor`, los cuatro rellenos y `before`/`after`—, distinguir con claridad `fill` de `expand`, consultar y deshacer una colocación, y saber por qué nunca se pueden mezclar dos gestores dentro del mismo contenedor.

## Tres gestores, y hay que elegir

Antes de entrar en `pack`, conviene saber que no está solo:

| Gestor | Cómo razona | Para qué sirve |
| --- | --- | --- |
| `pack` | Va cortando franjas de los lados del espacio libre | Barras, columnas, apilados simples |
| `grid` | Una rejilla de filas y columnas | Formularios y casi todo lo demás |
| `place` | Coordenadas exactas | Casos muy concretos, poco más |

Los tres tienen su lección. Lo que hay que saber ya es que **dentro de un mismo contenedor se usa uno y solo uno**, y que esa decisión se toma por contenedor, no por programa: es normal y habitual que una ventana use `pack` para la estructura general y `grid` dentro de uno de sus marcos.

## Cómo razona pack

Este es el modelo mental completo, y entenderlo ahorra memorizar las opciones.

`pack` mantiene una **cavidad**, que al principio es el contenedor entero. Cada vez que colocas un widget, hace tres cosas: elige un lado de la cavidad, le corta una franja de ese lado lo bastante ancha para que el widget quepa, mete el widget en esa franja, y lo que queda de la cavidad es la nueva cavidad para el siguiente.

Ese "lo que queda" es lo que hace que **el orden de las llamadas importe muchísimo**. No estás diciendo "este va arriba", estás diciendo "este se queda con una franja del lado de arriba de lo que quede ahora mismo".

Por eso `.pack()` a secas apila los widgets uno debajo de otro: el lado por defecto es el de arriba, y cada widget corta una franja horizontal de lo que va quedando.

Las opciones que acepta son exactamente nueve, y el propio Tk las enumera si te equivocas al escribir una:

```consola
>>> etiqueta.pack(lado="left")
_tkinter.TclError: bad option "-lado": must be -after, -anchor, -before, -expand,
-fill, -in, -ipadx, -ipady, -padx, -pady, or -side
```

Y `pack_info()` devuelve cómo ha quedado colocado un widget, con todos los valores por defecto ya resueltos:

```consola
>>> etiqueta.pack()
>>> etiqueta.pack_info()
{'in': <tkinter.Tk object .>, 'anchor': 'center', 'expand': 0, 'fill': 'none',
 'ipadx': 0, 'ipady': 0, 'padx': 0, 'pady': 0, 'side': 'top'}
```

Ahí están los valores de partida de todo lo que viene a continuación: lado de arriba, sin rellenar, sin expandirse, centrado y sin márgenes.

## `side`: de qué lado se corta

Acepta cuatro valores, y ninguno más:

```consola
>>> etiqueta.pack(side="arriba")
_tkinter.TclError: bad side "arriba": must be bottom, left, right, or top
```

| Valor | Corta una franja | Resultado visible |
| --- | --- | --- |
| `"top"` | Horizontal, arriba | Los widgets se apilan hacia abajo |
| `"bottom"` | Horizontal, abajo | Los widgets se apilan hacia arriba |
| `"left"` | Vertical, izquierda | Los widgets se alinean hacia la derecha |
| `"right"` | Vertical, derecha | Los widgets se alinean hacia la izquierda |

Aquí está la primera sorpresa: con `side="left"`, los widgets aparecen de izquierda a derecha en el orden en que los colocaste, pero con `side="right"` aparecen **en orden inverso**, porque cada uno corta del borde derecho de lo que queda. El primero acaba siendo el de más a la derecha.

```python title="lados.py"
"""Los cuatro lados de pack, cada uno con su color para verlos."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Lados")
ventana.geometry("420x260")

tk.Label(ventana, text="arriba", bg="#A8D8EA").pack(side="top", fill="x")
tk.Label(ventana, text="abajo", bg="#FFB7B2").pack(side="bottom", fill="x")
tk.Label(ventana, text="izquierda", bg="#B5EAD7").pack(side="left", fill="y")
tk.Label(ventana, text="derecha", bg="#FFDAC1").pack(side="right", fill="y")
tk.Label(ventana, text="el resto", bg="#C7CEEA").pack(fill="both", expand=True)

ventana.mainloop()
```

Ese programa dibuja el modelo de cavidad tal cual. La franja azul se lleva todo el ancho de arriba. La rosa, todo el ancho de abajo de lo que queda. La verde, todo el alto de la izquierda de lo que queda, que ya no llega ni arriba ni abajo del todo. Y la última se queda con el hueco central.

Cambia el orden de esas cinco líneas y el resultado cambia por completo. Esa es la prueba de que `pack` no coloca en posiciones absolutas.

## `fill`: estirarse dentro de la franja

Un widget no ocupa toda la franja que se le ha cortado: por defecto se queda de su tamaño natural, centrado dentro de ella. `fill` le dice que se estire.

```consola
>>> etiqueta.pack(fill="ambos")
_tkinter.TclError: bad fill style "ambos": must be none, x, y, or both
```

| Valor | Qué estira |
| --- | --- |
| `"none"` | Nada. El widget mantiene su tamaño natural |
| `"x"` | Solo a lo ancho |
| `"y"` | Solo a lo alto |
| `"both"` | Las dos direcciones |

La regla práctica es fácil de recordar: **la dirección en que `fill` sirve es la perpendicular al `side`**. Con `side="top"`, la franja es tan alta como el widget pero tan ancha como el contenedor, así que `fill="x"` es lo que hace algo y `fill="y"` no tiene espacio que ocupar. Con `side="left"` ocurre al revés.

Por eso el `fill="x"` aparece tantísimo en el código real: es lo que hace que una barra de herramientas o una barra de estado ocupen el ancho completo en vez de quedarse encogidas en el centro.

## `expand`: repartirse el espacio sobrante

Esta es la que cuesta, y la que todo el mundo confunde con `fill`. Son dos cosas distintas que suelen ir juntas.

Cuando `pack` ha colocado todos los widgets, normalmente sobra sitio. `expand=True` marca a un widget como candidato a **quedarse con ese sobrante**, ampliando su franja. Si hay varios marcados, se lo reparten a partes iguales.

Dicho de otra forma:

|  | Qué decide |
| --- | --- |
| `expand` | Cuánto espacio se le **da** a la franja del widget |
| `fill` | Cuánto de esa franja **ocupa** el widget |

De ahí salen las cuatro combinaciones, y las cuatro se usan:

| Combinación | Efecto |
| --- | --- |
| Ninguna | Tamaño natural, pegado a su lado. Botones, etiquetas cortas |
| `fill="x"` | Todo el ancho, alto natural. Barras de herramientas y de estado |
| `expand=True` | Se queda con el sobrante pero sigue de su tamaño, centrado en él |
| `expand=True, fill="both"` | Crece con la ventana. El contenido principal |

Esa tercera fila es la que sorprende. Un widget con `expand=True` y sin `fill` recibe más espacio y no lo usa: se queda igual de grande, centrado en medio del hueco. Eso lo convierte en la forma más corta de centrar algo en el espacio libre, sin calcular nada y sin recurrir a `place`.

> [!aviso] Sin `expand`, la ventana crece y el contenido no
>
> Este es el fallo más común con `pack`, y se reconoce enseguida: agrandas la ventana y todo se queda arriba a la izquierda con una franja gris creciendo debajo.
>
> La causa es que **nadie ha reclamado el espacio sobrante**. `fill="both"` no basta: rellenar la franja no sirve de nada si la franja no crece. En cualquier ventana redimensionable tiene que haber al menos un widget con `expand=True`, normalmente el contenido principal, y es lo primero que hay que mirar cuando el redimensionado no se comporta.

## Los cuatro rellenos

Hay dos parejas, y la diferencia entre ellas es constante en Tkinter:

| Opción | Dónde añade espacio |
| --- | --- |
| `padx`, `pady` | **Fuera** del widget: separación con sus vecinos |
| `ipadx`, ipady | **Dentro** del widget: lo hace más grande |

La `i` es de *internal*. Con `padx=10` dejas diez píxeles de aire alrededor; con `ipadx=10` el widget mide veinte píxeles más de ancho, y si es un botón, su zona pulsable crece.

Las dos aceptan una tupla para poner valores distintos a cada lado, que es como se consigue el espaciado asimétrico que hace falta continuamente:

```python
etiqueta.pack(pady=(12, 4))     # 12 arriba, 4 abajo
```

Ese patrón, más margen arriba que abajo, es el que agrupa visualmente un título con el contenido que le sigue.

> [!consejo] Elige dos o tres medidas y no más
>
> Un error de principiante que se ve enseguida es usar cinco separaciones distintas: 3, 5, 8, 10 y 12 píxeles repartidos a ojo. Queda desordenado sin que se sepa muy bien por qué.
>
> Define arriba dos o tres constantes —por ejemplo 4, 8 y 16— y usa solo esas. Es el mismo criterio de la paleta corta de colores, y el resultado se nota igual.

## `anchor`: dónde se apoya si le sobra sitio

Cuando un widget no rellena su franja, `anchor` decide en qué parte de ella se queda. Acepta los puntos cardinales como cadenas: `"n"`, `"s"`, `"e"`, `"w"`, las cuatro combinaciones `"ne"`, `"nw"`, `"se"`, `"sw"`, y `"center"`, que es el valor por defecto.

El uso más habitual es `anchor="w"` para alinear a la izquierda una etiqueta que está dentro de una franja más ancha que ella. Sin eso sale centrada, que en una columna de etiquetas queda mal.

> [!nota] No confundas el `anchor` de `pack` con el del widget
>
> Los dos se llaman igual y hacen cosas parecidas en sitios distintos. `etiqueta.pack(anchor="w")` coloca **la etiqueta entera** a la izquierda de su franja. `tk.Label(..., anchor="w")` coloca **el texto** a la izquierda dentro de la etiqueta, que solo se nota si la etiqueta es más ancha que su texto. Cuando algo no se alinea como esperas, suele ser que estás tocando uno de los dos y necesitas el otro, o los dos a la vez.

## `before`, `after` e `in_`

Las tres últimas opciones se usan poco pero resuelven casos concretos.

`before` y `after` sirven para insertar un widget en medio del orden ya establecido, sin tener que recolocar los demás:

```python
aviso.pack(before=tabla)
```

Eso coloca el aviso justo antes de la tabla en el reparto de la cavidad, aunque la tabla se hubiera colocado mucho antes. Es lo que se usa para mostrar una barra de mensajes que aparece y desaparece.

`in_` coloca el widget dentro de otro contenedor distinto de su padre. Lleva guion bajo porque `in` es una palabra reservada de Python. Se usa muy poco y casi siempre hay una solución mejor.

## Consultar y deshacer

Tres métodos completan el gestor:

| Método | Qué hace |
| --- | --- |
| `widget.pack_info()` | Devuelve el diccionario con la colocación actual |
| `contenedor.pack_slaves()` | Lista los widgets que `pack` gestiona en ese contenedor, en orden |
| `widget.pack_forget()` | Lo quita de la ventana sin destruirlo |

`pack_forget()` merece atención porque es la forma de esconder y mostrar partes de la interfaz:

```python
def alternar_barra():
        if barra.winfo_ismapped():
                barra.pack_forget()
    else:
                barra.pack(side="top", fill="x")
```

El widget no se destruye, sigue existiendo con todo su contenido, simplemente deja de estar colocado. Eso es lo que hay detrás de un menú de "Mostrar barra de herramientas" como el que tiene tu panel de control.

Y ojo con un detalle: al volver a colocarlo, **hay que repetir todas las opciones**, porque `pack_forget` las olvida. Si el widget estaba en medio de otros, volverá al final salvo que uses `before`.

## Nunca dos gestores en el mismo contenedor

Esto no es una recomendación de estilo. Es un error de verdad, con su mensaje:

```consola
>>> a.pack()
>>> b.grid(row=0, column=0)
_tkinter.TclError: cannot use geometry manager "grid" inside ".!frame":
pack is already managing its content windows
```

La razón es que los dos gestores calculan el tamaño del contenedor a partir de lo que hay dentro, y cada uno con su lógica. Si los dos mandan en el mismo sitio, cada cálculo invalida el del otro y se entra en un bucle. Tk lo detecta y lo impide.

> [!error] cannot use geometry manager "grid" inside "...": pack is already managing its content windows
>
> Estás mezclando gestores en un mismo contenedor. Aparece también al revés, con `pack` sobre algo que ya usaba `grid`.
>
> La solución no es elegir uno para todo el programa, sino **meter un `Frame` por medio**. Un marco colocado con `pack` dentro de la ventana puede usar `grid` para su propio contenido sin ningún conflicto, porque son dos contenedores distintos. Esa es exactamente la técnica de la lección de marcos y anidamiento, y es la forma normal de construir una interfaz: `pack` para la estructura general y `grid` dentro de los formularios.

> [!aviso] La versión silenciosa del mismo problema
>
> Hay un caso que no da error y cuelga el programa: colocar con `pack` un widget **dentro de sí mismo o de un descendiente suyo**, o crear una dependencia circular de tamaños. La ventana se queda en blanco y el proceso se come un núcleo entero calculando sin parar. Si te pasa, revisa que el primer argumento de cada widget sea el contenedor que crees que es.

## Una ventana completa con pack

Para cerrar, la estructura clásica de una aplicación de escritorio: barra de herramientas arriba, barra de estado abajo, panel lateral y contenido principal. Todo con `pack`, y todo se comporta bien al redimensionar.

```python title="estructura.py"
"""La estructura típica de una aplicación, montada solo con pack."""

import tkinter as tk

MARGEN = 8
AIRE = 4

ventana = tk.Tk()
ventana.title("Estructura")
ventana.geometry("640x420")
ventana.minsize(480, 320)

# 1. La barra de herramientas: todo el ancho, alto natural, y va primero.
barra = tk.Frame(ventana, bg="#F2F2F7", padx=MARGEN, pady=AIRE)
barra.pack(side="top", fill="x")
for texto in ("Nuevo", "Abrir", "Guardar"):
        tk.Button(barra, text=texto).pack(side="left", padx=(0, AIRE))

# 2. La barra de estado: se coloca antes que el contenido para reservar su sitio.
estado = tk.Label(ventana, text="Listo", bg="#F2F2F7", anchor="w",
                  padx=MARGEN, pady=AIRE)
estado.pack(side="bottom", fill="x")

# 3. El panel lateral: todo el alto de lo que queda, ancho natural.
lateral = tk.Frame(ventana, bg="#E5E5EA", padx=MARGEN, pady=MARGEN)
lateral.pack(side="left", fill="y")
for texto in ("Resumen", "Ventas", "Equipo", "Ajustes"):
        tk.Label(lateral, text=texto, bg="#E5E5EA", anchor="w").pack(fill="x", pady=AIRE)

# 4. El contenido: el único con expand, así que se queda con todo el sobrante.
contenido = tk.Frame(ventana, bg="white", padx=MARGEN, pady=MARGEN)
contenido.pack(side="left", fill="both", expand=True)
tk.Label(contenido, text="Contenido principal", bg="white").pack(anchor="nw")

ventana.mainloop()
```

Agranda y encoge esa ventana. La barra de arriba y la de abajo mantienen su altura y se estiran a lo ancho. El panel lateral mantiene su anchura y se estira a lo alto. Y el contenido blanco absorbe todo el cambio, en las dos direcciones, porque es el único con `expand=True`.

Fíjate en el orden de los cuatro bloques, que no es casual. Las dos barras se colocan antes que el contenido para que se lleven su franja de la cavidad completa, llegando de borde a borde. Si el contenido fuera primero y se quedara con el centro, la barra de estado solo ocuparía el ancho de lo que sobrase.

> [!resumen] En resumen
>
> `pack` reparte el contenedor cortando franjas: cada widget se queda con una franja de un lado de la cavidad que quede libre, y el resto pasa a ser la cavidad del siguiente, por lo que el orden de las llamadas decide el resultado. `side` elige de qué lado se corta, con `top` por defecto, y `right` produce el orden visual invertido. `fill` dice si el widget se estira dentro de su franja, y solo hace algo en la dirección perpendicular al `side`. `expand` es otra cosa distinta: marca quién se queda con el espacio que sobra al final, y sin al menos un widget expandido la ventana crece dejando el contenido arriba a la izquierda. Los rellenos van en dos parejas, `padx` y `pady` por fuera para separar de los vecinos, `ipadx` e `ipady` por dentro para agrandar el widget, y las dos aceptan tuplas para dar valores distintos a cada lado. `anchor` decide dónde se apoya un widget que no rellena su franja, y no hay que confundirlo con el `anchor` del propio widget, que coloca su texto. `pack_info()` muestra la colocación resuelta, `pack_slaves()` lista lo gestionado y `pack_forget()` esconde sin destruir, olvidando las opciones. Y dentro de un mismo contenedor no puede haber dos gestores: si hacen falta los dos, se mete un `Frame` por medio, que es lo normal.

> [!ejercicio] Practica
>
> Trabaja en un fichero `08-pack.py` salvo donde se indique otra cosa:
>
> 1. Escribe el `lados.py` de la lección, ejecútalo y después reordena las cinco llamadas a `pack` de tres formas distintas. Anota qué cambia en cada una y explica el resultado con el modelo de cavidad.
> 2. Coloca cuatro botones con `side="right"` y comprueba en qué orden aparecen respecto al orden de tu código. Haz lo mismo con `side="left"` y explica la diferencia.
> 3. Crea una ventana con tres etiquetas de colores y prueba las cuatro combinaciones de `fill` y `expand` en la del medio. Redimensiona la ventana en cada caso y describe en un comentario qué hace cada combinación.
> 4. Escribe en `08-mensaje.py` una ventana con una barra de mensajes que aparece y desaparece con un botón, usando `pack_forget()` y `before` para que vuelva siempre al mismo sitio y no al final.
> 5. Provoca a propósito el error de mezclar `pack` y `grid` en un contenedor, copia el mensaje exacto, y después arréglalo metiendo un `Frame` por medio.
> 6. Coge el `estructura.py` de la lección y amplíalo: añade un segundo panel lateral a la derecha que se pueda esconder desde un botón de la barra de herramientas, cuidando que el contenido central siga absorbiendo el redimensionado.
