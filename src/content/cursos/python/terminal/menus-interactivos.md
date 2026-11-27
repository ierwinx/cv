---
titulo: "Menús interactivos"
resumen: "El bucle del menú bien hecho: despacho con un diccionario de funciones en vez de cadenas de elif, submenús, pausas y redibujado."
minutos: 20
orden: 4
---

El proyecto del módulo 1 llevaba un menú: un `while True`, un `input` y un `match` con seis casos. Funcionaba, y con seis opciones se lee bien. El problema aparece en la séptima, en la octava y cuando alguien pide un submenú de informes: el `match` crece, el bucle principal deja de caber en la pantalla y añadir una opción obliga a tocar tres sitios distintos.

Un menú es, en realidad, una estructura de datos: una tabla que asocia lo que se teclea con lo que hay que ejecutar. Si lo escribes así, el bucle se queda en quince líneas para siempre y añadir opciones es añadir filas a la tabla.

> [!objetivo] Qué vas a aprender
>
> Escribir un bucle de menú reutilizable que despache las opciones mediante un diccionario que asocia teclas con funciones, dibujar el menú a partir de ese mismo diccionario, anidar submenús, volver atrás y salir limpiamente, y redibujar la pantalla en cada vuelta con una pausa entre operaciones.

## El bucle, pieza a pieza

Todo menú hace lo mismo tres veces por segundo: **dibujar, leer, despachar**. Escrito a lo bruto, con la cadena de condiciones que sale de forma natural:

```python
while True:
        print("=== AGENDA ===")
    print("  1. Listar contactos")
    print("  2. Añadir contacto")
    print("  0. Salir")
    elegida = input("\nElige una opción: ").strip()

    if elegida == "1":
                listar()
    elif elegida == "2":
                anadir()
    elif elegida == "0":
                break
    else:
                print("Opción no válida.")
```

Mira el código con atención y verás que **la información del menú está escrita dos veces**: el texto de cada opción en los `print` y el número de cada opción en los `elif`. Nada obliga a que coincidan. El día que insertes una opción en medio, o que cambies el orden, tendrás un menú que anuncia una cosa y hace otra, y el intérprete no se va a quejar.

Con `match` en vez de `elif` el código queda algo más limpio, pero la duplicación es exactamente la misma.

## Las funciones también son valores

La solución sale de algo que ya viste en la lección de funciones lambda: **el nombre de una función, sin paréntesis, es un valor como cualquier otro**. Se puede guardar en una variable, meter en una lista o poner en un diccionario.

```python
def saludar() -> None:
        print("Hola")


accion = saludar     # sin paréntesis: guardo la función
print(accion)
accion()             # con paréntesis: la llamo
```

```salida
<function saludar at 0x109373060>
Hola
```

La primera línea de la salida confirma que `accion` es la función, no su resultado. Ese número hexadecimal es la dirección donde vive y será distinto en cada ejecución.

Con esa idea, el menú entero cabe en un diccionario que asocia la tecla con el texto y con la función que hay que llamar:

```python
MENU = {
    "1": ("Listar contactos", listar),
    "2": ("Añadir contacto", anadir),
    "0": ("Salir", None),
}
```

Ya no hay duplicación: el texto y la acción de cada opción viven en la misma línea, y la tecla es la clave que los une. Añadir una opción es añadir una línea. Cambiar el orden es mover una línea. Y el `None` de la última marca la que termina el bucle.

> [!aviso] Nunca pongas los paréntesis en la tabla
>
> Es el error que se comete siempre. Con `("Listar contactos", listar())` la función **se ejecuta al construir el diccionario**, antes de que haya ningún menú en pantalla, y lo que se guarda en la tabla es lo que devuelve, normalmente `None`. Luego, al intentar llamarlo, salta un `TypeError`. Sin paréntesis se guarda la función; con paréntesis se guarda su resultado.

## Dibujar el menú desde el diccionario

