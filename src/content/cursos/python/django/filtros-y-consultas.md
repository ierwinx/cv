---
titulo: "Filtros y consultas"
resumen: "Todo lo que se puede preguntar sin escribir SQL, y las tres cosas que se rompen al buscar y ordenar en español."
minutos: 19
orden: 12
---

Con la tabla llena, la pregunta pasa a ser cómo se saca de ella lo que hace falta. En el módulo 3 eso era escribir SQL: un `SELECT` con su `WHERE`, sus interrogantes para los parámetros y su `ORDER BY`. Aquí es encadenar llamadas a métodos, y al final Django escribe ese mismo SQL.

La lección está partida en dos. La primera mitad es cómo se consulta, que es mecánico y se aprende rápido. La segunda es lo que de verdad cuesta descubrir: **buscar y ordenar texto en español no funciona bien por defecto**, por tres motivos distintos y todos silenciosos. Ya te topaste con uno en la lección 47 del módulo 3, cuando el orden alfabético de SQL ponía la eñe donde no le tocaba.

> [!objetivo] Qué vas a aprender
>
> Filtrar con los lookups más usados y saber que encadenar filtros es un `AND`, montar condiciones con `OR` y negaciones con `Q`, ordenar y cortar, sacar solo algunos campos con `values` y `values_list`, contar y agrupar con `aggregate` y `annotate`, usar `F` para referirse a otra columna, y conocer los tres fallos de buscar y ordenar en español con SQLite.

## La sintaxis de los filtros

Un filtro se escribe con el nombre del campo, dos guiones bajos y el tipo de comparación:

```python
Contacto.objects.filter(nombre__icontains='ana')
```

Esos dos guiones bajos son la convención del ORM entero, y se leen como un punto: "del campo `nombre`, la comparación `icontains`". Si no pones ninguna, es igualdad:

```python
Contacto.objects.filter(grupo='trabajo')       # igual que grupo__exact='trabajo'
```

Los que se usan de verdad:

| Lookup | Qué compara | SQL |
| --- | --- | --- |
| `exact` | Igual | `= valor` |
| `iexact` | Igual sin distinguir mayúsculas | `LIKE valor` |
| `contains` | Lo contiene | `LIKE %valor%` |
| `icontains` | Lo contiene, sin mayúsculas | `LIKE %valor%` |
| `startswith`, `endswith` | Empieza o acaba por | `LIKE valor%` |
| `in` | Está en una lista | `IN (...)` |
| `gt`, `gte`, `lt`, `lte` | Mayor, mayor o igual, menor, menor o igual | `>`, `>=`, `<`, `<=` |
| `range` | Entre dos valores, incluidos | `BETWEEN` |
| `isnull` | Es `NULL` o no lo es | `IS NULL` |
| `year`, `month`, `day`, `date` | Partes de una fecha | Depende del gestor |

```python
Contacto.objects.filter(grupo__in=['trabajo', 'familia'])
Contacto.objects.filter(creado__year=2026)
Contacto.objects.filter(creado__gte=hace_una_semana)
Contacto.objects.filter(telefono='')
```

Ese último es el de la lección 9 en la práctica: como en los campos de texto no se usa `null=True`, "no tiene teléfono" se pregunta con la cadena vacía y no con `isnull`.

## Encadenar es un `AND`

```python
Contacto.objects.filter(grupo='trabajo').filter(telefono='').exclude(nombre='X')
```

```salida
WHERE "grupo" = trabajo AND "telefono" =  AND NOT ("nombre" = X)
```

Cada `filter` añade una condición con `AND`, y `exclude` añade la negación. Como el `QuerySet` es perezoso, esas tres llamadas siguen siendo **una sola consulta**, que se monta entera antes de ejecutarse.

Eso es lo que permite construir una búsqueda por partes, que es como se escribe en una vista de verdad:

```python
contactos = Contacto.objects.all()
if texto:
        contactos = contactos.filter(nombre__icontains=texto)
if grupo:
        contactos = contactos.filter(grupo=grupo)
```

Cuatro líneas, una consulta, y el número de condiciones depende de lo que haya pedido quien mira. Con SQL a mano eso era concatenar cadenas y llevar la cuenta de si toca `WHERE` o `AND`.

## `OR` y negaciones: los objetos `Q`

Encadenar solo da `AND`. Para un `OR` hace falta `Q`:

```python
from django.db.models import Q

Contacto.objects.filter(Q(grupo='trabajo') | Q(grupo='familia'))
Contacto.objects.filter(~Q(grupo='trabajo'))
Contacto.objects.filter(Q(nombre__icontains='ana') | Q(correo__icontains='ana'))
```

