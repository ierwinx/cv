---
titulo: "Recorrer listas"
resumen: "Pasar por todos los elementos con for, obtener también el índice con enumerate, cruzar dos listas con zip y acumular resultados."
minutos: 13
orden: 22
---

Una lista guarda muchos valores, pero su utilidad real aparece cuando la recorres. Sumar, contar, filtrar, buscar el mayor o imprimir un informe son todos el mismo gesto: pasar por cada elemento una vez y hacer algo con él.

El `for` ya lo conoces del recorrido de cadenas y de `range`. Sobre listas funciona igual, y además hay dos ayudas que te van a ahorrar mucho código torpe: `enumerate` y `zip`.

## El recorrido básico

```python
ciudades = ["Madrid", "Sevilla", "Bilbao"]

for ciudad in ciudades:
        print(f"Visitando {ciudad}")
```

```salida
Visitando Madrid
Visitando Sevilla
Visitando Bilbao
```

La variable `ciudad` toma el valor de cada elemento, uno por vuelta, en orden. No hay que decirle cuántos hay ni manejar ningún contador: el `for` se para cuando la lista se acaba.

> [!consejo] Nombra la variable en singular
>
> `for ciudad in ciudades:` se lee como una frase en español y deja claro qué es cada cosa. Evita `for i in ciudades:` o `for x in lista:`, que no dicen nada. El plural es la lista, el singular es el elemento.

Esta es la manera torpe de hacer lo mismo, y no deberías escribirla:

```python
ciudades = ["Madrid", "Sevilla", "Bilbao"]

for posicion in range(len(ciudades)):
        print(f"Visitando {ciudades[posicion]}")
```

```salida
Visitando Madrid
Visitando Sevilla
Visitando Bilbao
```

Funciona, pero pasas por un índice que no necesitas y el código dice menos. Resérvalo para cuando el índice te haga falta de verdad, y en ese caso hay algo mejor.

## Cuando necesitas la posición: `enumerate`

A veces sí quieres el índice: para numerar una lista en pantalla, o para modificar el elemento en su sitio. `enumerate` te da los dos valores a la vez, la posición y el elemento:

```python
tareas = ["comprar pan", "llamar al banco", "regar plantas"]

for posicion, tarea in enumerate(tareas):
        print(f"{posicion}. {tarea}")
```

```salida
0. comprar pan
1. llamar al banco
2. regar plantas
```

Fíjate en que el `for` tiene **dos** variables separadas por una coma. `enumerate` entrega en cada vuelta un par de valores y Python los reparte, uno en cada variable. Ese reparto se llama *desempaquetado* y lo explicaremos a fondo en la lección de tuplas.

### El parámetro `start`

Empezar la numeración en cero está bien para los índices, pero fatal para una lista que va a leer una persona. `start` cambia el número inicial sin tocar la lista:

```python
tareas = ["comprar pan", "llamar al banco", "regar plantas"]

for numero, tarea in enumerate(tareas, start=1):
        print(f"{numero}. {tarea}")
```

```salida
1. comprar pan
2. llamar al banco
3. regar plantas
```

El elemento sigue siendo el mismo; lo único que cambia es el contador que te devuelve. `start=1` es el uso más frecuente con diferencia.

## Recorrer dos listas a la vez: `zip`

Cuando tienes dos listas relacionadas, una con nombres y otra con notas, quieres emparejarlas posición a posición. `zip` hace exactamente eso, como los dientes de una cremallera:

```python
alumnos = ["Ana", "Luis", "Marta"]
notas = [8.5, 6.0, 9.25]

for alumno, nota in zip(alumnos, notas):
        print(f"{alumno:<8} {nota:>5.2f}")
```

```salida
Ana       8.50
Luis      6.00
Marta     9.25
```

Y funciona con más de dos:

```python
productos = ["teclado", "ratón", "monitor"]
precios = [29.99, 15.50, 189.00]
unidades = [2, 3, 1]

for producto, precio, cantidad in zip(productos, precios, unidades):
        total = precio * cantidad
    print(f"{producto:<10} {cantidad} x {precio:>6.2f} = {total:>7.2f} €")
```

