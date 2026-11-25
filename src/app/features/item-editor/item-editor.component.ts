import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuillEditorComponent } from 'ngx-quill';
import type Quill from 'quill';
import { Observable, concatMap, finalize, from, map, switchMap } from 'rxjs';
import { DIFFICULTIES, Difficulty, DuplicateItem, ITEM_TYPES, ItemRequest, ItemType, StudyItem } from '../../core/models/item.models';
import { TopicOption, flattenTopics } from '../../core/models/topic.models';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../core/models/media.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ItemsService } from '../../core/services/items.service';
import { MediaService } from '../../core/services/media.service';
import { ToastService } from '../../core/services/toast.service';
import { TopicsService } from '../../core/services/topics.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { altTextFor, labelEditor, parseTags, readEditorHtml, toStoredHtml } from '../../shared/editor/editor-html';
import { mediaEditorModules } from '../../shared/editor/quill-media';

const TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: 2 }, { header: 3 }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link', 'image'],
  ['clean'],
];

/** Creates an item (`/items/new?topicId=`) or edits one (`/items/:id/edit`) with Quill rich text editors. */
@Component({
  selector: 'app-item-editor',
  standalone: true,
  imports: [ShellComponent, RouterLink, FormsModule, QuillEditorComponent],
  templateUrl: './item-editor.component.html',
  styleUrl: './item-editor.component.scss',
})
export class ItemEditorComponent {
  private readonly itemsService = inject(ItemsService);
  private readonly topicsService = inject(TopicsService);
  private readonly mediaService = inject(MediaService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  /** Route parameter :id when editing. */
  readonly id = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  /** Query parameter ?topicId= when creating. */
  readonly topicId = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  protected readonly itemTypes = ITEM_TYPES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly modules = mediaEditorModules(TOOLBAR, (quill, index, files) => this.uploadImages(quill, index, files));
  protected readonly readEditorHtml = readEditorHtml;
  protected readonly labelEditor = labelEditor;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);
  /** Items with the same question, shown before saving; empty when there are none. */
  protected readonly duplicates = signal<DuplicateItem[]>([]);
  /** topicId|title|question of the item as loaded (edits that keep it skip the duplicate check). */
  private loadedQuestionKey: string | null = null;
  private pendingQuestionKey: string | null = null;
  private confirmedQuestionKey: string | null = null;
  protected readonly uploadsInProgress = signal(0);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly uploadStatus = computed(() => {
    const count = this.uploadsInProgress();
    return count === 0 ? '' : `Uploading ${count} image${count === 1 ? '' : 's'}…`;
  });
  protected readonly subjectId = signal<number | null>(null);
  protected readonly topicOptions = signal<TopicOption[]>([]);

  protected selectedTopicId: number | null = null;
  protected itemType: ItemType = 'QUESTION';
  protected difficulty: Difficulty = 'MEDIUM';
  protected title = '';
  protected questionHtml: string | null = null;
  protected answerHtml: string | null = null;
  protected notesHtml: string | null = null;
  protected tagsText = '';

  constructor() {
    effect(() => {
      const itemId = this.id();
      const topicId = this.topicId();
      untracked(() => this.load(itemId, topicId));
    });
  }

  protected isEditing(): boolean {
    return this.id() !== undefined;
  }


  /**
   * Saves the item. A new item, or an edit that changes the title or question, is first checked for
   * items with the same question in the subject; if there are any, the user sees them and can save
   * anyway. A failed check does not block saving.
   */
  protected save(): void {
    const title = this.title.trim();
    if (!title || this.selectedTopicId === null || this.saving() || this.uploadsInProgress() > 0) {
      this.saveError.set(!title ? 'Enter a title.' : this.saveError());
      return;
    }
    const request: ItemRequest = {
      topicId: this.selectedTopicId,
      itemType: this.itemType,
      title,
      questionHtml: toStoredHtml(this.questionHtml),
      answerHtml: toStoredHtml(this.answerHtml),
      notesHtml: toStoredHtml(this.notesHtml),
      difficulty: this.difficulty,
      tags: parseTags(this.tagsText),
    };
    const questionKey = `${request.topicId}|${title}|${request.questionHtml ?? ''}`;
    this.saving.set(true);
    this.saveError.set(null);
    if (questionKey === this.loadedQuestionKey || questionKey === this.confirmedQuestionKey) {
      this.submitItem(request);
      return;
    }
    const itemId = this.id() ?? null;
    this.itemsService.findDuplicateItems({ topicId: request.topicId, title, questionHtml: request.questionHtml, itemId })
      .subscribe({
        next: (duplicates) => {
          if (duplicates.length === 0) {
            this.submitItem(request);
            return;
          }
          this.saving.set(false);
          this.duplicates.set(duplicates);
          this.pendingQuestionKey = questionKey;
        },
        error: () => this.submitItem(request),
      });
  }

