---
titulo: "CreateView, UpdateView y DeleteView"
resumen: "Las tres vistas que faltan para el CRUD completo, el formulario que se genera solo, y adónde se va después de guardar."
minutos: 15
orden: 24
---

Con la lección anterior tienes las dos páginas de lectura. Faltan las tres de escritura, y son justo las que la lección 16 dejó a medias, con aquel ejemplo marcado como incorrecto a propósito: sin validación, sin protección y con un `MultiValueDictKeyError` esperando.

Estas tres clases resuelven las tres cosas. Y hay que decir una cosa de entrada: **usan formularios por debajo**, y los formularios son el bloque siguiente entero. Aquí se ven funcionando y se explica lo que hace falta para entenderlas; el detalle de cómo se validan los datos viene después.

> [!objetivo] Qué vas a aprender
>
> Escribir las tres vistas de escritura con `fields` o `form_class`, entender de dónde sale el formulario que aparece en la página, saber adónde redirigen y por qué eso conecta con `get_absolute_url`, conocer los dos métodos que se sobrescriben, y entender por qué el borrado necesita dos peticiones.

## `CreateView`

```python title="contactos/views_clase.py"
from django.views.generic.edit import CreateView


class CrearContacto(CreateView):
        model = Contacto
    fields = ['nombre', 'correo', 'telefono', 'grupo']
```

```html title="contactos/templates/contactos/contacto_form.html"
<form method="post">{% csrf_token %}
  {{ form.as_p }}
  <button>Guardar</button>
</form>
```

Eso es todo, y lo que sale es esto:

```salida
<input type="hidden" name="csrfmiddlewaretoken" value="vBN8G9mDNG...">
<label for="id_nombre">
<input type="text" name="nombre" maxlength="100" required id="id_nombre">
<label for="id_correo">
<input type="email" name="correo" maxlength="254" required id="id_correo">
<label for="id_telefono">
<input type="text" name="telefono" maxlength="20" id="id_telefono">
<label for="id_grupo">
<select name="grupo" id="id_grupo">
```

Merece la pena mirar ese HTML con calma, porque cada detalle sale de algo que escribiste en el bloque B.

El `type="email"` sale del `EmailField`. El `maxlength="100"` sale del `max_length` del modelo. El `required` del nombre está y el del teléfono no, porque el teléfono tenía `blank=True`, que es exactamente lo que la lección 9 dijo que significaba `blank`: **cosa de formularios**. Y el grupo es un `<select>` porque es un `ForeignKey`, con las opciones sacadas de la tabla.

O sea: **el formulario es una traducción del modelo**. Eso es lo que hace un `ModelForm`, y es lo que la vista ha construido sola a partir de `model` y `fields`.

El `{% csrf_token %}` es la protección que faltaba en la lección 16. Sin él, el `POST` da `403`. Lo que hace y por qué se explica en el bloque D, pero la regla se puede aprender hoy: **todo formulario con `method="post"` lleva `{% csrf_token %}` dentro**.

> [!aviso] `fields = '__all__'` es cómodo y se vuelve en tu contra
>
> La forma corta existe y la vas a ver:
>
> ```python
> fields = '__all__'
> ```
>
> Coge todos los campos editables del modelo. El problema no es hoy, es dentro de seis meses: el día que alguien añada al modelo un campo `es_administrador` o `saldo`, **ese campo aparece en el formulario público** sin que nadie lo decida.
>
> Escribir la lista es cuatro segundos y es una decisión explícita sobre qué puede tocar quien rellena el formulario. Con `'__all__'`, esa decisión la toma el modelo por su cuenta.

## `UpdateView`

```python
class EditarContacto(UpdateView):
        model = Contacto
    fields = ['nombre', 'correo', 'telefono', 'grupo']
```

```python
path('cbv/<int:pk>/editar/', views_clase.EditarContacto.as_view(), name='cbv-editar'),
```

```salida
value="Ana Ruiz"
value="ana@ejemplo.es"
value=""
value="1"
```

Idéntica a la de crear salvo por una cosa: la ruta captura un `pk`, la vista busca el objeto como hace `DetailView`, y el formulario **sale relleno**.

