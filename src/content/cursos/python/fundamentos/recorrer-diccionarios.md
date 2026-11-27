---
titulo: "Recorrer diccionarios"
resumen: "Pasar por claves, valores y pares, ordenar por lo que te interese, invertirlos y presentarlos como una tabla."
minutos: 13
orden: 30
---

Un diccionario que solo consultas clave a clave aprovecha la mitad de lo que ofrece. La otra mitad aparece cuando lo recorres entero: sacar un informe de ventas por ciudad, listar la configuración, encontrar la palabra más repetida o mostrar un resumen ordenado.

El `for` sobre un diccionario tiene una peculiaridad que hay que aprender de entrada, y a partir de ahí todo es combinar lo que ya sabes de bucles, `sorted` y f-strings.

## El `for` recorre las claves

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

for producto in precios:
        print(producto)
```

```salida
pan
leche
café
```

Salen las **claves**, no los valores. Es coherente con `in`, que también mira las claves, y con `list(precios)`, que devuelve la lista de claves. La idea de fondo es que la clave es el identificador de cada entrada, así que recorrer el diccionario significa recorrer sus identificadores.

Teniendo la clave, el valor está a un corchete de distancia:

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

for producto in precios:
        print(f"{producto}: {precios[producto]:.2f} €")
```

```salida
pan: 1.20 €
leche: 0.95 €
café: 3.40 €
```

Funciona, pero hay una forma mejor, que es la que se usa en la práctica.

## `keys()`, `values()` e `items()`

Estos tres métodos dan acceso a las tres vistas de un diccionario:

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

print(precios.keys())
print(precios.values())
print(precios.items())
```

```salida
dict_keys(['pan', 'leche', 'café'])
dict_values([1.2, 0.95, 3.4])
dict_items([('pan', 1.2), ('leche', 0.95), ('café', 3.4)])
```

No son listas, y por eso se imprimen con ese envoltorio raro. Son **vistas**: ventanas al contenido real del diccionario que se actualizan solas si el diccionario cambia. Para la mayoría de usos da igual, porque se pueden recorrer y se les puede aplicar `len`, `in`, `sorted`, `sum`, `min` y `max`. Si necesitas una lista de verdad, las conviertes con `list()`.

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

print(list(precios.keys()))
print(sorted(precios.values()))
print(f"Total: {sum(precios.values()):.2f} €")
print(f"Más caro: {max(precios.values()):.2f} €")
print("leche" in precios.keys())
```

```salida
['pan', 'leche', 'café']
[0.95, 1.2, 3.4]
Total: 5.55 €
Más caro: 3.40 €
True
```

`sum(precios.values())` es el modismo que usarás siempre para totalizar un diccionario de números.

> [!nota] `keys()` es casi siempre innecesario
>
> `for producto in precios:` y `for producto in precios.keys():` hacen lo mismo, y `"pan" in precios` es igual que `"pan" in precios.keys()`. La versión corta es la que se considera idiomática. `keys()` solo aporta cuando quieres dejar muy claro que hablas de las claves, o cuando usas las vistas como si fueran conjuntos, que es algo que permiten: `d1.keys() & d2.keys()` te da las claves comunes a dos diccionarios.

### `items()` y el desempaquetado

Esta es la forma normal de recorrer un diccionario, y la que deberías usar por defecto. `items()` entrega en cada vuelta una tupla `(clave, valor)`, y el `for` la desempaqueta en dos variables, exactamente como hacía `zip`:

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

for producto, precio in precios.items():
        print(f"{producto:<8} {precio:>6.2f} €")
```

```salida
pan        1.20 €
leche      0.95 €
café       3.40 €
```

Comparado con acceder por `precios[producto]`, este recorrido evita repetir la búsqueda en cada vuelta y se lee mejor: los dos nombres del `for` dicen qué es cada cosa.

Si quieres ver la tupla sin desempaquetar, ahí está:

```python
precios = {"pan": 1.20, "leche": 0.95}

for par in precios.items():
        print(par, type(par))
