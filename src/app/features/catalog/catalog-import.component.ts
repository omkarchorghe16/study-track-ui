import { Component, inject, output, signal } from '@angular/core';
import { CatalogImportResult } from '../../core/models/catalog.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { CATALOG_TEMPLATE_URL, CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Admin-only panel: upload a catalog CSV (track, subject, topic_path) and see what was added. */
@Component({
  selector: 'app-catalog-import',
  standalone: true,
  template: `
    <section class="card import-panel" aria-labelledby="catalog-import-heading">
      <h2 id="catalog-import-heading">Import catalog from CSV</h2>
      <p class="text-muted">
        Columns: <code>track</code>, <code>subject</code>, <code>topic_path</code> (levels separated by <code>&gt;</code>,
        for example <code>Collections &gt; HashMap</code>) and optionally <code>question</code>, <code>answer</code>, <code>difficulty</code>.
        Adds what is missing; nothing is changed or deleted.
        <a [href]="templateUrl" download="catalog-template.csv">Download a sample CSV</a>
      </p>
      <label class="field"><span>CSV file</span>
        <input type="file" accept=".csv,text/csv" (change)="onFileChosen($event)" [attr.aria-describedby]="error() ? 'catalog-import-error' : null">
      </label>
      @if (error()) {
        <p id="catalog-import-error" class="load-error" role="alert">{{ error() }}</p>
      }
      <button type="button" class="btn btn-primary" [disabled]="!file() || busy()" (click)="upload()">{{ busy() ? 'Importing…' : 'Import' }}</button>
      @if (result(); as summary) {
        <div class="result" role="status">
          <p><b>{{ summary.rowsRead }}</b> rows read: <b>{{ summary.tracksAdded }}</b> tracks, <b>{{ summary.subjectsAdded }}</b> subjects,
            <b>{{ summary.topicsAdded }}</b> topics and <b>{{ summary.questionsAdded }}</b> questions added.</p>
          @if (summary.rejectedRowCount) {
            <p>{{ summary.rejectedRowCount }} rows were skipped{{ summary.rejectedRows.length < summary.rejectedRowCount ? ' (first ' + summary.rejectedRows.length + ' shown)' : '' }}:</p>
            <ul>@for (row of summary.rejectedRows; track row) { <li>{{ row }}</li> }</ul>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .import-panel{padding:18px;margin-top:24px}.import-panel h2{margin:0 0 6px;font-size:1rem}.import-panel p{margin:0 0 12px;font-size:.82rem}
    .result{margin-top:14px}.result ul{margin:0;padding-left:18px;font-size:.78rem;color:var(--muted)}
  `],
})
export class CatalogImportComponent {
  private readonly catalogService = inject(CatalogService);
  private readonly toastService = inject(ToastService);

  /** Emitted after an import so the page can reload the catalog. */
  readonly imported = output<void>();

  protected readonly templateUrl = CATALOG_TEMPLATE_URL;
  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<CatalogImportResult | null>(null);

  protected onFileChosen(event: Event): void {
    const chosen = (event.target as HTMLInputElement).files?.item(0) ?? null;
    this.result.set(null);
    this.file.set(null);
    this.error.set(null);
    if (!chosen) {
      return;
    }
    if (!chosen.name.toLowerCase().endsWith('.csv')) {
      this.error.set('Choose a .csv file.');
    } else if (chosen.size > MAX_FILE_BYTES) {
      this.error.set('The file is larger than 20 MB. Split it into smaller files.');
    } else {
      this.file.set(chosen);
    }
  }

  protected upload(): void {
    const file = this.file();
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.catalogService.importCatalogCsv(file).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.result.set(result);
        this.toastService.showSuccess('Catalog import finished.');
        this.imported.emit();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error, 'Could not import the CSV.'));
      },
    });
  }
}
