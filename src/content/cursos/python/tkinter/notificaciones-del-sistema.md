---
titulo: "Notificaciones del sistema, el badge y la bandeja"
resumen: "Avisar al usuario cuando la ventana no está delante: la bandeja que siempre funciona, el globo rojo con la cuenta, y cómo saber cuál de los avisos ha pulsado."
minutos: 40
orden: 49
---

Hasta aquí, cuando el programa tenía algo que decir lo decía en la barra de estado o en un `messagebox`. Las dos cosas exigen que el usuario esté mirando la ventana, y hay un caso donde eso no se cumple: **el trabajo largo de la lección 42**. Lanzas el análisis, te vas a otra aplicación, y cuando termina nadie se entera.

Eso es lo que resuelve una notificación: un aviso que aparece **aunque tu ventana no esté delante**, con un contador que dice cuántos hay sin leer y, si el sistema colabora, la posibilidad de saber cuál ha pulsado el usuario para llevarlo justo a esa parte del programa.

Conviene aclarar el nombre. Lo que en el móvil se llama *push* es otra cosa: un servidor que empuja un mensaje hacia un dispositivo que no ha pedido nada. Eso necesita un servicio de Apple o de Google y una cuenta de desarrollador, y no es de lo que va esta lección. Aquí el que avisa es **tu propio programa**, a la máquina donde está corriendo. Mecánicamente es idéntico desde el punto de vista del usuario, y es lo que necesita una aplicación de escritorio.

> [!objetivo] Qué vas a aprender
>
> Montar un sistema de avisos completo en tres capas: **la bandeja dentro de la ventana** con su contador y sus avisos flotantes, que funciona en los tres sistemas; **el aviso del sistema operativo** por el camino que no necesita instalar nada; y **el Centro de Notificaciones de macOS**, que es el único que sabe decirte qué aviso ha pulsado el usuario. Y saber exactamente qué exige cada capa, porque la tercera tiene un requisito que sorprende.

## Tres caminos, y lo que cuesta cada uno

Esta es la tabla que hay que tener clara antes de escribir una línea, porque la elección no es de gusto: cada camino puede hacer unas cosas y no otras.

|  | Bandeja en la ventana | `osascript` | Centro de Notificaciones |
| --- | --- | --- | --- |
| Dónde funciona | Los tres sistemas | Solo macOS | Solo macOS |
| Qué hay que instalar | Nada | Nada | `pyobjc-framework-UserNotifications` |
| Se ve con la ventana detrás | No | Sí | Sí |
| ¿Sabes si lo pulsó? | Sí | **No** | Sí, con el identificador |
| Botones en el aviso | Los que dibujes | No | Sí |
| Requisito incómodo | — | — | **Tiene que ser un `.app` empaquetado** |

De ahí sale el diseño del programa de esta lección: **la bandeja es la base y no una alternativa**. Se construye primero, funciona en todas partes, y el aviso del sistema es una capa encima que puede estar o no estar. Es el mismo criterio de la dependencia opcional de la lección 44 con Pillow, pero aplicado a algo más gordo: aquí lo opcional es el sistema operativo entero.

## La capa que siempre funciona: la bandeja

Tres piezas: la lista de lo que ha llegado, el contador de lo que falta por leer, y el aviso flotante que aparece un momento en una esquina.

### El contador no puede cambiar de tamaño

La forma obvia de mostrar la cuenta es ponerla en el texto de un botón, y es la forma equivocada. Medido, con el mismo botón:

```consola
  0 sin leer -> 'Avisos'       | ancho  80 px
  1 sin leer -> 'Avisos (1)'   | ancho 100 px
  9 sin leer -> 'Avisos (9)'   | ancho 102 px
 12 sin leer -> 'Avisos (12)'  | ancho 107 px
105 sin leer -> 'Avisos (105)' | ancho 116 px
```

El botón crece con el número, y al crecer **empuja a todo lo que tenga al lado**: la barra de herramientas se mueve sola mientras el usuario intenta pulsar algo. Por eso el contador de este programa es un `Canvas` de 24×24 con un círculo y un número dentro, que es el mismo truco que usa cualquier móvil:

```consola
  0 -> 0 items []      | mide 24x24
  1 -> 2 items ['1']   | mide 24x24
 27 -> 2 items ['27']  | mide 24x24
142 -> 2 items ['99+'] | mide 24x24
```

El tamaño no cambia nunca, y pasado el 99 se enseña `99+`, porque a partir de ahí el número exacto no le importa a nadie y sí importa que la pastilla no se deforme. Con cero avisos se dibuja **nada**, no un cero: un globo con un cero es ruido.

### El aviso flotante es una ventana sin barra de título

Un aviso que aparece en la esquina es un `Toplevel` al que se le quita el marco:

```consola
>>> aviso.overrideredirect()
None                      # antes de tocarlo
>>> aviso.overrideredirect(True)
>>> aviso.overrideredirect()
True
```

Fíjate en el detalle: **antes de fijarlo devuelve `None` y después un `bool`**, así que `if aviso.overrideredirect():` funciona por casualidad en los dos casos pero no es lo mismo preguntar antes que después.

Quitar el marco tiene una consecuencia que hay que asumir entera: **ya no hay nada que cierre la ventana**. No hay botón, no hay `WM_DELETE_WINDOW` que valga, no se puede arrastrar. Todo eso lo tienes que poner tú: colocarla a mano, cerrarla con un `after` y hacer que el clic haga algo.

Lo bueno es que el clic es más fácil de lo que parece, porque **el evento sube por la jerarquía**:

```consola
>>> aviso.bind("<Button-1>", manejador)     # solo en el Toplevel
>>> etiqueta.event_generate("<Button-1>")   # se pulsa un hijo
['Toplevel<-TLabel']                        # y el manejador se ejecuta
```

Basta atarlo al `Toplevel` y el `evento.widget` dice en qué hijo se pulsó de verdad. Lo que **no** se hereda es el cursor: si quieres que el puntero cambie a una mano para que se vea que es pulsable, hay que ponerlo widget a widget, porque una etiqueta nueva nace con el cursor vacío.

El temporizador de cierre va sobre la propia ventana del aviso y no sobre la principal. Comprobado que es el hallazgo del bloque E otra vez:

```consola
>>> otro.after(40, marcar)
>>> otro.destroy()
# el after no se ejecuta: muere con el widget
```

Si se programara en la ventana principal, cerrar el aviso a mano dejaría un temporizador vivo que intentaría cerrar algo que ya no existe, y eso es un `TclError` en la consola.

> [!consejo] Consejo
>
> Apilar avisos necesita un tope. Cada uno ocupa su altura más un hueco, así que **a partir del cuarto se salen por arriba de la ventana**; y si las posiciones se recortan con un `max(y, 0)`, lo que pasa es peor, porque se amontonan todos encima del primero. El programa guarda un máximo de tres: al llegar el cuarto, cierra el más viejo y **recoloca los que quedan** para que no se vea el hueco. El aviso no se pierde, porque la bandeja los tiene todos.

## El camino sin dependencias: `osascript`

macOS trae un intérprete de AppleScript en `/usr/bin/osascript`, y con una línea se manda una notificación de verdad, sin instalar nada:

```bash
osascript -e 'display notification "el cuerpo" with title "el título"'
```

Medido: tarda unos 120 ms y devuelve enseguida. Y ahí está su límite, que no es pequeño: **devuelve enseguida**. El proceso termina en cuanto el aviso se ha entregado, así que no hay nadie escuchando cuando el usuario lo pulsa. Con este camino puedes avisar, y nada más.

### La trampa de las comillas, que es un agujero de verdad

La forma natural de construir ese comando es meter el texto dentro de la cadena, y se rompe con el primer usuario que escriba una comilla doble:

```consola
>>> texto = 'Dijo "hola" y se fue'
>>> subprocess.run(["osascript", "-e",
...                 f'display notification "{texto}" with title "t"'])
codigo: 1
stderr: 27:32: syntax error: Un identificador no puede ir detrás de un “"”. (-2740)
```

No es solo que falle: es que el texto del usuario **se está interpretando como código**, que es la misma familia de problemas que la inyección de SQL de la lección anterior. La solución es la misma de siempre, no construir la orden con el dato dentro, sino pasarlo como argumento:

```python
GUION = """
on run argv
    display notification (item 1 of argv) with title (item 2 of argv)
end run
"""

subprocess.run(["osascript", "-e", GUION, cuerpo, titulo],
               capture_output=True, text=True, timeout=10)
```

Comprobado con el mismo texto de antes: código de salida 0 y el aviso sale con sus comillas. El `timeout` está porque `osascript` es un proceso externo y todo proceso externo puede quedarse colgado.

## El camino completo: el Centro de Notificaciones

Este es el que hace lo que pediste: el aviso queda guardado en el Centro de Notificaciones, puede llevar botones, y cuando el usuario lo pulsa **tu programa se entera y recibe el identificador** del aviso que se pulsó. Necesita PyObjC, que es el puente entre Python y las bibliotecas de macOS:

```bash
pip install pyobjc-framework-UserNotifications
```

Un dato útil que salió midiendo: **el Python que trae macOS ya incluye PyObjC** (la versión 11 en el sistema de esta máquina), con `AppKit` y `Foundation` listos, aunque no con el envoltorio de `UserNotifications`, que sí hay que instalar.

### El requisito que sorprende: tiene que ser un `.app`

Esto es lo más importante de la lección y lo que hace perder una tarde si no lo sabes. Desde un guion normal, el Centro de Notificaciones **lo rechaza todo**:

```consola
>>> centro = UNUserNotificationCenter.currentNotificationCenter()
<UNUserNotificationCenter: 0x7cbcc082d0>          # parece que va bien
>>> # y al pedir permiso:
{'concedido': False,
 'error': 'Error Domain=UNErrorDomain Code=1 "Notifications are not allowed
           for this application"'}
```

Ojo a la primera línea: **el objeto se crea sin protestar**, así que la comprobación ingenua de «¿hay centro?» dice que sí. El rechazo llega al pedir permiso, y con él `UNErrorDomain Code=1`, que significa que el sistema no reconoce a quien pregunta. La razón es que macOS identifica a las aplicaciones por su **identificador de paquete**, y un guion suelto no tiene ninguno.

Empaquetado con PyInstaller y movido a una carpeta de aplicaciones, el resultado cambia por completo. Con la misma sonda:

```consola
bundle identifier: com.curso.sondaavisos
permiso: (el diálogo del sistema aparece y espera respuesta)
ajustes: {'alertas': 2, 'badge': 2, 'sonido': 2}      # 2 = Enabled
envio sonda-1: {'error': None}
envio sonda-2: {'error': None}
entregados: {'cuantos': 2, 'ids': ['sonda-1', 'sonda-2']}
```

Los dos avisos salen sin error y `getDeliveredNotifications` los devuelve con sus identificadores. Así que **esta capa depende de la lección 45**: es una función que solo existe en el programa empaquetado, y en desarrollo hay que trabajar con la de `osascript`. De ahí la comprobación del programa, que mira si el ejecutable está dentro de un paquete antes de intentarlo siquiera:

```python
EMPAQUETADA = ".app/Contents/MacOS/" in sys.executable
```

> [!aviso] Atención
>
> El permiso es más frágil de lo que parece. Medido en esta misma máquina: una vez que el usuario dice «no permitir», la denegación **se queda pegada** y activarla después en Ajustes del Sistema no siempre la revive; y como PyInstaller firma la aplicación *ad hoc*, cada reconstrucción puede parecerle al sistema una aplicación distinta. Para depurar esto existe `tccutil reset All tu.identificador.de.paquete`, que borra la decisión guardada y hace que el sistema vuelva a preguntar. Y el peor detalle: **con el permiso denegado, enviar sigue devolviendo `error=None`** y el aviso aparece como entregado. El programa cree que ha avisado y el usuario no ve nada, así que el estado del permiso hay que consultarlo y contárselo, que es lo que hace el diagnóstico del ejemplo.

### El delegado, y la referencia que hay que guardar

Para enterarte de la pulsación hay que darle al sistema un objeto con dos métodos de nombre larguísimo. Son nombres de Objective-C traducidos a Python, y no se pueden cambiar:

```python
class _Delegado(NSObject):

        def userNotificationCenter_willPresentNotification_withCompletionHandler_(
            self, centro, aviso, terminar):
        # Sin esto, macOS esconde el banner cuando tu app está al frente.
                terminar(UNNotificationPresentationOptionBanner
                 | UNNotificationPresentationOptionList)

    def userNotificationCenter_didReceiveNotificationResponse_withCompletionHandler_(
            self, centro, respuesta, terminar):
                self.avisar(respuesta.notification().request().identifier())
        terminar()      # obligatorio: si no se llama, el sistema se queja
```

El segundo es el que importa: `respuesta.notification().request().identifier()` es **el mismo identificador que le pusiste al enviarlo**, y esa es toda la magia. Si al enviar usas el identificador del aviso en tu bandeja, al volver lo buscas ahí y sabes exactamente qué pulsó el usuario, sin ninguna tabla de traducción.

Dos trampas en esas pocas líneas. La primera es **la referencia**: el sistema no retiene al delegado, así que si lo creas en una variable local, Python lo recoge y las pulsaciones dejan de llegar sin ningún error. Es la trampa de la referencia del hallazgo de las variables de control y de las imágenes, por tercera vez y en otro disfraz:

```python
self.delegado = _Delegado.alloc().init()    # guardado en un atributo
self.centro.setDelegate_(self.delegado)
```

La segunda es **desde qué hilo se te llama**. Estos dos métodos los ejecuta macOS en el hilo principal, que es donde corre el `mainloop` de Tk, así que se puede tocar la interfaz directamente. Pero el de la respuesta al permiso **no**: llega desde una cola de fondo, y ahí solo se pueden guardar datos. Es exactamente la regla de la lección 42, y en este ejemplo los dos casos están a diez líneas uno del otro:

```python
def _respuesta_permiso(self, concedido, error):
    # Cola de fondo: solo datos, ni un widget.
        self.permiso = bool(concedido)
```

### El badge del Dock no necesita permiso

El globo rojo sobre el icono es otra API, y es la más agradable de las tres:

```consola
>>> baldosa = NSApplication.sharedApplication().dockTile()
>>> baldosa.setBadgeLabel_("7")
>>> baldosa.badgeLabel()
'7'
>>> baldosa.setBadgeLabel_(None)      # con None se quita
>>> baldosa.setBadgeLabel_("texto")   # acepta cualquier cadena, no solo números
'texto'
```

Funciona **aunque el permiso de notificaciones esté denegado**, porque no es una notificación: es una propiedad del icono. Con `None` se borra, y acepta cualquier texto. Una cosa que se olvida siempre: **hay que ponerlo a cero al cerrar**, porque si no el globo se queda en el Dock con el número de la última sesión.

> [!nota] Qué está verificado y qué no
>
> Todo lo que hay en esta lección con un número o un mensaje de error delante está medido en macOS 27 con Python 3.14 y Tk 9.0.4: los tiempos de `osascript`, el error de las comillas, los anchos del botón, el comportamiento de `overrideredirect`, la subida del clic, el rechazo del Centro de Notificaciones sin empaquetar y su funcionamiento empaquetado, y el badge del Dock.
>
> Lo que **no** se ha podido verificar en la máquina donde se escribió esto es la llegada de la pulsación al delegado, porque el permiso quedó denegado y sin permiso no hay banner que pulsar. El código del delegado viene de una aplicación que sí funciona y que es el proyecto de referencia del módulo, pero conviene que lo compruebes tú con el ejercicio 12 antes de fiarte.

## El programa

Dos ficheros. En `avisos.py` está la bandeja y también el puente con el sistema, y puede chocar que lo segundo no sea «interfaz»: no lo es, porque hablar con el sistema operativo no es dibujar. La prueba es la de siempre, que el módulo no importa `tkinter`, y la consecuencia práctica es que el mismo `Emisor` serviría para un programa de terminal del módulo 2.

