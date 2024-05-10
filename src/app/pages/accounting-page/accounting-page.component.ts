import { Component } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
// import { InvoiceModalComponent } from '../../components/invoice-modal/invoice-modal.component';

@Component({
  selector: 'app-accounting-page',
  templateUrl: './accounting-page.component.html',
  styleUrls: ['./accounting-page.component.scss']
})
export class AccountingPageComponent {

  // constructor( private dialogRef: MatDialog ){}

  openDialog(){
    // this.dialogRef.open(InvoiceModalComponent)
  }

}
