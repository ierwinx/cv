---
titulo: "Tipos y validación"
resumen: "Convertir los argumentos al tipo que toca y rechazar los valores imposibles antes de que lleguen a tu código."
minutos: 25
orden: 11
---

Todo lo que llega por la línea de comandos es texto. Eso significa que el `-n 3` que has escrito no es el número 3, sino la cadena `'3'`, y que multiplicarla por dos da `'33'`. La conversión hay que hacerla, y hasta ahora la hacías tú con un `try`/`except` alrededor de `int()`.

No hace falta. `argparse` puede convertir el valor mientras lo lee, y puede además rechazar los que no tengan sentido: un puerto fuera de rango, un formato que no existe, una fecha mal escrita. Hacerlo ahí tiene una ventaja que no es solo de comodidad: **cuando `parse_args()` termina, todo lo que hay en el `Namespace` está ya convertido y comprobado**, y el resto del programa puede confiar en ello sin volver a mirar.

> [!objetivo] Qué vas a aprender
>
> Convertir valores con `type`, escribir funciones de conversión propias que rechacen lo inválido con `ArgumentTypeError`, limitar los valores admitidos con `choices`, controlar cuántos valores consume un argumento con `nargs`, declarar opciones incompatibles con `add_mutually_exclusive_group` y hacer con `parser.error()` las comprobaciones que `argparse` no puede hacer solo.

## El parámetro `type`

Se le pasa una función, y `argparse` la aplica al texto antes de guardarlo. Las dos más habituales son `int` y `float`:

```python title="repetir.py"
import argparse

analizador = argparse.ArgumentParser(description="Repite un mensaje.")
analizador.add_argument("mensaje", help="lo que hay que repetir")
analizador.add_argument("-n", "--veces", type=int, default=1, help="cuántas veces repetirlo")
analizador.add_argument("--pausa", type=float, default=0.0, help="segundos entre repeticiones")
argumentos = analizador.parse_args()

print(type(argumentos.veces), argumentos.veces)
print(type(argumentos.pausa), argumentos.pausa)
for numero in range(argumentos.veces):
        print(f"{numero + 1}: {argumentos.mensaje}")
```

```bash
python3 repetir.py "Hola" -n 3 --pausa 0.5
```

```salida
<class 'int'> 3
<class 'float'> 0.5
1: Hola
2: Hola
3: Hola
```

Los valores llegan ya como `int` y como `float`, y el `range` funciona directamente. Fíjate también en que el `default=1` **no pasa por la conversión**: se guarda tal cual, así que tiene que ser ya del tipo correcto. Poner `default="1"` con `type=int` es un error silencioso que solo se nota cuando nadie escribe la opción.

Cuando el texto no se puede convertir, `argparse` se encarga:

```bash
python3 repetir.py "Hola" -n tres
```

```salida
usage: repetir.py [-h] [-n VECES] [--pausa PAUSA] mensaje
repetir.py: error: argument -n/--veces: invalid int value: 'tres'
```

```bash
python3 repetir.py "Hola" --pausa medio
```

```salida
usage: repetir.py [-h] [-n VECES] [--pausa PAUSA] mensaje
repetir.py: error: argument --pausa: invalid float value: 'medio'
```

El mensaje dice qué opción ha fallado, a qué tipo intentaba convertir y qué texto recibió. Es más información de la que darían tres líneas de `try`/`except` escritas a mano, y sale con código 2 como cualquier otro error de invocación.

> [!aviso] `type=int` rechaza los decimales
>
> `int("3.5")` lanza `ValueError`, así que un `3.5` en una opción declarada como `int` se rechaza en vez de truncarse:
>
> ```bash
> python3 repetir.py "Hola" -n 3.5
> ```
>
> ```salida
> usage: repetir.py [-h] [-n VECES] [--pausa PAUSA] mensaje
> repetir.py: error: argument -n/--veces: invalid int value: '3.5'
> ```
>
> Es el comportamiento correcto y conviene saberlo: si quieres aceptar `3.5` y quedarte con el 3, necesitas una función de conversión propia que haga `int(float(texto))`, y más te vale que sea una decisión consciente.

