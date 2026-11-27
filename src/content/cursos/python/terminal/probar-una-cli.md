---
titulo: "Probar una CLI"
resumen: "Pruebas automáticas con pytest para el núcleo, el análisis de argumentos, la salida por pantalla y los códigos de salida."
minutos: 26
orden: 23
---

Mientras un programa es tuyo y de hoy, probarlo consiste en ejecutarlo y mirar. Funciona porque solo hay una persona afectada por los fallos y porque te acuerdas de todo lo que hace.

En cuanto alguien instala tu herramienta, eso se acaba. Un cambio en la validación del importe puede romper el subcomando `resumen` sin que te enteres, porque hace tres semanas que no lo ejecutas. Y la persona que se lo encuentre roto no va a mandarte un informe detallado: va a desinstalarlo.

Las pruebas automáticas son la respuesta. No son un ejercicio de pulcritud: son la única forma de cambiar código con la certeza de que lo demás sigue en pie.

> [!objetivo] Qué vas a aprender
>
> Al terminar sabrás escribir pruebas con `pytest` para el núcleo de tu herramienta, para el análisis de argumentos sin tocar `sys.argv`, para lo que se imprime en pantalla y para el código de salida, además de ejecutar el programa entero como un proceso.

## Del `assert` a `pytest`

Ya conoces `assert`. Es una instrucción de Python que comprueba una condición y lanza `AssertionError` si no se cumple:

```python title="assert_suelto.py"
def calcular_iva(precio, tipo=0.21):
        return precio + tipo


assert calcular_iva(100) == 121.0, "El IVA general de 100 debería dar 121"
print("Todo correcto")
```

```bash
python3 assert_suelto.py
```

```salida
Traceback (most recent call last):
  File "/Users/erwin/pruebas/assert_suelto.py", line 5, in <module>
    assert calcular_iva(100) == 121.0, "El IVA general de 100 debería dar 121"
           ^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: El IVA general de 100 debería dar 121
```

Sirve para comprobar una cosa, pero tiene dos límites evidentes: el programa se para en el primer fallo, así que no llegas a saber si el segundo `assert` también fallaba, y no hay ningún informe de conjunto.

### `unittest`, el de la biblioteca estándar

Python trae desde siempre un marco de pruebas llamado `unittest`. Las pruebas son métodos de una clase que hereda de `unittest.TestCase`, y las comprobaciones se hacen con métodos con nombre propio:

```python title="test_con_unittest.py"
import unittest


def calcular_iva(precio, tipo=0.21):
        return precio * (1 + tipo)


class PruebasDelIva(unittest.TestCase):
        def test_iva_general(self):
                self.assertEqual(calcular_iva(100), 121.0)

    def test_iva_reducido(self):
                self.assertAlmostEqual(calcular_iva(100, 0.10), 110.0)

    def test_precio_negativo(self):
                self.assertLess(calcular_iva(-100), 0)


if __name__ == "__main__":
        unittest.main()
```

```bash
python3 test_con_unittest.py
```

```salida
...
----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```

Cada punto es una prueba que ha pasado. Funciona, no hay que instalar nada, y si algún día heredas un proyecto con pruebas así sabrás leerlas. Pero tiene una pega de forma: obliga a una clase para cada grupo de pruebas y a recordar los nombres de treinta métodos distintos (`assertEqual`, `assertIn`, `assertRaises`, `assertAlmostEqual`) para hacer comparaciones que en Python normal se escriben con `==`, `in` y poco más.

### `pytest`

Es una biblioteca externa, se instala con pip y es lo que usa prácticamente todo el mundo:

```bash
pip install pytest
```

Sus reglas caben en tres líneas:

- Las pruebas son **funciones** cuyo nombre empieza por `test_`, en ficheros cuyo nombre empieza por `test_`.
- Las comprobaciones se hacen con `assert` a secas.
- Se ejecuta escribiendo `pytest`, sin argumentos, y él busca los ficheros solo.

Las mismas tres pruebas de antes:

```python title="test_iva.py"
def calcular_iva(precio, tipo=0.21):
        """Devuelve el precio con el IVA incluido."""
    return precio * (1 + tipo)


def test_iva_general():
        assert calcular_iva(100) == 121.0


def test_iva_reducido():
        assert calcular_iva(100, 0.10) == 110.0


def test_iva_de_cero_no_cambia_el_precio():
        assert calcular_iva(100, 0) == 100
```

