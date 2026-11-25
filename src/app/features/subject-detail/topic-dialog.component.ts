import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import { Topic, TopicNode, findTopicNode, flattenTopics, subtreeIds } from '../../core/models/topic.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { TopicsService } from '../../core/services/topics.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';

/**
 * Creates a topic (under `parentId`, or top level), or renames and moves `topic` when one is given.
 * Moving puts the topic after its new siblings.
 */
@Component({
  selector: 'app-topic-dialog',
  standalone: true,
  imports: [DialogComponent, FormsModule],
  template: `
    <app-dialog [open]="open()" [heading]="topic() ? 'Edit topic' : 'New topic'" (closed)="closed.emit()">
      <form (ngSubmit)="save()">
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
        <label class="field"><span>Name</span>
          <input name="name" [(ngModel)]="name" required maxlength="200" placeholder="Spring Security" autocomplete="off">
        </label>
        <label class="field"><span>Parent topic</span>
          <select name="parent" [(ngModel)]="parentId">
            <option [ngValue]="null">None (top level)</option>
            @for (option of parentOptions(); track option.id) {
              <option [ngValue]="option.id">{{ '  '.repeat(option.depth) + option.name }}</option>
            }
          </select>
        </label>
        <div class="actions-row end">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving() || !name.trim()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </app-dialog>
  `,
  styles: [`.end{justify-content:flex-end}`],
})
export class TopicDialogComponent {
  private readonly topicsService = inject(TopicsService);

  readonly open = input(false);
  readonly subjectId = input.required<number>();
  readonly tree = input.required<TopicNode[]>();
  /** The topic being edited, or null to create one. */
  readonly topic = input<TopicNode | null>(null);
  /** Pre-selected parent when creating. */
  readonly initialParentId = input<number | null>(null);
  readonly saved = output<Topic>();
  readonly closed = output<void>();

  protected name = '';
  protected parentId: number | null = null;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Every topic except the edited one and its subtopics, which cannot become its parent. */
  protected readonly parentOptions = computed(() => {
    const topic = this.topic();
    const excluded = new Set(topic ? subtreeIds(topic) : []);
    return flattenTopics(this.tree()).filter((option) => !excluded.has(option.id));
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        const topic = this.topic();
        this.name = topic?.name ?? '';
        this.parentId = topic ? topic.parentId ?? null : this.initialParentId();
        this.error.set(null);
      }
    });
  }

  protected save(): void {
    const name = this.name.trim();
    if (!name || this.saving()) {
      return;
    }
    this.saving.set(true);
    const topic = this.topic();
    const request$: Observable<Topic> = topic ? this.updateTopic(topic, name) : this.topicsService.createTopic({
      subjectId: this.subjectId(),
      parentId: this.parentId,
      name,
    });
    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error, 'Could not save the topic.'));
      },
    });
  }

  private updateTopic(topic: TopicNode, name: string): Observable<Topic> {
    const newParentId = this.parentId;
    const parentChanged = newParentId !== (topic.parentId ?? null);
    return this.topicsService.replaceTopic(topic.id, { name, descriptionHtml: topic.descriptionHtml ?? null }).pipe(
      switchMap((replaced) => parentChanged
        ? this.topicsService.moveTopic(topic.id, { parentId: newParentId, sortOrder: this.nextSortOrder(newParentId) })
        : of(replaced)),
    );
  }

  private nextSortOrder(parentId: number | null): number {
    const siblings = parentId === null
      ? this.tree()
      : findTopicNode(this.tree(), parentId)?.children ?? [];
    return siblings.reduce((max, sibling) => Math.max(max, sibling.sortOrder + 1), 0);
  }
}

