---
titulo: "JSON"
resumen: "Los cuatro tipos de Python que se transforman en otra cosa sin avisar, el precio que sale a 199,89999999999998, y las fechas que JSON no sabe guardar."
minutos: 15
orden: 3
---

JSON es el formato en el que viaja casi todo lo que hace una API, y tiene fama de trivial: cuatro tipos, dos funciones y a correr. Esa fama es merecida en el 90 % de los casos y es exactamente lo que hace peligroso el 10 % restante, porque los fallos de JSON **no dan error**: los datos llegan, se convierten en algo parecido pero distinto, y el programa sigue.

Esta lección es ese 10 %.

> [!objetivo] Qué vas a aprender
>
> Conocer el mapeo entre los tipos de JSON y los de Python y qué se pierde en el viaje, tratar el dinero sin errores de redondeo, manejar fechas sabiendo que JSON no las tiene, escribir texto en español correctamente, y conocer los límites del módulo estándar.

## El mapeo

JSON tiene seis tipos y Python tiene muchos más, así que la correspondencia es incompleta por definición:

| JSON | Python al leer | Python al escribir |
| --- | --- | --- |
| `object` | `dict` | `dict` |
| `array` | `list` | `list`, `tuple` |
| `string` | `str` | `str` |
| `number` | `int` o `float` | `int`, `float` |
| `true` / `false` | `bool` | `bool` |
| `null` | `None` | `None` |

Dos funciones, y conviene tener clara la diferencia porque los nombres son confusos:

```python
json.dumps(objeto)   # a texto      (la s es de string)
json.loads(texto)    # desde texto
json.dump(obj, f)    # a un fichero
json.load(f)         # desde un fichero
```

## Lo que no sobrevive al viaje

Aquí está lo que importa. Una ida y vuelta por JSON con varios tipos de Python:

```salida
tupla          tuple     -> list   [1, 2, 3]
clave entera   dict      -> dict   {'1': 'uno'}
conjunto       set       -> TypeError: Object of type set is not JSON serializable
decimal        Decimal   -> TypeError: Object of type Decimal is not JSON serializable
fecha          date      -> TypeError: Object of type date is not JSON serializable
bytes          bytes     -> TypeError: Object of type bytes is not JSON serializable
```

Los cuatro últimos **fallan ruidosamente**, y eso está bien: te enteras.

Los dos primeros son los peligrosos, porque **funcionan y cambian tus datos**:

**Una tupla vuelve como lista.** Suele dar igual, hasta que algo compara `(1, 2) == [1, 2]`, que es falso, o intenta usarla como clave de un diccionario.

**Una clave entera vuelve como texto.** Esta es la que muerde de verdad:

```consola
>>> json.loads(json.dumps({1: 'uno'}))
{'1': 'uno'}
```

Guardas `{42: 'Ana'}`, lo lees, y `datos[42]` da `KeyError` mientras `datos['42']` funciona. El motivo es que **en JSON las claves solo pueden ser texto**, así que Python convierte, y no avisa porque no lo considera un error.

Si tu diccionario tiene claves numéricas y va a viajar por JSON, hay dos opciones: aceptarlo y usar cadenas en los dos lados desde el principio, o mandar una lista de objetos, que es lo que hacen las APIs bien diseñadas.

## El dinero

Este es el problema práctico número uno de JSON y no es culpa de JSON: es que los decimales binarios no pueden representar exactamente `0,1`, y lo arrastra cualquier programa que use `float`.

```salida
sumar diez veces 19.99  ->  199.89999999999998   (debería ser 199.90)
8.35 * 3                ->  25.049999999999997   (debería ser 25.05)
round(8.35, 1)          ->  8.3                  (debería ser 8.4)
```

El tercero es el que más desconcierta: **redondear a un decimal da 8,3 y no 8,4**, porque el `8.35` guardado es en realidad un pelín menor que 8,35.

En una factura eso son céntimos que no cuadran, y no hay manera de arreglarlo a posteriori. La solución es no usar `float` para dinero nunca, y el módulo `json` trae el gancho:

```python
import decimal

datos = json.loads(texto, parse_float=decimal.Decimal)
```

```salida
parse_float=Decimal:  8.35 * 3  ->  25.05
```

Exacto, porque `Decimal` trabaja en base diez como las personas.

Y para el otro lado, escribir, hay que decirle cómo, porque `Decimal` no es serializable:

```python
json.dumps(datos, default=str)
```

