import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

/**
 * Modal built on the native <dialog> element, which gives focus trapping, Escape to close and a
 * backdrop. Opens while `open` is true; emits `closed` when the user dismisses it.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  template: `
    <dialog #dialog class="app-dialog" [attr.aria-labelledby]="headingId" (cancel)="onCancel($event)">
      <header class="dialog-header">
        <h2 [id]="headingId">{{ heading() }}</h2>
        <button type="button" class="icon-btn" aria-label="Close" (click)="closed.emit()">✕</button>
      </header>
      <div class="dialog-body"><ng-content></ng-content></div>
    </dialog>
  `,
  styles: [`
    .dialog-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 0}
    .dialog-header h2{margin:0;font-size:1.1rem}.dialog-body{padding:16px 20px 20px}
  `],
})
export class DialogComponent {
  private static nextId = 0;

  readonly open = input(false);
  readonly heading = input('');
  readonly closed = output<void>();

  protected readonly headingId = `dialog-heading-${DialogComponent.nextId++}`;
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected onCancel(event: Event): void {
    // Escape: let the parent decide by clearing `open`, so state stays in one place.
    event.preventDefault();
    this.closed.emit();
  }
}
