import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { ClaveIdempotente } from '../../core/api/idempotencia';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { FiltrosPlegablesComponent } from '../../shared/ui/filtros-plegables/filtros-plegables.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SelectorBuscableComponent } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { mensajeDeFallo } from '../../shared/utils/errores-api';
import { formatearNumerosEnTexto, formatoCop, formatoFecha, formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { FiltroFechasComponent } from '../auditoria/filtro-fechas.component';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { VerComprobanteComponent } from '../comprobantes/ver-comprobante.component';
import { CompraDialogComponent } from './compra-dialog.component';
import { INSUMOS_REPOSITORY } from './data/insumos.provider';
import { cargarInsumosActivos } from './insumos-activos';
import type { Compra, EstadoCalidadCompra, EstadoCompra } from './models/insumos.models';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';

@Component({
  selector: 'app-compras-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CompraDialogComponent,
    ConfirmDialogComponent,
    DataTableCellDirective,
    FiltroFechasComponent,
    FiltrosPlegablesComponent,
    HasRoleDirective,
    IconComponent,
    SelectorBuscableComponent,
    ServerDataTableComponent,
    StatusChipComponent,
    VerComprobanteComponent,
  ],
  template: `
    <app-filtros-plegables clases="mb-4 flex flex-wrap items-end gap-3">
      <div class="w-full sm:w-64">
        <label for="compras-insumo" class="mb-1 block text-xs font-medium text-muted-foreground">Materia prima</label>
        <app-selector-buscable idCampo="compras-insumo" [opciones]="insumos.opciones()" [(valor)]="insumo" etiquetaVacia="Todas las materias primas" placeholder="Buscar materia prima…" />
      </div>
      <div class="w-full sm:w-64">
        <label for="compras-proveedor" class="mb-1 block text-xs font-medium text-muted-foreground">Proveedor</label>
        <app-selector-buscable idCampo="compras-proveedor" [opciones]="proveedores()" [(valor)]="proveedor" etiquetaVacia="Todos los proveedores" placeholder="Buscar proveedor…" />
      </div>
      <div>
        <label for="compras-estado" class="mb-1 block text-xs font-medium text-muted-foreground">Estado</label>
        <select id="compras-estado" class="sila-select w-36" (change)="estado.set($any($event.target).value)">
          <option value="" [selected]="estado() === ''">Todos</option>
          <option value="VIGENTE" [selected]="estado() === 'VIGENTE'">Vigentes</option>
          <option value="ANULADA" [selected]="estado() === 'ANULADA'">Anuladas</option>
        </select>
      </div>
      <div>
        <label for="compras-calidad" class="mb-1 block text-xs font-medium text-muted-foreground">Control calidad</label>
        <select id="compras-calidad" class="sila-select w-36" (change)="estadoCalidad.set($any($event.target).value)">
          <option value="" [selected]="estadoCalidad() === ''">Todos</option>
          <option value="APROBADO" [selected]="estadoCalidad() === 'APROBADO'">Aprobadas</option>
          <option value="RECHAZADO" [selected]="estadoCalidad() === 'RECHAZADO'">Rechazadas</option>
        </select>
      </div>
      <div>
        <label for="compras-contado" class="mb-1 block text-xs font-medium text-muted-foreground">Modalidad</label>
        <select id="compras-contado" class="sila-select w-36" (change)="contado.set($any($event.target).value)">
          <option value="" [selected]="contado() === ''">Todas</option>
          <option value="false" [selected]="contado() === 'false'">A crédito</option>
          <option value="true" [selected]="contado() === 'true'">De contado</option>
        </select>
      </div>
      <app-filtro-fechas idBase="compras" [desde]="desde()" [hasta]="hasta()" (desdeChange)="desde.set($event)" (hastaChange)="hasta.set($event)" />
      <button type="button" data-accion class="sila-btn sila-btn-primary ms-auto" (click)="dialogo.set(true)">
        <app-icon name="lucidePlus" class="size-4" aria-hidden="true" />
        Registrar compra
      </button>
    </app-filtros-plegables>

    <app-server-data-table
      titulo="Compras de materias primas"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="compraId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="listado.sort()"
      vacioTitulo="No hay compras que coincidan"
      vacioAyuda="Cambia los filtros o registra una compra."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (sortChange)="listado.sort.set($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="fecha" [cellRows]="listado.datos()?.items" let-c>
        <span class="whitespace-nowrap" [class.line-through]="c.estado === 'ANULADA'">{{ fecha(c.fecha) }}</span>
      </ng-template>

      <ng-template appDataTableCell="insumo" [cellRows]="listado.datos()?.items" let-c>
        <div class="flex flex-col">
          <span [class.line-through]="c.estado === 'ANULADA'">{{ c.insumo }}</span>
          @if (c.temperatura != null || c.acidez != null) {
            <span class="text-xs text-muted-foreground">Temp: {{ c.temperatura }} °C · Acidez: {{ c.acidez }} °D</span>
          }
        </div>
      </ng-template>

      <ng-template appDataTableCell="proveedor" [cellRows]="listado.datos()?.items" let-c>
        <span [class.text-muted-foreground]="!c.proveedor">{{ c.proveedor ?? c.comprado_en ?? '—' }}</span>
      </ng-template>

      <ng-template appDataTableCell="contado" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad === 'RECHAZADO') {
          <span class="text-xs text-muted-foreground">—</span>
        } @else {
          <app-status-chip [texto]="c.contado ? 'Contado' : 'Crédito'" [tono]="c.contado ? 'info' : 'neutro'" />
        }
      </ng-template>

      <ng-template appDataTableCell="cantidad" [cellRows]="listado.datos()?.items" let-c>
        <span class="whitespace-nowrap tabular-nums">{{ numero(c.cantidad) }} {{ c.unidad_medida }}</span>
      </ng-template>

      <ng-template appDataTableCell="valor_total" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad === 'RECHAZADO') {
          <span class="tabular-nums text-muted-foreground line-through">$ 0</span>
        } @else {
          <span class="tabular-nums" [class.line-through]="c.estado === 'ANULADA'">{{ cop(c.valor_total) }}</span>
        }
      </ng-template>

      <ng-template appDataTableCell="costo_unitario" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad === 'RECHAZADO') {
          <span class="text-xs text-muted-foreground">—</span>
        } @else {
          <span class="whitespace-nowrap tabular-nums">{{ cop(c.costo_unitario) }} / {{ c.unidad_medida }}</span>
        }
      </ng-template>

      <ng-template appDataTableCell="estado" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad === 'RECHAZADO') {
          <div>
            <app-status-chip texto="Rechazada" tono="peligro" />
            @if (c.motivo_rechazo) {
              <span class="mt-1 block max-w-56 text-xs text-destructive">{{ c.motivo_rechazo }}</span>
            }
          </div>
        } @else if (c.estado === 'ANULADA') {
          <div>
            <app-status-chip texto="Anulada" tono="peligro" />
            @if (c.motivo_anulacion) {
              <span class="mt-1 block max-w-56 text-xs text-muted-foreground">Motivo: {{ c.motivo_anulacion }}</span>
            }
          </div>
        } @else {
          <app-status-chip texto="Vigente" tono="exito" />
        }
      </ng-template>

      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad !== 'RECHAZADO') {
          <app-ver-comprobante class="me-2 inline-block" tipo="COMPRA" [id]="c.id_compra" />
        }
        @if (c.estado === 'VIGENTE' && c.estado_calidad !== 'RECHAZADO') {
          <button *hasRole="'ADMIN'" type="button" class="sila-btn sila-btn-outline sila-btn-sm" (click)="anulando.set(c)">
            Anular<span class="sr-only"> la compra de {{ c.insumo }}</span>
          </button>
        }
      </ng-template>
    </app-server-data-table>

    <app-compra-dialog [abierto]="dialogo()" [insumos]="insumos.insumos()" [proveedores]="proveedores()" (registrada)="alRegistrar($event)" (cerrar)="dialogo.set(false)" />

    <app-confirm-dialog
      [open]="anulando() !== null"
      titulo="Anular compra"
      [mensaje]="'Se anulará la compra de ' + (anulando() ? numero(anulando()!.cantidad) + ' ' + anulando()!.unidad_medida + ' de ' + anulando()!.insumo : '') + ': el stock baja y el costo promedio se recalcula. Solo es posible si el stock alcanza para devolver lo comprado.'"
      textoConfirmar="Anular compra"
      [peligro]="true"
      [motivo]="regla"
      [ocupado]="procesando()"
      (confirmar)="anular($event)"
      (cancelar)="anulando.set(null)"
    />
  `,
})
export class ComprasTabComponent {
  private readonly repo = inject(INSUMOS_REPOSITORY);
  private readonly catalogos = inject(CATALOGOS_REPOSITORY);
  private readonly toast = inject(ToastService);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly insumos = cargarInsumosActivos();
  protected readonly regla = { min: 10, max: 255 };
  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly fecha = formatoFecha;

