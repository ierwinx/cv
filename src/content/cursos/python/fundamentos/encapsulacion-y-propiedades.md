---
titulo: "Encapsulación y propiedades"
resumen: "Por qué no todo el estado de un objeto debería tocarse desde fuera y cómo proteger o calcular atributos con property."
minutos: 12
orden: 55
---

La clase `CuentaBancaria` de la lección anterior tenía métodos cuidadosos: `retirar` comprobaba que hubiera saldo, `ingresar` anotaba el movimiento. Todo ese cuidado se salta con una línea:

```python
cuenta = CuentaBancaria("Lucía Ferrer", 100.0)
cuenta.saldo = -50000          # nadie lo impide
cuenta.saldo = "un montón"     # esto tampoco
print(cuenta.saldo)
```

```salida
un montón
```

El objeto ha quedado inservible y ningún método se ha enterado. **Encapsular** es decidir qué parte del objeto es pública, la que puede usar cualquiera, y qué parte es maquinaria interna que solo deberían tocar sus propios métodos.

## La convención del guion bajo

La forma habitual de marcar algo como interno es ponerle **un guion bajo delante**:

```python
class CuentaBancaria:
        def __init__(self, titular, saldo_inicial=0.0):
                self.titular = titular          # público: cualquiera puede leerlo y cambiarlo
        self._saldo = saldo_inicial     # interno: manéjalo con ingresar() y retirar()
```

Python no hace absolutamente nada con ese guion bajo. `cuenta._saldo = -50000` sigue funcionando. Es **un acuerdo entre personas**, y dice: "esto es interior, si lo tocas te apañas con lo que pase, y puede desaparecer en la próxima versión sin avisar".

Suena débil, pero funciona sorprendentemente bien, porque todo el mundo lo respeta y los editores y las herramientas de análisis lo entienden: cuando escribes `cuenta.` y pulsas el tabulador, los nombres con guion bajo no aparecen en la lista.

> [!nota] El mismo guion bajo para métodos
>
> Ya lo viste con `_anotar` en la lección de métodos. La convención es la misma para atributos y métodos: guion bajo delante significa "detalle interno, no forma parte de cómo se usa esta clase".

## El doble guion bajo y el `name mangling`

Si pones **dos** guiones bajos delante, Python sí hace algo, aunque probablemente no lo que esperas:

```python
class CuentaBancaria:
        def __init__(self, saldo=0.0):
                self.__saldo = saldo

    def consultar(self):
                return self.__saldo


cuenta = CuentaBancaria(100.0)
print(cuenta.consultar())
print(cuenta.__saldo)
```

```salida
100.0
Traceback (most recent call last):
  File "/Users/erwin/curso-python/cuenta.py", line 11, in <module>
    print(cuenta.__saldo)
          ^^^^^^^^^^^^^^
AttributeError: 'CuentaBancaria' object has no attribute '__saldo'
```

Parece privado de verdad. No lo es. Lo que ha hecho Python es **renombrar el atributo**, un mecanismo que se llama `name mangling`: dentro de la clase `CuentaBancaria`, cualquier `__saldo` se convierte en `_CuentaBancaria__saldo`. El atributo sigue ahí y sigue siendo accesible:

```python
cuenta = CuentaBancaria(100.0)
print(cuenta.__dict__)
print(cuenta._CuentaBancaria__saldo)
```

```salida
{'_CuentaBancaria__saldo': 100.0}
100.0
```

> [!aviso] El doble guion bajo no sirve para ocultar
>
> Su propósito real no es la protección, sino **evitar colisiones de nombres entre una clase y sus hijas**: si una clase hija define su propio `__saldo`, no pisa el de la madre porque cada uno lleva el nombre de su clase incorporado. Ese es el problema que resuelve, y es un problema raro.
>
> Usar `__` pensando que es un `private` de otros lenguajes solo consigue código más difícil de depurar y de heredar. **Usa un solo guion bajo.**

### Por qué Python no tiene atributos privados

Es una decisión de diseño deliberada, y se resume en una frase que se repite mucho en la comunidad: *we're all consenting adults here*, todos somos personas adultas. La filosofía es que el lenguaje avisa de lo que es interno y confía en que no lo toques, en vez de montar un sistema de permisos que igualmente se puede burlar en casi todos los lenguajes que lo tienen.

A cambio se gana algo concreto: cuando una librería tiene un fallo y necesitas apañarlo, o cuando quieres inspeccionar un objeto mientras depuras, puedes. Nada te lo bloquea. La responsabilidad de no romper nada es tuya.

