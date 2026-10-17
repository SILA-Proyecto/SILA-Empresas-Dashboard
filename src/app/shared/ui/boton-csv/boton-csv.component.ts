import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { ApiErrorService } from '../../../core/api/api-error';
import type { Page } from '../../../core/api/page.models';
import { guardarBlob } from '../../utils/guardar-archivo';
import { ColumnaCsv, construirCsv } from '../../utils/csv';
import { formatoNumero } from '../../utils/formato-co';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from '../toast/toast.service';

/**
 * «Descargar para Excel»: asks for every row that matches the filters on screen (not just the page shown) and saves them
 * as a CSV. The parent gives `cargar`, which already carries the current filters.
 */
@Component({
  selector: 'app-boton-csv',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button type="button" class="sila-btn sila-btn-outline shrink-0" [disabled]="descargando()" [attr.aria-busy]="descargando()" (click)="descargar()">
      <app-icon name="lucideDownload" class="size-4" aria-hidden="true" />
      {{ descargando() ? 'Preparando…' : 'Descargar para Excel' }}
    </button>
  `,
})
export class BotonCsvComponent<T> {
  private readonly toast = inject(ToastService);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);

  /** File name without extension: `<nombre>_<AAAA-MM-DD>.csv`. */
  readonly nombre = input.required<string>();
  readonly columnas = input.required<readonly ColumnaCsv<T>[]>();
  readonly cargar = input.required<() => Observable<Page<T>>>();

  protected readonly descargando = signal(false);

  protected descargar(): void {
    if (this.descargando()) return;
    this.descargando.set(true);
    this.cargar()()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.descargando.set(false);
          const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
          guardarBlob(new Blob([construirCsv(this.columnas(), pagina.items)], { type: 'text/csv;charset=utf-8' }), `${this.nombre()}_${hoy}.csv`);
          this.toast.exito(
            pagina.items.length < pagina.total
              ? `Se descargaron las primeras ${formatoNumero(pagina.items.length)} de ${formatoNumero(pagina.total)} filas. Filtra para bajar el resto.`
              : `Archivo listo: ${formatoNumero(pagina.items.length)} ${pagina.items.length === 1 ? 'fila' : 'filas'}.`,
          );
        },
        error: (error) => {
          this.descargando.set(false);
          this.toast.error(this.errores.describe(error).mensaje);
        },
      });
  }
}
