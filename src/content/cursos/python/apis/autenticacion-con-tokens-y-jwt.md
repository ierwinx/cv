---
titulo: "Autenticación con tokens y JWT"
resumen: "El token que se guarda en claro y no caduca, el JWT que consulta la base de datos igual que él, y la palabra que hay que escribir para que te dejen entrar."
minutos: 17
orden: 17
---

La lección 7 vio la autenticación desde el lado de quien consume una API. Ahora toca escribirla, y DRF trae dos caminos: su sistema de tokens, que viene incluido, y JWT, que necesita un paquete.

El argumento habitual para elegir entre los dos es que el JWT no consulta la base de datos. **Medido aquí, los dos consultan.**

> [!objetivo] Qué vas a aprender
>
> Montar autenticación por token y por JWT, conocer las tres limitaciones del token de DRF, medir lo que cuesta cada uno de verdad, y elegir con criterio en vez de por costumbre.

## Los esquemas que trae DRF

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}
```

| Esquema | Para qué |
| --- | --- |
| `SessionAuthentication` | La cookie de Django. Para tu propio sitio web |
| `BasicAuthentication` | Usuario y contraseña en cada petición. Para pruebas |
| `TokenAuthentication` | Un token por usuario en la base de datos |
| `RemoteUserAuthentication` | Cuando autentica un servidor delante |

**El orden importa**: DRF prueba una tras otra y se queda con la primera que devuelva un usuario. Y si ninguna lo hace, el usuario es anónimo y decide el permiso.

Un detalle que hay que conocer: **la de sesión comprueba el CSRF**. Es correcto —una cookie viaja sola y hay que protegerla, que es la lección 42 del módulo 4— y es la causa del `403` misterioso al probar desde el navegador estando identificado. La de token no lo comprueba, porque una cabecera no la manda el navegador por su cuenta.

## El token de DRF

Se activa con una aplicación, una migración y una ruta:

```python
INSTALLED_APPS = ['rest_framework.authtoken', ...]
```

```python
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [path('api/token/', obtain_auth_token)]
```

Y ya funciona:

```salida
POST /api/token/  {"username": "ana", "password": "clave-larga-123"}
200  {"token": "6cda1889e2aac40d35697a4c944f66c1bd9ffabc"}
```

```salida
GET /api/autores/   con  Authorization: Token 6cda1889...
200
```

> [!aviso] La palabra es `Token`, no `Bearer`
>
> ```salida
> "Token 6cda1889..."   -> 200
> "token 6cda1889..."   -> 200
> "Bearer 6cda1889..."  -> 401
> ```
>
> Y esto confunde a todo el mundo, con razón: **el resto del mundo usa `Bearer`**, que es lo que dice el estándar de OAuth y lo que vimos en la lección 7. DRF eligió su propia palabra.
>
> La consecuencia práctica es que quien consuma tu API va a probar con `Bearer` primero, va a recibir un `401` y va a pensar que su token está mal. Al menos la palabra no distingue mayúsculas.
>
> Si quieres usar `Bearer`, son cuatro líneas:
>
> ```python
> from rest_framework.authentication import TokenAuthentication
>
>
> class AutenticacionPortador(TokenAuthentication):
>         keyword = 'Bearer'
> ```
>
> Merece la pena por dos motivos: es lo que espera todo el mundo, y es lo mismo que usa JWT, así que cambiar de uno a otro después no obliga a tocar los clientes.

## Las tres limitaciones del token de DRF

Hay que conocerlas antes de elegirlo, porque son de diseño y no se configuran:

```salida
clave:    6cda1889e2aac40d35697a4c944f66c1bd9ffabc   (40 hex)
campos:   ['key', 'user', 'created']
clave primaria: key
```

**Uno por usuario.** El usuario es único en la tabla, así que una persona no puede tener un token para el móvil y otro para un guion. Cerrar sesión en un sitio la cierra en todos.

**No caduca.** No hay campo de caducidad ni comprobación. Un token emitido hoy vale dentro de cinco años.

**Se guarda en claro:**

```salida
en la base de datos: ('6cda1889e2aac40d35697a4c944f66c1bd9ffabc', 1)
```

Ahí está la clave tal cual. Django se toma muchas molestias en guardar las contraseñas con resumen —la lección 32 del módulo 4— y luego guarda estos tokens sin ninguna, aunque den el mismo acceso.

**Quien consiga una copia de la base de datos tiene todas las cuentas**, sin romper nada. Una copia de seguridad mal guardada, un volcado para depurar, un desarrollador con acceso de lectura: cualquiera de esas cosas es suficiente.

Lo que esto significa en la práctica:

**Vale para APIs internas**, guiones de la casa, integraciones entre servicios tuyos. Es simple y funciona.

**No vale para una aplicación con usuarios reales.** Ahí hacen falta tokens que caduquen, que se revoquen y que no estén en claro.

Y hay paquetes que lo arreglan: `django-rest-knox` da varios tokens por usuario, con caducidad y guardados con resumen, manteniendo la simplicidad.

## JWT

El paquete de referencia:

```bash
pip install djangorestframework-simplejwt
```

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
```

