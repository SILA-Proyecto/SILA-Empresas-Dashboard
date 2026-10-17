import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import type { Page } from './page.models';

/** The API caps a page at 100 rows (`size` 1–100). */
export const TAMANO_MAXIMO_PAGINA = 100;

/**
 * Every row of a listing that can have more than one page, for selectors and totals that need the whole list (not one page).
 * Asks for page 0, and if `total` says there is more, the remaining pages are requested together. `maxPaginas` is a safety stop
 * (1,000 rows by default): past it the result is cut and `total` still tells the truth.
 */
export function todasLasPaginas<T>(pedir: (consulta: { page: number; size: number }) => Observable<Page<T>>, maxPaginas = 10): Observable<Page<T>> {
  return pedir({ page: 0, size: TAMANO_MAXIMO_PAGINA }).pipe(
    switchMap((primera) => {
      const paginas = Math.min(Math.ceil(primera.total / TAMANO_MAXIMO_PAGINA), maxPaginas);
      if (paginas <= 1) return of(primera);
      const resto = Array.from({ length: paginas - 1 }, (_, i) => pedir({ page: i + 1, size: TAMANO_MAXIMO_PAGINA }));
      return forkJoin(resto).pipe(map((otras) => ({ ...primera, items: [...primera.items, ...otras.flatMap((p) => p.items)] })));
    }),
  );
}
