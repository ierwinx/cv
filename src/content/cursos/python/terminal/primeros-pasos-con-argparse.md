---
titulo: "Primeros pasos con argparse"
resumen: "El módulo de la biblioteca estándar que lee la línea de comandos por ti, comprueba lo que falta y escribe la ayuda solo."
minutos: 15
orden: 9
---

La lección anterior terminó con un conversor que funcionaba y con la sensación de que añadirle una sola opción iba a costar más código que el programa entero. Esa sensación es correcta, y es tan vieja como los programas de terminal: leer la línea de comandos parece trivial y no lo es.

Por eso la biblioteca estándar trae `argparse`. Le describes qué espera tu programa y él se encarga del resto: partir la línea, comprobar que están todos los argumentos obligatorios, quejarse con un mensaje decente cuando no, convertir los valores y **escribir la ayuda de `-h` por su cuenta**. No hay que instalar nada.

> [!objetivo] Qué vas a aprender
>
> Montar el esqueleto mínimo de `argparse`, declarar argumentos posicionales, leer el resultado de `parse_args()`, entender la ayuda que se genera sola y los errores automáticos con su código de salida, y reescribir con todo ello el conversor de la lección anterior.

## El esqueleto mínimo

Son cuatro pasos, siempre los mismos:

```python title="saludo.py"
"""Saluda a alguien por su nombre."""

import argparse

analizador = argparse.ArgumentParser(description="Saluda a alguien por su nombre.")
analizador.add_argument("nombre", help="a quién hay que saludar")
argumentos = analizador.parse_args()

print(f"Hola, {argumentos.nombre}.")
```

Leídos de arriba abajo:

1. **Crear el analizador** con `argparse.ArgumentParser()`. El `description` es la frase que saldrá en la ayuda explicando para qué sirve el programa.
2. **Declarar qué espera**, un `add_argument` por cada cosa. El primer parámetro es el nombre y el `help` es la línea que lo describirá en la ayuda.
3. **Analizar la línea** con `parse_args()`. Aquí es donde ocurre todo el trabajo.
4. **Usar el resultado**, que es un objeto con un atributo por argumento declarado.

Funciona igual que la versión a mano:

```bash
python3 saludo.py Erwin
```

```salida
Hola, Erwin.
```

## Lo que devuelve `parse_args()`

Un objeto `Namespace`, que no es más que una cajita con los valores puestos como atributos. Mirémoslo por dentro:

```python title="inspeccion.py"
import argparse

analizador = argparse.ArgumentParser(description="Enseña lo que devuelve parse_args.")
analizador.add_argument("origen")
analizador.add_argument("destino")
argumentos = analizador.parse_args()

print(argumentos)
print(type(argumentos))
print(argumentos.origen)
print(vars(argumentos))
```

```bash
python3 inspeccion.py informe.md informe.html
```

```salida
Namespace(origen='informe.md', destino='informe.html')
<class 'argparse.Namespace'>
informe.md
{'origen': 'informe.md', 'destino': 'informe.html'}
```

Es decir: **el nombre que le das en `add_argument` es el nombre del atributo**. No hay índices ni posiciones que recordar; el `sys.argv[2]` de antes se convierte en `argumentos.destino`, que se lee solo.

> [!nota] `vars()` convierte el `Namespace` en diccionario
>
> Es una función de Python, no de `argparse`, y devuelve los atributos de cualquier objeto como un diccionario. Viene bien para volcar la configuración al depurar, o para pasársela a una función tuya con `**vars(argumentos)`. Con `Namespace` a secas basta el 99 % del tiempo.

## La ayuda sale gratis

Esto es lo que más se agradece. Sin escribir una línea más, tu programa ya entiende `-h`:

```bash
python3 saludo.py -h
```

```salida
usage: saludo.py [-h] nombre

Saluda a alguien por su nombre.

positional arguments:
  nombre      a quién hay que saludar

options:
  -h, --help  show this help message and exit
```

Desmenuzando la salida:

- La línea `usage:` la construye `argparse` con lo que has declarado. El `saludo.py` de delante sale de `sys.argv[0]`, así que **si renombras el fichero, la ayuda se actualiza sola**. Los corchetes de `[-h]` significan "esto es opcional"; `nombre`, sin corchetes, es obligatorio.
- Debajo va el `description` que le pasaste al constructor.
- Después, un apartado por cada tipo de argumento, con su `help` alineado en columnas.
- El `-h, --help` aparece sin que lo declares: `argparse` lo añade a todos los analizadores.

Esa ayuda es la documentación de tu programa y se mantiene sola al día, porque sale de la misma declaración que usa el código. Es imposible que se quede obsoleta.

> [!consejo] Pon siempre `help` en cada argumento
>
> No es obligatorio: sin él, el argumento aparece igualmente en la ayuda, pero con la línea en blanco al lado. Escribir esa frase cuesta cinco segundos y es la diferencia entre una herramienta usable y una adivinanza. En la última lección del tema verás cómo cuidar estos textos en serio.

