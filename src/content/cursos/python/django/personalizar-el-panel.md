---
titulo: "Personalizar el panel"
resumen: "Veinte atributos que convierten una tabla de filas en una herramienta usable, y el N+1 que el panel resuelve solo y el que no."
minutos: 16
orden: 31
---

El panel sin configurar enseña una lista de objetos con su `__str__` y poco más. Con veinte líneas en la clase `ModelAdmin` pasa a tener columnas, buscador, filtros, acciones en lote y formularios anidados, y deja de parecer una tabla para parecer una herramienta.

Y hay una cosa que no se suele contar: **el panel no es gratis en rendimiento**. Una lista con una columna mal elegida hace una consulta por fila, igual que cualquier plantilla, y como no hay ninguna vista escrita nadie lo mira. Eso también está medido aquí.

> [!objetivo] Qué vas a aprender
>
> Configurar la lista con columnas, enlaces, filtros, buscador y edición en línea, escribir columnas calculadas y ordenarlas, organizar la ficha con secciones y campos de solo lectura, anidar modelos relacionados, escribir acciones en lote, y detectar y arreglar el N+1 del panel.

## La lista

```python title="contactos/admin.py"
@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
        list_display = ['nombre', 'correo', 'grupo', 'tiene_telefono', 'creado']
    list_display_links = ['nombre']
    list_filter = ['grupo', 'creado', 'etiquetas']
    search_fields = ['nombre', 'correo']
    ordering = ['nombre']
    list_per_page = 25
    date_hierarchy = 'creado'
    list_editable = ['correo']
```

Cada uno hace una cosa concreta:

| Atributo | Qué hace |
| --- | --- |
| `list_display` | Las columnas. Campos, métodos o propiedades |
| `list_display_links` | Cuáles llevan a la ficha. Por defecto, la primera |
| `list_filter` | La barra lateral de filtros |
| `search_fields` | El buscador de arriba |
| `ordering` | El orden por defecto de esta lista |
| `list_per_page` | Cuántas filas por página. Son cien de serie |
| `date_hierarchy` | La navegación por año, mes y día de arriba |
| `list_editable` | Campos que se cambian sin abrir la ficha |

`list_filter` merece un apunte: los filtros por fecha traen rangos hechos (hoy, esta semana, este mes), y sobre un `ForeignKey` o un `ManyToMany` listan las opciones. Ahí hay una trampa de escala: un filtro sobre una relación con diez mil filas pinta diez mil opciones en la barra lateral.

Y `search_fields` admite los mismos sufijos que un `filter`, con una particularidad: sin sufijo usa `icontains`, y con `=` delante del nombre (`'=correo'`) busca exacto, que es mucho más rápido cuando hay un índice.

> [!error] `admin.E124`, y las comprobaciones del panel en general
>
> ```salida
> SystemCheckError: (admin.E124) The value of 'list_editable[0]' refers to the
> first field in 'list_display' ('nombre'), which cannot be used unless
> 'list_display_links' is set.
> ```
>
> El motivo es razonable: la primera columna es el enlace a la ficha, y si además es editable, no hay dónde pulsar para entrar.
>
> Lo interesante no es el error concreto sino que exista. El panel trae **decenas de comprobaciones** que se ejecutan con `manage.py check` y al arrancar el servidor, y que detectan campos que no existen, opciones incompatibles y relaciones mal declaradas antes de que nadie abra una página.
>
> Cuando algo del panel no cuadre, `manage.py check` es lo primero que hay que mirar, y suele decir exactamente qué pasa.

## Columnas calculadas

Una columna puede ser un método:

```python
        @admin.display(description='¿Tiene teléfono?', boolean=True)
    def tiene_telefono(self, obj):
                return bool(obj.telefono)
```

El decorador configura la columna: `description` es el título, y `boolean=True` hace que se pinte un icono de sí o no en vez de la palabra.

Por defecto **una columna calculada no se puede ordenar**, porque Django no sabe traducirla a SQL. Ese es el mismo límite de la lección 15: lo que se calcula en Python no existe para la base de datos. La salida es la misma, calcularlo allí:

```python
@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
        list_display = ['nombre', 'cuantos']

    def get_queryset(self, peticion):
                return super().get_queryset(peticion).annotate(_cuantos=Count('contactos'))

    @admin.display(description='Contactos', ordering='_cuantos')
    def cuantos(self, obj):
                return obj._cuantos
```

Con `annotate` el dato viene de la consulta, y el `ordering` del decorador le dice al panel por qué columna de SQL ordenar. Es el patrón para cualquier columna de recuento o de total.

Y para pintar HTML, la regla de la lección 19 sin cambios:

```python
from django.utils.html import format_html

@admin.display(description='Foto')
def miniatura(self, obj):
        if not obj.foto:
                return '—'
    return format_html('<img src="{}" height="40">', obj.foto.url)
```

