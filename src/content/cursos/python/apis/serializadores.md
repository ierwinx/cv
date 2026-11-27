---
titulo: "Serializadores"
resumen: "La pieza central de DRF, los tres sitios donde validar, y el `PATCH` con una errata que contesta 200 sin cambiar nada."
minutos: 16
orden: 13
---

El serializador es la pieza central de DRF y hace dos trabajos que conviene no confundir:

```salida
objetos de Python  ->  JSON      (serializar, salida)
JSON  ->  datos validados         (deserializar, entrada)
```

La primera dirección es fácil. **La segunda es donde está todo**, porque los datos vienen de fuera y no te puedes fiar de ellos. Un serializador es, sobre todo, un validador.

Si te recuerda a los formularios del módulo 4, es que la semejanza es deliberada: misma idea, `is_valid()`, `validated_data`, `errors` y validación en tres niveles. Lo que cambia es que aquí no hay HTML y los datos llegan como JSON.

> [!objetivo] Qué vas a aprender
>
> Escribir serializadores a mano, entender la asimetría entre leer y escribir, validar en los tres niveles sabiendo en qué orden corren, y reconocer los fallos silenciosos, en particular el más caro del bloque.

## Uno a mano

Empezamos sin modelo, que es como mejor se ve lo que hace:

```python
from rest_framework import serializers


class ContactoSerializer(serializers.Serializer):
        nombre = serializers.CharField(max_length=100)
    correo = serializers.EmailField()
    edad = serializers.IntegerField(min_value=0, max_value=130, required=False)
    activo = serializers.BooleanField(default=True)
```

Se usa dándole datos y preguntándole:

```salida
data={'nombre': 'Óscar', 'correo': 'o@t.es', 'edad': 40}

is_valid():      True
validated_data:  {'nombre': 'Óscar', 'correo': 'o@t.es', 'edad': 40, 'activo': True}
```

Fíjate en que `activo` aparece con su valor por defecto aunque no se enviara. Y con datos malos:

```salida
data={'nombre': '', 'correo': 'no-es-correo', 'edad': 200}

is_valid():  False
errors:
{
  "nombre": ["Este campo no puede estar en blanco."],
  "correo": ["Introduzca una dirección de correo electrónico válida."],
  "edad":   ["Asegúrese de que este valor es menor o igual a 130."]
}
```

**Los tres errores a la vez**, y en español. Que sean los tres importa: una API que solo informa del primer fallo obliga a quien la usa a corregir de uno en uno.

## Leer y escribir no son simétricos

Casi nunca quieres los mismos campos en las dos direcciones, y esta es la asimetría que hay que manejar:

```python
class LibroSerializer(serializers.Serializer):
        id = serializers.IntegerField(read_only=True)
    titulo = serializers.CharField(max_length=200)
    precio = serializers.DecimalField(max_digits=7, decimal_places=2)
    creado = serializers.DateTimeField(read_only=True)
    clave_interna = serializers.CharField(write_only=True)
```

| Opción | Sale en la respuesta | Se acepta al enviar |
| --- | --- | --- |
| normal | Sí | Sí |
| `read_only=True` | Sí | **No** |
| `write_only=True` | **No** | Sí |

**`read_only`** es para lo que genera el servidor: identificadores, fechas automáticas, campos calculados. Si no lo pones, un cliente puede mandar `"creado": "1999-01-01"` y salirse con la suya.

**`write_only`** es para lo que entra y no debe salir: contraseñas, tokens, datos que se usan para calcular algo. Es la protección contra publicar por accidente lo que acabas de recibir.

