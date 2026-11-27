---
titulo: "Relaciones con ForeignKey"
resumen: "Cuando un dato repetido deja de ser un texto y pasa a ser otra tabla, y la pregunta que Django te obliga a contestar."
minutos: 17
orden: 13
---

El campo `grupo` de la agenda ha sido hasta ahora un texto con `choices`. Funciona mientras los grupos los decidas tú al escribir el código. En cuanto quien usa la aplicación tenga que poder crear grupos nuevos, renombrarlos o borrarlos, ese texto se queda corto: los grupos dejan de ser una lista fija en el código y pasan a ser **datos**, y los datos van en una tabla.

Ese paso, de un texto repetido a una tabla aparte con una referencia, es la operación más característica de una base de datos relacional. En Django se escribe con `ForeignKey`, y trae con ella una pregunta obligatoria que conviene entender antes de contestarla a la ligera.

> [!objetivo] Qué vas a aprender
>
> Convertir un campo repetido en una tabla relacionada, entender qué columna crea `ForeignKey` y por qué se llama distinto que el atributo, recorrer la relación en los dos sentidos, filtrar cruzando tablas, elegir el `on_delete` que corresponde en cada caso, y reconocer y resolver el problema N+1 con `select_related`.

## Cuándo toca

La señal es siempre la misma: **un valor que se repite en muchas filas y que alguien querrá cambiar en un solo sitio**.

Con `grupo` como texto, la agenda tiene doscientas filas donde pone `trabajo`. Renombrarlo a `Profesional` es un `UPDATE` masivo. Escribir `Travajo` por error en una es un grupo nuevo que nadie ha pedido y que sale en los desplegables. Y no hay dónde guardar nada más del grupo: ni un color, ni una descripción, ni el orden en que salen.

Con una tabla aparte, el grupo es una fila con su clave. Las doscientas filas apuntan a esa clave. Renombrar es cambiar una celda, la errata es imposible porque el grupo tiene que existir, y añadirle un color es añadir una columna.

## Los dos modelos

```python title="contactos/models.py"
from django.db import models


class Grupo(models.Model):
        nombre = models.CharField('nombre', max_length=50, unique=True)

    def __str__(self):
                return self.nombre


class Contacto(models.Model):
        nombre = models.CharField('nombre', max_length=100)
    correo = models.EmailField('correo', unique=True)
    telefono = models.CharField('teléfono', max_length=20, blank=True)
    grupo = models.ForeignKey(
        Grupo,
        on_delete=models.PROTECT,
        related_name='contactos',
        null=True,
        blank=True,
        verbose_name='grupo',
    )
    notas = models.TextField('notas', blank=True)
    creado = models.DateTimeField('creado', auto_now_add=True)

    def __str__(self):
                return self.nombre
```

Dos cosas del orden de las clases. `Grupo` va arriba porque `Contacto` la nombra, y en Python una clase tiene que existir antes de usarla. Cuando dos modelos se apuntan mutuamente, o cuando uno se apunta a sí mismo, se pone el nombre entre comillas: `models.ForeignKey('Grupo', ...)`, y Django lo resuelve después.

Y fíjate en `null=True, blank=True` juntos. Es la regla de la lección 9: en un campo que no es de texto, "no hay valor" se dice con `NULL`, y para que además sea opcional en el formulario hace falta el `blank`.

## Lo que aparece en la base de datos

```salida
CREATE TABLE "contactos_contacto" (
    ...
    "grupo_id" bigint NULL REFERENCES "contactos_grupo" ("id") DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX "contactos_contacto_grupo_id_dc60af8d" ON "contactos_contacto" ("grupo_id");
```

Tres cosas que no has escrito:

**La columna se llama `grupo_id`, no `grupo`.** Django le añade el sufijo porque lo que guarda no es un grupo, es su clave. En Python tienes las dos:

