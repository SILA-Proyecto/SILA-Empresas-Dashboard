import { rangosRapidos } from './rangos-fecha';

const por = (hoy: string, id: string) => rangosRapidos(hoy).find((r) => r.id === id)!;

describe('rangosRapidos', () => {
  it('a mitad de mes: este mes y esta quincena llegan hasta hoy', () => {
    expect(por('2026-10-17', 'mes')).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-17' });
    expect(por('2026-10-17', 'quincena')).toMatchObject({ desde: '2026-10-16', hasta: '2026-10-17' });
    expect(por('2026-10-17', 'quincena-anterior')).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-15' });
  });

  it('en la primera quincena, la anterior es la segunda del mes pasado, completa', () => {
    expect(por('2026-10-05', 'quincena')).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-05' });
    expect(por('2026-10-05', 'quincena-anterior')).toMatchObject({ desde: '2026-09-16', hasta: '2026-09-30' });
  });

  it('el día 15 todavía es primera quincena y el 16 ya es la segunda', () => {
    expect(por('2026-10-15', 'quincena').desde).toBe('2026-10-01');
    expect(por('2026-10-16', 'quincena').desde).toBe('2026-10-16');
  });

  it('el mes pasado respeta el último día real (28, 29, 30 o 31) y el cambio de año', () => {
    expect(por('2026-03-10', 'mes-pasado')).toMatchObject({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(por('2028-03-10', 'mes-pasado')).toMatchObject({ desde: '2028-02-01', hasta: '2028-02-29' });
    expect(por('2026-01-10', 'mes-pasado')).toMatchObject({ desde: '2025-12-01', hasta: '2025-12-31' });
    expect(por('2026-01-05', 'quincena-anterior')).toMatchObject({ desde: '2025-12-16', hasta: '2025-12-31' });
  });

  it('últimos 30 días incluye hoy (30 días en total) y cruza el mes', () => {
    expect(por('2026-10-17', '30-dias')).toMatchObject({ desde: '2026-09-18', hasta: '2026-10-17' });
    expect(por('2026-01-10', '30-dias')).toMatchObject({ desde: '2025-12-12', hasta: '2026-01-10' });
  });
});
