---
titulo: "Docstrings y anotaciones de tipo"
resumen: "Cómo documentar una función para que se explique sola y cómo declarar qué tipos espera y qué devuelve."
minutos: 11
orden: 38
---

Cuando llamas a `round(3.14159, 2)` no vas a leer el código fuente de `round` para saber qué hace el segundo argumento. Te fías de su documentación. Tus funciones merecen el mismo trato, sobre todo la tuya de dentro de tres meses, que no se acordará de nada.

Python tiene dos mecanismos para esto y los dos viven dentro del propio código: el **docstring**, que explica en palabras, y las **anotaciones de tipo**, que dicen con qué datos trabaja la función.

## El docstring

Ya lo viste en la lección de estilo aplicado a un fichero entero. En una función es lo mismo: un texto entre triples comillas, colocado como **primera línea del cuerpo**, justo debajo del `def`.

```python
def calcular_iva(precio):
        """Devuelve el IVA general español de un precio sin impuestos."""
    return precio * 0.21
```

Tiene que ir ahí, en la primera línea. Si lo pones encima del `def` es un comentario suelto; si lo pones en la tercera línea es una cadena que Python evalúa y tira. En ninguno de los dos casos será un docstring de verdad.

La diferencia con un comentario `#` es que el docstring **no se descarta**. Python lo guarda con la función y se puede consultar en tiempo de ejecución.

## Consultarlo

Desde la consola interactiva, con `help()`:

```consola
>>> help(calcular_iva)
Help on function calcular_iva in module __main__:

calcular_iva(precio)
    Devuelve el IVA general español de un precio sin impuestos.

>>> calcular_iva.__doc__
'Devuelve el IVA general español de un precio sin impuestos.'
```

`help()` te enseña además la firma de la función, con sus parámetros y sus valores por defecto, que muchas veces es la mitad de lo que necesitabas saber. Funciona con cualquier función, tuya o no: prueba `help(sorted)` o `help(str.strip)` y verás que todo lo que has estado consultando en internet estaba también aquí.

`.__doc__` te da el texto en crudo, útil si quieres imprimirlo desde el propio programa.

## Cómo se escribe

La convención, que es PEP 257, es sencilla:

- **Una primera línea corta** que resuma qué hace la función, empezando por un verbo en tercera persona: "Devuelve...", "Calcula...", "Comprueba...". Termina en punto.
- Si hace falta más, **una línea en blanco** y después los párrafos que necesites.
- Las comillas de cierre de un docstring de varias líneas van en su propia línea.

```python
def calcular_envio(peso, ciudad, urgente=False):
        """Calcula el coste de envío de un paquete en euros.

    Parámetros:
        peso: peso del paquete en kilogramos.
        ciudad: ciudad de destino, en minúsculas.
        urgente: si es True, se aplica un recargo del 50 %.

    Devuelve:
        El coste total del envío como número decimal.
    """
    coste = 3.0 + peso * 1.2
    if ciudad == "las palmas":
                coste += 8.0
    if urgente:
                coste *= 1.5
    return coste
```

Al pedir ayuda, sale todo con la sangría respetada:

```python
help(calcular_envio)
```

```salida
Help on function calcular_envio in module __main__:

calcular_envio(peso, ciudad, urgente=False)
    Calcula el coste de envío de un paquete en euros.

    Parámetros:
        peso: peso del paquete en kilogramos.
        ciudad: ciudad de destino, en minúsculas.
        urgente: si es True, se aplica un recargo del 50 %.

    Devuelve:
        El coste total del envío como número decimal.
```

> [!consejo] Documenta el contrato, no la implementación
>
> El docstring cuenta **qué** hace la función, qué espera recibir y qué entrega, es decir, todo lo que necesita quien la usa sin abrirla. Cómo lo hace por dentro ya está en el código; si ese código necesita explicación, eso son comentarios `#` dentro del cuerpo. Y si al documentar una función te sale un docstring larguísimo lleno de excepciones y casos, la función hace demasiado.

> [!nota] No hace falta documentarlo todo
>
> Una función de tres líneas llamada `es_mayor_de_edad(edad)` no necesita un párrafo explicando que comprueba si alguien es mayor de edad. Eso es ruido. El docstring merece la pena cuando hay algo que el nombre y la firma no cuentan: unidades, formatos esperados, casos límite, de dónde salen los números mágicos.

## Anotaciones de tipo

Las anotaciones dicen de qué tipo es cada parámetro y qué tipo se devuelve. Van con dos puntos detrás del parámetro y con una flecha `->` antes de los dos puntos finales:

```python
def calcular_iva(precio: float) -> float:
        """Devuelve el IVA general español de un precio sin impuestos."""
    return precio * 0.21
```

Se lee bien: recibe un `float` llamado `precio` y devuelve un `float`. La firma que enseña `help()` las incluye:

```python
help(calcular_iva)
```

```salida
Help on function calcular_iva in module __main__:

calcular_iva(precio: float) -> float
    Devuelve el IVA general español de un precio sin impuestos.
```

Los tipos que ya conoces se escriben tal cual, y para las colecciones se dice también qué llevan dentro:

| Anotación | Significa |
| --- | --- |
| `int`, `float`, `str`, `bool` | Los tipos básicos |
| `list[str]` | Una lista de cadenas |
| `list[float]` | Una lista de números decimales |
| `dict[str, int]` | Un diccionario de cadenas a enteros |
| `tuple[float, int]` | Una tupla de un decimal y un entero, en ese orden |
| `-> None` | La función no devuelve nada útil |

