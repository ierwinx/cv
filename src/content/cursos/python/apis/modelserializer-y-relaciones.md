---
titulo: "ModelSerializer y relaciones"
resumen: "Cuatro líneas que generan once campos, y el listado que pasa de 2 consultas a 399 por enseñar el nombre de la editorial."
minutos: 17
orden: 14
---

`ModelSerializer` escribe el serializador por ti a partir del modelo. Ahorra mucho código y es lo que se usa el 90 % de las veces.

Y las relaciones son la parte difícil de una API: decidir si la editorial de un libro sale como número o como objeto no es cosmético, **es la diferencia entre dos consultas y trescientas noventa y nueve.**

> [!objetivo] Qué vas a aprender
>
> Saber exactamente qué genera `ModelSerializer` y controlarlo, elegir entre las cinco formas de representar una relación, medir lo que cuesta cada una, y escribir relaciones sabiendo por qué el anidamiento no funciona de entrada.

## Lo que genera

Cuatro líneas:

```python
class LibroSerializer(serializers.ModelSerializer):
        class Meta:
                model = Libro
        fields = '__all__'
```

Y esto es lo que construye, que se puede ver imprimiendo una instancia:

```salida
LibroSerializer():
    id = BigIntegerField(label='ID', read_only=True)
    titulo = CharField(label='Título', max_length=200)
    isbn = CharField(label='ISBN', max_length=17,
                     validators=[<UniqueValidator(queryset=Libro.objects.all())>])
    precio = DecimalField(decimal_places=2, max_digits=7)
    paginas = IntegerField(label='Páginas', max_value=..., min_value=0, required=False)
    estado = ChoiceField(choices=[('borrador', 'Borrador'), ...], required=False)
    publicado_en = DateField(allow_null=True, required=False)
    creado = DateTimeField(read_only=True)
    actualizado = DateTimeField(read_only=True)
    editorial = PrimaryKeyRelatedField(queryset=Editorial.objects.all())
    autores = PrimaryKeyRelatedField(allow_empty=False, many=True,
                                     queryset=Autor.objects.all())
```

**Imprimir el serializador es la herramienta de depuración más útil de DRF** y casi nadie la conoce. Enseña exactamente qué campos hay, con qué tipo y con qué reglas, que es la respuesta a la mitad de las preguntas de "por qué esto no valida".

Cuatro cosas que ha deducido solo:

**Las etiquetas salen del `verbose_name`.** `Título`, `Páginas`, `ISBN`, con sus tildes. Un modelo escrito en español da una API documentada en español gratis.

**El `unique=True` del modelo se convierte en un validador**, así que un ISBN repetido da un `400` limpio en vez de un error de base de datos.

**Los campos con `auto_now` son de solo lectura.** Bien deducido.

**Las relaciones salen como identificadores**, y eso es lo que vamos a cambiar.

> [!aviso] `fields = '__all__'` es cómodo y no se publica
>
> Es lo primero que se escribe y no debería llegar a producción, por la misma razón que en los formularios del módulo 4: **publica los campos que no has pensado, incluidos los que añadas mañana.**
>
> El día que alguien añada al modelo un `margen_de_beneficio`, un `coste_real` o un `notas_internas`, aparecerá en la API sin que nadie lo decida. Y aparecerá además **como campo escribible**.
>
> La alternativa es la lista explícita:
>
> ```python
> class Meta:
>         model = Libro
>     fields = ['id', 'titulo', 'isbn', 'precio', 'paginas', 'estado', 'publicado_en']
> ```
>
> Más larga y es un inventario de lo que publicas, que se lee en una revisión de código.
>
> Y **`exclude` no es la alternativa**, es el mismo problema con otra cara: `exclude = ['coste']` publica todo lo demás, incluido lo de mañana. La lista de lo que sí, nunca la de lo que no.
>
> Para los campos que quieres publicar pero no dejar cambiar, sin repetirlos:
>
> ```python
> class Meta:
>         model = Libro
>     fields = ['id', 'titulo', 'isbn', 'precio', 'estado', 'creado']
>     read_only_fields = ['id', 'estado', 'creado']
> ```

## Las cinco formas de una relación

Sobre el mismo libro, lo que devuelve cada una:

```salida
PrimaryKeyRelatedField  {"editorial": 2, "autores": [1]}
StringRelatedField      {"editorial": "Alfaguara", "autores": ["Óscar Núñez"]}
SlugRelatedField        {"editorial": "Alfaguara", "autores": ["Óscar Núñez"]}
HyperlinkedRelatedField {"editorial": "http://.../api/editoriales/2/"}
serializador anidado    {"editorial": {"id": 2, "nombre": "Alfaguara", "pais": "España"},
                         "autores": [{"id": 1, "nombre": "Óscar Núñez"}]}
```

Cuándo usar cada una:

| Forma | Escribible | Cuándo |
| --- | --- | --- |
| Por identificador | Sí | Lo predeterminado; el cliente ya tiene los datos |
| Por texto | **No** | Solo lectura, rápido de leer |
| Por campo | Sí | Cuando hay un identificador natural: código, ISBN |
| Por enlace | Sí | APIs que quieren ser navegables |
| Anidado | **No, de entrada** | Cuando quien la usa necesita los datos y no otra petición |

**Por campo** es la más infravalorada. Si tus editoriales tienen un código único, `SlugRelatedField(slug_field='codigo')` da una API en la que `"editorial": "anagrama"` se lee y se escribe, sin que nadie tenga que saber que la editorial es el número 2.

**Anidado** es lo que casi siempre quiere quien consume la API, y es lo que cuesta.

## Lo que cuesta cada una

Aquí está el número de la lección. Serializando doscientos libros:

```salida
solo campos propios        1 consultas
ids (sin optimizar)      200 consultas
ids (con prefetch)         2 consultas
anidado sin optimizar    399 consultas
anidado optimizado         2 consultas
```

Lo que sorprende es la segunda línea: **devolver solo los identificadores de los autores ya cuesta una consulta por libro.** La intuición dice que un número es gratis, y no lo es: es una relación de muchos a muchos, y para saber qué identificadores tiene cada libro hay que ir a la tabla intermedia.

Y de ahí la conclusión práctica: **la optimización no depende de la forma que elijas, depende de que optimices.** Anidado y optimizado cuesta lo mismo que identificadores y optimizado: dos consultas.

El arreglo va en la vista, no en el serializador:

```python
class LibroViewSet(viewsets.ModelViewSet):
        queryset = (Libro.objects
                .select_related('editorial')        # clave ajena: una unión
                .prefetch_related('autores'))       # muchos a muchos: otra consulta
    serializer_class = LibroSerializer
```

Es exactamente lo de la lección 15 del módulo 4, y aquí duele más porque en una web solo se ven veinte filas de golpe y en una API es normal pedir cien.

> [!aviso] El N+1 que aparece solo, meses después
>
> Lo peligroso de esto es cómo se introduce. Nadie escribe un serializador con 399 consultas: alguien **añade un campo** a uno que iba bien.
>
> ```python
> class LibroSerializer(serializers.ModelSerializer):
>         editorial_nombre = serializers.CharField(source='editorial.nombre', read_only=True)
> ```
>
> Una línea, la petición de un compañero, y el listado pasa de una consulta a doscientas. La respuesta sigue siendo correcta, así que no hay error, no hay aviso, y en desarrollo con veinte filas no se nota nada.
>
> Los `SerializerMethodField` son todavía peores, porque ahí cabe cualquier cosa:
>
> ```python
> def get_num_resenas(self, obj):
>         return obj.resenas.count()        # una consulta por libro
> ```
>
> La defensa es la de la lección 39 del módulo 4, y aquí es obligatoria:
>
> ```python
> def test_el_listado_no_crece_con_las_filas(self):
>         with self.assertNumQueries(4):
>                 self.client.get('/api/libros/')
> ```
>
> Esa prueba no comprueba que la respuesta sea correcta: comprueba que **el coste no depende del número de filas**, que es lo que ninguna otra prueba mira. Cuando alguien añada el campo, fallará, y el mensaje dirá exactamente qué pasó.

## Escribir relaciones

Leer anidado es fácil. Escribir anidado **no funciona**:

```python
class LibroSerializer(serializers.ModelSerializer):
        editorial = EditorialSerializer()
```

