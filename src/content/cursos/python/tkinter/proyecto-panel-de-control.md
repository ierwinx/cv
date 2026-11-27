---
titulo: "Proyecto: un panel de control"
resumen: "Tres pestañas sobre la misma carpeta: una que mide cada segundo, una que trabaja en un hilo y se puede cancelar, y una que dibuja el historial. Y el apagado ordenado de las tres."
minutos: 39
orden: 48
---

Último proyecto del módulo, y el que junta lo que no ha cabido en los otros dos. Un panel de control es una ventana que **hace tres cosas a la vez sobre los mismos datos**: mide algo cada cierto tiempo, procesa algo que tarda, y dibuja lo que va saliendo. Cada una de las tres tira de una técnica distinta del bloque E, y las tres tienen que apagarse bien cuando se cierra la ventana.

Aquí los datos son **una carpeta del disco**, que tiene la ventaja de ser real: cambia de verdad cuando copias un fichero, y se puede comprobar con el ratón mientras el panel está abierto. La pestaña de vigilancia la mide cada segundo, la de duplicados lee todos los ficheros para encontrar repetidos, y la gráfica dibuja la historia de lo que ha ido midiendo.

> [!objetivo] Qué vas a aprender
>
> Escribir un panel con tres pestañas y entender por qué cada una usa una técnica diferente: **`after` para lo que es barato**, **hilo con cola y bandera para lo que no lo es**, y **`Canvas` redibujado en `<Configure>`** para la gráfica. Y sobre todo, dejar el cierre limpio: sin temporizadores tocando widgets borrados, sin hilos a medias y sin preferencias perdidas.

## La pregunta que decide todo: cuánto tarda

Antes de escribir una línea hay que saber cuánto cuesta cada cosa, porque de eso depende dónde va. Las dos operaciones del panel, medidas:

```consola
mirar una carpeta de 41 ficheros con os.scandir:      0,15 ms
mirar una carpeta de 3000 ficheros con os.scandir:   12,29 ms
mirar 3000 con pathlib.iterdir + stat:               30,02 ms
firmar 1000 ficheros pequeños (sha256):             273 ms
firmar un fichero de 20 MB:                          18 ms
```

La conclusión está en los números. **Mirar una carpeta es gratis**: medio milisegundo no se nota ni a diez veces por segundo, así que la vigilancia va en el hilo principal con `after` y no necesita ningún hilo. **Leer el contenido de los ficheros no es gratis**: 273 ms por cada mil ficheros pequeños, y una carpeta de descargas con diez mil pasa del medio minuto, así que eso sí va a un hilo. La regla de la lección 42 con números delante: el hilo no es una mejora, es lo que se hace cuando el `after` por lotes ya no llega.

Dos detalles que salieron de la misma medición. `os.scandir` es **el doble de rápido** que `iterdir` más `stat` porque el sistema le da el tamaño en la misma llamada, y aquí eso importa porque la función se ejecuta una vez por segundo, para siempre. Y el coste de firmar **es por fichero y no por byte**: 18 ms para 20 MB de un tirón frente a 273 ms para 2 MB repartidos en mil ficheros, porque abrir y cerrar domina. Eso tiene una consecuencia bonita: **trocear el trabajo por ficheros da una cancelación muy fina**, porque ninguna vuelta del bucle dura mucho.

## Primera pestaña: el bucle que mide

Es la cadena de `after` de la lección 42, con dos cosas que solo se ven cuando el bucle lleva horas corriendo.

### La carpeta pierde ficheros mientras la estás mirando

Un programa que vigila una carpeta viva tiene que suponer que **lo que acaba de listar puede no estar ya**:

```consola
>>> entrada = next(os.scandir(carpeta))   # existe
>>> # ...alguien borra el fichero aquí...
>>> entrada.stat()
FileNotFoundError: [Errno 2] No such file or directory
```

No es un caso raro: pasa siempre que se vigila una carpeta de descargas o de temporales. Cada fichero va dentro de su propio `try`, y los que fallan se cuentan aparte, porque el número de ficheros ilegibles **también es información** que el panel puede mostrar.

### El `after` periódico se retrasa, y se puede corregir

Una cadena de `after(1000, medir)` **no mide cada segundo**: mide cada segundo *más* lo que tarde `medir`, y el retraso se acumula. Medido con un intervalo de 100 ms:

```consola
after(100) con   0 ms de trabajo -> periodo real  101,2 ms
after(100) con  30 ms de trabajo -> periodo real  131,9 ms
after(100) con 120 ms de trabajo -> periodo real  222,1 ms
```

Con el trabajo de este panel (0,15 ms sobre 1000) la deriva es del 0,015 % y **no importa nada**, que es la razón de que el programa no la corrija. Pero importa mucho en cualquier cosa donde el tiempo se sume: el cronómetro de la lección 42 con esta cadena atrasaría visiblemente. La corrección es programar **contra un reloj** y no contra el intervalo:

```python
def tic(self):
        self.marcas += 1
    self.trabajo()
    objetivo = self.inicio + self.marcas * 0.1     # el múltiplo que toca
    espera = max(int((objetivo - time.monotonic()) * 1000), 1)
    self.pendiente = self.after(espera, self.tic)
```

Medido así, el periodo real baja a 100,1 ms y el desvío acumulado tras ocho vueltas es de **1 ms**. Y una tranquilidad: si el trabajo tarda más que el intervalo, la cadena **no acumula cola**, simplemente va más lenta (con 150 ms de trabajo y `after(100)`, los huecos salen todos de 252 ms). Con un hilo por cada tic sí se acumularían, y eso es una forma barata de hundir un programa.

> [!consejo] Consejo
>
> Cuando el intervalo lo elige el usuario, el cambio tiene que **aplicarse ya**: si está midiendo cada 30 segundos y se pasa a cada segundo, esperar a que venza el temporizador viejo da la sensación de que el programa no ha hecho caso. Se cancela el pendiente y se mide en el momento.

