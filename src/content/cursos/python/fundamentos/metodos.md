---
titulo: "Métodos"
resumen: "Cómo dar comportamiento a los objetos: métodos que consultan, métodos que modifican y los decoradores classmethod y staticmethod."
minutos: 14
orden: 54
---

Una clase que solo guarda datos es un diccionario con más ceremonia. Lo que hace que merezca la pena es el **comportamiento**: las operaciones que solo tienen sentido sobre esos datos y que viven pegadas a ellos.

Una cuenta bancaria no es una pareja de titular y saldo. Es algo en lo que se ingresa, de lo que se retira y a lo que se le pueden pedir sus movimientos. Eso son los métodos.

## Definir un método

Un método es una función escrita dentro del cuerpo de la clase cuyo **primer parámetro es siempre `self`**:

```python
class CuentaBancaria:
        def __init__(self, titular, saldo=0.0):
                self.titular = titular
        self.saldo = saldo
        self.movimientos = []

    def esta_en_numeros_rojos(self):
                """Consulta: mira el estado y no lo cambia."""
        return self.saldo < 0

    def ingresar(self, cantidad):
                """Modifica: cambia el estado del objeto."""
        self.saldo += cantidad
        self.movimientos.append(f"Ingreso de {cantidad:.2f} €")


cuenta = CuentaBancaria("Lucía Ferrer", 50.0)

print(cuenta.esta_en_numeros_rojos())
cuenta.ingresar(120.0)
print(cuenta.saldo)
print(cuenta.movimientos)
```

```salida
False
170.0
['Ingreso de 120.00 €']
```

Todo lo que sabes de funciones vale aquí: parámetros con valor por defecto, argumentos con nombre, docstrings, anotaciones de tipo y `return`. La única diferencia es ese `self` delante, que es el objeto sobre el que se está llamando.

## Dos clases de métodos

Aunque Python no los distingue, conviene tenerlos separados en la cabeza:

|  | Consultan | Modifican |
| --- | --- | --- |
| Qué hacen | Leen el estado y calculan algo | Cambian atributos del objeto |
| Qué devuelven | Un valor, siempre | Normalmente nada, o un `True`/`False` de si salió bien |
| Cómo se llaman | Verbos de pregunta: `esta_...`, `tiene_...`, `calcular_...` | Verbos de acción: `ingresar`, `anadir`, `cancelar` |
| Ejemplo | `cuenta.esta_en_numeros_rojos()` | `cuenta.ingresar(120)` |

> [!consejo] Que un método no haga las dos cosas
>
> Un método que calcula un total *y de paso* modifica el carrito es una trampa: quien lo lea llamándolo `carrito.total()` no espera que cambie nada. Si tiene que hacer las dos cosas, sepáralo en dos.

## Llamar a un método desde otro

Dentro de un método, para usar otro método del mismo objeto se escribe `self.otro_metodo()`. El `self.` **no es opcional**: sin él, Python busca una función global con ese nombre y no la encuentra.

```python
class CuentaBancaria:
        def __init__(self, titular, saldo=0.0):
                self.titular = titular
        self.saldo = saldo
        self.movimientos = []

    def _anotar(self, texto):
                self.movimientos.append(texto)

    def ingresar(self, cantidad):
                self.saldo += cantidad
        self._anotar(f"Ingreso de {cantidad:.2f} €")

    def retirar(self, cantidad):
                if cantidad > self.saldo:
                        self._anotar(f"Retirada rechazada de {cantidad:.2f} €")
            return False
        self.saldo -= cantidad
        self._anotar(f"Retirada de {cantidad:.2f} €")
        return True


cuenta = CuentaBancaria("Lucía Ferrer", 200.0)
cuenta.ingresar(50.0)
print(cuenta.retirar(1000.0))
print(cuenta.retirar(30.0))
print(cuenta.saldo)
for linea in cuenta.movimientos:
        print(linea)
```

```salida
False
True
220.0
Ingreso de 50.00 €
Retirada rechazada de 1000.00 €
Retirada de 30.00 €
```

`_anotar` recoge algo que `ingresar` y `retirar` hacían igual. Es la misma idea de no repetirte que ya aplicas con las funciones, solo que aquí el método auxiliar no necesita que le pases nada: lee del objeto lo que necesita.

El guion bajo del principio avisa de que ese método es de uso interno y que quien use la clase desde fuera no debería llamarlo. Es solo una convención, y tiene su lección propia.

## Los errores característicos

> [!error] TypeError: CuentaBancaria.mostrar\_saldo() takes 0 positional arguments but 1 was given
>
> Te has dejado `self` al **definir** el método:
>
> ```python
> def mostrar_saldo():          # falta self
>         print(self.saldo)
> ```
>
> El mensaje suena absurdo porque llamaste sin argumentos, pero recuerda que `cuenta.mostrar_saldo()` se traduce a `CuentaBancaria.mostrar_saldo(cuenta)`. Ese argumento de más que Python dice que le has dado es el propio objeto. Añade `self` entre los paréntesis de la definición.

