---
titulo: "Qué es Python y para qué sirve"
resumen: "Qué es realmente un lenguaje de programación, por qué Python es buena idea como primer lenguaje y qué vas a poder construir al terminar el curso."
minutos: 8
orden: 1
---

## Qué es programar

Un ordenador no entiende instrucciones como "ordéname estas facturas". Solo sabe ejecutar órdenes muy simples y muy exactas, millones de veces por segundo. **Programar es escribir esas órdenes en un idioma que el ordenador pueda seguir**, con tanto detalle que no quede nada a interpretación.

Ese idioma es el lenguaje de programación. Python es uno de ellos, y su gracia es que se parece bastante al inglés corriente. Mira este programa completo:

```python title="hola.py"
nombre = "Erwin"
print("Hola, " + nombre)
```

```salida
Hola, Erwin
```

Aunque no sepas nada de Python, probablemente puedas adivinar qué hace. Esa legibilidad no es casualidad: es el rasgo de diseño más importante del lenguaje y la razón principal por la que es tan buen punto de partida.

## Qué es Python exactamente

Python es dos cosas a la vez, y conviene distinguirlas desde el principio porque se usan las dos palabras constantemente:

| Palabra | Qué significa |
| --- | --- |
| El lenguaje | Las reglas de escritura: cómo se declara una variable, cómo se escribe una condición, qué palabras están reservadas. |
| El intérprete | El programa que instalas en tu ordenador, se llama `python`, lee tu fichero y va ejecutando línea por línea lo que pusiste. |

Cuando dices "voy a instalar Python", estás instalando el intérprete. Cuando dices "esto no es válido en Python", hablas del lenguaje.

> [!nota] Interpretado, no compilado
>
> En lenguajes como C o Java hay un paso intermedio llamado *compilación*: conviertes todo tu código en un ejecutable y luego lo lanzas. En Python no. Escribes el fichero y lo ejecutas directamente. Eso hace que probar cosas sea inmediato, que es justo lo que quieres mientras aprendes.

## Por qué Python como primer lenguaje

No es el lenguaje más rápido ni el más adecuado para todo, pero para empezar gana por goleada, y por razones concretas:

- **Poca ceremonia.** Un programa que imprime texto en pantalla ocupa una línea. En otros lenguajes necesitas declarar una clase, un método principal y un par de importaciones antes de llegar a lo interesante.
- **No usa llaves ni puntos y coma.** Los bloques de código se delimitan con la sangría, esos espacios en blanco al principio de la línea. Al principio sorprende, pero te obliga a escribir código ordenado desde el primer día.
- **Errores legibles.** Cuando algo falla, Python te dice en qué línea y por qué, en un mensaje que se puede leer.
- **Sirve para casi todo.** Aprendes un lenguaje y con él puedes hacer una web, una app de escritorio, un script que ordene tus ficheros o un análisis de datos. No tienes que cambiar de herramienta según el objetivo.
- **Es lo que más se usa.** Cuando te atasques, alguien ya tuvo tu mismo problema y lo escribió en internet.

> [!aviso] La sangría importa de verdad
>
> En Python los espacios al principio de la línea no son decoración: cambian el significado del programa. Es el error número uno de quien empieza y lo veremos con calma en el módulo de fundamentos. Por ahora quédate con que **un bloque desplazado a la derecha está "dentro" de la línea anterior**.

## Qué se construye con Python

Este curso se centra en cuatro tipos de programa, que son exactamente los cuatro módulos que vienen después de los fundamentos:

1. **Aplicaciones de terminal.** Programas sin ventanas, que se usan escribiendo órdenes. Suenan antiguos y son justo lo contrario: es como se automatiza el trabajo repetitivo y lo que usan a diario los profesionales.
2. **Aplicaciones de escritorio con Tkinter.** Ventanas de verdad, con botones, cajas de texto y menús. Tkinter viene incluido con Python, así que no hay nada que instalar.
3. **Sitios web con Django.** El marco de trabajo con el que están hechos Instagram o Spotify en su día. Te permite tener una web con base de datos y usuarios registrados en muy poco código.
4. **APIs REST.** El pegamento de internet: programas sin interfaz cuya función es dar datos a otros programas, como la app del móvil que consulta tu banco.

Fuera del curso, Python también domina el análisis de datos, la inteligencia artificial, la automatización de sistemas y la computación científica. Los fundamentos que aprendas aquí valen igual para todos ellos.

## Versiones: usa Python 3

Existieron dos ramas incompatibles, Python 2 y Python 3. Python 2 está muerto desde 2020. **Todo este curso usa Python 3**, y cuando veas ejemplos por internet con `print "hola"` sin paréntesis, estás mirando código de Python 2: ignóralo.

Cualquier versión de Python 3.10 en adelante te sirve para seguir el curso. En la siguiente lección lo instalas.

> [!resumen] En resumen
>
> Python es un lenguaje diseñado para ser legible y un intérprete que ejecuta tus ficheros línea por línea. Es un primer lenguaje excelente porque pide muy poca ceremonia y sirve para construir casi cualquier cosa, incluidos los cuatro tipos de aplicación que veremos en este curso. Usa siempre Python 3.

> [!ejercicio] Antes de seguir
>
> No hay que escribir código todavía, pero sí piensa en esto: **¿qué tarea repetitiva haces tú a mano que un programa podría hacer por ti?** Renombrar fotos, pasar datos de una hoja de cálculo a otra, comprobar si una web ha cambiado. Apúntala. Al terminar el módulo de fundamentos volveremos a ella, y te sorprenderá lo cerca que estarás de resolverla.
