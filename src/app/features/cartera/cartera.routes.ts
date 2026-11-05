import { Routes } from '@angular/router';
import { moduloGuard } from '../../core/empresa/modulo.guard';

/** Ventas y cobros · Cartera. Todos los usuarios con sesión (castigar es solo ADMIN, y el servidor también lo exige). */
export const CARTERA_ROUTES: Routes = [
  {
    path: '',
    canActivate: [moduloGuard('CREDITO')],
    loadComponent: () => import('./cartera-page.component').then((m) => m.CarteraPageComponent),
    title: 'Cartera · SILA',
  },
];
