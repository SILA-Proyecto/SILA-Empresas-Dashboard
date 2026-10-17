import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { inject } from '@angular/core';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';
import { formatoCop, formatoNumero } from '../../shared/utils/formato-co';
import { agruparPorEdades, type EdadCartera } from './cartera.calculos';
import { CARTERA_REPOSITORY } from './data/cartera.provider';

/** «¿Desde hace cuánto me deben?»: la deuda de los clientes agrupada por lo atrasada que está. */
@Component({
  selector: 'app-edades-cartera',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sila-card mb-6 p-4" aria-labelledby="edades-titulo" data-testid="edades-cartera">
      <h2 id="edades-titulo" class="text-base font-semibold">¿Desde hace cuánto me deben?</h2>
      <p class="mb-3 text-xs text-muted-foreground">
        Cada cliente cuenta completo según su venta más atrasada. Toca un grupo para ver los clientes con ese atraso o más.
      </p>
      @if (clientes.error()) {
        <p class="text-sm text-destructive" role="alert">
          No se pudo cargar. <button type="button" class="underline" (click)="clientes.reload()">Reintentar</button>
        </p>
      } @else {
        <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          @for (e of edades(); track e.clave) {
            <li>
              <button
                type="button"
                class="flex min-h-11 w-full flex-col rounded-md border border-border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                [attr.data-testid]="'edad-' + e.clave"
                (click)="elegir.emit(e.desde)"
              >
                <span class="text-xs text-muted-foreground">{{ e.texto }}</span>
                <span class="mt-1 text-lg font-bold tabular-nums" [class.text-destructive]="e.desde > 30 && e.saldo > 0">{{ clientes.hasValue() ? cop(e.saldo) : '—' }}</span>
                <span class="text-xs text-muted-foreground tabular-nums">{{ clientes.hasValue() ? numero(e.clientes) + (e.clientes === 1 ? ' cliente' : ' clientes') : '' }}</span>
                <span class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span class="block h-full rounded-full" [class]="e.desde > 30 ? 'bg-destructive' : e.desde > 0 ? 'bg-warning' : 'bg-primary'" [style.width.%]="porcentaje(e)"></span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class EdadesCarteraComponent {
  private readonly repo = inject(CARTERA_REPOSITORY);

  /** Changes when a payment or write-off happens, so the figures are asked for again. */
  readonly version = input(0);
  /** The person tapped a group: the days of mora it starts at (0 = not yet due). */
  readonly elegir = output<number>();

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;

  protected readonly clientes = rxResource({
    params: () => ({ version: this.version() }),
    stream: () => todasLasPaginas((q) => this.repo.clientes({ solo_con_deuda: true, ...q })),
  });

  protected readonly edades = computed(() => agruparPorEdades(this.clientes.hasValue() ? this.clientes.value().items : []));
  private readonly total = computed(() => this.edades().reduce((n, e) => n + e.saldo, 0));

  protected porcentaje(e: EdadCartera): number {
    return this.total() > 0 ? Math.round((e.saldo / this.total()) * 100) : 0;
  }
}
