---
titulo: "Widgets y cómo se dibuja un formulario"
resumen: "La pieza que decide el HTML, el selector de fechas que sale vacío, y el desplegable que aparece en inglés."
minutos: 15
orden: 28
---

Un campo de formulario son dos cosas pegadas que conviene separar: **qué se acepta** y **cómo se pregunta**. Lo primero es el campo y ya se ha visto entero. Lo segundo es el widget, y hasta ahora ha ido saliendo el que tocaba por defecto.

En cuanto hay un diseño, eso deja de bastar. Y hay dos casos donde no es cosmética sino un fallo de verdad: un selector de fecha que aparece vacío al editar, y un desplegable que sale en inglés en un sitio en español. Los dos están medidos aquí.

> [!objetivo] Qué vas a aprender
>
> Saber qué widget da cada campo y cómo cambiarlo, poner atributos HTML sin perder los que ya había, aplicar clases a todos los campos de una vez, marcar los obligatorios y los erróneos desde CSS, y reconocer los dos fallos propios de los widgets de fecha y de relación.

## Qué sale por defecto

```salida
texto      <input type="text" name="texto" required id="id_texto">
largo      <textarea name="largo" cols="40" rows="3" required id="id_largo"></textarea>
clave      <input type="password" name="clave" required id="id_clave">
oculto     <input type="hidden" name="oculto" id="id_oculto">
fecha      <input type="date" name="fecha" required id="id_fecha">
numero     <input type="number" name="numero" min="0" max="120" step="1" required id="id_numero">
eleccion   <select name="eleccion"><option value="a">Uno</option>...</select>
radio      <div id="id_radio"><div><label for="id_radio_0"><input type="radio" ...
varias     <div id="id_varias"><div><label for="id_varias_0"><input type="checkbox" ...
si         <input type="checkbox" name="si" id="id_si">
```

El `id` se genera con el prefijo `id_` y el `name` es el nombre del campo, y eso es lo que permite que la etiqueta apunte al control y que `peticion.POST` tenga las claves que tiene.

Los que hay que conocer, porque son los que se cambian:

| Campo | Widget por defecto | Alternativa habitual |
| --- | --- | --- |
| `CharField` | `TextInput` | `Textarea`, `PasswordInput`, `HiddenInput` |
| `ChoiceField` | `Select` | `RadioSelect` |
| `MultipleChoiceField` | `SelectMultiple` | `CheckboxSelectMultiple` |
| `DateField` | `DateInput` | `DateInput(attrs={'type': 'date'})` |
| `BooleanField` | `CheckboxInput` | — |
| `FileField` | `ClearableFileInput` | lección 29 |

Cambiarlo es un argumento:

```python
mensaje = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}))
clave = forms.CharField(widget=forms.PasswordInput)
```

Con paréntesis cuando se le pasa algo y sin ellos cuando no. Las dos formas valen.

## Atributos

`attrs` es un diccionario que va tal cual al HTML:

```python
busca = forms.CharField(widget=forms.TextInput(attrs={
    'type': 'search',
    'placeholder': 'Buscar…',
    'autofocus': True,
}))
```

```salida
<input type="search" name="busca" placeholder="Buscar…" required id="id_busca">
```

Sirve para cualquier atributo, incluidos los de accesibilidad (`aria-describedby`), los de comportamiento (`autocomplete`, `inputmode`) y los que usan las bibliotecas de JavaScript (`data-...`). Y fíjate en que se puede cambiar el `type` de un `TextInput`, que es la forma corta de conseguir `search`, `tel`, `url` o `color` sin widget propio.

> [!aviso] Declarar el widget borra lo que el modelo había puesto
>
> Es la trampa de esta lección en un `ModelForm`, y es sutil.
>
> Cuando el widget lo genera Django a partir del modelo, trae los atributos que salen de la declaración: `maxlength`, `min`, `step`. Al declararlo tú, **se sustituye entero** y esos se pierden:
>
> ```python
> widgets = {'nombre': forms.TextInput(attrs={'class': 'campo'})}   # adiós maxlength
> ```
>
> No es grave, porque la validación del servidor sigue funcionando y es la que cuenta. Pero se pierde la ayuda del navegador, que es la que impide escribir de más antes de enviar.
>
> Las dos salidas. Repetir el atributo a mano, que se queda desincronizado con el modelo. O no declarar el widget y **tocar sus atributos después**, que es lo que hace el patrón de abajo y es la forma limpia.

## Clases para todos los campos

