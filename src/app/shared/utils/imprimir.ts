const MM_POR_PX = 25.4 / 96;
/** Spare length below the ticket: the printer may feed a little more, and a rounding error must never push the last line to a second page. */
const HOLGURA_MM = 6;

/** Height in mm of the thermal ticket as it will be printed, even if a parent hides it on screen (it is shown only to measure it). */
function altoDelTicketMm(): number {
  const ticket = document.querySelector<HTMLElement>('.ticket-termico');
  if (!ticket) return 0;
  const mostrados: { el: HTMLElement; antes: string }[] = [];
  for (let n: HTMLElement | null = ticket; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).display === 'none') {
      mostrados.push({ el: n, antes: n.style.cssText });
      n.style.setProperty('display', 'block', 'important');
    }
  }
  const alto = ticket.getBoundingClientRect().height;
  for (const { el, antes } of mostrados) el.style.cssText = antes;
  return alto * MM_POR_PX;
}

/**
 * Prints only the element marked `.zona-impresion-ticket` (see styles.css) and removes the print mode afterwards.
 *
 * With `anchoMm` (a thermal roll: 58 or 80) the page is made exactly as wide as the roll and as long as the ticket, with no margins,
 * so the printer does not feed blank paper. (`size: 80mm auto` is not valid CSS: the length has to be a number.) If the ticket cannot be
 * measured only the margin is removed. The printer driver still decides the real paper, so it must be set to the same roll.
 */
export function imprimirTicket(anchoMm?: number): void {
  document.body.classList.add('imprimiendo-ticket');
  let hoja: HTMLStyleElement | null = null;
  if (anchoMm) {
    const alto = altoDelTicketMm();
    hoja = document.createElement('style');
    hoja.textContent = alto > 0 ? `@page { size: ${anchoMm}mm ${Math.ceil(alto + HOLGURA_MM)}mm; margin: 0; }` : '@page { margin: 0; }';
    document.head.appendChild(hoja);
  }
  window.addEventListener(
    'afterprint',
    () => {
      document.body.classList.remove('imprimiendo-ticket');
      hoja?.remove();
    },
    { once: true },
  );
  window.print();
}
