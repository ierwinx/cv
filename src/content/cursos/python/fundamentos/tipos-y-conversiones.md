---
titulo: "Tipos de datos y conversiones"
resumen: "Los cinco tipos básicos, cómo saber cuál tienes delante, cómo pasar de uno a otro y qué conversiones fallan."
minutos: 10
orden: 7
---

## Los tipos básicos

Todo dato en Python tiene un tipo, que determina qué se puede hacer con él. Los que necesitas ahora son cinco:

| Tipo | Nombre | Qué guarda | Ejemplo |
| --- | --- | --- | --- |
| Entero | `int` | Números sin decimales | `42`, `-7`, `0` |
| Decimal | `float` | Números con decimales | `3.14`, `-0.5` |
| Cadena | `str` | Texto | `"hola"`, `"42"` |
| Booleano | `bool` | Verdadero o falso | `True`, `False` |
| Nulo | `NoneType` | La ausencia de valor | `None` |

```python
print(type(42))
print(type(3.14))
print(type("hola"))
print(type(True))
print(type(None))
```

```salida
<class 'int'>
<class 'float'>
<class 'str'>
<class 'bool'>
<class 'NoneType'>
```

> [!nota] Qué es None
>
> `None` no es cero ni una cadena vacía: representa "aquí todavía no hay nada". Se usa para inicializar una variable cuyo valor se calculará después, y es lo que devuelven las funciones que no devuelven nada explícitamente. Lo veremos a fondo en la lección de funciones.

## Comprobar el tipo

`type()` te lo dice, pero para tomar decisiones en el código se usa `isinstance()`, que devuelve `True` o `False`:

```python
dato = 42

print(isinstance(dato, int))
print(isinstance(dato, str))
```

```salida
True
False
```

## Las funciones de conversión

Cada tipo tiene una función con su mismo nombre que convierte a él. Se llaman *constructores*:

```python
print(int("42"))         # texto a entero
print(float("3.14"))     # texto a decimal
print(str(42))           # número a texto
print(bool(1))           # número a booleano
```

```salida
42
3.14
42
True
```

### De texto a número

Es la conversión que más harás, porque `input()` siempre entrega texto:

```python
print(int("100") + 5)
print(float("19.99") * 2)
```

```salida
105
39.98
```

Pero solo funciona si el texto contiene realmente un número:

```python
int("hola")     # ValueError
int("12.5")     # ValueError: int() no acepta decimales en texto
int("")         # ValueError
int(" 42 ")     # esto sí funciona: ignora los espacios de los extremos
```

> [!consejo] Para un texto con decimales, pasa por float
>
> `int("12.5")` falla, pero `int(float("12.5"))` da 12. Primero conviertes a decimal y luego truncas.

### De decimal a entero

`int()` **no redondea, trunca**: simplemente tira la parte decimal.

```python
print(int(9.99))      # 9, no 10
print(int(-9.99))     # -9, corta hacia el cero
print(round(9.99))    # 10, esto sí redondea
```

```salida
9
-9
10
```

Recuérdalo: si quieres redondear, `round()`. Si quieres quedarte con la parte entera, `int()`.

### De número a texto

Siempre funciona, nunca falla:

```python
edad = 34
print("Tengo " + str(edad) + " años")
```

En la práctica casi nunca escribirás `str()` a mano, porque las f-strings convierten solas:

```python
print(f"Tengo {edad} años")
```

### Conversiones a booleano

`bool()` sigue una regla sencilla: **casi todo es verdadero, salvo el vacío y el cero**.

```python
print(bool(0), bool(1), bool(-5))
print(bool(""), bool("hola"), bool("0"))
print(bool(None))
```

```salida
False True True
False True True
False
```

Los valores que dan `False` se llaman *falsy* y son pocos: `0`, `0.0`, `""`, `None`, y las colecciones vacías que veremos más adelante. Todo lo demás es `True`.

> [!aviso] La cadena "0" es verdadera
>
> `bool("0")` da `True` porque es un texto con un carácter dentro, y lo único que mira `bool()` en una cadena es si está vacía o no. No confundas el texto `"0"` con el número `0`.

## Conversiones implícitas

En algunos casos Python convierte por su cuenta, sin que se lo pidas:

```python
resultado = 3 + 0.5        # int + float da float
print(resultado, type(resultado))

print(True + True)         # los booleanos valen 1 y 0
```

```salida
3.5 <class 'float'>
2
```

Lo que **nunca** hace automáticamente es convertir entre texto y número. Esa frontera siempre la cruzas tú a mano, y es una decisión de diseño deliberada: `"5" + 5` es ambiguo, podría ser `10` o `"55"`, así que Python prefiere dar error a adivinar.

## Un validador sencillo

Con lo que sabes puedes escribir esto, que anticipa la lección de condiciones:

```python
entrada = input("Escribe un número entero: ").strip()

if entrada.isdigit():
        numero = int(entrada)
    print(f"Su doble es {numero * 2}")
else:
        print("Eso no era un número entero.")
```

```salida
Escribe un número entero: 21
Su doble es 42
```

> [!nota] isdigit no acepta negativos ni decimales
>
> `"-5".isdigit()` da `False` porque el guion no es un dígito, y `"3.7".isdigit()` también, por el punto. Para validaciones serias se usa el manejo de excepciones con `try`, que es el tema de una lección posterior.

## Tabla de conversiones

| Desde | Hasta | Cómo | Cuidado |
| --- | --- | --- | --- |
| `str` | `int` | `int("42")` | `ValueError` si no es un entero |
| `str` | `float` | `float("3.14")` | `ValueError` si no es un número |
| `float` | `int` | `int(9.99)` | Trunca, no redondea |
| `int` | `float` | `float(3)` | Nunca falla |
| Cualquiera | `str` | `str(x)` | Nunca falla |
| Cualquiera | `bool` | `bool(x)` | Vacío y cero dan `False` |

> [!error] TypeError: unsupported operand type(s)
>
> Estás operando con dos tipos incompatibles, casi siempre un texto y un número. Imprime `type()` de las dos variables implicadas para ver cuál es cuál, y convierte la que toque.

> [!error] ValueError: invalid literal for int() with base 10
>
> El texto que le pasas a `int()` no contiene un entero válido. Imprime el valor exacto con `print(f"{entrada=}")` para ver qué llegó de verdad: muchas veces es una cadena vacía o con un salto de línea.

> [!resumen] En resumen
>
> Los tipos básicos son `int`, `float`, `str`, `bool` y `None`. `type()` te dice cuál es e `isinstance()` lo comprueba. Las funciones `int()`, `float()`, `str()` y `bool()` convierten entre ellos. `int()` trunca los decimales en vez de redondear, y convertir texto a número falla con `ValueError` si el texto no es un número. Python nunca cruza solo la frontera entre texto y número.

> [!ejercicio] Practica
>
> Crea `07-tipos.py` y resuelve:
>
> 1. Imprime el tipo de: `5`, `5.0`, `"5"`, `True`, `None` y `5 + 5.0`.
> 2. Convierte el texto `"1250"` a número y calcula su 15%.
> 3. Comprueba qué devuelven `int(7.9)`, `round(7.9)` y `int(round(7.9))`. Explica con tus palabras la diferencia.
> 4. Prueba `bool()` sobre: `0`, `0.0`, `""`, `" "`, `"False"` y `None`. Dos de ellos sorprenden; averigua cuáles y por qué.
> 5. Pide un número por teclado y muestra su cuadrado, validando con `isdigit()` que sea realmente un número.
> 6. Intenta ejecutar `int("12.5")`, lee el error y arréglalo para que dé 12.
