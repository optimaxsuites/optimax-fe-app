import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-coa',
  templateUrl: './finance-coa.component.html',
  styleUrls: ['./finance-coa.component.scss'],
})
export class FinanceCoaComponent {
  expanded: { [key: string]: boolean } = { '1000': false, '4000': false, '5000': false };
  toggle(code: string) { this.expanded[code] = !this.expanded[code]; }
}
