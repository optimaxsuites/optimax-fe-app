import { Component, Type } from '@angular/core';
import { ReconcileSalesComponent } from '../reconcile-sales/reconcile-sales.component';

export interface TabConfig {
  name: string;
  component: any;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  role?: string;
}

export interface DropdownOption {
  label: string;
  action: string;
  component: Type<any>;
}


@Component({
  selector: 'app-reconciliation-tab',
  templateUrl: './reconciliation-tab.component.html',
  styleUrl: './reconciliation-tab.component.scss'
})
export class ReconciliationTabComponent {
    tabsConfig: TabConfig[] = [
      {
        name: 'Reconcile sales',
        component: ReconcileSalesComponent,
      },
    ];
}