```bash
pytest
```

```salida
============================= test session starts ==============================
platform darwin -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: /Users/erwin/pruebas
collected 3 items

test_iva.py .F.                                                          [100%]

=================================== FAILURES ===================================
______________________________ test_iva_reducido _______________________________

    def test_iva_reducido():
>       assert calcular_iva(100, 0.10) == 110.0
E       assert 110.00000000000001 == 110.0
E        +  where 110.00000000000001 = calcular_iva(100, 0.1)

test_iva.py:11: AssertionError
=========================== short test summary info ============================
FAILED test_iva_reducido - assert 110.00000000000001 == 110.0
========================= 1 failed, 2 passed in 0.01s ==========================
```

Mira lo que ha hecho con el fallo. Ha ejecutado las tres pruebas aunque una fallara, ha marcado con `>` la línea exacta del `assert`, y en las líneas que empiezan por `E` ha **desmontado la expresión**: te dice que el lado izquierdo valía `110.00000000000001`, y de dónde salía ese número. No has tenido que escribir `assertAlmostEqual` ni un mensaje explicativo: `pytest` reescribe los `assert` por dentro para poder contarte esto.

Y el fallo es real, no un despiste: es el mismo problema de los decimales en coma flotante que viste en el módulo 1. Para comparar números con decimales, `pytest` trae una función que admite un margen:

```python title="test_iva.py"
import pytest


def test_iva_reducido():
        assert calcular_iva(100, 0.10) == pytest.approx(110.0)
```

```bash
pytest -q
```

```salida
...                                                                      [100%]
3 passed in 0.00s
```

Las opciones que más vas a usar:

| Orden | Qué hace |
| --- | --- |
| `pytest` | Ejecuta todas las pruebas |
| `pytest -q` | Modo breve, solo el resumen |
| `pytest -v` | Modo detallado, una línea por prueba con su nombre |
| `pytest tests/test_cli.py` | Solo ese fichero |
| `pytest -k categoria` | Solo las pruebas cuyo nombre contenga ese texto |
| `pytest -x` | Se para en el primer fallo |
| `pytest --lf` | Solo las que fallaron la última vez |

## Probar el núcleo

Volvemos a `misgastos`. Aquí se cobra el trabajo de la lección 20: como `modelo.py` no imprime ni pregunta nada, probarlo es llamar a una función y comparar el resultado. No hay que simular una terminal, ni capturar nada, ni preparar ficheros.

```python title="tests/test_modelo.py"
"""Pruebas del núcleo: no hace falta ni terminal ni ficheros."""

from decimal import Decimal

import pytest

from misgastos.modelo import Gasto, filtrar, total, total_por_categoria


def test_un_gasto_valido_se_crea():
        gasto = Gasto("Café", Decimal("1.60"), "comida")
    assert gasto.concepto == "Café"
    assert gasto.importe == Decimal("1.60")
    assert gasto.categoria == "comida"


def test_el_concepto_se_limpia_de_espacios():
        assert Gasto("  Café  ", Decimal("1.60")).concepto == "Café"


def test_el_concepto_vacio_se_rechaza():
        with pytest.raises(ValueError):
                Gasto("   ", Decimal("1.60"))


def test_el_importe_negativo_se_rechaza():
        with pytest.raises(ValueError, match="debe ser positivo"):
                Gasto("Devolución", Decimal("-3.00"))


def test_la_categoria_desconocida_se_rechaza():
        with pytest.raises(ValueError, match="Categoría desconocida"):
                Gasto("Cuota del gimnasio", Decimal("30.00"), "deporte")


def test_total_de_una_lista_vacia_es_cero():
        assert total([]) == 0


def test_total_suma_los_importes():
        gastos = [Gasto("Café", Decimal("1.60")), Gasto("Metro", Decimal("2.40"))]
    assert total(gastos) == Decimal("4.00")     # exacto, por ser Decimal


def test_total_por_categoria_agrupa_y_ordena():
        gastos = [
        Gasto("Café", Decimal("1.60"), "comida"),
        Gasto("Metro", Decimal("2.40"), "transporte"),
        Gasto("Compra", Decimal("54.20"), "comida"),
    ]
    resultado = total_por_categoria(gastos)
    assert list(resultado) == ["comida", "transporte"]
    assert resultado["comida"] == Decimal("55.80")


def test_filtrar_sin_categoria_devuelve_todo():
        gastos = [Gasto("Café", Decimal("1.60"), "comida"),
              Gasto("Metro", Decimal("2.40"), "transporte")]
    assert filtrar(gastos) == gastos


def test_filtrar_por_categoria():
        gastos = [Gasto("Café", Decimal("1.60"), "comida"),
              Gasto("Metro", Decimal("2.40"), "transporte")]
    assert [gasto.concepto for gasto in filtrar(gastos, "comida")] == ["Café"]
```

