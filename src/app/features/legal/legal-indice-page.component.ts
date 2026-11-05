import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGINAS_LEGALES, ultimoTexto } from './contenido';
import { MOSTRAR_AVISO_BORRADOR } from './contenido/tipos';

/** `/legal`: the list of every legal page. */
@Component({
  selector: 'app-legal-indice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Información legal</h1>
    <p class="mt-2 text-sm text-muted-foreground">Los textos que explican cómo se usa SILA y cómo se tratan tus datos.</p>
    @if (avisoBorrador) {
      <p class="mt-4 rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm font-medium" role="note" data-testid="borrador-juridico">Borrador pendiente de validación jurídica</p>
    }
    <ul class="mt-6 grid gap-3" aria-label="Páginas legales">
      @for (p of paginas; track p.ruta) {
        <li>
          <a [routerLink]="p.ruta" class="sila-card block p-4 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">
            <span class="block font-semibold">{{ p.etiqueta }}</span>
            @if (resumen(p.documento); as r) {
              <span class="mt-1 block text-sm text-muted-foreground">{{ r }}</span>
            } @else {
              <span class="mt-1 block text-sm text-muted-foreground">Las librerías de terceros que usa el sistema y sus licencias.</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
})
export class LegalIndicePageComponent {
  protected readonly paginas = PAGINAS_LEGALES;
  protected readonly avisoBorrador = MOSTRAR_AVISO_BORRADOR;

  /** The summary says `{{empresa}}` in one text: the index shows it without the mark. */
  protected resumen(documento: (typeof PAGINAS_LEGALES)[number]['documento']): string | null {
    return documento ? ultimoTexto(documento).resumen.split('{{empresa}}').join('la empresa') : null;
  }
}
