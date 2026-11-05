import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { crearEmpresaFalsa } from '../../core/empresa/testing/empresa-falsa';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../../core/empresa/empresa.models';
import { CATALOGOS_REPOSITORY } from '../catalogos/data/catalogos.provider';
import { PARAMETROS_REPOSITORY } from '../parametros/data/parametros.provider';
import { VENTAS_REPOSITORY } from './data/ventas.provider';
import { PuntoVentaPageComponent } from './punto-venta-page.component';

const CONSUMIDOR = { id_cliente: 1, tipo_documento: 'CC', numero_documento: '222222222222', nombre: 'CONSUMIDOR FINAL', email: '', telefono: '', direccion: '', limite_credito: 0, saldo_deudor: 0, activo: true };
const PRODUCTO = { id_producto: 3, codigo_sku: 'QSO', producto: 'Queso', unidad_medida: 'KG', tarifa_iva: 19, stock_actual: 100, precio_base: 10, precio_pactado: 8, precio_aplicable: 10 };

describe('PuntoVentaPageComponent según los módulos de la empresa', () => {
  async function abrir(activos: readonly CodigoModulo[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNgIconLoader(async () => ''),
        { provide: EmpresaService, useValue: crearEmpresaFalsa(activos) },
        { provide: VENTAS_REPOSITORY, useValue: { precios: vi.fn(() => of({ items: [PRODUCTO], total: 1, page: 0, size: 30 })), crear: vi.fn() } },
        { provide: CATALOGOS_REPOSITORY, useValue: { listarClientes: vi.fn(() => of({ items: [CONSUMIDOR], total: 1, page: 0, size: 20 })) } },
        { provide: PARAMETROS_REPOSITORY, useValue: { listar: vi.fn(() => of([])) } },
      ],
    });
    const fixture: ComponentFixture<PuntoVentaPageComponent> = TestBed.createComponent(PuntoVentaPageComponent);
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return fixture.nativeElement as HTMLElement;
  }

  const botones = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('con todos los módulos: ofrece Contado y Crédito, muestra el cupo y el precio pactado', async () => {
    const raiz = await abrir(MODULOS_OPCIONALES);

    expect(botones(raiz)).toContain('Crédito');
    expect(raiz.querySelector('[data-testid="cupo-cliente"]')).not.toBeNull();
    expect(raiz.textContent).toContain('Precio pactado');
  });

  it('sin CREDITO: no hay opción «Crédito», ni cupo, ni «Registrar crédito»; solo se cobra de contado', async () => {
    const raiz = await abrir(MODULOS_OPCIONALES.filter((m) => m !== 'CREDITO'));

    expect(botones(raiz)).not.toContain('Crédito');
    expect(raiz.textContent).not.toContain('Tipo de venta');
    expect(raiz.querySelector('[data-testid="cupo-cliente"]')).toBeNull();
    expect(raiz.querySelector('[data-testid="motivo-sin-credito"]')).toBeNull();
    expect(raiz.textContent).not.toContain('Registrar crédito');
  });

  it('sin PRECIOS_CLIENTE: no se anuncia ningún precio pactado aunque el producto lo traiga', async () => {
    const raiz = await abrir(MODULOS_OPCIONALES.filter((m) => m !== 'PRECIOS_CLIENTE'));

    expect(raiz.textContent).not.toContain('Precio pactado');
    expect(botones(raiz)).toContain('Crédito');
  });
});
