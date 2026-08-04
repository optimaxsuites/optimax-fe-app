import { Component } from '@angular/core';

@Component({
  selector: 'app-employeedashboard',
  templateUrl: 'employeedashboard.component.html',
  styleUrl: 'employeedashboard.component.scss'
})
export class EmployeedashboardComponent {
  showCorrectionModal = false;

  openCorrectionForm() {
    this.showCorrectionModal = true;
  }

  closeCorrectionForm() {
    this.showCorrectionModal = false;
  }
}
