---
titulo: "Manejar errores con try y except"
resumen: "Cómo hacer que un programa sobreviva a lo inesperado en lugar de morirse, y por qué no basta con comprobarlo todo antes."
minutos: 11
orden: 49
---

Tu programa pide una edad, alguien escribe "treinta" y todo se viene abajo con un `ValueError`. Abre un fichero que alguien ha movido y muere con `FileNotFoundError`. Divide entre una variable que resulta valer cero y se acabó.

Hasta ahora, cuando algo fallaba, el programa terminaba y ya está. Eso está bien mientras aprendes, pero un programa que va a usar otra persona no puede escupir un traceback y cerrarse. Tiene que darse cuenta, decir algo comprensible y seguir. Esa es la diferencia entre un ejercicio y una herramienta.

## Errores de sintaxis y excepciones

No son lo mismo, y conviene tenerlo claro desde el principio.

Un **error de sintaxis** es código que no es Python. El intérprete lo detecta al leer el fichero, antes de ejecutar ni una línea:

```python
if edad > 18
        print("mayor de edad")
```

```salida
SyntaxError: expected ':'
```

Ese programa no arranca. No hay nada que manejar: hay que arreglarlo y punto. Un `SyntaxError` nunca se captura, porque tu código nunca llega a ejecutarse.

Una **excepción** es distinta: el código es válido, el programa arranca y funciona, y en un momento dado se encuentra con algo que no puede hacer.

```python title="edad.py"
entrada = input("Escribe tu edad: ")
edad = int(entrada)
print(f"El año que viene cumplirás {edad + 1}")
```

```salida
Escribe tu edad: treinta
Traceback (most recent call last):
  File "/Users/erwin/curso-python/edad.py", line 2, in <module>
    edad = int(entrada)
ValueError: invalid literal for int() with base 10: 'treinta'
```

El programa era correcto. Con `34` habría funcionado. Lo que ha fallado es el dato, no el código, y eso solo se descubre en tiempo de ejecución. Las excepciones **sí** se pueden capturar, y de eso va el resto de la lección.

|  | Error de sintaxis | Excepción |
| --- | --- | --- |
| Cuándo aparece | Al leer el fichero | Durante la ejecución |
| El programa arranca | No | Sí |
| Se puede capturar | No | Sí |
| Cómo se arregla | Corrigiendo el código | Previendo el caso |

## Por qué no basta con comprobarlo antes

La reacción natural es pensar que si compruebas todo con un `if`, no hace falta nada más. A veces funciona:

```python
entrada = input("Escribe tu edad: ").strip()

if entrada.isdigit():
        print(f"El año que viene cumplirás {int(entrada) + 1}")
else:
        print("Eso no era un número entero.")
```

Pero esta estrategia se queda corta por tres motivos.

**No puedes prever todos los casos.** `isdigit()` parecía suficiente y no acepta negativos ni el signo `+`, así que `"-5"` se cuela por el `else` como si fuera texto. Cada validación a mano tiene agujeros que descubres con el tiempo, uno a uno.

**Hay comprobaciones que mienten.** Este código parece seguro:

```python
from pathlib import Path

ruta = Path("datos.csv")
if ruta.exists():
        with open(ruta, encoding="utf-8") as fichero:   # puede fallar igualmente
                contenido = fichero.read()
```

Entre la línea del `if` y la del `open` pasa un instante. En ese instante otro programa puede borrar el fichero, el pendrive puede desconectarse o la red puede caerse. Se llama **condición de carrera**, y no se arregla comprobando más: el único que sabe de verdad si se puede abrir un fichero es quien lo abre.

**Ensucia el código.** Validar cada dato con su `if` antes de usarlo llena el programa de comprobaciones y entierra lo que realmente hace.

La filosofía de Python para esto tiene nombre propio: *es más fácil pedir perdón que permiso*. Intenta hacer lo que quieres hacer y prepárate para el caso en que salga mal.

## try y except

