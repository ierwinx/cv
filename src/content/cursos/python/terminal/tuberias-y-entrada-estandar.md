---
titulo: "Tuberías y entrada estándar"
resumen: "Cómo leer datos que llegan por una tubería para que tu programa encaje con el resto de herramientas de la terminal."
minutos: 18
orden: 15
---

Cuando Unix se diseñó, en los años setenta, sus autores tomaron una decisión que sigue mandando hoy: en vez de hacer programas enormes que lo hicieran todo, harían programas diminutos que hicieran **una sola cosa bien**, y un mecanismo para encadenarlos. Ese mecanismo es la tubería.

Por eso en la terminal no existe un comando "busca las líneas que contengan Asturias, ordénalas y enséñame las tres primeras". Existen `grep`, `sort` y `head`, y se encadenan. Tu herramienta puede entrar en ese juego, y para eso solo tiene que cumplir una condición: aceptar datos por la entrada estándar y escribir su resultado por la salida estándar.

Todos los ejemplos de la lección usan estos dos ficheros, así que créalos antes de seguir:

```text title="ciudades.txt"
Gijón
Alcalá de Henares
Badajoz
Gijón
Teruel
Badajoz
```

```text title="provincias.txt"
Gijón, Asturias
Avilés, Asturias
Alcalá de Henares, Madrid
Badajoz, Badajoz
Teruel, Teruel
Oviedo, Asturias
```

## Qué es una tubería

La barra vertical `|` conecta dos programas: **lo que el de la izquierda escribe por `stdout` le llega al de la derecha por `stdin`**. Ni fichero temporal, ni disco, ni nada; el sistema pasa los datos de uno a otro directamente.

```bash
sort ciudades.txt | uniq
```

```salida
Alcalá de Henares
Badajoz
Gijón
Teruel
```

`sort` no sabe nada de `uniq` y `uniq` no sabe nada de `sort`. El único contrato entre ellos es texto por líneas. Y como el contrato es tan simple, se pueden encadenar tantos como quieras.

Esto explica por qué en la lección anterior insistíamos tanto en no mezclar `stdout` y `stderr`: en una tubería, todo lo que escribas por `stdout` se convierte en la **entrada** del siguiente programa. Un "Procesando..." colado ahí dentro no es un mensaje, es basura en los datos de otro.

## Leer la entrada estándar en Python

`sys.stdin` es un objeto fichero, igual que el que te devuelve `open()`. Lo que sabes de ficheros vale tal cual aquí.

### Iterando línea a línea

Es la forma habitual y la única razonable cuando la entrada puede ser grande, porque procesa una línea, la suelta y coge la siguiente sin cargarlo todo en memoria.

```python title="mayusculas.py"
import sys

for linea in sys.stdin:
        print(linea.rstrip("\n").upper())
```

```bash
cat provincias.txt | python3 mayusculas.py
```

```salida
GIJÓN, ASTURIAS
AVILÉS, ASTURIAS
ALCALÁ DE HENARES, MADRID
BADAJOZ, BADAJOZ
TERUEL, TERUEL
OVIEDO, ASTURIAS
```

El `rstrip("\n")` no es opcional: cada línea llega con su salto de línea al final, y `print` añade otro. Sin él saldría todo con una línea en blanco de por medio.

### De golpe, con read()

`sys.stdin.read()` devuelve **todo** lo que entre, como una única cadena, y no vuelve hasta que la entrada se acaba. Sirve cuando necesitas el texto entero para responder, como hace `wc`:

```python title="contar.py"
import sys

texto = sys.stdin.read()
print(f"Caracteres: {len(texto)}")
print(f"Palabras: {len(texto.split())}")
print(f"Líneas: {len(texto.splitlines())}")
```

```bash
cat ciudades.txt | python3 contar.py
```

```salida
Caracteres: 53
Palabras: 8
Líneas: 6
```

### Como lista, con readlines()

`sys.stdin.readlines()` también lo lee todo, pero te lo da como una lista de cadenas con el salto de línea incluido. Es cómodo cuando necesitas contarlas o acceder a ellas por posición:

```python title="primeras.py"
import sys

lineas = sys.stdin.readlines()
print(f"He recibido {len(lineas)} líneas")
print(f"La última es: {lineas[-1].strip()}")
```

```bash
cat ciudades.txt | python3 primeras.py
```

```salida
He recibido 6 líneas
La última es: Badajoz
```

| Forma | Qué devuelve | Cuándo usarla |
| --- | --- | --- |
| `for linea in sys.stdin` | Una cadena por vuelta | Casi siempre. Funciona con entradas infinitas |
| `sys.stdin.read()` | Una cadena con todo | Cuando necesitas el texto completo |
| `sys.stdin.readlines()` | Lista de cadenas | Cuando necesitas contar o indexar |