```consola
>>> c = Contacto.objects.get(correo='ana@ejemplo.es')
>>> c.grupo
<Grupo: Trabajo>
>>> c.grupo_id
1
```

`c.grupo` **hace una consulta** si el grupo no está ya cargado; `c.grupo_id` está en la fila y no consulta nada. Cuando solo necesitas el identificador —para comparar, para construir una URL— usar `grupo_id` ahorra una consulta.

**`REFERENCES` es una restricción de verdad.** La base de datos no dejará guardar un `grupo_id` que no exista. A diferencia de `choices`, esto sí lo hace cumplir el gestor.

**Se crea un índice solo.** `ForeignKey` pone `db_index=True` por defecto, porque una clave ajena se usa constantemente para unir tablas.

## Recorrer la relación

Hacia el grupo, que es lo evidente:

```consola
>>> c.grupo.nombre
'Trabajo'
```

Y hacia atrás, del grupo a sus contactos, que es lo que da `related_name`:

```consola
>>> trabajo = Grupo.objects.get(nombre='Trabajo')
>>> trabajo.contactos.all()
<QuerySet [<Contacto: Ana Ruiz>, <Contacto: Zoe Alvarez>]>
>>> trabajo.contactos.count()
2
```

`trabajo.contactos` no es una lista: es un gestor, con los mismos métodos que `Contacto.objects`. Se puede filtrar, contar y ordenar, y todo ocurre en la base de datos.

> [!nota] `related_name`, y por qué se pone siempre
>
> Sin `related_name`, Django inventa uno juntando el nombre del modelo en minúsculas y `_set`:
>
> ```python
> trabajo.contacto_set.all()
> ```
>
> Funciona y se lee mal. `related_name='contactos'` deja `trabajo.contactos`, que dice lo mismo en el idioma del proyecto.
>
> Hay un caso en el que deja de ser cuestión de gusto: **dos claves ajenas al mismo modelo**. Si un contacto tuviera `grupo` y `grupo_secundario`, los dos apuntando a `Grupo`, Django no sabría cómo llamar a las dos vueltas y daría un error de `check` pidiendo que las distingas. Poner `related_name` desde el principio evita tener que pensarlo el día que pase.

## Filtrar cruzando tablas

Los dos guiones bajos de la lección anterior atraviesan también las relaciones:

```consola
>>> Contacto.objects.filter(grupo__nombre='Trabajo')
<QuerySet [<Contacto: Ana Ruiz>, <Contacto: Zoe Alvarez>]>
>>> Contacto.objects.filter(grupo__isnull=True)
<QuerySet [<Contacto: Sin grupo>]>
```

Eso es un `JOIN`, escrito por Django. Y funciona en las dos direcciones y encadenando tantos niveles como haga falta: `filter(grupo__nombre__icontains='trab')`.

Contar en la dirección contraria es `annotate` sobre el nombre de la relación:

```consola
>>> from django.db.models import Count
>>> Grupo.objects.annotate(n=Count('contactos')).values_list('nombre', 'n')
[('Trabajo', 2), ('Familia', 1)]
```

## `on_delete`: la pregunta obligatoria

`on_delete` no tiene valor por defecto. Django obliga a escribirlo, y la razón es que **no hay respuesta buena en general**: qué pasa con los contactos cuando se borra su grupo depende de lo que signifique ese grupo.

| Valor | Qué hace al borrar el grupo |
| --- | --- |
| `CASCADE` | Borra también sus contactos |
| `PROTECT` | Impide borrar el grupo, con un error |
| `RESTRICT` | Como `PROTECT`, pero permite el borrado si otra cascada ya se lo lleva |
| `SET_NULL` | Deja los contactos con el grupo a `NULL`. Exige `null=True` |
| `SET_DEFAULT` | Les pone el valor por defecto. Exige `default` |
| `DO_NOTHING` | Nada, y la base de datos se queja |

