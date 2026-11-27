---
titulo: "Métodos del modelo, Meta y __str__"
resumen: "Cómo dejar de repartir la lógica de un contacto por todas las vistas, y los ajustes que valen para la tabla entera."
minutos: 16
orden: 15
---

Un modelo no es solo una descripción de columnas. Es una clase de Python, y puede tener métodos, propiedades y validación como cualquier otra. Esta lección cierra el bloque con lo que va **dentro** de la clase pero no es un campo: los métodos que dan lógica, la clase `Meta` con los ajustes de la tabla entera, y las restricciones que por fin obligan a la base de datos a cumplir lo que los campos solo sugerían.

Hay una razón de fondo para tomárselo en serio, y es la misma de la lección 41 del módulo 3, cuando se separó la lógica de la interfaz de Tkinter: **si el modelo no sabe hacer nada, todo lo que sabe hacer un contacto acaba repartido entre las vistas**, y la tercera vez que hay que calcular lo mismo, alguien lo calcula distinto.

> [!objetivo] Qué vas a aprender
>
> Escribir métodos y propiedades en un modelo y saber cuáles son propios de Django, usar la clase `Meta` para el orden por defecto y los nombres legibles, declarar índices y restricciones que la base de datos hace cumplir de verdad, y conocer el reparto entre `clean`, `save` y las restricciones a la hora de garantizar que un dato es correcto.

## Métodos

Son métodos normales. Se les pasa `self`, que es la fila, y pueden usar sus campos y sus relaciones:

```python title="contactos/models.py"
class Contacto(models.Model):
        ...

    def __str__(self):
                return self.nombre

    @property
    def iniciales(self):
                return ''.join(parte[0].upper() for parte in self.nombre.split())

    def tiene_contacto_directo(self):
                return bool(self.telefono or self.correo)
```

```consola
>>> Contacto.objects.first().iniciales
'AR'
```

La diferencia entre un método y una `@property` es que la propiedad se usa sin paréntesis. Eso importa más de lo que parece, porque **las plantillas de Django no permiten llamar a funciones con argumentos**: `{{ contacto.iniciales }}` funciona con las dos formas, pero cualquier cosa que necesite un argumento hay que resolverla con una etiqueta de plantilla, que es más trabajo. La costumbre es que lo que se vaya a enseñar sea una propiedad o un método sin argumentos.

> [!aviso] Un método no se puede usar en `filter` ni en `order_by`
>
> Esta es la frontera que hay que tener clara, y la explica todo lo visto en la lección 11: los métodos son **Python**, y `filter` y `order_by` son **SQL**.
>
> ```python
> Contacto.objects.order_by('iniciales')     # FieldError: no existe ese campo
> ```
>
> La base de datos no sabe ejecutar tu método. Para ordenar o filtrar por algo calculado hay dos caminos: `annotate` con una función de base de datos, como se vio en la lección 12, o traer los datos y hacerlo en Python con `sorted`, con el coste que eso tiene.
>
> Es otra versión de la misma idea que aparece todo el bloque: lo que ocurre en la base de datos escala y lo que ocurre en Python no.

### Los tres métodos que Django conoce por su nombre

```python
def __str__(self):
        return self.nombre
```

Ya está dicho desde la lección 8 y se repite porque es el que más rendimiento da por línea escrita: es lo que se ve en el panel de administración, en los desplegables de los formularios y al depurar.

```python
def get_absolute_url(self):
        from django.urls import reverse
    return reverse('contactos:detalle', args=[self.pk])
```

Contesta a "¿cuál es la dirección de este objeto?", y hay media docena de sitios en Django que la llaman sola: el panel de administración pone un botón de "ver en el sitio", las vistas de crear y editar redirigen ahí después de guardar, y en las plantillas basta con `{{ contacto.get_absolute_url }}`. Necesita rutas con nombre, que es lo de la lección 21, y se añade en cuanto existan.

```python
def clean(self):
        ...
```

Es el sitio de la validación que afecta a **varios campos a la vez**, y lo llama `full_clean()`. Se ve en el bloque de formularios.

## La clase `Meta`

Dentro del modelo, una clase llamada `Meta` con los ajustes que son de la tabla entera:

```python title="contactos/models.py"
class Contacto(models.Model):
        ...

    class Meta:
                verbose_name = 'contacto'
        verbose_name_plural = 'contactos'
        ordering = ['nombre']
```

