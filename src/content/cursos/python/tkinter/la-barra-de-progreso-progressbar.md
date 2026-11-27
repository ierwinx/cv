---
titulo: "La barra de progreso: Progressbar"
resumen: "Contar lo que tarda: los dos modos y cuándo usar cada uno, el step que da la vuelta sin avisar, la variable que deja de hacer caso a value, y cómo trocear el trabajo con after para que la barra se mueva de verdad."
minutos: 21
orden: 23
---

La `Progressbar` cierra los tres widgets del número, y es el único de los tres que **no** sirve para elegir: solo informa. Muestra cuánto falta de algo que está en marcha.

Eso la convierte en un widget peculiar, porque es el primero del bloque que **no tiene sentido por sí mismo**. Un botón se puede probar solo; una barra de progreso sin algo que tarde es una decoración. Y ahí está la dificultad real de la lección, que no es el widget (tiene diecisiete opciones y tres métodos, se aprende en diez minutos) sino conseguir que se mueva: si el programa se pone a trabajar, Tk deja de repintar y la barra se queda congelada justo cuando más falta hace.

Así que esta lección explica el widget y, con él, la técnica mínima para que sirva: **trocear el trabajo con `after`**. La versión completa del problema, con hilos y tareas que no se pueden trocear, tiene lección propia en el bloque E.

> [!objetivo] Qué vas a aprender
>
> Crear barras en sus dos modos y saber cuál corresponde a cada situación; mover el progreso con `value`, con `step` o con una variable, conociendo el comportamiento raro de las dos últimas; animar una barra indeterminada con `start` y `stop`; y trocear una tarea con `after` para que la ventana siga respondiendo y la barra avance.

## Solo existe en ttk

Como el `Combobox`:

```consola
>>> hasattr(tk, "Progressbar")
False
```

La barra de progreso llegó con los widgets temáticos, así que no hay decisión que tomar. Se crea con su longitud en píxeles y su orientación:

```python
barra = ttk.Progressbar(caja, orient="horizontal", length=240,
                        mode="determinate", maximum=100)
```

`length` es el largo de la barra, y en una vertical pasa a ser el alto:

```consola
>>> horizontal.winfo_reqwidth(), horizontal.winfo_reqheight()
(120, 16)
>>> vertical.winfo_reqwidth(), vertical.winfo_reqheight()
(16, 120)
```

Dieciséis píxeles de grosor en los dos casos, que es lo que dicta el tema y no se toca con una opción.

## Los dos modos

`mode` tiene dos valores y no son intercambiables:

```consola
>>> ttk.Progressbar(ventana, mode="z")
_tkinter.TclError: bad mode "z": must be determinate or indeterminate
```

**`determinate`** es la barra que todo el mundo conoce: se llena de izquierda a derecha en proporción a lo que falta. Es el valor por defecto, y el que quieres **siempre que puedas contar el trabajo de antemano**. Copiar 340 ficheros, procesar 5 000 filas, descargar un fichero cuyo tamaño conoces.

**`indeterminate`** es la barra que va y viene sin llenarse nunca. No dice cuánto falta, solo dice «esto sigue vivo». Es la que corresponde cuando no puedes contar: esperar una respuesta de la red, una consulta a la base de datos, buscar en un disco entero.

> [!consejo] Elige el modo según lo que sepas, no según lo que quede mejor
>
> La barra determinada queda mejor y transmite más, y por eso se usa a veces donde no toca, con un progreso inventado que avanza a saltos raros, se queda en el 90 % un minuto o llega al 100 % antes de terminar. Eso es peor que no tener barra: enseña una información falsa y quien la mira aprende a no fiarse.
>
> La regla es simple: **si no puedes contar el trabajo, la barra es indeterminada.** Y si puedes contarlo solo a medias, como una descarga sin tamaño conocido, lo honesto es una indeterminada con un texto al lado que diga lo que sí sabes («descargados 4,2 MB»).

## Mover una barra determinada

Hay tres formas y conviene conocer las tres, porque dos tienen sorpresa.

La primera es asignar `value` directamente, y es la más predecible:

