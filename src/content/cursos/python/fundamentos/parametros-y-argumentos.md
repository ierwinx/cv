---
titulo: "Parámetros y argumentos"
resumen: "Cómo pasarle datos a una función, la diferencia entre parámetro y argumento, y cuándo conviene nombrarlos al llamar."
minutos: 12
orden: 33
---

La función `imprimir_cabecera()` de la lección anterior tiene un defecto: siempre imprime exactamente lo mismo. Sirve para una tienda y para nada más.

Una función se vuelve útil de verdad cuando **recibe datos de fuera** y trabaja con ellos. Eso es lo que hay dentro de los paréntesis, que hasta ahora estaban vacíos.

## Un hueco para el dato

Escribe un nombre dentro de los paréntesis de la definición y ese nombre pasa a estar disponible dentro de la función como si fuera una variable:

```python
def saludar(nombre):
        print(f"Hola, {nombre}. Bienvenido a la tienda.")


saludar("Ana")
saludar("Luis")
```

```salida
Hola, Ana. Bienvenido a la tienda.
Hola, Luis. Bienvenido a la tienda.
```

La misma función, dos resultados distintos. En la primera llamada `nombre` vale `"Ana"`; en la segunda vale `"Luis"`. Ese hueco es lo que hace que una función sea reutilizable en lugar de un simple atajo.

## Parámetro no es lo mismo que argumento

Las dos palabras se confunden constantemente, incluso entre profesionales, pero la distinción es sencilla y vale la pena tenerla clara porque los mensajes de error usan los términos con precisión:

| Término | Dónde aparece | En el ejemplo |
| --- | --- | --- |
| **Parámetro** | En la definición, entre los paréntesis del `def` | `nombre` |
| **Argumento** | En la llamada, el valor concreto que pasas | `"Ana"`, `"Luis"` |

Dicho de otra forma: el parámetro es la etiqueta del hueco y el argumento es lo que metes en él. El parámetro es siempre el mismo; el argumento cambia en cada llamada.

## Varios parámetros

Se separan por comas, tanto al definir como al llamar:

```python
def mostrar_linea_pedido(producto, cantidad, precio):
        total = cantidad * precio
    print(f"{producto:<12} {cantidad:>3} x {precio:>6.2f} = {total:>7.2f}")


mostrar_linea_pedido("Camiseta", 2, 19.99)
mostrar_linea_pedido("Zapatillas", 1, 49.50)
```

```salida
Camiseta       2 x  19.99 =   39.98
Zapatillas     1 x  49.50 =   49.50
```

## El orden posicional

Por defecto, los argumentos se emparejan con los parámetros **por su posición**: el primero con el primero, el segundo con el segundo. Python no mira los tipos ni intenta adivinar nada.

Si te equivocas de orden, no te avisa de inmediato. Te deja seguir hasta que algo revienta:

```python
mostrar_linea_pedido(2, "Camiseta", 19.99)
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/pedido.py", line 6, in <module>
    mostrar_linea_pedido(2, "Camiseta", 19.99)
    ~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/erwin/curso-python/pedido.py", line 2, in mostrar_linea_pedido
    total = cantidad * precio
            ~~~~~~~~~^~~~~~~~
TypeError: can't multiply sequence by non-int of type 'float'
```

Mira bien ese traceback: tiene **dos** bloques `File`. El de abajo señala la línea que ha petado, dentro de la función. El de arriba señala la llamada que provocó el problema. Cuando trabajas con funciones, el traceback se convierte en el recorrido completo desde donde empezó todo hasta donde acabó mal, y esa es justamente su utilidad.

> [!error] TypeError: can't multiply sequence by non-int of type 'float'
>
> `cantidad` ha recibido el texto `"Camiseta"` y `producto` ha recibido el número `2`, porque los pasaste en el orden equivocado. Multiplicar un texto por un decimal no significa nada. Revisa el orden de los argumentos en la llamada, comparándolo con la línea del `def`.

## Pasar argumentos por nombre

Puedes decir explícitamente a qué parámetro va cada valor, escribiendo `parametro=valor` en la llamada. Así el orden deja de importar:

```python
def registrar_envio(ciudad, urgente, asegurado):
        print(f"Envío a {ciudad}. Urgente: {urgente}. Asegurado: {asegurado}.")


registrar_envio("Valencia", True, False)
registrar_envio(ciudad="Valencia", urgente=True, asegurado=False)
registrar_envio(asegurado=False, ciudad="Valencia", urgente=True)
```

```salida
Envío a Valencia. Urgente: True. Asegurado: False.
Envío a Valencia. Urgente: True. Asegurado: False.
Envío a Valencia. Urgente: True. Asegurado: False.
```

Las tres llamadas hacen lo mismo, pero no se leen igual. La primera, `registrar_envio("Valencia", True, False)`, obliga a quien la lee a ir a buscar la definición para saber qué significan ese `True` y ese `False`. La segunda se explica sola.

