---
titulo: "Condiciones anidadas"
resumen: "Poner un if dentro de otro, cuándo conviene aplanarlo, las cláusulas de guarda y los antipatrones que hay que desaprender."
minutos: 11
orden: 13
---

Dentro del bloque de un `if` puede haber cualquier instrucción, y un `if` es una instrucción. Así que puedes meter condiciones dentro de condiciones tantos niveles como quieras. El lenguaje te deja; la legibilidad, no tanto.

Esta lección es menos sobre sintaxis nueva y más sobre escribir condiciones que se entiendan. Es la diferencia entre código que funciona y código con el que se puede trabajar.

## Un if dentro de otro

Cada nivel añade cuatro espacios más de sangría:

```python
edad = 25
tiene_carnet = True
anos_carnet = 3

if edad >= 21:
        if tiene_carnet:
                if anos_carnet >= 2:
                        print("Puedes alquilar el coche.")
        else:
                        print("Necesitas dos años de carnet.")
    else:
                print("Necesitas carnet de conducir.")
else:
        print("Necesitas tener 21 años.")
```

```salida
Puedes alquilar el coche.
```

Funciona, y tiene una virtud: cada `else` explica exactamente qué requisito ha fallado. Pero fíjate en el precio. La línea que importa está a tres niveles de profundidad, y los `else` están tan lejos de su `if` que hay que contar espacios con el dedo para saber cuál va con cuál.

## Aplanar con and

Si lo único que necesitas es saber si se cumple todo, combina las condiciones y quédate en un nivel:

```python
if edad >= 21 and tiene_carnet and anos_carnet >= 2:
        print("Puedes alquilar el coche.")
else:
        print("No cumples los requisitos.")
```

```salida
Puedes alquilar el coche.
```

Tres líneas en lugar de diez y ni una sangría de más. Lo que se pierde es el detalle de qué requisito falló. Esa es la decisión de diseño: **si no necesitas distinguir los motivos del fallo, usa `and`**.

## Cláusulas de guarda

Cuando sí necesitas distinguir los motivos, la mejor forma no es anidar, sino darle la vuelta: comprueba primero lo que está mal, resuélvelo y quítalo de en medio.

```python
edad = 19
tiene_carnet = True
anos_carnet = 3

if edad < 21:
        print("Necesitas tener 21 años.")
elif not tiene_carnet:
        print("Necesitas carnet de conducir.")
elif anos_carnet < 2:
        print("Necesitas dos años de carnet.")
else:
        print("Puedes alquilar el coche.")
```

```salida
Necesitas tener 21 años.
```

Esto hace lo mismo que la versión anidada de tres niveles, pero está todo a un solo nivel de sangría y se lee de arriba abajo como una lista de requisitos. Cada rama que comprueba un problema y lo despacha se llama **cláusula de guarda**.

> [!consejo] El camino feliz, al final y sin sangrar
>
> Las guardas tienen otra ventaja: el caso normal, el que ocurre cuando todo va bien, queda en un solo sitio y sin anidar. Cuando alguien lea tu código buscando "qué hace esto cuando funciona", lo encontrará en el `else` final en vez de tener que bucear entre condiciones.

En el módulo de funciones verás la forma más potente de este patrón: en lugar de `elif`, cada guarda termina el trabajo con un `return` y no hace falta ni la cadena.

## Cuándo sí está justificado anidar

Anidar es correcto cuando la segunda condición **solo tiene sentido si la primera se cumple**. El caso típico es comprobar que un dato es válido antes de usarlo:

```python
entrada = "7"

if entrada.isdigit():
        numero = int(entrada)
    if numero % 2 == 0:
                print(f"{numero} es par")
    else:
                print(f"{numero} es impar")
else:
        print("No es un número entero.")
```

```salida
7 es impar
```

La comprobación de par o impar necesita que `numero` exista, y `numero` solo existe dentro del primer bloque. Aquí el anidamiento refleja la dependencia real entre las dos preguntas, y no se puede aplanar con `and` porque las dos ramas interiores hacen cosas distintas.

> [!aviso] Dos niveles vale, tres es una señal de alarma
>
> No hay una regla oficial, pero en la práctica: un nivel es lo normal, dos se leen bien, tres ya cuesta, y a partir del cuarto el código es casi imposible de seguir. Cuando te veas en el tercer nivel, para y pregúntate si puedes combinar con `and` o convertir en guardas.

## Antipatrones que hay que desaprender

Son tres formas de escribir condiciones que funcionan perfectamente y que, aun así, delatan a quien lleva poco tiempo con el lenguaje.

### Comparar un booleano con True

```python
activo = True

if activo == True:      # redundante
        print("Activo")

if activo:              # así se escribe
        print("Activo")
```

`activo` ya es `True` o `False`. Compararlo con `True` es como preguntar "¿es verdad que es verdad?". Para el caso contrario, `if not activo:` en vez de `if activo == False:`.

> [!nota] La excepción es cuando el valor puede no ser booleano
>
> Si una variable puede contener `None`, un número o un texto, comparar con `== True` no es lo mismo que el `if` a secas: `if valor:` es verdadero con `5` o con `"hola"`, mientras que `valor == True` solo lo es con `True` y con `1`. En esos casos escribe la comprobación que de verdad quieres, normalmente `is not None`.

