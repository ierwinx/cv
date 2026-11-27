---
titulo: "Tablas y cajas de texto"
resumen: "Calcular anchos de columna, alinear, truncar y dibujar marcos con caracteres Unicode para presentar datos legibles sin instalar nada."
minutos: 24
orden: 6
---

Diez productos impresos con un `print` por línea son diez líneas que hay que leer de una en una. Los mismos diez en columnas alineadas se leen de un barrido: los nombres a la izquierda, las cantidades en su sitio, los precios en el suyo, y cualquier valor raro salta a la vista porque rompe la vertical.

La alineación ya la sabes hacer: es el `{valor:<20}` de la lección de f-strings. Lo que falta es el resto del trabajo, que es lo que se hace pesado: decidir cuánto mide cada columna a partir de los datos, recortar lo que no cabe, dibujar los bordes y no descuadrarlo todo con un carácter ancho. Se resuelve una vez, en una función, y ya no se vuelve a pensar en ello.

> [!objetivo] Qué vas a aprender
>
> Calcular el ancho de cada columna a partir de los datos, alinear texto y números según su tipo, truncar con puntos suspensivos lo que no cabe, dibujar marcos y tablas con los caracteres de dibujo de Unicode, tratar los caracteres de ancho doble y dejar escritas dos funciones reutilizables, `tabla` y `caja`.

## El problema de los anchos a mano

El primer intento siempre es este: anchos fijos, escritos a ojo.

```python
filas = [
    ["Teclado mecánico", 12, 89.9],
    ["Ratón inalámbrico", 34, 24.5],
    ["Alfombrilla", 120, 7.95],
]

print(f"{'Producto':<20}{'Unidades':>10}{'Precio':>10}")
print("-" * 40)
for nombre, unidades, precio in filas:
        print(f"{nombre:<20}{unidades:>10}{precio:>10.2f}")
```

```salida
Producto              Unidades    Precio
----------------------------------------
Teclado mecánico            12     89.90
Ratón inalámbrico           34     24.50
Alfombrilla                120      7.95
```

Se lee bien, y para una tabla que no va a cambiar nunca es una solución perfectamente válida. Tiene dos problemas: el `20` sobra para estos nombres y se queda corto para el siguiente producto que llegue, y el `40` de la línea de guiones hay que recalcularlo a mano cada vez que se toque una columna.

## El ancho sale de los datos

Lo que mide una columna es lo que mida su valor más largo, cabecera incluida:

```python
cabeceras = ["Producto", "Unidades", "Precio"]

anchos = []
for indice, cabecera in enumerate(cabeceras):
        largos = [len(cabecera)] + [len(str(fila[indice])) for fila in filas]
    anchos.append(max(largos))

print(anchos)
```

```salida
[17, 8, 6]
```

Diecisiete por `Ratón inalámbrico`, ocho por la cabecera `Unidades` y seis por `Precio`, que es más largo que cualquiera de sus valores. Fíjate en el `str()`: las celdas pueden ser números, y `len()` de un número no existe.

Con eso, la tabla se dibuja sola. Los anchos entran en las f-strings entre llaves, como viste en la lección de cadenas formateadas:

```python
def tabla_simple(cabeceras: list[str], filas: list[list]) -> str:
        """Devuelve una tabla sin bordes, con cada columna a su ancho."""
    anchos = [
        max(len(str(cabecera)), *(len(str(fila[indice])) for fila in filas))
        for indice, cabecera in enumerate(cabeceras)
    ]
    lineas = ["  ".join(f"{c:<{a}}" for c, a in zip(cabeceras, anchos))]
    lineas.append("  ".join("-" * a for a in anchos))
    for fila in filas:
                lineas.append("  ".join(f"{str(v):<{a}}" for v, a in zip(fila, anchos)))
    return "\n".join(linea.rstrip() for linea in lineas)


print(tabla_simple(cabeceras, filas))
```

```salida
Producto           Unidades  Precio
-----------------  --------  ------
Teclado mecánico   12        89.9
Ratón inalámbrico  34        24.5
Alfombrilla        120       7.95
```

