import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AnchoPapel } from '../../shared/services/papel-ticket.service';
import { formatoCop, formatoFecha, formatoFechaHora, formatoNumero } from '../../shared/utils/formato-co';
import type { VentaDetalle } from './models/ventas.models';
import { etiquetaMetodo, etiquetaTipoVenta } from './ventas.format';

/**
 * The sale as a receipt for a thermal printer (58 or 80 mm roll): one narrow column, centred title, dashed separators and
 * monospace figures. It looks like the paper on screen and is what gets printed (`.zona-impresion-ticket`). The figures are the
 * SERVER's: nothing is recomputed here.
 */
@Component({
  selector: 'app-ticket-venta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let v = detalle().venta;
    <div
      class="zona-impresion-ticket ticket-termico mx-auto bg-white font-mono text-black"
      [class.ticket-58]="ancho() === 58"
      [style.width.mm]="ancho()"
      [attr.data-ancho]="ancho()"
      data-testid="ticket"
    >
      <header class="text-center">
        <p class="ticket-titulo font-bold uppercase tracking-wide">Llanolat</p>
        <p>Ticket de venta</p>
      </header>

      <hr class="ticket-linea" />
      <dl class="space-y-0.5">
        <div class="flex justify-between gap-2"><dt>Venta N.º</dt><dd class="font-bold" data-testid="numero-venta">{{ v.id_venta }}</dd></div>
        <div class="flex justify-between gap-2"><dt>Fecha</dt><dd>{{ fechaVenta() }}</dd></div>
        <div class="flex justify-between gap-2"><dt>Pago</dt><dd>{{ tipo(v.tipo_venta) }}</dd></div>
        <div><dt class="inline">Cliente: </dt><dd class="inline break-words">{{ v.cliente }}</dd></div>
        <div><dt class="inline">Documento: </dt><dd class="inline">{{ v.numero_documento }}</dd></div>
        <div><dt class="inline">Atendió: </dt><dd class="inline break-words">{{ v.usuario_registro }}</dd></div>
      </dl>

      @if (v.estado_pago === 'ANULADA') {
        <p class="my-2 border-2 border-black py-1 text-center font-bold uppercase" data-testid="ticket-anulada">Venta anulada</p>
      }

      <hr class="ticket-linea" />
      <ul class="space-y-1.5" aria-label="Productos">
        @for (l of detalle().lineas; track l.id_detalle) {
          <li>
            <p class="break-words font-bold">{{ l.producto }}@if (l.precio_pactado) { <span class="font-normal"> (pactado)</span> }</p>
            <p class="flex justify-between gap-2">
              <span>{{ numero(l.cantidad) }} {{ l.unidad_medida }} × {{ cop(l.precio_unitario) }}</span>
              <span class="shrink-0 tabular-nums">{{ cop(l.total_linea) }}</span>
            </p>
          </li>
        }
      </ul>

      <hr class="ticket-linea" />
      <dl class="space-y-0.5">
        <div class="flex justify-between gap-2"><dt>Subtotal</dt><dd class="tabular-nums">{{ cop(v.subtotal_venta) }}</dd></div>
        <div class="flex justify-between gap-2"><dt>IVA</dt><dd class="tabular-nums">{{ cop(v.total_iva) }}</dd></div>
        <div class="ticket-total flex justify-between gap-2 font-bold"><dt>TOTAL</dt><dd class="tabular-nums" data-testid="total-servidor">{{ cop(v.total_venta) }}</dd></div>
      </dl>

      @if (detalle().pagos.length > 0) {
        <hr class="ticket-linea" />
        <p class="font-bold">Pagos</p>
        <ul class="space-y-0.5">
          @for (p of detalle().pagos; track p.id_pago) {
            <li class="flex justify-between gap-2">
              <span class="break-words">{{ metodo(p.metodo_pago) }}</span>
              <span class="shrink-0 tabular-nums">{{ cop(p.monto) }}</span>
            </li>
            @if (p.referencia_pago) {
              <li class="-mt-0.5 ps-2">Ref. {{ p.referencia_pago }}</li>
            }
          }
        </ul>
      }

      @if (v.tipo_venta === 'CREDITO') {
        <hr class="ticket-linea" />
        <div class="flex justify-between gap-2 font-bold"><span>Saldo pendiente</span><span class="tabular-nums">{{ cop(v.saldo_pendiente) }}</span></div>
        @if (v.fecha_vencimiento) {
          <div class="flex justify-between gap-2"><span>Vence</span><span>{{ fecha(v.fecha_vencimiento) }}</span></div>
        }
      }

      <hr class="ticket-linea" />
      <footer class="text-center">
        <p>¡Gracias por su compra!</p>
        <p class="ticket-pequeno">Registrada {{ fechaHora(v.fecha_registro) }}</p>
      </footer>
    </div>
  `,
})
export class TicketVentaComponent {
  readonly detalle = input.required<VentaDetalle>();
  /** Width of the paper roll in mm. */
  readonly ancho = input<AnchoPapel>(80);

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly fecha = formatoFecha;
  protected readonly fechaHora = formatoFechaHora;
  protected readonly tipo = etiquetaTipoVenta;
  protected readonly metodo = etiquetaMetodo;

  /** `2026-10-09T15:42:10` (Colombia) -> `09/10/2026 15:42`, without converting any zone. */
  protected readonly fechaVenta = computed(() => {
    const iso = this.detalle().venta.fecha_venta;
    return `${formatoFecha(iso)} ${iso.slice(11, 16)}`;
  });
}
