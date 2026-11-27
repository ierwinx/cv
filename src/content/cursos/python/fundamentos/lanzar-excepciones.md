---
titulo: "Lanzar tus propias excepciones"
resumen: "Cómo avisar con raise de que algo va mal, elegir el tipo adecuado, crear excepciones propias y encadenarlas sin perder información."
minutos: 12
orden: 51
---

Hasta ahora las excepciones te venían dadas: las lanzaba Python cuando `int()` no podía convertir o cuando un fichero no estaba. Pero tus propias funciones también pueden encontrarse con datos imposibles, y entonces tienes que decidir qué hacer.

Imagina una función que aplica un descuento y recibe un porcentaje de 150. Eso no tiene sentido. Tienes tres opciones: devolver `None`, imprimir un mensaje y seguir, o lanzar una excepción. Solo la tercera es buena, y vale la pena ver por qué.

## Por qué no devolver None ni imprimir

```python
# opción mala 1: devolver None
def calcular_descuento(precio, porcentaje):
        if not 0 <= porcentaje <= 100:
                return None
    return precio * (1 - porcentaje / 100)
```

Quien llame a esta función recibirá `None` y, si no lo comprueba, el error saldrá tres funciones más allá con un críptico `TypeError: unsupported operand type(s) for +: 'NoneType' and 'float'`, muy lejos del sitio donde estaba el problema de verdad. Además, `None` es ambiguo: puede significar "el dato era inválido", "no encontré nada" o "no aplica".

```python
# opción mala 2: imprimir y seguir
def calcular_descuento(precio, porcentaje):
        if not 0 <= porcentaje <= 100:
                print("Porcentaje incorrecto")
        return precio
```

Peor todavía. El programa continúa con un precio sin descontar como si nada hubiera pasado, el mensaje se pierde entre las cien líneas que imprime el programa, y si esa función se usa algún día en una web o en una aplicación con ventanas, no hay ninguna pantalla donde ese `print` se vea.

Una función no debe decidir qué hacer ante un error que no es suyo. Su trabajo es **avisar**, en voz alta y con detalle, y dejar que quien la llamó decida.

## raise

```python title="descuentos.py"
def calcular_descuento(precio: float, porcentaje: float) -> float:
        """Aplica un descuento en tanto por ciento a un precio."""
    if precio < 0:
                raise ValueError(f"El precio no puede ser negativo: {precio}")
    if not 0 <= porcentaje <= 100:
                raise ValueError(f"El porcentaje debe estar entre 0 y 100, no {porcentaje}")
    return round(precio * (1 - porcentaje / 100), 2)


print(calcular_descuento(120, 25))
print(calcular_descuento(120, 150))
```

```salida
90.0
Traceback (most recent call last):
  File "/Users/erwin/curso-python/descuentos.py", line 11, in <module>
    print(calcular_descuento(120, 150))
          ~~~~~~~~~~~~~~~~~~^^^^^^^^^^
  File "/Users/erwin/curso-python/descuentos.py", line 6, in calcular_descuento
    raise ValueError(f"El porcentaje debe estar entre 0 y 100, no {porcentaje}")
ValueError: El porcentaje debe estar entre 0 y 100, no 150
```

La sintaxis es `raise TipoDeError("mensaje")`. Ese `raise` detiene la función inmediatamente, como un `return` pero por la puerta de atrás, y la excepción sube por la cadena de llamadas hasta que alguien la capture con un `except` o hasta que llegue arriba y pare el programa.

Fíjate en lo que has ganado. El traceback tiene dos escalones: la línea que llamó mal y la línea que se quejó. El mensaje dice qué valor llegó (`150`) y qué se esperaba. Y quien use tu función puede decidir:

```python
try:
        precio_final = calcular_descuento(120, 150)
except ValueError as error:
        print(f"No he podido aplicar el descuento: {error}")
    precio_final = 120
```

> [!consejo] Falla pronto y con un mensaje concreto
>
> Un mensaje de excepción bueno contiene el valor que ha llegado y lo que se esperaba en su lugar. Compara `raise ValueError("porcentaje incorrecto")` con `raise ValueError(f"El porcentaje debe estar entre 0 y 100, no {porcentaje}")`. El segundo se arregla en diez segundos; el primero obliga a leer el código.
>
> Y lánzalo **al principio de la función**, antes de hacer ningún trabajo. Cuanto más cerca esté el error de su causa, menos tienes que investigar.

## Elegir el tipo adecuado

Python tiene una excepción para cada situación, y usar la que toca hace que quien llame a tu función pueda capturarla con precisión.

| Situación | Excepción |
| --- | --- |
| El valor no sirve, aunque el tipo sea correcto | `ValueError` |
| El tipo de dato no es el que se esperaba | `TypeError` |
| Falta una clave o una posición | `KeyError`, `IndexError` |
| La operación no se puede hacer en este momento | `RuntimeError` |
| Es una función que aún no has escrito | `NotImplementedError` |

La distinción entre las dos primeras es la que más se confunde:

```python
def repetir_mensaje(texto: str, veces: int) -> str:
        """Repite un texto un número de veces, separado por espacios."""
    if not isinstance(texto, str):
                raise TypeError(f"Se esperaba una cadena, ha llegado {type(texto)}")
    if veces < 1:
                raise ValueError(f"Hay que repetir al menos una vez, no {veces}")
    return " ".join([texto] * veces)
```

`TypeError` es para "esto no es la clase de cosa que necesito": me has dado un número donde iba texto. `ValueError` es para "esto es la clase de cosa correcta, pero este ejemplar concreto no vale": me has dado un entero, como pedía, pero vale `-3`.

## Tus propias excepciones

A veces ninguna excepción de Python describe bien tu problema. Que una cuenta no tenga saldo suficiente no es un `ValueError`: es algo específico de tu programa, y quieres que quien lo use pueda capturarlo por separado.

Crear una excepción propia son dos líneas:

```python
class SaldoInsuficiente(Exception):
        """El saldo de la cuenta no llega para hacer la operación."""
```

Esa es la receta completa. El nombre que elijas, la palabra `Exception` entre paréntesis, y un docstring que explique cuándo se lanza. No hace falta escribir nada más dentro.

> [!nota] Aquí hay una clase, y todavía no las hemos visto
>
> `class` es la palabra con la que se definen clases, el pilar de la programación orientada a objetos, y los paréntesis con `Exception` dentro son **herencia**: estás diciendo "mi excepción es un tipo de `Exception`, con todo lo que eso trae puesto". Ese mecanismo es lo que hace que tu excepción encaje en la jerarquía de la lección anterior y que un `except Exception` la capture.
>
> Nada de esto hay que entenderlo ahora. Trátalo como una fórmula que se copia tal cual y cámbiale el nombre. En las lecciones de clases y objetos, un poco más adelante en este mismo módulo, volverás a esta misma línea y la verás con otros ojos.

Con la excepción creada, se lanza y se captura igual que cualquier otra:

```python title="banco.py"
class SaldoInsuficiente(Exception):
        """El saldo de la cuenta no llega para hacer la operación."""


def retirar(saldo: float, cantidad: float) -> float:
        if cantidad <= 0:
                raise ValueError(f"La cantidad debe ser positiva, no {cantidad}")
    if cantidad > saldo:
                raise SaldoInsuficiente(f"Intentas sacar {cantidad} € y solo tienes {saldo} €")
    return saldo - cantidad


try:
        nuevo_saldo = retirar(50, 80)
except SaldoInsuficiente as error:
        print(f"Operación rechazada: {error}")
except ValueError as error:
        print(f"Datos incorrectos: {error}")

print(retirar(50, 20))
```

```salida
Operación rechazada: Intentas sacar 80 € y solo tienes 50 €
30
```

Y si nadie la captura, se comporta como cualquier excepción de Python, con tu nombre en la última línea. Este sería el mismo fichero con el `try` quitado y una llamada suelta a `retirar(50, 80)` en la línea 13:

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/banco.py", line 13, in <module>
    retirar(50, 80)
    ~~~~~~~^^^^^^^^
  File "/Users/erwin/curso-python/banco.py", line 9, in retirar
    raise SaldoInsuficiente(f"Intentas sacar {cantidad} € y solo tienes {saldo} €")
SaldoInsuficiente: Intentas sacar 80 € y solo tienes 50 €
```

Esa última línea, `SaldoInsuficiente: Intentas sacar 80 € y solo tienes 50 €`, es documentación gratis para quien se encuentre el fallo dentro de seis meses.

> [!consejo] Nombra las excepciones por el problema, no por la solución
>
> `SaldoInsuficiente`, `ConfiguracionInvalida`, `UsuarioNoEncontrado`. Describen qué ha pasado, no qué habría que hacer. Y por convención, los nombres de clase se escriben en `CapitalizadoSinGuiones`, que es la única excepción a la regla de PEP 8 de usar minúsculas y guiones bajos.

## Relanzar con raise a secas

A veces quieres enterarte de un fallo, hacer algo, y dejar que siga su camino igualmente. Un `raise` sin nada detrás, dentro de un `except`, relanza **la misma excepción** que acabas de capturar:

```python title="carga.py"
from datetime import datetime


def anotar_fallo(mensaje: str) -> None:
        momento = datetime.now().strftime("%H:%M:%S")
    print(f"[{momento}] REGISTRO: {mensaje}")


def cargar_datos(ruta: str) -> str:
        try:
                with open(ruta, encoding="utf-8") as fichero:
                        return fichero.read()
    except FileNotFoundError:
                anotar_fallo(f"no se ha encontrado {ruta}")
        raise


cargar_datos("clientes.csv")
```

```salida
[14:04:33] REGISTRO: no se ha encontrado clientes.csv
Traceback (most recent call last):
  File "/Users/erwin/curso-python/carga.py", line 18, in <module>
    cargar_datos("clientes.csv")
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^
  File "/Users/erwin/curso-python/carga.py", line 11, in cargar_datos
    with open(ruta, encoding="utf-8") as fichero:
         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'clientes.csv'
