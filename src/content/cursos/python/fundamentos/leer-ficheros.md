---
titulo: "Leer ficheros de texto"
resumen: "Cómo abrir un fichero con with, por qué hay que indicar siempre el encoding y cuál de las tres formas de leer conviene."
minutos: 12
orden: 44
---

Hasta ahora todos tus programas empezaban de cero: los datos entraban por `input()` y desaparecían al terminar. Los programas de verdad leen de donde ya hay información guardada, y el sitio más común es un fichero de texto en el disco. Una lista de la compra, un registro de lo que ha pasado, un exportado de la contabilidad.

Leer un fichero son tres pasos: abrirlo, leerlo y cerrarlo. El tercero es el que se olvida, y Python tiene una construcción que lo hace por ti.

## Abrir un fichero: with open

Parte de este fichero, que puedes crear con tu editor en la misma carpeta que el programa:

```text title="compra.txt"
plátanos
leche desnatada
café molido
pan de centeno
aceite de oliva
```

Y este programa, que lo lee entero:

```python title="lectura.py"
with open("compra.txt", encoding="utf-8") as fichero:
        contenido = fichero.read()

print(contenido)
```

```salida
plátanos
leche desnatada
café molido
pan de centeno
aceite de oliva
```

La línea en blanco del final no es un fallo: el fichero acaba con un salto de línea, y `print` añade otro.

Desmenuza la primera línea, porque tiene cuatro cosas:

- `open("compra.txt")` abre el fichero y devuelve un objeto con el que se lee.
- `encoding="utf-8"` dice cómo están codificadas las letras. Enseguida vemos por qué es obligatorio.
- `as fichero` guarda ese objeto en una variable. El nombre lo eliges tú; verás mucho `f`, pero `fichero` se lee mejor.
- El bloque sangrado es donde trabajas con él. **Al salir del bloque, el fichero se cierra solo.**

### Por qué siempre with

Se puede abrir un fichero sin `with`, pero entonces tienes que acordarte de cerrarlo:

```python
fichero = open("compra.txt", encoding="utf-8")
contenido = fichero.read()
fichero.close()          # si esta línea no se ejecuta, el fichero queda abierto
```

El problema es ese comentario. Si entre el `open` y el `close` salta un error, la línea del `close` nunca se ejecuta y el fichero se queda abierto. Un fichero abierto consume un recurso del sistema, y en Windows además queda bloqueado: no podrás borrarlo ni renombrarlo, y si estabas escribiendo, parte de lo escrito puede perderse sin llegar al disco.

`with` garantiza el cierre **pase lo que pase**, incluso si el bloque revienta a la mitad. Puedes comprobarlo:

```python
with open("compra.txt", encoding="utf-8") as fichero:
        contenido = fichero.read()

print(fichero.closed)
```

```salida
True
```

> [!consejo] Trata with open como la única forma correcta
>
> No hay ningún caso en este curso, ni prácticamente en la vida real, en el que merezca la pena abrir un fichero sin `with`. Si ves código con `open()` suelto y un `close()` más abajo, es código antiguo. Escribe siempre `with`.

## El encoding, y por qué no es opcional

Un fichero de texto no guarda letras: guarda bytes. La tabla que traduce esos bytes a letras se llama **codificación**, y hoy la que se usa en todas partes es UTF-8, que sabe representar acentos, eñes, símbolos y emojis.

El problema es que si no dices nada, Python usa la codificación por defecto del sistema. En macOS y Linux eso ya es UTF-8, así que parece que funciona. En Windows, en cambio, en muchas configuraciones sigue siendo `cp1252`, y entonces el mismo programa que funcionaba en tu portátil falla en el de al lado, o peor, lee mal las tildes sin avisar.

```python
# mal: depende del sistema donde se ejecute
with open("compra.txt") as fichero:
        ...

# bien: se comporta igual en todas partes
with open("compra.txt", encoding="utf-8") as fichero:
        ...
```

> [!aviso] Escribe encoding="utf-8" siempre, sin excepciones
>
> Aunque a ti te funcione sin ponerlo. Es la diferencia entre un programa que funciona en tu ordenador y un programa que funciona. Cuesta veinte caracteres.

