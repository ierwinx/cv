---
titulo: "Entrada robusta por teclado"
resumen: "Funciones reutilizables para pedir textos, números, fechas y confirmaciones sin que el programa muera cuando alguien escribe cualquier cosa."
minutos: 27
orden: 3
---

`input()` devuelve siempre una cadena, y en cuanto la conviertes empiezan los problemas. Quien usa tu programa va a escribir `treinta y cuatro` donde esperabas un número, va a pulsar Intro sin escribir nada, va a poner una coma donde tú querías un punto y va a escribir una fecha al estilo español. Ninguna de esas cosas es un error suyo: es un fallo de tu programa si no las aguanta.

La solución no es llenar el código de `try`/`except` por todas partes. Es escribir **un puñado de funciones de lectura, una vez, y usarlas siempre**. Eso es el contenido de esta lección: al terminar tendrás un módulo `entradas.py` que vas a reutilizar en el resto del módulo y, con suerte, en el resto de tu vida.

> [!objetivo] Qué vas a aprender
>
> Escribir funciones reutilizables para leer texto, enteros, decimales, fechas, confirmaciones y opciones, todas con validación y bucle de reintento; leer contraseñas sin eco con `getpass`; y controlar lo que ocurre cuando alguien pulsa <kbd>Ctrl</kbd> + <kbd>D</kbd> o <kbd>Ctrl</kbd> + <kbd>C</kbd>.

## Lo que pasa hoy

Este programa de dos líneas tiene tres formas distintas de romperse:

```python title="edad.py"
edad = int(input("Tu edad: "))
print(f"El año que viene tendrás {edad + 1}")
```

Si escribes letras:

```salida
Tu edad: treinta y cuatro
Traceback (most recent call last):
  File "/Users/erwin/curso-python/edad.py", line 1, in <module>
    edad = int(input("Tu edad: "))
ValueError: invalid literal for int() with base 10: 'treinta y cuatro'
```

Si pulsas Intro sin escribir nada:

```salida
Tu edad: 
Traceback (most recent call last):
  File "/Users/erwin/curso-python/edad.py", line 1, in <module>
    edad = int(input("Tu edad: "))
ValueError: invalid literal for int() with base 10: ''
```

Y si pulsas <kbd>Ctrl</kbd> + <kbd>D</kbd>, que significa "se ha terminado la entrada":

```salida
Tu edad: 
Traceback (most recent call last):
  File "/Users/erwin/curso-python/edad.py", line 1, in <module>
    edad = int(input("Tu edad: "))
               ~~~~~^^^^^^^^^^^^^
EOFError: EOF when reading a line
```

Tres pantallazos de traceback por un error de mecanografía. Y eso es solo la validación de tipo: `int("-5")` funciona perfectamente y una edad de menos cinco años no tiene sentido.

## El patrón de las tres piezas

Toda función de lectura robusta tiene la misma forma: un bucle infinito, un `try` que intenta convertir y un `except` que explica el problema y deja que el bucle dé otra vuelta.

```python
def pedir_entero(etiqueta: str) -> int:
        """Insiste hasta que escriban un número entero."""
    while True:
                try:
                        return int(input(f"{etiqueta}: "))
        except ValueError:
                        print("  Eso no es un número entero.")
```

```salida
Unidades: abc
  Eso no es un número entero.
Unidades: 
  Eso no es un número entero.
Unidades: 7
unidades=7
```

Fíjate en la estructura: el `return` está **dentro** del `try`. Si la conversión sale bien, la función termina ahí mismo y el bucle no vuelve a dar vueltas; si falla, el `except` imprime y el `while True` reintenta. No hace falta ninguna variable de control ni ningún `break`.

> [!consejo] Los dos sangrados del mensaje de error
>
> Los mensajes de aviso llevan dos espacios delante. Es un detalle de nada, pero deja claro de un vistazo qué ha escrito la persona y qué ha contestado el programa, sobre todo cuando hay varios reintentos seguidos.

## Un texto de la pregunta consistente

