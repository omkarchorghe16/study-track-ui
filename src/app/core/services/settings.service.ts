import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LlmConnectionTest, LlmSettings, LlmSettingsRequest } from '../models/llm-settings.models';

const LLM_SETTINGS_URL = '/api/v1/settings/llm';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  getLlmSettings(): Observable<LlmSettings> {
    return this.http.get<LlmSettings>(LLM_SETTINGS_URL);
  }

  replaceLlmSettings(request: LlmSettingsRequest): Observable<LlmSettings> {
    return this.http.put<LlmSettings>(LLM_SETTINGS_URL, request);
  }

  /** Tests the given settings without saving them, or the saved ones when `request` is omitted. */
  testLlmConnection(request?: LlmSettingsRequest): Observable<LlmConnectionTest> {
    return this.http.post<LlmConnectionTest>(`${LLM_SETTINGS_URL}/test`, request ?? null);
  }
}