```

```salida
('pan', 1.2) <class 'tuple'>
('leche', 0.95) <class 'tuple'>
```

| Recorrido | Qué te da en cada vuelta |
| --- | --- |
| `for clave in d:` | La clave |
| `for clave in d.keys():` | La clave, escrito más largo |
| `for valor in d.values():` | El valor, sin saber de quién es |
| `for clave, valor in d.items():` | Los dos a la vez |

> [!aviso] No cambies el tamaño del diccionario mientras lo recorres
>
> Es la misma regla que con las listas, pero aquí Python sí protesta:
>
> ```python
> existencias = {"teclado": 4, "ratón": 0, "monitor": 2}
>
> for producto, cantidad in existencias.items():
>         if cantidad == 0:
>                 del existencias[producto]
> ```
>
> ```salida
> RuntimeError: dictionary changed size during iteration
> ```
>
> La solución es recorrer una lista de las claves, que es una copia independiente del diccionario:
>
> ```python
> existencias = {"teclado": 4, "ratón": 0, "monitor": 2}
>
> for producto in list(existencias):
>         if existencias[producto] == 0:
>                 del existencias[producto]
>
> print(existencias)
> ```
>
> ```salida
> {'teclado': 4, 'monitor': 2}
> ```
>
> Cambiar el **valor** de una clave existente durante el recorrido sí es seguro, porque el tamaño no varía.

## Ordenar por clave

`sorted()` sobre un diccionario devuelve la lista de sus claves ordenadas, y con eso ya tienes el recorrido alfabético:

```python
poblacion = {"Sevilla": 685000, "Madrid": 3280000, "Bilbao": 346000}

for ciudad in sorted(poblacion):
        print(f"{ciudad:<10} {poblacion[ciudad]:>10,}")
```

```salida
Bilbao        346,000
Madrid      3,280,000
Sevilla       685,000
```

También puedes ordenar los pares, y ahí `sorted` compara las tuplas: primero por el primer elemento, y si empatan, por el segundo.

```python
poblacion = {"Sevilla": 685000, "Madrid": 3280000, "Bilbao": 346000}

print(sorted(poblacion.items()))
```

```salida
[('Bilbao', 346000), ('Madrid', 3280000), ('Sevilla', 685000)]
```

## Ordenar por valor

Ordenar por valor es lo que quieres para cualquier ranking, y se hace con el parámetro `key` que ya conoces. El truco está en qué pasarle: el método `get` del propio diccionario.

```python
poblacion = {"Sevilla": 685000, "Madrid": 3280000, "Bilbao": 346000}

for ciudad in sorted(poblacion, key=poblacion.get, reverse=True):
        print(f"{ciudad:<10} {poblacion[ciudad]:>10,}")
```

```salida
Madrid      3,280,000
Sevilla       685,000
Bilbao        346,000
```

Lo que ocurre es exactamente lo mismo que con `key=len` en la lección de ordenar listas: `sorted` recorre las claves y, para decidir el orden de cada una, le aplica `poblacion.get`, que devuelve su valor. Ordena las claves comparando sus valores. Se escribe `poblacion.get`, sin paréntesis, porque le estás pasando el método para que Python lo llame.

Cuando además quieres trabajar con los pares completos, el camino con lo que sabes hasta ahora es construir una lista de tuplas con el valor **delante**. Como `sorted` compara las tuplas por su primer elemento, ordenar esa lista es ordenar por valor:

```python
apariciones = {"el": 4, "perro": 2, "gato": 2, "ladra": 1}

pares_invertidos = [(veces, palabra) for palabra, veces in apariciones.items()]

print(sorted(pares_invertidos, reverse=True))
```

```salida
[(4, 'el'), (2, 'perro'), (2, 'gato'), (1, 'ladra')]
```

Y al recorrerlo se desempaqueta al revés, primero el número y luego la palabra:

```python
apariciones = {"el": 4, "perro": 2, "gato": 2, "ladra": 1}

pares_invertidos = [(veces, palabra) for palabra, veces in apariciones.items()]