Antes de escribir seis funciones conviene decidir cómo se ven las preguntas, porque todas van a necesitar lo mismo: una etiqueta, a veces una pista del formato y a veces un valor por defecto. Una función pequeña lo compone:

```python
def _pregunta(etiqueta: str, pista: str = "", por_defecto: object = None) -> str:
        """Compone el texto de la pregunta: etiqueta, pista y valor por defecto."""
    texto = etiqueta
    if pista:
                texto += f" ({pista})"
    if por_defecto is not None:
                texto += f" [{por_defecto}]"
    return texto + ": "
```

Así, quien llama escribe `pedir_entero("Unidades", minimo=1, maximo=10)` y en la pantalla aparece `Unidades (1-10):`, sin tener que repetir el rango a mano en el texto. El guion bajo del nombre avisa de que es maquinaria interna del módulo.

La convención del paréntesis y del corchete no es un invento: es la de las herramientas de Unix. El paréntesis indica lo que se espera y el corchete, lo que va a pasar si pulsas Intro a secas.

## pedir\_texto

La más sencilla, y la que más se usa. Tres comportamientos en una función: insistir si está vacía, aceptar el vacío o devolver un valor por defecto.

```python
def pedir_texto(
    etiqueta: str,
    por_defecto: str | None = None,
    permitir_vacio: bool = False,
) -> str:
        """Lee una cadena. Insiste mientras esté vacía, salvo que se permita."""
    mensaje = _pregunta(etiqueta, por_defecto=por_defecto)
    while True:
                respuesta = input(mensaje).strip()
        if respuesta:
                        return respuesta
        if por_defecto is not None:
                        return por_defecto
        if permitir_vacio:
                        return ""
        print("  No puede quedar en blanco.")
```

El `.strip()` es obligatorio y no un adorno: un espacio de más al copiar y pegar no debería convertir una respuesta válida en un dato con basura. Y el orden de los tres `if` no es casual: primero se acepta lo que tiene contenido, después se aplica el valor por defecto, y solo al final se decide si el vacío vale o hay que insistir.

## pedir\_entero, con mínimo y máximo

Aquí se juntan las dos validaciones: que sea un entero y que esté en el rango razonable.

```python
def pedir_entero(
    etiqueta: str,
    minimo: int | None = None,
    maximo: int | None = None,
    por_defecto: int | None = None,
) -> int:
        """Lee un número entero dentro del rango indicado."""
    if minimo is not None and maximo is not None:
                pista = f"{minimo}-{maximo}"
    elif minimo is not None:
                pista = f"{minimo} o más"
    elif maximo is not None:
                pista = f"{maximo} o menos"
    else:
                pista = ""
    mensaje = _pregunta(etiqueta, pista, por_defecto)

    while True:
                escrito = input(mensaje).strip()
        if not escrito and por_defecto is not None:
                        return por_defecto
        try:
                        numero = int(escrito)
        except ValueError:
                        print(f"  '{escrito}' no es un número entero.")
            continue
        if minimo is not None and numero < minimo:
                        print(f"  Tiene que ser {minimo} o más.")
            continue
        if maximo is not None and numero > maximo:
                        print(f"  Tiene que ser {maximo} o menos.")
            continue
        return numero
```

Con esto, el programa del principio de la lección se vuelve insensible a los despistes:

```python
edad = pedir_entero("Tu edad", minimo=0, maximo=120)
print(f"El año que viene tendrás {edad + 1}")
```

```salida
Tu edad (0-120): treinta y cuatro
  'treinta y cuatro' no es un número entero.
Tu edad (0-120): 34,5
  '34,5' no es un número entero.
Tu edad (0-120): 
  '' no es un número entero.
Tu edad (0-120): 34
El año que viene tendrás 35
```

Dos decisiones que merecen explicación:

- **Los límites se comprueban con `continue`, no con `raise`.** Un valor fuera de rango no es un fallo del programa: es una respuesta que hay que corregir. El `continue` manda al bucle a preguntar otra vez, exactamente igual que el error de conversión.
- **`minimo` y `maximo` valen `None` por defecto**, y se comparan con `is not None` y no con un `if minimo:`. La diferencia importa: `if minimo:` daría falso con `minimo=0`, y un mínimo de cero es lo más habitual del mundo.

## pedir\_decimal y la coma española

Un decimal se lee igual, con dos diferencias: se convierte con `float` y se acepta la coma, porque en España es lo que la gente escribe.

```python
def pedir_decimal(
    etiqueta: str,
    minimo: float | None = None,
    maximo: float | None = None,
) -> float:
        """Lee un número con decimales y acepta la coma como separador."""
    mensaje = _pregunta(etiqueta)
    while True:
                escrito = input(mensaje).strip().replace(",", ".")
        try:
                        numero = float(escrito)
        except ValueError:
                        print(f"  '{escrito}' no es un número.")
            continue
        if minimo is not None and numero < minimo:
                        print(f"  Tiene que ser {minimo} o más.")
            continue
        if maximo is not None and numero > maximo:
                        print(f"  Tiene que ser {maximo} o menos.")
            continue
        return numero
```

Ese `.replace(",", ".")` de una línea evita un montón de frustración:

```python
precio = pedir_decimal("Precio en euros", minimo=0)
print(f"{precio=}")
print(f"Tres unidades: {precio * 3:.2f} €")
```

```salida
Precio en euros: doce euros
  'doce euros' no es un número.
Precio en euros: -3
  Tiene que ser 0 o más.
Precio en euros: 12,50
precio=12.5
Tres unidades: 37.50 €
```

> [!nota] Ojo con el separador de millares
>
> `replace(",", ".")` funciona con `12,50`, pero convierte `1.234,56` en `1.234.56`, que no es un número y será rechazado. Si tu programa maneja cantidades grandes escritas a mano, quita primero los puntos de millares y después cambia la coma por el punto. Para la mayoría de los casos, la versión simple sobra.

## pedir\_fecha

`date.fromisoformat` hace todo el trabajo de validación, incluidos los días imposibles como el 31 de febrero. Lo único que hay que hacer es capturar su `ValueError` y explicar el formato:

```python
def pedir_fecha(etiqueta: str, por_defecto: date | None = None) -> date:
        """Lee una fecha escrita como AAAA-MM-DD."""
    mensaje = _pregunta(etiqueta, "AAAA-MM-DD", por_defecto)
    while True:
                escrito = input(mensaje).strip()
        if not escrito and por_defecto is not None:
                        return por_defecto
        try:
                        return date.fromisoformat(escrito)
        except ValueError as error:
                        print(f"  Fecha no válida: {error}.")
```

Aquí el mensaje del `except` reaprovecha el texto de la excepción, que es sorprendentemente claro, como se ve en el ejemplo grande de más abajo. La función devuelve un objeto `date`, no una cadena, así que quien la llame puede restar fechas o compararlas sin más conversiones.

## pedir\_confirmacion

Preguntar "¿seguro?" parece trivial hasta que te pones. Hay que aceptar `s`, `si`, `sí` y `n` y `no`, no distinguir mayúsculas, y dejar que Intro signifique la respuesta más probable.

```python
AFIRMATIVAS = {"s", "si", "sí", "y", "yes"}
NEGATIVAS = {"n", "no"}


def pedir_confirmacion(etiqueta: str, por_defecto: bool | None = None) -> bool:
        """Lee un sí o un no. Con por_defecto, Intro ya vale como respuesta."""
    if por_defecto is True:
                pista = "S/n"
    elif por_defecto is False:
                pista = "s/N"
    else:
                pista = "s/n"
    mensaje = _pregunta(etiqueta, pista)

    while True:
                respuesta = input(mensaje).strip().lower()
        if not respuesta and por_defecto is not None:
                        return por_defecto
        if respuesta in AFIRMATIVAS:
                        return True
        if respuesta in NEGATIVAS:
                        return False
        print("  Responde s o n.")
```

