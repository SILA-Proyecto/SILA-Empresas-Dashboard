import { explicarQuincena } from './explicacion-quincena';

const norm = (t: string) => t.replace(/\s+/g, ' ');
const base = {
  ingresos_ventas: 28500, costo_produccion: 107556.3, gastos_operativos: 0, cartera_castigada: 0, resultado_estimado: -79056.3,
  total_cobrado: 14000, caja_neta: -721000, compras_materias_primas: 8388000, compras_contado: 735000, compras_credito: 7653000,
  pagado_proveedores: 0, por_pagar_proveedores: 7653000,
};
const texto = (p: Parameters<typeof explicarQuincena>[0], clave: string) => norm(explicarQuincena(p).find((f) => f.clave === clave)!.texto);

describe('explicarQuincena', () => {
  it('explica qué se compró, qué se debe, por qué el resultado es negativo y de dónde sale la caja', () => {
    const compras = texto(base, 'compras');
    expect(compras).toContain('$ 8.388.000');
    expect(compras).toContain('$ 735.000 de contado');
    expect(compras).toContain('$ 7.653.000 a crédito');
    expect(texto(base, 'deuda')).toContain('Debes $ 7.653.000 a proveedores');
    const resultado = texto(base, 'resultado');
    expect(resultado).toContain('pérdida de $ 79.056');
    expect(resultado).toContain('costó $ 107.556');
    expect(resultado).toContain('queda en inventario');
    const caja = texto(base, 'caja');
    expect(caja).toContain('entraron $ 14.000 y salieron $ 735.000');
    expect(caja).toContain('negativo, $ 721.000');
    expect(caja).toContain('todavía no ha salido de caja');
  });

  it('sin el módulo RESULTADO_QUINCENA (cifras en null) cuenta las compras y la deuda, y calla el resultado y la caja', () => {
    const frases = explicarQuincena({ ...base, ...{ ingresos_ventas: null, costo_produccion: null, gastos_operativos: null, cartera_castigada: null, resultado_estimado: null, caja_neta: null } });
    expect(frases.map((f) => f.clave)).toEqual(['compras', 'deuda']);
    expect(frases.map((f) => f.texto).join(' ')).not.toMatch(/\$\s?0(?![\d.])/);
  });

  it('sin deuda ni compras lo dice y no inventa avisos', () => {
    const p = { ...base, compras_materias_primas: 0, compras_contado: 0, compras_credito: 0, por_pagar_proveedores: 0, caja_neta: 14000, resultado_estimado: 5000 };
    expect(texto(p, 'compras')).toContain('no hubo compras');
    expect(texto(p, 'deuda')).toContain('No debes nada a proveedores');
    expect(texto(p, 'resultado')).toContain('gana');
    expect(texto(p, 'resultado')).not.toContain('inventario');
    expect(texto(p, 'caja')).toContain('a favor');
    expect(texto(p, 'caja')).not.toContain('todavía no ha salido');
  });

  it('menciona lo ya pagado a proveedores', () => {
    expect(texto({ ...base, pagado_proveedores: 1000000, por_pagar_proveedores: 6653000 }, 'deuda')).toContain('ya pagaste $ 1.000.000');
  });
});
