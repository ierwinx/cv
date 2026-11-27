---
titulo: "Tu primera ventana"
resumen: "El programa mínimo que abre una ventana, explicado línea por línea, y el patrón de tres pasos que se repite en todo el módulo."
minutos: 22
orden: 2
---

Todo lo que has escrito hasta ahora tenía la misma forma: el programa empieza arriba, ejecuta las instrucciones en orden, y cuando llega al final termina. Si quería esperarte, ponía un `input`. Si quería repetirse, ponía un bucle. Tú mandabas.

Un programa con ventanas no funciona así, y la diferencia se nota desde la primera línea. Tu código monta la ventana, coloca lo que tiene que haber dentro y después **le cede el control a otra cosa**, que se queda esperando a que alguien pulse, escriba o cierre. A partir de ese momento tu programa no manda: responde.

Esta lección es el programa más pequeño posible que abre una ventana, con las cuatro líneas explicadas una a una, y cómo meterle dentro un texto y un botón para que no sea un rectángulo vacío. Son cuatro líneas que vas a escribir en cada uno de los programas del módulo, así que merece la pena entender qué hace cada una en lugar de copiarlas.

> [!objetivo] Qué vas a aprender
>
> Escribir y ejecutar el programa mínimo de Tkinter, saber qué es de verdad el objeto que devuelve `tk.Tk()` y qué hace `mainloop()`, añadir una etiqueta y un botón a la ventana, y reconocer el patrón de tres pasos —crear, colocar, arrancar— que se repite en todos los programas gráficos.

## Las cuatro líneas

Este es el programa completo. No hay nada omitido:

```python title="ventana.py"
import tkinter as tk

ventana = tk.Tk()
ventana.mainloop()
```

```bash
python3 ventana.py
```

No imprime nada. Aparece una ventana vacía, con su barra de título, sus botones de cerrar, minimizar y maximizar, y su borde redimensionable. Se puede mover, se puede agrandar y se cierra con la X. Todo eso lo ha puesto el sistema operativo, y por eso tu ventana tiene la pinta de las demás ventanas de tu equipo: en macOS los tres círculos de colores a la izquierda, en Windows los tres botones a la derecha.

Ahora, línea por línea.

### `import tkinter as tk`

El módulo se llama `tkinter`, en minúsculas, y se importa con el alias `tk` de forma casi universal. Esto no es una obligación del lenguaje, es una costumbre, pero es una costumbre tan extendida que conviene seguirla: cualquier ejemplo que encuentres en documentación, en un libro o en una respuesta de internet va a escribir `tk.Label` y `tk.Button`.

La razón de fondo es que en un programa de Tkinter **casi cada línea nombra al módulo**. Los widgets no se suelen importar uno a uno, se van creando a medida que hacen falta, y con el nombre completo el código quedaría así:

```python
etiqueta = tkinter.Label(ventana, text="Total")
boton = tkinter.Button(ventana, text="Calcular")
```

Con seis o siete widgets, ese prefijo repetido pesa. La alternativa contraria, un `from tkinter import *`, sí que es mala idea: mete más de cien nombres en tu programa, algunos tan genéricos como `E`, `W`, `N`, `S` o `Text`, y te va a pisar variables propias tarde o temprano. El alias corto es el término medio, y además deja claro de dónde sale cada widget al leer el código.

### `tk.Tk()`

Esta llamada hace dos cosas a la vez, y solo una es evidente.

La evidente: crea **la ventana principal de la aplicación**. El objeto que devuelve representa esa ventana, y todo lo que hagas con él afecta a la ventana de verdad. El nombre `Tk` con esas dos letras viene de la biblioteca Tk que hay por debajo, y la costumbre en los ejemplos que encontrarás por ahí es llamarlo `root`; aquí lo vamos a llamar `ventana`, que dice lo mismo en español.

