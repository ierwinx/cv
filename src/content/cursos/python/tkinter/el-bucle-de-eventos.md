---
titulo: "El bucle de eventos"
resumen: "Por qué una interfaz gráfica se programa al revés que un script, qué hace mainloop por dentro y por qué una función lenta congela la ventana."
minutos: 27
orden: 3
---

Todos los programas que has escrito hasta ahora mandan. Deciden qué se pregunta primero, qué se calcula después y cuándo se imprime el resultado. El programa lleva la iniciativa y quien lo usa se limita a contestar.

Una interfaz gráfica funciona justo al revés. Tu programa dibuja una ventana y a partir de ahí no decide nada: espera. Espera a que alguien mueva el ratón, pulse una tecla, arrastre un borde o tape la ventana con otra. No sabe qué va a pasar, ni en qué orden, ni si va a pasar algo.

Ese cambio de mentalidad es lo más importante de todo el módulo. Si lo entiendes ahora, el resto de Tkinter es aprenderse nombres de componentes y opciones. Si no lo entiendes, la mitad de lo que haga la ventana te parecerá arbitrario.

> [!objetivo] Qué vas a aprender
>
> Entender por qué una interfaz gráfica no controla el orden de las cosas, qué hay dentro de `mainloop` y qué es un evento. Saber qué significa que `mainloop` bloquee, qué son las funciones de respuesta y por qué una función lenta congela la ventana. Conocer `after` como reloj del bucle, y por qué `update` no sirve para arreglar la congelación.

## El programa deja de mandar

En el módulo 2 escribiste menús de terminal. Todos tenían la misma forma: un bucle que dibuja, lee y despacha.

```python
while True:
        print("  1. Listar gastos")
    print("  2. Añadir gasto")
    print("  0. Salir")
    elegida = input("\nElige una opción: ").strip()
    if elegida == "1":
                listar()
    elif elegida == "2":
                anadir()
    elif elegida == "0":
                break
```

Fíjate en qué hace ese bucle, sin mirar el código. Se queda parado en `input` esperando a que ocurra algo. Cuando ocurre, mira qué ha ocurrido y llama a la función que le corresponde. Y vuelve a esperar.

**Eso es exactamente un bucle de eventos, escrito a mano.** La única diferencia con una interfaz gráfica es de dónde vienen los sucesos y cuántos tipos hay. En la terminal solo puede pasar una cosa, que alguien escriba una línea, y llega siempre por el mismo sitio. En una ventana pueden pasar treinta cosas distintas, en cualquier orden y en cualquier momento.

Escribir a mano un bucle capaz de atender el ratón, el teclado, el redibujado, el cambio de tamaño y la rueda de desplazamiento sería inviable. Además, esos sucesos no los genera tu programa: los genera el sistema operativo, y cada sistema lo hace a su manera. Por eso el bucle ya viene escrito, y se llama `mainloop`.

## Qué hay dentro de mainloop

Dentro de `mainloop` hay dos cosas: una cola y un bucle.

La cola de eventos es una lista de sucesos pendientes de atender. El sistema operativo la va llenando por un lado cada vez que ocurre algo relacionado con tu ventana. El bucle la vacía por el otro. Escrito en Python de mentira, `mainloop` es esto:

```python
while ventana_abierta:
        evento = cola_de_eventos.siguiente()   # si no hay nada, espera aquí
    destino = a_quien_le_toca(evento)      # ¿sobre qué botón se ha pulsado?
    respuesta = destino.funcion_para(evento)
    if respuesta is not None:
                respuesta(evento)
```

Tres pasos, siempre los mismos: saca el siguiente evento, mira quién lo ha pedido y llama a la función correspondiente. Nada más. Cuando no hay eventos, el bucle se queda esperando y no consume procesador.

Lo que conviene interiorizar es **cuántas cosas son un evento**. No solo los clics:

