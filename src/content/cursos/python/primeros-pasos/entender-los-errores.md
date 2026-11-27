---
titulo: "Entender los errores"
resumen: "Cómo se lee un mensaje de error de Python, qué significan los tipos más frecuentes y qué hacer paso a paso cuando algo falla."
minutos: 12
orden: 7
---

Vas a ver muchísimos errores. No son un síntoma de que lo estés haciendo mal: son la forma que tiene Python de explicarte qué ha encontrado raro. Quien programa bien no es quien no comete errores, sino quien los lee rápido y los arregla.

## Anatomía de un error

Ejecuta este programa, que falla a propósito:

```python title="fallo.py"
numeros = [10, 20, 30]
print(numeros[5])
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/fallo.py", line 2, in <module>
    print(numeros[5])
          ~~~~~~~^^^
IndexError: list index out of range
```

Parece intimidante, pero son solo cuatro piezas:

1. **`Traceback (most recent call last)`.** Una etiqueta fija que anuncia "aquí viene el recorrido del error". Ignórala.
2. **`File ... line 2`.** Dónde ha ocurrido: el fichero y, sobre todo, **la línea**. Este es el dato que más rápido te lleva al problema.
3. **La línea de código y los símbolos `~~~^^^`.** Python te reproduce la línea culpable y te señala con acentos circunflejos el trozo exacto que ha fallado.
4. **La última línea: `IndexError: list index out of range`.** El tipo de error y su explicación. Es lo más importante del mensaje entero.

> [!nota] El texto exacto depende de tu versión
>
> Cada versión de Python afina los mensajes para que sean más claros, así que el tuyo puede no coincidir palabra por palabra con el que veas en el curso. El tipo de error, que es lo que va antes de los dos puntos, sí es estable. Los ejemplos de este curso están tomados de Python 3.13 y 3.14.

> [!consejo] Lee de abajo arriba
>
> La última línea te dice **qué** ha pasado y la parte de arriba te dice **dónde**. Con esas dos cosas resuelves la inmensa mayoría de los fallos. Cuando el traceback sea largo, empieza siempre por el final.

## Los errores que más vas a ver

### SyntaxError

Has escrito algo que no es Python válido. El intérprete ni siquiera llega a ejecutar el programa.

```python
print("hola"
```

```salida
SyntaxError: '(' was never closed
```

Causas típicas: un paréntesis o una comilla sin cerrar, dos puntos olvidados al final de un `if`, o un `=` donde hacía falta `==`. **Mira también la línea anterior a la que te señala**, porque un paréntesis abierto se arrastra hacia abajo.

### NameError

Usas un nombre que Python no conoce.

```python
mensaje = "hola"
print(mensage)
```

```salida
NameError: name 'mensage' is not defined. Did you mean: 'mensaje'?
```

Casi siempre es una errata o una mayúscula de más. Python moderno hasta te sugiere el nombre parecido.

### TypeError

Estás mezclando cosas que no se pueden mezclar.

```python
edad = 30
print("Tengo " + edad + " años")
```

```salida
TypeError: can only concatenate str (not "int") to str
```

Sumar un texto con un número no significa nada para Python. La solución la verás en el módulo de fundamentos: convertir el número a texto con `str(edad)`, o usar cadenas formateadas.

### IndentationError

Los espacios del principio de la línea no cuadran.

```python
if True:
print("dentro")
```

```salida
IndentationError: expected an indented block after 'if' statement on line 1
```

Después de un `:` la línea siguiente debe ir desplazada a la derecha. Mezclar tabuladores y espacios provoca el mismo error, aunque a la vista todo parezca alineado: configura tu editor para usar solo espacios.

### ValueError

El tipo de dato es correcto, pero el valor concreto no sirve.

```python
numero = int("hola")
```

```salida
ValueError: invalid literal for int() with base 10: 'hola'
```

`int()` acepta textos, pero solo si contienen un número. Este error aparece muchísimo cuando pides datos al usuario y escribe cualquier cosa.

### ModuleNotFoundError

Intentas usar algo que no está instalado.

```python
import django
```

```salida
ModuleNotFoundError: No module named 'django'
```

Se arregla instalándolo con `pip install django`. En los módulos de Django y APIs lo veremos junto con los entornos virtuales, que es donde esto se complica y se explica bien.

## El error silencioso

Hay un fallo peor que todos los anteriores: **el programa funciona pero da un resultado equivocado**. No hay traceback, no hay pista.

```python
total = 10 + 5
promedio = total / 3
print("El promedio es", promedio)
```

Se ejecuta sin quejarse, pero si los números eran dos y no tres, el resultado está mal. Para estos casos la herramienta es `print`: escribe valores intermedios en pantalla y comprueba si son los que esperabas.

```python
total = 10 + 5
print("total vale:", total)
promedio = total / 3
print("promedio vale:", promedio)
```

Se llama *depurar con prints*, es lo que hace todo el mundo y no es ninguna vergüenza.

## Qué hacer cuando te atascas

Sigue este orden, sin saltarte pasos:

1. **Lee la última línea del error entera.** No la mitad: entera.
2. **Ve a la línea que te indica** y mírala con calma, junto a la anterior.
3. **Comprueba lo obvio:** comillas y paréntesis cerrados, dos puntos al final, mayúsculas correctas, sangría consistente.
4. **Imprime los valores** de las variables implicadas para ver qué contienen de verdad.
5. **Reduce el programa** hasta el trozo mínimo que falla. A menudo, al hacerlo, encuentras el fallo tú solo.
6. **Busca el mensaje en internet**, copiando el tipo de error y el texto, pero quitando tus nombres de fichero y de variables.

> [!aviso] Nunca ignores un error
>
> Es tentador cambiar cosas al azar hasta que deje de fallar. No lo hagas: si arreglas algo sin entender por qué estaba roto, volverá a romperse mañana y no sabrás por dónde empezar.

> [!resumen] En resumen
>
> Un error de Python te dice dónde (`File`, `line`) y qué (la última línea). Léelo de abajo arriba. Los seis habituales son `SyntaxError` por escritura inválida, `NameError` por erratas, `TypeError` por mezclar tipos, `IndentationError` por sangría, `ValueError` por un valor imposible y `ModuleNotFoundError` por algo sin instalar. Para los fallos silenciosos, imprime valores intermedios.

> [!ejercicio] Practica
>
> Crea un fichero `errores.py` y provoca cada uno de estos errores a propósito, uno cada vez, ejecutando después de cada cambio. Antes de ejecutar, **intenta predecir qué tipo de error va a salir**:
>
> 1. Imprime una variable que no hayas creado.
> 2. Suma el texto `"5"` con el número `5`.
> 3. Escribe un `if edad > 18` y olvida los dos puntos del final.
> 4. Convierte con `int()` el texto `"tres"`.
> 5. Deja un paréntesis sin cerrar.
>
> Anota en cada caso qué número de línea te señaló Python y si coincidía con donde estaba realmente el fallo.
