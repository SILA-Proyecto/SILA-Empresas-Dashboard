import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { ClaveIdempotente } from '../../core/api/idempotencia';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { OpcionSelector, SelectorBuscableComponent } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { aplicarCamposDelServidor } from '../../shared/utils/errores-formulario';
import { mensajeDeFallo } from '../../shared/utils/errores-api';
import { hoyColombia } from '../../shared/utils/fecha-co';
import { formatoCop, formatoFecha } from '../../shared/utils/formato-co';
import { SilaValidators } from '../../shared/validators/sila-validators';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import type { FijarPrecioProveedor, PrecioProveedor } from './models/cuentas-proveedores.models';

function precioValido(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return n >= 0.0001 && n <= 100_000_000 ? null : { servidor: 'Debe estar entre 0,0001 y 100.000.000.' };
}

@Component({
  selector: 'app-precio-proveedor-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, FormFieldComponent, ReactiveFormsModule, SelectorBuscableComponent],
  template: `
    <app-dialog [open]="abierto()" [title]="cambio() ? 'Cambiar precio con proveedor' : 'Fijar precio con proveedor'" [cerrable]="!guardando()" (closed)="cerrar.emit()">
      <form id="precio-proveedor-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4">
        <p class="rounded-md bg-warning/15 px-3 py-2 text-sm" data-testid="aviso-precio">
          Solo rige hacia adelante; es una referencia, cada compra puede traer su propio valor.
        </p>
        @if (errorGeneral(); as mensaje) {
          <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" data-testid="error-precio">{{ mensaje }}</p>
        }
        @if (cambio(); as actual) {
          <dl class="grid gap-3 rounded-md bg-muted px-3 py-2 text-sm sm:grid-cols-2" data-testid="precio-actual">
            <div>
              <dt class="text-xs text-muted-foreground">Proveedor</dt>
              <dd class="font-medium">{{ actual.proveedor }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Materia prima</dt>
              <dd class="font-medium">{{ actual.insumo }} ({{ actual.codigo }})</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted-foreground">Precio actual</dt>
              <dd class="font-medium tabular-nums">{{ cop(actual.precio_unitario) }} / {{ actual.unidad_medida }} · rige desde {{ fecha(actual.vigente_desde) }}</dd>
            </div>
          </dl>
        } @else {
          <div class="space-y-1.5">
            <label for="precio-proveedor" class="text-sm font-medium">Proveedor <span class="text-destructive" aria-hidden="true">*</span></label>
            <app-selector-buscable idCampo="precio-proveedor" [opciones]="proveedores()" [(valor)]="proveedor" [etiquetaVacia]="null" placeholder="Buscar proveedor…" [invalido]="!!errorProveedor()" />
            <p class="text-xs font-medium text-destructive" aria-live="polite">{{ errorProveedor() }}</p>
          </div>
          <div class="space-y-1.5">
            <label for="precio-insumo" class="text-sm font-medium">Materia prima <span class="text-destructive" aria-hidden="true">*</span></label>
            <app-selector-buscable idCampo="precio-insumo" [opciones]="materiasPrimas()" [(valor)]="materiaPrima" [etiquetaVacia]="null" placeholder="Buscar materia prima…" [invalido]="!!errorMateriaPrima()" />
            <p class="text-xs font-medium text-destructive" aria-live="polite">{{ errorMateriaPrima() }}</p>
          </div>
        }
        <app-form-field [etiqueta]="cambio() ? 'Precio nuevo (COP)' : 'Precio unitario pactado (COP)'" ayuda="Valor de referencia por unidad de medida." [obligatorio]="true">
          <input class="sila-input" type="number" inputmode="decimal" min="0" step="0.01" formControlName="precio" />
        </app-form-field>
        <app-form-field etiqueta="Rige desde" ayuda="Por defecto, hoy." [obligatorio]="true">
          <input class="sila-input" type="date" formControlName="desde" />
        </app-form-field>
      </form>
      <div dialogFooter class="flex gap-2">
        <button type="button" class="sila-btn sila-btn-outline" [disabled]="guardando()" (click)="cerrar.emit()">Cancelar</button>
        <button type="submit" form="precio-proveedor-form" class="sila-btn sila-btn-primary" [disabled]="guardando()" [attr.aria-busy]="guardando()">{{ guardando() ? 'Guardando…' : cambio() ? 'Guardar precio nuevo' : 'Fijar precio' }}</button>
      </div>
    </app-dialog>
  `,
})
export class PrecioProveedorDialogComponent {
  private readonly repo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly abierto = input(false);
  readonly proveedores = input.required<readonly OpcionSelector[]>();
  readonly materiasPrimas = input.required<readonly OpcionSelector[]>();
  readonly proveedorInicial = input<number | null>(null);
  readonly materiaPrimaInicial = input<number | null>(null);
  /** Vigente price being replaced: proveedor and materia prima stay fixed and the form shows what it is today. */
  readonly cambio = input<PrecioProveedor | null>(null);

  readonly guardado = output<PrecioProveedor>();
  readonly cerrar = output<void>();

  protected readonly guardando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly proveedor = signal<number | null>(null);
  protected readonly materiaPrima = signal<number | null>(null);
  protected readonly cop = formatoCop;
  protected readonly fecha = formatoFecha;
  private readonly tocado = signal(false);
  private readonly clave = new ClaveIdempotente();

  protected readonly errorProveedor = () => (this.tocado() && this.proveedor() === null ? 'Elige el proveedor.' : null);
  protected readonly errorMateriaPrima = () => (this.tocado() && this.materiaPrima() === null ? 'Elige la materia prima.' : null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    precio: [null as number | null, [SilaValidators.requerido, precioValido]],
    desde: [hoyColombia(), [SilaValidators.requerido]],
  });

  constructor() {
    effect(() => {
      if (this.abierto()) {
        const actual = this.cambio();
        this.form.reset({ precio: actual?.precio_unitario ?? null, desde: hoyColombia() });
        this.proveedor.set(actual?.id_proveedor ?? this.proveedorInicial());
        this.materiaPrima.set(actual?.id_insumo ?? this.materiaPrimaInicial());
        this.tocado.set(false);
        this.errorGeneral.set(null);
        this.guardando.set(false);
        this.clave.descartar();
      }
    });
  }

  protected guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    this.tocado.set(true);

    const idProv = this.proveedor();
    const idIns = this.materiaPrima();
    if (this.form.invalid || idProv === null || idIns === null) {
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const v = this.form.getRawValue();
    const datos: FijarPrecioProveedor = {
      id_proveedor: idProv,
      id_insumo: idIns,
      precio_unitario: Number(v.precio),
      vigente_desde: v.desde,
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.repo
      .fijarPrecio(datos, this.clave.para(datos))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (precio) => {
          this.guardando.set(false);
          this.clave.exito();
          this.guardado.emit(precio);
        },
        error: (fallo: unknown) => {
          this.guardando.set(false);
          this.clave.fallo(fallo);
          const error = causaDe(fallo);
          if (isApiError(error) && error.code === 20017) this.clave.descartar();
          if (isApiError(error) && error.code === 20001) {
            const resto = aplicarCamposDelServidor(this.form, error.fields);
            this.errorGeneral.set(resto.length > 0 ? `${error.message} ${resto.join('; ')}` : 'Hay datos inválidos. Revisa los campos marcados.');
            return;
          }
          this.errorGeneral.set(mensajeDeFallo(this.errores, fallo, [20004, 20006, 20007, 20008]));
        },
      });
  }
}
