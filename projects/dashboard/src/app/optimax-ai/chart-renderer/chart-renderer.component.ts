import { Component, Input } from '@angular/core';
import { ChartPayload } from '../../ui/services/optimax-ai.service';
import { HeatmapCell } from '../optimax-ai.component';

@Component({
  selector: 'app-chart-renderer',
  templateUrl: './chart-renderer.component.html',
  styleUrl: './chart-renderer.component.scss'
})
export class ChartRendererComponent {
  @Input() chart!: ChartPayload | null;
  @Input() isHeatmap  = false;
  @Input() heatmapCells: HeatmapCell[] = [];
  @Input() apexSeries: any[] | undefined;
  @Input() apexOptions: any | undefined;
  @Input() fallbackText = '';  // markdown text shown when chart is null
  @Input() actions: string[] = [];
}