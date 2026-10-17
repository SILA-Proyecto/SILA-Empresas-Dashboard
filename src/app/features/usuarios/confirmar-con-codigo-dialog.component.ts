import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { CampoCodigoMfaComponent } from '../auth/campo-codigo-mfa.component';

/**
 * Confirmation of a sensitive action on ANOTHER person's account: besides reading what will happen, the ADMIN types the
 * second-factor code. The parent makes the call and keeps the dialog open if it fails, so the code can be typed again.
 * The code is never kept: each opening starts empty and the parent clears it after a failure.
 */
@Component({
  selector: 'app-confirmar-con-codigo-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoCodigoMfaComponent, DialogComponent, ReactiveFormsModule],
  template: `
    <app-dialog [open]="abierto()" [title]="titulo()" [cerrable]="!ocupado()" (closed)="cancelar.emit()">
      <p class="text-sm">{{ mensaje() }}</p>
      <form id="confirmar-codigo-form" class="mt-4" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <app-campo-codigo-mfa [control]="form.controls.codigo" [error]="errorCodigo()" />
        <p class="mt-1 text-xs text-muted-foreground">Cada código sirve una sola vez: si falla, espera al siguiente.</p>
      </form>

      @if (error(); as mensajeError) {
        <p class="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm" role="alert">{{ mensajeError }}</p>
      }

      <div dialogFooter class="flex gap-2">
        <button type="button" class="sila-btn sila-btn-outline" [disabled]="ocupado()" (click)="cancelar.emit()">Cancelar</button>
        <button
          type="submit"
          form="confirmar-codigo-form"
          class="sila-btn"
          [class.sila-btn-primary]="!peligro()"
          [class.bg-destructive]="peligro()"
          [class.text-white]="peligro()"
          [disabled]="ocupado()"
          [attr.aria-busy]="ocupado()"
        >
          {{ ocupado() ? 'Procesando…' : textoConfirmar() }}
        </button>
      </div>
    </app-dialog>
  `,
})
export class ConfirmarConCodigoDialogComponent {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly textoConfirmar = input('Confirmar');
  readonly peligro = input(false);
  readonly ocupado = input(false);
  /** A failure that is not about the code (locked account, too many tries, a rule of the base). */
  readonly error = input<string | null>(null);
  /** A failure about the code itself (wrong, already used). */
  readonly errorCodigo = input<string | null>(null);

  readonly confirmar = output<string>();
  readonly cancelar = output<void>();

  // The validators are set by `app-campo-codigo-mfa`; without the field the control is never validated.
  protected readonly form = inject(NonNullableFormBuilder).group({ codigo: [''] });

  constructor() {
    effect(() => {
      if (this.abierto()) this.form.reset();
    });
  }

  protected enviar(): void {
    if (this.ocupado()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.confirmar.emit(this.form.controls.codigo.value.trim());
  }

  /** The parent calls this after the code was used or refused. */
  limpiarCodigo(): void {
    this.form.controls.codigo.reset('');
  }
}
