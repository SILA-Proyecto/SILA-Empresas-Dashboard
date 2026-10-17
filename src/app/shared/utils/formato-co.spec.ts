import { formatearNumerosEnTexto, formatoFechaHora } from './formato-co';

describe('formatoFechaHora', () => {
  it('lee la marca sin zona como UTC y la muestra en hora de Colombia (UTC-5)', () => {
    expect(formatoFechaHora('2026-10-09T03:45:05')).toBe('08/10/2026 22:45');
  });

  it('cruza el día correctamente (madrugada UTC = noche anterior en Colombia)', () => {
    expect(formatoFechaHora('2026-01-01T02:30:00')).toBe('31/12/2025 21:30');
  });

  it('si la marca ya trae zona, la respeta', () => {
    expect(formatoFechaHora('2026-10-09T03:45:05Z')).toBe('08/10/2026 22:45');
    expect(formatoFechaHora('2026-10-09T03:45:05+00:00')).toBe('08/10/2026 22:45');
  });

  it('valores vacíos o inválidos dan «—»', () => {
    expect(formatoFechaHora(null)).toBe('—');
    expect(formatoFechaHora(undefined)).toBe('—');
    expect(formatoFechaHora('')).toBe('—');
    expect(formatoFechaHora('no es una fecha')).toBe('—');
  });
});

describe('formatearNumerosEnTexto', () => {
  it('pone separador de miles a las cantidades enteras del mensaje del servidor', () => {
    expect(formatearNumerosEnTexto('Falta Leche cruda: se necesitan 50000 LT y hay 2468.')).toBe('Falta Leche cruda: se necesitan 50.000 LT y hay 2.468.');
    expect(formatearNumerosEnTexto('esa quincena ya se pago al proveedor (195000).')).toBe('esa quincena ya se pago al proveedor (195.000).');
  });

  it('no toca años, fechas, decimales, códigos ni números cortos', () => {
    expect(formatearNumerosEnTexto('Quincena de 2026 cerrada el 2026-10-31 y 31/10/2026')).toBe('Quincena de 2026 cerrada el 2026-10-31 y 31/10/2026');
    expect(formatearNumerosEnTexto('Faltan 1234,5 y 1234.5 unidades; lote ABC12345; hay 500')).toBe('Faltan 1234,5 y 1234.5 unidades; lote ABC12345; hay 500');
  });
});
