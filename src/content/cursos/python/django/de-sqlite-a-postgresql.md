---
titulo: "De SQLite a PostgreSQL"
resumen: "El `database is locked` que no aparece hasta que hay usuarios, el nombre de 500 letras que cabe en un campo de 100, y las búsquedas en español que por fin funcionan."
minutos: 17
orden: 41
---

Todo el módulo ha ido sobre SQLite, que es lo que `startproject` deja puesto, y no ha estorbado en ningún momento. Pero han quedado tres cosas apuntadas por el camino que apuntan al mismo sitio: la lección 12 midió que las búsquedas con tilde no funcionan, la 37 tuvo que inventar un campo normalizado para arreglarlo, y la 12 dijo que PostgreSQL era la razón de peso para cambiar.

Esta lección hace el cambio y mide qué se gana. Con ejemplos reales, porque casi todo lo que se lee sobre esto son afirmaciones sin números.

> [!objetivo] Qué vas a aprender
>
> Cambiar el motor de base de datos sin tocar los modelos, entender las tres diferencias que importan —concurrencia, tipos y español—, ver qué se gana en búsqueda, y saber cuándo el cambio no hace falta.

## El cambio

Sorprendentemente poco:

```bash
pip install "psycopg[binary]"
```

```python title="cfg/ajustes/produccion.py"
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'agenda',
        'USER': 'agenda',
        'PASSWORD': os.environ['CLAVE_BD'],
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

```salida
Applying contactos.0001_initial... OK
Applying contactos.0002_etiqueta_contacto_etiquetas_ficha... OK
Applying contactos.0003_alter_contacto_options_... OK
Applying contactos.0004_contacto_adjunto_contacto_foto... OK
Applying contactos.0005_contacto_busqueda... OK
```

**Las mismas migraciones, sin cambiar ni una línea.** Ni los modelos, ni las vistas, ni las consultas. Eso es lo que hace el ORM de la lección 11, y es la primera vez en el módulo que se ve de verdad para qué sirve esa capa de abstracción.

`psycopg` es la biblioteca que habla con PostgreSQL. El `[binary]` trae los binarios compilados y evita necesitar un compilador; en producción se suele usar `psycopg[c]`, que es algo más rápido y sí compila.

Y lo que **no** se migra solo son los datos. Para eso, `dumpdata` y `loaddata` si son pocos, o herramientas de PostgreSQL si son muchos. Es la parte aburrida y la que hay que ensayar.

## La primera diferencia: escrituras a la vez

Esta es la razón principal, y es fácil de enseñar. Dos hilos, uno que escribe durante siete segundos y otro que intenta escribir medio segundo después:

```salida
SQLite:      OperationalError tras 5.2s: database is locked
PostgreSQL:  escrito en 0.0s
```

Ahí está todo. SQLite permite **un escritor a la vez** y bloquea el fichero entero; el segundo espera y, pasado su tiempo de espera, se rinde con un error que tira la petición.

Ese tiempo de espera es un ajuste con un valor por defecto que explica el `5.2s`:

```salida
journal_mode: delete | busy_timeout: 5000
```

Y ojo, porque sin llegar al error el problema ya está ahí. Ocho hilos escribiendo doscientas cuarenta filas, con trabajo dentro de cada transacción:

```salida
SQLite:      1.70s
PostgreSQL:  0.21s
```

**Ocho veces más lento, sin un solo error.** SQLite no falló: puso a los ocho hilos en fila de uno en uno. Eso es exactamente lo que pasa en producción antes de que aparezcan los `database is locked`: el sitio se va poniendo lento a medida que llega gente, y los registros no dicen nada porque nada falló.

Y por qué no se nota en desarrollo: porque desarrollando eres un usuario, y nunca hay dos escrituras a la vez.

> [!consejo] SQLite aguanta más de lo que dicen
>
> Dicho todo lo anterior, la fama de "SQLite es solo para juguetes" es injusta y hace que mucha gente monte un servidor de base de datos que no necesita.
>
> Las lecturas **no se bloquean entre sí**, y la inmensa mayoría de las páginas de un sitio solo leen. Un blog, una documentación, un panel interno de veinte personas: SQLite va sobrado, y va rápido, porque no hay red por medio.
>
> Además, buena parte del problema de arriba se quita con un ajuste:
>
> ```python
> 'OPTIONS': {
>     'init_command': 'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;',
> },
> ```
>
> El modo WAL deja que **las lecturas sigan mientras alguien escribe**, que es lo que estrangula el modo por defecto. No convierte SQLite en PostgreSQL, pero mueve bastante el listón.
>
> Los cuatro momentos en que el cambio sí está justificado: **varias escrituras simultáneas de verdad**, **varios procesos de la aplicación** (que es lo normal en producción, y en ese caso el fichero tiene que estar en un disco compartido, que es donde SQLite se porta peor), **copias de seguridad en caliente sin parar el sitio**, y **el español**, que es lo que viene ahora.

## La segunda: PostgreSQL te dice que no

```salida
nombre de 500 letras en un campo de 100:
  SQLite:      guardado, longitud real: 500
  PostgreSQL:  DataError: value too long for type character varying(100)