```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView, TokenVerifyView)

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refrescar/', TokenRefreshView.as_view()),
    path('api/token/verificar/', TokenVerifyView.as_view()),
]
```

Y devuelve los dos tokens de la lección 7:

```salida
POST /api/token/  {"username": "ana", "password": "clave-larga-123"}
200  {"access": "...", "refresh": "..."}

longitud del de acceso: 231 caracteres

cabecera: {"alg": "HS256", "typ": "JWT"}
carga:    {"token_type": "access", "exp": 1790105720, "iat": 1790105420,
           "jti": "7926d06f23d241cdb608c9c5934fe6b5", "user_id": "1"}

el de acceso vive 5 minutos
el de refresco vive 1 día
```

Cinco minutos de fábrica, que es conservador y correcto. Y fíjate en el `jti`, un identificador único del token: es lo que permite anotarlo en una lista negra, que es lo único que hace revocable un JWT.

> [!aviso] El JWT también consulta la base de datos
>
> El argumento que se repite para elegir JWT es que evita ir a la base de datos en cada petición. Medido contra esta API:
>
> ```salida
> sin identificar   -> 401,  0 consultas
> Token de DRF      -> 200,  2 consultas  (1 de autenticación)
> JWT               -> 200,  2 consultas  (1 de autenticación)
> ```
>
> **La misma consulta.** Porque `simplejwt` trae el usuario de la base de datos para comprobar que sigue activo, y hace bien:
>
> ```salida
> SELECT "auth_user"."id", "auth_user"."password", "auth_user"."last_login", ...
> ```
>
> Y se comprueba desactivando la cuenta con un token ya emitido:
>
> ```salida
> usuario desactivado, con el JWT ya emitido  -> 401
> usuario desactivado, con el Token de DRF    -> 401
> ```
>
> Los dos se cortan al instante, **porque los dos consultan**.
>
> Eso no significa que el argumento sea falso en general: un JWT **puede** validarse sin consultar nada, y ahí es donde gana, en arquitecturas con varios servicios donde el que valida no tiene la base de datos de usuarios. Lo que es falso es que la configuración por defecto de `simplejwt` lo haga.
>
> Y si lo configuras para que no consulte, pierdes lo de arriba: un usuario desactivado seguiría entrando hasta que caduque su token. Es un intercambio, no una mejora. **Con un solo servicio Django y una sola base de datos, el JWT no ahorra ninguna consulta.**

## Elegir

La decisión, sin la parte de moda:

|  | Token de DRF | JWT | Sesión |
| --- | --- | --- | --- |
| Caduca | No | Sí | Sí |
| Se revoca | Al instante | **No**, salvo lista negra | Al instante |
| Varios por usuario | No | Sí | Sí |
| Guardado en claro | **Sí** | No se guarda | No |
| Consultas por petición | 1 | 1 (por defecto) | 1 |
| Sirve entre servicios | No | **Sí** | No |
| CSRF | No aplica | No aplica | **Sí** |

**Si tu API la consume tu propio sitio web**, en el mismo dominio, la sesión es la respuesta y no hace falta nada más. Es lo que menos código tiene y lo más seguro, porque la cookie puede ser `HttpOnly` y el JavaScript de la página no puede leerla.

**Si es una aplicación móvil o un cliente ajeno**, tokens. Y entonces JWT si quieres caducidad y refresco, o Knox si quieres lo mismo con revocación instantánea.

**Si tienes varios servicios** que tienen que verificar quién eres sin compartir base de datos, JWT es la única de las tres que sirve.

**Si es una API interna entre programas tuyos**, el token de DRF basta, guardado en el entorno.

