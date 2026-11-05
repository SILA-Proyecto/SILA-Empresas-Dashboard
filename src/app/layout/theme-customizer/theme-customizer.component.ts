import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, effect, inject, viewChild } from '@angular/core';
import { IconComponent, type IconName } from '../../shared/ui/icon/icon.component';
import { ThemeCustomizerStateService } from '../services/theme-customizer-state.service';
import { type FontSize, type IconStyle, type ThemeAccent, type ThemeMode, type ThemeRadius, ThemeService } from '../services/theme.service';

interface OpcionModo {
  valor: ThemeMode;
  etiqueta: string;
  icono: IconName;
}

interface OpcionColor {
  valor: ThemeAccent;
  etiqueta: string;
  /** The swatch: the dark-theme `--primary` of that accent in styles/tokens.css. */
  muestra: string;
}

interface OpcionEsquinas {
  valor: ThemeRadius;
  etiqueta: string;
  /** Corner of the little preview square. */
  radio: string;
}

interface OpcionIconos {
  valor: IconStyle;
  etiqueta: string;
}

interface OpcionLetra {
  valor: FontSize;
  etiqueta: string;
}

/**
 * Side panel to change the look: light/dark/automatic mode, main color, corner rounding, icon style and text size.
 * Saved only in this browser (`ThemeService`).
 * Opened from the palette button in the header; the backdrop and Escape close it. Closed, it stays `inert`.
 */
@Component({
  selector: 'app-theme-customizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './theme-customizer.component.html',
  host: { '(document:keydown.escape)': 'cerrarConEscape()' },
})
export class ThemeCustomizerComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly estado = inject(ThemeCustomizerStateService);
  private readonly documento = inject(DOCUMENT);
  private readonly botonCerrar = viewChild.required<ElementRef<HTMLButtonElement>>('cerrar');
  /** Where the focus was before opening (the header button), to give it back on close. */
  private focoPrevio: HTMLElement | null = null;

  protected readonly modos: readonly OpcionModo[] = [
    { valor: 'light', etiqueta: 'Claro', icono: 'lucideSun' },
    { valor: 'dark', etiqueta: 'Oscuro', icono: 'lucideMoon' },
    { valor: 'auto', etiqueta: 'Automático', icono: 'lucideMonitor' },
  ];

  protected readonly colores: readonly OpcionColor[] = [
    { valor: 'teal', etiqueta: 'Turquesa', muestra: 'oklch(70% 0.13 195)' },
    { valor: 'blue', etiqueta: 'Azul', muestra: 'oklch(65% 0.19 255)' },
    { valor: 'violet', etiqueta: 'Violeta', muestra: 'oklch(65% 0.215 300)' },
    { valor: 'rose', etiqueta: 'Rosa', muestra: 'oklch(68% 0.235 15)' },
    { valor: 'green', etiqueta: 'Verde', muestra: 'oklch(70% 0.185 150)' },
    { valor: 'amber', etiqueta: 'Ámbar', muestra: 'oklch(85% 0.16 80)' },
  ];

  protected readonly esquinas: readonly OpcionEsquinas[] = [
    { valor: 'none', etiqueta: 'Rectas', radio: '0' },
    { valor: 'small', etiqueta: 'Poco redondeadas', radio: '0.25rem' },
    { valor: 'medium', etiqueta: 'Redondeadas', radio: '0.5rem' },
    { valor: 'large', etiqueta: 'Muy redondeadas', radio: '0.875rem' },
  ];

  protected readonly estilosIconos: readonly OpcionIconos[] = [
    { valor: 'lucide', etiqueta: 'Lineal' },
    { valor: 'tabler', etiqueta: 'Marcado' },
    { valor: 'phosphor', etiqueta: 'Redondeado' },
  ];
  /** What each style option shows as its preview. */
  protected readonly muestraIconos: readonly IconName[] = ['lucideLayoutDashboard', 'lucideScanBarcode', 'lucideWallet', 'lucideMilk', 'lucideUsers', 'lucideBell'];

  protected readonly letras: readonly OpcionLetra[] = [
    { valor: 'normal', etiqueta: 'Normal' },
    { valor: 'large', etiqueta: 'Grande' },
  ];

  constructor() {
    effect(() => {
      if (this.estado.open()) {
        this.focoPrevio = this.documento.activeElement as HTMLElement | null;
        // After the render that removes `inert`: an inert element cannot take the focus.
        queueMicrotask(() => this.botonCerrar().nativeElement.focus());
      } else if (this.focoPrevio) {
        this.focoPrevio.focus();
        this.focoPrevio = null;
      }
    });
  }

  protected cerrarConEscape(): void {
    if (this.estado.open()) this.estado.close();
  }
}
