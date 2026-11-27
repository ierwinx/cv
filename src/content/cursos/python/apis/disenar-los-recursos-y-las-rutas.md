---
titulo: "Diseñar los recursos y las rutas"
resumen: "Las decisiones que hay que tomar antes de escribir una línea, y por qué la API no debe parecerse a tus tablas."
minutos: 14
orden: 11
---

Cambiamos de lado. Las diez lecciones anteriores consumían APIs ajenas; a partir de aquí escribimos la nuestra, con Django REST Framework.

Y antes de instalar nada hay que decidir cómo va a ser, porque **una API publicada no se puede cambiar**. Los modelos se refactorizan cuando quieras; las direcciones y los nombres de los campos, no: hay programas ajenos que dependen de ellos y que no controlas.

> [!objetivo] Qué vas a aprender
>
> Diseñar los recursos de una API partiendo de lo que necesita quien la usa y no de las tablas, elegir las rutas y los nombres, decidir qué hacer con las acciones que no encajan en los cinco verbos, y saber qué genera un enrutador de DRF a partir de eso.

## El dominio

Vamos a hacer el catálogo de una editorial, que tiene lo justo para que aparezcan todos los casos difíciles:

```salida
Editorial   nombre, país
Autor       nombre, nacimiento
Libro       título, ISBN, precio, páginas, estado, editorial, autores
Reseña      libro, autor, puntuación, texto
```

Ahí hay una clave ajena, una relación de muchos a muchos, un campo con estados, un decimal que es dinero y un recurso que solo tiene sentido dentro de otro. Suficiente.

## La API no es la base de datos

Es la confusión que anunció la lección 1 y la que más caro se paga. Publicar los modelos tal cual es cómodo el primer día y es una atadura para siempre.

Tres razones concretas:

**Te ata al esquema.** Si `Libro` tiene una columna `paginas` y la API expone `paginas`, el día que decidas moverla a otra tabla tienes que mantener el nombre igual. La API es un contrato; el esquema es un detalle de implementación que debería poder cambiar.

**Expone lo que no debe.** El `fields = '__all__'` que veremos en la lección siguiente publica **todos** los campos, incluidos los que añadas mañana sin pensar en la API. Es la misma trampa que el módulo 4 vio en los formularios, ahora con más alcance.

**Obliga a quien la usa a hacer tu trabajo.** Si la API devuelve `editorial: 3` y quien la consume necesita el nombre, tiene que hacer otra petición. Multiplicado por cien libros, es el N+1 de la lección 9 pero **al otro lado del cable**, y es mucho peor.

La pregunta correcta no es "¿qué tablas tengo?", es **"¿qué va a hacer quien use esto?"**. Con el catálogo, algo así:

```salida
- buscar libros por título o autor
- ver la ficha de un libro con su editorial y sus autores
- publicar un libro que estaba en borrador
- dejar una reseña
- ver las reseñas de un libro
```

De ahí salen los recursos, y salen distintos de las tablas.

## Las rutas

Sustantivos, en plural, en minúsculas y en jerarquía. Es lo de la lección 1, ahora aplicado:

```salida
/api/libros/                  lista y creación
/api/libros/42/               uno concreto
/api/libros/42/resenas/       las reseñas de ese libro
/api/editoriales/
/api/autores/
```

Y los cinco verbos dan la funcionalidad completa sin inventar nombres:

|  | `/api/libros/` | `/api/libros/42/` |
| --- | --- | --- |
| `GET` | Lista | La ficha |
| `POST` | Crea | — |
| `PUT` | — | Reemplaza |
| `PATCH` | — | Modifica |
| `DELETE` | — | Borra |

Cuatro decisiones que hay que tomar y que la gente toma por accidente:

**¿En español o en inglés?** Este curso va en español y las rutas van en español, con una regla: **sin tildes ni eñes**. `/api/resenas/` y no `/api/reseñas/`, porque una dirección con caracteres no ASCII se codifica y aparece como `/api/rese%C3%B1as/` en los registros, en las documentaciones y en el código de quien la use. Elige lo que elijas, **sé consistente**: media API en inglés y media en español es lo peor de los dos mundos.

**¿Barra final o no?** Django la pone y redirige si falta. Quédate con la de Django y no le des más vueltas; lo único importante es no mezclar.

**¿`/api/` delante?** Sí, o un subdominio. Separa la API de las páginas y permite servirlas distinto, cachearlas distinto y moverlas de sitio.

**¿La versión en la dirección?** Es la lección 22 y conviene decidirlo ahora, porque añadirla después es el cambio que rompe a todo el mundo. Si hay duda, ponla: `/api/v1/`.

