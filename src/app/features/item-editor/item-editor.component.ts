import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QuillEditorComponent, QuillModules } from 'ngx-quill';
import type Quill from 'quill';
import { Observable, map, switchMap } from 'rxjs';
import { DIFFICULTIES, Difficulty, ITEM_TYPES, ItemRequest, ItemType, StudyItem } from '../../core/models/item.models';
import { TopicOption, flattenTopics } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ItemsService } from '../../core/services/items.service';
import { TopicsService } from '../../core/services/topics.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';

const TOOLBAR: QuillModules['toolbar'] = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: 2 }, { header: 3 }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link'],
  ['clean'],
];

/** Editor HTML with no visible text (Quill's empty "<p><br></p>") is stored as null. */
function toStoredHtml(html: string | null): string | null {
  if (!html) {
    return null;
  }
  const hasText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
  return hasText || /<(img|pre|iframe)\b/i.test(html) ? html : null;
}

/**
 * Model value of the editors. Quill 2's getSemanticHTML() writes every space as &nbsp;, which stops
 * long answers from wrapping when rendered, so spaces are restored. Code blocks keep their own spacing.
 */
function readEditorHtml(editor: Quill): string | null {
  return toStoredHtml(editor.getSemanticHTML().replace(/&nbsp;/g, ' '));
}

function parseTags(text: string): string[] {
  return [...new Set(text.split(',').map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0))];
}

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
  private readonly router = inject(Router);

  /** Route parameter :id when editing. */
  readonly id = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  /** Query parameter ?topicId= when creating. */
  readonly topicId = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  protected readonly itemTypes = ITEM_TYPES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly modules: QuillModules = { toolbar: TOOLBAR };
  protected readonly readEditorHtml = readEditorHtml;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);
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

  /** Quill renders a contenteditable div; give it the field's name for screen readers. */
  protected labelEditor(editor: Quill, label: string): void {
    editor.root.setAttribute('aria-label', label);
    editor.root.setAttribute('role', 'textbox');
    editor.root.setAttribute('aria-multiline', 'true');
  }

  protected save(): void {
    const title = this.title.trim();
    if (!title || this.selectedTopicId === null || this.saving()) {
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
    const itemId = this.id();
    this.saving.set(true);
    this.saveError.set(null);
    const save$ = itemId === undefined
      ? this.itemsService.createItem(request)
      : this.itemsService.replaceItem(itemId, request);
    save$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.router.navigate(['/items', saved.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(error, 'Could not save the item.'));
      },
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
  }
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
