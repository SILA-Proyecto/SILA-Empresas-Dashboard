import { Injectable, effect, inject } from '@angular/core';
import { type Observable, firstValueFrom, map, tap } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Profile photos. They need the token, so they come through `HttpClient` as a `Blob`, never as a plain `<img src>`.
 * Each image is asked for ONCE per person + version and kept in memory as a Blob (a list of users does not repeat the
 * request per row); every avatar makes its own `blob:` URL from it and frees it. The memory is emptied when the session ends.
 */
@Injectable({ providedIn: 'root' })
export class FotosService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cache = new Map<string, Promise<Blob | null>>();

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) this.cache.clear();
    });
  }

  /** The photo of that person at that version, or `null` if it could not be read (the avatar then shows the initials). */
  imagen(idUsuario: number, version: string): Promise<Blob | null> {
    const clave = `${idUsuario}:${version}`;
    let pedido = this.cache.get(clave);
    if (!pedido) {
      pedido = firstValueFrom(this.api.getImagen(`fotos/${idUsuario}`)).catch(() => {
        // Not kept: a later avatar may try again.
        this.cache.delete(clave);
        return null;
      });
      this.cache.set(clave, pedido);
    }
    return pedido;
  }

  /** `PUT /fotos/yo` (no code). The new version goes into the session, so every avatar of mine redraws. */
  subirMia(archivo: File): Observable<string | null> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.api.putFormData<{ foto_version: string | null }>('fotos/yo', form).pipe(
      map((r) => r.foto_version),
      tap((version) => this.auth.actualizarFotoVersion(version)),
    );
  }

  quitarMia(): Observable<void> {
    return this.api.delete<void>('fotos/yo').pipe(tap(() => this.auth.actualizarFotoVersion(null)));
  }

  /** ADMIN: removes someone else's photo (e.g. an inappropriate one). Nobody can upload another person's photo. */
  quitarDe(idUsuario: number): Observable<void> {
    return this.api.delete<void>(`fotos/${idUsuario}`);
  }
}
