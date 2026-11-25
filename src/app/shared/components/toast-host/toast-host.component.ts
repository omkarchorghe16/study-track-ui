import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/** Shows `ToastService` messages in the bottom corner; errors are announced assertively. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        @if (toast.kind === 'success') {
          <div class="toast success"><span>✓ {{ toast.message }}</span>
            <button type="button" class="icon-btn" aria-label="Dismiss" (click)="toastService.dismiss(toast.id)">✕</button></div>
        }
      }
    </div>
    <div class="toast-stack errors" role="alert" aria-live="assertive">
      @for (toast of toastService.toasts(); track toast.id) {
        @if (toast.kind === 'error') {
          <div class="toast error"><span>{{ toast.message }}</span>
            <button type="button" class="icon-btn" aria-label="Dismiss" (click)="toastService.dismiss(toast.id)">✕</button></div>
        }
      }
    </div>
  `,
  styles: [`
    :host{position:fixed;right:16px;bottom:16px;z-index:20;display:grid;gap:8px;width:min(380px,calc(100vw - 32px));pointer-events:none}
    .toast-stack{display:grid;gap:8px}
    .toast{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 10px 10px 14px;border:1px solid var(--border);border-radius:8px;background:var(--panel);box-shadow:var(--shadow);font-size:.82rem;pointer-events:auto}
    .toast span{padding-top:4px;overflow-wrap:anywhere}
    .toast.success{border-left:3px solid var(--positive)}.toast.error{border-left:3px solid var(--negative);color:var(--negative-text)}
  `],
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
