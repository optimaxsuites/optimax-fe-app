import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-guarantor-approval-modal',
  templateUrl: './guarantor-approval-modal.component.html',
  styleUrls: ['./guarantor-approval-modal.component.scss']
})
export class GuarantorApprovalModalComponent {
    @Input() loading: boolean = false;
    @Input() error: string = '';
  @Input() loanSummary: any;
  @Input() visible: boolean = false;
  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onApprove() {
    this.approve.emit();
  }

  onReject() {
    this.reject.emit();
  }

  onClose() {
    this.close.emit();
  }
}
