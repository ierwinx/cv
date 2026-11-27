---
titulo: "Organizar una aplicación en clases"
resumen: "La deuda de treinta y seis lecciones de variables globales, el super() que si falta da un error que no dice nada, y el destroy que no se llama cuando cierras la ventana."
minutos: 22
orden: 40
---

Todos los ejemplos del módulo llevan el mismo comentario: «variables sueltas y global: en el bloque E esto pasa a ser una clase». Este es el bloque E, y esta es la lección que paga esa deuda.

No es una cuestión de elegancia. Los programas de los bloques C y D funcionan, y hasta los cien o ciento cincuenta renglones el estilo de variables de módulo es perfectamente razonable. El problema aparece al pasar de ahí, y es concreto y medible.

> [!objetivo] Qué vas a aprender
>
> Saber qué problemas resuelve una clase, para no hacerlo por costumbre; montar la aplicación y sus piezas con las dos formas que se usan, heredando de `tk.Tk` y de `ttk.Frame`; pasar métodos como callbacks en los tres sitios donde se pasan; hacer que dos piezas se hablen sin que se metan la mano la una a la otra; y limpiar al cerrar, que tiene una trampa medible.

## Qué se rompe con variables de módulo

Cuatro problemas, en orden de cuándo aparecen.

**El orden de definición.** Una función que usa `texto` solo funciona si `texto` ya existe cuando se la llama. Eso obliga a un orden de arriba abajo que se vuelve frágil: mover una línea diez renglones más arriba rompe el programa con un `NameError`, y en los ejemplos del bloque D ya hizo falta un comentario explícito advirtiendo de que las trazas van al final.

**No se puede tener dos.** El formulario de la lección 39 tiene un `VALORES` y un `WIDGETS` por programa. Si quieres dos formularios en dos pestañas, hay que duplicar todo el código con otros nombres. Una clase se instancia dos veces y punto.

**Todo ve a todo.** Con cuarenta nombres en el módulo, cualquier función puede tocar cualquier cosa, así que para saber quién cambia `estado` hay que leer el programa entero. Eso no importa con diez nombres y es el problema principal con cien.

**No se puede probar.** Para comprobar una sola función hay que arrancar la aplicación completa, lo que este curso ha ido haciendo con arneses cada vez más elaborados. Con clases se instancia la pieza que interesa.

## Las dos formas

Solo hay dos, y cada una tiene su sitio.

**La aplicación hereda de `tk.Tk`:**

```python
class Aplicacion(tk.Tk):
        def __init__(self):
                super().__init__()
        self.title("Mi programa")
        self.minsize(600, 400)
        self.crear_widgets()
```

**Cada pieza hereda de `ttk.Frame`:**

```python
class PanelDeBusqueda(ttk.Frame):
        def __init__(self, padre, **opciones):
                super().__init__(padre, **opciones)
        self.aguja = tk.StringVar()
        ttk.Entry(self, textvariable=self.aguja).pack(fill="x")
```

Que las piezas sean `Frame` y no `Toplevel` es lo que las hace reutilizables: un `Frame` se mete donde quieras (en la ventana, en una pestaña de un `Notebook`, en un panel de un `Panedwindow`), y sigue siendo un widget normal al que se le hace `pack` o `grid`. El truco que lo hace posible es que la clase **es** el contenedor, así que dentro se usa `self` como padre:

```consola
>>> panel = PanelDeBusqueda(ventana, padding=8)
>>> panel.winfo_class()
'TFrame'
>>> [hijo.winfo_class() for hijo in panel.winfo_children()]
['TEntry']
>>> str(panel.cget("padding"))
'(8,)'
```

Es un `TFrame` de verdad, con sus hijos dentro, y el `**opciones` deja pasar el `padding` al constructor de `ttk.Frame` sin tener que enumerar nada.

