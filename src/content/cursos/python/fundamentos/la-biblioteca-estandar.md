---
titulo: "La biblioteca estándar"
resumen: "Recorrido práctico por los módulos que ya vienen instalados con Python y que te ahorran escribir código desde cero."
minutos: 14
orden: 42
---

Cuando instalaste Python no instalaste solo el intérprete. Con él vinieron unos doscientos módulos listos para usar: para trabajar con fechas, generar números al azar, medir tiempos, leer ficheros comprimidos, hablar por red o calcular medias. Esa colección se llama la **biblioteca estándar**, y de ahí viene la frase con la que se describe a Python desde los años noventa: *batteries included*, con las pilas puestas.

Esto importa más de lo que parece. Antes de escribir una función para calcular los días que hay entre dos fechas, o para barajar una lista, para en seco y comprueba si ya existe. Casi siempre existe, está mejor probada que la tuya y no tienes que mantenerla.

## Fechas y horas con datetime

El módulo `datetime` es el que más vas a usar de los que vienen aquí. Tiene dos piezas principales: `date`, que guarda solo día, mes y año, y `datetime`, que además lleva la hora.

```python
from datetime import date

hoy = date.today()
print(hoy)
print(f"Día {hoy.day}, mes {hoy.month}, año {hoy.year}")
```

```salida
2026-09-19
Día 19, mes 9, año 2026
```

> [!nota] Esta salida cambiará en tu ordenador
>
> Todos los ejemplos de este apartado que usan `today()` o `now()` dependen del día en que los ejecutes, así que verás fechas distintas a las de aquí. Los que usan fechas fijas sí dan siempre lo mismo.

### Dar formato con strftime

Por defecto una fecha se imprime en formato internacional, `año-mes-día`. Para mostrarla como se escribe en España tienes `strftime()`, que recibe una plantilla con códigos que empiezan por `%`:

```python
from datetime import datetime

ahora = datetime.now()

print(ahora.strftime("%d/%m/%Y"))
print(ahora.strftime("%H:%M"))
print(ahora.strftime("%d/%m/%Y a las %H:%M"))
```

```salida
19/09/2026
13:38
19/09/2026 a las 13:38
```

Los códigos que necesitarás casi siempre son estos:

| Código | Significado | Ejemplo |
| --- | --- | --- |
| `%d` | Día con dos cifras | `07` |
| `%m` | Mes con dos cifras | `03` |
| `%Y` | Año con cuatro cifras | `2026` |
| `%y` | Año con dos cifras | `26` |
| `%H` | Hora de 0 a 23 | `14` |
| `%M` | Minutos | `05` |
| `%S` | Segundos | `42` |
| `%A` | Nombre del día | `Monday` |
| `%B` | Nombre del mes | `March` |

> [!aviso] Los nombres salen en inglés
>
> `%A` y `%B` usan el idioma del sistema, que en Python por defecto es el inglés, así que `strftime("%B")` te dará `September` y no `septiembre`. Si necesitas los nombres en castellano, lo más sencillo y predecible es tener tu propia lista de meses e indexarla con `fecha.month - 1`.

### Restar fechas

Restar dos fechas no da un número, da una **duración**: un `timedelta`. De ahí sacas los días con `.days`.

```python
from datetime import date, timedelta

inicio_curso = date(2026, 1, 15)
fin_curso = date(2026, 6, 30)

duracion = fin_curso - inicio_curso
print(duracion)
print(duracion.days)

entrega = inicio_curso + timedelta(days=45)
print(entrega)
print(entrega.strftime("%d/%m/%Y"))
```

```salida
166 days, 0:00:00
166
2026-03-01
01/03/2026
```

Fíjate en la segunda parte: sumar un `timedelta` a una fecha te da otra fecha, y Python se encarga solo de los meses de distinta longitud y de los años bisiestos. Calcular "45 días después del 15 de enero" a mano sería un pequeño infierno.

```python
from datetime import date

nacimiento = date(1995, 7, 23)
hoy = date(2026, 3, 1)

dias_vividos = (hoy - nacimiento).days
print(f"Has vivido {dias_vividos} días, unos {dias_vividos // 365} años")
```

```salida
Has vivido 11179 días, unos 30 años
```

## Azar con random

`random` genera números y elecciones al azar. Es el módulo de los juegos, los sorteos y los datos de prueba.

```python
import random

print(random.randint(1, 6))

colores = ["rojo", "verde", "azul", "amarillo"]
print(random.choice(colores))

baraja = ["as", "dos", "tres", "cuatro", "cinco"]
random.shuffle(baraja)
print(baraja)

print(random.sample(range(1, 50), 6))
print(random.random())
```

