import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ApiErrorService } from '../../core/api/api-error';
import type { Page } from '../../core/api/page.models';
import { AyudaComponent } from '../../shared/ui/ayuda/ayuda.component';
import { BotonCsvComponent } from '../../shared/ui/boton-csv/boton-csv.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent, type ChipTono } from '../../shared/ui/status-chip/status-chip.component';
import type { ColumnaCsv } from '../../shared/utils/csv';
import { hoyColombia } from '../../shared/utils/fecha-co';
import { formatoCop, formatoNumero } from '../../shared/utils/formato-co';
import { REPORTES_REPOSITORY } from './data/reportes.provider';
import type { AgruparMargen, MargenFila } from './models/reportes.models';
import { rangosRapidos } from './rangos-fecha';

/** Below this margin (% of the sales) a line is shown as «margen bajo». A working assumption, see SUPUESTOS MP-22. */
export const MARGEN_BAJO_PCT = 10;

interface Lectura {
  texto: string;
  tono: ChipTono;
}

/** How to read the margin of one row, in words. */
export function leerMargen(f: Pick<MargenFila, 'margen' | 'margen_pct' | 'lineas_sin_costo'>): Lectura {
  if (f.margen_pct === null) return { texto: 'Sin costo', tono: 'neutro' };
  if (f.margen < 0) return { texto: 'Pierde plata', tono: 'peligro' };
  if (f.margen_pct < MARGEN_BAJO_PCT) return { texto: 'Margen bajo', tono: 'alerta' };
  return { texto: 'Bien', tono: 'exito' };
}

/**
 * «Margen de ganancia» (ADMIN): what was earned on the sales of a period = sales without VAT minus the cost of producing what was sold.
 * It is an ESTIMATE: the cost is the average of all the product's batches, because it is not known which batch each unit came from.
 */
