---
titulo: "Listas por comprensión"
resumen: "La forma compacta de construir una lista a partir de otra, cómo se deriva del bucle equivalente y cuándo no conviene usarla."
minutos: 11
orden: 25
---

Hay un gesto que repites constantemente: partir de una lista, transformar cada elemento y guardar el resultado en otra lista. Tres líneas de bucle para algo que se dice en una frase: "los cuadrados de estos números".

Python tiene una sintaxis propia para ese caso concreto, la **lista por comprensión**. No hace nada que no pudieras hacer con un `for`; simplemente lo escribe en una línea que se lee mejor. Se usa tanto que necesitas saber leerla aunque decidas no escribirla.

## De un bucle a una comprensión, paso a paso

Este es el bucle de siempre:

```python
numeros = [1, 2, 3, 4, 5]
cuadrados = []

for numero in numeros:
        cuadrados.append(numero ** 2)

print(cuadrados)
```

```salida
[1, 4, 9, 16, 25]
```

Fíjate en que ahí solo hay tres datos importantes: **qué guardas** (`numero ** 2`), **cómo se llama cada elemento** (`numero`) y **de dónde salen** (`numeros`). Todo lo demás es andamiaje: crear la lista vacía, escribir `append`, los dos puntos, la sangría.

La comprensión coloca esos tres datos entre corchetes, en este orden:

```python
numeros = [1, 2, 3, 4, 5]

cuadrados = [numero ** 2 for numero in numeros]

print(cuadrados)
```

```salida
[1, 4, 9, 16, 25]
```

Los corchetes de fuera son los que anuncian que el resultado es una lista. Dentro, la parte que va antes del `for` es lo que se guarda en cada vuelta, y la parte del `for` es exactamente la misma que escribirías en un bucle normal.

La transformación, vista una al lado de la otra:

| Bucle | Comprensión |
| --- | --- |
| `cuadrados = []` | Los corchetes de fuera |
| `for numero in numeros:` | `for numero in numeros` (al final, sin dos puntos) |
| `cuadrados.append(numero ** 2)` | `numero ** 2` (al principio) |

Se lee de dentro hacia fuera, pero en español sale bastante natural: "el cuadrado de cada número, para cada número de la lista numeros".

## Más ejemplos de transformación

La expresión de la izquierda puede ser cualquier cosa que produzca un valor:

```python
nombres = ["ana pérez", "luis gómez", "marta ruiz"]

print([nombre.title() for nombre in nombres])
print([len(nombre) for nombre in nombres])
print([nombre.split()[0] for nombre in nombres])
```

```salida
['Ana Pérez', 'Luis Gómez', 'Marta Ruiz']
[9, 10, 10]
['ana', 'luis', 'marta']
```

Y el origen puede ser cualquier cosa recorrible: otra lista, un `range` o una cadena.

```python
print([numero * 3 for numero in range(1, 6)])
print([letra.upper() for letra in "python"])
```

```salida
[3, 6, 9, 12, 15]
['P', 'Y', 'T', 'H', 'O', 'N']
```

Esto resuelve por fin el problema que dejamos pendiente con `join`, que solo acepta cadenas:

```python
precios = [29.99, 15.50, 189.00]

textos = [str(precio) for precio in precios]
print(" | ".join(textos))

print(", ".join([f"{precio:.2f} €" for precio in precios]))
```

```salida
29.99 | 15.5 | 189.0
29.99 €, 15.50 €, 189.00 €
```

## Con condición: el `if` al final

Añadiendo un `if` después del `for`, solo entran en la lista los elementos que lo cumplen. Es el equivalente a este bucle:

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4, 33.2]
calurosas = []

for temperatura in temperaturas:
        if temperatura > 25:
                calurosas.append(temperatura)

print(calurosas)
```

```salida
[31.0, 27.8, 33.2]
```

Y en una línea:

```python
temperaturas = [18.2, 24.5, 31.0, 27.8, 15.4, 33.2]

calurosas = [temperatura for temperatura in temperaturas if temperatura > 25]

print(calurosas)
```

```salida
[31.0, 27.8, 33.2]
```

Aquí la expresión de la izquierda es el elemento tal cual, porque no queremos transformarlo, solo seleccionarlo. Nada impide hacer las dos cosas a la vez:

```python
palabras = ["sol", "murciélago", "pez", "ventana", "mar"]

