import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

/** Finanzas · Reportes. Solo ADMIN (el API también lo exige: 403 / 20008). */
export const REPORTES_ROUTES: Routes = [
  {
    path: 'margen',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () => import('./margen-page.component').then((m) => m.MargenPageComponent),
    title: 'Margen de ganancia · SILA',
  },
  { path: '**', redirectTo: 'margen' },
];
