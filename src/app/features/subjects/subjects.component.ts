import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject } from '../../core/models/subject.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { SubjectsService } from '../../core/services/subjects.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { SubjectDialogComponent } from './subject-dialog.component';

/** Subject cards with progress, create, edit and delete. */
@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [ShellComponent, RouterLink, SubjectDialogComponent, ConfirmDialogComponent, ProgressBarComponent],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <h1>Subjects</h1>
            <p>Courses and prep tracks. Open one to work with its topics and questions.</p>
          </div>
          <button type="button" class="btn btn-primary" (click)="openCreate()">＋ New subject</button>
        </header>

        @if (loadError()) {
          <p class="load-error" role="alert">{{ loadError() }} <button type="button" class="btn btn-small" (click)="loadSubjects()">Retry</button></p>
        }
        @if (loading()) {
          <p class="text-muted" role="status">Loading subjects…</p>
        } @else if (!loadError() && subjects().length === 0) {
          <div class="card empty-state">
            <p>No subjects yet. Create one for each course or interview track you are preparing.</p>
            <button type="button" class="btn btn-primary" (click)="openCreate()">Create your first subject</button>
          </div>
        } @else {
          <ul class="subject-grid">
            @for (subject of activeSubjects(); track subject.id) {
              <li class="card subject-card">
                <a class="subject-link" [routerLink]="['/subjects', subject.id]">
                  <span class="subject-icon" aria-hidden="true">{{ subject.icon || '📘' }}</span>
                  <span class="subject-name">{{ subject.name }}</span>
                </a>
                <p class="subject-description">{{ subject.description || '—' }}</p>
                <p class="subject-counts">{{ subject.topicCount }} topics · {{ subject.itemCount }} items · {{ subject.percentDone }}% done</p>
                <app-progress-bar [value]="subject.percentDone" [label]="subject.name + ' progress'"></app-progress-bar>
                <div class="actions-row">
                  @if (subject.itemCount) {
                    <a class="btn btn-small btn-primary" [routerLink]="['/study', subject.id]" [attr.aria-label]="'Study ' + subject.name">Study</a>
                  }
                  <button type="button" class="btn btn-small" [attr.aria-label]="'Edit ' + subject.name" (click)="openEdit(subject)">Edit</button>
                  <button type="button" class="btn btn-small btn-danger" [attr.aria-label]="'Delete ' + subject.name" (click)="askDelete(subject)">Delete</button>
                </div>
              </li>
            }
          </ul>
          @if (archivedSubjects().length) {
            <h2 class="archived-heading">Archived</h2>
            <ul class="subject-grid archived">
              @for (subject of archivedSubjects(); track subject.id) {
                <li class="card subject-card">
                  <a class="subject-link" [routerLink]="['/subjects', subject.id]"><span class="subject-name">{{ subject.name }}</span></a>
                  <div class="actions-row">
                    <button type="button" class="btn btn-small" [attr.aria-label]="'Edit ' + subject.name" (click)="openEdit(subject)">Edit</button>
                  </div>
                </li>
              }
            </ul>
          }
        }
      </section>

      <app-subject-dialog [open]="dialogOpen()" [subject]="editing()" (saved)="onSaved()" (closed)="dialogOpen.set(false)"></app-subject-dialog>
      <app-confirm-dialog [open]="!!deleting()" heading="Delete subject?" [busy]="deleteBusy()" [error]="deleteError()"
                          [message]="'“' + (deleting()?.name ?? '') + '” and all its topics and items will be deleted. This cannot be undone.'"
                          (confirmed)="confirmDelete()" (cancelled)="deleting.set(null)"></app-confirm-dialog>
    </app-shell>
  `,
  styles: [`
    .subject-grid{list-style:none;margin:0 0 24px;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
    .subject-card{display:flex;flex-direction:column;gap:8px;padding:18px}
    .subject-link{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1rem}.subject-link:hover .subject-name{color:var(--accent)}
    .subject-icon{font-size:1.4rem}.subject-description{margin:0;color:var(--muted);font-size:.82rem;flex:1}
    .subject-counts{margin:0;color:var(--muted);font-size:.75rem}
    .archived-heading{font-size:.9rem;color:var(--muted)}.archived .subject-card{opacity:.7}
  `],
})
export class SubjectsComponent {
  private readonly subjectsService = inject(SubjectsService);
  private readonly toastService = inject(ToastService);

  protected readonly subjects = signal<Subject[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeSubjects = computed(() => this.subjects().filter((subject) => !subject.archived));
  protected readonly archivedSubjects = computed(() => this.subjects().filter((subject) => subject.archived));

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Subject | null>(null);
  protected readonly deleting = signal<Subject | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    this.loadSubjects();
  }

  protected loadSubjects(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.subjectsService.listSubjects().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not load your subjects.'));
      },
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(subject: Subject): void {
    this.editing.set(subject);
    this.dialogOpen.set(true);
  }

  protected onSaved(): void {
    this.toastService.showSuccess(this.editing() ? 'Subject saved.' : 'Subject created.');
    this.dialogOpen.set(false);
    this.loadSubjects();
  }

  protected askDelete(subject: Subject): void {
    this.deleteError.set(null);
    this.deleting.set(subject);
  }

  protected confirmDelete(): void {
    const subject = this.deleting();
    if (!subject) {
      return;
    }
    this.deleteBusy.set(true);
    this.subjectsService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.subjects.update((subjects) => subjects.filter((each) => each.id !== subject.id));
        this.toastService.showSuccess(`Subject “${subject.name}” deleted.`);
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error, 'Could not delete the subject.'));
      },
    });
  }
}
