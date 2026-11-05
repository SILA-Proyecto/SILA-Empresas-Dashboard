import type { CodigoModulo } from '../../core/empresa/empresa.models';

export type GrupoParametro = 'Crédito y ventas' | 'Calidad de la leche' | 'Leche y proveedores' | 'Producción' | 'Seguridad de acceso' | 'Otros';

export const ORDEN_GRUPOS: readonly GrupoParametro[] = ['Crédito y ventas', 'Calidad de la leche', 'Leche y proveedores', 'Producción', 'Seguridad de acceso', 'Otros'];

/** Friendly name and theme of each known key. `modulo`: the key is only listed when the company has that module. An unknown key falls under «Otros» with the server's description as its name. */
export const PARAMETROS_CONOCIDOS: Record<string, { nombre: string; grupo: GrupoParametro; modulo?: CodigoModulo }> = {
  PLAZO_CREDITO_DIAS: { nombre: 'Plazo de crédito (días)', grupo: 'Crédito y ventas', modulo: 'CREDITO' },
  MAX_LINEAS_DOCUMENTO: { nombre: 'Productos máximos por venta o nota crédito', grupo: 'Crédito y ventas' },
  IVA_DEFECTO_PORCENTAJE: { nombre: 'IVA propuesto para productos nuevos (%)', grupo: 'Crédito y ventas' },
  TEMP_MAX_LECHE_C: { nombre: 'Temperatura máxima de la leche (°C)', grupo: 'Calidad de la leche', modulo: 'CALIDAD_LECHE' },
  ACIDEZ_MAX_DORNIC: { nombre: 'Acidez máxima de la leche (°Dornic)', grupo: 'Calidad de la leche', modulo: 'CALIDAD_LECHE' },
  PRECIO_LECHE_DEFAULT: { nombre: 'Precio de la leche por defecto (COP por litro)', grupo: 'Leche y proveedores' },
  DIAS_VIDA_UTIL_DEFAULT: { nombre: 'Vida útil de un lote nuevo (días)', grupo: 'Producción' },
  LOGIN_MAX_INTENTOS: { nombre: 'Intentos fallidos antes de bloquear una cuenta', grupo: 'Seguridad de acceso' },
  LOGIN_BLOQUEO_MINUTOS: { nombre: 'Duración del bloqueo de una cuenta (minutos)', grupo: 'Seguridad de acceso' },
  SESION_MAX_HORAS: { nombre: 'Duración máxima de una sesión (horas)', grupo: 'Seguridad de acceso' },
};
