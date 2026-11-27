---
titulo: "Colores, fuentes y medidas"
resumen: "Cómo se nombra un color, cómo se define una fuente para que respete el sistema, y por qué width no significa lo mismo en dos widgets distintos."
minutos: 22
orden: 7
---

Las seis lecciones anteriores han montado la ventana y han explicado cómo funcionan los widgets. Falta lo que decide su aspecto: de qué color es cada cosa, con qué letra se escribe y en qué unidades se miden los tamaños.

Parece la parte fácil y tiene más trampas que ninguna. Un tamaño de fuente negativo no significa lo que parece, una fuente que no existe no da ningún error, y la opción `width` mide cosas distintas según a qué widget se la pongas. Ninguna de las tres cosas está bien documentada, y las tres se sufren antes o después.

Esta lección cierra el bloque de la ventana dejando resuelto el aspecto, para que las lecciones de los widgets puedan centrarse en lo que hace cada uno.

> [!objetivo] Qué vas a aprender
>
> Nombrar colores de las tres formas que entiende Tk y traducirlos con `winfo_rgb`, definir fuentes con el objeto `Font` en vez de con tuplas, aprovechar las fuentes con nombre del sistema para que la aplicación respete las preferencias de cada equipo, medir texto con `measure` y `metrics`, y saber en qué unidades mide cada widget para que `width` no te sorprenda.

## Los colores

Tk acepta un color de tres maneras, y todas se escriben como una cadena de texto.

**Por nombre.** Hay una lista de nombres simbólicos heredada del sistema de ventanas de Unix, y es larga: desde los evidentes como `red`, `blue` o `white` hasta cosas como `steelblue`, `lightgoldenrodyellow` o `mistyrose`. Son cómodos para prototipar y poco recomendables para un programa terminado, porque nadie recuerda qué aspecto tiene `papayawhip`.

**Por valor hexadecimal**, igual que en la web pero con más variantes:

| Forma | Ejemplo | Bits por componente |
| --- | --- | --- |
| `#rgb` | `#f00` | 4 |
| `#rrggbb` | `#ff0000` | 8 |
| `#rrrgggbbb` | `#fff000000` | 12 |
| `#rrrrggggbbbb` | `#ffff00000000` | 16 |

En la práctica se usa siempre la de seis dígitos, que es la que ya conoces. Las otras existen porque X11 trabajaba internamente con dieciséis bits por componente.

**Por nombre del sistema**, como `SystemButtonFace` o `systemWindowBackgroundColor`. Son los colores que el sistema operativo usa para sus propios elementos, así que cambian solos con el tema claro y oscuro. La pega es que los nombres son distintos en cada plataforma, así que usarlos ata tu programa a un sistema.

### Traducir un color

`winfo_rgb()` convierte cualquiera de esas formas en sus tres componentes, y es la manera de saber qué hay detrás de un nombre:

```consola
>>> ventana.winfo_rgb("red")
(65535, 0, 0)
>>> ventana.winfo_rgb("#f00")
(65535, 0, 0)
>>> ventana.winfo_rgb("steelblue")
(17990, 33410, 46260)
```

Ese 65535 desconcierta la primera vez. No son valores de 0 a 255, sino de 0 a 65535, porque Tk guarda dieciséis bits por componente. Para pasarlos al rango habitual hay que dividir entre 257, que es exactamente 65535 partido por 255.

Eso no es una curiosidad. Es lo que permite averiguar por código si el sistema está en modo claro u oscuro sin preguntarle al sistema operativo, que es justo lo que hace tu panel de control: coge el color de fondo que reporta el tema, lo convierte a componentes, calcula su luminancia y decide.

```python
def es_oscuro(ventana, color):
        """Decide si un color es oscuro a partir de su luminancia percibida."""
    r, g, b = (canal / 257 for canal in ventana.winfo_rgb(color))
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128
```

Esos tres coeficientes no son arbitrarios: el ojo humano es mucho más sensible al verde que al azul, y esa fórmula es la que se usa desde la televisión en blanco y negro para convertir color en gris.

### `background` y `foreground`

Los dos nombres de opción para el color son `background`, el del fondo, y `foreground`, el del texto. Tienen las abreviaturas `bg` y `fg`, que son las que verás en casi todos los ejemplos.

