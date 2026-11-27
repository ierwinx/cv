---
titulo: "Permisos"
resumen: "El permiso de objeto que no se llama en el listado, y la acción propia por la que un desconocido borra la reseña de otro."
minutos: 17
orden: 18
---

La lección anterior resolvió **quién eres**. Esta resuelve **qué puedes hacer**, y es donde están los agujeros de verdad, porque un permiso mal puesto no da error: da acceso.

Y hay dos casos concretos que la gente cree cubiertos y no lo están. Los dos se pueden medir.

> [!objetivo] Qué vas a aprender
>
> Usar los permisos que trae DRF y escribir los propios, saber exactamente cuándo se llama a cada método, conocer los dos agujeros que deja el modelo de permisos de objeto, y decidir entre esconder y prohibir.

## Los que trae

```python
class LibroViewSet(viewsets.ModelViewSet):
        permission_classes = [permissions.IsAuthenticated]
```

| Permiso | Qué hace |
| --- | --- |
| `AllowAny` | Todos. **Es el de fábrica** |
| `IsAuthenticated` | Solo identificados |
| `IsAdminUser` | Solo con `is_staff` |
| `IsAuthenticatedOrReadOnly` | Todos leen, los identificados escriben |
| `DjangoModelPermissions` | Los permisos de Django por modelo |
| `DjangoObjectPermissions` | Los mismos, por objeto |

Que `AllowAny` sea el de fábrica es lo de la lección 12: cerrado por defecto en los ajustes, y se abre donde haga falta.

`DjangoModelPermissions` enlaza con la lección 33 del módulo 4 y tiene dos pegas que conviene saber: **exige estar identificado** aunque el permiso de ver sea público, y **no comprueba nada en `GET`**, así que leer queda abierto a cualquier usuario identificado. Si quieres que leer también se controle, hay que subclasificarlo.

## Los propios

Dos métodos, y la diferencia entre ellos es todo:

```python
from rest_framework import permissions


class SoloLecturaOAutor(permissions.BasePermission):
        """Cualquiera lee; solo el autor modifica."""

    def has_object_permission(self, peticion, vista, objeto):
                if peticion.method in permissions.SAFE_METHODS:
                        return True
        return objeto.autor_id == peticion.user.id
```

Funcionando, con un usuario que no es el autor:

```salida
GET   /api/resenas/1/                       -> 200
PATCH /api/resenas/1/  {"texto": "..."}     -> 403
texto: 'Muy bueno'   (sin tocar)
```

Tres detalles del código:

**`SAFE_METHODS`** son `GET`, `HEAD` y `OPTIONS`. Usar la constante y no escribirlos a mano evita olvidarse de alguno.

**`objeto.autor_id` y no `objeto.autor.id`.** La primera lee la columna que ya está cargada; la segunda **hace una consulta**. En un permiso que se ejecuta en cada petición, eso importa.

**`peticion.user.id` y no `peticion.user`.** Comparar objetos funciona y falla con un usuario anónimo, que no tiene identificador pero sí se puede comparar. Con identificadores, un anónimo da `None` y nunca coincide.

## Cuándo se llama a cada método

Aquí está lo que hay que saber de memoria. Espiando las llamadas:

```salida
GET    /api/espia/      (list)      -> ['has_permission']
GET    /api/espia/1/    (retrieve)  -> ['has_permission', 'has_object_permission']
POST   /api/espia/      (create)    -> ['has_permission']
PATCH  /api/espia/1/    (update)    -> ['has_permission', 'has_object_permission']
DELETE /api/espia/1/    (destroy)   -> ['has_permission', 'has_object_permission']
```

**`has_permission` se llama siempre. `has_object_permission` solo cuando hay un objeto.**

Y de ahí salen los dos agujeros.

> [!aviso] Agujero 1: el listado no pasa por el permiso de objeto
>
> `has_object_permission` **no se llama en `list`**. Nunca. Y es lógico —habría que llamarlo una vez por fila, lo que sería lentísimo— y significa que un permiso de objeto **no filtra el listado**:
>
> ```python
> class SoloMias(permissions.BasePermission):
>         def has_object_permission(self, peticion, vista, objeto):
>                 return objeto.autor_id == peticion.user.id
> ```
>
> Con eso, `/api/resenas/1/` de otro devuelve `403`. Y `/api/resenas/` devuelve **las de todo el mundo**, porque ese método no se ejecuta.
>
> Es un fallo de seguridad completo con aspecto de estar resuelto: la prueba obvia —intentar ver la reseña ajena— pasa. La que descubre el problema es contar cuántas devuelve el listado.
>
> La defensa no es un permiso, es el conjunto de datos, que es la lección 15:
>
> ```python
> def get_queryset(self):
>         return Resena.objects.filter(autor=self.request.user)
> ```
>
> **Las dos cosas van juntas y hacen trabajos distintos:**
>
> |  | Qué hace | Qué devuelve |
> | --- | --- | --- |
> | `get_queryset` | Decide qué se ve | Lo que no está, da `404` |
> | `has_object_permission` | Decide qué se puede hacer con lo que se ve | `403` |
>
> Con las dos, quien pida algo ajeno recibe `404` —no sabe si existe— y quien intente modificar algo que sí ve pero no es suyo recibe `403`.
>
> **Con solo la segunda, el listado se lo enseña todo.**
>
> Y la prueba que hay que escribir es esta, no la otra:
>
> ```python
> def test_el_listado_solo_trae_las_mias(self):
>         self.client.force_authenticate(self.beto)
>     respuesta = self.client.get('/api/resenas/')
>     self.assertEqual(respuesta.data['count'], 1)
> ```

