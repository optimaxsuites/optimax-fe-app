import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-heropage',
  templateUrl: './heropage.component.html',
  styleUrl: './heropage.component.scss',
})
export class HeropageComponent implements OnInit {
  ngOnInit(): void {
    // Set default dates
    this.setDefaultDates();
  }

  private setDefaultDates(): void {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinInput = document.querySelector(
      'input[type="date"]:first-of-type'
    ) as HTMLInputElement;
    const checkoutInput = document.querySelector(
      'input[type="date"]:last-of-type'
    ) as HTMLInputElement;

    if (checkinInput && checkoutInput) {
      checkinInput.value = today.toISOString().split('T')[0];
      checkoutInput.value = tomorrow.toISOString().split('T')[0];
    }
  }

  onSearch(): void {
    // Handle search functionality
    console.log('Search initiated');
  }
}
