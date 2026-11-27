---
titulo: "Ficheros CSV"
resumen: "Leer y escribir ficheros de hoja de cálculo con el módulo csv, y por qué partir por comas a mano nunca funciona del todo."
minutos: 13
orden: 47
---

Un CSV es un fichero de texto donde cada línea es una fila y los campos van separados por comas. Las siglas son de *comma-separated values*, y es el formato en el que cualquier programa del mundo —Excel, un banco, una tienda online, una base de datos— te deja exportar una tabla. Si vas a trabajar con datos que no has generado tú, vas a recibir CSV.

Se ve tan sencillo que la primera reacción es partir cada línea con `split(",")`. Funciona con el fichero de ejemplo, falla con el de verdad.

## Por qué no basta con split

Este es un CSV realista, con nombres de producto como los que salen de una tienda:

```text title="ventas.csv"
producto,unidades,precio
Teclado mecánico,12,89.90
"Ratón inalámbrico, pack de 2",30,24.50
"Monitor 27"" curvo",8,219.00
Alfombrilla grande,45,9.95
```

Hay dos cosas raras ahí, y las dos son CSV perfectamente válido. El segundo producto **lleva una coma dentro del nombre**, por eso va entre comillas. El tercero lleva unas comillas dentro (las pulgadas), y la forma de escribir una comilla dentro de un campo entrecomillado es duplicarla.

Mira qué pasa al partir por comas:

```python
with open("ventas.csv", encoding="utf-8") as fichero:
        for linea in fichero:
                campos = linea.strip().split(",")
        print(len(campos), campos)
```

```salida
3 ['producto', 'unidades', 'precio']
3 ['Teclado mecánico', '12', '89.90']
4 ['"Ratón inalámbrico', ' pack de 2"', '30', '24.50']
3 ['"Monitor 27"" curvo"', '8', '219.00']
3 ['Alfombrilla grande', '45', '9.95']
```

La tercera fila se ha partido en cuatro trozos en vez de tres, y ahora `campos[1]` no es el número de unidades sino un pedazo del nombre. La cuarta conserva las comillas de más. Y falta el tercer caso, el peor: un campo puede contener **un salto de línea** dentro de las comillas, y entonces una fila lógica ocupa dos líneas del fichero y el bucle `for linea in fichero` las trata como dos filas.

Nada de esto se arregla con parches. Se arregla usando el módulo que ya viene hecho.

## Leer con csv.reader

```python
import csv

with open("ventas.csv", encoding="utf-8", newline="") as fichero:
        lector = csv.reader(fichero)
    for fila in lector:
                print(len(fila), fila)
```

```salida
3 ['producto', 'unidades', 'precio']
3 ['Teclado mecánico', '12', '89.90']
3 ['Ratón inalámbrico, pack de 2', '30', '24.50']
3 ['Monitor 27" curvo', '8', '219.00']
3 ['Alfombrilla grande', '45', '9.95']
```

Tres campos en todas las filas, las comillas quitadas, la coma interna respetada y las pulgadas donde debían estar. `csv.reader` envuelve el fichero abierto y te va entregando cada fila como una lista de cadenas.

La cabecera es una fila más, así que hay que apartarla:

```python
import csv

with open("ventas.csv", encoding="utf-8", newline="") as fichero:
        filas = list(csv.reader(fichero))

cabecera = filas[0]
datos = filas[1:]

print(cabecera)
for fila in datos:
        print(f"{fila[0]}: {fila[1]} unidades")
```

```salida
['producto', 'unidades', 'precio']
Teclado mecánico: 12 unidades
Ratón inalámbrico, pack de 2: 30 unidades
Monitor 27" curvo: 8 unidades
Alfombrilla grande: 45 unidades
```

