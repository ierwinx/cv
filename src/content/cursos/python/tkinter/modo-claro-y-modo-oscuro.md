---
titulo: "Modo claro y modo oscuro"
resumen: "Saber en qué tema está el sistema sin preguntarle al sistema, enterarse de que ha cambiado, y repintar lo único que no se adapta solo: lo que has dibujado tú."
minutos: 35
orden: 50
---

Hay una pregunta que aparece la primera vez que alguien con el Mac en oscuro abre un programa tuyo: **por qué ese recuadro sigue siendo blanco**. El resto de la ventana se ha adaptado, los botones y las listas están oscuros, y en medio hay un rectángulo blanco con un gráfico que canta.

La respuesta es la mitad de esta lección, y es más tranquilizadora de lo que parece: **casi todo se adapta solo**. Los widgets `ttk` siguen al sistema porque los dibuja el sistema, y hasta los `tk` clásicos nacen con los colores del sistema. Lo único que no se adapta es lo que has puesto tú a mano: un `bg="white"`, un `fill="#555555"`, un color por etiqueta en un `Treeview`. El modo oscuro no es un problema de Tkinter, es la factura de haber escrito colores fijos.

La otra mitad es más incómoda. **Cuando el usuario cambia el tema con tu programa abierto, Tkinter no te avisa.** Se adapta lo que se adapta solo, y tu parte se queda como estaba, mezclada con la nueva. Verlo medido es lo que da sentido al diseño del programa de esta lección.

> [!objetivo] Qué vas a aprender
>
> Detectar el tema del sistema con código que funciona igual en los tres sistemas, enterarse de los cambios en caliente (que es lo que obliga a sondear), separar los colores en una paleta de **papeles** en vez de tonos, repintar lo que no se adapta solo, y ofrecer el selector de tres posiciones —Sistema, Claro, Oscuro— sabiendo lo que cuesta desobedecer al sistema.

## Cómo se sabe en qué tema está el sistema

Podría hacerse preguntándole al sistema operativo, y en macOS con PyObjC sale en dos líneas. Pero la solución que usa tu panel de control de referencia es mejor y es la que conviene aprender: **preguntarle a Tk qué color de fondo está usando** y mirar si es oscuro.

```consola
>>> estilo.lookup("TFrame", "background")
'systemWindowBackgroundColor'
>>> ventana.winfo_rgb("systemWindowBackgroundColor")
(7710, 7710, 7710)
```

Fíjate en las dos líneas, porque ahí está todo el mecanismo. Lo que devuelve el estilo **no es un color, es un nombre simbólico**: los que ya salieron en la lección 7. Y `winfo_rgb` lo resuelve al valor que tiene **en este instante**. Ese `7710` dividido por 257 es 30, un gris casi negro: el sistema está en oscuro.

Con eso, la función es la de la lección 7 sin cambiar una coma:

```python
def es_oscuro(ventana, color):
        """Decide si un color es oscuro por su luminancia percibida."""
    r, g, b = (canal / 257 for canal in ventana.winfo_rgb(color))
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128
```

Y la ventaja frente a preguntarle al sistema operativo es doble: **no hay código por plataforma** y no hace falta ninguna dependencia. En Windows y en Linux el nombre del color será otro, pero el fondo que reporte el tema seguirá siendo claro u oscuro, y la luminancia seguirá diciendo cuál.

### Dos nombres del sistema que no sirven

Los nombres simbólicos son cómodos, pero medidos uno a uno aparecen dos sorpresas. La primera, con el sistema en oscuro:

```consola
systemLabelColor               (255, 255, 255)
systemSecondaryLabelColor      (255, 255, 255)
systemTertiaryLabelColor       (255, 255, 255)
systemSeparatorColor           (255, 255, 255)
systemPlaceholderTextColor     (255, 255, 255)
```

Los cinco dan **exactamente el mismo blanco**. En macOS esos colores son blancos con distinta transparencia, y por eso se ven como grises de distinta intensidad sobre el fondo; al pasar por Tk **se pierde el canal alfa** y quedan todos iguales. Así que `systemSecondaryLabelColor` no vale para el texto secundario: si lo usas, tu texto tenue se ve igual que el principal. El gris tenue hay que ponerlo tú, y por eso la paleta del programa tiene un papel `tenue`.

La segunda sorpresa es para quien venga de Windows:

```consola
SystemButtonFace     (239, 239, 239) oscuro=False
```

Existe en macOS, no da error, y **se queda en gris claro aunque el sistema esté en oscuro**. Un color que no falla pero miente es peor que uno que falla.

## El sistema cambia y nadie te avisa

Este es el dato central de la lección, y para medirlo hay que cambiar de verdad el tema del Mac mientras el programa corre. Con el `mainloop` andando, alternando el modo oscuro del sistema por fuera:

```consola
== antes de tocar nada ==
   {'rgb': (30, 30, 30), 'lum': 30.0, 'oscuro': True, 'texto': (255, 255, 255)}

== se cambia el sistema al modo contrario ==
  Tk ve: {'rgb': (255, 255, 255), 'lum': 255.0, 'oscuro': False,
          'texto': (0, 0, 0)}
  eventos <<ThemeChanged>> recibidos: []
  tema en uso sigue siendo: aqua
```

Dos noticias, una buena y una mala.

La buena: **Tk se enteró solo**. Sin reiniciar, sin `theme_use`, sin tocar nada, el mismo nombre simbólico pasó de valer 30 a valer 255. Los widgets `ttk` se repintaron, y los `tk` también, porque sus colores por omisión son nombres del sistema (`systemWindowBackgroundColor` en un `Frame`, `systemTextBackgroundColor` en un `Text`).

La mala: **cero eventos**. No llegó nada. Tu programa no tuvo ninguna oportunidad de repintar su gráfico.

### `<<ThemeChanged>>` no es lo que parece

Ese evento existe, y es fácil creer que sirve para esto. Medido, cuándo se dispara de verdad:

```consola
  a) al cambiar el tema del SISTEMA:     eventos: NINGUNO
  b) al llamar a theme_use por codigo:   eventos: 15
  c) al llamar a Style.configure:        eventos: 15
```

O sea que `<<ThemeChanged>>` significa «alguien ha cambiado el estilo **desde el código**», y se emite a cada widget de la ventana por separado, de ahí los 15. Sirve para que un widget propio se repinte cuando cambias la paleta, y **no sirve para enterarse del sistema**, que es justo lo que uno quería.

Y si lo usas para eso, cuidado con la realimentación: un manejador de `<<ThemeChanged>>` que llame a `Style.configure` provoca una segunda ronda de eventos. Medido no hay bucle infinito, porque Tcl no reentra en medio del reparto, pero sí llegan más avisos que widgets (9 para 5 widgets atados), así que ese manejador tiene que ser corto e idempotente.

### Entonces se sondea, y es gratis

No queda otra que preguntar cada cierto tiempo. La objeción evidente es el coste, así que se mide:

```consola
  1000 consultas (lookup + winfo_rgb + luminancia): 5.1 ms
```

**Cinco microsegundos por consulta.** Preguntarlo una vez por segundo con `after` cuesta cinco millonésimas de segundo por segundo, que es literalmente nada, y encima es la técnica del reloj de la lección 42, ya conocida. Con eso el programa detecta el cambio en menos de un segundo y repinta su parte.

> [!consejo] Consejo
>
> El `after` de la vigilancia hay que **cancelarlo al cerrar**. Es el hallazgo del bloque E otra vez: un `after` encadenado que se reprograma solo sigue vivo mientras exista la ventana, y si se destruye en medio, el siguiente ciclo intenta trabajar sobre algo que ya no está. De ahí el `parar()` del ejemplo, llamado desde el `WM_DELETE_WINDOW`.

## Forzar el modo, y lo que cuesta desobedecer

Un selector de tres posiciones —Sistema, Claro, Oscuro— es lo que trae cualquier aplicación de verdad, y «Sistema» tiene que ser la opción por omisión, porque respeta lo que el usuario ya eligió para toda su máquina.

Lo que no es evidente es que **forzar el tema contrario al del sistema no se puede hacer con el tema nativo**. Se intenta y no da error, que es lo que engaña:

```consola
>>> estilo.configure("TLabel", background="#202020")
>>> estilo.lookup("TLabel", "background")
'#202020'                      # dice que sí...
```

El estilo guarda el color, pero en `aqua` el widget lo dibuja el sistema, así que en la ventana no cambia nada. Es el aviso de la lección 6 —`aqua` ignora buena parte de la personalización— y aquí choca de frente: **con el tema nativo no puedes pintar tu ventana al revés de como está el sistema.**

La salida es cambiarse a `clam`, que sí obedece:

```consola
>>> estilo.theme_use("clam")
>>> estilo.configure(".", background="#1E1E1E", foreground="#E8E8E8")
  TFrame     bg='#1E1E1E'   fg='#E8E8E8'
  TLabel     bg='#1E1E1E'   fg='#E8E8E8'
  TButton    bg='#1E1E1E'   fg='#E8E8E8'
```

El precio es que se deja de parecer nativo: bordes cuadrados y sin el azul de acento del sistema. De ahí la decisión del programa, que es la parte de diseño que merece la pena entender: **mientras se pida lo mismo que da el sistema se usa el tema nativo, y solo al pedir lo contrario se cambia a `clam`**. Así el caso normal —que es «Sistema», y también «Oscuro» cuando el sistema ya está oscuro— se ve perfecto, y la fealdad se paga solo cuando el usuario pide explícitamente algo que el sistema no da.

