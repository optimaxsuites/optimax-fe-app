import { Component, Input  } from '@angular/core';

@Component({
  selector: 'app-payslip-view',
  templateUrl: './payslip-view.component.html',
  styleUrl: './payslip-view.component.scss'
})
export class PayslipViewComponent {
  @Input() payslip: any;
  monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];
  
  toTitleCaseWithSpace(key: any): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str: string) => str.toUpperCase());
  }
}
