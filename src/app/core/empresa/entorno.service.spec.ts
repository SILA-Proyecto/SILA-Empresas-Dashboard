import { TestBed } from '@angular/core/testing';
import { EntornoService } from './entorno.service';

describe('EntornoService', () => {
  const responder = (cuerpo: string, ok = true) => vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, text: () => Promise.resolve(cuerpo) } as Response);

  afterEach(() => vi.restoreAllMocks());

  it('lee la marca de /entorno.json', async () => {
    const f = responder('{"marca":"pruebas"}');
    const servicio = TestBed.inject(EntornoService);

    await servicio.cargar();

    expect(f).toHaveBeenCalledWith('/entorno.json', expect.objectContaining({ cache: 'no-store' }));
    expect(servicio.marca()).toBe('pruebas');
  });

  it.each([
    ['sin archivo (404)', '', false],
    ['un servidor que devuelve index.html para todo', '<!doctype html><html></html>', true],
    ['JSON sin marca', '{"otra":1}', true],
    ['marca vacía', '{"marca":"  "}', true],
    ['marca que no es texto', '{"marca":5}', true],
    ['marca demasiado larga', `{"marca":"${'x'.repeat(40)}"}`, true],
  ])('%s: no hay marca', async (_caso, cuerpo, ok) => {
    responder(cuerpo, ok);
    const servicio = TestBed.inject(EntornoService);

    await servicio.cargar();

    expect(servicio.marca()).toBeNull();
  });

  it('si la red falla no hay marca y no se rompe', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sin red'));
    const servicio = TestBed.inject(EntornoService);

    await servicio.cargar();

    expect(servicio.marca()).toBeNull();
  });
});
