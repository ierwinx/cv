// Tema de iTunes (Theme.swift) y tipos de celda. Lo comparten /itunes/ y la home.
export type Style = { fg: string; bg: string; b: boolean };
export type Cell = Style & { ch: string };
export type Rect = { x: number; y: number; w: number; h: number };

/* ------------------------------------------------------------------------
   Tema (Theme.swift)
   ------------------------------------------------------------------------ */
export const T = {
  background: "#14161C", surface: "#1C1F27", selection: "#2D3750", separator: "#2A2E37",
  text: "#C6CAD3", bright: "#FFFFFF", dim: "#878D99", accent: "#7AA2F7",
  marked: "#E0AF68", error: "#F7768E", track: "#3B4050",
};
export const St = (fg: string, bg = T.background, b = false): Style => ({ fg, bg, b });
