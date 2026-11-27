---
titulo: "Validación"
resumen: "El orden exacto en que Django comprueba las cosas, los tres sitios donde puedes meter el tuyo, y el `return` que se olvida y destruye datos en silencio."
minutos: 16
orden: 27
---

Hasta ahora la validación ha funcionado sola: longitudes, formatos, campos obligatorios, `unique`. Eso cubre lo que se puede deducir de la declaración, y en cuanto la regla es del negocio ya no se deduce de nada.

El teléfono tiene que ser de nueve dígitos. La fecha de baja no puede ser anterior a la de alta. Las dos contraseñas tienen que coincidir. Si el grupo es "Trabajo", el correo es obligatorio.

Ahí hay que escribir código, y Django ofrece tres sitios donde ponerlo. Elegir mal no es grave, pero da errores que aparecen en el campo equivocado o que no aparecen nunca.

> [!objetivo] Qué vas a aprender
>
> Conocer el orden exacto en que Django valida, elegir entre validadores, `clean_campo` y `clean` según el caso, escribir errores con código y parámetros, usar `add_error` y saber qué le hace a `cleaned_data`, y reconocer las dos trampas de esta lección.

## El orden

Esto es lo que hay que tener claro antes que nada, porque explica casi todos los desconciertos. Con un formulario instrumentado para que cuente lo que hace:

```salida
validador('abc')
clean_uno('abc')
clean_dos('def')
clean() ve ['dos', 'uno']

cleaned_data: {'uno': 'ABC', 'dos': 'def'}
```

Django recorre **campo por campo**, y con cada uno hace tres cosas en este orden: lo convierte al tipo que toca, pasa sus validadores, y llama a su `clean_campo` si existe. Cuando ha terminado con todos, llama una vez a `clean`.

Fíjate en el `'ABC'`: el `clean_uno` devolvió el valor en mayúsculas y eso es lo que quedó. **Lo que devuelve un `clean_campo` sustituye al valor**, así que es el sitio de las normalizaciones.

Y ahora lo importante, un campo que falla:

```salida
validador('xyz')
clean_dos('def')
clean() ve ['dos']

errores: {'uno': ['No puede empezar por x.']}
```

Han pasado dos cosas. El `clean_uno` **no se ha llamado**, porque su validador ya había fallado. Y cuando le toca el turno a `clean`, el campo `uno` **no está en `cleaned_data`**.

Con un campo vacío, ni siquiera se llega al validador:

```salida
clean_dos('def')
clean() ve ['dos']
errores: {'uno': ['Este campo es obligatorio.']}
```

De ahí sale la regla que evita el error más frecuente de esta lección:

> [!aviso] En `clean`, usa siempre `.get()`
>
> ```python
> def clean(self):
>         datos = super().clean()
>     if datos['fecha_alta'] > datos['fecha_baja']:   # KeyError esperando
>                 ...
> ```
>
> Cualquier campo que haya fallado antes **no está en el diccionario**, y ese `datos['fecha_alta']` es un `KeyError`, o sea una página quinientos, justo cuando alguien ha rellenado el formulario mal. Es doblemente desagradable: el fallo solo ocurre cuando ya había otro fallo.
>
> La forma correcta, y es la misma siempre:
>
> ```python
> def clean(self):
>         datos = super().clean()
>     alta, baja = datos.get('fecha_alta'), datos.get('fecha_baja')
>     if alta and baja and alta > baja:
>                 raise ValidationError('La baja no puede ser anterior al alta.')
>     return datos
> ```
>
> Sacar los valores con `.get()`, **comprobar que están** y solo entonces compararlos. Si falta uno, no hay nada que comparar: ya hay un error en ese campo y quien lo rellenó lo verá.

## Los tres sitios

### Validadores

Una función que recibe el valor y lanza una excepción si no le gusta:

```python
from django.core.exceptions import ValidationError


def solo_dias_laborables(fecha):
        if fecha.weekday() >= 5:
                raise ValidationError('Tiene que ser un día laborable.')
```

```python
fecha = forms.DateField(validators=[solo_dias_laborables])
```

Un validador **no devuelve nada**: o calla o lanza. Y solo ve su propio valor, que es su limitación y su virtud, porque eso lo hace reutilizable.

Django trae unos cuantos hechos:

```python
from django.core.validators import RegexValidator, MinValueValidator, validate_email

solo_digitos = RegexValidator(r'^[0-9]{9}$', 'Nueve dígitos, sin espacios.')
```

```salida
'600112233'     -> True
'600 11 22 33'  -> False  ['Nueve dígitos, sin espacios.']
```

Y hay una ventaja de peso: **un validador se puede poner en el campo del modelo**, y entonces vale para todos los formularios y para el panel de administración a la vez. Es el sitio correcto para las reglas de formato.

