---
titulo: "Validación de formularios"
resumen: "El validador que se olvida del return y apaga la validación para siempre, el error que habla de un booleano en vez de tu fallo, y el estado invalid que Tk gestiona solo y casi nadie aprovecha."
minutos: 24
orden: 39
---

Esta lección cierra el bloque D y usa todo lo anterior: variables de control para los datos, eventos para el foco, el estado `invalid` de `ttk`, y el criterio de la lección 36 de que un formulario no se valida con diálogos. Es también la lección donde está el fallo más silencioso de todo el módulo: **un validador al que se le olvida el `return` apaga la validación para siempre**, y el error que aparece habla de un valor booleano y no tiene nada que ver con tu código.

> [!objetivo] Qué vas a aprender
>
> Distinguir los dos trabajos que se confunden siempre, restringir mientras se escribe y verificar al enviar, que necesitan reglas distintas; montar un validador sin caer en el `return` olvidado; aprovechar el estado `invalid` que Tk mantiene solo; y dar el aviso donde se arregla el problema, que es junto al campo y no en una ventana.

## Dos trabajos que no son el mismo

Casi todos los formularios mal validados confunden estas dos cosas:

|  | Mientras se escribe | Al enviar |
| --- | --- | --- |
| Pregunta | ¿Puede este carácter estar aquí? | ¿Está el dato completo y correcto? |
| Herramienta | `validate="key"` | una función que se llama a mano |
| Qué hace si no | Rechaza la pulsación | Marca el campo y no envía |
| Con el campo vacío | **Lo permite** | Lo rechaza |

La columna de la derecha es donde va la lógica de verdad. Y la clave está en la última fila:

> [!error] El validador de teclado no puede juzgar si el dato está completo
>
> Este código parece razonable y hace el campo inservible:
>
> ```python
> def validar_telefono(nuevo):
>         return len(nuevo) == 9 and nuevo.isdigit()      # NO
> ```
>
> Con eso no se puede escribir nada, porque para llegar a nueve dígitos hay que pasar por uno, dos y tres, y los tres se rechazan. El campo queda mudo y el motivo no se ve.
>
> Mientras alguien escribe, **el contenido pasa por estados incompletos que son perfectamente legítimos**: el campo vacío lo es (hay que poder borrar todo para empezar de nuevo), `"1"` lo es camino de `"1234"`, y en un campo decimal `"1."` y hasta `"-"` lo son camino de `"-1.5"`.
>
> Así que el validador de teclado solo puede decidir sobre **el alfabeto**: qué caracteres caben y cuántos como máximo. Nada más.
>
> ```python
> def validar_telefono(nuevo):
>         """Solo el alfabeto: dígitos y como mucho nueve."""
>     return nuevo == "" or (nuevo.isdigit() and len(nuevo) <= 9)
> ```
>
> Lo de «son exactamente nueve» es trabajo del envío, y allí sí se puede exigir.

## La mecánica

Un validador no se pasa como función suelta: hay que registrarlo para que Tcl pueda llamarlo.

```python
orden = ventana.register(validar_telefono)
campo = ttk.Entry(ventana, validate="key", validatecommand=(orden, "%P"))
```

`register` devuelve el nombre de una orden de Tcl, y el `validatecommand` es una tupla con ese nombre y los datos que quieres recibir, escritos con códigos de porcentaje. Los modos son seis y Tk los enumera:

```consola
>>> campo.configure(validate="inventado")
_tkinter.TclError: bad validate "inventado": must be all, key, focus,
focusin, focusout, or none
```

De los seis, se usan dos: **`key`**, que valida en cada pulsación, y **`focusout`**, que valida al salir del campo. `all` hace las dos cosas, y los demás son variantes de poco uso.

Los códigos son ocho, y medidos escribiendo `abc` y luego borrando la `b` del medio:

```consola
>>> # insert(0, "abc")  →  ('1', '0', 'abc', '',    'abc', 'key', 'key', '.!entry2')
>>> # delete(1, 2)      →  ('0', '1', 'ac',  'abc', 'b',   'key', 'key', '.!entry2')
>>> #                        %d   %i   %P     %s     %S     %v     %V     %W
```

