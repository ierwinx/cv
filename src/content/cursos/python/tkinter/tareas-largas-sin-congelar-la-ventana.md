---
titulo: "Tareas largas sin congelar la ventana"
resumen: "Por qué se queda muerta, el update() que parece arreglarlo y es peor, el after que muere con su widget y el que no, y el hilo que toca un widget y revienta cuando le da la gana."
minutos: 28
orden: 42
---

Todo programa con ventana llega a esto: una tarea que tarda. Leer mil ficheros, pedir algo por la red, procesar una imagen. Y lo que pasa es siempre lo mismo: la ventana se queda blanca, deja de responder, el sistema la marca como no responde, y al acabar vuelve a la vida como si nada.

Esta lección explica por qué, y da las dos herramientas. La primera, `after`, resuelve el noventa por ciento de los casos y no tiene ningún peligro. La segunda, los hilos, resuelve el resto y tiene un peligro de los malos: **Tk no es seguro para hilos, y cuando se incumple el fallo llega cuando le da la gana.**

> [!objetivo] Qué vas a aprender
>
> Entender por qué se congela, para no intentar arreglarlo con el remedio que lo empeora; usar `after` para repetir, animar y partir trabajo en trozos, sabiendo cuál de los dos sitios donde se programa deja un `after` peligroso; y cuando `after` no baste, mover el trabajo a un hilo con el único patrón que funciona, que es una cola y nada más.

## Por qué se congela

`mainloop` es un bucle en **un solo hilo**: saca un evento, llama a tu función, vuelve a por el siguiente. Y mientras tu función corre, el bucle está parado. No procesa clics, no atiende al teclado, y sobre todo **no redibuja**, porque redibujar también es un evento.

Eso tiene una consecuencia que sorprende:

```python
for i in range(3):
        etiqueta.configure(text=str(i))
    trabajar()                        # algo que tarda
```

La etiqueta cambia tres veces, pero **no se ve cambiar ninguna**. Los tres `configure` solo apuntan que hay que redibujar; el dibujo real ocurre cuando el control vuelve al bucle, y entonces ya vale `2`. Es la razón de que las barras de progreso hechas así no se muevan nunca.

> [!error] El `update()` que parece arreglarlo
>
> En cuanto uno descubre el problema encuentra este remedio, y está en la mitad de los foros:
>
> ```python
> for i in range(3):
>         etiqueta.configure(text=str(i))
>     ventana.update()                  # NO
>     trabajar()
> ```
>
> Y funciona: la etiqueta se ve cambiar. El problema es **qué más hace `update()`**: procesa *todos* los eventos pendientes, incluidos los clics. Así que si alguien pulsa el botón que lanzó esta tarea mientras la tarea corre, el manejador se ejecuta **dentro** de la tarea, y ahora hay dos copias del mismo bucle corriendo, cada una modificando lo mismo. El nombre técnico es reentrada, y produce fallos imposibles de reproducir: contadores que van al revés, listas que se quedan a medias, y de vez en cuando un desbordamiento de la pila.
>
> Peor aún: si el manejador reentrante destruye un widget que la tarea de fuera está usando, la tarea de fuera revienta con un `invalid command name` que no tiene nada que ver con lo que estaba haciendo.
>
> Hay un primo aceptable, **`update_idletasks()`**, que solo procesa las tareas de dibujo y **no** los eventos de entrada. Ese es el que usa la función `centrar()` de todos los ejemplos del curso, y el que hacía falta para el `sashpos` de la lección 29. Se puede usar para forzar un redibujado, pero no convierte una tarea larga en algo que responda: la ventana se sigue viendo muerta, solo que con el texto actualizado.
>
> **La regla: `update()` nunca; `update_idletasks()` cuando necesitas que Tk calcule algo ya.**

## `after`, que resuelve casi todo

`after` programa una función para dentro de un rato y **devuelve el control inmediatamente**:

```consola
>>> identificador = ventana.after(1000, funcion)
>>> identificador
'after#0'
>>> ventana.after_info()
('after#0',)
>>> ventana.after_cancel(identificador)
>>> ventana.after_info()
()
```

Dos detalles prácticos. El primero es que **los argumentos van sueltos**, sin `lambda`:

```python
ventana.after(100, procesar, lote, numero)      # no hace falta lambda
```

