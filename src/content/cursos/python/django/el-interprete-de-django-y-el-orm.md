---
titulo: "El intérprete de Django y el ORM"
resumen: "Un sitio donde probar consultas sin montar una página, y la pieza que traduce entre objetos y SQL."
minutos: 15
orden: 11
---

Tienes una tabla con datos y todavía no hay ninguna página que los enseñe. Antes de escribir vistas y plantillas conviene pasar un rato probando el ORM en un sitio donde el ciclo entre escribir algo y ver el resultado sea inmediato, y ese sitio es el intérprete de Django.

Es la consola interactiva de Python de la lección 6 del módulo 0, con el proyecto cargado: los ajustes leídos, la conexión con la base de datos abierta y los modelos disponibles. Todo lo que pruebes ahí funcionará igual dentro de una vista.

> [!objetivo] Qué vas a aprender
>
> Abrir el intérprete de Django y saber qué te da que no tenga el de Python, crear, leer, modificar y borrar objetos, entender qué es un `QuerySet` y por qué es perezoso, ver el SQL que genera cada consulta, y conocer la diferencia entre `get` y `filter` con las dos excepciones que solo lanza el primero.

## Abrirlo

```bash
python manage.py shell
```

```salida
13 objects imported automatically (use -v 2 for details).
```

Esa línea es lo primero que lo distingue de `python3` a secas. Django importa por ti lo que casi siempre vas a querer, y con `-v 2` dice exactamente qué:

```salida
  from django.conf import settings
  from django.db import connection, models, reset_queries
  from django.db.models import functions
  from django.utils import timezone
  from contactos.models import Contacto
  from django.contrib.auth.models import User, Group, Permission
  ...
```

**Todos tus modelos entran solos**, y también los de las aplicaciones de Django. Es una comodidad reciente, así que en material un poco antiguo verás siempre un `from contactos.models import Contacto` al principio de cada ejemplo; ya no hace falta.

Lo importante es lo que hace por debajo: llama a `django.setup()`, que lee los ajustes, carga las aplicaciones y deja todo en el mismo estado en el que está cuando atiende una petición. Por eso no se puede abrir `python3` y empezar a importar modelos: sale un `ImproperlyConfigured` quejándose de que los ajustes no están cargados.

> [!consejo] Tres formas de usarlo
>
> Interactivo, que es lo normal:
>
> ```bash
> python manage.py shell
> ```
>
> Una orden suelta, útil para guiones y para probar algo sin entrar:
>
> ```bash
> python manage.py shell -c "from contactos.models import Contacto; print(Contacto.objects.count())"
> ```
>
> Y con IPython si lo tienes instalado, que da autocompletado y colores. Django lo detecta y lo usa solo; con `-i python` se le obliga a usar el normal.

## Crear

Dos formas, y las dos se usan:

```consola
>>> Contacto.objects.create(nombre='Ana Ruiz', correo='ana@ejemplo.es', grupo='trabajo')
<Contacto: Ana Ruiz>
```

```consola
>>> c = Contacto(nombre='Luis Pardo', correo='luis@ejemplo.es')
>>> c.pk
>>> c.save()
>>> c.pk
2
```

`create()` construye y guarda en un paso. La segunda forma construye el objeto en memoria y lo guarda cuando tú digas, lo que permite tocarlo por el medio. Fíjate en el `pk`: antes de `save()` no hay ninguno, porque lo asigna la base de datos al insertar la fila.

`objects` es el **gestor** del modelo. Es el atributo por el que se entra a todo, y su nombre es una convención que Django pone solo en cada modelo. Un detalle que confunde: `objects` es del modelo, no de las instancias. `Contacto.objects` sí; `mi_contacto.objects`, no.

## Leer

```consola
>>> Contacto.objects.all()
<QuerySet [<Contacto: Ana Ruiz>, <Contacto: Luis Pardo>]>
>>> Contacto.objects.count()
2
>>> Contacto.objects.exists()
True
>>> Contacto.objects.first()
<Contacto: Ana Ruiz>
```

`count()` y `exists()` merecen una nota desde ya: hacen su trabajo **en la base de datos**, con un `SELECT COUNT(*)` y un `LIMIT 1`. Lo que se ve muchas veces escrito es `len(Contacto.objects.all())` y `if Contacto.objects.all():`, que traen las diez mil filas a memoria para contarlas o para preguntar si hay alguna. Con dos filas da lo mismo; con diez mil, no.

## `get` frente a `filter`

Esta distinción se equivoca constantemente y merece su apartado.

```consola
>>> Contacto.objects.get(correo='ana@ejemplo.es')
<Contacto: Ana Ruiz>
>>> Contacto.objects.filter(grupo='trabajo')
<QuerySet [<Contacto: Ana Ruiz>]>
```

