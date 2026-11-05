/** The two documents the person must accept (the backend only knows which VERSION rules; the texts live in the dashboard). */
export type DocumentoAceptable = 'TERMINOS' | 'PRIVACIDAD';

/** `GET /legal/vigentes` (no session). */
export interface VersionVigente {
  documento: DocumentoAceptable;
  version: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
}

export interface VigentesRespuesta {
  documentos: VersionVigente[];
}

/** One document in `GET /legal/estado`: what THIS person has accepted against what rules now. */
export interface EstadoDocumento extends VersionVigente {
  aceptado: boolean;
  fecha_aceptacion: string | null;
}

export interface EstadoLegal {
  al_dia: boolean;
  documentos: EstadoDocumento[];
}

/** `POST /legal/aceptar`: the two documents, in the versions that were SHOWN to the person. */
export interface AceptarRequest {
  aceptaciones: { documento: DocumentoAceptable; version: string }[];
}

/** Error code of «you have not accepted the terms and privacy policy in force» (HTTP 403). The session stays open. */
export const CODIGO_LEGAL_PENDIENTE = 20022;

/** Error code of «the version you accepted is no longer the one in force» (HTTP 409): read the documents again. */
export const CODIGO_LEGAL_CAMBIO_VERSION = 20023;

/** Where the acceptance screen lives. */
export const RUTA_ACEPTAR_TERMINOS = '/aceptar-terminos';
