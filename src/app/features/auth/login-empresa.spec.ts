import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { LoginPageComponent } from './login-page.component';

/** El login muestra el nombre que da `GET /empresa/publica`; si no llega, solo «SILA». */
describe('LoginPageComponent: nombre de la empresa', () => {
  async function abrir(empresa: { nombre: string | null; nombreCorto: string | null; logo?: string | null }) {
    const cargarPublica = vi.fn(() => Promise.resolve());
    const logo = signal(empresa.logo ?? null);
    const logoFallo = vi.fn(() => logo.set(null));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        { provide: AuthService, useValue: { sesion: signal(null) } },
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        {
          provide: EmpresaService,
          useValue: { cargarPublica, suspension: () => null, nombre: () => empresa.nombre, nombreCorto: () => empresa.nombreCorto, logoVisible: logo, logoFallo },
        },
      ],
    });
    const f = TestBed.createComponent(LoginPageComponent);
    for (let i = 0; i < 3; i++) {
      f.detectChanges();
      await f.whenStable();
    }
    const el = f.nativeElement as HTMLElement;
    return { texto: el.textContent!.replace(/\s+/g, ' '), cargarPublica, el, f, logoFallo };
  }

  it('pide el nombre público al abrirse y lo pone en las dos cabeceras y en el pie', async () => {
    const { texto, cargarPublica } = await abrir({ nombre: 'Lácteos Ejemplo SAS', nombreCorto: 'Ejemplo' });

    expect(cargarPublica).toHaveBeenCalledTimes(1);
    expect(texto.match(/SILA · Ejemplo/g)).toHaveLength(2);
    expect(texto).toContain('© Lácteos Ejemplo SAS · Colombia');
    expect(texto).not.toContain('Llanolat');
  });

  it('si el nombre no llega muestra solo «SILA»', async () => {
    const { texto } = await abrir({ nombre: null, nombreCorto: null });

    expect(texto).toContain('SILA');
    expect(texto).toContain('© SILA · Colombia');
    expect(texto).not.toContain('SILA ·  ');
    expect(texto).not.toContain('Llanolat');
  });

  it('con logo lo muestra encima del nombre, en las dos cabeceras, con el nombre de la empresa como alt', async () => {
    const { el } = await abrir({ nombre: 'Lácteos Ejemplo SAS', nombreCorto: 'Ejemplo', logo: '/api/v1/empresa/logo?v=abc' });

    const imagenes = el.querySelectorAll<HTMLImageElement>('[data-testid=logo-empresa-img]');
    expect(imagenes).toHaveLength(2);
    imagenes.forEach((img) => {
      expect(img.getAttribute('src')).toBe('/api/v1/empresa/logo?v=abc');
      expect(img.alt).toBe('Lácteos Ejemplo SAS');
      expect(img.className).toContain('object-contain');
    });
    expect(el.querySelector('[data-testid=logo-empresa-iniciales]')).toBeNull();
  });

  it('sin logo muestra las iniciales del nombre corto (nunca una imagen)', async () => {
    const { el } = await abrir({ nombre: 'Lácteos Ejemplo SAS', nombreCorto: 'Ejemplo' });

    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('[data-testid=logo-empresa-iniciales]')?.textContent?.trim()).toBe('E');
  });

  it('si la imagen del logo falla vuelve a la versión sin logo (sin ícono de imagen rota)', async () => {
    const { el, f, logoFallo } = await abrir({ nombre: 'Lácteos Ejemplo SAS', nombreCorto: 'Ejemplo', logo: '/api/v1/empresa/logo?v=roto' });

    el.querySelector('[data-testid=logo-empresa-img]')!.dispatchEvent(new Event('error'));
    f.detectChanges();

    expect(logoFallo).toHaveBeenCalledWith('/api/v1/empresa/logo?v=roto');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelectorAll('[data-testid=logo-empresa-iniciales]')).toHaveLength(2);
  });
});
