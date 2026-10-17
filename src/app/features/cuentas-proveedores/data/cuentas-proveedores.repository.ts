import type { Observable } from 'rxjs';
import type { Page, PageQuery } from '../../../core/api/page.models';
import type {
  FijarPrecioProveedor,
  NuevoPagoProveedor,
  PagoProveedor,
  PagosProveedorQuery,
  PrecioProveedor,
  PreciosProveedorQuery,
  ResumenProveedorQuincena,
  ResumenProveedorQuery,
  SaldoProveedor,
  SaldosProveedorQuery,
} from '../models/cuentas-proveedores.models';

export abstract class CuentasProveedoresRepository {
  abstract listarPrecios(query: PageQuery & PreciosProveedorQuery): Observable<Page<PrecioProveedor>>;
  /** [ADMIN] Requires `Idempotency-Key`. */
  abstract fijarPrecio(datos: FijarPrecioProveedor, claveIdempotencia: string): Observable<PrecioProveedor>;
  abstract saldos(query: PageQuery & SaldosProveedorQuery): Observable<Page<SaldoProveedor>>;
  abstract resumen(query: PageQuery & ResumenProveedorQuery): Observable<Page<ResumenProveedorQuincena>>;
  abstract listarPagos(query: PageQuery & PagosProveedorQuery): Observable<Page<PagoProveedor>>;
  /** [ADMIN] Requires `Idempotency-Key`. 400 / 20005 when amount exceeds quincena balance. */
  abstract registrarPago(datos: NuevoPagoProveedor, claveIdempotencia: string): Observable<PagoProveedor>;
  /** [ADMIN] Requires `Idempotency-Key`. Motivo de 10 a 255 caracteres. */
  abstract anularPago(id: number, motivo: string, claveIdempotencia: string): Observable<PagoProveedor>;
}
