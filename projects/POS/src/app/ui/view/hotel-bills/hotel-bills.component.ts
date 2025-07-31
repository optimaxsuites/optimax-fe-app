import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ServiceCharge {
  category: 'kitchen' | 'mini bar' | 'laundry' | 'bar';
  name: string;
  price: number;
  quantity: number;
  date: string;
}

@Component({
  selector: 'app-hotel-bills',
  templateUrl: './hotel-bills.component.html',
  styleUrls: ['./hotel-bills.component.scss'],
})
export class HotelBillsComponent {
  @Input() isOpen: boolean = false;
  @Input() room: any;
  @Output() onClose = new EventEmitter<void>();
  @Output() onAddCharges = new EventEmitter<ServiceCharge[]>();
  @Output() back = new EventEmitter();

  selectedCategory: 'kitchen' | 'mini bar' | 'laundry' | 'bar' = 'kitchen';
  selectedServices: Record<string, { price: number; quantity: number }> = {};
  quantities: Record<string, number> = {};

  availableServices = {
    kitchen: [
      { name: 'Breakfast Set', price: 15.99 },
      { name: 'Lunch Set', price: 22.5 },
      { name: 'Dinner Set', price: 28.75 },
      { name: 'Room Service Fee', price: 5.0 },
    ],
    'mini bar': [
      { name: 'Whiskey Bottle', price: 45.0 },
      { name: 'Beer Can', price: 8.5 },
      { name: 'Soda', price: 4.0 },
      { name: 'Water Bottle', price: 3.5 },
    ],
    laundry: [
      { name: 'Laundry Service', price: 12.0 },
      { name: 'Dry Cleaning', price: 18.0 },
      { name: 'Pressing', price: 10.0 },
    ],
    bar: [
      { name: 'Cocktail', price: 14.0 },
      { name: 'Wine Glass', price: 12.0 },
      { name: 'Champagne Bottle', price: 85.0 },
    ],
  };

  get servicesForCategory() {
    return this.availableServices[this.selectedCategory];
  }

  get selectedServicesCount() {
    return Object.keys(this.selectedServices).length;
  }

  get totalAmount() {
    return Object.values(this.selectedServices).reduce(
      (sum, service) => sum + service.price * service.quantity,
      0
    );
  }

  handleServiceSelect(serviceName: string, price: number): void {
    if (this.selectedServices[serviceName]) {
      const newSelection = { ...this.selectedServices };
      delete newSelection[serviceName];
      this.selectedServices = newSelection;
    } else {
      this.selectedServices = {
        ...this.selectedServices,
        [serviceName]: { price, quantity: this.quantities[serviceName] || 1 },
      };
    }
  }

  handleQuantityChange(serviceName: string, value: number): void {
    const newQuantity = Math.max(1, value);
    this.quantities = { ...this.quantities, [serviceName]: newQuantity };

    if (this.selectedServices[serviceName]) {
      this.selectedServices = {
        ...this.selectedServices,
        [serviceName]: {
          ...this.selectedServices[serviceName],
          quantity: newQuantity,
        },
      };
    }
  }

  onQuantityInputChange(event: Event, serviceName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.value ? parseInt(input.value) : 1;
    this.handleQuantityChange(serviceName, value);
  }

  addCharges(): void {
    const servicesToAdd: ServiceCharge[] = Object.entries(
      this.selectedServices
    ).map(([name, data]) => ({
      category: this.selectedCategory,
      name: name,
      price: data.price,
      quantity: data.quantity,
      date: new Date().toISOString(),
    }));

    this.onAddCharges.emit(servicesToAdd);
    this.selectedServices = {};
    this.close();
  }

  close(): void {
    this.onClose.emit();
  }

  trackByServiceName(
    index: number,
    item: { name: string; price: number }
  ): string {
    return item.name;
  }

  goBack(): void {
    this.back.emit();
  }
}
