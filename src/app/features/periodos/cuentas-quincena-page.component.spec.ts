import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../../core/empresa/empresa.models';
import { provideEmpresaFalsa } from '../../core/empresa/testing/empresa-falsa';
import { CUENTAS_PROVEEDORES_REPOSITORY } from '../cuentas-proveedores/data/cuentas-proveedores.provider';
import { PERIODOS_REPOSITORY } from './data/periodos.provider';
import type { Periodo } from './models/periodos.models';
import { CuentasQuincenaPageComponent } from './cuentas-quincena-page.component';

/** Una quincena que GANÓ plata (resultado $ 500.000) pero donde SALIÓ más de la que entró (caja −$ 220.000: 500.000 − 470.000 − 100.000 − 150.000). */
const PERIODO: Periodo = {
  id_periodo: 19, anio: 2026, mes: 10, quincena: 1, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-15', estado: 'ABIERTA',
  ingresos_ventas: 1000000, costo_produccion: 300000, gastos_operativos: 150000, cartera_castigada: 50000, resultado_estimado: 500000,
  iva_ventas: 190000, total_vendido: 1190000, ventas_contado: 400000, ventas_credito: 790000,
  cobrado_contado: 400000, cobrado_abonos: 100000, total_cobrado: 500000, cartera_pendiente: 790000,
  leche_litros: 1500, leche_litros_rechazados: 40, leche_comprada: 2700000,
  compras_materias_primas: 2800000, compras_contado: 100000, compras_credito: 2700000, pagado_proveedores: 1000000, por_pagar_proveedores: 1700000,
  pagos_proveedores_caja: 470000, caja_neta: -220000,
};

