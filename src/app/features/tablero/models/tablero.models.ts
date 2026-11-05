import type { Notificacion } from '../../notificaciones/models/notificaciones.models';
import type { EstadoPeriodo } from '../../periodos/models/periodos.models';

/** What happened TODAY (Colombia day). Annulled sales do not add up. */
export interface TableroHoy {
  /** With IVA: `ventas_contado + ventas_credito`. */
  ventas_total: number;
  ventas_cantidad: number;
  ventas_contado: number;
  /** `null` when the company has the credit module off. */
  ventas_credito: number | null;
  /** What came in and went out of the cash box today (a credit sale does not come in; the abonos do). */
  caja_ingresos: number;
  caja_egresos: number;
  /** Can be negative. */
  caja_neta: number;
  /** Approved liters only. */
  litros_recibidos: number;
  litros_rechazados: number;
  lotes_producidos: number;
}

/** The quincena that contains today, with the same figures as `GET /periodos`. */
export interface TableroQuincena {
  id_periodo: number;
  anio: number;
  mes: number;
  quincena: number;
  /** `AAAA-MM-DD`. */
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodo;
  /** The six result figures (`ingresos_ventas`, `costo_produccion`, `gastos_operativos`, `cartera_castigada`,
   * `resultado_estimado`, `caja_neta`) are `null` when the company has the RESULTADO_QUINCENA module off: «not shown», never zero. */
  ingresos_ventas: number | null;
  total_vendido: number;
  total_cobrado: number;
  costo_produccion: number | null;
  gastos_operativos: number | null;
  cartera_castigada: number | null;
  resultado_estimado: number | null;
  caja_neta: number | null;
  leche_litros: number;
  por_pagar_proveedores: number;
}

export interface TableroCartera {
  saldo_total: number;
  saldo_vencido: number;
  clientes_con_saldo: number;
  clientes_en_mora: number;
}

export interface TableroInventario {
  /** At sale price (stock × base price). */
  valor_productos: number;
  productos_bajo_minimo: number;
  productos_agotados: number;
  /** At average cost. */
  valor_insumos: number;
  insumos_bajo_minimo: number;
  /** Expire in 7 days or less and have not expired yet. */
  lotes_por_vencer: number;
}

export interface TableroProveedores {
  /** All that is owed to suppliers (history, not only this quincena). */
  saldo_por_pagar: number;
  proveedores_con_saldo: number;
}

export interface TableroAlertas {
  /** The same totals as the bell (`GET /notificaciones`). */
  total: number;
  criticas: number;
  /** At most 5, the critical ones first. */
  principales: Notificacion[];
}

export interface VentaDia {
  /** `AAAA-MM-DD`. */
  fecha: string;
  total: number;
  cantidad: number;
}

/** `GET /tablero`: a read-only snapshot, the same for ADMIN and OPERATIVO. */
export interface Tablero {
  /** Today in Colombia, `AAAA-MM-DD`. */
  fecha: string;
  hoy: TableroHoy;
  /** `null` when today falls in no quincena that was created. */
  quincena: TableroQuincena | null;
  /** `null` when the company has the credit module off. */
  cartera: TableroCartera | null;
  inventario: TableroInventario;
  proveedores: TableroProveedores;
  alertas: TableroAlertas;
  /** Always 7 rows, from 6 days ago to today (the last one); days without sales come with 0. */
  ventas_semana: VentaDia[];
}
