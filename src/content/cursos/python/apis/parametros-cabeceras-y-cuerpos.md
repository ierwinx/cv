---
titulo: "Parámetros, cabeceras y cuerpos"
resumen: "El filtro que desaparece sin dejar rastro, el booleano que llega con mayúscula, y los cuatro cuerpos que se pueden mandar."
minutos: 14
orden: 6
---

Ya sabes hacer peticiones. Esta lección va de las tres cosas que se ponen **dentro** de ellas, y de los detalles que hacen que una petición aparentemente correcta no haga lo que crees.

Casi todos los fallos de esta lección tienen la misma forma: **no dan error**. La petición sale, el servidor contesta `200`, y los datos son los que no son.

> [!objetivo] Qué vas a aprender
>
> Saber cómo se codifican los parámetros y cuáles desaparecen, manejar cabeceras sabiendo cómo se combinan las de la sesión con las de la petición, y elegir entre los cuatro tipos de cuerpo según lo que espere la API.

## Los parámetros de la consulta

`requests` los codifica bien, y conviene ver exactamente qué hace con cada tipo:

```salida
{'q': 'a & b'}          ->  ?q=a+%26+b
{'q': 'Óscar Ñuño'}     ->  ?q=%C3%93scar+%C3%91u%C3%B1o
{'q': 'c++'}            ->  ?q=c%2B%2B
{'ruta': 'a/b'}         ->  ?ruta=a%2Fb
{'id': [1, 2, 3]}       ->  ?id=1&id=2&id=3
{'a': ''}               ->  ?a=
{'a': 1, 'b': None}     ->  ?a=1
{'activo': True}        ->  ?activo=True
```

Las cuatro primeras son lo esperado y están bien: espacios, ampersands, acentos, barras y signos de suma, todos escapados.

Las cuatro últimas son las que hay que mirar dos veces.

**Una lista repite la clave.** Es la convención más común, y **no es la única**: algunas APIs quieren `?id=1,2,3`. Si los filtros múltiples no funcionan, es lo primero que hay que comprobar, porque los dos formatos devuelven `200`.

**Un `None` desaparece.** Y esta es la trampa de la lección:

```python
parametros = {'estado': estado, 'autor': autor, 'desde': desde}
respuesta = sesion.get(url, params=parametros)
```

Si `autor` vale `None`, ese filtro **no se manda**, y la API devuelve todo en lugar de nada. Con `200`, sin aviso, y con muchos más resultados de los que esperabas.

El comportamiento en sí es bueno, porque es justo lo que quieres al construir filtros opcionales. Lo malo es cuando el `None` es un error tuyo y lo confundes con "sin filtro". Si un parámetro es obligatorio, compruébalo tú:

```python
if autor is None:
        raise ValueError('Hace falta el autor')
```

**Y ojo con la diferencia entre `None` y cadena vacía**, que son cosas distintas: `None` quita el parámetro, `''` lo manda vacío, y para muchas APIs "vacío" significa "los que no tienen valor". No son intercambiables.

> [!aviso] El booleano llega con mayúscula
>
> ```salida
> params={'a': True, 'b': 'true', 'c': 1}
> el servidor recibe: {'a': 'True', 'b': 'true', 'c': '1'}
> ```
>
> `requests` convierte con `str()`, así que `True` se convierte en **`'True'` con mayúscula**, que es la forma de Python y no la de JSON ni la de casi ninguna API.
>
> Qué pasa entonces depende de la API, y ninguna de las dos opciones es buena: algunas lo rechazan con un `400`, y otras —peores— no lo reconocen y **usan el valor por defecto en silencio**. Pides los artículos publicados, recibes todos, y no hay nada que lo delate.
>
> La costumbre segura es no mandar nunca un booleano pelado:
>
> ```python
> params = {'activo': 'true' if activo else 'false'}   # o 1 y 0
> ```
>
> Cuál de los dos, lo dice la documentación. Y si no lo dice, se prueba con los dos y se mira si cambia el número de resultados, que es la forma de comprobarlo.

## Las cabeceras

