---
titulo: "El panel de administración"
resumen: "La aplicación que lleva instalada desde la lección 4, las tres banderas que deciden quién entra, y para qué no hay que usarla."
minutos: 14
orden: 30
---

Desde la lección 4 hay una ruta `admin/` en el fichero de rutas y seis aplicaciones en `INSTALLED_APPS` que nadie ha tocado. Tres de ellas son esto: un panel completo para consultar y editar los datos, generado a partir de los modelos, con su sistema de usuarios y permisos.

Es la pieza que más fama le ha dado a Django, y la que más se malinterpreta. Hay proyectos que la usan de interfaz principal, y eso acaba mal por razones que conviene entender antes de empezar.

> [!objetivo] Qué vas a aprender
>
> Entrar al panel y registrar los modelos, entender las tres banderas que deciden el acceso y los cuatro permisos que Django crea solo, repartir permisos con grupos, saber dónde queda el historial de cambios, y tener claro para qué sirve el panel y para qué no.

## Ya está funcionando

```consola
python manage.py createsuperuser
```

Con eso y el servidor levantado, `http://127.0.0.1:8000/admin/` pide una contraseña y entra. No hay nada que configurar, porque ya venía:

```python title="agenda/settings.py"
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    # ...
]
```

Las cuatro hacen falta y cada una tiene su papel. `admin` es el panel; `auth` son los usuarios, los grupos y los permisos; `sessions` es lo que mantiene la sesión iniciada entre peticiones; y `contenttypes` es un registro de todos los modelos del proyecto, que es lo que permite que los permisos se refieran a cualquier modelo sin conocerlo de antemano.

```salida
sin sesión, /admin/  ->  302 /admin/login/?next=/admin/
```

Fíjate en ese `?next=`: el panel recuerda adónde ibas para llevarte allí después de identificarte. Es un detalle que habrá que replicar a mano en la lección 32.

Y está en español, con `LANGUAGE_CODE` puesto y sin instalar nada.

## Registrar los modelos

Un modelo no sale en el panel hasta que se registra, y eso se hace en un fichero que `startapp` ya creó:

```python title="contactos/admin.py"
from django.contrib import admin

from .models import Contacto, Etiqueta, Grupo

admin.site.register(Grupo)
admin.site.register(Etiqueta)


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
        pass
```

Las dos formas son equivalentes. La primera vale cuando no hay nada que configurar; la segunda es la que se acaba usando siempre, porque en cuanto quieras cambiar algo necesitas la clase, y eso es la lección siguiente.

Ahora se entiende una cosa de la lección 15: **el `__str__` del modelo es lo que se ve en el panel**. Un modelo sin `__str__` llena las listas de `Contacto object (3)`, y ese es el sitio donde más molesta.

> [!nota] El panel usa tus formularios, y eso significa que tu validación vale
>
> Una consecuencia del bloque D que conviene señalar, porque es lo que hace que el panel sea fiable.
>
> El panel construye un `ModelForm` para cada modelo. Así que todo lo que se midió en la lección 26 se cumple aquí: comprueba los `unique`, llama al `clean()` del modelo, respeta las restricciones del `Meta` y ejecuta `full_clean()`.
>
> De ahí sale un argumento práctico para el reparto de la lección 27: **una regla en el `clean()` del modelo protege también el panel; una regla en el `clean()` de un formulario, no.** Si la validación importa y alguien va a editar desde el panel, tiene que estar en el modelo.

## Quién puede entrar

Tres banderas en el usuario, y confundirlas es lo normal al principio:

| Bandera | Qué significa |
| --- | --- |
| `is_active` | La cuenta sirve. Desactivarla es la forma de dar de baja sin borrar |
| `is_staff` | **Puede entrar al panel.** Nada más |
| `is_superuser` | Tiene todos los permisos, sin comprobar ninguno |

La segunda es la que sorprende. Medido con un usuario al que solo se le pone `is_staff`:

```salida
/admin/                      ->  200
¿ve contactos?               ->  False
/admin/contactos/contacto/   ->  403
```

