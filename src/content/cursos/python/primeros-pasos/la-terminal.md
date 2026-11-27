---
titulo: "La terminal: lo mínimo imprescindible"
resumen: "Moverte por carpetas, listar ficheros y ejecutar programas desde la línea de comandos. Cinco comandos que usarás durante todo el curso."
minutos: 12
orden: 3
---

La terminal es una ventana donde escribes órdenes en vez de hacer clic. Vas a necesitarla en todas las lecciones, así que dedicamos diez minutos a perderle el miedo. No hace falta dominarla: con cinco comandos vas sobrado.

## Qué estás viendo

Al abrir la terminal aparece una línea parecida a esta, que se llama el **prompt**:

```consola
erwin@portatil ~ $
```

Te está diciendo tres cosas: quién eres (`erwin`), en qué máquina estás (`portatil`) y, lo único que de verdad importa, **en qué carpeta estás ahora mismo** (`~`, que significa tu carpeta personal). El símbolo final, `$` o `>`, marca dónde empiezas a escribir.

> [!nota] Por qué en los ejemplos verás $
>
> Es la convención universal para decir "esto se escribe en la terminal". **El `$` no se escribe**: solo escribes lo que viene detrás. En este curso los bloques de terminal no lo llevan, precisamente para que puedas copiarlos sin pensar.

La idea clave es que **la terminal siempre está situada dentro de una carpeta**. Todo lo que hagas ocurre ahí, igual que cuando tienes una ventana del explorador de archivos abierta en una carpeta concreta.

## Los cinco comandos

### Dónde estoy

```bash
pwd
```

```salida
/Users/erwin
```

En Windows con `cmd` el comando equivalente es `cd` a secas, sin nada detrás. En PowerShell funciona `pwd`.

### Qué hay aquí

```bash
ls
```

```salida
Descargas    Documentos    Escritorio    Imágenes
```

En Windows con `cmd` es `dir`. Un truco útil en macOS y Linux es `ls -la`, que además muestra los ficheros ocultos y su tamaño.

### Entrar en una carpeta

`cd` viene de *change directory*, cambiar de directorio.

```bash
cd Documentos
```

El prompt cambiará para reflejar que ahora estás dentro. Para **salir** a la carpeta que la contiene se usan dos puntos:

```bash
cd ..
```

Y para volver de un salto a tu carpeta personal, desde donde estés:

```bash
cd ~
```

> [!consejo] Arrastra la carpeta a la terminal
>
> Escribir rutas largas a mano es incómodo y propenso a erratas. En Windows, macOS y Linux puedes escribir `cd`, con el espacio al final, y **arrastrar una carpeta desde el explorador hasta la ventana de la terminal**. La ruta se escribe sola. Luego pulsas <kbd>Intro</kbd>.

> [!consejo] El tabulador te autocompleta
>
> Escribe las primeras letras de una carpeta y pulsa <kbd>Tab</kbd>. La terminal completa el resto. Si hay varias que empiezan igual, pulsa <kbd>Tab</kbd> dos veces para verlas todas. Es el atajo que más tiempo te va a ahorrar.

### Crear una carpeta

```bash
mkdir mis-programas
```

### Ejecutar un programa de Python

Este es el que más vas a usar. Estando en la carpeta donde está el fichero:

```bash
python hola.py
```

## Tu carpeta de trabajo para el curso

Vamos a crear ahora el sitio donde guardarás todo lo que escribas. Abre la terminal y escribe, línea por línea:

```bash
cd ~
mkdir curso-python
cd curso-python
pwd
```

El último comando te enseña la ruta completa de tu nueva carpeta. **Apúntala o memorízala**: es a donde tendrás que volver cada vez que empieces a trabajar.

```salida
/Users/erwin/curso-python
```

> [!aviso] Ojo con los espacios y los acentos
>
> Evita poner espacios, acentos o eñes en los nombres de carpetas y ficheros de programación. Una ruta como `Mis Programas/año 1` te dará problemas tarde o temprano. Usa guiones: `mis-programas/ano-1`.

## Cuatro atajos que conviene saber ya

| Atajo | Qué hace |
| --- | --- |
| <kbd>Flecha arriba</kbd> | Recupera el comando anterior. Pulsando varias veces recorres el historial entero. |
| <kbd>Tab</kbd> | Autocompleta nombres de ficheros y carpetas. |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Interrumpe el programa que se está ejecutando. Tu salida de emergencia cuando algo se queda colgado. |
| <kbd>Ctrl</kbd> + <kbd>L</kbd> | Limpia la pantalla. En Windows, el comando `cls`. |

> [!error] He escrito mal un comando
>
> No pasa nada, de verdad. La terminal solo ejecuta lo que entiende; si no lo entiende te lo dice y no hace nada. El mensaje `command not found` o `no se reconoce como un comando` significa exactamente eso: revisa si lo has escrito bien y vuelve a intentarlo con la flecha arriba.

> [!resumen] En resumen
>
> La terminal siempre está dentro de una carpeta. `pwd` te dice cuál, `ls` te enseña qué hay, `cd` te mueve, `mkdir` crea carpetas y `python fichero.py` ejecuta tus programas. Con el tabulador y la flecha arriba escribirás la mitad.

> [!ejercicio] Practica
>
> 1. Averigua en qué carpeta se abre tu terminal por defecto.
> 2. Crea dentro de `curso-python` una subcarpeta llamada `modulo-0` y entra en ella.
> 3. Comprueba con `pwd` que estás dentro y con `ls` que está vacía.
> 4. Sube un nivel con `cd ..` y vuelve a listar: ahora deberías ver `modulo-0`.
> 5. Pulsa <kbd>Flecha arriba</kbd> cuatro veces y observa cómo van apareciendo los comandos que acabas de escribir.
