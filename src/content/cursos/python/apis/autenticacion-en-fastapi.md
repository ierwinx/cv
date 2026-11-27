---
titulo: "Autenticación en FastAPI"
resumen: "Todo a mano y en cuarenta líneas, los 86 milisegundos que paran el servidor, y el argumento sin el cual PyJWT se niega a funcionar."
minutos: 17
orden: 27
---

Aquí está la otra mitad de lo que FastAPI no trae. La lección 17 activaba la autenticación de DRF con tres líneas y una migración; aquí no hay usuarios, ni contraseñas, ni tokens, ni permisos.

Y hacerlo a mano no es tan malo como suena —son unas cuarenta líneas— porque el sistema de dependencias de la lección anterior encaja exactamente con esto. Lo que hay que saber es **qué decisiones estás tomando tú que Django tomaba por ti**, porque dos de ellas se pueden equivocar en silencio.

> [!objetivo] Qué vas a aprender
>
> Montar autenticación por token completa con dependencias, elegir el cifrado de contraseñas y saber lo que cuesta, evitar las dos trampas del JWT, y componer permisos por papel.

## Las contraseñas

La primera decisión. La biblioteca que se recomienda hoy:

```bash
pip install "pwdlib[argon2]"
```

```python
from pwdlib import PasswordHash

hasher = PasswordHash.recommended()


def cifrar(contrasena: str) -> str:
        return hasher.hash(contrasena)


def comprobar(contrasena: str, cifrada: str) -> bool:
        return hasher.verify(contrasena, cifrada)
```

Lo que produce:

```salida
$argon2id$v=19$m=65536,t=3,p=4$XmW/s8CHntK7sQmdOth4hg$G9lfJu...
algoritmo: argon2id
```

Argon2id, que es lo que se recomienda hoy y es más resistente que el PBKDF2 que usa Django por defecto. **Nunca escribas esto tú**: un resumen de contraseña hecho a mano es un fallo de seguridad garantizado, y la lección 32 del módulo 4 explicaba por qué.

Casi todos los tutoriales que encontrarás usan `passlib` con `bcrypt`. `passlib` lleva años sin mantenimiento y da problemas con las versiones recientes de `bcrypt`; si ves ese código, es de antes.

> [!aviso] Los 86 milisegundos que paran el servidor
>
> ```salida
> cifrar:    86 ms
> comprobar: 55 ms
> ```
>
> Eso es **a propósito**: un algoritmo de contraseñas es lento adrede, para que probar millones cueste. La lección 32 del módulo 4 lo explicaba.
>
> Y aquí choca de frente con lo medido en la lección anterior:
>
> ```python
> @app.post('/token')
> async def entrar(datos: OAuth2PasswordRequestForm = Depends()):
>         if not comprobar(datos.password, fila['cifrada']):    # 55 ms bloqueando
>                 ...
> ```
>
> **Cincuenta y cinco milisegundos de procesador dentro de una función asíncrona**, que es exactamente el caso que multiplicaba por siete el tiempo de todas las peticiones. No es espera, es cálculo, así que nada lo va a soltar.
>
> Y es peor de lo que parece por dónde ocurre: el punto de acceso del token es el que recibe ráfagas, tanto de gente entrando por la mañana como de quien esté probando contraseñas. Veinte intentos simultáneos son **más de un segundo con el servidor entero parado**, incluidas las peticiones que no tienen nada que ver.
>
> Dos arreglos, y el primero basta casi siempre:
>
> ```python
> @app.post('/token')
> def entrar(datos: OAuth2PasswordRequestForm = Depends()):
>         ...
> ```
>
> **Quitar el `async`.** FastAPI la manda a un hilo y el bucle sigue libre. Es la regla de la lección anterior aplicada literalmente.
>
> ```python
> from anyio import to_thread
>
> correcta = await to_thread.run_sync(comprobar, datos.password, fila['cifrada'])
> ```
>
> O mandar solo ese trozo a un hilo, si el resto de la función sí es asíncrono, que es lo normal cuando hay que consultar la base de datos.
>
> Es la primera vez en el curso que una decisión de seguridad y una de rendimiento chocan directamente, y la respuesta no es hacer el cifrado más rápido: es sacarlo del bucle.

## Los tokens

