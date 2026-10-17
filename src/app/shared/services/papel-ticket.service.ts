import { Injectable, signal } from '@angular/core';

/** Widths of the thermal paper rolls the shop prints on, in millimetres. */
export type AnchoPapel = 58 | 80;
export const ANCHOS_PAPEL: readonly AnchoPapel[] = [58, 80];

const CLAVE = 'sila.papel-ticket';

function leer(): AnchoPapel {
  try {
    const guardado = Number(localStorage.getItem(CLAVE));
    return guardado === 58 ? 58 : 80;
  } catch {
    // Storage can be blocked (private window): the default is used and nothing is remembered.
    return 80;
  }
}

/** The paper of the ticket printer (58 or 80 mm), remembered in this browser: it is a property of the shop's printer, not of the sale. */
@Injectable({ providedIn: 'root' })
export class PapelTicketService {
  readonly ancho = signal<AnchoPapel>(leer());

  elegir(ancho: AnchoPapel): void {
    this.ancho.set(ancho);
    try {
      localStorage.setItem(CLAVE, String(ancho));
    } catch {
      // Not remembered; it still applies to this session.
    }
  }
}
