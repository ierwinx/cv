---
titulo: "Herencia"
resumen: "Cómo partir de una clase existente para especializarla, sobrescribir métodos, llamar al padre con super y tratar objetos distintos igual."
minutos: 14
orden: 56
---

Una empresa de reparto tiene furgonetas, motocicletas y un par de eléctricos. Los tres tienen matrícula, acumulan kilómetros y se pueden revisar. Lo único distinto es cuánto cuesta moverlos y algún dato propio, como la carga máxima.

Escribir tres clases completas significa copiar tres veces el mismo `__init__` y el mismo `conducir`, y arreglar tres veces cada fallo. La herencia permite escribir una vez lo común y solo lo distinto en cada caso.

## Una clase que hereda de otra

La sintaxis es poner la clase padre entre paréntesis:

```python
class Vehiculo:
        def __init__(self, matricula, kilometros=0):
                self.matricula = matricula
        self.kilometros = kilometros

    def conducir(self, km):
                self.kilometros += km

    def ficha(self):
                return f"{self.matricula} · {self.kilometros} km"


class Furgoneta(Vehiculo):
        """Una furgoneta es un vehículo que además lleva carga."""


furgoneta = Furgoneta("1234 ABC", 52000)
furgoneta.conducir(180)
print(furgoneta.ficha())
print(isinstance(furgoneta, Furgoneta))
print(isinstance(furgoneta, Vehiculo))
print(issubclass(Furgoneta, Vehiculo))
```

```salida
1234 ABC · 52180 km
True
True
True
```

`Furgoneta` no define nada y ya sabe hacerlo todo. A `Vehiculo` se le llama **clase padre**, clase base o superclase; a `Furgoneta`, **clase hija**, derivada o subclase.

### Qué se hereda

Todo: `__init__`, los métodos, los atributos de clase, las propiedades y los métodos especiales. La hija empieza siendo una copia funcional del padre y a partir de ahí puede añadir cosas nuevas o cambiar las que hereda.

Lo que **no** se comparte son los datos: cada objeto sigue teniendo sus propios atributos de instancia.

> [!consejo] La prueba del "es un"
>
> La herencia solo tiene sentido si la frase "una furgoneta **es un** vehículo" es verdad. Si lo que puedes decir es "un pedido **tiene** un cliente", eso no es herencia, es que un objeto contiene a otro. Cuando la frase suena rara, casi siempre la herencia está mal planteada.

## Sobrescribir un método

Definir en la hija un método con el mismo nombre que el del padre lo sustituye. Python busca siempre primero en la clase del objeto y solo sube si no lo encuentra:

```python
class Vehiculo:
        def coste_por_100km(self):
                return 0.0


class Motocicleta(Vehiculo):
        PRECIO_GASOLINA = 1.68

    def coste_por_100km(self):
                return 3.2 * self.PRECIO_GASOLINA


moto = Motocicleta()
print(f"{moto.coste_por_100km():.2f} €")
```

```salida
5.38 €
```

## Llamar al padre con `super()`

Sobrescribir suele significar "lo que hacía el padre **y además** esto". Para eso está `super()`, que da acceso a la versión del padre:

```python
class Furgoneta(Vehiculo):
        def __init__(self, matricula, carga_maxima, kilometros=0):
                super().__init__(matricula, kilometros)
        self.carga_maxima = carga_maxima

    def ficha(self):
                return f"{super().ficha()} · carga {self.carga_maxima} kg"
```

Dos usos distintos en las dos líneas:

- En `__init__`, `super().__init__(matricula, kilometros)` deja que el padre coloque los atributos que sabe colocar, y después la hija añade el suyo. Fíjate en que **no** se pasa `self`: `super()` ya sabe sobre qué objeto está trabajando.
- En `ficha`, `super().ficha()` reutiliza el texto del padre en vez de volver a escribirlo. Si mañana el padre añade un dato a la ficha, la furgoneta se entera sola.

> [!error] AttributeError: 'Furgoneta' object has no attribute 'matricula'
>
> El clásico de la herencia: has escrito un `__init__` en la hija y se te ha olvidado llamar a `super().__init__(...)`.
>
> ```python
> class Furgoneta(Vehiculo):
>         def __init__(self, matricula, carga_maxima):
>                 self.carga_maxima = carga_maxima    # falta llamar a super().__init__()
> ```
>
> Al definir `__init__` en la hija, el del padre **deja de ejecutarse**: no se acumulan, se sustituye. Así que los atributos que colocaba el padre no existen. La primera línea del `__init__` de la hija es casi siempre la llamada a `super()`.