```python title="edad.py"
try:
        entrada = input("Escribe tu edad: ")
    edad = int(entrada)
    print(f"El año que viene cumplirás {edad + 1}")
except ValueError:
        print("Eso no es un número entero.")

print("El programa continúa.")
```

Con un dato válido:

```salida
Escribe tu edad: 34
El año que viene cumplirás 35
El programa continúa.
```

Y con uno que no lo es:

```salida
Escribe tu edad: treinta
Eso no es un número entero.
El programa continúa.
```

Lo importante es la última línea: en los dos casos el programa sigue vivo.

El funcionamiento es este. Python ejecuta el bloque `try` línea a línea. Si todo va bien, al llegar al final salta el `except` y continúa. Si alguna línea lanza un `ValueError`, **se abandona el resto del `try` inmediatamente** y se ejecuta el `except`.

Ese "se abandona el resto" tiene una consecuencia práctica:

```python
try:
        edad = int("treinta")
    print("Esta línea no se ejecuta nunca")
except ValueError:
        print("Aquí sí")
```

```salida
Aquí sí
```

> [!consejo] Mete en el try lo mínimo imprescindible
>
> Un `try` de veinte líneas con un solo `except ValueError` es difícil de razonar: no sabes cuál de las veinte lo lanzó, ni en qué estado quedó todo. Rodea solo la operación que puede fallar y deja fuera lo demás.

## El caso canónico: pedir un dato hasta que sea válido

Junta `while True`, `try` y `return` y tienes la función que vas a copiar en todos tus programas de terminal:

```python title="entrada.py"
def pedir_entero(mensaje: str) -> int:
        """Pide un número entero por teclado hasta que la persona escriba uno válido."""
    while True:
                entrada = input(mensaje)
        try:
                        return int(entrada)
        except ValueError:
                        print(f"'{entrada}' no es un número entero. Inténtalo otra vez.")


edad = pedir_entero("¿Cuántos años tienes? ")
print(f"Dentro de diez años tendrás {edad + 10}.")
```

```salida
¿Cuántos años tienes? treinta
'treinta' no es un número entero. Inténtalo otra vez.
¿Cuántos años tienes? 30,5
'30,5' no es un número entero. Inténtalo otra vez.
¿Cuántos años tienes? 
'' no es un número entero. Inténtalo otra vez.
¿Cuántos años tienes? 30
Dentro de diez años tendrás 40.
```

Tres detalles que hacen que esto funcione tan bien:

- El bucle es `while True`, infinito a propósito. La única salida es el `return`, que solo se alcanza si `int()` no ha lanzado nada.
- El `return` está **dentro** del `try`. Si la conversión falla, no se llega a devolver nada y el bucle da otra vuelta.
- El mensaje de error incluye lo que se escribió, entre comillas. Así, cuando alguien mete un espacio de más o una línea vacía, lo ve.

Con una versión de esta función para enteros y otra para decimales, tienes resuelta la entrada de datos de casi cualquier programa.

## Por qué except: a secas es mala idea

Se puede escribir `except:` sin decir qué excepción, y entonces captura absolutamente todo. Es tentador y es un error.

```python
try:
        precio = float(input("Precio sin IVA: "))
    print(f"Con IVA son {precoi * 1.21:.2f} €")
except:
        print("No he entendido el precio.")
```

```salida
Precio sin IVA: 100
No he entendido el precio.
```

Mira el precio: `100` es perfectamente válido. El mensaje es mentira. Lo que ha pasado es que hay una errata en la tercera línea, `precoi` en vez de `precio`, y el `except:` se ha tragado el `NameError` y lo ha disfrazado de problema con el dato.

Cambia solo esa línea por `except ValueError:` y el fallo sale a la luz:

```salida
Precio sin IVA: 100
Traceback (most recent call last):
  File "/Users/erwin/curso-python/iva.py", line 3, in <module>
    print(f"Con IVA son {precoi * 1.21:.2f} €")
                         ^^^^^^
NameError: name 'precoi' is not defined. Did you mean: 'precio'?
```