> [!error] Sin `super().__init__()` el error no dice qué falta
>
> ```python
> class Mal(ttk.Frame):
>         def __init__(self, padre):
>                 self.x = 1            # falta el super()
> ```
>
> ```consola
> >>> Mal(ventana)
> AttributeError: 'Mal' object has no attribute 'tk'
> ```
>
> Es el error de arranque más común al pasar a clases, y el mensaje no ayuda nada: habla de un atributo `tk` que tú no has escrito en ninguna parte. Lo que pasa es que el constructor de `ttk.Frame` es quien crea el widget de verdad en Tcl y guarda la conexión con el intérprete en `self.tk`; sin llamarlo, el objeto de Python existe pero no hay ningún widget detrás.
>
> Así que la regla es dura: **`super().__init__(padre)` es la primera línea del `__init__`**, antes de crear ningún hijo y antes de cualquier variable de control, porque todo eso necesita el intérprete ya conectado.

Y la aplicación se arranca con lo de siempre, que ahora importa de verdad:

```python
if __name__ == "__main__":
        Aplicacion().mainloop()
```

Con el estilo de variables de módulo ese `if` era cosmético, porque importar el fichero abría la ventana de todos modos. Con clases, **importar el módulo no hace nada**, que es justo lo que necesita una prueba para instanciar una sola pieza.

## Los métodos como callbacks

Los tres sitios donde se pasa una función, con lo que recibe cada uno:

```python
class Panel(ttk.Frame):
        def __init__(self, padre):
                super().__init__(padre)
        self.veces = 0
        self.valor = tk.StringVar()

        ttk.Button(self, text="x", command=self.pulsar).pack()
        self.bind("<<Algo>>", self.al_pasar)
        self.valor.trace_add("write", self.al_cambiar)

    def pulsar(self):                   # command: solo self
                self.veces += 1

    def al_pasar(self, evento):         # bind: self y el evento
                print(evento.type)

    def al_cambiar(self, *_):           # traza: self y los tres de Tcl
                print(self.valor.get())
```

Lo importante es **`self.pulsar` sin paréntesis**: se pasa el método, no su resultado. Con paréntesis se llama en ese momento y se pasa lo que devuelva, que normalmente es `None`, y el botón queda sin acción. Es el mismo error que con funciones sueltas, pero aquí es más fácil cometerlo porque la línea es más larga.

Y las firmas hay que respetarlas, porque las tres son distintas y equivocarse da errores que no detienen el programa: el `TypeError` del manejador sin parámetro se queda en la consola (lección 34) y el de la traza tampoco propaga (lección 33).

> [!consejo] Las variables de control como atributos arreglan el fallo de la lección 33 gratis
>
> Aquel fallo era este: una variable creada dentro de una función y no guardada en ningún sitio la recoge el recolector, y el widget se queda apuntando a una variable que ya no existe en Tcl.
>
> Como atributo de la clase, eso no puede pasar:
>
> ```consola
> >>> class ConVariable(ttk.Frame):
> ...     def __init__(self, padre):
> ...         super().__init__(padre)
> ...         self.texto = tk.StringVar(value="viva")
> ...         ttk.Label(self, textvariable=self.texto).pack()
> >>> panel = ConVariable(ventana)
> >>> gc.collect()
> >>> ventana.tk.globalgetvar(str(panel.winfo_children()[0].cget("textvariable")))
> 'viva'
> ```
>
> Sigue ahí, porque la referencia vive en el objeto y el objeto vive mientras viva el widget. **Es la razón técnica de que en los ejemplos del bloque C hubiera que declarar las variables al nivel del módulo**, y desaparece por construcción al pasar a clases. Lo mismo vale para las imágenes de la lección 44, que tienen exactamente el mismo problema.

## Cómo se hablan las piezas

Aquí está la decisión de diseño de la lección, y hay tres formas, de peor a mejor.

**Meter la mano.** El panel de la lista busca el panel del detalle y le cambia los widgets:

```python
self.padre.panel_detalle.etiqueta.configure(text=...)     # no
```

