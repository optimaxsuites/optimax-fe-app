import { Component, Input, Output, EventEmitter } from '@angular/core';

import { HistoryData, ProductData, supplierData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-view-inventory',
  templateUrl: './view-inventory.component.html',
  styleUrl: './view-inventory.component.scss'
})
export class ViewInventoryComponent {
  savedBranches: any[] = []; // Declare it here



  //@ts-ignore
  @Input() activeItem: ProductData;  // Ensure this property exists
  @Output() edit = new EventEmitter<any>(); // Event emitters for outputs
  @Output() close = new EventEmitter<void>();
  @Input() updatedProduct: any; 
  productHistory:ProductData[] = [];
  //@ts-ignore
  revivedDate: Date;
 
  constructor(private router: Router, private posService: PosServiceService) { 
    this.revivedDate = new Date(); 
  }

  // openSupplierDetails(supplier: any) {
  //   // Navigate to the supplier-details route and pass the supplier data via state
  //   this.router.navigate(['/supplier-details'], { state: { supplier } });
  // }
  get Timestamp() {
    return this.revivedDate.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
  
    });
  }


  openSupplierDetails(item: ProductData) {
    const supplierData = localStorage.getItem('selectedSupplier');
    
    if (supplierData) {
      const supplier = JSON.parse(supplierData);
      // Navigate to the supplier details page, passing the supplier data via state
      console.log("Retrieved Supplier Data:", item);
      this.router.navigate(['/supplier-details'], { state: { supplierData: item } });
      console.log("Supplier Data:", supplier);
      
      alert("Information available for this update.");
    } else {
      alert("No supplier information available for this update.");
    }
  }
  openBranchDetails(productId: number)  {
    const storedBranches = localStorage.getItem("savedBranches");
  
    if (storedBranches) {
      const branches = JSON.parse(storedBranches);
  
      // Navigate to the branch details page, passing data via state
      console.log("Retrieved Branch Data:", branches);
      this.router.navigate(['/supplier-details'], { state:{ productId: productId }});
  
      alert("Branch information available.");
    } else {
      alert("No branch information available.");
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

  currentPriceAndQuantity: any[] = [];
  closeEdit() {
    this.close.emit();

    }
    printPage() {
      window.print();
    }
    products: HistoryData = new Map();
    // If you are viewing details for a single product,
    // you might have a property like:
    // updatedProduct: any;
    selectedOption: string = '';

    loadSavedData() {
      // Retrieve data from local storage
      const storedData = JSON.parse(localStorage.getItem('currentPriceAndQuantity') || '[]');
  
      if (storedData.length > 0) {
        this.currentPriceAndQuantity = storedData;
        console.log("Retrieved data:", this.currentPriceAndQuantity);
      } else {
        console.log("No saved data found.");
      }
    }

    ngOnInit() {
      // const savedSelectedOption = localStorage.getItem('selectedOption');
      // if (savedSelectedOption) {
      //   this.selectedOption = JSON.parse(savedSelectedOption);
      // }
      if (this.productHistory.length > 0) {
        this.revivedDate = new Date(this.productHistory[0].createdDate); // Use first item's date
      } else {
        this.revivedDate = new Date(); // Fallback if no history exists
      }

      const productId = history.state.productId; // Get product ID from navigation state
      this.loadSavedData();
      if (productId) {
        const storedBranches = localStorage.getItem(`savedBranches_${productId}`);
        if (storedBranches) {
          this.savedBranches = JSON.parse(storedBranches);
          console.log(`Loaded saved branches for product ${productId}:`, this.savedBranches);
        } else {
          console.log(`No saved branches found for product ${productId}.`);
          this.savedBranches = [];
        }
      } else {
        console.log("No product ID found.");
        this.savedBranches = [];
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
    
      const supplierDataString = localStorage.getItem('selectedSupplier');
      const supplier: supplierData | null = supplierDataString ? JSON.parse(supplierDataString) : null;


      this.productHistory = this.products.get(this.activeItem.id) || [];

      this.productHistory = this.productHistory.map(product => ({
        ...product,
        supplier: product.supplier || supplier // Retain existing supplier or assign new
      }));


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

    // Fetch the supplier data from localStorage
  const supplierData = localStorage.getItem('selectedSupplier');
  const supplier = supplierData ? JSON.parse(supplierData) : null;


  
  item.createdDate = new Date().toISOString(); // Update timestamp

    console.log("Supplier Data:", supplier);

    // // Log the updated value.
    // console.log('Updated effectiveQuantity for', item.name, ':', item.effectiveQuantity);
  
    // Update the productHistory array at the given index.
    // You can either update just the effectiveQuantity or replace the whole entry.
    this.productHistory[index] = { 
      ...this.productHistory[index],
      supplier: supplier

    };
  
    // Reset the editing state for this row.
    this.isEditing[index] = false;
  
    // Update the products map with the updated productHistory.
    this.products.set(this.activeItem.id, this.productHistory);
  
    // Persist the updated products map to local storage.
    // Note: We use the same key ("products") that you use in iniInit.
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
