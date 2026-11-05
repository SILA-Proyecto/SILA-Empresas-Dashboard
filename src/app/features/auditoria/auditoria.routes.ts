import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';
import { moduloGuard } from '../../core/empresa/modulo.guard';

/** Grupo 6 · Administración · Auditoría y accesos. Solo ADMIN (el API también lo exige: 20008) y con el módulo AUDITORIA. */
export const AUDITORIA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('ADMIN'), moduloGuard('AUDITORIA')],
    loadComponent: () => import('./auditoria-page.component').then((m) => m.AuditoriaPageComponent),
    title: 'Auditoría y accesos · SILA',
  },
];
