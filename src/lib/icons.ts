// Trazos de los íconos SVG compartidos (viewBox 0 0 24 24). Los usan ui/Icon.astro y ui/GlyphField.astro
// (que puede hacer flotar los rellenos en el fondo).
export const PATHS = {
  apple: '<path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/>',
  android: '<path d="M17.6 9.48l1.84-3.18a.38.38 0 00-.66-.38l-1.86 3.22a11.4 11.4 0 00-9.84 0L5.22 5.92a.38.38 0 00-.66.38L6.4 9.48A10.8 10.8 0 001 18h22a10.8 10.8 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>',
  'google-play': '<path d="M4.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.5-9.7zM15.5 13.4l2.8 2.9-11 6.3c-.4.2-.8.3-1.1.2zM15.5 10.6 6.2 1.2c.3-.1.7 0 1.1.2l11 6.3zM19.6 9.1l2.3 1.3c.9.5.9 1.8 0 2.3l-2.3 1.3-3-3z"/>',
  'arrow-down': '<path d="M12 5v14M5 12l7 7 7-7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  'download-tray': '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"/>',   // flecha con bandeja (botones de descarga)
} as const;

/** Íconos de relleno (los demás son de línea). */
export const FILLED = ['apple', 'android', 'google-play'] as const;
export type IconName = keyof typeof PATHS;
export type FilledIcon = (typeof FILLED)[number];

/** Une los atributos `d` de un ícono en uno solo, para dibujarlo con Path2D en un canvas. */
export const iconPath = (name: IconName) => [...PATHS[name].matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
