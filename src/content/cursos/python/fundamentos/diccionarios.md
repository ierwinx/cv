---
titulo: "Diccionarios: buscar por nombre"
resumen: "Guardar datos emparejados con una etiqueta y acceder a ellos por esa etiqueta en vez de por su posición."
minutos: 12
orden: 28
---

En la lección de ordenar listas quedó un fallo a la vista: para guardar jugadores y sus puntos usábamos dos listas paralelas y las cruzábamos con `index()`, y en cuanto dos jugadores empataban, el informe mentía. El problema de fondo es que una lista solo sabe de posiciones, y la posición 2 no significa nada; recordar que el nombre de la posición 2 va con los puntos de la posición 2 es trabajo tuyo, y tarde o temprano se rompe.

Un **diccionario** guarda **pares**: una clave y su valor. En vez de preguntar "¿qué hay en la posición 2?", preguntas "¿cuántos puntos tiene Luis?". Es la estructura de datos más útil de Python, y una vez la tengas no habrá programa en el que no aparezca.

## Crear un diccionario

Se escribe con llaves, y dentro pares `clave: valor` separados por comas:

```python
puntos = {"Marta": 3400, "Luis": 2100, "Ana": 1200}

print(puntos)
print(type(puntos))
print(len(puntos))
```

```salida
{'Marta': 3400, 'Luis': 2100, 'Ana': 1200}
<class 'dict'>
3
```

`len()` cuenta pares, no claves ni valores por separado.

Cuando hay más de tres o cuatro pares, se escribe uno por línea, que es como lo verás casi siempre:

```python
usuario = {
    "nombre": "Erwin",
    "edad": 34,
    "ciudad": "Madrid",
    "activo": True,
}

print(usuario["nombre"])
print(usuario["edad"])
```

```salida
Erwin
34
```

Fíjate en ese segundo uso, que es distinto del primero. En `puntos` todas las claves eran nombres de personas y todos los valores puntuaciones: el diccionario servía como **tabla de búsqueda**. En `usuario` cada clave es un campo distinto: el diccionario sirve como **registro** que describe una cosa. Los dos usos son correctos y los dos son frecuentísimos.

El diccionario vacío se escribe `{}`, y también con `dict()`:

```python
inventario = {}

print(inventario, len(inventario), bool(inventario))
```

```salida
{} 0 False
```

Igual que las listas y los conjuntos, un diccionario vacío es falso, así que `if inventario:` pregunta si tiene algo dentro.

## Acceder a un valor

Con corchetes, poniendo la clave donde en una lista pondrías el índice:

```python
capitales = {
    "España": "Madrid",
    "Francia": "París",
    "Italia": "Roma",
}

print(capitales["Francia"])
print(capitales["Italia"].upper())
```

```salida
París
ROMA
```

La clave no tiene nada que ver con el orden: `capitales["Francia"]` funciona igual esté donde esté. Y a diferencia de la búsqueda en una lista, el acceso es inmediato aunque el diccionario tenga un millón de entradas, por el mismo motivo que hacía rápidos a los conjuntos.

> [!error] KeyError: 'Portugal'
>
> Si la clave no existe, el acceso con corchetes falla:
>
> ```python
> capitales = {"España": "Madrid", "Francia": "París"}
> print(capitales["Portugal"])
> ```
>
> ```salida
> KeyError: 'Portugal'
> ```
>
> El mensaje te dice exactamente qué clave ha pedido, entre comillas, y es la pista más útil: muchas veces la clave existe pero escrita de otra forma, con una mayúscula distinta o con un espacio al final. Compruébalo imprimiendo `print(list(capitales))` para ver las claves reales.
>
> Las dos soluciones son comprobar antes con `in` o usar `get()`, que es lo que viene a continuación.

## `in` comprueba las claves

El operador `in` sobre un diccionario mira **las claves**, no los valores. Es lo más importante que hay que recordar de esta lección después del `KeyError`:

```python
capitales = {"España": "Madrid", "Francia": "París"}

print("España" in capitales)
print("Madrid" in capitales)             # es un valor, no una clave
print("Madrid" in capitales.values())    # así sí
```

```salida
True
False
True
```

Puede parecer arbitrario, pero es lo coherente: la clave es la forma de encontrar las cosas, así que preguntar "¿está en el diccionario?" significa "¿tengo una entrada con ese nombre?".

Con eso, el acceso seguro se escribe así:

```python
capitales = {"España": "Madrid", "Francia": "París"}
pais = "Portugal"

if pais in capitales:
        print(f"La capital de {pais} es {capitales[pais]}")
else:
        print(f"No tengo la capital de {pais}")
```

```salida
No tengo la capital de Portugal
```

## `get()`: acceder sin miedo

`get()` hace lo mismo que los corchetes, pero cuando la clave no existe devuelve `None` en vez de fallar:

```python
capitales = {"España": "Madrid", "Francia": "París"}

print(capitales.get("España"))
print(capitales.get("Portugal"))
```

```salida
Madrid
None
```

Y acepta un segundo argumento con el valor que quieres recibir cuando no hay nada:

```python
capitales = {"España": "Madrid", "Francia": "París"}

print(capitales.get("Portugal", "desconocida"))
print(capitales.get("España", "desconocida"))
```

```salida
desconocida
Madrid
```

Ese valor por defecto es lo que convierte a `get()` en la opción preferente. Compara las dos formas de contar algo que puede no estar:

```python
existencias = {"teclado": 4, "ratón": 0}

# con corchetes hay que protegerse
if "monitor" in existencias:
        cantidad = existencias["monitor"]
else:
        cantidad = 0

# con get sale en una línea
cantidad = existencias.get("monitor", 0)

print(f"Monitores: {cantidad}")
print(f"Teclados:  {existencias.get('teclado', 0)}")
```

```salida
Monitores: 0
Teclados:  4
```

Cinco líneas convertidas en una, y sin repetir el nombre de la clave dos veces.

> [!consejo] Corchetes o get, cómo elegir
>
> Usa **corchetes** cuando la clave tenga que estar y su ausencia sea un error que quieras ver cuanto antes: si `usuario["nombre"]` falla, es que tus datos están mal y prefieres saberlo. Usa **`get()`** cuando la ausencia sea normal y tengas un valor razonable con el que seguir: un contador que empieza en cero, una lista vacía, un texto como `"sin definir"`.

> [!aviso] Ojo con las comillas dentro de una f-string
>
> En el ejemplo anterior hay `{existencias.get('teclado', 0)}` con comillas simples dentro de una f-string delimitada por dobles. Si usas las mismas comillas por dentro y por fuera en versiones de Python anteriores a la 3.12, es un `SyntaxError`. La costumbre de alternar dobles fuera y simples dentro te evita el problema del todo.

## Qué puede ser una clave

Una clave tiene que ser **inmutable**, exactamente igual que los elementos de un conjunto y por el mismo motivo: el diccionario calcula una huella de la clave para saber dónde guardarla, y si la clave cambiara por dentro, esa huella dejaría de encontrarla.

Valen cadenas, números, booleanos y tuplas:

```python
mezcla = {
    "texto": "las cadenas son las claves más habituales",
    42: "los enteros también valen",
    3.14: "y los decimales, aunque se usan poco",
    True: "y los booleanos",
    ("Madrid", "Sevilla"): "y las tuplas, para claves compuestas",
}

print(mezcla[42])
print(mezcla[("Madrid", "Sevilla")])
```

```salida
los enteros también valen
y las tuplas, para claves compuestas
```

No valen listas, diccionarios ni conjuntos:

```python
distancias = {["Madrid", "Sevilla"]: 530}
```

```salida
TypeError: cannot use 'list' as a dict key (unhashable type: 'list')
```

> [!error] TypeError: unhashable type: 'list'
>
> Has usado una lista como clave. Conviértela en tupla y ya está: `{("Madrid", "Sevilla"): 530}`.
>
> Ese es el texto que verás en la mayoría de versiones de Python. Desde la 3.14 el mensaje añade el contexto delante y queda `cannot use 'list' as a dict key (unhashable type: 'list')`, que dice lo mismo más claro.

**Los valores, en cambio, pueden ser cualquier cosa**, sin restricción: números, textos, listas, otros diccionarios. Esa asimetría es la que da tanto juego a los diccionarios, y la explotaremos en la lección de estructuras anidadas.

```python
receta = {
    "nombre": "Tortilla de patatas",
    "raciones": 4,
    "ingredientes": ["patatas", "huevos", "cebolla", "aceite"],
    "vegetariana": True,
}

print(receta["ingredientes"])
print(receta["ingredientes"][0])
print(len(receta["ingredientes"]))
```

```salida
['patatas', 'huevos', 'cebolla', 'aceite']
patatas
4
```

