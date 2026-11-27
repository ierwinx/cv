---
titulo: "requests desde cero"
resumen: "Veinticinco líneas convertidas en una, la sesión que va casi tres veces más rápido, y el `if respuesta:` que parece correcto y se traga los errores."
minutos: 15
orden: 5
---

La lección anterior acabó con una función de veinticinco líneas para hacer bien lo que `requests` hace así:

```python
requests.get(url, timeout=10).json()
```

`requests` no es la biblioteca estándar, y aun así es la respuesta correcta para casi todo. La usan Django, `pip` y medio Python. Esta lección enseña a usarla y, sobre todo, **las tres trampas que tiene precisamente por ser cómoda**: cuando algo es fácil, se escribe sin mirar.

> [!objetivo] Qué vas a aprender
>
> Hacer peticiones de todos los tipos con `requests`, entender por qué una sesión es casi tres veces más rápida, tratar los errores sabiendo que la biblioteca no lanza excepciones por su cuenta, y evitar las tres trampas que produce su comodidad.

## Lo que trae puesto

Lo primero que hace `requests` es arreglar los tres olvidos de la lección anterior. Estas son sus cabeceras de fábrica:

```salida
Accept: */*
Accept-Encoding: gzip, deflate, zstd
User-Agent: python-requests/2.34.2
```

**Pide compresión y descomprime sola:**

```salida
content-encoding: gzip
bytes por el cable: 1501  |  tras descomprimir: 6125
```

Cuatro veces menos tráfico sin escribir nada. Con `urllib` eso eran cinco líneas.

Lo del agente sigue igual de mal, y sigue conviniendo cambiarlo por algo que te identifique.

## Las peticiones

```python
import requests

requests.get(url, params={'q': 'django', 'per_page': 50}, timeout=10)
requests.post(url, json={'titulo': 'Hola'}, timeout=10)
requests.put(url, json={...}, timeout=10)
requests.patch(url, json={...}, timeout=10)
requests.delete(url, timeout=10)
```

`params=` codifica la consulta por ti, que era la función de la lección anterior. Y la respuesta trae todo lo que hace falta:

```python
respuesta.status_code     # 200
respuesta.headers         # un diccionario que no distingue mayúsculas
respuesta.json()          # el cuerpo ya analizado
respuesta.text            # el cuerpo como texto
respuesta.content         # el cuerpo como bytes
respuesta.url             # la dirección final, tras las redirecciones
respuesta.elapsed         # cuánto tardó
```

> [!aviso] `json=` y `data=` no son lo mismo
>
> Es el error más frecuente de quien empieza, y la diferencia es invisible hasta que el servidor se queja:
>
> ```salida
> json={'a': 'ñ'}  ->  Content-Type: application/json                   json: {'a': 'ñ'}
> data={'a': 'ñ'}  ->  Content-Type: application/x-www-form-urlencoded  form: {'a': 'ñ'}
> ```
>
> **`json=`** convierte a JSON y pone la cabecera correspondiente. Es lo que quiere una API.
>
> **`data=`** manda un formulario de toda la vida, el mismo del módulo 4. El servidor lo recibe como campos de formulario, así que una API que espera JSON encuentra el cuerpo vacío y responde `400`.
>
> `data=` también acepta una cadena o bytes, y entonces los manda tal cual sin poner ninguna cabecera, que es lo que hay que usar cuando necesitas controlar el cuerpo exacto: por ejemplo, para firmar la petición.

## La sesión

Esta es la diferencia que más se nota y la que casi nadie usa. Ocho peticiones seguidas a la misma máquina:

```salida
urllib                8 peticiones: 3,46 s  (433 ms cada una)
requests.get          8 peticiones: 3,27 s  (409 ms)
requests.Session      8 peticiones: 1,30 s  (162 ms)   <- 2,7 veces más rápido
```

Fíjate en que `requests.get` suelto **no es más rápido que `urllib`**: las dos abren una conexión nueva cada vez, con su negociación de TLS, que es lo que se lleva los 250 milisegundos de diferencia.

Una `Session` mantiene la conexión abierta y la reutiliza:

```python
with requests.Session() as sesion:
        sesion.headers['User-Agent'] = 'mi-proyecto/1.0 (contacto@ejemplo.es)'
    sesion.headers['Accept'] = 'application/vnd.github+json'

    for nombre in repositorios:
                datos = sesion.get(f'https://api.github.com/repos/{nombre}', timeout=10).json()
```

Y además de la velocidad, **guarda las cabeceras y las cookies**, así que las de autenticación se ponen una vez y valen para todas. Eso es lo que hace que la sesión sea el objeto natural cuando escribes un cliente de una API, que es el proyecto de la lección 10.