Si la tabla lleva los textos, el menú se pinta recorriéndola:

```python
def dibujar_menu(titulo: str, opciones: dict) -> None:
        limpiar_pantalla()
    print(f"=== {titulo} ===")
    for tecla, (texto, accion) in opciones.items():
                flecha = " >" if isinstance(accion, dict) else ""
        print(f"  {tecla}. {texto}{flecha}")
```

El desempaquetado `for tecla, (texto, accion) in opciones.items()` es el mismo de la lección de recorrer diccionarios, con una tupla anidada en el valor. Y ese `isinstance(accion, dict)` es el que dibuja un `>` al lado de las opciones que abren un submenú, como enseguida verás.

## El bucle genérico

Ahora el bucle no sabe nada de contactos ni de informes. Solo sabe dibujar una tabla de opciones y llamar a lo que le digan, así que sirve para el menú principal y para todos los submenús:

```python
def bucle_menu(titulo: str, opciones: dict) -> None:
        """Dibuja el menú y ejecuta lo elegido hasta que se pide salir.

    Cada opción es una tupla (texto, accion), donde accion puede ser una
    función, otro diccionario de opciones (un submenú) o None para salir.
    """
    while True:
                dibujar_menu(titulo, opciones)
        try:
                        elegida = input("\nElige una opción: ").strip()
        except (EOFError, KeyboardInterrupt):
                        print()
            return

        if elegida not in opciones:
                        print(f"\n'{elegida}' no está en el menú.")
            pausa()
            continue

        texto, accion = opciones[elegida]
        if accion is None:
                        return
        if isinstance(accion, dict):
                        bucle_menu(texto, accion)
            continue
        accion()
        pausa()
```

Cinco decisiones que conviene entender antes de seguir:

- **`if elegida not in opciones` va antes de leer la tabla.** Sin esa comprobación, escribir una tecla que no existe lanzaría un `KeyError`. Comprobar la pertenencia a un diccionario es lo natural aquí, y sustituye al `case _` del `match`.
- **Las opciones son cadenas, no números.** No se convierte nada con `int()`, así que da igual que alguien teclee una letra: no está en el diccionario y ya está. Es la misma decisión que se tomó en el proyecto del módulo 1.
- **`accion is None` significa salir.** Es el `break` de siempre, escrito como un dato de la tabla en vez de como un caso especial del código. Sirve igual para el "Salir" del menú principal y para el "Volver" de un submenú, porque en los dos casos lo que hay que hacer es terminar este bucle.
- **`isinstance(accion, dict)` significa submenú.** El valor de la opción es otro diccionario de opciones, y lo que se hace con él es llamar a `bucle_menu` otra vez, con su propio título. El `continue` de después es importante: al volver de un submenú no hay ninguna operación que mostrar, así que no hay que pausar.
- **La captura de `EOFError` y `KeyboardInterrupt`** está aquí, en el único sitio que lee del teclado, tal como se vio en la lección anterior. Quien pulse <kbd>Ctrl</kbd> + <kbd>C</kbd> sale del menú como si hubiera elegido salir, sin traceback.

## La pausa y el redibujado

Dos funciones de una línea que marcan la diferencia entre un menú usable y uno que marea:

```python
def pausa() -> None:
        input("\nPulsa Intro para continuar... ")


def limpiar_pantalla() -> None:
        if LIMPIAR_PANTALLA:
                os.system("cls" if os.name == "nt" else "clear")
```

La pausa resuelve un problema real: sin ella, el resultado de la operación aparece y el menú se redibuja inmediatamente encima, así que no hay tiempo de leer nada. Con ella, quien usa el programa decide cuándo continuar. Que el valor devuelto por ese `input` se ignore no es un descuido: lo único que interesa es que la ejecución se detenga ahí.

El redibujado es la otra mitad. Al limpiar la pantalla antes de dibujar, el menú siempre está arriba y en el mismo sitio, en vez de ir bajando y dejando un rastro de menús viejos que hay que ir saltando con la vista.

