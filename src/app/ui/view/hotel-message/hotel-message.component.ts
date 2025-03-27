import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-hotel-message',
  templateUrl: './hotel-message.component.html',
  styleUrls: ['./hotel-message.component.scss'],
  providers: [MessageService],
})
export class HotelMessageComponent {
  @Input() billItems: BillItem[] = [];
  @Input() totalAmount: number = 0;
  @Input() room: any;

  confirmCheckout() {
    // This would be handled by parent component
  }
  constructor(private messageService: MessageService) {}

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
    });
  }

  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  showInfo(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: message,
    });
  }

  showWarn(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: message,
    });
  }
}
