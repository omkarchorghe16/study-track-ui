import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchPage } from '../models/search.models';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  /** Items matching every word of `query` (as word prefixes), best match first. */
  searchItems(query: string, subjectId: number | null, page = 0, size = 20): Observable<SearchPage> {
    let params = new HttpParams().set('q', query).set('page', page).set('size', size);
    if (subjectId !== null) {
      params = params.set('subjectId', subjectId);
    }
    return this.http.get<SearchPage>('/api/v1/items/search', { params });
  }
}
