---
titulo: "Proyecto: gestor de tareas"
resumen: "Una aplicación de terminal completa con clases, persistencia en JSON, menú en bucle y validación de la entrada del usuario."
minutos: 25
orden: 59
---

Llevas todo el módulo aprendiendo piezas sueltas. Este proyecto las junta en un programa que se puede usar de verdad: una lista de tareas que se maneja desde la terminal y que **recuerda lo que escribiste la última vez**.

Es el primer programa del curso con estado que sobrevive al cierre. Hasta ahora, al terminar la ejecución todo se perdía; aquí las tareas se guardan en un fichero JSON y vuelven a cargarse al arrancar.

> [!objetivo] Qué vas a aprender
>
> Construir una aplicación de terminal con una dataclass `Tarea`, una clase `GestorDeTareas` que las administra, persistencia en un fichero JSON, un menú en bucle, validación de la entrada con `try`/`except` y una tabla de salida alineada en columnas.

## El plan

Antes de escribir nada, conviene decidir las piezas y qué responsabilidad tiene cada una. Esto es lo que se llama **diseño**, y ahorra mucho tiempo:

| Pieza | Responsabilidad |
| --- | --- |
| `Tarea` | Guardar los datos de una tarea. Nada más |
| `GestorDeTareas` | Administrar la lista: añadir, buscar, completar, eliminar, guardar y cargar |
| `mostrar_tareas`, `mostrar_menu` | Pintar en pantalla |
| `pedir_entero`, `accion_*` | Hablar con quien usa el programa |
| `main` | El bucle del menú |

La línea importante es la que separa las dos primeras filas de las tres últimas: **las clases no imprimen nada y no llaman a `input()`**. Solo manejan datos. Todo lo que tiene que ver con la pantalla y el teclado vive en las funciones de fuera.

Esa separación parece un capricho, pero tiene una consecuencia práctica inmediata: el día que quieras poner este gestor detrás de una ventana con Tkinter o de una API web, las clases se reutilizan tal cual y solo se tira la capa de terminal.

## Pieza 1: la clase `Tarea`

Una tarea es un puñado de datos, así que es el caso de libro de una dataclass:

```python
from dataclasses import dataclass, field
from datetime import date


@dataclass
class Tarea:
        """Una tarea de la lista."""

    identificador: int
    titulo: str
    hecha: bool = False
    creada: str = field(default_factory=lambda: date.today().isoformat())

    @property
    def marca(self) -> str:
                return "[x]" if self.hecha else "[ ]"

    def __str__(self) -> str:
                return f"{self.identificador}. {self.marca} {self.titulo}"


tarea = Tarea(1, "Revisar la factura de octubre")
print(tarea)
print(repr(tarea))
tarea.hecha = True
print(tarea)
```

```salida
1. [ ] Revisar la factura de octubre
Tarea(identificador=1, titulo='Revisar la factura de octubre', hecha=False, creada='2026-09-19')
1. [x] Revisar la factura de octubre
```

Las decisiones de esta clase:

- El campo se llama `identificador` y no `id` porque `id` es una función de Python y taparla es mala idea.
- `creada` se guarda como **texto** en formato ISO (`2026-09-19`) y no como objeto `date`. La razón es JSON: `json.dumps` no sabe escribir una fecha, pero sí una cadena. Convertir de ida y vuelta con `date.fromisoformat()` es trivial el día que haga falta comparar fechas.
- El `default_factory` con una `lambda` es el equivalente a `field(default_factory=list)` de la lección anterior: la función se llama en cada tarea nueva, así que cada una lleva la fecha de su día. Con `creada: str = date.today().isoformat()` el valor se calcularía una sola vez, al importar el módulo, y un programa que estuviera abierto varios días fecharía todo el primero.
- `marca` es una propiedad porque es un dato deducido de `hecha`. Guardarlo como campo sería duplicar la misma información en dos sitios.
- `__str__` da la versión corta para mensajes sueltos; el `__repr__` que genera la dataclass se queda para depurar.

## Pieza 2: la clase `GestorDeTareas`

Aquí vive la lógica. Fíjate en que ningún método imprime:

```python
class GestorDeTareas:
        """Guarda las tareas en una lista y las lee y escribe en un JSON."""

    def __init__(self, ruta: Path):
                self.ruta = Path(ruta)
        self.tareas: list[Tarea] = []

    def __len__(self) -> int:
                return len(self.tareas)

    def _siguiente_identificador(self) -> int:
                if not self.tareas:
                        return 1
        return max(tarea.identificador for tarea in self.tareas) + 1

    def anadir(self, titulo: str) -> Tarea:
                titulo = titulo.strip()
        if not titulo:
                        raise ValueError("El título no puede estar vacío")
        tarea = Tarea(self._siguiente_identificador(), titulo)
        self.tareas.append(tarea)
        return tarea

    def buscar(self, identificador: int) -> Tarea | None:
                for tarea in self.tareas:
                        if tarea.identificador == identificador:
                                return tarea
        return None

    def completar(self, identificador: int) -> bool:
                tarea = self.buscar(identificador)
        if tarea is None or tarea.hecha:
                        return False
        tarea.hecha = True
        return True

    def eliminar(self, identificador: int) -> bool:
                tarea = self.buscar(identificador)
        if tarea is None:
                        return False
        self.tareas.remove(tarea)
        return True

    def pendientes(self) -> list[Tarea]:
                return [tarea for tarea in self.tareas if not tarea.hecha]

    def completadas(self) -> list[Tarea]:
                return [tarea for tarea in self.tareas if tarea.hecha]
```

Probándola sin nada de interfaz:

```python
gestor = GestorDeTareas("prueba.json")

gestor.anadir("Revisar la factura de octubre")
gestor.anadir("Preparar la charla del viernes")
gestor.anadir("Llamar al taller")

print(len(gestor))
print(gestor.completar(2))      # se marca
print(gestor.completar(2))      # ya estaba hecha
print(gestor.completar(99))     # no existe

for tarea in gestor.pendientes():
        print(tarea)

print(gestor.eliminar(3))
print(len(gestor))

try:
        gestor.anadir("   ")
except ValueError as error:
        print(f"Rechazada: {error}")
```

```salida
3
True
False
False
1. [ ] Revisar la factura de octubre
3. [ ] Llamar al taller
True
2
Rechazada: El título no puede estar vacío
```

Las decisiones de esta clase:

- **`_siguiente_identificador` usa `max` y no `len`.** Con `len(self.tareas) + 1`, al borrar la tarea 3 de tres y crear otra, la nueva volvería a ser la 3 y habría dos tareas con el mismo número a lo largo de la sesión. Con `max` los identificadores no se reciclan nunca.
- **`buscar` devuelve `None` cuando no encuentra**, y los demás métodos lo comprueban con `is None`. Es el patrón habitual y encaja con el `None` que ya conoces.
- **`completar` y `eliminar` devuelven `True` o `False`** en vez de lanzar una excepción. Que alguien teclee un número que no existe no es un fallo del programa, es una situación normal de un menú, así que se trata con un valor de retorno y la capa de arriba decide qué mensaje enseñar.
- **`anadir`, en cambio, sí lanza `ValueError`.** Aquí la diferencia es que un título vacío es un dato inválido, no una consulta fallida, y quien llama tiene que enterarse sí o sí. La regla práctica: devuelve un valor para lo que puede pasar a diario, lanza una excepción para lo que no debería pasar.
- **`pendientes` y `completadas` devuelven listas nuevas**, construidas con comprensiones. Quien las reciba puede recorrerlas o reordenarlas sin tocar la lista original.
- **`__len__`** permite escribir `len(gestor)`, que se lee mejor que `len(gestor.tareas)`.

> [!nota] El guion bajo de `_siguiente_identificador`
>
> Ese método es maquinaria interna: nadie de fuera debería llamarlo, porque un identificador solo tiene sentido en el momento en que se crea la tarea. El guion bajo lo dice, aunque Python no lo impida.

## Pieza 3: la persistencia en JSON

Dos métodos más en `GestorDeTareas`, uno para escribir y otro para leer:

```python
        def guardar(self) -> None:
                datos = [asdict(tarea) for tarea in self.tareas]
        self.ruta.write_text(
            json.dumps(datos, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def cargar(self) -> None:
                if not self.ruta.exists():
                        self.tareas = []
            return
        try:
                        datos = json.loads(self.ruta.read_text(encoding="utf-8"))
            self.tareas = [Tarea(**fila) for fila in datos]
        except (json.JSONDecodeError, TypeError) as error:
                        print(f"Aviso: no he podido leer {self.ruta} ({error}). Empiezo de cero.")
            self.tareas = []
```

