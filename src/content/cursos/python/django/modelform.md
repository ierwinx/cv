---
titulo: "ModelForm"
resumen: "El formulario que se escribe solo a partir del modelo, el `commit=False` que hace falta más de lo que parece, y la línea que se olvida todo el mundo."
minutos: 16
orden: 26
---

El formulario de la lección anterior no guardaba nada, y por eso había que declararlo entero. Cuando lo que se pregunta es lo que se guarda, declararlo otra vez es escribir dos veces la misma lista de campos, con sus tipos y sus longitudes, y que se queden desincronizadas en cuanto alguien toque el modelo.

Ya viste la solución funcionando en la lección 24, aunque no se llamó por su nombre: el formulario que `CreateView` generaba a partir de `model` y `fields` era un `ModelForm`. Aquí se escribe a mano, que es lo que hace falta en cuanto se quiere controlar algo.

Y de paso se cierra la deuda más vieja del módulo. La lección 8 descubrió que `save()` no valida; la 9 que `choices` tampoco; la 15 lo dejó en manos de las restricciones de base de datos y prometió la otra mitad. Esta es la otra mitad.

> [!objetivo] Qué vas a aprender
>
> Escribir un `ModelForm` y saber qué campos genera, configurarlo desde su `Meta`, entender la diferencia entre `fields` y `exclude` y por qué importa, guardar con `save` y con `save(commit=False)`, no olvidar `save_m2m`, y saber qué valida un `ModelForm` que `save()` no validaba.

## Escribirlo

```python title="contactos/forms.py"
from django import forms

from .models import Contacto


class ContactoForm(forms.ModelForm):
        class Meta:
                model = Contacto
        fields = ['nombre', 'correo', 'telefono', 'grupo', 'etiquetas', 'notas']
```

No hay ni un campo declarado. La clase `Meta` de dentro dice de qué modelo y qué campos, y el resto se deduce:

```salida
nombre     CharField                 required=True   widget=TextInput
correo     EmailField                required=True   widget=EmailInput
telefono   CharField                 required=False  widget=TextInput
grupo      ModelChoiceField          required=False  widget=Select
etiquetas  ModelMultipleChoiceField  required=False  widget=SelectMultiple
notas      CharField                 required=False  widget=Textarea
```

Cada línea es rastreable hasta una decisión del bloque B. El `EmailField` del modelo da un `EmailField` de formulario; el `blank=True` del teléfono da `required=False`; el `ForeignKey` da un desplegable con las filas de la otra tabla; el `ManyToManyField` da uno de selección múltiple; y el `TextField` de las notas da un `<textarea>`.

> [!nota] Otra clase `Meta` que no tiene nada que ver con la otra
>
> El nombre se repite y las dos cosas son distintas, así que conviene separarlas ahora:
>
> **El `Meta` del modelo** (lección 15) configura la tabla: el orden por defecto, los nombres, los índices, las restricciones.
>
> **El `Meta` del `ModelForm`** configura el formulario: qué modelo, qué campos, qué etiquetas, qué widgets.
>
> Un modelo con `Meta` y un `ModelForm` con `Meta` tienen dos clases con el mismo nombre que no comparten nada. Se usa el mismo nombre por convención de Django y es una fuente de confusión legítima.

## Configurarlo desde `Meta`

Lo que sale por defecto es utilizable y feo. Los cuatro diccionarios que lo arreglan sin declarar campos:

```python title="contactos/forms.py"
class ContactoForm(forms.ModelForm):
        class Meta:
                model = Contacto
        fields = ['nombre', 'correo', 'telefono', 'grupo', 'etiquetas', 'notas']
        labels = {'correo': 'Correo electrónico'}
        help_texts = {'telefono': 'Con prefijo si es del extranjero.'}
        widgets = {'notas': forms.Textarea(attrs={'rows': 3})}
        error_messages = {'correo': {'unique': 'Ya hay alguien con ese correo.'}}
```

```salida
{'correo': ['Ya hay alguien con ese correo.']}
```

Ese `error_messages` es un diccionario de diccionarios, porque un campo tiene varios errores posibles: `required`, `invalid`, `max_length`, `unique`. La clave de dentro es cuál de ellos.

Y cuando un campo necesita más de lo que cabe ahí, se declara encima del `Meta` y gana:

```python
class ContactoForm(forms.ModelForm):
        correo = forms.EmailField(label='Correo', widget=forms.EmailInput(attrs={'autofocus': True}))

    class Meta:
                model = Contacto
        fields = ['nombre', 'correo', 'telefono']
```

Ojo con eso: **un campo declarado a mano sustituye al generado por completo**. Si el del modelo tenía `unique=True`, el tuyo no lo comprueba salvo que se lo pongas. Es la forma más habitual de perder una validación sin darse cuenta.

## `fields` frente a `exclude`

Las dos formas de decir qué campos, y no son equivalentes:

```python
fields = ['nombre', 'correo']      # solo estos
exclude = ['notas']                # todos menos este
fields = '__all__'                 # todos
```

```salida
campos con exclude: ['nombre', 'correo', 'telefono', 'grupo', 'etiquetas']
```

El razonamiento es el mismo que el de la lección 24 y merece repetirse porque aquí es más fácil equivocarse: **`fields` es una lista blanca y `exclude` es una lista negra**. Con `exclude`, el día que alguien añada un campo al modelo, ese campo aparece solo en el formulario. Si resulta llamarse `es_administrador`, acabas de regalar el sitio.

`fields` obliga a una decisión explícita cada vez que el modelo crece, que es exactamente lo que se quiere. **Usa siempre `fields`.**

> [!aviso] Dejar fuera un campo obligatorio es un `500` esperando
>
> Y aquí está el otro lado del filo. Un formulario con menos campos de los que el modelo exige:
>
> ```python
> class Parcial(forms.ModelForm):
>         class Meta:
>                 model = Contacto
>         fields = ['nombre']
> ```
>
> ```salida
> válido: True
> ERROR al guardar: IntegrityError: UNIQUE constraint failed: contactos_contacto.correo
> ```
>
> **El formulario dice que sí y la base de datos dice que no.** Y no es un error controlado: es una excepción sin capturar, o sea una página de error quinientos delante de quien rellenó el formulario.
>
> Lo que ha pasado es que el `correo` no estaba en el formulario, se guardó vacío, y el segundo intento chocó con el `unique=True`. El primero pasó sin ruido, que es lo peor de todo.
>
> La regla: **si un campo es obligatorio en el modelo y no está en el formulario, la vista tiene que rellenarlo**. Y eso se hace con lo que viene ahora.

## Guardar

```python
if formulario.is_valid():
        contacto = formulario.save()
    return redirect(contacto)
```

`save()` crea el objeto, lo guarda y lo devuelve. Para editar, se le pasa el objeto de partida:

```python
formulario = ContactoForm(peticion.POST, instance=contacto)
```

```salida
initial del nombre: Ana Ruiz
mismo objeto? True
```

Con `instance`, el formulario sale relleno y `save()` actualiza en vez de crear. **Es el mismo formulario para crear y para editar**, y la única diferencia es ese argumento. Por eso `CreateView` y `UpdateView` compartían plantilla en la lección 24.

### `commit=False`

Cuando falta algo que el formulario no puede saber, como el campo obligatorio del aviso de arriba o la persona que ha entrado:

```python
contacto = formulario.save(commit=False)
contacto.propietario = peticion.user
contacto.save()
formulario.save_m2m()
```

```salida
pk antes de guardar: None
pk después: 9
```

`save(commit=False)` construye el objeto y **no toca la base de datos**. Devuelve algo sin `pk`, se le añade lo que falte, y se guarda a mano.

> [!aviso] `save_m2m`, la línea que se olvida todo el mundo
>
> Es el error más común de esta lección y no da ningún aviso:
>
> ```salida
> etiquetas SIN save_m2m: []
> etiquetas CON save_m2m: ['VIP']
> ```
>
> Mismo formulario, mismos datos, y las etiquetas se pierden. El síntoma es exactamente ese: se guarda todo bien menos las relaciones de muchos a muchos, que quedan vacías.
>
> El motivo se explicó en la lección 14: **una relación de muchos a muchos necesita que el objeto exista**, porque la tabla intermedia guarda su identificador. Con `commit=False` no existe todavía, así que Django no puede guardarlas y te deja el trabajo apuntado:
>
> ```salida
> existe save_m2m tras is_valid:      False
> existe save_m2m tras commit=False:  True
> ```
>
> Ese método **solo aparece después de un `save(commit=False)`**. Es la señal de Django de que hay algo pendiente.
>
> La regla: **en cuanto escribas `commit=False`, escribe las tres líneas de golpe** —el `save()` del objeto y el `save_m2m()`— y después rellena lo del medio. Con `save()` normal no hace falta, porque lo hace él.

## Qué valida un `ModelForm`

Esto es lo que cierra el arco del bloque B, y conviene verlo enumerado porque es bastante más de lo que la gente supone.

**Lo de los campos**, igual que un formulario normal: obligatorios, longitudes, formatos.

**Lo `unique` del modelo**, que `save()` se saltaba:

```salida
válido: False
{'correo': ['Ya hay alguien con ese correo.']}
```

Eso es una consulta extra a la base de datos, y es la razón de que un `ModelForm` sea más lento que un `Form`. También vale para `unique_together` y para los `UniqueConstraint` de la lección 15.

**El `clean()` del modelo**, el que la lección 15 dejó escrito sin poder demostrar quién lo llamaba:

```salida
válido: False
{'nombre': ['Ese nombre no se admite.']}
```