El segundo es el comportamiento de `after_cancel`, que no es uniforme:

```consola
>>> ventana.after_cancel(ya_ejecutado)
>>> # aceptado, sin error
>>> ventana.after_cancel("after#9999")
>>> # aceptado, sin error
>>> ventana.after_cancel(None)
ValueError: id must be a valid identifier returned from after or after_idle
```

Cancelar algo que ya corrió o que no existe es inofensivo, **pero cancelar `None` lanza excepción**. Y `None` es exactamente lo que vale la variable antes del primer `after`, así que el guardián es obligatorio:

```python
if self.pendiente is not None:
        self.after_cancel(self.pendiente)
```

Y hay un pariente, `after_idle`, que espera a que no haya nada más que hacer. El orden entre los dos no es el que uno supone:

```consola
>>> ventana.after_idle(lambda: orden.append("idle"))
>>> ventana.after(0, lambda: orden.append("after0"))
>>> ventana.update()
>>> orden
['after0', 'idle']
```

**`after(0)` se ejecuta antes que un `after_idle` pedido primero**, porque las tareas de reposo son las últimas de la cola. `after_idle` es para «cuando la ventana esté ya dibujada», que es el caso del `sashpos` de la lección 29.

### La cadena

Un `after` solo se ejecuta una vez. Lo que se repite es una cadena: la función se vuelve a programar al acabar.

```consola
>>> def tic(n=0):
...     pasos.append(n)
...     if n < 4:
...         ventana.after(1, tic, n + 1)
>>> tic()
>>> pasos
[0, 1, 2, 3, 4]
```

Ese patrón sirve para las tres cosas que se necesitan:

- **Un reloj o un contador**: `after(1000, self.actualizar_hora)` dentro de `actualizar_hora`.
- **Una animación**: mover un poco y volver a programarse, como el `Canvas` de la lección 26.
- **Partir trabajo en trozos**, que es lo que convierte una tarea larga en algo que responde:

```python
def procesar_lote(self, pendientes, hechos=0):
        """Un trozo por vuelta, y entre trozo y trozo la ventana respira."""
    lote, resto = pendientes[:TAMANO_LOTE], pendientes[TAMANO_LOTE:]
    for elemento in lote:
                self.procesar(elemento)
    hechos += len(lote)
    self.progreso.set(hechos / self.total * 100)
    if resto and not self.cancelado:
                self.pendiente = self.after(1, self.procesar_lote, resto, hechos)
    else:
                self.terminar(hechos)
```

Entre un `after` y el siguiente, el bucle de eventos recupera el control: dibuja, atiende clics, y por eso el botón de cancelar funciona. El tamaño del lote es el único ajuste: demasiado pequeño y se pierde tiempo en el ida y vuelta, demasiado grande y la ventana da tirones. Unas decenas de milisegundos de trabajo por lote es lo que se siente fluido.

> [!aviso] Un `after` sobre el widget muere con él; sobre la ventana, no
>
> Esto está medido y es la diferencia entre un programa que se cierra limpio y uno que escupe errores al salir.
>
> ```consola
> >>> # programado en el widget, y luego se destruye el widget
> >>> widget.after(30, funcion)
> >>> widget.destroy()
> >>> # resultado: la función NO se ejecuta
> >>> # programado en la ventana, y luego se destruye el widget
> >>> ventana.after(30, funcion)
> >>> widget.destroy()
> >>> # resultado: la función SÍ se ejecuta
> >>> # y si toca el widget: TclError: invalid command name ".!label2"
> ```
>
> Los temporizadores no pertenecen al widget: viven en el intérprete. Pero Tkinter registra la función como una orden **del widget** sobre el que llamas a `after`, y `destroy()` borra las órdenes de ese widget, con lo que el temporizador salta y no encuentra nada que llamar. Si lo programaste en la ventana, la orden sigue viva, la función corre, y al tocar un widget que ya no está lanza `invalid command name`.
>
> De ahí dos reglas:
>
> 1. **Programa los `after` sobre el widget que van a tocar** (`self.after(...)` dentro de una pieza de la lección 40), no sobre la ventana. Eso hace que cerrar la ventana no deje cadáveres.
> 2. Cuando eso no baste, porque la cadena tiene que sobrevivir a un widget concreto o porque hay que pararla antes, **cancélala en `<Destroy>`**, que es exactamente lo que hacía el buscador de la lección 40. Y recuerda que `after_info()` **sigue listando el temporizador como pendiente** aunque ya no vaya a hacer nada, así que no sirve para saber si queda algo vivo.

