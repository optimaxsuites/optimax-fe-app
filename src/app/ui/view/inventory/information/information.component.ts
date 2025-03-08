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

  constructor(public router: Router) {
    const navigation = this.router.getCurrentNavigation();
    this.revivedDate = new Date(this.supplier?.createdAt || new Date());
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeItem'] && changes['activeItem'].currentValue) {
      this.loadSupplierData(); // Reload supplier when activeItem changes
    }
  }
  savedBranches: any[] = []; 

  ngOnInit(): void {
    console.log('ngOnInit called');
    // Check if navigation state exists and load supplier data from there
    this.retrieveFromLocalStorage(); // Automatically retrieve data on page load


    // if (history.state.branchData) {
    //   this.savedBranches = history.state.branchData;
    //   console.log("Loaded Branches from State:", this.savedBranches);
    // } else {
    //   const storedBranches = localStorage.getItem("savedBranches");
    //   if (storedBranches) {
    //     this.savedBranches = JSON.parse(storedBranches);
    //     console.log("Loaded Branches from LocalStorage:", this.savedBranches);
    //   } else {
    //     console.log("No saved branches found.");
    //   }
    // }





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

  get Date() {
    return this.revivedDate.getDate();
  }
  get Time() {
    return `${this.revivedDate.getHours()}:${this.revivedDate.getMinutes()}`;
  }
  // Save updated supplier information in localStorage when updated
}
