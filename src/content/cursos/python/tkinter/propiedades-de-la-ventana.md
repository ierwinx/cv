---
titulo: "Propiedades de la ventana"
resumen: "Título, tamaño, posición, icono, atributos y cierre controlado: todos los métodos de la clase Tk, con una plantilla de arranque al final."
minutos: 33
orden: 4
---

Una ventana recién creada con `tk.Tk()` sale pequeña, pegada a una esquina, con el título `tk` y con el icono genérico de Python. Funciona, pero tiene el aspecto de algo a medio hacer, y eso es lo primero que ve quien abre tu programa.

Arreglarlo cuesta unas pocas líneas, pero están repartidas en una decena de métodos con nombres poco evidentes y con comportamientos que cambian de un sistema operativo a otro. Esta lección es la referencia de esos métodos: qué hace cada uno, qué devuelve de verdad y qué esperar en macOS, en Windows y en Linux.

Al final hay una plantilla de arranque que junta todo, y que van a reutilizar el resto de las lecciones del módulo.

> [!objetivo] Qué vas a aprender
>
> Poner título, tamaño y posición a una ventana con `geometry` y su formato de cadena completo. Escribir una función `centrar` reutilizable y entender por qué necesita `update_idletasks`. Limitar el redimensionado, poner un icono, usar los atributos de pantalla completa, transparencia y ventana siempre encima, interceptar el cierre con `protocol` y distinguir `destroy` de `quit`.

## El título de la barra

```python
ventana.title("Gestor de gastos")
```

Sin argumentos devuelve el título actual. La costumbre en los editores es marcar con un asterisco que hay cambios sin guardar:

```python
ventana.title(f"{'*' if hay_cambios else ''}{nombre_fichero} - Gestor de gastos")
```

Ese título aparece en la barra de la ventana, en el conmutador de aplicaciones y en la barra de tareas. En macOS el nombre del menú de la aplicación lo decide el sistema, no este método.

## geometry: la cadena más rara de la API

`geometry()` controla el tamaño y la posición con una sola cadena de texto de formato propio. Viene heredada del gestor de ventanas de X11, donde es el estándar desde los años ochenta.

El formato completo es `"anchoxalto+x+y"`:

| Parte | Qué es | Unidad |
| --- | --- | --- |
| `ancho` | Anchura del área de contenido | Píxeles |
| `x` | Una `x` minúscula literal, de separador | — |
| `alto` | Altura del área de contenido | Píxeles |
| `+x` | Distancia del borde izquierdo de la ventana al de la pantalla | Píxeles |
| `+y` | Distancia del borde superior de la ventana al de la pantalla | Píxeles |

Lo que no es evidente es que **el tamaño y la posición son dos mitades independientes, y cada una se puede omitir**. Eso da tres formas válidas:

| Cadena | Qué hace |
| --- | --- |
| `"640x480+100+50"` | Fija el tamaño y la posición |
| `"640x480"` | Fija solo el tamaño y deja la ventana donde esté |
| `"+100+50"` | Fija solo la posición y deja el tamaño que tenga |

Esa tercera forma es la más útil de las tres, y es la que permite escribir una función que centre cualquier ventana sin tocarle el tamaño.

```python title="geometria.py"
"""Las cuatro partes de la cadena de geometry(), una a una."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Geometría")

print("Recién creada:      ", ventana.geometry())

ventana.geometry("480x320+100+50")
ventana.update_idletasks()
print("480x320+100+50:     ", ventana.geometry())

ventana.geometry("+300+200")  # solo posición: el tamaño no se toca
ventana.update_idletasks()
print("solo +300+200:      ", ventana.geometry())

ventana.geometry("600x400")  # solo tamaño: la posición no se toca
ventana.update_idletasks()
print("solo 600x400:       ", ventana.geometry())

ventana.geometry("300x200-0-0")  # pegada a la esquina inferior derecha
ventana.update_idletasks()
print("300x200-0-0:        ", ventana.geometry())
print("posición resuelta:   x =", ventana.winfo_x(), "y =", ventana.winfo_y())
print("tamaño de pantalla:  ", ventana.winfo_screenwidth(), "x",
      ventana.winfo_screenheight())

ventana.mainloop()
```

