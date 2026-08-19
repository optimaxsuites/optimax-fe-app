import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-employeedashboard',
  templateUrl: 'employeedashboard.component.html',
  styleUrl: 'employeedashboard.component.scss',
  providers: [MessageService]
})
export class EmployeedashboardComponent {
  showCorrectionModal = false;

  constructor(private messageService: MessageService) {}

  openCorrectionForm() {
    this.showCorrectionModal = true;
  }

  closeCorrectionForm() {
    this.showCorrectionModal = false;
  }

  handleCorrectionSubmit(event: any): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Correction Request Submitted',
      detail: 'Your request has been submitted for review',
      key: 'tl',
      life: 3000
    });
    this.closeCorrectionForm();
  }
}
