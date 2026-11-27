import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DIFFICULTIES, Difficulty, StudyItem } from '../../core/models/item.models';
import { TopicNode, flattenTopics } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ItemsService } from '../../core/services/items.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { plainTextToHtml } from '../../shared/editor/editor-html';

const MAX_TITLE_LENGTH = 300;

/** Quick way to add one question with its answer to a topic of the subject, without leaving the page. */
@Component({
  selector: 'app-quick-question-dialog',
  standalone: true,
  imports: [DialogComponent, FormsModule, RouterLink],
  template: `
    <app-dialog [open]="open()" heading="Add a question" (closed)="closed.emit()">
      @if (topicOptions().length === 0) {
        <p>This subject has no topics yet. Add a topic first, then add questions to it.</p>
        <div class="actions-row end"><button type="button" class="btn btn-primary" (click)="closed.emit()">OK</button></div>
      } @else {
        <form (ngSubmit)="save(false)">
          @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
          <label class="field"><span>Topic</span>
            <select name="topic" [(ngModel)]="topicId">
              @for (option of topicOptions(); track option.id) {
                <option [ngValue]="option.id">{{ '  '.repeat(option.depth) + option.name }}</option>
              }
            </select>
          </label>
          <label class="field"><span>Question</span>
            <textarea name="question" [(ngModel)]="question" required rows="3" maxlength="5000" placeholder="What is the difference between ArrayList and LinkedList?"></textarea>
          </label>
          <label class="field"><span>Answer (optional)</span>
            <textarea name="answer" [(ngModel)]="answer" rows="6" maxlength="20000" placeholder="Leave a blank line between paragraphs."></textarea>
            <span class="field-hint">Plain text. For formatting, code or images use the <a [routerLink]="['/items/new']" [queryParams]="{ topicId: topicId }">full editor</a>.</span>
          </label>
          <label class="field"><span>Difficulty</span>
            <select name="difficulty" [(ngModel)]="difficulty">
              @for (option of difficulties; track option.value) {
                <option [ngValue]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>
          <div class="actions-row end">
            <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancel</button>
            <button type="button" class="btn" [disabled]="!canSave()" (click)="save(true)">Save and add another</button>
            <button type="submit" class="btn btn-primary" [disabled]="!canSave()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          </div>
        </form>
      }
    </app-dialog>
  `,
  styles: [`.end{justify-content:flex-end}`],
})
export class QuickQuestionDialogComponent {
  private readonly itemsService = inject(ItemsService);

  readonly open = input(false);
  readonly tree = input.required<TopicNode[]>();
  /** Topic to pre-select, usually the one open on the page; the first topic when null. */
  readonly initialTopicId = input<number | null>(null);
  /** Emitted after every saved question; the dialog stays open for "Save and add another". */
  readonly saved = output<StudyItem>();
  readonly closed = output<void>();

  protected readonly difficulties = DIFFICULTIES;
  protected readonly topicOptions = computed(() => flattenTopics(this.tree()));
  protected topicId: number | null = null;
  protected question = '';
  protected answer = '';
  protected difficulty: Difficulty = 'MEDIUM';
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        const options = this.topicOptions();
        const wanted = this.initialTopicId();
        this.topicId = options.find((option) => option.id === wanted)?.id ?? options[0]?.id ?? null;
        this.question = '';
        this.answer = '';
        this.difficulty = 'MEDIUM';
        this.error.set(null);
      }
    });
  }

  protected canSave(): boolean {
    return !this.saving() && this.topicId !== null && this.question.trim().length > 0;
  }

  protected save(addAnother: boolean): void {
    if (!this.canSave() || this.topicId === null) {
      return;
    }
    const question = this.question.trim();
    this.saving.set(true);
    this.error.set(null);
    this.itemsService.createItem({
      topicId: this.topicId,
      itemType: 'QUESTION',
      title: question.replace(/\s+/g, ' ').slice(0, MAX_TITLE_LENGTH),
      questionHtml: plainTextToHtml(question),
      answerHtml: plainTextToHtml(this.answer),
      notesHtml: null,
      difficulty: this.difficulty,
      tags: [],
    }).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.saved.emit(item);
        if (addAnother) {
          this.question = '';
          this.answer = '';
        } else {
          this.closed.emit();
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error, 'Could not save the question.'));
      },
    });
  }
}
