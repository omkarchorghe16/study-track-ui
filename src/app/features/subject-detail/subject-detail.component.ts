import { Component, DestroyRef, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import {
  DIFFICULTIES, Difficulty, ITEM_STATUSES, ItemPage, ItemStatus, ItemSummary, StudyItem, difficultyLabel, itemStatusLabel,
  itemTypeLabel,
} from '../../core/models/item.models';
import { ExplanationBatch } from '../../core/models/explanation.models';
import { ImportJob } from '../../core/models/import.models';
import { Subject } from '../../core/models/subject.models';
import { TopicNode, findTopicNode } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ExplanationsService } from '../../core/services/explanations.service';
import { ItemsService } from '../../core/services/items.service';
import { ProgressService } from '../../core/services/progress.service';
import { SpeechService } from '../../core/services/speech.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { TopicsService } from '../../core/services/topics.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { RichContentComponent } from '../../shared/components/rich-content/rich-content.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { TopicTreeComponent } from '../../shared/components/topic-tree/topic-tree.component';
import { ExplanationPanelComponent } from './explanation-panel.component';
import { QuestionsCsvDialogComponent } from './questions-csv-dialog.component';
import { QuickQuestionDialogComponent } from './quick-question-dialog.component';
import { TopicDialogComponent } from './topic-dialog.component';

const PAGE_SIZE = 20;
const BATCH_POLL_MS = 2000;

/**
 * Two-pane subject page: topic tree on the left, the selected topic's items on the right. With no topic
 * selected, the right pane lists every item of the subject. Clicking an item shows its question and answer
 * in place; items, topics and the subject itself can be deleted here.
 *
 * The selected topic is kept in the URL (`?topic=`), so back navigation returns to it, and is saved as
 * the subject's resume point. Topics can be marked complete; items can be filtered by status.
 */
@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [
    ShellComponent, RouterLink, FormsModule, TopicTreeComponent, TopicDialogComponent, ConfirmDialogComponent,
    ProgressBarComponent, RichContentComponent, QuickQuestionDialogComponent, QuestionsCsvDialogComponent, ExplanationPanelComponent,
  ],
  templateUrl: './subject-detail.component.html',
  styleUrl: './subject-detail.component.scss',
})
export class SubjectDetailComponent {
  private readonly subjectsService = inject(SubjectsService);
  private readonly topicsService = inject(TopicsService);
  private readonly toastService = inject(ToastService);
  private readonly itemsService = inject(ItemsService);
  private readonly progressService = inject(ProgressService);
  private readonly router = inject(Router);
  protected readonly speechService = inject(SpeechService);
  private readonly explanationsService = inject(ExplanationsService);

