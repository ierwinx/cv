---
titulo: "Eventos y bind"
resumen: "Los cuatro niveles por los que pasa un evento y el que no está en la cadena, el bind que borra el anterior sin avisar, los campos que valen '??' en vez de None, y el event_generate que no espera."
minutos: 24
orden: 34
---

La lección anterior cubrió la mitad de la interacción: las variables, que son los datos. Esta cubre la otra: los eventos, que son los gestos. Y aunque `bind` ha aparecido en casi todas las lecciones del bloque C, siempre ha sido en su forma más simple, atando una cosa a un widget. Lo que falta es el sistema que hay debajo, que tiene cuatro niveles y varias decisiones de diseño que explican comportamientos raros que quizá ya has visto.

De las cuatro cosas que trae esta lección, dos son trampas de las que cuestan una tarde: un `bind` que borra el anterior sin decir nada, y unos campos del evento que parecen vacíos y no lo están.

> [!objetivo] Qué vas a aprender
>
> Entender los cuatro niveles por los que pasa un evento y en qué orden, que es lo que decide dónde hay que atar cada cosa; acumular manejadores sin perder los anteriores; leer el objeto `Event` sin caer en el valor que finge estar vacío; crear eventos virtuales propios y saber por qué conviene; y tener claro cuándo se usa `bind` y cuándo un `command`.

## Cómo se escribe una secuencia

Una secuencia tiene tres partes entre ángulos, y solo la del medio es obligatoria:

```texto title="codigo"
<Modificador-Tipo-Detalle>
```

```python
ventana.bind("<Button-1>", manejador)            # tipo y detalle
ventana.bind("<Control-s>", manejador)           # modificador y detalle
ventana.bind("<Control-Shift-Key-S>", manejador) # dos modificadores
ventana.bind("<Double-Button-1>", manejador)     # Double es un modificador
ventana.bind("<<Copy>>", manejador)              # evento virtual, doble ángulo
```

Los tipos más usados son `Button`, `ButtonRelease`, `Motion`, `Key`, `KeyRelease`, `Enter`, `Leave`, `FocusIn`, `FocusOut`, `Configure` y `Destroy`; la lección siguiente entra a fondo en los de teclado y ratón. Y lo que va con doble ángulo es un **evento virtual**, que tiene su sección más abajo.

## Los cuatro niveles, y el que no está

Cuando ocurre un evento, Tk no llama a un solo manejador: recorre una cadena de cuatro niveles.

```consola
>>> boton.bind("<<Prueba>>", lambda e: orden.append("1-widget"))
>>> ventana.bind_class("TButton", "<<Prueba>>", lambda e: orden.append("2-clase"))
>>> ventana.bind("<<Prueba>>", lambda e: orden.append("3-ventana"))
>>> ventana.bind_all("<<Prueba>>", lambda e: orden.append("4-all"))
>>> boton.event_generate("<<Prueba>>")
>>> orden
['1-widget', '2-clase', '3-ventana', '4-all']
```

El orden es **widget, clase, ventana, todos**, y cada nivel se ata con su método: `bind`, `bind_class`, `bind` sobre la ventana y `bind_all`.

Ese orden explica una cosa que ya has visto funcionar. En la lección 15, un `Entry` respondía al teclado sin que nadie hubiera atado nada: eso es el nivel de **clase**, donde Tk pone el comportamiento de fábrica de cada tipo de widget. Y en la 31 vimos que ese mismo nivel es el que hace funcionar Cmd+V. Cuando atas algo al widget, tu manejador se ejecuta **antes** que el de la clase, lo que da la oportunidad de cancelarlo.

> [!aviso] El contenedor padre no está en la cadena
>
> Esto es lo que rompe las expectativas de cualquiera que venga de la web, donde los eventos suben por todos los antepasados:
>
> ```consola
> >>> marco = ttk.Frame(ventana)
> >>> boton = ttk.Button(marco, text="b")
> >>> marco.bind("<<Prueba>>", lambda e: orden.append("padre"))
> >>> boton.bind("<<Prueba>>", lambda e: orden.append("widget"))
> >>> boton.event_generate("<<Prueba>>")
> >>> orden
> ['widget']
> ```
>
> **El `Frame` que contiene al botón no recibe nada.** En Tk no hay burbujeo por la jerarquía: los niveles son esos cuatro y ninguno más, y el tercero es la **ventana** de nivel superior, no el padre inmediato. Si el botón está dentro de tres marcos anidados, ninguno de los tres se enterará.
>
> La consecuencia práctica: no se puede atar algo a un contenedor esperando recogerlo de todos sus hijos. Para eso está `bind_all`, que es global, o atar a cada hijo, o `bind_class` si lo que quieres vale para todos los widgets de un tipo.