## Hilos, cuando `after` no basta

`after` parte trabajo **tuyo** en trozos. No sirve cuando lo que tarda es una sola llamada que no se puede partir y que se queda parada esperando: una petición de red, una consulta a una base de datos remota, leer un fichero de un disco lento. Ahí no hay trozos: hay una línea que tarda dos segundos.

Para eso está un hilo. Y hay una sola regla, que no admite excepciones:

> [!error] Un hilo no puede tocar un solo widget
>
> Tk no es seguro para hilos. Lo que pasa al intentarlo, medido:
>
> ```consola
> >>> def desde_hilo():
> ...     etiqueta.configure(text="desde el hilo")
> >>> threading.Thread(target=desde_hilo).start()
> RuntimeError: main thread is not in main loop
> ```
>
> Ese es el caso **bueno**, porque al menos falla con un mensaje. Lo que hace que esto sea peligroso es que no siempre falla: dependiendo de en qué esté el bucle de eventos en ese microsegundo, la misma línea puede funcionar, puede lanzar ese `RuntimeError`, puede lanzar un `TclError` sin sentido, o puede **colgar el proceso entero** sin ningún mensaje. O sea que un programa con esta clase de fallo puede pasar todas las pruebas y fallar en otra máquina.
>
> La regla, entonces: **el hilo no toca widgets, no lee widgets, no lee variables de control y no llama a `update`.** Solo hace su trabajo y deja el resultado en una cola.

### El patrón completo

Son tres piezas, y las tres son necesarias.

**La cola**, que es el único punto de contacto entre los dos mundos. `queue.Queue` está pensada precisamente para esto y es segura para hilos, así que no hace falta ningún candado.

**El trabajador**, que corre en el hilo y no sabe nada de la interfaz:

```python
def trabajar(cola, carpeta, parar):
        """Corre en el hilo. Ni un widget, ni una variable de control."""
    try:
                for numero, fichero in enumerate(carpeta.rglob("*"), start=1):
                        if parar.is_set():                 # la cancelación
                                cola.put(("cancelado", numero))
                return
            cola.put(("progreso", numero, fichero.name))
        cola.put(("hecho", numero))
    except Exception as error:                 # obligatorio: ver abajo
                cola.put(("error", error))
```

**El vaciador**, que corre en el hilo principal llamado por una cadena de `after`, y es el único que toca la interfaz:

```python
def vaciar_cola(self):
        """En el hilo principal: aquí sí se toca la interfaz."""
    try:
                while True:                       # el while, no un solo get
                        mensaje = self.cola.get_nowait()
            self.atender(mensaje)
    except queue.Empty:
                pass
    if self.hilo is not None and self.hilo.is_alive():
                self.pendiente = self.after(RITMO, self.vaciar_cola)
```

Tres detalles del vaciador que importan. El **`while`** en vez de un solo `get`: si el hilo produce más rápido que el ritmo del `after`, con un mensaje por vuelta la cola crece sin parar y la interfaz se queda minutos por detrás. El **`get_nowait`** y no `get()`: `get()` bloquea esperando, y bloquear en el hilo principal es exactamente lo que estábamos evitando. Y el **`is_alive()`** para dejar de programarse: si no, la cadena de `after` sigue viva para siempre consumiendo ciclos.

> [!error] La excepción de un hilo se pierde
>
> ```consola
> >>> def revienta(): raise ValueError("fallo en el hilo")
> >>> hilo = threading.Thread(target=revienta)
> >>> hilo.start(); hilo.join()
> >>> # el hilo principal no se ha enterado de nada
> ```
>
> El rastro sale por la salida de errores y el hilo principal sigue como si el trabajo hubiera ido bien: la barra de progreso se queda a la mitad para siempre y el botón de cancelar sigue activo, sin ninguna explicación.
>
> Así que el `try`/`except` alrededor de **todo** el trabajo del hilo no es una precaución opcional: es la única forma de que el fallo llegue al otro lado. Y se manda por el mismo canal que lo demás, con `cola.put(("error", error))`, que además deja la decisión de cómo avisar en la capa que le toca, como en la lección 41.

