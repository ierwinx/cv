---
titulo: "Métodos de cadenas"
resumen: "Las operaciones que toda cadena sabe hacer sobre sí misma: cambiar mayúsculas, limpiar espacios, buscar, reemplazar y partir en trozos."
minutos: 12
orden: 4
---

## Qué es un método

Hasta ahora has usado funciones sueltas como `len(texto)`. Un **método** es una función que pertenece a un dato concreto y se llama pegada a él con un punto:

```python
texto = "python"
print(len(texto))        # función: el dato va dentro
print(texto.upper())     # método: el dato va delante del punto
```

```salida
6
PYTHON
```

Los paréntesis al final son obligatorios aunque estén vacíos: son los que dicen "ejecuta esto". Sin ellos, `texto.upper` no ejecuta nada.

> [!aviso] Los métodos devuelven una cadena nueva
>
> Las cadenas son inmutables, así que ningún método modifica el original: todos devuelven uno nuevo. Si no guardas el resultado, se pierde.
>
> ```python
> nombre = "erwin"
> nombre.upper()
> print(nombre)          # sigue en minúsculas
>
> nombre = nombre.upper()
> print(nombre)          # ahora sí
> ```

## Mayúsculas y minúsculas

```python
frase = "aprendiendo PYTHON desde cero"

print(frase.upper())        # TODO EN MAYÚSCULAS
print(frase.lower())        # todo en minúsculas
print(frase.capitalize())   # Solo la primera letra de la frase
print(frase.title())        # La Primera De Cada Palabra
print(frase.swapcase())     # invierte las que hay
```

```salida
APRENDIENDO PYTHON DESDE CERO
aprendiendo python desde cero
Aprendiendo python desde cero
Aprendiendo Python Desde Cero
APRENDIENDO python DESDE CERO
```

## Limpiar espacios

Cuando un dato viene de un usuario o de un fichero, casi siempre trae espacios de más. `strip()` es probablemente el método que más usarás en tu vida:

```python
entrada = "   erwin@correo.com   "

print("[" + entrada + "]")
print("[" + entrada.strip() + "]")     # quita por los dos lados
print("[" + entrada.lstrip() + "]")    # solo por la izquierda
print("[" + entrada.rstrip() + "]")    # solo por la derecha
```

```salida
[   erwin@correo.com   ]
[erwin@correo.com]
[erwin@correo.com   ]
[   erwin@correo.com]
```

También puede quitar caracteres concretos, no solo espacios:

```python
print("###importante###".strip("#"))
```

```salida
importante
```

> [!consejo] La pareja imprescindible
>
> Para comparar algo que ha escrito una persona, aplica siempre los dos a la vez: `respuesta.strip().lower()`. Así te da igual que haya escrito `" Sí "`, `"SI"` o `"si"`.

## Reemplazar

```python
frase = "Me gusta Java, Java es genial"

print(frase.replace("Java", "Python"))
print(frase.replace("Java", "Python", 1))   # solo la primera vez
print("902 123 456".replace(" ", ""))       # quitar todos los espacios
```

```salida
Me gusta Python, Python es genial
Me gusta Python, Java es genial
902123456
```

Reemplazar por la cadena vacía es la forma habitual de **eliminar** algo.

## Partir y unir

`split()` convierte una cadena en una lista de trozos. Las listas las veremos en detalle más adelante, pero este método aparece tan pronto que conviene conocerlo ya:

```python
frase = "rojo,verde,azul"
colores = frase.split(",")
print(colores)

texto = "El gato duerme"
palabras = texto.split()      # sin argumento, parte por espacios
print(palabras)
print(len(palabras))
```

```salida
['rojo', 'verde', 'azul']
['El', 'gato', 'duerme']
3
```

`join()` hace lo contrario: une una lista de textos en una sola cadena. Se escribe al revés de lo que uno espera, con el separador delante:

```python
colores = ["rojo", "verde", "azul"]
print(", ".join(colores))
print(" - ".join(colores))
print("".join(colores))
```

```salida
rojo, verde, azul
rojo - verde - azul
rojoverdeazul
```

