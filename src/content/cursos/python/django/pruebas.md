---
titulo: "Pruebas"
resumen: "Probar que una vista cerrada no responde `200`, que la lista no tiene el problema N+1, y que el correo de recuperación lleva el enlace dentro."
minutos: 18
orden: 39
---

La lección 23 del módulo 2 ya enseñó a escribir pruebas con `unittest` y con `pytest`, así que lo de aquí no es empezar de cero: es ver qué añade Django encima. Y añade bastante, porque probar una aplicación web tiene dos problemas que un programa normal no tiene: hace falta una base de datos, y hace falta hablar con las vistas por HTTP.

Django resuelve los dos, y de paso deja probar tres cosas que en este módulo se han medido a mano y que conviene tener vigiladas: que las vistas cerradas siguen cerradas, que las consultas no se disparan, y que el correo sale.

> [!objetivo] Qué vas a aprender
>
> Escribir pruebas de modelos y de vistas con el cliente de pruebas, elegir entre las tres clases de caso, usar `setUpTestData` y saber por qué, probar accesos y permisos, detectar el problema N+1 automáticamente, y comprobar el correo sin enviarlo.

## La primera

Django busca las pruebas en cualquier fichero que empiece por `test`, así que el `tests.py` que `startapp` dejó vacío en la lección 6 es el sitio, y cuando crece se parte en un paquete `tests/`:

```python title="contactos/tests.py"
from django.test import TestCase

from .models import Contacto


class ContactoTest(TestCase):
        def test_str(self):
                contacto = Contacto.objects.create(nombre='Ana', correo='ana@t.es')
        self.assertEqual(str(contacto), 'Ana')
```

```bash
python manage.py test
```

```salida
Creating test database for alias 'default'...
Operations to perform:
  Apply all migrations: ...
  Applying contactos.0005_contacto_busqueda... OK
.
Ran 1 test in 0.014s

OK
Destroying test database for alias 'default'...
```

Fíjate en la primera línea y en la última, que es donde está lo importante: **Django crea una base de datos nueva, aplica todas las migraciones, ejecuta las pruebas y la borra**. No se toca la base de datos de desarrollo, y no hace falta preparar nada.

Con SQLite esa base se crea **en memoria**, lo que la hace muy rápida. Es la razón de que un proyecto pequeño pueda tener cientos de pruebas y tardar un segundo.

Y el paso de las migraciones no es gratis: es, de hecho, una prueba de que tus migraciones aplican limpias desde cero. Más de un proyecto se ha enterado ahí de que tenía una migración rota.

> [!aviso] Las pruebas son la prueba de que las migraciones funcionan
>
> Ese `Applying ...` de arriba corre **todas** las migraciones en orden sobre una base vacía. Si una depende de datos que ya estaban, o si dos ramas dejaron migraciones incompatibles, aquí se ve.
>
> En desarrollo no se nota porque tu base ya tiene aplicado todo lo viejo y solo aplicas lo nuevo. En el servidor, al desplegar por primera vez, se aplica todo de golpe, y ahí es donde duele.

## El cliente de pruebas

Es lo que Django añade y lo que hace que probar vistas sea razonable: un navegador de mentira que llega hasta las vistas sin red y sin servidor.

```python
class VistaTest(TestCase):
        def test_lista_responde(self):
                respuesta = self.client.get(reverse('contactos:lista'))
        self.assertEqual(respuesta.status_code, 200)
        self.assertTemplateUsed(respuesta, 'contactos/lista.html')

    def test_detalle_inexistente(self):
                respuesta = self.client.get('/contactos/99999/')
        self.assertEqual(respuesta.status_code, 404)
```

`self.client` está puesto solo en cualquier `TestCase`. Y el `reverse` de la lección 21 es importante aquí: **una prueba que escribe la dirección a mano se rompe al cambiarla**, que es justo lo contrario de lo que quieres.

Las comprobaciones que Django añade son las que hacen falta:

| Comprobación | Qué mira |
| --- | --- |
| `assertContains(r, texto)` | Que el texto está en la respuesta, y que el estado es `200` |
| `assertNotContains(r, texto)` | Que no está |
| `assertRedirects(r, url)` | Que redirige ahí, y que el destino existe |
| `assertTemplateUsed(r, nombre)` | Qué plantilla se usó |
| `assertFormError(f, campo, error)` | Que el formulario tiene ese error en ese campo |
| `assertNumQueries(n)` | Cuántas consultas se hicieron |

