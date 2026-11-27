---
titulo: "Rebanado y copias de listas"
resumen: "Cortar trozos de una lista y entender por qué asignarla a otra variable no la copia, con la trampa que eso provoca."
minutos: 12
orden: 23
---

El rebanado de listas ya lo sabes hacer, porque es el mismo que aprendiste con las cadenas. Esta lección lo repasa en dos minutos y luego dedica el resto a un asunto que confunde a casi todo el mundo y provoca errores muy difíciles de encontrar: **asignar una lista a otra variable no la copia**.

Entender bien esta diferencia es lo que separa a quien usa listas con soltura de quien de vez en cuando se encuentra con datos cambiados por arte de magia.

## Cortar trozos

La sintaxis es `lista[inicio:fin:paso]`, y el final nunca se incluye:

```python
meses = ["ene", "feb", "mar", "abr", "may", "jun"]
#          0      1      2      3      4      5

print(meses[0:3])
print(meses[3:])
print(meses[:3])
print(meses[-2:])
print(meses[::2])
print(meses[::-1])
print(meses[:])
```

```salida
['ene', 'feb', 'mar']
['abr', 'may', 'jun']
['ene', 'feb', 'mar']
['may', 'jun']
['ene', 'mar', 'may']
['jun', 'may', 'abr', 'mar', 'feb', 'ene']
['ene', 'feb', 'mar', 'abr', 'may', 'jun']
```

Hay una diferencia importante entre un índice y un rebanado, aunque se escriban parecido:

```python
meses = ["ene", "feb", "mar"]

print(meses[0], type(meses[0]))
print(meses[0:1], type(meses[0:1]))
```

```salida
ene <class 'str'>
['ene'] <class 'list'>
```

Un índice te da **el elemento**. Un rebanado te da siempre **una lista**, aunque solo contenga un elemento o esté vacía.

> [!nota] El rebanado nunca da IndexError
>
> `meses[10]` falla, pero `meses[10:20]` devuelve `[]` tranquilamente, y `meses[:100]` devuelve la lista entera. El rebanado recorta lo que le pides a lo que realmente hay. Es cómodo, pero también significa que una lista vacía inesperada puede pasar desapercibida.
>
> ```python
> meses = ["ene", "feb", "mar"]
> print(meses[10:20])
> print(meses[:100])
> ```
>
> ```salida
> []
> ['ene', 'feb', 'mar']
> ```

## Asignar a un rebanado

Esto sí es nuevo, y solo funciona con listas porque son mutables. Puedes sustituir todo un tramo de golpe:

```python
numeros = [1, 2, 3, 4, 5]

numeros[1:3] = [20, 30]
print(numeros)
```

```salida
[1, 20, 30, 4, 5]
```

Y lo que reemplaza no tiene que medir lo mismo que lo reemplazado: la lista crece o se encoge sola.

```python
numeros = [1, 2, 3, 4, 5]

numeros[1:3] = ["a"]              # dos elementos se convierten en uno
print(numeros)

numeros[1:2] = ["x", "y", "z"]    # uno se convierte en tres
print(numeros)

numeros[0:2] = []                 # borrar un tramo
print(numeros)
```

```salida
[1, 'a', 4, 5]
[1, 'x', 'y', 'z', 4, 5]
['y', 'z', 4, 5]
```

Es una herramienta potente pero poco legible. Úsala con moderación: para borrar un tramo, `del numeros[0:2]` dice mucho más claro lo que hace.

## El asunto central: `lista_b = lista_a` no copia nada

Con los números, asignar copia el valor, y eso es lo que tu intuición espera:

```python
precio_original = 100
precio_rebajado = precio_original
precio_rebajado = 80

print(precio_original)
print(precio_rebajado)
```

```salida
100
80
```

Con las listas ocurre otra cosa. Mira con atención, porque esto es lo que hay que aprender de la lección:

```python
carrito_ana = ["leche", "pan"]
carrito_luis = carrito_ana        # parece una copia

carrito_luis.append("cerveza")

print(f"Luis: {carrito_luis}")
print(f"Ana:  {carrito_ana}")
```

