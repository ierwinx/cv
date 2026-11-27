---
titulo: "Proyecto: un editor de texto"
resumen: "Un editor completo juntando todo el módulo, con las tres partes que de verdad cuestan: la bandera de cambios sin guardar, el cierre que pregunta, y la búsqueda que no se cuelga."
minutos: 32
orden: 46
---

Toca juntarlo todo. Un editor de texto es el proyecto clásico para esto porque no necesita ningún widget nuevo y sin embargo obliga a resolver bien tres cosas que en los ejemplos sueltos se podían esquivar: **saber si hay cambios sin guardar, no perder el trabajo de nadie al cerrar, y buscar sin colgar el programa.**

No hay nada nuevo en esta lección: todo lo que se usa está explicado antes. Lo que hay es un programa que funciona de verdad, con las decisiones tomadas y explicadas, y con las trampas que solo aparecen cuando las piezas se juntan.

> [!objetivo] Qué vas a aprender
>
> Escribir un editor de texto completo: abrir, guardar, guardar como, nuevo, deshacer y rehacer, buscar y reemplazar, ir a una línea, contador de posición y de palabras, ficheros recientes, tamaño de letra, y el aviso de cambios sin guardar al cerrar. Y entender por qué la bandera de modificación del `Text` no se puede usar tal cual.

## Lo que se usa, y de dónde sale

Antes de empezar, el inventario, porque parte del valor de un proyecto es ver cuánto se reutiliza:

| Pieza | Lección |
| --- | --- |
| `Text` con índices, etiquetas y `undo` | 16 |
| Barra de menús con aceleradores | 31 |
| `askopenfilename`, `asksaveasfilename` | 37 |
| `askyesnocancel` para el cierre | 36 |
| Ventana no modal para buscar | 38 |
| Aplicación en clases, comunicación entre piezas | 40 |
| Lógica sin `tkinter` | 41 |
| Preferencias, geometría validada, recientes | 43 |
| `report_callback_exception` y rutas empaquetables | 45 |

Y la arquitectura es la de la lección 41: un módulo `documento.py` que no importa `tkinter` y sabe leer, escribir y contar, y un `editor.py` que es la ventana.

## La bandera de cambios, que no vale tal cual

El `Text` lleva su propia bandera de modificación, y es la tentación obvia:

```consola
>>> texto.edit_modified()
0
>>> texto.insert("1.0", "hola")
>>> texto.edit_modified()
1
```

Devuelve `0` o `1`, no `True` o `False`, que ya es un aviso de que esto es una envoltura fina de Tcl. Y tiene cuatro comportamientos que hay que conocer antes de fiarse.

**Uno: borrar también modifica**, lo cual es correcto pero se olvida:

```consola
>>> texto.edit_modified(False)
>>> texto.delete("1.0", "end")
>>> texto.edit_modified()
1
```

**Dos: `edit_reset()` no la baja.** Esto sorprende, porque `edit_reset` suena a «déjalo como estaba»:

```consola
>>> texto.edit_modified(False)
>>> texto.insert("1.0", "uno")
>>> texto.edit_reset()
>>> texto.edit_modified()
1
```

`edit_reset` borra el **historial de deshacer**, no la bandera. Son dos cosas distintas y al abrir un fichero hay que hacer las dos:

```python
self.texto.edit_reset()        # que el deshacer no llegue a antes de abrir
self.texto.edit_modified(False)
```

Si te olvidas del `edit_reset`, un `Ctrl+Z` después de abrir un fichero deja el editor con el contenido del fichero anterior, que es de los fallos más desconcertantes que puede tener un editor.

**Tres: cargar un fichero la deja puesta.** Insertar el contenido es una modificación como cualquier otra, así que un fichero recién abierto aparece como «sin guardar» si no se baja la bandera a mano. De ahí que las dos líneas de arriba vayan juntas siempre.

**Cuatro, y es la más útil: el evento `<<Modified>>` solo se dispara cuando la bandera cambia**, no en cada tecla:

```consola
>>> # tres inserciones seguidas
>>> avisos
[1]
>>> texto.edit_modified(False)
>>> avisos
[1, 0]
```

Eso es exactamente lo que hace falta para el asterisco del título: en vez de recalcular el título en cada pulsación, se ata `<<Modified>>` y se actualiza en los dos momentos que importan. Lo que **no** hay que hacer es bajar la bandera dentro del manejador: se vuelve a disparar (medido, entra dos veces), y aunque no llega a ser un bucle infinito, es innecesario y confunde.

## El cierre que pregunta

Aquí está el caso legítimo de diálogo que la lección 36 dejó anotado. Perder el trabajo de alguien es irreversible, no se puede posponer la decisión, y hay **tres** respuestas posibles, no dos:

```python
respuesta = messagebox.askyesnocancel(
    "Cambios sin guardar",
    f"¿Quieres guardar los cambios en {nombre}?",
    detail="Si no los guardas, se perderán.",
    parent=self)
if respuesta is None:       # y no `if not respuesta`
        return False            # Cancelar: no se cierra nada
if respuesta and not self.guardar():
        return False            # quiso guardar y no se pudo
return True
```

El `is None` es obligatorio y es el hallazgo de la lección 36: `False` (no guardar) y `None` (cancelar) son las dos falsas en Python, y confundirlas significa que el botón Cancelar cierra el programa y tira el trabajo. Es el peor fallo que puede tener un editor y se escribe sin darse cuenta.

