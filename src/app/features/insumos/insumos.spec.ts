import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, Rol } from '../../core/services/auth.service';
import { AjusteInsumoDialogComponent } from './ajuste-insumo-dialog.component';
import { CompraDialogComponent } from './compra-dialog.component';
import { ComprasTabComponent } from './compras-tab.component';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { InsumoDialogComponent } from './insumo-dialog.component';
import { InsumosTabComponent } from './insumos-tab.component';
import { ACOPIO_REPOSITORY } from '../acopio/data/acopio.provider';
import { CUENTAS_PROVEEDORES_REPOSITORY } from '../cuentas-proveedores/data/cuentas-proveedores.provider';
import { INSUMOS_REPOSITORY } from './data/insumos.provider';
import type { Insumo } from './models/insumos.models';

const AZUCAR: Insumo = { id_insumo: 1, codigo: 'AZUCAR', nombre: 'Azúcar', unidad_medida: 'KG', costo_promedio: 5000, stock_actual: 20, stock_minimo: 5, valor_inventario: 100000, bajo_minimo: false, productos_que_lo_usan: 2, activo: true };
const LECHE: Insumo = { id_insumo: 2, codigo: 'LECHE', nombre: 'Leche cruda', unidad_medida: 'LT', costo_promedio: 2200, stock_actual: 500, stock_minimo: 100, valor_inventario: 1100000, bajo_minimo: false, productos_que_lo_usan: 5, activo: true, requiere_calidad: true };
const PROVEEDOR_1 = { valor: 3, etiqueta: 'Finca La Pradera' };

async function estabilizar(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    f.detectChanges();
    await f.whenStable();
  }
}
const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;

async function elegirInsumo(f: ComponentFixture<unknown>, id: string, opcionIndex = 0): Promise<void> {
  raiz(f).querySelector<HTMLInputElement>(`#${id}`)!.dispatchEvent(new Event('focus'));
  await estabilizar(f);
  const opciones = raiz(f).querySelectorAll(`#${id}-lista [role="option"]`);
  opciones[opcionIndex]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  await estabilizar(f);
}
function escribir(f: ComponentFixture<unknown>, selector: string, valor: string): void {
  const el = raiz(f).querySelector<HTMLInputElement>(selector)!;
  el.value = valor;
  el.dispatchEvent(new Event('input'));
}

