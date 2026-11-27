import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Explanation } from '../../core/models/explanation.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ExplanationsService } from '../../core/services/explanations.service';
import { ExplanationViewComponent } from '../../shared/components/explanation-view/explanation-view.component';

/** Under a question's answer: the AI explanation if there is one, otherwise a button to write it. */
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
          <button type="button" class="btn btn-small btn-ghost" [disabled]="generating()" (click)="generate()">{{ generating() ? 'Rewriting…' : 'Rewrite' }}</button>
        </div>
        <app-explanation-view [content]="current.content"></app-explanation-view>
      } @else if (loading()) {
        <p class="text-muted" role="status">Checking for a detailed explanation…</p>
      } @else {
        <div class="panel-head">
          <button type="button" class="btn btn-small btn-primary" [disabled]="generating()" (click)="generate()">
            <span aria-hidden="true">✨</span> {{ generating() ? 'Asking the AI…' : 'Explain in detail with AI' }}
          </button>
          <span class="text-muted by" [attr.role]="generating() ? 'status' : null">
            {{ generating() ? 'This can take up to a minute.' : 'Examples, a real-world case and tips. Your own answer stays as it is.' }}
          </span>
        </div>
      }
      @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: [`
    .panel{margin-top:14px;padding-top:12px;border-top:1px dashed var(--border)}
    .panel-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:10px}.panel-head h3{margin:0;font-size:.9rem}.by{font-size:.74rem}.panel-head .btn-ghost{margin-left:auto}
  `],
})
export class ExplanationPanelComponent {
  private readonly explanationsService = inject(ExplanationsService);

  readonly itemId = input.required<number>();
  /** Changes when explanations were written elsewhere (the "explain all" run), so this panel looks again. */
  readonly reloadKey = input(0);

  protected readonly explanation = signal<Explanation | null>(null);
  protected readonly loading = signal(true);
  protected readonly generating = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const itemId = this.itemId();
      this.reloadKey();
      untracked(() => this.load(itemId));
    });
  }

  protected generate(): void {
    this.generating.set(true);
    this.error.set(null);
    this.explanationsService.generateExplanation(this.itemId()).subscribe({
      next: (explanation) => {
        this.explanation.set(explanation);
        this.generating.set(false);
      },
      error: (error: unknown) => {
        this.generating.set(false);
        this.error.set(apiErrorMessage(error, 'Could not write the explanation.'));
      },
    });
  }

  private load(itemId: number): void {
    this.loading.set(true);
    this.explanationsService.getExplanation(itemId).subscribe({
      next: (explanation) => {
        if (itemId === this.itemId()) {
          this.explanation.set(explanation);
          this.loading.set(false);
        }
      },
      error: () => {
        // Not being able to look is not worth an error; the button still works.
        this.loading.set(false);
      },
    });
  }
}
