import { TestBed } from '@angular/core/testing';
import { DEFAULT_THEME, THEME_STORAGE_KEY, ThemeService } from './theme.service';

/** A controllable `prefers-color-scheme: dark` query. */
function sistemaFalso(oscuro: boolean) {
  const oyentes: ((e: MediaQueryListEvent) => void)[] = [];
  const consulta = {
    matches: oscuro,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => oyentes.push(fn),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(consulta as unknown as MediaQueryList);
  return {
    cambiar(valor: boolean) {
      consulta.matches = valor;
      oyentes.forEach((fn) => fn({ matches: valor } as MediaQueryListEvent));
    },
  };
}

describe('ThemeService · apariencia', () => {
  const html = document.documentElement;

  beforeEach(() => {
    window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    localStorage.clear();
    html.className = '';
    html.removeAttribute('data-accent');
    html.removeAttribute('data-radius');
    html.removeAttribute('data-font');
  });

  afterEach(() => vi.restoreAllMocks());

  function crear(): ThemeService {
    const servicio = TestBed.inject(ThemeService);
    TestBed.tick();
    return servicio;
  }

  function guardado(): unknown {
    return JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null');
  }

  it('sin nada guardado usa lo original: oscuro, azul y esquinas medianas', () => {
    sistemaFalso(false);
    const servicio = crear();

    expect(servicio.mode()).toBe('dark');
    expect(servicio.accent()).toBe('blue');
    expect(servicio.radius()).toBe('medium');
    expect(html.classList.contains('dark')).toBe(true);
    expect(html.getAttribute('data-accent')).toBe('blue');
    expect(html.getAttribute('data-radius')).toBe('medium');
  });

  it('guarda cada cambio en localStorage y lo aplica a <html>', () => {
    sistemaFalso(false);
    const servicio = crear();

    servicio.setMode('light');
    servicio.setAccent('rose');
    servicio.setRadius('large');
    TestBed.tick();

    expect(guardado()).toEqual({ mode: 'light', accent: 'rose', radius: 'large', iconStyle: 'lucide', fontSize: 'normal' });
    expect(html.classList.contains('dark')).toBe(false);
    expect(html.getAttribute('data-accent')).toBe('rose');
    expect(html.getAttribute('data-radius')).toBe('large');
  });

  it('al cargar recupera lo guardado', () => {
    sistemaFalso(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'light', accent: 'amber', radius: 'none' }));
    const servicio = crear();

    expect(servicio.mode()).toBe('light');
    expect(servicio.accent()).toBe('amber');
    expect(servicio.radius()).toBe('none');
    expect(html.getAttribute('data-accent')).toBe('amber');
  });

  it('un valor guardado que no está en la lista vuelve al original sin tocar los válidos', () => {
    sistemaFalso(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'sepia', accent: 'green', radius: 42, direction: 'rtl' }));
    const servicio = crear();

    expect(servicio.mode()).toBe(DEFAULT_THEME.mode);
    expect(servicio.accent()).toBe('green');
    expect(servicio.radius()).toBe(DEFAULT_THEME.radius);
    // The old RTL option is not kept any more; the fields that did not exist yet take their default.
    expect(guardado()).toEqual({ mode: 'dark', accent: 'green', radius: 'medium', iconStyle: 'lucide', fontSize: 'normal' });
  });

  it.each(['{no es json', 'null', '"texto"', '[1,2]'])('un JSON dañado o raro (%s) no rompe: usa lo original', (crudo) => {
    sistemaFalso(false);
    localStorage.setItem(THEME_STORAGE_KEY, crudo);

    const servicio = crear();

    expect([servicio.mode(), servicio.accent(), servicio.radius()]).toEqual(['dark', 'blue', 'medium']);
  });

  it('estilo de íconos y tamaño de letra: se guardan, se leen y la letra va a <html>', () => {
    sistemaFalso(false);
    const servicio = crear();

    servicio.setIconStyle('tabler');
    servicio.setFontSize('large');
    TestBed.tick();

    expect(html.getAttribute('data-font')).toBe('large');
    expect(guardado()).toMatchObject({ iconStyle: 'tabler', fontSize: 'large' });

    TestBed.resetTestingModule();
    const otra = crear();
    expect([otra.iconStyle(), otra.fontSize()]).toEqual(['tabler', 'large']);
  });

  it('preferencias guardadas antes de existir los íconos y la letra se conservan y se completan', () => {
    sistemaFalso(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'light', accent: 'violet', radius: 'small' }));

    const servicio = crear();

    expect([servicio.mode(), servicio.accent(), servicio.radius(), servicio.iconStyle(), servicio.fontSize()]).toEqual(['light', 'violet', 'small', 'lucide', 'normal']);
  });

  it('si localStorage falla (modo privado, datos bloqueados) la app sigue con lo original y aplica los cambios', () => {
    sistemaFalso(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('lleno', 'QuotaExceededError');
    });

    const servicio = crear();
    expect(servicio.accent()).toBe('blue');

    servicio.setAccent('rose');
    expect(() => TestBed.tick()).not.toThrow();
    expect(html.getAttribute('data-accent')).toBe('rose');
  });

  it('un estilo de íconos o un tamaño desconocido vuelve al original', () => {
    sistemaFalso(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ iconStyle: 'material', fontSize: 'enorme' }));

    const servicio = crear();

    expect([servicio.iconStyle(), servicio.fontSize()]).toEqual(['lucide', 'normal']);
  });

  it('«Volver a lo original» restaura todos los valores', () => {
    sistemaFalso(false);
    const servicio = crear();
    servicio.setMode('auto');
    servicio.setAccent('violet');
    servicio.setRadius('small');

    servicio.setIconStyle('phosphor');
    servicio.setFontSize('large');

    servicio.reset();
    TestBed.tick();

    expect(guardado()).toEqual({ mode: 'dark', accent: 'blue', radius: 'medium', iconStyle: 'lucide', fontSize: 'normal' });
    expect(html.getAttribute('data-font')).toBe('normal');
  });

  it('en automático sigue al sistema y cambia cuando el sistema cambia', () => {
    const sistema = sistemaFalso(true);
    const servicio = crear();

    servicio.setMode('auto');
    TestBed.tick();
    expect(servicio.isDark()).toBe(true);
    expect(html.classList.contains('dark')).toBe(true);

    sistema.cambiar(false);
    TestBed.tick();
    expect(servicio.isDark()).toBe(false);
    expect(html.classList.contains('dark')).toBe(false);
  });

  it('fuera de automático el cambio del sistema no se aplica, y al volver a automático lee el sistema de nuevo', () => {
    const sistema = sistemaFalso(false);
    const servicio = crear();
    servicio.setMode('dark');

    sistema.cambiar(false);
    sistema.cambiar(true);
    sistema.cambiar(false);
    TestBed.tick();
    expect(html.classList.contains('dark')).toBe(true);

    sistema.cambiar(true);
    servicio.setMode('light');
    TestBed.tick();
    expect(html.classList.contains('dark')).toBe(false);

    servicio.setMode('auto');
    TestBed.tick();
    expect(servicio.isDark()).toBe(true);
  });
});