## Polimorfismo: tratarlos a todos igual

Aquí está el motivo por el que la herencia compensa. Si varias clases responden al mismo método, puedes meterlas en la misma lista y recorrerlas sin preguntar de qué tipo es cada una:

```python title="flota.py"
class Vehiculo:
        def __init__(self, matricula, kilometros=0):
                self.matricula = matricula
        self.kilometros = kilometros

    def conducir(self, km):
                self.kilometros += km

    def ficha(self):
                return f"{self.matricula} · {self.kilometros} km"

    def coste_por_100km(self):
                return 0.0


class Furgoneta(Vehiculo):
        PRECIO_DIESEL = 1.52

    def __init__(self, matricula, carga_maxima, kilometros=0):
                super().__init__(matricula, kilometros)
        self.carga_maxima = carga_maxima

    def coste_por_100km(self):
                return 8.5 * self.PRECIO_DIESEL

    def ficha(self):
                return f"{super().ficha()} · carga {self.carga_maxima} kg"


class Motocicleta(Vehiculo):
        PRECIO_GASOLINA = 1.68

    def coste_por_100km(self):
                return 3.2 * self.PRECIO_GASOLINA


class Electrico(Vehiculo):
        PRECIO_KWH = 0.18

    def __init__(self, matricula, autonomia, kilometros=0):
                super().__init__(matricula, kilometros)
        self.autonomia = autonomia

    def coste_por_100km(self):
                return 17.0 * self.PRECIO_KWH

    def ficha(self):
                return f"{super().ficha()} · autonomía {self.autonomia} km"


flota = [
    Furgoneta("1234 ABC", 900, 52000),
    Motocicleta("5678 XYZ", 12400),
    Electrico("9012 JKL", 340, 8100),
]

for vehiculo in flota:
        print(f"{vehiculo.ficha():<45} {vehiculo.coste_por_100km():>5.2f} €/100 km")
```

```salida
1234 ABC · 52000 km · carga 900 kg            12.92 €/100 km
5678 XYZ · 12400 km                            5.38 €/100 km
9012 JKL · 8100 km · autonomía 340 km          3.06 €/100 km
```

El bucle no sabe ni le importa qué hay dentro de `flota`. Llama a `ficha()` y a `coste_por_100km()` y cada objeto responde a su manera. Eso es el **polimorfismo**: muchas formas, un mismo trato.

Compara con la alternativa sin clases, que sería un `if` gigante dentro del bucle preguntando por el tipo de cada vehículo. Ese `if` habría que tocarlo cada vez que apareciera un tipo nuevo; con clases, añadir un tipo nuevo consiste en escribir una clase más y el bucle ni se entera.

> [!nota] En Python el polimorfismo ni siquiera necesita herencia
>
> Si mañana escribes una clase `Bicicleta` que no hereda de `Vehiculo` pero tiene sus propios `ficha()` y `coste_por_100km()`, el bucle de arriba funciona igual. A Python solo le importa que el objeto sepa responder, no de dónde viene. Es lo que se llama *duck typing*: si camina como un pato y grazna como un pato, sirve como pato.

## `isinstance()` y la herencia

`isinstance()` tiene en cuenta toda la cadena de herencia, y ahí está su gracia frente a comparar tipos a mano:

```python
furgoneta = Furgoneta("1234 ABC", 900)

print(type(furgoneta) == Vehiculo)
print(isinstance(furgoneta, Vehiculo))
print(type(furgoneta))
```

```salida
False
True
<class '__main__.Furgoneta'>
```

`type()` responde el tipo exacto y nada más. `isinstance()` responde a la pregunta útil, que es "¿puedo tratar esto como un vehículo?". Por eso, **para comprobar tipos usa siempre `isinstance()`**, nunca `type(x) == Clase`.

## Herencia en varios niveles

Una hija puede tener hijas, y la cadena se recorre hacia arriba hasta encontrar el método. Al final de todas las cadenas está `object`, la clase de la que hereda absolutamente todo en Python, aunque no lo escribas. De ahí vienen los métodos que tienen tus objetos sin que hayas hecho nada, como el `<__main__.Vehiculo object at 0x...>` que sale al imprimirlos.

