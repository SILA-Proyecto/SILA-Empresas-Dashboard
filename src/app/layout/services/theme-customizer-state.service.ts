import { Injectable, signal } from '@angular/core';

/** Open/closed state of the appearance panel, shared between the header button and the panel. */
@Injectable({ providedIn: 'root' })
export class ThemeCustomizerStateService {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((abierto) => !abierto);
  }

  close(): void {
    this.open.set(false);
  }
}
