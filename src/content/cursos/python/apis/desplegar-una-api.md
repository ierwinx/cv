---
titulo: "Desplegar una API"
resumen: "Dos cabeceras donde Django ponía seis, el número de trabajadores que no es el de siempre, y el arranque que se ejecuta una vez por proceso."
minutos: 16
orden: 29
---

La lección 43 del módulo 4 desplegó una web con Django. Aquí se despliega una API con FastAPI, y las diferencias importan más de lo que parece, porque **todo lo que Django hacía por defecto hay que ponerlo**.

Se ve con una medida sencilla: las cabeceras de una respuesta.

> [!objetivo] Qué vas a aprender
>
> Poner una API de FastAPI en producción: servidor, procesos, ciclo de vida, comprobaciones de salud y contenedor, sabiendo qué trae Django hecho que aquí no está.

## El servidor

En desarrollo, `fastapi dev` recarga al guardar. En producción hay dos caminos:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000
```

Los dos funcionan. Cuál usar:

**Uvicorn solo** basta si quien orquesta es otro: Kubernetes, un sistema de contenedores o el `systemd` de la lección 43 del módulo 4. Reiniciar un proceso caído es trabajo de quien está por encima.

**Gunicorn como director** es lo que conviene en una máquina normal, porque hace lo que Uvicorn no: reinicia trabajadores que se cuelgan, recarga sin cortar el servicio, y sabe apagarse esperando a que terminen las peticiones en curso.

Y los complementos importan:

```bash
pip install "uvicorn[standard]"
```

```salida
uvloop 0.22.1 | httptools: instalado
```

`uvloop` sustituye el bucle de eventos de Python por uno más rápido y `httptools` hace lo mismo con el análisis de HTTP. Los dos entran con el extra, y a diferencia del `[standard]` de FastAPI de la lección 23, **este sí merece la pena**: son dos piezas de rendimiento, no un cliente de un servicio comercial.

## Cuántos procesos

Aquí hay una diferencia con Django que se suele pasar por alto:

```salida
núcleos: 8
regla clásica (2n+1): 17
regla asíncrona (n):   8
```

**La regla de `2n+1` es para servidores síncronos**, donde cada trabajador atiende una petición cada vez y casi siempre está esperando a la base de datos. Ahí sobresuscribir tiene sentido.

**Con trabajadores asíncronos, no.** Cada uno atiende cientos de peticiones a la vez por su cuenta, así que lo que limita es el procesador, y poner más procesos que núcleos solo añade cambios de contexto y memoria.

La regla práctica es **un trabajador por núcleo**, y bajarlo si la máquina es pequeña, porque cada uno mantiene su propio depósito de conexiones a la base de datos. Cuatro trabajadores con veinte conexiones cada uno son ochenta conexiones, y PostgreSQL por defecto acepta cien.

Ese cálculo hay que hacerlo:

```salida
trabajadores × pool_size  ≤  conexiones que aguanta la base de datos
```

Con más, el síntoma es un error de "demasiadas conexiones" que aparece solo con carga y desaparece al reiniciar.

> [!aviso] Cada trabajador arranca la aplicación entera
>
> Medido con cuatro trabajadores, el arranque de la aplicación aparece varias veces en el registro:
>
> ```salida
> conexión a la base de datos comprobada
> 127.0.0.1 - "GET /salud HTTP/1.1" 200
> conexión a la base de datos comprobada
> 127.0.0.1 - "GET /no-existe HTTP/1.1" 404
> ```
>
> **Son procesos distintos**, así que nada se comparte: ni variables globales, ni cachés en memoria, ni contadores.
>
> De ahí tres consecuencias que se descubren tarde:
>
> **Un contador de límite de uso en un diccionario no funciona.** Con cuatro trabajadores, cada uno cuenta por su lado y el límite real es cuatro veces el que pusiste. Hace falta Redis.
>
> **Una caché en memoria se llena cuatro veces**, lo que multiplica la memoria y reduce los aciertos.
>
> **Y una tarea periódica lanzada al arrancar se ejecuta cuatro veces.** Si envía correos, envía cuatro.
>
> En desarrollo, con un solo proceso, nada de esto se nota. Es el clásico "en mi máquina funciona" con causa concreta.

## El ciclo de vida

Lo que se hace al arrancar y al parar:

```python
from contextlib import asynccontextmanager


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # al arrancar
        async with motor.connect() as c:
                await c.execute(text('select 1'))
    yield
    # al parar
    await motor.dispose()


