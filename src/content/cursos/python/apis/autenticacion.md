---
titulo: "Autenticación: claves, tokens y OAuth"
resumen: "Sesenta peticiones por hora contra cinco mil, el token que cualquiera puede leer, y el secreto que sobrevive a una redirección."
minutos: 16
orden: 7
---

Identificarse ante una API no es solo poder entrar en lo privado. En GitHub, el límite pasa de sesenta peticiones por hora a cinco mil:

```salida
sin identificarse: 60 peticiones/hora
identificado:      5000 peticiones/hora     (83 veces más)
```

Así que la primera razón para autenticarse suele ser **poder trabajar**, y no el acceso a nada secreto.

El problema es que hay cuatro sitios donde meter una credencial, media docena de esquemas con nombres parecidos, y un montón de formas de que el secreto acabe en un sitio donde no debería.

> [!objetivo] Qué vas a aprender
>
> Conocer los esquemas de autenticación que se encuentran en la práctica, saber dónde poner la credencial y por qué la dirección nunca es el sitio, entender qué es y qué no es un token JWT, y manejar OAuth sin perderse.

## Los cuatro sitios

Medidos contra un servidor de eco, con lo que llega al otro lado:

```salida
1  headers={'Authorization': 'Bearer secreto123'}  ->  Authorization: Bearer secreto123
2  auth=('ana', 'clave')                           ->  Authorization: Basic YW5hOmNsYXZl
3  headers={'X-API-Key': 'abc123'}                 ->  X-Api-Key: abc123
4  params={'api_key': 'abc123'}                    ->  ?api_key=abc123
```

**El cuarto está mal**, y esa es la primera regla de la lección. Una credencial en la dirección acaba en los registros del servidor, en los del repartidor de carga, en el historial del navegador y en la cabecera `Referer` que se manda al pinchar un enlace. Todos esos sitios se guardan durante años y los lee gente que no debería.

Algunas APIs solo ofrecen esa forma, y entonces no hay opción. Cuando ofrecen las dos, siempre la cabecera.

## Autenticación básica

Es la más antigua y sigue viva. `requests` la trae de serie:

```python
requests.get(url, auth=('ana', 'clave'))
```

Lo que manda:

```salida
Authorization: Basic YW5hOmNsYXZl
descodificado: ana:clave
```

**Eso no está cifrado. Es base64, que es una codificación reversible por cualquiera.** El usuario y la contraseña viajan a efectos prácticos en claro, y lo único que los protege es que la conexión sea HTTPS.

Sigue siendo aceptable en dos casos: sobre HTTPS y con una contraseña que sea un token generado, no la de la persona. Muchas APIs la usan así, poniendo el token de usuario y dejando la contraseña vacía.

> [!nota] Las otras dos clásicas
>
> **`Digest`** existe, evita mandar la contraseña haciendo un baile de resúmenes, y está obsoleta. `requests` la soporta con `HTTPDigestAuth` si te la encuentras en un equipo viejo.
>
> **Las firmas HMAC** son lo que usan las APIs donde importa mucho la integridad, como las de pagos y las de nube. No se manda la clave: se calcula un resumen de la petición entera —método, ruta, cuerpo, fecha— firmado con la clave secreta, y se manda el resultado. La clave nunca viaja, y como la fecha va en la firma, una petición copiada caduca.
>
> Es más complicado y hay bibliotecas que lo hacen. Lo que hay que saber es que, cuando la documentación habla de "firmar la petición", ahí está el motivo del `data=` crudo de la lección anterior: **la firma se calcula sobre los bytes exactos del cuerpo**, así que no puedes dejar que nadie los reordene.

## Tokens

Es lo normal hoy, y el esquema se llama `Bearer`, que significa "portador": quien lo lleva, entra. No hay nada más que comprobar.

```python
sesion.headers['Authorization'] = f'Bearer {token}'
```

Eso implica que **un token robado es acceso completo** hasta que caduque o lo revoquen, y de ahí salen las tres reglas prácticas: que caduquen, que se puedan revocar, y que nunca estén en el código.

Hay dos familias de tokens y se confunden constantemente.

**Tokens opacos.** Una cadena aleatoria que no significa nada. El servidor la busca en su base de datos y mira a quién pertenece. Ventaja: se revocan borrando una fila, al instante. Inconveniente: una consulta por petición.

**Tokens con contenido, los JWT.** Traen la información dentro y van firmados, así que el servidor los valida sin consultar nada.

## Qué es un JWT de verdad

Esto genera más confusión que ninguna otra cosa del tema, así que vamos a abrir uno:

```salida
trozos: 3

cabecera  {'alg': 'HS256', 'typ': 'JWT'}
carga     {'sub': '123', 'nombre': 'Ana', 'exp': 1790100000, 'rol': 'admin'}
firma     (lo único que lo protege)
```