La que no se ve: esa misma llamada **arranca un intérprete de Tcl dentro de tu proceso** y establece la conexión con él. Como viste en la lección anterior, Tkinter no dibuja nada por su cuenta, le manda órdenes a Tk, y Tk es código Tcl. Ese intérprete no existe hasta que llamas a `tk.Tk()`, y por eso no se puede crear ningún widget antes: no habría nadie al otro lado a quien pedirle que lo dibuje.

De esa doble naturaleza salen dos consecuencias prácticas. La primera es que crear la ventana tarda un poco más de lo que parece, porque hay todo un intérprete arrancando. La segunda es que el objeto tiene dos tipos de métodos mezclados: los que son de la ventana (cambiarle el título, el tamaño, esconderla) y los que son de la aplicación entera (arrancar el bucle de eventos, cerrarla toda). `ventana.title("Aforo")` es de los primeros; `ventana.mainloop()`, de los segundos.

### `mainloop()`

Aquí está el cambio de mentalidad. `mainloop()` es un bucle infinito que no termina hasta que se cierra la ventana, y mientras dura hace siempre lo mismo: mira si ha ocurrido algo, y si ha ocurrido algo, llama a la función que corresponda.

Eso no te es nuevo. En el módulo 2 escribiste menús interactivos con esta estructura:

```python
while True:
        opcion = input("Elige una opción: ")
    if opcion == "1":
                listar_gastos()
    elif opcion == "0":
                break
```

`mainloop()` es ese mismo bucle, con dos diferencias. Que no lo escribes tú, viene hecho. Y que los sucesos que atiende no son solo lo que alguien escribe: son las pulsaciones del ratón, las teclas, el paso del cursor por encima de un botón, el cambio de tamaño de la ventana, la petición de cierre del sistema operativo y unos cuantos más. Ese conjunto de sucesos son los **eventos**, y ese bucle es el bucle de eventos, que tiene su propia lección en este bloque.

Lo que importa ahora es una consecuencia inmediata: la línea de `mainloop()` es la última del programa, y todo lo que escribas después de ella no se ejecuta hasta que se cierre la ventana. Es fácil de comprobar:

```python
ventana.mainloop()
print("Esto no se imprime hasta que cierres la ventana")
```

Ese `print` no sale al arrancar. Sale al cerrar. Toda la construcción de la interfaz va **antes** de `mainloop()`.

## Una `Tk()` y solo una

Un programa de Tkinter tiene exactamente una `tk.Tk()`. No es una recomendación de estilo: llamarla dos veces arranca dos intérpretes de Tcl independientes, que no comparten nada. Los widgets de uno no se pueden meter en el otro, las variables de control de uno no las ve el otro, y cerrar una de las dos ventanas puede llevarse por delante el proceso completo, sin traza y sin explicación. Es un fallo desagradable de diagnosticar precisamente porque el código no parece tener nada malo.

Cuando tu aplicación necesita una segunda ventana —un diálogo de preferencias, un formulario aparte, una ventana de ayuda— se usa `Toplevel`, que crea una ventana de verdad, con su barra de título y su botón de cerrar, dentro de la misma aplicación:

```python
ventana_ayuda = tk.Toplevel(ventana)
```

Fíjate en que recibe la ventana principal como argumento: es una ventana hija, del mismo intérprete. Las ventanas secundarias tienen su lección en el bloque de interacción, con lo que hace falta saber para que se comporten bien. Por ahora, quédate con la regla: **una sola `Tk()` por programa, y las demás ventanas son `Toplevel`**.

## Que la ventana no esté vacía

Una ventana sin nada dentro sirve para comprobar que Tkinter funciona y para nada más. Vamos a meterle un texto y un botón:

```python title="saludo.py"
"""Una ventana con un texto y un botón que responde."""

import tkinter as tk


def saludar():
        print("Hola desde el botón.")


ventana = tk.Tk()
ventana.title("Saludo")

etiqueta = tk.Label(ventana, text="Pulsa el botón y mira la terminal.")
etiqueta.pack()

boton = tk.Button(ventana, text="Saludar", command=saludar)
boton.pack()

ventana.mainloop()
```

