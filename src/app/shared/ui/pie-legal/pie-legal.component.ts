import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGINAS_LEGALES } from '../../../features/legal/contenido';

/**
 * Footer with the legal links, on EVERY screen (login, the app, the acceptance screen and the legal pages themselves).
 * Inside the app and the login the links open in a new tab, so nobody loses what they were typing.
 */
@Component({
  selector: 'app-pie-legal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block print:hidden' },
  template: `
    <footer class="px-3 py-4 text-center text-xs text-muted-foreground sm:px-6" data-testid="pie-legal">
      <nav aria-label="Información legal">
        <ul class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          @for (p of paginas; track p.ruta) {
            <li>
              <a
                [routerLink]="p.ruta"
                [attr.target]="nuevaPestana() ? '_blank' : null"
                [attr.rel]="nuevaPestana() ? 'noopener' : null"
                class="inline-flex min-h-8 items-center underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring max-lg:min-h-11"
                >{{ p.corta }}@if (nuevaPestana()) {<span class="sr-only"> (se abre en una pestaña nueva)</span>}</a
              >
            </li>
          }
        </ul>
      </nav>
    </footer>
  `,
})
export class PieLegalComponent {
  protected readonly paginas = PAGINAS_LEGALES;
  readonly nuevaPestana = input(true);
}
