import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { URL_INICIO, urlRetornoSegura } from '../../core/auth/url-retorno';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { CODIGO_LEGAL_CAMBIO_VERSION, type DocumentoAceptable, type EstadoDocumento, type EstadoLegal, RUTA_ACEPTAR_TERMINOS } from '../../core/legal/legal.models';
import { LegalService } from '../../core/legal/legal.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { LogoEmpresaComponent } from '../../shared/ui/logo-empresa/logo-empresa.component';
import { PieLegalComponent } from '../../shared/ui/pie-legal/pie-legal.component';
import { formatoFecha } from '../../shared/utils/formato-co';
import { RUTA_PRIVACIDAD, RUTA_TERMINOS, textoDe } from './contenido';
import { TextoLegalComponent } from './texto-legal.component';

const RUTAS: Record<DocumentoAceptable, string> = { TERMINOS: RUTA_TERMINOS, PRIVACIDAD: RUTA_PRIVACIDAD };
const NOMBRES: Record<DocumentoAceptable, string> = { TERMINOS: 'Términos y condiciones de uso', PRIVACIDAD: 'Política de tratamiento de datos personales' };
const DOCUMENTOS: readonly DocumentoAceptable[] = ['TERMINOS', 'PRIVACIDAD'];

/**
 * «Aceptar términos»: outside the shell (no menu, no business route). Shows the two documents in the version the BACKEND says
 * rules (`/legal/estado`, never fixed values), one unchecked box per document, and sends exactly the versions it is showing.
 * The only evidence of the acceptance is the one the backend keeps: nothing is stored in the browser.
 */
