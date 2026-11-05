import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, type ValidationErrors, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { ApiErrorService, causaDe, isApiError } from '../../core/api/api-error';
import { LIMITES_EMPRESA, type EmpresaRespuesta } from '../../core/empresa/empresa.models';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ACEPTA_IMAGEN, revisarImagen } from '../../shared/utils/imagen';
import { limpiarTexto } from '../../shared/validators/sila-validators';
import { describirErrorSensible } from '../auth/errores-mfa';
import { ConfirmarConCodigoDialogComponent } from '../usuarios/confirmar-con-codigo-dialog.component';

/** Digits, spaces and `+ ( ) . # / -` (the backend's rule). */
const TELEFONO = /^[0-9 +().#/-]*$/;
const telefono = (c: AbstractControl): ValidationErrors | null => (TELEFONO.test(String(c.value ?? '')) ? null : { telefono: true });

type CampoEmpresa = 'direccion' | 'telefono' | 'ciudad' | 'correo_contacto' | 'pie_comprobante';
const CAMPOS: readonly CampoEmpresa[] = ['direccion', 'telefono', 'ciudad', 'correo_contacto', 'pie_comprobante'];

type Accion = 'datos' | 'logo' | 'quitar-logo';

/**
 * «Datos de la empresa» (ADMIN): name, short name and NIT read-only (only the owner of the system changes them);
 * contact data, receipt footer and logo editable. Each save asks for the second-factor code (app or backup code).
 */
@Component({
  selector: 'app-empresa-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmarConCodigoDialogComponent, FormFieldComponent, IconComponent, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './empresa-page.component.html',
})
export class EmpresaPageComponent {
  protected readonly servicio = inject(EmpresaService);
  private readonly errores = inject(ApiErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly empresa = this.servicio.empresa;
  protected readonly limites = LIMITES_EMPRESA;
  protected readonly aceptaImagen = ACEPTA_IMAGEN;

  protected readonly form = inject(NonNullableFormBuilder).group({
    direccion: ['', Validators.maxLength(LIMITES_EMPRESA.direccion)],
    telefono: ['', [Validators.maxLength(LIMITES_EMPRESA.telefono), telefono]],
    ciudad: ['', Validators.maxLength(LIMITES_EMPRESA.ciudad)],
    correo_contacto: ['', [Validators.maxLength(LIMITES_EMPRESA.correo_contacto), Validators.email]],
    pie_comprobante: ['', Validators.maxLength(LIMITES_EMPRESA.pie_comprobante)],
  });
  /** Characters of the footer, for the counter (the control changes outside signals). */
  protected readonly largoPie = signal(0);

  // ---------- Logo chosen and waiting for confirmation ----------

  protected readonly logoNuevo = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly errorArchivo = signal<string | null>(null);

  // ---------- Second-factor dialog ----------

  protected readonly accion = signal<Accion | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly errorCodigo = signal<string | null>(null);
  private readonly dialogoCodigo = viewChild(ConfirmarConCodigoDialogComponent);

  protected readonly dialogo = computed(() => {
    switch (this.accion()) {
      case 'logo':
        return { titulo: 'Cambiar el logo', mensaje: 'El logo nuevo saldrá en la entrada al sistema, en el menú y en los comprobantes PDF.', texto: 'Guardar logo', peligro: false };
      case 'quitar-logo':
        return { titulo: 'Quitar el logo', mensaje: 'La empresa quedará sin logo: se mostrarán sus iniciales y los comprobantes saldrán sin él.', texto: 'Quitar logo', peligro: true };
      default:
        return { titulo: 'Guardar los datos de la empresa', mensaje: 'Los datos nuevos salen en los comprobantes desde ahora.', texto: 'Guardar cambios', peligro: false };
    }
  });

  constructor() {
    // Fill the form when the data arrives (or changes), unless the person is in the middle of editing it.
    effect(() => {
      const e = this.empresa();
      untracked(() => {
        if (e && !this.form.dirty) this.llenar();
      });
    });
    this.form.controls.pie_comprobante.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.largoPie.set(v.length));
    this.destroyRef.onDestroy(() => this.soltarVistaPrevia());
  }

  protected deshacer(): void {
    this.llenar();
  }

  protected pedirGuardarDatos(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.abrir('datos');
  }

  protected elegirLogo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    // Cleared so choosing the same file again fires `change` again.
    entrada.value = '';
    if (!archivo) return;
    const problema = revisarImagen(archivo);
    this.errorArchivo.set(problema);
    if (problema) return;
    this.soltarVistaPrevia();
    this.logoNuevo.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  protected descartarLogo(): void {
    this.soltarVistaPrevia();
    this.logoNuevo.set(null);
  }

  protected abrir(accion: Accion): void {
    this.errorAccion.set(null);
    this.errorCodigo.set(null);
    this.accion.set(accion);
  }

  protected confirmar(codigo: string): void {
    const accion = this.accion();
    if (!accion || this.procesando()) return;
    let peticion: Observable<EmpresaRespuesta>;
    if (accion === 'datos') {
      const v = this.form.getRawValue();
      const texto = (campo: CampoEmpresa) => limpiarTexto(v[campo]) || null;
      peticion = this.servicio.guardarDatos({
        direccion: texto('direccion'),
        telefono: texto('telefono'),
        ciudad: texto('ciudad'),
        correo_contacto: v.correo_contacto.trim() || null,
        pie_comprobante: texto('pie_comprobante'),
        codigo,
      });
    } else if (accion === 'logo') {
      const archivo = this.logoNuevo();
      if (!archivo) return;
      peticion = this.servicio.subirLogo(archivo, codigo);
    } else {
      peticion = this.servicio.quitarLogo(codigo);
    }
    this.procesando.set(true);
    this.errorAccion.set(null);
    this.errorCodigo.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.procesando.set(false);
        this.accion.set(null);
        if (accion === 'datos') {
          this.form.markAsPristine();
          this.llenar();
          this.toast.exito('Los datos de la empresa se guardaron.');
        } else if (accion === 'logo') {
          this.descartarLogo();
          this.toast.exito('El logo se actualizó.');
        } else {
          this.toast.exito('Se quitó el logo.');
        }
      },
      error: (fallo: unknown) => {
        this.procesando.set(false);
        // A code that failed (or was spent) is never kept; what was typed in the form stays.
        this.dialogoCodigo()?.limpiarCodigo();
        const error = causaDe(fallo);
        const campos = isApiError(error) && error.fields ? error.fields : null;
        if (campos && Object.keys(campos).some((c) => (CAMPOS as readonly string[]).includes(c))) {
          // A field the backend refused: close the dialog and mark it in the form.
          for (const [campo, motivo] of Object.entries(campos)) {
            if ((CAMPOS as readonly string[]).includes(campo)) this.form.controls[campo as CampoEmpresa].setErrors({ servidor: motivo });
          }
          this.form.markAllAsTouched();
          this.accion.set(null);
          return;
        }
        if (campos?.['codigo']) {
          this.errorCodigo.set(campos['codigo']);
          return;
        }
        // 422 (image refused, antivirus) and 503 (antivirus down) carry a message to show as it is.
        const e = describirErrorSensible(this.errores, fallo);
        if (e.campo === 'codigo') this.errorCodigo.set(e.mensaje);
        else this.errorAccion.set(e.mensaje);
      },
    });
  }

  private llenar(): void {
    const e = this.empresa();
    if (!e) return;
    this.form.reset({
      direccion: e.direccion ?? '',
      telefono: e.telefono ?? '',
      ciudad: e.ciudad ?? '',
      correo_contacto: e.correo_contacto ?? '',
      pie_comprobante: e.pie_comprobante ?? '',
    });
    this.largoPie.set(this.form.controls.pie_comprobante.value.length);
  }

  private soltarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
