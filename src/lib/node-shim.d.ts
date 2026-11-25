// Lo mínimo de Node que usa lib/imgsize.ts (corre solo al compilar). No se instala @types/node para no mezclar sus
// tipos globales (setTimeout → NodeJS.Timeout…) con los de los scripts del navegador.
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array;
}
declare const process: { cwd(): string };
