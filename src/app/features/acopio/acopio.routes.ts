import { Routes } from '@angular/router';

/** Grupo 3 · Producción y acopio · Calidad de la leche. Todos los usuarios con sesión. */
export const ACOPIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./acopio-page.component').then((m) => m.AcopioPageComponent),
    title: 'Calidad de la leche · SILA',
  },
];
