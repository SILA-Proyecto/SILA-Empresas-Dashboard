import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiErrorService, causaDe } from '../../core/api/api-error';
import { ClaveIdempotente } from '../../core/api/idempotencia';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { mensajeDeFallo } from '../../shared/utils/errores-api';
import { formatoCop, formatoFecha } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { VerComprobanteComponent } from '../comprobantes/ver-comprobante.component';
import { etiquetaQuincena } from '../periodos/periodos.format';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import type { EstadoPagoProveedor, PagoProveedor } from './models/cuentas-proveedores.models';

@Component({
  selector: 'app-pagos-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent, DataTableCellDirective, HasRoleDirective, ServerDataTableComponent, StatusChipComponent, VerComprobanteComponent],
  template: `
    <app-server-data-table
      titulo="Pagos a proveedores"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="pagoId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="listado.sort()"
      vacioTitulo="No hay pagos registrados"
      vacioAyuda="Los pagos registrados aparecerán aquí."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (sortChange)="listado.sort.set($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="fecha_pago" [cellRows]="listado.datos()?.items" let-p>
        <span class="whitespace-nowrap" [class.line-through]="p.estado === 'ANULADO'">{{ fecha(p.fecha_pago) }}</span>
      </ng-template>
      <ng-template appDataTableCell="proveedor" [cellRows]="listado.datos()?.items" let-p>
        <span [class.line-through]="p.estado === 'ANULADO'">{{ p.proveedor }}</span>
      </ng-template>
      <ng-template appDataTableCell="id_periodo_liquidado" [cellRows]="listado.datos()?.items" let-p>
        {{ p.anio }} · {{ quincena(p.mes, p.quincena) }}
      </ng-template>
      <ng-template appDataTableCell="monto" [cellRows]="listado.datos()?.items" let-p>
        <span class="tabular-nums font-medium" [class.line-through]="p.estado === 'ANULADO'">{{ cop(p.monto) }}</span>
      </ng-template>
      <ng-template appDataTableCell="metodo_pago" [cellRows]="listado.datos()?.items" let-p>
        {{ p.metodo_pago }}
        @if (p.referencia_pago) {
          <span class="block text-xs text-muted-foreground">{{ p.referencia_pago }}</span>
        }
      </ng-template>
      <ng-template appDataTableCell="estado" [cellRows]="listado.datos()?.items" let-p>
        <app-status-chip [texto]="p.estado === 'VIGENTE' ? 'Vigente' : 'Anulado'" [tono]="p.estado === 'VIGENTE' ? 'exito' : 'peligro'" />
        @if (p.estado === 'ANULADO' && p.motivo_anulacion) {
          <span class="mt-1 block max-w-56 text-xs text-muted-foreground">Motivo: {{ p.motivo_anulacion }}</span>
        }
      </ng-template>
      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-p>
        <div class="flex items-center justify-end gap-2">
          <app-ver-comprobante tipo="PAGO_PROVEEDOR" [id]="p.id_pago" />
          @if (p.estado === 'VIGENTE') {
            <button *hasRole="'ADMIN'" type="button" class="sila-btn sila-btn-outline sila-btn-sm" (click)="anulando.set(p)">
              Anular<span class="sr-only"> pago a {{ p.proveedor }}</span>
            </button>
          }
        </div>
      </ng-template>
    </app-server-data-table>

    <app-confirm-dialog
      [open]="anulando() !== null"
      titulo="Anular pago a proveedor"
      [mensaje]="'Se anulará el pago de ' + (anulando() ? cop(anulando()!.monto) + ' a ' + anulando()!.proveedor : '') + '. La deuda de la quincena volverá a quedar pendiente.'"
      textoConfirmar="Anular pago"
      [peligro]="true"
      [motivo]="regla"
      [ocupado]="procesando()"
      (confirmar)="anular($event)"
      (cancelar)="anulando.set(null)"
    />
  `,
})
export class PagosTablaComponent {
  private readonly repo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly toast = inject(ToastService);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idProveedor = input<number | undefined>(undefined);
  readonly version = input(0);
  readonly anulado = output<PagoProveedor>();

  protected readonly cop = formatoCop;
  protected readonly fecha = formatoFecha;
  protected readonly quincena = etiquetaQuincena;
  protected readonly regla = { min: 10, max: 255 };

  protected readonly estado = signal<EstadoPagoProveedor | undefined>(undefined);
  protected readonly anulando = signal<PagoProveedor | null>(null);
  protected readonly procesando = signal(false);
  private readonly clave = new ClaveIdempotente();

  protected readonly listado = crearListado({
    filtros: () => ({
      id_proveedor: this.idProveedor(),
      estado: this.estado(),
    }),
    cargar: (query) => this.repo.listarPagos(query),
    sort: 'fecha_pago,desc',
  });

  protected readonly columnas: DataTableColumn<PagoProveedor>[] = [
    { key: 'fecha_pago', label: 'Fecha pago', value: (p) => p.fecha_pago },
    { key: 'proveedor', label: 'Proveedor', rol: 'titulo', value: (p) => p.proveedor },
    { key: 'id_periodo_liquidado', label: 'Quincena liquidada', value: (p) => p.id_periodo_liquidado },
    { key: 'monto', label: 'Monto', align: 'end', value: (p) => p.monto },
    { key: 'metodo_pago', label: 'Medio / Ref.', value: (p) => p.metodo_pago },
    { key: 'estado', label: 'Estado', value: (p) => p.estado },
    { key: 'acciones', label: 'Acciones', sortable: false, align: 'end', value: () => '' },
  ];
  protected readonly pagoId = (p: PagoProveedor) => p.id_pago;

  constructor() {
    effect(() => {
      this.version();
      this.listado.recargar();
    });
  }

  protected anular(motivo: string): void {
    const p = this.anulando();
    if (!p || this.procesando()) return;
    this.procesando.set(true);
    this.repo
      .anularPago(p.id_pago, motivo, this.clave.para({ id: p.id_pago, motivo }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.procesando.set(false);
          this.clave.exito();
          this.anulando.set(null);
          this.listado.recargar();
          this.toast.exito('Pago anulado.');
          this.anulado.emit(res);
        },
        error: (fallo: unknown) => {
          this.procesando.set(false);
          this.clave.fallo(fallo);
          // The dialog stays open so the reason that was typed is not lost.
          const error = causaDe(fallo);
          this.toast.error(mensajeDeFallo(this.errores, error, [20004, 20007, 20010]));
        },
      });
  }
}
