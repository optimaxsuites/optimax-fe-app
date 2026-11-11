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
  /**
   * How far the panel has been dragged. It is applied as top/right offsets, not a CSS transform: a
   * transform makes the panel the box that `position: fixed` children are placed in, so a modal opened
   * from inside this one (e.g. a payslip from an employee profile) would sit at the top of this panel's
   * scrolled content, out of view, instead of over the screen.
   */
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
