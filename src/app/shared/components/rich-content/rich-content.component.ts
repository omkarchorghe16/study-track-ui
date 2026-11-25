import { Component, ElementRef, ViewEncapsulation, afterRenderEffect, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { MEDIA_URL_PATTERN } from '../../../core/models/media.models';

Object.entries({ bash, cpp, csharp, css, go, java, javascript, json, kotlin, python, sql, typescript, xml, yaml })
  .forEach(([name, language]) => hljs.registerLanguage(name, language));
hljs.configure({ ignoreUnescapedHTML: true });

const purifier = DOMPurify();
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IMG' && !MEDIA_URL_PATTERN.test(node.getAttribute('src') ?? '')) {
    node.remove();
  } else if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

/** Same rules as the API's HtmlSanitizer: no scripts, styles, forms or frames, and only API images. */
function purify(html: string): string {
  return purifier.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'svg', 'math'],
    FORBID_ATTR: ['style'],
    ADD_ATTR: ['target'],
  });
}

/**
 * Renders stored HTML (already cleaned by the API) after cleaning it again with DOMPurify, then
 * highlights code blocks with highlight.js. Use it for every piece of stored HTML.
 */
@Component({
  selector: 'app-rich-content',
  standalone: true,
  template: `
    @if (safeHtml(); as content) {
      <div class="rich-content" [innerHTML]="content"></div>
    } @else {
      <p class="text-muted">{{ emptyText() }}</p>
    }
  `,
  // Inserted HTML gets no emulated-encapsulation attributes, so these styles are global and every
  // selector starts with the component's element.
  encapsulation: ViewEncapsulation.None,
  styles: [`
    app-rich-content{display:block;min-width:0}
    app-rich-content .rich-content{font-size:.92rem;line-height:1.7;overflow-wrap:anywhere}
    app-rich-content .rich-content :is(p,ul,ol,pre,blockquote,figure){margin:0 0 .8em}
    app-rich-content .rich-content :is(pre,code){font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.84em}
    app-rich-content .rich-content pre{max-width:100%;padding:12px;border-radius:7px;background:#17171a;overflow:auto;white-space:pre;overflow-wrap:normal}
    app-rich-content .rich-content code{padding:1px 4px;border-radius:4px;background:#ffffff12}
    app-rich-content .rich-content pre code{padding:0;background:none}
    app-rich-content .rich-content blockquote{padding-left:12px;border-left:3px solid var(--border);color:var(--muted)}
    app-rich-content .rich-content a{color:var(--primary);text-decoration:underline}
    app-rich-content .rich-content img{display:block;max-width:100%;height:auto;margin:6px 0;border-radius:6px}
  `],
})
export class RichContentComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly html = input<string | null | undefined>(null);
  readonly emptyText = input('—');

  /** DOMPurify output is trusted so Angular keeps the attributes it allows (classes, data-*, target). */
  protected readonly safeHtml = computed<SafeHtml | null>(() => {
    const html = this.html();
    const clean = html ? purify(html) : '';
    return clean.trim() ? this.sanitizer.bypassSecurityTrustHtml(clean) : null;
  });

  constructor() {
    afterRenderEffect(() => {
      if (this.safeHtml()) {
        this.highlightCode();
      }
    });
  }

  /** Quill writes code blocks as `<pre data-language="...">`; other HTML may use `<pre><code>`. */
  private highlightCode(): void {
    this.host.nativeElement.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
      const block = pre.querySelector<HTMLElement>(':scope > code') ?? pre;
      if (block.dataset['highlighted']) {
        return;
      }
      const language = pre.dataset['language'];
      if (language && language !== 'plain' && hljs.getLanguage(language)) {
        block.classList.add(`language-${language}`);
      }
      hljs.highlightElement(block);
    });
  }
}