Y como se avisó en la lección anterior, las dos usan la misma plantilla, `modelo_form.html`. Cuando hace falta distinguirlas, el truco es mirar si hay objeto:

```html
<h1>{% if object %}Editar {{ object }}{% else %}Nuevo contacto{% endif %}</h1>
```

En `CreateView`, `object` vale `None`.

## Adónde va después de guardar

```salida
POST nuevo  ->  302  /contactos/6/
```

Un `302` a la ficha del contacto recién creado, y en ninguna de las dos vistas hay escrita una dirección. Sale de esto:

```python title="contactos/models.py"
def get_absolute_url(self):
        return reverse('contactos:detalle', kwargs={'pk': self.pk})
```

Esa es la recompensa de las tres líneas de la lección 21. Sin ellas:

```salida
ImproperlyConfigured: No URL to redirect to. Either provide a url or
define a get_absolute_url method on the Model.
```

El mensaje dice las dos opciones. La otra es el atributo:

```python
success_url = reverse_lazy('contactos:cbv-lista')
```

Y ahí hay un detalle que confunde la primera vez: **`reverse_lazy`, no `reverse`**. Como es un atributo de clase, se evalúa al importar el módulo, y en ese momento las rutas todavía no están cargadas. La versión perezosa no resuelve la dirección hasta que se usa. La regla práctica: `reverse` dentro de un método, `reverse_lazy` en un atributo de clase.

Lo que está pasando por debajo es el patrón de la lección 2. Si los datos valen, se guarda y se redirige; si no valen, se vuelve a pintar el formulario con los errores y con lo que ya estaba escrito:

```salida
POST inválido  ->  200
```

`200` y no `302`, porque no se ha ido a ninguna parte.

## Los dos métodos que se sobrescriben

Casi todo lo que se necesita cambiar está en uno de estos dos.

**`form_valid`**, que corre cuando los datos son correctos y antes de redirigir. Es el sitio de lo que el formulario no puede saber:

```python
def form_valid(self, formulario):
        formulario.instance.propietario = self.request.user
    return super().form_valid(formulario)
```

Ese `formulario.instance` es el objeto todavía sin guardar. Se le añade lo que falte y se deja que el padre haga el resto. Es el patrón para rellenar campos automáticos, y vuelve en el bloque de usuarios.

**`get_success_url`**, cuando el destino depende de algo:

```python
def get_success_url(self):
        return self.object.get_absolute_url()
```

Después de guardar, `self.object` es el objeto guardado, ya con su `pk`.

## `DeleteView`

```python
class BorrarContacto(DeleteView):
        model = Contacto
    success_url = reverse_lazy('contactos:cbv-lista')
```

```html title="contactos/templates/contactos/contacto_confirm_delete.html"
<form method="post">{% csrf_token %}
  ¿Borrar {{ object }}? <button>Sí</button>
</form>
```

```salida
GET borrar   ->  200
POST borrar  ->  302  /contactos/cbv/lista/
sigue?       ->  False
```

Dos peticiones para borrar, y no es burocracia: **el `GET` enseña la confirmación y solo el `POST` borra**. La lección 2 ya contó por qué, con la historia del buscador que vació la base de datos siguiendo enlaces. Un borrado detrás de un `GET` lo ejecuta cualquier cosa que visite la dirección.

De ahí que la plantilla se llame `modelo_confirm_delete.html`: la vista da por supuesto que hay una confirmación.

> [!consejo] Casi nunca quieres borrar de verdad
>
> Antes de montar esta vista conviene una pregunta: ¿hace falta que la fila desaparezca?
>
> En la mayoría de los sitios, no. Lo que se quiere es que deje de salir, y borrar de verdad tiene efectos que se descubren tarde: se lleva por delante lo que dependía de ello según el `on_delete` de la lección 13, rompe los enlaces que alguien tenga guardados, y no hay forma de deshacerlo cuando la persona llama a los cinco minutos.
>
> La alternativa es el **borrado lógico**: un campo `activo` o `borrado_el`, un gestor que filtre los que no están, y la vista de borrado convertida en un `UpdateView` que marque la bandera.
>
> El coste es que hay que acordarse de filtrar en todas partes, y por eso conviene el gestor propio de la lección 11. Y ojo con una cosa: un `unique=True` sigue valiendo para las filas borradas, así que no se puede volver a dar de alta un correo que se "borró". Eso se resuelve con un `UniqueConstraint` con `condition`, que es de la lección 15.
>
> Cuándo sí borrar de verdad: los datos sin valor histórico, las filas de prueba, y lo que alguien pide que se borre ejerciendo su derecho a ello.