```salida
1
rojo
['dos', 'cuatro', 'tres', 'as', 'cinco']
[42, 40, 29, 37, 4, 11]
0.899376415846804
```

Esta salida es la de una ejecución concreta: la tuya será distinta, y la siguiente vez también. Las cuatro funciones que más se usan son:

- `randint(a, b)` devuelve un entero entre `a` y `b`, **incluidos los dos extremos**. Ojo con esto, porque `range()` funciona al revés y deja fuera el final.
- `choice(secuencia)` elige un elemento al azar de una lista, una tupla o una cadena.
- `shuffle(lista)` baraja la lista **en el sitio**: modifica la original y devuelve `None`. Si escribes `baraja = random.shuffle(baraja)` te quedas sin lista.
- `sample(poblacion, k)` saca `k` elementos distintos sin repetir, que es justo lo que necesita un sorteo o una lotería.

> [!aviso] random no sirve para seguridad
>
> Los números de `random` no son de verdad impredecibles: se calculan con una fórmula a partir de un valor inicial, y alguien que vea unos cuantos resultados puede deducir los siguientes. Para un juego o para datos de prueba está perfecto. Para contraseñas, claves o identificadores de sesión existe el módulo `secrets`, que se usa igual (`secrets.choice`, `secrets.randbelow`) y sí es criptográficamente seguro.

## Tiempos con time

`time` hace dos cosas que necesitarás pronto: pausar el programa y medir cuánto tarda algo.

```python
import time

print("Preparando el envío...")
time.sleep(2)
print("Enviado")

inicio = time.perf_counter()
total = 0
for numero in range(1_000_000):
        total += numero * numero
fin = time.perf_counter()

print(f"El cálculo ha tardado {fin - inicio:.3f} segundos")
```

```salida
Preparando el envío...
Enviado
El cálculo ha tardado 0.121 segundos
```

`sleep()` recibe segundos y admite decimales: `time.sleep(0.5)` espera medio segundo. `perf_counter()` devuelve un número de segundos que por sí solo no significa nada; lo único útil es **la diferencia entre dos llamadas**. El tiempo que te salga a ti dependerá de tu ordenador.

> [!consejo] Mide antes de optimizar
>
> Cuando un programa te parezca lento, no adivines qué parte tiene la culpa. Rodea los trozos sospechosos con `perf_counter()` y mira los números. Casi siempre el cuello de botella está donde no lo esperabas.

## Estadística con statistics

Calcular una media a mano es fácil, pero la mediana ya obliga a ordenar y a distinguir entre longitud par e impar. El módulo `statistics` lo tiene resuelto:

```python
import statistics

notas = [4.5, 7.0, 8.25, 6.0, 9.5, 5.5, 7.0]

print(statistics.mean(notas))
print(statistics.median(notas))
print(statistics.mode(notas))
print(round(statistics.stdev(notas), 2))
```

```salida
6.821428571428571
7.0
7.0
1.69
```

`mean()` es la media aritmética, `median()` el valor central una vez ordenados, `mode()` el que más se repite y `stdev()` la desviación típica. Para mostrar una media por pantalla, redondéala con una f-string: `f"{statistics.mean(notas):.2f}"`.

## Contar cosas con Counter

Contar cuántas veces aparece cada elemento de una lista es tan habitual que tiene su propia herramienta dentro del módulo `collections`. Se llama `Counter` y funciona como un diccionario que se rellena solo:

```python
from collections import Counter

votos = ["python", "java", "python", "rust", "python", "java", "go"]
recuento = Counter(votos)

print(recuento)
print(recuento["python"])
print(recuento["cobol"])
print(recuento.most_common(2))
```

```salida
Counter({'python': 3, 'java': 2, 'rust': 1, 'go': 1})
3
0
[('python', 3), ('java', 2)]
```

Dos detalles que lo hacen cómodo: preguntar por una clave que no existe devuelve `0` en vez de dar `KeyError`, y `most_common(n)` te entrega los `n` más frecuentes ya ordenados de mayor a menor, en una lista de tuplas que puedes desempaquetar en un `for`.

```python
from collections import Counter

frase = "programar es repetir hasta que salga"
letras = Counter(frase.replace(" ", ""))
print(letras.most_common(3))
```

```salida
[('a', 6), ('r', 5), ('e', 4)]
```

## os y sys, el sistema por debajo

Estos dos módulos son la puerta hacia el sistema operativo y hacia el propio intérprete. Por ahora te basta con saber que existen y con cuatro cosas de cada uno.

`os` habla con el sistema: carpeta actual, variables de entorno, nombre de la plataforma.

```python
import os

print(os.getcwd())
print(os.name)
print(os.environ.get("EDITOR", "no definido"))
```

```salida
/Users/erwin/curso-python
posix
no definido
```

