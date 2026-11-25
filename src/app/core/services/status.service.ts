import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiStatus } from '../models/status.models';

@Injectable({ providedIn: 'root' })
export class StatusService {
  private readonly http = inject(HttpClient);

  getStatus(): Observable<ApiStatus> {
    return this.http.get<ApiStatus>('/api/v1/status');
  }
}
