import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, afterRenderEffect, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { AsistenteService, LARGO_MAXIMO_MENSAJE } from './asistente.service';
import { type EjemploAsistente, ejemplosPara } from './ejemplos-asistente';
import { analizarTexto } from './texto-asistente';

/** Key of «this user already read the AI notice in this tab». Not evidence of anything (see `avisoVisto`). */
export const CLAVE_AVISO_IA = 'sila_aviso_ia';

/**
 * Floating help bubble, on every screen once the session is open (the shell hosts it).
 * Tap: chat panel — a corner card on desktop, full screen on phones.
 * The state of the conversation lives in `AsistenteService`; this component only draws it and takes the typing.
 */
@Component({
  selector: 'app-asistente-burbuja',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink],
  host: { '(document:keydown.escape)': 'cerrarConEscape()' },
  template: `
    @if (!abierto()) {
      <button
        #boton
        type="button"
        class="sila-asistente-boton fixed z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden"
        aria-label="Abrir el asistente de ayuda"
        data-testid="asistente-abrir"
        (click)="abrir()"
      >
        <app-icon name="lucideMessageCircle" class="size-6" aria-hidden="true" />
      </button>
    } @else {
      <section
        class="sila-asistente-panel fixed inset-0 z-40 flex flex-col overflow-hidden bg-background text-foreground sm:inset-auto sm:end-4 sm:bottom-4 sm:h-[min(36rem,calc(100dvh-2rem))] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl print:hidden"
        role="dialog"
        aria-label="Asistente SILA"
        data-testid="asistente-panel"
      >
        <header class="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
          <app-icon name="lucideMessageCircle" class="size-5 text-primary" aria-hidden="true" />
          <h2 class="min-w-0 flex-1 truncate text-sm font-semibold">Asistente SILA</h2>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 sm:min-h-9"
            aria-label="Nueva conversación"
            title="Nueva conversación"
            data-testid="asistente-nueva"
            [disabled]="servicio.mensajes().length === 0 && !servicio.enviando() && !servicio.error()"
            (click)="nueva()"
          >
            <app-icon name="lucideSquarePen" class="size-4" aria-hidden="true" />
            <span class="hidden sm:inline">Nueva conversación</span>
          </button>
          <button
            type="button"
            class="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:size-9"
            aria-label="Cerrar el asistente"
            data-testid="asistente-cerrar"
            (click)="cerrar()"
          >
            <app-icon name="lucideX" class="size-4" aria-hidden="true" />
          </button>
        </header>

        <div #zona class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3" role="log" aria-live="polite" aria-label="Conversación" data-testid="asistente-conversacion">
          <div class="max-w-[85%] rounded-2xl rounded-es-sm bg-muted px-3 py-2 text-sm" data-testid="asistente-bienvenida">
            <p>Hola{{ nombre() ? ', ' + nombre() : '' }}. Soy el asistente de SILA: te explico dónde está cada cosa y consulto las cifras del negocio.</p>
            @if (servicio.mensajes().length === 0) {
              <p class="mt-2 text-xs text-muted-foreground">Prueba con una de estas preguntas:</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                @for (ejemplo of ejemplos(); track ejemplo.texto) {
                  <button
                    type="button"
                    class="min-h-11 rounded-full border border-border bg-background px-3 py-1 text-start text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:min-h-8"
                    data-testid="asistente-ejemplo"
                    (click)="usarEjemplo(ejemplo)"
                  >
                    {{ ejemplo.texto }}
                  </button>
                }
              </div>
            }
          </div>

          @for (m of vista(); track m.id) {
            @if (m.de === 'usuario') {
              <div class="flex justify-end">
                <p class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-sm bg-primary px-3 py-2 text-sm text-primary-foreground" data-testid="asistente-mensaje-usuario">{{ m.texto }}</p>
              </div>
            } @else {
              <div class="max-w-[90%] space-y-2 break-words rounded-2xl rounded-es-sm bg-muted px-3 py-2 text-sm" data-testid="asistente-mensaje-asistente">
                @for (bloque of m.bloques; track $index) {
                  @if (bloque.tipo === 'lista') {
                    <ul class="list-disc space-y-1 ps-5">
                      @for (item of bloque.items; track $index) {
                        <li>
                          @for (trozo of item; track $index) {
                            @if (trozo.negrita) {
                              <strong>{{ trozo.texto }}</strong>
                            } @else {
                              <span>{{ trozo.texto }}</span>
                            }
                          }
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="whitespace-pre-line">
                      @for (trozo of bloque.trozos; track $index) {
                        @if (trozo.negrita) {
                          <strong>{{ trozo.texto }}</strong>
                        } @else {
                          <span>{{ trozo.texto }}</span>
                        }
                      }
                    </p>
                  }
                }
              </div>
            }
          }

          @if (servicio.enviando()) {
            <div class="flex items-center gap-2 text-xs text-muted-foreground" data-testid="asistente-escribiendo">
              <span class="flex gap-1" aria-hidden="true">
                <span class="size-1.5 rounded-full bg-current motion-safe:animate-pulse"></span>
                <span class="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:150ms]"></span>
                <span class="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:300ms]"></span>
              </span>
              Escribiendo… puede tardar unos segundos
            </div>
          }

          @if (servicio.error(); as error) {
            <div class="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert" data-testid="asistente-error">
              <p>{{ error.mensaje }}</p>
              @if (error.reintentable) {
                <button type="button" class="mt-1.5 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-accent sm:min-h-8" data-testid="asistente-reintentar" (click)="servicio.reintentar()">
                  Reintentar
                </button>
              }
            </div>
          }
        </div>

        @if (!avisoVisto()) {
          <div class="shrink-0 border-t border-border bg-muted px-3 py-2 text-xs leading-snug" data-testid="asistente-aviso-ia">
            <p>
              Tus preguntas y los datos que el asistente lee con tu mismo rol se procesan con un servicio de inteligencia artificial. Puede equivocarse. No escribas datos sensibles ni de menores.
              <a routerLink="/legal/ia" target="_blank" rel="noopener" class="font-medium underline underline-offset-2">Leer el aviso<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
            </p>
            <label class="mt-1 flex min-h-11 items-center gap-2 sm:min-h-8">
              <input type="checkbox" class="size-4 shrink-0" data-testid="asistente-aviso-casilla" [checked]="false" (change)="marcarAviso($any($event.target).checked)" />
              He leído el aviso y quiero usar el asistente.
            </label>
          </div>
        }
        <form class="shrink-0 border-t border-border bg-card p-3" style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))" (submit)="enviar($event)">
          <div class="flex items-end gap-2">
            <label class="sr-only" for="asistente-texto">Escribe tu pregunta</label>
            <textarea
              #caja
              id="asistente-texto"
              rows="1"
              class="sila-input max-h-32 min-h-11 min-w-0 flex-1 resize-none py-2.5 [field-sizing:content]"
              placeholder="Escribe tu pregunta…"
              autocomplete="off"
              data-testid="asistente-texto"
              [value]="borrador()"
              [attr.aria-invalid]="demasiado() ? 'true' : null"
              (input)="borrador.set(caja.value)"
              (keydown.enter)="alEnter($event)"
            ></textarea>
            <button
              type="submit"
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
              aria-label="Enviar pregunta"
              data-testid="asistente-enviar"
              [disabled]="!puedeEnviar()"
            >
              <app-icon name="lucideSend" class="size-4" aria-hidden="true" />
            </button>
          </div>
          @if (demasiado()) {
            <p class="mt-1 text-xs font-medium text-destructive" role="alert" data-testid="asistente-largo">
              Tu pregunta tiene {{ borrador().trim().length }} caracteres y el máximo es {{ maximo }}. Acórtala para enviarla.
            </p>
          }
          <p class="mt-2 text-[11px] leading-snug text-muted-foreground" data-testid="asistente-advertencia">El asistente solo consulta; no puede cambiar datos. Puede equivocarse: verifica las cifras importantes. No ingreses datos sensibles ni de menores.</p>
        </form>
      </section>
    }
  `,
})
export class AsistenteBurbujaComponent {
  protected readonly servicio = inject(AsistenteService);
  private readonly auth = inject(AuthService);
  private readonly documento = inject(DOCUMENT);