`os.name` vale `posix` en macOS y Linux, y `nt` en Windows. `os.environ` es un diccionario con las variables de entorno, y como es un diccionario tiene `get()` con valor por defecto.

`sys` habla del programa en ejecución: los argumentos con los que se ha lanzado y la versión del intérprete.

```python title="argumentos.py"
import sys

print(sys.platform)
print(sys.argv)
```

Ejecutado desde la terminal con dos palabras detrás:

```bash
python3 argumentos.py informe.csv --detallado
```

```salida
darwin
['argumentos.py', 'informe.csv', '--detallado']
```

`sys.argv` es una lista donde el primer elemento es siempre el nombre del propio fichero, y a partir del segundo vienen los argumentos que escribió quien lo ejecuta. Es la base de los programas de terminal, y tiene módulo propio más adelante en el curso.

> [!nota] Para rutas y ficheros, pathlib
>
> Verás mucho código antiguo que usa `os.path.join` y `os.listdir` para trabajar con rutas. Sigue funcionando, pero hoy se prefiere `pathlib`, que es más legible y tiene su propia lección un poco más adelante.

## Tabla de referencia

| Módulo | Para qué sirve | Ejemplo |
| --- | --- | --- |
| `datetime` | Fechas, horas y cálculos entre ellas | `date.today().strftime("%d/%m/%Y")` |
| `random` | Números y elecciones al azar | `random.randint(1, 6)` |
| `secrets` | Azar seguro para contraseñas y claves | `secrets.randbelow(100)` |
| `time` | Pausas y medición de tiempos | `time.sleep(1.5)` |
| `statistics` | Media, mediana, moda, desviación | `statistics.mean(notas)` |
| `collections` | Estructuras extra, como `Counter` | `Counter(palabras).most_common(3)` |
| `math` | Raíces, potencias, redondeos, pi | `math.sqrt(144)` |
| `os` | Carpetas, entorno, sistema operativo | `os.getcwd()` |
| `sys` | Argumentos y datos del intérprete | `sys.argv` |
| `pathlib` | Rutas de ficheros y carpetas | `Path("datos") / "notas.txt"` |
| `json` | Leer y escribir JSON | `json.dumps(configuracion)` |
| `csv` | Leer y escribir ficheros de hoja de cálculo | `csv.DictReader(fichero)` |

> [!consejo] La documentación oficial es la referencia
>
> Todo esto está descrito en [docs.python.org/es/3/library](https://docs.python.org/es/3/library/index.html), buena parte traducida al castellano. Cuando dudes de qué devuelve una función o qué parámetros acepta, es la fuente que no se equivoca ni se queda anticuada.

> [!error] AttributeError: module 'random' has no attribute 'ramdom'
>
> Has escrito mal el nombre de la función del módulo. El mensaje completo suele terminar con `Did you mean: 'random'?`, que te da la pista exacta. El mismo error sale, sin sugerencia, si llamas a tu propio fichero `random.py`: en ese caso Python importa tu fichero en vez del módulo de verdad y ninguna función está donde debería. Nunca pongas a un fichero tuyo el nombre de un módulo de la biblioteca estándar.

> [!resumen] En resumen
>
> Python trae unos doscientos módulos ya instalados, y usarlos es mejor que reinventarlos. `datetime` maneja fechas, las formatea con `strftime` y las resta dando un `timedelta`. `random` sortea y baraja, pero no sirve para seguridad, que es cosa de `secrets`. `time` pausa con `sleep` y mide con `perf_counter`. `statistics` calcula medias y medianas, y `Counter` cuenta apariciones y te las ordena con `most_common`. `os` y `sys` son la puerta al sistema y al propio intérprete. Antes de escribir una función, mira si ya está hecha.

> [!ejercicio] Practica
>
> Crea `42-biblioteca.py` y resuelve:
>
> 1. Muestra la fecha de hoy en formato `dd/mm/aaaa` y, debajo, cuántos días faltan para el 31 de diciembre de este año.
> 2. Pide una fecha de nacimiento por teclado (día, mes y año por separado) y calcula cuántos días has vivido.
> 3. Simula 1000 tiradas de un dado con `randint` y cuenta con `Counter` cuántas veces ha salido cada cara. ¿Se parecen los seis números?
> 4. Escribe un sorteo que elija tres ganadores distintos de una lista de participantes, sin que nadie pueda salir dos veces.
> 5. Mide con `perf_counter` cuánto tarda en sumar los cuadrados del 1 al millón, primero con un bucle `for` y después con `sum()` sobre una comprensión de lista. Compara los dos tiempos.
> 6. Dada una lista de notas, muestra la media y la mediana con dos decimales y di cuál de las dos representa mejor al grupo si añades un 0 a la lista.
