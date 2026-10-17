import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { Pestana, PestanasComponent } from '../../shared/ui/pestanas/pestanas.component';
import { PagosTablaComponent } from './pagos-tabla.component';
import { PreciosTabComponent } from './precios-tab.component';
import { SaldosTabComponent } from './saldos-tab.component';

const PESTANAS: readonly Pestana[] = [
  { id: 'saldos', etiqueta: 'Saldos', icono: 'lucideBanknote' },
  { id: 'pagos', etiqueta: 'Pagos', icono: 'lucideReceipt' },
  { id: 'precios', etiqueta: 'Precios pactados', icono: 'lucideTags' },
];

@Component({
  selector: 'app-cuentas-proveedores-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, PagosTablaComponent, PestanasComponent, PreciosTabComponent, SaldosTabComponent],
  template: `
    <app-page-header
      title="Cuentas con proveedores"
      description="Saldos pendientes de compras a crédito por quincena, pagos realizados y precios pactados de materias primas."
    />

    <app-pestanas [pestanas]="pestanas" [activa]="activa()" etiqueta="Cuentas con proveedores" (seleccionada)="seleccionar($event)" />

    <section role="tabpanel" [id]="'panel-' + activa()" [attr.aria-labelledby]="'tab-' + activa()">
      @switch (activa()) {
        @case ('saldos') {
          <app-saldos-tab />
        }
        @case ('pagos') {
          <div class="sila-card p-4">
            <app-pagos-tabla />
          </div>
        }
        @case ('precios') {
          <app-precios-tab />
        }
      }
    </section>
  `,
})
export class CuentasProveedoresPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pestanas = PESTANAS;
  private readonly parametro = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('pestana'))));
  protected readonly activa = computed(() => PESTANAS.find((p) => p.id === this.parametro())?.id ?? 'saldos');

  protected seleccionar(id: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pestana: id },
      queryParamsHandling: 'merge',
    });
  }
}
