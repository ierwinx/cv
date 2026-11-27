---
titulo: "Proyecto final: una API completa"
resumen: "Reunir las veintinueve lecciones en una API que funciona, con los fallos silenciosos del curso ya cerrados, y el bucle infinito que apareció al montarla."
minutos: 20
orden: 30
---

Última lección del curso. Toca juntarlo todo: una API con autenticación, permisos por papel, paginación por cursor, filtros, errores propios y pruebas.

Lo interesante no es el código, que a estas alturas no sorprende. Es que **los fallos silenciosos que el curso fue encontrando están cerrados en él**, y que montarlo destapó uno nuevo que ninguna lección había visto.

> [!objetivo] Qué vas a aprender
>
> Reunir lo aprendido en una API completa, comprobar que los fallos del curso están cerrados, y ver el error que apareció al montarla y cómo se diagnosticó.

## La forma del proyecto

```salida
api/
  app/
    ajustes.py         los ajustes validados        (lección 25)
    modelos.py         SQLAlchemy                   (lección 26)
    esquemas.py        los modelos de pydantic      (lección 25)
    seguridad.py       contraseñas y tokens         (lección 27)
    dependencias.py    sesión, usuario, papeles     (lecciones 26 y 27)
    errores.py         los manejadores propios      (lección 23)
    routers/
      libros.py
      cuentas.py
    main.py            la aplicación
  conftest.py          los accesorios de prueba     (lección 28)
  test_catalogo.py     las pruebas
```

La separación que importa es la de `modelos.py` y `esquemas.py`: **lo que hay en la base de datos y lo que sale por la API son cosas distintas**, que es la primera frase de la lección 11 y sigue siendo la decisión más importante.

## Los errores, arreglados de entrada

Lo primero que se escribe, porque cambiarlo después rompe a los clientes:

```python
def registrar(app: FastAPI) -> None:
        @app.exception_handler(RequestValidationError)
    async def validacion(peticion: Request, exc: RequestValidationError):
                """Agrupa por campo, quita el valor enviado y devuelve 400."""
        errores: dict[str, list[str]] = {}
        for error in exc.errors():
                        campo = '.'.join(str(x) for x in error['loc'][1:]) or 'general'
            errores.setdefault(campo, []).append(error['msg'])
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={'detalle': 'Los datos enviados no son válidos.',
                     'errores': errores,
                     'documentacion': 'https://ejemplo.es/docs#errores'})
```

Y el resultado, con un cuerpo vacío:

```salida
400
{"detalle": "Los datos enviados no son válidos.",
 "errores": {"titulo": ["Field required"],
             "isbn": ["Field required"],
             "precio": ["Field required"],
             "editorial_id": ["Field required"]},
 "documentacion": "https://ejemplo.es/docs#errores"}
```

Cuatro cosas arregladas respecto a lo que medía la lección 23: el código es `400` en vez de `422`, los errores van agrupados por campo, **el valor rechazado no aparece** —y por eso una contraseña no acaba en los registros—, y hay un enlace a la documentación, que es lo que la lección 2 pedía de una API bien hecha.

## Los fallos del curso, cerrados

Esto es lo que merece la pena mirar. Los tres silencios que el curso midió:

```salida
PATCH con errata     -> 400  {"titutlo": ["Extra inputs are not permitted"]}
ISBN repetido        -> 409  "Ya existe un libro con ese ISBN."
?tam=500             -> 400  {"tam": [...]}
?estado=inventado    -> 400  {"estado": [...]}
?cursor=xxxx         -> 400  "El cursor no es válido."
```

**El primero es el de la lección 13**, que allí contestaba `200` sin guardar nada. Lo cierra `extra='forbid'` de la lección 25, y el error dice el nombre del campo mal escrito.

**El tercero y el cuarto son los de la lección 19**, donde un parámetro con un valor imposible se ignoraba en silencio. Aquí las restricciones del tipo los rechazan.

**Y el segundo es el de la lección 2**: un `IntegrityError` sin tratar habría sido un `500`, culpando al servidor de un error del cliente.

Los permisos, comprobados:

```salida
GET  /api/libros/  sin token          -> 200   (la lectura es pública)
POST /api/libros/  sin token          -> 401
POST con papel de lector              -> 403
POST con cuenta desactivada           -> 403
POST con papel de editor              -> 201
```

La distinción entre `401` y `403` de la lección 18, y la lectura pública con escritura protegida, que es lo que casi todas las APIs necesitan.

## La paginación por cursor

La parte con más trabajo, porque es la que la lección 20 dejó a medias:

```python
def _cursor(libro: Libro) -> str:
        bruto = f'{libro.creado.isoformat()}|{libro.id}'
    return base64.urlsafe_b64encode(bruto.encode()).decode().rstrip('=')


consulta = (select(Libro)
            .options(selectinload(Libro.editorial))
            .where(*filtros)
            .order_by(Libro.creado.desc(), Libro.id.desc()))
if cursor:
        creado, ident = _leer_cursor(cursor)
    consulta = consulta.where(
        (Libro.creado < creado)
        | ((Libro.creado == creado) & (Libro.id < ident)))

libros = list(await sesion.scalars(consulta.limit(tam + 1)))
hay_mas = len(libros) > tam
libros = libros[:tam]
```

Tres detalles que hacen que funcione:

**El cursor lleva dos campos**, la fecha y el identificador, porque varios libros pueden tener la misma fecha. Sin el identificador de desempate se saltan filas, y es el error clásico.

**Se piden `tam + 1` filas** para saber si hay más sin hacer otra consulta.

**Y la ordenación es la misma en los dos sitios**, que es el aviso de estabilidad de la lección 19.

Funcionando:

```salida
recorrer el catálogo entero:
  5 páginas, 45 libros, 45 distintos, total dice 45

insertando 5 libros a mitad del recorrido:
  recorridos 45, duplicados 0
```

Esa segunda medida es la prueba de la lección 20, donde la paginación por número de página devolvía elementos repetidos. Aquí no hay ninguno.

> [!aviso] El bucle infinito que apareció al montarlo
>
> Y aquí el hallazgo nuevo. La primera versión de esa paginación **colgó el programa**: recorría páginas sin parar.
>
> El modelo tenía esto:
>
> ```python
> creado: Mapped[datetime] = mapped_column(server_default=func.now())
> ```
>
> Y al mirar qué guardaba de verdad:
>
> ```salida
> lo que SQLite guarda:      '2026-09-22 20:11:41'
> lo que SQLAlchemy devuelve: datetime(2026, 9, 22, 20, 11, 41)
>
> filas con creado < 2026-09-22 20:11:41:  46
> total de filas:                          46
> ```
>
> **Todas las filas cumplen ser anteriores a sí mismas.** Por eso cada página devolvía el catálogo entero y el recorrido no terminaba nunca.
>
> La causa es una cadena de tres cosas, y ninguna es un error por separado. El valor por defecto del servidor lo escribe SQLite, **sin microsegundos**. El parámetro del cursor lo escribe SQLAlchemy desde Python, **con microsegundos**. Y SQLite guarda las fechas como texto, así que la comparación es de cadenas: `'...20:11:41'` contra `'...20:11:41.000000'` nunca son iguales, y la primera siempre es «menor».
>
> El arreglo es una línea, y la razón merece un comentario en el código:
>
> ```python
> # Con default de Python y no del servidor: SQLite guardaría el del
> # servidor sin microsegundos, y el cursor compararía mal.
> creado: Mapped[datetime] = mapped_column(
>     default=lambda: datetime.now(timezone.utc), index=True)
> ```
>
> Tres cosas que llevarse de esto, y valen para el curso entero:
>
> **El fallo no estaba en el código de la paginación**, que era correcto, sino en un valor por defecto de un modelo escrito tres ficheros antes. Los errores de precisión de tipos viajan lejos.
>
> **No habría aparecido con PostgreSQL**, que guarda las fechas como fechas y las compara como fechas. Es el aviso de la lección 41 del módulo 4: probar contra una base de datos distinta de la de producción esconde cosas, **y también inventa cosas**, que es este caso.
>
> **Y se diagnosticó mirando qué había en la tabla**, no leyendo el código. Cuatro líneas que imprimen el valor crudo y cuentan las filas que cumplen la condición, y el problema queda claro. Es lo que el curso entero ha hecho: cuando algo no cuadra, medir antes que razonar.

