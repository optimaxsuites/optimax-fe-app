import { Component, EventEmitter, Input, input, Output, SimpleChanges } from '@angular/core';
import { ItemDTO } from '../../../domain/quotation.dto';

@Component({
  selector: 'app-add-quotation-item',
  templateUrl: './add-quotation-item.component.html',
  styleUrl: './add-quotation-item.component.scss'
})
export class AddQuotationItemComponent {
  itemIdCounter: number = 1;
  // @Input() isEdit: boolean = false; // To handle Edit mode
  // @Input() itemData: any = {}; // The item data to edit, if any
  // @Output() itemAdded = new EventEmitter<any>();

  // @Output() itemAdded = new EventEmitter<any>();
  // itemData: any = {}; 

constructor(
){

}
  // onInputChange() {
  //   this.calculateValues();
  // }

  // Method to calculate amount, tax, and total based on user inputs
  // calculateValues() {
  //   if (this.itemData.qty && this.itemData.rate) {
  //     this.itemData.amount = this.itemData.qty * this.itemData.rate;
  //   } else {
  //     this.itemData.amount = 0;
  //   }

  //   if (this.itemData.amount && this.itemData.taxRate) {
  //     this.itemData.tax = (this.itemData.amount * this.itemData.taxRate) / 100;
  //   } else {
  //     this.itemData.tax = 0;
  //   }

  //   this.itemData.total = this.itemData.amount + this.itemData.tax || 0;
  // }

  // // Method to handle item addition and logging
  // addItem() {
  //   this.calculateValues();

  //   const newItem: ItemDTO = { ...this.itemData };
  //   console.log('Created Item:', newItem);

  //   // Optionally, reset the form after adding the item
  //   this.itemData = {};
  // }

  @Input() isEdit: boolean | undefined;
  @Input() itemToEdit: any = null;
  @Output() itemEdited = new EventEmitter<{ item: any }>();

  @Output() itemAdded = new EventEmitter<any>();

  itemData?: any = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['itemToEdit'] && this.itemToEdit) {
      this.itemData = { ...this.itemToEdit }; // Populate form for editing
    }
  }

  addItem() {
    if (!this.itemData.name || !this.itemData.serialNo || !this.itemData.qty) {
      alert('Please fill all required fields.');
      return;
    }


    if (this.isEdit) {
      // Emit the edited item with its index
      this.itemEdited.emit({ item: { ...this.itemData } });
    } else {
      // Emit a new item
      this.itemAdded.emit({ ...this.itemData, id: this.itemIdCounter++ });
    } // Emit a copy of the item data
    this.resetForm();
  }

  resetForm() {
    this.itemData = {};
    this.isEdit = false;
  }

  
  
}
