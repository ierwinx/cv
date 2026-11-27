---
titulo: "Qué es Django y cómo funciona la web"
resumen: "Tu programa deja de ejecutarse en tu ordenador y pasa a ejecutarse en otro, contestando preguntas de gente que no conoces."
minutos: 14
orden: 1
---

Los tres módulos anteriores tienen algo en común que no se ha dicho nunca en voz alta: el programa y la persona que lo usa están en la misma máquina. Escribías `python3 gastos.py`, aparecía una tabla en tu terminal; escribías `python3 agenda.py`, se abría una ventana en tu pantalla. El programa, los datos y los ojos que los miran, todo en el mismo sitio.

En este módulo eso se rompe. Tu programa se va a ejecutar en un ordenador y la persona que lo usa va a estar en otro, a lo mejor en otro país, mirando un navegador. Entre los dos hay una red, y por esa red no viajan botones ni ventanas: viaja texto. Esa es la diferencia de fondo, y de ella salen casi todas las particularidades del módulo.

Esta lección no escribe todavía nada de Django. Sirve para entender qué ocurre entre que alguien escribe una dirección y le aparece una página, para ver cuánto de eso puedes hacer con la biblioteca estándar —que es más de lo que parece— y para saber exactamente qué parte es la que pone Django.

> [!objetivo] Qué vas a aprender
>
> Entender el modelo cliente-servidor y el ciclo de petición y respuesta, servir una página de verdad con la biblioteca estándar para comprobar dónde está el límite, saber qué es un framework y en qué se diferencia de una biblioteca, y conocer las cuatro piezas de Django y cómo encajan entre sí.

## Dónde se ejecuta tu programa ahora

Cuando abres `ejemplo.es/contactos` en el navegador, hay dos programas trabajando y están en máquinas distintas.

El **cliente** es el navegador. Se ejecuta en el ordenador de quien mira, y su trabajo es pedir cosas y dibujar lo que le llega. Es un programa que tú no escribes y que no controlas: puede ser Firefox, puede ser Safari en un móvil, puede ser `curl` desde una terminal, y puede ser un programa que alguien ha hecho para rascar tu web.

El **servidor** es tu programa. Se ejecuta en una máquina que está encendida todo el rato, esperando. No tiene pantalla, no tiene ventana, nadie se sienta delante. Su trabajo es escuchar peticiones y contestarlas.

Eso ya cambia dos cosas de cómo has programado hasta ahora:

- **Tu programa no empieza y termina.** Arranca una vez y se queda esperando semanas. Si dejas un fichero abierto o una lista que solo crece, en un script de terminal no se nota porque el proceso muere en dos segundos; aquí se acumula durante días hasta que la máquina se queda sin memoria.
- **Tu programa atiende a varias personas a la vez y no sabe cuáles.** No hay "el usuario", hay peticiones sueltas que llegan mezcladas. Dos personas pueden estar editando el mismo contacto en el mismo segundo.

> [!nota] El navegador no ejecuta tu Python
>
> Conviene dejarlo claro desde el principio porque es un malentendido frecuente. El código de Python que escribas en este módulo **se ejecuta entero en el servidor y nunca llega al navegador**. Lo que llega al navegador es el resultado: texto en HTML. Si haces «ver código fuente» en cualquier página de las que construyas, no vas a encontrar ni una línea de Python, igual que no encuentras el código de un restaurante cuando te traen el plato.

## Una petición y una respuesta

Todo lo que ocurre en la web es lo mismo repetido: alguien manda una **petición** y recibe una **respuesta**. No hay más. Una página con veinte imágenes no es una cosa complicada, son veintiuna peticiones.

Una petición es un texto con esta forma:

```text
GET /contactos HTTP/1.1
Host: ejemplo.es
Accept: text/html
```

La primera línea lo dice casi todo: el **método** (`GET`, que significa "dame esto"), la **ruta** (`/contactos`, la parte de la dirección que va detrás del dominio) y la versión del protocolo. Debajo van las **cabeceras**, que son datos sueltos sobre la petición.

La respuesta tiene la misma forma:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 116

