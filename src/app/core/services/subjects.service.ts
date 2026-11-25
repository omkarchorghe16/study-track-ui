import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Subject, SubjectRequest } from '../models/subject.models';

const SUBJECTS_URL = '/api/v1/subjects';

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private readonly http = inject(HttpClient);

  listSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(SUBJECTS_URL);
  }

  getSubject(subjectId: number): Observable<Subject> {
    return this.http.get<Subject>(`${SUBJECTS_URL}/${subjectId}`);
  }

  createSubject(request: SubjectRequest): Observable<Subject> {
    return this.http.post<Subject>(SUBJECTS_URL, request);
  }

  replaceSubject(subjectId: number, request: SubjectRequest): Observable<Subject> {
    return this.http.put<Subject>(`${SUBJECTS_URL}/${subjectId}`, request);
  }

  deleteSubject(subjectId: number): Observable<void> {
    return this.http.delete<void>(`${SUBJECTS_URL}/${subjectId}`);
  }
}
