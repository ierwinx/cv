---
titulo: "El ámbito de las variables"
resumen: "Qué variables ve una función y cuáles no, por qué global casi nunca es la respuesta y qué pasa con listas y diccionarios."
minutos: 13
orden: 37
---

Una función no es solo un trozo de código con nombre: es también un espacio aislado. Las variables que nacen dentro de ella no existen fuera, y eso, que al principio parece un estorbo, es justo lo que hace que las funciones sean fiables.

Si no fuera así, una variable llamada `total` dentro de una función pisaría la `total` del programa principal, y en un fichero de quinientas líneas no habría forma de saber quién ha cambiado qué. El **ámbito**, o *scope*, es la regla que decide qué nombre se ve desde dónde.

## Lo que nace dentro, muere dentro

```python
def calcular_factura():
        subtotal = 100
    print(f"Dentro: {subtotal}")


calcular_factura()
print(f"Fuera: {subtotal}")
```

```salida
Dentro: 100
Traceback (most recent call last):
  File "/Users/erwin/curso-python/factura.py", line 7, in <module>
    print(f"Fuera: {subtotal}")
                    ^^^^^^^^
NameError: name 'subtotal' is not defined
```

`subtotal` es una **variable local**: existe desde que se crea hasta que la función termina, y entonces desaparece. Los parámetros funcionan igual, también son variables locales.

> [!error] NameError: name 'subtotal' is not defined
>
> Estás usando fuera de una función una variable que solo existe dentro de ella. No hay forma de "sacarla": si necesitas ese valor fuera, la función tiene que devolverlo con `return` y tú tienes que guardarlo.
>
> ```python
> def calcular_factura():
>         subtotal = 100
>     return subtotal
>
>
> subtotal = calcular_factura()
> print(subtotal)
> ```

Como las locales desaparecen al terminar, cada llamada empieza de cero. Dos llamadas a la misma función no comparten nada, y por eso puedes llamarla mil veces sin que la anterior contamine a la siguiente.

## Leer una variable de fuera sí se puede

Las variables creadas en el nivel principal del fichero son **globales**, y desde dentro de una función se pueden leer sin hacer nada especial:

```python
IVA = 0.21


def calcular_precio_final(precio):
        return precio * (1 + IVA)


print(calcular_precio_final(100))
```

```salida
121.0
```

Cuando Python encuentra el nombre `IVA` dentro de la función, primero lo busca entre las locales; como no está, sale a buscarlo fuera, y lo encuentra.

Este es prácticamente el único uso razonable de una variable global: **una constante**, escrita en mayúsculas, que se define una vez al principio del fichero y que nadie modifica. Configuración, tipos de IVA, rutas, límites. Para todo lo demás, sigue leyendo.

## Reasignarla es otra historia

Intentar cambiar el valor de una global desde dentro de una función produce uno de los errores más desconcertantes de Python:

```python
contador_de_ventas = 0


def registrar_venta():
        contador_de_ventas = contador_de_ventas + 1
    print(contador_de_ventas)


registrar_venta()
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/ventas.py", line 9, in <module>
    registrar_venta()
    ~~~~~~~~~~~~~~~^^
  File "/Users/erwin/curso-python/ventas.py", line 5, in registrar_venta
    contador_de_ventas = contador_de_ventas + 1
                         ^^^^^^^^^^^^^^^^^^
UnboundLocalError: cannot access local variable 'contador_de_ventas' where it is not associated with a value
```

> [!error] UnboundLocalError: cannot access local variable 'contador\_de\_ventas' where it is not associated with a value
>
> Dentro de la función le asignas un valor a ese nombre, así que Python decide, **al leer la función entera antes de ejecutarla**, que es una variable local. Y entonces la línea intenta leer una local que todavía no tiene valor.
>
> Lo desconcertante es que la variable global existe y tiene valor. Da igual: la decisión de si un nombre es local o global se toma mirando la función completa, no línea a línea. Basta una asignación en cualquier punto del cuerpo para que el nombre sea local en todo el cuerpo.

Si borras la asignación y solo lees, funciona. Si asignas, es local. No hay término medio automático.

## `global`, y por qué casi nunca

Existe una palabra reservada para decirle a Python "no, este nombre no es local, es el de fuera":

```python
contador_de_ventas = 0


def registrar_venta():
        global contador_de_ventas
    contador_de_ventas += 1


registrar_venta()
registrar_venta()
print(contador_de_ventas)
```

```salida
2
```

Funciona. Y aun así, la recomendación es no usarlo.

> [!aviso] `global` destruye la mejor propiedad de las funciones
>
> Una función que solo recibe argumentos y devuelve un resultado se puede entender leyéndola sola, se puede probar por separado y da siempre lo mismo con los mismos datos. Una función que modifica variables globales no: para saber qué hace tienes que conocer el estado de todo el programa, y para saber por qué una global vale lo que vale tienes que buscar todas las funciones que la tocan.
>
> En un fichero de cuarenta líneas parece cómodo. En uno de cuatrocientas es donde viven los fallos que nadie consigue reproducir.

## Qué hacer en su lugar

Casi siempre lo mismo: **lo que la función necesita, que entre por parámetro; lo que produce, que salga por `return`**.

```python
def registrar_venta(contador):
        return contador + 1


contador_de_ventas = 0
contador_de_ventas = registrar_venta(contador_de_ventas)
contador_de_ventas = registrar_venta(contador_de_ventas)
print(contador_de_ventas)
```