<!doctype html>
<h1>Contactos</h1>
```

Un **código** que dice cómo ha ido (`200` es "toma, aquí lo tienes"), unas cabeceras que describen lo que viene, una línea en blanco, y el **cuerpo**, que es lo que el navegador va a dibujar.

Los métodos y los códigos tienen su propia lección, la siguiente. Lo que hace falta ahora es quedarse con la forma, porque **eso es literalmente lo que hace una vista de Django**: recibe un objeto que representa la petición y devuelve un objeto que representa la respuesta. Todo lo demás del módulo cuelga de esa frase.

> [!nota] Cada petición empieza de cero
>
> El protocolo HTTP no recuerda nada. La petición que llega ahora no sabe que hace diez segundos llegó otra de la misma persona: son dos textos independientes, y entre una y otra tu programa no ha guardado nada por su cuenta.
>
> Esto choca de frente con lo que traes del módulo de Tkinter, donde una variable seguía ahí mientras la ventana estuviera abierta. Aquí no hay "mientras": cada petición es un programa que nace y muere. Que una web te reconozca al navegar de página en página es un apaño construido encima, con cookies y sesiones, y tiene su lección en el bloque de usuarios.

## Servir una página con lo que ya tienes

La biblioteca estándar trae un servidor HTTP. Esto funciona y no instala nada:

```python title="servidor_manual.py"
"""Una agenda servida a mano, sin Django, para ver de qué se encarga un framework."""

from http.server import BaseHTTPRequestHandler, HTTPServer

CONTACTOS = [
    {"nombre": "Ana Ruiz", "correo": "ana@ejemplo.es"},
    {"nombre": "Luis Pardo", "correo": "luis@ejemplo.es"},
]


class Agenda(BaseHTTPRequestHandler):
        """Responde a una sola dirección y solo al método GET."""

    def do_GET(self):
                if self.path != "/contactos":
                        self.send_error(404, "Aqui no hay nada")
            return

        filas = "".join(
            f"<li>{c['nombre']} - {c['correo']}</li>" for c in CONTACTOS
        )
        pagina = f"<!doctype html>\n<h1>Contactos</h1>\n<ul>{filas}</ul>\n"
        cuerpo = pagina.encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)


servidor = HTTPServer(("127.0.0.1", 8000), Agenda)
print("Escuchando en http://127.0.0.1:8000/contactos")
servidor.serve_forever()
```

Ejecútalo y abre `http://127.0.0.1:8000/contactos` en el navegador. Verás los dos contactos en una lista. La terminal, mientras tanto, va anotando lo que le llega:

```salida
Escuchando en http://127.0.0.1:8000/contactos
127.0.0.1 - - [22/Sep/2026 09:29:44] "GET /contactos HTTP/1.1" 200 -
127.0.0.1 - - [22/Sep/2026 09:29:44] "GET /otra HTTP/1.1" 404 -
```

Ahí está entero el ciclo: llega una petición con su método y su ruta, tu código decide, y sale una respuesta con su código. Con treinta líneas y sin dependencias tienes una web funcionando.

Reconocerás cosas de módulos anteriores. `serve_forever()` es un bucle infinito al que le cedes el control y que llama a tus métodos cuando ocurre algo, exactamente igual que el `mainloop()` de Tkinter. La diferencia es qué considera "algo": allí eran clics y teclas, aquí son peticiones que llegan por la red.

> [!consejo] Mira la respuesta cruda, no solo la página
>
> El navegador te enseña el resultado ya dibujado y te esconde el texto que ha viajado de verdad. Con el servidor en marcha, en otra terminal:
>
> ```bash
> curl -i http://127.0.0.1:8000/contactos
> ```
>
> La opción `-i` incluye la primera línea y las cabeceras, así que ves la respuesta completa tal cual sale de tu programa. Es la herramienta más útil de todo el módulo cuando algo no cuadra, porque separa dos preguntas que el navegador mezcla: si el servidor ha contestado mal, o si ha contestado bien y el navegador lo dibuja de otra manera.

## Lo que le falta a ese servidor

El ejemplo funciona, y es tentador pensar que lo demás es más de lo mismo. No lo es. Mira lo que hace falta añadirle para que sea una agenda de verdad, y no una lista de dos nombres escritos a mano:

| Lo que falta | Qué significa hacerlo a mano |
| --- | --- |
| Más de una dirección | Una cadena de `if` sobre `self.path`, y en cuanto haya direcciones con datos dentro, como `/contactos/42`, expresiones regulares |
| Guardar los datos | SQL escrito a mano, la conexión, y un cambio en todas las consultas cada vez que añadas una columna |
| Formularios | Leer el cuerpo de un `POST`, descodificarlo, validar cada campo y volver a dibujar el formulario con los errores sin perder lo escrito |
| Plantillas | O concatenas HTML dentro del Python, o te escribes un sistema de plantillas |
| Usuarios | Contraseñas cifradas, cookies de sesión, y comprobar en cada vista quién eres |
| Seguridad | Escapar todo lo que escribe un desconocido, protegerte de peticiones falsificadas y no construir SQL con f-strings |
| Ficheros estáticos | Servir el CSS y las imágenes con su tipo correcto y su caché |

Esa tabla es una lista de problemas que tiene **cualquier** web, no solo la tuya. Los ha resuelto ya mucha gente, y las soluciones se parecen bastante entre sí.

