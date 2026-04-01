import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-delivery-modal',
  templateUrl: './delivery-modal.component.html',
  styleUrl: './delivery-modal.component.scss',
})
export class DeliveryModalComponent {
  @Input() isDeliveryModalOpen = false;
  @Output() isDeliveryModalOpenChange = new EventEmitter<
    typeof this.isDeliveryModalOpen
  >();

  closeDeliveryModal() {
    this.isDeliveryModalOpen = false;
  }
}
