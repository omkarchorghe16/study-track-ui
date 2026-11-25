import { Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DIFFICULTIES, Difficulty, ITEM_STATUSES, ItemPage, ItemStatus, difficultyLabel, itemStatusLabel, itemTypeLabel,
} from '../../core/models/item.models';
import { Subject } from '../../core/models/subject.models';
import { TopicNode, findTopicNode } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ItemsService } from '../../core/services/items.service';
import { ProgressService } from '../../core/services/progress.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { TopicsService } from '../../core/services/topics.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { TopicTreeComponent } from '../../shared/components/topic-tree/topic-tree.component';
import { TopicDialogComponent } from './topic-dialog.component';

const PAGE_SIZE = 20;

/**
 * Two-pane subject page: topic tree on the left, the selected topic's items on the right.
 * The selected topic is kept in the URL (`?topic=`), so back navigation returns to it, and is saved as
 * the subject's resume point. Topics can be marked complete; items can be filtered by status.
 */
@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [
    ShellComponent, RouterLink, FormsModule, TopicTreeComponent, TopicDialogComponent, ConfirmDialogComponent,
    ProgressBarComponent,
  ],
  templateUrl: './subject-detail.component.html',
  styleUrl: './subject-detail.component.scss',
})
export class SubjectDetailComponent {
  private readonly subjectsService = inject(SubjectsService);
  private readonly topicsService = inject(TopicsService);
  private readonly itemsService = inject(ItemsService);
  private readonly progressService = inject(ProgressService);
  private readonly router = inject(Router);

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

  protected readonly completionBusy = signal(false);
  protected readonly completionError = signal<string | null>(null);

  protected readonly topicDialogOpen = signal(false);
  protected readonly editingTopic = signal<TopicNode | null>(null);
  protected readonly newTopicParentId = signal<number | null>(null);
  protected readonly deletingTopic = signal<TopicNode | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const subjectId = this.id();
      untracked(() => this.loadSubject(subjectId));
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
    this.completionError.set(null);
    this.progressService.setTopicCompleted(topic.id, !topic.completed).subscribe({
      next: () => {
        this.completionBusy.set(false);
        this.reloadTree();
        this.loadSubject(this.id(), false);
      },
      error: (error: unknown) => {
        this.completionBusy.set(false);
        this.completionError.set(apiErrorMessage(error, 'Could not update the topic.'));
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

  private loadItems(topic: TopicNode | null): void {
    this.itemsError.set(null);
    if (!topic) {
      this.items.set(null);
      return;
    }
    this.itemsLoading.set(true);
    this.itemsService.listTopicItems(topic.id, {
      status: this.statusFilter,
      difficulty: this.difficultyFilter,
      tag: this.tagFilter,
      page: this.page(),
      size: PAGE_SIZE,
    }).subscribe({
      next: (page) => {
        this.items.set(page);
        this.itemsLoading.set(false);
      },
      error: (error: unknown) => {
        this.itemsLoading.set(false);
        this.itemsError.set(apiErrorMessage(error, 'Could not load the items.'));
      },
    });
  }
}
