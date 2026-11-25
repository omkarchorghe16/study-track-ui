import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type Quill from 'quill';
import { concatMap, finalize, from } from 'rxjs';
import { CandidateRequest, ImportCandidate } from '../../core/models/import.models';
import { DIFFICULTIES, Difficulty, ITEM_TYPES, ItemType } from '../../core/models/item.models';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../core/models/media.models';
import { TopicOption } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ImportsService } from '../../core/services/imports.service';
import { MediaService } from '../../core/services/media.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { altTextFor, labelEditor, parseTags, readEditorHtml, toStoredHtml } from '../../shared/editor/editor-html';
import { mediaEditorModules } from '../../shared/editor/quill-media';

const TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link', 'image'],
  ['clean'],
];

/** Edits one import candidate before approval: content, type, difficulty, tags and target topic. */
@Component({
  selector: 'app-candidate-dialog',
  standalone: true,
  imports: [DialogComponent, FormsModule, QuillEditorComponent],
  template: `
    <app-dialog [open]="open()" heading="Edit candidate" (closed)="closed.emit()">
      @if (open()) {
        <form (ngSubmit)="save()">
          @if (saveError()) { <p class="form-error" role="alert">{{ saveError() }}</p> }
          @if (uploadError()) { <p class="form-error" role="alert">{{ uploadError() }}</p> }
          <label class="field"><span>Title</span>
            <input name="title" [(ngModel)]="title" required maxlength="300" autocomplete="off">
          </label>
          <div class="field-row">
            <label class="field"><span>Type</span>
              <select name="itemType" [(ngModel)]="itemType">
                @for (type of itemTypes; track type.value) { <option [ngValue]="type.value">{{ type.label }}</option> }
              </select>
            </label>
            <label class="field"><span>Difficulty</span>
              <select name="difficulty" [(ngModel)]="difficulty">
                <option [ngValue]="null">—</option>
                @for (option of difficulties; track option.value) { <option [ngValue]="option.value">{{ option.label }}</option> }
              </select>
            </label>
          </div>
          <label class="field"><span>Topic</span>
            <select name="topic" [(ngModel)]="targetTopicId">
              <option [ngValue]="null">Use the topic path below</option>
              @for (option of topicOptions(); track option.id) {
                <option [ngValue]="option.id">{{ '  '.repeat(option.depth) + option.name }}</option>
              }
            </select>
          </label>
          @if (targetTopicId === null) {
            <label class="field"><span>Topic path</span>
              <input name="topicPath" [(ngModel)]="topicPath" maxlength="500" placeholder="Spring Boot > Security" autocomplete="off">
              <span class="field-hint">Separate levels with “>”. Missing topics are created on approval.</span>
            </label>
          }
          @for (editor of editors; track editor.key) {
            <div class="field">
              <span class="field-label">{{ editor.label }}</span>
              <quill-editor [name]="editor.key" [(ngModel)]="html[editor.key]" format="html" [valueGetter]="readEditorHtml"
                            [modules]="modules" (onEditorCreated)="labelEditor($event, editor.label)"></quill-editor>
            </div>
          }
          <label class="field"><span>Tags</span>
            <input name="tags" [(ngModel)]="tagsText" placeholder="java, collections" autocomplete="off">
          </label>
          <div class="actions-row">
            <button type="submit" class="btn btn-primary" [disabled]="saving() || uploading()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
          </div>
        </form>
      }
    </app-dialog>
  `,
})
export class CandidateDialogComponent {
  private readonly importsService = inject(ImportsService);
  private readonly mediaService = inject(MediaService);

  readonly open = input(false);
  readonly importId = input.required<number>();
  readonly candidate = input<ImportCandidate | null>(null);
  readonly topicOptions = input<TopicOption[]>([]);
  readonly saved = output<ImportCandidate>();
  readonly closed = output<void>();

  protected readonly itemTypes = ITEM_TYPES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly editors = [
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer' },
    { key: 'notes', label: 'Notes' },
  ] as const;
  protected readonly modules = mediaEditorModules(TOOLBAR, (quill, index, files) => this.uploadImages(quill, index, files));
  protected readonly readEditorHtml = readEditorHtml;
  protected readonly labelEditor = labelEditor;

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  private readonly uploadsInProgress = signal(0);
  protected readonly uploading = computed(() => this.uploadsInProgress() > 0);

  protected title = '';
  protected itemType: ItemType = 'QUESTION';
  protected difficulty: Difficulty | null = null;
  protected targetTopicId: number | null = null;
  protected topicPath = '';
  protected tagsText = '';
  protected html: Record<'question' | 'answer' | 'notes', string | null> = { question: null, answer: null, notes: null };

  constructor() {
    effect(() => {
      const candidate = this.candidate();
      if (this.open() && candidate) {
        untracked(() => this.fillFrom(candidate));
      }
    });
  }

  protected save(): void {
    const candidate = this.candidate();
    const title = this.title.trim();
    if (!candidate || this.saving() || this.uploading()) {
      return;
    }
    if (!title) {
      this.saveError.set('Enter a title.');
      return;
    }
    const request: CandidateRequest = {
      itemType: this.itemType,
      title,
      questionHtml: toStoredHtml(this.html.question),
      answerHtml: toStoredHtml(this.html.answer),
      notesHtml: toStoredHtml(this.html.notes),
      difficulty: this.difficulty,
      tags: parseTags(this.tagsText),
      topicPath: this.targetTopicId === null ? this.topicPath.trim() || null : null,
      targetTopicId: this.targetTopicId,
    };
    this.saving.set(true);
    this.saveError.set(null);
    this.importsService.updateCandidate(this.importId(), candidate.id, request).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.saved.emit(updated);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(error, 'Could not save the candidate.'));
      },
    });
  }

  private fillFrom(candidate: ImportCandidate): void {
    this.title = candidate.title;
    this.itemType = candidate.itemType;
    this.difficulty = candidate.difficulty ?? null;
    this.targetTopicId = candidate.targetTopicId ?? null;
    this.topicPath = candidate.suggestedTopicPath ?? '';
    this.tagsText = candidate.tags.join(', ');
    this.html = { question: candidate.questionHtml ?? null, answer: candidate.answerHtml ?? null, notes: candidate.notesHtml ?? null };
    this.saveError.set(null);
    this.uploadError.set(null);
  }

  /** Uploads images one by one and inserts each at the next position. Refused files get no request. */
  private uploadImages(quill: Quill, index: number, files: File[]): void {
    const accepted = files.filter((file) => IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES);
    this.uploadError.set(accepted.length === files.length ? null : 'Some files were not added: use PNG, JPEG, GIF or WebP images up to 5 MB.');
    let position = index;
    this.uploadsInProgress.update((count) => count + accepted.length);
    from(accepted).pipe(
      concatMap((file) => this.mediaService.uploadImage(file, altTextFor(file)).pipe(
        finalize(() => this.uploadsInProgress.update((count) => count - 1)))),
    ).subscribe({
      next: (media) => {
        quill.insertEmbed(position, 'image', media.url, 'user');
        position += 1;
        quill.setSelection(position, 'silent');
      },
      error: (error: unknown) => this.uploadError.set(apiErrorMessage(error, 'Could not upload the image.')),
    });
  }
}
