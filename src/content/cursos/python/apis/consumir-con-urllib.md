---
titulo: "Consumir APIs con la biblioteca estándar"
resumen: "Tres líneas para la primera petición, treinta para una que aguante, y la excepción que en realidad es una respuesta."
minutos: 14
orden: 4
---

Python trae `urllib.request` de serie, así que se puede hablar con una API sin instalar nada. Eso importa más de lo que parece: un guion de mantenimiento, una función en la nube o una imagen de contenedor mínima agradecen no tener dependencias.

Esta lección enseña a usarlo bien. Y de paso deja claro **por qué existe `requests`**, que es la siguiente: no porque `urllib` no funcione, sino por lo que cuesta usarlo correctamente.

> [!objetivo] Qué vas a aprender
>
> Hacer peticiones `GET` y `POST` con la biblioteca estándar, tratar los dos tipos de error que distingue, construir direcciones con parámetros sin romper nada, y conocer las tres cosas que `urllib` no hace por su cuenta y hay que recordar siempre.

## La primera petición

```python
import json
import urllib.request

with urllib.request.urlopen('https://api.github.com/repos/django/django') as respuesta:
        datos = json.load(respuesta)

print(datos['stargazers_count'])
```

```salida
91159
```

Tres líneas y funciona. Fíjate en dos cosas:

**`json.load` y no `json.loads`.** La respuesta se comporta como un fichero, así que se usa la función de ficheros. Con `json.loads(respuesta.read().decode())` también funciona y es más largo.

**El `with`.** La respuesta es un recurso abierto y hay que cerrarlo. Sin el `with`, la conexión se queda colgando hasta que el recolector de basura pase, que puede ser mucho después.

## Los dos errores

`urllib` distingue dos cosas, y la distinción es correcta:

```salida
HTTPError: 404 Not Found
  es un fichero?  True
  cuerpo:         Not Found
  cabeceras:      application/json; charset=utf-8

URLError: gaierror [Errno 8] nodename nor servname provided, or not known
```

**`HTTPError` es que el servidor contestó**, y contestó algo que no te gusta. Y aquí está el detalle que hay que entender: **esa excepción es también la respuesta**. Tiene código, cabeceras y cuerpo, y se puede leer:

```python
try:
        with urllib.request.urlopen(url) as respuesta:
                datos = json.load(respuesta)
except urllib.error.HTTPError as e:
        detalle = json.loads(e.read())['message']
```

Es raro como diseño y es muy útil, porque el cuerpo de un error suele explicar qué pasó, que es lo que vimos en la lección 2.

**`URLError` es que no hubo respuesta**: no se resolvió el dominio, no se pudo conectar, se cayó la red.

La diferencia importa para decidir: ante un `URLError` se reintenta, porque la red va y viene; ante un `HTTPError` de la familia `400` no se reintenta nunca.

> [!aviso] El orden de los `except` es al revés de lo que parece
>
> ```salida
> HTTPError hereda de URLError:  True
> URLError hereda de OSError:    True
> ```
>
> Así que esto **no funciona nunca** para el primer caso:
>
> ```python
> try:
>         with urllib.request.urlopen(url) as respuesta:
>                 datos = json.load(respuesta)
> except urllib.error.URLError:
>         reintentar()
> except urllib.error.HTTPError:      # nunca se llega aquí
>         mirar_el_cuerpo()
> ```
>
> La más específica va primero, siempre:
>
> ```python
> try:
>         with urllib.request.urlopen(url) as respuesta:
>                 datos = json.load(respuesta)
> except urllib.error.HTTPError as e:
>         detalle = e.read()
> except urllib.error.URLError as e:
>         reintentar()
> ```
>
> Y lo otro que se deduce de ahí: como todo acaba heredando de `OSError`, un `except OSError` bien colocado atrapa cualquier problema de red, que es lo que quieres en el nivel más alto de un guion.

## Parámetros en la dirección

El error clásico es pegar el valor a mano:

```salida
mal :  ...?q=lenguaje python & django
bien:  ...?q=lenguaje+python+%26+django
```

El primero está roto de tres maneras: los espacios no son válidos en una dirección, y el `&` **corta el valor** y convierte lo que viene detrás en otro parámetro.

Eso último no es solo un error de formato: si el valor lo escribe un usuario, ha conseguido añadir parámetros a tu petición. Con una API que acepte algo como `admin=true`, ahí hay un agujero.

