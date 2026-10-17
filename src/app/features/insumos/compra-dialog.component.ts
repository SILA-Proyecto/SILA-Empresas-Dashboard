import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { ClaveIdempotente } from '../../core/api/idempotencia';
import { AuthService } from '../../core/services/auth.service';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { OpcionSelector, SelectorBuscableComponent } from '../../shared/ui/selector-buscable/selector-buscable.component';
import { aplicarCamposDelServidor } from '../../shared/utils/errores-formulario';
import { mensajeDeFallo } from '../../shared/utils/errores-api';
import { hoyColombia } from '../../shared/utils/fecha-co';
import { formatoCop, formatoNumero } from '../../shared/utils/formato-co';
import { SilaValidators } from '../../shared/validators/sila-validators';
import { ACOPIO_REPOSITORY } from '../acopio/data/acopio.provider';
import { CUENTAS_PROVEEDORES_REPOSITORY } from '../cuentas-proveedores/data/cuentas-proveedores.provider';
import { INSUMOS_REPOSITORY } from './data/insumos.provider';
import type { Compra, Insumo, NuevaCompra } from './models/insumos.models';

function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  return valor && valor > hoyColombia() ? { servidor: 'La fecha no puede ser futura.' } : null;
}

function mayorQueCero(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') return null;
  return Number(v) > 0 ? null : { mayorQueCero: true };
}

/**
 * Registra una compra de materia prima (incluida la leche).
 * La leche la puede registrar OPERATIVO o ADMIN y exige temperatura, acidez y proveedor.
 * Si supera umbrales se guarda como RECHAZADO (201).
 * Las demás materias primas son solo ADMIN y no llevan temperatura ni acidez.
 */
