import type { ChipTono } from '../../shared/ui/status-chip/status-chip.component';
import type { ClaveRangoEdad, EstadoCredito } from './models/cartera.models';

export const ESTADOS_CREDITO: readonly EstadoCredito[] = ['AL_DIA', 'VIGENTE', 'EN_MORA', 'EXCEDIDO'];

const CHIPS: Record<EstadoCredito, { texto: string; tono: ChipTono }> = {
  AL_DIA: { texto: 'Al día', tono: 'exito' },
  VIGENTE: { texto: 'Vigente', tono: 'info' },
  EN_MORA: { texto: 'En mora', tono: 'peligro' },
  EXCEDIDO: { texto: 'Excedido', tono: 'peligro' },
};

export function chipEstadoCredito(estado: EstadoCredito): { texto: string; tono: ChipTono } {
  return CHIPS[estado];
}

/** Per age range: the column of `GET /cartera/edades/clientes` that holds it (also its `sort` key) and its colour, from calm to serious. */
export const RANGOS_EDAD: Record<ClaveRangoEdad, { columna: 'al_dia' | 'mora_leve' | 'mora_media' | 'mora_alta' | 'mora_critica'; barra: string; corto: string }> = {
  AL_DIA: { columna: 'al_dia', barra: 'bg-success', corto: 'Al día' },
  MORA_1_15: { columna: 'mora_leve', barra: 'bg-primary', corto: '1 a 15 días' },
  MORA_16_30: { columna: 'mora_media', barra: 'bg-warning', corto: '16 a 30 días' },
  MORA_31_60: { columna: 'mora_alta', barra: 'bg-destructive/70', corto: '31 a 60 días' },
  MORA_MAS_60: { columna: 'mora_critica', barra: 'bg-destructive', corto: 'Más de 60 días' },
};
export const CLAVES_RANGO_EDAD: readonly ClaveRangoEdad[] = ['AL_DIA', 'MORA_1_15', 'MORA_16_30', 'MORA_31_60', 'MORA_MAS_60'];
