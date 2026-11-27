import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription, forkJoin, of, switchMap, takeWhile, tap, timer } from 'rxjs';
import {
  CandidateSelectionRequest, IMPORT_EXTENSIONS, IMPORT_STATUS_LABELS, ImportCandidate, ImportJob, MAX_IMPORT_BYTES,
  isCandidateOpen, isImportRunning,
} from '../../core/models/import.models';
import { ITEM_TYPES } from '../../core/models/item.models';
import { Subject } from '../../core/models/subject.models';
import { TopicOption, flattenTopics } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ImportsService } from '../../core/services/imports.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { ToastService } from '../../core/services/toast.service';
import { TopicsService } from '../../core/services/topics.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { RichContentComponent } from '../../shared/components/rich-content/rich-content.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { CandidateDialogComponent } from './candidate-dialog.component';

const POLL_INTERVAL_MS = 2500;

/**
 * Import wizard (`/import`, `/import?job=`): upload a document for a subject, follow its progress, then
 * review what the LLM found and approve candidates into items. Nothing is saved as an item until approved.
 */
@Component({
  selector: 'app-import',
  standalone: true,
  imports: [ShellComponent, RouterLink, FormsModule, DatePipe, DecimalPipe, ProgressBarComponent, RichContentComponent, CandidateDialogComponent],
  templateUrl: './import.component.html',
  styleUrl: './import.component.scss',
})
export class ImportComponent {
  private readonly importsService = inject(ImportsService);
  private readonly subjectsService = inject(SubjectsService);
  private readonly topicsService = inject(TopicsService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Query parameter ?job= to open an import. */
  readonly job = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  protected readonly acceptedTypes = IMPORT_EXTENSIONS.join(',');
  protected readonly statusLabels = IMPORT_STATUS_LABELS;
  protected readonly isCandidateOpen = isCandidateOpen;

  protected readonly subjects = signal<Subject[]>([]);
  protected readonly recentImports = signal<ImportJob[]>([]);
  protected readonly loadError = signal<string | null>(null);
  /** Subject field text: an existing subject's name, or a new name that is created when the import starts. */
  protected readonly subjectText = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly starting = signal(false);
  protected readonly startError = signal<string | null>(null);

  protected readonly currentJob = signal<ImportJob | null>(null);
  protected readonly jobError = signal<string | null>(null);
  protected readonly candidates = signal<ImportCandidate[]>([]);
  protected readonly candidatesLoading = signal(false);
  protected readonly topicOptions = signal<TopicOption[]>([]);
  protected readonly selectedIds = signal<ReadonlySet<number>>(new Set());
  protected readonly expandedIds = signal<ReadonlySet<number>>(new Set());
  protected readonly actionBusy = signal(false);
  protected readonly editing = signal<ImportCandidate | null>(null);

  protected readonly running = computed(() => {
    const job = this.currentJob();
    return job !== null && isImportRunning(job.status);
  });
  protected readonly reviewable = computed(() => {
    const status = this.currentJob()?.status;
    return status === 'READY_FOR_REVIEW' || status === 'COMPLETED';
  });
  protected readonly openCandidates = computed(() => this.candidates().filter((candidate) => isCandidateOpen(candidate.status)));
  protected readonly selectedOpenIds = computed(() =>
    this.openCandidates().filter((candidate) => this.selectedIds().has(candidate.id)).map((candidate) => candidate.id));
  protected readonly allSelected = computed(() =>
    this.openCandidates().length > 0 && this.selectedOpenIds().length === this.openCandidates().length);
  protected readonly activeSubjects = computed(() => this.subjects().filter((subject) => !subject.archived));
  protected readonly typedSubjectName = computed(() => this.subjectText().trim());
  /** The active subject whose name matches the field (ignoring case), or null when the name is new. */
  protected readonly matchedSubject = computed(() => {
    const name = this.typedSubjectName().toLowerCase();
    return name ? this.activeSubjects().find((subject) => subject.name.trim().toLowerCase() === name) ?? null : null;
  });
  protected readonly subjectName = computed(() => {
    const job = this.currentJob();
    return job ? this.subjects().find((subject) => subject.id === job.subjectId)?.name ?? '—' : '—';
  });

  private polling: Subscription | null = null;

  constructor() {
    this.loadStartData();
    effect(() => {
      const jobId = this.job();
      untracked(() => (jobId === undefined ? this.closeJob() : this.openJob(jobId)));
    });
  }

  protected chooseFile(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0] ?? null;
    this.startError.set(null);
    if (!file) {
      this.selectedFile.set(null);
      this.fileError.set(null);
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (!IMPORT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
      this.fileError.set('Choose a .docx, .pdf, .md or .txt file.');
      this.selectedFile.set(null);
    } else if (file.size > MAX_IMPORT_BYTES) {
      this.fileError.set('The file is larger than 20 MB.');
      this.selectedFile.set(null);
    } else {
      this.fileError.set(null);
      this.selectedFile.set(file);
    }
  }

  protected startImport(): void {
    const file = this.selectedFile();
    const name = this.typedSubjectName();
    if (!file || !name || this.starting()) {
      this.startError.set(!name ? 'Choose or type a subject.' : 'Choose a file.');
      return;
    }
    this.starting.set(true);
    this.startError.set(null);
    this.subjectForImport(name).pipe(
      switchMap((subject) => this.importsService.startImport(file, subject.id)),
    ).subscribe({
      next: (job) => {
        this.starting.set(false);
        this.selectedFile.set(null);
        this.router.navigate(['/import'], { queryParams: { job: job.id } });
      },
      error: (error: unknown) => {
        this.starting.set(false);
        this.startError.set(apiErrorMessage(error, 'Could not start the import.'));
      },
    });
  }

  /** The matching subject, or a new subject with this name (kept in the list so a retry reuses it). */
  private subjectForImport(name: string): Observable<Subject> {
    const existing = this.matchedSubject();
    if (existing) {
      return of(existing);
    }
    return this.subjectsService.createSubject({ name }).pipe(
      tap((created) => {
        this.subjects.update((list) => [...list, created]);
        this.toastService.showSuccess(`Created subject “${created.name}”.`);
      }),
    );
  }

  protected loadStartData(): void {
    this.loadError.set(null);
    forkJoin({ subjects: this.subjectsService.listSubjects(), imports: this.importsService.listImports(10) }).subscribe({
      next: ({ subjects, imports }) => {
        this.subjects.set(subjects);
        this.recentImports.set(imports);
        const active = this.activeSubjects();
        if (!this.subjectText() && active.length === 1) {
          this.subjectText.set(active[0].name);
        }
      },
      error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load your subjects and imports.')),
    });
  }

  protected subjectNameFor(subjectId: number): string {
    return this.subjects().find((subject) => subject.id === subjectId)?.name ?? '—';
  }

  protected typeLabel(candidate: ImportCandidate): string {
    return ITEM_TYPES.find((type) => type.value === candidate.itemType)?.label ?? candidate.itemType;
  }

  protected topicLabel(candidate: ImportCandidate): string {
    if (candidate.targetTopicId !== undefined) {
      return this.topicOptions().find((option) => option.id === candidate.targetTopicId)?.path ?? '—';
    }
    return candidate.suggestedTopicPath?.replace(/\s*>\s*/g, ' › ') || 'Imported';
  }

  protected toggleSelected(candidateId: number): void {
    this.selectedIds.update((ids) => toggled(ids, candidateId));
  }

  protected toggleAll(): void {
    this.selectedIds.set(this.allSelected() ? new Set() : new Set(this.openCandidates().map((candidate) => candidate.id)));
  }

  protected toggleExpanded(candidateId: number): void {
    this.expandedIds.update((ids) => toggled(ids, candidateId));
  }

  protected approve(request: CandidateSelectionRequest): void {
    const job = this.currentJob();
    if (!job || this.actionBusy()) {
      return;
    }
    this.runAction();
    this.importsService.approveCandidates(job.id, request).subscribe({
      next: (response) => {
        const topics = response.createdTopicCount ? `, ${plural(response.createdTopicCount, 'new topic')}` : '';
        this.finishAction(response.job, `Approved ${plural(response.approvedCount, 'item')}${topics}.`);
      },
      error: (error: unknown) => this.failAction(apiErrorMessage(error, 'Could not approve the candidates.')),
    });
  }

  protected reject(request: CandidateSelectionRequest): void {
    const job = this.currentJob();
    if (!job || this.actionBusy()) {
      return;
    }
    this.runAction();
    this.importsService.rejectCandidates(job.id, request).subscribe({
      next: (response) => this.finishAction(response.job, `Rejected ${plural(response.rejectedCount, 'candidate')}.`),
      error: (error: unknown) => this.failAction(apiErrorMessage(error, 'Could not reject the candidates.')),
    });
  }

  protected onCandidateSaved(updated: ImportCandidate): void {
    this.editing.set(null);
    this.toastService.showSuccess('Candidate saved.');
    this.candidates.update((list) => list.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
  }

  private openJob(jobId: number): void {
    this.stopPolling();
    this.currentJob.set(null);
    this.jobError.set(null);
    this.candidates.set([]);
    this.selectedIds.set(new Set());
    this.polling = timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.importsService.getImport(jobId)),
      takeWhile((job) => isImportRunning(job.status), true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (job) => {
        this.currentJob.set(job);
        if (!isImportRunning(job.status)) {
          this.loadReview(job);
        }
      },
      error: (error: unknown) => this.jobError.set(apiErrorMessage(error, 'Could not load the import.')),
    });
  }

