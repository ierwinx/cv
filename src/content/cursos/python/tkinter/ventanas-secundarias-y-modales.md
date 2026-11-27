---
titulo: "Ventanas secundarias y modales"
resumen: "La ventana que parpadea en la esquina antes de que la coloques, el orden de once pasos de una modal, el grab anidado que rompe el de fuera, y por qué el resultado no lo devuelve wait_window."
minutos: 26
orden: 38
---

Los diálogos de las dos lecciones anteriores los pinta el sistema y no se pueden cambiar. Cuando hace falta pedir cinco cosas a la vez, o mostrar una tabla, o dejar unas preferencias abiertas mientras se trabaja, hay que hacer la ventana uno mismo. Eso es un `Toplevel`.

Y es la lección con más pasos obligatorios del módulo: una ventana modal bien hecha tiene **once pasos y el orden importa**. Hacerlos en otro orden no da error; da una ventana que parpadea, que sale detrás de la principal, o que se queda colgada.

> [!objetivo] Qué vas a aprender
>
> Crear ventanas secundarias sin el parpadeo que delata a los programas hechos con prisa; saber qué hace exactamente cada pieza de una modal (`transient`, `grab_set`, `wait_visibility`, `wait_window`) y en qué orden van; recoger el resultado, que no lo devuelve `wait_window`; tratar el caso de que alguien cierre con la X; y gestionar las ventanas no modales, que tienen su propio problema.

## Un `Toplevel` es una ventana de verdad

```python
secundaria = tk.Toplevel(ventana)
secundaria.title("Preferencias")
secundaria.minsize(360, 240)
```

Tiene los mismos métodos de gestión de ventana que `Tk`: `title`, `geometry`, `minsize`, `resizable`, `protocol`, `attributes`, `iconify`, `withdraw`, `deiconify`, `state`, `lift`, `transient`. Dentro se mete lo mismo que en la principal, con los mismos gestores de geometría.

> [!aviso] Nunca un segundo `tk.Tk()`
>
> Este es el error de arranque, y viene de suponer que una ventana es un `Tk`:
>
> ```python
> otra = tk.Tk()        # NO
> ```
>
> `tk.Tk()` no crea una ventana: crea **un intérprete de Tcl entero**. Con dos, tienes dos mundos separados que no comparten nada: una variable de control de uno no funciona en el otro, las imágenes no se ven, los estilos de `ttk` se configuran por separado, y `mainloop` solo atiende a uno de los dos. El síntoma más habitual es que la segunda ventana se queda congelada sin motivo aparente.
>
> Un programa Tkinter tiene **un solo `Tk()`** y tantos `Toplevel` como quiera. Y como los `Toplevel` reciben a su padre como argumento, forman un árbol: **destruir el padre destruye a los hijos**, lo que se comprueba fácil:
>
> ```consola
> >>> padre = tk.Toplevel(ventana)
> >>> hijo = tk.Toplevel(padre)
> >>> padre.destroy()
> >>> hijo.winfo_exists()
> False
> ```

## El parpadeo

> [!error] Un `Toplevel` es visible en el instante en que se crea
>
> ```consola
> >>> secundaria = tk.Toplevel(ventana)
> >>> secundaria.state()
> 'normal'
> >>> secundaria.geometry()
> '1x1+0+0'
> ```
>
> `normal` significa visible, y `1x1+0+0` significa **un cuadrado de un píxel en la esquina superior izquierda de la pantalla**. Ahí está ya, antes de que hayas puesto el título, metido un solo widget o decidido dónde va.
>
> Lo que se ve al ejecutar es un parpadeo: un punto en la esquina, luego una ventana pequeña que crece a saltos mientras se añaden los widgets, y al final un brinco hasta su sitio. Es el detalle que más distingue un programa cuidado de uno que no, y se arregla con tres líneas:
>
> ```python
> def crear_ventana(padre, titulo):
>         secundaria = tk.Toplevel(padre)
>     secundaria.withdraw()          # 1. esconderla ANTES de nada
>     secundaria.title(titulo)
>     # … construir todo el contenido, colocarla …
>     secundaria.deiconify()         # 2. mostrarla ya terminada
>     return secundaria
> ```
>
> `withdraw()` la quita del mapa, se construye tranquilamente, y `deiconify()` la enseña hecha. Es exactamente la razón por la que la función `centrar()` de todos los ejemplos del curso lleva un `update_idletasks()`: hay que forzar el cálculo del tamaño antes de poder centrar algo, y eso también se hace mejor escondido.