```consola
>>> barra = ttk.Progressbar(ventana, maximum=100)
>>> barra.configure(value=25)
>>> barra.cget("value")
25
```

Lo importante de `value` es su relación con `maximum`: **la barra no trabaja en porcentajes**. El lleno es `maximum`, y si tu tarea son siete pasos, lo natural es `maximum=7` y valores del 0 al 7, sin convertir nada:

```consola
>>> pasos = ttk.Progressbar(ventana, maximum=7)
>>> pasos.configure(value=3)
>>> pasos.cget("value")
3
```

Tres de siete, y la barra se dibuja llena algo menos de la mitad. Calcular porcentajes a mano es un paso innecesario que además introduce redondeos.

La segunda forma es `step()`, que avanza una cantidad relativa. Y aquí está la sorpresa:

> [!aviso] `step()` da la vuelta en vez de pararse
>
> Al pasar del máximo, `step` no se queda en el tope: vuelve a empezar.
>
> ```consola
> >>> barra = ttk.Progressbar(ventana, maximum=100)
> >>> barra.configure(value=90)
> >>> barra.step(20)
> >>> barra.cget("value")
> 10.0
> ```
>
> Noventa más veinte son diez. La barra, que estaba casi llena, aparece casi vacía, y no hay ningún error ni aviso. En una tarea donde el número de pasos se calcula y puede pasarse por uno, el síntoma es una barra que llega al final y se reinicia sola, y es de los que cuesta reproducir.
>
> `configure(value=...)` no hace eso: se pasa del máximo sin protestar y se queda ahí, dibujándose llena.
>
> ```consola
> >>> barra.configure(value=150)
> >>> barra.cget("value")
> 150
> ```
>
> Así que la recomendación es **preferir `value` a `step()`** siempre que sepas en qué punto estás, que es casi siempre. `step()` solo compensa cuando de verdad no llevas la cuenta y solo puedes decir «un poco más».

La tercera forma es una variable de control, y tiene su propia rareza:

```consola
>>> nivel = tk.DoubleVar(value=60)
>>> barra = ttk.Progressbar(ventana, variable=nivel, maximum=100)
>>> barra.configure(value=20)
>>> barra.cget("value"), nivel.get()
(60, 60.0)
```

Le has dicho `value=20` y se ha quedado en 60. **Cuando hay una variable atada, `configure(value=...)` se ignora por completo**, sin error. La variable manda:

```consola
>>> nivel.set(20)
>>> barra.cget("value"), nivel.get()
(20, 20.0)
```

No es un fallo, es lo coherente: el valor vive en la variable. Pero produce un síntoma desconcertante, el de una barra que no se mueve aunque le estés asignando valores. La regla que lo evita: **si atas una variable, cambia siempre la variable**, y no mezcles las dos formas en el mismo programa. `step()`, curiosamente, sí funciona con variable y la actualiza.

## Mover una barra indeterminada

Esta no se mueve con valores, se anima:

```python
barra.start(20)     # empieza, y avanza cada 20 milisegundos
...
barra.stop()        # para y se queda en cero
```

```consola
>>> barra = ttk.Progressbar(ventana, mode="indeterminate", length=200)
>>> barra.cget("value")
0.0
>>> barra.start(20)
>>> barra.cget("value")     # después de dejarla correr un momento
5.0
>>> barra.stop()
>>> barra.cget("value")
0
```

El argumento de `start` son los milisegundos entre pasos, y sin argumento son 50. Bajarlo acelera el vaivén.

Lo que hay que entender es que **`start()` no arranca ningún trabajo**: solo anima la barra. Es un `after` interno que Tk gestiona por ti, y eso significa que la animación depende del bucle de eventos igual que todo lo demás. Si tu programa se pone a trabajar sin soltar el control, la barra indeterminada **se congela**, que es precisamente el contrario de lo que quería transmitir. Una barra indeterminada parada da la impresión de programa colgado, que es mucho peor que no tener barra.

Y no te olvides del `stop()`. Una barra indeterminada que nadie para sigue animándose para siempre, consumiendo un `after` cada veinte milisegundos y diciéndole a quien mira que el trabajo continúa.