```salida
Luis: ['leche', 'pan', 'cerveza']
Ana:  ['leche', 'pan', 'cerveza']
```

Ana no ha comprado cerveza, pero le aparece en el carrito. **No hay dos listas: hay una sola lista con dos nombres.** La asignación no ha duplicado nada, solo ha añadido una segunda etiqueta pegada al mismo objeto.

Puedes comprobarlo con el operador `is`, que pregunta si dos nombres apuntan al mismísimo objeto, no si tienen el mismo contenido:

```python
carrito_ana = ["leche", "pan"]
carrito_luis = carrito_ana
otro_carrito = ["leche", "pan"]

print(carrito_luis is carrito_ana)      # el mismo objeto
print(otro_carrito is carrito_ana)      # objetos distintos
print(otro_carrito == carrito_ana)      # pero contenido igual
```

```salida
True
False
True
```

> [!nota] La diferencia entre `is` y `==`
>
> `==` compara contenidos: pregunta "¿valen lo mismo?". `is` compara identidad: pregunta "¿son el mismo objeto en memoria?". Para tus comparaciones normales usa siempre `==`. `is` se reserva para depurar situaciones como esta y para comparar con `None`, que se escribe `if valor is None:`.

Las cadenas y los números no sufren este problema, y ahora entiendes por qué: son inmutables. Nadie puede cambiarlos por dentro, así que da igual cuántos nombres compartan el mismo objeto. Con las listas, que sí se pueden cambiar por dentro, compartir objeto sí se nota.

## Copiar de verdad

Hay tres formas de crear una lista nueva con los mismos elementos, y las tres son equivalentes:

```python
original = ["leche", "pan", "café"]

copia_1 = original[:]          # rebanado completo
copia_2 = list(original)       # el constructor de lista
copia_3 = original.copy()      # el método explícito

copia_1.append("azúcar")
copia_2.remove("pan")
copia_3[0] = "leche desnatada"

print(f"original: {original}")
print(f"copia_1:  {copia_1}")
print(f"copia_2:  {copia_2}")
print(f"copia_3:  {copia_3}")
print(f"¿el mismo objeto? {copia_1 is original}")
```

```salida
original: ['leche', 'pan', 'café']
copia_1:  ['leche', 'pan', 'café', 'azúcar']
copia_2:  ['leche', 'café']
copia_3:  ['leche desnatada', 'pan', 'café']
¿el mismo objeto? False
```

Ahora sí: cada una va por su cuenta y la original no se ha enterado de nada.

| Forma | Cuándo usarla |
| --- | --- |
| `original.copy()` | La más clara. Es la que deberías usar por defecto |
| `list(original)` | Útil cuando además conviertes algo a lista |
| `original[:]` | La clásica. La verás en código antiguo y en `for x in lista[:]` |

> [!consejo] Copia cuando vayas a modificar
>
> La regla práctica es sencilla: si vas a modificar una lista que has recibido de otro sitio y quien te la dio podría seguir usándola, empieza haciendo `trabajo = original.copy()`. Cuesta una línea y te ahorra tardes enteras de depuración.

## Por qué la copia es superficial

Las tres formas de copiar hacen lo que se llama una **copia superficial**: crean una lista nueva, pero dentro colocan los mismos objetos que había en la original. Con números y cadenas eso no importa, porque son inmutables. Con listas dentro de listas, sí importa.

```python
tablero_original = [["-", "-"], ["-", "-"]]
tablero_copia = tablero_original.copy()

tablero_copia[0][0] = "X"

print(f"copia:    {tablero_copia}")
print(f"original: {tablero_original}")
print(f"¿la lista de fuera es la misma? {tablero_copia is tablero_original}")
print(f"¿la primera fila es la misma?   {tablero_copia[0] is tablero_original[0]}")
```

```salida
copia:    [['X', '-'], ['-', '-']]
original: [['X', '-'], ['-', '-']]
¿la lista de fuera es la misma? False
¿la primera fila es la misma?   True
```

