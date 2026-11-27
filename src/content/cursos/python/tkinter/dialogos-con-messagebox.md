---
titulo: "Diálogos estándar con messagebox"
resumen: "La función que devuelve la cadena 'no' y hace que cualquier if sea cierto, la que devuelve tres cosas, la opción detail que casi nadie usa, y cuándo no hay que preguntar nada."
minutos: 21
orden: 36
---

Hasta ahora todo lo que ha aparecido en el módulo se dibuja dentro de tu ventana. Los diálogos son lo primero que no: son ventanas del sistema, las pinta el sistema, y por eso un `messagebox` de Tkinter en macOS es indistinguible del de cualquier otro programa.

Son también el sitio donde se concentra más mala interfaz por línea de código, porque preguntar es fácil y decidir no. Así que esta lección tiene dos mitades: la técnica, que es corta y tiene una trampa buena, y la de criterio, que es la que de verdad mejora un programa.

> [!objetivo] Qué vas a aprender
>
> Usar las ocho funciones sabiendo exactamente qué devuelve cada una, empezando por la que devuelve una cadena donde todos esperan un booleano; escribir un mensaje de diálogo que se entienda, con la opción que casi nadie usa; pasar el padre correcto para que el diálogo no se esconda; y sobre todo saber cuándo no hay que abrir ningún diálogo.

## Las ocho funciones

```consola
>>> sorted(n for n in dir(messagebox) if not n.startswith("_"))
['Dialog', 'Message', 'askokcancel', 'askquestion', 'askretrycancel',
 'askyesno', 'askyesnocancel', 'showerror', 'showinfo', 'showwarning']
```

Todas tienen la misma firma, `(title=None, message=None, **options)`, y se diferencian en los botones que muestran y en **lo que devuelven**, que es la parte importante:

| Función | Botones | Devuelve |
| --- | --- | --- |
| `showinfo` | Aceptar | `'ok'` |
| `showwarning` | Aceptar | `'ok'` |
| `showerror` | Aceptar | `'ok'` |
| `askokcancel` | Aceptar, Cancelar | `True` / `False` |
| `askyesno` | Sí, No | `True` / `False` |
| `askretrycancel` | Reintentar, Cancelar | `True` / `False` |
| `askyesnocancel` | Sí, No, Cancelar | `True` / `False` / **`None`** |
| `askquestion` | Sí, No | **`'yes'` / `'no'`** |

Las tres primeras solo informan y su valor de vuelta no sirve para nada. Las cuatro siguientes devuelven un booleano de verdad. Y las dos últimas son las que hay que mirar con cuidado.

> [!error] `askquestion` devuelve la cadena `'no'`, y `'no'` es cierto
>
> ```python
> if messagebox.askquestion("Borrar", "¿Seguro?"):
>         borrar()                      # se ejecuta SIEMPRE
> ```
>
> Ese código borra siempre, diga lo que diga la persona. La razón:
>
> ```consola
> >>> messagebox.YES, messagebox.NO
> ('yes', 'no')
> >>> bool("no")
> True
> ```
>
> **`askquestion` devuelve el nombre del botón como texto**, no un booleano, y cualquier cadena no vacía es cierta en Python. Las demás sí convierten; se ve en su propio código:
>
> ```consola
> >>> # askyesno
> return s == YES
> >>> # askokcancel
> return s == OK
> ```
>
> El fallo es especialmente malo porque **el diálogo se ve perfecto** y la pregunta se hace de verdad: lo único que no funciona es la respuesta, y solo en una de las dos ramas. En una prueba manual rápida, pulsando «Sí», todo parece correcto.
>
> La regla es simple: **usa `askyesno`, nunca `askquestion`.** Hacen lo mismo y muestran lo mismo; la única diferencia es el tipo de vuelta, y uno de los dos está mal diseñado. Si te encuentras `askquestion` en código existente, lo correcto es comparar explícitamente:
>
> ```python
> if messagebox.askquestion("Borrar", "¿Seguro?") == messagebox.YES:
>         borrar()
> ```

> [!aviso] `askyesnocancel` devuelve tres cosas, y dos de ellas son falsas
>
> ```consola
> >>> respuesta = messagebox.askyesnocancel("Salir", "¿Guardar los cambios?")
> >>> # 'Sí' → True   |   'No' → False   |   'Cancelar' → None
> ```
>
> Es la función correcta para el caso más común de todos, el de cerrar un documento con cambios sin guardar, porque ahí hay tres respuestas distintas: guardar y salir, salir sin guardar, y no salir. Pero hay que tratarlas como tres:
>
> ```python
> respuesta = messagebox.askyesnocancel("Salir", "¿Guardar los cambios?")
> if respuesta is None:
>         return          # Cancelar: no se hace nada
> if respuesta:
>         guardar()
> cerrar()
> ```
>
> El error está en escribir `if not respuesta: return`, que confunde «No» con «Cancelar» y cierra el documento sin guardar cuando la persona había pedido quedarse. De ahí el **`is None`**, que es la comprobación que hay que hacer primero.

