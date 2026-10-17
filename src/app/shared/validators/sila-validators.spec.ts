import { FormControl, FormGroup } from '@angular/forms';
import { SilaValidators, esDocumentoValido, esSkuValido, limpiarTexto, mensajeDeError } from './sila-validators';

const errores = (validador: ReturnType<typeof SilaValidators.longitud>, valor: unknown) => validador(new FormControl(valor));

describe('SilaValidators', () => {
  it('requerido: vacío, nulo y solo espacios fallan; el cero y el texto pasan', () => {
    for (const malo of [null, undefined, '', '   ']) expect(errores(SilaValidators.requerido, malo)).toEqual({ requerido: true });
    for (const bueno of [0, '0', 'a']) expect(errores(SilaValidators.requerido, bueno)).toBeNull();
  });

  it('longitud: cuenta el texto sin espacios de los bordes y deja pasar lo vacío', () => {
    const v = SilaValidators.longitud(3, 5);
    expect(errores(v, '')).toBeNull();
    expect(errores(v, ' ab ')).toEqual({ longitud: { min: 3, max: 5, actual: 2 } });
    expect(errores(v, 'abcdef')).toEqual({ longitud: { min: 3, max: 5, actual: 6 } });
    expect(errores(v, ' abc ')).toBeNull();
  });

  it('dosDecimales y montoPositivo', () => {
    expect(errores(SilaValidators.dosDecimales, '10.25')).toBeNull();
    expect(errores(SilaValidators.dosDecimales, 10.255)).toEqual({ dosDecimales: true });
    expect(errores(SilaValidators.montoPositivo, 0)).toEqual({ mayorQueCero: true });
    expect(errores(SilaValidators.montoPositivo, -5)).toEqual({ mayorQueCero: true });
    expect(errores(SilaValidators.montoPositivo, '1.234')).toEqual({ dosDecimales: true });
    expect(errores(SilaValidators.montoPositivo, '')).toBeNull();
    expect(errores(SilaValidators.montoPositivo, 0.01)).toBeNull();
  });

  it('rango: incluye los extremos', () => {
    const v = SilaValidators.rango(0, 100);
    expect(errores(v, 0)).toBeNull();
    expect(errores(v, 100)).toBeNull();
    expect(errores(v, 100.01)).toEqual({ rango: { min: 0, max: 100 } });
    expect(errores(v, -1)).toEqual({ rango: { min: 0, max: 100 } });
    expect(errores(v, 1.234)).toEqual({ dosDecimales: true });
  });

  it('claveNueva: 12 caracteres como mínimo y 72 BYTES como máximo (la tilde pesa 2)', () => {
    expect(errores(SilaValidators.claveNueva, '')).toBeNull();
    expect(errores(SilaValidators.claveNueva, 'a'.repeat(11))).toEqual({ claveCorta: true });
    expect(errores(SilaValidators.claveNueva, 'a'.repeat(12))).toBeNull();
    expect(errores(SilaValidators.claveNueva, 'a'.repeat(72))).toBeNull();
    expect(errores(SilaValidators.claveNueva, 'a'.repeat(73))).toEqual({ claveLarga: true });
    expect(errores(SilaValidators.claveNueva, 'á'.repeat(36))).toBeNull();
    expect(errores(SilaValidators.claveNueva, 'á'.repeat(37))).toEqual({ claveLarga: true });
  });

  it('distintaDe e igualA comparan con el control hermano', () => {
    const grupo = new FormGroup({
      actual: new FormControl('una-clave-larga-1'),
      nueva: new FormControl('una-clave-larga-1', SilaValidators.distintaDe('actual')),
      confirmar: new FormControl('otra', SilaValidators.igualA('nueva')),
    });
    grupo.updateValueAndValidity({ emitEvent: false });
    grupo.controls.nueva.updateValueAndValidity();
    grupo.controls.confirmar.updateValueAndValidity();
    expect(grupo.controls.nueva.errors).toEqual({ igualALaActual: true });
    expect(grupo.controls.confirmar.errors).toEqual({ noCoincide: true });
    grupo.controls.nueva.setValue('clave-totalmente-nueva');
    grupo.controls.confirmar.setValue('clave-totalmente-nueva');
    expect(grupo.controls.nueva.errors).toBeNull();
    expect(grupo.controls.confirmar.errors).toBeNull();
  });

  it('nombreUsuario: minúsculas, números y . _ @ -', () => {
    expect(errores(SilaValidators.nombreUsuario, 'ana.perez@x-1')).toBeNull();
    expect(errores(SilaValidators.nombreUsuario, 'Ana')).toEqual({ nombreUsuario: true });
    expect(errores(SilaValidators.nombreUsuario, 'ab')).toEqual({ nombreUsuario: true });
    expect(errores(SilaValidators.nombreUsuario, 'ana perez')).toEqual({ nombreUsuario: true });
  });

  it('sinEspacios, sinBarras y entero', () => {
    expect(errores(SilaValidators.sinEspacios, 'ana perez')).toEqual({ conEspacios: true });
    expect(errores(SilaValidators.sinEspacios, 'ana')).toBeNull();
    expect(errores(SilaValidators.sinBarras, 'a/b')).toEqual({ sinBarras: true });
    expect(errores(SilaValidators.sinBarras, 'a\\b')).toEqual({ sinBarras: true });
    expect(errores(SilaValidators.sinBarras, 'Facturas 2026')).toBeNull();
    expect(errores(SilaValidators.entero, '12')).toBeNull();
    expect(errores(SilaValidators.entero, '-3')).toBeNull();
    expect(errores(SilaValidators.entero, '1.5')).toEqual({ entero: true });
  });

  it('codigoRespaldo acepta guion, espacios y minúsculas', () => {
    expect(errores(SilaValidators.codigoRespaldo, 'abcde-12345')).toBeNull();
    expect(errores(SilaValidators.codigoRespaldo, 'ABCDE 12345')).toBeNull();
    expect(errores(SilaValidators.codigoRespaldo, 'ABCDE-1234')).toEqual({ codigoRespaldo: true });
    expect(errores(SilaValidators.codigoRespaldo, '')).toBeNull();
  });

  it('documento, sku y teléfono (con su versión suelta)', () => {
    expect(errores(SilaValidators.documento, '900123-4')).toBeNull();
    expect(errores(SilaValidators.documento, '12 34')).toEqual({ documento: true });
    expect(errores(SilaValidators.sku, 'QSO-001')).toBeNull();
    expect(errores(SilaValidators.sku, 'qso-001')).toEqual({ sku: true });
    expect(errores(SilaValidators.telefono, '+57 (300) 123-4567')).toBeNull();
    expect(errores(SilaValidators.telefono, '12345')).toEqual({ telefono: true });
    expect(esDocumentoValido(' 900123-4 ')).toBe(true);
    expect(esDocumentoValido('1')).toBe(false);
    expect(esSkuValido('AB')).toBe(false);
  });

  it('motivo: cuenta una vez recortado, y vacío NO pasa', () => {
    const v = SilaValidators.motivo(10);
    expect(errores(v, '')).toEqual({ motivo: { min: 10, max: 255, actual: 0 } });
    expect(errores(v, '   corto   ')).toEqual({ motivo: { min: 10, max: 255, actual: 5 } });
    expect(errores(v, 'un motivo suficiente')).toBeNull();
    expect(errores(v, 'x'.repeat(256))).toEqual({ motivo: { min: 10, max: 255, actual: 256 } });
  });
});

