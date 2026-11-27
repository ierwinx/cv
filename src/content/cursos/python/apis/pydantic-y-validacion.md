---
titulo: "Pydantic y validación"
resumen: "Lo que convierte en silencio, la palabra `yes` que vale y `sí` que no, y la línea que arregla el fallo de la lección 13."
minutos: 16
orden: 25
---

Pydantic es lo que hace funcionar a FastAPI, y se puede usar solo: para leer ficheros de configuración, validar mensajes de una cola o dar forma a la respuesta de otra API, que es el bloque A.

Lo que hay que entender de él es **qué convierte sin preguntar**, porque es generoso y hay conversiones que sorprenden.

> [!objetivo] Qué vas a aprender
>
> Saber qué acepta pydantic y qué rechaza, elegir entre el modo laxo y el estricto, escribir validadores sabiendo en qué orden corren, y usar la opción que resuelve en una línea el fallo silencioso de la lección 13.

## Lo que convierte

Medido, con el comportamiento de fábrica:

```salida
n='42'          -> 42
n='42.0'        -> 42
n=42.0          -> 42
n=42.7          -> ERROR: Input should be a valid integer, got a number
n=True          -> 1

b='true'        -> True
b='1'           -> True
b=1             -> True
b='yes'         -> True
b='si'          -> ERROR: Input should be a valid boolean

d='2026-01-15'  -> date(2026, 1, 15)
d=1768435200    -> date(2026, 1, 15)
d='15/01/2026'  -> ERROR: Input should be a valid date or datetime

dec='19.98'     -> Decimal('19.98')
dec=19.98       -> Decimal('19.98')
```

Cuatro cosas de ahí merecen comentario.

**`42.7` da error y `42.0` no.** Es la decisión correcta: convertir cuando no se pierde nada y protestar cuando sí. Es lo contrario de lo que hace `int()` de Python, que trunca en silencio.

**`True` se convierte en `1`.** Esta sí es una conversión discutible, y es la que hay que vigilar: si tu campo es un entero y alguien manda `true`, recibes un uno sin enterarte.

**Un número entero se convierte en fecha**, interpretándolo como marca de tiempo Unix. Cómodo y significa que un identificador mandado por error en un campo de fecha produce una fecha plausible en lugar de un error.

**Y el decimal conserva lo que se ve**, incluso viniendo de una coma flotante, porque pydantic convierte pasando por texto. Es la buena noticia de la lección 3: `19.98` no se convierte en `19.979999999999997`. Aun así, el dinero se manda como texto, porque lo que llegue ya vendrá roto si el cliente lo mandó como número.

> [!aviso] `yes` vale y `sí` no
>
> ```salida
> b='yes'  -> True
> b='si'   -> ERROR: Input should be a valid boolean
> ```
>
> Las palabras que pydantic reconoce como booleanos son de un solo idioma: `true`, `false`, `yes`, `no`, `on`, `off`, `1`, `0`. En español, nada.
>
> Esto importa cuando los valores vienen de un formulario, de un fichero de configuración o de un sistema antiguo con `S`/`N`, que es lo más común de lo que parece en proyectos de aquí. Y el error que produce es claro, al menos.
>
> Se arregla con un validador previo:
>
> ```python
> from typing import Annotated
>
> from pydantic import BeforeValidator
>
> SIES = {'sí', 'si', 's', 'verdadero', 'v'}
> NOES = {'no', 'n', 'falso', 'f'}
>
>
> def booleano_es(valor):
>         if isinstance(valor, str) and valor.strip().lower() in SIES | NOES:
>                 return valor.strip().lower() in SIES
>     return valor
>
>
> BooleanoES = Annotated[bool, BeforeValidator(booleano_es)]
>
>
> class Config(BaseModel):
>         activo: BooleanoES
> ```
>
> Fíjate en el patrón: **un tipo anotado que se reutiliza**. Es la forma idiomática de pydantic 2 de encapsular una regla, y sirve para cualquier cosa que se repita en tu dominio: un NIF, un IBAN, un código postal.