Fíjate además en la última fila de la tabla anterior y en algo que el ejemplo hace mal. Los nombres se meten en el HTML con una f-string. Si un contacto se llamara `<script>`, ese texto acabaría dentro de la página como código y el navegador lo ejecutaría. Es el agujero clásico de la web, tiene nombre —XSS— y su propia lección al final del módulo. Aquí lo que importa es que **el fallo no se ve**: el programa no da ningún error, la página sale bien y el problema solo aparece el día que a alguien se le ocurre escribir algo raro en un formulario.

## Qué es Django

Django es un **framework** web: un esqueleto de aplicación con esos problemas ya resueltos, al que tú le añades lo que tiene de particular tu proyecto.

La diferencia entre una biblioteca y un framework está en quién llama a quién. Una biblioteca la llamas tú: `json.dumps(datos)` hace lo suyo y te devuelve el control. Un framework te llama a ti. Tú escribes funciones y las registras en el sitio que el framework espera, y es él quien decide cuándo ejecutarlas.

Eso no te es nuevo. En el módulo de Tkinter escribías `command=guardar` y no llamabas nunca a `guardar()`: la llamaba el bucle de eventos cuando alguien pulsaba el botón. En Django escribirás una función `lista_contactos(peticion)` y no la llamarás nunca; la llamará Django cuando entre una petición a `/contactos`. Es la misma inversión, y te la vas a encontrar en el módulo entero.

De ahí sale la ventaja y el precio. La ventaja es enorme: el panel de administración, las migraciones de la base de datos o la protección contra peticiones falsificadas son cosas que tendrías para un mes y que aquí vienen hechas. El precio es que **el framework impone dónde va cada cosa**. Hay que aprender su sitio para los modelos, su sitio para las plantillas y su forma de declarar las direcciones, y salirse de eso duele. En un proyecto pequeño puede parecer excesivo; en uno que dura años, esa estructura impuesta es la razón de que alguien nuevo se oriente en media hora.

> [!nota] Django no es la única opción
>
> Flask y FastAPI son las otras dos que vas a ver nombradas constantemente. Son más pequeñas: traen el enrutado y poco más, y la base de datos, los formularios o los usuarios los eliges y los montas tú. Eso las hace más ligeras para un servicio pequeño y más trabajosas para una aplicación completa.
>
> El curso empieza por Django precisamente porque trae todo, que es lo que permite ver el conjunto de una aplicación web de principio a fin sin decidir siete cosas antes de escribir la primera línea. FastAPI tiene su sitio en el módulo siguiente, el de las APIs.

## Las cuatro piezas

Django reparte el trabajo en cuatro sitios, y cada bloque de este módulo se ocupa de uno. Este es el recorrido completo de una petición a `/contactos`:

| Pieza | Fichero | De qué se ocupa |
| --- | --- | --- |
| URLs | `urls.py` | Mirar la ruta que ha pedido el navegador y elegir la vista que le toca |
| Vista | `views.py` | La lógica: pedir los datos que hagan falta y decidir qué se responde |
| Modelo | `models.py` | Los datos: una clase de Python por tabla, sin escribir SQL |
| Plantilla | `.html` | El aspecto: el HTML con huecos donde se meten los datos |

En orden, lo que pasa cuando alguien pide `/contactos`:

1. Entra la petición. Django construye un objeto con todo lo que traía dentro y se lo guarda.
2. `urls.py` compara la ruta con su lista y encuentra que `/contactos` le corresponde a la vista `lista_contactos`.
3. Django llama a esa función pasándole la petición.
4. La vista le pide al modelo los contactos. El ORM traduce eso a un `SELECT`, habla con la base de datos y devuelve objetos de Python.
5. La vista le pasa esos objetos a una plantilla, que produce el HTML.
6. Django envuelve ese HTML en una respuesta con su código y sus cabeceras, y la manda de vuelta.

Ese reparto se conoce como **MTV**, de modelo, plantilla y vista. Verás en muchos sitios que Django "es MVC con otros nombres", y es cierto a medias: lo que en otros frameworks se llama controlador aquí está partido entre las URLs y la vista, y lo que allí se llama vista aquí es la plantilla. No merece la pena darle más vueltas a la nomenclatura. Lo que importa es la regla práctica que se deriva de ella y que este módulo va a repetir hasta el final: **la plantilla no toca la base de datos y el modelo no sabe nada de HTML**. Cuando esa frontera se cruza, el proyecto se vuelve imposible de cambiar.

## Lo que vamos a construir

El proyecto que recorre el módulo es una **agenda de contactos**, y no es casualidad: es el mismo programa que escribiste con Tkinter y SQLite en el módulo anterior. Los datos son los de entonces —nombre, correo, teléfono, grupo y notas— y las operaciones también: listar, buscar, añadir, editar y borrar.

