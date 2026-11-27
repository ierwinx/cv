---
titulo: "Códigos de salida y stderr"
resumen: "Cómo decirle al sistema si tu programa ha ido bien o mal, y por qué los errores no se imprimen por la salida normal."
minutos: 19
orden: 14
---

Hasta ahora tus programas se ejecutaban y ya está. Los mirabas tú, veías si funcionaban y listo. Pero una herramienta de terminal casi nunca vive sola: se llama desde otro script, desde una tarea programada, desde un sistema de integración continua o desde la propia terminal encadenada con otros comandos. Y ninguno de esos sitios va a leer tu mensaje de error: son máquinas.

Para que una máquina sepa si tu programa fue bien, existe un canal aparte del texto que imprimes. Al terminar, **todo programa devuelve un número entero al sistema operativo**. Ese número es el código de salida, y es la única forma que tiene el mundo exterior de saber qué ha pasado ahí dentro.

## Cero es éxito, lo demás es fallo

La convención es universal y se cumple en Linux, en macOS y en Windows:

- **0** significa que todo fue bien.
- **Cualquier otro número** significa que algo falló.

Es al revés de lo que dice la intuición, y tiene su lógica: hay una única forma de que algo salga bien, pero muchas formas distintas de que salga mal. El cero se reserva para el éxito y quedan 255 números libres para distinguir los fracasos.

## Consultarlo en la terminal

La terminal guarda el código del último comando en la variable `$?`. Puedes verlo con `echo`:

```bash
ls datos.txt
echo $?
```

```salida
datos.txt
0
```

Y ahora con un fichero que no existe:

```bash
ls no-existe.txt
echo $?
```

```salida
ls: no-existe.txt: No such file or directory
1
```

`ls` no solo ha escrito un mensaje: ha devuelto un 1. Ese 1 es lo que puede leer un script.

> [!nota] En Windows la variable se llama de otra forma
>
> En la consola clásica `cmd` es `echo %ERRORLEVEL%`. En PowerShell es `echo $LASTEXITCODE`. El concepto y los números son exactamente los mismos.

> [!aviso] $? se pisa enseguida
>
> `$?` guarda el código del **último** comando ejecutado, y `echo` también es un comando. Si haces `echo $?` dos veces seguidas, la segunda te dará el código del primer `echo`, que es 0. Consúltalo justo después del comando que te interesa, y si lo necesitas para más tarde, guárdalo: `codigo=$?`.

## Devolverlo desde Python

Si tu programa termina normalmente, Python devuelve 0 por su cuenta. Si muere con una excepción sin capturar, devuelve 1 y escribe la traza. Para cualquier otra cosa, lo eliges tú.

La forma directa es `sys.exit()`:

```python
import sys

if not hay_configuracion():
        sys.exit(1)
```

`sys.exit()` corta la ejecución en el acto, esté donde esté, aunque sea dentro de una función anidada a tres niveles. Admite tres cosas:

| Llamada | Código devuelto | Qué imprime |
| --- | --- | --- |
| `sys.exit()` | 0 | Nada |
| `sys.exit(2)` | 2 | Nada |
| `sys.exit("mensaje")` | 1 | El mensaje, **por stderr** |

Esa tercera forma es un atajo cómodo: si le pasas un texto en vez de un número, Python lo imprime como error y usa el código 1.

```python title="salir.py"
import sys

print("Empiezo")
sys.exit("Falta el fichero de configuración")
print("Esto no se ejecuta nunca")
```

```bash
python3 salir.py
echo $?
```

```salida
Empiezo
Falta el fichero de configuración
1
```

## sys.exit es en realidad una excepción

Por dentro, `sys.exit()` no hace magia: lanza una excepción llamada `SystemExit`. Python la deja subir hasta arriba del todo y, al llegar, usa su valor como código de salida. Por eso estas dos líneas son equivalentes:

```python
sys.exit(2)
raise SystemExit(2)
```

La segunda tiene la ventaja de no necesitar `import sys` y de dejar clarísimo que lo que ocurre es una excepción que sube. Úsala cuando te convenga; no hay ninguna diferencia de comportamiento.

