import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { formatoCop, formatoFecha, formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { VerComprobanteComponent } from '../comprobantes/ver-comprobante.component';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import type { Compra } from '../insumos/models/insumos.models';

/** What was bought on credit from one supplier (the purchases that make up what is owed), each with a link to its voucher. */
@Component({
  selector: 'app-compras-proveedor-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableCellDirective, ServerDataTableComponent, StatusChipComponent, VerComprobanteComponent],
  template: `
    <app-server-data-table
      titulo="Compras a crédito al proveedor"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="compraId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="null"
      vacioTitulo="No hay compras a crédito"
      vacioAyuda="Las compras a crédito de este proveedor aparecerán aquí."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="fecha" [cellRows]="listado.datos()?.items" let-c>
        <span class="whitespace-nowrap">{{ fecha(c.fecha) }}</span>
      </ng-template>
      <ng-template appDataTableCell="insumo" [cellRows]="listado.datos()?.items" let-c>
        <span class="font-medium">{{ c.insumo }}</span>
        @if (c.referencia) {
          <span class="block text-xs text-muted-foreground">Ref. {{ c.referencia }}</span>
        }
      </ng-template>
      <ng-template appDataTableCell="cantidad" [cellRows]="listado.datos()?.items" let-c>
        <span class="tabular-nums">{{ numero(c.cantidad) }} {{ c.unidad_medida }}</span>
      </ng-template>
      <ng-template appDataTableCell="valor_total" [cellRows]="listado.datos()?.items" let-c>
        <span class="tabular-nums font-medium">{{ cop(c.valor_total) }}</span>
      </ng-template>
      <ng-template appDataTableCell="estado" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad === 'RECHAZADO') {
          <app-status-chip texto="Rechazada" tono="peligro" />
        } @else {
          <app-status-chip texto="Vigente" tono="exito" />
        }
      </ng-template>
      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-c>
        @if (c.estado_calidad !== 'RECHAZADO') {
          <app-ver-comprobante tipo="COMPRA" [id]="c.id_compra" />
        }
      </ng-template>
    </app-server-data-table>
  `,
})
export class ComprasProveedorTablaComponent {
  private readonly repo = inject(INSUMOS_REPOSITORY);

  readonly idProveedor = input.required<number>();

  protected readonly cop = formatoCop;
  protected readonly fecha = formatoFecha;
  protected readonly numero = formatoNumero;

  protected readonly listado = crearListado({
    filtros: () => ({ id_proveedor: this.idProveedor(), contado: false, estado: 'VIGENTE' as const }),
    cargar: (query) => this.repo.listarCompras(query),
    sort: 'fecha,desc',
  });

  protected readonly columnas: DataTableColumn<Compra>[] = [
    { key: 'fecha', label: 'Fecha', sortable: false, value: (c) => c.fecha },
    { key: 'insumo', label: 'Materia prima', sortable: false, rol: 'titulo', value: (c) => c.insumo },
    { key: 'cantidad', label: 'Cantidad', sortable: false, align: 'end', value: (c) => c.cantidad },
    { key: 'valor_total', label: 'Valor', sortable: false, align: 'end', value: (c) => c.valor_total },
    { key: 'estado', label: 'Estado', sortable: false, value: (c) => c.estado },
    { key: 'acciones', label: 'Factura', sortable: false, align: 'end', value: () => '' },
  ];
  protected readonly compraId = (c: Compra) => c.id_compra;
}