**`get` devuelve un objeto. `filter` devuelve un `QuerySet`**, aunque solo encaje uno, aunque no encaje ninguno.

La diferencia de verdad es qué pasa cuando no hay exactamente un resultado:

```consola
>>> Contacto.objects.get(nombre='No existe')
Contacto.DoesNotExist: Contacto matching query does not exist.

>>> Contacto.objects.get(nombre='Ana Ruiz')
Contacto.MultipleObjectsReturned: get() returned more than one Contacto -- it returned 2!
```

```consola
>>> Contacto.objects.filter(nombre='No existe')
<QuerySet []>
>>> Contacto.objects.filter(nombre='No existe').first()
```

`get` lanza. `filter` devuelve una lista vacía, y `first()` sobre ella devuelve `None` sin quejarse.

Esas dos excepciones son atributos del propio modelo, `Contacto.DoesNotExist` y `Contacto.MultipleObjectsReturned`, así que se capturan por modelo y no hay riesgo de confundirse de uno.

La regla práctica: **`get` solo con algo que sea único**, como la clave primaria o un campo con `unique=True`. Con cualquier otra cosa, `filter`. Y el `MultipleObjectsReturned` de ahí arriba es justo lo que pasa por usar `get` con un nombre, que se puede repetir: el código funciona meses hasta el día que entran dos personas que se llaman igual.

> [!consejo] `get_object_or_404`, que es lo que se usa en las vistas
>
> En una vista, un `DoesNotExist` sin capturar es un error 500, y lo correcto ante una dirección que pide algo que no existe es un 404. El atajo:
>
> ```python
> from django.shortcuts import get_object_or_404
>
> contacto = get_object_or_404(Contacto, pk=42)
> ```
>
> Hace el `get` y convierte la excepción en la respuesta correcta. Es de las funciones más usadas del módulo y aparece en cuanto haya vistas de detalle, en el bloque C.

## Modificar y borrar

Sobre un objeto, cambiar y guardar:

```consola
>>> c = Contacto.objects.get(correo='ana@ejemplo.es')
>>> c.telefono = '600 11 22 33'
>>> c.save()
```

Con un detalle que conviene conocer. Ese `save()` genera esto:

```salida
UPDATE "contactos_contacto" SET "nombre" = 'Ana Ruiz', "correo" = 'ana@ejemplo.es',
"telefono" = '600 11 22 33', "grupo" = 'trabajo', ... WHERE "id" = 1
```

**Reescribe todas las columnas**, no solo la que has tocado. Normalmente da igual. Cuando importa —porque hay dos procesos escribiendo, o porque la fila es grande— se le dice qué ha cambiado:

```consola
>>> c.save(update_fields=['telefono'])
```

```salida
UPDATE "contactos_contacto" SET "telefono" = '600 11 22 33' WHERE "id" = 1
```

Para cambiar muchas filas de golpe no se hace un bucle, se usa `update()` sobre el `QuerySet`:

```consola
>>> Contacto.objects.filter(grupo='sin').update(grupo='amigos')
1
```

Devuelve cuántas filas ha cambiado, y es **una sola consulta** en lugar de una por fila.

> [!aviso] `update()` no llama a `save()` ni dispara nada
>
> La contrapartida de esa eficiencia es que `update()` va directo al SQL y **se salta todo lo que hayas puesto en medio**: no llama al `save()` de tu modelo si lo has redefinido, no toca los campos con `auto_now`, y no dispara las señales.
>
> Es la pareja del asunto de la lección 8: `save()` no valida, y `update()` ni siquiera pasa por `save()`. Sabiéndolo, se elige: `update()` para cambios masivos y mecánicos, el bucle con `save()` cuando hace falta que se ejecute tu lógica.

Borrar, sobre un objeto o sobre un conjunto:

```consola
>>> c.delete()
(1, {'contactos.Contacto': 1})
>>> Contacto.objects.filter(grupo='amigos').delete()
(3, {'contactos.Contacto': 3})
```

Devuelve el total borrado y el desglose por modelo. Ese desglose no es adorno: cuando haya relaciones, borrar un objeto puede llevarse por delante los que dependen de él, y ahí es donde se ve.

## El `QuerySet` es perezoso

Esta es la idea que más cambia la forma de escribir consultas, y se mide:

```consola
>>> qs = Contacto.objects.all()
>>> len(connection.queries)
0
>>> lista = list(qs)
>>> len(connection.queries)
1
>>> otra = list(qs)
>>> len(connection.queries)
1
```

Tres cosas ahí:

1. **Crear el `QuerySet` no consulta nada.** Cero consultas. Es una descripción de lo que se quiere, no el resultado.
2. **Se ejecuta cuando alguien necesita los datos**: al recorrerlo, al hacer `list()`, al pedir `len()`, al imprimirlo.
3. **Después guarda el resultado.** El segundo `list()` no vuelve a la base de datos.

