/** Optional modules the owner of the system can switch on or off per company. Everything else is core and always on. */
export type CodigoModulo =
  | 'CREDITO'
  | 'PRECIOS_CLIENTE'
  | 'CALIDAD_LECHE'
  | 'MARGEN'
  | 'ARCHIVOS'
  | 'ASISTENTE'
  | 'AUDITORIA'
  | 'PARAMETROS'
  | 'RESULTADO_QUINCENA';

export const MODULOS_OPCIONALES: readonly CodigoModulo[] = [
  'CREDITO',
  'PRECIOS_CLIENTE',
  'CALIDAD_LECHE',
  'MARGEN',
  'ARCHIVOS',
  'ASISTENTE',
  'AUDITORIA',
  'PARAMETROS',
  'RESULTADO_QUINCENA',
];

/** Error code of «this function is not active for your company» (HTTP 403). Not the same as 20008 (role). */
export const CODIGO_MODULO_INACTIVO = 20020;

/** Error code of «the owner of the system suspended this company» (HTTP 403, on every route, login and refresh included). */
export const CODIGO_EMPRESA_SUSPENDIDA = 20021;

/** Shown when the suspension is known only from `/empresa/publica` (no error message to show). Same text as the backend's. */
export const MENSAJE_SUSPENDIDA = 'El servicio de su empresa está suspendido. Comuníquese con el proveedor del sistema.';

export type EstadoEmpresa = 'ACTIVA' | 'SUSPENDIDA';

/** `GET /empresa/publica` (no session): only what the login screen needs. */
export interface EmpresaPublica {
  nombre: string;
  nombre_corto: string;
  /** 16 characters that change with the logo; `null` = no logo (then `/empresa/logo` is not asked for). */
  logo_version: string | null;
  /** Missing in older backends: then it is taken as active. */
  estado?: EstadoEmpresa;
}

/** `GET /empresa`. */
export interface Empresa {
  nombre: string;
  nombre_corto: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  correo_contacto: string | null;
  /** Printed at the foot of every page of the PDF receipts (up to 200 characters). */
  pie_comprobante: string | null;
}

export interface Modulo {
  codigo: string;
  nombre: string;
  descripcion: string;
  nucleo: boolean;
  activo: boolean;
}

export interface EmpresaRespuesta {
  empresa: Empresa;
  modulos: Modulo[];
  modulos_activos: string[];
  logo_version: string | null;
}

/**
 * `PUT /empresa` (ADMIN + second-factor code). The five fields go EVERY time: a missing or empty one is left blank.
 * Name, short name and NIT are not here: only the owner of the system changes them.
 */
export interface EmpresaActualizar {
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  correo_contacto: string | null;
  pie_comprobante: string | null;
  codigo: string;
}

/** Limits of `PUT /empresa` (same as the backend). */
export const LIMITES_EMPRESA = {
  direccion: 200,
  telefono: 40,
  ciudad: 80,
  correo_contacto: 150,
  pie_comprobante: 200,
} as const;

/** Logo and photos: PNG or JPG up to 5 MB (the backend decides by the content; this only saves the wait). */
export const TIPOS_IMAGEN = ['image/png', 'image/jpeg'] as const;
export const MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;
