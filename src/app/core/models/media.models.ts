/** Response of POST /api/v1/media and GET /api/v1/media/{id}/info. */
export interface MediaFile {
  id: number;
  /** Relative URL of the image (`/api/v1/media/{id}`); use it as the `img` src. */
  url: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText?: string;
  /** Item that uses the image; absent until an item referencing it is saved. */
  itemId?: number;
  createdAt: string;
}

/** Image types the API accepts (it checks the file's bytes, not its name). */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Largest image the API accepts by default (`app.media.max-image-bytes`). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Stored HTML may only reference images served by the API. */
export const MEDIA_URL_PATTERN = /^\/api\/v1\/media\/\d{1,18}$/;
