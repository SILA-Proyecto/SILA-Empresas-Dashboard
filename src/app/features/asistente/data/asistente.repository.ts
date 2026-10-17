import type { Observable } from 'rxjs';
import type { MensajeEnviado, RespuestaAsistente } from '../models/asistente.models';

/**
 * Data contract of the help assistant (through ASISTENTE_REPOSITORY). It only reads: it can never change data.
 * Errors arrive as `ApiError`: 20001 bad message, 20015 too many questions (30 per hour), 20019 assistant off or too slow.
 */
export abstract class AsistenteRepository {
  /** One question. Takes 3 to 30 s (up to 60). `clave` is the `Idempotency-Key` of this send. */
  abstract preguntar(cuerpo: MensajeEnviado, clave: string): Observable<RespuestaAsistente>;
}
