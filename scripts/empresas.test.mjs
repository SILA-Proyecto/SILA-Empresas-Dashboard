import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESQUEMA_DEFECTO, ErrorEmpresa, elegirEmpresa, generarProxy, parsearRegistro } from './empresas.mjs';

const CABECERA = 'esquema\tnombre\tnombre_corto\tpuerto\torigen\tfecha_alta\tversion_esquema\tprueba\testado';
const fila = (e, nombre, corto, puerto, origen, prueba = 'no', estado = 'activa') => [e, nombre, corto, puerto, origen, '2026-10-18', '30', prueba, estado].join('\t');
const REGISTRO = [
  CABECERA,
  fila('SILA_EMPRESAS', 'SILA Empresas (pruebas)', 'Empresas', '8082', 'http://127.0.0.1:4300'),
  fila('SILA_PRUEBA_DOS', 'Empresa Prueba Dos SAS', 'PruebaDos', '8083', 'http://127.0.0.2:4300', 'si'),
  fila('SILA_APAGADA', 'Apagada SAS', 'Apagada', '8084', 'http://127.0.0.3:4300', 'si', 'suspendida'),
  '',
].join('\n');
const filas = () => parsearRegistro(REGISTRO);
const rechaza = (esquema, texto, registro = filas()) => assert.throws(() => elegirEmpresa(registro, esquema), (e) => e instanceof ErrorEmpresa && texto.test(e.message));

test('lee el registro: una fila por empresa, por nombre de columna', () => {
  assert.equal(filas().length, 3);
  assert.equal(filas()[1].esquema, 'SILA_PRUEBA_DOS');
  assert.equal(filas()[1].puerto, '8083');
});

test('un registro sin alguna columna o vacío se rechaza', () => {
  assert.throws(() => parsearRegistro(''), ErrorEmpresa);
  assert.throws(() => parsearRegistro('esquema\tnombre\nX\tY'), /columnas/);
});

test('empresa válida: host, puertos y origen salen del registro', () => {
  const e = elegirEmpresa(filas(), 'SILA_PRUEBA_DOS');
  assert.deepEqual(e, { esquema: 'SILA_PRUEBA_DOS', nombre: 'Empresa Prueba Dos SAS', nombreCorto: 'PruebaDos', puertoBackend: 8083, host: '127.0.0.2', puertoDashboard: 4300, origen: 'http://127.0.0.2:4300', prueba: true });
});

test('sin argumento es SILA_EMPRESAS (como hasta ahora)', () => {
  const e = elegirEmpresa(filas());
  assert.equal(ESQUEMA_DEFECTO, 'SILA_EMPRESAS');
  assert.equal(e.host, '127.0.0.1');
  assert.equal(e.puertoBackend, 8082);
  assert.equal(e.prueba, false);
});

test('el nombre del esquema no distingue mayúsculas', () => {
  assert.equal(elegirEmpresa(filas(), 'sila_prueba_dos').esquema, 'SILA_PRUEBA_DOS');
});

test('esquema que no está en el registro: se niega y dice cuáles hay', () => rechaza('SILA_NO_EXISTE', /no está en el registro.*SILA_EMPRESAS/));

test('empresa que no está «activa»: se niega', () => rechaza('SILA_APAGADA', /suspendida/));

test('LLANOLAT se niega siempre, esté o no en el registro', () => {
  rechaza('LLANOLAT', /LLANOLAT/);
  rechaza('llanolat', /LLANOLAT/);
  const conLlanolat = parsearRegistro([CABECERA, fila('LLANOLAT', 'Llanolat', 'Llanolat', '8080', 'http://localhost:4200')].join('\n'));
  rechaza('LLANOLAT', /LLANOLAT/, conLlanolat);
});

test('un esquema que contiene LLANOLAT también se niega', () => rechaza('SILA_LLANOLAT_COPIA', /LLANOLAT/));

test('puerto de backend 8080 se niega', () => {
  const r = parsearRegistro([CABECERA, fila('SILA_X', 'X', 'X', '8080', 'http://127.0.0.4:4300')].join('\n'));
  rechaza('SILA_X', /8080/, r);
});

test('puerto de dashboard 4200 se niega', () => {
  const r = parsearRegistro([CABECERA, fila('SILA_X', 'X', 'X', '8085', 'http://127.0.0.4:4200')].join('\n'));
  rechaza('SILA_X', /4200/, r);
});

