import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-ledger',
  templateUrl: './finance-ledger.component.html',
  styleUrls: ['./finance-ledger.component.scss'],
})
export class FinanceLedgerComponent {
  activeTab = 'ledger';
  setTab(tab: string) { this.activeTab = tab; }
}
