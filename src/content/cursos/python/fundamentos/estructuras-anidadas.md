---
titulo: "Estructuras anidadas"
resumen: "Combinar listas y diccionarios para representar datos reales, leer el acceso encadenado y sacar informes de ellos."
minutos: 15
orden: 31
---

Ninguna de las estructuras que has visto llega lejos por separado. Una lista guarda muchas cosas pero no sabe describirlas; un diccionario describe una cosa muy bien pero solo una. Los datos de verdad son las dos cosas a la vez: **muchas** cosas, cada una **descrita** por varios campos.

La solución es meter unas estructuras dentro de otras. No hay sintaxis nueva que aprender en esta lección: es la misma que ya conoces, aplicada en capas. Lo que sí hay que entrenar es leer accesos como `datos["usuarios"][0]["nombre"]` sin marearse.

## Lista de diccionarios

Es la estructura más habitual del mundo real, con diferencia. Cada elemento de la lista es un diccionario que describe un registro, y todos tienen las mismas claves.

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99, "existencias": 12},
    {"nombre": "Ratón", "precio": 15.50, "existencias": 0},
    {"nombre": "Monitor", "precio": 189.00, "existencias": 3},
]

print(len(productos))
print(productos[0])
print(productos[0]["nombre"])
```

```salida
3
{'nombre': 'Teclado', 'precio': 29.99, 'existencias': 12}
Teclado
```

Si alguna vez consumes una API, esto es exactamente lo que vas a recibir. Un JSON con una lista de objetos se convierte en Python en una lista de diccionarios, tal cual, y el módulo de APIs REST de más adelante no hará otra cosa que manejar estructuras como esta.

### Cómo se lee el acceso encadenado

`productos[0]["nombre"]` intimida hasta que descubres que se lee **de izquierda a derecha, un paso cada vez**, y que cada paso devuelve algo más pequeño:

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99, "existencias": 12},
    {"nombre": "Ratón", "precio": 15.50, "existencias": 0},
]

print(type(productos))                    # una lista
print(type(productos[0]))                 # un diccionario
print(type(productos[0]["nombre"]))       # una cadena
print(productos[0]["nombre"].upper())     # y por tanto tiene métodos de cadena
```

```salida
<class 'list'>
<class 'dict'>
<class 'str'>
TECLADO
```

`productos` es una lista, así que `productos[0]` usa un índice. Lo que sale es un diccionario, así que el siguiente paso usa una clave. Corchetes con número para las listas, corchetes con clave para los diccionarios: la forma de cada corchete te dice qué hay a su izquierda.

> [!consejo] Cuando te pierdas, parte el acceso en trozos
>
> No hay ninguna obligación de escribirlo todo de una vez. Si un acceso encadenado te da problemas, guarda los pasos intermedios en variables con nombre y mira qué tienes:
>
> ```python
> productos = [{"nombre": "Teclado", "precio": 29.99}]
>
> primer_producto = productos[0]
> print(type(primer_producto), primer_producto)
>
> precio = primer_producto["precio"]
> print(type(precio), precio)
> ```
>
> ```salida
> <class 'dict'> {'nombre': 'Teclado', 'precio': 29.99}
> <class 'float'> 29.99
> ```
>
> Esa técnica resuelve la mayoría de los `TypeError` y `KeyError` de estas estructuras, porque te enseña en qué capa te habías equivocado.

### Recorrer una lista de diccionarios

El `for` entrega un diccionario completo en cada vuelta:

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99, "existencias": 12},
    {"nombre": "Ratón", "precio": 15.50, "existencias": 0},
    {"nombre": "Monitor", "precio": 189.00, "existencias": 3},
]

for producto in productos:
        print(f"{producto['nombre']:<10} {producto['precio']:>8.2f} €")
```

```salida
Teclado       29.99 €
Ratón         15.50 €
Monitor      189.00 €
```

Fíjate en las comillas simples dentro de la f-string: la clave va entre comillas distintas de las que delimitan la cadena.

Con eso ya puedes sacar un informe completo, sumando y contando como en cualquier bucle:

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99, "existencias": 12},
    {"nombre": "Ratón", "precio": 15.50, "existencias": 0},
    {"nombre": "Monitor", "precio": 189.00, "existencias": 3},
]

valor_total = 0
agotados = []

for producto in productos:
        valor = producto["precio"] * producto["existencias"]
    valor_total += valor
    if producto["existencias"] == 0:
                agotados.append(producto["nombre"])
    print(f"{producto['nombre']:<10}{producto['existencias']:>4} x {producto['precio']:>7.2f} = {valor:>9.2f} €")

print("-" * 41)
print(f"{'VALOR DEL ALMACÉN':<28}{valor_total:>11.2f} €")
print(f"Agotados: {agotados}")
```

