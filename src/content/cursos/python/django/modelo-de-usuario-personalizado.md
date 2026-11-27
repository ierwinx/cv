---
titulo: "Modelo de usuario personalizado"
resumen: "La decisión que hay que tomar en el primer día del proyecto, el error exacto que sale si te acuerdas tarde, y las tres formas de hacerlo."
minutos: 15
orden: 34
---

El modelo `User` que has estado usando trae unos supuestos que conviene mirar de cerca, porque cambiarlos después es caro. Medidos:

```salida
username    CharField   max_length=150  unique=True   blank=False
email       EmailField  max_length=254  unique=False  blank=True
first_name  CharField   max_length=150                blank=True
last_name   CharField   max_length=150                blank=True
```

**El correo no es único y puede estar vacío.** Comprobado:

```salida
dos usuarios con el mismo correo: 5, 6
```

Para casi cualquier sitio actual eso está mal, porque la gente entra con su correo y espera recuperar la contraseña con él. Y a eso se suman un nombre de usuario obligatorio que nadie quiere inventarse y un nombre partido en dos que no funciona en medio mundo.

Todo se arregla con un modelo propio. El problema es **cuándo**.

> [!objetivo] Qué vas a aprender
>
> Entender por qué esta decisión se toma al principio y reconocer el error que sale si se toma tarde, elegir entre las tres estrategias, escribir un modelo de usuario con `AbstractUser` y registrarlo en el panel, y saber qué implica cambiar el campo con el que se entra.

## Primero, la advertencia

Un proyecto ya migrado con `auth.User`, al que se le cambia el modelo después:

```salida
django.db.migrations.exceptions.InconsistentMigrationHistory:
Migration admin.0001_initial is applied before its dependency
cuentas.0001_initial on database 'default'.
```

Eso es lo que sale, y no hay ningún ajuste que lo arregle. El motivo es que **medio Django apunta al modelo de usuario**: el panel, las sesiones, los permisos, los grupos y el historial. Cambiarlo significa reescribir todas esas claves ajenas en tablas que ya tienen datos.

Las salidas son dos, y ninguna es agradable. En desarrollo, borrar la base de datos y las migraciones y empezar de nuevo, que es lo que se hace en la práctica. En producción, una secuencia de migraciones manuales que la documentación de Django describe con la palabra "difícil".

> [!consejo] La regla: siempre, y en la primera hora
>
> Dado lo anterior, la recomendación de la documentación oficial es tajante y conviene adoptarla sin pensarlo: **crea un modelo de usuario propio en todos los proyectos nuevos, aunque sea idéntico al de Django.**
>
> ```python title="cuentas/models.py"
> from django.contrib.auth.models import AbstractUser
>
>
> class Usuario(AbstractUser):
>         pass
> ```
>
> Cuatro líneas, cero cambios de comportamiento, y el día que haga falta un campo es añadirlo. Sin eso, ese día es un problema serio.
>
> Y hay una segunda mitad que se olvida y cuesta lo mismo: **no importar `User` nunca**.
>
> ```python
> from django.contrib.auth.models import User     # no
> from django.conf import settings                # sí, en modelos
> from django.contrib.auth import get_user_model  # sí, en el resto
> ```
>
> En las relaciones va `settings.AUTH_USER_MODEL`, que es lo que se usó en la lección 33 sin explicar del todo. En el código normal, `get_user_model()`. Escrito así, el proyecto sobrevive al cambio.
>
> La diferencia entre las dos no es de estilo: en un `models.py`, `get_user_model()` se ejecutaría antes de que las aplicaciones estén cargadas y falla. Por eso ahí va la cadena de los ajustes.

## Las tres estrategias

| Estrategia | Cuándo | Coste |
| --- | --- | --- |
| Modelo aparte con `OneToOne` | El proyecto ya está en producción con `auth.User` | Una consulta más y un objeto que puede no existir |
| `AbstractUser` | Casi siempre | Ninguno si se hace al principio |
| `AbstractBaseUser` | Autenticación de verdad distinta | Hay que escribir bastante |

