import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, SubjectRequest } from '../../core/models/subject.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { SubjectsService } from '../../core/services/subjects.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';

/** Creates a subject, or edits `subject` when one is given. Emits the saved subject. */
@Component({
  selector: 'app-subject-dialog',
  standalone: true,
  imports: [DialogComponent, FormsModule],
  template: `
    <app-dialog [open]="open()" [heading]="subject() ? 'Edit subject' : 'New subject'" (closed)="closed.emit()">
      <form (ngSubmit)="save()">
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
        <div class="field-row">
          <label class="field name-field"><span>Name</span>
            <input name="name" [(ngModel)]="name" required maxlength="120" placeholder="Java Interview" autocomplete="off">
          </label>
          <label class="field icon-field"><span>Icon</span>
            <input name="icon" [(ngModel)]="icon" maxlength="16" placeholder="☕" autocomplete="off">
          </label>
        </div>
        <label class="field"><span>Description</span>
          <textarea name="description" [(ngModel)]="description" maxlength="1000" rows="3"></textarea>
        </label>
        @if (subject()) {
          <label class="check"><input type="checkbox" name="archived" [(ngModel)]="archived"> Archived (hidden from the main list)</label>
        }
        <div class="actions-row end">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving() || !name.trim()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </app-dialog>
  `,
  styles: [`.end{justify-content:flex-end;margin-top:6px}.field-row{grid-template-columns:1fr 90px}.check{display:flex;gap:8px;align-items:center;margin:0 0 14px;font-size:.84rem}`],
})
export class SubjectDialogComponent {
  private readonly subjectsService = inject(SubjectsService);

  readonly open = input(false);
  readonly subject = input<Subject | null>(null);
  readonly saved = output<Subject>();
  readonly closed = output<void>();

  protected name = '';
  protected icon = '';
  protected description = '';
  protected archived = false;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        const subject = this.subject();
        this.name = subject?.name ?? '';
        this.icon = subject?.icon ?? '';
        this.description = subject?.description ?? '';
        this.archived = subject?.archived ?? false;
        this.error.set(null);
      }
    });
  }

  protected save(): void {
    if (!this.name.trim() || this.saving()) {
      return;
    }
    const subject = this.subject();
    const request: SubjectRequest = {
      name: this.name.trim(),
      icon: this.icon.trim() || null,
      description: this.description.trim() || null,
      archived: this.archived,
    };
    this.saving.set(true);
    const call = subject
      ? this.subjectsService.replaceSubject(subject.id, request)
      : this.subjectsService.createSubject(request);
    call.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error, 'Could not save the subject.'));
      },
    });
  }
}