describe('Insumos', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let acopioRepo: Record<string, ReturnType<typeof vi.fn>>;
  let cuentasRepo: Record<string, ReturnType<typeof vi.fn>>;

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

  beforeEach(() => {
    repo = {
      crearCompra: vi.fn(() => of({ id_compra: 1, insumo: 'Azúcar', unidad_medida: 'KG', cantidad: 10, costo_unitario: 4000 })),
      crearAjuste: vi.fn(() => of({})),
    };
    acopioRepo = {
      umbrales: vi.fn(() => of({ temperatura_max: 10, acidez_max: 18 })),
    };
    cuentasRepo = {
      listarPrecios: vi.fn(() => of({ items: [{ precio_unitario: 2150 }], total: 1, page: 0, size: 1 })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        provideRouter([]),
        { provide: INSUMOS_REPOSITORY, useValue: repo },
        { provide: ACOPIO_REPOSITORY, useValue: acopioRepo },
        { provide: CUENTAS_PROVEEDORES_REPOSITORY, useValue: cuentasRepo },
        { provide: CATALOGOS_REPOSITORY, useValue: { listarProveedores: vi.fn(() => of({ items: [], total: 0, page: 0, size: 100, total_pages: 0 })) } },
      ],
    });

    TestBed.inject(AuthService).sesion.set({
      id_usuario: 1,
      usuario: 'kevin.test',
      nombre: 'Kevin',
      email: 'kevin@example.com',
      rol: 'ADMIN',
      mfa_activo: true,
    });
  });

  describe('compra', () => {
    async function crear(insumos = [AZUCAR], proveedores = [PROVEEDOR_1]): Promise<ComponentFixture<CompraDialogComponent>> {
      const f = TestBed.createComponent(CompraDialogComponent);
      f.componentRef.setInput('insumos', insumos);
      f.componentRef.setInput('proveedores', proveedores);
      f.componentRef.setInput('abierto', true);
      await estabilizar(f);
      return f;
    }

    it('muestra el costo unitario (valor de la factura ÷ cantidad) antes de enviar', async () => {
      const f = await crear();
      await elegirInsumo(f, 'compra-insumo');
      escribir(f, '[formcontrolname=cantidad]', '10');
      escribir(f, '[formcontrolname=valor_total]', '40000');
      await estabilizar(f);

      const texto = (raiz(f).querySelector('[data-testid=costo-unitario]')?.textContent ?? '').replace(/\s+/g, ' ');
      expect(texto).toContain('4.000');
      expect(texto).toContain('por KG');
    });

    it('un valor total de 0 no se envía en silencio: el formulario lo rechaza', async () => {
      const f = await crear();
      await elegirInsumo(f, 'compra-insumo');
      escribir(f, '[formcontrolname=cantidad]', '10');
      escribir(f, '[formcontrolname=valor_total]', '0');
      await estabilizar(f);
      raiz(f).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      expect(repo['crearCompra']).not.toHaveBeenCalled();
      expect(raiz(f).textContent).toContain('mayor');
    });

    it('envía el valor total de la factura (no un precio unitario), contado=true sin proveedor y una Idempotency-Key', async () => {
      const f = await crear();
      await elegirInsumo(f, 'compra-insumo');
      escribir(f, '[formcontrolname=cantidad]', '10');
      escribir(f, '[formcontrolname=valor_total]', '40000');
      escribir(f, '[formcontrolname=referencia]', 'FACT-1');
      await estabilizar(f);
      raiz(f).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      const [cuerpo, clave] = repo['crearCompra'].mock.calls[0];
      expect(cuerpo).toMatchObject({ id_insumo: 1, cantidad: 10, valor_total: 40000, referencia: 'FACT-1', contado: true });
      expect(cuerpo.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect('id_proveedor' in cuerpo).toBe(false);
      expect(clave.length).toBeGreaterThanOrEqual(8);
    });

    it('con proveedor y sin valor total: no envía valor_total (el servidor usa el precio pactado), queda a crédito y muestra el precio pactado', async () => {
      const f = await crear();
      await elegirInsumo(f, 'compra-insumo');
      await elegirInsumo(f, 'compra-proveedor', 1); // la opción 0 es «Sin proveedor»
      escribir(f, '[formcontrolname=cantidad]', '10');
      await estabilizar(f);

      expect(cuentasRepo['listarPrecios']).toHaveBeenCalledWith(expect.objectContaining({ id_proveedor: 3, id_insumo: 1, solo_vigentes: true }));
      expect((raiz(f).textContent ?? '').replace(/\s+/g, ' ')).toContain('2.150');

      raiz(f).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      const [cuerpo] = repo['crearCompra'].mock.calls[0];
      expect(cuerpo).toMatchObject({ id_insumo: 1, id_proveedor: 3, cantidad: 10, contado: false });
      expect('valor_total' in cuerpo).toBe(false);
    });

    it('al volver a abrir el diálogo sin proveedor, sigue de contado y bloqueado (no se manda como crédito)', async () => {
      const f = await crear();
      f.componentRef.setInput('abierto', false);
      await estabilizar(f);
      f.componentRef.setInput('abierto', true);
      await estabilizar(f);

      const contado = raiz(f).querySelector<HTMLInputElement>('#compra-contado')!;
      expect(contado.checked).toBe(true);
      expect(contado.disabled).toBe(true);
    });

    it('sin proveedor la compra es de contado y el interruptor queda bloqueado; envía «Comprado en»', async () => {
      const f = await crear();
      await elegirInsumo(f, 'compra-insumo');
      escribir(f, '[formcontrolname=cantidad]', '4');
      escribir(f, '[formcontrolname=valor_total]', '20000');
      escribir(f, '[formcontrolname=comprado_en]', 'Plaza de mercado');
      await estabilizar(f);

      const contado = raiz(f).querySelector<HTMLInputElement>('#compra-contado')!;
      expect(contado.checked).toBe(true);
      expect(contado.disabled).toBe(true);

      raiz(f).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      const [cuerpo] = repo['crearCompra'].mock.calls[0];
      expect(cuerpo).toMatchObject({ id_insumo: 1, cantidad: 4, valor_total: 20000, contado: true, comprado_en: 'Plaza de mercado' });
      expect('id_proveedor' in cuerpo).toBe(false);
    });

    it('compra de leche por OPERATIVO con temperatura y acidez obligatorias', async () => {
      TestBed.inject(AuthService).sesion.set({
        id_usuario: 2,
        usuario: 'ana.operario',
        nombre: 'Ana',
        email: 'ana@example.com',
        rol: 'OPERATIVO',
        mfa_activo: true,
      });

      const f = await crear([LECHE]);
      await elegirInsumo(f, 'compra-insumo');
      await elegirInsumo(f, 'compra-proveedor');
      escribir(f, '[formcontrolname=cantidad]', '100');
      escribir(f, '[formcontrolname=temperatura]', '7.5');
      escribir(f, '[formcontrolname=acidez]', '16');
      await estabilizar(f);

      raiz(f).querySelector('#compra-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      expect(repo['crearCompra']).toHaveBeenCalled();
      const [cuerpo] = repo['crearCompra'].mock.calls[0];
      expect(cuerpo).toMatchObject({
        id_insumo: 2,
        id_proveedor: 3,
        cantidad: 100,
        temperatura: 7.5,
        acidez: 16,
        contado: false,
      });
    });

    it('avisa en pantalla antes de enviar si la temperatura de la leche supera el umbral máximo', async () => {
      const f = await crear([LECHE]);
      await elegirInsumo(f, 'compra-insumo');
      await elegirInsumo(f, 'compra-proveedor');
      escribir(f, '[formcontrolname=cantidad]', '100');
      escribir(f, '[formcontrolname=temperatura]', '12.5'); // Umbral max es 10
      escribir(f, '[formcontrolname=acidez]', '16');
      await estabilizar(f);

      const texto = raiz(f).textContent ?? '';
      expect(texto).toContain('Supera los umbrales máximos establecidos');
      expect(texto).toContain('RECHAZADA');
    });

    it('un OPERATIVO tiene bloqueado registrar compras de materias primas que no sean leche', async () => {
      TestBed.inject(AuthService).sesion.set({
        id_usuario: 2,
        usuario: 'ana.operario',
        nombre: 'Ana',
        email: 'ana@example.com',
        rol: 'OPERATIVO',
        mfa_activo: true,
      });

      const f = await crear([AZUCAR, LECHE]);
      await elegirInsumo(f, 'compra-insumo', 0); // Azúcar
      await estabilizar(f);

      const texto = raiz(f).textContent ?? '';
      expect(texto).toContain('Solo un administrador puede registrar compras');

      const botonSubmit = raiz(f).querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(botonSubmit?.disabled).toBe(true);
    });
  });

  describe('ajuste', () => {
    async function tipos(rol: Rol): Promise<string[]> {
      TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'a', nombre: 'A', email: 'a@example.com', rol, mfa_activo: true });
      const f = TestBed.createComponent(AjusteInsumoDialogComponent);
      f.componentRef.setInput('insumos', [AZUCAR]);
      f.componentRef.setInput('abierto', true);
      await estabilizar(f);
      return Array.from(raiz(f).querySelectorAll<HTMLOptionElement>('select option')).filter((o) => o.value).map((o) => o.value);
    }

    it('un OPERATIVO solo puede elegir MERMA, DANO y VENCIMIENTO', async () => {
      expect(await tipos('OPERATIVO')).toEqual(['MERMA', 'DANO', 'VENCIMIENTO']);
    });

    it('un ADMIN también puede elegir las dos correcciones', async () => {
      expect(await tipos('ADMIN')).toEqual(['MERMA', 'DANO', 'VENCIMIENTO', 'CORRECCION_MAS', 'CORRECCION_MENOS']);
    });
  });

  describe('materia prima leche', () => {
    it('en edición de leche deshabilita la unidad de medida y muestra la ayuda', async () => {
      const f = TestBed.createComponent(InsumoDialogComponent);
      f.componentRef.setInput('insumo', LECHE);
      f.componentRef.setInput('abierto', true);
      await estabilizar(f);

      const selectUnidad = raiz(f).querySelector<HTMLSelectElement>('select[formcontrolname="unidad_medida"]');
      expect(selectUnidad?.disabled).toBe(true);
      expect(raiz(f).textContent).toContain('La unidad de la leche no se puede cambiar.');
    });

    it('en edición de insumo normal permite cambiar la unidad de medida', async () => {
      const f = TestBed.createComponent(InsumoDialogComponent);
      f.componentRef.setInput('insumo', AZUCAR);
      f.componentRef.setInput('abierto', true);
      await estabilizar(f);

      const selectUnidad = raiz(f).querySelector<HTMLSelectElement>('select[formcontrolname="unidad_medida"]');
      expect(selectUnidad?.disabled).toBe(false);
    });

    it('en la tabla muestra etiqueta «Leche · control de calidad» y no muestra botón desactivar', async () => {
      TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'a', nombre: 'A', email: 'a@example.com', rol: 'ADMIN', mfa_activo: true });
      repo['listar'] = vi.fn(() => of({ items: [LECHE, AZUCAR], total: 2, page: 0, size: 20, total_pages: 1 }));
      repo['resumen'] = vi.fn(() => of({ total_insumos: 2, bajo_minimo: 0, valor_total: 1200000 }));

      const f = TestBed.createComponent(InsumosTabComponent);
      await estabilizar(f);

      const texto = raiz(f).textContent ?? '';
      expect(texto).toContain('Leche · control de calidad');

      const botones = Array.from(raiz(f).querySelectorAll('button'));
      const botonDesactivarLeche = botones.find((b) => b.textContent?.includes('Desactivar') && b.textContent?.includes('Leche cruda'));
      expect(botonDesactivarLeche).toBeUndefined();

      const botonDesactivarAzucar = botones.find((b) => b.textContent?.includes('Desactivar') && b.textContent?.includes('Azúcar'));
      expect(botonDesactivarAzucar).toBeDefined();
    });
  });
  describe('tabla de compras', () => {
    const base = { id_insumo: 2, codigo: 'LECHE', insumo: 'Leche cruda', unidad_medida: 'LT', id_proveedor: 3, proveedor: 'Finca La Pradera', id_periodo: 1, fecha: '2026-10-17', referencia: null, motivo_anulacion: null, comprado_en: null, requiere_calidad: true };
    const APROBADA = { ...base, id_compra: 10, cantidad: 100, valor_total: 175000, costo_unitario: 1750, estado: 'VIGENTE', contado: false, estado_calidad: 'APROBADO', temperatura: 6, acidez: 15, motivo_rechazo: null };
    const RECHAZADA = { ...base, id_compra: 11, cantidad: 50, valor_total: 0, costo_unitario: 1800, estado: 'VIGENTE', contado: false, estado_calidad: 'RECHAZADO', temperatura: 15, acidez: 15, motivo_rechazo: 'Temperatura 15 C supera el maximo de 10 C' };

    async function crear(): Promise<ComponentFixture<ComprasTabComponent>> {
      repo['listar'] = vi.fn(() => of({ items: [LECHE], total: 1, page: 0, size: 100, total_pages: 1 }));
      repo['listarCompras'] = vi.fn(() => of({ items: [APROBADA, RECHAZADA], total: 2, page: 0, size: 20, total_pages: 1 }));
      const f = TestBed.createComponent(ComprasTabComponent);
      await estabilizar(f);
      return f;
    }
    const botonesAnular = (f: ComponentFixture<unknown>) => Array.from(raiz(f).querySelectorAll('button')).filter((b) => b.textContent?.includes('Anular'));

    it('una entrega rechazada no se puede anular y no dice «Crédito» (no tiene valor ni entra a la cuenta del proveedor)', async () => {
      const f = await crear();
      const filas = Array.from(raiz(f).querySelectorAll('tr')).filter((tr) => tr.textContent?.includes('Leche cruda'));
      const rechazada = filas.find((tr) => tr.textContent?.includes('Rechazada'))!;
      const aprobada = filas.find((tr) => !tr.textContent?.includes('Rechazada'))!;
      expect(rechazada.textContent).not.toContain('Anular');
      expect(rechazada.textContent).not.toContain('Crédito');
      expect(aprobada.textContent).toContain('Anular');
      expect(aprobada.textContent).toContain('Crédito');
    });

    it('si el servidor rechaza la anulación, el diálogo sigue abierto con el motivo escrito', async () => {
      repo['anularCompra'] = vi.fn(() => throwError(() => ({ code: 20006, message: 'No se puede anular: esa quincena ya se pago al proveedor (195000). Anule primero el pago.' })));
      const f = await crear();
      botonesAnular(f)[0].click();
      await estabilizar(f);
      escribir(f, 'textarea', 'Compra registrada por error');
      await estabilizar(f);
      const confirmar = Array.from(raiz(f).querySelectorAll('dialog button')).find((b) => b.textContent?.trim() === 'Anular compra') as HTMLButtonElement;
      confirmar.click();
      await estabilizar(f);

      expect(repo['anularCompra']).toHaveBeenCalledTimes(1);
      expect(raiz(f).querySelector('dialog[open]')).not.toBeNull();
      expect(raiz(f).querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('Compra registrada por error');
    });
  });
});
