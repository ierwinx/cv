---
titulo: "Conjuntos: valores sin repetir"
resumen: "La colección que no admite duplicados ni guarda orden, cómo limpiar repetidos y comparar dos grupos de valores."
minutos: 12
orden: 27
---

Tienes una lista con los correos de los asistentes a un curso y algunos se han apuntado dos veces. Quieres la lista de correos únicos. Con lo que sabes, la solución pasa por recorrer, comprobar con `in` si ya estaba y hacer `append` solo si no. Funciona, pero es mucho código para algo tan simple.

Tienes otra lista con los asistentes del año pasado y quieres saber quiénes repiten. Y quiénes son nuevos. Y quiénes se han ido. Con listas y bucles, tres bloques de código más.

Un **conjunto** (`set`) resuelve todo eso de una línea cada cosa. Es una colección con dos reglas: **no admite elementos repetidos** y **no guarda el orden**.

## Crear un conjunto

Se escribe con llaves:

```python
colores = {"rojo", "verde", "azul"}

print(len(colores))
print(type(colores))
print("verde" in colores)
```

```salida
3
<class 'set'>
True
```

Los duplicados desaparecen solos, sin avisar y sin dar error:

```python
votos = {"sí", "no", "sí", "sí", "no"}

print(len(votos))
print(sorted(votos))
```

```salida
2
['no', 'sí']
```

> [!aviso] Un conjunto no tiene orden, así que no lo imprimas tal cual
>
> `print(votos)` funciona, pero el orden en que aparecen los elementos no está garantizado: puede cambiar de una ejecución a otra y de un ordenador a otro. Por eso en esta lección los conjuntos se imprimen siempre con `sorted()`, que devuelve una lista ordenada y, por tanto, predecible.
>
> Consecuencia de no tener orden: **un conjunto no se puede indexar**. `votos[0]` da `TypeError: 'set' object is not subscriptable`. Si necesitas posiciones, lo que necesitas es una lista.

## El conjunto vacío no se escribe con llaves

Aquí hay un detalle que hay que memorizar, porque las llaves estaban pilladas de antes por los diccionarios:

```python
no_es_conjunto = {}
si_es_conjunto = set()

print(type(no_es_conjunto))
print(type(si_es_conjunto))
```

```salida
<class 'dict'>
<class 'set'>
```

`{}` es un **diccionario** vacío. Para un conjunto vacío hay que escribir `set()`. Es una decisión histórica: los diccionarios llegaron a Python muchos años antes que los conjuntos y se quedaron con la notación.

## Su uso más frecuente: quitar duplicados

Esta es la razón por la que la mayoría de la gente usa conjuntos, y merece la pena que la reconozcas de un vistazo:

```python
correos = [
    "ana@correo.es",
    "luis@correo.es",
    "ana@correo.es",
    "marta@correo.es",
    "luis@correo.es",
]

unicos = list(set(correos))

print(f"Recibidos: {len(correos)}")
print(f"Únicos:    {len(unicos)}")
print(sorted(unicos))
```

```salida
Recibidos: 5
Únicos:    3
['ana@correo.es', 'luis@correo.es', 'marta@correo.es']
```

`set(correos)` convierte la lista en conjunto, y al hacerlo tira los repetidos; `list()` la devuelve a lista. Todo en una expresión.

> [!aviso] Pasar por un conjunto destruye el orden original
>
> `list(set(correos))` te da los elementos únicos, pero no en el orden en que estaban. Si el orden importa, ordena el resultado con `sorted()` o vuelve al bucle con `in`:
>
> ```python
> correos = ["luis@correo.es", "ana@correo.es", "luis@correo.es", "ana@correo.es"]
> vistos = []
>
> for correo in correos:
>         if correo not in vistos:
>                 vistos.append(correo)
>
> print(vistos)
> ```
>
> ```salida
> ['luis@correo.es', 'ana@correo.es']
> ```

`set()` acepta cualquier cosa recorrible, incluidas las cadenas:

```python
frase = "el conjunto de las letras"

letras = set(frase)
letras.discard(" ")

print(f"Caracteres distintos: {len(letras)}")
print("".join(sorted(letras)))
```

```salida
Caracteres distintos: 12
acdejlnorstu
```

## Añadir y quitar

Un conjunto sí es mutable, aunque no tenga orden:

```python
etiquetas = {"python", "curso"}

etiquetas.add("listas")
etiquetas.add("python")        # ya estaba: no pasa nada

print(sorted(etiquetas))

etiquetas.discard("curso")     # si no está, no hace nada
etiquetas.discard("django")    # tampoco falla

print(sorted(etiquetas))
```

```salida
['curso', 'listas', 'python']
['listas', 'python']
```

Fíjate en que `add` se llama en singular y añade **un** elemento, y que volver a añadir algo que ya estaba no es un error: simplemente no cambia nada. Esa tolerancia es justo lo que hace cómodos a los conjuntos.

Para quitar hay dos métodos que se diferencian en cómo reaccionan cuando el elemento no está:

```python
etiquetas = {"python", "curso"}

etiquetas.remove("django")
```

```salida
KeyError: 'django'
```

> [!error] KeyError: 'django'
>
> `remove` exige que el elemento esté en el conjunto y falla con `KeyError` si no. `discard` hace lo mismo pero se calla cuando no lo encuentra.
>
> Usa `discard` cuando lo que quieras sea asegurarte de que algo no está, y `remove` cuando la ausencia signifique que algo va mal en tu programa y prefieras enterarte.

| Método | Si el elemento no está |
| --- | --- |
| `conjunto.add(x)` | No aplica: añade o deja igual |
| `conjunto.discard(x)` | No hace nada |
| `conjunto.remove(x)` | `KeyError` |
| `conjunto.pop()` | Saca uno cualquiera; `KeyError` si está vacío |
| `conjunto.clear()` | Deja el conjunto vacío |

`pop()` en un conjunto no recibe índice, porque no hay posiciones: saca un elemento arbitrario. Se usa poco, y nunca para "el primero".

## Las operaciones de conjuntos

Aquí es donde los conjuntos dejan de ser una lista sin repetidos y se convierten en una herramienta. Las cuatro operaciones tienen un operador y un método equivalentes.

```python
del_ano_pasado = {"ana", "luis", "marta", "pedro"}
de_este_ano = {"luis", "marta", "sara", "jorge"}

print(f"Todos:              {sorted(del_ano_pasado | de_este_ano)}")
print(f"Repiten:            {sorted(del_ano_pasado & de_este_ano)}")
print(f"Solo el año pasado: {sorted(del_ano_pasado - de_este_ano)}")
print(f"Solo uno de los dos:{sorted(del_ano_pasado ^ de_este_ano)}")
```

```salida
Todos:              ['ana', 'jorge', 'luis', 'marta', 'pedro', 'sara']
Repiten:            ['luis', 'marta']
Solo el año pasado: ['ana', 'pedro']
Solo uno de los dos:['ana', 'jorge', 'pedro', 'sara']
```

| Operación | Operador | Método | Qué devuelve |
| --- | --- | --- | --- |
| Unión | `a \| b` | `a.union(b)` | Los que están en alguno de los dos |
| Intersección | `a & b` | `a.intersection(b)` | Los que están en los dos |
| Diferencia | `a - b` | `a.difference(b)` | Los de `a` que no están en `b` |
| Diferencia simétrica | `a ^ b` | `a.symmetric_difference(b)` | Los que están en uno pero no en los dos |

Los métodos hacen exactamente lo mismo que los operadores:

```python
del_ano_pasado = {"ana", "luis", "marta", "pedro"}
de_este_ano = {"luis", "marta", "sara", "jorge"}

print(sorted(del_ano_pasado.intersection(de_este_ano)))
print(sorted(del_ano_pasado.difference(de_este_ano)))
print(del_ano_pasado.intersection(de_este_ano) == del_ano_pasado & de_este_ano)
```

```salida
['luis', 'marta']
['ana', 'pedro']
True
```

Usa los operadores cuando los dos lados sean conjuntos, porque se leen mejor, y los métodos cuando el otro lado sea una lista: `a.union(lista)` funciona, pero `a | lista` da `TypeError`.

La diferencia **no es simétrica**, y conviene tenerlo claro:

```python
del_ano_pasado = {"ana", "luis", "marta", "pedro"}
de_este_ano = {"luis", "marta", "sara", "jorge"}

print(f"se fueron: {sorted(del_ano_pasado - de_este_ano)}")
print(f"nuevos:    {sorted(de_este_ano - del_ano_pasado)}")
```

