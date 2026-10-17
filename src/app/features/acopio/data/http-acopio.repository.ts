import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { Page, PageQuery } from '../../../core/api/page.models';
import type { CalidadProveedor, Umbrales } from '../models/acopio.models';
import { AcopioRepository } from './acopio.repository';

const BASE = 'acopio';

/** HTTP implementation: `{apiBaseUrl}/api/v1/acopio...`. JSON is snake_case on both sides. */
@Injectable({ providedIn: 'root' })
export class HttpAcopioRepository extends AcopioRepository {
  private readonly api = inject(ApiService);

  umbrales(): Observable<Umbrales> {
    return this.api.get<Umbrales>(`${BASE}/umbrales`);
  }

  calidad(query: PageQuery): Observable<Page<CalidadProveedor>> {
    return this.api.get<Page<CalidadProveedor>>(`${BASE}/calidad`, { ...query });
  }
}