```python
import jwt
from datetime import datetime, timedelta, timezone

CLAVE = os.environ['CLAVE_JWT']
ALGORITMO = 'HS256'


def crear_token(sujeto: str, minutos: int = 15) -> str:
        ahora = datetime.now(timezone.utc)
    carga = {'sub': sujeto, 'iat': ahora, 'exp': ahora + timedelta(minutes=minutos)}
    return jwt.encode(carga, CLAVE, algorithm=ALGORITMO)


def leer_token(token: str) -> dict:
        return jwt.decode(token, CLAVE, algorithms=[ALGORITMO])
```

Y hace lo que debe:

```salida
carga: {'sub': 'ana', 'iat': 1790107325, 'exp': 1790108225}

token caducado:          ExpiredSignatureError: Signature has expired
token con la firma rota: InvalidSignatureError: Signature verification failed
```

PyJWT comprueba bastantes cosas de fábrica, cosa que se agradece:

```salida
{'verify_signature': True, 'verify_exp': True, 'verify_nbf': True,
 'verify_iat': True, 'verify_aud': True, 'verify_iss': True, ...}
```

> [!aviso] Las dos trampas del JWT hecho a mano
>
> **Primera: el algoritmo `none`.** Es el ataque clásico. Alguien forja un token diciendo que no lleva firma:
>
> ```salida
> token forjado sin clave:  eyJhbGciOiJub25lIi...
> cabecera: {'alg': 'none', 'typ': 'JWT'}
> ```
>
> Y lo que pasa al leerlo:
>
> ```salida
> jwt.decode(t, CLAVE, algorithms=['HS256'])          -> InvalidAlgorithmError
> jwt.decode(t, CLAVE, algorithms=['HS256', 'none'])  -> InvalidKeyError
> jwt.decode(t, CLAVE)                                -> DecodeError: It is required
>     that you pass in a value for the "algorithms" argument when calling decode()
> ```
>
> **PyJWT se niega a funcionar sin la lista de algoritmos.** Esa tercera línea es la protección importante, y merece reconocerse: la biblioteca prefiere romperse a hacer algo inseguro por defecto. Otras del mismo tipo, en otros lenguajes, aceptaban el token forjado.
>
> Así que la regla es simple: **pasa siempre `algorithms=[...]` con una lista de uno**, y nunca la construyas leyendo la cabecera del token que te acaban de mandar, que es como se cometía el fallo original.
>
> **Segunda: lo que metes dentro.** Es la lección 7 y aquí se ve:
>
> ```salida
> jwt.decode(t, options={'verify_signature': False})
> -> {'sub': 'ana', 'rol': 'admin'}
> ```
>
> Sin clave ninguna. **El JWT está firmado, no cifrado**, y ahí está el papel de la persona a la vista de cualquiera.
>
> Lo que importa de verdad no es que se lea, sino que **se congela**: si quitas el papel de administrador a alguien, su token seguirá diciendo que lo tiene hasta que caduque. Por eso en el código de esta lección el papel **no va en el token**: dentro va solo el sujeto, y el papel se consulta en cada petición.
>
> Es más lento —una consulta por petición, que es lo que la lección 17 midió— y es lo correcto.

## El flujo completo

Aquí es donde las dependencias de la lección anterior se lucen. Tres, encadenadas:

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

esquema = OAuth2PasswordBearer(tokenUrl='token')


async def usuario_actual(token: Annotated[str, Depends(esquema)]) -> Usuario:
        credenciales = HTTPException(
        status.HTTP_401_UNAUTHORIZED, 'No se pudo validar el token.',
        headers={'WWW-Authenticate': 'Bearer'})
    try:
                carga = leer_token(token)
    except jwt.PyJWTError:
                raise credenciales
    fila = await buscar_usuario(carga.get('sub'))
    if fila is None:
                raise credenciales
    return fila


async def usuario_activo(u: Annotated[Usuario, Depends(usuario_actual)]) -> Usuario:
        if not u.activo:
                raise HTTPException(status.HTTP_403_FORBIDDEN, 'Cuenta desactivada.')
    return u


UsuarioActivo = Annotated[Usuario, Depends(usuario_activo)]
```

Y usarlo es un argumento:

```python
@app.get('/yo')
async def yo(u: UsuarioActivo) -> Usuario:
        return u
```

Funcionando:

```salida
GET /publico sin token  -> 200
GET /yo sin token       -> 401  {"detail": "Not authenticated"}
                                 WWW-Authenticate: Bearer
