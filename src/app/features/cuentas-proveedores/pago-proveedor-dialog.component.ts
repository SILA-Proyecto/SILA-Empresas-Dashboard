import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { ClaveIdempotente } from '../../core/api/idempotencia';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { aplicarCamposDelServidor } from '../../shared/utils/errores-formulario';
import { mensajeDeFallo } from '../../shared/utils/errores-api';
import { hoyColombia } from '../../shared/utils/fecha-co';
import { formatoCop } from '../../shared/utils/formato-co';
import { SilaValidators } from '../../shared/validators/sila-validators';
import { etiquetaQuincena } from '../periodos/periodos.format';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import type { MetodoPagoProveedor, NuevoPagoProveedor, PagoProveedor, ResumenProveedorQuincena } from './models/cuentas-proveedores.models';
import { todasLasPaginas } from '../../core/api/todas-las-paginas';

function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  return valor && valor > hoyColombia() ? { servidor: 'La fecha no puede ser futura.' } : null;
}

const METODOS: readonly { valor: MetodoPagoProveedor; etiqueta: string }[] = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
  { valor: 'CHEQUE', etiqueta: 'Cheque' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

@Component({
  selector: 'app-pago-proveedor-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, FormFieldComponent, ReactiveFormsModule],
  template: `
    <app-dialog [open]="proveedor() !== null" [title]="'Registrar pago' + (proveedor() ? ' · ' + proveedor()!.nombre : '')" [wide]="true" [cerrable]="!guardando()" (closed)="cerrado.emit()">
      <form id="pago-proveedor-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4">
        @if (errorGeneral(); as mensaje) {
          <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" data-testid="error-pago">{{ mensaje }}</p>
        }
        @if (quincenas.error()) {
          <p class="text-sm text-destructive" role="alert">No se pudieron cargar las quincenas del proveedor.</p>
        } @else if (conSaldo().length === 0 && quincenas.hasValue()) {
          <p class="rounded-md bg-muted px-3 py-2 text-sm" data-testid="sin-saldo">Este proveedor no tiene saldo pendiente en ninguna quincena a crédito.</p>
        }

        <app-form-field etiqueta="Quincena que se liquida" ayuda="Cada pago liquida compras a crédito de una quincena. Por defecto, la más antigua con saldo." [obligatorio]="true">
          <select class="sila-select" formControlName="periodo">
            @for (q of conSaldo(); track q.id_periodo) {
              <option [value]="q.id_periodo">{{ q.anio }} · {{ etiqueta(q) }} — saldo {{ cop(q.saldo) }}</option>
            }
          </select>
        </app-form-field>

        @if (seleccionada(); as q) {
          <dl class="grid grid-cols-3 gap-3 rounded-md bg-muted px-3 py-2 text-sm" data-testid="resumen-quincena">
            <div>
              <dt class="text-xs text-muted-foreground">Comprado a crédito</dt>
              <dd class="font-medium tabular-nums">{{ cop(q.valor_compras) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Ya pagado</dt>
              <dd class="font-medium tabular-nums">{{ cop(q.valor_pagado) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Falta por pagar</dt>
              <dd class="font-semibold tabular-nums">{{ cop(q.saldo) }}</dd>
            </div>
          </dl>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <app-form-field etiqueta="Monto a pagar (COP)" ayuda="Viene con todo lo que falta; bájalo si pagas solo una parte." [obligatorio]="true">
              <input class="sila-input" type="number" inputmode="decimal" min="0" step="0.01" formControlName="monto" />
            </app-form-field>
            @if (seleccionada(); as s) {
              <button type="button" class="mt-1 text-xs text-primary underline" (click)="pagarTodoElSaldo()">Pagar todo el saldo ({{ cop(s.saldo) }})</button>
            }
          </div>

          <app-form-field etiqueta="Medio de pago" [obligatorio]="true">
            <select class="sila-select" formControlName="metodo_pago">
              @for (m of metodos; track m.valor) {
                <option [value]="m.valor">{{ m.etiqueta }}</option>
              }
            </select>
          </app-form-field>

          <app-form-field etiqueta="Referencia del pago" ayuda="Número de transferencia, cheque o comprobante.">
            <input class="sila-input" maxlength="60" formControlName="referencia_pago" />
          </app-form-field>

          <app-form-field etiqueta="Fecha del pago" ayuda="Hoy en hora de Colombia, o una anterior." [obligatorio]="true">
            <input class="sila-input" type="date" [max]="hoy()" formControlName="fecha_pago" />
          </app-form-field>
        </div>
      </form>
      <div dialogFooter class="flex gap-2">
        <button type="button" class="sila-btn sila-btn-outline" [disabled]="guardando()" (click)="cerrado.emit()">Cancelar</button>
        <button type="submit" form="pago-proveedor-form" class="sila-btn sila-btn-primary" [disabled]="guardando() || conSaldo().length === 0" [attr.aria-busy]="guardando()">
          {{ guardando() ? 'Guardando…' : 'Registrar pago' }}
        </button>
      </div>
    </app-dialog>
  `,
})
export class PagoProveedorDialogComponent {
  private readonly repo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly proveedor = input<{ id_proveedor: number; nombre: string } | null>(null);
  /** Quincena que se abre elegida (p. ej. la de la pantalla desde la que se pulsó «Pagar»); si ya no tiene saldo se usa la más antigua. */
  readonly periodoInicial = input<number | null>(null);
  readonly registrado = output<PagoProveedor>();
  readonly cerrado = output<void>();

  protected readonly cop = formatoCop;
  protected readonly hoy = signal(hoyColombia());
  protected readonly metodos = METODOS;
  protected readonly guardando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  private readonly clave = new ClaveIdempotente();

  protected readonly quincenas = rxResource({
    params: () => this.proveedor()?.id_proveedor,
    stream: ({ params: idProveedor }) => todasLasPaginas((q) => this.repo.resumen({ id_proveedor: idProveedor, sort: 'id_periodo,asc', ...q })),
  });

  protected readonly conSaldo = computed<ResumenProveedorQuincena[]>(() => {
    const list = this.quincenas.value()?.items;
    return list ? list.filter((q) => q.saldo > 0) : [];
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    periodo: [null as number | null],
    monto: [null as number | null, [SilaValidators.requerido, SilaValidators.montoPositivo]],
    metodo_pago: ['TRANSFERENCIA' as MetodoPagoProveedor],
    referencia_pago: [''],
    fecha_pago: [hoyColombia(), [SilaValidators.requerido, fechaNoFutura]],
  });

  private readonly periodoElegido = toSignal(this.form.controls.periodo.valueChanges, { initialValue: null as number | null });

  protected readonly seleccionada = computed(() => {
    const id = this.periodoElegido();
    return this.conSaldo().find((q) => q.id_periodo === id) ?? null;
  });

  constructor() {
    effect(() => {
      const p = this.proveedor();
      if (!p) return;
      this.hoy.set(hoyColombia());
      this.form.reset({ periodo: null, monto: null, metodo_pago: 'TRANSFERENCIA', referencia_pago: '', fecha_pago: hoyColombia() });
      this.errorGeneral.set(null);
      this.guardando.set(false);
      this.clave.descartar();
    });

    // The amount starts as the whole balance only when the quincena changes, never when the list reloads under the user's edit.
    effect(() => {
      const id = this.periodoElegido();
      if (id === null) return;
      untracked(() => {
        const q = this.conSaldo().find((d) => d.id_periodo === id);
        if (q) this.form.controls.monto.setValue(q.saldo);
      });
    });

    effect(() => {
      const disponibles = this.conSaldo();
      if (disponibles.length === 0) return;
      const actual = this.form.controls.periodo.value;
      if (!actual || !disponibles.some((d) => d.id_periodo === actual)) {
        const preferida = disponibles.find((d) => d.id_periodo === this.periodoInicial());
        this.form.controls.periodo.setValue((preferida ?? disponibles[0]).id_periodo);
      }
    });
  }

  protected etiqueta(q: ResumenProveedorQuincena): string {
    return etiquetaQuincena(q.mes, q.quincena);
  }

  protected pagarTodoElSaldo(): void {
    const s = this.seleccionada();
    if (s) this.form.controls.monto.setValue(s.saldo);
  }

  protected guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    const s = this.seleccionada();
    if (!s) {
      this.errorGeneral.set('Elige la quincena a pagar.');
      return;
    }
    const monto = Number(this.form.controls.monto.value);
    if (monto > s.saldo) {
      this.form.controls.monto.setErrors({ servidor: `El monto no puede superar el saldo de la quincena (${formatoCop(s.saldo)}).` });
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (this.form.invalid) {
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const prov = this.proveedor()!;
    const v = this.form.getRawValue();
    const ref = v.referencia_pago.trim();
    const datos: NuevoPagoProveedor = {
      id_proveedor: prov.id_proveedor,
      id_periodo_liquidado: s.id_periodo,
      monto,
      metodo_pago: v.metodo_pago,
      fecha_pago: v.fecha_pago,
      ...(ref ? { referencia_pago: ref } : {}),
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.repo
      .registrarPago(datos, this.clave.para(datos))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pago) => {
          this.guardando.set(false);
          this.clave.exito();
          this.registrado.emit(pago);
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
          if (isApiError(error) && error.code === 20005) {
            this.form.controls.monto.setErrors({ servidor: error.message });
            setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
            return;
          }
          this.errorGeneral.set(mensajeDeFallo(this.errores, fallo, [20004, 20006, 20007, 20008]));
        },
      });
  }
}