```salida
Teclado     12 x   29.99 =    359.88 €
Ratón        0 x   15.50 =      0.00 €
Monitor      3 x  189.00 =    567.00 €
-----------------------------------------
VALOR DEL ALMACÉN                926.88 €
Agotados: ['Ratón']
```

### Filtrar y ordenar una lista de diccionarios

Filtrar es una comprensión con `if`, y la condición mira dentro de cada diccionario:

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99, "existencias": 12},
    {"nombre": "Ratón", "precio": 15.50, "existencias": 0},
    {"nombre": "Monitor", "precio": 189.00, "existencias": 3},
    {"nombre": "Webcam", "precio": 45.00, "existencias": 7},
]

baratos = [producto for producto in productos if producto["precio"] < 50]
nombres_baratos = [producto["nombre"] for producto in productos if producto["precio"] < 50]
disponibles = [producto["nombre"] for producto in productos if producto["existencias"] > 0]

print(len(baratos))
print(nombres_baratos)
print(disponibles)
```

```salida
3
['Teclado', 'Ratón', 'Webcam']
['Teclado', 'Monitor', 'Webcam']
```

Una comprensión puede devolver los diccionarios enteros o solo un campo de cada uno, según lo que pongas antes del `for`. Las dos cosas se usan mucho.

Para ordenar hace falta decirle a `sorted` por qué campo comparar, y eso es un `key`. Con lo que sabes, la vía es la técnica de decorar de la lección anterior:

```python
productos = [
    {"nombre": "Teclado", "precio": 29.99},
    {"nombre": "Ratón", "precio": 15.50},
    {"nombre": "Monitor", "precio": 189.00},
]

por_precio = [(producto["precio"], producto["nombre"]) for producto in productos]

for precio, nombre in sorted(por_precio):
        print(f"{nombre:<10} {precio:>8.2f} €")
```

```salida
Ratón         15.50 €
Teclado       29.99 €
Monitor      189.00 €
```

Y hay una forma directa, usando el módulo `operator` de la biblioteca estándar. `itemgetter("precio")` es una herramienta que, aplicada a un diccionario, devuelve el valor de esa clave, que es justo lo que `key` necesita:

```python
from operator import itemgetter

productos = [
    {"nombre": "Teclado", "precio": 29.99},
    {"nombre": "Ratón", "precio": 15.50},
    {"nombre": "Monitor", "precio": 189.00},
]

for producto in sorted(productos, key=itemgetter("precio"), reverse=True):
        print(f"{producto['nombre']:<10} {producto['precio']:>8.2f} €")
```

```salida
Monitor      189.00 €
Teclado       29.99 €
Ratón         15.50 €
```

`from operator import itemgetter` trae solo ese nombre del módulo, en vez de todo el módulo, y así se escribe `itemgetter(...)` en lugar de `operator.itemgetter(...)`. Cuando llegues a las funciones verás que lo habitual es escribir ese `key` con una `lambda`; mientras tanto, `itemgetter` hace el trabajo y se lee bien.

> [!error] TypeError: string indices must be integers, not 'str'
>
> Este error casi siempre significa que te has quedado una capa corta: crees que tienes un diccionario y lo que tienes es una cadena.
>
> ```python
> productos = [{"nombre": "Teclado"}, {"nombre": "Ratón"}]
>
> for producto in productos:
>         print(producto["nombre"]["precio"])
> ```
>
> ```salida
> TypeError: string indices must be integers, not 'str'
> ```
>
> `producto["nombre"]` ya es la cadena `"Teclado"`, y pedirle la clave `"precio"` no tiene sentido. Imprime `type()` del trozo intermedio y verás en qué capa estás de verdad.

## Diccionario de listas

Aquí la clave es una categoría y el valor es la lista de cosas que pertenecen a ella. Es la estructura natural para agrupar.

```python
asignaturas = {
    "Matemáticas": ["Ana", "Luis", "Marta"],
    "Física": ["Luis", "Pedro"],
    "Historia": ["Ana", "Sara", "Pedro", "Marta"],
}

print(asignaturas["Física"])
print(asignaturas["Física"][0])
print(len(asignaturas["Historia"]))

for asignatura, alumnos in asignaturas.items():
        print(f"{asignatura:<14} {len(alumnos)} alumnos: {', '.join(alumnos)}")