Funciona y es lo que sale solo. El problema es que ahora los dos paneles están soldados: no se puede usar uno sin el otro, no se puede cambiar un widget de sitio sin romper el otro, y no se puede probar ninguno por separado. Se ha cambiado el «todo ve a todo» de las variables de módulo por «todo ve a todo a través de puntos».

**Pasar una función al construir.** La pieza recibe qué hacer y no sabe quién lo hace:

```python
class Lista(ttk.Frame):
        def __init__(self, padre, al_elegir):
                super().__init__(padre)
        self.al_elegir = al_elegir        # una función, no un widget
```

Esto está bien y es lo que se usa la mayoría de las veces. La pieza es reutilizable de verdad, y en una prueba se le pasa una lista que apunta lo que llega.

**Un evento virtual.** Cuando hay varios interesados o no se sabe cuántos:

```python
self.event_generate("<<ClienteElegido>>")
```

Y quien quiera enterarse lo ata. Es lo que hace Tk consigo mismo, como se vio en la lección 34, y tiene la ventaja de que el emisor no conoce a nadie. El inconveniente es que **un evento virtual no lleva datos**: hay que dejar el dato en un atributo o en una variable compartida antes de emitirlo.

La regla práctica: **una función pasada al construir cuando hay un solo interesado y el dato importa; un evento virtual cuando hay varios o el aviso es «algo ha cambiado, mírate tú».**

## Limpiar al cerrar

Si una pieza tiene algo que cerrar (un fichero, una conexión, un `after` pendiente), hay que hacerlo cuando desaparece. Y aquí hay una trampa medible.

La forma que sale sola es sobreescribir `destroy()`, y funciona a medias:

```consola
>>> # destruyendo el padre desde Python
>>> padre.destroy()
>>> registro
['python']
>>> # destruyendo desde Tcl, que es lo que hace el gestor de ventanas
>>> ventana.tk.call("destroy", str(padre2))
>>> registro2
[]
```

**En el segundo caso no se llama.** El `destroy()` de Tkinter recorre a los hijos y llama a su `destroy()` de Python, así que mientras la destrucción venga de tu código todo va bien; pero cuando la ventana se cierra desde el gestor de ventanas, la orden llega por dentro de Tcl y se salta a Python entero. El widget desaparece igual (`winfo_exists()` da `False`) y tu limpieza no se ha hecho.

El evento sí llega siempre:

```consola
>>> # desde Python: el hijo recibe <Destroy>  →  True
>>> # desde Tcl:    el hijo recibe <Destroy>  →  True
```

Así que la regla es: **para limpiar, `<Destroy>`, no sobreescribir `destroy()`.**

```python
class Panel(ttk.Frame):
        def __init__(self, padre):
                super().__init__(padre)
        self.tarea = None
        self.bind("<Destroy>", self.al_destruir)

    def al_destruir(self, evento):
                if evento.widget is not self:      # llega también de los hijos
                        return
        if self.tarea is not None:
                        self.after_cancel(self.tarea)
```

La comprobación de `evento.widget is not self` importa: `<Destroy>` se dispara para cada widget que muere, incluidos los hijos de tu panel, así que sin ella la limpieza se ejecuta una vez por descendiente.

## El ejemplo

Tres piezas independientes y una aplicación que las une. Cada pieza funciona sola, ninguna conoce a las otras, y se comunican con las dos formas buenas: una función pasada al construir y un evento virtual.