| Evento | Cuándo lo genera el sistema |
| --- | --- |
| Ratón | Al pulsar, al soltar, al mover el puntero y al girar la rueda |
| Teclado | Al pulsar y al soltar cada tecla, incluidas las modificadoras |
| Redibujado | Cuando una parte de tu ventana tiene que volver a pintarse |
| Cambio de tamaño | Cada vez que se arrastra un borde, muchas veces por segundo |
| Foco | Al pasar tu ventana al frente o dejarla atrás |
| Cierre | Al pulsar la X de la barra de título |
| Temporizador | Cuando vence un plazo que tú has pedido con `after` |

El redibujado es el que más sorprende. Una ventana no recuerda lo que hay pintado: cuando otra ventana la tapa y se aparta, el sistema le pide que se vuelva a dibujar, y ese aviso es un evento como los demás. Lo verás con todas sus letras dentro de un momento, porque es la clave de la congelación.

> [!nota] Los eventos también los tratan los widgets
>
> No todos los eventos acaban en una función tuya. Cuando escribes en una caja de texto, Tk atiende cada pulsación y dibuja la letra sin molestarte. Solo se te avisa de lo que has pedido que se te avise. Cómo se pide eso para el teclado y el ratón en bruto es la lección de `bind`, en el bloque de eventos.

## mainloop no bloquea tu programa: es tu programa

Se suele decir que `mainloop()` bloquea. Es verdad, pero la palabra confunde, porque suena a estorbo. Lo que ocurre es más radical: **a partir de esa línea, tu programa es el bucle de eventos**. Ya no hay un flujo tuyo que se haya quedado parado. Hay un bucle que llama a tus funciones cuando toca.

La consecuencia práctica se ve en dos líneas:

```python title="antes_y_despues.py"
"""Demuestra que mainloop bloquea: lo que va detrás espera al cierre."""

import tkinter as tk

ventana = tk.Tk()
ventana.title("Antes y después")
etiqueta = tk.Label(ventana, text="Cierra esta ventana y mira la terminal")
etiqueta.pack(padx=40, pady=40)

print("Antes de mainloop: la ventana está construida, pero todavía no se ve.")
ventana.mainloop()
print("Después de mainloop: esto no aparece hasta que cierras la ventana.")
```

```bash
python3 antes_y_despues.py
```

La primera línea aparece en la terminal al instante. La segunda no aparece: la ventana se queda abierta y la terminal, callada. Solo cuando cierras la ventana se imprime:

```salida
Antes de mainloop: la ventana está construida, pero todavía no se ve.
Después de mainloop: esto no aparece hasta que cierras la ventana.
```

Fíjate también en el primer mensaje. Cuando se imprime, la ventana y la etiqueta ya están creadas, pero en la pantalla no hay nada todavía. Crear los objetos y dibujarlos son cosas distintas: dibujar es trabajo del bucle, y el bucle aún no ha arrancado.

## Las funciones de respuesta

Una función de respuesta, o *callback*, es una función que tú escribes y que no llamas nunca. La llama Tk.

```python title="contador.py"
"""Una función de respuesta que tú escribes y que no llamas nunca."""

import tkinter as tk

pulsaciones = 0


def al_pulsar() -> None:
        """La llama Tk. Fíjate en que no hay ni un al_pulsar() en el programa."""
    global pulsaciones
    pulsaciones += 1
    print(f"Tk ha llamado a al_pulsar(). Pulsaciones: {pulsaciones}")
    etiqueta.config(text=f"Pulsaciones: {pulsaciones}")


ventana = tk.Tk()
ventana.title("Quién llama a quién")

etiqueta = tk.Label(ventana, text="Pulsaciones: 0")
etiqueta.pack(padx=30, pady=(30, 10))

boton = tk.Button(ventana, text="Púlsame", command=al_pulsar)
boton.pack(padx=30, pady=(0, 30))

ventana.mainloop()
```

Al pulsar tres veces el botón, la terminal escribe:

```salida
Tk ha llamado a al_pulsar(). Pulsaciones: 1
Tk ha llamado a al_pulsar(). Pulsaciones: 2
Tk ha llamado a al_pulsar(). Pulsaciones: 3
```

