import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HasRoleDirective } from '../../core/auth/has-role.directive';
import { DataTableCellDirective } from '../../shared/ui/data-table/data-table-cell.directive';
import type { DataTableColumn } from '../../shared/ui/data-table/data-table.models';
import { FiltrosPlegablesComponent } from '../../shared/ui/filtros-plegables/filtros-plegables.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { OpcionSelector, SelectorBuscableComponent } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { ServerDataTableComponent } from '../../shared/ui/server-data-table/server-data-table.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { formatoCop, formatoFecha } from '../../shared/utils/formato-co';
import { crearListado } from '../../shared/utils/listado';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import type { PrecioProveedor } from './models/cuentas-proveedores.models';
import { PrecioProveedorDialogComponent } from './precio-proveedor-dialog.component';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';

@Component({
  selector: 'app-precios-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DataTableCellDirective,
    FiltrosPlegablesComponent,
    HasRoleDirective,
    IconComponent,
    PrecioProveedorDialogComponent,
    SelectorBuscableComponent,
    ServerDataTableComponent,
    StatusChipComponent,
  ],
  template: `
    <app-filtros-plegables clases="mb-3 flex flex-wrap items-end gap-3">
      <div class="w-full sm:w-64">
        <label for="precios-proveedor" class="mb-1 block text-xs font-medium text-muted-foreground">Proveedor</label>
        <app-selector-buscable
          idCampo="precios-proveedor"
          [opciones]="opcionesProveedores()"
          [(valor)]="proveedor"
          etiquetaVacia="Todos los proveedores"
          placeholder="Buscar proveedor…"
        />
      </div>
      <div class="w-full sm:w-64">
        <label for="precios-insumo" class="mb-1 block text-xs font-medium text-muted-foreground">Materia prima</label>
        <app-selector-buscable
          idCampo="precios-insumo"
          [opciones]="opcionesInsumos()"
          [(valor)]="insumo"
          etiquetaVacia="Todas las materias primas"
          placeholder="Buscar materia prima…"
        />
      </div>
      <label class="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" class="size-4" [checked]="soloVigentes()" (change)="soloVigentes.set($any($event.target).checked)" />
        Solo los vigentes
      </label>
      <button *hasRole="'ADMIN'" type="button" data-accion class="sila-btn sila-btn-primary ms-auto" (click)="abrirDialogo(null)">
        <app-icon name="lucidePlus" class="size-4" aria-hidden="true" />
        Fijar precio
      </button>
    </app-filtros-plegables>

    <p class="mb-3 rounded-md bg-muted px-4 py-2 text-sm" data-testid="aviso-precios">
      Los precios pactados con proveedores <strong>solo rigen hacia adelante</strong> y son una <strong>referencia</strong>: cada compra puede registrar su propio valor pactado en la factura.
    </p>

    <app-server-data-table
      titulo="Precios pactados con proveedores"
      [columns]="columnas"
      [page]="listado.datos()"
      [rowId]="precioId"
      [cargando]="listado.cargando()"
      [error]="listado.error()"
      [sort]="null"
      vacioTitulo="Aún no hay precios pactados"
      vacioAyuda="Usa «Fijar precio» para registrar precios de referencia con los proveedores."
      (pageChange)="listado.irAPagina($event)"
      (sizeChange)="listado.cambiarTamano($event)"
      (reintentar)="listado.recargar()"
    >
      <ng-template appDataTableCell="proveedor" [cellRows]="listado.datos()?.items" let-p>
        <span class="font-medium">{{ p.proveedor }}</span>
      </ng-template>
      <ng-template appDataTableCell="insumo" [cellRows]="listado.datos()?.items" let-p>
        <span>{{ p.insumo }}</span>
        <span class="ms-1.5 text-xs text-muted-foreground">({{ p.codigo }})</span>
      </ng-template>
      <ng-template appDataTableCell="precio_unitario" [cellRows]="listado.datos()?.items" let-p>
        <span class="font-medium tabular-nums">{{ cop(p.precio_unitario) }} / {{ p.unidad_medida }}</span>
      </ng-template>
      <ng-template appDataTableCell="vigente_desde" [cellRows]="listado.datos()?.items" let-p>
        <span class="whitespace-nowrap">{{ fecha(p.vigente_desde) }}</span>
      </ng-template>
      <ng-template appDataTableCell="vigente" [cellRows]="listado.datos()?.items" let-p>
        <app-status-chip [texto]="p.vigente ? 'Vigente' : 'Anterior'" [tono]="p.vigente ? 'exito' : 'neutro'" />
      </ng-template>
      <ng-template appDataTableCell="acciones" [cellRows]="listado.datos()?.items" let-p>
        @if (p.vigente) {
          <button *hasRole="'ADMIN'" type="button" class="sila-btn sila-btn-outline sila-btn-sm" (click)="abrirDialogo(p)">
            Cambiar precio<span class="sr-only"> de {{ p.insumo }} con {{ p.proveedor }}</span>
          </button>
        }
      </ng-template>
    </app-server-data-table>

    <app-precio-proveedor-dialog
      [abierto]="dialogo()"
      [proveedores]="opcionesProveedores()"
      [materiasPrimas]="opcionesInsumos()"
      [cambio]="base()"
      (guardado)="alGuardar($event)"
      (cerrar)="dialogo.set(false)"
    />
  `,
})
export class PreciosTabComponent {
  private readonly repo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly catalogos = inject(CATALOGOS_REPOSITORY);
  private readonly insumosRepo = inject(INSUMOS_REPOSITORY);
  private readonly toast = inject(ToastService);

