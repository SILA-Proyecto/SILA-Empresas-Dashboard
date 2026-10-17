import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { Subject } from 'rxjs';
import type { ApiError } from '../../core/api/api-error';
import { AuthService, type Sesion } from '../../core/services/auth.service';
import { CanalSesion } from '../../core/session/canal-sesion.service';
import { AsistenteBurbujaComponent } from './asistente-burbuja.component';
import { ASISTENTE_REPOSITORY } from './data/asistente.provider';
import type { MensajeEnviado, RespuestaAsistente } from './models/asistente.models';

const ANA: Sesion = { id_usuario: 1, usuario: 'ana', nombre: 'Ana Pérez', email: 'a@example.com', rol: 'OPERATIVO', mfa_activo: false };
const ADMIN: Sesion = { ...ANA, id_usuario: 9, usuario: 'admin', nombre: 'Kevin Ruiz', rol: 'ADMIN' };

describe('AsistenteBurbujaComponent', () => {
  let llamadas: { cuerpo: MensajeEnviado; respuesta: Subject<RespuestaAsistente> }[];
  let auth: AuthService;

  async function crear(sesion: Sesion = ANA): Promise<ComponentFixture<AsistenteBurbujaComponent>> {
    llamadas = [];
    const repo = {
      preguntar: (cuerpo: MensajeEnviado) => {
        const respuesta = new Subject<RespuestaAsistente>();
        llamadas.push({ cuerpo, respuesta });
        return respuesta;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNgIconLoader(async () => ''),
        { provide: ASISTENTE_REPOSITORY, useValue: repo },
        { provide: CanalSesion, useValue: { enviar: () => undefined, escuchar: () => () => undefined } },
      ],
    });
    auth = TestBed.inject(AuthService);
    auth.sesion.set(sesion);
    const f = TestBed.createComponent(AsistenteBurbujaComponent);
    await asentar(f);
    return f;
  }
  async function asentar(f: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
      f.detectChanges();
      await f.whenStable();
    }
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const q = (f: ComponentFixture<unknown>, id: string) => raiz(f).querySelector<HTMLElement>(`[data-testid=${id}]`);
  const todos = (f: ComponentFixture<unknown>, id: string) => Array.from(raiz(f).querySelectorAll<HTMLElement>(`[data-testid=${id}]`));
  const texto = (f: ComponentFixture<unknown>, id: string) => (q(f, id)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const clic = async (f: ComponentFixture<unknown>, id: string) => {
    q(f, id)!.click();
    await asentar(f);
  };
  async function abrir(f: ComponentFixture<unknown>): Promise<void> {
    await clic(f, 'asistente-abrir');
  }
  async function escribir(f: ComponentFixture<unknown>, valor: string): Promise<HTMLTextAreaElement> {
    const caja = q(f, 'asistente-texto') as HTMLTextAreaElement;
    caja.value = valor;
    caja.dispatchEvent(new Event('input'));
    await asentar(f);
    return caja;
  }
  async function teclaEnter(f: ComponentFixture<unknown>, caja: HTMLElement, shift = false): Promise<KeyboardEvent> {
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: shift, bubbles: true, cancelable: true });
    caja.dispatchEvent(e);
    await asentar(f);
    return e;
  }
  const responder = async (f: ComponentFixture<unknown>, texto: string) => {
    llamadas.at(-1)!.respuesta.next({ respuesta: texto, sesion_id: 'x' });
    await asentar(f);
  };
  const fallar = async (f: ComponentFixture<unknown>, error: ApiError) => {
    llamadas.at(-1)!.respuesta.error(error);
    await asentar(f);
  };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    sessionStorage.clear();
    document.body.classList.remove('sila-chat-abierto');
  });

  it('al principio solo se ve el botón flotante; al pulsarlo se abre el panel «Asistente SILA»', async () => {
    const f = await crear();

    expect(q(f, 'asistente-abrir')?.getAttribute('aria-label')).toBe('Abrir el asistente de ayuda');
    expect(q(f, 'asistente-panel')).toBeNull();

    await abrir(f);

    expect(q(f, 'asistente-panel')?.getAttribute('aria-label')).toBe('Asistente SILA');
    expect(raiz(f).querySelector('h2')?.textContent).toContain('Asistente SILA');
    expect(q(f, 'asistente-abrir')).toBeNull();
  });

  it('se cierra con la X y con Escape, y vuelve a mostrar el botón', async () => {
    const f = await crear();
    await abrir(f);
    await clic(f, 'asistente-cerrar');
    expect(q(f, 'asistente-panel')).toBeNull();
    expect(q(f, 'asistente-abrir')).not.toBeNull();

    await abrir(f);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await asentar(f);
    expect(q(f, 'asistente-panel')).toBeNull();
  });

  it('el panel de teléfono bloquea el scroll de la página mientras está abierto', async () => {
    const f = await crear();
    await abrir(f);
    expect(document.body.classList.contains('sila-chat-abierto')).toBe(true);

    await clic(f, 'asistente-cerrar');

    expect(document.body.classList.contains('sila-chat-abierto')).toBe(false);
  });

  it('da la bienvenida por el nombre, sin llamar al servidor, con la nota de que solo consulta', async () => {
    const f = await crear();
    await abrir(f);

    expect(texto(f, 'asistente-bienvenida')).toContain('Hola, Ana.');
    expect(llamadas).toHaveLength(0);
    expect(raiz(f).textContent).toContain('El asistente solo consulta; no puede cambiar datos. Puede equivocarse: verifica las cifras importantes.');
  });

  it('OPERATIVO ve ejemplos de ayuda y stock, pero no de ventas del mes ni de deuda con proveedores', async () => {
    const f = await crear(ANA);
    await abrir(f);

    const ejemplos = todos(f, 'asistente-ejemplo').map((e) => e.textContent!.trim());
    expect(ejemplos).toEqual(['¿Dónde registro una compra de leche?', '¿Cuánto debe el cliente…?', '¿Qué stock hay de…?']);
  });

  it('ADMIN ve además las ventas del mes y lo que se le debe a los proveedores', async () => {
    const f = await crear(ADMIN);
    await abrir(f);

    const ejemplos = todos(f, 'asistente-ejemplo').map((e) => e.textContent!.trim());
    expect(ejemplos).toContain('¿Cómo van las ventas de este mes?');
    expect(ejemplos).toContain('¿Cuánto le debemos a los proveedores?');
  });

  it('un ejemplo completo se envía al pulsarlo', async () => {
    const f = await crear();
    await abrir(f);

    await clic(f, 'asistente-ejemplo');

    expect(llamadas.map((l) => l.cuerpo.mensaje)).toEqual(['¿Dónde registro una compra de leche?']);
    expect(texto(f, 'asistente-mensaje-usuario')).toBe('¿Dónde registro una compra de leche?');
  });

  it('un ejemplo que termina en «…» solo se escribe en la caja para que la persona lo complete', async () => {
    const f = await crear();
    await abrir(f);

    todos(f, 'asistente-ejemplo')[1].click();
    await asentar(f);

    expect(llamadas).toHaveLength(0);
    expect((q(f, 'asistente-texto') as HTMLTextAreaElement).value).toBe('¿Cuánto debe el cliente ');
  });

  it('Enter envía, la caja se vacía y el mensaje queda a la derecha', async () => {
    const f = await crear();
    await abrir(f);
    const caja = await escribir(f, 'Hola');

    const e = await teclaEnter(f, caja);

    expect(e.defaultPrevented).toBe(true);
    expect(llamadas.map((l) => l.cuerpo.mensaje)).toEqual(['Hola']);
    expect(caja.value).toBe('');
    expect(q(f, 'asistente-mensaje-usuario')?.parentElement?.className).toContain('justify-end');
  });

  it('Shift+Enter no envía: deja el salto de línea', async () => {
    const f = await crear();
    await abrir(f);
    const caja = await escribir(f, 'Hola');

    const e = await teclaEnter(f, caja, true);

    expect(e.defaultPrevented).toBe(false);
    expect(llamadas).toHaveLength(0);
  });

  it('con la caja vacía o solo espacios no se envía', async () => {
    const f = await crear();
    await abrir(f);
    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(true);

    const caja = await escribir(f, '   ');
    await teclaEnter(f, caja);

    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(true);
    expect(llamadas).toHaveLength(0);
  });

  it('el botón enviar también manda la pregunta', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');

    (q(f, 'asistente-enviar') as HTMLButtonElement).form!.requestSubmit();
    await asentar(f);

    expect(llamadas).toHaveLength(1);
  });

  it('mientras espera: «Escribiendo…», sin poder enviar otro; al llegar la respuesta aparece a la izquierda', async () => {
    const f = await crear();
    await abrir(f);
    const caja = await escribir(f, 'Hola');
    await teclaEnter(f, caja);

    expect(q(f, 'asistente-escribiendo')).not.toBeNull();
    await escribir(f, 'Segunda');
    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(true);
    await teclaEnter(f, q(f, 'asistente-texto')!);
    expect(llamadas).toHaveLength(1);

    await responder(f, 'Buenas');

    expect(q(f, 'asistente-escribiendo')).toBeNull();
    expect(texto(f, 'asistente-mensaje-asistente')).toBe('Buenas');
    expect(q(f, 'asistente-mensaje-asistente')?.className).not.toContain('justify-end');
    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('la respuesta es texto: el HTML no se interpreta, y las negritas y listas simples sí se dibujan', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);

    await responder(f, 'Debe **$ 1.000** <img src=x onerror=alert(1)>\n- Uno\n- Dos');

    const burbuja = q(f, 'asistente-mensaje-asistente')!;
    expect(burbuja.querySelector('img')).toBeNull();
    expect(burbuja.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(burbuja.querySelector('strong')?.textContent).toBe('$ 1.000');
    expect(Array.from(burbuja.querySelectorAll('li')).map((li) => li.textContent!.trim())).toEqual(['Uno', 'Dos']);
  });

  it('la negrita no mete espacios de más alrededor: «**Compras**.» se lee «Compras.»', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);

    await responder(f, 'Ve a **Compras**. Luego (**Registrar**)');

    expect(q(f, 'asistente-mensaje-asistente')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Ve a Compras. Luego (Registrar)');
  });

  it('asistente apagado (503): «no está disponible ahora» y «Reintentar» manda el mismo mensaje otra vez', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);

    await fallar(f, { code: 20019, message: 'El asistente no esta habilitado.' });

    expect(texto(f, 'asistente-error')).toContain('El asistente no está disponible ahora.');
    expect(q(f, 'asistente-panel')).not.toBeNull();
    await clic(f, 'asistente-reintentar');
    expect(llamadas.map((l) => l.cuerpo.mensaje)).toEqual(['Hola', 'Hola']);
    expect(todos(f, 'asistente-mensaje-usuario')).toHaveLength(1);
  });

  it('demasiadas preguntas (429): avisa y no ofrece reintentar', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);

    await fallar(f, { code: 20015, message: 'Ha hecho muchas preguntas seguidas.' });

    expect(texto(f, 'asistente-error')).toContain('Has hecho muchas preguntas, intenta en un rato.');
    expect(q(f, 'asistente-reintentar')).toBeNull();
  });

  it('con más de 1000 caracteres avisa y no deja enviar; con exactamente 1000 sí', async () => {
    const f = await crear();
    await abrir(f);

    const caja = await escribir(f, 'a'.repeat(1001));
    expect(texto(f, 'asistente-largo')).toContain('1001');
    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(true);
    await teclaEnter(f, caja);
    expect(llamadas).toHaveLength(0);

    await escribir(f, 'a'.repeat(1000));
    expect(q(f, 'asistente-largo')).toBeNull();
    expect((q(f, 'asistente-enviar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('«Nueva conversación» está apagada sin conversación y, al usarla, deja solo la bienvenida', async () => {
    const f = await crear();
    await abrir(f);
    expect((q(f, 'asistente-nueva') as HTMLButtonElement).disabled).toBe(true);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);
    await responder(f, 'Buenas');
    expect((q(f, 'asistente-nueva') as HTMLButtonElement).disabled).toBe(false);

    await clic(f, 'asistente-nueva');

    expect(todos(f, 'asistente-mensaje-usuario')).toHaveLength(0);
    expect(todos(f, 'asistente-mensaje-asistente')).toHaveLength(0);
    expect(todos(f, 'asistente-ejemplo').length).toBeGreaterThan(0);
  });

  it('al cerrar la sesión la conversación desaparece de la pantalla', async () => {
    const f = await crear();
    await abrir(f);
    await escribir(f, 'Hola');
    await teclaEnter(f, q(f, 'asistente-texto')!);
    await responder(f, 'Buenas');
    expect(todos(f, 'asistente-mensaje-usuario')).toHaveLength(1);

    auth.limpiarSesion();
    await asentar(f);

    expect(todos(f, 'asistente-mensaje-usuario')).toHaveLength(0);
    expect(sessionStorage.getItem('sila_asistente')).toBeNull();
  });
});