Busca en el programa una llamada a `al_pulsar()`. No hay ninguna. Lo que hay es `command=al_pulsar`, sin paréntesis, y esa es toda la diferencia. Es la misma idea que usaste en la lección de menús del módulo 2, cuando metiste funciones en un diccionario para despachar las opciones: **el nombre de una función sin paréntesis es un valor**, y se puede guardar para llamarlo más tarde.

Aquí quien lo guarda es el botón, y quien lo llama es el bucle de eventos. Si escribieras `command=al_pulsar()` con paréntesis, la función se ejecutaría una vez al construir la ventana y el botón se quedaría con su valor de retorno, que es `None`. El botón no haría nada al pulsarlo. Es el error más repetido de todo el módulo.

> [!consejo] Nombra las respuestas como lo que son
>
> La costumbre del curso es empezarlas por `al_`: `al_pulsar`, `al_guardar`, `al_cerrar`, `al_cambiar_seleccion`. Se lee solo y deja claro, al pasar por encima del código, que esa función no la llamas tú. Las funciones que hacen el trabajo de verdad se llaman por lo que hacen: `guardar_gastos`, `calcular_total`.

## after: el reloj del bucle de eventos

Si el bucle solo reacciona a lo que llega de fuera, ¿cómo se hace algo cada segundo? Con `after`, que es la forma de encargar una cita al bucle.

`ventana.after(1000, tictac)` no espera un segundo. Apunta una nota y vuelve inmediatamente. Cuando pase ese tiempo, el bucle meterá un evento de temporizador en la cola y llamará a `tictac`.

```python title="cuenta_atras.py"
"""after() es el reloj del bucle de eventos: encarga una llamada para más tarde."""

import tkinter as tk

restante = 5


def tictac() -> None:
        """Se vuelve a encargar a sí misma hasta llegar a cero."""
    global restante
    print(f"Tk ha llamado a tictac(). Marcador: {restante}")
    etiqueta.config(text=str(restante))
    if restante > 0:
                restante -= 1
        ventana.after(1000, tictac)
    else:
                etiqueta.config(text="Fin")


ventana = tk.Tk()
ventana.title("Cuenta atrás")

etiqueta = tk.Label(ventana, text="5")
etiqueta.pack(padx=60, pady=40)

ventana.after(1000, tictac)
ventana.mainloop()
```

```salida
Tk ha llamado a tictac(). Marcador: 5
Tk ha llamado a tictac(). Marcador: 4
Tk ha llamado a tictac(). Marcador: 3
Tk ha llamado a tictac(). Marcador: 2
Tk ha llamado a tictac(). Marcador: 1
Tk ha llamado a tictac(). Marcador: 0
```

El detalle que hay que ver es que `tictac` **no tiene ningún bucle dentro**. Se ejecuta, cambia la etiqueta, pide otra cita para dentro de un segundo y termina. Entre una llamada y la siguiente, el bucle de eventos está libre y la ventana responde con normalidad. Es el patrón de repetición de las interfaces gráficas: no un bucle que dura, sino una función corta que se vuelve a apuntar.

| Llamada | Qué hace |
| --- | --- |
| `after(1000, funcion)` | Pide una llamada a `funcion` dentro de mil milisegundos, una sola vez |
| `after(0, funcion)` | La llama en cuanto el bucle atienda la cola |
| `after_idle(funcion)` | La llama cuando no quede trabajo interno pendiente |
| `after_cancel(cita)` | Cancela una cita pendiente, con el identificador que devolvió `after` |

`after` devuelve un identificador para poder cancelar la cita, y en este sistema tiene la pinta de `'after#2'`. Guárdalo siempre que la cita pueda dejar de tener sentido, por ejemplo al cerrar una ventana que tenía un reloj en marcha.

## Si tu función tarda, la ventana se congela

Aquí está la consecuencia gorda de todo lo anterior, y conviene verla con los propios ojos antes de que te pase en un proyecto.

El bucle de eventos tiene un solo hilo. Mientras ejecuta una de tus funciones, no está sacando eventos de la cola. No atiende clics, no atiende el teclado y, sobre todo, **no atiende las peticiones de redibujado**. Si tu función tarda cinco segundos, la ventana se queda cinco segundos sin repintarse.