## Las cuatro piezas de una modal

Una ventana modal es la que **impide tocar el resto del programa** hasta que se cierra. No hay una opción que lo haga; son cuatro cosas separadas, y cada una resuelve un problema distinto.

**`transient(padre)`** la ata a la principal:

```consola
>>> secundaria.transient()
''
>>> secundaria.transient(ventana)
>>> secundaria.transient()
'.'
```

Con eso, la ventana se minimiza con la principal, se queda siempre por encima de ella, y **no aparece como una ventana más en la barra de tareas o el conmutador**. Es lo que distingue visualmente un diálogo de una ventana independiente, y no cuesta nada.

**`grab_set()`** desvía los eventos:

```consola
>>> secundaria.grab_status()
None
>>> secundaria.grab_set()
>>> secundaria.grab_status()
'local'
>>> ventana.grab_current() is secundaria
True
```

A partir de ahí, los clics y las teclas de las demás ventanas del programa no llegan a su destino. Es lo que hace que la ventana sea modal de verdad, y es la pieza que hay que recordar liberar: ya apareció en la lección 32, donde un `tk_popup` sin `grab_release()` en un `finally` dejaba la interfaz congelada.

Existe `grab_set_global()`, que devuelve `'global'` y captura **toda la pantalla**, no solo tu programa. Con eso, ni el resto del sistema responde. Es para casos extremos como un salvapantallas, y si falla en medio hay que reiniciar la sesión para recuperar el ratón. No lo uses.

**`wait_visibility()`** espera a que la ventana esté en pantalla. Hace falta porque el `grab_set()` sobre una ventana que todavía no se ve puede fallar en X11, y porque el foco tampoco se puede poner en algo invisible.

**`wait_window(ventana)`** detiene la función que llamó hasta que esa ventana se destruye:

```consola
>>> huellas.append("antes")
>>> secundaria.after(150, secundaria.destroy)
>>> ventana.wait_window(secundaria)
>>> huellas.append("después")
>>> huellas
['antes', 'destruyo', 'después']
```

Fíjate en lo que eso significa: **es una espera que sigue atendiendo eventos.** El `after` de dentro se ejecutó durante la espera. No es un `sleep`: es un bucle de eventos anidado, y por eso el programa sigue dibujándose y respondiendo mientras espera. Es la misma idea que el `mainloop` de la lección 4, y la razón de que las ventanas modales se puedan escribir como si fueran una llamada a función normal.

> [!error] `wait_window` no devuelve el resultado, y revienta si la ventana ya murió
>
> Dos cosas que hay que saber. La primera:
>
> ```consola
> >>> ventana.wait_window(secundaria)
> None
> ```
>
> **Siempre `None`.** Lo único que hace es esperar. El resultado de la modal hay que guardarlo en algún sitio que sobreviva a la ventana: un atributo del objeto, un diccionario, o una variable de control, que sí sobrevive (se comprobó en la lección 33 que vive en el intérprete de Tcl, no en el widget).
>
> La segunda es una carrera:
>
> ```consola
> >>> secundaria.destroy()
> >>> ventana.wait_window(secundaria)
> _tkinter.TclError: bad window path name ".!toplevel"
> ```
>
> Si la ventana muere **antes** de que llegues al `wait_window`, no espera: lanza excepción. Pasa más de lo que parece, porque cualquier cosa que llame a `destroy()` durante la construcción (una validación que falla, un `after` de cero) llega antes. Se evita comprobando primero:
>
> ```python
> if secundaria.winfo_exists():
>         ventana.wait_window(secundaria)
> ```

## La receta completa, en orden

Once pasos, y cada uno está donde está por una razón:

```python
def abrir_modal(padre, titulo):
        modal = tk.Toplevel(padre)      # 1. hija del padre
    modal.withdraw()                # 2. esconderla antes de tocarla
    modal.title(titulo)             # 3. contenido y título
    construir(modal)
    modal.resizable(False, False)    # 4. un diálogo no se redimensiona
    modal.transient(padre)          # 5. atarla al padre
    colocar_sobre(modal, padre)     # 6. centrada sobre el padre, no en la pantalla
    modal.protocol("WM_DELETE_WINDOW", cancelar)   # 7. la X es «cancelar»
    modal.deiconify()               # 8. ya se puede ver
    modal.wait_visibility()         # 9. esperar a que esté de verdad
    modal.grab_set()                # 10. ahora sí, modal
    primer_campo.focus_set()        # 11. el cursor donde se va a escribir
    padre.wait_window(modal)        # y esperar
    return resultado                # guardado aparte, no lo da wait_window
```

Los tres que más se olvidan y más se notan: el **6**, porque un diálogo centrado en la pantalla en vez de sobre su ventana obliga a buscarlo con la vista; el **7**, que es la sección siguiente; y el **11**, que es lo que convierte un formulario de tres campos en algo que se rellena sin tocar el ratón.

> [!aviso] Un `Toplevel` ya viene con la X atada a `destroy`
>
> Esto sorprende, porque con `Tk` hay que atarlo a mano:
>
> ```consola
> >>> secundaria.protocol("WM_DELETE_WINDOW")
> '4390498880destroy'
> ```
>
> Es decir: **cerrar con la X destruye la ventana sin que tu código se entere**. Para una ventana normal eso está bien; para una modal que devuelve un resultado, es un problema, porque `wait_window` volverá igual y tú leerás un resultado que nadie ha puesto.
>
> De ahí que el paso 7 no sea opcional. Y de ahí la regla que lo hace robusto: **el resultado empieza valiendo «cancelado»** y solo lo cambia el botón de aceptar. Así, cerrar con la X, pulsar Escape o cancelar acaban todos en el mismo sitio sin código extra:
>
> ```python
> resultado = {"aceptado": False}          # cancelado por omisión
>
> def aceptar():
>         resultado["aceptado"] = True
>     resultado["valores"] = leer_campos()
>     modal.destroy()
>
> def cancelar():
>         modal.destroy()                      # el resultado ya dice que no
>
> modal.protocol("WM_DELETE_WINDOW", cancelar)
> modal.bind("<Escape>", lambda e: cancelar())
> modal.bind("<Return>", lambda e: aceptar())
> ```
>
> Escape para cancelar y Enter para aceptar son gratis y se esperan en cualquier diálogo.

> [!error] Una modal dentro de otra rompe la de fuera
>
> Este es el hallazgo malo de la lección, y aparece en cuanto una ventana de preferencias abre un selector de color:
>
> ```consola
> >>> primera.grab_set()
> >>> ventana.grab_current() is primera
> True
> >>> segunda.grab_set()
> >>> ventana.grab_current() is segunda
> True
> >>> segunda.grab_release()
> >>> ventana.grab_current()
> None
> ```
>
> **No vuelve a la primera.** Los `grab` no se apilan: `grab_release()` libera del todo, y la primera ventana, que sigue abierta y sigue pareciendo modal, ya no lo es. El síntoma es que después de cerrar el segundo diálogo se puede tocar la ventana principal por detrás de un diálogo que aún está abierto, y desde ahí se llega a estados imposibles.
>
> La solución es que **quien abre la segunda modal recupere su grab al volver**:
>
> ```python
> def abrir_anidada(self):
>         self.modal.grab_release()            # dejar paso
>     resultado = abrir_otra_modal(self.modal)
>     if self.modal.winfo_exists():
>                 self.modal.grab_set()            # y reconquistarlo
>     return resultado
> ```
>
> El `winfo_exists()` importa: la modal de dentro pudo haber cerrado también la de fuera.
>
> Y conviene saber que `grab_set` funciona sobre **cualquier** widget, no solo ventanas:
>
> ```consola
> >>> boton.grab_set()
> >>> boton.grab_status()
> 'local'
> ```
>
> Eso no sirve para nada bueno y es una fuente de interfaces congeladas difíciles de explicar. El `grab` va en la ventana.

## Pasar datos en los dos sentidos

Hacia dentro es fácil: argumentos de la función que crea la ventana. Hacia fuera hay dos formas.

La primera es un **diccionario o un atributo** que la modal rellena antes de destruirse, que es la del ejemplo de arriba y la que se usa cuando el resultado es «aceptar o cancelar más unos valores».