@Component({
  selector: 'app-aceptar-terminos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoEmpresaComponent, PieLegalComponent, RouterLink, TextoLegalComponent],
  template: `
    <div class="flex min-h-dvh flex-col bg-background text-foreground">
      <header class="border-b border-border bg-card">
        <div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span class="flex min-w-0 items-center gap-3">
            <app-logo-empresa tamano="md" />
            <span class="min-w-0 truncate text-sm font-bold tracking-tight">{{ marca() }}</span>
          </span>
          <button type="button" class="sila-btn sila-btn-outline sila-btn-sm" data-testid="cerrar-sesion" [disabled]="ocupado()" (click)="cerrarSesion()">Cerrar sesión</button>
        </div>
      </header>

      <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <h1 class="text-2xl font-bold tracking-tight">Antes de continuar</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Para usar SILA necesitas leer y aceptar los dos documentos de abajo. Tu aceptación queda registrada con la fecha, tu usuario y la versión que aceptas.
        </p>

        @if (errorCarga(); as mensaje) {
          <div role="alert" class="sila-card mt-6 p-6 text-center" data-testid="error-estado">
            <p class="mb-3 font-medium">{{ mensaje }}</p>
            <button type="button" class="sila-btn sila-btn-outline" (click)="cargar()">Reintentar</button>
          </div>
        } @else if (!estado()) {
          <p class="mt-6 text-sm text-muted-foreground" aria-busy="true" data-testid="cargando-estado">Cargando…</p>
        } @else {
          @if (aviso(); as mensaje) {
            <p class="mt-6 rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm font-medium" role="alert" data-testid="aviso-cambio">{{ mensaje }}</p>
          }

          <form class="mt-6 space-y-6" (submit)="aceptar($event)" novalidate>
            @for (d of documentos(); track d.documento) {
              <section class="sila-card p-4 sm:p-5" [attr.aria-labelledby]="'doc-' + d.documento">
                <h2 [id]="'doc-' + d.documento" class="text-base font-semibold">{{ d.nombre }}</h2>
                <p class="mt-1 text-xs text-muted-foreground" [attr.data-testid]="'version-' + d.documento">Versión {{ d.version }} · {{ fecha(d.fecha) }}</p>

                @if (d.texto) {
                  <details class="mt-3 text-sm">
                    <summary class="cursor-pointer font-medium">Leer aquí</summary>
                    <div class="mt-2 max-h-72 overflow-y-auto rounded-md border border-border p-3" tabindex="0" [attr.aria-label]="'Texto de ' + d.nombre" [attr.data-testid]="'texto-' + d.documento">
                      <app-texto-legal [texto]="d.texto" [compacto]="true" />
                    </div>
                  </details>
                  <a [routerLink]="d.ruta" [queryParams]="{ v: d.version }" target="_blank" rel="noopener" class="mt-2 inline-block text-sm underline underline-offset-2">Abrir en una pestaña nueva<span class="sr-only"> ({{ d.nombre }})</span></a>
                } @else {
                  <p class="mt-3 rounded-md bg-destructive/15 px-3 py-2 text-sm" role="alert" [attr.data-testid]="'sin-texto-' + d.documento">
                    Versión no disponible: este sistema no tiene el texto de la versión {{ d.version }}. No puedes aceptarla. Avisa al administrador de tu empresa.
                  </p>
                }

                <label class="mt-4 flex min-h-11 items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    class="mt-0.5 size-5 shrink-0"
                    [checked]="marcas()[d.documento]"
                    [disabled]="!d.texto || ocupado()"
                    [attr.data-testid]="'casilla-' + d.documento"
                    (change)="marcar(d.documento, $any($event.target).checked)"
                  />
                  <span>He leído y acepto: {{ d.nombre }} (versión {{ d.version }}).</span>
                </label>
              </section>
            }

            @if (error(); as mensaje) {
              <p class="rounded-md bg-destructive/15 px-3 py-2 text-sm" role="alert" data-testid="error-aceptar">{{ mensaje }}</p>
            }

            <button type="submit" class="sila-btn sila-btn-primary w-full sm:w-auto" data-testid="aceptar" [disabled]="!puedeAceptar()" [attr.aria-busy]="ocupado()">
              {{ ocupado() ? 'Guardando…' : 'Aceptar y continuar' }}
            </button>
            @if (!puedeAceptar() && !ocupado()) {
              <p class="text-xs text-muted-foreground">Marca las dos casillas para continuar.</p>
            }
          </form>
        }
      </main>
      <app-pie-legal />
    </div>
  `,
})
export class AceptarTerminosPageComponent {
  private readonly legal = inject(LegalService);
  private readonly auth = inject(AuthService);
  private readonly empresa = inject(EmpresaService);
  private readonly errores = inject(ApiErrorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fecha = formatoFecha;
  protected readonly estado = signal<EstadoLegal | null>(null);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  /** One box per document, NEVER checked beforehand. */
  protected readonly marcas = signal<Record<DocumentoAceptable, boolean>>({ TERMINOS: false, PRIVACIDAD: false });

  protected readonly marca = computed(() => {
    const corto = this.empresa.nombreCorto();
    return corto ? `SILA · ${corto}` : 'SILA';
  });

  /** The two documents with the versions that RULE now and the text of that exact version (or `null` if this build has none). */
  protected readonly documentos = computed(() => {
    const lista = this.estado()?.documentos ?? [];
    return DOCUMENTOS.flatMap((doc) => {
      const d: EstadoDocumento | undefined = lista.find((x) => x.documento === doc);
      return d ? [{ ...d, nombre: NOMBRES[doc], ruta: RUTAS[doc], texto: textoDe(doc, d.version) }] : [];
    });
  });

  protected readonly puedeAceptar = computed(() => {
    const docs = this.documentos();
    const m = this.marcas();
    return !this.ocupado() && docs.length === DOCUMENTOS.length && docs.every((d) => d.texto !== null && m[d.documento]);
  });

  constructor() {
    // Outside the shell: it applies the theme itself.
    inject(ThemeService);
    if (!this.empresa.nombre()) void this.empresa.cargarPublica();
    this.cargar();
  }

  protected cargar(): void {
    this.errorCarga.set(null);
    this.legal
      .cargarEstado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          if (estado.al_dia) {
            this.salir();
            return;
          }
          this.estado.set(estado);
        },
        error: (fallo: unknown) => this.errorCarga.set(this.errores.describe(fallo).mensaje),
      });
  }

  protected marcar(documento: DocumentoAceptable, valor: boolean): void {
    this.marcas.update((m) => ({ ...m, [documento]: valor }));
  }

  protected aceptar(evento: Event): void {
    evento.preventDefault();
    if (!this.puedeAceptar()) return;
    this.ocupado.set(true);
    this.error.set(null);
    this.aviso.set(null);
    // The versions are the ones on screen (taken from the backend's state), never constants of this code.
    const aceptaciones = this.documentos().map((d) => ({ documento: d.documento, version: d.version }));
    this.legal
      .aceptar({ aceptaciones })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estado) => {
          this.ocupado.set(false);
          if (estado.al_dia) this.salir();
          else this.error.set('No se pudo registrar tu aceptación. Intenta de nuevo.');
        },
        error: (fallo: unknown) => this.fallar(fallo),
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion().subscribe(() => void this.router.navigate(['/login']));
  }

  private fallar(fallo: unknown): void {
    this.ocupado.set(false);
    const causa = causaDe(fallo);
    if (isApiError(causa) && causa.code === CODIGO_LEGAL_CAMBIO_VERSION) {
      // The version changed while the person was reading: show the new texts and ask again.
      this.marcas.set({ TERMINOS: false, PRIVACIDAD: false });
      this.aviso.set('Los documentos cambiaron; léalos de nuevo.');
      this.cargar();
      return;
    }
    this.error.set(this.errores.describe(fallo).mensaje);
  }

  /** Up to date: the company data (it failed with 20022 before) is read again and the person goes where they were going. */
  private salir(): void {
    void this.empresa.asegurarCargada();
    const destino = urlRetornoSegura(this.route.snapshot.queryParamMap.get('return'));
    void this.router.navigateByUrl(destino.startsWith(RUTA_ACEPTAR_TERMINOS) ? URL_INICIO : destino, { replaceUrl: true });
  }
}
