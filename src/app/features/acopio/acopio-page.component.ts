import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { CalidadTabComponent } from './calidad-tab.component';

/** Milk quality control: per-provider averages, rejections and threshold monitoring. */
@Component({
  selector: 'app-acopio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalidadTabComponent, IconComponent, PageHeaderComponent, RouterLink],
  template: `
    <app-page-header
      title="Control de calidad de la leche"
      description="Cada entrega de leche con su fecha, litros, temperatura y acidez, y el resumen de rechazos por proveedor."
    />

    @if (esRutaAntigua()) {
      <div class="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-4" data-testid="aviso-migracion">
        <p class="font-medium text-foreground">Actualización del sistema:</p>
        @if (parametro() === 'recepciones') {
          <p class="mt-1 text-sm text-muted-foreground">
            Las entregas de leche ahora se registran como compras en la sección de Materias primas.
          </p>
          <a routerLink="/insumos" [queryParams]="{ pestana: 'compras' }" class="sila-btn sila-btn-primary sila-btn-sm mt-3 inline-flex items-center gap-1.5">
            <app-icon name="lucidePackage" class="size-4" aria-hidden="true" />
            Ir a Compras de materias primas
          </a>
        } @else {
          <p class="mt-1 text-sm text-muted-foreground">
            Las cuentas, saldos, pagos y precios con proveedores ahora se gestionan en Cuentas con proveedores.
          </p>
          <a routerLink="/cuentas-proveedores" class="sila-btn sila-btn-primary sila-btn-sm mt-3 inline-flex items-center gap-1.5">
            <app-icon name="lucideHandCoins" class="size-4" aria-hidden="true" />
            Ir a Cuentas con proveedores
          </a>
        }
      </div>
    }

    <app-calidad-tab />
  `,
})
export class AcopioPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly parametro = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('pestana'))));
  protected readonly esRutaAntigua = computed(() => {
    const p = this.parametro();
    return p === 'recepciones' || p === 'pago' || p === 'lecheros' || p === 'precios';
  });
}