```python
def resumir_notas(notas: list[float], aprobado: float = 5.0) -> tuple[float, int]:
        """Devuelve la nota media y cuántas notas llegan al aprobado."""
    media = sum(notas) / len(notas)
    aprobadas = len([nota for nota in notas if nota >= aprobado])
    return media, aprobadas


print(resumir_notas([7, 9, 4, 5.5]))
```

```salida
(6.375, 3)
```

Fíjate en cómo se combina una anotación con un valor por defecto: `aprobado: float = 5.0`, con espacios alrededor del `=`. Sin anotación se escribe pegado, `aprobado=5.0`. Es una rareza de PEP 8, pero es la correcta.

## Python no comprueba nada

Esto es lo que más sorprende: las anotaciones son **decorativas** en tiempo de ejecución. Python las guarda y no hace absolutamente nada con ellas.

```python
def calcular_iva(precio: float) -> float:
        return precio * 0.21


print(calcular_iva("hola"))
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/iva.py", line 5, in <module>
    print(calcular_iva("hola"))
          ~~~~~~~~~~~~^^^^^^^^
  File "/Users/erwin/curso-python/iva.py", line 2, in calcular_iva
    return precio * 0.21
           ~~~~~~~^~~~~~
TypeError: can't multiply sequence by non-int of type 'float'
```

El error no dice nada de la anotación. Es el `TypeError` de siempre, producido por la multiplicación, y salta **dentro** de la función, no al llamarla. Python ha dejado pasar la cadena sin rechistar.

> [!aviso] Una anotación no valida datos
>
> Si esperabas que `precio: float` rechazase un texto, olvídalo. Anotar un parámetro no sustituye a comprobar lo que llega, y menos aún cuando el dato viene de un `input()`. Las anotaciones son para las personas y las herramientas, no una red de seguridad en ejecución.

## Entonces, ¿para qué sirven?

Para tres cosas muy concretas, y las tres importan:

- **El editor.** Visual Studio Code, con la extensión de Python, usa las anotaciones para autocompletar. Si un parámetro está anotado como `str`, al escribir `nombre.` te ofrece los métodos de cadena; sin anotación, no puede saberlo y no te ofrece nada. También te subraya en el momento las llamadas con tipos imposibles.
- **Documentación que no miente.** Un docstring que diga "recibe una lista de números" se queda obsoleto en silencio. Una anotación `list[float]` está en la firma, se ve en `help()` y salta a la vista al leer.
- **Comprobadores estáticos.** Programas que leen tu código sin ejecutarlo y avisan de las incoherencias de tipos.

## Anotar variables

También se pueden anotar las variables normales, con la misma sintaxis de dos puntos:

```python
nombre: str = "Ana"
precios: list[float] = []
stock: dict[str, int] = {"camiseta": 12}
```

Con `nombre: str = "Ana"` la anotación no aporta gran cosa, porque el valor ya lo dice todo. Donde sí sirve es en los casos como `precios: list[float] = []`, donde la lista vacía no revela qué va a contener.

## `mypy`

El comprobador estático más extendido. Se instala y se ejecuta desde el terminal:

```bash
pip install mypy
mypy mi_programa.py
```

Lee el fichero sin ejecutarlo y te avisa de cosas como pasarle una cadena a un parámetro anotado como `float`, olvidarte de que una función puede devolver `None` o guardar un entero donde dijiste que iba una lista. Es como tener un revisor que lee todo el programa antes de que llegue a un usuario.

No lo necesitas para este curso, y en proyectos pequeños es discutible que compense. En proyectos que crecen y que toca más de una persona, se vuelve casi imprescindible. Por ahora quédate con la costumbre de anotar: es barato y solo trae ventajas.

> [!resumen] En resumen
>
> El docstring es un texto entre triples comillas en la primera línea del cuerpo de una función; Python lo conserva y se consulta con `help()` o con `.__doc__`. Se escribe con una línea de resumen que empieza por un verbo y, si hace falta, una línea en blanco y los detalles de los parámetros y del valor devuelto. Las anotaciones de tipo se escriben con dos puntos en cada parámetro y una flecha antes de los dos puntos finales, admiten colecciones como `list[str]` o `dict[str, int]`, y Python no las comprueba nunca en ejecución: sirven para el autocompletado del editor, para documentar sin mentir y para herramientas como `mypy`.

> [!ejercicio] Practica
>
> Crea un fichero `38-documentar.py` y resuelve:
>
> 1. Coge tres funciones que hayas escrito en lecciones anteriores y ponles un docstring de una línea a cada una.
> 2. Escribe `calcular_hipoteca(capital, interes_anual, años)` con un docstring de varias líneas que explique los tres parámetros, las unidades de cada uno y qué devuelve. Consúltalo con `help()`.
> 3. Imprime el docstring de una de tus funciones usando `.__doc__` dentro del propio programa.
> 4. Ejecuta `help(sorted)` y `help(str.replace)` en la consola interactiva y lee sus firmas. Localiza los parámetros opcionales.
> 5. Añade anotaciones de tipo a las funciones del ejercicio 1, incluyendo el tipo devuelto. Anota alguna con `list[str]` o `dict[str, int]`.
> 6. Llama a una función anotada con `int` pasándole una cadena y comprueba que Python la deja pasar hasta que algo falla por otro motivo.
