import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EmpresaService } from '../../../core/empresa/empresa.service';
import { iniciales } from '../../utils/formato-co';

/**
 * The company logo, or its initials when it has none (or the image fails: never a broken-image icon).
 * The logo sits on a white plate so a dark logo still shows on the dark theme; fixed height, automatic width,
 * `object-fit: contain` (it may be wide or square and is never stretched).
 */
@Component({
  selector: 'app-logo-empresa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (empresa.logoVisible(); as url) {
      <span class="sila-logo-empresa inline-flex shrink-0 items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-black/10" [class]="clasesAlto()" [style.max-width]="anchoMaximo()">
        <img
          class="h-full w-auto max-w-full object-contain"
          [src]="url"
          [alt]="alt()"
          data-testid="logo-empresa-img"
          (error)="empresa.logoFallo(url)"
        />
      </span>
    } @else {
      <span
        class="inline-grid shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground"
        [class]="clasesIniciales()"
        role="img"
        [attr.aria-label]="alt()"
        data-testid="logo-empresa-iniciales"
      >{{ letras() }}</span>
    }
  `,
})
export class LogoEmpresaComponent {
  protected readonly empresa = inject(EmpresaService);

  /** `sm` 32 px (menu), `md` 40 px (login card), `lg` 56 px (login panel). */
  readonly tamano = input<'sm' | 'md' | 'lg'>('md');
  /** Widest the logo may get (a wide logo shrinks to fit). */
  readonly anchoMaximo = input('10rem');

  protected readonly alt = computed(() => this.empresa.nombre() ?? 'SILA');
  protected readonly letras = computed(() => iniciales(this.empresa.nombreCorto() ?? 'SILA') || 'S');

  protected readonly clasesAlto = computed(() => ({ sm: 'h-8', md: 'h-10', lg: 'h-14' })[this.tamano()]);
  protected readonly clasesIniciales = computed(() => ({ sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' })[this.tamano()]);
}
