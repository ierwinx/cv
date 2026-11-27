---
titulo: "Tu primera vista y su URL"
resumen: "Una función que recibe una petición y devuelve una respuesta, y la lista que decide cuál se llama."
minutos: 13
orden: 6
---

Cinco lecciones de preparación y todavía no has escrito una línea de código tuyo. Se acabó. En esta se escriben las dos piezas mínimas de cualquier página de Django: una **vista**, que es una función, y una **ruta**, que es una línea en una lista.

Son literalmente eso. Django tiene fama de grande y de tener mucho que aprender, y es verdad, pero el núcleo de lo que hace cabe en las dos cosas de esta lección. Todo lo demás del módulo son comodidades construidas encima.

> [!objetivo] Qué vas a aprender
>
> Escribir una vista y conectarla a una dirección, entender por qué una vista es una función normal y cuál es su único contrato, leer la página de error que sale cuando la ruta no existe y la que sale cuando la vista falla, y saber por qué Django añade una barra al final de las direcciones.

## Una vista es una función

Crea un fichero `vistas.py` dentro del paquete de configuración, al lado de `settings.py`:

```python title="agenda/vistas.py"
from django.http import HttpResponse


def portada(peticion):
        return HttpResponse("<h1>Agenda de contactos</h1>")
```

Eso es una vista completa. Repasa lo que tiene y, sobre todo, lo que no tiene: no hereda de nada, no lleva ningún decorador, no está registrada en ninguna parte y no sabe nada de Django más allá del objeto que devuelve.

El contrato es de una línea: **una vista recibe la petición como primer argumento y devuelve una respuesta**. Si cumple eso, a Django le vale.

El parámetro se llama `request` en toda la documentación y en el noventa y nueve por ciento del código que veas por ahí. Aquí se llama `peticion`, siguiendo la costumbre del curso de escribir en español, igual que en el módulo anterior la ventana se llamaba `ventana` y no `root`. **El nombre no importa**, es un parámetro posicional normal; lo que importa es que es el primero.

Ese objeto trae dentro todo lo que llegó por la red, con los nombres de la lección 2:

| Atributo | Qué tiene |
| --- | --- |
| `peticion.method` | `'GET'`, `'POST'`... |
| `peticion.path` | La ruta pedida, como `'/contactos/'` |
| `peticion.GET` | Lo que venía detrás del `?` en la dirección |
| `peticion.POST` | Los datos del formulario |
| `peticion.headers` | Las cabeceras |

`HttpResponse` es el otro lado: recibe el texto que quieres mandar y construye la respuesta con su código `200` y su `Content-Type: text/html; charset=utf-8`. Tiene un parecido evidente con el `send_response` que escribías a mano en la lección 2, y hace lo mismo, con todos los detalles resueltos.

> [!nota] Esto es provisional, y a propósito
>
> Poner las vistas en el paquete de configuración es exactamente lo que no se hace en un proyecto de verdad. Van en una aplicación, que es una carpeta aparte, y eso es la lección siguiente.
>
> Se hace así ahora para que puedas ver funcionar una vista sin tener que entender antes qué es una aplicación y por qué existen. En la lección 7 este fichero se mueve a su sitio, y el cambio va a ser de dos líneas.

## Conectarla a una dirección

La vista existe pero nadie la llama. Falta decirle a Django qué dirección le corresponde, y eso se hace en `urls.py`:

```python title="agenda/urls.py"
from django.contrib import admin
from django.urls import path

from . import vistas

urlpatterns = [
    path('', vistas.portada),
    path('admin/', admin.site.urls),
]
```

Tres cosas de esas líneas:

**`from . import vistas`** es una importación relativa, de las de la lección 41 del módulo 1. El punto significa "el paquete en el que estoy", así que importa `agenda/vistas.py`. Se usa la forma relativa porque así el paquete se podría renombrar sin tocar esta línea.

**`path('', vistas.portada)`** empareja una ruta con una vista. La cadena vacía es la raíz del sitio, o sea `/`. Y fíjate en que se pasa `vistas.portada`, **sin paréntesis**: se está entregando la función, no llamándola. Es la misma distinción del `command=saludar` de Tkinter, y produce el mismo tipo de fallo si te equivocas.

**`urlpatterns`** tiene que llamarse así. Es el único nombre que Django busca en este fichero.

