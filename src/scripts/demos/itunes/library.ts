// Biblioteca de ejemplo de iTunes: artistas, álbumes y carátulas de 10×10 px generadas con semilla (siempre iguales).

export type Track = { n: number; title: string; dur: number };
export type Album = { title: string; year: number; codec: string; genre: string; palette: string[]; tracks: Track[]; cover?: string[] };

/* ------------------------------------------------------------------------
   Biblioteca de ejemplo
   ------------------------------------------------------------------------ */
export const sec = (t: string) => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
export const album = (title: string, year: number, codec: string, genre: string, palette: string[], tracks: [string, string][]): Album => ({
  title, year, codec, genre, palette,
  tracks: tracks.map(([t, d], i) => ({ n: i + 1, title: t, dur: sec(d) })),
});

export const LIBRARY: Record<string, Album[]> = {
  "Insite": [
    album("Insite", 2003, "MP3", "Rock", ["#f4f4f4", "#e8e6e6", "#c9c4c4", "#d9a0a0", "#ffffff"], [
      ["Breathe (Crispy)", "3:23"], ["Missing You", "3:00"], ["Since You Left", "4:27"],
      ["Through My Eyes", "4:08"], ["Forever", "4:52"], ["Stay", "3:56"]]),
    album("Otra Historia EP", 2004, "FLAC", "Rock", ["#f2f2f2", "#9a9a9a", "#4a4a4a", "#d0d0d0", "#1a1a1a"], [
      ["Sola", "4:01"], ["Otra Historia", "4:12"], ["Un Dia Mas Sin Ti", "3:21"], ["Quisiera Estar Lejos", "4:34"],
      ["Head Full of Terror", "3:42"], ["Tal Vez y Algun Dia", "4:25"], ["Rojo Azul", "5:48"]]),
    album("Una Vida No Es Suficiente", 2007, "FLAC", "Rock", ["#5f7a8c", "#9fb2bd", "#c9c2a5", "#3d5566", "#7f97a3"], [
      ["Destrózame", "3:25"], ["Sola", "2:46"], ["Un Día Más Sin Ti", "3:55"], ["Discúlpame Me Rindo", "2:37"],
      ["Preguntas Si Te Amé", "3:27"], ["Contigo Hasta la Muerte", "3:32"], ["Siempre Me Dejas", "3:40"],
      ["Continuación", "5:08"], ["Quisiera Estar Lejos", "3:36"], ["Luces", "3:26"],
      ["Cielos Que Lloran", "2:53"], ["Y Soñar", "4:10"]]),
    album("Esperando a Que Amanezca", 2008, "FLAC", "Rock", ["#111111", "#f0f0f0", "#5a4a44", "#2a2a2a", "#c8c8c8"], [
      ["Renacer", "3:16"], ["Piensa en Que", "3:06"], ["Zero", "3:31"], ["Un Lugar Mejor", "3:49"],
      ["Lluvia-Vida", "3:30"], ["Tus Últimas Horas", "3:33"], ["Todo Gris", "4:01"],
      ["Me Amarás al Amanecer", "3:56"], ["Me Enseñaste Bien", "3:00"], ["No Me Verás Volver", "3:21"],
      ["Copas de Mentiras", "3:40"], ["Mi Peor Historia", "12:45"]]),
    album("Rojo Azul Remasterizado", 2008, "MP3", "Rock", ["#bcd2e8", "#e9e4dc", "#8a6a55", "#d9b49a", "#6f8fb5"], [
      ["RojoAzul Remasterizado", "5:45"]]),
    album("Sigo Esperando A Que Hoy Neve", 2009, "MP3", "Rock", ["#8fb0d6", "#5d6f86", "#a68a73", "#dfe6ee", "#3e4d63"], [
      ["Sigo Esperando A Que Hoy Neve", "4:25"]]),
    album("M M X", 2010, "FLAC", "Rock", ["#0b1030", "#3d4f9f", "#c0c6e8", "#8a1f2c", "#06070f"], [
      ["Plainsong", "4:49"], ["Las Mismas Cosas", "3:14"], ["Siento Que", "4:08"],
      ["Y en Eso Apareces", "4:07"], ["Discúlpame Me Rindo (Acústica)", "3:21"]]),
    album("Ahora Soy Yo Contra el Mundo", 2012, "FLAC", "Rock", ["#05070d", "#11203f", "#2c5bb5", "#0a0f1c", "#4f86e0"], [
      ["¿que Será de Mi ?", "3:56"], ["Si Algún Día", "3:46"], ["Vida Nueva", "4:33"],
      ["Ahora Soy Yo Contra el Mundo", "4:32"], ["Déjame Vivir", "4:14"]]),
  ],
  "Silverstein": [
    album("When Broken Is Easily Fixed", 2003, "FLAC", "Post-hardcore", ["#e8c35a", "#b07a3a", "#f3e2a0", "#5e6b8a", "#d79a52"], [
      ["Smashed into Pieces", "3:22"], ["Red Light Pledge", "3:41"], ["Giving Up", "3:54"],
      ["Bleeds No More", "3:05"], ["Last Days of Summer", "3:52"], ["November", "3:47"],
      ["Wish I Could Forget You", "3:51"], ["The Weak and the Wounded", "4:05"],
      ["When Broken Is Easily Fixed", "4:20"], ["Friends in Fall Colors", "4:31"]]),
    album("Discovering the Waterfront", 2005, "FLAC", "Post-hardcore", ["#2f4a5c", "#7fa6b8", "#e0d3b8", "#1b2a33", "#b8c9cf"], [
      ["Your Sword Versus My Dagger", "3:34"], ["Smile in Your Sleep", "3:56"], ["The Ides of March", "3:50"],
      ["My Heroine", "3:43"], ["Fist Wrapped in Blood", "3:12"], ["Already Dead", "3:49"],
      ["Defend You", "4:13"], ["Call It Karma", "4:20"], ["Discovering the Waterfront", "4:28"],
      ["Three Hours Back", "3:16"], ["Always and Never", "3:47"]]),
  ],
};

