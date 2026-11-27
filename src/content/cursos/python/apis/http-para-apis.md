---
titulo: "HTTP para APIs"
resumen: "Los códigos que de verdad devuelven, el cuerpo de error que cada API se inventa por su cuenta, y la petición que ahorra seis mil bytes y gasta cuota igual."
minutos: 15
orden: 2
---

La lección 2 del módulo anterior explicó HTTP desde el lado del navegador: los métodos, los códigos, y por qué después de guardar se redirige. Todo eso sigue valiendo.

Lo que cambia al hablar con una API es quién está al otro lado. Un navegador perdona: si algo falla, enseña una página y una persona decide qué hacer. **Un programa no perdona nada**: si no entiende la respuesta, revienta o, peor, sigue con datos equivocados. Por eso al consumir una API hay que tomarse en serio tres cosas que en el navegador daban igual.

> [!objetivo] Qué vas a aprender
>
> Interpretar los códigos de respuesta desde el lado del cliente, saber que el cuerpo de error no tiene formato estándar y cómo protegerse de eso, usar la negociación de contenido, y ahorrar tráfico con peticiones condicionales sabiendo lo que ahorran y lo que no.

## Los códigos, desde el otro lado

En el módulo anterior los códigos eran algo que tú devolvías. Ahora son algo que **recibes y tienes que decidir qué hacer**, y eso los agrupa distinto:

| Código | Qué significa para ti | Qué hacer |
| --- | --- | --- |
| `200` | Aquí están los datos | Leer el cuerpo |
| `201` | Creado | Leer `Location` y el cuerpo |
| `204` | Hecho, sin nada que devolver | **No leas el cuerpo, está vacío** |
| `301` `308` | Esto se ha movido | Actualiza tu dirección |
| `304` | No ha cambiado desde tu última visita | Usa lo que ya tenías |
| `400` | Tu petición está mal formada | Arregla el código, no reintentes |
| `401` | No sé quién eres | Identifícate |
| `403` | Sé quién eres y no puedes | No reintentes; mira si es el límite |
| `404` | Eso no existe | Depende: ¿es un error o un caso normal? |
| `409` | Choca con el estado actual | Vuelve a leer y decide |
| `422` | Está bien formada pero los datos no valen | Enseña los errores al usuario |
| `429` | Demasiadas peticiones | **Espera y reintenta** |
| `5xx` | El problema es suyo | Reintenta con paciencia |

La división que importa no es `4xx` contra `5xx`, es otra: **qué se puede reintentar y qué no**.

Reintentar un `400` es absurdo: tu petición estará igual de mal la segunda vez. Reintentar un `503` es lo correcto, porque puede que en dos segundos ya no falle. Y `429` no solo se puede reintentar, es que hay que hacerlo, esperando lo que te digan. Eso es la lección 8.

Dos que despistan:

**`204` no trae cuerpo.** Intentar leerlo como JSON es un error clásico, y no falla hasta que alguien borra algo:

```salida
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

**`404` no siempre es un error.** Preguntar si existe un usuario y recibir `404` es una respuesta perfectamente útil. Tratarlo siempre como excepción es lo que llena los registros de ruido.

## El cuerpo de error se lo inventa cada uno

Esto es lo que más sorprende, y conviene verlo con datos reales. Mismo tipo de error —algo que no existe o no se puede— en tres APIs distintas:

```json
// GitHub
{
  "message": "Not Found",
  "documentation_url": "https://docs.github.com/rest/repos/repos#get-a-repository",
  "status": "404"
}
```

```json
// Open-Meteo
{"error": true, "reason": "Latitude must be in range of -90 to 90°. Given: 999.0."}
```

```json
// JSONPlaceholder
{}
```

**Tres formatos distintos, y ninguno es el estándar, porque no hay estándar.** Uno usa `message`, otro `reason`, el tercero no dice nada y te deja solo con el `404`.

Consecuencias prácticas:

**El código de estado es lo único fiable.** Es lo que está en el protocolo. El cuerpo es una cortesía.

**Leer el cuerpo de error es siempre defensivo.** Nunca `datos['message']` a secas, porque con la tercera API eso es un `KeyError` encima del error que ya tenías:

```python
def motivo(respuesta):
        try:
                datos = respuesta.json()
    except ValueError:
                return respuesta.text[:200] or f'HTTP {respuesta.status_code}'
    if isinstance(datos, dict):
                for clave in ('message', 'reason', 'error', 'detail', 'error_description'):
                        if isinstance(datos.get(clave), str):
                                return datos[clave]
    return f'HTTP {respuesta.status_code}'
