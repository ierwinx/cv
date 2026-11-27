---
titulo: "Elegir y configurar el editor"
resumen: "Por qué no sirve el Bloc de notas, cómo instalar Visual Studio Code y qué cuatro ajustes cambiar para trabajar cómodo desde hoy."
minutos: 10
orden: 4
---

## Por qué necesitas un editor de código

Podrías escribir Python en el Bloc de notas y funcionaría, pero estarías trabajando a ciegas. Un editor de código te da cuatro cosas que marcan la diferencia cuando aprendes:

- **Colorea el código** según lo que significa cada palabra. Cuando un texto no se pone del color esperado, sueles haber olvidado una comilla.
- **Te avisa de errores mientras escribes**, antes incluso de ejecutar nada.
- **Respeta la sangría** automáticamente, que en Python es obligatoria.
- **Ejecuta tus programas** con un botón, sin cambiar de ventana.

## Instalar Visual Studio Code

Es gratuito, funciona en los tres sistemas operativos y es el que se usa en este curso.

1. Entra en [code.visualstudio.com](https://code.visualstudio.com/) y pulsa el botón de descarga.
2. Instálalo como cualquier otro programa. En Windows, marca la casilla **"Add to PATH"** si aparece.
3. Ábrelo.

> [!nota] Si usas Cursor, PyCharm u otro
>
> Cursor está construido sobre Visual Studio Code, así que todo lo que se explica aquí vale igual. PyCharm es una alternativa excelente, más pesada y orientada a proyectos grandes. Cualquier editor te sirve para seguir el curso; si ya tienes uno con el que estás cómodo, quédatelo y salta a la siguiente lección.

## Instalar la extensión de Python

Sin este paso, Visual Studio Code trata tus ficheros como texto plano.

1. En la barra lateral izquierda, pulsa el icono de las **Extensiones** (cuatro cuadraditos). También con <kbd>Ctrl</kbd> + <kbd>Mayús</kbd> + <kbd>X</kbd>, o <kbd>Cmd</kbd> + <kbd>Mayús</kbd> + <kbd>X</kbd> en Mac.
2. Escribe `Python` en el buscador.
3. Instala la extensión llamada **Python**, publicada por Microsoft. Es la primera de la lista y tiene cientos de millones de descargas.
4. Se instalará también Pylance, que es lo que te subraya los errores. Déjalo.

## Abrir tu carpeta de trabajo

Aquí hay un detalle que confunde a mucha gente al empezar: **en Visual Studio Code no se abren ficheros sueltos, se abre una carpeta**. El editor pasa a considerarla tu proyecto y te muestra su contenido en la barra lateral.

Ve a **Archivo → Abrir carpeta** y elige la carpeta `curso-python` que creaste en la lección anterior. Si te pregunta si confías en los autores, di que sí: son tuyos.

> [!consejo] La terminal integrada
>
> Pulsa <kbd>Ctrl</kbd> + <kbd>Ñ</kbd> en teclado español (en otros es la tecla de la comilla inversa, debajo del Escape) y se abrirá una terminal **dentro del editor**, ya situada en la carpeta de tu proyecto. Ya no tendrás que cambiar de ventana ni hacer `cd` para nada. También la tienes en el menú **Terminal → Nueva terminal**.

## Cuatro ajustes que merecen la pena

Abre los ajustes con <kbd>Ctrl</kbd> + <kbd>,</kbd> (<kbd>Cmd</kbd> + <kbd>,</kbd> en Mac) y busca cada opción por su nombre:

| Busca esto | Qué poner | Para qué |
| --- | --- | --- |
| `Auto Save` | `afterDelay` | Guarda solo. Se acabó ejecutar código viejo por no haber guardado. |
| `Render Whitespace` | `boundary` | Muestra los espacios como puntitos tenues. En Python, ver la sangría es oro. |
| `Word Wrap` | `on` | Parte las líneas largas en vez de obligarte a hacer scroll horizontal. |
| `Font Size` | `14` o más | Tus ojos, en cuatro horas seguidas, te lo agradecerán. |

## Elegir el intérprete correcto

Visual Studio Code necesita saber **qué Python** usar, porque puedes tener varios instalados. Pulsa <kbd>Ctrl</kbd> + <kbd>Mayús</kbd> + <kbd>P</kbd> para abrir la paleta de comandos, escribe `Python: Select Interpreter` y elige la versión que instalaste en la lección anterior, normalmente la que aparece marcada como *Recommended*.

Este paso volverá a aparecer, esta vez de forma imprescindible, cuando trabajemos con entornos virtuales en el módulo de fundamentos.

> [!aviso] No dejes que el asistente de IA escriba por ti
>
> Los editores modernos completan el código antes de que lo escribas. Es muy cómodo y es muy mal profesor: aceptar sugerencias sin entenderlas da la sensación de avanzar sin aprender nada. Mientras hagas este curso, desactiva el autocompletado por IA o al menos oblígate a escribir tú los ejemplos y los ejercicios.

> [!resumen] En resumen
>
> Instala Visual Studio Code, añade la extensión Python de Microsoft, abre tu carpeta `curso-python` como proyecto y activa el guardado automático. Usa la terminal integrada con <kbd>Ctrl</kbd> + <kbd>Ñ</kbd> y selecciona el intérprete con la paleta de comandos.

> [!ejercicio] Practica
>
> 1. Abre `curso-python` en el editor.
> 2. Crea un fichero nuevo llamado `prueba.txt` desde la barra lateral y escribe cualquier cosa. Comprueba que se guarda solo.
> 3. Abre la terminal integrada y ejecuta `pwd`. Debe mostrarte la ruta de `curso-python`, no tu carpeta personal.
> 4. Borra `prueba.txt`: en la siguiente lección creamos el fichero de verdad.
