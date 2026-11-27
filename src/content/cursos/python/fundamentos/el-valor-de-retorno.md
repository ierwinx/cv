---
titulo: "El valor de retorno"
resumen: "Por qué imprimir y devolver no son lo mismo, cómo funciona return y qué pasa cuando una función no lo tiene."
minutos: 13
orden: 34
---

Las funciones que has escrito hasta ahora imprimen cosas. Está bien para una cabecera o un menú, pero la mayoría de las funciones útiles no sirven para enseñar algo en pantalla, sino para **calcular un resultado que el resto del programa va a usar**.

Esa diferencia, entre mostrar un valor y entregarlo, es el malentendido número uno de quien empieza con funciones. Si lo dejas claro hoy, te ahorras semanas de confusión.

## Imprimir no es devolver

Esta función parece que calcula el IVA:

```python
def mostrar_iva(precio):
        print(precio * 0.21)


mostrar_iva(100)
```

```salida
21.0
```

Sale el 21. Parece que funciona. Pero prueba a guardar ese resultado en una variable:

```python
total = mostrar_iva(100)
print(total)
```

```salida
21.0
None
```

El 21 lo imprime la función. Después imprimimos `total` y sale `None`, que es la forma que tiene Python de decir "nada". La función ha escrito el número en la pantalla y lo ha tirado. No te lo ha dado.

Y en cuanto intentas usarlo, el programa se rompe:

```python
iva = mostrar_iva(100)
print(iva + 100)
```

```salida
21.0
Traceback (most recent call last):
  File "/Users/erwin/curso-python/factura.py", line 6, in <module>
    print(iva + 100)
          ~~~~^~~~~
TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'
```

> [!error] TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'
>
> Estás operando con el resultado de una función que no devuelve nada. En el 99 % de los casos la causa es que dentro de la función pusiste `print` donde debía ir `return`. Ve a la definición y compruébalo.

> [!aviso] `print` es para el usuario, `return` es para el programa
>
> Una función que imprime le habla a la persona que está delante de la pantalla. Una función que devuelve le habla al resto del código. Son dos cosas distintas y casi nunca deben mezclarse en la misma función: si una función calcula, que calcule y devuelva; ya decidirá quien la llame si imprime el resultado, lo guarda o lo suma a otro.

## return

Cambiar `print` por `return` lo arregla todo:

```python
def calcular_iva(precio):
        return precio * 0.21


iva = calcular_iva(100)
print(iva)
print(100 + calcular_iva(100))
print(f"IVA de la cesta: {calcular_iva(37.5):.2f} euros")
```

```salida
21.0
121.0
IVA de la cesta: 7.88 euros
```

Ahora la llamada `calcular_iva(100)` **es** un valor. Se comporta igual que si hubieras escrito `21.0` en ese sitio: puedes guardarlo, sumarlo, meterlo en una f-string, pasarlo a otra función o ponerlo en una lista.

Fíjate también en el nombre. `mostrar_iva` empieza por un verbo de mostrar; `calcular_iva`, por uno de calcular. El nombre ya te dice cuál de las dos devuelve algo.

## return termina la función inmediatamente

En cuanto Python ejecuta un `return`, sale de la función. Lo que haya debajo no se ejecuta:

```python
def calcular_iva(precio):
        print("Calculando el IVA...")
    return precio * 0.21
    print("Esta línea no se ejecuta nunca")


print(calcular_iva(100))
```

```salida
Calculando el IVA...
21.0
```

El último `print` está ahí, escrito y bien sangrado, y nunca se ejecutará. Python no da ningún error por ello; simplemente es código muerto. Algunos editores te lo marcan en gris.

Esto no significa que solo pueda haber un `return` por función. Puede haber varios, en ramas distintas de un `if`; lo que ocurre es que el primero que se ejecute acaba la función.

```python
def clasificar_nota(nota):
        if nota < 5:
                return "Suspenso"
    if nota < 7:
                return "Aprobado"
    if nota < 9:
                return "Notable"
    return "Sobresaliente"


print(clasificar_nota(4))
print(clasificar_nota(8.5))
```

```salida
Suspenso
Notable
```

## Una función sin return devuelve None

Toda función devuelve algo, siempre. Si no escribes `return`, Python devuelve `None` por ti:

```python
def guardar_nota(nota):
        print(f"Nota guardada: {nota}")


resultado = guardar_nota(8)
print(resultado)
print(type(resultado))
```

```salida
Nota guardada: 8
None
<class 'NoneType'>
```

`None` es un valor de pleno derecho, con su propio tipo, `NoneType`. Significa "ausencia de valor" y lo verás por todas partes en Python.

Hay un caso especialmente traicionero: la función que **a veces** devuelve algo.

```python
def es_mayor_de_edad(edad):
        if edad >= 18:
                return True


print(es_mayor_de_edad(20))
print(es_mayor_de_edad(15))
```

```salida
True
None
```

Cuando la condición no se cumple, la función llega al final sin encontrar ningún `return` y devuelve `None`. En un `if` eso se comporta como falso y parece que funciona, pero `None` no es `False`, y el día que compares con `== False` o metas el resultado en una lista te llevarás una sorpresa. Escribe siempre el `return` de todos los caminos:

```python
def es_mayor_de_edad(edad):
        return edad >= 18
```

> [!nota] `return` a secas
>
> `return` sin nada detrás también es válido y devuelve `None`. Sirve para salir de una función antes de tiempo cuando no hay ningún resultado que entregar, por ejemplo en una función que solo imprime. No lo confundas con no poner nada: hacen lo mismo, pero el `return` explícito comunica que sales ahí a propósito.

## Devolver varios valores a la vez

Pon varios valores separados por comas después del `return` y Python los empaqueta en una tupla:

```python
def analizar_notas(notas):
        media = sum(notas) / len(notas)
    return media, min(notas), max(notas)


resultado = analizar_notas([7, 9, 5, 8])
print(resultado)
```

```salida
(7.25, 5, 9)
```

No hay nada nuevo aquí: es el mismo empaquetado de tuplas que viste en su lección, y por eso lo normal es recogerlo desempaquetando en varias variables de golpe:

```python
media, peor, mejor = analizar_notas([7, 9, 5, 8])
print(f"Media: {media:.2f}")
print(f"Peor nota: {peor}")
print(f"Mejor nota: {mejor}")
```

```salida
Media: 7.25
Peor nota: 5
Mejor nota: 9
```

Es cómodo, pero con moderación. Si tu función devuelve cinco o seis valores, quien la llama tiene que recordar el orden exacto de todos, y eso se equivoca solo. A partir de tres valores, plantéate devolver un diccionario:

```python
def analizar_notas(notas):
        return {
        "media": sum(notas) / len(notas),
        "peor": min(notas),
        "mejor": max(notas),
        "aprobadas": len([nota for nota in notas if nota >= 5]),
    }


resumen = analizar_notas([7, 9, 5, 8])
print(resumen["media"])
print(resumen["aprobadas"])
```

```salida
7.25
4
```

Con el diccionario, quien lo recibe pide lo que necesita por su nombre y no depende de ningún orden.

## El retorno temprano

Como `return` corta la función en seco, se puede usar para quitarse de encima los casos raros al principio y dejar el caso normal sin anidar. Compara estas dos versiones de lo mismo:

```python
def calcular_descuento(importe, socio):
        if importe > 0:
                if socio:
                        if importe >= 100:
                                return importe * 0.20
            else:
                                return importe * 0.10
        else:
                        return 0.0
    else:
                return 0.0
```

```python
def calcular_descuento(importe, socio):
        if importe <= 0:
                return 0.0
    if not socio:
                return 0.0
    if importe >= 100:
                return importe * 0.20
    return importe * 0.10
```

Las dos dan exactamente el mismo resultado:

```python
print(calcular_descuento(150, True))
print(calcular_descuento(40, True))
print(calcular_descuento(150, False))
```

```salida
30.0
4.0
0.0
```

La segunda versión se lee de arriba abajo como una lista de reglas, nunca pasa de un nivel de sangría y no te obliga a sostener mentalmente tres `if` abiertos para saber en qué caso estás. Es el patrón llamado **retorno temprano** o *early return*, y cuando te acostumbras a él ya no vuelves atrás.

> [!consejo] Primero lo que descarta, luego lo que calcula
>
> El orden habitual es: comprobaciones que hacen imposible seguir, casos especiales cortos y, al final y sin sangrar, el caso general. Si te encuentras con tres niveles de `if` anidados dentro de una función, casi siempre se pueden aplanar así.

> [!resumen] En resumen
>
> `return` entrega un valor a quien llamó a la función, mientras que `print` solo lo escribe en pantalla y lo pierde; confundirlos produce un `NoneType` que rompe el programa más adelante. El `return` termina la función en el acto, así que puede haber varios en ramas distintas y lo que quede debajo del que se ejecute es código muerto. Una función sin `return`, o que no lo alcanza, devuelve `None`. Varios valores separados por comas se devuelven como una tupla que se desempaqueta al recibirla, y a partir de tres conviene un diccionario. Sacar los casos especiales al principio con retornos tempranos evita anidar.

> [!ejercicio] Practica
>
> Crea un fichero `34-retorno.py` y resuelve:
>
> 1. Escribe `calcular_precio_final(precio)` que **devuelva** el precio con un 21 % de IVA. Guarda el resultado en una variable, súmale 5 e imprímelo.
> 2. Coge esa misma función, cambia el `return` por un `print` e intenta sumarle 5 al resultado. Lee el `TypeError` y vuelve a dejarla bien.
> 3. Escribe `estadisticas(numeros)` que devuelva la suma, la media y el máximo. Recoge los tres valores desempaquetando en una sola línea.
> 4. Escribe `clasificar_temperatura(grados)` que devuelva `"helada"` por debajo de 0, `"fría"` hasta 15, `"templada"` hasta 25 y `"calurosa"` por encima. Usa retornos tempranos, sin ningún `else`.
> 5. Escribe `analizar_texto(frase)` que devuelva un diccionario con el número de caracteres, el número de palabras y la frase en mayúsculas. Imprime cada dato por su clave.
> 6. Escribe una función que, a propósito, solo tenga `return` dentro de un `if`. Llámala con un valor que no cumpla la condición e imprime lo que devuelve. Arréglala después.
