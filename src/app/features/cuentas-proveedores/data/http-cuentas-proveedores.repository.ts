import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
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
import { CuentasProveedoresRepository } from './cuentas-proveedores.repository';

const BASE = 'cuentas-proveedores';

@Injectable({ providedIn: 'root' })
export class HttpCuentasProveedoresRepository extends CuentasProveedoresRepository {
  private readonly api = inject(ApiService);

  listarPrecios(query: PageQuery & PreciosProveedorQuery): Observable<Page<PrecioProveedor>> {
    return this.api.get<Page<PrecioProveedor>>(`${BASE}/precios`, { ...query });
  }

  fijarPrecio(datos: FijarPrecioProveedor, claveIdempotencia: string): Observable<PrecioProveedor> {
    return this.api.post<PrecioProveedor>(`${BASE}/precios`, datos, { idempotencyKey: claveIdempotencia });
  }

  saldos(query: PageQuery & SaldosProveedorQuery): Observable<Page<SaldoProveedor>> {
    return this.api.get<Page<SaldoProveedor>>(`${BASE}/saldos`, { ...query });
  }

  resumen(query: PageQuery & ResumenProveedorQuery): Observable<Page<ResumenProveedorQuincena>> {
    return this.api.get<Page<ResumenProveedorQuincena>>(`${BASE}/resumen`, { ...query });
  }

  listarPagos(query: PageQuery & PagosProveedorQuery): Observable<Page<PagoProveedor>> {
    return this.api.get<Page<PagoProveedor>>(`${BASE}/pagos`, { ...query });
  }

  registrarPago(datos: NuevoPagoProveedor, claveIdempotencia: string): Observable<PagoProveedor> {
    return this.api.post<PagoProveedor>(`${BASE}/pagos`, datos, { idempotencyKey: claveIdempotencia });
  }

  anularPago(id: number, motivo: string, claveIdempotencia: string): Observable<PagoProveedor> {
    return this.api.post<PagoProveedor>(`${BASE}/pagos/${id}/anular`, { motivo }, { idempotencyKey: claveIdempotencia });
  }
}
