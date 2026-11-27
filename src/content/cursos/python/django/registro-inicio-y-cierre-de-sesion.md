---
titulo: "Registro, inicio y cierre de sesión"
resumen: "Las ocho vistas que ya están escritas, el enlace de salir que dejó de funcionar, y por qué el mensaje de error es tan poco concreto."
minutos: 16
orden: 32
---

El panel de la lección 30 ya tenía inicio de sesión, usuarios, permisos y una página para cambiar la contraseña. Nada de eso es del panel: es de `django.contrib.auth`, y está disponible para tu sitio con una línea.

Y conviene decirlo pronto: **esto no se escribe a mano**. Guardar contraseñas, comprobarlas, mandar un correo de recuperación con un enlace que caduque y no dejar agujeros por el camino es un problema resuelto con veinte años de errores ajenos detrás. Aquí se usa lo que hay y se aprende a configurarlo.

> [!objetivo] Qué vas a aprender
>
> Enganchar las vistas de autenticación y escribir sus plantillas, configurar los tres ajustes de redirección, escribir una vista de registro, entender qué pasa con la sesión al entrar y al salir, y conocer los tres comportamientos que sorprenden: el cierre de sesión que exige `POST`, el mensaje de error deliberadamente vago y el `next` que se ignora.

## Ocho vistas con una línea

```python title="agenda/urls.py"
urlpatterns = [
    path('cuentas/', include('django.contrib.auth.urls')),
    # ...
]
```

```salida
login                    /cuentas/login/
logout                   /cuentas/logout/
password_change          /cuentas/password_change/
password_change_done     /cuentas/password_change/done/
password_reset           /cuentas/password_reset/
password_reset_done      /cuentas/password_reset/done/
password_reset_confirm   /cuentas/reset/uid/tok/
password_reset_complete  /cuentas/reset/done/
```

Las cuatro últimas son el proceso de "he olvidado mi contraseña" entero: pedir el correo, avisar de que se ha enviado, el enlace con su identificador y su testigo, y la confirmación. Funcionan en cuanto haya envío de correo configurado, que es la lección 38.

Las vistas están; **las plantillas no**. Y las busca en un sitio concreto:

```html title="plantillas/registration/login.html"
{% extends "base.html" %}
{% block contenido %}
<h1>Entrar</h1>
<form method="post" novalidate>{% csrf_token %}
  {{ form.non_field_errors }}
  {{ form.as_div }}
  <button>Entrar</button>
</form>
{% endblock %}
```

La carpeta tiene que llamarse `registration`, en inglés. Si sale un `TemplateDoesNotExist` con ese nombre dentro, es esto.

Y fíjate en el `non_field_errors`: el error de "usuario o contraseña incorrectos" no es de ningún campo, así que sin esa línea el formulario rechaza el intento **sin decir por qué**. Es el olvido de la lección 25 en el peor sitio posible.

## Los tres ajustes de redirección

```salida
LOGIN_URL          : /accounts/login/
LOGIN_REDIRECT_URL : /accounts/profile/
LOGOUT_REDIRECT_URL: None
```

Los tres valores por defecto están mal para casi cualquier proyecto, y el primero es una trampa: **apunta a `/accounts/`, en inglés**, aunque tú hayas montado las rutas en `/cuentas/`. El síntoma es que el decorador de la lección siguiente redirige a una página que no existe.

```python title="agenda/settings.py"
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'contactos:lista'
LOGOUT_REDIRECT_URL = 'contactos:lista'
```

Admiten el nombre de una ruta, que es mejor que escribir la dirección por lo que se vio en la lección 21.

`LOGIN_REDIRECT_URL` es adónde va alguien tras entrar **si no había un sitio al que volver**. Y ese "si no había" es lo siguiente.

## `?next=`

```salida
login normal                        ->  302 /contactos/   (LOGIN_REDIRECT_URL)
login con ?next=/contactos/         ->  302 /contactos/
login con ?next=https://malo.example.com/  ->  302 /contactos/
```

Lo pone el decorador de la lección siguiente cuando manda a alguien a identificarse, y es lo que hace que después vuelvas a donde ibas. En un enlace escrito a mano se pone igual:

```html
<a href="{% url 'login' %}?next={{ request.path|urlencode }}">Entrar</a>
```

Y fíjate en la tercera línea de la medición: **el `next` a otro dominio se ignora**. Django comprueba que el destino sea del sitio antes de redirigir.

Eso protege de una **redirección abierta**: un enlace a tu dominio, con tu página de inicio de sesión de verdad, que después de identificarse manda a una copia del sitio en otro servidor. Como el enlace inicial es legítimo, es muy convincente.

La conclusión es para tu propio código: **cualquier redirección a una dirección que venga de fuera hay que comprobarla**, con `url_has_allowed_host_and_scheme`. Es exactamente el mismo agujero.