Tres cosas de esa función merecen comentario:

- **`zip(cabeceras, anchos)`** empareja cada valor con el ancho de su columna. Es el uso de libro de `zip`, y evita tener que ir arrastrando un índice.
- **La separación entre columnas está en el `join`**, no en los anchos. Dos espacios, en un solo sitio; cambiar a tres es cambiar una cadena.
- **El `rstrip()` final** quita los espacios de relleno de la última columna, que no aportan nada y ensucian el fichero si alguien redirige la salida.

Queda un detalle chirriando: los números están alineados a la izquierda, y así no se pueden comparar de un vistazo.

## Los números, a la derecha

Con los números pegados a la derecha, las unidades y las decenas se ponen en la misma vertical y la columna se lee como una suma. Con los textos es al revés: alineados a la izquierda se leen; centrados o a la derecha, no.

La regla, entonces, es mirar el tipo del dato:

```python
def es_numero(valor: object) -> bool:
        """True para enteros y decimales, pero no para booleanos."""
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)
```

Esa exclusión de los booleanos parece un capricho y no lo es: en Python, `bool` es una subclase de `int`, así que `isinstance(True, int)` vale `True`. Sin la segunda comprobación, una columna de sí y no se alinearía como si fueran números.

Una columna se alinea a la derecha cuando **todos** sus valores son números. Si hay uno solo que no lo sea, mejor tratarla como texto:

```python
derechas = [
    bool(filas) and all(es_numero(fila[indice]) for fila in filas)
    for indice in range(len(cabeceras))
]
print(derechas)
```

```salida
[False, True, True]
```

## Truncar lo que no cabe

Un nombre de producto de sesenta caracteres estira su columna y desplaza a las demás fuera de la pantalla. La solución es un ancho máximo y un corte marcado con puntos suspensivos, para que quede claro que hay más texto:

```python
def recortar(texto: str, ancho: int) -> str:
        """Recorta el texto a ese ancho visible y marca el corte con puntos."""
    if ancho_visible(texto) <= ancho:
                return texto
    resultado = ""
    for caracter in texto:
                if ancho_visible(resultado + caracter) > ancho - 1:
                        break
        resultado += caracter
    return resultado + "…"
```

```python
print(recortar("Monitor de 27 pulgadas", 12))
```

```salida
Monitor de …
```

El resultado ocupa doce columnas exactas: once de texto y una de los puntos suspensivos. Ese carácter `…` es uno solo, no tres puntos seguidos, y por eso cuesta una única columna. El `ancho - 1` del bucle es lo que le reserva su sitio.

> [!consejo] Recortar es mejor que dejar que se descuadre
>
> En el proyecto del módulo 1 el título se recortaba con `titulo[:ANCHO]`, que es más corto de escribir y vale perfectamente cuando todo el texto es ASCII. La versión de aquí hace dos cosas más: marca que ha cortado y cuenta columnas de pantalla en vez de caracteres, que no es lo mismo, como verás enseguida.

## Los caracteres de dibujo

Unicode tiene un bloque entero de caracteres pensados para dibujar marcos, que en una tipografía de anchura fija encajan unos con otros sin dejar huecos. Estos son los que hacen falta:

| Carácter | Nombre | Para qué |
| --- | --- | --- |
| `─` | Horizontal | Los tramos de arriba, abajo y el separador |
| `│` | Vertical | Los lados y las separaciones entre columnas |
| `┌` `┐` `└` `┘` | Esquinas | Las cuatro puntas del marco |
| `┬` `┴` | Te arriba y abajo | Donde un separador de columna toca el borde |
| `├` `┤` | Te izquierda y derecha | Donde la línea separadora toca los lados |
| `┼` | Cruce | El encuentro de la separadora con un separador de columna |

Con once caracteres se dibuja cualquier tabla. Y hay más juegos completos: de línea doble, de esquinas redondeadas y de línea gruesa.