> [!nota] Lo que falta para que esto sea utilizable
>
> Las tres vistas funcionan y aun así no son suficientes para una aplicación de verdad, y las cuatro cosas que faltan son los cuatro bloques que vienen.
>
> **El formulario apenas se puede tocar.** Con `fields` sale lo que sale: sin ayudas, sin validación propia, sin controlar el orden ni las etiquetas. Con `form_class` y un `ModelForm` escrito a mano se controla todo, y es la lección 26.
>
> **No hay mensajes.** Guardas, te redirige, y no hay ninguna señal de que haya ido bien. El sistema de mensajes es la lección 35.
>
> **No hay control de acceso.** Cualquiera puede entrar a borrar. Es el bloque E.
>
> **No están probadas.** Estas vistas son fáciles de probar y eso es la lección 39.
>
> Con eso montado, un CRUD completo son unas cuarenta líneas y esta lección se vuelve la base de todo el módulo.

> [!resumen] En resumen
>
> Las tres vistas de escritura completan el CRUD: `CreateView` y `UpdateView` comparten plantilla y se diferencian en que la segunda captura un `pk` y sale rellena, y `DeleteView` pide confirmación. El formulario que aparece en la página se genera a partir del modelo, y cada detalle del HTML viene de algo que decidiste en el bloque B: el tipo del campo, el `maxlength`, el `required` que falta donde hay `blank=True` y el desplegable de las relaciones. `fields = '__all__'` es cómodo y peligroso, porque el día que alguien añada un campo sensible al modelo aparecerá solo en el formulario. Todo formulario con `method="post"` lleva `{% csrf_token %}` dentro o el envío da `403`. Después de guardar se redirige, y el destino sale de `get_absolute_url` del modelo o de un `success_url`, que en un atributo de clase tiene que ser `reverse_lazy` porque las rutas aún no están cargadas al importar; sin ninguna de las dos cosas, la vista lanza `ImproperlyConfigured` explicando las dos opciones. Cuando los datos no valen se devuelve `200` con el formulario y sus errores, no una redirección. Los dos métodos que se sobrescriben son `form_valid`, para rellenar lo que el formulario no sabe, y `get_success_url`, para destinos que dependen del objeto. El borrado necesita dos peticiones, con el `GET` enseñando la confirmación y solo el `POST` borrando, por la misma razón de la lección 2; y antes de montarlo conviene preguntarse si hace falta borrar de verdad, porque el borrado lógico es lo que quiere casi todo el mundo.

> [!ejercicio] Practica
>
> 1. Escribe las tres vistas para tu modelo, con la lista de campos explícita. Comprueba que las de crear y editar comparten plantilla.
> 2. Mira el HTML del formulario generado y localiza de dónde sale cada atributo: el tipo, el `maxlength`, el `required` y el desplegable.
> 3. Quita el `{% csrf_token %}` y envía el formulario. Lee el error.
> 4. Borra el `get_absolute_url` del modelo y crea un contacto. Lee el `ImproperlyConfigured` y arréglalo con `success_url`.
> 5. Cambia `reverse_lazy` por `reverse` en el atributo y mira qué pasa al arrancar.
> 6. Envía el formulario vacío y comprueba que la respuesta es `200` y no `302`. Mira qué errores salen en la página.
> 7. Prueba a borrar con un `GET` y con un `POST` y explica por qué hacen cosas distintas.
> 8. Convierte el borrado en borrado lógico: añade un campo al modelo, filtra en la lista y cambia la vista por un `UpdateView`.