Al ejecutarlo se abre una ventana pequeña, del tamaño justo de su contenido, con el texto arriba y el botón debajo. Cada vez que lo pulsas, en la terminal aparece una línea:

```salida
Hola desde el botón.
```

Hay tres piezas nuevas ahí. `Label` es un widget que muestra texto y no hace nada más. `Button` muestra texto y llama a una función cuando se pulsa. Y `.pack()`, que aparece detrás de los dos.

Sobre `pack` solo hace falta saber una cosa ahora mismo: **un widget que se crea pero no se coloca no se ve**. `pack()` es la forma más simple de colocarlo, y a secas, sin ningún argumento, apila los widgets uno debajo de otro en el orden en que los llamaste. Tiene opciones para casi todo y hay otros dos sistemas de colocación distintos, pero eso es el bloque siguiente entero. Aquí se usa `.pack()` pelado para que el ejemplo se vea, y ya está.

> [!aviso] El widget creado que no se coloca
>
> Este es el primer desconcierto de casi todo el mundo con Tkinter, y lo que lo hace desagradable es que **no da ningún error**:
>
> ```python title="ventana_vacia.py"
> """El widget se crea, pero nadie lo coloca: la ventana sale vacía."""
>
> import tkinter as tk
>
> ventana = tk.Tk()
> etiqueta = tk.Label(ventana, text="Este texto no se ve en ninguna parte")
> ventana.mainloop()
> ```
>
> El programa arranca, termina con código 0, no imprime nada y abre una ventana vacía. La etiqueta existe, está creada, tiene su texto dentro y se le pueden pedir sus propiedades. Simplemente nadie le ha dicho dónde va, así que Tk no la dibuja. Cuando ejecutes un programa gráfico y la ventana salga vacía o le falte algo, la primera sospecha es siempre la misma: se te ha olvidado un `.pack()`.

## El patrón de tres pasos

Lo que has hecho en `saludo.py` es la estructura de cualquier programa de este módulo, por grande que sea. Son tres pasos, en este orden:

| Paso | Qué haces | En el ejemplo |
| --- | --- | --- |
| Crear | Fabricas el widget diciéndole quién es su contenedor y con qué opciones | `tk.Label(ventana, text="...")` |
| Colocar | Le dices dónde va, o no aparecerá | `etiqueta.pack()` |
| Arrancar | Cedes el control al bucle de eventos, una sola vez y al final | `ventana.mainloop()` |

El primer paso tiene un detalle que conviene grabar desde hoy: **el primer argumento de todo widget es su contenedor**. No es una opción más ni lleva nombre, va siempre en primera posición y no es opcional. `tk.Label(ventana, ...)` se lee "una etiqueta dentro de `ventana`". Cuando más adelante organices la interfaz en marcos, el primer argumento dejará de ser la ventana y pasará a ser el marco correspondiente, y eso es lo que construye la jerarquía de la interfaz: una ventana que contiene marcos que contienen widgets.

> [!nota] Si te olvidas del padre, funciona, y es peor
>
> Si escribes `tk.Label(text="Hola")` sin contenedor, Tkinter no se queja: coge la última `Tk()` que se creó y la usa como padre, y si no hay ninguna, se inventa una. Es una comodidad heredada de los primeros tiempos del módulo, pensada para probar cosas en el intérprete interactivo. En un programa es una trampa: el widget acaba en una ventana que tú no elegiste, y el día que tengas dos ventanas el fallo será incomprensible. Escribe siempre el contenedor.

