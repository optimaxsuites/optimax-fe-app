import { Component, OnInit } from '@angular/core';

// Interface for a single delivery option item
interface DeliveryOption {
  id: number;
  name: string;
  description: string;
  minFee: number | null; // Can be null for a fixed fee or complex rate
  maxFee: number | null; // Null indicates fixed or no max cap
  isVisible: boolean;
  rateType?: 'fixed' | 'range' | 'per-km'; // New field to better define the rate logic
  pricePerKm?: number | null; // New field for the per-km rate
}

@Component({
  selector: 'app-p-and-isetting',
  templateUrl: './p-and-isetting.component.html',
  styleUrl: './p-and-isetting.component.scss',
})
export class PAndISettingComponent {
  // Controls navigation between the two sub-pages
  activeTab: 'payment' | 'delivery' = 'payment';

  // Model for Express Delivery Time Setting (Default is set for display)
  expressCutOffTime: string = '13:00'; 

  // Data for the delivery options table, ready to be edited by the user
  deliveryOptions: DeliveryOption[] = [
    {
      id: 1,
      name: 'Standard Delivery (City)',
      description: '1-3 business days. Fee is distance-based.',
      minFee: 3000,
      maxFee: 7000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 2,
      name: 'Express / Priority (City)',
      description: 'Same day or next morning.',
      minFee: 8000,
      maxFee: 15000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 3,
      name: 'Interstate Delivery (Other States)',
      description: '3-7 business days. Fee depends on state and weight.',
      minFee: 6000,
      maxFee: 20000,
      isVisible: true,
      rateType: 'range',
    },
    {
      id: 4,
      name: 'Remote Area Surcharge',
      description: 'Extra fee for difficult-to-reach addresses.',
      minFee: 1500,
      maxFee: null, // Indicates a fixed or minimum fee, not a range
      isVisible: true,
      rateType: 'fixed',
    },
    // NEW DELIVERY OPTION: Rate by Kilometer
    {
      id: 5,
      name: 'Delivery By Kilometer',
      description: 'Fee is calculated based on distance from branch in KM.',
      minFee: 1000, // Base fee
      maxFee: null,
      isVisible: true,
      rateType: 'per-km',
      pricePerKm: 500, // Price per kilometer in Naira (₦)
    },
    {
      id: 6,
      name: 'Cash on Delivery (COD) Fee',
      description: 'Extra fee for COD; available only in certain zones.',
      minFee: 500,
      maxFee: null, // Indicates a fixed fee
      isVisible: true,
      rateType: 'fixed',
    },
  ];

  setActiveTab(tab: 'payment' | 'delivery'): void {
    this.activeTab = tab;
  }

  addDeliveryOption(): void {
    const newId = Math.max(0, ...this.deliveryOptions.map(o => o.id)) + 1;
    this.deliveryOptions.push({
      id: newId,
      name: 'New Custom Option',
      description: 'Enter description here.',
      minFee: null,
      maxFee: null,
      isVisible: false, // Default to hidden until configured
      rateType: 'fixed', // Default new option to fixed rate
    });
  }
}