| Opción | Para qué |
| --- | --- |
| `ordering` | Orden por defecto de todas las consultas |
| `verbose_name` y `verbose_name_plural` | Cómo se llama el modelo en el panel y en los mensajes |
| `db_table` | Cambiar el nombre de la tabla |
| `indexes` | Índices propios |
| `constraints` | Restricciones que cumple la base de datos |
| `unique_together` | Combinación de campos que no se repite |
| `abstract` | Que la clase sea solo para heredar de ella, sin tabla |
| `permissions` | Permisos propios, para el bloque E |

**`verbose_name_plural` existe porque el plural en inglés no siempre es añadir una ese**, y Django, que lo hace así, se equivoca con casi todo en español: "contactos" le saldría bien por casualidad, pero "direccións" y "mess" no. Con el idioma en `es-es`, ponerlo es la diferencia entre un panel de administración cuidado y uno que da vergüenza enseñar.

**`ordering` tiene un efecto que hay que medir antes de ponerlo**:

```consola
>>> Contacto.objects.values_list('nombre', flat=True)
['Ana Ruiz', 'Luis Pardo', 'Por id', 'Sin grupo', 'Zoe Alvarez']
```

Salen ordenados sin que nadie lo haya pedido. Eso es cómodo y tiene dos contrapartidas. La primera es que **cada consulta lleva ahora un `ORDER BY`**, incluidas las que no lo necesitan, y ordenar cuesta. La segunda es que ese orden es el de la base de datos, con los tres problemas del español de la lección 12.

Aun así conviene ponerlo, por un motivo concreto: **paginar sin un orden definido devuelve resultados incoherentes**. Sin `ORDER BY`, el gestor no garantiza que la página dos sea la continuación de la página uno, y una fila puede salir en las dos o en ninguna. Django avisa de esto con un `UnorderedObjectListWarning` en cuanto pagines, que es la lección 36.

## Índices

Un índice hace rápidas las búsquedas por una columna a cambio de ocupar espacio y ralentizar un poco las escrituras. Se declaran en `Meta`:

```python
class Meta:
        indexes = [
        models.Index(fields=['grupo', 'nombre'], name='idx_grupo_nombre'),
    ]
```

Ese es un índice **compuesto**, y el orden de los campos importa: sirve para filtrar por `grupo`, y para filtrar por `grupo` y ordenar por `nombre`, pero no para filtrar solo por `nombre`. Es como un listín ordenado por provincia y luego por apellido: para buscar por apellido sin saber la provincia no ayuda.

Los índices no se ponen por si acaso. Django ya crea los que casi siempre hacen falta, que son los de las claves primarias, los de las claves ajenas y los de los campos con `unique`. Se añade uno cuando una consulta concreta va lenta y se ha comprobado que es por ahí.

## Restricciones

Aquí se cierra algo que ha quedado pendiente en dos lecciones. En la 8 se vio que `save()` no valida; en la 9, que `choices` no genera ninguna restricción. La conclusión era que quien protege los datos es el formulario. Eso vale para lo que escribe una persona y no vale para lo que escribe tu código, una migración o una carga masiva.

Lo único que se cumple siempre es lo que vive en la base de datos:

```python
class Meta:
        constraints = [
        models.CheckConstraint(
            condition=models.Q(nombre__gt=''),
            name='nombre_no_vacio',
        ),
    ]
```

```consola
>>> Contacto.objects.create(nombre='', correo='vacio@e.es')
IntegrityError: CHECK constraint failed: nombre_no_vacio
```

Ahora sí. Ni `create()`, ni `update()`, ni un `INSERT` a mano pueden meter un contacto sin nombre.

Hay dos tipos principales:

```python
constraints = [
    models.CheckConstraint(condition=models.Q(nombre__gt=''), name='nombre_no_vacio'),
    models.UniqueConstraint(fields=['nombre', 'grupo'], name='nombre_unico_por_grupo'),
]
```

`UniqueConstraint` es la forma moderna de `unique_together`, y admite cosas que aquella no: una condición para que la unicidad solo se aplique a algunas filas, o unicidad sobre una expresión.

> [!nota] `condition` y no `check`: una diferencia de versión
>
> Si copias un ejemplo de `CheckConstraint` de internet, casi seguro que dice `check=`:
>
> ```python
> models.CheckConstraint(check=models.Q(nombre__gt=''), name='...')   # forma antigua
> models.CheckConstraint(condition=models.Q(nombre__gt=''), name='...')  # 5.1 en adelante
> ```
>
> El argumento se renombró a `condition` en Django 5.1 y `check` quedó obsoleto. En 6.1 la firma es:
>
> ```consola
> >>> inspect.signature(CheckConstraint.__init__)
> (self, *, condition, name, violation_error_code=None, violation_error_message=None)
> ```
>
> Es otro caso de los de la lección 1: mira la versión de lo que lees.

