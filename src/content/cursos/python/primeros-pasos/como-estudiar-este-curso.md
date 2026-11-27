---
titulo: "Cómo estudiar este curso"
resumen: "Método de trabajo, cómo organizar tus ficheros, qué significan las cajas de colores y qué te espera en cada módulo."
minutos: 7
orden: 8
---

Última lección del módulo de preparación. Va sobre cómo usar el curso para que el tiempo que le dediques cunda.

## El método: leer poco, escribir mucho

La programación se aprende con los dedos, no con los ojos. Para cada lección, haz esto:

1. **Léela entera una vez**, sin escribir nada, para saber de qué va.
2. **Vuelve al principio y teclea cada ejemplo**, sin copiar y pegar, ejecutándolo según lo escribes.
3. **Rompe el ejemplo a propósito.** Cambia un número, quita una línea, pon mal un nombre. Predice qué pasará y comprueba si acertabas. Aquí es donde se aprende de verdad.
4. **Haz los ejercicios del final** sin mirar atrás. Si no te sale, vuelve a la lección: eso significa que el ejercicio ha hecho su trabajo.

> [!aviso] La trampa de la comprensión pasiva
>
> Leer un ejemplo y pensar "vale, esto lo entiendo" es una sensación engañosa. Reconocer código es muchísimo más fácil que escribirlo desde cero. Si no lo has tecleado, no lo sabes.

## Organiza tus ficheros

Dentro de `curso-python`, crea una carpeta por módulo. Te ahorrará un caos de veinte ficheros llamados `prueba3.py`:

```bash
cd ~/curso-python
mkdir modulo-0 modulo-1 modulo-2 modulo-3 modulo-4 modulo-5
```

Y dentro de cada una, un fichero por lección con un nombre que diga algo: `05-primer-programa.py`, `12-bucles-for.py`. Dentro de seis semanas querrás volver a mirar algo y lo encontrarás en diez segundos.

## Las cajas de colores

A lo largo del curso verás estas cajas. Cada color significa algo concreto:

> [!objetivo] Qué vas a aprender
>
> Aparece al principio de las lecciones largas y te dice qué sabrás hacer al terminarla.

> [!nota] Nota
>
> Información de contexto que aclara el tema, pero que no necesitas memorizar.

> [!consejo] Consejo
>
> Un truco, un atajo o una buena costumbre que te ahorrará tiempo.

> [!aviso] Atención
>
> Algo que suele salir mal. Léelo con atención.

> [!error] Error frecuente
>
> Un error concreto con su mensaje y su solución. Si te encuentras ese mensaje, ya sabes dónde mirar.

> [!resumen] En resumen
>
> Las tres o cuatro ideas de la lección condensadas. Perfecto para repasar sin releerlo todo.

> [!ejercicio] Ejercicio
>
> Lo que tienes que hacer tú. No es opcional.

## Cómo moverte por el sitio

- El **índice de la izquierda** tiene todos los módulos. Pulsa en uno para desplegar sus lecciones.
- El **buscador** de arriba encuentra cualquier tema por palabra suelta. Se abre pulsando la tecla <kbd>/</kbd> desde cualquier página.
- Las **flechas** <kbd>←</kbd> y <kbd>→</kbd> del teclado te llevan a la lección anterior y a la siguiente.
- El botón **marcar como completada** guarda tu avance en este navegador, y la barra del índice te muestra cuánto llevas.
- El botón de **sol y luna** de la esquina cambia entre tema claro y oscuro.
- Cada bloque de código tiene un botón **Copiar**, útil para los ejemplos largos. Para los cortos, ya sabes: tecléalos.

## El camino completo

| Módulo | Qué vas a hacer |
| --- | --- |
| 0. Primeros pasos | Ya lo has terminado. Tienes Python, editor y terminal funcionando. |
| 1. Fundamentos | El lenguaje en sí: variables, condiciones, bucles, funciones, listas, ficheros, objetos. Es el módulo más largo y el más importante. |
| 2. Aplicaciones de terminal | Programas de verdad que reciben parámetros, leen y escriben ficheros, y se pueden instalar. |
| 3. Aplicaciones con Tkinter | Ventanas, botones, formularios y tablas. Cada componente visual con su propia lección. |
| 4. Webs con Django | Base de datos, páginas, formularios, usuarios y panel de administración. |
| 5. APIs REST | Consumir APIs ajenas y construir la tuya con Django REST Framework y FastAPI. |

> [!nota] Sobre el ritmo
>
> No hay prisa ninguna. Una lección diaria bien hecha te lleva más lejos que seis en una tarde. Lo único que no funciona es saltarse el módulo de fundamentos para llegar antes a las ventanas: sin variables y funciones, Tkinter y Django son incomprensibles.

> [!resumen] En resumen
>
> Teclea todos los ejemplos, rómpelos a propósito y haz los ejercicios. Guarda tu código en una carpeta por módulo. Usa el buscador con <kbd>/</kbd>, las flechas del teclado para avanzar y el botón de completar para llevar la cuenta. Empieza por los fundamentos y ve en orden.

> [!ejercicio] Prepárate para el módulo 1
>
> 1. Crea las carpetas de los seis módulos dentro de `curso-python`.
> 2. Mueve tu `hola.py` a `modulo-0`.
> 3. Marca esta lección como completada con el botón de arriba y comprueba que la barra de progreso de la izquierda se ha movido.
> 4. Pulsa la flecha derecha del teclado. Empezamos con los fundamentos.
