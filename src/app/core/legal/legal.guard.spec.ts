import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { legalGuard } from './legal.guard';
import { LegalService } from './legal.service';

@Component({ template: '' })
class Vacia {}

describe('legalGuard', () => {
  let alDia: boolean | null;
  let asegurarEstado: ReturnType<typeof vi.fn>;

  async function ir(url: string): Promise<string> {
    asegurarEstado = vi.fn(() => Promise.resolve(alDia));
    TestBed.configureTestingModule({
      providers: [
        { provide: LegalService, useValue: { alDia: () => alDia, asegurarEstado } },
        provideRouter([
          { path: 'aceptar-terminos', component: Vacia },
          { path: '', canActivate: [legalGuard], canActivateChild: [legalGuard], children: [{ path: '', component: Vacia }, { path: 'ventas', component: Vacia }, { path: 'cartera', component: Vacia }] },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return router.url;
  }

  it('al día: deja entrar sin volver a preguntar', async () => {
    alDia = true;

    expect(await ir('/ventas')).toBe('/ventas');
    expect(asegurarEstado).not.toHaveBeenCalled();
  });

  it('sin aceptar: manda a la pantalla de aceptación y guarda la ruta a la que iba', async () => {
    alDia = false;

    expect(await ir('/cartera')).toBe('/aceptar-terminos?return=%2Fcartera');
  });

  it('sin aceptar y yendo al inicio: no agrega «return»', async () => {
    alDia = false;

    expect(await ir('/')).toBe('/aceptar-terminos');
  });

  it('todavía no se sabe: pregunta, y si falta aceptar manda a la pantalla', async () => {
    alDia = null;
    asegurarEstado = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: LegalService, useValue: { alDia: () => null, asegurarEstado: (asegurarEstado = vi.fn(() => Promise.resolve(false))) } },
        provideRouter([{ path: 'aceptar-terminos', component: Vacia }, { path: '', canActivate: [legalGuard], children: [{ path: 'ventas', component: Vacia }] }]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ventas');

    expect(asegurarEstado).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/aceptar-terminos?return=%2Fventas');
  });

  it('si la consulta falla (null) deja pasar: la API decide con 20022', async () => {
    alDia = null;

    expect(await ir('/ventas')).toBe('/ventas');
  });
});
