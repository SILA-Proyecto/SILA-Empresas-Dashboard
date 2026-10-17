import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { MensajeEnviado, RespuestaAsistente } from '../models/asistente.models';
import { AsistenteRepository } from './asistente.repository';

/** HTTP implementation: `{apiBaseUrl}/api/v1/asistente/mensajes`. JSON is snake_case on both sides. */
@Injectable({ providedIn: 'root' })
export class HttpAsistenteRepository extends AsistenteRepository {
  private readonly api = inject(ApiService);

  preguntar(cuerpo: MensajeEnviado, clave: string): Observable<RespuestaAsistente> {
    return this.api.post<RespuestaAsistente>('asistente/mensajes', cuerpo, { idempotencyKey: clave });
  }
}