app = FastAPI(lifespan=ciclo_de_vida)
```

Lo de antes del `yield` se ejecuta una vez al levantar el proceso, lo de después al apagarlo.

Sirve para lo que debe crearse una vez: el cliente HTTP compartido —que es la sesión de la lección 5, y crear uno por petición era el error de allí—, la conexión a Redis, precargar algo en memoria.

Y la comprobación de la base de datos al arrancar merece la pena: **es mejor que el proceso no levante a que levante y falle en cada petición.** Con un despliegue gradual, un proceso que no arranca detiene el despliegue y deja la versión anterior sirviendo; uno que arranca roto sustituye a la buena.

Lo de después del `yield` es lo que permite un apagado limpio, y depende de que quien orqueste mande la señal correcta y espere. Es el `graceful timeout` de Gunicorn y el `terminationGracePeriodSeconds` de Kubernetes.

## Salud y preparación

Dos rutas distintas, y la diferencia importa:

```python
@app.get('/salud')
async def salud():
        return {'estado': 'ok'}


@app.get('/preparado')
async def preparado():
        async with Sesion() as s:
                await s.execute(text('select 1'))
    return {'estado': 'preparado'}
```

**La de salud dice si el proceso vive** y no debe tocar nada externo. Si la base de datos se cae y esta ruta falla, quien orqueste reiniciará los procesos, que es justo lo que no ayuda y lo que multiplica el problema.

**La de preparación dice si puede atender peticiones.** Esa sí comprueba las dependencias, y su fallo debe hacer que el repartidor de carga deje de mandarle tráfico sin reiniciar nada.

Confundirlas es el error clásico, y el síntoma es una caída de base de datos que además reinicia todos los procesos en bucle.

> [!aviso] Dos cabeceras donde Django ponía seis
>
> Esta es la medida importante de la lección. Las cabeceras de una respuesta de FastAPI:
>
> ```salida
> content-length: 8
> content-type: application/json
> ```
>
> Y las de la misma respuesta en Django con DRF, medidas en la lección 15:
>
> ```salida
> content-type, allow, vary: Accept, Cookie
> x-content-type-options: nosniff
> x-frame-options: DENY
> cross-origin-opener-policy: same-origin
> referrer-policy: same-origin
> ```
>
> **FastAPI no pone ninguna cabecera de seguridad.** Ni protección contra adivinar el tipo de contenido, ni contra enmarcado, ni política de referencia. Todo lo que la lección 42 del módulo 4 daba por hecho, aquí no existe.
>
> Y encima pone una que sobra:
>
> ```salida
> server: uvicorn
> ```
>
> Que cuenta a cualquiera qué estás ejecutando. Se quita con `--header server:` o en el servidor de delante.
>
> Hay dos sitios donde arreglarlo. En el servidor de delante —nginx, Caddy, el repartidor de carga— es lo más común y conviene, porque la configuración vive con el despliegue. Y en la aplicación, con un intermediario, si quieres que las pruebas lo comprueben:
>
> ```python
> @app.middleware('http')
> async def cabeceras_de_seguridad(peticion, siguiente):
>         respuesta = await siguiente(peticion)
>     respuesta.headers['X-Content-Type-Options'] = 'nosniff'
>     respuesta.headers['X-Frame-Options'] = 'DENY'
>     respuesta.headers['Referrer-Policy'] = 'no-referrer'
>     respuesta.headers['Strict-Transport-Security'] = 'max-age=31536000'
>     return respuesta
> ```
>
> Con una API pura, la de enmarcado importa poco —nadie mete JSON en un marco— y las otras tres sí. Y lo que no está en esa lista y hay que mirar aparte es CORS.

## CORS

De fábrica, nada:

```salida
sin configurar:
  Access-Control-Allow-Origin: None
  OPTIONS previo -> 405
```

Que es lo correcto: un navegador no dejará que una página de otro dominio llame a tu API.

Con el intermediario puesto:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://mi-web.es'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
```

```salida
desde https://mi-web.es -> allow-origin: https://mi-web.es
desde https://otro.es   -> allow-origin: None
```

