import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { LoginPageComponent } from './login-page.component';

const MENSAJE = 'El servicio de su empresa está suspendido. Comuníquese con el proveedor del sistema.';

/** Empresa suspendida: el login muestra nombre, logo y el aviso, y ningún campo. */
describe('LoginPageComponent: empresa suspendida', () => {
  async function abrir(suspension: string | null) {
    const aviso = signal(suspension);
    // Each «Volver a comprobar» asks again; here the second answer says the company is active.
    const cargarPublica = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        { provide: AuthService, useValue: { sesion: signal(null) } },
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        {
          provide: EmpresaService,
          useValue: {
            cargarPublica,
            suspension: aviso,
            nombre: () => 'Lácteos Ejemplo SAS',
            nombreCorto: () => 'Ejemplo',
            logoVisible: () => '/api/v1/empresa/logo?v=abc',
            logoFallo: () => undefined,
          },
        },
      ],
    });
    const f = TestBed.createComponent(LoginPageComponent);
    const asentar = async () => {
      for (let i = 0; i < 3; i++) {
        f.detectChanges();
        await f.whenStable();
      }
    };
    await asentar();
    return { el: f.nativeElement as HTMLElement, aviso, cargarPublica, asentar };
  }

  it('suspendida: nombre y logo de la empresa con el aviso, sin usuario, clave ni botón de ingresar', async () => {
    const { el } = await abrir(MENSAJE);

    expect(el.querySelector('[data-testid=aviso-suspension]')?.textContent).toContain(MENSAJE);
    expect(el.textContent).toContain('SILA · Ejemplo');
    expect(el.querySelectorAll('[data-testid=logo-empresa-img]').length).toBeGreaterThan(0);
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(el.textContent).not.toContain('Ingresar');
  });

  it('activa: el formulario de siempre, sin aviso', async () => {
    const { el } = await abrir(null);

    expect(el.querySelector('[data-testid=aviso-suspension]')).toBeNull();
    expect(el.querySelector('input[autocomplete=username]')).not.toBeNull();
  });

  it('«Volver a comprobar» vuelve a pedir los datos públicos y, si ya está activa, muestra el formulario', async () => {
    const { el, aviso, cargarPublica, asentar } = await abrir(MENSAJE);
    cargarPublica.mockImplementation(() => {
      aviso.set(null);
      return Promise.resolve();
    });

    el.querySelector<HTMLButtonElement>('[data-testid=comprobar-suspension]')!.click();
    await asentar();

    expect(cargarPublica).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid=aviso-suspension]')).toBeNull();
    expect(el.querySelector('input[autocomplete=username]')).not.toBeNull();
  });
});
