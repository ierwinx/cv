---
titulo: "Qué es una interfaz gráfica"
resumen: "Cuándo una ventana es la respuesta correcta y cuándo no, qué es Tkinter por dentro y por qué es el punto de partida razonable."
minutos: 21
orden: 1
---

Al terminar el módulo anterior tenías una herramienta de verdad: instalable, con subcomandos, colores, registro de actividad y su fichero de configuración. Se lanza de madrugada sin nadie delante y encaja con el resto del sistema. Pásasela ahora a la persona que lleva la contabilidad de la oficina y mira lo que pasa: nada. No va a abrir una terminal, no va a escribir `gastos añadir --importe 42 --categoria dietas`, y no se va a leer tu `--help` para averiguar qué opciones existen.

Eso no es un defecto de tu programa. Es que la terminal tiene un público, y ese público no es todo el mundo. Cuando el programa lo usa alguien que no sabe ni quiere saber qué es una línea de comandos, hace falta otra cosa: una ventana con cosas que se ven y se pulsan.

Este módulo va de construir esas ventanas con Tkinter. Antes de escribir la primera línea conviene tener claras dos cosas: en qué casos una ventana gana y en qué casos es un estorbo, y qué es exactamente Tkinter, porque su forma de funcionar explica casi todas las rarezas que te vas a encontrar después.

> [!objetivo] Qué vas a aprender
>
> Saber decidir entre una aplicación de terminal y una gráfica según la audiencia, el descubrimiento y el tipo de datos; entender qué es Tkinter y qué relación tiene con Tcl/Tk; conocer las alternativas y por qué no son el punto de partida; y comprobar que tienes Tkinter funcionando en tu equipo.

## Lo que la terminal no puede dar

En la primera lección del módulo 2 quedaron claras las cuatro virtudes de un programa de terminal: se automatiza, se encadena con otros programas, funciona a distancia por SSH y se puede copiar y pegar en la documentación. Todo eso sigue siendo verdad. Este módulo no viene a desmentirlo.

Lo que toca ahora es el otro lado de la balanza. Hay tres cosas que una ventana hace bien y una terminal no hace de ninguna manera.

### La audiencia

Es la razón de peso, y tiene poco que ver con la tecnología. Una orden de terminal exige saber que existe la terminal, saber abrirla, saber en qué carpeta estás y escribir sin faltas. Para quien programa, eso es gratis. Para el resto de la gente es una barrera que no va a cruzar, y no por falta de capacidad: por falta de motivo.

Una ventana, en cambio, se abre con doble clic y se entiende mirándola. **La pregunta que decide no es qué es más potente, sino quién va a usar el programa.** Si la respuesta es "yo y dos compañeros del equipo de sistemas", escribe una herramienta de terminal. Si la respuesta es "la persona que lleva el almacén", escribe una ventana.

### El descubrimiento sin documentación

Un programa de terminal esconde todo lo que sabe hacer. Está en `--help`, que es un texto que hay que pedir, leer y entender. Si tiene doce opciones, hay que leerse las doce para saber que existe la que buscas.

Una ventana enseña sus posibilidades a la vez. Los botones están ahí, el menú se despliega, las casillas se ven marcadas o sin marcar. No hay que memorizar que la opción se llama `--recursivo` porque hay una casilla que dice "incluir subcarpetas". Eso convierte el programa en algo que se aprende a base de mirarlo, sin manual, y es lo que hace que alguien lo use una vez cada tres meses sin tener que volver a estudiarlo.

### Los datos que se exploran mirando

Hay información que en texto no se entiende. Cincuenta filas de gastos por categoría son cincuenta filas; el mismo dato en una gráfica de barras se lee en un segundo. Y hay tareas que son espaciales por naturaleza: recortar una imagen, ordenar una lista arrastrando elementos, elegir un color, marcar un rango en un calendario.

En el módulo anterior hiciste tablas y barras de progreso con caracteres, y funcionan. Pero hay un techo. Cuando el trabajo consiste en **comparar, señalar o ajustar** algo a ojo, una ventana no es un adorno: es la herramienta adecuada.

## Lo que una ventana no te va a dar

Aquí es donde conviene no vender la moto. Una interfaz gráfica pierde justo las cuatro virtudes de las que hablaba el módulo 2, y las pierde por completo:

- **No se automatiza.** Nadie ha conseguido programar una tarea del sistema que consista en "pinchar en este botón a las tres de la mañana". Si el programa tiene que ejecutarse solo, la interfaz gráfica no sirve.
- **No se encadena.** No hay tuberías entre ventanas. La salida de un programa gráfico es la pantalla, y la pantalla no es la entrada de nada.
- **No funciona a distancia.** En un servidor sin monitor, dentro de un contenedor o al otro lado de una conexión SSH, una ventana no se puede abrir. Y aunque se pueda reenviar la pantalla, va lento y se rompe.
- **No se puede pegar en un correo.** "Abre el menú Herramientas, pincha en Configuración, busca la tercera pestaña" es una frase; `gastos informe --mes 9 --formato csv` es una orden que se copia y se ejecuta tal cual.

Resumido en una tabla, según lo que tengas delante:

| Si lo que necesitas es... | Elige |
| --- | --- |
| Que lo use gente que no abre terminales | Ventana |
| Que se ejecute solo, todas las noches | Terminal |
| Que se entienda sin leer documentación | Ventana |
| Combinarlo con otras herramientas del sistema | Terminal |
| Explorar datos mirándolos, o trabajar sobre imágenes | Ventana |
| Que funcione en un servidor por SSH | Terminal |
| Que se instale con doble clic y salga un icono | Ventana |

> [!consejo] Lo mejor de las dos suele ser hacer las dos
>
> La forma profesional de resolver esto no es elegir, es **separar la lógica de la interfaz**. Ya lo hiciste en el módulo 2: las funciones que calculan por un lado, el trozo que habla con la persona por otro. Si esa separación está bien hecha, poner una ventana encima de la misma lógica cuesta un día, y el programa acaba teniendo las dos caras. `git` se usa por terminal y también desde media docena de aplicaciones gráficas, y por debajo es el mismo `git`.

## Qué es Tkinter

Tkinter no es una biblioteca de ventanas escrita en Python. Es **la interfaz de Python hacia Tk**, que es otra cosa y está escrita en otro lenguaje.

La historia corta: a finales de los ochenta se creó Tcl, un lenguaje de guiones pequeño y empotrable. Poco después le añadieron Tk, una biblioteca para construir interfaces gráficas desde Tcl. Tk funcionó muy bien y terminó usándose desde muchos lenguajes distintos. Python es uno de ellos, y el módulo que hace de puente se llama `tkinter`, de *Tk interface*.

Lo que ocurre de verdad cuando importas `tkinter` y creas una ventana es esto: tu programa de Python **arranca un intérprete de Tcl dentro del mismo proceso** y le va mandando órdenes en Tcl. Cada widget que creas es un objeto de Python que por debajo guarda un nombre, y cada opción que cambias se traduce a una orden de texto para ese intérprete.

No hay que creérselo: se puede ver. Esta sesión crea una ventana y una etiqueta, y luego mira por debajo:

```consola
>>> import tkinter as tk
>>> ventana = tk.Tk()
>>> etiqueta = tk.Label(ventana, text="Hola")
>>> str(etiqueta)
'.!label'
>>> etiqueta.cget("relief")
'flat'
>>> ventana.tk.eval("expr 2 + 2")
'4'
```

Tres detalles de ahí merecen atención. El primero: la etiqueta, convertida a texto, es `.!label`. Ese no es un nombre de Python, es la ruta del widget dentro de Tk, con el punto que representa la ventana principal, igual que una ruta de carpetas. El segundo: al preguntar por el borde, la respuesta es la cadena `'flat'`, no una constante ni un miembro de un `Enum`. Y el tercero: ese `ventana.tk` es el intérprete de Tcl en persona, y se le puede pasar código Tcl a mano.

> [!nota] De aquí salen casi todas las rarezas de la API
>
> Cuando en las lecciones siguientes veas que las opciones de un widget son cadenas (`relief="groove"`, `anchor="nw"`, `side="left"`), que los widgets se identifican por rutas con puntos, que hay que usar `StringVar` y `IntVar` en vez de variables normales de Python para conectar un dato con lo que se ve en pantalla, o que algunas opciones se escriben con nombres extraños como `borderwidth` o `takefocus`, la explicación es siempre la misma: **por debajo hay un lenguaje en el que todo es texto**. No es un capricho del diseño de Python. Es la traducción. Saberlo ahorra mucha frustración, porque deja de parecer arbitrario.

Tk sigue vivo y desarrollándose. El entorno de referencia de este curso es Python 3.14 con Tcl/Tk 9.0, que es una versión reciente y con buen aspecto en los tres sistemas operativos. Si has visto alguna captura antigua de Tkinter con botones grises que parecen de 1995, era Tk 8 con los widgets clásicos; hay una familia de widgets modernos, `ttk`, que usa el aspecto nativo del sistema, y tiene su propio bloque de lecciones.

