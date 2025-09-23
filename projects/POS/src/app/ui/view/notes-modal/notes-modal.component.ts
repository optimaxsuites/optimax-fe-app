import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-notes-modal',
  templateUrl: './notes-modal.component.html',
  styleUrl: './notes-modal.component.scss',
})
export class NotesModalComponent {
  @Input() isNotesModalOpen = false;
  @Output() isNotesModalOpenChange = new EventEmitter<
    typeof this.isNotesModalOpen
  >();

  closeNotesModal() {
    this.toggleNotesModal();
  }

  toggleNotesModal() {
    this.isNotesModalOpen = !this.isNotesModalOpen;
    this.isNotesModalOpenChange.emit(this.isNotesModalOpen);
  }
}
