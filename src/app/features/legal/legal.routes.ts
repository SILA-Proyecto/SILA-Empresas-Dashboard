import { Routes } from '@angular/router';
import { LegalLayoutComponent } from './legal-layout.component';

/** Public legal pages (no session): the login links to them. Each one carries its version and the «borrador» legend. */
export const LEGAL_ROUTES: Routes = [
  {
    path: '',
    component: LegalLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./legal-indice-page.component').then((m) => m.LegalIndicePageComponent), title: 'Información legal · SILA' },
      { path: 'terminos', data: { documento: 'TERMINOS' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Términos y condiciones · SILA' },
      { path: 'politica-privacidad', data: { documento: 'PRIVACIDAD' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Política de privacidad · SILA' },
      { path: 'cookies', data: { documento: 'COOKIES' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Cookies · SILA' },
      { path: 'derechos-y-pqr', data: { documento: 'DERECHOS' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Derechos y PQR · SILA' },
      { path: 'ia', data: { documento: 'IA' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Aviso de IA · SILA' },
      { path: 'drive', data: { documento: 'DRIVE' }, loadComponent: () => import('./legal-documento-page.component').then((m) => m.LegalDocumentoPageComponent), title: 'Aviso de Google Drive · SILA' },
      { path: 'licencias', loadComponent: () => import('./licencias-page.component').then((m) => m.LicenciasPageComponent), title: 'Licencias · SILA' },
      { path: '**', redirectTo: '' },
    ],
  },
];
