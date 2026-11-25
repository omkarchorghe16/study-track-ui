import { Component, computed, input } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A ring around a big percent: the overall share of items done. */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  template: `
    <div class="ring" role="img" [attr.aria-label]="value() + '% of all items done'">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" [attr.r]="radius"></circle>
        @if (value() > 0) {
          <circle class="fill" cx="60" cy="60" [attr.r]="radius" [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="offset()" [class.complete]="value() >= 100"></circle>
        }
      </svg>
      <span class="value" aria-hidden="true">{{ value() }}<small>%</small></span>
    </div>
  `,
  styles: [`
    .ring{position:relative;width:132px;height:132px;flex:none}
    svg{width:100%;height:100%;transform:rotate(-90deg)}
    circle{fill:none;stroke-width:10}.track{stroke:var(--overlay-2)}
    .fill{stroke:var(--primary);stroke-linecap:round;transition:stroke-dashoffset .4s ease}.fill.complete{stroke:var(--positive)}
    .value{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.9rem;font-weight:700;letter-spacing:-.03em}
    small{font-size:.9rem;color:var(--muted);margin-left:1px}
    @media (prefers-reduced-motion:reduce){.fill{transition:none}}
  `],
})
export class ProgressRingComponent {
  /** Whole percent, 0-100. */
  readonly value = input.required<number>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, this.value())) / 100));
}
