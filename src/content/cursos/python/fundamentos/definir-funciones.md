---
titulo: "Definir tus propias funciones"
resumen: "Cómo agrupar un trozo de código con un nombre para dejar de repetirlo, con la sintaxis de def y sus reglas."
minutos: 11
orden: 32
---

Hasta ahora ya has usado funciones: `print`, `len`, `input` o `sorted` son funciones que alguien escribió por ti. Lo que cambia hoy es que vas a escribir las tuyas.

El motivo no es la elegancia, es algo mucho más práctico: **en cuanto un programa crece, el mismo código empieza a aparecer en varios sitios**, y cada vez que hay que cambiarlo tienes que acordarte de todos. Una función te deja escribirlo una sola vez.

## El problema: código repetido

Este programa imprime la cabecera de un ticket dos veces:

```python
print("=" * 32)
print("TIENDA LA ESQUINA")
print("=" * 32)
print("Camiseta        19.99")

print("=" * 32)
print("TIENDA LA ESQUINA")
print("=" * 32)
print("Zapatillas      49.50")
```

```salida
================================
TIENDA LA ESQUINA
================================
Camiseta        19.99
================================
TIENDA LA ESQUINA
================================
Zapatillas      49.50
```

Funciona, pero tiene tres problemas. Hay seis líneas duplicadas. Si la tienda cambia de nombre, hay que tocar dos sitios. Y si mañana hay veinte tickets, habrá veinte copias, y seguro que una se queda sin actualizar.

## Extraerlo a una función

Le damos un nombre a ese bloque y lo escribimos una vez:

```python
def imprimir_cabecera():
        print("=" * 32)
    print("TIENDA LA ESQUINA")
    print("=" * 32)


imprimir_cabecera()
print("Camiseta        19.99")

imprimir_cabecera()
print("Zapatillas      49.50")
```

```salida
================================
TIENDA LA ESQUINA
================================
Camiseta        19.99
================================
TIENDA LA ESQUINA
================================
Zapatillas      49.50
```

La salida es idéntica, pero ahora el nombre de la tienda está en un único sitio. Y el código de abajo se lee casi como una frase: imprime la cabecera, imprime la camiseta, imprime la cabecera, imprime las zapatillas.

## La sintaxis, pieza a pieza

```python
def imprimir_cabecera():
        print("=" * 32)
```

- **`def`** es la palabra reservada que anuncia "aquí empieza una definición de función".
- **`imprimir_cabecera`** es el nombre. Sigue las mismas reglas que los nombres de variable: minúsculas, guiones bajos, sin empezar por número.
- **`()`** son los paréntesis. Ahora van vacíos; en la próxima lección meteremos cosas dentro.
- **`:`** los dos puntos cierran la primera línea. Sin ellos no hay función.
- **El bloque sangrado** con cuatro espacios es el cuerpo. Todo lo que esté sangrado pertenece a la función; la primera línea que vuelva al margen izquierdo ya está fuera.

> [!error] IndentationError: expected an indented block after function definition on line 1
>
> El cuerpo de la función no está sangrado. Después de los dos puntos, la línea siguiente tiene que ir cuatro espacios a la derecha.
>
> ```python
> def imprimir_cabecera():
> print("TIENDA LA ESQUINA")
> ```

> [!nota] Dos líneas en blanco
>
> PEP 8 pide **dos líneas en blanco** antes y después de la definición de una función que está en el nivel principal del fichero. No es obligatorio para Python, pero lo verás en todo el código profesional y ayuda a distinguir dónde acaba una función y empieza el programa.

## Llamar a la función

Definir una función no la ejecuta. Solo la deja preparada, guardada bajo ese nombre. Para ejecutarla hay que **llamarla**, y llamar es escribir su nombre seguido de paréntesis:

```python
imprimir_cabecera()      # esto sí la ejecuta
imprimir_cabecera        # esto no hace nada útil: solo nombra la función
```

Los paréntesis son la diferencia entre hablar de la función y ejecutarla.

## Definir no es ejecutar

Merece la pena verlo con un ejemplo que deje claro el orden en que pasan las cosas:

```python
def avisar_de_cierre():
        print("La tienda cierra en cinco minutos.")


print("Programa arrancado")
avisar_de_cierre()
print("Programa terminado")
```

```salida
Programa arrancado
La tienda cierra en cinco minutos.
Programa terminado
```

Fíjate en que el mensaje de cierre **no sale el primero**, aunque su `print` esté escrito arriba del todo. Cuando Python llega a la línea del `def` solo anota "existe una función que se llama así". El código de dentro se ejecuta en el momento de la llamada, ni antes ni después.

