---
titulo: "Envío de correo"
resumen: "El ajuste que Django 6 acaba de cambiar entero, el correo que se pierde sin decir nada, y la recuperación de contraseña que quedó a medias en la lección 32."
minutos: 16
orden: 38
---

La lección 32 dejó montada la recuperación de contraseña y con una pieza sin poner: el correo que lleva el enlace. Esta lección la pone, y de paso cubre el envío de correo en general, que hace falta para los avisos, las confirmaciones y los informes de error.

Y hay un motivo extra para mirarlo con calma: **Django 6 ha cambiado la configuración de correo entera**. Lo que enseña prácticamente todo el material que hay por ahí está marcado para desaparecer.

> [!objetivo] Qué vas a aprender
>
> Configurar el correo con `MAILERS`, saber qué ha cambiado respecto a `EMAIL_BACKEND` y por qué, elegir el backend adecuado en cada entorno, enviar mensajes con adjuntos y versión HTML, completar la recuperación de contraseña, y conocer los tres fallos silenciosos del correo.

## `MAILERS`

```python title="agenda/settings.py"
MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.console.EmailBackend',
    },
}
```

Un diccionario de alias, exactamente igual que `DATABASES`, `CACHES` y el `STORAGES` de la lección 29. Django avanza hacia que toda la configuración tenga esta forma, y el correo es lo último que faltaba.

Eso no hay ni que escribirlo: **`startproject` ya lo deja puesto**, con el backend de consola, que es justo lo que quieres en desarrollo. Es nuevo de la 6.1; antes no venía nada y el correo fallaba con un error de conexión hasta que lo configurabas.

Lo que había antes, y lo que enseñan todos los tutoriales, era una lista de once ajustes sueltos:

```salida
EMAIL_BACKEND        EMAIL_HOST_PASSWORD   EMAIL_USE_SSL
EMAIL_FILE_PATH      EMAIL_PORT            EMAIL_USE_TLS
EMAIL_HOST           EMAIL_SSL_CERTFILE
EMAIL_HOST_USER      EMAIL_SSL_KEYFILE     EMAIL_TIMEOUT
```

```salida
The {name} setting is deprecated. Migrate to MAILERS before Django 7.0.
```

Los once están **obsoletos y desaparecen en Django 7.0**. Sirven todavía, pero es código con fecha de caducidad.

Con `MAILERS`, esos ajustes van dentro, en `OPTIONS`:

```python
MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'OPTIONS': {
            'host': 'smtp.ejemplo.es',
            'port': 587,
            'username': 'avisos@ejemplo.es',
            'password': os.environ['CLAVE_SMTP'],
            'use_tls': True,
            'timeout': 10,
        },
    },
}
```

Las opciones que acepta el backend de SMTP son exactamente las de antes, en minúsculas:

```salida
host, port, username, password, use_tls, use_ssl, timeout,
ssl_keyfile, ssl_certfile, fail_silently
```

> [!aviso] Mezclar los dos estilos rompe el arranque
>
> No se pueden tener las dos cosas:
>
> ```salida
> ImproperlyConfigured: Deprecated email settings are not allowed
> when MAILERS is defined: EMAIL_HOST, EMAIL_PORT.
> ```
>
> Y ni siquiera se puede leer el viejo desde el código:
>
> ```salida
> AttributeError: The EMAIL_BACKEND setting is not available when MAILERS is defined.
> ```
>
> Es una postura deliberada y sensata: con dos sitios donde configurar lo mismo, nadie sabría cuál manda. **La migración es de todo o nada**, y conviene hacerla de una vez, porque es un rato.
>
> Lo que sí sigue fuera de `MAILERS` son los tres ajustes que no describen la conexión sino los mensajes: `DEFAULT_FROM_EMAIL`, `SERVER_EMAIL` y `ADMINS`.

## Los cinco backends

| Backend | Para qué |
| --- | --- |
| `console` | Desarrollo: lo imprime en la consola del servidor |
| `locmem` | Pruebas: lo guarda en una lista en memoria |
| `filebased` | Desarrollo: un fichero por mensaje |
| `smtp` | Producción |
| `dummy` | Lo tira; sirve para medir sin enviar |