> [!aviso] Los tres problemas de los números en JSON
>
> **Python escribe JSON inválido por defecto.** Esto sorprende:
>
> ```salida
> json.dumps(float('nan'))   ->  'NaN'
> json.dumps(float('inf'))   ->  'Infinity'
> ```
>
> Ninguno de los dos existe en la especificación de JSON. Python los escribe, Python los vuelve a leer, y **cualquier otro lenguaje se atraganta**. Si tu API los emite, los clientes de JavaScript fallarán con un error de análisis que no te van a saber explicar.
>
> Se apaga con `json.dumps(v, allow_nan=False)`, que lanza un `ValueError` cuando aparecen. Merece la pena ponerlo en cualquier cosa que salga hacia fuera.
>
> **JavaScript no aguanta tus enteros.** Python maneja enteros de cualquier tamaño; JavaScript pierde precisión a partir de 2⁵³−1, que son unos nueve mil billones:
>
> ```salida
> Python:    9007199254740993   (exacto)
> el límite seguro de JavaScript es 9007199254740991
> ```
>
> Por eso las APIs con identificadores grandes **los mandan como texto**. Si ves un `"id": "1234567890123456789"` entre comillas, ahora sabes por qué, y sabes que no debes convertirlo a número.
>
> **Python tiene un tope de dígitos desde la 3.11.** Un número con cinco mil cifras en el JSON:
>
> ```salida
> ValueError: Exceeds the limit (4300 digits) for integer string conversion
> ```
>
> Es una protección contra que alguien te mande un número gigante que tarde minutos en convertirse. Rara vez molesta, y cuando molesta el mensaje es claro.

## Las fechas

JSON no tiene tipo fecha. Punto. Lo que hay es el acuerdo de escribirlas como texto en formato ISO 8601, que es lo que devuelve GitHub:

```salida
"created_at": "2012-04-28T02:47:18Z"
```

Y leerlas es una línea de la biblioteca estándar:

```salida
fromisoformat('2012-04-28T02:47:18Z')         -> 2012-04-28 02:47:18+00:00  tz=UTC
fromisoformat('2026-09-22T12:00:00+02:00')    -> 2026-09-22 12:00:00+02:00  tz=UTC+02:00
fromisoformat('2026-09-22')                   -> 2026-09-22 00:00:00  tz=None
fromisoformat('2026-09-22T12:00:00.123456Z')  -> ... .123456+00:00  tz=UTC
```

Los cuatro formatos, incluido el de la `Z` al final, que **Python solo acepta desde la versión 3.11**. Si ves por ahí código con `s.replace('Z', '+00:00')`, es de antes de eso.

Fíjate en el tercero: una fecha sin hora sale **sin zona horaria**, y mezclar fechas con y sin zona lanza un `TypeError` al compararlas. Es un fallo que aparece semanas después.

Para escribir, hay un atajo que casi funciona y conviene no usar:

```salida
json.dumps(fecha)                -> TypeError: Object of type datetime is not JSON serializable
json.dumps(fecha, default=str)   -> {"cuando": "2026-09-22 12:00:00+00:00"}
fecha.isoformat()                -> {"cuando": "2026-09-22T12:00:00+00:00"}
```

Mira la diferencia entre las dos últimas: **un espacio en lugar de la `T`**. El `default=str` llama a `str()`, que en `datetime` produce un formato parecido a ISO pero que no lo es. Muchos analizadores lo aceptan, otros no, y el fallo aparece solo con el cliente escrito en otro lenguaje.

La forma correcta es explícita:

```python
json.dumps(datos, default=lambda o: o.isoformat() if hasattr(o, 'isoformat') else str(o))
```

## El texto y el español

```python
json.dumps({'nombre': 'Íñigo Ñuño', 'emoji': '🌐'})
```

```salida
{"nombre": "\u00cd\u00f1igo \u00d1u\u00f1o", "emoji": "\ud83c\udf10"}
```

Legible no es. Eso pasa porque `ensure_ascii` vale `True` por defecto, que es una herencia de cuando no se podía dar por hecho que todo fuera UTF-8.

```python
json.dumps(datos, ensure_ascii=False)
```

```salida
{"nombre": "Íñigo Ñuño", "emoji": "🌐"}
```

```salida
bytes: 69 con escapes, 45 sin ellos
los dos se leen igual: True
```

**Los dos son JSON válido y los dos se leen igual**, así que esto no es una cuestión de corrección: es de legibilidad y de tamaño. Un tercio menos de bytes en texto español, y registros que se pueden leer.

La recomendación para un proyecto en español: `ensure_ascii=False` siempre, asegurándose de que el fichero o la respuesta van en UTF-8, cosa que en una API es automática.