Y cuando fallan, dicen por qué con todo el detalle:

```salida
AssertionError: False is not true : Couldn't find 'Un texto que no esta'
in the following response
b'\n<!doctype html>\n<html lang="es">\n<head>\n ... <h1>Contactos (0)</h1>\n ...'
```

Te da la respuesta entera. Ese `Contactos (0)` de ahí dentro es la pista de la mitad de los fallos: la prueba no ve el texto **porque no hay datos**, y no porque la plantilla esté mal.

## La deuda de la lección 33

La lección 33 cerró vistas con decoradores y mixins, y avisó de que un mixin colocado en el orden equivocado deja la página abierta sin decir nada. Esto es lo que lo detecta:

```python
class AccesoTest(TestCase):
        @classmethod
    def setUpTestData(cls):
                cls.usuario = U.objects.create_user('ana', 'ana@t.es', 'clave-larga-123')

    def test_anonimo_no_entra(self):
                respuesta = self.client.get(reverse('contactos:privada'))
        self.assertEqual(respuesta.status_code, 302)

    def test_anonimo_redirige_al_login_con_next(self):
                url = reverse('contactos:privada')
        self.assertRedirects(self.client.get(url), f'/cuentas/login/?next={url}')

    def test_identificado_entra(self):
                self.client.force_login(self.usuario)
        self.assertEqual(self.client.get(reverse('contactos:privada')).status_code, 200)
```

```salida
anónimo       -> 302 /cuentas/login/?next=/contactos/privada/
identificado  -> 200
```

Tres pruebas cortas, y entre las tres queda sujeto lo que importa: que sin identificar no se entra, que se redirige **al sitio correcto y con el `next` puesto**, y que identificado sí se entra. Si alguien mueve un mixin de sitio, la primera falla.

`force_login` identifica sin pasar por el formulario, que es lo que quieres en casi todas las pruebas. `login(username=..., password=...)` existe y hace el ciclo entero, y se reserva para probar el propio inicio de sesión, porque va más lento: comprueba la contraseña de verdad, con su hasheo.

> [!consejo] Las cuatro pruebas de una vista con permisos
>
> Para cada vista cerrada hay cuatro casos, y el que más se olvida es el tercero:
>
> 1. **Anónimo**: `302` al inicio de sesión.
> 2. **Identificado sin permiso**: `302` o `403`, según lleve `raise_exception`.
> 3. **Identificado con permiso pero sobre algo ajeno**: `404`, que es lo que sale de filtrar el `queryset` por propietario, como se midió en la lección 33.
> 4. **Identificado con permiso sobre lo suyo**: `200`.
>
> El tercero es el que distingue una aplicación con permisos de una con un cartel de permisos. Sin él, es perfectamente posible tener una vista que comprueba que estás identificado y te deja editar los contactos de cualquiera.
>
> Y merece la pena escribir esas cuatro como una función reutilizable, porque son las mismas para cada vista.

## `assertNumQueries`

Esta es la que convierte el problema N+1 del bloque B en algo que se vigila solo:

```python
def test_n_mas_1(self):
        with self.assertNumQueries(11):
                for c in Contacto.objects.all():
                        _ = c.grupo.nombre

def test_resuelto(self):
        with self.assertNumQueries(1):
                for c in Contacto.objects.select_related('grupo'):
                        _ = c.grupo.nombre

def test_la_vista_no_tiene_n_mas_1(self):
        with self.assertNumQueries(2):
                self.client.get(reverse('contactos:cbv-lista'))
```

Las tres pasan, con diez contactos: once consultas sin `select_related`, una con él, y dos en la vista paginada, que son el recuento y los datos de la lección 36.

Lo valioso es la tercera. El N+1 **no rompe nada**: la página sale bien, solo que lenta, y lenta de una forma que depende de cuántas filas haya. En desarrollo hay diez filas y nadie lo nota; en producción hay diez mil.

