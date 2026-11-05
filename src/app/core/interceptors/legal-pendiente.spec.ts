import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EmpresaService } from '../empresa/empresa.service';
import { LegalService } from '../legal/legal.service';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

const MENSAJE = 'Debe aceptar los términos y condiciones y la política de privacidad vigentes para continuar.';
const PENDIENTE = { code: 20022, message: MENSAJE };
const PROHIBIDO = { status: 403, statusText: 'Forbidden' };
const USUARIO = { id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN' as const, mfa_activo: true };

@Component({ template: '' })
class Vacia {}

describe('errorInterceptor: 20022 (términos sin aceptar)', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let legal: LegalService;

  const ruta = (url: string) => new URL(url, 'http://host').pathname;
  const responder = (path: string) => controlador.expectOne((r) => ruta(r.url) === path).flush(PENDIENTE, PROHIBIDO);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: Vacia },
          { path: 'ventas', component: Vacia },
          { path: 'aceptar-terminos', component: Vacia },
          { path: 'legal', children: [{ path: '', component: Vacia }, { path: 'terminos', component: Vacia }] },
        ]),
        { provide: EmpresaService, useValue: { moduloInactivo: vi.fn(), empresaSuspendida: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    legal = TestBed.inject(LegalService);
    router = TestBed.inject(Router);
    auth.sesion.set(USUARIO);
    await router.navigateByUrl('/ventas');
  });
  afterEach(() => controlador.verify());

  it('lleva a la pantalla de aceptación UNA vez, guarda la ruta y NO cierra la sesión, aunque fallen varias llamadas', async () => {
    const navegar = vi.spyOn(router, 'navigate');
    const errores: unknown[] = [];
    http.get('/api/v1/tablero').subscribe({ error: (e) => errores.push(e) });
    http.get('/api/v1/notificaciones').subscribe({ error: (e) => errores.push(e) });
    http.get('/api/v1/empresa').subscribe({ error: (e) => errores.push(e) });

    responder('/api/v1/tablero');
    responder('/api/v1/notificaciones');
    responder('/api/v1/empresa');

    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/aceptar-terminos'], { queryParams: { return: '/ventas' } });
    expect(auth.isAuthenticated()).toBe(true);
    expect(legal.pendiente()).toBe(true);
    expect(errores).toEqual([PENDIENTE, PENDIENTE, PENDIENTE]);
    // No refresh: a 403 is not an expired token.
    controlador.expectNone((r) => ruta(r.url) === '/api/v1/auth/refresh');
  });

  it('desde el login NO redirige (el flujo de ingreso termina primero: clave, segundo factor, códigos de respaldo)', async () => {
    await router.navigateByUrl('/login');
    const navegar = vi.spyOn(router, 'navigate');
    http.get('/api/v1/empresa').subscribe({ error: () => undefined });

    responder('/api/v1/empresa');

    expect(navegar).not.toHaveBeenCalled();
    expect(legal.pendiente()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('estando ya en la pantalla de aceptación no vuelve a redirigir (sin bucles)', async () => {
    await router.navigateByUrl('/aceptar-terminos');
    const navegar = vi.spyOn(router, 'navigate');
    http.get('/api/v1/empresa').subscribe({ error: () => undefined });

    responder('/api/v1/empresa');

    expect(navegar).not.toHaveBeenCalled();
  });

  it.each(['/legal', '/legal/terminos', '/legal/terminos?v=1.0'])('leyendo una página legal pública (%s) NO te saca de ella, aunque el backend responda 20022', async (pagina) => {
    await router.navigateByUrl(pagina);
    const navegar = vi.spyOn(router, 'navigate');
    http.get('/api/v1/empresa').subscribe({ error: () => undefined });

    responder('/api/v1/empresa');

    expect(navegar).not.toHaveBeenCalled();
    expect(router.url).toBe(pagina);
    expect(legal.pendiente()).toBe(true);
  });

  it('al ARRANCAR en una página legal (la navegación inicial aún no termina: router.url es «/») tampoco te saca de ella', async () => {
    TestBed.inject(Location).go('/legal/terminos');
    expect(router.url).not.toBe('/legal/terminos');
    const navegar = vi.spyOn(router, 'navigate');
    http.get('/api/v1/empresa').subscribe({ error: () => undefined });

    responder('/api/v1/empresa');

    expect(navegar).not.toHaveBeenCalled();
  });

  it('un 403 de otra clase (20008, por rol) no toca el estado legal', () => {
    http.get('/api/v1/usuarios').subscribe({ error: () => undefined });

    controlador.expectOne((r) => ruta(r.url) === '/api/v1/usuarios').flush({ code: 20008, message: 'Sin permiso' }, PROHIBIDO);

    expect(legal.pendiente()).toBe(false);
  });
});