## Segunda pestaña: el hilo que se puede cancelar

Un botón de «Cancelar» que no cancela es peor que no tenerlo. Y lo primero que hay que aceptar es que **Python no puede matar un hilo**:

```consola
>>> [m for m in dir(threading.Thread) if "kill" in m or "stop" in m]
[]
```

No hay `stop()`, no hay `kill()`, y no es un olvido: matar un hilo a mitad lo dejaría con ficheros abiertos y estructuras a medias. Lo único que hay es **pedirle que pare y esperar a que se dé cuenta**, y eso significa que la cancelación solo ocurre **donde el trabajo la comprueba**:

```python
for hijo in ficheros:
        if parar.is_set():          # una vez por fichero
                return resultado_parcial
    procesar(hijo)
```

Un `threading.Event` es lo que hace de bandera: la interfaz llama a `parar.set()` y el hilo lo ve en la vuelta siguiente. Medido en el panel, pulsar Cancelar con 500 ficheros por delante lo detiene en el 13 y devuelve lo que llevaba hecho.

Y la trampa, que es el otro lado de lo mismo: si el trabajo **no está troceado**, la bandera no sirve para nada. Un hilo que hace una sola operación larga no se puede cancelar de ninguna forma, y `join(timeout=...)` no ayuda, porque vuelve sin haber conseguido nada:

```consola
>>> hilo.join(timeout=0.2)      # vuelve a los 202 ms
>>> hilo.is_alive()
True                            # el hilo sigue ahí, tan tranquilo
```

Así que «cancelable» es una propiedad del **trabajo**, no del hilo. Aquí se consigue gratis porque el bucle es por ficheros.

### El atajo que hace que el trabajo tarde diez veces menos

Buscar duplicados por contenido parece obligar a leer todos los ficheros, y no: **dos ficheros de tamaño distinto no pueden ser iguales**. Agrupar por tamaño primero, que solo cuesta un `stat`, y firmar únicamente los grupos con más de uno, es la diferencia entre leer el disco entero y no leer casi nada:

```consola
carpeta de dos ficheros con tamaños distintos:
  grupos de duplicados: 0 | ficheros leídos: 0
```

Cero lecturas. Es una optimización de la lógica, no de la interfaz, y por eso vive en `vigilancia.py`: el panel se limita a enseñar el resultado.

### Lo que viaja por la cola

El patrón es el de la lección 42, con tres clases de mensaje: `("avance", …)` muchas veces, y `("resultado", …)` o `("error", …)` una sola vez al final. Tres detalles:

El `except` que envuelve el trabajo del hilo **no es opcional**. Sin él, una excepción mata el hilo en silencio, el mensaje final nunca llega, y el botón se queda desactivado para siempre: el programa parece colgado sin estar colgado. Con él, el error llega por la cola y se muestra como cualquier otro.

De los avances **solo interesa el último**. En el tiempo que pasa entre dos vaciados de la cola se acumulan decenas, y aplicarlos todos a la barra es dibujar cincuenta veces para que se vea uno. Se vacía la cola entera, se guarda el más nuevo y se pinta ese.

Y el `total` del avance **no cambia a mitad**, porque se calcula antes de empezar a firmar. Si cambiara, la barra iría hacia atrás, que es la forma más rápida de que alguien deje de confiar en una barra de progreso.

## Tercera pestaña: la gráfica que cambia de tamaño

Dibujar una serie en un `Canvas` es el lienzo de la lección 26 otra vez, pero un lienzo que **crece con la ventana** tiene tres detalles propios, y los tres dan un fallo silencioso.

### En el `__init__` el lienzo mide 1×1

```consola
>>> lienzo = tk.Canvas(marco)
>>> lienzo.pack(fill="both", expand=True)
>>> lienzo.winfo_width()
1
>>> v.update_idletasks()
>>> lienzo.winfo_width()
900
```

Dibujar en el constructor pinta en un lienzo de un píxel, y como no hay error, lo que se ve es una pestaña en blanco. El sitio donde se dibuja es **el primer `<Configure>`**, que es justo el momento en que el lienzo ya sabe lo que mide. Cuidado también con `cget("width")`, que devuelve lo que se pidió al crearlo y no lo que mide: para el tamaño de verdad, `winfo_width()` o el `evento.width` del `<Configure>`.

### `delete("all")` no es limpieza, es el dibujo

Un `Canvas` **acumula**. Lo que se dibuja encima no sustituye a lo de debajo:

```consola
ronda 1:  2 items en el lienzo
ronda 2:  4 items
ronda 3:  6 items
ronda 5: 10 items
```

Con una gráfica que se redibuja cada segundo, en un minuto hay sesenta líneas superpuestas, el lienzo va cada vez más lento y el dibujo no es el dibujo, es la suma de todos los anteriores. La función que dibuja empieza por `delete("all")`, y entonces se puede llamar todas las veces que haga falta. Medido: la gráfica completa —rejilla, escala, ejes, línea de 300 puntos y el punto del final, 14 items— tarda **0,23 ms**, así que redibujarla entera es más barato que cualquier apaño para redibujar solo un trozo.

> [!consejo] Consejo
>
> `coords()` sobre una línea que ya existe es 2,3 veces más rápido que borrarla y crearla (0,059 ms frente a 0,138 ms), pero obliga a que el número de puntos no cambie. Con estas cifras, borrar y crear es la opción sensata: la diferencia es de centésimas de milisegundo y el código no tiene que distinguir casos.

### El `<Configure>` llega a ráfagas, y hay que amortiguarlo