### Cancelar y cerrar

Un hilo no se puede matar desde fuera en Python, así que la cancelación es **cooperativa**: se le pide que pare y él comprueba.

```python
self.parar = threading.Event()
...
self.parar.set()              # al pulsar Cancelar
```

Y el hilo mira `parar.is_set()` en cada vuelta de su bucle. Una bandera booleana normal también funcionaría, pero `threading.Event` es lo que hay para esto y además permite esperar sobre ella.

Y siempre **`daemon=True`**:

```python
self.hilo = threading.Thread(target=trabajar, args=(...), daemon=True)
```

Sin eso, un hilo que no ha terminado **mantiene el proceso vivo después de cerrar la ventana**: la ventana desaparece, y el programa sigue en la lista de procesos hasta que el hilo acabe. Con `daemon=True` el hilo muere con el proceso.

## Cuál de las dos

| Situación | Herramienta |
| --- | --- |
| Un reloj, un contador, una animación | `after` en cadena |
| Esperar a que alguien deje de escribir | `after` con `after_cancel`, lección 23 |
| Recorrer diez mil elementos tuyos | `after` por lotes |
| Una llamada que se queda esperando (red, disco lento) | un hilo con cola |
| Cálculo puro que ocupa la CPU al cien por cien | un **proceso**, no un hilo |

La última fila merece una nota: en Python los hilos no aprovechan varios núcleos para cálculo puro, porque solo uno ejecuta código de Python a la vez. Para eso está `multiprocessing`, que se sale de este curso; pero para lo que hace un programa con ventana (esperar a la red, al disco, a una base de datos) los hilos valen perfectamente, porque mientras esperan no consumen nada.

## El ejemplo

Un contador de ficheros con las dos técnicas a la vez: un reloj con `after` en cadena, el recuento en un hilo con su cola, progreso real, cancelación y aviso de errores.