> [!error] UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 3: invalid continuation byte
>
> Estás leyendo como UTF-8 un fichero que no lo es, casi siempre uno antiguo guardado en `latin-1` o `cp1252` (un exportado de Excel, por ejemplo). El byte que te señala suele ser una vocal acentuada. La solución es abrirlo con su codificación real, `encoding="latin-1"`, o abrir el fichero con tu editor y volver a guardarlo como UTF-8, que es lo que conviene a la larga.

## Las tres formas de leer

### read(), el fichero entero en una cadena

```python
with open("compra.txt", encoding="utf-8") as fichero:
        contenido = fichero.read()

print(type(contenido))
print(len(contenido))
```

```salida
<class 'str'>
68
```

Te da una única cadena con todo dentro, saltos de línea incluidos. Es lo más cómodo cuando el fichero es pequeño y quieres tratarlo como un bloque de texto: buscar algo con `in`, contar palabras, reemplazar.

> [!nota] read() solo funciona una vez
>
> El fichero lleva una especie de cursor que avanza según lees. Después de un `read()` el cursor está al final, así que un segundo `read()` dentro del mismo `with` devuelve la cadena vacía. No es un error de Python: es que ya no queda nada por leer.

### readlines(), una lista de líneas

```python
with open("compra.txt", encoding="utf-8") as fichero:
        lineas = fichero.readlines()

print(lineas)
print(len(lineas))
```

```salida
['plátanos\n', 'leche desnatada\n', 'café molido\n', 'pan de centeno\n', 'aceite de oliva\n']
5
```

Mira bien la lista: **cada elemento acaba en `\n`**. Ese salto de línea es parte del texto del fichero y viene incluido, lo que sorprende siempre la primera vez. Si comparas `linea == "plátanos"` te dirá que no, porque lo que tienes es `"plátanos\n"`.

La solución es `strip()`, que quita los espacios y saltos de los dos extremos, aplicado a cada línea. Pero si lo que quieres es directamente la lista limpia, hay un camino más corto:

```python
with open("compra.txt", encoding="utf-8") as fichero:
        lineas = fichero.read().splitlines()

print(lineas)
```

```salida
['plátanos', 'leche desnatada', 'café molido', 'pan de centeno', 'aceite de oliva']
```

`splitlines()` sobre el contenido completo es el atajo directo para tener la lista ya limpia, sin pasar por `readlines()` ni recortar nada a mano.

### El bucle for, línea a línea

Esta es la forma buena, y la que deberías usar por defecto:

```python
with open("compra.txt", encoding="utf-8") as fichero:
        numero = 1
    for linea in fichero:
                print(f"{numero}. {linea.strip()}")
        numero += 1
```

```salida
1. plátanos
2. leche desnatada
3. café molido
4. pan de centeno
5. aceite de oliva
```

Recorrer el fichero con un `for` directamente, sin llamar a nada, te va entregando **una línea cada vez**. La diferencia con las otras dos es de memoria: `read()` y `readlines()` cargan el fichero entero de golpe, así que un registro de dos gigas ocupa dos gigas de memoria RAM, y el programa se arrastra o directamente muere. El `for` solo tiene una línea en memoria en cada momento, da igual lo grande que sea el fichero.

| Forma | Qué devuelve | Cuándo usarla |
| --- | --- | --- |
| `fichero.read()` | Una cadena con todo | Ficheros pequeños que tratas como un bloque |
| `fichero.read().splitlines()` | Lista de líneas sin `\n` | Ficheros pequeños, cuando quieres la lista limpia |
| `fichero.readlines()` | Lista de líneas con `\n` | Casi nunca; prefiere las otras dos |
| `for linea in fichero:` | Una línea cada vez | Por defecto, y obligatorio si el fichero es grande |

> [!aviso] El strip() no es opcional en el bucle
>
> Dentro del `for`, cada línea trae su `\n` final igual que en `readlines()`. Si vas a comparar, convertir a número o guardar el valor, aplica `strip()` antes. `int("42\n")` funciona por casualidad porque `int()` ignora los espacios de los extremos, pero `"42\n" == "42"` es `False`, y ese es el fallo que te tendrá media hora mirando la pantalla.

## Cuando el fichero no está

Si la ruta no existe, `open()` no devuelve nada raro ni `None`: detiene el programa.