> [!aviso] Las dos últimas se lo comen todo antes de empezar
>
> `read()` y `readlines()` esperan a que la entrada termine. Si la conectas a un programa que escribe sin parar, o a la terminal donde nadie ha cerrado la entrada, tu programa se queda ahí colgado sin hacer nada y parece que se ha bloqueado. Con el bucle `for` eso no pasa: cada línea se procesa en cuanto llega.

## input() lee de lo mismo

`input()` no es un mecanismo aparte: lee una línea de `sys.stdin`, exactamente de donde lee todo lo demás. Lo que pasa es que hasta ahora `stdin` venía siempre del teclado. Si le enchufas una tubería, `input()` la lee sin enterarse:

```python title="preguntar.py"
nombre = input("¿Cómo te llamas? ")
print(f"Hola, {nombre}")
```

```bash
echo "Erwin" | python3 preguntar.py
```

```salida
¿Cómo te llamas? Hola, Erwin
```

Las dos cosas salen en la misma línea porque el mensaje de `input` no lleva salto al final y nadie ha tecleado nada.

Y si la entrada se acaba y `input()` sigue pidiendo, salta un `EOFError`:

```bash
python3 preguntar.py < /dev/null
```

```salida
¿Cómo te llamas? Traceback (most recent call last):
  File "/Users/erwin/curso-python/preguntar.py", line 1, in <module>
    nombre = input("¿Cómo te llamas? ")
             ~~~~~^^^^^^^^^^^^^^^^^^^^^
EOFError: EOF when reading a line
```

> [!error] EOFError: EOF when reading a line
>
> Tu programa ha pedido una línea con `input()` y no queda nada que leer. EOF significa *end of file*, fin de la entrada. Pasa en tres situaciones: alguien ha lanzado tu programa con una tubería que ya se ha vaciado, alguien ha pulsado <kbd>Ctrl</kbd> + <kbd>D</kbd> (en Windows, <kbd>Ctrl</kbd> + <kbd>Z</kbd> y <kbd>Enter</kbd>), o lo has lanzado desde un sitio que no tiene teclado, como una tarea programada.
>
> Si tu programa debe funcionar en los dos mundos, captúralo y decide qué hacer:
>
> ```python
> try:
>         nombre = input("¿Cómo te llamas? ")
> except EOFError:
>         nombre = "anónimo"
> ```

## Saber si hay algo entrando

Una herramienta bien hecha admite las dos formas de uso: si le enchufas una tubería, la procesa; si la lanzas a mano, te pregunta. Para distinguirlo está `sys.stdin.isatty()`.

Un *tty* es un terminal de verdad, con su teclado y su pantalla. `isatty()` devuelve `True` si la entrada viene de ahí y `False` si viene de una tubería o de un fichero redirigido.

```python title="flexible.py"
import sys


def main() -> int:
        if sys.stdin.isatty():
        # Nadie ha conectado una tubería: se lo pedimos a la persona.
                texto = input("Escribe una frase: ")
    else:
        # Los datos vienen de una tubería o de un fichero redirigido.
                texto = sys.stdin.read()

    print(f"{len(texto.split())} palabras")
    return 0


raise SystemExit(main())
```

Lanzado a mano, pregunta:

```bash
python3 flexible.py
```

```salida
Escribe una frase: hola que tal estamos
4 palabras
```

Con una tubería, no pregunta nada:

```bash
echo "una frase de cinco palabras justas" | python3 flexible.py
```

```salida
6 palabras
```

Y con un fichero redirigido, tampoco:

```bash
python3 flexible.py < ciudades.txt
```

```salida
8 palabras
```

> [!nota] Las dos formas de darle un fichero
>
> `cat fichero.txt | programa` y `programa < fichero.txt` hacen lo mismo desde el punto de vista de tu programa: en los dos casos `stdin` trae el contenido del fichero. La segunda es más eficiente, porque se ahorra un proceso intermedio. La primera se escribe igual de bien y es más fácil de ampliar añadiendo más eslabones, que es por lo que la verás tanto.

> [!consejo] isatty también sirve para los colores
>
> El mismo truco vale para `sys.stdout.isatty()`. Si la salida no va a una pantalla, no tiene sentido escribir códigos ANSI de color: acabarían como caracteres raros dentro de un fichero. Las herramientas que sacan color lo hacen solo cuando `sys.stdout.isatty()` es `True`.

## Un filtro completo

Con esto ya se puede escribir un filtro de verdad. Este es un `grep` reducido: lee líneas, se queda con las que contienen un texto y devuelve un código de salida que dice si encontró algo.

