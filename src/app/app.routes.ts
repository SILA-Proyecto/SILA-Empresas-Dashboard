import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { legalGuard } from './core/legal/legal.guard';
import { DashboardShellComponent } from './layout/shell/dashboard-shell.component';

/**
 * Each screen of the map is added here as it is built. Until then the menu
 * shows it as "Pronto" and it has no route.
 * `/login` is public and has no shell; everything else needs a session.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
    title: 'Iniciar sesión · SILA',
  },
  // Public (no session): the legal texts are read from the login too.
  {
    path: 'legal',
    loadChildren: () => import('./features/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
  },
  // With a session but WITHOUT the shell: no menu, no business routes until the terms are accepted.
  {
    path: 'aceptar-terminos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/legal/aceptar-terminos-page.component').then((m) => m.AceptarTerminosPageComponent),
    title: 'Aceptar términos · SILA',
  },
  {
    path: '',
    component: DashboardShellComponent,
    canActivate: [authGuard, legalGuard],
    canActivateChild: [legalGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tablero' },
      {
        path: 'resultado-quincena',
        loadChildren: () => import('./features/resultado-quincena/resultado-quincena.routes').then((m) => m.RESULTADO_QUINCENA_ROUTES),
      },
      {
        path: 'tablero',
        loadChildren: () => import('./features/tablero/tablero.routes').then((m) => m.TABLERO_ROUTES),
      },
      {
        path: 'catalogos',
        loadChildren: () => import('./features/catalogos/catalogos.routes').then((m) => m.CATALOGOS_ROUTES),
      },
      {
        path: 'periodos',
        loadChildren: () => import('./features/periodos/periodos.routes').then((m) => m.PERIODOS_ROUTES),
      },
      {
        path: 'ventas',
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
      },
      {
        path: 'precios-cliente',
        loadChildren: () => import('./features/precios-cliente/precios-cliente.routes').then((m) => m.PRECIOS_CLIENTE_ROUTES),
      },
      {
        path: 'cartera',
        loadChildren: () => import('./features/cartera/cartera.routes').then((m) => m.CARTERA_ROUTES),
      },
      {
        path: 'parametros',
        loadChildren: () => import('./features/parametros/parametros.routes').then((m) => m.PARAMETROS_ROUTES),
      },
      {
        path: 'acopio',
        loadChildren: () => import('./features/acopio/acopio.routes').then((m) => m.ACOPIO_ROUTES),
      },
      {
        path: 'cuentas-proveedores',
        loadChildren: () => import('./features/cuentas-proveedores/cuentas-proveedores.routes').then((m) => m.CUENTAS_PROVEEDORES_ROUTES),
      },
      {
        path: 'produccion',
        loadChildren: () => import('./features/produccion/produccion.routes').then((m) => m.PRODUCCION_ROUTES),
      },
      {
        path: 'notificaciones',
        loadChildren: () => import('./features/notificaciones/notificaciones.routes').then((m) => m.NOTIFICACIONES_ROUTES),
      },
      {
        path: 'comprobantes',
        loadChildren: () => import('./features/comprobantes/comprobantes.routes').then((m) => m.COMPROBANTES_ROUTES),
      },
      {
        path: 'gastos',
        loadChildren: () => import('./features/gastos/gastos.routes').then((m) => m.GASTOS_ROUTES),
      },
      {
        path: 'reportes',
        loadChildren: () => import('./features/reportes/reportes.routes').then((m) => m.REPORTES_ROUTES),
      },
      {
        path: 'archivos',
        loadChildren: () => import('./features/archivos/archivos.routes').then((m) => m.ARCHIVOS_ROUTES),
      },
      {
        path: 'insumos',
        loadChildren: () => import('./features/insumos/insumos.routes').then((m) => m.INSUMOS_ROUTES),
      },
      {
        path: 'inventario',
        loadChildren: () => import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./features/usuarios/usuarios.routes').then((m) => m.USUARIOS_ROUTES),
      },
      {
        path: 'empresa',
        loadChildren: () => import('./features/empresa/empresa.routes').then((m) => m.EMPRESA_ROUTES),
      },
      {
        path: 'auditoria',
        loadChildren: () => import('./features/auditoria/auditoria.routes').then((m) => m.AUDITORIA_ROUTES),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./features/auth/cuenta-page.component').then((m) => m.CuentaPageComponent),
        title: 'Mi cuenta · SILA',
      },
      { path: '**', redirectTo: 'tablero' },
    ],
  },
];
