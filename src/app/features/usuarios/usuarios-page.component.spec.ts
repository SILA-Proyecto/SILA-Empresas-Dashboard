import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of, throwError } from 'rxjs';
import type { Rol } from '../../core/auth/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { FotosService } from '../../shared/services/fotos.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { USUARIOS_REPOSITORY } from './data/usuarios.provider';
import type { Usuario } from './models/usuarios.models';
import { UsuariosPageComponent } from './usuarios-page.component';

const usuario = (id: number, extra: Partial<Usuario> = {}): Usuario => ({
  id_usuario: id,
  usuario: `usuario${id}`,
  nombre: `Persona ${id}`,
  email: `p${id}@example.com`,
  rol: 'OPERATIVO',
  activo: true,
  debe_cambiar_clave: false,
  mfa_activo: false,
  bloqueado: false,
  bloqueado_minutos: 0,
  ultimo_login: '2026-10-09T03:45:05',
  fecha_cambio_clave: null,
  fecha_creacion: '2026-10-01T10:00:00',
  ...extra,
});

/** 1 = yo (ADMIN con segundo factor), 2 = bloqueada, 3 = inactiva con segundo factor. */
const FILAS = [usuario(1, { rol: 'ADMIN', mfa_activo: true }), usuario(2, { bloqueado: true, bloqueado_minutos: 12 }), usuario(3, { activo: false, mfa_activo: true })];

