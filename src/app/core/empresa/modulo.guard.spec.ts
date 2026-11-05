import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { EmpresaService } from './empresa.service';
import { moduloGuard } from './modulo.guard';
import { crearEmpresaFalsa } from './testing/empresa-falsa';

describe('moduloGuard', () => {
  let router: Router;
  let toast: ToastService;

  const ejecutar = (codigo: Parameters<typeof moduloGuard>[0]) =>
    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => moduloGuard(codigo)({} as ActivatedRouteSnapshot, { url: '/cartera' } as RouterStateSnapshot)) as Promise<boolean | UrlTree>;

  function preparar(activos: Parameters<typeof crearEmpresaFalsa>[0]) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: EmpresaService, useValue: crearEmpresaFalsa(activos) }] });
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
  }

  it('deja pasar si el módulo está activo', async () => {
    preparar(['CREDITO']);

    expect(await ejecutar('CREDITO')).toBe(true);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('si el módulo está apagado manda al tablero con un aviso', async () => {
    preparar(['MARGEN']);

    const resultado = (await ejecutar('CREDITO')) as UrlTree;

    expect(router.serializeUrl(resultado)).toBe('/');
    expect(toast.toasts().map((t) => t.mensaje)).toEqual(['Esta función no está activa para su empresa.']);
  });

  it('espera a que carguen los datos de la empresa antes de decidir (recarga de la página)', async () => {
    const falsa = crearEmpresaFalsa([]);
    let listo!: () => void;
    falsa.asegurarCargada = () =>
      new Promise<void>((resolver) => {
        listo = () => {
          falsa.activos.set(['CREDITO']);
          resolver();
        };
      });
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: EmpresaService, useValue: falsa }] });

    const decision = ejecutar('CREDITO');
    listo();

    expect(await decision).toBe(true);
  });
});
