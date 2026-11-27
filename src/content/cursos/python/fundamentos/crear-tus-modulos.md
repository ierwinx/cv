---
titulo: "Crear tus propios módulos"
resumen: "Cómo repartir tu programa en varios ficheros importables, para qué sirve __name__ y cómo organizarlos en paquetes."
minutos: 13
orden: 41
---

Un programa que crece acaba siendo un fichero de ochocientas líneas en el que hay que desplazarse un minuto para encontrar una función. Llega un momento en que la solución no es escribir mejores funciones, sino repartirlas en varios ficheros.

Y ahí está la buena noticia: no hace falta aprender nada nuevo. **Cualquier fichero `.py` tuyo ya es un módulo importable**, exactamente igual que `math` o `random`. No hay que declarar nada ni registrarlo en ningún sitio.

## Tu primer módulo

Crea dos ficheros en la misma carpeta. El primero tiene las funciones:

```python title="utilidades.py"
"""Funciones de cálculo que se repiten en toda la tienda."""

IVA_GENERAL = 0.21


def calcular_precio_final(precio, iva=IVA_GENERAL):
        """Devuelve el precio con impuestos incluidos."""
    return precio * (1 + iva)


def formatear_euros(cantidad):
        """Devuelve la cantidad como texto con dos decimales y el símbolo."""
    return f"{cantidad:.2f} €"
```

El segundo lo usa:

```python title="tienda.py"
import utilidades

total = utilidades.calcular_precio_final(49.5)
print(utilidades.formatear_euros(total))
print(utilidades.IVA_GENERAL)
```

Ejecuta el segundo desde el terminal, situado en esa carpeta:

```bash
python3 tienda.py
```

```salida
59.89 €
0.21
```

**El nombre del módulo es el del fichero sin la extensión.** El fichero se llama `utilidades.py`, así que se importa como `utilidades`. Y como es un módulo normal y corriente, admite todas las formas de importación de la lección anterior:

```python
import utilidades                                          # utilidades.calcular_precio_final(...)
from utilidades import calcular_precio_final                # calcular_precio_final(...)
from utilidades import calcular_precio_final, IVA_GENERAL   # varias cosas
import utilidades as util                                   # util.calcular_precio_final(...)
```

> [!nota] Dónde busca Python tus módulos
>
> Primero, en la carpeta desde la que has lanzado el programa. Después, en las carpetas de la biblioteca estándar y en las de los paquetes instalados. Por eso, mientras los dos ficheros estén juntos y ejecutes desde ahí, todo funciona. Si el módulo está en otra carpeta cualquiera, no lo encontrará, y ahí es donde entran los paquetes que verás más abajo.

## El problema: importar ejecuta el fichero entero

Importar no es "leer las definiciones". Es **ejecutar el fichero de arriba abajo**. Las líneas `def` definen funciones, sí, pero cualquier otra cosa que haya suelta también se ejecuta.

Imagina que durante el desarrollo dejaste una prueba al final de `utilidades.py`:

```python title="utilidades.py"
IVA_GENERAL = 0.21


def calcular_precio_final(precio, iva=IVA_GENERAL):
        return precio * (1 + iva)


print("Probando la función:", calcular_precio_final(100))
```

```python title="tienda.py"
import utilidades

print("Empieza la tienda")
print(f"{utilidades.calcular_precio_final(49.5):.2f}")
```

```bash
python3 tienda.py
```

```salida
Probando la función: 121.0
Empieza la tienda
59.89
```

La prueba se ejecuta al importar, antes incluso de la primera línea de `tienda.py`. En un módulo pequeño es un mensaje molesto; en uno que pida datos por teclado o borre algo, es un desastre.

## Qué es `__name__`

Para resolverlo, Python le pone a cada módulo una variable especial llamada `__name__`, con guiones bajos dobles a los lados. Su valor depende de **cómo se esté usando el fichero**:

- Si el fichero es el que has lanzado directamente, `__name__` vale `"__main__"`.
- Si el fichero ha llegado ahí porque otro lo ha importado, `__name__` vale el nombre del módulo, es decir, el del fichero sin `.py`.

Compruébalo. Pon una línea en cada fichero:

```python title="utilidades.py"
print("utilidades.py dice que __name__ vale:", __name__)
```

