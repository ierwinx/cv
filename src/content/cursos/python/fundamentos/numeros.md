---
titulo: "Números y operaciones"
resumen: "Enteros y decimales, los siete operadores aritméticos, el orden en que se aplican y por qué 0.1 + 0.2 no da exactamente 0.3."
minutos: 12
orden: 2
---

## Dos tipos de número

Python distingue entre números enteros y números con decimales:

```python
unidades = 12        # int, un número entero
precio = 19.99       # float, un número con decimales
```

| Tipo | Nombre en Python | Ejemplos |
| --- | --- | --- |
| Entero | `int` | `0`, `42`, `-7`, `1000000` |
| Decimal | `float` | `3.14`, `-0.5`, `19.99`, `2.0` |

Fíjate en que `2` y `2.0` son distintos para Python: el primero es un `int` y el segundo un `float`, aunque valgan lo mismo. Puedes comprobar el tipo de cualquier cosa con la función `type()`:

```python
print(type(12))
print(type(19.99))
```

```salida
<class 'int'>
<class 'float'>
```

> [!nota] El separador decimal es el punto
>
> En Python, y en programación en general, se escribe `19.99`, nunca `19,99`. La coma tiene otro significado: separa elementos de una lista. Si escribes `precio = 19,99` no obtendrás un error, obtendrás algo bastante distinto de lo que esperabas.

> [!consejo] Guiones bajos para números largos
>
> `1000000` es difícil de leer de un vistazo. Python permite escribir `1_000_000`, con guiones bajos como separadores de millares. Se ignoran por completo al ejecutar, son solo para tus ojos.

## Los siete operadores

```python
a = 17
b = 5

print(a + b)    # suma
print(a - b)    # resta
print(a * b)    # multiplicación
print(a / b)    # división
print(a // b)   # división entera
print(a % b)    # resto o módulo
print(a ** b)   # potencia
```

```salida
22
12
85
3.4
3
2
1419857
```

Los cuatro primeros no necesitan explicación. Los tres últimos sí:

### La división siempre da decimales

```python
print(10 / 2)
```

```salida
5.0
```

Aunque el resultado sea exacto, `/` devuelve **siempre** un `float`. Nunca un entero. Es un detalle que sorprende al principio.

### División entera: cuántas veces cabe

`//` descarta la parte decimal y te da solo el cociente entero:

```python
print(17 // 5)     # 5 cabe 3 veces en 17
print(7 // 2)
print(-7 // 2)     # ojo: redondea hacia abajo, no hacia cero
```

```salida
3
3
-4
```

### Módulo: lo que sobra

`%` te da el resto de esa división:

```python
print(17 % 5)      # 17 = 5*3 + 2, sobran 2
print(10 % 2)      # divisible: no sobra nada
print(7 % 2)
```

```salida
2
0
1
```

Parece un operador exótico y resulta ser de los más útiles del lenguaje. Dos usos que verás una y otra vez:

```python
numero = 14

# ¿Es par? Lo es si al dividir entre 2 no sobra nada.
print(numero % 2 == 0)

# Convertir 200 minutos en horas y minutos
minutos_totales = 200
horas = minutos_totales // 60
minutos = minutos_totales % 60
print(horas, "horas y", minutos, "minutos")
```

```salida
True
3 horas y 20 minutos
```

### Potencia

```python
print(2 ** 10)      # 2 elevado a 10
print(9 ** 0.5)     # elevar a 0.5 es la raíz cuadrada
```

```salida
1024
3.0
```

## El orden de las operaciones

Python respeta la prioridad matemática de toda la vida:

1. Paréntesis
2. Potencias `**`
3. Multiplicación, división, división entera y módulo `* / // %`
4. Suma y resta `+ -`

```python
print(2 + 3 * 4)        # primero multiplica: 2 + 12
print((2 + 3) * 4)      # los paréntesis mandan
```

```salida
14
20
```

> [!consejo] Usa paréntesis aunque no hagan falta
>
> `(base * altura) / 2` y `base * altura / 2` dan lo mismo, pero el primero se lee sin pensar. Nadie te va a reñir por poner paréntesis de más, y sí perderás tiempo depurando por ponerlos de menos.

