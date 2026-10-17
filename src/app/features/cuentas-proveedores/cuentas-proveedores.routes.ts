import type { Routes } from '@angular/router';

export const CUENTAS_PROVEEDORES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cuentas-proveedores-page.component').then((m) => m.CuentasProveedoresPageComponent),
  },
];