Arranca el servidor y visita `http://127.0.0.1:8000/`. La página del cohete ha desaparecido y en su sitio está tu título.

> [!nota] Adónde se fue el cohete
>
> La página de bienvenida solo sale cuando `urlpatterns` no tiene nada para la raíz. En cuanto pones algo en `''`, Django deja de enseñarla. No la has roto: es una cortesía que se quita sola en cuanto no hace falta.

## Una segunda vista

Con dos se ve mejor cómo encaja todo. Añade a `vistas.py`:

```python title="agenda/vistas.py"
from django.http import HttpResponse


def portada(peticion):
        return HttpResponse("<h1>Agenda de contactos</h1>")


def contactos(peticion):
        nombres = ["Ana Ruiz", "Luis Pardo"]
    filas = "".join(f"<li>{n}</li>" for n in nombres)
    return HttpResponse(f"<h1>Contactos</h1><ul>{filas}</ul>")
```

Y su línea en `urls.py`:

```python
urlpatterns = [
    path('', vistas.portada),
    path('contactos/', vistas.contactos),
    path('admin/', admin.site.urls),
]
```

```bash
curl -s http://127.0.0.1:8000/contactos/
```

```salida
<h1>Contactos</h1><ul><li>Ana Ruiz</li><li>Luis Pardo</li></ul>
```

Los nombres están escritos a mano y el HTML se construye con f-strings. Las dos cosas son provisionales: los datos vendrán de la base de datos en el bloque B y el HTML saldrá de una plantilla en el C. Ahora mismo lo que importa es que el recorrido completo funciona.

> [!aviso] El HTML con f-strings es el agujero de la lección 1
>
> Ese `f"<li>{n}</li>"` es el mismo fallo que tenía el servidor manual de la primera lección. Si un nombre trae `<script>` dentro, acaba como código dentro de la página.
>
> Aquí no pasa nada porque los nombres los has escrito tú. En cuanto vengan de un formulario, sí. Las plantillas de Django escapan ese contenido por defecto, y es una de las razones de peso para usarlas en vez de armar cadenas.

## Cuando la ruta no existe

Pide `http://127.0.0.1:8000/nada` y sale un `404`. Con `DEBUG = True`, esa página no es la neutra que ve el público: te dice exactamente qué ha intentado.

```salida
Using the URLconf defined in agenda.urls, Django tried these URL patterns, in this order:

  1. [name='']
  2. contactos/
  3. admin/

The current path, nada, didn't match any of these.
```

Esa página contesta de una vez las tres preguntas que uno se hace: qué fichero de rutas se está usando, qué patrones hay dentro y en qué orden, y con qué ruta se han comparado. Casi todos los `404` que te encuentres mientras desarrollas se resuelven leyéndola: o falta la línea en `urlpatterns`, o el patrón no es el que creías, o hay uno anterior que se lo está comiendo.

Fíjate en **in this order**. `urlpatterns` se recorre de arriba abajo y gana el primero que encaja; los de debajo ni se miran.

> [!aviso] Los patrones no llevan barra al principio
>
> Este error se comete una vez y no se olvida:
>
> ```python
> path('/contactos/', vistas.contactos)    # mal
> path('contactos/', vistas.contactos)     # bien
> ```
>
> Django quita la barra inicial de la ruta antes de comparar, así que un patrón que empieza por `/` no puede encajar nunca. No da ningún error al arrancar: simplemente esa dirección da `404` para siempre. Si una ruta que juras haber escrito no funciona, mira si le sobra la barra de delante.

## La barra del final

Prueba a pedir la dirección sin la barra final:

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://127.0.0.1:8000/contactos
```

```salida
301 -> http://127.0.0.1:8000/contactos/
```

No es un `404`: es un `301` a la versión con barra. Lo hace Django, con un ajuste que viene activado y que se llama `APPEND_SLASH`. Cuando una ruta no encaja con nada, prueba a añadirle una barra al final, y si así sí encaja, redirige.

Esto explica la costumbre de Django de escribir todos los patrones terminados en barra. No es adorno: es que con `APPEND_SLASH` activado, las direcciones con barra funcionan con y sin ella, y las que no la llevan solo funcionan exactamente como están escritas. Conviene seguir la costumbre por coherencia y porque toda la documentación lo hace así.

> [!aviso] `APPEND_SLASH` solo salva a los `GET`
>
> La redirección funciona bien al navegar, pero un `POST` a una dirección sin barra se pierde por el camino: el navegador sigue el `301` con un `GET`, tal como se vio en la lección 2, y **los datos del formulario no van a ninguna parte**. No da error; el formulario simplemente no guarda nada.
>
> Es un fallo desagradable porque la página parece funcionar. Por eso el `action` de un formulario tiene que llevar la dirección exacta, con su barra, y por eso en la lección 21 se usarán nombres de ruta en vez de escribirlas a mano.

## Cuando la vista falla

Las dos formas de romper una vista, y qué se ve al hacerlo.

**Una excepción cualquiera**:

```python
def rota(peticion):
        total = 1 / 0
    return HttpResponse(total)
