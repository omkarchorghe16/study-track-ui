import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ResumePoint } from '../../core/models/progress.models';
import { StatsOverview } from '../../core/models/stats.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ProgressService } from '../../core/services/progress.service';
import { StatsService } from '../../core/services/stats.service';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { environment } from '../../../environments/environment';
import { ActivityChartComponent } from './activity-chart.component';
import { ProgressRingComponent } from './progress-ring.component';

/**
 * Overall progress, "continue where you left off", flashcards due today with the streak, progress per
 * subject and reviews over the last 30 days. Numbers come from GET /stats/overview.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ShellComponent, RouterLink, ProgressBarComponent, ProgressRingComponent, ActivityChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly statsService = inject(StatsService);
  private readonly progressService = inject(ProgressService);

  protected readonly stats = signal<StatsOverview | null>(null);
  protected readonly resume = signal<ResumePoint | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly swaggerUrl = `${environment.apiDocsBaseUrl}/swagger-ui.html`;

  protected readonly activeSubjects = computed(() => (this.stats()?.subjects ?? []).filter((subject) => !subject.archived));
  protected readonly subjectsToStudy = computed(() =>
    this.activeSubjects().filter((subject) => subject.dueCount + subject.newCount > 0));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin([this.statsService.getOverview(), this.progressService.getResumePoint()]).subscribe({
      next: ([stats, resume]) => {
        this.stats.set(stats);
        this.resume.set(resume);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not load your progress.'));
      },
    });
  }

  /** The item if one was opened, else the topic, else the subject. */
  protected continueLink(resume: ResumePoint): (string | number)[] {
    return resume.itemId ? ['/items', resume.itemId] : ['/subjects', resume.subjectId];
  }

  protected continueQuery(resume: ResumePoint): Record<string, number> | null {
    return !resume.itemId && resume.topicId ? { topic: resume.topicId } : null;
  }
}
