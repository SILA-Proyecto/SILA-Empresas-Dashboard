import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LegalService } from '../../core/legal/legal.service';
import type { DocumentoAceptable } from '../../core/legal/legal.models';
import { type DocumentoLegal, TEXTOS, compararVersiones, textoDe, ultimoTexto } from './contenido';
import { TextoLegalComponent } from './texto-legal.component';

/**
 * One legal page (`data.documento` says which). TERMINOS and PRIVACIDAD show the version the backend says rules
 * (`GET /legal/vigentes`, no session needed); `?v=1.0` shows an older one (to see what was accepted). If the backend asks for a
 * version this build has no text for, it says so instead of showing another one in its place.
 */
@Component({
  selector: 'app-legal-documento-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TextoLegalComponent],
  template: `
    @if (cargandoVigente()) {
      <p class="text-sm text-muted-foreground" aria-busy="true">Cargando…</p>
    } @else if (texto(); as t) {
      <app-texto-legal [texto]="t" />
      @if (otrasVersiones().length > 0) {
        <section class="mt-10 border-t border-border pt-4 print:hidden" aria-label="Otras versiones">
          <h2 class="mb-2 text-sm font-semibold">Otras versiones de este documento</h2>
          <ul class="flex flex-wrap gap-3 text-sm">
            @for (v of otrasVersiones(); track v) {
              <li><a [routerLink]="[]" [queryParams]="{ v }" class="underline underline-offset-2">Versión {{ v }}</a></li>
            }
          </ul>
        </section>
      }
    } @else {
      <div role="alert" class="sila-card p-6" data-testid="version-no-disponible">
        <h1 class="mb-1 text-lg font-semibold">Versión no disponible</h1>
        <p class="text-sm text-muted-foreground">
          Esta página no tiene el texto de la versión {{ versionPedida() }}. No se muestra otra en su lugar. Avisa al administrador de tu empresa.
        </p>
        <a [routerLink]="[]" [queryParams]="{ v: null }" class="mt-3 inline-block text-sm underline underline-offset-2">Ver la versión más reciente que tenemos ({{ ultima().version }})</a>
      </div>
    }
    <p class="mt-8 print:hidden"><a routerLink="/legal" class="text-sm underline underline-offset-2">← Toda la información legal</a></p>
  `,
})
export class LegalDocumentoPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly legal = inject(LegalService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly documento = this.route.snapshot.data['documento'] as DocumentoLegal;
  private readonly versionConsulta = toSignal(this.route.queryParamMap.pipe(map((q) => q.get('v'))), { initialValue: this.route.snapshot.queryParamMap.get('v') });
  /** Only TERMINOS and PRIVACIDAD have a version in force at the backend. */
  private readonly esAceptable = this.documento === 'TERMINOS' || this.documento === 'PRIVACIDAD';
  private readonly versionVigente = signal<string | null>(null);
  private readonly consultaTerminada = signal(!this.esAceptable);

  protected readonly cargandoVigente = computed(() => !this.consultaTerminada() && this.versionConsulta() === null);
  protected readonly ultima = computed(() => ultimoTexto(this.documento));
  protected readonly versionPedida = computed(() => this.versionConsulta() ?? this.versionVigente() ?? this.ultima().version);
  protected readonly texto = computed(() => textoDe(this.documento, this.versionPedida()));
  protected readonly otrasVersiones = computed(() =>
    Object.keys(TEXTOS[this.documento])
      .filter((v) => v !== this.texto()?.version)
      .sort(compararVersiones),
  );

  constructor() {
    if (this.esAceptable) {
      this.legal
        .vigentes()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (r) => {
            this.versionVigente.set(r.documentos.find((d) => d.documento === (this.documento as DocumentoAceptable))?.version ?? null);
            this.consultaTerminada.set(true);
          },
          // Without the answer the newest text we have is shown (the page still reads, nothing is accepted here).
          error: () => this.consultaTerminada.set(true),
        });
    }
  }
}
