import { Injectable, signal } from '@angular/core';

/** The mark is shown in a tab title and a small tag: anything longer is not a mark, it is a mistake. */
const MAX_MARCA = 24;

/**
 * Mark of the environment («pruebas»), read at RUN time from `/entorno.json` so the same build serves every company.
 * The file is optional: in development the `npm run empresa` proxy answers it from the registry; on a server the web
 * server can serve a one-line file for a test company. No file (or anything that is not `{ "marca": "..." }`) = no mark.
 */
@Injectable({ providedIn: 'root' })
export class EntornoService {
  readonly marca = signal<string | null>(null);

  async cargar(): Promise<void> {
    try {
      const respuesta = await fetch('/entorno.json', { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!respuesta.ok) return;
      // Servers that answer every unknown path with index.html send HTML here: it does not parse and is ignored.
      const datos: unknown = JSON.parse(await respuesta.text());
      const marca = typeof datos === 'object' && datos !== null ? (datos as { marca?: unknown }).marca : undefined;
      if (typeof marca === 'string' && marca.trim() !== '' && marca.trim().length <= MAX_MARCA) this.marca.set(marca.trim());
    } catch {
      // No mark.
    }
  }
}