El ciclo completo, comprobado:

```python
ruta = Path("prueba.json")
gestor = GestorDeTareas(ruta)
gestor.anadir("Revisar la factura de octubre")
gestor.anadir("Preparar la charla del viernes")
gestor.completar(2)
gestor.guardar()

print(ruta.read_text(encoding="utf-8"))

otro = GestorDeTareas(ruta)
otro.cargar()
print(len(otro))
print(otro.tareas == gestor.tareas)
```

```salida
[
  {
    "identificador": 1,
    "titulo": "Revisar la factura de octubre",
    "hecha": false,
    "creada": "2026-09-19"
  },
  {
    "identificador": 2,
    "titulo": "Preparar la charla del viernes",
    "hecha": true,
    "creada": "2026-09-19"
  }
]
2
True
```

Esa última línea, `otro.tareas == gestor.tareas`, es la prueba de que el viaje de ida y vuelta no ha perdido nada, y funciona gracias al `__eq__` que genera la dataclass.

Las decisiones de estos dos métodos:

- **`asdict` y `Tarea(**fila)`** son el puente entre objetos y JSON en las dos direcciones, tal como viste en la lección de dataclasses.
- **`ensure_ascii=False`** hace que los acentos y las eñes se guarden tal cual en vez de como `\u00f3`. El fichero se puede abrir y leer con cualquier editor.
- **`indent=2`** ocupa más, pero permite mirar el fichero a ojo y hasta corregirlo a mano. En un fichero de tareas personales esto vale más que el espacio ahorrado.
- **`encoding="utf-8"` en las dos operaciones.** Sin él, el programa leería y escribiría con la codificación por defecto del sistema, que no es la misma en Windows que en macOS, y los acentos saldrían rotos al mover el fichero de un ordenador a otro.
- **Fichero inexistente no es un error.** La primera vez que arranca el programa no hay nada que cargar, así que se comprueba con `exists()` y se empieza con la lista vacía, sin avisos.
- **Fichero ilegible sí se avisa.** Un JSON corrupto lanza `JSONDecodeError`, y un JSON válido pero con claves que no cuadran con la dataclass lanza `TypeError`. Se capturan los dos, se explica lo que pasa y se sigue adelante en vez de morir con un traceback.

> [!aviso] Este `cargar` puede hacerte perder los datos
>
> Si el fichero está corrupto, el gestor empieza vacío, y en cuanto elijas "Guardar y salir" sobrescribirá el fichero con una lista vacía. El original se pierde.
>
> En un programa serio, antes de empezar de cero se renombra el fichero problemático:
>
> ```python
> self.ruta.rename(self.ruta.with_suffix(".json.roto"))
> ```
>
> Es una línea, y convierte una pérdida de datos en un susto. Merece la pena acordarse de este patrón cada vez que un programa escriba encima de algo que no ha podido leer.

## Pieza 4: la salida en columnas

Una lista de tareas alineada se lee de un vistazo; una lista desalineada, no. Todo el trabajo lo hacen los especificadores de las f-strings que ya conoces: `>` alinea a la derecha, `<` a la izquierda y el número fija el ancho.

```python
ANCHO_TITULO = 38


def mostrar_tareas(tareas: list[Tarea], titulo: str) -> None:
        print(f"\n{titulo}")
    if not tareas:
                print("  (no hay ninguna)")
        return
    print(f"  {'ID':>3}  {'EST':<3}  {'TAREA':<{ANCHO_TITULO}}  CREADA")
    print("  " + "-" * (ANCHO_TITULO + 27))
    for tarea in tareas:
                recortado = tarea.titulo[:ANCHO_TITULO]
        print(f"  {tarea.identificador:>3}  {tarea.marca:<3}  {recortado:<{ANCHO_TITULO}}  {tarea.creada}")
```

```salida

Todas las tareas
   ID  EST  TAREA                                   CREADA
  -----------------------------------------------------------------
    1  [ ]  Revisar la factura de octubre           2026-09-19
    2  [x]  Preparar la charla del viernes sobre e  2026-09-19
    3  [ ]  Llamar al taller                        2026-09-19

Archivadas
  (no hay ninguna)
```

Las decisiones de esta función:

- **El ancho está en una constante**, `ANCHO_TITULO`, y se usa dentro de la f-string con `{recortado:<{ANCHO_TITULO}}`. Las llaves anidadas permiten que el ancho sea una variable, así que cambiar la tabla entera es cambiar un número.
- **El título se recorta con `[:ANCHO_TITULO]`.** Sin eso, un título largo desplazaría la columna de la fecha y rompería la alineación de esa fila, como se ve en la segunda tarea del ejemplo, que queda cortada pero en su sitio.
- **La función recibe la lista que tiene que pintar**, no el gestor. Así sirve igual para todas, para las pendientes o para las completadas, y no sabe nada de dónde salen.
- **La lista vacía se trata aparte.** Una tabla con cabecera y sin filas parece un error; un "(no hay ninguna)" no.

## Pieza 5: hablar con quien usa el programa

Todo lo que entra por teclado llega como texto y puede ser cualquier cosa. Esta función concentra la conversión:

```python
def pedir_entero(mensaje: str) -> int | None:
        """Devuelve el número escrito, o None si no era un entero."""
    entrada = input(mensaje).strip()
    try:
                return int(entrada)
    except ValueError:
                print(f"'{entrada}' no es un número entero.")
        return None
```

Devolver `None` en vez de insistir en un bucle es deliberado: si te equivocas de tecla, vuelves al menú en vez de quedarte atrapado en una pregunta de la que solo se sale acertando. Con <kbd>Ctrl</kbd> + <kbd>C</kbd> también se sale, pero de forma brusca.

Encima de ahí van las funciones de acción, una por opción del menú. Cada una junta las tres capas: pregunta, llama al gestor y cuenta el resultado.

```python
def accion_anadir(gestor: GestorDeTareas) -> None:
        titulo = input("Título de la tarea: ")
    try:
                tarea = gestor.anadir(titulo)
    except ValueError as error:
                print(f"No se ha añadido: {error}.")
        return
    print(f"Añadida la tarea {tarea.identificador}.")


def accion_completar(gestor: GestorDeTareas) -> None:
        mostrar_tareas(gestor.pendientes(), "Pendientes")
    if not gestor.pendientes():
                return
    identificador = pedir_entero("ID de la tarea completada: ")
    if identificador is None:
                return
    if gestor.completar(identificador):
                print(f"Tarea {identificador} marcada como hecha.")
    else:
                print(f"No hay ninguna tarea pendiente con el ID {identificador}.")
```

Aquí se ve por qué compensaba que el gestor no imprimiera: `accion_completar` enseña las tareas pendientes antes de preguntar, para que no haya que recordar los números de memoria. Esa es una decisión de interfaz, y vive en la capa de interfaz.

El patrón `if identificador is None: return` aparece dos veces y se llama **salida temprana**: en cuanto algo no cuadra, se sale de la función. La alternativa, anidar todo dentro de un `if`, produce tres niveles de sangría y se lee mucho peor.

> [!consejo] Una función por opción del menú
>
> Es tentador escribirlo todo dentro del `match` del bucle principal. No lo hagas: en cuanto cada opción tenga cinco líneas, `main` pasará de cuarenta y dejará de caber en la pantalla. Con una función por opción, el bucle principal se lee como un índice.

## Pieza 6: el bucle principal

```python
def main() -> None:
        gestor = GestorDeTareas(FICHERO)
    gestor.cargar()
    print(f"Cargadas {len(gestor)} tareas desde {gestor.ruta}.")

    while True:
                mostrar_menu(gestor)
        opcion = input("Elige una opción: ").strip()

        match opcion:
                        case "1":
                                mostrar_tareas(gestor.tareas, "Todas las tareas")
            case "2":
                                mostrar_tareas(gestor.pendientes(), "Pendientes")
            case "3":
                                accion_anadir(gestor)
            case "4":
                                accion_completar(gestor)
            case "5":
                                accion_eliminar(gestor)
            case "0":
                                gestor.guardar()
                print(f"\nGuardadas {len(gestor)} tareas en {gestor.ruta}. Hasta luego.")
                break
            case _:
                                print("Opción no válida. Escribe un número del 0 al 5.")


if __name__ == "__main__":
        main()
```

Las decisiones del bucle:

- **`while True` con `break`** en la opción de salir. Es el patrón normal de un menú: no se sabe cuántas vueltas dará, y la condición de salida está en medio del cuerpo, no al principio.
- **`match` sobre cadenas, sin convertir a número.** Si se convirtiera con `int()`, escribir una letra daría un `ValueError` que habría que capturar. Comparando textos, cualquier cosa que no sea una opción cae en el `case _` y ya está.
- **`.strip()` en la entrada**, porque un espacio de más no debería invalidar la opción.
- **Se guarda solo al salir.** Es lo más simple, pero significa que un corte de luz se lleva la sesión entera. La alternativa es llamar a `gestor.guardar()` después de cada cambio: más seguro y más escrituras en disco. Para este tamaño de programa cualquiera de las dos vale, pero hay que elegir a sabiendas.

## El programa completo

```python title="gestor.py"
"""Gestor de tareas por terminal, con persistencia en JSON."""

import json
from dataclasses import dataclass, field, asdict
from datetime import date
from pathlib import Path

FICHERO = Path("tareas.json")
ANCHO_TITULO = 38


@dataclass
class Tarea:
        """Una tarea de la lista."""

    identificador: int
    titulo: str
    hecha: bool = False
    creada: str = field(default_factory=lambda: date.today().isoformat())

    @property
    def marca(self) -> str:
                return "[x]" if self.hecha else "[ ]"

    def __str__(self) -> str:
                return f"{self.identificador}. {self.marca} {self.titulo}"


class GestorDeTareas:
        """Guarda las tareas en una lista y las lee y escribe en un JSON."""

    def __init__(self, ruta: Path):
                self.ruta = Path(ruta)
        self.tareas: list[Tarea] = []

    def __len__(self) -> int:
                return len(self.tareas)

    def _siguiente_identificador(self) -> int:
                if not self.tareas:
                        return 1
        return max(tarea.identificador for tarea in self.tareas) + 1

    def anadir(self, titulo: str) -> Tarea:
                titulo = titulo.strip()
        if not titulo:
                        raise ValueError("El título no puede estar vacío")
        tarea = Tarea(self._siguiente_identificador(), titulo)
        self.tareas.append(tarea)
        return tarea

    def buscar(self, identificador: int) -> Tarea | None:
                for tarea in self.tareas:
                        if tarea.identificador == identificador:
                                return tarea
        return None

    def completar(self, identificador: int) -> bool:
                tarea = self.buscar(identificador)
        if tarea is None or tarea.hecha:
                        return False
        tarea.hecha = True
        return True

    def eliminar(self, identificador: int) -> bool:
                tarea = self.buscar(identificador)
        if tarea is None:
                        return False
        self.tareas.remove(tarea)
        return True

    def pendientes(self) -> list[Tarea]:
                return [tarea for tarea in self.tareas if not tarea.hecha]

    def completadas(self) -> list[Tarea]:
                return [tarea for tarea in self.tareas if tarea.hecha]

    def guardar(self) -> None:
                datos = [asdict(tarea) for tarea in self.tareas]
        self.ruta.write_text(
            json.dumps(datos, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def cargar(self) -> None:
                if not self.ruta.exists():
                        self.tareas = []
            return
        try:
                        datos = json.loads(self.ruta.read_text(encoding="utf-8"))
            self.tareas = [Tarea(**fila) for fila in datos]
        except (json.JSONDecodeError, TypeError) as error:
                        print(f"Aviso: no he podido leer {self.ruta} ({error}). Empiezo de cero.")
            self.tareas = []


def mostrar_tareas(tareas: list[Tarea], titulo: str) -> None:
        print(f"\n{titulo}")
    if not tareas:
                print("  (no hay ninguna)")
        return
    print(f"  {'ID':>3}  {'EST':<3}  {'TAREA':<{ANCHO_TITULO}}  CREADA")
    print("  " + "-" * (ANCHO_TITULO + 27))
    for tarea in tareas:
                recortado = tarea.titulo[:ANCHO_TITULO]
        print(f"  {tarea.identificador:>3}  {tarea.marca:<3}  {recortado:<{ANCHO_TITULO}}  {tarea.creada}")


def mostrar_menu(gestor: GestorDeTareas) -> None:
        print(f"\n=== GESTOR DE TAREAS · {len(gestor.pendientes())}/{len(gestor)} pendientes ===")
    print("  1. Ver todas las tareas")
    print("  2. Ver solo las pendientes")
    print("  3. Añadir una tarea")
    print("  4. Completar una tarea")
    print("  5. Eliminar una tarea")
    print("  0. Guardar y salir")


def pedir_entero(mensaje: str) -> int | None:
        """Devuelve el número escrito, o None si no era un entero."""
    entrada = input(mensaje).strip()
    try:
                return int(entrada)
    except ValueError:
                print(f"'{entrada}' no es un número entero.")
        return None


def accion_anadir(gestor: GestorDeTareas) -> None:
        titulo = input("Título de la tarea: ")
    try:
                tarea = gestor.anadir(titulo)
    except ValueError as error:
                print(f"No se ha añadido: {error}.")
        return
    print(f"Añadida la tarea {tarea.identificador}.")


def accion_completar(gestor: GestorDeTareas) -> None:
        mostrar_tareas(gestor.pendientes(), "Pendientes")
    if not gestor.pendientes():
                return
    identificador = pedir_entero("ID de la tarea completada: ")
    if identificador is None:
                return
    if gestor.completar(identificador):
                print(f"Tarea {identificador} marcada como hecha.")
    else:
                print(f"No hay ninguna tarea pendiente con el ID {identificador}.")


def accion_eliminar(gestor: GestorDeTareas) -> None:
        mostrar_tareas(gestor.tareas, "Todas las tareas")
    if not gestor.tareas:
                return
    identificador = pedir_entero("ID de la tarea que quieres borrar: ")
    if identificador is None:
                return
    if gestor.eliminar(identificador):
                print(f"Tarea {identificador} eliminada.")
    else:
                print(f"No existe ninguna tarea con el ID {identificador}.")


def main() -> None:
        gestor = GestorDeTareas(FICHERO)
    gestor.cargar()
    print(f"Cargadas {len(gestor)} tareas desde {gestor.ruta}.")

    while True:
                mostrar_menu(gestor)
        opcion = input("Elige una opción: ").strip()

        match opcion:
                        case "1":
                                mostrar_tareas(gestor.tareas, "Todas las tareas")
            case "2":
                                mostrar_tareas(gestor.pendientes(), "Pendientes")
            case "3":
                                accion_anadir(gestor)
            case "4":
                                accion_completar(gestor)
            case "5":
                                accion_eliminar(gestor)
            case "0":
                                gestor.guardar()
                print(f"\nGuardadas {len(gestor)} tareas en {gestor.ruta}. Hasta luego.")
                break
            case _:
                                print("Opción no válida. Escribe un número del 0 al 5.")


if __name__ == "__main__":
        main()
```