```

La hora del registro será la de tu ejecución. Lo importante es que el traceback señala la línea del `open()` original, no la del `raise`: la excepción conserva intacta su historia. Si en vez de `raise` a secas escribieras `raise FileNotFoundError(...)`, crearías una excepción nueva y perderías el rastro.

Este patrón es el de "anota y deja pasar": tu función no sabe cómo resolver el problema, pero sí quiere dejar constancia de que ocurrió.

## Encadenar con raise ... from

El otro caso es cuando sí quieres cambiar la excepción, traduciendo un fallo técnico de bajo nivel a uno que tenga sentido en tu programa. Ahí entra `from`:

```python title="configuracion.py"
class ConfiguracionInvalida(Exception):
        """El fichero de configuración no se puede usar."""


def leer_puerto(texto: str) -> int:
        """Convierte el puerto leído del fichero de configuración."""
    try:
                return int(texto)
    except ValueError as error:
                raise ConfiguracionInvalida(f"El puerto '{texto}' no es un número") from error


leer_puerto("ocho mil")
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/configuracion.py", line 8, in leer_puerto
    return int(texto)
ValueError: invalid literal for int() with base 10: 'ocho mil'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/erwin/curso-python/configuracion.py", line 13, in <module>
    leer_puerto("ocho mil")
    ~~~~~~~~~~~^^^^^^^^^^^^
  File "/Users/erwin/curso-python/configuracion.py", line 10, in leer_puerto
    raise ConfiguracionInvalida(f"El puerto '{texto}' no es un número") from error
ConfiguracionInvalida: El puerto 'ocho mil' no es un número
```

Salen **dos tracebacks** unidos por la frase `The above exception was the direct cause of the following exception`. Arriba, la causa técnica: `int()` no pudo con ese texto. Abajo, lo que significa en tu programa: la configuración no vale. Quien lo lea tiene las dos capas de información, y eso es exactamente lo que quieres cuando algo falla en producción a las tres de la mañana.

| Forma | Qué hace |
| --- | --- |
| `raise` | Relanza la misma excepción, sin tocar nada |
| `raise OtroError("mensaje") from error` | Lanza una nueva conservando la causa original |
| `raise OtroError("mensaje")` | Lanza una nueva; la causa original se pierde de vista |

> [!aviso] No olvides el from
>
> Si dentro de un `except` lanzas una excepción nueva sin `from`, Python todavía muestra la anterior, pero con la frase `During handling of the above exception, another exception occurred`, que en realidad significa "esto ha fallado mientras manejaba aquello" y suena a que tu manejador está roto. Con `from error` dices claramente "esto es una traducción de aquello". Es un detalle pequeño que cambia mucho la lectura.

## Cuándo lanzar y cuándo no

Lanzar una excepción es lo correcto cuando tu función **no puede cumplir lo que promete**: le han dado datos imposibles, falta un recurso, el estado no es el esperado.

No lances una excepción para algo que forma parte del funcionamiento normal. Buscar un cliente en una lista y no encontrarlo no es un error: es un resultado posible, y devolver `None` ahí está bien. La diferencia está en si la situación era previsible y aceptable, o si de verdad hace imposible continuar.

> [!resumen] En resumen
>
> `raise TipoDeError("mensaje")` avisa de que algo va mal, y es mejor que devolver `None` —que se propaga en silencio y estalla lejos— o que imprimir un aviso que nadie leerá. Elige el tipo con criterio: `ValueError` cuando el valor no sirve y `TypeError` cuando el tipo no es el esperado. Si ninguna excepción de Python encaja, crea la tuya con dos líneas, `class MiError(Exception):` y un docstring, una fórmula que se entiende del todo en las lecciones de clases y objetos. Dentro de un `except`, `raise` a secas relanza la excepción original con su traceback intacto, y `raise OtroError(...) from error` la traduce conservando la causa. Falla pronto y con mensajes que incluyan el valor concreto que ha llegado.

> [!ejercicio] Practica
>
> Crea `51-raise.py` y resuelve:
>
> 1. Escribe `calcular_imc(peso, altura)` que lance `ValueError` con un mensaje claro si el peso o la altura no son positivos.
> 2. Escribe `dividir(a, b)` que lance `ZeroDivisionError` con tu propio mensaje en español antes de intentar la división.
> 3. Crea la excepción `EdadInvalida` y úsala en una función `registrar_usuario(nombre, edad)` que la lance si la edad no está entre 0 y 120. Captúrala desde fuera y muestra un mensaje amable.
> 4. Escribe una función que valide una dirección de correo muy por encima (que contenga una `@` y un punto después) y lance `ValueError` si no la cumple. Pruébala con cinco direcciones, dos de ellas malas.
> 5. Coge la función `leer_puerto` del ejemplo y añádele el caso del puerto fuera del rango 1-65535, lanzando también `ConfiguracionInvalida`, pero esta vez sin `from` porque no hay causa previa.
> 6. Escribe una función que lea un JSON y, si el fichero no existe, anote el fallo por pantalla y relance la excepción con `raise` a secas. Comprueba que el traceback sigue señalando la línea del `open()`.
