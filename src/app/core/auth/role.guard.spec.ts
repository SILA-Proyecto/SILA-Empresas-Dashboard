import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUDITORIA_ROUTES } from '../../features/auditoria/auditoria.routes';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../empresa/empresa.models';
import { provideEmpresaFalsa } from '../empresa/testing/empresa-falsa';
import { AuthService } from '../services/auth.service';
import type { Rol } from './auth.models';

@Component({ template: '' })
class Vacia {}

/** The guard of the ADMIN screens, tried through the real routes. */
describe('roleGuard en las rutas de administración', () => {
  async function ir(rol: Rol | null, url: string, activos: readonly CodigoModulo[] = MODULOS_OPCIONALES): Promise<string> {
    TestBed.configureTestingModule({
      providers: [provideEmpresaFalsa(activos), provideRouter([{ path: '', component: Vacia }, { path: 'auditoria', loadChildren: () => AUDITORIA_ROUTES }])],
    });
    if (rol) {
      TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'x', nombre: 'X', email: 'x@example.com', rol, mfa_activo: false });
    }
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return router.url;
  }

  it('un ADMIN llega a /auditoria', async () => {
    expect(await ir('ADMIN', '/auditoria')).toBe('/auditoria');
  });

  it('un OPERATIVO NO llega a /auditoria: termina en el inicio, no en una pantalla en blanco', async () => {
    expect(await ir('OPERATIVO', '/auditoria')).toBe('/');
  });

  it('sin sesión tampoco', async () => {
    expect(await ir(null, '/auditoria')).toBe('/');
  });

  it('con el módulo AUDITORIA apagado ni el ADMIN llega a /auditoria', async () => {
    expect(await ir('ADMIN', '/auditoria', MODULOS_OPCIONALES.filter((m) => m !== 'AUDITORIA'))).toBe('/');
  });
});
