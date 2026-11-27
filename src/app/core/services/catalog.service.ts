import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CatalogImportResult, CatalogSubject, CatalogTopicNode, CatalogTrack,
} from '../models/catalog.models';
import { Subject } from '../models/subject.models';

const CATALOG_URL = '/api/v1/catalog';

/** Sample catalog CSV (track, subject, topic_path); used as a download link. */
export const CATALOG_TEMPLATE_URL = `${CATALOG_URL}/template.csv`;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  listTracks(): Observable<CatalogTrack[]> {
    return this.http.get<CatalogTrack[]>(`${CATALOG_URL}/tracks`);
  }

  listTrackSubjects(trackId: number): Observable<CatalogSubject[]> {
    return this.http.get<CatalogSubject[]>(`${CATALOG_URL}/tracks/${trackId}/subjects`);
  }

  listSubjectTopics(catalogSubjectId: number): Observable<CatalogTopicNode[]> {
    return this.http.get<CatalogTopicNode[]>(`${CATALOG_URL}/subjects/${catalogSubjectId}/topics`);
  }

  /** Copies the catalog subject and its whole topic tree into the user's subjects. */
  enrollInSubject(catalogSubjectId: number): Observable<Subject> {
    return this.http.post<Subject>(`${CATALOG_URL}/subjects/${catalogSubjectId}/enroll`, null);
  }

  /** Admin only: uploads a catalog CSV as multipart `file`; the API adds what is missing. */
  importCatalogCsv(file: File): Observable<CatalogImportResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<CatalogImportResult>('/api/v1/admin/catalog/import', body);
  }
}
