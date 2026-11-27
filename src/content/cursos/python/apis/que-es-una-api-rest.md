---
titulo: "Qué es una API REST"
resumen: "La misma información en 315 KB o en 6,8 KB, y por qué la segunda forma es la que permite que dos programas se entiendan."
minutos: 14
orden: 1
---

El módulo anterior acabó con un proyecto desplegado que sirve páginas a personas. Este módulo va de lo otro: **programas que hablan con programas**.

No es un tema nuevo que aparece de la nada. Es la continuación natural, porque la aplicación del móvil, el panel de números, el sitio que enseña el tiempo y el guion que exporta datos cada noche necesitan lo mismo que un navegador —pedir información por HTTP— y sin embargo no quieren nada de lo que un navegador quiere.

> [!objetivo] Qué vas a aprender
>
> Entender qué es una API y qué significa que sea REST, ver medida la diferencia entre pedir una página y pedir datos, conocer los seis conceptos que aparecen en cualquier documentación, y saber leer la de una API que no has visto nunca.

## Los mismos datos, dos formas

Vamos a pedir lo mismo —la información del repositorio de Django— de las dos maneras:

```bash
curl https://github.com/django/django
curl https://api.github.com/repos/django/django
```

```salida
página web HTML : 315 020 bytes, 1,20 s, content-type: text/html; charset=utf-8
la API en JSON  :   6 790 bytes, 0,40 s, content-type: application/json; charset=utf-8
```

**Cuarenta y nueve veces más pequeña, y tres veces más rápida.** Y eso es lo de menos. Lo importante es lo que hay dentro.

La página HTML trae etiquetas, estilos, guiones, menús, botones y una barra de búsqueda: **cosas para que un humano lea y pulse**. El número de estrellas está ahí, en algún sitio, rodeado de todo eso.

Lo otro es esto:

```json
{
  "full_name": "django/django",
  "description": "The Web framework for perfectionists with deadlines.",
  "stargazers_count": 91159,
  "language": "Python",
  "open_issues_count": 509,
  "created_at": "2012-04-28T02:47:18Z"
}
```

Ochenta y seis claves, cada una con su nombre. **Cosas para que un programa las use.**

## Por qué esto importa

La diferencia se ve al intentar sacar un dato de cada uno:

```python
# del HTML
m = re.search(r'([\d,\.]+)\s*</span>\s*\n?\s*stars', html)
estrellas = m.group(1)

# del JSON
estrellas = datos['stargazers_count']
```

```salida
del HTML -> 91159
del JSON -> 91159
```

Los dos funcionan **hoy**. Y ahí está todo: el primero es una expresión regular que adivina dónde está el número mirando el HTML de alrededor, y se rompe el día que alguien de GitHub cambie una etiqueta, cosa que hará sin avisar porque no tiene ningún motivo para avisar.

Eso es sacar datos raspando páginas, y es lo que hay que hacer cuando no hay otra opción. Cuando hay una API, no la hay.

Una **API** es un acuerdo: "pide esta dirección y te devolveré estos datos con estos nombres". Lo que cambia respecto al HTML no es el formato, es **el compromiso**. El HTML es la decoración del momento; la API es una promesa que se mantiene, y si cambia, cambia avisando.

## Qué significa REST

Vas a ver ese nombre en todas partes, así que conviene desmontarlo, porque asusta más de lo que es.

REST es un estilo de diseño, no una tecnología. No se instala nada. Son unas cuantas ideas sobre cómo organizar una API, y en la práctica se reducen a tres:

**Todo es un recurso, y cada recurso tiene su dirección.**

```salida
/repos/django/django            un repositorio
/repos/django/django/issues     sus incidencias
/users/octocat                  un usuario
```

Fíjate en que son **sustantivos**, en plural, y que la dirección se lee como una ruta de carpetas. Lo que **no** es REST:

```salida
/obtenerRepositorio?nombre=django
/api?accion=listar_incidencias&repo=django
```

Eso son llamadas a funciones disfrazadas de direcciones.

**El verbo dice qué hacer.** Es el método HTTP de la lección 2 del módulo anterior, usado en serio:

| Método | Sobre `/articulos/` | Sobre `/articulos/42/` |
| --- | --- | --- |
| `GET` | Lista los artículos | Devuelve el 42 |
| `POST` | Crea uno nuevo | — |
| `PUT` | — | Reemplaza el 42 entero |
| `PATCH` | — | Cambia parte del 42 |
| `DELETE` | — | Borra el 42 |

