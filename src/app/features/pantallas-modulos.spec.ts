import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../core/empresa/empresa.models';
import { EmpresaService } from '../core/empresa/empresa.service';
import { crearEmpresaFalsa } from '../core/empresa/testing/empresa-falsa';
import { AuthService } from '../core/services/auth.service';
import { CATALOGOS_REPOSITORY } from './catalogos/data/catalogos.provider';
import { ClienteFormDialogComponent } from './catalogos/clientes/cliente-form-dialog.component';
import { ClientesTabComponent } from './catalogos/clientes/clientes-tab.component';
import { ProveedorFormDialogComponent } from './catalogos/proveedores/proveedor-form-dialog.component';
import { PARAMETROS_REPOSITORY } from './parametros/data/parametros.provider';
import { USUARIOS_REPOSITORY } from './usuarios/data/usuarios.provider';
import { UsuarioFormDialogComponent } from './usuarios/usuario-form-dialog.component';
import { ParametrosPageComponent } from './parametros/parametros-page.component';
import { VENTAS_REPOSITORY } from './ventas/data/ventas.provider';
import { VentasPageComponent } from './ventas/ventas-page.component';

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

const SIN_CREDITO = MODULOS_OPCIONALES.filter((m) => m !== 'CREDITO');
const CLIENTE = { id_cliente: 2, tipo_documento: 'NIT', numero_documento: '900111222', nombre: 'Tienda La Esquina', email: 't@example.com', telefono: '3000000000', direccion: 'Calle 1', limite_credito: 500000, saldo_deudor: 120000, activo: true };
const VENTA = { id_venta: 9, id_cliente: 2, cliente: 'Tienda La Esquina', numero_documento: '900111222', id_periodo: 1, fecha_venta: '2026-10-09T15:42:10', tipo_venta: 'CONTADO', subtotal_venta: 100, total_iva: 19, total_venta: 119, saldo_pendiente: 0, estado_pago: 'PAGADA', usuario_registro: 'ana', fecha_registro: '2026-10-09T15:42:10' };
const pagina = <T>(items: T[]) => ({ items, total: items.length, page: 0, size: 20, total_pages: 1 });

async function montar<T>(componente: Type<T>, activos: readonly CodigoModulo[], proveedores: unknown[] = [], rol: 'ADMIN' | 'OPERATIVO' = 'ADMIN'): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideNgIconLoader(async () => ''),
      { provide: EmpresaService, useValue: crearEmpresaFalsa(activos) },
      { provide: VENTAS_REPOSITORY, useValue: { listar: vi.fn(() => of(pagina([VENTA]))) } },
      { provide: CATALOGOS_REPOSITORY, useValue: { listarClientes: vi.fn(() => of(pagina([CLIENTE]))) } },
      {
        provide: PARAMETROS_REPOSITORY,
        useValue: {
          listar: vi.fn(() =>
            of([
              { clave: 'PLAZO_CREDITO_DIAS', valor: 30, minimo: 0, maximo: 365, descripcion: 'Plazo' },
              { clave: 'IVA_DEFECTO_PORCENTAJE', valor: 19, minimo: 0, maximo: 100, descripcion: 'IVA' },
              { clave: 'TEMP_MAX_LECHE_C', valor: 10, minimo: 0, maximo: 40, descripcion: 'Temperatura' },
              { clave: 'ACIDEZ_MAX_DORNIC', valor: 18, minimo: 0, maximo: 40, descripcion: 'Acidez' },
              { clave: 'PRECIO_LECHE_DEFAULT', valor: 2200, minimo: 0, maximo: 99999, descripcion: 'Precio leche' },
            ]),
          ),
        },
      },
      ...proveedores,
    ],
  });
  TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol, mfa_activo: true });
  const f = TestBed.createComponent(componente);
  for (let i = 0; i < 6; i++) {
    f.detectChanges();
    await f.whenStable();
  }
  return f;
}
const texto = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

describe('Historial de ventas según CREDITO', () => {
  it('con CREDITO: filtro «Tipo», columnas «Saldo pendiente» y estados de deuda', async () => {
    const f = await montar(VentasPageComponent, MODULOS_OPCIONALES);

    expect((f.nativeElement as HTMLElement).querySelector('#ventas-tipo')).not.toBeNull();
    expect(texto(f)).toContain('Saldo pendiente');
    expect(texto(f)).toContain('Pendiente');
    expect(texto(f)).toContain('Castigada');
  });

  it('sin CREDITO: no hay filtro «Tipo», ni columna de saldo, ni estados «Pendiente» o «Castigada»', async () => {
    const f = await montar(VentasPageComponent, SIN_CREDITO);

    expect((f.nativeElement as HTMLElement).querySelector('#ventas-tipo')).toBeNull();
    expect(texto(f)).not.toContain('Saldo pendiente');
    expect(texto(f)).not.toContain('Castigada');
    expect(texto(f)).toContain('Pagada');
    expect(texto(f)).toContain('Tienda La Esquina');
  });
});