La lista blanca funciona. Y hay una combinación que hay que evitar:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],          # MAL: el comodín
    allow_credentials=True,       # junto con las credenciales
)
```

Es contradictoria y el propio navegador la rechaza. Lo que suele pasar después es que alguien, para «arreglarlo», pone la lista de orígenes leyendo la cabecera que le manda el cliente, y eso es abrir la API a cualquier página de internet con las credenciales del usuario incluidas.

CORS protege al usuario del navegador, no a tu API: **un programa que no sea un navegador se salta CORS entero.** No es un mecanismo de autorización, y confundirlo con uno es lo que lleva a dejar puntos de acceso sin permisos «porque solo los llama nuestra web».

> [!consejo] El contenedor y los ajustes
>
> El contenedor, en dos etapas y cumpliendo los tres consejos que dejó la lección 43 del módulo 4 —imagen `slim`, el `.env` fuera de la imagen y nada de ejecutar como root:
>
> ```dockerfile
> FROM python:3.14-slim AS construccion
> WORKDIR /app
> COPY requirements.txt .
> RUN pip install --no-cache-dir --prefix=/instalado -r requirements.txt
>
> FROM python:3.14-slim
> RUN useradd --create-home apirest
> WORKDIR /app
> COPY --from=construccion /instalado /usr/local
> COPY --chown=apirest:apirest . .
> USER apirest
> EXPOSE 8000
> CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", \
>      "-w", "4", "-b", "0.0.0.0:8000"]
> ```
>
> Dos cosas de ahí. **El usuario sin privilegios**, que es el tercer consejo de aquella lección. Y el `0.0.0.0`, que dentro de un contenedor es obligatorio: si escuchas en `127.0.0.1` nadie de fuera llega, y es el fallo que más veces deja un contenedor aparentemente sano al que no se puede entrar.
>
> Las dos etapas sirven para que las herramientas de compilación no viajen a la imagen final, que suele ser la mitad de tamaño.
>
> Y los ajustes, con lo de la lección 25:
>
> ```python
> class Ajustes(BaseSettings):
>         url_base_de_datos: str
>     clave_jwt: str = Field(min_length=32)
>     origenes_permitidos: list[str] = []
>     depurar: bool = False
>
>     model_config = SettingsConfigDict(env_file='.env')
> ```
>
> La ventaja sobre Django es real: **si falta una variable, el proceso no arranca** y dice cuál. En Django, una variable ausente suele ser una cadena vacía que causa un fallo raro tres capas más adelante.
>
> Y la lista de comprobación antes de publicar, que es la de la lección 43 del módulo 4 con lo propio de aquí:
>
> ```salida
> [ ] La documentación apagada, incluido el fichero del esquema
> [ ] La cabecera del servidor quitada
> [ ] Las cabeceras de seguridad puestas
> [ ] CORS con lista blanca, sin comodín con credenciales
> [ ] La clave del token en el entorno, distinta de la de desarrollo
> [ ] Límite de intentos en el punto de acceso del token
> [ ] trabajadores × conexiones ≤ lo que aguanta la base de datos
> [ ] Salud y preparación separadas
> [ ] Registro en JSON hacia la salida estándar
> [ ] Migraciones aplicadas antes de arrancar, no al arrancar
> ```
>
> La última merece una nota: **ejecutar las migraciones en el ciclo de vida es un error** que parece cómodo. Con cuatro trabajadores, cuatro procesos intentan migrar a la vez. Van en un paso aparte del despliegue.

> [!resumen] En resumen
>
> Uvicorn solo basta si algo por encima orquesta; Gunicorn como director es lo que conviene en una máquina normal, porque reinicia trabajadores caídos y sabe apagarse esperando. Su extra sí merece la pena, al revés que el de FastAPI, porque son dos piezas de rendimiento. El número de procesos no es el clásico de los servidores síncronos: con trabajadores asíncronos es **uno por núcleo**, y hay que comprobar que los trabajadores multiplicados por su depósito de conexiones no superen lo que aguanta la base de datos. Cada trabajador arranca la aplicación entera y no comparte nada, así que un contador de límite de uso en memoria no funciona, una caché se llena tantas veces como procesos, y una tarea de arranque se ejecuta varias veces; nada de eso se ve en desarrollo. El ciclo de vida crea una vez lo que debe crearse una vez y comprueba la base de datos al arrancar, lo que evita que un proceso roto sustituya a uno bueno. La ruta de salud y la de preparación son distintas y confundirlas hace que una caída de base de datos además reinicie todos los procesos. La medida importante es que **FastAPI devuelve dos cabeceras donde Django ponía seis**: ninguna de seguridad, y una de más que anuncia el servidor. CORS no viene puesto, protege al usuario del navegador y no a tu API —un programa cualquiera se lo salta—, y la combinación de comodín con credenciales es contradictoria. El contenedor repite el patrón de dos etapas con usuario sin privilegios, los ajustes validados impiden arrancar si falta una variable, y las migraciones van en un paso aparte y no en el arranque, porque si no las ejecutan todos los procesos a la vez.

> [!ejercicio] Practica
>
> 1. Arranca la API con Uvicorn y con Gunicorn y compara los registros.
> 2. Cuenta los procesos que crea cada uno.
> 3. Calcula cuántos trabajadores tocan en tu máquina y cuántas conexiones suman.
> 4. Pon un contador en una variable global y compruébalo con varios trabajadores.
> 5. Escribe el ciclo de vida que comprueba la base de datos al arrancar.
> 6. Apaga la base de datos y comprueba que el proceso no levanta.
> 7. Separa la ruta de salud de la de preparación y razona qué debe tocar cada una.
> 8. Mira las cabeceras de una respuesta y compáralas con las de un proyecto Django.
> 9. Quita la cabecera que anuncia el servidor.
> 10. Añade el intermediario de cabeceras de seguridad y escribe la prueba.
> 11. Llama a la API desde una página de otro dominio y mira qué pasa.
> 12. Configura CORS con lista blanca y prueba desde dos orígenes.
> 13. Escribe el contenedor de dos etapas con usuario sin privilegios.
> 14. Valida los ajustes y arranca sin una variable de entorno.
> 15. Recorre la lista de comprobación sobre tu propio proyecto.
