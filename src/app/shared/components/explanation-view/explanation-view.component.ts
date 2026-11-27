import { Component, computed, input } from '@angular/core';
import { ExplanationContent } from '../../../core/models/explanation.models';
import { RichContentComponent } from '../rich-content/rich-content.component';

/** Draws an AI explanation as cards: summary, analogy, key points, numbered steps, code, real-world example, tips. */
@Component({
  selector: 'app-explanation-view',
  standalone: true,
  imports: [RichContentComponent],
  template: `
    <div class="ex">
      <section class="ex-summary" aria-label="In short"><b>In short</b><p>{{ content().summary }}</p></section>
      @if (content().analogy) {
        <section class="ex-card ex-analogy" aria-label="Analogy"><span class="ex-icon" aria-hidden="true">💡</span><p>{{ content().analogy }}</p></section>
      }
      @if (content().keyPoints.length) {
        <section aria-label="Key points"><h4>Key points</h4>
          <ul class="ex-points">@for (point of content().keyPoints; track $index) { <li><span class="ex-tick" aria-hidden="true">✓</span>{{ point }}</li> }</ul>
        </section>
      }
      @if (content().howItWorks.length) {
        <section aria-label="How it works"><h4>How it works</h4>
          <ol class="ex-steps">@for (step of content().howItWorks; track $index) {
            <li><span class="ex-num" aria-hidden="true">{{ $index + 1 }}</span><div>@if (step.title) { <b>{{ step.title }}</b> }<p>{{ step.detail }}</p></div></li>
          }</ol>
        </section>
      }
      @if (content().example.code) {
        <section aria-label="Example"><h4>Example{{ content().example.title ? ': ' + content().example.title : '' }}</h4>
          <app-rich-content [html]="codeHtml()"></app-rich-content>
          @if (content().example.explanation) { <p class="ex-note">{{ content().example.explanation }}</p> }
        </section>
      }
      @if (content().realWorldExample.scenario) {
        <section class="ex-card ex-real" aria-label="Real-world example">
          <h4><span aria-hidden="true">🏭</span> In the real world{{ content().realWorldExample.title ? ': ' + content().realWorldExample.title : '' }}</h4>
          <p>{{ content().realWorldExample.scenario }}</p>
          @if (content().realWorldExample.howItApplies) { <p><b>How it applies:</b> {{ content().realWorldExample.howItApplies }}</p> }
        </section>
      }
      @if (content().commonMistakes.length) {
        <section class="ex-card ex-warn" aria-label="Common mistakes"><h4><span aria-hidden="true">⚠</span> Common mistakes</h4>
          <ul>@for (mistake of content().commonMistakes; track $index) { <li>{{ mistake }}</li> }</ul>
        </section>
      }
      @if (content().interviewTip) {
        <section class="ex-card ex-tip" aria-label="Interview tip"><span class="ex-icon" aria-hidden="true">🎯</span><p><b>Interview tip:</b> {{ content().interviewTip }}</p></section>
      }
    </div>
  `,
  styles: [`
    .ex{display:grid;gap:14px;font-size:.86rem}.ex h4{margin:0 0 8px;font-size:.76rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
    .ex p{margin:0}.ex ul,.ex ol{margin:0;padding:0;list-style:none}
    .ex-summary{padding:12px 14px;border-left:4px solid var(--accent);border-radius:0 8px 8px 0;background:#f2ca631a}.ex-summary b{display:block;margin-bottom:4px;color:var(--accent);font-size:.74rem;text-transform:uppercase;letter-spacing:.05em}
    .ex-card{display:flex;flex-wrap:wrap;gap:6px 10px;padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--panel-raised)}.ex-card h4{flex:1 1 100%;margin:0}.ex-card p{flex:1 1 100%}
    .ex-analogy{align-items:center;font-style:italic;background:#4b8cff14;border-color:#4b8cff44}.ex-analogy p,.ex-tip p{flex:1 1 0}.ex-icon{font-size:1.2rem}
    .ex-points{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}.ex-points li{display:flex;gap:8px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--panel-raised)}
    .ex-tick{flex:none;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#35be8426;color:var(--positive-text);font-size:.7rem;font-weight:700}
    .ex-steps{display:grid;gap:0}.ex-steps li{display:flex;gap:12px;position:relative;padding-bottom:12px}.ex-steps li:not(:last-child)::before{content:'';position:absolute;left:11px;top:26px;bottom:2px;width:2px;background:var(--border)}
    .ex-num{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;font-size:.72rem;font-weight:700}.ex-steps li div{padding-top:2px}.ex-steps b{display:block;margin-bottom:2px}
    .ex-note{margin-top:8px;color:var(--muted)}
    .ex-real{background:#35be8412;border-color:#35be8444}.ex-warn{background:#f2ca6312;border-color:#f2ca6455}.ex-warn ul{flex:1 1 100%;padding-left:18px;list-style:disc}.ex-warn li{margin:3px 0}
    .ex-tip{align-items:center;background:#eb707b10;border-color:#eb707b44}
  `],
})
export class ExplanationViewComponent {
  readonly content = input.required<ExplanationContent>();

  /** The example as the HTML RichContentComponent highlights; the text is escaped here. */
  protected readonly codeHtml = computed(() => {
    const example = this.content().example;
    const escaped = example.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const language = /^[a-z0-9+#-]{1,20}$/.test(example.language) ? ` data-language="${example.language}"` : '';
    return `<pre${language}><code>${escaped}</code></pre>`;
  });
}