```python title="buscar.py"
import argparse
import sys


def main() -> int:
        analizador = argparse.ArgumentParser(
        description="Muestra las líneas de la entrada que contienen un texto."
    )
    analizador.add_argument("patron", help="Texto que hay que buscar")
    analizador.add_argument(
        "-i", "--ignorar-mayusculas",
        action="store_true",
        help="No distinguir mayúsculas de minúsculas",
    )
    analizador.add_argument(
        "-n", "--numerar",
        action="store_true",
        help="Mostrar el número de línea delante",
    )
    argumentos = analizador.parse_args()

    patron = argumentos.patron
    if argumentos.ignorar_mayusculas:
                patron = patron.lower()

    encontradas = 0
    for numero, linea in enumerate(sys.stdin, start=1):
                linea = linea.rstrip("\n")
        comparable = linea.lower() if argumentos.ignorar_mayusculas else linea
        if patron in comparable:
                        encontradas += 1
            print(f"{numero}: {linea}" if argumentos.numerar else linea)

    print(f"{encontradas} líneas encontradas", file=sys.stderr)
    return 0 if encontradas else 1


raise SystemExit(main())
```

```bash
cat provincias.txt | python3 buscar.py Asturias
```

```salida
Gijón, Asturias
Avilés, Asturias
Oviedo, Asturias
3 líneas encontradas
```

```bash
cat provincias.txt | python3 buscar.py -i -n asturias
```

```salida
1: Gijón, Asturias
2: Avilés, Asturias
6: Oviedo, Asturias
3 líneas encontradas
```

Y cuando no encuentra nada, lo dice con el código de salida, igual que hace `grep`:

```bash
cat provincias.txt | python3 buscar.py Sevilla
echo $?
```

```salida
0 líneas encontradas
1
```

Tres decisiones de diseño que convierten este programa en una pieza encajable:

- El resumen va por `stderr`. Si fuera por `stdout`, la línea "3 líneas encontradas" se colaría entre los datos que recibe el siguiente programa de la cadena.
- Los datos van por `stdout` y nada más que los datos.
- El código de salida distingue encontrar de no encontrar, así que se puede usar con `&&`.

Ahora encaja en cualquier cadena:

```bash
cat provincias.txt | python3 buscar.py Asturias | sort
```

```salida
3 líneas encontradas
Avilés, Asturias
Gijón, Asturias
Oviedo, Asturias
```

El resumen aparece arriba porque `sort` necesita leerlo todo antes de poder ordenar, así que sus resultados llegan al final. Y si el resumen te molesta, lo tiras:

```bash
cat provincias.txt | python3 buscar.py Asturias 2>/dev/null | sort
```

```salida
Avilés, Asturias
Gijón, Asturias
Oviedo, Asturias
```

Eso es lo que ganas separando los dos flujos: quien usa tu programa puede quedarse solo con la parte que le interesa.

## Cuando la tubería se rompe

Prueba a encadenar un programa que escriba mucho con `head`, que solo quiere las primeras líneas:

```python title="numeros.py"
for numero in range(1, 1_000_001):
        print(numero)
```

```bash
python3 numeros.py | head -3
```

```salida
1
2
3
Traceback (most recent call last):
  File "/Users/erwin/curso-python/numeros.py", line 2, in <module>
    print(numero)
    ~~~~~^^^^^^^^
BrokenPipeError: [Errno 32] Broken pipe
Exception ignored while flushing sys.stdout:
BrokenPipeError: [Errno 32] Broken pipe
```

No has hecho nada mal. `head` ha leído sus tres líneas, ha decidido que ya tiene bastante y ha cerrado su extremo de la tubería. Tu programa sigue escribiendo hacia un tubo que ya no tiene salida al otro lado, y el sistema le avisa con un `BrokenPipeError`.

Es una situación normalísima en la terminal, así que lo correcto es tratarla como lo que es: una señal de "ya no me hace falta más", no un error del que informar.

```python title="numeros.py"
import os
import sys


def main() -> int:
        for numero in range(1, 1_000_001):
                print(numero)
    return 0


try:
        codigo = main()
except BrokenPipeError:
    # El programa de la derecha ha cerrado la tubería. Mandamos lo que quede
    # de stdout a la basura para que Python no falle otra vez al vaciarlo.
        basura = os.open(os.devnull, os.O_WRONLY)
    os.dup2(basura, sys.stdout.fileno())
    codigo = 141


raise SystemExit(codigo)
```

```bash
python3 numeros.py | head -3
```

```salida
1
2
3
```

