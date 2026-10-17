import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketVentaComponent } from './ticket-venta.component';
import type { VentaDetalle } from './models/ventas.models';

const DETALLE: VentaDetalle = {
  venta: {
    id_venta: 182, id_cliente: 1, cliente: 'CONSUMIDOR FINAL', tipo_documento: 'CC', numero_documento: '222222222222', id_periodo: 19, fecha_venta: '2026-10-17T17:03:09',
    tipo_venta: 'CONTADO', fecha_vencimiento: null, subtotal_venta: 14500, total_iva: 0, total_venta: 14500, saldo_pendiente: 0, monto_castigado: 0, estado_pago: 'PAGADA',
    motivo_anulacion: null, usuario_registro: 'kevin.mijares', fecha_registro: '2026-10-17T22:03:10',
  },
  lineas: [
    { id_detalle: 1, id_producto: 1, codigo_sku: 'YOG', producto: 'Yogurt natural 1 L', unidad_medida: 'UND', cantidad: 1, precio_unitario: 7500, precio_lista: 7500, precio_pactado: false, tarifa_iva: 0, subtotal: 7500, valor_iva: 0, total_linea: 7500 },
    { id_detalle: 2, id_producto: 2, codigo_sku: 'KUM', producto: 'Kumis 1 L', unidad_medida: 'UND', cantidad: 2, precio_unitario: 3500, precio_lista: 4000, precio_pactado: true, tarifa_iva: 0, subtotal: 7000, valor_iva: 0, total_linea: 7000 },
  ],
  pagos: [
    { id_pago: 1, metodo_pago: 'EFECTIVO', monto: 10000, referencia_pago: null },
    { id_pago: 2, metodo_pago: 'TRANSFERENCIA', monto: 4500, referencia_pago: 'NEQUI-123' },
  ],
};

describe('TicketVentaComponent', () => {
  function crear(detalle: VentaDetalle = DETALLE, ancho: 58 | 80 = 80): ComponentFixture<TicketVentaComponent> {
    const f = TestBed.createComponent(TicketVentaComponent);
    f.componentRef.setInput('detalle', detalle);
    f.componentRef.setInput('ancho', ancho);
    f.detectChanges();
    return f;
  }
  const ticket = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testid=ticket]')!;
  /** The text as a person reads it: each piece of text separated by a space (as the columns of the paper are). */
  const texto = (f: ComponentFixture<unknown>) => {
    const recorrido = document.createTreeWalker(ticket(f), NodeFilter.SHOW_TEXT);
    const trozos: string[] = [];
    while (recorrido.nextNode()) trozos.push(recorrido.currentNode.textContent ?? '');
    return trozos.join(' ').replace(/\s+/g, ' ').trim();
  };

  it('es la zona que se imprime y tiene el ancho del rollo en milímetros', () => {
    const f = crear(DETALLE, 80);
    expect(ticket(f).classList.contains('zona-impresion-ticket')).toBe(true);
    expect(ticket(f).style.width).toBe('80mm');
    expect(ticket(f).classList.contains('ticket-58')).toBe(false);

    const g = crear(DETALLE, 58);
    expect(ticket(g).style.width).toBe('58mm');
    expect(ticket(g).classList.contains('ticket-58')).toBe(true);
  });

  it('trae número, fecha, cliente, quien atendió, productos con cantidad × precio, totales y pagos, tal como los devuelve el servidor', () => {
    const t = texto(crear());

    expect(t).toContain('Venta N.º 182');
    expect(t).toContain('17/10/2026 17:03');
    expect(t).toContain('Cliente: CONSUMIDOR FINAL');
    expect(t).toContain('Documento: 222222222222');
    expect(t).toContain('Atendió: kevin.mijares');
    expect(t).toContain('Yogurt natural 1 L');
    expect(t).toContain('1 UND × $ 7.500');
    expect(t).toContain('2 UND × $ 3.500');
    expect(t).toContain('Subtotal $ 14.500');
    expect(t).toContain('TOTAL $ 14.500');
    expect(t).toContain('Efectivo $ 10.000');
    expect(t).toContain('Transferencia $ 4.500');
    expect(t).toContain('Ref. NEQUI-123');
    expect(t).toContain('¡Gracias por su compra!');
  });

  it('marca el producto con precio pactado', () => {
    expect(texto(crear())).toContain('Kumis 1 L (pactado)');
    expect(texto(crear())).not.toContain('Yogurt natural 1 L (pactado)');
  });

  it('una venta anulada lo grita en el papel', () => {
    const f = crear({ ...DETALLE, venta: { ...DETALLE.venta, estado_pago: 'ANULADA' } });
    expect((ticket(f).querySelector('[data-testid=ticket-anulada]')?.textContent ?? '').toUpperCase()).toContain('VENTA ANULADA');
    expect(ticket(crear()).querySelector('[data-testid=ticket-anulada]')).toBeNull();
  });

  it('a crédito muestra el saldo pendiente y el vencimiento; de contado no', () => {
    const credito = crear({ ...DETALLE, venta: { ...DETALLE.venta, tipo_venta: 'CREDITO', saldo_pendiente: 14500, fecha_vencimiento: '2026-11-16' }, pagos: [] });
    expect(texto(credito)).toContain('Saldo pendiente $ 14.500');
    expect(texto(credito)).toContain('Vence 16/11/2026');
    expect(texto(credito)).not.toContain('Pagos');
    expect(texto(crear())).not.toContain('Saldo pendiente');
  });
});