## Por qué Tkinter y no otra

Python tiene varias opciones para hacer interfaces gráficas. Tkinter se lleva este módulo por cuatro razones concretas:

- **Viene incluido.** Forma parte de la biblioteca estándar. No hay que instalar nada, no hay que decidir versiones, no hay dependencias que se rompan al año siguiente. El criterio del curso es el mismo del módulo anterior: primero la biblioteca estándar.
- **Es multiplataforma sin esfuerzo.** El mismo fichero abre la misma ventana en macOS, Windows y Linux. Hay diferencias de aspecto y alguna de comportamiento, y se irán señalando cuando importen, pero el código no cambia.
- **Es pequeña y se puede aprender entera.** Tiene unos veinte widgets. En un módulo se cubren todos, con sus opciones. Los kits grandes tienen cientos de clases y nadie los conoce al completo.
- **Es lo que se encuentra por ahí.** Muchas herramientas internas, utilidades de laboratorio y guiones con ventana están hechos con Tkinter, precisamente porque no hay que instalar nada. Saber leerlos tiene valor.

Las alternativas existen y algunas son mejores para determinados trabajos. Esto es lo que hay, con honestidad:

| Opción | Se instala | Qué aporta | Por qué no es el punto de partida |
| --- | --- | --- | --- |
| Tkinter | No, viene con Python | Suficiente para aplicaciones de escritorio normales | — |
| PyQt / PySide | Sí, y pesa cientos de megas | El kit más completo: tablas de verdad, editor visual, gráficas | Enorme para empezar, y PyQt tiene licencia GPL o comercial, con lo que hay que pensar antes de distribuir. PySide es de los autores de Qt y su licencia es más cómoda |
| Kivy | Sí | Pensado para pantallas táctiles, con aspecto propio y buen soporte de móvil | Su aspecto no es el del sistema y su modelo de trabajo es distinto. Es la respuesta cuando el objetivo es Android o iOS |
| Web con Django | Servidor y navegador | Llega a mucha gente sin instalar nada en su equipo, y funciona desde el móvil | Son tres tecnologías a la vez y no hay ventana: hay servidor. Es el módulo 4 |

> [!nota] Gráfica de escritorio y aplicación web no compiten tanto como parece
>
> El módulo siguiente es de Django, y la pregunta "¿ventana o web?" tiene una respuesta bastante mecánica. Si el programa trabaja con los ficheros del equipo de quien lo usa, lo tiene que abrir cualquiera sin conexión y no hay datos compartidos entre varias personas, es una aplicación de escritorio. Si hay varios usuarios que necesitan ver los mismos datos, o quieres poder cambiar el programa sin que nadie instale nada, es una aplicación web. Son dos herramientas para dos problemas.

## Comprobar que tienes Tkinter

Tkinter viene con Python, pero Tk es una biblioteca del sistema, así que en la práctica puede faltar. Para comprobarlo hay una prueba integrada:

```bash
python3 -m tkinter
```

Eso abre una ventanita de prueba. Tiene un texto que dice qué versión de Tcl/Tk tienes, con una segunda línea que muestra una cedilla para verificar que los acentos y los caracteres no ingleses se dibujan bien, y dos botones: uno que rodea su propio texto con corchetes cada vez que lo pulsas y otro, `QUIT`, que cierra la ventana. Si ves esa ventana, tienes todo lo que hace falta para el módulo completo.

Si prefieres saber la versión exacta sin abrir nada, es un programa de tres líneas:

```python title="comprobar_tkinter.py"
"""Comprueba que Tkinter está disponible y con qué versión de Tk trabaja."""

import tkinter

print("Tkinter está instalado.")
print(f"Versión de Tcl: {tkinter.TclVersion}")
print(f"Versión de Tk:  {tkinter.TkVersion}")
```

```bash
python3 comprobar_tkinter.py
```

```salida
Tkinter está instalado.
Versión de Tcl: 9.0
Versión de Tk:  9.0
```

Fíjate en que esas dos versiones son de Tcl y de Tk, no de Python ni de Tkinter. Es otra pista de que por debajo hay otra cosa.