El de consola, que es el que viene puesto, imprime esto:

```salida
Subject: Recupera tu =?utf-8?q?contrase=C3=B1a?=
From: webmaster@localhost
To: ana@ejemplo.es
Date: Tue, 22 Sep 2026 17:54:40 +0000

Pulsa aquí: https://ejemplo.es/x/
```

Se ve el mensaje entero sin montar nada, y **el asunto aparece codificado** porque lleva una eñe. Eso es normal y es cómo viajan los acentos en las cabeceras de correo; el cliente lo descodifica al enseñarlo.

Ese `From: webmaster@localhost` es el valor por defecto de `DEFAULT_FROM_EMAIL`, y es una de las cosas que hay que cambiar antes de que alguien lo vea.

## Enviar

Para lo sencillo, una función:

```python
from django.core.mail import send_mail

send_mail('Asunto', 'Cuerpo en texto.', None, ['ana@ejemplo.es'])
```

El `None` del remitente usa `DEFAULT_FROM_EMAIL`, que es lo que quieres casi siempre. Devuelve **cuántos mensajes se enviaron**, que es `1` o `0`.

Para todo lo demás, la clase:

```python
from django.core.mail import EmailMultiAlternatives

mensaje = EmailMultiAlternatives(
    'Dos', 'versión en texto', None, ['c@d.es'],
    cc=['cc@d.es'], bcc=['oculto@d.es'], reply_to=['responde@d.es'],
)
mensaje.attach_alternative('<p>versión en <b>HTML</b></p>', 'text/html')
mensaje.attach('nota.txt', b'contenido', 'text/plain')
mensaje.send()
```

```salida
to: ['c@d.es'] | cc: ['cc@d.es'] | bcc: ['oculto@d.es'] | reply_to: ['responde@d.es']
alternativas: ['text/html']
adjuntos: [('nota.txt', 'text/plain')]
destinatarios reales: ['c@d.es', 'cc@d.es', 'oculto@d.es']
```

Fíjate en la última línea: `recipients()` junta los tres, que es a quién se le manda de verdad. Y la copia oculta está oculta **para el que lo recibe**, no para el servidor.

Lo de `attach_alternative` es la forma correcta de mandar HTML: se manda **el mismo mensaje dos veces**, en texto y en HTML, y cada cliente enseña el que puede. Mandar solo HTML es lo que hace que el mensaje acabe en la carpeta de correo no deseado.

Y el cuerpo, lógicamente, sale de una plantilla:

```python
from django.template.loader import render_to_string

mensaje.attach_alternative(
    render_to_string('correo/aviso.html', {'contacto': contacto}), 'text/html'
)
```

## Varios destinos

Un proyecto suele tener dos correos distintos: el de los usuarios, que va por un servicio de envío, y el de los avisos internos. Con `MAILERS` son dos alias:

```python
MAILERS = {
    'default': {'BACKEND': 'django.core.mail.backends.smtp.EmailBackend', 'OPTIONS': {...}},
    'avisos':  {'BACKEND': 'django.core.mail.backends.smtp.EmailBackend', 'OPTIONS': {...}},
}
```

```python
send_mail('Al de por defecto', 'x', None, ['c@d.es'])
send_mail('Al de avisos', 'x', None, ['c@d.es'], using='avisos')
```

```salida
alias: ['default', 'avisos']
MailerDoesNotExist: "The mailer 'inventado' is not configured."
```

Ese `using=` es el cambio de forma que trae `MAILERS`, y sustituye a tres argumentos que también están obsoletos:

```salida
The 'connection' argument is deprecated. Switch to the 'using' argument with a MAILERS alias.
The 'auth_user' and 'auth_password' arguments are deprecated. Set 'username' and 'password' OPTIONS in MAILERS instead.
The 'fail_silently' argument is deprecated.
```

