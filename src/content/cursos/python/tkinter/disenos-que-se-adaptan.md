---
titulo: "Diseños que se adaptan"
resumen: "La disciplina de que una ventana aguante cualquier tamaño: quién crece, cómo diagnosticar un redimensionado roto y qué mínimos poner."
minutos: 17
orden: 12
---

Las cuatro lecciones anteriores han explicado las herramientas. Esta explica la disciplina, que es lo que separa una interfaz que funciona de una que solo funciona en el equipo de quien la escribió.

El problema es fácil de enunciar. Tú montas la ventana a un tamaño, la ves bien y das el trabajo por hecho. Pero esa ventana se va a abrir en una pantalla de otra resolución, con otro tamaño de fuente del sistema, en otro idioma cuyos textos son más largos, y quien la use la va a agrandar, a encoger y a maximizar. **Un diseño no está terminado hasta que aguanta todo eso.**

La buena noticia es que no hace falta nada nuevo: con `expand`, `fill`, `sticky` y el peso ya tienes todo. Lo que falta es el criterio para aplicarlos y un método para diagnosticar cuando no funcionan.

> [!objetivo] Qué vas a aprender
>
> Decidir qué zonas de una ventana crecen y cuáles no, aplicar la regla de configurar el reparto en todos los niveles del árbol, poner mínimos que protejan el diseño, diagnosticar un redimensionado roto con un método ordenado, y conocer los recursos para que el contenido se adapte además del contenedor.

## Qué se adapta y qué no

El primer error es querer que todo crezca. En una ventana bien diseñada, **la mayoría de las cosas mantienen su tamaño** y solo una o dos absorben el cambio.

La pregunta que hay que hacerse zona por zona es sencilla: si la ventana midiera el doble, ¿tendría sentido que esto midiera el doble?

| Zona | ¿Crece? | Por qué |
| --- | --- | --- |
| Barra de herramientas | No a lo alto, sí a lo ancho | Los botones no mejoran siendo más altos |
| Barra de estado | Igual | Una línea de texto es una línea de texto |
| Panel lateral de navegación | No a lo ancho, sí a lo alto | Los nombres de las secciones no cambian |
| Fila de botones de un diálogo | No | Un botón enorme no es mejor botón |
| Etiquetas de un formulario | No | El texto es el que es |
| Campos de un formulario | Sí a lo ancho | Más ancho significa ver más de lo escrito |
| Tabla, lista, área de texto, lienzo | Sí, en las dos | Más espacio significa ver más datos |

Sale un patrón claro: **crece lo que muestra datos de tamaño variable, y no crece lo que muestra controles**. Con eso resuelto, casi siempre queda una sola zona que se lleva el crecimiento.

## La regla de los tres niveles

Un redimensionado se configura en tres sitios a la vez, y olvidar uno es el fallo habitual.

**Uno, la ventana tiene que permitirlo.** Si le has puesto `resizable(False, False)`, no hay nada que hablar.

**Dos, cada contenedor tiene que repartir su espacio.** Esto es lo que se olvida, porque hay que hacerlo en cada nivel del árbol. El peso y la expansión **no se heredan**: que la ventana le dé todo el espacio a un marco no significa que ese marco se lo dé a su contenido.

**Tres, cada widget tiene que ocupar el espacio que le dan.** Una celda que crece con un widget centrado dentro sigue viéndose mal.

Los dos últimos puntos se expresan distinto según el gestor, y conviene tener la equivalencia a mano:

|  | Dar espacio a la zona | Ocuparlo |
| --- | --- | --- |
| `pack` | `expand=True` en el widget | `fill="both"` en el widget |
| `grid` | `weight=1` en la fila o columna del contenedor | `sticky="nsew"` en el widget |

Fíjate en la asimetría: en `pack` las dos cosas se piden en la misma llamada, y en `grid` una se le pide al contenedor y la otra al widget. Es la causa de la mitad de las confusiones.

## El método de diagnóstico

Cuando el redimensionado no funciona, no hay que adivinar. Hay un recorrido que encuentra el problema siempre, y va **de fuera hacia dentro**.

Empieza por la ventana y baja nivel por nivel. En cada nivel, hazte las dos preguntas: ¿este contenedor reparte espacio hacia sus hijos? ¿Este hijo ocupa el espacio que recibe? El nivel en el que la respuesta sea que no es el nivel roto.

Para verlo en lugar de razonarlo, el truco de los colores de la lección anterior es lo más rápido: pinta cada marco de un color, agranda la ventana y mira qué color deja de crecer. Ese es el nivel del problema.

Estos son los cuatro fallos que cubren casi todos los casos:

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| Todo se queda arriba a la izquierda y aparece un hueco gris | Nadie reclama el espacio sobrante | Un `expand=True`, o un `weight=1` en fila y columna |
| La zona crece pero el widget de dentro sigue pequeño y centrado | Falta ocupar el espacio recibido | `fill="both"` o `sticky="nsew"` |
| El marco exterior crece y su contenido no | Falta el reparto en el nivel interior | Configurar peso o expansión también dentro del marco |
| Todo crece a la vez y el diseño se deforma | Demasiadas zonas con peso | Quitar peso a las que no deben crecer |

