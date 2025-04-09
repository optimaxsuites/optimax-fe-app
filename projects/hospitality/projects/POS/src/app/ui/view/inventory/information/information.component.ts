import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
import { supplierData, HistoryData, ProductData } from '../../../models/interface';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss',
})
export class InformationComponent implements OnChanges {
  // getDisplayName(supplier: any): string {
  //   return (supplier && typeof supplier === 'object') ? supplier.supplierName : supplier;
  supplier!: supplierData;
  //@ts-ignore
  @Input() activeItem: ProductData;
  @Input() updatedProduct: any;
  revivedDate: Date = new Date(); //
  products: HistoryData = new Map();
  productHistory: ProductData[] = [];
  isEditing: boolean[] = [];
  @Output() close = new EventEmitter<void>();  
  // route: any;
  selectedOption: string = '';
  currentIndex: number = 0;
  savedBranches: any[] = []; 
  selectedHistory: any; 

  Month: string = '';
  Day: string = '';
  Time: string = '';


  constructor(public router: Router) {
    const navigation = this.router.getCurrentNavigation();
    this.revivedDate = new Date(this.supplier?.createdAt || new Date());
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeItem'] && changes['activeItem'].currentValue) {
      this.loadSupplierData(); // Reload supplier when activeItem changes
    }
  }


  ngOnInit(): void {
    this.setLastUpdatedTimestamp();
    // Check if navigation state exists and load supplier data from there
    this.retrieveFromLocalStorage(); // Automatically retrieve data on page load

    const data = localStorage.getItem('fullHistories');   
    if (data ) {
      const parsedData = JSON.parse(data);
      
      if (parsedData.length > 0){
        console.log(`Showing History ${this.currentIndex + 1}:`, parsedData[this.currentIndex]);

      this.selectedHistory = parsedData[this.currentIndex]; 

      this.currentIndex++; // Move to the next history
      }

    }

    this.loadSupplierData();
    

    const savedProducts = localStorage.getItem('products');
    this.products = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
    
    if (!this.activeItem) {
      const savedProducts = localStorage.getItem('products');
      if (savedProducts) {
        const productList: HistoryData = new Map(JSON.parse(savedProducts));
        this.activeItem = (productList.values().next().value as ProductData[])[0]; // Choose first product if none set
      }
    }
    this.productHistory = this.products.get(this.activeItem.id) || [];

    this.productHistory = this.productHistory.map(product => ({
      ...product,
      supplier: product.supplier || this.supplier // Retain existing supplier or assign new
    }));
  }
  

  setLastUpdatedTimestamp() {
    const now = new Date();

    this.Month = now.toLocaleString('en-US', { month: 'long' }); // Example: March
    this.Day = now.getDate().toString(); // Example: 9
    this.Time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // Example: 06:45 PM
  }


  goBack() {
    window.history.back();
  }
  
  loadSavedBranches(productId: number) {
    const storedBranches = localStorage.getItem(`savedBranches_${productId}`);
    if (storedBranches) {
      this.savedBranches = JSON.parse(storedBranches);
      console.log(`Loaded branches for product ${productId}:`, this.savedBranches);
    } else {
      console.log(`No saved branches for product ${productId}`);
      this.savedBranches = [];
    }
  }
  pricingQuantity: any = {};

  retrieveFromLocalStorage() {
    const data = localStorage.getItem('pricingQuantity');
    if (data) {
      console.log('Retrieved:', this.pricingQuantity);
    this.pricingQuantity = JSON.parse(data);
    console.log('After Assignment:', this.pricingQuantity);

    } else {
      console.log('No data found');
    }
  }

  loadSupplierData(): void {
    const supplierData = history.state.supplierData;

    if (supplierData) {
      console.log('Supplier Data:', supplierData);
      this.supplier = supplierData.supplier;
      this.revivedDate = new Date(this.supplier?.createdAt || new Date()); // ✅ Now correctly updates after supplier loads

      const existing = this.productHistory.find(
        (s) => s.id === this.supplier.id
      );
      if (!existing) {
        // this.productHistory.push(this.supplier);
      }
      console.log('Updated Supplier Data:', this.supplier);
    } else {
      console.error('No supplier data available.');
    }
  }


  // Save updated supplier information in localStorage when updated
}
