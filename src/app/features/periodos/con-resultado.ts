import type { Periodo } from './models/periodos.models';

type CampoResultado = 'ingresos_ventas' | 'costo_produccion' | 'gastos_operativos' | 'cartera_castigada' | 'resultado_estimado' | 'caja_neta';

/** A quincena whose result figures came (the RESULTADO_QUINCENA module is on). */
export type PeriodoConResultado = Omit<Periodo, CampoResultado> & { [K in CampoResultado]: number };

/** The six result figures came. With the module off the API sends them as `null`: «not shown», never $0. */
export function tieneResultado<T extends Periodo>(p: T): p is T & PeriodoConResultado {
  return (
    p.ingresos_ventas !== null &&
    p.costo_produccion !== null &&
    p.gastos_operativos !== null &&
    p.cartera_castigada !== null &&
    p.resultado_estimado !== null &&
    p.caja_neta !== null
  );
}
