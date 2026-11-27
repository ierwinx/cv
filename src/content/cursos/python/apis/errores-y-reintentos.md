---
titulo: "Errores y reintentos"
resumen: "El reintentador que no reintenta, el primer reintento que no espera nada, y la excepción que te esconde el cuerpo del error."
minutos: 15
orden: 8
---

Un programa que habla con una API ajena falla. No es una posibilidad: la red se cae, el servidor se reinicia, el proveedor tiene un mal día. Con una petición al mes da igual; con diez mil al día, algo falla todos los días.

Esta lección va de que el programa sobreviva a eso. Y la parte importante es que **la mitad de los reintentadores que se escriben no reintentan nada**, porque la configuración por defecto de la herramienta que todo el mundo usa no hace lo que parece.

> [!objetivo] Qué vas a aprender
>
> Distinguir qué errores se reintentan y cuáles no, configurar reintentos automáticos correctamente, entender la espera exponencial y por qué necesita azar, y saber qué pasa cuando los reintentos se agotan.

## Qué se reintenta

La clasificación viene de la lección 2 y se concreta aquí:

| Situación | ¿Reintentar? | Por qué |
| --- | --- | --- |
| No resuelve el dominio | Sí, con calma | El DNS falla a ratos |
| Conexión rechazada | Sí | El servidor puede estar reiniciándose |
| Tiempo de espera al conectar | Sí | Es idempotente: no llegó nada |
| Tiempo de espera al leer | **Depende del método** | Pudo llegar y procesarse |
| `429` | Sí, **esperando lo que digan** | Te has pasado de cuota |
| `500` `502` `503` `504` | Sí | El problema es suyo y puede pasar |
| `501` `505` | No | No lo van a implementar en dos segundos |
| `400` `401` `403` `404` `422` | **No** | Fallará igual la segunda vez |

Las dos filas que hay que mirar dos veces:

**El tiempo de espera al leer es el caso difícil.** Conectaste, mandaste la petición y no llegó respuesta a tiempo. **No sabes si se procesó.** Con un `GET` da igual. Con un `POST` que crea un pedido, reintentar puede cobrar dos veces, y es la idempotencia de la lección 2 decidiendo por ti.

**El `403` a veces sí.** Varias APIs, GitHub entre ellas, usan `403` en lugar de `429` para el límite de uso. Hay que mirar el cuerpo o las cabeceras de cuota para distinguir "no puedes" de "ahora no".

## Los reintentos automáticos

`requests` no reintenta nada por su cuenta, y no debería. Lo que se monta es esto:

```python
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

reintentos = Retry(total=3, backoff_factor=0.5)
sesion.mount('https://', HTTPAdapter(max_retries=reintentos))
```

Y eso, tal cual, **no hace nada útil**:

```salida
GET a una dirección que devuelve 503:
  devolvió 503 tras 0,4 s   <- sin reintentar
```

Un solo viaje. Porque `Retry` por defecto solo reintenta **errores de conexión**, no códigos de respuesta. Un `503` es una respuesta perfectamente entregada, así que no entra.

Hace falta decir qué códigos cuentan:

```python
reintentos = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=(429, 500, 502, 503, 504),
)
```

```salida
GET a una dirección que devuelve 503:
  tras 3,7 s -> RetryError    <- ahora sí, cuatro intentos
```

**Esta es la línea que falta en casi todo el código que anda por ahí.** Es un fallo silencioso perfecto: el reintentador está puesto, se ve en el código, y no reintenta.

## La espera exponencial

Reintentar inmediatamente contra un servidor que se está ahogando es empeorarlo. Así que se espera, y cada vez más:

```salida
backoff_factor=0.5:  [0, 1, 2, 4,  8, 16, 32]
backoff_factor=1:    [0, 2, 4, 8, 16, 32, 64]
backoff_factor=2:    [0, 4, 8, 16, 32, 64, 120]
```

Dos cosas que sorprenden.

**El primer reintento no espera nada.** Es cero, siempre. La idea es que un fallo aislado —un paquete perdido— se arregla al instante y no merece penalización. Pero significa que el primer golpe **es inmediato**, y por tanto `total=1` no da ninguna espera.

**El tope son 120 segundos** por defecto. Con factor 2 y siete reintentos, el último se queda en 120 en vez de 128.