Y esa función hace falta en **tres** sitios, no en uno: al cerrar la ventana, al hacer «Nuevo» y al abrir otro fichero. De ahí que sea un método (`hay_permiso_para_descartar`) y no código dentro del manejador de cierre.

## La búsqueda que no se cuelga

`search` es potente y tiene dos trampas.

**La primera: no encontrar devuelve una cadena vacía, no `None`.**

```consola
>>> texto.search("no existe", "1.0", stopindex="end")
''
```

Así que la comprobación es `if not donde`, y un `is None` no serviría.

**La segunda es peor**, y es la que cuelga el programa:

```consola
>>> texto.search("", "1.0")
'1.0'
```

Buscar la cadena vacía devuelve `1.0` **siempre**, así que el bucle que recorre todas las apariciones no termina nunca y el programa se queda congelado sin ningún error. Y la cadena vacía es exactamente lo que hay en el cuadro de búsqueda mientras alguien no ha escrito nada. Una línea:

```python
if not patron:
        return []
```

Después, el patrón para recorrer todas las apariciones usa `count` para saber cuánto medía lo encontrado:

```python
donde = self.texto.search(patron, donde, stopindex="end",
                          nocase=not distingue, count=self.cuantos)
```

Y **hay que avanzar la longitud encontrada, no un carácter**, porque si no los resultados se solapan. Medido con `"aa"` sobre `"aaaa y aaaa"`:

```consola
>>> # avanzando +1c
6 resultados ['1.0', '1.1', '1.2', '1.7', '1.8', '1.9']
>>> # avanzando la longitud
4 resultados ['1.0', '1.2', '1.7', '1.9']
```

Seis frente a cuatro. Un editor cuenta cuatro, porque resaltar `1.0` y `1.1` a la vez pinta la misma letra dos veces y el «siguiente» se queda medio atascado.

> [!consejo] Reemplazar todo, de atrás hacia delante
>
> Reemplazar cambia la longitud del texto, así que todos los índices que venían detrás se mueven. Recorrer de principio a fin y reemplazar sobre la marcha da resultados incorrectos en cuanto el reemplazo mide distinto que el patrón.
>
> La solución es recoger primero todas las posiciones y **recorrerlas al revés**:
>
> ```python
> for inicio, largo in reversed(posiciones):
>         self.texto.delete(inicio, f"{inicio}+{largo}c")
>     self.texto.insert(inicio, reemplazo)
> ```
>
> Yendo de atrás hacia delante, cada cambio solo mueve lo que ya está procesado. Es el mismo truco que se usa para borrar elementos de una lista mientras se recorre.

## El fichero que no es texto

Un editor tiene que leer también ficheros que no guardaste tú, y no todos son `utf-8`: un `.txt` de hace quince años probablemente es `latin-1`. Lo razonable es intentar uno y después el otro, y eso funciona… hasta que alguien abre una imagen.

> [!aviso] `latin-1` no falla nunca
>
> Esta es la que aparece al probar el programa con un PNG, y desmonta la cadena de codificaciones:
>
> ```consola
> >>> datos = pathlib.Path("foto.png").read_bytes()
> >>> datos.decode("utf-8")
> UnicodeDecodeError: ...
> >>> texto, cod = leer(pathlib.Path("foto.png"))
> >>> cod
> 'latin-1'
> ```
>
> `latin-1` asigna un carácter a **cada uno de los 256 valores posibles de un byte**, así que descodificar con él no puede fallar: siempre devuelve algo. Y ese «algo» son miles de caracteres de control que la ventana intenta pintar.
>
> Así que una cadena de codificaciones que acabe en `latin-1` **no puede detectar un binario**, por construcción. Hay que comprobarlo antes, y la heurística que basta es mirar los bytes:
>
> ```python
> def parece_binario(datos, muestra=4096):
>         trozo = datos[:muestra]
>     if b"\x00" in trozo:
>                 return True
>     raros = trozo.translate(None, delete=SOPORTABLES)
>     return len(raros) / len(trozo) > 0.05
> ```
>
> Un byte cero no aparece en texto, y los de control (salvo el salto de línea, el retorno y el tabulador) tampoco. Comprobado con un PNG real, un JPEG, un CSV, código Python y texto en `latin-1`: acierta en los seis.

## Dos detalles del `Text` que se cuelan

**El `get` que añade un salto de línea.** El `Text` siempre termina en un `\n` que no has escrito:

```consola
>>> texto.get("1.0", "end")
'Hola mundo\n\n'
>>> texto.get("1.0", "end-1c")
'Hola mundo\n'
```

**Siempre `end-1c` al guardar**, o el fichero gana una línea en blanco cada vez que se guarda.

**El deshacer se queja cuando no hay nada.**

```consola
>>> texto.edit_undo()
TclError: nothing to undo
```

No es un fallo, es cómo avisa, pero hay que capturarlo o el `Ctrl+Z` de más lanza una excepción que con `--windowed` nadie vería (lección 45).

Y uno menor pero útil: ir a una línea que no existe no falla, se queda en el final.

```consola
>>> texto.mark_set("insert", "99.0")      # en un texto de 2 líneas
>>> texto.index("insert")
'3.0'
```

## El programa