  /** Active providers (every page: the selector must offer all of them). */
  private readonly proveedoresRecurso = rxResource({
    stream: () => todasLasPaginas((q) => this.catalogos.listarProveedores({ activo: true, sort: 'nombre,asc', ...q })),
  });
  protected readonly proveedores = computed(() =>
    this.proveedoresRecurso.hasValue() ? this.proveedoresRecurso.value().items.map((p) => ({ valor: p.id_proveedor, etiqueta: p.nombre })) : [],
  );

  protected readonly insumo = signal<number | null>(null);
  protected readonly proveedor = signal<number | null>(null);
  protected readonly estado = signal<'' | EstadoCompra>('');
  protected readonly estadoCalidad = signal<'' | EstadoCalidadCompra>('');
  protected readonly contado = signal<'' | 'true' | 'false'>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly anulando = signal<Compra | null>(null);
  protected readonly procesando = signal(false);
  private readonly clave = new ClaveIdempotente();

  protected readonly listado = crearListado({
    filtros: () => ({
      id_insumo: this.insumo() ?? undefined,
      id_proveedor: this.proveedor() ?? undefined,
      estado: this.estado() || undefined,
      estado_calidad: this.estadoCalidad() || undefined,
      contado: this.contado() === '' ? undefined : this.contado() === 'true',
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
    }),
    cargar: (query) => this.repo.listarCompras(query),
    sort: 'fecha,desc',
  });

