---
titulo: "Proyecto: un tablero de incidencias listo para producción"
resumen: "El proyecto que llega hasta el servidor: usuario propio desde el minuto uno, avisos por correo que no tiran la operación, ajustes por entorno y veinte pruebas."
minutos: 24
orden: 45
---

Último proyecto del módulo, y el que lo cierra de verdad. Un tablero de incidencias es una herramienta interna: no tiene parte pública, todo el mundo está identificado, y cada uno ve unas cosas distintas. Eso lo hace el ejemplo correcto para el bloque F, porque **obliga a tomar desde el principio las decisiones que la bitácora podía dejar para después.**

Y sobre todo, este proyecto llega al final. No acaba en `runserver`: acaba con `check --deploy` limpio y Gunicorn sirviéndolo.

> [!objetivo] Qué vas a aprender
>
> Escribir un tablero de incidencias completo con modelo de usuario propio, visibilidad por usuario, adjuntos validados, avisos por correo que no tiran la operación si fallan, ajustes partidos en cuatro entornos, veinte pruebas y un despliegue comprobado.

## Las tres decisiones del primer día

Antes de escribir ningún modelo, tres cosas. Las tres se pueden cambiar después, y las tres cuestan diez veces más.

**Modelo de usuario propio**, que es la lección 34. La primera migración, antes que nada:

```python title="cuentas/models.py"
class Usuario(AbstractUser):
        correo = models.EmailField('correo', unique=True)
    equipo = models.CharField('equipo', max_length=60, blank=True)
    recibe_avisos = models.BooleanField('recibe avisos por correo', default=True)

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['username']
```

```python
AUTH_USER_MODEL = 'cuentas.Usuario'
```

Se entra con el correo, no con un nombre de usuario, que es lo que espera cualquiera en una herramienta de trabajo. Y `recibe_avisos` está ahí desde el principio porque un sistema que manda correos sin manera de apagarlos acaba en la carpeta de no deseado.

La lección 34 midió lo que pasa si esto se deja para después: un `InconsistentMigrationHistory` que no se arregla con ningún ajuste.

**Ajustes partidos**, que es la lección 40. Cuatro módulos desde el principio:

```salida
cfg/ajustes/
  base.py         lo común, con DEBUG = False
  desarrollo.py   DEBUG = True y los dominios locales
  pruebas.py      base de datos en memoria y hasheo rápido
  produccion.py   todo lo de verdad, leído del entorno
```

Fíjate en que `base.py` tiene `DEBUG = False`. Es al revés de lo que trae `startproject`, y es a propósito: **el valor peligroso hay que pedirlo, no heredarlo**. Un módulo de ajustes nuevo que se olvide de decirlo será seguro.

**La dirección del panel**, que es la deuda de la lección 30:

```python
RUTA_PANEL = os.environ.get('RUTA_PANEL', 'panel-interno/')
```

```python title="cfg/urls.py"
path(settings.RUTA_PANEL, admin.site.urls),
```

Sale del entorno, así que en producción es algo que no se adivina y en desarrollo es cómoda.

## Visibilidad, que aquí es el modelo

La bitácora tenía contenido público. Aquí no hay nada público, y quién ve qué es una regla de negocio:

```python
class IncidenciaQuerySet(models.QuerySet):
        def visibles_para(self, usuario):
                if usuario.is_staff:
                        return self
        return self.filter(models.Q(autor=usuario) | models.Q(asignada_a=usuario))
```

Cuatro líneas, un sitio. Y **todas** las vistas empiezan por ahí, incluida la que añade notas:

```python
def _visible(peticion, pk):
        return get_object_or_404(Incidencia.objetos.visibles_para(peticion.user), pk=pk)
```

```salida
cada uno ve lo suyo          ok
el staff lo ve todo          ok
la ajena da 404              ok
la asignada a mí se ve       ok
editar lo ajeno da 403       ok
anotar lo ajeno da 404       ok
```

Las dos últimas son las que distinguen esto de un tablero con un cartel. La de anotar es la que más se olvida: es fácil acordarse de proteger el detalle y dejar abierta la vista que escribe, y **ahí el fallo es peor**, porque no solo se ve algo ajeno, se modifica.

## Los avisos por correo