> [!aviso] El parámetro newline="" no es opcional
>
> Fíjate en que el `open()` lleva `newline=""`, con la cadena vacía. No es un capricho: el módulo `csv` se encarga él mismo de los saltos de línea, porque necesita distinguir los que separan filas de los que van dentro de un campo entrecomillado. Si no se lo pones, Python traduce los saltos por su cuenta antes de que el módulo los vea, y pasan dos cosas: al leer, los campos con saltos internos se rompen; al escribir en Windows, el fichero sale con una fila en blanco entre cada dos filas de datos.
>
> La regla es mecánica: **cada `open()` que vaya a un `csv.reader` o a un `csv.writer` lleva `encoding="utf-8"` y `newline=""`**.

## Leer con csv.DictReader, que es lo cómodo

Trabajar con `fila[1]` obliga a recordar qué columna es cada número, y el día que alguien añada una columna al principio se rompe todo en silencio. `DictReader` usa la primera fila como nombres y te entrega cada fila como un diccionario:

```python
import csv

with open("ventas.csv", encoding="utf-8", newline="") as fichero:
        lector = csv.DictReader(fichero)
    for fila in lector:
                print(fila)
```

```salida
{'producto': 'Teclado mecánico', 'unidades': '12', 'precio': '89.90'}
{'producto': 'Ratón inalámbrico, pack de 2', 'unidades': '30', 'precio': '24.50'}
{'producto': 'Monitor 27" curvo', 'unidades': '8', 'precio': '219.00'}
{'producto': 'Alfombrilla grande', 'unidades': '45', 'precio': '9.95'}
```

La cabecera ya no aparece como fila: se ha convertido en las claves. Y el código que la usa se explica solo:

```python
import csv

with open("ventas.csv", encoding="utf-8", newline="") as fichero:
        for fila in csv.DictReader(fichero):
                total = int(fila["unidades"]) * float(fila["precio"])
        print(f"{fila['producto']:<28} {total:>8.2f} €")
```

```salida
Teclado mecánico              1078.80 €
Ratón inalámbrico, pack de 2   735.00 €
Monitor 27" curvo             1752.00 €
Alfombrilla grande             447.75 €
```

> [!aviso] Todo lo que sale de un CSV es texto
>
> No hay excepciones: `fila["unidades"]` es la cadena `"12"`, no el número `12`. Un CSV no guarda tipos, solo caracteres. Si te olvidas de convertir, `fila["unidades"] * 2` te devolverá `"1212"` en vez de `24`, sin dar ningún error. Convierte con `int()` o `float()` en cuanto leas.

## Escribir con csv.writer

```python title="agenda.py"
import csv

filas = [
    ["nombre", "departamento", "extension"],
    ["Lucía Ferrer", "Ventas", "213"],
    ["Mateo Ruiz", "Soporte técnico", "104"],
    ["Noa Oliver", "Administración, RRHH", "310"],
]

with open("agenda.csv", "w", encoding="utf-8", newline="") as fichero:
        escritor = csv.writer(fichero)
    escritor.writerows(filas)
```

```text title="agenda.csv"
nombre,departamento,extension
Lucía Ferrer,Ventas,213
Mateo Ruiz,Soporte técnico,104
Noa Oliver,"Administración, RRHH",310
```

El módulo ha puesto comillas él solo en el único campo que las necesitaba, el que llevaba una coma. Eso es exactamente lo que no consigues concatenando cadenas a mano.

`writerows()` escribe una lista de filas; `writerow()`, en singular, escribe una sola, que es lo que usarás dentro de un bucle.

## Escribir con csv.DictWriter

Si tus datos son diccionarios, lo natural es `DictWriter`. Necesita saber de antemano el orden de las columnas, y la cabecera la escribe él con `writeheader()`:

```python
import csv

empleados = [
    {"nombre": "Lucía Ferrer", "departamento": "Ventas", "extension": "213"},
    {"nombre": "Mateo Ruiz", "departamento": "Soporte técnico", "extension": "104"},
]

with open("agenda.csv", "w", encoding="utf-8", newline="") as fichero:
        campos = ["nombre", "departamento", "extension"]
    escritor = csv.DictWriter(fichero, fieldnames=campos)
    escritor.writeheader()
    escritor.writerows(empleados)
```