> [!nota] SystemExit no la captura un except Exception
>
> `SystemExit` no desciende de `Exception`, sino directamente de `BaseException`. Está hecho a propósito: si descendiera de `Exception`, cualquier `except Exception` genérico se tragaría la petición de salir y el programa seguiría vivo.
>
> ```python
> import sys
>
> try:
>         sys.exit(3)
> except Exception as error:
>         print("Atrapado:", error)
> ```
>
> Ese programa no imprime absolutamente nada y termina con código 3. El `except` ni se entera de que ha pasado una excepción por delante.

## El patrón limpio: main devuelve el código

Sembrar `sys.exit()` por todo el programa funciona, pero hace el código difícil de seguir y casi imposible de probar: cualquier función puede matar el proceso. El patrón que usan las herramientas serias es otro, y consiste en separar dos responsabilidades.

`main()` es una función normal que **devuelve** un número entero. Y el arranque del módulo se encarga de convertir ese número en la salida real del proceso:

```python title="comprobar.py"
import sys
from pathlib import Path


def main() -> int:
        if len(sys.argv) != 2:
                print("Uso: comprobar.py RUTA", file=sys.stderr)
        return 2

    ruta = Path(sys.argv[1])
    if not ruta.exists():
                print(f"No existe el fichero: {ruta}", file=sys.stderr)
        return 1

    print(f"{ruta} ocupa {ruta.stat().st_size} bytes")
    return 0


raise SystemExit(main())
```

Los tres casos, con un `datos.txt` creado antes con `echo "hola" > datos.txt`:

```bash
python3 comprobar.py datos.txt
echo $?
```

```salida
datos.txt ocupa 5 bytes
0
```

```bash
python3 comprobar.py otro.txt
echo $?
```

```salida
No existe el fichero: otro.txt
1
```

```bash
python3 comprobar.py
echo $?
```

```salida
Uso: comprobar.py RUTA
2
```

Lo que hace que el patrón merezca la pena es que `main()` sigue siendo una función corriente. Puedes llamarla desde otro programa, comprobar que devuelve 2 cuando faltan argumentos y seguir trabajando, porque no ha matado nada. La decisión de terminar el proceso vive en una sola línea, la última, y se ve de un vistazo.

> [!consejo] La última línea, con o sin guardia
>
> Si el fichero solo se ejecuta como programa, `raise SystemExit(main())` a pelo basta. Si además lo importas desde otro sitio, protégelo con la guardia que ya conoces:
>
> ```python
> if __name__ == "__main__":
>         raise SystemExit(main())
> ```
>
> Verás las dos escritas por ahí. La segunda es la que hay que usar en cuanto el fichero pueda importarse.

## Los dos flujos de salida

Fíjate en una cosa del programa anterior: los mensajes de error llevan `file=sys.stderr`. No es un adorno.

Todo programa nace con dos canales de salida separados:

| Flujo | Nombre completo | Para qué |
| --- | --- | --- |
| `stdout` | Salida estándar | **El resultado** del programa: los datos que produce |
| `stderr` | Salida de error estándar | Errores, avisos, mensajes de progreso, cualquier cosa dirigida a la persona |

Los dos acaban en la misma pantalla, así que en el día a día parecen lo mismo. Dejan de parecerlo en cuanto alguien redirige la salida a un fichero o la encadena con otro programa.

> [!consejo] La regla de oro
>
> Por `stdout` sale **solo** lo que otro programa podría querer consumir. Todo lo demás, por `stderr`. Si dudas de si un mensaje es resultado o es conversación, pregúntate: "¿tendría sentido esta línea dentro de un fichero CSV generado por mi programa?". Si no, va por `stderr`.

## Escribir en stderr

`print()` escribe en `stdout` por defecto. Para mandar algo por el otro canal, se usa el parámetro `file`:

```python title="dos_flujos.py"
import sys

print("Esto es el resultado del programa")
print("Esto es un aviso para la persona", file=sys.stderr)
print("Y esto más resultado")
```

Ejecutado sin más, no notas nada raro:

```bash
python3 dos_flujos.py
```

```salida
Esto es el resultado del programa
Esto es un aviso para la persona
Y esto más resultado
```

## La diferencia se ve al redirigir

La terminal permite desviar cada flujo a un sitio distinto. `>` redirige `stdout` y `2>` redirige `stderr`. Ese `2` es el número interno del flujo de error, igual que el `1` es el de la salida normal.

Mandamos el resultado a un fichero:

```bash
python3 dos_flujos.py > resultado.txt
```

```salida
Esto es un aviso para la persona
```