La forma de elegir es preguntarse **si la fila que apunta tiene sentido sin aquella a la que apunta**:

- Un comentario **no tiene sentido sin su artículo**: `CASCADE`. Si se borra el artículo, sus comentarios sobran.
- Un contacto **sí tiene sentido sin su grupo**: no puede ser `CASCADE`. Borrar el grupo "Trabajo" y llevarse por delante a cuarenta personas sería un desastre silencioso.

Para la agenda, `PROTECT` o `SET_NULL`. `PROTECT` obliga a vaciar el grupo antes de borrarlo, lo que da la oportunidad de decidir qué hacer con esos contactos:

```consola
>>> Grupo.objects.get(nombre='Trabajo').delete()
ProtectedError: ("Cannot delete some instances of model 'Grupo' because they are
referenced through protected foreign keys: 'Contacto.grupo'.", ...)
```

`SET_NULL` es más cómodo y más peligroso: borra el grupo y los contactos se quedan sin ninguno, sin preguntar.

> [!aviso] `CASCADE` no avisa y no se deshace
>
> `CASCADE` es el valor que más se escribe, muchas veces por inercia o por ser el primero de la lista de la documentación, y borra en silencio.
>
> El desglose que devuelve `delete()` es lo que enseña el alcance real:
>
> ```consola
> >>> grupo.delete()
> (41, {'contactos.Contacto': 40, 'contactos.Grupo': 1})
> ```
>
> Cuarenta y una filas. Y las cascadas se encadenan: si esos contactos tuvieran notas con `CASCADE`, caerían también.
>
> Antes de poner `CASCADE`, contesta en voz alta: "si se borra esto, ¿sobra aquello?". Si la respuesta es "depende", no es `CASCADE`.

## El problema N+1

Este es el fallo de rendimiento más habitual de Django, y lo que lo hace peligroso es que **el código que lo provoca parece perfectamente razonable**:

```python
for contacto in Contacto.objects.all():
        print(contacto.grupo.nombre)
```

Medido con cuatro contactos:

```salida
N+1 sin select_related: 4 consultas
```

Una consulta para traer los contactos, y una más por cada contacto para traer su grupo. Con cuatro filas son cuatro consultas; con quinientas son quinientas una. De ahí el nombre: N más uno.

No hay nada raro en el código. El problema es que `contacto.grupo` es perezoso igual que todo lo demás: va a buscar el grupo cuando alguien lo pide, y dentro de un bucle alguien lo pide N veces.

La solución es una palabra:

```python
for contacto in Contacto.objects.select_related('grupo'):
        print(contacto.grupo.nombre)
```

```salida
con select_related: 1 consultas
```

`select_related` le dice al ORM que traiga el grupo **en la misma consulta**, con un `JOIN`. Una consulta en total, da igual cuántas filas haya.

> [!consejo] Cómo se detecta el N+1, que es lo difícil
>
> El fallo no da error y en desarrollo, con diez filas de prueba, tampoco se nota. Aparece en producción con datos de verdad.
>
> Las tres formas de cazarlo:
>
> ```python
> from django.db import connection, reset_queries
>
> reset_queries()
> # el código sospechoso
> print(len(connection.queries))
> ```
>
> Eso en el intérprete. En una página, lo práctico es **Django Debug Toolbar**, que se instala en desarrollo y enseña en un panel lateral cuántas consultas ha hecho cada página y cuáles se repiten; una lista de la misma consulta ochenta veces es inconfundible.
>
> Y la regla que evita la mitad de los casos: **si una plantilla recorre una lista y dentro de cada elemento accede a una relación, la consulta que la alimenta necesita `select_related`**. En cuanto tengas plantillas, en el bloque C, vuelve a esta frase.

