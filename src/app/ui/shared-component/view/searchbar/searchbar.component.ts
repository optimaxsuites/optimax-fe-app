import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import Fuse from 'fuse.js';

@Component({
  selector: 'app-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
})
export class SearchbarComponent {
  @Input() listToSearch: unknown[] = [];
  @Input() listToUpdate: typeof this.listToSearch = [];
  @Output() listToUpdateChange = new EventEmitter<typeof this.listToSearch>();

  private fuse: Fuse<unknown>;

  constructor() {
    // Initialize Fuse with an empty list. This will be updated later.
    this.fuse = new Fuse([], {
      keys: [   { name: 'sku', weight: 2 }, { name: 'name', weight: 1.5 }, 'description', 'category'],
      includeScore: true,
      threshold: 0.333, // Lower threshold for less fuzzy matching
    });
  }

  ngOnChanges() {
    // Update Fuse with the new list whenever listToSearch changes.
    this.fuse.setCollection(this.listToSearch);
  }

  searchgroups(searchValue: string) {
    if (!searchValue.trim()) {
      this.listToUpdate = this.listToSearch; 
      this.listToUpdateChange.emit(this.listToUpdate);
      return;
    }

    if (/^\d+$/.test(searchValue)) {
      const exactMatch = this.listToSearch.find((item: any )=> item.sku === searchValue);
      if (exactMatch) {
        this.listToUpdate = [exactMatch];
        this.listToUpdateChange.emit(this.listToUpdate);
        return;
      }
    }

    const searchResults = this.fuse.search(searchValue);
    this.listToUpdate = searchResults.map((val) => val.item);
    this.listToUpdateChange.emit(this.listToUpdate);
  }

  clearSearchText(searchInput: HTMLInputElement) {
    searchInput.value = '';
    this.listToUpdate = this.listToSearch; // Show all items when cleared
    this.listToUpdateChange.emit(this.listToUpdate);
  }
}
