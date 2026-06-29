import { Component } from '@angular/core';

@Component({
  selector: 'app-crm-government',
  templateUrl: './crm-government.component.html',
  styleUrls: ['./crm-government.component.scss'],
})
export class CrmGovernmentComponent {
  activeTab = 'citizens';

  setTab(tab: string): void {
    this.activeTab = tab;
  }
}
