import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { ImportJob, MAX_IMPORT_BYTES, isImportRunning } from '../../core/models/import.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ImportsService } from '../../core/services/imports.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { downloadTextFile } from '../../shared/util/download-text-file';

const TEMPLATE = `question,answer,topic
What is a HashMap?,A hash table that maps keys to values.,Collections > HashMap
"What is the difference between ""==""
and equals()?","== compares references, equals() compares content.",Core basics
`;
const POLL_INTERVAL_MS = 1000;

/** Adds many questions at once from a CSV (question, answer, optional topic path) to the subject. No AI is used. */
@Component({
  selector: 'app-questions-csv-dialog',
  standalone: true,
  imports: [DialogComponent],
  template: `
    <app-dialog [open]="open()" heading="Import questions from CSV" (closed)="close()">
      <p class="text-muted hint">
        Columns: <code>question</code>, <code>answer</code> and optionally <code>topic</code> (levels separated by <code>&gt;</code>, for example
        <code>Collections &gt; HashMap</code>; missing topics are created). Rows whose question is already in this subject are skipped.
      </p>
      <p><button type="button" class="btn btn-small" (click)="downloadTemplate()">Download a sample CSV</button></p>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      <label class="field"><span>CSV file</span>
        <input type="file" accept=".csv,text/csv" (change)="onFileChosen($event)" [disabled]="busy()">
      </label>
      @if (job(); as current) {
        <p role="status">
          @if (current.status === 'COMPLETED') {
            Done: <b>{{ current.candidates.approved }}</b> questions added, <b>{{ current.candidates.duplicates }}</b> already existed.
          } @else if (current.status === 'FAILED') {
            The import failed. {{ current.errorMessage ?? '' }}
          } @else {
            Importing…
          }
        </p>
      }
      <div class="actions-row end">
        <button type="button" class="btn btn-ghost" (click)="close()">{{ job() ? 'Close' : 'Cancel' }}</button>
        <button type="button" class="btn btn-primary" [disabled]="!file() || busy()" (click)="upload()">{{ busy() ? 'Importing…' : 'Import' }}</button>
      </div>
    </app-dialog>
  `,
  styles: [`.end{justify-content:flex-end}.hint{font-size:.8rem;margin:0 0 10px}`],
})
export class QuestionsCsvDialogComponent {
  private readonly importsService = inject(ImportsService);
  private readonly destroyRef = inject(DestroyRef);
  private polling: Subscription | null = null;

  readonly open = input(false);
  readonly subjectId = input.required<number>();
  /** Emitted when an import finished, so the page reloads its topics and questions. */
  readonly imported = output<ImportJob>();
  readonly closed = output<void>();

  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly job = signal<ImportJob | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reset();
      }
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  protected downloadTemplate(): void {
    downloadTextFile('questions-template.csv', TEMPLATE);
  }

  protected onFileChosen(event: Event): void {
    const chosen = (event.target as HTMLInputElement).files?.item(0) ?? null;
    this.file.set(null);
    this.job.set(null);
    this.error.set(null);
    if (!chosen) {
      return;
    }
    if (!chosen.name.toLowerCase().endsWith('.csv')) {
      this.error.set('Choose a .csv file.');
    } else if (chosen.size > MAX_IMPORT_BYTES) {
      this.error.set('The file is larger than 20 MB. Split it into smaller files.');
    } else {
      this.file.set(chosen);
    }
  }

  protected upload(): void {
    const file = this.file();
    if (!file || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.importsService.startImport(file, this.subjectId()).subscribe({
      next: (started) => this.followJob(started),
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error, 'Could not import the CSV.'));
      },
    });
  }

  protected close(): void {
    this.polling?.unsubscribe();
    this.closed.emit();
  }

  /** Polls the job until it is no longer running (CSV files normally finish within a second or two). */
  private followJob(started: ImportJob): void {
    this.job.set(started);
    this.polling?.unsubscribe();
    this.polling = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.importsService.getImport(started.id)),
      takeWhile((current) => isImportRunning(current.status), true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (current) => {
        this.job.set(current);
        if (!isImportRunning(current.status)) {
          this.busy.set(false);
          this.imported.emit(current);
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error, 'Could not read the import result.'));
      },
    });
    if (!isImportRunning(started.status)) {
      this.polling.unsubscribe();
      this.busy.set(false);
      this.imported.emit(started);
    }
  }

  private reset(): void {
    this.polling?.unsubscribe();
    this.file.set(null);
    this.job.set(null);
    this.error.set(null);
    this.busy.set(false);
  }
}