```salida
teclado    2 x  29.99 =   59.98 €
ratón      3 x  15.50 =   46.50 €
monitor    1 x 189.00 =  189.00 €
```

> [!aviso] zip se para en la lista más corta
>
> Si las listas no miden lo mismo, `zip` no avisa: termina cuando se acaba la más corta y los elementos sobrantes se pierden en silencio.
>
> ```python
> alumnos = ["Ana", "Luis", "Marta", "Pedro"]
> notas = [8.5, 6.0]
>
> for alumno, nota in zip(alumnos, notas):
>         print(alumno, nota)
>
> print("Marta y Pedro no aparecen")
> ```
>
> ```salida
> Ana 8.5
> Luis 6.0
> Marta y Pedro no aparecen
> ```
>
> Es un fallo silencioso de los malos, porque el programa no da error. Si las dos listas deberían medir lo mismo, compruébalo antes con `len()`.

## No modifiques una lista mientras la recorres

Esto es lo más importante de la lección. Parece razonable recorrer una lista y borrar por el camino lo que no te interesa. No lo es, y el resultado no es un error: es un resultado mal.

```python
numeros = [1, 2, 3, 4, 5, 6]

for numero in numeros:
        if numero % 2 == 0:
                numeros.remove(numero)

print(numeros)
```

```salida
[1, 3, 5]
```

Aquí ha salido bien por casualidad. Cambia los datos y mira:

```python
numeros = [1, 2, 4, 6, 7]

for numero in numeros:
        if numero % 2 == 0:
                numeros.remove(numero)

print(numeros)
```

```salida
[1, 4, 7]
```

El `4` sigue ahí. El motivo es que el `for` avanza por posiciones y la lista se encoge bajo sus pies. Al borrar el `2`, que estaba en la posición 1, el `4` pasa a ocupar esa posición 1; pero el `for` ya va por la 2, así que se salta el `4` sin mirarlo.

La solución es no tocar la lista que recorres. Tienes dos opciones limpias:

```python
numeros = [1, 2, 4, 6, 7]
impares = []

for numero in numeros:
        if numero % 2 != 0:
                impares.append(numero)

print(impares)
```

```salida
[1, 7]
```

O recorrer una copia y modificar la original, usando el rebanado completo `[:]` que ya conoces de las cadenas:

```python
numeros = [1, 2, 4, 6, 7]

for numero in numeros[:]:          # recorremos una copia
        if numero % 2 == 0:
                numeros.remove(numero)     # modificamos la original

print(numeros)
```

```salida
[1, 7]
```

> [!aviso] La regla, corta
>
> Mientras un `for` recorre una lista, no le hagas `append`, `insert`, `remove`, `pop` ni `del`. Construye una lista nueva, o recorre `lista[:]`. Cambiar el **valor** de una posición con `lista[i] = x` sí es seguro, porque no altera el tamaño.

## Patrones de acumulación

Casi todo lo que harás con un `for` sobre una lista encaja en uno de estos cuatro moldes. Merece la pena tenerlos memorizados.

### Sumar

```python
gastos = [25.50, 13.20, 60.00, 8.75]
total = 0

for gasto in gastos:
        total += gasto

print(f"Total: {total:.2f} €")
print(f"Media: {total / len(gastos):.2f} €")
```

```salida
Total: 107.45 €
Media: 26.86 €
```

La clave es inicializar el acumulador **antes** del bucle y a `0`. Si lo inicializas dentro, se reinicia en cada vuelta.

### Contar los que cumplen algo

```python
notas = [7.5, 4.0, 9.25, 3.5, 6.0, 8.5]
aprobados = 0
suspensos = 0

for nota in notas:
        if nota >= 5:
                aprobados += 1
    else:
                suspensos += 1

print(f"Aprobados: {aprobados}")
print(f"Suspensos: {suspensos}")
print(f"Porcentaje de aprobados: {aprobados / len(notas) * 100:.1f} %")
```

```salida
Aprobados: 4
Suspensos: 2
Porcentaje de aprobados: 66.7 %
```

### Filtrar en una lista nueva

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4, 33.2]
calurosas = []

for temperatura in temperaturas:
        if temperatura > 25:
                calurosas.append(temperatura)