La parte más delicada del proyecto, y la que aplica lo que midió la lección 38. Está en su propio módulo, a propósito:

```python title="tablero/avisos.py"
def avisar_asignacion(incidencia, base_url='https://tablero.ejemplo.es'):
        """Avisa a quien se le asigna una incidencia. Nunca lanza."""
    destino = incidencia.asignada_a
    if destino is None or not destino.recibe_avisos:
                return 0

    mensaje = EmailMultiAlternatives(
        subject=f'[#{incidencia.pk}] Te han asignado: {incidencia.titulo}',
        body=render_to_string('tablero/correo/asignacion.txt', contexto),
        to=[destino.correo],
    )
    mensaje.attach_alternative(
        render_to_string('tablero/correo/asignacion.html', contexto), 'text/html')
    try:
                return mensaje.send()
    except Exception:
                registro.exception('No se pudo avisar de la incidencia %s', incidencia.pk)
        return 0
```

Cinco decisiones, y cada una tiene su prueba.

**En un módulo aparte**, para poder probarlo y para poder moverlo a una cola sin tocar las vistas.

**Las dos versiones**, texto y HTML, desde plantillas. El día que se quiera cambiar el texto, no hay que abrir código Python.

**Respeta la preferencia** del destinatario.

**Captura y registra.** Ese `except Exception` sería un error en casi cualquier otro sitio, y aquí es lo correcto: es la diferencia entre "no te llegó el correo" y "no se pudo crear la incidencia". Y `registro.exception` guarda la traza entera, que es lo contrario del `fail_silently` que la lección 38 desaconsejaba.

**Devuelve un número**, para que la vista pueda decirlo:

```python
if avisar_asignacion(self.object):
        messages.info(self.request, f'Se ha avisado a {self.object.asignada_a}.')
```

Y así se prueba que la captura funciona de verdad:

```python
with override_settings(MAILERS={'default': {
        'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'OPTIONS': {'host': 'localhost', 'port': 1, 'timeout': 1}}}):
        with self.assertLogs('tablero.avisos', level='ERROR'):
                r = self.client.post(reverse('tablero:nueva'), {...})

self.assertEqual(r.status_code, 302)
self.assertTrue(Incidencia.objetos.filter(titulo='Correo roto').exists())
```

Apunta el correo a un puerto donde no hay nada, comprueba que **se registró el error** y que **la incidencia se creó igual**. Esa prueba es la que impide que alguien quite el `try` seis meses después.

## Los adjuntos

La lección 29 dejó cuatro reglas, y las cuatro están aquí:

```python
def ruta_adjunto(instancia, nombre):
        limpio = Path(nombre).name              # neutraliza ../../
    sufijo = secrets.token_hex(4)           # dos ficheros con el mismo nombre no chocan
    return f'adjuntos/{timezone.now():%Y/%m}/{sufijo}-{limpio}'
```

```python
adjunto = models.FileField(upload_to=ruta_adjunto, blank=True,
                           validators=[FileExtensionValidator(
                               ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'log'])])
```

Y el tamaño, en el formulario, porque no es cosa del modelo:

```python
def clean_adjunto(self):
        fichero = self.cleaned_data.get('adjunto')
    if fichero and fichero.size > MAX_ADJUNTO:
                raise forms.ValidationError('El adjunto no puede pasar de %(max)s MB.',
                                    code='demasiado_grande', params={'max': 5})
    return fichero
```

La prueba del recorrido de rutas es la interesante, porque enseña algo que no estaba medido:

```python
fichero = SimpleUploadedFile('../../evil informe.txt', b'contenido', 'text/plain')
```

```salida
adjuntos/2026/09/a9869e67-evil_informe.txt
```

Los `../../` se han ido por el `Path(nombre).name`, y el espacio **se ha convertido en un guion bajo sin que nadie lo pida**: eso lo hace el almacenamiento de Django por su cuenta. Es una limpieza más que agradecer, y un recordatorio de que el nombre guardado no es el que subió el usuario. Si quieres enseñar el original, hay que guardarlo aparte.