## Cualquier función vale como `type`

`type` no se limita a los tipos incorporados. Acepta **cualquier función que reciba una cadena y devuelva algo**. Con eso, la conversión y la validación se hacen en el mismo sitio.

La convención es lanzar `argparse.ArgumentTypeError` cuando el valor no sirve, porque `argparse` la captura y la convierte en un mensaje de error con el formato de siempre.

```python title="servidor.py"
"""Arranca un servidor de mentira en un puerto validado."""

import argparse
from datetime import date


def puerto(texto: str) -> int:
        """Convierte el texto en un número de puerto válido."""
    try:
                numero = int(texto)
    except ValueError:
                raise argparse.ArgumentTypeError(f"'{texto}' no es un número entero")
    if not 1 <= numero <= 65535:
                raise argparse.ArgumentTypeError(f"{numero} está fuera del rango 1-65535")
    if numero < 1024:
                raise argparse.ArgumentTypeError(f"{numero} es un puerto reservado del sistema")
    return numero


def fecha_iso(texto: str) -> date:
        """Convierte el texto en una fecha, esperando el formato AAAA-MM-DD."""
    try:
                return date.fromisoformat(texto)
    except ValueError:
                raise argparse.ArgumentTypeError(f"'{texto}' no es una fecha AAAA-MM-DD")


analizador = argparse.ArgumentParser(description="Arranca el servidor de informes.")
analizador.add_argument("-p", "--puerto", type=puerto, default=8000,
                        help="puerto de escucha, entre 1024 y 65535")
analizador.add_argument("--desde", type=fecha_iso, default=date.today(),
                        help="primera fecha del informe, en formato AAAA-MM-DD")
argumentos = analizador.parse_args()

print(f"puerto = {argumentos.puerto!r}")
print(f"desde  = {argumentos.desde!r}")
```

Con valores correctos, el programa recibe un `int` y un objeto `date`, listos para usar:

```bash
python3 servidor.py -p 8080 --desde 2026-01-15
```

```salida
puerto = 8080
desde  = datetime.date(2026, 1, 15)
```

Y cada validación fallida da su propio mensaje, escrito por ti:

```bash
python3 servidor.py -p 80
```

```salida
usage: servidor.py [-h] [-p PUERTO] [--desde DESDE]
servidor.py: error: argument -p/--puerto: 80 es un puerto reservado del sistema
```

```bash
python3 servidor.py -p 99999
```

```salida
usage: servidor.py [-h] [-p PUERTO] [--desde DESDE]
servidor.py: error: argument -p/--puerto: 99999 está fuera del rango 1-65535
```

```bash
python3 servidor.py --desde 15/01/2026
```

```salida
usage: servidor.py [-h] [-p PUERTO] [--desde DESDE]
servidor.py: error: argument --desde: '15/01/2026' no es una fecha AAAA-MM-DD
```

Tres cosas que merece la pena notar de estas funciones:

- **El nombre de la función se ve.** Cuando falla por una vía que no controlas, `argparse` lo usa para construir el mensaje genérico, del estilo `invalid puerto value: '80'`. Por eso conviene que describa lo que la función devuelve, no lo que comprueba: `puerto`, no `validar_puerto`.
- **Cada motivo de rechazo tiene su frase.** Un solo mensaje genérico del estilo "puerto no válido" obliga a adivinar. Tres mensajes distintos cuestan tres líneas.
- **El mensaje va sin el nombre de la opción.** `argparse` ya antepone `argument -p/--puerto:`, así que repetirlo en tu texto lo duplica.

