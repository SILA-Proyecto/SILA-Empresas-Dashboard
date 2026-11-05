import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EmpresaService } from '../empresa/empresa.service';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

const MENSAJE = 'Esta función no está activa para su empresa.';

describe('errorInterceptor: 20020 (módulo apagado)', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let moduloInactivo: ReturnType<typeof vi.fn>;

  const ruta = (url: string) => new URL(url, 'http://host').pathname;

  beforeEach(() => {
    moduloInactivo = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: EmpresaService, useValue: { moduloInactivo } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN', mfa_activo: true });
  });

  afterEach(() => controlador.verify());

  it('un 403 / 20020 en cualquier llamada avisa a EmpresaService con el mensaje del backend y sigue siendo un error normal', () => {
    let recibido: unknown;
    http.get('/api/v1/cartera/resumen').subscribe({ error: (e) => (recibido = e) });

    controlador.expectOne((r) => ruta(r.url) === '/api/v1/cartera/resumen').flush({ code: 20020, message: MENSAJE }, { status: 403, statusText: 'Forbidden' });

    expect(moduloInactivo).toHaveBeenCalledWith(MENSAJE);
    expect(recibido).toEqual({ code: 20020, message: MENSAJE });
  });

  it('20008 (falta de permiso por rol) no toca la empresa', () => {
    http.get('/api/v1/usuarios').subscribe({ error: () => undefined });

    controlador.expectOne((r) => ruta(r.url) === '/api/v1/usuarios').flush({ code: 20008, message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });

    expect(moduloInactivo).not.toHaveBeenCalled();
  });
});
