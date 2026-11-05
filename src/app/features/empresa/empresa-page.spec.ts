import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, type Routes, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import type { Rol } from '../../core/auth/auth.models';
import type { EmpresaRespuesta } from '../../core/empresa/empresa.models';
import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { EmpresaPageComponent } from './empresa-page.component';
import { EMPRESA_ROUTES } from './empresa.routes';

@Component({ template: '' })
class Vacia {}

const usuario = (rol: Rol) => ({ id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol, mfa_activo: true });

function respuesta(logo: string | null = null): EmpresaRespuesta {
  return {
    empresa: {
      nombre: 'Lácteos Ejemplo SAS',
      nombre_corto: 'Ejemplo',
      nit: '900.123.456-7',
      direccion: 'Calle 1 # 2-3',
      telefono: '+57 300 000 0000',
      ciudad: 'Villavicencio',
      correo_contacto: 'contacto@ejemplo.com',
      pie_comprobante: 'Gracias por su compra.',
    },
    modulos: [],
    modulos_activos: [],
    logo_version: logo,
  };
}

describe('Datos de la empresa', () => {
  let http: HttpTestingController;

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

  function configurar(rutas: Routes = [{ path: '', component: Vacia }]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(rutas),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideNgIconLoader(async () => ''),
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  async function estabilizar(f: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
      f.detectChanges();
      await f.whenStable();
      await new Promise((r) => setTimeout(r));
    }
  }

  async function abrir(logo: string | null = null) {
    configurar();
    TestBed.inject(AuthService).sesion.set(usuario('ADMIN'));
    const f = TestBed.createComponent(EmpresaPageComponent);
    f.detectChanges();
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/v1/empresa')).flush(respuesta(logo));
    await estabilizar(f);
    return f;
  }

  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const campo = (f: ComponentFixture<unknown>, nombre: string) => raiz(f).querySelector<HTMLInputElement>(`[formcontrolname=${nombre}]`)!;
  async function escribir(f: ComponentFixture<unknown>, el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    await estabilizar(f);
  }
  async function confirmarConCodigo(f: ComponentFixture<unknown>, codigo = '123456') {
    await escribir(f, raiz(f).querySelector<HTMLInputElement>('#confirmar-codigo-form input')!, codigo);
    raiz(f).querySelector('#confirmar-codigo-form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);
  }
  const guardarDatos = async (f: ComponentFixture<unknown>) => {
    raiz(f).querySelector('section[aria-labelledby=empresa-contacto] form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);
  };
  const pedidoPut = () => http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/empresa'));
  const dialogoAbierto = (f: ComponentFixture<unknown>) => raiz(f).querySelector('#confirmar-codigo-form') !== null && raiz(f).querySelector('dialog[open]') !== null;

  it('nombre, nombre corto y NIT son de solo lectura, con la nota de quién los cambia', async () => {
    const f = await abrir();

    const identidad = raiz(f).querySelector('[data-testid=empresa-identidad]')!.textContent!;
    expect(identidad).toContain('Lácteos Ejemplo SAS');
    expect(identidad).toContain('900.123.456-7');
    expect(raiz(f).textContent).toContain('Estos datos los cambia el administrador del sistema');
    expect(raiz(f).querySelector('[formcontrolname=nombre], [formcontrolname=nit]')).toBeNull();
    expect(campo(f, 'ciudad').value).toBe('Villavicencio');
  });

  it('guardar pide el código y manda los cinco campos (uno vacío va como null); responde y no vuelve a pedir /empresa', async () => {
    const f = await abrir();
    const exito = vi.spyOn(TestBed.inject(ToastService), 'exito');
    await escribir(f, campo(f, 'ciudad'), '  Tame ');
    await escribir(f, campo(f, 'direccion'), '');

    await guardarDatos(f);
    expect(dialogoAbierto(f)).toBe(true);
    await confirmarConCodigo(f);

    const put = pedidoPut();
    expect(put.request.body).toEqual({
      direccion: null,
      telefono: '+57 300 000 0000',
      ciudad: 'Tame',
      correo_contacto: 'contacto@ejemplo.com',
      pie_comprobante: 'Gracias por su compra.',
      codigo: '123456',
    });
    const nueva = respuesta();
    nueva.empresa.ciudad = 'Tame';
    nueva.empresa.direccion = null;
    put.flush(nueva);
    await estabilizar(f);

    expect(exito).toHaveBeenCalledWith('Los datos de la empresa se guardaron.');
    expect(campo(f, 'ciudad').value).toBe('Tame');
    http.expectNone((r) => r.method === 'GET' && r.url.endsWith('/api/v1/empresa'));
  });

  it('validación en el cliente: teléfono con letras y correo inválido no abren el diálogo', async () => {
    const f = await abrir();
    await escribir(f, campo(f, 'telefono'), '300-ABC');
    await escribir(f, campo(f, 'correo_contacto'), 'no-es-correo');

    await guardarDatos(f);

    expect(dialogoAbierto(f)).toBe(false);
    expect(raiz(f).textContent).toContain('Teléfono no válido.');
    expect(raiz(f).textContent).toContain('Correo electrónico no válido.');
  });

  it('el pie del comprobante muestra su contador y aclara que sale en cada página del PDF', async () => {
    const f = await abrir();
    await escribir(f, raiz(f).querySelector<HTMLTextAreaElement>('[formcontrolname=pie_comprobante]')!, 'Hola');

    expect(raiz(f).querySelector('[data-testid=empresa-pie-contador]')?.textContent?.trim()).toBe('4 / 200');
    expect(raiz(f).textContent).toContain('al pie de cada página de los comprobantes PDF');
    // A suggestion of a short notice (the company writes it): this field is the place for the privacy notice.
    expect(raiz(f).textContent).toContain('política de privacidad');
  });

  it('código incorrecto (401): error en el código, el diálogo sigue abierto y lo escrito NO se pierde', async () => {
    const f = await abrir();
    await escribir(f, campo(f, 'ciudad'), 'Tame');
    await guardarDatos(f);
    await confirmarConCodigo(f);

    pedidoPut().flush({ code: 20013, message: 'Codigo incorrecto.' }, { status: 401, statusText: 'Unauthorized' });
    await estabilizar(f);

    expect(dialogoAbierto(f)).toBe(true);
    expect(raiz(f).textContent).toContain('El código es incorrecto');
    expect(raiz(f).querySelector<HTMLInputElement>('#confirmar-codigo-form input')!.value).toBe('');
    expect(campo(f, 'ciudad').value).toBe('Tame');

    // Second try with another code goes through.
    await confirmarConCodigo(f, '654321');
    expect(pedidoPut().request.body.codigo).toBe('654321');
  });

  it('400 con `fields` marca el campo en el formulario', async () => {
    const f = await abrir();
    await guardarDatos(f);
    await confirmarConCodigo(f);

    pedidoPut().flush({ code: 20001, message: 'Datos invalidos', fields: { correo_contacto: 'El correo no es valido.' } }, { status: 400, statusText: 'Bad Request' });
    await estabilizar(f);

    expect(dialogoAbierto(f)).toBe(false);
    expect(raiz(f).textContent).toContain('El correo no es valido.');
  });

  describe('logo', () => {
    function elegir(f: ComponentFixture<unknown>, archivo: File) {
      const entrada = raiz(f).querySelector<HTMLInputElement>('[data-testid=empresa-logo-archivo]')!;
      Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
      entrada.dispatchEvent(new Event('change'));
    }

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:previa') as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = vi.fn();
    });

    it('sin logo lo dice; con logo muestra el actual y «Quitar logo»', async () => {
      let f = await abrir();
      expect(raiz(f).querySelector('[data-testid=empresa-sin-logo]')).toBeTruthy();
      expect(raiz(f).querySelector('[data-testid=empresa-logo-quitar]')).toBeNull();

      TestBed.resetTestingModule();
      f = await abrir('v1');
      expect(raiz(f).querySelector('[data-testid=empresa-logo-actual]')?.getAttribute('src')).toBe('/api/v1/empresa/logo?v=v1');
      expect(raiz(f).querySelector('[data-testid=empresa-logo-quitar]')).toBeTruthy();
    });

    it('en el cliente rechaza lo que no es PNG/JPG y lo de más de 5 MB, sin llamar al servidor', async () => {
      const f = await abrir();

      elegir(f, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
      await estabilizar(f);
      expect(raiz(f).querySelector('[data-testid=empresa-logo-error]')?.textContent).toContain('Solo se aceptan imágenes PNG o JPG.');

      const grande = new File(['x'], 'logo.png', { type: 'image/png' });
      Object.defineProperty(grande, 'size', { value: 5 * 1024 * 1024 + 1 });
      elegir(f, grande);
      await estabilizar(f);
      expect(raiz(f).querySelector('[data-testid=empresa-logo-error]')?.textContent).toContain('pasa de 5 MB');
      expect(raiz(f).querySelector('[data-testid=empresa-logo-previa]')).toBeNull();
    });

    it('muestra la vista previa antes de confirmar; subir pide el código y manda el archivo', async () => {
      const f = await abrir();
      const archivo = new File(['png'], 'logo.png', { type: 'image/png' });
      elegir(f, archivo);
      await estabilizar(f);

      expect(raiz(f).querySelector('[data-testid=empresa-logo-previa]')?.getAttribute('src')).toBe('blob:previa');
      raiz(f).querySelector<HTMLButtonElement>('[data-testid=empresa-logo-guardar]')!.click();
      await estabilizar(f);
      await confirmarConCodigo(f);

      const subida = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/v1/empresa/logo'));
      expect((subida.request.body as FormData).get('archivo')).toBe(archivo);
      expect((subida.request.body as FormData).get('codigo')).toBe('123456');
      subida.flush(respuesta('nuevo'));
      await estabilizar(f);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa');
      expect(raiz(f).querySelector('[data-testid=empresa-logo-actual]')?.getAttribute('src')).toBe('/api/v1/empresa/logo?v=nuevo');
    });

    it.each([
      [422, 20018, 'El antivirus detecto una amenaza en el archivo.'],
      [503, 20019, 'El antivirus no esta disponible, intente de nuevo en unos minutos.'],
    ])('%i: muestra el mensaje del servidor tal cual', async (status, code, message) => {
      const f = await abrir();
      elegir(f, new File(['png'], 'logo.png', { type: 'image/png' }));
      await estabilizar(f);
      raiz(f).querySelector<HTMLButtonElement>('[data-testid=empresa-logo-guardar]')!.click();
      await estabilizar(f);
      await confirmarConCodigo(f);

      http.expectOne((r) => r.url.endsWith('/api/v1/empresa/logo')).flush({ code, message }, { status, statusText: 'x' });
      await estabilizar(f);

      expect(raiz(f).querySelector('dialog[open] [role=alert]')?.textContent?.trim()).toBe(message);
    });

    it('quitar el logo pide el código y lo manda en el cuerpo del DELETE', async () => {
      const f = await abrir('v1');
      raiz(f).querySelector<HTMLButtonElement>('[data-testid=empresa-logo-quitar]')!.click();
      await estabilizar(f);
      await confirmarConCodigo(f, '999999');

      const quitar = http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/v1/empresa/logo'));
      expect(quitar.request.body).toEqual({ codigo: '999999' });
      quitar.flush(respuesta(null));
      await estabilizar(f);

      expect(raiz(f).querySelector('[data-testid=empresa-sin-logo]')).toBeTruthy();
    });
  });

  describe('ruta', () => {
    async function ir(rol: Rol): Promise<string> {
      configurar([
        { path: '', component: Vacia },
        { path: 'empresa', loadChildren: () => EMPRESA_ROUTES },
      ]);
      TestBed.inject(AuthService).sesion.set(usuario(rol));
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/empresa');
      return router.url;
    }

    it('un ADMIN llega a /empresa', async () => {
      expect(await ir('ADMIN')).toBe('/empresa');
    });

    it('un OPERATIVO no llega: termina en el inicio', async () => {
      expect(await ir('OPERATIVO')).toBe('/');
    });
  });
});
