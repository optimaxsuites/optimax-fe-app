import { Component, EventEmitter, Input, Output } from '@angular/core';
import {Item} from '../pro-1/pro-1.component'

@Component({
  selector: 'app-add-pro',
  templateUrl: './add-pro.component.html',
  styleUrl: './add-pro.component.scss'
})
export class AddProComponent {
  @Output() back = new EventEmitter<void>();

  goBack() {
    this.back.emit();
  }

  @Output() addItem = new EventEmitter<Item>();
  @Input() isEdit: boolean = false;

  newItem: Item = { id: 0, name: '' };

  save() {
    if (this.isEdit) {
      this.addItem.emit(this.newItem);
    } else {
      this.addItem.emit({ ...this.newItem, id: Date.now() }); // Generate a new ID for the new item
    }
    this.back.emit();
  }

  cancel() {
    this.back.emit();
  }
}