## Las opciones

Tk las enumera cuando le pasas una que no existe, y son siete:

```consola
>>> ventana.tk.call("tk_messageBox", "-inventada", "x")
_tkinter.TclError: bad option "-inventada": must be -default, -detail, -icon,
-message, -parent, -title, -type, or -command
```

`title` y `message` ya las conoces. De las otras, dos importan mucho y el resto poco.

> [!consejo] `detail`: la opción que arregla los mensajes
>
> Esta es la que casi nadie usa y la que más mejora un diálogo. `message` se dibuja grande y en negrita; `detail` va debajo, más pequeño, y es donde cabe la explicación:
>
> ```python
> messagebox.showerror(
>     title="Guardar",
>     message="No se ha podido guardar el documento.",
>     detail=f"La carpeta «{carpeta}» es de solo lectura. Prueba a guardarlo "
>            f"en otro sitio o cambia los permisos de la carpeta.",
> )
> ```
>
> Eso da la estructura que tienen todos los diálogos bien hechos del sistema: **una frase corta que dice qué ha pasado, y debajo el detalle y la salida.** La alternativa habitual, que es meterlo todo en `message` separado por saltos de línea, sale en negrita y ocupa media pantalla.
>
> Y aprovecho para lo que de verdad falla en los mensajes, que no es la técnica:
>
> - El título es **el nombre de la acción**, no «Error» ni «Aviso»: el icono ya dice de qué tipo es. «Guardar» es mejor título que «Error».
> - El mensaje dice **qué ha pasado**, no qué función ha fallado. «No se ha podido guardar el documento» sirve; «Error en escribir\_fichero(): errno 13» no.
> - Y siempre que se pueda, **qué hacer ahora**. Un mensaje que solo informa del problema obliga a adivinar.
> - Nunca un mensaje que la persona no pueda accionar. Si no hay nada que decidir ni nada que hacer, probablemente no hacía falta el diálogo (siguiente sección).

Los `icon` y los `type` se pueden cambiar, y sus valores también los enumera Tk:

```consola
>>> icon: must be error, info, question, or warning
>>> type: must be abortretryignore, ok, okcancel, retrycancel, yesno, or yesnocancel
>>> default: must be abort, retry, ignore, ok, cancel, no, or yes
```

En la práctica no hace falta tocarlos, porque cada función ya pone el suyo. La única que se usa de vez en cuando es `default`, que dice qué botón está preseleccionado, y tiene una condición que no es obvia:

```consola
>>> messagebox.askyesno("t", "m", default="retry")
_tkinter.TclError: Illegal default option
```

**`default` tiene que ser uno de los botones que ese `type` muestra de verdad.** Y sirve para algo importante: en una pregunta destructiva, el botón preseleccionado debe ser el que no destruye, porque el Enter es reflejo.

```python
messagebox.askyesno("Borrar", "¿Borrar los 12 contactos seleccionados?",
                    default="no")
```

> [!aviso] `parent`, y por qué importa en macOS
>
> ```python
> messagebox.showinfo("Hecho", "Guardado.", parent=ventana)
> ```
>
> Sin `parent`, Tk usa la ventana principal por omisión, y eso da problemas en dos casos: cuando el diálogo lo abre una ventana secundaria (lección 38), porque aparece asociado a la principal y puede salir **detrás** de la que hizo la pregunta; y cuando el programa tiene varias ventanas, porque el diálogo se centra sobre la que no toca.
>
> La costumbre sana es pasar siempre `parent`, y que sea la ventana desde la que se pregunta. En el ejemplo de esta lección eso está encapsulado en funciones propias, que además es lo que permite probar el programa sin abrir diálogos.

## Cuándo no hay que preguntar

Esta es la mitad de la lección que cambia programas. Un diálogo **interrumpe**: para todo, se pone delante, y obliga a leer y decidir antes de seguir. Eso es mucho poder para algo que se escribe en una línea.