```python title="tienda.py"
import utilidades

print("tienda.py dice que __name__ vale:", __name__)
```

```bash
python3 tienda.py
```

```salida
utilidades.py dice que __name__ vale: utilidades
tienda.py dice que __name__ vale: __main__
```

El mismo `utilidades.py`, ejecutado directamente, dice otra cosa:

```bash
python3 utilidades.py
```

```salida
utilidades.py dice que __name__ vale: __main__
```

Es decir, `__name__` le permite a un fichero saber si es el protagonista o un secundario. `"__main__"` significa literalmente "yo soy el programa principal".

## `if __name__ == "__main__":`

Con eso, la solución es una línea de código:

```python title="utilidades.py"
"""Funciones de cálculo que se repiten en toda la tienda."""

IVA_GENERAL = 0.21


def calcular_precio_final(precio, iva=IVA_GENERAL):
        """Devuelve el precio con impuestos incluidos."""
    return precio * (1 + iva)


def formatear_euros(cantidad):
        """Devuelve la cantidad como texto con dos decimales y el símbolo."""
    return f"{cantidad:.2f} €"


if __name__ == "__main__":
        print("Pruebas rápidas de utilidades.py")
    print(calcular_precio_final(100))
    print(formatear_euros(59.895))
```

Todo lo que esté dentro de ese `if` se ejecuta solo cuando lanzas el fichero directamente:

```bash
python3 utilidades.py
```

```salida
Pruebas rápidas de utilidades.py
121.0
59.90 €
```

Y se salta por completo cuando lo importa otro:

```python title="tienda.py"
from utilidades import calcular_precio_final, formatear_euros

carrito = [19.99, 49.50, 7.25]

for precio in carrito:
        print(formatear_euros(calcular_precio_final(precio)))
```

```bash
python3 tienda.py
```

```salida
24.19 €
59.89 €
8.77 €
```

> [!consejo] Ponlo en todos tus ficheros ejecutables
>
> La costumbre en Python es que **todo fichero tenga sus definiciones arriba y su programa principal dentro del `if __name__ == "__main__":` al final**, aunque hoy no pienses importarlo. Cuesta una línea y convierte cualquier programa en un módulo reutilizable. Es esa línea críptica que has visto en medio mundo del código Python y que ya no tiene ningún misterio: no es una fórmula mágica, es una comparación de una variable con un texto.

## Organizar en paquetes

Cuando los módulos empiezan a ser muchos, se agrupan en carpetas. Una carpeta con módulos dentro es un **paquete**, y se importa con puntos, un punto por cada nivel:

```texto title="codigo"
proyecto/
    principal.py
    tienda/
        __init__.py
        calculos.py
        formatos.py
```

```python title="proyecto/tienda/calculos.py"
IVA_GENERAL = 0.21


def calcular_precio_final(precio, iva=IVA_GENERAL):
        return precio * (1 + iva)
```

```python title="proyecto/tienda/formatos.py"
def formatear_euros(cantidad):
        return f"{cantidad:.2f} €"
```

```python title="proyecto/principal.py"
from tienda.calculos import calcular_precio_final
from tienda.formatos import formatear_euros

print(formatear_euros(calcular_precio_final(49.5)))
```

```bash
python3 principal.py
```

```salida
59.89 €
```

`tienda.calculos` se lee como "el módulo `calculos` que está dentro del paquete `tienda`". La estructura de carpetas y la ruta de importación son la misma cosa.

### El papel de `__init__.py`

Es un fichero, normalmente vacío, que marca la carpeta como paquete. Cumple dos funciones:

- **Señalar la intención.** Desde Python 3.3 una carpeta sin `__init__.py` también se puede importar, pero se comporta de otra manera en casos raros. Ponlo: es gratis y evita sorpresas.
- **Definir la cara pública del paquete.** Como se ejecuta al importar el paquete, se usa para subir a primer plano lo más importante y ahorrar rutas largas a quien lo use.

```python title="proyecto/tienda/__init__.py"
"""Paquete con la lógica de la tienda."""

from tienda.calculos import calcular_precio_final
```

Con eso, quien use el paquete puede escribir directamente:

```python title="proyecto/principal.py"
import tienda
from tienda.formatos import formatear_euros

print(formatear_euros(tienda.calcular_precio_final(49.5)))
```

```salida
59.89 €
```

