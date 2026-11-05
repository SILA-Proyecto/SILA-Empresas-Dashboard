import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { URL_INICIO } from '../auth/url-retorno';
import { RUTA_ACEPTAR_TERMINOS } from './legal.models';
import { LegalService } from './legal.service';

/**
 * Business routes need the terms and the privacy policy accepted in their current version. If not, the person goes to the
 * acceptance screen (no menu, no business route) and comes back to where they were going.
 *
 * Not security: the API answers `403 / 20022` to everything else until they accept. If the check itself fails the person is
 * let through: the API decides.
 */
export const legalGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  const legal = inject(LegalService);
  const router = inject(Router);
  const aAceptar = () => router.createUrlTree([RUTA_ACEPTAR_TERMINOS], state.url === URL_INICIO ? {} : { queryParams: { return: state.url } });

  // Known: no waiting (this also runs for every child route).
  if (legal.alDia() === true) return true;
  if (legal.alDia() === false) return aAceptar();
  return legal.asegurarEstado().then((alDia) => (alDia === false ? aAceptar() : true));
};
