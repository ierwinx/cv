---
titulo: "Paginación"
resumen: "Las tres formas que trae DRF, la fila que aparece dos veces al recorrer un listado, y el contador que cuesta una consulta por página."
minutos: 15
orden: 20
---

La lección 9 vio la paginación desde el lado de quien consume una API, con sus tres estilos y sus problemas. Ahora toca elegir cuál ofreces, y las consecuencias son tuyas.

La lección 12 dejó dicho que la paginación se activa el primer día, porque cambia la forma de la respuesta. Aquí va la elección de cuál.

> [!objetivo] Qué vas a aprender
>
> Configurar las tres clases de paginación que trae DRF, medir lo que cuesta cada una, reproducir desde el servidor el problema de filas repetidas que la lección 9 vio desde fuera, y elegir con criterio.

## Las tres

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

Y por recurso, con la configuración que conviene:

```python
from rest_framework.pagination import (
    CursorPagination, LimitOffsetPagination, PageNumberPagination)


class PaginaNumerada(PageNumberPagination):
        page_size = 20
    page_size_query_param = 'tam'      # deja al cliente pedir otro tamaño
    max_page_size = 100                # y le pone tope


class PorDesplazamiento(LimitOffsetPagination):
        default_limit = 20
    max_limit = 100


class PorCursor(CursorPagination):
        page_size = 20
    ordering = '-creado'               # obligatorio, y tiene que ser estable
```

Lo que devuelve cada una:

```salida
--- por número ---
count: 201
next: http://.../api/libros/?page=2
previous: None
results: 20 elementos

--- por desplazamiento ---
count: 201
next: http://.../api/libros/?limit=20&offset=20
previous: None
results: 20 elementos

--- por cursor ---
next: http://.../api/libros/?cursor=cD0yMDI2LTA5LTIyKzE5JTNBMTUlM0EyMS4xMDU4NzQ...
previous: None
results: 20 elementos
```

**La de cursor no tiene `count`.** Es la primera diferencia y es deliberada: contar es lo que cuesta.

Y el cursor, descodificado, no es un número de página:

```salida
cursor:        cD0yMDI2LTA5LTIyKzE5JTNBMTUlM0EyMS4xMDU4NzQlMkIwMCUzQTAw
descodificado: p=2026-09-22+19:15:21.105874+00:00
```

**Es la posición del último elemento devuelto.** Va en base64 no para esconderlo sino para que quepa en una dirección, y eso explica todas sus propiedades: no se puede saltar a la página cincuenta, y no se puede desincronizar.

## Lo que cuesta cada una

```salida
por número          3 consultas, de ellas 1 es un COUNT
por desplazamiento  3 consultas, de ellas 1 es un COUNT
por cursor          2 consultas, ninguna es un COUNT
```

Esa consulta de más es el `count` de la respuesta, y es **una consulta entera por cada página que sirvas**. Con una tabla pequeña no se nota; con millones de filas, contar puede tardar más que traer la página.

Y con filtros es peor, porque el contador cuenta las filas filtradas: no vale cachearlo.

Ese es el intercambio, y hay que decidirlo sabiendo que **el contador se usa para pintar una barra de progreso y poco más.**

> [!aviso] La fila que aparece dos veces
>
> Es el problema que la lección 9 vio desde fuera, ahora reproducido desde dentro. Recorrer un listado paginado por número mientras alguien inserta una fila:
>
> ```salida
> paginando por número, insertando una fila a mitad del recorrido:
>   ids vistos: 140 | únicos: 139 | REPETIDOS: 1
>   id repetido: 116
>
> lo mismo con cursor:
>   ids vistos: 140 | únicos: 140 | REPETIDOS: 0
> ```
>
> Una fila insertada al principio del orden **empuja a todas las demás**, así que la que estaba al final de la página 1 pasa al principio de la página 2 y se sirve dos veces.
>
> Y lo que no se ve en esos números es lo contrario, que es peor: si alguien **borra** una fila en vez de insertarla, todo se desplaza hacia arriba y **una fila se salta sin que nadie se entere.** Un repetido se nota; un salto, no.
>
> La paginación por cursor es inmune porque no dice "las veinte siguientes a la número 40", dice "las veinte siguientes a esta de aquí". Insertar o borrar no mueve esa referencia.
>
> Esto importa mucho más de lo que parece, porque **la forma normal de consumir una API es recorrerla entera**: un proceso nocturno, una sincronización, un informe. Y son exactamente los procesos donde nadie mira los datos de uno en uno, así que el salto no se descubre hasta que falta algo meses después.