```salida
Recién creada:       200x200+34+64
480x320+100+50:      480x320+100+50
solo +300+200:       480x320+300+200
solo 600x400:        600x400+300+200
300x200-0-0:         300x200-0-0
posición resuelta:   x = 1940 y = 1028
tamaño de pantalla:   2240 x 1260
```

Repasa la salida y verás las dos mitades funcionando por separado. Al pedir solo `+300+200`, el `480x320` se ha quedado. Al pedir solo `600x400`, el `+300+200` se ha quedado.

### Las coordenadas negativas

Si en vez de `+` se pone `-`, la distancia se mide desde el otro extremo de la pantalla: el borde derecho para la x y el inferior para la y. Y no llega hasta el borde izquierdo de la ventana, sino hasta el derecho.

| Cadena | Dónde queda la ventana |
| --- | --- |
| `"+0+0"` | Esquina superior izquierda |
| `"-0+0"` | Esquina superior derecha |
| `"+0-0"` | Esquina inferior izquierda |
| `"-0-0"` | Esquina inferior derecha |
| `"-20-20"` | A veinte píxeles del borde derecho y veinte del inferior |

En la salida de arriba se comprueba la cuenta. La pantalla mide 2240 píxeles de ancho, la ventana 300, y `-0` la ha dejado en x = 1940, que es 2240 menos 300. El borde derecho de la ventana toca el de la pantalla.

> [!nota] geometry() te devuelve lo que le pediste
>
> Fíjate en que, tras pedir `"300x200-0-0"`, `geometry()` responde `'300x200-0-0'` y no `'300x200+1940+1028'`. Tk conserva la forma en que expresaste la posición, porque con coordenadas negativas la ventana debe seguir pegada a la esquina si cambia la resolución. Para saber dónde está en píxeles absolutos, usa `winfo_x()` y `winfo_y()`.

## Centrar la ventana en la pantalla

Centrar parece una resta y tiene una trampa. El tamaño de la pantalla se obtiene sin problemas, con `winfo_screenwidth()` y `winfo_screenheight()`. El problema es el otro dato: **el tamaño de tu propia ventana no se conoce hasta que Tk ha calculado el diseño**. Antes de eso, los métodos que lo consultan mienten.

Esta tabla recoge lo que devuelven en los dos casos posibles, antes y después de forzar las cuentas con `update_idletasks()`:

| Consulta | Tamaño según el contenido | Tamaño fijado con `geometry("600x400")` |
| --- | --- | --- |
| `geometry()` | `'200x200+34+64'` → `'243x62+34+64'` | `'1x1+0+0'` → `'600x400+63+93'` |
| `winfo_width()` | `200` → `243` | `1` → `600` |
| `winfo_reqwidth()` | `200` → `243` | `200` → `180` |

Sin forzar las cuentas se obtiene `200x200`, que es el relleno que Tk pone por defecto, o directamente `1x1`. Pero el dato importante está en la última casilla: con el tamaño fijado a mano, `winfo_width()` acaba en 600 y `winfo_reqwidth()` en 180. No son sinónimos.

| Método | Qué mide |
| --- | --- |
| `winfo_width()` | Lo que mide la ventana ahora mismo |
| `winfo_reqwidth()` | Lo que pide su contenido para caber, ignorando lo que hayas fijado tú |

Para centrar hace falta el primero, porque queremos centrar la ventana tal como se va a ver. Y para que no mienta hay que llamar antes a `update_idletasks()`, que ya apareció en la lección del bucle de eventos: obliga a Tk a terminar las cuentas del diseño sin dejar entrar ningún evento de fuera.

```python title="centrar.py"
"""Una ventana centrada en la pantalla, con la función que vas a reutilizar."""

import tkinter as tk


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla.

    El update_idletasks es imprescindible: hasta que Tk no ha calculado el
    diseño, el tamaño de la ventana todavía no es el definitivo.
    """
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


ventana = tk.Tk()
ventana.title("Centrada")

etiqueta = tk.Label(ventana, text="Esta ventana sale en el centro de la pantalla")
etiqueta.pack(padx=40, pady=40)

print("Antes de centrar:", ventana.geometry())
centrar(ventana)
print("Después:         ", ventana.geometry())

ventana.mainloop()
```

