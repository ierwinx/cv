---
titulo: "El intérprete interactivo"
resumen: "La consola de Python es tu laboratorio de pruebas: escribes una línea y ves el resultado al instante. Cuándo usarla y cuándo escribir un fichero."
minutos: 8
orden: 6
---

Hasta ahora has escrito un fichero y lo has ejecutado entero. Existe una segunda forma de usar Python, más rápida para probar ideas sueltas: la **consola interactiva**, también llamada REPL.

## Abrirla

Escribe `python` en la terminal, esta vez **sin nombre de fichero detrás**:

```bash
python
```

```salida
Python 3.13.2 (main, Feb  5 2025, 08:05:21)
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

Ese `>>>` del final es el prompt de Python. Ya no estás hablando con la terminal, estás hablando con el intérprete: todo lo que escribas a partir de ahora debe ser Python.

## Cómo se usa

Escribe una expresión y pulsa <kbd>Intro</kbd>. Python la evalúa y **te enseña el resultado sin que tengas que pedírselo**:

```consola
>>> 2 + 2
4
>>> 10 / 4
2.5
>>> "hola" + " " + "mundo"
'hola mundo'
>>> len("Python")
6
```

Esa es la diferencia fundamental con un fichero. En un fichero, si escribes `2 + 2` en una línea no aparece nada: Python calcula el resultado y lo tira, porque no le has dicho que lo muestre. En la consola interactiva te lo enseña siempre, y por eso es tan cómoda para experimentar.

Las variables también se conservan mientras la sesión esté abierta:

```consola
>>> precio = 19.99
>>> unidades = 3
>>> precio * unidades
59.97
```

## Salir

```consola
>>> exit()
```

También funciona <kbd>Ctrl</kbd> + <kbd>D</kbd> en macOS y Linux, o <kbd>Ctrl</kbd> + <kbd>Z</kbd> seguido de <kbd>Intro</kbd> en Windows.

> [!error] He escrito python hola.py dentro de la consola
>
> Un clásico. Si ves `>>>` en pantalla ya estás dentro de Python, y ahí los comandos de terminal no valen: te dará un `SyntaxError`. Sal con `exit()` y vuelve a intentarlo desde la terminal normal.

## Cuándo usar cada cosa

| Situación | Herramienta |
| --- | --- |
| "¿Cómo se escribía esto?" o "¿qué devuelve esta operación?" | Consola interactiva |
| Probar una función que acabas de conocer | Consola interactiva |
| Hacer una cuenta rápida | Consola interactiva |
| Cualquier programa que quieras conservar o volver a ejecutar | Fichero `.py` |
| Todo lo que tenga más de cinco líneas | Fichero `.py` |

La consola **no guarda nada**. Al cerrarla, todo lo que escribiste desaparece. Es una pizarra, no un cuaderno.

> [!consejo] La flecha arriba también funciona aquí
>
> Dentro de la consola, <kbd>Flecha arriba</kbd> recupera las líneas anteriores. Es la forma cómoda de corregir una errata sin volver a teclearlo todo.

## Dos ayudas incorporadas

Python trae documentación dentro. `help()` explica cualquier función:

```consola
>>> help(len)
Help on built-in function len in module builtins:

len(obj, /)
    Return the number of items in a container.
```

Se sale del texto de ayuda pulsando <kbd>Q</kbd>.

Y `dir()` te enseña todo lo que puedes hacer con algo. No entenderás la lista entera todavía, pero es útil saber que existe:

```consola
>>> dir("hola")
['__add__', ..., 'upper', 'title', 'strip', 'split', 'replace']
```

Los nombres del final son operaciones disponibles sobre cualquier texto. Las verás una por una en el módulo de fundamentos.

> [!resumen] En resumen
>
> `python` sin argumentos abre la consola interactiva, donde cada línea se evalúa y se muestra al momento. Es tu laboratorio para probar cosas sueltas, pero no guarda nada: lo que quieras conservar va en un fichero `.py`. Se sale con `exit()`.

> [!ejercicio] Practica
>
> 1. Abre la consola y calcula cuántos minutos tiene un año: `365 * 24 * 60`.
> 2. Prueba `17 / 5`, `17 // 5` y `17 % 5`. Los tres dan resultados distintos. Intenta deducir qué hace cada uno antes de seguir; los veremos en el módulo de fundamentos.
> 3. Escribe `"python".upper()` y mira qué pasa.
> 4. Guarda algo en una variable, sal con `exit()`, vuelve a entrar e intenta usarla. Comprueba con tus propios ojos que la consola no recuerda nada.
