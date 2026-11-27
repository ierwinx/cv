---
titulo: "Seguridad"
resumen: "Lo que Django protege solo, los tres huecos que deja el escape automático, y el ajuste con nombre en español que aparece en claro en la página de error."
minutos: 18
orden: 42
---

Django trae bastante seguridad de fábrica, y eso tiene una cara mala: es fácil confiarse sin saber qué está protegido y qué no. Esta lección recorre las protecciones una a una, midiendo qué hacen, y después los sitios donde hay que poner algo de tu parte.

Y recoge las dos deudas que quedaron apuntadas: la cookie de sesión de la lección 35 y la dirección del panel de la lección 30.

> [!objetivo] Qué vas a aprender
>
> Saber qué protege Django solo y con qué middleware, conocer los tres huecos del escape automático de plantillas, evitar la inyección de SQL y la redirección abierta, configurar las cabeceras y las cookies de producción, y tener una lista de repaso antes de desplegar.

## Lo que ya está puesto

```salida
1. django.middleware.security.SecurityMiddleware      <-- seguridad
2. django.contrib.sessions.middleware.SessionMiddleware
3. django.middleware.common.CommonMiddleware
4. django.middleware.csrf.CsrfViewMiddleware          <-- seguridad
5. django.contrib.auth.middleware.AuthenticationMiddleware
6. django.contrib.messages.middleware.MessageMiddleware
7. django.middleware.clickjacking.XFrameOptionsMiddleware
```

Tres de los siete son de seguridad, y vienen activados. **Quitar uno para que algo "funcione" es casi siempre el error**, y es la causa de la mitad de los agujeros que se ven por ahí.

Y las cabeceras que salen sin configurar nada:

```salida
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

Cuatro cabeceras de protección, **por defecto**. Esto es nuevo y conviene saberlo, porque los tutoriales de hace unos años te dicen que las actives a mano: en Django 6 ya están, y `X-Frame-Options` vale `DENY` y no `SAMEORIGIN`, que es más estricto.

Lo que hacen: nadie puede meter tu sitio en un marco (que es como se roban las pulsaciones), el navegador no adivina el tipo de los ficheros, no se filtra a otros sitios de dónde vienen tus visitas, y las pestañas que abras no pueden manipular la tuya.

## CSRF

```python
c = Client(enforce_csrf_checks=True)
c.post('/contactos/contacta/', {...})
```

```salida
403 Forbidden (CSRF cookie not set.)
```

Eso es lo que impide que otra página ponga un formulario que envíe datos a la tuya aprovechando que estás identificado. La protección es el `{% csrf_token %}` que lleva cada formulario desde la lección 25, y el `403` que sale sin él es lo que a veces se intenta "arreglar" con un `@csrf_exempt`. **Ese decorador quita la protección de esa vista entera.**

Cuándo hace falta tocar algo de verdad:

**Con peticiones desde JavaScript**, que tienen que mandar la cabecera `X-CSRFToken`. La documentación trae la función para leer la cookie.

**Detrás de un proxy o con varios dominios**, con `CSRF_TRUSTED_ORIGINS`, que viene vacío y donde van los orígenes con su esquema:

```python
CSRF_TRUSTED_ORIGINS = ['https://ejemplo.es', 'https://www.ejemplo.es']
```

## XSS: lo que el escape hace y lo que no

La lección 17 ya midió lo principal:

```salida
{{ x }}       ->  &lt;script&gt;alert(&quot;robado&quot;)&lt;/script&gt;
{{ x|safe }}  ->  <script>alert("robado")</script>
```

El escape automático cubre el caso normal, que es texto dentro de HTML. Lo que hay que saber son los tres sitios donde **no basta**, porque ahí el escape es correcto y aun así hay un agujero.

**Un atributo sin comillas:**

```html
<a href={{ x }}>
```

```salida
<a href=x onmouseover=alert(1)>
```

Ahí no hay ningún carácter que escapar: el valor es texto normal. Pero como el atributo no lleva comillas, **el espacio acaba el atributo y empieza otro**. Arreglo: comillas siempre, sin excepción.

**Una dirección que viene de fuera:**

```html
<a href="{{ x }}">enlace</a>
```

```salida
<a href="javascript:alert(1)">enlace</a>
```

Lo mismo: `javascript:alert(1)` no tiene nada que escapar. El escape protege el HTML, no el significado de una URL. Arreglo: comprobar el esquema antes de pintar un enlace que venga de un usuario.

**Datos dentro de una etiqueta de JavaScript.** Aquí el escape sí actúa, y produce algo que no es un agujero pero está roto:

```salida
<script>var u = "&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;";</script>
```

Ha bloqueado el ataque, pero el valor en JavaScript ya no es el que era, porque dentro de una etiqueta de guion el navegador no descodifica las entidades. Para esto hay una herramienta hecha:

```html
{{ datos|json_script:"datos" }}
```

```salida
<script id="datos" type="application/json">"\u003C/script\u003E\u003Cscript\u003Ealert(1)\u003C/script\u003E"</script>
```

Escapa con secuencias de JavaScript, que es lo correcto en ese contexto, y se lee con `JSON.parse(document.getElementById('datos').textContent)`.

> [!aviso] `safe` y `mark_safe` son la puerta de la mitad de los agujeros
>
> Son la manera de decirle a Django "de esto me encargo yo", y casi nunca es verdad.
>
> La regla práctica: **`|safe` solo sobre algo que tú has construido**, nunca sobre algo que ha escrito un usuario. Y cuando montes HTML en Python, `format_html` de la lección 19, que escapa los huecos:
>
> ```python
> format_html('<a href="{}">{}</a>', url, nombre)
> ```
>
> El caso donde más se cae: un campo de texto con formato, donde el usuario escribe algo tipo Markdown y se pinta con `|safe`. Si el conversor deja pasar HTML —y muchos lo hacen por defecto—, ahí hay un agujero de libro. Lo que hace falta es limpiar el resultado con una biblioteca de saneado, con una lista blanca de etiquetas.
>
> Y `{% autoescape off %}`, que apaga el escape de un bloque entero, es lo mismo pero peor, porque afecta a todo lo que haya dentro y a lo que alguien añada después.

## Inyección de SQL

```python
Contacto.objects.filter(nombre="x' OR '1'='1")
```

```salida
filas: 0 de 17
```

El ORM manda el SQL y los datos **por separado**, así que no hay nada que inyectar. Lo mismo con un cursor, si se hace bien:

```salida
parametrizado:  0 filas
concatenado:   17 filas   <-- todas
```

Diecisiete de diecisiete. Esa es la diferencia entre pasar los valores como segundo argumento y meterlos en la cadena. Y es la única regla que hay que recordar aquí:

```python
cursor.execute('select ... where nombre = %s', [valor])     # bien
cursor.execute(f'select ... where nombre = {valor!r}')      # mal
```

Ese `%s` no es el formato de Python: es un hueco que rellena el conector. No se pone entre comillas.

Y una advertencia sobre depurar: `str(consulta.query)` enseña los valores metidos en el SQL, y **eso no es lo que se manda**. Es una representación para mirar. Ver ahí el valor sin escapar no significa que haya un problema.

## Redirección abierta

Una vista que redirige a donde diga un parámetro se puede usar para llevar gente a otro sitio desde una dirección que parece tuya. Es el `?next=` de la lección 32, y Django trae la comprobación:

```python
from django.utils.http import url_has_allowed_host_and_scheme
```

```salida
'/contactos/'          permitido: True
'http://ejemplo.es/x'  permitido: True
'https://malo.es/'     permitido: False
'//malo.es/'           permitido: False
'javascript:alert(1)'  permitido: False
'/\\malo.es'           permitido: False
```

Las tres últimas son las que uno no se le ocurren solo, y por eso esto no se escribe a mano: `//malo.es` es una dirección absoluta sin esquema, y la barra con contrabarra la interpretan algunos navegadores como dos barras.

## Los ajustes de producción

Todo esto va en `produccion.py`, que es la lección 40:

| Ajuste | Por defecto | Producción |
| --- | --- | --- |
| `SECURE_SSL_REDIRECT` | `False` | `True` |
| `SESSION_COOKIE_SECURE` | `False` | `True` |
| `CSRF_COOKIE_SECURE` | `False` | `True` |
| `SECURE_HSTS_SECONDS` | `0` | `31536000` |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `False` | `True` |

