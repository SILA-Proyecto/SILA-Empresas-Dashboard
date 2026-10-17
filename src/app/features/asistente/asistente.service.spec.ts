import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { ApiError } from '../../core/api/api-error';
import { CanalSesion } from '../../core/session/canal-sesion.service';
import { AuthService } from '../../core/services/auth.service';
import { AsistenteService, describirErrorAsistente } from './asistente.service';
import { ASISTENTE_REPOSITORY } from './data/asistente.provider';
import type { MensajeEnviado, RespuestaAsistente } from './models/asistente.models';

const ANA = { id_usuario: 1, usuario: 'ana', nombre: 'Ana Pérez', email: 'a@example.com', rol: 'OPERATIVO' as const, mfa_activo: false };
const LUIS = { ...ANA, id_usuario: 2, usuario: 'luis', nombre: 'Luis' };
const ALMACEN = 'sila_asistente';

/** Every call waits on its own Subject, so the test decides when (and how) the answer arrives. */
class RepoFalso {
  llamadas: { cuerpo: MensajeEnviado; clave: string; respuesta: Subject<RespuestaAsistente> }[] = [];
  preguntar(cuerpo: MensajeEnviado, clave: string) {
    const respuesta = new Subject<RespuestaAsistente>();
    this.llamadas.push({ cuerpo, clave, respuesta });
    return respuesta;
  }
  get ultima() {
    return this.llamadas.at(-1)!;
  }
}

const apiError = (code: number, message = 'x'): ApiError => ({ code, message });

