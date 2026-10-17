import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { todasParaExportar } from '../../core/api/todas-las-paginas';
import { BotonCsvComponent } from '../../shared/ui/boton-csv/boton-csv.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import type { ColumnaCsv } from '../../shared/utils/csv';
import { formatoCop, formatoFecha, formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { textoConEspera } from '../../shared/utils/texto-debounce';
import { CLAVES_RANGO_EDAD, RANGOS_EDAD } from './cartera.format';
import { CARTERA_REPOSITORY } from './data/cartera.provider';
import type { ClaveRangoEdad, ClienteEdades, RangoEdad } from './models/cartera.models';
import { VentasPendientesDialogComponent } from './ventas-pendientes-dialog.component';

/**
 * «¿Desde hace cuánto me deben?»: the debt of the clients split by days past each sale's due date. The five ranges are
 * a summary (tap one to sort the table by it), below them the same split per client. The server does the arithmetic.
 */
@Component({
  selector: 'app-edades-cartera-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonCsvComponent, DataTableCellDirective, ServerDataTableComponent, VentasPendientesDialogComponent],
  template: `
    <section class="sila-card mb-6 p-4" aria-labelledby="edades-titulo" data-testid="edades-cartera">
      <div class="mb-1 flex flex-wrap items-start justify-between gap-2">
        <h2 id="edades-titulo" class="text-base font-semibold">¿Desde hace cuánto me deben?</h2>
        <app-boton-csv nombre="cartera_por_edades" [columnas]="columnasCsv" [cargar]="todos" />
      </div>
      <p class="mb-3 text-xs text-muted-foreground">
        Cada venta a crédito cuenta según los días que pasaron de su fecha de vencimiento; una que aún no vence está «al día». Un cliente puede tener plata en varios grupos.
        Toca un grupo para ordenar la tabla por él.
      </p>

      @if (edades.error()) {
        <p class="text-sm text-destructive" role="alert">No se pudo cargar. <button type="button" class="underline" (click)="edades.reload()">Reintentar</button></p>
      } @else {
        <p class="mb-3 text-sm" data-testid="edades-total">
          <span class="text-muted-foreground">Total por cobrar:</span>
          <span class="ms-1 font-semibold tabular-nums">{{ edades.hasValue() ? cop(edades.value().total) : '—' }}</span>
          @if (edades.hasValue()) {
            <span class="text-muted-foreground"> · {{ numero(edades.value().clientes) }} {{ edades.value().clientes === 1 ? 'cliente' : 'clientes' }} · al {{ fecha(edades.value().fecha_corte) }}</span>
          }
        </p>
        <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          @for (r of rangos(); track r.clave) {
            <li>
              <button
                type="button"
                class="flex min-h-11 w-full flex-col rounded-md border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                [class.border-primary]="activo(r.clave)"
                [class.border-border]="!activo(r.clave)"
                [attr.aria-pressed]="activo(r.clave)"
                [attr.data-testid]="'rango-' + r.clave"
                (click)="ordenarPor(r.clave)"
              >
                <span class="text-xs text-muted-foreground">{{ r.etiqueta }}</span>
                <span class="mt-1 text-lg font-bold tabular-nums">{{ cop(r.saldo) }}</span>
                <span class="text-xs text-muted-foreground tabular-nums">{{ numero(r.clientes) }} {{ r.clientes === 1 ? 'cliente' : 'clientes' }}</span>
                <span class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span class="block h-full rounded-full" [class]="estilo(r.clave).barra" [style.width.%]="porcentaje(r)"></span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </section>

    <div class="mb-4 w-full sm:w-64">
      <label for="edades-texto" class="mb-1 block text-xs font-medium text-muted-foreground">Cliente</label>
      <input id="edades-texto" type="search" class="sila-input" placeholder="Buscar por nombre…" maxlength="100" [value]="texto.crudo()" (input)="texto.crudo.set($any($event.target).value)" />
    </div>

    <app-server-data-table
      titulo="Deuda por cliente y edad"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="clienteId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="listado.sort()"
      vacioTitulo="Nadie debe plata"
      vacioAyuda="No hay clientes con ventas a crédito pendientes."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (sortChange)="listado.sort.set($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="saldo_total" [cellRows]="listado.datos()?.items" let-c><span class="font-medium tabular-nums">{{ cop(c.saldo_total) }}</span></ng-template>
      <ng-template appDataTableCell="al_dia" [cellRows]="listado.datos()?.items" let-c><span class="tabular-nums">{{ monto(c.al_dia) }}</span></ng-template>
      <ng-template appDataTableCell="mora_leve" [cellRows]="listado.datos()?.items" let-c><span class="tabular-nums">{{ monto(c.mora_leve) }}</span></ng-template>
      <ng-template appDataTableCell="mora_media" [cellRows]="listado.datos()?.items" let-c><span class="tabular-nums">{{ monto(c.mora_media) }}</span></ng-template>
      <ng-template appDataTableCell="mora_alta" [cellRows]="listado.datos()?.items" let-c><span class="tabular-nums" [class.text-destructive]="c.mora_alta > 0">{{ monto(c.mora_alta) }}</span></ng-template>
      <ng-template appDataTableCell="mora_critica" [cellRows]="listado.datos()?.items" let-c><span class="font-medium tabular-nums" [class.text-destructive]="c.mora_critica > 0">{{ monto(c.mora_critica) }}</span></ng-template>
      <ng-template appDataTableCell="dias_mora_max" [cellRows]="listado.datos()?.items" let-c>
        <span class="tabular-nums" [class.text-destructive]="c.dias_mora_max > 30">{{ c.dias_mora_max > 0 ? c.dias_mora_max + ' días' : '—' }}</span>
      </ng-template>
      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-c>
        <button type="button" class="sila-btn sila-btn-outline sila-btn-sm" (click)="viendo.set(c)">Ver ventas<span class="sr-only"> de {{ c.cliente }}</span></button>
      </ng-template>
    </app-server-data-table>

    <app-ventas-pendientes-dialog [cliente]="viendo()" (cerrado)="viendo.set(null)" />
  `,
})
export class EdadesCarteraTabComponent {
  private readonly repo = inject(CARTERA_REPOSITORY);

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly fecha = formatoFecha;

  protected readonly edades = rxResource({ stream: () => this.repo.edades() });
  /** The five ranges in order, even before they load (so the layout does not jump). */
  protected readonly rangos = computed<RangoEdad[]>(() => {
    const cargados = this.edades.hasValue() ? this.edades.value().rangos : [];
    return CLAVES_RANGO_EDAD.map((clave) => cargados.find((r) => r.clave === clave) ?? { clave, etiqueta: RANGOS_EDAD[clave].corto, saldo: 0, clientes: 0 });
  });
  private readonly total = computed(() => (this.edades.hasValue() ? this.edades.value().total : 0));

  protected readonly texto = textoConEspera();
  protected readonly viendo = signal<ClienteEdades | null>(null);

  protected readonly listado = crearListado({
    filtros: () => ({ texto: this.texto.valor() || undefined }),
    cargar: (query) => this.repo.edadesClientes(query),
    sort: 'saldo_total,desc',
  });

  protected readonly columnas: DataTableColumn<ClienteEdades>[] = [
    { key: 'cliente', label: 'Cliente', value: (c) => c.cliente },
    { key: 'telefono', label: 'Teléfono', sortable: false, ocultarEnMovil: true, value: (c) => c.telefono ?? '—' },
    { key: 'saldo_total', label: 'Deuda total', align: 'end', value: (c) => c.saldo_total },
    { key: 'al_dia', label: 'Al día', align: 'end', value: (c) => c.al_dia },
    { key: 'mora_leve', label: '1 a 15 días', align: 'end', value: (c) => c.mora_leve },
    { key: 'mora_media', label: '16 a 30 días', align: 'end', value: (c) => c.mora_media },
    { key: 'mora_alta', label: '31 a 60 días', align: 'end', value: (c) => c.mora_alta },
    { key: 'mora_critica', label: 'Más de 60 días', align: 'end', value: (c) => c.mora_critica },
    { key: 'dias_mora_max', label: 'Mora más larga', align: 'end', value: (c) => c.dias_mora_max },
    { key: 'acciones', label: 'Detalle', sortable: false, value: () => '' },
  ];
  protected readonly clienteId = (c: ClienteEdades) => c.id_cliente;

  protected readonly columnasCsv: ColumnaCsv<ClienteEdades>[] = [
    { titulo: 'Cliente', valor: (c) => c.cliente },
    { titulo: 'Teléfono', valor: (c) => c.telefono },
    { titulo: 'Deuda total', valor: (c) => c.saldo_total },
    { titulo: 'Ventas pendientes', valor: (c) => c.ventas_pendientes },
    { titulo: 'Al día', valor: (c) => c.al_dia },
    { titulo: 'Mora 1 a 15 días', valor: (c) => c.mora_leve },
    { titulo: 'Mora 16 a 30 días', valor: (c) => c.mora_media },
    { titulo: 'Mora 31 a 60 días', valor: (c) => c.mora_alta },
    { titulo: 'Mora más de 60 días', valor: (c) => c.mora_critica },
    { titulo: 'Días de mora (la más larga)', valor: (c) => c.dias_mora_max },
  ];
  /** Every client that matches the search, in the order on screen. */
  protected readonly todos = () => todasParaExportar((q) => this.repo.edadesClientes({ ...this.listado.consulta(), ...q }));

  protected estilo(clave: ClaveRangoEdad) {
    return RANGOS_EDAD[clave];
  }

  protected porcentaje(r: RangoEdad): number {
    return this.total() > 0 ? Math.round((r.saldo / this.total()) * 100) : 0;
  }

  protected monto(valor: number): string {
    return valor > 0 ? formatoCop(valor) : '—';
  }

  protected activo(clave: ClaveRangoEdad): boolean {
    return this.listado.sort().startsWith(`${RANGOS_EDAD[clave].columna},`);
  }

  /** Tapping a range sorts the table by that column, biggest debt first. */
  protected ordenarPor(clave: ClaveRangoEdad): void {
    this.listado.sort.set(`${RANGOS_EDAD[clave].columna},desc`);
  }
}
