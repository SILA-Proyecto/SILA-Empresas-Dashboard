import { MAXIMO_IMAGEN_BYTES, TIPOS_IMAGEN } from '../../core/empresa/empresa.models';

/** `accept` of the file inputs for the logo and the profile photo. */
export const ACEPTA_IMAGEN = TIPOS_IMAGEN.join(',');

/**
 * Quick check before uploading a logo or a photo, only to spare the wait: the backend decides by the CONTENT of the
 * file (and runs the antivirus). `null` = fine to send.
 */
export function revisarImagen(archivo: File): string | null {
  if (!(TIPOS_IMAGEN as readonly string[]).includes(archivo.type)) return 'Solo se aceptan imágenes PNG o JPG.';
  if (archivo.size > MAXIMO_IMAGEN_BYTES) return 'La imagen pasa de 5 MB. Elige una más liviana.';
  if (archivo.size === 0) return 'El archivo está vacío.';
  return null;
}