```salida
se fueron: ['ana', 'pedro']
nuevos:    ['jorge', 'sara']
```

Y hay tres comprobaciones más que devuelven `True` o `False`:

```python
permisos_usuario = {"leer", "escribir"}
permisos_necesarios = {"leer"}

print(permisos_necesarios <= permisos_usuario)      # ¿está contenido?
print(permisos_usuario <= permisos_necesarios)
print({"admin"}.isdisjoint(permisos_usuario))       # ¿no comparten nada?
```

```salida
True
False
True
```

`a <= b` pregunta si todos los elementos de `a` están en `b`, y también se escribe `a.issubset(b)`. Es la forma directa de comprobar permisos, requisitos o etiquetas obligatorias.

## Lo que un conjunto no puede contener

Los elementos de un conjunto tienen que ser **inmutables**, por el mismo motivo que las claves de un diccionario: el conjunto calcula una especie de huella de cada valor para encontrarlo al instante, y si el valor cambiara por dentro esa huella dejaría de servir.

```python
coordenadas = {(0, 0), (1, 2), (0, 0)}

print(len(coordenadas))
print((1, 2) in coordenadas)
```

```salida
2
True
```

Las tuplas valen, como ves. Las listas no:

```python
coordenadas = {[0, 0], [1, 2]}
```

```salida
TypeError: cannot use 'list' as a set element (unhashable type: 'list')
```

> [!error] TypeError: unhashable type: 'list'
>
> Has metido una lista donde hacía falta algo inmutable. La solución casi siempre es convertirla en tupla: `{tuple(fila) for fila in filas}`.
>
> Ese es el mensaje que verás en la mayoría de versiones de Python. Desde la 3.14 el texto es más explícito y añade el contexto delante: `cannot use 'list' as a set element (unhashable type: 'list')`.

Números, cadenas, booleanos y tuplas se pueden meter en un conjunto. Listas, diccionarios y otros conjuntos, no.

## Por qué `in` es mucho más rápido en un conjunto

Esto es lo que justifica que los conjuntos existan aunque ya tengas listas. Cuando preguntas `"ana" in lista`, Python no tiene más remedio que ir comparando elemento por elemento desde el principio. Si la lista tiene un millón de elementos y el que buscas está al final, hace un millón de comparaciones.

Un conjunto no busca: **calcula**. A partir del valor obtiene directamente en qué hueco de su tabla interna debería estar y mira solo ahí. Da lo mismo que el conjunto tenga diez elementos o diez millones: el número de comprobaciones es prácticamente el mismo.

```python title="busqueda.py"
import time

numeros_lista = list(range(1000000))
numeros_conjunto = set(numeros_lista)
buscado = 999999

inicio = time.perf_counter()
for intento in range(100):
        buscado in numeros_lista
print(f"lista:    {time.perf_counter() - inicio:.4f} s")

inicio = time.perf_counter()
for intento in range(100):
        buscado in numeros_conjunto
print(f"conjunto: {time.perf_counter() - inicio:.4f} s")
```

Las cifras exactas dependen de tu ordenador, así que aquí no las pego: ejecútalo tú. En la máquina en la que se escribió esta lección, las cien búsquedas en la lista tardaron unas nueve décimas de segundo y las cien búsquedas en el conjunto salieron en `0.0000 s`, es decir, por debajo de la precisión con la que las estamos midiendo. La diferencia es de varios órdenes de magnitud, no de un porcentaje.

> [!consejo] Cuándo esto te importa de verdad
>
> Si haces una comprobación suelta, da igual: una lista de treinta nombres se recorre en un instante. Importa cuando compruebas pertenencia **dentro de un bucle**, porque entonces el coste se multiplica. El patrón a vigilar es este:
>
> ```python
> palabras = ["sol", "mar", "luz", "sal"]
> prohibidas = ["mar", "sal"]              # cámbialo por un conjunto
>
> limpias = [palabra for palabra in palabras if palabra not in prohibidas]
> print(limpias)
> ```
>
> ```salida
> ['sol', 'luz']
> ```
>
> Con cuatro elementos no se nota. Si `prohibidas` tuviera cincuenta mil palabras y `palabras` fuera un libro entero, convertirla en conjunto con `set()` sería la diferencia entre segundos y minutos. Es una de las optimizaciones más rentables que hay: cambiar dos corchetes por dos llaves.

## Conjuntos por comprensión