Elegir el factor es elegir cuánto aguantas esperando. Con `total=3` y factor `0.5`, un fallo persistente cuesta tres segundos de espera más cuatro viajes de red. Con factor `2`, son doce segundos. Para un guion nocturno, generoso; para algo que atiende a una persona esperando, mínimo.

> [!aviso] Sin azar, todos vuelven a la vez
>
> Si tu API se cae un momento y tienes cuarenta procesos hablando con ella, los cuarenta fallan a la vez, los cuarenta esperan **exactamente** lo mismo, y los cuarenta vuelven en el mismo instante:
>
> ```salida
> jitter=0:    cuatro clientes esperarían [4.0,  4.0,  4.0,  4.0 ]
> jitter=1.0:  cuatro clientes esperarían [4.11, 4.96, 4.16, 4.54]
> ```
>
> Eso se llama estampida, y es la forma de que un servidor que se estaba recuperando se vuelva a caer, esta vez por tu culpa. Cada oleada llega más sincronizada que la anterior.
>
> Se arregla añadiendo un poco de azar a la espera:
>
> ```python
> Retry(total=3, backoff_factor=0.5, backoff_jitter=1.0, status_forcelist=(...))
> ```
>
> Y **no viene puesto por defecto**, así que hay que acordarse. Da igual con un proceso; es imprescindible en cuanto hay varios, y en un servidor web con varios trabajadores ya los hay.

## Qué métodos se reintentan

```salida
allowed_methods por defecto: DELETE, GET, HEAD, OPTIONS, PUT, TRACE
```

**`POST` y `PATCH` no están, y está bien.** Es exactamente la tabla de idempotencia de la lección 2: reintentar un `POST` puede crear dos cosas.

Si necesitas reintentar un `POST` —y a veces hace falta, porque un fallo de conexión antes de enviar es seguro de reintentar— la forma correcta no es meterlo en la lista, es usar una clave de idempotencia, que también es de la lección 2:

```python
sesion.post(url, json=datos, headers={'Idempotency-Key': str(uuid.uuid4())})
```

Con la clave generada **fuera** del bucle de reintentos, para que los tres intentos manden la misma.

## Cuando se agotan

Aquí hay un comportamiento que despista mucho:

```salida
tras 3,7 s -> RetryError
  HTTPSConnectionPool(host='...'): Max retries exceeded with url: /status/503
```

Cuando se agotan los reintentos por código de estado, **no recibes la respuesta: recibes una excepción**. Y eso tiene dos consecuencias molestas:

**Tu `raise_for_status()` nunca se ejecuta**, así que el `except requests.HTTPError` que tenías escrito no atrapa nada. Hay que atrapar `RetryError`, que es hermana suya, no hija.

**No puedes leer el cuerpo del error.** Que es justo donde la API explicaba qué pasó, según la lección 2. El mensaje de la excepción solo dice cuántas veces lo intentó.

Se puede pedir el otro comportamiento:

```python
Retry(..., raise_on_status=False)
```

```salida
ahora devuelve la respuesta: 503  |  se puede leer el cuerpo
```

Así los reintentos ocurren igual, y al agotarse te entregan la última respuesta para que la trates tú. **Es lo que conviene casi siempre**, porque conserva la información y deja el tratamiento de errores en un solo estilo:

```python
respuesta = sesion.get(url, timeout=(3.05, 15))   # ya reintentó por dentro
respuesta.raise_for_status()                      # y esto sigue funcionando
```

> [!consejo] Lo que el reintentador no cubre
>
> `Retry` es para lo genérico. Hay tres cosas que hay que poner a mano.
>
> **Respetar lo que te digan.** Ante un `429`, la API suele decir cuánto esperar:
>
> ```salida
> Retry-After: 30
> ```
>
> Buena noticia: `respect_retry_after_header` vale `True` por defecto, así que `Retry` le hace caso. Lo que no cubre son las cabeceras propias, como las de cuota de GitHub, que dicen cuándo se reinicia el contador **antes** de que te pases. Eso es la lección 9, y es mejor que reintentar: es no fallar.
>
> **El cortacircuitos.** Si la API lleva cinco minutos caída, seguir intentando es tirar tiempo. El patrón es contar fallos seguidos y, pasado un umbral, dejar de intentarlo durante un rato y fallar al instante:
>
> ```python
> class Cortacircuitos:
>         def __init__(self, umbral=5, descanso=60):
>                 self.umbral, self.descanso = umbral, descanso
>         self.fallos, self.abierto_hasta = 0, 0
>
>     def comprobar(self):
>                 if time.time() < self.abierto_hasta:
>                         raise RuntimeError('La API está caída; no lo intento')
>
>     def registrar(self, hubo_fallo):
>                 if hubo_fallo:
>                         self.fallos += 1
>             if self.fallos >= self.umbral:
>                                 self.abierto_hasta = time.time() + self.descanso
>         else:
>                         self.fallos = 0
> ```
>
> **Ser idempotente tú también.** Si tu proceso importa mil registros y falla en el 700, tiene que poder volver a empezar sin duplicar los 699 anteriores. Eso no lo arregla ninguna biblioteca: se arregla guardando por dónde ibas, o haciendo que insertar dos veces lo mismo sea inofensivo.

