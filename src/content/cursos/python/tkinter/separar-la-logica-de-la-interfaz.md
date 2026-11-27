---
titulo: "Separar la lógica de la interfaz"
resumen: "La prueba objetiva de si lo has conseguido, las tres cosas que se escapan sin que te des cuenta, y la lógica que mueve una ventana y una terminal sin cambiar una línea."
minutos: 25
orden: 41
---

La lección anterior partió la interfaz en piezas. Pero la lógica del programa seguía dentro de esas piezas: el filtro estaba en el método `filtrar` de la aplicación, y las reglas de validación de la lección 39 estaban mezcladas con los `ttk.Entry`. Esta lección saca la lógica fuera.

Y tiene algo que las lecciones de arquitectura casi nunca tienen: **una prueba objetiva de si lo has conseguido o no.** No es cuestión de opinión.

> [!objetivo] Qué vas a aprender
>
> Aplicar la prueba que dice si la lógica está separada de verdad; saber qué va en cada lado y en qué dirección se permiten las dependencias; reconocer las tres cosas que se escapan del lado de la interfaz al de la lógica sin que uno se dé cuenta; hacer que la lógica avise de los problemas sin abrir ventanas; y comprobar el beneficio, que es que la misma lógica mueve una ventana y una terminal.

## La prueba

**¿Puede tu lógica funcionar sin que `tkinter` esté importado?**

Se comprueba en cuatro líneas, y no admite discusión:

```consola
>>> import sys
>>> import almacen                # el módulo de la lógica
>>> [m for m in sys.modules if "tkinter" in m]
[]
```

Si esa lista sale vacía, la lógica está separada. Si sale cualquier cosa, hay algo del lado de la interfaz metido donde no debe, y el módulo de la lógica no se puede usar, ni probar, ni reutilizar sin arrastrar toda la interfaz detrás.

La versión más severa de la misma prueba es ejecutar las pruebas de la lógica **en una máquina sin pantalla**, que es lo que pasa en un servidor de integración continua: allí `tk.Tk()` falla directamente, así que cualquier fuga se nota a la primera.

## Qué va en cada lado

Tres capas, y la dirección de las flechas es lo importante.

**La lógica** son los datos y las reglas. Python normal: clases, funciones, diccionarios, `dataclass`. No sabe que existe una ventana, ni un `StringVar`, ni un `Treeview`. Es la capa que contesta preguntas como «¿es válido este cliente?», «¿cuánto factura esto?» y «¿cuáles coinciden con esta búsqueda?».

**La interfaz** son los widgets, y solo hace dos cosas: **poner en pantalla lo que la lógica dice, y traducir los gestos en llamadas a la lógica**. Ni una decisión de negocio.

**El pegamento** es la clase de la aplicación, que conoce a las dos y las conecta.

```texto title="codigo"
interfaz  ──llama──▶  lógica
    ▲                    │
    └────devuelve────────┘
```

**La flecha nunca va en el otro sentido.** La lógica no llama a la interfaz, no la importa y no sabe su nombre. Cuando tiene algo que decir, lo **devuelve** o **lanza una excepción**, y es la interfaz la que decide si eso se convierte en un rótulo rojo, en un diálogo o en una línea de registro.

## Las tres cosas que se escapan

En la práctica, la separación se rompe casi siempre por una de estas tres, y las tres se cuelan sin que uno lo note.

> [!error] 1. Una `StringVar` en la lógica
>
> ```python
> class Almacen:
>         def __init__(self):
>                 self.total = tk.StringVar()        # NO
> ```
>
> Parece cómodo, porque así la etiqueta se actualiza sola. Pero con esa línea la lógica **ya necesita un intérprete de Tcl vivo** para poder instanciarse, así que deja de poder probarse sin ventana, deja de funcionar en un servidor sin pantalla, y arrastra `tkinter` al `sys.modules` de la prueba.
>
> Y hay un problema de fondo peor: una `StringVar` guarda texto, y un total no es texto. En cuanto el total vive como `"103,90 €"`, ya no se puede sumar, ni comparar, ni exportar a otro formato sin volver a convertirlo. **La lógica guarda números en `float` y fechas en `date`; el formateo es de la interfaz.**
>
> La lógica devuelve el dato y la interfaz lo pone donde toca:
>
> ```python
> self.total.set(f"{self.almacen.facturacion():,.2f} €")
> ```