La regla es sencilla: **más de una petición, sesión**.

## Los errores

Aquí está la trampa principal, y es de diseño:

```python
respuesta = requests.get('https://api.github.com/repos/django/no-existe-xyz')
```

**Eso no lanza ninguna excepción.** Devuelve una respuesta con `status_code` 404 y sigue como si nada. `requests` considera que un `404` es una respuesta legítima del servidor, y tiene razón, y el resultado es que el código que no comprueba nada continúa con un cuerpo de error entre las manos.

La comprobación es una línea:

```python
respuesta.raise_for_status()
```

```salida
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: https://api.github.com/...
```

Ponla **siempre**, salvo cuando estés tratando el código a mano.

> [!aviso] `if respuesta:` no hace lo que parece
>
> Esto es lo que más engaña de toda la biblioteca:
>
> ```salida
> status_code:   404
> bool(r):       False      <- bien, el objeto respuesta es falso
> r.json():      True       <- el diccionario de error NO es vacío
> ```
>
> El objeto respuesta define su valor de verdad según el código, así que `if respuesta:` **sí funciona**. El problema es que se parece demasiado a esto, que no funciona:
>
> ```python
> datos = requests.get(url).json()
> if datos:                          # un {"message": "Not Found"} es verdadero
>         procesar(datos)
> ```
>
> Y sobre todo, `if respuesta:` tiene un defecto grave aunque funcione: **no dice por qué falló**. El que se equivoca no se entera de nada.
>
> La forma correcta es siempre la misma y tiene tres pasos:
>
> ```python
> respuesta = sesion.get(url, timeout=10)
> respuesta.raise_for_status()        # 1. explota si el código es malo
> datos = respuesta.json()            # 2. analiza
> if not isinstance(datos, dict):     # 3. comprueba la forma (lección 3)
>         raise ValueError('Esperaba un objeto')
> ```

Las excepciones que sí lanza están bien organizadas:

```salida
HTTPError          <- RequestException <- OSError
ConnectionError    <- RequestException <- OSError
Timeout            <- RequestException <- OSError
ConnectTimeout     <- ConnectionError <- Timeout
ReadTimeout        <- Timeout <- RequestException
TooManyRedirects   <- RequestException <- OSError
JSONDecodeError    <- InvalidJSONError <- RequestException
```

Lo práctico de esa jerarquía es que **todo cuelga de `RequestException`**, así que un guion se protege entero con un solo `except`:

```python
try:
        respuesta = sesion.get(url, timeout=(3, 10))
    respuesta.raise_for_status()
except requests.RequestException as e:
        registro.error('Falló la petición: %s', e)
```

Y fíjate en `ConnectTimeout`, que hereda de las dos cosas a la vez. Eso está pensado: agotar el tiempo al conectar es un problema de conexión y es un tiempo de espera, y así lo atrapan los dos `except`.

## El tiempo de espera

```salida
timeout por defecto: None
```

**`requests` no pone tiempo de espera.** Igual que `urllib`. Es la crítica más repetida a la biblioteca y no la van a cambiar, porque rompería código ajeno.

Y aquí es peor, porque es tan cómoda que se escribe `requests.get(url)` sin pensar, y eso es un programa que se puede quedar colgado para siempre contra un servidor ajeno que acepta la conexión y no contesta.

El parámetro admite dos números, que es lo que conviene usar:

```python
requests.get(url, timeout=(3, 10))
```

```salida
timeout=(conexión 3, lectura 1) -> ReadTimeout tras 1,3 s
```

El primero es cuánto esperar a conectar, el segundo cuánto esperar **entre trozos** de la respuesta. Separarlos permite ser estricto con la conexión, que o va rápido o no va, y generoso con la lectura, que puede tardar si la respuesta es grande.

> [!consejo] La sesión que deberías copiar
>
> Esto junta todo lo de la lección y es lo que se escribe una vez por proyecto:
>
> ```python
> import requests
> from requests.adapters import HTTPAdapter
> from urllib3.util.retry import Retry
>
> TIEMPOS = (3.05, 15)
>
>
> def crear_sesion(token=None):
>         sesion = requests.Session()
>     sesion.headers.update({
>         'Accept': 'application/vnd.github+json',
>         'User-Agent': 'mi-proyecto/1.0 (contacto@ejemplo.es)',
>     })
>     if token:
>                 sesion.headers['Authorization'] = f'Bearer {token}'
>
>     reintentos = Retry(
>         total=3,
>         backoff_factor=0.5,
>         status_forcelist=(429, 500, 502, 503, 504),
>         allowed_methods=frozenset({'GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'}),
>         respect_retry_after_header=True,
>     )
>     sesion.mount('https://', HTTPAdapter(max_retries=reintentos))
>     return sesion
> ```
>
> Tres detalles que no son evidentes:
>
> **`3.05` y no `3`.** Es la recomendación de la propia documentación: un poco más que un múltiplo de tres, porque así lo quiere el temporizador de reintentos de TCP.
>
> **`allowed_methods` no incluye `POST`.** Es la idempotencia de la lección 2 aplicada: reintentar un `POST` puede crear dos pedidos.
>
> **`respect_retry_after_header`** hace que, cuando la API diga cuánto esperar tras un `429`, se le haga caso en vez de inventarse un tiempo. Todo esto es la lección 8, y aquí está el atajo.

