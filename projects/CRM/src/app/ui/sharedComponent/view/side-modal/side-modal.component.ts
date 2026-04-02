import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-side-modal',
  templateUrl: './side-modal.component.html',
  styleUrl: './side-modal.component.scss',
  standalone: true,
  imports: [CommonModule]

})
export class SideModalComponent {
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

}