POST /token clave mala  -> 401  {"detail": "Usuario o contraseña incorrectos."}
POST /token correcto    -> 200  ['access_token', 'token_type']
GET /yo con token       -> 200  {"usuario": "ana", "activo": true, "rol": "editor"}
cuenta desactivada      -> 403  {"detail": "Cuenta desactivada."}
```

Cuatro detalles de ese código:

**La misma excepción para los tres fallos.** Token ilegible, caducado o de un usuario que ya no existe dan el mismo `401` con el mismo texto. Decir cuál de los tres fue es información gratis para quien esté probando.

**`WWW-Authenticate: Bearer`** es la cabecera que dice cómo identificarse, y es la que la lección 7 buscaba al otro lado.

**`401` sin token y `403` con uno válido pero sin permiso.** Es la distinción de la lección 18, y aquí hay que implementarla a conciencia.

**Y `OAuth2PasswordBearer` hace algo más que validar**: rellena el botón de autorizar de la documentación navegable, así que se puede probar la API entera identificado desde el navegador. Eso, en DRF, era el navegador de la API de la lección 12.

## Permisos por papel

Una fábrica de dependencias, que es el patrón que hay que conocer:

```python
def exigir_rol(*roles: str):
        async def comprobador(u: Annotated[Usuario, Depends(usuario_activo)]) -> Usuario:
                if u.rol not in roles:
                        raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f'Hace falta uno de estos papeles: {", ".join(roles)}.')
        return u
    return comprobador
```

```python
@app.delete('/libros/{libro_id}')
async def borrar(libro_id: int,
                 u: Annotated[Usuario, Depends(exigir_rol('editor', 'admin'))]):
        return {'borrado': libro_id, 'por': u.usuario}