```text title="agenda.csv"
nombre,departamento,extension
Lucía Ferrer,Ventas,213
Mateo Ruiz,Soporte técnico,104
```

Si se te olvida `writeheader()`, el fichero sale sin la primera fila y quien lo lea después con `DictReader` tomará al primer empleado como nombres de columna.

## El punto y coma de Excel en español

Abre un CSV con comas en un Excel configurado en español y verás toda la fila metida en la primera celda. El motivo es que en España el separador decimal es la coma (`89,90`), así que Excel no puede usarla también para separar campos y usa el punto y coma.

Se le indica al módulo con `delimiter`:

```python
import csv

with open("ventas-excel.csv", "w", encoding="utf-8", newline="") as fichero:
        escritor = csv.writer(fichero, delimiter=";")
    escritor.writerow(["producto", "unidades", "precio"])
    escritor.writerow(["Teclado mecánico", 12, "89,90"])
```

```text title="ventas-excel.csv"
producto;unidades;precio
Teclado mecánico;12;89,90
```

El mismo parámetro vale para leer: `csv.reader(fichero, delimiter=";")` y `csv.DictReader(fichero, delimiter=";")`. Cuando recibas un CSV ajeno, ábrelo primero con un editor de texto y mira con qué está separado antes de escribir nada.

| Parámetro | Para qué | Valor habitual |
| --- | --- | --- |
| `delimiter` | Carácter que separa campos | `","` o `";"` |
| `quotechar` | Carácter que entrecomilla | `'"'` |
| `fieldnames` | Nombres de columna en `DictWriter` | Una lista de cadenas |

## Un informe completo

Leer las ventas, calcular el importe de cada línea, ordenar y escribir el resultado en otro CSV:

```python title="informe.py"
import csv
from pathlib import Path

BASE = Path(__file__).parent
ENTRADA = BASE / "ventas.csv"
SALIDA = BASE / "informe-ventas.csv"


def leer_ventas(ruta: Path) -> list[dict]:
        """Lee el CSV de ventas y devuelve las filas con los números ya convertidos."""
    ventas = []
    with open(ruta, encoding="utf-8", newline="") as fichero:
                for fila in csv.DictReader(fichero):
                        ventas.append({
                "producto": fila["producto"],
                "unidades": int(fila["unidades"]),
                "precio": float(fila["precio"]),
            })
    return ventas


def calcular_totales(ventas: list[dict]) -> list[dict]:
        """Añade a cada venta su importe total."""
    for venta in ventas:
                venta["total"] = round(venta["unidades"] * venta["precio"], 2)
    return ventas


def escribir_informe(ruta: Path, ventas: list[dict]) -> None:
        """Vuelca el informe ordenado de mayor a menor importe."""
    campos = ["producto", "unidades", "precio", "total"]
    ordenadas = sorted(ventas, key=lambda venta: venta["total"], reverse=True)
    with open(ruta, "w", encoding="utf-8", newline="") as fichero:
                escritor = csv.DictWriter(fichero, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(ordenadas)


ventas = calcular_totales(leer_ventas(ENTRADA))
escribir_informe(SALIDA, ventas)

facturacion = sum([venta["total"] for venta in ventas])
print(f"Productos procesados: {len(ventas)}")
print(f"Facturación total: {facturacion:.2f} €")
print(f"Informe escrito en {SALIDA.name}")
```

```salida
Productos procesados: 4
Facturación total: 4013.55 €
Informe escrito en informe-ventas.csv
```

Y el fichero que deja:

```text title="informe-ventas.csv"
producto,unidades,precio,total
"Monitor 27"" curvo",8,219.0,1752.0
Teclado mecánico,12,89.9,1078.8
"Ratón inalámbrico, pack de 2",30,24.5,735.0
Alfombrilla grande,45,9.95,447.75
```

Fíjate en que los precios han perdido el cero final: `89.90` se ha escrito como `89.9`. Es normal, porque al convertirlos con `float()` dejaron de ser texto y `89.90` y `89.9` son el mismo número. Si necesitas conservar el formato exacto en el fichero de salida, escribe la cadena ya formateada con `f"{venta['precio']:.2f}"`.

El reparto en tres funciones —leer, calcular, escribir— no es adorno. Cada una se puede probar por separado, y el día que los datos lleguen de una base de datos en vez de un CSV solo cambias la primera.

## Errores característicos

> [!error] KeyError: 'producto'
>
> La columna que pides no existe con ese nombre exacto. Antes de nada, imprime las claves reales: `print(fila.keys())`. Las tres causas habituales son un espacio de más en la cabecera (`"producto "`), una mayúscula distinta, o el **BOM**: los CSV exportados por Excel empiezan con una marca invisible y la primera clave te sale como `'\ufeffproducto'`. Esto último se arregla abriendo el fichero con `encoding="utf-8-sig"`, que se come la marca.

> [!error] ValueError: could not convert string to float: '89,90'
>
> El fichero usa la coma como separador decimal, a la española, y `float()` solo entiende el punto. Cambia la coma por un punto antes de convertir: `float(fila["precio"].replace(",", "."))`.

> [!error] ValueError: dict contains fields not in fieldnames: 'nota'
>
> Le estás pasando a `DictWriter` un diccionario con una clave que no aparece en la lista `fieldnames`. O añades la columna a `fieldnames`, o quitas esa clave del diccionario antes de escribir. Es un error útil: te avisa de que ibas a perder un dato por el camino.

> [!error] \_csv.Error: iterator should return strings, not bytes (the file should be opened in text mode)
>
> Has abierto el fichero en modo binario, con `"rb"`. El módulo `csv` trabaja con texto: quita la `b` del modo y pon `encoding="utf-8"` y `newline=""`.

> [!resumen] En resumen
>
> Un CSV parece texto separado por comas, pero admite comas, comillas y saltos de línea dentro de los campos, así que `split(",")` solo funciona con los ficheros de juguete. El módulo `csv` lo resuelve: `csv.reader` entrega cada fila como lista y `csv.DictReader` como diccionario usando la cabecera, que es la forma cómoda y la que no se rompe al cambiar el orden de las columnas. Para escribir, `csv.writer` con `writerow` o `writerows`, y `csv.DictWriter` con su `writeheader()`. Todos los `open()` de un CSV llevan `encoding="utf-8"` y `newline=""`. Lo que sale de un CSV siempre es texto: los números los conviertes tú. Y si el fichero viene de un Excel en español, el separador será `;`.

> [!ejercicio] Practica
>
> Crea un fichero `alumnos.csv` con las columnas `nombre`, `curso` y `nota`, y al menos seis filas, incluyendo un nombre con una coma dentro (`"Pérez Gil, Ana"`). Resuelve en `47-csv.py`:
>
> 1. Léelo con `DictReader` y muestra cada alumno con su nota, alineada a la derecha.
> 2. Calcula y muestra la nota media de la clase con dos decimales.
> 3. Muestra solo los alumnos aprobados, ordenados de mayor a menor nota.
> 4. Escribe un fichero `aprobados.csv` con esos mismos alumnos, usando `DictWriter` y con su cabecera.
> 5. Genera una versión `alumnos-excel.csv` separada por punto y coma y ábrela con una hoja de cálculo para comprobar que las columnas salen bien.
> 6. Añade a mano una fila con la nota vacía, vuelve a ejecutar el primer apartado y lee el error. Después arregla el programa para que esas filas se salten con un aviso en vez de romper el programa.