La función correcta está en la biblioteca estándar:

```python
import urllib.parse

parametros = urllib.parse.urlencode({'q': termino, 'per_page': 50})
url = f'https://api.github.com/search/repositories?{parametros}'
```

Y su pareja para cuando el valor va dentro de la ruta en lugar de en la consulta:

```python
ruta = f'/repos/{urllib.parse.quote(propietario)}/{urllib.parse.quote(nombre)}'
```

## Un `POST` con JSON

Aquí es donde se nota que `urllib` es de bajo nivel. Todo esto hay que escribirlo:

```python
cuerpo = json.dumps({'titulo': 'Con eñe ñ', 'precio': '9.99'}).encode('utf-8')

peticion = urllib.request.Request(
    'https://httpbin.org/post',
    data=cuerpo,
    headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
    method='POST',
)

with urllib.request.urlopen(peticion, timeout=10) as respuesta:
        resultado = json.load(respuesta)
```

```salida
metodo: application/json | json recibido: {'precio': '9.99', 'titulo': 'Con eñe ñ'}
```

Cuatro cosas que hay que recordar y que no perdonan:

**`data` tiene que ser bytes**, no texto. Con texto sale un `TypeError`.

**Hay que codificar en UTF-8** explícitamente, o las eñes van a saber dónde.

**Hay que poner `Content-Type` a mano.** Sin ella, el servidor no sabe que es JSON e intenta leerlo como un formulario. Es el `400` sin explicación de la lección 2.

**`method=` es opcional pero conviene:**

```salida
Request(url, data=b'{}')  ->  get_method(): POST
Request(url)              ->  get_method(): GET
```

Poner `data` **implica `POST`**. Funciona, y escribir el método hace que se lea lo que hace, y es obligatorio para `PUT`, `PATCH` y `DELETE`.

## Las tres cosas que no hace

Estas son las que distinguen un guion que funciona de uno que aguanta.

**No pone tiempo de espera.**

```salida
socket.getdefaulttimeout(): None
con timeout=2 -> TimeoutError tras 2,3 s
```

Sin `timeout`, una petición a un servidor que acepta la conexión y no contesta **espera indefinidamente**. Es el mismo problema que la lección 38 del módulo anterior midió con el correo, y aquí es peor porque hablas con máquinas ajenas. En un guion nocturno eso es un proceso colgado que nadie ve.

**No pide compresión.**

```salida
Accept-Encoding: identity
```

Eso es lo que `urllib` manda de fábrica: "mándamelo sin comprimir". Y la diferencia es grande:

```salida
por defecto:     6125 bytes
pidiendo gzip:   1501 bytes   (cuatro veces menos)
```

Se puede pedir, y entonces hay que descomprimir a mano, porque `urllib` tampoco hace eso:

```python
peticion = urllib.request.Request(url, headers={'Accept-Encoding': 'gzip'})
with urllib.request.urlopen(peticion) as r:
        crudo = r.read()
    if r.headers.get('content-encoding') == 'gzip':
                crudo = gzip.decompress(crudo)
```

**Se presenta como un robot.**

```salida
User-Agent: Python-urllib/3.14
```

Muchas APIs **bloquean esa cadena directamente**, porque es la que usan los raspadores. GitHub la acepta; otras devuelven un `403` que no explica nada y te vuelve loco un rato.

La costumbre correcta, y que además es de buena educación, es identificarse:

```python
headers={'User-Agent': 'mi-proyecto/1.0 (contacto@ejemplo.es)'}
```

Así, si tu programa hace algo mal, quien administre la API sabe a quién escribir en lugar de bloquearte sin más.