```python title="tareas.py"
"""after para lo periódico y un hilo con cola para lo que espera."""

import pathlib
import queue
import threading
import time
import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
VERDE = "#2E7D32"
ROSA = "#C2185B"

ESPANOL = str.maketrans(",.", ".,")   # 1,234.5 -> 1.234,5

RITMO_COLA = 50        # ms entre vaciados de la cola
RITMO_RELOJ = 200      # ms entre actualizaciones del cronómetro
TAMANO_LOTE = 200      # elementos por vuelta en el recuento por lotes


def contar_ficheros(cola, carpeta, parar):
        """Corre en el hilo. Ni un widget, ni una variable de control.

    Todo va por la cola, incluidos los errores: la excepción de un hilo se
    pierde, y el hilo principal se quedaría esperando para siempre.
    """
    try:
                cuantos = 0
        bytes_totales = 0
        for ruta in carpeta.rglob("*"):
                        if parar.is_set():                  # cancelación cooperativa
                                cola.put(("cancelado", cuantos))
                return
            if not ruta.is_file():
                                continue
            cuantos += 1
            try:
                                bytes_totales += ruta.stat().st_size
            except OSError:
                                pass                            # enlaces roto, permisos
            if cuantos % 25 == 0:
                                cola.put(("progreso", cuantos, bytes_totales, ruta.name))
        cola.put(("hecho", cuantos, bytes_totales))
    except Exception as error:
                cola.put(("error", error))


class Cronometro(ttk.Frame):
        """Una cadena de after. Los programa sobre sí mismo, no sobre la ventana.

    Así, al destruirse el widget, el temporizador pendiente no se ejecuta.
    """

    def __init__(self, padre, **opciones):
                super().__init__(padre, **opciones)
        self.texto = tk.StringVar(value="0,0 s")
        self.inicio = None
        self.pendiente = None
        ttk.Label(self, textvariable=self.texto, foreground=GRIS).pack()
        self.bind("<Destroy>", self.al_destruir)

    def arrancar(self):
                self.inicio = time.monotonic()
        self.parar()
        self.latir()

    def latir(self):
                transcurrido = time.monotonic() - self.inicio
        self.texto.set(f"{transcurrido:.1f} s".replace(".", ","))
        # self.after y no ventana.after: el temporizador muere con la pieza.
        self.pendiente = self.after(RITMO_RELOJ, self.latir)

    def parar(self):
        # after_cancel(None) lanza ValueError, así que el guardián no es opcional.
                if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
            self.pendiente = None

    def al_destruir(self, evento):
                if evento.widget is self:       # <Destroy> llega de cada descendiente
                        self.parar()


class Aplicacion(tk.Tk):

        def __init__(self):
                super().__init__()
        self.title("Tareas largas")
        self.minsize(560, 360)

        self.cola = queue.Queue()
        self.hilo = None
        self.parar = None
        self.vaciando = None
        self.por_lotes = None

        self.carpeta = tk.StringVar(value=str(pathlib.Path.home()))
        self.estado = tk.StringVar(value="Sin empezar")
        self.detalle = tk.StringVar()
        self.avance = tk.DoubleVar(value=0)

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        fila = ttk.Frame(cuerpo)
        fila.pack(fill="x")
        ttk.Label(fila, text="Carpeta:").pack(side="left")
        ttk.Entry(fila, textvariable=self.carpeta).pack(side="left", fill="x",
                                                        expand=True, padx=AIRE)

        marco = ttk.Labelframe(cuerpo, text="En un hilo, con cola",
                               padding=MARGEN)
        marco.pack(fill="x", pady=(MARGEN, 0))
        # Barra indeterminada: no se sabe cuántos ficheros hay hasta el final.
        self.barra = ttk.Progressbar(marco, mode="indeterminate", length=300)
        self.barra.pack(fill="x")
        botones = ttk.Frame(marco)
        botones.pack(fill="x", pady=(AIRE, 0))
        self.boton_contar = ttk.Button(botones, text="Contar ficheros",
                                       command=self.empezar)
        self.boton_contar.pack(side="left")
        self.boton_cancelar = ttk.Button(botones, text="Cancelar",
                                        command=self.cancelar,
                                        state="disabled")
        self.boton_cancelar.pack(side="left", padx=AIRE)
        self.cronometro = Cronometro(botones)
        self.cronometro.pack(side="right")

        lotes = ttk.Labelframe(cuerpo, text="Con after, por lotes",
                               padding=MARGEN)
        lotes.pack(fill="x", pady=(MARGEN, 0))
        self.barra_lotes = ttk.Progressbar(lotes, mode="determinate",
                                           variable=self.avance, maximum=100,
                                           length=300)
        self.barra_lotes.pack(fill="x")
        self.boton_lotes = ttk.Button(lotes, text="Sumar diez mil números",
                                      command=self.empezar_lotes)
        self.boton_lotes.pack(anchor="w", pady=(AIRE, 0))

        ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
        self.pie = ttk.Label(cuerpo, textvariable=self.estado)
        self.pie.pack(anchor="w")
        ttk.Label(cuerpo, textvariable=self.detalle, foreground=GRIS,
                  wraplength=500).pack(anchor="w", pady=(AIRE, 0))

        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)
        self.centrar()

    # --- el hilo con cola

    def empezar(self):
                if self.hilo is not None and self.hilo.is_alive():
                        return
        carpeta = pathlib.Path(self.carpeta.get()).expanduser()
        if not carpeta.is_dir():
                        self.estado.set("Eso no es una carpeta")
            self.pie.configure(foreground=ROSA)
            return
        self.parar = threading.Event()
        # daemon=True: sin esto, el proceso sigue vivo tras cerrar la ventana.
        self.hilo = threading.Thread(target=contar_ficheros,
                                     args=(self.cola, carpeta, self.parar),
                                     daemon=True)
        self.hilo.start()
        self.boton_contar.configure(state="disabled")
        self.boton_cancelar.configure(state="normal")
        self.estado.set("Contando…")
        self.pie.configure(foreground=GRIS)
        self.barra.start(20)
        self.cronometro.arrancar()
        self.vaciando = self.after(RITMO_COLA, self.vaciar_cola)

    def vaciar_cola(self):
                """En el hilo principal: el único sitio donde se toca la interfaz."""
        try:
                        while True:                     # el while, no un solo get
                                self.atender(self.cola.get_nowait())
        except queue.Empty:
                        pass
        # is_alive para dejar de programarse: si no, la cadena vive para siempre.
        if self.hilo is not None and self.hilo.is_alive():
                        self.vaciando = self.after(RITMO_COLA, self.vaciar_cola)
        else:
                        self.vaciando = None

    def atender(self, mensaje):
                clase = mensaje[0]
        if clase == "progreso":
                        _, cuantos, tamano, nombre = mensaje
            self.estado.set(f"{self.miles(cuantos)} ficheros…")
            self.detalle.set(f"{self.mega(tamano)} — {nombre}")
        elif clase == "hecho":
                        _, cuantos, tamano = mensaje
            self.terminar(f"{self.miles(cuantos)} ficheros, {self.mega(tamano)}",
                          VERDE)
        elif clase == "cancelado":
                        self.terminar(f"Cancelado tras {self.miles(mensaje[1])} ficheros", GRIS)
        elif clase == "error":
            # La lógica avisa, la interfaz decide cómo. Lección 41.
                        self.terminar(f"No se ha podido leer: {mensaje[1]}", ROSA)

    def terminar(self, mensaje, color):
                self.estado.set(mensaje)
        self.pie.configure(foreground=color)
        self.barra.stop()
        self.cronometro.parar()
        self.boton_contar.configure(state="normal")
        self.boton_cancelar.configure(state="disabled")

    def cancelar(self):
                """Cooperativa: no se mata el hilo, se le pide que pare."""
        if self.parar is not None:
                        self.parar.set()
        self.boton_cancelar.configure(state="disabled")
        self.estado.set("Cancelando…")

    # --- los lotes con after

    def empezar_lotes(self):
                self.boton_lotes.configure(state="disabled")
        self.avance.set(0)
        self.procesar_lote(list(range(10_000)), 0, 0)

    def procesar_lote(self, pendientes, hechos, suma):
                """Un trozo por vuelta; entre trozo y trozo la ventana respira."""
        lote, resto = pendientes[:TAMANO_LOTE], pendientes[TAMANO_LOTE:]
        suma += sum(n * n for n in lote)
        hechos += len(lote)
        self.avance.set(hechos / 10_000 * 100)
        self.detalle.set(f"{self.miles(hechos)} de 10.000 — "
                         f"suma {self.miles(suma)}")
        if resto:
                        self.por_lotes = self.after(1, self.procesar_lote, resto, hechos,
                                        suma)
        else:
                        self.por_lotes = None
            self.estado.set(f"Suma de cuadrados: {self.miles(suma)}")
            self.pie.configure(foreground=VERDE)
            self.boton_lotes.configure(state="normal")

    # --- lo demás

    # --- el formateo es de la interfaz, lección 41

    @staticmethod
    def miles(entero):
                """1.234.567 a la española. translate intercambia los dos de una vez;
        con dos replace seguidos el segundo deshace el primero."""
        return f"{entero:,}".translate(ESPANOL)

    @staticmethod
    def mega(bytes_totales):
                return f"{bytes_totales / 1024 / 1024:,.1f} MB".translate(ESPANOL)

    def al_cerrar(self):
                """Parar las cadenas antes de irse, para no dejar cadáveres."""
        if self.parar is not None:
                        self.parar.set()
        for pendiente in (self.vaciando, self.por_lotes):
                        if pendiente is not None:
                                self.after_cancel(pendiente)
        self.destroy()

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


if __name__ == "__main__":
        Aplicacion().mainloop()
```