Dos ficheros, como manda la lección 41.

```python title="documento.py"
"""La lógica: leer, escribir y contar. Ni una línea de tkinter."""

import os
import pathlib

CODIFICACIONES = ("utf-8", "latin-1")

# Bytes que sí aparecen en un fichero de texto: los imprimibles del ASCII,
# el salto de línea, el retorno de carro y el tabulador. Todo lo demás, en
# cantidad, delata un binario.
SOPORTABLES = bytes(range(32, 127)) + b"\n\r\t\x0c\x0b" + bytes(range(128, 256))


class ErrorDeDocumento(Exception):
        """Lo que la interfaz tiene que contar al usuario."""


def leer(ruta):
        """Devuelve (texto, codificación). Intenta utf-8 y después latin-1.

    Un fichero guardado en Windows hace años no es utf-8, y fallar con un
    UnicodeDecodeError sin intentar nada más es inútil para el usuario.
    """
    datos = _bytes_de(ruta)
    if parece_binario(datos):
        # Hay que comprobarlo ANTES: latin-1 no falla nunca, así que sin esto
        # un JPEG se "abre" y se llena la ventana de basura.
                raise ErrorDeDocumento(f"{ruta.name} no parece un fichero de texto")
    for codificacion in CODIFICACIONES:
                try:
                        return datos.decode(codificacion), codificacion
        except UnicodeDecodeError:
                        continue
    raise ErrorDeDocumento(f"{ruta.name} no se puede descodificar")


def parece_binario(datos, muestra=4096):
        """Un byte cero no aparece en texto, y los de control tampoco casi.

    No es infalible (nada lo es), pero distingue un .txt de un .png, que es
    lo que hace falta.
    """
    trozo = datos[:muestra]
    if b"\x00" in trozo:
                return True
    if not trozo:
                return False
    raros = trozo.translate(None, delete=SOPORTABLES)
    return len(raros) / len(trozo) > 0.05


def _bytes_de(ruta):
        try:
                return ruta.read_bytes()
    except FileNotFoundError:
                raise ErrorDeDocumento(f"{ruta.name} ya no existe")
    except IsADirectoryError:
                raise ErrorDeDocumento(f"{ruta.name} es una carpeta")
    except OSError as error:
                raise ErrorDeDocumento(f"No se puede leer {ruta.name}: {error}")


def escribir(ruta, texto, codificacion="utf-8"):
        """Guardado atómico: un corte a mitad no deja medio fichero.

    Es el os.replace de la lección 43, y aquí importa más, porque lo que se
    puede quedar a medias es el trabajo de una persona.
    """
    temporal = ruta.with_name(ruta.name + ".tmp")
    try:
                temporal.write_text(texto, encoding=codificacion, newline="")
        os.replace(temporal, ruta)
    except OSError as error:
                temporal.unlink(missing_ok=True)
        raise ErrorDeDocumento(f"No se puede guardar {ruta.name}: {error}")


def cuentas(texto):
        """Lo que va en la barra de estado. Es un cálculo, no una vista."""
    lineas = texto.count("\n") + 1 if texto else 1
    return {
        "caracteres": len(texto),
        "palabras": len(texto.split()),
        "lineas": lineas,
    }


def nombre_para_mostrar(ruta):
        return ruta.name if ruta else "Sin título"


def posiciones_de(texto, patron, distingue_mayusculas):
        """Todas las apariciones, como (desplazamiento, longitud).

    Se avanza la longitud encontrada y no un carácter, o los resultados se
    solapan: 'aa' en 'aaaa' son dos apariciones, no tres.
    """
    if not patron:
                return []           # sin esto, el bucle del Text no termina nunca
    aguja, pajar = (patron, texto) if distingue_mayusculas else (
        patron.lower(), texto.lower())
    encontradas, desde = [], 0
    while True:
                donde = pajar.find(aguja, desde)
        if donde == -1:
                        return encontradas
        encontradas.append((donde, len(aguja)))
        desde = donde + len(aguja)
```