> [!error] 2. Un `messagebox` en la lógica
>
> ```python
> def anadir(self, cliente):
>         if self.existe(cliente.nombre):
>                 messagebox.showerror("Error", "Ya existe")      # NO
>         return
> ```
>
> Tres cosas mal a la vez. La primera es la de siempre: importa `tkinter`. La segunda es que **la lógica se queda sin poder decir «no»**: ha informado, pero devuelve `None`, así que quien la llamó no sabe si el cliente se añadió o no, y la interfaz sigue como si todo hubiera ido bien. La tercera es que la decisión de **cómo** se avisa la ha tomado la capa que no debía: la lección 36 dejó claro que un diálogo es una interrupción que hay que justificar, y aquí ya no se puede elegir.
>
> La forma correcta es una excepción propia con la información suficiente para que la interfaz decida:
>
> ```python
> class ErrorDeDatos(ValueError):
>         """Lo que la lógica usa para decir que algo no vale."""
>
>     def __init__(self, campo, motivo):
>                 super().__init__(motivo)
>         self.campo = campo          # qué campo, para poner el foco ahí
>         self.motivo = motivo        # qué decir, para el rótulo
> ```
>
> El `campo` es lo que permite a la interfaz hacer lo de la lección 39: pintar ese campo de rosa y poner el foco en él. La lógica no sabe que hay campos pintados; solo dice de qué dato habla.
>
> Y en la interfaz:
>
> ```python
> try:
>         self.almacen.anadir(cliente)
> except almacen.ErrorDeDatos as error:
>         self.marcar_error(error.campo, error.motivo)
>     return
> ```

> [!error] 3. Leer los widgets desde la lógica
>
> ```python
> def facturacion(self, tabla):
>         filas = tabla.get_children()          # NO
>     return sum(float(tabla.set(f, "precio")) for f in filas)
> ```
>
> Esta es la más sutil, porque no importa `tkinter` explícitamente: el widget llega como argumento. Pero el efecto es el mismo, y además tropieza con el hallazgo de la lección 27: **un `Treeview` no es un almacén de datos**, y leer de él convierte los números en texto y pierde los ceros de la izquierda.
>
> La regla que lo resume: **si una función necesita un widget para hacer su trabajo, es de la interfaz.** La lógica recibe y devuelve datos de Python.

## Lo que se gana

Dos cosas concretas y medibles.

**Las pruebas pasan a ser instantáneas.** Probar la lógica es importar un módulo y llamar funciones: no hay ventana que abrir, no hay `mainloop` que neutralizar, no hay que simular eventos ni mockear diálogos modales. Todos los arneses que ha necesitado este curso para probar los ejemplos de los bloques C y D son la factura de no haber separado nada; con la lógica fuera, esa parte se prueba en milisegundos y sin trucos.

**La interfaz se puede cambiar.** Y este curso tiene una demostración a mano: el módulo 2 fue de programas de terminal. La misma lógica, sin tocar una línea, mueve las dos interfaces:

```python
# interfaz de terminal, sin tkinter por ninguna parte
deposito = almacen.Almacen()
while (linea := input("buscar> ")) != "salir":
        for cliente in deposito.buscar(linea):
                print(f"  {cliente.nombre:20} {cliente.ciudad:12} {cliente.precio:>7.2f}")
```

Eso no es un ejercicio teórico: es lo que permite añadir un modo `--listar` a un programa con ventana sin duplicar nada, o escribir un pequeño script que importe el módulo de la lógica para generar un informe.

## Dónde poner el límite

La separación se puede llevar demasiado lejos, y conviene decir dónde para no acabar con veinte ficheros para un programa de trescientos renglones.

**Va en la lógica** lo que responda a una pregunta sobre los datos: validar, buscar, filtrar, ordenar, calcular, guardar y cargar.

**Va en la interfaz** lo que hable de píxeles, de widgets o de gestos: qué color tiene un campo inválido, cuántos caracteres caben, qué pasa al pulsar, cómo se formatea un número para mostrarlo, y el orden de los widgets.

**Los casos de frontera**, que son los que dan dudas:

- **El texto de los mensajes de error**: en la lógica, en el `motivo` de la excepción. Es parte de la regla («son nueve dígitos»), no de la presentación.
- **El orden de una lista**: en la lógica. Ordenar es una operación sobre datos, y además necesita el `locale.strxfrm` de la lección 27, que no tiene nada de visual.
- **El formato de un número o una fecha**: en la interfaz. Los mismos datos se muestran distintos en una ventana, en un informe y en un fichero.
- **Qué está seleccionado**: en la interfaz. La selección es un estado de la pantalla, no del modelo. Lo que la lógica recibe es el dato seleccionado, no el índice de la fila.

## El ejemplo

Dos ficheros. El primero no importa `tkinter` en ninguna línea, y se puede ejecutar y probar solo.

```python title="almacen.py"
"""La lógica: datos y reglas. Ni una línea de tkinter, y así se comprueba:

    >>> import sys, almacen
    >>> [m for m in sys.modules if "tkinter" in m]
    []
"""

import locale
from dataclasses import dataclass, field, replace

PLANES = ("Básico", "Profesional", "Empresa")
PRECIOS = {"Básico": 9.90, "Profesional": 24.90, "Empresa": 79.00}

MIN_NOMBRE = 3


class ErrorDeDatos(ValueError):
        """Lo que la lógica usa para decir que algo no vale.

    Lleva el campo para que la interfaz sepa dónde poner el foco, y el
    motivo para que sepa qué escribir. La lógica no decide si eso acaba en
    un rótulo rosa o en un diálogo: eso es de la interfaz.
    """

    def __init__(self, campo, motivo):
                super().__init__(motivo)
        self.campo = campo
        self.motivo = motivo


@dataclass(frozen=True)
class Cliente:
        """frozen: nadie lo cambia por detrás. Para cambiarlo, replace()."""

    nombre: str
    ciudad: str
    plan: str
    activo: bool = True

    @property
    def precio(self):
                """Un float, no "24,90 €": el formateo es de la interfaz."""
        return PRECIOS[self.plan]


@dataclass
class Almacen:
        clientes: list = field(default_factory=list)

    def anadir(self, cliente):
                """Devuelve el cliente, o lanza ErrorDeDatos. Nunca None a secas."""
        repetido = self.por_nombre(cliente.nombre)
        if repetido is not None:
                        raise ErrorDeDatos("nombre", f"«{repetido.nombre}» ya está en la "
                                         f"lista.")
        self.clientes.append(cliente)
        return cliente

    def quitar(self, cliente):
                self.clientes.remove(cliente)

    def cambiar(self, viejo, **campos):
                """replace() sobre un dataclass inmutable, en su sitio de la lista."""
        nuevo = replace(viejo, **campos)
        if nuevo.nombre.lower() != viejo.nombre.lower():
                        repetido = self.por_nombre(nuevo.nombre)
            if repetido is not None:
                                raise ErrorDeDatos("nombre", f"«{repetido.nombre}» ya está en "
                                             f"la lista.")
        self.clientes[self.clientes.index(viejo)] = nuevo
        return nuevo

    def por_nombre(self, nombre):
                objetivo = nombre.strip().lower()
        for cliente in self.clientes:
                        if cliente.nombre.lower() == objetivo:
                                return cliente
        return None

    def buscar(self, aguja):
                """Filtrar es una pregunta sobre los datos: va aquí."""
        texto = aguja.strip().lower()
        if not texto:
                        return list(self.clientes)
        return [c for c in self.clientes
                if texto in c.nombre.lower() or texto in c.ciudad.lower()]

    def ordenados(self, clave="nombre", descendente=False, clientes=None):
                """Ordenar también, y necesita el locale de la lección 27.

        clientes deja encadenar buscar() con ordenados() sin que el
        pegamento tenga que cruzar las dos listas por su cuenta.
        """
        if clave == "precio":
                        orden = lambda c: c.precio
        else:
                        orden = lambda c: locale.strxfrm(getattr(c, clave).lower())
        cuales = self.clientes if clientes is None else clientes
        return sorted(cuales, key=orden, reverse=descendente)

    def facturacion(self):
                return sum(c.precio for c in self.clientes if c.activo)

    def por_plan(self):
                return {plan: sum(1 for c in self.clientes if c.plan == plan)
                for plan in PLANES}


def validar(nombre, ciudad, plan):
        """Las reglas, con su texto. El texto del motivo es parte de la regla."""
    if not nombre.strip():
                raise ErrorDeDatos("nombre", "El nombre es obligatorio.")
    if len(nombre.strip()) < MIN_NOMBRE:
                raise ErrorDeDatos("nombre", f"Al menos {MIN_NOMBRE} caracteres.")
    if not ciudad.strip():
                raise ErrorDeDatos("ciudad", "La ciudad es obligatoria.")
    if plan not in PLANES:
                raise ErrorDeDatos("plan", "Elige uno de los planes.")
    return Cliente(nombre.strip(), ciudad.strip(), plan)


def de_ejemplo():
        """Datos de arranque, para que el programa se pueda probar a mano."""
    deposito = Almacen()
    for nombre, ciudad, plan, activo in (
            ("Ana Ruiz", "Bilbao", "Profesional", True),
            ("Álvaro Gil", "Sevilla", "Básico", True),
            ("Bruno Sanz", "Madrid", "Empresa", False),
            ("Carmen Vidal", "Valencia", "Profesional", True),
            ("Ñuño Prado", "Bilbao", "Básico", True)):
                deposito.clientes.append(Cliente(nombre, ciudad, plan, activo))
    return deposito


if __name__ == "__main__":
    # La misma lógica con una interfaz de terminal, como el módulo 2. No
    # hace falta cambiar nada de arriba para que esto funcione.
        locale.setlocale(locale.LC_COLLATE, "")
    deposito = de_ejemplo()
    print(f"{len(deposito.clientes)} clientes, "
          f"{deposito.facturacion():,.2f} € al mes")
    while (linea := input("buscar> ").strip()) != "":
                for cliente in deposito.buscar(linea):
                        marca = " " if cliente.activo else "·"
            print(f" {marca} {cliente.nombre:<16} {cliente.ciudad:<12} "
                  f"{cliente.precio:>7.2f}")
```

