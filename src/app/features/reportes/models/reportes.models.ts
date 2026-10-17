/*
 * Field names are exactly the API's (snake_case). Money is COP; `margen_pct` is a percentage (42.86 = 42,86 %).
 */

export type AgruparMargen = 'PRODUCTO' | 'CLIENTE';

export interface MargenQuery {
  agrupar: AgruparMargen;
  /** `AAAA-MM-DD`, a day in Colombia. */
  desde: string;
  hasta: string;
  /** `margen`, `ingreso` or `nombre`, with `,asc` / `,desc`. */
  sort?: string;
}

/** Totals of the period. Lines of products that never had a production batch count in `ingreso` but not in `costo` or `margen`. */
export interface MargenTotales {
  ingreso: number;
  costo: number;
  margen: number;
  /** `null` when no line has a known cost. */
  margen_pct: number | null;
  lineas_sin_costo: number;
}

export interface MargenFila {
  id: number;
  nombre: string;
  /** `null` when grouping by client. */
  codigo_sku: string | null;
  unidades: number;
  ingreso: number;
  costo: number;
  margen: number;
  margen_pct: number | null;
  lineas_sin_costo: number;
}

/** Up to 500 rows, no pagination. ADMIN only (an OPERATIVO gets 403 / 20008). */
export interface MargenRespuesta {
  agrupar: AgruparMargen;
  desde: string;
  hasta: string;
  totales: MargenTotales;
  items: MargenFila[];
}
