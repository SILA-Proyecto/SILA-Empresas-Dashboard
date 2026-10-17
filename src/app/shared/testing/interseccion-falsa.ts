/**
 * jsdom has no `IntersectionObserver`, which `@defer (on viewport)` needs. This stand-in reports every watched element as
 * visible right away, so the deferred block loads as it would on a screen where it is in view.
 */
export function instalarInterseccionFalsa(): void {
  class InterseccionFalsa {
    constructor(private readonly alCambiar: (entradas: unknown[]) => void) {}
    observe(elemento: Element): void {
      queueMicrotask(() => this.alCambiar([{ target: elemento, isIntersecting: true, intersectionRatio: 1 }]));
    }
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = InterseccionFalsa;
}
