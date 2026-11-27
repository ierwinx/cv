---
titulo: "Preferencias que se recuerdan entre sesiones"
resumen: "El fichero que no debe impedir arrancar si está roto, el guardado que no puede dejarlo a medias, y la geometría guardada en un monitor que ya no está."
minutos: 27
orden: 43
---

Un programa que abre siempre en el mismo sitio con el mismo tamaño está bien la primera vez. A la décima, cuando vuelves a mover la ventana al mismo rincón y a ensanchar la misma columna, empieza a molestar. Recordar cosas entre sesiones es de las mejoras que menos código cuestan y más se notan.

El sitio donde va el fichero ya está resuelto: **la lección 17 del módulo 2** explica por qué la configuración va en la carpeta del sistema y no junto al código, y da las rutas de los tres sistemas operativos. Y la **lección 41** acaba de dejar claro que guardar y cargar es trabajo de la lógica. Así que esta lección no repite nada de eso: va a lo que tiene de ventana, que es donde están todas las sorpresas. Y hay más de las que parece, porque **la geometría de una ventana es un dato que puede quedarse inválido sin que nadie toque el fichero**: basta desenchufar un monitor.

> [!objetivo] Qué vas a aprender
>
> Decidir qué merece recordarse y qué no; leer un fichero de preferencias de forma que uno roto o de una versión anterior no impida arrancar; escribirlo sin poder dejarlo a medias; y restaurar el tamaño y la posición de la ventana sorteando las cinco trampas medidas de `geometry`, incluida la de la ventana que reaparece fuera de la pantalla.

## Qué merece recordarse

La pregunta no es qué se puede guardar, que es todo, sino qué espera alguien que se recuerde. La línea está bastante clara:

**Sí**: el tamaño y la posición de la ventana; si estaba maximizada; la posición de los divisores de un `PanedWindow` (lección 29); la anchura de las columnas de un `Treeview` y por cuál se estaba ordenando; la pestaña abierta; los ficheros recientes; el tema y el tamaño de letra; y las opciones que alguien cambia una vez y espera no volver a tocar, como «no volver a preguntar».

**No**: lo que se escribió en un formulario a medias (recordarlo es desconcertante, no útil); el texto de un cuadro de búsqueda; el estado de una tarea que estaba corriendo; y, sobre todo, **nada que sea un dato del usuario**. Un fichero de preferencias no es un almacén: si el programa pierde el fichero de preferencias no debe pasar nada, y eso solo es cierto si dentro no hay nada importante.

Y hay un caso intermedio que conviene pensar: la lista de ficheros recientes. Merece recordarse, pero **hay que limpiarla al cargarla**, porque un fichero de hace tres meses puede haberse movido, y un menú con seis entradas de las que cuatro dan error es peor que no tener menú.

## La forma del fichero

Un diccionario con los valores por defecto, y encima lo que se haya guardado:

```python
POR_DEFECTO = {
    "geometria": "820x560",
    "maximizada": False,
    "divisor": 260,
    "tema": "claro",
    "recientes": [],
}
```

Ese diccionario hace tres cosas a la vez. Es la documentación de lo que el programa recuerda, es el valor que se usa la primera vez, y es **el filtro** que hace que las versiones no choquen:

```consola
>>> guardadas = {"geometria": "640x400+100+60", "tema_que_ya_no_existe": "azul"}
>>> POR_DEFECTO | {k: v for k, v in guardadas.items() if k in POR_DEFECTO}
{'geometria': '640x400+100+60', 'maximizada': False, 'divisor': 260,
 'tema': 'claro', 'recientes': []}
```

La clave que ya no existe se ignora y la que es nueva aparece con su valor por defecto. Sin ese filtro, una versión que añade una preferencia revienta con un `KeyError` en cuanto alguien actualiza, y una que la quita se arrastra basura para siempre.

### Leer sin impedir arrancar