Con `assertNumQueries` puesto, el día que alguien quite un `select_related` de la vista **la prueba falla**, y falla diciendo el número exacto. Es de las pruebas con mejor relación entre lo que cuesta escribirla y lo que atrapa.

Una advertencia de uso: no la pongas en todas partes, porque el número cambia con cualquier cosa y acabas con pruebas que fallan por nada. Va en las vistas de lista, que son donde el N+1 aparece.

## El correo

En pruebas, Django cambia el backend de correo solo:

```salida
backend en pruebas: django.core.mail.backends.locmem
```

Los mensajes se quedan en una lista, y con eso la lección 38 se puede comprobar entera:

```python
def test_correo_de_recuperacion(self):
        self.client.post('/cuentas/password_reset/', {'email': 'ana@t.es'})
    self.assertEqual(len(mail.outbox), 1)
    self.assertIn('/cuentas/reset/', mail.outbox[0].body)
```

```salida
correos: 1
```

Nada de esto toca un servidor de correo. Y se puede ir más lejos: sacar el enlace del cuerpo con una expresión regular, seguirlo con el cliente, cambiar la contraseña y comprobar que la nueva sirve para entrar. Esa prueba cubre las cinco vistas encadenadas de la lección 32 de una sentada, y es el tipo de prueba que más tranquilidad da, porque es un recorrido que nadie repite a mano cada semana.

## Las tres clases

| Clase | Base de datos | Cuándo |
| --- | --- | --- |
| `SimpleTestCase` | Prohibida | Formularios sin modelo, filtros de plantilla, utilidades |
| `TestCase` | Sí, con vuelta atrás | Casi siempre |
| `TransactionTestCase` | Sí, borrando tablas | Cuando pruebas transacciones o `select_for_update` |

`SimpleTestCase` no es que no tenga base de datos: es que **la prohíbe**.

```salida
DatabaseOperationForbidden: Database queries to 'default' are not allowed
in SimpleTestCase subclasses. Either subclass TestCase or ...
```

Eso está bien pensado. Si crees que algo no toca la base de datos, esta clase te lo confirma, y es bastante más rápida.

`TestCase` es la de siempre. Mete cada prueba en una transacción y la deshace al acabar, que es lo que da el aislamiento:

```python
def test_aislamiento_a(self):
        Contacto.objects.create(nombre='X', correo='x@t.es')
    self.assertEqual(Contacto.objects.count(), 1)

def test_aislamiento_b(self):
        self.assertEqual(Contacto.objects.count(), 0)
```

Las dos pasan. Y esto es más importante de lo que parece: **cada prueba empieza limpia**, así que el orden en que se ejecuten no importa, y una prueba no puede depender de lo que hizo otra. Una suite donde eso no se cumple es una suite que falla los martes.

## `setUpTestData`

El método que Django añade y que hay que usar en lugar de `setUp` para los datos:

```python
@classmethod
def setUpTestData(cls):
        cls.grupo = Grupo.objects.create(nombre='Prueba')
```

La diferencia es cuántas veces se ejecuta. `setUp` corre **antes de cada prueba**; `setUpTestData` corre **una vez por clase**. Con cinco pruebas que necesitan doscientas filas:

```salida
con setUp:          0.096s
con setUpTestData:  0.022s
```

Cuatro veces más rápido, y la diferencia crece con el número de pruebas. En una suite grande es la diferencia entre lanzarlas al guardar y lanzarlas cuando te acuerdas.

Y la pregunta obvia: si los objetos se comparten entre pruebas, ¿no se pisan?

```python
def test_a_lo_cambia(self):
        self.contacto.nombre = 'Cambiado en memoria'

def test_b_lo_ve(self):
        self.assertEqual(self.contacto.nombre, 'Original')
```

```salida
en el segundo test: Original
```

No. Django hace una copia profunda de esos atributos para cada prueba, precisamente para que esto no pase. Fue un problema real en versiones antiguas y está resuelto.