```salida
http -> 301 https://testserver/contactos/
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Las dos cookies seguras son la deuda de la lección 35, y hacen que la sesión y el testigo CSRF **no viajen nunca por HTTP**. Sin eso, basta con estar en la misma red que el usuario para quedarse con su sesión, y eso pasa incluso en un sitio que redirige a HTTPS, porque la primera petición va sin cifrar.

Las que ya vienen bien y no hay que tocar: `SESSION_COOKIE_HTTPONLY` está en `True` (JavaScript no puede leer la sesión) y las dos cookies son `SameSite=Lax`, que es la defensa moderna contra el CSRF.

> [!aviso] HSTS es difícil de deshacer
>
> `SECURE_HSTS_SECONDS = 31536000` le dice al navegador: "durante un año, no vuelvas a hablar conmigo por HTTP, ni aunque te lo pidan".
>
> El navegador **hace caso y lo recuerda**, así que si el certificado caduca o decides quitar HTTPS de un subdominio, los que ya visitaron el sitio no pueden entrar, y no hay nada que puedas hacer desde el servidor.
>
> Por eso se empieza con un valor corto, se comprueba que todo va por HTTPS, y se sube. Y `includeSubDomains` afecta a **todos** los subdominios, incluidos los que no sabías que existían.
>
> `preload` es un paso más: mete tu dominio en una lista que traen los navegadores de fábrica. Salir de esa lista tarda meses. No lo pongas hasta estar seguro.

## Lo que enseña la página de error

```salida
404 con DEBUG=True:   2972 bytes, con la lista de rutas registradas
404 con DEBUG=False:    179 bytes
```

Y la de error quinientos enseña mucho más: el código fuente alrededor del fallo, **las variables locales de cada marco de la pila**, la petición entera con sus cookies, y todos los ajustes.

Django tapa los ajustes que parecen secretos, y merece la pena mirar cómo decide:

```salida
patrón: API|AUTH|TOKEN|KEY|SECRET|PASS|SIGNATURE|HTTP_COOKIE
```

```salida
SECRET_KEY         -> '********************'
API_TOKEN          -> '********************'
DATABASE_PASSWORD  -> '********************'
AWS_ACCESS_KEY_ID  -> '********************'
MI_SECRETO_RARO    -> '********************'
CLAVE_BD           -> 'x'
SMTP_HOST          -> 'h'
```

Mira la penúltima. **`CLAVE_BD` sale en claro**, porque el patrón está en inglés y "clave" no aparece en él. `MI_SECRETO_RARO` sí se tapa, pero por casualidad: contiene "SECRET".

O sea que en un proyecto en español, **la costumbre razonable de nombrar las cosas en tu idioma desactiva sin avisar el tapado de secretos de Django**. Y no se ve nunca, porque solo aparece en una página de error con `DEBUG=True`.

Hay dos salidas: nombrar en inglés los ajustes que sean secretos, o cambiar el filtro:

```python
DEFAULT_EXCEPTION_REPORTER_FILTER = 'cfg.filtros.FiltroEnEspanol'
```

Aunque lo primero es que `DEBUG` sea `False` en producción. Y para las vistas que manejan contraseñas, `@sensitive_variables` y `@sensitive_post_parameters`, que tapan también en los correos de error.

> [!nota] Las cuatro deudas de este módulo, cerradas
>
> **La cookie de sesión** de la lección 35: `SESSION_COOKIE_SECURE = True` en producción, junto con la del CSRF.
>
> **La dirección del panel** de la lección 30. Está siempre en `/admin/` y hay robots buscándola constantemente. Moverla a algo que no se adivine no es seguridad de verdad —la contraseña sigue siendo lo que protege—, pero quita todo el ruido automático de los registros, que es lo que impide ver los intentos que sí importan. Lo bueno de verdad es restringirla por red o exigir un segundo factor.
>
> **Los ficheros subidos** de la lección 29: servirlos desde otro dominio, para que un HTML subido no se ejecute con los permisos de tu sitio.
>
> **Las contraseñas**, que ya están bien de fábrica: los validadores de la lección 32 y el hasheo de la 34.
>
> Y dos límites que vienen puestos y conviene conocer, porque son la defensa contra saturar el servidor con una sola petición:
>
> ```salida
> DATA_UPLOAD_MAX_MEMORY_SIZE:    2560 KB
> DATA_UPLOAD_MAX_NUMBER_FIELDS:  1000
> DATA_UPLOAD_MAX_NUMBER_FILES:   100
> ```
>
> ```salida
> POST con 20 campos y el límite en 5 -> 400
> ```
>
> Un `400`, limpio, antes de que la vista se entere. Lo que Django **no** trae es límite de peticiones por minuto: eso va en el servidor de delante o en una biblioteca aparte, y es lo que evita que alguien pruebe contraseñas a mano alzada.

> [!consejo] La lista antes de desplegar
>
> ```bash
> python manage.py check --deploy
> ```
>
> Eso primero, y a cero, que es la lección 40. Después, lo que la comprobación no sabe mirar:
>
> - **`DEBUG = False`** y comprobar que la página de error no dice nada.
> - **Dependencias al día**: `pip list --outdated`, y mirar los avisos de seguridad de Django.
> - **Ningún secreto en el repositorio**: ni en el código, ni en el historial. Lo que estuvo en un commit, aunque se borre, sigue ahí.
> - **Copias de seguridad, y probadas**. Una copia que no se ha restaurado nunca no es una copia.
> - **Registros que se miren**, con los errores llegando a alguien. Para eso está `ADMINS`.
> - **Las cuatro pruebas de acceso** de la lección 39 para cada vista cerrada.
> - **Los permisos de los usuarios del panel**: cuántos son superusuarios y por qué.
>
> Y lo que más pesa a largo plazo: **actualizar Django**. Las versiones con soporte extendido duran tres años, y la mayoría de los sitios comprometidos lo están por una versión vieja con un fallo publicado y parcheado, no por algo que alguien descubriera mirando tu código.

> [!resumen] En resumen
>
> Django trae tres middleware de seguridad activados y cuatro cabeceras de protección puestas por defecto, incluida la que impide meter el sitio en un marco, que en la versión 6 es la más estricta de las dos posibles. La protección CSRF devuelve un `403` sin el testigo, y lo que hay que configurar es el origen de confianza cuando hay proxy o varios dominios. El escape automático de plantillas cubre el caso normal y deja tres huecos donde el escape es correcto y aun así hay agujero: un atributo sin comillas, una dirección con esquema `javascript:` y los datos dentro de una etiqueta de guion, que tiene su propia herramienta. El ORM impide la inyección de SQL porque manda los datos aparte, y la única regla es pasar los valores como argumento y no meterlos en la cadena. La redirección abierta tiene una función hecha que rechaza casos que a nadie se le ocurren solos. En producción hay que activar la redirección a HTTPS, las dos cookies seguras y HSTS, que es difícil de deshacer y conviene subir poco a poco. Y hay un fallo silencioso propio de trabajar en español: la página de error tapa los ajustes cuyo nombre casa con un patrón en inglés, así que un ajuste llamado en castellano aparece en claro.

> [!ejercicio] Practica
>
> 1. Manda un `POST` sin el testigo CSRF y comprueba el `403`.
> 2. Pinta un valor con `|safe` y prueba a meter una etiqueta de guion. Quítalo y compara.
> 3. Reproduce los tres huecos del escape: el atributo sin comillas, el enlace con `javascript:` y los datos en JavaScript. Arregla los tres.
> 4. Consulta con un valor de inyección clásico por el ORM y con un cursor concatenado, y compara cuántas filas salen.
> 5. Prueba la función de comprobación de destinos con seis direcciones, tres válidas y tres no.
> 6. Activa los ajustes de HTTPS y mira las cabeceras de la respuesta.
> 7. Provoca un error con `DEBUG=True` y busca en la página cuántos ajustes tuyos salen en claro.
> 8. Crea un ajuste con nombre en español que contenga un secreto y comprueba que no se tapa.
> 9. Baja el límite de campos por petición y manda un formulario que lo pase.
> 10. Deja `check --deploy` a cero y repasa la lista de antes de desplegar.