  /** "Save anyway" after the duplicate warning. */
  protected saveDespiteDuplicates(): void {
    this.confirmedQuestionKey = this.pendingQuestionKey;
    this.duplicates.set([]);
    this.save();
  }

  private submitItem(request: ItemRequest): void {
    const itemId = this.id();
    const save$ = itemId === undefined
      ? this.itemsService.createItem(request)
      : this.itemsService.replaceItem(itemId, request);
    save$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toastService.showSuccess(itemId === undefined ? 'Item created.' : 'Item saved.');
        this.router.navigate(['/items', saved.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(error, 'Could not save the item.'));
      },
    });
  }

  /**
   * Uploads images one by one and inserts each at the next position, so they keep their order.
   * Files the API would refuse (type or size) are reported without a request.
   */
  private uploadImages(quill: Quill, index: number, files: File[]): void {
    const accepted = files.filter((file) => IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES);
    const refused = files.length - accepted.length;
    this.uploadError.set(refused === 0 ? null
      : `${refused === 1 ? 'One file was' : `${refused} files were`} not added: use PNG, JPEG, GIF or WebP images up to 5 MB.`);
    let position = index;
    this.uploadsInProgress.update((count) => count + accepted.length);
    from(accepted).pipe(
      concatMap((file) => this.mediaService.uploadImage(file, altTextFor(file)).pipe(
        finalize(() => this.uploadsInProgress.update((count) => count - 1)))),
    ).subscribe({
      next: (media) => {
        quill.insertEmbed(position, 'image', media.url, 'user');
        if (media.altText) {
          quill.formatText(position, 1, 'alt', media.altText, 'user');
        }
        position += 1;
        quill.setSelection(position, 'silent');
      },
      error: (error: unknown) => this.uploadError.set(apiErrorMessage(error, 'Could not upload the image.')),
    });
  }

  protected cancelLink(): (string | number)[] {
    const itemId = this.id();
    if (itemId !== undefined) {
      return ['/items', itemId];
    }
    const subjectId = this.subjectId();
    return subjectId === null ? ['/subjects'] : ['/subjects', subjectId];
  }

  private load(itemId: number | undefined, topicId: number | undefined): void {
    this.loading.set(true);
    this.loadError.set(null);
    let source$: Observable<{ subjectId: number; topicId: number; item: StudyItem | null }>;
    if (itemId !== undefined) {
      source$ = this.itemsService.getItem(itemId).pipe(
        map((item) => ({ subjectId: item.subjectId, topicId: item.topicId, item })));
    } else if (topicId !== undefined) {
      source$ = this.topicsService.getTopic(topicId).pipe(
        map((topic) => ({ subjectId: topic.subjectId, topicId: topic.id, item: null })));
    } else {
      this.loading.set(false);
      this.loadError.set('Open the editor from a topic: choose a subject, pick a topic, then "New item".');
      return;
    }
    source$.pipe(
      switchMap((context) => this.topicsService.listTopicTree(context.subjectId).pipe(map((tree) => ({ ...context, tree })))),
    ).subscribe({
      next: ({ subjectId, topicId: resolvedTopicId, item, tree }) => {
        this.subjectId.set(subjectId);
        this.topicOptions.set(flattenTopics(tree));
        this.selectedTopicId = resolvedTopicId;
        if (item) {
          this.fillFrom(item);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not open the editor.'));
      },
    });
  }

  private fillFrom(item: StudyItem): void {
    this.itemType = item.itemType;
    this.difficulty = item.difficulty;
    this.title = item.title;
    this.questionHtml = item.questionHtml ?? null;
    this.answerHtml = item.answerHtml ?? null;
    this.notesHtml = item.notesHtml ?? null;
    this.tagsText = item.tags.join(', ');
    this.loadedQuestionKey = `${item.topicId}|${item.title}|${item.questionHtml ?? ''}`;
  }
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
