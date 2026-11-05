import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth.service';
import { AvatarComponent, tonoDeNombre } from './avatar.component';

describe('AvatarComponent', () => {
  let http: HttpTestingController;
  let crearUrl: ReturnType<typeof vi.fn>;
  let liberarUrl: ReturnType<typeof vi.fn>;
  let siguiente = 0;

  beforeEach(() => {
    siguiente = 0;
    crearUrl = vi.fn(() => `blob:foto-${++siguiente}`);
    liberarUrl = vi.fn();
    URL.createObjectURL = crearUrl as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = liberarUrl as unknown as typeof URL.revokeObjectURL;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { isAuthenticated: signal(true) } }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function crear(version: string | null, id = 7, nombre = 'Ana Pérez'): ComponentFixture<AvatarComponent> {
    const f = TestBed.createComponent(AvatarComponent);
    f.componentRef.setInput('idUsuario', id);
    f.componentRef.setInput('nombre', nombre);
    f.componentRef.setInput('fotoVersion', version);
    f.detectChanges();
    return f;
  }

  const asentar = async (...fs: ComponentFixture<unknown>[]) => {
    await new Promise((r) => setTimeout(r));
    fs.forEach((f) => f.detectChanges());
  };
  const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const pedidosFoto = (id: number) => http.match((r) => r.url.endsWith(`/api/v1/fotos/${id}`));

  it('sin foto muestra las iniciales con un color del nombre y no pide nada', () => {
    const f = crear(null);

    const iniciales = el(f).querySelector<HTMLElement>('[data-testid=avatar-iniciales]')!;
    expect(iniciales.textContent?.trim()).toBe('AP');
    expect(iniciales.style.backgroundColor).toContain(String(tonoDeNombre('Ana Pérez')));
    expect(pedidosFoto(7)).toHaveLength(0);
  });

  it('el mismo nombre siempre tiene el mismo color', () => {
    expect(tonoDeNombre('Ana Pérez')).toBe(tonoDeNombre('Ana Pérez'));
  });

  it('con foto la trae como Blob (con token, no un <img src> directo) y la muestra desde un blob:', async () => {
    const f = crear('v1');
    const [pedido] = pedidosFoto(7);
    expect(pedido.request.responseType).toBe('blob');

    pedido.flush(new Blob(['x'], { type: 'image/jpeg' }));
    await asentar(f);

    expect(el(f).querySelector('img')?.getAttribute('src')).toBe('blob:foto-1');
  });

  it('dos avatares de la misma persona y versión piden la foto una sola vez', async () => {
    const a = crear('v1');
    const b = crear('v1');

    const pedidos = pedidosFoto(7);
    expect(pedidos).toHaveLength(1);
    pedidos[0].flush(new Blob(['x']));
    await asentar(a, b);

    expect(el(a).querySelector('img')).toBeTruthy();
    expect(el(b).querySelector('img')).toBeTruthy();
  });

  it('al cambiar la versión libera la URL anterior, y al destruirse libera la suya', async () => {
    const f = crear('v1');
    pedidosFoto(7)[0].flush(new Blob(['x']));
    await asentar(f);

    f.componentRef.setInput('fotoVersion', 'v2');
    await asentar(f);
    expect(liberarUrl).toHaveBeenCalledWith('blob:foto-1');
    pedidosFoto(7)[0].flush(new Blob(['y']));
    await asentar(f);
    expect(el(f).querySelector('img')?.getAttribute('src')).toBe('blob:foto-2');

    f.destroy();
    expect(liberarUrl).toHaveBeenCalledWith('blob:foto-2');
  });

  it('quitar la foto (versión null) vuelve a las iniciales y libera la URL', async () => {
    const f = crear('v1');
    pedidosFoto(7)[0].flush(new Blob(['x']));
    await asentar(f);

    f.componentRef.setInput('fotoVersion', null);
    await asentar(f);

    expect(el(f).querySelector('[data-testid=avatar-iniciales]')).toBeTruthy();
    expect(liberarUrl).toHaveBeenCalledWith('blob:foto-1');
  });

  it('si la foto no se puede traer muestra las iniciales (y otro avatar lo puede intentar de nuevo)', async () => {
    const f = crear('v1');
    pedidosFoto(7)[0].flush(new Blob(), { status: 404, statusText: 'Not Found' });
    await asentar(f);

    expect(el(f).querySelector('img')).toBeNull();
    expect(el(f).querySelector('[data-testid=avatar-iniciales]')).toBeTruthy();
    expect(crearUrl).not.toHaveBeenCalled();

    crear('v1');
    expect(pedidosFoto(7)).toHaveLength(1);
  });

  it('una foto que llega después de destruirse no crea ninguna URL', async () => {
    const f = crear('v1');
    const [pedido] = pedidosFoto(7);
    f.destroy();

    pedido.flush(new Blob(['x']));
    await asentar();

    expect(crearUrl).not.toHaveBeenCalled();
  });
});
