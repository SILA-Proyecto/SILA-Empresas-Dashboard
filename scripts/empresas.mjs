/**
 * Lee el registro de empresas del backend (SOLO LECTURA) y decide si una empresa se puede servir en desarrollo.
 * Sin dependencias. Lo usan `empresa.mjs` (ng serve por empresa) y `servir-con-csp.mjs`.
 *
 * El registro es `~/sila-empresas-backend/empresas/registro.tsv` (sin secretos). Este código NO lee nada más de esa
 * carpeta (ahí están las credenciales de cada empresa) y NO escribe en ella.
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

export const ESQUEMA_DEFECTO = 'SILA_EMPRESAS';
export const RUTA_REGISTRO = process.env.SILA_REGISTRO ?? join(homedir(), 'sila-empresas-backend', 'empresas', 'registro.tsv');

/** Puertos que son de Llanolat y nunca se sirven ni se usan como backend. */
const PUERTO_BACKEND_LLANOLAT = 8080;
const PUERTO_DASHBOARD_LLANOLAT = 4200;
const COLUMNAS = ['esquema', 'nombre', 'nombre_corto', 'puerto', 'origen', 'fecha_alta', 'version_esquema', 'prueba', 'estado'];

export class ErrorEmpresa extends Error {}

/** TSV → una fila por empresa (objeto por nombre de columna). Falla si falta alguna columna. */
export function parsearRegistro(texto) {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lineas.length === 0) throw new ErrorEmpresa('El registro de empresas está vacío.');
  const cabecera = lineas[0].split('\t').map((c) => c.trim());
  const faltan = COLUMNAS.filter((c) => !cabecera.includes(c));
  if (faltan.length > 0) throw new ErrorEmpresa(`El registro no tiene las columnas: ${faltan.join(', ')}.`);
  return lineas.slice(1).map((linea) => {
    const celdas = linea.split('\t');
    return Object.fromEntries(cabecera.map((c, i) => [c, (celdas[i] ?? '').trim()]));
  });
}

function entero(valor, que) {
  if (!/^\d+$/.test(valor)) throw new ErrorEmpresa(`${que} no es un número: «${valor}».`);
  return Number(valor);
}

/**
 * La empresa `esquema` lista para servir, o un `ErrorEmpresa` que dice por qué no.
 * Se niega: LLANOLAT, lo que no esté en el registro, lo que no esté `activa`, y los puertos 8080 y 4200.
 */
export function elegirEmpresa(filas, esquema = ESQUEMA_DEFECTO) {
  const pedido = String(esquema).trim();
  if (!/^[A-Za-z0-9_]+$/.test(pedido)) throw new ErrorEmpresa(`«${pedido}» no es un nombre de esquema válido.`);
  if (/LLANOLAT/i.test(pedido)) throw new ErrorEmpresa('LLANOLAT no es una empresa de este dashboard (tiene el suyo, en el puerto 4200).');
  const fila = filas.find((f) => f.esquema === pedido.toUpperCase());
  if (!fila) throw new ErrorEmpresa(`«${pedido}» no está en el registro. Hay: ${filas.map((f) => f.esquema).join(', ') || 'ninguna'}.`);
  if (/LLANOLAT/i.test(fila.esquema) || /LLANOLAT/i.test(fila.nombre)) throw new ErrorEmpresa('El registro menciona a LLANOLAT: no se sirve.');
  if (fila.estado !== 'activa') throw new ErrorEmpresa(`${fila.esquema} está «${fila.estado}», no «activa».`);

  const puertoBackend = entero(fila.puerto, `El puerto del backend de ${fila.esquema}`);
  if (puertoBackend === PUERTO_BACKEND_LLANOLAT) throw new ErrorEmpresa('El puerto 8080 es del backend de Llanolat.');

  let origen;
  try {
    origen = new URL(fila.origen);
  } catch {
    throw new ErrorEmpresa(`El origen de ${fila.esquema} no es una dirección válida: «${fila.origen}».`);
  }
  if (origen.protocol !== 'http:') throw new ErrorEmpresa(`El origen de ${fila.esquema} debe ser http:// para desarrollo (es ${origen.protocol}//).`);
  if (!/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(origen.hostname)) throw new ErrorEmpresa(`El host ${origen.hostname} no es de la red local 127.0.0.0/8.`);
  const puertoDashboard = origen.port === '' ? 80 : Number(origen.port);
  if (puertoDashboard === PUERTO_DASHBOARD_LLANOLAT) throw new ErrorEmpresa('El puerto 4200 es del dashboard de Llanolat.');

  return {
    esquema: fila.esquema,
    nombre: fila.nombre,
    nombreCorto: fila.nombre_corto,
    puertoBackend,
    host: origen.hostname,
    puertoDashboard,
    origen: origen.origin,
    prueba: fila.prueba.toLowerCase() === 'si',
  };
}

/**
 * Contenido del proxy temporal (`.empresas/proxy.<ESQUEMA>.mjs`): `/api` → su backend. Si la empresa está marcada como
 * de prueba también contesta `/entorno.json` con la marca. No lleva nada secreto.
 */
export function generarProxy(empresa) {
  const marca = empresa.prueba
    ? `  '/entorno.json': {
    target: 'http://127.0.0.1:${empresa.puertoBackend}',
    bypass: (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end('{"marca":"pruebas"}');
      return false;
    },
  },
`
    : '';
  return `// Generado por scripts/empresa.mjs para ${empresa.esquema}. No se edita ni se versiona; no lleva secretos.
export default {
${marca}  '/api': { target: 'http://127.0.0.1:${empresa.puertoBackend}', secure: false },
};
`;
}

const BLOQUE_ENTORNO_PRUEBA = `  # Empresa de PRUEBA: el dashboard lee esta marca y la muestra (título de la pestaña y etiqueta junto al logo).
  location = /entorno.json {
    default_type application/json;
    add_header Cache-Control "no-store" always;
    return 200 '{"marca":"pruebas"}';
  }
`;
const BLOQUE_ENTORNO_REAL = `  # Empresa real: sin marca de entorno.
  location = /entorno.json {
    return 404;
  }
`;

/**
 * Rellena la plantilla de nginx de una empresa (solo texto: no instala ni recarga nada).
 * `dominio` es el dominio base (p. ej. «sila.ejemplo.com»); `subdominio` es el nombre de la empresa en él.
 */
export function renderizarNginx(plantilla, empresa, { dominio, subdominio }) {
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(dominio ?? '') || !dominio.includes('.')) throw new ErrorEmpresa(`«${dominio}» no es un dominio válido (ejemplo: sila.ejemplo.com).`);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdominio ?? '')) throw new ErrorEmpresa(`«${subdominio}» no es un subdominio válido (letras minúsculas, números y guiones).`);
  const valores = {
    ESQUEMA: empresa.esquema,
    NOMBRE: empresa.nombre,
    SUBDOMINIO: subdominio,
    DOMINIO: dominio,
    PUERTO_BACKEND: String(empresa.puertoBackend),
    BLOQUE_ENTORNO: empresa.prueba ? BLOQUE_ENTORNO_PRUEBA : BLOQUE_ENTORNO_REAL,
  };
  return plantilla.replace(/\{\{([A-Z_]+)\}\}/g, (_todo, clave) => {
    if (!(clave in valores)) throw new ErrorEmpresa(`La plantilla usa {{${clave}}}, que no conozco.`);
    return valores[clave];
  });
}
