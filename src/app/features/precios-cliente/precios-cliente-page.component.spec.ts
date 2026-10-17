import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { PRECIOS_CLIENTE_REPOSITORY } from './data/precios-cliente.provider';
import { PreciosClientePageComponent } from './precios-cliente-page.component';
import type { PrecioCliente } from './models/precios-cliente.models';

const precio = (id: number, cliente: string, producto: string, extra: Partial<PrecioCliente> = {}): PrecioCliente => ({
  id_precio: id, id_cliente: id * 10, cliente, id_producto: id, codigo_sku: `P-${id}`, producto, unidad_medida: 'UND', precio: 9000, precio_base: 10000, diferencia: -1000, activo: true, ...extra,
});
const TODOS = [precio(1, 'Tienda Doña Luz', 'Queso doble crema'), precio(2, 'Tienda Doña Luz', 'Kumis 1 L', { id_cliente: 10 }), precio(3, 'Supermercado El Sol', 'Queso doble crema', { id_cliente: 30 })];
const CLIENTES = [
  { id_cliente: 10, nombre: 'Tienda Doña Luz', numero_documento: '900111' },
  { id_cliente: 30, nombre: 'Supermercado El Sol', numero_documento: '900333' },
];

describe('PreciosClientePageComponent', () => {
  let repo: { listar: ReturnType<typeof vi.fn>; fijar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    const d = HTMLDialogElement.prototype;
    d.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    d.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  async function crear(): Promise<ComponentFixture<PreciosClientePageComponent>> {
    repo = {
      listar: vi.fn((q: { id_cliente?: number }) => {
        const items = q.id_cliente ? TODOS.filter((p) => p.id_cliente === q.id_cliente) : TODOS;
        return of({ items, total: items.length, page: 0, size: 10 });
      }),
      fijar: vi.fn(() => of(TODOS[0])),
      desactivar: vi.fn(() => of({ ...TODOS[0], activo: false })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        { provide: PRECIOS_CLIENTE_REPOSITORY, useValue: repo },
        {
          provide: CATALOGOS_REPOSITORY,
          useValue: {
            listarClientes: vi.fn(() => of({ items: CLIENTES, total: 2, page: 0, size: 20 })),
            listarProductos: vi.fn(() => of({ items: [{ id_producto: 1, nombre: 'Queso doble crema', codigo_sku: 'P-1', unidad_medida: 'UND', stock: 5, precio_base: 10000 }], total: 1, page: 0, size: 100 })),
          },
        },
      ],
    });
    const f = TestBed.createComponent(PreciosClientePageComponent);
    await asentar(f);
    return f;
  }
  async function asentar(f: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 6; i++) {
      f.detectChanges();
      await f.whenStable();
    }
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const filas = (f: ComponentFixture<unknown>) => Array.from(raiz(f).querySelectorAll('tbody tr')).map((tr) => (tr.textContent ?? '').replace(/\s+/g, ' '));
  async function elegir(f: ComponentFixture<unknown>, idCampo: string, posicion: number): Promise<void> {
    raiz(f).querySelector<HTMLInputElement>(`#${idCampo}`)!.dispatchEvent(new Event('focus'));
    await asentar(f);
    raiz(f).querySelectorAll(`#${idCampo}-lista [role=option]`)[posicion].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await asentar(f);
  }

  it('al entrar muestra de una vez los acuerdos de TODOS los clientes, con la columna Cliente', async () => {
    const f = await crear();

    expect(repo.listar).toHaveBeenCalledWith(expect.objectContaining({ id_cliente: undefined, activo: true }));
    expect(filas(f)).toHaveLength(3);
    expect(filas(f)[0]).toContain('Tienda Doña Luz');
    expect(filas(f)[2]).toContain('Supermercado El Sol');
    expect(raiz(f).querySelector('thead')!.textContent).toContain('Cliente');
    expect(raiz(f).textContent).not.toContain('Elige un cliente');
  });

  it('elegir un cliente filtra la lista y quita la columna Cliente; volver a «Todos los clientes» los muestra otra vez', async () => {
    const f = await crear();

    await elegir(f, 'precios-cliente', 1);
    expect(repo.listar).toHaveBeenLastCalledWith(expect.objectContaining({ id_cliente: 10 }));
    expect(filas(f)).toHaveLength(2);
    expect(raiz(f).querySelector('thead')!.textContent).not.toContain('Cliente');
    expect(raiz(f).textContent).toContain('Precios pactados de Tienda Doña Luz');

    await elegir(f, 'precios-cliente', 0);
    expect(repo.listar).toHaveBeenLastCalledWith(expect.objectContaining({ id_cliente: undefined }));
    expect(filas(f)).toHaveLength(3);
  });

  it('«Nuevo acuerdo» se puede usar sin cliente elegido y pide el cliente dentro del diálogo', async () => {
    const f = await crear();
    const nuevo = Array.from(raiz(f).querySelectorAll('button')).find((b) => b.textContent!.includes('Nuevo acuerdo'))!;
    expect(nuevo.disabled).toBe(false);

    nuevo.click();
    await asentar(f);
    expect(raiz(f).querySelector('dialog[open] #precio-cliente-nuevo')).toBeTruthy();

    raiz(f).querySelector('dialog[open] form')!.dispatchEvent(new Event('submit'));
    await asentar(f);
    expect(repo.fijar).not.toHaveBeenCalled();
    expect(raiz(f).querySelector('dialog[open]')!.textContent).toContain('Elige el cliente.');
  });

  it('con el cliente elegido en el diálogo, guarda el acuerdo para ESE cliente', async () => {
    const f = await crear();
    Array.from(raiz(f).querySelectorAll('button')).find((b) => b.textContent!.includes('Nuevo acuerdo'))!.click();
    await asentar(f);

    await elegir(f, 'precio-cliente-nuevo', 1);
    await elegir(f, 'precio-producto', 0);
    const campo = raiz(f).querySelector<HTMLInputElement>('dialog[open] [formcontrolname=precio]')!;
    campo.value = '9500';
    campo.dispatchEvent(new Event('input'));
    await asentar(f);
    raiz(f).querySelector('dialog[open] form')!.dispatchEvent(new Event('submit'));
    await asentar(f);

    expect(repo.fijar).toHaveBeenCalledExactlyOnceWith({ id_cliente: 30, id_producto: 1, precio: 9500 });
  });

  it('«Editar» una fila de la lista general edita ESE acuerdo sin volver a pedir cliente', async () => {
    const f = await crear();
    const editar = Array.from(raiz(f).querySelectorAll<HTMLButtonElement>('tbody button')).filter((b) => b.textContent!.includes('Editar'))[2];
    editar.click();
    await asentar(f);

    const dialogo = raiz(f).querySelector('dialog[open]')!;
    expect(dialogo.textContent).toContain('Cliente: Supermercado El Sol');
    expect(dialogo.querySelector('#precio-cliente-nuevo')).toBeNull();
  });
});
