// Tamaño real (ancho × alto) de una imagen de public/, leído al compilar. Sirve para poner width/height en los <img>
// que salen de datos (apps.json, listas de capturas) y así reservar su espacio (sin saltos de diseño, CLS).
// Lee solo la cabecera del archivo: WebP (VP8, VP8L, VP8X), PNG y SVG (width/height o viewBox).
import { readFileSync } from 'node:fs';

export interface Size { width: number; height: number }

const cache = new Map<string, Size | undefined>();

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

function webp(b: Uint8Array): Size | undefined {
  if (ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 12) !== 'WEBP') return;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunk = ascii(b, 12, 16);
  if (chunk === 'VP8X') return { width: 1 + u24(b, 24), height: 1 + u24(b, 27) };
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  if (chunk === 'VP8 ') return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
}

function png(b: Uint8Array): Size | undefined {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (v.getUint32(0) !== 0x89504e47) return;
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

function svg(text: string): Size | undefined {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0] ?? '';
  const attr = (n: string) => parseFloat(new RegExp(`\\s${n}="([\\d.]+)`).exec(tag)?.[1] ?? '');
  const w = attr('width'), h = attr('height');
  if (w && h) return { width: Math.round(w), height: Math.round(h) };
  const vb = /viewBox="([^"]+)"/.exec(tag)?.[1].trim().split(/[\s,]+/).map(Number);
  if (vb?.length === 4) return { width: Math.round(vb[2]), height: Math.round(vb[3]) };
}

/** `src` es la ruta con la que se sirve: absoluta (`/ibridge/app-icon.webp`) o relativa a `base` (`/ilegato/`). */
export function imgSize(src: string | undefined, base = '/'): Size | undefined {
  if (!src) return;
  const path = src.startsWith('/') ? src : base.replace(/\/?$/, '/') + src;
  if (cache.has(path)) return cache.get(path);
  let size: Size | undefined;
  try {
    const b = readFileSync(`${process.cwd()}/public${path}`);
    size = path.endsWith('.svg') ? svg(new TextDecoder().decode(b)) : webp(b) ?? png(b);
  } catch { size = undefined; }
  cache.set(path, size);
  return size;
}