  protected readonly maximo = LARGO_MAXIMO_MENSAJE;
  protected readonly abierto = signal(false);
  protected readonly borrador = signal('');

  private readonly boton = viewChild<ElementRef<HTMLButtonElement>>('boton');
  private readonly zona = viewChild<ElementRef<HTMLElement>>('zona');
  private readonly caja = viewChild<ElementRef<HTMLTextAreaElement>>('caja');

  protected readonly ejemplos = computed(() => ejemplosPara(this.auth.rol()));
  protected readonly nombre = computed(() => this.auth.sesion()?.nombre.split(' ')[0] ?? '');
  protected readonly vista = computed(() =>
    this.servicio.mensajes().map((m) => ({ ...m, bloques: m.de === 'asistente' ? analizarTexto(m.texto) : [] })),
  );
  protected readonly demasiado = computed(() => this.borrador().trim().length > LARGO_MAXIMO_MENSAJE);
  /**
   * The notice of the AI service. It is a barrier of the INTERFACE, not evidence: the backend does not record it yet (see
   * docs/legal/PENDIENTES_BACKEND.md, point 1). It is remembered only while this tab lives (`sessionStorage`) and only for
   * this user, so another person on the same tab is asked again.
   */
  protected readonly avisoVisto = signal(this.leerAviso());
  protected readonly puedeEnviar = computed(() => this.avisoVisto() && this.borrador().trim().length > 0 && !this.demasiado() && !this.servicio.enviando());