## Mezclar enteros y decimales

Si operas un `int` con un `float`, el resultado es siempre `float`:

```python
print(3 + 0.5)
print(type(3 + 0.5))
print(4 * 2.0)
```

```salida
3.5
<class 'float'>
8.0
```

## La sorpresa de los decimales

Escribe esto en la consola interactiva:

```consola
>>> 0.1 + 0.2
0.30000000000000004
```

No es un fallo de Python: pasa en Java, en JavaScript, en C y en tu calculadora si tuviera suficientes dígitos. Los `float` se guardan en binario, y algunos decimales sencillos en base diez, como 0.1, no tienen representación exacta en binario, igual que 1/3 no tiene representación exacta en decimal.

Consecuencia práctica: **nunca compares dos decimales con `==`**.

```python
print(0.1 + 0.2 == 0.3)       # False, aunque parezca mentira
print(round(0.1 + 0.2, 2) == 0.3)   # True
```

> [!aviso] Para dinero, no uses float
>
> Si tu programa maneja euros y céntimos, los errores de redondeo se acumulan y acaban descuadrando cuentas. Las dos soluciones habituales son trabajar en céntimos con enteros, o usar el módulo `decimal` de la biblioteca estándar. Lo veremos en el módulo de aplicaciones de terminal, cuando construyamos una herramienta de gastos.

## Funciones numéricas incorporadas

No hay que importar nada para usarlas:

```python
print(abs(-7))            # valor absoluto
print(round(3.14159, 2))  # redondear a 2 decimales
print(round(2.5))         # ojo con el redondeo bancario: da 2, no 3
print(max(3, 9, 4))       # el mayor
print(min(3, 9, 4))       # el menor
print(pow(2, 10))         # igual que 2 ** 10
```

```salida
7
3.14
2
9
3
1024
```

> [!nota] Por qué round(2.5) da 2
>
> Python usa el llamado redondeo bancario: cuando el número está justo en la mitad, redondea al par más cercano. Así, `round(2.5)` da 2 y `round(3.5)` da 4. Evita sesgar las estadísticas al redondear muchos valores. No es un error.

Para operaciones más avanzadas está el módulo `math`, que sí hay que importar:

```python
import math

print(math.sqrt(16))      # raíz cuadrada
print(math.pi)
print(math.ceil(4.1))     # redondea siempre hacia arriba
print(math.floor(4.9))    # redondea siempre hacia abajo
```

```salida
4.0
3.141592653589793
5
4
```

> [!error] TypeError: unsupported operand type(s) for +: 'int' and 'str'
>
> Estás sumando un número con un texto. Ocurre casi siempre con datos que vienen de `input()`, que siempre entrega texto aunque el usuario escriba cifras. Se arregla convirtiendo con `int()` o `float()`, y lo veremos en la lección de conversión de tipos.

> [!resumen] En resumen
>
> `int` para enteros y `float` para decimales. Los operadores son `+ - * /` más `//` para la división entera, `%` para el resto y `**` para potencias. La división `/` devuelve siempre decimal. El módulo `%` sirve para saber si algo es par y para repartir cantidades. Los `float` tienen imprecisión binaria, así que no los compares con `==` ni los uses para dinero.

> [!ejercicio] Practica
>
> Crea `02-numeros.py` y resuelve:
>
> 1. Calcula el área de un círculo de radio 5 usando `math.pi`.
> 2. Convierte 10000 segundos a horas, minutos y segundos usando `//` y `%`, e imprímelo con formato legible.
> 3. Comprueba si 1234567 es par.
> 4. Un producto cuesta 45.90 euros y tiene un 21% de IVA. Calcula el precio final y redondéalo a dos decimales.
> 5. Reparte 100 caramelos entre 7 niños: cuántos toca a cada uno y cuántos sobran.
> 6. Ejecuta `0.1 + 0.2 + 0.3` en la consola. Después `round(0.1 + 0.2 + 0.3, 10)`. Observa la diferencia.
