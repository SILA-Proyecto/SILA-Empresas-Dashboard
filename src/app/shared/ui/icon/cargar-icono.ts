/**
 * Icon loader of `provideNgIconLoader`. `app-icon` asks for `lucideSearch` (the usual style) or `<style>:lucideSearch`
 * (`tabler:lucideSearch`, `phosphor:lucideSearch`). Each style is its own lazy chunk, downloaded only when someone uses it.
 * An unknown style, a key missing in a style or a chunk that fails to load falls back to Lucide: never a hole on screen.
 */
type Mapa = Record<string, string>;

const ESTILOS: Record<string, () => Promise<Mapa>> = {
  tabler: () => import('./iconos-tabler').then((m) => m.ICONOS_TABLER),
  phosphor: () => import('./iconos-phosphor').then((m) => m.ICONOS_PHOSPHOR),
};

const lucide = (): Promise<Mapa> => import('./iconos').then((m) => m.ICONOS);

export async function cargarIcono(nombreCompleto: string): Promise<string> {
  const separador = nombreCompleto.indexOf(':');
  const estilo = separador > 0 ? nombreCompleto.slice(0, separador) : 'lucide';
  const nombre = separador > 0 ? nombreCompleto.slice(separador + 1) : nombreCompleto;
  const cargar = ESTILOS[estilo];
  if (cargar) {
    try {
      const svg = (await cargar())[nombre];
      if (svg) return svg;
    } catch {
      // Chunk not available (offline after an update…): Lucide below.
    }
  }
  return (await lucide())[nombre] ?? '';
}
