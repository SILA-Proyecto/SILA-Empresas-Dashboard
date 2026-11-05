import { VisorArchivosComponent } from '../../features/archivos/visor-archivos.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsistenteBurbujaComponent } from '../../features/asistente/asistente-burbuja.component';
import { RouterOutlet } from '@angular/router';
import { EmpresaService } from '../../core/empresa/empresa.service';
import { InactividadService } from '../../core/session/inactividad.service';
import { AvisoInactividadComponent } from './aviso-inactividad.component';
import { AvisoRespaldoComponent } from './aviso-respaldo.component';
import { PieLegalComponent } from '../../shared/ui/pie-legal/pie-legal.component';
import { ToastHostComponent } from '../../shared/ui/toast/toast-host.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarStateService } from '../services/sidebar-state.service';
import { ThemeCustomizerComponent } from '../theme-customizer/theme-customizer.component';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsistenteBurbujaComponent, VisorArchivosComponent, PieLegalComponent, RouterOutlet, AvisoInactividadComponent, AvisoRespaldoComponent, ToastHostComponent, SidebarComponent, HeaderComponent, ThemeCustomizerComponent],
  templateUrl: './dashboard-shell.component.html',
})
export class DashboardShellComponent {
  protected readonly sidebarState = inject(SidebarStateService);
  /** The assistant bubble exists only for companies with the assistant module. */
  protected readonly empresa = inject(EmpresaService);

  /** Moves the focus only: a plain `#main-content` link would reload the app (the page has `<base href="/">`). */
  protected saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