```python
print(pedir_confirmacion("¿Continuar?", por_defecto=True))
print(pedir_confirmacion("¿Borro el fichero?"))
print(pedir_confirmacion("¿Guardar los cambios?", por_defecto=False))
print(pedir_confirmacion("¿Seguro?"))
```

```salida
¿Continuar? (S/n): 
True
¿Borro el fichero? (s/n): s
True
¿Guardar los cambios? (s/N): 
False
¿Seguro? (s/n): no
False
```

Tres detalles con su razón:

- **Los conjuntos, no listas.** La comprobación `in` sobre un conjunto es inmediata y el conjunto deja claro que no hay orden ni repeticiones. Además se lee mejor: añadir `"vale"` a `AFIRMATIVAS` es evidente.
- **La mayúscula de la pista indica el valor por defecto.** `(S/n)` significa "si pulsas Intro, digo sí". Es la convención de todo Unix y quien use tu programa la entenderá sin explicaciones.
- **Sin `por_defecto`, Intro no vale.** Para una pregunta peligrosa, como borrar un fichero, no hay respuesta por defecto y hay que escribir algo. Eso es deliberado: la tecla Intro es la que más se pulsa por inercia.

## pedir\_opcion

La variante de elegir entre unas pocas posibilidades, que verás en la lección de menús:

```python
def pedir_opcion(etiqueta: str, validas: list[str]) -> str:
        """Lee una de las opciones dadas, sin distinguir mayúsculas."""
    permitidas = {opcion.lower(): opcion for opcion in validas}
    mensaje = _pregunta(etiqueta, "/".join(validas))
    while True:
                respuesta = input(mensaje).strip().lower()
        if respuesta in permitidas:
                        return permitidas[respuesta]
        print(f"  Elige una de estas: {', '.join(validas)}.")
```

```python
color = pedir_opcion("Color", ["rojo", "verde", "azul"])
print(f"{color=}")
```

```salida
Color (rojo/verde/azul): roja
  Elige una de estas: rojo, verde, azul.
Color (rojo/verde/azul): verde
color='verde'
```

El diccionario por comprensión asocia la versión en minúsculas con la original. Así quien escriba `VERDE` obtiene `"verde"`, con la grafía exacta que espera el resto del programa, y no la que haya teclado.

## Contraseñas sin eco

Si lees una contraseña con `input()`, aparece escrita en la pantalla y se queda ahí, visible para quien pase por detrás y para quien mire el historial de la sesión. `getpass`, de la biblioteca estándar, lee sin mostrar nada:

```python
from getpass import getpass

clave = getpass("Contraseña: ")
print(f"He leído {len(clave)} caracteres")
```

```salida
Contraseña: 
He leído 7 caracteres
```

Mientras escribes no se ve nada: ni asteriscos ni puntos. Es lo normal en Unix y desconcierta la primera vez, pero está bien: no se filtra ni la longitud.

Con el patrón de siempre se construye una versión que además pide la contraseña dos veces:

```python
def pedir_contrasena(etiqueta: str = "Contraseña", minimo: int = 8) -> str:
        """Lee una contraseña sin mostrarla y la pide dos veces."""
    while True:
                primera = getpass(_pregunta(etiqueta, f"{minimo} caracteres o más"))
        if len(primera) < minimo:
                        print(f"  Demasiado corta: {len(primera)} caracteres.")
            continue
        segunda = getpass(_pregunta("Repítela"))
        if primera != segunda:
                        print("  No coinciden. Otra vez.")
            continue
        return primera
```

> [!aviso] getpass necesita una terminal de verdad
>
> Si ejecutas un programa con `getpass` desde un editor que captura la salida, o con la entrada redirigida, no puede apagar el eco y avisa:
>
> ```salida
> Warning: Password input may be echoed.
> ```
>
> Es un `GetPassWarning` y significa lo que dice: lo que escribas se va a ver. Prueba estos ejemplos en una terminal de verdad.

## Ctrl+D y Ctrl+C

