import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EmployeeCorrectionService } from '../../../../service/attendance/employee-correction.service';

@Component({
  selector: 'app-employeedashboard',
  templateUrl: 'employeedashboard.component.html',
  styleUrl: 'employeedashboard.component.scss',
  providers: [MessageService]
})
export class EmployeedashboardComponent {
  showCorrectionModal = false;

  constructor(
    private messageService: MessageService,
    private correctionService: EmployeeCorrectionService
  ) {}

  openCorrectionForm() {
    this.showCorrectionModal = true;
  }

  closeCorrectionForm() {
    this.showCorrectionModal = false;
  }

  handleCorrectionSubmit(event: any): void {
    this.correctionService.submitForCurrentEmployee(event).subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: 'Correction Request Submitted',
        detail: 'Your request has been submitted for review',
        key: 'tl',
        life: 3000
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: 'Submission Failed',
        detail: 'Could not submit your correction request. Please try again.',
        key: 'tl',
        life: 4000
      })
    });
    this.closeCorrectionForm();
  }
}