> [!aviso] `command=saludar` va sin paréntesis
>
> Este es, con diferencia, el error más repetido de quien empieza con Tkinter. Mira las dos formas:
>
> ```python
> boton = tk.Button(ventana, text="Saludar", command=saludar)     # correcto
> boton = tk.Button(ventana, text="Saludar", command=saludar())   # error
> ```
>
> Con los paréntesis estás **llamando** a la función ahí mismo, en el momento de crear el botón, y pasándole a `command` lo que esa llamada devuelva, que normalmente es `None`. Sin los paréntesis pasas la función en sí, que es un objeto como cualquier otro, para que el botón la guarde y la llame él cuando alguien lo pulse.
>
> Lo que ves al equivocarte es muy característico. Este programa no falla:
>
> ```python title="boton_mal.py"
> """Los paréntesis de más en command: la función se ejecuta al crear el botón."""
>
> import tkinter as tk
>
>
> def saludar():
>         print("Hola desde el botón.")
>
>
> ventana = tk.Tk()
> boton = tk.Button(ventana, text="Saludar", command=saludar())
> boton.pack()
> ventana.mainloop()
> ```
>
> ```salida
> Hola desde el botón.
> ```
>
> Ese saludo aparece antes de que la ventana esté siquiera en pantalla, sin que hayas pulsado nada. Y después el botón no hace absolutamente nada, por muchas veces que lo pulses, porque su `command` se ha quedado vacío. La regla es fácil de recordar: **en `command` se pone el nombre de la función, nunca una llamada**. Si necesitas pasarle argumentos, hay formas de hacerlo, y se ven en la lección de eventos.

## Ejecutar un programa con ventana

Se ejecuta como cualquier otro, con `python3 fichero.py`. Lo que cambia es lo que ocurre después: la terminal se queda ocupada, sin prompt, porque el programa no ha terminado. Está dentro de `mainloop()`, atendiendo eventos. Recuperas el prompt al cerrar la ventana.

Dos detalles prácticos del entorno:

- **En macOS, el foco se queda a veces en la terminal.** La ventana se abre, pero las teclas siguen yendo a la terminal hasta que pinchas en la ventana. Es cosa de cómo macOS trata a los programas lanzados desde la línea de comandos, no de tu código. Si te molesta al desarrollar, pincha en la ventana y sigue; hay maneras de forzar el foco, y se ven en la lección de propiedades de la ventana.
- **<kbd>Ctrl</kbd> + <kbd>C</kbd> en la terminal no siempre cierra el programa.** Mientras el bucle de eventos está esperando, la interrupción puede quedarse en cola hasta que la ventana reciba algún evento. Lo fiable es cerrar con la X de la ventana.

> [!consejo] Ejecuta el programa desde la terminal, no desde el editor
>
> Mientras aprendes, lanza los ejemplos con `python3 fichero.py` en una terminal que tengas a la vista. En un programa gráfico, los errores que ocurren dentro de una función de respuesta a un botón **no cierran el programa ni salen en ninguna ventana**: se imprimen en la terminal y la aplicación sigue funcionando como si nada. Si no tienes la terminal delante, esa traza que explica el problema se la lleva el viento y te quedas con un botón que no hace nada y ninguna pista.

## Algo que se pueda tocar

Para cerrar, un programa completo y todavía pequeño: un contador de asistentes, del estilo de los que se usan en la puerta de una sala. Un botón suma uno, otro pone la cuenta a cero y el número se ve en pantalla.

```python title="contador.py"
"""Contador de asistentes: una pulsación, una persona que entra."""

import tkinter as tk

asistentes = 0


def entra_uno():
        global asistentes
    asistentes += 1
    marcador.config(text=f"Asistentes: {asistentes}")


def reiniciar():
        global asistentes
    asistentes = 0
    marcador.config(text=f"Asistentes: {asistentes}")


ventana = tk.Tk()
ventana.title("Aforo")

marcador = tk.Label(ventana, text=f"Asistentes: {asistentes}")
marcador.pack()

boton_entrada = tk.Button(ventana, text="Entra uno", command=entra_uno)
boton_entrada.pack()

boton_reinicio = tk.Button(ventana, text="Reiniciar", command=reiniciar)
boton_reinicio.pack()

ventana.mainloop()
```