> [!consejo] Una paleta corta, definida arriba
>
> Vale aquí el mismo criterio que en el módulo 2 con el módulo `colores.py`: los colores no se escriben sueltos por el programa, se definen una vez como constantes al principio del fichero y se usan por su nombre. Así se cambia el aspecto entero tocando cinco líneas, y así se evita acabar con nueve grises ligeramente distintos.
>
> Y sigue valiendo lo otro que se dijo allí: **el color informa, pero no debe ser la única fuente de información**. Un campo obligatorio que solo se distingue por tener el borde rojo no lo distingue quien no ve el rojo, que es aproximadamente uno de cada doce hombres. Hace falta además un texto, un icono o un asterisco.

## Las fuentes

Una fuente se puede dar de tres formas, y merece la pena conocer las tres porque las vas a leer, pero solo una es la recomendable.

**Como tupla**, que es la forma rápida:

```python
tk.Label(ventana, text="Título", font=("Helvetica", 16, "bold"))
```

Los elementos son la familia, el tamaño y, opcionalmente, uno o varios estilos.

**Como cadena**, `"Helvetica 16 bold"`, que es lo mismo escrito en el formato de Tcl. Se ve en ejemplos antiguos y se rompe en cuanto la familia tiene un espacio en el nombre.

**Como objeto `Font`**, que es la que conviene:

```python
from tkinter import font

titulo = font.Font(family="Helvetica", size=16, weight="bold")
tk.Label(ventana, text="Título", font=titulo).pack()
```

Parece más trabajo para lo mismo, pero tiene una ventaja decisiva: **el objeto es compartido**. Si veinte widgets usan `titulo` y mañana cambias `titulo`, los veinte cambian a la vez, sin tocarlos. Eso convierte un botón de "aumentar el tamaño del texto" en tres líneas:

```python
def agrandar():
        titulo.configure(size=titulo.cget("size") + 2)
```

Con tuplas no hay manera: cada widget tendría su copia y habría que recorrerlos todos.

Los atributos de una fuente son seis:

| Atributo | Valores | Por defecto |
| --- | --- | --- |
| `family` | El nombre de la familia | La del sistema |
| `size` | Positivo en puntos, negativo en píxeles | Depende del sistema |
| `weight` | `normal` o `bold` | `normal` |
| `slant` | `roman` o `italic` | `roman` |
| `underline` | 0 o 1 | 0 |
| `overstrike` | 0 o 1 | 0 |

### El tamaño negativo

Esta es la trampa de la lección, y está en la fila de `size`. Un número positivo son **puntos tipográficos**, la unidad de la imprenta. Un número negativo son **píxeles**. No es un tamaño negativo: es el mismo tamaño medido en otra unidad.

La diferencia se ve al pedirle a las dos fuentes cuánto ocupan:

```consola
>>> negativa = font.Font(family="Helvetica", size=-20)
>>> positiva = font.Font(family="Helvetica", size=20)
>>> negativa.metrics("linespace"), negativa.actual("size")
(23, 15)
>>> positiva.metrics("linespace"), positiva.actual("size")
(31, 20)
```

Las dos dicen 20 y ocupan cosas distintas: 23 píxeles de alto de línea una y 31 la otra. Y fíjate en que `actual("size")` de la negativa devuelve 15: Tk ha convertido esos 20 píxeles a los puntos equivalentes en esta pantalla.

Cuál usar depende de qué te importe. Los puntos se escalan con la resolución, así que el texto se ve del mismo tamaño físico en pantallas distintas, que es lo que quieres casi siempre. Los píxeles son exactos y no cambian, lo que hace falta cuando el texto tiene que encajar en un hueco medido en píxeles, típicamente dentro de un `Canvas`.

### Las fuentes con nombre

Aquí está la mejor decisión que se puede tomar sobre las fuentes de una aplicación, y es no elegirlas.

Tk define un puñado de fuentes con nombre que apuntan a las del sistema. Al usarlas, tu programa escribe con la misma letra y el mismo tamaño que el resto de aplicaciones del equipo, y **respeta automáticamente las preferencias de accesibilidad** de quien lo usa.

```consola
>>> sorted(font.names())[:11]
['RecessedFont', 'SidebarFont', 'TkCaptionFont', 'TkDefaultFont', 'TkFixedFont',
 'TkHeadingFont', 'TkIconFont', 'TkMenuFont', 'TkSmallCaptionFont', 'TkTextFont',
 'TkTooltipFont']
```

Las que empiezan por `Tk` son las portátiles, y existen en los tres sistemas:

