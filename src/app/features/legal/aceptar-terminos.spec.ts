import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { Subject, of, throwError } from 'rxjs';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { crearEmpresaFalsa } from '../../core/empresa/testing/empresa-falsa';
import type { EstadoLegal } from '../../core/legal/legal.models';
import { LegalService } from '../../core/legal/legal.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../layout/services/theme.service';
import { AceptarTerminosPageComponent } from './aceptar-terminos-page.component';

@Component({ template: '' })
class Vacia {}

const doc = (documento: 'TERMINOS' | 'PRIVACIDAD', version = '1.0', aceptado = false) => ({ documento, version, fecha: '2026-10-28', aceptado, fecha_aceptacion: aceptado ? '2026-10-28T10:00:00' : null });
const PENDIENTE: EstadoLegal = { al_dia: false, documentos: [doc('TERMINOS'), doc('PRIVACIDAD')] };
const AL_DIA: EstadoLegal = { al_dia: true, documentos: [doc('TERMINOS', '1.0', true), doc('PRIVACIDAD', '1.0', true)] };

describe('Pantalla «Aceptar términos»', () => {
  let cargarEstado: ReturnType<typeof vi.fn>;
  let aceptar: ReturnType<typeof vi.fn>;
  let cerrarSesion: ReturnType<typeof vi.fn>;
  let empresa: ReturnType<typeof crearEmpresaFalsa>;
  let asegurarCargada: ReturnType<typeof vi.fn>;

  async function abrir(estado: EstadoLegal = PENDIENTE, retorno: string | null = '/cartera') {
    cargarEstado = vi.fn(() => of(estado));
    aceptar = vi.fn(() => of(AL_DIA));
    cerrarSesion = vi.fn(() => of(undefined));
    empresa = crearEmpresaFalsa();
    asegurarCargada = vi.spyOn(empresa, 'asegurarCargada');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Vacia }, { path: 'cartera', component: Vacia }, { path: 'login', component: Vacia }]),
        provideNgIconLoader(async () => ''),
        { provide: LegalService, useValue: { cargarEstado, aceptar } },
        { provide: AuthService, useValue: { cerrarSesion } },
        { provide: EmpresaService, useValue: empresa },
        { provide: ThemeService, useValue: { iconStyle: () => 'lucide' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(retorno ? { return: retorno } : {}) } } },
      ],
    });
    const f = TestBed.createComponent(AceptarTerminosPageComponent);
    await estabilizar(f);
    return { f, el: f.nativeElement as HTMLElement, router: TestBed.inject(Router) };
  }
  async function estabilizar(f: ComponentFixture<unknown>) {
    for (let i = 0; i < 4; i++) {
      f.detectChanges();
      await f.whenStable();
    }
  }
  const casilla = (el: HTMLElement, d: string) => el.querySelector<HTMLInputElement>(`[data-testid=casilla-${d}]`)!;
  const boton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('[data-testid=aceptar]')!;
  async function marcar(f: ComponentFixture<unknown>, el: HTMLElement, d: string, valor = true) {
    const c = casilla(el, d);
    c.checked = valor;
    c.dispatchEvent(new Event('change'));
    await estabilizar(f);
  }
  async function enviar(f: ComponentFixture<unknown>, el: HTMLElement) {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await estabilizar(f);
  }

  it('muestra los dos documentos con su versión y fecha, SIN casillas marcadas y con el botón deshabilitado', async () => {
    const { el } = await abrir();

    expect(el.querySelector('[data-testid=version-TERMINOS]')?.textContent).toContain('Versión 1.0');
    expect(el.querySelector('[data-testid=version-PRIVACIDAD]')?.textContent).toContain('Versión 1.0');
    expect(casilla(el, 'TERMINOS').checked).toBe(false);
    expect(casilla(el, 'PRIVACIDAD').checked).toBe(false);
    expect(boton(el).disabled).toBe(true);
    expect(el.querySelector('[data-testid=texto-TERMINOS]')?.textContent).toContain('Quién ofrece el servicio');
  });

  it('el botón solo se habilita con las DOS casillas marcadas', async () => {
    const { f, el } = await abrir();

    await marcar(f, el, 'TERMINOS');
    expect(boton(el).disabled).toBe(true);
    await marcar(f, el, 'PRIVACIDAD');
    expect(boton(el).disabled).toBe(false);
    await marcar(f, el, 'TERMINOS', false);
    expect(boton(el).disabled).toBe(true);
  });

  it('manda POST /legal/aceptar con las versiones QUE ESTÁ MOSTRANDO (las del estado) y sin marcar no manda nada', async () => {
    const { f, el } = await abrir();
    await enviar(f, el);
    expect(aceptar).not.toHaveBeenCalled();

    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');
    await enviar(f, el);

    expect(aceptar).toHaveBeenCalledExactlyOnceWith({ aceptaciones: [{ documento: 'TERMINOS', version: '1.0' }, { documento: 'PRIVACIDAD', version: '1.0' }] });
  });

  it('al aceptar vuelve a la ruta a la que iba y vuelve a pedir los datos de la empresa (fallaron con 20022)', async () => {
    const { f, el, router } = await abrir(PENDIENTE, '/cartera');
    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');

    await enviar(f, el);
    await f.whenStable();

    expect(router.url).toBe('/cartera');
    expect(asegurarCargada).toHaveBeenCalled();
  });

  it('una ruta de retorno peligrosa o la propia pantalla se cambian por el inicio (sin bucle ni redirección abierta)', async () => {
    for (const retorno of ['//evil.com', '/aceptar-terminos', 'https://evil.com']) {
      TestBed.resetTestingModule();
      const { f, el, router } = await abrir(PENDIENTE, retorno);
      await marcar(f, el, 'TERMINOS');
      await marcar(f, el, 'PRIVACIDAD');
      await enviar(f, el);
      await f.whenStable();

      expect(router.url, retorno).toBe('/');
    }
  });

  it('si el backend ya dice «al día» no muestra la pantalla: redirige', async () => {
    const { el, router } = await abrir(AL_DIA, '/cartera');

    expect(el.querySelector('[data-testid=aceptar]')).toBeNull();
    expect(router.url).toBe('/cartera');
  });

  it('versión SIN texto en este sistema: lo dice, la casilla queda deshabilitada y NO deja aceptar', async () => {
    const { f, el } = await abrir({ al_dia: false, documentos: [doc('TERMINOS', '9.9'), doc('PRIVACIDAD')] });

    expect(el.querySelector('[data-testid=sin-texto-TERMINOS]')?.textContent).toContain('Versión no disponible');
    expect(casilla(el, 'TERMINOS').disabled).toBe(true);
    await marcar(f, el, 'PRIVACIDAD');
    expect(boton(el).disabled).toBe(true);
    await enviar(f, el);
    expect(aceptar).not.toHaveBeenCalled();
  });

  it('409 / 20023 (la versión cambió): avisa «Los documentos cambiaron; léalos de nuevo», vuelve a leer el estado y desmarca las casillas', async () => {
    const { f, el } = await abrir();
    aceptar.mockReturnValue(throwError(() => ({ code: 20023, message: 'La versión ya no es la vigente.' })));
    cargarEstado.mockReturnValue(of({ al_dia: false, documentos: [doc('TERMINOS', '1.0'), doc('PRIVACIDAD', '1.0')] }));
    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');

    await enviar(f, el);

    expect(el.querySelector('[data-testid=aviso-cambio]')?.textContent).toContain('Los documentos cambiaron; léalos de nuevo');
    expect(cargarEstado).toHaveBeenCalledTimes(2);
    expect(casilla(el, 'TERMINOS').checked).toBe(false);
    expect(casilla(el, 'PRIVACIDAD').checked).toBe(false);
    expect(boton(el).disabled).toBe(true);
  });

  it('otro error al aceptar muestra su mensaje y deja intentar de nuevo', async () => {
    const { f, el } = await abrir();
    aceptar.mockReturnValue(throwError(() => ({ code: 20001, message: 'Faltan documentos.' })));
    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');

    await enviar(f, el);

    expect(el.querySelector('[data-testid=error-aceptar]')?.textContent).toContain('Hay datos inválidos');
    expect(boton(el).disabled).toBe(false);
  });

  it('mientras guarda no deja enviar dos veces', async () => {
    const { f, el } = await abrir();
    const respuesta = new Subject<EstadoLegal>();
    aceptar.mockReturnValue(respuesta);
    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');

    await enviar(f, el);
    await enviar(f, el);

    expect(aceptar).toHaveBeenCalledTimes(1);
    expect(boton(el).disabled).toBe(true);
  });

  it('si falla la consulta del estado: mensaje y «Reintentar»', async () => {
    cargarEstado = vi.fn();
    const { f, el } = await abrir();
    cargarEstado.mockReturnValueOnce(throwError(() => ({ code: 0, message: 'No se pudo conectar con el servidor.' })));
    (f.componentInstance as unknown as { cargar(): void }).cargar();
    await estabilizar(f);

    expect(el.querySelector('[data-testid=error-estado]')?.textContent).toContain('No se pudo conectar');
  });

  it('«Cerrar sesión» cierra la sesión y lleva al login', async () => {
    const { f, el, router } = await abrir();

    el.querySelector<HTMLButtonElement>('[data-testid=cerrar-sesion]')!.click();
    await estabilizar(f);
    await f.whenStable();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/login');
  });

  it('no tiene menú ni enlaces a pantallas del negocio; solo el pie legal', async () => {
    const { el } = await abrir();
    const enlaces = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');

    expect(el.querySelector('app-sidebar, app-header')).toBeNull();
    expect(enlaces.every((href) => href.startsWith('/legal'))).toBe(true);
    expect(el.querySelector('[data-testid=pie-legal]')).toBeTruthy();
  });

  it('no guarda nada en el almacenamiento del navegador', async () => {
    const escritura = vi.spyOn(Storage.prototype, 'setItem');
    const { f, el } = await abrir();
    await marcar(f, el, 'TERMINOS');
    await marcar(f, el, 'PRIVACIDAD');
    await enviar(f, el);

    expect(escritura).not.toHaveBeenCalled();
    escritura.mockRestore();
  });
});
