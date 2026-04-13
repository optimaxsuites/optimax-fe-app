import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-dashboardside-modal',
  templateUrl: './dashboardside-modal.component.html'
})
export class DashboardsideModalComponent {
  @Input() transaction: any;       // 👈 receive data from parent
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }


}
    
