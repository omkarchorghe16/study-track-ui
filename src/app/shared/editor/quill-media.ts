import { QuillModules } from 'ngx-quill';
import type Quill from 'quill';
import { IMAGE_TYPES, MEDIA_URL_PATTERN } from '../../core/models/media.models';

/** Uploads image files and inserts them into the editor at `index`. */
export type ImageUploadHandler = (quill: Quill, index: number, files: File[]) => void;

type ToolbarGroups = NonNullable<Exclude<QuillModules['toolbar'], boolean | string | Record<string, unknown>>>;

interface DeltaLike {
  ops: { insert?: unknown }[];
}

/**
 * Quill modules for editors that hold images. Images are always uploaded to the API and referenced by
 * URL, never stored as base64:
 * - the toolbar's image button opens a file picker,
 * - pasted and dropped image files go through Quill's uploader with `upload` as its handler,
 * - pasted HTML keeps only images that the API already serves (`/api/v1/media/{id}`).
 */
export function mediaEditorModules(toolbar: ToolbarGroups, upload: ImageUploadHandler): QuillModules {
  return {
    toolbar: {
      container: toolbar,
      handlers: {
        image(this: { quill: Quill }) {
          const quill = this.quill;
          chooseImages((files) => upload(quill, quill.getSelection(true).index, files));
        },
      },
    },
    uploader: {
      mimetypes: IMAGE_TYPES,
      handler(this: { quill: Quill }, range: { index: number; length: number }, files: File[]) {
        if (range.length > 0) {
          this.quill.deleteText(range.index, range.length, 'user');
        }
        upload(this.quill, range.index, files);
      },
    },
    clipboard: {
      matchers: [['img', (node: HTMLImageElement, delta: DeltaLike) => keepMediaImages(node, delta)]],
    },
  };
}

function keepMediaImages(node: HTMLImageElement, delta: DeltaLike): DeltaLike {
  if (!MEDIA_URL_PATTERN.test(node.getAttribute('src') ?? '')) {
    delta.ops = delta.ops.filter((op) => !(typeof op.insert === 'object' && op.insert !== null && 'image' in op.insert));
  }
  return delta;
}

function chooseImages(onChosen: (files: File[]) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = IMAGE_TYPES.join(',');
  input.multiple = true;
  input.addEventListener('change', () => {
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      onChosen(files);
    }
  });
  input.click();
}
