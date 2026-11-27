---
titulo: "Mensajes y sesiones"
resumen: "El aviso de que algo ha ido bien, que sobrevive a una redirección, y la lista de la sesión que se niega a crecer."
minutos: 14
orden: 35
---

Desde la lección 24 hay un agujero apuntado y sin tapar: guardas un contacto, la aplicación redirige, y no hay ninguna señal de que haya ido bien. Ese es el precio del patrón de la lección 2, porque después de redirigir la vista original ya no existe y su contexto tampoco.

Django trae la pieza para eso, y está construida sobre la que también permite guardar cualquier cosa entre peticiones. Las dos van juntas en esta lección porque una usa la otra.

> [!objetivo] Qué vas a aprender
>
> Mandar mensajes que sobrevivan a una redirección y pintarlos en la plantilla base, conocer los cinco niveles y por qué uno no se ve, guardar y leer datos en la sesión, entender dónde viven y cuánto duran, y reconocer la trampa de las listas y los diccionarios en la sesión.

## Mensajes

Ya estaba todo puesto desde la lección 4: la aplicación en `INSTALLED_APPS`, el componente en `MIDDLEWARE` y el procesador de contexto en `TEMPLATES`. Solo hay que usarlo.

```python title="contactos/views.py"
from django.contrib import messages


def nuevo(peticion):
        if formulario.is_valid():
                formulario.save()
        messages.success(peticion, 'Contacto guardado.')
        return redirect('contactos:lista')
```

Y en la plantilla base, para que salga en cualquier página. Ese es el bloque `mensajes` que la lección 18 recomendó dejar previsto:

```html title="plantillas/base.html"
{% block mensajes %}
  {% if messages %}
  <ul class="mensajes">
    {% for m in messages %}
      <li class="{{ m.tags }}">{{ m }}</li>
    {% endfor %}
  </ul>
  {% endif %}
{% endblock %}
```

```salida
[25|success|success] Contacto guardado.
[30|warning|warning] Le falta el teléfono.
```

Dos cosas que hacen que esto funcione. La variable `messages` está en todas las plantillas sin que ninguna vista la pase, por el procesador de contexto de la lección 33. Y `m.tags` es la clase CSS del nivel, lo que permite pintar los verdes de los rojos con dos reglas.

### Se leen una vez

```salida
después de la redirección  ->  los dos mensajes
al recargar la página      ->  SIN MENSAJES
```

Un mensaje **se consume al leerlo**. Es lo que se quiere: el aviso de "guardado" no debe seguir ahí al recargar.

Y tiene una consecuencia que desconcierta: si una plantilla recorre `messages` en un sitio y otra parte de la misma página vuelve a recorrerlo, la segunda vez está vacío. Cuando haga falta usarlos dos veces, se guardan en una variable con el `{% with %}` de la lección 17.

### Los cinco niveles

```salida
messages.DEBUG    = 10
messages.INFO     = 20
messages.SUCCESS  = 25
messages.WARNING  = 30
messages.ERROR    = 40

etiquetas: {10: 'debug', 20: 'info', 25: 'success', 30: 'warning', 40: 'error'}
```

En la medición de arriba se mandaron tres mensajes y solo salieron dos: **el de `debug` no aparece**. No es un fallo, es que `MESSAGE_LEVEL` vale `INFO`, o sea 20, y lo que esté por debajo se descarta.

Eso se cambia en los ajustes, y es útil en desarrollo:

```python title="agenda/settings.py"
MESSAGE_LEVEL = 10   # que se vean también los de depuración
```

Las cinco funciones son `messages.debug`, `info`, `success`, `warning` y `error`. Y con `messages.error` se puede avisar de un problema **sin que sea un error del formulario**, que es justo lo que faltaba en algunos casos de la lección 27.

> [!consejo] Cuándo un mensaje y cuándo un error de formulario
>
> Se confunden y no son lo mismo.
>
> **Error de formulario** cuando el problema es un dato concreto y hay que volver a la misma página a corregirlo. Va al lado del campo, como se vio en la lección 27, y la respuesta es `200`.
>
> **Mensaje** cuando la operación ha terminado, bien o mal, y hay una redirección por medio. "Guardado", "borrado", "no se pudo enviar el correo".
>
> La señal para distinguirlos: **si hay `redirect`, es un mensaje; si hay `render` del mismo formulario, es un error de formulario.**
>
> Y un caso mixto frecuente: una operación en lote donde unas cosas salen bien y otras mal. Ahí van dos mensajes, uno de éxito y otro de aviso, con los recuentos.

