import { TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { PestanasComponent } from './pestanas.component';

describe('PestanasComponent', () => {
  it('en el celular las pestañas pasan a otra línea en vez de esconderse en un deslizador lateral', () => {
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => '')] });
    const f = TestBed.createComponent(PestanasComponent);
    f.componentRef.setInput('pestanas', [
      { id: 'a', etiqueta: 'Archivos', icono: 'lucideFolder' },
      { id: 'b', etiqueta: 'Ver documento', icono: 'lucideFolder' },
      { id: 'c', etiqueta: 'Drive', icono: 'lucideFolder' },
      { id: 'd', etiqueta: 'Accesos', icono: 'lucideFolder' },
    ]);
    f.componentRef.setInput('activa', 'a');
    f.componentRef.setInput('etiqueta', 'Secciones');
    f.detectChanges();

    const lista = (f.nativeElement as HTMLElement).querySelector('[role=tablist]')!;
    expect(lista.className).toContain('flex-wrap');
    expect(lista.className).not.toContain('overflow-x-auto');
    expect(lista.querySelectorAll('[role=tab]')).toHaveLength(4);
  });
});
