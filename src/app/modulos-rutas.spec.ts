import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { MODULOS_OPCIONALES, type CodigoModulo } from './core/empresa/empresa.models';
import { EmpresaService } from './core/empresa/empresa.service';
import { crearEmpresaFalsa } from './core/empresa/testing/empresa-falsa';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './shared/ui/toast/toast.service';

@Component({ template: 'tablero' })
class TableroVacio {}

/** Quien escribe en la barra la dirección de una pantalla de un módulo apagado cae en el tablero, con un aviso. */
describe('rutas de módulos opcionales', () => {
  const PANTALLAS: [CodigoModulo, string][] = [
    ['CREDITO', '/cartera'],
    ['PRECIOS_CLIENTE', '/precios-cliente'],
    ['CALIDAD_LECHE', '/acopio'],
    ['MARGEN', '/reportes/margen'],
    ['ARCHIVOS', '/archivos'],
    ['ARCHIVOS', '/archivos/drive'],
    ['ARCHIVOS', '/archivos/accesos'],
  ];

  async function ir(activos: readonly CodigoModulo[], url: string) {
    const hijos = routes.find((r) => r.path === '')!.children!.map((r) => (r.path === 'tablero' ? { path: 'tablero', component: TableroVacio } : r));
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '', children: hijos }]), { provide: EmpresaService, useValue: crearEmpresaFalsa(activos) }],
    });
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN', mfa_activo: true });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  for (const [modulo, url] of PANTALLAS) {
    it(`${url} sin ${modulo}: lleva al tablero y avisa`, async () => {
      const destino = await ir(
        MODULOS_OPCIONALES.filter((m) => m !== modulo),
        url,
      );

      expect(destino).toBe('/tablero');
      expect(TestBed.inject(ToastService).toasts().map((t) => t.mensaje)).toEqual(['Esta función no está activa para su empresa.']);
    });
  }

  it('las pantallas del núcleo no dependen de ningún módulo', async () => {
    const destino = await ir([], '/tablero');

    expect(destino).toBe('/tablero');
    expect(TestBed.inject(ToastService).toasts()).toHaveLength(0);
  });
});
