---
titulo: "El selector numérico: Spinbox"
resumen: "Un campo con dos flechas para subir y bajar: el rango que las flechas respetan y el teclado no, los decimales con su formato, y el selector que también sirve para texto."
minutos: 20
orden: 21
---

Empiezan aquí los tres widgets del número. Un `Spinbox` sirve para elegir uno exacto, un `Scale` para elegirlo arrastrando y una `Progressbar` para mostrarlo; las tres próximas lecciones van de eso.

El `Spinbox` es el primero y el más modesto: un campo de texto con dos flechitas al lado. Y como el `Combobox`, no es una metáfora:

```consola
>>> issubclass(ttk.Spinbox, ttk.Entry)
True
```

Otro descendiente del `Entry`, con lo que todo lo de la lección 15 sigue en pie. Lo que añade son las flechas, un rango y un paso. Y trae un problema que conviene ver pronto, porque es de los que llegan a producción sin que nadie se dé cuenta: **el rango que las flechas respetan, el teclado lo ignora.**

> [!objetivo] Qué vas a aprender
>
> Crear selectores con su rango y su paso; saber que `get` siempre devuelve texto; entender por qué el rango no protege nada si se puede teclear, y las dos formas de arreglarlo; manejar decimales con `format`; usar `values` para recorrer una lista de textos en lugar de números; y decidir cuándo el selector es mejor que un campo o un deslizador.

## Crear y leer

El rango va en `from_` y `to`, y el salto de cada flecha en `increment`:

```python
personas = ttk.Spinbox(formulario, from_=1, to=10, increment=1, width=6)
personas.set(2)
```

Fíjate en el guion bajo de `from_`: `from` es una palabra reservada de Python y no se puede usar como nombre de argumento, así que Tkinter le añade el guion. Al consultarla, en cambio, se llama `from` a secas:

```consola
>>> personas.cget("from"), personas.cget("to")
(1, 10)
```

Es una de esas asimetrías que se recuerdan a base de tropezar. Y como en el desplegable, **un selector recién creado está vacío**, así que hay que darle un valor inicial:

```consola
>>> selector = ttk.Spinbox(ventana, from_=1, to=10)
>>> selector.get()
''
>>> selector.set(5)
>>> selector.get()
'5'
```

Mira bien ese `'5'`. Es una cadena, no un número:

```consola
>>> type(selector.get())
<class 'str'>
```

**`get()` de un `Spinbox` siempre devuelve texto**, aunque el rango sea numérico y el valor lo hayas puesto tú con un entero. Es lógico, porque por debajo es un campo de texto, pero sorprende en un widget que se llama selector numérico. Así que el valor hay que convertirlo, y con cuidado, porque puede no ser convertible por lo que viene ahora.

El único método que añade sobre el `Entry` es `set`:

```consola
>>> sorted(m for m in dir(ttk.Spinbox(ventana)) if m not in dir(ttk.Entry(ventana)))
['set']
```

No tiene ningún `invoke` ni nada para pulsar sus flechas desde el código. Si alguna vez necesitas simularlas, en pruebas por ejemplo, se hace generando sus eventos virtuales:

```python
selector.event_generate("<<Increment>>")
selector.event_generate("<<Decrement>>")
```

## El rango no protege nada

Las flechas se portan perfectamente. Suben, bajan y se paran en los topes:

```consola
>>> selector.set(5)
>>> for _ in range(3):
...     selector.event_generate("<<Increment>>")
...
>>> selector.get()
'8'
>>> for _ in range(12):
...     selector.event_generate("<<Increment>>")
...
>>> selector.get()
'10'
```

Doce pulsaciones más y se queda en diez, que es el tope. Impecable. El problema es que las flechas son una de las dos formas de cambiar el valor, y la otra no respeta nada:

```consola
>>> selector.delete(0, "end")
>>> selector.insert(0, "500")
>>> selector.get()
'500'
>>> selector.cget("from"), selector.cget("to")
(1, 10)
```

Quinientos en un selector de uno a diez. Y no es cosa de que lo haya escrito el código: teclearlo a mano hace exactamente lo mismo. Ni `set` se salva:

```consola
>>> selector.set(999)
>>> selector.get()
'999'
>>> selector.set("hola")
>>> selector.get()
'hola'
```