> [!aviso] Agujero 2: la acción propia que usa el atajo
>
> El segundo es peor porque no es una limitación del diseño, es una línea de código. La lección 16 lo avisó y aquí está medido.
>
> ```python
> @action(detail=True, methods=['post'])
> def borrar_texto(self, peticion, pk=None):
>         resena = Resena.objects.get(pk=pk)      # el atajo
>     resena.texto = ''
>     resena.save(update_fields=['texto'])
>     return Response({'ok': True})
> ```
>
> El mismo conjunto de vistas, con el mismo permiso puesto, y el mismo usuario que antes recibía `403`:
>
> ```salida
> PATCH /api/resenas/1/               -> 403   (bien)
> POST  /api/resenas/1/borrar_texto/  -> 200
> texto: ''    <- beto acaba de borrar la reseña de ana
> ```
>
> **`Resena.objects.get(pk=pk)` se salta las dos defensas a la vez**: no pasa por `get_queryset` y no dispara `has_object_permission`. Es un objeto sacado directamente de la base de datos.
>
> Una sola palabra lo arregla:
>
> ```python
> resena = self.get_object()
> ```
>
> Ese método hace tres cosas que el atajo no: filtra por `get_queryset`, busca el objeto, y llama a `check_object_permissions`. Las tres.
>
> Lo que hace peligroso a este fallo es que **la acción propia suele escribirse después**, cuando los permisos ya estaban probados y nadie vuelve a mirarlos. Y la prueba de permisos que existe, la del `PATCH`, sigue pasando.
>
> Por eso la regla es sin excepciones: **dentro de un conjunto de vistas, nunca `Modelo.objects.get(pk=pk)`.** Si necesitas un objeto que no es el de la ruta, al menos:
>
> ```python
> otro = get_object_or_404(self.get_queryset(), pk=otro_pk)
> ```

## Componer permisos

Se combinan con operadores, cosa que casi nadie sabe:

```python
permission_classes = [IsAuthenticated & (EsAutor | IsAdminUser)]
permission_classes = [~EsBaneado]
```

Y una lista **son varios `and`**: se cumplen todos. Esto:

```python
permission_classes = [IsAuthenticated, EsAutor]
```

es lo mismo que `IsAuthenticated & EsAutor`. El error clásico es escribir la lista esperando un «o».

Y cuando dependen de la acción, es lo de la lección 16:

```python
def get_permissions(self):
        if self.action in ('list', 'retrieve'):
                return [permissions.AllowAny()]
    if self.action == 'publicar':
                return [EsEditor()]
    return [permissions.IsAdminUser()]
```

Con los paréntesis, que devuelve instancias, y acabando en lo restrictivo.

> [!nota] Esconder o prohibir
>
> Una decisión que hay que tomar a conciencia: cuando alguien pide algo que no le corresponde, ¿`403` o `404`?
>
> **`403` dice "existe y no puedes".** Es más honrado y **confirma que existe**. Con identificadores correlativos, alguien puede recorrer `/api/pedidos/1/` a `/api/pedidos/10000/` y saber cuántos pedidos tienes, aunque no vea ninguno.
>
> **`404` dice "no hay nada aquí".** No filtra nada, y confunde a los usuarios legítimos que sí deberían tener acceso y creen que el recurso desapareció.
>
> La regla que funciona: **`404` cuando la existencia es información sensible** —documentos privados, pedidos, datos de otras empresas— y **`403` cuando no lo es** y ayuda más explicar el motivo.
>
> En DRF, la decisión se implementa sola según dónde pongas la lógica: lo que filtres en `get_queryset` da `404`, y lo que rechaces en el permiso da `403`. Sabiendo eso, se elige.
>
> Y hay un detalle que sorprende: **a un usuario anónimo, DRF le devuelve `401` en lugar de `403`** si hay un esquema de autenticación con cabecera. Es correcto —le está diciendo "identifícate y a lo mejor sí"— y significa que la misma petición da `401` sin token y `403` con uno.