Las jerarquías profundas se vuelven difíciles de seguir muy pronto: para saber qué hace un método hay que subir tres o cuatro ficheros. **Dos niveles suelen ser suficientes y tres ya son sospechosos.**

## La herencia se usa menos de lo que parece

En los tutoriales la herencia sale en todas partes y da la impresión de ser el centro de la programación con objetos. En el código real se usa bastante menos, y casi siempre hay una alternativa mejor: que **un objeto contenga a otro** en vez de heredarlo. Se llama **composición**.

```python
class Motor:
        def __init__(self, combustible, potencia_cv):
                self.combustible = combustible
        self.potencia_cv = potencia_cv

    def descripcion(self):
                return f"{self.potencia_cv} CV de {self.combustible}"


class Vehiculo:
        def __init__(self, matricula, motor):
                self.matricula = matricula
        self.motor = motor          # un vehículo TIENE un motor

    def ficha(self):
                return f"{self.matricula} · {self.motor.descripcion()}"


furgoneta = Vehiculo("1234 ABC", Motor("diésel", 130))
print(furgoneta.ficha())
```

```salida
1234 ABC · 130 CV de diésel
```

Aquí no hay `VehiculoDiesel`, `VehiculoGasolina` ni `VehiculoElectrico`: hay un vehículo con un motor dentro, y el motor se cambia sin tocar la clase `Vehiculo`. Con herencia, en cuanto cruzas dos ejes de variación (combustible y tipo de carrocería) te salen seis clases, y con tres ejes, veintisiete.

|  | Herencia | Composición |
| --- | --- | --- |
| La frase que la justifica | "Una furgoneta **es un** vehículo" | "Un vehículo **tiene un** motor" |
| Qué une | Clase hija a clase padre, para siempre | Dos objetos, y se puede cambiar en marcha |
| Cuándo va bien | Pocas variantes de lo mismo, con código común | Piezas que se combinan |
| Riesgo | Cambiar el padre rompe a todas las hijas | Algo más de código para conectar las piezas |

> [!consejo] Prefiere la composición
>
> Es un consejo tan repetido que tiene nombre propio: *composition over inheritance*. No significa que la herencia sea mala, sino que es la opción más rígida de las dos y conviene reservarla para cuando de verdad hay una relación de "es un" con código común que aprovechar.

> [!resumen] En resumen
>
> Con `class Hija(Padre):` una clase hereda de otra todos sus métodos, atributos de clase y su `__init__`, y puede añadir lo suyo o sobrescribir lo que necesite. `super()` da acceso a la versión del padre y es imprescindible en `__init__`, porque definir uno en la hija sustituye al del padre en vez de sumarse. `isinstance()` tiene en cuenta la herencia y por eso se prefiere a comparar con `type()`. El polimorfismo consiste en que clases distintas respondan al mismo método, lo que permite recorrerlas en un bucle sin preguntar de qué tipo son. Y aunque la herencia se explique mucho, en el código real conviene menos de lo que parece: cuando la relación es "tiene un" y no "es un", es mejor que un objeto contenga a otro.

> [!ejercicio] Practica
>
> Crea un fichero `56-herencia.py` y resuelve:
>
> 1. Escribe una clase `Empleado` con `nombre`, `salario_base` y un método `nomina()` que devuelva el salario base. Crea una hija `Comercial` que añada `ventas` y sobrescriba `nomina()` para sumar un 3% de las ventas.
> 2. Añade una hija `Directivo` con un atributo `bonus_anual` y su propio `nomina()`. Usa `super().nomina()` en las dos hijas en vez de repetir el cálculo del padre.
> 3. Mete cuatro empleados de tipos distintos en una lista y recorre el bucle imprimiendo nombre y nómina en columnas alineadas. Comprueba que el bucle no pregunta por el tipo de nadie.
> 4. Escribe en la hija un `__init__` **sin** llamar a `super().__init__()`, ejecuta, lee el `AttributeError` y arréglalo.
> 5. Comprueba con `isinstance()` y con `type(x) == Clase` que un `Comercial` es un `Empleado`. Explica en un comentario por qué dan resultados distintos.
> 6. Rehaz el ejercicio 1 con composición: una clase `Contrato` que guarde el salario base y el tipo de complemento, y una clase `Empleado` que tenga un contrato dentro. Compara los dos diseños en tres líneas de comentario.