> [!aviso] Lo que no declaras desaparece en silencio
>
> Esto es lo primero que sorprende, y es a la vez una protección y una trampa.
>
> ```salida
> enviado:   {'nombre': 'Ana', 'edad': 30, 'sueldo': 50000, 'admin': True}
> validado:  {'nombre': 'Ana', 'edad': 30}
> errors:    {}
> ```
>
> `sueldo` y `admin` **no están declarados en el serializador, así que se tiran**. Sin error, sin aviso.
>
> Como protección es excelente y tiene nombre: evita la asignación masiva, que es el ataque de mandar `"admin": true` en el formulario de registro. DRF es inmune por diseño, y por eso no hay que quejarse de este comportamiento.
>
> Como trampa es cara, y este es el caso:
>
> ```salida
> titulo antes:   El libro número 1
> PATCH {"titutlo": "NUEVO"}  ->  200 OK
> titulo después: El libro número 1
> ```
>
> **Una errata en el nombre del campo, y la API contesta `200` sin cambiar nada.** El cliente recibe éxito, cree que guardó, y no guardó. Es el fallo más caro del bloque, porque el error aparece mucho después, cuando alguien nota que los datos no están.
>
> Tres defensas, de menos a más:
>
> **Mirar la respuesta.** Un `200` de DRF devuelve el objeto **como quedó**, así que comparar lo que pediste con lo que volvió lo detecta. Es lo que debería hacer el cliente y casi nunca hace.
>
> **Rechazar los campos desconocidos.** No viene de serie; se escribe:
>
> ```python
> def validate(self, datos):
>         desconocidos = set(self.initial_data) - set(self.fields)
>     if desconocidos:
>                 raise serializers.ValidationError(
>             f'Campos que no existen: {", ".join(sorted(desconocidos))}'
>         )
>     return datos
> ```
>
> Muy útil mientras se desarrolla contra la API y discutible en producción, porque un cliente antiguo que manda un campo que ya quitaste dejaría de funcionar. La solución intermedia, que es la buena: **dejarlo pasar y registrarlo**, para enterarte de que alguien manda algo que ignoras.
>
> **Documentarlo.** Es la lección 21, y no ayuda con las erratas.

## Los tres sitios donde validar

Igual que en los formularios de Django, hay tres niveles y **el orden importa**:

```python
class RangoSerializer(serializers.Serializer):
        desde = serializers.DateField()
    hasta = serializers.DateField()
    titulo = serializers.CharField(max_length=10)

    def validate_titulo(self, valor):
                if valor.lower().startswith('el '):
                        raise serializers.ValidationError('No empieces por artículo.')
        return valor.title()

    def validate(self, datos):
                if datos['desde'] > datos['hasta']:
                        raise serializers.ValidationError({'hasta': 'Debe ser posterior a desde.'})
        return datos
```

**Nivel 1: el campo.** `max_length`, `min_value`, `EmailField` y los validadores que le pases. Automáticos.

**Nivel 2: `validate_<campo>`.** Para reglas de un solo campo que el tipo no cubre. Recibe el valor y **devuelve el valor**, así que sirve también para normalizar:

```salida
'holaaa'  ->  validate_titulo  ->  'Holaaa'
```

Olvidar el `return` es el error clásico: el campo se queda en `None` y no se entera nadie.

**Nivel 3: `validate`.** Para reglas que involucran a varios campos, como que una fecha sea posterior a otra.

Y el detalle que hay que interiorizar:

```salida
con el título demasiado largo:
  [1] falla el nivel de campo
  errors: {"titulo": ["Asegúrese de que este campo no tenga más de 10 caracteres."]}
  -> validate() NI SE LLAMA

con el título correcto:
  [2] validate_titulo
  [3] validate
  errors: {"hasta": ["Debe ser posterior a desde."]}
```

**Si falla cualquier campo, `validate` no se ejecuta.** Es lógico —no tendría los datos— y tiene una consecuencia práctica: dentro de `validate` puedes dar por hecho que los campos que llegaron son válidos, pero **no que estén todos**, porque los opcionales pueden faltar. Por eso dentro de `validate` se usa `datos.get('campo')` y no `datos['campo']`.

Fíjate también en que `validate` lanza el error **con el nombre del campo dentro**:

```python
raise serializers.ValidationError({'hasta': 'Debe ser posterior a desde.'})
```

Sin el diccionario, el mensaje va a parar a `non_field_errors`, donde la interfaz que consume la API no sabrá junto a qué casilla enseñarlo. Es un detalle de dos caracteres que cambia mucho la experiencia de quien la usa.

## Crear y actualizar

Un serializador a mano no sabe guardar nada. Si quieres que `save()` funcione, hay que decirle cómo:

```python
class ContactoSerializer(serializers.Serializer):
    # ... campos ...

        def create(self, validated_data):
                return Contacto.objects.create(**validated_data)

    def update(self, instancia, validated_data):
                for campo, valor in validated_data.items():
                        setattr(instancia, campo, valor)
        instancia.save()
        return instancia
```

`save()` llama a uno o a otro según le hayas pasado una instancia:

```python
ContactoSerializer(data=datos).save()                 # -> create
ContactoSerializer(contacto, data=datos).save()       # -> update
ContactoSerializer(contacto, data=datos, partial=True).save()   # -> update parcial
```

En la práctica escribirás muy pocos de estos, porque `ModelSerializer` los genera, y es la lección siguiente. Conviene verlos una vez para saber qué está generando.

