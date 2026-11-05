import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Location } from '@angular/common';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { ApiError, ERROR_SIN_CODIGO } from '../api/api-error';
import { esRutaAuth } from '../auth/rutas-auth';
import { CODIGO_EMPRESA_SUSPENDIDA, CODIGO_MODULO_INACTIVO } from '../empresa/empresa.models';
import { CODIGO_LEGAL_PENDIENTE, RUTA_ACEPTAR_TERMINOS } from '../legal/legal.models';
import { LegalService } from '../legal/legal.service';
import { EmpresaService } from '../empresa/empresa.service';
import { AuthService } from '../services/auth.service';

/** Code of "not authenticated": no token, expired or altered token, wrong credentials or MFA code. */
const NO_AUTENTICADO = 20013;

/**
 * The API answers a wrong or already used second-factor code (the sensitive actions of `/usuarios`) with the SAME `401` / `20013`
 * as an expired token, only the text differs («Codigo incorrecto.», «Ese codigo ya fue usado»). That is an answer about the code,
 * not about the session: renewing and retrying would log the person out for a typing mistake.
 */
const FALLO_DE_CODIGO = /c[oó]digo/i;

/**
 * Turns every HTTP failure into the dashboard's `ApiError`, so repositories
 * and components never see `HttpErrorResponse`.
 *
 * 401 / 20013 on a normal call = the access token expired (unless it is about a second-factor code): refresh ONCE and
 * retry the call ONCE with the new token. If refreshing fails (or the retry is
 * rejected too) the session is cleared and the user goes to `/login`, keeping
 * the page to come back to, with the notice "Tu sesión se cerró…" (it can be another device, idle
 * time or an administrator). `/auth/*` errors are shown as they are.
 *
 * `20020` (module off for this company): the backend's message is shown once and `/empresa` is read again, so the
 * menu and the screens redraw without it. Done here, in the one place where API errors are handled.
 *
 * `20022` (terms / privacy not accepted in the version in force): NOT a session error. The session stays open and the person
 * goes ONCE to the acceptance screen, which sends them back to where they were. Not while they are still in the login (the
 * flow finishes first: change of password, second factor, backup codes), nor if they are already on the screen, nor while
 * they read a public legal page (`/legal/**`).
 *
 * `20021` (company suspended, on any route, `/auth/*` included): the session is cleared without refreshing and the
 * login shows the suspension notice.
 *
 * Nothing is logged here on purpose: request URLs carry search text and
 * could expose personal data (Ley 1581).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const injector = inject(Injector);
  const ubicacion = inject(Location);

  const sesionTerminada = (error: ApiError): Observable<never> => {
    // Several calls can fail together: only the first one clears the session and goes to the login, once.
    if (auth.isAuthenticated()) {
      auth.limpiarSesion();
      const destino = router.url;
      const params: Record<string, string> = { aviso: 'sesion-cerrada' };
      if (destino !== '/' && !destino.startsWith('/login')) params['return'] = destino;
      void router.navigate(['/login'], { queryParams: params });
    }
    return throwError(() => error);
  };

  /**
   * `20021`: nothing works until the owner reactivates the company, so renewing or retrying is pointless. The session is
   * dropped locally (the other tabs get the same answer on their next call) and the login shows the notice instead of the form.
   */
  const empresaSuspendida = (error: ApiError): Observable<never> => {
    injector.get(EmpresaService).empresaSuspendida(error.message);
    const conSesion = auth.isAuthenticated();
    if (conSesion) auth.limpiarSesion();
    // Several calls can fail together: only the one that found the session navigates, and never from the login itself.
    if (conSesion && !router.url.startsWith('/login')) {
      const destino = router.url;
      void router.navigate(['/login'], destino !== '/' ? { queryParams: { return: destino } } : {});
    }
    return throwError(() => error);
  };

  const legalPendiente = (error: ApiError): Observable<never> => {
    const primera = injector.get(LegalService).marcarPendiente();
    const url = router.url;
    // The public legal pages (`/legal/**`) must be readable precisely while the terms are not accepted (the footer and the
    // «Abrir en una pestaña nueva» links open them in a fresh tab, where `/empresa` fails with 20022 on start-up).
    // On start-up the answer can arrive BEFORE the first navigation ends, when `router.url` is still `/`: the address the
    // browser really has (`Location`) is checked too.
    const esLegal = (ruta: string) => ruta === '/legal' || ruta.startsWith('/legal/') || ruta.startsWith('/legal?');
    const enPaginaLegal = esLegal(url) || esLegal(ubicacion.path());
    if (primera && auth.isAuthenticated() && !url.startsWith('/login') && !url.startsWith(RUTA_ACEPTAR_TERMINOS) && !enPaginaLegal) {
      void router.navigate([RUTA_ACEPTAR_TERMINOS], url !== '/' ? { queryParams: { return: url } } : {});
    }
    return throwError(() => error);
  };

  const enviar = (peticion: typeof req, esReintento: boolean): Observable<HttpEvent<unknown>> =>
    next(peticion).pipe(
      // A file request that fails answers its JSON `{code, message}` INSIDE a Blob: read it first so the rest sees a normal error.
      catchError((fallo: unknown) => (fallo instanceof HttpErrorResponse && fallo.error instanceof Blob ? errorDeBlob(fallo) : throwError(() => fallo))),
      catchError((fallo: unknown) => {
        if (!(fallo instanceof HttpErrorResponse)) {
          return throwError(() => fallo);
        }
        const error = aApiError(fallo);
        if (error.code === CODIGO_EMPRESA_SUSPENDIDA) return empresaSuspendida(error);
        if (error.code === CODIGO_LEGAL_PENDIENTE) return legalPendiente(error);
        const tokenVencido = fallo.status === 401 && error.code === NO_AUTENTICADO && !esRutaAuth(peticion.url) && !FALLO_DE_CODIGO.test(error.message);
        if (!tokenVencido) {
          // The owner switched a module off while the person was working: tell them and read the company data again.
          if (error.code === CODIGO_MODULO_INACTIVO && !esRutaAuth(peticion.url)) injector.get(EmpresaService).moduloInactivo(error.message);
          return throwError(() => error);
        }
        if (esReintento) {
          // Even the new token was rejected: do not renew again, no loops.
          return sesionTerminada(error);
        }
        return auth.renovar().pipe(
          catchError(() => sesionTerminada(error)),
          switchMap(() => enviar(peticion.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } }), true)),
        );
      }),
    );

  return enviar(req, false);
};

