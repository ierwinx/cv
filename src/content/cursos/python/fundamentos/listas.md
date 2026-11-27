---
titulo: "Listas: guardar muchos valores"
resumen: "Guardar muchos datos bajo un solo nombre, acceder a ellos por posición y preguntar si un valor está dentro."
minutos: 12
orden: 20
---

Hasta ahora cada dato ha vivido en su propia variable. Eso funciona mientras sean pocos y sepas cuántos hay de antemano. Pero en cuanto quieres guardar las temperaturas de una semana, los alumnos de una clase o los productos de un carrito, el esquema se rompe: acabas escribiendo `temperatura_1`, `temperatura_2`, `temperatura_3`, y no hay manera de recorrerlas con un bucle porque el nombre de cada una es distinto.

Una **lista** resuelve justo eso: un único nombre que guarda muchos valores, en orden y numerados.

## Crear una lista

Se escribe entre corchetes, con los elementos separados por comas:

```python
temperaturas = [21.5, 23.0, 24.8, 22.1, 19.7]
ciudades = ["Madrid", "Sevilla", "Bilbao"]

print(temperaturas)
print(ciudades)
```

```salida
[21.5, 23.0, 24.8, 22.1, 19.7]
['Madrid', 'Sevilla', 'Bilbao']
```

Al imprimir una lista, Python la muestra tal y como se escribiría en el código, con los corchetes incluidos.

> [!nota] Por qué salen comillas simples
>
> Has escrito `"Madrid"` con comillas dobles y Python lo imprime como `'Madrid'`. Es solo su preferencia al representar cadenas dentro de una colección; el texto es exactamente el mismo. Si imprimes un elemento suelto con `print(ciudades[0])` verás `Madrid` sin comillas.

Cuando la lista es larga puedes repartirla en varias líneas. Python sabe que la instrucción no ha terminado hasta que cierras el corchete:

```python
provincias = [
    "Álava",
    "Albacete",
    "Alicante",
    "Almería",
]

print(len(provincias))
```

```salida
4
```

Esa coma final después del último elemento es legal y se considera buen estilo: si mañana añades otra provincia, tocas una sola línea.

## La lista vacía

Es el punto de partida más habitual: creas la lista vacía y la vas rellenando después.

```python
carrito = []

print(carrito)
print(len(carrito))
print(bool(carrito))
```

```salida
[]
0
False
```

Fíjate en lo último: **una lista vacía es falsa** y una lista con algo dentro es verdadera. Es el mismo criterio que ya viste con la cadena vacía, y permite escribir `if carrito:` en vez de `if len(carrito) > 0:`.

## Los elementos pueden ser de cualquier tipo

Una lista no obliga a que todo dentro sea igual:

```python
ficha = ["Erwin", 34, 1.78, True, None]

print(ficha)
print(type(ficha[0]), type(ficha[1]))
```

```salida
['Erwin', 34, 1.78, True, None]
<class 'str'> <class 'int'>
```

Poder hacerlo no significa que convenga. Una lista suele representar *muchas cosas del mismo tipo* (muchas temperaturas, muchos nombres), y ahí el orden no tiene significado propio. Cuando cada posición significa algo diferente, como en esa ficha, hay estructuras mejores: las tuplas y los diccionarios de las próximas lecciones.

## Acceder por posición

Cada elemento tiene un **índice**, y la numeración **empieza en cero**, igual que en las cadenas:

```python
ciudades = ["Madrid", "Sevilla", "Bilbao", "Valencia"]
#              0          1         2          3
#             -4         -3        -2         -1

print(ciudades[0])
print(ciudades[1])
print(ciudades[-1])
print(ciudades[-2])
```

```salida
Madrid
Sevilla
Valencia
Bilbao
```

Los índices negativos cuentan desde el final. `ciudades[-1]` es siempre el último elemento, sin necesidad de saber cuántos hay, y `ciudades[len(ciudades) - 1]` es la forma torpe de escribir lo mismo.

> [!aviso] Si mide 4, el último índice es el 3
>
> Con cuatro elementos, los índices válidos van del 0 al 3. El 4 ya está fuera. Este desajuste de uno es el error más común al empezar, y tiene su propio mensaje en Python.

> [!error] IndexError: list index out of range
>
> Estás pidiendo una posición que no existe. Ocurre casi siempre por dos motivos: has contado desde el uno, o la lista tiene menos elementos de los que suponías porque llegó vacía o a medias.
>
> ```python
> ciudades = ["Madrid", "Sevilla", "Bilbao", "Valencia"]
> print(ciudades[4])
> ```
>
> ```salida
> IndexError: list index out of range
> ```
>
> Antes de acceder a un índice que no controlas, comprueba el tamaño con `len()`, o usa `if lista:` para asegurarte de que no está vacía.

## Cuántos elementos hay

`len()` funciona igual que con las cadenas, y cuenta elementos, no caracteres:

```python
palabras = ["sol", "luna", "estrella"]

print(len(palabras))
print(len(palabras[2]))
```

```salida
3
8
```

La segunda línea mide la cadena `"estrella"`, porque `palabras[2]` **es** una cadena y `len()` se aplica a lo que tenga delante.

## ¿Está dentro? El operador `in`

Preguntar si un valor está en la lista es directo, y no hace falta recorrerla a mano:

```python
pendientes = ["revisar correo", "llamar al banco", "comprar pan"]

print("comprar pan" in pendientes)
print("regar plantas" in pendientes)
print("regar plantas" not in pendientes)
```