Tres cosas que aparecen aquí y conviene fijar:

- **`pytest.raises` comprueba que algo lanza una excepción.** Dentro del `with` va el código que debería fallar; si no falla, la prueba falla. Es el equivalente en pruebas del `try`/`except` que ya conoces.
- **`match` compara el mensaje de la excepción** con una expresión regular, y basta con que aparezca en algún sitio del texto. Sin él, cualquier `ValueError` valdría, incluso uno lanzado por un motivo distinto del que quieres comprobar.
- **Los nombres de las pruebas son frases.** No `test_gasto_1` sino `test_el_importe_negativo_se_rechaza`, porque cuando una falle vas a leer ese nombre en el informe y quieres entenderlo sin abrir el fichero.

## Probar el análisis de argumentos

Un analizador de `argparse` lee de `sys.argv`, que es la lista de argumentos con los que se lanzó el programa. Podrías modificar `sys.argv` desde la prueba, pero es una variable global y toquetearla trae problemas.

No hace falta. `parse_args` acepta una lista, y si se la pasas, ignora `sys.argv` por completo:

```python title="tests/test_cli.py"
from decimal import Decimal

from misgastos.cli import crear_analizador


def test_el_analizador_lee_un_subcomando_con_sus_valores():
        argumentos = crear_analizador().parse_args(["anadir", "Café", "1.60", "-c", "comida"])
    assert argumentos.comando == "anadir"
    assert argumentos.concepto == "Café"
    assert argumentos.importe == Decimal("1.60")
    assert argumentos.categoria == "comida"


def test_el_importe_llega_convertido_a_decimal():
        argumentos = crear_analizador().parse_args(["anadir", "Metro", "2.40"])
    assert isinstance(argumentos.importe, Decimal)


def test_la_categoria_por_defecto_es_otros():
        argumentos = crear_analizador().parse_args(["anadir", "Metro", "2.40"])
    assert argumentos.categoria == "otros"
```

Cada elemento de la lista es un argumento tal como lo separaría la terminal. Por eso `"Café"` va suelto pero un concepto con espacios iría también en un solo elemento: la lista es lo que llega **después** de que la terminal haya interpretado las comillas.

Esto prueba cosas que a mano se comprueban mal: que `type=Decimal` está puesto y convierte, que el valor por defecto es el que crees y que el nombre del atributo es el que esperas. Y ahora se ve por qué en la lección 20 `crear_analizador` era una función aparte: si el analizador se construyera dentro de `main`, no habría forma de llegar hasta él.

## Comprobar el código de salida

Cuando `argparse` encuentra un argumento inválido, escribe el error y llama a `sys.exit(2)`. Eso lanza la excepción `SystemExit`, que se captura igual que cualquier otra:

```python title="tests/test_cli.py"
import pytest

from misgastos.cli import crear_analizador


def test_una_categoria_invalida_aborta_con_codigo_2():
        with pytest.raises(SystemExit) as salida:
                crear_analizador().parse_args(["anadir", "Gimnasio", "30", "-c", "deporte"])
    assert salida.value.code == 2


def test_sin_subcomando_aborta_con_codigo_2():
        with pytest.raises(SystemExit) as salida:
                crear_analizador().parse_args([])
    assert salida.value.code == 2
```

El `as salida` guarda información sobre la excepción capturada, y `salida.value` es el objeto `SystemExit` en sí, con su atributo `code`. Ese `2` es el código que `argparse` usa siempre para "me has dado mal los argumentos", frente al `1` que tu programa devuelve para "los argumentos estaban bien pero algo ha fallado".