@Component({
  selector: 'app-compra-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, FormFieldComponent, ReactiveFormsModule, SelectorBuscableComponent],
  template: `
    <app-dialog [open]="abierto()" [title]="esLeche() ? 'Registrar compra de leche' : 'Registrar compra de materia prima'" description="Suma al stock y recalcula el costo promedio. Solo compras aprobadas suman a inventario y cuentas." [wide]="true" [cerrable]="!guardando()" (closed)="cerrar.emit()">
      <form id="compra-form" [formGroup]="form" (ngSubmit)="guardar()" novalidate class="space-y-4">
        @if (errorGeneral(); as mensaje) {
          <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" data-testid="error-compra">{{ mensaje }}</p>
        }

        @if (!esAdmin() && !esLeche() && seleccionado()) {
          <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium">
            Solo un administrador puede registrar compras de materias primas distintas a la leche.
          </p>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Materia prima -->
          <div class="space-y-1.5">
            <label for="compra-insumo" class="text-sm font-medium">Materia prima <span class="text-destructive" aria-hidden="true">*</span></label>
            <app-selector-buscable idCampo="compra-insumo" [opciones]="opcionesInsumo()" [(valor)]="insumo" [etiquetaVacia]="null" placeholder="Buscar materia prima…" [invalido]="!!errorInsumo()" />
            <p class="text-xs font-medium text-destructive" aria-live="polite">{{ errorInsumo() }}</p>
          </div>

          <!-- Proveedor -->
          <div class="space-y-1.5">
            <label for="compra-proveedor" class="text-sm font-medium">
              Proveedor {{ esLeche() ? '(obligatorio)' : '(opcional)' }}
              @if (esLeche()) { <span class="text-destructive" aria-hidden="true">*</span> }
            </label>
            <app-selector-buscable idCampo="compra-proveedor" [opciones]="proveedores()" [(valor)]="proveedor" [etiquetaVacia]="esLeche() ? null : 'Sin proveedor (compra en almacén/mostrador)'" placeholder="Buscar proveedor…" [invalido]="!!errorProveedor()" />
            <p class="text-xs text-muted-foreground">{{ esLeche() ? 'La entrega de leche exige un proveedor registrado.' : 'Si no hay proveedor registrado, escribe abajo dónde se compró.' }}</p>
            @if (errorProveedor(); as ep) {
              <p class="text-xs font-medium text-destructive" aria-live="polite">{{ ep }}</p>
            }
          </div>

          <!-- Comprado en (cuando no hay proveedor) -->
          @if (!proveedor() && !esLeche()) {
            <app-form-field class="sm:col-span-2" etiqueta="Comprado en" ayuda="Nombre del establecimiento o lugar de compra (máx. 100 caracteres)." [obligatorio]="true">
              <input class="sila-input" formControlName="comprado_en" maxlength="100" placeholder="Ej. Plaza de mercado, Distribuidora Central…" />
            </app-form-field>
          }

          <!-- Campos exclusivos de calidad para leche -->
          @if (esLeche()) {
            <div class="sm:col-span-2 rounded-lg border border-border/80 bg-muted/40 p-3 space-y-3">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Control de calidad de la leche</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <app-form-field etiqueta="Temperatura (°C)" [ayuda]="umbrales.hasValue() ? 'Máximo aceptado: ' + umbrales.value().temperatura_max + ' °C.' : 'Temperatura en °C.'" [obligatorio]="true">
                  <input class="sila-input" type="number" inputmode="decimal" step="0.1" formControlName="temperatura" placeholder="Ej. 6.5" />
                </app-form-field>
                <app-form-field etiqueta="Acidez (°Dornic)" [ayuda]="umbrales.hasValue() ? 'Máximo aceptado: ' + umbrales.value().acidez_max + ' °D.' : 'Acidez en grados Dornic.'" [obligatorio]="true">
                  <input class="sila-input" type="number" inputmode="decimal" step="0.1" formControlName="acidez" placeholder="Ej. 16" />
                </app-form-field>
              </div>

              @if (temperaturaSuperada() || acidezSuperada()) {
                <div class="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200" role="alert">
                  <strong>Aviso de control de calidad:</strong>
                  Supera los umbrales máximos establecidos
                  @if (umbrales.value(); as u) {
                    (Temp: máx {{ u.temperatura_max }} °C, Acidez: máx {{ u.acidez_max }} °D).
                  }
                  La entrega <strong>se guardará como RECHAZADA</strong>: no entra al inventario ni suma a la cuenta del proveedor.
                </div>
              }
            </div>
          }

          <!-- Cantidad -->
          <app-form-field [etiqueta]="'Cantidad' + (seleccionado() ? ' (' + seleccionado()!.unidad_medida + ')' : '')" ayuda="Cantidad entregada o comprada." [obligatorio]="true">
            <input class="sila-input" type="number" inputmode="decimal" min="0" step="any" formControlName="cantidad" />
          </app-form-field>

          <!-- Valor total de la factura (opcional) -->
          <app-form-field etiqueta="Valor total (COP)" [ayuda]="ayudaValorTotal()">
            <input class="sila-input" type="number" inputmode="decimal" min="0" step="0.01" formControlName="valor_total" placeholder="Dejar vacío para usar precio pactado" />
          </app-form-field>

          <!-- Modalidad de pago: Contado vs Crédito -->
          <div class="sm:col-span-2 flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <label for="compra-contado" class="text-sm font-medium">Pagada al comprar (contado)</label>
              <p class="text-xs text-muted-foreground">Si es de contado no se suma a lo que se le debe al proveedor en la quincena.</p>
            </div>
            <input id="compra-contado" type="checkbox" class="size-5 rounded border-input text-primary focus:ring-primary" formControlName="contado" />
          </div>

          <!-- Referencia -->
          <app-form-field etiqueta="Referencia (opcional)" ayuda="Número de factura, comprobante o remisión.">
            <input class="sila-input" type="text" maxlength="60" formControlName="referencia" />
          </app-form-field>

          <!-- Fecha -->
          <app-form-field etiqueta="Fecha de la compra" ayuda="Hoy en hora de Colombia o anterior dentro de la quincena." [obligatorio]="true">
            <input class="sila-input" type="date" [max]="hoy()" formControlName="fecha" />
          </app-form-field>
        </div>

        <!-- Resumen de costos estimados -->
        <p class="rounded-md bg-muted px-4 py-3 text-sm" aria-live="polite" data-testid="costo-unitario">
          Costo unitario:
          <strong>{{ costoUnitario() === null ? '—' : cop(costoUnitario()!) + (seleccionado() ? ' por ' + seleccionado()!.unidad_medida : '') }}</strong>
          @if (precioPactado(); as pp) {
            <span class="block text-xs text-primary font-medium">Precio pactado vigente con el proveedor: {{ cop(pp) }} / {{ seleccionado()?.unidad_medida }}.</span>
          }
          @if (seleccionado(); as s) {
            <span class="block text-xs text-muted-foreground">Costo promedio en stock: {{ cop(s.costo_promedio) }} · Stock actual: {{ numero(s.stock_actual) }} {{ s.unidad_medida }}.</span>
          }
        </p>
      </form>
      <div dialogFooter class="flex gap-2">
        <button type="button" class="sila-btn sila-btn-outline" [disabled]="guardando()" (click)="cerrar.emit()">Cancelar</button>
        <button type="submit" form="compra-form" class="sila-btn sila-btn-primary" [disabled]="guardando() || (!esAdmin() && !esLeche())" [attr.aria-busy]="guardando()">
          {{ guardando() ? 'Registrando…' : (esLeche() ? 'Registrar compra de leche' : 'Registrar compra') }}
        </button>
      </div>
    </app-dialog>
  `,
})
export class CompraDialogComponent {
  private readonly repo = inject(INSUMOS_REPOSITORY);
  private readonly acopioRepo = inject(ACOPIO_REPOSITORY);
  private readonly cuentasRepo = inject(CUENTAS_PROVEEDORES_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly errores = inject(ApiErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly abierto = input(false);
  readonly insumos = input.required<readonly Insumo[]>();
  readonly proveedores = input<readonly OpcionSelector[]>([]);
  readonly insumoInicial = input<number | null>(null);

  readonly registrada = output<Compra>();
  readonly cerrar = output<void>();

  protected readonly cop = formatoCop;
  protected readonly numero = formatoNumero;
  protected readonly hoy = signal(hoyColombia());
  protected readonly guardando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly insumo = signal<number | null>(null);
  protected readonly proveedor = signal<number | null>(null);
  private readonly insumoTocado = signal(false);
  private readonly clave = new ClaveIdempotente();

  protected readonly esAdmin = computed(() => this.auth.sesion()?.rol === 'ADMIN');
  protected readonly opcionesInsumo = computed<OpcionSelector[]>(() =>
    this.insumos().map((i) => ({ valor: i.id_insumo, etiqueta: `${i.nombre} (${i.codigo})` })),
  );
  protected readonly seleccionado = computed(() => this.insumos().find((i) => i.id_insumo === this.insumo()) ?? null);
  protected readonly esLeche = computed(() => !!(this.seleccionado()?.requiere_calidad || this.seleccionado()?.codigo === 'LECHE'));
  protected readonly errorInsumo = computed(() => (this.insumoTocado() && this.insumo() === null ? 'Elige la materia prima.' : null));
  protected readonly errorProveedor = computed(() => (this.insumoTocado() && this.esLeche() && this.proveedor() === null ? 'El proveedor es obligatorio para la leche.' : null));

  /** Umbrales de calidad para la leche */
  protected readonly umbrales = rxResource({ stream: () => this.acopioRepo.umbrales() });

  /** Consulta de precio pactado vigente para la combinación proveedor + insumo */
  private readonly precioPactadoRecurso = rxResource({
    params: () => {
      const prov = this.proveedor();
      const ins = this.insumo();
      return prov && ins ? { id_proveedor: prov, id_insumo: ins } : undefined;
    },
    stream: ({ params }) =>
      this.cuentasRepo.listarPrecios({ ...params, solo_vigentes: true, page: 0, size: 1 }).pipe(
        map((p) => p.items[0]?.precio_unitario ?? null),
        catchError(() => of<number | null>(null)),
      ),
  });
  protected readonly precioPactado = computed<number | null>(() => this.precioPactadoRecurso.value() ?? null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    cantidad: [null as number | null, [SilaValidators.requerido, mayorQueCero]],
    valor_total: [null as number | null, [SilaValidators.montoPositivo]],
    referencia: [''],
    fecha: [hoyColombia(), [SilaValidators.requerido, fechaNoFutura]],
    contado: [false],
    comprado_en: [''],
    temperatura: [null as number | null],
    acidez: [null as number | null],
  });
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly temperaturaSuperada = computed(() => {
    const t = this.valores().temperatura;
    const u = this.umbrales.value();
    return this.esLeche() && t != null && u != null && Number(t) > u.temperatura_max;
  });

  protected readonly acidezSuperada = computed(() => {
    const a = this.valores().acidez;
    const u = this.umbrales.value();
    return this.esLeche() && a != null && u != null && Number(a) > u.acidez_max;
  });

  protected readonly ayudaValorTotal = computed(() => {
    if (this.precioPactado() !== null) {
      return `Precio pactado: ${formatoCop(this.precioPactado()!)}. Opcional: si falta se usa el precio pactado.`;
    }
    if (this.esLeche()) {
      return 'Opcional: si falta se usa el precio pactado o el valor por defecto del sistema.';
    }
    return 'Total de la factura. Si falta se usa el precio pactado vigente (si no hay, indique el valor).';
  });

  protected readonly costoUnitario = computed<number | null>(() => {
    const v = this.valores();
    const cantidad = Number(v.cantidad);
    const total = v.valor_total != null && v.valor_total !== ('' as unknown as number) ? Number(v.valor_total) : null;
    if (cantidad > 0 && total != null && total > 0) {
      return Math.round((total / cantidad) * 100) / 100;
    }
    if (this.precioPactado() !== null) {
      return this.precioPactado();
    }
    return null;
  });

  constructor() {
    effect(() => {
      if (this.abierto()) {
        this.hoy.set(hoyColombia());
        this.form.reset({
          cantidad: null,
          valor_total: null,
          referencia: '',
          fecha: hoyColombia(),
          contado: false,
          comprado_en: '',
          temperatura: null,
          acidez: null,
        });
        this.insumo.set(this.insumoInicial());
        this.proveedor.set(null);
        this.aplicarContado(false);
        this.insumoTocado.set(false);
        this.errorGeneral.set(null);
        this.guardando.set(false);
        this.clave.descartar();
      }
    });

    // Control de contado según proveedor
    effect(() => this.aplicarContado(this.proveedor() !== null));
  }

  /** Without a supplier the purchase is always cash (the control is locked on); with one it starts as credit. */
  private aplicarContado(tieneProveedor: boolean): void {
    const control = this.form.controls.contado;
    control.setValue(!tieneProveedor);
    if (tieneProveedor) control.enable();
    else control.disable();
  }

  protected guardar(): void {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    this.insumoTocado.set(true);

    const insumo = this.insumo();
    if (insumo === null) {
      this.enfocarError();
      return;
    }

    const esLeche = this.esLeche();
    const proveedor = this.proveedor();

    // Validaciones específicas para leche
    if (esLeche) {
      if (proveedor === null) {
        this.enfocarError();
        return;
      }
      const vTemp = this.form.controls.temperatura.value;
      const vAcid = this.form.controls.acidez.value;
      if (vTemp === null || vTemp === ('' as unknown as number) || vAcid === null || vAcid === ('' as unknown as number)) {
        this.errorGeneral.set('Para la leche, la temperatura y la acidez son obligatorias.');
        this.enfocarError();
        return;
      }
    }

    // Role check: OPERATIVO solo leche
    if (!this.esAdmin() && !esLeche) {
      this.errorGeneral.set('Solo un administrador puede registrar compras de materias primas distintas a la leche.');
      return;
    }

    if (this.form.invalid) {
      this.enfocarError();
      return;
    }

    const v = this.form.getRawValue();
    const referencia = v.referencia.trim();
    const compradoEn = v.comprado_en.trim();
    const valorTotal = v.valor_total != null && v.valor_total !== ('' as unknown as number) && Number(v.valor_total) > 0 ? Number(v.valor_total) : undefined;

    const cuerpo: NuevaCompra = {
      id_insumo: insumo,
      cantidad: Number(v.cantidad),
      fecha: v.fecha,
      contado: v.contado,
      ...(proveedor !== null ? { id_proveedor: proveedor } : {}),
      ...(proveedor === null && compradoEn ? { comprado_en: compradoEn } : {}),
      ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}),
      ...(referencia ? { referencia } : {}),
      ...(esLeche ? { temperatura: Number(v.temperatura), acidez: Number(v.acidez) } : {}),
    };

    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.repo
      .crearCompra(cuerpo, this.clave.para(cuerpo))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (compra) => {
          this.guardando.set(false);
          this.clave.exito();
          this.registrada.emit(compra);
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

  private enfocarError(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
}