Poner `class` widget a widget es insufrible y es justo lo que pide cualquier marco de estilos. La forma correcta es el `__init__`:

```python
class ContactoForm(forms.ModelForm):
        class Meta:
                model = Contacto
        fields = ['nombre', 'correo', 'telefono']

    def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
        for campo in self.fields.values():
                        campo.widget.attrs.setdefault('class', 'form-control')
```

```salida
<input type="text" name="nombre" class="form-control" required id="id_nombre">
```

Dos detalles que hacen que esto funcione bien. El `super()` va primero, porque `self.fields` no existe hasta que el padre lo construye. Y `setdefault` en lugar de asignación directa: así un campo que ya tenía su clase la conserva, en vez de perderla.

Ese `__init__` es además el sitio de las otras dos cosas que hacen falta a menudo:

```python
def __init__(self, *args, **kwargs):
        self.usuario = kwargs.pop('usuario')          # un argumento propio
    super().__init__(*args, **kwargs)
    self.fields['grupo'].queryset = Grupo.objects.filter(dueno=self.usuario)
```

El `kwargs.pop` **antes** del `super()`, porque el padre no sabe qué es `usuario` y protestaría. Y limitar el `queryset` de un campo de relación es lo que resuelve el problema de los desplegables enormes de la lección 26, y también un agujero de seguridad, porque un desplegable sin filtrar enseña los grupos de todo el mundo.

## Marcar obligatorios y errores

Sin tocar ninguna plantilla:

```python
class ContactoForm(forms.ModelForm):
        required_css_class = 'obligatorio'
    error_css_class = 'con-error'
```

```salida
<div class="obligatorio con-error">
  <label for="id_a" class="obligatorio">A:</label>
  <ul class="errorlist" id="id_a_error"><li>Este campo es obligatorio.</li></ul>
  <input type="text" name="a" required ...>
```

Django añade esas clases al contenedor y a la etiqueta de cada campo según corresponda. Con dos reglas de CSS ya tienes el asterisco de los obligatorios y el borde rojo de los que fallan, y el HTML de la plantilla no cambia.

## El selector de fecha que sale vacío

Esto no es cosmética. Un formulario de edición con una fecha ya guardada:

```salida
SinType      <input type="text" name="fecha" value="22/09/2026" ...>
ConTypeMal   <input type="date" name="fecha" value="22/09/2026" ...>
ConTypeBien  <input type="date" name="fecha" value="2026-09-22" ...>
```

El del medio es el que se escribe siempre y **el navegador lo enseña vacío**. Un `<input type="date">` solo entiende el valor en `AAAA-MM-DD`; con cualquier otra cosa, se calla y no pinta nada.

El efecto en producción es de los caros: alguien edita un registro, no ve la fecha, la rellena a ojo o la deja en blanco, y se pierde el dato original. Y no hay ningún error en ninguna parte.

El arreglo es decirle al widget en qué formato tiene que escribir:

```python
fecha = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'))
```

O ponerlo para todo el proyecto:

```python title="agenda/settings.py"
FORM_RENDERER = 'django.forms.renderers.DjangoTemplates'
DATE_INPUT_FORMATS = ['%Y-%m-%d', '%d/%m/%Y']
```

> [!nota] Y de entrada, el español acepta dos formatos
>
> La otra mitad del asunto es qué se admite al enviar, y ahí la localización sí funciona:
>
> ```salida
> '2026-09-22'  -> válido   2026-09-22
> '22/09/2026'  -> válido   2026-09-22
> '22-09-2026'  -> error    Introduzca una fecha válida.
> '09/22/2026'  -> error    Introduzca una fecha válida.
> ```
>
> ```salida
> DATE_INPUT_FORMATS de la localización: ['%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d']
> ```
>
> Con `LANGUAGE_CODE = 'es-es'`, Django acepta el formato español y el internacional, y rechaza el americano. Eso está bien y hay que tenerlo presente al hacer pruebas: **un caso escrito con `09/22/2026` falla, y no es un fallo del código**.
>
> Y ojo con la asimetría: el formato de **entrada** lo arregla la localización sola, y el de **salida** al widget hay que decírselo. Es exactamente lo que hace que el fallo de arriba sea tan fácil de cometer.

