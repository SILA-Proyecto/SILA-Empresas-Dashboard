export interface RangoRapido {
  id: 'mes' | 'mes-pasado' | 'quincena' | 'quincena-anterior' | '30-dias';
  etiqueta: string;
  desde: string;
  hasta: string;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const dia = (anio: number, mes: number, d: number) => `${anio}-${dosDigitos(mes)}-${dosDigitos(d)}`;
/** Last day of a month (`mes` 1-12). */
const ultimoDia = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

/** The same day `dias` earlier. Works on the calendar date, never on a clock time, so no time zone can move it. */
function restarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
}

/**
 * Shortcuts for the period of a report, from «today» in Colombia (`AAAA-MM-DD`). Quincena 1 is days 1-15 and quincena 2 is day 16
 * to the end of the month. The current month and quincena stop at today (nothing has been sold after it).
 */
export function rangosRapidos(hoy: string): RangoRapido[] {
  const [anio, mes, d] = hoy.split('-').map(Number);
  const mesAnterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };

  const quincenaActualDesde = d <= 15 ? 1 : 16;
  const quincenaAnterior =
    d <= 15
      ? { desde: dia(mesAnterior.anio, mesAnterior.mes, 16), hasta: dia(mesAnterior.anio, mesAnterior.mes, ultimoDia(mesAnterior.anio, mesAnterior.mes)) }
      : { desde: dia(anio, mes, 1), hasta: dia(anio, mes, 15) };

  return [
    { id: 'mes', etiqueta: 'Este mes', desde: dia(anio, mes, 1), hasta: hoy },
    { id: 'mes-pasado', etiqueta: 'Mes pasado', desde: dia(mesAnterior.anio, mesAnterior.mes, 1), hasta: dia(mesAnterior.anio, mesAnterior.mes, ultimoDia(mesAnterior.anio, mesAnterior.mes)) },
    { id: 'quincena', etiqueta: 'Esta quincena', desde: dia(anio, mes, quincenaActualDesde), hasta: hoy },
    { id: 'quincena-anterior', etiqueta: 'Quincena anterior', ...quincenaAnterior },
    { id: '30-dias', etiqueta: 'Últimos 30 días', desde: restarDias(hoy, 29), hasta: hoy },
  ];
}
