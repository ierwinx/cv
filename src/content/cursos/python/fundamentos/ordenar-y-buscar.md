---
titulo: "Ordenar y buscar en listas"
resumen: "Ordenar en el sitio o en una lista nueva, cambiar el criterio de orden, localizar elementos y resumir una lista con una función."
minutos: 13
orden: 24
---

Una lista llega casi siempre en el orden en que se recogieron los datos, que rara vez es el orden en que quieres mostrarlos. Ordenar alfabéticamente un listado de nombres, poner los precios de menor a mayor o sacar la nota más alta son operaciones tan frecuentes que Python las trae resueltas.

Lo que sí tienes que decidir cada vez es si quieres **reordenar la lista que tienes** o **obtener una lista nueva ordenada** dejando la original en paz. Esa decisión es la que separa `sort()` de `sorted()`, y confundirlas es el error clásico de esta lección.

## `sort()` ordena la lista en el sitio

```python
precios = [29.99, 189.00, 15.50, 45.00]

precios.sort()

print(precios)
```

```salida
[15.5, 29.99, 45.0, 189.0]
```

La lista original ha cambiado. No hay ninguna lista nueva, y `sort()` **no devuelve nada**:

```python
precios = [29.99, 189.00, 15.50]

resultado = precios.sort()

print(resultado)
print(precios)
```

```salida
None
[15.5, 29.99, 189.0]
```

> [!error] La lista se convierte en None
>
> Este es, con diferencia, el error más repetido de toda la lección:
>
> ```python
> nombres = ["Marta", "Ana", "Luis"]
> nombres = nombres.sort()
> print(nombres)
> print(len(nombres))
> ```
>
> ```salida
> None
> TypeError: object of type 'NoneType' has no len()
> ```
>
> `sort()` devuelve `None` porque su trabajo es reordenar la lista, no crear otra. Al asignar el resultado pierdes la lista entera y el siguiente uso falla con un mensaje que no menciona `sort` por ningún sitio. Se escribe `nombres.sort()` a secas, en su propia línea.

Con cadenas ordena alfabéticamente, pero con una salvedad que conviene ver:

```python
nombres = ["marta", "Ana", "luis", "Álvaro"]

nombres.sort()

print(nombres)
```

```salida
['Ana', 'luis', 'marta', 'Álvaro']
```

Las mayúsculas van antes que las minúsculas y las letras acentuadas se van al final, porque la comparación usa el código interno de cada carácter, no el orden del diccionario español. Se arregla con el parámetro `key`, unos apartados más abajo.

## `sorted()` devuelve una lista nueva

```python
precios = [29.99, 189.00, 15.50, 45.00]

ordenados = sorted(precios)

print(f"nueva:    {ordenados}")
print(f"original: {precios}")
```

```salida
nueva:    [15.5, 29.99, 45.0, 189.0]
original: [29.99, 189.0, 15.5, 45.0]
```

`sorted()` es una función, no un método, así que se escribe con la lista dentro de los paréntesis. La original queda intacta, y eso lo hace la opción más segura cuando solo quieres mostrar los datos ordenados.

|  | `lista.sort()` | `sorted(lista)` |
| --- | --- | --- |
| Qué es | Método de las listas | Función general |
| A la original | La reordena | No la toca |
| Devuelve | `None` | Una lista nueva |
| Se escribe | `lista.sort()` | `nueva = sorted(lista)` |
| Funciona con | Solo listas | Cualquier colección |

Ese último punto importa: `sorted()` acepta cadenas, tuplas, conjuntos y diccionarios, y siempre te devuelve una lista.

```python
print(sorted("python"))
print(sorted((3, 1, 2)))
```

```salida
['h', 'n', 'o', 'p', 't', 'y']
[1, 2, 3]
```

> [!consejo] Cuál usar
>
> Si no lo tienes claro, usa `sorted()`. Que no modifique nada por detrás hace el código más fácil de seguir. Reserva `sort()` para cuando la lista sea tuya, larga, y vayas a trabajar con ella ya ordenada a partir de ese momento.

## De mayor a menor: `reverse`

Los dos aceptan el parámetro `reverse`, que da la vuelta al criterio:

```python
puntuaciones = [1200, 850, 3400, 2100]

print(sorted(puntuaciones, reverse=True))

puntuaciones.sort(reverse=True)
print(puntuaciones)
```

```salida
[3400, 2100, 1200, 850]
[3400, 2100, 1200, 850]
```

Es lo que quieres para cualquier ranking: la puntuación más alta primero.

## Cambiar el criterio: `key`

Por defecto se ordena comparando los elementos entre sí. Con `key` le dices a Python **qué mirar** de cada elemento para compararlo. Se le pasa el nombre de una función, sin paréntesis.

Ordenar por longitud en vez de alfabéticamente:

```python
palabras = ["murciélago", "sol", "ventana", "pez"]

print(sorted(palabras, key=len))
```

```salida
['sol', 'pez', 'ventana', 'murciélago']
```