> [!aviso] Un `Spinbox` es un `Entry` con flechas, y hay que validarlo como un `Entry`
>
> `from_` y `to` **no son una restricción del valor**, son la configuración de las flechas. El widget no valida nada por su cuenta, igual que el `Combobox` editable de la lección anterior no comprobaba que lo escrito estuviera en su lista.
>
> Lo único que hace Tk es esto, y solo cuando alguien vuelve a tocar una flecha:
>
> ```consola
> >>> selector.set("hola")
> >>> selector.event_generate("<<Increment>>")
> >>> selector.get()
> '1'
> ```
>
> Al no poder interpretar "hola" como número, la flecha reinicia el valor al mínimo. Es decir, que tu 999 o tu texto sobreviven **hasta que alguien pulse una flecha**, y si nadie la pulsa, llegan tal cual al programa.
>
> Hay dos formas de arreglarlo y valen las dos:
>
> 1. **Validar, como en el `Entry`.** Con `validate="key"` y una función que solo acepte dígitos y compruebe el rango, recordando la regla de la lección 15: la función no puede lanzar excepciones ni devolver nada que no sea un booleano.
> 2. **Prohibir el teclado**, con `state="readonly"`. Entonces solo se puede usar las flechas, que sí respetan el rango, y el problema desaparece de raíz. Es la opción correcta cuando el rango es corto y no hay ninguna ventaja en teclear.
>
> Y además de cualquiera de las dos, **comprueba al aceptar**. El `try` alrededor del `int(selector.get())` no es paranoia: es el único sitio donde de verdad sabes qué hay.

## `wrap`: dar la vuelta

Con `wrap=True`, al pasar del tope se vuelve al otro extremo:

```consola
>>> rueda = ttk.Spinbox(ventana, from_=1, to=3, wrap=True)
>>> rueda.set(3)
>>> rueda.event_generate("<<Increment>>")
>>> rueda.get()
'1'
```

Sin `wrap`, que es el valor de fábrica, se queda en el tres. Cuándo conviene: para valores **cíclicos**, donde el mínimo y el máximo son vecinos de verdad. Las horas, los minutos, los meses, los días de la semana. En una hora, pasar de las 23 a las 0 es lo natural, y sin `wrap` hay que bajar veintitrés veces.

Y cuándo no: para cantidades. En un selector de personas de 1 a 10, dar la vuelta del 10 al 1 no significa nada y se siente como un fallo.

## Decimales

`increment` acepta decimales, y el widget los maneja sin ensuciarlos:

```consola
>>> decimal = ttk.Spinbox(ventana, from_=0, to=1, increment=0.1)
>>> decimal.set(0)
>>> for _ in range(3):
...     decimal.event_generate("<<Increment>>")
...
>>> decimal.get()
'0.3'
```

Un `0.3` limpio, y no el `0.30000000000000004` que saldría de sumar tres veces `0.1` en Python. Eso es porque Tk no acumula sumas, sino que calcula el valor desde el mínimo.

Lo que sí hace falta es `format`, porque sin él los valores se ven con distinto número de decimales según el caso, y una columna de cifras que baila queda mal:

```consola
>>> con_formato = ttk.Spinbox(ventana, from_=0, to=1, increment=0.1, format="%.2f")
>>> con_formato.set(0)
>>> con_formato.event_generate("<<Increment>>")
>>> con_formato.get()
'0.10'
```

`format` usa la sintaxis de `printf` de C, no la de Python: `"%.2f"` para dos decimales, `"%03d"` para un entero con ceros delante. Es una de las pocas cosas del módulo donde asoma que por debajo hay otro lenguaje.

> [!consejo] Con decimales, `DoubleVar`, y nunca `IntVar`
>
> Si atas un selector decimal a un `IntVar`, la variable trunca:
>
> ```python
> paso = tk.IntVar(value=0)
> ttk.Spinbox(ventana, from_=0, to=1, increment=0.5, textvariable=paso)   # mal
> ```
>
> El widget mostrará `0.5` y la variable dirá `0`. Los dos tienen razón y no coinciden, que es la peor clase de error. Para valores con decimales, `DoubleVar`; para enteros, `IntVar`; y si dudas, `StringVar` y convierte tú, que al menos deja el problema a la vista.