Arrastrando una esquina llegan decenas de `<Configure>` por segundo (hallazgo de la lección 43: diez movimientos programados dan nueve eventos). Redibujar en cada uno funciona cuando dibujar cuesta 0,23 ms, pero deja de funcionar en cuanto el redibujado tenga que **recalcular o volver a pedir los datos**, que es lo que pasa en cualquier panel que crezca un poco. La amortiguación es la misma de la búsqueda mientras se escribe de la lección 39, con `after` y `after_cancel`:

```python
def al_cambiar_tamano(self, evento):
        if self.pendiente is not None:
                self.after_cancel(self.pendiente)
    self.pendiente = self.after(80, self.dibujar)
```

Comprobado: nueve `<Configure>` seguidos dan **cero dibujos** mientras llegan y **uno** cuando vence el temporizador.

Y dos casos de borde que hay que atender porque son errores de verdad y no cuestiones de gusto. **Una línea necesita dos puntos**: `create_line(10, 10)` lanza `TclError: wrong # coordinates: expected at least 4, got 2`, así que con menos de dos lecturas se escribe un texto y no se dibuja la serie. Y **el lienzo puede ser más pequeño que los márgenes**: por debajo de dos veces el margen, el eje se come la gráfica, así que se comprueba el tamaño y se sale sin dibujar, aparte de poner un `minsize` a la ventana.

> [!aviso] Atención
>
> Dibujar en una pestaña que no se está viendo es trabajo tirado, y encima no se puede: un `Notebook` **solo coloca la pestaña activa**, así que el lienzo de una pestaña oculta sigue midiendo 1×1 (comprobado). Por eso el panel redibuja la gráfica solo si es la pestaña visible, y el aviso de que hay datos nuevos llega por un evento virtual, `<<HistorialCambiado>>`, que es la forma de la lección 40 de que dos piezas hablen sin conocerse.

## Lo que hay que apagar al cerrar

Las tres pestañas dejan algo encendido, y las tres se apagan distinto. Esto es lo que separa un programa que se cierra de uno que se cierra dejando errores en la consola.

**El temporizador de la vigilancia** se programa con `self.after(...)` y no con `self.panel.after(...)`. Es el hallazgo de la lección 42: un `after` colgado del widget muere con el widget, y uno colgado de la ventana sobrevive y revienta al tocar lo que ya no está (`TclError: invalid command name ".!label2"`). Aun así se cancela en el `<Destroy>`, que es gratis y hace explícito lo que si no es una propiedad sutil de Tk.

**Quitar una pestaña no la apaga.** `forget()` y `destroy()` no son lo mismo, y aquí se ve por qué:

```consola
tics con la pestaña visible: 4
tras forget(), sigue ticando: True  (4 -> 8)
el frame existe todavía: 1
tras destroy(), sigue ticando: False (8 -> 8)
```

`forget()` la saca del `Notebook` pero **el frame sigue vivo**, así que su cadena de `after` sigue corriendo sin que nadie la vea. Es la fuga perfecta: consume, no se nota y no da ningún error.

**El hilo hay que esperarlo.** Es `daemon=True`, así que no impide salir, pero eso significa que al salir **se corta en seco, a mitad de lo que estuviera haciendo**. Si solo lee, no pasa nada; si escribiera, dejaría un fichero a medias. El cierre ordenado son las tres líneas de siempre: avisar al usuario de que hay trabajo en marcha (con la confirmación justificada de la lección 36), poner la bandera, y `join` con un tope de tiempo para no quedarse esperando para siempre.

**Y las preferencias, al final.** Se guardan en `WM_DELETE_WINDOW`, que es donde todavía se puede leer la geometría, y con el `os.replace` sobre temporal de la lección 43 para que un corte no deje el fichero a medio escribir.

## El programa

Dos ficheros, como en los dos proyectos anteriores. `vigilancia.py` no sabe que existe Tkinter: mira carpetas, guarda historiales y busca duplicados. Todo lo que tenga que ver con píxeles, colores y formato de tamaños está en `panel.py`.

