---
titulo: "Argumentos por defecto"
resumen: "Cómo dar un valor previo a un parámetro para simplificar las llamadas, y la trampa del valor por defecto mutable."
minutos: 11
orden: 35
---

Cuando una función tiene un parámetro que casi siempre vale lo mismo, repetirlo en cada llamada es ruido. El IVA general español es del 21 % en la inmensa mayoría de los casos; escribir `0.21` cincuenta veces en el programa es exactamente el tipo de repetición que las funciones venían a eliminar.

Python permite dar a un parámetro un valor previo, que se usará cuando quien llama no diga otra cosa.

## Un valor por defecto

Se escribe con un `=` en la propia definición:

```python
def calcular_precio_final(precio, iva=0.21):
        return precio * (1 + iva)


print(f"{calcular_precio_final(100):.2f}")
print(f"{calcular_precio_final(100, 0.10):.2f}")
print(f"{calcular_precio_final(100, iva=0.04):.2f}")
```

```salida
121.00
110.00
104.00
```

En la primera llamada no pasamos el segundo argumento, así que `iva` vale `0.21`. En las otras dos lo pasamos y el valor por defecto se ignora. Un parámetro con valor por defecto es **opcional**; uno sin valor por defecto es **obligatorio**.

Fíjate en que ya conocías esto sin saberlo: `print(a, b, sep=", ")`, `sorted(lista, reverse=True)` o `round(numero, 2)` son funciones con parámetros opcionales. Cuando llamas a `print` sin `sep`, se usa su valor por defecto, que es un espacio.

## Los opcionales van después de los obligatorios

Esta es la única regla de sintaxis que hay que recordar, y Python la impone sin margen:

```python
def calcular_precio_final(iva=0.21, precio):
        return precio * (1 + iva)
```

```salida
  File "/Users/erwin/curso-python/precios.py", line 1
    def calcular_precio_final(iva=0.21, precio):
                                        ^^^^^^
SyntaxError: parameter without a default follows parameter with a default
```

> [!error] SyntaxError: parameter without a default follows parameter with a default
>
> Has puesto un parámetro obligatorio detrás de uno que tiene valor por defecto. Reordena la definición: primero todos los que no tienen valor por defecto, después todos los que sí.

La razón es la misma que con los argumentos por nombre en la llamada. Si los opcionales pudieran ir primero, una llamada como `calcular_precio_final(100)` sería ambigua: ¿ese 100 es el IVA o el precio? Poniendo los obligatorios delante, los primeros argumentos siempre corresponden a los primeros parámetros y no hay nada que adivinar.

## Llamadas cortas para el caso normal

El verdadero valor de esto aparece cuando una función tiene muchas opciones. Puedes ofrecer una función muy configurable sin que el uso habitual sea incómodo:

```python
def crear_ticket(producto, cantidad=1, moneda="euros", regalo=False):
        linea = f"{cantidad} x {producto} ({moneda})"
    if regalo:
                linea += " [para regalo]"
    return linea


print(crear_ticket("Camiseta"))
print(crear_ticket("Camiseta", 3))
print(crear_ticket("Camiseta", regalo=True))
print(crear_ticket("Camiseta", 2, "libras", True))
```

```salida
1 x Camiseta (euros)
3 x Camiseta (euros)
1 x Camiseta (euros) [para regalo]
2 x Camiseta (libras) [para regalo]
```

La tercera llamada es la interesante: queremos cambiar `regalo`, que es el cuarto parámetro, sin tocar el segundo ni el tercero. Por posición sería imposible; por nombre es inmediato. **Los valores por defecto y los argumentos por nombre son un equipo**: en cuanto hay más de dos opcionales, se usan por nombre casi siempre.

> [!consejo] Elige como valor por defecto el caso más frecuente
>
> El valor por defecto es una decisión de diseño, no un relleno. Ponle el que vaya a usarse el 90 % de las veces, y quien llame solo tendrá que escribir lo excepcional. Si no tienes claro cuál es el caso frecuente, probablemente ese parámetro deba ser obligatorio.

## La trampa del valor por defecto mutable

Y ahora el comportamiento de Python que más desconcierta a quien lleva pocos meses. Esta función añade un elemento a una lista y, si no le das ninguna, empieza con una vacía. Antes de mirar la salida, piensa qué debería imprimir: lo esperable sería `['pan']`, `['leche']` y `['huevos']`, tres listas nuevas.

```python
def añadir(elemento, lista=[]):
        lista.append(elemento)
    return lista


print(añadir("pan"))
print(añadir("leche"))
print(añadir("huevos"))
```

```salida
['pan']
['pan', 'leche']
['pan', 'leche', 'huevos']
```

