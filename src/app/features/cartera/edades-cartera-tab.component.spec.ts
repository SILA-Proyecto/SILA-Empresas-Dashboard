import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { CARTERA_REPOSITORY } from './data/cartera.provider';
import { EdadesCarteraTabComponent } from './edades-cartera-tab.component';
import type { ClienteEdades } from './models/cartera.models';

const EDADES = {
  fecha_corte: '2026-10-17',
  total: 1250000,
  clientes: 7,
  rangos: [
    { clave: 'AL_DIA', etiqueta: 'Al dia (no vencida)', saldo: 800000, clientes: 5 },
    { clave: 'MORA_1_15', etiqueta: 'Mora de 1 a 15 dias', saldo: 200000, clientes: 2 },
    { clave: 'MORA_16_30', etiqueta: 'Mora de 16 a 30 dias', saldo: 150000, clientes: 1 },
    { clave: 'MORA_31_60', etiqueta: 'Mora de 31 a 60 dias', saldo: 100000, clientes: 1 },
    { clave: 'MORA_MAS_60', etiqueta: 'Mora de mas de 60 dias', saldo: 0, clientes: 0 },
  ],
};
const CLIENTE: ClienteEdades = {
  id_cliente: 5, cliente: 'Doña Rosa', telefono: '300', saldo_total: 300000, ventas_pendientes: 2, dias_mora_max: 40,
  al_dia: 200000, mora_leve: 0, mora_media: 0, mora_alta: 100000, mora_critica: 0,
};

describe('EdadesCarteraTabComponent', () => {
  let repo: { edades: ReturnType<typeof vi.fn>; edadesClientes: ReturnType<typeof vi.fn>; ventasPendientes: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    const d = HTMLDialogElement.prototype;
    d.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    d.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  async function crear(): Promise<ComponentFixture<EdadesCarteraTabComponent>> {
    repo = {
      edades: vi.fn(() => of(EDADES)),
      edadesClientes: vi.fn(() => of({ items: [CLIENTE], total: 1, page: 0, size: 10 })),
      ventasPendientes: vi.fn(() => of([])),
    };
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => ''), { provide: CARTERA_REPOSITORY, useValue: repo }] });
    const f = TestBed.createComponent(EdadesCarteraTabComponent);
    await asentar(f);
    return f;
  }
  async function asentar(f: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 6; i++) {
      f.detectChanges();
      await f.whenStable();
    }
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const texto = (f: ComponentFixture<unknown>, sel: string) => (raiz(f).querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ');

  it('muestra el total y los cinco rangos que calcula el servidor, de «al día» a «más de 60 días»', async () => {
    const f = await crear();

    expect(texto(f, '[data-testid=edades-total]')).toContain('1.250.000');
    expect(texto(f, '[data-testid=edades-total]')).toContain('7 clientes');
    const botones = Array.from(raiz(f).querySelectorAll('[data-testid^=rango-]')).map((b) => b.getAttribute('data-testid'));
    expect(botones).toEqual(['rango-AL_DIA', 'rango-MORA_1_15', 'rango-MORA_16_30', 'rango-MORA_31_60', 'rango-MORA_MAS_60']);
    expect(texto(f, '[data-testid=rango-AL_DIA]')).toContain('800.000');
    expect(texto(f, '[data-testid=rango-AL_DIA]')).toContain('5 clientes');
    expect(texto(f, '[data-testid=rango-MORA_31_60]')).toContain('1 cliente');
    expect(texto(f, '[data-testid=rango-MORA_MAS_60]')).toContain('$ 0');
  });

  it('la tabla arranca por la deuda total, de mayor a menor, y trae el desglose por edad de cada cliente', async () => {
    const f = await crear();

    expect(repo.edadesClientes).toHaveBeenCalledWith(expect.objectContaining({ sort: 'saldo_total,desc', page: 0 }));
    const fila = raiz(f).querySelector('tbody tr')!.textContent!.replace(/\s+/g, ' ');
    expect(fila).toContain('Doña Rosa');
    expect(fila).toContain('300.000');
    expect(fila).toContain('200.000');
    expect(fila).toContain('100.000');
    expect(fila).toContain('40 días');
  });

  it('tocar un rango ordena la tabla por esa columna y lo marca como activo', async () => {
    const f = await crear();
    expect(raiz(f).querySelector('[data-testid=rango-MORA_31_60]')!.getAttribute('aria-pressed')).toBe('false');

    repo.edadesClientes.mockClear();
    raiz(f).querySelector<HTMLButtonElement>('[data-testid=rango-MORA_31_60]')!.click();
    await asentar(f);

    expect(repo.edadesClientes).toHaveBeenCalledWith(expect.objectContaining({ sort: 'mora_alta,desc' }));
    expect(raiz(f).querySelector('[data-testid=rango-MORA_31_60]')!.getAttribute('aria-pressed')).toBe('true');
    expect(raiz(f).querySelector('[data-testid=rango-AL_DIA]')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('«Ver ventas» abre el detalle de ese cliente con el servicio que ya existe', async () => {
    const f = await crear();
    Array.from(raiz(f).querySelectorAll<HTMLButtonElement>('tbody button')).find((b) => b.textContent!.includes('Ver ventas'))!.click();
    await asentar(f);

    expect(repo.ventasPendientes).toHaveBeenCalledWith(5);
  });

  it('si el resumen falla lo dice y deja reintentar; la tabla sigue funcionando', async () => {
    const f = await crear();
    TestBed.resetTestingModule();
    repo = { edades: vi.fn(() => { throw new Error('x'); }), edadesClientes: vi.fn(() => of({ items: [CLIENTE], total: 1, page: 0, size: 10 })), ventasPendientes: vi.fn(() => of([])) };
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => ''), { provide: CARTERA_REPOSITORY, useValue: repo }] });
    const g = TestBed.createComponent(EdadesCarteraTabComponent);
    await asentar(g);

    expect(raiz(g).querySelector('[role=alert]')!.textContent).toContain('No se pudo cargar');
    expect(raiz(g).querySelectorAll('tbody tr').length).toBe(1);
    expect(f).toBeTruthy();
  });
});