describe('CuentasQuincenaPageComponent', () => {
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

  const LINEA = { id_periodo: 19, anio: 2026, mes: 10, quincena: 1, id_proveedor: 3, proveedor: 'Finca La Pradera', numero_compras: 2, valor_compras: 500000, valor_pagado: 300000, saldo: 200000 };

  async function crear(periodo: Periodo, lineas: unknown[] = [], todas: Periodo[] = [periodo], activos: readonly CodigoModulo[] = MODULOS_OPCIONALES): Promise<ComponentFixture<CuentasQuincenaPageComponent>> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        provideEmpresaFalsa(activos),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '19' }) }, paramMap: of(convertToParamMap({ id: '19' })) } },
        { provide: PERIODOS_REPOSITORY, useValue: { obtener: vi.fn(() => of(periodo)), listar: vi.fn((q: { anio: number }) => of({ items: todas.filter((p) => p.anio === q.anio), total: 0, page: 0, size: 50 })) } },
        { provide: CUENTAS_PROVEEDORES_REPOSITORY, useValue: { resumen: vi.fn(() => of({ items: lineas, total: lineas.length, page: 0, size: 10 })) } },
      ],
    });
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'a', nombre: 'A', email: 'a@example.com', rol: 'ADMIN', mfa_activo: true });
    const f = TestBed.createComponent(CuentasQuincenaPageComponent);
    for (let i = 0; i < 6; i++) {
      f.detectChanges();
      await f.whenStable();
    }
    return f;
  }
  const texto = (f: ComponentFixture<unknown>, sel: string) => ((f.nativeElement as HTMLElement).querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ');

  it('muestra los tres bloques, y el resultado y la caja son cifras distintas, cada una con su fórmula', async () => {
    const f = await crear(PERIODO);

    const raiz = f.nativeElement as HTMLElement;
    expect(raiz.querySelector('section[aria-labelledby=bloque-ventas]')).toBeTruthy();
    expect(raiz.querySelector('section[aria-labelledby=bloque-proveedores]')).toBeTruthy();
    expect(raiz.querySelector('section[aria-labelledby=bloque-resultado]')).toBeTruthy();

    expect(texto(f, '[data-testid=valor-resultado]')).toContain('500.000');
    expect(texto(f, '[data-testid=valor-caja]')).toContain('220.000');
    expect(texto(f, '[data-testid=valor-caja]')).toContain('-');
    expect(texto(f, '[data-testid=valor-resultado]')).not.toBe(texto(f, '[data-testid=valor-caja]'));
    expect(texto(f, '[data-testid=tarjeta-resultado]')).toContain('Ventas sin IVA − Costo de producción − Gastos − Cartera castigada');
    expect(texto(f, '[data-testid=tarjeta-caja]')).toContain('Cobrado − Pagos a proveedores − Gastos − Compras de contado');
    expect(texto(f, '[data-testid=tarjeta-caja]')).toContain('Compras de contado');
    expect(texto(f, '[data-testid=tarjeta-caja]')).toContain('100.000');
    expect(texto(f, '[data-testid=nota-resultado]')).toContain('El costo de las materias primas entra en el resultado al producir');
    // La caja negativa va en rojo (y con su signo).
    expect(raiz.querySelector('[data-testid=valor-caja] .text-destructive')).toBeTruthy();
    expect(raiz.querySelector('[data-testid=valor-resultado] .text-destructive')).toBeNull();
  });

  it('sin el módulo RESULTADO_QUINCENA: ni resultado ni caja ni cartera castigada (vienen en null), sin $0; las cuentas siguen', async () => {
    const sinResultado = { ...PERIODO, ...{ ingresos_ventas: null, costo_produccion: null, gastos_operativos: null, cartera_castigada: null, resultado_estimado: null, caja_neta: null } };
    const f = await crear(sinResultado, [], [sinResultado], MODULOS_OPCIONALES.filter((m) => m !== 'RESULTADO_QUINCENA'));
    const raiz = f.nativeElement as HTMLElement;

    expect(raiz.querySelector('[data-testid=tarjeta-resultado]')).toBeNull();
    expect(raiz.querySelector('[data-testid=tarjeta-caja]')).toBeNull();
    expect(raiz.querySelector('[data-testid=explicacion-resultado]')).toBeNull();
    expect(raiz.querySelector('[data-testid=explicacion-caja]')).toBeNull();
    expect(texto(f, 'section[aria-labelledby=bloque-ventas]')).not.toContain('Cartera castigada');
    expect(raiz.textContent).not.toMatch(/\$\s?0(?![\d.])/);
    expect(texto(f, 'section[aria-labelledby=bloque-ventas]')).toContain('Total vendido');
    expect(raiz.querySelector('[data-testid=explicacion-compras]')).toBeTruthy();
  });

  it('el bloque de compras y proveedores destaca lo que falta por pagar', async () => {
    const f = await crear(PERIODO);
    const bloque = texto(f, 'section[aria-labelledby=bloque-proveedores]');
    expect(bloque).toContain('Por pagar a proveedores');
    expect(bloque).toContain('1.700.000');
    expect(bloque).toContain('1.500 L');
  });

  it('una quincena cerrada lo dice, y aun así se puede pagar su deuda con proveedores (la regla de cierre mira la fecha del pago)', async () => {
    const f = await crear({ ...PERIODO, estado: 'CERRADA' }, [LINEA]);
    expect(texto(f, '[data-testid=aviso-cerrada]')).toContain('Las deudas con proveedores sí se pueden pagar hoy');

    const ver = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Ver por proveedor'))!;
    ver.click();
    for (let i = 0; i < 4; i++) {
      f.detectChanges();
      await f.whenStable();
    }
    const pagar = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Pagar'))!;
    expect(pagar).toBeDefined();
    expect(pagar.disabled).toBe(false);
  });

  it('compara con la quincena anterior (también la del año pasado) y marca lo que mejoró y lo que empeoró', async () => {
    const anterior: Periodo = { ...PERIODO, id_periodo: 18, anio: 2025, mes: 12, quincena: 2, fecha_inicio: '2025-12-16', fecha_fin: '2025-12-31', estado: 'CERRADA', ingresos_ventas: 800000, total_cobrado: 500000, gastos_operativos: 100000, resultado_estimado: 600000, caja_neta: -300000 };
    const f = await crear({ ...PERIODO, anio: 2026, mes: 1, quincena: 1, fecha_inicio: '2026-01-01' }, [], [anterior]);
    const fila = (clave: string) => texto(f, `[data-testid=cambio-${clave}]`);

    expect(texto(f, '#comparacion + p')).toContain('Diciembre · 2.ª quincena de 2025');
    expect(texto(f, '#comparacion + p')).toContain('aún no termina');
    expect(fila('ventas')).toContain('+$ 200.000 (+25 %)');
    expect(fila('cobrado')).toContain('Igual');
    expect(fila('gastos')).toContain('+$ 50.000');
    expect(fila('resultado')).toContain('−$ 100.000 (−16,7 %)');
    expect(fila('caja')).toContain('+$ 80.000');
    const clases = (clave: string) => (f.nativeElement as HTMLElement).querySelector(`[data-testid=cambio-${clave}] [data-cambio]`)!.className;
    expect(clases('ventas')).toContain('text-success');
    expect(clases('gastos')).toContain('text-destructive');
  });

  it('sin quincena anterior creada no muestra la comparación', async () => {
    const f = await crear(PERIODO);
    expect((f.nativeElement as HTMLElement).querySelector('[data-testid=comparacion]')).toBeNull();
  });
});