Lo que ha pasado es que Python ha aplicado `len` a cada palabra y ha ordenado por el número resultante: 3, 3, 7, 10. `"sol"` y `"pez"` empatan a tres letras, y en caso de empate se mantiene el orden que tenían en la lista original. Eso se llama orden *estable* y es una garantía de Python, no una casualidad.

Ordenar sin que las mayúsculas molesten:

```python
nombres = ["marta", "Ana", "luis", "Pedro"]

print(sorted(nombres))                    # las mayúsculas van primero
print(sorted(nombres, key=str.lower))     # orden alfabético de verdad
```

```salida
['Ana', 'Pedro', 'luis', 'marta']
['Ana', 'luis', 'marta', 'Pedro']
```

`str.lower` es el método `lower` que ya usabas, escrito en la forma "el método de la clase cadena", que es como se le pasa a `key`. Python lo aplica a cada elemento para decidir el orden, pero **los elementos de la lista no se modifican**: siguen con sus mayúsculas.

> [!nota] Sin paréntesis
>
> Se escribe `key=len`, no `key=len()`. Con paréntesis estarías llamando a la función ahí mismo; sin ellos le pasas la función para que Python la llame él, una vez por elemento. Cuando aprendas a escribir tus propias funciones podrás pasar cualquiera, y con `lambda` podrás ordenar por criterios a medida.

Se pueden combinar `key` y `reverse`:

```python
palabras = ["sol", "murciélago", "ventana", "pez"]

print(sorted(palabras, key=len, reverse=True))
```

```salida
['murciélago', 'ventana', 'sol', 'pez']
```

> [!error] TypeError: '&lt;' not supported between instances of 'str' and 'int'
>
> No se puede ordenar una lista con tipos mezclados, porque Python no sabe si `"a"` va antes o después de `3`.
>
> ```python
> valores = [3, "diez", 1]
> valores.sort()
> ```
>
> ```salida
> TypeError: '<' not supported between instances of 'str' and 'int'
> ```
>
> Es una señal de que tus datos están sucios, típicamente números que han llegado como texto. Conviértelos antes de ordenar, o ordena por un criterio común con `key=str`.

## Dar la vuelta: `reverse()`

No confundas el método `reverse()` con el parámetro `reverse=True`. El método invierte el orden actual de la lista, esté ordenada o no, y también trabaja en el sitio devolviendo `None`:

```python
historial = ["inicio", "productos", "carrito", "pago"]

historial.reverse()

print(historial)
```

```salida
['pago', 'carrito', 'productos', 'inicio']
```

Si lo que quieres es una lista nueva invertida, tienes el rebanado `[::-1]`, que no toca la original:

```python
historial = ["inicio", "productos", "carrito", "pago"]

print(historial[::-1])
print(historial)
```

```salida
['pago', 'carrito', 'productos', 'inicio']
['inicio', 'productos', 'carrito', 'pago']
```

## Buscar: `index` y `count`

`index` te dice en qué posición está un valor, y `count` cuántas veces aparece:

```python
colores = ["rojo", "verde", "azul", "verde", "verde"]

print(colores.index("azul"))
print(colores.index("verde"))      # solo la primera aparición
print(colores.count("verde"))
print(colores.count("morado"))     # no está: cero
```

```salida
2
1
3
0
```

> [!error] ValueError: list.index(x): x not in list
>
> `index` falla si el valor no está, igual que `remove`:
>
> ```python
> colores = ["rojo", "verde", "azul"]
> print(colores.index("morado"))
> ```
>
> ```salida
> ValueError: list.index(x): x not in list
> ```
>
> Compruébalo antes con `in`, que nunca falla:
>
> ```python
> colores = ["rojo", "verde", "azul"]
> buscado = "morado"
>
> if buscado in colores:
>         print(f"{buscado} está en la posición {colores.index(buscado)}")
> else:
>         print(f"{buscado} no está en la lista")
> ```
>
> ```salida
> morado no está en la lista
> ```
>
> Fíjate en la diferencia de propósito: `in` responde sí o no, `index` responde dónde, y `count` responde cuántas veces. `count` es el único de los tres que no falla nunca.

## Resumir una lista con una función

Estas cinco funciones convierten una lista entera en un solo valor, y te ahorran el bucle que escribiste a mano en la lección anterior:

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4]

print(f"suma:   {sum(temperaturas)}")
print(f"mínima: {min(temperaturas)}")
print(f"máxima: {max(temperaturas)}")
print(f"media:  {sum(temperaturas) / len(temperaturas):.2f}")
```

```salida
suma:   116.9
mínima: 15.4
máxima: 31.0
media:  23.38
```

La media no tiene función propia: se calcula dividiendo la suma entre el número de elementos, y conviene darle formato con `:.2f` porque el resultado suele traer una cola de decimales innecesaria.

`min` y `max` también aceptan `key`, lo que los hace mucho más útiles:

```python
palabras = ["sol", "murciélago", "ventana", "pez"]

print(min(palabras))                # alfabéticamente
print(max(palabras, key=len))       # la más larga
```

```salida
murciélago
murciélago
```

Y luego hay dos que trabajan con condiciones, `any` y `all`:

```python
notas = [7.5, 4.0, 9.25, 6.0]
comprobaciones = []

