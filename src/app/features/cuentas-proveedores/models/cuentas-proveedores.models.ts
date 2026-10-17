import type { PageQuery } from '../../../core/api/page.models';

export type MetodoPagoProveedor = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';
export type EstadoPagoProveedor = 'VIGENTE' | 'ANULADO';

export interface PrecioProveedor {
  id_precio: number;
  id_proveedor: number;
  proveedor: string;
  id_insumo: number;
  codigo: string;
  insumo: string;
  unidad_medida: string;
  precio_unitario: number;
  /** `AAAA-MM-DD`. */
  vigente_desde: string;
  vigente: boolean;
  usuario_creacion: string;
  /** UTC, sin zona. */
  fecha_creacion: string;
}

export interface PreciosProveedorQuery {
  id_proveedor?: number;
  id_insumo?: number;
  solo_vigentes?: boolean;
}

export interface FijarPrecioProveedor {
  id_proveedor: number;
  id_insumo: number;
  precio_unitario: number;
  vigente_desde?: string;
}

export interface SaldoProveedor {
  id_proveedor: number;
  proveedor: string;
  activo: boolean;
  total_comprado: number;
  total_pagado: number;
  saldo: number;
  ultima_compra: string | null;
  ultimo_pago: string | null;
}

export interface SaldosProveedorQuery {
  solo_con_saldo?: boolean;
}

export interface ResumenProveedorQuincena {
  id_periodo: number;
  anio: number;
  mes: number;
  quincena: number;
  id_proveedor: number;
  proveedor: string;
  numero_compras: number;
  valor_compras: number;
  valor_pagado: number;
  saldo: number;
}

export interface ResumenProveedorQuery {
  id_periodo?: number;
  anio?: number;
  id_proveedor?: number;
}

export interface PagoProveedor {
  id_pago: number;
  id_proveedor: number;
  proveedor: string;
  id_periodo: number;
  id_periodo_liquidado: number;
  anio: number;
  mes: number;
  quincena: number;
  fecha_pago: string;
  monto: number;
  metodo_pago: MetodoPagoProveedor;
  referencia_pago: string | null;
  estado: EstadoPagoProveedor;
  motivo_anulacion: string | null;
  usuario_registro: string;
  fecha_registro: string;
}

export interface PagosProveedorQuery {
  id_proveedor?: number;
  id_periodo?: number;
  id_periodo_liquidado?: number;
  estado?: EstadoPagoProveedor;
}

export interface NuevoPagoProveedor {
  id_proveedor: number;
  id_periodo_liquidado: number;
  monto: number;
  metodo_pago: MetodoPagoProveedor;
  referencia_pago?: string;
  fecha_pago?: string;
}