Un fichero de preferencias roto es algo que pasa: un corte de luz a mitad de la escritura, un editor de texto curioso, un disco lleno. Y la regla es absoluta:

> [!aviso] Un fichero de preferencias roto no puede impedir arrancar
>
> ```consola
> >>> json.loads("{esto no es json")
> JSONDecodeError: Expecting property name enclosed in double quotes: line 1 ...
> ```
>
> Si esa excepción sube hasta arriba, el programa **no abre**, y para alguien que no sabe qué es un JSON el problema no tiene solución: el programa simplemente ha dejado de funcionar. Lo correcto es olvidarse de las preferencias y arrancar con los valores por defecto.
>
> Las excepciones que hay que capturar son tres, y las tres por separado tienen sentido: `FileNotFoundError` (la primera vez, que es lo normal y no es un error), `json.JSONDecodeError` (roto) y `OSError` (permisos, disco, ruta imposible). Como `FileNotFoundError` es un `OSError`, con `(OSError, json.JSONDecodeError)` se cubren las tres.

### Escribir sin dejarlo a medias

El problema del guardado directo es que `open(ruta, "w")` **primero vacía el fichero** y después escribe. Si algo falla en medio, lo que queda no es lo viejo ni lo nuevo: es medio fichero, que es justo el caso roto de arriba. Y ese «algo falla en medio» incluye cerrar el portátil.

La solución es escribir al lado y luego renombrar:

```consola
>>> temporal.write_text(json.dumps(datos, indent=2))
>>> os.replace(temporal, destino)
```

**`os.replace` es atómico**: en cualquier instante el fichero de destino es o el viejo entero o el nuevo entero, nunca una mezcla. Y a diferencia de `os.rename`, se comporta igual en Windows, donde renombrar sobre un fichero que existe fallaría. Son dos líneas y quitan toda una clase de fallos.

## La geometría, que es donde están las trampas

Aquí es donde esta lección se gana el sitio. `geometry()` parece un par de números y tiene cinco sorpresas, todas medidas.

**Primera: lo que devuelve está rancio hasta que Tk procesa el cambio.**

```consola
>>> ventana.geometry("500x320+120+80")
>>> ventana.geometry()
'200x200+120+80'
>>> ventana.update_idletasks()
>>> ventana.geometry()
'500x320+120+80'
```

La posición se actualizó y **el tamaño no**. Guardar sin un `update_idletasks()` previo puede escribir el tamaño anterior. Al cerrar no suele pasar, porque la ventana lleva rato en su sitio, pero en cualquier otro momento sí.

**Segunda: la cadena no se parte con `split("+")`.**

```consola
>>> ventana.geometry()
'640x400-50-30'
>>> ventana.geometry().split("+")
['640x400-50-30']
```

Un `+` significa «desde el borde izquierdo» y un `-` significa **«desde el borde derecho»**, así que una ventana colocada a la derecha de la pantalla devuelve una cadena con guiones y el desempaquetado `ancho, x, y = cadena.split("+")` revienta con un `ValueError`. Si hay que partirla, con una expresión regular:

```python
FORMA = re.compile(r"(\d+)x(\d+)([+-]\d+)([+-]\d+)")
```

**Tercera: lo inválido no siempre falla.** `"basura"`, `"500x"` y `"500x300+"` dan `TclError`, lo cual está bien porque se nota. Pero:

```consola
>>> ventana.geometry("")
>>> ventana.geometry()
'200x200+9000+9000'
```

La cadena vacía **se acepta** y devuelve la ventana a su tamaño pedido. Y esto es peor:

```consola
>>> ventana.geometry("5000x4000+9000+9000")
>>> ventana.geometry()
'5000x4000+9000+9000'
```