## El enlace de salir ya no funciona

```salida
GET  /cuentas/logout/  ->  405
POST /cuentas/logout/  ->  200
```

Esto rompe casi todos los tutoriales que hay escritos, porque durante quince años el cierre de sesión fue un enlace:

```html
<a href="{% url 'logout' %}">Salir</a>   <!-- 405 desde Django 5.0 -->
```

Ahora es un formulario:

```html
<form method="post" action="{% url 'logout' %}">{% csrf_token %}
  <button type="submit">Salir</button>
</form>
```

El motivo es el de la lección 2, y es el mismo de la historia del buscador que vació la base de datos: **un `GET` no debe cambiar nada**. Con un enlace, cualquier cosa que recorra la página te echa la sesión, y una imagen en un foro con esa dirección como origen cerraba la sesión de quien la mirase.

Es molesto para maquetar un menú y es correcto. Y el `405` con su cabecera `Allow` es lo que se midió en la lección 22: la vista es una clase y sabe qué métodos acepta.

## Registro

Esta es la única que Django no trae, porque el registro depende de cada sitio: si hace falta confirmar el correo, si hay invitaciones, qué datos se piden. Lo que sí trae es el formulario:

```salida
campos: ['username', 'password1', 'password2']
```

Y con eso, la vista son siete líneas:

```python title="contactos/views.py"
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm


def registro(peticion):
        if peticion.method == 'POST':
                formulario = UserCreationForm(peticion.POST)
        if formulario.is_valid():
                        usuario = formulario.save()
            login(peticion, usuario)
            return redirect('contactos:lista')
    else:
                formulario = UserCreationForm()
    return render(peticion, 'registration/registro.html', {'formulario': formulario})
```

Es el ciclo de la lección 25 sin una sola variación. Lo único nuevo es el `login(peticion, usuario)`, que deja la sesión iniciada para no obligar a escribir la contraseña que se acaba de elegir.

Para pedir más datos, se hereda:

```python
class RegistroForm(UserCreationForm):
        email = forms.EmailField(required=True)

    class Meta(UserCreationForm.Meta):
                fields = ['username', 'email']
```

Ese `class Meta(UserCreationForm.Meta)` hereda del `Meta` del padre en vez de sustituirlo, que es lo que hay que hacer para no perder su configuración.

> [!nota] Los validadores de contraseña ya están puestos y funcionan
>
> En `settings.py` hay cuatro desde el primer día, y no son decorativos:
>
> ```salida
> 'abc'         -> False  demasiado corta (mínimo 8) / demasiado común
> '12345678'    -> False  demasiado común / completamente numérica
> 'password'    -> False  demasiado común
> 'admin1234'   -> False  demasiado común
> 'Zx9!kqrt42'  -> True
> ```
>
> El de "demasiado común" compara contra una lista de veinte mil contraseñas conocidas que viene dentro de Django. El primero de la lista, `UserAttributeSimilarityValidator`, rechaza contraseñas que se parezcan al nombre de usuario o al correo.
>
> Se configuran en ese mismo ajuste: subir el mínimo, quitar alguno, o añadir uno propio con una clase que tenga `validate` y `get_help_text`.
>
> Lo que **no** conviene es exigir mayúsculas, números y símbolos. Las guías actuales recomiendan longitud y comprobación contra listas conocidas, que es justo lo que hace Django, en lugar de reglas de composición que solo producen `Password1!` en todas partes.

## Qué pasa con la sesión

```salida
clave antes:   ptdjzdbgnu0u
clave después: b1xzbly5daee
¿cambia?:      True
¿conserva el carrito?: ['a', 'b']
```

Al iniciar sesión, Django **cambia el identificador de la sesión y conserva su contenido**. Eso tiene un nombre: evitar la *fijación de sesión*, un ataque en el que alguien te hace usar un identificador que él conoce y hereda tu sesión cuando te identificas. Como el identificador cambia justo en ese momento, el que él tenía no sirve.

Al salir, lo contrario:

```salida
tras logout -> carrito: None | usuario: None
```

`logout()` **vacía la sesión entera**, no solo la marca de quién eres. Cualquier cosa que hubiera guardada se pierde, lo cual es lo correcto en un ordenador compartido y hay que tenerlo en cuenta si guardabas algo que debía sobrevivir.

Y las dos cookies que aparecen:

```salida
cookies: ['csrftoken', 'sessionid']
```

`sessionid` es un identificador aleatorio; **los datos no viajan en la cookie**, están en la tabla de sesiones del servidor. `csrftoken` es la otra mitad de la protección del `{% csrf_token %}`. Las dos duran catorce días de serie, que es lo que vale `SESSION_COOKIE_AGE`.

