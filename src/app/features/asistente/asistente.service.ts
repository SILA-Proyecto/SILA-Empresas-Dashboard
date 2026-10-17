import { Injectable, effect, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { causaDe, isApiError } from '../../core/api/api-error';
import { nuevaClaveIdempotencia } from '../../core/api/idempotencia';
import { AuthService } from '../../core/services/auth.service';
import { ASISTENTE_REPOSITORY } from './data/asistente.provider';
import type { ErrorChat, MensajeChat } from './models/asistente.models';

export const LARGO_MAXIMO_MENSAJE = 1000;
/** `sessionStorage` of THIS tab only; the server keeps no conversations. */
const CLAVE_ALMACEN = 'sila_asistente';
/** Older bubbles are dropped from the saved copy so it never grows without limit. */
const MAXIMO_GUARDADOS = 60;

const SIN_SERVICIO = 'El asistente no está disponible ahora.';
const DEMASIADAS = 'Has hecho muchas preguntas, intenta en un rato.';

interface Guardado {
  usuario: string;
  sesionId: string;
  mensajes: MensajeChat[];
}

/** Words for the person for each failure; `reintentable` = sending the same text again can work. */
export function describirErrorAsistente(fallo: unknown): ErrorChat {
  const error = causaDe(fallo);
  if (!isApiError(error)) return { mensaje: SIN_SERVICIO, reintentable: true };
  switch (error.code) {
    case 20015:
      return { mensaje: DEMASIADAS, reintentable: false };
    case 20019:
    case 20999:
    case 0:
      return { mensaje: SIN_SERVICIO, reintentable: true };
    default:
      return { mensaje: error.message, reintentable: false };
  }
}

/**
 * The conversation with the help assistant: one question at a time, the answer comes as text.
 *
 * - The history lives in memory and in this tab's `sessionStorage` (so F5 does not lose it) and is erased when the session
 *   ends, for whatever reason, or when another user signs in on the same tab.
 * - `sesion_id` is one UUID per conversation; «Nueva conversación» makes another one.
 * - Each send uses a NEW `Idempotency-Key`, also when the same text is retried: the assistant only reads, and a repeated
 *   key could hand back the failure that was stored for the first try.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly repo = inject(ASISTENTE_REPOSITORY);
  private readonly auth = inject(AuthService);

  readonly mensajes = signal<readonly MensajeChat[]>([]);
  readonly enviando = signal(false);
  readonly error = signal<ErrorChat | null>(null);

  private sesionId = nuevaClaveIdempotencia();
  private siguienteId = 1;
  private pendiente: string | null = null;
  private envio: Subscription | null = null;
  private tuvoSesion = false;

  constructor() {
    this.recuperar();
    effect(() => {
      const hay = this.auth.isAuthenticated();
      if (hay) {
        this.tuvoSesion = true;
        this.descartarSiEsOtroUsuario();
      } else if (this.tuvoSesion) {
        this.tuvoSesion = false;
        this.nuevaConversacion();
      }
    });
  }

  /** Sends a question. `false` when it was not sent (empty, too long or another one still running). */
  enviar(texto: string): boolean {
    const limpio = texto.trim();
    if (!limpio || limpio.length > LARGO_MAXIMO_MENSAJE || this.enviando()) return false;
    this.mensajes.update((m) => [...m, { id: this.siguienteId++, de: 'usuario', texto: limpio }]);
    this.pendiente = limpio;
    this.preguntar(limpio);
    return true;
  }

  /** Sends again the text that failed, without repeating it in the conversation. */
  reintentar(): void {
    if (this.pendiente && !this.enviando()) this.preguntar(this.pendiente);
  }

  /** Forgets everything: the thread, the `sesion_id` and any question in flight. */
  nuevaConversacion(): void {
    this.envio?.unsubscribe();
    this.envio = null;
    this.enviando.set(false);
    this.error.set(null);
    this.pendiente = null;
    this.mensajes.set([]);
    this.siguienteId = 1;
    this.sesionId = nuevaClaveIdempotencia();
    this.borrarGuardado();
  }

  private preguntar(mensaje: string): void {
    this.error.set(null);
    this.enviando.set(true);
    const sesionId = this.sesionId;
    this.envio = this.repo.preguntar({ mensaje, sesion_id: sesionId }, nuevaClaveIdempotencia()).subscribe({
      next: (r) => {
        this.pendiente = null;
        this.enviando.set(false);
        this.mensajes.update((m) => [...m, { id: this.siguienteId++, de: 'asistente', texto: r.respuesta }]);
        this.guardar();
      },
      error: (fallo: unknown) => {
        this.enviando.set(false);
        const descrito = describirErrorAsistente(fallo);
        if (!descrito.reintentable) this.pendiente = null;
        this.error.set(descrito);
        this.guardar();
      },
    });
  }

  // ---------- tab storage (every access can fail: private window, blocked data) ----------

  private guardar(): void {
    const usuario = this.auth.sesion()?.usuario;
    if (!usuario) return;
    const guardado: Guardado = { usuario, sesionId: this.sesionId, mensajes: this.mensajes().slice(-MAXIMO_GUARDADOS) };
    try {
      sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify(guardado));
    } catch {
      /* the conversation just lives in memory */
    }
  }

  private borrarGuardado(): void {
    try {
      sessionStorage.removeItem(CLAVE_ALMACEN);
    } catch {
      /* nothing to delete */
    }
  }

  private leerGuardado(): Guardado | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE_ALMACEN);
      if (!crudo) return null;
      const g = JSON.parse(crudo) as Partial<Guardado>;
      const validos = Array.isArray(g.mensajes) && g.mensajes.every((m) => (m.de === 'usuario' || m.de === 'asistente') && typeof m.texto === 'string' && typeof m.id === 'number');
      return typeof g.usuario === 'string' && typeof g.sesionId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(g.sesionId) && validos ? (g as Guardado) : null;
    } catch {
      return null;
    }
  }

  private recuperar(): void {
    const usuario = this.auth.sesion()?.usuario;
    const guardado = this.leerGuardado();
    if (!guardado || guardado.usuario !== usuario) {
      if (guardado) this.borrarGuardado();
      return;
    }
    this.sesionId = guardado.sesionId;
    this.mensajes.set(guardado.mensajes);
    this.siguienteId = guardado.mensajes.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  }

  /** Another person signed in on this same tab without the previous session ending here: start clean. */
  private descartarSiEsOtroUsuario(): void {
    const guardado = this.leerGuardado();
    if (guardado && guardado.usuario !== this.auth.sesion()?.usuario) this.nuevaConversacion();
  }
}
