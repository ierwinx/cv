---
titulo: "Cadenas de texto"
resumen: "Crear textos, unirlos, medirlos, acceder a sus letras y cortarlos en trozos. El tipo de dato que más vas a manejar."
minutos: 14
orden: 3
---

Una **cadena** (`str`, de *string*) es un texto: una secuencia de caracteres. Es el tipo de dato con el que más vas a trabajar, porque todo lo que el usuario escribe y todo lo que lees de un fichero llega como texto.

## Crear cadenas

```python
nombre = "Erwin"
apellido = 'García'
```

Las comillas simples y las dobles son intercambiables. **Elige unas y sé consistente**; la convención más extendida es usar dobles. Poder elegir es útil cuando el texto contiene comillas:

```python
frase = "Ella dijo 'hasta luego' y se fue"
otra = 'El botón se llama "Aceptar"'
```

Para textos de varias líneas se usan tres comillas:

```python
mensaje = """Estimado cliente:

Su pedido ha sido enviado.
Gracias por su compra."""

print(mensaje)
```

```salida
Estimado cliente:

Su pedido ha sido enviado.
Gracias por su compra.
```

## Caracteres especiales

Algunos caracteres se escriben con una barra invertida:

| Escritura | Significa |
| --- | --- |
| `\n` | Salto de línea |
| `\t` | Tabulación |
| `\"` | Una comilla doble literal |
| `\'` | Una comilla simple literal |
| `\\` | Una barra invertida literal |

```python
print("Primera línea\nSegunda línea")
print("Nombre:\tErwin")
print("Dijo \"hola\" al entrar")
```

```salida
Primera línea
Segunda línea
Nombre:    Erwin
Dijo "hola" al entrar
```

> [!aviso] Rutas de Windows
>
> En Windows las rutas llevan barras invertidas, y `"C:\nuevo\datos"` se interpretaría con un salto de línea en medio. La solución es poner una `r` delante de la comilla, que crea una cadena *cruda* donde la barra no tiene poderes: `r"C:\nuevo\datos"`.

## Unir y repetir

```python
nombre = "Erwin"
apellido = "García"

completo = nombre + " " + apellido
print(completo)

print("-" * 30)
```

```salida
Erwin García
------------------------------
```

El `+` entre cadenas se llama **concatenación** y el `*` repite. Fíjate en que hay que poner el espacio a mano: `"Erwin" + "García"` daría `ErwinGarcía`.

> [!error] TypeError: can only concatenate str (not "int") to str
>
> No puedes sumar texto con número. `"Tengo " + 30` falla. Hay que convertir el número a texto con `str(30)`, o mejor todavía usar cadenas formateadas, que es lo que veremos en la siguiente lección.

## Longitud

```python
print(len("Python"))
print(len(""))          # la cadena vacía mide cero
print(len("hola mundo"))  # los espacios cuentan
```

```salida
6
0
10
```

## Acceder a los caracteres

Cada carácter tiene una posición, llamada **índice**, y **la numeración empieza en cero**:

```python
palabra = "Python"
#          012345
#         -654321

print(palabra[0])     # el primero
print(palabra[3])
print(palabra[-1])    # el último
print(palabra[-2])    # el penúltimo
```

```salida
P
h
n
o
```

Los índices negativos cuentan desde el final, y son comodísimos: `palabra[-1]` es siempre el último carácter, sin tener que saber cuánto mide la cadena.

> [!aviso] El primero es el cero
>
> Es la fuente de errores más común al empezar. Si una cadena mide 6, sus índices válidos van del 0 al 5. `palabra[6]` da `IndexError: string index out of range`.

## Cortar trozos: el rebanado

La sintaxis es `cadena[inicio:fin]`, y **el final no se incluye**:

```python
texto = "Programación"
#        0123456789...

print(texto[0:6])     # del 0 al 5
print(texto[6:])      # del 6 hasta el final
print(texto[:6])      # desde el principio hasta el 5
print(texto[-5:])     # los cinco últimos
print(texto[:])       # la cadena entera
```

```salida
Progra
mación
Progra
ación
Programación
```

La regla de que el final no se incluye parece incómoda, pero tiene una ventaja: `texto[0:6]` y `texto[6:]` reconstruyen el original sin solapamiento ni huecos, y `fin - inicio` te da directamente cuántos caracteres coges.

También hay un tercer valor, el **paso**:

```python
print("abcdefghij"[::2])    # de dos en dos
print("hola"[::-1])         # paso negativo: invierte la cadena
```

```salida
acegi
aloh
```

## Las cadenas no se pueden modificar

```python
palabra = "Python"
palabra[0] = "J"
```

```salida
TypeError: 'str' object does not support item assignment
```

Se dice que las cadenas son **inmutables**. No es una limitación molesta, es una garantía: si pasas una cadena a una función, nadie puede cambiártela por detrás. Lo que sí puedes hacer es crear una cadena nueva:

```python
palabra = "Python"
nueva = "J" + palabra[1:]
print(nueva)
print(palabra)    # la original sigue intacta
```

```salida
Jython
Python
```

## Buscar dentro de una cadena

```python
frase = "Aprender Python es divertido"

print("Python" in frase)        # ¿está contenido?
print("Java" in frase)
print(frase.find("Python"))     # ¿en qué posición empieza?
print(frase.find("Java"))       # -1 significa "no está"
print(frase.count("e"))         # cuántas veces aparece
```

```salida
True
False
9
-1
4
```

El operador `in` es la forma más limpia de preguntar si un texto contiene otro, y lo usarás constantemente con condiciones.

## Comparar cadenas

```python
print("hola" == "hola")
print("hola" == "Hola")       # distingue mayúsculas
print("manzana" < "pera")     # orden alfabético
```

```salida
True
False
True
```

> [!consejo] Compara sin importar mayúsculas
>
> Para comprobar si el usuario ha escrito "sí" sin preocuparte de cómo lo escribió, pasa todo a minúsculas antes de comparar: `respuesta.lower() == "si"`. Los métodos de transformación los vemos en la próxima lección.

> [!resumen] En resumen
>
> Una cadena es texto entre comillas, simples o dobles. Se unen con `+` y se repiten con `*`. `len()` las mide, los corchetes acceden a un carácter empezando en cero, los índices negativos cuentan desde el final y `[inicio:fin]` corta trozos sin incluir el final. Son inmutables: cualquier cambio genera una cadena nueva. `in` comprueba si un texto está contenido en otro.

> [!ejercicio] Practica
>
> Crea `03-cadenas.py` y resuelve:
>
> 1. Guarda tu nombre completo en una variable e imprime la primera letra, la última y cuántos caracteres tiene.
> 2. Imprime tu nombre al revés.
> 3. Dada la cadena `"2026-09-19"`, extrae el año, el mes y el día en tres variables usando rebanado, e imprímelos como `19/09/2026`.
> 4. Dibuja un marco en la terminal: una línea de 40 guiones, tu nombre centrado a ojo con espacios, y otra línea de 40 guiones.
> 5. Comprueba si la palabra `"gato"` aparece en la frase `"El gato duerme en el tejado"` y en qué posición.
> 6. Intenta cambiar la tercera letra de una cadena y lee el error que sale.