| Código | Qué es |
| --- | --- |
| `%P` | **El valor que tendría el campo si se permite.** El que se usa. |
| `%s` | El valor que tiene ahora, antes del cambio. |
| `%S` | El texto que se inserta o se borra. |
| `%d` | `1` si se inserta, `0` si se borra, `-1` si la validación es forzada. |
| `%i` | El índice donde ocurre. |
| `%V` | Qué la ha disparado (`key`, `focusin`, `focusout`, `forced`). |
| `%v` | El valor actual de la opción `validate`. |
| `%W` | El nombre del widget. |

En la práctica, `%P` resuelve casi todo: es el estado futuro del campo, así que devolver `True` o `False` sobre él es exactamente la pregunta «¿permito esto?».

## El fallo del `return` olvidado

> [!error] Un validador que no devuelve un booleano rompe el campo y apaga la validación
>
> Esto es lo peor de la lección, y es un descuido de una línea:
>
> ```python
> def validar(nuevo):
>         if nuevo.isdigit():
>                 return True
>     # y aquí, sin else, se devuelve None
> ```
>
> Lo que pasa al escribir un carácter no válido:
>
> ```consola
> >>> campo.insert(0, "abc")
> _tkinter.TclError: expected boolean value but got "None"
> >>> campo.get()
> ''
> >>> str(campo.cget("validate"))
> 'none'
> ```
>
> Tres desgracias de golpe. **El `insert()` lanza excepción**, y el mensaje habla de un valor booleano, así que no apunta a tu función. El error de verdad, si tu validador tenía un fallo propio, sale **aparte por la salida de errores**, donde probablemente no estés mirando. Y lo definitivo: **`validate` queda en `'none'`**, o sea que Tk desactiva la validación de ese campo para siempre, y a partir de ese momento entra cualquier cosa sin que nadie diga nada.
>
> El síntoma que se ve al usar el programa es desconcertante: el campo valida bien un rato y de repente deja de validar del todo. Y como el `insert` que falló fue el que provocó el apagón, el carácter que lo rompió tampoco entró, con lo que parece que funcionó.
>
> La lista de lo que Tk acepta como respuesta es la de los booleanos de Tcl, medida:
>
> | Devuelve | Resultado |
> | --- | --- |
> | `True`, `1`, `"1"`, `"true"` | permitido |
> | `False`, `0`, `"0"`, `"no"` | rechazado |
> | **`None`** (el `return` olvidado) | `TclError` y validación apagada |
> | `""`, `"si"`, `[]` | `TclError` y validación apagada |
>
> Fíjate en que `"si"` falla: los booleanos son los de Tcl y están en inglés. Y `""`, que es lo que devolvería un validador que hace `return ""` para decir «sin error», también.
>
> Las dos defensas, y conviene poner las dos:
>
> ```python
> def validar_telefono(nuevo):
>         """Un solo return, con una expresión booleana. No hay camino sin respuesta."""
>     return nuevo == "" or (nuevo.isdigit() and len(nuevo) <= 9)
>
>
> def protegido(regla):
>         """Envuelve un validador para que nunca pueda apagar la validación."""
>     def envuelto(*argumentos):
>                 try:
>                         return bool(regla(*argumentos))
>         except Exception:      # cualquier fallo se trata como «no permitido»
>                         return False
>     return envuelto
> ```
>
> El `bool()` convierte lo que sea, y el `try` recoge el fallo propio. Es la misma precaución que las trazas de la lección 33 y los manejadores de la 34, pero aquí es más necesaria, porque en los otros dos casos el programa seguía y aquí se queda tuerto.

## El estado `invalid`, que Tk mantiene solo

Esta es la parte agradable, y es poco conocida. Además de llamar a tu función, `ttk` **apunta el resultado en el estado del widget**:

```consola
>>> campo.state()
()
>>> campo.validate()
False
>>> campo.state()
('invalid',)
>>> # se corrige el contenido…
>>> campo.validate()
True
>>> campo.state()
()
```

Tk lo pone y lo quita por su cuenta. Y como es un estado de `ttk`, se puede pintar con un estilo, que es la lección 5 aplicada a algo útil:

```python
estilo = ttk.Style()
estilo.map("Formulario.TEntry",
           fieldbackground=[("invalid", "#FFEBEE")],
           foreground=[("invalid", "#C2185B")])
```

Con esas tres líneas, **todos los campos del formulario se pintan de rosa cuando su contenido no vale, sin una sola línea de código en cada campo**. Y se comprueba que el estilo ha quedado bien mirándolo con el estado puesto:

```consola
>>> estilo.lookup("Formulario.TEntry", "fieldbackground", state=["invalid"])
'#FFEBEE'
>>> estilo.lookup("Formulario.TEntry", "fieldbackground")
''
```

La pieza que lo une todo es `validate()`, el método:

```consola
>>> campo.validate()
False
```

**Fuerza la validación sin esperar a que nadie toque nada**, devuelve el resultado, actualiza el estado `invalid` y llama al `invalidcommand` si hay. O sea que la función que valida el formulario entero al enviar es un bucle sobre los campos llamando a `validate()`.

Y el `invalidcommand` es el complemento: se llama cuando el validador dice que no.

```python
campo = ttk.Entry(ventana, validate="focusout",
                  validatecommand=(orden, "%P"),
                  invalidcommand=ventana.register(avisar))
```

Es donde va el mensaje de error, y tiene la ventaja de que se dispara tanto al salir del campo como al forzar la validación, así que el aviso aparece solo en los dos casos.

## Dónde va el aviso

La lección 36 ya adelantó la regla y aquí toca aplicarla: **el aviso va junto al campo que hay que arreglar**, nunca en un diálogo.

Un diálogo que dice «el correo no es válido» obliga a leerlo, cerrarlo, recordar qué campo era, buscarlo y arreglarlo. Y si hay tres campos mal, hay tres diálogos seguidos. El patrón que funciona es el que usan todos los formularios bien hechos:

1. **Un rótulo de error debajo de cada campo**, vacío mientras no haya problema. Ocupa sitio siempre, para que el formulario no salte cuando aparece el mensaje.
2. **El campo pintado** con el estado `invalid`, que es gratis con el estilo.
3. **Al enviar, el foco al primer campo que falla**, para que la corrección empiece sola.
4. **Un resumen en el botón o al lado**, del estilo «2 campos por corregir», que dice cuánto queda.

Y una decisión de criterio: **el aviso aparece al salir del campo, no mientras se escribe**. Un formulario que dice «el correo no es válido» en cuanto has escrito la primera letra es hostil, porque te regaña por algo que ibas a arreglar. `focusout` es el momento correcto: has terminado con ese campo y te vas.

## El ejemplo

Un formulario de alta con cinco campos, cada uno con su regla de alfabeto y su regla de completitud, el pintado automático y el foco al primer fallo.

