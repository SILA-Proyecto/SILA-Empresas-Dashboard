#!/usr/bin/env node
/**
 * Imprime (en pantalla) la configuración de nginx de UNA empresa, lista para copiar al servidor. No instala nada.
 *
 *   node scripts/nginx-empresa.mjs SILA_PRUEBA_DOS --dominio sila.ejemplo.com                      # → pruebados.sila.ejemplo.com
 *   node scripts/nginx-empresa.mjs SILA_PRUEBA_DOS --dominio sila.ejemplo.com --subdominio dos > sila-dos.conf
 *
 * Lee el registro del backend (solo lectura). El subdominio por defecto es el nombre corto de la empresa en minúsculas.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorEmpresa, RUTA_REGISTRO, elegirEmpresa, parsearRegistro, renderizarNginx } from './empresas.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function valor(args, nombre) {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

try {
  const args = process.argv.slice(2);
  const esquema = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  if (!esquema || !valor(args, '--dominio')) throw new ErrorEmpresa('Uso: node scripts/nginx-empresa.mjs <ESQUEMA> --dominio <dominio> [--subdominio <nombre>]');
  const empresa = elegirEmpresa(parsearRegistro(readFileSync(RUTA_REGISTRO, 'utf8')), esquema);
  const subdominio = valor(args, '--subdominio') ?? empresa.nombreCorto.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const plantilla = readFileSync(join(RAIZ, 'deploy', 'empresas', 'nginx.empresa.conf.plantilla'), 'utf8');
  process.stdout.write(renderizarNginx(plantilla, empresa, { dominio: valor(args, '--dominio'), subdominio }));
} catch (error) {
  if (!(error instanceof ErrorEmpresa)) throw error;
  console.error(`✖ ${error.message}`);
  process.exit(1);
}
