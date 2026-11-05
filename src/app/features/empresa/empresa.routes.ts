import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

/** Administración · Datos de la empresa. Solo ADMIN (el API también lo exige). */
export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () => import('./empresa-page.component').then((m) => m.EmpresaPageComponent),
    title: 'Datos de la empresa · SILA',
  },
];
