---
titulo: "Booleanos y comparaciones"
resumen: "El tipo bool, los seis operadores de comparación y cómo se guarda el resultado de una comparación en una variable."
minutos: 10
orden: 9
---

Un programa útil tiene que decidir. Para decidir, antes hay que preguntar: ¿es esta edad mayor que 18? ¿coincide esta contraseña con la guardada? ¿queda saldo suficiente? Todas esas preguntas se responden con un sí o un no, y en Python ese sí y ese no tienen nombre propio: `True` y `False`.

Esta lección es la mitad del trabajo. Aquí aprendes a formular la pregunta; en la siguiente, a actuar según la respuesta.

## El tipo bool

Solo tiene dos valores posibles, y se escriben con la primera letra en mayúscula:

```python
mayor_de_edad = True
tiene_carnet = False

print(mayor_de_edad)
print(tiene_carnet)
print(type(mayor_de_edad))
```

```salida
True
False
<class 'bool'>
```

> [!aviso] Van en mayúscula y sin comillas
>
> `true` con minúscula es un `NameError`, y `"True"` entre comillas es una cadena de texto, no un booleano. Solo `True` y `False` tal cual son valores del tipo `bool`.

## Los seis operadores de comparación

| Operador | Pregunta que hace | Ejemplo verdadero |
| --- | --- | --- |
| `==` | ¿Son iguales? | `3 == 3` |
| `!=` | ¿Son distintos? | `3 != 4` |
| `>` | ¿Es mayor? | `5 > 2` |
| `<` | ¿Es menor? | `2 < 5` |
| `>=` | ¿Es mayor o igual? | `5 >= 5` |
| `<=` | ¿Es menor o igual? | `5 <= 5` |

```python
edad = 20

print(edad == 20)
print(edad != 20)
print(edad > 18)
print(edad < 18)
print(edad >= 20)
print(edad <= 19)
```

```salida
True
False
True
False
True
False
```

El `!` de `!=` se lee como una negación: "no igual". Y fíjate en que `>=` y `<=` se escriben siempre en ese orden, primero el signo de desigualdad y después el igual. `=>` no existe.

## Una comparación es una expresión

Esto es lo importante de hoy. Una comparación **no es una pregunta que hagas a Python**: es una expresión que se calcula y produce un valor, igual que `2 + 3` produce `5`. Y como produce un valor, se puede guardar en una variable:

```python
nota = 7.5
aprobado = nota >= 5

print(aprobado)
print(f"{aprobado=}")
```

```salida
True
aprobado=True
```

Después de esas dos líneas, `aprobado` es una variable de tipo `bool` como cualquier otra. Puedes imprimirla, pasarla por ahí y usarla para decidir. Nombrar así las comparaciones hace el código mucho más legible: `if aprobado:` se entiende de un vistazo, mejor que repetir `if nota >= 5:` en cinco sitios distintos.

```python
temperatura = 21.5

print(f"{'Temperatura:':<16}{temperatura:.1f}")
print(f"{'¿Hace calor?:':<16}{temperatura > 25}")
```

```salida
Temperatura:    21.5
¿Hace calor?:   False
```

> [!consejo] Nombra los booleanos como una afirmación
>
> Un booleano se lee mejor si su nombre se puede responder con sí o no: `es_valido`, `esta_vacio`, `tiene_descuento`, `hay_stock`. Evita nombres como `comprobacion` o `estado`, que no dicen qué significa el `True`.

## Comparar cadenas

Con `==` y `!=` se comparan textos carácter a carácter, y la comparación es **exacta**:

```python
print("ana" == "ana")
print("Ana" == "ana")
```

```salida
True
False
```

`"Ana"` y `"ana"` son cadenas distintas para Python. Cuando compares algo que ha escrito una persona, normaliza antes con los métodos que ya conoces:

```python
respuesta = "  SÍ  "
print(respuesta.strip().lower() == "sí")
```

```salida
True
```

Con `<` y `>` las cadenas se ordenan alfabéticamente, que es cómodo para listados:

```python
print("ana" < "berta")
```

```salida
True
```

> [!aviso] Las mayúsculas van antes que las minúsculas
>
> El orden no es el del diccionario, sino el de la tabla interna de caracteres, y ahí todas las mayúsculas están antes que todas las minúsculas:
>
> ```python
> print("Zoe" < "ana")
> print("ánimo" < "banana")
> ```
>
> ```salida
> True
> False
> ```
>
> `"Zoe"` va antes que `"ana"` porque la `Z` mayúscula precede a cualquier minúscula, y `"ánimo"` va **después** de `"banana"` porque las letras acentuadas están al final de la tabla. Si quieres un orden alfabético real, compara siempre `texto_a.lower() < texto_b.lower()`, y asume que los acentos seguirán desordenados hasta que aprendas a ordenar con configuración regional.

## Encadenar comparaciones

Para saber si un número está dentro de un intervalo, Python permite escribirlo como en matemáticas:

```python
edad = 34
print(18 <= edad < 65)
```

```salida
True
```