```

```salida
['Luis', 'Pedro']
Luis
4
Matemáticas    3 alumnos: Ana, Luis, Marta
Física         2 alumnos: Luis, Pedro
Historia       4 alumnos: Ana, Sara, Pedro, Marta
```

Un recorrido de dos niveles necesita dos bucles anidados, el de fuera para las claves y el de dentro para cada lista:

```python
asignaturas = {
    "Matemáticas": ["Ana", "Luis"],
    "Física": ["Luis", "Pedro"],
}

for asignatura, alumnos in asignaturas.items():
        print(f"{asignatura}:")
    for alumno in alumnos:
                print(f"  - {alumno}")
```

```salida
Matemáticas:
  - Ana
  - Luis
Física:
  - Luis
  - Pedro
```

Y dando la vuelta a la agrupación se obtiene la otra vista de los mismos datos, con el `setdefault` que ya conoces:

```python
asignaturas = {
    "Matemáticas": ["Ana", "Luis", "Marta"],
    "Física": ["Luis", "Pedro"],
    "Historia": ["Ana", "Sara"],
}

por_alumno = {}

for asignatura, alumnos in asignaturas.items():
        for alumno in alumnos:
                por_alumno.setdefault(alumno, []).append(asignatura)

for alumno in sorted(por_alumno):
        print(f"{alumno:<8} {por_alumno[alumno]}")
```

```salida
Ana      ['Matemáticas', 'Historia']
Luis     ['Matemáticas', 'Física']
Marta    ['Matemáticas']
Pedro    ['Física']
Sara     ['Historia']
```

## Diccionario de diccionarios

Cuando cada elemento tiene un identificador natural (un código, un nombre de usuario, un DNI), un diccionario de diccionarios es mejor que una lista de diccionarios, porque puedes ir directo al que buscas sin recorrer nada.

```python
usuarios = {
    "aperez": {"nombre": "Ana Pérez", "edad": 31, "activo": True},
    "lgomez": {"nombre": "Luis Gómez", "edad": 45, "activo": False},
    "mruiz": {"nombre": "Marta Ruiz", "edad": 27, "activo": True},
}

print(usuarios["lgomez"]["nombre"])
print(usuarios["lgomez"]["activo"])

for identificador, datos in usuarios.items():
        estado = "activo" if datos["activo"] else "inactivo"
    print(f"{identificador:<8} {datos['nombre']:<12} {datos['edad']:>3} años  {estado}")
```

```salida
Luis Gómez
False
aperez   Ana Pérez     31 años  activo
lgomez   Luis Gómez    45 años  inactivo
mruiz    Marta Ruiz    27 años  activo
```

La diferencia práctica entre las dos formas de guardar lo mismo:

|  | Lista de diccionarios | Diccionario de diccionarios |
| --- | --- | --- |
| Buscar uno concreto | Hay que recorrerla | Acceso directo por la clave |
| Mantiene un orden | Sí, el que le des | El de inserción |
| Repetidos | Puede haber dos iguales | La clave es única |
| Recorrer todos | `for x in lista:` | `for clave, x in d.items():` |
| Viene de una API así | Casi siempre | Rara vez |

Lo habitual es recibir una lista de diccionarios y construirte el diccionario de diccionarios si vas a hacer muchas búsquedas:

```python
lista_usuarios = [
    {"usuario": "aperez", "nombre": "Ana Pérez"},
    {"usuario": "lgomez", "nombre": "Luis Gómez"},
]

indice = {}
for datos in lista_usuarios:
        indice[datos["usuario"]] = datos

print(indice["lgomez"]["nombre"])
```

```salida
Luis Gómez
```

## Niveles más profundos

Nada impide seguir bajando, y una respuesta de API típica tiene tres o cuatro niveles:

```python
respuesta = {
    "estado": "ok",
    "total": 2,
    "usuarios": [
        {
            "nombre": "Ana",
            "cursos": [
                {"titulo": "Python", "nota": 9.0},
                {"titulo": "Django", "nota": 7.5},
            ],
        },
        {
            "nombre": "Luis",
            "cursos": [
                {"titulo": "Python", "nota": 6.0},
            ],
        },
    ],
}

print(respuesta["estado"])
print(respuesta["usuarios"][0]["nombre"])
print(respuesta["usuarios"][0]["cursos"][1]["titulo"])
print(respuesta["usuarios"][0]["cursos"][1]["nota"])
```

```salida
ok
Ana
Django
7.5
```

Lee esa última línea en voz alta paso a paso: de la respuesta, los usuarios; de los usuarios, el primero; de ese usuario, sus cursos; de sus cursos, el segundo; de ese curso, la nota. Cada corchete baja un nivel, y la sangría con la que está escrito el literal te dibuja la estructura.

Y el recorrido de todo, con dos bucles:

```python
respuesta = {
    "usuarios": [
        {"nombre": "Ana", "cursos": [{"titulo": "Python", "nota": 9.0}, {"titulo": "Django", "nota": 7.5}]},
        {"nombre": "Luis", "cursos": [{"titulo": "Python", "nota": 6.0}]},
    ],
}

