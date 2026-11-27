import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogSubject, CatalogTopicNode, CatalogTrack } from '../../core/models/catalog.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { UsersService } from '../../core/services/users.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';
import { CatalogImportComponent } from './catalog-import.component';

/** Browse the shared catalog (track, subject, topics) and add a subject, with its topics, to your own. */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [ShellComponent, RouterLink, NgTemplateOutlet, CatalogImportComponent],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <h1>Catalog</h1>
            <p>Pick a track, preview its subjects and topics, and add the ones you want to study to your subjects. Starter questions and answers come with them.</p>
          </div>
        </header>

        @if (loadError()) {
          <p class="load-error" role="alert">{{ loadError() }} <button type="button" class="btn btn-small" (click)="loadTracks()">Retry</button></p>
        }
        @if (loadingTracks()) {
          <p class="text-muted" role="status">Loading the catalog…</p>
        } @else if (!loadError() && tracks().length === 0) {
          <div class="card empty-state"><p>The catalog is empty.@if (isAdmin()) { Import a CSV below to add tracks, subjects and topics. }</p></div>
        } @else if (tracks().length) {
          <label class="field track-field"><span>Track</span>
            <select [value]="selectedTrackId()" (change)="selectTrack($event)">
              @for (track of tracks(); track track.id) {
                <option [value]="track.id" [selected]="track.id === selectedTrackId()">{{ track.name }} ({{ track.subjectCount }} subjects)</option>
              }
            </select>
          </label>

          @if (subjectsError()) {
            <p class="load-error" role="alert">{{ subjectsError() }}</p>
          }
          @if (loadingSubjects()) {
            <p class="text-muted" role="status">Loading subjects…</p>
          } @else {
            <ul class="subject-grid">
              @for (subject of subjects(); track subject.id) {
                <li class="card subject-card" [class.previewing]="subject.id === previewId()">
                  <span class="subject-name"><span aria-hidden="true">{{ subject.icon || '📘' }}</span> {{ subject.name }}</span>
                  <p class="subject-counts">{{ subject.topicCount }} topics · {{ subject.questionCount }} questions</p>
                  <div class="actions-row">
                    <button type="button" class="btn btn-small" [attr.aria-expanded]="subject.id === previewId()"
                            [attr.aria-label]="(subject.id === previewId() ? 'Hide topics of ' : 'Preview topics of ') + subject.name"
                            (click)="togglePreview(subject)">{{ subject.id === previewId() ? 'Hide topics' : 'Preview topics' }}</button>
                    @if (subject.copiedSubjectId) {
                      <a class="btn btn-small btn-success" [routerLink]="['/subjects', subject.copiedSubjectId]" [attr.aria-label]="'Open your ' + subject.name">✓ Added · Open</a>
                    } @else {
                      <button type="button" class="btn btn-small btn-primary" [disabled]="enrollingId() === subject.id"
                              [attr.aria-label]="'Add ' + subject.name + ' to my subjects'" (click)="enroll(subject)">
                        {{ enrollingId() === subject.id ? 'Adding…' : 'Add to my subjects' }}
                      </button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="text-muted">This track has no subjects yet.</li>
              }
            </ul>
          }

          @if (previewSubject(); as subject) {
            <section class="card preview" aria-labelledby="preview-heading">
              <h2 id="preview-heading">{{ subject.name }}: topics</h2>
              @if (loadingTopics()) {
                <p class="text-muted" role="status">Loading topics…</p>
              } @else if (topicsError()) {
                <p class="load-error" role="alert">{{ topicsError() }}</p>
              } @else {
                <ng-template #branch let-nodes>
                  <ul class="topic-list">
                    @for (node of nodes; track node.id) {
                      <li>
                        @if (node.children.length) {
                          <details><summary>{{ node.name }} <span class="text-muted">({{ node.children.length }})</span></summary>
                            <ng-container *ngTemplateOutlet="branch; context: { $implicit: node.children }"></ng-container>
                          </details>
                        } @else {
                          <span class="leaf">{{ node.name }}</span>
                        }
                      </li>
                    }
                  </ul>
                </ng-template>
                @if (topics().length) {
                  <ng-container *ngTemplateOutlet="branch; context: { $implicit: topics() }"></ng-container>
                } @else {
                  <p class="text-muted">—</p>
                }
              }
            </section>
          }
        }

        @if (isAdmin()) {
          <app-catalog-import (imported)="loadTracks()"></app-catalog-import>
        }
      </section>
    </app-shell>
  `,
  styles: [`
    .track-field{max-width:420px}
    .subject-grid{list-style:none;margin:0 0 20px;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
    .subject-card{display:flex;flex-direction:column;gap:8px;padding:18px}.subject-card.previewing{border-color:var(--accent)}
    .subject-name{font-weight:700}.subject-counts{margin:0;color:var(--muted);font-size:.75rem}
    .preview{padding:18px}.preview h2{margin:0 0 10px;font-size:1rem}
    .topic-list{list-style:none;margin:0;padding-left:18px;font-size:.84rem}.topic-list li{margin:4px 0}
    .preview>.topic-list{padding-left:0}.topic-list summary{cursor:pointer}.leaf::before{content:'• ';color:var(--muted)}
  `],
})
export class CatalogComponent {
  private readonly catalogService = inject(CatalogService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  protected readonly tracks = signal<CatalogTrack[]>([]);
  protected readonly selectedTrackId = signal<number | null>(null);
  protected readonly subjects = signal<CatalogSubject[]>([]);
  protected readonly previewId = signal<number | null>(null);
  protected readonly topics = signal<CatalogTopicNode[]>([]);
  protected readonly isAdmin = signal(false);
  protected readonly enrollingId = signal<number | null>(null);

  protected readonly loadingTracks = signal(true);
  protected readonly loadingSubjects = signal(false);
  protected readonly loadingTopics = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly subjectsError = signal<string | null>(null);
  protected readonly topicsError = signal<string | null>(null);
  protected readonly previewSubject = computed(() => this.subjects().find((subject) => subject.id === this.previewId()) ?? null);

  constructor() {
    this.loadTracks();
    // The admin panel is optional: if this fails the page simply stays read-only.
    this.usersService.getCurrentUser().subscribe({ next: (user) => this.isAdmin.set(user.admin), error: () => this.isAdmin.set(false) });
  }

  protected loadTracks(): void {
    this.loadingTracks.set(true);
    this.loadError.set(null);
    this.catalogService.listTracks().subscribe({
      next: (tracks) => {
        this.tracks.set(tracks);
        this.loadingTracks.set(false);
        const current = this.selectedTrackId();
        const keep = tracks.find((track) => track.id === current) ?? tracks[0];
        if (keep) {
          this.selectedTrackId.set(keep.id);
          this.loadSubjects(keep.id);
        } else {
          this.selectedTrackId.set(null);
          this.subjects.set([]);
        }
      },
      error: (error: unknown) => {
        this.loadingTracks.set(false);
        this.loadError.set(apiErrorMessage(error, 'Could not load the catalog.'));
      },
    });
  }

  protected selectTrack(event: Event): void {
    const trackId = Number((event.target as HTMLSelectElement).value);
    this.selectedTrackId.set(trackId);
    this.previewId.set(null);
    this.loadSubjects(trackId);
  }

  protected togglePreview(subject: CatalogSubject): void {
    if (this.previewId() === subject.id) {
      this.previewId.set(null);
      return;
    }
    this.previewId.set(subject.id);
    this.topics.set([]);
    this.topicsError.set(null);
    this.loadingTopics.set(true);
    this.catalogService.listSubjectTopics(subject.id).subscribe({
      next: (topics) => {
        if (this.previewId() === subject.id) {
          this.topics.set(topics);
          this.loadingTopics.set(false);
        }
      },
      error: (error: unknown) => {
        this.loadingTopics.set(false);
        this.topicsError.set(apiErrorMessage(error, 'Could not load the topics.'));
      },
    });
  }

  protected enroll(subject: CatalogSubject): void {
    this.enrollingId.set(subject.id);
    this.catalogService.enrollInSubject(subject.id).subscribe({
      next: (added) => {
        this.enrollingId.set(null);
        this.toastService.showSuccess(`“${added.name}” added with ${added.topicCount} topics and ${added.itemCount} questions.`);
        this.subjects.update((subjects) => subjects.map((each) => (each.id === subject.id ? { ...each, copiedSubjectId: added.id } : each)));
      },
      error: (error: unknown) => {
        this.enrollingId.set(null);
        this.toastService.showError(apiErrorMessage(error, `Could not add “${subject.name}”.`));
      },
    });
  }

  private loadSubjects(trackId: number): void {
    this.loadingSubjects.set(true);
    this.subjectsError.set(null);
    this.catalogService.listTrackSubjects(trackId).subscribe({
      next: (subjects) => {
        if (this.selectedTrackId() === trackId) {
          this.subjects.set(subjects);
          this.loadingSubjects.set(false);
        }
      },
      error: (error: unknown) => {
        this.loadingSubjects.set(false);
        this.subjectsError.set(apiErrorMessage(error, 'Could not load the subjects of this track.'));
      },
    });
  }
}
