import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { AyudaComponent } from '../../shared/ui/ayuda/ayuda.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { MontoComponent } from '../../shared/ui/monto/monto.component';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatoCop, formatoFecha, formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { etiquetaQuincena } from '../periodos/periodos.format';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import type { PagoProveedor, SaldoProveedor } from './models/cuentas-proveedores.models';
import { PagoProveedorDialogComponent } from './pago-proveedor-dialog.component';
import { ComprasProveedorTablaComponent } from './compras-proveedor-tabla.component';
import { PagosTablaComponent } from './pagos-tabla.component';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';

@Component({
  selector: 'app-saldos-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AyudaComponent,
    ComprasProveedorTablaComponent,
    DataTableCellDirective,
    DialogComponent,
    HasRoleDirective,
    MontoComponent,
    PagoProveedorDialogComponent,
    PagosTablaComponent,
    ServerDataTableComponent,
  ],
  template: `
    <div class="mb-6 grid gap-4 sm:grid-cols-3" data-testid="tarjetas-saldos">
      <div class="sila-card p-4">
        <p class="text-sm text-muted-foreground">
          Total comprado a crédito
          <app-ayuda texto="Valor acumulado de compras a crédito aprobadas. Las compras de contado y la leche rechazada no suman." />
        </p>
        <p class="mt-1 text-2xl font-bold"><app-monto [valor]="totales().comprado" /></p>
      </div>
      <div class="sila-card p-4">
        <p class="text-sm text-muted-foreground">
          Total pagado
          <app-ayuda texto="Pagos vigentes realizados a proveedores. Los anulados no cuentan." />
        </p>
        <p class="mt-1 text-2xl font-bold"><app-monto [valor]="totales().pagado" /></p>
      </div>
      <div class="sila-card border-primary/50 p-4">
        <p class="text-sm text-muted-foreground">
          Total que se debe
          <app-ayuda texto="Suma de los saldos pendientes de todos los proveedores: compras a crédito menos pagos." />
        </p>
        <p class="mt-1 text-2xl font-bold" data-testid="total-debe"><app-monto [valor]="totales().saldo" [destacado]="true" /></p>
      </div>
    </div>
    @if (resumenTotales.error()) {
      <p class="-mt-3 mb-4 text-sm text-destructive" role="alert">
        No se pudieron calcular los totales. <button type="button" class="underline" (click)="resumenTotales.reload()">Reintentar</button>
      </p>
    }

    <label class="mb-3 flex items-center gap-2 text-sm">
      <input type="checkbox" class="size-4" [checked]="soloConDeuda()" (change)="soloConDeuda.set($any($event.target).checked)" />
      Solo con deuda
    </label>

    <app-server-data-table
      titulo="Saldos por proveedor"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="saldoId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="listado.sort()"
      vacioTitulo="No hay proveedores con deuda"
      vacioAyuda="Quita «Solo con deuda» para ver a todos."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (sortChange)="listado.sort.set($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="proveedor" [cellRows]="listado.datos()?.items" let-s>
        <span class="font-medium">{{ s.proveedor }}</span>
        @if (!s.activo) {
          <span class="ms-1.5 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Inactivo</span>
        }
      </ng-template>
      <ng-template appDataTableCell="total_comprado" [cellRows]="listado.datos()?.items" let-s>
        <app-monto [valor]="s.total_comprado" />
      </ng-template>
      <ng-template appDataTableCell="total_pagado" [cellRows]="listado.datos()?.items" let-s>
        <app-monto [valor]="s.total_pagado" />
      </ng-template>
      <ng-template appDataTableCell="saldo" [cellRows]="listado.datos()?.items" let-s>
        <app-monto [valor]="s.saldo" [destacado]="s.saldo > 0" />
      </ng-template>
      <ng-template appDataTableCell="ultima_compra" [cellRows]="listado.datos()?.items" let-s>
        {{ s.ultima_compra ? fecha(s.ultima_compra) : '—' }}
      </ng-template>
      <ng-template appDataTableCell="ultimo_pago" [cellRows]="listado.datos()?.items" let-s>
        {{ s.ultimo_pago ? fecha(s.ultimo_pago) : '—' }}
      </ng-template>
      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-s>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" class="sila-btn sila-btn-outline sila-btn-sm" (click)="detalle.set(s)">
            Ver detalle<span class="sr-only"> de {{ s.proveedor }}</span>
          </button>
          <button
            *hasRole="'ADMIN'"
            type="button"
            class="sila-btn sila-btn-primary sila-btn-sm"
            [disabled]="s.saldo <= 0"
            (click)="pagando.set({ id_proveedor: s.id_proveedor, nombre: s.proveedor })"
          >
            Registrar pago<span class="sr-only"> a {{ s.proveedor }}</span>
          </button>
        </div>
      </ng-template>
    </app-server-data-table>

    <!-- Modal detalle del proveedor -->
    <app-dialog [open]="detalle() !== null" [title]="'Detalle · ' + (detalle()?.proveedor ?? '')" [wide]="true" (closed)="detalle.set(null)">
      @if (detalle(); as d) {
        <h3 class="mb-2 text-sm font-semibold">Lo que se le compró a crédito</h3>
        <div class="mb-6">
          <app-compras-proveedor-tabla [idProveedor]="d.id_proveedor" />
        </div>

        <h3 class="mb-2 text-sm font-semibold">Su deuda por quincena</h3>
        @if (quincenas.value(); as qPage) {
          <div class="relative mb-6 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">Quincenas de {{ d.proveedor }}</caption>
              <thead class="text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="py-1 pe-2 font-medium">Quincena</th>
                  <th scope="col" class="px-2 py-1 text-end font-medium">N.º compras</th>
                  <th scope="col" class="px-2 py-1 text-end font-medium">Valor comprado</th>
                  <th scope="col" class="px-2 py-1 text-end font-medium">Pagado</th>
                  <th scope="col" class="py-1 ps-2 text-end font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (q of qPage.items; track q.id_periodo) {
                  <tr>
                    <td class="py-1.5 pe-2 font-medium">{{ quincena(q.mes, q.quincena) }}</td>
                    <td class="px-2 py-1.5 text-end tabular-nums">{{ q.numero_compras }}</td>
                    <td class="px-2 py-1.5 text-end"><app-monto [valor]="q.valor_compras" /></td>
                    <td class="px-2 py-1.5 text-end"><app-monto [valor]="q.valor_pagado" /></td>
                    <td class="py-1.5 ps-2 text-end"><app-monto [valor]="q.saldo" [destacado]="q.saldo > 0" /></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-4 text-center text-sm text-muted-foreground">No hay quincenas registradas para este proveedor.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (quincenas.error()) {
          <p class="mb-4 text-sm text-destructive" role="alert">No se pudieron cargar las quincenas del proveedor.</p>
        } @else {
          <p class="mb-4 text-sm text-muted-foreground">Cargando quincenas…</p>
        }

        <h3 class="mb-2 text-sm font-semibold">Pagos realizados</h3>
        <app-pagos-tabla [idProveedor]="d.id_proveedor" [version]="version()" (anulado)="recargar()" />
      }
    </app-dialog>

    <!-- Dialogo de registro de pago -->
    <app-pago-proveedor-dialog
      [proveedor]="pagando()"
      (registrado)="alGuardarPago($event)"
      (cerrado)="pagando.set(null)"
    />
  `,
})
export class SaldosTabComponent {
  private readonly repo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly toast = inject(ToastService);

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly fecha = formatoFecha;
  protected readonly quincena = etiquetaQuincena;

