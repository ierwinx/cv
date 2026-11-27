---
titulo: "Tu primer programa"
resumen: "Escribes, guardas y ejecutas tu primer fichero de Python, y entiendes línea por línea qué acaba de pasar."
minutos: 10
orden: 5
---

Ha llegado el momento. Vas a escribir un programa, ejecutarlo y ver el resultado en pantalla.

## Crear el fichero

En Visual Studio Code, con la carpeta `curso-python` abierta:

1. Pulsa el icono de **nuevo fichero** en la barra lateral, o ve a **Archivo → Nuevo archivo**.
2. Llámalo `hola.py`.

> [!aviso] La extensión .py no es opcional
>
> El `.py` del final es lo que le dice al editor que coloree Python y al intérprete que ese fichero es un programa. Si lo llamas `hola` a secas o `hola.py.txt`, nada funcionará. En Windows, si no ves las extensiones, actívalas en el explorador: **Vista → Extensiones de nombre de archivo**.

## Escribir el programa

Escribe exactamente esto, con todo y comillas:

```python title="hola.py"
print("Hola, mundo")
```

Fíjate en cuatro detalles mientras lo tecleas:

- `print` va en minúsculas. Python distingue mayúsculas de minúsculas: `Print` no es `print`.
- Los paréntesis se abren y se cierran.
- Las comillas también, y las dos deben ser del mismo tipo. Puedes usar `"` o `'`, pero no mezclarlas.
- La línea empieza pegada al margen izquierdo, sin ningún espacio delante.

## Ejecutarlo

Abre la terminal integrada con <kbd>Ctrl</kbd> + <kbd>Ñ</kbd> y escribe:

```bash
python hola.py
```

```salida
Hola, mundo
```

Si has visto ese texto: enhorabuena, acabas de programar. Si has visto un error, baja a la sección de problemas al final de la lección.

> [!consejo] El botón de ejecutar
>
> Arriba a la derecha del editor hay un triángulo de *play*. Hace exactamente lo mismo que escribir el comando: abre una terminal y lanza `python hola.py`. Úsalo si prefieres, pero conviene que sepas qué está pasando por debajo.

## Qué ha pasado exactamente

Cuando pulsaste <kbd>Intro</kbd> ocurrió esto, en orden:

1. La terminal buscó un programa llamado `python` y lo arrancó, pasándole el nombre `hola.py`.
2. El intérprete abrió tu fichero y leyó la primera línea.
3. Reconoció `print` como una **función** que ya viene incluida en Python, cuyo trabajo es escribir en pantalla.
4. Vio que entre los paréntesis le dabas un **argumento**: el texto `"Hola, mundo"`.
5. Escribió ese texto en la terminal y, al no quedar más líneas, terminó.

Tres palabras nuevas que vas a oír constantemente:

| Palabra | Qué significa |
| --- | --- |
| Función | Una orden con nombre que hace algo por ti. `print` es una función. |
| Llamar a una función | Ejecutarla, escribiendo su nombre seguido de paréntesis: `print()`. |
| Argumento | Lo que le pasas dentro de los paréntesis para que trabaje con ello. |

> [!nota] Las comillas marcan dónde empieza y acaba el texto
>
> `"Hola, mundo"` con comillas es un texto, lo que en programación se llama una *cadena*. Sin comillas, Python creería que `Hola` es el nombre de algo que debería existir en el programa, no lo encontraría y daría error. Las comillas no se imprimen: solo delimitan.

## Hacerlo un poco más tuyo

Amplía el fichero con dos líneas más:

```python title="hola.py"
print("Hola, mundo")
print("Me llamo Erwin y estoy aprendiendo Python")
print("2 + 2 =", 2 + 2)
```

```salida
Hola, mundo
Me llamo Erwin y estoy aprendiendo Python
2 + 2 = 4
```

Tres cosas nuevas aparecen aquí:

- **Las líneas se ejecutan en orden**, de arriba abajo. Siempre.
- `print` acepta **varios argumentos separados por comas** y los imprime seguidos, poniendo un espacio entre ellos.
- `2 + 2` **no lleva comillas**, así que Python no lo trata como texto sino como una operación: la calcula y escribe el resultado. Si hubieras puesto `"2 + 2"` habría impreso los caracteres tal cual.

Esa diferencia entre "texto" y "valor a calcular" es una de las ideas centrales del próximo módulo.

## Si te ha dado error

> [!error] SyntaxError: unterminated string literal
>
> Te falta una comilla de cierre. Mira la línea que te indica el error.

> [!error] NameError: name 'print' is not defined
>
> Has escrito `Print` o `PRINT` con mayúsculas. En Python, `print` va entero en minúsculas.

> [!error] can't open file 'hola.py': No such file or directory
>
> El fichero existe, pero la terminal no está en su carpeta. Ejecuta `ls` para ver dónde estás y `cd` para moverte hasta donde guardaste `hola.py`. Si usas la terminal integrada del editor, asegúrate de haber abierto la **carpeta** y no solo el fichero.

> [!error] IndentationError: unexpected indent
>
> Tu línea empieza con uno o más espacios. Bórralos: debe estar pegada al margen izquierdo.

> [!resumen] En resumen
>
> Un programa de Python es un fichero de texto con extensión `.py` que se ejecuta con `python nombre.py`. Las líneas se ejecutan en orden. `print()` es una función que escribe en pantalla lo que le pases entre paréntesis; con comillas lo trata como texto y sin comillas lo evalúa como una operación.

> [!ejercicio] Practica
>
> 1. Cambia el programa para que te salude a ti por tu nombre.
> 2. Añade una línea que imprima el resultado de `7 * 6` y otra que imprima el texto `7 * 6` tal cual, con comillas. Ejecuta y compara las dos salidas.
> 3. Provoca un error a propósito: quita un paréntesis y ejecuta. **Lee el mensaje completo** y fíjate en qué número de línea te señala. Luego arréglalo.
> 4. Crea un segundo fichero, `suma.py`, que imprima tres operaciones distintas, y ejecútalo.
