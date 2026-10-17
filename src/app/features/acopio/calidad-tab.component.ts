import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { ChipTono, StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { formatoNumero } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { ACOPIO_REPOSITORY } from './data/acopio.provider';
import { EntregasLecheComponent } from './entregas-leche.component';
import type { CalidadProveedor } from './models/acopio.models';

/**
 * SUPUESTO: AP-05. The API sends `porcentaje_rechazo` but no verdict, so the chip tone is ours:
 * more than 20 % rejected is "peligro", more than 10 % "alerta", otherwise "exito".
 */
export const RECHAZO_PELIGRO = 20;
export const RECHAZO_ALERTA = 10;

export function tonoRechazo(porcentaje: number): ChipTono {
  return porcentaje > RECHAZO_PELIGRO ? 'peligro' : porcentaje > RECHAZO_ALERTA ? 'alerta' : 'exito';
}

@Component({
  selector: 'app-calidad-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableCellDirective, EntregasLecheComponent, IconComponent, RouterLink, ServerDataTableComponent, StatusChipComponent],
  template: `
    @if (umbrales.value(); as u) {
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4" data-testid="tarjeta-umbrales">
        <div>
          <h3 class="text-sm font-semibold">Umbrales de control de calidad para leche cruda</h3>
          <p class="text-xs text-muted-foreground">
            Temperatura máxima: <strong class="text-foreground">{{ u.temperatura_max }} °C</strong> · Acidez máxima: <strong class="text-foreground">{{ u.acidez_max }} °D</strong>.
            Las entregas que superen estos umbrales se rechazan automáticamente al registrar la compra.
          </p>
        </div>
        <a routerLink="/insumos" [queryParams]="{ pestana: 'compras' }" class="sila-btn sila-btn-primary sila-btn-sm inline-flex items-center gap-1.5">
          <app-icon name="lucidePlus" class="size-4" aria-hidden="true" />
          Registrar compra de leche
        </a>
      </div>
    }

    <app-entregas-leche [umbrales]="umbrales.hasValue() ? umbrales.value() : null" />

    <h3 class="mb-1 text-base font-semibold">Resumen por proveedor</h3>
    <p class="mb-3 text-sm text-muted-foreground">
      Promedios y rechazos por proveedor, con todas sus entregas. El porcentaje se marca en rojo por encima de {{ peligro }} % y en ámbar por encima de {{ alerta }} %.
    </p>
    <app-server-data-table
      titulo="Calidad por proveedor"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="proveedorId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="listado.sort()"
      vacioTitulo="Aún no hay entregas registradas"
      vacioAyuda="La calidad se calcula a partir de las compras de leche."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (sortChange)="listado.sort.set($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="temperatura_promedio" [cellRows]="listado.datos()?.items" let-c>
        <span class="tabular-nums">{{ numero(c.temperatura_promedio) }} °C</span>
      </ng-template>
      <ng-template appDataTableCell="acidez_promedio" [cellRows]="listado.datos()?.items" let-c>
        <span class="tabular-nums">{{ numero(c.acidez_promedio) }} °D</span>
      </ng-template>
      <ng-template appDataTableCell="porcentaje_rechazo" [cellRows]="listado.datos()?.items" let-c>
        <app-status-chip [texto]="numero(c.porcentaje_rechazo) + ' %'" [tono]="tono(c.porcentaje_rechazo)" />
      </ng-template>
    </app-server-data-table>
  `,
})
export class CalidadTabComponent {
  private readonly repo = inject(ACOPIO_REPOSITORY);

  protected readonly umbrales = rxResource({ stream: () => this.repo.umbrales() });
  protected readonly peligro = RECHAZO_PELIGRO;
  protected readonly alerta = RECHAZO_ALERTA;
  protected readonly numero = formatoNumero;
  protected readonly tono = tonoRechazo;

  protected readonly listado = crearListado({
    filtros: () => ({}),
    cargar: (query) => this.repo.calidad(query),
    sort: 'proveedor,asc',
  });

  protected readonly columnas: DataTableColumn<CalidadProveedor>[] = [
    { key: 'proveedor', label: 'Proveedor', value: (c) => c.proveedor },
    { key: 'numero_entregas', label: 'Entregas', align: 'end', value: (c) => c.numero_entregas },
    // Not in the API's sort list (proveedor, numero_entregas, porcentaje_rechazo, entregas_rechazadas).
    { key: 'temperatura_promedio', label: 'Temp. promedio', align: 'end', sortable: false, value: (c) => c.temperatura_promedio },
    { key: 'acidez_promedio', label: 'Acidez promedio', align: 'end', sortable: false, value: (c) => c.acidez_promedio },
    { key: 'entregas_rechazadas', label: 'Rechazadas', align: 'end', value: (c) => c.entregas_rechazadas },
    { key: 'porcentaje_rechazo', label: '% de rechazo', value: (c) => c.porcentaje_rechazo },
  ];
  protected readonly proveedorId = (c: CalidadProveedor) => c.id_proveedor;
}