> [!aviso] Dos trampas de `save()` y `partial`
>
> **`partial=True` hace opcional todo, no solo lo que mandas.**
>
> ```salida
> S(data={'edad': 31}, partial=True)
> is_valid(): True   (aunque 'nombre' sea obligatorio)
> ```
>
> Es lo que hace que `PATCH` funcione, y significa que **las validaciones de obligatoriedad desaparecen enteras**. Si tu regla es "no puede haber un libro sin editorial", con `partial` no se comprueba, porque el campo simplemente no está. Las reglas que deben cumplirse siempre van en el modelo o en una restricción de base de datos, que es lo de la lección 13 del módulo 4.
>
> **`.data` antes de `is_valid()` no funciona:**
>
> ```salida
> AssertionError: When a serializer is passed a `data` keyword argument
> you must call `.is_valid()` before attempting to access the serialized data
> ```
>
> Es una asertividad a propósito, para que nadie devuelva datos sin validar. Y como es un `AssertionError`, **desaparece si alguien ejecuta Python con optimizaciones**, así que no es una defensa: es un recordatorio.
>
> Y ojo con los tres nombres, que se confunden:
>
> |  | Qué es |
> | --- | --- |
> | `initial_data` | Lo que llegó, crudo |
> | `validated_data` | Lo que pasó la validación, ya convertido |
> | `data` | Lo que se va a devolver, serializado |

> [!nota] Cuándo un serializador a mano es la respuesta correcta
>
> Casi todo el mundo usa `ModelSerializer` para todo, y hay tres casos donde el de a mano es mejor.
>
> **Cuando no hay modelo.** Los parámetros de una búsqueda, el cuerpo de una acción, una petición a otro servicio. Validar eso con un serializador da mensajes de error coherentes con el resto de la API gratis.
>
> **Cuando la respuesta se compone de varias fuentes.** Un panel que junta datos de tres modelos y de una API externa no tiene un modelo detrás, y forzarlo es peor que declarar los campos.
>
> **Cuando la entrada no se parece a la salida.** Un punto de acceso que recibe un fichero y devuelve un resumen; uno que recibe credenciales y devuelve un token. Ahí `ModelSerializer` estorba.
>
> La señal de que deberías haberlo usado: un `ModelSerializer` con seis `SerializerMethodField`, tres campos declarados a mano y un `Meta.fields` que no se parece a las columnas. Eso ya no es un serializador de modelo, es uno a mano con una herencia incómoda.

> [!resumen] En resumen
>
> Un serializador hace dos trabajos: convertir objetos a JSON, que es fácil, y convertir JSON en datos validados, que es donde está todo, porque los datos vienen de fuera. Devuelve **todos** los errores a la vez y en español. Leer y escribir no son simétricos, y de ahí las dos opciones que hay que usar sin falta: la de solo lectura para lo que genera el servidor, sin la cual un cliente puede falsificar una fecha de creación, y la de solo escritura para lo que entra y no debe salir. Lo que no declaras **desaparece en silencio**, que como protección es excelente porque hace la API inmune a la asignación masiva, y como trampa es el fallo más caro del bloque: un `PATCH` con una errata en el nombre del campo contesta `200` sin cambiar nada, y el cliente cree que guardó. Hay tres niveles de validación y el orden importa: los validadores de campo, después uno por campo que además sirve para normalizar y donde olvidar el `return` deja el valor en nulo, y por último el del conjunto, que **no se ejecuta si falló cualquier campo** y al que hay que pasarle el nombre del campo dentro del error para que la interfaz sepa dónde enseñarlo. El modo parcial que hace funcionar a `PATCH` desactiva **todas** las comprobaciones de obligatoriedad, así que las reglas que deben cumplirse siempre van en el modelo o en la base de datos. Y conviene no confundir los datos crudos, los validados y los de salida.

> [!ejercicio] Practica
>
> 1. Escribe un serializador a mano con cuatro campos y valida datos buenos y malos.
> 2. Comprueba que devuelve todos los errores a la vez.
> 3. Marca un campo como de solo lectura e intenta enviarlo.
> 4. Marca otro como de solo escritura y comprueba que no sale en la respuesta.
> 5. Manda un campo que no existe y observa que desaparece sin aviso.
> 6. Provoca el `PATCH` con la errata y comprueba que contesta 200 sin cambiar nada.
> 7. Escribe la validación que rechaza los campos desconocidos.
> 8. Escribe un validador de campo que normalice el valor, y olvida el `return` a propósito.
> 9. Escribe uno de conjunto y comprueba que no se llama cuando falla un campo.
> 10. Lanza un error de conjunto con y sin el nombre del campo, y compara la respuesta.
> 11. Usa el modo parcial y comprueba que un campo obligatorio deja de serlo.
> 12. Intenta acceder a los datos de salida antes de validar.