```python title="editor.py"
"""La interfaz. Usa documento.py y no contiene ninguna regla de negocio."""

import json
import logging
import os
import pathlib
import re
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import documento

MARGEN = 10
AIRE = 6
GRIS = "#8E8E93"
ROSA = "#C2185B"
AMARILLO = "#FFE082"
NARANJA = "#FF9F0A"

# La posición es opcional: el valor de fábrica trae solo el tamaño.
FORMA = re.compile(r"(\d+)x(\d+)(?:([+-]\d+)([+-]\d+))?")

CUANTOS_RECIENTES = 6
POR_DEFECTO = {
    "geometria": "820x560",
    "tamano_de_letra": 13,
    "recientes": [],
    "ajustar_lineas": True,
}


def carpeta_de_datos():
        """Nunca junto al ejecutable: con --onefile eso es temporal (lección 45)."""
    if sys.platform == "darwin":
                base = pathlib.Path.home() / "Library" / "Application Support"
    elif sys.platform == "win32":
                base = pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home()))
    else:
                base = pathlib.Path(os.environ.get(
            "XDG_CONFIG_HOME", pathlib.Path.home() / ".config"))
    carpeta = base / "EditorDeTexto"
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


class Preferencias:
        """La versión mínima de la lección 43: por defecto, filtro y atómico."""

    def __init__(self):
                self.ruta = carpeta_de_datos() / "preferencias.json"
        self.valores = dict(POR_DEFECTO)

    def cargar(self):
                try:
                        guardadas = json.loads(self.ruta.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
                        return self             # roto o ausente: de fábrica, sin ruido
        if isinstance(guardadas, dict):
                        self.valores.update({c: v for c, v in guardadas.items()
                                 if c in POR_DEFECTO})
        self.valores["recientes"] = [r for r in self.valores["recientes"]
                                     if pathlib.Path(r).is_file()]
        return self

    def guardar(self):
                try:
                        temporal = self.ruta.with_suffix(".tmp")
            temporal.write_text(json.dumps(self.valores, indent=2,
                                           ensure_ascii=False),
                                encoding="utf-8")
            os.replace(temporal, self.ruta)
        except OSError:
                        pass                    # no poder guardar preferencias no es grave

    def __getitem__(self, clave):
                return self.valores[clave]

    def __setitem__(self, clave, valor):
                self.valores[clave] = valor

    def anotar_reciente(self, ruta):
                texto = str(pathlib.Path(ruta).resolve())
        resto = [o for o in self.valores["recientes"] if o != texto]
        self.valores["recientes"] = [texto] + resto[:CUANTOS_RECIENTES - 1]

    def olvidar_reciente(self, ruta):
                """Comparando rutas resueltas: en macOS /var es un enlace a
        /private/var, así que la misma ruta escrita de dos formas no coincide
        hasta que se resuelven las dos."""
        fuera = pathlib.Path(ruta).resolve()
        self.valores["recientes"] = [
            o for o in self.valores["recientes"]
            if pathlib.Path(o).resolve() != fuera]


class Buscador(tk.Toplevel):
        """Ventana no modal: se busca mientras se sigue editando (lección 38)."""

    def __init__(self, padre, editor):
                super().__init__(padre)
        self.withdraw()                     # configurar antes de mostrar
        self.editor = editor
        self.title("Buscar y reemplazar")
        self.resizable(False, False)

        self.patron = tk.StringVar()
        self.reemplazo = tk.StringVar()
        self.distingue = tk.BooleanVar(value=False)
        self.resumen = tk.StringVar(value="Escribe algo que buscar")

        cuerpo = ttk.Frame(self, padding=MARGEN)
        cuerpo.pack(fill="both", expand=True)
        ttk.Label(cuerpo, text="Buscar:").grid(row=0, column=0, sticky="w")
        campo = ttk.Entry(cuerpo, textvariable=self.patron, width=28)
        campo.grid(row=0, column=1, sticky="ew", padx=AIRE)
        ttk.Label(cuerpo, text="Reemplazar por:").grid(row=1, column=0,
                                                      sticky="w", pady=AIRE)
        ttk.Entry(cuerpo, textvariable=self.reemplazo, width=28).grid(
            row=1, column=1, sticky="ew", padx=AIRE, pady=AIRE)
        ttk.Checkbutton(cuerpo, text="Distinguir mayúsculas",
                        variable=self.distingue,
                        command=self.al_cambiar).grid(row=2, column=1,
                                                      sticky="w")
        botones = ttk.Frame(cuerpo)
        botones.grid(row=3, column=0, columnspan=2, sticky="ew",
                     pady=(MARGEN, 0))
        ttk.Button(botones, text="Anterior",
                   command=lambda: self.editor.ir_a_resultado(-1)).pack(
                       side="left")
        ttk.Button(botones, text="Siguiente",
                   command=lambda: self.editor.ir_a_resultado(1)).pack(
                       side="left", padx=AIRE)
        ttk.Button(botones, text="Reemplazar todo",
                   command=self.reemplazar_todo).pack(side="right")
        ttk.Label(cuerpo, textvariable=self.resumen, foreground=GRIS).grid(
            row=4, column=0, columnspan=2, sticky="w", pady=(AIRE, 0))
        cuerpo.columnconfigure(1, weight=1)

        # trace_add y no un bind de teclado: así también reacciona a un pegado.
        self.patron.trace_add("write", lambda *_: self.al_cambiar())
        self.protocol("WM_DELETE_WINDOW", self.esconder)
        self.bind("<Escape>", lambda evento: self.esconder())
        self.bind("<Return>", lambda evento: self.editor.ir_a_resultado(1))
        self.campo = campo

    def al_cambiar(self):
                cuantos = self.editor.resaltar(self.patron.get(), self.distingue.get())
        if not self.patron.get():
                        self.resumen.set("Escribe algo que buscar")
        elif cuantos:
                        self.resumen.set(f"{cuantos} resultado{'s' if cuantos > 1 else ''}")
        else:
                        self.resumen.set("Sin resultados")

    def reemplazar_todo(self):
                cuantos = self.editor.reemplazar_todo(
            self.patron.get(), self.reemplazo.get(), self.distingue.get())
        self.resumen.set(f"{cuantos} reemplazado{'s' if cuantos != 1 else ''}")

    def mostrar(self):
                self.deiconify()
        self.lift()
        self.campo.focus_set()
        self.campo.selection_range(0, "end")
        self.al_cambiar()

    def esconder(self):
                self.editor.limpiar_resaltado()
        self.withdraw()


class Editor(tk.Tk):

        def __init__(self, preferencias):
                super().__init__()
        self.prefs = preferencias
        self.ruta = None
        self.codificacion = "utf-8"
        self.resultados = []
        self.cual = -1
        self.buscador = None

        self.ajustar = tk.BooleanVar(value=self.prefs["ajustar_lineas"])
        self.posicion = tk.StringVar(value="Lín 1, Col 1")
        self.cuentas = tk.StringVar()
        self.aviso = tk.StringVar()

        self.minsize(560, 380)
        self.construir_menus()
        self.construir_cuerpo()
        self.aplicar_preferencias()

        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)
        self.actualizar_titulo()
        self.refrescar_cuentas()
        self.texto.focus_set()

    # --- construcción

    def construir_cuerpo(self):
                cuerpo = ttk.Frame(self)
        cuerpo.pack(fill="both", expand=True)
        self.texto = tk.Text(cuerpo, undo=True, wrap="word", relief="flat",
                             padx=AIRE, pady=AIRE, width=1, height=1,
                             font=("TkFixedFont", self.prefs["tamano_de_letra"]))
        barra = ttk.Scrollbar(cuerpo, orient="vertical",
                              command=self.texto.yview)
        self.texto.configure(yscrollcommand=barra.set)   # los dos lados
        barra.pack(side="right", fill="y")
        self.texto.pack(side="left", fill="both", expand=True)

        self.texto.tag_configure("hallado", background=AMARILLO)
        self.texto.tag_configure("actual", background=NARANJA)

        pie = ttk.Frame(self, padding=(MARGEN, AIRE))
        pie.pack(fill="x")
        ttk.Label(pie, textvariable=self.posicion).pack(side="left")
        ttk.Separator(pie, orient="vertical").pack(side="left", fill="y",
                                                   padx=AIRE)
        ttk.Label(pie, textvariable=self.cuentas, foreground=GRIS).pack(
            side="left")
        self.rotulo_aviso = ttk.Label(pie, textvariable=self.aviso,
                                      foreground=ROSA)
        self.rotulo_aviso.pack(side="right")

        # <<Modified>> avisa solo cuando la bandera CAMBIA, no en cada tecla.
        self.texto.bind("<<Modified>>", self.al_modificar)
        self.texto.bind("<KeyRelease>", self.al_moverse)
        self.texto.bind("<ButtonRelease-1>", self.al_moverse)

    def construir_menus(self):
                barra = tk.Menu(self)

        self.archivo = tk.Menu(barra, tearoff=False)
        self.archivo.add_command(label="Nuevo", accelerator="Ctrl+N",
                                 command=self.nuevo)
        self.archivo.add_command(label="Abrir…", accelerator="Ctrl+O",
                                 command=self.abrir)
        self.archivo.add_command(label="Guardar", accelerator="Ctrl+S",
                                 command=self.guardar)
        self.archivo.add_command(label="Guardar como…",
                                 accelerator="Ctrl+Shift+S",
                                 command=self.guardar_como)
        self.archivo.add_separator()
        self.primer_reciente = self.archivo.index("end") + 1
        barra.add_cascade(label="Archivo", menu=self.archivo)

        edicion = tk.Menu(barra, tearoff=False)
        edicion.add_command(label="Deshacer", accelerator="Ctrl+Z",
                            command=self.deshacer)
        edicion.add_command(label="Rehacer", accelerator="Ctrl+Shift+Z",
                            command=self.rehacer)
        edicion.add_separator()
        edicion.add_command(label="Buscar y reemplazar…", accelerator="Ctrl+F",
                            command=self.abrir_buscador)
        edicion.add_command(label="Ir a la línea…", accelerator="Ctrl+G",
                            command=self.ir_a_linea)
        barra.add_cascade(label="Edición", menu=edicion)

        vista = tk.Menu(barra, tearoff=False)
        vista.add_checkbutton(label="Ajustar líneas", variable=self.ajustar,
                              command=self.aplicar_ajuste)
        vista.add_separator()
        vista.add_command(label="Letra más grande", accelerator="Ctrl++",
                          command=lambda: self.cambiar_letra(1))
        vista.add_command(label="Letra más pequeña", accelerator="Ctrl+-",
                          command=lambda: self.cambiar_letra(-1))
        barra.add_cascade(label="Vista", menu=vista)

        self.configure(menu=barra)

        for secuencia, accion in (
                ("<Control-n>", self.nuevo), ("<Control-o>", self.abrir),
                ("<Control-s>", self.guardar),
                ("<Control-Shift-S>", self.guardar_como),
                ("<Control-f>", self.abrir_buscador),
                ("<Control-g>", self.ir_a_linea),
                ("<Control-Shift-Z>", self.rehacer),
                ("<Control-plus>", lambda: self.cambiar_letra(1)),
                ("<Control-minus>", lambda: self.cambiar_letra(-1))):
            # El lambda se come el evento; return "break" evita que el Text
            # inserte además el carácter.
                        self.bind(secuencia, lambda evento, a=accion: (a(), "break")[1])

    def aplicar_preferencias(self):
                guardada = self.prefs["geometria"]
        forma = FORMA.fullmatch(guardada)
        if self.cabe(guardada):
                        self.geometry(guardada)
            if forma[3] is None:        # solo tamaño: nos toca colocar
                                self.centrar()
        else:
                        self.geometry(f"{forma[1]}x{forma[2]}" if forma else "820x560")
            self.centrar()
        self.aplicar_ajuste()
        self.refrescar_recientes()

    def cabe(self, geometria):
                """Una geometría de un monitor que ya no está se acepta sin error y
        deja la ventana donde no se ve (lección 43)."""
        forma = FORMA.fullmatch(geometria)
        if forma is None:
                        return False
        ancho, alto = int(forma[1]), int(forma[2])
        pantalla_ancho = self.winfo_screenwidth()
        pantalla_alto = self.winfo_screenheight()
        if ancho > pantalla_ancho or alto > pantalla_alto:
                        return False
        if forma[3] is None:
                        return True                 # solo tamaño: nada que validar
        # Un signo menos no es una coordenada negativa: es "desde el borde
        # derecho", y hay que convertirlo antes de comparar (lección 43).
        x, y = int(forma[3]), int(forma[4])
        if forma[3].startswith("-"):
                        x = pantalla_ancho + x - ancho
        if forma[4].startswith("-"):
                        y = pantalla_alto + y - alto
        return (80 - ancho < x < pantalla_ancho - 80
                and 0 <= y < pantalla_alto - 80)

    # --- el estado del documento

    @property
    def sucio(self):
                return bool(self.texto.edit_modified())

    def actualizar_titulo(self):
                marca = "• " if self.sucio else ""
        nombre = documento.nombre_para_mostrar(self.ruta)
        donde = f" — {self.ruta.parent}" if self.ruta else ""
        self.title(f"{marca}{nombre}{donde}")

    def al_modificar(self, evento):
                """No se toca la bandera aquí: solo se lee. Bajarla la vuelve a
        disparar, y no hace falta."""
        self.actualizar_titulo()
        self.refrescar_cuentas()

    def al_moverse(self, evento=None):
                fila, columna = self.texto.index("insert").split(".")
        self.posicion.set(f"Lín {fila}, Col {int(columna) + 1}")

    def refrescar_cuentas(self):
        # end-1c y no end: el Text siempre añade un \n que no has escrito.
                cifras = documento.cuentas(self.texto.get("1.0", "end-1c"))
        self.cuentas.set(f"{cifras['lineas']} líneas, {cifras['palabras']} "
                         f"palabras, {cifras['caracteres']} caracteres")
        self.al_moverse()

    def marcar_limpio(self):
                """Las dos líneas van juntas siempre: edit_reset NO baja la bandera,
        y sin él un Ctrl+Z llega a antes de abrir el fichero."""
        self.texto.edit_reset()
        self.texto.edit_modified(False)

    def decir(self, mensaje, color=ROSA):
                self.aviso.set(mensaje)
        self.rotulo_aviso.configure(foreground=color)

    # --- archivo

    def hay_permiso_para_descartar(self):
                """Tres respuestas, no dos. Hace falta al cerrar, al hacer Nuevo y al
        abrir otro fichero, y por eso es un método."""
        if not self.sucio:
                        return True
        respuesta = messagebox.askyesnocancel(
            "Cambios sin guardar",
            f"¿Quieres guardar los cambios en "
            f"{documento.nombre_para_mostrar(self.ruta)}?",
            detail="Si no los guardas, se perderán.",
            parent=self)
        if respuesta is None:       # Cancelar. No vale `if not respuesta`.
                        return False
        if respuesta:
                        return self.guardar()
        return True

    def nuevo(self):
                if not self.hay_permiso_para_descartar():
                        return
        self.texto.delete("1.0", "end")
        self.ruta = None
        self.codificacion = "utf-8"
        self.marcar_limpio()
        self.limpiar_resaltado()
        self.actualizar_titulo()
        self.refrescar_cuentas()
        self.decir("")

    def abrir(self, ruta=None):
                if not self.hay_permiso_para_descartar():
                        return
        if ruta is None:
                        elegida = filedialog.askopenfilename(
                parent=self, title="Abrir",
                filetypes=[("Texto", "*.txt *.md *.py *.csv"),
                           ("Todos", "*.*")])
            if not elegida:         # cancelar devuelve cadena vacía
                                return
            ruta = pathlib.Path(elegida)
        try:
                        contenido, codificacion = documento.leer(pathlib.Path(ruta))
        except documento.ErrorDeDocumento as error:
                        self.decir(str(error))
            # Si venía de los recientes, quitarlo: un menú con entradas
            # muertas es peor que no tener menú (lección 43).
            self.prefs.olvidar_reciente(ruta)
            self.prefs.guardar()
            self.refrescar_recientes()
            return
        self.texto.delete("1.0", "end")
        self.texto.insert("1.0", contenido)
        self.texto.mark_set("insert", "1.0")
        self.ruta = pathlib.Path(ruta)
        self.codificacion = codificacion
        self.marcar_limpio()
        self.limpiar_resaltado()
        self.actualizar_titulo()
        self.refrescar_cuentas()
        self.prefs.anotar_reciente(self.ruta)
        self.prefs.guardar()
        self.refrescar_recientes()
        self.decir(f"Abierto como {codificacion}",
                   GRIS if codificacion == "utf-8" else ROSA)

    def guardar(self):
                """Devuelve si se ha guardado: quien pregunta necesita saberlo."""
        if self.ruta is None:
                        return self.guardar_como()
        try:
                        documento.escribir(self.ruta, self.texto.get("1.0", "end-1c"),
                               self.codificacion)
        except documento.ErrorDeDocumento as error:
                        self.decir(str(error))
            return False
        self.texto.edit_modified(False)      # aquí no se resetea el historial
        self.actualizar_titulo()
        self.decir(f"Guardado {self.ruta.name}", GRIS)
        return True

    def guardar_como(self):
                elegida = filedialog.asksaveasfilename(
            parent=self, title="Guardar como", defaultextension=".txt",
            initialfile=documento.nombre_para_mostrar(self.ruta),
            filetypes=[("Texto", "*.txt"), ("Todos", "*.*")])
        if not elegida:
                        return False
        self.ruta = pathlib.Path(elegida)
        if self.guardar():
                        self.prefs.anotar_reciente(self.ruta)
            self.prefs.guardar()
            self.refrescar_recientes()
            return True
        return False

    def refrescar_recientes(self):
                final = self.archivo.index("end")
        if final is not None and final >= self.primer_reciente:
                        self.archivo.delete(self.primer_reciente, "end")
        recientes = self.prefs["recientes"]
        if not recientes:
                        self.archivo.add_command(label="(sin recientes)", state="disabled")
            return
        for orden, ruta in enumerate(recientes, start=1):
                        self.archivo.add_command(
                label=f"{orden}. {pathlib.Path(ruta).name}",
                command=lambda r=ruta: self.abrir(pathlib.Path(r)))

    # --- edición

    def deshacer(self):
                try:
                        self.texto.edit_undo()
        except tk.TclError:
                        self.decir("No hay nada que deshacer", GRIS)

    def rehacer(self):
                try:
                        self.texto.edit_redo()
        except tk.TclError:
                        self.decir("No hay nada que rehacer", GRIS)

    def ir_a_linea(self):
                cuantas = int(self.texto.index("end-1c").split(".")[0])
        respuesta = tk.simpledialog.askinteger(
            "Ir a la línea", f"Número de línea (1 a {cuantas}):",
            parent=self, minvalue=1, maxvalue=cuantas)
        if respuesta is None:       # cancelar
                        return
        self.texto.mark_set("insert", f"{respuesta}.0")
        self.texto.see("insert")
        self.texto.focus_set()
        self.al_moverse()

    # --- búsqueda

    def abrir_buscador(self):
                if self.buscador is None or not self.buscador.winfo_exists():
                        self.buscador = Buscador(self, self)
        self.buscador.mostrar()

    def limpiar_resaltado(self):
                self.texto.tag_remove("hallado", "1.0", "end")
        self.texto.tag_remove("actual", "1.0", "end")
        self.resultados = []
        self.cual = -1

    def resaltar(self, patron, distingue):
                """La lógica encuentra las posiciones; aquí solo se pintan."""
        self.limpiar_resaltado()
        contenido = self.texto.get("1.0", "end-1c")
        for desplazamiento, largo in documento.posiciones_de(contenido, patron,
                                                             distingue):
                        inicio = f"1.0+{desplazamiento}c"
            fin = f"1.0+{desplazamiento + largo}c"
            self.texto.tag_add("hallado", inicio, fin)
            self.resultados.append((self.texto.index(inicio),
                                    self.texto.index(fin)))
        return len(self.resultados)

    def ir_a_resultado(self, salto):
                if not self.resultados:
                        return
        self.texto.tag_remove("actual", "1.0", "end")
        self.cual = (self.cual + salto) % len(self.resultados)
        inicio, fin = self.resultados[self.cual]
        self.texto.tag_add("actual", inicio, fin)
        self.texto.mark_set("insert", inicio)
        self.texto.see(inicio)
        if self.buscador is not None and self.buscador.winfo_exists():
                        self.buscador.resumen.set(
                f"{self.cual + 1} de {len(self.resultados)}")

    def reemplazar_todo(self, patron, reemplazo, distingue):
                """De atrás hacia delante: si el reemplazo mide distinto que el
        patrón, ir hacia delante desplaza los índices que faltan."""
        contenido = self.texto.get("1.0", "end-1c")
        posiciones = documento.posiciones_de(contenido, patron, distingue)
        if not posiciones:
                        return 0
        for desplazamiento, largo in reversed(posiciones):
                        self.texto.delete(f"1.0+{desplazamiento}c",
                              f"1.0+{desplazamiento + largo}c")
            self.texto.insert(f"1.0+{desplazamiento}c", reemplazo)
        self.limpiar_resaltado()
        self.refrescar_cuentas()
        return len(posiciones)

    # --- vista

    def aplicar_ajuste(self):
                self.texto.configure(wrap="word" if self.ajustar.get() else "none")
        self.prefs["ajustar_lineas"] = self.ajustar.get()
        self.prefs.guardar()

    def cambiar_letra(self, cuanto):
                tamano = max(8, min(32, self.prefs["tamano_de_letra"] + cuanto))
        self.prefs["tamano_de_letra"] = tamano
        self.texto.configure(font=("TkFixedFont", tamano))
        self.prefs.guardar()
        self.decir(f"Letra de {tamano} puntos", GRIS)

    # --- cierre y errores

    def report_callback_exception(self, clase, valor, rastro):
                """Sin esto, un fallo en un callback va a una salida de errores que en
        un programa empaquetado no ve nadie (lección 45)."""
        logging.exception("Fallo en la interfaz",
                          exc_info=(clase, valor, rastro))
        self.decir(f"Error inesperado: {clase.__name__}: {valor}")

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")

    def al_cerrar(self):
                if not self.hay_permiso_para_descartar():
                        return                  # Cancelar: la ventana se queda
        self.update_idletasks()     # geometry() da datos rancios sin esto
        if self.state() == "normal":
                        self.prefs["geometria"] = self.geometry()
        self.prefs.guardar()
        self.destroy()


def main():
        logging.basicConfig(filename=carpeta_de_datos() / "registro.log",
                        level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    editor = Editor(Preferencias().cargar())
    if len(sys.argv) > 1:           # abrir el fichero que pasen por argumento
                editor.abrir(pathlib.Path(sys.argv[1]))
    editor.mainloop()


if __name__ == "__main__":
        main()
```