describe('mensajeDeError', () => {
  it('sin errores no hay mensaje', () => {
    expect(mensajeDeError(null)).toBeNull();
  });

  it.each([
    [{ required: true }, 'Este campo es obligatorio.'],
    [{ requerido: true }, 'Este campo es obligatorio.'],
    [{ longitud: { min: 3, max: 5, actual: 2 } }, 'Debe tener entre 3 y 5 caracteres (tiene 2).'],
    [{ mayorQueCero: true }, 'Debe ser mayor que cero.'],
    [{ rango: { min: 0, max: 100 } }, 'Debe estar entre 0 y 100.'],
    [{ servidor: 'Ya existe.' }, 'Ya existe.'],
    [{ cosaRara: true }, 'Valor no válido.'],
  ])('%j → %s', (errs, texto) => {
    expect(mensajeDeError(errs)).toBe(texto);
  });

  it('todas las llaves de error que producen los validadores tienen su mensaje propio', () => {
    const llaves = ['requerido', 'longitud', 'dosDecimales', 'mayorQueCero', 'rango', 'claveCorta', 'claveLarga', 'igualALaActual', 'noCoincide', 'nombreUsuario', 'conEspacios', 'codigoRespaldo', 'entero', 'documento', 'sku', 'telefono', 'sinBarras', 'motivo'];
    for (const llave of llaves) {
      expect(mensajeDeError({ [llave]: { min: 1, max: 2, actual: 3 } }), llave).not.toBe('Valor no válido.');
    }
  });
});

describe('limpiarTexto', () => {
  it('recorta y junta los espacios internos', () => {
    expect(limpiarTexto('  Finca   La \n Pradera ')).toBe('Finca La Pradera');
  });
});
