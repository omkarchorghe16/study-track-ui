import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Subscription, switchMap, takeWhile, timer } from 'rxjs';
import { PrefillStatus } from '../../core/models/explanation.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ExplanationsService } from '../../core/services/explanations.service';
import { ToastService } from '../../core/services/toast.service';

const POLL_MS = 3000;

/**
 * Admin-only panel: writes the AI explanations of the catalog's questions once, so users find them saved. The AI is
 * only called when this button is pressed, one question at a time and slowly enough for a free API key.
 */
@Component({
  selector: 'app-catalog-explanations',
  standalone: true,
  template: `
    <section class="card panel" aria-labelledby="prefill-heading">
      <h2 id="prefill-heading"><span aria-hidden="true">✨</span> AI explanations for the catalog</h2>
      <p class="text-muted">
        Writes the detailed explanation of each catalog question once and saves it for everyone, so users read it from the
        database instead of waiting for the AI. It runs in the background, one question at a time, and only writes the
        missing ones. It uses the provider and model on the Settings page; with a free key it can stop at a rate or daily
        limit, then you simply start it again later.
      </p>
      @if (status(); as current) {
        <p role="status" class="state">
          <b>{{ current.questions - current.missing }}</b> of <b>{{ current.questions }}</b> catalog questions have a saved explanation.
          @if (current.state === 'RUNNING') {
            Writing now: {{ current.completed + current.failed }} of {{ current.total }} done{{ current.failed ? ' (' + current.failed + ' failed)' : '' }}.
          }
        </p>
        @if (current.state === 'FAILED') {
          <p class="load-error" role="alert">The run stopped: {{ current.message }}</p>
        }
        <button type="button" class="btn btn-primary" [disabled]="current.state === 'RUNNING' || current.missing === 0 || starting()" (click)="start()">
          {{ current.state === 'RUNNING' ? 'Writing…' : current.missing === 0 ? 'All catalog questions are explained' : (current.completed || current.state === 'FAILED' ? 'Continue' : 'Pre-fill') + ' with AI (' + current.missing + ' left)' }}
        </button>
      }
      @if (error()) { <p class="load-error" role="alert">{{ error() }}</p> }
    </section>
  `,
  styles: [`
    .panel{padding:18px;margin-top:24px}.panel h2{margin:0 0 6px;font-size:1rem}.panel p{margin:0 0 12px;font-size:.82rem}.state{font-size:.84rem}
  `],
})
export class CatalogExplanationsComponent {
  private readonly explanationsService = inject(ExplanationsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private polling: Subscription | null = null;

  protected readonly status = signal<PrefillStatus | null>(null);
  protected readonly starting = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
    this.explanationsService.getCatalogPrefillStatus().subscribe({
      // A run started earlier keeps being followed.
      next: (status) => this.follow(status),
      error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not read the pre-fill status.')),
    });
  }

  protected start(): void {
    this.starting.set(true);
    this.error.set(null);
    this.explanationsService.startCatalogPrefill().subscribe({
      next: (status) => {
        this.starting.set(false);
        this.follow(status);
      },
      error: (error: unknown) => {
        this.starting.set(false);
        this.error.set(apiErrorMessage(error, 'Could not start the pre-fill.'));
      },
    });
  }

  /** Shows the status and, while the run is going, asks for its progress every few seconds. */
  private follow(first: PrefillStatus): void {
    this.polling?.unsubscribe();
    this.status.set(first);
    if (first.state !== 'RUNNING') {
      return;
    }
    this.polling = timer(POLL_MS, POLL_MS).pipe(
      switchMap(() => this.explanationsService.getCatalogPrefillStatus()),
      takeWhile((status) => status.state === 'RUNNING', true),
    ).subscribe({
      next: (status) => {
        this.status.set(status);
        if (status.state === 'COMPLETED') {
          this.toastService.showSuccess(`${status.completed} explanations written.`);
        }
      },
      error: () => undefined,
    });
  }
}