> [!aviso] Las direcciones que parecen REST y no lo son
>
> Cuatro formas de equivocarse, en orden de frecuencia.
>
> **Verbos en la dirección.** `/api/crear-libro/`, `/api/libros/42/borrar/`. El verbo es el método HTTP; la dirección es el sustantivo.
>
> **Singular.** `/api/libro/42/` funciona y chirría, porque `/api/libro/` para la lista se lee mal. Plural siempre, incluso cuando el plural es feo.
>
> **Jerarquías de cuatro niveles.** `/api/editoriales/3/libros/42/resenas/7/comentarios/2/`. A partir del segundo nivel, deja de ayudar y empieza a estorbar: nadie recuerda el orden y cualquier cambio rompe la ruta. La regla práctica es **anidar un nivel como máximo**, y si el recurso tiene identificador propio, darle su ruta plana:
>
> ```salida
> /api/libros/42/resenas/      bien: las reseñas de ese libro
> /api/resenas/7/              bien: esa reseña concreta
> /api/libros/42/resenas/7/    innecesario: el 42 no aporta nada
> ```
>
> **La dirección que devuelve cosas distintas según un parámetro.** `/api/datos/?tipo=libro` no es un recurso, es una función con un argumento.

## Las acciones que no encajan

Este es el problema real del diseño REST, y llega enseguida: **publicar un libro** no es crear, ni borrar, ni exactamente modificar.

Hay tres soluciones y las tres son legítimas.

**Tratarlo como un cambio de campo**, que es lo más REST:

```salida
PATCH /api/libros/42/     {"estado": "publicado"}
```

Simple, y no distingue entre "corregir un error de estado" y "publicar", que pueden tener permisos y efectos muy distintos.

**Convertir la acción en un recurso.** El truco que resuelve casi todos los casos: si la acción tiene sustantivo, ese sustantivo es un recurso.

```salida
POST   /api/libros/42/publicacion/     publicar
DELETE /api/libros/42/publicacion/     despublicar
```

Encaja especialmente bien cuando la acción **deja rastro**: una publicación tiene fecha y responsable, así que es una cosa y no un evento.

**Rendirse y poner un verbo**, que es lo que hace todo el mundo, incluido GitHub:

```salida
POST /api/libros/42/publicar/
```

No es REST puro y es clarísimo. DRF lo soporta con un decorador y es la lección 16.

La regla honrada: **usa `PATCH` cuando de verdad sea cambiar un campo, y un verbo cuando sea una operación con reglas propias.** Forzar `PATCH` para algo que manda correos, cobra dinero y cambia cuatro tablas es peor diseño que admitir que es una acción.

## Los nombres de los campos

Menos glamuroso y más importante, porque son los que más se usan.

**Consistencia por encima de todo.** Elige `snake_case` —que es lo de Python y lo que DRF genera— y no lo mezcles. Si quien consume la API es JavaScript, preferirá `camelCase`, y existe `djangorestframework-camel-case` para convertir en la frontera. Decídelo el primer día.

**Los identificadores de relación, con sufijo.** `editorial_id` para el número y `editorial` para el objeto anidado. Que el mismo nombre signifique un número unas veces y un objeto otras es el error que más confunde a quien la consume.

**Nada de abreviaturas.** `descripcion` y no `desc`. Se escribe una vez y se lee mil.

**Los booleanos afirmativos.** `activo` y no `no_activo`, porque `"no_activo": false` hay que leerlo dos veces.

> [!consejo] Decide la forma de las respuestas ahora
>
> Cuatro decisiones que después cuestan un cambio de versión.
>
> **¿Envoltorio o no?** Las dos formas existen:
>
> ```json
> [ {"id": 1, "titulo": "..."}, {"id": 2, "titulo": "..."} ]
> ```
>
> ```json
> {"count": 200, "next": "...", "results": [ ... ]}
> ```
>
> La segunda es la que pone DRF **en cuanto activas la paginación**, y es la lección 20. Lo que no puedes es cambiar de una a otra después: rompe a todos los clientes. Y como la paginación hay que activarla siempre, en la práctica la decisión está tomada.
>
> **¿Cómo viajan las fechas?** ISO 8601, que es lo que DRF hace de fábrica, y decidiendo si van en UTC o con zona. Es la lección 3, ahora desde el lado que escribe.
>
> **¿Cómo viaja el dinero?** Como **texto**, y esto sorprende a todo el mundo la primera vez que lo ve:
>
> ```json
> {"precio": "19.98"}
> ```
>
> Entre comillas, a propósito. Es la lección 3 otra vez: si va como número, el cliente lo lee como coma flotante y aparece el 199,89999999999998. DRF lo hace así de serie y hace bien.
>
> **¿Qué forma tienen los errores?** Es la lección 2 desde el otro lado, donde vimos que cada API se inventa la suya. DRF trae una razonable, y lo que hay que decidir es si la personalizas y si —como GitHub— incluyes un enlace a la documentación.

## Lo que genera un enrutador

