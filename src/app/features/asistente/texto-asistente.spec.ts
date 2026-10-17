import { analizarTexto, trozosDe } from './texto-asistente';

describe('texto del asistente', () => {
  it('un párrafo con saltos de línea queda en un solo bloque', () => {
    expect(analizarTexto('Hola\nsegunda línea')).toEqual([{ tipo: 'parrafo', trozos: [{ texto: 'Hola\nsegunda línea', negrita: false }] }]);
  });

  it('una línea en blanco separa párrafos', () => {
    expect(analizarTexto('Uno\n\nDos')).toHaveLength(2);
  });

  it('las líneas con guion (o asterisco o viñeta) forman una lista', () => {
    const bloques = analizarTexto('Tienes:\n- Queso\n* Suero\n• Cuajada\nFin');
    expect(bloques.map((b) => b.tipo)).toEqual(['parrafo', 'lista', 'parrafo']);
    const lista = bloques[1];
    expect(lista.tipo === 'lista' && lista.items.map((i) => i[0].texto)).toEqual(['Queso', 'Suero', 'Cuajada']);
  });

  it('**negrita** se separa del texto normal', () => {
    expect(trozosDe('Debe **$ 1.000** hoy')).toEqual([
      { texto: 'Debe ', negrita: false },
      { texto: '$ 1.000', negrita: true },
      { texto: ' hoy', negrita: false },
    ]);
  });

  it('un ** sin pareja se deja como está', () => {
    expect(trozosDe('2 ** 3')).toEqual([{ texto: '2 ** 3', negrita: false }]);
  });

  it('una línea que empieza por **negrita** no es una viñeta', () => {
    expect(analizarTexto('**Total**: 5')[0].tipo).toBe('parrafo');
  });

  it('un título con # se muestra como una línea en negrita, sin los #', () => {
    expect(analizarTexto('## Ventas')).toEqual([{ tipo: 'parrafo', trozos: [{ texto: 'Ventas', negrita: true }] }]);
  });

  it('el HTML se queda como texto: nunca se interpreta', () => {
    const [bloque] = analizarTexto('<img src=x onerror=alert(1)> <b>hola</b>');
    expect(bloque.tipo === 'parrafo' && bloque.trozos[0].texto).toBe('<img src=x onerror=alert(1)> <b>hola</b>');
  });

  it('texto vacío no produce bloques', () => {
    expect(analizarTexto('  \n\n ')).toEqual([]);
  });
});
