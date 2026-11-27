import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Explanation, PrefillStatus } from '../models/explanation.models';

/**
 * The AI explanation of a question. It is saved once on the server and shared by all users; the server calls the AI
 * only when none is saved, so reading one is cheap.
 */
@Injectable({ providedIn: 'root' })
export class ExplanationsService {
  private readonly http = inject(HttpClient);

  /** The saved explanation, or null when none is saved yet. Never calls the AI. */
  getExplanation(questionId: number): Observable<Explanation | null> {
    return this.http.get<Explanation>(`/api/v1/items/${questionId}/explanation`).pipe(
      catchError((error: unknown) => (error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))),
    );
  }

  /** The saved explanation or, only when none is saved, a new one written by the AI (up to a minute). */
  findOrCreateExplanation(questionId: number): Observable<Explanation> {
    return this.http.post<Explanation>(`/api/v1/items/${questionId}/explanation`, null);
  }

  /** Admin only: removes the saved explanation so the next findOrCreateExplanation writes a new one. */
  deleteExplanation(questionId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/items/${questionId}/explanation`);
  }

  /** Admin only: starts writing the missing explanations of the catalog's questions in the background. */
  startCatalogPrefill(): Observable<PrefillStatus> {
    return this.http.post<PrefillStatus>('/api/v1/admin/catalog/explanations/prefill', null);
  }

  /** Admin only: progress of the catalog pre-fill. */
  getCatalogPrefillStatus(): Observable<PrefillStatus> {
    return this.http.get<PrefillStatus>('/api/v1/admin/catalog/explanations/status');
  }
}