La idea de fondo es buena: **la configuración va en los ajustes y el código solo elige un alias**. Antes se podían pasar credenciales en la llamada, que es justo donde no deben estar.

## La recuperación de contraseña, por fin

Con el backend de consola puesto, lo de la lección 32 ya funciona entero:

```salida
POST /cuentas/password_reset/  ->  302  /cuentas/password_reset/done/
correos: 1

asunto: 'Contraseña restablecida en testserver'
de: webmaster@localhost | para: ['recu@ejemplo.es']

Ha recibido este correo electrónico porque ha solicitado restablecer
la contraseña para su cuenta en testserver.

Por favor, vaya a la página siguiente y escoja una nueva contraseña.

http://testserver/cuentas/reset/OQ/dfbooc-d45cb34a78ec1f36dfa99ce6cd18d4ca/

Por si lo ha olvidado, usted es: recu

¡Gracias por usar nuestro sitio!

El equipo de testserver
```

El texto está en español porque el `LANGUAGE_CODE` de la lección 5 está puesto. Y hay tres cosas ahí que hay que arreglar antes de enseñárselo a nadie:

**`testserver` sale cuatro veces.** Es el nombre del servidor, sacado de la petición. En producción saldrá tu dominio, lo cual está bien, pero "El equipo de mi-tienda.es" no es lo que quieres firmar. Eso se arregla con `django.contrib.sites` o sobrescribiendo las plantillas `registration/password_reset_email.html` y `registration/password_reset_subject.txt`.

**El enlace es `http://`, no `https://`.** Django lo decide preguntando a la petición si es segura, y detrás de un proxy no lo sabe a menos que se lo digas. Es la lección 43, y es un fallo con consecuencias: un enlace de recuperación viajando sin cifrar.

**El remitente sigue siendo `webmaster@localhost`.**

Y lo que hace bien sin tocar nada:

```salida
correo inexistente -> estado: 302 | correos enviados: 0
```

**Misma respuesta, sin correo.** Es la defensa contra el recuento de usuarios de la lección 32, y ahora se ve que llega hasta el final: no hay ninguna diferencia observable entre un correo registrado y uno que no.

> [!aviso] Los tres fallos silenciosos del correo
>
> **Una dirección inválida se envía sin quejarse:**
>
> ```salida
> send_mail(..., ['esto no es un correo'])  ->  enviado sin quejarse
> ```
>
> `send_mail` no valida las direcciones. El mensaje sale, el servidor de correo lo rechaza después, y tú ya has devuelto el `200`. Si la dirección viene de un formulario, que la valide el formulario, que es el bloque D.
>
> **`fail_silently` se traga todo:**
>
> ```salida
> con fail_silently -> devuelve 0, sin excepción, sin rastro
> ```
>
> Ni excepción, ni registro, ni nada. Un servidor mal configurado tira meses de correos sin que nadie se entere. Por eso está obsoleto: lo correcto es capturar y **registrar** el fallo, no hacer como que no pasó.
>
> **Sin `timeout`, una petición se puede quedar colgada para siempre:**
>
> ```salida
> espera por defecto del sistema: None (o sea, sin límite)
> ```
>
> Enviar correo es una llamada de red **dentro de la petición**: el usuario está esperando con la página en blanco mientras hablas con el servidor de correo. Si ese servidor no contesta y no hay `timeout`, la petición se queda ahí, ocupando un proceso. Con unos cuantos así, el sitio deja de responder.
>
> Poner `'timeout': 10` en las `OPTIONS` es de lo más barato que se puede hacer por la estabilidad de un proyecto.

