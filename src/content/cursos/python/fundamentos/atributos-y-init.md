---
titulo: "Atributos, __init__ y self"
resumen: "Cómo se inicializan los objetos, qué es self de verdad y en qué se diferencian los atributos de instancia de los de clase."
minutos: 13
orden: 53
---

En la lección anterior se creaban vehículos vacíos y se les iban colgando atributos desde fuera, uno a uno. Eso funciona, pero es frágil: nada obliga a poner todos los datos, nadie sabe cuáles hacen falta y cualquier despiste deja un objeto a medio hacer que fallará más adelante, lejos de donde estaba el error.

`__init__` es el sitio donde se escribe, de una vez y para siempre, **qué datos necesita un objeto para existir**.

## El método `__init__`

Python llama a `__init__` automáticamente justo después de fabricar el objeto. No lo llamas tú nunca:

```python
class CuentaBancaria:
        def __init__(self, titular, saldo):
                print(f"Creando la cuenta de {titular}")
        self.titular = titular
        self.saldo = saldo


cuenta = CuentaBancaria("Lucía Ferrer", 1500.0)
print(cuenta.titular)
print(cuenta.saldo)
```

```salida
Creando la cuenta de Lucía Ferrer
Lucía Ferrer
1500.0
```

Fíjate en que nunca aparece `cuenta.__init__(...)` por ningún lado. Al escribir `CuentaBancaria("Lucía Ferrer", 1500.0)`, Python crea un objeto vacío y le pasa esos dos argumentos a `__init__` para que lo rellene.

A este método se le llama **constructor** porque es el que deja el objeto construido y listo para usar. Estrictamente hablando, en Python quien crea el objeto es otro método interno y `__init__` solo lo inicializa, pero todo el mundo dice "constructor" y se entiende perfectamente.

> [!nota] Los guiones bajos dobles no son decorativos
>
> Los nombres con dos guiones bajos delante y detrás, como `__init__`, se llaman *métodos especiales* o, coloquialmente, *dunder* (de *double underscore*). Son un pacto con el lenguaje: tú los defines y Python los llama por su cuenta cuando toca. `__init__` se dispara al crear un objeto; hay muchos más y tienen su propia lección.

## Qué es `self`, sin misterio

`self` es **el propio objeto**. Nada más.

Cuando escribes `cuenta.resumen()`, Python traduce esa llamada a `CuentaBancaria.resumen(cuenta)`: coge el objeto que hay a la izquierda del punto y lo pasa como primer argumento. Esas dos formas son literalmente equivalentes:

```python
class CuentaBancaria:
        def __init__(self, titular, saldo):
                self.titular = titular
        self.saldo = saldo

    def resumen(self):
                return f"{self.titular}: {self.saldo:.2f} €"


cuenta = CuentaBancaria("Lucía Ferrer", 1500.0)

print(cuenta.resumen())
print(CuentaBancaria.resumen(cuenta))
```

```salida
Lucía Ferrer: 1500.00 €
Lucía Ferrer: 1500.00 €
```

La segunda línea no se escribe nunca en código real, pero explica de golpe dos cosas que suelen dar problemas:

- Por qué **al llamar** a un método no escribes el primer argumento: ya lo pone Python con el objeto que hay delante del punto.
- Por qué **al definirlo** sí tienes que escribirlo: la función necesita un nombre para referirse al objeto sobre el que está trabajando.

Dentro de `__init__`, la línea `self.titular = titular` significa "guarda en el atributo `titular` **de este objeto** el valor que ha llegado por el parámetro `titular`". Son dos cosas distintas con el mismo nombre: a la izquierda, un atributo permanente; a la derecha, un parámetro que desaparece al terminar el método.

> [!nota] self es una costumbre, no una palabra reservada
>
> Podrías llamarlo `yo`, `objeto` o `x` y el programa funcionaría igual, porque Python solo mira la posición, no el nombre. Pero **no lo hagas**: `self` lo usa absolutamente todo el mundo y cualquier persona que lea tu código espera encontrarlo.

## Atributos de instancia

Los que se crean con `self.algo = ...` son **atributos de instancia**: cada objeto tiene los suyos y son independientes.

Se leen y se modifican desde fuera con el punto, como ya sabes:

```python
cuenta = CuentaBancaria("Lucía Ferrer", 1500.0)

cuenta.saldo += 250          # modificar
cuenta.titular = "Lucía Ferrer Ruiz"
cuenta.oficina = "Zaragoza centro"   # crear uno nuevo sobre la marcha

print(cuenta.resumen())
print(cuenta.oficina)
```