Si defines una función y nunca la llamas, su contenido no se ejecuta jamás. Es un despiste habitual: el programa no hace nada y no da ningún error.

## La definición va antes de la llamada

Python lee el fichero de arriba abajo. Cuando llega a la llamada, la función tiene que existir ya:

```python
avisar_de_cierre()


def avisar_de_cierre():
        print("La tienda cierra en cinco minutos.")
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/aviso.py", line 1, in <module>
    avisar_de_cierre()
    ^^^^^^^^^^^^^^^^
NameError: name 'avisar_de_cierre' is not defined
```

> [!error] NameError: name 'avisar\_de\_cierre' is not defined
>
> Estás llamando a una función que Python todavía no ha leído, o has escrito mal su nombre. Sube la definición por encima de la llamada. La costumbre es poner **todas** las funciones juntas en la parte de arriba del fichero, después de las importaciones, y dejar el programa principal al final.

## Cómo elegir el nombre

El nombre de una función es lo primero que lee quien pasa por tu código, y muchas veces lo único. Como una función **hace** algo, su nombre debe empezar por un verbo:

| Mal | Bien | Por qué |
| --- | --- | --- |
| `cabecera()` | `imprimir_cabecera()` | Un sustantivo suena a variable, no a acción |
| `datos()` | `pedir_datos()` | No se sabe si devuelve datos o los guarda |
| `proc()` | `procesar_pedido()` | Las abreviaturas no ahorran nada |
| `hacerCosas()` | `calcular_total()` | Ni mayúsculas intercaladas ni vaguedades |

Verbos que aparecen constantemente: `calcular_`, `obtener_`, `mostrar_`, `imprimir_`, `crear_`, `validar_`, `buscar_`, `guardar_`. Para funciones que responden sí o no, se usa `es_` o `tiene_`: `es_mayor_de_edad()`, `tiene_descuento()`.

## Una función hace una sola cosa

Esta es la regla que más diferencia el código que se puede mantener del que no. Si al describir tu función tienes que usar la palabra "y" dos veces, probablemente sean dos funciones.

Una función que "pide los datos al usuario **y** calcula el total **y** lo imprime con formato" es difícil de reutilizar: el día que quieras calcular un total sin pedir nada por teclado, no te sirve. Tres funciones pequeñas sí.

> [!consejo] La prueba del nombre
>
> Si no encuentras un nombre corto y honesto para tu función, es una señal muy fiable de que hace demasiadas cosas. El nombre `procesar_todo()` no es un buen nombre, es una rendición.

## Funciones que usan otras funciones

Una función puede llamar a otra sin ningún problema, y es así como se construyen los programas grandes: piezas pequeñas que se apoyan unas en otras.

```python
def imprimir_separador():
        print("-" * 24)


def imprimir_menu():
        imprimir_separador()
    print("1. Ver pedidos")
    print("2. Crear pedido")
    print("3. Salir")
    imprimir_separador()


imprimir_menu()
```

```salida
------------------------
1. Ver pedidos
2. Crear pedido
3. Salir
------------------------
```

`imprimir_menu` no sabe cómo se dibuja un separador ni le importa: delega. Si mañana el separador pasa a ser de asteriscos, se cambia en un sitio y todos los menús del programa cambian a la vez.

> [!resumen] En resumen
>
> Una función es un bloque de código con nombre que se escribe una vez y se ejecuta tantas veces como quieras. Se define con `def nombre():` y el cuerpo sangrado cuatro espacios, y se ejecuta escribiendo `nombre()` con paréntesis. Definir no es ejecutar: el `def` solo registra la función, y el código de dentro no corre hasta que hay una llamada, que debe estar por debajo de la definición. El nombre empieza por un verbo y describe la única cosa que la función hace.

> [!ejercicio] Practica
>
> Crea un fichero `32-funciones.py` y resuelve:
>
> 1. Escribe una función `imprimir_linea()` que imprima treinta guiones. Llámala tres veces.
> 2. Escribe una función `mostrar_bienvenida()` que imprima tres líneas: un separador, el texto `BIBLIOTECA MUNICIPAL` y otro separador. Reutiliza dentro la función del ejercicio anterior.
> 3. Escribe una función `mostrar_menu()` que imprima cuatro opciones numeradas, y otra `mostrar_despedida()` que imprima un mensaje de cierre. Llama a las tres funciones en el orden lógico de un programa.
> 4. Coloca a propósito una llamada por encima de su definición y ejecuta. Lee el error y comprueba que entiendes por qué sale.
> 5. Define una función y **no** la llames. Ejecuta el programa y observa que no pasa absolutamente nada.
> 6. Busca en un fichero tuyo de lecciones anteriores tres líneas que se repitan y extráelas a una función con un nombre que empiece por verbo.
