import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-large-side-modal',
  templateUrl: './large-side-modal.component.html',
  styleUrl: './large-side-modal.component.scss',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('openClose', [
      state('open', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      state('closed', style({
        transform: 'translateX(100%)',
        opacity: 0.8
      })),
      transition('open => closed', [
        animate('0.5s ease-in-out')
      ]),
      transition('closed => open', [
        animate('0.5s ease-in-out')
      ]),
    ]),
  ],
})
export class LargeSideModalComponent {
  @Output() close = new EventEmitter<void>();
  @Input() style: { [key: string]: any } = {};
  @Input() class!: string;
  @Input() header = 'Details';
  @Input() subheader?: string;

  closeModal() {
    this.close.emit();
  }
  onEsc(): void {
    this.closeModal();
  }
}