Para cerrar el círculo, esto es lo que DRF construye a partir del diseño. Con un recurso registrado:

```salida
SimpleRouter:
  ^libros/$                          name=libro-list
  ^libros/(?P<pk>[^/.]+)/$           name=libro-detail

DefaultRouter:
  ^libros/$                          name=libro-list
  ^libros\.(?P<format>[a-z0-9]+)/?$  name=libro-list
  ^libros/(?P<pk>[^/.]+)/$           name=libro-detail
  ^libros/(?P<pk>[^/.]+)\.(?P<format>...)$
  (raíz)                             name=api-root
```

Dos direcciones y cinco métodos, que es exactamente la tabla de arriba. Y las diferencias entre los dos enrutadores:

**El enrutador completo añade una raíz** que lista los recursos disponibles, cosa muy cómoda para explorar y que **expone el mapa de tu API a cualquiera**. Con una API pública, bien; con una interna, piénsalo.

**Y añade sufijos de formato**, de modo que `/api/libros.json` funciona además de `/api/libros/?format=json`. Es cómodo y duplica todas tus rutas.

Los nombres, `libro-list` y `libro-detail`, son los que usarás con `reverse` en las pruebas de la lección 22. Merece la pena fijarse ahora en que salen del nombre base del recurso.

> [!nota] Escribir la documentación antes que el código
>
> El orden que parece al revés y funciona: **escribe primero las peticiones y respuestas de ejemplo**, en un fichero de texto, antes de tocar un modelo.
>
> ```salida
> GET /api/libros/?estado=publicado&editorial=3
>
> 200 OK
> {
>   "count": 42,
>   "next": "https://.../api/libros/?estado=publicado&editorial=3&page=2",
>   "results": [
>     {"id": 1, "titulo": "...", "precio": "19.98",
>      "editorial": {"id": 3, "nombre": "Anagrama"},
>      "autores": [{"id": 5, "nombre": "Óscar Núñez"}]}
>   ]
> }
> ```
>
> En media hora de escribir eso aparecen casi todas las preguntas difíciles: si la editorial va anidada o por identificador, si el precio es texto, cómo se filtra, cómo se pagina. Y responderlas en un fichero de texto cuesta borrar una línea; responderlas cuando hay diez clientes conectados cuesta una versión nueva de la API.
>
> La lección 21 automatiza la documentación a partir del código. Esto es lo contrario, y es para antes: **un boceto que se tira**. Las dos cosas son útiles y en momentos distintos.

> [!resumen] En resumen
>
> Una API publicada no se puede cambiar, así que las decisiones de diseño se toman antes de escribir código. La primera es que la API no es la base de datos: publicar los modelos tal cual te ata al esquema, expone campos que no querías y obliga a quien la usa a pedir dos veces lo que debería venir junto. La pregunta correcta no es qué tablas tienes sino qué va a hacer quien la consuma. Las rutas son sustantivos en plural, sin tildes aunque el resto vaya en español, con un prefijo que las separe de las páginas y, si hay duda, con la versión desde el principio. Los errores frecuentes son poner verbos en la dirección, usar el singular y anidar más de un nivel. Las acciones que no encajan en los cinco métodos tienen tres salidas legítimas: tratarlas como un cambio de campo cuando de verdad lo son, convertirlas en un recurso cuando tienen sustantivo y dejan rastro, o admitir que son una acción y ponerles un verbo, que es lo que hace todo el mundo. En los nombres de campo importa más la consistencia que la elección, con los identificadores de relación distinguidos por sufijo. Y hay cuatro decisiones de forma que después cuestan un cambio de versión: si las listas van envueltas, cómo viajan las fechas, que el dinero viaje **como texto** para que no se convierta en coma flotante, y qué forma tienen los errores. El enrutador de DRF genera dos direcciones y cinco métodos por recurso; el completo añade además una raíz que lista todo, cómoda para explorar y reveladora de más de lo que a veces quieres.

> [!ejercicio] Practica
>
> 1. Escribe las cinco cosas que hará quien use tu API, antes de pensar en tablas.
> 2. Deriva de ahí los recursos y comprueba en cuántos casos no coinciden con tus modelos.
> 3. Escribe las rutas de cada recurso y busca verbos escondidos en ellas.
> 4. Localiza una acción de tu dominio que no encaje en los cinco métodos y resuélvela de las tres maneras.
> 5. Decide y escribe la convención de nombres de campo de tu API.
> 6. Escribe a mano la respuesta de ejemplo de tu listado principal, con paginación.
> 7. Decide si el dinero de tu API va como texto o como número, y razona por qué.
> 8. Registra un recurso con los dos enrutadores y compara las rutas generadas.
> 9. Mira qué expone la raíz del enrutador completo y decide si la quieres.
> 10. Anida un recurso dentro de otro y comprueba a partir de qué nivel deja de ayudar.
