#!/usr/bin/env bash
# Publica el instalador de una app en GitHub Releases de ierwinx/cv.
#
#   tools/release.sh <tag> <archivo>
#   tools/release.sh ibridge-v1.1 ~/Desarrollo/iBridge/build/iBridge-1.1.dmg
#
# Después, en src/data/apps.json, pon el mismo tag y nombre de archivo en "release"
# (y "version"/"size"): la página y el JSON-LD toman de ahí el enlace de descarga.
# Requiere GitHub CLI con sesión iniciada: brew install gh && gh auth login
set -euo pipefail

REPO="ierwinx/cv"
[[ $# -eq 2 ]] || { sed -n '2,10p' "$0"; exit 1; }
TAG="$1"
FILE="$2"
[[ -f "$FILE" ]] || { echo "No existe $FILE" >&2; exit 1; }
command -v gh >/dev/null || { echo "Falta GitHub CLI: brew install gh && gh auth login" >&2; exit 1; }

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
    gh release upload "$TAG" "$FILE" --repo "$REPO" --clobber
else
    gh release create "$TAG" "$FILE" --repo "$REPO" --title "$TAG" \
        --notes "Instalador de $(basename "$FILE"). SHA-256: $(shasum -a 256 "$FILE" | cut -d' ' -f1)"
fi
echo "https://github.com/$REPO/releases/download/$TAG/$(basename "$FILE")"
