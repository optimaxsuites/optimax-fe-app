import { Component } from '@angular/core';

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.scss']
})
export class EarningsComponent {
  isClockedIn: boolean = false; // This will track the clock-in state

  chartOptions = {
    animationEnabled: true,
    title: {
      // text: "Project Cost Breakdown"
    },
    data: [{
      type: "doughnut",
      // yValueFormatString: "#,###.##'%'",
      indexLabel: "{name}",
      dataPoints: [
        { y: 28, name: "Income" },
        { y: 10, name: "Expense" },
        { y: 20, name: "Balance" },
      ]
    }]
  };

  // Method to toggle clock-in/clock-out state
  toggleClockInOut(): void {
    this.isClockedIn = !this.isClockedIn;
  }
}
