import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Explanation, ExplanationBatch } from '../models/explanation.models';

@Injectable({ providedIn: 'root' })
export class ExplanationsService {
  private readonly http = inject(HttpClient);

  /** The question's explanation, or null when it has none yet. */
  getExplanation(questionId: number): Observable<Explanation | null> {
    return this.http.get<Explanation>(`/api/v1/items/${questionId}/explanation`).pipe(
      catchError((error: unknown) => (error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))),
    );
  }

  /** Asks the AI to write (or rewrite) the explanation; can take up to a minute. */
  generateExplanation(questionId: number): Observable<Explanation> {
    return this.http.post<Explanation>(`/api/v1/items/${questionId}/explanation`, null);
  }

  /** Starts explaining every question of the subject that has none; the API answers at once. */
  startSubjectExplanations(subjectId: number): Observable<ExplanationBatch> {
    return this.http.post<ExplanationBatch>(`/api/v1/subjects/${subjectId}/explanations`, null);
  }

  getSubjectExplanationStatus(subjectId: number): Observable<ExplanationBatch> {
    return this.http.get<ExplanationBatch>(`/api/v1/subjects/${subjectId}/explanations/status`);
  }
}
