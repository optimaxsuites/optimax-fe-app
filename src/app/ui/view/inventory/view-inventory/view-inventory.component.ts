import { Component, Input, Output, EventEmitter } from '@angular/core';

import { HistoryData, ProductData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-view-inventory',
  templateUrl: './view-inventory.component.html',
  styleUrl: './view-inventory.component.scss'
})
export class ViewInventoryComponent {
  

  //@ts-ignore
  @Input() activeItem: ProductData;  // Ensure this property exists
  @Output() edit = new EventEmitter<any>(); // Event emitters for outputs
  @Output() close = new EventEmitter<void>();
  @Input() updatedProduct: any; 
  productHistory:ProductData[] = [];
 
  constructor(private router: Router, private posService: PosServiceService) { }

  // openSupplierDetails(supplier: any) {
  //   // Navigate to the supplier-details route and pass the supplier data via state
  //   this.router.navigate(['/supplier-details'], { state: { supplier } });
  // }
  
  openSupplierDetails() {
    const supplierData = localStorage.getItem('selectedSupplier');
    
    if (supplierData) {
      const supplier = JSON.parse(supplierData);
      // Navigate to the supplier details page, passing the supplier data via state
      console.log("Retrieved Supplier Data:", supplier);
      this.router.navigate(['/supplier-details'], { state: { supplierData: supplier } });
      console.log("Supplier Data:", supplier);
      
      alert("Information available for this update.");
    } else {
      alert("No supplier information available for this update.");
    }
  }
  


  // Method to trigger edit event
  triggerEdit() {
    this.edit.emit(this.activeItem);
  }
 
  

  // Method to trigger close event
  triggerClose() {
    this.close.emit();
  }


  closeEdit() {
    this.close.emit();

    }

    products: HistoryData = new Map();
    // If you are viewing details for a single product,
    // you might have a property like:
    // updatedProduct: any;
    selectedOption: string = '';
    
    ngOnInit() {
      const savedSelectedOption = localStorage.getItem('selectedOption');
      if (savedSelectedOption) {
        this.selectedOption = JSON.parse(savedSelectedOption);
      }
    
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
      this.isEditing = this.productHistory.map(() => false);
    }

    viewProduct: boolean = false;
    closeView() {
      this.viewProduct = false;
    }

  //activeItem: any | null = null;
  editInventory: boolean = false;

  openEditInventory(item: any) {
    this.activeItem = { ...item }; // Clone object to avoid modifying original before update
    this.editInventory = true;
  }

  closeEditInventory() {
    this.closeEdit();
  }
  ngOnChanges() {
    console.log("Updated Product received in View Page:", this.updatedProduct);
  }
  enableEdit(index: number): void {
    this.isEditing[index] = true;
  }
  saveEdit(item: any, index: number): void {

    item.createdDate = new Date().toISOString();

    // Log the updated value.
    console.log('Updated effectiveQuantity for', item.name, ':', item.effectiveQuantity);
  
    // Update the productHistory array at the given index.
    // You can either update just the effectiveQuantity or replace the whole entry.
    this.productHistory[index] = { 
      ...this.productHistory[index]
    };
  
    // Reset the editing state for this row.
    this.isEditing[index] = false;
  
    // Update the products map with the updated productHistory.
    this.products.set(this.activeItem.id, this.productHistory);
  
    // Persist the updated products map to local storage.
    // Note: We use the same key ("products") that you use in ngOnInit.
    localStorage.setItem('products', JSON.stringify([...this.products]));
  }
  

  // Save the new quantity and disable edit mode
  
  isEditing: boolean[] = [];
  deleteProductHistory(index:number){
   this.productHistory = this.productHistory.filter((_, i) => i !== index);
   this.products.set(this.activeItem.id, this.productHistory);
   localStorage.setItem('products', JSON.stringify([...this.products]));
  }  
}