> [!consejo] Deja el borrado de pantalla desactivable
>
> Ese `LIMPIAR_PANTALLA` es una constante del programa, y durante el desarrollo conviene ponerla en falso: con la pantalla limpiándose cada vuelta no se puede ver lo que imprimió la operación anterior, y depurar se vuelve incómodo. En la lección de variables de entorno verás cómo decidir esto desde fuera, sin tocar el código.

## Submenús

Un submenú es un diccionario dentro del diccionario. No hace falta ninguna función nueva, porque `bucle_menu` ya sabe reconocerlo:

```python
MENU = {
    "1": ("Listar contactos", listar),
    "2": ("Añadir contacto", anadir),
    "3": (
        "INFORMES",
        {
            "1": ("Número de contactos", informe_total),
            "2": ("Contactos por ciudad", informe_por_ciudad),
            "0": ("Volver", None),
        },
    ),
    "0": ("Salir", None),
}
```

Esta es la estructura anidada de la que hablaba la lección de estructuras anidadas, usada para algo útil. Y lo bonito es que no hay límite: un submenú puede contener otro submenú, y el mismo `bucle_menu` de quince líneas lo maneja, porque **se llama a sí mismo**. Una función que se llama a sí misma es una función recursiva; aquí no hace falta pensar mucho en ello, basta ver que cada nivel de menú es un bucle independiente que termina cuando se elige "Volver".

> [!nota] Por qué el texto del submenú va en mayúsculas
>
> Porque ese mismo texto se reutiliza como título de su pantalla: `bucle_menu(texto, accion)`. En el menú principal aparece como `3. INFORMES >` y al entrar, como `=== INFORMES ===`. Un solo dato, escrito una vez.

## El programa completo

```python title="agenda.py"
"""Agenda de contactos con un menú de dos niveles."""

import os
from collections import Counter

LIMPIAR_PANTALLA = True

contactos: list[dict[str, str]] = [
    {"nombre": "Ana Ruiz", "ciudad": "Madrid", "telefono": "600111222"},
    {"nombre": "Luis Soto", "ciudad": "Valencia", "telefono": "600333444"},
    {"nombre": "Marta Gil", "ciudad": "Madrid", "telefono": "600555666"},
]


def limpiar_pantalla() -> None:
        if LIMPIAR_PANTALLA:
                os.system("cls" if os.name == "nt" else "clear")


def pausa() -> None:
        input("\nPulsa Intro para continuar... ")


def dibujar_menu(titulo: str, opciones: dict) -> None:
        limpiar_pantalla()
    print(f"=== {titulo} ===")
    for tecla, (texto, accion) in opciones.items():
                flecha = " >" if isinstance(accion, dict) else ""
        print(f"  {tecla}. {texto}{flecha}")


def bucle_menu(titulo: str, opciones: dict) -> None:
        """Dibuja el menú y ejecuta lo elegido hasta que se pide salir.

    Cada opción es una tupla (texto, accion), donde accion puede ser una
    función, otro diccionario de opciones (un submenú) o None para salir.
    """
    while True:
                dibujar_menu(titulo, opciones)
        try:
                        elegida = input("\nElige una opción: ").strip()
        except (EOFError, KeyboardInterrupt):
                        print()
            return

        if elegida not in opciones:
                        print(f"\n'{elegida}' no está en el menú.")
            pausa()
            continue

        texto, accion = opciones[elegida]
        if accion is None:
                        return
        if isinstance(accion, dict):
                        bucle_menu(texto, accion)
            continue
        accion()
        pausa()


def listar() -> None:
        print(f"\nHay {len(contactos)} contactos:")
    for contacto in contactos:
                print(f"  {contacto['nombre']:<12} {contacto['ciudad']:<10} {contacto['telefono']}")


def anadir() -> None:
        nombre = input("\nNombre: ").strip()
    if not nombre:
                print("Sin nombre no hay contacto.")
        return
    ciudad = input("Ciudad: ").strip()
    telefono = input("Teléfono: ").strip()
    contactos.append({"nombre": nombre, "ciudad": ciudad, "telefono": telefono})
    print(f"Añadido {nombre}.")


def informe_total() -> None:
        print(f"\nTotal de contactos: {len(contactos)}")


def informe_por_ciudad() -> None:
        print()
    cuenta = Counter(contacto["ciudad"] for contacto in contactos)
    for ciudad, veces in cuenta.most_common():
                print(f"  {ciudad:<10} {veces}")


MENU = {
    "1": ("Listar contactos", listar),
    "2": ("Añadir contacto", anadir),
    "3": (
        "INFORMES",
        {
            "1": ("Número de contactos", informe_total),
            "2": ("Contactos por ciudad", informe_por_ciudad),
            "0": ("Volver", None),
        },
    ),
    "0": ("Salir", None),
}


def main() -> None:
        bucle_menu("AGENDA", MENU)
    print("Hasta luego.")


if __name__ == "__main__":
        main()
```

