---
titulo: "Argumentos variables: *args y **kwargs"
resumen: "Cómo escribir funciones que aceptan un número indeterminado de argumentos y cómo desempaquetar listas y diccionarios al llamar."
minutos: 13
orden: 36
---

`print` acepta un argumento, o cinco, o veinte. `max` funciona con dos números y con diez. Ninguna de las dos te obliga a decir cuántos vas a pasar antes de empezar.

Eso no es magia interna del lenguaje: es una característica que puedes usar en tus propias funciones con un asterisco.

## `*args`: un número indeterminado de posicionales

Pon un asterisco delante de un parámetro y ese parámetro recogerá **todos** los argumentos posicionales sobrantes, empaquetados en una tupla:

```python
def sumar_gastos(*importes):
        print(importes)
    return sum(importes)


print(sumar_gastos(12.5, 30, 4.99))
print(sumar_gastos())
```

```salida
(12.5, 30, 4.99)
47.49
()
0
```

Dentro de la función, `importes` es una tupla normal y corriente: puedes recorrerla con un `for`, medirla con `len`, pasarla a `sum` o rebanarla. Si no se pasa ningún argumento, es una tupla vacía, no un error.

Un parámetro con asterisco puede convivir con parámetros normales, siempre que estos vayan delante:

```python
def calcular_factura(cliente, *importes):
        total = sum(importes)
    print(f"{cliente}: {len(importes)} líneas, total {total:.2f} euros")


calcular_factura("Ana", 19.99, 49.50, 7.25)
calcular_factura("Luis")
```

```salida
Ana: 3 líneas, total 76.74 euros
Luis: 0 líneas, total 0.00 euros
```

> [!nota] `args` es solo una costumbre
>
> Lo que tiene significado para Python es el **asterisco**, no la palabra. `*args`, `*importes` o `*numeros` funcionan exactamente igual. La comunidad usa `args` cuando el contenido es genérico y no hay nada mejor que decir, pero si puedes ponerle un nombre descriptivo como `*importes`, hazlo: se lee mucho mejor.

## `**kwargs`: un número indeterminado por nombre

Con dos asteriscos, el parámetro recoge todos los argumentos **por nombre** que no encajen en ningún otro sitio, y los guarda en un diccionario donde la clave es el nombre:

```python
def describir_producto(nombre, **caracteristicas):
        print(f"Producto: {nombre}")
    for clave, valor in caracteristicas.items():
                print(f"  {clave}: {valor}")


describir_producto("Camiseta", talla="M", color="azul", algodon=True)
```

```salida
Producto: Camiseta
  talla: M
  color: azul
  algodon: True
```

Igual que antes, `kwargs` es una convención; lo que importa son los dos asteriscos. El nombre viene de *keyword arguments*, argumentos por palabra clave.

Las claves del diccionario son cadenas, así que dentro de la función se consultan como en cualquier diccionario: `caracteristicas["talla"]` o, más seguro, `caracteristicas.get("talla", "sin especificar")`.

## Los dos a la vez

Se pueden combinar, y el orden en la firma es fijo: primero los parámetros normales, después `*args`, después `**kwargs`.

```python
def registrar(*args, **kwargs):
        print("Posicionales:", args)
    print("Por nombre:  ", kwargs)


registrar(1, 2, 3, ciudad="Bilbao", urgente=True)
registrar()
```

```salida
Posicionales: (1, 2, 3)
Por nombre:   {'ciudad': 'Bilbao', 'urgente': True}
Posicionales: ()
Por nombre:   {}
```

Una función con `(*args, **kwargs)` acepta literalmente cualquier llamada sin fallar nunca por número de argumentos.

| En la firma | Recoge | Tipo dentro de la función |
| --- | --- | --- |
| `parametro` | Un argumento, por posición o por nombre | El valor que sea |
| `parametro=valor` | Lo mismo, pero opcional | El valor que sea |
| `*args` | Todos los posicionales sobrantes | Tupla |
| `**kwargs` | Todos los que van por nombre y sobran | Diccionario |

## Desempaquetar al llamar

El asterisco tiene un segundo uso, en el otro lado: en la **llamada**. Ahí no empaqueta, sino que hace lo contrario, repartir el contenido de una colección entre los parámetros.

```python
def mostrar_linea(producto, cantidad, precio):
        print(f"{cantidad} x {producto} = {cantidad * precio:.2f} euros")


datos = ["Camiseta", 2, 19.99]
mostrar_linea(*datos)

pedido = {"producto": "Zapatillas", "cantidad": 1, "precio": 49.5}
mostrar_linea(**pedido)
```

```salida
2 x Camiseta = 39.98 euros
1 x Zapatillas = 49.50 euros
```

`mostrar_linea(*datos)` equivale a escribir `mostrar_linea("Camiseta", 2, 19.99)`, y `mostrar_linea(**pedido)` equivale a `mostrar_linea(producto="Zapatillas", cantidad=1, precio=49.5)`. Con el diccionario, **las claves tienen que coincidir exactamente con los nombres de los parámetros**, o saltará el `TypeError` de argumento inesperado que ya conoces.