### Asignar True o False con un if

```python
numero = 5

if numero > 0:
        es_positivo = True
else:
        es_positivo = False

print(es_positivo)
```

```salida
True
```

Cuatro líneas para algo que ya sabes hacer en una: recuerda que una comparación **es** una expresión que produce un booleano.

```python
es_positivo = numero > 0
print(es_positivo)
```

```salida
True
```

Siempre que veas un `if`/`else` en el que las dos ramas asignan `True` y `False` a la misma variable, bórralo y asigna directamente la condición.

### Repetir la condición en las dos ramas

```python
if edad >= 18:
        precio = 12.00
if edad < 18:            # el segundo if es innecesario
        precio = 6.00
```

Si el segundo `if` es exactamente lo contrario del primero, es un `else`. Además de más corto, el `else` no puede desincronizarse el día que cambies el umbral de 18 a 21 y te olvides de cambiarlo en los dos sitios.

## El operador condicional en una línea

Para el caso concreto de elegir entre dos valores, Python tiene una forma de expresarlo en una sola línea:

```python
numero = 7
mensaje = "par" if numero % 2 == 0 else "impar"
print(mensaje)
```

```salida
impar
```

Se lee de un tirón, aunque el orden sorprenda al principio: **valor si se cumple**, `if`, **condición**, `else`, **valor si no**. El valor va delante de la condición, al contrario que en un `if` normal.

| Con if/else | En una línea |
| --- | --- |
| Cuatro líneas, un bloque para cada caso | Una línea, una expresión |
| Puede hacer varias cosas en cada rama | Solo elige entre dos valores |

Donde más brilla es dentro de una f-string, para cuadrar los plurales:

```python
unidades = 1
print(f"Tienes {unidades} {'unidad' if unidades == 1 else 'unidades'}")

unidades = 4
print(f"Tienes {unidades} {'unidad' if unidades == 1 else 'unidades'}")
```

```salida
Tienes 1 unidad
Tienes 4 unidades
```

Fíjate en que dentro de la f-string las comillas interiores son simples, porque las dobles ya están ocupadas por la cadena exterior.

```python
importe = 120.0
descuento = 0.10 if importe > 100 else 0.0

print(f"Descuento: {descuento:.0%}")
print(f"Total: {importe * (1 - descuento):.2f} €")
```

```salida
Descuento: 10%
Total: 108.00 €
```

> [!aviso] No lo encadenes
>
> `"a" if x else "b" if y else "c"` es válido y es ilegible. El operador condicional es para dos opciones; en cuanto haya tres, usa `if`/`elif`/`else` con sus bloques. Y nunca lo uses si alguna de las ramas tiene que hacer algo más que dar un valor.

> [!error] IndentationError: unindent does not match any outer indentation level
>
> Has cerrado mal un nivel de anidamiento: una línea tiene una sangría que no coincide con ninguno de los bloques abiertos, por ejemplo seis espacios cuando los niveles válidos eran cuatro y ocho. Pasa mucho al mover bloques de sitio. Cuenta los espacios de esa línea y ajústala a un múltiplo de cuatro que corresponda a un bloque real.

> [!error] El else se ha emparejado con el if equivocado
>
> No da ningún mensaje, simplemente el programa hace algo raro. En un anidamiento, **cada `else` pertenece al `if` que tenga su misma sangría**. Si un `else` se te ha quedado cuatro espacios más adentro de lo que querías, se habrá enganchado al `if` interior. Alinea visualmente cada `if` con su `else` antes de buscar el fallo en otra parte.

> [!resumen] En resumen
>
> Un `if` puede contener otro `if`, y cada nivel añade cuatro espacios. Anidar está justificado cuando la condición interior solo tiene sentido si la exterior se cumple; si solo quieres exigir varias cosas a la vez, aplánalo con `and`. Cuando necesites distinguir el motivo del fallo, usa cláusulas de guarda: comprueba primero lo que está mal en una cadena de `elif` y deja el caso bueno, sin sangrar, en el `else` final. No escribas `if activo == True:` ni un `if`/`else` que solo asigna `True` y `False`, porque la propia comparación ya vale como valor. Y para elegir entre dos valores en una línea tienes `valor_si if condicion else valor_no`.

> [!ejercicio] Practica
>
> Crea `13-anidadas.py` y resuelve:
>
> 1. Escribe con condiciones anidadas un programa que pida usuario y contraseña y solo dé acceso si el usuario es `"admin"` y la contraseña `"1234"`, con un mensaje distinto según lo que falle.
> 2. Reescribe el ejercicio anterior con cláusulas de guarda, sin anidar. Compara las dos versiones y quédate con la que te parezca más clara.
> 3. Coge estas cuatro líneas y déjalas en una: `if temperatura > 25:` con `hace_calor = True` y su `else` con `hace_calor = False`.
> 4. Pide un número entero y muestra en una sola línea, con el operador condicional, si es par o impar.
> 5. Pide una cantidad de artículos y muestra el mensaje `"1 artículo"` o `"N artículos"` según corresponda, resolviendo el plural dentro de la f-string.
> 6. Escribe un programa que pida la nota y las faltas de asistencia, y decida entre `"aprobado"`, `"aprobado con aviso"` si tiene más de 5 faltas, y `"suspendido"`. Usa el mínimo anidamiento posible.
