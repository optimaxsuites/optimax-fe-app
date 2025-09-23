import { Component, Type } from '@angular/core';
import { ReconcillationComponent } from '../reconcillation/reconcillation.component';
import { SalesReconcilationComponent } from '../sales-reconcilation/sales-reconcilation.component';
export interface TabConfig {
  name: string;
  component: any;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[]; 
  role?: string
}

export interface DropdownOption {
  label: string; 
  action: string; 
  component: Type<any>;
}

@Component({
  selector: 'app-general-reconcilation',
  templateUrl: './general-reconcilation.component.html',
  styleUrl: './general-reconcilation.component.scss'
})
export class GeneralReconcilationComponent {
 tabsConfig: TabConfig[] = [
      {
        name: 'Bank Reconcilation',
        component: ReconcillationComponent,
      },

      {
        name: 'Sales Reconcilation',
        component: SalesReconcilationComponent
      },
    ]
}
