import { redondear2 } from '../../shared/utils/dinero';
import type { ClienteCartera, VentaPendiente } from './models/cartera.models';

export interface Reparto {
  id_venta: number;
  /** What this payment covers of the sale. */
  aplicado: number;
  /** What the sale would still owe afterwards. */
  saldo_despues: number;
}

/**
 * Preview of how a payment is applied: from the oldest pending sale to the newest (the order of `pendientes`).
 * The SERVER does the real split; the receipt it returns is what counts.
 */
export function repartirAbono(monto: number, pendientes: readonly VentaPendiente[]): Reparto[] {
  let restante = redondear2(monto);
  const reparto: Reparto[] = [];
  for (const v of pendientes) {
    if (restante <= 0) break;
    const aplicado = Math.min(restante, v.saldo_pendiente);
    reparto.push({ id_venta: v.id_venta, aplicado: redondear2(aplicado), saldo_despues: redondear2(v.saldo_pendiente - aplicado) });
    restante = redondear2(restante - aplicado);
  }
  return reparto;
}

export interface EdadCartera {
  clave: 'SIN_VENCER' | 'DE_1_A_15' | 'DE_16_A_30' | 'DE_31_A_60' | 'MAS_DE_60';
  texto: string;
  /** Mora mínima (días) que deja solo a los clientes de esta edad y las siguientes; 0 = sin filtro. */
  desde: number;
  clientes: number;
  saldo: number;
}

const EDADES: readonly Pick<EdadCartera, 'clave' | 'texto' | 'desde'>[] = [
  { clave: 'SIN_VENCER', texto: 'Sin vencer', desde: 0 },
  { clave: 'DE_1_A_15', texto: 'Vencida 1 a 15 días', desde: 1 },
  { clave: 'DE_16_A_30', texto: 'Vencida 16 a 30 días', desde: 16 },
  { clave: 'DE_31_A_60', texto: 'Vencida 31 a 60 días', desde: 31 },
  { clave: 'MAS_DE_60', texto: 'Vencida más de 60 días', desde: 61 },
];

function indiceDeEdad(diasMora: number): number {
  if (diasMora <= 0) return 0;
  if (diasMora <= 15) return 1;
  if (diasMora <= 30) return 2;
  return diasMora <= 60 ? 3 : 4;
}

/**
 * Groups the debt of each client by how late its MOST overdue sale is (`dias_mora`). The list endpoint gives one
 * `dias_mora` per client, so a client's whole balance goes in one group: a client with a sale 40 days late and another
 * not yet due counts completely under «31 a 60». Clients without debt are left out.
 */
export function agruparPorEdades(clientes: readonly Pick<ClienteCartera, 'saldo_deudor' | 'dias_mora'>[]): EdadCartera[] {
  const grupos: EdadCartera[] = EDADES.map((e) => ({ ...e, clientes: 0, saldo: 0 }));
  for (const c of clientes) {
    if (c.saldo_deudor <= 0) continue;
    const grupo = grupos[indiceDeEdad(c.dias_mora)];
    grupo.clientes += 1;
    grupo.saldo = redondear2(grupo.saldo + c.saldo_deudor);
  }
  return grupos;
}
