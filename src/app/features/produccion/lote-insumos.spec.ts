import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { of, throwError } from 'rxjs';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import type { Receta } from '../catalogos/models/catalogos.models';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import { ConsumosLoteDialogComponent } from './consumos-lote-dialog.component';
import { PRODUCCION_REPOSITORY } from './data/produccion.provider';
import { LoteDialogComponent } from './lote-dialog.component';
import type { Lote } from './models/produccion.models';

const RECETA: Receta = {
  id_producto: 7, codigo_sku: 'AREQ', producto: 'Arequipe', costo_insumos_unitario: 2500, unidades_posibles: 40,
  lineas: [{ id_insumo: 1, codigo_insumo: 'AZUCAR', insumo: 'Azúcar', unidad_insumo: 'KG', cantidad_por_unidad: 0.5, costo_unitario_insumo: 5000, valor_por_unidad: 2500, stock_insumo: 20, insumo_activo: true }],
};

async function estabilizar(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    f.detectChanges();
    await f.whenStable();
  }
}
const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const texto = (f: ComponentFixture<unknown>, sel: string) => (raiz(f).querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Lote con receta', () => {
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

  let produccion: { crearLote: ReturnType<typeof vi.fn> };

  async function crearDialogo(receta = RECETA): Promise<ComponentFixture<LoteDialogComponent>> {
    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        { provide: PRODUCCION_REPOSITORY, useValue: (produccion = { crearLote: vi.fn() }) },
        { provide: CATALOGOS_REPOSITORY, useValue: { obtenerReceta: vi.fn(() => of(receta)) } },
      ],
    });
    const f = TestBed.createComponent(LoteDialogComponent);
    f.componentRef.setInput('productos', [{ id_producto: 7, nombre: 'Arequipe', codigo_sku: 'AREQ', unidad_medida: 'UND' }]);
    f.componentRef.setInput('abierto', true);
    await estabilizar(f);
    raiz(f).querySelector<HTMLInputElement>('#lote-producto')!.dispatchEvent(new Event('focus'));
    await estabilizar(f);
    raiz(f).querySelector('#lote-producto-lista [role="option"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await estabilizar(f);
    return f;
  }
  async function cantidad(f: ComponentFixture<unknown>, valor: string): Promise<void> {
    const el = raiz(f).querySelector<HTMLInputElement>('[formcontrolname=cantidad_obtenida]')!;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    await estabilizar(f);
  }

  it('calcula en vivo lo que gastará cada insumo y avisa lo que falta (cantidad × cantidad por unidad vs stock)', async () => {
    const f = await crearDialogo();
    await cantidad(f, '50'); // 50 × 0,5 = 25 KG y solo hay 20

    expect(texto(f, '[data-testid=insumos-lote]')).toContain('se necesitan 25 KG');
    expect(texto(f, '[data-testid=insumos-lote]')).toContain('hay 20');
    expect(texto(f, '[data-testid=falta-insumo]')).toBe('Falta 5 KG');
    expect(raiz(f).querySelector('[data-testid=insumos-lote] .text-destructive')).toBeTruthy();
  });

  it('si el stock alcanza no hay aviso de faltante', async () => {
    const f = await crearDialogo();
    await cantidad(f, '30'); // 15 KG de 20

    expect(texto(f, '[data-testid=insumos-lote]')).toContain('se necesitan 15 KG');
    expect(raiz(f).querySelector('[data-testid=falta-insumo]')).toBeNull();
  });

  it('si el servidor responde 409 «Falta <insumo>…» se muestra ese mensaje (no el genérico) y el diálogo sigue abierto', async () => {
    const f = await crearDialogo();
    produccion.crearLote.mockReturnValue(throwError(() => ({ code: 20002, message: 'Falta Azúcar: se necesitan 50 y hay 9.' })));
    await cantidad(f, '100');
    for (const [n, v] of [['litros_leche_usados', '10']]) {
      const el = raiz(f).querySelector<HTMLInputElement>(`[formcontrolname=${n}]`)!;
      el.value = v;
      el.dispatchEvent(new Event('input'));
    }
    await estabilizar(f);
    raiz(f).querySelector('#lote-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(produccion.crearLote).toHaveBeenCalledTimes(1);
    expect(produccion.crearLote.mock.calls[0][0]).not.toHaveProperty('costo_por_litro');
    expect(texto(f, '[role=alert]')).toContain('Falta Azúcar: se necesitan 50 y hay 9.');
    expect(texto(f, '[role=alert]')).not.toContain('Stock insuficiente');
  });

  it('un producto con leche en la receta sugiere los litros esperados y avisa si difiere > 10 %', async () => {
    const recetaConLeche: Receta = {
      ...RECETA,
      lineas: [
        { id_insumo: 10, codigo_insumo: 'LECHE', insumo: 'Leche cruda', unidad_insumo: 'LT', cantidad_por_unidad: 2.5, costo_unitario_insumo: 2000, valor_por_unidad: 5000, stock_insumo: 500, insumo_activo: true },
      ],
    };
    const f = await crearDialogo(recetaConLeche);
    await cantidad(f, '20'); // 20 * 2.5 = 50 L esperados

    // Litros esperados sugeridos
    expect(texto(f, '#lote-form')).toContain('Esperado según receta: 50 L');

    // Cambiar litros reales a 70 L (diferencia de +20 L, 40 % > 10 %)
    const el = raiz(f).querySelector<HTMLInputElement>('[formcontrolname=litros_leche_usados]')!;
    el.value = '70';
    el.dispatchEvent(new Event('input'));
    await estabilizar(f);

    expect(texto(f, '[data-testid=diferencia-leche]')).toContain('Esperado 50 L');
    expect(texto(f, '[data-testid=diferencia-leche]')).toContain('Usado 70 L');
    expect(texto(f, '[data-testid=diferencia-leche]')).toContain('Dif: +20 L');
    expect(texto(f, '[data-testid=diferencia-leche]')).toContain('difiere más de 10 %');
  });

  it('una materia prima con «leche» en el nombre pero otro código no se toma por la leche cruda', async () => {
    const recetaConPolvo: Receta = {
      ...RECETA,
      lineas: [{ id_insumo: 11, codigo_insumo: 'LECHE-POLVO', insumo: 'Leche en polvo', unidad_insumo: 'KG', cantidad_por_unidad: 0.1, costo_unitario_insumo: 20000, valor_por_unidad: 2000, stock_insumo: 1, insumo_activo: true }],
    };
    const f = await crearDialogo(recetaConPolvo);
    await cantidad(f, '20');

    expect(texto(f, '#lote-form')).not.toContain('Esperado según receta');
    expect(texto(f, '[data-testid=insumos-lote]')).toContain('Leche en polvo');
  });

  it('un producto sin receta lo dice y no muestra insumos', async () => {
    const f = await crearDialogo({ ...RECETA, lineas: [], costo_insumos_unitario: 0, unidades_posibles: null });
    await cantidad(f, '30');

    expect(raiz(f).querySelector('[data-testid=insumos-lote]')).toBeNull();
    expect(raiz(f).textContent).toContain('no tiene receta');
  });
});