Esto es especialmente útil con las listas de diccionarios que viste en su lección, donde cada diccionario representa un registro con las mismas claves.

> [!aviso] Un asterisco de menos y pasas la lista entera
>
> Es el despiste más habitual con `*args`. Si tienes los datos en una lista y la pasas sin desempaquetar, la función recibe **un** argumento que resulta ser una lista, no varios argumentos.
>
> ```python
> def sumar_gastos(*importes):
>         return sum(importes)
>
>
> gastos_del_mes = [12.5, 30, 4.99]
> print(sumar_gastos(gastos_del_mes))
> ```
>
> ```salida
> TypeError: unsupported operand type(s) for +: 'int' and 'list'
> ```
>
> `importes` vale `([12.5, 30, 4.99],)`, una tupla con una lista dentro, y `sum` no sabe sumar listas. La solución es `sumar_gastos(*gastos_del_mes)`.

## Parámetros que solo se pueden pasar por nombre

Hay un tercer uso del asterisco: si pones uno **suelto** en la firma, todo lo que venga detrás solo se podrá pasar por nombre.

```python
def enviar_paquete(ciudad, *, urgente=False, asegurado=False):
        print(f"{ciudad} | urgente={urgente} | asegurado={asegurado}")


enviar_paquete("Sevilla", urgente=True)
enviar_paquete("Sevilla", True)
```

```salida
Sevilla | urgente=True | asegurado=False
Traceback (most recent call last):
  File "/Users/erwin/curso-python/envios.py", line 6, in <module>
    enviar_paquete("Sevilla", True)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^
TypeError: enviar_paquete() takes 1 positional argument but 2 were given
```

> [!error] TypeError: enviar\_paquete() takes 1 positional argument but 2 were given
>
> La función tiene un `*` suelto en su firma, así que los parámetros que van detrás son de uso obligatorio por nombre. Llama con `enviar_paquete("Sevilla", urgente=True)`.

Parece una restricción molesta, pero es una decisión de diseño muy sensata: **te obliga a que las llamadas a tu función sean legibles**. Con esa firma, nadie podrá escribir en tu código `enviar_paquete("Sevilla", True, False)`, que no se entiende sin mirar la definición. Es la técnica que usa la biblioteca estándar en funciones con muchas opciones, y es el motivo por el que `sorted(lista, reverse=True)` no se puede escribir `sorted(lista, True)`.

## Un ejemplo completo

Juntamos todo en algo que podrías tener en un programa de verdad: una función que compone un mensaje con un número indeterminado de líneas y unas cuantas opciones de formato.

```python
def componer_mensaje(destinatario, *lineas, firma="El equipo", mayusculas=False):
        cuerpo = "\n".join(lineas)
    mensaje = f"Hola, {destinatario}:\n{cuerpo}\n\n{firma}"
    if mayusculas:
                mensaje = mensaje.upper()
    return mensaje


print(componer_mensaje(
    "Ana",
    "Tu pedido ya está preparado.",
    "Puedes recogerlo a partir del martes.",
    firma="Tienda La Esquina",
))
```

```salida
Hola, Ana:
Tu pedido ya está preparado.
Puedes recogerlo a partir del martes.

Tienda La Esquina
```

Fíjate en un detalle importante de esa firma: como `*lineas` se come todos los posicionales, `firma` y `mayusculas` **solo** se pueden pasar por nombre, aunque no haya ningún `*` suelto. El `*lineas` ya cumple esa función.

> [!resumen] En resumen
>
> Un asterisco delante de un parámetro recoge todos los argumentos posicionales sobrantes en una tupla, y dos asteriscos recogen los que van por nombre en un diccionario. Los nombres `args` y `kwargs` son solo costumbre: lo que cuenta son los asteriscos. En la firma el orden es parámetros normales, `*args` y `**kwargs`. En la llamada, los mismos asteriscos hacen lo contrario, repartir una lista o un diccionario entre los parámetros, y olvidarlos es el fallo más común. Un `*` suelto en la firma obliga a que los parámetros siguientes se pasen por nombre, lo que hace las llamadas mucho más legibles.

> [!ejercicio] Practica
>
> Crea un fichero `36-variables.py` y resuelve:
>
> 1. Escribe `calcular_media(*notas)` que devuelva la media, y que devuelva `0` si no le pasan ninguna nota.
> 2. Escribe `unir_rutas(*partes)` que junte los trozos con `/` entre ellos y lo devuelva como texto. Pruébala con dos, tres y cinco trozos.
> 3. Escribe `crear_usuario(nombre, **datos)` que imprima el nombre y después cada dato extra en una línea con el formato `clave: valor`.
> 4. Escribe una función con tres parámetros y llámala desempaquetando primero una lista con `*` y después un diccionario con `**`.
> 5. Pasa una lista completa a una función `*args` sin el asterisco y provoca el error. Después arréglalo.
> 6. Escribe `imprimir_tabla(titulo, *filas, ancho=30, mayusculas=False)` que imprima el título centrado, una línea de guiones y cada fila debajo. Comprueba que `ancho` no se puede pasar por posición.
