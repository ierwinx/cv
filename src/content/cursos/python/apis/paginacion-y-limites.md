---
titulo: "Paginación y límites de uso"
resumen: "Cuatro formas de pedir la página siguiente, la fila que se lee dos veces, y el 403 que no trae Retry-After y por tanto tu reintentador ignora."
minutos: 15
orden: 9
---

Las dos cosas de esta lección van juntas porque se causan mutuamente: una API pagina para que no le pidas cien mil filas de golpe, y pone un límite de uso para que no se las pidas en cien mil peticiones seguidas.

Y las dos son la causa habitual de que un programa que funcionaba en pruebas con veinte registros se rompa en producción con veinte mil.

> [!objetivo] Qué vas a aprender
>
> Reconocer las cuatro formas de paginar y recorrerlas bien, entender por qué la más común pierde y repite filas, y respetar los límites de uso sabiendo que el caso más frecuente no lo detecta el reintentador de la lección anterior.

## Las cuatro formas

No hay estándar, y esto es lo que hay ahí fuera.

**Por número de página.** La más común, y la de Django REST Framework:

```json
{
  "count": 1043,
  "next": "https://ejemplo.es/api/articulos/?page=3",
  "previous": "https://ejemplo.es/api/articulos/?page=1",
  "results": [ ... ]
}
```

Cómoda porque sabes cuántos hay y puedes saltar a la página que quieras.

**Por desplazamiento**, que es lo mismo contado en filas: `?offset=40&limit=20`. La diferencia es cosmética, y el problema es el mismo.

**Por cabecera.** Los datos son la lista pelada y la navegación va aparte:

```salida
Link: <https://api.github.com/repositories/4164482/issues?per_page=5&after=Y3Vyc29y...>; rel="next"
```

Es más limpio, porque el cuerpo son solo datos. Y `requests` la analiza por su cuenta:

```python
respuesta.links['next']['url']
```

**Por cursor.** Te dan una marca opaca y la devuelves para seguir. Es lo que hace GitHub ahora, dentro de esa cabecera:

```salida
after = Y3Vyc29yOnYyOpLPAAABoMmoDUjPAAAAAUpL110=
descodificado -> b'cursor:v2:\x92\xcf\x00\x00\x01\xa0...'
```

Empieza por `cursor:v2:` y sigue en binario. **Es opaco a propósito**: no está pensado para que lo interpretes, sino para que lo devuelvas tal cual.

Fíjate en lo que **no** hay en esa cabecera:

```salida
¿hay rel="last"?  False
```

GitHub tenía un enlace a la última página cuando paginaba por número, y con cursor **no puede**: no se sabe cuántas páginas hay sin recorrerlas. Ese es el precio.

## Por qué el cursor ganó

La paginación por número tiene un fallo que no se ve en pruebas y se ve siempre en producción: **los datos se mueven mientras los recorres.**

Pides las filas 1 a 20. Mientras las procesas, alguien inserta una fila nueva que va la primera. Pides las filas 21 a 40:

```salida
antes:   [nueva]  A  B  C ... T | U  V  W ...
                  └─ página 1 ─┘ └─ página 2

la fila T era la 20 y ahora es la 21  ->  la lees DOS veces
```

Y al revés: si alguien borra una fila, la que estaba en el límite **se salta** y no la lees nunca. Sin error, sin aviso, con `200` en todas las peticiones.

Para un listado que mira una persona, da igual. Para un proceso que sincroniza datos cada noche, es que faltan registros y hay duplicados, y descubrir por qué lleva días.

El cursor no tiene ese problema porque dice "dame lo que va después de **esta fila**", no "dame las veinte siguientes por número". Si insertan algo antes, no afecta. Es exactamente la paginación por cursor de la lección 36 del módulo anterior, ahora desde el lado del cliente.

Y el otro motivo es el coste, que también se midió allí: con desplazamiento, la base de datos tiene que recorrer y tirar las filas anteriores, así que la página mil tarda mil veces más.

## Recorrerlas bien

La forma correcta es **seguir el enlace que te dan**, no construirlo:

```python
def recorrer(sesion, url, **kwargs):
        while url:
                respuesta = sesion.get(url, timeout=(3.05, 15), **kwargs)
        respuesta.raise_for_status()
        yield from respuesta.json()
        url = respuesta.links.get('next', {}).get('url')
        kwargs.pop('params', None)     # el enlace ya los trae dentro
```

```salida
página 1: 3 elementos, primero #22018
página 2: 3 elementos, primero #22015
página 3: 3 elementos, primero #22012
```

Tres detalles que importan:

**Los parámetros se quitan tras la primera vuelta.** El enlace de la cabecera ya trae dentro el tamaño de página, los filtros y el cursor. Volver a pasarlos puede duplicarlos o pisar el cursor, que es el fallo que deja el bucle recorriendo la primera página para siempre.

**Es un generador.** Devuelve filas según llegan en vez de acumularlas, así que se puede recorrer un millón de registros sin tenerlos todos en memoria. Es la respuesta al límite de la lección 3.

**Se sigue el enlace, no se inventa.** Si mañana GitHub cambia de número a cursor —cosa que ya ha hecho— el código sigue funcionando. El que construía `?page=N+1` a mano, no.

Para las APIs que no mandan cabecera y ponen la navegación en el cuerpo, el mismo bucle con la clave correspondiente:

```python
url = datos.get('next')            # Django REST Framework
url = datos.get('next_page_url')   # otras
```

> [!aviso] Tres formas de que el bucle no acabe nunca
>
> **El enlace que no cambia.** Si por lo que sea la API devuelve el mismo enlace, giras para siempre. La defensa es barata:
>
> ```python
> vistas = set()
> while url and url not in vistas:
>         vistas.add(url)
>     ...
> ```
>
> **La última página que no se distingue.** Algunas APIs, en vez de quitar el enlace, mandan una lista vacía. Hay que cortar por las dos cosas:
>
> ```python
> lote = respuesta.json()
> if not lote:
>         break
> ```
>
> **El tope de seguridad.** En un proceso desatendido, un contador máximo de páginas convierte un bucle infinito en un error que se puede leer:
>
> ```python
> for numero in range(1, 1000):
>         ...
> else:
>         raise RuntimeError('Más de mil páginas; algo va mal')
> ```
>
> Que un proceso nocturno dé un error a las 3:05 es molesto. Que se quede girando hasta que alguien mire el consumo de la máquina, es peor.

## Los límites de uso

Toda API seria los tiene, y suelen ser de tres tipos combinados: **por hora**, **por segundo**, y **de concurrencia**. Los dos últimos se olvidan y son los que muerden cuando alguien decide paralelizar.

Las cabeceras dicen cómo vas:

```salida
x-ratelimit-limit: 60
x-ratelimit-remaining: 3
x-ratelimit-reset: 1790105811
```

Y lo correcto es mirarlas **antes** de pasarte, no reaccionar después.

> [!aviso] El caso más común no lo detecta tu reintentador
>
> Vale la pena verlo medido, gastando la cuota a propósito:
>
> ```salida
> petición 1: 200, quedan 3
> petición 2: 200, quedan 2
> petición 3: 200, quedan 1
> petición 4: 200, quedan 0
> petición 5: 403, quedan 0
> ```
>
> Y la respuesta que llega:
>
> ```salida
> código:      403        <- NO es 429
> retry-after: None       <- no la manda
> x-ratelimit-reset: 1790105811   (dentro de 2578 s, unos 43 minutos)
> cuerpo: API rate limit exceeded for 189.133.19.164...
> ```
>
> **Dos cosas rompen la configuración de la lección anterior.**
>
> El `status_forcelist=(429, 500, 502, 503, 504)` que pusimos allí **no incluye el 403**, así que el reintentador lo deja pasar tal cual. Y aunque lo incluyeras, `respect_retry_after_header` no tiene nada que respetar, porque esa cabecera no viene: reintentaría con la espera exponencial, que llega a 32 segundos, contra un límite que tarda **43 minutos** en reiniciarse. Serían tres golpes más a una puerta cerrada.
>
> La conclusión es que **el límite de uso se trata a mano, y se trata antes de que ocurra**:
>
> ```python
> def respetar_cuota(respuesta, margen=2):
>         restantes = respuesta.headers.get('x-ratelimit-remaining')
>     if restantes is None:
>                 return
>     if int(restantes) <= margen:
>                 reinicio = int(respuesta.headers['x-ratelimit-reset'])
>         espera = max(0, reinicio - time.time()) + 1
>         registro.warning('Cuota casi agotada; esperando %.0f s', espera)
>         time.sleep(espera)
> ```
>
> Y llamarla después de cada petición del bucle de páginas. Esperar cuarenta minutos a propósito parece mucho; es mejor que que te bloqueen, y muchísimo mejor que quedarse a medias sin saberlo.

