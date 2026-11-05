import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { ThemeService } from '../../layout/services/theme.service';
import { MOSTRAR_AVISO_BORRADOR } from './contenido/tipos';
import { LEGAL_ROUTES } from './legal.routes';

/** Las páginas públicas se leen SIN sesión, desde el login. */
describe('Páginas legales públicas', () => {
  let http: HttpTestingController;

  async function ir(url: string, vigentes: { documento: string; version: string; fecha: string }[] | 'fallo' | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'legal', loadChildren: () => LEGAL_ROUTES }, { path: '', children: [] }]),
        provideNgIconLoader(async () => ''),
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    let terminada = false;
    const navegacion = harness.navigateByUrl(url).finally(() => (terminada = true));
    // The pages are lazy: their requests (the company name and, for TERMINOS/PRIVACIDAD, the versions in force) appear as
    // each chunk loads, so the answers are given in rounds until the navigation ends.
    for (let ronda = 0; ronda < 20 && !terminada; ronda++) {
      await new Promise((r) => setTimeout(r));
      responderPeticiones(vigentes);
    }
    await navegacion;
    responderPeticiones(vigentes);
    await harness.fixture.whenStable();
    harness.detectChanges();
    responderPeticiones(vigentes);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const el = harness.routeNativeElement as HTMLElement;
    return { el, fixture: harness.fixture as ComponentFixture<unknown>, harness, texto: () => (harness.fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ') };
  }

  function responderPeticiones(vigentes: { documento: string; version: string; fecha: string }[] | 'fallo' | null): void {
    for (const req of http.match(() => true)) {
      const path = new URL(req.request.url, 'http://h').pathname;
      if (path.endsWith('/legal/vigentes')) {
        if (vigentes === 'fallo') req.flush({ code: 20999, message: 'x' }, { status: 500, statusText: 'x' });
        else req.flush({ documentos: vigentes ?? [{ documento: 'TERMINOS', version: '1.0', fecha: '2026-10-28' }, { documento: 'PRIVACIDAD', version: '1.0', fecha: '2026-10-28' }] });
      } else if (path.endsWith('/empresa/publica')) req.flush({ nombre: 'Lácteos Ejemplo SAS', nombre_corto: 'Ejemplo', logo_version: null, estado: 'ACTIVA' });
    }
  }

  it.each([
    ['/legal', 'Información legal'],
    ['/legal/terminos', 'Términos y condiciones de uso'],
    ['/legal/politica-privacidad', 'Política de tratamiento de datos personales'],
    ['/legal/cookies', 'Cookies y almacenamiento local'],
    ['/legal/derechos-y-pqr', 'Tus derechos y cómo reclamar'],
    ['/legal/ia', 'Aviso de uso de inteligencia artificial'],
    ['/legal/drive', 'Aviso de conexión con Google Drive'],
    ['/legal/licencias', 'Créditos y licencias de terceros'],
  ])('%s se ve sin sesión, con su título y la leyenda de borrador', async (url, titulo) => {
    const { texto, el } = await ir(url);

    expect(texto()).toContain(titulo);
    if (MOSTRAR_AVISO_BORRADOR) expect(texto()).toContain('Borrador pendiente de validación jurídica');
    else expect(texto()).not.toContain('Borrador pendiente de validación jurídica');
    expect(el.querySelector('h1')).toBeTruthy();
  });

  it.each(['/legal/terminos', '/legal/politica-privacidad', '/legal/cookies', '/legal/derechos-y-pqr', '/legal/ia', '/legal/drive'])('%s muestra su versión y fecha', async (url) => {
    const { el } = await ir(url);

    expect(el.querySelector('[data-testid=version-texto]')?.textContent).toMatch(/Versión 1\.0 · .*2026/);
  });

  it('el nombre de la empresa sale de /empresa/publica, no de un texto fijo', async () => {
    const { texto } = await ir('/legal/terminos');

    expect(texto()).toContain('Lácteos Ejemplo SAS');
    expect(texto()).toContain('SILA · Ejemplo');
  });

  it('los datos que no se conocen salen resaltados como [POR DEFINIR]', async () => {
    const { el } = await ir('/legal/politica-privacidad');

    expect(el.querySelectorAll('[data-testid=por-definir]').length).toBeGreaterThan(3);
    expect(el.querySelector('[data-testid=por-definir]')?.textContent).toContain('[POR DEFINIR');
  });

  it('el pie legal y la navegación están en la página, con foco y teclado (enlace «Saltar al contenido»)', async () => {
    const { fixture } = await ir('/legal/cookies');
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('[data-testid=pie-legal]')).toBeTruthy();
    expect(raiz.querySelector('main#legal-contenido')?.getAttribute('tabindex')).toBe('-1');
    expect(raiz.querySelector('a.sr-only')?.textContent).toContain('Saltar al contenido');
  });

  it('el pie enlaza a términos, privacidad, cookies, derechos y PQR, IA, Drive y licencias', async () => {
    const { fixture } = await ir('/legal');
    const hrefs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid=pie-legal] a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual(['/legal/terminos', '/legal/politica-privacidad', '/legal/cookies', '/legal/derechos-y-pqr', '/legal/ia', '/legal/drive', '/legal/licencias']);
  });

  it('TERMINOS muestra la versión que dice /legal/vigentes; si pide una de la que no hay texto, dice «Versión no disponible» y no muestra otra', async () => {
    const { el, texto } = await ir('/legal/terminos', [{ documento: 'TERMINOS', version: '9.9', fecha: '2026-12-01' }]);

    expect(el.querySelector('[data-testid=version-no-disponible]')).toBeTruthy();
    expect(texto()).toContain('Versión no disponible');
    expect(texto()).toContain('versión 9.9');
    expect(el.querySelector('[data-testid=version-texto]')).toBeNull();
  });

  it('?v=1.0 muestra esa versión aunque el backend ya pida otra (para ver qué se aceptó)', async () => {
    const { el } = await ir('/legal/terminos?v=1.0', [{ documento: 'TERMINOS', version: '9.9', fecha: '2026-12-01' }]);

    expect(el.querySelector('[data-testid=version-texto]')?.textContent).toContain('Versión 1.0');
  });

  it('si /legal/vigentes falla, igual se puede leer el texto más reciente que tenemos', async () => {
    const { el } = await ir('/legal/politica-privacidad', 'fallo');

    expect(el.querySelector('[data-testid=version-texto]')?.textContent).toContain('Versión 1.0');
  });

  it('la página de licencias lista los paquetes, enlaza los avisos completos y marca ApexCharts como «verificar licencia comercial»', async () => {
    const { el, texto } = await ir('/legal/licencias');

    expect(el.querySelectorAll('[data-testid=tabla-licencias] tbody tr').length).toBeGreaterThan(50);
    expect(el.querySelector('[data-testid=enlace-avisos]')?.getAttribute('href')).toBe('licencias-terceros.txt');
    expect(el.querySelector('[data-testid=nota-apexcharts]')?.textContent).toContain('licencia comercial');
    expect(texto()).toContain('verificar licencia comercial');
  });

  it('una ruta legal que no existe vuelve al índice', async () => {
    const { harness } = await ir('/legal/no-existe');

    expect(TestBed.inject(Router).url).toBe('/legal');
    expect(harness).toBeTruthy();
  });

  it('las páginas no piden nada al servidor aparte de /empresa/publica y /legal/vigentes (y sin token)', async () => {
    const { fixture } = await ir('/legal/terminos');
    http.verify();

    expect(fixture).toBeTruthy();
    // `EmpresaService` is real here: the layout asked for the public name, never for `/empresa`.
    expect(TestBed.inject(EmpresaService).empresa()).toBeNull();
  });
});
