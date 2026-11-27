---
titulo: "Permisos y decoradores"
resumen: "Cerrar las páginas con una línea, el decorador que manda a identificarse a quien ya está identificado, y la diferencia entre permisos por modelo y por fila."
minutos: 16
orden: 33
---

Ya hay usuarios que entran y salen. Ahora falta que eso sirva para algo, porque hasta este momento todas las vistas del módulo son públicas: cualquiera puede listar, editar y borrar los contactos de cualquiera.

Y aquí es donde se paga la deuda que dejaron la 23 y la 24. Las dos dejaron escrito un patrón a medias: filtrar por propietario en `get_queryset` y rellenar `formulario.instance.propietario` en `form_valid`, los dos esperando a que existiera el usuario. Ya existe.

> [!objetivo] Qué vas a aprender
>
> Saber quién es `peticion.user` y qué ofrece, cerrar vistas de función con decoradores y vistas de clase con mixins, elegir entre redirigir y devolver `403`, distinguir permisos por modelo de permisos por fila y escribir estos últimos, y ocultar en las plantillas lo que no se puede hacer.

## `peticion.user`

Siempre está, haya sesión o no. Sin sesión es un `AnonymousUser`, que responde a lo mismo diciendo que no:

```salida
                  is_authenticated   username   is_staff
AnonymousUser     False              ''         False
basico            True               'basico'   False
admin             True               'admin'    True
```

Eso está bien pensado: **no hace falta comprobar si hay usuario antes de preguntarle nada**. `peticion.user.is_authenticated` funciona siempre.

Y viene de un componente concreto, el `AuthenticationMiddleware` que está en `MIDDLEWARE` desde la lección 4. Si alguna vez `peticion.user` no existe, es que se ha quitado de ahí.

## Decoradores

Tres, para tres casos:

```python title="contactos/views.py"
from django.contrib.auth.decorators import login_required, permission_required, user_passes_test


@login_required
def privada(peticion):
        return HttpResponse(f'hola {peticion.user.username}')


@permission_required('contactos.add_contacto', raise_exception=True)
def nuevo(peticion):
        ...


@user_passes_test(lambda u: u.is_staff)
def solo_equipo(peticion):
        ...
```

La cadena del segundo es la de la lección 30: `aplicacion.accion_modelo`. Los cuatro permisos por modelo los crea Django al migrar.

Medidos con tres visitantes distintos:

```salida
                        anónimo                       identificado sin permiso   superusuario
@login_required         302 /cuentas/login/?next=...  200                        200
@permission_required    302 /cuentas/login/?next=...  302 /cuentas/login/?next=  200
... raise_exception     403                           403                        200
@user_passes_test       302 /cuentas/login/?next=...  302 /cuentas/login/?next=  200
```

El `@login_required` hace lo esperado: manda a identificarse con el `next` de la lección anterior ya puesto.

> [!aviso] El decorador que manda a identificarse a quien ya está identificado
>
> Mira la segunda fila, columna del medio. Alguien **con la sesión iniciada** y sin el permiso acaba en la página de inicio de sesión.
>
> Se identifica otra vez, vuelve, y otra vez a la página de inicio de sesión. Un bucle en el que la aplicación pide la contraseña sin parar sin explicar nunca cuál es el problema, que es el permiso y no la identidad.
>
> Es el comportamiento por defecto de `@permission_required` y de `@user_passes_test`, y casi nunca es lo que se quiere:
>
> ```python
> @permission_required('contactos.add_contacto', raise_exception=True)
> def nuevo(peticion):
>         ...
> ```
>
> Con eso, la tercera fila: **`403` para quien no puede**, que es el código correcto de la lección 2 y se puede personalizar con una plantilla `403.html`.
>
> La regla práctica: **`raise_exception=True` siempre, salvo que tengas un motivo concreto para lo otro.** El motivo concreto existe —un sitio donde la mayoría de la gente no ha entrado y el permiso llega al entrar—, y es la excepción.
>
> Y una consecuencia de la primera columna: con `raise_exception=True`, un visitante anónimo recibe `403` en lugar de ir a identificarse, que tampoco es ideal. Cuando importe, se ponen los dos decoradores:
>
> ```python
> @login_required
> @permission_required('contactos.add_contacto', raise_exception=True)
> def nuevo(peticion):
>         ...
> ```

## Mixins

Lo mismo para las vistas de clase de la lección 22:

```python title="contactos/views_clase.py"
from django.contrib.auth.mixins import (
    LoginRequiredMixin, PermissionRequiredMixin, UserPassesTestMixin)


class ListaPrivada(LoginRequiredMixin, ListView):
        model = Contacto


class ListaConPermiso(PermissionRequiredMixin, ListView):
        model = Contacto
    permission_required = 'contactos.add_contacto'
    raise_exception = True


class ListaSoloEquipo(UserPassesTestMixin, ListView):
        model = Contacto

    def test_func(self):
                return self.request.user.is_staff
```

```salida
            privada   permiso   equipo
anónimo     302       403       302
basico      200       403       403
admin       200       200       200
```

`permission_required` admite una lista si hacen falta varios, y `test_func` es un método, así que puede mirar la petición entera y no solo el usuario, que es lo que lo hace más útil que la función suelta.

> [!aviso] Los mixins van primero, y esto no avisa
>
> ```salida
> MRO: ['ListaPrivada', 'LoginRequiredMixin', 'AccessMixin', 'ListView']
> ```
>
> El orden importa y es el del módulo 1: Python recorre las clases de izquierda a derecha, así que el mixin tiene que estar **antes** que la vista para poder interceptar la petición.
>
> ```python
> class Mal(ListView, LoginRequiredMixin):   # la comprobación no se ejecuta
>         model = Contacto
> ```
>
> Escrito al revés, `ListView` responde primero y la página queda abierta. **No hay ningún error, ningún aviso y ninguna señal**: solo una vista que creías cerrada.
>
> Es un fallo de seguridad silencioso, y merece la pena comprobarlo con una prueba en lugar de confiar en la vista: pedir la página sin sesión y verificar que no devuelve `200`. Eso es la lección 39.

## Permisos por fila

Los permisos de Django son **por modelo**: "puede cambiar contactos", no "puede cambiar sus contactos". Y lo segundo es lo que hace falta casi siempre.

Con el modelo preparado:

```python title="contactos/models.py"
propietario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name='contactos')
```

Fíjate en `settings.AUTH_USER_MODEL` en lugar de importar `User`. Es lo que permite cambiar de modelo de usuario en la lección siguiente sin reescribir las relaciones, y hacerlo desde el principio sale gratis.

Y entonces, los dos patrones que quedaron pendientes.

**Filtrar lo que se ve**, que era la deuda de la lección 23:

```python
class MisContactos(LoginRequiredMixin, ListView):
        model = Contacto

    def get_queryset(self):
                return super().get_queryset().filter(propietario=self.request.user)
```

En un `DetailView`, un `UpdateView` o un `DeleteView`, ese mismo `get_queryset` hace que pedir la ficha ajena dé `404`. Y eso es mejor que un `403`, porque **un `403` confirma que ese objeto existe**, que es la misma lógica del mensaje vago de la lección anterior.

**Rellenar lo que no se pregunta**, que era la deuda de la lección 24:

```python
class CrearContacto(LoginRequiredMixin, CreateView):
        model = Contacto
    fields = ['nombre', 'correo', 'telefono']

    def form_valid(self, formulario):
                formulario.instance.propietario = self.request.user
        return super().form_valid(formulario)
```

El propietario **no está en `fields`** a propósito. Si estuviera, saldría como desplegable y cualquiera podría crear contactos a nombre de otro.

> [!consejo] Los cuatro sitios donde hay que cerrar, y ninguno sobra
>
> Es la parte de esta lección que de verdad importa, porque hacer solo lo primero es lo habitual y no sirve de nada.
>
> **Ocultar el botón en la plantilla.** Es cortesía, no seguridad. Quien sepa la dirección entra igual.
>
> **Cerrar la vista** con el decorador o el mixin. Es lo que impide entrar a una página.
>
> **Filtrar el `queryset`** para que lo ajeno no aparezca ni se pueda pedir por su identificador. Sin esto, una vista cerrada sigue enseñando los datos de cualquiera cambiando un número en la dirección.
>
> **Limitar las opciones de los formularios**, que es lo que quedó apuntado en la lección 28: un desplegable sin filtrar enseña los grupos de todo el mundo y permite asignarse a ellos.
>
> Los cuatro. El fallo típico de un proyecto por lo demás correcto es tener el primero y el segundo, y que `/contactos/47/` enseñe la ficha de otra persona.

## En las plantillas

Dos variables están disponibles en todas partes, sin que ninguna vista las pase:

```html
{% if user.is_authenticated %}
  Hola, {{ user.username }}
  {% if perms.contactos.add_contacto %}
    <a href="{% url 'contactos:nuevo' %}">Añadir</a>
  {% endif %}
{% else %}
  <a href="{% url 'login' %}?next={{ request.path|urlencode }}">Entrar</a>
{% endif %}
```

```salida
anónimo  ->  fuera          | perm:False | staff:False
basico   ->  dentro:basico  | perm:False | staff:False
admin    ->  dentro:admin   | perm:True  | staff:True
```

Vienen de los procesadores de contexto que se mencionaron en la lección 19, y que están en `TEMPLATES` desde el principio. Por eso `{{ user }}` funciona en cualquier plantilla.

`perms` se consulta con el mismo nombre de tres partes, y si te equivocas al escribirlo **da `False` en silencio** por lo de la lección 17. Un permiso mal escrito esconde un botón para siempre y nadie se entera. Para las comprobaciones que importan, una prueba.

> [!nota] Cuando los permisos de Django se quedan cortos
>
> El sistema es sencillo a propósito: cuatro acciones por modelo y grupos. Aguanta más de lo que parece y hay tres necesidades que no cubre.
>
> **Permisos por fila de verdad**, guardados en la base de datos en lugar de deducidos con un `filter`. Existe `django-guardian` para eso. Antes de instalarlo, conviene comprobar que el `filter` no basta, porque casi siempre basta.
>
> **Roles con reglas**, del estilo "puede editar si es el autor y el artículo no está publicado". Hay bibliotecas de reglas, y también se resuelve con un método en el modelo:
>
> ```python
> def puede_editar(self, usuario):
>         return usuario == self.propietario or usuario.is_staff
> ```
>
> Eso se prueba sin montar una petición, que es el criterio de la lección 16, y se usa desde la vista y desde la plantilla.
>
> **Permisos propios sin modelo detrás**, como "puede exportar el listado". Se declaran en el `Meta` del modelo:
>
> ```python
> class Meta:
>         permissions = [('exportar_contactos', 'Puede exportar el listado')]
> ```
>
> Y aparecen en el panel como cualquier otro.

> [!resumen] En resumen
>
> `peticion.user` siempre existe y sin sesión es un `AnonymousUser` que responde que no a todo, así que no hace falta comprobar nada antes de preguntarle. Las vistas de función se cierran con `login_required`, `permission_required` y `user_passes_test`, y las de clase con los mixins equivalentes, que tienen que ir antes de la vista en la lista de clases o la comprobación no se ejecuta, sin ningún aviso. Los dos últimos redirigen a la página de inicio de sesión cuando falta un permiso, lo que deja a quien ya está identificado dando vueltas sin entender qué pasa, así que lo normal es `raise_exception=True` para que devuelvan `403`. Los permisos de Django son por modelo, y lo que casi siempre hace falta es por fila, que se consigue con dos patrones: filtrar el `queryset` por propietario, lo que además convierte los accesos ajenos en `404` en lugar de `403` y así no confirma que el objeto existe, y rellenar el propietario en `form_valid` dejándolo fuera de los campos del formulario. Cerrar bien son cuatro sitios y ninguno sobra: ocultar el botón, que es cortesía; cerrar la vista, que impide entrar; filtrar el `queryset`, sin lo cual cambiar un número en la dirección enseña datos ajenos; y limitar las opciones de los formularios. En las plantillas, `user` y `perms` están disponibles siempre gracias a los procesadores de contexto, con la advertencia de que un permiso mal escrito devuelve `False` en silencio.

> [!ejercicio] Practica
>
> 1. Cierra una vista con `@login_required` y comprueba adónde manda a un visitante anónimo, incluido el `next`.
> 2. Cierra otra con `@permission_required` sin `raise_exception`, entra con un usuario sin ese permiso y describe lo que pasa. Añade el argumento y compara.
> 3. Convierte las dos a vistas de clase con sus mixins. Pon el mixin después de la vista y comprueba que la página queda abierta.
> 4. Añade un campo de propietario a tu modelo usando `settings.AUTH_USER_MODEL` y rellénalo en `form_valid`.
> 5. Filtra la lista por propietario y comprueba con dos usuarios que cada uno ve lo suyo.
> 6. Pide la ficha de un contacto ajeno por su identificador. Arréglalo con `get_queryset` y explica por qué es mejor un `404` que un `403`.
> 7. Oculta el botón de añadir con `perms` en la plantilla. Después escribe mal el nombre del permiso y comprueba que no hay ningún error.
> 8. Declara un permiso propio en el `Meta` del modelo, migra y compruébalo en el panel.
