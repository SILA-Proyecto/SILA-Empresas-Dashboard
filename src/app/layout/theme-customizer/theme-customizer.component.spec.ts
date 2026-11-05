import { TestBed } from '@angular/core/testing';
import { ThemeCustomizerStateService } from '../services/theme-customizer-state.service';
import { ThemeService } from '../services/theme.service';
import { ThemeCustomizerComponent } from './theme-customizer.component';

describe('ThemeCustomizerComponent · panel de apariencia', () => {
  let estado: ThemeCustomizerStateService;
  let theme: ThemeService;
  let raiz: HTMLElement;

  beforeEach(() => {
    window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    localStorage.clear();
    const fixture = TestBed.createComponent(ThemeCustomizerComponent);
    estado = TestBed.inject(ThemeCustomizerStateService);
    theme = TestBed.inject(ThemeService);
    raiz = fixture.nativeElement;
    fixture.autoDetectChanges();
    TestBed.tick();
  });

  const panel = () => raiz.querySelector<HTMLElement>('[data-testid="apariencia-panel"]')!;
  const boton = (id: string) => raiz.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!;

  it('cerrado queda inert e invisible; abierto se puede usar', () => {
    expect(panel().inert).toBe(true);
    expect(panel().classList).toContain('invisible');

    estado.toggle();
    TestBed.tick();

    expect(panel().inert).toBe(false);
    expect(panel().classList).not.toContain('invisible');
  });

  it('el fondo y la tecla Escape lo cierran', () => {
    estado.toggle();
    TestBed.tick();
    raiz.querySelector<HTMLElement>('[data-testid="apariencia-fondo"]')!.click();
    expect(estado.open()).toBe(false);

    estado.toggle();
    TestBed.tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(estado.open()).toBe(false);
  });

  it('tiene modo, seis colores, cuatro esquinas y no ofrece RTL', () => {
    expect(raiz.querySelectorAll('[data-testid^="apariencia-modo-"]').length).toBe(3);
    expect(raiz.querySelectorAll('[data-testid^="apariencia-color-"]').length).toBe(6);
    expect(raiz.querySelectorAll('[data-testid^="apariencia-esquinas-"]').length).toBe(4);
    expect(raiz.textContent).not.toMatch(/RTL|derecha a izquierda/i);
  });

  it('los botones cambian el tema y marcan la opción elegida', () => {
    estado.toggle();
    TestBed.tick();

    boton('apariencia-modo-light').click();
    boton('apariencia-color-amber').click();
    boton('apariencia-esquinas-large').click();
    TestBed.tick();

    expect([theme.mode(), theme.accent(), theme.radius()]).toEqual(['light', 'amber', 'large']);
    expect(boton('apariencia-color-amber').getAttribute('aria-pressed')).toBe('true');
    expect(boton('apariencia-color-blue').getAttribute('aria-pressed')).toBe('false');
    expect(boton('apariencia-color-amber').getAttribute('aria-label')).toBe('Ámbar');

    boton('apariencia-original').click();
    TestBed.tick();
    expect([theme.mode(), theme.accent(), theme.radius()]).toEqual(['dark', 'blue', 'medium']);
  });

  it('estilo de íconos y tamaño de letra: tres estilos con su vista previa y dos tamaños', () => {
    estado.toggle();
    TestBed.tick();

    expect(raiz.querySelectorAll('[data-testid^="apariencia-iconos-"]').length).toBe(3);
    expect(boton('apariencia-iconos-tabler').querySelectorAll('app-icon').length).toBe(6);

    boton('apariencia-iconos-phosphor').click();
    boton('apariencia-letra-large').click();
    TestBed.tick();

    expect([theme.iconStyle(), theme.fontSize()]).toEqual(['phosphor', 'large']);
    expect(boton('apariencia-iconos-phosphor').getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.getAttribute('data-font')).toBe('large');
  });

  it('cerrado no dibuja las vistas previas (los otros estilos no se descargan en cada página)', () => {
    expect(boton('apariencia-iconos-tabler').querySelectorAll('app-icon').length).toBe(0);
  });
});