Se leen sin preocuparse de las mayúsculas, que es un detalle cómodo:

```salida
r.headers['ETAG']  ==  r.headers['etag']  ==  r.headers['Etag']
tipo: CaseInsensitiveDict
```

Y una cabecera que el servidor mandó dos veces llega junta:

```salida
X-Test: uno
X-Test: dos      ->   r.headers['X-Test']  ==  'uno, dos'
```

Eso es lo que dice HTTP que hay que hacer, y es lo correcto para casi todas. Es incorrecto para `Set-Cookie`, que se separa con comas por dentro, y por eso `requests` la trata aparte: para las cookies se usa `r.cookies`.

Las de la sesión y las de la petición **se combinan**:

```salida
la sesión pone:   X-Base: de-la-sesion, Accept: application/json
la petición pone: X-Extra: de-la-peticion, Accept: text/plain

lo que llega:     X-Base: de-la-sesion
                  X-Extra: de-la-peticion
                  Accept: text/plain        <- gana la de la petición
```

Las de la petición **se añaden** a las de la sesión, y cuando coinciden, ganan las de la petición. Que es lo que uno quiere.

Las que se ponen en la sesión son las que valen para todas: autenticación, agente, formato aceptado. Las de la petición son para lo puntual: una condición de `If-None-Match`, un formato distinto para una llamada concreta.

Y una que se olvida: para **borrar** una cabecera de la sesión en una petición no vale ponerla vacía, hay que ponerla a `None`:

```python
sesion.get(url, headers={'Authorization': None})    # la quita
sesion.get(url, headers={'Authorization': ''})      # la manda vacía, que no es lo mismo
```

## Los cuatro cuerpos

Esta es la parte donde más se equivoca la gente, porque los cuatro parecen intercambiables y no lo son. Medidos contra un servidor que hace eco:

```salida
json={'a': 1}                   ->  application/json                     {"a": 1}
data={'a': 1}                   ->  application/x-www-form-urlencoded    form: {'a': '1'}
data='{"a":1}' + cabecera       ->  application/json                     {"a": 1}
files={...}                     ->  multipart/form-data; boundary=...    files + form
```

**`json=`** es lo normal para una API. Convierte, codifica en UTF-8 y pone la cabecera.

**`data=` con un diccionario** manda un formulario clásico. Fíjate en que el `1` llega como `'1'`: en un formulario **todo es texto**, no hay tipos. Es lo que quieren las APIs antiguas y algunos puntos de autenticación, que suelen exigir precisamente este formato.

**`data=` con texto o bytes** manda el cuerpo tal cual, **sin poner ninguna cabecera**. Es lo que hace falta cuando necesitas controlar el byte exacto: para firmar la petición, para mandar un JSON con las claves en un orden concreto, o para un formato que no es JSON. Con este hay que acordarse de poner el `Content-Type` a mano.

**`files=`** manda varias partes, que es lo de las subidas de ficheros del módulo anterior. Se puede combinar con `data=` para mandar campos junto al fichero, y es lo que hay que hacer: los dos en la misma petición.

```python
sesion.post(url, files={'adjunto': ('informe.pdf', contenido, 'application/pdf')},
                 data={'titulo': 'Informe de septiembre'})
```

> [!aviso] `json=` no sabe de decimales ni de fechas
>
> Es la lección 3 asomando otra vez, y aquí duele más porque está escondida detrás de un parámetro cómodo:
>
> ```salida
> json={'v': Decimal('9.99')}   ->  TypeError: Object of type Decimal is not JSON serializable
> json={'v': date(2026, 9, 22)} ->  TypeError: Object of type date is not JSON serializable
> json={'v': {1, 2}}            ->  TypeError: Object of type set is not JSON serializable
> ```
>
> `json=` usa el módulo estándar por dentro, así que hereda sus límites. Y como el error salta al mandar y no al construir el diccionario, aparece lejos de donde está el problema.
>
> La solución es convertir antes de mandar, y hacerlo en un solo sitio:
>
> ```python
> def a_json(valor):
>         if isinstance(valor, decimal.Decimal):
>                 return str(valor)                    # texto, para no perder precisión
>     if hasattr(valor, 'isoformat'):
>                 return valor.isoformat()
>     raise TypeError(f'No sé convertir {type(valor).__name__}')
>
>
> sesion.post(url, data=json.dumps(datos, default=a_json),
>                  headers={'Content-Type': 'application/json'})
> ```
>
> Fíjate en que hay que pasar a `data=` con la cabecera a mano, porque `json=` no acepta un convertidor. Es de las pocas veces que la forma incómoda es la correcta.
>
> Y que el decimal salga como **texto** y no como número es a propósito: es la única forma de que no se convierta en `float` al otro lado y vuelva el 199,89999999999998.

