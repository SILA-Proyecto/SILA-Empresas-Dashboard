import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import type { Page } from '../../../core/api/page.models';
import { ToastService } from '../toast/toast.service';
import { BotonCsvComponent } from './boton-csv.component';

interface Fila {
  nombre: string;
  total: number;
}
const pagina = (items: Fila[], total = items.length): Page<Fila> => ({ items, total, page: 0, size: 100, pages: 1 }) as Page<Fila>;

describe('BotonCsvComponent', () => {
  let guardados: Blob[];
  let nombres: string[];

  beforeEach(() => {
    guardados = [];
    nombres = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      guardados.push(b);
      return 'blob:prueba';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nombres.push(this.download);
    });
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => '')] });
  });
  afterEach(() => vi.restoreAllMocks());

  function crear(cargar: () => Observable<Page<Fila>>): ComponentFixture<BotonCsvComponent<Fila>> {
    const f = TestBed.createComponent<BotonCsvComponent<Fila>>(BotonCsvComponent);
    f.componentRef.setInput('nombre', 'ventas');
    f.componentRef.setInput('columnas', [
      { titulo: 'Nombre', valor: (x: Fila) => x.nombre },
      { titulo: 'Total', valor: (x: Fila) => x.total },
    ]);
    f.componentRef.setInput('cargar', cargar);
    f.detectChanges();
    return f;
  }
  const boton = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('button')!;

  it('descarga todas las filas que pide, con nombre y fecha de hoy, y lo avisa', async () => {
    const exito = vi.spyOn(TestBed.inject(ToastService), 'exito');
    const f = crear(() => of(pagina([{ nombre: 'Doña Rosa', total: 1500.5 }])));
    boton(f).click();

    expect(nombres).toHaveLength(1);
    expect(nombres[0]).toMatch(/^ventas-\d{4}-\d{2}-\d{2}\.csv$/);
    // `text()` drops the BOM when decoding, so the bytes are read: EF BB BF is what makes Excel read the accents as UTF-8.
    const bytes = new Uint8Array(await guardados[0].arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(await guardados[0].text()).toBe('Nombre;Total\r\nDoña Rosa;1500,5\r\n');
    expect(exito).toHaveBeenCalledWith('Archivo listo: 1 fila.');
  });

  it('si hay más filas de las que se pudieron traer, dice cuántas se bajaron de cuántas', () => {
    const exito = vi.spyOn(TestBed.inject(ToastService), 'exito');
    const f = crear(() => of(pagina([{ nombre: 'a', total: 1 }], 2500)));
    boton(f).click();

    expect(exito).toHaveBeenCalledWith(expect.stringContaining('las primeras 1 de 2.500 filas'));
  });

  it('mientras prepara el archivo no deja pedirlo otra vez', () => {
    const respuesta = new Subject<Page<Fila>>();
    const cargar = vi.fn(() => respuesta);
    const f = crear(cargar);
    boton(f).click();
    f.detectChanges();
    boton(f).click();

    expect(cargar).toHaveBeenCalledTimes(1);
    expect(boton(f).disabled).toBe(true);
    expect(boton(f).textContent).toContain('Preparando');

    respuesta.next(pagina([]));
    respuesta.complete();
    f.detectChanges();
    expect(boton(f).disabled).toBe(false);
  });

  it('si falla muestra el error, no guarda nada y deja volver a intentar', () => {
    const error = vi.spyOn(TestBed.inject(ToastService), 'error');
    const f = crear(() => throwError(() => ({ code: 20999, message: 'Error interno del servidor.' })));
    boton(f).click();
    f.detectChanges();

    expect(error).toHaveBeenCalled();
    expect(guardados).toHaveLength(0);
    expect(boton(f).disabled).toBe(false);
  });
});