## No solo números

`values` cambia el widget por completo: en vez de un rango, las flechas recorren una lista:

```consola
>>> nivel = ttk.Spinbox(ventana, values=("bajo", "medio", "alto"))
>>> nivel.set("bajo")
>>> nivel.event_generate("<<Increment>>")
>>> nivel.get()
'medio'
>>> for _ in range(5):
...     nivel.event_generate("<<Increment>>")
...
>>> nivel.get()
'alto'
```

Se para al final, o da la vuelta si le pones `wrap=True`. Cuando `values` está puesto, `from_`, `to` e `increment` se ignoran.

¿Y para qué querrías eso, teniendo un `Combobox`? Para muy pocas cosas, y conviene decirlo claro: **cuando hay tres o cuatro valores ordenados y el orden importa.** Las tallas de una prenda, los niveles de un ajuste, las velocidades de un ventilador. Con dos flechas se sube y se baja por una escala, que es un gesto distinto de abrir una lista y elegir. Para cualquier otra cosa, el desplegable es mejor, porque deja ver todas las opciones de golpe.

## `command`, y lo de siempre

`command` se llama al pulsar una flecha, y no recibe argumentos:

```consola
>>> registro = []
>>> selector = ttk.Spinbox(ventana, from_=0, to=5)
>>> selector.configure(command=lambda: registro.append(selector.get()))
>>> selector.set(0)
>>> selector.event_generate("<<Increment>>")
>>> selector.event_generate("<<Increment>>")
>>> registro
['1', '2']
```

Y como ya es costumbre, no se llama cuando el valor cambia desde el código:

```consola
>>> selector.set(4)
>>> registro
['1', '2']
```

Con un agravante propio de este widget: `command` tampoco se llama **cuando alguien teclea**, porque teclear no es pulsar una flecha. Así que un `Spinbox` con `command` se pierde la mitad de los cambios, incluso los hechos por una persona.

Es el argumento definitivo de la regla del bloque: aquí `textvariable` con `trace_add` no es una preferencia, es lo único que se entera de todo.

```python
personas = tk.IntVar(value=2)
ttk.Spinbox(formulario, from_=1, to=10, textvariable=personas, width=6)
personas.trace_add("write", lambda *_: recalcular())
```

## Las opciones

Un `ttk.Spinbox` tiene veintiséis opciones, casi todas heredadas del `Entry`:

```consola
>>> sorted(ttk.Spinbox(ventana).configure().keys())
['background', 'class', 'command', 'cursor', 'exportselection', 'font',
 'foreground', 'format', 'from', 'increment', 'invalidcommand', 'justify',
 'placeholder', 'placeholderforeground', 'show', 'state', 'style', 'takefocus',
 'textvariable', 'to', 'validate', 'validatecommand', 'values', 'width',
 'wrap', 'xscrollcommand']
```

Las propias son seis: `from`, `to`, `increment`, `format`, `values` y `wrap`, más el `command` que ya conoces del botón. Todo lo demás es del campo de texto, validación incluida.

Y una que conviene poner casi siempre: `justify="right"`. Las cifras se leen mejor alineadas a la derecha, y en un selector estrecho además evita que el número se pegue a las flechas.

De la familia clásica solo merece mención que `tk.Spinbox` tiene `repeatdelay` y `repeatinterval`, como el botón de la lección 14, para controlar la velocidad a la que se repite al mantener pulsada una flecha. En `ttk` eso no se puede ajustar.

## Un formulario de reserva