for nota in notas:
        comprobaciones.append(nota >= 5)

print(comprobaciones)
print(any(comprobaciones))    # ¿alguno es True?
print(all(comprobaciones))    # ¿todos son True?
```

```salida
[True, False, True, True]
True
False
```

`any` responde "¿hay al menos uno?" y `all` responde "¿lo cumplen todos?". Hay al menos un aprobado, pero no han aprobado todos. En la próxima lección verás cómo escribir esa lista de comprobaciones en una sola línea, y entonces `any` y `all` se leerán como una frase.

> [!aviso] Sobre listas vacías
>
> `sum([])` da `0` y `len([])` da `0`, así que calcular una media sobre una lista vacía provoca `ZeroDivisionError: division by zero`. Y `max([])` falla con `ValueError: max() iterable argument is empty`. Antes de resumir una lista que podría venir vacía, comprueba `if lista:`.
>
> Los raros son `any` y `all`: sobre una lista vacía, `any([])` da `False` y `all([])` da `True`. Lo segundo sorprende, pero es lo coherente: si no hay ningún elemento, no hay ninguno que incumpla la condición.

## Tabla de referencia

| Operación | Modifica | Devuelve |
| --- | --- | --- |
| `lista.sort()` | Sí | `None` |
| `sorted(lista)` | No | Lista nueva |
| `lista.reverse()` | Sí | `None` |
| `lista[::-1]` | No | Lista nueva |
| `lista.index(x)` | No | Posición, o `ValueError` |
| `lista.count(x)` | No | Número de apariciones |
| `sum`, `min`, `max` | No | Un número |
| `any`, `all` | No | `True` o `False` |

## Un ejemplo completo

```python title="ranking.py"
jugadores = ["Marta", "ana", "Luis", "pedro", "Sara"]
puntos = [3400, 1200, 2100, 850, 2100]

print("Clasificación")
print("=" * 25)

for posicion, puntuacion in enumerate(sorted(puntos, reverse=True), start=1):
        jugador = jugadores[puntos.index(puntuacion)]
    print(f"{posicion}. {jugador:<8} {puntuacion:>6}")

print("=" * 25)
print(f"Jugadores:  {len(jugadores)}")
print(f"Total:      {sum(puntos)}")
print(f"Mejor:      {max(puntos)}")
print(f"Peor:       {min(puntos)}")
print(f"Media:      {sum(puntos) / len(puntos):.1f}")
print(f"Por nombre: {sorted(jugadores, key=str.lower)}")
```

```salida
Clasificación
=========================
1. Marta      3400
2. Luis       2100
3. Luis       2100
4. ana        1200
5. pedro       850
=========================
Jugadores:  5
Total:      9650
Mejor:      3400
Peor:       850
Media:      1930.0
Por nombre: ['ana', 'Luis', 'Marta', 'pedro', 'Sara']
```

Mira la clasificación con cuidado: Sara aparece como Luis. El fallo es mío y es a propósito, para que veas el límite de este enfoque. Como Luis y Sara empatan a 2100 puntos, `puntos.index(2100)` devuelve siempre la primera aparición, así que Sara nunca sale. Mantener dos listas emparejadas y cruzarlas por el valor es frágil; la solución buena es guardar cada jugador con sus puntos en una sola estructura, y eso son los diccionarios de dentro de unas lecciones.

> [!resumen] En resumen
>
> `lista.sort()` reordena la lista en el sitio y devuelve `None`, por lo que escribir `lista = lista.sort()` destruye la lista; `sorted(lista)` deja la original intacta y devuelve una lista nueva, y es la opción por defecto. Ambos aceptan `reverse=True` para invertir el criterio y `key` para decidir qué se compara de cada elemento, con `len` para ordenar por longitud y `str.lower` para un orden alfabético que ignore las mayúsculas. El método `reverse()` da la vuelta a la lista en el sitio y `[::-1]` hace lo mismo en una lista nueva. `index` localiza la primera aparición y falla con `ValueError` si no está, mientras que `count` cuenta apariciones y nunca falla. Y `sum`, `min`, `max`, `any` y `all` resumen una lista entera en un solo valor.

> [!ejercicio] Practica
>
> Crea `24-ordenar-y-buscar.py` y resuelve:
>
> 1. Con una lista de seis precios desordenados, imprime la lista original, la ordenada con `sorted()` de menor a mayor y la ordenada de mayor a menor, comprobando que la original no ha cambiado.
> 2. Escribe `lista = lista.sort()` a propósito, imprime el resultado y después intenta usar la lista. Anota el error que sale.
> 3. Ordena una lista de nombres con mayúsculas y minúsculas mezcladas de forma que el orden sea alfabético de verdad.
> 4. Ordena una lista de palabras de la más corta a la más larga, y luego de la más larga a la más corta.
> 5. Con una lista de notas, imprime la suma, la media con dos decimales, la nota más alta, la más baja y cuántas veces aparece un cinco.
> 6. Comprueba con `any` y `all` si alguna nota está por debajo de 5 y si todas llegan al 4, construyendo antes la lista de comprobaciones con un `for`.
