---
titulo: "Proyecto: un gestor de contactos con Treeview y SQLite"
resumen: "Una tabla que no es el almacén, una búsqueda que no confunde el porcentaje del usuario con un comodín, y un orden que pone la ñ donde le toca."
minutos: 29
orden: 47
---

Segundo proyecto, y con una base de datos detrás. Un gestor de contactos es el ejemplo perfecto para cerrar el módulo porque obliga a resolver el asunto que el `Treeview` de la lección 27 dejó planteado: **la tabla no es el almacén, es una vista**, y cuando los datos viven de verdad en otro sitio —aquí, en SQLite— esa separación deja de ser un consejo y se vuelve la única forma de que el programa funcione.

Tampoco hay nada nuevo. Lo que hay son cuatro decisiones que en un ejemplo pequeño se pueden tomar mal sin que se note, y aquí no.

> [!objetivo] Qué vas a aprender
>
> Escribir un gestor de contactos completo con SQLite: listar, buscar mientras se escribe, ordenar pulsando las cabeceras, añadir y editar en un modal validado, borrar con confirmación, e importar y exportar CSV. Y entender por qué el `Treeview` debe usar las claves de la base como identificadores, por qué ordenar en SQL da un resultado equivocado en español, y por qué una búsqueda con `LIKE` tiene un agujero.

## Las cuatro decisiones

### Los `iid` del `Treeview` son las claves de la base

La lección 27 dejó claro que el `Treeview` guarda texto y no datos. La pregunta práctica es cómo se vuelve de una fila seleccionada al contacto de verdad. La tentación es un diccionario paralelo, y no hace falta:

```consola
>>> arbol.insert("", "end", iid=str(17), values=("Ana",))
>>> arbol.get_children()
('1', '2', '17', '999')
>>> arbol.selection()
('17',)
>>> int(arbol.selection()[0])
17
```

Los `iid` son **cadenas siempre** (si pasas un entero, lo convierte), y no pueden repetirse:

```consola
>>> arbol.insert("", "end", iid="1", values=("otra",))
TclError: Item 1 already exists
```

Esas dos propiedades son exactamente las de una clave primaria, así que usar `str(id)` de la base elimina el diccionario paralelo y con él la posibilidad de que se desincronice. De la selección a la base se vuelve con un `int()`.

### El `Treeview` se reconstruye, y eso cuesta la selección

Cada vez que cambia el filtro o el orden, lo limpio es tirar todas las filas y volver a pedirlas a la base. Y eso tiene un precio medido:

```consola
>>> arbol.selection()
('3',)
>>> arbol.delete(*arbol.get_children())
>>> # se reinsertan las mismas filas
>>> arbol.selection()
()
```

**La selección no vuelve sola.** Hay que guardarla antes y restaurarla después, y con cuidado, porque la fila puede haber desaparecido del filtro:

```consola
>>> arbol.selection_set("3")       # cuando el 3 ya no está
TclError: Item 3 not found
>>> arbol.exists("3")
False
```

De ahí el `if arbol.exists(...)` antes de restaurar, y el `see()` después para que la fila quede a la vista. Las cabeceras, en cambio, sobreviven al borrado: no hay que volver a configurarlas.

### Ordenar es de la lógica, no de SQL

Esta es la que más sorprende. Lo natural sería poner el orden en la consulta, y el resultado está mal:

```consola
>>> # ORDER BY nombre
['Ana', 'Bea', 'Zamora', 'alba', 'oso', 'Ñandú', 'Óscar', 'ácido', 'ñu']
>>> # ORDER BY nombre COLLATE NOCASE
['alba', 'Ana', 'Bea', 'oso', 'Zamora', 'Ñandú', 'Óscar', 'ácido', 'ñu']
```

`ORDER BY` a secas ordena por código de carácter, así que las minúsculas van después de todas las mayúsculas. Y `COLLATE NOCASE` arregla eso pero **solo entiende ASCII**: `Ñandú`, `Óscar`, `ácido` y `ñu` acaban al final, después de la Z. Para una lista de nombres españoles es inaceptable.

Lo correcto es el `locale` del módulo 1:

```consola
>>> sorted(nombres, key=locale.strxfrm)
['ácido', 'alba', 'Ana', 'Bea', 'Ñandú', 'ñu', 'Óscar', 'oso', 'Zamora']
```

Se puede enseñar a SQLite a hacerlo con `create_collation`, y funciona, pero mete el `locale` dentro de la base para nada: los datos ya están en Python cuando hay que pintarlos. **Ordenar es una operación sobre datos y va en la lógica**, como dijo la lección 41.

### La búsqueda con `LIKE` tiene un agujero