> [!error] TypeError: CuentaBancaria.ingresar() takes 1 positional argument but 2 were given
>
> El mismo fallo, pero en un método que además recibía un parámetro. Definiste `def ingresar(cantidad)` en vez de `def ingresar(self, cantidad)`, así que Python metió el objeto en `cantidad` y se quedó sin sitio para el 50. La cuenta siempre cuadra: los argumentos que Python dice haber recibido son los tuyos más uno.

> [!error] UnboundLocalError: cannot access local variable 'saldo' where it is not associated with a value
>
> Dentro del método has escrito `saldo += cantidad` en vez de `self.saldo += cantidad`. Sin `self.`, `saldo` es una variable local del método que no existe todavía. Los atributos del objeto **siempre** se escriben con `self.` delante, tanto para leerlos como para modificarlos.

## Métodos de clase con `@classmethod`

A veces necesitas una función que pertenece a la clase pero que **no opera sobre un objeto concreto**, porque su trabajo es precisamente fabricar uno. El caso típico es el *constructor alternativo*: además de la forma normal de crear el objeto, ofreces otra a partir de datos en otro formato.

```python
class CuentaBancaria:
        def __init__(self, titular, saldo=0.0):
                self.titular = titular
        self.saldo = saldo

    @classmethod
    def desde_linea_csv(cls, linea):
                """Crea una cuenta a partir de 'titular;saldo'."""
        titular, saldo = linea.split(";")
        return cls(titular.strip(), float(saldo))

    @classmethod
    def vacia(cls, titular):
                """Crea una cuenta recién abierta, sin dinero."""
        return cls(titular, 0.0)


importada = CuentaBancaria.desde_linea_csv("Nuria Gil;2400.50")
print(importada.titular, importada.saldo)

recien_abierta = CuentaBancaria.vacia("Iván Soto")
print(recien_abierta.titular, recien_abierta.saldo)
```

```salida
Nuria Gil 2400.5
Iván Soto 0.0
```

Las piezas:

- `@classmethod` es un **decorador**: una línea que empieza por arroba, justo encima del `def`, que cambia cómo funciona lo que hay debajo.
- El primer parámetro ya no es `self` sino `cls`, y no es el objeto: **es la clase**. Aquí `cls` vale `CuentaBancaria`.
- Por eso `return cls(...)` crea una cuenta: es lo mismo que escribir `CuentaBancaria(...)`, pero sin repetir el nombre. Esto importará de verdad cuando veas herencia, porque así el método sigue funcionando en las clases hijas.
- Se llama sobre la clase, no sobre un objeto: `CuentaBancaria.desde_linea_csv(...)`.

> [!nota] Por qué no una función suelta
>
> Podrías escribir una función `cuenta_desde_csv(linea)` fuera de la clase y funcionaría igual. La razón de meterla dentro es la misma de siempre: quien tenga la clase delante encontrará todas las formas de crear una cuenta en el mismo sitio, sin buscar por el fichero.

## Métodos estáticos con `@staticmethod`

Un método estático no recibe ni el objeto ni la clase: es una función normal que vive dentro de la clase **porque conceptualmente pertenece a ese tema**, aunque no necesite mirar ningún estado.

```python
class CuentaBancaria:
        def __init__(self, titular, saldo=0.0):
                self.titular = titular
        self.saldo = saldo

    @staticmethod
    def es_importe_valido(cantidad):
                """No necesita ni el objeto ni la clase: solo comprueba un número."""
        return isinstance(cantidad, (int, float)) and cantidad > 0


print(CuentaBancaria.es_importe_valido(50))
print(CuentaBancaria.es_importe_valido(-3))
print(CuentaBancaria.es_importe_valido("cien"))
```

```salida
True
False
False
```

La validación de un importe no depende de qué cuenta sea, así que pedir un `self` que no se va a usar sería mentir sobre lo que hace el método. Otros ejemplos típicos: comprobar si un IBAN tiene el formato correcto, o convertir de una divisa a otra.

### Los tres tipos, en una tabla

|  | Primer parámetro | Recibe | Se llama sobre | Para qué |
| --- | --- | --- | --- | --- |
| Método normal | `self` | El objeto | Un objeto | Casi todo |
| `@classmethod` | `cls` | La clase | La clase o un objeto | Constructores alternativos |
| `@staticmethod` | Ninguno | Nada | La clase o un objeto | Utilidades del tema, sin estado |

> [!consejo] Ante la duda, método normal
>
> Los métodos de clase y los estáticos son útiles, pero se usan poco. Si no tienes claro cuál te toca, escribe un método normal: el 90% de los métodos que escribirás en tu vida llevan `self` y punto.

## Un ejemplo completo

Un carrito de la compra con todo junto: atributos de clase para las constantes, métodos que consultan, métodos que modifican y métodos que llaman a otros.

