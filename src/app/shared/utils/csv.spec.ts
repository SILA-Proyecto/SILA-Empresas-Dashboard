import { construirCsv } from './csv';

describe('construirCsv', () => {
  const columnas = [
    { titulo: 'Cliente', valor: (f: { c: string; n: number | null }) => f.c },
    { titulo: 'Total', valor: (f: { c: string; n: number | null }) => f.n },
  ];

  it('lleva BOM, punto y coma, coma decimal y saltos CRLF', () => {
    expect(construirCsv(columnas, [{ c: 'Doña Rosa', n: 1500.5 }, { c: 'Tienda', n: null }])).toBe('\uFEFFCliente;Total\r\nDoña Rosa;1500,5\r\nTienda;\r\n');
  });

  it('entrecomilla lo que trae separador, comillas o saltos de línea', () => {
    const csv = construirCsv(columnas, [{ c: 'Finca; "La Pradera"\nlote 2', n: 1 }]);
    expect(csv).toContain('"Finca; ""La Pradera""\nlote 2";1');
  });

  it('un texto que empieza como fórmula queda como texto, pero un número negativo sigue siendo número', () => {
    const csv = construirCsv(columnas, [
      { c: '=HYPERLINK("http://x")', n: -25 },
      { c: '+57 300', n: 1 },
      { c: '@cmd', n: 1 },
      { c: '-2+3', n: 1 },
    ]);
    const filas = csv.split('\r\n');
    expect(filas[1]).toBe('"\'=HYPERLINK(""http://x"")";-25');
    expect(filas[2]).toBe("'+57 300;1");
    expect(filas[3]).toBe("'@cmd;1");
    expect(filas[4]).toBe("'-2+3;1");
  });

  it('un número que no es finito sale vacío y sin filas solo queda el encabezado', () => {
    expect(construirCsv(columnas, [{ c: 'a', n: Number.NaN }])).toContain('a;\r\n');
    expect(construirCsv(columnas, [])).toBe('\uFEFFCliente;Total\r\n');
  });
});