for usuario in respuesta["usuarios"]:
        notas = [curso["nota"] for curso in usuario["cursos"]]
    print(f"{usuario['nombre']:<6} {len(notas)} cursos, media {sum(notas) / len(notas):.2f}")
```

```salida
Ana    2 cursos, media 8.25
Luis   1 cursos, media 6.00
```

> [!consejo] Imprime la estructura con sangría cuando no sepas qué tienes
>
> Cuando recibas datos anidados de un sitio ajeno, un `print` normal los suelta en una sola línea ilegible. El módulo `pprint` de la biblioteca estándar los imprime con saltos y sangría:
>
> ```python
> from pprint import pprint
>
> datos = {"usuarios": [{"nombre": "Ana", "cursos": ["Python", "Django"]}], "total": 1}
>
> pprint(datos)
> ```
>
> ```salida
> {'total': 1, 'usuarios': [{'cursos': ['Python', 'Django'], 'nombre': 'Ana'}]}
> ```
>
> Con estructuras más grandes la diferencia es enorme, porque `pprint` parte las líneas que no caben y ordena las claves. Es lo primero que conviene hacer al explorar datos desconocidos.

> [!aviso] El acceso encadenado falla en el primer hueco
>
> En `datos["usuarios"][0]["nombre"]` hay tres oportunidades de fallar: que no exista la clave `"usuarios"` (`KeyError`), que la lista esté vacía (`IndexError`) o que ese usuario no tenga `"nombre"` (`KeyError`). Con datos que vienen de fuera, esto pasa constantemente.
>
> `get()` con valor por defecto encadena bien y evita la mitad de los problemas:
>
> ```python
> usuario = {"nombre": "Ana"}
>
> print(usuario.get("telefono", "sin teléfono"))
> print(usuario.get("cursos", []))
> print(len(usuario.get("cursos", [])))
> ```
>
> ```salida
> sin teléfono
> []
> 0
> ```
>
> Devolver una lista vacía como valor por defecto es especialmente cómodo, porque un `for` sobre una lista vacía simplemente no da ninguna vuelta, sin necesidad de comprobar nada.

## Un ejemplo completo: catálogo de productos

Esto junta todo el módulo: una lista de diccionarios, filtros con comprensiones, agrupación con `setdefault`, acumuladores, ordenación y salida formateada.

```python title="catalogo.py"
from operator import itemgetter

catalogo = [
    {"nombre": "Teclado mecánico", "categoria": "periféricos", "precio": 89.90, "existencias": 12},
    {"nombre": "Ratón inalámbrico", "categoria": "periféricos", "precio": 24.50, "existencias": 0},
    {"nombre": "Monitor 27 pulgadas", "categoria": "pantallas", "precio": 249.00, "existencias": 4},
    {"nombre": "Monitor 24 pulgadas", "categoria": "pantallas", "precio": 149.00, "existencias": 9},
    {"nombre": "Alfombrilla", "categoria": "accesorios", "precio": 9.95, "existencias": 31},
    {"nombre": "Webcam HD", "categoria": "periféricos", "precio": 45.00, "existencias": 0},
]

ANCHO = 62

# 1. Listado completo ordenado por precio, de mayor a menor
print("CATÁLOGO".center(ANCHO, "="))
print(f"{'PRODUCTO':<24}{'CATEGORÍA':<14}{'PRECIO':>10}{'UNID.':>8}")
print("-" * ANCHO)

for articulo in sorted(catalogo, key=itemgetter("precio"), reverse=True):
        print(
        f"{articulo['nombre']:<24}"
        f"{articulo['categoria']:<14}"
        f"{articulo['precio']:>9.2f}€"
        f"{articulo['existencias']:>8}"
    )

# 2. Totales
valor_almacen = sum([a["precio"] * a["existencias"] for a in catalogo])
unidades = sum([a["existencias"] for a in catalogo])

print("-" * ANCHO)
print(f"{'TOTAL':<38}{valor_almacen:>9.2f}€{unidades:>8}")
print()

# 3. Agrupación por categoría
print("POR CATEGORÍA".center(ANCHO, "="))
por_categoria = {}

for articulo in catalogo:
        por_categoria.setdefault(articulo["categoria"], []).append(articulo)