## Sesiones

Un diccionario que sobrevive entre peticiones de la misma persona:

```python
def cuenta_visitas(peticion):
        peticion.session['visitas'] = peticion.session.get('visitas', 0) + 1
    return HttpResponse(f"visitas={peticion.session['visitas']}")
```

```salida
visitas=1
visitas=2
visitas=3
```

Se usa como un diccionario normal: corchetes, `get`, `pop`, `del`, `in`. Lo que se guarda tiene que poder serializarse a JSON, así que valen textos, números, listas y diccionarios, y **no valen objetos de modelo**. Lo que se guarda de un objeto es su identificador.

> [!aviso] La lista que no crece
>
> La trampa de esta lección, medida:
>
> ```python
> def mete_lista(peticion):
>         lista = peticion.session.get('lista', [])
>     lista.append('x')
>     return HttpResponse(f'lista={lista}')
> ```
>
> ```salida
> lista=['x']
> lista=['x']
> lista=['x']
> ```
>
> Tres peticiones y la lista sigue teniendo un elemento. Nunca crece.
>
> El motivo es que Django **no puede saber que has modificado algo dentro**. Solo detecta asignaciones a claves de la sesión, y `lista.append(...)` no es una asignación: es una mutación de un objeto que ya estaba fuera.
>
> El arreglo es volver a asignarla:
>
> ```python
>         lista.append('x')
>     peticion.session['lista'] = lista
> ```
>
> ```salida
> lista=['x']
> lista=['x', 'x']
> lista=['x', 'x', 'x']
> ```
>
> Hay una alternativa, `peticion.session.modified = True`, que hace lo mismo marcando la sesión a mano. La asignación es más clara y no hay que acordarse de nada raro.
>
> Es exactamente el mismo tipo de fallo que el `clean_campo` sin `return` de la lección 27: no hay error, no hay aviso, y los datos simplemente no se guardan. Cuando algo de la sesión "no se guarda", este es el primer sospechoso, y el segundo es haber tocado un diccionario anidado.

## Dónde viven y cuánto duran

```salida
SESSION_ENGINE:                  django.contrib.sessions.backends.db
SESSION_COOKIE_AGE:              1209600  (14 días)
SESSION_EXPIRE_AT_BROWSER_CLOSE: False
SESSION_SAVE_EVERY_REQUEST:      False
SESSION_COOKIE_HTTPONLY:         True
SESSION_COOKIE_SECURE:           False
SESSION_COOKIE_SAMESITE:         Lax
```

De serie, en una tabla:

```salida
session_key:  59b9dgmebihrf6...
session_data: .eJxVjEEOwiAQRe_C2hBgWkCX7nsGMgORVA0kpV0Z765NutDtf...
decodificado: {'_auth_user_id': '2', '_auth_user_backend': '...ModelBackend',
               '_auth_user_hash': '3b0a11cf482a...'}
expire_date:  2026-10-06 17:31:59+00:00
```

En la cookie solo va la clave; **los datos están en el servidor**. Ahí se ve también cómo se guarda la sesión iniciada de la lección 32: tres entradas con el identificador del usuario, el sistema que lo autenticó y un resumen de su contraseña, que es lo que hace que cambiar la contraseña cierre las demás sesiones.

Los otros motores, por si el de serie no encaja:

| `SESSION_ENGINE` | Cuándo |
| --- | --- |
| `backends.db` | Lo de serie. Una consulta por petición |
| `backends.cache` | Rápido; se pierde todo si se reinicia la caché |
| `backends.cached_db` | Lee de la caché y escribe en las dos. Lo habitual con tráfico |
| `backends.signed_cookies` | Sin servidor; los datos viajan en la cookie, firmados pero **legibles** |

El último engaña: firmar no es cifrar. Cualquiera puede leer lo que hay dentro, así que no sirve para nada que no deba verse.

Y una tarea de mantenimiento que se olvida siempre:

```consola
python manage.py clearsessions
```

**Django no borra las sesiones caducadas solo.** Con el motor de base de datos, esa tabla crece hasta hacerse enorme, y esa orden hay que programarla.