```python title="avisos.py"
"""La lógica de los avisos: la bandeja y el puente con el sistema.

Ni una línea de tkinter. El puente vive aquí porque hablar con el sistema
operativo no es dibujar: la interfaz solo pide «manda esto» y pinta lo que
la bandeja diga.
"""

import dataclasses
import itertools
import os
import platform
import shutil
import subprocess
import sys
import time

# --- Detección de lo que hay en esta máquina, una sola vez al importar.

ES_MACOS = sys.platform == "darwin"

try:                                    # el badge del Dock y NSApplication
        from AppKit import NSApplication
    HAY_APPKIT = True
except ImportError:
        HAY_APPKIT = False

try:                                    # el Centro de Notificaciones de verdad
        from Foundation import NSObject
    from UserNotifications import (UNAuthorizationOptionAlert,
                                   UNAuthorizationOptionBadge,
                                   UNAuthorizationOptionSound,
                                   UNMutableNotificationContent,
                                   UNNotificationPresentationOptionBanner,
                                   UNNotificationPresentationOptionList,
                                   UNNotificationRequest,
                                   UNUserNotificationCenter)
    HAY_CENTRO = True
except ImportError:
        HAY_CENTRO = False

# Un .app empaquetado tiene su ejecutable dentro de Contents/MacOS. Sin eso,
# el Centro de Notificaciones rechaza todo, así que ni se intenta.
EMPAQUETADA = ".app/Contents/MacOS/" in sys.executable
HAY_OSASCRIPT = ES_MACOS and shutil.which("osascript") is not None

# Pasar el texto como argumento y no incrustado: un usuario que escriba
# comillas dobles rompe el AppleScript y no se envía nada.
GUION = """
on run argv
    display notification (item 1 of argv) with title (item 2 of argv)
end run
"""


class ErrorDeAviso(Exception):
        """No se ha podido mandar al sistema. La bandeja sigue funcionando."""


@dataclasses.dataclass
class Aviso:
        identificador: str
    titulo: str
    cuerpo: str
    momento: float = dataclasses.field(default_factory=time.time)
    leido: bool = False
    canal: str = "bandeja"


class Bandeja:
        """Los avisos de esta sesión. Es la fuente de verdad del contador."""

    def __init__(self, maximo=200):
                self.maximo = maximo
        self.avisos = []
        self._numeros = itertools.count(1)

    def anadir(self, titulo, cuerpo, canal="bandeja"):
                titulo = (titulo or "").strip() or "Aviso"
        aviso = Aviso(f"aviso-{next(self._numeros)}", titulo,
                      (cuerpo or "").strip(), canal=canal)
        self.avisos.append(aviso)
        if len(self.avisos) > self.maximo:
                        del self.avisos[:-self.maximo]
        return aviso

    def por_id(self, identificador):
                for aviso in self.avisos:
                        if aviso.identificador == identificador:
                                return aviso
        return None

    def marcar_leido(self, identificador):
                """Devuelve True solo si ha cambiado algo, para no repintar de más."""
        aviso = self.por_id(identificador)
        if aviso is None or aviso.leido:
                        return False
        aviso.leido = True
        return True

    def marcar_todos(self):
                cambiados = 0
        for aviso in self.avisos:
                        if not aviso.leido:
                                aviso.leido = True
                cambiados += 1
        return cambiados

    def borrar_leidos(self):
                antes = len(self.avisos)
        self.avisos = [a for a in self.avisos if not a.leido]
        return antes - len(self.avisos)

    @property
    def sin_leer(self):
                return sum(1 for aviso in self.avisos if not aviso.leido)

    def __len__(self):
                return len(self.avisos)


class Emisor:
        """Manda avisos al sistema por el mejor camino disponible.

    Tres canales, de más a menos capaz:

    centro     PyObjC y UNUserNotificationCenter. Es el único que sabe
               decirte cuál pulsó el usuario, y exige un .app de verdad.
    osascript  No necesita instalar nada, funciona siempre en macOS, y no
               devuelve ninguna información de la pulsación.
    ninguno    Fuera de macOS. La bandeja de la ventana sigue igual.
    """

    def __init__(self, al_pulsar=None):
                self.al_pulsar = al_pulsar
        self.permiso = None            # None = sin respuesta todavía
        self.ultimo_error = None
        self.centro = None
        self.delegado = None
        self.canal = self._elegir_canal()
        if self.canal == "centro":
                        self._arrancar_centro()

    def _elegir_canal(self):
                if HAY_CENTRO and EMPAQUETADA:
                        return "centro"
        if HAY_OSASCRIPT:
                        return "osascript"
        return "ninguno"

    def _arrancar_centro(self):
                self.centro = UNUserNotificationCenter.currentNotificationCenter()
        # El sistema NO retiene al delegado: si no se guarda en un atributo,
        # Python lo recoge y las pulsaciones dejan de llegar sin más aviso.
        self.delegado = _Delegado.alloc().init()
        self.delegado.avisar = self._recibir_pulsacion
        self.centro.setDelegate_(self.delegado)
        self.centro.requestAuthorizationWithOptions_completionHandler_(
            UNAuthorizationOptionAlert | UNAuthorizationOptionBadge
            | UNAuthorizationOptionSound, self._respuesta_permiso)

    def _respuesta_permiso(self, concedido, error):
        # Llega desde una cola de fondo: aquí solo se guardan datos, nunca
        # se toca la interfaz.
                self.permiso = bool(concedido)
        self.ultimo_error = str(error) if error else None

    def _recibir_pulsacion(self, identificador):
                if self.al_pulsar is not None:
                        self.al_pulsar(identificador)

    def enviar(self, aviso):
                """Manda el aviso y devuelve el canal por el que salió."""
        if self.canal == "centro":
                        self._enviar_al_centro(aviso)
        elif self.canal == "osascript":
                        self._enviar_con_osascript(aviso)
        else:
                        return "ninguno"
        return self.canal

    def _enviar_al_centro(self, aviso):
                contenido = UNMutableNotificationContent.alloc().init()
        contenido.setTitle_(aviso.titulo)
        contenido.setBody_(aviso.cuerpo)
        # El identificador es la pieza clave: es lo que vuelve cuando el
        # usuario pulsa, y es el mismo que usa la bandeja.
        pedido = UNNotificationRequest.requestWithIdentifier_content_trigger_(
            aviso.identificador, contenido, None)
        self.centro.addNotificationRequest_withCompletionHandler_(
            pedido, self._resultado_envio)

    def _resultado_envio(self, error):
                self.ultimo_error = str(error) if error else None

    def _enviar_con_osascript(self, aviso):
                completado = subprocess.run(
            ["osascript", "-e", GUION, aviso.cuerpo or " ", aviso.titulo],
            capture_output=True, text=True, timeout=10)
        if completado.returncode:
                        raise ErrorDeAviso(completado.stderr.strip().splitlines()[0]
                               if completado.stderr.strip()
                               else "osascript falló sin explicar por qué")

    def poner_badge(self, cuenta):
                """El globo rojo del Dock. No necesita permiso de notificaciones."""
        if not HAY_APPKIT:
                        return False
        NSApplication.sharedApplication().dockTile().setBadgeLabel_(
            str(cuenta) if cuenta else None)
        return True

    def abrir_ajustes(self):
                """El panel de Notificaciones de Ajustes del Sistema."""
        if not ES_MACOS:
                        return False
        subprocess.run(
            ["open", "x-apple.systempreferences:"
                     "com.apple.Notifications-Settings.extension"],
            check=False)
        return True

    def diagnostico(self):
                """Por qué se está usando este canal y no otro. Para la interfaz."""
        if self.canal == "centro":
                        if self.permiso is False:
                                return ("Sin permiso: los avisos se entregan pero no se ven. "
                        "Actívalos en Ajustes del Sistema.")
            if self.permiso is None:
                                return "Esperando la respuesta al permiso del sistema."
            return "Centro de Notificaciones activo. Las pulsaciones llegan."
        if self.canal == "osascript":
                        if HAY_CENTRO and not EMPAQUETADA:
                                return ("Sin empaquetar: se usa osascript. El Centro de "
                        "Notificaciones exige un .app (lección 45).")
            return ("Se usa osascript. No hay forma de saber si el usuario "
                    "pulsa el aviso del sistema.")
        return f"{platform.system()} no tiene un canal aquí: solo la bandeja."


if HAY_CENTRO:

        class _Delegado(NSObject):
                """El puente que macOS llama cuando pasa algo con un aviso.

        Los dos métodos se ejecutan en el hilo principal, que es donde corre
        el mainloop de Tk, así que se puede tocar la interfaz directamente.
        """

        def userNotificationCenter_willPresentNotification_withCompletionHandler_(
                self, centro, aviso, terminar):
            # Sin esto, macOS esconde el banner cuando la app está al frente.
                        terminar(UNNotificationPresentationOptionBanner
                     | UNNotificationPresentationOptionList)

        def userNotificationCenter_didReceiveNotificationResponse_withCompletionHandler_(
                self, centro, respuesta, terminar):
                        self.avisar(respuesta.notification().request().identifier())
            terminar()      # obligatorio: si no se llama, el sistema se queja
```

