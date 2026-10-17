import { Observable, of } from 'rxjs';
import type { Page } from './page.models';
import { todasLasPaginas } from './todas-las-paginas';

/** A fake listing of `total` numbers, served in pages like the API does (size 1–100). */
function listado(total: number) {
  const pedidos: { page: number; size: number }[] = [];
  const pedir = ({ page, size }: { page: number; size: number }): Observable<Page<number>> => {
    pedidos.push({ page, size });
    const items = Array.from({ length: total }, (_, i) => i).slice(page * size, (page + 1) * size);
    return of({ items, total, page, size });
  };
  return { pedir, pedidos };
}
const leer = (o: Observable<Page<number>>) => {
  let r!: Page<number>;
  o.subscribe((v) => (r = v));
  return r;
};

describe('todasLasPaginas', () => {
  it('con una sola página pide una vez', () => {
    const { pedir, pedidos } = listado(40);
    const r = leer(todasLasPaginas(pedir));
    expect(r.items).toHaveLength(40);
    expect(pedidos).toEqual([{ page: 0, size: 100 }]);
  });

  it('con más de 100 filas trae el resto (el proveedor 101 también se puede elegir) y en orden', () => {
    const { pedir, pedidos } = listado(250);
    const r = leer(todasLasPaginas(pedir));
    expect(r.items).toHaveLength(250);
    expect(r.items[100]).toBe(100);
    expect(r.items[249]).toBe(249);
    expect(r.total).toBe(250);
    expect(pedidos.map((p) => p.page)).toEqual([0, 1, 2]);
  });

  it('un tope de seguridad corta la lista pero el total sigue siendo el real', () => {
    const { pedir } = listado(450);
    const r = leer(todasLasPaginas(pedir, 2));
    expect(r.items).toHaveLength(200);
    expect(r.total).toBe(450);
  });

  it('sin filas, una sola petición', () => {
    const { pedir, pedidos } = listado(0);
    expect(leer(todasLasPaginas(pedir)).items).toEqual([]);
    expect(pedidos).toHaveLength(1);
  });
});