Cinco métodos y dos direcciones dan la funcionalidad completa. Compáralo con lo que haría falta inventando nombres: `/crearArticulo`, `/borrarArticulo`, `/editarArticulo`… Una API REST no tiene que documentar cómo se borra algo, porque **ya lo sabes**.

**Cada petición va sola.** El servidor no recuerda la anterior. Nada de "primero elige el repositorio y luego pide las incidencias": en cada petición va todo lo que hace falta, incluido quién eres.

Eso tiene una consecuencia práctica grande, y es la razón de fondo de que REST ganara: **cualquier servidor puede atender cualquier petición**. Como no hay que recordar nada, se pueden poner veinte servidores detrás de un repartidor y da igual a cuál llegue cada una.

> [!nota] REST de verdad y REST de andar por casa
>
> Lo de arriba es lo que todo el mundo llama REST. El REST original, tal como lo definió Roy Fielding en el año 2000, pedía además que las respuestas trajeran los enlaces a lo que se puede hacer a continuación, como hace una página web con sus enlaces.
>
> Casi nadie lo hace. Lo que se llama REST en el 99 % de los casos es lo de los recursos y los verbos, y cuando alguien quiere ser preciso dice que eso es "REST de nivel 2".
>
> No merece la pena discutirlo, y menos en una entrevista. Lo que sí merece la pena saber es que **hay más formas de hacer una API**, y que REST no siempre es la mejor:
>
> **GraphQL**, donde el cliente pide exactamente los campos que quiere en una sola consulta. Resuelve dos problemas reales de REST: traer 86 claves cuando querías una, y tener que hacer cuatro peticiones para pintar una pantalla. A cambio, es bastante más complicado de servir y de cachear.
>
> **gRPC**, binario y rápido, para que los servicios de una empresa hablen entre ellos. No se usa desde un navegador.
>
> **WebSockets**, cuando el servidor tiene que hablar sin que le pregunten: chats, avisos, cotizaciones.
>
> REST sigue siendo lo primero que hay que aprender y lo correcto por defecto, porque es lo que hay en todas partes, funciona con las herramientas de siempre y no necesita nada especial en el cliente.

## Lo que trae una respuesta

Las cabeceras de una API dicen tanto como el cuerpo, y hay seis que salen siempre. Estas son las de la petición de antes, de verdad:

```salida
HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: public, max-age=60, s-maxage=60
etag: W/"ac4a34316d87c024abcff5fd27bc3e583d6fc1e7f283273aab11931a14af133e"
x-ratelimit-limit: 60
x-ratelimit-remaining: 58
x-ratelimit-reset: 1790105663
x-github-api-version-selected: 2022-11-28
```

**`content-type`** dice que el cuerpo es JSON. Es lo que hace que tu programa sepa cómo leerlo sin adivinar.

**`cache-control`** dice que la respuesta vale sesenta segundos. Pedirla otra vez dentro de ese minuto es desperdiciar una petición.

**`etag`** es una huella del contenido. En la siguiente petición puedes mandarla de vuelta y, si nada ha cambiado, el servidor responde `304` sin cuerpo. Es gratis y casi nadie lo usa.

**Las tres de `ratelimit`** son la parte que más sorprende a quien empieza: **sesenta peticiones por hora** sin identificarse, y quedan cincuenta y ocho. Al llegar a cero, `403` hasta la hora indicada. Toda API seria tiene un límite, y saltárselo sin querer es el primer problema real que te vas a encontrar. Es la lección 9.

**La de versión** dice contra qué versión de la API estás hablando. Es lo que permite que GitHub cambie cosas sin romperle el programa a nadie.

## Leer una documentación

Esto es lo que más rentabilidad da de toda la lección, porque una API que no sabes leer es una API que no puedes usar. Y todas las documentaciones contestan a las mismas seis preguntas. Búscalas en este orden:

**¿Cuál es la dirección base?** Casi siempre un subdominio o un prefijo: `https://api.github.com`, `https://ejemplo.es/api/v1/`.

**¿Hace falta identificarse, y cómo?** Esto es lo primero que hay que resolver, porque condiciona todo. Puede que no haga falta, puede que sea una clave en una cabecera, o algo más largo. Es la lección 7.

**¿Qué recursos hay?** La lista de direcciones. Ahí se ve el modelo de datos de quien la escribió.

**¿Cuál es el límite de uso?** Casi siempre está enterrado en una página aparte, y es lo que decide si tu programa puede hacer lo que quieres.