  protected readonly columnas: DataTableColumn<Compra>[] = [
    { key: 'fecha', label: 'Fecha', value: (c) => c.fecha },
    { key: 'insumo', label: 'Materia prima', rol: 'titulo', value: (c) => c.insumo },
    { key: 'proveedor', label: 'Proveedor', ocultarEnMovil: true, value: (c) => c.proveedor ?? c.comprado_en ?? '—' },
    { key: 'contado', label: 'Pago', sortable: false, value: (c) => (c.estado_calidad === 'RECHAZADO' ? '—' : c.contado ? 'Contado' : 'Crédito') },
    { key: 'cantidad', label: 'Cantidad', align: 'end', value: (c) => c.cantidad },
    { key: 'valor_total', label: 'Valor factura', align: 'end', value: (c) => c.valor_total },
    { key: 'costo_unitario', label: 'Costo unitario', align: 'end', sortable: false, value: (c) => c.costo_unitario },
    { key: 'referencia', label: 'Referencia', sortable: false, ocultarEnMovil: true, value: (c) => c.referencia ?? '—' },
    { key: 'estado', label: 'Estado', value: (c) => c.estado },
    { key: 'acciones', label: 'Acciones', sortable: false, value: () => '' },
  ];
  protected readonly compraId = (c: Compra) => c.id_compra;

  protected alRegistrar(compra: Compra): void {
    this.dialogo.set(false);
    this.listado.recargar();
    this.insumos.recargar();

    if (compra.estado_calidad === 'RECHAZADO') {
      this.toast.error(
        `Entrega de leche RECHAZADA: ${compra.motivo_rechazo ?? 'No superó los umbrales de calidad'}. No entra al stock ni se suma a la cuenta del proveedor.`,
      );
    } else {
      this.toast.exito(
        `Compra registrada: ${formatoNumero(compra.cantidad)} ${compra.unidad_medida} de ${compra.insumo}${compra.costo_unitario > 0 ? ' a ' + formatoCop(compra.costo_unitario) + ' c/u' : ''}.`,
      );
    }
  }

  protected anular(motivo: string): void {
    const compra = this.anulando();
    if (!compra || this.procesando()) return;
    this.procesando.set(true);
    this.repo
      .anularCompra(compra.id_compra, motivo, this.clave.para({ id: compra.id_compra, motivo }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.clave.exito();
          this.anulando.set(null);
          this.listado.recargar();
          this.insumos.recargar();
          this.toast.exito('Compra anulada.');
        },
        error: (fallo: unknown) => {
          this.procesando.set(false);
          this.clave.fallo(fallo);
          // The dialog stays open so the reason that was typed is not lost.
          const error = causaDe(fallo);
          const base = mensajeDeFallo(this.errores, fallo, [20002, 20004, 20006, 20007, 20010]);
          // 409 / 20002: part of what was bought is already spent in production.
          // 409 / 20006: credit purchase of a quincena already paid over.
          this.toast.error(
            isApiError(error) && error.code === 20002
              ? /anular/i.test(error.message)
                ? formatearNumerosEnTexto(error.message)
                : `No se puede anular: ya se gastó parte de lo comprado. ${formatearNumerosEnTexto(error.message)}`
              : base,
          );
        },
      });
  }
}