## Las pruebas

Doce, y son las que el curso fue señalando:

```python
async def test_el_patch_con_errata_no_pasa_en_silencio(cliente, editora):
        """El fallo de la lección 13, ya cerrado."""
    lid = (await cliente.post('/api/libros/', json=LIBRO,
                              headers=editora)).json()['id']
    r = await cliente.patch(f'/api/libros/{lid}', json={'titutlo': 'X'},
                            headers=editora)
    assert r.status_code == 400
    assert 'titutlo' in r.json()['errores']


async def test_los_errores_no_devuelven_lo_enviado(cliente, editora):
        """El fallo de la lección 23, ya cerrado."""
    r = await cliente.post('/api/libros/',
                           json={**LIBRO, 'precio': 'no-es-un-precio'},
                           headers=editora)
    assert r.status_code == 400
    assert 'no-es-un-precio' not in r.text


async def test_el_cursor_recorre_todo_sin_repetir(cliente, editora):
        url, vistos = '/api/libros/?tam=10', []
    while url:
                d = (await cliente.get(url)).json()
        vistos += [l['id'] for l in d['resultados']]
        url = d['siguiente']
    assert len(vistos) == 25 == len(set(vistos))


async def test_cada_prueba_tiene_su_base(cliente):
        assert (await cliente.get('/api/libros/')).json()['total'] == 0
```

```salida
12 passed in 2.04s
```

La segunda es la que más vale de todas, y por una razón de forma: **comprueba lo que no está**, buscando el texto rechazado en la respuesta entera. Ese tipo de prueba —la que verifica una ausencia— es la que detecta las fugas, y casi nadie la escribe.

Y la última sigue siendo la que sostiene a las demás.

> [!consejo] La lista de comprobación de una API
>
> Reuniendo los treinta puntos que las lecciones fueron dejando, para tener en un sitio lo que hay que mirar antes de publicar.
>
> **Diseño**
>
> ```salida
> [ ] Recursos en plural, sustantivos, sin verbos
> [ ] Versión en la ruta desde el primer día
> [ ] Lo que hay en la base y lo que sale por la API son cosas distintas
> [ ] Un modelo por operación: crear, actualizar, salida
> [ ] El dinero viaja como texto
> [ ] Las fechas en ISO 8601 con zona horaria
> ```
>
> **Errores**
>
> ```salida
> [ ] Formato decidido antes de publicar, porque después rompe
> [ ] Agrupados por campo y con el nombre del campo dentro
> [ ] Nunca devuelven lo que el cliente envió
> [ ] Los errores del cliente son 4xx, no 500
> [ ] Los campos desconocidos se rechazan, no se ignoran
> ```
>
> **Seguridad**
>
> ```salida
> [ ] Cerrado por defecto, abierto donde haga falta
> [ ] 401 sin identificar, 403 identificado y sin permiso
> [ ] Filtrar por dueño en la consulta, no solo al comprobar
> [ ] Los permisos de objeto, en una dependencia que devuelva el objeto
> [ ] Las contraseñas, fuera del bucle de eventos
> [ ] En el token, solo el sujeto: lo que metas se congela
> [ ] Cabeceras de seguridad puestas a mano
> [ ] CORS con lista blanca, y no confundirlo con autorización
> [ ] Límite de intentos en el punto de acceso del token
> ```
>
> **Rendimiento**
>
> ```salida
> [ ] Las relaciones, cargadas por adelantado
> [ ] Una prueba que cuente las consultas de los listados
> [ ] Tope al tamaño de página
> [ ] Paginación por cursor si el catálogo cambia mientras se recorre
> [ ] Nada bloqueante dentro de una función asíncrona
> [ ] trabajadores × conexiones ≤ lo que aguanta la base de datos
> ```
>
> **Pruebas y despliegue**
>
> ```salida
> [ ] El anónimo, en cada ruta protegida
> [ ] Que los campos sensibles no salen
> [ ] Que las pruebas están aisladas entre sí
> [ ] El esquema guardado, con prueba que detecte cambios
> [ ] La documentación apagada en producción, el esquema también
> [ ] Migraciones en un paso aparte, no al arrancar
> ```