Un detalle de orden: `MENU` está definido **después** de las funciones a las que apunta y **antes** de `main`. Tiene que ser así, porque cuando Python ejecuta esa línea necesita que los nombres `listar` y `anadir` ya existan. Dentro de una función no pasaría, porque el cuerpo no se ejecuta hasta que se la llama, pero `MENU` se construye al importar el fichero.

## Una sesión completa

```bash
python3 agenda.py
```

```salida
=== AGENDA ===
  1. Listar contactos
  2. Añadir contacto
  3. INFORMES >
  0. Salir

Elige una opción: 1

Hay 3 contactos:
  Ana Ruiz     Madrid     600111222
  Luis Soto    Valencia   600333444
  Marta Gil    Madrid     600555666

Pulsa Intro para continuar... 
=== AGENDA ===
  1. Listar contactos
  2. Añadir contacto
  3. INFORMES >
  0. Salir

Elige una opción: 2

Nombre: Nuria Vega
Ciudad: Bilbao
Teléfono: 600777888
Añadido Nuria Vega.

Pulsa Intro para continuar... 
=== AGENDA ===
  1. Listar contactos
  2. Añadir contacto
  3. INFORMES >
  0. Salir

Elige una opción: 3
=== INFORMES ===
  1. Número de contactos
  2. Contactos por ciudad
  0. Volver

Elige una opción: 2

  Madrid     2
  Valencia   1
  Bilbao     1

Pulsa Intro para continuar... 
=== INFORMES ===
  1. Número de contactos
  2. Contactos por ciudad
  0. Volver

Elige una opción: 0
=== AGENDA ===
  1. Listar contactos
  2. Añadir contacto
  3. INFORMES >
  0. Salir

Elige una opción: 9

'9' no está en el menú.

Pulsa Intro para continuar... 
=== AGENDA ===
  1. Listar contactos
  2. Añadir contacto
  3. INFORMES >
  0. Salir

Elige una opción: 0
Hasta luego.
```

Esta transcripción está tomada con `LIMPIAR_PANTALLA` en falso, para que se vea la sesión entera de corrido. Con el valor verdadero, cada bloque que empieza por `=== AGENDA ===` sustituye al anterior en la misma pantalla y nunca hay que hacer scroll.

Fíjate en el paso por el submenú: entras con el `3`, la pantalla cambia a `=== INFORMES ===`, pides el informe por ciudad, y el `0` te devuelve al menú principal sin salir del programa. El segundo `0`, ya en el menú principal, sí termina.

## Cuando las acciones necesitan datos

El `bucle_menu` de la lección llama a las funciones sin argumentos, y las funciones trabajan sobre la lista `contactos`, que es una variable global. Para un programa de cien líneas es aceptable, pero ya sabes de la lección de ámbito que las globales se vuelven un problema en cuanto el programa crece.

