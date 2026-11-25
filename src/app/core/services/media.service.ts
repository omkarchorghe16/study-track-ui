import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MediaFile } from '../models/media.models';

const MEDIA_URL = '/api/v1/media';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);

  /** Uploads one image as multipart `file`; the response's `url` goes into the editor HTML. */
  uploadImage(file: File, altText?: string): Observable<MediaFile> {
    const body = new FormData();
    body.append('file', file, file.name);
    if (altText?.trim()) {
      body.append('altText', altText.trim());
    }
    return this.http.post<MediaFile>(MEDIA_URL, body);
  }
}
