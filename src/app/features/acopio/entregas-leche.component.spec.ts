import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import type { Compra } from '../insumos/models/insumos.models';
import { EntregasLecheComponent } from './entregas-leche.component';

const compra = (id: number, extra: Partial<Compra> = {}): Compra =>
  ({
    id_compra: id, id_insumo: 7, codigo: 'LECHE', insumo: 'Leche cruda', unidad_medida: 'LT', id_proveedor: 3, proveedor: 'Finca La Pradera', id_periodo: 19,
    fecha: '2026-10-15', cantidad: 250, valor_total: 437500, costo_unitario: 1750, referencia: null, estado: 'VIGENTE', motivo_anulacion: null, usuario_registro: 'ana',
    fecha_registro: '2026-10-15T08:00:00', contado: false, comprado_en: null, estado_calidad: 'APROBADO', temperatura: 6, acidez: 15, motivo_rechazo: null, ...extra,
  }) as Compra;

describe('EntregasLecheComponent', () => {
  let insumos: { listar: ReturnType<typeof vi.fn>; listarCompras: ReturnType<typeof vi.fn> };

  async function crear(compras: Compra[] = [compra(1)]): Promise<ComponentFixture<EntregasLecheComponent>> {
    insumos = {
      // «Leche en polvo» also matches the text «LECHE»: only the code LECHE is the milk.
      listar: vi.fn(() => of({ items: [{ id_insumo: 9, codigo: 'LECHE-POLVO' }, { id_insumo: 7, codigo: 'LECHE' }], total: 2, page: 0, size: 20 })),
      listarCompras: vi.fn(() => of({ items: compras, total: compras.length, page: 0, size: 10 })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        { provide: INSUMOS_REPOSITORY, useValue: insumos },
        { provide: CATALOGOS_REPOSITORY, useValue: { listarProveedores: vi.fn(() => of({ items: [{ id_proveedor: 3, nombre: 'Finca La Pradera' }], total: 1, page: 0, size: 100 })) } },
      ],
    });
    const f = TestBed.createComponent(EntregasLecheComponent);
    f.componentRef.setInput('umbrales', { temperatura_max: 10, acidez_max: 18 });
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
  const fila = (f: ComponentFixture<unknown>, n = 0) => (raiz(f).querySelectorAll('tbody tr')[n]?.textContent ?? '').replace(/\s+/g, ' ');

  it('pide solo las compras de la LECHE (por su código, no por el texto) y de la más reciente a la más antigua', async () => {
    await crear();

    expect(insumos.listarCompras).toHaveBeenCalledWith(expect.objectContaining({ id_insumo: 7, sort: 'fecha,desc' }));
    expect(insumos.listarCompras.mock.calls.every(([q]) => q.id_insumo === 7)).toBe(true);
  });

  it('cada entrega muestra fecha, proveedor, litros recibidos, temperatura, acidez y que fue aprobada', async () => {
    const f = await crear();

    const texto = fila(f);
    expect(texto).toContain('15/10/2026');
    expect(texto).toContain('Finca La Pradera');
    expect(texto).toContain('250 L');
    expect(texto).toContain('6 °C');
    expect(texto).toContain('15 °D');
    expect(texto).toContain('Aprobada');
  });

  it('una entrega rechazada lo dice con su motivo, y marca en rojo la cifra que pasó el límite', async () => {
    const f = await crear([compra(2, { cantidad: 120, temperatura: 15, acidez: 16, estado_calidad: 'RECHAZADO', motivo_rechazo: 'Temperatura 15 °C supera el máximo de 10 °C' })]);

    expect(fila(f)).toContain('Rechazada');
    expect(fila(f)).toContain('Temperatura 15 °C supera el máximo de 10 °C');
    const rojos = Array.from(raiz(f).querySelectorAll('tbody .text-destructive')).map((e) => e.textContent!.trim());
    expect(rojos).toContain('15 °C');
    expect(rojos).not.toContain('16 °D');
  });

  it('un rechazo sin motivo escrito muestra el texto de siempre, y una anulada no se pasa por aprobada', async () => {
    const f = await crear([compra(3, { estado_calidad: 'RECHAZADO', motivo_rechazo: null }), compra(4, { estado: 'ANULADA' })]);

    expect(fila(f, 0)).toContain('No superó los umbrales de calidad');
    expect(fila(f, 1)).toContain('Anulada');
    expect(fila(f, 1)).not.toContain('Aprobada');
  });

  it('filtrar por control de calidad vuelve a pedir con ese filtro', async () => {
    const f = await crear();
    insumos.listarCompras.mockClear();

    const sel = raiz(f).querySelector<HTMLSelectElement>('#entregas-calidad')!;
    sel.value = 'RECHAZADO';
    sel.dispatchEvent(new Event('change'));
    await asentar(f);

    expect(insumos.listarCompras).toHaveBeenCalledWith(expect.objectContaining({ id_insumo: 7, estado_calidad: 'RECHAZADO' }));
  });

  it('«Descargar para Excel» está disponible', async () => {
    const f = await crear();
    expect(Array.from(raiz(f).querySelectorAll('button')).some((b) => b.textContent!.includes('Descargar para Excel'))).toBe(true);
  });
});