> [!aviso] El mensaje de error es vago a propósito
>
> ```salida
> usuario que no existe   -> "Por favor, introduzca un nombre de usuario y clave correctos..."
> contraseña incorrecta   -> "Por favor, introduzca un nombre de usuario y clave correctos..."
> cuenta desactivada      -> "Por favor, introduzca un nombre de usuario y clave correctos..."
> ```
>
> El mismo texto en los tres casos, y es intencionado. Un mensaje que distinga "ese usuario no existe" de "la contraseña es incorrecta" permite **averiguar qué cuentas existen** probando correos, que es el primer paso de casi cualquier ataque.
>
> Por eso, cuando alguien pida que el mensaje sea más útil, la respuesta es que no. Y por eso la página de recuperación de contraseña dice "si esa dirección está registrada, recibirás un correo" en lugar de decir si lo está.
>
> La misma lógica hay que aplicarla a lo que escribas tú: **un formulario de registro que diga "ese correo ya está en uso" es una lista de clientes consultable**. La forma correcta es aceptar el registro y mandar un correo diciendo que ya había cuenta.

> [!nota] Cómo se guardan las contraseñas
>
> ```salida
> campo password: pbkdf2_sha256$1500000$c7OsKgcRSQx75QLkjq1YXY$...
> ```
>
> Cuatro trozos separados por `$`: el algoritmo, el número de vueltas, la sal y el resultado. **La contraseña no está ahí y no se puede sacar**, solo comprobar si una coincide.
>
> Un millón y medio de vueltas en Django 6.1, y ese número sube en cada versión porque los ordenadores van más rápido. Cuando alguien entra con una contraseña cifrada con menos vueltas, Django la vuelve a cifrar con las de ahora sin que nadie se entere.
>
> De ahí dos reglas. **Nunca se asigna `usuario.password = '...'`**, porque eso guarda el texto tal cual y la cuenta deja de funcionar; se usa `set_password()`. Y nunca se compara con `==`, sino con `check_password()`.
>
> Hay algoritmos mejores disponibles —Argon2, bcrypt, scrypt— y se activan poniendo `PASSWORD_HASHERS` con el que quieras primero e instalando su biblioteca. El de serie es correcto; Argon2 es el recomendado actualmente.

> [!resumen] En resumen
>
> Una línea en el fichero de rutas trae ocho vistas hechas: inicio y cierre de sesión, cambio de contraseña y las cuatro del proceso de recuperación. Las plantillas hay que escribirlas y van en una carpeta llamada `registration`, y la de inicio de sesión necesita `non_field_errors` o los fallos no se ven. De los tres ajustes de redirección, el que más problemas da es `LOGIN_URL`, que apunta a `/accounts/` en inglés aunque hayas montado las rutas en otro sitio. El parámetro `next` es lo que hace volver a donde ibas, y Django ignora los que apunten a otro dominio, que es la protección contra redirecciones abiertas y hay que replicar en cualquier redirección propia que reciba una dirección de fuera. Desde Django 5.0 el cierre de sesión solo acepta `POST`, así que el enlace de toda la vida devuelve `405` y hay que sustituirlo por un formulario, por la misma razón por la que un `GET` no debe cambiar nada. El registro es la única vista que no viene hecha, y son siete líneas con `UserCreationForm` y una llamada a `login`. Los cuatro validadores de contraseña vienen puestos y rechazan las cortas, las comunes y las numéricas. Al iniciar sesión, Django cambia el identificador de la sesión y conserva su contenido, lo que evita la fijación de sesión; al salir, la vacía entera. Los mensajes de error son deliberadamente vagos para no revelar qué cuentas existen, y eso hay que respetarlo en el código propio. Y las contraseñas se guardan cifradas con sal y muchas vueltas, así que se asignan con `set_password` y se comprueban con `check_password`, nunca con una asignación directa ni con `==`.

> [!ejercicio] Practica
>
> 1. Engancha las rutas de autenticación y escribe la plantilla de inicio de sesión. Comprueba que las ocho direcciones existen con `reverse`.
> 2. Quita el `non_field_errors` e intenta entrar con una contraseña incorrecta. Mira qué se ve.
> 3. Deja `LOGIN_URL` como viene y comprueba adónde te manda. Arréglalo con el nombre de tu ruta.
> 4. Entra con `?next=` apuntando a una página tuya y comprueba que vuelves allí. Después apúntalo a otro dominio y mira qué pasa.
> 5. Pon un enlace de salir y comprueba el `405`. Conviértelo en formulario.
> 6. Escribe la vista de registro e inicia la sesión automáticamente al terminar.
> 7. Prueba a registrarte con cinco contraseñas distintas y anota cuál rechaza cada validador.
> 8. Guarda algo en la sesión antes de entrar, entra, y comprueba si sigue ahí. Sal y vuelve a comprobarlo.
> 9. Mira el campo `password` de un usuario en la base de datos e identifica sus cuatro trozos.
