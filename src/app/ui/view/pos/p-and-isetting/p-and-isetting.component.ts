import { Component, OnInit } from '@angular/core';

interface DeliveryOption {
  id: number;
  name: string;
  description: string;
  minFee: number | null; 
  maxFee: number | null; 
  isVisible: boolean;
  rateType?: 'fixed' | 'range' | 'per-km'; 
  pricePerKm?: number | null; 
}

@Component({
  selector: 'app-p-and-isetting',
  templateUrl: './p-and-isetting.component.html',
  styleUrl: './p-and-isetting.component.scss',
})
export class PAndISettingComponent {
  // Controls navigation between the two sub-pages
  activeTab: 'payment' | 'delivery' = 'payment';
  expressCutOffTime: string = '13:00'; 

  deliveryOptions: DeliveryOption[] = [
    {
      id: 1,
      name: 'Standard Delivery (City)',
      description: '1-3 business days. Fee is calculated as Base Fee + Distance Factor (Max ₦7,000).',
      minFee: 3000,
      maxFee: 7000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 2,
      name: 'Express / Priority (City)',
      description: 'Same day or next morning. Higher rate range for speed.',
      minFee: 8000,
      maxFee: 15000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 3,
      name: 'Interstate Delivery (Other States)',
      description: '3-7 business days. Fee depends on state, weight, and distance.',
      minFee: 6000,
      maxFee: 20000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 4,
      name: 'Remote Area Surcharge',
      description: 'Extra fixed fee for difficult-to-reach addresses.',
      minFee: 1500,
      maxFee: null, 
      isVisible: true,
      rateType: 'fixed',
    },
    {
      id: 5,
      name: 'Delivery By Kilometer',
      description: 'Fee = Base Fee (₦1000) + Distance in KM * ₦500. For direct courier.',
      minFee: 1000, // Base fee
      maxFee: null,
      isVisible: true,
      rateType: 'per-km',
      pricePerKm: 500, // Price per kilometer in Naira (₦)
    },
    {
      id: 6,
      name: 'Cash on Delivery (COD) Fee',
      description: 'Extra fixed fee for COD; available only in certain zones.',
      minFee: 500,
      maxFee: null, 
      isVisible: true,
      rateType: 'fixed',
    },
  ];

  setActiveTab(tab: 'payment' | 'delivery'): void {
    this.activeTab = tab;
  }

  /**
   * Adds a new, default delivery option to the table.
   * The new option defaults to a 'fixed' rate type and is initially hidden (isVisible: false).
   */
  addDeliveryOption(): void {
    const newId = Math.max(0, ...this.deliveryOptions.map(o => o.id)) + 1;
    this.deliveryOptions.push({
      id: newId,
      name: 'New Custom Option',
      description: 'Enter description here.',
      minFee: 0,
      maxFee: null,
      isVisible: false, 
      rateType: 'fixed', 
    });
  }

  deleteDeliveryOption(id: number): void {
    if (confirm(`Are you sure you want to delete delivery option with ID ${id}?`)) {
      this.deliveryOptions = this.deliveryOptions.filter(option => option.id !== id);
      console.log(`Delivery option with ID ${id} deleted.`);
    }
  }
}