```salida
is_valid():  True
AssertionError: The `.create()` method does not support writable nested fields
by default. Write an explicit `.create()` method for serializer `LibroSerializer`,
or set `read_only=True` on nested serializer fields.
```

Fíjate en que **valida bien y revienta al guardar**. DRF no sabe qué quieres: ¿crear una editorial nueva? ¿buscar la que se parezca? ¿actualizar la que hay? Son decisiones tuyas, y hace bien en no adivinar. El mensaje, además, dice las dos salidas.

La solución habitual, y la que conviene por defecto, es **dos campos**: uno para leer y otro para escribir.

```python
class LibroSerializer(serializers.ModelSerializer):
        editorial = EditorialSerializer(read_only=True)
    editorial_id = serializers.PrimaryKeyRelatedField(
        source='editorial',
        queryset=Editorial.objects.all(),
        write_only=True,
    )

    class Meta:
                model = Libro
        fields = ['id', 'titulo', 'isbn', 'precio',
                  'editorial', 'editorial_id', 'autores']
```

```salida
POST {"titulo": "Nuevo", "isbn": "978-99-XYZ", "precio": "10.00",
      "editorial_id": 1, "autores": [1, 2]}

201  {"id": 201, "titulo": "Nuevo", "precio": "10.00",
      "editorial": {"id": 1, "nombre": "Anagrama", "pais": "España"},
      "autores": [1, 2]}
```

**Se escribe un número y se lee un objeto**, que es lo que quiere todo el mundo. Y es la convención de nombres de la lección 11: el sufijo distingue el identificador del objeto.

El `source='editorial'` es la pieza que lo hace funcionar: dice que ese campo, aunque se llame `editorial_id` de cara afuera, escribe en el atributo `editorial` del modelo.

Si de verdad necesitas crear la editorial junto con el libro, se escribe el `create` a mano:

```python
def create(self, validated_data):
        datos_editorial = validated_data.pop('editorial')
    editorial, _ = Editorial.objects.get_or_create(**datos_editorial)
    return Libro.objects.create(editorial=editorial, **validated_data)
```

Y conviene pensarlo dos veces, porque una API que crea cosas de rebote es difícil de razonar: un error de escritura en el nombre de la editorial crea una editorial nueva en vez de dar un error.

> [!nota] Dos sorpresas de las relaciones múltiples
>
> Del serializador generado antes:
>
> ```salida
> autores = PrimaryKeyRelatedField(allow_empty=False, many=True, ...)
> ```
>
> Ese `allow_empty=False` es de DRF, no del modelo, y tiene consecuencias:
>
> ```salida
> {"autores": []}        -> 400  {"autores": ["Esta lista no puede estar vacía."]}
> sin el campo autores   -> 400  {"autores": ["Este campo es requerido."]}
> ```
>
> **Una relación de muchos a muchos es obligatoria y no acepta lista vacía**, aunque en el modelo un libro sin autores sea perfectamente posible: Django no permite poner `blank=True` en el sentido que uno esperaría para esto. Son dos errores distintos con causas distintas y los dos sorprenden.
>
> Si un libro puede no tener autores, hay que decirlo:
>
> ```python
> autores = serializers.PrimaryKeyRelatedField(
>     many=True, queryset=Autor.objects.all(), required=False, allow_empty=True)
> ```
>
> Y la otra: en un `PUT`, mandar `autores` **reemplaza la lista entera**. No añade. Quitar un autor de una lista de cinco significa mandar los cuatro que quedan; si mandas solo el que quieres añadir, borras los otros cuatro. Es consistente con lo que `PUT` significa, y es la causa de una buena parte de los datos perdidos en APIs nuevas.

