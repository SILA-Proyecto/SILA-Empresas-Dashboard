import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { type Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api/api.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from '../services/auth.service';
import { MENSAJE_SUSPENDIDA, type CodigoModulo, type Empresa, type EmpresaActualizar, type EmpresaPublica, type EmpresaRespuesta } from './empresa.models';

const RUTA_LOGO = `${environment.apiBaseUrl}/api/${environment.apiVersion}/empresa/logo`;
/** The usual tab icon, put back when the company has no logo (or it fails to load). */
const FAVICON_SILA = { href: 'favicon.svg', type: 'image/svg+xml' };

/** Several calls can fail together with the same `20020`: one notice is enough. */
const AVISO_UNICO_MS = 3000;

/**
 * Company data and active modules, read from the backend (the dashboard never changes them: the owner of the
 * system does, from a script).
 *
 * - Loaded when a session starts (login or F5) and again when an answer carries `20020` (the owner switched a
 *   module off while the person was working). Cleared when the session ends.
 * - Until it has loaded, optional functions are NOT shown: better that they appear a moment later than that they
 *   show up and vanish.
 * - Hiding a function is not security: the backend already refuses it (`20020`).
 */
@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly documento = inject(DOCUMENT);

  private readonly respuesta = signal<EmpresaRespuesta | null>(null);
  private readonly publicaSignal = signal<EmpresaPublica | null>(null);

  /** Data of the company, or `null` while not loaded / without session. */
  readonly empresa = computed<Empresa | null>(() => this.respuesta()?.empresa ?? null);
  readonly cargada = computed(() => this.respuesta() !== null);
  private readonly activos = computed(() => new Set(this.respuesta()?.modulos_activos ?? []));

  /** Short name for titles: from the session data, or from the public data on the login screen. */
  readonly nombreCorto = computed(() => this.empresa()?.nombre_corto ?? this.publicaSignal()?.nombre_corto ?? null);
  readonly nombre = computed(() => this.empresa()?.nombre ?? this.publicaSignal()?.nombre ?? null);

  /**
   * The logo, or `null` without one. With a session `/empresa` decides (a logo removed there is gone even if the login
   * still had it); without one, `/empresa/publica`. The `?v=` makes the browser fetch it again when it changes.
   * Public route (no token), so a plain `<img src>` works.
   */
  readonly logoUrl = computed(() => {
    const respuesta = this.respuesta();
    const version = respuesta ? respuesta.logo_version : (this.publicaSignal()?.logo_version ?? null);
    return version ? `${RUTA_LOGO}?v=${encodeURIComponent(version)}` : null;
  });
  /** A logo that failed to load (broken or deleted meanwhile): it is drawn as if there were none. */
  private readonly logoRoto = signal<string | null>(null);
  readonly logoVisible = computed(() => {
    const url = this.logoUrl();
    return url && url !== this.logoRoto() ? url : null;
  });

  /** Message of a `20021` that arrived (login, refresh or any call); `null` while none has. */
  private readonly avisoSuspension = signal<string | null>(null);
  /**
   * The company is suspended: the login shows the notice instead of the form. Known from `/empresa/publica` (`estado`) or
   * from a `20021`. The public data has the last word when it arrives after the error (the owner may have reactivated it).
   */
  readonly suspension = computed<string | null>(() => {
    const aviso = this.avisoSuspension();
    if (aviso) return aviso;
    return this.publicaSignal()?.estado === 'SUSPENDIDA' ? MENSAJE_SUSPENDIDA : null;
  });

  /** Bumped when the session ends, so an answer that arrives afterwards is thrown away. */
  private generacion = 0;
  private enCurso: Promise<void> | null = null;
  private ultimoAviso = 0;

  constructor() {
    effect(() => {
      const conSesion = this.auth.isAuthenticated();
      untracked(() => {
        if (conSesion) void this.asegurarCargada();
        else this.limpiar();
      });
    });
    // Tab icon: the company logo when there is one, the usual one when not.
    effect(() => this.ponerFavicon(this.logoVisible()));
  }

  /** An `<img>` of the logo could not load it: show the version without logo everywhere (and the usual tab icon). */
  logoFallo(url: string): void {
    this.logoRoto.set(url);
  }

  /** `PUT /empresa`: the answer is the same as `GET /empresa`, so the state is taken from it without asking again. */
  guardarDatos(datos: EmpresaActualizar): Observable<EmpresaRespuesta> {
    return this.api.put<EmpresaRespuesta>('empresa', datos).pipe(tap((r) => this.aplicar(r)));
  }

  subirLogo(archivo: File, codigo: string): Observable<EmpresaRespuesta> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('codigo', codigo);
    return this.api.putFormData<EmpresaRespuesta>('empresa/logo', form).pipe(tap((r) => this.aplicar(r)));
  }

  quitarLogo(codigo: string): Observable<EmpresaRespuesta> {
    return this.api.delete<EmpresaRespuesta>('empresa/logo', undefined, { codigo }).pipe(tap((r) => this.aplicar(r)));
  }

  private aplicar(datos: EmpresaRespuesta): void {
    this.respuesta.set(datos);
    // The login of this browser shows the same logo next time without waiting for /empresa/publica.
    this.publicaSignal.update((p) => (p ? { ...p, logo_version: datos.logo_version } : p));
  }

  private ponerFavicon(url: string | null): void {
    const head = this.documento.head;
    let enlace = head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!enlace) {
      enlace = this.documento.createElement('link');
      enlace.rel = 'icon';
      head.appendChild(enlace);
    }
    // No `type` with the logo: it is a PNG or a JPG and the browser reads it from the answer.
    if (url) {
      enlace.removeAttribute('type');
      enlace.href = url;
    } else {
      enlace.type = FAVICON_SILA.type;
      enlace.setAttribute('href', FAVICON_SILA.href);
    }
  }

  /** `true` only if the module is on for this company AND the data has already loaded. */
  activo(modulo: CodigoModulo): boolean {
    return this.activos().has(modulo);
  }

  /** Loads the company data unless it is already there; resolves when the data is ready (or the call failed). */
  asegurarCargada(): Promise<void> {
    if (this.cargada()) return Promise.resolve();
    return this.recargar();
  }

  /** Reads `/empresa` again (several callers at once share one request). Keeps the previous data if the call fails. */
  recargar(): Promise<void> {
    if (!this.auth.isAuthenticated()) return Promise.resolve();
    if (this.enCurso) return this.enCurso;
    const generacion = this.generacion;
    const solicitud = (async () => {
      try {
        const datos = await firstValueFrom(this.api.get<EmpresaRespuesta>('empresa'));
        if (generacion === this.generacion) this.respuesta.set(datos);
      } catch {
        // Keeps what it had: optional functions stay as they were (hidden if nothing ever loaded).
      } finally {
        if (generacion === this.generacion) this.enCurso = null;
      }
    })();
    this.enCurso = solicitud;
    return solicitud;
  }

  /** An answer came back `20020`: show the backend's message (once per burst of failing calls) and redraw without the module. */
  moduloInactivo(mensaje: string): void {
    const ahora = Date.now();
    if (ahora - this.ultimoAviso > AVISO_UNICO_MS) {
      this.ultimoAviso = ahora;
      this.toast.error(mensaje);
    }
    void this.recargar();
  }

  /** An answer came back `20021`: remember the backend's message so the login shows it instead of the form. */
  empresaSuspendida(mensaje: string): void {
    this.avisoSuspension.set(mensaje || MENSAJE_SUSPENDIDA);
  }

  /**
   * Name and state for the login screen (no session needed). If it fails the screen just shows «SILA».
   * A fresh answer replaces whatever a `20021` said before: the login shows the form again once the company is active.
   */
  cargarPublica(): Promise<void> {
    return firstValueFrom(this.api.get<EmpresaPublica>('empresa/publica'))
      .then((datos) => {
        this.publicaSignal.set(datos);
        this.avisoSuspension.set(null);
      })
      .catch(() => undefined);
  }

  /** Session over: forget everything that belongs to it. */
  limpiar(): void {
    this.generacion++;
    this.enCurso = null;
    this.respuesta.set(null);
  }
}