```python title="panel_avisos.py"
"""La interfaz: bandeja, contador y avisos flotantes dentro de la ventana.

Lo que se ve aquí funciona en los tres sistemas. Lo del sistema operativo
lo resuelve avisos.py y esta capa solo pregunta por qué canal ha salido.
"""

import time
import tkinter as tk
from tkinter import ttk

import avisos

AZUL, VERDE, ROJO, GRIS = "#1565C0", "#2E7D32", "#C62828", "#777777"
SEGUNDOS_VISIBLE = 5000
ANCHO_AVISO, ALTO_AVISO = 320, 96
# Más de tres apilados se salen de la ventana por arriba.
MAXIMO_FLOTANTES = 3


class Contador(tk.Canvas):
        """El globo rojo con el número. Un Canvas y no una etiqueta porque así
    el tamaño no cambia nunca: con una etiqueta, pasar de 9 a 10 mueve todo
    lo que tenga al lado."""

    LADO = 24

    def __init__(self, padre, **opciones):
                super().__init__(padre, width=self.LADO, height=self.LADO,
                         highlightthickness=0, **opciones)

    def poner(self, cuenta):
                self.delete("all")
        if not cuenta:
                        return
        margen = 2
        self.create_oval(margen, margen, self.LADO - margen,
                         self.LADO - margen, fill=ROJO, outline="")
        self.create_text(self.LADO / 2, self.LADO / 2,
                         text=str(cuenta) if cuenta < 100 else "99+",
                         fill="white", font=("Helvetica", 9, "bold"))


class AvisoFlotante(tk.Toplevel):
        """El aviso que aparece en una esquina y se va solo.

    Es una ventana sin barra de título, así que hay que colocarla a mano y
    cerrarla a mano: el usuario no tiene ningún botón para hacerlo.
    """

    def __init__(self, padre, aviso, al_pulsar, hueco=0):
                super().__init__(padre)
        self.aviso = aviso
        self.al_pulsar = al_pulsar
        self.cierre = None

        self.overrideredirect(True)      # sin barra de título ni marco
        try:
                        self.attributes("-topmost", True)
        except tk.TclError:
                        pass                         # algún gestor de ventanas no lo deja
        self.colocar(hueco)

        marco = ttk.Frame(self, padding=12, relief="solid", borderwidth=1)
        marco.pack(fill="both", expand=True)
        ttk.Label(marco, text=aviso.titulo,
                  font=("Helvetica", 12, "bold")).pack(anchor="w")
        ttk.Label(marco, text=aviso.cuerpo or "Sin detalle",
                  wraplength=ANCHO_AVISO - 40,
                  foreground=GRIS).pack(anchor="w", pady=(2, 0))

        # Basta atar el clic a la ventana: el evento sube desde los hijos.
        # Lo que no se hereda es el cursor, y eso hay que ponerlo uno a uno.
        self.bind("<Button-1>", self.pulsado)
        for hijo in (marco, *marco.winfo_children()):
                        hijo.configure(cursor="hand2")
        self.configure(cursor="hand2")

        # El temporizador va sobre self: así muere con la ventana y no
        # intenta cerrar algo que ya no existe.
        self.cierre = self.after(SEGUNDOS_VISIBLE, self.cerrar)

    def colocar(self, hueco):
                padre = self.master
        padre.update_idletasks()
        x = padre.winfo_rootx() + padre.winfo_width() - ANCHO_AVISO - 18
        y = (padre.winfo_rooty() + padre.winfo_height() - ALTO_AVISO - 18
             - hueco * (ALTO_AVISO + 8))
        self.geometry(f"{ANCHO_AVISO}x{ALTO_AVISO}+{max(x, 0)}+{max(y, 0)}")

    def pulsado(self, evento=None):
                self.al_pulsar(self.aviso.identificador)
        self.cerrar()

    def cerrar(self):
                if self.cierre is not None:
                        self.after_cancel(self.cierre)
            self.cierre = None
        if self.winfo_exists():
                        self.destroy()


class Aplicacion(tk.Tk):

        def __init__(self, bandeja):
                super().__init__()
        self.bandeja = bandeja
        # El emisor recibe la función que hay que llamar cuando el usuario
        # pulsa un aviso del sistema. Así la lógica no sabe que hay ventana.
        self.emisor = avisos.Emisor(al_pulsar=self.pulsado_en_el_sistema)
        self.flotantes = []

        self.title("Avisos")
        self.geometry("860x520")
        self.minsize(720, 420)
        self.estado = tk.StringVar(value="Listo")

        self.crear_barra()
        cuerpo = ttk.Frame(self, padding=12)
        cuerpo.pack(fill="both", expand=True)
        self.crear_formulario(cuerpo)
        self.crear_bandeja(cuerpo)
        self.pie = ttk.Label(self, textvariable=self.estado, foreground=GRIS,
                             anchor="w", padding=(12, 6))
        self.pie.pack(fill="x")

        self.protocol("WM_DELETE_WINDOW", self.al_cerrar)
        self.refrescar()
        # El permiso del sistema llega por otro hilo y tarda: se vuelve a
        # mirar más tarde en vez de bloquear el arranque esperándolo.
        self.after(2500, self.refrescar)

    # --- construcción

    def crear_barra(self):
                barra = ttk.Frame(self, padding=(12, 10, 12, 0))
        barra.pack(fill="x")
        izquierda = ttk.Frame(barra)
        izquierda.pack(side="left")
        ttk.Label(izquierda, text="Sin leer:",
                  font=("Helvetica", 12)).pack(side="left", padx=(0, 6))
        self.contador = Contador(izquierda)
        self.contador.pack(side="left")
        ttk.Button(barra, text="Borrar leídos",
                   command=self.borrar_leidos).pack(side="right")
        ttk.Button(barra, text="Marcar todos",
                   command=self.marcar_todos).pack(side="right", padx=8)

    def crear_formulario(self, padre):
                marco = ttk.Labelframe(padre, text="Nuevo aviso", padding=12)
        marco.pack(side="left", fill="y", padx=(0, 12))

        self.titulo = tk.StringVar(value="Informe listo")
        self.mensaje = tk.StringVar(value="Ya puedes revisar las ventas")
        for fila, (texto, variable) in enumerate((("Título:", self.titulo),
                                                  ("Mensaje:", self.mensaje))):
                        ttk.Label(marco, text=texto).grid(row=fila, column=0, sticky="w",
                                              pady=4)
            ttk.Entry(marco, textvariable=variable, width=30).grid(
                row=fila, column=1, sticky="ew", pady=4)

        ttk.Button(marco, text="Enviar", command=self.enviar).grid(
            row=2, column=1, sticky="e", pady=(10, 0))
        ttk.Separator(marco, orient="horizontal").grid(
            row=3, column=0, columnspan=2, sticky="ew", pady=12)

        self.canal = ttk.Label(marco, font=("Helvetica", 11, "bold"))
        self.canal.grid(row=4, column=0, columnspan=2, sticky="w")
        self.ayuda = ttk.Label(marco, wraplength=250, justify="left",
                               foreground=GRIS)
        self.ayuda.grid(row=5, column=0, columnspan=2, sticky="w", pady=(4, 0))
        self.ajustes = ttk.Button(marco, text="Abrir Ajustes del Sistema",
                                  command=self.emisor.abrir_ajustes)
        self.ajustes.grid(row=6, column=0, columnspan=2, sticky="w",
                          pady=(10, 0))
        self.ajustes.grid_remove()

    def crear_bandeja(self, padre):
                marco = ttk.Labelframe(padre, text="Bandeja", padding=12)
        marco.pack(side="left", fill="both", expand=True)
        columnas = ("estado", "hora", "titulo", "cuerpo")
        self.arbol = ttk.Treeview(marco, columns=columnas, show="headings",
                                  height=12)
        for columna, titulo, ancho in (("estado", "", 26), ("hora", "Hora", 70),
                                       ("titulo", "Título", 150),
                                       ("cuerpo", "Mensaje", 240)):
                        self.arbol.heading(columna, text=titulo, anchor="w")
            self.arbol.column(columna, width=ancho, anchor="w",
                              stretch=columna == "cuerpo")
        # La fila sin leer en negrita: es el equivalente del punto azul.
        self.arbol.tag_configure("sin_leer", font=("Helvetica", 12, "bold"))
        self.arbol.tag_configure("leido", foreground=GRIS)
        barra = ttk.Scrollbar(marco, orient="vertical",
                              command=self.arbol.yview)
        self.arbol.configure(yscrollcommand=barra.set)
        self.arbol.pack(side="left", fill="both", expand=True)
        barra.pack(side="right", fill="y")
        self.arbol.bind("<<TreeviewSelect>>", self.seleccionado)

    # --- acciones

    def enviar(self):
                aviso = self.bandeja.anadir(self.titulo.get(), self.mensaje.get())
        try:
                        canal = self.emisor.enviar(aviso)
        except avisos.ErrorDeAviso as error:
                        canal = "bandeja"
            self.decir(f"No ha salido al sistema: {error}", ROJO)
        else:
                        self.decir(f"Aviso enviado por «{canal}»", VERDE)
        aviso.canal = canal
        self.mostrar_flotante(aviso)
        self.refrescar()

    def mostrar_flotante(self, aviso):
                self.flotantes = [f for f in self.flotantes if f.winfo_exists()]
        while len(self.flotantes) >= MAXIMO_FLOTANTES:
                        self.flotantes.pop(0).cerrar()      # se va el más viejo
            self.recolocar()
        flotante = AvisoFlotante(self, aviso, self.pulsado_en_la_ventana,
                                 hueco=len(self.flotantes))
        self.flotantes.append(flotante)

    def recolocar(self):
                """Al cerrarse uno del medio, los de encima bajan a su sitio."""
        self.flotantes = [f for f in self.flotantes if f.winfo_exists()]
        for hueco, flotante in enumerate(self.flotantes):
                        flotante.colocar(hueco)

    def pulsado_en_la_ventana(self, identificador):
                """Alguien ha pulsado el aviso flotante de dentro de la aplicación."""
        self.abrir(identificador, "en la ventana")

    def pulsado_en_el_sistema(self, identificador):
                """La llama el delegado de macOS. Corre en el hilo principal, así que
        se puede tocar la interfaz; el `after(0)` está para que el trabajo se
        haga en el turno siguiente del bucle y no dentro del callback."""
        self.after(0, lambda: self.abrir(identificador,
                                         "desde el Centro de Notificaciones"))

    def abrir(self, identificador, desde):
                aviso = self.bandeja.por_id(identificador)
        if aviso is None:
                        self.decir(f"Ese aviso ya no está en la bandeja ({desde})")
            self.refrescar()
            return
        self.bandeja.marcar_leido(identificador)
        self.refrescar()
        if self.arbol.exists(identificador):
                        self.arbol.selection_set(identificador)
            self.arbol.see(identificador)
        self.decir(f"«{aviso.titulo}» abierto {desde}", AZUL)

    def seleccionado(self, evento=None):
                for identificador in self.arbol.selection():
                        if self.bandeja.marcar_leido(identificador):
                                self.refrescar()

    def marcar_todos(self):
                cambiados = self.bandeja.marcar_todos()
        self.refrescar()
        self.decir(f"{cambiados} marcados como leídos" if cambiados
                   else "No había ninguno sin leer")

    def borrar_leidos(self):
                borrados = self.bandeja.borrar_leidos()
        self.refrescar()
        self.decir(f"{borrados} borrados" if borrados
                   else "No hay ninguno leído")

    # --- pintado

    def refrescar(self):
                seleccion = self.arbol.selection()
        self.arbol.delete(*self.arbol.get_children())
        for aviso in reversed(self.bandeja.avisos):      # el último arriba
                        self.arbol.insert(
                "", "end", iid=aviso.identificador,
                values=("" if aviso.leido else "●",
                        time.strftime("%H:%M:%S", time.localtime(aviso.momento)),
                        aviso.titulo, aviso.cuerpo),
                tags=("leido" if aviso.leido else "sin_leer",))
        for identificador in seleccion:
                        if self.arbol.exists(identificador):
                                self.arbol.selection_set(identificador)

        sin_leer = self.bandeja.sin_leer
        self.contador.poner(sin_leer)
        self.emisor.poner_badge(sin_leer)       # el globo del Dock, si se puede
        self.canal.configure(text=f"Canal: {self.emisor.canal}")
        self.ayuda.configure(text=self.emisor.diagnostico())
        if self.emisor.canal == "centro" and self.emisor.permiso is False:
                        self.ajustes.grid()
        else:
                        self.ajustes.grid_remove()

    def decir(self, mensaje, color=GRIS):
                self.estado.set(mensaje)
        self.pie.configure(foreground=color)

    def al_cerrar(self):
                for flotante in self.flotantes:
                        flotante.cerrar()
        self.emisor.poner_badge(0)      # si no, el globo se queda en el Dock
        self.destroy()


def main():
        Aplicacion(avisos.Bandeja()).mainloop()


if __name__ == "__main__":
        main()
```

