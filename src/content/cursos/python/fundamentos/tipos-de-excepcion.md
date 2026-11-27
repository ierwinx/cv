---
titulo: "Tipos de excepción, else y finally"
resumen: "Cómo capturar varias excepciones distintas, leer su mensaje, y qué hacen exactamente las cláusulas else y finally."
minutos: 12
orden: 50
---

Con un solo `except ValueError` cubres el caso más común, pero un trozo de código real puede fallar de varias formas a la vez. Convertir un texto a número y dividir puede dar `ValueError` o `ZeroDivisionError`, y cada uno merece un mensaje distinto. Y a veces necesitas algo más: ejecutar una cosa solo si todo fue bien, u otra pase lo que pase.

## Las excepciones forman una familia

Las excepciones de Python están organizadas en una jerarquía, como un árbol genealógico. `ValueError` y `ZeroDivisionError` no son cosas sueltas: descienden de tipos más generales, y ese parentesco tiene un efecto práctico muy concreto.

```text title="jerarquía de excepciones"
Exception
    ArithmeticError
        ZeroDivisionError
    LookupError
        IndexError
        KeyError
    OSError
        FileNotFoundError
        PermissionError
    TypeError
    ValueError
    AttributeError
```

**Capturar un tipo captura también a todos sus descendientes.** Por eso esto funciona:

```python
try:
        numeros = [10, 20, 30]
    print(numeros[7])
except LookupError as error:
        print(f"Capturado por LookupError: {error}")
```

```salida
Capturado por LookupError: list index out of range
```

Lo que se ha lanzado es un `IndexError`, pero como desciende de `LookupError`, el `except` lo atrapa igual. Y en la cima está `Exception`, de la que desciende prácticamente todo:

```python
try:
        int("hola")
except Exception as error:
        print(f"Capturado por Exception: {error}")
```

```salida
Capturado por Exception: invalid literal for int() with base 10: 'hola'
```

No hace falta que te aprendas el árbol. Basta con que sepas que existe y que entiendas las dos consecuencias: capturar un tipo general es cómodo pero impreciso, y **el orden de los `except` importa**.

## Varios except

Un bloque `try` puede tener tantos `except` como quieras. Python los prueba de arriba abajo y ejecuta **el primero que encaje**, uno solo.

```python title="division.py"
def dividir(texto_a: str, texto_b: str) -> None:
        try:
                resultado = int(texto_a) / int(texto_b)
    except ValueError:
                print("Alguno de los dos no era un número entero.")
    except ZeroDivisionError:
                print("No se puede dividir entre cero.")
    else:
                print(f"El resultado es {resultado}")


dividir("10", "4")
dividir("10", "0")
dividir("10", "dos")
```

```salida
El resultado es 2.5
No se puede dividir entre cero.
Alguno de los dos no era un número entero.
```

> [!aviso] Pon siempre lo concreto antes que lo general
>
> Como Python se queda con el primer `except` que encaja, poner uno genérico arriba deja muertos a los de abajo:
>
> ```python
> try:
>         int("hola")
> except Exception:
>         print("El genérico se lo come todo")
> except ValueError:
>         print("Esta línea nunca se alcanza")
> ```
>
> ```salida
> El genérico se lo come todo
> ```
>
> La regla es mecánica: los tipos concretos primero, los generales al final.

## Varias excepciones en un solo except

Si vas a reaccionar igual ante varias, no repitas el bloque: agrúpalas en una tupla.

```python
for valor in ["8", "0", "ocho"]:
        try:
                resultado = 100 / int(valor)
    except (ValueError, ZeroDivisionError) as error:
                print(f"No he podido dividir entre '{valor}': {error}")
    else:
                print(f"100 / {valor} = {resultado}")
```

```salida
100 / 8 = 12.5
No he podido dividir entre '0': division by zero
No he podido dividir entre 'ocho': invalid literal for int() with base 10: 'ocho'
```

Los paréntesis son obligatorios: `except (ValueError, ZeroDivisionError)`, no `except ValueError, ZeroDivisionError`.

## Capturar el objeto con as

`as error` guarda la excepción en una variable para que puedas mirarla. Lo que más se usa es imprimirla, porque al convertirla a texto da su mensaje:

```python
try:
        numero = int("treinta y dos")
except ValueError as error:
        print(error)
    print(type(error))
```

```salida
invalid literal for int() with base 10: 'treinta y dos'
<class 'ValueError'>
```

El mensaje viene en inglés, claro, porque lo escribe Python. Lo interesante es que trae el dato concreto que falló: `'treinta y dos'`. Eso convierte un aviso genérico en uno útil.

```python
datos = {"nombre": "Lucía", "ciudad": "Gijón"}

for clave in ["nombre", "edad"]:
        try:
                print(datos[clave])
    except KeyError as error:
                print(f"Falta la clave {error} en los datos")
```

```salida
Lucía
Falta la clave 'edad' en los datos
```

> [!nota] El mensaje de KeyError trae las comillas puestas
>
> `print(error)` de un `KeyError` muestra `'edad'`, con comillas simples incluidas, porque el "mensaje" de esta excepción es la clave misma. Por eso en la f-string de arriba no hacen falta comillas: saldrían duplicadas.

> [!consejo] Nombra la variable error, no e
>
> Verás muchísimo `except ValueError as e`. Funciona, pero `error` se lee mejor y no cuesta nada. El curso usa nombres descriptivos también aquí.

## Las cláusulas else y finally

Un bloque completo puede tener cuatro partes. Este ejemplo enseña cuándo se ejecuta cada una:

```python title="cuatro-partes.py"
def procesar(texto: str) -> None:
        print(f"--- procesando '{texto}' ---")
    try:
                numero = int(texto)
    except ValueError as error:
                print(f"except: {error}")
    else:
                print(f"else: la conversión ha ido bien, vale {numero}")
    finally:
                print("finally: esto se ejecuta siempre")


procesar("42")
procesar("cuarenta y dos")
```

```salida
--- procesando '42' ---
else: la conversión ha ido bien, vale 42
finally: esto se ejecuta siempre
--- procesando 'cuarenta y dos' ---
except: invalid literal for int() with base 10: 'cuarenta y dos'
finally: esto se ejecuta siempre
```

| Bloque | Cuándo se ejecuta |
| --- | --- |
| `try` | Siempre, hasta que algo falle |
| `except` | Solo si se lanzó una excepción de ese tipo |
| `else` | Solo si **no** se lanzó ninguna excepción |
| `finally` | Siempre, haya fallado o no |

### Para qué sirve else

Podrías meter el código del `else` al final del `try` y aparentemente daría igual. La diferencia es de precisión: lo que va en el `try` queda vigilado por el `except`, y lo que va en el `else`, no. Si el mensaje del `else` lanzara por su cuenta un `ValueError`, con el código dentro del `try` acabaría capturado por error, disfrazado de fallo de conversión.

`else` dice exactamente lo que quieres decir: "vigila solo esta línea, y si sale bien, haz esto otro".

### Para qué sirve finally

`finally` es para la limpieza: cerrar, liberar, desconectar. Su garantía es fuerte, porque se ejecuta incluso si el `except` no captura la excepción y el programa se va a morir, e incluso si dentro del `try` hay un `return`.

```python
def leer_primera_linea(ruta: str) -> str:
        fichero = open(ruta, encoding="utf-8")
    try:
                return fichero.readline().strip()
    finally:
                fichero.close()
```

Ese `return` devuelve el valor, pero antes de salir de verdad de la función se ejecuta el `finally` y el fichero se cierra. Por cierto: eso es exactamente lo que hace `with` por dentro, y por eso con `with` no necesitas escribir este `finally` a mano.

> [!nota] Un try puede tener except o finally, o los dos
>
> No es obligatorio poner los cuatro bloques. `try`/`except` es lo normal, `try`/`finally` sin `except` es válido y sirve para garantizar una limpieza dejando que la excepción siga su camino, y `else` solo tiene sentido si hay algún `except`.

## Las excepciones que más vas a ver

| Excepción | Qué la provoca | Ejemplo que la lanza |
| --- | --- | --- |
| `ValueError` | El tipo es correcto pero el valor no sirve | `int("hola")` |
| `TypeError` | La operación no vale para ese tipo | `"3" + 3` |
| `KeyError` | La clave no está en el diccionario | `agenda["Mateo"]` |
| `IndexError` | La posición está fuera de la lista | `notas[3]` con 3 elementos |
| `FileNotFoundError` | La ruta no existe | `open("no-existe.txt")` |
| `ZeroDivisionError` | Dividir o sacar el resto entre cero | `10 / 0` |
| `AttributeError` | Ese método o atributo no existe en ese tipo | `"hola".longitud()` |