> [!consejo] Las tres cookies de la sesión y para qué sirven
>
> De los ajustes de arriba, tres son de seguridad y merecen una frase cada uno.
>
> **`SESSION_COOKIE_HTTPONLY`** ya viene en `True` e impide que el JavaScript de la página lea la cookie. Es lo que hace que un fallo de inyección de guiones no se lleve directamente la sesión, y no se toca.
>
> **`SESSION_COOKIE_SECURE`** hace que la cookie solo viaje por HTTPS. Viene en `False` porque en desarrollo no hay certificado, y **en producción tiene que estar en `True`**, o la sesión viaja en claro. Es parte de la lista de la lección 42.
>
> **`SESSION_COOKIE_SAMESITE`** viene en `Lax` y hace que la cookie no se mande en peticiones desde otros sitios, que es una defensa más contra la falsificación de peticiones.
>
> Y los dos de duración. `SESSION_EXPIRE_AT_BROWSER_CLOSE` en `True` es lo que se quiere en un sitio con datos sensibles, y `peticion.session.set_expiry(0)` hace lo mismo para una sesión concreta, que es cómo se implementa la casilla de "no recordarme".

> [!nota] Qué guardar en la sesión y qué no
>
> La sesión es cómoda y es un sitio malo para casi todo.
>
> **Vale** para lo que es de esta visita y no importa perder: el carrito de quien no ha entrado, un filtro recordado, el paso de un asistente, un aviso puntual.
>
> **No vale** para lo que tiene que durar, porque caduca a los catorce días y desaparece al salir. Un carrito que debe seguir ahí mañana es un modelo.
>
> **No vale** para datos grandes, porque es una consulta en cada petición.
>
> **No vale** para nada de confianza, y esto es lo importante: si en la sesión pones `es_administrador`, estás guardando una decisión de permisos en un sitio donde ya no se vuelve a comprobar. Los permisos se consultan cada vez, como en la lección 33.
>
> Y un detalle de la lección 32 que conecta: **`logout()` vacía la sesión entera**, así que el carrito de quien se identifica después de haberlo llenado se pierde si no lo copias a un modelo al entrar.

> [!resumen] En resumen
>
> Los mensajes resuelven el aviso que se pierde al redirigir, y están disponibles desde el primer día porque la aplicación, el componente y el procesador de contexto ya vienen puestos; se mandan con cinco funciones según el nivel y se pintan recorriendo `messages` en la plantilla base, usando `m.tags` como clase CSS. Se consumen al leerlos, así que no sobreviven a una recarga ni se pueden recorrer dos veces en la misma página. Los de nivel `debug` no se ven porque `MESSAGE_LEVEL` empieza en `INFO`. La forma de distinguir un mensaje de un error de formulario es si hay redirección por medio o se vuelve a pintar la misma página. Las sesiones son un diccionario que sobrevive entre peticiones y solo admite datos que se puedan convertir a JSON, y tienen una trampa importante: modificar una lista o un diccionario que ya estaba dentro no se guarda, porque Django solo detecta asignaciones, de modo que hay que reasignar la clave o marcar la sesión como modificada. Los datos viven en el servidor y en la cookie solo va la clave, salvo con el motor de cookies firmadas, donde son legibles. Django no borra las sesiones caducadas solo y hay que programar `clearsessions`. De los ajustes de cookie, el que hay que cambiar en producción es `SESSION_COOKIE_SECURE`. Y la sesión sirve para lo que es de esta visita y no importa perder, nunca para datos grandes, ni para lo que debe durar, ni para decisiones de permisos.

> [!ejercicio] Practica
>
> 1. Añade un mensaje de éxito después de guardar y píntalo en la plantilla base. Comprueba que aparece tras la redirección.
> 2. Recarga la página y comprueba que ya no está. Explica por qué.
> 3. Manda un mensaje de cada nivel y mira cuál no sale. Cambia `MESSAGE_LEVEL` y vuelve a mirarlo.
> 4. Pinta cada nivel con un color distinto usando `m.tags`, sin escribir ningún `if`.
> 5. Escribe una vista que cuente visitas en la sesión y compruébalo recargando.
> 6. Guarda una lista en la sesión y añádele elementos sin reasignar la clave. Comprueba que no crece y arréglalo de las dos formas.
> 7. Mira la fila de tu sesión en la base de datos y descodifícala. Localiza las tres entradas que deja el inicio de sesión.
> 8. Inicia sesión, cambia la contraseña desde otro sitio y comprueba qué pasa con la primera sesión.
> 9. Llena un carrito en la sesión, inicia sesión y comprueba si sigue ahí.