```

Feo, y es lo que hay. Esa función se escribe una vez por API con la que trabajas y se reutiliza.

Y fíjate en el `documentation_url` de GitHub, que es un detalle de buen diseño: el error **trae el enlace a la página que lo explica**. Es lo que hay que copiar al escribir la propia, que es el bloque B.

> [!aviso] El fallo que no da error
>
> El peor caso no es un error mal leído: es una respuesta que parece buena y no lo es.
>
> ```python
> datos = respuesta.json()
> for articulo in datos['articulos']:
>         ...
> ```
>
> Si la API devolvió un `403` con `{"message": "..."}`, eso no es un fallo de red ni una excepción: es un diccionario perfectamente válido que no tiene la clave `articulos`. Con suerte sale un `KeyError` en el sitio equivocado; sin suerte, la clave existe y está vacía, y tu programa decide que hoy no hay artículos y borra la caché.
>
> **La regla es mirar el código antes de mirar el cuerpo. Siempre.** Con `requests` es una línea, y es la lección 5:
>
> ```python
> respuesta.raise_for_status()
> ```
>
> Y el motivo de que esto se olvide tanto: en desarrollo todo devuelve `200`, así que el código que no comprueba nada funciona perfectamente hasta el día que no.

## Negociación de contenido

La cabecera `Accept` dice en qué formato quieres la respuesta, y algunas APIs la usan de verdad. Misma dirección, tres formatos:

```salida
Accept: application/json                   -> application/json; charset=utf-8
Accept: application/vnd.github.raw+json    -> application/vnd.github.raw+json; charset=utf-8
Accept: application/vnd.github.html+json   -> application/vnd.github.html+json; charset=utf-8
```

La misma dirección del fichero léeme devuelve los metadatos, el texto tal cual o el texto ya convertido a HTML, **según lo que pidas**.

Eso de `vnd.github` es un tipo propio de GitHub. Muchas APIs lo usan también para versionar, pidiendo `application/vnd.ejemplo.v2+json`, que es una alternativa a poner el número en la dirección.

Y su pareja, que se confunde constantemente:

| Cabecera | Quién la manda | Qué dice |
| --- | --- | --- |
| `Accept` | El cliente | Qué formato quiero recibir |
| `Content-Type` | Quien manda un cuerpo | En qué formato va lo que envío |

En un `POST` con JSON hacen falta las dos, y olvidar la segunda es de los errores más comunes: el servidor recibe los datos y los interpreta como un formulario, así que responde un `400` que no explica nada.

## Peticiones condicionales

Esta es la parte que casi nadie usa y que está regalada. La respuesta trae una huella del contenido:

```salida
etag: W/"ac4a34316d87c024abcff5fd27bc3e583d6fc1e7f283273aab11931a14af133e"
```

Guárdala y mándala en la siguiente petición:

```bash
curl -H 'If-None-Match: W/"ac4a34..."' https://api.github.com/repos/django/django
```

```salida
sin condición  -> 200, 6790 bytes
con condición  -> 304, 0 bytes
```

**Seis mil setecientos noventa bytes a cero.** El servidor comparó la huella, vio que no ha cambiado nada y contestó "lo que tienes vale". Para algo que se consulta cada minuto, eso es casi todo el tráfico.

Hay una variante con fechas, `Last-Modified` y `If-Modified-Since`, que hace lo mismo con menos precisión. La del ETag es mejor porque es una huella del contenido y no un reloj.

> [!aviso] Un `304` ahorra tráfico y gasta cuota igual
>
> Se repite mucho que las peticiones condicionales "no cuentan para el límite". Medido contra GitHub sin identificarse:
>
> ```salida
> restantes ahora:         43
> tras 3 peticiones 200:   40
> tras 3 peticiones 304:   37
> ```
>
> **Una menos cada vez, den `200` o `304`.** Así que el ETag ahorra ancho de banda y tiempo, pero **no te da más peticiones**.
>
> Lo que esto significa en la práctica: si tu problema es que el límite se agota, el ETag no lo arregla. Lo que lo arregla es pedir menos veces, guardando la respuesta durante el tiempo que dice `Cache-Control`, que en esta API son sesenta segundos.
>
> Las dos cosas son distintas y se confunden: **el ETag evita recibir dos veces lo mismo; la caché evita preguntar dos veces.** Se usan juntas, y la segunda es la que cuenta para la cuota.

## Idempotencia

Suena a palabra de examen y es una decisión práctica que aparece en cuanto hay reintentos.

Una petición es idempotente si hacerla **cinco veces deja el mundo igual que hacerla una**:

| Método | ¿Idempotente? | Por qué |
| --- | --- | --- |
| `GET` | Sí | Solo lee |
| `PUT` | Sí | Deja el recurso con ese contenido, estuviera como estuviera |
| `DELETE` | Sí | Lo borra; la segunda vez ya no está, y `404` es un final correcto |
| `POST` | **No** | Cada uno crea algo nuevo |
| `PATCH` | Depende | "Pon el precio a 10" sí; "súmale 1 al contador" no |

La utilidad es directa, y es lo que hace que importe: **solo se puede reintentar sin miedo lo que es idempotente.**

Si un `GET` da tiempo de espera, lo repites. Si un `POST` da tiempo de espera, no sabes si llegó, y repetirlo puede crear el pedido dos veces. Es el problema clásico del doble cobro.

Las APIs serias lo resuelven con una clave de idempotencia: mandas una cabecera con un identificador que inventas tú, y el servidor recuerda que esa clave ya se procesó y devuelve la misma respuesta en vez de crear otra cosa.

```salida
Idempotency-Key: 5f2a1c8e-...
```

Si la API que usas la ofrece, úsala en todo lo que cobre dinero. Si estás escribiendo la tuya y hay dinero de por medio, ofrécela.

> [!nota] Los verbos que casi nadie usa bien
>
> Dos precisiones que aparecen en cuanto escribes contra una API de verdad.
>
> **`PUT` reemplaza, `PATCH` modifica.** Con un artículo que tiene título, cuerpo y precio, un `PUT` con solo el título **debería borrar los otros dos**, porque estás diciendo "el artículo es ahora esto". `PATCH` con solo el título cambia el título y deja lo demás.
>
> En la práctica, muchas APIs tratan `PUT` como si fuera `PATCH` porque es lo que la gente espera, y eso es una fuente de sorpresas desagradables en las dos direcciones. Cuando uses una API ajena, **pruébalo** antes de fiarte.
>
> **`HEAD` y `OPTIONS` existen y sirven.** `HEAD` devuelve las cabeceras sin el cuerpo, que es la forma barata de comprobar si algo existe o cuánto ocupa. `OPTIONS` dice qué métodos admite una dirección, y es lo que usa el navegador por su cuenta antes de una petición entre dominios.

> [!resumen] En resumen
>
> Consumir una API cambia la perspectiva sobre los códigos de respuesta: dejan de ser algo que devuelves y pasan a ser algo sobre lo que decides, y la división que importa no es `4xx` contra `5xx` sino qué se puede reintentar y qué no, porque repetir un `400` es absurdo y repetir un `503` es lo correcto. Dos códigos despistan: el `204` no trae cuerpo y leerlo como JSON revienta al borrar algo, y el `404` muchas veces es una respuesta útil y no un error. El cuerpo de los errores no tiene formato estándar, y tres APIs reales devuelven tres cosas distintas, una de ellas un diccionario vacío, así que el código de estado es lo único fiable y leer el cuerpo debe ser siempre defensivo; el peor fallo no es un error mal leído sino una respuesta de error que parece un dato válido, y por eso se mira el código antes que el cuerpo. La cabecera de aceptación permite pedir el formato, incluidos los tipos propios que muchas APIs usan para versionar, y no debe confundirse con la que describe lo que tú envías, cuyo olvido produce un `400` sin explicación. Las peticiones condicionales con la huella del contenido bajan una respuesta de casi siete mil bytes a cero, pero medido contra GitHub sin identificarse **siguen gastando cuota**, así que ahorran tráfico y no peticiones; lo que ahorra peticiones es la caché. Y la idempotencia decide qué se puede reintentar: todo menos crear, para lo cual existen las claves de idempotencia.

> [!ejercicio] Practica
>
> 1. Pide una dirección que no exista en tres APIs distintas y compara los tres cuerpos de error.
> 2. Escribe la función defensiva que saca el motivo de un error y pruébala con las tres.
> 3. Provoca un `204` y comprueba qué pasa al intentar leerlo como JSON.
> 4. Pide el fichero léeme de un repositorio con tres valores distintos de `Accept` y compara.
> 5. Manda un `POST` con JSON sin la cabecera que lo declara y mira qué contesta.
> 6. Guarda la huella de una respuesta, vuelve a pedirla con la condición y compara los bytes.
> 7. Comprueba con el contador del límite si tus `304` gastan cuota en la API que uses.
> 8. Haz una petición `HEAD` y compara sus cabeceras con las del `GET` equivalente.
> 9. Clasifica los cinco métodos según si reintentarías cada uno tras un tiempo de espera agotado.