> [!nota] Registrar bien los fallos
>
> Cuando algo falla a las tres de la mañana, lo único que tienes es lo que escribiste en el registro. Tres reglas.
>
> **El mensaje de la excepción, no su tipo.** `ConnectionError` no dice nada; el texto dice a qué máquina y por qué.
>
> **La dirección sin credenciales.** Es la cuarta forma de filtrar un token de la lección anterior. Si el secreto va en la dirección, no escribas la dirección.
>
> **El código y el cuerpo, recortado.** El cuerpo es donde la API explica el problema, y por eso conviene `raise_on_status=False`:
>
> ```python
> try:
>         respuesta = sesion.get(url, timeout=(3.05, 15))
>     respuesta.raise_for_status()
> except requests.HTTPError as e:
>         registro.error('La API contestó %s: %s', e.response.status_code,
>                    e.response.text[:200])
> except requests.RequestException as e:
>         registro.error('No se pudo llamar a la API: %s', e)
> ```
>
> Los dos `except` y en ese orden: el primero para cuando hubo respuesta y el segundo para cuando no, que es la misma distinción que hacía `urllib` en la lección 4.

> [!resumen] En resumen
>
> Lo que se reintenta y lo que no sale de una tabla sencilla —los errores de conexión y los `5xx` sí, los `4xx` no—, con dos casos que hay que mirar dos veces: un tiempo de espera al leer no dice si la petición se procesó, así que la decisión la toma la idempotencia del método; y varias APIs usan `403` en lugar de `429` para el límite de uso. El reintentador que todo el mundo monta **no reintenta códigos de respuesta si no se le da la lista explícita**, de modo que la configuración habitual está puesta y no hace nada, que es un fallo silencioso perfecto. La espera crece exponencialmente con dos sorpresas: el primer reintento espera cero, y hay un tope de 120 segundos. Sin azar en la espera, todos los procesos vuelven en el mismo instante y tiran el servidor que se estaba recuperando, y el azar no viene puesto por defecto. Los métodos que se reintentan de fábrica excluyen `POST` y `PATCH`, que es la idempotencia aplicada, y cuando hace falta reintentar una creación lo correcto es una clave de idempotencia generada fuera del bucle. Al agotarse los reintentos se recibe una excepción en lugar de la respuesta, lo que impide leer el cuerpo donde la API explicaba el problema y esquiva el tratamiento de errores que ya tenías escrito; se corrige pidiendo que no lance y tratando la última respuesta a mano. Y el reintentador no cubre tres cosas que van aparte: hacer caso a las cabeceras de cuota, el cortacircuitos que deja de intentarlo cuando la API lleva rato caída, y que tu propio proceso pueda volver a empezar sin duplicar.

> [!ejercicio] Practica
>
> 1. Monta un reintentador con la configuración mínima y comprueba contra un `503` que no reintenta.
> 2. Añade la lista de códigos y cronometra la diferencia.
> 3. Calcula las esperas de tres factores distintos y comprueba que la primera es cero.
> 4. Compara las esperas de cuatro clientes con y sin azar.
> 5. Mira qué métodos se reintentan por defecto y razona por qué falta uno.
> 6. Deja que se agoten los reintentos e intenta leer el cuerpo del error.
> 7. Repite con la opción que devuelve la respuesta en lugar de lanzar, y compara.
> 8. Escribe los dos `except` que distinguen "contestó mal" de "no contestó".
> 9. Implementa el cortacircuitos y pruébalo contra una dirección que siempre falla.
> 10. Clasifica en una tabla los diez errores más probables de una API que uses, y decide para cada uno si reintentar.