> [!aviso] No uses `ValueError`, usa `ArgumentTypeError`
>
> Si tu función de conversión deja escapar una excepción que no sea `ArgumentTypeError`, `TypeError` o `ValueError`, el programa muere con un traceback en vez de con un mensaje de error decente. Y aunque `ValueError` sí está contemplada, `argparse` la convierte en el mensaje genérico `invalid puerto value: '80'`, que pierde tu explicación. `ArgumentTypeError` es la única que conserva el texto que has escrito.

## `type=Path` para las rutas

La clase `Path` de `pathlib` recibe una cadena y devuelve un objeto, así que encaja como `type` sin ninguna envoltura:

```python title="rutas.py"
import argparse
from pathlib import Path

analizador = argparse.ArgumentParser(description="Recibe rutas ya convertidas.")
analizador.add_argument("entrada", type=Path, help="fichero de entrada")
analizador.add_argument("-d", "--destino", type=Path, default=Path("."),
                        help="carpeta donde escribir")
argumentos = analizador.parse_args()

print(repr(argumentos.entrada))
print(argumentos.entrada.suffix)
print(argumentos.entrada.stem)
print(argumentos.entrada.exists())
print(argumentos.destino / argumentos.entrada.with_suffix(".html").name)
```

```bash
python3 rutas.py notas.md -d salida
```

```salida
PosixPath('notas.md')
.md
notas
True
salida/notas.html
```

Es la forma correcta de recibir rutas: te ahorras el `Path(argumentos.entrada)` repetido por todo el programa y tienes disponibles `.suffix`, `.stem`, `.exists()` y el operador `/` desde la primera línea. Ese `PosixPath` de la primera línea es lo que devuelve `Path` en macOS y Linux; en Windows verás `WindowsPath`, y todo lo demás funciona igual.

Lo que **no** hace `type=Path` es comprobar que el fichero existe. `Path` acepta cualquier texto:

```bash
python3 rutas.py no-existe.md
```

```salida
PosixPath('no-existe.md')
.md
no-existe
False
no-existe.html
```

Y es lo lógico: un argumento puede ser un fichero que hay que crear, no solo uno que hay que leer. Comprobar la existencia es una validación aparte, y la verás al final de la lección.

## Limitar los valores con `choices`

Cuando solo unos pocos valores tienen sentido, `choices` los declara de una vez. Acepta cualquier cosa por la que se pueda iterar y en la que se pueda buscar con `in`: una lista, una tupla, un `range` o las claves de un diccionario.

```python title="informe.py"
import argparse

analizador = argparse.ArgumentParser(description="Genera un informe.")
analizador.add_argument("-f", "--formato", choices=["json", "csv", "texto"], default="texto",
                        help="formato del informe")
analizador.add_argument("-n", "--nivel", type=int, choices=range(1, 4), default=1,
                        help="profundidad del detalle")
argumentos = analizador.parse_args()

print(f"formato={argumentos.formato} nivel={argumentos.nivel}")
```

Lo mejor es que las opciones válidas aparecen solas en la ayuda, sin tener que enumerarlas en el `help`:

```bash
python3 informe.py -h
```

```salida
usage: informe.py [-h] [-f {json,csv,texto}] [-n {1,2,3}]

Genera un informe.

options:
  -h, --help            show this help message and exit
  -f, --formato {json,csv,texto}
                        formato del informe
  -n, --nivel {1,2,3}   profundidad del detalle
```

Y el error dice exactamente qué se admite:

```bash
python3 informe.py -f xml
```

```salida
usage: informe.py [-h] [-f {json,csv,texto}] [-n {1,2,3}]
informe.py: error: argument -f/--formato: invalid choice: 'xml' (choose from 'json', 'csv', 'texto')
```

> [!nota] `choices` se comprueba después de `type`
>
> El orden importa cuando se combinan las dos cosas. `argparse` convierte primero con `type` y busca después el resultado en `choices`. Por eso en el ejemplo hay que poner `type=int` junto a `choices=range(1, 4)`: sin la conversión, el texto `'2'` no estaría en un rango de enteros y todo fallaría.
>
> Con muchas opciones, `choices` ensucia la línea `usage:`. La solución no es quitarlo, sino darle un `metavar` al argumento para que en la ayuda salga un nombre corto, que es lo que se ve en la última lección del tema.

