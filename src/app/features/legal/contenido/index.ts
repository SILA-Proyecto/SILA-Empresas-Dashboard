import { COOKIES_1_0 } from './cookies';
import { DERECHOS_1_0 } from './derechos';
import { DRIVE_1_0 } from './drive';
import { IA_1_0 } from './ia';
import { PRIVACIDAD_1_0 } from './privacidad';
import { TERMINOS_1_0 } from './terminos';
import type { DocumentoLegal, TextoLegal } from './tipos';

/**
 * Every text, by document and version. When the backend raises TERMINOS or PRIVACIDAD to `1.1`, the new text is ADDED here and
 * `1.0` stays (it is how anyone can see what was accepted). If the backend asks for a version that is not here, the page says
 * «versión no disponible» and the acceptance screen does NOT let anyone accept.
 */
export const TEXTOS: Readonly<Record<DocumentoLegal, Readonly<Record<string, TextoLegal>>>> = {
  TERMINOS: { '1.0': TERMINOS_1_0 },
  PRIVACIDAD: { '1.0': PRIVACIDAD_1_0 },
  COOKIES: { '1.0': COOKIES_1_0 },
  DERECHOS: { '1.0': DERECHOS_1_0 },
  IA: { '1.0': IA_1_0 },
  DRIVE: { '1.0': DRIVE_1_0 },
};

/** The text of a document in a version, or `null` if there is none. */
export function textoDe(documento: DocumentoLegal, version: string): TextoLegal | null {
  return Object.hasOwn(TEXTOS[documento], version) ? TEXTOS[documento][version] : null;
}

/** The newest text we have (versions compare as numbers, `1.10` after `1.9`). */
export function ultimoTexto(documento: DocumentoLegal): TextoLegal {
  const versiones = Object.keys(TEXTOS[documento]).sort(compararVersiones);
  return TEXTOS[documento][versiones[versiones.length - 1]];
}

export function compararVersiones(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** The public pages: one route and one label each. `licencias` has no versioned text (it is generated). */
export interface PaginaLegal {
  ruta: string;
  etiqueta: string;
  /** Short label for the footer. */
  corta: string;
  documento?: DocumentoLegal;
}

export const PAGINAS_LEGALES: readonly PaginaLegal[] = [
  { ruta: '/legal/terminos', etiqueta: 'Términos y condiciones de uso', corta: 'Términos', documento: 'TERMINOS' },
  { ruta: '/legal/politica-privacidad', etiqueta: 'Política de privacidad', corta: 'Privacidad', documento: 'PRIVACIDAD' },
  { ruta: '/legal/cookies', etiqueta: 'Cookies y almacenamiento local', corta: 'Cookies', documento: 'COOKIES' },
  { ruta: '/legal/derechos-y-pqr', etiqueta: 'Derechos y canal de PQR', corta: 'Derechos y PQR', documento: 'DERECHOS' },
  { ruta: '/legal/ia', etiqueta: 'Aviso de uso de inteligencia artificial', corta: 'Aviso de IA', documento: 'IA' },
  { ruta: '/legal/drive', etiqueta: 'Aviso de conexión con Google Drive', corta: 'Google Drive', documento: 'DRIVE' },
  { ruta: '/legal/licencias', etiqueta: 'Créditos y licencias de terceros', corta: 'Licencias' },
];

export const RUTA_TERMINOS = '/legal/terminos';
export const RUTA_PRIVACIDAD = '/legal/politica-privacidad';
export const RUTA_COOKIES = '/legal/cookies';
export const RUTA_DERECHOS = '/legal/derechos-y-pqr';
export const RUTA_IA = '/legal/ia';
export const RUTA_DRIVE = '/legal/drive';
export const RUTA_LICENCIAS = '/legal/licencias';

export type { DocumentoLegal, TextoLegal } from './tipos';
