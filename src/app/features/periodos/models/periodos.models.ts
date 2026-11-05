import type { PageQuery } from '../../../core/api/page.models';

/*
 * Field names are exactly the API's (snake_case, same as the view columns),
 * so rows pass through without mapping. See docs/CONTRATO_BACKEND.md.
 */

export type EstadoPeriodo = 'ABIERTA' | 'CERRADA';

/** One quincena (row of the periods view). Dates are ISO `AAAA-MM-DD`; amounts are COP. */
export interface Periodo {
  id_periodo: number;
  anio: number;
  mes: number;
  /** 1 = days 1-15, 2 = day 16 to the end of the month. */
  quincena: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodo;
  /**
   * The six result figures (`ingresos_ventas`, `costo_produccion`, `gastos_operativos`, `cartera_castigada`, `resultado_estimado`,
   * `caja_neta`) are `null` when the company has the RESULTADO_QUINCENA module off: «not shown», never zero.
   */
  ingresos_ventas: number | null;
  costo_produccion: number | null;
  gastos_operativos: number | null;
  cartera_castigada: number | null;
  /** Computed by the database: ingresos - costo - gastos - cartera castigada. Management estimate, not accounting. */
  resultado_estimado: number | null;

  // ---- Quincena accounts (see «Cuentas de la quincena» of the contract) ----
  /** IVA of the (non-annulled) sales. `ingresos_ventas` is WITHOUT IVA. */
  iva_ventas: number;
  /** Total sold WITH IVA. */
  total_vendido: number;
  ventas_contado: number;
  ventas_credito: number;
  cobrado_contado: number;
  /** Cartera payments received DURING the quincena (of any sale). */
  cobrado_abonos: number;
  total_cobrado: number;
  /** What clients still owe from this quincena's sales. */
  cartera_pendiente: number;
  leche_litros: number;
  leche_litros_rechazados: number;
  leche_comprada: number;
  /** Everything bought and approved in the quincena = compras_contado + compras_credito. */
  compras_materias_primas: number;
  compras_contado: number;
  compras_credito: number;
  /** Paid for THIS quincena's credit purchases, even if paid later. */
  pagado_proveedores: number;
  /** compras_credito − pagado_proveedores. */
  por_pagar_proveedores: number;
  /** Payments to providers made DURING the quincena (from cash). */
  pagos_proveedores_caja: number;
  /** total_cobrado − pagos_proveedores_caja − gastos_operativos − compras_contado. */
  caja_neta: number | null;
}

export interface PeriodosQuery {
  anio?: number;
  estado?: EstadoPeriodo;
}

export type ListarPeriodosQuery = PageQuery & PeriodosQuery;

/** Answer of `POST periodos/anio/{anio}`. `creados` is 0 when the year already existed. */
export interface CrearPeriodosResultado {
  anio: number;
  creados: number;
}