```salida
Antes de centrar: 200x200+34+64
Después:          352x102+944+579
```

La ventana medía 352 por 102 y la pantalla 2240 por 1260, así que las cuentas salen: 944 es la mitad de 2240 menos 352, y 579 la mitad de 1260 menos 102.

Fíjate en que `centrar` usa la forma `"+x+y"`, la que solo toca la posición. Por eso sirve igual para una ventana con tamaño fijado a mano y para una ajustada a su contenido, y por eso da igual en qué orden la llames respecto a `geometry`.

> [!consejo] Llama a centrar al final de la construcción
>
> Ponla después de haber creado todos los widgets y justo antes de `mainloop()`. Si la llamas antes de añadir el contenido, centrará una ventana vacía y luego el contenido la hará crecer hacia la derecha y hacia abajo, con lo que quedará descentrada.

> [!nota] La barra de título no cuenta
>
> `winfo_height()` mide el área de contenido, sin la barra de título. En el sistema de referencia esa barra ocupa 32 píxeles, lo que se comprueba restando `winfo_y()` de `winfo_rooty()`. La ventana centrada así queda unos 16 píxeles más baja que un centrado óptico perfecto. No se nota, y compensarlo obliga a suponer una altura de barra que cambia en cada sistema y en cada tema.

## Limitar el tamaño: minsize, maxsize y resizable

Una ventana que se puede encoger hasta que los botones se solapan parece mal hecha. Poner un mínimo razonable cuesta una línea.

| Método | Qué hace |
| --- | --- |
| `minsize(ancho, alto)` | Impide encoger por debajo de ese tamaño |
| `maxsize(ancho, alto)` | Impide crecer por encima de ese tamaño |
| `resizable(ancho, alto)` | Dos booleanos: si se puede cambiar el ancho y si se puede el alto |

Los tres, sin argumentos, devuelven el valor actual como tupla.

```python title="tamanos.py"
"""minsize, maxsize y resizable: los límites de lo que puede hacer quien usa."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Tamaños")
ventana.geometry("500x350")

print("Límites por defecto:")
print("  minsize:", ventana.minsize(), "maxsize:", ventana.maxsize())

ventana.minsize(320, 240)
ventana.maxsize(900, 700)
print("Límites puestos a mano:")
print("  minsize:", ventana.minsize(), "maxsize:", ventana.maxsize())

ventana.resizable(True, False)  # el ancho se puede estirar, el alto no
print("resizable(ancho, alto):", ventana.resizable())

etiqueta = tk.Label(ventana, text="Intenta estirarla por los bordes")
etiqueta.pack(padx=30, pady=40)

ventana.mainloop()
```

```salida
Límites por defecto:
  minsize: (72, 15) maxsize: (2240, 1104)
Límites puestos a mano:
  minsize: (320, 240) maxsize: (900, 700)
resizable(ancho, alto): (1, 0)
```

Dos detalles de esa salida. El `maxsize` por defecto no es el alto de la pantalla, que es 1260, sino 1104: Tk descuenta la barra de menús y el Dock, porque ese es el espacio utilizable. Y `resizable` devuelve `(1, 0)` en vez de `(True, False)`, porque por debajo Tcl solo tiene enteros. Se comporta igual en un `if`, pero no des por hecho que `resizable() == (True, False)` sea cierto.

> [!consejo] Un mínimo sí, un máximo casi nunca
>
> Poner `minsize` es casi siempre buena idea: evita que el diseño se rompa. Poner `maxsize`, o bloquear el redimensionado con `resizable(False, False)`, molesta más de lo que ayuda porque impide aprovechar una pantalla grande. La excepción son los diálogos de una sola pregunta, donde estirar no aporta nada.

## El icono de la ventana

Aquí es donde Tkinter depende del sistema operativo más que en ningún otro sitio. Hay dos métodos y ninguno funciona igual en los tres.