Los mensajes exactos que imprimen son estos, y conviene reconocerlos de un vistazo:

```salida
ValueError: invalid literal for int() with base 10: 'hola'
TypeError: can only concatenate str (not "int") to str
KeyError: 'Mateo'
IndexError: list index out of range
FileNotFoundError: [Errno 2] No such file or directory: 'no-existe.txt'
ZeroDivisionError: division by zero
AttributeError: 'str' object has no attribute 'longitud'
```

> [!error] AttributeError: 'NoneType' object has no attribute 'strip'
>
> Este merece mención aparte porque desconcierta mucho. Lo que dice es que estás llamando a un método sobre algo que vale `None`. La causa casi siempre es una función que devolvió `None` sin que te dieras cuenta: o porque le faltaba el `return`, o porque devolvió `None` a propósito en un caso que no contemplaste. No busques el fallo en la línea del error, busca de dónde salió ese `None`.

## El antipatrón: except Exception y pass

```python
# no hagas esto
try:
        procesar_pedidos()
except Exception:
        pass
```

Esas cuatro líneas parecen hacer el programa robusto. Lo que hacen es volverlo **imposible de arreglar**. Si algo falla, no hay mensaje, no hay traceback, no hay registro: el programa sigue como si nada con los datos a medias, y el día que alguien note que faltan pedidos no habrá ni una pista de cuándo empezó ni por qué.

Si de verdad necesitas que un fallo no detenga el programa —por ejemplo, procesando mil ficheros de los que uno puede estar corrupto—, captura y **deja constancia**:

```python
for fichero in ficheros:
        try:
                procesar(fichero)
    except Exception as error:
                print(f"No se ha podido procesar {fichero}: {error}")
```

Ahora el proceso continúa y al terminar sabes exactamente qué falló y con qué mensaje. La diferencia entre las dos versiones son quince caracteres y varias horas de tu tiempo futuro.

> [!aviso] pass no es lo mismo que "no ha pasado nada"
>
> `pass` significa "no hagas nada aquí", y en un `except` significa "haz como si no hubiera fallado". Son cosas distintas. Un `except` con `pass` solo está justificado en casos muy concretos y con un comentario al lado explicando por qué ese fallo es esperable y no importa.

> [!resumen] En resumen
>
> Las excepciones forman una jerarquía, así que capturar un tipo captura también a sus descendientes y `Exception` los captura casi todos. Un `try` puede llevar varios `except`, y Python ejecuta el primero que encaje, por lo que lo concreto va antes que lo general; para reaccionar igual ante varias, se agrupan en una tupla entre paréntesis. Con `as error` guardas la excepción y al imprimirla obtienes su mensaje, que suele incluir el dato que falló. `else` se ejecuta solo si no hubo excepción y `finally` se ejecuta siempre, que es donde va la limpieza. Y un `except Exception: pass` no hace tu programa robusto: lo hace mudo.

> [!ejercicio] Practica
>
> Crea `50-excepciones.py` y resuelve:
>
> 1. Escribe una función que reciba dos textos, los convierta a número y los divida, con un `except` distinto para `ValueError` y para `ZeroDivisionError`, y un `else` que muestre el resultado.
> 2. Reescríbela capturando las dos en un solo `except` con tupla y mostrando el mensaje con `as error`. Compara qué versión te parece más clara.
> 3. Provoca a propósito las siete excepciones de la tabla, una por una, y apunta el mensaje exacto de cada una.
> 4. Escribe una función que lea un número desde un fichero y devuelva `0` si el fichero no existe o si su contenido no es un número, con dos `except` distintos.
> 5. Añade a la función anterior un `finally` que imprima "intento terminado" y comprueba que sale en los tres casos: fichero correcto, fichero inexistente y fichero con basura dentro.
> 6. Coge el ejemplo del bucle que procesa ficheros, escríbelo primero con `except Exception: pass` y después con el mensaje, y provoca un fallo en uno de los ficheros. Explica qué información has perdido con la primera versión.
