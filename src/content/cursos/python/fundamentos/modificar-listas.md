---
titulo: "Modificar listas"
resumen: "Las listas sí se pueden cambiar: añadir, insertar, sustituir y quitar elementos sin crear una lista nueva."
minutos: 13
orden: 21
---

Cuando intentaste cambiar una letra de una cadena, Python te lo prohibió: las cadenas son inmutables y la única salida era construir una cadena nueva. Con las listas ocurre justo lo contrario. Una lista se puede tocar por dentro tantas veces como quieras, y esa es la razón principal de que exista.

Se dice que las listas son **mutables**. Tiene consecuencias buenas, que verás ahora, y una trampa importante, que verás en la lección de las copias.

## Cambiar un elemento por su índice

Se asigna igual que a una variable, pero con el índice delante:

```python
tareas = ["comprar pan", "llamar al banco", "regar plantas"]

tareas[1] = "llamar al banco (hecho)"

print(tareas)
```

```salida
['comprar pan', 'llamar al banco (hecho)', 'regar plantas']
```

No se ha creado ninguna lista nueva: es la misma lista, con la posición 1 ocupada por otro valor. Compara con lo que pasaba en las cadenas:

```python
palabra = "Python"
palabra[0] = "J"
```

```salida
TypeError: 'str' object does not support item assignment
```

Ese error no existe en las listas. `tareas[0] = "otra cosa"` simplemente funciona.

> [!aviso] Solo puedes asignar a un índice que ya existe
>
> `tareas[3] = "algo"` en una lista de tres elementos da `IndexError: list assignment index out of range`. La asignación **sustituye**, nunca añade. Para añadir están los métodos de abajo.

## Añadir al final: `append`

Es el método que más vas a usar en tu vida con Python. Añade un elemento al final de la lista:

```python
carrito = []

carrito.append("leche")
carrito.append("huevos")
carrito.append("café")

print(carrito)
print(len(carrito))
```

```salida
['leche', 'huevos', 'café']
3
```

El patrón "lista vacía más `append` dentro de un bucle" es la forma estándar de construir una lista a partir de otra cosa:

```python
cuadrados = []

for numero in range(1, 6):
        cuadrados.append(numero ** 2)

print(cuadrados)
```

```salida
[1, 4, 9, 16, 25]
```

> [!nota] append no devuelve la lista
>
> `append` modifica la lista y devuelve `None`. Por eso `carrito = carrito.append("pan")` es un error clásico: deja `carrito` valiendo `None` y pierdes la lista entera. Se escribe `carrito.append("pan")` a secas, sin asignar nada.

## Insertar en una posición: `insert`

`insert(posicion, valor)` coloca el elemento en ese índice y empuja el resto hacia la derecha:

```python
cola = ["Ana", "Luis", "Marta"]

cola.insert(0, "Pedro")      # al principio
cola.insert(2, "Sara")       # en la tercera posición

print(cola)
```

```salida
['Pedro', 'Ana', 'Sara', 'Luis', 'Marta']
```

Si la posición se sale de la lista, `insert` no falla: pega el elemento al extremo más cercano. `cola.insert(500, "Juan")` lo pone al final, igual que `append`.

## Añadir varios: `extend`

`extend` recibe otra colección y mete **sus elementos** uno a uno al final:

```python
invitados = ["Ana", "Luis"]
nuevos = ["Marta", "Pedro"]

invitados.extend(nuevos)

print(invitados)
```

```salida
['Ana', 'Luis', 'Marta', 'Pedro']
```

### La diferencia entre `append` y `extend`

Es la confusión número uno con las listas, y se entiende de golpe viéndolas juntas:

```python
con_append = ["Ana", "Luis"]
con_extend = ["Ana", "Luis"]

con_append.append(["Marta", "Pedro"])
con_extend.extend(["Marta", "Pedro"])

print(con_append)
print(len(con_append))
print(con_extend)
print(len(con_extend))
```

```salida
['Ana', 'Luis', ['Marta', 'Pedro']]
3
['Ana', 'Luis', 'Marta', 'Pedro']
4
```

`append` añade **un** elemento, sea lo que sea; si le das una lista, mete la lista entera como un solo elemento y acabas con una lista dentro de otra. `extend` añade **los elementos** de lo que le pases.

