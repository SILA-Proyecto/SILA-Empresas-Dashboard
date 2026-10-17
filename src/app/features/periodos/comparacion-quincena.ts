import { redondear2 } from '../../shared/utils/dinero';
import type { Periodo } from './models/periodos.models';

export interface CambioQuincena {
  clave: 'ventas' | 'cobrado' | 'gastos' | 'resultado' | 'caja';
  etiqueta: string;
  actual: number;
  anterior: number;
  /** actual − anterior. */
  diferencia: number;
  /** Change as a percentage of the previous figure, one decimal; `null` when the previous one was 0 (no base to compare with). */
  porcentaje: number | null;
  /** `'mejor'` / `'peor'` for the business (more expenses is worse), `'igual'` when nothing changed. */
  efecto: 'mejor' | 'peor' | 'igual';
}

/** The quincena right before `actual` among `periodos` (any order, any years), or `null` if there is none. */
export function quincenaAnterior(actual: Pick<Periodo, 'id_periodo' | 'fecha_inicio'>, periodos: readonly Periodo[]): Periodo | null {
  let anterior: Periodo | null = null;
  for (const p of periodos) {
    if (p.id_periodo === actual.id_periodo || p.fecha_inicio >= actual.fecha_inicio) continue;
    if (!anterior || p.fecha_inicio > anterior.fecha_inicio) anterior = p;
  }
  return anterior;
}

const LINEAS: readonly { clave: CambioQuincena['clave']; etiqueta: string; valor: (p: Periodo) => number; masEsMejor: boolean }[] = [
  { clave: 'ventas', etiqueta: 'Ventas (sin IVA)', valor: (p) => p.ingresos_ventas, masEsMejor: true },
  { clave: 'cobrado', etiqueta: 'Cobrado', valor: (p) => p.total_cobrado, masEsMejor: true },
  { clave: 'gastos', etiqueta: 'Gastos', valor: (p) => p.gastos_operativos, masEsMejor: false },
  { clave: 'resultado', etiqueta: 'Resultado de la quincena', valor: (p) => p.resultado_estimado, masEsMejor: true },
  { clave: 'caja', etiqueta: 'Caja', valor: (p) => p.caja_neta, masEsMejor: true },
];

/** How each key figure moved from the previous quincena to this one. */
export function compararQuincenas(actual: Periodo, anterior: Periodo): CambioQuincena[] {
  return LINEAS.map((l) => {
    const ahora = l.valor(actual);
    const antes = l.valor(anterior);
    const diferencia = redondear2(ahora - antes);
    return {
      clave: l.clave,
      etiqueta: l.etiqueta,
      actual: ahora,
      anterior: antes,
      diferencia,
      porcentaje: antes === 0 ? null : Math.round((diferencia / Math.abs(antes)) * 1000) / 10,
      efecto: diferencia === 0 ? 'igual' : diferencia > 0 === l.masEsMejor ? 'mejor' : 'peor',
    };
  });
}