Se lee tal cual: "18 es menor o igual que la edad, y la edad es menor que 65". Es una de las cosas que más se echan de menos al volver a otros lenguajes, donde hay que escribir las dos comparaciones por separado y unirlas.

```python
nota = 15
print(0 <= nota <= 10)
```

```salida
False
```

> [!nota] Esto también se puede escribir con and
>
> `18 <= edad < 65` equivale a unir dos comparaciones con el operador `and`, que es el tema de la lección de operadores lógicos. Cuando el intervalo es sobre una sola variable, la forma encadenada se lee mejor; para condiciones sobre variables distintas tendrás que usar `and`.

## == no es lo mismo que is

Los dos parecen preguntar por igualdad, pero no preguntan lo mismo:

- `==` compara **valores**: ¿contienen lo mismo?
- `is` compara **identidad**: ¿son exactamente el mismo objeto guardado en la memoria?

```python
parte = "mundo"
saludo_1 = "hola mundo"
saludo_2 = "hola " + parte

print(saludo_1 == saludo_2)
print(saludo_1 is saludo_2)
```

```salida
True
False
```

Las dos variables contienen el mismo texto, así que `==` da `True`. Pero son dos cadenas distintas construidas en momentos distintos, así que para `is` no son el mismo objeto.

**La regla práctica es corta: usa siempre `==`.** La única excepción habitual es comparar con `None`, donde la costumbre de Python es usar `is`:

```python
resultado = None

print(resultado is None)
print(resultado is not None)
```

```salida
True
False
```

`is not` es la negación de `is`, y se escribe así, con las dos palabras separadas.

> [!aviso] is a veces acierta por casualidad
>
> Python reutiliza internamente algunos valores pequeños, como los enteros del -5 al 256 y ciertas cadenas cortas. Por eso `is` puede dar `True` cuando esperabas `False`, hacerte creer que funciona y fallar más adelante con otros datos. No es un comportamiento en el que puedas confiar: para comparar valores, `==`.

## Comparaciones entre tipos distintos

Los números se comparan entre sí aunque sean de tipos diferentes, y los booleanos cuentan como 1 y 0:

```python
print(3 == 3.0)
print(True == 1)
print(False == 0)
```

```salida
True
True
True
```

Texto y número, en cambio, nunca son iguales, ni siquiera cuando lo parecen:

```python
print("20" == 20)
print(int("20") == 20)
```

```salida
False
True
```

Es la misma frontera de la lección anterior: `"20"` es una cadena y `20` es un entero, y Python no cruza esa frontera por su cuenta. Con `==` no hay error, solo un `False`; con `<` o `>` sí lo hay.

> [!error] TypeError: '&lt;' not supported between instances of 'str' and 'int'
>
> Estás comparando con `<`, `>`, `<=` o `>=` un texto con un número. Suele pasar justo después de un `input()`, que devuelve texto. Convierte primero:
>
> ```python
> edad = input("Edad: ")
> print(edad > 18)          # TypeError
>
> edad = int(input("Edad: "))
> print(edad > 18)          # correcto
> ```

> [!error] SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?
>
> Has escrito un signo igual donde hacía falta el doble. `=` asigna un valor, `==` compara dos valores. Es el error más común de todos los principiantes y Python te dice exactamente qué querías escribir:
>
> ```python
> edad = 20
> if edad = 20:      # SyntaxError
>         print("veinte")
> ```

> [!resumen] En resumen
>
> El tipo `bool` solo tiene dos valores, `True` y `False`, en mayúscula y sin comillas. Los operadores `==`, `!=`, `<`, `>`, `<=` y `>=` comparan dos valores y producen un booleano, que como cualquier otro valor se puede guardar en una variable con un nombre descriptivo. Las cadenas se comparan de forma exacta y se ordenan poniendo las mayúsculas antes que las minúsculas, así que normaliza con `lower()` antes de comparar. Los intervalos se escriben encadenados, `18 <= edad < 65`. `==` compara valores e `is` compara si son el mismo objeto: usa `is` solo con `None`.

> [!ejercicio] Practica
>
> Crea `09-booleanos.py` y resuelve:
>
> 1. Guarda tu edad en una variable e imprime, con una etiqueta delante de cada línea, si eres mayor de edad, si tienes menos de 65 y si tu edad es un número par.
> 2. Pide una contraseña por teclado y muestra si coincide exactamente con `"python2024"`. Haz que los espacios sobrantes no molesten.
> 3. Crea dos variables con dos palabras y muestra cuál va antes alfabéticamente, comparándolas en minúsculas.
> 4. Pide un número y muestra con una sola comparación encadenada si está entre 1 y 100, ambos incluidos.
> 5. Comprueba qué imprimen `"7" == 7`, `7 == 7.0` y `True == 1`, y explica en un comentario por qué cada uno da lo que da.
> 6. Copia tal cual el último ejemplo de la sección de errores, el que escribe `if edad = 20:`, ejecútalo, lee el mensaje completo y después arréglalo. La instrucción `if` es el tema de la lección siguiente; aquí solo interesa el error.
