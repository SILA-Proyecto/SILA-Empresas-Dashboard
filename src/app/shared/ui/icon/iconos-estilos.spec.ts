import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNgIconLoader, withCaching } from '@ng-icons/core';
import { ThemeService, type IconStyle } from '../../../layout/services/theme.service';
import { cargarIcono } from './cargar-icono';
import { IconComponent } from './icon.component';
import { ICONOS } from './iconos';
import { ICONOS_PHOSPHOR } from './iconos-phosphor';
import { ICONOS_TABLER } from './iconos-tabler';

const CLAVES = Object.keys(ICONOS);

describe('Estilos de íconos', () => {
  it.each([
    ['Tabler', ICONOS_TABLER],
    ['Phosphor', ICONOS_PHOSPHOR],
  ])('%s tiene CADA clave de iconos.ts con un SVG (si falta una, en pantalla quedaría un hueco)', (_, mapa) => {
    const faltan = CLAVES.filter((clave) => !(mapa as Record<string, string>)[clave]?.includes('<svg'));
    expect(faltan).toEqual([]);
    expect(Object.keys(mapa).sort()).toEqual([...CLAVES].sort());
  });

  it('los estilos no son copias de Lucide', () => {
    expect(ICONOS_TABLER.lucideSearch).not.toBe(ICONOS.lucideSearch);
    expect(ICONOS_PHOSPHOR.lucideSearch).not.toBe(ICONOS.lucideSearch);
  });

  describe('cargarIcono', () => {
    it('sin prefijo es Lucide; con prefijo, el de ese estilo', async () => {
      expect(await cargarIcono('lucideSearch')).toBe(ICONOS.lucideSearch);
      expect(await cargarIcono('tabler:lucideSearch')).toBe(ICONOS_TABLER.lucideSearch);
      expect(await cargarIcono('phosphor:lucideSearch')).toBe(ICONOS_PHOSPHOR.lucideSearch);
    });

    it('un estilo desconocido cae a Lucide; un nombre desconocido da vacío', async () => {
      expect(await cargarIcono('material:lucideSearch')).toBe(ICONOS.lucideSearch);
      expect(await cargarIcono('tabler:lucideNoExiste')).toBe('');
    });
  });

  describe('app-icon', () => {
    const estilo = signal<IconStyle>('lucide');

    beforeEach(() => {
      estilo.set('lucide');
      TestBed.configureTestingModule({
        providers: [provideNgIconLoader(cargarIcono, withCaching()), { provide: ThemeService, useValue: { iconStyle: estilo } }],
      });
    });

    async function dibujar(estiloForzado: IconStyle | null = null) {
      const f = TestBed.createComponent(IconComponent);
      f.componentRef.setInput('name', 'lucideSearch');
      f.componentRef.setInput('estilo', estiloForzado);
      const svg = async () => {
        for (let i = 0; i < 5; i++) {
          f.detectChanges();
          await new Promise((r) => setTimeout(r));
        }
        return (f.nativeElement as HTMLElement).querySelector('svg')?.outerHTML ?? '';
      };
      return { svg };
    }

    const sinEspacios = (html: string) => html.replace(/\s+/g, '');

    it('al cambiar el estilo el ícono se redibuja sin recargar', async () => {
      const { svg } = await dibujar();
      const lucide = await svg();
      expect(lucide).toContain('<svg');

      estilo.set('tabler');
      const tabler = await svg();

      expect(tabler).toContain('<svg');
      expect(sinEspacios(tabler)).not.toBe(sinEspacios(lucide));
    });

    it('`estilo` fuerza uno (las vistas previas del panel) sin importar el elegido', async () => {
      const forzado = await (await dibujar('phosphor')).svg();
      const elegido = await (await dibujar()).svg();

      expect(sinEspacios(forzado)).not.toBe(sinEspacios(elegido));
    });
  });
});