```

Esto es más grave de lo que parece. **SQLite se traga el dato y lo devuelve entero**, porque no aplica los límites de longitud: para él, `varchar(100)` es una sugerencia.

O sea que `max_length` en SQLite **solo existe en la validación de Django**, que es la del bloque D. Todo lo que no pase por un formulario —una importación, un `update`, un `bulk_create`, el intérprete— puede meter lo que quiera.

Y la consecuencia real: un proyecto desarrollado sobre SQLite puede tener datos que **no caben en producción**, y enterarse al migrar.

Esta es la diferencia que menos se menciona y la que más tiempo cuesta cuando aparece. El motivo de fondo es que SQLite tiene tipos flexibles por diseño, mientras que PostgreSQL comprueba todo en la base de datos.

La moraleja práctica es la de siempre: **desarrollar con el mismo motor que producción.** Es la misma idea de la lección 40 sobre minimizar las diferencias entre entornos, aplicada a lo que más duele.

## La tercera: el español

Aquí es donde el cambio se nota de verdad. Primero, el orden alfabético, que la lección 12 midió mal en SQLite:

```salida
PostgreSQL:  ['Álvaro Ruiz', 'ana lopez', 'Beatriz', 'Íñigo Ñuño', 'Óscar Paz', 'Zacarías']
```

**Correcto.** La A con tilde entre las A, la I con tilde donde va, sin mayúsculas antes que minúsculas. SQLite dejaba los acentos al final, detrás de la Z. Esto sale gratis, sin tocar nada, porque PostgreSQL ordena según la configuración regional de la base de datos.

Las búsquedas, en cambio, mejoran a medias:

```salida
icontains('íñigo')  -> ['Íñigo Ñuño']     (en SQLite: [])
icontains('oscar')  -> []
```

La primera línea es una mejora real: PostgreSQL **sí entiende mayúsculas y minúsculas en Unicode**, así que `íñigo` encuentra a Íñigo. SQLite no podía.

La segunda sigue fallando, y es normal: quitar tildes no lo hace ninguna base de datos por defecto, porque `o` y `ó` son letras distintas. Lo que pasa es que PostgreSQL trae una extensión para eso:

```sql
CREATE EXTENSION unaccent;
```

```python
Contacto.objects.filter(nombre__unaccent__icontains=termino)
```

```salida
unaccent__icontains('oscar')   -> ['Óscar Paz']
unaccent__icontains('inigo')   -> ['Íñigo Ñuño']
unaccent__icontains('NUNO')    -> ['Íñigo Ñuño']
unaccent__icontains('alvaro')  -> ['Álvaro Ruiz']
unaccent__icontains('Óscar')   -> ['Óscar Paz']
```

Los cinco. Y fíjate en lo que eso significa: **el campo normalizado de la lección 37 sobra**. Todo aquello —el campo extra, el `save()` que lo rellena, la migración de datos, el cuidado con `bulk_create`— era un apaño para suplir lo que SQLite no hace. Con PostgreSQL se borra y se escribe una palabra en la consulta.

Hace falta poner `'django.contrib.postgres'` en `INSTALLED_APPS`, y la extensión se instala con una migración (`CreateExtension`) para que esté también en la base de pruebas.

## Búsqueda de texto completo

Esto ya no es "lo mismo pero mejor": es algo que SQLite no tiene. Y tiene un detalle que casi nadie cuenta. Mira cómo trocea PostgreSQL la misma frase con dos configuraciones:

```salida
frase: 'Reunión sobre los presupuestos de marketing y las campañas'

english:  'campaña':9 'de':5 'las':8 'los':3 'market':6 'presupuesto':4 'reunión':1 'sobr':2 'y':7
spanish:  'campañ':9 'marketing':6 'presupuest':4 'reunion':1
```

Nueve piezas contra cuatro, y la diferencia lo explica todo:

**Las palabras vacías.** La configuración en español tira `de`, `los`, `las` y `y`, que no aportan nada. La inglesa las guarda como si fueran términos buscables, y además se come la e de `sobre` aplicándole reglas inglesas.

**Las raíces.** En español, `presupuestos` se reduce a `presupuest` y `campañas` a `campañ`, así que buscar `presupuesto` encuentra `presupuestos` y al revés. En inglés no, porque no conoce los plurales españoles.

**Las tildes.** `reunión` se guarda como `reunion`. O sea que **en español la búsqueda de texto completo ya es insensible a tildes**, sin `unaccent`.

Por eso el ajuste importa:

```python
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank

vector = SearchVector('nombre', 'notas', config='spanish')
consulta = SearchQuery(termino, config='spanish')
Contacto.objects.annotate(v=vector).filter(v=consulta).annotate(
    relevancia=SearchRank(vector, consulta)
).order_by('-relevancia')
```

Ese `config='spanish'` **hay que ponerlo en los dos sitios**, en el vector y en la consulta, o se troceará el texto con unas reglas y la búsqueda con otras, y no coincidirán. Es el fallo número uno de esta parte, y falla en silencio: devuelve menos resultados de los que debería.

Con eso se llega a lo que la lección 37 no podía: **relevancia**. Y para las erratas, `TrigramSimilarity`, que necesita la extensión `pg_trgm` y encuentra a Álvarez buscando `Alvares`.

> [!nota] Lo demás que solo tiene PostgreSQL
>
> ```salida
> campos:     ArrayField, HStoreField, CIText/CIChar/CIEmailField,
>             IntegerRangeField, DateRangeField, DateTimeRangeField, DecimalRangeField
> índices:    GinIndex, GistIndex, BrinIndex, BloomIndex, SpGistIndex, HashIndex
> agregados:  ArrayAgg, BoolAnd, BoolOr, Corr, CovarPop, ...
> ```
>
> De esa lista, las tres que más se usan:
>
> **`ArrayField`**, una lista dentro de una columna. Ahorra una tabla intermedia cuando los valores son simples y no se consultan por separado. Úsalo con cuidado: si acabas queriendo buscar por un elemento, lo que querías era una relación.
>
> **`GinIndex`**, que es el índice que hace que la búsqueda de texto completo sea rápida. Sin él, cada búsqueda trocea la tabla entera.
>
> **Los rangos**, para fechas de reserva y periodos de validez, con un operador de solapamiento y una restricción de exclusión que impide guardar dos reservas que se pisan. Eso, a mano, es media tarde y sale mal.
>
> Y algo que ya no diferencia: `JSONField` funciona en los dos desde hace tiempo, igual que la vuelta atrás de las migraciones fallidas (`can_rollback_ddl` es verdadero en ambos).

> [!aviso] Los cuatro sitios donde el cambio se nota
>
> El ORM tapa casi todo, pero no todo.
>
> **El SQL escrito a mano** con `raw()` o `connection.cursor()`. Los dialectos no coinciden.
>
> **Las funciones de base de datos.** SQLite tiene `strftime`, PostgreSQL tiene `to_char`. El ORM las abstrae, pero si has usado `RawSQL`, ahí está.
>
> **Las migraciones con `RunSQL`.** Las de `RunPython` de la lección 10 pasan tal cual, porque son Python. Las de SQL, no.
>
> **Las diferencias de comportamiento sutiles.** El orden alfabético cambia, así que una prueba que comprobaba el primer elemento de una lista ordenada puede fallar. Y ahora hay errores nuevos: el `DataError` de las longitudes es el que más aparece al migrar datos viejos.
>
> De ahí la recomendación: **cambiar pronto, no al final.** El cambio en sí es de cinco minutos; lo que cuesta es descubrir en el despliegue que había cuatro sitios así.

> [!resumen] En resumen
>
> Cambiar de motor es instalar `psycopg` y reescribir el diccionario de la base de datos: las mismas migraciones aplican sin tocar modelos ni consultas, que es para lo que sirve el ORM. Lo que se gana se mide en tres cosas. La concurrencia: SQLite permite un escritor a la vez, y dos hilos escribiendo dan un `database is locked` tras cinco segundos, mientras que ocho hilos con trabajo dentro de la transacción tardan ocho veces más sin fallar, que es el síntoma que se ve en producción antes de que aparezca el error. El rigor con los tipos: SQLite guarda un nombre de quinientas letras en un campo de cien y lo devuelve entero, porque para él las longitudes son una sugerencia, así que un proyecto desarrollado sobre SQLite puede tener datos que no caben en producción. Y el español: el orden alfabético sale correcto sin configurar nada, las búsquedas entienden mayúsculas y minúsculas con tildes, y la extensión `unaccent` hace innecesario el campo normalizado de la lección 37. Encima aparece la búsqueda de texto completo, que con la configuración en español quita las palabras vacías, reduce las palabras a su raíz y normaliza las tildes, reduciendo una frase de nueve piezas a cuatro; la configuración hay que indicarla en el vector y en la consulta, o la búsqueda falla en silencio. SQLite, con el modo WAL activado, aguanta mucho más de lo que dice su fama, y el cambio se justifica con escrituras simultáneas, varios procesos, copias en caliente o el idioma.

> [!ejercicio] Practica
>
> 1. Levanta PostgreSQL, crea una base de datos y apunta ahí los ajustes. Comprueba que las migraciones aplican sin cambiar nada.
> 2. Guarda un texto más largo que el `max_length` de un campo en los dos motores y compara.
> 3. Reproduce el `database is locked`: una transacción larga en un hilo y una escritura en otro.
> 4. Mide ocho hilos escribiendo a la vez en los dos motores.
> 5. Activa el modo WAL en SQLite y repite la medida anterior.
> 6. Ordena una lista de nombres con tildes en los dos motores y compara el resultado.
> 7. Instala `unaccent` con una migración y busca `oscar`, `inigo` y `alvaro`.
> 8. Borra el campo normalizado de la lección 37 y comprueba que la búsqueda sigue funcionando.
> 9. Monta una búsqueda de texto completo con relevancia y compara los resultados con y sin `config='spanish'`.
> 10. Mira el resultado de `to_tsvector` con las dos configuraciones sobre una frase tuya.
