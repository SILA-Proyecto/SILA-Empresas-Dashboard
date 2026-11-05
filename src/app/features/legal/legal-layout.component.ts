import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { ThemeService } from '../../layout/services/theme.service';
import { LogoEmpresaComponent } from '../../shared/ui/logo-empresa/logo-empresa.component';
import { PieLegalComponent } from '../../shared/ui/pie-legal/pie-legal.component';

/**
 * Frame of the public legal pages: company name and logo (from `/empresa/publica`), a way back, the page, and the footer.
 * No menu and no session needed: they are read from the login too.
 */
@Component({
  selector: 'app-legal-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoEmpresaComponent, PieLegalComponent, RouterLink, RouterOutlet],
  template: `
    <a href="#legal-contenido" (click)="saltar($event)" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground">Saltar al contenido</a>
    <div class="flex min-h-dvh flex-col bg-background text-foreground">
      <header class="border-b border-border bg-card print:hidden">
        <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <a routerLink="/legal" class="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ring">
            <app-logo-empresa tamano="md" />
            <span class="min-w-0 truncate text-sm font-bold tracking-tight">{{ marca() }} · Información legal</span>
          </a>
          <a routerLink="/" class="sila-btn sila-btn-outline sila-btn-sm" data-testid="legal-volver">Volver al sistema</a>
        </div>
      </header>
      <main id="legal-contenido" tabindex="-1" class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 outline-none sm:py-10">
        <router-outlet />
      </main>
      <app-pie-legal [nuevaPestana]="false" />
    </div>
  `,
})
export class LegalLayoutComponent {
  private readonly empresa = inject(EmpresaService);

  protected readonly marca = () => {
    const corto = this.empresa.nombreCorto();
    return corto ? `SILA · ${corto}` : 'SILA';
  };

  constructor() {
    // Outside the shell: it applies the theme itself, and asks for the company name (public, no session).
    inject(ThemeService);
    if (!this.empresa.nombre()) void this.empresa.cargarPublica();
  }

  /** Moves the focus only: a plain `#id` link would reload the app (the page has `<base href="/">`). */
  protected saltar(evento: Event): void {
    evento.preventDefault();
    document.getElementById('legal-contenido')?.focus();
  }
}