```salida
Lucía Ferrer Ruiz: 1750.00 €
Zaragoza centro
```

Que se puedan crear atributos nuevos desde fuera, como ese `oficina`, es una libertad que Python te da y que conviene no usar: si un objeto puede tener oficina, dilo en `__init__`. Lo contrario lleva a objetos que a veces tienen el atributo y a veces no.

> [!consejo] Mira dentro del objeto con \_\_dict\_\_
>
> Todo objeto guarda sus atributos de instancia en un diccionario llamado `__dict__`. Imprimirlo es la forma más rápida de ver qué tiene de verdad dentro cuando algo no cuadra:
>
> ```python
> print(cuenta.__dict__)
> ```
>
> ```salida
> {'titular': 'Lucía Ferrer Ruiz', 'saldo': 1750.0, 'oficina': 'Zaragoza centro'}
> ```

## Atributos de clase

Un atributo escrito **directamente en el cuerpo de la clase**, fuera de cualquier método, pertenece a la clase y lo comparten todas las instancias:

```python
class CuentaBancaria:
        banco = "Banco del Ebro"
    comision_mensual = 1.50
    cuentas_abiertas = 0

    def __init__(self, titular, saldo):
                self.titular = titular
        self.saldo = saldo
        CuentaBancaria.cuentas_abiertas += 1


primera = CuentaBancaria("Lucía Ferrer", 1500.0)
segunda = CuentaBancaria("Mateo Arias", 320.0)

print(primera.banco)
print(segunda.banco)
print(CuentaBancaria.banco)
print(CuentaBancaria.cuentas_abiertas)
```

```salida
Banco del Ebro
Banco del Ebro
Banco del Ebro
2
```

Hay un solo `banco` en memoria, y las dos cuentas lo ven. El contador `cuentas_abiertas` aprovecha justamente eso: como es único, sirve para llevar la cuenta de cuántos objetos se han creado.

### La diferencia, demostrada

Aquí es donde se ve la distinción con claridad. Al asignar sobre la instancia, Python **no** modifica el atributo de clase: le crea a esa instancia uno propio que lo tapa.

```python
class CuentaBancaria:
        banco = "Banco del Ebro"

    def __init__(self, titular):
                self.titular = titular


primera = CuentaBancaria("Lucía Ferrer")
segunda = CuentaBancaria("Mateo Arias")

primera.banco = "Caja del Norte"

print(primera.banco)
print(segunda.banco)
print(CuentaBancaria.banco)
```

```salida
Caja del Norte
Banco del Ebro
Banco del Ebro
```

La regla que sigue Python al leer `primera.banco` es: primero busca en los atributos de la instancia; si no lo encuentra, sube a la clase. Al escribir, en cambio, siempre escribe en la instancia. Si de verdad quieres cambiarlo para todas, tienes que decirlo: `CuentaBancaria.banco = "Caja del Norte"`.

|  | Atributo de instancia | Atributo de clase |
| --- | --- | --- |
| Dónde se define | Dentro de `__init__`, con `self.` | En el cuerpo de la clase |
| A quién pertenece | A cada objeto por separado | A la clase, compartido |
| Cuándo usarlo | Datos que cambian de un objeto a otro | Constantes y contadores comunes |
| Ejemplo | `self.saldo` | `banco`, `comision_mensual` |

> [!aviso] Nunca pongas una lista o un diccionario como atributo de clase
>
> Con un texto o un número el fallo se nota poco, porque asignar crea una copia en la instancia. Con una lista no asignas: la modificas, y la modificas **para todos**.
>
> ```python
> class CuentaBancaria:
>         movimientos = []          # mal: es de la clase, no de cada cuenta
>
>     def __init__(self, titular):
>                 self.titular = titular
>
>
> primera = CuentaBancaria("Lucía Ferrer")
> segunda = CuentaBancaria("Mateo Arias")
>
> primera.movimientos.append("Ingreso de 100 €")
>
> print(primera.movimientos)
> print(segunda.movimientos)
> ```
>
> ```salida
> ['Ingreso de 100 €']
> ['Ingreso de 100 €']
> ```
>
> Mateo no ha ingresado nada y tiene el movimiento de Lucía. Es la misma trampa del argumento por defecto mutable de la lección de funciones, y se arregla igual: crea la lista dentro de `__init__` con `self.movimientos = []`.

## Valores por defecto en `__init__`

`__init__` es una función normal, así que admite todo lo que sabes de parámetros: valores por defecto, argumentos con nombre y el resto.