> [!aviso] La prueba de adjuntos escribe en el disco de verdad
>
> Una prueba que sube un fichero **lo escribe donde diga `MEDIA_ROOT`**, y eso es tu carpeta de desarrollo. Sin cuidado, la suite va dejando basura en cada ejecución.
>
> ```python
> TEMPORAL = tempfile.mkdtemp()
>
> @override_settings(MEDIA_ROOT=TEMPORAL)
> class AdjuntoTest(BaseTest):
>         @classmethod
>     def tearDownClass(cls):
>                 shutil.rmtree(TEMPORAL, ignore_errors=True)
>         super().tearDownClass()
> ```
>
> Y lo que esto recuerda: **la vuelta atrás de la transacción de la lección 39 no deshace ficheros.** La base de datos vuelve a su sitio sola; el disco, no. Es la misma asimetría que la lección 29 señaló con los ficheros huérfanos, vista desde las pruebas.

## Las veinte pruebas

```salida
Ran 20 tests in 0.095s
OK
```

Noventa y cinco milisegundos para veinte pruebas que suben ficheros, mandan correos y comprueban permisos. Eso no es casualidad: es el módulo de ajustes de pruebas.

```python title="cfg/ajustes/pruebas.py"
DATABASES['default'] = {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
```

```salida
PBKDF2PasswordHasher   173.7 ms
MD5PasswordHasher        0.1 ms
```

**Mil setecientas veces.** El hasheo bueno es lento **a propósito**, que es lo que la lección 34 explicaba: es lo que hace inviable probar contraseñas a la fuerza. Pero en las pruebas, donde se crean usuarios a docenas, esos ciento setenta milisegundos por usuario son la diferencia entre una suite que se lanza al guardar y una que no se lanza.

Y por eso este ajuste **solo puede estar en el módulo de pruebas**. En cualquier otro sitio sería un agujero enorme.

El reparto de las veinte: cuatro del modelo, seis de visibilidad, cuatro de los avisos, tres de adjuntos, dos de notas y una del número de consultas.

```salida
la lista con 22 incidencias -> 4 consultas
```

La sesión, el usuario, el recuento y los datos. Constante, con dos claves ajenas resueltas en la misma consulta por el `con_todo()`.

## Hasta el servidor

```bash
CLAVE_SECRETA=... HOSTS_PERMITIDOS=tablero.ejemplo.es SMTP_HOST=smtp.ejemplo.es \
  python manage.py check --deploy --settings=cfg.ajustes.produccion
```

```salida
WARNINGS:
?: (security.W021) You have not set the SECURE_HSTS_PRELOAD setting to True.

System check identified 1 issue (0 silenced).
```

Uno, y es el que la lección 42 recomienda no activar a la ligera. Los demás están cubiertos.

Y funcionando de verdad, con Gunicorn:

```salida
/ (anónimo)          -> 301 https://...
panel en /admin/     -> 301, y detrás no hay nada
panel movido         -> 301 https://.../panel-interno/
```

Lo último, que es lo que explica un hallazgo que quedó suelto:

```salida
sin cabecera de proxy  -> 301 a https
con cabecera de proxy  -> 200
```

Eso es `SECURE_PROXY_SSL_HEADER`:

```python
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

Detrás de un proxy, Django ve una conexión sin cifrar aunque el usuario esté en HTTPS, porque el cifrado acaba en el proxy. Sin ese ajuste pasan dos cosas: la redirección a HTTPS entra en un bucle infinito, y **los enlaces de recuperación de contraseña salen con `http://`**, que es exactamente lo que se midió en la lección 38 y quedó apuntado como pendiente.

Ahora queda cerrado, y con el aviso que lo acompaña: ese ajuste **solo se pone si hay de verdad un proxy delante que ponga esa cabecera**. Si no, cualquiera puede mandarla y hacer creer a Django que su conexión es segura.

