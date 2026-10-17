import { VisorArchivosComponent } from '../../features/archivos/visor-archivos.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsistenteBurbujaComponent } from '../../features/asistente/asistente-burbuja.component';
import { RouterOutlet } from '@angular/router';
import { InactividadService } from '../../core/session/inactividad.service';
import { AvisoInactividadComponent } from './aviso-inactividad.component';
import { AvisoRespaldoComponent } from './aviso-respaldo.component';
import { ToastHostComponent } from '../../shared/ui/toast/toast-host.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarStateService } from '../services/sidebar-state.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsistenteBurbujaComponent, VisorArchivosComponent, RouterOutlet, AvisoInactividadComponent, AvisoRespaldoComponent, ToastHostComponent, SidebarComponent, HeaderComponent],
  templateUrl: './dashboard-shell.component.html',
})
export class DashboardShellComponent {
  protected readonly sidebarState = inject(SidebarStateService);

  /** Moves the focus only: a plain `#main-content` link would reload the app (the page has `<base href="/">`). */
  protected saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
