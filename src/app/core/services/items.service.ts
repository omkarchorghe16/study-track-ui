import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DuplicateCheckRequest, DuplicateItem, ItemFilters, ItemPage, ItemRequest, StudyItem } from '../models/item.models';

const ITEMS_URL = '/api/v1/items';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);

  listTopicItems(topicId: number, filters: ItemFilters = {}): Observable<ItemPage> {
    return this.http.get<ItemPage>(`/api/v1/topics/${topicId}/items`, { params: filterParams(filters) });
  }

  /** Items of every topic of the subject, ordered by topic, then item. */
  listSubjectItems(subjectId: number, filters: ItemFilters = {}): Observable<ItemPage> {
    return this.http.get<ItemPage>(`/api/v1/subjects/${subjectId}/items`, { params: filterParams(filters) });
  }

  getItem(itemId: number): Observable<StudyItem> {
    return this.http.get<StudyItem>(`${ITEMS_URL}/${itemId}`);
  }

  createItem(request: ItemRequest): Observable<StudyItem> {
    return this.http.post<StudyItem>(ITEMS_URL, request);
  }

  replaceItem(itemId: number, request: ItemRequest): Observable<StudyItem> {
    return this.http.put<StudyItem>(`${ITEMS_URL}/${itemId}`, request);
  }

  deleteItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${ITEMS_URL}/${itemId}`);
  }

  /** Items of the subject with the same question (or title, without a question). Nothing is saved. */
  findDuplicateItems(request: DuplicateCheckRequest): Observable<DuplicateItem[]> {
    return this.http.post<DuplicateItem[]>(`${ITEMS_URL}/duplicate-check`, request);
  }
}

function filterParams(filters: ItemFilters): HttpParams {
  let params = new HttpParams()
    .set('page', filters.page ?? 0)
    .set('size', filters.size ?? 20);
  if (filters.status) {
    params = params.set('status', filters.status);
  }
  if (filters.difficulty) {
    params = params.set('difficulty', filters.difficulty);
  }
  if (filters.tag?.trim()) {
    params = params.set('tag', filters.tag.trim());
  }
  return params;
}