En pantalla se queda solo el aviso, porque `stderr` no se ha redirigido. Y en el fichero ha caído justo lo contrario:

```bash
cat resultado.txt
```

```salida
Esto es el resultado del programa
Y esto más resultado
```

Ahora al revés, guardamos los errores:

```bash
python3 dos_flujos.py 2> errores.txt
```

```salida
Esto es el resultado del programa
Y esto más resultado
```

```bash
cat errores.txt
```

```salida
Esto es un aviso para la persona
```

Eso es exactamente lo que se quiere: el fichero `resultado.txt` contiene datos limpios, sin una sola línea de conversación colada en medio. Si el programa hubiera escrito el aviso por `stdout`, ahora el fichero estaría contaminado y quien lo procesara se encontraría una línea inesperada.

Las combinaciones que más se usan:

| Comando | Qué hace |
| --- | --- |
| `programa > salida.txt` | Guarda el resultado, los errores se ven en pantalla |
| `programa 2> errores.txt` | Guarda los errores, el resultado se ve en pantalla |
| `programa > salida.txt 2> errores.txt` | Cada cosa a su fichero |
| `programa > todo.txt 2>&1` | Los dos al mismo fichero |
| `programa 2> /dev/null` | Tira los errores a la basura |
| `programa > /dev/null` | Tira el resultado y deja ver solo los errores |

`/dev/null` es un fichero especial de Linux y macOS que se traga todo lo que le escribas. En Windows el equivalente es `NUL`.

> [!nota] Por qué a veces el orden sale cambiado
>
> Si redirigiste los dos flujos al mismo fichero con `2>&1`, es posible que los mensajes de error aparezcan antes que el resultado, aunque en el código estuvieran después. No es un fallo tuyo: cuando `stdout` va a un fichero, Python lo acumula en memoria y lo escribe de golpe al final, mientras que `stderr` sale inmediatamente. Es el mismo asunto del búfer que viste con `flush=True` en `print`. En la pantalla, donde `stdout` se vacía línea a línea, el orden siempre es el natural.

## Encadenar programas según el resultado

Aquí es donde el código de salida deja de ser teoría. La terminal tiene dos operadores que miran ese número y deciden si sigue o no:

- `A && B` ejecuta `B` **solo si `A` fue bien** (devolvió 0).
- `A || B` ejecuta `B` **solo si `A` falló** (devolvió algo distinto de 0).

```bash
python3 comprobar.py datos.txt && echo "Sigo adelante"
```

```salida
datos.txt ocupa 5 bytes
Sigo adelante
```

```bash
python3 comprobar.py otro.txt && echo "Sigo adelante"
```

```salida
No existe el fichero: otro.txt
```

El `echo` no se ha ejecutado. Y con `||`, al revés:

```bash
python3 comprobar.py otro.txt || echo "Aborto el proceso"
```

```salida
No existe el fichero: otro.txt
Aborto el proceso
```

Esto es lo que hay detrás de una línea como `python3 descargar.py && python3 procesar.py && python3 enviar.py`: tres programas en cadena donde el fallo de cualquiera detiene el resto. Y funciona sin que ninguno de los tres sepa nada de los otros, solo porque todos respetan la convención del cero.

> [!aviso] Si tu programa siempre devuelve 0, rompes la cadena
>
> Un programa que imprime "Error: fichero no encontrado" y termina normalmente está mintiendo al sistema: por fuera ha devuelto 0, o sea, éxito. El `&&` seguirá adelante, la tarea programada lo dará por bueno y nadie se enterará del fallo hasta que sea tarde. Imprimir el error no basta; hay que **devolver** el error.

## Códigos de salida convencionales

Con 0 y 1 se cubre casi todo. Estos son los que tienen un significado acordado y conviene respetar:

| Código | Significado |
| --- | --- |
| `0` | Éxito |
| `1` | Error genérico: algo no ha ido bien |
| `2` | Uso incorrecto: faltan argumentos o son inválidos |
| `126` | El fichero existe pero no se puede ejecutar |
| `127` | El comando no existe |
| `130` | Interrumpido por el usuario con <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| `137` | El proceso fue matado por el sistema, normalmente por falta de memoria |

Los códigos del 3 al 125 son tuyos: puedes darles el significado que quieras en tu herramienta, siempre que lo documentes en la ayuda. Y evita pasarte de 255, porque el sistema solo guarda el último byte: `sys.exit(256)` acaba devolviendo 0, con lo que un error se convertiría en un éxito.

