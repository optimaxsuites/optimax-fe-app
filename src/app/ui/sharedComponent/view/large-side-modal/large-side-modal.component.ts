import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-large-side-modal',
  templateUrl: './large-side-modal.component.html',
  styleUrl: './large-side-modal.component.scss',
  standalone: true,
  imports: [NgIf],
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
  @Input() title: string = 'Modal Title';
  @Input() subtitle: string = '';
  @Output() onClose = new EventEmitter<void>();

  closeModal() {
    this.onClose.emit();
  }
}
