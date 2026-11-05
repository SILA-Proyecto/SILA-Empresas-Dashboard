import { compararQuincenas, quincenaAnterior } from './comparacion-quincena';
import type { Periodo } from './models/periodos.models';

const periodo = (id: number, fecha_inicio: string, extra: Partial<Periodo> = {}): Periodo =>
  ({ id_periodo: id, anio: 2026, mes: 1, quincena: 1, fecha_inicio, fecha_fin: fecha_inicio, estado: 'ABIERTA', ingresos_ventas: 0, gastos_operativos: 0, total_cobrado: 0, resultado_estimado: 0, caja_neta: 0, ...extra }) as Periodo;

describe('quincenaAnterior', () => {
  const ene2 = periodo(2, '2026-01-16');
  const ene1 = periodo(1, '2026-01-01');
  const dic2025 = periodo(0, '2025-12-16');

  it('es la inmediatamente anterior por fecha, sin importar el orden de la lista', () => {
    expect(quincenaAnterior(ene2, [ene2, dic2025, ene1])?.id_periodo).toBe(1);
  });

  it('cruza el cambio de año', () => {
    expect(quincenaAnterior(ene1, [ene2, dic2025, ene1])?.id_periodo).toBe(0);
  });

  it('la más antigua no tiene anterior, ni siquiera cuenta con ella misma', () => {
    expect(quincenaAnterior(dic2025, [ene2, dic2025, ene1])).toBeNull();
    expect(quincenaAnterior(ene1, [ene1])).toBeNull();
  });
});

describe('compararQuincenas', () => {
  const antes = periodo(1, '2026-10-01', { ingresos_ventas: 1000000, total_cobrado: 800000, gastos_operativos: 200000, resultado_estimado: 400000, caja_neta: -100000 });
  const ahora = periodo(2, '2026-10-16', { ingresos_ventas: 1200000, total_cobrado: 800000, gastos_operativos: 300000, resultado_estimado: 300000, caja_neta: 50000 });
  const por = (clave: string) => compararQuincenas(ahora, antes).find((c) => c.clave === clave)!;

  it('sin el módulo RESULTADO_QUINCENA (cifras en null) solo compara lo que vino, nunca como cero', () => {
    const nulos = { ingresos_ventas: null, costo_produccion: null, gastos_operativos: null, cartera_castigada: null, resultado_estimado: null, caja_neta: null };
    const claves = compararQuincenas({ ...ahora, ...nulos }, { ...antes, ...nulos }).map((c) => c.clave);
    expect(claves).toEqual(['cobrado']);
  });

  it('calcula la diferencia y el porcentaje contra lo anterior', () => {
    expect(por('ventas')).toMatchObject({ actual: 1200000, anterior: 1000000, diferencia: 200000, porcentaje: 20, efecto: 'mejor' });
    expect(por('resultado')).toMatchObject({ diferencia: -100000, porcentaje: -25, efecto: 'peor' });
  });

  it('gastar más es peor y gastar menos es mejor; lo que no cambió es igual', () => {
    expect(por('gastos')).toMatchObject({ diferencia: 100000, efecto: 'peor' });
    expect(compararQuincenas(antes, ahora).find((c) => c.clave === 'gastos')!.efecto).toBe('mejor');
    expect(por('cobrado')).toMatchObject({ diferencia: 0, porcentaje: 0, efecto: 'igual' });
  });

  it('una caja que pasa de negativa a positiva es mejor, y el porcentaje usa el valor absoluto de la base', () => {
    expect(por('caja')).toMatchObject({ diferencia: 150000, porcentaje: 150, efecto: 'mejor' });
  });

  it('si antes era 0 no inventa un porcentaje', () => {
    const vacia = periodo(0, '2026-09-16');
    expect(compararQuincenas(ahora, vacia).find((c) => c.clave === 'ventas')!.porcentaje).toBeNull();
  });
});