@Component({
  selector: 'app-margen-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AyudaComponent, BotonCsvComponent, DataTableCellDirective, PageHeaderComponent, ServerDataTableComponent, StatusChipComponent],
  template: `
    <app-page-header title="Margen de ganancia" description="Cuánto se gana en lo que se vende: lo vendido sin IVA menos lo que costó producirlo.">
      <app-boton-csv nombre="margen" [columnas]="columnasCsv" [cargar]="paraExportar" />
    </app-page-header>

    <p class="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm" data-testid="aviso-estimado">
      Es un margen <strong>estimado</strong>: se calcula con el costo promedio de producción de cada producto, porque no se sabe de qué lote salió cada unidad vendida. Las ventas anuladas no cuentan.
    </p>

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <span id="margen-agrupar" class="mb-1 block text-xs font-medium text-muted-foreground">Ver por</span>
        <div class="inline-flex rounded-md border border-border" role="group" aria-labelledby="margen-agrupar">
          @for (o of opcionesAgrupar; track o.valor) {
            <button
              type="button"
              class="min-h-11 px-3 text-sm first:rounded-s-md last:rounded-e-md sm:min-h-9"
              [class.bg-primary]="agrupar() === o.valor"
              [class.text-primary-foreground]="agrupar() === o.valor"
              [attr.aria-pressed]="agrupar() === o.valor"
              [attr.data-testid]="'agrupar-' + o.valor"
              (click)="agrupar.set(o.valor)"
            >{{ o.texto }}</button>
          }
        </div>
      </div>
      <div>
        <label for="margen-desde" class="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
        <input id="margen-desde" type="date" class="sila-input w-40" [max]="hasta() || hoy" [value]="desde()" (change)="cambiarFechas($any($event.target).value, hasta())" />
      </div>
      <div>
        <label for="margen-hasta" class="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
        <input id="margen-hasta" type="date" class="sila-input w-40" [min]="desde() || null" [max]="hoy" [value]="hasta()" (change)="cambiarFechas(desde(), $any($event.target).value)" />
      </div>
    </div>
    <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Períodos rápidos">
      @for (r of atajos; track r.id) {
        <button
          type="button"
          class="sila-btn sila-btn-outline sila-btn-sm"
          [attr.aria-pressed]="r.desde === desde() && r.hasta === hasta()"
          [class.border-primary]="r.desde === desde() && r.hasta === hasta()"
          [attr.data-testid]="'atajo-' + r.id"
          (click)="cambiarFechas(r.desde, r.hasta)"
        >{{ r.etiqueta }}</button>
      }
    </div>

    @if (!fechasValidas()) {
      <p class="rounded-md bg-destructive/15 px-3 py-2 text-sm" role="alert" data-testid="fechas-invalidas">Elige las dos fechas, y que «Desde» no sea posterior a «Hasta».</p>
    } @else if (margen.error()) {
      <div role="alert" class="sila-card p-6 text-center">
        <p class="mb-3 font-medium">{{ errorTexto() }}</p>
        <button type="button" class="sila-btn sila-btn-outline" (click)="margen.reload()">Reintentar</button>
      </div>
    } @else {
      @if (margen.hasValue()) {
        @let t = margen.value().totales;
        <div class="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-testid="totales">
          <div class="sila-card p-4">
            <p class="text-sm text-muted-foreground">Vendido (sin IVA) <app-ayuda texto="Lo que se vendió en el período, sin contar el IVA." /></p>
            <p class="mt-1 text-lg font-bold tabular-nums sm:text-2xl" data-testid="total-ingreso">{{ cop(t.ingreso) }}</p>
          </div>
          <div class="sila-card p-4">
            <p class="text-sm text-muted-foreground">Costo de producirlo <app-ayuda texto="Lo que costó producir lo que se vendió, con el costo promedio de cada producto." /></p>
            <p class="mt-1 text-lg font-bold tabular-nums sm:text-2xl" data-testid="total-costo">{{ cop(t.costo) }}</p>
          </div>
          <div class="sila-card p-4">
            <p class="text-sm text-muted-foreground">Ganancia (margen) <app-ayuda texto="Vendido menos costo de producirlo. Solo cuenta las ventas cuyo costo se conoce." /></p>
            <p class="mt-1 text-lg font-bold tabular-nums sm:text-2xl" [class.text-destructive]="t.margen < 0" data-testid="total-margen">{{ t.margen < 0 ? '−' : '' }}{{ cop(abs(t.margen)) }}</p>
          </div>
          <div class="sila-card p-4">
            <p class="text-sm text-muted-foreground">Margen en % <app-ayuda texto="De cada $ 100 vendidos, cuántos quedan de ganancia." /></p>
            <p class="mt-1 text-lg font-bold tabular-nums sm:text-2xl" [class.text-destructive]="t.margen_pct !== null && t.margen_pct < 0" data-testid="total-pct">{{ t.margen_pct === null ? '—' : porcentaje(t.margen_pct) }}</p>
          </div>
        </div>
        @if (t.lineas_sin_costo > 0) {
          <p class="mb-4 rounded-md bg-warning/20 px-3 py-2 text-sm" role="status" data-testid="aviso-sin-costo">
            {{ numero(t.lineas_sin_costo) }} {{ t.lineas_sin_costo === 1 ? 'línea de venta' : 'líneas de venta' }} sin costo: producto sin producción registrada. Su venta sí está en «Vendido», pero no en el costo ni en la ganancia.
          </p>
        }
      }

      <app-server-data-table
        [titulo]="agrupar() === 'PRODUCTO' ? 'Margen por producto' : 'Margen por cliente'"
        [columns]="columnas()"
        [page]="pagina()"
        [rowId]="filaId"
        [cargando]="margen.isLoading()"
        [sort]="sort()"
        vacioTitulo="No hay ventas en este período"
        vacioAyuda="Prueba con otras fechas."
        (pageChange)="indice.set($event)"
        (sizeChange)="tamano.set($event)"
        (sortChange)="sort.set($event)"
        (reintentar)="margen.reload()"
      >
        <ng-template appDataTableCell="nombre" [cellRows]="pagina()?.items" let-f>
          <span class="font-medium">{{ f.nombre }}</span>
        </ng-template>
        <ng-template appDataTableCell="ingreso" [cellRows]="pagina()?.items" let-f><span class="tabular-nums">{{ cop(f.ingreso) }}</span></ng-template>
        <ng-template appDataTableCell="costo" [cellRows]="pagina()?.items" let-f><span class="tabular-nums">{{ f.margen_pct === null ? '—' : cop(f.costo) }}</span></ng-template>
        <ng-template appDataTableCell="margen" [cellRows]="pagina()?.items" let-f>
          <span class="font-medium tabular-nums" [class.text-destructive]="f.margen < 0">{{ f.margen_pct === null ? '—' : (f.margen < 0 ? '−' : '') + cop(abs(f.margen)) }}</span>
        </ng-template>
        <ng-template appDataTableCell="margen_pct" [cellRows]="pagina()?.items" let-f>
          <span class="tabular-nums" [class.text-destructive]="f.margen_pct !== null && f.margen_pct < 0">{{ f.margen_pct === null ? '—' : porcentaje(f.margen_pct) }}</span>
        </ng-template>
        <ng-template appDataTableCell="lectura" [cellRows]="pagina()?.items" let-f>
          <app-status-chip [texto]="lectura(f).texto" [tono]="lectura(f).tono" />
        </ng-template>
      </app-server-data-table>
    }
  `,
})
export class MargenPageComponent {
  private readonly repo = inject(REPORTES_REPOSITORY);
  private readonly errores = inject(ApiErrorService);

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly abs = Math.abs;
  protected readonly lectura = leerMargen;
  protected readonly hoy = hoyColombia();
  protected readonly atajos = rangosRapidos(this.hoy);
  protected readonly opcionesAgrupar: readonly { valor: AgruparMargen; texto: string }[] = [
    { valor: 'PRODUCTO', texto: 'Producto' },
    { valor: 'CLIENTE', texto: 'Cliente' },
  ];