```python title="carrito.py"
class CarritoDeLaCompra:
        """Un carrito de una tienda en línea."""

    IVA = 0.21
    GASTOS_DE_ENVIO = 4.95
    ENVIO_GRATIS_DESDE = 50.0

    def __init__(self, cliente):
                self.cliente = cliente
        self.lineas = []          # lista de diccionarios: nombre, precio, cantidad

    def anadir(self, nombre, precio, cantidad=1):
                """Añade unidades de un artículo, acumulando si ya estaba."""
        for linea in self.lineas:
                        if linea["nombre"] == nombre:
                                linea["cantidad"] += cantidad
                return
        self.lineas.append({"nombre": nombre, "precio": precio, "cantidad": cantidad})

    def quitar(self, nombre):
                """Elimina un artículo entero. Devuelve True si estaba."""
        for indice, linea in enumerate(self.lineas):
                        if linea["nombre"] == nombre:
                                del self.lineas[indice]
                return True
        return False

    def esta_vacio(self):
                return len(self.lineas) == 0

    def base_imponible(self):
                return sum(linea["precio"] * linea["cantidad"] for linea in self.lineas)

    def envio(self):
                if self.esta_vacio() or self.base_imponible() >= self.ENVIO_GRATIS_DESDE:
                        return 0.0
        return self.GASTOS_DE_ENVIO

    def total(self):
                base = self.base_imponible()
        return base + base * self.IVA + self.envio()

    def resumen(self):
                if self.esta_vacio():
                        return f"El carrito de {self.cliente} está vacío."
        lineas = [f"Carrito de {self.cliente}"]
        for linea in self.lineas:
                        importe = linea["precio"] * linea["cantidad"]
            lineas.append(f"  {linea['cantidad']} x {linea['nombre']:<20} {importe:>7.2f} €")
        lineas.append(f"  {'Base imponible':<24} {self.base_imponible():>7.2f} €")
        lineas.append(f"  {'Envío':<24} {self.envio():>7.2f} €")
        lineas.append(f"  {'TOTAL con IVA':<24} {self.total():>7.2f} €")
        return "\n".join(lineas)


carrito = CarritoDeLaCompra("Lucía Ferrer")
print(carrito.resumen())

carrito.anadir("Teclado mecánico", 79.90)
carrito.anadir("Cable USB-C", 8.50, 2)
carrito.anadir("Cable USB-C", 8.50)
carrito.quitar("Alfombrilla")

print(carrito.resumen())
```

```salida
El carrito de Lucía Ferrer está vacío.
Carrito de Lucía Ferrer
  1 x Teclado mecánico       79.90 €
  3 x Cable USB-C            25.50 €
  Base imponible            105.40 €
  Envío                       0.00 €
  TOTAL con IVA             127.53 €
```

Merece la pena mirar tres decisiones de ese código:

- `envio` y `total` llaman a `base_imponible` en vez de recalcular la suma. Si mañana cambia cómo se calcula la base, se cambia en un sitio.
- Las constantes se leen como `self.IVA` aunque sean atributos de clase. Funciona porque Python, al no encontrar `IVA` en la instancia, sube a la clase, y así una clase hija podría cambiar el IVA sin tocar el método.
- `quitar` devuelve `True` o `False` en vez de fallar cuando el artículo no está. Es una decisión, no la única posible: la alternativa es lanzar una excepción con `raise`, y la eliges según si quitar algo inexistente es un error de verdad o una situación normal.

> [!resumen] En resumen
>
> Un método es una función definida dentro de la clase cuyo primer parámetro es siempre `self`, el propio objeto. Unos consultan el estado y devuelven un valor, otros lo modifican, y conviene que ninguno haga las dos cosas. Para llamar a un método desde otro se escribe `self.otro_metodo()`, y olvidar el `self` produce un `TypeError` que habla de un argumento de más, porque ese argumento es el objeto. `@classmethod` recibe la clase en `cls` y sirve sobre todo para constructores alternativos; `@staticmethod` no recibe nada y sirve para utilidades relacionadas con el tema que no necesitan estado. En la duda, un método normal.

> [!ejercicio] Practica
>
> Crea un fichero `54-metodos.py` y resuelve:
>
> 1. Escribe una clase `Termostato` con `__init__(self, temperatura=20)` y los métodos `subir(grados=1)`, `bajar(grados=1)` y `esta_en_rango_comodo()`, que devuelve `True` entre 19 y 24 grados. Pruébala.
> 2. Impide que el termostato baje de 5 ni suba de 30: si el cambio se sale, que el método no lo aplique y devuelva `False`.
> 3. Añade a `Termostato` un método `informe()` que use los otros dos para devolver un texto con la temperatura y si está en rango cómodo. No repitas la lógica: llama a `self.esta_en_rango_comodo()`.
> 4. Añade un `@classmethod` llamado `desde_fahrenheit(cls, grados_f)` que cree un termostato convirtiendo la temperatura. La fórmula es `(f - 32) * 5 / 9`.
> 5. Añade un `@staticmethod` llamado `es_temperatura_valida(valor)` que compruebe que es un número entre -50 y 60. Úsalo dentro de `__init__` para rechazar valores imposibles.
> 6. Quita el `self` de la definición de `subir`, ejecuta y copia el mensaje de error exacto en un comentario. Vuelve a ponerlo.
