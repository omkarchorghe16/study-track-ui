import type Quill from 'quill';

/** Editor HTML with no visible text (Quill's empty "<p><br></p>") is stored as null. */
export function toStoredHtml(html: string | null): string | null {
  if (!html) {
    return null;
  }
  const hasText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
  return hasText || /<(img|pre|iframe)\b/i.test(html) ? html : null;
}

/**
 * Model value of the editors. Quill 2's getSemanticHTML() writes every space as &nbsp;, which stops
 * long answers from wrapping when rendered, so spaces are restored. Code blocks keep their own spacing.
 */
export function readEditorHtml(editor: Quill): string | null {
  return toStoredHtml(editor.getSemanticHTML().replace(/&nbsp;/g, ' '));
}

/** Quill renders a contenteditable div; give it the field's name for screen readers. */
export function labelEditor(editor: Quill, label: string): void {
  editor.root.setAttribute('aria-label', label);
  editor.root.setAttribute('role', 'textbox');
  editor.root.setAttribute('aria-multiline', 'true');
}

/** Alt text from a file name: "binary-tree_diagram.png" becomes "binary tree diagram". */
export function altTextFor(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 500);
}

/** "Java, spring ,java" becomes ["java", "spring"]. */
export function parseTags(text: string): string[] {
  return [...new Set(text.split(',').map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0))];
}

/** Plain text typed in a simple field as stored HTML: blank lines start paragraphs, single line breaks become <br>. */
export function plainTextToHtml(text: string): string | null {
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
  if (paragraphs.length === 0) {
    return null;
  }
  const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return paragraphs.map((paragraph) => `<p>${paragraph.split('\n').map(escape).join('<br>')}</p>`).join('');
}
