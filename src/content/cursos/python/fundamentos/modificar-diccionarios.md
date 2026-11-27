---
titulo: "Modificar diccionarios"
resumen: "Añadir, actualizar y borrar pares, el orden en que se conservan y el patrón para contar apariciones de algo."
minutos: 12
orden: 29
---

Un diccionario creado de una vez con todos sus datos es la excepción. Lo normal es empezar con `{}` y llenarlo mientras el programa avanza: vas leyendo líneas, contando palabras, acumulando totales por categoría. Igual que las listas, los diccionarios son mutables, y casi todo su interés está en esa fase de construcción.

## Añadir y actualizar son la misma operación

Se asigna con corchetes, igual que en una lista, pero poniendo la clave:

```python
existencias = {"teclado": 4}

existencias["ratón"] = 7          # la clave no existía: la crea
existencias["teclado"] = 10       # la clave existía: cambia el valor

print(existencias)
```

```salida
{'teclado': 10, 'ratón': 7}
```

Esta es la diferencia de fondo con las listas. En una lista, `lista[5] = x` sobre una lista de tres elementos es `IndexError`, porque asignar solo sustituye. En un diccionario, asignar a una clave que no existe **la crea**. Python no distingue entre "añadir" y "actualizar": las dos cosas se escriben igual.

> [!aviso] La comodidad tiene un precio
>
> Que asignar cree la clave significa que una errata no da error, crea una entrada nueva:
>
> ```python
> usuario = {"nombre": "Erwin", "ciudad": "Madrid"}
>
> usuario["cuidad"] = "Sevilla"     # errata
>
> print(usuario)
> print(len(usuario))
> ```
>
> ```salida
> {'nombre': 'Erwin', 'ciudad': 'Madrid', 'cuidad': 'Sevilla'}
> 3
> ```
>
> Ahora tienes `ciudad` y `cuidad`, el programa sigue funcionando y el fallo aparecerá tres pantallas más allá. Cuando un dato parezca no actualizarse, imprime las claves con `print(list(usuario))` y busca duplicados sospechosos.

Modificar el valor cuando es un número suele hacerse con los operadores que ya conoces:

```python
existencias = {"teclado": 4, "ratón": 7}

existencias["teclado"] += 3
existencias["ratón"] -= 2

print(existencias)
```

```salida
{'teclado': 7, 'ratón': 5}
```

Eso sí exige que la clave exista, porque `+=` lee el valor antes de escribirlo. Si no existe, `KeyError`, y el arreglo es el de siempre: `existencias["monitor"] = existencias.get("monitor", 0) + 1`.

## Actualizar varios de golpe: `update()`

`update()` recibe otro diccionario y mete todos sus pares: los que no estaban se añaden y los que ya estaban se sobrescriben.

```python
configuracion = {
    "tema": "claro",
    "idioma": "es",
    "tamano_letra": 12,
}

preferencias_usuario = {
    "tema": "oscuro",
    "notificaciones": False,
}

configuracion.update(preferencias_usuario)

print(configuracion)
```

```salida
{'tema': 'oscuro', 'idioma': 'es', 'tamano_letra': 12, 'notificaciones': False}
```

Ese es el patrón clásico de configuración por defecto más ajustes del usuario: partes de unos valores razonables y los sobrescribes con los que haya elegido quien usa el programa, sin tener que comprobar uno por uno.

`update()` modifica el diccionario en el sitio y devuelve `None`, como los métodos de las listas, así que nunca escribas `configuracion = configuracion.update(...)`.

> [!nota] Otras formas de mezclar diccionarios
>
> `configuracion | preferencias_usuario` devuelve un diccionario **nuevo** con la mezcla, sin tocar ninguno de los dos, y `configuracion |= preferencias_usuario` hace lo mismo que `update()`. Es la sintaxis moderna, disponible desde Python 3.9, y el `|` se lee igual que la unión de conjuntos.
>
> ```python
> por_defecto = {"tema": "claro", "idioma": "es"}
> usuario = {"tema": "oscuro"}
>
> print(por_defecto | usuario)
> print(por_defecto)
> ```
>
> ```salida
> {'tema': 'oscuro', 'idioma': 'es'}
> {'tema': 'claro', 'idioma': 'es'}
> ```