> [!consejo] Qué le falta, y qué has aprendido a decidir
>
> Lo que este proyecto pide a gritos cuando crece:
>
> **Los correos, a una cola.** Ahora se mandan dentro de la petición, con su tope de tiempo y su captura, que es lo correcto para empezar. En cuanto haya avisos a varios destinatarios, a una cola.
>
> **Historial de cambios.** Quién cambió el estado y cuándo. Es un modelo más y una señal, y es lo primero que se pide en una herramienta así.
>
> **PostgreSQL**, que es la lección 41, y con él quitar el campo de búsqueda normalizado.
>
> **Un panel con números**: cuántas abiertas por prioridad, cuánto tardan en cerrarse. El `dias_abierta` del modelo ya está; falta agregarlo.
>
> Pero lo que de verdad te llevas de aquí no es el código. Son las preguntas que ahora sabes hacer antes de escribir la primera línea: **¿quién ve qué, y dónde se decide eso una sola vez? ¿Qué pasa si esta llamada externa falla? ¿Esto lo estoy comprobando en una capa o en las tres? ¿Este ajuste puede estar puesto en producción?**
>
> Eso es lo que separa un proyecto que funciona en tu portátil de uno que aguanta en un servidor, y es lo que ha ido construyendo el módulo entero.

> [!nota] Lo que ha cubierto el módulo
>
> Cuarenta y cinco lecciones, y todo lo de los seis bloques está en estos dos proyectos.
>
> Del bloque A, la estructura: proyecto, aplicaciones, ajustes, la primera vista. Del B, los modelos y el ORM, con las relaciones, las migraciones, el `Meta` y las restricciones. Del C, las plantillas con su herencia, los estáticos, las direcciones con nombre y las vistas de clase. Del D, los formularios de modelo, la validación en tres capas y los ficheros subidos. Del E, el panel, la autenticación, los permisos por fila, el usuario propio y los mensajes.
>
> Y del F, que es lo que convierte todo eso en algo que se puede publicar: paginación, búsqueda, correo, pruebas, ajustes por entorno, la base de datos de verdad, la seguridad y el despliegue.
>
> Lo que queda fuera y es el siguiente paso natural: las interfaces de programación con Django REST Framework, las tareas en segundo plano, la caché, y la parte asíncrona. Ninguna de las cuatro tiene sentido antes de esto.

> [!resumen] En resumen
>
> Un tablero de incidencias obliga a tomar el primer día tres decisiones que un blog podía aplazar: el modelo de usuario propio, que después cuesta una migración imposible; los ajustes partidos en cuatro entornos, con el valor peligroso fuera del módulo común para que haya que pedirlo; y la dirección del panel leída del entorno. La visibilidad deja de ser un detalle y se convierte en el centro: un método del `QuerySet` que todas las vistas usan, incluida la que escribe notas, que es la que se olvida y donde el fallo es peor. Los avisos por correo viven en su propio módulo, mandan las dos versiones desde plantillas, respetan la preferencia del destinatario y capturan y registran cualquier fallo, porque no recibir un correo es un problema menor que no poder crear la incidencia; hay una prueba que apunta el correo a un puerto muerto y comprueba las dos cosas. Los adjuntos aplican las cuatro reglas de la lección 29, y probarlos exige un directorio temporal porque la vuelta atrás de la transacción no deshace ficheros. Las veinte pruebas tardan noventa y cinco milisegundos gracias a un módulo de ajustes con la base en memoria y un hasheo mil setecientas veces más rápido, que solo puede estar ahí. Y el proyecto llega al servidor con la comprobación de despliegue limpia y la cabecera del proxy puesta, que es lo que cierra el enlace sin cifrar que quedó pendiente en la lección 38.

> [!ejercicio] Practica
>
> 1. Monta el proyecto entero y comprueba que las veinte pruebas pasan.
> 2. Quita la comprobación de visibilidad de la vista que añade notas y mira qué prueba falla.
> 3. Apunta el correo a un puerto donde no haya nada y crea una incidencia asignada. Comprueba que se crea.
> 4. Sube un adjunto con `../../` en el nombre y mira dónde acaba.
> 5. Sube dos ficheros con el mismo nombre y comprueba que ninguno pisa al otro.
> 6. Quita el hasheo rápido de los ajustes de pruebas y cronometra la suite.
> 7. Deja `check --deploy` en un solo aviso con los ajustes de producción.
> 8. Arranca con Gunicorn y comprueba la redirección a HTTPS con y sin la cabecera del proxy.
> 9. Mueve la dirección del panel con una variable de entorno y comprueba que `/admin/` no responde.
> 10. Añade el historial de cambios de estado con un modelo y una señal, con su prueba.
