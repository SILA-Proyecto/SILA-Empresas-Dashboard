import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import type { EmpresaRespuesta } from './empresa.models';
import { EmpresaService } from './empresa.service';

const USUARIO = { id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol: 'ADMIN' as const, mfa_activo: true };

function respuesta(activos: string[], nombreCorto = 'Ejemplo', logo: string | null = null): EmpresaRespuesta {
  return {
    empresa: { nombre: 'Lácteos Ejemplo SAS', nombre_corto: nombreCorto, nit: '900.123.456-7', direccion: null, telefono: null, ciudad: 'Villavicencio', correo_contacto: null, pie_comprobante: null },
    modulos: activos.map((codigo) => ({ codigo, nombre: codigo, descripcion: '', nucleo: false, activo: true })),
    modulos_activos: activos,
    logo_version: logo,
  };
}

describe('EmpresaService', () => {
  let servicio: EmpresaService;
  let auth: AuthService;
  let http: HttpTestingController;

  const ruta = (url: string) => new URL(url, 'http://host').pathname;
  const pedidos = (path: string) => http.match((r) => ruta(r.url) === path);
  const unico = (path: string) => http.expectOne((r) => ruta(r.url) === path);

  /** Lets the effect that watches the session run, and the promises of the call settle. */
  const asentar = async () => {
    TestBed.tick();
    await new Promise((resolver) => setTimeout(resolver));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(EmpresaService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin sesión no pide nada y ningún módulo opcional aparece', async () => {
    await asentar();

    expect(servicio.cargada()).toBe(false);
    expect(servicio.activo('CREDITO')).toBe(false);
  });

  it('al iniciar sesión carga /empresa; solo están activos los módulos que el backend lista', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO', 'ARCHIVOS']));
    await asentar();

    expect(servicio.cargada()).toBe(true);
    expect(servicio.empresa()?.nombre_corto).toBe('Ejemplo');
    expect(servicio.activo('CREDITO')).toBe(true);
    expect(servicio.activo('ARCHIVOS')).toBe(true);
    expect(servicio.activo('MARGEN')).toBe(false);
  });

  it('mientras no ha cargado no muestra funciones opcionales', async () => {
    auth.sesion.set(USUARIO);
    await asentar();

    expect(servicio.activo('CREDITO')).toBe(false);
    unico('/api/v1/empresa').flush(respuesta(['CREDITO']));
  });

  it('varias peticiones a la vez comparten una sola llamada', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    const a = servicio.asegurarCargada();
    const b = servicio.recargar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO']));
    await Promise.all([a, b]);

    expect(servicio.activo('CREDITO')).toBe(true);
  });

  it('asegurarCargada no vuelve a pedir lo que ya tiene', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO']));
    await asentar();

    await servicio.asegurarCargada();

    expect(pedidos('/api/v1/empresa')).toHaveLength(0);
  });

  it('si la carga falla, deja todo apagado y no rompe', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush({ code: 20999, message: 'x' }, { status: 500, statusText: 'Error' });
    await asentar();

    expect(servicio.cargada()).toBe(false);
    expect(servicio.activo('CREDITO')).toBe(false);
  });

  it('moduloInactivo (20020): avisa con el mensaje del backend y vuelve a leer /empresa; el módulo desaparece', async () => {
    const toast = TestBed.inject(ToastService);
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO', 'MARGEN']));
    await asentar();

    servicio.moduloInactivo('Esta función no está activa para su empresa.');
    unico('/api/v1/empresa').flush(respuesta(['MARGEN']));
    await asentar();

    expect(toast.toasts().map((t) => t.mensaje)).toEqual(['Esta función no está activa para su empresa.']);
    expect(servicio.activo('CREDITO')).toBe(false);
    expect(servicio.activo('MARGEN')).toBe(true);
  });

  it('varios 20020 seguidos muestran un solo aviso', async () => {
    const toast = TestBed.inject(ToastService);
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO']));
    await asentar();

    servicio.moduloInactivo('Esta función no está activa para su empresa.');
    servicio.moduloInactivo('Esta función no está activa para su empresa.');
    unico('/api/v1/empresa').flush(respuesta([]));
    await asentar();

    expect(toast.toasts()).toHaveLength(1);
  });

  it('al cerrar la sesión limpia lo cargado', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    unico('/api/v1/empresa').flush(respuesta(['CREDITO']));
    await asentar();

    auth.limpiarSesion();
    await asentar();

    expect(servicio.cargada()).toBe(false);
    expect(servicio.empresa()).toBeNull();
    expect(servicio.activo('CREDITO')).toBe(false);
  });

  it('una respuesta que llega después de cerrar sesión se descarta', async () => {
    auth.sesion.set(USUARIO);
    await asentar();
    const pendiente = unico('/api/v1/empresa');

    auth.limpiarSesion();
    await asentar();
    pendiente.flush(respuesta(['CREDITO']));
    await asentar();

    expect(servicio.cargada()).toBe(false);
    expect(servicio.activo('CREDITO')).toBe(false);
  });

  it('cargarPublica guarda el nombre para el login (sin sesión) y nombreCorto lo usa', async () => {
    const llamada = servicio.cargarPublica();
    unico('/api/v1/empresa/publica').flush({ nombre: 'Lácteos Ejemplo SAS', nombre_corto: 'Ejemplo' });
    await llamada;

    expect(servicio.nombre()).toBe('Lácteos Ejemplo SAS');
    expect(servicio.nombreCorto()).toBe('Ejemplo');
    expect(servicio.empresa()).toBeNull();
  });

  it('si /empresa/publica falla no hay nombre y no se rompe', async () => {
    const llamada = servicio.cargarPublica();
    unico('/api/v1/empresa/publica').flush('x', { status: 500, statusText: 'Error' });
    await llamada;

    expect(servicio.nombreCorto()).toBeNull();
  });

  describe('suspensión', () => {
    const MENSAJE = 'El servicio de su empresa está suspendido. Comuníquese con el proveedor del sistema.';

    it('activa (o un backend viejo sin `estado`): sin aviso', async () => {
      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'L', nombre_corto: 'L', logo_version: null });
      await llamada;

      expect(servicio.suspension()).toBeNull();
    });

    it('/empresa/publica con estado SUSPENDIDA da el aviso', async () => {
      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'L', nombre_corto: 'L', logo_version: null, estado: 'SUSPENDIDA' });
      await llamada;

      expect(servicio.suspension()).toBe(MENSAJE);
    });

    it('un 20021 deja el mensaje del backend; una respuesta pública ACTIVA posterior lo quita (la reactivaron)', async () => {
      servicio.empresaSuspendida('Suspendida por el proveedor.');
      expect(servicio.suspension()).toBe('Suspendida por el proveedor.');

      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'L', nombre_corto: 'L', logo_version: null, estado: 'ACTIVA' });
      await llamada;

      expect(servicio.suspension()).toBeNull();
    });
  });

  describe('logo', () => {
    const favicon = () => document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');

    it('sin sesión el logo sale de /empresa/publica; logo_version null = sin logo y el favicon de siempre', async () => {
      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'Lácteos Ejemplo SAS', nombre_corto: 'Ejemplo', logo_version: null });
      await llamada;
      TestBed.tick();

      expect(servicio.logoUrl()).toBeNull();
      expect(favicon()?.getAttribute('href')).toBe('favicon.svg');
    });

    it('con logo: la URL lleva ?v=<versión> y el favicon pasa a ser el logo', async () => {
      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'Lácteos Ejemplo SAS', nombre_corto: 'Ejemplo', logo_version: '3f9a0c1b2d4e5f60' });
      await llamada;
      TestBed.tick();

      expect(servicio.logoUrl()).toBe('/api/v1/empresa/logo?v=3f9a0c1b2d4e5f60');
      expect(favicon()?.getAttribute('href')).toBe('/api/v1/empresa/logo?v=3f9a0c1b2d4e5f60');
      expect(favicon()?.hasAttribute('type')).toBe(false);
    });

    it('con sesión manda /empresa: un logo quitado ya no se muestra aunque el login lo tuviera', async () => {
      const llamada = servicio.cargarPublica();
      unico('/api/v1/empresa/publica').flush({ nombre: 'L', nombre_corto: 'L', logo_version: 'viejo' });
      await llamada;

      auth.sesion.set(USUARIO);
      await asentar();
      unico('/api/v1/empresa').flush(respuesta(['CREDITO'], 'Ejemplo', null));
      await asentar();

      expect(servicio.logoUrl()).toBeNull();
    });

    it('si la imagen falla al cargar se trata como sin logo (y vuelve el favicon de siempre)', async () => {
      auth.sesion.set(USUARIO);
      await asentar();
      unico('/api/v1/empresa').flush(respuesta([], 'Ejemplo', 'v1'));
      await asentar();
      expect(servicio.logoVisible()).toBe('/api/v1/empresa/logo?v=v1');

      servicio.logoFallo('/api/v1/empresa/logo?v=v1');
      TestBed.tick();

      expect(servicio.logoVisible()).toBeNull();
      expect(favicon()?.getAttribute('href')).toBe('favicon.svg');
    });

    it('subir, quitar y guardar datos toman la respuesta (igual a GET /empresa) sin volver a pedirla', async () => {
      auth.sesion.set(USUARIO);
      await asentar();
      unico('/api/v1/empresa').flush(respuesta([], 'Ejemplo', null));
      await asentar();

      const archivo = new File(['png'], 'logo.png', { type: 'image/png' });
      servicio.subirLogo(archivo, '123456').subscribe();
      const subida = unico('/api/v1/empresa/logo');
      expect(subida.request.method).toBe('PUT');
      const form = subida.request.body as FormData;
      expect(form.get('archivo')).toBe(archivo);
      expect(form.get('codigo')).toBe('123456');
      subida.flush(respuesta([], 'Ejemplo', 'nuevo'));
      expect(servicio.logoUrl()).toBe('/api/v1/empresa/logo?v=nuevo');

      servicio.quitarLogo('654321').subscribe();
      const quitar = unico('/api/v1/empresa/logo');
      expect(quitar.request.method).toBe('DELETE');
      expect(quitar.request.body).toEqual({ codigo: '654321' });
      quitar.flush(respuesta([], 'Ejemplo', null));
      expect(servicio.logoUrl()).toBeNull();

      const datos = { direccion: 'Calle 1', telefono: null, ciudad: 'Tame', correo_contacto: null, pie_comprobante: 'Gracias.', codigo: '111111' };
      servicio.guardarDatos(datos).subscribe();
      const put = unico('/api/v1/empresa');
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual(datos);
      const nueva = respuesta([], 'Ejemplo', null);
      nueva.empresa.ciudad = 'Tame';
      put.flush(nueva);

      expect(servicio.empresa()?.ciudad).toBe('Tame');
      expect(pedidos('/api/v1/empresa')).toHaveLength(0);
    });
  });
});

