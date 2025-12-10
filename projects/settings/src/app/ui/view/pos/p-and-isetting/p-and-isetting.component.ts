import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

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

// The revised model for storing global Paystack credentials
export interface PaystackConfig {
  liveMode: boolean; // True for Live Keys, False for Test Keys
  publicKey: string; // The only key required for client-side payment initiation
}

// Mock data (Secret Key field is removed)
export const MOCK_PAYSTACK_CONFIG: PaystackConfig = {
  liveMode: true,
  publicKey: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx',
};

// 1. Model for a single branch's distance-based fee tier
export interface FeeTier {
  id: string; // Unique ID for Angular trackBy (e.g., UUID or simple index)
  minDistance: number; // in kilometers (km)
  maxDistance: number; // in kilometers (km)
  feeAmount: number;    // in your local currency (e.g., NGN)
}

// 2. Model for the delivery settings of a single branch
export interface BranchShippingSettings {
  branchId: number;
  branchName: string;
  isGlobalDefault: boolean; // If checked, these tiers apply to all branches
  isEnabled: boolean;
  
  // The list of distance tiers for this specific branch
  feeTiers: FeeTier[]; 
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

  paystackForm!: FormGroup;

  allBranches: BranchShippingSettings[] = []
  
  // The ID of the currently selected branch for configuration
  selectedBranchId: number = this.allBranches[0]?.branchId; 
  
  // The main Reactive Form Group
  shippingForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.loadBranchSettings(this.selectedBranchId);

    this.paystackForm = this.fb.group({
      liveMode: [MOCK_PAYSTACK_CONFIG.liveMode],
      // Only the Public Key is stored
      publicKey: [MOCK_PAYSTACK_CONFIG.publicKey, Validators.required]
    });
  }

  get feeTiers(): FormArray {
    return this.shippingForm.get('feeTiers') as FormArray;
  }

  // Initializes the form based on the selected branch's data
  loadBranchSettings(branchId: number) {
    this.selectedBranchId = branchId;
    const settings = this.allBranches.find(b => b.branchId === branchId) || this.allBranches[0];

    // Build the form structure
    this.shippingForm = this.fb.group({
      branchId: [settings?.branchId],
      branchName: [settings.branchName],
      isGlobalDefault: [settings.isGlobalDefault],
      isEnabled: [settings.isEnabled],
      feeTiers: this.fb.array(
        settings.feeTiers.map(tier => this.createFeeTierGroup(tier))
      ),
    });
  }

  createFeeTierGroup(tier?: FeeTier): FormGroup {
    return this.fb.group({
      id: [tier?.id || crypto.randomUUID()], // Use a unique ID generator
      minDistance: [tier?.minDistance, [Validators.required, Validators.min(0)]],
      maxDistance: [tier?.maxDistance, [Validators.required, Validators.min(0)]],
      feeAmount: [tier?.feeAmount, [Validators.required, Validators.min(0)]],
    });
  }

  // Adds a new row (FeeTier) to the FormArray
  addFeeTier() {
    this.feeTiers.push(this.createFeeTierGroup());
  }

  // Removes a row (FeeTier) from the FormArray by index
  removeFeeTier(index: number) {
    this.feeTiers.removeAt(index);
  }

  // Handles form submission
  onSubmit() {
    if (this.shippingForm.valid) {
      console.log('Saving Delivery Fee Settings:', this.shippingForm.value);
      // **TODO: Integrate with ERP backend API here**
      alert('Settings saved successfully! Check console for data.');
    } else {
      alert('Please check the form for errors.');
      this.shippingForm.markAllAsTouched();
    }
  }

  onSubmitKey() {
    if (this.paystackForm.valid) {

      const config: PaystackConfig = this.paystackForm.value;
      
      // The ERP only needs the Public Key for the client-side widget integration.
      console.log('Saving Paystack Public Key Configuration:', config); 
      
      alert(`Paystack Public Key for ${config.liveMode ? 'Live Mode' : 'Test Mode'} saved successfully!`);
      // **TODO: Integrate with your secure backend API to save the Public Key**
    } else {
      alert('Please fill in the Paystack Public key.');
      this.paystackForm.markAllAsTouched();
    }
  }

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