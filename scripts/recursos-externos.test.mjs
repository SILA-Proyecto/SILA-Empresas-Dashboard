// La política de cookies dice «no hay analítica, publicidad ni recursos de terceros». Si alguien agrega una fuente, un script,
// una hoja de estilos o una imagen de otro sitio, esta prueba falla: hay que revisar esa página (y probablemente pedir consentimiento).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');
const leer = (ruta) => readFileSync(join(src, ruta), 'utf8');

// Todo lo que hace que el navegador DESCARGUE algo: `src`, `href` de hojas de estilo o precargas, `url()`, `@import`.
const EXTERNOS = /(?:<(?:script|img|iframe|link|source|video|audio)\b[^>]*\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\/|@import\s+(?:url\()?\s*["']?\s*(?:https?:)?\/\/)/i;

function archivos(dir, patron) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivos(ruta, patron);
    return patron.test(e.name) && !e.name.endsWith('.spec.ts') ? [ruta] : [];
  });
}

test('index.html no carga nada de otros sitios', () => {
  assert.doesNotMatch(leer('index.html'), EXTERNOS);
});

test('los estilos no cargan fuentes ni imágenes de otros sitios', () => {
  assert.doesNotMatch(leer('styles.css'), EXTERNOS);
  assert.doesNotMatch(leer('styles.css'), /fonts\.(googleapis|gstatic)\.com/);
});

test('las fuentes están en el propio sitio', () => {
  assert.ok(readdirSync(join(raiz, 'public', 'fonts')).length > 0);
});

test('ningún componente ni plantilla de la app carga <script>, <img>, <iframe> o <link> de otro sitio', () => {
  const malos = archivos(join(src, 'app'), /\.(ts|html)$/).filter((a) => EXTERNOS.test(readFileSync(a, 'utf8')));
  assert.deepEqual(malos, []);
});

test('el contenido legal es texto: no usa innerHTML ni bypassSecurityTrust', () => {
  const dir = join(src, 'app', 'features', 'legal');
  for (const f of archivos(dir, /\.ts$/).filter((a) => !a.endsWith('.generadas.ts'))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /innerHTML|bypassSecurityTrust|outerHTML|insertAdjacentHTML/, f);
  }
});

test('las páginas legales sin sesión no tienen guards de sesión', () => {
  const rutas = readFileSync(join(src, 'app', 'app.routes.ts'), 'utf8');
  const bloque = rutas.slice(rutas.indexOf("path: 'legal'"), rutas.indexOf("path: 'aceptar-terminos'"));
  assert.doesNotMatch(bloque, /canActivate/);
  assert.match(readFileSync(join(src, 'app', 'features', 'legal', 'legal.routes.ts'), 'utf8'), /LegalLayoutComponent/);
});