> [!aviso] El peso reparte, no obliga a llenar
>
> Merece repetirse porque es lo que más cuesta interiorizar. `columnconfigure(1, weight=1)` hace que la **columna** crezca. El widget que hay dentro de esa columna no crece por eso: sigue de su tamaño natural, ahora centrado en una celda más grande.
>
> Las dos cosas son necesarias y son independientes. Una sin la otra produce dos síntomas distintos, y saber distinguirlos es la mitad del diagnóstico.

## Los mínimos, que son la red de seguridad

Adaptarse no es solo crecer bien: es también no romperse al encoger. Y encoger es donde más se rompen las interfaces, porque nadie lo prueba.

La protección de base es la de la lección 4, y debería estar en todos tus programas:

```python
ventana.minsize(480, 360)
```

Elegir ese número tiene un método. Monta la ventana, encógela a mano hasta el punto justo antes de que algo empiece a verse mal, mira qué tamaño tiene y usa ese. Se puede comprobar imprimiendo la geometría:

```python
ventana.bind("<Configure>", lambda evento: print(ventana.geometry()))
```

Esa línea imprime el tamaño cada vez que cambia mientras arrastras el borde. Es una herramienta de desarrollo, no algo que se deje en el programa final. El evento `<Configure>` y el mecanismo de `bind` tienen su lección en el bloque de interacción; aquí se usa como instrumento de medida y ya está.

Además del mínimo global, `grid` permite mínimos por fila y por columna, que son más finos:

```python
marco.columnconfigure(0, minsize=120)
```

Eso reserva 120 píxeles para la columna de las etiquetas pase lo que pase, lo que impide que los textos se recorten cuando la ventana se estrecha. Es especialmente útil cuando el programa se va a traducir, porque los mismos textos en alemán ocupan bastante más.

## Que el contenido también se adapte

Hasta aquí todo iba de contenedores. Hay además unos cuantos recursos para que el contenido reaccione, y conviene conocerlos.

**`wraplength` en las etiquetas.** Por defecto una etiqueta es una sola línea, larguísima si el texto es largo, y fuerza a la ventana a ser ancha. Con `wraplength` se le da un ancho en píxeles a partir del cual parte el texto en varias líneas:

```python
ttk.Label(marco, text=texto_largo, wraplength=320, justify="left")
```

**`wrap="word"` en las áreas de texto**, que es lo que hace que un `Text` parta por palabras en vez de dejar una línea infinita con barra de desplazamiento horizontal.

**Barras de desplazamiento**, que son la respuesta honesta cuando el contenido simplemente no cabe. Tienen su lección en el bloque de widgets, pero el criterio es de diseño: antes de estrujar el contenido para que quepa, plantéate si lo correcto no es permitir desplazarse.

**Anchos en caracteres.** Como viste en la lección 7, el `width` de los widgets de texto se mide en caracteres, y eso ya es una forma de adaptación: un `Entry` con `width=30` mide más píxeles si el sistema usa una fuente grande, que es exactamente lo que hace falta.

> [!consejo] Prueba siempre en los tres tamaños
>
> Antes de dar por terminada una ventana, ábrela y haz tres cosas: maximízala, encógela hasta el mínimo y déjala en un tamaño intermedio raro. Tres segundos, y ahí salen casi todos los fallos de colocación.
>
> Si puedes, prueba también con el tamaño de fuente del sistema aumentado, que es donde se rompen los diseños que asumen medidas en píxeles.

## Ventanas que recuerdan su tamaño

Un detalle pequeño que se agradece mucho: que la aplicación se abra donde y como estaba la última vez. Con lo visto ya se puede hacer, porque `geometry()` sin argumentos devuelve la cadena completa y `geometry(cadena)` la restaura.

```python title="recordar.py"
"""Una ventana que recuerda su tamaño y su posición entre sesiones."""

import json
import tkinter as tk
from pathlib import Path
from tkinter import ttk

AJUSTES = Path("ventana.json")


def cargar(ventana):
        """Restaura la geometría guardada, si existe y es razonable."""
    if not AJUSTES.exists():
                ventana.geometry("640x420")
        return
    try:
                datos = json.loads(AJUSTES.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
                ventana.geometry("640x420")
        return
    ventana.geometry(datos.get("geometria", "640x420"))


def guardar(ventana):
        """Escribe la geometría actual y cierra."""
    AJUSTES.write_text(
        json.dumps({"geometria": ventana.geometry()}, indent=2),
        encoding="utf-8",
    )
    ventana.destroy()


ventana = tk.Tk()
ventana.title("Recuerda su tamaño")
ventana.minsize(420, 300)

marco = ttk.Frame(ventana, padding=12)
marco.pack(fill="both", expand=True)

ttk.Label(marco, text="Redimensiona, cierra y vuelve a abrir.").grid(
    row=0, column=0, columnspan=2, sticky="w", pady=(0, 12))

ttk.Label(marco, text="Notas:").grid(row=1, column=0, sticky="nw")
notas = tk.Text(marco, wrap="word", height=8)
notas.grid(row=1, column=1, sticky="nsew", padx=(8, 0))

marco.columnconfigure(1, weight=1)
marco.rowconfigure(1, weight=1)

cargar(ventana)
ventana.protocol("WM_DELETE_WINDOW", lambda: guardar(ventana))
ventana.mainloop()
```