`iconphoto()` es el recomendado. Recibe un booleano y una o más imágenes:

```python
icono = tk.PhotoImage(file="logotipo.png")
ventana.iconphoto(True, icono)
```

El primer argumento indica si el icono vale también para las ventanas que se creen después. Con `True` se pone una vez y sirve para todas.

Se puede evitar el fichero de imagen creando un `PhotoImage` vacío y pintándolo con `put()`, que recibe un color y la zona a rellenar. Así el ejemplo es ejecutable sin arrastrar imágenes:

```python title="icono.py"
"""Un icono de ventana generado por código, sin depender de ficheros de imagen."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Con icono")
ventana.geometry("340x180")

# PhotoImage vacío de 32x32 píxeles, que se pinta con put()
icono = tk.PhotoImage(width=32, height=32)
icono.put("#1e5aa8", to=(0, 0, 32, 32))  # todo el cuadro, azul
icono.put("#ffd24a", to=(8, 8, 24, 24))  # un cuadrado amarillo en el centro

ventana.iconphoto(True, icono)

print("Tamaño del icono:     ", icono.width(), "x", icono.height())
print("Píxel 0,0 (esquina):  ", icono.get(0, 0))
print("Píxel 16,16 (centro): ", icono.get(16, 16))

etiqueta = tk.Label(ventana, text="El icono lo dibuja el sistema, no Tk")
etiqueta.pack(padx=30, pady=40)

ventana.mainloop()
```

```salida
Tamaño del icono:      32 x 32
Píxel 0,0 (esquina):   (30, 90, 168)
Píxel 16,16 (centro):  (255, 210, 74)
```

`get(x, y)` devuelve el color del píxel como tupla de tres enteros, lo que confirma que el dibujo ha salido: azul en la esquina y amarillo en el centro.

> [!aviso] Guarda el PhotoImage en una variable que dure
>
> Si creas el icono dentro de una función y no lo devuelves, Python recoge el objeto al salir y el icono desaparece sin ningún error. Es el fallo clásico de las imágenes en Tkinter. Tiene que quedar una referencia viva mientras exista la ventana: una variable global, un atributo del objeto o un valor devuelto que alguien guarde.

El otro método es `iconbitmap()`, y es el que trae problemas:

| Sistema | Qué acepta `iconbitmap()` |
| --- | --- |
| Windows | Ficheros `.ico`, que es su formato nativo. Es el único sitio donde funciona bien |
| Linux | Mapas de bits `.xbm`, con el nombre precedido de `@` |
| macOS | Mapas de bits `.xbm` con `@`. Los `.ico` no se aceptan |

> [!error] \_tkinter.TclError: bitmap "logotipo.ico" not defined
>
> Estás pasando un `.ico` a `iconbitmap()` en macOS o en Linux, donde ese formato no existe. El mensaje confunde porque habla de un mapa de bits "no definido" en vez de decir que el formato no vale. La solución es `iconphoto()` con un `PhotoImage` de un `.png`, que funciona en los tres sistemas. Si necesitas el `.ico` en Windows, envuelve la llamada en un `try` con `except tk.TclError`.

Queda el aviso que más desconcierta. En macOS, `iconphoto()` se acepta sin error, pero el sistema no pinta un icono por ventana como hacen Windows y Linux: el icono de una aplicación es el de su paquete `.app`, no algo que el programa decida al arrancar. Para que una aplicación empaquetada tenga icono en el Dock hay que dárselo al empaquetador, y eso se ve en la lección de PyInstaller. Aun así conviene llamar a `iconphoto()`, porque es lo correcto en los otros dos sistemas y en macOS no estorba.

## attributes: pantalla completa, transparencia y siempre encima

`attributes()` da acceso a las opciones que dependen del gestor de ventanas. Se usa con el nombre del atributo precedido de un guion, y sin valor devuelve el actual.