## Cuántos valores consume un argumento: `nargs`

De serie, cada argumento consume exactamente un valor. Con `nargs` eso cambia, y hay cuatro formas.

### `nargs="?"`: cero o uno

El argumento se puede poner o no. Si no está, se usa el `default`. Sirve para hacer opcional un posicional:

```python title="nargs_interrogacion.py"
import argparse

analizador = argparse.ArgumentParser(description="nargs='?': cero o uno.")
analizador.add_argument("entrada", help="fichero de entrada")
analizador.add_argument("salida", nargs="?", default="salida.html",
                        help="fichero de salida, opcional")
argumentos = analizador.parse_args()

print(f"entrada={argumentos.entrada!r} salida={argumentos.salida!r}")
```

En la ayuda se ve el posicional opcional entre corchetes:

```bash
python3 nargs_interrogacion.py -h
```

```salida
usage: nargs_interrogacion.py [-h] entrada [salida]

nargs='?': cero o uno.

positional arguments:
  entrada     fichero de entrada
  salida      fichero de salida, opcional

options:
  -h, --help  show this help message and exit
```

```bash
python3 nargs_interrogacion.py notas.md
python3 nargs_interrogacion.py notas.md web.html
```

```salida
entrada='notas.md' salida='salida.html'
entrada='notas.md' salida='web.html'
```

Es el patrón de `cp` y compañía: lo esencial es obligatorio, el destino tiene un valor razonable por defecto.

### `nargs="*"`: ninguno, uno o muchos

El valor que llega es **siempre una lista**, vacía si no hay nada:

```python title="nargs_asterisco.py"
import argparse

analizador = argparse.ArgumentParser(description="nargs='*' y nargs='+'.")
analizador.add_argument("ficheros", nargs="*", help="ninguno, uno o muchos")
analizador.add_argument("-t", "--etiqueta", action="append", help="etiquetas sueltas")
argumentos = analizador.parse_args()

print(f"ficheros={argumentos.ficheros!r}")
```

```bash
python3 nargs_asterisco.py
python3 nargs_asterisco.py a.md b.md c.md
```

```salida
ficheros=[]
ficheros=['a.md', 'b.md', 'c.md']
```

Esto es lo que permite escribir `programa *.md` y que la terminal expanda el asterisco en veinte ficheros.

### `nargs="+"`: uno o muchos

Igual que el anterior, pero **exige al menos uno**. Es lo que faltaba para el programa de estadísticas de la lección de `sys.argv`:

```python title="nargs_mas.py"
import argparse

analizador = argparse.ArgumentParser(description="nargs='+': uno o más.")
analizador.add_argument("numeros", nargs="+", type=float, help="al menos un número")
argumentos = analizador.parse_args()

print(f"{len(argumentos.numeros)} números, suma {sum(argumentos.numeros)}")
```

```bash
python3 nargs_mas.py 10 20 5.5
```

```salida
3 números, suma 35.5
```

Y el caso vacío ya no es tuyo:

```bash
python3 nargs_mas.py
```

```salida
usage: nargs_mas.py [-h] numeros [numeros ...]
nargs_mas.py: error: the following arguments are required: numeros
```

Fíjate en que `type=float` se aplica a **cada elemento** de la lista, no a la lista entera. Es lo que quieres el cien por cien de las veces.

### `nargs=N`: exactamente N

Con un número, el argumento consume esa cantidad justa de valores y devuelve una lista de ese tamaño:

```python title="nargs_numero.py"
import argparse

analizador = argparse.ArgumentParser(description="nargs=N: exactamente N.")
analizador.add_argument("--recorte", nargs=4, type=int,
                        help="zona que hay que recortar: x y ancho alto")
argumentos = analizador.parse_args()

print(argumentos.recorte)
```

```bash
python3 nargs_numero.py --recorte 0 0 800 600
```