`format_html` y no una f-string, porque el panel también escapa.

> [!aviso] El N+1 del panel: resuelve uno y no el otro
>
> Aquí está lo que casi nadie mide. La misma lista, con tres configuraciones:
>
> ```salida
> list_display con un ForeignKey                      ->   9 consultas
> añadiendo una columna que recorre un ManyToMany     ->  22 consultas
> con prefetch_related en get_queryset                ->  10 consultas
> ```
>
> Lo primero es una sorpresa agradable: **el panel añade `select_related` solo** cuando detecta un `ForeignKey` en `list_display`. No hace falta configurar nada, y por eso existe `list_select_related`, que sirve para forzarlo o para afinarlo, no para arreglar el caso común.
>
> Lo segundo es el agujero. Una columna calculada que recorre una relación de muchos a muchos —o una relación inversa, que es igual de habitual— **hace una consulta por fila**, y el panel no puede adivinarlo porque está dentro de un método tuyo.
>
> De nueve a veintidós con trece filas. Con cien filas por página, que es el valor por defecto, son ciento y pico consultas por página.
>
> El arreglo es el de la lección 13, en el sitio del panel:
>
> ```python
> def get_queryset(self, peticion):
>         return super().get_queryset(peticion).prefetch_related('etiquetas')
> ```
>
> La regla práctica: **si una columna del panel toca una relación que no es un `ForeignKey` directo, hay que escribir `get_queryset`.**

## La ficha

```python
        fieldsets = [
        (None, {'fields': ['nombre', 'correo']}),
        ('Clasificación', {'fields': ['grupo', 'etiquetas'], 'classes': ['collapse']}),
        ('Otros', {'fields': ['telefono', 'notas', 'creado']}),
    ]
    readonly_fields = ['creado']
    filter_horizontal = ['etiquetas']
    autocomplete_fields = ['grupo']
```

`fieldsets` agrupa los campos en secciones con título, y `'classes': ['collapse']` las deja plegadas. Un formulario de veinte campos sin secciones es ilegible, y con tres secciones se entiende.

Cuando no hace falta agrupar, `fields` sirve para elegir y ordenar, y también acepta tuplas para poner dos campos en la misma línea:

```python
        fields = [('nombre', 'correo'), 'telefono', 'notas']
```

`readonly_fields` enseña el valor sin dejar cambiarlo, y es obligatorio para los campos con `auto_now_add`, que no son editables. También admite métodos, lo que permite mostrar datos calculados dentro de la ficha.

Los dos últimos son los que arreglan los desplegables:

**`filter_horizontal`** sustituye el selector múltiple por dos cajas con búsqueda, que es lo único usable con más de diez opciones.

**`autocomplete_fields`** convierte un desplegable en un campo que busca según escribes, cargando por peticiones en lugar de volcar la tabla entera. Es la respuesta a lo que quedó pendiente en la lección 26, y tiene un requisito: **el modelo al que apunta necesita `search_fields` en su propio `ModelAdmin`**, porque es lo que usa la búsqueda. Sin eso, el panel da un error de comprobación diciéndolo.

## Modelos anidados

Para editar lo relacionado desde la misma página:

```python
class FichaInline(admin.StackedInline):
        model = Ficha
    extra = 0


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
        inlines = [FichaInline]
```

`StackedInline` pone cada uno en bloque y `TabularInline` en filas de tabla; la segunda va mejor con pocos campos. El `extra` son los formularios vacíos que aparecen para añadir, y cero es casi siempre lo que se quiere, porque el valor por defecto llena la pantalla.

Los anidados son la mejor parte del panel y también la más cara: **cada uno añade consultas y formularios**. Tres anidados con veinte filas cada uno hacen una página lenta.

## Acciones en lote

Una función que recibe la selección y hace algo con ella:

```python
@admin.action(description='Vaciar el teléfono de los seleccionados')
def vaciar_telefono(modeladmin, peticion, consulta):
        actualizados = consulta.update(telefono='')
    modeladmin.message_user(peticion, f'{actualizados} contactos actualizados.')


@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
        actions = [vaciar_telefono]
```

```salida
acciones: [('delete_selected', 'Eliminar contactos seleccionado/s'),
           ('vaciar_telefono', 'Vaciar el teléfono de los seleccionados')]
```

El tercer argumento es un `QuerySet` con lo seleccionado, así que se puede usar `update()`, recorrerlo o exportarlo. `message_user` deja el aviso verde de arriba, que es el sistema de mensajes de la lección 35.

