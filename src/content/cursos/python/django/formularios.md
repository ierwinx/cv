---
titulo: "Formularios"
resumen: "La clase que resuelve de golpe los tres fallos del ejemplo marcado como incorrecto, y el ciclo de ocho líneas que se repite en todas las vistas."
minutos: 15
orden: 25
---

La lección 16 dejó un ejemplo con una advertencia grande encima: no copies esto a ningún sitio. Era este:

```python
Contacto.objects.create(
    nombre=peticion.POST['nombre'],
    correo=peticion.POST['correo'],
)
```

Y sus tres problemas: revienta con `MultiValueDictKeyError` si falta un campo, no valida nada porque `save()` no valida, y no hay protección contra formularios falsificados. Añade un cuarto que no se mencionó: cuando algo falla, hay que volver a pintar el formulario con lo que la persona ya había escrito, y eso a mano es horrible.

Los cuatro los resuelve una sola clase.

> [!objetivo] Qué vas a aprender
>
> Escribir un formulario declarando campos, distinguir un formulario vacío de uno con datos, entender qué hace `is_valid` y qué deja en `cleaned_data`, escribir el ciclo completo en una vista, pintarlo en la plantilla con distintos niveles de control, y saber por qué la validación del navegador no cuenta.

## Declarar un formulario

Se parece mucho a un modelo, y esa semejanza es intencionada:

```python title="contactos/forms.py"
from django import forms


class Contacta(forms.Form):
        nombre = forms.CharField(max_length=100, label='Tu nombre')
    correo = forms.EmailField(label='Correo de respuesta')
    asunto = forms.CharField(max_length=80, required=False)
    mensaje = forms.CharField(widget=forms.Textarea, min_length=10)
    copia = forms.BooleanField(required=False, label='Mándame una copia')
```

Se parece pero no es lo mismo, y la diferencia importa: **un modelo describe una tabla y un formulario describe una pregunta**. Este no guarda nada; los datos se van a ir por correo. Cuando lo que se pregunta coincide con lo que se guarda, hay una versión que se escribe sola, y es la lección siguiente.

Fíjate en `required=False`: en los formularios, lo obligatorio es lo normal y hay que desactivarlo. Es al revés que en los modelos, donde `blank=True` era lo que había que añadir.

Un formulario hace tres cosas a la vez, y conviene tenerlas separadas en la cabeza porque después se tocan por separado:

1. **Dibuja** los campos en HTML.
2. **Valida** lo que llega.
3. **Convierte** el texto de la petición a tipos de Python.

## Vacío o con datos

Esta distinción es la que más confunde al principio, y es simple:

```python
formulario = Contacta()               # vacío: para enseñar
formulario = Contacta(peticion.POST)  # con datos: para comprobar
```

```salida
unbound is_valid: False | is_bound: False
```

**Un formulario vacío nunca es válido.** No es que los datos estén mal, es que no hay datos que comprobar. Llamar a `is_valid()` sobre uno vacío siempre da `False`, y ese es el motivo del `if peticion.method == 'POST'` de la vista: solo tiene sentido validar cuando hay algo que validar.

El argumento posicional son los datos. No hay que ponerle nombre, y de hecho `Contacta(data=peticion.POST)` es lo mismo.

## `is_valid` y `cleaned_data`

```python
formulario = Contacta({'nombre': '  Ana Ruiz  ', 'correo': 'ana@ejemplo.es',
                       'mensaje': 'un mensaje suficientemente largo', 'copia': 'on'})
```

```salida
válido?: True
cleaned_data: {'nombre': 'Ana Ruiz', 'correo': 'ana@ejemplo.es', 'asunto': '',
               'mensaje': 'un mensaje suficientemente largo', 'copia': True}
tipos: {'nombre': 'str', 'correo': 'str', 'asunto': 'str', 'mensaje': 'str', 'copia': 'bool'}
```

Dos cosas que han pasado sin pedirlas. Los espacios de `'  Ana Ruiz  '` han desaparecido, porque `CharField` viene con `strip=True`. Y el `'on'` de la casilla, que es lo que manda de verdad un navegador, ha llegado como `True`.

Eso último es la tercera función: **en `peticion.POST` todo es texto, y en `cleaned_data` cada cosa tiene su tipo**. Un `IntegerField` da un `int`, un `DateField` da un `date`, un `DecimalField` da un `Decimal`. Es exactamente el trabajo manual que se hizo a mano en el módulo 2 con los argumentos de la terminal.

La regla que se deriva: **después de validar, se usa `cleaned_data` y no se vuelve a mirar `peticion.POST`**.

Con datos malos:

```salida
válido?: False
errores:
    correo  -> Introduzca una dirección de correo electrónico válida.
    mensaje -> Asegúrese de que este valor tenga al menos 10 carácter(es) (tiene 5).
```

Los mensajes salen en español sin instalar nada, por el `LANGUAGE_CODE` de la lección 5.