```python title="vigilancia.py"
"""La lógica del panel: mirar una carpeta, guardar el historial y buscar
duplicados de forma cancelable. Ni una línea de tkinter."""

import dataclasses
import hashlib
import os
import pathlib
import time


class ErrorDeCarpeta(Exception):
        """La carpeta vigilada no sirve. Lleva el motivo ya redactado."""


@dataclasses.dataclass(frozen=True)
class Instantanea:
        """Lo que se sabe de la carpeta en un momento dado."""

    momento: float
    ficheros: int
    bytes_totales: int
    reciente: str = ""
    ilegibles: int = 0


def comprobar(carpeta):
        """Devuelve la carpeta como Path o explica por qué no vale."""
    ruta = pathlib.Path(carpeta).expanduser()
    if not ruta.exists():
                raise ErrorDeCarpeta(f"No existe: {ruta}")
    if not ruta.is_dir():
                raise ErrorDeCarpeta(f"No es una carpeta: {ruta.name}")
    if not os.access(ruta, os.R_OK):
                raise ErrorDeCarpeta(f"Sin permiso de lectura: {ruta.name}")
    return ruta.resolve()


def mirar(carpeta):
        """Una instantánea de la carpeta. Rápida: se llama una vez por segundo.

    os.scandir en vez de iterdir porque trae el tamaño en la misma llamada
    al sistema; medido, la mitad de tiempo. Y cada fichero va en su try,
    porque una carpeta viva pierde ficheros mientras se la está mirando.
    """
    ruta = comprobar(carpeta)
    ficheros = bytes_totales = ilegibles = 0
    reciente, ultimo_cambio = "", -1.0
    try:
                with os.scandir(ruta) as entradas:
                        for entrada in entradas:
                                try:
                                        if not entrada.is_file():
                                                continue
                    datos = entrada.stat()
                except OSError:
                                        ilegibles += 1     # desapareció o no se puede leer
                    continue
                ficheros += 1
                bytes_totales += datos.st_size
                if datos.st_mtime > ultimo_cambio:
                                        reciente, ultimo_cambio = entrada.name, datos.st_mtime
    except OSError as error:
                raise ErrorDeCarpeta(f"No se puede leer {ruta.name}: {error}") from None
    return Instantanea(time.time(), ficheros, bytes_totales, reciente,
                       ilegibles)


class Historial:
        """Las últimas N instantáneas. Es lo que dibuja la gráfica."""

    def __init__(self, maximo=120):
                self.maximo = maximo
        self.instantaneas = []

    def anotar(self, instantanea):
                self.instantaneas.append(instantanea)
        if len(self.instantaneas) > self.maximo:
                        del self.instantaneas[:-self.maximo]

    def vaciar(self):
                self.instantaneas.clear()

    def serie(self, campo):
                return [getattr(i, campo) for i in self.instantaneas]

    def maximo_de(self, campo):
                return max(self.serie(campo), default=0)

    def ultima(self):
                return self.instantaneas[-1] if self.instantaneas else None

    def __len__(self):
                return len(self.instantaneas)


@dataclasses.dataclass(frozen=True)
class Avance:
        """Lo que el trabajo largo cuenta de sí mismo mientras avanza."""

    hechos: int
    total: int
    nombre: str


@dataclasses.dataclass(frozen=True)
class Duplicados:
        """El resultado: grupos de ficheros con el mismo contenido."""

    grupos: list
    tamanos: tuple
    revisados: int
    fallidos: int
    cancelado: bool = False

    @property
    def ficheros_repetidos(self):
                return sum(len(grupo) - 1 for grupo in self.grupos)

    @property
    def bytes_desperdiciados(self):
                return sum(tamano * (len(grupo) - 1)
                   for tamano, grupo in zip(self.tamanos, self.grupos))


def firmar(ruta, trozo=65536):
        """El sha256 de un fichero, leído por trozos para no cargarlo entero."""
    resumen = hashlib.sha256()
    with open(ruta, "rb") as fichero:
                while datos := fichero.read(trozo):
                        resumen.update(datos)
    return resumen.hexdigest()


def buscar_duplicados(carpeta, parar=None, avisar=None):
        """Busca ficheros repetidos por contenido. Cancelable y troceado.

    `parar` es un objeto con `is_set()` (un threading.Event) y se consulta
    UNA VEZ POR FICHERO: no hay forma de matar un hilo desde fuera, así que
    la cancelación solo ocurre donde el trabajo la comprueba.

    `avisar` recibe un Avance por fichero. Quien llame decide qué hacer con
    él; esta función no sabe que existe una barra de progreso.
    """
    ruta = comprobar(carpeta)
    candidatos = []
    for hijo in sorted(ruta.rglob("*")):
                try:
                        if hijo.is_file() and hijo.stat().st_size > 0:
                                candidatos.append((hijo.stat().st_size, hijo))
        except OSError:
                        continue

    # Primero se agrupa por tamaño: dos ficheros de tamaño distinto no
    # pueden ser iguales, y así se evita leer la mayoría.
    por_tamano = {}
    for tamano, hijo in candidatos:
                por_tamano.setdefault(tamano, []).append(hijo)
    sospechosos = [(t, rutas) for t, rutas in por_tamano.items()
                   if len(rutas) > 1]
    total = sum(len(rutas) for _, rutas in sospechosos)

    grupos, tamanos, revisados, fallidos = [], [], 0, 0
    for tamano, rutas in sorted(sospechosos):
                por_firma = {}
        for hijo in rutas:
                        if parar is not None and parar.is_set():
                                return Duplicados(grupos, tuple(tamanos), revisados,
                                  fallidos, True)
            revisados += 1
            if avisar is not None:
                                avisar(Avance(revisados, total, hijo.name))
            try:
                                por_firma.setdefault(firmar(hijo), []).append(hijo)
            except OSError:
                                fallidos += 1
        for iguales in por_firma.values():
                        if len(iguales) > 1:
                                grupos.append(sorted(str(r) for r in iguales))
                tamanos.append(tamano)
    return Duplicados(grupos, tuple(tamanos), revisados, fallidos)
```