  /** Route parameter :id. */
  readonly id = input.required({ transform: numberAttribute });
  /** Query parameter ?topic= (selected topic id). */
  readonly topic = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value === undefined || value === null || value === '' ? undefined : Number(value)),
  });

  protected readonly difficulties = DIFFICULTIES;
  protected readonly statuses = ITEM_STATUSES;
  protected readonly itemStatusLabel = itemStatusLabel;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly itemTypeLabel = itemTypeLabel;

  protected readonly subject = signal<Subject | null>(null);
  protected readonly tree = signal<TopicNode[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loadingTree = signal(true);

  protected readonly selectedTopic = computed(() => {
    const topicId = this.topic();
    return topicId === undefined ? null : findTopicNode(this.tree(), topicId);
  });

  protected readonly items = signal<ItemPage | null>(null);
  protected readonly itemsLoading = signal(false);
  protected readonly itemsError = signal<string | null>(null);
  protected statusFilter: ItemStatus | null = null;
  protected difficultyFilter: Difficulty | null = null;
  protected tagFilter = '';
  protected readonly page = signal(0);
  /** Ignores answers of item requests that a later request replaced (topic switched mid-load). */
  private itemsRequestId = 0;

  protected readonly completionBusy = signal(false);

  /** "Parent › Child" path of every topic, for the topic label in the all-items list. */

  protected readonly expandedItemId = signal<number | null>(null);
  protected readonly itemDetails = signal<ReadonlyMap<number, StudyItem>>(new Map());
  protected readonly detailError = signal<string | null>(null);

  protected readonly deletingItem = signal<ItemSummary | null>(null);
  /** Items whose completed checkbox is being saved. */
  protected readonly savingCompletion = signal<ReadonlySet<number>>(new Set());
  protected readonly confirmingSubjectDelete = signal(false);

  /** The background "explain all" run of this subject; null until the first status arrives. */
  protected readonly batch = signal<ExplanationBatch | null>(null);
  /** Bumped when the run wrote explanations, so open answers look for theirs again. */
  protected readonly explanationReload = signal(0);
  private batchPolling: Subscription | null = null;
  protected readonly quickQuestionOpen = signal(false);
  protected readonly csvDialogOpen = signal(false);
  protected readonly topicDialogOpen = signal(false);
  protected readonly editingTopic = signal<TopicNode | null>(null);
  protected readonly newTopicParentId = signal<number | null>(null);
  protected readonly deletingTopic = signal<TopicNode | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.speechService.stop();
      this.batchPolling?.unsubscribe();
    });
    effect(() => {
      const subjectId = this.id();
      untracked(() => {
        this.loadSubject(subjectId);
        this.loadBatchStatus();
      });
    });
    effect(() => {
      const topic = this.selectedTopic();
      untracked(() => {
        this.page.set(0);
        this.loadItems(topic);
      });
    });
  }

  protected selectTopic(topicId: number): void {
    this.router.navigate([], { queryParams: { topic: topicId }, replaceUrl: true });
    // Best effort: a failed save only means "Continue" points at the previous place.
    this.progressService.saveResumePoint(this.id(), topicId, null).subscribe({ error: () => undefined });
  }

  protected toggleTopicComplete(topic: TopicNode): void {
    this.completionBusy.set(true);
    this.progressService.setTopicCompleted(topic.id, !topic.completed).subscribe({
      next: () => {
        this.completionBusy.set(false);
        this.toastService.showSuccess(topic.completed ? `“${topic.name}” is no longer marked complete.` : `“${topic.name}” marked complete.`);
        this.reloadTree();
        this.loadSubject(this.id(), false);
      },
      error: (error: unknown) => {
        this.completionBusy.set(false);
        this.toastService.showError(apiErrorMessage(error, 'Could not update the topic.'));
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(0);
    this.loadItems(this.selectedTopic());
  }

  protected clearFilters(): void {
    this.statusFilter = null;
    this.difficultyFilter = null;
    this.tagFilter = '';
    this.applyFilters();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.loadItems(this.selectedTopic());
  }

  protected showAllItems(): void {
    this.router.navigate([], { queryParams: { topic: null }, replaceUrl: true });
  }

  // ---- Question and answer in place ----

  protected toggleItem(item: ItemSummary): void {
    this.speechService.stop();
    if (this.expandedItemId() === item.id) {
      this.expandedItemId.set(null);
      return;
    }
    this.expandedItemId.set(item.id);
    this.detailError.set(null);
    if (this.itemDetails().has(item.id)) {
      return;
    }
    this.itemsService.getItem(item.id).subscribe({
      next: (detail) => this.itemDetails.update((details) => new Map(details).set(detail.id, detail)),
      error: (error: unknown) => this.detailError.set(apiErrorMessage(error, 'Could not load the answer.')),
    });
  }

  /** Starts reading the item's answer aloud, or stops it when this answer is already being read. */
  protected toggleListen(item: StudyItem): void {
    const key = `answer-${item.id}`;
    if (this.speechService.speakingKey() === key) {
      this.speechService.stop();
    } else {
      this.speechService.speakHtml(key, item.answerHtml);
    }
  }

  /** Ticked: the user went through the question, saved as DONE; unticked: back to NOT_STARTED. */
  protected setCompleted(item: ItemSummary, completed: boolean): void {
    if (this.savingCompletion().has(item.id)) {
      return;
    }
    const status: ItemStatus = completed ? 'DONE' : 'NOT_STARTED';
    this.savingCompletion.update((ids) => new Set(ids).add(item.id));
    const finish = () => this.savingCompletion.update((ids) => {
      const next = new Set(ids);
      next.delete(item.id);
      return next;
    });
    this.progressService.updateItemProgress(item.id, { status }).subscribe({
      next: (progress) => {
        finish();
        this.items.update((page) => page && {
          ...page,
          items: page.items.map((each) => (each.id === item.id ? { ...each, status: progress.status } : each)),
        });
        // Progress bars and "% done" of the subject and its topics follow the change.
        this.loadSubject(this.id());
      },
      error: (error: unknown) => {
        finish();
        this.toastService.showError(apiErrorMessage(error, 'Could not save the completed mark.'));
      },
    });
  }

  // ---- Deleting items and the subject ----

  protected askDeleteItem(item: ItemSummary): void {
    this.deleteError.set(null);
    this.deletingItem.set(item);
  }

  protected confirmDeleteItem(): void {
    const item = this.deletingItem();
    if (!item) {
      return;
    }
    this.deleteBusy.set(true);
    this.itemsService.deleteItem(item.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deletingItem.set(null);
        if (this.expandedItemId() === item.id) {
          this.expandedItemId.set(null);
        }
        this.toastService.showSuccess(`“${item.title}” deleted.`);
        this.loadSubject(this.id());
        this.loadItems(this.selectedTopic());
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error, 'Could not delete the item.'));
      },
    });
  }

  protected askDeleteSubject(): void {
    this.deleteError.set(null);
    this.confirmingSubjectDelete.set(true);
  }

  protected confirmDeleteSubject(): void {
    const subject = this.subject();
    if (!subject) {
      return;
    }
    this.deleteBusy.set(true);
    this.subjectsService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.confirmingSubjectDelete.set(false);
        this.toastService.showSuccess(`Subject “${subject.name}” deleted.`);
        this.router.navigate(['/subjects']);
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error, 'Could not delete the subject.'));
      },
    });
  }

  protected deleteSubjectMessage(): string {
    const subject = this.subject();
    return subject
      ? `“${subject.name}”, its ${subject.topicCount} topics and ${subject.itemCount} items will be deleted. This cannot be undone.`
      : '';
  }

  // ---- Explain all with AI ----

  protected explainAll(): void {
    this.explanationsService.startSubjectExplanations(this.id()).subscribe({
      next: (run) => this.followBatch(run),
      error: (error: unknown) => this.toastService.showError(apiErrorMessage(error, 'Could not start the explanations.')),
    });
  }

  private loadBatchStatus(): void {
    this.batchPolling?.unsubscribe();
    this.batch.set(null);
    this.explanationsService.getSubjectExplanationStatus(this.id()).subscribe({
      // A run that was started earlier keeps being followed; failing to ask just hides the button.
      next: (run) => this.followBatch(run),
      error: () => undefined,
    });
  }

  /** Shows the run and, while it is running, asks for its progress every two seconds. */
  private followBatch(first: ExplanationBatch): void {
    this.batchPolling?.unsubscribe();
    this.batch.set(first);
    if (first.state !== 'RUNNING') {
      return;
    }
    this.batchPolling = timer(BATCH_POLL_MS, BATCH_POLL_MS).pipe(
      switchMap(() => this.explanationsService.getSubjectExplanationStatus(this.id())),
      takeWhile((run) => run.state === 'RUNNING', true),
    ).subscribe({
      next: (run) => {
        this.batch.set(run);
        if (run.state !== 'RUNNING') {
          this.explanationReload.update((key) => key + 1);
          if (run.state === 'COMPLETED') {
            this.toastService.showSuccess(`${run.completed} explanations written.`);
          }
        }
      },
      error: () => undefined,
    });
  }

  // ---- Add questions ----

  protected openQuickQuestion(): void {
    this.quickQuestionOpen.set(true);
  }

  /** The dialog may stay open for another question, so only the lists are refreshed here. */
  protected onQuestionSaved(): void {
    this.toastService.showSuccess('Question added.');
    this.refreshAfterNewQuestions();
  }

  protected onQuestionsImported(job: ImportJob): void {
    if (job.status === 'COMPLETED') {
      this.toastService.showSuccess(`${job.candidates.approved} questions imported.`);
    } else {
      this.toastService.showError('The CSV import did not finish.');
    }
    this.refreshAfterNewQuestions();
  }

  private refreshAfterNewQuestions(): void {
    this.reloadTree();
    this.loadSubject(this.id(), false);
    this.loadItems(this.selectedTopic());
  }

  // ---- Topic dialog ----

  protected openNewTopic(parentId: number | null): void {
    this.editingTopic.set(null);
    this.newTopicParentId.set(parentId);
    this.topicDialogOpen.set(true);
  }

  protected openEditTopic(topic: TopicNode): void {
    this.editingTopic.set(topic);
    this.topicDialogOpen.set(true);
  }

  protected onTopicSaved(topicId: number): void {
    this.toastService.showSuccess(this.editingTopic() ? 'Topic saved.' : 'Topic created.');
    this.topicDialogOpen.set(false);
    this.reloadTree(() => this.selectTopic(topicId));
  }

  protected askDeleteTopic(topic: TopicNode): void {
    this.deleteError.set(null);
    this.deletingTopic.set(topic);
  }

  protected confirmDeleteTopic(): void {
    const topic = this.deletingTopic();
    if (!topic) {
      return;
    }
    this.deleteBusy.set(true);
    this.topicsService.deleteTopic(topic.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deletingTopic.set(null);
        this.toastService.showSuccess(`Topic “${topic.name}” deleted.`);
        this.reloadTree(() => {
          if (!this.selectedTopic()) {
            this.router.navigate([], { queryParams: { topic: null }, replaceUrl: true });
          }
        });
      },
      error: (error: unknown) => {
        this.deleteBusy.set(false);
        this.deleteError.set(apiErrorMessage(error, 'Could not delete the topic.'));
      },
    });
  }

  protected deleteTopicMessage(): string {
    const topic = this.deletingTopic();
    if (!topic) {
      return '';
    }
    return `“${topic.name}”, its subtopics and their ${topic.totalItemCount} items will be deleted. This cannot be undone.`;
  }

  // ---- Loading ----

  private loadSubject(subjectId: number, withTree = true): void {
    this.loadError.set(null);
    this.subjectsService.getSubject(subjectId).subscribe({
      next: (subject) => this.subject.set(subject),
      error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load this subject.')),
    });
    if (withTree) {
      this.reloadTree();
    }
  }

  private reloadTree(afterLoad?: () => void): void {
    this.loadingTree.set(true);
    this.topicsService.listTopicTree(this.id()).subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.loadingTree.set(false);
        afterLoad?.();
      },
      error: (error: unknown) => {
        this.loadingTree.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not load the topics.'));
      },
    });
  }

  /** The selected topic's items, or every item of the subject when no topic is selected. */
  private loadItems(topic: TopicNode | null): void {
    this.itemsError.set(null);
    this.itemsLoading.set(true);
    const filters = {
      status: this.statusFilter,
      difficulty: this.difficultyFilter,
      tag: this.tagFilter,
      page: this.page(),
      size: PAGE_SIZE,
    };
    const request = topic ? this.itemsService.listTopicItems(topic.id, filters, true) : this.itemsService.listSubjectItems(this.id(), filters);
    const requestId = ++this.itemsRequestId;
    request.subscribe({
      next: (page) => {
        if (requestId !== this.itemsRequestId) {
          return;
        }
        this.items.set(page);
        this.itemsLoading.set(false);
      },
      error: (error: unknown) => {
        if (requestId !== this.itemsRequestId) {
          return;
        }
        this.itemsLoading.set(false);
        this.itemsError.set(apiErrorMessage(error, 'Could not load the items.'));
      },
    });
  }
}