En pantalla hay tres cosas apiladas: el marcador, que empieza en `Asistentes: 0`, y los dos botones. Pulsando tres veces en "Entra uno", el marcador pasa a `Asistentes: 3`; con "Reiniciar" vuelve a `Asistentes: 0`. No imprime nada en la terminal, porque toda la información está en la ventana.

Reconocerás el patrón de tres pasos repetido tres veces, una por widget, y las dos funciones que responden a los botones pasadas a `command` sin paréntesis. La única cosa nueva es `marcador.config(text=...)`, que cambia una opción de un widget que ya existe. Es la forma de que la interfaz refleje un dato que ha cambiado, y las opciones que se le pueden pasar son las mismas que aceptaba el widget al crearse.

> [!nota] Ese `global` tiene los días contados
>
> Usar `global` para guardar el estado de la aplicación funciona en veinte líneas y es lo más honesto que se puede escribir con lo visto hasta aquí. En un programa de verdad no aguanta: con quince widgets y ocho datos, las variables globales se convierten en un problema. La solución es la que ya conoces del módulo de programación orientada a objetos, meter la ventana y sus datos en una clase, y tiene su lección en el bloque de aplicaciones. Hasta entonces, los ejemplos cortos seguirán usando variables sueltas para no mezclar dos aprendizajes a la vez.

> [!resumen] En resumen
>
> El programa mínimo de Tkinter son cuatro líneas: importar el módulo con el alias `tk`, que es la costumbre universal porque su nombre aparece en casi cada línea, crear la ventana principal con `tk.Tk()` y arrancar el bucle de eventos con `mainloop()`. Ese objeto de `tk.Tk()` es la ventana principal y, al mismo tiempo, la conexión con el intérprete de Tcl que Tkinter arranca por debajo, y por eso solo puede haber uno por programa: las ventanas adicionales se crean con `Toplevel`. `mainloop()` es un bucle infinito equivalente al `while` de un menú de terminal, pero que atiende clics, teclas y avisos del sistema, y es siempre la última línea, porque lo que vaya detrás no se ejecuta hasta que se cierre la ventana. Todo lo demás sigue un patrón de tres pasos: crear el widget indicando en el primer argumento quién es su contenedor, colocarlo con `.pack()` para que se vea, y arrancar el bucle. Un widget sin colocar no da ningún error, simplemente no aparece, y esa es la primera sospecha cuando una ventana sale vacía. Y en `command` va el nombre de la función, sin paréntesis: con paréntesis la función se ejecuta al construir la interfaz y el botón se queda sin hacer nada.

> [!ejercicio] Practica
>
> Trabaja en un fichero `02-primera-ventana.py`, salvo donde se diga otra cosa:
>
> 1. Escribe el programa de cuatro líneas, ejecútalo y comprueba que la terminal no devuelve el prompt hasta que cierras la ventana. Añade un `print` detrás de `mainloop()` y verifica cuándo sale.
> 2. Copia el `saludo.py` de la lección y cambia el texto de la etiqueta y del botón. Después quita a propósito el `.pack()` de la etiqueta, ejecútalo y confirma que no hay ningún mensaje de error.
> 3. Añade un segundo botón que imprima otra frase distinta y comprueba en qué orden aparecen los dos botones en la ventana respecto al orden de tus llamadas a `.pack()`.
> 4. Provoca el error de los paréntesis en uno de los dos botones y observa las dos consecuencias: el mensaje que sale antes de tiempo y el botón que se queda muerto.
> 5. Coge el `contador.py` de la lección, guárdalo como `02-contador.py` y añádele un tercer botón que reste uno, cuidando que el contador no baje de cero.
> 6. Partiendo del contador, escribe en `02-conversor.py` un conversor de temperatura sin campos de texto: una etiqueta con los grados centígrados y dos botones que suban y bajen de grado en grado, mostrando siempre los grados Fahrenheit equivalentes.
