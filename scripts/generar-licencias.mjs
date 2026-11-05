#!/usr/bin/env node
// Genera la lista de licencias de las dependencias DE EJECUCIÓN del dashboard (las que van en el build), sin agregar paquetes:
//   - src/app/features/legal/licencias.generadas.ts  → la tabla de la página /legal/licencias
//   - public/licencias-terceros.txt                  → los avisos de licencia completos (MIT/ISC/Apache/OFL exigen conservarlos);
//                                                      `ng build` lo copia al sitio, y la página lo enlaza.
// Uso: npm run licencias   (volver a correrlo cuando cambie package-lock.json)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(raiz, 'package-lock.json'), 'utf8'));

const NOMBRES_LICENCIA = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'license', 'license.md', 'License.md', 'LICENSE-MIT', 'LICENSE-MIT.txt', 'COPYING'];
/** SPDX ids that need no human check; anything else (or a custom license) is marked «verificar». */
const SPDX_CONOCIDAS = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'OFL-1.1', 'MPL-2.0']);

const paquetes = [];
for (const [ruta, datos] of Object.entries(lock.packages ?? {})) {
  if (!ruta.startsWith('node_modules/') || datos.dev || datos.devOptional) continue;
  const dir = join(raiz, ruta);
  const pjPath = join(dir, 'package.json');
  if (!existsSync(pjPath)) continue; // optional package for another platform: not installed here, not in the build
  const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
  const licencia = typeof pj.license === 'string' ? pj.license : pj.license?.type ?? (Array.isArray(pj.licenses) ? pj.licenses.map((l) => l.type).join(' OR ') : 'SIN DATO');
  const archivo = NOMBRES_LICENCIA.map((n) => join(dir, n)).find((f) => existsSync(f));
  paquetes.push({
    nombre: pj.name ?? ruta.slice('node_modules/'.length),
    version: pj.version ?? datos.version ?? '',
    licencia,
    verificar: !SPDX_CONOCIDAS.has(licencia) && !/^\(?[A-Za-z0-9.-]+( (OR|AND) [A-Za-z0-9.-]+)*\)?$/.test(licencia) ? true : !licenciaSimpleConocida(licencia),
    texto: archivo ? readFileSync(archivo, 'utf8').trim() : null,
  });
}
paquetes.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.version.localeCompare(b.version));

function licenciaSimpleConocida(l) {
  return l
    .replace(/[()]/g, '')
    .split(/ (?:OR|AND) /)
    .every((parte) => SPDX_CONOCIDAS.has(parte.trim()));
}

const tabla = paquetes.map(({ nombre, version, licencia, verificar }) => ({ nombre, version, licencia, verificar }));
const ts = `// GENERADO por scripts/generar-licencias.mjs (npm run licencias). No editar a mano.
export interface LicenciaPaquete {
  nombre: string;
  version: string;
  licencia: string;
  /** The license is not a common open source one (or is a custom text): read it before relying on it. */
  verificar: boolean;
}

export const LICENCIAS_GENERADAS: readonly LicenciaPaquete[] = ${JSON.stringify(tabla, null, 2)};
`;
writeFileSync(join(raiz, 'src/app/features/legal/licencias.generadas.ts'), ts);

const txt = [
  'AVISOS DE LICENCIA DE TERCEROS — SILA (dashboard)',
  'Generado por scripts/generar-licencias.mjs. Cada bloque es el texto de licencia que trae el paquete.',
  '',
  ...paquetes.map((p) => `${'='.repeat(78)}\n${p.nombre} ${p.version} — ${p.licencia}\n${'='.repeat(78)}\n${p.texto ?? '(el paquete no trae archivo de licencia; ver su repositorio)'}\n`),
].join('\n');
writeFileSync(join(raiz, 'public/licencias-terceros.txt'), txt);

console.log(`${paquetes.length} paquetes de ejecución; ${paquetes.filter((p) => p.verificar).length} para verificar; ${paquetes.filter((p) => !p.texto).length} sin archivo de licencia.`);