export const ARTIST_NAMES = [
  "A Day To Remember", "Alesana", "Asking Alexandria", "Avenged Sevenfold",
  "Blessthefall", "Bring Me The Horizon", "Bullet For My Valentine",
  "Chiodos", "Crown The Empire", "Dance Gavin Dance", "Escape The Fate",
  "Fall Out Boy", "Falling In Reverse", "Green Day", "Hawthorne Heights",
  "Ice Nine Kills", "Insite", "James Blunt", "JerryC", "Kar Accidents", "Killswitch Engage", "Knocked Loose",
  "Libra CL", "Motionless In White", "Movements", "Moving On", "Muse", "My Chemical Romance",
  "Nightwish", "Olivia Rodrigo", "Orianthi", "Panda", "Panic! At The Disco", "Papa Roach", "Paul Gilbert",
  "Pierce The Veil", "Poppy", "QBO", "Queen", "Red", "Ryan Gosling, Emma Stone", "Saint Asonia", "Saosin",
  "Scary Kids Scaring Kids", "Seether", "Siempre Me Dejas", "Silverstein", "Sleep Token",
  "Sleeping With Sirens", "Slipknot", "Spiritbox", "Stravaganzza", "Taylor Acorn", "Tempting Paris",
  "The Alan Parsons Project", "The Devil Wears Prada", "The Horrors", "The Killers", "The Plot In You",
  "The Verve", "Thermo", "Thirty Seconds To Mars", "This Wild Life", "Too Close To Touch", "Trivium", "TX2",
  "Underoath", "While She Sleeps", "Wolves At The Gate", "Yellowcard",
];

// PRNG con semilla para que las carátulas de demo sean siempre iguales.
export const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c: number[]) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

const GENERIC_PALETTES = [
  ["#2b1d3a", "#6d3fa0", "#e2a3c7", "#140c1e", "#a3708f"], ["#1d2b22", "#4f8a5c", "#d8e6c9", "#0d140f", "#9fbf8a"],
  ["#3a1d1d", "#a04040", "#f0c9a0", "#1a0a0a", "#d98a5a"], ["#1d2a3a", "#4070a0", "#c9dcf0", "#0a121a", "#8ab0d9"],
  ["#33301d", "#a09040", "#f0e6a0", "#14120a", "#d9c25a"], ["#202020", "#707070", "#e0e0e0", "#080808", "#b0b0b0"],
];
const GENERIC_TITLES = ["Sesiones", "En Vivo", "Lados B", "Acústico", "Rarezas", "Demos"];

/** Carátula de 10×10 px: ruido suave sobre la paleta del álbum (se ve como las carátulas reales reducidas). */
export function makeCover(seedText: string, palette: string[]) {
  const r = rng(hash(seedText));
  const g = 4, grid = Array.from({ length: g * g }, () => r());
  const cols = palette.map(hexToRgb);
  const px: string[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const fx = (x / 9) * (g - 1), fy = (y / 9) * (g - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(g - 1, x0 + 1), y1 = Math.min(g - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const v = (grid[y0 * g + x0] * (1 - tx) + grid[y0 * g + x1] * tx) * (1 - ty) +
                (grid[y1 * g + x0] * (1 - tx) + grid[y1 * g + x1] * tx) * ty;
      const p = Math.min(cols.length - 1.001, Math.max(0, (v + (r() - .5) * .35) * (cols.length - 1)));
      const i = Math.floor(p), f = p - i, a = cols[i], b = cols[i + 1];
      px.push(rgbToHex(a.map((c, k) => c + (b[k] - c) * f + (r() - .5) * 18)));
    }
  }
  return px;
}

export const ARTISTS = ARTIST_NAMES.map((name) => {
  let albums = LIBRARY[name];
  if (!albums) {
    const r = rng(hash(name));
    const count = 1 + Math.floor(r() * 3);
    let year = 2004 + Math.floor(r() * 12);
    albums = Array.from({ length: count }, (_, i) => {
      const n = 4 + Math.floor(r() * 7);
      year += 1 + Math.floor(r() * 3);
      const pal = GENERIC_PALETTES[Math.floor(r() * GENERIC_PALETTES.length)];
      return album(i === 0 ? name : GENERIC_TITLES[(i + Math.floor(r() * 6)) % 6], year, r() > .4 ? "FLAC" : "MP3", "Rock", pal,
        Array.from({ length: n }, (_, k): [string, string] => [`Pista ${String(k + 1).padStart(2, "0")}`, `${2 + Math.floor(r() * 3)}:${String(Math.floor(r() * 60)).padStart(2, "0")}`]));
    });
  }
  albums.forEach((a) => { a.cover = makeCover(name + a.title, a.palette); });
  return { name, albums };
});

/** Duración m:ss (o h:mm:ss). */
export const fmt = (s: number) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`; };