La lista de fuera sí es nueva (`is` da `False`), pero **las listas de dentro son las mismas** (`is` da `True`). Al escribir en `tablero_copia[0][0]` estás entrando en una lista interior que las dos comparten, y el cambio aparece en ambas.

## La copia profunda: `copy.deepcopy`

Para duplicar también el contenido interior se usa el módulo `copy` de la biblioteca estándar, que viene con Python y no hay que instalar. Se importa una vez, al principio del fichero:

```python title="tablero.py"
import copy

tablero_original = [["-", "-"], ["-", "-"]]
tablero_copia = copy.deepcopy(tablero_original)

tablero_copia[0][0] = "X"

print(f"copia:    {tablero_copia}")
print(f"original: {tablero_original}")
print(f"¿la primera fila es la misma? {tablero_copia[0] is tablero_original[0]}")
```

```salida
copia:    [['X', '-'], ['-', '-']]
original: [['-', '-'], ['-', '-']]
¿la primera fila es la misma? False
```

`deepcopy` baja hasta el fondo y duplica todas las listas anidadas, por muchos niveles que haya. El precio es que es más lento y gasta más memoria, así que no lo pongas por costumbre: úsalo cuando tengas estructuras anidadas de verdad.

| Necesitas | Usa |
| --- | --- |
| Otro nombre para la misma lista | `b = a` |
| Una lista nueva con elementos simples | `b = a.copy()` |
| Una lista nueva con listas dentro | `b = copy.deepcopy(a)` |

> [!aviso] El clásico `[[0] * 3] * 3`
>
> Crear una cuadrícula multiplicando parece ingenioso y es una bomba, por el mismo motivo:
>
> ```python
> cuadricula = [[0] * 3] * 3
> cuadricula[0][0] = 9
> print(cuadricula)
> ```
>
> ```salida
> [[9, 0, 0], [9, 0, 0], [9, 0, 0]]
> ```
>
> El `* 3` de fuera no crea tres filas: repite **tres veces la misma fila**. Cambias una y cambian todas. La forma correcta es construirlas en un bucle, creando una lista nueva en cada vuelta:
>
> ```python
> cuadricula = []
> for fila in range(3):
>         cuadricula.append([0] * 3)
>
> cuadricula[0][0] = 9
> print(cuadricula)
> ```
>
> ```salida
> [[9, 0, 0], [0, 0, 0], [0, 0, 0]]
> ```

> [!resumen] En resumen
>
> El rebanado de listas es el mismo que el de cadenas, `lista[inicio:fin:paso]`, con el final excluido, y a diferencia de un índice nunca da error: recorta a lo que hay. Un índice devuelve un elemento y un rebanado devuelve siempre una lista. Lo importante de la lección es que `b = a` no copia la lista, crea un segundo nombre para la misma, y cualquier cambio a través de uno se ve en el otro; `is` te permite comprobarlo. Para copiar de verdad están `a.copy()`, `list(a)` y `a[:]`, pero las tres son copias superficiales: si la lista contiene listas, las interiores se siguen compartiendo. Para duplicar también el interior se usa `copy.deepcopy(a)`.

> [!ejercicio] Practica
>
> Crea `23-rebanado-y-copias.py` y resuelve:
>
> 1. Con una lista de los doce meses, imprime el primer trimestre, el último, los meses de posición par y la lista al revés, todo con rebanado.
> 2. Sustituye de golpe los tres primeros elementos de una lista de números por otros tres, asignando a un rebanado.
> 3. Crea una lista de la compra, haz `otra = lista`, añade un elemento a `otra` e imprime las dos. Explica el resultado con tus palabras.
> 4. Repite el ejercicio anterior usando `copy()` y comprueba con `is` y con `==` la diferencia entre las dos situaciones.
> 5. Construye una cuadrícula de 3x3 llena de ceros con un bucle. Cambia el valor de la esquina superior izquierda e imprímela fila por fila para confirmar que solo ha cambiado una.
> 6. Crea una lista con dos listas dentro. Cópiala con `copy()`, modifica un elemento interior y observa qué pasa. Arréglalo con `copy.deepcopy`.