```salida
[0, 0, 800, 600]
```

```bash
python3 nargs_numero.py --recorte 0 0 800
```

```salida
usage: nargs_numero.py [-h] [--recorte RECORTE RECORTE RECORTE RECORTE]
nargs_numero.py: error: argument --recorte: expected 4 arguments
```

La ayuda de ese último es fea: `RECORTE RECORTE RECORTE RECORTE` no le dice a nadie qué son esos cuatro números. Se arregla con `metavar`, en la última lección del tema.

| `nargs` | Cuántos valores | Qué llega al `Namespace` |
| --- | --- | --- |
| Sin poner | Exactamente uno | El valor suelto |
| `"?"` | Cero o uno | El valor suelto, o el `default` |
| `"*"` | Cualquier cantidad, incluida ninguna | Una lista, vacía si no hay nada |
| `"+"` | Al menos uno | Una lista con uno o más elementos |
| `N` | Exactamente `N` | Una lista de `N` elementos |

> [!aviso] Un `nargs="*"` posicional y una opción no se llevan bien
>
> Si tienes un posicional que se come todo lo que encuentre y una opción que espera un valor, escribirlos mezclados confunde a `argparse`, que a veces reparte los valores de una forma que no esperabas. La costumbre es poner las opciones primero y los posicionales al final, y si el lío persiste, separar unos de otros con `--`: todo lo que vaya detrás de `--` se trata como posicional pase lo que pase.

## Opciones incompatibles entre sí

Algunas opciones no tienen sentido juntas. `add_mutually_exclusive_group` crea un grupo del que **como mucho se puede usar una**:

```python title="volumen.py"
import argparse

analizador = argparse.ArgumentParser(description="Sube o baja el volumen.")
grupo = analizador.add_mutually_exclusive_group()
grupo.add_argument("-s", "--silencio", action="store_true", help="salida sin ningún mensaje")
grupo.add_argument("-v", "--verboso", action="store_true", help="salida con todo el detalle")
argumentos = analizador.parse_args()

print(f"silencio={argumentos.silencio} verboso={argumentos.verboso}")
```

Los argumentos se añaden al grupo, no al analizador, pero salen en la ayuda como cualquier otro. Lo que cambia es la línea `usage:`, donde aparecen separados por una barra:

```bash
python3 volumen.py -h
```

```salida
usage: volumen.py [-h] [-s | -v]

Sube o baja el volumen.

options:
  -h, --help      show this help message and exit
  -s, --silencio  salida sin ningún mensaje
  -v, --verboso   salida con todo el detalle
```

```bash
python3 volumen.py -s -v
```

```salida
usage: volumen.py [-h] [-s | -v]
volumen.py: error: argument -v/--verboso: not allowed with argument -s/--silencio
```

El grupo también admite `required=True`, y entonces significa "exactamente una, ni ninguna ni dos":

```python title="origen.py"
import argparse

analizador = argparse.ArgumentParser(description="De dónde salen los datos.")
grupo = analizador.add_mutually_exclusive_group(required=True)
grupo.add_argument("--fichero", help="leer los datos de un fichero")
grupo.add_argument("--url", help="descargar los datos de una dirección")
grupo.add_argument("--entrada-estandar", action="store_true", help="leer de la entrada estándar")
argumentos = analizador.parse_args()

print(vars(argumentos))
```

Ahora el `usage:` las encierra en paréntesis en vez de en corchetes, que es la forma de decir "una de estas, obligatoriamente":

```bash
python3 origen.py -h
```

```salida
usage: origen.py [-h] (--fichero FICHERO | --url URL | --entrada-estandar)

De dónde salen los datos.

options:
  -h, --help          show this help message and exit
  --fichero FICHERO   leer los datos de un fichero
  --url URL           descargar los datos de una dirección
  --entrada-estandar  leer de la entrada estándar
```

```bash
python3 origen.py
```