El `|` es el `OR`, el `&` es el `AND` y el `~` es la negación. Los tres operadores son los del módulo 1 para conjuntos, redefinidos aquí.

Ese tercer ejemplo es el buscador típico: una caja de texto que busca en varios campos a la vez. Con varios campos se monta en un bucle:

```python
consulta = Q()
for campo in ('nombre', 'correo', 'telefono'):
        consulta |= Q(**{f'{campo}__icontains': texto})
Contacto.objects.filter(consulta)
```

> [!aviso] Los `Q` van antes que los argumentos con nombre
>
> Esto no es una regla de Django, es de Python, y el error despista porque parece de Django:
>
> ```python
> Contacto.objects.filter(Q(grupo='trabajo'), nombre='Ana')    # bien
> Contacto.objects.filter(nombre='Ana', Q(grupo='trabajo'))    # SyntaxError
> ```
>
> ```salida
> SyntaxError: positional argument follows keyword argument
> ```
>
> Un `Q` es un argumento posicional y los `campo=valor` son argumentos con nombre, así que los `Q` van todos delante. Lo dice el intérprete antes de ejecutar nada.

## Ordenar y cortar

```python
Contacto.objects.order_by('nombre')          # ascendente
Contacto.objects.order_by('-creado')         # descendente, con el guion
Contacto.objects.order_by('grupo', 'nombre') # por grupo y, dentro, por nombre
Contacto.objects.order_by('?')               # al azar
```

El corte usa la sintaxis de rebanado de Python y se traduce a `LIMIT`:

```consola
>>> print(Contacto.objects.all()[:3].query)
SELECT ... FROM "contactos_contacto" LIMIT 3
```

No se traen las filas para quedarse con tres: se le pide a la base de datos que devuelva tres. Esa es la diferencia con `list(Contacto.objects.all())[:3]`, que sí las trae todas.

Dos límites del rebanado que sorprenden. **No admite índices negativos**, porque no existe `LIMIT -1`; para el último elemento se ordena al revés y se pide el primero, con `order_by('-creado').first()`. Y **una vez cortado, el `QuerySet` ya no se puede filtrar**, porque el SQL ya lleva el `LIMIT`.

## Sacar solo lo que hace falta

`values` y `values_list` devuelven diccionarios y tuplas en lugar de objetos, y piden a la base de datos solo esas columnas:

```consola
>>> Contacto.objects.values('nombre', 'grupo')[:2]
[{'nombre': 'Ana Ruiz', 'grupo': 'trabajo'}, {'nombre': 'Luis Pardo', 'grupo': 'familia'}]
>>> Contacto.objects.values_list('nombre', 'grupo')[:2]
[('Ana Ruiz', 'trabajo'), ('Luis Pardo', 'familia')]
>>> Contacto.objects.values_list('nombre', flat=True)[:2]
['Ana Ruiz', 'Luis Pardo']
```

`flat=True` solo vale con un campo y ahorra desempaquetar tuplas de un elemento. Es lo que se usa para rellenar un desplegable o para sacar una lista de correos.

El precio es que ya no son objetos: no tienen métodos, no tienen `get_grupo_display()` y no se pueden guardar. Se usan cuando de verdad solo hacen falta los datos.

## Contar y agrupar

```consola
>>> from django.db.models import Count, Max
>>> Contacto.objects.aggregate(total=Count('id'), ultimo=Max('creado'))
{'total': 6, 'ultimo': datetime.datetime(2026, 9, 22, 16, 26, 57, tzinfo=...)}
```

`aggregate` reduce todo el conjunto a un diccionario. `annotate`, en cambio, **añade un dato a cada fila**, y combinado con `values` es el `GROUP BY` de SQL:

```consola
>>> Contacto.objects.values('grupo').annotate(n=Count('id')).order_by('-n')
[{'grupo': 'trabajo', 'n': 2}, {'grupo': 'familia', 'n': 2},
 {'grupo': 'sin', 'n': 1}, {'grupo': 'amigos', 'n': 1}]
```

Se lee así: agrupa por `grupo`, cuenta cuántos hay en cada uno y ordena por la cuenta. Es una sola consulta, y en SQL sería un `SELECT grupo, COUNT(id) ... GROUP BY grupo ORDER BY 2 DESC`.

`annotate` también sirve para calcular sobre cada fila:

```consola
>>> from django.db.models.functions import Length
>>> Contacto.objects.annotate(n=Length('nombre')).values_list('nombre', 'n')[:3]
[('Ana Ruiz', 8), ('Luis Pardo', 10), ('Íñigo Ñuño', 10)]
```

## Referirse a otra columna: `F`

