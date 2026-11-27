import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Explanation, ExplanationContent } from '../../core/models/explanation.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ExplanationsService } from '../../core/services/explanations.service';
import { UsersService } from '../../core/services/users.service';
import { ExplanationViewComponent } from '../../shared/components/explanation-view/explanation-view.component';

/**
 * Under an opened question's answer: the saved AI explanation. It is looked up when the question is opened; only
 * when none is saved yet the server asks the AI once and saves the result for all users. An admin can rewrite it.
 */
@Component({
  selector: 'app-explanation-panel',
  standalone: true,
  imports: [ExplanationViewComponent],
  template: `
    <section class="panel" aria-label="Detailed explanation">
      @if (explanation(); as current) {
        <div class="panel-head">
          <h3><span aria-hidden="true">✨</span> Detailed explanation</h3>
          <span class="text-muted by">AI · {{ current.model }}</span>
          @if (isAdmin()) {
            <button type="button" class="btn btn-small btn-ghost" [disabled]="busy()" (click)="rewrite()">{{ busy() ? 'Rewriting…' : 'Rewrite' }}</button>
          }
        </div>
        <app-explanation-view [content]="current.content"></app-explanation-view>
      } @else if (busy()) {
        <p class="text-muted" role="status"><span aria-hidden="true">✨</span> {{ writing() ? 'Writing a detailed explanation with AI. This happens once for this question and is then saved for everyone; it can take up to a minute.' : 'Looking for a detailed explanation…' }}</p>
      } @else if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
        <button type="button" class="btn btn-small" (click)="loadOrWrite()">Try again</button>
      }
    </section>
  `,
  styles: [`
    .panel{margin-top:14px;padding-top:12px;border-top:1px dashed var(--border)}.panel p{margin:0 0 8px;font-size:.84rem}
    .panel-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:10px}.panel-head h3{margin:0;font-size:.9rem}.by{font-size:.74rem}.panel-head .btn-ghost{margin-left:auto}
  `],
})
export class ExplanationPanelComponent {
  private readonly explanationsService = inject(ExplanationsService);
  private readonly usersService = inject(UsersService);

  readonly itemId = input.required<number>();
  /** Emitted when the explanation is known (or null when it could not be loaded), for reading it aloud. */
  readonly loaded = output<ExplanationContent | null>();

  protected readonly explanation = signal<Explanation | null>(null);
  protected readonly busy = signal(true);
  /** True while the AI is writing, as opposed to only looking for a saved explanation. */
  protected readonly writing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isAdmin = signal(false);

  constructor() {
    this.usersService.getCurrentUser().subscribe({ next: (user) => this.isAdmin.set(user.admin), error: () => this.isAdmin.set(false) });
    effect(() => {
      this.itemId();
      untracked(() => this.loadOrWrite());
    });
  }

  /** Reads the saved explanation; when there is none, asks the server to write it (the one AI call). */
  protected loadOrWrite(): void {
    const itemId = this.itemId();
    this.busy.set(true);
    this.writing.set(false);
    this.error.set(null);
    this.explanationsService.getExplanation(itemId).subscribe({
      next: (saved) => {
        if (saved) {
          this.show(saved);
        } else {
          this.write(itemId);
        }
      },
      error: (error: unknown) => this.fail(error, 'Could not load the detailed explanation.'),
    });
  }

  protected rewrite(): void {
    const itemId = this.itemId();
    this.busy.set(true);
    this.error.set(null);
    this.explanationsService.deleteExplanation(itemId).subscribe({
      next: () => this.write(itemId),
      error: (error: unknown) => this.fail(error, 'Could not remove the old explanation.'),
    });
  }

  private write(itemId: number): void {
    this.writing.set(true);
    this.explanationsService.findOrCreateExplanation(itemId).subscribe({
      next: (explanation) => this.show(explanation),
      error: (error: unknown) => this.fail(error, 'Could not write the explanation.'),
    });
  }

  private show(explanation: Explanation): void {
    this.explanation.set(explanation);
    this.busy.set(false);
    this.writing.set(false);
    this.loaded.emit(explanation.content);
  }

  private fail(error: unknown, fallback: string): void {
    this.busy.set(false);
    this.writing.set(false);
    this.error.set(apiErrorMessage(error, fallback));
    this.loaded.emit(this.explanation()?.content ?? null);
  }
}
