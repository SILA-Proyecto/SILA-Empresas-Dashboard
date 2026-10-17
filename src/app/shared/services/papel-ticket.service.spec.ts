import { TestBed } from '@angular/core/testing';
import { PapelTicketService } from './papel-ticket.service';

describe('PapelTicketService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('por defecto es el rollo de 80 mm', () => {
    expect(TestBed.inject(PapelTicketService).ancho()).toBe(80);
  });

  it('recuerda la elección en este navegador', () => {
    TestBed.inject(PapelTicketService).elegir(58);
    expect(localStorage.getItem('sila.papel-ticket')).toBe('58');

    TestBed.resetTestingModule();
    expect(TestBed.inject(PapelTicketService).ancho()).toBe(58);
  });

  it('un valor guardado que no es un rollo conocido vuelve a 80', () => {
    localStorage.setItem('sila.papel-ticket', '9999');
    expect(TestBed.inject(PapelTicketService).ancho()).toBe(80);
  });

  it('si el navegador no deja guardar (ventana privada) igual funciona en la sesión', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const servicio = TestBed.inject(PapelTicketService);
    expect(servicio.ancho()).toBe(80);
    servicio.elegir(58);
    expect(servicio.ancho()).toBe(58);
  });
});