for veces, palabra in sorted(pares_invertidos, reverse=True):
        print(f"{palabra:<8} {veces}")
```

```salida
el       4
perro    2
gato     2
ladra    1
```

Esa técnica de colocar delante el campo por el que quieres ordenar se llama *decorar y ordenar*, y no necesita nada nuevo.

> [!nota] La forma que verás en código real
>
> Lo habitual es escribir `sorted(apariciones.items(), key=lambda par: par[1], reverse=True)`. `lambda` es una función escrita en una línea y llega en el módulo de funciones; hasta entonces, `key=diccionario.get` y el truco de invertir las tuplas te resuelven todos los casos.

## Comprensiones de diccionario

Igual que las listas y los conjuntos, los diccionarios tienen su comprensión. La diferencia es que dentro de las llaves hay dos partes separadas por dos puntos: la clave y el valor.

```python
precios = {"pan": 1.20, "leche": 0.95, "café": 3.40}

con_iva = {producto: round(precio * 1.21, 2) for producto, precio in precios.items()}

print(con_iva)
```

```salida
{'pan': 1.45, 'leche': 1.15, 'café': 4.11}
```

La estructura es `{clave: valor for ... in ...}`, y admite un `if` al final para filtrar, exactamente como las listas:

```python
existencias = {"teclado": 4, "ratón": 0, "monitor": 2, "webcam": 0}

disponibles = {producto: cantidad for producto, cantidad in existencias.items() if cantidad > 0}
agotados = [producto for producto, cantidad in existencias.items() if cantidad == 0]

print(disponibles)
print(agotados)
```

```salida
{'teclado': 4, 'monitor': 2}
['ratón', 'webcam']
```

También es la forma de construir un diccionario a partir de dos listas emparejadas, combinándolo con `zip`:

```python
alumnos = ["Ana", "Luis", "Marta"]
notas = [8.5, 6.0, 9.25]

calificaciones = {alumno: nota for alumno, nota in zip(alumnos, notas)}

print(calificaciones)
print(dict(zip(alumnos, notas)))
```

```salida
{'Ana': 8.5, 'Luis': 6.0, 'Marta': 9.25}
{'Ana': 8.5, 'Luis': 6.0, 'Marta': 9.25}
```

La segunda línea es aún más corta: `dict()` acepta directamente pares y construye el diccionario. Eso resuelve, por fin y bien, el problema de las dos listas paralelas con el que empezó la lección de diccionarios.

## Invertir un diccionario

Intercambiar claves y valores es una comprensión de una línea:

```python
capitales = {"España": "Madrid", "Francia": "París", "Italia": "Roma"}

paises_por_capital = {capital: pais for pais, capital in capitales.items()}

print(paises_por_capital)
print(paises_por_capital["Roma"])
```

```salida
{'Madrid': 'España', 'París': 'Francia', 'Roma': 'Italia'}
Italia
```

Es útil cuando necesitas buscar en el otro sentido y el diccionario es grande: en vez de recorrerlo entero cada vez, lo inviertes una vez y después las búsquedas son inmediatas.

> [!aviso] Al invertir puedes perder datos
>
> Los valores de un diccionario sí pueden repetirse, pero las claves no. Si dos claves comparten valor, al invertir solo sobrevive la última:
>
> ```python
> notas = {"Ana": 7, "Luis": 5, "Marta": 7}
>
> invertido = {nota: alumno for alumno, nota in notas.items()}
>
> print(invertido)
> ```
>
> ```salida
> {7: 'Marta', 5: 'Luis'}
> ```
>
> Ana ha desaparecido. Si los valores pueden repetirse, lo que necesitas es agrupar en listas, con el `setdefault` de la lección anterior:
>
> ```python
> notas = {"Ana": 7, "Luis": 5, "Marta": 7}
>
> por_nota = {}
> for alumno, nota in notas.items():
>         por_nota.setdefault(nota, []).append(alumno)
>
> print(por_nota)
> ```
>
> ```salida
> {7: ['Ana', 'Marta'], 5: ['Luis']}
> ```

## Formatear un diccionario como tabla

Juntando el recorrido con `items()`, el formato de las f-strings y la alineación, sale un informe presentable. La clave para que las columnas cuadren es decidir los anchos una vez y usarlos en la cabecera y en las filas.

```python title="informe.py"
ventas = {
    "Madrid": 1650.50,
    "Barcelona": 980.00,
    "Sevilla": 1205.75,
    "Bilbao": 430.20,
}

