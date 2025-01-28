import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import Fuse from 'fuse.js';

@Component({
  selector: 'app-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SearchbarComponent {
  @Input() listToSearch: unknown[] = [];
  @Input() listToUpdate: typeof this.listToSearch = [];
  @Output() listToUpdateChange = new EventEmitter<typeof this.listToSearch>();

  searchProducts(searchInput: HTMLInputElement) {
    // TODO: Store the names of the keys of the product in const enum for better typechecking

    // Give more priority to the name
    const fuse = new Fuse(this.listToSearch, {
      keys: [{ name: 'name', weight: 1.5 }, 'description', 'category'],
      includeScore: true,
    });

    const searchResults = fuse.search(searchInput.value);

    this.listToUpdate = searchResults.map((val) => {
      return val.item;
    });
    searchInput.value = '';
    this.listToUpdateChange.emit(this.listToUpdate);
  }
}
