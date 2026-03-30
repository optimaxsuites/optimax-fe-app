import { Component } from '@angular/core';

type MetaTab = 'general' | 'taxation' | 'bankTellerMapping' | 'departments' | 'jobTypes' | 'relationships';


@Component({
  selector: 'app-payroll',
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.scss'
})

export class PayrollComponent {
  activeTab: MetaTab = 'general';
  loading = false;
  saving = false;


    setActiveTab(tab: MetaTab): void {
    this.activeTab = tab;
    // this.metaForm.reset();
  }
}