**Tres trozos separados por puntos, y los dos primeros son base64 que cualquiera descodifica.** Ahí están el usuario, el nombre y el rol, legibles con tres líneas de Python y sin ninguna clave.

De ahí salen las dos consecuencias que hay que tener claras:

**Un JWT no está cifrado, está firmado.** La firma impide **modificarlo**, no leerlo. Nunca metas dentro nada que no quieras que se vea: ni contraseñas, ni datos personales de más, ni identificadores internos que revelen cosas.

**Un JWT no se puede revocar.** Es su gran inconveniente y el que la gente descubre tarde. Como el servidor lo valida solo con la firma, no consulta nada, y por tanto **no hay nada que borrar**. Si alguien roba un token con dos horas de vida, tiene dos horas de acceso y no puedes hacer nada.

Por eso el esquema habitual son dos tokens:

|  | Vida | Para qué |
| --- | --- | --- |
| De acceso | minutos | Va en cada petición |
| De refresco | días o semanas | Solo sirve para pedir uno de acceso nuevo |

El de acceso caduca enseguida, así que robarlo sirve de poco. El de refresco dura, y como solo se usa contra un punto concreto y **sí se guarda en la base de datos**, se puede revocar.

El `exp` de arriba, `1790100000`, es la fecha de caducidad en segundos desde 1970:

```salida
1790100000 = 2026-09-22 18:00:00+00:00
```

Comprobarla antes de mandar la petición, en lugar de esperar el `401`, ahorra una ida y vuelta:

```python
import time

def token_valido(carga, margen=60):
        return carga['exp'] - margen > time.time()
```

El margen es importante: si el token caduca dentro de dos segundos, la petición llegará caducada.

## OAuth

OAuth asusta por el diagrama, y la idea es sencilla: **dar permiso a un programa sin darle tu contraseña**.

Cuando una aplicación te pide entrar con Google y te lleva a una página de Google donde dice "esta aplicación quiere ver tu correo, ¿aceptas?", eso es OAuth. Tu contraseña se la das a Google, no a la aplicación, y la aplicación recibe un token limitado a lo que aceptaste.

Hay dos casos y es importante distinguirlos, porque casi todo lo que asusta es del segundo:

**Cuando el token es tuyo y ya está.** Entras en la web de la API, generas un token personal, lo copias. No hay flujo ni diagrama:

```python
sesion.headers['Authorization'] = f'Bearer {os.environ["TOKEN_GITHUB"]}'
```

Es lo que hace falta para un guion que trabaja con tu propia cuenta, que es el 90 % de los casos y desde luego el del proyecto de la lección 10.

**Cuando actúas en nombre de otros.** Ahí sí hay flujo, y el que se usa hoy es el de código de autorización:

1. Mandas al usuario a la página del proveedor, con tu identificador de aplicación y lo que quieres poder hacer.
2. El usuario se identifica **allí** y acepta.
3. El proveedor lo devuelve a tu dirección con un código de un solo uso.
4. Tu servidor cambia ese código por un token, usando además su clave secreta.

El paso 4 ocurre **entre servidores**, y por eso el código que viaja por el navegador no sirve de nada solo. Esa es toda la gracia del diseño.

> [!aviso] Las cuatro formas de filtrar un token
>
> **En el código.** El clásico. Un token en un repositorio es un token público, y borrarlo en un commit posterior **no lo borra**: sigue en el historial. Los rastreadores automáticos encuentran las claves de los repositorios públicos en minutos. Si pasa, lo único que vale es revocar.
>
> Se saca a variables de entorno, que es lo del módulo 4:
>
> ```python
> TOKEN = os.environ['TOKEN_API']     # sin valor por defecto, que falle si falta
> ```
>
> **En los registros.** Escribir la petición entera en el registro para depurar y dejarlo puesto.
>
> ```python
> registro.debug('Pidiendo %s con %s', url, cabeceras)    # ahí va el token
> ```
>
> **En la dirección**, que es el cuarto sitio del principio. Y aquí hay una diferencia medida que lo deja claro. `requests` **quita la cabecera de autenticación cuando una redirección lleva a otro dominio**:
>
> ```salida
> redirección a otro dominio:
>   con cabecera Authorization  ->  la cabecera NO llega    (bien)
>   con el secreto en la dirección  ->  ?api_key=SECRETO llega entero
> ```
>
> Esa protección es real y existe precisamente porque el caso ocurre. Pero **solo protege la cabecera**: si el secreto está en la dirección, viaja a donde vaya la dirección. Un enlace de redirección mal configurado puede mandar tu clave a un servidor ajeno.
>
> **En los mensajes de error.** Es lo de la lección 42 del módulo anterior, aquí desde el otro lado: si tu programa guarda la excepción con la petición dentro, o si una biblioteca escribe la dirección completa en un rastreador de errores, el token va con ella.