## Que la barra se mueva de verdad

Llegamos al problema real. Este programa, que parece lo evidente, no funciona:

```python
def procesar():
        for i in range(TOTAL):            # mal
                hacer_un_trozo(i)
        progreso.set(i + 1)
```

La barra no se mueve. Se queda a cero hasta que el bucle termina y entonces salta al final de golpe, y mientras tanto la ventana está congelada y el sistema puede marcarla como bloqueada. Es el problema de la lección 3 del módulo, y aquí es donde se ve claro: **Tk solo repinta cuando le devuelves el control**, y un bucle no se lo devuelve nunca.

La solución mínima es darle la vuelta al bucle: en vez de recorrer los pasos, hacer **un paso y pedirle a Tk que te vuelva a llamar** para el siguiente.

```python
def procesar(i=0):
        """Un trozo por llamada. after devuelve el control a Tk entre trozos."""
    if i >= TOTAL:
                estado.set("Terminado")
        return

    hacer_un_trozo(i)
    progreso.set(i + 1)
    estado.set(f"Procesando {i + 1} de {TOTAL}")
    ventana.after(1, procesar, i + 1)
```

Esa última línea es toda la técnica. `after(1, procesar, i + 1)` dice «en un milisegundo, llama a `procesar` con `i + 1`», y al volver, Tk aprovecha para repintar la barra y atender el ratón. Comprobado sobre veinte pasos, la barra llega al final y el programa sigue vivo todo el rato:

```salida
trozos hechos: 20 | estado: Terminado
value: 20 de 20
variable: 20.0
```

Fíjate en que `after` acepta argumentos para la función, lo que permite llevar el contador sin variables globales. Y en que el `1` de espera no es el tiempo que tarda el trozo: es solo un margen para que Tk respire, y ponerlo a `0` también funciona.

> [!nota] Lo que esta técnica resuelve y lo que no
>
> Trocear con `after` funciona cuando el trabajo **se puede partir**: una lista de ficheros, un rango de filas, un montón de imágenes. Cada trozo tiene que ser corto, de unas décimas de segundo como mucho, porque durante un trozo la ventana sigue congelada; lo que se consigue es que esté congelada veinte veces cien milisegundos en vez de una vez dos segundos.
>
> Lo que no resuelve es el trabajo que no se puede partir: una consulta que tarda ocho segundos, una descarga, una llamada a una biblioteca que no vuelve hasta terminar. Ahí no hay trozos que hacer y `after` no sirve de nada. La respuesta a eso son los hilos, con el detalle importante de que **desde un hilo no se puede tocar un widget**, y por tanto hace falta un mecanismo para devolverle los datos al hilo principal. Eso es la lección de tareas largas del bloque E, y no merece la pena adelantarla: lo que hace falta ahora es saber que el bucle directo no vale y tener la solución del caso troceable, que cubre la mayoría.

## Las opciones

```consola
>>> sorted(ttk.Progressbar(ventana).configure().keys())
['anchor', 'class', 'cursor', 'font', 'foreground', 'justify', 'length',
 'maximum', 'mode', 'orient', 'phase', 'style', 'takefocus', 'text', 'value',
 'variable', 'wraplength']
```

Las que importan son seis: `mode`, `maximum`, `value`, `variable`, `length` y `orient`. `phase` es el contador interno de la animación indeterminada y no se toca.

Y los valores por omisión, que conviene conocer:

```consola
>>> barra = ttk.Progressbar(ventana)
>>> barra.cget("maximum"), barra.cget("value"), str(barra.cget("mode"))
(100.0, 0.0, 'determinate')
```

Las otras cinco (`text`, `anchor`, `font`, `foreground` y `wraplength`) son novedad de Tk 9 y sirven para **escribir dentro de la barra**:

```consola
>>> barra = ttk.Progressbar(ventana, maximum=100, value=40, text="40 %")
>>> barra.cget("text")
'40 %'
```