> [!consejo] El correo no se envía dentro de la petición
>
> Lo de arriba apunta a algo más grande. Aunque el servidor conteste bien, enviar un correo son unos cientos de milisegundos que se suman a la respuesta, y es trabajo que **al usuario no le importa**: ha pulsado "registrarme" y lo que quiere es entrar.
>
> Lo que se hace en un proyecto que ha crecido es apartarlo a una cola: la vista deja una tarea anotada y contesta, y otro proceso manda el correo. Es lo que hacen Celery, RQ y `django-tasks`, y desde Django 6 hay una interfaz de tareas incluida que unifica la forma de escribirlo.
>
> No hace falta desde el primer día. Los tres momentos en que sí hace falta: cuando el correo se manda a muchos destinatarios de golpe, cuando el envío falla a veces y quieres reintentos, y cuando notas la espera.
>
> Mientras tanto, lo mínimo razonable es el `timeout` y capturar la excepción para que un fallo de correo no tire una operación que por lo demás salió bien. Un usuario registrado que no recibió el correo de bienvenida es un problema; un usuario que no se pudo registrar porque el servidor de correo estaba caído es un problema mayor.

> [!nota] Cómo se prueba el correo
>
> Ninguna de las tres formas de probar necesita un servidor de verdad.
>
> **En las pruebas automáticas**, el backend `locmem`, que Django pone solo y que deja los mensajes en una lista:
>
> ```python
> from django.core import mail
>
> self.assertEqual(len(mail.outbox), 1)
> self.assertIn('restablecer', mail.outbox[0].body)
> ```
>
> Eso es la lección 39, y es lo que permite comprobar de verdad que el registro manda su correo y que el enlace que lleva dentro funciona.
>
> **A mano en desarrollo**, el de consola, o `filebased` si prefieres poder abrirlos:
>
> ```salida
> fichero: 20260922-195556-4419367808.log
> ```
>
> **Antes de producción**, un servidor de correo de mentira que enseña los mensajes en una página web, como Mailpit o MailHog. Se levanta en un contenedor, se apunta el `smtp` a él, y se ve el mensaje tal y como lo verá el usuario, con su HTML. Es el paso que falta para saber si el correo se ve bien de verdad.

> [!resumen] En resumen
>
> Django 6 ha sustituido los once ajustes sueltos de correo por un diccionario `MAILERS` con la misma forma que `DATABASES` y `CACHES`, y los viejos desaparecen en la versión 7.0; mezclar los dos estilos impide arrancar, y hasta leer el ajuste antiguo desde el código da error, así que la migración es de todo o nada. Los cinco backends cubren cada entorno: consola y fichero en desarrollo, `locmem` en las pruebas, SMTP en producción y `dummy` para medir. Para enviar hay una función para lo sencillo, que devuelve cuántos mensajes salieron, y una clase para copias, respuestas, adjuntos y la versión HTML, que se manda siempre junto a la de texto y sale de una plantilla. Con varios alias configurados, el código elige uno con `using`, que sustituye a tres argumentos ya obsoletos y mueve las credenciales de las llamadas a los ajustes, que es donde deben estar. La recuperación de contraseña de la lección 32 queda completa, y se ve que no manda nada ante un correo que no existe pero devuelve lo mismo, aunque el mensaje por defecto firma con el nombre del servidor y genera un enlace sin cifrar. Y hay tres fallos silenciosos: una dirección inválida se envía sin protestar, `fail_silently` se traga los errores sin dejar rastro, y sin `timeout` una petición puede quedarse colgada indefinidamente, porque el correo se envía dentro de la petición mientras el usuario espera.

> [!ejercicio] Practica
>
> 1. Configura `MAILERS` con el backend de consola y manda un mensaje desde el intérprete.
> 2. Intenta poner `EMAIL_HOST` junto a `MAILERS` y lee el error de arranque.
> 3. Pide una recuperación de contraseña y sigue el enlace que sale en la consola hasta cambiarla.
> 4. Pídela con un correo que no exista y comprueba que la respuesta es idéntica y no sale ningún mensaje.
> 5. Sobrescribe las dos plantillas del correo de recuperación para que lleven el nombre de tu proyecto.
> 6. Manda un mensaje con versión en texto y en HTML, y ábrelo con el backend de fichero.
> 7. Configura dos alias y manda un mensaje a cada uno con `using`.
> 8. Apunta el backend SMTP a un puerto donde no haya nada, con y sin `timeout`, y cronometra.
> 9. Manda un correo a una dirección claramente inválida y comprueba que no se queja.
