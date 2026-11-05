// El pie con los enlaces legales debe estar en TODAS las pantallas: el login, la app (shell), la pantalla de aceptación y las
// propias páginas legales. Si alguien agrega otra pantalla fuera del shell, debe agregarla aquí.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const leer = (ruta) => readFileSync(join(app, ruta), 'utf8');

for (const [nombre, ruta] of [
  ['el login', 'features/auth/login-page.component.html'],
  ['la app (shell)', 'layout/shell/dashboard-shell.component.html'],
  ['la pantalla de aceptación', 'features/legal/aceptar-terminos-page.component.ts'],
  ['las páginas legales', 'features/legal/legal-layout.component.ts'],
]) {
  test(`el pie legal está en ${nombre}`, () => {
    assert.match(leer(ruta), /<app-pie-legal/);
  });
}

test('toda pantalla con sesión cuelga del shell (con pie) o es la de aceptación; /legal es público', () => {
  const rutas = leer('app.routes.ts');
  // Top-level routes: login, legal, aceptar-terminos, and the shell (path '') holding everything else.
  assert.match(rutas, /path: 'login'/);
  assert.match(rutas, /path: 'legal'/);
  assert.match(rutas, /path: 'aceptar-terminos'/);
  assert.match(rutas, /component: DashboardShellComponent,\s*canActivate: \[authGuard, legalGuard\],\s*canActivateChild: \[legalGuard\]/);
});