> [!resumen] En resumen
>
> Un editor de texto no necesita ningún widget nuevo y sin embargo obliga a resolver tres cosas que los ejemplos sueltos esquivaban. La **bandera de cambios** del `Text` no se puede usar tal cual: devuelve `0`/`1` y no booleanos, **borrar también modifica**, **`edit_reset()` no la baja** (borra el historial de deshacer, que es otra cosa, y sin él un `Ctrl+Z` después de abrir un fichero deja el contenido del anterior), y **cargar un fichero la deja puesta**, así que al abrir hay que hacer las dos cosas juntas. Lo bueno es que el evento **`<<Modified>>` solo se dispara cuando la bandera cambia**, no en cada tecla, que es justo lo que hace falta para el punto del título; dentro del manejador se lee la bandera y no se toca. El **cierre** es el caso legítimo de diálogo de la lección 36, con `askyesnocancel` y tres respuestas: el **`is None` para Cancelar es obligatorio**, porque `False` y `None` son las dos falsas y confundirlas hace que Cancelar tire el trabajo; y la función hace falta en tres sitios (cerrar, Nuevo y Abrir), de ahí que sea un método que devuelve si hay permiso. La **búsqueda** tiene dos trampas: no encontrar devuelve **cadena vacía** y no `None`, y **buscar la cadena vacía devuelve `1.0` siempre**, que cuelga el bucle sin ningún error, y la cadena vacía es exactamente lo que hay en el cuadro antes de escribir. Al recorrer las apariciones hay que **avanzar la longitud encontrada y no un carácter** (medido: `"aa"` en `"aaaa y aaaa"` son 6 resultados con `+1c` y 4 con la longitud), y **reemplazar todo se hace de atrás hacia delante**, porque si el reemplazo mide distinto, ir hacia delante desplaza los índices que faltan. Dos detalles más del `Text`: **siempre `end-1c`**, porque siempre hay un `\n` que no has escrito y sin eso el fichero gana una línea en blanco cada vez que se guarda; y **`edit_undo()` lanza `TclError: nothing to undo`**, que hay que capturar. Del resto del módulo se reutiliza casi todo: la lógica en un módulo sin `tkinter` que además intenta `utf-8` y luego `latin-1` antes de rendirse, el guardado atómico con `os.replace` (que aquí protege el trabajo de una persona), las preferencias con geometría validada y recientes limpiados, la ventana no modal para buscar, los aceleradores con `return "break"` para que el `Text` no inserte además el carácter, y el `report_callback_exception` para que un fallo no se pierda en un programa empaquetado.