Son unas 180 líneas, y ni una sola usa nada que no hayas visto en este módulo.

## Una sesión de uso

Se arranca como cualquier programa:

```bash
python3 gestor.py
```

Primera ejecución, con el fichero todavía sin crear:

```salida
Cargadas 0 tareas desde tareas.json.

=== GESTOR DE TAREAS · 0/0 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 3
Título de la tarea: Revisar la factura de octubre
Añadida la tarea 1.

=== GESTOR DE TAREAS · 1/1 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 3
Título de la tarea: Llamar al taller para la revisión
Añadida la tarea 2.

=== GESTOR DE TAREAS · 2/2 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 4

Pendientes
   ID  EST  TAREA                                   CREADA
  -----------------------------------------------------------------
    1  [ ]  Revisar la factura de octubre           2026-09-19
    2  [ ]  Llamar al taller para la revisión       2026-09-19
ID de la tarea completada: 1
Tarea 1 marcada como hecha.

=== GESTOR DE TAREAS · 1/2 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 0

Guardadas 2 tareas en tareas.json. Hasta luego.
```

Al lado del programa ha aparecido `tareas.json`:

```json
[
  {
    "identificador": 1,
    "titulo": "Revisar la factura de octubre",
    "hecha": true,
    "creada": "2026-09-19"
  },
  {
    "identificador": 2,
    "titulo": "Llamar al taller para la revisión",
    "hecha": false,
    "creada": "2026-09-19"
  }
]
```

Y al volver a arrancar, las tareas siguen ahí:

```salida
Cargadas 2 tareas desde tareas.json.

=== GESTOR DE TAREAS · 1/2 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 2

Pendientes
   ID  EST  TAREA                                   CREADA
  -----------------------------------------------------------------
    2  [ ]  Llamar al taller para la revisión       2026-09-19

=== GESTOR DE TAREAS · 1/2 pendientes ===
  1. Ver todas las tareas
  2. Ver solo las pendientes
  3. Añadir una tarea
  4. Completar una tarea
  5. Eliminar una tarea
  0. Guardar y salir
Elige una opción: 0

Guardadas 2 tareas en tareas.json. Hasta luego.
```