> [!resumen] En resumen
>
> Avisar cuando la ventana no está delante tiene **tres caminos y hay que elegir sabiendo qué puede cada uno**. La bandeja dentro de la ventana funciona en los tres sistemas y no necesita nada, pero no se ve si la ventana está detrás; `osascript` sale en el sistema sin instalar nada y en unos 120 ms, pero **no hay forma de saber si el usuario la pulsó**, porque el proceso termina al entregarla; y el Centro de Notificaciones con PyObjC es el único que devuelve el identificador de lo pulsado y admite botones, a cambio de un requisito que sorprende. Ese requisito es el centro de la lección: **desde un guion suelto todo se rechaza** con `UNErrorDomain Code=1 "Notifications are not allowed for this application"`, y encima el objeto del centro **se crea sin protestar**, así que la comprobación ingenua dice que hay centro; hace falta un `.app` con su identificador de paquete, lo que ata esta función a la lección 45, y en desarrollo se trabaja con `osascript` (de ahí el `".app/Contents/MacOS/" in sys.executable`). Empaquetado y verificado: los envíos vuelven con `error=None` y `getDeliveredNotifications` los lista con sus identificadores. El permiso es frágil: una denegación **se queda pegada**, cada reconstrucción con PyInstaller puede parecer otra aplicación por la firma *ad hoc*, `tccutil reset All tu.identificador` es lo que lo desatasca, y lo peor, **con el permiso denegado enviar sigue devolviendo `error=None`**, así que hay que consultar el estado y contárselo al usuario en vez de suponer que se ha avisado. Del delegado, tres cosas: el identificador que vuelve en `respuesta.notification().request().identifier()` **es el mismo que pusiste al enviar**, y por eso se usa el de la bandeja y no hace falta ninguna traducción; hay que **guardar el delegado en un atributo** porque el sistema no lo retiene y si no las pulsaciones dejan de llegar sin ningún error (la trampa de la referencia por tercera vez); y los dos métodos del delegado corren en el hilo principal, pero **la respuesta al permiso llega de una cola de fondo** y ahí no se toca ni un widget. De la parte de Tkinter, lo medido: el contador **no puede ir en el texto de un botón**, porque el ancho pasa de 80 a 116 píxeles según el número y empuja la barra entera, así que va en un `Canvas` de lado fijo con `99+` como tope y nada dibujado con cero; el aviso flotante es un `Toplevel` con `overrideredirect(True)` (que devuelve `None` antes de fijarlo y `bool` después) y quitarle el marco significa que **no hay nada que lo cierre**, así que la posición, el cierre por tiempo y el clic los pones tú; el clic **sube por la jerarquía**, de modo que basta atarlo al `Toplevel` y leer `evento.widget`, mientras que **el cursor no se hereda** y hay que ponerlo widget a widget; el temporizador de cierre va sobre el propio aviso para que muera con él; y apilarlos necesita un tope, porque del cuarto en adelante se salen por arriba. El badge del Dock, por su parte, **no necesita permiso** porque es una propiedad del icono, acepta cualquier cadena, se quita con `None`, y hay que **ponerlo a cero al cerrar** o se queda con el número de la última sesión.

