import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of, throwError } from 'rxjs';
import { hoyColombia } from '../../shared/utils/fecha-co';
import { REPORTES_REPOSITORY } from './data/reportes.provider';
import { MargenPageComponent, leerMargen } from './margen-page.component';
import type { MargenFila, MargenRespuesta } from './models/reportes.models';
import { rangosRapidos } from './rangos-fecha';

const fila = (id: number, extra: Partial<MargenFila> = {}): MargenFila => ({
  id, nombre: `Producto ${id}`, codigo_sku: `P-${id}`, unidades: 10, ingreso: 100000, costo: 60000, margen: 40000, margen_pct: 40, lineas_sin_costo: 0, ...extra,
});
const respuesta = (items: MargenFila[], extra: Partial<MargenRespuesta['totales']> = {}): MargenRespuesta => ({
  agrupar: 'PRODUCTO', desde: '2026-10-01', hasta: '2026-10-17',
  totales: { ingreso: 500000, costo: 300000, margen: 200000, margen_pct: 40, lineas_sin_costo: 0, ...extra },
  items,
});

describe('MargenPageComponent', () => {
  let repo: { margen: ReturnType<typeof vi.fn> };
  const hoy = hoyColombia();
  const mes = rangosRapidos(hoy)[0];

  async function crear(datos: MargenRespuesta = respuesta([fila(1)])): Promise<ComponentFixture<MargenPageComponent>> {
    repo = { margen: vi.fn(() => of(datos)) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNgIconLoader(async () => ''), { provide: REPORTES_REPOSITORY, useValue: repo }] });
    const f = TestBed.createComponent(MargenPageComponent);
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
  const clic = async (f: ComponentFixture<unknown>, sel: string) => {
    raiz(f).querySelector<HTMLElement>(sel)!.click();
    await asentar(f);
  };
  const poner = async (f: ComponentFixture<unknown>, sel: string, valor: string) => {
    const el = raiz(f).querySelector<HTMLInputElement>(sel)!;
    el.value = valor;
    el.dispatchEvent(new Event('change'));
    await asentar(f);
  };

  it('arranca con el mes en curso hasta hoy, por producto y de mayor a menor ganancia, y avisa que es una estimación', async () => {
    const f = await crear();

    expect(repo.margen).toHaveBeenCalledExactlyOnceWith({ agrupar: 'PRODUCTO', desde: mes.desde, hasta: hoy, sort: 'margen,desc' });
    expect(texto(f, '[data-testid=aviso-estimado]')).toContain('estimado');
    expect(texto(f, '[data-testid=aviso-estimado]')).toContain('costo promedio');
  });

  it('muestra los totales en pesos y en porcentaje', async () => {
    const f = await crear();

    expect(texto(f, '[data-testid=total-ingreso]')).toContain('500.000');
    expect(texto(f, '[data-testid=total-costo]')).toContain('300.000');
    expect(texto(f, '[data-testid=total-margen]')).toContain('200.000');
    expect(texto(f, '[data-testid=total-pct]')).toContain('40 %');
    expect(raiz(f).querySelector('[data-testid=aviso-sin-costo]')).toBeNull();
  });

  it('avisa cuántas líneas no tienen costo, y sin ningún costo conocido el porcentaje es «—»', async () => {
    const f = await crear(respuesta([fila(1, { margen_pct: null, costo: 0, margen: 0, lineas_sin_costo: 2 })], { costo: 0, margen: 0, margen_pct: null, lineas_sin_costo: 2 }));

    expect(texto(f, '[data-testid=aviso-sin-costo]')).toContain('2 líneas de venta sin costo');
    expect(texto(f, '[data-testid=aviso-sin-costo]')).toContain('producto sin producción registrada');
    expect(texto(f, '[data-testid=total-pct]').trim()).toBe('—');
    expect(texto(f, 'tbody tr')).toContain('Sin costo');
  });

  it('una ganancia negativa va en rojo y con su signo', async () => {
    const f = await crear(respuesta([fila(1, { ingreso: 100000, costo: 130000, margen: -30000, margen_pct: -30 })], { margen: -30000, margen_pct: -30 }));

    expect(texto(f, '[data-testid=total-margen]')).toContain('−');
    expect(raiz(f).querySelector('[data-testid=total-margen].text-destructive')).toBeTruthy();
    expect(texto(f, 'tbody tr')).toContain('Pierde plata');
  });

  it('cambiar a «Cliente» vuelve a pedir y quita la columna de código', async () => {
    const f = await crear();
    expect(texto(f, 'thead')).toContain('Código');

    repo.margen.mockClear();
    await clic(f, '[data-testid=agrupar-CLIENTE]');

    expect(repo.margen).toHaveBeenCalledWith(expect.objectContaining({ agrupar: 'CLIENTE' }));
    expect(texto(f, 'thead')).not.toContain('Código');
    expect(texto(f, 'thead')).toContain('Cliente');
  });

  it('los atajos de período cambian las fechas y piden de nuevo', async () => {
    const f = await crear();
    const anterior = rangosRapidos(hoy).find((r) => r.id === 'mes-pasado')!;

    repo.margen.mockClear();
    await clic(f, '[data-testid=atajo-mes-pasado]');

    expect(repo.margen).toHaveBeenCalledWith(expect.objectContaining({ desde: anterior.desde, hasta: anterior.hasta }));
    expect(raiz(f).querySelector('[data-testid=atajo-mes-pasado]')!.getAttribute('aria-pressed')).toBe('true');
    expect(raiz(f).querySelector<HTMLInputElement>('#margen-desde')!.value).toBe(anterior.desde);
  });

  it('con «Desde» posterior a «Hasta» lo dice y NO pide al servidor', async () => {
    const f = await crear();

    await poner(f, '#margen-desde', hoy);
    repo.margen.mockClear();
    await poner(f, '#margen-hasta', '2000-01-01');

    expect(texto(f, '[data-testid=fechas-invalidas]')).toContain('no sea posterior');
    expect(repo.margen).not.toHaveBeenCalled();
  });

  it('ordenar por una columna pide al servidor con esa columna', async () => {
    const f = await crear();

    repo.margen.mockClear();
    const encabezado = Array.from(raiz(f).querySelectorAll<HTMLButtonElement>('thead button')).find((b) => b.textContent!.includes('Vendido'))!;
    encabezado.click();
    await asentar(f);

    expect(repo.margen).toHaveBeenCalledWith(expect.objectContaining({ sort: expect.stringMatching(/^ingreso,(asc|desc)$/) }));
  });

  it('pagina en pantalla las filas que el servidor trae juntas (hasta 500)', async () => {
    const f = await crear(respuesta(Array.from({ length: 25 }, (_, i) => fila(i + 1))));

    expect(raiz(f).querySelectorAll('tbody tr').length).toBe(10);
    expect(raiz(f).textContent).toContain('de 25');
    const siguiente = Array.from(raiz(f).querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes('Siguiente'))!;
    siguiente.click();
    await asentar(f);
    expect(texto(f, 'tbody tr')).toContain('Producto 11');
    expect(repo.margen).toHaveBeenCalledTimes(1);
  });

  it('un error del servidor se muestra y deja reintentar', async () => {
    repo = { margen: vi.fn(() => throwError(() => ({ code: 20008, message: 'No tienes permiso para realizar esta acción.' }))) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNgIconLoader(async () => ''), { provide: REPORTES_REPOSITORY, useValue: repo }] });
    const f = TestBed.createComponent(MargenPageComponent);
    await asentar(f);

    expect(raiz(f).querySelector('[role=alert]')!.textContent).toContain('No tienes permiso');
    expect(Array.from(raiz(f).querySelectorAll('button')).some((b) => b.textContent!.includes('Reintentar'))).toBe(true);
  });
});

describe('leerMargen', () => {
  it('lo dice con palabras: sin costo, pierde plata, margen bajo o bien', () => {
    expect(leerMargen({ margen: 0, margen_pct: null, lineas_sin_costo: 1 }).texto).toBe('Sin costo');
    expect(leerMargen({ margen: -1, margen_pct: -0.5, lineas_sin_costo: 0 }).texto).toBe('Pierde plata');
    expect(leerMargen({ margen: 5, margen_pct: 9.9, lineas_sin_costo: 0 })).toEqual({ texto: 'Margen bajo', tono: 'alerta' });
    expect(leerMargen({ margen: 10, margen_pct: 10, lineas_sin_costo: 0 })).toEqual({ texto: 'Bien', tono: 'exito' });
  });
});