> [!aviso] `cleaned_data` existe aunque el formulario falle, y solo trae lo que pasó
>
> Un detalle que confunde y que conviene ver medido:
>
> ```salida
> cleaned_data tras fallar: {'nombre': 'Ana', 'asunto': '', 'copia': False}
> ```
>
> Están los tres campos correctos y **faltan los dos que fallaron**. Django valida campo a campo y va guardando lo que sobrevive.
>
> La consecuencia práctica es que `cleaned_data['correo']` puede dar `KeyError` si no has comprobado `is_valid()` antes. Por eso, dentro del `if formulario.is_valid()` se puede usar con corchetes tranquilamente, y fuera de él hay que usar `.get()`. Esto vuelve en la lección 27, cuando la validación cruzada tenga que mirar campos que quizá no estén.

## El ciclo en la vista

Este trozo se va a repetir en todas las vistas que reciban datos, con variaciones mínimas. Merece la pena aprendérselo de memoria:

```python title="contactos/views.py"
def contacta(peticion):
        if peticion.method == 'POST':
                formulario = Contacta(peticion.POST)
        if formulario.is_valid():
                        datos = formulario.cleaned_data
            enviar_correo(datos['correo'], datos['mensaje'])
            return redirect('contactos:gracias')
    else:
                formulario = Contacta(initial={'asunto': 'Consulta'})
    return render(peticion, 'contactos/contacta.html', {'formulario': formulario})
```

Los tres caminos, medidos:

```salida
GET                ->  200, formulario vacío con el asunto puesto
POST inválido      ->  200, con los errores y lo escrito conservado
POST válido        ->  302 /contactos/gracias/
```

Hay tres cosas que conviene mirar con detalle.

**El `return render` está fuera del `if`**, y eso es lo que hace que un `POST` inválido caiga ahí abajo y se vuelva a pintar el mismo formulario, ya con sus errores dentro. No hay que hacer nada más: el objeto ya los tiene.

```salida
conserva nombre:  True
conserva mensaje: True
```

Eso es el cuarto problema resuelto. Quien rellenó el formulario **no pierde lo que escribió**, porque el formulario se pintó a partir de los datos enviados.

**`initial` pone valores de partida**, y solo tiene sentido en el formulario vacío:

```salida
<input type="text" name="asunto" value="Consulta" maxlength="80" id="id_asunto">
```

**Y solo se redirige cuando todo ha ido bien**, que es el patrón de la lección 2. Un `200` después de guardar deja a la gente recargando y duplicando.

## Pintarlo

```html title="contactos/templates/contactos/contacta.html"
<form method="post" novalidate>{% csrf_token %}
  {{ formulario.non_field_errors }}
  {{ formulario }}
  <button>Enviar</button>
</form>
```

Tres cosas de esas cinco líneas hay que explicarlas.

El `<form>` y el botón **no los pinta Django**. `{{ formulario }}` son los campos, nada más. La primera vez todo el mundo se pregunta por qué no sale el botón.

El `{% csrf_token %}` es obligatorio y su ausencia da `403`, como se vio en la lección 24.

Y `non_field_errors` son los errores que no son de ningún campo concreto, como "la contraseña y su repetición no coinciden". Sin esa línea **no se ven en ninguna parte**, porque no tienen campo al lado donde ponerse. Es un olvido clásico y el síntoma es un formulario que se niega a enviarse sin decir por qué. Salen en `errors` bajo la clave `__all__`:

```salida
errors: {'__all__': ['A y B no pueden ser iguales.']}
```

> [!nota] `{{ form }}` ya no es una tabla
>
> Casi todo lo que hay escrito sobre Django dice que `{{ form }}` genera una tabla y que hay que envolverlo en `<table>`. Ya no:
>
> ```salida
> template_name: django/forms/div.html
> as_div == str: True
> ```
>
> Desde Django 5.0, la forma por defecto es `as_div`, con un `<div>` por campo. Es más fácil de maquetar y no miente sobre la estructura del documento.
>
> Las cuatro formas siguen existiendo: `{{ form.as_div }}`, `{{ form.as_p }}`, `{{ form.as_ul }}` y `{{ form.as_table }}`. Y se puede cambiar la plantilla de todos los formularios del proyecto con `FORM_RENDERER`, que es como se integra un marco de estilos.

> [!aviso] El `novalidate` no es un descuido
>
> Ese atributo del `<form>` desactiva la validación del navegador, y está puesto a propósito.
>
> Los navegadores validan `required`, `type="email"` y `minlength` por su cuenta, con mensajes propios y sin llegar al servidor. Eso está bien para la gente, y en desarrollo estorba, porque **oculta tu validación**: no llegas a ver tus mensajes ni a comprobar que el servidor rechaza lo que tiene que rechazar.
>
> Lo importante es lo que hay detrás: **la validación del navegador no cuenta**. Se salta con `curl`, con las herramientas de desarrollo o con un cliente escrito a mano en cinco minutos. Es una comodidad, nunca una defensa.
>
> La regla: `novalidate` mientras desarrollas y pruebas, y fuera en producción, donde ayuda. Pero la validación de verdad está siempre en el servidor, y por eso este bloque existe.

## Cuando hace falta más control

`{{ formulario }}` sirve para empezar y se queda corto en cuanto hay un diseño. Se puede bajar todo lo que haga falta:

```html
{% for campo in formulario %}
  <div class="campo {% if campo.errors %}con-error{% endif %}">
    {{ campo.label_tag }}
    {{ campo }}
    {% if campo.help_text %}<small>{{ campo.help_text }}</small>{% endif %}
    {{ campo.errors }}
  </div>
{% endfor %}
```

O campo a campo, cuando el orden en la página no es el del formulario:

```html
{{ formulario.nombre.label_tag }}
{{ formulario.nombre }}
{{ formulario.nombre.errors }}
```

Cada `{{ formulario.nombre }}` es un objeto con bastante dentro:

```salida
label        : Correo de respuesta
id_for_label : id_correo
html_name    : correo
value()      : None
help_text    : ''
field.required: True
```

Fíjate en `field`: **el objeto del bucle no es el campo que declaraste**, es un envoltorio que junta ese campo con el valor y los errores de esta petición concreta. Por eso las propiedades de la declaración se piden a través de `campo.field`.

> [!consejo] No maquetes esto a mano más de una vez
>
> Escribir ese bucle con sus clases y sus errores en cada plantilla es repetición pura, y hay tres salidas mejores.
>
> **Un trozo incluido** de los de la lección 18, con el bucle dentro, y un `{% include %}` en cada formulario. Es la solución sin dependencias y funciona.
>
> **Cambiar la plantilla de los formularios** con `FORM_RENDERER`, que lo aplica a todo el proyecto de una vez, incluidos los formularios del panel de administración y los de las aplicaciones ajenas.
>
> **Una biblioteca**, si el proyecto usa un marco de estilos. `django-crispy-forms` es la de siempre y hay versiones más ligeras. Merece la pena a partir del tercer formulario, y no antes: la primera vez conviene haber escrito el bucle a mano para saber qué hace.

> [!nota] Los dos `EmailField` no son el mismo
>
> Un detalle que confunde al comparar el HTML de esta lección con el de la 24:
>
> ```salida
> forms.EmailField  max_length por defecto: 320
> models.EmailField max_length por defecto: 254
> ```
>
> Son clases distintas, de módulos distintos, y sus valores por defecto no coinciden. El de formularios usa el máximo teórico de una dirección de correo; el de modelos mantiene el valor histórico por compatibilidad con las tablas ya creadas.
>
> Pasa lo mismo con otros nombres repetidos: `CharField`, `DateField`, `BooleanField` y `DecimalField` existen en los dos sitios y no son lo mismo. **El `import` decide cuál es**, y confundirlos da errores desconcertantes porque los argumentos se parecen pero no son los mismos.

> [!resumen] En resumen
>
> Un formulario es una clase con campos declarados que hace tres cosas: dibujar el HTML, validar lo que llega y convertir el texto de la petición a tipos de Python. Se construye vacío para enseñarlo o con datos para comprobarlos, y uno vacío nunca es válido porque no hay nada que comprobar. `is_valid()` deja el resultado en `cleaned_data`, ya con los tipos correctos y con los espacios recortados, y ese diccionario existe también cuando la validación falla, conteniendo solo los campos que pasaron. En los formularios lo obligatorio es lo normal, al revés que en los modelos. El ciclo de la vista es siempre el mismo: si es `POST` se construye con los datos y se valida, si no se construye vacío, y el `render` final queda fuera del `if`, que es lo que hace que un envío inválido vuelva a pintar el formulario con sus errores y con lo que ya estaba escrito; solo se redirige cuando todo ha ido bien. En la plantilla, `{{ formulario }}` son solo los campos, así que el `<form>`, el botón y el `{% csrf_token %}` los pones tú, y hay que acordarse de `non_field_errors` o los errores generales no se ven en ninguna parte. Desde Django 5.0 la forma por defecto es un `<div>` por campo y no una tabla. El `novalidate` del formulario sirve para no esconder tu validación durante el desarrollo, y detrás está la regla de fondo: la validación del navegador es una comodidad y nunca una defensa. Y conviene no confundir los campos de formulario con los campos de modelo, que comparten nombre y no son lo mismo.

> [!ejercicio] Practica
>
> 1. Escribe el formulario de contacto y pruébalo desde el intérprete: uno vacío, uno con datos malos y uno con datos buenos. Mira `is_bound`, `is_valid()`, `errors` y `cleaned_data` en los tres casos.
> 2. Pásale un nombre con espacios al principio y al final y comprueba qué llega a `cleaned_data`.
> 3. Provoca un fallo en dos campos y mira qué contiene `cleaned_data`. Explica por qué faltan esos dos.
> 4. Monta la vista completa y comprueba los tres caminos con `curl -i`: el `GET`, el `POST` inválido y el `POST` válido.
> 5. Envía un formulario incompleto desde el navegador con `novalidate` y sin él, y compara lo que ves.
> 6. Quita el `{% csrf_token %}` y envía. Después quita el `non_field_errors`, añade una validación global que falle siempre y comprueba que el formulario se niega a enviarse sin decir por qué.
> 7. Sustituye `{{ formulario }}` por el bucle campo a campo y añade una clase CSS a los campos con error.
