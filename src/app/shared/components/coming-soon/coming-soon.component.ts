import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellComponent } from '../shell/shell.component';

/** Placeholder for a route whose page is built in a later phase. Inputs come from the route's data. */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [ShellComponent, RouterLink],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <p class="eyebrow">Phase {{ phase() }}</p>
            <h1>{{ heading() }}</h1>
            <p>{{ summary() }}</p>
          </div>
        </header>
        <div class="card placeholder">
          <p>This page is not built yet. It arrives in phase {{ phase() }} of the build plan.</p>
          <a routerLink="/dashboard">Back to the dashboard</a>
        </div>
      </section>
    </app-shell>
  `,
  styles: [`
    .placeholder{padding:22px;color:var(--muted);font-size:14px}.placeholder p{margin:0 0 12px}
    .placeholder a{color:var(--primary);font-weight:600}
  `],
})
export class ComingSoonComponent {
  readonly heading = input('');
  readonly phase = input<number | null>(null);
  readonly summary = input('');
}