> [!nota] Qué probar y qué no
>
> La respuesta corta: **lo que has escrito tú**.
>
> No hace falta probar que `CharField` guarda texto, que `ListView` pagina o que `login_required` redirige. Eso lo prueba Django, y con muchísima más gente mirándolo.
>
> Lo que sí, por orden de rentabilidad:
>
> **La lógica de negocio.** Los métodos de los modelos, los `clean()` del bloque D, las funciones que calculan. Es lo más fácil de probar y donde más fallos hay.
>
> **Los accesos.** Las cuatro pruebas de arriba, para cada vista cerrada. Un fallo aquí no es un error: es una filtración.
>
> **Los caminos que atraviesan varias piezas.** Registro, recuperación de contraseña, el formulario que guarda y redirige. Son los que nadie repite a mano.
>
> **Cada fallo que aparezca.** Antes de arreglarlo, una prueba que lo reproduzca. Así el fallo no vuelve, y la suite acaba cubriendo justo lo que en tu proyecto se rompe.
>
> Lo que no hace falta: perseguir un porcentaje de cobertura. Una suite con un 60% en los sitios correctos vale más que una con 95% que prueba sobre todo cosas de Django.

> [!consejo] Lanzarlas de otras formas
>
> ```bash
> python manage.py test contactos              # solo una aplicación
> python manage.py test contactos.tests.VistaTest.test_lista_responde
> python manage.py test --keepdb               # no recrea la base
> python manage.py test --parallel             # reparte entre varios procesos
> python manage.py test --failfast             # para en el primer fallo
> ```
>
> `--keepdb` es el que más se agradece a diario: se salta el `Applying ...` de todas las migraciones, que en un proyecto con cien migraciones son varios segundos en cada tanda. Conviene lanzarlas sin él de vez en cuando, y siempre en integración continua, que es justo donde quieres que las migraciones se apliquen desde cero.
>
> Y el otro camino: mucha gente usa **pytest** con `pytest-django` en lugar de esto. Da funciones en vez de clases, `assert` a secas en vez de los `assertAlgo`, y un sistema de accesorios más flexible. Las clases de Django siguen funcionando igual dentro, así que no es una decisión que cierre puertas; es cuestión de gusto y de lo que use el equipo.

> [!resumen] En resumen
>
> Django crea una base de datos nueva para las pruebas, aplica todas las migraciones y la borra al terminar, lo que de paso comprueba que las migraciones aplican limpias desde cero. El cliente de pruebas es un navegador de mentira que llega a las vistas sin red, y trae comprobaciones propias para el contenido, las redirecciones, las plantillas, los errores de formulario y el número de consultas; las direcciones se generan con `reverse`, no a mano. Con eso se salda la deuda de la lección 33: tres pruebas cortas sujetan que sin identificar no se entra, que se redirige al sitio correcto con el `next` puesto y que identificado sí se entra, y para cada vista cerrada conviene añadir el caso que más se olvida, el del usuario que tiene permiso pero pide algo ajeno. La comprobación del número de consultas convierte el problema N+1 en algo que se vigila solo, porque ese fallo no rompe nada y solo se nota cuando hay datos de verdad. El correo se comprueba sin enviarlo, porque Django cambia el backend automáticamente y deja los mensajes en una lista. Hay tres clases de caso: la que prohíbe la base de datos, la habitual, que mete cada prueba en una transacción y la deshace para que el orden no importe, y la que hace falta para probar transacciones. Y los datos se crean en `setUpTestData`, que corre una vez por clase en lugar de una vez por prueba y hace la suite cuatro veces más rápida, sin que las modificaciones de una prueba se filtren a la siguiente.

> [!ejercicio] Practica
>
> 1. Escribe una prueba del `__str__` de un modelo y lánzala. Lee las líneas de creación y borrado de la base.
> 2. Prueba que la lista responde `200` y usa la plantilla que crees.
> 3. Haz fallar una comprobación de contenido a propósito y lee el mensaje entero.
> 4. Escribe las cuatro pruebas de acceso de una vista cerrada, incluida la del objeto ajeno.
> 5. Quita el `select_related` de una vista de lista y comprueba que la prueba del número de consultas falla, y con qué número.
> 6. Prueba el ciclo completo de recuperación de contraseña: pedirla, sacar el enlace del correo, seguirlo, cambiarla y entrar con la nueva.
> 7. Pon una consulta dentro de un `SimpleTestCase` y lee el error.
> 8. Convierte un `setUp` con doscientas filas en `setUpTestData` y cronometra las dos versiones.
> 9. Lanza la suite con y sin `--keepdb` y compara lo que tarda.