## Borrar

`pop()` funciona como en las listas: quita la clave **y devuelve su valor**.

```python
usuario = {"nombre": "Erwin", "edad": 34, "contrasena": "1234"}

contrasena = usuario.pop("contrasena")

print(contrasena)
print(usuario)
```

```salida
1234
{'nombre': 'Erwin', 'edad': 34}
```

Si la clave no está, falla con `KeyError`, salvo que le des un segundo argumento con el valor por defecto, igual que a `get()`:

```python
usuario = {"nombre": "Erwin", "edad": 34}

print(usuario.pop("telefono", "no había teléfono"))
print(usuario)
```

```salida
no había teléfono
{'nombre': 'Erwin', 'edad': 34}
```

`del` borra sin devolver nada, y también da `KeyError` si la clave no existe:

```python
usuario = {"nombre": "Erwin", "edad": 34, "temporal": True}

del usuario["temporal"]

print(usuario)
```

```salida
{'nombre': 'Erwin', 'edad': 34}
```

> [!error] KeyError: 'telefono'
>
> Tanto el acceso con corchetes como `pop()` y `del` fallan con `KeyError` cuando la clave no existe.
>
> ```python
> usuario = {"nombre": "Erwin"}
> del usuario["telefono"]
> ```
>
> ```salida
> KeyError: 'telefono'
> ```
>
> Para borrar algo que puede no estar, la forma limpia es `usuario.pop("telefono", None)`, que quita la clave si está y no hace nada si no. Es el equivalente al `discard` de los conjuntos.

`clear()` vacía el diccionario, y `popitem()` saca el último par insertado devolviéndolo como tupla:

```python
historial = {"paso_1": "inicio", "paso_2": "pago"}

ultimo = historial.popitem()

print(ultimo)
print(historial)

historial.clear()
print(historial)
```

```salida
('paso_2', 'pago')
{'paso_1': 'inicio'}
{}
```

## `setdefault()`: leer y crear a la vez

`setdefault()` parece redundante con `get()` y no lo es. Los dos devuelven el valor de la clave, o un valor por defecto si no está, pero `setdefault()` además **guarda ese valor por defecto en el diccionario**.

```python
puntuaciones = {"Ana": 10}

print(puntuaciones.get("Luis", 0))
print(puntuaciones)

print(puntuaciones.setdefault("Luis", 0))
print(puntuaciones)
```

```salida
0
{'Ana': 10}
0
{'Ana': 10, 'Luis': 0}
```

`get()` consultó y se fue sin dejar rastro. `setdefault()` consultó y, al no encontrar nada, creó la entrada.

Su utilidad real aparece cuando los valores son listas y vas agrupando cosas. Sin `setdefault()` hay que comprobar siempre si la clave existe antes de añadir:

```python
inscripciones = [
    ("python", "Ana"),
    ("django", "Luis"),
    ("python", "Marta"),
    ("python", "Pedro"),
]

por_curso = {}

for curso, alumno in inscripciones:
        if curso not in por_curso:
                por_curso[curso] = []
    por_curso[curso].append(alumno)

print(por_curso)
```

```salida
{'python': ['Ana', 'Marta', 'Pedro'], 'django': ['Luis']}
```

Con `setdefault()`, esas tres líneas son una:

```python
inscripciones = [
    ("python", "Ana"),
    ("django", "Luis"),
    ("python", "Marta"),
    ("python", "Pedro"),
]

por_curso = {}

for curso, alumno in inscripciones:
        por_curso.setdefault(curso, []).append(alumno)

print(por_curso)
```

```salida
{'python': ['Ana', 'Marta', 'Pedro'], 'django': ['Luis']}
```

Esa línea hace dos cosas seguidas: `setdefault(curso, [])` devuelve la lista de ese curso, creándola vacía si era la primera vez, y sobre la lista devuelta se hace `append`. Es el modismo estándar para agrupar en Python y conviene reconocerlo cuando lo veas, porque se usa mucho.