## Laxo o estricto

Lo de arriba es el modo laxo, que es el de fábrica. El otro no convierte nada:

```python
from pydantic import ConfigDict


class Estricta(BaseModel):
        model_config = ConfigDict(strict=True)
    n: int
    b: bool
```

```salida
n='42'    -> ERROR: Input should be a valid integer
n=42      -> ok
b='true'  -> ERROR: Input should be a valid boolean
b=True    -> ok
```

Cuál usar depende de por dónde entran los datos:

**Con JSON, el laxo tiene sentido**, porque JSON no distingue enteros de decimales igual que Python y muchos clientes mandan números como texto. Rechazar `"42"` en un campo entero produce discusiones que no llevan a nada.

**Con datos internos, el estricto.** Mensajes entre tus propios servicios, ficheros de configuración, lo que sale de tu base de datos: ahí una conversión inesperada esconde un error real.

Y se puede pedir por campo, que suele ser la respuesta correcta:

```python
class Pedido(BaseModel):
        cantidad: int
    es_regalo: Annotated[bool, Field(strict=True)]
```

Así el número aguanta lo que llegue y el booleano no acepta el `1` que en realidad era otra cosa.

> [!aviso] La línea que arregla el fallo de la lección 13
>
> Este es el hallazgo práctico de la lección. De fábrica, pydantic hace lo mismo que DRF:
>
> ```salida
> Modelo(nombre='Ana', admin=True, sueldo=99)
> -> {'nombre': 'Ana'}        (admin y sueldo, descartados en silencio)
> ```
>
> Es el comportamiento de la lección 13: protege contra la asignación masiva y esconde las erratas. Y aquí se cambia con una línea:
>
> ```python
> class Estricto(BaseModel):
>         model_config = ConfigDict(extra='forbid')
>     nombre: str
> ```
>
> ```salida
> Estricto(nombre='Ana', admin=True, sueldo=99)
> -> ERROR: Extra inputs are not permitted ('admin',)
>           Extra inputs are not permitted ('sueldo',)
> ```
>
> **Eso es el `PATCH` con errata detectado**, que en DRF costaba escribir un validador a mano. Una línea, y los dos errores con el nombre del campo sobrante dentro.
>
> Las tres opciones son `'ignore'` —la de fábrica—, `'forbid'` y `'allow'`, que guarda los campos de más en el objeto. La tercera casi nunca es lo que quieres.
>
> Y la decisión es la misma que en la lección 13, con el mismo matiz: **prohibirlos en los modelos de entrada es casi siempre correcto**, porque quien manda un campo que no existe se ha equivocado y agradecerá saberlo. El riesgo es romper a clientes antiguos que mandan un campo que retiraste, así que al quitar un campo conviene dejarlo declarado y marcado como obsoleto un tiempo, en vez de borrarlo.

## Los validadores

Tres niveles, como en DRF, y aquí con un matiz de más:

```python
from pydantic import field_validator, model_validator


class Reserva(BaseModel):
        titulo: str = Field(max_length=10)
    desde: date
    hasta: date

    @field_validator('titulo', mode='before')
    @classmethod
    def quitar_espacios(cls, valor):
                return valor.strip() if isinstance(valor, str) else valor

    @field_validator('titulo')
    @classmethod
    def sin_articulo(cls, valor):
                if valor.lower().startswith('el '):
                        raise ValueError('No empieces por artículo.')
        return valor.title()

    @model_validator(mode='after')
    def fechas_coherentes(self):
                if self.desde > self.hasta:
                        raise ValueError('«hasta» debe ser posterior a «desde».')
        return self
```

El orden, medido:

```salida
entrada '  holaaa  ':  ['before', 'after', 'model']  ->  'Holaaa'
```

**El previo corre antes de convertir el tipo** y el otro después, y esa es la diferencia que no existe en DRF. Sirve para casos concretos:

```python
@field_validator('etiquetas', mode='before')
@classmethod
def admitir_texto(cls, valor):
        """Acepta "a,b,c" además de ["a", "b", "c"]."""
    if isinstance(valor, str):
                return [x.strip() for x in valor.split(',')]
    return valor
```

Eso no se puede hacer después, porque para entonces el texto ya habría fallado al no ser una lista.

Y la regla de la lección 13 se mantiene igual:

```salida
con el título demasiado largo:  ['before']
  errores: [(('titulo',), 'String should have at most 10 characters')]
  -> el validador del modelo NI SE EJECUTA

con el título correcto:  ['before', 'after', 'model']
  errores: [((), 'Value error, «hasta» debe ser posterior a «desde».')]
```

> [!aviso] El error del modelo no dice de qué campo es
>
> Fíjate en la última línea de arriba:
>
> ```salida
> errores: [((), 'Value error, «hasta» debe ser posterior a «desde».')]
> ```
>
> **La ubicación está vacía.** Es el equivalente de los errores sin campo de la lección 13: una interfaz que reciba eso sabe que algo está mal y no junto a qué casilla enseñarlo.
>
> La solución es lanzar el error desde el campo, no desde el modelo, cuando se pueda:
>
> ```python
> @model_validator(mode='after')
> def fechas_coherentes(self):
>         if self.desde > self.hasta:
>                 raise PydanticCustomError(
>             'fechas', '«hasta» debe ser posterior a «desde».')
>     return self
> ```
>
> O, más simple y a menudo mejor, reordenar la regla para que sea de un solo campo usando la información que ya se validó. Y si de verdad es del conjunto, al menos documentarlo, porque entonces quien consuma la API tiene que saber que hay errores sin campo.
>
> Es el mismo detalle que en DRF y con la misma consecuencia: dos caracteres de diferencia que cambian mucho la experiencia de quien usa la API.

> [!nota] Los tres modelos por recurso, otra vez
>
> La lección 14 recomendaba tres serializadores por recurso. En pydantic sale igual y la herencia lo hace más limpio:
>
> ```python
> class LibroBase(BaseModel):
>         """Lo común."""
>     model_config = ConfigDict(extra='forbid')
>
>     titulo: str = Field(max_length=200)
>     precio: Decimal = Field(max_digits=7, decimal_places=2)
>
>
> class LibroCrear(LibroBase):
>         """Lo que se acepta al crear."""
>     isbn: str = Field(max_length=17)
>
>
> class LibroActualizar(BaseModel):
>         """Todo opcional, para PATCH."""
>     model_config = ConfigDict(extra='forbid')
>
>     titulo: str | None = None
>     precio: Decimal | None = None
>
>
> class LibroPublico(LibroBase):
>         """Lo que sale. Nunca acepta entrada."""
>     id: int
>     creado: datetime
> ```
>
> Cuatro cosas que esto consigue:
>
> **El de actualizar tiene todo opcional**, que es el modo parcial de la lección 13, y aquí se declara en vez de activarse con una bandera. La ventaja es que **las reglas de obligatoriedad no desaparecen todas de golpe**, que era el aviso de aquella lección: aquí eliges campo por campo.
>
> **El público tiene campos que los otros no**, y como es el que va en la anotación de retorno, recorta la salida.
>
> **El de entrada prohíbe los campos de más** y el de salida no necesita hacerlo.
>
> **Y para leer de un ORM**, una línea más:
>
> ```python
> class LibroPublico(LibroBase):
>         model_config = ConfigDict(from_attributes=True)
> ```
>
> Con eso, `LibroPublico.model_validate(objeto_de_sqlalchemy)` funciona leyendo atributos en vez de claves. Es la lección siguiente.