describe('AsistenteService', () => {
  let repo: RepoFalso;
  let auth: AuthService;

  function preparar(sesion = ANA): AsistenteService {
    repo = new RepoFalso();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ASISTENTE_REPOSITORY, useValue: repo }, { provide: CanalSesion, useValue: { enviar: () => undefined, escuchar: () => () => undefined } }],
    });
    auth = TestBed.inject(AuthService);
    auth.sesion.set(sesion);
    const servicio = TestBed.inject(AsistenteService);
    TestBed.tick();
    return servicio;
  }
  const responder = (texto: string) => {
    repo.ultima.respuesta.next({ respuesta: texto, sesion_id: repo.ultima.cuerpo.sesion_id });
    repo.ultima.respuesta.complete();
  };
  const fallar = (error: unknown) => repo.ultima.respuesta.error(error);

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('envía solo el mensaje recortado y el sesion_id (un UUID), sin rol ni usuario, con una Idempotency-Key', () => {
    const s = preparar();

    expect(s.enviar('  ¿Cuánto debe Pérez?  ')).toBe(true);

    expect(repo.llamadas).toHaveLength(1);
    expect(Object.keys(repo.ultima.cuerpo).sort()).toEqual(['mensaje', 'sesion_id']);
    expect(repo.ultima.cuerpo.mensaje).toBe('¿Cuánto debe Pérez?');
    expect(repo.ultima.cuerpo.sesion_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(repo.ultima.clave.length).toBeGreaterThanOrEqual(8);
  });

  it('guarda la pregunta y la respuesta en orden, y libera el envío', () => {
    const s = preparar();
    s.enviar('Hola');
    expect(s.enviando()).toBe(true);

    responder('Buenas');

    expect(s.enviando()).toBe(false);
    expect(s.mensajes().map((m) => [m.de, m.texto])).toEqual([['usuario', 'Hola'], ['asistente', 'Buenas']]);
  });

  it('no envía vacío, de más de 1000 caracteres, ni un segundo mensaje mientras espera la respuesta', () => {
    const s = preparar();

    expect(s.enviar('   ')).toBe(false);
    expect(s.enviar('a'.repeat(1001))).toBe(false);
    expect(s.enviar('a'.repeat(1000))).toBe(true);
    expect(s.enviar('otra')).toBe(false);

    expect(repo.llamadas).toHaveLength(1);
    expect(s.mensajes()).toHaveLength(1);
  });

  it('mantiene el mismo sesion_id en toda la conversación y «Nueva conversación» lo cambia y borra el hilo', () => {
    const s = preparar();
    s.enviar('Uno');
    responder('R1');
    s.enviar('Dos');
    const primero = repo.llamadas[0].cuerpo.sesion_id;
    expect(repo.llamadas[1].cuerpo.sesion_id).toBe(primero);
    responder('R2');

    s.nuevaConversacion();
    s.enviar('Tres');

    expect(s.mensajes().map((m) => m.texto)).toEqual(['Tres']);
    expect(repo.ultima.cuerpo.sesion_id).not.toBe(primero);
  });

  it('cada pregunta lleva una Idempotency-Key distinta', () => {
    const s = preparar();
    s.enviar('Uno');
    responder('R1');
    s.enviar('Dos');

    expect(repo.llamadas[1].clave).not.toBe(repo.llamadas[0].clave);
  });

  it('una respuesta que llega después de «Nueva conversación» se descarta', () => {
    const s = preparar();
    s.enviar('Uno');
    const tardia = repo.ultima.respuesta;

    s.nuevaConversacion();
    tardia.next({ respuesta: 'vieja', sesion_id: 'x' });

    expect(s.mensajes()).toEqual([]);
    expect(s.enviando()).toBe(false);
  });

  describe('errores', () => {
    it('asistente apagado o lento (20019): mensaje fijo y se puede reintentar el mismo texto con otra clave, sin repetir la burbuja', () => {
      const s = preparar();
      s.enviar('Hola');
      const clave1 = repo.ultima.clave;

      fallar(apiError(20019, 'El asistente no esta habilitado.'));

      expect(s.error()).toEqual({ mensaje: 'El asistente no está disponible ahora.', reintentable: true });
      expect(s.enviando()).toBe(false);
      expect(s.mensajes()).toHaveLength(1);

      s.reintentar();

      expect(repo.llamadas).toHaveLength(2);
      expect(repo.ultima.cuerpo.mensaje).toBe('Hola');
      expect(repo.ultima.clave).not.toBe(clave1);
      expect(s.error()).toBeNull();
      expect(s.mensajes()).toHaveLength(1);

      responder('Ahora sí');
      expect(s.mensajes().map((m) => m.texto)).toEqual(['Hola', 'Ahora sí']);
    });

    it('demasiadas preguntas (20015): «Has hecho muchas preguntas…» y sin botón de reintentar', () => {
      const s = preparar();
      s.enviar('Hola');

      fallar(apiError(20015, 'Ha hecho muchas preguntas seguidas.'));

      expect(s.error()).toEqual({ mensaje: 'Has hecho muchas preguntas, intenta en un rato.', reintentable: false });
      s.reintentar();
      expect(repo.llamadas).toHaveLength(1);
    });

    it('mensaje inválido (20001): muestra el mensaje del servidor sin cerrar el chat', () => {
      const s = preparar();
      s.enviar('Hola');

      fallar(apiError(20001, 'mensaje: tamaño inválido'));

      expect(s.error()).toEqual({ mensaje: 'mensaje: tamaño inválido', reintentable: false });
    });

    it('sin conexión o error interno: no disponible y reintentable', () => {
      expect(describirErrorAsistente(apiError(0, 'No se pudo conectar'))).toEqual({ mensaje: 'El asistente no está disponible ahora.', reintentable: true });
      expect(describirErrorAsistente(apiError(20999, 'Error interno del servidor.'))).toEqual({ mensaje: 'El asistente no está disponible ahora.', reintentable: true });
      expect(describirErrorAsistente(new Error('raro'))).toEqual({ mensaje: 'El asistente no está disponible ahora.', reintentable: true });
    });

    it('el ApiError que llega envuelto en `cause` también se entiende', () => {
      expect(describirErrorAsistente(new Error('x', { cause: apiError(20015) })).mensaje).toBe('Has hecho muchas preguntas, intenta en un rato.');
    });

    it('un envío nuevo borra el error anterior', () => {
      const s = preparar();
      s.enviar('Hola');
      fallar(apiError(20015));
      expect(s.error()).not.toBeNull();

      s.enviar('Otra');

      expect(s.error()).toBeNull();
    });
  });

  describe('sesión y pestaña', () => {
    it('al cerrar la sesión se borra el hilo, el sesion_id y lo guardado en la pestaña', () => {
      const s = preparar();
      s.enviar('Hola');
      responder('Buenas');
      const antes = repo.llamadas[0].cuerpo.sesion_id;
      expect(sessionStorage.getItem(ALMACEN)).toContain('Buenas');

      auth.limpiarSesion();
      TestBed.tick();

      expect(s.mensajes()).toEqual([]);
      expect(sessionStorage.getItem(ALMACEN)).toBeNull();
      auth.sesion.set(ANA);
      TestBed.tick();
      s.enviar('Nueva');
      expect(repo.ultima.cuerpo.sesion_id).not.toBe(antes);
    });

    it('cerrar la sesión con una pregunta en camino la cancela', () => {
      const s = preparar();
      s.enviar('Hola');
      const pendiente = repo.ultima.respuesta;

      auth.limpiarSesion();
      TestBed.tick();

      expect(pendiente.observed).toBe(false);
      expect(s.enviando()).toBe(false);
    });

    it('recargar la pestaña (F5) recupera la conversación y su sesion_id', () => {
      const s = preparar();
      s.enviar('Hola');
      responder('Buenas');
      const sesionId = repo.llamadas[0].cuerpo.sesion_id;

      TestBed.resetTestingModule();
      const despues = preparar();

      expect(despues.mensajes().map((m) => m.texto)).toEqual(['Hola', 'Buenas']);
      despues.enviar('Sigue');
      expect(repo.ultima.cuerpo.sesion_id).toBe(sesionId);
      expect(despues.mensajes().map((m) => m.id)).toEqual([1, 2, 3]);
    });

    it('otra persona en la misma pestaña no ve la conversación de la anterior', () => {
      const s = preparar();
      s.enviar('Hola');
      responder('Buenas');

      TestBed.resetTestingModule();
      const otro = preparar(LUIS);

      expect(otro.mensajes()).toEqual([]);
      expect(sessionStorage.getItem(ALMACEN)).toBeNull();
    });

    it('lo guardado que está dañado o no es de este formato se ignora', () => {
      sessionStorage.setItem(ALMACEN, '{no es json');
      expect(preparar().mensajes()).toEqual([]);

      TestBed.resetTestingModule();
      sessionStorage.setItem(ALMACEN, JSON.stringify({ usuario: 'ana', sesionId: 'corto', mensajes: [] }));
      expect(preparar().mensajes()).toEqual([]);

      TestBed.resetTestingModule();
      sessionStorage.setItem(ALMACEN, JSON.stringify({ usuario: 'ana', sesionId: 'abc-12345678', mensajes: [{ id: 1, de: 'sistema', texto: 'x' }] }));
      expect(preparar().mensajes()).toEqual([]);
    });

    it('si el navegador no deja guardar, la conversación sigue en memoria', () => {
      const s = preparar();
      const guardar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });

      s.enviar('Hola');
      responder('Buenas');

      expect(s.mensajes()).toHaveLength(2);
      guardar.mockRestore();
    });
  });
});