> [!consejo] El esquema que funciona
>
> ```python
> import os
> import time
> import requests
>
>
> class ClienteAPI:
>         def __init__(self, base='https://api.ejemplo.es/v1'):
>                 self.base = base
>         self.sesion = requests.Session()
>         self.sesion.headers['User-Agent'] = 'mi-proyecto/1.0 (contacto@ejemplo.es)'
>         self._token = None
>         self._caduca = 0
>
>     def _asegurar_token(self):
>                 if self._token and self._caduca - 60 > time.time():
>                         return
>         respuesta = requests.post(
>             f'{self.base}/token',
>             data={'grant_type': 'client_credentials'},      # formulario, no JSON
>             auth=(os.environ['API_ID'], os.environ['API_SECRETO']),
>             timeout=10,
>         )
>         respuesta.raise_for_status()
>         datos = respuesta.json()
>         self._token = datos['access_token']
>         self._caduca = time.time() + datos.get('expires_in', 3600)
>         self.sesion.headers['Authorization'] = f'Bearer {self._token}'
>
>     def get(self, ruta, **kwargs):
>                 self._asegurar_token()
>         respuesta = self.sesion.get(f'{self.base}{ruta}', timeout=(3.05, 15), **kwargs)
>         if respuesta.status_code == 401:
>                         self._token = None                # pudo caducar antes de tiempo
>             self._asegurar_token()
>             respuesta = self.sesion.get(f'{self.base}{ruta}', timeout=(3.05, 15), **kwargs)
>         respuesta.raise_for_status()
>         return respuesta.json()
> ```
>
> Cuatro decisiones que no son evidentes:
>
> **El token se pide con `data=` y no con `json=`.** El estándar de OAuth exige formulario, y es uno de los sitios donde la lección anterior se cobra la deuda.
>
> **Se renueva con sesenta segundos de margen**, no cuando ya caducó.
>
> **Se reintenta una vez ante un `401`**, porque los relojes no van sincronizados y un token puede caducar antes de lo que dice. Una sola vez, para no entrar en bucle.
>
> **Las credenciales salen del entorno sin valor por defecto**, así que el programa no arranca si faltan. Es lo de la lección 40 del módulo anterior.

> [!resumen] En resumen
>
> La primera razón para autenticarse suele ser la cuota y no el secreto: GitHub pasa de sesenta peticiones por hora a cinco mil. Hay cuatro sitios donde poner una credencial y el de la dirección está siempre mal, porque acaba en registros, historiales y cabeceras de procedencia. La autenticación básica manda usuario y contraseña en base64, que es codificación y no cifrado, así que lo único que la protege es HTTPS. Los tokens son lo normal hoy, con el esquema del portador: quien lo lleva entra, de modo que un token robado es acceso completo hasta que caduque. Los hay opacos, que se revocan borrando una fila, y los hay con contenido, los JWT, que son tres trozos y **los dos primeros cualquiera los lee**: están firmados, no cifrados, así que no se mete dentro nada privado; y como el servidor no consulta nada para validarlos, **no se pueden revocar**, que es lo que obliga al esquema de dos tokens, uno de acceso de minutos y otro de refresco que sí se guarda. OAuth es dar permiso a un programa sin darle tu contraseña, y tiene dos casos muy distintos: el token personal que copias de una web, que es el 90 % de los usos, y el flujo completo para actuar en nombre de otros, cuyo truco es que el último paso ocurre entre servidores. Y hay cuatro formas de filtrar un token: el código, los registros, la dirección y los mensajes de error; `requests` protege del tercero quitando la cabecera de autenticación al redirigir a otro dominio, pero un secreto puesto en la dirección sobrevive a esa redirección entero.

> [!ejercicio] Practica
>
> 1. Manda una credencial de las cuatro formas contra un servidor de eco y mira cómo llega cada una.
> 2. Descodifica la cabecera de autenticación básica y comprueba que se lee tal cual.
> 3. Genera un token personal en GitHub y compara tu límite de peticiones con y sin él.
> 4. Abre un JWT y descodifica sus dos primeros trozos.
> 5. Convierte su fecha de caducidad a una fecha legible.
> 6. Escribe la función que comprueba si un token está por caducar, con margen.
> 7. Provoca una redirección a otro dominio con la cabecera de autenticación puesta y comprueba que no llega.
> 8. Repite lo mismo con el secreto en la dirección y compara.
> 9. Saca un token del código a una variable de entorno y comprueba que el programa no arranca si falta.
> 10. Escribe la clase cliente que pide y renueva el token sola.