```python title="lectura.py"
with open("compras.txt", encoding="utf-8") as fichero:
        print(fichero.read())
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/lectura.py", line 1, in <module>
    with open("compras.txt", encoding="utf-8") as fichero:
         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'compras.txt'
```

> [!error] FileNotFoundError: \[Errno 2\] No such file or directory: 'compras.txt'
>
> El fichero no está donde Python lo busca. Tres causas, y la tercera es la que más tiempo roba:
>
> - Una errata en el nombre, como aquí: el fichero es `compra.txt` y has escrito `compras.txt`.
> - La extensión oculta de Windows: crees que se llama `notas.txt` pero en realidad es `notas.txt.txt`.
> - **La ruta relativa no se resuelve desde donde está tu programa, sino desde la carpeta en la que ejecutaste `python`.** Si lanzaste el programa desde otra carpeta, `"compra.txt"` apunta a otro sitio. Añade `import os` y `print(os.getcwd())` al principio para ver desde dónde está mirando de verdad.

En la lección de manejo de errores verás cómo capturar esto con `try` para que el programa siga con un mensaje amable en vez de morirse.

## Un ejemplo completo

Un fichero de tareas donde las líneas que empiezan por `#` son comentarios y las vacías se ignoran:

```text title="tareas.txt"
# Tareas de la semana
Revisar el presupuesto
Llamar a la gestoría

Preparar la reunión del martes
# Pendiente de confirmar
Actualizar la página de contacto
```

```python title="tareas.py"
def leer_tareas(ruta: str) -> list[str]:
        """Devuelve las tareas del fichero, sin comentarios ni líneas vacías."""
    tareas = []
    with open(ruta, encoding="utf-8") as fichero:
                for linea in fichero:
                        limpia = linea.strip()
            if limpia == "" or limpia.startswith("#"):
                                continue
            tareas.append(limpia)
    return tareas


tareas = leer_tareas("tareas.txt")

print(f"Hay {len(tareas)} tareas pendientes:")
for tarea in tareas:
        print(f"  - {tarea}")

mas_larga = max(tareas, key=len)
print(f"La de descripción más larga es: {mas_larga}")
```

```salida
Hay 4 tareas pendientes:
  - Revisar el presupuesto
  - Llamar a la gestoría
  - Preparar la reunión del martes
  - Actualizar la página de contacto
La de descripción más larga es: Actualizar la página de contacto
```

Fíjate en el patrón, porque lo vas a repetir muchas veces: una función que recibe la ruta, abre con `with`, recorre con `for`, limpia con `strip()`, descarta lo que no sirve con `continue` y devuelve una lista ya lista para usar. El resto del programa no sabe nada de ficheros.

> [!resumen] En resumen
>
> Los ficheros se abren con `with open(ruta, encoding="utf-8") as fichero:`, que garantiza el cierre aunque el bloque falle. El `encoding` se pone siempre, porque si no cada sistema decide el suyo y las tildes se rompen al cambiar de ordenador. Hay tres formas de leer: `read()` trae todo en una cadena, `readlines()` da una lista de líneas con su `\n` incluido, y recorrer el fichero con un `for` entrega una línea cada vez sin cargar el resto en memoria, que es lo que debes hacer por defecto. A cada línea leída se le quita el salto final con `strip()`. Si la ruta no existe, salta `FileNotFoundError`, y muchas veces la culpa no es del nombre sino de la carpeta desde la que ejecutas el programa.

> [!ejercicio] Practica
>
> Crea un fichero `poema.txt` con seis o siete versos (los que quieras, pero que alguno lleve tildes) y resuelve en `44-leer.py`:
>
> 1. Léelo entero con `read()` y muestra cuántos caracteres tiene.
> 2. Muéstralo numerando los versos, recorriéndolo con un `for` y quitando el salto de línea.
> 3. Cuenta cuántas líneas tiene y cuántas palabras en total. Para las palabras te sirve `split()` sobre cada línea.
> 4. Muestra solo los versos que contengan una letra concreta, pidiéndola por teclado.
> 5. Escribe una función `contar_apariciones(ruta, palabra)` que devuelva cuántas veces aparece una palabra en el fichero, sin distinguir mayúsculas.
> 6. Cambia el nombre del fichero en tu código por uno que no exista, ejecuta y lee el error completo. Después añade `import os` y `print(os.getcwd())` al principio y comprueba desde qué carpeta está buscando Python.
