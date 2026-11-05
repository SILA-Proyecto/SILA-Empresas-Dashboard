#!/usr/bin/env node
/**
 * Sirve el dashboard (ng serve) para UNA empresa del registro del backend: su host y puerto, y su backend.
 *
 *   npm run empresa                            # SILA_EMPRESAS  → http://127.0.0.1:4300  → backend 8082
 *   npm run empresa -- SILA_PRUEBA_DOS         # → http://127.0.0.2:4300  → backend 8083
 *   npm run empresa -- SILA_PRUEBA_DOS --comprobar   # solo muestra qué haría (no arranca nada)
 *   npm run empresa:parar -- SILA_PRUEBA_DOS   # detiene SOLO el ng serve de esa empresa (por host:puerto, nunca por nombre)
 *
 * Cada empresa necesita su propio host (127.0.0.1, 127.0.0.2…) porque la cookie de renovación no distingue puertos.
 * Es el MISMO código para todas: lo propio de cada empresa (nombre, módulos) lo da el backend en /empresa.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESQUEMA_DEFECTO, ErrorEmpresa, RUTA_REGISTRO, elegirEmpresa, generarProxy, parsearRegistro } from './empresas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CARPETA_PROXY = join(RAIZ, '.empresas');

function cargarEmpresa(esquema) {
  if (!existsSync(RUTA_REGISTRO)) throw new ErrorEmpresa(`No encuentro el registro de empresas: ${RUTA_REGISTRO}`);
  return elegirEmpresa(parsearRegistro(readFileSync(RUTA_REGISTRO, 'utf8')), esquema);
}

/** PID que escucha en host:puerto (o `null`). Solo mira sockets en escucha de ESE host y puerto. */
function pidEscuchando(host, puerto) {
  const salida = spawnSync('ss', ['-ltnpH'], { encoding: 'utf8' }).stdout ?? '';
  for (const linea of salida.split('\n')) {
    const columnas = linea.trim().split(/\s+/);
    const local = columnas[3] ?? '';
    if (local === `${host}:${puerto}` || local === `[::ffff:${host}]:${puerto}`) {
      const coincide = /pid=(\d+)/.exec(linea);
      return coincide ? Number(coincide[1]) : 0;
    }
  }
  return null;
}

function parar(empresa) {
  const pid = pidEscuchando(empresa.host, empresa.puertoDashboard);
  if (pid === null) return console.log(`Nada escucha en ${empresa.host}:${empresa.puertoDashboard}: ${empresa.esquema} ya está detenida.`);
  if (pid === 0) throw new ErrorEmpresa(`Algo escucha en ${empresa.host}:${empresa.puertoDashboard} pero no puedo ver su PID (¿es de otro usuario?). No lo toco.`);
  // Solo se detiene un proceso que corre desde ESTA carpeta: así nunca se toca el dashboard de Llanolat.
  let carpeta = '';
  try {
    carpeta = readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    // sin permiso: se trata como ajeno
  }
  if (carpeta !== RAIZ) throw new ErrorEmpresa(`El proceso ${pid} que escucha en ${empresa.host}:${empresa.puertoDashboard} no corre desde ${RAIZ}. No lo toco.`);
  process.kill(pid, 'SIGTERM');
  console.log(`Detenido ${empresa.esquema} (PID ${pid}, ${empresa.host}:${empresa.puertoDashboard}).`);
}

function servir(empresa, soloComprobar) {
  const ocupado = pidEscuchando(empresa.host, empresa.puertoDashboard);
  if (ocupado !== null) throw new ErrorEmpresa(`${empresa.host}:${empresa.puertoDashboard} ya está en uso (PID ${ocupado || 'desconocido'}).`);
  mkdirSync(CARPETA_PROXY, { recursive: true });
  const proxy = join(CARPETA_PROXY, `proxy.${empresa.esquema}.mjs`);
  writeFileSync(proxy, generarProxy(empresa), 'utf8');

  console.log(`${empresa.esquema} («${empresa.nombre}»${empresa.prueba ? ', de prueba' : ''})`);
  console.log(`  dashboard: ${empresa.origen}   →   /api = http://127.0.0.1:${empresa.puertoBackend}`);
  console.log(`  proxy:     ${proxy}`);
  if (soloComprobar) return;

  const ng = join(RAIZ, 'node_modules', '.bin', 'ng');
  const hijo = spawn(ng, ['serve', '--host', empresa.host, '--port', String(empresa.puertoDashboard), '--proxy-config', proxy], { cwd: RAIZ, stdio: 'inherit' });
  for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => hijo.kill(senal));
  hijo.on('exit', (codigo) => process.exit(codigo ?? 0));
}

try {
  const args = process.argv.slice(2);
  const esquema = args.find((a) => !a.startsWith('--')) ?? ESQUEMA_DEFECTO;
  const empresa = cargarEmpresa(esquema);
  if (args.includes('--parar')) parar(empresa);
  else servir(empresa, args.includes('--comprobar'));
} catch (error) {
  if (!(error instanceof ErrorEmpresa)) throw error;
  console.error(`✖ ${error.message}`);
  process.exit(1);
}