Eso es exactamente lo que quieres: la excepción que habías previsto se maneja, y la que no habías previsto —tu propio fallo— llega hasta ti con su traceback y su sugerencia.

> [!aviso] El except a secas también atrapa el Ctrl+C
>
> Cuando pulsas <kbd>Ctrl</kbd> + <kbd>C</kbd> para abortar un programa, Python lanza una excepción llamada `KeyboardInterrupt`. Un `except:` desnudo la captura igual que las demás, así que un programa con un `except:` dentro de un bucle puede volverse imposible de parar: cada vez que intentas cortarlo, se come la interrupción y sigue. Si algún día te pasa, ya sabes dónde mirar.

> [!consejo] Captura siempre la excepción concreta
>
> Pregúntate "¿qué puede salir mal aquí?" y captura eso: `ValueError` en las conversiones, `FileNotFoundError` al abrir ficheros, `KeyError` al leer diccionarios, `ZeroDivisionError` al dividir. Todo lo que no hayas nombrado debe seguir reventando, porque es información que necesitas. En la siguiente lección verás cómo manejar varias a la vez.

## Un ejemplo con ficheros

El otro caso de todos los días: leer un fichero de configuración que puede no existir.

```python
def leer_nombre_usuario(ruta: str) -> str:
        """Devuelve el nombre guardado en el fichero, o uno genérico si no lo hay."""
    try:
                with open(ruta, encoding="utf-8") as fichero:
                        return fichero.read().strip()
    except FileNotFoundError:
                return "invitado"


print(f"Hola, {leer_nombre_usuario('usuario.txt')}")
```

Si el fichero existe, devuelve su contenido. Si no, devuelve `"invitado"` y el programa arranca igual. Esto es lo que hace cualquier aplicación la primera vez que la abres.

> [!nota] No captures lo que no vas a manejar
>
> Capturar una excepción solo tiene sentido si vas a hacer algo útil con ella: poner un valor por defecto, pedir el dato otra vez, avisar y seguir con lo siguiente. Si lo único que se te ocurre es volver a lanzarla o imprimir el error y morir, no la captures: el traceback que da Python por su cuenta es más informativo que cualquier mensaje que escribas.

> [!resumen] En resumen
>
> Un error de sintaxis impide que el programa arranque y solo se arregla corrigiendo el código; una excepción ocurre durante la ejecución y se puede capturar. Comprobarlo todo con `if` antes no basta, porque siempre hay casos que no previste y porque entre la comprobación y el uso pueden cambiar las cosas. La estructura es `try` con el código que puede fallar y `except TipoDeError` con lo que hacer si falla; en cuanto salta la excepción se abandona el resto del `try`. El patrón que más usarás es un `while True` con un `try` dentro que devuelve el dato cuando por fin es válido. Y nunca escribas `except:` a secas: capturar todo esconde tus propias erratas y hasta impide parar el programa con <kbd>Ctrl</kbd> + <kbd>C</kbd>.

> [!ejercicio] Practica
>
> Crea `49-errores.py` y resuelve:
>
> 1. Escribe una calculadora que pida dos números y los divida, capturando el `ValueError` de la conversión. Prueba a escribir letras.
> 2. Amplíala para que, si el segundo número es cero, avise en vez de romperse. Averigua tú qué excepción hay que capturar ejecutándolo primero sin `try`.
> 3. Escribe la función `pedir_decimal(mensaje)`, igual que `pedir_entero` pero con `float()`, y úsala para pedir un precio.
> 4. Haz una función `pedir_entero_en_rango(mensaje, minimo, maximo)` que además rechace los números fuera de rango, volviendo a preguntar.
> 5. Escribe un programa que lea `notas.txt`, muestre la media de las notas y avise con un mensaje claro si el fichero no existe.
> 6. Copia el ejemplo de la errata `precoi`, ejecútalo con `except:` y después con `except ValueError:`. Escribe con tus palabras qué información te da el segundo que el primero te ocultaba.
