import type { Observable } from 'rxjs';
import type { MargenQuery, MargenRespuesta } from '../models/reportes.models';

/**
 * Data contract of the Reportes screens (through REPORTES_REPOSITORY). Read-only and ADMIN-only.
 * Errors arrive as `ApiError`: 20001 invalid data (dates), 20008 role.
 */
export abstract class ReportesRepository {
  /** Estimated margin: sales without VAT minus the AVERAGE production cost of each product (it is not known which batch each unit came from). */
  abstract margen(query: MargenQuery): Observable<MargenRespuesta>;
}
