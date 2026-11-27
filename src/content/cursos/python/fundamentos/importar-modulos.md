---
titulo: "Importar módulos"
resumen: "Cómo traer a tu programa código que ya está escrito, las cuatro formas de importar y dónde colocar las importaciones."
minutos: 12
orden: 40
---

Python trae de serie unas doscientas bibliotecas listas para usar: matemáticas, fechas, azar, ficheros, red, bases de datos, compresión. Se llama la **biblioteca estándar**, está instalada en tu ordenador desde el primer día y es la razón de que se hable de Python como un lenguaje "con las pilas incluidas".

Pero no está todo disponible de golpe. Si lo estuviera, cada programa arrancaría cargando cientos de miles de líneas que no va a usar y tendrías miles de nombres ocupados. Por eso hay que pedir explícitamente lo que necesitas, y eso es importar.

## Qué es un módulo

Un módulo es, literalmente, **un fichero de Python**. `math` es un fichero que alguien escribió con funciones matemáticas dentro; `random`, otro con funciones de azar. Cuando lo importas, Python lo ejecuta una vez y te da acceso a todo lo que ha quedado definido en él: funciones, constantes y lo que haya.

Un **paquete** es una carpeta con varios módulos dentro, como `datetime` o, más adelante, `django`. A efectos de uso se comportan igual.

## `import modulo`

La forma básica. Trae el módulo entero y se accede a su contenido con un punto:

```python
import math

print(math.pi)
print(math.sqrt(144))
print(math.ceil(4.2))
print(math.floor(4.8))
```

```salida
3.141592653589793
12.0
5
4
```

El punto se lee como "de": `math.sqrt` es "la raíz cuadrada de math". No es un detalle cosmético, es lo que deja claro de dónde viene cada cosa. Cuando en un fichero de trescientas líneas lees `math.floor(x)`, sabes exactamente dónde buscarlo.

Si olvidas el prefijo, Python no encuentra el nombre:

```python
import math

print(sqrt(144))
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/calculos.py", line 3, in <module>
    print(sqrt(144))
          ^^^^
NameError: name 'sqrt' is not defined
```

> [!error] NameError: name 'sqrt' is not defined
>
> Has importado el módulo pero estás usando la función sin decir de dónde sale. Escribe `math.sqrt(144)`, o cambia la importación por `from math import sqrt`.

## `from modulo import cosa`

Trae solo lo que le pides, y lo deja disponible directamente, sin prefijo:

```python
from math import sqrt, pi

print(sqrt(144))
print(pi)
```

```salida
12.0
3.141592653589793
```

Es cómodo cuando usas dos o tres cosas de un módulo muchas veces. A cambio pierdes la pista de su origen: quien lea `sqrt(144)` a mitad del fichero tiene que subir hasta las importaciones para saber de dónde viene. Con módulos muy conocidos no pasa nada; con módulos oscuros, mejor el prefijo.

## `import modulo as alias`

Le pone un nombre más corto, o distinto si el original choca con algo tuyo:

```python
import datetime as dt

hoy = dt.date(2026, 3, 15)
print(hoy)
print(hoy.year, hoy.month, hoy.day)
```

```salida
2026-03-15
2026 3 15
```

Hay alias que son prácticamente estándar y conviene respetar porque todo el mundo los reconoce: `import numpy as np`, `import pandas as pd`, `import matplotlib.pyplot as plt`. Inventarse alias propios para módulos con nombre corto, en cambio, solo confunde.

También funciona con `from`: `from datetime import datetime as FechaHora`.

## `from modulo import *`

Trae **todo** el contenido del módulo sin prefijo. Está permitido y es mala idea:

```python
print(pow(2, 10))

from math import *

print(pow(2, 10))
```

```salida
1024
1024.0
```

La misma llamada da dos resultados distintos según en qué línea esté. El asterisco ha traído `math.pow`, que devuelve un decimal, y ha tapado la función `pow` que Python trae de serie, que devuelve un entero. Aquí la diferencia es leve; con otros nombres te cambia el comportamiento del programa sin un solo aviso.

> [!aviso] Nunca uses el asterisco
>
> Los problemas son tres. No sabes qué nombres acabas de traer, y pueden ser docenas. Cualquiera de ellos puede pisar una variable o función tuya, o de otro módulo importado más abajo, y gana el último. Y quien lea el código no tiene forma de saber de dónde sale cada nombre, ni el editor de autocompletarlo bien.
>
> Es aceptable en la consola interactiva, cuando estás probando cosas y nada importa. En un fichero, no.

## Dónde van las importaciones

PEP 8 es concreto: **todas juntas, al principio del fichero**, justo después del docstring y antes de cualquier otra cosa. Una por línea, y en tres grupos separados por una línea en blanco:

```python title="mi_programa.py"
"""Informe mensual de ventas."""

import math
import random
from datetime import date

import requests

from utilidades import calcular_iva, formatear_euros

IVA_GENERAL = 0.21
```

| Grupo | Qué contiene |
| --- | --- |
| 1 | Módulos de la biblioteca estándar: `math`, `random`, `datetime`, `os`... |
| 2 | Paquetes de terceros, los que instalas con `pip` |
| 3 | Módulos tuyos, de tu propio proyecto |

Dentro de cada grupo se ordenan alfabéticamente, y por costumbre los `import modulo` van antes que los `from modulo import cosa`.