> [!nota] Por qué `SystemExit` no es un error del programa
>
> `SystemExit` hereda de `BaseException` y no de `Exception`, precisamente para que un `except Exception:` puesto por ahí no la capture por accidente e impida que el programa termine. En las pruebas eso da igual, porque `pytest.raises` la atrapa sin problema.

## Comprobar lo que se imprime con `capsys`

Falta la mitad interesante de una herramienta de terminal: lo que sale por pantalla. `pytest` lo resuelve con `capsys`, que se pide escribiéndolo como parámetro de la función de prueba.

Eso de pedir algo poniéndolo como parámetro se llama **fixture** y es la idea central de `pytest`: hay una lista de recursos disponibles, y una prueba recibe los que nombra en su firma. No hay que importarlos ni crearlos.

```python title="tests/test_cli.py"
from misgastos.cli import main


def test_anadir_escribe_el_fichero_y_avisa(tmp_path, capsys):
        ruta = tmp_path / "gastos.json"

    codigo = main(["-f", str(ruta), "anadir", "Café", "1.60", "-c", "comida"])

    assert codigo == 0
    assert ruta.exists()
    assert capsys.readouterr().out == "Apuntado: Café (1.60 €, comida)\n"


def test_listar_sin_datos_lo_dice(tmp_path, capsys):
        codigo = main(["-f", str(tmp_path / "gastos.json"), "listar"])

    assert codigo == 0
    assert capsys.readouterr().out == "No hay gastos apuntados.\n"


def test_un_importe_negativo_devuelve_1_y_escribe_en_stderr(tmp_path, capsys):
        codigo = main(["-f", str(tmp_path / "gastos.json"), "anadir", "Devolución", "-3"])

    capturado = capsys.readouterr()
    assert codigo == 1
    assert capturado.out == ""
    assert "debe ser positivo" in capturado.err
```

`capsys.readouterr()` devuelve un objeto con dos atributos, `out` y `err`, que son todo lo que se ha escrito en la salida estándar y en la de error desde la última vez que lo llamaste. Esa última parte importa: **leer vacía el búfer**, así que si llamas dos veces, la segunda solo trae lo nuevo.

Fíjate en la última prueba, que comprueba tres cosas a la vez: el código devuelto es 1, no se ha escrito nada en la salida normal y el mensaje está en la de error. Es exactamente el contrato que hace que tu herramienta se pueda usar dentro de una tubería, y no hay forma razonable de comprobarlo a ojo.

Y fíjate también en que estas pruebas llaman a `main` con una lista, que es lo mismo que hacía `parse_args`. Por eso `main` se escribió con `argv=None` como parámetro.

> [!consejo] Compara el texto exacto cuando puedas
>
> `assert capturado.out == "Apuntado: Café (1.60 €, comida)\n"` es mejor prueba que `assert "Apuntado" in capturado.out`, porque detecta que se ha colado un espacio de más o que el importe ha dejado de salir con dos decimales. Deja el `in` para cuando el texto sea largo o contenga algo variable, como una ruta o una fecha.

## Ficheros temporales con `tmp_path`

En las pruebas anteriores ya estaba: `tmp_path` es otra fixture, y es una carpeta vacía y nueva para cada prueba, que `pytest` crea y limpia sola. Es un objeto `Path`, así que se usa con el operador `/` que ya conoces de `pathlib`.

```python title="tests/test_almacen.py"
"""Pruebas de la persistencia, con ficheros temporales."""

from decimal import Decimal

from misgastos.almacen import cargar, guardar
from misgastos.modelo import Gasto


def test_cargar_un_fichero_que_no_existe_da_lista_vacia(tmp_path):
        assert cargar(tmp_path / "no-existe.json") == []


def test_el_viaje_de_ida_y_vuelta_no_pierde_nada(tmp_path):
        ruta = tmp_path / "gastos.json"
    originales = [Gasto("Café", Decimal("1.60"), "comida"),
                  Gasto("Metro", Decimal("2.40"), "transporte")]

    guardar(ruta, originales)
    recuperados = cargar(ruta)

    assert recuperados == originales


def test_guardar_crea_las_carpetas_que_falten(tmp_path):
        ruta = tmp_path / "datos" / "2026" / "gastos.json"

    guardar(ruta, [Gasto("Café", Decimal("1.60"), "comida")])

    assert ruta.exists()
    assert "Café" in ruta.read_text(encoding="utf-8")
```