```python title="aplicacion.py"
"""La misma clase de programa del bloque D, ahora en piezas independientes."""

import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
VERDE = "#2E7D32"
ROSA = "#C2185B"

RETARDO = 250          # ms de espera antes de buscar, lección 23

CLIENTES = [
    {"nombre": "Ana Ruiz", "ciudad": "Bilbao", "plan": "Profesional",
     "activo": True},
    {"nombre": "Álvaro Gil", "ciudad": "Sevilla", "plan": "Básico",
     "activo": True},
    {"nombre": "Bruno Sanz", "ciudad": "Madrid", "plan": "Empresa",
     "activo": False},
    {"nombre": "Carmen Vidal", "ciudad": "Valencia", "plan": "Profesional",
     "activo": True},
    {"nombre": "Ñuño Prado", "ciudad": "Bilbao", "plan": "Básico",
     "activo": False},
]


class Buscador(ttk.Frame):
        """Una caja de búsqueda que avisa cuando alguien deja de escribir.

    No sabe qué se busca ni quién recibe el aviso: recibe una función al
    construirse. Así se puede probar sola pasándole una lista.
    """

    def __init__(self, padre, al_buscar, **opciones):
                super().__init__(padre, **opciones)      # siempre la primera línea
        self.al_buscar = al_buscar
        self.aguja = tk.StringVar()
        self.pendiente = None

        ttk.Label(self, text="Buscar:").pack(side="left")
        campo = ttk.Entry(self, textvariable=self.aguja)
        campo.pack(side="left", fill="x", expand=True, padx=AIRE)
        ttk.Button(self, text="Limpiar", command=self.limpiar,
                   style="Toolbutton").pack(side="left")

        self.aguja.trace_add("write", self.al_escribir)
        self.bind("<Destroy>", self.al_destruir)
        self.campo = campo

    def al_escribir(self, *_):
                """No se busca en cada tecla: se espera a que la persona pare."""
        if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
        self.pendiente = self.after(RETARDO, self.avisar)

    def avisar(self):
                self.pendiente = None
        self.al_buscar(self.aguja.get())

    def limpiar(self):
                self.aguja.set("")

    def al_destruir(self, evento):
                """<Destroy> y no destroy(): el gestor de ventanas no pasa por Python.

        Sin esto quedaría un after pendiente apuntando a un widget muerto.
        """
        if evento.widget is not self:       # llega también de los hijos
                        return
        if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
            self.pendiente = None


class ListaClientes(ttk.Frame):
        """La tabla. Emite un evento virtual: no sabe cuántos lo escuchan.

    El dato va en un atributo, porque un evento virtual no lleva nada.
    """

    COLUMNAS = (("nombre", "Nombre", 160), ("ciudad", "Ciudad", 110),
                ("plan", "Plan", 110))

    def __init__(self, padre, **opciones):
                super().__init__(padre, **opciones)
        self.elegido = None
        self.filas = {}

        self.tabla = ttk.Treeview(self, columns=[c for c, *_ in self.COLUMNAS],
                                  show="headings", height=8,
                                  selectmode="browse")
        for clave, titulo, ancho in self.COLUMNAS:
                        self.tabla.heading(clave, text=titulo)
            self.tabla.column(clave, width=ancho, anchor="w")
        barra = ttk.Scrollbar(self, orient="vertical",
                              command=self.tabla.yview)
        self.tabla.configure(yscrollcommand=barra.set)    # las dos mitades
        barra.pack(side="right", fill="y")
        self.tabla.pack(side="left", fill="both", expand=True)

        self.tabla.tag_configure("inactivo", foreground=GRIS)
        self.tabla.bind("<<TreeviewSelect>>", self.al_elegir)

    def mostrar(self, clientes):
                """La tabla es una vista: los datos viven en Python, lección 27."""
        self.tabla.delete(*self.tabla.get_children())
        self.filas.clear()
        for cliente in clientes:
                        fila = self.tabla.insert(
                "", "end", values=(cliente["nombre"], cliente["ciudad"],
                                   cliente["plan"]),
                tags=() if cliente["activo"] else ("inactivo",))
            self.filas[fila] = cliente
        self.elegido = None

    def al_elegir(self, evento=None):
                seleccion = self.tabla.selection()
        self.elegido = self.filas.get(seleccion[0]) if seleccion else None
        # El dato ya está puesto; ahora se avisa a quien quiera enterarse.
        self.event_generate("<<ClienteElegido>>")


class Detalle(ttk.Frame):
        """Solo sabe pintar un cliente o nada. No conoce a la lista."""

    def __init__(self, padre, **opciones):
                super().__init__(padre, **opciones)
        self.titulo = tk.StringVar()
        self.lineas = tk.StringVar()
        self.situacion = tk.StringVar()

        ttk.Label(self, textvariable=self.titulo,
                  font=("Helvetica", 14, "bold")).pack(anchor="w")
        ttk.Label(self, textvariable=self.lineas, foreground=GRIS,
                  justify="left").pack(anchor="w", pady=(AIRE, 0))
        self.marca = ttk.Label(self, textvariable=self.situacion)
        self.marca.pack(anchor="w", pady=(AIRE, 0))
        self.mostrar(None)

    def mostrar(self, cliente):
                if cliente is None:
                        self.titulo.set("Ningún cliente")
            self.lineas.set("Elige uno de la lista.")
            self.situacion.set("")
            return
        self.titulo.set(cliente["nombre"])
        self.lineas.set(f"{cliente['ciudad']}\nPlan {cliente['plan']}")
        self.situacion.set("Activo" if cliente["activo"] else "Inactivo")
        self.marca.configure(foreground=VERDE if cliente["activo"] else ROSA)


class Aplicacion(tk.Tk):
        """La que conoce a las tres piezas. Las piezas no se conocen entre ellas."""

    def __init__(self, clientes):
                super().__init__()
        self.clientes = clientes
        self.title("Clientes")
        self.minsize(660, 420)

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        # Una función pasada al construir: hay un solo interesado y el
        # dato (lo que se busca) importa.
        self.buscador = Buscador(cuerpo, al_buscar=self.filtrar)
        self.buscador.pack(fill="x")

        ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

        paneles = ttk.Panedwindow(cuerpo, orient="horizontal")
        paneles.pack(fill="both", expand=True)
        self.lista = ListaClientes(paneles)
        self.detalle = Detalle(paneles, padding=MARGEN)
        paneles.add(self.lista, weight=3)
        paneles.add(self.detalle, weight=2)

        self.estado = tk.StringVar()
        ttk.Label(cuerpo, textvariable=self.estado, foreground=GRIS).pack(
            anchor="w", pady=(MARGEN, 0))

        # Un evento virtual: la lista no sabe quién la escucha, y aquí se
        # podrían atar dos manejadores más sin tocarla.
        self.lista.bind("<<ClienteElegido>>", self.al_elegir)

        self.filtrar("")
        self.buscador.campo.focus_set()
        self.centrar()

    def filtrar(self, aguja):
                """El filtro vive aquí, no en el buscador: es la lógica del programa."""
        texto = aguja.strip().lower()
        if texto:
                        visibles = [c for c in self.clientes
                        if texto in c["nombre"].lower()
                        or texto in c["ciudad"].lower()]
        else:
                        visibles = list(self.clientes)
        self.lista.mostrar(visibles)
        self.detalle.mostrar(None)
        self.estado.set(f"{len(visibles)} de {len(self.clientes)} clientes")

    def al_elegir(self, evento=None):
                self.detalle.mostrar(self.lista.elegido)

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


if __name__ == "__main__":
    # Con clases, importar este fichero no abre nada: es lo que permite
    # instanciar una sola pieza en una prueba.
        Aplicacion(CLIENTES).mainloop()
```