Ciérralo con la ventana agrandada y vuelve a abrirlo: aparece igual que la dejaste. Reconocerás tres cosas de lecciones anteriores. El cierre interceptado con `protocol`, que garantiza que el guardado ocurre por el único camino de salida. El manejo de errores al leer el fichero, que viene del módulo 1 y evita que un JSON corrupto impida abrir el programa. Y el reparto con peso y `sticky` bien puestos, que es lo que hace que el área de notas absorba el redimensionado.

> [!aviso] Restaurar una posición guardada tiene un riesgo
>
> Si alguien usó tu programa con un monitor externo y lo cerró con la ventana en esa segunda pantalla, la posición guardada puede caer fuera de las pantallas disponibles la próxima vez. El programa arranca, no da ningún error y la ventana no se ve por ninguna parte.
>
> Lo prudente es guardar solo el tamaño, o comprobar al restaurar que la posición cae dentro de `winfo_screenwidth()` y `winfo_screenheight()` y descartarla si no. Es un detalle pequeño que evita un fallo desesperante de diagnosticar.

## El resumen operativo del bloque

Las cinco lecciones de colocación se condensan en una lista corta que conviene tener presente al montar cualquier ventana:

1. Divide la ventana en zonas antes de escribir código, y decide para cada una si crece.
2. Usa `pack` para las franjas y `grid` para todo lo demás.
3. Un solo gestor por contenedor, y un `Frame` por medio cuando hagan falta dos.
4. Configura el reparto en **todos** los niveles, porque no se hereda.
5. Acompaña siempre el reparto con `fill` o `sticky`, o la zona crecerá vacía.
6. Pon un `minsize` a la ventana y mínimos a las columnas que lo necesiten.
7. Prueba maximizado, al mínimo y en medio antes de darlo por bueno.

> [!resumen] En resumen
>
> Un diseño adaptable no es el que hace crecer todo, sino el que decide conscientemente qué crece: crecen las zonas que muestran datos de tamaño variable, como tablas, listas y áreas de texto, y no crecen los controles ni las etiquetas. Configurar el redimensionado exige tres cosas a la vez: que la ventana lo permita, que cada contenedor reparta su espacio y que cada widget ocupe el que recibe; y como el reparto no se hereda, hay que configurarlo en todos los niveles del árbol. En `pack` esas dos últimas se piden juntas con `expand` y `fill`, mientras que en `grid` el peso se le pide al contenedor y el `sticky` al widget, que es de donde viene casi toda la confusión. Cuando algo no funciona, el diagnóstico se hace de fuera hacia dentro preguntando en cada nivel si reparte y si ocupa, y los cuatro síntomas típicos identifican la causa sin adivinar. Los mínimos son la otra mitad del trabajo, porque encoger rompe más que agrandar: un `minsize` en la ventana siempre, y `minsize` por columna donde el texto no deba recortarse. El contenido tiene además sus propios recursos, como `wraplength` en las etiquetas, `wrap="word"` en las áreas de texto y las barras de desplazamiento cuando algo simplemente no cabe. Y con `geometry()` en sus dos formas se consigue que la ventana recuerde su tamaño entre sesiones, cuidando de no restaurar una posición que caiga fuera de las pantallas disponibles.

> [!ejercicio] Practica
>
> Trabaja en un fichero `12-adaptable.py` salvo donde se indique otra cosa:
>
> 1. Coge el `bloques.py` de la lección anterior y provoca los cuatro síntomas de la tabla de diagnóstico, uno por uno. Guarda cada versión rota con su nombre y anota qué línea lo causaba.
> 2. Añade a una ventana la línea que imprime la geometría en cada `<Configure>`, encógela hasta que algo se vea mal y usa ese tamaño como `minsize`.
> 3. Escribe en `12-tres-zonas.py` una ventana con tres paneles en horizontal donde el del medio crezca el doble que los otros dos al agrandar. Necesitarás pesos distintos.
> 4. Monta un formulario con etiquetas largas y comprueba qué pasa al estrechar la ventana. Arréglalo con `minsize` en la columna de las etiquetas y comprueba la diferencia.
> 5. Coge el `recordar.py` de la lección y añádele la comprobación de que la posición restaurada cae dentro de la pantalla, descartándola si no. Pruébalo escribiendo a mano una posición imposible en el JSON.
> 6. Elige una aplicación que uses a diario, redimensiónala de grande a pequeña y anota qué zonas crecen, cuáles no y qué mínimo parece tener. Reprodúcelo con marcos de colores, sin contenido real, solo la estructura.
