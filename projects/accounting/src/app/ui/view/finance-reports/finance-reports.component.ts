import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-reports',
  templateUrl: './finance-reports.component.html',
  styleUrls: ['./finance-reports.component.scss']
})
export class FinanceReportsComponent {
  activeReport = 'income';

  setReport(r: string) {
    this.activeReport = r;
  }
}