## Elegir

|  | Por número | Por desplazamiento | Por cursor |
| --- | --- | --- | --- |
| Total de elementos | Sí | Sí | **No** |
| Saltar a una página | Sí | Sí | **No** |
| Consultas por página | 3 | 3 | **2** |
| Estable si cambian los datos | No | No | **Sí** |
| Coste con desplazamiento grande | Alto | Alto | **Constante** |
| Fácil de entender | Sí | Sí | Menos |

**Por número** para lo que tiene interfaz de usuario con páginas numeradas y no cambia cada segundo: un catálogo, un archivo, un listado administrativo.

**Por desplazamiento** es lo mismo con otra sintaxis, y lo único que añade es que el cliente controle el tamaño con más naturalidad. Tiene el mismo problema de estabilidad.

**Por cursor** para cualquier cosa que se recorra entera, que cambie a menudo o que sea grande: un registro de eventos, una cola de mensajes, una sincronización, una línea de tiempo. Y para tablas de millones de filas, donde la diferencia de coste es abismal:

Con desplazamiento, `OFFSET 100000` obliga a la base de datos a **generar y descartar cien mil filas** antes de devolver las veinte que quieres. Con cursor, es una búsqueda por índice: cuesta lo mismo en la página 1 que en la 5000.

La respuesta práctica para muchos proyectos es **las dos**: por número en el recurso que consume tu propia interfaz, y por cursor en un punto de acceso pensado para recorrer.

> [!aviso] El orden inestable rompe las tres
>
> Esto se le escapa a casi todo el mundo, y es la condición previa a cualquier paginación:
>
> ```python
> class LibroViewSet(viewsets.ModelViewSet):
>         queryset = Libro.objects.all()      # sin orden
> ```
>
> Sin `ORDER BY`, la base de datos devuelve las filas **en el orden que le convenga**, que puede cambiar entre dos consultas idénticas. Paginar eso da repeticiones y saltos aunque nadie esté escribiendo.
>
> Django avisa en este caso concreto:
>
> ```salida
> UnorderedObjectListWarning: Pagination may yield inconsistent results
> with an unordered object_list
> ```
>
> Y es un aviso, no un error, así que se pierde entre la salida.
>
> Peor todavía: **un orden que no es único tampoco basta.**
>
> ```python
> ordering = ['precio']
> ```
>
> Si veinte libros valen 19,98 €, el orden entre ellos no está definido, y puede cambiar de una página a otra. La regla es ordenar siempre **por algo único al final**, que en la práctica es la clave primaria:
>
> ```python
> ordering = ['precio', 'id']
> ```
>
> Esa línea es la diferencia entre una paginación correcta y una que falla de vez en cuando de forma imposible de reproducir. Con la paginación por cursor es obligatorio y DRF lo comprueba; con las otras dos, no avisa nadie.

> [!nota] Dejar elegir el tamaño, con tope
>
> ```python
> page_size_query_param = 'tam'
> max_page_size = 100
> ```
>
> Sin el primero, el cliente no puede pedir menos ni más, y una aplicación móvil que quiere cinco elementos tiene que traerse veinte.
>
> Sin el segundo, **puede pedir todos**:
>
> ```salida
> GET /api/libros/?tam=1000000
> ```
>
> Y eso es la lección 12 otra vez: un listado sin límite es una forma de tumbar el servidor con una dirección. El tope no es opcional.
>
> Cien es un valor razonable. Si alguien necesita más, lo que necesita es la paginación por cursor y un bucle, no una página gigante.