```

```salida
DELETE /libros/7 con rol editor -> 200  {"borrado": 7, "por": "ana"}
```

Y se aplica a un enrutador entero, que es lo de la lección 24:

```python
router = APIRouter(
    prefix='/api/admin',
    dependencies=[Depends(exigir_rol('admin'))],
)
```

Esa forma, con la lista de dependencias en el enrutador, es la que conviene por defecto: **protege todo lo que cuelgue de él**, incluidas las rutas que añadas mañana. Es la idea de "cerrado por defecto" de la lección 12, aquí por grupos de rutas.

> [!aviso] Los permisos de objeto siguen siendo tuyos
>
> La lección 18 midió que un permiso de objeto no filtra el listado y que una acción propia con la consulta directa se salta las defensas. **En FastAPI esos dos problemas no existen porque no existe el mecanismo**: no hay permisos de objeto que puedan dar falsa sensación de estar cubiertos.
>
> Lo que hay es lo mismo que allí funcionaba: filtrar en la consulta.
>
> ```python
> @app.get('/api/resenas/')
> async def mis_resenas(u: UsuarioActivo, sesion: SesionBD) -> list[ResenaSalida]:
>         consulta = select(Resena).where(Resena.autor_id == u.id)
>     return list(await sesion.scalars(consulta))
>
>
> @app.patch('/api/resenas/{resena_id}')
> async def editar(resena_id: int, datos: ResenaActualizar,
>                  u: UsuarioActivo, sesion: SesionBD) -> ResenaSalida:
>         resena = await sesion.get(Resena, resena_id)
>     if resena is None or resena.autor_id != u.id:
>                 raise HTTPException(404)          # 404, no 403: no confirma que exista
>     ...
> ```
>
> Esa comprobación hay que escribirla **en cada ruta**, y ahí está el riesgo: es fácil olvidarla en la que escribas con prisa el viernes.
>
> La defensa es una dependencia que busque el objeto y compruebe el dueño de una vez:
>
> ```python
> async def resena_propia(resena_id: int, u: UsuarioActivo, sesion: SesionBD) -> Resena:
>         resena = await sesion.get(Resena, resena_id)
>     if resena is None or resena.autor_id != u.id:
>                 raise HTTPException(404)
>     return resena
>
>
> @app.patch('/api/resenas/{resena_id}')
> async def editar(resena: Annotated[Resena, Depends(resena_propia)],
>                  datos: ResenaActualizar) -> ResenaSalida:
>         ...
> ```
>
> Fíjate en lo que consigue: la ruta **ya no recibe un identificador, recibe la reseña que sabes que es suya.** Es imposible olvidarse de comprobar, porque no hay nada que comprobar. Es la misma idea que `self.get_object()` en la lección 18, aquí escrita por ti y con la ventaja de que se ve en la firma.

> [!consejo] Lo que falta para que esto sea publicable
>
> Las cuarenta líneas son el esqueleto. Tres cosas más, y las tres las tenía Django hechas.
>
> **Límite de intentos en el punto de acceso del token.** No viene nada, y es el aviso de la lección 17. Se monta con `slowapi` o con un contador en Redis:
>
> ```python
> from slowapi import Limiter
>
> limiter = Limiter(key_func=lambda p: p.client.host)
>
>
> @app.post('/token')
> @limiter.limit('5/minute')
> def entrar(peticion: Request, datos: FormularioEntrada = Depends()):
>         ...
> ```
>
> **El refresco.** Quince minutos de token de acceso sin refresco significa volver a escribir la contraseña cada cuarto de hora. El de refresco va en una galleta `HttpOnly` y se guarda en la base de datos para poder revocarlo, que es lo que la lección 17 vio con la lista negra.
>
> **Y la revocación.** Un token firmado no se puede anular. Cerrar sesión de verdad exige una lista de identificadores revocados en Redis, con caducidad igual a la del token. Sin eso, "cerrar sesión" es borrarlo del cliente y confiar.
>
> Ese es el coste real de no usar Django: nada de esto es difícil, y son tres tardes más y tres sitios más donde equivocarse.

> [!resumen] En resumen
>
> FastAPI no trae usuarios, contraseñas, tokens ni permisos, y montarlo son unas cuarenta líneas que encajan bien con el sistema de dependencias. Las contraseñas se cifran con la biblioteca recomendada hoy, que usa Argon2id y es más resistente que lo que trae Django; los tutoriales que usan la biblioteca antigua son de antes. Y ahí aparece el primer choque del curso entre seguridad y rendimiento: **comprobar una contraseña cuesta 55 milisegundos de procesador**, que dentro de una función asíncrona paran el bucle entero, justo en el punto de acceso que recibe ráfagas; se arregla quitando el `async` o mandando ese trozo a un hilo. Los tokens se firman con PyJWT, que comprueba bastante de fábrica y —lo importante— **se niega a descodificar sin que le digas qué algoritmos aceptas**, que es lo que impide el ataque del algoritmo nulo. El contenido del token se lee sin clave, así que dentro va solo el sujeto y el papel se consulta en cada petición, porque lo que se mete en un token se congela hasta que caduca. El flujo son tres dependencias encadenadas, con la misma excepción para los tres modos de fallo, la cabecera que dice cómo identificarse, y la distinción entre no estar identificado y no tener permiso. Los papeles se comprueban con una fábrica de dependencias, que puesta en el enrutador protege también las rutas de mañana. Los permisos de objeto son tuyos y el patrón que evita olvidarlos es una dependencia que **devuelva el objeto ya comprobado**, de modo que la ruta no reciba un identificador sino la cosa que sabes que es suya. Y faltan tres piezas que Django tenía hechas: límite de intentos, refresco y revocación.

> [!ejercicio] Practica
>
> 1. Cifra una contraseña y mira el algoritmo que usa la biblioteca recomendada.
> 2. Mide cuánto tardan el cifrado y la comprobación.
> 3. Pon la comprobación en una ruta asíncrona y mide diez entradas simultáneas.
> 4. Quita el `async` y vuelve a medir.
> 5. Crea un token, descodifícalo y mira su contenido.
> 6. Crea uno caducado y otro con la firma alterada, y compara los errores.
> 7. Forja un token con el algoritmo nulo e intenta colarlo de tres maneras.
> 8. Descodifica un token sin clave y comprueba que se lee entero.
> 9. Monta las tres dependencias encadenadas.
> 10. Comprueba los cinco casos: sin token, con token malo, correcto, cuenta inactiva y sin permiso.
> 11. Escribe la fábrica de dependencias que exige un papel.
> 12. Aplícala a un enrutador entero y añade una ruta nueva sin tocar nada.
> 13. Escribe la dependencia que devuelve un objeto ya comprobado.
> 14. Pon límite de intentos al punto de acceso del token.
