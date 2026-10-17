import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of, throwError } from 'rxjs';
import { AuthService, Rol } from '../../core/services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { CUENTAS_PROVEEDORES_REPOSITORY } from './data/cuentas-proveedores.provider';
import { PagoProveedorDialogComponent } from './pago-proveedor-dialog.component';
import { PagosTablaComponent } from './pagos-tabla.component';
import { PreciosTabComponent } from './precios-tab.component';
import { SaldosTabComponent } from './saldos-tab.component';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { INSUMOS_REPOSITORY } from '../insumos/data/insumos.provider';
import { PrecioProveedorDialogComponent } from './precio-proveedor-dialog.component';

const QUINCENA = { id_periodo: 19, anio: 2026, mes: 10, quincena: 1, id_proveedor: 3, proveedor: 'Finca', numero_compras: 2, valor_compras: 180000, valor_pagado: 80000, saldo: 100000 };
const PAGO = { id_pago: 9, id_proveedor: 3, proveedor: 'Finca', id_periodo: 19, id_periodo_liquidado: 19, anio: 2026, mes: 10, quincena: 1, fecha_pago: '2026-10-09', monto: 80000, metodo_pago: 'EFECTIVO', referencia_pago: null, estado: 'VIGENTE', motivo_anulacion: null, usuario_registro: 'ana', fecha_registro: '2026-10-09T14:03:11' };

async function estabilizar(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 8; i++) {
    f.detectChanges();
    await f.whenStable();
  }
}
const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
function escribir(f: ComponentFixture<unknown>, selector: string, valor: string): void {
  const el = raiz(f).querySelector<HTMLInputElement>(selector)!;
  el.value = valor;
  el.dispatchEvent(new Event('input'));
}
const boton = (c: ParentNode, texto: string) => Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes(texto));
function entrar(rol: Rol): void {
  TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'a', nombre: 'A', email: 'a@example.com', rol, mfa_activo: true });
}