> [!error] La ventana que reaparece fuera de la pantalla
>
> Ese último caso es el fallo más desagradable de todos los de esta lección, porque el programa funciona perfectamente y no se ve.
>
> Alguien trabaja con el portátil conectado a un monitor externo, deja la ventana en el monitor de la derecha, cierra el programa. Se guarda algo como `900x600+2500+300`. Al día siguiente, sin el monitor, el programa arranca, aplica la geometría, **Tk la acepta sin protestar**, y la ventana aparece en unas coordenadas que no existen. No hay ventana, no hay error, no hay nada: solo un programa que ya no abre.
>
> El arreglo es validar antes de aplicar, y hace falta partir la cadena para ello:
>
> ```python
> if self.cabe_en_la_pantalla(guardada):
>         self.geometry(guardada)
> else:
>         self.geometry(f"{ancho}x{alto}")     # el tamaño sí, la posición no
>     self.centrar()
> ```
>
> Y la comprobación tiene que exigir que quede **un trozo agarrable**, no un píxel: una ventana cuya barra de título asoma tres píxeles por el borde derecho es igual de inservible que una invisible. De ahí el `MARGEN_VISIBLE` del ejemplo.
>
> Cuidado con una consecuencia de la segunda trampa: si la cadena trae signos menos, **esos números no son coordenadas negativas**, son distancias desde el borde opuesto, y compararlos tal cual con el tamaño de la pantalla rechaza como inválida una ventana perfectamente colocada a la derecha. Hay que convertirlos antes:
>
> ```python
> if x.startswith("-"):
>         izquierda = self.winfo_screenwidth() + int(x) - ancho
> ```
>
> Ojo también con `winfo_screenwidth()`: da el tamaño de **un** monitor. Para varios existe `winfo_vrootwidth()`, pero no es de fiar en todos los sistemas, y de todas formas aquí conviene ser conservador: si la ventana no cabe en la pantalla principal, colocarla ahí es lo seguro.

**Cuarta: `minsize` gana.**

```consola
>>> ventana.minsize(400, 300)
>>> ventana.geometry("100x100")
>>> ventana.geometry()
'400x300+0+30'
```

No es un problema, es una red de seguridad: un tamaño guardado absurdamente pequeño se corrige solo. Razón más para poner siempre un `minsize`.

**Quinta: maximizada y minimizada no viajan en la cadena.**

```consola
>>> ventana.state("zoomed")
>>> ventana.geometry()
'2240x1104+0+30'
>>> ventana.state("normal")
>>> ventana.geometry()
'640x400+100+60'
```

Al maximizar, `geometry()` devuelve el tamaño de la pantalla; al volver, el de antes. Así que si guardas la cadena de una ventana maximizada y la restauras sin más, aparece una ventana **no maximizada** del tamaño exacto de la pantalla: parece maximizada, pero el botón de maximizar no hace lo que debe y no se puede arrastrar a su sitio. Hay que guardar el estado aparte, y al restaurar **primero la geometría y después el estado**, para que al desmaximizar la ventana vuelva a un tamaño razonable.

Y minimizada:

```consola
>>> ventana.iconify()
>>> ventana.state()
'iconic'
```

Guardar `iconic` y restaurarlo abriría el programa minimizado, con el usuario mirando un escritorio vacío después de hacer doble clic. **Al guardar, cualquier estado que no sea `zoomed` se guarda como normal.** En macOS conviene saber además que `state("zoomed")` funciona pero `attributes("-zoomed")` no existe; los atributos disponibles ahí son otros, entre ellos `-fullscreen`.

## Cuándo se guarda

La tentación es guardar en cada cambio, atando un `<Configure>`:

```consola
>>> ventana.bind("<Configure>", lambda e: guardar())
>>> # diez movimientos de la ventana
>>> len(veces)
9
```

Diez movimientos programados dan nueve eventos; **arrastrar la ventana con el ratón un segundo da decenas**, y redimensionarla desde una esquina, cientos. Eso son cientos de escrituras en disco para guardar un dato que solo importa al final.

