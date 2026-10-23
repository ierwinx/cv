// Home · iSpecter: espectrograma en vivo que alterna entre lossless real y un MP3 disfrazado (corte en 16 kHz).
import { $ } from '../core/dom';
import { reduceMotion, whileVisible } from '../core/motion';

const NYQUIST = 22.05;
const FAKE_CUT = 16;
const COL = 2;

// Mapa de color tipo «inferno», muestreado en 256 entradas.
const STOPS = [[0, 0, 0, 4], [0.15, 31, 12, 72], [0.3, 85, 15, 109], [0.45, 136, 34, 106], [0.6, 186, 54, 85], [0.72, 227, 89, 51], [0.85, 249, 140, 10], [0.94, 249, 201, 50], [1, 252, 255, 164]];
const LUT = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255;
  let k = 0;
  while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
  const [t0, r0, g0, b0] = STOPS[k];
  const [t1, r1, g1, b1] = STOPS[k + 1];
  const u = (t - t0) / (t1 - t0);
  return [r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u];
});

export function mount(root: HTMLElement) {
  const canvas = $<HTMLCanvasElement>('canvas', root)!;
  const ctx = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  const cutoff = $('[data-cutoff]', root)!;
  const verdict = $('[data-verdict]', root)!;
  const column = ctx.createImageData(COL, H);
  let fake = false, tick = 0;

  function drawColumn() {
    tick++;
    const beat = Math.pow(Math.max(0, Math.sin(tick * 0.09)), 6);
    const melody = 0.12 + 0.06 * Math.sin(tick * 0.013) + 0.04 * Math.sin(tick * 0.031);
    for (let y = 0; y < H; y++) {
      const f = 1 - y / H; // 0 = 0 Hz (abajo), 1 = Nyquist (arriba)
      let e = Math.pow(1 - f, 1.6) * (0.55 + 0.35 * Math.random());
      e += beat * 0.45 * Math.pow(1 - f, 0.6) * Math.random();
      for (let h = 1; h <= 6; h++) {
        const d = Math.abs(f - melody * h);
        if (d < 0.006) e += (0.9 / h) * (1 - d / 0.006);
      }
      e += 0.08 * Math.random();
      if (fake && f * NYQUIST > FAKE_CUT) e *= 0.015;
      const c = LUT[Math.max(0, Math.min(255, Math.floor(e * 255)))];
      for (let x = 0; x < COL; x++) {
        const i = (y * COL + x) * 4;
        column.data[i] = c[0];
        column.data[i + 1] = c[1];
        column.data[i + 2] = c[2];
        column.data[i + 3] = 255;
      }
    }
    ctx.drawImage(canvas, -COL, 0);
    ctx.putImageData(column, W - COL, 0);
  }

  function setMode(isFake: boolean) {
    fake = isFake;
    cutoff.style.setProperty('--cut', canvas.offsetTop + canvas.clientHeight * (1 - FAKE_CUT / NYQUIST) + 'px');
    cutoff.classList.toggle('hide', !isFake);
    verdict.className = 'spec-verdict ' + (isFake ? 'bad' : 'ok');
    verdict.querySelector('span')!.textContent = isFake
      ? 'Veredicto: MP3 disfrazado · corte en 16 kHz'
      : 'Veredicto: lossless real · 24 bits · 96 kHz';
  }

  ctx.fillStyle = '#000004';
  ctx.fillRect(0, 0, W, H);
  setMode(false);
  addEventListener('resize', () => setMode(fake));
  for (let i = 0; i < W / COL; i++) drawColumn(); // relleno inicial: nunca se ve vacío
  if (reduceMotion) return;

  const visible = whileVisible(root);
  let last = 0, modeTimer = 0;
  (async function loop() {
    for (;;) {
      await visible();
      const now = await new Promise<number>(requestAnimationFrame);
      if (now - last < 1000 / 60) continue;
      last = now;
      drawColumn();
      if (++modeTimer > 330) { modeTimer = 0; setMode(!fake); }
    }
  })();
}