describe('Cuentas con proveedores', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;

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
      fijarPrecio: vi.fn(() => of({ id_precio: 1, id_proveedor: 3, proveedor: 'Finca', id_insumo: 12, codigo: 'AZUCAR', insumo: 'Azúcar', unidad_medida: 'KG', precio_unitario: 1900, vigente_desde: '2026-10-09', vigente: true })),
      resumen: vi.fn(() => of({ items: [QUINCENA], total: 1, page: 0, size: 50, pages: 1 })),
      registrarPago: vi.fn(() => of(PAGO)),
      listarPagos: vi.fn(() => of({ items: [PAGO], total: 1, page: 0, size: 10, pages: 1 })),
      anularPago: vi.fn(() => of({ ...PAGO, estado: 'ANULADO', motivo_anulacion: 'Se pagó dos veces' })),
    };
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => ''), provideRouter([]), { provide: CUENTAS_PROVEEDORES_REPOSITORY, useValue: repo }] });
  });

  async function elegir(f: ComponentFixture<unknown>, idCampo: string): Promise<void> {
    raiz(f).querySelector<HTMLInputElement>(`#${idCampo}`)!.dispatchEvent(new Event('focus'));
    await estabilizar(f);
    raiz(f).querySelector(`#${idCampo}-lista [role=option]`)!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await estabilizar(f);
  }

  it('fijar precio: envía proveedor, materia prima, precio y fecha, y avisa que solo rige hacia adelante', async () => {
    const f = TestBed.createComponent(PrecioProveedorDialogComponent);
    f.componentRef.setInput('proveedores', [{ valor: 3, etiqueta: 'Finca' }]);
    f.componentRef.setInput('materiasPrimas', [{ valor: 12, etiqueta: 'Azúcar' }]);
    f.componentRef.setInput('abierto', true);
    await estabilizar(f);
    expect(raiz(f).querySelector('[data-testid=aviso-precio]')?.textContent).toContain('Solo rige hacia adelante');

    await elegir(f, 'precio-proveedor');
    await elegir(f, 'precio-insumo');
    escribir(f, '[formcontrolname=precio]', '1900');
    await estabilizar(f);
    raiz(f).querySelector('#precio-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo['fijarPrecio']).toHaveBeenCalledTimes(1);
    const [cuerpo, clave] = repo['fijarPrecio'].mock.calls[0];
    expect(cuerpo).toMatchObject({ id_proveedor: 3, id_insumo: 12, precio_unitario: 1900 });
    expect(cuerpo.vigente_desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(clave.length).toBeGreaterThanOrEqual(8);
  });

  it('fijar precio sin materia prima no envía nada', async () => {
    const f = TestBed.createComponent(PrecioProveedorDialogComponent);
    f.componentRef.setInput('proveedores', [{ valor: 3, etiqueta: 'Finca' }]);
    f.componentRef.setInput('materiasPrimas', [{ valor: 12, etiqueta: 'Azúcar' }]);
    f.componentRef.setInput('abierto', true);
    await estabilizar(f);

    await elegir(f, 'precio-proveedor');
    escribir(f, '[formcontrolname=precio]', '1900');
    await estabilizar(f);
    raiz(f).querySelector('#precio-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo['fijarPrecio']).not.toHaveBeenCalled();
    expect(raiz(f).textContent).toContain('Elige la materia prima.');
  });

  async function dialogoPago(): Promise<ComponentFixture<PagoProveedorDialogComponent>> {
    entrar('ADMIN');
    const f = TestBed.createComponent(PagoProveedorDialogComponent);
    f.componentRef.setInput('proveedor', { id_proveedor: 3, nombre: 'Finca' });
    await estabilizar(f);
    return f;
  }

  it('pago: si el proveedor llega después de abrir el diálogo, carga sus quincenas y precarga el saldo', async () => {
    entrar('ADMIN');
    const f = TestBed.createComponent(PagoProveedorDialogComponent);
    await estabilizar(f);
    expect(repo['resumen']).not.toHaveBeenCalled();

    f.componentRef.setInput('proveedor', { id_proveedor: 3, nombre: 'Finca' });
    await estabilizar(f);

    // The dialog offers «la más antigua» first, so it must ask for the quincenas oldest-first.
    expect(repo['resumen']).toHaveBeenCalledWith(expect.objectContaining({ id_proveedor: 3, sort: 'id_periodo,asc' }));
    expect(raiz(f).querySelector('[data-testid=sin-saldo]')).toBeNull();
    expect(raiz(f).querySelector('[data-testid=resumen-quincena]')!.textContent).toContain('100.000');
    expect(raiz(f).querySelector<HTMLInputElement>('[formcontrolname=monto]')!.value).toBe('100000');
  });

  it('pago: abre en la quincena indicada aunque haya otra más antigua con saldo', async () => {
    entrar('ADMIN');
    const otra = { ...QUINCENA, id_periodo: 20, quincena: 2, saldo: 50000 };
    repo['resumen'] = vi.fn(() => of({ items: [QUINCENA, otra], total: 2, page: 0, size: 50, pages: 1 }));
    const f = TestBed.createComponent(PagoProveedorDialogComponent);
    f.componentRef.setInput('periodoInicial', 20);
    f.componentRef.setInput('proveedor', { id_proveedor: 3, nombre: 'Finca' });
    await estabilizar(f);

    expect(raiz(f).querySelector<HTMLSelectElement>('select[formcontrolname=periodo]')!.value).toBe('20');
    expect(raiz(f).querySelector<HTMLInputElement>('[formcontrolname=monto]')!.value).toBe('50000');
  });

  it('pago: el monto que el usuario baja no se pisa cuando la lista de quincenas se recarga', async () => {
    const f = await dialogoPago();
    escribir(f, '[formcontrolname=monto]', '30000');
    await estabilizar(f);

    f.componentInstance['quincenas'].reload();
    await estabilizar(f);

    expect(raiz(f).querySelector<HTMLInputElement>('[formcontrolname=monto]')!.value).toBe('30000');
  });

  it('pago: ofrece la quincena con su saldo, «Pagar todo el saldo» y envía con Idempotency-Key', async () => {
    const f = await dialogoPago();
    expect((raiz(f).textContent ?? '').replace(/\s+/g, ' ')).toContain('saldo $ 100.000');

    boton(raiz(f), 'Pagar todo el saldo')!.click();
    await estabilizar(f);
    expect(raiz(f).querySelector<HTMLInputElement>('[formcontrolname=monto]')!.value).toBe('100000');

    raiz(f).querySelector('#pago-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);
    const [cuerpo, clave] = repo['registrarPago'].mock.calls[0];
    expect(cuerpo).toMatchObject({ id_proveedor: 3, id_periodo_liquidado: 19, monto: 100000, metodo_pago: 'TRANSFERENCIA' });
    expect(clave.length).toBeGreaterThanOrEqual(8);
  });

  it('pago que supera el saldo: se frena en pantalla, no llama al servidor y avisa el saldo', async () => {
    const f = await dialogoPago();
    escribir(f, '[formcontrolname=monto]', '500000');
    await estabilizar(f);
    raiz(f).querySelector('#pago-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo['registrarPago']).not.toHaveBeenCalled();
    expect((raiz(f).textContent ?? '').replace(/\s+/g, ' ')).toContain('no puede superar el saldo de la quincena ($ 100.000)');
  });

  it('el servidor responde 20005 (el saldo cambió): muestra su mensaje en el monto y no cierra', async () => {
    repo['registrarPago'].mockReturnValue(throwError(() => ({ code: 20005, message: 'El pago supera el saldo de esa quincena (saldo $ 20.000)' })));
    const f = await dialogoPago();
    const registrado = vi.fn();
    f.componentInstance.registrado.subscribe(registrado);
    escribir(f, '[formcontrolname=monto]', '50000');
    await estabilizar(f);
    raiz(f).querySelector('#pago-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);

    expect(repo['registrarPago']).toHaveBeenCalledTimes(1);
    expect(registrado).not.toHaveBeenCalled();
    expect((raiz(f).textContent ?? '').replace(/\s+/g, ' ')).toContain('El pago supera el saldo de esa quincena (saldo $ 20.000)');
  });

  it('un proveedor sin saldo a crédito lo dice y no deja registrar', async () => {
    repo['resumen'].mockReturnValue(of({ items: [{ ...QUINCENA, saldo: 0 }], total: 1, page: 0, size: 50, pages: 1 }));
    const f = await dialogoPago();

    expect(raiz(f).querySelector('[data-testid=sin-saldo]')?.textContent).toContain('no tiene saldo pendiente');
    expect(boton(raiz(f), 'Registrar pago')!.disabled).toBe(true);
  });

  describe('anular un pago', () => {
    async function tabla(rol: Rol): Promise<ComponentFixture<PagosTablaComponent>> {
      entrar(rol);
      const f = TestBed.createComponent(PagosTablaComponent);
      await estabilizar(f);
      return f;
    }

    it('un ADMIN anula con motivo (≥ 10) y con Idempotency-Key', async () => {
      const exito = vi.spyOn(TestBed.inject(ToastService), 'exito');
      const f = await tabla('ADMIN');

      boton(raiz(f).querySelector('tbody')!, 'Anular')!.click();
      await estabilizar(f);
      const confirmar = () => Array.from(raiz(f).querySelectorAll('dialog')).map((d) => boton(d, 'Anular pago')).find((b) => b?.className.includes('bg-destructive'))!;
      expect(confirmar().disabled).toBe(true);

      const motivo = raiz(f).querySelector<HTMLTextAreaElement>('textarea[id^="confirm-motivo"]')!;
      motivo.value = 'Se pagó dos veces';
      motivo.dispatchEvent(new Event('input'));
      await estabilizar(f);
      confirmar().click();
      await estabilizar(f);

      const [id, texto, clave] = repo['anularPago'].mock.calls[0];
      expect([id, texto]).toEqual([9, 'Se pagó dos veces']);
      expect(clave.length).toBeGreaterThanOrEqual(8);
      expect(exito).toHaveBeenCalledTimes(1);
    });

    it('un OPERATIVO no ve «Anular»', async () => {
      const f = await tabla('OPERATIVO');
      expect(boton(raiz(f).querySelector('tbody')!, 'Anular')).toBeUndefined();
    });

    it('un pago anulado se ve tachado con su motivo y sin botón', async () => {
      repo['listarPagos'].mockReturnValue(of({ items: [{ ...PAGO, estado: 'ANULADO', motivo_anulacion: 'Se pagó dos veces' }], total: 1, page: 0, size: 10, pages: 1 }));
      const f = await tabla('ADMIN');
      expect(raiz(f).querySelector('tbody .line-through')).toBeTruthy();
      expect(raiz(f).textContent).toContain('Motivo: Se pagó dos veces');
      expect(boton(raiz(f).querySelector('tbody')!, 'Anular')).toBeUndefined();
    });
  });

  const SALDO = { id_proveedor: 3, proveedor: 'Finca', activo: true, total_comprado: 180000, total_pagado: 80000, saldo: 100000, ultima_compra: '2026-10-09', ultimo_pago: null };
  const PRECIO = { id_precio: 1, id_proveedor: 3, proveedor: 'Finca', id_insumo: 12, codigo: 'AZUCAR', insumo: 'Azúcar', unidad_medida: 'KG', precio_unitario: 1800, vigente_desde: '2026-10-01', vigente: true };

  it('saldos: «Ver detalle» pide las quincenas y las compras a crédito de ese proveedor y las muestra', async () => {
    repo['saldos'] = vi.fn(() => of({ items: [SALDO], total: 1, page: 0, size: 10, pages: 1 }));
    const compra = { id_compra: 7, id_insumo: 1, codigo: 'LECHE', insumo: 'Leche cruda', unidad_medida: 'LT', id_proveedor: 3, proveedor: 'Finca', id_periodo: 19, fecha: '2026-10-09', cantidad: 100, valor_total: 180000, costo_unitario: 1800, referencia: 'F-1', estado: 'VIGENTE', contado: false };
    const insumos = { listarCompras: vi.fn(() => of({ items: [compra], total: 1, page: 0, size: 10, pages: 1 })) };
    TestBed.overrideProvider(INSUMOS_REPOSITORY, { useValue: insumos });
    entrar('ADMIN');
    const f = TestBed.createComponent(SaldosTabComponent);
    await estabilizar(f);
    expect(repo['resumen']).not.toHaveBeenCalled();

    boton(raiz(f), 'Ver detalle')!.click();
    await estabilizar(f);

    expect(repo['resumen']).toHaveBeenCalledWith(expect.objectContaining({ id_proveedor: 3 }));
    expect(raiz(f).textContent).toContain('180.000');
    expect(raiz(f).textContent).not.toContain('No hay quincenas registradas');
    expect(insumos['listarCompras']).toHaveBeenCalledWith(expect.objectContaining({ id_proveedor: 3, contado: false }));
    expect(raiz(f).textContent).toContain('Leche cruda');
    expect(raiz(f).querySelector('[data-testid=ver-comprobante]')).not.toBeNull();
  });

  it('precios: «Cambiar precio» abre el formulario con el proveedor y la materia prima de esa fila', async () => {
    repo['listarPrecios'] = vi.fn(() => of({ items: [PRECIO], total: 1, page: 0, size: 10, pages: 1 }));
    TestBed.overrideProvider(CATALOGOS_REPOSITORY, { useValue: { listarProveedores: () => of({ items: [{ id_proveedor: 3, nombre: 'Finca' }], total: 1, page: 0, size: 100, pages: 1 }) } });
    TestBed.overrideProvider(INSUMOS_REPOSITORY, { useValue: { listar: () => of({ items: [{ id_insumo: 12, nombre: 'Azúcar', codigo: 'AZUCAR' }], total: 1, page: 0, size: 100, pages: 1 }) } });
    entrar('ADMIN');
    const f = TestBed.createComponent(PreciosTabComponent);
    await estabilizar(f);

    boton(raiz(f), 'Cambiar precio')!.click();
    await estabilizar(f);

    const ficha = raiz(f).querySelector('[data-testid=precio-actual]')!.textContent!;
    expect(ficha).toContain('Finca');
    expect(ficha).toContain('Azúcar');
    expect(raiz(f).querySelector('#precio-proveedor')).toBeNull();
    expect(raiz(f).querySelector('#precio-insumo')).toBeNull();
    expect(raiz(f).querySelector<HTMLInputElement>('[formcontrolname=precio]')!.value).toBe('1800');

    escribir(f, '[formcontrolname=precio]', '1900');
    await estabilizar(f);
    raiz(f).querySelector('#precio-proveedor-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);
    expect(repo['fijarPrecio'].mock.calls[0][0]).toMatchObject({ id_proveedor: 3, id_insumo: 12, precio_unitario: 1900 });
  });

  it('precios: un OPERATIVO no ve «Cambiar precio»', async () => {
    repo['listarPrecios'] = vi.fn(() => of({ items: [PRECIO], total: 1, page: 0, size: 10, pages: 1 }));
    TestBed.overrideProvider(CATALOGOS_REPOSITORY, { useValue: { listarProveedores: () => of({ items: [], total: 0, page: 0, size: 100, pages: 0 }) } });
    TestBed.overrideProvider(INSUMOS_REPOSITORY, { useValue: { listar: () => of({ items: [], total: 0, page: 0, size: 100, pages: 0 }) } });
    entrar('OPERATIVO');
    const f = TestBed.createComponent(PreciosTabComponent);
    await estabilizar(f);
    expect(boton(raiz(f), 'Cambiar precio')).toBeUndefined();
  });
});