  protected readonly cop = formatoCop;
  protected readonly fecha = formatoFecha;

  protected readonly proveedor = signal<number | null>(null);
  protected readonly insumo = signal<number | null>(null);
  protected readonly soloVigentes = signal(false);
  protected readonly dialogo = signal(false);
  /** Precio vigente desde el que se abrió «Cambiar precio»; `null` si se abrió con «Fijar precio». */
  protected readonly base = signal<PrecioProveedor | null>(null);

  private readonly proveedoresRecurso = rxResource({
    stream: () => todasLasPaginas((q) => this.catalogos.listarProveedores({ activo: true, sort: 'nombre,asc', ...q })),
  });
  protected readonly opcionesProveedores = computed<readonly OpcionSelector[]>(() =>
    this.proveedoresRecurso.hasValue()
      ? this.proveedoresRecurso.value().items.map((p) => ({ valor: p.id_proveedor, etiqueta: p.nombre }))
      : [],
  );

  private readonly insumosRecurso = rxResource({
    stream: () => todasLasPaginas((q) => this.insumosRepo.listar({ activo: true, sort: 'nombre,asc', ...q })),
  });
  protected readonly opcionesInsumos = computed<readonly OpcionSelector[]>(() =>
    this.insumosRecurso.hasValue()
      ? this.insumosRecurso.value().items.map((i) => ({ valor: i.id_insumo, etiqueta: `${i.nombre} (${i.codigo})` }))
      : [],
  );

  protected readonly listado = crearListado({
    filtros: () => ({
      id_proveedor: this.proveedor() ?? undefined,
      id_insumo: this.insumo() ?? undefined,
      solo_vigentes: this.soloVigentes() || undefined,
    }),
    cargar: (query) => this.repo.listarPrecios(query),
    sort: '',
  });

  protected readonly columnas: DataTableColumn<PrecioProveedor>[] = [
    { key: 'proveedor', label: 'Proveedor', sortable: false, value: (p) => p.proveedor },
    { key: 'insumo', label: 'Materia prima', sortable: false, value: (p) => p.insumo },
    { key: 'precio_unitario', label: 'Precio pactado', sortable: false, align: 'end', value: (p) => p.precio_unitario },
    { key: 'vigente_desde', label: 'Rige desde', sortable: false, value: (p) => p.vigente_desde },
    { key: 'vigente', label: 'Estado', sortable: false, value: (p) => (p.vigente ? 'Vigente' : 'Anterior') },
    { key: 'acciones', label: 'Acciones', sortable: false, value: () => '' },
  ];
  protected readonly precioId = (p: PrecioProveedor) => p.id_precio;

  protected abrirDialogo(precio: PrecioProveedor | null): void {
    this.base.set(precio);
    this.dialogo.set(true);
  }

  protected alGuardar(precio: PrecioProveedor): void {
    this.dialogo.set(false);
    this.listado.recargar();
    this.toast.exito(`Precio pactado de ${formatoCop(precio.precio_unitario)} para ${precio.insumo} fijado con ${precio.proveedor}.`);
  }
}
