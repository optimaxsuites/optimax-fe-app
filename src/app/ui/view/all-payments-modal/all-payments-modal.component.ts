import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-all-payments-modal',
  templateUrl: './all-payments-modal.component.html',
  styleUrl: './all-payments-modal.component.scss',
})
export class AllPaymentsModalComponent {
  @Input() isModalOpen = false;
  @Output() isModalOpenChange = new EventEmitter<typeof this.isModalOpen>();

  closeModal() {
    this.isModalOpen = false;
    this.isModalOpenChange.emit(this.isModalOpen);
  }
}