> [!nota] Lo que el curso no ha contado
>
> Honestidad sobre los límites, que es lo que esta última lección debe dejar claro.
>
> **Websockets y eventos del servidor**, para lo que va en tiempo real. FastAPI los soporta bien y son otro modelo mental.
>
> **Tareas en segundo plano de verdad.** Las que trae FastAPI se ejecutan en el mismo proceso y se pierden si se reinicia. Para trabajo serio hacen falta Celery, ARQ o similares, con su cola y su almacén.
>
> **GraphQL y gRPC**, que son las otras dos formas de hacer lo mismo, cada una con sus ventajas para casos concretos.
>
> **Caché.** Ni de respuestas, ni de consultas, ni las cabeceras de HTTP que lo controlan. Es de lo primero que hace falta cuando una API tiene tráfico.
>
> **Observabilidad.** Registro estructurado, métricas y trazas. La lección 42 del módulo 4 tocó lo básico y en un sistema con varios servicios hace falta bastante más.
>
> **Y lo más importante: el diseño de sistemas.** Cuándo partir una aplicación en servicios, cómo se comunican, qué hacer cuando uno falla. Eso no se aprende en un curso de Python.
>
> Nada de eso hace falta para empezar. Todo hace falta antes o después.

> [!resumen] En resumen
>
> El proyecto reúne el curso en una API con autenticación, papeles, paginación por cursor, filtros y errores propios, y su decisión más importante es la primera del módulo: **lo que hay en la base de datos y lo que sale por la API son cosas distintas**. Los manejadores de error se escriben antes que nada, porque cambiarlos después rompe a los clientes, y cierran lo que medía la lección 23: código correcto, agrupados por campo, sin devolver el valor rechazado y con enlace a la documentación. Los tres silencios del curso quedan cerrados y comprobados: el `PATCH` con errata de la lección 13 da error con el nombre del campo, los parámetros imposibles de la lección 19 se rechazan, y la clave repetida devuelve un código de cliente en vez de un error del servidor. La paginación por cursor lleva dos campos para desempatar, pide una fila de más para saber si hay siguiente, y recorre el catálogo sin repetir aunque se inserte a mitad. Montarla destapó un fallo nuevo: **un bucle infinito** causado por un valor por defecto del servidor que SQLite guardaba sin microsegundos mientras el parámetro los llevaba, de modo que todas las filas resultaban anteriores a sí mismas; el fallo estaba tres ficheros antes de donde se notó, no habría aparecido con PostgreSQL, y se diagnosticó mirando qué había en la tabla en lugar de releyendo el código, que es lo que el curso ha hecho desde el principio. De las doce pruebas, la que más vale es la que **comprueba una ausencia**, buscando el dato rechazado en la respuesta entera, porque ese tipo de prueba es el que detecta las fugas y casi nadie lo escribe.

> [!ejercicio] Practica
>
> 1. Monta la estructura de ficheros y separa los modelos de los esquemas.
> 2. Escribe los manejadores de error antes que ninguna ruta.
> 3. Comprueba que un cuerpo vacío devuelve el formato que decidiste.
> 4. Manda un campo con una errata en una actualización parcial.
> 5. Provoca una clave repetida y comprueba el código.
> 6. Comprueba los cinco casos de permisos, incluida la cuenta desactivada.
> 7. Implementa la paginación por cursor con dos campos de desempate.
> 8. Recorre el catálogo entero y cuenta si hay repetidos.
> 9. Inserta elementos a mitad del recorrido y vuelve a contar.
> 10. Quita el campo de desempate del cursor y busca las filas que se saltan.
> 11. Cambia el valor por defecto de la fecha al del servidor y reproduce el bucle.
> 12. Diagnostícalo mirando lo que hay en la tabla, sin leer el código.
> 13. Escribe la prueba que comprueba que un dato rechazado no aparece en la respuesta.
> 14. Escribe la que verifica el aislamiento entre pruebas.
> 15. Recorre la lista de comprobación entera sobre tu proyecto y anota lo que falta.