```consola
>>> # contactos: Ana, Mariana, "100% lana", a_b
>>> # WHERE n LIKE '%100%%'
['100% lana']
>>> # WHERE n LIKE '%a_b%'
['a_b']
```

Parece que funciona, y es casualidad. En `LIKE`, el `%` significa «cualquier cosa» y el `_` significa «un carácter cualquiera», así que **si alguien escribe `100%` en el cuadro de búsqueda, ese `%` se convierte en un comodín** y encuentra cosas que no ha pedido. Con `_` es peor porque no se ve: buscar `a_b` encuentra también `axb`.

Hay dos arreglos y los dos valen:

```sql
SELECT ... WHERE nombre LIKE ? ESCAPE '\'
```

escapando el patrón antes (`%` → `\%`, `_` → `\_`, `\` → `\\`), o simplemente **no usar `LIKE`** y filtrar en Python, que además resuelve de paso el otro problema:

```consola
>>> # LIKE '%ANA%' encuentra Ana y Mariana
>>> # pero LIKE '%ÁCIDO%' no encuentra ácido
```

`LIKE` es insensible a mayúsculas **solo en ASCII**, así que buscar `ÁCIDO` no encuentra `ácido`. Para una agenda en español eso se nota enseguida. El programa de esta lección filtra en Python normalizando, que es más código pero hace lo que la gente espera.

> [!consejo] Cuándo sí conviene filtrar en SQL
>
> Filtrar en Python significa traer todas las filas a memoria. Con una agenda personal (cientos o miles de contactos) es instantáneo y no hay nada que discutir. Con cientos de miles de filas habría que filtrar en SQL, aceptar sus reglas de comparación y añadir un índice.
>
> La regla práctica: **si todo cabe en memoria sin pensarlo, filtra y ordena en Python**, que es donde tienes el `locale` y donde el código se lee. Cuando deje de caber, ya tendrás un problema distinto y más información para resolverlo.

## Tres detalles de SQLite que el programa necesita

**`row_factory`**, para no llenar el código de `fila[3]`:

```consola
>>> con.row_factory = sqlite3.Row
>>> fila["correo"]
'a@b.c'
>>> dict(fila)
{'id': 1, 'correo': 'a@b.c'}
```

**`rowcount`**, que es cómo se detecta que alguien ha borrado un contacto en otra ventana:

```consola
>>> con.execute("UPDATE c SET ... WHERE id=999").rowcount
0
```

**La conexión como gestor de contexto**, que es una transacción y **no** cierra la conexión:

```consola
>>> with con:
...     con.execute("INSERT ...")      # esto va
...     con.execute("INSERT ...")      # esto choca
IntegrityError: UNIQUE constraint failed
>>> # las dos inserciones deshechas
```

Es lo que hace falta para importar un CSV: o entra entero o no entra nada. Y hay un motivo de velocidad, medido con 500 filas:

|  | Tiempo |
| --- | --- |
| Un `commit` por fila | 114 ms |
| Un `commit` al final | 1 ms |

Cien veces más rápido, porque cada `commit` espera al disco. Para dar de alta un contacto da igual; para importar, no.

Y un aviso sobre los errores de integridad: **el duplicado y el nulo son el mismo tipo de excepción**, así que no se pueden distinguir sin mirar el texto:

```consola
>>> IntegrityError: UNIQUE constraint failed: c.correo
>>> IntegrityError: NOT NULL constraint failed: c.correo
```

La respuesta buena no es analizar el mensaje, es **validar antes** con lo de la lección 39, y dejar la restricción de la base como red de seguridad para lo que se escape.

## El programa

```python title="contactos.py"
"""La lógica: SQLite, validación y orden. Ni una línea de tkinter."""

import csv
import dataclasses
import locale
import pathlib
import re
import sqlite3
import unicodedata

CORREO = re.compile(r"[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}")
TELEFONO = re.compile(r"[\d +()-]{9,}")

ESQUEMA = """
CREATE TABLE IF NOT EXISTS contactos (
    id       INTEGER PRIMARY KEY,
    nombre   TEXT NOT NULL,
    correo   TEXT NOT NULL UNIQUE,
    telefono TEXT NOT NULL DEFAULT '',
    grupo    TEXT NOT NULL DEFAULT 'Sin grupo',
    notas    TEXT NOT NULL DEFAULT ''
);
"""

GRUPOS = ("Sin grupo", "Familia", "Amigos", "Trabajo", "Proveedores")
CAMPOS = ("nombre", "correo", "telefono", "grupo", "notas")


class ErrorDeDatos(ValueError):
        """Lleva el campo, para que la interfaz sepa dónde poner el foco."""

    def __init__(self, campo, motivo):
                super().__init__(motivo)
        self.campo, self.motivo = campo, motivo


@dataclasses.dataclass(frozen=True)
class Contacto:
        id: int | None
    nombre: str
    correo: str
    telefono: str = ""
    grupo: str = "Sin grupo"
    notas: str = ""

    @classmethod
    def desde_fila(cls, fila):
                return cls(**{clave: fila[clave] for clave in ("id",) + CAMPOS})


def sin_tildes(texto):
        """Para comparar: 'ácido' y 'ACIDO' tienen que encontrarse.

    LIKE de SQLite es insensible a mayúsculas solo en ASCII, así que esto no
    se puede delegar a la consulta.
    """
    descompuesto = unicodedata.normalize("NFD", texto.casefold())
    return "".join(c for c in descompuesto
                   if unicodedata.category(c) != "Mn")


def validar(datos):
        """Devuelve los datos limpios o lanza ErrorDeDatos con el campo."""
    # `or ""` y no un valor por defecto en get: DictReader devuelve None para
    # una columna que falta en una fila, y str(None) sería "None".
    limpios = {campo: str(datos.get(campo) or "").strip() for campo in CAMPOS}
    # Un grupo en blanco es "sin grupo", no un error: el CSV de otro programa
    # puede no traer la columna, y quien llama desde código tampoco tiene por
    # qué darla.
    limpios["grupo"] = limpios["grupo"] or GRUPOS[0]
    if not limpios["nombre"]:
                raise ErrorDeDatos("nombre", "El nombre no puede estar vacío")
    if len(limpios["nombre"]) > 80:
                raise ErrorDeDatos("nombre", "Como máximo 80 caracteres")
    if not limpios["correo"]:
                raise ErrorDeDatos("correo", "El correo no puede estar vacío")
    if not CORREO.fullmatch(limpios["correo"]):
                raise ErrorDeDatos("correo", "Tiene que ser algo como nombre@sitio.es")
    if limpios["telefono"] and not TELEFONO.fullmatch(limpios["telefono"]):
                raise ErrorDeDatos("telefono", "Nueve dígitos o más, sin letras")
    if limpios["grupo"] not in GRUPOS:
                raise ErrorDeDatos("grupo", f"Tiene que ser uno de: {', '.join(GRUPOS)}")
    return limpios


class Agenda:
        """El almacén. Una conexión que vive lo que vive el programa."""

    def __init__(self, ruta):
                self.ruta = pathlib.Path(ruta)
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        self.con = sqlite3.connect(self.ruta)
        self.con.row_factory = sqlite3.Row      # filas por nombre
        self.con.executescript(ESQUEMA)
        self.con.commit()

    def cerrar(self):
                self.con.close()

    # --- lectura

    def todos(self):
                filas = self.con.execute("SELECT * FROM contactos")
        return [Contacto.desde_fila(fila) for fila in filas]

    def buscar(self, texto="", grupo=None):
                """Se filtra en Python y no con LIKE, por dos razones: el % y el _ que
        escriba el usuario serían comodines, y LIKE ignora las mayúsculas solo
        en ASCII, así que 'ÁCIDO' no encontraría 'ácido'."""
        aguja = sin_tildes(texto.strip())
        encontrados = []
        for contacto in self.todos():
                        if grupo and contacto.grupo != grupo:
                                continue
            if aguja and not any(
                    aguja in sin_tildes(getattr(contacto, campo))
                    for campo in ("nombre", "correo", "telefono", "notas")):
                                continue
            encontrados.append(contacto)
        return encontrados

    @staticmethod
    def ordenados(contactos, columna="nombre", invertido=False):
                """Con locale.strxfrm: ORDER BY pone la ñ y las tildes después de la Z,
        y COLLATE NOCASE tampoco lo arregla porque solo entiende ASCII."""
        def clave(contacto):
                        valor = getattr(contacto, columna)
            return locale.strxfrm(valor) if isinstance(valor, str) else valor
        return sorted(contactos, key=clave, reverse=invertido)

    def por_id(self, identificador):
                fila = self.con.execute("SELECT * FROM contactos WHERE id = ?",
                                (identificador,)).fetchone()
        return Contacto.desde_fila(fila) if fila else None

    def cuantos_por_grupo(self):
                filas = self.con.execute(
            "SELECT grupo, count(*) AS cuantos FROM contactos "
            "GROUP BY grupo")
        return {fila["grupo"]: fila["cuantos"] for fila in filas}

    # --- escritura

    def guardar(self, datos, identificador=None):
                """Alta o modificación. Devuelve el id. Valida antes de tocar la base:
        la restricción UNIQUE es la red, no la primera línea de defensa."""
        limpios = validar(datos)
        self._comprobar_correo_libre(limpios["correo"], identificador)
        campos = ", ".join(f"{campo} = ?" for campo in CAMPOS)
        valores = [limpios[campo] for campo in CAMPOS]
        try:
                        with self.con:              # transacción, no cierra la conexión
                                if identificador is None:
                                        cursor = self.con.execute(
                        f"INSERT INTO contactos "
                        f"({', '.join(CAMPOS)}) "
                        f"VALUES ({', '.join('?' * len(CAMPOS))})", valores)
                    return cursor.lastrowid
                cursor = self.con.execute(
                    f"UPDATE contactos SET {campos} WHERE id = ?",
                    valores + [identificador])
                if cursor.rowcount == 0:
                                        raise ErrorDeDatos("nombre", "Ese contacto ya no existe")
                return identificador
        except sqlite3.IntegrityError as error:
            # Aquí solo se llega si algo se ha escapado a la validación.
                        raise ErrorDeDatos("correo", f"La base lo rechaza: {error}")

    def _comprobar_correo_libre(self, correo, identificador):
                fila = self.con.execute(
            "SELECT id, nombre FROM contactos WHERE correo = ?",
            (correo,)).fetchone()
        if fila and fila["id"] != identificador:
                        raise ErrorDeDatos("correo",
                               f"Ese correo ya es de {fila['nombre']}")

    def borrar(self, identificador):
                with self.con:
                        cursor = self.con.execute("DELETE FROM contactos WHERE id = ?",
                                      (identificador,))
        return cursor.rowcount == 1

    # --- CSV

    def exportar(self, ruta):
                contactos = self.ordenados(self.todos())
        with open(ruta, "w", encoding="utf-8", newline="") as fichero:
                        escritor = csv.DictWriter(fichero, fieldnames=CAMPOS)
            escritor.writeheader()
            for contacto in contactos:
                                escritor.writerow({campo: getattr(contacto, campo)
                                   for campo in CAMPOS})
        return len(contactos)

    def importar(self, ruta):
                """Todo o nada, y un solo commit: con uno por fila, 500 filas pasan de
        1 ms a 114 ms, porque cada commit espera al disco.

        Devuelve (cuántos entraron, lista de problemas).
        """
        try:
                        with open(ruta, encoding="utf-8", newline="") as fichero:
                                filas = list(csv.DictReader(fichero))
        except (OSError, UnicodeDecodeError) as error:
                        raise ErrorDeDatos("fichero", f"No se puede leer: {error}")
        if not filas:
                        raise ErrorDeDatos("fichero", "El fichero no tiene filas")

        buenas, problemas = [], []
        correos = {contacto.correo for contacto in self.todos()}
        for numero, fila in enumerate(filas, start=2):   # 1 es la cabecera
                        try:
                                limpios = validar(fila)
            except ErrorDeDatos as error:
                                problemas.append(f"Línea {numero}: {error.motivo}")
                continue
            if limpios["correo"] in correos:
                                problemas.append(f"Línea {numero}: {limpios['correo']} repetido")
                continue
            correos.add(limpios["correo"])
            buenas.append([limpios[campo] for campo in CAMPOS])

        if buenas:
                        with self.con:              # un solo commit para todas
                                self.con.executemany(
                    f"INSERT INTO contactos ({', '.join(CAMPOS)}) "
                    f"VALUES ({', '.join('?' * len(CAMPOS))})", buenas)
        return len(buenas), problemas
```

```python title="gestor.py"
"""La interfaz. El Treeview es una vista: los datos están en la agenda."""

import locale
import os
import pathlib
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import contactos

MARGEN = 12
AIRE = 6
GRIS = "#8E8E93"
VERDE = "#2E7D32"
ROSA = "#C2185B"

ESPERA = 250        # ms de quietud antes de buscar (lección 23)
COLUMNAS = (("nombre", "Nombre", 200), ("correo", "Correo", 220),
            ("telefono", "Teléfono", 130), ("grupo", "Grupo", 110))
SUBE, BAJA = " ▲", " ▼"


def carpeta_de_datos():
        """La base va aquí y no junto al programa: con --onefile eso es una
    carpeta temporal que se borra al salir (lección 45)."""
    if sys.platform == "darwin":
                base = pathlib.Path.home() / "Library" / "Application Support"
    elif sys.platform == "win32":
                base = pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home()))
    else:
                base = pathlib.Path(os.environ.get(
            "XDG_CONFIG_HOME", pathlib.Path.home() / ".config"))
    return base / "Contactos"


