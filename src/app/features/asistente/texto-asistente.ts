/**
 * The assistant answers plain text with, at most, line breaks, `- ` lists and **bold**. This turns it into blocks the template
 * draws with `@for` and interpolation, so nothing from the answer is ever parsed as HTML.
 */
export interface Trozo {
  texto: string;
  negrita: boolean;
}

export type Bloque = { tipo: 'parrafo'; trozos: Trozo[] } | { tipo: 'lista'; items: Trozo[][] };

const VIÑETA = /^\s*[-*•]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;

/** `**negrita**` pairs become bold pieces; an unpaired `**` stays as typed. */
export function trozosDe(linea: string): Trozo[] {
  const partes = linea.split('**');
  // An even number of parts means an odd number of `**`: the last one has no pair, so it is plain text.
  const sinPareja = partes.length % 2 === 0;
  const trozos: Trozo[] = [];
  partes.forEach((texto, i) => {
    const negrita = i % 2 === 1 && !(sinPareja && i === partes.length - 1);
    const literal = i % 2 === 1 && !negrita ? `**${texto}` : texto;
    if (literal === '') return;
    const ultimo = trozos.at(-1);
    if (ultimo && ultimo.negrita === negrita) ultimo.texto += literal;
    else trozos.push({ texto: literal, negrita });
  });
  return trozos;
}

export function analizarTexto(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length > 0) bloques.push({ tipo: 'parrafo', trozos: trozosDe(parrafo.join('\n')) });
    parrafo = [];
  };

  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const viñeta = VIÑETA.exec(linea);
    const titulo = TITULO.exec(linea);
    if (viñeta && !/^\s*\*\*/.test(linea)) {
      cerrarParrafo();
      const ultimo = bloques.at(-1);
      const item = trozosDe(viñeta[1]);
      if (ultimo?.tipo === 'lista') ultimo.items.push(item);
      else bloques.push({ tipo: 'lista', items: [item] });
    } else if (titulo) {
      cerrarParrafo();
      bloques.push({ tipo: 'parrafo', trozos: [{ texto: titulo[1].replace(/\*\*/g, ''), negrita: true }] });
    } else if (linea.trim() === '') {
      cerrarParrafo();
    } else {
      parrafo.push(linea.trim());
    }
  }
  cerrarParrafo();
  return bloques;
}