largas_en_mayusculas = [palabra.upper() for palabra in palabras if len(palabra) > 3]

print(largas_en_mayusculas)
```

```salida
['MURCIÉLAGO', 'VENTANA']
```

El orden de lectura es: primero el `for` recorre, después el `if` filtra y al final la expresión transforma lo que ha pasado el filtro.

Este patrón hace que `any` y `all` se lean como una frase, tal y como te anuncié en la lección anterior:

```python
notas = [7.5, 4.0, 9.25, 6.0]

print(any([nota < 5 for nota in notas]))
print(all([nota >= 5 for nota in notas]))
print(len([nota for nota in notas if nota >= 5]))
```

```salida
True
False
3
```

Se leen casi solas: "¿alguna nota es menor que cinco?", "¿todas las notas llegan al cinco?", "cuántas notas llegan al cinco". Contar filtrando con `len()` de una comprensión es un recurso que usarás mucho.

## Con expresión condicional: el `if` delante

Esto es diferente y se confunde a menudo. Cuando el `if` va **antes** del `for` no filtra: elige qué valor guardar, y todos los elementos entran en la lista. Es el operador condicional en una línea que ya conoces.

```python
notas = [7.5, 4.0, 9.25, 3.5]

etiquetas = ["aprobado" if nota >= 5 else "suspenso" for nota in notas]

print(etiquetas)
print(len(etiquetas))
```

```salida
['aprobado', 'suspenso', 'aprobado', 'suspenso']
4
```

Cuatro notas entran, cuatro etiquetas salen. Compara con la versión que filtra:

```python
notas = [7.5, 4.0, 9.25, 3.5]

print([nota for nota in notas if nota >= 5])                    # filtra: salen 2
print(["ok" if nota >= 5 else "ko" for nota in notas])          # transforma: salen 4
```

```salida
[7.5, 9.25]
['ok', 'ko', 'ok', 'ko']
```

La regla para no perderse:

| Dónde va el `if` | Qué hace | Cuántos elementos salen |
| --- | --- | --- |
| Al final, después del `for` | Filtra | Menos o igual que los de entrada |
| Al principio, antes del `for` | Elige el valor | Exactamente los de entrada |

> [!nota] El `else` es obligatorio delante y no existe detrás
>
> `[nota for nota in notas if nota >= 5 else 0]` es un `SyntaxError`. El `if` final es un filtro y un filtro no tiene "si no". En cambio el `if` delantero es una expresión que tiene que dar un valor siempre, así que necesita su `else`.

## Comprensión anidada

Se puede poner más de un `for`, y se leen en el mismo orden en que los escribirías como bucles anidados: el primero es el de fuera.

```python
tallas = ["S", "M"]
colores = ["rojo", "azul"]

combinaciones = [f"{talla}-{color}" for talla in tallas for color in colores]

print(combinaciones)
```

```salida
['S-rojo', 'S-azul', 'M-rojo', 'M-azul']
```

También sirve para aplanar una lista de listas, que es el uso más frecuente:

```python
por_grupos = [[8.5, 6.0], [9.25, 4.0], [7.0]]

todas = [nota for grupo in por_grupos for nota in grupo]

print(todas)
print(f"Media general: {sum(todas) / len(todas):.2f}")
```

```salida
[8.5, 6.0, 9.25, 4.0, 7.0]
Media general: 6.95
```

Y una comprensión puede estar dentro de otra, que es la forma limpia de crear la cuadrícula que en la lección anterior te salió mal con `* 3`:

```python
cuadricula = [[0] * 3 for fila in range(3)]

cuadricula[0][0] = 9

