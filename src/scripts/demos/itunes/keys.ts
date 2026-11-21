// Atajos, comandos, ecualizador y campos de tags de iTunes (KeyBindings.swift, Equalizer.swift).

/* ------------------------------------------------------------------------
   Atajos y comandos (KeyBindings.swift) — la ayuda y la sección de atajos salen de aquí
   ------------------------------------------------------------------------ */
export const BINDINGS: [string, [string[], string][]][] = [
  ["Navegación", [
    [["Tab"], "Siguiente panel"], [["Shift+Tab"], "Panel anterior"],
    [["←"], "Panel izquierdo · botón ant."], [["→"], "Panel derecho · botón sig."],
    [["↑", "k"], "Subir (Reproductor: vol +)"], [["↓", "j"], "Bajar (Reproductor: vol −)"],
    [["RePág"], "Página arriba"], [["AvPág"], "Página abajo"],
    [["Inicio"], "Ir al principio"], [["Fin"], "Ir al final"],
    [["Enter"], "Abrir · reproducir · pulsar"], [["/"], "Buscar artista"],
  ]],
  ["Reproducción", [
    [["Espacio", "F8"], "Play / pausa"], [["n", "F9"], "Siguiente"], [["p", "F7"], "Anterior (o reiniciar)"],
    [[","], "Retroceder 5 s"], [["."], "Avanzar 5 s"], [["<"], "Retroceder 30 s"], [[">"], "Avanzar 30 s"],
    [["0–9"], "Saltar al 0 %–90 %"], [["t"], "Ir a minuto (1:42)"],
    [["+"], "Subir volumen"], [["-"], "Bajar volumen"], [["m"], "Silenciar"],
    [["s"], "Aleatorio"], [["r"], "Repetir: no → todo → una"], [["="], "Ecualizador"],
  ]],
  ["Edición", [
    [["x"], "Marcar pista / álbum"], [["Shift+↑"], "Extender selección arriba"],
    [["Shift+↓"], "Extender selección abajo"], [["Esc"], "Limpiar selección"],
    [["e"], "Editar tags (formulario)"], [["E"], "Todos los tags en $EDITOR"],
    [["l"], "Ver letra"], [["L"], "Editar letra en $EDITOR"],
  ]],
  ["General", [
    [[":"], "Comandos (:help)"], [["?"], "Esta ayuda"], [["q", "Ctrl+C"], "Salir"],
  ]],
];
export const COMMANDS = [
  [":add <ruta>", "Agregar carpeta y reindexar"], [":rm <ruta>", "Quitar carpeta y reindexar"],
  [":paths", "Ver / quitar carpetas"], [":reindex[!]", "Reindexar (! relee todo)"],
  [":eq [preset|on|off]", "Ecualizador"], [":eq save <nombre>", "Guardar preset propio"],
  [":seek 1:42", "Ir a minuto"], [":vol 80", "Volumen"],
  [":cover <imagen>", "Poner carátula a la selección"], [":cover remove", "Quitar carátula"], [":q", "Salir"],
];

/* ------------------------------------------------------------------------
   Ecualizador (Equalizer.swift)
   ------------------------------------------------------------------------ */
export const FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const PRESETS: [string, number[]][] = [
  ["Plano", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], ["Rock", [5, 4, 3, 1, -1, -1, 1, 3, 4, 5]],
  ["Pop", [-1, 0, 2, 4, 5, 4, 2, 0, -1, -1]], ["Jazz", [4, 3, 1, 2, -1, -1, 0, 1, 3, 4]],
  ["Clásica", [5, 4, 3, 2, -1, -1, 0, 2, 3, 4]], ["Electrónica", [5, 4, 1, 0, -2, 2, 1, 1, 4, 5]],
  ["Más graves", [6, 5, 4, 2, 1, 0, 0, 0, 0, 0]], ["Voces", [-2, -3, -3, 1, 4, 4, 3, 1, 0, -2]],
  ["Acústica", [4, 4, 3, 1, 2, 1, 3, 3, 3, 2]],
];
export const TAG_FIELDS = [
  ["TITLE", "Título"], ["ARTIST", "Artista"], ["ALBUMARTIST", "Artista del álbum"], ["ALBUM", "Álbum"],
  ["DATE", "Año"], ["TRACKNUMBER", "Pista"], ["DISCNUMBER", "Disco"], ["GENRE", "Género"],
  ["COMPOSER", "Compositor"], ["COMMENT", "Comentario"],
];
