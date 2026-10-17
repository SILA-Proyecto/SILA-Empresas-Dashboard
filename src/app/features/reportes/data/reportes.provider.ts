import { InjectionToken } from '@angular/core';
import type { ReportesRepository } from './reportes.repository';

export const REPORTES_REPOSITORY = new InjectionToken<ReportesRepository>('REPORTES_REPOSITORY');