Cuando el valor con el que comparas o con el que actualizas **es otra columna**, no se puede escribir directamente, porque en Python no tienes la fila delante. Para eso está `F`:

```python
from django.db.models import F, Value
from django.db.models.functions import Concat

Contacto.objects.update(notas=Concat(F('nombre'), Value(' / '), F('grupo')))
```

```salida
['Ana Ruiz / trabajo', 'Luis Pardo / familia']
```

Lo importante de `F` es que **la operación ocurre en la base de datos**. Compara las dos formas de sumar uno a un contador:

```python
producto.visitas = producto.visitas + 1     # lee en Python, suma, escribe
producto.visitas = F('visitas') + 1         # UPDATE ... SET visitas = visitas + 1
```

La primera tiene una carrera dentro: si dos peticiones lo hacen a la vez, las dos leen el mismo valor y una de las dos sumas se pierde. La segunda se lo pide a la base de datos, que lo resuelve de forma atómica. En una web, donde por definición hay peticiones simultáneas, esto no es un detalle.

## Buscar y ordenar en español

Aquí está la parte que hay que conocer sí o sí, y que casi ningún tutorial cuenta porque en inglés no se nota. Los tres fallos están medidos sobre la agenda con estos seis contactos: `Ana Ruiz`, `Luis Pardo`, `Íñigo Ñuño`, `Zoe Álvarez`, `ana lopez` y `Óscar Paz`.

### Uno: en SQLite, `contains` ya no distingue mayúsculas

```consola
>>> Contacto.objects.filter(nombre__contains='ana').values_list('nombre', flat=True)
['Ana Ruiz', 'ana lopez']
```

`contains`, sin la `i`, debería encontrar solo `ana lopez`. Ha encontrado los dos. El motivo es que el `LIKE` de SQLite **no distingue mayúsculas de minúsculas en los caracteres ASCII**, y Django no puede hacer nada al respecto.

El problema no es lo que hace, es que **PostgreSQL sí distingue**. Un buscador escrito con `contains` que funciona perfectamente en tu portátil deja de encontrar la mitad de las cosas el día que el proyecto se despliega con PostgreSQL. La regla: **usa siempre `icontains` cuando busques texto escrito por una persona**, aunque en desarrollo los dos te den lo mismo.

### Dos: esa insensibilidad no llega a las tildes

Y aquí se pone peor:

```consola
>>> Contacto.objects.filter(nombre__icontains='Í').values_list('nombre', flat=True)
['Íñigo Ñuño']
>>> Contacto.objects.filter(nombre__icontains='í').values_list('nombre', flat=True)
[]
```

La misma búsqueda, cambiando la mayúscula por la minúscula, y una devuelve el contacto y la otra no devuelve nada. `icontains` funciona en ASCII y **no sabe que `í` y `Í` son la misma letra**. Lo mismo con `ñ` y `Ñ`, y con cualquier letra acentuada.

Para un buscador de una agenda en español eso es inaceptable: nadie escribe `Íñigo` con la tilde y la mayúscula correctas en una caja de búsqueda. Las tres salidas:

- **PostgreSQL**, que sí sabe de Unicode, y además trae búsqueda de texto completo. Es la razón de peso para la lección 41.
- **Guardar una columna normalizada**: un campo `nombre_busqueda` con el nombre en minúsculas y sin tildes, rellenado en el `save()` del modelo, y buscar ahí. Funciona en cualquier gestor y es lo que se hace en la lección 37.
- **Filtrar en Python**, que solo vale con pocos datos porque hay que traerlos todos.

### Tres: `ORDER BY` no ordena el español

```consola
>>> Contacto.objects.order_by('nombre').values_list('nombre', flat=True)
['Ana Ruiz', 'Luis Pardo', 'Zoe Álvarez', 'ana lopez', 'Íñigo Ñuño', 'Óscar Paz']
```

Tres cosas mal en una sola lista. `ana lopez` sale **después** de `Zoe`, porque las minúsculas van detrás de las mayúsculas en la tabla de caracteres. `Íñigo` y `Óscar` salen al final del todo, porque sus códigos son mayores que los de las letras sin tilde. Y `Álvarez` no está entre las aes.

Este es exactamente el problema que se encontró en la lección 47 del módulo 3, y allí se resolvió igual que hay que resolverlo aquí.

Lo primero que se intenta es ordenar por el campo en minúsculas, y **no basta**:

```consola
>>> from django.db.models.functions import Lower
>>> Contacto.objects.annotate(b=Lower('nombre')).order_by('b').values_list('b', flat=True)
['ana lopez', 'ana ruiz', 'luis pardo', 'zoe Álvarez', 'Íñigo Ñuño', 'Óscar paz']
```