```python title="se_congela.py"
"""Ejemplo honesto de ventana congelada. Pulsa el botón y no toques nada."""

import time
import tkinter as tk


def tarea_larga() -> None:
        print("Empieza la tarea. El bucle de eventos se queda ocupado aquí dentro.")
    time.sleep(5)
    print("Termina la tarea. El bucle vuelve a atender la ventana.")
    etiqueta.config(text="Terminado")


ventana = tk.Tk()
ventana.title("Se congela")

etiqueta = tk.Label(ventana, text="Sin empezar")
etiqueta.pack(padx=30, pady=(30, 10))

boton = tk.Button(ventana, text="Trabajar cinco segundos", command=tarea_larga)
boton.pack(padx=30, pady=(0, 30))

ventana.mainloop()
```

Esto es lo que se ve al pulsar el botón, y merece la pena leerlo despacio porque no es lo que uno espera:

- El botón se queda con el aspecto de pulsado y no vuelve a su sitio.
- La etiqueta no cambia a "Terminado" hasta el final, aunque el cambio esté escrito antes en el código que el retorno de la función. No es que la línea no se ejecute: es que el repintado no puede ocurrir.
- Si mueves otra ventana por encima, la parte tapada se queda en blanco o con la basura que hubiera detrás. Nadie está atendiendo el redibujado.
- Si arrastras la ventana, no se mueve.
- En macOS el puntero se convierte en la rueda de colores. En Windows el título pasa a mostrar "(No responde)" y el sistema puede ofrecerte cerrar el programa.
- Los clics que hagas durante esos cinco segundos no se pierden: se quedan en la cola y se ejecutan todos de golpe al terminar.

Ese último punto es especialmente desagradable. Quien usa el programa cree que no ha funcionado, vuelve a pulsar cuatro veces, y al descongelarse la ventana la tarea se ejecuta cuatro veces más.

Se puede demostrar que el bucle está parado del todo, sin depender de lo que uno crea ver. Basta poner un latido con `after` y mirar la terminal:

```python title="latido.py"
"""Prueba de que la congelación es real: el latido deja de sonar."""

import time
import tkinter as tk


def latido() -> None:
        """Se repite cada medio segundo, mientras el bucle esté libre."""
    print(f"latido a los {time.monotonic() - inicio:.1f} s")
    ventana.after(500, latido)


def tarea_larga() -> None:
        print("--- empieza la tarea de cinco segundos ---")
    time.sleep(5)
    print("--- termina la tarea ---")


inicio = time.monotonic()

ventana = tk.Tk()
ventana.title("Latido")

boton = tk.Button(ventana, text="Bloquear cinco segundos", command=tarea_larga)
boton.pack(padx=30, pady=30)

ventana.after(500, latido)
ventana.mainloop()
```

Pulsando el botón a los dos segundos, la salida real es esta. Los tiempos exactos cambian de una ejecución a otra, pero el hueco siempre está:

```salida
latido a los 0.7 s
latido a los 1.2 s
latido a los 1.7 s
--- empieza la tarea de cinco segundos ---
--- termina la tarea ---
latido a los 7.2 s
latido a los 7.7 s
latido a los 8.2 s
```

El latido suena cada medio segundo hasta el 1.7, y el siguiente no llega hasta el 7.2. Cinco segundos y medio de silencio. Las citas de `after` que vencieron durante la tarea no se ejecutaron a su hora, porque no había nadie mirando el reloj.

> [!aviso] El problema no es dormir, es tardar
>
> `time.sleep` está aquí por ser la forma más corta de tardar a propósito. En un programa de verdad el bloqueo lo produce lo mismo que tarda en cualquier otro sitio: descargar un fichero, consultar una base de datos, recorrer un disco duro entero o convertir mil imágenes. Cualquier cosa que tarde más de una décima de segundo dentro de una función de respuesta se nota, y a partir de medio segundo la interfaz se siente rota.

La solución completa a esto tiene lección propia, la de tareas largas del bloque E, y allí se ve con `after` troceando el trabajo y con hilos para lo que no se puede trocear. No la adelantes: lo que hace falta ahora es haber entendido por qué se congela, porque ese diagnóstico es lo que te va a permitir reconocer el problema cuando aparezca disfrazado.