## Lo que se ha usado

Repasando, este único fichero junta casi todo el módulo:

| Del curso | Dónde |
| --- | --- |
| Dataclasses, propiedades, `__str__`, `__len__` | `Tarea` y `GestorDeTareas` |
| Comprensiones de lista | `pendientes`, `completadas`, `asdict` de cada tarea |
| f-strings con formato y ancho | La tabla de `mostrar_tareas` |
| `try`/`except` y `raise` | `pedir_entero`, `anadir`, `cargar` |
| `while` con `break` y `match` | El menú de `main` |
| `pathlib` y JSON | `guardar` y `cargar` |
| `datetime` | La fecha de creación |
| Anotaciones de tipo y docstrings | Todas las firmas |
| `if __name__ == "__main__"` | El final del fichero |

> [!error] TypeError: Tarea.\_\_init\_\_() got an unexpected keyword argument 'prioridad'
>
> Te saldrá en cuanto amplíes la dataclass y cargues un `tareas.json` escrito por la versión anterior, o al revés. El fichero trae una clave que la clase no tiene, o le falta una que ahora es obligatoria.
>
> Mientras estés experimentando, lo más rápido es borrar el fichero y empezar de cero. En un programa que use otra gente, lo correcto es dar valor por defecto a los campos nuevos y filtrar las claves desconocidas antes de construir la tarea.

> [!resumen] En resumen
>
> Un programa completo no es más que las piezas del módulo puestas en su sitio. La clave del diseño está en la separación: la dataclass `Tarea` solo guarda datos, `GestorDeTareas` solo manipula la lista y la persistencia, y las funciones sueltas se encargan de la pantalla y el teclado, de modo que las clases se podrían reutilizar tal cual detrás de otra interfaz. Los métodos devuelven `True` o `False` para lo que pasa a diario y lanzan excepciones para los datos inválidos. La persistencia es el ciclo `asdict` más `json.dumps` para guardar y `json.loads` más `Tarea(**fila)` para cargar, con `encoding="utf-8"` en los dos extremos y un `except` que no deje morir al programa por un fichero ilegible. Y el menú es un `while True` con `match`, con una función por opción para que el bucle siga cabiendo en la pantalla.

> [!ejercicio] Ampliaciones
>
> El programa funciona, pero está pidiendo crecer. Sigue trabajando sobre `gestor.py` y añade, en este orden de dificultad:
>
> 1. **Prioridades.** Añade a `Tarea` un campo `prioridad` con valores `"alta"`, `"media"` o `"baja"`, con `"media"` por defecto. Valídalo en `__post_init__`, muéstralo como una columna más de la tabla y ordena la lista para que las altas salgan arriba. Recuerda borrar el `tareas.json` antiguo o dar valor por defecto al campo nuevo.
> 2. **Fechas de vencimiento.** Añade un campo `vence` opcional, en formato ISO como `creada`. Marca en la tabla las tareas vencidas comparando con `date.today()`, y añade una opción de menú que muestre solo lo que vence en los próximos siete días. Necesitarás `date.fromisoformat()` y restar dos fechas.
> 3. **Búsqueda.** Añade un método `buscar_por_texto(self, texto)` que devuelva las tareas cuyo título contenga ese texto, sin distinguir mayúsculas de minúsculas, y una opción de menú que lo use. Un `.lower()` en los dos lados resuelve la comparación.
> 4. **Exportar a CSV.** Añade un método `exportar_csv(self, ruta)` que escriba las tareas con el módulo `csv` y una cabecera, para poder abrirlas en una hoja de cálculo. Fíjate en que `asdict` ya te da justo los diccionarios que espera `csv.DictWriter`.
> 5. **Guardado automático.** Cambia el programa para que guarde después de cada modificación en vez de solo al salir, y protege la carga renombrando el fichero corrupto en lugar de sobrescribirlo.
> 6. **Deshacer.** Guarda en el gestor una copia de la lista antes de cada cambio y añade una opción que la restaure. Cuidado con las copias: `self.tareas[:]` copia la lista, pero las tareas de dentro siguen siendo las mismas, así que tendrás que mirar el módulo `copy` y su función `deepcopy`.
