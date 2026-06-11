import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-heropage',
  templateUrl: './heropage.component.html',
  styleUrl: './heropage.component.scss',
})
export class HeropageComponent implements OnInit, OnDestroy {
  searchPlaceholder = 'Where do you want to stay?';
  private placeholders = [
    'i need a big room for a family',
    'Room under ₦80,000 for 3 nights near the pool',
    'Looking for a luxury suite with ocean view',
    'Modern stay in Lagos for a business trip',
    'Cozy studio for a weekend getaway'
  ];
  private placeholderIndex = 0;
  private intervalId: any;

  ngOnInit(): void {
    this.startPlaceholderTransition();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startPlaceholderTransition(): void {
    this.intervalId = setInterval(() => {
      this.placeholderIndex = (this.placeholderIndex + 1) % this.placeholders.length;
      this.searchPlaceholder = this.placeholders[this.placeholderIndex];
    }, 3000);
  }

  onSearch(): void {
    console.log('Searching for:', this.searchPlaceholder);
    // Navigation to AllRooms could go here
  }
}
