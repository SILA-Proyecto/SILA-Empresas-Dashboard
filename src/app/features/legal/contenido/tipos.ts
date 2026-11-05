/** Every public legal text. Only TERMINOS and PRIVACIDAD are versioned by the backend (see `core/legal`); the rest carry their own. */
export type DocumentoLegal = 'TERMINOS' | 'PRIVACIDAD' | 'COOKIES' | 'DERECHOS' | 'IA' | 'DRIVE';

/** A section of a text: plain strings only (the template draws them with `{{ }}`, never as raw HTML). */
export interface Seccion {
  id: string;
  titulo: string;
  parrafos?: readonly string[];
  items?: readonly string[];
  /** Paragraphs after the list. */
  cierre?: readonly string[];
}

export interface TextoLegal {
  documento: DocumentoLegal;
  version: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  titulo: string;
  /** One or two sentences shown under the title and on the index. */
  resumen: string;
  secciones: readonly Seccion[];
}

/**
 * A piece of data only the owner of the system (or the lawyer) knows. It is written in the text as `[POR DEFINIR: …]`
 * and drawn highlighted, so nothing made up passes as real. Every one is listed in `docs/legal/PENDIENTES_ABOGADO.md`.
 */
export const PATRON_POR_DEFINIR = /(\[POR DEFINIR[^\]]*\])/g;

/**
 * Shows the yellow «Borrador pendiente de validación jurídica» notice on every legal page. Turned off for a presentation:
 * set it back to `true` before using the texts with real customers (the lawyer's review is still pending).
 */
export const MOSTRAR_AVISO_BORRADOR = false;

/** In the texts, `{{empresa}}` is replaced with the name from `GET /empresa/publica` (never typed by hand). */
export const MARCA_EMPRESA = '{{empresa}}';