describe('ConsumosLoteDialogComponent', () => {
  beforeAll(() => {
    const d = HTMLDialogElement.prototype;
    d.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  });

  it('muestra el costo de la leche, el de los insumos y lo que consumió el lote', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        { provide: INSUMOS_REPOSITORY, useValue: { consumosDeLote: vi.fn(() => of([{ id_consumo: 1, id_lote: 35, codigo_lote: 'L', id_insumo: 1, codigo: 'AZUCAR', insumo: 'Azúcar', unidad_medida: 'KG', cantidad: 5, costo_unitario: 5000, valor: 25000 }])) } },
      ],
    });
    const f = TestBed.createComponent(ConsumosLoteDialogComponent);
    f.componentRef.setInput('lote', { id_lote: 35, codigo_lote: 'L-1', producto: 'Arequipe', costo_leche: 100000, costo_insumos: 25000, costo_total: 125000 } as Lote);
    await estabilizar(f);

    const costos = texto(f, '[data-testid=costos-lote]');
    expect(costos).toContain('100.000');
    expect(costos).toContain('25.000');
    expect(costos).toContain('125.000');
    expect(texto(f, '[data-testid=consumos]')).toContain('Azúcar');
    expect(texto(f, '[data-testid=consumos]')).toContain('5 KG');
  });
});