Entra, y el panel está vacío. **`is_staff` abre la puerta y no da acceso a nada**, porque lo que se ve depende de los permisos. Y pedir la dirección a mano tampoco funciona: `403`.

Esa separación es buena. Permite tener a alguien con acceso al panel y a un solo modelo.

## Los permisos

Django crea cuatro por cada modelo, sin que nadie los pida:

```salida
add_contacto     | Can add contacto
change_contacto  | Can change contacto
delete_contacto  | Can delete contacto
view_contacto    | Can view contacto
```

Se crean al aplicar las migraciones, y de ahí salen los botones que se ven o no se ven en el panel. Con solo `view_contacto`:

```salida
lista de contactos  ->  200
página de añadir    ->  403
has_perm('contactos.view_contacto')  ->  True
has_perm('contactos.add_contacto')   ->  False
```

`view` es el que permite mirar sin tocar, y es más útil de lo que parece: mucha gente de un equipo necesita consultar y no debería poder editar.

Fíjate en el nombre completo que usa `has_perm`: `aplicacion.accion_modelo`. Esa cadena es la misma que se usará en los decoradores de la lección 33.

## Grupos

Dar permisos usuario por usuario no escala. Un grupo es un paquete de permisos:

```python
grupo = Group.objects.create(name='Editores')
grupo.permissions.add(*Permission.objects.filter(
    codename__in=['add_contacto', 'change_contacto', 'view_contacto']))
usuario.groups.add(grupo)
```

```salida
tras el grupo, add:    True
tras el grupo, delete: False
```

Los permisos de una persona son **los suyos más los de sus grupos**. Y todo esto se hace desde el propio panel, en la sección de autenticación, sin escribir código.

La costumbre sana es la misma que en cualquier sistema: **los permisos se dan a grupos y las personas se meten en grupos**. Dárselos directamente a alguien funciona y a los seis meses nadie sabe por qué esa persona puede hacer eso.

> [!aviso] Los permisos hay que refrescarlos desde el intérprete
>
> Un detalle que desconcierta al probar esto:
>
> ```python
> usuario.user_permissions.add(permiso)
> usuario.has_perm('contactos.add_contacto')   # sigue diciendo False
> ```
>
> Django **guarda en caché los permisos** dentro del objeto la primera vez que se consultan, para no hacer una consulta por cada comprobación. Añadir uno después no actualiza esa caché.
>
> En una petición web no molesta, porque el objeto se construye de nuevo cada vez. En el intérprete o en una prueba hay que volver a leerlo:
>
> ```python
> usuario = User.objects.get(pk=usuario.pk)
> ```
>
> Si algún día un permiso recién dado "no funciona", este es el primer sospechoso.

## El historial

Cada cambio hecho desde el panel queda registrado:

```salida
admin | Modificar | Trabajo editado | [{"changed": {"fields": ["Nombre"]}}]
```

Quién, qué, cuándo y qué campos. Se ve en el botón de historial de cada ficha y vive en un modelo, `LogEntry`, que se puede consultar.

Tiene un límite importante: **solo registra lo que pasa por el panel**. Un cambio hecho desde una vista, desde el intérprete o desde una orden de gestión no aparece. No es una auditoría, es el historial del panel.

> [!consejo] Para qué sirve el panel y para qué no
>
> Esta es la parte de la lección que evita un error de diseño caro.
>
> **Sirve para** que el equipo consulte y corrija datos, para cargar contenido, para revisar qué ha pasado durante el desarrollo, y como herramienta interna de gente que sabe cómo funciona la aplicación por dentro.
>
> **No sirve como interfaz para quien usa el producto**, y las razones no son estéticas:
>
> **Enseña el modelo de datos tal cual.** Las tablas, los nombres de los campos, las claves ajenas. Alguien de fuera no tiene por qué saber que un contacto tiene una tabla intermedia de etiquetas.
>
> **No tiene flujos.** Un proceso de tres pasos con validaciones entre ellos no cabe. El panel edita filas, y editar una fila no es lo mismo que hacer algo.
>
> **Sus permisos son por modelo, no por fila.** Se puede decir "puede cambiar contactos" y no "puede cambiar sus contactos". Se arregla sobrescribiendo métodos, y a partir de cierto punto es más trabajo que escribir la vista.
>
> **Es un objetivo de ataque conocido.** Está siempre en la misma dirección. En producción conviene moverla y restringirla, y eso es la lección 42.
>
> La regla: **si quien lo usa no es del equipo, escribe una vista.** Tienes el bloque C y el D para eso, y son unas cuarenta líneas.
>
> Y una que se olvida: el panel tampoco es una herramienta de informes. Sacar totales y gráficas desde ahí se puede y se queda corto enseguida.

