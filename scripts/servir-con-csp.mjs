#!/usr/bin/env node
/**
 * Sirve el build de producción (dist/) con las cabeceras de seguridad y la CSP de docs/CSP.md,
 * y reenvía /api al backend. Es solo una herramienta de PRUEBA: sirve para recorrer la app
 * buscando violaciones de la política antes de pedirle al servidor web que la aplique. Sin dependencias.
 *
 *   npx ng build
 *   node scripts/servir-con-csp.mjs                       # SILA_EMPRESAS: http://127.0.0.1:4301 → su backend (puerto del registro)
 *   node scripts/servir-con-csp.mjs SILA_PRUEBA_DOS       # esa empresa: http://127.0.0.2:4301 → su backend
 *   node scripts/servir-con-csp.mjs --report-only         # la CSP solo avisa, no bloquea
 *
 * La empresa sale del registro del backend (scripts/empresas.mjs; se niegan LLANOLAT, las inactivas y los puertos 8080/4200).
 * Variables: PUERTO (4301), HOST (el de la empresa), BACKEND y ORIGEN_BACKEND (para forzar otros valores).
 *   ORIGEN_BACKEND: el backend solo acepta /auth/refresh y /auth/logout desde el origen de SU dashboard (el del registro);
 *   como aquí se sirve en otro puerto hay que presentarse con ese origen.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESQUEMA_DEFECTO, ErrorEmpresa, RUTA_REGISTRO, elegirEmpresa, parsearRegistro } from './empresas.mjs';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist/dashboard-app/browser');
let empresa;
try {
  empresa = elegirEmpresa(parsearRegistro(readFileSync(RUTA_REGISTRO, 'utf8')), process.argv.slice(2).find((a) => !a.startsWith('--')) ?? ESQUEMA_DEFECTO);
} catch (error) {
  console.error(`✖ ${error instanceof ErrorEmpresa ? error.message : `No pude leer el registro de empresas (${RUTA_REGISTRO}).`}`);
  process.exit(1);
}
const PUERTO = Number(process.env.PUERTO ?? 4301);
const HOST = process.env.HOST ?? empresa.host;
const BACKEND = new URL(process.env.BACKEND ?? `http://127.0.0.1:${empresa.puertoBackend}`);
const ORIGEN_BACKEND = process.env.ORIGEN_BACKEND ?? empresa.origen;
const SOLO_AVISAR = process.argv.includes('--report-only');

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CABECERAS = {
  [SOLO_AVISAR ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy']: CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(join(RAIZ, 'index.html'))) {
  console.error(`No existe ${RAIZ}/index.html. Ejecuta primero: npx ng build`);
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    // Marca del entorno (solo empresas de prueba), como la da el proxy de `npm run empresa` en desarrollo.
    if (url.pathname === '/entorno.json' && empresa.prueba) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CABECERAS }).end('{"marca":"pruebas"}');
      return;
    }

    // /api → backend (mismo origen para el navegador, como detrás del proxy inverso de producción)
    if (url.pathname.startsWith('/api/')) {
      const cabeceras = { ...req.headers, host: BACKEND.host, origin: ORIGEN_BACKEND };
      const salida = http.request({ hostname: BACKEND.hostname, port: BACKEND.port, path: req.url, method: req.method, headers: cabeceras }, (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      });
      salida.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' }).end('{"code":20999,"message":"Backend no disponible"}');
      });
      req.pipe(salida);
      return;
    }

    // Archivos estáticos; cualquier otra ruta es de la SPA → index.html
    const pedido = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    let archivo = resolve(RAIZ, pedido);
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) {
      res.writeHead(403).end();
      return;
    }
    const esArchivo = existsSync(archivo) && statSync(archivo).isFile();
    if (!esArchivo) archivo = join(RAIZ, 'index.html');
    res.writeHead(200, {
      ...CABECERAS,
      'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      'Cache-Control': extname(archivo) === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    createReadStream(archivo).pipe(res);
  })
  .listen(PUERTO, HOST, () => {
    console.log(`SILA con CSP${SOLO_AVISAR ? ' (solo avisa)' : ''} · ${empresa.esquema}: http://${HOST}:${PUERTO}  →  /api = ${BACKEND.origin}`);
    console.log(`Política: ${CSP}`);
  });
