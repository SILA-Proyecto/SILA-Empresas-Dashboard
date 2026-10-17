import { agruparPorEdades, repartirAbono } from './cartera.calculos';
import type { VentaPendiente } from './models/cartera.models';

const venta = (id: number, saldo: number): VentaPendiente => ({ id_venta: id, fecha_venta: '2026-10-01T10:00:00', fecha_vencimiento: '2026-10-31', total_venta: saldo, saldo_pendiente: saldo, dias_mora: 0 });

describe('repartirAbono', () => {
  it('aplica primero a la venta más antigua y sigue con la siguiente', () => {
    expect(repartirAbono(150, [venta(1, 100), venta(2, 100)])).toEqual([
      { id_venta: 1, aplicado: 100, saldo_despues: 0 },
      { id_venta: 2, aplicado: 50, saldo_despues: 50 },
    ]);
  });

  it('un abono pequeño solo toca la primera venta', () => {
    expect(repartirAbono(30.5, [venta(1, 100), venta(2, 100)])).toEqual([{ id_venta: 1, aplicado: 30.5, saldo_despues: 69.5 }]);
  });

  it('sin monto no reparte nada', () => {
    expect(repartirAbono(0, [venta(1, 100)])).toEqual([]);
  });
});

describe('agruparPorEdades', () => {
  const cliente = (saldo_deudor: number, dias_mora: number) => ({ saldo_deudor, dias_mora });

  it('reparte la deuda de cada cliente según su venta más atrasada, con los bordes en 0, 15, 30 y 60 días', () => {
    const edades = agruparPorEdades([cliente(100, 0), cliente(200, 1), cliente(300, 15), cliente(400, 16), cliente(500, 30), cliente(600, 31), cliente(700, 60), cliente(800, 61)]);

    expect(edades.map((e) => [e.clave, e.clientes, e.saldo])).toEqual([
      ['SIN_VENCER', 1, 100],
      ['DE_1_A_15', 2, 500],
      ['DE_16_A_30', 2, 900],
      ['DE_31_A_60', 2, 1300],
      ['MAS_DE_60', 1, 800],
    ]);
  });

  it('deja fuera a quien no debe y suma sin ruido de decimales', () => {
    const edades = agruparPorEdades([cliente(0, 0), cliente(0.1, 5), cliente(0.2, 5)]);

    expect(edades[1]).toMatchObject({ clientes: 2, saldo: 0.3 });
    expect(edades.reduce((n, e) => n + e.clientes, 0)).toBe(2);
  });

  it('sin clientes devuelve las cinco edades en cero', () => {
    expect(agruparPorEdades([])).toHaveLength(5);
    expect(agruparPorEdades([]).every((e) => e.clientes === 0 && e.saldo === 0)).toBe(true);
  });
});