### El perfil aparte

```python
class Perfil(models.Model):
        usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=20, blank=True)
```

Es lo que se hacía antes de que existieran las otras dos y es la única opción cuando ya es tarde. Funciona y tiene dos pegas que la lección 14 ya midió: **cada acceso al perfil es otra consulta** si no se pide con `select_related`, y **la vuelta de un `OneToOne` lanza una excepción en vez de devolver `None`** cuando no existe, lo que obliga a crear el perfil en el registro y a acordarse de los usuarios antiguos.

### `AbstractUser`

La que se usa el noventa por ciento de las veces. Hereda todo lo que tenía `User` y deja añadir y redefinir:

```python title="cuentas/models.py"
from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
        email = models.EmailField('correo', unique=True)
    telefono = models.CharField('teléfono', max_length=20, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
                return self.email
```

```python title="sitio/settings.py"
AUTH_USER_MODEL = 'cuentas.Usuario'
```

Esa cadena es `aplicacion.Modelo`, no la ruta de importación.

Los dos atributos de en medio son los que cambian cómo se entra:

**`USERNAME_FIELD`** es el campo que identifica. Al ponerlo en `email`, se entra con el correo. Tiene que ser único, y por eso la línea de arriba lo redefine.

**`REQUIRED_FIELDS`** es lo que pide `createsuperuser` además del identificador y la contraseña. No se pone ahí ni `USERNAME_FIELD` ni la contraseña.

Medido:

```salida
USERNAME_FIELD: email | REQUIRED_FIELDS: ['username']
autenticar con el correo:  jefe@ejemplo.es
autenticar con el nombre:  None
```

El nombre de usuario ya no sirve para entrar, aunque siga existiendo. Si no lo quieres, se quita con `username = None` y `REQUIRED_FIELDS = []`, y entonces hace falta un gestor propio porque `create_user` espera un nombre.

### `AbstractBaseUser`

Solo trae la contraseña y la marca de última entrada. Todo lo demás —los permisos, las banderas, el gestor— hay que escribirlo o heredarlo de `PermissionsMixin`.

Es lo que hace falta cuando la autenticación no se parece a un usuario con contraseña: entrar solo con el teléfono y un código, identificarse contra un sistema externo, o no tener contraseña en absoluto.

**Si dudas entre esta y `AbstractUser`, es `AbstractUser`.**

## El panel

El modelo propio hay que registrarlo, y no con un `ModelAdmin` normal:

```python title="cuentas/admin.py"
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
        list_display = ['email', 'username', 'is_staff']
    ordering = ['email']
    fieldsets = UserAdmin.fieldsets + ((None, {'fields': ['telefono']}),)
```

```salida
login en el admin: True
/admin/cuentas/usuario/          ->  200
/admin/cuentas/usuario/1/change/ ->  200
```

Heredar de `UserAdmin` y no de `ModelAdmin` es lo que trae el formulario de contraseña que cifra en lugar de guardar el texto, el enlace para cambiarla y la sección de permisos.

Y fíjate en el `fieldsets = UserAdmin.fieldsets + (...)`: **hay que sumar a los del padre, no sustituirlos**, o los campos heredados desaparecen del formulario. Es el mismo razonamiento del `class Meta(UserCreationForm.Meta)` de la lección 32.

El `ordering` tampoco es decorativo: el de `UserAdmin` ordena por `username`, y si has quitado ese campo, el panel falla.

> [!aviso] Los formularios de registro también apuntan al modelo antiguo
>
> `UserCreationForm` y `UserChangeForm` tienen el modelo escrito dentro. Con un modelo propio hay que redefinirlos:
>
> ```python title="cuentas/forms.py"
> from django.contrib.auth.forms import UserCreationForm
>
> from .models import Usuario
>
>
> class RegistroForm(UserCreationForm):
>         class Meta(UserCreationForm.Meta):
>                 model = Usuario
>         fields = ['email', 'username']
> ```
>
> Y lo mismo con cualquier formulario que lleve `User` dentro. Es la parte que se olvida al hacer el cambio, y el síntoma es un registro que crea usuarios del modelo equivocado o que falla con un error de campo inexistente.
>
> Desde Django 4.2 existen `BaseUserCreationForm` y `AdminUserCreationForm`, que son las versiones pensadas para heredar; conviene mirar cuál toca en lugar de suponer.