```

Sale la página amarilla con `ZeroDivisionError: division by zero`, la traza completa y el código de alrededor. Y en la terminal:

```salida
Internal Server Error: /rota/
```

Django ha recogido la excepción, ha contestado un `500` y **sigue funcionando**: el servidor no se cae. Es un comportamiento cómodo y tiene una trampa, porque en producción esos `500` ocurren en silencio si nadie ha montado un registro.

**Olvidarse del `return`**, que es el error propio de quien empieza:

```python
def olvidadiza(peticion):
        HttpResponse("me falta el return")
```

La función construye la respuesta y no la devuelve, así que devuelve `None`. El mensaje es de los buenos:

```salida
ValueError: The view agenda.vistas.olvidadiza didn't return an HttpResponse object.
It returned None instead.
```

Dice qué vista es, qué debía devolver y qué ha devuelto. Cuando lo veas, la respuesta casi siempre es un `return` que falta, o un `if` con una rama por la que se sale sin devolver nada.

> [!consejo] Lee la terminal, no solo el navegador
>
> Igual que en el módulo de Tkinter había que tener la terminal a la vista porque los errores dentro de un `command` no aparecían en la ventana, aquí conviene tenerla delante por el motivo contrario: el navegador enseña la página de error, pero la terminal enseña **la secuencia**. Ahí se ve el orden de las peticiones, las que fallan, las redirecciones y los ficheros que el navegador pide por su cuenta. Cuando algo pasa dos veces o en un orden raro, se ve en la terminal y no en la página.

> [!resumen] En resumen
>
> Una vista es una función normal de Python cuyo único contrato es recibir la petición como primer argumento y devolver una respuesta; no hereda de nada ni se registra en ningún sitio, y el nombre de ese primer parámetro da igual. El objeto de la petición trae el método, la ruta, los datos del formulario y las cabeceras, con los mismos nombres que se vieron en HTTP, y `HttpResponse` construye la respuesta con su código y su tipo de contenido. Conectar la vista a una dirección es una línea en la lista `urlpatterns` de `urls.py`, donde la función se pasa sin paréntesis porque se entrega, no se llama, y donde el orden importa porque gana el primer patrón que encaja. Los patrones no llevan barra al principio, y ese error no da ningún aviso, solo un `404` permanente. Sí llevan barra al final, porque con `APPEND_SLASH` activado Django redirige a la versión con barra cuando falta, aunque esa redirección se lleva por delante los datos de un `POST`. Y con `DEBUG = True` las dos páginas de error dicen justo lo que hace falta: el `404` lista los patrones que ha probado y en qué orden, y el `500` da la traza completa, incluido el mensaje que avisa de que una vista ha devuelto `None` en lugar de una respuesta.

> [!ejercicio] Practica
>
> 1. Escribe la vista de la portada y su ruta, y comprueba que la página del cohete desaparece.
> 2. Añade una vista `ahora` en `/hora/` que devuelva la fecha y la hora actuales. Recarga varias veces y comprueba que cambia.
> 3. Quita a propósito el `return` de una vista y lee el error entero. Después pon la barra inicial en uno de los patrones y observa que no hay ningún aviso, solo un `404`.
> 4. Pide una dirección que no exista y lee la lista de patrones probados. Añade una ruta nueva y comprueba que aparece en esa lista, en la posición que le toca.
> 5. Haz que una vista imprima `peticion.method` y `peticion.path` en la terminal antes de responder. Visítala desde el navegador y fíjate en si llega más de una petición.
> 6. Escribe una vista que devuelva cosas distintas según `peticion.method`: la lista si es un `GET`, y el texto "aquí se guardaría" si es un `POST`. Pruébala con `curl` y con `curl -d "x=1"`.