```salida
usage: origen.py [-h] (--fichero FICHERO | --url URL | --entrada-estandar)
origen.py: error: one of the arguments --fichero --url --entrada-estandar is required
```

## Lo que `argparse` no puede validar

Un grupo excluyente sabe que dos opciones no pueden ir juntas, y una función `type` sabe si un valor suelto es correcto. Lo que ninguno de los dos puede hacer es mirar **dos argumentos a la vez** ni el estado del sistema, porque cuando se ejecutan todavía no se ha terminado de analizar la línea.

Esas comprobaciones van después de `parse_args()`. Y para que el mensaje salga con el mismo aspecto que los automáticos, no se usa un `print` con un `sys.exit`: se usa **`analizador.error()`**, que imprime el `usage:`, el nombre del programa y el mensaje, y termina con código 2.

```python title="rango.py"
"""Extrae un rango de fechas de un registro."""

import argparse
from datetime import date
from pathlib import Path


def fecha_iso(texto: str) -> date:
        """Convierte el texto en una fecha, esperando el formato AAAA-MM-DD."""
    try:
                return date.fromisoformat(texto)
    except ValueError:
                raise argparse.ArgumentTypeError(f"'{texto}' no es una fecha AAAA-MM-DD")


def main() -> None:
        analizador = argparse.ArgumentParser(description="Extrae un tramo del registro.")
    analizador.add_argument("registro", type=Path, help="fichero de registro que hay que leer")
    analizador.add_argument("--desde", type=fecha_iso, required=True, help="primera fecha")
    analizador.add_argument("--hasta", type=fecha_iso, required=True, help="última fecha")
    argumentos = analizador.parse_args()

    # Validaciones que argparse no puede hacer por su cuenta.
    if not argumentos.registro.is_file():
                analizador.error(f"el registro {argumentos.registro} no existe")
    if argumentos.desde > argumentos.hasta:
                analizador.error("--desde tiene que ser anterior o igual a --hasta")

    dias = (argumentos.hasta - argumentos.desde).days + 1
    print(f"Leyendo {argumentos.registro} de {argumentos.desde} a {argumentos.hasta} ({dias} días)")


if __name__ == "__main__":
        main()
```

```bash
python3 rango.py servidor.log --desde 2026-01-01 --hasta 2026-01-31
```

```salida
Leyendo servidor.log de 2026-01-01 a 2026-01-31 (31 días)
```

```bash
python3 rango.py servidor.log --desde 2026-03-01 --hasta 2026-01-31
```

```salida
usage: rango.py [-h] --desde DESDE --hasta HASTA registro
rango.py: error: --desde tiene que ser anterior o igual a --hasta
```

```bash
python3 rango.py no-esta.log --desde 2026-01-01 --hasta 2026-01-31
```

```salida
usage: rango.py [-h] --desde DESDE --hasta HASTA registro
rango.py: error: el registro no-esta.log no existe
```

Indistinguibles de los errores que genera `argparse`. Quien usa el programa no tiene por qué saber cuáles comprueba el módulo y cuáles has escrito tú.

> [!consejo] Dónde poner cada validación
>
> - **En `type`**, si el valor se puede juzgar mirándolo a él solo: un puerto en rango, una fecha bien escrita, un número positivo.
> - **En `choices`**, si la lista de valores buenos es corta y fija.
> - **En un grupo excluyente**, si el problema es que dos opciones se pisan.
> - **Después de `parse_args()` con `analizador.error()`**, si hay que comparar argumentos entre sí o mirar el disco, la red o el reloj.
>
> Y una comprobación que **no** debe ir ahí: las que dependen del trabajo en curso. Que un fichero exista al arrancar no garantiza que exista un segundo después, así que la validación previa es una cortesía para dar un error rápido y claro, no una garantía. El `try`/`except` alrededor de la lectura sigue haciendo falta.