Hay dos respuestas buenas. La sencilla: **guardar al cerrar**, que basta para el tamaño, la posición y el divisor. Y para lo que conviene no perder si el programa se cierra mal (los ficheros recientes, el tema), **guardar en ese momento**, porque son cambios sueltos y no continuos. Si de verdad hace falta seguir un `<Configure>`, se amortigua con `after` y `after_cancel` exactamente como el buscador de la lección 23.

Guardar al cerrar plantea una duda razonable: ¿se puede leer `geometry()` cuando la ventana ya se está muriendo? Medido, sí:

```consola
>>> # en el manejador de WM_DELETE_WINDOW
'500x320+140+90'
>>> # en el manejador de <Destroy> de la ventana
'500x320+140+90'
```

Los dos sitios valen. Y hay un detalle heredado de la lección 34 que aquí muerde: un `<Configure>` atado a la ventana **también recibe los de sus hijos**, porque atar a un `Toplevel` captura los eventos de todos sus descendientes.

```consola
>>> # widgets que dispararon <Configure> en un bind sobre la ventana
{'.', '.!frame', '.!frame.!label'}
```

Así que el `if evento.widget is not self: return` no es una precaución: sin él, guardarías la geometría de la ventana cada vez que cualquier etiqueta de dentro cambia de tamaño.

## De qué capa es esto

La lección 41 dejó una regla y conviene aplicarla aquí, porque el reparto no es obvio: **leer y escribir el fichero es de la lógica** (un módulo `preferencias.py` que no importa `tkinter`, con los valores por defecto, el mezclado, el guardado atómico y la limpieza de los recientes), y **aplicar los valores a la ventana es de la interfaz**, porque validar una geometría necesita `winfo_screenwidth()` y eso es un widget preguntando por su pantalla.

Esa frontera tiene una ventaja inmediata: todo el trabajo delicado (fichero roto, claves que faltan, escritura atómica, recientes que ya no existen) se prueba en milisegundos sin abrir una ventana.

## El ejemplo

Un visor de notas que recuerda tamaño, posición, si estaba maximizada, el divisor, el tema y los cinco ficheros recientes, con la lógica separada.