| Juego | Caracteres |
| --- | --- |
| Simple | `┌┬┐` `├┼┤` `└┴┘` `─` `│` |
| Doble | `╔╦╗` `╠╬╣` `╚╩╝` `═` `║` |
| Redondo | `╭┬╮` `├┼┤` `╰┴╯` `─` `│` |

Agrupados en tuplas de cinco, con las tres filas de uniones, el horizontal y el vertical, se guardan así:

```python
MARCOS = {
    "simple": ("┌┬┐", "├┼┤", "└┴┘", "─", "│"),
    "doble": ("╔╦╗", "╠╬╣", "╚╩╝", "═", "║"),
    "redondo": ("╭┬╮", "├┼┤", "╰┴╯", "─", "│"),
}
```

Y se sacan con un desempaquetado de una línea, que además pone nombre a cada trozo:

```python
superior, intermedia, inferior, horizontal, vertical = MARCOS["simple"]
```

> [!aviso] Esto necesita UTF-8
>
> Los caracteres de dibujo no son ASCII. En una terminal mal configurada, o al redirigir la salida a un fichero que luego se lee con otra codificación, salen convertidos en símbolos raros. En Linux y macOS no suele haber problema; en Windows, la terminal moderna va bien y las consolas antiguas necesitan `chcp 65001`. Si tu programa tiene que funcionar en cualquier sitio, deja un juego de repuesto con `+`, `-` y `|`.

## El problema de los caracteres anchos

Aquí viene la trampa. Una tipografía de anchura fija no es tan fija: hay caracteres que ocupan **dos columnas**, en particular los ideogramas del chino, el japonés y el coreano, y los emojis. Para Python son un carácter, pero en la pantalla valen dos, así que `len()` miente:

```python
etiquetas = ["python", "🐍 python", "東京", "café"]

for etiqueta in etiquetas:
        print(f"|{etiqueta:<12}| {len(etiqueta)}")
```

```salida
|python      | 6
|🐍 python    | 8
|東京          | 2
|café        | 4
```

Mira los cierres de la segunda y la tercera línea: la `|` no está en la misma columna que en las otras. Python ha rellenado hasta doce *caracteres*, pero la serpiente se come dos columnas y cada ideograma, otras dos. La cuarta línea, en cambio, sale bien: las letras acentuadas del español son de ancho normal.

La medida de verdad la da `unicodedata`, que sabe la categoría de ancho de cada carácter:

```python
import unicodedata


def ancho_visible(texto: str) -> int:
        """Columnas que ocupa el texto en pantalla, contando los anchos dobles."""
    total = 0
    for caracter in texto:
                total += 2 if unicodedata.east_asian_width(caracter) in "WF" else 1
    return total
```

Las categorías `W` (*wide*) y `F` (*fullwidth*) son las que ocupan dos. Con esa función, el relleno se calcula a mano en vez de dejárselo a la f-string:

```python
for etiqueta in etiquetas:
        relleno = " " * (12 - ancho_visible(etiqueta))
    print(f"|{etiqueta}{relleno}| {ancho_visible(etiqueta)}")
```

```salida
|python      | 6
|🐍 python   | 9
|東京        | 4
|café        | 4
```

Ahora las cuatro barras de cierre están en la misma columna.

> [!nota] Los casos que esto no resuelve
>
> `east_asian_width` devuelve `A`, de ambiguo, para unos cuantos caracteres, como las flechas y algunos símbolos. En una terminal occidental ocupan una columna y en una asiática, dos; la función de arriba asume una, que es la opción correcta aquí. Tampoco resuelve los emojis compuestos, como los de familias o los que llevan modificador de color de piel, que son varios caracteres pegados con uniones invisibles y cuyo ancho real depende de la terminal. Si tus datos llevan eso, prueba en la terminal en la que se va a usar el programa: es el único juez.

## La función tabla

Todo junto, en un módulo reutilizable:

```python title="tabla.py"
"""Tablas de texto para la terminal, solo con la biblioteca estándar."""

import unicodedata

MARCOS = {
    "simple": ("┌┬┐", "├┼┤", "└┴┘", "─", "│"),
    "doble": ("╔╦╗", "╠╬╣", "╚╩╝", "═", "║"),
    "redondo": ("╭┬╮", "├┼┤", "╰┴╯", "─", "│"),
}


def ancho_visible(texto: str) -> int:
        """Columnas que ocupa el texto en pantalla, contando los anchos dobles."""
    total = 0
    for caracter in texto:
                total += 2 if unicodedata.east_asian_width(caracter) in "WF" else 1
    return total


def recortar(texto: str, ancho: int) -> str:
        """Recorta el texto a ese ancho visible y marca el corte con puntos."""
    if ancho_visible(texto) <= ancho:
                return texto
    resultado = ""
    for caracter in texto:
                if ancho_visible(resultado + caracter) > ancho - 1:
                        break
        resultado += caracter
    return resultado + "…"


def rellenar(texto: str, ancho: int, derecha: bool = False) -> str:
        """Añade espacios hasta el ancho pedido, contando los anchos dobles."""
    huecos = " " * max(0, ancho - ancho_visible(texto))
    return huecos + texto if derecha else texto + huecos


def es_numero(valor: object) -> bool:
        """True para enteros y decimales, pero no para booleanos."""
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)


def calcular_anchos(cabeceras: list[str], filas: list[list], maximo: int) -> list[int]:
        """El ancho de cada columna: el del dato más largo, con un tope."""
    anchos = []
    for indice, cabecera in enumerate(cabeceras):
                largos = [ancho_visible(str(cabecera))]
        largos += [ancho_visible(str(fila[indice])) for fila in filas]
        anchos.append(min(max(largos), maximo))
    return anchos


def tabla(
    cabeceras: list[str],
    filas: list[list],
    marco: str = "simple",
    maximo: int = 30,
    derechas: list[bool] | None = None,
) -> str:
        """Devuelve las filas dibujadas como una tabla con bordes."""
    superior, intermedia, inferior, horizontal, vertical = MARCOS[marco]
    anchos = calcular_anchos(cabeceras, filas, maximo)

    if derechas is None:
                derechas = [
            bool(filas) and all(es_numero(fila[indice]) for fila in filas)
            for indice in range(len(cabeceras))
        ]

    def borde(esquinas: str) -> str:
                izquierda, centro, derecha = esquinas
        tramos = (horizontal * (ancho + 2) for ancho in anchos)
        return izquierda + centro.join(tramos) + derecha

    def fila_de_texto(celdas: list, alineaciones: list[bool]) -> str:
                casillas = []
        for celda, ancho, derecha in zip(celdas, anchos, alineaciones):
                        texto = recortar(str(celda), ancho)
            casillas.append(" " + rellenar(texto, ancho, derecha) + " ")
        return vertical + vertical.join(casillas) + vertical

    lineas = [
        borde(superior),
        fila_de_texto(cabeceras, [False] * len(cabeceras)),
        borde(intermedia),
    ]
    lineas += [fila_de_texto(fila, derechas) for fila in filas]
    lineas.append(borde(inferior))
    return "\n".join(lineas)
```

Las dos funciones de dentro, `borde` y `fila_de_texto`, están definidas ahí porque solo tienen sentido ahí: usan `anchos`, `horizontal` y `vertical` sin recibirlos por parámetro, gracias a lo que viste en la lección de ámbito de las variables. El `+ 2` de `borde` es el hueco de un espacio a cada lado de cada celda.

Funcionando:

```python
from tabla import tabla

cabeceras = ["Producto", "Unidades", "Precio"]
filas = [
    ["Teclado mecánico", 12, 89.9],
    ["Ratón inalámbrico", 34, 24.5],
    ["Monitor de 27 pulgadas y panel IPS", 3, 249.0],
]

print(tabla(cabeceras, filas))
```

