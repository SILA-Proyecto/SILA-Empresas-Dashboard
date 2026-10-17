import type { Observable } from 'rxjs';
import type { Page, PageQuery } from '../../../core/api/page.models';
import type {
  Abono,
  AbonosQuery,
  CastigoResultado,
  ClienteCartera,
  ClienteEdades,
  ClientesCarteraQuery,
  EdadesCartera,
  EdadesClientesQuery,
  NuevoAbono,
  NuevoCastigo,
  Recibo,
  ResumenCartera,
  VentaPendiente,
} from '../models/cartera.models';

/**
 * Data contract of Cartera (through CARTERA_REPOSITORY).
 * Errors arrive as `ApiError`: 20005 (amount above the debt), 20008 role, 20016 / 20017 idempotency,
 * 409 when there is nothing to write off.
 */
export abstract class CarteraRepository {
  abstract clientes(query: PageQuery & ClientesCarteraQuery): Observable<Page<ClienteCartera>>;
  abstract resumen(): Observable<ResumenCartera>;
  /** The debt split by days of mora (totals). Read-only, ADMIN and OPERATIVO. */
  abstract edades(): Observable<EdadesCartera>;
  /** The same split per client. `sort`: cliente, saldo_total (default, desc), dias_mora_max, al_dia, mora_leve, mora_media, mora_alta, mora_critica. */
  abstract edadesClientes(query: PageQuery & EdadesClientesQuery): Observable<Page<ClienteEdades>>;
  /** Oldest first: the order in which a payment is applied. A plain array. */
  abstract ventasPendientes(idCliente: number): Observable<VentaPendiente[]>;
  abstract abonos(query: PageQuery & AbonosQuery): Observable<Page<Abono>>;
  /** Requires `Idempotency-Key`. ONE payment method per payment. */
  abstract registrarAbono(datos: NuevoAbono, claveIdempotencia: string): Observable<Recibo>;
  /** [ADMIN] Irreversible. Requires `Idempotency-Key`. */
  abstract castigar(datos: NuevoCastigo, claveIdempotencia: string): Observable<CastigoResultado>;
}
