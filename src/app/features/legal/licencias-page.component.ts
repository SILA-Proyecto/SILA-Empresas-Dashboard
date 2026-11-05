import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOSTRAR_AVISO_BORRADOR } from './contenido/tipos';
import { LICENCIAS_GENERADAS } from './licencias.generadas';

/** `/legal/licencias`: the third-party libraries that go into the build, with their licenses (generated: `npm run licencias`). */
@Component({
  selector: 'app-licencias-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Créditos y licencias de terceros</h1>
    <p class="mt-2 text-sm text-muted-foreground">SILA usa software libre y de terceros. Estas son sus licencias y los avisos que exigen conservar.</p>
    @if (avisoBorrador) {
      <p class="mt-4 rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm font-medium" role="note" data-testid="borrador-juridico">Borrador pendiente de validación jurídica</p>
    }

    <section class="mt-6" aria-labelledby="lic-avisos">
      <h2 id="lic-avisos" class="mb-2 text-lg font-semibold">Avisos de licencia completos</h2>
      <p class="mb-2 text-sm">
        El texto de licencia de cada paquete está en <a href="licencias-terceros.txt" target="_blank" rel="noopener" class="underline underline-offset-2" data-testid="enlace-avisos">este archivo</a>.
      </p>
    </section>

    <section class="mt-6" aria-labelledby="lic-verificar">
      <h2 id="lic-verificar" class="mb-2 text-lg font-semibold">Licencias que hay que verificar</h2>
      <ul class="list-disc space-y-2 ps-6 text-sm leading-relaxed">
        <li data-testid="nota-apexcharts">
          <strong>ApexCharts y ng-apexcharts</strong> (las gráficas): su licencia es doble. La licencia comunitaria gratuita es para organizaciones con menos de 2 millones de dólares de ingresos anuales; para las demás hace falta una licencia comercial. <mark class="rounded bg-warning/40 px-1">[POR DEFINIR: verificar la licencia vigente y si el proveedor o las empresas que usan SILA necesitan la comercial.]</mark>
        </li>
        <li>
          <strong>Geist</strong> (tipografía incluida en el sitio): licencia SIL Open Font License. <mark class="rounded bg-warning/40 px-1">[POR DEFINIR: agregar el aviso de derechos de autor exacto de la fuente.]</mark>
        </li>
        <li>
          <strong>Íconos</strong> (Lucide, Phosphor y Tabler, por medio de ng-icons): aparecen en la tabla con su licencia.
        </li>
      </ul>
    </section>

    <section class="mt-6" aria-labelledby="lic-tabla">
      <h2 id="lic-tabla" class="mb-2 text-lg font-semibold">Paquetes ({{ paquetes.length }})</h2>
      <div class="sila-card overflow-x-auto">
        <table class="w-full min-w-[480px] text-left text-sm" data-testid="tabla-licencias">
          <caption class="sr-only">Paquetes de terceros y su licencia</caption>
          <thead class="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="px-3 py-2 font-medium">Paquete</th>
              <th scope="col" class="px-3 py-2 font-medium">Versión</th>
              <th scope="col" class="px-3 py-2 font-medium">Licencia</th>
            </tr>
          </thead>
          <tbody>
            @for (p of paquetes; track p.nombre + p.version) {
              <tr class="border-b border-border last:border-0">
                <th scope="row" class="px-3 py-1.5 font-medium">{{ p.nombre }}</th>
                <td class="px-3 py-1.5 tabular-nums">{{ p.version }}</td>
                <td class="px-3 py-1.5">
                  {{ p.licencia }}
                  @if (p.verificar) {
                    <span class="ms-1 rounded bg-warning/40 px-1 text-xs">verificar licencia comercial</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <p class="mt-8 print:hidden"><a routerLink="/legal" class="text-sm underline underline-offset-2">← Toda la información legal</a></p>
  `,
})
export class LicenciasPageComponent {
  protected readonly paquetes = LICENCIAS_GENERADAS;
  protected readonly avisoBorrador = MOSTRAR_AVISO_BORRADOR;
}