  private closeJob(): void {
    this.stopPolling();
    this.currentJob.set(null);
    this.jobError.set(null);
    this.loadStartData();
  }

  private stopPolling(): void {
    this.polling?.unsubscribe();
    this.polling = null;
  }

  private loadReview(job: ImportJob): void {
    if (job.status === 'FAILED' && job.candidates.total === 0) {
      return;
    }
    this.candidatesLoading.set(true);
    forkJoin({ candidates: this.importsService.listCandidates(job.id), tree: this.topicsService.listTopicTree(job.subjectId) }).subscribe({
      next: ({ candidates, tree }) => {
        this.candidatesLoading.set(false);
        this.candidates.set(candidates);
        this.topicOptions.set(flattenTopics(tree));
        // Duplicates start unselected so approving the selection does not copy existing items.
        this.selectedIds.set(new Set(candidates
          .filter((candidate) => isCandidateOpen(candidate.status) && !candidate.duplicateItemId && !candidate.duplicateOfCandidateId)
          .map((candidate) => candidate.id)));
      },
      error: (error: unknown) => {
        this.candidatesLoading.set(false);
        this.jobError.set(apiErrorMessage(error, 'Could not load the candidates.'));
      },
    });
  }

  private runAction(): void {
    this.actionBusy.set(true);
  }

  private finishAction(job: ImportJob, message: string): void {
    this.actionBusy.set(false);
    this.currentJob.set(job);
    this.toastService.showSuccess(message);
    this.loadReview(job);
  }

  private failAction(message: string): void {
    this.actionBusy.set(false);
    this.toastService.showError(message);
  }
}

function toggled(ids: ReadonlySet<number>, id: number): ReadonlySet<number> {
  const next = new Set(ids);
  if (!next.delete(id)) {
    next.add(id);
  }
  return next;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
