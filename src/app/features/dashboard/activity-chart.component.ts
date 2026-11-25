import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { DailyReviewCount } from '../../core/models/stats.models';

/**
 * Reviews per day as a column chart (one series, so no legend). Each column is focusable and shows a
 * tooltip on hover or focus; the same numbers are available as a table.
 */
@Component({
  selector: 'app-activity-chart',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="plot" role="group" [attr.aria-label]="summary()">
      <span class="max-label" aria-hidden="true">{{ maxCount() }}</span>
      <ol class="columns">
        @for (day of days(); track day.date; let last = $last) {
          <li class="slot" tabindex="0" [attr.aria-label]="(day.date | date: 'EEE d MMM') + ': ' + day.reviewCount + ' reviews'">
            @if (day.reviewCount) {
              <span class="column" [style.height.%]="heightOf(day.reviewCount)"></span>
            }
            @if (last && day.reviewCount) { <span class="tip-label" [style.bottom.%]="heightOf(day.reviewCount)">{{ day.reviewCount }}</span> }
            <span class="tooltip" aria-hidden="true">{{ day.date | date: 'EEE d MMM' }} · {{ day.reviewCount }} review{{ day.reviewCount === 1 ? '' : 's' }}</span>
          </li>
        }
      </ol>
    </div>
    <div class="axis" aria-hidden="true">
      <span>{{ days()[0]?.date | date: 'd MMM' }}</span><span>Today</span>
    </div>
    <details class="table-view">
      <summary>Show as table</summary>
      <table>
        <thead><tr><th scope="col">Day</th><th scope="col">Reviews</th></tr></thead>
        <tbody>
          @for (day of days(); track day.date) {
            <tr><td>{{ day.date | date: 'EEE d MMM' }}</td><td>{{ day.reviewCount }}</td></tr>
          }
        </tbody>
      </table>
    </details>
  `,
  styles: [`
    :host{display:block}
    .plot{position:relative;height:120px;padding-top:14px;border-bottom:1px solid var(--border);background:linear-gradient(var(--border),var(--border)) 0 14px/100% 1px no-repeat}
    .max-label{position:absolute;top:0;right:0;color:var(--muted);font-size:.66rem}
    .columns{list-style:none;margin:0;padding:0;height:100%;display:flex;align-items:flex-end;gap:2px}
    .slot{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center;outline-offset:1px}
    .slot:hover,.slot:focus-visible{background:var(--overlay-1)}
    .column{width:100%;max-width:24px;min-height:2px;border-radius:4px 4px 0 0;background:var(--primary)}
    .tip-label{position:absolute;left:50%;transform:translate(-50%,-2px);color:var(--text);font-size:.66rem}
    .tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:2;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--panel-raised);color:var(--text);font-size:.7rem;white-space:nowrap;pointer-events:none;display:none}
    .slot:hover .tooltip,.slot:focus-visible .tooltip{display:block}
    .slot:nth-child(-n+5) .tooltip{left:0;transform:none}.slot:nth-last-child(-n+5) .tooltip{left:auto;right:0;transform:none}
    .axis{display:flex;justify-content:space-between;margin-top:4px;color:var(--muted);font-size:.68rem}
    .table-view{margin-top:10px;font-size:.76rem;color:var(--muted)}.table-view summary{cursor:pointer}
    .table-view table{margin-top:6px}.table-view td,.table-view th{padding:4px 10px}
  `],
})
export class ActivityChartComponent {
  readonly days = input.required<DailyReviewCount[]>();

  protected readonly maxCount = computed(() => Math.max(1, ...this.days().map((day) => day.reviewCount)));
  protected readonly summary = computed(() => {
    const total = this.days().reduce((sum, day) => sum + day.reviewCount, 0);
    const activeDays = this.days().filter((day) => day.reviewCount > 0).length;
    return `Reviews per day, last ${this.days().length} days: ${total} reviews on ${activeDays} days`;
  });

  protected heightOf(count: number): number {
    return (count / this.maxCount()) * 100;
  }
}
