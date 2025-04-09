import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-all-payments-modal',
  templateUrl: './all-payments-modal.component.html',
  styleUrl: './all-payments-modal.component.scss',
})
export class AllPaymentsModalComponent {
  @Input() isModalOpen = false;
  @Output() isModalOpenChange = new EventEmitter<typeof this.isModalOpen>();
  @Output() cashPayment = new EventEmitter<void>()
  @Output() selectedPayments = new EventEmitter<string[]>(); 

  selectedPaymentsToGo: string[] = [];


  paymentOptions = [
    { label: 'Credit/Debit Card', value: 'card', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFkT4bdkUrztzXha598tvVXUllrxOXaeRGVw&s' },
    { label: 'Mobile Payment', value: 'mobile', image: 'https://png.pngtree.com/element_our/png/20181114/mobile-banking-flat-icon-png_238400.jpg'},
    { label: 'Cash', value: 'cash', image: 'https://cdn-icons-png.flaticon.com/512/1087/1087099.png' },
    { label: 'Loyalty', value: 'loyalty', image: 'https://cdn-icons-png.flaticon.com/512/1440/1440505.png' }

  ];
  closeModal() {
    this.isModalOpen = false;
    this.isModalOpenChange.emit(this.isModalOpen);
  }

  proceedCashPayment(){
    this.cashPayment.emit()
  }

  togglePayment(paymentType: string) {
    if (this.selectedPaymentsToGo.includes(paymentType)) {
      this.selectedPaymentsToGo = this.selectedPaymentsToGo.filter(p => p !== paymentType);
    } else {
      this.selectedPaymentsToGo.push(paymentType);
    }
  }

  confirmPayment() {
    this.selectedPayments.emit(this.selectedPaymentsToGo); 
    this.closeModal; 
  }

}
