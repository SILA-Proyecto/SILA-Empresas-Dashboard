import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

/**
 * A short notice with a link to the public page that explains it. INFORMATIVE only: it has no checkbox and keeps no evidence
 * (the backend has nowhere to store it yet; see docs/legal/PENDIENTES_BACKEND.md). The text goes in the content.
 */
@Component({
  selector: 'app-aviso-legal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink],
  host: { class: 'block' },
  template: `
    <p class="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs leading-snug text-muted-foreground" data-testid="aviso-legal">
      <app-icon name="lucideInfo" class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <ng-content />
        <a [routerLink]="ruta()" target="_blank" rel="noopener" class="ms-1 font-medium text-foreground underline underline-offset-2">{{ enlace() }}<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
      </span>
    </p>
  `,
})
export class AvisoLegalComponent {
  /** Route of the legal page (see `PAGINAS_LEGALES`). */
  readonly ruta = input.required<string>();
  readonly enlace = input.required<string>();
}