| Atributo | Qué hace | Dónde funciona |
| --- | --- | --- |
| `-fullscreen` | Pantalla completa, sin barra de título | Los tres sistemas |
| `-topmost` | La ventana se queda por encima de las demás | Los tres sistemas |
| `-alpha` | Opacidad de la ventana entera, de `0.0` a `1.0` | Los tres sistemas |
| `-transparent` | Fondo transparente de verdad | Solo macOS |
| `-toolwindow` | Barra de título fina, de ventana auxiliar | Solo Windows |
| `-zoomed` | Maximizada | Solo Windows y Linux |

Llamar a `attributes()` sin argumentos devuelve la lista de lo que admite el sistema, lo que permite comprobarlo en el sitio en vez de fiarse de la documentación:

```python title="atributos.py"
"""Los atributos de ventana, que son lo más dependiente del sistema que hay."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Atributos")
ventana.geometry("420x220")

print("Atributos que admite este sistema:")
for clave in ventana.attributes()[::2]:
        print("  ", clave)

ventana.attributes("-alpha", 0.85)  # 0.0 invisible, 1.0 opaca
print("Transparencia:  ", ventana.attributes("-alpha"))

ventana.attributes("-topmost", True)  # por encima de las demás ventanas
print("Siempre encima: ", ventana.attributes("-topmost"))
ventana.attributes("-topmost", False)

etiqueta = tk.Label(ventana, text="Ventana al 85 % de opacidad")
etiqueta.pack(padx=30, pady=40)

ventana.mainloop()
```

```salida
Atributos que admite este sistema:
   -alpha
   -appearance
   -buttons
   -fullscreen
   -isdark
   -modified
   -notify
   -titlepath
   -topmost
   -transparent
   -stylemask
   -class
   -tabbingid
   -tabbingmode
   -type
Transparencia:   0.85
Siempre encima:  1
```

Esa lista es la de macOS, y no aparece `-zoomed`: pedirlo aquí da un error que enumera precisamente estos nombres. Atributos como `-appearance` o `-isdark`, que informan del tema claro u oscuro del sistema, no existen en ningún otro sitio.

La pantalla completa se pone y se quita con un booleano:

```python
ventana.attributes("-fullscreen", True)
```

Conviene dar siempre una forma de salir, porque en pantalla completa no hay barra de título ni botón de cerrar. Lo habitual es atar la tecla <kbd>Esc</kbd> a quitarla, con el `bind` del bloque de eventos.

> [!nota] Los atributos no son inmediatos
>
> Los cambios de atributo los aplica el gestor de ventanas, no Tk, y algunos llevan animación: en macOS la transición a pantalla completa tarda una fracción de segundo. Si consultas el atributo justo después de cambiarlo, puede que todavía no refleje el valor nuevo. Con el bucle de eventos en marcha acaba siendo el correcto, pero no cuentes con leerlo en la línea siguiente.

## Interceptar el cierre con protocol

Cuando alguien pulsa la X de la barra de título, tu programa no se entera por ningún camino normal: la ventana se destruye y `mainloop()` termina. Si había cambios sin guardar, se han perdido.

`protocol()` registra una función para uno de los mensajes que el gestor de ventanas manda a la aplicación. El que interesa es `WM_DELETE_WINDOW`: "se ha pedido cerrar esta ventana".

```python
ventana.protocol("WM_DELETE_WINDOW", al_cerrar)
```

A partir de ahí, la X ya no cierra nada: llama a tu función. **Cerrar pasa a ser tu responsabilidad**, y si tu función no llama a `destroy()`, la ventana no se cierra.

```python title="cierre_controlado.py"
"""Interceptar el cierre de la ventana para no perder cambios sin guardar."""

import tkinter as tk
from tkinter import messagebox

hay_cambios_sin_guardar = True


def al_cerrar() -> None:
        """La llama Tk cuando se pulsa la X de la barra de título."""
    if not hay_cambios_sin_guardar:
                ventana.destroy()
        return
    # messagebox tiene su propia lección; aquí basta con una pregunta
    if messagebox.askokcancel("Salir", "Hay cambios sin guardar. ¿Salir igualmente?"):
                print("Cierro la ventana y pierdo los cambios")
        ventana.destroy()
    else:
                print("Cierre cancelado: la ventana sigue abierta")


ventana = tk.Tk()
ventana.title("Cierre controlado")
ventana.geometry("380x160")

etiqueta = tk.Label(ventana, text="Pulsa la X de la barra de título")
etiqueta.pack(padx=30, pady=50)

print("Antes de registrar nada:", repr(ventana.protocol("WM_DELETE_WINDOW")))
ventana.protocol("WM_DELETE_WINDOW", al_cerrar)
print("Protocolos registrados: ", ventana.protocol())

ventana.mainloop()
```

