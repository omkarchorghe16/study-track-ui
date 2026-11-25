import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StatsOverview } from '../models/stats.models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<StatsOverview> {
    return this.http.get<StatsOverview>('/api/v1/stats/overview');
  }
}
