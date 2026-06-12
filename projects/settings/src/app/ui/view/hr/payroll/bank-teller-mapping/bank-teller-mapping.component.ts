import { Component, OnInit } from '@angular/core';
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
  styleUrls: ['./bank-teller-mapping.component.scss']
})
export class BankTellerMappingComponent implements OnInit {

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

  ngOnInit(): void {
    const stored = this.templateService.getTemplate();
    if (stored) {
      this.template = stored;
    } else {
      // default columns if nothing in storage
      this.template.columns = [
        { header: 'Account Number', field: 'accountNumber' },
        { header: 'Employee Name', field: 'employeeName' },
        { header: 'Bank Code', field: 'bankCode' },
        { header: 'Amount', field: 'amount' }
      ];
    }
  }

  addColumn(): void {
    this.template.columns.push({
      header: '',
      field: this.systemFields[0].value as PayrollExportField
    });
  }

  removeColumn(index: number): void {
    this.template.columns.splice(index, 1);
  }

  saveTemplate(): void {
    this.templateService.saveTemplate(this.template);
    console.log('Template saved to local storage');
  }
}