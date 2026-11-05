import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { EmpresaService } from './empresa.service';
import { EntornoService } from './entorno.service';

/** The routes write «Pantalla · SILA»; the tab says «Pantalla · SILA <empresa> (<marca del entorno>)» (just «SILA» until the name is known). */
const SUFIJO_RUTA = / · SILA$/;

@Injectable({ providedIn: 'root' })
export class TituloPagina extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly empresa = inject(EmpresaService);
  private readonly entorno = inject(EntornoService);
  private readonly pantalla = signal<string | null>(null);

  constructor() {
    super();
    effect(() => this.title.setTitle(this.armar(this.pantalla(), this.empresa.nombreCorto(), this.entorno.marca())));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const titulo = this.buildTitle(snapshot);
    this.pantalla.set(titulo ? titulo.replace(SUFIJO_RUTA, '') : null);
  }

  private armar(pantalla: string | null, nombreCorto: string | null, entorno: string | null): string {
    const marca = ['SILA', nombreCorto, entorno ? `(${entorno})` : null].filter(Boolean).join(' ');
    return pantalla ? `${pantalla} · ${marca}` : marca;
  }
}
