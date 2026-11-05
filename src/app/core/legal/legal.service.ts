import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { type Observable, firstValueFrom, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthService } from '../services/auth.service';
import type { AceptarRequest, EstadoLegal, VigentesRespuesta } from './legal.models';

/**
 * Acceptance of the terms and the privacy policy.
 *
 * - The ONLY evidence is the one the backend keeps (who, which version, when, IP). What is remembered here is just
 *   «am I up to date?» in memory, to avoid asking on every screen; it is forgotten when the session ends and is never
 *   written to the browser's storage.
 * - `alDia`: `null` = not known yet (or the check failed), `true`/`false` = what the backend said last.
 */
@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly estadoSignal = signal<EstadoLegal | null>(null);
  private readonly alDiaSignal = signal<boolean | null>(null);
  private enCurso: Promise<boolean | null> | null = null;
  /** Bumped when the session ends, so an answer that arrives afterwards is thrown away. */
  private generacion = 0;

  readonly estado = this.estadoSignal.asReadonly();
  readonly alDia = this.alDiaSignal.asReadonly();
  readonly pendiente = computed(() => this.alDiaSignal() === false);

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) untracked(() => this.limpiar());
    });
  }

  /** Versions in force. No session needed (the login and the public pages use it). */
  vigentes(): Observable<VigentesRespuesta> {
    return this.api.get<VigentesRespuesta>('legal/vigentes');
  }

  /**
   * Asks `GET /legal/estado` unless it is already known to be up to date. Resolves `true`/`false`, or `null` if the call
   * failed (then the caller lets the person go on: the API itself answers `20022` where it matters).
   */
  asegurarEstado(): Promise<boolean | null> {
    if (this.alDiaSignal() === true) return Promise.resolve(true);
    return this.recargar();
  }

  /** Reads `/legal/estado` again (several callers at once share one request). */
  recargar(): Promise<boolean | null> {
    if (this.enCurso) return this.enCurso;
    const generacion = this.generacion;
    const solicitud = (async (): Promise<boolean | null> => {
      try {
        const estado = await firstValueFrom(this.api.get<EstadoLegal>('legal/estado'));
        if (generacion === this.generacion) this.aplicar(estado);
        return estado.al_dia;
      } catch {
        return null;
      } finally {
        if (generacion === this.generacion) this.enCurso = null;
      }
    })();
    this.enCurso = solicitud;
    return solicitud;
  }

  /** Same call as `recargar`, but the failure reaches the caller (the acceptance screen shows it with «Reintentar»). */
  cargarEstado(): Observable<EstadoLegal> {
    return this.api.get<EstadoLegal>('legal/estado').pipe(tap((estado) => this.aplicar(estado)));
  }

  /** `POST /legal/aceptar`: the answer is the new state. */
  aceptar(cuerpo: AceptarRequest): Observable<EstadoLegal> {
    return this.api.post<EstadoLegal>('legal/aceptar', cuerpo).pipe(tap((estado) => this.aplicar(estado)));
  }

  /**
   * An answer came back `20022`. Returns `true` if this is the FIRST one since the person was last up to date, so the
   * caller redirects only once (several calls fail together) and never loops.
   */
  marcarPendiente(): boolean {
    const yaPendiente = this.alDiaSignal() === false;
    this.alDiaSignal.set(false);
    return !yaPendiente;
  }

  /** Session over: forget everything. */
  limpiar(): void {
    this.generacion++;
    this.enCurso = null;
    this.estadoSignal.set(null);
    this.alDiaSignal.set(null);
  }

  private aplicar(estado: EstadoLegal): void {
    this.estadoSignal.set(estado);
    this.alDiaSignal.set(estado.al_dia);
  }
}
