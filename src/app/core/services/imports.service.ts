import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApproveResponse, CandidateRequest, CandidateSelectionRequest, ImportCandidate, ImportJob, RejectResponse,
} from '../models/import.models';

const IMPORTS_URL = '/api/v1/imports';

@Injectable({ providedIn: 'root' })
export class ImportsService {
  private readonly http = inject(HttpClient);

  /** Uploads the document as multipart `file`; the API answers 202 and processes it in the background. */
  startImport(file: File, subjectId: number): Observable<ImportJob> {
    const body = new FormData();
    body.append('file', file, file.name);
    body.append('subjectId', String(subjectId));
    return this.http.post<ImportJob>(IMPORTS_URL, body);
  }

  listImports(limit = 10): Observable<ImportJob[]> {
    return this.http.get<ImportJob[]>(IMPORTS_URL, { params: new HttpParams().set('limit', limit) });
  }

  getImport(importId: number): Observable<ImportJob> {
    return this.http.get<ImportJob>(`${IMPORTS_URL}/${importId}`);
  }

  listCandidates(importId: number): Observable<ImportCandidate[]> {
    return this.http.get<ImportCandidate[]>(`${IMPORTS_URL}/${importId}/candidates`);
  }

  updateCandidate(importId: number, candidateId: number, request: CandidateRequest): Observable<ImportCandidate> {
    return this.http.put<ImportCandidate>(`${IMPORTS_URL}/${importId}/candidates/${candidateId}`, request);
  }

  approveCandidates(importId: number, request: CandidateSelectionRequest): Observable<ApproveResponse> {
    return this.http.post<ApproveResponse>(`${IMPORTS_URL}/${importId}/approve`, request);
  }

  rejectCandidates(importId: number, request: CandidateSelectionRequest): Observable<RejectResponse> {
    return this.http.post<RejectResponse>(`${IMPORTS_URL}/${importId}/reject`, request);
  }
}