> [!consejo] Un serializador por operación
>
> El patrón que resuelve la mitad de los problemas de este bloque: **no uses el mismo serializador para listar, ver y escribir.**
>
> ```python
> class LibroListaSerializer(serializers.ModelSerializer):
>         """Ligero: lo que se ve en una tabla."""
>     editorial = serializers.StringRelatedField()
>
>     class Meta:
>                 model = Libro
>         fields = ['id', 'titulo', 'precio', 'editorial']
>
>
> class LibroDetalleSerializer(serializers.ModelSerializer):
>         """Completo: la ficha."""
>     editorial = EditorialSerializer(read_only=True)
>     autores = AutorSerializer(many=True, read_only=True)
>
>     class Meta:
>                 model = Libro
>         fields = ['id', 'titulo', 'isbn', 'precio', 'paginas', 'estado',
>                   'publicado_en', 'editorial', 'autores', 'creado']
>
>
> class LibroEscrituraSerializer(serializers.ModelSerializer):
>         class Meta:
>                 model = Libro
>         fields = ['titulo', 'isbn', 'precio', 'paginas', 'editorial', 'autores']
>
>
> class LibroViewSet(viewsets.ModelViewSet):
>         queryset = Libro.objects.select_related('editorial').prefetch_related('autores')
>
>     def get_serializer_class(self):
>                 if self.action == 'list':
>                         return LibroListaSerializer
>         if self.action in ('create', 'update', 'partial_update'):
>                         return LibroEscrituraSerializer
>         return LibroDetalleSerializer
> ```
>
> Lo que se gana:
>
> **El listado es ligero**, que es donde el tamaño importa porque se multiplica por cien.
>
> **El de escritura no acepta lo que no debe**, sin tener que marcar campos de solo lectura uno a uno: el que no está, no entra.
>
> **El de detalle puede ser generoso**, porque es un objeto.
>
> El coste es tres clases en vez de una, y a partir del tercer recurso deja de parecer excesivo. Lo que cuesta caro de verdad es el serializador único con seis condicionales dentro.

> [!resumen] En resumen
>
> `ModelSerializer` deduce los campos del modelo con cuatro aciertos: las etiquetas salen del nombre verbal, así que un modelo en español da una API en español; el `unique` se convierte en validador; los campos automáticos quedan de solo lectura; y las relaciones salen como identificadores. Imprimir el serializador enseña todo eso y es la mejor herramienta de depuración de DRF. La lista de campos debe ser explícita, porque tanto el comodín como la exclusión publican lo que añadas mañana. Hay cinco formas de representar una relación, de las cuales la de campo natural está infravalorada y la anidada es la que suele querer quien consume la API. Y lo que cuesta cada una está medido: sobre doscientos libros, un serializador plano es una consulta, **devolver solo los identificadores de una relación múltiple ya son doscientas**, el anidado sin optimizar son 399, y cualquiera de las dos optimizadas con las funciones de la lección 15 del módulo 4 son dos. La optimización no depende de la forma, depende de que la hagas, y el problema aparece meses después cuando alguien añade un campo a un serializador que iba bien, sin error y sin aviso; la única defensa que lo detecta es una prueba que cuenta consultas. Escribir relaciones anidadas no funciona de entrada, y la solución por defecto son dos campos, uno de lectura con el objeto y otro de escritura con el identificador. Y dos sorpresas de las relaciones múltiples: son obligatorias y rechazan la lista vacía aunque el modelo lo permita, y un `PUT` **reemplaza la lista entera** en vez de añadir.

> [!ejercicio] Practica
>
> 1. Imprime un serializador de modelo y estudia los campos que ha deducido.
> 2. Comprueba de dónde salen las etiquetas y qué pasa si cambias un nombre verbal.
> 3. Sustituye el comodín por la lista explícita y cuenta cuántos campos dejas de publicar.
> 4. Representa la misma relación de las cinco formas y compara la salida.
> 5. Cuenta las consultas de serializar doscientas filas con cada forma.
> 6. Comprueba que devolver solo los identificadores de una relación múltiple ya cuesta una consulta por fila.
> 7. Optimiza la consulta en la vista y vuelve a contar.
> 8. Añade un campo que siga una relación y mira cómo suben las consultas.
> 9. Escribe la prueba que cuenta consultas y comprueba que el cambio anterior la rompe.
> 10. Intenta escribir con un serializador anidado y lee el mensaje de la aserción.
> 11. Monta el patrón de dos campos y comprueba que escribes un número y lees un objeto.
> 12. Manda una lista vacía en una relación múltiple y después quita el campo, y compara los dos errores.
> 13. Separa los serializadores de lista, detalle y escritura, y elígelos según la acción.