> [!consejo] get para leer, setdefault para construir
>
> Si solo quieres consultar, usa `get()`: no ensucia el diccionario con claves que nadie ha pedido. Usa `setdefault()` cuando estés construyendo el diccionario y la clave vaya a hacer falta de todos modos, sobre todo si el valor es una lista a la que vas a añadir cosas.

## Los diccionarios conservan el orden de inserción

Dilo así, porque es exacto: **desde Python 3.7, un diccionario recuerda el orden en que se insertaron sus claves** y lo respeta al recorrerlo o imprimirlo. No es un detalle de una implementación concreta, es una garantía del lenguaje.

```python
pasos = {}

pasos["tercero"] = "pagar"
pasos["primero"] = "elegir"
pasos["segundo"] = "confirmar"

print(pasos)
print(list(pasos))
```

```salida
{'tercero': 'pagar', 'primero': 'elegir', 'segundo': 'confirmar'}
['tercero', 'primero', 'segundo']
```

Salen en el orden en que los metiste, no ordenados alfabéticamente ni de ninguna otra manera. Y fíjate en `list(pasos)`: convertir un diccionario en lista te da **sus claves**, igual que hacía `in`. Dos matices importantes:

- **Conservar el orden de inserción no es estar ordenado.** Si quieres los datos por orden alfabético o por valor, hay que pedirlo con `sorted()`, y eso es la próxima lección.
- **Volver a asignar una clave que ya existe no la mueve al final.** Cambia su valor y la deja donde estaba.

```python
pasos = {"a": 1, "b": 2, "c": 3}

pasos["a"] = 99        # solo cambia el valor

print(pasos)

del pasos["b"]
pasos["b"] = 2         # borrada y vuelta a insertar: ahora sí va al final

print(pasos)
```

```salida
{'a': 99, 'b': 2, 'c': 3}
{'a': 99, 'c': 3, 'b': 2}
```

En código antiguo verás `collections.OrderedDict`, que existía justamente porque los diccionarios normales no daban esta garantía. Hoy casi nunca hace falta.

## El patrón que más vas a repetir: contar

Contar cuántas veces aparece cada cosa es el ejercicio típico de diccionarios, y por una buena razón: aparece en todas partes, desde contar palabras de un texto hasta contar errores por tipo o ventas por ciudad.

La versión con `get()` es la más habitual y la que deberías memorizar:

```python title="palabras.py"
texto = """el perro ladra y el gato maulla
el perro corre y el gato duerme"""

palabras = texto.split()
apariciones = {}

for palabra in palabras:
        apariciones[palabra] = apariciones.get(palabra, 0) + 1

print(f"Palabras totales:   {len(palabras)}")
print(f"Palabras distintas: {len(apariciones)}")
print(apariciones)
```

```salida
Palabras totales:   14
Palabras distintas: 8
{'el': 4, 'perro': 2, 'ladra': 1, 'y': 2, 'gato': 2, 'maulla': 1, 'corre': 1, 'duerme': 1}
```

La línea clave es `apariciones[palabra] = apariciones.get(palabra, 0) + 1`, y se lee de derecha a izquierda: coge el contador actual de esa palabra, o cero si es la primera vez que la ves; súmale uno; guárdalo.

Con `setdefault()` sale casi igual, aunque aquí `get()` se lee mejor:

```python
palabras = ["sol", "mar", "sol", "luz", "sol"]
apariciones = {}

for palabra in palabras:
        apariciones.setdefault(palabra, 0)
    apariciones[palabra] += 1

print(apariciones)
```

```salida
{'sol': 3, 'mar': 1, 'luz': 1}
```

Y para acumular sumas en vez de cuentas, el patrón es el mismo cambiando el `+ 1` por el valor:

```python
ventas = [
    ("Madrid", 1200),
    ("Sevilla", 800),
    ("Madrid", 450),
    ("Bilbao", 600),
    ("Sevilla", 150),
]

total_por_ciudad = {}

for ciudad, importe in ventas:
        total_por_ciudad[ciudad] = total_por_ciudad.get(ciudad, 0) + importe

print(total_por_ciudad)
print(f"Total general: {sum(total_por_ciudad.values())} €")
```

