import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpCuentasProveedoresRepository } from './http-cuentas-proveedores.repository';

describe('HttpCuentasProveedoresRepository', () => {
  let repo: HttpCuentasProveedoresRepository;
  let http: HttpTestingController;
  const ruta = (url: string) => new URL(url, 'http://host').pathname;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repo = TestBed.inject(HttpCuentasProveedoresRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('listarPrecios: GET /cuentas-proveedores/precios con filtros de proveedor, insumo y solo_vigentes', () => {
    repo.listarPrecios({ id_proveedor: 3, id_insumo: 12, solo_vigentes: true, page: 0, size: 20 }).subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/precios');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('id_proveedor')).toBe('3');
    expect(req.request.params.get('id_insumo')).toBe('12');
    expect(req.request.params.get('solo_vigentes')).toBe('true');
    req.flush({ items: [], total: 0, page: 0, size: 20 });
  });

  it('fijarPrecio: POST /cuentas-proveedores/precios con id_proveedor, id_insumo, precio_unitario e Idempotency-Key', () => {
    repo.fijarPrecio({ id_proveedor: 3, id_insumo: 12, precio_unitario: 2200, vigente_desde: '2026-10-16' }, 'clave-precio-prov-1').subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/precios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_proveedor: 3, id_insumo: 12, precio_unitario: 2200, vigente_desde: '2026-10-16' });
    expect(req.request.headers.get('Idempotency-Key')).toBe('clave-precio-prov-1');
    req.flush({}, { status: 201, statusText: 'Created' });
  });

  it('saldos: GET /cuentas-proveedores/saldos con solo_con_saldo y sort', () => {
    repo.saldos({ solo_con_saldo: true, page: 0, size: 20, sort: 'saldo,desc' }).subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/saldos');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('solo_con_saldo')).toBe('true');
    expect(req.request.params.get('sort')).toBe('saldo,desc');
    req.flush({ items: [], total: 0, page: 0, size: 20 });
  });

  it('resumen: GET /cuentas-proveedores/resumen con quincena, año y proveedor', () => {
    repo.resumen({ id_periodo: 19, anio: 2026, id_proveedor: 3, page: 0, size: 20 }).subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/resumen');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('id_periodo')).toBe('19');
    expect(req.request.params.get('anio')).toBe('2026');
    expect(req.request.params.get('id_proveedor')).toBe('3');
    req.flush({ items: [], total: 0, page: 0, size: 20 });
  });

  it('listarPagos: GET /cuentas-proveedores/pagos con filtros', () => {
    repo.listarPagos({ id_proveedor: 3, id_periodo: 19, estado: 'VIGENTE', page: 0, size: 10 }).subscribe();

    const req = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/pagos');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('id_proveedor')).toBe('3');
    expect(req.request.params.get('id_periodo')).toBe('19');
    expect(req.request.params.get('estado')).toBe('VIGENTE');
    req.flush({ items: [], total: 0, page: 0, size: 10 });
  });

  it('registrarPago y anularPago: POST con Idempotency-Key', () => {
    const cuerpo = { id_proveedor: 3, id_periodo_liquidado: 19, monto: 50000, metodo_pago: 'TRANSFERENCIA' as const };
    repo.registrarPago(cuerpo, 'clave-pago-prov-001').subscribe();

    const a = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/pagos');
    expect(a.request.method).toBe('POST');
    expect(a.request.body).toEqual(cuerpo);
    expect(a.request.headers.get('Idempotency-Key')).toBe('clave-pago-prov-001');
    a.flush({}, { status: 201, statusText: 'Created' });

    repo.anularPago(10, 'Error en el valor registrado', 'clave-anular-pago-001').subscribe();
    const b = http.expectOne((r) => ruta(r.url) === '/api/v1/cuentas-proveedores/pagos/10/anular');
    expect(b.request.method).toBe('POST');
    expect(b.request.body).toEqual({ motivo: 'Error en el valor registrado' });
    expect(b.request.headers.get('Idempotency-Key')).toBe('clave-anular-pago-001');
    b.flush({});
  });
});