**¿Qué formato tienen las fechas y los números?** Suena a detalle y es causa de fallos constantes. Ese `created_at` de antes vale `"2012-04-28T02:47:18Z"`, que es ISO 8601 en UTC; otras APIs mandan segundos desde 1970, y otras un formato inventado.

**¿Cómo se pide la página siguiente?** Cuando hay muchos resultados no vienen todos. Cada API lo hace distinto, y es la lección 9.

> [!consejo] Explorar antes de programar
>
> El error de principiante con una API es abrir el editor y escribir cincuenta líneas para ver si funciona. Lo que se hace es mirar primero, con tres herramientas:
>
> **`curl`**, que ya conoces del módulo 4. Con `-s` para que no enseñe el progreso y `-D-` para ver las cabeceras:
>
> ```bash
> curl -s -D- https://api.github.com/repos/django/django
> ```
>
> **El navegador.** Muchas APIs públicas se pueden abrir tal cual, y los navegadores modernos pintan el JSON en un árbol desplegable. Es la forma más rápida de ver la estructura.
>
> **El intérprete de Python**, que es donde de verdad se explora, porque puedes navegar por la respuesta:
>
> ```consola
> >>> import json, urllib.request
> >>> with urllib.request.urlopen('https://api.github.com/repos/django/django') as r:
> ...     datos = json.load(r)
> >>> len(datos)
> 86
> >>> datos['stargazers_count']
> 91159
> ```
>
> Eso es la biblioteca estándar, sin instalar nada, y es la lección 4. Que sea incómoda es precisamente el argumento de la 5.
>
> La regla: **nunca escribas código contra una API que no has mirado a mano primero.** La documentación miente más de lo que parece, sobre todo en los detalles.

> [!aviso] Lo que no es una API REST
>
> Dos confusiones que conviene quitarse de encima ahora.
>
> **"API" no significa "API web".** Una API es cualquier interfaz que ofrece un programa para que otro lo use, y llevas cuatro módulos usándolas: `pathlib` tiene una API, Django tiene una API. Lo que este módulo llama API es un caso concreto, la que se usa por HTTP, y por eso se dice "API REST" o "API web" cuando hace falta ser preciso.
>
> **Una API no es "la base de datos por internet".** Es la confusión que más daño hace al diseñar la propia, que es el bloque B. Una API es una **interfaz**: puede parecerse a tus tablas o no parecerse en nada, y normalmente no debería parecerse del todo. Publicar los modelos tal cual, con sus nombres de columna y sus claves, es atarte de por vida a un esquema que vas a querer cambiar.

> [!resumen] En resumen
>
> Una API es un acuerdo entre programas: pide esta dirección y recibirás estos datos con estos nombres. La diferencia con una página web no es solo de tamaño —la misma información de GitHub ocupa 315 KB en HTML y 6,8 KB en JSON—, sino de compromiso: el HTML está pensado para que lo lea una persona y cambia cuando quieren, mientras que la API es una promesa que se mantiene, y por eso sacar un dato de ella es leer una clave en vez de escribir una expresión regular que se romperá. REST es un estilo, no una tecnología, y se reduce a tres ideas: cada cosa es un recurso con su dirección en plural, el método HTTP dice qué hacer con él, y cada petición lleva todo lo que necesita para que cualquier servidor pueda atenderla. Las cabeceras de la respuesta dicen tanto como el cuerpo, y las que siempre hay que mirar son el tipo de contenido, la caché, la huella del contenido, la versión y sobre todo el límite de uso, que en GitHub son sesenta peticiones por hora sin identificarse. Y leer una documentación es contestar seis preguntas siempre iguales: dirección base, autenticación, recursos, límites, formato de fechas y cómo se pide la página siguiente.

> [!ejercicio] Practica
>
> 1. Pide con `curl` la misma información de un repositorio de GitHub en HTML y por la API, y compara los tamaños.
> 2. Mira las cabeceras de la respuesta de la API y localiza las tres del límite de uso. Anota cuántas peticiones te quedan.
> 3. Repite la petición cinco veces y comprueba cómo baja el contador.
> 4. Abre `https://api.github.com/users/tu-usuario` en el navegador y recorre el JSON.
> 5. Pide una lista, `/repos/django/django/issues`, y mira qué forma tiene cuando son muchos resultados.
> 6. Busca la documentación de una API que te interese y contesta por escrito las seis preguntas.
> 7. Escribe tres direcciones REST para un recurso de tu invención y tres versiones incorrectas de las mismas.
> 8. Con el intérprete y `urllib`, saca de la respuesta de un repositorio su nombre, su licencia y cuántas incidencias abiertas tiene.