```salida
{'Madrid': 1650, 'Sevilla': 950, 'Bilbao': 600}
Total general: 3200 €
```

> [!nota] Hay una clase preparada para contar
>
> En el módulo `collections` de la biblioteca estándar está `Counter`, que hace todo esto solo: `Counter(palabras)` devuelve directamente el diccionario de apariciones, y `.most_common(3)` te da las tres más frecuentes. Se usa mucho en código real, pero aprende primero el patrón a mano: es el que te va a servir cuando lo que acumules no sea una simple cuenta.

## Copiar un diccionario

Se aplica todo lo que viste con las listas, punto por punto: `otro = diccionario` no copia nada, solo crea un segundo nombre.

```python
original = {"tema": "claro", "idioma": "es"}
segundo_nombre = original
copia = original.copy()

segundo_nombre["tema"] = "oscuro"
copia["idioma"] = "en"

print(f"original: {original}")
print(f"copia:    {copia}")
```

```salida
original: {'tema': 'oscuro', 'idioma': 'es'}
copia:    {'tema': 'claro', 'idioma': 'en'}
```

Y la copia es superficial: si los valores son listas u otros diccionarios, se siguen compartiendo, y ahí vuelve a hacer falta `copy.deepcopy()`.

## Tabla de referencia

| Operación | Qué hace | Si la clave no existe |
| --- | --- | --- |
| `d[clave]` | Lee el valor | `KeyError` |
| `d[clave] = valor` | Crea o actualiza | La crea |
| `d.get(clave)` | Lee el valor | Devuelve `None` |
| `d.get(clave, x)` | Lee el valor | Devuelve `x` |
| `d.setdefault(clave, x)` | Lee el valor | La crea con `x` y lo devuelve |
| `d.update(otro)` | Mezcla otro diccionario | Añade las que falten |
| `d.pop(clave)` | Borra y devuelve el valor | `KeyError` |
| `d.pop(clave, x)` | Borra y devuelve el valor | Devuelve `x` |
| `del d[clave]` | Borra | `KeyError` |
| `d.popitem()` | Borra y devuelve el último par | `KeyError` si está vacío |
| `d.clear()` | Vacía el diccionario | — |
| `d.copy()` | Copia superficial nueva | — |

> [!resumen] En resumen
>
> En un diccionario, añadir y actualizar son la misma operación: `d[clave] = valor` crea la clave si no existía, lo que resulta cómodo pero hace que una errata pase desapercibida creando una entrada nueva. `update()` mezcla otro diccionario encima, sobrescribiendo lo que coincida, y es el patrón de valores por defecto más preferencias del usuario. Se borra con `pop()`, que devuelve el valor y admite un valor por defecto, y con `del`, que no devuelve nada; los dos dan `KeyError` si la clave falta. `setdefault()` se diferencia de `get()` en que además guarda el valor por defecto, lo que lo hace ideal para agrupar con `d.setdefault(clave, []).append(x)`. Desde Python 3.7 los diccionarios conservan el orden de inserción como garantía del lenguaje, que no es lo mismo que estar ordenados. Y el patrón para contar apariciones que vas a repetir mil veces es `contador[x] = contador.get(x, 0) + 1`.

> [!ejercicio] Practica
>
> Crea `29-modificar-diccionarios.py` y resuelve:
>
> 1. Empieza con un diccionario de existencias vacío. Añade tres productos con sus cantidades, sube una cantidad, baja otra y borra un producto. Imprime el diccionario después de cada paso.
> 2. Crea un diccionario de configuración por defecto con cuatro claves y otro con dos preferencias del usuario. Mézclalos con `update()` e imprime el resultado.
> 3. Cuenta cuántas veces aparece cada letra en una frase, usando el patrón con `get()`, sin contar los espacios.
> 4. Con una lista de tuplas `(ciudad, importe)`, calcula el total vendido en cada ciudad y el total general.
> 5. Agrupa una lista de nombres por su primera letra en un diccionario de listas, usando `setdefault`.
> 6. Añade una clave con una errata a propósito, imprime las claves y explica en un comentario por qué Python no ha avisado.
