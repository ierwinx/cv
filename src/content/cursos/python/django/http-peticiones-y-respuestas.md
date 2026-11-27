---
titulo: "HTTP: peticiones, respuestas, métodos y códigos"
resumen: "El único protocolo que hay que entender para programar en la web, y las cuatro decisiones que te obliga a tomar en cada página."
minutos: 16
orden: 2
---

En la lección anterior quedó dicho que por la red viaja texto y que ese texto sigue siempre la misma forma. Ahora toca mirarlo de cerca, porque **de ese formato salen la mitad de las decisiones que vas a tomar en el módulo**: si un formulario va por `GET` o por `POST`, qué se contesta cuando alguien pide algo que no existe, por qué al recargar una página el navegador pregunta si quieres reenviar los datos, y por qué después de guardar hay que redirigir en vez de contestar directamente.

HTTP es un protocolo pequeño. Cabe entero en una lección, y merece la pena entenderlo antes de tocar Django, porque Django no es más que una máquina muy elaborada de convertir peticiones en respuestas. Si sabes lo que entra y lo que sale, lo de en medio se aprende solo.

> [!objetivo] Qué vas a aprender
>
> Leer una petición y una respuesta HTTP línea a línea, saber qué método corresponde a cada situación y por qué `GET` y `POST` no son intercambiables, conocer las familias de códigos de respuesta y los diez que se usan de verdad, entender el patrón de redirigir después de guardar, y manejar `curl` para ver lo que de verdad viaja.

## La forma de una petición

Esto es una petición completa, tal cual sale del navegador:

```text
GET /contactos HTTP/1.1
Host: ejemplo.es
User-Agent: Mozilla/5.0
Accept: text/html
Accept-Language: es-ES,es;q=0.9
```

Tiene tres partes y una de ellas puede estar vacía:

- **La primera línea**: el método, la ruta y la versión del protocolo. Es lo único obligatorio.
- **Las cabeceras**: pares de `nombre: valor`, una por línea. Son datos *sobre* la petición, no la petición misma.
- **El cuerpo**, detrás de una línea en blanco. En un `GET` no hay; en un `POST` es donde van los datos del formulario.

De las cabeceras, cuatro se ven constantemente:

| Cabecera | Para qué sirve |
| --- | --- |
| `Host` | El dominio que se ha pedido. Es la que permite que un solo servidor atienda a veinte webs distintas |
| `Content-Type` | Qué hay en el cuerpo: datos de un formulario, JSON, un fichero subido |
| `Content-Length` | Cuántos bytes ocupa el cuerpo. Sin ella, el servidor no sabe dónde termina |
| `Cookie` | Lo que el navegador te devuelve de lo que tú le diste antes. Es la base de las sesiones |

La respuesta tiene exactamente la misma estructura, cambiando la primera línea:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 116

