export type EstadoCalidad = 'APROBADO' | 'RECHAZADO';

export interface Umbrales {
  temperatura_max: number;
  acidez_max: number;
}

export interface CalidadProveedor {
  id_proveedor: number;
  proveedor: string;
  numero_entregas: number;
  temperatura_promedio: number;
  acidez_promedio: number;
  entregas_rechazadas: number;
  porcentaje_rechazo: number;
}