> [!aviso] Tres formas de estropear el JWT
>
> **Firmarlo con la clave de Django.** Es lo que hace `simplejwt` por defecto: usa `SECRET_KEY`. Funciona y significa que **rotar la clave de Django invalida todos los tokens a la vez**, cosa que a lo mejor no esperabas al hacerlo por otro motivo. Se puede separar:
>
> ```python
> SIMPLE_JWT = {'SIGNING_KEY': os.environ['CLAVE_JWT']}
> ```
>
> **Meter datos dentro.** Es la lección 7: el JWT se lee, no se descifra. Añadir el correo, el rol o el identificador del cliente a la carga es publicarlos. Y además esos datos **se quedan congelados**: si quitas el rol de administrador a alguien, su token seguirá diciendo que lo es hasta que caduque.
>
> **Alargar la vida del de acceso.** La tentación es ponerlo a un día para no implementar el refresco. Con eso pierdes lo único que hace seguro un JWT, que es que dure poco, y te quedas con un token no revocable de veinticuatro horas. Si no vas a implementar el refresco, usa otra cosa.
>
> Los ajustes que conviene tocar:
>
> ```python
> from datetime import timedelta
>
> SIMPLE_JWT = {
>     'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
>     'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
>     'ROTATE_REFRESH_TOKENS': True,      # cada refresco da uno nuevo
>     'BLACKLIST_AFTER_ROTATION': True,   # y el viejo deja de valer
>     'SIGNING_KEY': os.environ['CLAVE_JWT'],
> }
> ```
>
> Las dos del medio necesitan `rest_framework_simplejwt.token_blacklist` en las aplicaciones instaladas, y son las que permiten cerrar sesión de verdad. Sin ellas, "cerrar sesión" en una API con JWT es borrar el token del cliente y confiar.

> [!nota] Dos cosas que hay que hacer sí o sí
>
> **Pedir el token solo por HTTPS.** Un token es la contraseña, y viaja en cada petición. Es `SECURE_SSL_REDIRECT` de la lección 42 del módulo 4, y aquí no es opcional.
>
> **Poner límite de intentos al punto de acceso del token.** Sin él, tu API es un banco de pruebas de contraseñas ilimitado:
>
> ```python
> from rest_framework.throttling import AnonRateThrottle
>
>
> class LimiteLogin(AnonRateThrottle):
>         scope = 'login'
>
>
> class VistaToken(TokenObtainPairView):
>         throttle_classes = [LimiteLogin]
> ```
>
> ```python
> REST_FRAMEWORK = {
>     'DEFAULT_THROTTLE_RATES': {'login': '5/min', 'anon': '100/hour'},
> }
> ```
>
> Cinco por minuto es suficiente para una persona y no para un programa. Es el punto de acceso más atacado de cualquier API y el que más se olvida, porque en las pruebas nunca falla.
>
> Y el mensaje de error del token debe ser igual de vago se equivoque en lo que se equivoque, que es lo que DRF hace: `{"detail": "Token inválido."}`, sin decir si el usuario existe.

> [!resumen] En resumen
>
> DRF trae cuatro esquemas de autenticación que se prueban en orden hasta que uno devuelve usuario, y el de sesión comprueba el CSRF, que es la causa del `403` al probar desde el navegador. Su sistema de tokens se monta en tres pasos y usa la palabra `Token` en lugar de `Bearer`, que es lo que espera todo el mundo y conviene cambiar en cuatro líneas. Tiene tres limitaciones de diseño: uno por usuario, sin caducidad, y **guardado en claro en la base de datos**, de modo que una copia mal guardada entrega todas las cuentas; vale para APIs internas y no para una aplicación con usuarios reales. JWT añade caducidad y refresco, con cinco minutos y un día de fábrica. El argumento habitual para preferirlo —que no consulta la base de datos— **es falso con la configuración por defecto**: medido, tanto el token de DRF como el JWT cuestan una consulta por petición, porque el segundo trae el usuario para comprobar que sigue activo, y por eso desactivar una cuenta corta los dos al instante; el JWT gana cuando hay varios servicios que validan sin tener la base de datos de usuarios. Tres formas de estropearlo: firmarlo con la clave de Django, con lo que rotarla invalida todo; meter datos dentro, que se publican y además se congelan; y alargar la vida del de acceso para no implementar el refresco, que es quedarse con lo peor de las dos opciones. Y dos cosas obligatorias: HTTPS, y límite de intentos en el punto de acceso del token, que es el más atacado y el que nunca falla en las pruebas.

> [!ejercicio] Practica
>
> 1. Activa la autenticación por token y pide uno con usuario y contraseña.
> 2. Úsalo con las tres formas de escribir la palabra y anota cuál falla.
> 3. Escribe la subclase que acepta la palabra que usa todo el mundo.
> 4. Mira en la base de datos cómo está guardado el token.
> 5. Comprueba que el modelo no tiene campo de caducidad ni admite dos por usuario.
> 6. Instala JWT y pide un par de tokens.
> 7. Descodifica el de acceso y calcula cuánto vive.
> 8. Cuenta las consultas de una petición con token y con JWT, y compara.
> 9. Desactiva el usuario y comprueba qué pasa con cada uno.
> 10. Refresca un token de acceso con el de refresco.
> 11. Activa la rotación y la lista negra, y comprueba que el de refresco viejo deja de valer.
> 12. Pon límite de intentos al punto de acceso del token y provoca el rechazo.
