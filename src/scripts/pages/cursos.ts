// /cursos/: tema claro/oscuro y, en la ficha de cada curso, el progreso del lector y «Continuar donde lo dejaste».
import { $, $$ } from '../core/dom';
import { initGlyphs } from '../core/glyphs';
import { initBotonTema, leerProgreso, leerUltima } from '../cursos/almacen';

initBotonTema($('.boton-tema'));
initGlyphs();

for (const ficha of $$('.ficha-curso')) {
  const curso = ficha.dataset.curso!;
  const total = Number(ficha.dataset.total);
  const hechas = Math.min(leerProgreso(curso).length, total);
  const ultima = leerUltima(curso);

  if (hechas > 0) {
    $('.ficha-hechas', ficha)!.textContent = String(hechas);
    $('.relleno-progreso', ficha)!.style.width = `${(hechas / total) * 100}%`;
    $('.ficha-progreso', ficha)!.hidden = false;
  }

  if (ultima) {
    const continuar = $<HTMLAnchorElement>('.ficha-continuar', ficha)!;
    continuar.href = `${ficha.dataset.raiz}${ultima}.html`;
    continuar.hidden = false;
    // Con algo empezado, «Empezar desde cero» pasa a segundo plano.
    $('.ficha-empezar', ficha)!.classList.replace('boton-principal', 'boton-secundario');
  }
}