> [!nota] Las alternativas, por si el panel se queda corto
>
> Antes de reescribirlo entero, hay dos caminos intermedios.
>
> **Personalizarlo**, que es la lección siguiente y llega bastante más lejos de lo que la gente supone: columnas, filtros, buscador, acciones en lote, formularios anidados y vistas propias dentro del panel.
>
> **Sustituirlo por otro**. Hay paneles alternativos que se montan sobre el mismo mecanismo y traen una interfaz más moderna, y herramientas de administración genéricas que se conectan a la base de datos por su cuenta. Merecen la pena cuando el problema es el aspecto y no el modelo.
>
> Y una tercera que se usa poco: **dos paneles**. `AdminSite` se puede instanciar más de una vez, con modelos y permisos distintos en cada uno. Sirve para separar la administración técnica de la de contenido.

> [!resumen] En resumen
>
> El panel viene instalado desde el primer día y solo hace falta un superusuario para entrar; las cuatro aplicaciones que lo sostienen son el panel, los usuarios, las sesiones y el registro de modelos que permite que los permisos se refieran a cualquiera de ellos. Los modelos se registran en `admin.py`, con la función o con el decorador, y el `__str__` de cada uno es lo que se ve en las listas. Como el panel construye un `ModelForm`, toda la validación del bloque D se cumple ahí, lo que da un argumento para poner las reglas importantes en el `clean()` del modelo y no en el del formulario. El acceso lo deciden tres banderas: `is_active` dice si la cuenta sirve, `is_staff` solo abre la puerta del panel sin dar acceso a nada, y `is_superuser` salta todas las comprobaciones. Django crea cuatro permisos por modelo al migrar, con el nombre `aplicacion.accion_modelo`, y lo que se ve dentro del panel depende de ellos; conviene repartirlos con grupos en lugar de uno a uno, teniendo en cuenta que los permisos se guardan en caché dentro del objeto y hay que releerlo para ver los cambios. Cada edición hecha desde el panel queda en un historial que dice quién, qué y qué campos, pero solo registra lo que pasa por ahí. Y lo más importante es saber dónde está el límite: el panel es una herramienta interna que enseña el modelo de datos, no tiene flujos y da permisos por modelo y no por fila, así que en cuanto quien lo usa no es del equipo, lo que toca es escribir una vista.

> [!ejercicio] Practica
>
> 1. Crea un superusuario, entra al panel y localiza tus modelos. Registra los que falten.
> 2. Mira cómo se ven los objetos en las listas y arregla el `__str__` de los que salgan como `Contacto object (3)`.
> 3. Crea un usuario sin ninguna bandera e intenta entrar. Ponle `is_staff` y comprueba qué ve. Pídele la dirección de la lista a mano y mira el código de respuesta.
> 4. Dale solo el permiso de ver y comprueba que puede mirar pero no añadir.
> 5. Crea un grupo con tres permisos, mete al usuario y comprueba qué puede hacer ahora. Hazlo todo desde el panel.
> 6. Añade un permiso desde el intérprete y comprueba que `has_perm` sigue diciendo que no. Arréglalo releyendo el usuario.
> 7. Escribe un `clean()` en el modelo que rechace un valor e intenta guardarlo desde el panel.
> 8. Edita algo y mira el historial de esa ficha. Después haz el mismo cambio desde el intérprete y comprueba si aparece.
