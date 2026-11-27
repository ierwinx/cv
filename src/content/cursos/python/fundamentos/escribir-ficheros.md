---
titulo: "Escribir ficheros de texto"
resumen: "Los cuatro modos de apertura, la diferencia entre borrar y añadir, y cómo dejar los datos guardados en disco sin perder nada."
minutos: 11
orden: 45
---

Un programa que solo imprime en pantalla olvida todo al terminar. Guardar en un fichero es lo que convierte un ejercicio en una herramienta: un informe que puedes enviar, una lista que sobrevive al reinicio, un registro de lo que ha ido pasando.

Escribir se hace con el mismo `open()` de la lección anterior, pero con un segundo argumento que es donde está toda la miga: el **modo**. Elegir mal el modo es la forma más rápida de borrar un fichero sin querer.

## Los cuatro modos

```python
with open("notas.txt", "w", encoding="utf-8") as fichero:
        fichero.write("Hola\n")
```

Ese `"w"` es el modo. Hay cuatro que necesitas conocer:

| Modo | Nombre | Si el fichero existe | Si no existe |
| --- | --- | --- | --- |
| `"r"` | Lectura (por defecto) | Lo lee | `FileNotFoundError` |
| `"w"` | Escritura | **Borra todo el contenido** | Lo crea |
| `"a"` | Añadir | Escribe al final | Lo crea |
| `"x"` | Creación exclusiva | `FileExistsError` | Lo crea |

Cuando no pones modo, Python usa `"r"`. Por eso en la lección anterior bastaba con `open("compra.txt", encoding="utf-8")`.

> [!aviso] El modo "w" borra el fichero al abrirlo, sin preguntar
>
> No borra cuando escribes: borra en el instante en que se ejecuta el `open()`. Si abres con `"w"` un fichero que tenía tres mil líneas y luego tu programa falla antes de escribir nada, el fichero se queda vacío y no hay vuelta atrás. No hay papelera, no hay confirmación, no hay deshacer.
>
> La regla práctica: si el fichero contiene algo que te importa, abre con `"a"` para añadir o con `"x"` para no pisar nada. Deja `"w"` solo para ficheros que tu programa genera entero cada vez, como un informe de salida.

## write() no añade el salto de línea

Esta es la sorpresa del primer día. `print` pone un salto al final de cada llamada; `write` no pone nada:

```python
with open("notas.txt", "w", encoding="utf-8") as fichero:
        fichero.write("Primera línea")
    fichero.write("Segunda línea")
```

El fichero queda así:

```text title="notas.txt"
Primera líneaSegunda línea
```

Los saltos de línea los pones tú, con `\n`:

```python
with open("notas.txt", "w", encoding="utf-8") as fichero:
        fichero.write("Primera línea\n")
    fichero.write("Segunda línea\n")
```

```text title="notas.txt"
Primera línea
Segunda línea
```

`write()` además devuelve el número de caracteres escritos, un dato que casi nunca usarás pero que explica por qué en la consola interactiva te aparece un número suelto después de escribir:

```consola
>>> fichero = open("prueba.txt", "w", encoding="utf-8")
>>> fichero.write("Hola\n")
5
>>> fichero.close()
```

## Escribir varias líneas

Lo más habitual es tener una lista y volcarla. La forma clara es un `for` con una f-string que añade el salto:

```python title="participantes.py"
participantes = ["Lucía", "Mateo", "Noa", "Hugo"]

with open("participantes.txt", "w", encoding="utf-8") as fichero:
        for nombre in participantes:
                fichero.write(f"{nombre}\n")
```

```text title="participantes.txt"
Lucía
Mateo
Noa
Hugo
```

Existe también `writelines()`, que recibe una lista y la escribe entera. Su nombre engaña, porque **tampoco añade saltos de línea**:

```python
participantes = ["Lucía", "Mateo", "Noa", "Hugo"]

with open("participantes.txt", "w", encoding="utf-8") as fichero:
        fichero.writelines(participantes)
```

```text title="participantes.txt"
LucíaMateoNoaHugo
```

Para que sirva de algo hay que darle las líneas ya con su `\n`, cosa que se hace cómodamente con una comprensión:

```python
participantes = ["Lucía", "Mateo", "Noa", "Hugo"]
lineas = [f"{nombre}\n" for nombre in participantes]

with open("participantes.txt", "w", encoding="utf-8") as fichero:
        fichero.writelines(lineas)
```

```text title="participantes.txt"
Lucía
Mateo
Noa
Hugo
```

Otra opción igual de válida es unir la lista con `"\n".join(participantes)` y hacer un solo `write`. Elige la que te resulte más legible; el `for` con f-string es la que menos dudas genera.

## Añadir sin borrar: el modo "a"

```python title="diario.py"
with open("diario.txt", "w", encoding="utf-8") as fichero:
        fichero.write("Lunes: revisión del presupuesto\n")

with open("diario.txt", "a", encoding="utf-8") as fichero:
        fichero.write("Martes: reunión con el cliente\n")
    fichero.write("Miércoles: entrega de la primera versión\n")
```

```text title="diario.txt"
Lunes: revisión del presupuesto
Martes: reunión con el cliente
Miércoles: entrega de la primera versión
```

