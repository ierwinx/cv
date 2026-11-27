---
titulo: "Proyecto: un cliente de una API pública"
resumen: "Cuatro capas, veintitrés pruebas sin tocar internet, y dos sorpresas: un fallo que encontró la suite y un número que dice la verdad y miente."
minutos: 22
orden: 10
---

Toca juntarlo todo. Vamos a escribir un programa de terminal que consulta la API de GitHub, y lo vamos a escribir como se escribe algo que va a durar: con las capas separadas y con pruebas que no necesitan red.

```salida
repos ver django/django
repos incidencias psf/requests -n 6
repos resumen psf/requests -n 100
repos --json ver psf/requests | jq .estrellas
```

> [!objetivo] Qué vas a aprender
>
> Construir un cliente de API completo separando transporte, modelos, lógica e interfaz; probarlo entero contra un servidor de mentira; y tratar de verdad la cuota, la paginación y los errores.

## Las cuatro capas

La decisión de arquitectura es esta, y es la que hace que el programa se pueda probar:

```salida
repos/
  errores.py     los fallos posibles, y nada más
  cliente.py     HTTP: la ÚNICA capa que sabe de requests
  modelos.py     lo que el programa usa, separado de lo que manda la API
  servicio.py    las operaciones que tienen sentido
  cli.py         argumentos y formato. No sabe de HTTP
tests/
  servidor_falso.py
  test_cliente.py
```

La regla que lo sostiene: **`requests` solo se importa en `cliente.py`**. Si mañana hay que cambiar de biblioteca, se toca un fichero. Y más importante: todo lo demás se puede probar sin red.

## Los errores propios

Antes que nada, los fallos que el programa puede tener. En su vocabulario, no en el de HTTP:

```python
class ErrorDeRepos(Exception):
        """Cualquier problema del cliente. Todo lo demás hereda de aquí."""


class SinRed(ErrorDeRepos):
        """No hubo respuesta: DNS, conexión rechazada, tiempo agotado."""


class ErrorDeLaApi(ErrorDeRepos):
        """El servidor contestó, y contestó algo que no sirve."""

    def __init__(self, codigo, mensaje, url):
                self.codigo = codigo
        self.mensaje = mensaje
        self.url = url
        super().__init__(f'{codigo} en {url}: {mensaje}')


class NoEncontrado(ErrorDeLaApi): ...
class NoAutorizado(ErrorDeLaApi): ...


class CuotaAgotada(ErrorDeLaApi):
        def __init__(self, codigo, mensaje, url, reinicio=None):
                self.reinicio = reinicio
        super().__init__(codigo, mensaje, url)

    @property
    def segundos_de_espera(self):
                if self.reinicio is None:
                        return None
        return max(0, self.reinicio - time.time())
```

Tres decisiones:

**Una raíz común**, para que quien use esto pueda protegerse con un `except` y punto. Es la misma idea que `RequestException`, de la lección 5.

**`SinRed` y `ErrorDeLaApi` separados**, que es la distinción de `urllib` de la lección 4 y la que decide si se reintenta.

**`CuotaAgotada` sabe cuánto esperar.** Es el único error que trae una instrucción de qué hacer, y por eso merece su propia clase.

## El cliente

```python
class Cliente:
        def __init__(self, token=None, base=BASE, margen_de_cuota=2):
                self.base = base.rstrip('/')
        self.margen_de_cuota = margen_de_cuota
        self.sesion = requests.Session()
        self.sesion.headers.update({
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': AGENTE,
        })

        token = token or os.environ.get('TOKEN_GITHUB')
        if token:
                        self.sesion.headers['Authorization'] = f'Bearer {token}'

        reintentos = Retry(
            total=3,
            backoff_factor=0.5,
            backoff_jitter=1.0,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({'GET', 'HEAD'}),
            respect_retry_after_header=True,
            raise_on_status=False,
        )
        adaptador = HTTPAdapter(max_retries=reintentos)
        self.sesion.mount('https://', adaptador)
        self.sesion.mount('http://', adaptador)
```

Todo lo del bloque, junto:

**`base` es un parámetro.** Parece un detalle y es lo que permite apuntar al servidor de pruebas. Sin eso, no hay suite.

**El `403` no está en la lista de reintentos**, a propósito y en contra de lo que parecería. Es la medición de la lección 9: en esta API el `403` es la cuota, no trae cabecera de espera, y el reinicio tarda cuarenta minutos. Reintentar tres veces con espera exponencial son tres golpes a una puerta cerrada.

**`raise_on_status=False`**, para que al agotarse los reintentos llegue la respuesta y podamos leer el cuerpo, que es donde la API explica el problema.

**Los dos esquemas montados.** Volvemos a esto, porque tiene historia.

