import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FotosService } from '../../services/fotos.service';
import { iniciales } from '../../utils/formato-co';

/** Hues for the initials, picked from the name so a person always gets the same color. */
const TONOS = [255, 160, 300, 15, 80, 200, 340, 120];

/** Color of the initials of a name (same name → same color). */
export function tonoDeNombre(nombre: string): number {
  let suma = 0;
  for (const letra of nombre) suma = (suma * 31 + letra.charCodeAt(0)) >>> 0;
  return TONOS[suma % TONOS.length];
}

/**
 * A person's profile photo, or their initials on a color taken from the name.
 * With `fotoVersion` null nothing is asked for; with a version the photo comes through `FotosService` (it needs the token),
 * shown from a `blob:` URL that is freed when the version changes or the avatar goes away (the effect's cleanup runs on
 * destroy too). If it fails: the initials.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0' },
  template: `
    @if (url(); as src) {
      <img class="rounded-full object-cover" [class]="clasesTamano()" [src]="src" [alt]="decorativo() ? '' : alt()" data-testid="avatar-foto" (error)="url.set(null)" />
    } @else {
      <span
        class="grid place-items-center rounded-full font-bold text-white"
        [class]="clasesTamano()"
        [style.background-color]="'oklch(55% 0.13 ' + tono() + ')'"
        [attr.role]="decorativo() ? null : 'img'"
        [attr.aria-label]="decorativo() ? null : alt()"
        [attr.aria-hidden]="decorativo() ? 'true' : null"
        data-testid="avatar-iniciales"
      >{{ letras() }}</span>
    }
  `,
})
export class AvatarComponent {
  private readonly fotos = inject(FotosService);

  readonly idUsuario = input.required<number>();
  readonly nombre = input.required<string>();
  readonly fotoVersion = input<string | null | undefined>(null);
  /** `xs` 28 px, `sm` 32 px, `md` 40 px, `lg` 96 px. */
  readonly tamano = input<'xs' | 'sm' | 'md' | 'lg'>('sm');
  /** Next to the person's name the avatar adds nothing for a screen reader. */
  readonly decorativo = input(false);

  protected readonly url = signal<string | null>(null);
  protected readonly letras = computed(() => iniciales(this.nombre()) || '?');
  protected readonly tono = computed(() => tonoDeNombre(this.nombre()));
  protected readonly alt = computed(() => `Foto de ${this.nombre()}`);
  protected readonly clasesTamano = computed(
    () => ({ xs: 'size-7 text-[10px]', sm: 'size-8 text-[11px]', md: 'size-10 text-sm', lg: 'size-24 text-2xl' })[this.tamano()],
  );

  constructor() {
    effect((onCleanup) => {
      const id = this.idUsuario();
      const version = this.fotoVersion();
      let vigente = true;
      let creada: string | null = null;
      onCleanup(() => {
        vigente = false;
        if (creada) URL.revokeObjectURL(creada);
        this.url.set(null);
      });
      if (!version) return;
      void this.fotos.imagen(id, version).then((blob) => {
        if (!vigente || !blob) return;
        creada = URL.createObjectURL(blob);
        this.url.set(creada);
      });
    });
  }
}