Y la interfaz, que solo pinta y traduce gestos.

```python title="gestor.py"
"""La interfaz. Toda la lógica está en almacen.py y aquí no se repite."""

import locale
import tkinter as tk
from tkinter import ttk

import almacen

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
VERDE = "#2E7D32"
ROSA = "#C2185B"
ROSA_CLARO = "#FFEBEE"


class Formulario(ttk.Labelframe):
        """Pinta campos y avisa. No sabe qué es un cliente válido."""

    CAMPOS = (("nombre", "Nombre"), ("ciudad", "Ciudad"))

    def __init__(self, padre, al_guardar, **opciones):
                super().__init__(padre, text="Nuevo cliente", **opciones)
        self.al_guardar = al_guardar
        self.valores = {}
        self.errores = {}
        self.widgets = {}

        for clave, etiqueta in self.CAMPOS:
                        self.valores[clave] = tk.StringVar()
            self.errores[clave] = tk.StringVar()
            fila = ttk.Frame(self)
            fila.pack(fill="x", pady=(0, AIRE))
            ttk.Label(fila, text=f"{etiqueta}:", width=9, anchor="w").pack(
                side="left", anchor="n")
            columna = ttk.Frame(fila)
            columna.pack(side="left", fill="x", expand=True)
            campo = ttk.Entry(columna, textvariable=self.valores[clave],
                              style="Gestor.TEntry")
            campo.pack(fill="x")
            ttk.Label(columna, textvariable=self.errores[clave],
                      foreground=ROSA).pack(anchor="w")
            self.widgets[clave] = campo
            # Al volver a escribir se borra el aviso, lección 39.
            self.valores[clave].trace_add("write",
                                          lambda *_, c=clave: self.limpiar(c))

        self.valores["plan"] = tk.StringVar()
        self.errores["plan"] = tk.StringVar()
        fila = ttk.Frame(self)
        fila.pack(fill="x", pady=(0, AIRE))
        ttk.Label(fila, text="Plan:", width=9, anchor="w").pack(side="left",
                                                                anchor="n")
        columna = ttk.Frame(fila)
        columna.pack(side="left", fill="x", expand=True)
        # Los planes los sabe la lógica: aquí solo se pintan.
        self.widgets["plan"] = ttk.Combobox(columna, state="readonly",
                                            textvariable=self.valores["plan"],
                                            values=almacen.PLANES)
        self.widgets["plan"].pack(fill="x")
        ttk.Label(columna, textvariable=self.errores["plan"],
                  foreground=ROSA).pack(anchor="w")

        ttk.Button(self, text="Añadir", command=self.guardar).pack(
            anchor="e", pady=(AIRE, 0))

    def guardar(self):
                """Traduce un gesto en una llamada. La decisión no es de aquí."""
        self.al_guardar({clave: variable.get()
                         for clave, variable in self.valores.items()})

    def marcar(self, campo, motivo):
                """Lo que hace la interfaz con un ErrorDeDatos de la lógica."""
        self.limpiar_todo()
        if campo in self.errores:
                        self.errores[campo].set(motivo)
            self.widgets[campo].state(["invalid"])
            self.widgets[campo].focus_set()

    def limpiar(self, campo):
                self.errores[campo].set("")
        self.widgets[campo].state(["!invalid"])

    def limpiar_todo(self):
                for campo in self.errores:
                        self.limpiar(campo)

    def vaciar(self):
                self.limpiar_todo()
        for variable in self.valores.values():
                        variable.set("")
        self.widgets["nombre"].focus_set()


class Tabla(ttk.Frame):
        """Una vista. Los datos viven en el Almacén, lección 27."""

    COLUMNAS = (("nombre", "Nombre", 150), ("ciudad", "Ciudad", 100),
                ("plan", "Plan", 100), ("precio", "Precio", 80))

    def __init__(self, padre, al_elegir, **opciones):
                super().__init__(padre, **opciones)
        self.al_elegir = al_elegir
        self.filas = {}
        self.clave = "nombre"
        self.descendente = False

        self.tabla = ttk.Treeview(self, show="headings", height=9,
                                  selectmode="browse",
                                  columns=[c for c, *_ in self.COLUMNAS])
        for clave, titulo, ancho in self.COLUMNAS:
                        self.tabla.heading(clave, text=titulo,
                               command=lambda c=clave: self.ordenar_por(c))
            self.tabla.column(clave, width=ancho,
                              anchor="e" if clave == "precio" else "w")
        barra = ttk.Scrollbar(self, orient="vertical",
                              command=self.tabla.yview)
        self.tabla.configure(yscrollcommand=barra.set)
        barra.pack(side="right", fill="y")
        self.tabla.pack(side="left", fill="both", expand=True)

        self.tabla.tag_configure("inactivo", foreground=GRIS)
        self.tabla.bind("<<TreeviewSelect>>", self.al_seleccionar)

    def mostrar(self, clientes):
                self.tabla.delete(*self.tabla.get_children())
        self.filas.clear()
        for cliente in clientes:
            # El formateo del precio es de aquí: la lógica da un float.
                        fila = self.tabla.insert(
                "", "end", tags=() if cliente.activo else ("inactivo",),
                values=(cliente.nombre, cliente.ciudad, cliente.plan,
                        f"{cliente.precio:,.2f}"))
            self.filas[fila] = cliente

    def ordenar_por(self, clave):
                self.descendente = not self.descendente if clave == self.clave else False
        self.clave = clave
        self.al_elegir(None)
        self.event_generate("<<OrdenCambiado>>")

    @property
    def elegido(self):
                """Qué está seleccionado es un estado de la pantalla, no del modelo."""
        seleccion = self.tabla.selection()
        return self.filas.get(seleccion[0]) if seleccion else None

    def al_seleccionar(self, evento=None):
                self.al_elegir(self.elegido)


class Resumen(ttk.Frame):
        """Solo pinta lo que le den ya calculado."""

    def __init__(self, padre, **opciones):
                super().__init__(padre, **opciones)
        self.total = tk.StringVar()
        self.reparto = tk.StringVar()
        ttk.Label(self, textvariable=self.total,
                  font=("Helvetica", 15, "bold")).pack(anchor="w")
        ttk.Label(self, textvariable=self.reparto, foreground=GRIS,
                  justify="left").pack(anchor="w", pady=(AIRE, 0))

    def mostrar(self, facturacion, reparto):
                self.total.set(f"{facturacion:,.2f} € al mes")
        self.reparto.set("\n".join(f"{plan}: {cuantos}"
                                   for plan, cuantos in reparto.items()))


class Aplicacion(tk.Tk):
        """El pegamento: conoce el almacén y las tres piezas."""

    def __init__(self, deposito):
                super().__init__()
        self.almacen = deposito
        self.title("Gestor de clientes")
        self.minsize(700, 480)

        estilo = ttk.Style()
        estilo.map("Gestor.TEntry",
                   fieldbackground=[("invalid", ROSA_CLARO)],
                   foreground=[("invalid", ROSA)])

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        arriba = ttk.Frame(cuerpo)
        arriba.pack(fill="x")
        ttk.Label(arriba, text="Buscar:").pack(side="left")
        self.aguja = tk.StringVar()
        ttk.Entry(arriba, textvariable=self.aguja).pack(side="left", fill="x",
                                                        expand=True, padx=AIRE)
        self.estado = tk.StringVar()
        ttk.Label(arriba, textvariable=self.estado, foreground=GRIS).pack(
            side="left")
        self.aguja.trace_add("write", self.refrescar)

        ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

        medio = ttk.Frame(cuerpo)
        medio.pack(fill="both", expand=True)
        self.tabla = Tabla(medio, al_elegir=self.al_elegir)
        self.tabla.pack(side="left", fill="both", expand=True)

        derecha = ttk.Frame(medio, padding=(MARGEN, 0, 0, 0))
        derecha.pack(side="left", fill="y")
        self.formulario = Formulario(derecha, al_guardar=self.anadir,
                                     padding=MARGEN)
        self.formulario.pack(fill="x")
        self.resumen = Resumen(derecha, padding=(0, MARGEN, 0, 0))
        self.resumen.pack(fill="x")

        abajo = ttk.Frame(cuerpo)
        abajo.pack(fill="x", pady=(MARGEN, 0))
        self.boton_activo = ttk.Button(abajo, text="Activar o desactivar",
                                       command=self.cambiar_activo,
                                       state="disabled")
        self.boton_activo.pack(side="left")
        self.boton_quitar = ttk.Button(abajo, text="Quitar",
                                       command=self.quitar, state="disabled")
        self.boton_quitar.pack(side="left", padx=AIRE)

        self.tabla.bind("<<OrdenCambiado>>", self.refrescar)
        self.refrescar()
        self.centrar()

    def refrescar(self, *_):
                """Pregunta a la lógica y pinta. Aquí no se filtra ni se ordena."""
        visibles = self.almacen.ordenados(self.tabla.clave,
                                          self.tabla.descendente,
                                          self.almacen.buscar(self.aguja.get()))
        self.tabla.mostrar(visibles)
        self.estado.set(f"{len(visibles)} de {len(self.almacen.clientes)}")
        self.resumen.mostrar(self.almacen.facturacion(),
                             self.almacen.por_plan())
        self.al_elegir(None)

    def anadir(self, datos):
                """El try es el traductor: de excepción de la lógica a aviso visual."""
        try:
                        cliente = almacen.validar(datos["nombre"], datos["ciudad"],
                                      datos["plan"])
            self.almacen.anadir(cliente)
        except almacen.ErrorDeDatos as error:
                        self.formulario.marcar(error.campo, error.motivo)
            return
        self.formulario.vaciar()
        self.refrescar()

    def al_elegir(self, cliente):
                hay = cliente is not None
        for boton in (self.boton_activo, self.boton_quitar):
                        boton.configure(state="normal" if hay else "disabled")
        self.boton_activo.configure(
            text="Desactivar" if hay and cliente.activo else "Activar")

    def cambiar_activo(self):
                cliente = self.tabla.elegido
        if cliente is None:
                        return
        self.almacen.cambiar(cliente, activo=not cliente.activo)
        self.refrescar()

    def quitar(self):
                cliente = self.tabla.elegido
        if cliente is None:
                        return
        self.almacen.quitar(cliente)
        self.refrescar()

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


if __name__ == "__main__":
        locale.setlocale(locale.LC_COLLATE, "")
    Aplicacion(almacen.de_ejemplo()).mainloop()
```