function crearRepo() {
  return {
    listar: vi.fn(() => of({ items: FILAS, total: FILAS.length, page: 0, size: 10 })),
    crear: vi.fn(() => of({ usuario: usuario(9, { usuario: 'nuevo.usuario' }), clave_temporal: 'Temp-Clave-9999' })),
    actualizar: vi.fn(() => of(usuario(2))),
    cambiarEstado: vi.fn(() => of(usuario(3, { activo: true }))),
    desbloquear: vi.fn(() => of(usuario(2))),
    restablecerClave: vi.fn(() => of({ usuario: usuario(2), clave_temporal: 'Otra-Clave-7777' })),
    restablecerMfa: vi.fn(() => of(usuario(3))),
    sesiones: vi.fn(() => of([{ familia: 'f1', iniciada: '2026-10-09T03:45:05', ultima_actividad: '2026-10-09T04:00:00', ip: '10.0.0.9', user_agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0' }])),
    cerrarSesiones: vi.fn(() => of(usuario(2))),
  };
}

describe('UsuariosPageComponent', () => {
  let repo: ReturnType<typeof crearRepo>;
  let fotos: { imagen: ReturnType<typeof vi.fn>; quitarDe: ReturnType<typeof vi.fn>; quitarMia: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    // jsdom no implementa <dialog>.showModal()/close(): el diálogo real usa ambos.
    const dialogo = HTMLDialogElement.prototype;
    dialogo.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    dialogo.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  beforeEach(() => {
    repo = crearRepo();
    fotos = { imagen: vi.fn(() => Promise.resolve(null)), quitarDe: vi.fn(() => of(undefined)), quitarMia: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideNgIconLoader(async () => ''), { provide: USUARIOS_REPOSITORY, useValue: repo }, { provide: FotosService, useValue: fotos }],
    });
  });

  async function crear(rol: Rol): Promise<ComponentFixture<UsuariosPageComponent>> {
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'usuario1', nombre: 'Persona 1', email: 'p1@example.com', rol, mfa_activo: true });
    const fixture = TestBed.createComponent(UsuariosPageComponent);
    await estabilizar(fixture);
    return fixture;
  }

  async function estabilizar(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();
  }

  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const fila = (f: ComponentFixture<unknown>, nombre: string) =>
    Array.from(raiz(f).querySelectorAll<HTMLTableRowElement>('tbody tr')).find((tr) => tr.textContent?.includes(nombre))!;
  const dialogoClave = (f: ComponentFixture<unknown>) =>
    Array.from(raiz(f).querySelectorAll<HTMLDialogElement>('dialog')).find((d) => d.textContent?.includes('Clave temporal de'))!;
  /** Types the second-factor code in the dialog that is open. */
  const escribirCodigo = (f: ComponentFixture<unknown>, codigo: string) => {
    const campo = raiz(f).querySelector<HTMLInputElement>('dialog[open] input[inputmode=numeric]')!;
    campo.value = codigo;
    campo.dispatchEvent(new Event('input'));
  };
  const valorCodigo = (f: ComponentFixture<unknown>) => raiz(f).querySelector<HTMLInputElement>('dialog[open] input[inputmode=numeric]')?.value;
  const boton = (contenedor: ParentNode, texto: string) =>
    Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(texto));

  describe('roles', () => {
    it('un ADMIN ve el botón de crear y las acciones de cada fila', async () => {
      const f = await crear('ADMIN');

      expect(raiz(f).querySelectorAll('tbody tr').length).toBe(3);
      expect(boton(raiz(f), 'Nuevo usuario')).toBeTruthy();
      expect(boton(fila(f, 'Persona 2'), 'Editar')).toBeTruthy();
      expect(boton(fila(f, 'Persona 2'), 'Restablecer clave')).toBeTruthy();
    });

    it('un OPERATIVO no ve ninguna acción ni el botón de crear', async () => {
      const f = await crear('OPERATIVO');

      expect(raiz(f).querySelectorAll('tbody tr').length).toBe(3);
      expect(boton(raiz(f), 'Nuevo usuario')).toBeUndefined();
      expect(raiz(f).querySelectorAll('tbody button').length).toBe(0);
    });
  });

  describe('mi propia cuenta', () => {
    it('deshabilita desactivar y restablecer clave/segundo factor, con un título que explica el motivo', async () => {
      const f = await crear('ADMIN');
      const mia = fila(f, 'Persona 1');

      for (const accion of ['Desactivar', 'Restablecer clave', 'Restablecer segundo factor']) {
        const b = boton(mia, accion)!;
        expect(b.disabled, accion).toBe(true);
        expect(b.title, accion).toContain('propia cuenta');
      }
      // Editar mis datos sí se puede (el rol queda bloqueado dentro del formulario).
      expect(boton(mia, 'Editar')!.disabled).toBe(false);
    });

    it('en las demás filas las acciones están habilitadas', async () => {
      const f = await crear('ADMIN');

      expect(boton(fila(f, 'Persona 2'), 'Desactivar')!.disabled).toBe(false);
      expect(boton(fila(f, 'Persona 3'), 'Restablecer segundo factor')!.disabled).toBe(false);
    });

    it('«Desbloquear» solo aparece en quien está bloqueado', async () => {
      const f = await crear('ADMIN');

      expect(boton(fila(f, 'Persona 2'), 'Desbloquear')).toBeTruthy();
      expect(boton(fila(f, 'Persona 1'), 'Desbloquear')).toBeUndefined();
      expect(fila(f, 'Persona 2').textContent).toContain('Bloqueado (12 min)');
    });
  });

  describe('clave temporal', () => {
    async function crearUsuario(f: ComponentFixture<UsuariosPageComponent>): Promise<void> {
      boton(raiz(f), 'Nuevo usuario')!.click();
      await estabilizar(f);
      const poner = (nombre: string, valor: string) => {
        const campo = raiz(f).querySelector<HTMLInputElement>(`#usuario-form [formcontrolname=${nombre}]`)!;
        campo.value = valor;
        campo.dispatchEvent(new Event('input'));
      };
      poner('usuario', 'nuevo.usuario');
      poner('nombre', 'Persona Nueva');
      poner('email', 'nuevo@example.com');
      escribirCodigo(f, '123456');
      await estabilizar(f);
      raiz(f).querySelector('#usuario-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);
    }

    it('al crear un usuario se muestra la clave temporal y NO se cierra con Escape ni sin confirmar', async () => {
      const f = await crear('ADMIN');

      await crearUsuario(f);

      expect(repo.crear).toHaveBeenCalledExactlyOnceWith({ usuario: 'nuevo.usuario', nombre: 'Persona Nueva', email: 'nuevo@example.com', rol: 'OPERATIVO', codigo: '123456' });
      const dialogo = dialogoClave(f);
      expect(dialogo.hasAttribute('open')).toBe(true);
      expect(dialogo.textContent).toContain('Temp-Clave-9999');
      expect(dialogo.textContent).toContain('no se podrá ver de nuevo');

      // Escape en un <dialog> nativo lanza «cancel»: debe quedar sin efecto.
      const cancelar = new Event('cancel', { cancelable: true });
      dialogo.dispatchEvent(cancelar);
      expect(cancelar.defaultPrevented).toBe(true);
      expect(dialogoClave(f).textContent).toContain('Temp-Clave-9999');
      // Tampoco hay una «X» para cerrarlo.
      expect(Array.from(dialogo.querySelectorAll('button')).map((b) => b.textContent!.trim())).not.toContain('Cerrar');
    });

    it('«Ya la copié» la descarta: la clave deja de estar en la página', async () => {
      const f = await crear('ADMIN');
      await crearUsuario(f);

      boton(dialogoClave(f), 'Ya la copié')!.click();
      await estabilizar(f);

      expect(raiz(f).textContent).not.toContain('Temp-Clave-9999');
      expect(dialogoClave(f)?.hasAttribute('open') ?? false).toBe(false);
    });

    it('restablecer la clave pide confirmación con el código y luego muestra la clave nueva una sola vez', async () => {
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Restablecer clave')!.click();
      await estabilizar(f);
      expect(repo.restablecerClave).not.toHaveBeenCalled();

      escribirCodigo(f, '654321');
      boton(raiz(f).querySelector('dialog[open]')!, 'Restablecer clave')!.click();
      await estabilizar(f);

      expect(repo.restablecerClave).toHaveBeenCalledExactlyOnceWith(2, '654321');
      expect(dialogoClave(f).textContent).toContain('Otra-Clave-7777');
    });
  });

  describe('código del segundo factor', () => {
    const abrirReset = async (f: ComponentFixture<UsuariosPageComponent>, fila_: string, accion: string) => {
      boton(fila(f, fila_), accion)!.click();
      await estabilizar(f);
    };
    const enviarReset = async (f: ComponentFixture<UsuariosPageComponent>) => {
      raiz(f).querySelector<HTMLFormElement>('dialog[open] form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);
    };
    const errorServidor = (code: number, message: string) => throwError(() => ({ code, message }));

    it('sin código no se manda nada: restablecer clave y segundo factor lo exigen', async () => {
      const f = await crear('ADMIN');

      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      await enviarReset(f);
      expect(repo.restablecerClave).not.toHaveBeenCalled();
      expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('Escribe el código');

      boton(raiz(f).querySelector('dialog[open]')!, 'Cancelar')!.click();
      await estabilizar(f);
      await abrirReset(f, 'Persona 3', 'Restablecer segundo factor');
      await enviarReset(f);
      expect(repo.restablecerMfa).not.toHaveBeenCalled();
    });

    it('un código que no son 6 dígitos se frena en pantalla', async () => {
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      escribirCodigo(f, '12ab');
      await enviarReset(f);

      expect(repo.restablecerClave).not.toHaveBeenCalled();
      expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('Son 6 dígitos');
    });

    it('restablecer el segundo factor manda el código y avisa', async () => {
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 3', 'Restablecer segundo factor');
      escribirCodigo(f, '111222');
      await enviarReset(f);

      expect(repo.restablecerMfa).toHaveBeenCalledExactlyOnceWith(3, '111222');
      expect(TestBed.inject(ToastService).toasts().map((t) => t.mensaje)).toContain('Segundo factor de "usuario3" restablecido: lo configurará al ingresar.');
      expect(raiz(f).querySelector('dialog[open]')).toBeNull();
    });

    it('un código incorrecto (401) no cierra el diálogo, lo dice bajo el campo, borra el código y deja reintentar', async () => {
      repo.restablecerClave.mockReturnValueOnce(errorServidor(20013, 'Codigo incorrecto'));
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      escribirCodigo(f, '000000');
      await enviarReset(f);

      const dialogo = raiz(f).querySelector('dialog[open]')!;
      expect(dialogo.textContent).toContain('El código es incorrecto');
      expect(valorCodigo(f)).toBe('');
      expect(raiz(f).textContent).not.toContain('Otra-Clave-7777');

      escribirCodigo(f, '333444');
      await enviarReset(f);
      expect(repo.restablecerClave).toHaveBeenLastCalledWith(2, '333444');
      expect(dialogoClave(f).textContent).toContain('Otra-Clave-7777');
    });

    it('un código ya usado pide esperar al siguiente', async () => {
      repo.restablecerMfa.mockReturnValueOnce(errorServidor(20013, 'Ese codigo ya fue usado'));
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 3', 'Restablecer segundo factor');
      escribirCodigo(f, '123123');
      await enviarReset(f);

      expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('Espera unos segundos');
    });

    it('cuenta bloqueada (423) y demasiados intentos (429) muestran el mensaje del servidor y dejan el diálogo abierto', async () => {
      const f = await crear('ADMIN');

      repo.restablecerClave.mockReturnValueOnce(errorServidor(20014, 'Cuenta bloqueada por 15 minutos.'));
      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      escribirCodigo(f, '123456');
      await enviarReset(f);
      expect(raiz(f).querySelector('dialog[open] [role=alert]')!.textContent).toContain('Cuenta bloqueada');

      repo.restablecerClave.mockReturnValueOnce(errorServidor(20015, 'Demasiados codigos'));
      escribirCodigo(f, '654321');
      await enviarReset(f);
      expect(raiz(f).querySelector('dialog[open] [role=alert]')!.textContent).toContain('Demasiados intentos');
    });

    it('una regla de la base (20006) sobre la cuenta no se confunde con «correo en uso»', async () => {
      repo.restablecerClave.mockReturnValueOnce(errorServidor(20006, 'No puede restablecer su propia clave.'));
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      escribirCodigo(f, '123456');
      await enviarReset(f);

      const texto = raiz(f).querySelector('dialog[open]')!.textContent!;
      expect(texto).toContain('No puede restablecer su propia clave.');
      expect(texto).not.toContain('correo');
    });

    it('el código no se conserva: al volver a abrir el diálogo el campo está vacío', async () => {
      const f = await crear('ADMIN');
      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      escribirCodigo(f, '123456');
      boton(raiz(f).querySelector('dialog[open]')!, 'Cancelar')!.click();
      await estabilizar(f);

      await abrirReset(f, 'Persona 2', 'Restablecer clave');
      expect(valorCodigo(f)).toBe('');
    });

    it('editar y crear usuarios piden el código; si falta, no se envía', async () => {
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Editar')!.click();
      await estabilizar(f);
      raiz(f).querySelector('#usuario-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      expect(repo.actualizar).not.toHaveBeenCalled();
      expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('Escribe el código');

      escribirCodigo(f, '987654');
      raiz(f).querySelector('#usuario-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);
      expect(repo.actualizar).toHaveBeenCalledExactlyOnceWith(2, { nombre: 'Persona 2', email: 'p2@example.com', rol: 'OPERATIVO', codigo: '987654' });
    });

    it('al editar, un código incorrecto deja el formulario abierto y lo marca en el campo del código', async () => {
      repo.actualizar.mockReturnValueOnce(errorServidor(20013, 'Codigo incorrecto'));
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Editar')!.click();
      await estabilizar(f);
      escribirCodigo(f, '000000');
      raiz(f).querySelector('#usuario-form')!.dispatchEvent(new Event('submit'));
      await estabilizar(f);

      expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('El código es incorrecto');
      expect(valorCodigo(f)).toBe('');
    });

    it('desactivar, desbloquear y cerrar sesiones siguen sin pedir código', async () => {
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Desactivar')!.click();
      await estabilizar(f);

      expect(raiz(f).querySelector('dialog[open] input[inputmode=numeric]')).toBeNull();
    });
  });

  describe('errores del servidor', () => {
    it('una regla del servidor (409 / 20006) se muestra como mensaje y no cambia nada', async () => {
      repo.cambiarEstado.mockReturnValue(throwError(() => ({ code: 20006, message: 'No puede desactivar su propia cuenta; pidale a otro administrador.' })));
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Desactivar')!.click();
      await estabilizar(f);

      const confirmar = Array.from(raiz(f).querySelectorAll('dialog')).map((d) => boton(d, 'Desactivar')).find((b) => b?.className.includes('bg-destructive'))!;
      confirmar.click();
      await estabilizar(f);

      expect(TestBed.inject(ToastService).toasts().map((t) => t.mensaje)).toContain('No puede desactivar su propia cuenta; pidale a otro administrador.');
    });
  });

  describe('sesiones de otras personas', () => {
    it('un ADMIN ve «Ver sesiones» y «Cerrar sus sesiones» en cada fila; un OPERATIVO no ve nada', async () => {
      const admin = await crear('ADMIN');
      for (const nombre of ['Persona 1', 'Persona 2', 'Persona 3']) {
        expect(boton(fila(admin, nombre), 'Ver sesiones'), nombre).toBeTruthy();
        expect(boton(fila(admin, nombre), 'Cerrar las sesiones'), nombre).toBeTruthy();
      }
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideRouter([]), provideNgIconLoader(async () => ''), { provide: USUARIOS_REPOSITORY, useValue: repo }] });

      const operativo = await crear('OPERATIVO');
      expect(boton(raiz(operativo), 'Ver sesiones')).toBeUndefined();
      expect(boton(raiz(operativo), 'Cerrar las sesiones')).toBeUndefined();
    });

    it('«Ver sesiones» muestra las sesiones abiertas de esa persona (solo lectura, sin «Esta sesión»)', async () => {
      const f = await crear('ADMIN');

      boton(fila(f, 'Persona 2'), 'Ver sesiones')!.click();
      await estabilizar(f);

      expect(repo.sesiones).toHaveBeenCalledExactlyOnceWith(2);
      const dialogo = Array.from(raiz(f).querySelectorAll('dialog')).find((d) => d.textContent?.includes('Sesiones de Persona 2'))!;
      expect(dialogo.textContent).toContain('Firefox en Linux');
      expect(dialogo.textContent).toContain('10.0.0.9');
      expect(dialogo.textContent).not.toContain('Esta sesión');
      expect(boton(dialogo, 'Cerrar la sesión')).toBeUndefined();
    });

    it('«Cerrar sus sesiones» pide confirmación y luego llama al API y avisa', async () => {
      const f = await crear('ADMIN');
      boton(fila(f, 'Persona 2'), 'Cerrar las sesiones')!.click();
      await estabilizar(f);
      expect(repo.cerrarSesiones).not.toHaveBeenCalled();

      const confirmar = Array.from(raiz(f).querySelectorAll('dialog')).map((d) => boton(d, 'Cerrar sus sesiones')).find((b) => b?.className.includes('bg-destructive'))!;
      confirmar.click();
      await estabilizar(f);

      expect(repo.cerrarSesiones).toHaveBeenCalledExactlyOnceWith(2);
      expect(TestBed.inject(ToastService).toasts().map((t) => t.mensaje)).toContain('Se cerraron las sesiones de "usuario2".');
    });

    it('sobre la propia cuenta sigue permitido, y la confirmación avisa que cierra también esta sesión', async () => {
      const f = await crear('ADMIN');
      const mia = boton(fila(f, 'Persona 1'), 'Cerrar las sesiones')!;

      expect(mia.disabled).toBe(false);
      mia.click();
      await estabilizar(f);
      expect(raiz(f).textContent).toContain('incluida esta');
    });
  });

  describe('foto de perfil', () => {
    it('cada fila lleva el avatar; «Quitar foto» solo en quien tiene foto, con confirmación y sin código', async () => {
      repo.listar.mockReturnValue(of({ items: [FILAS[0], usuario(2, { foto_version: 'v1' }), FILAS[2]], total: 3, page: 0, size: 10 }));
      const f = await crear('ADMIN');
      const exito = vi.spyOn(TestBed.inject(ToastService), 'exito');

      expect(raiz(f).querySelectorAll('tbody tr app-avatar').length).toBe(3);
      expect(fotos.imagen).toHaveBeenCalledWith(2, 'v1');
      expect(raiz(f).querySelectorAll('tbody button[title="Quitar foto"]').length).toBe(1);

      fila(f, 'Persona 2').querySelector<HTMLButtonElement>('button[title="Quitar foto"]')!.click();
      await estabilizar(f);
      const dialogo = raiz(f).querySelector('dialog[open]')!;
      expect(dialogo.textContent).toContain('Se quitará la foto de perfil de Persona 2');
      expect(dialogo.querySelector('input[inputmode=numeric]')).toBeNull();
      expect(fotos.quitarDe).not.toHaveBeenCalled();

      boton(dialogo, 'Quitar foto')!.click();
      await estabilizar(f);

      expect(fotos.quitarDe).toHaveBeenCalledWith(2);
      expect(exito).toHaveBeenCalledWith('Se quitó la foto de "usuario2".');
    });
  });
});

