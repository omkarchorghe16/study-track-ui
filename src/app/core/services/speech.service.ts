import { Injectable, signal } from '@angular/core';
import { htmlToSpeakableText, splitIntoSpeechChunks } from '../../shared/util/speech-text';

/**
 * Reads text aloud with the browser's own text-to-speech (Web Speech API): free, no server, and nothing
 * leaves the device. Only one thing is read at a time; starting another stops the first.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  /** False in browsers without speech synthesis; the listen buttons are then hidden. */
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private readonly speakingKeyState = signal<string | null>(null);
  /** The key given to {@link speakHtml} for what is being read now, or null. */
  readonly speakingKey = this.speakingKeyState.asReadonly();
  /** Incremented on every start and stop, so callbacks of an older reading know they are out of date. */
  private runId = 0;

  /** Reads the visible words of the HTML aloud, replacing anything being read. */
  speakHtml(key: string, html: string | null | undefined): void {
    this.stop();
    if (!this.supported) {
      return;
    }
    const chunks = splitIntoSpeechChunks(htmlToSpeakableText(html));
    if (chunks.length === 0) {
      return;
    }
    const run = this.runId;
    this.speakingKeyState.set(key);
    this.speakChunk(chunks, 0, run);
  }

  stop(): void {
    this.runId++;
    if (this.supported) {
      window.speechSynthesis.cancel();
    }
    this.speakingKeyState.set(null);
  }

  private speakChunk(chunks: string[], index: number, run: number): void {
    if (run !== this.runId) {
      return;
    }
    if (index >= chunks.length) {
      this.speakingKeyState.set(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.onend = () => this.speakChunk(chunks, index + 1, run);
    utterance.onerror = () => {
      if (run === this.runId) {
        this.speakingKeyState.set(null);
      }
    };
    window.speechSynthesis.speak(utterance);
  }
}