### Tres cosas que `clam` no hace por sí solo

Configurar el estilo raíz `.` parece que lo arregla todo, y casi. Medido, después de ponerle el fondo oscuro, esto sigue con su color de fábrica:

```consola
    TNotebook.Tab        background       #bab5ab
    Treeview             background       #ffffff
    TProgressbar         background       #dcdad5
```

Esas tres traen un color propio que el `.` no pisa, así que hay que nombrarlas una por una. Un `Treeview` blanco en una ventana oscura es exactamente el rectángulo blanco del principio de la lección.

La segunda es que **`configure` no toca los colores de estado**. Los de pulsado, activo y seleccionado viven en `map`, que es otra tabla:

```consola
>>> estilo.map("Treeview", "background")
[('disabled', '#dcdad5'), ('background', '#9e9a91'), ('selected', '#4a6984')]
```

Si no se rehace el `map`, la fila seleccionada del `Treeview` se queda con el azul grisáceo de `clam` sobre tu paleta oscura.

Y la tercera es la más fácil de no ver: **cada tema de ttk guarda sus propios estilos**.

```consola
>>> estilo.theme_use("aqua"); estilo.configure("Mio.TLabel", foreground="#FF0000")
>>> estilo.lookup("Mio.TLabel", "foreground")
'#FF0000'
>>> estilo.theme_use("clam")
>>> estilo.lookup("Mio.TLabel", "foreground")
'#E8E8E8'                      # en clam ese estilo no existe
>>> estilo.theme_use("aqua")
>>> estilo.lookup("Mio.TLabel", "foreground")
'#FF0000'                      # y al volver sigue ahí
```

No se borran, están guardados por tema. Pero el efecto práctico es el mismo: **después de cada `theme_use` hay que volver a declarar tus estilos propios**, o aparecen con el aspecto de serie. Por eso en el programa el método que los define se llama en cada repintado y no una vez al arrancar.

## Lo que hay que repintar a mano

La buena noticia de antes tiene su letra pequeña. `Style.configure` **sí afecta a los widgets que ya existen**, comprobado, así que cambiar de tema no obliga a reconstruir la ventana ni a cerrar el programa. Lo que no se actualiza solo es esto, y es la lista completa:

**Los widgets `tk` a los que les hayas puesto color.** Se repintan uno a uno con `configure`. El `Text` necesita además `insertbackground`, o el cursor de escritura se queda negro sobre fondo negro y parece que no hay cursor.

**Lo dibujado en un `Canvas`.** Un item guarda el color con el que nació:

```consola
>>> pieza = lienzo.create_text(30, 15, text="dato", fill="#000000")
>>> lienzo.itemcget(pieza, "fill")
'#000000'                       # sigue negro aunque el tema haya cambiado
```

Hay dos salidas. Una es `itemconfigure` item por item, que para un gráfico entero sale peor que redibujarlo. La otra es pasarle un nombre del sistema al crearlo, y entonces sí sigue al tema solo:

```consola
>>> otro = lienzo.create_text(30, 25, text="dato", fill="systemTextColor")
>>> tuple(c // 257 for c in v.winfo_rgb(lienzo.itemcget(otro, "fill")))
(255, 255, 255)                 # blanco ahora, negro en modo claro
```

Y aquí está el fallo que comenta el `app.py` de referencia, que ahora se entiende del todo. Un `Canvas` creado con `bg="white"` y un texto sin `fill`:

```consola
  fondo puesto a mano: 'white'          -> (255, 255, 255)
  texto sin fill:      'systemTextColor' -> (255, 255, 255)
```

**Fondo blanco fijo con texto blanco del sistema: invisible.** El color que pusiste tú no se movió y el que no pusiste sí, y la combinación desaparece. Es el peor caso posible, porque en modo claro se ve perfecto y el error solo aparece en la máquina de otra persona.

**Las etiquetas del `Treeview`.** Un `tag_configure("flojo", foreground="#C62828")` guarda ese rojo para siempre; hay que volver a declararlas con la paleta nueva. También aceptan nombres del sistema, y entonces siguen al tema.

> [!nota] Papeles, no colores
>
> La paleta del programa no se llama «gris claro» ni «azul»: se llama `fondo`, `superficie`, `texto`, `tenue`, `borde`, `acento`, `sobre_acento`, `aviso` y `bien`. Es la regla de la paleta corta de la lección 7 llevada al final, y es lo que hace posible el modo oscuro: el resto del programa pide `tema.color("tenue")` y nunca un `#6E6E73`, así que **las dos paletas tienen que definir los mismos papeles** y ningún sitio elige tonos. Una comprobación de una línea que vale la pena en las pruebas: que los dos diccionarios tengan el mismo juego de claves.