> [!aviso] El desplegable de las relaciones sale en inglés
>
> Medido en Django 6.1.1, con `LANGUAGE_CODE = 'es-es'` y en una página de verdad:
>
> ```salida
> <option value="" selected>- Select an option -</option>
> <option value="1">Trabajo</option>
> ```
>
> El resto del formulario está en español —las etiquetas, los mensajes de error, hasta la página de error `403`— y esa primera opción, no. En versiones anteriores era `---------`, que al menos no tenía idioma.
>
> No es un fallo de tu proyecto y no se arregla desde los ajustes. Se arregla campo a campo:
>
> ```python
> grupo = forms.ModelChoiceField(queryset=Grupo.objects.all(), empty_label='Sin grupo')
> ```
>
> O en el `__init__`, para no volver a declarar el campo:
>
> ```python
> self.fields['grupo'].empty_label = '- Elige una opción -'
> ```
>
> Conviene revisarlo en todos los `ForeignKey` de un proyecto en español, porque es de lo primero que ve quien entra y da sensación de cosa sin terminar.

> [!consejo] Hasta dónde llegar sin bibliotecas
>
> Con lo de esta lección se llega bastante lejos, y merece la pena saber dónde está el límite antes de instalar nada.
>
> **Se resuelve sin nada**: clases en todos los campos, atributos de accesibilidad, marcar obligatorios y errores, el bucle de la lección 25 en un trozo incluido, y `FORM_RENDERER` para cambiar la plantilla de todos los formularios del proyecto de una vez.
>
> **Empieza a doler**: las disposiciones en columnas, los grupos de campos con títulos, los formularios largos partidos en secciones. Se puede, escribiendo la plantilla campo a campo, y es mucho HTML repetido.
>
> **Ahí entra una biblioteca.** `django-crispy-forms` con la plantilla de tu marco de estilos, o alguna de las más ligeras que han salido después. El criterio: **a partir del tercer formulario con diseño**, y no antes. Antes, el bucle a mano enseña cómo funciona esto y se escribe en diez minutos.
>
> Y para los controles ricos —selectores con búsqueda, calendarios propios, campos de etiquetas— la respuesta casi siempre es un widget propio que pinte lo que espera una biblioteca de JavaScript, no pelearse con lo que trae Django.

> [!resumen] En resumen
>
> El widget decide el HTML de un campo, y es una pieza aparte de lo que el campo acepta; se cambia pasándolo como argumento, y `attrs` pone cualquier atributo en la etiqueta, incluido el `type`, lo que permite conseguir `search`, `tel` o `color` sin escribir un widget. En un `ModelForm`, declarar el widget sustituye por completo al generado y se pierden los atributos que venían del modelo, así que suele ser mejor tocar `widget.attrs` después en el `__init__`, que además es el sitio para poner una clase a todos los campos con `setdefault`, para aceptar argumentos propios con un `kwargs.pop` antes del `super()`, y para limitar el `queryset` de un campo de relación, que es a la vez un problema de rendimiento y de seguridad. Los atributos `required_css_class` y `error_css_class` marcan los campos obligatorios y los erróneos sin tocar ninguna plantilla. Los dos fallos de verdad de esta lección son de fechas y de relaciones: un `<input type="date">` solo entiende el valor en formato internacional, de modo que al editar sale vacío y el dato original se pierde sin ningún error, y hay que darle el `format` al widget aunque la entrada sí funcione sola gracias a la localización; y en Django 6.1 la opción vacía de un `ModelChoiceField` aparece en inglés incluso con el idioma en español, así que hay que poner `empty_label` en todos los campos de relación de un proyecto en español.

> [!ejercicio] Practica
>
> 1. Escribe un formulario con diez campos de tipos distintos y mira el HTML que genera cada uno. Localiza de dónde sale el `id` y el `name`.
> 2. Cambia el widget de un campo de texto a `Textarea` y a `PasswordInput`, y el de un campo de opciones a `RadioSelect`.
> 3. Convierte un `TextInput` en un campo de búsqueda solo con `attrs`, sin cambiar de widget.
> 4. En un `ModelForm`, declara un widget para un campo con `max_length` en el modelo y comprueba que el `maxlength` desaparece del HTML. Consíguelo sin perderlo.
> 5. Pon una clase a todos los campos desde el `__init__` con `setdefault`. Añade después una clase distinta a uno solo y comprueba que no se pisan.
> 6. Añade `required_css_class` y `error_css_class`, escribe dos reglas de CSS y envía el formulario vacío.
> 7. Monta un formulario de edición con una fecha ya guardada y un widget con `type="date"`. Mira si el navegador la enseña. Arréglalo con `format`.
> 8. Prueba a enviar una fecha en los tres formatos y comprueba cuáles acepta tu proyecto.
> 9. Mira qué pone la primera opción de un desplegable de `ForeignKey` y cámbiala.