Técnicamente puedes importar en cualquier punto del fichero, incluso dentro de una función, pero salvo casos muy concretos no hay motivo: al tenerlas todas arriba, cualquiera ve de un vistazo de qué depende tu programa.

> [!nota] Importar dos veces no cuesta nada
>
> Python guarda los módulos ya importados en memoria. Si importas `math` en tres ficheros distintos de tu proyecto, el módulo se ejecuta una sola vez y las demás importaciones reutilizan el que ya está cargado. No tengas miedo de repetir un `import` donde haga falta.

## Tres módulos para ver el mecanismo

### `math`

Operaciones matemáticas que no están en los operadores básicos:

```python
import math

print(math.sqrt(144))
print(math.trunc(4.8))
print(math.hypot(3, 4))
print(math.isclose(0.1 + 0.2, 0.3))
print(0.1 + 0.2 == 0.3)
```

```salida
12.0
4
5.0
True
False
```

Las dos últimas líneas resuelven un problema que viste en la lección de números: los decimales no se pueden comparar con `==` porque arrastran una imprecisión mínima. `math.isclose` compara admitiendo esa tolerancia, y es lo que hay que usar siempre con `float`.

### `random`

Azar. Muy útil para juegos, pruebas y datos de ejemplo:

```python
import random

random.seed(7)
print(random.randint(1, 6))
print(random.choice(["Madrid", "Sevilla", "Bilbao"]))

baraja = ["as", "dos", "tres", "cuatro", "cinco"]
random.shuffle(baraja)
print(baraja)
print(random.sample(baraja, 2))
```

```salida
3
Madrid
['dos', 'tres', 'cinco', 'as', 'cuatro']
['cinco', 'dos']
```

`randint(1, 6)` da un entero entre 1 y 6, **incluidos los dos extremos**, a diferencia de `range`. `choice` saca un elemento al azar, `shuffle` desordena la lista en su sitio y no devuelve nada, y `sample` extrae varios sin repetir.

> [!nota] Por qué sale siempre lo mismo
>
> `random.seed(7)` fija el punto de partida del generador, así que la secuencia de números "al azar" es siempre idéntica. Lo he puesto para que la salida de arriba sea reproducible y puedas comprobarla. En un programa real no se pone, y entonces cada ejecución da resultados distintos. Fijar la semilla es la forma normal de poder repetir una prueba con los mismos datos aleatorios.

### `datetime`

Fechas y horas. Aquí se importan clases, no funciones, pero se usan igual:

```python
from datetime import date, timedelta

hoy = date(2026, 3, 15)
plazo = timedelta(days=30)
vencimiento = hoy + plazo

print(vencimiento)
print(f"{vencimiento:%d/%m/%Y}")
print((vencimiento - hoy).days)
```

```salida
2026-04-14
14/04/2026
30
```

`date.today()` te da la fecha de hoy, pero aquí he puesto una fija para que la salida sea siempre la misma. Sumar un `timedelta` a una fecha da otra fecha, y restar dos fechas da un `timedelta` del que se puede sacar `.days`. Todo el lío de los meses de distinta duración y los años bisiestos está resuelto dentro.

El formato dentro de la f-string usa los códigos habituales: `%d` día, `%m` mes, `%Y` año de cuatro cifras, `%H:%M` hora y minutos.

## Cuando el módulo no existe

```python
import pandas
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/informe.py", line 1, in <module>
    import pandas
ModuleNotFoundError: No module named 'pandas'
```

> [!error] ModuleNotFoundError: No module named 'pandas'
>
> Hay tres causas posibles, en este orden de probabilidad:
>
> - **Una errata.** `import mathh`, `import datetimes`. Compruébalo primero, es lo más frecuente.
> - **El módulo no es de la biblioteca estándar** y no lo has instalado. Se instala desde el terminal con `pip install pandas`.
> - **Es un fichero tuyo** y no está en la misma carpeta desde la que ejecutas el programa. De eso va la próxima lección.

> [!resumen] En resumen
>
> Un módulo es un fichero de Python con código ya escrito que se trae al tuyo con `import`. Con `import modulo` accedes a su contenido con el punto, lo que deja claro de dónde sale cada cosa; con `from modulo import cosa` traes solo lo que necesitas y sin prefijo; con `import modulo as alias` le cambias el nombre. El asterisco de `from modulo import *` trae todo a ciegas y puede pisar nombres tuyos, así que no se usa. Las importaciones van todas al principio del fichero, una por línea, en tres grupos: biblioteca estándar, paquetes de terceros y módulos propios. Si Python no encuentra el módulo, lanza un `ModuleNotFoundError`.

> [!ejercicio] Practica
>
> Crea un fichero `40-modulos.py` y resuelve:
>
> 1. Importa `math` y calcula el área de un círculo de radio 3.5 usando `math.pi`. Imprímela con dos decimales.
> 2. Haz lo mismo importando solo `pi` con `from math import pi`. Compara las dos versiones.
> 3. Escribe un programa que tire dos dados con `random.randint` y sume el resultado. Ejecútalo cinco veces y comprueba que cambia. Después añade `random.seed(1)` al principio y vuelve a ejecutarlo cinco veces.
> 4. Con `random.sample`, genera una combinación de seis números distintos entre 1 y 49 y muéstralos ordenados.
> 5. Calcula cuántos días faltan desde hoy, con `date.today()`, hasta el 31 de diciembre de este año.
> 6. Importa un módulo inventado y lee el `ModuleNotFoundError`. Después importa `math` sin el prefijo al usarlo y lee el `NameError`.