## Los errores también salen gratis

Lanza el programa sin el argumento obligatorio:

```bash
python3 saludo.py
```

```salida
usage: saludo.py [-h] nombre
saludo.py: error: the following arguments are required: nombre
```

Compara eso con el `IndexError` y su traceback de la lección anterior. Aquí hay un recordatorio de cómo se usa el programa, el nombre del programa y qué falta exactamente. Y si sobran argumentos:

```bash
python3 saludo.py Ana Luis
```

```salida
usage: saludo.py [-h] nombre
saludo.py: error: unrecognized arguments: Luis
```

En los dos casos `argparse` imprime el mensaje y **termina el programa por su cuenta**: las líneas que van después de `parse_args()` no llegan a ejecutarse. No tienes que comprobar nada ni salir tú.

> [!nota] El código de salida es 2, no 1
>
> Al fallar el análisis de los argumentos, `argparse` sale con el código 2. Es una convención muy antigua de los programas de terminal: el 1 significa "he intentado hacer mi trabajo y ha salido mal" y el 2 significa "ni siquiera he podido empezar porque me has invocado mal". Compruébalo en tu terminal ejecutando `echo $?` justo después de una invocación fallida. Que distinga los dos casos es una ventaja gratis para quien use tu programa dentro de un script.

> [!aviso] Los mensajes automáticos están en inglés
>
> `argparse` toma sus textos del idioma del sistema, y en la práctica casi siempre salen en inglés. Se pueden traducir, pero requiere tocar el mecanismo de internacionalización de Python y no compensa para una herramienta propia. Lo que sí está en tu mano, y es lo que de verdad lee la gente, son el `description`, los `help` y los mensajes que imprimes tú. Escribe esos en el idioma de tu programa.

## Varios argumentos posicionales

Se declaran uno detrás de otro, y **el orden en que los declaras es el orden en que hay que escribirlos**:

```python
analizador.add_argument("cantidad", help="el número que hay que convertir")
analizador.add_argument("origen", help="unidad de partida: m, km, milla, pie o pulgada")
analizador.add_argument("destino", help="unidad de llegada")
```

`argparse` los reparte por posición, igual que harías tú con `sys.argv[1]`, `sys.argv[2]` y `sys.argv[3]`, pero contando él y avisando cuando la cuenta no sale.

## El conversor, reescrito

Este es el mismo programa de la lección anterior, con `argparse` en lugar de la comprobación a mano:

```python title="conversor.py"
"""Convierte una cantidad entre unidades de longitud."""

import argparse
import sys

METROS_POR_UNIDAD = {
    "m": 1.0,
    "km": 1000.0,
    "milla": 1609.344,
    "pie": 0.3048,
    "pulgada": 0.0254,
}


def convertir(cantidad: float, origen: str, destino: str) -> float:
        """Pasa la cantidad de la unidad de origen a la de destino."""
    metros = cantidad * METROS_POR_UNIDAD[origen]
    return metros / METROS_POR_UNIDAD[destino]


def main() -> None:
        analizador = argparse.ArgumentParser(
        description="Convierte una cantidad entre unidades de longitud.",
    )
    analizador.add_argument("cantidad", help="el número que hay que convertir")
    analizador.add_argument("origen", help="unidad de partida: m, km, milla, pie o pulgada")
    analizador.add_argument("destino", help="unidad de llegada")
    argumentos = analizador.parse_args()

    try:
                cantidad = float(argumentos.cantidad)
    except ValueError:
                print(f"'{argumentos.cantidad}' no es un número.")
        sys.exit(1)

    if argumentos.origen not in METROS_POR_UNIDAD or argumentos.destino not in METROS_POR_UNIDAD:
                print(f"Unidad desconocida. Usa una de: {', '.join(METROS_POR_UNIDAD)}")
        sys.exit(1)

    resultado = convertir(cantidad, argumentos.origen, argumentos.destino)
    print(f"{cantidad:g} {argumentos.origen} = {resultado:.4g} {argumentos.destino}")


if __name__ == "__main__":
        main()
```

Hace exactamente lo mismo que antes:

```bash
python3 conversor.py 42 km milla
```

```salida
42 km = 26.1 milla
```

Pero ahora tiene ayuda, que antes no tenía:

```bash
python3 conversor.py -h
```

```salida
usage: conversor.py [-h] cantidad origen destino

Convierte una cantidad entre unidades de longitud.

positional arguments:
  cantidad    el número que hay que convertir
  origen      unidad de partida: m, km, milla, pie o pulgada
  destino     unidad de llegada

options:
  -h, --help  show this help message and exit
```

Y el control de la cantidad de argumentos es mucho más fino. Antes, cualquier número distinto de tres daba el mismo mensaje de uso; ahora `argparse` dice exactamente cuáles faltan:

```bash
python3 conversor.py 42
```

```salida
usage: conversor.py [-h] cantidad origen destino
conversor.py: error: the following arguments are required: origen, destino
```

```bash
python3 conversor.py 42 km milla extra
```

```salida
usage: conversor.py [-h] cantidad origen destino
conversor.py: error: unrecognized arguments: extra
```

### Qué ha cambiado y qué no

| Antes, a mano | Ahora, con `argparse` |
| --- | --- |
| `if len(sys.argv) != 4` y un mensaje de uso escrito a mano | Nada: lo comprueba `parse_args()` |
| `sys.argv[2]`, hay que recordar qué había en cada posición | `argumentos.origen` |
| El texto de uso se escribe y se mantiene aparte | La ayuda sale de los `add_argument` |
| No hay `-h` | `-h` funciona desde el primer día |
| Sale con código 1 pase lo que pase | Sale con código 2 al invocarlo mal |

Lo que **no** ha cambiado es el bloque del `float()` y el de las unidades. Esas dos comprobaciones siguen hechas a mano, y no hace falta: `argparse` sabe convertir a número y sabe limitar los valores admitidos. Lo verás en la lección de tipos y validación, y las dos desaparecerán del código.

> [!aviso] El orden sigue importando
>
> `argparse` reparte los posicionales por su posición, no por su significado. Si inviertes dos, el programa no se queja: simplemente hace otra cosa.
>
> ```bash
> python3 conversor.py km 42 milla
> ```
>
> ```salida
> 'km' no es un número.
> ```
>
> El mensaje es correcto, pero llega de rebote. Cuando un programa tiene más de dos o tres posicionales, o cuando son del mismo tipo y se pueden confundir, la solución es convertir algunos en opciones con nombre, que es justo la lección siguiente.

## El mapa de lo que viene

Todo lo que se puede configurar de un argumento va en `add_argument`. De momento has visto uno, `help`, y este es el panorama completo:

| Parámetro | Para qué | Dónde se ve |
| --- | --- | --- |
| `help` | La línea que describe el argumento en la ayuda | Esta lección |
| `default` | Valor si no lo escriben | Opciones y banderas |
| `action` | Qué hacer con el argumento: guardarlo, contarlo, acumularlo | Opciones y banderas |
| `type` | A qué convertirlo antes de guardarlo | Tipos y validación |
| `choices` | Los únicos valores admitidos | Tipos y validación |
| `nargs` | Cuántos valores consume | Tipos y validación |
| `metavar` | Con qué nombre aparece en la ayuda | Ayuda y documentación |

> [!resumen] En resumen
>
> `argparse` es el módulo de la biblioteca estándar que se ocupa de la línea de comandos. El esqueleto es siempre el mismo: crear un `ArgumentParser` con su `description`, declarar lo que se espera con un `add_argument` por argumento, llamar a `parse_args()` y leer el resultado, que es un `Namespace` con un atributo por argumento declarado y con el mismo nombre. A cambio de esas cuatro líneas obtienes tres cosas que antes había que escribir a mano: la comprobación de los argumentos obligatorios, unos mensajes de error que dicen qué falta y salen con código 2, y una ayuda `-h` completa que se genera a partir de la propia declaración y por tanto nunca se queda desfasada. Los posicionales se reparten por orden de declaración, así que siguen siendo sensibles a que los escribas cambiados, y la conversión de tipos y la validación de valores todavía se quedan fuera; las dos tienen solución dentro de `argparse` y llegan en las próximas lecciones.

> [!ejercicio] Practica
>
> Crea los ficheros indicados y resuelve:
>
> 1. En `saludo.py`, reescribe con `argparse` el saludo de la lección anterior. Ejecútalo con `-h`, sin argumentos y con dos, y comprueba el código de salida en cada caso con `echo $?`.
> 2. En `copiar.py`, declara dos posicionales, `origen` y `destino`, y limítate a imprimir un mensaje que diga qué copiaría. Escribe un `help` para cada uno y un `description` para el programa, y mira cómo queda la ayuda.
> 3. En `inspeccion.py`, imprime el `Namespace` entero, el resultado de `vars()` sobre él y un atributo suelto. Prueba a declarar un argumento llamado `origen` y otro llamado `destino` y comprueba que los nombres de los atributos coinciden.
> 4. Coge `estadisticas.py` del ejercicio 3 de la lección anterior y pásalo a `argparse` con tres posicionales obligatorios. Verás que la cantidad variable de números no encaja con lo visto hasta aquí; déjalo en tres y apunta el problema, que se resuelve con `nargs` dos lecciones más adelante.
> 5. Renombra tu `conversor.py` a `convertir_unidades.py` sin tocar el código, ejecuta `-h` y comprueba que la línea `usage:` se ha actualizado sola.
> 6. Quita el `help` de uno de los argumentos del conversor y vuelve a mirar la ayuda. Decide si te parece aceptable el resultado.
