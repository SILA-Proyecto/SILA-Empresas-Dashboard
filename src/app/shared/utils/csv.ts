export interface ColumnaCsv<T> {
  titulo: string;
  valor: (fila: T) => string | number | null | undefined;
}

/** A text that a spreadsheet would run as a formula (`=SUM(...)`, `+cmd`, `-2+3`, `@x`) gets a `'` in front so it stays text. */
const COMIENZA_COMO_FORMULA = /^[=+\-@\t\r]/;

function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  // Spanish-locale spreadsheets read «1500,5»; a point would turn the number into text.
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor).replace('.', ',') : '';
  const texto = COMIENZA_COMO_FORMULA.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * CSV text for Excel in Spanish: `;` between columns, `,` as the decimal mark, lines ending in CRLF and a BOM so the accents
 * are read as UTF-8. Text cells that could run as a formula are neutralised.
 */
export function construirCsv<T>(columnas: readonly ColumnaCsv<T>[], filas: readonly T[]): string {
  const encabezado = columnas.map((c) => celda(c.titulo)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';'));
  return '\uFEFF' + [encabezado, ...cuerpo].join('\r\n') + '\r\n';
}