> [!nota] Ver la petición antes de mandarla
>
> La herramienta que resuelve la mitad de estos problemas y casi nadie conoce: `requests` deja preparar una petición sin enviarla.
>
> ```python
> peticion = requests.Request('POST', url, json={'a': 1}, params={'b': None}).prepare()
>
> print(peticion.method, peticion.url)
> print(peticion.headers)
> print(peticion.body)
> ```
>
> Eso enseña **exactamente** lo que saldría por el cable: la dirección con los parámetros ya codificados, las cabeceras y el cuerpo. Es la forma de comprobar si ese `None` se fue, si el booleano lleva mayúscula, o si el cuerpo es el que crees.
>
> Y sobre una respuesta ya recibida, `r.request` trae la misma información de la petición que se envió, incluidas las cabeceras que puso la sesión. Es lo primero que hay que mirar cuando una API contesta algo raro.

> [!resumen] En resumen
>
> Los parámetros de la consulta se codifican solos, y hay cuatro casos que merecen mirarse dos veces: una lista repite la clave, que es la convención más común pero no la única; una cadena vacía se manda y un `None` **desaparece**, lo cual está bien para filtros opcionales y es un fallo silencioso cuando el valor era obligatorio; y un booleano se convierte con la función de texto de Python, así que llega como `True` con mayúscula, que muchas APIs no reconocen y sustituyen por su valor por defecto sin decir nada. Las cabeceras se leen sin distinguir mayúsculas, las repetidas llegan unidas por comas salvo las de cookies, y las de la petición se suman a las de la sesión ganando en caso de conflicto; para quitar una de la sesión hay que ponerla a nulo, no vacía. Hay cuatro formas de mandar un cuerpo: la de JSON, que es lo normal para una API; la de formulario con diccionario, donde todo llega como texto y que es lo que exigen los puntos de autenticación; la de cuerpo crudo, que no pone ninguna cabecera y es la que hace falta cuando el byte exacto importa; y la de varias partes para los ficheros, combinable con campos normales. La forma cómoda de JSON no sabe convertir decimales ni fechas, así que cuando los hay toca usar la forma cruda con un convertidor propio, mandando los decimales como texto para que no se conviertan en coma flotante al otro lado. Y se puede preparar una petición sin enviarla para ver exactamente lo que saldría.

> [!ejercicio] Practica
>
> 1. Construye una petición con un parámetro que lleve acentos y otro con un ampersand, y mira la dirección resultante sin enviarla.
> 2. Pasa una lista como parámetro y comprueba en qué formato sale.
> 3. Monta un diccionario de filtros donde uno valga nulo y comprueba que no aparece en la dirección.
> 4. Manda un booleano pelado contra un servidor de eco y mira con qué mayúscula llega.
> 5. Lee la misma cabecera de una respuesta con tres combinaciones de mayúsculas.
> 6. Pon una cabecera en la sesión y otra distinta con el mismo nombre en la petición, y mira cuál gana.
> 7. Quita una cabecera de la sesión para una sola petición.
> 8. Manda el mismo dato con las cuatro formas de cuerpo y compara los cuatro ecos.
> 9. Intenta mandar un decimal y una fecha por la forma cómoda, y después arréglalo con un convertidor.
> 10. Sobre una respuesta recibida, saca las cabeceras que se enviaron de verdad.