```salida
Antes de registrar nada: '4449757312destroy'
Protocolos registrados:  ('WM_DELETE_WINDOW',)
```

Esa primera línea es reveladora. Antes de que tú registres nada, `WM_DELETE_WINDOW` ya tiene una función asociada y su nombre acaba en `destroy`: Tkinter deja puesta de fábrica la que destruye la ventana, y tu llamada a `protocol` la sustituye. El número de delante es la dirección del objeto y cambia en cada ejecución, igual que el de los `<function ...>` del módulo 1.

De `messagebox.askokcancel` basta saber que devuelve `True` si se acepta y `False` si se cancela. La familia completa de diálogos tiene su propia lección en el bloque de ventanas secundarias.

> [!consejo] Un único punto de salida
>
> Registra `al_cerrar` en `protocol` y haz que pase por ahí todo lo que cierre el programa, incluido el botón de "Salir" del menú y el atajo de teclado. Así el aviso de cambios sin guardar y la limpieza se escriben una vez. Es la misma idea que el `finally` de los programas de terminal del módulo 2, pero con nombre.

## destroy frente a quit

Los dos terminan `mainloop()`, y ahí se acaba el parecido.

| Método | Qué hace |
| --- | --- |
| `destroy()` | Destruye la ventana y todos sus widgets, y sale del bucle |
| `quit()` | Solo sale del bucle. La ventana y los widgets siguen existiendo |

La diferencia se ve mejor ejecutando esto, que llama a `mainloop()` dos veces:

```python
ventana.after(500, ventana.quit)  # sale del bucle y no destruye nada
ventana.mainloop()

print("Después de quit():")
print("  ¿existe la ventana?", ventana.winfo_exists())
print("  ¿y el widget?      ", etiqueta.cget("text"))
ventana.title("Sigue viva")
print("  título cambiado a: ", ventana.title())

ventana.after(500, ventana.destroy)  # ahora sí desaparece
ventana.mainloop()
```

```salida
Después de quit():
  ¿existe la ventana? 1
  ¿y el widget?       Esta ventana se cierra sola
  título cambiado a:  Sigue viva
```

Después de `quit()` la ventana sigue viva: se puede consultar, se le puede cambiar el título y se puede volver a entrar en `mainloop()` para seguir usándola. Después de `destroy()` no queda nada con lo que hablar y cualquier consulta falla.

> [!error] \_tkinter.TclError: cannot invoke "winfo" command: application has been destroyed
>
> Estás usando la ventana después de destruirla. Ocurre casi siempre por poner código detrás de `mainloop()` contando con que los widgets siguen ahí, o por leer una caja de texto en la función de cierre después de haber llamado a `destroy()`. Los widgets hijos dan una variante del mismo error, `invalid command name ".!label"`. La regla es sencilla: lee todo lo que necesites **antes** de llamar a `destroy()`.

Para una aplicación normal, la que quieres es `destroy()`. `quit()` tiene un uso legítimo y estrecho: salir de un `mainloop` anidado sin desmontar la interfaz, algo que aparece en los diálogos que esperan respuesta. Usarlo creyendo que cierra el programa deja procesos vivos sin ventana visible.

## state: minimizar, maximizar y esconder

`state()` consulta y cambia el estado de la ventana. Estos son los valores que devuelve:

| Estado | Qué significa |
| --- | --- |
| `'normal'` | Visible y en su tamaño |
| `'iconic'` | Minimizada |
| `'withdrawn'` | Retirada de la pantalla, sin aparecer ni en la barra de tareas |
| `'zoomed'` | Maximizada |

Y estos los métodos que lo cambian:

| Método | Qué hace |
| --- | --- |
| `iconify()` | Minimiza |
| `deiconify()` | Devuelve a `'normal'` desde cualquier estado |
| `withdraw()` | Esconde la ventana por completo |
| `state("zoomed")` | Maximiza |

```python title="estados.py"
"""state() para minimizar, maximizar y esconder la ventana."""

import tkinter as tk


def siguiente_paso() -> None:
        """Recorre los estados uno a uno, con un segundo entre cada paso."""
    if not pasos:
                return
    nombre, accion = pasos.pop(0)
    accion()
    ventana.update_idletasks()
    print(f"{nombre:<14} state() = {ventana.state()!r:<12} {ventana.geometry()}")
    ventana.after(1000, siguiente_paso)


ventana = tk.Tk()
ventana.title("Estados")
ventana.geometry("420x220+100+100")

etiqueta = tk.Label(ventana, text="Mira la terminal")
etiqueta.pack(padx=30, pady=60)

pasos = [
    ("de partida", lambda: None),
    ("iconify()", ventana.iconify),
    ("deiconify()", ventana.deiconify),
    ("state zoomed", lambda: ventana.state("zoomed")),
    ("state normal", lambda: ventana.state("normal")),
    ("withdraw()", ventana.withdraw),
    ("deiconify()", ventana.deiconify),
]

ventana.after(500, siguiente_paso)
ventana.mainloop()
```

```salida
de partida     state() = 'normal'     420x220+100+100
iconify()      state() = 'iconic'     420x220+100+100
deiconify()    state() = 'normal'     420x220+100+100
state zoomed   state() = 'zoomed'     2240x1104+0+30
state normal   state() = 'normal'     420x220+100+100
withdraw()     state() = 'withdrawn'  420x220+100+100
deiconify()    state() = 'normal'     420x220+100+100
```

Mira la línea de `zoomed`. La geometría pasa a `2240x1104+0+30`, no a los 2240 por 1260 de la pantalla: la ventana maximizada respeta la barra de menús de arriba y el Dock de abajo. Y al volver a `'normal'` recupera exactamente el `420x220+100+100` de partida, porque Tk recuerda el tamaño anterior.

Aquí conviene desconfiar de lo que se lee por ahí. Se repite mucho que `'zoomed'` solo existe en Windows, y en este sistema, con Tcl/Tk 9.0 en macOS, funciona y devuelve `'zoomed'`. Lo que sí es cierto en los tres sistemas es que maximizar es una petición al gestor de ventanas, no una orden: en algunos escritorios de Linux no hace nada. La alternativa portable para que ocupe todo es calcular el tamaño de la pantalla y ponerlo con `geometry`.

> [!aviso] withdraw no es minimizar
>
> Una ventana en `'withdrawn'` desaparece de todas partes: de la pantalla, de la barra de tareas y del conmutador de aplicaciones. No hay forma de recuperarla desde el sistema, solo con `deiconify()` desde tu código. Sirve para esconder la ventana principal mientras se muestra una pantalla de arranque, pero si olvidas el `deiconify()` tendrás un programa en marcha que no se puede ver ni cerrar.

## Todo junto: la plantilla de arranque

Esta es la ventana bien presentada que reutilizarán el resto de las lecciones. Nada de lo que hay aquí es nuevo; lo que aporta es el orden.

```python title="plantilla.py"
"""Plantilla de arranque: la ventana bien presentada del resto del módulo."""

import tkinter as tk


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_icono() -> tk.PhotoImage:
        """Icono mínimo pintado por código, para no arrastrar ficheros de imagen."""
    icono = tk.PhotoImage(width=32, height=32)
    icono.put("#1e5aa8", to=(0, 0, 32, 32))
    icono.put("#ffd24a", to=(8, 8, 24, 24))
    return icono


def al_cerrar() -> None:
        """Único punto de salida: aquí se guarda lo que haga falta."""
    print("Guardando antes de salir")
    ventana.destroy()


ventana = tk.Tk()
ventana.title("Gestor de gastos")
ventana.geometry("640x440")
ventana.minsize(480, 320)

icono = crear_icono()
ventana.iconphoto(True, icono)

etiqueta = tk.Label(ventana, text="Aquí irá la interfaz del resto del módulo")
etiqueta.pack(padx=40, pady=40)

ventana.protocol("WM_DELETE_WINDOW", al_cerrar)
centrar(ventana)

print("Ventana lista:", ventana.geometry())
print("Límite mínimo:", ventana.minsize())

ventana.mainloop()
```

