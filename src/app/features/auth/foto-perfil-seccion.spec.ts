import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { FotoPerfilSeccionComponent } from './foto-perfil-seccion.component';

const ANA = { id_usuario: 4, usuario: 'ana', nombre: 'Ana Pérez', email: 'a@example.com', rol: 'OPERATIVO' as const, mfa_activo: false };

describe('Mi cuenta · foto de perfil', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeAll(() => {
    const d = HTMLDialogElement.prototype;
    d.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    d.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideNgIconLoader(async () => ''),
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  async function crear(fotoVersion: string | null) {
    auth.sesion.set({ ...ANA, foto_version: fotoVersion });
    const f = TestBed.createComponent(FotoPerfilSeccionComponent);
    await estabilizar(f);
    // The avatar asks for the current photo: answered so it does not stay open.
    http.match((r) => r.method === 'GET' && r.url.endsWith('/fotos/4')).forEach((r) => r.flush(new Blob(['x'])));
    await estabilizar(f);
    return f;
  }
  async function estabilizar(f: ComponentFixture<unknown>) {
    for (let i = 0; i < 3; i++) {
      f.detectChanges();
      await f.whenStable();
      await new Promise((r) => setTimeout(r));
    }
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const testid = (f: ComponentFixture<unknown>, id: string) => raiz(f).querySelector<HTMLElement>(`[data-testid=${id}]`);
  function elegir(f: ComponentFixture<unknown>, archivo: File) {
    const entrada = testid(f, 'foto-archivo') as HTMLInputElement;
    Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
    entrada.dispatchEvent(new Event('change'));
  }

  it('avisa que subir la foto es voluntario y enlaza a la política de privacidad (informativo, sin casilla)', async () => {
    const f = await crear(null);
    const aviso = testid(f, 'aviso-foto')!;

    expect(aviso.textContent).toContain('es voluntario');
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe('/legal/politica-privacidad');
    expect(aviso.querySelector('input')).toBeNull();
  });

  it('sin foto: iniciales y «Subir foto»; avisa que se recorta al cuadrado', async () => {
    const f = await crear(null);

    expect(testid(f, 'avatar-iniciales')?.textContent?.trim()).toBe('AP');
    expect(raiz(f).textContent).toContain('Subir foto');
    expect(raiz(f).textContent).toContain('Se recorta al cuadrado del centro');
    expect(testid(f, 'foto-quitar')).toBeNull();
  });

  it('elegir muestra la vista previa; guardar sube sin código y la versión nueva entra a la sesión', async () => {
    const f = await crear(null);
    const archivo = new File(['jpg'], 'yo.jpg', { type: 'image/jpeg' });
    elegir(f, archivo);
    await estabilizar(f);
    expect(testid(f, 'foto-previa')?.getAttribute('src')).toBe('blob:previa');

    testid(f, 'foto-guardar')!.click();
    const subida = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/fotos/yo'));
    expect((subida.request.body as FormData).get('archivo')).toBe(archivo);
    expect((subida.request.body as FormData).has('codigo')).toBe(false);
    subida.flush({ foto_version: 'abcd' });
    await estabilizar(f);

    expect(auth.sesion()?.foto_version).toBe('abcd');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa');
  });

  it('422 del servidor (no es imagen o antivirus) se muestra tal cual', async () => {
    const f = await crear(null);
    elegir(f, new File(['jpg'], 'yo.jpg', { type: 'image/jpeg' }));
    await estabilizar(f);
    testid(f, 'foto-guardar')!.click();

    http.expectOne((r) => r.url.endsWith('/api/v1/fotos/yo')).flush({ code: 20018, message: 'El archivo no es una imagen valida.' }, { status: 422, statusText: 'x' });
    await estabilizar(f);

    expect(testid(f, 'foto-error')?.textContent?.trim()).toBe('El archivo no es una imagen valida.');
  });

  it('un GIF se rechaza en el cliente sin llamar al servidor', async () => {
    const f = await crear(null);
    elegir(f, new File(['gif'], 'yo.gif', { type: 'image/gif' }));
    await estabilizar(f);

    expect(testid(f, 'foto-error')?.textContent).toContain('PNG o JPG');
    http.expectNone((r) => r.url.endsWith('/fotos/yo'));
  });

  it('quitar pide confirmación y deja la sesión sin foto', async () => {
    const f = await crear('v1');
    testid(f, 'foto-quitar')!.click();
    await estabilizar(f);
    http.expectNone((r) => r.method === 'DELETE');

    Array.from(raiz(f).querySelectorAll<HTMLButtonElement>('dialog button')).find((b) => b.textContent?.trim() === 'Quitar foto')!.click();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/v1/fotos/yo')).flush(null, { status: 204, statusText: 'No Content' });
    await estabilizar(f);

    expect(auth.sesion()?.foto_version).toBeNull();
    expect(testid(f, 'avatar-iniciales')).toBeTruthy();
  });
});
