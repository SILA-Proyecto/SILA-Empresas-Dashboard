import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { EmpresaService } from './empresa.service';
import { EntornoService } from './entorno.service';
import { TituloPagina } from './titulo-pagina';

describe('TituloPagina', () => {
  const nombreCorto = signal<string | null>(null);
  const marca = signal<string | null>('pruebas');
  let estrategia: TituloPagina;
  let pestana: Title;

  beforeEach(() => {
    nombreCorto.set(null);
    marca.set('pruebas');
    TestBed.configureTestingModule({ providers: [{ provide: EmpresaService, useValue: { nombreCorto } }, { provide: EntornoService, useValue: { marca } }] });
    estrategia = TestBed.inject(TituloPagina);
    pestana = TestBed.inject(Title);
    vi.spyOn(estrategia, 'buildTitle').mockReturnValue('Cartera · SILA');
  });

  const ir = () => {
    estrategia.updateTitle({} as RouterStateSnapshot);
    TestBed.tick();
  };

  it('es la estrategia de títulos del router', () => {
    expect(estrategia).toBeInstanceOf(TitleStrategy);
  });

  it('con el nombre corto de la empresa y la marca de pruebas: «Cartera · SILA Empresas (pruebas)»', () => {
    nombreCorto.set('Empresas');
    ir();

    expect(pestana.getTitle()).toBe('Cartera · SILA Empresas (pruebas)');
  });

  it('mientras no se conoce el nombre dice solo «SILA» (más la marca de pruebas)', () => {
    ir();

    expect(pestana.getTitle()).toBe('Cartera · SILA (pruebas)');
  });

  it('cuando el nombre llega después, el título de la pestaña se actualiza solo', () => {
    ir();
    nombreCorto.set('Ejemplo');
    TestBed.tick();

    expect(pestana.getTitle()).toBe('Cartera · SILA Ejemplo (pruebas)');
  });

  it('sin marca de entorno (una empresa real) no aparece «(pruebas)» y cambiarla actualiza la pestaña', () => {
    nombreCorto.set('Ejemplo');
    marca.set(null);
    ir();
    expect(pestana.getTitle()).toBe('Cartera · SILA Ejemplo');

    marca.set('pruebas');
    TestBed.tick();
    expect(pestana.getTitle()).toBe('Cartera · SILA Ejemplo (pruebas)');
  });

  it('una pantalla sin título propio muestra «SILA <empresa> (pruebas)»', () => {
    vi.spyOn(estrategia, 'buildTitle').mockReturnValue(undefined);
    nombreCorto.set('Empresas');
    ir();

    expect(pestana.getTitle()).toBe('SILA Empresas (pruebas)');
  });
});