> [!resumen] En resumen
>
> La ventana se congela porque **`mainloop` es un bucle en un solo hilo**: mientras tu función corre, no procesa clics ni redibuja, y por eso tres `configure` seguidos con trabajo en medio no se ven cambiar ninguno. El remedio que está en todos los foros, **`update()`, es peor que el problema**: procesa *todos* los eventos pendientes, incluidos los clics, así que el manejador del botón que lanzó la tarea puede ejecutarse **dentro** de la tarea, con dos copias del mismo bucle tocando lo mismo; el primo aceptable es **`update_idletasks()`**, que solo procesa el dibujo y es el que usan `centrar()` y el `sashpos` de la lección 29, pero no hace que la ventana responda. **`after`** resuelve casi todo: devuelve un identificador, acepta **argumentos sueltos sin `lambda`**, y de `after_cancel` hay que saber que cancelar algo ya ejecutado o inventado es inofensivo **pero cancelar `None` lanza `ValueError`**, y `None` es justo lo que vale la variable antes del primer `after`. `after(0)` se ejecuta **antes** que un `after_idle` pedido primero, porque las tareas de reposo van al final de la cola. Lo que se repite es una **cadena**: la función se vuelve a programar al acabar, y eso sirve para un reloj, para una animación y para **partir trabajo en lotes**, que es lo que convierte una tarea larga en algo que responde, porque entre lote y lote el bucle recupera el control y el botón de cancelar funciona. Y un hallazgo medido: **un `after` programado sobre el widget no se ejecuta si el widget se destruye, y uno programado sobre la ventana sí**, y entonces revienta con `invalid command name` al tocar lo que ya no está; de ahí que los `after` se programen con `self.after(...)` dentro de la pieza, y que cuando eso no baste se cancelen en `<Destroy>` (con `after_info()` sin servir para comprobarlo, porque sigue listando lo que ya no va a correr). Los **hilos** son para lo que no se puede partir y se queda esperando (red, disco lento), y tienen una regla sin excepciones: **un hilo no toca, ni lee, ni pregunta nada a la interfaz**, porque Tk no es seguro para hilos; el caso bueno es `RuntimeError: main thread is not in main loop`, y el malo es que **a veces funciona**, así que el programa puede pasar todas las pruebas y fallar en otra máquina. El patrón son tres piezas: una `queue.Queue`, un trabajador que solo pone mensajes, y un vaciador llamado por una cadena de `after` que es el único que toca la interfaz, con **`while` y no un solo `get`** (si no la cola crece y la interfaz se queda por detrás), **`get_nowait` y no `get()`** (que bloquearía el hilo principal) y **`is_alive()`** para dejar de programarse. **La excepción de un hilo se pierde**, así que el `try`/`except` alrededor de todo el trabajo es obligatorio y el error se manda por la cola. Cancelar es **cooperativo** con un `threading.Event` que el hilo consulta, porque en Python no se puede matar un hilo desde fuera; y **`daemon=True`** siempre, porque sin eso el proceso sigue vivo después de cerrar la ventana. Para cálculo puro que ocupa la CPU, los hilos no sirven y hace falta un proceso.