## update y update\_idletasks

Al llegar aquí, casi todo el mundo descubre `update()` y cree haber encontrado la solución. Conviene entender qué hacen de verdad estos dos métodos, porque son útiles, pero no para esto.

| Método | Qué procesa | Qué no procesa |
| --- | --- | --- |
| `update_idletasks()` | El trabajo interno pendiente: recalcular el diseño y repintar | Nada que venga de fuera: ni clics, ni teclas, ni temporizadores |
| `update()` | Todo lo que haya en la cola, incluido el trabajo interno | Nada: lo atiende todo |

La diferencia se puede comprobar. Con una cita de `after(0, ...)` pendiente, `update_idletasks()` no la ejecuta y `update()` sí. En cambio `update_idletasks()` sí rehace el diseño: en una ventana a la que se le acaba de añadir una etiqueta, el ancho que pide pasa de 112 a 292 píxeles solo por llamarlo.

Por eso `update_idletasks()` aparece de forma legítima cuando necesitas saber el tamaño real de algo que acabas de crear, y lo usarás en la lección siguiente para centrar una ventana. Es su sitio natural: obligar a Tk a terminar las cuentas del diseño, sin dejar entrar nada más.

Lo que no funciona es usar `update()` para descongelar una tarea larga, aunque a primera vista lo parezca:

```python title="trampa_update.py"
"""Por qué update() no arregla la congelación: reentra en tu propio código."""

import time
import tkinter as tk

tareas_a_la_vez = 0


def tarea_con_update() -> None:
        global tareas_a_la_vez
    tareas_a_la_vez += 1
    print(f"Entro en la tarea. Ejecuciones a la vez: {tareas_a_la_vez}")
    for paso in range(1, 6):
                time.sleep(1)
        etiqueta.config(text=f"Paso {paso} de 5")
        ventana.update()  # atiende lo pendiente, incluidos los clics nuevos
    tareas_a_la_vez -= 1
    print(f"Salgo de la tarea. Ejecuciones a la vez: {tareas_a_la_vez}")


ventana = tk.Tk()
ventana.title("La trampa de update")

etiqueta = tk.Label(ventana, text="Sin empezar")
etiqueta.pack(padx=30, pady=(30, 10))

boton = tk.Button(ventana, text="Trabajar con update", command=tarea_con_update)
boton.pack(padx=30, pady=(0, 30))

ventana.mainloop()
```

La ventana ahora sí se repinta y la etiqueta va contando los pasos. Parece arreglado. Pulsa el botón dos veces seguidas y mira la terminal:

```salida
Entro en la tarea. Ejecuciones a la vez: 1
Entro en la tarea. Ejecuciones a la vez: 2
Salgo de la tarea. Ejecuciones a la vez: 1
Salgo de la tarea. Ejecuciones a la vez: 0
```

Hay dos copias de la tarea ejecutándose a la vez, una dentro de la otra. El segundo clic estaba en la cola, `ventana.update()` lo atendió sin salir de la primera tarea y llamó otra vez a `tarea_con_update`. La primera llamada no ha terminado y ya hay una segunda encima.

> [!aviso] update() no descongela, reentra
>
> Llamar a `update()` dentro de una función de respuesta es abrir la puerta a que se ejecute cualquier otra función de respuesta en medio de la tuya, con tus variables a medio actualizar. En el mejor de los casos la tarea se duplica. En el peor, alguien cierra la ventana durante tu bucle y la siguiente línea trabaja con widgets ya destruidos, con lo que te llevas un `TclError` en un sitio que no tiene nada que ver. Es un fallo que aparece una vez de cada veinte y cuesta una tarde encontrarlo. **Trata `update()` como una herramienta de diagnóstico, no como una solución.**

## El orden correcto del programa

De todo lo anterior sale una estructura fija, y todos los programas del módulo la van a seguir:

1. Crear la ventana con `tk.Tk()`.
2. Construir la interfaz entera: widgets, opciones, colocación, funciones de respuesta.
3. Ajustar la ventana: título, tamaño, icono, qué hacer al cerrar.
4. `mainloop()` en la última línea.