```salida
True
False
True
```

`in` compara con **elementos completos**, no con trozos:

```python
pendientes = ["revisar correo", "llamar al banco", "comprar pan"]

print("pan" in pendientes)              # no hay ningún elemento igual a "pan"
print("pan" in pendientes[2])           # aquí sí: buscamos dentro de la cadena
```

```salida
False
True
```

Combinado con un `if` es el patrón de validación más limpio que hay:

```python
colores_validos = ["rojo", "verde", "azul"]
eleccion = "morado"

if eleccion in colores_validos:
        print(f"Has elegido {eleccion}.")
else:
        print(f"{eleccion} no está disponible. Elige entre: {colores_validos}")
```

```salida
morado no está disponible. Elige entre: ['rojo', 'verde', 'azul']
```

## Una lista es una secuencia, como una cadena

Esto explica por qué muchas cosas te suenan ya. Las cadenas y las listas son las dos **secuencias**: colecciones ordenadas a las que se accede por posición. Todo lo que aprendiste de los índices y del rebanado vale igual aquí.

```python
letras = "PYTHON"
numeros = [10, 20, 30, 40, 50, 60]

print(letras[1:4])
print(numeros[1:4])
print(letras[::-1])
print(numeros[::-1])
print(len(letras), len(numeros))
print("Y" in letras, 20 in numeros)
```

```salida
YTH
[20, 30, 40]
NOHTYP
[60, 50, 40, 30, 20, 10]
6 6
True True
```

Esta es la tabla de lo que comparten:

| Operación | En cadenas | En listas |
| --- | --- | --- |
| Longitud | `len("sol")` | `len([1, 2, 3])` |
| Un elemento | `"sol"[0]` | `[1, 2, 3][0]` |
| Último elemento | `"sol"[-1]` | `[1, 2, 3][-1]` |
| Trozo | `"sol"[0:2]` | `[1, 2, 3][0:2]` |
| Pertenencia | `"o" in "sol"` | `2 in [1, 2, 3]` |
| Unir | `"sol" + "luna"` | `[1, 2] + [3]` |
| Repetir | `"ab" * 3` | `[0] * 3` |
| Recorrer | `for letra in "sol":` | `for numero in [1, 2, 3]:` |

La diferencia grande, la única que de verdad importa, es que una cadena no se puede modificar y una lista sí. Ese es el tema de la próxima lección.

## De cadena a lista y al revés

Dos métodos de cadena que ya conoces cobran ahora todo su sentido, porque el puente entre texto y lista lo cruzarás a diario:

```python
linea = "manzana,plátano,cereza"

frutas = linea.split(",")
print(frutas)
print(len(frutas))

print(" | ".join(frutas))
```

```salida
['manzana', 'plátano', 'cereza']
3
manzana | plátano | cereza
```

`split()` parte un texto y devuelve una lista. `join()` hace el camino contrario: une los elementos de una lista usando como pegamento la cadena sobre la que lo llamas.

> [!nota] join solo une cadenas
>
> `" - ".join([1, 2, 3])` falla con `TypeError: sequence item 0: expected str instance, int found`. Todos los elementos tienen que ser texto. Para unir números hay que convertirlos antes, y la forma cómoda de hacerlo la verás con las listas por comprensión.

## Un ejemplo completo

```python title="notas.py"
notas = [7.5, 4.0, 9.25, 6.0, 8.5]

print(f"Alumnos evaluados: {len(notas)}")
print(f"Primera nota:      {notas[0]}")
print(f"Última nota:       {notas[-1]}")
print(f"Las tres primeras: {notas[:3]}")
print(f"¿Hay algún cero?   {0 in notas}")

if notas[1] < 5:
        print("El segundo alumno tiene que recuperar.")
```

```salida
Alumnos evaluados: 5
Primera nota:      7.5
Última nota:       8.5
Las tres primeras: [7.5, 4.0, 9.25]
¿Hay algún cero?   False
El segundo alumno tiene que recuperar.
```

> [!resumen] En resumen
>
> Una lista guarda muchos valores en orden bajo un mismo nombre y se escribe entre corchetes, con `[]` para la lista vacía. Sus elementos pueden ser de cualquier tipo, aunque lo normal es que sean todos del mismo. Se accede a ellos por índice empezando en cero, y los índices negativos cuentan desde el final; pedir un índice que no existe da `IndexError: list index out of range`. `len()` cuenta los elementos, `in` comprueba si un valor está entre ellos y una lista vacía es falsa en un `if`. Una lista es una secuencia igual que una cadena, y por eso comparte con ella los índices, el rebanado, la concatenación y el recorrido con `for`.

> [!ejercicio] Practica
>
> Crea `20-listas.py` y resuelve:
>
> 1. Guarda en una lista los nombres de cinco personas conocidas. Imprime la lista entera, la primera, la última y cuántas hay.
> 2. Con la lista de la temperatura de los siete días de la semana, imprime la del primer día, la del último y las del fin de semana usando rebanado.
> 3. Pide un color por teclado y comprueba con `in` si está en la lista `["rojo", "verde", "azul"]`, respondiendo con un mensaje distinto en cada caso.
> 4. Dada la cadena `"lunes martes miércoles jueves viernes"`, conviértela en lista con `split()` e imprime el tercer día.
> 5. Provoca un `IndexError` a propósito sobre una lista de tres elementos y lee el mensaje completo.
> 6. Crea una lista vacía y comprueba qué imprimen `len()`, `bool()` y un `if` sobre ella.