## Preguntar por el contenido

Estos métodos devuelven `True` o `False` y se usan muchísimo en condiciones:

```python
print("python.pdf".endswith(".pdf"))
print("IMG_2024.jpg".startswith("IMG"))
print("12345".isdigit())         # ¿son todo dígitos?
print("Erwin".isalpha())         # ¿son todo letras?
print("erwin2".isalnum())        # ¿letras o dígitos?
print("   ".isspace())           # ¿solo espacios?
print("ERWIN".isupper())
print("erwin".islower())
```

```salida
True
True
True
True
True
True
True
True
```

> [!consejo] isdigit para validar antes de convertir
>
> Convertir con `int()` un texto que no es un número da `ValueError` y rompe el programa. Comprobar antes con `isdigit()` es la forma sencilla de evitarlo:
>
> ```python
> entrada = "42"
> if entrada.isdigit():
>         numero = int(entrada)
> ```

## Alinear y rellenar

Útiles para sacar tablas ordenadas por la terminal:

```python
print("Nombre".ljust(15) + "Edad")     # alinea a la izquierda rellenando
print("Erwin".ljust(15) + "34")
print("Ana".ljust(15) + "28")
print()
print("total".rjust(20))               # alinea a la derecha
print("MENÚ".center(30, "="))          # centra rellenando con un carácter
print("7".zfill(3))                    # rellena con ceros a la izquierda
```

```salida
Nombre         Edad
Erwin          34
Ana            28

               total
=============MENÚ=============
007
```

## Encadenar métodos

Como cada método devuelve una cadena, puedes llamar al siguiente sobre el resultado. Se lee de izquierda a derecha:

```python
entrada = "   ERWIN garcía  "
limpio = entrada.strip().lower().title()
print(limpio)
```

```salida
Erwin García
```

> [!nota] Cómo descubrir todos los métodos
>
> En la consola interactiva, escribe `dir("")` para ver la lista completa, o `help(str.replace)` para leer la documentación de uno concreto. En el editor, escribe un punto detrás de una variable de texto y verás la lista desplegable.

## Tabla de referencia

| Método | Qué hace |
| --- | --- |
| `upper()` / `lower()` | Pasa todo a mayúsculas / minúsculas |
| `capitalize()` / `title()` | Primera letra de la frase / de cada palabra |
| `strip()` | Quita espacios de los extremos |
| `replace(viejo, nuevo)` | Sustituye texto |
| `split(separador)` | Parte en una lista |
| `join(lista)` | Une una lista en un texto |
| `find(texto)` | Posición donde empieza, o -1 |
| `count(texto)` | Cuántas veces aparece |
| `startswith()` / `endswith()` | Si empieza o acaba por algo |
| `isdigit()` / `isalpha()` | Si son todo dígitos / letras |
| `ljust()` / `rjust()` / `center()` | Alinear rellenando |

> [!resumen] En resumen
>
> Un método es una función pegada al dato con un punto. Ninguno modifica la cadena original: todos devuelven una nueva, así que hay que guardar el resultado. Los imprescindibles son `strip()` para limpiar, `lower()` para comparar, `replace()` para sustituir y `split()` para trocear. Se pueden encadenar uno detrás de otro.

> [!ejercicio] Practica
>
> Crea `04-metodos.py` y resuelve:
>
> 1. Dado `"  Juan PÉREZ lópez  "`, déjalo como `"Juan Pérez López"` en una sola línea encadenando métodos.
> 2. Cuenta cuántas palabras tiene la frase `"La programación es el arte de resolver problemas"`.
> 3. Dado el correo `"erwin@ejemplo.com"`, extrae el usuario y el dominio usando `split("@")`.
> 4. Convierte `"2026-09-19"` en `"19/09/2026"`, esta vez con `split()` y `join()` en vez de rebanado.
> 5. Comprueba si el fichero `"informe_final.PDF"` es un pdf, sin que las mayúsculas te estropeen la comprobación.
> 6. Imprime una tabla con tres nombres y tres edades, con las columnas perfectamente alineadas usando `ljust()`.
