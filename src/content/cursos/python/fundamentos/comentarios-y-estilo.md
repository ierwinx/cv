---
titulo: "Comentarios y estilo"
resumen: "Cómo escribir comentarios que sirvan de algo y las convenciones de PEP 8 que sigue toda la comunidad de Python."
minutos: 9
orden: 8
---

## Comentarios

Todo lo que va después de una almohadilla `#` lo ignora Python por completo. Sirve para dejar notas a quien lea el código, que muchas veces serás tú dentro de tres meses.

```python
# Esto es un comentario de línea completa
precio = 19.99      # y esto un comentario al final de una línea
```

Para comentar varias líneas, se pone una almohadilla en cada una. En los editores hay un atajo: selecciona las líneas y pulsa <kbd>Ctrl</kbd> + <kbd>7</kbd> o <kbd>Cmd</kbd> + <kbd>/</kbd>, según el teclado.

## Comentarios buenos y comentarios inútiles

El error clásico de quien empieza es explicar **qué** hace el código. Eso ya lo dice el código:

```python
# Mal: el comentario no aporta nada
contador = contador + 1     # suma uno al contador
precio_final = precio * 1.21    # multiplica el precio por 1.21
```

Lo que el código no puede contar es el **porqué**:

```python
# Bien: explica una decisión que no es evidente
precio_final = precio * 1.21    # IVA general español, vigente desde 2012

# Bien: avisa de algo no obvio
respuesta = respuesta.strip()   # el formulario web añade espacios al final

# Bien: deja constancia de algo pendiente
# TODO: validar que la fecha no sea futura antes de guardar
```

> [!consejo] Si necesitas un comentario largo, quizá el código esté mal
>
> Cuando un trozo de código exige tres líneas de explicación, suele ser señal de que hay que partirlo en funciones con nombres descriptivos. Un buen nombre sustituye a un comentario y no se queda desactualizado.

> [!aviso] Los comentarios mienten con el tiempo
>
> Cambias el código, olvidas actualizar el comentario, y ahora tienes una explicación falsa que es peor que no tener ninguna. Escribe pocos comentarios y mantenlos al día.

## Comentar para depurar

Un uso práctico: desactivar una línea temporalmente sin borrarla.

```python
resultado = calcular_total(pedido)
# print(f"{resultado=}")      # lo dejo por si vuelvo a necesitarlo
```

Solo recuerda limpiarlos antes de dar el trabajo por terminado.

## PEP 8: el estilo oficial

PEP 8 es el documento que define cómo se escribe Python "bonito". No es obligatorio, pero lo sigue prácticamente todo el mundo, y si te acostumbras desde hoy no tendrás que desaprender nada.

### Sangría: cuatro espacios

```python
if edad >= 18:
        print("Mayor de edad")      # exactamente cuatro espacios
```

Nunca tabuladores, y nunca mezcles ambos. Configura tu editor para que la tecla <kbd>Tab</kbd> inserte cuatro espacios; Visual Studio Code con la extensión de Python ya lo hace.

### Espacios alrededor de los operadores

```python
# Bien
total = precio * cantidad
if edad >= 18 and tiene_carnet:

# Mal
total=precio*cantidad
if edad>=18 and tiene_carnet:
```

Pero **no** dentro de los paréntesis ni antes de una coma:

```python
print("hola", nombre)        # bien
print( "hola" , nombre )     # mal
```

### Nombres

| Qué | Cómo | Ejemplo |
| --- | --- | --- |
| Variables y funciones | minúsculas con guion bajo | `precio_total`, `calcular_iva` |
| Constantes | mayúsculas con guion bajo | `IVA_GENERAL`, `MAX_INTENTOS` |
| Clases | cada palabra en mayúscula, sin guiones | `CuentaBancaria` |
| Uso interno | empezando por guion bajo | `_contador` |

### Líneas cortas

La recomendación clásica es no pasar de 79 caracteres; hoy mucha gente usa 88 o 100. El objetivo real es que quepan en pantalla sin desplazamiento horizontal. Para partir una línea larga, usa paréntesis:

```python
mensaje = (
    f"El pedido {numero} de {cliente} "
    f"por importe de {total:.2f} euros "
    f"se ha registrado correctamente."
)
```

### Líneas en blanco

Una línea en blanco separa bloques lógicos dentro de un mismo trozo de código. Dos separan funciones y clases. No dejes tres o cuatro seguidas.

```python
nombre = input("Nombre: ").strip()
edad = int(input("Edad: "))

precio_base = 100
descuento = 0.15
precio_final = precio_base * (1 - descuento)

print(f"{nombre}, pagas {precio_final:.2f} euros")
```

## Estructura recomendada de un fichero

```python title="calculadora.py"
"""Calculadora de presupuestos para el curso de Python.

Pide los datos de un producto y muestra el desglose con IVA.
"""

import math

IVA = 0.21
DESCUENTO_MAXIMO = 0.5

nombre = input("Producto: ").strip()
precio = float(input("Precio sin IVA: "))

total = precio * (1 + IVA)

print(f"{nombre}: {total:.2f} euros con IVA")
```

El texto entre triples comillas del principio se llama **docstring** y explica para qué sirve el fichero entero. A diferencia de un comentario, Python lo conserva y se puede consultar con `help()`. Lo veremos otra vez, y en profundidad, en la lección de funciones.

El orden habitual es: docstring, importaciones, constantes y después el código.

> [!nota] Herramientas que lo hacen por ti
>
> Existen programas que formatean tu código según PEP 8 automáticamente. El más usado es **Black**, que se instala con `pip install black` y se ejecuta con `black fichero.py`. No hace falta que lo uses ahora, pero es bueno saber que la discusión sobre estilo está resuelta y no merece la pena pelearse con ella.

> [!resumen] En resumen
>
> Los comentarios empiezan por `#` y deben explicar el porqué, no el qué. PEP 8 es el estilo que sigue toda la comunidad: cuatro espacios de sangría, espacios alrededor de los operadores, nombres en minúsculas con guion bajo, constantes en mayúsculas y líneas que quepan en pantalla. Un docstring al principio del fichero cuenta para qué sirve.

> [!ejercicio] Practica
>
> 1. Coge el programa del IMC que escribiste en la lección de entrada del usuario y reescríbelo siguiendo PEP 8: añade un docstring al principio, saca el valor 40 del ancho a una constante en mayúsculas, separa los bloques con líneas en blanco y revisa los espacios alrededor de los operadores.
> 2. Añade dos comentarios: uno que explique **por qué** usas ese ancho y otro con un `TODO` de algo que te gustaría mejorar.
> 3. Busca en tus ficheros anteriores un comentario que explique el "qué" y bórralo o reescríbelo para que explique el "por qué".
> 4. Si te apetece, instala Black con `pip install black`, ejecútalo sobre uno de tus ficheros y mira qué te ha cambiado.