```salida
2
```

Es una línea más larga en la llamada, pero ahora `registrar_venta` no depende de nada externo. Puedes leerla aislada y sabes exactamente qué hace.

## El matiz importante: los objetos mutables

Aquí es donde mucha gente se hace un lío, porque parece que contradice todo lo anterior. Si pasas una lista o un diccionario a una función, **la función sí puede modificarlos, y el cambio se ve fuera**:

```python
def añadir_producto(carrito, producto):
        carrito.append(producto)


compra = ["pan", "leche"]
añadir_producto(compra, "huevos")
print(compra)
```

```salida
['pan', 'leche', 'huevos']
```

No hay ninguna contradicción. Lo que se pasa a la función no es una copia de la lista, es **el mismo objeto**. El parámetro `carrito` y la variable `compra` son dos nombres apuntando a la misma lista en memoria, exactamente igual que cuando hacías `b = a` con listas y descubriste que modificar una afectaba a la otra. Al llamar a `append`, se modifica ese objeto compartido.

Con los diccionarios pasa lo mismo:

```python
def anotar_stock(inventario, producto, unidades):
        inventario[producto] = unidades


almacen = {"camiseta": 12}
anotar_stock(almacen, "zapatillas", 4)
print(almacen)
```

```salida
{'camiseta': 12, 'zapatillas': 4}
```

Con un número, un texto o una tupla no ocurre, porque son inmutables: no hay ninguna operación que los cambie por dentro.

```python
def subir_precio(precio):
        precio = precio + 10
    return precio


precio_base = 100
subir_precio(precio_base)
print(precio_base)

precio_base = subir_precio(precio_base)
print(precio_base)
```

```salida
100
110
```

La primera llamada no cambia nada fuera: dentro se crea un valor nuevo y se guarda en el nombre local `precio`. Solo cuando recogemos el `return` y reasignamos, cambia la variable de fuera.

> [!nota] Modificar no es reasignar
>
> Esta distinción explica el último caso que suele sorprender. `carrito.append(...)` **modifica** el objeto compartido y se ve fuera. Pero `carrito = []` dentro de la función solo apunta el nombre local a una lista nueva y no toca la de fuera para nada:
>
> ```python
> def vaciar(carrito):
>         carrito = []
>
>
> compra = ["pan", "leche"]
> vaciar(compra)
> print(compra)
> ```
>
> ```salida
> ['pan', 'leche']
> ```
>
> Para vaciarla de verdad habría que modificarla: `carrito.clear()`.

## Cómo busca Python un nombre

| Dónde busca | Qué es |
| --- | --- |
| 1. Local | Las variables y parámetros de la función en curso |
| 2. Global | Las definidas en el nivel principal del fichero |
| 3. Incorporado | Lo que trae Python de serie: `print`, `len`, `sum`, `list`... |

Si no lo encuentra en ninguno de los tres, lanza el `NameError`.

> [!aviso] No llames a tus variables como funciones de Python
>
> Ese tercer nivel es el que te pisas sin darte cuenta. Si escribes `lista = [1, 2, 3]` no pasa nada, pero `list = [1, 2, 3]` o `sum = 0` dejan inservibles `list()` y `sum()` en el resto del programa. Los nombres más pisados son `list`, `dict`, `str`, `sum`, `max`, `min`, `type`, `id` e `input`.

> [!resumen] En resumen
>
> Las variables creadas dentro de una función son locales, desaparecen al terminar y no se ven desde fuera; intentar usarlas da un `NameError`. Una función puede leer las variables globales, y ese es el uso legítimo de las constantes en mayúsculas, pero en cuanto le asigna un valor a un nombre, ese nombre pasa a ser local en toda la función y aparece el `UnboundLocalError`. `global` permite reasignarlas, pero rompe el aislamiento que hace fiables a las funciones, así que la alternativa es siempre pasar datos por parámetro y devolver resultados con `return`. Las listas y los diccionarios son la excepción aparente: se pasan como el mismo objeto, así que modificarlos dentro sí se nota fuera, aunque reasignarlos no.

> [!ejercicio] Practica
>
> Crea un fichero `37-ambito.py` y resuelve:
>
> 1. Escribe una función que cree una variable local e intenta imprimirla desde fuera. Lee el `NameError` y arréglalo devolviéndola.
> 2. Define una constante `DESCUENTO_SOCIO = 0.15` fuera y úsala dentro de una función que calcule el precio con descuento, sin pasarla por parámetro.
> 3. Provoca el `UnboundLocalError` intentando incrementar una variable global desde dentro de una función. Arréglalo primero con `global` y después sin él, usando un parámetro y un `return`. Compara las dos versiones.
> 4. Escribe `añadir_tarea(lista_de_tareas, texto)` que añada la tarea a la lista recibida y no devuelva nada. Comprueba desde fuera que la lista ha cambiado.
> 5. Escribe `duplicar_precios(precios)` en dos versiones: una que modifique la lista recibida con un bucle y otra que devuelva una lista nueva con una comprensión. Comprueba qué le pasa a la lista original en cada caso.
> 6. Crea una variable llamada `sum` con un número dentro y después intenta usar `sum([1, 2, 3])`. Lee el error y reflexiona sobre por qué conviene evitar esos nombres.