/** The API answers `{ code, message, support_ref?, fields? }` (snake_case JSON). */
function aApiError(error: HttpErrorResponse): ApiError {
  const cuerpo: unknown = error.error;
  if (typeof cuerpo === 'object' && cuerpo !== null) {
    const { code, message, support_ref, fields } = cuerpo as Record<string, unknown>;
    if (typeof code === 'number' && typeof message === 'string') {
      return {
        code,
        message,
        ...(typeof support_ref === 'number' ? { supportRef: support_ref } : {}),
        ...(typeof fields === 'object' && fields !== null ? { fields: fields as Record<string, string> } : {}),
      };
    }
  }
  // No usable body (server down, proxy error, framework default error page...).
  if (error.status === 0) {
    return { code: ERROR_SIN_CODIGO, message: 'No se pudo conectar con el servidor. Revisa que el backend esté en ejecución.' };
  }
  if (error.status === 413) {
    return { code: ERROR_SIN_CODIGO, message: 'El archivo supera el tamaño máximo permitido (10 MB).' };
  }
  if (error.status >= 500) {
    return { code: 20999, message: 'Error interno del servidor.' };
  }
  return { code: ERROR_SIN_CODIGO, message: 'No se pudo completar la operación.' };
}

/** Turns the `Blob` body of a failed file request back into the JSON the API sent (or into `null` if it was not JSON). */
function errorDeBlob(fallo: HttpErrorResponse): Observable<never> {
  return from((fallo.error as Blob).text().catch(() => '')).pipe(
    switchMap((texto) => {
      let cuerpo: unknown = null;
      try {
        cuerpo = texto ? JSON.parse(texto) : null;
      } catch {
        cuerpo = null;
      }
      return throwError(() => new HttpErrorResponse({ error: cuerpo, headers: fallo.headers, status: fallo.status, statusText: fallo.statusText, url: fallo.url ?? undefined }));
    }),
  );
}
