import { InjectionToken } from '@angular/core';
import type { CuentasProveedoresRepository } from './cuentas-proveedores.repository';

export const CUENTAS_PROVEEDORES_REPOSITORY = new InjectionToken<CuentasProveedoresRepository>('CUENTAS_PROVEEDORES_REPOSITORY');
