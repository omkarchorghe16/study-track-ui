import { Component, inject, signal } from '@angular/core';
import { ApiStatus } from '../../core/models/status.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { StatusService } from '../../core/services/status.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { environment } from '../../../environments/environment';

type ConnectionState =
  | { kind: 'loading' }
  | { kind: 'connected'; status: ApiStatus }
  | { kind: 'failed'; message: string };

/**
 * Phase 1 dashboard: shows whether the UI can reach study-track-api through the dev proxy.
 * Progress, the continue card and activity charts are added in phase 4.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ShellComponent],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Your study progress, items due today and where you left off will appear here.</p>
          </div>
          <button type="button" class="chip" (click)="loadStatus()" [disabled]="state().kind === 'loading'">Check API again</button>
        </header>

        <article class="card status-card" aria-labelledby="api-status-title">
          <h2 id="api-status-title" class="eyebrow">API connection</h2>
          <div role="status" aria-live="polite">
            @switch (state().kind) {
              @case ('loading') { <p class="text-muted">Checking the StudyTrack API…</p> }
              @case ('connected') {
                @if (connectedStatus(); as status) {
                  <p><span class="badge up">Connected</span> {{ status.service }} · API {{ status.apiVersion }}</p>
                  <p class="text-muted">Signed in as {{ status.displayName }} (user {{ status.currentUserId }}). Login comes later.</p>
                }
              }
              @case ('failed') { <p><span class="badge down">Not connected</span> {{ failureMessage() }}</p> }
            }
          </div>
          <a class="docs-link" [href]="swaggerUrl" target="_blank" rel="noopener">Open the API's Swagger UI<span class="sr-only"> (opens in a new tab)</span></a>
        </article>
      </section>
    </app-shell>
  `,
  styles: [`
    .status-card{padding:20px;max-width:640px}.status-card h2{margin:0 0 12px}.status-card p{margin:0 0 8px;font-size:14px}
    .badge{margin-right:6px}.docs-link{display:inline-block;margin-top:8px;color:var(--primary);font-size:13px;font-weight:600}
    button.chip:disabled{opacity:.6;cursor:progress}
  `],
})
export class DashboardComponent {
  private readonly statusService = inject(StatusService);

  protected readonly state = signal<ConnectionState>({ kind: 'loading' });
  protected readonly swaggerUrl = `${environment.apiDocsBaseUrl}/swagger-ui.html`;

  constructor() {
    this.loadStatus();
  }

  protected loadStatus(): void {
    this.state.set({ kind: 'loading' });
    this.statusService.getStatus().subscribe({
      next: (status) => this.state.set({ kind: 'connected', status }),
      error: (error: unknown) =>
        this.state.set({ kind: 'failed', message: apiErrorMessage(error, 'Could not load the API status.') }),
    });
  }

  protected connectedStatus(): ApiStatus | null {
    const current = this.state();
    return current.kind === 'connected' ? current.status : null;
  }

  protected failureMessage(): string {
    const current = this.state();
    return current.kind === 'failed' ? current.message : '';
  }
}
