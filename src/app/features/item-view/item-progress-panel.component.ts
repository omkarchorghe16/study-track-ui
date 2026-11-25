import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { ITEM_STATUSES, ItemProgress, ItemStatus } from '../../core/models/item.models';
import { ItemProgressUpdate } from '../../core/models/progress.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ProgressService } from '../../core/services/progress.service';

const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * Status (Not started / Learning / Done), confidence stars and bookmark for one item. Each change is
 * saved at once with PATCH /items/{id}/progress and reported to the page through `changed`.
 */
@Component({
  selector: 'app-item-progress-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="card progress-panel" aria-labelledby="progress-heading">
      <h2 id="progress-heading" class="sr-only">Your progress</h2>
      <div class="group" role="group" aria-label="Status">
        @for (status of statuses; track status.value) {
          <button type="button" class="btn btn-small" [class.active]="progress().status === status.value"
                  [class]="'btn btn-small ' + status.value.toLowerCase()" [attr.aria-pressed]="progress().status === status.value"
                  [disabled]="saving()" (click)="setStatus(status.value)">{{ status.label }}</button>
        }
      </div>
      <div class="group stars" role="group" aria-label="Confidence">
        <span class="label" aria-hidden="true">Confidence</span>
        @for (level of confidenceLevels; track level) {
          <button type="button" class="icon-btn star" [class.on]="(progress().confidence ?? 0) >= level"
                  [attr.aria-pressed]="progress().confidence === level" [attr.aria-label]="'Confidence ' + level + ' of 5'"
                  [disabled]="saving()" (click)="setConfidence(level)">★</button>
        }
      </div>
      <button type="button" class="btn btn-small bookmark" [class.on]="progress().bookmarked" [attr.aria-pressed]="progress().bookmarked"
              [disabled]="saving()" (click)="save({ bookmarked: !progress().bookmarked })">
        {{ progress().bookmarked ? '★ Bookmarked' : '☆ Bookmark' }}
      </button>
      <p class="review-info text-muted">
        @if (progress().reviewCount) {
          Reviewed {{ progress().reviewCount }}× · next review {{ progress().nextReviewAt | date: 'mediumDate' }}
        } @else { Not reviewed with flashcards yet }
      </p>
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: [`
    .progress-panel{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding:12px 16px;margin-bottom:14px}
    .group{display:flex;align-items:center;gap:4px}
    .btn.active.not_started{border-color:#92929d;color:var(--text)}
    .btn.active.learning{border-color:var(--primary);background:#4b8cff26;color:#9dc0ff}
    .btn.active.done{border-color:var(--positive);background:#35be8426;color:#56d69c}
    .label{color:var(--muted);font-size:.74rem;margin-right:4px}
    .star{font-size:1.05rem;color:#55555c}.star.on{color:#f5c84c}
    .bookmark.on{border-color:#f5c84c88;color:#f5c84c}
    .review-info{margin:0;font-size:.74rem;flex-basis:100%}
    .form-error{flex-basis:100%;margin:0}
  `],
})
export class ItemProgressPanelComponent {
  private readonly progressService = inject(ProgressService);

  readonly itemId = input.required<number>();
  readonly progress = input.required<ItemProgress>();
  readonly changed = output<ItemProgress>();

  protected readonly statuses = ITEM_STATUSES;
  protected readonly confidenceLevels = CONFIDENCE_LEVELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected setStatus(status: ItemStatus): void {
    if (status !== this.progress().status) {
      this.save({ status });
    }
  }

  /** Clicking the current level again clears the confidence. */
  protected setConfidence(level: number): void {
    this.save({ confidence: this.progress().confidence === level ? 0 : level });
  }

  protected save(update: ItemProgressUpdate): void {
    this.saving.set(true);
    this.error.set(null);
    this.progressService.updateItemProgress(this.itemId(), update).subscribe({
      next: (progress) => {
        this.saving.set(false);
        this.changed.emit(progress);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error, 'Could not save your progress.'));
      },
    });
  }
}