> [!nota] Por qué hacen falta esas dos líneas raras
>
> Capturar la excepción no basta. Al terminar el programa, Python intenta vaciar el búfer de `sys.stdout` una última vez, se encuentra la tubería rota otra vez y suelta ese `Exception ignored while flushing sys.stdout`. Las dos líneas con `os.open` y `os.dup2` sustituyen `stdout` por la papelera del sistema, así que ese último vaciado va a parar a ninguna parte y no se queja nadie.
>
> El 141 sale de la convención de la lección anterior: 128 más el número de la señal SIGPIPE, que es la 13.

> [!aviso] En Windows no existe SIGPIPE
>
> `BrokenPipeError` sí existe en Windows, pero las tuberías se comportan de otra forma y este caso concreto casi no aparece. El código de arriba funciona igual en los tres sistemas, así que déjalo puesto.

## Encadenar de verdad

Con todo lo anterior, tu programa ya es un ciudadano más de la terminal. Estas cadenas funcionan sin que hayas escrito una línea de código para ellas:

```bash
cat provincias.txt | python3 mayusculas.py | sort
```

```salida
ALCALÁ DE HENARES, MADRID
AVILÉS, ASTURIAS
BADAJOZ, BADAJOZ
GIJÓN, ASTURIAS
OVIEDO, ASTURIAS
TERUEL, TERUEL
```

```bash
cat provincias.txt | python3 buscar.py -i a 2>/dev/null | head -2
```

```salida
Gijón, Asturias
Avilés, Asturias
```

Y los comandos de la terminal que más vas a encadenar con los tuyos:

| Comando | Qué hace |
| --- | --- |
| `cat fichero` | Vuelca el contenido de un fichero por `stdout` |
| `sort` | Ordena las líneas alfabéticamente |
| `sort -n` | Las ordena como números |
| `uniq` | Elimina líneas repetidas **consecutivas**, por eso suele ir tras `sort` |
| `head -5` | Se queda con las 5 primeras líneas |
| `tail -5` | Se queda con las 5 últimas |
| `wc -l` | Cuenta las líneas |
| `grep texto` | Filtra las líneas que contienen un texto |

> [!nota] En Windows los comandos son otros
>
> Estos son los de macOS y Linux. En PowerShell existen equivalentes (`Get-Content`, `Sort-Object`, `Select-Object -First 5`), y la tubería `|` funciona igual. Si trabajas mucho en la terminal desde Windows, WSL te da los comandos de Linux tal cual.

> [!resumen] En resumen
>
> Una tubería conecta la salida estándar de un programa con la entrada estándar del siguiente, y es lo que permite resolver problemas grandes encadenando herramientas pequeñas. En Python la entrada llega por `sys.stdin`, que se comporta como cualquier fichero: se puede recorrer con un `for` línea a línea, que es lo que debes hacer casi siempre, o leerlo entero con `read()` o `readlines()` cuando necesites el texto completo. `input()` lee de ese mismo sitio, por eso funciona con tuberías, y lanza `EOFError` cuando la entrada se agota. Con `sys.stdin.isatty()` distingues si alguien te ha enchufado datos o si el programa se ha lanzado a mano, y así admites las dos formas de uso. Un filtro bien hecho manda solo los datos por `stdout`, los avisos por `stderr` y devuelve un código de salida con significado. Y cuando el programa de la derecha cierra antes de tiempo, como hace `head`, salta un `BrokenPipeError` que hay que capturar para terminar en silencio.

> [!ejercicio] Practica
>
> Crea los ficheros que se indican y resuelve:
>
> 1. Escribe `15-numerar.py` que lea la entrada estándar y escriba cada línea precedida de su número, alineado a la derecha en cuatro espacios. Pruébalo con `cat provincias.txt | python3 15-numerar.py`.
> 2. Escribe `15-contar.py`, una versión propia de `wc`, que muestre líneas, palabras y caracteres. Compara su resultado con el de `wc` de verdad sobre el mismo fichero.
> 3. Escribe `15-invertir.py` que lea todas las líneas y las imprima en orden inverso. Piensa antes si aquí puedes usar el bucle `for` o necesitas `readlines()`, y explica por qué.
> 4. Amplía `15-numerar.py` para que, si `sys.stdin.isatty()` es `True`, avise por `stderr` de que se esperan datos por una tubería y devuelva 2.
> 5. Encadena tus tres programas en una sola línea de terminal junto con `sort` y `head`, y comprueba que el resultado es el que esperas.
> 6. Escribe un programa que imprima un millón de líneas y encadénalo con `head -5`. Reproduce el `BrokenPipeError`, arréglalo con el patrón de la lección y comprueba que la traza desaparece.