  /** Whether the panel was closed by the person: then the focus goes back to the bubble. */
  private devolverFoco = false;

  constructor() {
    // Phones: the panel is full screen, so the page behind must not scroll.
    effect(() => this.documento.body.classList.toggle('sila-chat-abierto', this.abierto()));
    // Always at the last bubble (new answer, "escribiendo…", error).
    afterRenderEffect(() => {
      this.servicio.mensajes();
      this.servicio.enviando();
      this.servicio.error();
      const zona = this.zona()?.nativeElement;
      if (zona) zona.scrollTop = zona.scrollHeight;
    });
    afterRenderEffect(() => {
      if (this.abierto()) {
        // Phones: no keyboard popping up over the examples.
        if (typeof matchMedia === 'function' && matchMedia('(min-width: 640px)').matches) this.caja()?.nativeElement.focus();
      } else if (this.devolverFoco) {
        this.devolverFoco = false;
        this.boton()?.nativeElement.focus();
      }
    });
  }

  protected abrir(): void {
    this.abierto.set(true);
  }

  protected cerrar(): void {
    this.devolverFoco = true;
    this.abierto.set(false);
  }

  protected cerrarConEscape(): void {
    if (this.abierto()) this.cerrar();
  }

  protected nueva(): void {
    this.servicio.nuevaConversacion();
    this.borrador.set('');
  }

  protected usarEjemplo(ejemplo: EjemploAsistente): void {
    if (ejemplo.completar) {
      // «¿Cuánto debe el cliente…?» → the person finishes it in the box.
      this.borrador.set(ejemplo.texto.replace(/…\??$/, ' '));
      this.caja()?.nativeElement.focus();
      return;
    }
    this.mandar(ejemplo.texto);
  }

  /** Enter sends; Shift+Enter is a new line; while an IME is composing, Enter belongs to the IME. */
  protected alEnter(evento: Event): void {
    const e = evento as KeyboardEvent;
    if (e.shiftKey || e.isComposing) return;
    e.preventDefault();
    this.mandar(this.borrador());
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    this.mandar(this.borrador());
  }

  protected marcarAviso(valor: boolean): void {
    if (!valor) return;
    this.avisoVisto.set(true);
    try {
      sessionStorage.setItem(CLAVE_AVISO_IA, String(this.auth.sesion()?.id_usuario ?? ''));
    } catch {
      // Without storage the notice is asked again next time: harmless.
    }
  }

  private leerAviso(): boolean {
    try {
      const id = this.auth.sesion()?.id_usuario;
      return id !== undefined && sessionStorage.getItem(CLAVE_AVISO_IA) === String(id);
    } catch {
      return false;
    }
  }

  private mandar(texto: string): void {
    if (!this.avisoVisto()) return;
    if (this.servicio.enviar(texto)) {
      this.borrador.set('');
      const caja = this.caja()?.nativeElement;
      if (caja) caja.value = '';
    }
  }
}
