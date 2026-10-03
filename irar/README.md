# Página web de iRar

Sitio 100 % estático: `index.html`, `styles.css`, `app.js` y `assets/`. Sin frameworks, sin compilación, sin dependencias
(solo carga la fuente de Google Fonts; si no está disponible usa la del sistema). Respeta «Reducir movimiento» de macOS.

## Verlo en local

```sh
python3 -m http.server 8765 --directory Web
```

Abre http://localhost:8765. (Abrirlo con doble clic también funciona, pero algunos navegadores limitan archivos locales.)

## Antes de publicar

1. En `app.js`, cambia `const REPO = "https://github.com/TU-USUARIO/iRar"` por tu repositorio. Los botones de descarga
   apuntan a `REPO/releases/latest` y «Ver en GitHub» al repositorio.
2. Crea el DMG con `Scripts/crear-dmg.sh` (resultado en `build/dmg/iRar-<versión>.dmg`) y súbelo a **GitHub Releases**.
   El script ya hace lo de abajo salvo la notarización:
   - Quita `rar` y `default.sfx` de la app (la licencia de RARLAB no permite redistribuir `rar`): la versión publicada solo lee RAR.
   - Sin Developer ID ni notarización, macOS pedirá «clic derecho › Abrir» la primera vez (la página ya lo explica).
   - Compila universal (Apple Silicon e Intel: `ARCHS="arm64 x86_64"`, `ONLY_ACTIVE_ARCH=NO`).
   - Incluye los avisos de licencia: 7-Zip (LGPL), UnRAR, Zstandard (BSD), minizip-ng (zlib).

## Publicar con GitHub Pages

- Si la carpeta queda en la raíz de un repositorio propio para la web: Settings › Pages › «Deploy from a branch» › `main` / `(root)`.
- Si queda dentro del repositorio de iRar: muévela a `docs/` y elige `main` / `/docs`.

Todas las rutas son relativas, así que funciona en cualquier subcarpeta (`usuario.github.io/iRar/`).
