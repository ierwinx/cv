---
titulo: "Qué es una aplicación de terminal"
resumen: "Por qué los programas de línea de comandos siguen siendo la herramienta profesional, cómo se estructura una orden y qué dos estilos existen."
minutos: 12
orden: 1
---

Los programas que has escrito hasta ahora se arrancan con `python3 algo.py`, imprimen cosas y preguntan por teclado. Eso ya es una aplicación de terminal. Lo que cambia en este módulo es la ambición: dejan de ser ejercicios para convertirse en **herramientas que se usan a diario**, con la misma pinta y las mismas costumbres que `git`, `pip` o `ls`.

Es tentador pensar que un programa sin ventanas está a medio hacer. No lo está. La línea de comandos es donde vive casi toda la herramienta profesional, y no por nostalgia: hay razones concretas, y conviene entenderlas antes de escribir la primera línea del módulo.

> [!objetivo] Qué vas a aprender
>
> Entender qué distingue a una aplicación de terminal, reconocer las partes de una orden (comando, argumentos y opciones cortas y largas), distinguir los dos grandes estilos de programa —el interactivo con menú y el de un solo disparo— y saber cuándo conviene cada uno.

## Por qué la terminal gana

Un programa de terminal recibe datos, hace algo y escribe el resultado. Esa simpleza le da cuatro ventajas que una ventana con botones no tiene:

- **Se automatiza.** Lo que se escribe a mano se puede escribir en un fichero y lanzarlo a las tres de la mañana, todos los días, sin nadie delante. Nadie ha conseguido programar una tarea que consista en "pinchar en este botón".
- **Se encadena.** La salida de un programa puede ser la entrada del siguiente. Tres herramientas pequeñas, bien hechas, resuelven un problema que ninguna resolvía sola.
- **Funciona a distancia.** Por SSH, dentro de un contenedor o en un servidor sin pantalla, la terminal es lo único que hay. Una interfaz gráfica en una máquina sin monitor es un adorno.
- **No necesita ratón ni memoria visual.** Una orden se puede copiar, pegar en un correo, guardar en la documentación y volver a ejecutar tal cual seis meses después. Un recorrido de clics por cinco menús no se puede pegar en ningún sitio.

A eso se suma un detalle práctico: son rápidas de escribir. El programa del que hablamos en este módulo se hace en doscientas líneas. La misma funcionalidad con ventanas, botones y ratón cuesta bastante más, y lo verás en el módulo de Tkinter.

## Órdenes que ya has usado

Sin haberlo pensado, llevas dos módulos usando aplicaciones de terminal escritas por otros:

```bash
python3 --version
```

```salida
Python 3.14.7
```

```bash
ls
pip install requests
git commit -m "Primer arreglo"
```

Las cuatro son programas normales, escritos por alguien, que reciben datos al arrancar. `pip` en concreto **está escrito en Python**, igual que lo que vas a escribir tú. Al final del módulo, tu herramienta se instalará y se ejecutará por su nombre, como esas.

## La anatomía de una orden

Toda orden de terminal tiene la misma estructura. Mira esta:

```bash
pip install --upgrade requests
```

Se lee en tres piezas:

| Pieza | Qué es | En el ejemplo |
| --- | --- | --- |
| El comando | El programa que se ejecuta. Siempre va primero | `pip` |
| Los argumentos | Los datos con los que trabaja. Su orden importa | `install`, `requests` |
| Las opciones | Modifican el comportamiento. Empiezan por guion y suelen poder ir en cualquier sitio | `--upgrade` |

Las opciones vienen en dos formatos, y casi todas las herramientas serias ofrecen los dos para lo mismo:

| Formato | Aspecto | Para qué |
| --- | --- | --- |
| Corto | Un guion y una letra: `-v`, `-h`, `-l` | Escribir rápido a mano |
| Largo | Dos guiones y una palabra: `--verbose`, `--help` | Legible en documentación y en scripts |

Algunas opciones son un simple interruptor (`--upgrade`: está o no está) y otras llevan un valor detrás (`--output informe.csv`). Y las cortas de tipo interruptor se pueden apelotonar: `ls -l -a -h` es lo mismo que `ls -lah`.

> [!nota] Convenciones que casi todo el mundo respeta
>
> `-h` y `--help` muestran la ayuda. `-v` muestra la versión o el modo detallado, según la herramienta. `--` a secas significa "aquí acaban las opciones, lo que venga después es un argumento aunque empiece por guion". No son reglas del sistema operativo, son costumbres, pero conviene seguirlas: quien use tu programa las va a dar por supuestas.

## Los dos estilos

Aquí está la decisión de diseño más importante del módulo. Un programa de terminal puede conversar contigo o puede hacer una cosa y morir.

### Interactivo: conversa contigo

Pregunta los datos que le faltan, normalmente con un menú, y no termina hasta que se lo pides.

```python title="saluda_interactivo.py"
"""Estilo interactivo: pregunta y espera respuesta."""

nombre = input("¿Cómo te llamas? ")
veces = int(input("¿Cuántas veces te saludo? "))
for _ in range(veces):
        print(f"Hola, {nombre}.")
```

```bash
python3 saluda_interactivo.py
```

```salida
¿Cómo te llamas? Erwin
¿Cuántas veces te saludo? 3
Hola, Erwin.
Hola, Erwin.
Hola, Erwin.
```

