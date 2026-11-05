import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeAccent = 'teal' | 'blue' | 'violet' | 'rose' | 'green' | 'amber';
export type ThemeRadius = 'none' | 'small' | 'medium' | 'large';
export type IconStyle = 'lucide' | 'tabler' | 'phosphor';
export type FontSize = 'normal' | 'large';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'auto'];
export const THEME_ACCENTS: readonly ThemeAccent[] = ['teal', 'blue', 'violet', 'rose', 'green', 'amber'];
export const THEME_RADII: readonly ThemeRadius[] = ['none', 'small', 'medium', 'large'];
export const ICON_STYLES: readonly IconStyle[] = ['lucide', 'tabler', 'phosphor'];
export const FONT_SIZES: readonly FontSize[] = ['normal', 'large'];

interface ThemePreferences {
  mode: ThemeMode;
  accent: ThemeAccent;
  radius: ThemeRadius;
  iconStyle: IconStyle;
  fontSize: FontSize;
}

export const THEME_STORAGE_KEY = 'sila_theme_preferences';

export const DEFAULT_THEME: Readonly<ThemePreferences> = {
  mode: 'dark',
  accent: 'blue',
  radius: 'medium',
  iconStyle: 'lucide',
  fontSize: 'normal',
};

/**
 * Each person's look, chosen in the theme customizer: mode, accent color, corner radius, icon style and text size.
 * Applies them to <html> (`dark` class, `data-accent`, `data-radius`, `data-font`) and keeps them in localStorage:
 * per browser, never sent to the backend. The icon style is read by `app-icon` and the icon loader.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly documento = inject(DOCUMENT);
  private readonly media = this.documento.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  // Reaching `localStorage` itself can throw (blocked site data): it is only touched inside try/catch.
  private readonly saved = loadPreferences(() => this.documento.defaultView?.localStorage);
  /** The system preference, only used in `auto` mode. */
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly mode = signal(this.saved.mode);
  readonly accent = signal(this.saved.accent);
  readonly radius = signal(this.saved.radius);
  readonly iconStyle = signal(this.saved.iconStyle);
  readonly fontSize = signal(this.saved.fontSize);
  /** The mode actually shown: `auto` follows `prefers-color-scheme`. */
  readonly isDark = computed(() => this.mode() === 'dark' || (this.mode() === 'auto' && this.systemDark()));

  constructor() {
    this.media?.addEventListener('change', (e) => {
      if (this.mode() === 'auto') this.systemDark.set(e.matches);
    });

    effect(() => {
      const prefs: ThemePreferences = {
        mode: this.mode(),
        accent: this.accent(),
        radius: this.radius(),
        iconStyle: this.iconStyle(),
        fontSize: this.fontSize(),
      };
      try {
        this.documento.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // Storage blocked or full: the theme still applies for this visit.
      }
      const html = this.documento.documentElement;
      html.classList.toggle('dark', this.isDark());
      html.setAttribute('data-accent', prefs.accent);
      html.setAttribute('data-radius', prefs.radius);
      html.setAttribute('data-font', prefs.fontSize);
    });
  }

  setMode(mode: ThemeMode): void {
    // Re-read the system preference: changes while in another mode were not tracked.
    if (mode === 'auto') this.systemDark.set(this.media?.matches ?? false);
    this.mode.set(mode);
  }

  setAccent(accent: ThemeAccent): void {
    this.accent.set(accent);
  }

  setRadius(radius: ThemeRadius): void {
    this.radius.set(radius);
  }

  setIconStyle(style: IconStyle): void {
    this.iconStyle.set(style);
  }

  setFontSize(size: FontSize): void {
    this.fontSize.set(size);
  }

  reset(): void {
    this.setMode(DEFAULT_THEME.mode);
    this.accent.set(DEFAULT_THEME.accent);
    this.radius.set(DEFAULT_THEME.radius);
    this.iconStyle.set(DEFAULT_THEME.iconStyle);
    this.fontSize.set(DEFAULT_THEME.fontSize);
  }
}

/**
 * Each saved value is checked against its list; anything unknown or missing (preferences saved before a field existed)
 * or a broken JSON falls back to the default.
 */
function loadPreferences(storage: () => Storage | undefined): ThemePreferences {
  try {
    const raw = storage()?.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const saved = JSON.parse(raw) as Partial<Record<keyof ThemePreferences, unknown>> | null;
    const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
      allowed.includes(value as T) ? (value as T) : fallback;
    return {
      mode: pick(saved?.mode, THEME_MODES, DEFAULT_THEME.mode),
      accent: pick(saved?.accent, THEME_ACCENTS, DEFAULT_THEME.accent),
      radius: pick(saved?.radius, THEME_RADII, DEFAULT_THEME.radius),
      iconStyle: pick(saved?.iconStyle, ICON_STYLES, DEFAULT_THEME.iconStyle),
      fontSize: pick(saved?.fontSize, FONT_SIZES, DEFAULT_THEME.fontSize),
    };
  } catch {
    return { ...DEFAULT_THEME };
  }
}
