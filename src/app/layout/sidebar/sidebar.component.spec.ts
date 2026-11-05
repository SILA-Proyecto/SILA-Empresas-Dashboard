import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgIconLoader } from '@ng-icons/core';
import { MODULOS_OPCIONALES, type CodigoModulo } from '../../core/empresa/empresa.models';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { crearEmpresaFalsa, type EmpresaFalsa } from '../../core/empresa/testing/empresa-falsa';
import { AuthService, type Rol } from '../../core/services/auth.service';
import { EntornoService } from '../../core/empresa/entorno.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent: menú según módulos', () => {
  let empresa: EmpresaFalsa;
  let marcaEntorno: string | null = 'pruebas';

  async function abrir(rol: Rol, activos: readonly CodigoModulo[]): Promise<ComponentFixture<SidebarComponent>> {
    empresa = crearEmpresaFalsa(activos);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideNgIconLoader(async () => ''), { provide: EmpresaService, useValue: empresa }, { provide: EntornoService, useValue: { marca: signal<string | null>(marcaEntorno) } }],
    });
    window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'ana', nombre: 'Ana', email: 'a@example.com', rol, mfa_activo: true });
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const entradas = (f: ComponentFixture<unknown>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.textContent?.trim());

  it('con todos los módulos el ADMIN ve todas las entradas opcionales, como en Llanolat', async () => {
    const f = await abrir('ADMIN', MODULOS_OPCIONALES);

    expect(entradas(f)).toEqual(expect.arrayContaining(['Precios por cliente', 'Cartera', 'Calidad de la leche', 'Archivos', 'Margen de ganancia', 'Auditoría y accesos', 'Resultado por quincena', 'Parámetros']));
  });

  it('cada entrada desaparece cuando se apaga su módulo (y solo esa)', async () => {
    const porModulo: Record<CodigoModulo, string | null> = {
      CREDITO: 'Cartera',
      PRECIOS_CLIENTE: 'Precios por cliente',
      CALIDAD_LECHE: 'Calidad de la leche',
      MARGEN: 'Margen de ganancia',
      ARCHIVOS: 'Archivos',
      ASISTENTE: null,
      AUDITORIA: 'Auditoría y accesos',
      // Parámetros stays: without the module the screen is read only.
      PARAMETROS: null,
      RESULTADO_QUINCENA: 'Resultado por quincena',
    };
    for (const [modulo, etiqueta] of Object.entries(porModulo) as [CodigoModulo, string | null][]) {
      TestBed.resetTestingModule();
      const f = await abrir('ADMIN', MODULOS_OPCIONALES.filter((m) => m !== modulo));
      const lista = entradas(f);

      if (etiqueta) expect(lista, `sin ${modulo}`).not.toContain(etiqueta);
      for (const otra of Object.values(porModulo)) if (otra && otra !== etiqueta) expect(lista, `sin ${modulo}`).toContain(otra);
    }
  });

  it('las entradas del núcleo nunca se ocultan', async () => {
    const f = await abrir('ADMIN', []);

    expect(entradas(f)).toEqual(expect.arrayContaining(['Tablero', 'Punto de venta', 'Historial de ventas', 'Comprobantes', 'Inventario', 'Gastos', 'Catálogos', 'Usuarios', 'Parámetros']));
  });

  it('mientras no han cargado los datos de la empresa no aparece ninguna función opcional', async () => {
    const f = await abrir('ADMIN', []);

    expect(entradas(f)).not.toContain('Cartera');
    expect(entradas(f)).not.toContain('Archivos');
  });

  it('al encender un módulo la entrada aparece sin recargar', async () => {
    const f = await abrir('ADMIN', []);

    empresa.activos.set(['CREDITO']);
    f.detectChanges();

    expect(entradas(f)).toContain('Cartera');
  });

  it('el filtro por módulo se suma al de rol: el OPERATIVO no ve «Margen» aunque el módulo esté activo', async () => {
    const f = await abrir('OPERATIVO', MODULOS_OPCIONALES);

    expect(entradas(f)).not.toContain('Margen de ganancia');
    expect(entradas(f)).toContain('Cartera');
  });

  it('muestra la marca del entorno junto al logo cuando el entorno la trae', async () => {
    const f = await abrir('ADMIN', MODULOS_OPCIONALES);

    expect((f.nativeElement as HTMLElement).textContent).toContain('Entorno de pruebas');
  });

  it('sin marca de entorno (empresa real) no pone ninguna etiqueta', async () => {
    marcaEntorno = null;
    const f = await abrir('ADMIN', MODULOS_OPCIONALES);

    expect((f.nativeElement as HTMLElement).textContent).not.toContain('Entorno de');
    marcaEntorno = 'pruebas';
  });
});