Es cómodo cuando lo hay, porque ahorra la etiqueta al lado. Pero vale la misma advertencia que con el `placeholder` del `Entry`: en Tk 8.6 esas opciones no existen y el programa falla al crearse. Si tu programa tiene que funcionar en las dos versiones, mira antes con qué cuentas:

```python
if tk.TkVersion >= 9.0:
        barra.configure(text=f"{porcentaje} %")
else:
        etiqueta.configure(text=f"{porcentaje} %")
```

O más sencillo, quédate con la etiqueta al lado, que funciona en todas partes y además admite texto más largo que el ancho de la barra.

## Las dos barras trabajando

```python title="progreso.py"
"""Progressbar: modo determinado troceando con after, e indeterminado animado."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

FICHEROS = tuple(f"informe-{n:03d}.csv" for n in range(1, 41))


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def crear_determinada(contenedor):
        """maximum es el número de ficheros: no hacen falta porcentajes."""
    caja = ttk.LabelFrame(contenedor, text="Procesar ficheros", padding=MARGEN)
    caja.pack(fill="x")

    ttk.Progressbar(caja, orient="horizontal", length=380, mode="determinate",
                    maximum=len(FICHEROS), variable=hechos).pack(fill="x")
    ttk.Label(caja, textvariable=estado, anchor="w").pack(
        fill="x", pady=(AIRE, 0))

    fila = ttk.Frame(caja)
    fila.pack(fill="x", pady=(AIRE, 0))
    global boton_procesar
    boton_procesar = ttk.Button(fila, text="Procesar", width=11,
                                command=empezar)
    boton_procesar.pack(side="left")
    ttk.Button(fila, text="Reiniciar", width=11, command=reiniciar).pack(
        side="left", padx=AIRE)
    return caja


def crear_indeterminada(contenedor):
        """Sin forma de contar el trabajo: solo dice que sigue vivo."""
    global barra_espera, boton_espera
    caja = ttk.LabelFrame(contenedor, text="Consultar al servidor",
                          padding=MARGEN)
    caja.pack(fill="x", pady=(MARGEN, 0))

    barra_espera = ttk.Progressbar(caja, orient="horizontal", length=380,
                                   mode="indeterminate")
    barra_espera.pack(fill="x")
    ttk.Label(caja, textvariable=espera, anchor="w").pack(
        fill="x", pady=(AIRE, 0))

    boton_espera = ttk.Button(caja, text="Consultar", width=11,
                              command=alternar_espera)
    boton_espera.pack(anchor="w", pady=(AIRE, 0))
    return caja


def empezar():
        """Arranca el troceado. El botón se apaga para no lanzarlo dos veces."""
    hechos.set(0)
    boton_procesar.configure(state="disabled")
    procesar()


def procesar(i=0):
        """Un fichero por llamada, devolviendo el control a Tk entre cada uno."""
    if i >= len(FICHEROS):
                estado.set(f"Terminado: {len(FICHEROS)} ficheros procesados")
        boton_procesar.configure(state="normal")
        return

    trabajar(FICHEROS[i])
    # La variable, no configure(value=...): con variable atada se ignora.
    hechos.set(i + 1)
    estado.set(f"{FICHEROS[i]} — {i + 1} de {len(FICHEROS)}")
    ventana.after(1, procesar, i + 1)


def trabajar(nombre):
        """El trozo de trabajo de verdad. Aquí, algo que cuesta un poco."""
    return sum(len(nombre) * n % 7 for n in range(60_000))


def reiniciar():
        hechos.set(0)
    estado.set("Listo")


def alternar_espera():
        """start() solo anima; el trabajo real iría aparte, en un hilo."""
    global esperando
    esperando = not esperando
    if esperando:
                barra_espera.start(20)
        espera.set("Esperando respuesta...")
        boton_espera.configure(text="Cancelar")
    else:
        # Sin este stop la barra seguiría animándose para siempre.
                barra_espera.stop()
        espera.set("Consulta cancelada")
        boton_espera.configure(text="Consultar")


ventana = tk.Tk()
ventana.title("Progreso")
ventana.minsize(460, 320)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
hechos = tk.DoubleVar(value=0)
estado = tk.StringVar(value="Listo")
espera = tk.StringVar(value="Sin consultar")
esperando = False
boton_procesar = None
barra_espera = None
boton_espera = None

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

crear_determinada(cuerpo)
crear_indeterminada(cuerpo)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
ttk.Label(cuerpo, text="Pulsa Procesar y mueve la ventana mientras avanza: "
                       "sigue respondiendo porque el trabajo va en trozos.",
          wraplength=400, justify="left", foreground="#6E6E73").pack(anchor="w")

centrar(ventana)
ventana.mainloop()
```

