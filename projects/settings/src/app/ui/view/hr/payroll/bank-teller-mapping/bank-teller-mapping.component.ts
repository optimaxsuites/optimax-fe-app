import { Component } from '@angular/core';
import { BankTemplateService } from '../../../../service/bankTemplateMapping';
export type PayrollExportField =
  | 'employeeName'
  | 'accountNumber'
  | 'bankCode'
  | 'bankName'
  | 'amount'
  | 'narration'
  | 'reference'
  | 'email'
  | 'phone'
  | 'paymentDate';

export interface BankExportColumn {
  header: string;
  field: PayrollExportField;
  staticValue?: string;  // optional fixed value
  format?: string;       // optional formatting
}

export interface BankExportTemplate {
  id: number;
  name: string;
  delimiter: ',' | ';' | '\t';
  includeHeader: boolean;
  columns: BankExportColumn[];
}
@Component({
  selector: 'app-bank-teller-mapping',
  templateUrl: './bank-teller-mapping.component.html',
  styleUrl: './bank-teller-mapping.component.scss'
})
export class BankTellerMappingComponent {
template: BankExportTemplate = {
    id: Date.now(),
    name: 'New Template',
    delimiter: ',',
    includeHeader: true,
    columns: []
  };

  systemFields = [
    { label: 'Employee Name', value: 'employeeName' },
    { label: 'Account Number', value: 'accountNumber' },
    { label: 'Bank Code', value: 'bankCode' },
    { label: 'Bank Name', value: 'bankName' },
    { label: 'Amount', value: 'amount' },
    { label: 'Narration', value: 'narration' },
    { label: 'Reference', value: 'reference' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Payment Date', value: 'paymentDate' }
  ];

  constructor(private templateService: BankTemplateService) {}

  ngOnInit() {
    if (!this.template.columns.length) {
      // default columns
      this.template.columns = [
        { header: 'Account Number', field: 'accountNumber' },
        { header: 'Employee Name', field: 'employeeName' },
        { header: 'Bank Code', field: 'bankCode' },
        { header: 'Amount', field: 'amount' }
      ];
    }
  }

  saveTemplate() {
    this.templateService.saveTemplate(this.template);
    // alert('Template saved locally');
    console.log("Template saved locally")
  }
}