La ventaja frente a crear un `prueba.json` a mano es doble. Cada prueba tiene su carpeta, así que no pueden pisarse entre ellas ni depender del orden en que se ejecuten. Y no se acumula basura en tu proyecto: `pytest` guarda las últimas ejecuciones en una carpeta temporal del sistema y va borrando las viejas.

La comparación de la segunda prueba, `recuperados == originales`, funciona porque `Gasto` es una dataclass y las dataclasses comparan campo a campo. Es una sola línea y comprueba el ciclo entero de escritura y lectura.

> [!aviso] Nunca escribas en rutas fijas dentro de una prueba
>
> Una prueba que hace `guardar(Path("gastos.json"), ...)` escribe en la carpeta desde la que hayas lanzado `pytest`, machaca tus datos reales si resulta que estabas ahí, y falla de forma distinta según quién la ejecute. `tmp_path` cuesta una palabra y elimina el problema entero.

## Ejecutar el programa entero como un proceso

Todo lo anterior llama a funciones de Python. Queda una cosa por comprobar: que el programa **arranca**. Si el punto de entrada está mal escrito o falta una importación en `__main__.py`, ninguna de las pruebas anteriores se entera, porque todas importan los módulos directamente.

Para eso se lanza el programa de verdad, como un proceso aparte, con `subprocess.run`:

```python title="tests/test_cli.py"
import subprocess
import sys


def test_el_programa_entero_funciona_como_proceso(tmp_path):
        proceso = subprocess.run(
        [sys.executable, "-m", "misgastos", "-f", str(tmp_path / "gastos.json"), "listar"],
        capture_output=True,
        text=True,
    )

    assert proceso.returncode == 0
    assert proceso.stdout == "No hay gastos apuntados.\n"
    assert proceso.stderr == ""


def test_el_comando_instalado_responde_a_version():
        proceso = subprocess.run(["misgastos", "--version"], capture_output=True, text=True)

    assert proceso.returncode == 0
    assert proceso.stdout.startswith("misgastos ")
```

Los detalles que hay que conocer de `subprocess.run`:

- **El primer argumento es una lista**, no una cadena. Cada elemento es un argumento, igual que en `parse_args`, y así no hay que preocuparse de comillas ni de espacios en las rutas.
- **`sys.executable`** es la ruta del intérprete que está ejecutando las pruebas. Escribir `"python"` a secas sería confiar en que el `PATH` apunte al del entorno, y eso falla en cuanto haya dos entornos por medio.
- **`capture_output=True`** guarda la salida en vez de dejarla escapar a la pantalla. Sin él, `proceso.stdout` sería `None`.
- **`text=True`** hace que la salida llegue como cadenas en vez de como bytes.
- **`proceso.returncode`** es el código de salida, que es lo que ves con `echo $?` en la terminal.

Estas dos pruebas son lentas comparadas con las demás, porque cada una arranca un intérprete entero. Por eso se escriben pocas: una o dos que comprueben que el programa arranca y responde, y todo lo demás llamando a las funciones.

> [!nota] La segunda prueba depende de que el paquete esté instalado
>
> `test_el_comando_instalado_responde_a_version` busca el ejecutable `misgastos` en el `PATH`, así que solo pasa si has hecho `pip install -e .` en el entorno activo. Eso es deliberado: comprueba que el punto de entrada del `pyproject.toml` es correcto, que es justo lo que no comprueba ninguna otra prueba.

## Organizar la carpeta `tests/`

La convención es un fichero de pruebas por módulo, con el mismo nombre y el prefijo `test_`:

```text
misgastos/
├── src/
│   └── misgastos/
│       ├── __init__.py
│       ├── __main__.py
│       ├── almacen.py
│       ├── cli.py
│       └── modelo.py
├── tests/
│   ├── test_almacen.py
│   ├── test_cli.py
│   └── test_modelo.py
└── pyproject.toml
```

