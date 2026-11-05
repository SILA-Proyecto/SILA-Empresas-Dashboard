import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { formatoFecha } from '../../shared/utils/formato-co';
import { MOSTRAR_AVISO_BORRADOR, type TextoLegal } from './contenido/tipos';
import { contarPorDefinir, trozos } from './contenido/render';

/**
 * Draws one legal text. Static, own content: every string goes through `{{ }}` (never as raw HTML), so nothing that arrives from
 * the API can inject markup. `{{empresa}}` is the name from `/empresa/publica`; `[POR DEFINIR]` shows highlighted.
 */
@Component({
  selector: 'app-texto-legal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @let t = texto();
    <article class="min-w-0" [attr.aria-label]="compacto() ? t.titulo : null" [attr.aria-labelledby]="compacto() ? null : 'titulo-' + t.documento">
      @if (!compacto()) {
        <h1 [id]="'titulo-' + t.documento" class="text-2xl font-bold tracking-tight">{{ t.titulo }}</h1>
        <p class="mt-1 text-sm text-muted-foreground" data-testid="version-texto">Versión {{ t.version }} · {{ fecha(t.fecha) }}</p>
        <p class="mt-3 text-sm" data-testid="resumen-texto">
          @for (p of partes(t.resumen); track $index) {
            {{ p.texto }}
          }
        </p>
      }

      @if (avisoBorrador) {
        <p class="mt-4 rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm font-medium" role="note" data-testid="borrador-juridico">
          Borrador pendiente de validación jurídica
          @if (pendientes() > 0) {
            <span class="font-normal">: tiene {{ pendientes() }} dato(s) por definir, marcados así: <mark class="rounded bg-warning/40 px-1">[POR DEFINIR]</mark>.</span>
          }
        </p>
      }

      @if (!compacto()) {
        <nav class="mt-6 print:hidden" [attr.aria-label]="'Contenido de ' + t.titulo">
          <h2 class="mb-2 text-sm font-semibold">En esta página</h2>
          <ul class="space-y-1 text-sm">
            @for (s of t.secciones; track s.id) {
              <li><a [routerLink]="[]" [fragment]="s.id" class="underline-offset-2 hover:underline">{{ s.titulo }}</a></li>
            }
          </ul>
        </nav>
      }

      @for (s of t.secciones; track s.id) {
        <section class="mt-8 scroll-mt-20 break-inside-avoid-page" [id]="s.id" [attr.aria-labelledby]="'h-' + s.id">
          @if (compacto()) {
            <h4 [id]="'h-' + s.id" class="mb-2 text-base font-semibold">{{ s.titulo }}</h4>
          } @else {
            <h2 [id]="'h-' + s.id" class="mb-2 text-lg font-semibold">{{ s.titulo }}</h2>
          }
          @for (parrafo of s.parrafos ?? []; track $index) {
            <p class="mb-3 text-sm leading-relaxed">
              @for (p of partes(parrafo); track $index) {
                @if (p.porDefinir) {
                  <mark class="rounded bg-warning/40 px-1" data-testid="por-definir">{{ p.texto }}</mark>
                } @else {
                  {{ p.texto }}
                }
              }
            </p>
          }
          @if (s.items?.length) {
            <ul class="mb-3 list-disc space-y-1 ps-6 text-sm leading-relaxed">
              @for (item of s.items; track $index) {
                <li>
                  @for (p of partes(item); track $index) {
                    @if (p.porDefinir) {
                      <mark class="rounded bg-warning/40 px-1" data-testid="por-definir">{{ p.texto }}</mark>
                    } @else {
                      {{ p.texto }}
                    }
                  }
                </li>
              }
            </ul>
          }
          @for (parrafo of s.cierre ?? []; track $index) {
            <p class="mb-3 text-sm leading-relaxed">
              @for (p of partes(parrafo); track $index) {
                @if (p.porDefinir) {
                  <mark class="rounded bg-warning/40 px-1" data-testid="por-definir">{{ p.texto }}</mark>
                } @else {
                  {{ p.texto }}
                }
              }
            </p>
          }
        </section>
      }
    </article>
  `,
})
export class TextoLegalComponent {
  private readonly empresa = inject(EmpresaService);

  readonly texto = input.required<TextoLegal>();
  protected readonly avisoBorrador = MOSTRAR_AVISO_BORRADOR;
  /** Inside the acceptance screen's scroll panel: no title block (the card has it) and no table of contents. */
  readonly compacto = input(false);

  protected readonly fecha = formatoFecha;
  protected readonly pendientes = computed(() => {
    const t = this.texto();
    return contarPorDefinir([t.resumen, ...t.secciones.flatMap((s) => [...(s.parrafos ?? []), ...(s.items ?? []), ...(s.cierre ?? [])])]);
  });

  protected partes(parrafo: string) {
    return trozos(parrafo, this.empresa.nombre());
  }
}
