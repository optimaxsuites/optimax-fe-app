import { Location } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-back-button',
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss'
})
export class BackButtonComponent {

  @Output() backEvent = new EventEmitter<void>();

  constructor(private location: Location) {}

  goBack() {
    // First, try to navigate back using Angular's location service.
    this.location.back();
    // Emit an event to notify parent components if they need to handle something.
    this.backEvent.emit();
  }
}
