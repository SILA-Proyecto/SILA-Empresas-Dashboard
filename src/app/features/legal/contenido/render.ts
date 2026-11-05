import { MARCA_EMPRESA, PATRON_POR_DEFINIR } from './tipos';

/** A piece of a paragraph: normal text, or a `[POR DEFINIR: …]` that is drawn highlighted. */
export interface Trozo {
  texto: string;
  porDefinir: boolean;
}

/** Name used when `GET /empresa/publica` did not answer (it is never typed by hand). */
export const EMPRESA_SIN_NOMBRE = 'la empresa';

/** Puts the company name where the text says `{{empresa}}` and cuts the paragraph at every `[POR DEFINIR …]`. Pure: no HTML. */
export function trozos(parrafo: string, empresa: string | null): Trozo[] {
  const lleno = parrafo.split(MARCA_EMPRESA).join(empresa?.trim() || EMPRESA_SIN_NOMBRE);
  return lleno
    .split(PATRON_POR_DEFINIR)
    .filter((t) => t.length > 0)
    .map((texto) => ({ texto, porDefinir: texto.startsWith('[POR DEFINIR') }));
}

/** How many `[POR DEFINIR]` a text still has (the banner of the page says so). */
export function contarPorDefinir(textos: readonly string[]): number {
  return textos.reduce((n, t) => n + (t.match(PATRON_POR_DEFINIR)?.length ?? 0), 0);
}