> [!ejercicio] Practica
>
> 1. Escribe los dos ficheros y ejecútalo. Manda tres avisos y mira el contador, los flotantes y la bandeja.
> 2. Mira qué dice el canal en el panel izquierdo y explica por qué es ese y no otro en tu máquina.
> 3. Manda un aviso con comillas dobles en el mensaje y comprueba que sale bien. Después cambia `_enviar_con_osascript` para incrustar el texto en la cadena y repite.
> 4. Cambia el contador para que use el texto de un botón, `Avisos (N)`, y ve subiendo la cuenta de 9 a 10 y de 99 a 100 mirando lo que se mueve al lado.
> 5. Quita el `99+` y manda ciento veinte avisos con un bucle. Mira qué le pasa al globo.
> 6. Manda cinco avisos seguidos y comprueba que solo se apilan tres. Sube `MAXIMO_FLOTANTES` a seis y repite.
> 7. Quita la llamada a `recolocar()` y cierra el aviso del medio con un clic. Describe el hueco que queda.
> 8. Cambia el `after` del cierre para que se programe en la ventana principal (`self.master.after`), cierra un aviso con un clic y espera cinco segundos. Copia el error de la consola.
> 9. Quita el `cursor="hand2"` de los hijos y pasa el ratón por encima del aviso. Después quítalo solo del `Toplevel`.
> 10. Ata el clic únicamente a la etiqueta del título y comprueba que pulsar el resto del aviso ya no hace nada.
> 11. Haz que el aviso flotante se coloque en la esquina superior derecha en vez de la inferior, y decide qué pasa con el apilado.
> 12. Instala `pyobjc-framework-UserNotifications`, empaqueta el programa con `pyinstaller --windowed --osx-bundle-identifier com.tunombre.avisos`, muévelo a `~/Applications` y ejecútalo. Concede el permiso, manda un aviso, cámbiate a otra aplicación y púlsalo. Comprueba que la barra de estado dice «abierto desde el Centro de Notificaciones».
> 13. Con el programa empaquetado, deniega el permiso a propósito y manda un aviso. Comprueba que el envío no da error y que el diagnóstico sí te lo cuenta.
> 14. Usa `tccutil reset All com.tunombre.avisos` y vuelve a ejecutarlo. Comprueba que el sistema pregunta otra vez.
> 15. Añade al aviso del sistema una categoría con dos botones usando `UNNotificationAction` y `UNNotificationCategory`, y lee `respuesta.actionIdentifier()` en el delegado para saber cuál se pulsó.
> 16. Conecta esto con la lección 42: haz que la búsqueda de duplicados del panel de control mande un aviso al terminar, con el número de grupos encontrados.
> 17. Quita el `self.delegado =` y deja el delegado en una variable local. Empaqueta, pulsa un aviso y comprueba que no pasa nada en absoluto.
> 18. Haz que la bandeja se guarde entre sesiones con lo de la lección 43, y que al arrancar el badge del Dock ya lleve la cuenta de lo que quedó sin leer.