El recorrido de páginas es el generador de la lección 9:

```python
def recorrer(self, ruta, limite=None, **parametros):
        url = self._url(ruta)
    vistas = set()
    entregados = 0

    while url and url not in vistas:
                vistas.add(url)
        respuesta = self._pedir(url, parametros)
        parametros = None          # el enlace siguiente ya los trae dentro

        lote = respuesta.json()
        if not lote:
                        return
        for elemento in lote:
                        yield elemento
            entregados += 1
            if limite is not None and entregados >= limite:
                                return

        self._respetar_cuota(respuesta)
        url = respuesta.links.get('next', {}).get('url')
```

Y la traducción de respuestas a errores propios:

```python
def _traducir(self, respuesta):
        url = respuesta.url.split('?')[0]     # sin parámetros: pueden traer secretos
    mensaje = self._motivo(respuesta)
    codigo = respuesta.status_code

    agotada = respuesta.headers.get('x-ratelimit-remaining') == '0'
    if codigo in (403, 429) and agotada:
                reinicio = respuesta.headers.get('x-ratelimit-reset')
        return CuotaAgotada(codigo, mensaje, url,
                            int(reinicio) if reinicio else None)

    if codigo == 404:
                return NoEncontrado(codigo, mensaje, url)
    if codigo in (401, 403):
                return NoAutorizado(codigo, mensaje, url)
    return ErrorDeLaApi(codigo, mensaje, url)
```

Fíjate en cómo se distinguen los dos `403`: **por la cabecera de cuota, no por el código**. Con la cuota a cero es el límite; con cuota disponible es que no tienes permiso. Son problemas distintos con soluciones distintas, y la API los manda con el mismo número.

Y el recorte de los parámetros en `url` es la lección 7: si alguien pasa un secreto por la consulta, no queremos que acabe en el texto de una excepción que irá a un registro.

## Los modelos

Aquí está la idea que más se salta la gente: **no pasear diccionarios de la API por todo el programa.**

```python
@dataclass(frozen=True, slots=True)
class Incidencia:
        numero: int
    titulo: str
    estado: str
    autor: str
    etiquetas: tuple[str, ...]
    creada: datetime.datetime | None
    es_propuesta: bool

    @classmethod
    def desde_api(cls, datos):
                return cls(
            numero=datos['number'],
            titulo=datos.get('title', ''),
            estado=datos.get('state', ''),
            autor=(datos.get('user') or {}).get('login', '(sin autor)'),
            etiquetas=tuple(e['name'] for e in datos.get('labels', [])),
            creada=_fecha(datos.get('created_at')),
            # La API devuelve las propuestas de cambio mezcladas con las
            # incidencias, y solo se distinguen por esta clave.
            es_propuesta='pull_request' in datos,
        )
```

Lo que se gana:

**Los nombres son los tuyos.** `estrellas` y no `stargazers_count`. El programa se lee en su idioma.

**Las fechas ya son fechas**, convertidas en un solo sitio con la función de la lección 3.

**Los ochenta y seis campos se quedan en ocho.** Los que usas.

**Hay un solo sitio donde tocar** si la API cambia un nombre.

Y el `(datos.get('user') or {})` no es paranoia: cuando se borra una cuenta de GitHub, ese campo llega como nulo. Con `datos['user']['login']` eso es un `TypeError` en producción y nunca en pruebas.

## El servicio y la interfaz

El servicio son las operaciones con sentido, sin saber de HTTP:

```python
def resumen(self, nombre, limite=200):
        abiertas = list(self.incidencias(nombre, limite=limite))
    return {
        'total': len(abiertas),
        'por_etiqueta': collections.Counter(
            e for i in abiertas for e in i.etiquetas
        ).most_common(10),
        'por_autor': collections.Counter(i.autor for i in abiertas).most_common(10),
        'sin_etiquetar': sum(1 for i in abiertas if not i.etiquetas),
        'mas_antigua': min((i for i in abiertas if i.creada),
                           key=lambda i: i.creada, default=None),
    }
```

Y la interfaz traduce errores a mensajes y a códigos de salida, que es lo del módulo 2:

```python
try:
        with Cliente() as cliente:
                salida = _ejecutar(argumentos, Repos(cliente))
except NoEncontrado as e:
        print(f'No existe: {e.url}', file=sys.stderr)
    return 4
except CuotaAgotada as e:
        espera = e.segundos_de_espera
    print(f'Cuota agotada. Vuelve en {espera / 60:.0f} minutos.', file=sys.stderr)
    if not _hay_token():
                print('Con un token tendrías 5000 peticiones por hora en vez de 60.',
              file=sys.stderr)
    return 3
except ErrorDeRepos as e:
        print(f'Error: {e}', file=sys.stderr)
    return 2
```