La carpeta `tests/` va fuera de `src/`, como hermana del paquete, por lo que viste en la lección 20: las pruebas no se instalan. Y **no lleva `__init__.py`**: no es un paquete, es una carpeta de ficheros sueltos que `pytest` encuentra por el nombre.

Se le puede decir a `pytest` dónde buscar añadiendo una tabla al `pyproject.toml`:

```text title="pyproject.toml"
[tool.pytest.ini_options]
testpaths = ["tests"]
```

Con eso, `pytest` a secas ya no recorre el proyecto entero buscando ficheros que empiecen por `test_`, sino que va directo a esa carpeta. En un proyecto pequeño ahorra poco tiempo, pero evita que un fichero suelto de pruebas que dejaste en otro sitio se ejecute sin que lo esperes.

## La ejecución completa

Con las tres carpetas en su sitio y el paquete instalado con `pip install -e .`:

```bash
pytest
```

```salida
============================= test session starts ==============================
platform darwin -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: /Users/erwin/proyectos/misgastos
configfile: pyproject.toml
testpaths: tests
collected 24 items

tests/test_almacen.py ...                                                [ 12%]
tests/test_cli.py ...........                                            [ 58%]
tests/test_modelo.py ..........                                          [100%]

============================== 24 passed in 0.20s ==============================
```

Veinticuatro pruebas en dos décimas de segundo. Eso es lo que puedes ejecutar después de cada cambio sin que te dé pereza, y esa es la única característica de un conjunto de pruebas que de verdad importa: si tarda dos minutos, dejarás de lanzarlo.

En modo detallado se ven los nombres, que por eso se escribieron como frases:

```bash
pytest -v tests/test_cli.py
```

```salida
============================= test session starts ==============================
platform darwin -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0 -- /Users/erwin/proyectos/misgastos/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/erwin/proyectos/misgastos
configfile: pyproject.toml
collecting ... collected 11 items

tests/test_cli.py::test_el_analizador_lee_un_subcomando_con_sus_valores PASSED [  9%]
tests/test_cli.py::test_el_importe_llega_convertido_a_decimal PASSED     [ 18%]
tests/test_cli.py::test_la_categoria_por_defecto_es_otros PASSED         [ 27%]
tests/test_cli.py::test_una_categoria_invalida_aborta_con_codigo_2 PASSED [ 36%]
tests/test_cli.py::test_sin_subcomando_aborta_con_codigo_2 PASSED        [ 45%]
tests/test_cli.py::test_anadir_escribe_el_fichero_y_avisa PASSED         [ 54%]
tests/test_cli.py::test_listar_sin_datos_lo_dice PASSED                  [ 63%]
tests/test_cli.py::test_resumen_agrupa_por_categoria PASSED              [ 72%]
tests/test_cli.py::test_un_importe_negativo_devuelve_1_y_escribe_en_stderr PASSED [ 81%]
tests/test_cli.py::test_el_programa_entero_funciona_como_proceso PASSED  [ 90%]
tests/test_cli.py::test_el_comando_instalado_responde_a_version PASSED   [100%]

============================== 11 passed in 0.11s ==============================
```

Y se puede filtrar por nombre para ejecutar solo lo que estás tocando:

```bash
pytest -k categoria
```

```salida
============================= test session starts ==============================
platform darwin -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: /Users/erwin/proyectos/misgastos
configfile: pyproject.toml
testpaths: tests
collected 24 items / 17 deselected / 7 selected

tests/test_cli.py ...                                                    [ 42%]
tests/test_modelo.py ....                                                [100%]

======================= 7 passed, 17 deselected in 0.02s =======================
```