El paso 4 es literal. `mainloop()` va al final del fichero, sin nada detrás.

> [!error] AttributeError o líneas que no se ejecutan después de mainloop
>
> Si has puesto código después de `mainloop()` esperando que se ejecute mientras la ventana está abierta, no se va a ejecutar. Esa línea espera al cierre de la ventana, y cuando por fin le toca, los widgets ya no existen. Lo que quieres hacer va en otro sitio: si es una respuesta a algo que hace quien usa el programa, en una función de respuesta; si es algo periódico, en una función llamada con `after`; y si es limpieza al salir, interceptando el cierre con `protocol`, que se ve en la lección siguiente.

Queda una excepción razonable. Después de `mainloop()` sí tiene sentido poner lo que deba ocurrir cuando el programa ya ha terminado: guardar la configuración, cerrar una conexión o escribir una línea en el registro de actividad. Eso es lo que hacía el `finally` de los programas de terminal del módulo 2, y aquí ocupa el mismo lugar.

> [!resumen] En resumen
>
> Un programa de terminal decide el orden de las cosas; una interfaz gráfica no decide nada y se limita a esperar. `mainloop()` es el mismo bucle que escribías a mano en los menús del módulo 2, pero escrito por Tk y alimentado por el sistema operativo: dentro hay una cola de eventos y un bucle que saca el siguiente, mira quién lo ha pedido y llama a la función correspondiente. Son eventos el ratón, el teclado, el foco, el cambio de tamaño, el cierre y el redibujado. `mainloop()` no bloquea tu programa, sino que es tu programa a partir de esa línea, y el código que va detrás espera al cierre de la ventana. Las funciones de respuesta son funciones que tú escribes y que no llamas nunca, porque se registran sin paréntesis y las llama Tk. Como el bucle tiene un solo hilo, cualquier función tuya que tarde lo deja parado y la ventana se congela: no se repinta, no responde y el sistema puede marcarla como no disponible, con la solución completa en la lección de tareas largas. `after` es el reloj de ese bucle y permite repetir trabajo sin bucles propios. `update_idletasks()` sirve para forzar las cuentas del diseño, pero usar `update()` para descongelar es una trampa, porque reentra en tu código y ejecuta unas respuestas dentro de otras. El orden es siempre el mismo: crear la ventana, construir la interfaz y `mainloop()` en la última línea.

> [!ejercicio] Practica
>
> Crea un fichero `03-bucle.py` y trabaja sobre él, copiando los ejemplos en ficheros aparte cuando haga falta:
>
> 1. Ejecuta `antes_y_despues.py` y añade un tercer `print` justo antes de `mainloop()` y otro justo después. Anota en qué momento aparece cada uno. Después mueve `mainloop()` a la mitad del programa y explica por qué la ventana sale a medio construir.
> 2. Coge `contador.py` y cambia `command=al_pulsar` por `command=al_pulsar()`. Ejecútalo, observa qué se imprime al arrancar y qué hace el botón al pulsarlo, y explica con tus palabras por qué el botón ha dejado de funcionar.
> 3. Amplía `cuenta_atras.py` con un segundo botón que pare la cuenta. Tendrás que guardar lo que devuelve `after` y pasárselo a `after_cancel`. Comprueba que después de parar, el botón de arranque vuelve a funcionar.
> 4. Ejecuta `latido.py` y prueba a bajar el `time.sleep(5)` a `0.5`, `1` y `3` segundos. Anota a partir de qué duración empiezas a notar la interfaz rara. Ese número es tu presupuesto para una función de respuesta.
> 5. En `se_congela.py`, pulsa el botón y durante los cinco segundos haz tres clics más y arrastra la ventana. Describe todo lo que ocurre al descongelarse y cuenta cuántas veces se ha ejecutado la tarea.
> 6. Escribe un reloj que muestre la hora con segundos en una etiqueta, usando `after` y `datetime`. Busca un intervalo que no vaya a saltos: con mil milisegundos exactos el reloj se retrasa un poco cada vuelta, y conviene entender por qué.
