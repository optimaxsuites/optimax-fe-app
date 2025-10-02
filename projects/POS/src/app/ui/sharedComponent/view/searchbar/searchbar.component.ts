import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Fuse from 'fuse.js';

// Interface for a product with optional branch info (for global results)
interface SearchProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  productCategory?: { name: string }; 
  branchName?: string; // Branch name or ID for display
  address?: string; // Branch location
}

@Component({
  selector: 'app-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule], 
})
export class SearchbarComponent {
  //  CHANGED: Stricter typing for the input list
  @Input() listToSearch: SearchProduct[] = [];
  // The parent component will manage listToUpdate based on results from here
  @Input() listToUpdate: SearchProduct[] = []; 
  @Output() listToUpdateChange = new EventEmitter<SearchProduct[]>();

  currentSearchQuery = ''; 
  
  //  CHANGED: Output for global search signal (to parent)
  @Output() globalSearch = new EventEmitter<string>();
  
  /** Dropdown & state management */
  isDropdownOpen = false;
  
  // State for global search results (from parent)
  @Input() globalSearchResults: any[] = []; 
  @Input() isSearching: boolean = false;   
  @Input() searchError: string | null = null;

  //  NEW: Tracks if the user has clicked the icon to trigger a global search
  hasGlobalSearchBeenTriggered = false; 

  // Local state for suggestion display
  localSearchResults: SearchProduct[] = []; 
  noLocalResults = false; 
  
  private fuse: Fuse<SearchProduct>;

  constructor() {
    this.fuse = new Fuse([], {
      keys: [
        { name: 'sku', weight: 2 },
        { name: 'name', weight: 1.5 },
      ],
      includeScore: true,
      threshold: 0.3, 
    });
  }

  ngOnChanges() {
    this.fuse.setCollection(this.listToSearch);
    
    //  CHANGED: If search is active and results arrive, open the dropdown
    // Dropdown only opens when a global search is triggered or if there are local results to suggest.
    // MODIFIED: Only ensure dropdown is open if global search is active or triggered
    if (this.currentSearchQuery.trim() && (this.isSearching || this.hasGlobalSearchBeenTriggered)) {
        this.isDropdownOpen = true; 
    }
    
    // Re-filter local suggestions if the list changes while typing
    if (this.currentSearchQuery.trim()) {
        this.searchProducts(this.currentSearchQuery, true); // Re-run search logic without clearing
    }
  }


  searchProducts(searchValue: string, isNgOnChangesTriggered = false) {
    this.currentSearchQuery = searchValue;
    const trimmedValue = searchValue.trim();
    
    // 1. Reset everything on empty search
    if (!trimmedValue) {
      this.resetList();
      this.localSearchResults = [];
      this.noLocalResults = false;
      this.isDropdownOpen = false;
      this.hasGlobalSearchBeenTriggered = false; 
      this.globalSearchResults = []; 
      return;
    }

    // 2. Local Search Logic
    // MODIFIED: Do not set this.isDropdownOpen = true here. It will be controlled by focus/global trigger.
    let searchResults: SearchProduct[] = [];

    if (trimmedValue.length <= 7) { // Allow broader suggestions for first few characters
      searchResults = this.listToSearch.filter(p => 
        p.name.toLowerCase().startsWith(trimmedValue.toLowerCase()) || 
        p.sku.startsWith(trimmedValue)
      );
    } else {
      //  CHANGED: Use fuzzy search for more precise "contains" matching
      const fuseResults = this.fuse.search(trimmedValue);
      searchResults = fuseResults.map((val) => val.item);
    }
    
    // 3. Update the main product list (the grid) and dropdown suggestions
    // BUG FIX: Set listToUpdate to an empty array if no matches are found, clearing the product grid.
    if (searchResults.length === 0) {
      this.listToUpdate = [];
    } else {
      this.listToUpdate = searchResults;
    }
    this.listToUpdateChange.emit(this.listToUpdate);
    
    // Update local suggestions for the dropdown
    this.localSearchResults = searchResults.slice(0, 5); // Limit suggestions to 5
    this.noLocalResults = searchResults.length === 0;

    // 4. Clear global results when typing new query (unless triggered by ngOnChanges)
    if (!isNgOnChangesTriggered) {
        // MODIFIED: Only reset global trigger state if a new *different* query is typed
        this.hasGlobalSearchBeenTriggered = false;
        this.globalSearchResults = []; 
    }

    // MODIFIED: If there are no local results, open the dropdown to show the prompt to check global
    if (this.noLocalResults && !this.hasGlobalSearchBeenTriggered) {
        this.isDropdownOpen = true;
    } else if (this.hasGlobalSearchBeenTriggered) {
        // Keep it open if a global search was triggered
        this.isDropdownOpen = true;
    } else {
        // Close if local search is happening and no global search is active
        this.isDropdownOpen = false;
    }
  }
  
  /** Handle search icon click to trigger global search */
  onGlobalSearchClick() {
    const trimmedValue = this.currentSearchQuery.trim();
    
    if (!trimmedValue) {
      // If no query, just toggle dropdown visibility
      this.isDropdownOpen = !this.isDropdownOpen;
      this.hasGlobalSearchBeenTriggered = false; 
      return;
    }
    
    // NEW: Only trigger global search on click
    this.hasGlobalSearchBeenTriggered = true;
    this.isDropdownOpen = true; // Keep dropdown open while searching
    this.globalSearch.emit(trimmedValue); // Parent starts the search
  }

  /** Clear the text and reset local/global search */
  clearSearchText(searchInput: HTMLInputElement) {
    searchInput.value = '';
    this.currentSearchQuery = '';
    this.isDropdownOpen = false;
    this.localSearchResults = []; 
    this.noLocalResults = false;  
    this.hasGlobalSearchBeenTriggered = false; 
    this.globalSearchResults = []; 
    this.globalSearch.emit(''); // Signal parent to clear state
    this.resetList();
  }

  /** Reset the product grid to show all products */
  private resetList() {
    this.listToUpdate = this.listToSearch;
    this.listToUpdateChange.emit(this.listToUpdate);
  }

  // Helper for stock color
  getStockColor(quantity: number): string {
    if (quantity > 10) return 'text-green-600';
    if (quantity > 0) return 'text-orange-500';
    return 'text-red-600';
  }
  
  // Helper to close dropdown
  closeDropdown() {
    // A small delay allows click events inside the dropdown to register before hiding.
    // MODIFIED: Ensure dropdown remains open if a global search was triggered and is not yet finished.
    if (!this.isSearching && !this.noLocalResults) { // Only close if not searching and we have local results (which hide the prompt to check global)
        setTimeout(() => {
            this.isDropdownOpen = false;
        }, 150); 
    }
    
  }

  // NEW: Filter global search results to only show in-stock items.
  get inStockGlobalResults(): any[] {
    return this.globalSearchResults.filter(result => result.quantity > 0);
  }

}