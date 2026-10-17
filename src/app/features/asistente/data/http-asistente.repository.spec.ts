import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpAsistenteRepository } from './http-asistente.repository';

describe('HttpAsistenteRepository', () => {
  it('preguntar: POST /asistente/mensajes con el mensaje, la sesión y la Idempotency-Key dada', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let respuesta: unknown;
    TestBed.inject(HttpAsistenteRepository)
      .preguntar({ mensaje: '¿Cuánto debe Pérez?', sesion_id: 'abc-12345678' }, 'clave-0001-xyz')
      .subscribe((r) => (respuesta = r));

    const req = http.expectOne((r) => new URL(r.url, 'http://host').pathname === '/api/v1/asistente/mensajes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mensaje: '¿Cuánto debe Pérez?', sesion_id: 'abc-12345678' });
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-0001-xyz');
    req.flush({ respuesta: 'Debe $ 1.000', sesion_id: 'abc-12345678' });
    expect(respuesta).toEqual({ respuesta: 'Debe $ 1.000', sesion_id: 'abc-12345678' });
    http.verify();
  });
});
