import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-interview-invite',
  templateUrl: './interview-invite.component.html',
  styleUrl: './interview-invite.component.scss'
})
export class InterviewInviteComponent {
  @Output() back = new EventEmitter<void>();

  // Method to trigger back button event
  goBack() {
    this.back.emit();
  }
}