```python
class CuentaBancaria:
        def __init__(self, titular, saldo=0.0, divisa="EUR"):
                self.titular = titular
        self.saldo = saldo
        self.divisa = divisa
        self.movimientos = []

    def resumen(self):
                return f"{self.titular}: {self.saldo:.2f} {self.divisa} ({len(self.movimientos)} movimientos)"


nueva = CuentaBancaria("Iván Soto")
veterana = CuentaBancaria("Nuria Gil", 2400.0)
extranjera = CuentaBancaria("Paul Meier", 900.0, "CHF")

print(nueva.resumen())
print(veterana.resumen())
print(extranjera.resumen())
```

```salida
Iván Soto: 0.00 EUR (0 movimientos)
Nuria Gil: 2400.00 EUR (0 movimientos)
Paul Meier: 900.00 CHF (0 movimientos)
```

Dos detalles de este ejemplo:

- Los parámetros con valor por defecto van después de los obligatorios, igual que en cualquier función.
- `self.movimientos = []` **no** es un parámetro. Es un atributo que siempre empieza vacío y que el objeto irá llenando. `__init__` no está obligado a limitarse a copiar argumentos: puede inicializar lo que haga falta.

Con tres parámetros el orden todavía se recuerda, pero en cuanto crezcan conviene llamar con nombre para que se lea solo:

```python
extranjera = CuentaBancaria(titular="Paul Meier", saldo=900.0, divisa="CHF")
```

## Los errores característicos

> [!error] TypeError: CuentaBancaria.\_\_init\_\_() missing 1 required positional argument: 'saldo'
>
> Al crear el objeto te has dejado un argumento que `__init__` exige. Cuenta los parámetros de tu `__init__` sin contar `self` y compáralos con los que pasas entre paréntesis. Si ese dato no siempre se conoce al crear el objeto, dale un valor por defecto.

> [!error] AttributeError: 'CuentaBancaria' object has no attribute 'divisa'
>
> Ese atributo no existe en el objeto. Las tres causas, por orden de frecuencia: una errata en el nombre, que se te olvidó asignarlo en `__init__`, o que lo escribiste como `divisa = ...` en vez de `self.divisa = ...` dentro del método, con lo que creaste una variable local que se evaporó al terminar.
>
> Para comprobarlo, imprime `objeto.__dict__` y mira qué hay realmente dentro.

> [!consejo] Preguntar sin romper nada
>
> Si no estás seguro de que un atributo exista, `hasattr(objeto, "iban")` devuelve `True` o `False`, y `getattr(objeto, "iban", "sin IBAN")` devuelve el valor o ese tercer argumento si no lo encuentra. Son el equivalente de `in` y `.get()` de los diccionarios.

> [!resumen] En resumen
>
> `__init__` es el método que Python llama solo al crear un objeto, y es donde se declaran los datos que ese objeto necesita para existir. `self` es el propio objeto: Python lo pasa automáticamente porque `cuenta.resumen()` equivale a `CuentaBancaria.resumen(cuenta)`, y por eso se escribe al definir el método pero no al llamarlo. Los atributos creados con `self.algo` son de cada instancia; los escritos en el cuerpo de la clase son de la clase y los comparten todas, así que sirven para constantes y contadores pero nunca para listas. `__init__` admite valores por defecto como cualquier función, y `objeto.__dict__` te enseña qué hay dentro cuando algo no cuadra.

> [!ejercicio] Practica
>
> Crea un fichero `53-atributos.py` y resuelve:
>
> 1. Escribe una clase `Alumno` con `__init__(self, nombre, curso)` y un atributo `notas` que siempre empiece como lista vacía. Crea dos alumnos, añade notas a uno y comprueba que el otro sigue sin ellas.
> 2. Añade a `Alumno` un atributo de clase `centro = "IES Miguel Servet"` y comprueba que los dos alumnos lo ven. Después cámbiaselo solo a uno y explica por qué el otro no se entera.
> 3. Añade un atributo de clase `matriculados` que se incremente en cada `__init__`. Crea cuatro alumnos e imprime el total.
> 4. Escribe una clase `Pedido` con `__init__(self, cliente, articulos=None, enviado=False)`. Si `articulos` llega como `None`, crea una lista vacía dentro del método. Explica en un comentario por qué no se pone `articulos=[]` directamente.
> 5. Crea un `Pedido`, imprime su `__dict__`, modifícale un atributo desde fuera y vuelve a imprimirlo.
> 6. Provoca los dos errores de la lección: crea un objeto olvidando un argumento obligatorio y lee un atributo inexistente. Copia los mensajes en un comentario.
