// Modales nativos (<dialog> + showModal()): el navegador ya da foco atrapado, página inerte, Esc, gesto de «atrás» y
// devuelve el foco al botón que lo abrió. Cerrar al tocar fuera lo hace closedby="any" en el marcado; esto es solo el
// respaldo para los navegadores que aún no lo tienen (Safari).

/** Cierra `dialog` al hacer clic en el fondo (::backdrop) donde no exista `closedby`. */
export function lightDismiss(dialog: HTMLDialogElement) {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  dialog.addEventListener('click', (e) => {
    // Un clic en el fondo tiene como destino el propio <dialog>; uno dentro del contenido, a sus hijos.
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
    if (!inside) dialog.close();
  });
}
