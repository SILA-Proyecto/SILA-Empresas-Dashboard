import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { crearEmpresaFalsa } from '../../core/empresa/testing/empresa-falsa';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../../core/empresa/empresa.models';
import { AuthService } from '../../core/services/auth.service';
import { ACOPIO_REPOSITORY } from '../acopio/data/acopio.provider';
import { CUENTAS_PROVEEDORES_REPOSITORY } from '../cuentas-proveedores/data/cuentas-proveedores.provider';
import { CompraDialogComponent } from './compra-dialog.component';
import { INSUMOS_REPOSITORY } from './data/insumos.provider';
import type { Insumo } from './models/insumos.models';

const LECHE: Insumo = { id_insumo: 2, codigo: 'LECHE', nombre: 'Leche cruda', unidad_medida: 'LT', costo_promedio: 2200, stock_actual: 500, stock_minimo: 100, valor_inventario: 1100000, bajo_minimo: false, productos_que_lo_usan: 5, activo: true, requiere_calidad: true };

async function estabilizar(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    f.detectChanges();
    await f.whenStable();
  }
}

describe('Compra de leche según los módulos de la empresa', () => {
  let repo: { crearCompra: ReturnType<typeof vi.fn> };
  let acopio: { umbrales: ReturnType<typeof vi.fn> };

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

  async function abrir(activos: readonly CodigoModulo[]): Promise<ComponentFixture<CompraDialogComponent>> {
    repo = { crearCompra: vi.fn(() => of({ id_compra: 1, insumo: 'Leche cruda', unidad_medida: 'LT', cantidad: 100, costo_unitario: 2200 })) };
    acopio = { umbrales: vi.fn(() => of({ temperatura_max: 10, acidez_max: 18 })) };
    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        provideRouter([]),
        { provide: EmpresaService, useValue: crearEmpresaFalsa(activos) },
        { provide: INSUMOS_REPOSITORY, useValue: repo },
        { provide: ACOPIO_REPOSITORY, useValue: acopio },
        { provide: CUENTAS_PROVEEDORES_REPOSITORY, useValue: { listarPrecios: vi.fn(() => of({ items: [], total: 0, page: 0, size: 1 })) } },
      ],
    });
    TestBed.inject(AuthService).sesion.set({ id_usuario: 2, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'OPERATIVO', mfa_activo: true });
    const f = TestBed.createComponent(CompraDialogComponent);
    f.componentRef.setInput('insumos', [LECHE]);
    f.componentRef.setInput('proveedores', [{ valor: 3, etiqueta: 'Finca La Pradera' }]);
    f.componentRef.setInput('abierto', true);
    await estabilizar(f);
    await elegir(f, 'compra-insumo');
    await elegir(f, 'compra-proveedor');
    return f;
  }

  async function elegir(f: ComponentFixture<unknown>, id: string): Promise<void> {
    const raiz = f.nativeElement as HTMLElement;
    raiz.querySelector<HTMLInputElement>(`#${id}`)!.dispatchEvent(new Event('focus'));
    await estabilizar(f);
    raiz.querySelectorAll(`#${id}-lista [role="option"]`)[0]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await estabilizar(f);
  }

  function escribir(f: ComponentFixture<unknown>, selector: string, valor: string): void {
    const el = (f.nativeElement as HTMLElement).querySelector<HTMLInputElement>(selector)!;
    el.value = valor;
    el.dispatchEvent(new Event('input'));
  }

  it('con CALIDAD_LECHE: pide temperatura y acidez, consulta los umbrales y los envía', async () => {
    const f = await abrir(MODULOS_OPCIONALES);
    const raiz = f.nativeElement as HTMLElement;

    expect(raiz.querySelector('[formcontrolname=temperatura]')).not.toBeNull();
    expect(raiz.querySelector('[formcontrolname=acidez]')).not.toBeNull();
    expect(acopio.umbrales).toHaveBeenCalled();

    escribir(f, '[formcontrolname=cantidad]', '100');
    escribir(f, '[formcontrolname=temperatura]', '7.5');
    escribir(f, '[formcontrolname=acidez]', '16');
    await estabilizar(f);
    raiz.querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo.crearCompra.mock.calls[0][0]).toMatchObject({ temperatura: 7.5, acidez: 16 });
  });

  it('con CALIDAD_LECHE: sin temperatura ni acidez no deja registrar', async () => {
    const f = await abrir(MODULOS_OPCIONALES);
    escribir(f, '[formcontrolname=cantidad]', '100');
    await estabilizar(f);

    (f.nativeElement as HTMLElement).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo.crearCompra).not.toHaveBeenCalled();
  });

  it('sin CALIDAD_LECHE: no hay campos de calidad, no se piden umbrales (el backend diría 20020) y se registra con solo los litros y el proveedor', async () => {
    const f = await abrir(MODULOS_OPCIONALES.filter((m) => m !== 'CALIDAD_LECHE'));
    const raiz = f.nativeElement as HTMLElement;

    expect(raiz.querySelector('[formcontrolname=temperatura]')).toBeNull();
    expect(raiz.querySelector('[formcontrolname=acidez]')).toBeNull();
    expect(raiz.textContent).not.toContain('Control de calidad de la leche');
    expect(acopio.umbrales).not.toHaveBeenCalled();

    escribir(f, '[formcontrolname=cantidad]', '100');
    await estabilizar(f);
    raiz.querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo.crearCompra).toHaveBeenCalledTimes(1);
    const [cuerpo] = repo.crearCompra.mock.calls[0];
    expect(cuerpo).toMatchObject({ id_insumo: 2, id_proveedor: 3, cantidad: 100 });
    expect(cuerpo).not.toHaveProperty('temperatura');
    expect(cuerpo).not.toHaveProperty('acidez');
  });
});
