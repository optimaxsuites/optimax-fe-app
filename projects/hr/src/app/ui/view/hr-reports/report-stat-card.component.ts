import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

export type StatTone = 'primary' | 'success' | 'danger' | 'warn' | 'accent';

@Component({
  selector: 'app-report-stat-card',
  standalone: true,
  imports: [NgIf, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone' },
  template: `
    <span class="lbl">
      <i *ngIf="icon" class="fas" [ngClass]="icon" aria-hidden="true"></i>{{ label }}
    </span>
    <span class="num" [class.num--tone]="colored">{{ value }}</span>
    <span class="sub" *ngIf="sub">{{ sub }}</span>
  `,
  styles: [`
    /* --rpt-* tokens are defined on .rpt-page in the parent and inherited */
    :host {
      --accent: var(--rpt-primary); --accent-text: var(--rpt-primary);
      flex: 1; min-width: 160px; position: relative; overflow: hidden;
      display: flex; flex-direction: column; gap: 4px; padding: 24px 20px 18px;
      background: var(--white); border: 1px solid var(--table-border); border-radius: var(--rpt-radius);
      box-shadow: var(--rpt-shadow); transition: transform .2s, box-shadow .2s;
    }
    :host::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--accent); }
    :host(:hover) { transform: translateY(-2px); box-shadow: var(--rpt-shadow-hover); }
    :host([data-tone='success']) { --accent: var(--rpt-success); --accent-text: var(--rpt-success-text); }
    :host([data-tone='danger'])  { --accent: var(--rpt-danger);  --accent-text: var(--rpt-danger-text); }
    :host([data-tone='warn'])    { --accent: var(--rpt-warn);    --accent-text: var(--rpt-warn-text); }
    :host([data-tone='accent'])  { --accent: var(--rpt-accent);  --accent-text: var(--rpt-accent-text); }

    .lbl { display: flex; align-items: center; gap: 8px; font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-gray); }
    .lbl i { color: var(--accent-text); font-size: .8rem; }
    .num { font-size: 1.75rem; font-weight: 700; line-height: 1.2; color: var(--table-header-text); font-variant-numeric: tabular-nums; }
    .num--tone { color: var(--accent-text); }
    .sub { font-size: .75rem; color: var(--text-gray); opacity: .85; }

    @media (max-width: 640px) {
      :host { min-width: calc(50% - 8px); padding: 16px; }
      .num { font-size: 1.35rem; }
    }
    @media print {
      :host { box-shadow: none; break-inside: avoid; }
    }
    @media (prefers-reduced-motion: reduce) {
      :host { transition: none; }
      :host(:hover) { transform: none; }
    }
  `],
})
export class ReportStatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() sub?: string;
  @Input() icon?: string;
  @Input() tone: StatTone = 'primary';
  @Input() colored = false;
}