Con `"a"` el cursor se coloca al final del fichero nada más abrirlo, así que todo lo que escribas se suma a lo que ya había. Si el fichero no existía, lo crea. Es el modo de los registros y de cualquier cosa que vaya creciendo.

> [!consejo] Cierra el bloque cuanto antes
>
> En el ejemplo hay dos `with` seguidos en vez de uno abierto todo el rato. Es deliberado: un fichero abierto está bloqueado para otros programas y sus datos pueden estar aún sin volcar al disco. Abre, escribe lo que tengas que escribir y sal del bloque.

## Crear sin pisar: el modo "x"

`"x"` crea el fichero solo si no existe. Si existe, falla en vez de tocarlo:

```python
with open("diario.txt", "x", encoding="utf-8") as fichero:
        fichero.write("esto no llega a escribirse\n")
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/diario.py", line 1, in <module>
    with open("diario.txt", "x", encoding="utf-8") as fichero:
         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileExistsError: [Errno 17] File exists: 'diario.txt'
```

> [!error] FileExistsError: \[Errno 17\] File exists: 'diario.txt'
>
> No es un fallo de tu código: es exactamente lo que pediste al usar `"x"`. El fichero ya estaba y Python se niega a sobrescribirlo. Decide qué quieres de verdad: si ibas a reemplazarlo, usa `"w"`; si ibas a sumarle contenido, usa `"a"`; y si quieres generar uno nuevo sin pisar nada, cambia el nombre del fichero, por ejemplo añadiéndole la fecha.

## Un registro de actividad

Este es el ejemplo típico del modo `"a"`: una función que anota lo que va pasando, con su fecha y su hora.

```python title="registro.py"
from datetime import datetime

RUTA_REGISTRO = "actividad.log"


def anotar(mensaje: str) -> None:
        """Añade una línea al registro con la fecha y la hora del momento."""
    momento = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    with open(RUTA_REGISTRO, "a", encoding="utf-8") as fichero:
                fichero.write(f"[{momento}] {mensaje}\n")


anotar("Programa iniciado")
anotar("Cargados 128 registros de clientes")
anotar("Aviso: 3 registros sin teléfono")
anotar("Programa terminado")
```

El programa no imprime nada. Lo que deja en `actividad.log` es esto:

```text title="actividad.log"
[19/09/2026 13:45:17] Programa iniciado
[19/09/2026 13:45:17] Cargados 128 registros de clientes
[19/09/2026 13:45:17] Aviso: 3 registros sin teléfono
[19/09/2026 13:45:17] Programa terminado
```

La fecha y la hora serán las de tu ejecución, claro. Y si vuelves a lanzar el programa, las nuevas líneas se añaden debajo en vez de sustituir a las anteriores: ahí está la gracia del modo `"a"`.

Dos detalles del diseño que conviene copiar. La ruta está en una constante en mayúsculas, arriba del todo, para cambiarla en un solo sitio. Y la función abre y cierra el fichero en cada llamada, que es más lento pero garantiza que, si el programa se cuelga, todo lo anotado hasta ese momento ya está en el disco. En un registro, eso es justo lo que quieres.

> [!nota] Sobre las tildes al escribir
>
> Todo lo dicho en la lección anterior sobre `encoding="utf-8"` vale igual para escribir, y aquí importa incluso más: si escribes con una codificación y lees con otra, el fichero queda con caracteres raros de forma permanente. Pon `encoding="utf-8"` en todos tus `open()`, tanto de lectura como de escritura.

> [!resumen] En resumen
>
> Se escribe con el mismo `open()`, indicando el modo como segundo argumento: `"w"` reemplaza el contenido entero, `"a"` añade al final, `"x"` crea solo si no existe y `"r"` es el de lectura por defecto. El modo `"w"` vacía el fichero en el momento de abrirlo, sin avisar, así que resérvalo para ficheros que tu programa genera desde cero. `write()` no añade saltos de línea y `writelines()` tampoco: los `\n` los pones tú. Para volcar una lista, un `for` con una f-string es lo más claro. Y el `encoding="utf-8"` sigue siendo obligatorio.

> [!ejercicio] Practica
>
> Crea `45-escribir.py` y resuelve:
>
> 1. Pide tres frases por teclado y guárdalas en `frases.txt`, cada una en su línea.
> 2. Ejecuta el programa dos veces con el modo `"w"` y mira el fichero. Cámbialo a `"a"`, ejecuta otras dos veces y explica la diferencia.
> 3. Escribe una función `guardar_lista(ruta, elementos)` que vuelque cualquier lista de cadenas, una por línea.
> 4. Haz un contador de ejecuciones: un programa que lea el número guardado en `contador.txt`, lo muestre, le sume uno y lo vuelva a guardar. La primera vez el fichero no existirá, así que empieza creándolo tú con un `0` dentro.
> 5. Copia un fichero de texto en otro, línea a línea, pasando todo a mayúsculas.
> 6. Adapta la función `anotar()` del registro para que reciba también un nivel (`"INFO"`, `"AVISO"` o `"ERROR"`) y lo escriba entre corchetes después de la fecha.
