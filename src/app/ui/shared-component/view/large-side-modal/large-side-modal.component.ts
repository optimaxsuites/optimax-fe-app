import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-large-side-modal',
  templateUrl: './large-side-modal.component.html',
  styleUrl: './large-side-modal.component.scss',
  standalone: true,
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
  dragOffset = { x: 0, y: 0 };
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private initialOffset = { x: 0, y: 0 };

  closeModal() {
    this.close.emit();
  }

  beginDrag(event: MouseEvent): void {
    this.dragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.initialOffset = { ...this.dragOffset };
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    this.dragOffset = {
      x: this.initialOffset.x + (event.clientX - this.dragStart.x),
      y: this.initialOffset.y + (event.clientY - this.dragStart.y),
    };
  }

  @HostListener('window:mouseup')
  endDrag(): void {
    this.dragging = false;
  }

}