| Nombre | Para qué |
| --- | --- |
| `TkDefaultFont` | Lo que no sea ninguna otra cosa |
| `TkTextFont` | Campos de texto y áreas de edición |
| `TkFixedFont` | Texto de ancho fijo: código, tablas alineadas |
| `TkMenuFont` | Menús |
| `TkHeadingFont` | Cabeceras de columna y títulos de sección |
| `TkCaptionFont` | Títulos de ventana y de diálogo |
| `TkSmallCaptionFont` | Texto secundario de los diálogos |
| `TkTooltipFont` | Textos de ayuda emergente |

Se obtienen con `nametofont`, que devuelve el objeto `Font` de verdad:

```consola
>>> por_defecto = font.nametofont("TkDefaultFont")
>>> por_defecto.actual()
{'family': '.AppleSystemUIFont', 'size': 10, 'weight': 'normal',
 'slant': 'roman', 'underline': 0, 'overstrike': 0}
>>> font.nametofont("TkFixedFont").actual()
{'family': 'Menlo', 'size': 8, 'weight': 'normal',
 'slant': 'roman', 'underline': 0, 'overstrike': 0}
```

Eso es en macOS. En Windows saldría algo como Segoe UI y Consolas, y en Linux lo que tenga configurado el escritorio. Tu programa no necesita saberlo.

Y lo más potente: como son objetos compartidos, **modificar una fuente con nombre cambia toda la aplicación de golpe**, incluidos los widgets que ya estaban creados.

```python
font.nametofont("TkDefaultFont").configure(size=14)
```

Esa única línea agranda el texto de todos los widgets que no hayan pedido una fuente concreta. Es la forma sensata de implementar una preferencia de tamaño de letra.

> [!aviso] Una fuente que no existe no da ningún error
>
> Si pides una familia que no está instalada, Tk no se queja: busca la que más se le parezca y sigue.
>
> ```consola
> >>> font.Font(family="NoExisteEstaFuente", size=12).actual()
> {'family': '.AppleSystemUIFont', 'size': 12, 'weight': 'normal',
>  'slant': 'roman', 'underline': 0, 'overstrike': 0}
> ```
>
> Ha caído en la fuente del sistema sin decir nada. Esto es cómodo y a la vez traicionero: el programa que en tu equipo se ve perfecto con `Helvetica Neue` puede verse distinto en otro sin que nada falle. La forma de comprobarlo es preguntar con `actual()` si la familia que ha quedado es la que pediste, y la forma de evitarlo es usar las fuentes con nombre.

### Qué fuentes hay y cuánto ocupa un texto

`font.families()` devuelve las familias instaladas:

```consola
>>> len(font.families())
187
>>> sorted(f for f in font.families() if not f.startswith("."))[:6]
['Academy Engraved LET', 'Al Bayan', 'Al Nile', 'Al Tarikh',
 'American Typewriter', 'Andale Mono']
```

Ese filtro del punto no es capricho: en macOS las fuentes internas del sistema empiezan por punto y no están pensadas para pedirlas por nombre.

Los dos métodos que de verdad se usan son `metrics` y `measure`:

```consola
>>> por_defecto.metrics()
{'ascent': 13, 'descent': 3, 'linespace': 16, 'fixed': 0}
>>> por_defecto.measure("Guardar")
49
```

`metrics()` describe la fuente en vertical. `ascent` es lo que sube por encima de la línea base, `descent` lo que baja, `linespace` la altura total de una línea, que es lo que hay que multiplicar para saber cuánto ocupan diez líneas de texto, y `fixed` dice si es de ancho fijo.

`measure()` es el que resuelve problemas reales: **dice cuántos píxeles ocupa un texto antes de dibujarlo**. Con él se calcula el ancho que necesita una columna para que no se corte el contenido más largo:

```python
ancho = max(texto_de_la_fuente.measure(valor) for valor in valores) + 16
```

Eso es lo que hay detrás de las columnas que se ajustan solas al contenido, y es imposible de hacer a ojo contando caracteres, porque en una fuente proporcional una `i` y una `M` no ocupan lo mismo.

## Las unidades de medida

Un número a secas son píxeles. Pero donde Tk espera una medida también acepta una cadena con sufijo, y entonces la unidad cambia:

| Sufijo | Unidad | Ejemplo |
| --- | --- | --- |
| ninguno | Píxeles | `12` |
| `c` | Centímetros | `"1c"` |
| `m` | Milímetros | `"5m"` |
| `i` | Pulgadas | `"0.5i"` |
| `p` | Puntos de impresión | `"10p"` |