> [!ejercicio] Practica
>
> 1. Escribe los dos ficheros y ejecútalo. Comprueba que el punto del título aparece al escribir y desaparece al guardar.
> 2. Quita el `edit_reset()` de `marcar_limpio`, abre un fichero y pulsa `Ctrl+Z` varias veces. Explica lo que pasa.
> 3. Quita el `edit_modified(False)` de `marcar_limpio` y abre un fichero. Comprueba que aparece como modificado sin haber tocado nada.
> 4. Cambia el `if respuesta is None` por `if not respuesta`. Escribe algo, cierra, pulsa Cancelar y anota lo que ocurre.
> 5. Quita el `if not patron: return []` de `posiciones_de`, abre el buscador y borra el cuadro. Explica por qué se cuelga.
> 6. Cambia el avance de `len(aguja)` a `1` y busca `aa` en un texto con `aaaa`. Cuenta los resultados.
> 7. Reemplaza `ab` por `xyz` en un texto con varias apariciones, primero de atrás hacia delante y después al revés. Compara.
> 8. Cambia `end-1c` por `end` al guardar. Guarda cinco veces el mismo fichero y mira cuántas líneas tiene.
> 9. Añade un contador de caracteres seleccionados usando `sel.first` y `sel.last`, con cuidado de que no siempre existen.
> 10. Añade `Ctrl+W` para cerrar el fichero sin cerrar el programa, reutilizando `hay_permiso_para_descartar`.
> 11. Haz que el asterisco del título se recalcule con un `after` amortiguado en vez de con `<<Modified>>`, y explica por qué es peor.
> 12. Añade una preferencia de «recordar el último fichero abierto» y ábrelo al arrancar.
> 13. Empaquétalo con PyInstaller como en la lección 45 y comprueba que las preferencias sobreviven en `--onefile`.
> 14. Añade la opción de guardar siempre en `utf-8` aunque el fichero se abriera en `latin-1`, avisando de lo que se hace.
