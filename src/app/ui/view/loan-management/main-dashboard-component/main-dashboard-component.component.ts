import { Component } from '@angular/core';

@Component({
  selector: 'app-main-dashboard-component',
  templateUrl: './main-dashboard-component.component.html',
  styleUrls: ['./main-dashboard-component.component.scss']
})
export class MainDashboardComponent {
  selectedDashboard: 'welfare' | 'cooperative' = 'welfare';

  onDashboardChange(value: 'welfare' | 'cooperative'): void {
    this.selectedDashboard = value;
  }
}
