---
titulo: "Variables: guardar datos"
resumen: "Qué es una variable, cómo se crea, cómo se cambia su valor y qué reglas y costumbres seguir al ponerles nombre."
minutos: 10
orden: 1
---

## Para qué sirven

Un programa sin variables solo puede hacer lo que esté escrito literalmente en el código. Con variables puede **guardar un dato, darle un nombre y volver a usarlo** tantas veces como haga falta.

```python
precio = 19.99
print(precio)
print(precio * 3)
```

```salida
19.99
59.97
```

Sin la variable tendrías que repetir `19.99` en cada sitio, y el día que cambie el precio tendrías que acordarte de cambiarlo en todos. Con la variable lo cambias en un solo sitio.

## Cómo se crea

Nombre, signo igual, valor. No hay que declarar nada ni decir de qué tipo es:

```python
nombre = "Erwin"
edad = 34
altura = 1.78
activo = True
```

El signo `=` se llama **asignación**, y se lee de derecha a izquierda: "calcula lo de la derecha y guárdalo en el nombre de la izquierda".

> [!aviso] El = no significa "es igual a"
>
> En matemáticas `x = x + 1` es una contradicción. En programación es una instrucción perfectamente normal: *coge el valor actual de `x`, súmale 1 y vuelve a guardarlo en `x`*. Comparar dos valores se hace con `==`, con dos signos, y lo verás en la lección de comparaciones.

## Cambiar el valor

Una variable, como su nombre indica, varía. Al asignarle un valor nuevo, el anterior se pierde:

```python
contador = 0
print(contador)

contador = 5
print(contador)

contador = contador + 1
print(contador)
```

```salida
0
5
6
```

La última línea merece atención: primero Python calcula `contador + 1`, que da 6, y después guarda ese 6 en `contador`. Es tan frecuente que existe un atajo:

```python
contador += 1   # exactamente lo mismo que contador = contador + 1
```

Los mismos atajos existen para las demás operaciones: `-=`, `*=`, `/=`.

## Una variable puede cambiar de tipo

Python no te ata: la misma variable puede guardar hoy un número y luego un texto.

```python
dato = 42
print(dato)

dato = "cuarenta y dos"
print(dato)
```

Es cómodo, pero **no lo hagas a propósito**. Una variable que a veces es número y a veces texto es una fuente segura de errores. Si el contenido cambia de naturaleza, usa otro nombre.

## Reglas para los nombres

Estas son obligatorias; si las incumples, el programa no arranca:

- Solo letras, números y guion bajo.
- **No puede empezar por un número.** `1precio` es inválido, `precio1` es válido.
- No puede llevar espacios ni guiones normales. `precio total` y `precio-total` no funcionan.
- Distingue mayúsculas: `edad`, `Edad` y `EDAD` son tres variables distintas.
- No puede ser una palabra reservada del lenguaje, como `if`, `for`, `class`, `def`, `True` o `import`.

```python
edad_usuario = 30      # válido
_temporal = "algo"     # válido
precio2 = 9.99         # válido

2precio = 5            # SyntaxError
precio total = 5       # SyntaxError
class = "Primera"      # SyntaxError, class es una palabra reservada
```

## Costumbres para los nombres

Estas no son obligatorias, pero las sigue todo el mundo y hacen tu código legible:

| Costumbre | Bien | Mal |
| --- | --- | --- |
| Todo en minúsculas, palabras separadas por guion bajo | `precio_total` | `PrecioTotal`, `preciototal` |
| Que diga qué contiene | `edad_usuario` | `x`, `dato`, `cosa` |
| En singular si es un dato, en plural si son varios | `alumno`, `alumnos` | `alumnoLista` |
| En español o en inglés, pero no mezclado | `total_precio` o `total_price` | `total_price_final_es` |

> [!consejo] El nombre es documentación gratis
>
> Comparemos: `d = 86400` no dice nada. `segundos_por_dia = 86400` se explica solo y no necesita comentario. Escribir nombres largos cuesta dos segundos y ahorra horas de confusión, tuya y de quien lea tu código.

> [!nota] Sobre las constantes
>
> Cuando un valor no va a cambiar nunca en todo el programa, la costumbre es escribirlo **todo en mayúsculas**: `IVA = 0.21`, `MAXIMO_INTENTOS = 3`. Python no lo impide técnicamente, es solo una señal para quien lee: "no toques esto".

## Varias asignaciones en una línea

Python permite dos atajos que verás a menudo:

```python
x, y = 10, 20            # x vale 10 e y vale 20
a = b = 0                # las dos valen 0
x, y = y, x              # intercambia los valores: x vale 20 e y vale 10
```

Ese último es un truco muy útil de Python: en otros lenguajes intercambiar dos valores necesita una variable auxiliar.

## Errores frecuentes

> [!error] NameError: name 'x' is not defined
>
> Estás usando una variable antes de crearla, o has escrito mal su nombre. **El orden importa**: la asignación tiene que estar en una línea anterior a su uso.
>
> ```python
> print(total)     # NameError: total todavía no existe
> total = 100
> ```

> [!error] Le he cambiado el valor y sigue saliendo el viejo
>
> Recuerda que la asignación ocurre en el momento en que se ejecuta esa línea. Si imprimes antes de reasignar, verás el valor antiguo. Repasa el orden de tus líneas.

> [!resumen] En resumen
>
> Una variable es un nombre que apunta a un dato. Se crea con `nombre = valor` y se puede reasignar cuantas veces quieras. Los nombres van en minúsculas con guiones bajos, no pueden empezar por número ni ser palabras reservadas, y deben decir qué contienen. El `=` asigna; comparar se hace con `==`.

> [!ejercicio] Practica
>
> Crea un fichero `01-variables.py` y resuelve:
>
> 1. Guarda tu nombre, tu edad y tu ciudad en tres variables e imprímelas en tres líneas.
> 2. Crea una variable `saldo` con valor 1000. Réstale 250 usando el atajo `-=` e imprime el resultado.
> 3. Crea dos variables, `primera` y `segunda`, con dos números cualesquiera. Intercambia sus valores en una sola línea e imprímelas para comprobarlo.
> 4. Calcula cuántos segundos tiene una semana usando variables con nombres descriptivos (`segundos_por_minuto`, `minutos_por_hora`...) en vez de escribir el número final directamente.
> 5. Intenta crear una variable llamada `for`. Lee el error que sale y comprueba que lo entiendes.
