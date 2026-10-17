import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { todasLasPaginas, todasParaExportar } from '../../core/api/todas-las-paginas';
import { BotonCsvComponent } from '../../shared/ui/boton-csv/boton-csv.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { FiltrosPlegablesComponent } from '../../shared/ui/filtros-plegables/filtros-plegables.component';
import { SelectorBuscableComponent } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import type { ColumnaCsv } from '../../shared/utils/csv';
import { fechaCsv } from '../../shared/utils/csv';
import { formatoFecha, formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { FiltroFechasComponent } from '../auditoria/filtro-fechas.component';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import type { Compra, EstadoCalidadCompra } from '../insumos/models/insumos.models';
import type { Umbrales } from './models/acopio.models';

/** The materia prima that is milk (the only one with quality control): see the contract, `codigo: "LECHE"`. */
const CODIGO_LECHE = 'LECHE';

/**
 * Every delivery of milk, one by one: date, who brought it, litres received, temperature, acidity and whether it passed the
 * quality control (and why not). They are the purchases of the raw material LECHE; a rejected one is kept but never enters the stock.
 */
@Component({
  selector: 'app-entregas-leche',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonCsvComponent, DataTableCellDirective, FiltroFechasComponent, FiltrosPlegablesComponent, SelectorBuscableComponent, ServerDataTableComponent, StatusChipComponent],
  template: `
    <section aria-labelledby="entregas-titulo" class="mb-8">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="entregas-titulo" class="text-base font-semibold">Entregas de leche</h3>
          <p class="text-sm text-muted-foreground">Cada entrega con la fecha, los litros recibidos y su temperatura y acidez. Las rechazadas no entran al inventario.</p>
        </div>
        <app-boton-csv nombre="entregas_de_leche" [columnas]="columnasCsv" [cargar]="todas" />
      </div>

      <app-filtros-plegables clases="mb-4 flex flex-wrap items-end gap-3">
        <div class="w-full sm:w-64">
          <label for="entregas-proveedor" class="mb-1 block text-xs font-medium text-muted-foreground">Proveedor</label>
          <app-selector-buscable idCampo="entregas-proveedor" [opciones]="proveedores()" [(valor)]="proveedor" etiquetaVacia="Todos los proveedores" placeholder="Buscar proveedor…" />
        </div>
        <div>
          <label for="entregas-calidad" class="mb-1 block text-xs font-medium text-muted-foreground">Control de calidad</label>
          <select id="entregas-calidad" class="sila-select w-40" (change)="calidad.set($any($event.target).value)">
            <option value="" [selected]="calidad() === ''">Todas</option>
            <option value="APROBADO" [selected]="calidad() === 'APROBADO'">Aprobadas</option>
            <option value="RECHAZADO" [selected]="calidad() === 'RECHAZADO'">Rechazadas</option>
          </select>
        </div>
        <app-filtro-fechas idBase="entregas" [desde]="desde()" [hasta]="hasta()" (desdeChange)="desde.set($event)" (hastaChange)="hasta.set($event)" />
        <button type="button" class="sila-btn sila-btn-ghost sila-btn-sm" (click)="limpiar()">Quitar filtros</button>
      </app-filtros-plegables>

      <app-server-data-table
        titulo="Entregas de leche"
        [columns]="columnas"
        [page]="listado.datos()"
        [rowId]="compraId"
        [cargando]="listado.cargando() || insumos.isLoading()"
        [error]="listado.error()"
        [sort]="listado.sort()"
        vacioTitulo="No hay entregas de leche con estos filtros"
        vacioAyuda="Las entregas se registran como compras de leche."
        (pageChange)="listado.irAPagina($event)"
        (sizeChange)="listado.cambiarTamano($event)"
        (sortChange)="listado.sort.set($event)"
        (reintentar)="listado.recargar()"
      >
        <ng-template appDataTableCell="fecha" [cellRows]="listado.datos()?.items" let-c><span class="whitespace-nowrap">{{ fecha(c.fecha) }}</span></ng-template>
        <ng-template appDataTableCell="proveedor" [cellRows]="listado.datos()?.items" let-c>{{ c.proveedor ?? c.comprado_en ?? '—' }}</ng-template>
        <ng-template appDataTableCell="cantidad" [cellRows]="listado.datos()?.items" let-c><span class="font-medium tabular-nums">{{ numero(c.cantidad) }} L</span></ng-template>
        <ng-template appDataTableCell="temperatura" [cellRows]="listado.datos()?.items" let-c>
          <span class="tabular-nums" [class.text-destructive]="superaTemperatura(c)">{{ c.temperatura == null ? '—' : numero(c.temperatura) + ' °C' }}</span>
        </ng-template>
        <ng-template appDataTableCell="acidez" [cellRows]="listado.datos()?.items" let-c>
          <span class="tabular-nums" [class.text-destructive]="superaAcidez(c)">{{ c.acidez == null ? '—' : numero(c.acidez) + ' °D' }}</span>
        </ng-template>
        <ng-template appDataTableCell="estado_calidad" [cellRows]="listado.datos()?.items" let-c>
          @if (c.estado === 'ANULADA') {
            <app-status-chip texto="Anulada" tono="neutro" />
          } @else if (c.estado_calidad === 'RECHAZADO') {
            <app-status-chip texto="Rechazada" tono="peligro" />
          } @else {
            <app-status-chip texto="Aprobada" tono="exito" />
          }
        </ng-template>
        <ng-template appDataTableCell="motivo_rechazo" [cellRows]="listado.datos()?.items" let-c>
          <span class="text-sm">{{ c.estado_calidad === 'RECHAZADO' ? (c.motivo_rechazo ?? 'No superó los umbrales de calidad') : '—' }}</span>
        </ng-template>
      </app-server-data-table>
    </section>
  `,
})
export class EntregasLecheComponent {
  private readonly insumosRepo = inject(INSUMOS_REPOSITORY);
  private readonly catalogos = inject(CATALOGOS_REPOSITORY);