> [!ejercicio] Practica
>
> Trabaja en un fichero `42-tareas.py` salvo donde se indique otra cosa:
>
> 1. Escribe un bucle que cambie una etiqueta diez veces con `time.sleep(0.2)` en medio. Comprueba que no se ve cambiar.
> 2. Añade `ventana.update()` dentro del bucle y comprueba que ahora sí. Después pulsa el botón que lo lanzó mientras corre y explica lo que pasa.
> 3. Cámbialo a `update_idletasks()` y comprueba qué se ve y qué no responde.
> 4. Reescríbelo con una cadena de `after` y comprueba que el botón responde durante la tarea.
> 5. Imprime el identificador que devuelve `after` y mira `after_info()` antes y después de `after_cancel`.
> 6. En `42-cancel.py`, llama a `after_cancel(None)`, a `after_cancel` de un identificador ya ejecutado y de uno inventado. Copia los tres resultados.
> 7. Pide un `after_idle` y después un `after(0)` y comprueba en qué orden se ejecutan.
> 8. En `42-cadaver.py`, programa un `after` sobre un widget y otro sobre la ventana, destruye el widget y comprueba cuál se ejecuta. Haz que el callback toque el widget y copia el error.
> 9. Monta el recuento por lotes con `TAMANO_LOTE` de 1, de 200 y de 100.000. Anota cómo se siente cada uno.
> 10. En `42-mal.py`, haz que un hilo cambie el texto de una etiqueta en un bucle. Ejecútalo cinco veces y anota cuántas fallan y con qué error.
> 11. Escribe el patrón de cola completo con progreso y cancelación. Quita el `while` del vaciador y comprueba qué pasa si el hilo produce rápido.
> 12. Haz que el hilo lance una excepción a mitad. Comprueba que sin el `try` la interfaz se queda esperando, y añádelo para que el error llegue.
> 13. Quita el `daemon=True`, cierra la ventana mientras el hilo trabaja y comprueba en el monitor del sistema si el proceso sigue vivo.
