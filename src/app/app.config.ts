import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideNgIconLoader, withCaching } from '@ng-icons/core';
import { routes } from './app.routes';
import { provideDataLayer } from './core/data/data-providers';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { EmpresaService } from './core/empresa/empresa.service';
import { EntornoService } from './core/empresa/entorno.service';
import { TituloPagina } from './core/empresa/titulo-pagina';
import { AuthService } from './core/services/auth.service';
import { SincronizacionPestanas } from './core/session/sincronizacion-pestanas.service';
import { cargarIcono } from './shared/ui/icon/cargar-icono';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useExisting: TituloPagina },
    provideDataLayer(),
    // F5 keeps the session while the HttpOnly refresh cookie is valid; if not, the guard sends the user to /login.
    provideAppInitializer(() => inject(AuthService).restaurarSesion()),
    // Company data and active modules: loaded when a session starts, cleared when it ends.
    provideAppInitializer(() => void inject(EmpresaService)),
    // Mark of the environment («pruebas»), read from /entorno.json without holding the start up.
    provideAppInitializer(() => void inject(EntornoService).cargar()),
    // Signing out in one tab signs out the others.
    provideAppInitializer(() => void inject(SincronizacionPestanas)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Only the icons listed in shared/ui/icon/iconos.ts (about 90 of Lucide's ~1,990), one small lazy chunk per style;
    // `withCaching()` keeps each resolved icon in memory under its full name (`tabler:lucideSearch`), so changing the
    // style redraws the icons without reloading.
    provideNgIconLoader(cargarIcono, withCaching()),
  ],
};
