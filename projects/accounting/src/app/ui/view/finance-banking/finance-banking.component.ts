import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-banking',
  templateUrl: './finance-banking.component.html',
  styleUrls: ['./finance-banking.component.scss'],
})
export class FinanceBankingComponent {
  activeTab = 'accounts';
  setTab(tab: string) { this.activeTab = tab; }
}
