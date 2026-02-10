import { Component } from '@angular/core';

@Component({
  selector: 'app-today-summary',
  templateUrl: './today-summary.component.html',
  styleUrl: './today-summary.component.scss'
})
export class TodaySummaryComponent {
    summary = {
    hoursWorked: 5.2,
    expectedHours: 8,
    lateMinutes: 12,
    overtime: 0.5
  };

}
