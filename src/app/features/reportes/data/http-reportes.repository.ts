import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { MargenQuery, MargenRespuesta } from '../models/reportes.models';
import { ReportesRepository } from './reportes.repository';

/** HTTP implementation: `{apiBaseUrl}/api/v1/reportes...`. JSON is snake_case on both sides. */
@Injectable({ providedIn: 'root' })
export class HttpReportesRepository extends ReportesRepository {
  private readonly api = inject(ApiService);

  margen(query: MargenQuery): Observable<MargenRespuesta> {
    return this.api.get<MargenRespuesta>('reportes/margen', { ...query });
  }
}
