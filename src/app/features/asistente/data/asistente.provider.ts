import { InjectionToken } from '@angular/core';
import type { AsistenteRepository } from './asistente.repository';

export const ASISTENTE_REPOSITORY = new InjectionToken<AsistenteRepository>('ASISTENTE_REPOSITORY');