class Formulario(tk.Toplevel):
        """Modal con la receta completa de la lección 38 y la validación de la 39."""

    def __init__(self, padre, titulo, valores=None):
                super().__init__(padre)
        self.withdraw()                     # configurar antes de mostrar
        self.resultado = None               # por defecto, cancelado
        self.title(titulo)
        self.resizable(False, False)

        valores = valores or {}
        self.campos = {}
        self.avisos = {}

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)
        etiquetas = {"nombre": "Nombre", "correo": "Correo",
                     "telefono": "Teléfono", "grupo": "Grupo",
                     "notas": "Notas"}
        for fila, campo in enumerate(contactos.CAMPOS):
                        ttk.Label(cuerpo, text=f"{etiquetas[campo]}:").grid(
                row=fila * 2, column=0, sticky="w", padx=(0, AIRE))
            variable = tk.StringVar(value=str(valores.get(campo, "")))
            if campo == "grupo":
                                widget = ttk.Combobox(cuerpo, textvariable=variable,
                                      values=contactos.GRUPOS,
                                      state="readonly", width=30)
                if not variable.get():
                                        variable.set(contactos.GRUPOS[0])
            else:
                                widget = ttk.Entry(cuerpo, textvariable=variable, width=32)
            widget.grid(row=fila * 2, column=1, sticky="ew")
            # El rótulo ocupa sitio siempre: si apareciera y desapareciera,
            # el formulario saltaría en cada cambio (lección 39).
            aviso = ttk.Label(cuerpo, text=" ", foreground=ROSA)
            aviso.grid(row=fila * 2 + 1, column=1, sticky="w")
            self.campos[campo] = (variable, widget)
            self.avisos[campo] = aviso
            variable.trace_add("write", lambda *_, c=campo: self.limpiar(c))

        botones = ttk.Frame(cuerpo)
        botones.grid(row=len(contactos.CAMPOS) * 2, column=0, columnspan=2,
                     sticky="ew", pady=(MARGEN, 0))
        ttk.Button(botones, text="Cancelar", command=self.cancelar).pack(
            side="right")
        ttk.Button(botones, text="Guardar", command=self.aceptar).pack(
            side="right", padx=AIRE)
        cuerpo.columnconfigure(1, weight=1)

        self.bind("<Return>", lambda evento: self.aceptar())
        self.bind("<Escape>", lambda evento: self.cancelar())
        self.protocol("WM_DELETE_WINDOW", self.cancelar)

        self.transient(padre)
        self.centrar_sobre(padre)
        self.deiconify()
        self.wait_visibility()
        self.grab_set()
        self.campos["nombre"][1].focus_set()

    def limpiar(self, campo):
                self.avisos[campo].configure(text=" ")
        self.campos[campo][1].state(["!invalid"])

    def valores(self):
                return {campo: variable.get()
                for campo, (variable, _) in self.campos.items()}

    def aceptar(self):
                """La validación es de la lógica; aquí solo se pinta el resultado."""
        try:
                        contactos.validar(self.valores())
        except contactos.ErrorDeDatos as error:
                        self.senalar(error)
            return
        self.resultado = self.valores()
        self.destroy()

    def senalar(self, error):
                """El aviso va junto al campo y el foco también (lección 39)."""
        if error.campo in self.avisos:
                        self.avisos[error.campo].configure(text=error.motivo)
            variable, widget = self.campos[error.campo]
            widget.state(["invalid"])
            widget.focus_set()
            if isinstance(widget, ttk.Entry):
                                widget.selection_range(0, "end")

    def cancelar(self):
                self.resultado = None
        self.destroy()

    def centrar_sobre(self, padre):
                self.update_idletasks()
        x = padre.winfo_x() + (padre.winfo_width() - self.winfo_width()) // 2
        y = padre.winfo_y() + (padre.winfo_height() - self.winfo_height()) // 3
        self.geometry(f"+{max(0, x)}+{max(0, y)}")


