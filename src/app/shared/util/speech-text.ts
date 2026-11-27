import { ExplanationContent } from '../../core/models/explanation.models';

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

/** Adds a full stop to a piece of text that does not end a sentence, so the voice pauses after it. */
function asSentence(text: string): string {
  const trimmed = text.trim();
  return trimmed && !/[.!?]$/.test(trimmed) ? `${trimmed}.` : trimmed;
}

/**
 * An AI explanation as text for a speech voice: every section with a short spoken heading. The code example is
 * left out (only its explanation is read), like code blocks in answers.
 */
export function explanationToSpeakableText(content: ExplanationContent): string {
  const parts: string[] = [content.summary, content.analogy];
  if (content.keyPoints.length) {
    parts.push('Key points.', ...content.keyPoints);
  }
  if (content.howItWorks.length) {
    parts.push('How it works.', ...content.howItWorks.map((step, index) => `Step ${index + 1}. ${asSentence(step.title)} ${step.detail}`));
  }
  if (content.example.code && content.example.explanation) {
    parts.push('Example.', content.example.title, content.example.explanation);
  }
  if (content.realWorldExample.scenario) {
    parts.push('In the real world.', content.realWorldExample.title, content.realWorldExample.scenario, content.realWorldExample.howItApplies);
  }
  if (content.commonMistakes.length) {
    parts.push('Common mistakes.', ...content.commonMistakes);
  }
  if (content.interviewTip) {
    parts.push('Interview tip.', content.interviewTip);
  }
  return parts.filter((part) => part.trim().length > 0).map(asSentence).join(' ');
}