Quedan dos teclas que no escriben texto sino que interrumpen la lectura, y conviene saber qué lanza cada una:

| Tecla | Significa | Excepción |
| --- | --- | --- |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | Se ha terminado la entrada | `EOFError` |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Cancela lo que estés haciendo | `KeyboardInterrupt` |

Las dos atraviesan tu bucle `while True` sin inmutarse, porque no son `ValueError`. Y eso es lo correcto: si alguien quiere salirse, hay que dejarle. Lo que no hay que hacer es enseñarle un traceback, así que se capturan **arriba**, en el `main`, y no dentro de cada función de lectura:

```python
def main() -> None:
        try:
                nombre = pedir_texto("Nombre")
    except (EOFError, KeyboardInterrupt):
                print("\nCancelado.")
        return
    print(f"Hola, {nombre}.")
```

```salida
Nombre: 
Cancelado.
```

Ese `\n` del principio del mensaje no está de adorno: cuando cancelas, el cursor está al final de la línea de la pregunta, y sin el salto el "Cancelado" saldría pegado a ella.

> [!consejo] Captúralas una sola vez, en el sitio más alto
>
> Poner `except KeyboardInterrupt` dentro de `pedir_entero` obliga a decidir ahí qué valor devolver, y no hay ninguna respuesta buena. Capturarlas en el `main`, alrededor de todo el programa, permite una salida limpia con un mensaje y un código de salida correcto, que es el tema de otra lección de este módulo.

## El módulo completo

Junta todo esto en un fichero al lado de tus programas y ya no vuelves a escribir un `try` de conversión en la vida:

