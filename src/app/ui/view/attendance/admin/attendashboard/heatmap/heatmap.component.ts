import { Component, Input } from '@angular/core';
import { DepartmentHeatmap } from '../../../../../shared-component/models/models';

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss'
})
export class HeatmapComponent {
  @Input() departments: DepartmentHeatmap[] = [];
  /*departments = [
  { name: 'HR', attendance: 95 },
  { name: 'Engineering', attendance: 82 },
  { name: 'Sales', attendance: 68 }
];
getHeatColor(value: number): string {
  if (value > 20) return '#d1fae5';
  if (value > 10) return '#fef3c7';
  return '#fee2e2';
}*/

  getHeatColor(value: number): string {
  if (value > 90) return '#d1fae5';
  if (value > 75) return '#fef3c7';
  return '#fee2e2';
}

}
