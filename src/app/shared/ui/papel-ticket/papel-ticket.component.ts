import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ANCHOS_PAPEL, PapelTicketService } from '../../services/papel-ticket.service';

/** «Papel: 58 mm / 80 mm» of the ticket printer. The choice is remembered in this browser. */
@Component({
  selector: 'app-papel-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <span id="papel-ticket-etiqueta" class="text-sm text-muted-foreground">Papel de la impresora</span>
      <div class="inline-flex rounded-md border border-border" role="group" aria-labelledby="papel-ticket-etiqueta">
        @for (a of anchos; track a) {
          <button
            type="button"
            class="min-h-11 px-3 text-sm first:rounded-s-md last:rounded-e-md sm:min-h-9"
            [class.bg-primary]="papel.ancho() === a"
            [class.text-primary-foreground]="papel.ancho() === a"
            [attr.aria-pressed]="papel.ancho() === a"
            [attr.data-testid]="'papel-' + a"
            (click)="papel.elegir(a)"
          >{{ a }} mm</button>
        }
      </div>
    </div>
  `,
})
export class PapelTicketComponent {
  protected readonly papel = inject(PapelTicketService);
  protected readonly anchos = ANCHOS_PAPEL;
}
