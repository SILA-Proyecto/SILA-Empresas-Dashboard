import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiErrorService } from '../../core/api/api-error';
import { AuthService } from '../../core/services/auth.service';
import { FotosService } from '../../shared/services/fotos.service';
import { AvisoLegalComponent } from '../../shared/ui/aviso-legal/aviso-legal.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ACEPTA_IMAGEN, revisarImagen } from '../../shared/utils/imagen';

/** «Mi cuenta» → my profile photo: see it, upload or change it (with a preview) and remove it. No second-factor code. */
@Component({
  selector: 'app-foto-perfil-seccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, AvisoLegalComponent, ConfirmDialogComponent, IconComponent],
  template: `
    @if (sesion(); as s) {
      <section class="sila-card min-w-0 p-5" aria-labelledby="cuenta-foto">
        <h2 id="cuenta-foto" class="mb-1 text-base font-semibold">Foto de perfil</h2>
        <p class="mb-4 text-sm text-muted-foreground">PNG o JPG de hasta 5 MB. Se recorta al cuadrado del centro y se ve redonda.</p>
        <app-aviso-legal class="mb-4" ruta="/legal/politica-privacidad" enlace="Política de privacidad" data-testid="aviso-foto">
          Subir una foto es voluntario. Se ve en tu perfil, en el menú y en las pantallas de usuarios, y un administrador puede quitarla.
        </app-aviso-legal>

        <div class="flex flex-wrap items-center gap-5">
          @if (vistaPrevia(); as url) {
            <img class="size-24 shrink-0 rounded-full object-cover ring-2 ring-primary" [src]="url" alt="Vista previa de tu foto nueva" data-testid="foto-previa" />
          } @else {
            <app-avatar [idUsuario]="s.id_usuario" [nombre]="s.nombre" [fotoVersion]="s.foto_version" tamano="lg" />
          }

          <div class="flex min-w-0 flex-1 flex-wrap gap-2">
            @if (archivo()) {
              <button type="button" class="sila-btn sila-btn-outline" [disabled]="ocupado()" (click)="descartar()">Cancelar</button>
              <button type="button" class="sila-btn sila-btn-primary" [disabled]="ocupado()" [attr.aria-busy]="ocupado()" data-testid="foto-guardar" (click)="guardar()">
                {{ ocupado() ? 'Guardando…' : 'Guardar foto' }}
              </button>
            } @else {
              <label class="sila-btn sila-btn-outline cursor-pointer focus-within:outline-2 focus-within:outline-ring">
                <app-icon name="lucideUpload" class="size-4" aria-hidden="true" />
                {{ s.foto_version ? 'Cambiar foto' : 'Subir foto' }}
                <input type="file" class="sr-only" [accept]="aceptaImagen" data-testid="foto-archivo" (change)="elegir($event)" />
              </label>
              @if (s.foto_version) {
                <button type="button" class="sila-btn sila-btn-outline text-destructive" data-testid="foto-quitar" (click)="confirmandoQuitar.set(true)">
                  <app-icon name="lucideTrash2" class="size-4" aria-hidden="true" />
                  Quitar foto
                </button>
              }
            }
          </div>
        </div>

        @if (error(); as mensaje) {
          <p class="mt-3 rounded-md bg-destructive/15 px-3 py-2 text-sm" role="alert" data-testid="foto-error">{{ mensaje }}</p>
        }
      </section>

      <app-confirm-dialog
        [open]="confirmandoQuitar()"
        titulo="Quitar tu foto"
        mensaje="Se mostrarán tus iniciales en lugar de la foto."
        textoConfirmar="Quitar foto"
        [peligro]="true"
        [ocupado]="ocupado()"
        (confirmar)="quitar()"
        (cancelar)="confirmandoQuitar.set(false)"
      />
    }
  `,
})
export class FotoPerfilSeccionComponent {
  private readonly auth = inject(AuthService);
  private readonly fotos = inject(FotosService);
  private readonly errores = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sesion = computed(() => this.auth.sesion());
  protected readonly aceptaImagen = ACEPTA_IMAGEN;
  protected readonly archivo = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmandoQuitar = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.soltarVistaPrevia());
  }

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const elegido = entrada.files?.[0];
    entrada.value = '';
    if (!elegido) return;
    const problema = revisarImagen(elegido);
    this.error.set(problema);
    if (problema) return;
    this.soltarVistaPrevia();
    this.archivo.set(elegido);
    this.vistaPrevia.set(URL.createObjectURL(elegido));
  }

  protected descartar(): void {
    this.soltarVistaPrevia();
    this.archivo.set(null);
  }

  protected guardar(): void {
    const elegido = this.archivo();
    if (!elegido || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set(null);
    this.fotos
      .subirMia(elegido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.descartar();
          this.toast.exito('Tu foto se actualizó.');
        },
        error: (fallo: unknown) => {
          this.ocupado.set(false);
          // 422 (not an image, antivirus) and 503 (antivirus down): the server's message as it is.
          this.error.set(this.errores.describe(fallo).mensaje);
        },
      });
  }

  protected quitar(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set(null);
    this.fotos
      .quitarMia()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.confirmandoQuitar.set(false);
          this.toast.exito('Se quitó tu foto.');
        },
        error: (fallo: unknown) => {
          this.ocupado.set(false);
          this.confirmandoQuitar.set(false);
          this.error.set(this.errores.describe(fallo).mensaje);
        },
      });
  }

  private soltarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