Ya está la respuesta: **lo llama el `ModelForm`**. Un `clean()` en el modelo es validación que funciona desde cualquier formulario, incluido el panel de administración, y que se salta un `create()` directo. Lo mismo vale para las restricciones del `Meta`, que también se comprueban aquí.

Por debajo, lo que hace es llamar al `full_clean()` del objeto:

```salida
full_clean: ValidationError {'nombre': ['Este campo no puede estar vacío.']}
```

Que es el método que la lección 8 dijo que había que llamar a mano. **En un `ModelForm` ya no hace falta.**

> [!consejo] El reparto definitivo, ahora que están las dos mitades
>
> Con esto se puede cerrar la discusión que lleva abierta desde la lección 8.
>
> | Dónde | Qué garantiza | Cuándo se salta |
> | --- | --- | --- |
> | `CheckConstraint`, `unique` | Siempre. Es la base de datos | Nunca |
> | `clean()` del modelo | Cualquier formulario y el panel | Con `create()` o `save()` directos |
> | `clean_campo()` del formulario | Este formulario | Fuera de él |
> | El navegador | Nada | Con `curl` |
>
> Y la recomendación práctica: **restricción en la base de datos para lo que no puede pasar nunca, `clean()` en el modelo para las reglas del dominio, y validación de formulario para los mensajes que se leen bien.** Las tres capas no sobran: la primera protege los datos, la segunda protege el dominio y la tercera protege a las personas.
>
> Lo que no conviene es poner las reglas del dominio solo en el formulario. En cuanto haya una importación, una orden de gestión o una API, ese formulario no está por medio.

> [!nota] Pintar el formulario cuesta consultas
>
> Algo que no se ve y que se nota en las páginas con muchos desplegables:
>
> ```salida
> consultas al pintar: 2
>     SELECT ... FROM "contactos_grupo"
>     SELECT ... FROM "contactos_etiqueta"
> ```
>
> Cada `ForeignKey` y cada `ManyToManyField` es un `<select>`, y cada `<select>` **carga la tabla entera** para llenar sus opciones. Con cinco grupos da igual; con diez mil, la página tarda y el desplegable es inutilizable.
>
> Las salidas son limitar el `queryset` del campo en el `__init__` del formulario, o cambiar el widget por uno que busque en vez de listar, que es lo que hace el panel de administración con `autocomplete_fields` y se ve en la lección 31.

> [!resumen] En resumen
>
> Un `ModelForm` genera los campos a partir del modelo, de modo que el tipo, la obligatoriedad y el widget salen de decisiones que ya tomaste en el bloque B, y se configura desde una clase `Meta` que no tiene nada que ver con la del modelo aunque se llame igual: ahí van el modelo, los campos, las etiquetas, los textos de ayuda, los widgets y los mensajes de error. Un campo declarado encima del `Meta` sustituye por completo al generado, lo que es la forma más fácil de perder una validación sin enterarse. Entre `fields` y `exclude` hay que elegir siempre `fields`, porque con `exclude` cualquier campo nuevo del modelo aparece solo en el formulario; y dejar fuera un campo que el modelo exige da un formulario que se valida bien y revienta al guardar con un error de integridad. Para editar se pasa `instance`, y entonces el mismo formulario sirve para crear y para actualizar. Cuando falta algo que el formulario no puede saber se usa `save(commit=False)`, que devuelve el objeto sin guardar, y entonces hay que acordarse de `save_m2m()`, que solo existe después de esa llamada y sin el cual las relaciones de muchos a muchos se pierden en silencio. Y lo que cierra el arco abierto en la lección 8: un `ModelForm` valida los campos, comprueba los `unique` con una consulta extra y llama al `clean()` del modelo y a sus restricciones, porque por debajo ejecuta el `full_clean()` que hasta ahora había que llamar a mano.

> [!ejercicio] Practica
>
> 1. Escribe el `ModelForm` de tu modelo y comprueba desde el intérprete qué campos ha generado y de qué tipo. Relaciona cada uno con la declaración del modelo.
> 2. Cambia una etiqueta, un texto de ayuda y un widget desde el `Meta`, sin declarar ningún campo.
> 3. Crea un `ModelForm` con `exclude` y otro con `fields`. Añade un campo al modelo y mira en cuál de los dos aparece solo.
> 4. Escribe un `ModelForm` que deje fuera un campo obligatorio del modelo y guárdalo dos veces. Explica por qué el primero pasa y el segundo no.
> 5. Intenta guardar un contacto con un correo que ya existe y comprueba que el formulario lo rechaza. Compáralo con lo que hacía `Contacto.objects.create` en la lección 8.
> 6. Guarda con `commit=False` un contacto con etiquetas, sin llamar a `save_m2m`. Mira qué se ha guardado y qué no. Después añade la línea.
> 7. Escribe un `clean()` en el modelo que rechace un valor y comprueba que el formulario lo respeta. Después salta la validación con un `create()` directo y comprueba que entra.
> 8. Cuenta las consultas que cuesta pintar tu formulario y explica de dónde salen.