> [!nota] Dos trampas más del módulo estándar
>
> **Las claves repetidas: gana la última, en silencio.**
>
> ```salida
> json.loads('{"a": 1, "a": 2}')  ->  {'a': 2}
> ```
>
> No es error porque la especificación de JSON no lo prohíbe, solo dice que "no se recomienda". Distintos lenguajes hacen cosas distintas, y eso se ha usado como técnica de ataque: mandar un campo dos veces para que el sistema que valida lea uno y el que ejecuta lea el otro.
>
> **El JSON de arriba no tiene por qué ser un objeto.**
>
> ```salida
> json.loads('42')      ->  42
> json.loads('"hola"')  ->  'hola'
> json.loads('true')    ->  True
> json.loads('null')    ->  None
> ```
>
> Los cuatro son JSON válido. Así que `datos['algo']` sobre una respuesta que resultó ser `null` da `TypeError: 'NoneType' object is not subscriptable`, y sobre una que resultó ser `42` da otro distinto. Si el código va a hacer algo con las claves, conviene comprobar primero que hay claves:
>
> ```python
> if not isinstance(datos, dict):
>         raise ValueError(f'Esperaba un objeto y llegó {type(datos).__name__}')
> ```

> [!consejo] Cuándo el módulo estándar se queda corto
>
> Para una API normal no se queda corto nunca, y merece la pena saber dónde está el límite.
>
> **El tamaño.** Un JSON de 21 MB se lee en cinco centésimas, que es rápido, y se carga **entero en memoria**:
>
> ```salida
> json.loads -> 0.05 s, 200 000 elementos, 21,2 MB
> ```
>
> Con la biblioteca estándar no hay forma de leerlo por trozos. Para respuestas de cientos de megas hacen falta `ijson`, que va recorriendo, o pedirle a la API que pagine, que es lo sensato y es la lección 9.
>
> **La velocidad.** `orjson` es varias veces más rápido y además sabe escribir fechas y decimales sin ayuda. Solo compensa cuando el análisis de JSON sale en las mediciones, que es más raro de lo que la gente cree: casi siempre el tiempo se va en la red.
>
> **La profundidad.** Un JSON de doscientos kilobytes que sea `[[[[...]]]]` con cien mil niveles se lee sin problema en esta versión, pero con un millón sale `RecursionError`. Es un ataque conocido —pocos bytes, mucho daño— y la defensa no es del módulo: es limitar el tamaño de lo que aceptas antes de analizarlo.
>
> **La validación.** El módulo comprueba que el JSON esté bien formado, no que tenga las claves que esperas. Para eso están los esquemas, y en el bloque B lo hacen los serializadores de Django REST Framework y en el C los modelos de Pydantic. **Analizar no es validar**, y confundirlo es la causa de la mitad de los `KeyError` en producción.

> [!resumen] En resumen
>
> JSON tiene seis tipos y Python muchos más, así que el viaje pierde cosas. Cuatro tipos fallan ruidosamente al escribirlos, lo cual es bueno, y dos se transforman en silencio: una tupla vuelve como lista y una clave numérica vuelve como texto, porque en JSON las claves solo pueden ser cadenas. El dinero es el problema práctico número uno: sumar diez veces 19,99 da 199,89999999999998 y redondear 8,35 a un decimal da 8,3, de modo que hay que leer con el gancho que convierte los decimales a `Decimal`. Los números tienen tres trampas más: Python escribe `NaN` e `Infinity`, que no son JSON válido y atragantan a los demás lenguajes; JavaScript pierde precisión a partir de nueve mil billones, y por eso las APIs mandan los identificadores grandes entre comillas; y desde la 3.11 hay un tope de dígitos. Las fechas no existen en JSON y viajan como texto ISO 8601, que Python lee en una línea aceptando la `Z` desde la 3.11, con cuidado de no mezclar fechas con y sin zona horaria; para escribirlas, el atajo habitual produce un espacio donde debería ir una `T`. El texto en español conviene escribirlo sin escapes, que es igual de válido, se lee igual y ocupa un tercio menos. Y el módulo estándar comprueba que el JSON esté bien formado, no que tenga las claves que esperas: analizar no es validar.

> [!ejercicio] Practica
>
> 1. Da una vuelta por JSON a una tupla, a un conjunto y a un diccionario con claves numéricas. Anota cuál falla y cuál cambia en silencio.
> 2. Suma diez veces 19,99 con `float` y con `Decimal`, y compara.
> 3. Lee un JSON con precios usando el gancho de los decimales y comprueba que las cuentas salen.
> 4. Escribe un `NaN` a JSON y pásaselo a un validador de JSON de internet.
> 5. Lee las cuatro formas de fecha ISO y comprueba cuál sale sin zona horaria. Intenta comparar dos con distinta zona.
> 6. Escribe una fecha con el atajo y con el método correcto, y busca la diferencia de un carácter.
> 7. Escribe un diccionario con eñes y tildes con y sin escapes, y compara los bytes.
> 8. Lee un JSON que sea solo `null` e intenta sacarle una clave.
> 9. Escribe la comprobación que rechaza una respuesta que no sea un objeto.