> [!consejo] Los permisos se prueban, y hay una matriz
>
> Es la parte del código donde una prueba rinde más, porque un fallo es silencioso y grave. El patrón es una matriz de quién contra qué:
>
> ```python
> class PermisosResenaTest(APITestCase):
>         @classmethod
>     def setUpTestData(cls):
>                 cls.ana = Usuario.objects.create_user('ana', 'a@t.es', 'clave-larga-123')
>         cls.beto = Usuario.objects.create_user('beto', 'b@t.es', 'clave-larga-123')
>         cls.jefe = Usuario.objects.create_superuser('jefe', 'j@t.es', 'clave-larga-123')
>         cls.resena = Resena.objects.create(libro=..., autor=cls.ana, puntuacion=5)
>
>     def test_matriz(self):
>                 url = f'/api/resenas/{self.resena.pk}/'
>         casos = [
>             (None,      'get',    200),
>             (None,      'patch',  401),
>             (self.beto, 'get',    200),
>             (self.beto, 'patch',  403),
>             (self.ana,  'patch',  200),
>             (self.jefe, 'patch',  200),
>         ]
>         for usuario, metodo, esperado in casos:
>                         with self.subTest(usuario=usuario, metodo=metodo):
>                                 self.client.force_authenticate(usuario)
>                 respuesta = getattr(self.client, metodo)(url, {'puntuacion': 4})
>                 self.assertEqual(respuesta.status_code, esperado)
>
>     def test_el_listado_solo_trae_las_suyas(self):
>                 self.client.force_authenticate(self.beto)
>         self.assertEqual(self.client.get('/api/resenas/').data['count'], 0)
>
>     def test_las_acciones_propias_tambien(self):
>                 self.client.force_authenticate(self.beto)
>         url = f'/api/resenas/{self.resena.pk}/borrar_texto/'
>         self.assertEqual(self.client.post(url).status_code, 403)
> ```
>
> Tres cosas de este patrón:
>
> **El `subTest`** hace que fallen todos los casos que estén mal, no solo el primero, y el mensaje dice cuál.
>
> **El anónimo está en la matriz.** Es el caso que más se olvida y el único que puede probar cualquiera desde fuera.
>
> **Las dos últimas pruebas son las que cubren los dos agujeros de esta lección**, y ninguna de las dos es obvia. Cada acción propia que añadas necesita su línea, y esa es exactamente la disciplina que evita el segundo agujero.

> [!resumen] En resumen
>
> Los permisos son donde están los agujeros de verdad, porque uno mal puesto no da error sino acceso. DRF trae seis, con el permisivo de fábrica, y los de Django por modelo tienen dos pegas: exigen estar identificado y no comprueban nada al leer. Los propios se escriben con dos métodos, comparando identificadores y no objetos para que el usuario anónimo no coincida por accidente. Y lo que hay que saber de memoria es cuándo se llama a cada uno: el general siempre, y el de objeto **solo cuando hay un objeto**, de donde salen los dos agujeros. El primero es que el permiso de objeto **no se llama al listar**, así que filtra el detalle y deja el listado abierto entero, con aspecto de estar resuelto porque la prueba obvia pasa; la defensa es el conjunto de datos, que hace un trabajo distinto y complementario: uno decide qué se ve y da `404`, el otro qué se puede hacer y da `403`. El segundo agujero es una sola línea: una acción propia que busca el objeto con la consulta directa se salta las dos defensas a la vez, y está medido que con ella un usuario cualquiera borra el texto de una reseña ajena mientras la modificación normal le devuelve `403`; se arregla usando el método que busca el objeto pasando por permisos, y la regla es no usar nunca la consulta directa dentro de un conjunto de vistas. Los permisos se componen con operadores, y una lista significa que se cumplen todos. La elección entre esconder y prohibir se implementa según dónde pongas la lógica. Y todo esto se prueba con una matriz de quién contra qué, que incluya al anónimo y una línea por cada acción propia.

> [!ejercicio] Practica
>
> 1. Pon un permiso de objeto y comprueba que la modificación ajena da `403`.
> 2. Cuenta cuántos elementos devuelve el listado con ese mismo permiso.
> 3. Añade el filtro en el conjunto de datos y vuelve a contarlos.
> 4. Comprueba que ahora el detalle ajeno da `404` en vez de `403`, y razona cuál prefieres.
> 5. Espía cuándo se llama a cada método del permiso en las cinco acciones.
> 6. Escribe una acción propia con la consulta directa y compruébalo con un usuario ajeno.
> 7. Cámbiala por el método correcto y vuelve a comprobarlo.
> 8. Compara un objeto de usuario con otro usando objetos y usando identificadores, con un anónimo.
> 9. Compón dos permisos con «o» y comprueba que una lista no hace eso.
> 10. Elige permisos según la acción y comprueba que el caso final es restrictivo.
> 11. Escribe la matriz de permisos con el anónimo dentro.
> 12. Comprueba qué código recibe un anónimo y cuál uno identificado sin permiso.