## `@property`: un método que se usa como atributo

Hay datos que no tiene sentido guardar porque se pueden calcular. El precio con IVA de un producto es el precio sin IVA por 1.21: guardarlo aparte es pedir que un día se queden descoordinados.

Podrías hacerlo un método y llamarlo con paréntesis, pero `@property` permite exponerlo **como si fuera un atributo**:

```python
class Producto:
        def __init__(self, nombre, precio_sin_iva, unidades):
                self.nombre = nombre
        self.precio_sin_iva = precio_sin_iva
        self.unidades = unidades

    @property
    def precio_con_iva(self):
                """Se calcula al vuelo, no se guarda."""
        return self.precio_sin_iva * 1.21

    @property
    def valor_en_almacen(self):
                return self.precio_con_iva * self.unidades


teclado = Producto("Teclado mecánico", 79.90, 4)

print(f"{teclado.precio_con_iva:.2f} €")
print(f"{teclado.valor_en_almacen:.2f} €")

teclado.precio_sin_iva = 69.90
print(f"{teclado.precio_con_iva:.2f} €")
```

```salida
96.68 €
386.72 €
84.58 €
```

Fíjate en que se escribe `teclado.precio_con_iva`, **sin paréntesis**, aunque por dentro sea un método que se ejecuta en cada lectura. Por eso al cambiar `precio_sin_iva` el precio con IVA se actualiza solo: no había ningún valor guardado que refrescar.

> [!error] AttributeError: property 'precio\_con\_iva' of 'Producto' object has no setter
>
> Has intentado asignar a una propiedad que solo tiene lectura, con algo como `teclado.precio_con_iva = 100.0`. Tiene sentido: es un valor calculado, y Python no puede adivinar qué precio sin IVA querías. O asignas al atributo del que depende, o defines un `setter`.

## El `setter`: validar antes de asignar

Cuando sí quieres permitir la asignación pero con condiciones, se añade un segundo método decorado con `@nombre.setter`:

```python
class Producto:
        def __init__(self, nombre, precio):
                self.nombre = nombre
        self.precio = precio      # pasa por el setter, no por _precio

    @property
    def precio(self):
                return self._precio

    @precio.setter
    def precio(self, valor):
                if not isinstance(valor, (int, float)):
                        raise TypeError("El precio tiene que ser un número")
        if valor < 0:
                        raise ValueError("El precio no puede ser negativo")
        self._precio = float(valor)


teclado = Producto("Teclado mecánico", 79.90)
print(teclado.precio)

teclado.precio = 69.90
print(teclado.precio)

try:
        teclado.precio = -10
except ValueError as error:
        print(f"Rechazado: {error}")

try:
        teclado.precio = "barato"
except TypeError as error:
        print(f"Rechazado: {error}")

print(teclado.precio)
```

```salida
79.9
69.9
Rechazado: El precio no puede ser negativo
Rechazado: El precio tiene que ser un número
69.9
```

Cuatro detalles de esa clase, que son los que suelen dar guerra:

- Los dos métodos se llaman **igual**, `precio`. El decorador `@precio.setter` se refiere a la propiedad definida justo arriba.
- El dato real se guarda en `self._precio`, con guion bajo. Si lo guardaras en `self.precio` tendrías una recursión infinita, porque asignar a `precio` volvería a llamar al `setter`.
- En `__init__` se escribe `self.precio = precio`, no `self._precio = precio`. Así la validación también se aplica al crear el objeto, que es justo lo que quieres.
- Cuando un valor no vale, el `setter` lanza una excepción con `raise`. Ignorarlo en silencio sería peor: quien asignó se quedaría convencido de que el precio cambió.

## Un ejemplo con todo junto