Se repite el dominio a propósito. Al conocer ya el problema, todo lo que llame la atención va a ser de Django y no de la agenda, y en varios momentos vas a poder comparar las dos soluciones de forma directa: cómo se guarda un contacto con `sqlite3` a mano y cómo se guarda con el ORM, cómo se valida un correo en un modal de Tkinter y cómo se valida en un formulario web, y qué significa "la tabla no es el almacén" cuando la tabla es HTML.

Los dos proyectos del final del módulo sí estrenan dominio, para no acabar con la sensación de saber hacer una sola cosa.

## La versión que usa el curso

Este módulo está escrito y comprobado con **Django 6.1 y Python 3.14**. Los ejemplos se han ejecutado en esa combinación; cuando algo depende de la versión, se dice en la propia lección.

Conviene que entiendas el calendario de Django porque te lo vas a encontrar al buscar documentación. Django saca una versión nueva cada ocho meses, y algunas se marcan como **LTS**, de soporte a largo plazo, con parches de seguridad durante unos tres años. En el momento de escribir esto, la LTS vigente es la 5.2, la última versión es la 6.1 y la próxima LTS será la 6.2.

El curso usa la última y no la LTS por una razón práctica: lo que aprendas aquí es lo que va a haber en la próxima LTS, y las diferencias del día a día entre una y otra son mínimas. Django se toma muy en serio no romper lo que funciona, y el código de este módulo se ejecuta igual en la 5.2 salvo en un par de sitios muy concretos que se señalan cuando toca.

> [!aviso] La documentación que encuentres lleva versión dentro
>
> Las direcciones de la documentación oficial incluyen la versión: `docs.djangoproject.com/en/6.1/` y `docs.djangoproject.com/en/4.2/` son páginas distintas con contenidos distintos. Los buscadores tienen la costumbre de llevarte a una versión antigua, y muchas respuestas de foros son de hace ocho años.
>
> Mira siempre el número que hay en la dirección. Si no coincide con la tuya, cambia el `en/loquesea/` por `en/stable/` y recarga: `stable` apunta siempre a la última.

> [!resumen] En resumen
>
> Programar para la web significa que tu programa se ejecuta en una máquina y quien lo usa está en otra, mirando un navegador, y que entre los dos solo viaja texto. Ese texto sigue siempre el mismo ciclo: una petición con un método y una ruta, y una respuesta con un código, unas cabeceras y un cuerpo. Tu código Python se ejecuta entero en el servidor y no llega nunca al navegador, y cada petición empieza de cero porque HTTP no recuerda nada de la anterior. Servir una página con la biblioteca estándar cabe en treinta líneas, así que el problema no es contestar: es todo lo demás —varias direcciones, la base de datos, los formularios, las plantillas, los usuarios y la seguridad—, que es exactamente lo que trae resuelto un framework. Django es un framework, y la diferencia con una biblioteca es quién llama a quién: tú escribes funciones y las registras, y es Django quien decide cuándo ejecutarlas, igual que hacía el bucle de eventos de Tkinter. Reparte el trabajo en cuatro sitios, las URLs que eligen la vista, la vista que decide, el modelo que guarda los datos y la plantilla que produce el HTML, con una frontera que no se cruza: la plantilla no toca la base de datos y el modelo no sabe nada de HTML.

> [!ejercicio] Practica
>
> No hace falta tener Django instalado para nada de esto; con la biblioteca estándar basta.
>
> 1. Copia `servidor_manual.py`, ejecútalo y ábrelo en el navegador. Después pide `http://127.0.0.1:8000/otra` y comprueba en la terminal que el código de respuesta ya no es 200.
> 2. Lanza `curl -i http://127.0.0.1:8000/contactos` en otra terminal e identifica en la salida las tres partes de una respuesta: la línea con el código, las cabeceras y el cuerpo.
> 3. Añade un tercer contacto a la lista y recarga. Ahora añade una dirección nueva, `/contactos/total`, que conteste con cuántos hay. Fíjate en cómo crece el `if` con cada dirección nueva.
> 4. Cambia el `Content-Type` de la respuesta a `text/plain`, recarga y mira qué hace el navegador con el mismo HTML. Esa cabecera no es decorativa.
> 5. Pon como nombre de un contacto `<b>Ana</b>` y recarga. Explica con tus palabras por qué sale en negrita y qué pasaría si en vez de `<b>` fuera algo peor.
> 6. Sin escribir código: coge una web que uses a diario, abre las herramientas de desarrollo del navegador en la pestaña de red y cuenta cuántas peticiones hacen falta para dibujar una sola página.