```python title="preferencias.py"
"""La lógica: ni una línea de tkinter. Se prueba sin abrir nada."""

import json
import os
import pathlib
import sys

APLICACION = "VisorDeNotas"
CUANTOS_RECIENTES = 5

POR_DEFECTO = {
    "geometria": "820x560",
    "maximizada": False,
    "divisor": 260,
    "tema": "claro",
    "recientes": [],
}


def carpeta_de_configuracion():
        """Dónde va el fichero en cada sistema. Módulo 2, lección 17."""
    if sys.platform == "darwin":
                base = pathlib.Path.home() / "Library" / "Application Support"
    elif sys.platform == "win32":
                base = pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home()))
    else:
                base = pathlib.Path(os.environ.get(
            "XDG_CONFIG_HOME", pathlib.Path.home() / ".config"))
    return base / APLICACION


class Preferencias:
        """Un diccionario con valores por defecto que sabe leerse y escribirse."""

    def __init__(self, ruta=None):
                self.ruta = ruta or carpeta_de_configuracion() / "preferencias.json"
        self.valores = dict(POR_DEFECTO)
        self.aviso = None          # para que la interfaz pueda contarlo

    def cargar(self):
                """Un fichero roto no impide arrancar: se usan los valores por defecto.

        FileNotFoundError es un OSError, así que la primera vez entra por aquí
        y no es un error: es lo normal.
        """
        try:
                        guardadas = json.loads(self.ruta.read_text(encoding="utf-8"))
        except FileNotFoundError:
                        return self
        except (OSError, json.JSONDecodeError) as error:
                        self.aviso = f"Preferencias ilegibles, se usan las de fábrica ({error})"
            return self
        if not isinstance(guardadas, dict):
                        self.aviso = "Preferencias con formato raro, se usan las de fábrica"
            return self
        # El diccionario por defecto es el filtro: las claves que ya no existen
        # se ignoran y las nuevas aparecen con su valor.
        self.valores.update({clave: valor for clave, valor in guardadas.items()
                             if clave in POR_DEFECTO})
        self.valores["recientes"] = self.recientes_que_existen()
        return self

    def guardar(self):
                """Atómico: o queda el fichero viejo entero o el nuevo entero.

        Con open(ruta, "w") a secas, un corte a mitad de escritura deja medio
        fichero, que es justo el caso que cargar() tiene que perdonar.
        """
        try:
                        self.ruta.parent.mkdir(parents=True, exist_ok=True)
            temporal = self.ruta.with_name(self.ruta.name + ".tmp")
            temporal.write_text(
                json.dumps(self.valores, indent=2, ensure_ascii=False),
                encoding="utf-8")
            os.replace(temporal, self.ruta)
        except OSError as error:
                        self.aviso = f"No se han podido guardar las preferencias ({error})"
            return False
        return True

    def __getitem__(self, clave):
                return self.valores[clave]

    def __setitem__(self, clave, valor):
                if clave not in POR_DEFECTO:
                        raise KeyError(f"preferencia desconocida: {clave}")
        self.valores[clave] = valor

    def recientes_que_existen(self):
                """Un menú de recientes con entradas muertas es peor que no tenerlo."""
        return [texto for texto in self.valores["recientes"]
                if pathlib.Path(texto).is_file()]

    def anotar_reciente(self, ruta):
                """El más nuevo primero, sin repetidos y con tope."""
        texto = str(pathlib.Path(ruta).resolve())
        lista = [otro for otro in self.valores["recientes"] if otro != texto]
        self.valores["recientes"] = [texto] + lista[:CUANTOS_RECIENTES - 1]
        return self.valores["recientes"]
```