## El programa

Dos ficheros, y uno de ellos rompe una regla del módulo a propósito. `tema.py` **sí importa `tkinter`**, al contrario que el `avisos.py` de la lección anterior, y es lo correcto: un tema es apariencia, no lógica. Lo que se separa aquí no es la lógica de la interfaz, es **la paleta del resto del programa**, para que ninguna ventana vuelva a escribir un gris suelto.

La ventana de ejemplo tiene a propósito las tres cosas que dan problemas: un `Canvas` dibujado a mano, un `Text` y un `Treeview` con colores por etiqueta.

```python title="tema.py"
"""El tema claro y oscuro: detectarlo, aplicarlo y vigilar si cambia.

Este módulo sí importa tkinter, al contrario que `avisos.py` de la lección
anterior, y con razón: un tema es apariencia, no lógica. Lo que se separa
aquí no es «lógica de interfaz» sino **los colores del resto del programa**,
para que ninguna ventana escriba un `#555555` suelto.
"""

import tkinter as tk
from tkinter import ttk

# Los papeles, no los colores. El resto del programa pide `tema.color("tenue")`
# y nunca un gris concreto, que es la regla de la paleta corta de la lección 7
# llevada a sus últimas consecuencias.
PALETAS = {
    "claro": {
        "fondo": "#FFFFFF", "superficie": "#F2F2F7", "campo": "#FFFFFF",
        "texto": "#1C1C1E", "tenue": "#6E6E73", "borde": "#D1D1D6",
        "acento": "#2F7BD6", "sobre_acento": "#FFFFFF",
        "aviso": "#C62828", "bien": "#2E7D32",
        "trama": ("#A8D8EA", "#7FB8CE"),
    },
    "oscuro": {
        "fondo": "#1E1E1E", "superficie": "#2C2C2E", "campo": "#2A2A2A",
        "texto": "#E8E8E8", "tenue": "#9A9A9A", "borde": "#3A3A3C",
        "acento": "#4C9AFF", "sobre_acento": "#FFFFFF",
        "aviso": "#FF6B6B", "bien": "#6BCB77",
        "trama": ("#2F5D6E", "#4E8FA6"),
    },
}

MODOS = ("sistema", "claro", "oscuro")
CADA_CUANTO = 1000      # sondear una vez por segundo: medido, 5 µs por vuelta


def es_oscuro(ventana, color):
        """Decide si un color es oscuro por su luminancia percibida.

    Es la función de la lección 7, y sigue siendo la mejor forma de saber el
    tema: funciona igual en los tres sistemas y no necesita PyObjC.
    """
    r, g, b = (canal / 257 for canal in ventana.winfo_rgb(color))
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128


class Tema:
        """Decide qué paleta toca, la aplica y avisa cuando el sistema cambia."""

    def __init__(self, ventana, modo="sistema", al_cambiar=None):
                if modo not in MODOS:
                        raise ValueError(f"modo debe ser uno de {MODOS}, no {modo!r}")
        self.ventana = ventana
        self.modo = modo
        self.al_cambiar = al_cambiar
        self.estilo = ttk.Style(ventana)
        self.nativo = self.estilo.theme_use()   # 'aqua', 'vista' o 'default'
        self.vigilancia = None
        self.ultimo_del_sistema = self.del_sistema()

    # --- qué tema toca

    def del_sistema(self):
                """Lo que el sistema está usando ahora mismo, según Tk.

        El fondo que reporta el tema no es un color sino un nombre simbólico
        (`systemWindowBackgroundColor` en macOS), y `winfo_rgb` lo resuelve al
        valor de este instante. Por eso esto se entera de los cambios.
        """
        fondo = self.estilo.lookup("TFrame", "background") or "#FFFFFF"
        try:
                        return "oscuro" if es_oscuro(self.ventana, fondo) else "claro"
        except tk.TclError:
                        return "claro"          # un tema raro sin fondo reconocible

    @property
    def efectivo(self):
                """La paleta que hay que pintar."""
        return self.del_sistema() if self.modo == "sistema" else self.modo

    @property
    def paleta(self):
                return PALETAS[self.efectivo]

    def color(self, papel):
                return self.paleta[papel]

    # --- aplicarlo

    def aplicar(self):
                """Pone el tema de ttk y los colores. Devuelve el tema ttk elegido.

        La decisión importante: mientras se pida lo mismo que da el sistema se
        usa el tema nativo, que es el que se ve bien de verdad. Para pintar lo
        contrario no hay más remedio que salir del tema nativo, porque `aqua`
        deja configurar los colores y luego los ignora al dibujar.
        """
        if self.efectivo == self.del_sistema():
                        eleccion = self.nativo
        else:
                        eleccion = "clam"       # el tema obediente
        if self.estilo.theme_use() != eleccion:
                        self.estilo.theme_use(eleccion)
        if eleccion != self.nativo:
                        self._pintar_ttk()
        self._estilos_propios()
        return eleccion

    def _pintar_ttk(self):
                p = self.paleta
        self.estilo.configure(
            ".", background=p["fondo"], foreground=p["texto"],
            fieldbackground=p["campo"], troughcolor=p["campo"],
            bordercolor=p["borde"], darkcolor=p["fondo"],
            lightcolor=p["fondo"], insertcolor=p["texto"],
            selectbackground=p["acento"], selectforeground=p["sobre_acento"])
        # Medido: el estilo raíz «.» no llega a estas tres, que traen su
        # propio color, así que hay que nombrarlas una por una.
        self.estilo.configure("Treeview", background=p["campo"],
                              fieldbackground=p["campo"])
        self.estilo.configure("Treeview.Heading", background=p["superficie"])
        self.estilo.configure("TNotebook.Tab", background=p["superficie"])
        self.estilo.configure("TProgressbar", background=p["acento"])
        # Y `configure` no toca los colores de estado: eso vive en `map`.
        self.estilo.map("Treeview", background=[("selected", p["acento"])],
                        foreground=[("selected", p["sobre_acento"])])
        self.estilo.map("TNotebook.Tab", background=[("selected", p["fondo"])])
        self.estilo.map("TButton",
                        background=[("pressed", p["borde"]),
                                    ("active", p["superficie"])])

    def _estilos_propios(self):
                """Se rehacen siempre, y esto no es por gusto.

        Medido: cada tema de ttk guarda sus propios estilos. Tras un
        `theme_use` los estilos definidos en el tema anterior no están, así
        que si no se vuelven a configurar aparecen con el aspecto de serie.
        """
        p = self.paleta
        self.estilo.configure("Titulo.TLabel", font=("Helvetica", 16, "bold"),
                              foreground=p["texto"])
        self.estilo.configure("Tenue.TLabel", foreground=p["tenue"])
        self.estilo.configure("Aviso.TLabel", foreground=p["aviso"])
        self.estilo.configure("Bien.TLabel", foreground=p["bien"])

    def pintar_clasico(self, widget):
                """Los widgets `tk` hay que repintarlos uno a uno.

        No siguen al estilo, así que el programa recorre los que tiene. El
        `Text` necesita además `insertbackground`, o el cursor de escritura se
        queda negro sobre fondo negro y parece que no hay cursor.
        """
        p = self.paleta
        clase = widget.winfo_class()
        if clase == "Canvas":
                        widget.configure(background=p["fondo"],
                             highlightbackground=p["borde"])
        elif clase in ("Text", "Listbox"):
                        widget.configure(background=p["campo"], foreground=p["texto"],
                             highlightbackground=p["borde"],
                             selectbackground=p["acento"],
                             selectforeground=p["sobre_acento"])
            if clase == "Text":
                                widget.configure(insertbackground=p["texto"])
        else:
                        widget.configure(background=p["fondo"])

    # --- enterarse de los cambios

    def vigilar(self):
                """Sondea el tema del sistema y avisa cuando cambia.

        Hace falta sondear porque **Tk no emite ningún evento** cuando el
        usuario cambia el tema del sistema: `<<ThemeChanged>>` solo se dispara
        cuando lo cambias tú con `theme_use`. Medido: 5 µs por consulta, así
        que una vez por segundo no se nota.
        """
        ahora = self.del_sistema()
        if ahora != self.ultimo_del_sistema:
                        self.ultimo_del_sistema = ahora
            if self.al_cambiar is not None:
                                self.al_cambiar(ahora)
        self.vigilancia = self.ventana.after(CADA_CUANTO, self.vigilar)

    def parar(self):
                if self.vigilancia is not None:
                        self.ventana.after_cancel(self.vigilancia)
            self.vigilancia = None

    def cambiar_modo(self, modo):
                if modo not in MODOS:
                        raise ValueError(f"modo desconocido: {modo!r}")
        if modo == self.modo:
                        return False
        self.modo = modo
        return True
```

```python title="panel_tema.py"
"""Una ventana que cambia de claro a oscuro sin reconstruirse.

