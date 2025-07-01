import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, map, startWith } from 'rxjs';

export interface DialogData {
  invoiceNo: string;
  name: string;
}

@Component({
  selector: 'app-payment-record-received',
  templateUrl: './payment-record-received.component.html',
  styleUrl: './payment-record-received.component.scss',
})
export class PaymentRecordReceivedComponent {
  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions!: Observable<string[]>;
  filteredPayments!: Observable<string[]>;
  // optionPaymentMethod: string[] = [
  //   'Account Transfer',
  //   'Cheque',
  //   'Cash',
  //   'Debit Card',
  //   'Credit Card',
  //   'Prepaid Card',
  //   'Digital Wallet',
  // ];
  optionBank: string[] = [
    'Zenith Bank',
    'Guaranty Trust Bank',
    'Union Bank',
    'First Bank',
  ];
  myControl = new FormControl('');

  paymentMethodControl = new FormControl('');

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  constructor(
    public dialogRef: MatDialogRef<PaymentRecordReceivedComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  ngOnInit() {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      // map((value) => this._filter(value || ''))
      map((value) => this._filter(value || '', this.options))
    );

    this.filteredPayments = this.paymentMethodControl.valueChanges.pipe(
      startWith(''),
      // map((value) => this._filter(value || ''))
      map((value) => this._filter(value || '', this.optionBank))
    );
  }
}
