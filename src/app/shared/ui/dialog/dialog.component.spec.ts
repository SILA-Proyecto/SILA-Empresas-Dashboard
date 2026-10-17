import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { DialogComponent } from './dialog.component';

@Component({
  imports: [DialogComponent],
  template: `
    <app-dialog [open]="false" title="Primero" />
    <app-dialog [open]="false" title="Segundo" />
  `,
})
class AnfitrionComponent {
  readonly abierto = signal(false);
}

describe('DialogComponent', () => {
  beforeAll(() => {
    const d = HTMLDialogElement.prototype;
    d.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    d.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  it('cada diálogo se anuncia con su propio título (aria-labelledby apunta a su h2, sin repetirse)', () => {
    TestBed.configureTestingModule({ providers: [provideNgIconLoader(async () => '')] });
    const f = TestBed.createComponent(AnfitrionComponent);
    f.detectChanges();

    const dialogos = Array.from((f.nativeElement as HTMLElement).querySelectorAll('dialog'));
    const ids = dialogos.map((d) => d.getAttribute('aria-labelledby'));
    expect(new Set(ids).size).toBe(2);
    dialogos.forEach((d, i) => expect(d.querySelector(`#${ids[i]}`)?.textContent).toContain(i === 0 ? 'Primero' : 'Segundo'));
  });
});