print(calurosas)
print(f"{len(calurosas)} días de más de 25 grados")
```

```salida
[31.0, 27.8, 33.2]
3 días de más de 25 grados
```

### Encontrar el máximo a mano

Python trae `max()`, pero conviene saber cómo se hace, porque el molde sirve para cualquier "el mejor de" que no sea un simple número:

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4]
maxima = temperaturas[0]

for temperatura in temperaturas:
        if temperatura > maxima:
                maxima = temperatura

print(f"Máxima: {maxima}")
```

```salida
Máxima: 31.0
```

Se arranca con el **primer elemento**, no con cero. Si empezaras con `maxima = 0` y todas las temperaturas fueran negativas, el resultado sería un cero que no está en la lista.

Si además quieres saber *dónde* estaba el máximo, aquí sí hace falta `enumerate`:

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4]
maxima = temperaturas[0]
dia_maximo = 0

for dia, temperatura in enumerate(temperaturas, start=1):
        if temperatura > maxima:
                maxima = temperatura
        dia_maximo = dia

print(f"La máxima fue de {maxima} grados, el día {dia_maximo}")
```

```salida
La máxima fue de 31.0 grados, el día 3
```

## Salir antes de tiempo

`break` y `continue` funcionan igual que en cualquier otro bucle, y con listas son muy útiles para dejar de buscar cuando ya has encontrado:

```python
usuarios = ["ana", "luis", "marta", "pedro"]
buscado = "marta"
posicion_encontrada = -1

for posicion, usuario in enumerate(usuarios):
        if usuario == buscado:
                posicion_encontrada = posicion
        break

if posicion_encontrada >= 0:
        print(f"Encontrado en la posición {posicion_encontrada}")
else:
        print("No está en la lista")
```

```salida
Encontrado en la posición 2
```

El `break` corta el bucle en cuanto hay resultado, y en una lista grande eso ahorra la mitad del trabajo de media. La variable inicializada a `-1` hace de aviso de "todavía no lo he encontrado", que es el mismo convenio que usa el método `find` de las cadenas.

## Recorrer al revés y por partes

```python
puntuaciones = [10, 25, 40, 55, 70]

for puntuacion in reversed(puntuaciones):
        print(puntuacion)

print(puntuaciones[::2])
print(puntuaciones)
```

```salida
70
55
40
25
10
[10, 40, 70]
[10, 25, 40, 55, 70]
```

`reversed()` recorre la lista de atrás hacia delante sin modificarla, y el rebanado con paso te deja saltarte elementos. Ninguno de los dos altera la lista original, como demuestra la última línea.

> [!resumen] En resumen
>
> `for elemento in lista:` recorre los valores en orden y es la forma preferente de pasar por una lista. Si necesitas la posición, `enumerate` te da índice y elemento a la vez, con `start=1` para numerar de cara al usuario. `zip` empareja dos o más listas posición a posición y se detiene en la más corta, sin avisar. Nunca añadas ni borres elementos de una lista mientras la recorres: el bucle se salta valores en silencio; construye una lista nueva o recorre `lista[:]`. Los cuatro patrones que resuelven casi todo son acumular una suma, contar los que cumplen una condición, filtrar en una lista nueva y quedarse con el máximo comparando contra el primer elemento.

> [!ejercicio] Practica
>
> Crea `22-recorrer-listas.py` y resuelve:
>
> 1. Con una lista de seis precios, imprime cada uno en su línea con el formato `1. 25.50 €`, numerando desde el uno.
> 2. Calcula el total y la media de esa lista de precios con un `for` y un acumulador, sin usar `sum()`.
> 3. Crea dos listas, una con nombres de productos y otra con sus existencias, y muéstralas emparejadas con `zip` en dos columnas alineadas.
> 4. Con una lista de palabras, crea otra lista nueva que contenga solo las que tengan más de cinco letras.
> 5. Encuentra la nota más baja de una lista y en qué posición está, a mano, sin usar `min()` ni `index()`.
> 6. Copia el ejemplo que borra los pares mientras recorre la lista, ejecútalo con los datos `[2, 4, 6, 8]` y explica por qué el resultado no es una lista vacía. Arréglalo después.