> [!aviso] Una restricción no llega sola a los formularios
>
> Una restricción de base de datos protege los datos y **no da un error bonito**: da un `IntegrityError`, que en una vista es una página 500.
>
> Por eso la protección completa son dos capas, y hay que poner las dos:
>
> - La **restricción**, que garantiza que el dato malo no entra nunca, venga de donde venga.
> - La **validación del formulario**, que atrapa el caso antes de llegar a la base de datos y devuelve un mensaje que se entiende.
>
> `UniqueConstraint` tiene además una ayuda: `validate_constraints()` las comprueba desde Python, y `full_clean()` lo llama, así que un `ModelForm` las convierte en errores de formulario por su cuenta. Con `CheckConstraint` el mensaje sale genérico salvo que le pongas `violation_error_message`, que existe justo para eso.

## Qué va en el modelo y qué no

Para cerrar el bloque, el criterio, que es el mismo de la lección 41 del módulo 3:

**Va en el modelo** todo lo que sea verdad sobre un contacto sin importar quién pregunte: las iniciales, si está completo, cómo se muestra, cuál es su dirección. Si dos vistas necesitan lo mismo, va en el modelo.

**No va en el modelo** nada que sepa de HTTP. Un modelo que lee `request`, que devuelve HTML o que sabe qué página estás mirando ha cruzado la frontera, y a partir de ahí no se puede probar sin montar una petición ni reutilizar desde un guion de línea de comandos.

La prueba práctica es esta: **un modelo tiene que poder usarse entero desde `manage.py shell`**. Todo lo que has hecho en este bloque ha sido desde ahí, sin una sola página de por medio, y esa es exactamente la propiedad que hay que conservar cuando en el bloque siguiente empiecen a aparecer vistas.

> [!resumen] En resumen
>
> Un modelo es una clase y puede tener métodos y propiedades, que son el sitio donde va todo lo que es verdad sobre un objeto independientemente de quién pregunte; lo que se vaya a enseñar conviene que sea una propiedad o un método sin argumentos, porque las plantillas no pueden pasar argumentos. Esos métodos son Python y no SQL, así que no se puede filtrar ni ordenar por ellos. Django conoce tres por su nombre: `__str__`, que se escribe siempre; `get_absolute_url`, que contesta cuál es la dirección del objeto y que media docena de sitios llaman solos; y `clean`, para la validación que afecta a varios campos. La clase `Meta` guarda los ajustes de la tabla entera, y los dos que se ponen casi siempre son `verbose_name_plural`, porque el plural automático está pensado para el inglés, y `ordering`, que da un orden por defecto y que conviene poner aunque cueste una ordenación en cada consulta, porque paginar sin orden definido devuelve resultados incoherentes. También viven ahí los índices, que se añaden cuando una consulta concreta va lenta y no por si acaso, y las restricciones, que son lo único que se cumple siempre, pase lo que pase con `save()`, `update()` o una migración; en Django 5.1 en adelante el argumento de `CheckConstraint` se llama `condition` y no `check`. La protección completa son dos capas, la restricción que impide el dato malo y la validación del formulario que da un mensaje entendible. Y el criterio para saber qué va en el modelo es que tiene que poder usarse entero desde el intérprete, sin ninguna petición de por medio.

> [!ejercicio] Practica
>
> 1. Añade a `Contacto` una propiedad `iniciales` y un método `esta_completo()` que compruebe que tiene teléfono y grupo. Úsalos desde el intérprete.
> 2. Intenta ordenar por `iniciales` con `order_by` y lee el error. Después consigue el mismo orden trayendo los datos y usando `sorted`.
> 3. Añade `ordering` y `verbose_name_plural` en `Meta`. Comprueba que las consultas salen ordenadas sin pedirlo y mira el SQL para ver el `ORDER BY` que se ha colado.
> 4. Declara una `CheckConstraint` que impida un nombre vacío, migra e intenta crear uno con `create()` y con `update()`. Comprueba que las dos fallan.
> 5. Añade una `UniqueConstraint` sobre nombre y grupo. Crea dos contactos con el mismo nombre en grupos distintos y después dos en el mismo grupo.
> 6. Escribe un método que devuelva el contacto en formato vCard. Después pregúntate si ese método debería estar en el modelo o en la vista, y justifica la respuesta con el criterio del final de la lección.
