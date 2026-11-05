import { Routes } from '@angular/router';
import { moduloGuard } from '../../core/empresa/modulo.guard';

/**
 * Finanzas · Resultado por quincena. Read only; OPERATIVO and ADMIN see the same figures, so there is NO `roleGuard`
 * (unlike `/periodos`, which stays ADMIN-only). Only with the RESULTADO_QUINCENA module.
 */
export const RESULTADO_QUINCENA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [moduloGuard('RESULTADO_QUINCENA')],
    loadComponent: () => import('./resultado-quincena-page.component').then((m) => m.ResultadoQuincenaPageComponent),
    title: 'Resultado por quincena · SILA',
  },
];
