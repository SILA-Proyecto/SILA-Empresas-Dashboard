import { formatoCop } from '../../shared/utils/formato-co';
import type { Periodo } from './models/periodos.models';

export interface FraseQuincena {
  clave: 'compras' | 'deuda' | 'resultado' | 'caja';
  texto: string;
}

type DatosQuincena = Pick<
  Periodo,
  | 'ingresos_ventas' | 'costo_produccion' | 'gastos_operativos' | 'cartera_castigada' | 'resultado_estimado'
  | 'total_cobrado' | 'caja_neta' | 'compras_materias_primas' | 'compras_contado' | 'compras_credito'
  | 'pagado_proveedores' | 'por_pagar_proveedores'
>;

const redondeo = (n: number) => Math.round(n * 100) / 100;

/**
 * Plain-language reading of a quincena's figures: what was bought, what is owed, why the result is what it is and where the
 * cash went. Pure: every number comes from the quincena itself, nothing is estimated here.
 */
export function explicarQuincena(p: DatosQuincena): FraseQuincena[] {
  const compras = p.compras_materias_primas ?? 0;
  const contado = p.compras_contado ?? 0;
  const credito = p.compras_credito ?? 0;
  const porPagar = p.por_pagar_proveedores ?? 0;
  const pagado = p.pagado_proveedores ?? 0;
  const salioDeCaja = redondeo(p.total_cobrado - p.caja_neta);
  const frases: FraseQuincena[] = [];

  frases.push({
    clave: 'compras',
    texto:
      compras > 0
        ? `Compraste ${formatoCop(compras)} en materias primas: ${formatoCop(contado)} de contado (ya salieron de caja) y ${formatoCop(credito)} a crédito (se pagan después).`
        : 'En esta quincena no hubo compras de materias primas.',
  });

  frases.push({
    clave: 'deuda',
    texto:
      porPagar > 0
        ? `Debes ${formatoCop(porPagar)} a proveedores por las compras a crédito de esta quincena${pagado > 0 ? ` (ya pagaste ${formatoCop(pagado)})` : ''}.`
        : 'No debes nada a proveedores por las compras de esta quincena.',
  });

  const extras = [
    p.gastos_operativos > 0 ? `${formatoCop(p.gastos_operativos)} de gastos` : '',
    p.cartera_castigada > 0 ? `${formatoCop(p.cartera_castigada)} de cartera castigada` : '',
  ].filter(Boolean);
  const r = p.resultado_estimado;
  const veredicto = r < 0 ? `la quincena va en pérdida de ${formatoCop(-r)}` : r > 0 ? `la quincena gana ${formatoCop(r)}` : 'la quincena queda en cero';
  frases.push({
    clave: 'resultado',
    texto:
      `Vendiste ${formatoCop(p.ingresos_ventas)} sin IVA y lo que se produjo costó ${formatoCop(p.costo_produccion)}${extras.length ? `, más ${extras.join(' y ')}` : ''}: ${veredicto}.` +
      (compras > 0 ? ' Lo que compraste y todavía no se usa en producción queda en inventario: no cuenta como pérdida.' : ''),
  });

  const caja = p.caja_neta;
  frases.push({
    clave: 'caja',
    texto:
      `En caja entraron ${formatoCop(p.total_cobrado)} y salieron ${formatoCop(salioDeCaja)} (compras de contado, pagos a proveedores y gastos): ` +
      (caja < 0 ? `la caja queda en negativo, ${formatoCop(-caja)}.` : caja > 0 ? `la caja queda a favor, ${formatoCop(caja)}.` : 'la caja queda en cero.') +
      (porPagar > 0 ? ' Lo que debes a proveedores todavía no ha salido de caja.' : ''),
  });

  return frases;
}
