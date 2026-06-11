import { Component, EventEmitter, Input, input, Output, SimpleChanges } from '@angular/core';
import { ItemDTO } from '../../../domain/quotation.dto';
import { RandomTokenService } from '../../../sharedComponent/service/random-token/random-token.service';

@Component({
  selector: 'app-add-quotation-item',
  templateUrl: './add-quotation-item.component.html',
  styleUrl: './add-quotation-item.component.scss'
})
export class AddQuotationItemComponent {
  itemIdCounter: number = 1;
  itemId?: string;
  // @Input() isEdit: boolean = false; // To handle Edit mode
  // @Input() itemData: any = {}; // The item data to edit, if any
  // @Output() itemAdded = new EventEmitter<any>();

  // @Output() itemAdded = new EventEmitter<any>();
  // itemData: any = {}; 

  constructor(
    private randomToken: RandomTokenService
  ){}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.itemId = this.randomToken.getRandomToken();
  }
  onInputChange() {
    this.calculateValues();
  }

  // Method to calculate amount, tax, and total based on user inputs
  calculateValues() {
    if (this.itemData.qty && this.itemData.rate) {
      this.itemData.amount = this.itemData.qty * this.itemData.rate;
    } else {
      this.itemData.amount = 0;
    }

    if (this.itemData.amount && this.itemData.taxRate) {
      this.itemData.tax = (this.itemData.amount * this.itemData.taxRate) / 100;
    } else {
      this.itemData.tax = 0;
    }

    this.itemData.total = this.itemData.amount + this.itemData.tax || 0;
  }

  // Method to handle item addition and logging
  // addItem() {
  //   this.calculateValues();

  //   const newItem: ItemDTO = { ...this.itemData };
  //   console.log('Created Item:', newItem);

  //   // Optionally, reset the form after adding the item
  //   this.itemData = {};
  // }

  @Input() isRfq? : boolean;
  @Input() isQuote? : boolean;

  @Input() isEdit: boolean | undefined;
  @Input() itemToEdit: any = null;
  @Output() itemEdited = new EventEmitter<{ item: any }>();

  @Output() itemAdded = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();


  itemData?: any = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['itemToEdit'] && this.itemToEdit) {
      this.itemData = { ...this.itemToEdit }; // Populate form for editing
    }
  }

  addItem() {

    if(this.isRfq){
      if (!this.itemData.name || !this.itemData.qty) {
        alert('Please fill all required fields.');
        return;
      }
    }
    else if(this.isQuote){
      if (!this.itemData.qty || !this.itemData.taxRate || !this.itemData.amount) {
        alert('Please fill all required fields.');
        return;
      }
    }

    this.calculateValues();



    if (this.isEdit) {
      // Emit the edited item with its index
      this.itemEdited.emit({ item: { ...this.itemData } });
      console.log('edited', this.itemEdited)
    } else {
      // Emit a new item
      this.itemAdded.emit({ ...this.itemData, id: this.itemId });
      console.log('added', this.itemAdded)

    } // Emit a copy of the item data
    this.resetForm();
this.back.emit();
  }

  resetForm() {
    this.itemData = {};
    this.isEdit = false;
  }

  
  
}
