import { Component, input } from '@angular/core';

/**
 * Renders stored item HTML. Angular's built-in sanitizer cleans it (scripts, event handlers and
 * unsafe URLs are removed). Phase 3 adds DOMPurify, server-side sanitising and code highlighting.
 */
@Component({
  selector: 'app-rich-content',
  standalone: true,
  template: `
    @if (html()) {
      <div class="rich-content" [innerHTML]="html()"></div>
    } @else {
      <p class="text-muted">{{ emptyText() }}</p>
    }
  `,
  styles: [`
    :host{display:block}
    .rich-content{font-size:.92rem;line-height:1.7;overflow-wrap:anywhere}
    .rich-content :is(p,ul,ol,pre,blockquote){margin:0 0 .8em}
    .rich-content pre,.rich-content code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.84em}
    .rich-content pre{padding:12px;border-radius:7px;background:#17171a;overflow:auto}
    .rich-content code{padding:1px 4px;border-radius:4px;background:#ffffff12}
    .rich-content pre code{padding:0;background:none}
    .rich-content blockquote{padding-left:12px;border-left:3px solid var(--border);color:var(--muted)}
    .rich-content a{color:var(--primary);text-decoration:underline}
    .rich-content img{max-width:100%;height:auto}
  `],
})
export class RichContentComponent {
  readonly html = input<string | null | undefined>(null);
  readonly emptyText = input('—');
}
