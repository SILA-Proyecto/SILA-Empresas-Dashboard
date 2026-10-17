import type { Rol } from '../../core/services/auth.service';

/**
 * A question to try. `completar`: it ends with «…», so tapping it only writes it in the box for the person to finish
 * (sending «¿Cuánto debe el cliente…?» as it is would make no sense).
 */
export interface EjemploAsistente {
  texto: string;
  completar: boolean;
}

const COMUNES: EjemploAsistente[] = [
  { texto: '¿Dónde registro una compra de leche?', completar: false },
  { texto: '¿Cuánto debe el cliente…?', completar: true },
];

const SOLO_OPERATIVO: EjemploAsistente[] = [{ texto: '¿Qué stock hay de…?', completar: true }];

const SOLO_ADMIN: EjemploAsistente[] = [
  { texto: '¿Cómo van las ventas de este mes?', completar: false },
  { texto: '¿Cuánto le debemos a los proveedores?', completar: false },
];

/** The ADMIN also sees what the business is doing (sales, debts to suppliers); the OPERATIVO, the day-to-day questions. */
export function ejemplosPara(rol: Rol | null): EjemploAsistente[] {
  return rol === 'ADMIN' ? [...COMUNES, ...SOLO_ADMIN] : [...COMUNES, ...SOLO_OPERATIVO];
}