> [!resumen] En resumen
>
> Esta lección tiene una **prueba objetiva**: `import` el módulo de la lógica y mirar `[m for m in sys.modules if "tkinter" in m]`. Si sale vacío, está separada; si sale algo, hay una fuga. La versión severa es ejecutar las pruebas en una máquina sin pantalla, donde `tk.Tk()` falla y cualquier fuga se nota a la primera. Las capas son tres: **la lógica** son datos y reglas en Python normal, que no sabe que existe una ventana; **la interfaz** solo pone en pantalla lo que la lógica dice y traduce gestos en llamadas; y **el pegamento** es la clase de la aplicación. La flecha va de la interfaz a la lógica y **nunca al contrario**: cuando la lógica tiene algo que decir, lo **devuelve** o lanza una excepción, y es la interfaz la que decide si eso es un rótulo rosa, un diálogo o una línea de registro. Se rompe casi siempre por una de tres. **Una `StringVar` en la lógica** la obliga a tener un intérprete de Tcl vivo para instanciarse, y además guarda texto donde debería haber un número: la lógica guarda `float` y `date`, y el formateo es de la interfaz. **Un `messagebox` en la lógica** hace tres cosas mal: importa `tkinter`, deja a la lógica **sin poder decir «no»** (informa pero devuelve `None`, así que la interfaz sigue como si todo hubiera ido bien) y decide en la capa equivocada cómo se avisa; la forma correcta es una excepción propia con **`campo` y `motivo`**, donde el `campo` es lo que permite a la interfaz pintar y poner el foco como en la lección 39. Y **leer los widgets desde la lógica** es la más sutil, porque el widget llega como argumento y no hay `import` que delate nada, pero además tropieza con el hallazgo de la lección 27 de que un `Treeview` no es un almacén; la regla que lo resume: **si una función necesita un widget para hacer su trabajo, es de la interfaz.** Lo que se gana son dos cosas medibles: las pruebas de la lógica pasan a ser instantáneas y sin trucos (todos los arneses de este curso son la factura de no haber separado nada), y **la interfaz se puede cambiar**, con la misma lógica moviendo la ventana y una terminal como las del módulo 2. De los casos de frontera: el **texto de los mensajes de error** va en la lógica, porque es parte de la regla; el **orden de una lista** también, porque ordenar es una operación sobre datos; el **formato** de un número o una fecha va en la interfaz, porque los mismos datos se muestran distintos en una ventana y en un informe; y **qué está seleccionado** va en la interfaz, porque la selección es un estado de la pantalla y lo que la lógica recibe es el dato, no el índice de la fila.

