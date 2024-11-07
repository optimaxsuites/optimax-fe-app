import { Component, Input, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-vendor-quote-form',
  templateUrl: './vendor-quote-form.component.html',
  styleUrl: './vendor-quote-form.component.scss'
})
export class VendorQuoteFormComponent {
  // items: any[] = [
    

  // ]
  isEdit: boolean = false;

  // submitForm(){}


  // @Input() rfqData: any;

  @Input() rfqData: any = {};

  // Triggered when the rfqData input changes
  ngOnChanges(changes: SimpleChanges) {
    if (changes['rfqData'] && changes['rfqData'].currentValue) {
      // Automatically bind changes to rfqData using ngModel
      this.rfqData = { ...changes['rfqData'].currentValue };
    }
  }

  // Method for form submission
  submitForm() {
    console.log('RFQ Data:', this.rfqData);
    // Handle the form submission here, e.g., send rfqData to an API or service
  }
}
