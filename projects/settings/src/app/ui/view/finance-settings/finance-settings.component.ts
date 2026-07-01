import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-settings',
  templateUrl: './finance-settings.component.html',
  styleUrls: ['./finance-settings.component.scss']
})
export class FinanceSettingsComponent {
  activeTab = 'cats';

  setTab(t: string) {
    this.activeTab = t;
  }
}
