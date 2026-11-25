import { Component, input, output } from '@angular/core';
import { DialogComponent } from '../dialog/dialog.component';

/** Asks the user to confirm a destructive action. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [DialogComponent],
  template: `
    <app-dialog [open]="open()" [heading]="heading()" (closed)="cancelled.emit()">
      <p class="message">{{ message() }}</p>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <div class="actions-row end">
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="confirmed.emit()">
          {{ busy() ? 'Working…' : confirmLabel() }}
        </button>
      </div>
    </app-dialog>
  `,
  styles: [`.message{margin:0 0 18px;color:var(--muted);font-size:.88rem;line-height:1.5}.end{justify-content:flex-end}`],
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly heading = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Delete');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