> [!error] ModuleNotFoundError: No module named 'tkinter'
>
> El módulo `tkinter` está en la biblioteca estándar, así que este error casi nunca significa que falte Python: significa que falta el paquete del sistema con Tk. Pasa sobre todo en Linux, donde las distribuciones parten Python en varios paquetes y el de Tk se instala aparte. En Debian, Ubuntu y derivadas:
>
> ```bash
> sudo apt install python3-tk
> ```
>
> En Fedora es `sudo dnf install python3-tkinter`, y en Arch, `sudo pacman -S tk`. En macOS y Windows, el Python del instalador oficial ya lo trae; si lo instalaste con `pyenv` o compilándolo a mano y sale este error, es que se compiló sin Tk delante y hay que volver a instalarlo con las cabeceras de Tk presentes. Una última causa, menos frecuente pero muy confusa: **tener un fichero tuyo llamado `tkinter.py` en la carpeta**, que tapa al módulo de verdad. Cámbialo de nombre.

## Qué vas a construir

El módulo está organizado en cinco bloques, y cada uno se apoya en el anterior:

- **La ventana.** Lo que hay antes de que se vea nada: crear la ventana principal, ponerle título y tamaño, entender el bucle de eventos y por qué una aplicación gráfica se programa al revés que un guion de terminal.
- **La colocación.** Cómo se decide dónde va cada cosa. Tkinter tiene tres sistemas para esto y no son intercambiables, y esta es la parte donde más gente se atasca: conseguir que el diseño no se descoloque al cambiar el tamaño de la ventana.
- **Los widgets, uno a uno.** Etiquetas, botones, campos de texto, casillas, listas, desplegables, deslizadores, pestañas, árboles y el resto. Cada uno con sus opciones en una tabla, sus usos y sus trampas.
- **La interacción.** Responder al teclado y al ratón, menús, diálogos para abrir y guardar ficheros, ventanas secundarias y tareas que tardan sin que la ventana se quede congelada.
- **Las aplicaciones reales.** Tres programas completos, de principio a fin: un editor de texto, un gestor de contactos con su almacenamiento y una calculadora. Ahí se junta todo, organizado en clases y empaquetado para que se abra con doble clic.

> [!resumen] En resumen
>
> Una interfaz gráfica no es una versión mejor de una aplicación de terminal, es la respuesta a un problema distinto. Gana cuando el programa lo va a usar gente que no abre terminales, cuando tiene que entenderse sin documentación porque todo lo que sabe hacer está a la vista, y cuando los datos se exploran o se manipulan mirándolos. Pierde en todo lo demás: no se automatiza, no se encadena con otros programas, no funciona por SSH y no se puede copiar en un correo, así que lo sensato es separar la lógica de la interfaz y poder ofrecer las dos caras. Tkinter es la interfaz de Python hacia Tk, una biblioteca gráfica escrita para el lenguaje Tcl; tu programa arranca un intérprete de Tcl por debajo y le manda órdenes de texto, y de ahí vienen las rarezas de su API. Es el punto de partida porque viene en la biblioteca estándar, no instala nada, funciona igual en los tres sistemas y es lo bastante pequeña para aprenderla entera. Antes de seguir, comprueba que la tienes con `python3 -m tkinter`, y si en Linux falla, instala el paquete `python3-tk`.

> [!ejercicio] Practica
>
> Crea un fichero `01-comprobacion.py` para la primera parte y apunta las respuestas del resto en un fichero de texto:
>
> 1. Ejecuta `python3 -m tkinter` y anota la versión de Tcl/Tk que aparece en la ventana. Comprueba que coincide con lo que dice el `comprobar_tkinter.py` de la lección, copiado en `01-comprobacion.py`.
> 2. Amplía `01-comprobacion.py` para que, además de las versiones, imprima la versión exacta de Tk que informa el intérprete de Tcl. La puedes obtener creando una ventana y llamando a `ventana.tk.call("info", "patchlevel")`; recuerda cerrarla luego con `ventana.destroy()`.
> 3. Elige cinco programas que uses a diario, unos con ventana y otros de terminal, y justifica en una frase por cada uno por qué crees que sus autores eligieron ese formato.
> 4. Coge el gestor de gastos del módulo anterior y decide qué tres funciones tendría sentido poner detrás de botones y cuáles no. Di qué pasaría con la automatización nocturna si lo convirtieras del todo en una aplicación de ventana.
> 5. Busca en tu equipo un programa cuya interfaz te parezca mala y escribe tres cosas concretas que le harías. Guarda la lista: al final del módulo vas a tener que tomar esas mismas decisiones.
> 6. Piensa un caso en el que la respuesta correcta no sea ni terminal ni ventana de escritorio, sino aplicación web, y explica en tres frases qué lo hace distinto de los otros dos.
