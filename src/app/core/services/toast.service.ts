import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const SUCCESS_MS = 4000;
const ERROR_MS = 8000;
const MAX_TOASTS = 3;

/**
 * Short messages for the result of an action (saved, deleted, failed) shown by `ToastHostComponent`.
 * Load errors and form validation stay inline on their page.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  showSuccess(message: string): void {
    this.show('success', message, SUCCESS_MS);
  }

  showError(message: string): void {
    this.show('error', message, ERROR_MS);
  }

  dismiss(toastId: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== toastId));
  }

  private show(kind: ToastKind, message: string, durationMs: number): void {
    const toast: Toast = { id: this.nextId++, kind, message };
    this.toasts.update((toasts) => [...toasts, toast].slice(-MAX_TOASTS));
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