```python title="selectores.py"
"""Spinbox: rango, validación, wrap para las horas y values para una escala."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

PRECIO_NOCHE = 82.50
SUPLEMENTO = {"Estándar": 0.0, "Superior": 24.0, "Suite": 61.0}
MAX_PERSONAS = 6
MAX_NOCHES = 30


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def entero_hasta(tope):
        """Fábrica de validaciones. Nunca lanza excepción y devuelve bool."""
    def comprobar(propuesto):
                if propuesto == "":
                        return True
        if not propuesto.isdigit() or len(propuesto) > len(str(tope)):
                        return False
        return 0 < int(propuesto) <= tope
    return comprobar


def crear_estancia(contenedor):
        """Dos selectores numéricos, validados y con el teclado permitido."""
    caja = ttk.LabelFrame(contenedor, text="Estancia", padding=MARGEN)
    caja.pack(fill="x")

    ttk.Label(caja, text="Personas:", anchor="e", width=11).grid(
        row=0, column=0, sticky="e", pady=AIRE)
    ttk.Spinbox(caja, from_=1, to=MAX_PERSONAS, textvariable=personas,
                width=8, justify="right", validate="key",
                validatecommand=(ventana.register(entero_hasta(MAX_PERSONAS)),
                                 "%P")).grid(row=0, column=1, sticky="w", pady=AIRE)

    ttk.Label(caja, text="Noches:", anchor="e", width=11).grid(
        row=1, column=0, sticky="e", pady=AIRE)
    ttk.Spinbox(caja, from_=1, to=MAX_NOCHES, textvariable=noches,
                width=8, justify="right", validate="key",
                validatecommand=(ventana.register(entero_hasta(MAX_NOCHES)),
                                 "%P")).grid(row=1, column=1, sticky="w", pady=AIRE)
    return caja


def crear_hora(contenedor):
        """Hora y minutos con wrap: son valores cíclicos, el 23 y el 0 son vecinos.

    En readonly, porque con las flechas basta y así el teclado no puede
    colar un valor fuera de rango.
    """
    caja = ttk.LabelFrame(contenedor, text="Hora de llegada", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    ttk.Spinbox(caja, from_=0, to=23, textvariable=hora, wrap=True,
                format="%02.0f", width=4, justify="right",
                state="readonly").pack(side="left")
    ttk.Label(caja, text=":").pack(side="left", padx=2)
    ttk.Spinbox(caja, from_=0, to=59, textvariable=minuto, wrap=True,
                increment=15, format="%02.0f", width=4, justify="right",
                state="readonly").pack(side="left")
    ttk.Label(caja, text="  (las flechas dan la vuelta)",
              foreground="#6E6E73").pack(side="left", padx=AIRE)
    return caja


def crear_habitacion(contenedor):
        """values en vez de rango: tres niveles ordenados, de menos a más."""
    caja = ttk.LabelFrame(contenedor, text="Habitación", padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    ttk.Spinbox(caja, values=tuple(SUPLEMENTO), textvariable=habitacion,
                width=12, state="readonly").pack(side="left")
    ttk.Label(caja, textvariable=suplemento, foreground="#6E6E73").pack(
        side="left", padx=MARGEN)
    return caja


def calcular(*_):
        """Se llama ante cualquier cambio. Convierte con cuidado."""
    try:
                cuantas = int(personas.get())
        cuantas_noches = int(noches.get())
    except (ValueError, tk.TclError):
        # El campo puede estar vacío o a medio escribir.
                total.set("Completa los datos de la estancia")
        return

    extra = SUPLEMENTO[habitacion.get()]
    suplemento.set(f"+{extra:.2f} € por noche" if extra else "sin suplemento")
    importe = (PRECIO_NOCHE + extra) * cuantas_noches
    total.set(f"{cuantas_noches} noches, {cuantas} personas, llegada a las "
              f"{hora.get():0>2}:{minuto.get():0>2} — {importe:.2f} €")


ventana = tk.Tk()
ventana.title("Reserva")
ventana.minsize(520, 380)

# StringVar en los numéricos: el campo puede estar vacío mientras se teclea,
# y un IntVar lanzaría TclError al leerlo en ese momento.
# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
personas = tk.StringVar(value="2")
noches = tk.StringVar(value="3")
hora = tk.StringVar(value="14")
minuto = tk.StringVar(value="00")
habitacion = tk.StringVar(value="Estándar")
suplemento = tk.StringVar()
total = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_estancia(cuerpo)
crear_hora(cuerpo)
crear_habitacion(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, textvariable=total, wraplength=460, justify="left").pack(
    anchor="w")

# trace_add y no command: command se pierde lo que se teclea.
for variable in (personas, noches, hora, minuto, habitacion):
        variable.trace_add("write", calcular)
calcular()

centrar(ventana)
ventana.mainloop()
```

