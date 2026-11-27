---
titulo: "else y elif"
resumen: "Cómo dar una alternativa cuando la condición no se cumple y cómo encadenar varios casos excluyentes en orden."
minutos: 11
orden: 11
---

Con un `if` solo puedes hacer algo o no hacer nada. Casi siempre querrás lo otro: hacer una cosa cuando se cumple la condición y otra distinta cuando no. Y muchas veces no hay dos casos, sino cuatro o cinco: un intervalo de notas, un tramo de edad, un nivel de precio.

## else: el caso contrario

```python
edad = 15

if edad >= 18:
        print("Puedes entrar.")
else:
        print("Lo siento, solo mayores de edad.")
```

```salida
Lo siento, solo mayores de edad.
```

`else` va al mismo nivel de sangría que su `if`, lleva sus propios dos puntos y **no lleva condición**: su condición es "todo lo que no haya entrado en el `if`". Se ejecuta uno de los dos bloques, nunca los dos y nunca ninguno.

```python
numero = 7

if numero % 2 == 0:
        print(f"{numero} es par")
else:
        print(f"{numero} es impar")
```

```salida
7 es impar
```

> [!aviso] else no lleva condición
>
> `else numero % 2 != 0:` es un `SyntaxError`. Si necesitas poner una condición en la alternativa, lo que buscas es `elif`.

## elif: varias alternativas

`elif` es la contracción de *else if*, y sirve para encadenar tantos casos como necesites:

```python
nota = 6.5

if nota >= 9:
        calificacion = "sobresaliente"
elif nota >= 7:
        calificacion = "notable"
elif nota >= 6:
        calificacion = "bien"
elif nota >= 5:
        calificacion = "suficiente"
else:
        calificacion = "insuficiente"

print(f"Nota {nota}: {calificacion}")
```

```salida
Nota 6.5: bien
```

La estructura tiene reglas fáciles de recordar:

| Parte | Cuántas puede haber | Lleva condición |
| --- | --- | --- |
| `if` | Exactamente una, y va primero | Sí |
| `elif` | Tantas como quieras | Sí |
| `else` | Como máximo una, y va última | No |

## Gana la primera que se cumple

Esto es lo más importante de la lección. Python evalúa las condiciones **de arriba abajo** y se detiene en la primera verdadera: ejecuta su bloque y salta el resto de la cadena sin ni siquiera mirarla.

Eso hace que el orden sea parte de la lógica. Mira qué pasa si colocas los mismos casos de antes al revés:

```python
nota = 9.5

if nota >= 5:
        calificacion = "suficiente"
elif nota >= 6:
        calificacion = "bien"
elif nota >= 7:
        calificacion = "notable"
elif nota >= 9:
        calificacion = "sobresaliente"
else:
        calificacion = "insuficiente"

print(f"Nota {nota}: {calificacion}")
```

```salida
Nota 9.5: suficiente
```

Un 9.5 clasificado como suficiente. Y el programa no da ningún error: se ejecuta tan contento y da un resultado equivocado, que es el peor tipo de fallo. Lo que ocurre es que `9.5 >= 5` ya es verdadero, así que Python entra en el primer bloque y nunca llega a los `elif` de abajo.

> [!consejo] Ordena de lo más restrictivo a lo más general
>
> Cuando compares con `>=`, empieza por el umbral más alto y baja. Cuando compares con `<`, empieza por el más bajo y sube. Así cada condición solo tiene que descartar lo que ya han descartado las de arriba, y no necesitas escribir intervalos completos.

Ese es el otro premio del orden correcto: en la versión buena, el `elif nota >= 7` no necesita añadir "y menor que 9". Si el programa ha llegado a esa línea es porque la anterior era falsa, así que ya sabemos que la nota es menor que 9. La cadena arrastra ese conocimiento sola.

```python
edad = 70

if edad < 3:
        grupo = "bebé"
elif edad < 13:
        grupo = "niño"
elif edad < 18:
        grupo = "adolescente"
elif edad < 67:
        grupo = "adulto"
else:
        grupo = "jubilado"

print(grupo)
```

```salida
jubilado
```

## else es opcional

Si no hay nada que hacer en el caso contrario, no pongas `else`:

```python
importe = 30.0
gastos_envio = 4.95

if importe > 50:
        gastos_envio = 0.0

print(f"Gastos de envío: {gastos_envio:.2f} €")
```

```salida
Gastos de envío: 4.95 €
```