> [!resumen] En resumen
>
> Las variables de módulo están bien hasta los ciento cincuenta renglones, y a partir de ahí fallan en cuatro cosas concretas: el **orden de definición** se vuelve frágil (de ahí los avisos de «las trazas al final» del bloque D), **no se puede tener dos** de la misma cosa sin duplicar el código, **todo ve a todo** y hay que leer el programa entero para saber quién cambia un nombre, y **no se puede probar** una pieza sin arrancar la aplicación completa. Las formas son dos: **la aplicación hereda de `tk.Tk`** y **cada pieza hereda de `ttk.Frame`**, que es lo que las hace reutilizables, porque un `Frame` se mete en una ventana, en una pestaña o en un panel y dentro se usa `self` como padre. **`super().__init__(padre)` es la primera línea del `__init__`**, sin excepción: sin él, el error es `AttributeError: 'X' object has no attribute 'tk'`, que no dice nada de lo que falta, porque es el constructor de la clase base quien crea el widget de verdad en Tcl. El `if __name__ == "__main__"` deja de ser cosmético: **importar el módulo ya no abre ninguna ventana**, que es justo lo que necesita una prueba. Los métodos se pasan como callbacks en tres sitios con tres firmas distintas: `command=self.metodo` (solo `self`, y **sin paréntesis**, que es el error fácil), `bind(..., self.metodo)` (`self` y el evento) y `trace_add(..., self.metodo)` (`self` y los tres argumentos de Tcl); equivocarse da errores que no detienen el programa. Y las variables de control como atributos **arreglan gratis el fallo de la lección 33**: no las recoge el recolector porque la referencia vive en el objeto, que es la razón técnica de que en el bloque C hubiera que declararlas al nivel del módulo. Para que dos piezas se hablen hay tres formas y solo dos valen: **meter la mano** (`self.padre.otro_panel.etiqueta.configure(...)`) suelda las piezas y cambia el «todo ve a todo» por «todo ve a todo a través de puntos»; **pasar una función al construir** es lo correcto cuando hay un solo interesado y el dato importa, y deja la pieza probable con una lista; y **un evento virtual** cuando hay varios interesados o el aviso es «algo ha cambiado», con el detalle de que **un evento virtual no lleva datos** y hay que dejarlos en un atributo antes de emitirlo. Para limpiar al cerrar hay una trampa medida: sobreescribir `destroy()` funciona cuando la destrucción viene de tu código, porque el `destroy()` de Tkinter recorre a los hijos y llama al de Python, **pero no cuando la ventana se cierra desde el gestor de ventanas**, que entra por dentro de Tcl y se salta Python entero; el evento **`<Destroy>` llega en los dos casos**, así que la limpieza va ahí, con un `if evento.widget is not self: return` porque también llega de cada descendiente.

