import type { MetodoPago } from '../../ventas/models/ventas.models';

export type EstadoCredito = 'AL_DIA' | 'VIGENTE' | 'EN_MORA' | 'EXCEDIDO';

export interface ClienteCartera {
  id_cliente: number;
  cliente: string;
  telefono: string | null;
  limite_credito: number;
  saldo_deudor: number;
  cupo_disponible: number;
  dias_mora: number;
  estado_credito: EstadoCredito;
}

export interface ClientesCarteraQuery {
  texto?: string;
  estado_credito?: EstadoCredito;
  /** The API default is `true`. */
  solo_con_deuda?: boolean;
  mora_minima?: number;
}

export interface ResumenCartera {
  total_cartera: number;
  clientes_con_deuda: number;
  clientes_en_mora: number;
  cartera_vencida: number;
}

export interface VentaPendiente {
  id_venta: number;
  fecha_venta: string;
  fecha_vencimiento: string;
  total_venta: number;
  saldo_pendiente: number;
  dias_mora: number;
}

export interface Abono {
  id_abono: number;
  id_recibo: number;
  id_cliente: number;
  cliente: string;
  id_venta: number;
  /** In practice a day (`AAAA-MM-DD`, Colombia), not a UTC timestamp like the other `fecha_*` fields. */
  fecha_abono: string;
  monto: number;
  metodo_pago: MetodoPago;
  referencia_pago: string | null;
  usuario_registro: string;
}

export interface AbonosQuery {
  id_cliente?: number;
  id_venta?: number;
  id_recibo?: number;
  metodo_pago?: MetodoPago;
  desde?: string;
  hasta?: string;
}

export interface NuevoAbono {
  id_cliente: number;
  monto: number;
  metodo_pago: MetodoPago;
  referencia?: string;
}

export interface Recibo {
  id_recibo: number;
  saldo_restante: number;
  abonos: Abono[];
}

export interface NuevoCastigo {
  id_cliente: number;
  motivo: string;
}

export interface CastigoResultado {
  id_cliente: number;
  monto_castigado: number;
}

export type ClaveRangoEdad = 'AL_DIA' | 'MORA_1_15' | 'MORA_16_30' | 'MORA_31_60' | 'MORA_MAS_60';

/** One age range of the debt: how much is owed and by how many clients (a client can be in several ranges). */
export interface RangoEdad {
  clave: ClaveRangoEdad;
  etiqueta: string;
  saldo: number;
  clientes: number;
}

/** `GET /cartera/edades`. `fecha_corte` is today in Colombia; a sale not yet due counts as «al día». */
export interface EdadesCartera {
  fecha_corte: string;
  total: number;
  clientes: number;
  rangos: RangoEdad[];
}

/** `GET /cartera/edades/clientes`: the debt of each client split by age. */
export interface ClienteEdades {
  id_cliente: number;
  cliente: string;
  telefono: string | null;
  saldo_total: number;
  ventas_pendientes: number;
  dias_mora_max: number;
  al_dia: number;
  /** 1 to 15 days late. */
  mora_leve: number;
  /** 16 to 30. */
  mora_media: number;
  /** 31 to 60. */
  mora_alta: number;
  /** More than 60. */
  mora_critica: number;
}

export interface EdadesClientesQuery {
  texto?: string;
}