```python title="visor.py"
"""La interfaz: aplica las preferencias a la ventana y las recoge al cerrar."""

import pathlib
import re
import tkinter as tk
from tkinter import filedialog, ttk

from preferencias import Preferencias

MARGEN = 12
AIRE = 4
MARGEN_VISIBLE = 80        # píxeles que tienen que quedar agarrables

# La cadena de geometry lleva + o -, y un - significa "desde el borde derecho":
# por eso split("+") no vale. La posición es opcional, porque una preferencia
# de fábrica puede traer solo el tamaño y dejar que el sistema coloque.
FORMA = re.compile(r"(\d+)x(\d+)(?:([+-]\d+)([+-]\d+))?")

TEMAS = {
    "claro": {"fondo": "#FFFFFF", "letra": "#1C1C1E"},
    "oscuro": {"fondo": "#1C1C1E", "letra": "#F2F2F7"},
}


class Aplicacion(tk.Tk):

        def __init__(self, preferencias):
                super().__init__()
        self.prefs = preferencias
        self.title("Visor de notas")
        self.minsize(520, 380)      # red de seguridad: un tamaño guardado
                                    # absurdo se corrige solo

        self.tema = tk.StringVar(value=self.prefs["tema"])
        self.estado = tk.StringVar()

        barra = tk.Menu(self)
        self.menu_archivo = tk.Menu(barra, tearoff=False)
        self.menu_archivo.add_command(label="Abrir…", accelerator="Ctrl+O",
                                      command=self.abrir)
        self.menu_archivo.add_separator()
        barra.add_cascade(label="Archivo", menu=self.menu_archivo)
        vista = tk.Menu(barra, tearoff=False)
        for nombre in TEMAS:
                        vista.add_radiobutton(label=nombre.capitalize(), value=nombre,
                                  variable=self.tema, command=self.pintar_tema)
        barra.add_cascade(label="Vista", menu=vista)
        self.configure(menu=barra)

        self.paneles = ttk.Panedwindow(self, orient="horizontal")
        self.paneles.pack(fill="both", expand=True, padx=MARGEN,
                          pady=(MARGEN, AIRE))
        izquierda = ttk.Frame(self.paneles, padding=(0, 0, AIRE, 0))
        self.lista = tk.Listbox(izquierda, exportselection=False)
        self.lista.pack(fill="both", expand=True)
        self.lista.bind("<<ListboxSelect>>", self.al_elegir)
        derecha = ttk.Frame(self.paneles)
        self.texto = tk.Text(derecha, wrap="word", width=1, height=1,
                             relief="flat", padx=AIRE, pady=AIRE)
        self.texto.pack(fill="both", expand=True)
        self.paneles.add(izquierda, weight=0)
        self.paneles.add(derecha, weight=1)

        ttk.Label(self, textvariable=self.estado).pack(
            anchor="w", padx=MARGEN, pady=(0, AIRE))

        self.bind("<Control-o>", lambda evento: self.abrir())
        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)

        self.aplicar_preferencias()
        if self.prefs.aviso:
                        self.estado.set(self.prefs.aviso)

    # --- aplicar lo guardado

    def aplicar_preferencias(self):
                """Primero la geometría y después el estado: al desmaximizar, la
        ventana tiene que volver a un tamaño razonable."""
        guardada = self.prefs["geometria"]
        forma = FORMA.fullmatch(guardada)
        if self.cabe_en_la_pantalla(guardada):
                        self.geometry(guardada)
            if forma[3] is None:        # solo tamaño: nos toca colocar
                                self.centrar()
        else:
            # Se conserva el tamaño si es sensato y se coloca en el centro.
                        if forma is not None:
                                self.geometry(f"{forma[1]}x{forma[2]}")
            self.centrar()
        if self.prefs["maximizada"]:
                        try:
                                self.state("zoomed")
            except tk.TclError:
                                pass            # no todos los sistemas lo admiten
        self.pintar_tema()
        self.refrescar_recientes()
        # El divisor necesita que la ventana esté ya dibujada: after_idle, y no
        # after(0), porque las tareas de reposo van al final de la cola.
        self.after_idle(self.colocar_divisor)

    def colocar_divisor(self):
                self.update_idletasks()
        try:
                        self.paneles.sashpos(0, self.prefs["divisor"])
        except tk.TclError:
                        pass

    def cabe_en_la_pantalla(self, geometria):
                """Una geometría guardada puede venir de un monitor que ya no está,
        y Tk la acepta sin protestar: la ventana aparece donde no se ve."""
        forma = FORMA.fullmatch(geometria)
        if forma is None:
                        return False                    # cadena inservible
        ancho, alto = int(forma[1]), int(forma[2])
        pantalla_ancho, pantalla_alto = (self.winfo_screenwidth(),
                                         self.winfo_screenheight())
        if ancho > pantalla_ancho or alto > pantalla_alto:
                        return False
        if forma[3] is None:
                        return True                     # sin posición no hay nada que fallar
        x, y = self.a_absolutas(forma[3], forma[4], ancho, alto)
        return (MARGEN_VISIBLE - ancho < x < pantalla_ancho - MARGEN_VISIBLE
                and 0 <= y < pantalla_alto - MARGEN_VISIBLE)

    def a_absolutas(self, x, y, ancho, alto):
                """Un signo menos en la cadena no es una coordenada negativa: significa
        "desde el borde derecho" (o inferior), y hay que convertirlo antes de
        comparar con el tamaño de la pantalla."""
        izquierda, arriba = int(x), int(y)
        if x.startswith("-"):
                        izquierda = self.winfo_screenwidth() + izquierda - ancho
        if y.startswith("-"):
                        arriba = self.winfo_screenheight() + arriba - alto
        return izquierda, arriba

    def pintar_tema(self):
                colores = TEMAS[self.tema.get()]
        self.texto.configure(background=colores["fondo"],
                             foreground=colores["letra"],
                             insertbackground=colores["letra"])
        self.lista.configure(background=colores["fondo"],
                             foreground=colores["letra"])
        self.prefs["tema"] = self.tema.get()
        self.prefs.guardar()        # cambio suelto: se guarda ya

    def refrescar_recientes(self):
                """El menú se reconstruye desde la lista limpia que da la lógica."""
        final = self.menu_archivo.index("end")
        if final is not None and final > 1:
                        self.menu_archivo.delete(2, "end")
        self.lista.delete(0, "end")
        recientes = self.prefs["recientes"]
        if not recientes:
                        self.menu_archivo.add_command(label="(sin recientes)",
                                          state="disabled")
            return
        for orden, ruta in enumerate(recientes, start=1):
                        nombre = pathlib.Path(ruta).name
            self.menu_archivo.add_command(
                label=f"{orden}. {nombre}",
                command=lambda r=ruta: self.mostrar(pathlib.Path(r)))
            self.lista.insert("end", nombre)

    # --- lo que hace el programa

    def abrir(self):
                ruta = filedialog.askopenfilename(
            parent=self, title="Abrir nota",
            filetypes=[("Texto", "*.txt *.md"), ("Todos", "*.*")])
        if not ruta:                # cancelar devuelve cadena vacía
                        return
        self.mostrar(pathlib.Path(ruta))

    def mostrar(self, ruta):
                try:
                        contenido = ruta.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as error:
                        self.estado.set(f"No se ha podido leer: {error}")
            return
        self.texto.delete("1.0", "end")
        self.texto.insert("1.0", contenido)
        self.estado.set(str(ruta))
        self.prefs.anotar_reciente(ruta)
        self.prefs.guardar()
        self.refrescar_recientes()

    def al_elegir(self, evento):
                seleccion = self.lista.curselection()
        if seleccion:
                        self.mostrar(pathlib.Path(self.prefs["recientes"][seleccion[0]]))

    # --- recoger al cerrar

    def al_cerrar(self):
                self.recoger_preferencias()
        self.prefs.guardar()
        self.destroy()

    def recoger_preferencias(self):
                """update_idletasks primero: geometry() devuelve datos rancios hasta
        que Tk procesa el último cambio de tamaño."""
        self.update_idletasks()
        maximizada = self.state() == "zoomed"
        self.prefs["maximizada"] = maximizada
        if not maximizada:
            # La geometría de una maximizada es la de la pantalla: guardarla
            # daría una ventana no maximizada del tamaño del monitor.
                        self.prefs["geometria"] = self.geometry()
        # 'iconic' no se guarda nunca: el programa abriría minimizado.
        try:
                        self.prefs["divisor"] = self.paneles.sashpos(0)
        except tk.TclError:
                        pass

    def centrar(self):
                self.update_idletasks()
        x = (self.winfo_screenwidth() - self.winfo_width()) // 2
        y = (self.winfo_screenheight() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")


if __name__ == "__main__":
        Aplicacion(Preferencias().cargar()).mainloop()
```