Tres decisiones ahí que son el resumen de la lección. Las variables son `StringVar` y no `IntVar`, porque mientras alguien borra para escribir otro número el campo está vacío, y un `IntVar` lanza `TclError` al leerlo en ese momento; con `StringVar` el `try` de `calcular` lo absorbe. Los selectores de hora van en `readonly` con `wrap=True`, porque son cíclicos y no gana nada con el teclado, mientras que los de personas y noches sí dejan teclear y por eso llevan validación. Y ningún selector usa `command`, porque `command` no se enteraría de lo que se escribe a mano.

> [!consejo] Cuándo selector, cuándo campo, cuándo deslizador
>
> El `Spinbox` está en el medio de los tres y su hueco es concreto: **cuando el valor exacto importa y el rango es corto**, digamos de menos de cincuenta valores. Personas, noches, copias a imprimir, unidades de un pedido.
>
> Por encima de eso las flechas dejan de servir, porque llegar a 300 a base de clics no lo hace nadie, y entonces lo que quieres es un `Entry` con validación. Y si lo que importa no es el número exacto sino la proporción, como el volumen o el brillo, lo que quieres es el `Scale` de la lección siguiente. La pregunta que lo decide es sencilla: ¿alguien sabría decir de antemano el número que quiere? Si sí, selector o campo; si lo que va a hacer es probar hasta que le guste, deslizador.

> [!resumen] En resumen
>
> El `Spinbox` es un campo de texto con dos flechas, y literalmente: hereda de `ttk.Entry` y solo añade el método `set`. El rango va en `from_` con guion bajo, porque `from` es palabra reservada, aunque al consultarlo con `cget` se llame `from` a secas; el salto de cada flecha es `increment`, y el widget nace vacío, así que hay que darle valor inicial. `get()` devuelve siempre una cadena, aunque el rango sea numérico. Lo fundamental es que `from_` y `to` configuran las flechas pero **no restringen el valor**: teclear a mano, `insert` o `set` aceptan cualquier cosa, incluido texto, y eso sobrevive hasta que alguien pulsa una flecha, momento en el que Tk reinicia al mínimo. Se arregla de dos maneras, validando como un `Entry` cualquiera o poniendo `state="readonly"` para que solo valgan las flechas, y en los dos casos comprobando al aceptar. `wrap=True` da la vuelta al llegar al tope, lo que tiene sentido en valores cíclicos como las horas y ninguno en cantidades. Los decimales se manejan con `increment` sin ensuciarse, porque Tk calcula desde el mínimo en vez de acumular sumas, y `format` les da un aspecto uniforme con la sintaxis de `printf`, no la de Python; con decimales hay que usar `DoubleVar`, porque un `IntVar` trunca y hace que el widget y la variable digan cosas distintas. Con `values` las flechas recorren una lista de textos en lugar de un rango, que solo compensa con tres o cuatro valores ordenados donde el orden signifique algo. Y su `command` no solo se pierde los cambios del código, se pierde también lo que alguien teclea, de modo que aquí `textvariable` con `trace_add` es la única forma de enterarse de todo.

> [!ejercicio] Practica
>
> Trabaja en un fichero `21-selectores.py` salvo donde se indique otra cosa:
>
> 1. Crea un selector de 1 a 10 y una etiqueta que muestre su valor y su tipo. Comprueba qué devuelve `get()` antes de darle un valor inicial.
> 2. En ese mismo selector, escribe `500` a mano y comprueba que lo acepta. Después pulsa una flecha y anota en qué se convierte. Arréglalo primero con `state="readonly"` y luego con validación.
> 3. Escribe en `21-hora.py` un selector de horas y otro de minutos con `wrap=True` y `format="%02.0f"`, con el paso de los minutos en 15. Comprueba qué pasa al subir desde 23:45.
> 4. Haz un selector decimal de 0 a 5 con paso 0.25 atado a un `IntVar` y mira cómo el widget y la variable dejan de coincidir. Cámbialo a `DoubleVar` y añade `format="%.2f"`.
> 5. Pon `command` en un selector y `trace_add` en su variable, los dos escribiendo en una lista. Usa las flechas, escribe a mano y cambia el valor desde un botón, y anota qué se enteró de qué.
> 6. Monta un selector con `values` de cinco tallas y otro equivalente con un `Combobox`. Decide cuál usarías para las tallas de una camiseta y cuál para elegir un país, y explica por qué.