```salida
┌────────────────────────────────┬──────────┬────────┐
│ Producto                       │ Unidades │ Precio │
├────────────────────────────────┼──────────┼────────┤
│ Teclado mecánico               │       12 │   89.9 │
│ Ratón inalámbrico              │       34 │   24.5 │
│ Monitor de 27 pulgadas y pane… │        3 │  249.0 │
└────────────────────────────────┴──────────┴────────┘
```

El mismo dato, más estrecho y con línea doble:

```python
print(tabla(cabeceras, filas, marco="doble", maximo=20))
```

```salida
╔══════════════════════╦══════════╦════════╗
║ Producto             ║ Unidades ║ Precio ║
╠══════════════════════╬══════════╬════════╣
║ Teclado mecánico     ║       12 ║   89.9 ║
║ Ratón inalámbrico    ║       34 ║   24.5 ║
║ Monitor de 27 pulga… ║        3 ║  249.0 ║
╚══════════════════════╩══════════╩════════╝
```

Los precios salen como `89.9` y `249.0`, que para una factura no vale. La solución no es complicar la función, sino **darle los datos ya formateados** y decirle cómo alinear:

```python
formateadas = [
    ["Teclado mecánico", "12", "89,90 €"],
    ["Ratón inalámbrico", "34", "24,50 €"],
    ["Alfombrilla", "120", "7,95 €"],
]

print(tabla(cabeceras, formateadas, derechas=[False, True, True]))
```

```salida
┌───────────────────┬──────────┬─────────┐
│ Producto          │ Unidades │ Precio  │
├───────────────────┼──────────┼─────────┤
│ Teclado mecánico  │       12 │ 89,90 € │
│ Ratón inalámbrico │       34 │ 24,50 € │
│ Alfombrilla       │      120 │  7,95 € │
└───────────────────┴──────────┴─────────┘
```

Esa es la división de responsabilidades que interesa: **la tabla dibuja, no decide el formato de los números**. Cuántos decimales lleva un precio o cómo se escribe una fecha es cosa de quien conoce los datos.

Y con caracteres de ancho doble sigue cuadrando, que era lo que se buscaba con `ancho_visible`:

```python
print(tabla(["Ciudad", "Habitantes"], [["東京", 13960000], ["Madrid", 3223000]]))
```

```salida
┌────────┬────────────┐
│ Ciudad │ Habitantes │
├────────┼────────────┤
│ 東京   │   13960000 │
│ Madrid │    3223000 │
└────────┴────────────┘
```

## La función caja

La otra necesidad habitual es enmarcar un mensaje, sin columnas. Se resuelve con las mismas piezas y sirve para destacar avisos y para dibujar el encabezado de un menú:

```python title="tabla.py"
def caja(lineas: list[str], marco: str = "simple", titulo: str = "") -> str:
        """Rodea las líneas con un marco del ancho de la más larga."""
    superior, _, inferior, horizontal, vertical = MARCOS[marco]
    ancho = max(ancho_visible(linea) for linea in lineas)
    ancho = max(ancho, ancho_visible(titulo) + 2)

    izquierda, _, derecha = superior
    if titulo:
                relleno = horizontal * (ancho - ancho_visible(titulo) - 1)
        arriba = f"{izquierda}{horizontal} {titulo} {relleno}{derecha}"
    else:
                arriba = izquierda + horizontal * (ancho + 2) + derecha

    izquierda, _, derecha = inferior
    abajo = izquierda + horizontal * (ancho + 2) + derecha

    medio = [f"{vertical} {rellenar(linea, ancho)} {vertical}" for linea in lineas]
    return "\n".join([arriba, *medio, abajo])
```

```python
print(caja(["Copia terminada.", "24 ficheros, 3,4 MB."]))
print(caja(["No se ha encontrado config.toml.", "Se usarán los valores por defecto."], marco="doble"))
print(caja(["Pulsa [1] para continuar", "Pulsa [0] para salir"], marco="redondo", titulo="AYUDA"))
```