`winfo_fpixels()` traduce cualquiera de ellas a píxeles reales de la pantalla:

```consola
>>> ventana.winfo_fpixels("1i")
95.94603709949409
>>> ventana.winfo_fpixels("1c")
37.77403035413153
>>> ventana.winfo_fpixels("10p")
13.325838486040846
```

Esos números son de una pantalla concreta y en otra serán otros. Salen de lo que Tk cree que mide la pantalla, y ese dato está en un ajuste llamado escalado, que es el número de píxeles que tiene un punto:

```consola
>>> ventana.tk.call("tk", "scaling")
1.3325838486040846
```

Si haces la cuenta, ese valor por 72 puntos da los 95.9 píxeles de la pulgada. En pantallas de alta densidad el escalado sube, y ese mismo valor se puede fijar a mano si Tk se equivoca, aunque conviene tocarlo lo mínimo.

### `width` no mide lo mismo en todas partes

Y aquí la última trampa, que es la que más desconcierta de todas. La opción `width` existe en casi todos los widgets y **no usa la misma unidad en todos**:

```consola
>>> etiqueta = tk.Label(ventana, text="Hola", width=10)
>>> marco = tk.Frame(ventana, width=10, height=10)
>>> etiqueta.winfo_reqwidth()
96
>>> marco.winfo_reqwidth()
10
```

El mismo `width=10` da 96 píxeles en un sitio y 10 en el otro. La regla es esta:

| Widget | Unidad de `width` |
| --- | --- |
| `Label`, `Button`, `Entry`, `Text`, `Listbox` | Caracteres |
| `Frame`, `Canvas`, `Toplevel`, imágenes | Píxeles |
| Widgets `ttk` en general | Caracteres, si muestran texto |

La lógica detrás es que los widgets que muestran texto se miden en texto, porque lo que quieres decir es "que quepan veinte caracteres", no "que mida doscientos píxeles". Y "un carácter" significa el ancho del cero en la fuente del widget, así que el tamaño real cambia si cambias la fuente.

> [!nota] Cómo salir de la duda en dos segundos
>
> No hace falta memorizar la tabla. Cuando no sepas en qué unidad mide un widget, créalo, llama a `update_idletasks()` y pregunta por `winfo_reqwidth()`. Si con `width=10` te devuelve algo cercano a 10, son píxeles; si te devuelve bastante más, son caracteres. Es el mismo truco de usar `configure()` para descubrir opciones que viste en la lección del sistema de widgets.

## Todo junto

Una ficha de empleado con su paleta y sus fuentes definidas arriba, que es la forma en que conviene escribir cualquier interfaz:

```python title="ficha.py"
"""Ficha de empleado: paleta y fuentes definidas una vez, arriba del todo."""

import tkinter as tk
from tkinter import font

FONDO = "#FFFFFF"
TARJETA = "#F2F2F7"
TINTA = "#1C1C1E"
TENUE = "#6E6E73"
ACENTO = "#2F7BD6"
BORDE = "#D1D1D6"

EMPLEADO = {
    "nombre": "Ana Torres",
    "puesto": "Desarrolladora de backend",
    "correo": "ana.torres@example.com",
    "antiguedad": "Desde marzo de 2021",
}


def construir_fuentes():
        """Fuentes derivadas de las del sistema, para respetar sus preferencias."""
    base = font.nametofont("TkDefaultFont")
    return {
        "nombre": font.Font(family=base.cget("family"), size=18, weight="bold"),
        "puesto": font.Font(family=base.cget("family"), size=13),
        "dato": font.Font(family=base.cget("family"), size=11),
        "fija": font.nametofont("TkFixedFont"),
    }


ventana = tk.Tk()
ventana.title("Ficha")
ventana.configure(bg=FONDO)
ventana.geometry("420x260")
ventana.minsize(360, 220)

fuentes = construir_fuentes()

tarjeta = tk.Frame(ventana, bg=TARJETA, highlightbackground=BORDE,
                   highlightthickness=1, padx=24, pady=20)
tarjeta.pack(fill="both", expand=True, padx=16, pady=16)

tk.Label(tarjeta, text=EMPLEADO["nombre"], font=fuentes["nombre"],
         bg=TARJETA, fg=TINTA, anchor="w").pack(fill="x")

tk.Label(tarjeta, text=EMPLEADO["puesto"], font=fuentes["puesto"],
         bg=TARJETA, fg=ACENTO, anchor="w").pack(fill="x", pady=(2, 12))

tk.Frame(tarjeta, bg=BORDE, height=1).pack(fill="x", pady=(0, 12))

tk.Label(tarjeta, text=EMPLEADO["correo"], font=fuentes["fija"],
         bg=TARJETA, fg=TINTA, anchor="w").pack(fill="x")

tk.Label(tarjeta, text=EMPLEADO["antiguedad"], font=fuentes["dato"],
         bg=TARJETA, fg=TENUE, anchor="w").pack(fill="x", pady=(4, 0))

ventana.mainloop()
```