La solución limpia es que cada función reciba los datos con los que trabaja. Y como la tabla solo guarda funciones sin argumentos, se usa una `lambda` para atar el argumento en el momento de construir la tabla:

```python
def construir_menu(agenda: list[dict[str, str]]) -> dict:
        return {
        "1": ("Listar contactos", lambda: listar(agenda)),
        "2": ("Añadir contacto", lambda: anadir(agenda)),
        "0": ("Salir", None),
    }
```

Cada `lambda` es una función sin parámetros que, al llamarla, llama a la de verdad con la agenda que le corresponde. Así `listar` y `anadir` reciben su lista por parámetro, no la buscan en el espacio global, y se podrían reutilizar con dos agendas distintas en el mismo programa.

> [!error] TypeError: 'NoneType' object is not callable
>
> Las dos causas son casi siempre las mismas. La primera, que hayas escrito los paréntesis en la tabla: `("Listar", listar())` guarda el `None` que devuelve la función en vez de la función. La segunda, que se te haya colado un `None` como acción de una opción que sí debía hacer algo. Si la opción es la de salir, el `if accion is None: return` tiene que estar **antes** de la llamada.

> [!error] KeyError: '9'
>
> Has leído el diccionario con una clave que no existe. En un menú es inevitable que ocurra, porque la clave la teclea una persona, así que la comprobación `if elegida not in opciones` va siempre antes del acceso. La alternativa, `opciones.get(elegida)`, también vale y devuelve `None` en vez de fallar, pero entonces hay que distinguir ese `None` del `None` que significa salir, y eso se lía.

> [!error] RecursionError: maximum recursion depth exceeded
>
> Sale si un submenú se contiene a sí mismo, directa o indirectamente: entras, entras otra vez, y cada entrada abre un `bucle_menu` nuevo sin que se cierre ninguno. Revisa que los submenús formen un árbol y que cada uno tenga su opción de volver.

> [!resumen] En resumen
>
> Un menú es una tabla de datos, no una cadena de condiciones. Guardando en un diccionario la tecla, el texto y la función de cada opción se elimina la duplicación entre lo que el menú anuncia y lo que ejecuta, y añadir una opción pasa a ser añadir una línea. El bucle genérico dibuja el menú recorriendo ese diccionario, comprueba con `in` que la tecla existe, trata el valor `None` como "salir de este bucle" y un diccionario anidado como un submenú, llamándose a sí mismo con él. Alrededor van dos comodidades imprescindibles: una pausa de "pulsa Intro" para poder leer el resultado y el borrado de pantalla en cada vuelta para que el menú esté siempre en el mismo sitio. Y si las acciones necesitan datos, se atan con una `lambda` al construir la tabla, en vez de dejarlos en una variable global.

> [!ejercicio] Practica
>
> Copia `agenda.py` y trabaja sobre él:
>
> 1. Añade una opción "Buscar por nombre" que pida un texto y muestre los contactos cuyo nombre lo contenga, sin distinguir mayúsculas. Usa `pedir_texto` de la lección anterior.
> 2. Añade un submenú "MANTENIMIENTO" con dos opciones: eliminar un contacto por su nombre y vaciar la agenda, esta última con una confirmación que no tenga valor por defecto.
> 3. Haz que el título del menú principal muestre cuántos contactos hay ahora mismo, como `=== AGENDA · 4 contactos ===`. Tendrás que construir el título en cada vuelta en vez de pasarlo una sola vez.
> 4. Guarda la agenda en un JSON al salir y cárgala al arrancar, reutilizando lo que hiciste en el proyecto del módulo 1.
> 5. Pasa el menú a la versión con `lambda` y agenda por parámetro, elimina la variable global y comprueba que todo sigue funcionando.
> 6. Añade al diccionario una opción con la tecla `a` en vez de un número y comprueba que no hay que cambiar nada del bucle. Piensa por qué.