```salida
no existe  -> 4
bien       -> 0
sin orden  -> 2
```

El consejo del token en el mensaje de cuota es lo que distingue un error útil de uno que solo informa: dice **qué hacer**, y sale solo cuando aplica.

## El servidor de mentira

Las pruebas no tocan internet. Un servidor HTTP de la biblioteca estándar en un hilo, al que se le dice qué contestar:

```python
class ServidorFalso:
        def responder(self, ruta, cuerpo, codigo=200, cabeceras=None, veces=None):
                self.respuestas.setdefault(ruta, []).append(
            {'cuerpo': cuerpo, 'codigo': codigo,
             'cabeceras': cabeceras or {}, 'veces': veces}
        )
```

Se puede encolar más de una respuesta por ruta, que es lo que permite probar los reintentos: dos veces `503` y luego bien. Y apunta lo que le piden, que es lo que permite comprobar las cabeceras enviadas.

Por qué un servidor de verdad en lugar de sustituir funciones: porque prueba **la biblioteca de verdad**, con sus reintentos, sus conexiones y su análisis de la cabecera de navegación. Un sustituto de `requests.get` no habría encontrado el fallo que viene ahora.

## Las veintitrés pruebas

```salida
Ran 23 tests in 17.312s
OK
```

Agrupadas en cinco bloques: peticiones y cabeceras, errores, reintentos, paginación y cuota. Las que más valen:

```python
def test_403_con_cuota_a_cero_es_cuota_agotada(self):
        reinicio = int(time.time()) + 600
    self.servidor.responder(
        '/x', {'message': 'API rate limit exceeded'}, 403,
        {'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': str(reinicio)},
    )
    with self.assertRaises(CuotaAgotada) as caso:
                self.cliente().obtener('/x')
    self.assertAlmostEqual(caso.exception.segundos_de_espera, 600, delta=5)


def test_los_parametros_solo_van_en_la_primera(self):
        self.servidor.responder('/l', [{'n': 1}], cabeceras=self._enlazar('/l2?cursor=xyz'))
    self.servidor.responder('/l2', [{'n': 2}])
    list(self.cliente().recorrer('/l', state='open'))
    self.assertIn('state=open', self.servidor.peticiones[0]['ruta'])
    self.assertEqual(self.servidor.peticiones[1]['ruta'], '/l2?cursor=xyz')


def test_es_perezoso(self):
        generador = self.cliente().recorrer('/l')
    self.assertEqual(len(self.servidor.peticiones), 0)   # aún no ha pedido nada
    next(generador)
    self.assertEqual(len(self.servidor.peticiones), 1)


def test_el_error_no_guarda_los_parametros(self):
        with self.assertRaises(NoEncontrado) as caso:
                self.cliente().obtener('/x', token_secreto='NO-DEBE-SALIR')
    self.assertNotIn('NO-DEBE-SALIR', str(caso.exception))
```

La última es de las que más valen por línea escrita: comprueba que **un secreto no acaba en el texto de una excepción**. Es una propiedad de seguridad, y sin prueba se pierde en el primer refactor.

> [!aviso] El fallo que encontró la suite
>
> De las veintitrés, una falló a la primera:
>
> ```salida
> ERROR: test_reintenta_los_503
> repos.errores.ErrorDeLaApi: 503 en http://127.0.0.1:54317/x: oops
> ```
>
> Cero reintentos donde tenía que haber tres. Y el fallo no estaba en la prueba, estaba en el cliente:
>
> ```python
> self.sesion.mount('https://', HTTPAdapter(max_retries=reintentos))
> ```
>
> **Solo `https://`.** Es la línea que aparece en toda la documentación y en todos los ejemplos, y es incompleta: `mount` funciona por prefijo, así que cualquier dirección `http://` usa el adaptador por defecto, **sin reintentos y en silencio**.
>
> Con la API de GitHub nunca se habría notado, porque es siempre `https`. Se habría notado el día que alguien apuntara el cliente a un servicio interno por `http`, o a un entorno de pruebas, y entonces el reintentador estaría puesto en el código y no haría nada. Es exactamente el fallo silencioso de la lección 8, en otra capa.
>
> El arreglo son tres líneas, y lo que importa es cómo apareció: **la prueba usaba `http` porque un servidor local no tiene certificado**, y esa diferencia accidental destapó el fallo. Una prueba con sustitutos de funciones no lo habría encontrado nunca, porque nunca habría llegado a mirar el esquema.