test('origen que no es http, que no es 127.x o puerto que no es número: se niegan', () => {
  const r = (puerto, origen) => parsearRegistro([CABECERA, fila('SILA_X', 'X', 'X', puerto, origen)].join('\n'));
  rechaza('SILA_X', /http/, r('8085', 'https://127.0.0.4:4300'));
  rechaza('SILA_X', /127\.0\.0\.0\/8/, r('8085', 'http://miempresa.com:4300'));
  rechaza('SILA_X', /dirección válida/, r('8085', 'no es un url'));
  rechaza('SILA_X', /número/, r('80x5', 'http://127.0.0.4:4300'));
});

test('un nombre de esquema con caracteres raros se niega antes de tocar nada', () => {
  rechaza('../../etc/passwd', /no es un nombre de esquema válido/);
  rechaza('SILA X', /no es un nombre de esquema válido/);
});

test('el proxy generado manda /api al backend de la empresa y no lleva secretos', () => {
  const texto = generarProxy(elegirEmpresa(filas(), 'SILA_EMPRESAS'));
  assert.match(texto, /'\/api': \{ target: 'http:\/\/127\.0\.0\.1:8082'/);
  assert.doesNotMatch(texto, /entorno\.json/);
  const codigo = texto.split('\n').filter((l) => !l.startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /password|clave|secret|token|Authorization/i);
});

test('el proxy de una empresa de prueba también contesta /entorno.json con la marca', () => {
  const texto = generarProxy(elegirEmpresa(filas(), 'SILA_PRUEBA_DOS'));
  assert.match(texto, /'\/entorno\.json'/);
  assert.match(texto, /\{"marca":"pruebas"\}/);
  assert.match(texto, /'\/api': \{ target: 'http:\/\/127\.0\.0\.1:8083'/);
});

// ---------- plantilla de nginx por empresa ----------
import { readFileSync } from 'node:fs';
import { renderizarNginx } from './empresas.mjs';

const PLANTILLA = readFileSync(new URL('../deploy/empresas/nginx.empresa.conf.plantilla', import.meta.url), 'utf8');
const nginx = (esquema, opciones = { dominio: 'sila.ejemplo.com', subdominio: 'pruebados' }) => renderizarNginx(PLANTILLA, elegirEmpresa(filas(), esquema), opciones);

test('nginx: el subdominio y el puerto del backend son los de la empresa y no queda ningún marcador', () => {
  const texto = nginx('SILA_PRUEBA_DOS');
  assert.match(texto, /server_name pruebados\.sila\.ejemplo\.com;/);
  assert.match(texto, /proxy_pass http:\/\/127\.0\.0\.1:8083;/);
  assert.doesNotMatch(texto, /\{\{/);
  assert.doesNotMatch(texto, /:8080|:8082/);
});

test('nginx: cada empresa apunta a SU puerto', () => {
  assert.match(nginx('SILA_EMPRESAS', { dominio: 'sila.ejemplo.com', subdominio: 'empresas' }), /proxy_pass http:\/\/127\.0\.0\.1:8082;/);
});

test('nginx: la empresa de prueba sirve la marca; la real contesta 404', () => {
  assert.match(nginx('SILA_PRUEBA_DOS'), /return 200 '\{"marca":"pruebas"\}'/);
  const real = nginx('SILA_EMPRESAS', { dominio: 'sila.ejemplo.com', subdominio: 'empresas' });
  assert.doesNotMatch(real, /"marca"/);
  assert.match(real, /location = \/entorno\.json \{\s+return 404;/);
});

test('nginx: conserva la política de seguridad y todas las empresas sirven el mismo directorio', () => {
  const texto = nginx('SILA_PRUEBA_DOS');
  assert.match(texto, /root \/var\.www\/sila;|root \/var\/www\/sila;/);
  assert.equal((texto.match(/include \/etc\/nginx\/sila\/cabeceras-seguridad\.conf;/g) ?? []).length, 3);
});

test('nginx: dominio o subdominio con basura se niegan (no se cuela nada en el archivo)', () => {
  assert.throws(() => nginx('SILA_PRUEBA_DOS', { dominio: 'sila.ejemplo.com; evil', subdominio: 'x' }), ErrorEmpresa);
  assert.throws(() => nginx('SILA_PRUEBA_DOS', { dominio: 'sila', subdominio: 'x' }), ErrorEmpresa);
  assert.throws(() => nginx('SILA_PRUEBA_DOS', { dominio: 'sila.ejemplo.com', subdominio: 'a b;' }), ErrorEmpresa);
});

test('nginx: una empresa que el registro niega (inactiva, LLANOLAT) no genera configuración', () => {
  assert.throws(() => nginx('SILA_APAGADA'), ErrorEmpresa);
  assert.throws(() => nginx('LLANOLAT'), ErrorEmpresa);
});