Y la cadena se puede cortar:

```consola
>>> boton.bind("<<Corta>>", lambda e: (orden.append("widget"), "break")[1])
>>> ventana.bind_all("<<Corta>>", lambda e: orden.append("all"))
>>> boton.event_generate("<<Corta>>")
>>> orden
['widget']
```

**Devolver la cadena `"break"` desde un manejador detiene el recorrido.** Es lo que hay que hacer cuando quieres sustituir el comportamiento de fábrica de un widget en vez de añadirle algo: atas al nivel del widget, haces lo tuyo y devuelves `"break"` para que el manejador de la clase no se ejecute. Sin el `"break"`, las dos cosas pasan.

## El `bind` que borra el anterior

> [!error] Un segundo `bind` sobre la misma secuencia sustituye al primero
>
> ```consola
> >>> boton.bind("<<Suma>>", lambda e: cuenta.append("primera"))
> >>> boton.bind("<<Suma>>", lambda e: cuenta.append("segunda"))
> >>> boton.event_generate("<<Suma>>")
> >>> cuenta
> ['segunda']
> ```
>
> La primera ha desaparecido. Sin error, sin aviso, y sin nada en la consola.
>
> Esto es un problema real en cuanto un programa crece, porque los dos `bind` casi nunca están juntos: uno lo pone la función que crea el widget y el otro una función de más abajo que añade un comportamiento, y el resultado es que algo deja de funcionar sin motivo aparente. Es especialmente traicionero con `bind_all`, porque ahí el «anterior» puede ser de otra parte del programa: en la lección 24, el patrón de la rueda del ratón usaba `bind_all` y había que tener cuidado precisamente por esto.
>
> La solución es un argumento:
>
> ```consola
> >>> boton.bind("<<Suma>>", primera)
> >>> boton.bind("<<Suma>>", segunda, add="+")
> >>> boton.event_generate("<<Suma>>")
> >>> cuenta
> ['primera', 'segunda']
> ```
>
> **`add="+"` acumula en vez de sustituir**, y con él los dos se ejecutan en orden de registro (al contrario que las trazas de la lección anterior, que van del revés). La regla sana: si el widget no es tuyo, o si el `bind` está lejos de donde se creó el widget, **siempre `add="+"`**.

Para quitar un manejador concreto hace falta el identificador que devuelve `bind`:

```consola
>>> identificador = boton.bind("<<Quita>>", primera, add="+")
>>> identificador
'4462187264<lambda>'
>>> boton.bind("<<Quita>>", segunda, add="+")
>>> boton.unbind("<<Quita>>", identificador)   # quita solo esa
>>> boton.unbind("<<Quita>>")                  # quita todas
>>> boton.bind()
()
```

Y `bind()` sin argumentos dice qué hay atado en ese widget, que es la primera cosa que mirar cuando algo no responde.

## El objeto `Event`

Todo manejador recibe un argumento, y no es opcional:

```consola
>>> marco.bind("<<Sin>>", lambda: None)
>>> marco.event_generate("<<Sin>>")
TypeError: <lambda>() takes 0 positional arguments but 1 was given
```

Ese error aparece en la consola y **no detiene el programa**, igual que las excepciones de las trazas de la lección 33. De ahí el `lambda evento: ...` y el `def manejador(evento=None)` que usan todos los ejemplos del curso: con el valor por omisión, la misma función sirve para un `bind` y para una llamada directa.

Lo que trae el objeto:

| Campo | Qué es |
| --- | --- |
| `widget` | El widget donde ocurrió. **El objeto, no su nombre.** |
| `x`, `y` | Posición dentro del widget. |
| `x_root`, `y_root` | Posición en la pantalla. La que quiere `tk_popup`, lección 32. |
| `char` | El carácter escrito, para eventos de teclado. |
| `keysym` | El nombre de la tecla (`'Return'`, `'a'`, `'F1'`). |
| `keycode` | El código físico de la tecla. Depende del teclado; casi nunca se usa. |
| `num` | El número del botón del ratón. |
| `delta` | El giro de la rueda, lección 24. |
| `state` | Los modificadores pulsados, como número. Lección 35. |
| `width`, `height` | El tamaño nuevo, en un `<Configure>`. |
| `type` | El tipo de evento. |
| `time`, `serial` | Marca de tiempo y número de serie. Útiles para detectar repeticiones. |

> [!error] Los campos que no aplican no valen `None`
>
> Esto cuesta una tarde la primera vez. En un evento virtual, o en uno de ratón, los campos de teclado no están vacíos: contienen la cadena `'??'`.
>
> ```consola
> >>> evento.char
> '??'
> >>> evento.keysym
> '??'
> >>> evento.num
> '??'
> >>> evento.x_root
> -1
> ```
>
> O sea que **`if evento.char:` es verdadero**, porque `'??'` es una cadena de dos caracteres perfectamente cierta. Un manejador que haga `if evento.char: escribir(evento.char)` escribirá dos interrogaciones en vez de no hacer nada.
>
> Las comprobaciones correctas son explícitas:
>
> ```python
> if evento.char and evento.char != "??":
>         ...
> ```
>
> Y mejor todavía, no comprobar: si necesitas el carácter, ata un evento de teclado, donde siempre viene. Los `'??'` aparecen cuando se lee un campo que no corresponde al tipo de evento, y eso suele ser señal de que el manejador está atado a la secuencia equivocada.
>
> Las coordenadas usan `-1` para lo mismo, así que tampoco sirve un `if not evento.x_root`.

Y un detalle del `type`, por si lo comparas alguna vez:

```consola
>>> evento.type
<EventType.VirtualEvent: '35'>
>>> str(evento.type), int(evento.type)
('35', 35)
```

Es un miembro de una enumeración, no un número ni un nombre. Se compara bien con la cadena del número o con el propio miembro de `tk.EventType`, y mal con el nombre en texto.

## Eventos virtuales

Un evento virtual es un **nombre propio para un gesto**, y se escribe con doble ángulo. Tk trae treinta y tres de serie:

```consola
>>> len(ventana.event_info())
33
>>> sorted(str(x) for x in ventana.event_info())[:6]
['<<Clear>>', '<<ContextMenu>>', '<<Copy>>', '<<Cut>>', '<<LineEnd>>', '<<Paste>>']
```

Ya has usado varios: `<<ListboxSelect>>`, `<<TreeviewSelect>>`, `<<NotebookTabChanged>>`, `<<Increment>>`, `<<ContextMenu>>`, `<<Copy>>`. Y ya has visto por qué existen: en la lección 32, `<<ContextMenu>>` evitaba adivinar el número del botón derecho, y en la 31, `<<Paste>>` era la razón de no atar `Cmd+V` a mano.

Los propios se crean con `event_add`, y se les pueden dar varias secuencias:

```consola
>>> ventana.event_add("<<Guardado>>", "<Control-Shift-S>", "<F2>")
>>> ventana.event_info("<<Guardado>>")
('<Control-Shift-Key-S>', '<Key-F2>')
```

Con eso, un solo `bind` al evento virtual atiende las dos teclas, y cambiar el atajo del programa es cambiar una línea en vez de buscar todos los `bind`. **Es el sitio correcto para declarar los atajos de un programa**, y encaja con el problema de la lección 31: si las teclas están declaradas en un solo lugar, el texto del `accelerator` del menú se puede generar de ahí.

## `event_generate` no espera

Los eventos se pueden lanzar desde el código, que es lo que usan todas las pruebas de este curso. Pero hay que saber cuándo se ejecuta el manejador:

```consola
>>> huellas.append("antes")
>>> marco.event_generate("<<Ya>>")
>>> huellas.append("después")
>>> huellas
['antes', 'manejador', 'después']
```