> [!nota] Qué guardar en el usuario y qué no
>
> Una vez que se puede añadir campos, la tentación es meterlo todo ahí. Dos criterios que ahorran disgustos.
>
> **En el usuario va lo que es la persona**: cómo se identifica, cómo se le llama, cómo se le escribe, en qué idioma. Son datos que casi todas las páginas consultan, y tenerlos ahí evita una consulta.
>
> **En un modelo aparte va lo que tiene su propia vida**: las preferencias, la facturación, lo que solo usa una sección. Y sobre todo, lo que puede haber más de uno: varias direcciones, varios métodos de pago. Eso no cabe en el usuario.
>
> Y una que se pasa por alto: **la tabla de usuarios se lee en todas las peticiones**. Meter ahí un campo de texto largo o un JSON grande hace más lento el sitio entero.
>
> Sobre el nombre, un apunte para un curso en español. `first_name` y `last_name` dan por supuesto un nombre y un apellido; en español hay dos apellidos, y en otros sitios el orden es al revés o no hay apellido. La solución que menos problemas da es **un solo campo `nombre` con lo que la persona quiera poner**, y si hace falta ordenar, un campo aparte para eso.

> [!resumen] En resumen
>
> El modelo `User` de Django tiene el correo no único y opcional, un nombre de usuario obligatorio y el nombre partido en dos, supuestos que no encajan con casi ningún proyecto actual. Cambiarlo después de haber migrado da un error de historial de migraciones inconsistente que no se arregla con ningún ajuste, porque el panel, las sesiones, los permisos y el historial apuntan todos al modelo de usuario; de ahí la recomendación oficial de crear uno propio en todos los proyectos nuevos, aunque sea una clase vacía que hereda de `AbstractUser`, y de no importar nunca `User` directamente sino usar `settings.AUTH_USER_MODEL` en los modelos y `get_user_model()` en el resto. Las tres estrategias son un perfil aparte con `OneToOne`, que es la única cuando ya es tarde y cuesta una consulta y un objeto que puede no existir; `AbstractUser`, que hereda todo y deja añadir y redefinir campos, y es la respuesta casi siempre; y `AbstractBaseUser`, que solo trae la contraseña y hace falta cuando la autenticación es de otro tipo. Con `USERNAME_FIELD` se cambia el campo con el que se entra, que tiene que ser único, y `REQUIRED_FIELDS` es lo que pide `createsuperuser` aparte de ese campo y la contraseña. En el panel hay que heredar de `UserAdmin` y no de `ModelAdmin`, sumando a sus `fieldsets` en lugar de sustituirlos, y hay que acordarse de redefinir los formularios de creación, que llevan el modelo antiguo escrito dentro.

> [!ejercicio] Practica
>
> 1. Crea un proyecto nuevo, migra con el usuario de serie, y después intenta cambiarlo. Lee el error entero.
> 2. Empieza otro proyecto poniendo el modelo propio antes de la primera migración y comprueba que todo funciona igual.
> 3. Haz el correo único y obligatorio, y comprueba que ya no se pueden crear dos usuarios con el mismo.
> 4. Cambia `USERNAME_FIELD` a `email` y crea un superusuario. Comprueba con qué dato entra y con cuál no.
> 5. Registra el modelo en el panel heredando de `ModelAdmin` y mira qué pasa con la contraseña. Cámbialo a `UserAdmin`.
> 6. Sustituye los `fieldsets` en vez de sumarlos y comprueba qué campos desaparecen.
> 7. Redefine `UserCreationForm` para tu modelo y prueba el registro.
> 8. Añade un campo de teléfono al usuario y otro a un modelo de preferencias aparte. Explica en una frase por qué cada uno va donde va.