> [!consejo] Dónde más se usa pydantic
>
> No solo en las peticiones. Dos sitios donde rinde mucho y casi nadie lo pone.
>
> **La configuración**, que es la lección 40 del módulo 4 con validación:
>
> ```python
> from pydantic_settings import BaseSettings
>
>
> class Ajustes(BaseSettings):
>         url_base_de_datos: str
>     clave_secreta: str = Field(min_length=32)
>     depurar: bool = False
>     maximo_por_pagina: int = Field(default=50, le=500)
>
>     model_config = ConfigDict(env_file='.env')
>
>
> ajustes = Ajustes()
> ```
>
> Si falta una variable de entorno o la clave es corta, **la aplicación no arranca** y dice exactamente qué falta. Es infinitamente mejor que descubrirlo en la primera petición, y resuelve el problema clásico de desplegar con una variable sin definir.
>
> **Y las respuestas de otras APIs**, que es el bloque A. En lugar de `datos['items'][0]['nombre']` con sus sorpresas, un modelo:
>
> ```python
> class RepoGitHub(BaseModel):
>         full_name: str
>     stargazers_count: int
>     pushed_at: datetime
>
>
> repo = RepoGitHub.model_validate(respuesta.json())
> ```
>
> Así, el día que la API ajena cambie un campo, te enteras **en el momento de leer la respuesta** y con un mensaje claro, en vez de con un `KeyError` tres funciones más adelante o, peor, con un `None` que se propaga. Es lo que la lección 10 hacía a mano con dataclasses, con validación incluida.

> [!resumen] En resumen
>
> Pydantic convierte con generosidad y conviene saber qué acepta: un texto numérico pasa a entero, un decimal exacto también, uno con decimales sueltos da error —a diferencia de `int()`, que trunca—, un booleano se convierte en uno sin avisar, y un entero se interpreta como marca de tiempo en un campo de fecha. Los decimales conservan lo que se ve porque la conversión pasa por texto. Las palabras booleanas que reconoce son solo inglesas, de modo que `yes` vale y `sí` no, cosa que importa con formularios y sistemas antiguos de aquí y se arregla con un tipo anotado reutilizable. El modo estricto no convierte nada y tiene sentido para datos internos, mientras que el laxo encaja con JSON; se puede pedir por campo. El hallazgo práctico es que **una línea de configuración prohíbe los campos desconocidos**, que es exactamente el `PATCH` con errata de la lección 13 detectado sin escribir un validador, con el nombre del campo sobrante en el error. Los validadores son tres, con un nivel más que DRF: el previo corre antes de convertir el tipo, lo que permite aceptar formas alternativas de un dato, y el posterior después; el del modelo no se ejecuta si falló cualquier campo, y su error **llega sin ubicación**, así que una interfaz no sabe junto a qué casilla enseñarlo. Conviene un modelo por operación, donde el de actualizar declara los campos opcionales uno a uno en lugar de desactivar todas las obligatoriedades de golpe. Y pydantic rinde fuera de las peticiones: validando la configuración, de modo que la aplicación no arranca si falta una variable, y validando las respuestas de otras APIs, que es el bloque A con avisos en el momento correcto.

> [!ejercicio] Practica
>
> 1. Comprueba qué hace pydantic con un texto numérico, un decimal exacto y uno con resto.
> 2. Manda un booleano a un campo entero y mira el resultado.
> 3. Manda un número entero a un campo de fecha.
> 4. Prueba las palabras booleanas en inglés y en español.
> 5. Escribe el tipo anotado que acepta las españolas.
> 6. Activa el modo estricto y repite las cuatro primeras pruebas.
> 7. Pide el modo estricto en un solo campo.
> 8. Manda campos que no existen y comprueba que desaparecen.
> 9. Prohíbelos con una línea y vuelve a probar.
> 10. Escribe los tres tipos de validador y anota en qué orden corren.
> 11. Usa el previo para aceptar una lista escrita como texto separado por comas.
> 12. Provoca un error del modelo y mira que llega sin ubicación.
> 13. Escribe los cuatro modelos de un recurso con herencia.
> 14. Valida la configuración de tu aplicación y quita una variable de entorno a propósito.
> 15. Valida con un modelo la respuesta de una API pública del bloque A.