```python title="entradas.py"
"""Funciones para leer datos por teclado sin que el programa se rompa."""

from datetime import date
from getpass import getpass

AFIRMATIVAS = {"s", "si", "sí", "y", "yes"}
NEGATIVAS = {"n", "no"}


def _pregunta(etiqueta: str, pista: str = "", por_defecto: object = None) -> str:
        """Compone el texto de la pregunta: etiqueta, pista y valor por defecto."""
    texto = etiqueta
    if pista:
                texto += f" ({pista})"
    if por_defecto is not None:
                texto += f" [{por_defecto}]"
    return texto + ": "


def pedir_texto(
    etiqueta: str,
    por_defecto: str | None = None,
    permitir_vacio: bool = False,
) -> str:
        """Lee una cadena. Insiste mientras esté vacía, salvo que se permita."""
    mensaje = _pregunta(etiqueta, por_defecto=por_defecto)
    while True:
                respuesta = input(mensaje).strip()
        if respuesta:
                        return respuesta
        if por_defecto is not None:
                        return por_defecto
        if permitir_vacio:
                        return ""
        print("  No puede quedar en blanco.")


def pedir_entero(
    etiqueta: str,
    minimo: int | None = None,
    maximo: int | None = None,
    por_defecto: int | None = None,
) -> int:
        """Lee un número entero dentro del rango indicado."""
    if minimo is not None and maximo is not None:
                pista = f"{minimo}-{maximo}"
    elif minimo is not None:
                pista = f"{minimo} o más"
    elif maximo is not None:
                pista = f"{maximo} o menos"
    else:
                pista = ""
    mensaje = _pregunta(etiqueta, pista, por_defecto)

    while True:
                escrito = input(mensaje).strip()
        if not escrito and por_defecto is not None:
                        return por_defecto
        try:
                        numero = int(escrito)
        except ValueError:
                        print(f"  '{escrito}' no es un número entero.")
            continue
        if minimo is not None and numero < minimo:
                        print(f"  Tiene que ser {minimo} o más.")
            continue
        if maximo is not None and numero > maximo:
                        print(f"  Tiene que ser {maximo} o menos.")
            continue
        return numero


def pedir_decimal(
    etiqueta: str,
    minimo: float | None = None,
    maximo: float | None = None,
) -> float:
        """Lee un número con decimales y acepta la coma como separador."""
    mensaje = _pregunta(etiqueta)
    while True:
                escrito = input(mensaje).strip().replace(",", ".")
        try:
                        numero = float(escrito)
        except ValueError:
                        print(f"  '{escrito}' no es un número.")
            continue
        if minimo is not None and numero < minimo:
                        print(f"  Tiene que ser {minimo} o más.")
            continue
        if maximo is not None and numero > maximo:
                        print(f"  Tiene que ser {maximo} o menos.")
            continue
        return numero


def pedir_fecha(etiqueta: str, por_defecto: date | None = None) -> date:
        """Lee una fecha escrita como AAAA-MM-DD."""
    mensaje = _pregunta(etiqueta, "AAAA-MM-DD", por_defecto)
    while True:
                escrito = input(mensaje).strip()
        if not escrito and por_defecto is not None:
                        return por_defecto
        try:
                        return date.fromisoformat(escrito)
        except ValueError as error:
                        print(f"  Fecha no válida: {error}.")


def pedir_confirmacion(etiqueta: str, por_defecto: bool | None = None) -> bool:
        """Lee un sí o un no. Con por_defecto, Intro ya vale como respuesta."""
    if por_defecto is True:
                pista = "S/n"
    elif por_defecto is False:
                pista = "s/N"
    else:
                pista = "s/n"
    mensaje = _pregunta(etiqueta, pista)

    while True:
                respuesta = input(mensaje).strip().lower()
        if not respuesta and por_defecto is not None:
                        return por_defecto
        if respuesta in AFIRMATIVAS:
                        return True
        if respuesta in NEGATIVAS:
                        return False
        print("  Responde s o n.")


def pedir_opcion(etiqueta: str, validas: list[str]) -> str:
        """Lee una de las opciones dadas, sin distinguir mayúsculas."""
    permitidas = {opcion.lower(): opcion for opcion in validas}
    mensaje = _pregunta(etiqueta, "/".join(validas))
    while True:
                respuesta = input(mensaje).strip().lower()
        if respuesta in permitidas:
                        return permitidas[respuesta]
        print(f"  Elige una de estas: {', '.join(validas)}.")


def pedir_contrasena(etiqueta: str = "Contraseña", minimo: int = 8) -> str:
        """Lee una contraseña sin mostrarla y la pide dos veces."""
    while True:
                primera = getpass(_pregunta(etiqueta, f"{minimo} caracteres o más"))
        if len(primera) < minimo:
                        print(f"  Demasiado corta: {len(primera)} caracteres.")
            continue
        segunda = getpass(_pregunta("Repítela"))
        if primera != segunda:
                        print("  No coinciden. Otra vez.")
            continue
        return primera
```

Y así se usa, con el módulo al lado del programa:

```python title="alta.py"
from datetime import date

from entradas import (
    pedir_confirmacion,
    pedir_entero,
    pedir_fecha,
    pedir_texto,
)

nombre = pedir_texto("Nombre")
ciudad = pedir_texto("Ciudad", por_defecto="Madrid")
cantidad = pedir_entero("Unidades", minimo=1, maximo=10)
vence = pedir_fecha("Vence el", por_defecto=date(2026, 12, 31))
urgente = pedir_confirmacion("¿Es urgente?", por_defecto=False)

print()
print(f"{nombre=}")
print(f"{ciudad=}")
print(f"{cantidad=}")
print(f"{vence=}")
print(f"{urgente=}")
```

Una sesión con todos los despistes posibles:

```salida
Nombre: 
  No puede quedar en blanco.
Nombre:   Erwin
Ciudad [Madrid]: 
Unidades (1-10): abc
  'abc' no es un número entero.
Unidades (1-10): 0
  Tiene que ser 1 o más.
Unidades (1-10): 3
Vence el (AAAA-MM-DD) [2026-12-31]: 19/09/2026
  Fecha no válida: Invalid isoformat string: '19/09/2026'.
Vence el (AAAA-MM-DD) [2026-12-31]: 2026-13-01
  Fecha no válida: month must be in 1..12, not 13.
Vence el (AAAA-MM-DD) [2026-12-31]: 
¿Es urgente? (s/N): SÍ

nombre='Erwin'
ciudad='Madrid'
cantidad=3
vence=datetime.date(2026, 12, 31)
urgente=True
```