### `clean_campo`

Un método con el nombre del campo, para lo que solo afecta a ese campo:

```python
def clean_nombre(self):
        valor = self.cleaned_data['nombre']
    if Contacto.objects.filter(nombre__iexact=valor).exists():
                raise ValidationError('Ya hay un contacto con ese nombre.')
    return valor
```

Dos diferencias con un validador. Tiene acceso a `self`, así que puede consultar la base de datos o mirar el objeto que se está editando. Y **devuelve el valor**, que es lo que se guarda.

Por eso es el sitio de las normalizaciones:

```python
def clean_telefono(self):
        return self.cleaned_data['telefono'].replace(' ', '').replace('-', '')
```

Dentro de un `clean_campo` se puede usar `self.cleaned_data['nombre']` con corchetes sin miedo: si el campo hubiera fallado, este método no se habría llamado.

> [!aviso] El `return` que falta destruye el dato sin decir nada
>
> La trampa de la lección, y no salta ni un aviso:
>
> ```python
> def clean_nombre(self):
>         valor = self.cleaned_data['nombre'].strip()
>     # falta el return
> ```
>
> ```salida
> válido: True | cleaned_data: {'nombre': None}
> ```
>
> El formulario **es válido** y el nombre vale `None`. Una función de Python sin `return` devuelve `None`, Django lo guarda tal cual, y lo que se escriba en ese campo desaparece.
>
> El síntoma en producción es de los que llevan una tarde: se guardan filas con un campo vacío, sin errores, sin excepciones y sin nada en los registros. Y en un `ModelForm` sobre un campo no nulo, se convierte en un error de integridad lejísimos del sitio donde está la causa.
>
> **Todo `clean_campo` termina con `return`.** Siempre.

### `clean`

Para lo que necesita más de un campo. Es el único que los ve todos:

```python
def clean(self):
        datos = super().clean()
    if datos.get('grupo') == 'trabajo' and not datos.get('correo'):
                self.add_error('correo', 'El correo es obligatorio en el grupo de trabajo.')
    return datos
```

Tres cosas de ese trozo, y las tres se olvidan:

**El `super().clean()` del principio**, que es lo que rellena `cleaned_data`.

**El `return datos` del final.** Se puede omitir en versiones recientes de Django, y aun así conviene ponerlo siempre, porque la costumbre de no ponerlo se contagia a `clean_campo`, donde sí es obligatorio y silencioso.

**El error va a un campo concreto** con `add_error`, no lanzado.

## `raise` o `add_error`

Las dos formas de decir que algo está mal, y no hacen lo mismo:

```python
raise ValidationError('Uno y dos no pueden ser iguales.')   # error general
self.add_error('b', 'No puede ser igual que A.')            # error de un campo
```

```salida
raise      -> {'__all__': ['Uno y dos no pueden ser iguales.']}
add_error  -> {'b': ['No puede ser igual que A.']}
```

Un `raise` dentro de `clean` produce un error **general**, y esos solo se ven si la plantilla tiene el `{{ formulario.non_field_errors }}` de la lección 25. Un error general que nadie pinta es un formulario que se niega a enviarse sin explicar por qué.

`add_error` lo pone al lado del campo, que es donde la gente lo busca. Y hace una cosa más:

```salida
sigue b en cleaned_data?: False
```

**Saca el campo de `cleaned_data`.** Es coherente: un valor con error no es un valor limpio, y así el resto del método no lo usa por descuido.

La regla: **si el error se puede atribuir a un campo, `add_error` con ese campo.** El `raise` se reserva para lo que de verdad no es de ninguno, como "esta combinación de opciones no existe".

## Errores con código y parámetros

La forma completa de un error:

```python
raise ValidationError(
    'Hay que tener al menos %(min)s años (tienes %(tuyos)s).',
    code='menor',
    params={'min': 18, 'tuyos': valor},
)
```

```salida
{'edad': ['Hay que tener al menos 18 años (tienes 15).']}
as_json: {"edad": [{"message": "Hay que tener al menos 18 años ...", "code": "menor"}]}
```

Los `params` se interpolan con `%(nombre)s`, y no con una f-string. Hay un motivo: **así el mensaje se puede traducir** manteniendo los huecos, que es lo que permite que los errores de Django salgan en español.

El `code` es un identificador que no se enseña y sirve para dos cosas. Para sustituir el mensaje desde el `error_messages` del `Meta`, como se hizo en la lección 26 con `unique`. Y para que quien consuma la respuesta en JSON pueda distinguir errores sin leer el texto, que importa en el módulo 5.

Y para varios errores en el mismo campo, una lista:

```python
raise ValidationError([
    ValidationError('Muy corta.', code='corta'),
    ValidationError('Tiene que llevar algún número.', code='sin_numero'),
])
```

```salida
{'clave': ['Muy corta.', 'Tiene que llevar algún número.']}
```

Eso es mejor que parar en el primero. Quien rellena el formulario ve todo lo que tiene que arreglar de una vez, en lugar de descubrirlo de uno en uno.

> [!consejo] Cómo elegir entre los tres
>
> | La regla... | Dónde va |
> | --- | --- |
> | Es de formato y se repite en varios sitios | Validador, y mejor en el campo del modelo |
> | Mira solo su campo, o normaliza el valor | `clean_campo` |
> | Necesita otro campo | `clean` con `add_error` |
> | Tiene que cumplirse siempre, pase lo que pase | `CheckConstraint`, lección 15 |
> | Es del dominio y no del formulario | `clean()` del modelo, lección 26 |
>
> Y el criterio que resuelve las dudas: **lo más abajo que se pueda**. Una regla en el modelo funciona desde cualquier formulario, desde el panel y desde una importación. La misma regla en el formulario solo funciona ahí, y el día que aparezca una API hay que volver a escribirla.
>
> El formulario es para los mensajes que se leen bien y para lo que de verdad depende de esta pantalla concreta.

> [!nota] El caso del español que vuelve
>
> Un `clean_campo` típico es comprobar que no haya otro registro con el mismo nombre. Escrito con `iexact`, funciona en desarrollo y falla con la primera tilde, por lo que se midió en la lección 12: en SQLite, ni `iexact` ni `icontains` entienden las letras acentuadas.
>
> O sea que `Ana López` y `Ana Lopez` pasan como distintas, aunque para cualquier persona sean la misma. La salida es la de aquella lección: guardar además una versión normalizada con `unicodedata.normalize('NFKD', texto.casefold())` y comparar contra ella.
>
> Es trabajo extra y en un curso en español no se puede saltar. Un buscador o un control de duplicados que no aguante las tildes está roto para la mitad de los nombres.

> [!resumen] En resumen
>
> Django valida campo por campo, y con cada uno convierte el valor, pasa sus validadores y llama a su `clean_campo`, y solo cuando ha terminado con todos llama una vez a `clean`; un campo que falla no ejecuta su `clean_campo` y no llega a `cleaned_data`, por lo que dentro de `clean` hay que sacar los valores con `.get()` y comprobar que están antes de compararlos. Los tres sitios donde poner reglas propias son los validadores, que solo ven su valor, no devuelven nada y se pueden poner en el campo del modelo para que valgan en todas partes; los métodos `clean_campo`, que tienen acceso a `self`, pueden consultar la base de datos y devuelven el valor, lo que los convierte en el sitio de las normalizaciones; y `clean`, el único que ve todos los campos. La trampa que más tiempo cuesta es olvidar el `return` de un `clean_campo`, porque el formulario sigue siendo válido y el valor pasa a ser `None` sin ningún aviso. Para señalar errores hay dos formas: un `raise` dentro de `clean` produce un error general que solo se ve si la plantilla pinta `non_field_errors`, y `add_error` lo coloca junto a un campo y además lo saca de `cleaned_data`; siempre que el error se pueda atribuir a un campo, va con `add_error`. Los mensajes se escriben con `params` interpolados y un `code`, que permite sustituirlos desde el `Meta` y distinguirlos en una respuesta JSON, y se puede lanzar una lista para que se vean todos los problemas de un campo a la vez. Y el criterio general es poner cada regla lo más abajo posible, porque lo que está en el modelo vale desde cualquier formulario y lo que está en el formulario solo vale ahí.

> [!ejercicio] Practica
>
> 1. Instrumenta un formulario con `print` en un validador, en dos `clean_campo` y en `clean`, y comprueba el orden en que se llaman.
> 2. Haz que falle un campo y mira qué métodos dejan de llamarse y qué contiene `cleaned_data` dentro de `clean`.
> 3. Escribe un `clean` que acceda con corchetes a un campo que ha fallado y provoca el `KeyError`. Arréglalo con `.get()`.
> 4. Escribe un `clean_telefono` que quite los espacios y los guiones, y comprueba que lo que se guarda es el valor limpio. Después quítale el `return` y mira qué se guarda.
> 5. Escribe la validación de dos contraseñas que tienen que coincidir, primero con `raise` y después con `add_error`. Compara dónde sale el mensaje en la página.
> 6. Lanza un error con `code` y `params` y mira el resultado de `errors.as_json()`.
> 7. Haz que un campo devuelva dos errores a la vez con una lista.
> 8. Escribe un validador de formato para el teléfono y ponlo en el campo del modelo. Comprueba que funciona desde el formulario sin tocar el formulario.