> [!ejercicio] Practica
>
> Trabaja en un fichero `40-clases.py` salvo donde se indique otra cosa:
>
> 1. En `40-sin-super.py`, escribe una clase que herede de `ttk.Frame` y olvida el `super().__init__()`. Copia el error y explica por qué habla de `tk`.
> 2. Convierte una pieza del ejemplo en una clase que herede de `ttk.Frame` y mete dos instancias en la misma ventana. Comprueba que no se estorban.
> 3. Pon la misma pieza en dos pestañas de un `Notebook` y en un panel de un `Panedwindow`, sin cambiar su código.
> 4. Pasa un método como `command` con paréntesis y sin ellos. Explica qué hace cada uno.
> 5. Escribe un método como manejador de `bind` sin el parámetro del evento y otro como traza sin el `*_`. Mira dónde aparecen los errores y si el programa sigue.
> 6. En `40-recolector.py`, comprueba con `gc.collect()` que una `StringVar` guardada como atributo no desaparece, y que una local sí.
> 7. Haz que una pieza cambie un widget de otra metiendo la mano. Después cámbialo a una función pasada al construir y compara qué código hay que tocar para mover un widget de sitio.
> 8. Sustituye esa función por un evento virtual y ata dos manejadores distintos al mismo evento. Comprueba que el emisor no ha cambiado.
> 9. En `40-destroy.py`, sobreescribe `destroy()` en una pieza y compruébalo destruyendo el padre desde Python y con `ventana.tk.call("destroy", ...)`. Anota la diferencia.
> 10. Cámbialo a `<Destroy>` y comprueba que funciona en los dos casos. Quita el `if evento.widget is not self` y cuenta cuántas veces se ejecuta.
> 11. Escribe una prueba que instancie solo el buscador, le pase una lista como callback y compruebe que avisa una sola vez tras varias pulsaciones seguidas.
> 12. Coge el formulario de la lección 39 y conviértelo en una clase. Mete dos instancias en dos pestañas y comprueba que tienen validación independiente.