> [!error] TypeError: 'str' object cannot be interpreted as an integer
>
> Es el error de haberse olvidado el `type=int`. El valor sigue siendo la cadena que escribieron y estalla en la primera operación que espere un número:
>
> ```python title="olvido.py"
> import argparse
>
> analizador = argparse.ArgumentParser()
> analizador.add_argument("-n", "--veces", default=1)
> argumentos = analizador.parse_args()
>
> for numero in range(argumentos.veces):
>         print(numero)
> ```
>
> ```bash
> python3 olvido.py -n 3
> ```
>
> ```salida
> Traceback (most recent call last):
>   File "/Users/erwin/terminal/olvido.py", line 7, in <module>
>     for numero in range(argumentos.veces):
>                   ~~~~~^^^^^^^^^^^^^^^^^^
> TypeError: 'str' object cannot be interpreted as an integer
> ```
>
> Lo pérfido es que el programa **funciona sin la opción**, porque el `default=1` sí es un entero de verdad y no pasa por ninguna conversión:
>
> ```bash
> python3 olvido.py
> ```
>
> ```salida
> 0
> ```
>
> Así que el fallo solo aparece el día que alguien usa la opción. La solución es añadir `type=int`; la lección es que el `default` no valida nada.

> [!resumen] En resumen
>
> El parámetro `type` recibe una función que convierte el texto en lo que el programa necesita, y `argparse` la aplica antes de guardar el valor y se queja con un mensaje claro cuando falla; ten en cuenta que el `default` no pasa por esa conversión y debe escribirse ya con el tipo correcto. Cualquier función tuya sirve como `type`, y si lanza `argparse.ArgumentTypeError` con una frase concreta, esa frase aparece en el error, lo que permite validar puertos, fechas o cualquier otro formato en el momento de leerlos. `type=Path` es la forma natural de recibir rutas, aunque no comprueba que existan. `choices` limita los valores admitidos y los publica solo en la ayuda, y se evalúa después de `type`. `nargs` decide cuántos valores consume un argumento: `?` lo hace opcional, `*` acepta cualquier cantidad y devuelve una lista posiblemente vacía, `+` exige al menos uno y un número pide esa cantidad exacta. `add_mutually_exclusive_group` declara opciones que no pueden convivir, con `required=True` para obligar a elegir una. Y todo lo que haya que comprobar mirando varios argumentos a la vez o el estado del sistema se hace después de `parse_args()`, llamando a `analizador.error()` para que el mensaje salga con el mismo formato y el mismo código de salida que los demás.

> [!ejercicio] Practica
>
> Crea los ficheros indicados y resuelve:
>
> 1. En `repetir.py`, añade `-n/--veces` con `type=int` y `--pausa` con `type=float`, y usa `time.sleep()` para que la pausa se note de verdad. Prueba a poner `default="1"` entre comillas y descubre cuándo falla y cuándo no.
> 2. En `validadores.py`, escribe una función `porcentaje` que acepte un entero entre 0 y 100 y lance `ArgumentTypeError` con un mensaje distinto para cada motivo de rechazo. Úsala como `type` y comprueba los tres caminos de error.
> 3. En `estadisticas.py`, termina por fin el programa que quedó a medias dos lecciones atrás: `nargs="+"` con `type=float` para los números y una opción `--decimales` con `type=int` y `default=2`.
> 4. En `convertir.py`, recibe un posicional `entrada` con `type=Path`, un `salida` opcional con `nargs="?"` que por defecto sea la entrada con la extensión cambiada a `.html`, y un `-f/--formato` con `choices`. Necesitarás calcular el valor por defecto de `salida` después de `parse_args()`, porque depende de otro argumento.
> 5. En `descargar.py`, monta un grupo mutuamente excluyente y obligatorio con `--url` y `--fichero`, y comprueba con `analizador.error()` que el fichero existe cuando es esa la opción elegida.
> 6. En `recortar.py`, declara `--recorte` con `nargs=4` y `type=int`, y valida después de `parse_args()` que el ancho y el alto sean mayores que cero. Fíjate en por qué esa comprobación no cabe en la función `type`.
