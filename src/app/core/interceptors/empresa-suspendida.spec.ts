import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EmpresaService } from '../empresa/empresa.service';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

const MENSAJE = 'El servicio de su empresa está suspendido. Comuníquese con el proveedor del sistema.';
const SUSPENDIDA = { code: 20021, message: MENSAJE };
const PROHIBIDO = { status: 403, statusText: 'Forbidden' };
const USUARIO = { id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN' as const, mfa_activo: true };

@Component({ template: '' })
class Vacia {}

describe('errorInterceptor: 20021 (empresa suspendida)', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let empresaSuspendida: ReturnType<typeof vi.fn>;

  const ruta = (url: string) => new URL(url, 'http://host').pathname;
  const responder = (path: string) => controlador.expectOne((r) => ruta(r.url) === path).flush(SUSPENDIDA, PROHIBIDO);

  beforeEach(async () => {
    empresaSuspendida = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: Vacia },
          { path: 'ventas', component: Vacia },
        ]),
        { provide: EmpresaService, useValue: { empresaSuspendida, moduloInactivo: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    await router.navigateByUrl('/ventas');
  });

  afterEach(() => controlador.verify());

  it('con sesión: avisa a la empresa, borra la sesión sin renovar y lleva al login una sola vez, aunque fallen varias llamadas', async () => {
    auth.sesion.set(USUARIO);
    const navegar = vi.spyOn(router, 'navigate');
    const errores: unknown[] = [];
    http.get('/api/v1/tablero').subscribe({ error: (e) => errores.push(e) });
    http.get('/api/v1/notificaciones').subscribe({ error: (e) => errores.push(e) });

    responder('/api/v1/tablero');
    responder('/api/v1/notificaciones');

    expect(empresaSuspendida).toHaveBeenCalledWith(MENSAJE);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { return: '/ventas' } });
    // No refresh was attempted: `verify()` would fail on a pending `/auth/refresh`.
    controlador.expectNone((r) => ruta(r.url) === '/api/v1/auth/refresh');
    expect(errores).toEqual([SUSPENDIDA, SUSPENDIDA]);
  });

  it('al arrancar con la cookie: el refresh con 20021 marca la empresa suspendida y no se reintenta', async () => {
    const restaurada = auth.restaurarSesion();

    responder('/api/v1/auth/refresh');

    expect(await restaurada).toBe(false);
    expect(empresaSuspendida).toHaveBeenCalledWith(MENSAJE);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('el login con 20021 marca la empresa suspendida sin navegar (ya está en el login)', async () => {
    await router.navigateByUrl('/login');
    const navegar = vi.spyOn(router, 'navigate');
    let recibido: unknown;
    auth.iniciarSesion('ana', 'clave').subscribe({ error: (e) => (recibido = e) });

    responder('/api/v1/auth/login');

    expect(empresaSuspendida).toHaveBeenCalledWith(MENSAJE);
    expect(navegar).not.toHaveBeenCalled();
    expect(recibido).toEqual(SUSPENDIDA);
  });

  it('un 401 / 20013 cuya renovación da 20021 termina en el login sin bucles', async () => {
    auth.sesion.set(USUARIO);
    let recibido: unknown;
    http.get('/api/v1/tablero').subscribe({ error: (e) => (recibido = e) });

    controlador.expectOne((r) => ruta(r.url) === '/api/v1/tablero').flush({ code: 20013, message: 'Token vencido' }, { status: 401, statusText: 'Unauthorized' });
    // The refresh may wait for the Web Lock: give it a turn.
    await new Promise((resolver) => setTimeout(resolver));
    responder('/api/v1/auth/refresh');
    await new Promise((resolver) => setTimeout(resolver));

    expect(empresaSuspendida).toHaveBeenCalledWith(MENSAJE);
    expect(auth.isAuthenticated()).toBe(false);
    expect(recibido).toBeDefined();
    controlador.expectNone((r) => ruta(r.url) === '/api/v1/tablero');
  });
});
