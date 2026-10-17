import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpAcopioRepository } from './http-acopio.repository';

describe('HttpAcopioRepository', () => {
  let repo: HttpAcopioRepository;
  let http: HttpTestingController;
  const ruta = (url: string) => new URL(url, 'http://host').pathname;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repo = TestBed.inject(HttpAcopioRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('umbrales: GET /acopio/umbrales', () => {
    repo.umbrales().subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/acopio/umbrales');
    expect(req.request.method).toBe('GET');
    req.flush({ temperatura_max: 10, acidez_max: 18 });
  });

  it('calidad: GET /acopio/calidad con página y orden', () => {
    repo.calidad({ page: 0, size: 20, sort: 'proveedor,asc' }).subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/acopio/calidad');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('sort')).toBe('proveedor,asc');
    req.flush({ items: [], total: 0, page: 0, size: 20 });
  });
});
