import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpReportesRepository } from './http-reportes.repository';

describe('HttpReportesRepository', () => {
  it('margen: GET /reportes/margen con agrupación, fechas y orden', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpReportesRepository).margen({ agrupar: 'CLIENTE', desde: '2026-10-01', hasta: '2026-10-17', sort: 'margen,desc' }).subscribe();

    const req = http.expectOne((r) => new URL(r.url, 'http://host').pathname === '/api/v1/reportes/margen');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('agrupar')).toBe('CLIENTE');
    expect(req.request.params.get('desde')).toBe('2026-10-01');
    expect(req.request.params.get('hasta')).toBe('2026-10-17');
    expect(req.request.params.get('sort')).toBe('margen,desc');
    http.verify();
  });
});
