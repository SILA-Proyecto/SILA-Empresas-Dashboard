import { PAGINAS_LEGALES, TEXTOS, compararVersiones, textoDe, ultimoTexto } from './index';
import { contarPorDefinir, trozos } from './render';

describe('render de textos legales', () => {
  it('pone el nombre de la empresa donde dice {{empresa}} y, sin nombre, «la empresa»', () => {
    expect(trozos('Datos de {{empresa}}.', 'Lácteos Ejemplo SAS').map((t) => t.texto).join('')).toBe('Datos de Lácteos Ejemplo SAS.');
    expect(trozos('Datos de {{empresa}}.', null).map((t) => t.texto).join('')).toBe('Datos de la empresa.');
  });

  it('separa cada [POR DEFINIR …] para dibujarlo resaltado', () => {
    const t = trozos('Escribe a [POR DEFINIR: correo del área] o llama.', 'X');

    expect(t).toEqual([
      { texto: 'Escribe a ', porDefinir: false },
      { texto: '[POR DEFINIR: correo del área]', porDefinir: true },
      { texto: ' o llama.', porDefinir: false },
    ]);
  });

  it('nunca interpreta HTML: un texto con etiquetas queda como texto', () => {
    expect(trozos('<img src=x onerror=alert(1)> {{empresa}}', '<b>Acme</b>').map((t) => t.texto).join('')).toBe('<img src=x onerror=alert(1)> <b>Acme</b>');
  });

  it('cuenta los datos por definir', () => {
    expect(contarPorDefinir(['a [POR DEFINIR: x] b [POR DEFINIR: y]', 'c'])).toBe(2);
  });
});

describe('mapa de textos', () => {
  it('cada documento tiene al menos una versión y cada texto dice su misma versión y documento', () => {
    for (const [documento, versiones] of Object.entries(TEXTOS)) {
      expect(Object.keys(versiones).length, documento).toBeGreaterThan(0);
      for (const [version, texto] of Object.entries(versiones)) {
        expect(texto.documento).toBe(documento);
        expect(texto.version).toBe(version);
        expect(texto.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Set(texto.secciones.map((s) => s.id)).size, `${documento} ${version}: ids repetidos`).toBe(texto.secciones.length);
      }
    }
  });

  it('textoDe devuelve null para una versión que no existe (no sustituye por otra)', () => {
    expect(textoDe('TERMINOS', '1.0')?.version).toBe('1.0');
    expect(textoDe('TERMINOS', '9.9')).toBeNull();
    expect(textoDe('TERMINOS', 'toString')).toBeNull();
    expect(textoDe('TERMINOS', '__proto__')).toBeNull();
  });

  it('las versiones se comparan como números (1.10 va después de 1.9)', () => {
    expect(['1.10', '1.2', '1.9'].sort(compararVersiones)).toEqual(['1.2', '1.9', '1.10']);
    expect(ultimoTexto('TERMINOS').version).toBe('1.0');
  });

  it('las rutas públicas son las del prompt', () => {
    expect(PAGINAS_LEGALES.map((p) => p.ruta)).toEqual([
      '/legal/terminos',
      '/legal/politica-privacidad',
      '/legal/cookies',
      '/legal/derechos-y-pqr',
      '/legal/ia',
      '/legal/drive',
      '/legal/licencias',
    ]);
  });

  it('lo que no sabemos queda como [POR DEFINIR] y los textos de la política citan los plazos y derechos de la ley', () => {
    const privacidad = JSON.stringify(ultimoTexto('PRIVACIDAD'));
    const derechos = JSON.stringify(ultimoTexto('DERECHOS'));

    expect(privacidad).toContain('[POR DEFINIR');
    expect(derechos).toContain('10 días hábiles');
    expect(derechos).toContain('15 días hábiles');
    expect(JSON.stringify(ultimoTexto('TERMINOS'))).toContain('NIT 1069715364-1');
  });
});