```python
class CuentaBancaria:
        def __init__(self, titular, saldo_inicial=0.0):
                self.titular = titular
        self._saldo = saldo_inicial
        self._movimientos = []

    @property
    def saldo(self):
                """Solo lectura: se consulta, pero no se asigna desde fuera."""
        return self._saldo

    @property
    def movimientos(self):
                return list(self._movimientos)     # una copia, para que nadie toque la original

    def ingresar(self, cantidad):
                if cantidad <= 0:
                        raise ValueError("El ingreso tiene que ser positivo")
        self._saldo += cantidad
        self._movimientos.append(f"+{cantidad:.2f}")

    def retirar(self, cantidad):
                if cantidad <= 0:
                        raise ValueError("La retirada tiene que ser positiva")
        if cantidad > self._saldo:
                        raise ValueError(f"Saldo insuficiente: tienes {self._saldo:.2f} €")
        self._saldo -= cantidad
        self._movimientos.append(f"-{cantidad:.2f}")


cuenta = CuentaBancaria("Lucía Ferrer", 500.0)
cuenta.ingresar(120.0)

try:
        cuenta.retirar(1000.0)
except ValueError as error:
        print(f"Operación rechazada: {error}")

print(f"Saldo: {cuenta.saldo:.2f} €")
print(cuenta.movimientos)

cuenta.movimientos.append("+1000000.00")   # no afecta: era una copia
print(cuenta.movimientos)
```

```salida
Operación rechazada: Saldo insuficiente: tienes 620.00 €
Saldo: 620.00 €
['+120.00']
['+120.00']
```

Ahora el saldo solo cambia por las dos puertas previstas, y la lista de movimientos que se entrega es una copia, así que nadie puede falsificar el histórico desde fuera. La última línea lo demuestra: el millón de euros se añadió a una copia que se tiró a la basura.

## Cuándo merece la pena

Las propiedades son una herramienta fina y se pueden usar de más. La regla práctica:

| Situación | Qué hacer |
| --- | --- |
| Un dato normal, sin reglas | Atributo público y ya está |
| Un valor que se deduce de otros | `@property` de solo lectura |
| Un dato con reglas al asignar | `@property` con `setter` |
| Maquinaria interna | Atributo con `_` delante, sin propiedad |
| Una operación que tarda o que cambia cosas | Un método normal, con paréntesis |

> [!consejo] Empieza simple y añade la propiedad cuando haga falta
>
> Esta es la gran ventaja de las propiedades frente a los `getters` y `setters` de otros lenguajes. Si hoy `producto.precio` es un atributo normal y mañana necesitas validarlo, lo conviertes en propiedad y **no hay que cambiar ni una línea del código que lo usa**: se sigue escribiendo `producto.precio`. Por eso en Python no se escriben `get_precio()` y `set_precio()` desde el principio "por si acaso": es trabajo que no hace falta hacer.

> [!aviso] No metas cálculos caros en una propiedad
>
> Quien escribe `pedido.total` espera que sea instantáneo, porque parece un atributo. Si por dentro lee un fichero o hace una consulta que tarda un segundo, sorprenderá muy desagradablemente dentro de un bucle. Para eso, un método con paréntesis y un nombre que lo anuncie: `pedido.calcular_total()`.

> [!resumen] En resumen
>
> Encapsular es separar lo público de la maquinaria interna. En Python eso se marca con un guion bajo delante del nombre, que es solo un acuerdo entre personas: el lenguaje no impide nada. El doble guion bajo activa el `name mangling`, que renombra el atributo a `_Clase__nombre` y existe para evitar colisiones con las clases hijas, no para ocultar, porque Python no tiene atributos privados de verdad y es una decisión deliberada. `@property` convierte un método en algo que se lee como un atributo, ideal para valores calculados, y `@nombre.setter` permite validar antes de asignar, guardando el dato real en un atributo con guion bajo. Se usan cuando hay reglas o cálculos de por medio; para un dato normal, un atributo público basta.

> [!ejercicio] Practica
>
> Crea un fichero `55-encapsulacion.py` y resuelve:
>
> 1. Escribe una clase `Temperatura` que guarde `_celsius` y exponga una propiedad de solo lectura `fahrenheit`, calculada con `celsius * 9 / 5 + 32`.
> 2. Añade una propiedad `celsius` con `setter` que rechace con `ValueError` cualquier valor por debajo de -273.15. Comprueba que la validación también actúa al crear el objeto.
> 3. Escribe una clase `Rectangulo` con `ancho` y `alto` y propiedades de solo lectura `area` y `perimetro`. Cambia el ancho y comprueba que el área se actualiza sola.
> 4. Escribe una clase `Usuario` cuyo `email` sea una propiedad con `setter`: debe contener una `@` y un punto después, y guardarse siempre en minúsculas. Prueba con `"  ANA@Correo.ES  "`.
> 5. Coge la clase `Usuario` anterior y añade un atributo `__contrasena`. Imprime `usuario.__dict__` y accede al valor usando el nombre transformado por el `name mangling`.
> 6. Intenta asignar a una propiedad sin `setter`, lee el error y explica en un comentario por qué Python no puede resolverlo solo.