> [!aviso] Una acción con `update()` se salta todo
>
> Dos cosas que hay que tener presentes y que ya se midieron en la lección 11.
>
> `consulta.update(...)` hace **una sola consulta** y por eso es lo correcto para miles de filas. A cambio se salta el `save()` del modelo, los campos con `auto_now` y las señales.
>
> Cuando eso importa, hay que recorrer, y entonces son mil consultas:
>
> ```python
> for obj in consulta:
>         obj.hacer_algo()
>     obj.save()
> ```
>
> Y la otra: **una acción se ejecuta sin confirmar**. Se elige en el desplegable, se pulsa y ya está. Para algo destructivo, la forma correcta es devolver una respuesta con una página de confirmación, que es lo que hace `delete_selected` y por lo que es la única que pregunta.

## El aspecto

Tres líneas que quitan el "Django administration" de todas las páginas:

```python title="contactos/admin.py"
admin.site.site_header = 'Agenda de contactos'
admin.site.site_title = 'Agenda'
admin.site.index_title = 'Gestión'
```

```salida
<title>Seleccione contacto a modificar | Agenda</title>
```

Y para lo demás, el mecanismo es el de la lección 16: las plantillas de `DIRS` se miran antes que las de las aplicaciones, así que un fichero en `plantillas/admin/base_site.html` sustituye al del panel. Lo razonable es heredar del original y cambiar solo un bloque:

```html title="plantillas/admin/base_site.html"
{% extends "admin/base_site.html" %}
{% block extrastyle %}<link rel="stylesheet" href="{% static 'admin_propio.css' %}">{% endblock %}
```

> [!consejo] Dónde parar
>
> El panel se puede personalizar casi sin límite: sobrescribir `get_queryset` para que cada persona vea solo lo suyo, `save_model` para rellenar campos, `has_change_permission` para permisos por fila, `get_urls` para añadir páginas propias.
>
> Todo eso funciona, y hay un punto en que deja de compensar. La señal es la misma que la de la lección 22 con las vistas genéricas: **cuando llevas media docena de métodos sobrescritos, la vista escrita a mano es menos código y se entiende.**
>
> El reparto que suele salir bien: el panel para lo que el equipo consulta y corrige, con la personalización de esta lección, que es barata; y vistas propias para todo lo que tenga un flujo, permisos por fila o gente de fuera delante.

> [!resumen] En resumen
>
> Con una veintena de atributos en `ModelAdmin`, el panel pasa de una lista de objetos a una herramienta usable: `list_display` pone columnas que pueden ser campos o métodos, `list_filter` y `search_fields` añaden filtros y buscador, `date_hierarchy` navega por fechas y `list_editable` permite cambiar valores sin abrir la ficha. Las columnas calculadas se configuran con el decorador `display`, que da título e icono booleano, y para que se puedan ordenar hay que calcularlas en la base de datos con `annotate` y declarar el `ordering`. En rendimiento hay dos comportamientos distintos que conviene conocer: el panel añade `select_related` por su cuenta cuando ve un `ForeignKey` en las columnas, pero una columna que recorra un muchos a muchos o una relación inversa hace una consulta por fila, y eso hay que arreglarlo escribiendo `get_queryset` con `prefetch_related`. La ficha se organiza con `fieldsets`, secciones plegables y campos de solo lectura, y los desplegables grandes se arreglan con `filter_horizontal` y con `autocomplete_fields`, que exige que el modelo apuntado tenga `search_fields` en su propia clase. Los modelos relacionados se editan anidados, con la advertencia de que cada uno cuesta consultas. Las acciones en lote reciben un `QuerySet`, y usar `update()` es lo correcto para muchas filas a costa de saltarse el `save()`, los `auto_now` y las señales; además se ejecutan sin confirmar, así que lo destructivo necesita una página de confirmación escrita a mano. Y el panel trae decenas de comprobaciones que `manage.py check` ejecuta y que suelen decir exactamente qué está mal.

> [!ejercicio] Practica
>
> 1. Configura la lista de tu modelo con cinco columnas, el buscador, dos filtros y la navegación por fechas.
> 2. Añade una columna calculada con un icono de sí o no. Intenta ordenar por ella y comprueba que no se puede.
> 3. Añade una columna de recuento con `annotate` y consigue que sí se pueda ordenar.
> 4. Cuenta las consultas de la lista. Añade una columna que recorra un muchos a muchos, vuelve a contarlas y arréglalo con `prefetch_related`.
> 5. Provoca el error `admin.E124` poniendo el primer campo en `list_editable`. Léelo y arréglalo.
> 6. Organiza la ficha en tres secciones, deja una plegada y pon un campo como solo lectura.
> 7. Cambia el desplegable de una relación por `autocomplete_fields`. Quita el `search_fields` del modelo apuntado y lee el error.
> 8. Escribe una acción en lote que marque los seleccionados. Hazla primero con `update()` y después recorriendo, y cuenta las consultas de cada versión.
> 9. Cambia el título del panel y sustituye su plantilla base heredando de la original.
