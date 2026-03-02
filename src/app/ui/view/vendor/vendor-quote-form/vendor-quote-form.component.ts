import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-vendor-quote-form',
  templateUrl: './vendor-quote-form.component.html',
  styleUrl: './vendor-quote-form.component.scss'
})
export class VendorQuoteFormComponent {
  @Output() back = new EventEmitter<void>();

  items: any[] = [  ]

  isEdit: boolean = false;
  @Input() rfqData: any;

  
  goBack() {
    this.back.emit();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rfqData'] && changes['rfqData'].currentValue) {
      // Automatically bind changes to rfqData using ngModel
      this.rfqData = { ...changes['rfqData'].currentValue };
    }
  }

  submitForm() {
    console.log('RFQ Data:', this.rfqData);
    // Handle the form submission here, e.g., send rfqData to an API or service
  }
}