for categoria in sorted(por_categoria):
        articulos = por_categoria[categoria]
    precios = [articulo["precio"] for articulo in articulos]
    print(f"{categoria:<14} {len(articulos)} artículos   media {sum(precios) / len(precios):>7.2f}€")

print()

# 4. Avisos
print("AVISOS".center(ANCHO, "="))
agotados = [articulo["nombre"] for articulo in catalogo if articulo["existencias"] == 0]
caros = [articulo["nombre"] for articulo in catalogo if articulo["precio"] > 100]

print(f"Agotados ({len(agotados)}):")
for nombre in agotados:
        print(f"  - {nombre}")

print(f"Por encima de 100 €: {', '.join(caros)}")

mas_caro = max(catalogo, key=itemgetter("precio"))
print(f"Artículo más caro:   {mas_caro['nombre']} ({mas_caro['precio']:.2f} €)")
```

```salida
===========================CATÁLOGO===========================
PRODUCTO                CATEGORÍA         PRECIO   UNID.
--------------------------------------------------------------
Monitor 27 pulgadas     pantallas        249.00€       4
Monitor 24 pulgadas     pantallas        149.00€       9
Teclado mecánico        periféricos       89.90€      12
Webcam HD               periféricos       45.00€       0
Ratón inalámbrico       periféricos       24.50€       0
Alfombrilla             accesorios         9.95€      31
--------------------------------------------------------------
TOTAL                                   3724.25€      56

========================POR CATEGORÍA=========================
accesorios     1 artículos   media    9.95€
pantallas      2 artículos   media  199.00€
periféricos    3 artículos   media   53.13€

============================AVISOS============================
Agotados (2):
  - Ratón inalámbrico
  - Webcam HD
Por encima de 100 €: Monitor 27 pulgadas, Monitor 24 pulgadas
Artículo más caro:   Monitor 27 pulgadas (249.00 €)
```

Ahí no hay ni una sola idea que no hayas visto en este módulo. Lo único nuevo es la costumbre de combinarlas, y eso llega con la práctica.

Fíjate en dos detalles del código: las f-strings partidas en varias líneas entre paréntesis, que es la forma de escribir una línea de tabla larga sin pasarte del ancho recomendado por PEP 8, y `"CATÁLOGO".center(ANCHO, "=")`, un método de cadena que centra el texto rellenando con el carácter que le digas.

> [!nota] La siguiente parada natural
>
> Cuando estas estructuras crecen, el código empieza a repetir accesos y a mezclar los datos con su presentación. La respuesta son las funciones, que te dejan dar nombre a cada operación, y más adelante las clases, que permiten sustituir `articulo["precio"]` por `articulo.precio` con la garantía de que ese campo existe. Los diccionarios no dejan de ser útiles por eso: siguen siendo lo que recibes de cualquier API y lo que usas para datos sueltos.

> [!resumen] En resumen
>
> Los datos reales se representan metiendo unas colecciones dentro de otras, sin sintaxis nueva. La estructura más frecuente es la lista de diccionarios, que es exactamente lo que devuelve cualquier API, y se recorre con un `for` que entrega un diccionario completo en cada vuelta. El acceso encadenado `datos["usuarios"][0]["nombre"]` se lee de izquierda a derecha, bajando un nivel por corchete, y la forma del corchete indica si a su izquierda hay una lista o un diccionario; cuando te pierdas, guarda los pasos intermedios en variables e imprime su `type()`. Un diccionario de listas sirve para agrupar y se construye con `setdefault(clave, []).append(x)`, mientras que un diccionario de diccionarios cambia el recorrido por el acceso directo cuando cada registro tiene un identificador natural. Para filtrar se usan comprensiones que miran dentro de cada elemento, y para ordenar por un campo, `sorted` con `key=itemgetter("campo")` o la técnica de construir tuplas con ese campo delante.

> [!ejercicio] Practica
>
> Crea `31-estructuras-anidadas.py` y resuelve:
>
> 1. Crea una lista de cinco diccionarios que describan películas con las claves `titulo`, `director`, `anio` y `nota`. Imprímelas en una tabla alineada con cabecera.
> 2. De esa lista, saca los títulos de las películas con nota mayor que 7, cuántas hay y la nota media de todas.
> 3. Ordénalas por año y después por nota de mayor a menor, mostrando las dos listas.
> 4. Agrupa las películas por director en un diccionario de listas e imprime cuántas ha dirigido cada uno.
> 5. Construye un diccionario de diccionarios de usuarios, con el nombre de usuario como clave, y muestra los datos de uno concreto sin recorrer nada.
> 6. Con un diccionario anidado de tres niveles que tú inventes, imprime un valor del nivel más profundo y después recórrelo entero con bucles anidados.
