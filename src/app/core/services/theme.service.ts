import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** `system` follows the operating system's light or dark setting. */
export type ThemeMode = 'dark' | 'light' | 'system';

export const THEME_MODES: readonly { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Same as my system' },
];

const STORAGE_KEY = 'studytrack.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Light or dark colours. The choice is kept in this browser's localStorage (there are no accounts yet)
 * and applied as `data-theme` on <html>; `styles.scss` holds both palettes. Dark is the default.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly darkQuery = this.document.defaultView?.matchMedia?.(DARK_QUERY) ?? null;

  readonly mode = signal<ThemeMode>('dark');

  constructor() {
    this.darkQuery?.addEventListener('change', () => this.applyTheme());
  }

  /** Applies the saved choice; called once at startup. */
  applyStoredTheme(): void {
    this.mode.set(readStoredMode(this.document));
    this.applyTheme();
  }

  changeMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts until the page is reloaded.
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    const mode = this.mode();
    const resolved = mode === 'system' ? (this.darkQuery?.matches === false ? 'light' : 'dark') : mode;
    this.document.documentElement.dataset['theme'] = resolved;
  }
}

function readStoredMode(document: Document): ThemeMode {
  try {
    const stored = document.defaultView?.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'system' || stored === 'dark' ? stored : 'dark';
  } catch {
    return 'dark';
  }
}
