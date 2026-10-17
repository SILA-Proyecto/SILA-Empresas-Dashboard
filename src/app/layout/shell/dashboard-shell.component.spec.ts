import { TestBed } from '@angular/core/testing';
import { DashboardShellComponent } from './dashboard-shell.component';

describe('DashboardShellComponent', () => {
  it('«Saltar al contenido» mueve el foco al contenido sin navegar (un #ancla recargaría la app por el <base href>)', () => {
    // Only the skip-link logic is under test: the children (menu, header, outlet) need a whole app around them.
    TestBed.overrideComponent(DashboardShellComponent, { set: { imports: [], template: '' } });
    window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    const f = TestBed.createComponent(DashboardShellComponent);
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    document.body.appendChild(main);
    const evento = new MouseEvent('click', { cancelable: true });

    (f.componentInstance as unknown as { saltarAlContenido(e: Event): void }).saltarAlContenido(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(main);
    main.remove();
  });
});