Este patrón, dar un valor por defecto antes y cambiarlo solo si hace falta, evita el `NameError` de la lección anterior y suele leerse mejor que un `if`/`else` en el que las dos ramas asignan a la misma variable.

> [!nota] Un elif sin else final
>
> Una cadena de `elif` puede terminar sin `else`. Es legítimo, pero piénsalo dos veces: significa que hay entradas para las que no pasa nada. Si eso no era tu intención, añade un `else` aunque solo imprima un aviso de que el dato no se esperaba. Los `else` que "no deberían ocurrir nunca" son los que te avisan cuando ocurren.

## Ejemplo completo

Este programa retoma la calculadora de IMC del módulo y le añade la clasificación:

```python title="clasificador_imc.py"
print("CLASIFICADOR DE IMC")
print("-" * 32)

peso = float(input("Peso en kilos: "))
altura = float(input("Altura en metros: "))

imc = peso / (altura ** 2)

if imc < 18.5:
        categoria = "peso insuficiente"
elif imc < 25:
        categoria = "peso normal"
elif imc < 30:
        categoria = "sobrepeso"
else:
        categoria = "obesidad"

print("-" * 32)
print(f"{'IMC:':<12}{imc:>6.1f}")
print(f"{'Categoría:':<12}{categoria}")
```

```salida
CLASIFICADOR DE IMC
--------------------------------
Peso en kilos: 88
Altura en metros: 1.75
--------------------------------
IMC:          28.7
Categoría:  sobrepeso
```

Los umbrales van de menor a mayor y usan `<`, así que la cadena está bien ordenada: cada tramo se apoya en que los anteriores ya fallaron. Cambia los cuatro casos de sitio y comprueba tú mismo cómo se rompe.

> [!error] SyntaxError: expected ':'
>
> Python esperaba los dos puntos donde tú has escrito otra cosa. En una cadena de condiciones las dos causas habituales son escribir `else if` separado en vez de `elif`, y ponerle una condición al `else`:
>
> ```python
> else if nota >= 3:     # tenía que ser elif
> else nota < 5:         # el else no lleva condición
> ```
>
> En los dos casos el acento circunflejo te señala justo la palabra de más.

> [!error] SyntaxError: invalid syntax, señalando la línea del else
>
> El `else` se ha quedado huérfano: tiene que ir pegado a su `if`, al mismo nivel de sangría y sin líneas de código en medio. Si entre los dos has colado una instrucción al margen izquierdo, Python cierra ahí el `if` y encuentra un `else` que no pertenece a nada:
>
> ```python
> if nota >= 5:
>         print("Aprobado")
> print("Fin")           # esta línea cierra el if
> else:                  # SyntaxError
>         print("Suspendido")
> ```

> [!resumen] En resumen
>
> `else` ejecuta su bloque cuando la condición del `if` es falsa y no lleva condición propia. `elif` permite encadenar tantos casos como quieras, cada uno con la suya. Python evalúa las condiciones de arriba abajo y **ejecuta solo la primera que se cumple**, así que el orden forma parte de la lógica: mal ordenada, la cadena da resultados incorrectos sin ningún error. Ordena de lo más restrictivo a lo más general y aprovecha que cada condición ya puede dar por descartadas las anteriores. El `else` final es opcional, pero un `else` que avise de lo inesperado sale barato.

> [!ejercicio] Practica
>
> Crea `11-elif.py` y resuelve:
>
> 1. Pide un número y muestra si es positivo, negativo o exactamente cero, con tres casos.
> 2. Pide una nota del 0 al 10 y clasifícala en insuficiente, suficiente, bien, notable y sobresaliente. Comprueba los valores frontera: 5, 7 y 9.
> 3. Coge tu solución del ejercicio anterior y coloca los casos en el orden contrario. Ejecútala con un 10 y explica en un comentario qué sale y por qué.
> 4. Pide la velocidad de un vehículo y el límite de la vía, y muestra si va bien, si se pasa por menos de 20 km/h o si se pasa por más.
> 5. Escribe una calculadora de tarifa de taxi: 2.50 euros de bajada de bandera, más 1.20 euros por kilómetro, y con un recargo de 3 euros si el trayecto es nocturno. Pregunta los kilómetros y si es de noche, y muestra el desglose alineado en columnas.
> 6. Pide un año y di si es bisiesto. La regla es: es bisiesto si es divisible entre 4, salvo que sea divisible entre 100 y no entre 400. Resuélvelo con una cadena de `if`/`elif`/`else` bien ordenada.
