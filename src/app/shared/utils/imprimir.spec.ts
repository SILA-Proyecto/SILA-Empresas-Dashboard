import { imprimirTicket } from './imprimir';

describe('imprimirTicket', () => {
  let imprimir: ReturnType<typeof vi.fn>;
  const paginas = () => Array.from(document.head.querySelectorAll('style')).filter((s) => s.textContent?.includes('@page'));

  /** A thermal ticket in the page whose height (px) the browser would report. */
  function ticket(altoPx: number, oculto = false): HTMLElement {
    const envoltura = document.createElement('div');
    if (oculto) envoltura.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'ticket-termico';
    el.getBoundingClientRect = () => ({ height: altoPx, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    envoltura.appendChild(el);
    document.body.appendChild(envoltura);
    return envoltura;
  }

  beforeEach(() => {
    imprimir = vi.fn();
    window.print = imprimir as unknown as typeof window.print;
  });
  afterEach(() => {
    window.dispatchEvent(new Event('afterprint'));
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('con el ancho del rollo pide una página de ese ancho y del largo del ticket (más una holgura), sin márgenes, y la quita al terminar', () => {
    ticket(378); // 378 px = 100 mm
    imprimirTicket(58);

    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains('imprimiendo-ticket')).toBe(true);
    expect(paginas()).toHaveLength(1);
    expect(paginas()[0].textContent).toBe('@page { size: 58mm 107mm; margin: 0; }');
    // «auto» is not a valid length for the page: it would make the browser ignore the whole rule.
    expect(paginas()[0].textContent).not.toContain('auto');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('imprimiendo-ticket')).toBe(false);
    expect(paginas()).toHaveLength(0);
  });

  it('mide el ticket aunque la pantalla lo tenga oculto (el detalle de una venta) y lo deja oculto', () => {
    const envoltura = ticket(756, true); // 200 mm
    imprimirTicket(80);

    expect(paginas()[0].textContent).toBe('@page { size: 80mm 207mm; margin: 0; }');
    expect(envoltura.style.display).toBe('none');
  });

  it('si no puede medir el ticket solo quita el margen', () => {
    imprimirTicket(80);
    expect(paginas()[0].textContent).toBe('@page { margin: 0; }');
  });

  it('sin ancho imprime como siempre, sin tocar el tamaño de la página', () => {
    ticket(378);
    imprimirTicket();

    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(paginas()).toHaveLength(0);
    expect(document.body.classList.contains('imprimiendo-ticket')).toBe(true);
  });
});