print(cuadricula)
```

```salida
[[9, 0, 0], [0, 0, 0], [0, 0, 0]]
```

Funciona porque la comprensión ejecuta `[0] * 3` tres veces, creando una fila nueva en cada vuelta, en vez de repetir la misma.

> [!aviso] Cuándo NO usar una comprensión
>
> Una comprensión es buena cuando cabe cómoda en una línea y se entiende de una lectura. En cuanto deja de cumplirse eso, el bucle normal es mejor código, aunque ocupe cuatro líneas. Vuelve al `for` cuando:
>
> - No te cabe en una línea de un ancho razonable, o tienes que partirla para leerla.
> - Hay dos condiciones o más encadenadas.
> - Hay dos `for` anidados y además un `if`.
> - Necesitas hacer algo más que producir un valor, como imprimir o llevar varios acumuladores a la vez.
>
> Esto es legal y es ilegible:
>
> ```python
> numeros = range(1, 31)
> raros = [numero for numero in numeros if numero % 2 == 0 if numero % 3 == 0 if numero > 10]
> print(raros)
> ```
>
> ```salida
> [12, 18, 24, 30]
> ```
>
> Y esto dice lo mismo mucho mejor:
>
> ```python
> raros = []
>
> for numero in range(1, 31):
>         es_multiplo_de_seis = numero % 2 == 0 and numero % 3 == 0
>     if es_multiplo_de_seis and numero > 10:
>                 raros.append(numero)
>
> print(raros)
> ```
>
> ```salida
> [12, 18, 24, 30]
> ```
>
> La segunda versión tiene el doble de líneas y la mitad de esfuerzo de lectura. Nadie te va a dar un premio por escribirlo en una línea.

> [!consejo] Nunca uses una comprensión solo por su efecto
>
> `[print(nombre) for nombre in nombres]` imprime los nombres, sí, pero además construye a tu espalda una lista de `None` que nadie usa. Una comprensión sirve para **producir una lista**. Si lo que quieres es hacer algo con cada elemento, eso es un `for`.

## Un ejemplo completo

```python title="informe.py"
lineas = ["ana:8.5", "luis:4.0", "marta:9.25", "pedro:3.5", "sara:6.0"]

nombres = [linea.split(":")[0].title() for linea in lineas]
notas = [float(linea.split(":")[1]) for linea in lineas]

aprobados = [nota for nota in notas if nota >= 5]
estados = ["APTO" if nota >= 5 else "NO APTO" for nota in notas]

for nombre, nota, estado in zip(nombres, notas, estados):
        print(f"{nombre:<8} {nota:>5.2f}  {estado}")

print("-" * 24)
print(f"Aprobados: {len(aprobados)} de {len(notas)}")
print(f"Media de los aprobados: {sum(aprobados) / len(aprobados):.2f}")
print(f"Suspensos: {[nombre for nombre, nota in zip(nombres, notas) if nota < 5]}")
```

```salida
Ana       8.50  APTO
Luis      4.00  NO APTO
Marta     9.25  APTO
Pedro     3.50  NO APTO
Sara      6.00  APTO
------------------------
Aprobados: 3 de 5
Media de los aprobados: 7.92
Suspensos: ['Luis', 'Pedro']
```

Fíjate en la última línea: una comprensión puede recorrer un `zip` y desempaquetar dos variables, igual que un `for` normal.

> [!resumen] En resumen
>
> Una lista por comprensión construye una lista a partir de otra colección en una sola línea, y equivale exactamente a un bucle con `append`: se escribe `[expresión for elemento in origen]`, donde la expresión es lo que se guarda y el `for` es el mismo que escribirías en el bucle. Añadiendo un `if` al final se filtra, quedando menos elementos de los que entraron; poniendo una expresión condicional `valor_si if condición else valor_si_no` delante del `for` se elige qué guardar, y salen tantos elementos como entraron. Se pueden anidar varios `for`, que se leen en el orden de los bucles equivalentes, y una comprensión dentro de otra es la forma correcta de crear cuadrículas. Si no cabe cómoda en una línea o acumula condiciones, el bucle normal se lee mejor.

> [!ejercicio] Practica
>
> Crea `25-listas-por-comprension.py` y resuelve:
>
> 1. Escribe un bucle con `append` que calcule el triple de cada número del 1 al 10, y después convierte ese bucle en una comprensión que dé el mismo resultado.
> 2. A partir de una lista de nombres en minúsculas, crea otra con los mismos nombres capitalizados y una tercera con la longitud de cada uno.
> 3. De una lista de doce temperaturas, saca las que están bajo cero y cuenta cuántas son, usando `len()` sobre una comprensión.
> 4. Con una lista de notas, crea una lista de textos `"aprobado"` o `"suspenso"` usando la expresión condicional delante del `for`. Comprueba que tiene tantos elementos como la original.
> 5. Convierte la lista `[1, 2, 3, 4]` en la cadena `"1 - 2 - 3 - 4"` combinando una comprensión con `join`.
> 6. Aplana la lista `[[1, 2], [3, 4], [5]]` en una sola lista con dos `for` en la misma comprensión, e imprime su suma.