Fíjate en el doble corchete de la segunda línea: primero se busca la clave `"ingredientes"`, que devuelve una lista, y después se pide el elemento 0 de esa lista. Se lee de izquierda a derecha, un paso cada vez.

> [!nota] Las claves no se repiten
>
> Un diccionario no puede tener dos claves iguales. Si lo escribes así, la última gana y la primera se pierde en silencio:
>
> ```python
> precios = {"pan": 1.20, "leche": 0.95, "pan": 1.50}
>
> print(precios)
> print(len(precios))
> ```
>
> ```salida
> {'pan': 1.5, 'leche': 0.95}
> 2
> ```
>
> Es el mismo comportamiento que con los duplicados de un conjunto, y es coherente con lo que significa una clave: es la forma de identificar una entrada, así que solo puede haber una.

## Comparación con las otras colecciones

|  | Lista | Conjunto | Diccionario |
| --- | --- | --- | --- |
| Se escribe | `[1, 2]` | `{1, 2}` | `{"a": 1}` |
| Vacío | `[]` | `set()` | `{}` |
| Se accede por | Índice | No se accede | Clave |
| `in` mira | Los elementos | Los elementos | Las claves |
| Velocidad de `in` | Lenta | Muy rápida | Muy rápida |
| Duplicados | Sí | No | No en las claves |
| Para qué | Datos en orden | Pertenencia y únicos | Datos con nombre |

La forma corta de decidir: si tus datos tienen una etiqueta natural (un nombre, un código, un identificador) y vas a buscar por ella, es un diccionario.

## Un ejemplo completo

```python title="agenda.py"
telefonos = {
    "Ana": "600 111 222",
    "Luis": "610 333 444",
    "Marta": "620 555 666",
}

print(f"Contactos en la agenda: {len(telefonos)}")
print(f"Teléfono de Luis: {telefonos['Luis']}")

buscado = "Pedro"
print(f"Teléfono de {buscado}: {telefonos.get(buscado, 'no está en la agenda')}")

if buscado in telefonos:
        print(f"{buscado} está guardado")
else:
        print(f"{buscado} no está guardado")

# El valor puede ser una lista: varios teléfonos por contacto
telefonos_multiples = {
    "Ana": ["600 111 222", "910 000 111"],
    "Luis": ["610 333 444"],
}

print(f"Ana tiene {len(telefonos_multiples['Ana'])} teléfonos")
print(f"El primero es {telefonos_multiples['Ana'][0]}")
```

```salida
Contactos en la agenda: 3
Teléfono de Luis: 610 333 444
Teléfono de Pedro: no está en la agenda
Pedro no está guardado
Ana tiene 2 teléfonos
El primero es 600 111 222
```

> [!resumen] En resumen
>
> Un diccionario guarda pares de clave y valor y se accede por la clave, no por la posición, lo que resuelve el problema de mantener dos listas emparejadas. Se escribe con llaves y pares `clave: valor`, y el vacío es `{}`. El acceso con corchetes falla con `KeyError` si la clave no existe, así que se protege comprobando antes con `in` o, mejor, usando `get()`, que devuelve `None` o el valor por defecto que le indiques. El operador `in` mira las claves, nunca los valores, y `len()` cuenta pares. Las claves tienen que ser inmutables, así que valen cadenas, números y tuplas, pero no listas; los valores pueden ser cualquier cosa, incluidas listas y otros diccionarios. Y las claves no se repiten: si repites una al crear el diccionario, la última sobrescribe a la primera.

> [!ejercicio] Practica
>
> Crea `28-diccionarios.py` y resuelve:
>
> 1. Crea un diccionario con cinco países y sus capitales. Imprime cuántos hay y la capital de dos de ellos.
> 2. Crea un diccionario que describa un libro con las claves `titulo`, `autor`, `anio` y `paginas`, e imprime una ficha de cuatro líneas con f-strings.
> 3. Pide un país por teclado y muestra su capital, usando `get()` para responder con un mensaje decente si no lo tienes.
> 4. Provoca un `KeyError` a propósito y anota el mensaje exacto. Después arréglalo de las dos maneras: con `in` y con `get()`.
> 5. Comprueba qué devuelven `"Madrid" in capitales` y `"Madrid" in capitales.values()`, y explica la diferencia en un comentario.
> 6. Crea un diccionario cuyos valores sean listas, por ejemplo la lista de alumnos de cada asignatura, e imprime cuántos alumnos tiene una asignatura concreta y quién es el primero.
