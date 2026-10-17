import type { Observable } from 'rxjs';
import type { Page, PageQuery } from '../../../core/api/page.models';
import type { CalidadProveedor, Umbrales } from '../models/acopio.models';

/**
 * Data contract of the milk quality screen (through ACOPIO_REPOSITORY). Read-only: deliveries are registered as
 * purchases of the LECHE materia prima (`/insumos/compras`) and payments live in `/cuentas-proveedores`.
 */
export abstract class AcopioRepository {
  abstract umbrales(): Observable<Umbrales>;
  abstract calidad(query: PageQuery): Observable<Page<CalidadProveedor>>;
}
