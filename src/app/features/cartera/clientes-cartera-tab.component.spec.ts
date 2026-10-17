import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { of } from 'rxjs';
import { AuthService, Rol } from '../../core/services/auth.service';
import { ClientesCarteraTabComponent } from './clientes-cartera-tab.component';
import { CARTERA_REPOSITORY } from './data/cartera.provider';

const CLIENTE = { id_cliente: 5, cliente: 'Doña Rosa', telefono: '300', limite_credito: 1000, saldo_deudor: 500, cupo_disponible: 500, dias_mora: 0, estado_credito: 'VIGENTE' };

describe('ClientesCarteraTabComponent · castigar', () => {
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

  let repoClientes: ReturnType<typeof vi.fn>;

  async function crear(rol: Rol, clientes: unknown[] = [CLIENTE]): Promise<ComponentFixture<ClientesCarteraTabComponent>> {
    repoClientes = vi.fn(() => of({ items: clientes, total: clientes.length, page: 0, size: 10 }));
    TestBed.configureTestingModule({
      providers: [
        provideNgIconLoader(async () => ''),
        {
          provide: CARTERA_REPOSITORY,
          useValue: {
            clientes: repoClientes,
            resumen: vi.fn(() => of({ total_cartera: 500, clientes_con_deuda: 1, clientes_en_mora: 0, cartera_vencida: 0 })),
            ventasPendientes: vi.fn(() => of([])),
          },
        },
      ],
    });
    TestBed.inject(AuthService).sesion.set({ id_usuario: 1, usuario: 'prueba', nombre: 'Prueba', email: 'p@example.com', rol, mfa_activo: false });
    const fixture = TestBed.createComponent(ClientesCarteraTabComponent);
    for (let i = 0; i < 6; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return fixture;
  }

  it('«¿Desde hace cuánto me deben?» reparte la deuda por atraso y tocar un grupo filtra la lista', async () => {
    const f = await crear('ADMIN', [CLIENTE, { ...CLIENTE, id_cliente: 6, cliente: 'Tienda Sol', saldo_deudor: 900, dias_mora: 40, estado_credito: 'EN_MORA' }]);
    const raiz = f.nativeElement as HTMLElement;
    const texto = (id: string) => (raiz.querySelector(`[data-testid=${id}]`)?.textContent ?? '').replace(/\s+/g, ' ');

    expect(texto('edad-SIN_VENCER')).toContain('500');
    expect(texto('edad-SIN_VENCER')).toContain('1 cliente');
    expect(texto('edad-DE_31_A_60')).toContain('900');

    repoClientes.mockClear();
    raiz.querySelector<HTMLButtonElement>('[data-testid=edad-DE_31_A_60]')!.click();
    for (let i = 0; i < 4; i++) {
      f.detectChanges();
      await f.whenStable();
    }
    expect(repoClientes).toHaveBeenCalledWith(expect.objectContaining({ mora_minima: 31, sort: 'dias_mora,desc' }));
  });

  const botones = (f: ComponentFixture<unknown>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('tbody button')).map((b) => b.textContent!.trim());

  it('un ADMIN ve «Dar por perdida la deuda»', async () => {
    expect(botones(await crear('ADMIN')).some((t) => t.startsWith('Dar por perdida la deuda'))).toBe(true);
  });

  it('un OPERATIVO NO ve «Dar por perdida la deuda», pero sí registrar abono', async () => {
    const textos = botones(await crear('OPERATIVO'));
    expect(textos.some((t) => t.startsWith('Dar por perdida la deuda'))).toBe(false);
    expect(textos.some((t) => t.startsWith('Registrar abono'))).toBe(true);
  });
});
