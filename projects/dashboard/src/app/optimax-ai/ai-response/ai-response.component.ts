import { Component, Input, Output, EventEmitter } from '@angular/core';
import { KpiItem, ChartPayload } from '../../ui/services/optimax-ai.service';
import { HeatmapCell, FormatMode } from '../optimax-ai.component';

@Component({
  selector: 'app-ai-response',
  templateUrl: './ai-response.component.html',
  styleUrl: './ai-response.component.scss'
})
export class AiResponseComponent {
  @Input() format: FormatMode = 'markdown';
  @Input() text = '';              // raw markdown for the Analysis card
  @Input() time = '';
  @Input() matchedScenario?: string;
  @Input() kpis?: KpiItem[];
  @Input() actions?: string[];
  @Input() coverage?: string[];
  @Input() followUpPrompts?: string[];
  @Input() rawJson?: string;

  // Chart inputs — passed straight through to <app-chart-renderer>
  @Input() chart?: ChartPayload | null;
  @Input() isHeatmap = false;
  @Input() heatmapCells?: HeatmapCell[];
  @Input() apexSeries?: any[];
  @Input() apexOptions?: any;

  @Output() followUpSelected = new EventEmitter<string>();
  @Output() copyRequested    = new EventEmitter<string>();

  /** Strip verbose KPIs (e.g. "Request" which contains the full prompt) */
  displayKpis(kpis: KpiItem[] | undefined): KpiItem[] {
    if (!kpis) return [];
    return kpis.filter(k =>
      !['request'].includes(k.metric?.toLowerCase()) &&
      (k.value?.toString().length ?? 0) <= 40
    );
  }
}