La lista se va acumulando entre llamadas distintas, como si tuviera memoria.

> [!aviso] Nunca uses una lista, un diccionario o un conjunto como valor por defecto
>
> El valor por defecto **se evalúa una sola vez**, cuando Python lee la línea del `def`, no en cada llamada. Esa lista vacía se crea una vez y se queda pegada a la función para siempre. Todas las llamadas que no pasen una lista comparten exactamente el mismo objeto, y como las listas son mutables, cada `append` la modifica para todas las llamadas futuras.
>
> Con valores inmutables, como un número, un texto, un booleano o `None`, no hay ningún problema: aunque se reutilice el mismo objeto, nadie puede cambiarlo.

No es una teoría: el valor por defecto está guardado dentro de la propia función y se puede mirar.

```python
def añadir(elemento, lista=[]):
        lista.append(elemento)
    return lista


print(añadir.__defaults__)
añadir("pan")
print(añadir.__defaults__)
```

```salida
([],)
(['pan'],)
```

El valor por defecto de la función ha cambiado. La próxima llamada que no pase lista ya no empezará vacía.

> [!nota] Por qué Python lo hace así
>
> Podría parecer un fallo de diseño, pero es consecuencia de algo coherente: el `def` es una instrucción que se ejecuta, y al ejecutarse construye el objeto función con sus valores por defecto ya calculados. Cambiarlo ahora rompería una cantidad enorme de código existente, así que es un comportamiento que hay que conocer y esquivar.

## La solución: `None`

El patrón estándar, el que verás en todo el código profesional de Python, es usar `None` como valor por defecto y crear la lista dentro:

```python
def añadir(elemento, lista=None):
        if lista is None:
                lista = []
    lista.append(elemento)
    return lista


print(añadir("pan"))
print(añadir("leche"))

compra = ["aceite"]
print(añadir("sal", compra))
```

```salida
['pan']
['leche']
['aceite', 'sal']
```

Ahora sí. `None` es inmutable, así que no arrastra nada, y la línea `lista = []` se ejecuta en cada llamada, creando una lista nueva cada vez. Cuando sí se pasa una lista, se usa esa.

En cuanto veas `parametro=None` seguido de un `if parametro is None:` en la primera línea de una función, ya sabes qué está pasando: es este patrón.

## Qué se puede poner como valor por defecto

| Valor por defecto | ¿Seguro? | Comentario |
| --- | --- | --- |
| `0`, `3.14`, `-1` | Sí | Los números son inmutables |
| `"euros"`, `""` | Sí | Las cadenas son inmutables |
| `True`, `False` | Sí | Los booleanos son inmutables |
| `None` | Sí | Es el comodín para todo lo demás |
| `(1, 2)` | Sí | Las tuplas son inmutables |
| `[]`, `["a"]` | **No** | Lista mutable compartida entre llamadas |
| `{}` | **No** | Diccionario mutable compartido entre llamadas |
| `set()` | **No** | Conjunto mutable compartido entre llamadas |

> [!resumen] En resumen
>
> Un parámetro con `=valor` en la definición se vuelve opcional y toma ese valor cuando la llamada no le pasa nada. Los opcionales tienen que ir después de los obligatorios o Python lanza un `SyntaxError`. Combinados con los argumentos por nombre permiten funciones muy configurables cuyo uso habitual sigue siendo una línea corta. El valor por defecto se evalúa una única vez al definir la función, así que usar una lista o un diccionario como valor por defecto hace que se comparta entre todas las llamadas y se vaya acumulando; la solución es poner `None` y crear la colección dentro con `if parametro is None:`.

> [!ejercicio] Practica
>
> Crea un fichero `35-defecto.py` y resuelve:
>
> 1. Escribe `saludar(nombre, saludo="Hola")` y llámala dos veces, una con el saludo por defecto y otra cambiándolo.
> 2. Escribe `formatear_importe(cantidad, decimales=2, moneda="€")` que devuelva el importe como texto. Pruébala con las tres combinaciones posibles de opcionales.
> 3. Escribe una definición con un parámetro obligatorio detrás de uno opcional. Lee el `SyntaxError` y arréglala.
> 4. Copia la función `añadir` con `lista=[]`, llámala cuatro veces seguidas e imprime el resultado de cada llamada. Antes de ejecutar, escribe en un comentario qué crees que va a salir.
> 5. Arregla esa función con el patrón de `None` y comprueba que ahora cada llamada empieza de cero.
> 6. Escribe `contar_palabras(frase, contador=None)` que devuelva un diccionario con cuántas veces aparece cada palabra, y que pueda recibir un diccionario ya empezado para seguir contando sobre él.
