import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject as RxSubject, catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { difficultyLabel, itemStatusLabel, itemTypeLabel } from '../../core/models/item.models';
import { SearchPage, SearchResult } from '../../core/models/search.models';
import { Subject } from '../../core/models/subject.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { SearchService } from '../../core/services/search.service';
import { SubjectsService } from '../../core/services/subjects.service';
import { ShellComponent } from '../../shared/components/shell/shell.component';

const PAGE_SIZE = 20;
const TYPING_DELAY_MS = 300;

interface SearchRequest {
  query: string;
  subjectId: number | null;
  page: number;
}

/**
 * Full-text search over all items (`/search?q=&subject=`). Typing updates the URL after a short pause,
 * so results can be bookmarked and the back button works. Matching words in snippets are highlighted
 * from the API's snippet parts, never from HTML.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ShellComponent, RouterLink, FormsModule],
  template: `
    <app-shell>
      <section class="page-shell">
        <header class="page-header">
          <div>
            <h1>Search</h1>
            <p>Find any question, answer or note. Every word must match; “hash” also finds “HashMap”.</p>
          </div>
        </header>

        <form class="card search-bar" role="search" (ngSubmit)="submitSearch()">
          <label class="field query-field"><span>Search for</span>
            <input #queryInput type="search" name="q" [(ngModel)]="queryText" (ngModelChange)="typed$.next()" maxlength="200"
                   placeholder="e.g. hashmap buckets" autocomplete="off">
          </label>
          <label class="field"><span>Subject</span>
            <select name="subject" [ngModel]="subject() ?? null" (ngModelChange)="changeSubject($event)">
              <option [ngValue]="null">All subjects</option>
              @for (option of subjects(); track option.id) { <option [ngValue]="option.id">{{ option.name }}</option> }
            </select>
          </label>
        </form>

        @if (searchError()) {
          <p class="load-error" role="alert">{{ searchError() }} <button type="button" class="btn btn-small" (click)="retry()">Retry</button></p>
        }
        <p class="text-muted result-count" role="status" aria-live="polite">{{ statusText() }}</p>

        @if (!q()) {
          <div class="card empty-state"><p>Type a word or two to search all your subjects.</p></div>
        } @else if (!searching() && !searchError() && totalItems() === 0) {
          <div class="card empty-state">
            <p>Nothing matches “{{ q() }}”{{ subject() ? ' in this subject' : '' }}.</p>
            <p>Try fewer or shorter words{{ subject() ? ', or search all subjects' : '' }}.</p>
          </div>
        } @else {
          <ol class="results">
            @for (result of results(); track result.itemId) {
              <li class="card result">
                <a class="result-title" [routerLink]="['/items', result.itemId]">{{ result.title }}</a>
                <p class="result-path">
                  <a [routerLink]="['/subjects', result.subjectId]">{{ result.subjectName }}</a> ›
                  <a [routerLink]="['/subjects', result.subjectId]" [queryParams]="{ topic: result.topicId }">{{ result.topicName }}</a>
                </p>
                @if (result.snippet.length) {
                  <p class="snippet">@for (part of result.snippet; track $index) {@if (part.match) {<mark>{{ part.text }}</mark>} @else {{{ part.text }}}}</p>
                }
                <div class="result-meta">
                  <span class="tag-chip">{{ itemTypeLabel(result.itemType) }}</span>
                  <span [class]="'badge ' + result.difficulty.toLowerCase()">{{ difficultyLabel(result.difficulty) }}</span>
                  <span class="status-pill" [class.learning]="result.status === 'LEARNING'" [class.done]="result.status === 'DONE'">{{ itemStatusLabel(result.status) }}</span>
                </div>
              </li>
            }
          </ol>
          @if (results().length < totalItems()) {
            <button type="button" class="btn" [disabled]="searching()" (click)="loadMore()">{{ searching() ? 'Loading…' : 'Show more results' }}</button>
          }
        }
      </section>
    </app-shell>
  `,
  styles: [`
    .search-bar{display:grid;grid-template-columns:minmax(0,1fr) minmax(150px,220px);gap:12px;padding:16px 16px 2px;margin-bottom:12px}
    @media(max-width:620px){.search-bar{grid-template-columns:1fr}}
    .result-count{min-height:1.2em;margin:0 0 10px;font-size:.8rem}
    .results{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:10px}
    .result{display:grid;gap:6px;padding:14px 16px;min-width:0}
    .result-title{font-weight:600;font-size:.95rem;overflow-wrap:anywhere}.result-title:hover{color:var(--accent)}
    .result-path{margin:0;color:var(--muted);font-size:.76rem}.result-path a:hover{color:var(--info-text);text-decoration:underline}
    .snippet{margin:0;font-size:.84rem;line-height:1.55;overflow-wrap:anywhere}
    mark{padding:0 2px;border-radius:3px;background:#f2ca6340;color:inherit}
    .result-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
  `],
})
export class SearchComponent {
  private readonly searchService = inject(SearchService);
  private readonly subjectsService = inject(SubjectsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryInput = viewChild<ElementRef<HTMLInputElement>>('queryInput');

  /** Query parameters ?q= and ?subject=. */
  readonly q = input<string | undefined, unknown>(undefined, { transform: optionalText });
  readonly subject = input<number | undefined, unknown>(undefined, { transform: optionalNumber });

  protected readonly itemTypeLabel = itemTypeLabel;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly itemStatusLabel = itemStatusLabel;

  protected queryText = '';
  protected readonly typed$ = new RxSubject<void>();
  protected readonly subjects = signal<Subject[]>([]);
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly totalItems = signal(0);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly statusText = signal('');

  private readonly requests$ = new RxSubject<SearchRequest>();
  private lastRequest: SearchRequest | null = null;

  constructor() {
    this.subjectsService.listSubjects().subscribe({
      next: (subjects) => this.subjects.set(subjects.filter((subject) => !subject.archived)),
      error: () => this.subjects.set([]),
    });
    this.typed$.pipe(debounceTime(TYPING_DELAY_MS), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateUrl());
    // Each request catches its own error, so one failure does not end the stream of later searches.
    this.requests$.pipe(
      switchMap((request) => {
        this.searching.set(true);
        this.searchError.set(null);
        this.lastRequest = request;
        return this.searchService.searchItems(request.query, request.subjectId, request.page, PAGE_SIZE).pipe(
          map((page): SearchPage | { error: unknown } => page),
          catchError((error: unknown) => of({ error })));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((outcome) => ('error' in outcome ? this.failSearch(outcome.error) : this.showPage(outcome)));
    effect(() => {
      const query = this.q() ?? '';
      const subjectId = this.subject() ?? null;
      untracked(() => this.startSearch(query, subjectId));
    });
    afterNextRender(() => this.queryInput()?.nativeElement.focus());
  }

  protected submitSearch(): void {
    this.updateUrl();
  }

  protected changeSubject(subjectId: number | null): void {
    this.router.navigate([], { queryParams: { q: this.queryText.trim() || null, subject: subjectId }, replaceUrl: true });
  }

  protected loadMore(): void {
    const last = this.lastRequest;
    if (last && !this.searching()) {
      this.requests$.next({ ...last, page: Math.floor(this.results().length / PAGE_SIZE) });
    }
  }

  protected retry(): void {
    if (this.lastRequest) {
      this.requests$.next(this.lastRequest);
    }
  }

  private startSearch(query: string, subjectId: number | null): void {
    if (this.queryText.trim() !== query) {
      this.queryText = query;
    }
    if (!query) {
      this.results.set([]);
      this.totalItems.set(0);
      this.statusText.set('');
      this.searchError.set(null);
      return;
    }
    this.requests$.next({ query, subjectId, page: 0 });
  }

  private updateUrl(): void {
    const query = this.queryText.trim();
    if (query === (this.q() ?? '')) {
      return;
    }
    this.router.navigate([], { queryParams: { q: query || null, subject: this.subject() ?? null }, replaceUrl: true });
  }

  private showPage(page: SearchPage): void {
    this.searching.set(false);
    this.results.update((current) => (page.page === 0 ? page.items : [...current, ...page.items]));
    this.totalItems.set(page.totalItems);
    this.statusText.set(page.totalItems === 1 ? '1 result' : `${page.totalItems} results`);
  }

  private failSearch(error: unknown): void {
    this.searching.set(false);
    this.statusText.set('');
    this.searchError.set(apiErrorMessage(error, 'Could not search your items.'));
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
