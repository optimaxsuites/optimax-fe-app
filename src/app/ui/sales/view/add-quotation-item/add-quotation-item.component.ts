import { Component } from '@angular/core';
import { ItemsDTO } from '../../domain/quotation.dto';
import { QuotationModalComponent } from '../quotation-modal/quotation-modal.component';

@Component({
  selector: 'app-add-quotation-item',
  templateUrl: './add-quotation-item.component.html',
  styleUrl: './add-quotation-item.component.scss'
})
export class AddQuotationItemComponent {
  itemsData: ItemsDTO = {};

constructor(
  public quotationModalComponent: QuotationModalComponent
){

}
  onInputChange() {
    this.calculateValues();
  }

  // Method to calculate amount, tax, and total based on user inputs
  calculateValues() {
    if (this.itemsData.qty && this.itemsData.rate) {
      this.itemsData.amount = this.itemsData.qty * this.itemsData.rate;
    } else {
      this.itemsData.amount = 0;
    }

    if (this.itemsData.amount && this.itemsData.taxRate) {
      this.itemsData.tax = (this.itemsData.amount * this.itemsData.taxRate) / 100;
    } else {
      this.itemsData.tax = 0;
    }

    this.itemsData.total = this.itemsData.amount + this.itemsData.tax || 0;
  }

  // Method to handle item addition and logging
  addItem() {
    this.calculateValues();

    const newItem: ItemsDTO = { ...this.itemsData };
    console.log('Created Item:', newItem);

    // Optionally, reset the form after adding the item
    this.itemsData = {};
  }


}
