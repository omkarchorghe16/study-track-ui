import { Component, computed, input } from '@angular/core';

/** A horizontal bar for a whole percent (0-100), announced to screen readers with its label. */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="track" role="progressbar" [attr.aria-label]="label()" aria-valuemin="0" aria-valuemax="100"
         [attr.aria-valuenow]="clamped()" [attr.aria-valuetext]="clamped() + '% ' + suffix()">
      <div class="fill" [class.complete]="clamped() === 100" [style.width.%]="clamped()"></div>
    </div>
  `,
  styles: [`
    :host{display:block}
    .track{height:var(--bar-height,6px);border-radius:99px;background:var(--overlay-2);overflow:hidden}
    .fill{height:100%;border-radius:inherit;background:var(--primary);transition:width .3s ease}
    .fill.complete{background:var(--positive)}
    @media (prefers-reduced-motion:reduce){.fill{transition:none}}
  `],
})
export class ProgressBarComponent {
  /** Whole percent; values outside 0-100 are clamped. */
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly suffix = input('done');

  protected readonly clamped = computed(() => Math.min(100, Math.max(0, Math.round(this.value()))));
}
