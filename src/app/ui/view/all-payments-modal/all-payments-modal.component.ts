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
    { label: 'Credit/Debit Card', value: 'card' },
    { label: 'Mobile Payment', value: 'mobile' },
    { label: 'Cash', value: 'cash' },
    { label: 'Loyalty', value: 'loyalty' }

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