| Quieres | Usa | Resultado sobre `[1, 2]` con `[3, 4]` |
| --- | --- | --- |
| Añadir un elemento | `append` | `[1, 2, [3, 4]]` |
| Añadir varios elementos | `extend` | `[1, 2, 3, 4]` |

> [!aviso] extend acepta cualquier secuencia, y las cadenas son secuencias
>
> `letras.extend("sol")` no añade `"sol"`, añade `'s'`, `'o'` y `'l'` por separado, porque recorre lo que le das. Si quieres meter la palabra completa, es `append`.
>
> ```python
> letras = ["a", "b"]
> letras.extend("sol")
> print(letras)
> ```
>
> ```salida
> ['a', 'b', 's', 'o', 'l']
> ```

## Quitar por valor: `remove`

`remove` busca el valor y borra **la primera aparición**:

```python
colores = ["rojo", "verde", "azul", "verde"]

colores.remove("verde")

print(colores)
```

```salida
['rojo', 'azul', 'verde']
```

Solo ha desaparecido el primer `"verde"`. El segundo sigue ahí.

> [!error] ValueError: list.remove(x): x not in list
>
> `remove` exige que el valor esté en la lista. Si no está, no lo ignora: falla.
>
> ```python
> colores = ["rojo", "verde", "azul"]
> colores.remove("morado")
> ```
>
> ```salida
> ValueError: list.remove(x): x not in list
> ```
>
> La solución es comprobarlo antes con `in`:
>
> ```python
> colores = ["rojo", "verde", "azul"]
>
> if "morado" in colores:
>         colores.remove("morado")
> else:
>         print("Ese color no estaba en la lista.")
> ```
>
> ```salida
> Ese color no estaba en la lista.
> ```

## Quitar por posición: `pop`

`pop` es distinto de todos los demás: borra el elemento **y te lo devuelve**, así que puedes trabajar con él.

```python
pila = ["primero", "segundo", "tercero"]

ultimo = pila.pop()        # sin argumento: el último
print(ultimo)
print(pila)

primero = pila.pop(0)      # con índice
print(primero)
print(pila)
```

```salida
tercero
['primero', 'segundo']
primero
['segundo']
```

Esa doble función lo hace ideal para procesar una lista hasta vaciarla:

```python
pendientes = ["revisar correo", "llamar al banco", "comprar pan"]

while pendientes:
        tarea = pendientes.pop(0)
    print(f"Haciendo: {tarea} (quedan {len(pendientes)})")

print("Todo hecho.")
```

```salida
Haciendo: revisar correo (quedan 2)
Haciendo: llamar al banco (quedan 1)
Haciendo: comprar pan (quedan 0)
Todo hecho.
```

El `while pendientes:` se apoya en que una lista vacía es falsa: el bucle acaba solo cuando no queda nada.

> [!error] IndexError: pop index out of range
>
> Le has pedido a `pop` una posición que no existe, o has llamado a `pop()` sobre una lista ya vacía (en ese caso el mensaje es `IndexError: pop from empty list`). Comprueba con `if lista:` antes de sacar elementos.

## Quitar con `del`

`del` no es un método, es una instrucción del lenguaje. Borra por índice y no devuelve nada:

```python
numeros = [10, 20, 30, 40, 50]

del numeros[0]
print(numeros)

del numeros[1:3]        # también borra rebanadas
print(numeros)
```

```salida
[20, 30, 40, 50]
[20, 50]
```

Usa `pop` cuando quieras el elemento que quitas y `del` cuando solo quieras que desaparezca.

## Vaciar la lista: `clear`

```python
temporal = [1, 2, 3, 4]

temporal.clear()

print(temporal)
print(len(temporal))
```

```salida
[]
0
```

## Unir y repetir listas

Los operadores `+` y `*` funcionan igual que en las cadenas, y a diferencia de los métodos anteriores **no modifican nada**: crean una lista nueva.

```python
turno_manana = ["Ana", "Luis"]
turno_tarde = ["Marta", "Pedro"]

todos = turno_manana + turno_tarde
print(todos)
print(turno_manana)          # intacta

print([0] * 5)
print(["-"] * 3 + ["|"])
```

```salida
['Ana', 'Luis', 'Marta', 'Pedro']
['Ana', 'Luis']
[0, 0, 0, 0, 0]
['-', '-', '-', '|']
```

