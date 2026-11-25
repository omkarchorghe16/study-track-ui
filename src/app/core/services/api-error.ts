import { HttpErrorResponse } from '@angular/common/http';

/** Error body of study-track-api; details maps field names to validation messages. */
interface ApiError {
  message?: string;
  details?: Record<string, string>;
}

/** User-facing text for a failed study-track-api call: the API's own message for 4xx, else the fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  // 0: nothing answered. 502/504: the dev proxy is running but the API is not.
  if (error.status === 0 || error.status === 502 || error.status === 504) {
    return `${fallback} The StudyTrack API (port 8083) is not reachable.`;
  }
  if (error.status >= 400 && error.status < 500) {
    const body = error.error as ApiError | null;
    const detail = Object.entries(body?.details ?? {})[0];
    const message = detail ? `${detail[0]} ${detail[1]}` : body?.message;
    return message ? `${fallback} ${message}.` : fallback;
  }
  return fallback;
}
