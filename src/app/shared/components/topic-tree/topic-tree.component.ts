import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { TopicNode } from '../../../core/models/topic.models';

/**
 * A subject's topic tree as nested lists. Selecting a topic, and the add/edit/delete actions on each
 * row, are reported to the parent page, which owns the data.
 */
@Component({
  selector: 'app-topic-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #branch let-nodes>
      <ul class="tree-list">
        @for (node of nodes; track node.id) {
          <li>
            <div class="tree-row" [class.selected]="node.id === selectedId()">
              @if (node.children.length) {
                <button type="button" class="icon-btn toggle" [attr.aria-expanded]="!isCollapsed(node.id)"
                        [attr.aria-label]="(isCollapsed(node.id) ? 'Expand ' : 'Collapse ') + node.name"
                        (click)="toggle(node.id)">{{ isCollapsed(node.id) ? '▸' : '▾' }}</button>
              } @else {
                <span class="toggle-spacer" aria-hidden="true"></span>
              }
              <button type="button" class="topic-name" [attr.title]="node.name" [attr.aria-current]="node.id === selectedId() ? 'true' : null"
                      (click)="selected.emit(node.id)">
                <span class="name-text">
                  @if (node.completed) {
                    <span class="check" title="Marked complete" aria-label="Marked complete">✓</span>
                  } @else if (node.allItemsDone) {
                    <span class="check hint" title="All items done" aria-label="All items done">✓</span>
                  }
                  {{ node.name }}
                </span>
                <span class="count" [attr.aria-label]="node.totalDoneCount + ' of ' + node.totalItemCount + ' items done'">
                  @if (node.totalItemCount) { {{ node.percentDone }}% · } {{ node.totalItemCount }}
                </span>
              </button>
              <span class="row-actions">
                <button type="button" class="icon-btn" [attr.aria-label]="'Add subtopic to ' + node.name" (click)="addChild.emit(node)">＋</button>
                <button type="button" class="icon-btn" [attr.aria-label]="'Edit ' + node.name" (click)="edit.emit(node)">✎</button>
                <button type="button" class="icon-btn" [attr.aria-label]="'Delete ' + node.name" (click)="remove.emit(node)">🗑</button>
              </span>
            </div>
            @if (node.children.length && !isCollapsed(node.id)) {
              <ng-container *ngTemplateOutlet="branch; context: { $implicit: node.children }"></ng-container>
            }
          </li>
        }
      </ul>
    </ng-template>
    <ng-container *ngTemplateOutlet="branch; context: { $implicit: nodes() }"></ng-container>
  `,
  styles: [`
    .tree-list{list-style:none;margin:0;padding:0}.tree-list .tree-list{padding-left:16px}
    .tree-row{display:flex;align-items:center;gap:2px;border-radius:7px}.tree-row:hover,.tree-row.selected{background:var(--overlay-1)}
    .tree-row.selected .topic-name{color:var(--accent)}
    .toggle-spacer{width:28px;flex:none}.toggle{flex:none}
    .topic-name{flex:1;min-width:0;display:flex;justify-content:space-between;gap:8px;padding:7px 6px;border:0;background:none;color:var(--text);font-size:.84rem;text-align:left}
    .name-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .check{color:var(--positive);font-weight:700;margin-right:2px}.check.hint{opacity:.55}
    .count{flex:none;color:var(--muted);font-size:.72rem}
    .row-actions{display:flex;opacity:.35}.tree-row:hover .row-actions,.tree-row:focus-within .row-actions{opacity:1}
    .row-actions .icon-btn{width:24px;height:24px;font-size:.78rem}
  `],
})
export class TopicTreeComponent {
  readonly nodes = input.required<TopicNode[]>();
  readonly selectedId = input<number | null>(null);
  readonly selected = output<number>();
  readonly addChild = output<TopicNode>();
  readonly edit = output<TopicNode>();
  readonly remove = output<TopicNode>();

  private readonly collapsedIds = signal<ReadonlySet<number>>(new Set());

  protected isCollapsed(topicId: number): boolean {
    return this.collapsedIds().has(topicId);
  }

  protected toggle(topicId: number): void {
    this.collapsedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(topicId)) {
        next.add(topicId);
      }
      return next;
    });
  }
}