> [!nota] Detalles que aparecen tarde
>
> **`r.text` adivina la codificación, `r.content` no.** Cuando la cabecera trae el juego de caracteres, `requests` lo usa; cuando no, lo adivina, y adivinar puede salir mal con textos en español donde las eñes son pocas:
>
> ```salida
> encoding detectado: utf-8   (de la cabecera)
> apparent_encoding : ascii   (adivinado)
> ```
>
> Si sabes la codificación, dísela: `r.encoding = 'utf-8'` antes de leer `r.text`. Y si vas a analizar JSON, usa `r.json()`, que aplica las reglas del formato y no adivina.
>
> **`r.json()` acepta los mismos parámetros que el módulo.** Así que el gancho de los decimales de la lección 3 vale aquí:
>
> ```python
> respuesta.json(parse_float=decimal.Decimal)
> ```
>
> **Para respuestas grandes, `stream=True`.** Sin él, `requests` carga el cuerpo entero en memoria antes de devolverte nada. Con él, `r.iter_content(8192)` va sirviendo trozos, que es lo que se usa para descargar ficheros.
>
> **`verify=False` no es la solución de nada.** Aparece en todas las respuestas de internet sobre errores de certificado, y desactiva la comprobación entera. Si el certificado es de una autoridad interna, lo correcto es `verify='/ruta/al/ca.pem'`.
>
> **`httpx` es la alternativa moderna.** Tiene prácticamente la misma interfaz, soporta HTTP/2 y funciona con `async`. Si tu programa va a hacer cientos de peticiones en paralelo, merece una mirada; para todo lo demás, `requests` sigue siendo lo que hay en todas partes.

> [!resumen] En resumen
>
> `requests` hace en una línea lo que la biblioteca estándar necesita veinticinco, y además pide compresión y descomprime sola, bajando la respuesta de 6125 a 1501 bytes por el cable. Manda los datos con el parámetro de JSON, que no debe confundirse con el de formulario: el primero convierte y pone la cabecera correcta, el segundo manda campos de formulario y una API que espera JSON responderá `400`. La mejora más grande es la sesión: ocho peticiones tardan 3,27 segundos sueltas y 1,30 con sesión, casi tres veces menos, porque reutiliza la conexión en vez de negociar TLS cada vez, y de paso guarda las cabeceras de autenticación; la regla es que más de una petición pide sesión. La biblioteca **no lanza excepciones por códigos de error**, así que un `404` sigue adelante silenciosamente y hay que llamar al método que convierte el código en excepción, siempre; y aunque el objeto respuesta sí sea falso ante un error, comprobarlo así no dice por qué falló. Las excepciones que sí lanza cuelgan todas de una común, lo que permite proteger un guion entero con un `except`. Y, como la estándar, **no pone tiempo de espera por defecto**, cosa que aquí es peor porque la comodidad invita a olvidarlo; el parámetro admite dos números, uno para conectar y otro para leer.

> [!ejercicio] Practica
>
> 1. Repite con `requests` las dos primeras peticiones de la lección anterior y cuenta las líneas.
> 2. Comprueba qué cabeceras manda de fábrica y cámbialas por unas que te identifiquen.
> 3. Cronometra ocho peticiones sueltas y ocho con sesión contra la misma API.
> 4. Manda un `POST` con el parámetro de JSON y otro con el de formulario, y compara el eco.
> 5. Pide algo que no exista y comprueba que no salta ninguna excepción.
> 6. Añade la llamada que convierte el código en excepción y mira el mensaje.
> 7. Escribe el fallo de comprobar el cuerpo en vez del código, y provócalo.
> 8. Pide una dirección lenta con los dos números del tiempo de espera y mira cuál salta.
> 9. Protege un guion entero con un solo `except` de la excepción común.
> 10. Escribe la función que crea la sesión con reintentos y úsala para diez peticiones.