`[0] * 5` es la forma habitual de crear una lista de un tamaño fijo ya inicializada, por ejemplo un contador por cada día de la semana.

> [!nota] Sumar una lista con otra cosa no funciona
>
> `[1, 2] + "ab"` da `TypeError: can only concatenate list (not "str") to list`. El `+` solo une listas con listas. Para añadir los caracteres de una cadena está `extend`, y para añadir un único elemento, `append`.

## Resumen de los métodos

| Método | Qué hace | Devuelve |
| --- | --- | --- |
| `lista[i] = x` | Sustituye la posición `i` | — |
| `lista.append(x)` | Añade `x` al final | `None` |
| `lista.insert(i, x)` | Inserta `x` en la posición `i` | `None` |
| `lista.extend(otra)` | Añade los elementos de `otra` | `None` |
| `lista.remove(x)` | Borra la primera aparición de `x` | `None` |
| `lista.pop()` | Borra y devuelve el último | El elemento |
| `lista.pop(i)` | Borra y devuelve el de la posición `i` | El elemento |
| `del lista[i]` | Borra la posición `i` | — |
| `lista.clear()` | Deja la lista vacía | `None` |
| `lista + otra` | Lista nueva con las dos | La lista nueva |
| `lista * n` | Lista nueva repetida `n` veces | La lista nueva |

> [!consejo] Si un método devuelve None, no lo asignes
>
> Mira la columna de la derecha. Todos los métodos que modifican la lista devuelven `None`, porque su trabajo es cambiarla, no producir otra. Cada vez que escribas `lista = lista.algo()` con uno de ellos, estás destruyendo tu lista. Los que sí devuelven algo nuevo son los operadores `+` y `*`.

## Un ejemplo completo

```python title="inventario.py"
inventario = ["tornillos", "tuercas", "clavos"]
print(f"Inicial:    {inventario}")

inventario.append("arandelas")
inventario.insert(0, "martillos")
print(f"Ampliado:   {inventario}")

if "clavos" in inventario:
        inventario.remove("clavos")
print(f"Sin clavos: {inventario}")

retirado = inventario.pop()
print(f"Retirado:   {retirado}")
print(f"Final:      {inventario} ({len(inventario)} artículos)")
```

```salida
Inicial:    ['tornillos', 'tuercas', 'clavos']
Ampliado:   ['martillos', 'tornillos', 'tuercas', 'clavos', 'arandelas']
Sin clavos: ['martillos', 'tornillos', 'tuercas', 'arandelas']
Retirado:   arandelas
Final:      ['martillos', 'tornillos', 'tuercas'] (3 artículos)
```

> [!resumen] En resumen
>
> Las listas son mutables: se pueden cambiar por dentro sin crear otra. Se asigna por índice con `lista[i] = valor`, siempre a una posición que ya exista. Para añadir, `append` mete un elemento al final, `insert` lo coloca en una posición concreta y `extend` añade los elementos de otra colección, que es la diferencia que más confunde. Para quitar, `remove` busca por valor y da `ValueError` si no lo encuentra, `pop` borra por índice y además devuelve el elemento, `del` borra sin devolver nada y `clear` vacía la lista. Todos esos métodos devuelven `None`, así que nunca escribas `lista = lista.append(x)`; los que crean una lista nueva son los operadores `+` y `*`.

> [!ejercicio] Practica
>
> Crea `21-modificar-listas.py` y resuelve:
>
> 1. Parte de la lista `["pan", "leche"]`. Añade `"huevos"` al final, `"café"` al principio y `"sal"` en la tercera posición. Imprime la lista después de cada cambio.
> 2. Crea una lista vacía y rellénala con los múltiplos de 3 menores que 30 usando un `for` y `append`.
> 3. Haz dos listas con tres nombres cada una. Únelas con `+` en una tercera y comprueba que las originales no han cambiado. Repite con `extend` y observa la diferencia.
> 4. Con la lista `["a", "b", "c", "d"]`, prueba `append(["e", "f"])` en una copia y `extend(["e", "f"])` en otra. Imprime la longitud de las dos y explica el resultado.
> 5. Simula una cola de atención: una lista con cuatro nombres y un `while` que vaya sacando el primero con `pop(0)` e imprimiendo a quién atiende y cuántos quedan.
> 6. Intenta borrar con `remove` un elemento que no está en la lista, lee el error y arréglalo comprobándolo antes con `in`.