class Aplicacion(tk.Tk):

        def __init__(self, agenda):
                super().__init__()
        self.agenda = agenda
        self.title("Contactos")
        self.minsize(720, 460)

        self.busqueda = tk.StringVar()
        self.grupo = tk.StringVar(value="Todos")
        self.estado = tk.StringVar()
        self.columna = "nombre"
        self.invertido = False
        self.pendiente = None

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)

        barra = ttk.Frame(cuerpo)
        barra.pack(fill="x")
        ttk.Label(barra, text="Buscar:").pack(side="left")
        campo = ttk.Entry(barra, textvariable=self.busqueda, width=26)
        campo.pack(side="left", padx=AIRE)
        ttk.Label(barra, text="Grupo:").pack(side="left", padx=(MARGEN, AIRE))
        ttk.Combobox(barra, textvariable=self.grupo, state="readonly", width=14,
                     values=("Todos",) + contactos.GRUPOS).pack(side="left")
        ttk.Button(barra, text="Nuevo", command=self.nuevo).pack(side="right")

        marco = ttk.Frame(cuerpo)
        marco.pack(fill="both", expand=True, pady=(MARGEN, AIRE))
        self.arbol = ttk.Treeview(
            marco, columns=[clave for clave, _, _ in COLUMNAS],
            show="headings", selectmode="browse")
        for clave, titulo, ancho in COLUMNAS:
                        self.arbol.heading(clave, text=titulo,
                               command=lambda c=clave: self.ordenar_por(c))
            self.arbol.column(clave, width=ancho,
                              anchor="w" if clave != "telefono" else "e")
        vertical = ttk.Scrollbar(marco, orient="vertical",
                                 command=self.arbol.yview)
        self.arbol.configure(yscrollcommand=vertical.set)   # los dos lados
        vertical.pack(side="right", fill="y")
        self.arbol.pack(side="left", fill="both", expand=True)
        self.arbol.tag_configure("par", background="#F7F7F9")

        acciones = ttk.Frame(cuerpo)
        acciones.pack(fill="x")
        self.boton_editar = ttk.Button(acciones, text="Editar",
                                       command=self.editar, state="disabled")
        self.boton_editar.pack(side="left")
        self.boton_borrar = ttk.Button(acciones, text="Borrar",
                                       command=self.borrar, state="disabled")
        self.boton_borrar.pack(side="left", padx=AIRE)
        ttk.Button(acciones, text="Exportar CSV…",
                   command=self.exportar).pack(side="right")
        ttk.Button(acciones, text="Importar CSV…",
                   command=self.importar).pack(side="right", padx=AIRE)

        ttk.Separator(cuerpo, orient="horizontal").pack(fill="x",
                                                       pady=(MARGEN, AIRE))
        self.pie = ttk.Label(cuerpo, textvariable=self.estado)
        self.pie.pack(anchor="w")

        # trace_add y no un bind de teclas: así reacciona también a un pegado.
        self.busqueda.trace_add("write", lambda *_: self.buscar_luego())
        self.grupo.trace_add("write", lambda *_: self.refrescar())
        self.arbol.bind("<<TreeviewSelect>>", self.al_seleccionar)
        self.arbol.bind("<Double-Button-1>", lambda evento: self.editar())
        self.arbol.bind("<Return>", lambda evento: self.editar())
        self.arbol.bind("<Delete>", lambda evento: self.borrar())
        self.bind("<Control-n>", lambda evento: self.nuevo())
        self.bind("<Control-f>", lambda evento: campo.focus_set())
        self.bind("<Destroy>", self.al_destruir)
        self.protocol("WM_DELETE_WINDOW", self.destroy)

        self.refrescar()
        self.centrar()

    # --- la vista

    def buscar_luego(self):
                """Amortiguado: buscar en cada tecla recorrería la agenda entera
        cinco veces por palabra (lección 23)."""
        if self.pendiente is not None:      # after_cancel(None) lanza ValueError
                        self.after_cancel(self.pendiente)
        self.pendiente = self.after(ESPERA, self.refrescar)

    def refrescar(self):
                self.pendiente = None
        seleccionado = self.id_seleccionado()    # la selección no sobrevive
        grupo = None if self.grupo.get() == "Todos" else self.grupo.get()
        encontrados = self.agenda.buscar(self.busqueda.get(), grupo)
        encontrados = self.agenda.ordenados(encontrados, self.columna,
                                            self.invertido)

        self.arbol.delete(*self.arbol.get_children())
        for numero, contacto in enumerate(encontrados):
            # El iid es la clave de la base: así no hace falta un diccionario
            # paralelo que se pueda desincronizar.
                        self.arbol.insert(
                "", "end", iid=str(contacto.id),
                values=(contacto.nombre, contacto.correo,
                        contacto.telefono or "—", contacto.grupo),
                tags=("par",) if numero % 2 else ())

        if seleccionado is not None and self.arbol.exists(str(seleccionado)):
                        self.arbol.selection_set(str(seleccionado))
            self.arbol.see(str(seleccionado))
        self.al_seleccionar()
        self.poner_flechas()
        self.contar(len(encontrados))

    def poner_flechas(self):
                for clave, titulo, _ in COLUMNAS:
                        flecha = ""
            if clave == self.columna:
                                flecha = BAJA if self.invertido else SUBE
            self.arbol.heading(clave, text=titulo + flecha)

    def contar(self, mostrados):
                total = len(self.agenda.todos())
        if mostrados == total:
                        self.decir(f"{total} contacto{'s' if total != 1 else ''}", GRIS)
        else:
                        self.decir(f"{mostrados} de {total} contactos", GRIS)

    def ordenar_por(self, columna):
                """Segundo clic en la misma columna: al revés. Otra columna: reinicia."""
        self.invertido = not self.invertido if columna == self.columna else False
        self.columna = columna
        self.refrescar()

    def id_seleccionado(self):
                seleccion = self.arbol.selection()      # tupla vacía si no hay nada
        return int(seleccion[0]) if seleccion else None

    def al_seleccionar(self, evento=None):
                hay = self.id_seleccionado() is not None
        estado = "normal" if hay else "disabled"
        self.boton_editar.configure(state=estado)
        self.boton_borrar.configure(state=estado)

    def decir(self, mensaje, color=ROSA):
                self.estado.set(mensaje)
        self.pie.configure(foreground=color)

    # --- las acciones

    def nuevo(self):
                formulario = Formulario(self, "Nuevo contacto")
        self.wait_window(formulario)            # wait_window devuelve None
        if formulario.resultado is None:        # cancelado
                        return
        try:
                        identificador = self.agenda.guardar(formulario.resultado)
        except contactos.ErrorDeDatos as error:
                        self.decir(f"{error.campo}: {error.motivo}")
            return
        self.refrescar()
        if self.arbol.exists(str(identificador)):
                        self.arbol.selection_set(str(identificador))
            self.arbol.see(str(identificador))
        self.decir(f"Añadido {formulario.resultado['nombre']}", VERDE)

    def editar(self):
                identificador = self.id_seleccionado()
        if identificador is None:
                        return
        contacto = self.agenda.por_id(identificador)
        if contacto is None:                    # borrado por otra vía
            # Primero refrescar y después hablar: refrescar() reescribe el pie
            # con el recuento, así que al revés el aviso no se llega a ver.
                        self.refrescar()
            self.decir("Ese contacto ya no existe")
            return
        formulario = Formulario(self, f"Editar {contacto.nombre}",
                                valores=contacto.__dict__)
        self.wait_window(formulario)
        if formulario.resultado is None:
                        return
        try:
                        self.agenda.guardar(formulario.resultado, identificador)
        except contactos.ErrorDeDatos as error:
                        self.decir(f"{error.campo}: {error.motivo}")
            return
        self.refrescar()
        self.decir(f"Guardado {formulario.resultado['nombre']}", VERDE)

    def borrar(self):
                """Confirmación justificada: borrar no se puede deshacer (lección 36)."""
        identificador = self.id_seleccionado()
        if identificador is None:
                        return
        contacto = self.agenda.por_id(identificador)
        if contacto is None:
                        self.refrescar()
            self.decir("Ese contacto ya no existe")
            return
        if not messagebox.askyesno(
                "Borrar contacto", f"¿Borrar a {contacto.nombre}?",
                detail="No se puede deshacer.", default="cancel",
                parent=self):
                        return
        if self.agenda.borrar(identificador):
                        self.refrescar()
            self.decir(f"Borrado {contacto.nombre}", GRIS)
        else:
                        self.refrescar()
            self.decir("Ese contacto ya no existía")

    def exportar(self):
                ruta = filedialog.asksaveasfilename(
            parent=self, title="Exportar contactos", defaultextension=".csv",
            initialfile="contactos.csv",
            filetypes=[("CSV", "*.csv"), ("Todos", "*.*")])
        if not ruta:
                        return
        try:
                        cuantos = self.agenda.exportar(pathlib.Path(ruta))
        except OSError as error:
                        self.decir(f"No se ha podido exportar: {error}")
            return
        self.decir(f"{cuantos} contactos exportados a "
                   f"{pathlib.Path(ruta).name}", VERDE)

    def importar(self):
                ruta = filedialog.askopenfilename(
            parent=self, title="Importar contactos",
            filetypes=[("CSV", "*.csv"), ("Todos", "*.*")])
        if not ruta:
                        return
        try:
                        cuantos, problemas = self.agenda.importar(pathlib.Path(ruta))
        except contactos.ErrorDeDatos as error:
                        self.decir(error.motivo)
            return
        self.refrescar()
        if not problemas:
                        self.decir(f"{cuantos} contactos importados", VERDE)
            return
        # Se informa de lo que no entró, pero lo que entró ya está.
        self.decir(f"{cuantos} importados, {len(problemas)} con problemas")
        messagebox.showwarning(
            "Importación con avisos",
            f"Se han importado {cuantos} contactos.",
            detail="\n".join(problemas[:10]), parent=self)

    # --- cierre

    def al_destruir(self, evento):
                if evento.widget is not self:       # llega de cada descendiente
                        return
        if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
        self.agenda.cerrar()

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