> [!resumen] En resumen
>
> Recordar cosas entre sesiones cuesta poco y se nota mucho, pero **la geometría de una ventana es un dato que puede quedarse inválido sin que nadie toque el fichero**. Merecen recordarse el tamaño y la posición, si estaba maximizada, el divisor, las columnas, la pestaña, el tema y los recientes; no merecen un formulario a medias, una búsqueda ni nada que sea un dato del usuario, porque **perder el fichero de preferencias no debe tener consecuencias**, y eso solo es verdad si dentro no hay nada importante. La forma es un **diccionario de valores por defecto** que sirve de documentación, de valor inicial y sobre todo de **filtro**: mezclar solo las claves que existen en él hace que una versión que añade o quita una preferencia no reviente. Al **leer**, un fichero roto **no puede impedir arrancar**: se capturan `(OSError, json.JSONDecodeError)` (`FileNotFoundError` es un `OSError`, y la primera vez no es un error) y se sigue con los valores de fábrica. Al **escribir**, `open(ruta, "w")` vacía el fichero antes de escribir, así que un corte a mitad deja medio fichero: se escribe en un temporal y se hace **`os.replace`, que es atómico** y se porta igual en Windows. De `geometry` hay cinco trampas medidas: **devuelve datos rancios** hasta un `update_idletasks()` (tras pedir `500x320` seguía diciendo `200x200`); **no se parte con `split("+")`**, porque un `-` significa «desde el borde derecho» y una ventana a la derecha devuelve `640x400-50-30`; **lo inválido no siempre falla** (`"basura"` da `TclError`, pero `""` se acepta y devuelve la ventana a su tamaño pedido); **`minsize` gana**, que aquí es una red de seguridad; y **maximizada y minimizada no viajan en la cadena**, así que hay que guardar el estado aparte, restaurar **primero la geometría y después el estado**, y no guardar nunca `iconic` porque el programa abriría minimizado. La peor de todas es la que no se ve: **una geometría guardada en un monitor que ya no está se aplica sin error y la ventana aparece donde no hay pantalla**, con lo que el programa «no abre»; hay que validar contra `winfo_screenwidth()` antes de aplicar y, si no cabe, poner solo el tamaño y centrar. Sobre **cuándo guardar**: no en cada `<Configure>` (diez movimientos dan nueve eventos y arrastrar da cientos), sino al cerrar para el tamaño y el divisor, y en el momento para los cambios sueltos como el tema o los recientes; `geometry()` **se puede leer** tanto en `WM_DELETE_WINDOW` como en `<Destroy>`, y un `<Configure>` atado a la ventana **también recibe los de sus hijos**, así que el `if evento.widget is not self: return` es obligatorio. Y el reparto de la lección 41: **el fichero es de la lógica** y **aplicarlo a la ventana es de la interfaz**, porque validar una geometría necesita preguntar por la pantalla.

