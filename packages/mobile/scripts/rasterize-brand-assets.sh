#!/usr/bin/env bash
# Rasteriza los SVG de marca con Inkscape para iconos nativos (iOS/Android).
# Salida: assets/icon-ios-light.png, icon-ios-dark.png, icon.png, adaptive-icon.png
#
# El splash claro/oscuro usa esos PNG + backgroundColor en app.json (plugin
# expo-splash-screen); si cambias colores de fondo del splash, edita allí
# (backgroundColor / dark.backgroundColor).
#
# Variables opcionales: INKSCAPE, ICON_W, ICON_H (por defecto 1024).
set -euo pipefail

INKSCAPE="${INKSCAPE:-/Applications/Inkscape.app/Contents/MacOS/inkscape}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ASSETS="$MOBILE_ROOT/assets"

ICON_W="${ICON_W:-1024}"
ICON_H="${ICON_H:-1024}"

if [[ ! -x "$INKSCAPE" ]]; then
  echo "Inkscape no encontrado en: $INKSCAPE" >&2
  echo "Define INKSCAPE con la ruta al ejecutable, p. ej.:" >&2
  echo "  export INKSCAPE=\"/ruta/a/Inkscape.app/Contents/MacOS/inkscape\"" >&2
  exit 1
fi

rasterize_svg() {
  local src_svg="$1"
  local out_png="$2"
  local w="${3:-$ICON_W}"
  local h="${4:-$ICON_H}"
  "$INKSCAPE" "$src_svg" -o "$out_png" -w "$w" -h "$h"
}

echo "→ Iconos 1024×1024 (iOS light/dark, icono por defecto, adaptive foreground)"
rasterize_svg "$ASSETS/icon-light.svg" "$ASSETS/icon-ios-light.png"
rasterize_svg "$ASSETS/icon-dark.svg" "$ASSETS/icon-ios-dark.png"
# Icono raíz de Expo (Android clásico / fallback): variante clara
rasterize_svg "$ASSETS/icon-light.svg" "$ASSETS/icon.png"
# Adaptive icon (primer plano sobre backgroundColor en app.json)
rasterize_svg "$ASSETS/icon-light.svg" "$ASSETS/adaptive-icon.png"

echo "Listo. Salida en $ASSETS"