```python title="panel.py"
"""El panel: tres pestañas sobre una sola carpeta vigilada.

Vigilancia mide con `after` en el hilo principal, porque medir es barato.
Duplicados trabaja en un hilo con cola y bandera de cancelación, porque
leer ficheros no lo es. Gráfica dibuja el historial en un lienzo.
"""

import json
import os
import pathlib
import queue
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import vigilancia

INTERVALOS = {"cada segundo": 1000, "cada 2 segundos": 2000,
              "cada 5 segundos": 5000, "cada 30 segundos": 30000}
SERIES = {"Ficheros": "ficheros", "Tamaño": "bytes_totales"}
AZUL, VERDE, ROJO, GRIS = "#1565C0", "#2E7D32", "#C62828", "#777777"


def carpeta_de_datos(nombre="panel-carpeta"):
        """Donde el sistema espera la configuración. Lección 45."""
    if sys.platform == "darwin":
                base = pathlib.Path.home() / "Library" / "Application Support"
    elif os.name == "nt":
                base = pathlib.Path(os.environ.get("APPDATA", pathlib.Path.home()))
    else:
                base = pathlib.Path(os.environ.get("XDG_CONFIG_HOME",
                                           pathlib.Path.home() / ".config"))
    destino = base / nombre
    destino.mkdir(parents=True, exist_ok=True)
    return destino


class Preferencias:
        """Versión mínima de la lección 43: solo lo que este panel recuerda."""

    POR_DEFECTO = {"carpeta": str(pathlib.Path.home()),
                   "geometria": "820x560", "intervalo": "cada 2 segundos",
                   "serie": "Ficheros"}

    def __init__(self, ruta):
                self.ruta = pathlib.Path(ruta)
        self.valores = dict(self.POR_DEFECTO)
        try:
                        guardados = json.loads(self.ruta.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
                        return                      # primera vez, o fichero roto
        for clave in self.POR_DEFECTO:  # filtrar: claves nuevas y viejas
                        if clave in guardados and isinstance(guardados[clave], str):
                                self.valores[clave] = guardados[clave]

    def __getitem__(self, clave):
                return self.valores[clave]

    def __setitem__(self, clave, valor):
                self.valores[clave] = valor

    def guardar(self):
                temporal = self.ruta.with_suffix(".tmp")
        try:
                        temporal.write_text(json.dumps(self.valores, indent=2,
                                           ensure_ascii=False),
                                encoding="utf-8")
            os.replace(temporal, self.ruta)     # atómico
        except OSError:
                        pass                                # no vale morir por esto


def formato_tamano(cantidad):
        """El formato es de la interfaz, no de la lógica. Lección 41."""
    if cantidad < 1024:
                return f"{cantidad:.0f} B"
    for unidad in ("KB", "MB", "GB"):
                cantidad /= 1024
        if cantidad < 1024:
                        return f"{cantidad:.1f} {unidad}"
    return f"{cantidad / 1024:.1f} TB"


class Vigilancia(ttk.Frame):
        """Mide la carpeta cada X con `after`. Nada de hilos: medir cuesta
    medio milisegundo y un hilo para esto sería complicarlo por gusto."""

    def __init__(self, padre, panel, **opciones):
                super().__init__(padre, **opciones)
        self.panel = panel
        self.pendiente = None
        self.encendida = tk.BooleanVar(value=True)
        self.lecturas = tk.StringVar(value="0")
        self.campos = {}

        mandos = ttk.Frame(self)
        mandos.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 12))
        ttk.Checkbutton(mandos, text="Vigilando", variable=self.encendida,
                        command=self.conmutar).pack(side="left")
        ttk.Label(mandos, text="  Medir:").pack(side="left")
        self.intervalo = tk.StringVar(value=panel.preferencias["intervalo"])
        combo = ttk.Combobox(mandos, textvariable=self.intervalo, width=16,
                             state="readonly", values=list(INTERVALOS))
        combo.pack(side="left")
        combo.bind("<<ComboboxSelected>>", self.cambiar_intervalo)
        ttk.Button(mandos, text="Medir ahora",
                   command=self.medir).pack(side="left", padx=8)

        filas = (("Ficheros", "ficheros"), ("Tamaño total", "tamano"),
                 ("Más reciente", "reciente"), ("No legibles", "ilegibles"),
                 ("Lecturas", "lecturas"))
        for fila, (titulo, clave) in enumerate(filas, start=1):
                        ttk.Label(self, text=f"{titulo}:").grid(row=fila, column=0,
                                                    sticky="w", pady=3)
            valor = tk.StringVar(value="—")
            ttk.Label(self, textvariable=valor,
                      font=("Helvetica", 13, "bold")).grid(row=fila, column=1,
                                                           sticky="w", padx=12)
            self.campos[clave] = valor
        self.columnconfigure(1, weight=1)

        self.bind("<Destroy>", self.al_destruir)
        self.medir()

    def conmutar(self):
                if self.encendida.get():
                        self.medir()
        else:
                        self.cancelar_pendiente()
            self.panel.decir("Vigilancia detenida", GRIS)

    def cambiar_intervalo(self, evento=None):
                self.panel.preferencias["intervalo"] = self.intervalo.get()
        if self.encendida.get():        # aplicar ya, sin esperar al viejo
                        self.cancelar_pendiente()
            self.medir()

    def cancelar_pendiente(self):
                if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
            self.pendiente = None

    def medir(self):
                self.cancelar_pendiente()
        try:
                        foto = vigilancia.mirar(self.panel.carpeta.get())
        except vigilancia.ErrorDeCarpeta as error:
                        self.encendida.set(False)   # no insistir cada segundo con un error
            self.panel.decir(str(error), ROJO)
            return
        self.panel.historial.anotar(foto)
        self.campos["ficheros"].set(str(foto.ficheros))
        self.campos["tamano"].set(formato_tamano(foto.bytes_totales))
        self.campos["reciente"].set(foto.reciente or "—")
        self.campos["ilegibles"].set(str(foto.ilegibles))
        self.campos["lecturas"].set(str(len(self.panel.historial)))
        self.panel.event_generate("<<HistorialCambiado>>")
        if self.encendida.get():
            # self.after y no self.panel.after: así el temporizador muere
            # con la pestaña y no deja un cadáver tocando widgets borrados.
                        self.pendiente = self.after(INTERVALOS[self.intervalo.get()],
                                        self.medir)

    def al_destruir(self, evento):
                if evento.widget is self:
                        self.cancelar_pendiente()


class Duplicados(ttk.Frame):
        """El trabajo largo: un hilo, una cola y una bandera para cancelar."""

    def __init__(self, padre, panel, **opciones):
                super().__init__(padre, **opciones)
        self.panel = panel
        self.hilo = None
        self.parar = None
        self.cola = queue.Queue()
        self.vaciado = None

        mandos = ttk.Frame(self)
        mandos.pack(fill="x", pady=(0, 8))
        self.boton = ttk.Button(mandos, text="Buscar duplicados",
                                command=self.arrancar)
        self.boton.pack(side="left")
        self.cancelar = ttk.Button(mandos, text="Cancelar", state="disabled",
                                   command=self.pedir_parada)
        self.cancelar.pack(side="left", padx=8)

        self.barra = ttk.Progressbar(self, mode="determinate", maximum=100)
        self.barra.pack(fill="x")
        self.actual = tk.StringVar(value="Sin empezar")
        ttk.Label(self, textvariable=self.actual, foreground=GRIS).pack(
            anchor="w", pady=(4, 8))

        columnas = ("tamano", "copias", "ficheros")
        self.arbol = ttk.Treeview(self, columns=columnas, show="headings",
                                  height=10)
        for columna, titulo, ancho in (("tamano", "Tamaño", 90),
                                       ("copias", "Copias", 70),
                                       ("ficheros", "Ficheros", 520)):
                        self.arbol.heading(columna, text=titulo)
            self.arbol.column(columna, width=ancho,
                              anchor="e" if columna != "ficheros" else "w")
        barra = ttk.Scrollbar(self, orient="vertical",
                              command=self.arbol.yview)
        self.arbol.configure(yscrollcommand=barra.set)
        self.arbol.pack(side="left", fill="both", expand=True)
        barra.pack(side="right", fill="y")

        self.bind("<Destroy>", self.al_destruir)

    def trabajando(self):
                return self.hilo is not None and self.hilo.is_alive()

    def arrancar(self):
                if self.trabajando():
                        return
        try:
                        carpeta = vigilancia.comprobar(self.panel.carpeta.get())
        except vigilancia.ErrorDeCarpeta as error:
                        self.panel.decir(str(error), ROJO)
            return
        self.arbol.delete(*self.arbol.get_children())
        self.barra.configure(value=0, maximum=100)
        self.actual.set("Recorriendo la carpeta…")
        self.boton.state(["disabled"])
        self.cancelar.state(["!disabled"])
        self.parar = threading.Event()
        self.hilo = threading.Thread(target=self.en_el_hilo, args=(carpeta,),
                                     daemon=True)
        self.hilo.start()
        self.vaciar_cola()

    def en_el_hilo(self, carpeta):
                """Lo único que corre fuera del hilo principal. No toca ni un
        widget: todo lo que tenga que decir lo pone en la cola."""
        try:
                        resultado = vigilancia.buscar_duplicados(
                carpeta, self.parar, lambda avance: self.cola.put(
                    ("avance", avance)))
            self.cola.put(("resultado", resultado))
        except Exception as error:                      # noqa: BLE001
            # Sin este except, la excepción se pierde: el hilo muere en
            # silencio y el botón se queda desactivado para siempre.
                        self.cola.put(("error", error))

    def pedir_parada(self):
                if self.parar is not None:
                        self.parar.set()            # el hilo lo verá en el próximo fichero
            self.actual.set("Cancelando…")
            self.cancelar.state(["disabled"])

    def vaciar_cola(self):
                ultimo = None
        try:
                        while True:
                                clase, dato = self.cola.get_nowait()
                if clase == "avance":
                                        ultimo = dato       # solo interesa el más nuevo
                else:
                                        self.terminar(clase, dato)
                    return
        except queue.Empty:
                        pass
        if ultimo is not None:
                        self.barra.configure(maximum=max(ultimo.total, 1),
                                 value=ultimo.hechos)
            self.actual.set(f"{ultimo.hechos} de {ultimo.total}: "
                            f"{ultimo.nombre}")
        if self.trabajando() or not self.cola.empty():
                        self.vaciado = self.after(60, self.vaciar_cola)
        else:
                        self.vaciado = None

    def terminar(self, clase, dato):
                self.vaciado = None
        self.boton.state(["!disabled"])
        self.cancelar.state(["disabled"])
        self.hilo = self.parar = None
        if clase == "error":
                        self.barra.configure(value=0)
            self.actual.set("Sin terminar")
            self.panel.decir(f"No se ha podido buscar: {dato}", ROJO)
            return
        for tamano, grupo in zip(dato.tamanos, dato.grupos):
                        nombres = ", ".join(pathlib.Path(r).name for r in grupo)
            self.arbol.insert("", "end", values=(formato_tamano(tamano),
                                                 len(grupo), nombres))
        if dato.cancelado:
                        self.actual.set(f"Cancelado tras {dato.revisados} ficheros")
            self.panel.decir("Búsqueda cancelada", GRIS)
            return
        self.barra.configure(value=self.barra.cget("maximum"))
        self.actual.set(f"{dato.revisados} ficheros leídos")
        if not dato.grupos:
                        self.panel.decir("Ningún duplicado", VERDE)
        else:
                        self.panel.decir(
                f"{len(dato.grupos)} grupos, {dato.ficheros_repetidos} copias "
                f"de sobra: {formato_tamano(dato.bytes_desperdiciados)}", AZUL)

    def al_destruir(self, evento):
                if evento.widget is not self:
                        return
        if self.vaciado is not None:
                        self.after_cancel(self.vaciado)
        if self.parar is not None:
                        self.parar.set()

    def esperar(self, segundos=2.0):
                """Para que quien cierre la ventana pueda dejar el hilo acabado."""
        if self.parar is not None:
                        self.parar.set()
        if self.hilo is not None:
                        self.hilo.join(timeout=segundos)


class Grafica(ttk.Frame):
        """El historial dibujado a mano. Se redibuja al cambiar de tamaño, y
    con amortiguación, porque el <Configure> llega a ráfagas."""

    MARGEN = 46

    def __init__(self, padre, panel, **opciones):
                super().__init__(padre, **opciones)
        self.panel = panel
        self.pendiente = None

        mandos = ttk.Frame(self)
        mandos.pack(fill="x", pady=(0, 8))
        ttk.Label(mandos, text="Serie:").pack(side="left")
        self.serie = tk.StringVar(value=panel.preferencias["serie"])
        for nombre in SERIES:
                        ttk.Radiobutton(mandos, text=nombre, value=nombre,
                            variable=self.serie,
                            command=self.cambiar_serie).pack(side="left",
                                                             padx=4)
        ttk.Button(mandos, text="Vaciar historial",
                   command=self.vaciar).pack(side="right")

        self.lienzo = tk.Canvas(self, background="white", highlightthickness=1,
                                highlightbackground="#ddd")
        self.lienzo.pack(fill="both", expand=True)
        # El <Configure> del lienzo es lo que da el primer tamaño de verdad:
        # en el __init__ mide 1x1, así que aquí no se dibuja nada todavía.
        self.lienzo.bind("<Configure>", self.al_cambiar_tamano)
        self.bind("<Destroy>", self.al_destruir)

    def cambiar_serie(self):
                self.panel.preferencias["serie"] = self.serie.get()
        self.dibujar()

    def vaciar(self):
                self.panel.historial.vaciar()
        self.dibujar()
        self.panel.decir("Historial vaciado", GRIS)

    def al_cambiar_tamano(self, evento):
                if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
        self.pendiente = self.after(80, self.dibujar)

    def al_destruir(self, evento):
                if evento.widget is self and self.pendiente is not None:
                        self.after_cancel(self.pendiente)

    def dibujar(self):
                self.pendiente = None
        lienzo = self.lienzo
        lienzo.delete("all")    # sin esto cada dibujo se queda debajo
        ancho, alto = lienzo.winfo_width(), lienzo.winfo_height()
        if ancho < 2 * self.MARGEN or alto < 2 * self.MARGEN:
                        return              # demasiado pequeño para dibujar nada legible
        campo = SERIES[self.serie.get()]
        valores = self.panel.historial.serie(campo)
        tope = max(self.panel.historial.maximo_de(campo), 1)
        margen = self.MARGEN
        izquierda, derecha = margen, ancho - 14
        arriba, abajo = 14, alto - margen // 2

        for paso in range(5):   # rejilla y escala
                        y = arriba + (abajo - arriba) * paso / 4
            lienzo.create_line(izquierda, y, derecha, y, fill="#eee")
            crudo = tope * (4 - paso) / 4
            texto = (formato_tamano(crudo) if campo == "bytes_totales"
                     else f"{crudo:.0f}")
            lienzo.create_text(izquierda - 6, y, text=texto, anchor="e",
                               font=("Helvetica", 9), fill=GRIS)
        lienzo.create_line(izquierda, arriba, izquierda, abajo, fill="#bbb")
        lienzo.create_line(izquierda, abajo, derecha, abajo, fill="#bbb")

        if len(valores) < 2:
                        lienzo.create_text((izquierda + derecha) / 2, (arriba + abajo) / 2,
                               text="Hacen falta al menos dos lecturas",
                               fill=GRIS)
            return              # create_line con un punto es un TclError
        paso = (derecha - izquierda) / (len(valores) - 1)
        puntos = []
        for indice, valor in enumerate(valores):
                        x = izquierda + indice * paso
            y = abajo - (abajo - arriba) * valor / tope
            puntos += [x, y]
        lienzo.create_line(*puntos, fill=AZUL, width=2, tags="serie")
        lienzo.create_oval(puntos[-2] - 4, puntos[-1] - 4,
                           puntos[-2] + 4, puntos[-1] + 4,
                           fill=AZUL, outline="")
        etiqueta = (formato_tamano(valores[-1]) if campo == "bytes_totales"
                    else str(valores[-1]))
        lienzo.create_text(derecha, arriba, text=etiqueta, anchor="ne",
                           font=("Helvetica", 11, "bold"), fill=AZUL)


class Aplicacion(tk.Tk):

        def __init__(self, preferencias):
                super().__init__()
        self.preferencias = preferencias
        self.historial = vigilancia.Historial(maximo=120)
        self.title("Panel de una carpeta")
        self.geometry(preferencias["geometria"])
        self.minsize(560, 420)          # por debajo, la gráfica no cabe

        self.carpeta = tk.StringVar(value=preferencias["carpeta"])
        self.estado = tk.StringVar(value="Listo")
        self.color = tk.StringVar(value=GRIS)

        arriba = ttk.Frame(self, padding=(12, 12, 12, 0))
        arriba.pack(fill="x")
        ttk.Label(arriba, text="Carpeta:").pack(side="left")
        ttk.Entry(arriba, textvariable=self.carpeta).pack(
            side="left", fill="x", expand=True, padx=8)
        ttk.Button(arriba, text="Elegir…", command=self.elegir).pack(
            side="left")

        self.libro = ttk.Notebook(self, padding=12)
        self.libro.pack(fill="both", expand=True)
        self.vigilancia = Vigilancia(self.libro, self, padding=12)
        self.duplicados = Duplicados(self.libro, self, padding=12)
        self.grafica = Grafica(self.libro, self, padding=12)
        self.libro.add(self.vigilancia, text="Vigilancia", underline=0)
        self.libro.add(self.duplicados, text="Duplicados", underline=0)
        self.libro.add(self.grafica, text="Gráfica", underline=0)
        self.libro.enable_traversal()

        self.pie = ttk.Label(self, textvariable=self.estado, foreground=GRIS,
                             anchor="w", padding=(12, 6))
        self.pie.pack(fill="x")

        self.bind("<<HistorialCambiado>>", self.al_cambiar_historial)
        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)

    def decir(self, mensaje, color=GRIS):
                self.estado.set(mensaje)
        self.pie.configure(foreground=color)

    def elegir(self):
                elegida = filedialog.askdirectory(title="Carpeta que vigilar",
                                          initialdir=self.carpeta.get(),
                                          mustexist=True, parent=self)
        if not elegida:
                        return
        self.carpeta.set(elegida)
        self.historial.vaciar()
        self.vigilancia.encendida.set(True)
        self.vigilancia.medir()
        self.grafica.dibujar()
        self.decir(f"Vigilando {pathlib.Path(elegida).name}", AZUL)

    def al_cambiar_historial(self, evento=None):
        # La gráfica solo se redibuja si es la pestaña que se está viendo:
        # dibujar en una pestaña oculta es trabajo tirado.
                if self.libro.select() == str(self.grafica):
                        self.grafica.dibujar()

    def al_cerrar(self):
                if self.duplicados.trabajando():
                        if not messagebox.askokcancel(
                    "Salir", "Hay una búsqueda de duplicados en marcha.",
                    detail="Si sales ahora se cancelará.", parent=self):
                                return
        self.preferencias["carpeta"] = self.carpeta.get()
        self.preferencias["geometria"] = self.geometry()
        self.preferencias.guardar()
        self.duplicados.esperar()       # que el hilo acabe antes de morir
        self.destroy()


def main():
        preferencias = Preferencias(carpeta_de_datos() / "panel.json")
    Aplicacion(preferencias).mainloop()


if __name__ == "__main__":
        main()
```