> [!nota] `select_related` y `prefetch_related`
>
> Hay dos, y se usan en situaciones distintas:
>
> - **`select_related`** vale para ir hacia la clave ajena, "de muchos a uno". Hace un `JOIN`, una sola consulta.
> - **`prefetch_related`** vale para ir hacia el otro lado, "de uno a muchos", y también para las relaciones de muchos a muchos. Hace **dos** consultas y las junta en Python, porque un `JOIN` duplicaría las filas del lado uno.
>
> O sea, `Contacto.objects.select_related('grupo')` para ir del contacto a su grupo, y `Grupo.objects.prefetch_related('contactos')` para ir del grupo a los suyos. La lección siguiente lo usa a fondo, porque con `ManyToMany` no hay alternativa.

## Asignar la relación

Tres formas, y una que no funciona:

```python
contacto.grupo = trabajo                 # con el objeto
contacto.grupo_id = 1                    # con la clave, sin consultar
Contacto.objects.create(nombre='X', correo='x@e.es', grupo_id=2)
```

La segunda es útil cuando ya tienes el identificador, porque evita traer el grupo solo para volver a guardarlo.

Y la que falla:

```consola
>>> g = Grupo(nombre='Nuevo')
>>> Contacto.objects.create(nombre='X', correo='x@e.es', grupo=g)
ValueError: save() prohibited to prevent data loss due to unsaved related object 'grupo'.
```

El grupo no está guardado, así que no tiene clave, así que no hay nada que poner en `grupo_id`. Django podría guardar la fila con un `NULL` y perder la relación en silencio; en vez de eso, lo prohíbe. Es un buen mensaje de error: dice el problema y dice por qué no lo arregla por su cuenta.

> [!resumen] En resumen
>
> Un valor que se repite en muchas filas y que alguien querrá cambiar en un solo sitio deja de ser un texto y pasa a ser otra tabla, referenciada con `ForeignKey`. En la base de datos eso crea una columna con el sufijo `_id`, una restricción de clave ajena que el gestor sí hace cumplir —al contrario que `choices`— y un índice, y en Python quedan dos atributos: el objeto, que consulta al pedirlo, y el `_id`, que ya está en la fila. La relación se recorre en los dos sentidos, y la vuelta se nombra con `related_name`, que conviene poner siempre porque el nombre automático se lee mal y porque es obligatorio en cuanto haya dos claves ajenas al mismo modelo. Los dos guiones bajos atraviesan las relaciones y generan los `JOIN` necesarios. `on_delete` es obligatorio porque no hay respuesta general, y se elige preguntándose si la fila que apunta tiene sentido sin la otra: `CASCADE` cuando no, como un comentario sin su artículo, y `PROTECT` o `SET_NULL` cuando sí, como un contacto sin su grupo. Y el fallo de rendimiento característico es el N+1: recorrer una lista accediendo a una relación dentro del bucle hace una consulta por elemento, y se resuelve con `select_related` para ir hacia la clave ajena o `prefetch_related` para ir en sentido contrario.

> [!ejercicio] Practica
>
> 1. Convierte el campo `grupo` de texto a `ForeignKey` y genera la migración. Mira el SQL y localiza la columna `grupo_id`, la restricción `REFERENCES` y el índice.
> 2. Crea tres grupos y seis contactos repartidos. Recorre la relación en los dos sentidos y cuenta los contactos de cada grupo con `annotate`.
> 3. Prueba los cuatro `on_delete` que tienen sentido aquí, cambiando el modelo y migrando cada vez, e intenta borrar un grupo que tenga contactos. Anota qué pasa con cada uno.
> 4. Mide el N+1: recorre todos los contactos accediendo a `contacto.grupo.nombre` y cuenta las consultas con `connection.queries`. Repítelo con `select_related`.
> 5. Haz lo mismo accediendo solo a `contacto.grupo_id` en vez de a `contacto.grupo`. Cuenta las consultas y explica la diferencia.
> 6. Intenta asignar un grupo sin guardar y lee el `ValueError`. Después guárdalo y comprueba que ya funciona.