total = sum(ventas.values())

print(f"{'CIUDAD':<12}{'VENTAS':>12}{'% TOTAL':>10}")
print("=" * 34)

for ciudad, importe in sorted(ventas.items()):
        porcentaje = importe / total * 100
    print(f"{ciudad:<12}{importe:>12,.2f}{porcentaje:>9.1f}%")

print("-" * 34)
print(f"{'TOTAL':<12}{total:>12,.2f}{100:>9.1f}%")
print()
print(f"Ciudades:   {len(ventas)}")
print(f"Media:      {total / len(ventas):,.2f} €")
print(f"Mejor:      {max(ventas, key=ventas.get)}")
print(f"Peor:       {min(ventas, key=ventas.get)}")
```

```salida
CIUDAD            VENTAS   % TOTAL
==================================
Barcelona         980.00     23.0%
Bilbao            430.20     10.1%
Madrid          1,650.50     38.7%
Sevilla         1,205.75     28.3%
----------------------------------
TOTAL           4,266.45    100.0%

Ciudades:   4
Media:      1,066.61 €
Mejor:      Madrid
Peor:       Bilbao
```

Fíjate en las dos últimas líneas: `max(ventas, key=ventas.get)` devuelve **la clave** con el valor más alto, porque `max` recorre las claves y las compara por su valor. Es el mismo mecanismo que en `sorted`, y es la forma corta de responder a "quién ha vendido más".

> [!consejo] Los anchos, como constantes
>
> En un informe de verdad, si repites el `:<12` en cinco sitios, cambiar el ancho significa tocar cinco líneas y olvidarte de una. Las f-strings permiten poner el ancho con una variable usando llaves anidadas: `f"{ciudad:<{ancho}}"`. Define `ancho = 12` al principio y cambia el diseño entero desde un sitio.

> [!resumen] En resumen
>
> Un `for` sobre un diccionario recorre sus claves, igual que `in` y `list()` miran las claves. `keys()`, `values()` e `items()` dan las tres vistas, que no son listas pero se recorren y admiten `len`, `sorted`, `sum`, `min` y `max`; `sum(d.values())` es el modismo para totalizar. La forma normal de recorrer es `for clave, valor in d.items():`, donde el `for` desempaqueta la tupla de cada par. No borres claves durante el recorrido, porque da `RuntimeError`: recorre `list(d)`. Para ordenar por clave basta `sorted(d)`, y para ordenar por valor se pasa `key=d.get`, que también funciona con `max` y `min` y devuelve la clave ganadora. Las comprensiones de diccionario se escriben `{clave: valor for ... in ...}` y sirven para transformar, filtrar, construir desde dos listas con `zip` e invertir el diccionario, aunque al invertir se pierden entradas si hay valores repetidos.

> [!ejercicio] Practica
>
> Crea `30-recorrer-diccionarios.py` y resuelve:
>
> 1. Con un diccionario de cinco productos y sus precios, imprime cada producto con su precio alineado en dos columnas, el total y el precio medio.
> 2. Recorre el mismo diccionario de tres maneras: solo claves, solo valores y las dos cosas con `items()`.
> 3. Imprime el diccionario ordenado alfabéticamente por producto, y después ordenado por precio de mayor a menor.
> 4. Averigua cuál es el producto más caro y cuál el más barato usando `max` y `min` con `key`.
> 5. Crea un diccionario nuevo con los precios aumentados un 10%, usando una comprensión de diccionario y redondeando a dos decimales.
> 6. Construye un diccionario a partir de dos listas, una de países y otra de capitales, y después invíertelo para poder buscar el país a partir de la capital.