  /** The limits of the quality control, to mark in red the figure that went over. */
  readonly umbrales = input<Umbrales | null>(null);

  protected readonly fecha = formatoFecha;
  protected readonly numero = formatoNumero;

  /** The raw material LECHE: its id is needed to ask for its purchases. */
  protected readonly insumos = rxResource({ stream: () => this.insumosRepo.listar({ texto: CODIGO_LECHE, page: 0, size: 20 }) });
  private readonly idLeche = computed(() => (this.insumos.hasValue() ? (this.insumos.value().items.find((i) => i.codigo === CODIGO_LECHE)?.id_insumo ?? null) : null));

  private readonly proveedoresRecurso = rxResource({
    stream: () => todasLasPaginas((q) => this.catalogos.listarProveedores({ activo: true, sort: 'nombre,asc', ...q })),
  });
  protected readonly proveedores = computed(() =>
    this.proveedoresRecurso.hasValue() ? this.proveedoresRecurso.value().items.map((p) => ({ valor: p.id_proveedor, etiqueta: p.nombre })) : [],
  );

  protected readonly proveedor = signal<number | null>(null);
  protected readonly calidad = signal<'' | EstadoCalidadCompra>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  protected readonly listado = crearListado({
    filtros: () => ({
      id_insumo: this.idLeche() ?? undefined,
      id_proveedor: this.proveedor() ?? undefined,
      estado_calidad: this.calidad() || undefined,
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
    }),
    cargar: (query) => this.insumosRepo.listarCompras(query),
    sort: 'fecha,desc',
    // Without the id of the milk every purchase would be listed: wait for it.
    habilitado: () => this.idLeche() !== null,
  });

  // Sort fields of the contract: id_compra, fecha, insumo, proveedor, valor_total, cantidad, estado, temperatura, acidez.
  protected readonly columnas: DataTableColumn<Compra>[] = [
    { key: 'fecha', label: 'Fecha', value: (c) => c.fecha },
    { key: 'proveedor', label: 'Proveedor', rol: 'titulo', value: (c) => c.proveedor ?? c.comprado_en ?? '—' },
    { key: 'cantidad', label: 'Litros recibidos', align: 'end', value: (c) => c.cantidad },
    { key: 'temperatura', label: 'Temperatura', align: 'end', value: (c) => c.temperatura ?? '—' },
    { key: 'acidez', label: 'Acidez', align: 'end', value: (c) => c.acidez ?? '—' },
    { key: 'estado_calidad', label: 'Calidad', sortable: false, value: (c) => c.estado_calidad ?? '—' },
    { key: 'motivo_rechazo', label: 'Motivo del rechazo', sortable: false, ocultarEnMovil: false, value: (c) => c.motivo_rechazo ?? '—' },
  ];
  protected readonly compraId = (c: Compra) => c.id_compra;

  protected readonly columnasCsv: ColumnaCsv<Compra>[] = [
    { titulo: 'Fecha', valor: (c) => c.fecha },
    { titulo: 'Proveedor', valor: (c) => c.proveedor ?? c.comprado_en },
    { titulo: 'Litros recibidos', valor: (c) => c.cantidad },
    { titulo: 'Temperatura °C', valor: (c) => c.temperatura },
    { titulo: 'Acidez °D', valor: (c) => c.acidez },
    { titulo: 'Calidad', valor: (c) => (c.estado === 'ANULADA' ? 'Anulada' : c.estado_calidad === 'RECHAZADO' ? 'Rechazada' : 'Aprobada') },
    { titulo: 'Motivo del rechazo', valor: (c) => c.motivo_rechazo },
    { titulo: 'Valor factura', valor: (c) => c.valor_total },
    { titulo: 'Referencia', valor: (c) => c.referencia },
    { titulo: 'Fecha de registro', valor: (c) => fechaCsv(c.fecha_registro) },
  ];
  /** Every delivery that matches the filters on screen, in the order on screen. */
  protected readonly todas = () => todasParaExportar((q) => this.insumosRepo.listarCompras({ ...this.listado.consulta(), ...q }));

  protected superaTemperatura(c: Compra): boolean {
    const u = this.umbrales();
    return !!u && c.temperatura != null && c.temperatura > u.temperatura_max;
  }

  protected superaAcidez(c: Compra): boolean {
    const u = this.umbrales();
    return !!u && c.acidez != null && c.acidez > u.acidez_max;
  }

  protected limpiar(): void {
    this.proveedor.set(null);
    this.calidad.set('');
    this.desde.set('');
    this.hasta.set('');
  }
}