> [!consejo] Envolverlo una vez
>
> Si vas a usar la biblioteca estándar, lo que se hace es escribir esta función una vez y no volver a pensar:
>
> ```python
> import gzip
> import json
> import urllib.error
> import urllib.parse
> import urllib.request
>
> AGENTE = 'mi-proyecto/1.0 (contacto@ejemplo.es)'
>
>
> def pedir_json(url, parametros=None, datos=None, metodo=None, timeout=10):
>         if parametros:
>                 url = f'{url}?{urllib.parse.urlencode(parametros)}'
>
>     cabeceras = {'Accept': 'application/json', 'Accept-Encoding': 'gzip',
>                  'User-Agent': AGENTE}
>     cuerpo = None
>     if datos is not None:
>                 cuerpo = json.dumps(datos).encode('utf-8')
>         cabeceras['Content-Type'] = 'application/json'
>
>     peticion = urllib.request.Request(url, data=cuerpo, headers=cabeceras,
>                                       method=metodo or ('POST' if datos else 'GET'))
>     with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
>                 crudo = respuesta.read()
>         if respuesta.headers.get('content-encoding') == 'gzip':
>                         crudo = gzip.decompress(crudo)
>         if not crudo:
>                         return None                      # el 204 de la lección 2
>         return json.loads(crudo)
> ```
>
> Veinticinco líneas para hacer lo que `requests.get(url).json()` hace en una, y **con menos**: esto todavía no reutiliza la conexión, no reintenta, no gestiona sesiones y trata los errores de forma tosca.
>
> Ese es el argumento de la lección siguiente, y también el argumento a favor de esto: **veinticinco líneas tuyas contra una dependencia**. Para un guion pequeño que va a vivir cinco años sin que nadie lo mantenga, las veinticinco líneas pueden ser la decisión correcta.

> [!nota] Lo que casi nadie sabe de `urllib`
>
> **Sigue las redirecciones solo**, hasta diez, y sin decírtelo. Si te interesa saber si hubo redirección, `respuesta.url` trae la dirección final, que puede no ser la que pediste.
>
> **Verifica los certificados desde Python 3.6.** Eso está bien. El código que anda por internet con `ssl._create_unverified_context()` para "arreglar" un error de certificado está desactivando la comprobación entera, que es como quitar la cerradura porque no encuentras la llave.
>
> **Tiene un sistema de manejadores** para autenticación, cookies y proxies, con `build_opener` y `HTTPBasicAuthHandler`. Es potente y bastante incómodo, y es otra de las cosas que `requests` resolvió.
>
> **No reutiliza la conexión.** Cada `urlopen` abre una conexión nueva, con su negociación de TLS. Para cien peticiones seguidas a la misma máquina, eso es mucho tiempo tirado, y es la diferencia más medible con la lección siguiente.

> [!resumen] En resumen
>
> La biblioteca estándar habla con una API en tres líneas, usando la función que lee JSON de un fichero porque la respuesta se comporta como tal, y dentro de un `with` para que la conexión se cierre. Distingue dos errores con una distinción acertada: uno significa que el servidor contestó algo que no te gusta, y esa excepción **es también la respuesta**, con su código, sus cabeceras y su cuerpo legible; el otro significa que no hubo respuesta. Como el primero hereda del segundo, el orden de los `except` tiene que ir de lo específico a lo general. Los parámetros de la dirección se construyen con la función que los codifica, porque pegarlos a mano rompe con los espacios y, con un ampersand, permite que un usuario añada parámetros a tu petición. Un `POST` con JSON exige recordar cuatro cosas: los datos en bytes, la codificación explícita, la cabecera que declara el formato y el método, que se deduce de que haya datos pero conviene escribir. Y hay tres cosas que no hace y hay que añadir siempre: no pone tiempo de espera, así que una petición puede colgarse para siempre; no pide compresión, y pedirla baja la respuesta de 6125 a 1501 bytes a cambio de descomprimirla a mano; y se presenta con una cadena de agente que varias APIs bloquean directamente.

> [!ejercicio] Practica
>
> 1. Pide un repositorio de GitHub y saca tres datos de la respuesta.
> 2. Pide uno que no exista y saca del error su código y el mensaje del cuerpo.
> 3. Pon los dos `except` en el orden equivocado y comprueba que el segundo no se ejecuta.
> 4. Construye una dirección con un término de búsqueda que lleve espacios y un ampersand, primero a mano y después con la función correcta.
> 5. Haz un `POST` con JSON contra `httpbin.org/post` y comprueba en el eco que llegó bien.
> 6. Quítale la cabecera que declara el formato y mira qué cambia en el eco.
> 7. Pide una dirección que tarde cinco segundos con y sin tiempo de espera de dos.
> 8. Compara los bytes de una respuesta pidiendo compresión y sin pedirla.
> 9. Mira qué agente manda `urllib` y cámbialo por uno que te identifique.
> 10. Escribe la función envoltorio y úsala para las dos primeras peticiones de esta lista.