Tiene a propósito las tres cosas que dan problemas: un Canvas dibujado a
mano, un Text, y un Treeview con colores por etiqueta.
"""

import tkinter as tk
from tkinter import ttk

import tema

VENTAS = [("Ene", 45), ("Feb", 62), ("Mar", 38), ("Abr", 79), ("May", 55),
          ("Jun", 88)]
EQUIPO = [("1024", "Ana Ruiz", "iOS", 92), ("1025", "Luis Mena", "QA", 61),
          ("1026", "Sara Vidal", "Backend", 78), ("1027", "Iker Paz", "QA", 44)]


class Aplicacion(tk.Tk):

        def __init__(self):
                super().__init__()
        self.title("Claro y oscuro")
        self.geometry("880x600")
        self.minsize(760, 520)

        self.modo = tk.StringVar(value="sistema")
        self.estado = tk.StringVar(value="Listo")
        # El tema se crea antes que los widgets porque el primer `aplicar`
        # tiene que pasar antes de dibujar, o se ve el cambio de golpe.
        self.tema = tema.Tema(self, modo="sistema",
                              al_cambiar=self.cambio_del_sistema)
        self.clasicos = []      # los widgets tk que hay que repintar a mano

        self.crear_barra()
        cuerpo = ttk.Frame(self, padding=12)
        cuerpo.pack(fill="both", expand=True)
        self.crear_grafico(cuerpo)
        self.crear_lista(cuerpo)
        self.crear_notas(cuerpo)
        self.pie = ttk.Label(self, textvariable=self.estado,
                             style="Tenue.TLabel", anchor="w",
                             padding=(12, 6))
        self.pie.pack(fill="x")

        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)
        self.repintar()
        self.tema.vigilar()

    # --- construcción

    def crear_barra(self):
                barra = ttk.Frame(self, padding=(12, 10, 12, 0))
        barra.pack(fill="x")
        ttk.Label(barra, text="Apariencia",
                  style="Titulo.TLabel").pack(side="left")
        grupo = ttk.Frame(barra)
        grupo.pack(side="right")
        # Tres posiciones, como cualquier aplicación de verdad: «Sistema» es
        # la opción por omisión porque es la que respeta lo que el usuario ya
        # eligió para toda su máquina.
        for texto, valor in (("Sistema", "sistema"), ("Claro", "claro"),
                             ("Oscuro", "oscuro")):
                        ttk.Radiobutton(grupo, text=texto, value=valor,
                            variable=self.modo,
                            command=self.cambiar_modo).pack(side="left",
                                                            padx=4)
        self.detalle = ttk.Label(barra, style="Tenue.TLabel")
        self.detalle.pack(side="right", padx=(0, 16))

    def crear_grafico(self, padre):
                marco = ttk.Labelframe(padre, text="Ventas", padding=10)
        marco.pack(side="left", fill="both", expand=True, padx=(0, 12))
        self.lienzo = tk.Canvas(marco, width=300, height=220,
                                highlightthickness=1)
        self.lienzo.pack(fill="both", expand=True)
        self.clasicos.append(self.lienzo)
        # Redibujar al cambiar de tamaño, con el rebote de la lección 48.
        self.pendiente = None
        self.lienzo.bind("<Configure>", self.lienzo_redimensionado)

    def crear_lista(self, padre):
                marco = ttk.Labelframe(padre, text="Equipo", padding=10)
        marco.pack(side="left", fill="both", expand=True)
        columnas = ("id", "nombre", "area", "nota")
        self.arbol = ttk.Treeview(marco, columns=columnas, show="headings",
                                  height=8)
        for columna, titulo, ancho in (("id", "Id", 50),
                                       ("nombre", "Nombre", 130),
                                       ("area", "Área", 80),
                                       ("nota", "Nota", 50)):
                        self.arbol.heading(columna, text=titulo, anchor="w")
            self.arbol.column(columna, width=ancho, anchor="w")
        self.arbol.pack(fill="both", expand=True)
        for identificador, nombre, area, nota in EQUIPO:
                        self.arbol.insert("", "end", iid=identificador,
                              values=(identificador, nombre, area, nota),
                              tags=("flojo" if nota < 70 else "bueno",))

    def crear_notas(self, padre):
                marco = ttk.Labelframe(padre, text="Notas", padding=10)
        marco.pack(side="left", fill="both", padx=(12, 0))
        self.notas = tk.Text(marco, width=26, height=8, wrap="word",
                             highlightthickness=1)
        self.notas.insert("1.0", "Escribe aquí y mira el cursor al cambiar "
                                 "de tema: si no se repinta, desaparece.")
        self.notas.pack(fill="both", expand=True)
        self.clasicos.append(self.notas)

    # --- el tema

    def cambiar_modo(self):
                if self.tema.cambiar_modo(self.modo.get()):
                        self.repintar()
            self.decir(f"Apariencia: {self.modo.get()}")

    def cambio_del_sistema(self, nuevo):
                """La llama la vigilancia cuando el sistema pasa de claro a oscuro."""
        self.repintar()
        self.decir(f"El sistema ha cambiado a {nuevo}")

    def repintar(self):
                """Un solo sitio que aplica el tema a todo. Se puede llamar mil veces.

        Medido: `Style.configure` afecta a los widgets que ya existen, así que
        no hay que reconstruir nada. Lo que no se actualiza solo son los
        widgets `tk` y lo dibujado en el Canvas.
        """
        elegido = self.tema.aplicar()
        for widget in self.clasicos:
                        self.tema.pintar_clasico(widget)
        # Las etiquetas del Treeview guardan el color con el que se crearon,
        # así que se vuelven a declarar con la paleta nueva.
        self.arbol.tag_configure("flojo", foreground=self.tema.color("aviso"))
        self.arbol.tag_configure("bueno", foreground=self.tema.color("bien"))
        self.dibujar_grafico()
        self.detalle.configure(
            text=f"{self.tema.efectivo} · sistema: {self.tema.del_sistema()}"
                 f" · ttk: {elegido}")

    def lienzo_redimensionado(self, evento=None):
                if self.pendiente is not None:
                        self.after_cancel(self.pendiente)
        self.pendiente = self.after(80, self.dibujar_grafico)

    def dibujar_grafico(self):
                """Todo lo dibujado a mano se rehace con los colores de ahora.

        Un `create_text` guarda el color con el que nació, así que la única
        forma de que un gráfico siga al tema es volver a pintarlo (o tocarlo
        con `itemconfigure`, que para un gráfico entero sale peor).
        """
        self.pendiente = None
        c = self.lienzo
        c.delete("all")
        ancho, alto = c.winfo_width(), c.winfo_height()
        if ancho <= 1:              # todavía sin medir, como en la lección 48
                        return
        texto = self.tema.color("texto")
        tenue = self.tema.color("tenue")
        relleno, borde = self.tema.color("trama")

        margen, base = 30, alto - 30
        c.create_text(ancho / 2, 14, text="Ventas por mes", fill=texto,
                      font=("Helvetica", 12, "bold"))
        c.create_line(margen, base, ancho - margen, base, fill=tenue)
        maximo = max(v for _, v in VENTAS)
        hueco = (ancho - margen * 2) / (len(VENTAS) * 2)
        for i, (mes, valor) in enumerate(VENTAS):
                        x = margen + hueco + i * hueco * 2
            altura = (valor / maximo) * (base - 50)
            c.create_rectangle(x - hueco / 2, base - altura, x + hueco / 2,
                               base, fill=relleno, outline=borde, width=2)
            c.create_text(x, base + 12, text=mes, fill=tenue,
                          font=("Helvetica", 9))
            c.create_text(x, base - altura - 9, text=str(valor), fill=texto,
                          font=("Helvetica", 9, "bold"))

    def decir(self, mensaje):
                self.estado.set(mensaje)

    def al_cerrar(self):
                self.tema.parar()       # si no, queda un after vivo al destruir
        self.destroy()


def main():
        Aplicacion().mainloop()


if __name__ == "__main__":
        main()
```

> [!resumen] En resumen
>
> El modo oscuro no es un problema de Tkinter sino **la factura de haber escrito colores fijos**: los `ttk` siguen al sistema porque los dibuja el sistema, y hasta los `tk` nacen con nombres del sistema (`systemWindowBackgroundColor` en un `Frame`, `systemTextBackgroundColor` en un `Text`), así que lo único que se queda anticuado es lo que pusiste tú. Para saber en qué tema estás, lo mejor es **no preguntarle al sistema operativo**: `estilo.lookup("TFrame", "background")` devuelve **un nombre simbólico, no un color**, y `winfo_rgb` lo resuelve al valor de este instante, así que la `es_oscuro` de la lección 7 sirve igual en los tres sistemas y sin dependencias. Dos nombres del sistema no valen: los que macOS define con transparencia (`systemSecondaryLabelColor`, `systemSeparatorColor`, `systemPlaceholderTextColor`) **pierden el alfa y salen idénticos al principal**, los cinco el mismo blanco, así que el gris tenue lo pones tú; y `SystemButtonFace` existe en macOS, no da error y **se queda en gris claro** con el sistema en oscuro. El dato central, medido cambiando el tema del Mac con el `mainloop` corriendo: **Tk se entera solo** (el mismo nombre pasó de 30 a 255 sin reiniciar) pero **no emite ningún evento**, cero. `<<ThemeChanged>>` engaña, porque significa «el estilo ha cambiado desde el código»: ninguno al cambiar el sistema, 15 al llamar a `theme_use` y 15 más a cada `Style.configure`, uno por widget; sirve para que un widget propio se repinte y no para detectar, y un manejador que configure estilos provoca otra ronda (9 avisos para 5 widgets), así que corto e idempotente. La solución es sondear con `after`, y es gratis: **5 µs por consulta**, con `parar()` en el cierre para no dejar el ciclo vivo. Sobre forzar el modo: con el tema nativo **no se puede pintar al revés del sistema**, porque `aqua` guarda el color que le configuras (`lookup` lo confirma) y luego lo ignora al dibujar; solo `clam` obedece, a cambio de dejar de parecer nativo, y de ahí el diseño del ejemplo, **nativo mientras se pida lo que da el sistema y `clam` solo al pedir lo contrario**. En `clam` hay tres trampas medidas: el estilo raíz `.` **no llega a `TNotebook.Tab`, `Treeview` ni `TProgressbar`**, que traen color propio y hay que nombrar una a una (un `Treeview` blanco en ventana oscura es el rectángulo que canta); `configure` **no toca los colores de estado**, que viven en `map` (el `selected` del `Treeview` se queda con el azul de `clam`); y **cada tema guarda sus propios estilos**, así que tras cada `theme_use` hay que volver a declarar los tuyos o salen con el aspecto de serie. Lo que sí es cómodo: `Style.configure` **afecta a los widgets ya creados**, así que cambiar de tema no obliga a reconstruir la ventana. Y lo que hay que repintar a mano es exactamente esto: los widgets `tk` con color (el `Text` necesita además **`insertbackground`** o el cursor se queda negro sobre negro), lo dibujado en el `Canvas` (un item **guarda el color con el que nació**, y se arregla redibujando o creándolo con un nombre del sistema) y las etiquetas del `Treeview`. El peor caso, que es el de la app de referencia: `Canvas` con `bg="white"` fijo y texto sin `fill`, que hereda `systemTextColor`; **blanco sobre blanco, invisible**, y en modo claro se ve perfecto, así que el error solo aparece en la máquina de otra persona. Todo esto solo es manejable con una paleta de **papeles y no de tonos** (`fondo`, `texto`, `tenue`, `acento`…), con los dos diccionarios definiendo las mismas claves.

> [!ejercicio] Practica
>
> 1. Escribe los dos ficheros y ejecútalo. Cambia el tema de tu sistema con la ventana abierta y mira cuánto tarda en repintarse.
> 2. Comprueba la línea de detalle de la barra: qué paleta está en uso, en qué está el sistema y qué tema de ttk se ha elegido. Pulsa las tres posiciones del selector y apunta cómo cambia.
> 3. Fuerza el modo contrario al de tu sistema y mira los bordes de los botones. Explica por qué han cambiado de forma.
> 4. Comenta la llamada a `self.tema.vigilar()`, cambia el tema del sistema y describe qué parte de la ventana se adapta y qué parte no.
> 5. Cambia `CADA_CUANTO` a 10000 y repite. Después a 50 y mira si se nota en el consumo.
> 6. Quita el `parar()` del cierre, abre y cierra la ventana varias veces y observa la consola.
> 7. Crea el `Canvas` con `bg="white"` fijo, pon tu sistema en oscuro y busca el texto del gráfico.
> 8. Dibuja el título del gráfico con `fill="systemTextColor"` en vez de con la paleta, y comprueba que sobrevive a un cambio de sistema sin redibujar.
> 9. Quita del `repintar` las dos líneas que rehacen los `tag_configure` del `Treeview`, fuerza el modo contrario y mira los colores de las notas.
> 10. Quita el `insertbackground` de `pintar_clasico`, ponte en oscuro y escribe en las notas buscando el cursor.
> 11. Quita del `_pintar_ttk` la línea que configura `Treeview` y fuerza el modo oscuro con `clam`. Aparecerá el rectángulo blanco del principio de la lección.
> 12. Quita los tres `map` y fija el modo forzado. Selecciona una fila del `Treeview` y una pestaña, y describe los colores que salen.
> 13. Quita la llamada a `_estilos_propios` del `aplicar` y déjala solo en el `__init__`. Cambia entre Sistema y el modo contrario, y mira el título y el pie.
> 14. Añade un papel nuevo a la paleta, `resaltado`, úsalo en el gráfico para la barra más alta, y comprueba que la prueba de «mismos papeles en las dos paletas» sigue pasando.
> 15. Imprime `winfo_rgb` de `systemLabelColor` y `systemSecondaryLabelColor` en los dos modos y comprueba que dan lo mismo.
> 16. Añade un tercer modo, `alto contraste`, con una paleta de negro puro y blanco puro, y compruébalo con el mismo selector.
> 17. Guarda el modo elegido entre sesiones con lo de la lección 43, y comprueba que al arrancar ya está aplicado antes de que la ventana se vea.
> 18. Ata un manejador a `<<ThemeChanged>>` que imprima algo y cuenta cuántas veces se llama al pulsar una posición del selector. Explica el número.
> 19. Aplica el tema al editor de texto de la lección 46: tiene un `Text` grande y una barra de estado.
> 20. Y al panel de control de la lección 48, que es el caso difícil porque su `Canvas` se redibuja solo al cambiar de tamaño.
