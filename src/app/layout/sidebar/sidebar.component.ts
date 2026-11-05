import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { EntornoService } from '../../core/empresa/entorno.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { LogoEmpresaComponent } from '../../shared/ui/logo-empresa/logo-empresa.component';
import { SidebarStateService } from '../services/sidebar-state.service';
import type { CodigoModulo } from '../../core/empresa/empresa.models';
import { SIDEBAR_NAV_GROUPS } from './sidebar-nav.data';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, AvatarComponent, IconComponent, LogoEmpresaComponent],
  templateUrl: './sidebar.component.html',
  host: { class: 'contents' },
})
export class SidebarComponent {
  protected readonly sidebarState = inject(SidebarStateService);

  private readonly auth = inject(AuthService);
  private readonly empresa = inject(EmpresaService);
  private readonly router = inject(Router);

  /** «pruebas» when this is a test company (from `/entorno.json`); `null` = no tag. */
  protected readonly marcaEntorno = inject(EntornoService).marca;

  /** Short name of the company («SILA» until it loads). */
  protected readonly nombreCorto = computed(() => this.empresa.nombreCorto() ?? 'SILA');

  protected readonly sesion = computed(() => this.auth.sesion());

  /** Groups and items the current role may see. */
  protected readonly groups = computed(() => {
    this.auth.rol();
    const permitido = (rol?: 'ADMIN' | 'OPERATIVO') => !rol || this.auth.hasRole(rol);
    // Items of a module that is off for the company are not listed (and none until the company data has loaded).
    const conModulo = (modulo?: CodigoModulo) => !modulo || this.empresa.activo(modulo);
    return SIDEBAR_NAV_GROUPS.filter((group) => permitido(group.rol))
      .map((group) => ({ ...group, items: group.items.filter((item) => permitido(item.rol) && conModulo(item.modulo)) }))
      .filter((group) => group.items.length > 0);
  });

  private readonly collapsedGroups = signal(new Set<string>());

  protected isGroupCollapsed(label: string): boolean {
    return this.collapsedGroups().has(label);
  }

  protected toggleGroup(label: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    this.collapsedGroups.set(next);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion().subscribe(() => void this.router.navigate(['/login']));
  }
}