> [!nota] El número que dice la verdad y miente
>
> Al ejecutarlo de verdad salió esto:
>
> ```salida
> $ repos ver django/django
> incidencias abiertas  509
>
> $ repos incidencias django/django
> No hay incidencias abiertas.
> ```
>
> Que parece una contradicción evidente y no lo es: **las dos respuestas son correctas**.
>
> El campo `open_issues_count` de GitHub **cuenta también las propuestas de cambio**. Y Django gestiona sus incidencias en Trac, fuera de GitHub, así que las 509 son propuestas, todas, y el filtro de `es_propuesta` las descarta correctamente:
>
> ```salida
> con propuestas: 10
>   22018 propuesta  Fixed #37361 -- Support permission renames...
>   22016 propuesta  Added missing notes about including latest...
> ```
>
> Dos cosas que llevarse.
>
> **El listado de incidencias devuelve propuestas mezcladas**, y solo se distinguen por si el objeto trae una clave `pull_request`. No hay ningún campo de tipo. Es una decisión histórica de la API que sorprende a todo el mundo la primera vez, y que hace que los recuentos no cuadren si no la conoces.
>
> **Un nombre de campo no es su definición.** `open_issues_count` parece que cuenta incidencias abiertas, y cuenta otra cosa. Eso es la sexta pregunta de la lección 1 —leerse la documentación— y es el motivo de que convenga probar contra datos reales y no contra los del ejemplo: ningún servidor de mentira te habría enseñado esto.

> [!consejo] Lo que le falta para ser tuyo
>
> El proyecto está completo y hay cinco cosas naturales que añadir.
>
> **Caché en disco con la huella del contenido.** Es la lección 2: guardar la respuesta y su `ETag`, mandarlo en la siguiente petición y usar lo guardado si contesta `304`. Baja el tráfico casi a cero, aunque no la cuota.
>
> **Un fichero de configuración**, para no repetir el repositorio en cada orden. Un `~/.config/repos.toml` leído con `tomllib`, que es de la biblioteca estándar desde la 3.11.
>
> **Marca de la última pasada**, que es la optimización más rentable de la lección 9: guardar la fecha y pedir solo lo posterior, con unos minutos de margen y guardándola solo si todo fue bien.
>
> **Salida a CSV**, para abrirlo en una hoja de cálculo. Es el `csv` del módulo 2 con los modelos que ya tienes.
>
> **Más de una API.** Es la prueba de fuego del diseño: si añadir un segundo servicio obliga a tocar `servicio.py` o `cli.py`, las capas no estaban tan separadas como parecía.

> [!resumen] En resumen
>
> El proyecto separa cuatro capas con una regla que lo sostiene todo: `requests` se importa en un solo fichero, de modo que el resto se puede probar sin red. Los errores son propios y en el vocabulario del programa, con una raíz común para protegerse de una vez, la distinción entre "no hubo respuesta" y "contestó mal", y una clase de cuota que además sabe cuánto hay que esperar. El cliente junta todo el bloque: sesión con cabeceras fijas, reintentos que **dejan fuera el `403` a propósito** porque en esta API es la cuota y esperar no sirve, recorrido de páginas siguiendo el enlace en un generador perezoso, y traducción de respuestas a errores distinguiendo los dos `403` por la cabecera de cuota y no por el código. Los modelos convierten los ochenta y seis campos de la API en los ocho que se usan, con nombres propios y fechas ya convertidas. Las veintitrés pruebas corren contra un servidor HTTP de mentira en un hilo, que prueba la biblioteca de verdad en lugar de sustituirla, y eso destapó un fallo real: montar el adaptador de reintentos solo en `https://` deja sin reintentos cualquier dirección `http`, en silencio, y es la línea que aparece en toda la documentación. Al ejecutarlo contra datos reales apareció la otra sorpresa: `open_issues_count` cuenta también las propuestas de cambio, así que un repositorio puede declarar 509 incidencias abiertas y no tener ninguna.

> [!ejercicio] Practica
>
> 1. Monta el proyecto con sus cuatro capas y haz que la primera orden funcione.
> 2. Comprueba que `requests` solo se importa en un fichero.
> 3. Escribe el servidor de mentira y una prueba que compruebe las cabeceras enviadas.
> 4. Prueba que un `403` con cuota a cero y uno con cuota disponible dan errores distintos.
> 5. Escribe la prueba de que los parámetros no se repiten en la segunda página.
> 6. Escribe la prueba de que el recorrido es perezoso.
> 7. Monta el adaptador solo en un esquema y comprueba que la prueba de reintentos falla.
> 8. Añade la prueba de que un secreto no aparece en el texto de una excepción.
> 9. Comprueba los códigos de salida de las tres situaciones de error.
> 10. Añade la caché en disco con la huella del contenido.
> 11. Añade la marca de la última pasada y mide cuántas peticiones te ahorra.
> 12. Añade una segunda API y comprueba cuántos ficheros has tenido que tocar.
