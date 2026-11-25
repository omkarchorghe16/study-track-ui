import { Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { difficultyLabel } from '../../core/models/item.models';
import { DueItem, REVIEW_RESULTS, ReviewResult, reviewIntervalDays } from '../../core/models/progress.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ProgressService } from '../../core/services/progress.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { RichContentComponent } from '../../shared/components/rich-content/rich-content.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';

const CARDS_PER_SESSION = 100;

/**
 * Flashcards for one subject: cards due today first, then new ones. Show the question, reveal the
 * answer, rate Again/Hard/Good/Easy; the API schedules the next review.
 */
@Component({
  selector: 'app-study',
  standalone: true,
  imports: [ShellComponent, RouterLink, RichContentComponent, ProgressBarComponent],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class StudyComponent {
  private readonly progressService = inject(ProgressService);
  private readonly subjectsService = inject(SubjectsService);

  /** Route parameter :subjectId. */
  readonly subjectId = input.required({ transform: numberAttribute });

  protected readonly results = REVIEW_RESULTS;
  protected readonly difficultyLabel = difficultyLabel;

  protected readonly subjectName = signal<string | null>(null);
  protected readonly cards = signal<DueItem[]>([]);
  protected readonly position = signal(0);
  protected readonly revealed = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rating = signal(false);
  protected readonly ratingError = signal<string | null>(null);
  protected readonly tally = signal<Record<ReviewResult, number>>({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
  protected readonly doneNow = signal(0);
  protected readonly hasMore = signal(false);

  protected readonly current = computed(() => this.cards()[this.position()] ?? null);
  protected readonly finished = computed(() => !this.loading() && this.cards().length > 0 && !this.current());
  protected readonly percent = computed(() =>
    this.cards().length ? Math.floor((this.position() * 100) / this.cards().length) : 0);
  protected readonly reviewedCount = computed(() => Object.values(this.tally()).reduce((sum, count) => sum + count, 0));

  constructor() {
    effect(() => {
      const subjectId = this.subjectId();
      untracked(() => this.load(subjectId));
    });
  }

  protected load(subjectId = this.subjectId()): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.position.set(0);
    this.revealed.set(false);
    forkJoin([this.subjectsService.getSubject(subjectId), this.progressService.listDueItems(subjectId, CARDS_PER_SESSION)])
      .subscribe({
        next: ([subject, due]) => {
          this.subjectName.set(subject.name);
          this.cards.set(due.items);
          this.hasMore.set(due.dueCount + due.newCount > due.items.length);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(apiErrorMessage(error, 'Could not load your flashcards.'));
        },
      });
  }

  /**
   * Space or Enter shows the answer; 1-4 rate it (Again, Hard, Good, Easy). Ignored while typing, with
   * modifier keys, inside an open dialog, or when Enter/Space would press a focused button or link.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const card = this.current();
    if (!card || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && !this.revealed()) {
      if (isPressableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      this.revealed.set(true);
      return;
    }
    const resultIndex = ['1', '2', '3', '4'].indexOf(event.key);
    if (resultIndex >= 0 && this.revealed() && !this.rating()) {
      event.preventDefault();
      this.rate(this.results[resultIndex].value);
    }
  }

  protected intervalLabel(result: ReviewResult, card: DueItem): string {
    const days = reviewIntervalDays(result, card.reviewCount);
    return days === 1 ? '1 day' : `${days} days`;
  }

  protected rate(result: ReviewResult): void {
    const card = this.current();
    if (!card || this.rating()) {
      return;
    }
    this.rating.set(true);
    this.ratingError.set(null);
    this.progressService.recordReview(card.id, result).subscribe({
      next: (outcome) => {
        this.rating.set(false);
        this.tally.update((tally) => ({ ...tally, [result]: tally[result] + 1 }));
        if (outcome.progress.status === 'DONE' && card.status !== 'DONE') {
          this.doneNow.update((count) => count + 1);
        }
        this.revealed.set(false);
        this.position.update((position) => position + 1);
      },
      error: (error: unknown) => {
        this.rating.set(false);
        this.ratingError.set(apiErrorMessage(error, 'Could not save your rating.'));
      },
    });
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || !!target.closest('dialog[open]'));
}

function isPressableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest('button, a[href], summary');
}