> [!resumen] En resumen
>
> Un panel de control obliga a hacer tres cosas a la vez sobre los mismos datos, y lo que decide qué técnica usa cada una es **cuánto tarda**, medido antes de escribir nada: mirar una carpeta con `os.scandir` cuesta **0,15 ms** (y 12 ms con tres mil ficheros, la mitad que `iterdir` más `stat`), así que la vigilancia va en el hilo principal con una cadena de `after`; firmar mil ficheros pequeños cuesta **273 ms**, así que eso va a un hilo. Tres cosas del bucle que mide: la carpeta **pierde ficheros mientras se la mira** (`stat()` de algo recién borrado es `FileNotFoundError`), así que cada fichero va en su `try` y los ilegibles se cuentan; el `after` periódico **se retrasa** lo que tarde el trabajo (con 30 ms de trabajo, `after(100)` da un periodo real de 131,9 ms), lo cual aquí es irrelevante pero hunde un cronómetro, y se corrige programando contra un reloj (periodo real de 100,1 ms y 1 ms de desvío acumulado); y si el trabajo tarda más que el intervalo, la cadena **no acumula cola**, solo va más lenta. Tres del hilo: **Python no puede matar un hilo** (no hay `stop()` ni `kill()`), así que la cancelación es un `threading.Event` que el trabajo consulta **una vez por fichero**, y «cancelable» es por tanto una propiedad del trabajo y no del hilo —si no está troceado, `join(timeout=…)` vuelve pero el hilo sigue vivo—; el `except` alrededor del trabajo del hilo **no es opcional**, porque sin él una excepción lo mata en silencio y el botón se queda desactivado para siempre; y de los avances acumulados en la cola **solo se pinta el último**. Tres de la gráfica: en el `__init__` el lienzo **mide 1×1** y hay que dibujar en el primer `<Configure>`, que además **no llega a una pestaña oculta** porque el `Notebook` solo coloca la activa; **`delete("all")` es parte del dibujo** y no limpieza, porque el `Canvas` acumula (cinco redibujados sin borrar dejan diez items superpuestos); y el `<Configure>` llega a ráfagas, así que se amortigua con `after`/`after_cancel` (nueve eventos seguidos, un solo dibujo), aunque la gráfica completa cueste 0,23 ms. Más dos errores de verdad: `create_line` con un solo punto es un `TclError`, y un lienzo más pequeño que sus márgenes no se puede dibujar. Del cierre, lo que se olvida siempre: **`forget()` no apaga nada**, el frame sigue vivo y su `after` sigue corriendo (medido: sigue ticando tras `forget()` y para tras `destroy()`), un hilo `daemon` **se corta a mitad** al salir, y las preferencias se guardan en `WM_DELETE_WINDOW`, que es donde todavía se puede leer la geometría.

