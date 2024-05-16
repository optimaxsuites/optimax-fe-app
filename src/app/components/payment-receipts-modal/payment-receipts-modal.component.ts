import { Component, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { AngularEditorConfig } from '@kolkov/angular-editor';

@Component({
  selector: 'app-payment-receipts-modal',
  templateUrl: './payment-receipts-modal.component.html',
  styleUrl: './payment-receipts-modal.component.scss',
})
export class PaymentReceiptsModalComponent {
  tableData: any[] = [{}];
  myControl = new FormControl('');
  currencyControl = new FormControl('');
  paymentMethodControl = new FormControl('');
  options: string[] = ['One', 'Two', 'Three'];
  optionCurrency: string[] = ['USD', 'NGN', 'GBP', 'JPY', 'RAND', 'EUR'];
  optionPaymentMethod: string[] = [
    'Account Transfer',
    'Cheque',
    'Cash',
    'Debit Card',
    'Credit Card',
    'Prepaid Card',
    'Digital Wallet',
  ];

  filteredOptions!: Observable<string[]>;
  filteredCurrencies!: Observable<string[]>;
  filteredPayments!: Observable<string[]>;
  item: any;

  htmlContent: string = '';
  showEditor: boolean = false;
  showContactEditor: boolean = false;

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '200px',
    maxHeight: '200px',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      [
        'undo',
        'redo',
        'strikeThrough',
        'subscript',
        'superscript',
        'justifyLeft',
        'justifyCenter',
        'justifyRight',
        'justifyFull',
        'insertUnorderedList',
        'insertOrderedList',
        'fontName',
      ],
      [
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'removeFormat',
        'toggleEditorMode',
      ],
    ],
  };

  toggleEditor() {
    this.showEditor = !this.showEditor;
  }

  toggleContactDetails() {
    this.showContactEditor = !this.showContactEditor;
  }
  ngOnInit() {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      // map((value) => this._filter(value || ''))
      map((value) => this._filter(value || '', this.options))
    );
    this.filteredCurrencies = this.currencyControl.valueChanges.pipe(
      startWith(''),
      // map((value) => this._filter(value || ''))
      map((value) => this._filter(value || '', this.optionCurrency))
    );
    this.filteredPayments = this.paymentMethodControl.valueChanges.pipe(
      startWith(''),
      // map((value) => this._filter(value || ''))
      map((value) => this._filter(value || '', this.optionPaymentMethod))
    );
  }

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  // private _filter(value: string): string[] {
  //   const filterValue = value.toLowerCase();

  //   return this.options.filter((option) =>
  //     option.toLowerCase().includes(filterValue)
  //   );
  // }
}