La segunda es **compartir una variable de control**, que funciona porque la variable no vive en el widget:

```consola
>>> compartida = tk.StringVar(value="compartida")
>>> campo_principal = ttk.Entry(ventana, textvariable=compartida)
>>> campo_secundario = ttk.Entry(secundaria, textvariable=compartida)
>>> compartida.set("cambiada")
>>> campo_principal.get(), campo_secundario.get()
('cambiada', 'cambiada')
>>> secundaria.destroy()
>>> compartida.get()
'cambiada'
```

Los dos campos están en ventanas distintas y se mantienen sincronizados, y al destruir la ventana la variable sigue viva. Eso vale para una ventana **no modal** que cambia cosas en vivo, como un panel de ajustes que se ve aplicarse mientras se toca. Para una modal de aceptar o cancelar no sirve, porque cancelar tendría que deshacer los cambios.

## Las no modales tienen otro problema

Una ventana que se puede dejar abierta (buscar y reemplazar, un panel de herramientas, una consola de registro) no lleva `grab_set` ni `wait_window`. Su problema es distinto: **se puede abrir dos veces**.

Pulsar «Buscar» tres veces da tres ventanas idénticas apiladas, cada una con sus manejadores, y las tres respondiendo. La receta es una sola por programa:

```python
def abrir_buscar():
        if ventanas.get("buscar") and ventanas["buscar"].winfo_exists():
                ventanas["buscar"].deiconify()     # por si estaba minimizada
        ventanas["buscar"].lift()          # traerla al frente
        campo_buscar.focus_set()
        return
    ventanas["buscar"] = construir_buscar()
```

Las tres líneas de dentro son las tres cosas que hay que hacer, y en ese orden: `deiconify` porque pudo quedarse minimizada, `lift` porque pudo quedarse detrás, y el foco porque es a lo que se venía. La comprobación de `winfo_exists()` es obligatoria: el objeto de Python sigue existiendo después de `destroy()`, y usarlo da error:

```consola
>>> secundaria.destroy()
>>> secundaria.title("x")
_tkinter.TclError: bad window path name ".!toplevel7"
>>> secundaria.winfo_exists()
0
```

## El ejemplo

Los dos casos en el mismo programa: una ventana de preferencias modal que devuelve un resultado, y una de buscar no modal que solo puede existir una vez.