**Es síncrono**: el manejador corre dentro de la llamada, antes de la línea siguiente. Eso es cómodo para probar, y es una trampa si el manejador toca lo mismo que la función que lo lanza.

Si lo que quieres es «cuando te venga bien», hay un argumento:

```consola
>>> huellas.append("antes")
>>> marco.event_generate("<<Ya>>", when="tail")
>>> huellas.append("después")
>>> huellas
['antes', 'después']
>>> ventana.update()
>>> huellas
['antes', 'después', 'manejador']
```

`when="tail"` lo pone al final de la cola, que es lo que suele querer un programa que avisa a otra parte de sí mismo.

## `bind` o `command`

La pregunta aparece en cuanto uno descubre `bind`, porque un `<Button-1>` sobre un botón parece hacer lo mismo que su `command`. No es lo mismo:

```consola
>>> boton = ttk.Button(ventana, text="z", command=marcar_command)
>>> boton.bind("<Button-1>", marcar_bind)
>>> boton.invoke()
['command']
```

El `command` es la **acción del widget**, y se dispara de todas las formas en que ese widget se puede activar: el ratón, la barra espaciadora, `invoke()` desde el código. El `bind` de `<Button-1>` solo atiende ese clic concreto, así que un botón con la acción en un `bind` deja de funcionar con el teclado, lo que rompe la accesibilidad sin que se note en las pruebas manuales.

La regla, que cierra el reparto de las tres lecciones:

- **`command`** para la acción de un widget que la tiene: botones, casillas, entradas de menú.
- **`trace_add`** para reaccionar a un dato, venga de donde venga (lección 33).
- **`bind`** para todo lo demás: teclas, ratón, foco, cambios de tamaño, y para los eventos virtuales de los widgets que no tienen `command`, como el `Listbox` y el `Treeview`.

## El ejemplo

Un inspector de eventos, que es la herramienta más útil que se puede escribir para aprender esto: enseña en vivo qué llega y por qué nivel.