> [!ejercicio] Practica
>
> Trabaja sobre los dos ficheros del ejemplo salvo donde se indique otra cosa:
>
> 1. Aplica la prueba a `almacen.py`: impórtalo y comprueba que `sys.modules` no tiene nada de `tkinter`. Añade `import tkinter` arriba y vuelve a mirarlo.
> 2. Ejecuta `python3 almacen.py` y usa la interfaz de terminal. Comprueba que da los mismos resultados que la ventana.
> 3. Escribe seis pruebas de la lógica sin abrir ninguna ventana: añadir, añadir repetido, validar vacío, validar plan inválido, buscar y facturar. Mide cuánto tardan.
> 4. En `41-fuga.py`, mete una `StringVar` en `Almacen` y ejecuta las pruebas del ejercicio 3. Explica qué se rompe.
> 5. Cambia `anadir` para que llame a `messagebox.showerror` en vez de lanzar la excepción. Comprueba que la interfaz ya no sabe si el cliente se añadió, y que el formulario no se vacía ni deja de vaciarse correctamente.
> 6. Añade a la lógica una regla nueva: el plan «Empresa» exige que la ciudad no esté vacía y que el nombre tenga al menos dos palabras. Comprueba que no hay que tocar `gestor.py`.
> 7. Añade a la interfaz una columna «Estado» con un icono de texto. Comprueba que no hay que tocar `almacen.py`.
> 8. Mueve el formateo del precio a la lógica (una propiedad `precio_texto`) y razona qué se pierde.
> 9. Cambia `Cliente` para que no sea `frozen` y mira qué deja de garantizar. Prueba a cambiar un nombre por detrás y ver si la tabla se enteraría.
> 10. Escribe un tercer fichero `informe.py` que importe solo `almacen` y escriba un resumen en un fichero de texto, sin interfaz de ninguna clase.
> 11. Mira el ejemplo de la lección 39 y decide qué partes son lógica. Sácalas a un módulo aparte y aplica la prueba.
> 12. Busca en la lección 27 el ejemplo del `Treeview` y localiza las funciones que necesitan el widget. Decide para cada una si debería estar en la lógica.