```python title="formulario.py"
"""Validación en dos niveles: el alfabeto al escribir y el dato al enviar."""

import re
import tkinter as tk
from tkinter import ttk

MARGEN = 12
AIRE = 4

GRIS = "#8E8E93"
ROSA = "#C2185B"
VERDE = "#2E7D32"
ROSA_CLARO = "#FFEBEE"

MAX_NOMBRE = 40
LARGO_TELEFONO = 9

CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")


def centrar(ventana: tk.Misc) -> None:
        """Coloca la ventana en el centro de la pantalla."""
    ventana.update_idletasks()
    ancho = ventana.winfo_width()
    alto = ventana.winfo_height()
    x = (ventana.winfo_screenwidth() - ancho) // 2
    y = (ventana.winfo_screenheight() - alto) // 2
    ventana.geometry(f"+{x}+{y}")


def protegido(regla):
        """Ningún validador puede devolver None ni lanzar excepción.

    Sin esto, un return olvidado lanza TclError y deja validate en 'none',
    o sea que el campo deja de validarse para siempre y en silencio.
    """
    def envuelto(*argumentos):
                try:
                        return bool(regla(*argumentos))
        except Exception:
                        return False
    return envuelto


# --- Nivel 1: el alfabeto. Mientras se escribe, lo incompleto es legítimo.

def alfabeto_nombre(nuevo):
        return len(nuevo) <= MAX_NOMBRE


def alfabeto_telefono(nuevo):
        """El campo vacío y un solo dígito son estados legítimos de camino."""
    return nuevo == "" or (nuevo.isdigit() and len(nuevo) <= LARGO_TELEFONO)


def alfabeto_correo(nuevo):
        """Aquí no se comprueba la forma: eso es del envío."""
    return " " not in nuevo and nuevo.count("@") <= 1


def alfabeto_edad(nuevo):
        return nuevo == "" or (nuevo.isdigit() and len(nuevo) <= 3)


# --- Nivel 2: el dato completo. Devuelve el motivo, o "" si está bien.

def dato_nombre(valor):
        if not valor.strip():
                return "El nombre es obligatorio."
    if len(valor.strip()) < 3:
                return "Al menos tres caracteres."
    return ""


def dato_telefono(valor):
        if not valor:
                return "El teléfono es obligatorio."
    if len(valor) != LARGO_TELEFONO:
                return f"Son {LARGO_TELEFONO} dígitos, has escrito {len(valor)}."
    return ""


def dato_correo(valor):
        if not valor:
                return "El correo es obligatorio."
    if not CORREO.match(valor):
                return "Falta la arroba o el dominio."
    return ""


def dato_edad(valor):
        if not valor:
                return ""                   # opcional
    numero = int(valor)             # el alfabeto ya garantizó que son dígitos
    if not 18 <= numero <= 120:
                return "Entre 18 y 120."
    return ""


def dato_plan(valor):
        if not valor:
                return "Elige un plan."
    return ""


CAMPOS = (
    ("nombre", "Nombre", alfabeto_nombre, dato_nombre),
    ("telefono", "Teléfono", alfabeto_telefono, dato_telefono),
    ("correo", "Correo", alfabeto_correo, dato_correo),
    ("edad", "Edad (opcional)", alfabeto_edad, dato_edad),
)


def crear_campo(contenedor, clave, etiqueta, alfabeto, dato):
        """Un campo con su rótulo de error debajo, que ocupa sitio siempre.

    Si el rótulo apareciera y desapareciera, el formulario saltaría cada
    vez que cambia un mensaje.
    """
    fila = ttk.Frame(contenedor)
    fila.pack(fill="x", pady=(0, AIRE))
    ttk.Label(fila, text=f"{etiqueta}:", width=16, anchor="w").pack(
        side="left", anchor="n")

    columna = ttk.Frame(fila)
    columna.pack(side="left", fill="x", expand=True)

    # focusout y no key: regañar mientras se escribe es hostil.
    campo = ttk.Entry(columna, textvariable=VALORES[clave],
                      style="Formulario.TEntry", validate="all",
                      validatecommand=(ventana.register(protegido(alfabeto)),
                                       "%P", "%V"),
                      invalidcommand=ventana.register(
                          lambda c=clave: revisar(c)))
    campo.pack(fill="x")
    ttk.Label(columna, textvariable=ERRORES[clave], foreground=ROSA,
              wraplength=300, justify="left").pack(anchor="w")
    return campo


def validar_campo(nuevo, cuando, clave):
        """El validador de verdad, que hace las dos cosas según quién pregunte.

    Con validate="all" llegan las dos: 'key' al escribir y 'focusout' al
    salir. La regla del alfabeto solo se aplica al escribir.
    """
    if cuando == "key":
                return ALFABETOS[clave](nuevo)
    return DATOS[clave](nuevo) == ""


def revisar(clave):
        """El invalidcommand: aquí va el mensaje, y solo cuando ya hay dato."""
    valor = VALORES[clave].get()
    ERRORES[clave].set(DATOS[clave](valor))
    contar()


def limpiar_error(clave):
        ERRORES[clave].set("")
    contar()


def contar():
        """El resumen de cuánto queda, que es más útil que un «hay errores»."""
    malos = sum(1 for clave in TODAS if DATOS[clave](VALORES[clave].get()))
    if malos == 0:
                resumen.set("Todo correcto")
        pie.configure(foreground=VERDE)
    else:
                resumen.set(f"{malos} campo{'s' if malos > 1 else ''} por corregir")
        pie.configure(foreground=GRIS)
    return malos


def enviar():
        """Valida todos, pinta todos, y pone el foco en el primero que falla."""
    primero = None
    for clave in TODAS:
                motivo = DATOS[clave](VALORES[clave].get())
        ERRORES[clave].set(motivo)
        widget = WIDGETS[clave]
        # Tk mantiene el estado invalid por su cuenta cuando valida él,
        # pero aquí validamos nosotros, así que lo ponemos nosotros.
        widget.state(["invalid"] if motivo else ["!invalid"])
        if motivo and primero is None:
                        primero = widget
    if primero is not None:
                primero.focus_set()
        contar()
        return False
    resumen.set(f"Alta creada: {VALORES['nombre'].get()}")
    pie.configure(foreground=VERDE)
    return True


def limpiar():
        for clave in TODAS:
                VALORES[clave].set("")
        ERRORES[clave].set("")
        WIDGETS[clave].state(["!invalid"])
    plan.set("")
    contar()
    WIDGETS["nombre"].focus_set()


ventana = tk.Tk()
ventana.title("Alta de cliente")
ventana.minsize(520, 460)

# Variables sueltas y global: en el bloque E esto pasa a ser una clase.
# Cada campo tiene su valor, su mensaje, su alfabeto y su regla de dato.
TODAS = tuple(clave for clave, *_ in CAMPOS) + ("plan",)
VALORES = {clave: tk.StringVar() for clave in TODAS}
ERRORES = {clave: tk.StringVar() for clave in TODAS}
ALFABETOS = {clave: alfabeto for clave, _, alfabeto, _ in CAMPOS}
DATOS = {clave: dato for clave, _, _, dato in CAMPOS}
DATOS["plan"] = dato_plan
ALFABETOS["plan"] = lambda nuevo: True
WIDGETS = {}
plan = VALORES["plan"]
resumen = tk.StringVar()

# El estilo pinta el estado invalid en todos los campos de una vez.
estilo = ttk.Style()
estilo.map("Formulario.TEntry",
           fieldbackground=[("invalid", ROSA_CLARO)],
           foreground=[("invalid", ROSA)])
estilo.map("Formulario.TCombobox",
           fieldbackground=[("invalid", ROSA_CLARO)])

cuerpo = ttk.Frame(ventana, padding=MARGEN)
cuerpo.pack(fill="both", expand=True)

ttk.Label(cuerpo, text="Datos del cliente",
          font=("Helvetica", 15, "bold")).pack(anchor="w")
ttk.Label(cuerpo, foreground=GRIS, wraplength=460, justify="left",
          text="Al escribir solo se restringe el alfabeto; el aviso aparece "
               "al salir del campo, que es cuando ya has terminado con "
               "él.").pack(anchor="w", pady=(AIRE, MARGEN))

for clave, etiqueta, alfabeto, dato in CAMPOS:
        WIDGETS[clave] = crear_campo(cuerpo, clave, etiqueta, alfabeto, dato)

fila = ttk.Frame(cuerpo)
fila.pack(fill="x", pady=(0, AIRE))
ttk.Label(fila, text="Plan:", width=16, anchor="w").pack(side="left",
                                                         anchor="n")
columna = ttk.Frame(fila)
columna.pack(side="left", fill="x", expand=True)
WIDGETS["plan"] = ttk.Combobox(columna, textvariable=plan, state="readonly",
                               style="Formulario.TCombobox",
                               values=("Básico", "Profesional", "Empresa"))
WIDGETS["plan"].pack(fill="x")
ttk.Label(columna, textvariable=ERRORES["plan"], foreground=ROSA).pack(
    anchor="w")

ttk.Separator(cuerpo, orient="horizontal").pack(fill="x", pady=MARGEN)

botones = ttk.Frame(cuerpo)
botones.pack(fill="x")
ttk.Button(botones, text="Crear alta", command=enviar).pack(side="right")
ttk.Button(botones, text="Limpiar", command=limpiar).pack(side="right",
                                                          padx=(0, AIRE))
pie = ttk.Label(cuerpo, textvariable=resumen)
pie.pack(anchor="w", pady=(AIRE, 0))

# El validador de verdad necesita saber de qué campo es, así que se registra
# uno por campo con la clave metida dentro.
for clave in TODAS:
        widget = WIDGETS[clave]
    if widget.winfo_class() == "TCombobox":
        # Un Combobox de solo lectura no se escribe: basta con la traza.
                VALORES[clave].trace_add("write",
                                 lambda *_, c=clave: limpiar_error(c))
        continue
    orden = ventana.register(
        protegido(lambda nuevo, cuando, c=clave: validar_campo(nuevo, cuando, c)))
    widget.configure(validatecommand=(orden, "%P", "%V"))
    # Al volver a escribir se borra el aviso: no se regaña mientras se corrige.
    VALORES[clave].trace_add("write", lambda *_, c=clave: limpiar_error(c))

contar()
WIDGETS["nombre"].focus_set()
centrar(ventana)
ventana.mainloop()
```