<!doctype html>
<h1>Contactos</h1>
```

## Los métodos

El método dice qué se quiere hacer. Hay nueve; en la práctica se usan cinco, y en una web con formularios, dos.

| Método | Qué significa | ¿Cambia algo en el servidor? |
| --- | --- | --- |
| `GET` | Dame esto | No |
| `POST` | Toma esto, haz algo con ello | Sí |
| `PUT` | Guarda esto aquí, entero | Sí |
| `PATCH` | Cambia esta parte de esto | Sí |
| `DELETE` | Borra esto | Sí |

La columna de la derecha es la que importa, y no es una convención decorativa. **`GET` tiene que poder repetirse sin consecuencias.** Ese contrato lo dan por hecho un montón de programas que tú no controlas: el navegador repite peticiones `GET` al recargar, al usar el botón de atrás y al precargar enlaces por si los pulsas; los buscadores recorren todos los enlaces de tu web; los antivirus corporativos y los previsualizadores de enlaces de las aplicaciones de mensajería abren cada dirección que ven pasar.

De ahí sale la regla práctica más importante de esta lección: **si una dirección borra, crea o modifica algo, no puede responder a `GET`**. La historia clásica es la de la web de administración que tenía los botones de borrar como enlaces normales, a direcciones del tipo `/borrar/42`; un buscador la indexó, recorrió todos los enlaces y dejó la base de datos vacía en una tarde. Nadie atacó nada: cada pieza hizo exactamente lo que le tocaba.

> [!nota] El navegador solo sabe hacer dos
>
> Aunque existan `PUT`, `PATCH` y `DELETE`, un navegador solo genera `GET` y `POST` por su cuenta. Los enlaces y la barra de direcciones son siempre `GET`, y un formulario admite `method="get"` o `method="post"` y nada más. Los otros métodos se usan desde JavaScript o desde programas, y ahí es donde tienen sentido de verdad, en las APIs REST del módulo siguiente.
>
> Por eso una web clásica de Django, como la que vas a construir, borra con un `POST` a `/contactos/42/borrar`. No es que se desconozca `DELETE`: es que el navegador no lo sabe hacer sin ayuda.

## Los códigos de respuesta

El número de la primera línea de la respuesta dice cómo ha ido. La primera cifra marca la familia, y esa cifra sola ya te dice de quién es la culpa:

| Familia | Significa | Quién tiene el problema |
| --- | --- | --- |
| `2xx` | Ha ido bien | Nadie |
| `3xx` | Lo que buscas está en otro sitio | Nadie, pero hay que ir allí |
| `4xx` | La petición está mal | Quien la mandó |
| `5xx` | La petición estaba bien y el servidor ha fallado | Tú |

Esa última distinción es la que más rendimiento da en el día a día. Cuando algo no funciona, el código te dice de entrada si el fallo está en lo que se pidió o en tu código, y eso ahorra mucho tiempo mirando donde no es.

Los que vas a usar de verdad son estos diez:

| Código | Nombre | Cuándo |
| --- | --- | --- |
| `200` | OK | La respuesta normal |
| `201` | Created | Se ha creado algo. Se usa sobre todo en APIs |
| `204` | No Content | Ha ido bien y no hay nada que enseñar |
| `301` | Moved Permanently | Esto se ha mudado para siempre |
| `302` | Found | Esto está temporalmente en otro sitio |
| `303` | See Other | Ya está hecho; ahora ve a mirar aquí con un `GET` |
| `400` | Bad Request | La petición no se entiende |
| `403` | Forbidden | Sé quién eres y no puedes |
| `404` | Not Found | Aquí no hay nada |
| `405` | Method Not Allowed | Esa dirección existe, pero no con ese método |
| `500` | Internal Server Error | Ha saltado una excepción en tu código |

Dos que se confunden a menudo. **`403` no es `404`**: el primero dice "existe pero no puedes", el segundo dice "no existe". Y **`404` no es `405`**: pedir con `DELETE` una dirección que solo contesta a `GET` no es que la dirección no exista, es que ese método no vale ahí, y contestar `404` manda a quien pregunta a buscar un problema que no tiene.

> [!aviso] El `500` es tuyo y hay que enterarse
>
> Un `500` significa que tu código ha lanzado una excepción que nadie ha recogido. En desarrollo lo verás con todo lujo de detalles, porque Django enseña la traza completa en una página amarilla muy reconocible. En producción, quien mire la web verá una página neutra que no dice nada, que es lo correcto —la traza revela rutas, versiones y a veces datos—, pero eso significa que **si no montas un registro, tus errores ocurren y no te enteras**. La lección de configuración por entornos se ocupa de eso.

## Verlo funcionar

Este servidor no instala nada y demuestra los métodos, los códigos y las redirecciones a la vez:

```python title="metodos.py"
"""Los métodos y los códigos de respuesta, sin framework de por medio."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs

CONTACTOS = ["Ana Ruiz", "Luis Pardo"]


class Agenda(BaseHTTPRequestHandler):

        def responder(self, codigo, texto):
                cuerpo = texto.encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
                if self.path == "/contactos":
                        self.responder(200, "\n".join(CONTACTOS))
        elif self.path == "/agenda":
                        self.send_response(301)
            self.send_header("Location", "/contactos")
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
                        self.responder(404, "No existe esa direccion")

    def do_POST(self):
                if self.path != "/contactos":
                        self.responder(404, "No existe esa direccion")
            return

        longitud = int(self.headers.get("Content-Length", 0))
        datos = parse_qs(self.rfile.read(longitud).decode("utf-8"))
        nombre = datos.get("nombre", [""])[0].strip()

        if not nombre:
                        self.responder(400, "Falta el nombre")
            return

        CONTACTOS.append(nombre)
        self.send_response(303)
        self.send_header("Location", "/contactos")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_DELETE(self):
                self.responder(405, "Aqui no se borra")


HTTPServer(("127.0.0.1", 8000), Agenda).serve_forever()
```

Hay cosas que reconoces del módulo de terminal. `parse_qs` es de `urllib`, y convierte `nombre=Marta+Gil&grupo=Trabajo` en un diccionario. Lo que quizá no esperabas es que **los valores de ese diccionario son listas**: `{"nombre": ["Marta Gil"]}`, porque un formulario puede mandar el mismo campo varias veces. De ahí ese `[""]` como valor por defecto y el `[0]` detrás.

Fíjate también en `BaseHTTPRequestHandler`: no hay ningún `if metodo == "GET"`, hay un método `do_GET` y un método `do_POST`. La clase mira el método de la petición y llama al `do_` que corresponda. Si llega un `PUT`, no hay `do_PUT` y contesta un `501` él solo. Es otra vez la inversión de control de la lección anterior.

Con el servidor en marcha, en otra terminal:

```bash
curl -i http://127.0.0.1:8000/contactos
```

```salida
HTTP/1.0 200 OK
Server: BaseHTTP/0.6 Python/3.14.7
Date: Tue, 22 Sep 2026 16:02:55 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 19

Ana Ruiz
Luis Pardo
```

Y los cuatro casos que interesan, pidiendo solo el código con `-w`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST -d "nombre=" http://127.0.0.1:8000/contactos
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://127.0.0.1:8000/contactos
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/otra
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://127.0.0.1:8000/agenda
```

```salida
400
405
404
301 -> http://127.0.0.1:8000/contactos
```

Las opciones de `curl` que vas a usar en todo el módulo son cinco: `-i` para ver las cabeceras, `-d` para mandar datos de formulario, `-L` para seguir las redirecciones, `-s` para que no dibuje la barra de progreso y `-o /dev/null -w` para quedarte solo con el dato que te interesa.

> [!aviso] `curl -X POST` se pega a la redirección
>
> Un detalle que cuesta una tarde la primera vez. Estas dos órdenes no hacen lo mismo:
>
> ```bash
> curl -s -L -X POST -d "nombre=Marta Gil" http://127.0.0.1:8000/contactos
> curl -s -L -d "nombre=Marta Gil" http://127.0.0.1:8000/contactos
> ```
>
> La primera responde `Falta el nombre` y la segunda devuelve la lista con Marta dentro. La diferencia es que `-X POST` **fuerza el método en todas las peticiones, incluidas las que vienen después de seguir una redirección**, así que al llegar el `303` vuelve a hacer un `POST`, esta vez sin datos, y se lleva el `400`. Sin `-X`, `curl` hace lo que manda el protocolo: un `GET`. El registro del servidor lo deja claro:
>
> ```salida
> "POST /contactos HTTP/1.1" 303
> "POST /contactos HTTP/1.0" 400
> ```
>
> La regla: **`-d` ya implica `POST`**, así que no pongas `-X POST` salvo que quieras forzarlo de verdad.

## Redirigir después de guardar

El `303` del ejemplo no está por capricho. Es el patrón más repetido de la web con formularios y en Django lo vas a escribir en cada vista que guarde algo.

El problema, si no se hace: el formulario manda un `POST` y el servidor contesta directamente con la página de resultado. Quien la mira tiene ahora en su navegador una página que es la respuesta a un `POST`. Si recarga, el navegador tiene que repetir la petición que produjo lo que está viendo, o sea el `POST`, y por eso sale el aviso de "¿quieres reenviar los datos del formulario?". Si le da a aceptar, el contacto se guarda dos veces. Si le da atrás y adelante, lo mismo. Y ese contacto duplicado no es culpa suya.

La solución son tres pasos y se conoce por sus iniciales en inglés, PRG:

1. Llega el `POST`, el servidor guarda.
2. El servidor **no** contesta con la página. Contesta con un `303` y una cabecera `Location`.
3. El navegador va solo a esa dirección con un `GET`, y esa sí es la página que se queda en el historial.

Al terminar, lo que hay en la barra de direcciones y en el historial es un `GET` inocente. Recargar lo repite sin consecuencias, que es justo el contrato de `GET`. En Django esto se escribe con una sola llamada, `redirect()`, y aparece en la lección de `Form`.

> [!nota] Cuál de los tres redirige
>
> `301`, `302` y `303` mandan a otro sitio, pero no dicen lo mismo.
>
> `301` es permanente, y **los navegadores se lo guardan**: la próxima vez ni siquiera te preguntan, van directos a la dirección nueva. Eso lo hace estupendo para una dirección que has cambiado de verdad y muy peligroso para probar, porque si te equivocas, el navegador de quien lo visitó sigue yendo al sitio equivocado aunque tú ya lo hayas arreglado, y limpiarlo obliga a vaciar la caché a mano.
>
> `302` es temporal y no se guarda.
>
> `303` es el de después de guardar, y el matiz es que **obliga a que la siguiente petición sea un `GET`**, pase lo que pase. Con `302` la norma dejaba margen y los navegadores antiguos hacían cosas distintas. Si vas a redirigir después de un `POST`, el correcto es el `303`.

## Lo que Django añade sin pedírselo

Merece la pena comparar la respuesta del servidor de arriba con la de un proyecto de Django recién creado. Las cabeceras de una y de otra:

```salida
Content-Type: text/html; charset=utf-8
X-Frame-Options: DENY
Content-Length: 12149
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

Las cuatro que no habías visto son protecciones, y van en todas las respuestas sin que nadie las pida. `X-Frame-Options: DENY` impide que otra web meta la tuya dentro de un marco invisible para engañar a quien pulsa. `X-Content-Type-Options: nosniff` le prohíbe al navegador adivinar el tipo de un fichero cuando la cabecera no le convence, que es por donde se colaba una imagen que en realidad era código. `Referrer-Policy` y `Cross-Origin-Opener-Policy` limitan lo que otras webs pueden averiguar de la tuya.

Ninguna de las cuatro es difícil de poner a mano. Lo difícil es saber que existen, acordarse de las cuatro y no olvidarse en la respuesta número treinta. Eso es, en concreto, lo que compras al usar un framework, y la razón por la que la lección anterior insistía en que la lista de problemas de una web es siempre la misma.

> [!resumen] En resumen
>
> Una petición HTTP son tres partes: una primera línea con el método y la ruta, unas cabeceras que la describen y un cuerpo opcional donde viajan los datos de un formulario. La respuesta tiene la misma forma, con un código en lugar del método. El método dice qué se quiere hacer, y la división que importa es si cambia algo o no: `GET` tiene que poder repetirse sin consecuencias, porque lo repiten el botón de recargar, el de atrás, los buscadores y media docena de programas que tú no controlas, así que nada que borre o modifique puede responder a `GET`. Un navegador solo genera `GET` y `POST` por su cuenta, y por eso una web clásica borra con un `POST` y no con un `DELETE`. El código de respuesta dice de quién es el problema: `4xx` de quien pregunta, `5xx` tuyo. Después de guardar no se contesta con la página, se contesta con un `303` y una cabecera `Location`, para que lo que quede en el historial sea un `GET` que se puede recargar sin duplicar nada. Y `curl` es la herramienta para ver todo esto de verdad, con `-i` para las cabeceras y `-d` para mandar un formulario, recordando que `-d` ya implica `POST` y que añadir `-X POST` fuerza el método también después de una redirección.

> [!ejercicio] Practica
>
> Todo con la biblioteca estándar y `curl`. Trabaja sobre `metodos.py`.
>
> 1. Arranca el servidor y provoca los cinco códigos que sabe dar: `200`, `301`, `303`, `400`, `404` y `405`. Apunta la orden de `curl` de cada uno.
> 2. Manda un `POST` con dos campos, `nombre` y `grupo`, e imprime en el servidor lo que devuelve `parse_qs` antes de tocarlo. Comprueba con tus ojos que los valores son listas.
> 3. Manda el mismo campo dos veces: `-d "nombre=Ana" -d "nombre=Luis"`. Mira qué tiene la lista ahora y qué contacto acaba guardándose.
> 4. Añade una dirección `/contactos/total` que conteste con el número de contactos, y haz que responda `405` si le llega un `POST`.
> 5. Haz que `GET /` devuelva una página con un formulario de verdad: `<form method="post" action="/contactos"><input name="nombre"><button>Guardar</button></form>`. Úsalo desde el navegador y comprueba que el `303` te deja en `/contactos`. Después quita el `303`, contesta directamente con la lista, repite la operación y recarga: mira qué te pregunta el navegador y cuántos contactos acabas teniendo.
> 6. Con `curl -i`, compara las cabeceras que devuelve tu servidor con las de cualquier web que uses. Busca cuáles de las cuatro protecciones del final de la lección están puestas.