  protected readonly agrupar = signal<AgruparMargen>('PRODUCTO');
  protected readonly desde = signal(this.atajos[0].desde);
  protected readonly hasta = signal(this.atajos[0].hasta);
  protected readonly sort = signal('margen,desc');
  protected readonly fechasValidas = computed(() => !!this.desde() && !!this.hasta() && this.desde() <= this.hasta());

  /** The API returns up to 500 rows with no paging: the table pages them here. */
  protected readonly tamano = signal(10);
  protected readonly indice = linkedSignal({ source: () => ({ a: this.agrupar(), d: this.desde(), h: this.hasta(), s: this.sort(), t: this.tamano() }), computation: () => 0 });

  protected readonly margen = rxResource({
    params: () => (this.fechasValidas() ? { agrupar: this.agrupar(), desde: this.desde(), hasta: this.hasta(), sort: this.sort() } : undefined),
    stream: ({ params }) => this.repo.margen(params),
  });
  protected readonly errorTexto = computed(() => (this.margen.error() ? this.errores.describe(this.margen.error()).mensaje : ''));

  protected readonly pagina = computed<Page<MargenFila> | undefined>(() => {
    if (!this.margen.hasValue()) return undefined;
    const items = this.margen.value().items;
    const inicio = this.indice() * this.tamano();
    return { items: items.slice(inicio, inicio + this.tamano()), total: items.length, page: this.indice(), size: this.tamano() };
  });

  protected readonly columnas = computed<DataTableColumn<MargenFila>[]>(() => [
    { key: 'nombre', label: this.agrupar() === 'PRODUCTO' ? 'Producto' : 'Cliente', value: (f) => f.nombre },
    ...(this.agrupar() === 'PRODUCTO' ? [{ key: 'codigo_sku', label: 'Código', sortable: false, ocultarEnMovil: true, value: (f: MargenFila) => f.codigo_sku ?? '—' }] : []),
    { key: 'unidades', label: 'Unidades', align: 'end' as const, sortable: false, value: (f) => f.unidades },
    { key: 'ingreso', label: 'Vendido (sin IVA)', align: 'end' as const, value: (f) => f.ingreso },
    { key: 'costo', label: 'Costo', align: 'end' as const, sortable: false, value: (f) => f.costo },
    { key: 'margen', label: 'Ganancia', align: 'end' as const, value: (f) => f.margen },
    { key: 'margen_pct', label: 'Margen %', align: 'end' as const, sortable: false, value: (f) => f.margen_pct ?? '—' },
    { key: 'lectura', label: 'Lectura', sortable: false, value: (f) => leerMargen(f).texto },
  ]);
  protected readonly filaId = (f: MargenFila) => f.id;

  protected readonly columnasCsv: ColumnaCsv<MargenFila>[] = [
    { titulo: 'Nombre', valor: (f) => f.nombre },
    { titulo: 'Código', valor: (f) => f.codigo_sku },
    { titulo: 'Unidades', valor: (f) => f.unidades },
    { titulo: 'Vendido sin IVA', valor: (f) => f.ingreso },
    { titulo: 'Costo', valor: (f) => f.costo },
    { titulo: 'Ganancia', valor: (f) => f.margen },
    { titulo: 'Margen %', valor: (f) => f.margen_pct },
    { titulo: 'Líneas sin costo', valor: (f) => f.lineas_sin_costo },
  ];
  /** All the rows of the period on screen (the API never pages this report). */
  protected readonly paraExportar = () =>
    this.repo.margen({ agrupar: this.agrupar(), desde: this.desde(), hasta: this.hasta(), sort: this.sort() }).pipe(map((r) => ({ items: r.items, total: r.items.length, page: 0, size: r.items.length })));

  protected cambiarFechas(desde: string, hasta: string): void {
    this.desde.set(desde);
    this.hasta.set(hasta);
  }

  /** `42.86` -> `42,9 %` */
  protected porcentaje(valor: number): string {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(valor)} %`;
  }
}
