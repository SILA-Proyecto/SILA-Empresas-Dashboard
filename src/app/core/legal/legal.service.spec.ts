import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import type { EstadoLegal } from './legal.models';
import { LegalService } from './legal.service';

const USUARIO = { id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN' as const, mfa_activo: true };
const PENDIENTE: EstadoLegal = {
  al_dia: false,
  documentos: [
    { documento: 'TERMINOS', version: '1.0', fecha: '2026-10-28', aceptado: false, fecha_aceptacion: null },
    { documento: 'PRIVACIDAD', version: '1.0', fecha: '2026-10-28', aceptado: false, fecha_aceptacion: null },
  ],
};
const AL_DIA: EstadoLegal = { al_dia: true, documentos: PENDIENTE.documentos.map((d) => ({ ...d, aceptado: true, fecha_aceptacion: '2026-10-28T14:00:00' })) };

describe('LegalService', () => {
  let servicio: LegalService;
  let http: HttpTestingController;
  const ruta = (url: string) => new URL(url, 'http://host').pathname;
  const unico = (path: string) => http.expectOne((r) => ruta(r.url) === path);
  const asentar = async () => {
    TestBed.tick();
    await new Promise((resolver) => setTimeout(resolver));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(LegalService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('no sabe nada hasta preguntar: alDia es null', () => {
    expect(servicio.alDia()).toBeNull();
    expect(servicio.pendiente()).toBe(false);
  });

  it('asegurarEstado pide /legal/estado y guarda si está al día; la segunda vez no vuelve a pedir', async () => {
    const primera = servicio.asegurarEstado();
    unico('/api/v1/legal/estado').flush(AL_DIA);

    expect(await primera).toBe(true);
    expect(servicio.alDia()).toBe(true);
    expect(await servicio.asegurarEstado()).toBe(true);
    http.expectNone((r) => ruta(r.url) === '/api/v1/legal/estado');
  });

  it('si falta aceptar, alDia es false y sigue preguntando (no da por bueno lo pendiente)', async () => {
    const primera = servicio.asegurarEstado();
    unico('/api/v1/legal/estado').flush(PENDIENTE);

    expect(await primera).toBe(false);
    expect(servicio.pendiente()).toBe(true);
    const segunda = servicio.asegurarEstado();
    unico('/api/v1/legal/estado').flush(PENDIENTE);
    await segunda;
  });

  it('varias preguntas a la vez comparten una sola llamada', async () => {
    const a = servicio.recargar();
    const b = servicio.recargar();
    unico('/api/v1/legal/estado').flush(AL_DIA);

    expect(await a).toBe(true);
    expect(await b).toBe(true);
  });

  it('si la consulta falla devuelve null (no bloquea a nadie: la API decide) y no queda marcado como al día', async () => {
    const llamada = servicio.asegurarEstado();
    unico('/api/v1/legal/estado').flush({ code: 20019, message: 'No disponible' }, { status: 503, statusText: 'Unavailable' });

    expect(await llamada).toBeNull();
    expect(servicio.alDia()).toBeNull();
  });

  it('aceptar manda las versiones tal cual y guarda el estado que contesta el backend', async () => {
    let nuevo: EstadoLegal | undefined;
    servicio.aceptar({ aceptaciones: [{ documento: 'TERMINOS', version: '1.0' }, { documento: 'PRIVACIDAD', version: '1.0' }] }).subscribe((e) => (nuevo = e));
    const req = unico('/api/v1/legal/aceptar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ aceptaciones: [{ documento: 'TERMINOS', version: '1.0' }, { documento: 'PRIVACIDAD', version: '1.0' }] });
    req.flush(AL_DIA);

    expect(nuevo?.al_dia).toBe(true);
    expect(servicio.alDia()).toBe(true);
  });

  it('vigentes no necesita sesión y no manda el token', () => {
    servicio.vigentes().subscribe();
    const req = unico('/api/v1/legal/vigentes');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ documentos: [] });
  });

  it('marcarPendiente avisa solo la PRIMERA vez (así se redirige una sola vez)', () => {
    expect(servicio.marcarPendiente()).toBe(true);
    expect(servicio.marcarPendiente()).toBe(false);
    expect(servicio.pendiente()).toBe(true);
  });

  it('al cerrar la sesión olvida todo y una respuesta que llega después se descarta', async () => {
    const auth = TestBed.inject(AuthService);
    auth.sesion.set(USUARIO);
    await asentar();
    const llamada = servicio.recargar();
    auth.limpiarSesion();
    await asentar();
    unico('/api/v1/legal/estado').flush(AL_DIA);
    await llamada;

    expect(servicio.alDia()).toBeNull();
    expect(servicio.estado()).toBeNull();
  });

  it('no guarda nada en el almacenamiento del navegador', async () => {
    const escritura = vi.spyOn(Storage.prototype, 'setItem');
    const llamada = servicio.recargar();
    unico('/api/v1/legal/estado').flush(AL_DIA);
    await llamada;

    expect(escritura).not.toHaveBeenCalled();
    escritura.mockRestore();
  });
});
