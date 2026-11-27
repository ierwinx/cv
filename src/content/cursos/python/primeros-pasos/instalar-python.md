---
titulo: "Instalar Python"
resumen: "Instalación paso a paso en Windows, macOS y Linux, y cómo comprobar que ha quedado bien antes de continuar."
minutos: 12
orden: 2
---

Esta lección tiene tres caminos según tu sistema operativo. Ve directo al tuyo, haz la comprobación final y pasa a la siguiente lección.

> [!objetivo] Qué vas a aprender
>
> Al terminar tendrás el intérprete de Python instalado y habrás comprobado, desde la terminal, que responde y te dice su versión.

## Windows

La forma recomendada es el instalador oficial.

1. Entra en [python.org/downloads](https://www.python.org/downloads/). La página detecta tu sistema y te ofrece el botón amarillo **Download Python 3.x.x**. Púlsalo.
2. Abre el fichero `.exe` que se ha descargado.
3. **Este paso es el importante.** En la primera pantalla del instalador, abajo del todo, hay una casilla que dice **"Add python.exe to PATH"**. Márcala antes de nada.
4. Pulsa **Install Now** y espera a que termine.
5. Cierra el instalador.

> [!aviso] Si se te olvidó marcar la casilla
>
> Sin "Add python.exe to PATH", la terminal no encontrará Python y verás el mensaje `'python' no se reconoce como un comando interno o externo`. No pasa nada: vuelve a ejecutar el instalador, elige **Modify**, sigue hasta el final y en la pantalla de opciones avanzadas marca **Add Python to environment variables**.

Para abrir la terminal en Windows, pulsa <kbd>Win</kbd> + <kbd>R</kbd>, escribe `cmd` y pulsa <kbd>Intro</kbd>. También puedes buscar "PowerShell" en el menú de inicio; cualquiera de las dos sirve.

## macOS

macOS trae un Python antiguo de fábrica que Apple usa para sus cosas y que no debes tocar. Vas a instalar el tuyo aparte. Hay dos opciones y ambas son correctas.

**Opción A, instalador oficial.** Es la más sencilla si nunca has usado la terminal:

1. Entra en [python.org/downloads](https://www.python.org/downloads/) y descarga el `.pkg`.
2. Ábrelo y acepta todas las pantallas.
3. Al final se abre una carpeta con un fichero llamado `Install Certificates.command`. Haz doble clic en él y deja que termine. Evita problemas de conexión a internet más adelante.

**Opción B, con Homebrew.** Si ya tienes Homebrew o quieres tenerlo, es más cómodo para actualizar:

```bash
brew install python
```

La terminal en macOS se abre con <kbd>Cmd</kbd> + <kbd>Espacio</kbd>, escribiendo `Terminal` y pulsando <kbd>Intro</kbd>.

## Linux

Casi todas las distribuciones ya traen Python 3. Lo que suele faltar es `pip`, el instalador de paquetes, y el módulo para crear entornos virtuales.

En Debian, Ubuntu, Mint y derivadas:

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

En Fedora:

```bash
sudo dnf install python3 python3-pip
```

En Arch y derivadas:

```bash
sudo pacman -S python python-pip
```

## Comprobar que ha funcionado

Abre una terminal **nueva** (si la tenías abierta durante la instalación, ciérrala y vuelve a abrirla) y escribe:

```bash
python --version
```

Deberías ver algo así, con el número de versión que hayas instalado:

```salida
Python 3.13.2
```

> [!aviso] En macOS y Linux escribe python3
>
> En esos sistemas el comando `python` a secas puede no existir o apuntar a la versión vieja. Usa siempre `python3`:
>
> ```bash
> python3 --version
> ```
>
> A lo largo del curso escribiré `python`. Si estás en macOS o Linux, traduce mentalmente a `python3`. Lo mismo con `pip` y `pip3`.

Comprueba también el instalador de paquetes, que necesitarás en los módulos de Django y APIs:

```bash
pip --version
```

```salida
pip 24.3.1 from /usr/lib/python3/dist-packages/pip (python 3.13)
```

## Si algo ha salido mal

> [!error] El comando no se reconoce
>
> Significa que la terminal no sabe dónde está Python. En Windows es casi siempre la casilla del PATH sin marcar: repite la instalación con **Modify** como se explica arriba. En macOS y Linux, prueba con `python3` en vez de `python`.

> [!error] Me sale Python 2.7
>
> Estás ejecutando el Python antiguo del sistema. Usa `python3` en su lugar. Si `python3 --version` tampoco funciona, es que no se instaló: repite los pasos de tu sistema.

> [!error] Se abre la Microsoft Store al escribir python
>
> Windows trae un acceso directo falso a Python que lleva a la tienda. Ve a **Configuración → Aplicaciones → Alias de ejecución de aplicaciones** y desactiva las dos entradas llamadas `python.exe` y `python3.exe`. Luego abre una terminal nueva.

> [!resumen] En resumen
>
> Instala Python 3 desde python.org (en Windows marcando la casilla del PATH) o con el gestor de paquetes de tu sistema. Comprueba el resultado con `python --version` en una terminal recién abierta. Si estás en macOS o Linux, tu comando es `python3`.

> [!ejercicio] Practica
>
> 1. Ejecuta `python --version` y anota exactamente qué versión tienes.
> 2. Ejecuta `pip --version` y comprueba que responde.
> 3. Cierra la terminal, ábrela de nuevo y repite el primer comando. Debe seguir funcionando: si solo funcionaba en la ventana anterior, la instalación no quedó bien.
