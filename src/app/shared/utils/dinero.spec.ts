import { redondear2, tieneMaximoDosDecimales, totalesDeLinea } from './dinero';

describe('dinero', () => {
  describe('redondear2', () => {
    it.each([
      [1.005, 1.01],
      [2.675, 2.68],
      [0.1 + 0.2, 0.3],
      [1234.5, 1234.5],
      [0, 0],
    ])('redondea %s a %s sin el ruido del punto flotante', (entrada, esperado) => {
      expect(redondear2(entrada)).toBe(esperado);
    });

    it('redondea los negativos alejándose del cero, igual que la base de datos', () => {
      expect(redondear2(-1.005)).toBe(-1.01);
      expect(redondear2(-0.004)).toBe(-0);
    });
  });

  describe('totalesDeLinea', () => {
    it('redondea el subtotal y el IVA por separado, línea por línea', () => {
      // 3 × 3.335 = 10.005 → 10.01; IVA 19 % de 10.01 = 1.9019 → 1.90; total 11.91
      expect(totalesDeLinea(3, 3.335, 19)).toEqual({ subtotal: 10.01, iva: 1.9, total: 11.91 });
    });

    it('sin IVA el total es el subtotal', () => {
      expect(totalesDeLinea(2, 4500, 0)).toEqual({ subtotal: 9000, iva: 0, total: 9000 });
    });

    it('cantidades decimales (kilos, litros)', () => {
      expect(totalesDeLinea(2.5, 12000, 5)).toEqual({ subtotal: 30000, iva: 1500, total: 31500 });
    });

    it('cantidad cero da todo en cero', () => {
      expect(totalesDeLinea(0, 5000, 19)).toEqual({ subtotal: 0, iva: 0, total: 0 });
    });
  });

  describe('tieneMaximoDosDecimales', () => {
    it.each([1, 1.5, 1.25, 1000000.99, 0.1 + 0.2])('acepta %s', (valor) => {
      expect(tieneMaximoDosDecimales(valor)).toBe(true);
    });

    it.each([1.005, 0.001, 12.345])('rechaza %s', (valor) => {
      expect(tieneMaximoDosDecimales(valor)).toBe(false);
    });
  });
});