Lo primero es lo que permite construir consultas por partes, que es la lección siguiente. Se puede escribir `qs = qs.filter(...)` cinco veces y se ejecuta una sola consulta al final, con todas las condiciones juntas.

Se puede ver el SQL de cualquier `QuerySet` sin ejecutarlo:

```consola
>>> print(Contacto.objects.filter(grupo='trabajo').query)
SELECT "contactos_contacto"."id", "contactos_contacto"."nombre", ...
FROM "contactos_contacto" WHERE "contactos_contacto"."grupo" = trabajo
```

Es la mejor herramienta para entender qué está haciendo el ORM, y en la lección de consultas se usa constantemente.

> [!aviso] La caché es de cada `QuerySet`, no del modelo
>
> El punto tres de arriba tiene trampa, y es la causa de la mitad de los problemas de rendimiento de un proyecto de Django:
>
> ```python
> Contacto.objects.all()       # una consulta
> Contacto.objects.all()       # otra consulta: es un QuerySet nuevo
> ```
>
> La caché vive en el objeto `QuerySet`. Dos llamadas a `.all()` son dos objetos distintos y dos consultas. Lo mismo dentro de una plantilla que recorra `Contacto.objects.all()` dos veces.
>
> La forma de no caer es guardarlo en una variable y usar esa variable:
>
> ```python
> contactos = Contacto.objects.all()
> ```
>
> Y hay un caso peor, el de las relaciones, donde una lista de cien elementos acaba haciendo ciento una consultas sin que se vea en el código. Tiene nombre, problema N+1, y se resuelve con `select_related` en la lección 13.

> [!nota] Ver todo el SQL de una petición
>
> `connection.queries` guarda todo lo que se ha ejecutado, y es utilísimo:
>
> ```consola
> >>> from django.db import connection, reset_queries
> >>> reset_queries()
> >>> lista = list(Contacto.objects.all())
> >>> len(connection.queries)
> 1
> >>> connection.queries[-1]['sql'][:60]
> 'SELECT "contactos_contacto"."id", "contactos_contacto"."nom'
> ```
>
> Cada entrada trae el SQL y el tiempo que tardó. Con dos avisos: **solo se rellena si `DEBUG` es `True`**, que es la cuarta consecuencia de `DEBUG` que se mencionó en la lección 5, y **crece sin parar**, que es la razón por la que ese ajuste no puede quedarse activado en un servidor.

> [!resumen] En resumen
>
> El intérprete de Django es la consola de Python con el proyecto ya cargado, y desde Django 5.2 importa solo todos tus modelos y los de las aplicaciones instaladas. Se entra con `manage.py shell`, y con `-c` se ejecuta una orden suelta. Los objetos se crean con `create()`, que construye y guarda, o construyendo y llamando a `save()`, y hasta ese `save()` no hay clave primaria porque la pone la base de datos. Todo pasa por `objects`, que es el gestor del modelo y no de las instancias. Al leer, la distinción que más se equivoca es que `get` devuelve un objeto y lanza `DoesNotExist` o `MultipleObjectsReturned` cuando no hay exactamente uno, mientras que `filter` devuelve un `QuerySet` que puede estar vacío; por eso `get` solo se usa con campos únicos, y en las vistas se usa `get_object_or_404`. Guardar un objeto reescribe todas sus columnas salvo que se pase `update_fields`, y para cambiar muchas filas está `update()`, que hace una sola consulta pero se salta tu `save()`, los campos con `auto_now` y las señales. Y la idea central: un `QuerySet` es perezoso, no consulta nada al crearse, se ejecuta cuando alguien necesita los datos y guarda el resultado, pero esa caché es de ese objeto en concreto, así que llamar dos veces a `.all()` son dos consultas. El SQL de cualquier consulta se ve con `.query`, y todo lo ejecutado, con `connection.queries` mientras `DEBUG` esté activado.

> [!ejercicio] Practica
>
> 1. Entra en el intérprete con `-v 2` y lee la lista de lo que importa solo. Después abre `python3` a secas, intenta importar tu modelo y lee el error.
> 2. Crea tres contactos de las dos formas, con `create()` y con `save()`. En la segunda, imprime el `pk` antes y después de guardar.
> 3. Haz un `get` por un nombre que se repita y otro por uno que no exista, y captura las dos excepciones por separado.
> 4. Compara `Contacto.objects.count()` con `len(Contacto.objects.all())`. Mira el SQL de los dos con `connection.queries`.
> 5. Cambia el teléfono de un contacto y guárdalo, primero sin `update_fields` y después con él. Compara las dos consultas.
> 6. Guarda un `QuerySet` en una variable, recórrelo dos veces y cuenta las consultas. Después recorre dos veces `Contacto.objects.all()` sin guardarlo y vuelve a contarlas.