> [!resumen] En resumen
>
> Validar un formulario son **dos trabajos distintos** que se confunden siempre: mientras se escribe se decide si un carácter puede estar ahí, y al enviar se decide si el dato está completo. La diferencia clave es el campo vacío: al escribir hay que permitirlo y al enviar hay que rechazarlo. De ahí el error de diseño más común: **un validador de teclado no puede juzgar si el dato está completo**, porque para llegar a nueve dígitos hay que pasar por uno, y si se rechaza el uno el campo queda mudo; mientras se escribe, `""`, `"1"`, `"1."` y hasta `"-"` son estados legítimos de camino, así que el validador de teclado solo decide sobre el **alfabeto**. Mecánicamente hay que registrar la función con `ventana.register`, y el `validatecommand` es una tupla con ese nombre y códigos de porcentaje, de los que **`%P` (el valor que tendría el campo si se permite) resuelve casi todo**, con `%V` para saber quién preguntó; los modos son `all`, `key`, `focus`, `focusin`, `focusout` y `none`, y se usan `key` y `focusout`. El fallo grave de la lección: **un validador que no devuelve un booleano de Tcl rompe el campo y apaga la validación**; el `return` olvidado devuelve `None`, el `insert()` lanza `TclError: expected boolean value but got "None"` (un mensaje que habla de un booleano y no apunta a tu función), el error propio sale aparte por la salida de errores, y **`validate` queda en `'none'` para siempre**, con lo que a partir de ahí entra cualquier cosa en silencio; también fallan `""`, `[]` y `"si"`, porque los booleanos son los de Tcl y están en inglés. Las dos defensas son un solo `return` con una expresión booleana y un envoltorio que haga `bool()` dentro de un `try`. La parte agradable y poco conocida: **`ttk` mantiene el estado `invalid` por su cuenta** según lo que devuelva el validador, así que con tres líneas de `style.map` (`fieldbackground=[("invalid", color)]`) se pintan todos los campos del formulario sin código en cada uno; y el método **`validate()` fuerza la comprobación**, devuelve el resultado, actualiza el estado y llama al `invalidcommand`, así que validar el formulario al enviar es un bucle llamándolo. Del criterio, que viene de la lección 36: **el aviso va junto al campo**, con un rótulo debajo que ocupa sitio siempre para que el formulario no salte, el campo pintado, el foco al primer fallo al enviar, y un resumen del estilo «2 campos por corregir» que dice cuánto queda; y **el aviso aparece al salir del campo, no mientras se escribe**, porque regañar a alguien por algo que iba a arreglar es hostil.