> [!consejo] Tres casos en los que el diálogo sobra
>
> **1. Para confirmar que algo ha ido bien.** Un `showinfo("Hecho", "Guardado")` después de cada guardado es el error más común del módulo. Nadie duda de que guardar funciona; lo que se necesita es una señal discreta, y para eso está la barra de estado que llevan todos los ejemplos del curso, o el título de la ventana con un asterisco cuando hay cambios sin guardar. **Se avisa de lo que ha fallado, no de lo que ha funcionado.**
>
> **2. Para confirmar algo que se puede deshacer.** «¿Seguro que quieres borrar?» tiene sentido si el borrado es definitivo. Si hay deshacer, la pregunta es peor que no preguntar: molesta cada vez y además entrena a pulsar «Sí» sin leer, con lo que el día que la pregunta importe tampoco se leerá. **Deshacer es mejor que preguntar.**
>
> **3. Para validar un formulario.** Un diálogo que dice «el correo no es válido» obliga a leerlo, cerrarlo, buscar el campo y arreglarlo. Un mensaje en rojo junto al campo, con el foco puesto ahí, no interrumpe nada. Eso es la lección 39, y es el patrón correcto.
>
> Lo que sí justifica un diálogo: **una decisión que no se puede posponer** (salir con cambios sin guardar), **una acción irreversible** (borrar sin deshacer, sobrescribir un fichero) y **un fallo que impide continuar** (no se puede abrir el fichero). Tres casos, y ninguno de ellos es «todo ha salido bien».

## El ejemplo

Un editor de notas con los tres casos legítimos: cerrar con cambios, borrar sin deshacer, y un fallo real. Los diálogos van encapsulados en funciones propias, que es lo que permite pasar el `parent` en un solo sitio y probar el programa sin abrir ninguno.