> [!error] ModuleNotFoundError: No module named 'misgastos'
>
> El error más habitual al empezar con pruebas en un proyecto con disposición `src/`:
>
> ```salida
> tests/test_modelo.py:5: in <module>
>     from misgastos.modelo import Gasto, filtrar, total, total_por_categoria
> E   ModuleNotFoundError: No module named 'misgastos'
> =========================== short test summary info ============================
> ERROR tests/test_almacen.py
> ERROR tests/test_cli.py
> ERROR tests/test_modelo.py
> !!!!!!!!!!!!!!!!!!! Interrupted: 3 errors during collection !!!!!!!!!!!!!!!!!!!!
> ```
>
> No has instalado el paquete en el entorno. Las pruebas están en `tests/`, el código en `src/`, y no hay ninguna relación entre las dos carpetas salvo la instalación. La solución es `pip install -e .` con el entorno activado.
>
> Fíjate en que falla en la fase de recolección, antes de ejecutar nada: `pytest` ni siquiera ha llegado a la primera prueba. Y fíjate también en que este error es la disposición `src/` haciendo su trabajo, no un fallo: si el paquete estuviera en la raíz, las pruebas pasarían sin que el paquete estuviera instalado y no te enterarías de que el empaquetado está roto.

> [!error] assert 110.00000000000001 == 110.0
>
> Una comparación exacta entre números con decimales. No es cosa de `pytest`, sino de cómo guarda el ordenador los números con coma, que viste en el módulo 1. Usa `pytest.approx` en el lado derecho:
>
> ```python
> assert calcular_iva(100, 0.10) == pytest.approx(110.0)
> ```
>
> Admite un margen propio si el que trae por defecto no te vale: `pytest.approx(110.0, abs=0.01)` para céntimos.

> [!consejo] Escribe la prueba cuando encuentres el fallo
>
> La costumbre más rentable no es probarlo todo, es esta: cada vez que alguien te avise de un fallo, antes de arreglarlo escribe una prueba que lo reproduzca y compruébala en rojo. Después arregla y mírala en verde. Con eso te aseguras de dos cosas a la vez: de que has entendido el fallo y de que no va a volver.

> [!resumen] En resumen
>
> Probar una herramienta que otros instalan deja de ser opcional, porque los fallos los descubre quien la usa. `pytest` se instala con pip y sus reglas son tres: funciones que empiezan por `test_` en ficheros que empiezan por `test_`, comprobaciones con `assert` a secas y ejecución escribiendo `pytest`. Cuando algo falla, desmonta la expresión y te enseña los valores de cada lado. El núcleo se prueba llamando a sus funciones, y es fácil precisamente porque no imprime ni pregunta nada. El análisis de argumentos se prueba pasándole una lista a `parse_args` en lugar de tocar `sys.argv`, y el código de salida capturando `SystemExit` con `pytest.raises`. Lo que se imprime se comprueba con `capsys`, que devuelve la salida normal y la de error por separado, y los ficheros se manejan con `tmp_path`, una carpeta nueva y limpia para cada prueba. Una o dos pruebas más lanzan el programa entero con `subprocess.run` para verificar que arranca y que el punto de entrada funciona. Todo eso vive en una carpeta `tests/` hermana de `src/`, sin `__init__.py`, y exige que el paquete esté instalado con `pip install -e .`.

> [!ejercicio] Practica
>
> Añade pruebas a `misnotas`. Necesitarás `pytest` instalado y el proyecto instalado en modo editable.
>
> 1. Crea `tests/test_modelo.py` y escribe al menos seis pruebas del núcleo: las que comprueban que un dato válido se acepta y las que comprueban con `pytest.raises` que los inválidos se rechazan, usando `match` para verificar el mensaje.
> 2. Crea `tests/test_almacen.py` con `tmp_path` y prueba el viaje de ida y vuelta: guardar una lista, cargarla y comprobar que sale igual. Prueba también el fichero que no existe.
> 3. Crea `tests/test_cli.py` y prueba tu analizador con `parse_args([...])`: un subcomando con todos sus valores, un valor por defecto y una conversión de tipo.
> 4. Añade dos pruebas que capturen `SystemExit` con `pytest.raises`: una para un argumento inválido y otra para `--help`, y comprueba qué código devuelve cada una. Uno de los dos te va a sorprender.
> 5. Usa `capsys` para comprobar el texto exacto de dos mensajes de tu programa, uno en la salida normal y otro en la de error, junto con el código que devuelve `main`.
> 6. Añade una prueba con `subprocess.run` que ejecute `python -m misnotas --version` y compruebe el código de salida y la salida.
> 7. Rompe una función del núcleo a propósito, ejecuta `pytest` y lee el informe entero. Anota cuántas pruebas se han enterado del cambio: si es solo una, probablemente te falten pruebas.