> [!ejercicio] Practica
>
> Trabaja en un fichero `39-formulario.py` salvo donde se indique otra cosa:
>
> 1. En `39-mudo.py`, escribe un validador de teclado que exija nueve dígitos exactos y comprueba que no se puede escribir nada. Arréglalo separando el alfabeto de la completitud.
> 2. Registra un validador con los ocho códigos de porcentaje e imprime lo que llega al escribir una letra, al borrar una del medio y al pegar texto.
> 3. En `39-olvidado.py`, escribe un validador con un `if` que devuelva `True` y sin `else`. Escribe un carácter no válido y copia los tres efectos: la excepción, lo que vale `validate` después y lo que entra a partir de entonces.
> 4. Prueba un validador que devuelva `None`, `""`, `"si"`, `1`, `"true"` y `[]`, y anota cuáles funcionan.
> 5. Escribe el envoltorio `protegido` y comprueba que un validador que lanza excepción ya no apaga la validación.
> 6. Imprime `campo.state()` antes y después de llamar a `campo.validate()` con contenido válido y con contenido inválido.
> 7. Monta el `style.map` del estado `invalid` y comprueba con `lookup` que el color está puesto. Quita el estilo y compara qué se ve.
> 8. Añade un `invalidcommand` que escriba el motivo en un rótulo y comprueba cuándo se dispara: al salir del campo y al forzar con `validate()`.
> 9. Cambia el formulario para que el aviso salga con `validate="key"` en vez de `focusout`. Rellénalo y decide cuál preferirías usar.
> 10. Sustituye los rótulos de error por un `messagebox` con todos los fallos juntos. Compáralos rellenando el formulario mal a propósito.
> 11. Haz que al enviar el foco vaya al primer campo mal. Después quítalo y cuenta cuántos clics de más hacen falta.
> 12. Añade un campo de fecha con su alfabeto (dígitos y barras, máximo diez) y su regla de dato (que sea una fecha real, con `datetime.strptime`).