> [!nota] El 2 lo pone argparse por su cuenta
>
> Si usas `argparse` y el usuario se equivoca al invocar tu programa, `argparse` imprime el uso por `stderr` y termina con código 2 sin que tú hagas nada. Está siguiendo esta misma tabla, así que tus errores de uso propios deberían devolver también 2 para ser coherentes.

## Errores frecuentes

> [!error] Mi programa devuelve 0 aunque haya fallado
>
> Casi siempre es un `print` donde debería haber un `return` o un `sys.exit`. Comprueba el camino completo: si `main()` detecta el problema y hace `return 1` pero la última línea del fichero es `main()` a secas en vez de `raise SystemExit(main())`, el número se pierde por el camino y el proceso termina con 0.

> [!error] NameError: name 'exit' is not defined
>
> Has escrito `exit()` o `quit()` en un programa. Esos dos nombres existen para la comodidad de la consola interactiva y no forman parte del lenguaje: los añade un módulo que Python carga al arrancar y que en algunos entornos no está. En un programa se usa `sys.exit()` o `raise SystemExit`. Por el mismo motivo, no llames `exit` a ninguna variable tuya: si lo haces, al intentar usarla como función obtendrás un `TypeError: 'int' object is not callable`.

> [!error] Mis mensajes de error desaparecen al redirigir con >
>
> No desaparecen: están saliendo por `stderr`, que `>` no redirige. Si de verdad los quieres en el fichero, usa `2>&1`. Y si te pasa al revés, que los errores se te cuelan en el fichero de datos, es que los estás imprimiendo por `stdout`: añade `file=sys.stderr` a esos `print`.

> [!resumen] En resumen
>
> Todo programa devuelve al sistema un número entero al terminar, y la convención universal es que cero significa éxito y cualquier otro valor significa fallo. Desde la terminal lo consultas con `echo $?` y desde Python lo devuelves con `sys.exit(codigo)` o con `raise SystemExit(codigo)`, que son la misma cosa porque `sys.exit` lanza esa excepción. El patrón recomendado es que `main()` devuelva el código como una función normal y que la última línea del fichero haga `raise SystemExit(main())`, porque así `main` se puede seguir llamando y probando sin matar el proceso. Aparte del código, todo programa tiene dos flujos de salida: por `stdout` va el resultado y por `stderr` van los errores y los avisos, y no hay que mezclarlos, porque solo así se puede redirigir el resultado a un fichero sin contaminarlo. Se escribe en el segundo con `print(..., file=sys.stderr)`. Gracias a los códigos de salida, la terminal puede encadenar programas con `&&` y `||`, y un programa que devuelve 0 aunque haya fallado rompe esa cadena para todos los demás.

> [!ejercicio] Practica
>
> Crea `14-codigos.py` y resuelve:
>
> 1. Escribe un programa que reciba un número por `sys.argv`, imprima su cuadrado y devuelva 0. Si no recibe ningún argumento, que avise por `stderr` y devuelva 2. Comprueba los dos códigos con `echo $?`.
> 2. Reescríbelo con el patrón `main()` que devuelve el entero y `raise SystemExit(main())` en la última línea. Comprueba que los códigos siguen siendo los mismos.
> 3. Añádele un tercer caso: si el argumento no es un número, que capture el `ValueError`, escriba el mensaje por `stderr` y devuelva 1. Ejecútalo con `python3 14-codigos.py hola > salida.txt` y comprueba que el fichero queda vacío.
> 4. Escribe un programa que imprima diez líneas de datos por `stdout` y una línea de "Procesadas 10 líneas" por `stderr`. Redirige cada flujo a un fichero distinto y comprueba con `cat` que cada uno tiene lo que debe.
> 5. Encadena en una sola línea de terminal tu programa del ejercicio 2 con un `echo` usando `&&`, y después con otro `echo` usando `||`. Pruébalo con un argumento válido y con uno inválido.
> 6. Busca en la tabla de códigos convencionales el que corresponde a <kbd>Ctrl</kbd> + <kbd>C</kbd>, y escribe un programa que espere una entrada con `input()`. Interrúmpelo con esa combinación y mira qué código devuelve realmente Python sin hacer nada por tu parte.