Funcionan igual que las listas por comprensión, cambiando los corchetes por llaves, y además quitan duplicados por el camino:

```python
palabras = ["Python", "listas", "python", "Listas", "tuplas"]

distintas = {palabra.lower() for palabra in palabras}

print(len(distintas))
print(sorted(distintas))
```

```salida
3
['listas', 'python', 'tuplas']
```

## Tabla comparativa de las tres colecciones

|  | Lista | Tupla | Conjunto |
| --- | --- | --- | --- |
| Se escribe | `[1, 2]` | `(1, 2)` | `{1, 2}` |
| Vacía | `[]` | `()` | `set()` |
| Orden | Sí | Sí | No |
| Duplicados | Sí | Sí | No |
| Acceso por índice | Sí | Sí | No |
| Se puede modificar | Sí | No | Sí |
| Velocidad de `in` | Lenta | Lenta | Muy rápida |
| Para qué | Datos en orden que cambian | Datos fijos que van juntos | Pertenencia y valores únicos |

## Un ejemplo completo

```python title="asistentes.py"
inscritos = ["ana", "luis", "marta", "pedro", "ana", "sara", "luis"]
asistieron = ["luis", "marta", "sara", "jorge"]

conjunto_inscritos = set(inscritos)
conjunto_asistieron = set(asistieron)

print(f"Inscripciones recibidas: {len(inscritos)}")
print(f"Personas distintas:      {len(conjunto_inscritos)}")
print(f"Duplicadas:              {len(inscritos) - len(conjunto_inscritos)}")
print()
print(f"Asistieron y estaban:    {sorted(conjunto_inscritos & conjunto_asistieron)}")
print(f"Faltaron:                {sorted(conjunto_inscritos - conjunto_asistieron)}")
print(f"Vinieron sin inscribirse:{sorted(conjunto_asistieron - conjunto_inscritos)}")
print()
porcentaje = len(conjunto_inscritos & conjunto_asistieron) / len(conjunto_inscritos) * 100
print(f"Asistencia: {porcentaje:.1f} %")
```

```salida
Inscripciones recibidas: 7
Personas distintas:      5
Duplicadas:              2

Asistieron y estaban:    ['luis', 'marta', 'sara']
Faltaron:                ['ana', 'pedro']
Vinieron sin inscribirse:['jorge']

Asistencia: 60.0 %
```

Doce líneas de lógica para un informe que con listas y bucles ocuparía tres veces más y se leería peor.

> [!resumen] En resumen
>
> Un conjunto es una colección sin duplicados y sin orden, se escribe con llaves y el vacío se crea con `set()`, porque `{}` es un diccionario. Los repetidos desaparecen al crearlo, y de ahí su uso más frecuente: `list(set(lista))` deja los valores únicos, aunque pierde el orden original. Se modifica con `add`, con `discard`, que calla si el elemento no está, y con `remove`, que lanza `KeyError`. Sus cuatro operaciones son la unión `|`, la intersección `&`, la diferencia `-` y la diferencia simétrica `^`, cada una con su método equivalente, y responden de una línea a preguntas que con bucles ocuparían un bloque. Sus elementos tienen que ser inmutables, así que admite tuplas pero no listas. Y comprobar pertenencia con `in` es muchísimo más rápido que en una lista, porque el conjunto calcula dónde debería estar el valor en vez de recorrerlo todo: cuando compruebes pertenencia dentro de un bucle, usa un conjunto.

> [!ejercicio] Practica
>
> Crea `27-conjuntos.py` y resuelve:
>
> 1. Parte de una lista de diez números con repetidos. Cuenta cuántos hay, cuántos son distintos y cuántos estaban duplicados.
> 2. Comprueba con `type()` la diferencia entre `{}` y `set()`, y explícala en un comentario.
> 3. Con dos conjuntos de aficiones, el tuyo y el de un amigo, calcula las comunes, las que solo tienes tú, las que solo tiene él y todas juntas.
> 4. Averigua cuántas letras distintas tiene una frase, sin contar los espacios, e imprímelas ordenadas alfabéticamente.
> 5. Intenta crear un conjunto que contenga una lista. Lee el error y arréglalo usando una tupla.
> 6. Con un conjunto de permisos concedidos y otro de permisos necesarios, comprueba si el usuario tiene todos los que hace falta y, si no, imprime cuáles le faltan.