Veintiuna líneas de programa, ni un `try` a la vista y nada de lo que se ha escrito lo ha tumbado. Los espacios de `Erwin` han desaparecido, la ciudad ha salido del valor por defecto, la fecha con barras se ha rechazado con una explicación y el `SÍ` en mayúsculas con acento se ha entendido.

> [!error] ValueError: invalid literal for int() with base 10: ''
>
> La cadena vacía no se puede convertir a número. Sale al pulsar Intro sin escribir nada delante de un `int(input(...))`. Con `pedir_entero` está resuelto, pero si lo ves en tu código significa que se te ha escapado un `int(input(...))` suelto.

> [!error] ValueError: invalid literal for int() with base 10: '3.0'
>
> `int()` no acepta la representación de un decimal, ni siquiera cuando la parte decimal es cero. Si quieres tragarte `3.0` como 3, convierte primero a `float` y luego a `int`, a sabiendas de que eso trunca: `int(float("3.9"))` da 3, no 4.

> [!error] EOFError: EOF when reading a line
>
> Se ha terminado la entrada y `input()` no tiene nada que leer. Las dos causas normales son que alguien haya pulsado <kbd>Ctrl</kbd> + <kbd>D</kbd> o que el programa se esté ejecutando con la entrada redirigida desde un fichero que ya se ha acabado. Captúralo en el `main` y termina con un mensaje.

> [!resumen] En resumen
>
> Convertir directamente lo que devuelve `input()` es una fuente garantizada de tracebacks. El patrón que lo resuelve son tres piezas: un `while True`, un `try` con el `return` dentro y un `except` que explica el problema y deja que el bucle reintente. Sobre ese patrón se construyen `pedir_texto`, `pedir_entero`, `pedir_decimal`, `pedir_fecha`, `pedir_confirmacion` y `pedir_opcion`, todas con `.strip()`, con validación de rango resuelta con `continue` y con un valor por defecto que se acepta al pulsar Intro. Las contraseñas se leen con `getpass`, que no muestra nada. Y <kbd>Ctrl</kbd> + <kbd>D</kbd> y <kbd>Ctrl</kbd> + <kbd>C</kbd> lanzan `EOFError` y `KeyboardInterrupt`, que se capturan una sola vez en el `main` para salir limpiamente. Todo junto en un `entradas.py` que se reutiliza en cada programa nuevo.

> [!ejercicio] Practica
>
> Crea el módulo `entradas.py` con las funciones de la lección y un fichero `03-pruebas.py` que las use:
>
> 1. Añade a `entradas.py` una función `pedir_hora(etiqueta)` que lea una hora en formato `HH:MM` y devuelva un objeto `time`. Mira `datetime.time.fromisoformat` y captura su `ValueError`.
> 2. Añade `pedir_lista(etiqueta, separador=",")`, que lea varios valores en una línea y devuelva una lista de cadenas ya limpias de espacios y sin elementos vacíos.
> 3. Añade a `pedir_texto` un parámetro `maximo` con el número de caracteres permitidos, y rechaza con un mensaje lo que se pase.
> 4. Añade `pedir_entero_o_nada(etiqueta)`, que devuelva un `int` o `None` si la persona pulsa Intro sin escribir. Piensa en qué caso de un menú te haría falta.
> 5. Escribe en `03-pruebas.py` un formulario de alta de un producto que use al menos cinco de las funciones y que imprima al final una ficha alineada con lo recogido. Envuélvelo en un `try` que capture <kbd>Ctrl</kbd> + <kbd>C</kbd> y despida con "Alta cancelada".
> 6. Vuelve al `gestor.py` del proyecto del módulo 1 y sustituye su `pedir_entero`, que devolvía `None`, por el de `entradas.py`. Fíjate en qué cambia la experiencia de uso y decide cuál prefieres para un menú.