> [!consejo] Pedir menos en vez de esperar más
>
> Antes de montar esperas, cuatro formas de necesitar menos peticiones.
>
> **Subir el tamaño de página.** Casi todas admiten `per_page` o `limit`, con un máximo de 100 o 1000. Pasar de 30 a 100 son **tres veces menos peticiones** por el mismo dato, y es cambiar un número.
>
> **Pedir solo los campos que usas.** Muchas APIs tienen algo como `?fields=id,nombre`. No ahorra peticiones, ahorra tiempo y memoria, que también cuentan.
>
> **Filtrar en el servidor.** Si vas a descartar el 90 % de lo que traes, ese 90 % son peticiones tiradas. Un `?state=open&since=2026-09-01` puede convertir cincuenta páginas en dos.
>
> **Pedir solo lo que cambió.** Es la más rentable con diferencia y la que menos se usa. Casi todas las APIs aceptan algo como `?since=` o `?updated_after=`, y un proceso que guarda la fecha de la última pasada baja de cincuenta páginas diarias a una:
>
> ```python
> desde = leer_marca()            # de la última vez
> filas = list(recorrer(sesion, url, params={'since': desde.isoformat()}))
> guardar_marca(ahora)
> ```
>
> Con dos cuidados: guardar la marca **solo si todo fue bien**, y restarle unos minutos de margen, porque los relojes de las dos máquinas no coinciden y las filas del borde se pierden. Es más barato procesar algo dos veces que saltárselo, y por eso el proceso debe ser idempotente, que es la lección anterior.

> [!nota] Concurrencia: la tentación
>
> Cincuenta páginas a medio segundo son veinticinco segundos, y es tentador pedirlas en paralelo. Tres avisos.
>
> **Con cursor no se puede.** Necesitas la página N para saber cuál es la N+1. Solo se puede paralelizar la de número, y esa es la que pierde filas.
>
> **Los límites de concurrencia suelen ser bajos**, entre dos y diez conexiones, y pasarse se castiga más que pasarse de cuota por hora.
>
> **El orden se pierde.** Si el proceso siguiente lo necesita, hay que reordenar, y entonces hay que tenerlo todo en memoria, que era lo que el generador evitaba.
>
> Cuando de verdad hace falta, `concurrent.futures.ThreadPoolExecutor` con `max_workers=4` y una sesión compartida es suficiente, sin llegar a `asyncio`. La mayoría de las veces sale más a cuenta pedir menos, que es lo de arriba.

> [!resumen] En resumen
>
> Hay cuatro formas de paginar y ningún estándar: por número de página, que es la más común y la de Django REST Framework; por desplazamiento, que es lo mismo contado en filas; por cabecera, que deja el cuerpo limpio y que `requests` analiza sola; y por cursor, una marca opaca que se devuelve tal cual. Las dos primeras tienen un fallo que no aparece en pruebas: si alguien inserta o borra una fila mientras recorres, **lees filas dos veces o te saltas otras**, con `200` en todas las peticiones; y además el desplazamiento hace que la página mil tarde mil veces más. El cursor lo evita, a cambio de no poder saber cuántas páginas hay, y por eso GitHub ya no manda enlace a la última. Recorrer se hace **siguiendo el enlace que te dan** en un generador, quitando los parámetros después de la primera vuelta porque el enlace ya los trae, con defensas contra el bucle infinito. De los límites de uso, el hallazgo importante es que GitHub contesta **`403` y sin cabecera de espera**, así que la configuración de reintentos de la lección anterior ni lo detecta ni, detectándolo, sabría cuánto esperar: intentaría durante treinta segundos contra un límite que tarda cuarenta y tres minutos en reiniciarse. El límite se trata a mano y antes de que ocurra, mirando las cabeceras de cuota tras cada petición. Y casi siempre sale mejor necesitar menos peticiones que esperar más: subir el tamaño de página, filtrar en el servidor y, sobre todo, pedir solo lo que cambió desde la última vez.

> [!ejercicio] Practica
>
> 1. Pide una lista de una API con tamaño de página pequeño y localiza cómo indica la página siguiente.
> 2. Descodifica un cursor y comprueba que no dice nada útil.
> 3. Escribe el generador que recorre páginas siguiendo el enlace.
> 4. Quita la línea que borra los parámetros y observa qué pasa.
> 5. Añade las tres defensas contra el bucle infinito.
> 6. Dibuja con papel el caso de la fila que se lee dos veces al insertar una nueva.
> 7. Gasta la cuota de una API a propósito y anota el código, las cabeceras y el cuerpo.
> 8. Comprueba si esa respuesta trae cabecera de espera y si tu reintentador la detectaría.
> 9. Escribe la función que espera al reinicio de la cuota antes de agotarla.
> 10. Sube el tamaño de página al máximo que permita la API y cuenta cuántas peticiones te ahorras.
> 11. Monta un proceso que guarde la fecha de la última pasada y pida solo lo posterior.
