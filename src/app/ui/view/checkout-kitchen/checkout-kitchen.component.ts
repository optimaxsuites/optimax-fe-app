import { Component, OnInit } from '@angular/core';

interface KitchenOrder {
  status: string;
  table: string;
  color: string;
}

@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrl: './checkout-kitchen.component.scss',
})
export class CheckoutKitchenComponent {
  // Sample data. In a real app, this might come from an API or service.
  tableStatuses = [
    { status: 'Pending', table: 'Table 21' },
    { status: 'Pending', table: 'Table 22' },
    { status: 'Pending', table: 'Table 23' },
    { status: 'Pending', table: 'Table 24' },
    { status: 'Pending', table: 'Table 25' },
    { status: 'Pending', table: 'Table 26' },
    { status: 'Pending', table: 'Table 27' },
    { status: 'Pending', table: 'Table 28' },
    { status: 'Pending', table: 'Table 29' },
    { status: 'Pending', table: 'Table 30' },
    // ... add as many as you want
  ];

  constructor() {}

  ngOnInit(): void {
    // Any initialization logic can go here
  }
}
