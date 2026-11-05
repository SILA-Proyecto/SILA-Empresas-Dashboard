import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { URL_INICIO } from '../auth/url-retorno';
import type { CodigoModulo } from './empresa.models';
import { EmpresaService } from './empresa.service';

export const MENSAJE_MODULO_INACTIVO = 'Esta función no está activa para su empresa.';

/**
 * `canActivate: [moduloGuard('CREDITO')]`. Whoever types the URL of a screen whose module is off lands on the
 * dashboard with a notice. It waits for the company data (a page reload gets here before it has loaded).
 * Hiding a screen is a convenience, not security: the backend already answers `20020`.
 */
export function moduloGuard(modulo: CodigoModulo): CanActivateFn {
  return async () => {
    const empresa = inject(EmpresaService);
    const router = inject(Router);
    const toast = inject(ToastService);
    await empresa.asegurarCargada();
    if (empresa.activo(modulo)) return true;
    toast.error(MENSAJE_MODULO_INACTIVO);
    return router.createUrlTree([URL_INICIO]);
  };
}