describe('Catálogos · Clientes según CREDITO', () => {
  it('con CREDITO: columnas de límite y saldo deudor', async () => {
    const f = await montar(ClientesTabComponent, MODULOS_OPCIONALES);

    expect(texto(f)).toContain('Límite de crédito');
    expect(texto(f)).toContain('Saldo deudor');
  });

  it('sin CREDITO: el límite y la deuda (que el backend sigue mandando) no se muestran', async () => {
    const f = await montar(ClientesTabComponent, SIN_CREDITO);

    expect(texto(f)).not.toContain('Límite de crédito');
    expect(texto(f)).not.toContain('Saldo deudor');
    expect(texto(f)).not.toContain('500.000');
    expect(texto(f)).toContain('Tienda La Esquina');
  });

  it('el formulario pide el límite de crédito solo con CREDITO', async () => {
    for (const [activos, esperado] of [
      [MODULOS_OPCIONALES, true],
      [SIN_CREDITO, false],
    ] as const) {
      TestBed.resetTestingModule();
      const f = await montar(ClienteFormDialogComponent, activos);
      f.componentRef.setInput('abierto', true);
      f.detectChanges();
      await f.whenStable();

      expect((f.nativeElement as HTMLElement).querySelector('[formcontrolname=limite_credito]') !== null).toBe(esperado);
    }
  });
});

describe('Avisos al registrar datos de otras personas (informativos, sin casilla)', () => {
  const casos: [string, Type<unknown>, unknown[]][] = [
    ['cliente', ClienteFormDialogComponent, []],
    ['proveedor', ProveedorFormDialogComponent, []],
    ['usuario', UsuarioFormDialogComponent, [{ provide: USUARIOS_REPOSITORY, useValue: {} }]],
  ];

  it.each(casos)('el formulario de %s avisa que se necesita la autorización previa del titular y enlaza a la política de privacidad', async (_nombre, componente, proveedores) => {
    const f = await montar(componente, MODULOS_OPCIONALES, proveedores);
    (f.componentRef as { setInput(n: string, v: unknown): void }).setInput('abierto', true);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const aviso = (f.nativeElement as HTMLElement).querySelector('[data-testid=aviso-datos-terceros]')!;

    expect(aviso).toBeTruthy();
    expect(aviso.textContent).toMatch(/autorización/);
    expect(aviso.querySelector('a')?.getAttribute('href')).toBe('/legal/politica-privacidad');
    // The backend has nowhere to keep a proof yet, so no checkbox pretends to: only the notice.
    expect(aviso.querySelector('input')).toBeNull();
    expect((f.nativeElement as HTMLElement).querySelector('input[type=checkbox]')).toBeNull();
  });
});

describe('Parámetros según los módulos', () => {
  it('con todos los módulos están el plazo de crédito y los umbrales de calidad', async () => {
    const f = await montar(ParametrosPageComponent, MODULOS_OPCIONALES);

    expect(texto(f)).toContain('Plazo de crédito');
    expect(texto(f)).toContain('Calidad de la leche');
    expect(texto(f)).toContain('Temperatura máxima de la leche');
  });

  it('sin CREDITO no está el plazo de crédito y sin CALIDAD_LECHE desaparece el grupo entero', async () => {
    const f = await montar(
      ParametrosPageComponent,
      MODULOS_OPCIONALES.filter((m) => m !== 'CREDITO' && m !== 'CALIDAD_LECHE'),
    );

    expect(texto(f)).not.toContain('Plazo de crédito');
    expect(texto(f)).not.toContain('Calidad de la leche');
    expect(texto(f)).not.toContain('Acidez máxima');
    expect(texto(f)).toContain('IVA propuesto');
    expect(texto(f)).toContain('Precio de la leche por defecto');
  });

  it('con PARAMETROS se editan: campo y botón «Guardar» por fila, sin la nota de solo consulta', async () => {
    const f = await montar(ParametrosPageComponent, MODULOS_OPCIONALES);
    const el = f.nativeElement as HTMLElement;

    expect(el.querySelectorAll('input[type=number]').length).toBe(5);
    expect(Array.from(el.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Guardar')).toHaveLength(5);
    expect(el.querySelector('[data-testid=parametros-solo-lectura]')).toBeNull();
  });

  it('sin PARAMETROS se siguen leyendo (con su valor) pero en solo lectura: sin campos ni «Guardar», con la nota', async () => {
    const f = await montar(ParametrosPageComponent, MODULOS_OPCIONALES.filter((m) => m !== 'PARAMETROS'));
    const el = f.nativeElement as HTMLElement;

    expect(el.querySelector('input')).toBeNull();
    expect(Array.from(el.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'Guardar')).toHaveLength(0);
    expect(el.querySelector('[data-testid=parametros-solo-lectura]')?.textContent).toContain('los gestiona el administrador del sistema');
    expect(texto(f)).toContain('Plazo de crédito');
    expect(texto(f)).toContain('Valor actual: 30');
  });
});