Arregla las mayúsculas y no arregla las tildes: fíjate en que `Álvarez` sigue con su `Á`, porque el `lower()` de SQLite tampoco pasa de ASCII. `Íñigo` y `Óscar` siguen al final.

Lo que sí funciona es ordenar en Python, normalizando:

```python
import unicodedata

def clave_alfabetica(texto):
        """Ordena como un diccionario español: sin distinguir mayúsculas ni tildes."""
    return unicodedata.normalize('NFKD', texto.casefold())

nombres = sorted(Contacto.objects.values_list('nombre', flat=True), key=clave_alfabetica)
```

```salida
['ana lopez', 'Ana Ruiz', 'Íñigo Ñuño', 'Luis Pardo', 'Óscar Paz', 'Zoe Álvarez']
```

Ese sí es el orden de un diccionario. `NFKD` separa la letra de su tilde y `casefold()` es el `lower()` que sí entiende Unicode, los dos de la lección 24 del módulo 1.

> [!aviso] Ordenar en Python tiene un precio, y hay que saber cuál
>
> Ese `sorted` obliga a **traer todas las filas a memoria**. Con una agenda de doscientos contactos no se nota; con cincuenta mil, es media aplicación caída.
>
> El criterio práctico:
>
> - **Pocos datos y orden que importa a la vista**: ordena en Python. La agenda de este módulo entra aquí.
> - **Muchos datos**: guarda una columna normalizada y ordena por ella en la base de datos, que es lo que permite además paginar bien, porque paginar exige que el orden lo haga el gestor.
> - **PostgreSQL**: se puede definir una *collation* que ordena en español, y entonces el `ORDER BY` hace lo correcto sin ayuda.
>
> Esto es un caso concreto de algo que vale para todo el bloque: **lo que se hace en la base de datos escala y lo que se hace en Python no**, pero la base de datos no sabe de idiomas salvo que se lo digas.

> [!resumen] En resumen
>
> Las consultas se escriben con el nombre del campo, dos guiones bajos y el tipo de comparación, y encadenar filtros añade condiciones con `AND`, lo que permite construir una búsqueda por partes que sigue siendo una sola consulta gracias a la pereza del `QuerySet`. Para el `OR` y la negación están los objetos `Q`, combinados con `|`, `&` y `~`, que tienen que ir siempre antes de los argumentos con nombre porque así lo exige Python. Se ordena con `order_by`, poniendo un guion delante para invertir, y se corta con la sintaxis de rebanado, que se traduce a `LIMIT` y por tanto no admite índices negativos. `values` y `values_list` traen diccionarios o tuplas en lugar de objetos y piden solo esas columnas; `aggregate` reduce el conjunto a un diccionario y `annotate` añade un dato a cada fila, que combinado con `values` es el `GROUP BY`; y `F` sirve para referirse a otra columna y hacer que la operación ocurra en la base de datos, lo que evita la carrera de leer, sumar y escribir desde Python. La otra mitad de la lección es que buscar y ordenar en español falla de tres maneras con SQLite: `contains` no distingue mayúsculas, al contrario que en PostgreSQL, así que hay que escribir siempre `icontains`; ni `icontains` ni `Lower` entienden las letras acentuadas, de modo que buscar `í` no encuentra `Í`; y `ORDER BY` deja las minúsculas y las palabras con tilde al final de la lista. Se resuelve ordenando en Python con `unicodedata.normalize` y `casefold` cuando hay pocos datos, o guardando una columna normalizada cuando hay muchos.

> [!ejercicio] Practica
>
> Carga primero seis o siete contactos con tildes, eñes y alguna minúscula inicial, que es lo que hace visibles los tres problemas.
>
> 1. Filtra por grupo, por nombre con `icontains` y por los dos a la vez encadenando. Imprime el `.query` de la consulta encadenada y localiza los `AND`.
> 2. Escribe un buscador con `Q` que mire en el nombre, el correo y el teléfono a la vez. Después móntalo con el bucle que acumula `Q` en una variable.
> 3. Compara `contains` con `icontains` buscando `ana`. Explica por qué en SQLite dan lo mismo y por qué eso es un problema.
> 4. Busca `í` en minúscula y después `Í` en mayúscula. Comprueba que no devuelven lo mismo.
> 5. Ordena por nombre con `order_by`, después con `annotate(Lower(...))` y por último en Python con `unicodedata`. Compara las tres listas y señala qué arregla cada paso.
> 6. Cuenta cuántos contactos hay por grupo con `values` y `annotate`, y saca además la fecha del último creado con `aggregate`.