```python title="ventanas.py"
"""Toplevel: una modal con resultado y una no modal que no se duplica."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
ROSA = "#C2185B"

TEMAS = ("Claro", "Oscuro", "Automático")
TAMANOS = (11, 12, 14, 16, 18)

TEXTO = ("Tkinter no trae ventanas modales de serie: son cuatro piezas "
         "separadas.\nTransient las ata al padre, grab_set desvía los "
         "eventos, wait_visibility\nespera a que se vean y wait_window "
         "detiene a quien llamó.\n\nBusca «grab» en este texto para probar "
         "la ventana no modal.")


def centrar_sobre(hija, padre):
        """Centrada sobre su ventana, no sobre la pantalla.

    Un diálogo centrado en la pantalla obliga a buscarlo con la vista
    cuando la ventana principal está en un lado.
    """
    hija.update_idletasks()
    ancho, alto = hija.winfo_reqwidth(), hija.winfo_reqheight()
    x = padre.winfo_rootx() + (padre.winfo_width() - ancho) // 2
    y = padre.winfo_rooty() + (padre.winfo_height() - alto) // 3
    hija.geometry(f"+{max(x, 0)}+{max(y, 0)}")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def pedir_preferencias(padre, actuales):
        """La modal completa, en los once pasos y en su orden.

    Devuelve un diccionario con los valores nuevos, o None si se ha
    cancelado. El resultado NO lo devuelve wait_window.
    """
    # El resultado empieza valiendo «cancelado»: así cerrar con la X,
    # pulsar Escape y darle a Cancelar acaban en el mismo sitio.
    resultado = {"aceptado": False, "valores": None}

    modal = tk.Toplevel(padre)          # 1
    modal.withdraw()                    # 2. antes de tocar nada
    modal.title("Preferencias")         # 3

    tema = tk.StringVar(value=actuales["tema"])
    tamano = tk.IntVar(value=actuales["tamano"])       # lo pone un Combobox
    numeros = tk.BooleanVar(value=actuales["numeros"])

    cuerpo = ttk.Frame(modal, padding=MARGEN)
    cuerpo.pack(fill="both", expand=True)

    marco = ttk.Labelframe(cuerpo, text="Apariencia", padding=MARGEN)
    marco.pack(fill="x")
    for nombre in TEMAS:
                ttk.Radiobutton(marco, text=nombre, value=nombre,
                        variable=tema).pack(anchor="w")

    fila = ttk.Frame(cuerpo)
    fila.pack(fill="x", pady=(MARGEN, 0))
    ttk.Label(fila, text="Tamaño:").pack(side="left")
    ttk.Combobox(fila, textvariable=tamano, state="readonly", width=6,
                 values=TAMANOS).pack(side="left", padx=AIRE)
    ttk.Checkbutton(cuerpo, text="Mostrar números de línea",
                    variable=numeros).pack(anchor="w", pady=(AIRE, 0))

    def aceptar(evento=None):
                resultado["aceptado"] = True
        resultado["valores"] = {"tema": tema.get(), "tamano": tamano.get(),
                                "numeros": numeros.get()}
        modal.destroy()

    def cancelar(evento=None):
                modal.destroy()             # el resultado ya dice que no

    ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)
    botones = ttk.Frame(cuerpo)
    botones.pack(fill="x")
    aceptar_boton = ttk.Button(botones, text="Aceptar", command=aceptar)
    aceptar_boton.pack(side="right")
    ttk.Button(botones, text="Cancelar", command=cancelar).pack(
        side="right", padx=(0, AIRE))

    modal.resizable(False, False)                       # 4
    modal.transient(padre)                              # 5
    centrar_sobre(modal, padre)                         # 6
    modal.protocol("WM_DELETE_WINDOW", cancelar)        # 7. la X es cancelar
    modal.bind("<Escape>", cancelar)
    modal.bind("<Return>", aceptar)
    modal.deiconify()                                   # 8
    modal.wait_visibility()                             # 9
    modal.grab_set()                                    # 10
    aceptar_boton.focus_set()                           # 11

    if modal.winfo_exists():     # pudo destruirse ya: wait_window lanzaría
                padre.wait_window(modal)
    return resultado["valores"] if resultado["aceptado"] else None


def abrir_preferencias():
        valores = pedir_preferencias(ventana, PREFERENCIAS)
    if valores is None:
                estado.set("Preferencias: cancelado")
        return
    PREFERENCIAS.update(valores)
    aplicar_preferencias()
    estado.set(f"Preferencias: {valores['tema']}, {valores['tamano']} pt")


def aplicar_preferencias():
        claro = PREFERENCIAS["tema"] != "Oscuro"
    texto.configure(font=("Menlo", PREFERENCIAS["tamano"]),
                    background="white" if claro else "#1E1E1E",
                    foreground="black" if claro else "#E8E8E8",
                    insertbackground="black" if claro else "#E8E8E8")
    numeros.configure(font=("Menlo", PREFERENCIAS["tamano"]),
                      background="#F0F0F0" if claro else "#2A2A2A",
                      foreground=GRIS)
    if PREFERENCIAS["numeros"]:
                numeros.pack(side="left", fill="y", before=texto)
    else:
                numeros.pack_forget()
    renumerar()


def renumerar():
        if not PREFERENCIAS["numeros"]:
                return
    ultima = int(texto.index("end-1c").split(".")[0])
    numeros.configure(state="normal")
    numeros.delete("1.0", "end")
    numeros.insert("1.0", "\n".join(f"{n:>3}" for n in range(1, ultima + 1)))
    numeros.configure(state="disabled")


def abrir_buscar():
        """La no modal: una sola por programa.

    deiconify por si estaba minimizada, lift por si estaba detrás, y el
    foco porque es a lo que se venía.
    """
    abierta = VENTANAS.get("buscar")
    if abierta is not None and abierta.winfo_exists():
                abierta.deiconify()
        abierta.lift()
        VENTANAS["campo"].focus_set()
        return
    VENTANAS["buscar"] = construir_buscar()


def construir_buscar():
        """Sin grab_set ni wait_window: se puede dejar abierta y seguir trabajando."""
    buscador = tk.Toplevel(ventana)
    buscador.withdraw()                 # el mismo remedio contra el parpadeo
    buscador.title("Buscar")
    buscador.resizable(False, False)
    buscador.transient(ventana)         # atada, pero no modal

    cuerpo = ttk.Frame(buscador, padding=MARGEN)
    cuerpo.pack(fill="both", expand=True)
    ttk.Label(cuerpo, text="Buscar:").pack(anchor="w")
    campo = ttk.Entry(cuerpo, textvariable=aguja, width=28)
    campo.pack(fill="x", pady=AIRE)
    ttk.Label(cuerpo, textvariable=hallazgos, foreground=GRIS).pack(anchor="w")

    fila = ttk.Frame(cuerpo)
    fila.pack(fill="x", pady=(AIRE, 0))
    ttk.Button(fila, text="Buscar todo", command=buscar).pack(side="left")
    ttk.Button(fila, text="Cerrar",
               command=lambda: cerrar_buscar()).pack(side="right")

    def cerrar_buscar(evento=None):
                texto.tag_remove("hallado", "1.0", "end")
        buscador.destroy()

    buscador.protocol("WM_DELETE_WINDOW", cerrar_buscar)
    buscador.bind("<Escape>", cerrar_buscar)
    buscador.bind("<Return>", lambda e: buscar())

    centrar_sobre(buscador, ventana)
    buscador.deiconify()
    VENTANAS["campo"] = campo
    campo.focus_set()
    return buscador


def buscar():
        """El search del Text, lección 16."""
    texto.tag_remove("hallado", "1.0", "end")
    patron = aguja.get()
    if not patron:
                hallazgos.set("Escribe algo que buscar")
        return
    cuantos = 0
    posicion = "1.0"
    while True:
                posicion = texto.search(patron, posicion, stopindex="end", nocase=True)
        if not posicion:
                        break
        final = f"{posicion}+{len(patron)}c"
        texto.tag_add("hallado", posicion, final)
        posicion = final
        cuantos += 1
    hallazgos.set(f"{cuantos} resultado{'s' if cuantos != 1 else ''}")
    if cuantos:
                texto.see(texto.tag_ranges("hallado")[0])


ventana = tk.Tk()
ventana.title("Ventanas secundarias")
ventana.minsize(620, 440)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
PREFERENCIAS = {"tema": "Claro", "tamano": 12, "numeros": False}
VENTANAS = {}
estado = tk.StringVar(value="Una modal con resultado y una no modal única")
aguja = tk.StringVar(value="grab")
hallazgos = tk.StringVar()

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

barra = ttk.Frame(cuerpo)
barra.pack(fill="x")
ttk.Button(barra, text="Preferencias…", command=abrir_preferencias).pack(
    side="left")
ttk.Button(barra, text="Buscar…", command=abrir_buscar).pack(
    side="left", padx=AIRE)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

caja = ttk.Frame(cuerpo)
caja.pack(fill="both", expand=True)
numeros = tk.Text(caja, width=4, wrap="none", state="disabled",
                  borderwidth=0, highlightthickness=0, takefocus=False)
texto = tk.Text(caja, wrap="word", width=48, height=12, undo=True,
                borderwidth=1, relief="solid", highlightthickness=0)
texto.pack(side="left", fill="both", expand=True)
texto.insert("1.0", TEXTO)
texto.tag_configure("hallado", background="#FFF3A3", foreground=ROSA)

ttk.Label(cuerpo, textvariable=estado, foreground=GRIS).pack(
    anchor="w", pady=(MARGEN, 0))

aplicar_preferencias()
centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Un `Toplevel` es una ventana de verdad con los mismos métodos de gestión que `Tk`, y la regla de arranque es que **nunca se crea un segundo `tk.Tk()`**, porque eso no es una ventana sino un intérprete de Tcl entero: con dos, las variables de control, las imágenes y los estilos no se comparten, `mainloop` solo atiende a uno, y el síntoma es una segunda ventana congelada. Los `Toplevel` forman un árbol, y **destruir el padre destruye a los hijos**. La primera trampa: **un `Toplevel` es visible en el instante en que se crea** (`state()` da `normal` y `geometry()` da `1x1+0+0`), así que sin remedio se ve un punto en la esquina y luego una ventana que crece a saltos; el arreglo son tres líneas, `withdraw()` antes de tocar nada, construir, y `deiconify()` al final. Una ventana modal no es una opción, son **cuatro piezas**: `transient(padre)` la ata (se minimiza con la principal, queda por encima y no sale en la barra de tareas), `grab_set()` desvía los eventos del resto del programa, `wait_visibility()` espera a que esté en pantalla porque el `grab` sobre algo invisible puede fallar en X11, y `wait_window()` detiene a quien llamó, **atendiendo eventos mientras espera** (es un bucle anidado, no un `sleep`, y por eso una modal se escribe como una llamada normal). `grab_set_global()` captura toda la pantalla y no se usa. De `wait_window`, dos cosas: **devuelve siempre `None`**, así que el resultado va en un diccionario, un atributo o una variable de control (que sobrevive a la ventana); y **lanza `TclError` si la ventana ya se destruyó**, lo que pasa más de lo que parece, así que se comprueba `winfo_exists()` antes. La receta son once pasos en orden, y los tres que más se olvidan son centrar **sobre el padre** y no sobre la pantalla, atar la X, y poner el foco. Atar la X no es opcional porque **un `Toplevel` ya viene con `WM_DELETE_WINDOW` atado a `destroy`**, así que cerrar con la X devuelve el control sin que tu código se entere; la forma robusta es que **el resultado empiece valiendo «cancelado»** y solo lo cambie el botón de aceptar, con lo que la X, Escape y Cancelar acaban en el mismo sitio gratis. El hallazgo malo: **los `grab` no se apilan**, y si una modal abre otra, al liberar la de dentro `grab_current()` queda en `None` y la de fuera deja de ser modal aunque siga abierta; quien abre la segunda tiene que liberar y reconquistar su `grab`, comprobando `winfo_exists()`. Y las no modales tienen otro problema: **se pueden abrir dos veces**, así que la receta es guardarlas en un diccionario y, si ya existe, `deiconify()` por si estaba minimizada, `lift()` por si estaba detrás, y el foco al campo, porque el objeto de Python sobrevive a `destroy()` y usarlo da `bad window path name`.

> [!ejercicio] Practica
>
> Trabaja en un fichero `38-ventanas.py` salvo donde se indique otra cosa:
>
> 1. En `38-dos-tk.py`, crea dos `tk.Tk()` con un `Entry` cada uno atado a la misma `StringVar`. Comprueba qué pasa y explícalo.
> 2. Crea un `Toplevel` y, antes de ponerle nada, imprime `state()` y `geometry()`. Ejecuta el programa varias veces y fíjate en el parpadeo. Aplica la receta de `withdraw`/`deiconify` y compara.
> 3. Abre una ventana secundaria sin `transient` y otra con él. Minimiza la principal y mira qué hace cada una. Busca las dos en el conmutador de ventanas del sistema.
> 4. Imprime `grab_status()` y `grab_current()` antes y después de `grab_set()` y de `grab_release()`.
> 5. En `38-anidada.py`, abre una modal que abra otra modal. Cierra la de dentro y comprueba que puedes tocar la ventana principal. Arréglalo liberando y reconquistando el grab.
> 6. Monta una modal completa con los once pasos. Después quita el paso 6 y el 11, ejecútala y anota cómo se siente cada carencia.
> 7. Cierra la modal con la X sin haber atado el protocolo y comprueba qué resultado lee el programa. Átalo y vuelve a probar.
> 8. Añade Escape y Enter a la modal. Comprueba que Escape acaba en el mismo sitio que Cancelar.
> 9. Haz que la modal se destruya a sí misma con un `after(0, ...)` durante la construcción y mira el error del `wait_window`. Protégelo con `winfo_exists()`.
> 10. Imprime lo que devuelve `wait_window`. Después implementa el resultado de las dos formas: con un diccionario y con una variable de control compartida, y decide cuál encaja en cada caso.
> 11. En `38-duplicada.py`, abre una ventana no modal tres veces seguidas sin la comprobación. Después añade la receta de las tres líneas.
> 12. Destruye una ventana y llama a `title()` sobre el objeto. Copia el error y comprueba `winfo_exists()`.
