import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpUsuariosRepository } from './http-usuarios.repository';

describe('HttpUsuariosRepository', () => {
  let repo: HttpUsuariosRepository;
  let http: HttpTestingController;
  const ruta = (url: string) => new URL(url, 'http://host').pathname;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repo = TestBed.inject(HttpUsuariosRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function peticion(path: string) {
    return http.expectOne((r) => ruta(r.url) === `/api/v1${path}`).request;
  }

  it('crear: POST /usuarios con los datos y el código del segundo factor', () => {
    repo.crear({ usuario: 'ana', nombre: 'Ana Pérez', email: 'a@example.com', rol: 'OPERATIVO', codigo: '123456' }).subscribe();
    const req = peticion('/usuarios');
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ usuario: 'ana', nombre: 'Ana Pérez', email: 'a@example.com', rol: 'OPERATIVO', codigo: '123456' });
  });

  it('actualizar: PUT /usuarios/{id} con el código', () => {
    repo.actualizar(7, { nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN', codigo: 'ABCDE-12345' }).subscribe();
    const req = peticion('/usuarios/7');
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({ nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN', codigo: 'ABCDE-12345' });
  });

  it('restablecer clave y segundo factor: el cuerpo es { codigo }', () => {
    repo.restablecerClave(7, '111111').subscribe();
    expect(peticion('/usuarios/7/restablecer-clave').body).toEqual({ codigo: '111111' });
    repo.restablecerMfa(7, '222222').subscribe();
    expect(peticion('/usuarios/7/restablecer-mfa').body).toEqual({ codigo: '222222' });
  });

  it('desbloquear, cerrar sesiones y cambiar estado NO llevan código', () => {
    repo.desbloquear(7).subscribe();
    expect(peticion('/usuarios/7/desbloquear').body).toBeNull();
    repo.cerrarSesiones(7).subscribe();
    expect(peticion('/usuarios/7/cerrar-sesiones').body).toBeNull();
    repo.cambiarEstado(7, false).subscribe();
    expect(peticion('/usuarios/7/estado').body).toEqual({ activo: false });
  });

  it('el código no viaja en la URL', () => {
    repo.restablecerClave(7, '111111').subscribe();
    const req = peticion('/usuarios/7/restablecer-clave');
    expect(req.urlWithParams).not.toContain('111111');
  });
});