> [!consejo] La paginación que se olvida
>
> Tres sitios donde la paginación desaparece sin que nadie lo note.
>
> **En las acciones propias.** Es lo de la lección 16: un `Response(serializador.data)` devuelve todo, saltándose la configuración. Las dos líneas que hacen falta:
>
> ```python
> pagina = self.paginate_queryset(consulta)
> return self.get_paginated_response(self.get_serializer(pagina, many=True).data)
> ```
>
> **En las vistas escritas a mano**, con el decorador de función o la clase base, que no tienen nada de esto. Si el punto de acceso devuelve una lista, la paginación es tuya.
>
> **En las relaciones anidadas.** Un serializador con `resenas = ResenaSerializer(many=True)` mete **todas** las reseñas de cada libro dentro de cada elemento del listado. Veinte libros con quinientas reseñas cada uno son diez mil objetos en una respuesta que aparentaba estar paginada.
>
> Ese tercero es el más traicionero porque la respuesta sí tiene su `count` y su `next`, así que parece correcta. La solución es no anidar colecciones que puedan crecer: se devuelve el número y el enlace.
>
> ```python
> class LibroSerializer(serializers.ModelSerializer):
>         num_resenas = serializers.IntegerField(source='resenas.count', read_only=True)
>     resenas_url = serializers.HyperlinkedIdentityField(
>         view_name='libro-resenas', read_only=True)
> ```
>
> Y la prueba que lo detecta es la de contar consultas de la lección 14, más una que mire el tamaño de la respuesta:
>
> ```python
> def test_el_listado_no_crece_sin_limite(self):
>         respuesta = self.client.get('/api/libros/')
>     self.assertLess(len(respuesta.content), 100_000)
> ```

> [!resumen] En resumen
>
> DRF trae tres clases de paginación. La de número y la de desplazamiento devuelven el total y permiten saltar a una página, y cuestan tres consultas porque una es el contador, que hay que ejecutar en cada página y que no se puede cachear cuando hay filtros. La de cursor no devuelve total, no permite saltar, y cuesta dos; su cursor descodificado es la posición del último elemento, no un número de página, y de ahí salen todas sus propiedades. El problema medido es que paginando por número mientras alguien inserta una fila, un elemento aparece **dos veces**, y si en lugar de insertar se borra, uno se **salta sin que nadie se entere**, que es el caso peor porque un repetido se nota y un hueco no; la de cursor es inmune. Eso importa porque la forma normal de consumir una API es recorrerla entera desde un proceso automático, donde nadie mira los datos de uno en uno. La elección práctica suele ser las dos: por número para lo que consume tu interfaz, por cursor para lo que se recorre, lo que cambia a menudo o lo que es grande, donde además el coste es constante en lugar de crecer con el desplazamiento. La condición previa a todo esto es un orden **estable y único**: sin orden, Django avisa con un mensaje que se pierde; con un orden no único, no avisa nadie y el fallo es imposible de reproducir, así que se ordena siempre por la clave primaria al final. Hay que dejar elegir el tamaño y ponerle tope. Y la paginación desaparece en tres sitios: las acciones propias, las vistas a mano, y las colecciones anidadas en un serializador, que es el peor porque la respuesta parece paginada y trae diez mil objetos.

> [!ejercicio] Practica
>
> 1. Configura las tres clases en tres recursos y compara la forma de las respuestas.
> 2. Descodifica un cursor y mira qué hay dentro.
> 3. Cuenta las consultas de una página con cada una y localiza el contador.
> 4. Recorre un listado paginado por número insertando una fila a mitad, y busca repetidos.
> 5. Repite el recorrido borrando una fila y comprueba que falta una.
> 6. Haz lo mismo con cursor y compara.
> 7. Quita el orden del conjunto de datos y busca el aviso de Django.
> 8. Ordena por un campo con valores repetidos y comprueba la inestabilidad.
> 9. Añade la clave primaria al final del orden y vuelve a comprobarlo.
> 10. Deja al cliente elegir el tamaño y después pídelo con un número enorme.
> 11. Pon el tope y vuelve a intentarlo.
> 12. Escribe una acción propia sin paginar y cuenta lo que devuelve.
> 13. Anida una colección en un serializador y mide el tamaño de la respuesta del listado.
