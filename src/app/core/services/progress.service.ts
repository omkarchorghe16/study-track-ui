import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ItemProgress } from '../models/item.models';
import {
  DueItems, ItemProgressUpdate, ResumePoint, ReviewOutcome, ReviewResult, TopicCompletion,
} from '../models/progress.models';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);

  updateItemProgress(itemId: number, update: ItemProgressUpdate): Observable<ItemProgress> {
    return this.http.patch<ItemProgress>(`/api/v1/items/${itemId}/progress`, update);
  }

  setTopicCompleted(topicId: number, completed: boolean): Observable<TopicCompletion> {
    const url = `/api/v1/topics/${topicId}/complete`;
    return completed ? this.http.post<TopicCompletion>(url, null) : this.http.delete<TopicCompletion>(url);
  }

  recordReview(itemId: number, result: ReviewResult): Observable<ReviewOutcome> {
    return this.http.post<ReviewOutcome>('/api/v1/reviews', { itemId, result });
  }

  listDueItems(subjectId: number, limit = 100): Observable<DueItems> {
    const params = new HttpParams().set('subjectId', subjectId).set('limit', limit);
    return this.http.get<DueItems>('/api/v1/reviews/due', { params });
  }

  /** The subject's resume point, or the most recent subject's without one; null when nothing was opened. */
  getResumePoint(subjectId?: number): Observable<ResumePoint | null> {
    const params = subjectId === undefined ? undefined : new HttpParams().set('subjectId', subjectId);
    return this.http.get<ResumePoint>('/api/v1/sessions/resume', { params, observe: 'response' })
      .pipe(map((response) => response.status === 204 ? null : response.body));
  }

  saveResumePoint(subjectId: number, topicId: number | null, itemId: number | null): Observable<ResumePoint> {
    return this.http.put<ResumePoint>('/api/v1/sessions', { subjectId, topicId, itemId });
  }
}
