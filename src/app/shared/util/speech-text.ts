const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, br, div, tr';
const MAX_CHUNK_LENGTH = 220;

/**
 * The words of stored answer HTML as plain text for a speech voice: code blocks are left out (read aloud they
 * are noise), and paragraphs, list items and headings end with a full stop so the voice pauses between them.
 */
export function htmlToSpeakableText(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  body.querySelectorAll('pre, script, style').forEach((element) => element.remove());
  body.querySelectorAll(BLOCK_SELECTOR).forEach((element) => element.append(' . '));
  return (body.textContent ?? '').replace(/\s+/g, ' ').replace(/(\s*\.\s*){2,}/g, '. ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

/**
 * Splits text at sentence ends into pieces of at most about 220 characters. Browsers stop speaking a long
 * single utterance after some seconds, so the text is spoken piece by piece.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHUNK_LENGTH) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
    while (current.length > MAX_CHUNK_LENGTH * 2) {
      const cut = current.lastIndexOf(' ', MAX_CHUNK_LENGTH);
      const at = cut > 0 ? cut : MAX_CHUNK_LENGTH;
      chunks.push(current.slice(0, at).trim());
      current = current.slice(at);
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  return chunks.filter((chunk) => chunk.length > 0);
}
