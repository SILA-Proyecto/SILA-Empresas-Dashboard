import { signal, type Provider, type WritableSignal } from '@angular/core';
import { of, type Observable } from 'rxjs';
import { EmpresaService } from '../empresa.service';
import { MODULOS_OPCIONALES, type CodigoModulo, type Empresa, type EmpresaRespuesta } from '../empresa.models';

const EMPRESA_DE_PRUEBA: Empresa = {
  nombre: 'Lácteos de Prueba SAS',
  nombre_corto: 'Pruebas',
  nit: '900.123.456-7',
  direccion: 'Calle 1 # 2-3',
  telefono: '3001234567',
  ciudad: 'Villavicencio',
  correo_contacto: null,
  pie_comprobante: 'Gracias por su compra.',
};

/** Company stub for component tests. `activos` can be changed in the middle of a test to see the screen redraw. */
export interface EmpresaFalsa {
  activos: WritableSignal<readonly CodigoModulo[]>;
  activo(modulo: CodigoModulo): boolean;
  empresa(): Empresa;
  nombre(): string;
  nombreCorto(): string;
  cargada(): boolean;
  asegurarCargada(): Promise<void>;
  recargar(): Promise<void>;
  moduloInactivo(mensaje: string): void;
  /** `null` by default (active company); set it to see the login of a suspended one. */
  suspension: WritableSignal<string | null>;
  empresaSuspendida(mensaje: string): void;
  cargarPublica(): Promise<void>;
  limpiar(): void;
  /** `null` by default (no logo); set it to see the screens with one. */
  logo: WritableSignal<string | null>;
  logoUrl(): string | null;
  logoVisible(): string | null;
  logoFallo(url: string): void;
  guardarDatos(...args: unknown[]): Observable<EmpresaRespuesta>;
  subirLogo(...args: unknown[]): Observable<EmpresaRespuesta>;
  quitarLogo(...args: unknown[]): Observable<EmpresaRespuesta>;
}

export function crearEmpresaFalsa(activos: readonly CodigoModulo[] = MODULOS_OPCIONALES, empresa: Empresa = EMPRESA_DE_PRUEBA): EmpresaFalsa {
  const lista = signal<readonly CodigoModulo[]>(activos);
  const logo = signal<string | null>(null);
  const suspension = signal<string | null>(null);
  const respuesta = (): EmpresaRespuesta => ({ empresa, modulos: [], modulos_activos: [...lista()], logo_version: null });
  return {
    activos: lista,
    activo: (modulo) => lista().includes(modulo),
    empresa: () => empresa,
    nombre: () => empresa.nombre,
    nombreCorto: () => empresa.nombre_corto,
    cargada: () => true,
    asegurarCargada: () => Promise.resolve(),
    recargar: () => Promise.resolve(),
    moduloInactivo: () => undefined,
    suspension,
    empresaSuspendida: (mensaje) => suspension.set(mensaje),
    cargarPublica: () => Promise.resolve(),
    limpiar: () => undefined,
    logo,
    logoUrl: () => logo(),
    logoVisible: () => logo(),
    logoFallo: () => logo.set(null),
    guardarDatos: () => of(respuesta()),
    subirLogo: () => of(respuesta()),
    quitarLogo: () => of(respuesta()),
  };
}

/** Provides the stub in place of the real service: by default every optional module is on, like Llanolat. */
export function provideEmpresaFalsa(activos: readonly CodigoModulo[] = MODULOS_OPCIONALES, empresa: Empresa = EMPRESA_DE_PRUEBA): Provider {
  return { provide: EmpresaService, useValue: crearEmpresaFalsa(activos, empresa) };
}