> [!consejo] Nombra los booleanos y los números sueltos
>
> La regla práctica es esta: si un argumento es un `True`, un `False` o un número sin unidades, pásalo por nombre. `crear_copia(borrar_original=False)` se entiende; `crear_copia(False)` hay que descifrarlo. Con textos descriptivos como `"Valencia"` la posición suele bastar.

## Mezclar posicionales y por nombre

Se pueden combinar, con una regla estricta: **los posicionales van siempre primero**. En cuanto usas uno por nombre, todos los siguientes tienen que ir también por nombre.

```python
registrar_envio("Valencia", asegurado=False, urgente=True)    # válido
```

Al revés, ni siquiera llega a ejecutarse:

```python
registrar_envio(ciudad="Valencia", True, False)
```

```salida
  File "/Users/erwin/curso-python/envios.py", line 5
    registrar_envio(ciudad="Valencia", True, False)
                                                  ^
SyntaxError: positional argument follows keyword argument
```

> [!error] SyntaxError: positional argument follows keyword argument
>
> Has puesto un argumento por posición después de uno por nombre. Es un error de sintaxis, así que el programa entero no arranca, ni siquiera las líneas anteriores. Solución: mueve todos los posicionales al principio de la llamada, o pásalos todos por nombre.

El motivo de la regla es fácil de ver: si el primer hueco ya lo has ocupado por nombre, ¿qué posición le tocaría al siguiente argumento suelto? Python prefiere no adivinar.

## Cuando faltan o sobran argumentos

Aquí Python sí es tajante y el mensaje te dice exactamente qué pasa. Partimos de esta función:

```python
def calcular_total(precio, cantidad):
        print(precio * cantidad)
```

> [!error] TypeError: calcular\_total() missing 1 required positional argument: 'cantidad'
>
> Falta un argumento. El mensaje te da su nombre entre comillas, así que sabes cuál. Ocurre al llamar `calcular_total(19.99)`.
>
> Si faltan varios, te los enumera: `missing 2 required positional arguments: 'precio' and 'cantidad'`.

> [!error] TypeError: calcular\_total() takes 2 positional arguments but 3 were given
>
> Sobra un argumento. Ocurre al llamar `calcular_total(19.99, 2, 0.21)`. Cuenta los parámetros del `def` y los argumentos de la llamada: tienen que coincidir.

> [!error] TypeError: calcular\_total() got an unexpected keyword argument 'unidades'
>
> Has pasado un argumento por nombre, pero ese nombre no existe en la definición. Ocurre al llamar `calcular_total(precio=19.99, unidades=2)` cuando el parámetro se llama `cantidad`. Casi siempre es una errata o un recuerdo equivocado del nombre; ve a la línea del `def` y cópialo tal cual.

> [!nota] El nombre del parámetro es parte del contrato
>
> Este último error tiene una consecuencia importante: si cambias el nombre de un parámetro, rompes todas las llamadas que lo pasaban por nombre. Los nombres de los parámetros no son un detalle privado de la función, son parte de cómo se usa desde fuera. Elígelos bien a la primera.

## Qué le puedes pasar a una función

Cualquier cosa que sea un valor: números, textos, booleanos, listas, tuplas, diccionarios, e incluso el resultado de otra función.

```python
def contar_palabras(frase):
        print(len(frase.split()))


def resumir_notas(notas):
        print(f"{len(notas)} notas, media {sum(notas) / len(notas):.2f}")


contar_palabras("El pedido llega el martes por la mañana")
resumir_notas([7, 9, 5, 8])
```

```salida
8
4 notas, media 7.25
```

> [!resumen] En resumen
>
> Los parámetros son los nombres que aparecen entre los paréntesis del `def` y los argumentos son los valores que pasas al llamar. Por defecto se emparejan por posición, así que el orden importa y equivocarse suele acabar en un `TypeError` dentro de la función. Pasarlos por nombre con `parametro=valor` elimina la dependencia del orden y hace la llamada mucho más legible, sobre todo con booleanos y números sueltos; eso sí, los posicionales tienen que ir siempre delante. Si faltan, sobran o el nombre no existe, Python lo dice con un `TypeError` muy explícito.

> [!ejercicio] Practica
>
> Crea un fichero `33-parametros.py` y resuelve:
>
> 1. Escribe `presentar(nombre, ciudad, profesion)` que imprima una frase con los tres datos. Llámala tres veces con personas distintas.
> 2. Escribe `calcular_area_rectangulo(base, altura)` que imprima el área. Llámala una vez por posición y otra por nombre, con los parámetros en orden inverso.
> 3. Escribe `imprimir_recuadro(texto, ancho, caracter)` que imprima el texto centrado entre dos líneas hechas con ese carácter repetido `ancho` veces. Prueba con `caracter="*"` y con `caracter="."`.
> 4. Provoca los tres `TypeError` de la lección con una función tuya: uno por faltar un argumento, otro por pasar uno de más y otro por inventarte el nombre de un parámetro. Anota el mensaje de cada uno.
> 5. Escribe `mostrar_ficha(titulo, autor, año, disponible)` y llámala pasando los dos últimos por nombre. Compara cómo se lee frente a pasarlos por posición.