```python title="avisos.py"
"""messagebox: los tres casos en los que un diálogo está justificado."""

import tkinter as tk
from tkinter import messagebox, ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
VERDE = "#2E7D32"
ROJO = "#C2185B"

NOTAS = {
    "Compra": "leche\npan\ncafé",
    "Ideas": "un curso de Tkinter en español",
    "Pendiente": "llamar al fontanero",
}


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


# Los diálogos, encapsulados: el parent se pasa en un solo sitio y así el
# programa se puede probar sustituyendo estas tres funciones.

def informar_error(titulo, mensaje, detalle=""):
        """detail va debajo y más pequeño: ahí cabe la explicación."""
    messagebox.showerror(title=titulo, message=mensaje, detail=detalle,
                         parent=ventana)


def preguntar(titulo, mensaje, detalle="", por_omision="no"):
        """askyesno, nunca askquestion: esta devuelve un bool de verdad.

    default="no" en las preguntas destructivas, porque el Enter es reflejo.
    """
    return messagebox.askyesno(title=titulo, message=mensaje, detail=detalle,
                               default=por_omision, parent=ventana)


def preguntar_con_cancelar(titulo, mensaje, detalle=""):
        """Tres respuestas: True (sí), False (no) y None (cancelar)."""
    return messagebox.askyesnocancel(title=titulo, message=mensaje,
                                     detail=detalle, parent=ventana)


def crear_lista(contenedor):
        lista = tk.Listbox(contenedor, exportselection=False, activestyle="none",
                       width=18, borderwidth=1, relief="solid",
                       highlightthickness=0)
    lista.pack(side="left", fill="y")
    for titulo in NOTAS:
                lista.insert("end", f"  {titulo}")
    lista.selection_set(0)
    return lista


def crear_editor(contenedor):
        caja = ttk.Frame(contenedor, padding=(MARGEN, 0, 0, 0))
    caja.pack(side="left", fill="both", expand=True)
    # width en caracteres, no en píxeles: sin él son las 80 columnas de
    # fábrica y la ventana pide más de mil píxeles de ancho.
    texto = tk.Text(caja, wrap="word", undo=True, font=("Menlo", 12),
                    width=40, height=12, borderwidth=1, relief="solid",
                    highlightthickness=0)
    barra = ttk.Scrollbar(caja, orient="vertical", command=texto.yview)
    texto.configure(yscrollcommand=barra.set)      # las dos mitades
    barra.pack(side="right", fill="y")
    texto.pack(side="left", fill="both", expand=True)
    return texto


def titulo_actual():
        indices = lista.curselection()
    if not indices:
                return None
    return list(NOTAS)[indices[0]]


def cargar(titulo):
        texto.delete("1.0", "end")
    texto.insert("1.0", NOTAS[titulo])
    texto.edit_modified(False)
    actual.set(titulo)
    marcar_estado()


def marcar_estado():
        """La señal discreta de que hay cambios: aquí, no en un diálogo."""
    sucio = bool(texto.edit_modified())
    ventana.title(f"Notas — {actual.get()}{' •' if sucio else ''}")
    estado.set("Sin guardar" if sucio else "Guardado")
    pie.configure(foreground=ROJO if sucio else VERDE)


def al_cambiar_texto(evento=None):
        marcar_estado()


def cambiar_nota(evento=None):
        """Caso 1 de diálogo justificado: una decisión que no se puede posponer."""
    nuevo = titulo_actual()
    if nuevo is None or nuevo == actual.get():
                return
    if texto.edit_modified():
                respuesta = preguntar_con_cancelar(
            "Cambiar de nota",
            f"¿Guardar los cambios de «{actual.get()}»?",
            "Si no los guardas se perderán.")
        if respuesta is None:               # Cancelar, antes que nada
                        volver_a_seleccionar(actual.get())
            return
        if respuesta:
                        guardar()
    cargar(nuevo)


def volver_a_seleccionar(titulo):
        lista.selection_clear(0, "end")
    lista.selection_set(list(NOTAS).index(titulo))


def guardar():
        titulo = actual.get()
    if titulo in SOLO_LECTURA:
        # Caso 3: un fallo que impide continuar. Aquí sí hace falta el diálogo.
                informar_error(
            "Guardar",
            f"No se ha podido guardar «{titulo}».",
            f"La nota está marcada como de solo lectura. Quítale la marca "
            f"con el botón «Solo lectura» y vuelve a intentarlo.")
        return False
    NOTAS[titulo] = texto.get("1.0", "end-1c")
    texto.edit_modified(False)
    marcar_estado()
    return True


def borrar():
        """Caso 2: una acción irreversible. Sin deshacer, la pregunta se gana."""
    titulo = actual.get()
    if len(NOTAS) == 1:
                informar_error("Borrar", "No se puede borrar la única nota.",
                       "Crea otra antes de borrar esta.")
        return
    if not preguntar("Borrar", f"¿Borrar la nota «{titulo}»?",
                     "Esta acción no se puede deshacer.", por_omision="no"):
                return
    del NOTAS[titulo]
    SOLO_LECTURA.discard(titulo)
    lista.delete(0, "end")
    for nombre in NOTAS:
                lista.insert("end", f"  {nombre}")
    lista.selection_set(0)
    cargar(list(NOTAS)[0])


def cambiar_solo_lectura():
        titulo = actual.get()
    if titulo in SOLO_LECTURA:
                SOLO_LECTURA.discard(titulo)
    else:
                SOLO_LECTURA.add(titulo)
    bloqueo.set(titulo in SOLO_LECTURA)
    estado.set(f"«{titulo}»: "
               f"{'solo lectura' if bloqueo.get() else 'editable'}")


def al_cerrar():
        """El protocolo de la ventana, lección 4. Otra decisión que no se pospone.

    Si guardar falla no se cierra: cerrar perdería los cambios en silencio.
    """
    if texto.edit_modified():
                respuesta = preguntar_con_cancelar(
            "Salir", "¿Guardar los cambios antes de salir?",
            "Si no los guardas se perderán.")
        if respuesta is None:
                        return
        if respuesta and not guardar():
                        return              # no se ha podido guardar: no se cierra
    ventana.destroy()


ventana = tk.Tk()
ventana.minsize(600, 420)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
actual = tk.StringVar(value=list(NOTAS)[0])
estado = tk.StringVar()
bloqueo = tk.BooleanVar(value=False)
SOLO_LECTURA = {"Ideas"}

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

caja = ttk.Frame(cuerpo)
caja.pack(fill="both", expand=True)
lista = crear_lista(caja)
texto = crear_editor(caja)

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x")
ttk.Button(botones, text="Guardar", command=guardar).pack(side="left")
ttk.Checkbutton(botones, text="Solo lectura", variable=bloqueo,
                command=cambiar_solo_lectura).pack(side="left", padx=MARGEN)
ttk.Button(botones, text="Borrar", command=borrar).pack(side="right")

pie = ttk.Label(cuerpo, textvariable=estado)
pie.pack(anchor="w", pady=(AIRE, 0))
ttk.Label(cuerpo, foreground=GRIS, wraplength=540, justify="left",
          text="No hay ningún diálogo al guardar bien: eso se dice en el pie y "
               "con el punto del título. Los diálogos son solo para cambiar de "
               "nota con cambios, borrar, y cuando guardar falla.").pack(
    anchor="w", pady=(AIRE, 0))

lista.bind("<<ListboxSelect>>", cambiar_nota)
texto.bind("<<Modified>>", al_cambiar_texto)
ventana.protocol("WM_DELETE_WINDOW", al_cerrar)

cargar(list(NOTAS)[0])
bloqueo.set(actual.get() in SOLO_LECTURA)

centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Los diálogos de `messagebox` son ventanas del sistema, modales, y las pinta el sistema, así que son indistinguibles de los de cualquier otro programa. Son ocho funciones con la misma firma `(title, message, **options)`, y lo que las diferencia es **lo que devuelven**: las tres `show*` devuelven `'ok'` y da igual, `askokcancel`, `askyesno` y `askretrycancel` devuelven un booleano de verdad, `askyesnocancel` devuelve **tres valores** (`True`, `False` y `None`), y `askquestion` devuelve **la cadena `'yes'` o `'no'`**. Esa última es la trampa: como `bool("no")` es `True`, un `if messagebox.askquestion(...)` se cumple siempre y el programa borra diga lo que diga la persona, con el agravante de que el diálogo se ve perfecto y la prueba manual pulsando «Sí» parece correcta. **Regla: `askyesno`, nunca `askquestion`**, y si hay que usarla, comparar con `messagebox.YES`. De `askyesnocancel`, la comprobación que va primero es **`is None`**, porque escribir `if not respuesta` confunde «No» con «Cancelar» y cierra el documento sin guardar cuando se había pedido quedarse. Las opciones son siete y Tk las enumera en el error: además de `title` y `message`, la que más mejora un diálogo es **`detail`**, que se dibuja debajo y más pequeño y es donde cabe la explicación, dando la estructura de los diálogos bien hechos (una frase corta de qué ha pasado, y debajo el detalle y la salida); `default` dice qué botón está preseleccionado y **tiene que ser uno de los que ese `type` muestra** (si no, `Illegal default option`), y en una pregunta destructiva debe ser el que no destruye, porque el Enter es reflejo; y `parent` conviene pasarlo siempre, porque sin él un diálogo abierto desde una ventana secundaria puede aparecer detrás de ella. Sobre el título y el mensaje: el título es el nombre de la acción y no «Error», el mensaje dice qué ha pasado y no qué función falló, y siempre que se pueda, qué hacer ahora. Y la mitad que cambia programas: **un diálogo interrumpe**, así que sobra en tres casos muy frecuentes: para confirmar que algo ha ido bien (se avisa de lo que falla, no de lo que funciona: eso va en la barra de estado o en el título), para confirmar algo que se puede deshacer (deshacer es mejor que preguntar, y preguntar de más entrena a pulsar «Sí» sin leer) y para validar un formulario (eso es un mensaje junto al campo, lección 39). Los tres casos que sí lo justifican: una decisión que no se puede posponer, una acción irreversible y un fallo que impide continuar.

> [!ejercicio] Practica
>
> Trabaja en un fichero `36-avisos.py` salvo donde se indique otra cosa:
>
> 1. Llama a las ocho funciones una por una e imprime lo que devuelve cada una, pulsando cada botón. Apunta el tipo de Python de cada respuesta.
> 2. En `36-trampa.py`, escribe `if messagebox.askquestion("Borrar", "¿Seguro?"): print("borrando")` y pulsa «No». Explica lo que ocurre y arréglalo de las dos formas.
> 3. Haz lo mismo con `askyesnocancel` usando `if not respuesta`. Pulsa «Cancelar» y comprueba que se comporta como «No». Arréglalo con `is None`.
> 4. Escribe un `showerror` con todo el texto en `message` y otro repartido entre `message` y `detail`. Compara cómo se ven.
> 5. Prueba `default="no"` en un `askyesno` y `default="retry"` en el mismo, y copia el error.
> 6. Abre un diálogo sin `parent` y otro con `parent=ventana` desde un `Toplevel`, y mira si alguno queda detrás.
> 7. Provoca el error de una opción inventada y copia la lista de opciones válidas que da Tk. Haz lo mismo con `icon` y con `type`.
> 8. Coge un programa tuyo (o el de la lección 16) y quita todos los `showinfo` de confirmación, sustituyéndolos por una barra de estado. Anota cuántos has quitado.
> 9. Añade al ejemplo de esta lección un botón «Deshacer» y decide si la pregunta de borrar sigue estando justificada. Razona la respuesta.
> 10. Implementa el retraso con `after` para que un diálogo de error que se repite muchas veces seguidas solo se muestre una vez cada tres segundos.