def main():
        try:
                locale.setlocale(locale.LC_COLLATE, "")   # el orden del sistema
    except locale.Error:
                pass
    agenda = contactos.Agenda(carpeta_de_datos() / "contactos.db")
    Aplicacion(agenda).mainloop()


if __name__ == "__main__":
        main()
```

> [!resumen] En resumen
>
> Un gestor de contactos con base de datos convierte en obligatorio lo que la lección 27 dejó como consejo: **el `Treeview` es una vista y los datos están en otro sitio**. Cuatro decisiones. Primera: **los `iid` son las claves de la base**, porque los `iid` son cadenas siempre y no se pueden repetir (`TclError: Item 1 already exists`), que es exactamente el contrato de una clave primaria, y así se elimina el diccionario paralelo que podría desincronizarse; de la selección a la base se vuelve con un `int()`. Segunda: al reconstruir la tabla, **la selección no vuelve sola** y hay que guardarla y restaurarla, con `exists()` antes porque la fila puede haber salido del filtro (`selection_set` de un `iid` que no está lanza `TclError`), y con `see()` después; las cabeceras sí sobreviven. Tercera: **ordenar en SQL da un resultado equivocado en español**: `ORDER BY` pone las minúsculas después de todas las mayúsculas, y `COLLATE NOCASE` solo entiende ASCII, así que `Ñandú`, `Óscar` y `ácido` acaban después de la Z; se ordena en Python con `locale.strxfrm`, que es lo coherente con la lección 41 porque ordenar es una operación sobre datos. Cuarta: **`LIKE` tiene un agujero**, porque el `%` y el `_` que escriba el usuario son comodines (buscar `a_b` encuentra también `axb`), y además ignora las mayúsculas solo en ASCII, así que `ÁCIDO` no encuentra `ácido`; se arregla con `ESCAPE` o, como aquí, filtrando en Python con las tildes normalizadas, que es lo razonable mientras todo quepa en memoria. De SQLite hacen falta tres cosas: **`row_factory = sqlite3.Row`** para acceder por nombre, **`rowcount`** para detectar que el contacto ya no existe, y **`with con` como transacción** (que no cierra la conexión), imprescindible para que una importación entre entera o no entre; y con motivo de velocidad, medido: **500 filas con un `commit` por fila tardan 114 ms y con uno al final, 1 ms**. Los errores de integridad **no se pueden distinguir sin leer el texto** (el duplicado y el nulo son los dos `IntegrityError`), así que se valida antes con lo de la lección 39 y la restricción de la base queda como red de seguridad. El resto es reutilización: la búsqueda amortiguada con `after`/`after_cancel`, el modal con la receta completa de la 38 y los avisos junto al campo de la 39, la confirmación justificada de la 36 para borrar, la base en la carpeta de datos de la 43 para que sobreviva a `--onefile`, y la limpieza en `<Destroy>` de la 40.

> [!ejercicio] Practica
>
> 1. Escribe los dos ficheros y ejecútalo. Añade cinco contactos, incluyendo uno que empiece por `Ñ` y otro con tilde.
> 2. Comprueba que al ordenar por nombre la `Ñ` queda entre la N y la O.
> 3. Cambia `ordenados` para que use `sorted(..., key=lambda c: c.nombre)` sin `locale` y compara el orden.
> 4. Haz la consulta con `ORDER BY nombre COLLATE NOCASE` y compara los tres órdenes.
> 5. Añade un contacto con `100%` en las notas y búscalo. Después cambia `buscar` para que use `LIKE ?` y comprueba qué encuentra.
> 6. Busca `ACIDO` con el filtro de Python y después con `LIKE`. Explica la diferencia.
> 7. Intenta dar de alta dos contactos con el mismo correo y anota el mensaje.
> 8. Quita la llamada a `_comprobar_correo_libre` y repite. Compara los dos mensajes de error.
> 9. Selecciona un contacto, escribe algo en el cuadro de búsqueda que lo excluya y comprueba que no revienta.
> 10. Quita el `if self.arbol.exists(...)` de `refrescar` y repite el ejercicio anterior. Copia el error.
> 11. Exporta a CSV, borra todos los contactos y vuelve a importar. Comprueba que salen los mismos.
> 12. Prepara un CSV con una fila sin correo y otra con un correo repetido. Impórtalo y comprueba qué entra y qué se avisa.
> 13. Cambia `importar` para que haga `commit` en cada fila, importa mil filas y mide el tiempo con `time.monotonic()`.
> 14. Haz que la importación falle a mitad a propósito y comprueba que no queda ninguna fila a medias.
> 15. Añade una columna «notas» a la tabla y a la vista, y haz que se pueda ordenar por ella.
> 16. Añade el contador por grupo de `cuantos_por_grupo` a la barra de estado.