> [!ejercicio] Practica
>
> 1. En `43-geo.py`, pon una geometría con `geometry()`, lee `geometry()` sin `update_idletasks()` y después con él. Copia las dos cadenas.
> 2. Coloca la ventana con `geometry("400x300-50-30")` y prueba a partir la cadena con `split("+")`. Copia el error.
> 3. Prueba `geometry()` con `"basura"`, `"500x"`, `""` y `"5000x4000+9000+9000"`. Anota cuáles fallan y cuáles no.
> 4. Escribe `cabe_en_la_pantalla` y pásale las cuatro cadenas del ejercicio anterior más una válida.
> 5. Pon `minsize(400, 300)` y pide `geometry("100x100")`. Comprueba qué tamaño queda.
> 6. Maximiza con `state("zoomed")`, lee `geometry()`, vuelve a `"normal"` y léela otra vez.
> 7. Minimiza con `iconify()` y comprueba qué devuelve `state()`. Explica por qué no se guarda.
> 8. En `43-prefs.py`, escribe la clase `Preferencias` con su diccionario por defecto. Comprueba que importarla **no** carga `tkinter` mirando `sys.modules`.
> 9. Guarda un fichero, ábrelo con el editor, rómpelo a mano y comprueba que el programa arranca igual.
> 10. Quita el `os.replace` y escribe directamente con `open(..., "w")`. Explica qué se pierde.
> 11. Guarda unas preferencias, añade una clave nueva a `POR_DEFECTO` y vuelve a cargar. Comprueba que no revienta.
> 12. Ata un `<Configure>` que cuente e imprima el widget. Redimensiona la ventana arrastrando una esquina y anota cuántos salen y de cuántos widgets distintos.
> 13. Añade la lista de recientes con un fichero que luego borras a mano. Comprueba que al arrancar ya no aparece.