```python title="eventos.py"
"""Inspector de eventos: los cuatro niveles y lo que trae cada evento."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
AZUL = "#1565C0"

MAX_LINEAS = 200

# Los campos que se muestran, con lo que significa cada uno.
CAMPOS = ("widget", "x", "y", "x_root", "y_root", "char", "keysym",
          "keycode", "num", "delta", "state", "width", "height")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def vale(valor):
        """Un campo que no aplica vale '??' o -1, nunca None.

    Por esto `if evento.char:` es verdadero incluso sin carácter: '??' es
    una cadena de dos caracteres y por tanto cierta.
    """
    return valor not in ("??", -1)


def describir(evento):
        """Solo los campos que traen algo de verdad."""
    partes = []
    for campo in CAMPOS:
                valor = getattr(evento, campo, "??")
        if not vale(valor):
                        continue
        if campo == "widget":
                        valor = type(valor).__name__
        partes.append(f"{campo}={valor}")
    return " ".join(partes)


def apuntar(nivel, evento):
        """Escribe una línea en el registro."""
    registro.configure(state="normal")       # lección 16: disabled ignora insert
    registro.insert("end", f"{nivel:<10} {str(evento.type):>3} "
                           f"{describir(evento)}\n", nivel)
    registro.see("end")
    # index("end-1c") da la última línea con contenido, lección 16.
    sobran = int(registro.index("end-1c").split(".")[0]) - MAX_LINEAS
    if sobran > 0:
                registro.delete("1.0", f"{sobran + 1}.0")
    registro.configure(state="disabled")
    cuenta[nivel] = cuenta.get(nivel, 0) + 1
    resumen.set("  ".join(f"{n}: {c}" for n, c in sorted(cuenta.items())))


def crear_diana(contenedor):
        """El widget sobre el que se prueba, dentro de dos marcos anidados.

    Sirve para comprobar que los marcos padres NO reciben nada: en Tk no
    hay burbujeo por la jerarquía.
    """
    fuera = ttk.Labelframe(contenedor, text="Marco de fuera", padding=MARGEN)
    fuera.pack(fill="x")
    dentro = ttk.Frame(fuera, padding=MARGEN)
    dentro.pack(fill="x")

    diana = tk.Label(dentro, text="Pulsa, escribe o pasa por encima",
                     background=AZUL, foreground="white", padx=MARGEN,
                     pady=MARGEN * 2)
    diana.pack(fill="x")
    # takefocus para que también reciba teclado al pulsar sobre él.
    diana.configure(takefocus=True)
    return fuera, dentro, diana


def crear_registro(contenedor):
        """El Text donde se apunta todo, con un color por nivel."""
    caja = ttk.Frame(contenedor)
    caja.pack(fill="both", expand=True, pady=(MARGEN, 0))

    texto = tk.Text(caja, height=14, wrap="none", font=("Menlo", 11),
                    state="disabled", borderwidth=1, relief="solid",
                    highlightthickness=0)
    barra = ttk.Scrollbar(caja, orient="vertical", command=texto.yview)
    texto.configure(yscrollcommand=barra.set)      # las dos mitades
    barra.pack(side="right", fill="y")
    texto.pack(side="left", fill="both", expand=True)

    texto.tag_configure("widget", foreground=AZUL)
    texto.tag_configure("clase", foreground="#2E7D32")
    texto.tag_configure("ventana", foreground="#EF6C00")
    texto.tag_configure("all", foreground="#6A1B9A")
    texto.tag_configure("padre", foreground="#C2185B")
    return texto


def atar_niveles():
        """Los cuatro niveles sobre la misma secuencia, cada uno en su sitio.

    add='+' en todos: un segundo bind sobre la misma secuencia borra el
    anterior sin avisar, y aquí hay varios sobre el mismo widget.
    """
    for secuencia in ("<Button-1>", "<Key>", "<Enter>", "<Leave>"):
                diana.bind(secuencia, lambda e, s=secuencia: apuntar("widget", e),
                   add="+")
        ventana.bind(secuencia, lambda e: apuntar("ventana", e), add="+")
        # El marco padre: no recibirá nada, y es lo que se quiere demostrar.
        marco_fuera.bind(secuencia, lambda e: apuntar("padre", e), add="+")

    # El nivel de clase, que es donde Tk pone el comportamiento de fábrica.
    ventana.bind_class("Label", "<Button-1>",
                       lambda e: apuntar("clase", e), add="+")
    # Y el global, el único que recoge lo de cualquier widget.
    ventana.bind_all("<F1>", lambda e: apuntar("all", e), add="+")


def limpiar(evento=None):
        """Atado al evento virtual, no a la tecla: así el atajo se declara una vez."""
    registro.configure(state="normal")
    registro.delete("1.0", "end")
    registro.configure(state="disabled")
    cuenta.clear()
    resumen.set("Registro vacío")
    return "break"       # corta la cadena: nadie más necesita esta tecla


ventana = tk.Tk()
ventana.title("Inspector de eventos")
ventana.minsize(660, 520)

# Un evento virtual propio con dos secuencias: el sitio correcto para
# declarar los atajos de un programa.
ventana.event_add("<<Limpiar>>", "<Control-l>", "<Command-l>")

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
resumen = tk.StringVar(value="Registro vacío")
cuenta = {}

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

marco_fuera, marco_dentro, diana = crear_diana(cuerpo)
registro = crear_registro(cuerpo)

pie = ttk.Frame(cuerpo)
pie.pack(fill="x", pady=(MARGEN, 0))
ttk.Label(pie, textvariable=resumen, foreground=GRIS).pack(side="left")
ttk.Button(pie, text="Limpiar", command=limpiar).pack(side="right")

ttk.Label(cuerpo, foreground=GRIS, justify="left", wraplength=620,
          text="El marco padre nunca aparece en el registro: en Tk los "
               "eventos no suben por la jerarquía. F1 entra por bind_all "
               "desde cualquier widget. Ctrl+L o Cmd+L limpian.").pack(
    anchor="w", pady=(AIRE, 0))

atar_niveles()
ventana.bind_all("<<Limpiar>>", limpiar, add="+")

diana.focus_set()
centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Un evento recorre **cuatro niveles en este orden: widget, clase, ventana y todos**, atados con `bind`, `bind_class`, `bind` sobre la ventana y `bind_all`. El nivel de clase es donde Tk pone el comportamiento de fábrica de cada tipo de widget, y por eso tu `bind` al widget se ejecuta antes y puede cancelarlo devolviendo **`"break"`**, que detiene el recorrido. Lo que rompe las expectativas de quien viene de la web: **el contenedor padre no está en la cadena**, no hay burbujeo por la jerarquía, y el tercer nivel es la ventana de nivel superior y no el `Frame` que lo contiene; para recoger algo de todos los hijos hay que usar `bind_all`, atar a cada uno o usar `bind_class`. La trampa que cuesta una tarde: **un segundo `bind` sobre la misma secuencia borra el primero**, sin error y sin aviso, y como los dos casi nunca están juntos en el código, algo deja de funcionar sin motivo aparente; se arregla con **`add="+"`**, que acumula en orden de registro (al contrario que las trazas de la lección 33), y la regla sana es usarlo siempre que el `bind` esté lejos de donde se creó el widget. `bind` devuelve un identificador para `unbind`, y `bind()` sin argumentos dice qué hay atado, que es lo primero que mirar. Todo manejador recibe un argumento obligatorio, y si falta, el `TypeError` sale por la consola **sin detener el programa**. Del objeto `Event`, la trampa es que **los campos que no aplican valen `'??'` o `-1`, nunca `None`**, así que `if evento.char:` es verdadero y un manejador descuidado escribe dos interrogaciones; y `evento.type` es un miembro de una enumeración cuyo `str()` es el número. Los eventos virtuales son nombres propios para un gesto: Tk trae treinta y tres, y los propios se declaran con `event_add`, que acepta **varias secuencias para el mismo nombre**, lo que lo convierte en el sitio correcto para declarar los atajos de un programa y en la respuesta al problema de sincronizar el `accelerator` de la lección 31. `event_generate` es **síncrono**: el manejador corre dentro de la llamada, antes de la línea siguiente, salvo con `when="tail"`, que lo encola. Y el reparto queda cerrado: `command` para la acción de un widget que la tiene (se dispara también con el teclado y con `invoke()`, mientras un `bind` de `<Button-1>` solo atiende ese clic y rompe la accesibilidad), `trace_add` para reaccionar a un dato, y `bind` para teclas, ratón, foco, tamaño y los eventos virtuales de los widgets sin `command`.

> [!ejercicio] Practica
>
> Trabaja en un fichero `34-eventos.py` salvo donde se indique otra cosa:
>
> 1. Ata la misma secuencia a un widget, a su clase, a la ventana y con `bind_all`, y haz que cada manejador imprima su nivel. Comprueba el orden.
> 2. Mete el widget dentro de dos `Frame` anidados y ata la secuencia también a los dos marcos. Comprueba que no reciben nada y explica por qué.
> 3. Devuelve `"break"` desde el manejador del widget y mira qué niveles dejan de ejecutarse.
> 4. En `34-sustituye.py`, ata dos manejadores a la misma secuencia sin `add="+"`. Comprueba que solo corre el segundo. Añade `add="+"` y vuelve a probar.
> 5. Guarda el identificador que devuelve `bind` y quita solo ese manejador con `unbind`, dejando el otro. Después quítalos todos.
> 6. Imprime `widget.bind()` antes y después de atar cosas.
> 7. En `34-campos.py`, escribe un manejador de `<Button-1>` que imprima `evento.char`, `evento.keysym` y `evento.num`. Anota qué vale cada uno y comprueba que `if evento.char:` es verdadero.
> 8. Escribe un manejador de `<Key>` y compara los mismos tres campos con los del ejercicio anterior.
> 9. Ata un manejador con una `lambda` sin parámetros y mira dónde aparece el error y si el programa sigue.
> 10. Crea un evento virtual `<<Buscar>>` con dos secuencias distintas y comprueba con `event_info` que las dos están. Átalo una sola vez.
> 11. Llama a `event_generate` entre dos `print` y comprueba en qué orden salen. Repítelo con `when="tail"`.
> 12. Pon un botón con la acción en un `command` y otro con la acción en un `bind` de `<Button-1>`. Actívalos con el teclado (tabulador y barra espaciadora) y explica la diferencia.