> [!ejercicio] Practica
>
> 1. Escribe los dos ficheros y ejecútalo. Apunta el panel a una carpeta con cosas dentro y copia un fichero desde el explorador: el contador tiene que subir solo.
> 2. Pon el intervalo en «cada segundo», deja el panel un minuto y mira la gráfica. Después borra unos ficheros y mira otra vez.
> 3. Cambia a la serie «Tamaño» y comprueba que la escala pasa a KB o MB.
> 4. Redimensiona la ventana arrastrando una esquina. Después quita la amortiguación (dibuja directamente en `al_cambiar_tamano`) y repite: describe la diferencia.
> 5. Quita el `delete("all")` de `dibujar` y redimensiona. Añade un `print(len(self.lienzo.find_all()))` para ver cómo crece.
> 6. Quita la comprobación de `len(valores) < 2`, vacía el historial y cambia de pestaña. Copia el error.
> 7. Estrecha la ventana todo lo que deje el `minsize`. Después quita el `minsize` y sigue estrechando.
> 8. Busca duplicados en una carpeta grande y pulsa Cancelar. Mira cuántos ficheros había leído.
> 9. Quita el `if parar.is_set()` del bucle de `buscar_duplicados` y vuelve a pulsar Cancelar. Explica por qué el botón ya no hace nada.
> 10. Quita el `except` de `en_el_hilo`, haz que `buscar_duplicados` lance un error a propósito y observa que el botón se queda desactivado.
> 11. Haz que la vigilancia use `self.panel.after` en vez de `self.after`, cierra la ventana mientras vigila y copia lo que salga en la consola.
> 12. Añade un botón que haga `self.libro.forget(self.vigilancia)` y comprueba con un `print` en `medir` que sigue midiendo.
> 13. Arranca una búsqueda larga y cierra la ventana. Comprueba que aparece la confirmación y que al aceptar no queda nada corriendo.
> 14. Cambia `Historial(maximo=120)` a `maximo=20` y mira cómo la gráfica se convierte en una ventana deslizante.
> 15. Añade a la vigilancia la corrección de deriva y mide con `time.monotonic()` si el periodo real se acerca más al pedido.
> 16. Añade una cuarta pestaña con la lista de los diez ficheros más grandes, y decide si el cálculo va en `vigilancia.py` o en `panel.py`.