Ese programa se puede usar para comprobar las dos cosas de la lección. Pulsa «Procesar» y arrastra la ventana mientras avanza: responde, porque entre fichero y fichero Tk recupera el control. Después cambia `procesar` por un bucle `for` normal y vuelve a probarlo: la barra se queda a cero, la ventana no se mueve y al final todo salta de golpe.

Lo otro que merece mirarse son dos detalles del código. `maximum` es el número de ficheros y no 100, así que no hay ningún porcentaje que calcular. Y el progreso se mueve con `hechos.set(...)` y no con `configure(value=...)`, porque la barra tiene una variable atada y en ese caso `value` se ignora.

> [!resumen] En resumen
>
> La `Progressbar` es el único de los tres widgets del número que no sirve para elegir sino para informar, y solo existe en la familia temática. Sus dos modos no son intercambiables: `determinate` se llena en proporción y es el correcto cuando puedes contar el trabajo de antemano, mientras `indeterminate` solo dice que algo sigue vivo y es el honesto cuando no puedes contarlo; inventarse un progreso es peor que no tener barra. Una barra determinada no trabaja en porcentajes, sino que su lleno es `maximum`, de modo que lo natural es poner ahí el número de pasos y olvidarse de convertir. De las tres formas de moverla, `value` es la predecible, `step()` tiene la trampa de dar la vuelta al pasar del máximo en lugar de pararse, y una variable atada hace que `configure(value=...)` se ignore por completo y sin error, así que si atas una variable hay que cambiar siempre la variable. La indeterminada se anima con `start`, cuyo argumento son los milisegundos entre pasos, y hay que acordarse de `stop`, porque si no sigue animándose para siempre; y como la animación depende del bucle de eventos, un programa que se pone a trabajar la congela, que es lo contrario de lo que pretendía. De ahí lo fundamental: un bucle normal deja la barra a cero y la ventana bloqueada, porque Tk solo repinta cuando le devuelves el control, y la solución para el trabajo que se puede partir es hacer un trozo por llamada y encadenar con `after`, que también admite pasar argumentos para llevar el contador. Eso vale para lo troceable; para lo que no se puede partir hacen falta hilos, que es materia del bloque E. Y las opciones de texto dentro de la barra son novedad de Tk 9, así que en 8.6 sigue haciendo falta una etiqueta al lado.

> [!ejercicio] Practica
>
> Trabaja en un fichero `23-progreso.py` salvo donde se indique otra cosa:
>
> 1. Crea una barra determinada con `maximum=10` y dos botones que suban y bajen el valor de uno en uno. Comprueba qué se dibuja con `value=0` y con `value=10`.
> 2. Pon una barra en `value=95` y llámala con `step(10)`. Anota en qué valor se queda y explica por qué. Después hazlo con `configure(value=...)` y compara.
> 3. Ata una barra a un `DoubleVar` e intenta moverla con `configure(value=50)`. Comprueba que no pasa nada y arréglalo.
> 4. Escribe en `23-bucle.py` una tarea de 50 pasos que mueva una barra dentro de un `for` normal. Ejecútalo, intenta mover la ventana mientras corre y anota el resultado. Después conviértelo al patrón de `after`.
> 5. Haz un botón que arranque una barra indeterminada y otro que la pare. Prueba a arrancarla y, sin pararla, lanzar un bucle que tarde tres segundos: mira qué le pasa a la animación.
> 6. Monta una barra determinada que procese una lista de ficheros reales de una carpeta con `pathlib`, contando líneas de cada uno, con el nombre del fichero actual en una etiqueta y un botón que se deshabilite mientras trabaja.