En pantalla queda una tarjeta gris claro sobre fondo blanco, con el nombre grande en negro, el puesto en azul debajo, una línea de separación y los dos datos secundarios, el correo con la fuente de ancho fijo del sistema y la antigüedad en gris.

Tres cosas de ese programa son las que conviene copiar. Que los seis colores están arriba y no se repiten literales por el código. Que las fuentes se derivan de `TkDefaultFont` en vez de escribir `"Helvetica"` a mano, así que en Windows saldrá Segoe UI sin tocar nada. Y que la separación es un `Frame` de un píxel de alto pintado del color del borde, que es el truco habitual para una línea divisoria cuando no quieres el aspecto tridimensional del separador clásico.

> [!resumen] En resumen
>
> Tk acepta colores por nombre simbólico, en hexadecimal con cuatro longitudes distintas y con nombres del sistema, y `winfo_rgb()` traduce cualquiera de ellos a tres componentes de 0 a 65535, que se pasan al rango habitual dividiendo entre 257; eso permite calcular la luminancia y deducir si el tema es claro u oscuro sin preguntar al sistema operativo. Las fuentes se pueden dar como tupla, como cadena o como objeto `Font`, y este último es el recomendable porque lo comparten todos los widgets que lo usan y cambiarlo los cambia a todos. Un tamaño positivo son puntos y uno negativo son píxeles, que no es un tamaño negativo sino otra unidad. Lo más sensato es no elegir fuente: usar las que tienen nombre, como `TkDefaultFont` o `TkFixedFont`, hace que la aplicación adopte la letra del sistema y respete las preferencias de accesibilidad, y modificar una de ellas cambia la aplicación entera de una vez. Una familia inexistente no da error, Tk sustituye en silencio, así que conviene comprobar con `actual()`. `metrics()` da las medidas verticales de la fuente y `measure()` dice cuántos píxeles ocupa un texto antes de dibujarlo, que es lo que permite ajustar anchos de columna. Las medidas son píxeles si son un número, y con sufijo pueden ser centímetros, milímetros, pulgadas o puntos, traducibles con `winfo_fpixels()`. Y `width` mide en caracteres en los widgets de texto y en píxeles en los contenedores y el lienzo, una incoherencia que se resuelve en dos segundos creando el widget y preguntándole su tamaño pedido.

> [!ejercicio] Practica
>
> Trabaja en un fichero `07-aspecto.py` salvo donde se indique otra cosa:
>
> 1. Escribe un programa que imprima cuántas familias de fuentes hay instaladas en tu equipo y las liste ordenadas, descartando las que empiezan por punto. Compara el número con el de la lección.
> 2. Imprime el `actual()` de las ocho fuentes con nombre que empiezan por `Tk` y anota qué familia y qué tamaño usa cada una en tu sistema.
> 3. Crea una ventana con seis etiquetas y haz que todas usen `TkDefaultFont`. Añade dos botones que aumenten y reduzcan su tamaño modificando la fuente con nombre, y comprueba que las seis cambian sin tocarlas una por una.
> 4. Escribe en `07-medidas.py` un programa que imprima a cuántos píxeles equivalen una pulgada, un centímetro y diez puntos en tu pantalla, y el valor del escalado. Comprueba si la cuenta del escalado por 72 coincide con la pulgada.
> 5. Comprueba por tu cuenta la tabla de unidades de `width`: crea un `Label`, un `Entry`, un `Frame` y un `Canvas`, todos con `width=10`, y compara sus `winfo_reqwidth()` después de un `update_idletasks()`.
> 6. Coge la `ficha.py` de la lección y añádele una segunda paleta para modo oscuro, eligiendo entre las dos con la función `es_oscuro` del principio de la lección aplicada al fondo que reporta el tema.
