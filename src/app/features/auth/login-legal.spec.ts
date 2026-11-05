import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { LoginPageComponent } from './login-page.component';

/** El login enlaza los textos legales, con una línea INFORMATIVA (la aceptación que cuenta es la pantalla de después del ingreso). */
describe('LoginPageComponent: información legal', () => {
  async function abrir(suspension: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        { provide: AuthService, useValue: { sesion: signal(null) } },
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: EmpresaService, useValue: { cargarPublica: () => Promise.resolve(), suspension: () => suspension, nombre: () => 'Empresa Kevin', nombreCorto: () => 'Emp Kevin', logoVisible: () => null, logoFallo: () => undefined } },
      ],
    });
    const f = TestBed.createComponent(LoginPageComponent);
    for (let i = 0; i < 3; i++) {
      f.detectChanges();
      await f.whenStable();
    }
    return f.nativeElement as HTMLElement;
  }

  it('dice «Al ingresar, aceptas los Términos y la Política de Privacidad» con los dos enlaces (pestaña nueva, para no perder lo escrito)', async () => {
    const el = await abrir();
    const linea = el.querySelector('[data-testid=login-legal]')!;
    const enlaces = Array.from(linea.querySelectorAll('a'));

    expect(linea.textContent!.replace(/\s+/g, ' ')).toContain('Al ingresar, aceptas los Términos y condiciones');
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/legal/terminos', '/legal/politica-privacidad']);
    expect(enlaces.every((a) => a.getAttribute('target') === '_blank')).toBe(true);
  });

  it('es solo informativa: no hay casilla de aceptación en el login', async () => {
    const el = await abrir();

    expect(el.querySelector('input[type=checkbox]')).toBeNull();
  });

  it('el pie legal está en el login, con todos los enlaces', async () => {
    const el = await abrir();
    const hrefs = Array.from(el.querySelectorAll('[data-testid=pie-legal] a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual(['/legal/terminos', '/legal/politica-privacidad', '/legal/cookies', '/legal/derechos-y-pqr', '/legal/ia', '/legal/drive', '/legal/licencias']);
  });

  it('con la empresa suspendida: el aviso enlaza a los términos y el pie sigue estando (sin formulario)', async () => {
    const el = await abrir('El servicio de su empresa está suspendido.');

    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('[data-testid=suspension-terminos] a')?.getAttribute('href')).toBe('/legal/terminos');
    expect(el.querySelector('[data-testid=pie-legal]')).toBeTruthy();
    expect(el.querySelector('[data-testid=login-legal]')).toBeNull();
  });
});