  protected readonly soloConDeuda = signal(true);
  protected readonly detalle = signal<SaldoProveedor | null>(null);
  protected readonly pagando = signal<{ id_proveedor: number; nombre: string } | null>(null);
  protected readonly version = signal(0);

  protected readonly resumenTotales = rxResource({
    // Every provider, not just the first page: the three totals must add up all of them.
    stream: () => todasLasPaginas((q) => this.repo.saldos(q)),
  });

  protected readonly totales = computed(() => {
    const filas = this.resumenTotales.hasValue() ? this.resumenTotales.value().items : [];
    const suma = (c: 'total_comprado' | 'total_pagado' | 'saldo') =>
      Math.round(filas.reduce((s, f) => s + f[c], 0) * 100) / 100;
    return { comprado: suma('total_comprado'), pagado: suma('total_pagado'), saldo: suma('saldo') };
  });

  protected readonly listado = crearListado({
    filtros: () => ({ solo_con_saldo: this.soloConDeuda() }),
    cargar: (query) => this.repo.saldos(query),
    sort: 'saldo,desc',
  });

  protected readonly quincenas = rxResource({
    params: () => this.detalle()?.id_proveedor,
    stream: ({ params: idProveedor }) => todasLasPaginas((q) => this.repo.resumen({ id_proveedor: idProveedor, sort: 'id_periodo,asc', ...q })),
  });

  protected readonly columnas: DataTableColumn<SaldoProveedor>[] = [
    { key: 'proveedor', label: 'Proveedor', sortable: false, value: (s) => s.proveedor },
    { key: 'total_comprado', label: 'Total comprado a crédito', sortable: false, align: 'end', value: (s) => s.total_comprado },
    { key: 'total_pagado', label: 'Total pagado', sortable: false, align: 'end', value: (s) => s.total_pagado },
    { key: 'saldo', label: 'Saldo', align: 'end', value: (s) => s.saldo },
    { key: 'ultima_compra', label: 'Última compra', sortable: false, ocultarEnMovil: true, value: (s) => s.ultima_compra ?? '—' },
    { key: 'ultimo_pago', label: 'Último pago', sortable: false, ocultarEnMovil: true, value: (s) => s.ultimo_pago ?? '—' },
    { key: 'acciones', label: 'Acciones', sortable: false, value: () => '' },
  ];
  protected readonly saldoId = (s: SaldoProveedor) => s.id_proveedor;

  protected alGuardarPago(pago: PagoProveedor): void {
    this.pagando.set(null);
    this.toast.exito(`Pago de ${formatoCop(pago.monto)} a ${pago.proveedor} registrado.`);
    this.recargar();
  }

  protected recargar(): void {
    this.version.update((v) => v + 1);
    this.listado.recargar();
    this.resumenTotales.reload();
  }
}
