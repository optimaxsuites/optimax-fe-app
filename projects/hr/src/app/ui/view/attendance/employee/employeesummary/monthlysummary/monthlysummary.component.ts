import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-monthlysummary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthlysummary.component.html',
  styleUrl: './monthlysummary.component.scss'
})
export class MonthlysummaryComponent {
   monthlyPerformance = {
    attendanceRate: 92,
    punctualityScore: 87,
    totalOvertime: 12.5,
    absences: 1
  };

}