Es el estilo del gestor de tareas con el que cerraste el módulo 1. Se aprende solo, sin leer documentación, porque el programa te va guiando.

### De un solo disparo: recibe los datos al arrancar

Todo lo que necesita se lo dices en la misma línea. Hace su trabajo, escribe el resultado y termina.

```python title="saluda.py"
"""Estilo de un solo disparo: recibe los datos al arrancar y termina."""

import sys

nombre = sys.argv[1]
veces = int(sys.argv[2])
for _ in range(veces):
        print(f"Hola, {nombre}.")
```

```bash
python3 saluda.py Erwin 3
```

```salida
Hola, Erwin.
Hola, Erwin.
Hola, Erwin.
```

Esa lista `sys.argv` que aparece ahí es la puerta de entrada a los argumentos, y tiene lección propia en la siguiente. Quédate solo con la idea: el programa no ha preguntado nada, ha recibido `Erwin` y `3` de la línea de comandos.

### La diferencia que de verdad importa

No es la comodidad. Es que solo el segundo estilo se puede automatizar:

```bash
python3 saluda.py Erwin 3 > saludos.txt
```

Eso no imprime nada: los tres saludos han acabado dentro de `saludos.txt`. Y esto otro le pasa la salida a un segundo programa, `wc -l`, que cuenta líneas:

```bash
python3 saluda.py Erwin 3 | wc -l
```

```salida
       3
```

Ese `|` manda la salida del programa a otro programa, y ese `>` la guarda en un fichero. Con el programa interactivo no funcionaría: se quedaría esperando a que alguien escriba el nombre, y ese alguien no existe. Las tuberías y la redirección tienen su propia lección más adelante en el módulo.

|  | Interactivo | Un solo disparo |
| --- | --- | --- |
| Se aprende | Solo, con el menú delante | Leyendo `--help` |
| Se automatiza | No | Sí |
| Se encadena con otros programas | No | Sí |
| Cómodo para muchas operaciones seguidas | Sí | No, hay que repetir la orden |
| Bueno para | Personas que usan el programa de vez en cuando | Scripts, tareas repetidas y usuarios habituales |

> [!consejo] Las buenas herramientas hacen las dos cosas
>
> `python3` a secas abre el intérprete interactivo; `python3 fichero.py` ejecuta y termina. `git commit` abre un editor para escribir el mensaje; `git commit -m "texto"` no pregunta nada. El patrón es el mismo: **si el dato viene en la línea de comandos, úsalo; si falta, pregúntalo**. Es la mejor de las dos opciones y cuesta tres líneas de código.

## Qué vas a construir

El resto del módulo va de convertir esos programas de juguete en herramientas presentables. Por partes:

- Controlar la pantalla: imprimir sin salto de línea, reescribir una línea, limpiar, adaptarte al ancho de la ventana.
- Pedir datos sin que el programa se rompa cuando alguien escribe `treinta y cuatro` donde esperabas un número.
- Menús que se navegan de verdad, con submenús y sin cadenas interminables de `elif`.
- Color, tablas con bordes y barras de progreso, todo con la biblioteca estándar y sin instalar nada.
- Y después argumentos, códigos de salida, configuración, registro de actividad y empaquetado, hasta que tu programa se instale y se ejecute por su nombre.

> [!nota] Todo con la biblioteca estándar
>
> Las siete primeras lecciones no instalan absolutamente nada. Existen bibliotecas excelentes para colorear y dibujar tablas, y las verás al final del módulo, pero primero conviene saber hacerlo a mano. Entre otras cosas, porque entonces entenderás qué hacen esas bibliotecas por debajo y podrás arreglarlo cuando se comporten de forma rara.

> [!resumen] En resumen
>
> Una aplicación de terminal es un programa que recibe datos, trabaja y escribe el resultado por pantalla, sin ventanas. Sigue siendo el formato profesional porque se automatiza, se encadena con otros programas, funciona en máquinas sin pantalla y se puede copiar y pegar en la documentación. Toda orden se compone de un comando, sus argumentos y sus opciones, que vienen en formato corto de una letra y largo de una palabra. Hay dos estilos: el interactivo, que pregunta y es fácil de descubrir, y el de un solo disparo, que recibe todo al arrancar y es el único que se puede automatizar. Las herramientas buenas ofrecen los dos.

> [!ejercicio] Practica
>
> Abre una terminal y crea un fichero `01-estilos.py` para la última parte:
>
> 1. Ejecuta `ls --help` (en macOS, `man ls`) y localiza tres opciones cortas con su equivalente larga. Apúntalas.
> 2. Ejecuta `pip list`, `pip list --format=json` y `pip --version`. Identifica en cada orden qué es comando, qué argumento y qué opción.
> 3. Escribe en un fichero de texto tres órdenes que uses a menudo y separa las piezas de cada una en tres columnas: comando, argumentos, opciones.
> 4. En `01-estilos.py`, copia el `saluda_interactivo.py` de la lección y amplíalo para que pregunte también el idioma del saludo, con dos opciones. Comprueba que no puedes usarlo con `>` para volcar la salida a un fichero sin que se quede colgado.
> 5. Piensa y anota, en dos o tres frases, qué estilo le conviene a cada uno de estos programas: un conversor de imágenes que se usa sobre cientos de ficheros, un cuestionario de alta de empleados y una herramienta que consulta el saldo de una cuenta.