> [!nota] La carpeta `__pycache__`
>
> En cuanto importes un módulo tuyo verás aparecer una carpeta `__pycache__` con ficheros `.pyc` dentro. Es una versión precompilada de tus módulos que Python guarda para arrancar más rápido la próxima vez. No la toques, no la edites y no la subas a un repositorio: se regenera sola. Si usas git, añade `__pycache__/` a tu fichero `.gitignore`.

## No llames a tus ficheros como módulos de la biblioteca estándar

Este es, probablemente, el error más desconcertante de toda la lección, porque el fallo aparece en un sitio que no tiene nada que ver con lo que has tocado.

Recuerda que Python busca primero en la carpeta desde la que ejecutas. Si tienes un `random.py` tuyo, **el tuyo gana**, y todo el que pida `import random` recibirá el tuyo en lugar del de la biblioteca estándar.

```python title="random.py"
numeros_de_la_suerte = [7, 13, 22]
```

```python title="sorteo.py"
import random

print(random.randint(1, 10))
```

```bash
python3 sorteo.py
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/curso-python/sorteo.py", line 3, in <module>
    print(random.randint(1, 10))
          ^^^^^^^^^^^^^^
AttributeError: module 'random' has no attribute 'randint' (consider renaming '/Users/erwin/curso-python/random.py' since it has the same name as the standard library module named 'random' and prevents importing that standard library module)
```

> [!aviso] Los nombres que nunca debes usar para tus ficheros
>
> Las versiones modernas de Python te avisan de la causa, como en el mensaje de arriba, pero no siempre fue así y el error puede aparecer en un módulo tercero que ni siquiera sabías que usaba `random` por dentro.
>
> Evita estos nombres de fichero: `random.py`, `math.py`, `string.py`, `time.py`, `datetime.py`, `json.py`, `os.py`, `sys.py`, `email.py`, `csv.py`, `types.py`, `test.py` y `copy.py`. Ponles nombres específicos de tu proyecto: `mis_sorteos.py`, `calculos_tienda.py`, `fechas_factura.py`.
>
> Y si el error ya te ha pasado, acuérdate de borrar también el `__pycache__`: el `.pyc` del fichero culpable puede seguir dando guerra después de renombrarlo.

> [!resumen] En resumen
>
> Cualquier fichero `.py` tuyo es un módulo, y se importa por el nombre del fichero sin la extensión siempre que esté en la carpeta desde la que ejecutas. Importar ejecuta el fichero entero, así que el código suelto que tengas ahí se lanzará sin que lo pidas; la solución es la variable `__name__`, que vale `"__main__"` cuando el fichero es el que has lanzado y el nombre del módulo cuando lo ha importado otro. Metiendo el programa principal dentro de `if __name__ == "__main__":` consigues un fichero que funciona como programa y como biblioteca a la vez. Los módulos se agrupan en carpetas con un `__init__.py`, que las marca como paquete y se importan con puntos. Y nunca le pongas a un fichero tuyo el nombre de un módulo de la biblioteca estándar.

> [!ejercicio] Practica
>
> Trabaja en una carpeta nueva y resuelve:
>
> 1. Crea `41-utilidades.py` con tres funciones tuyas de lecciones anteriores y un `41-modulos.py` que las importe con `import` y las use con el punto.
> 2. Cambia la importación a `from 41_utilidades import ...`. Verás que el nombre no vale porque empieza por número: renombra el módulo a `utilidades.py` y comprueba por qué las reglas de los nombres de variable se aplican también a los ficheros importables.
> 3. Pon un `print` suelto al final de `utilidades.py`, ejecuta el programa principal y observa cuándo sale ese mensaje.
> 4. Añade `if __name__ == "__main__":` al módulo, mete dentro unas pruebas de tus funciones y comprueba que salen al ejecutarlo directo y no al importarlo.
> 5. Imprime `__name__` en los dos ficheros y ejecuta cada uno por separado para ver los cuatro valores posibles.
> 6. Crea un paquete `tienda/` con un `__init__.py` y dos módulos dentro, e impórtalos desde un `principal.py` que esté fuera de la carpeta.
> 7. Crea un fichero llamado `math.py` con una variable cualquiera, y en otro fichero de la misma carpeta intenta usar `math.sqrt(9)`. Lee el error, bórralo todo y no vuelvas a hacerlo nunca.
