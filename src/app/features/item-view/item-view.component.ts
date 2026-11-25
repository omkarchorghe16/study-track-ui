import { Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ItemProgress, StudyItem, difficultyLabel, itemTypeLabel } from '../../core/models/item.models';
import { flattenTopics } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ItemsService } from '../../core/services/items.service';
import { ProgressService } from '../../core/services/progress.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { TopicsService } from '../../core/services/topics.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RichContentComponent } from '../../shared/components/rich-content/rich-content.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { ItemProgressPanelComponent } from './item-progress-panel.component';

/**
 * Reading view of one item: progress controls, question, answer and notes, previous/next in its topic.
 * Opening an item saves it as the subject's resume point.
 */
@Component({
  selector: 'app-item-view',
  standalone: true,
  imports: [ShellComponent, RouterLink, RichContentComponent, ConfirmDialogComponent, ItemProgressPanelComponent],
  template: `
    <app-shell>
      <article class="page-shell item-page">
        @if (loadError()) {
          <p class="load-error" role="alert">{{ loadError() }}</p>
          <a class="btn" routerLink="/subjects">Back to subjects</a>
        } @else if (item(); as item) {
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a routerLink="/subjects">Subjects</a><span aria-hidden="true">›</span>
            <a [routerLink]="['/subjects', item.subjectId]">{{ subjectName() ?? 'Subject' }}</a><span aria-hidden="true">›</span>
            <a [routerLink]="['/subjects', item.subjectId]" [queryParams]="{ topic: item.topicId }">{{ topicPath() ?? 'Topic' }}</a>
          </nav>
          <header class="page-header">
            <div>
              <h1>{{ item.title }}</h1>
              <div class="item-meta">
                <span>{{ itemTypeLabel(item.itemType) }}</span>
                <span class="badge" [class]="item.difficulty.toLowerCase()">{{ difficultyLabel(item.difficulty) }}</span>
                @for (tag of item.tags; track tag) { <span class="tag-chip">{{ tag }}</span> }
              </div>
            </div>
            <div class="actions-row">
              <a class="btn" [routerLink]="['/items', item.id, 'edit']">Edit</a>
              <button type="button" class="btn btn-danger" (click)="confirmingDelete.set(true)">Delete</button>
            </div>
          </header>

          <app-item-progress-panel [itemId]="item.id" [progress]="item.progress" (changed)="onProgressChanged($event)"></app-item-progress-panel>

          @if (item.questionHtml) {
            <section class="card block" aria-labelledby="question-heading">
              <h2 id="question-heading" class="eyebrow">Question</h2>
              <app-rich-content [html]="item.questionHtml"></app-rich-content>
            </section>
          }
          @if (item.itemType === 'QUESTION' || item.answerHtml) {
            <section class="card block" aria-labelledby="answer-heading">
              <h2 id="answer-heading" class="eyebrow">Answer</h2>
              <app-rich-content [html]="item.answerHtml" emptyText="No answer yet."></app-rich-content>
            </section>
          }
          @if (item.notesHtml) {
            <section class="card block" aria-labelledby="notes-heading">
              <h2 id="notes-heading" class="eyebrow">Notes</h2>
              <app-rich-content [html]="item.notesHtml"></app-rich-content>
            </section>
          }

          <nav class="prev-next" aria-label="Items in this topic">
            @if (item.previousItemId) {
              <a class="btn" [routerLink]="['/items', item.previousItemId]">← Previous</a>
            } @else { <span></span> }
            @if (item.nextItemId) {
              <a class="btn" [routerLink]="['/items', item.nextItemId]">Next →</a>
            }
          </nav>
        } @else {
          <p class="text-muted" role="status">Loading item…</p>
        }
      </article>
      <app-confirm-dialog [open]="confirmingDelete()" heading="Delete item?" [busy]="deleteBusy()" [error]="deleteError()"
                          [message]="'“' + (item()?.title ?? '') + '” will be deleted. This cannot be undone.'"
                          (confirmed)="deleteItem()" (cancelled)="confirmingDelete.set(false)"></app-confirm-dialog>
    </app-shell>
  `,
  styles: [`
    .item-page{max-width:900px}.block{padding:18px 20px;margin-bottom:14px}.block h2{margin:0 0 10px}
    .item-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;color:var(--muted);font-size:.76rem}
    .prev-next{display:flex;justify-content:space-between;gap:12px;margin-top:20px}
  `],
})
export class ItemViewComponent {
  private readonly itemsService = inject(ItemsService);
  private readonly progressService = inject(ProgressService);
  private readonly subjectsService = inject(SubjectsService);
  private readonly topicsService = inject(TopicsService);
  private readonly router = inject(Router);

  /** Route parameter :id. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly itemTypeLabel = itemTypeLabel;
  protected readonly difficultyLabel = difficultyLabel;

  protected readonly item = signal<StudyItem | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly subjectName = signal<string | null>(null);
  private readonly topicPaths = signal<ReadonlyMap<number, string>>(new Map());
  protected readonly topicPath = computed(() => {
    const item = this.item();
    return item ? this.topicPaths().get(item.topicId) ?? null : null;
  });

  protected readonly confirmingDelete = signal(false);
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  private loadedSubjectId: number | null = null;

  constructor() {
    effect(() => {
      const itemId = this.id();
      untracked(() => this.loadItem(itemId));
    });
  }

  protected onProgressChanged(progress: ItemProgress): void {
    this.item.update((item) => (item ? { ...item, progress } : item));
  }

  protected deleteItem(): void {
    const item = this.item();
    if (!item) {
      return;
    }
    this.deleteBusy.set(true);
    this.itemsService.deleteItem(item.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.confirmingDelete.set(false);
        this.router.navigate(['/subjects', item.subjectId], { queryParams: { topic: item.topicId } });
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error, 'Could not delete the item.'));
      },
    });
  }

  private loadItem(itemId: number): void {
    this.loadError.set(null);
    this.itemsService.getItem(itemId).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loadNames(item.subjectId);
        // Best effort: a failed save only means "Continue" points at the previous place.
        this.progressService.saveResumePoint(item.subjectId, item.topicId, item.id).subscribe({ error: () => undefined });
      },
      error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load this item.')),
    });
  }

  /** Subject name and topic paths for the breadcrumb; loaded once per subject. */
  private loadNames(subjectId: number): void {
    if (this.loadedSubjectId === subjectId) {
      return;
    }
    this.loadedSubjectId = subjectId;
    forkJoin([this.subjectsService.getSubject(subjectId), this.topicsService.listTopicTree(subjectId)]).subscribe({
      next: ([subject, tree]) => {
        this.subjectName.set(subject.name);
        this.topicPaths.set(new Map(flattenTopics(tree).map((option) => [option.id, option.path])));
      },
      // The breadcrumb falls back to generic labels; the item itself is already shown.
      error: () => (this.loadedSubjectId = null),
    });
  }
}