```salida
┌──────────────────────┐
│ Copia terminada.     │
│ 24 ficheros, 3,4 MB. │
└──────────────────────┘
╔════════════════════════════════════╗
║ No se ha encontrado config.toml.   ║
║ Se usarán los valores por defecto. ║
╚════════════════════════════════════╝
╭─ AYUDA ──────────────────╮
│ Pulsa [1] para continuar │
│ Pulsa [0] para salir     │
╰──────────────────────────╯
```

Ese guion bajo de `superior, _, inferior, ...` es la costumbre de Python para decir "este valor no me interesa": la fila de uniones intermedias no hace falta en una caja sin columnas.

> [!consejo] Ajusta el ancho máximo a la terminal
>
> Con lo de la lección de salida en pantalla, el tope de las columnas se puede calcular en vez de escribirse: `maximo = shutil.get_terminal_size().columns // 3` da un reparto razonable para una tabla de tres columnas. Es una línea y hace que tu tabla se comporte igual de bien en una ventana ancha y en una estrecha.

> [!error] TypeError: object of type 'int' has no len()
>
> Has llamado a `len()` sobre un número. Pasa siempre al calcular anchos, porque las celdas de una tabla pueden ser de cualquier tipo. Convierte a texto antes: `len(str(valor))`.

> [!error] IndexError: list index out of range
>
> Al recorrer las filas por índice, una fila con menos elementos que cabeceras rompe el bucle. Comprueba los datos antes de dibujar: `all(len(fila) == len(cabeceras) for fila in filas)`. Es dos líneas y ahorra un rato de desconcierto cuando el fallo viene de un CSV con una línea incompleta.

> [!error] Los bordes salen descolocados solo en algunas filas
>
> Casi siempre es un carácter de ancho doble, un emoji o un tabulador metido en los datos. Los dos primeros los arregla `ancho_visible`; el tabulador no, porque su ancho depende de la posición en la línea. Sustitúyelos al entrar los datos con `texto.replace("\t", " ")`.

> [!resumen] En resumen
>
> Una tabla legible es aritmética sobre los datos, no anchos escritos a mano. El ancho de cada columna es el de su valor más largo, cabecera incluida y convertido a texto, con un tope para que un dato enorme no la estire. Los textos van a la izquierda y los números a la derecha, y para decidirlo se mira el tipo con `isinstance`, excluyendo los booleanos, que en Python son enteros. Lo que no cabe se recorta marcando el corte con el carácter `…`, que ocupa una sola columna. Los bordes se dibujan con los once caracteres de dibujo de Unicode, que tienen juego simple, doble y redondeado. Y el ancho de pantalla no es el número de caracteres: los ideogramas y los emojis ocupan dos columnas, así que hay que medir con `unicodedata.east_asian_width` en lugar de con `len`. Todo eso, encerrado en una `tabla(cabeceras, filas)` y una `caja(lineas)`, se escribe una vez y se usa siempre.

> [!ejercicio] Practica
>
> Crea el módulo `tabla.py` de la lección y un fichero `06-tablas.py` que lo use:
>
> 1. Añade a `tabla` un parámetro `total=False` que, cuando sea verdadero, añada una última fila con la suma de las columnas numéricas, separada por una línea intermedia.
> 2. Escribe una función `tabla_desde_csv(ruta)` que lea un fichero CSV con el módulo `csv` y lo muestre con `tabla`, usando su primera fila como cabeceras.
> 3. Añade un juego de marcos `"ascii"` con `+`, `-` y `|`, para terminales que no entiendan UTF-8, y comprueba que el resto de la función no necesita ni un cambio.
> 4. Escribe una función `columnas(elementos, ancho_total)` que reparta una lista larga de nombres cortos en varias columnas que quepan en la terminal, como hace `ls`.
> 5. Coge el gestor de tareas del módulo 1 y sustituye su `mostrar_tareas` por una llamada a `tabla`, dándole los datos ya formateados y las alineaciones.
> 6. Mete un emoji en el nombre de un producto y comprueba que la tabla sigue cuadrada. Luego prueba con un emoji de familia, de los que llevan varias figuras, y mira qué pasa en tu terminal.