```salida
Ventana lista: 640x440+800+410
Límite mínimo: (480, 320)
```

El orden de las líneas no es casual, y es el que se justificó en la lección del bucle de eventos: primero la ventana con su título, tamaño y límites; después el icono, guardado en una variable que dure; luego la interfaz, que aquí es una etiqueta sola y en las lecciones siguientes será todo lo demás; el cierre controlado; `centrar`, ya con el contenido puesto; y `mainloop()` en la última línea.

Lo que queda pendiente es todo lo visual: qué hay dentro, cómo se coloca y de qué color es. Los widgets empiezan en la lección siguiente y la colocación tiene su propio bloque.

> [!resumen] En resumen
>
> Una ventana se presenta con un puñado de métodos de la clase `Tk`. `title()` pone el texto de la barra. `geometry()` usa una cadena con el formato `"anchoxalto+x+y"` cuyas dos mitades son independientes, así que valen `"640x480"` y `"+100+50"` por separado, y con `-` en vez de `+` la distancia se mide desde el borde derecho o inferior de la pantalla. Para centrar hace falta `winfo_screenwidth()` y `winfo_screenheight()`, y sobre todo un `update_idletasks()` antes de medir, porque hasta que Tk no calcula el diseño la ventana dice medir `200x200` o incluso `1x1`; hay que medir con `winfo_width()`, que da el tamaño real, y no con `winfo_reqwidth()`, que da el que pide el contenido. `minsize()` conviene casi siempre, `maxsize()` y `resizable()` casi nunca. El icono se pone con `iconphoto()` y un `PhotoImage` que haya que mantener vivo en una variable, mientras que `iconbitmap()` solo va fino en Windows con sus `.ico`; en macOS el icono de verdad es el del paquete de la aplicación. `attributes()` da acceso a la pantalla completa, la opacidad y la ventana siempre encima, y sin argumentos enumera lo que admite el sistema. `protocol("WM_DELETE_WINDOW", funcion)` intercepta la X y convierte el cierre en tu responsabilidad, que es donde se pregunta por los cambios sin guardar. Y hay que usar `destroy()`, que desmonta la ventana, no `quit()`, que solo sale del bucle y deja los widgets vivos.

> [!ejercicio] Practica
>
> Parte de la plantilla de arranque de la lección y guarda tu trabajo en `04-ventana.py`:
>
> 1. Prueba las tres formas de `geometry` sobre la misma ventana: solo tamaño, solo posición y las dos cosas. Después coloca la ventana en las cuatro esquinas de la pantalla con coordenadas negativas y comprueba con `winfo_x()` y `winfo_y()` que las cuentas cuadran.
> 2. Quita el `update_idletasks()` de dentro de `centrar` y ejecuta el programa. Anota dónde acaba la ventana y explica, con los números que imprima `geometry()`, por qué ha quedado ahí.
> 3. Escribe una función `colocar_en_esquina(ventana, esquina)` que reciba `"superior-izquierda"`, `"superior-derecha"`, `"inferior-izquierda"` o `"inferior-derecha"` y deje la ventana ahí con veinte píxeles de margen. Reutiliza la idea de `centrar`.
> 4. Amplía el cierre controlado para que la pregunta solo aparezca si hay cambios de verdad. Añade un botón que marque la variable `hay_cambios_sin_guardar` a `True` y otro que la ponga a `False`, y comprueba los dos caminos.
> 5. Añade un botón que ponga la ventana en pantalla completa y otro que la saque. Imprime `attributes("-fullscreen")` y `geometry()` en cada paso y compara los valores con los de la lección.
> 6. Cambia el `destroy()` de `al_cerrar` por `quit()`, ejecuta el programa y ciérralo. Comprueba con `ps` si el proceso de Python sigue vivo y explica por qué.
